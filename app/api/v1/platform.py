from datetime import datetime, timedelta, timezone
import os
import secrets
import json
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import PlainTextResponse

from sqlalchemy.orm import Session
from sqlalchemy import func

from app.api.deps import get_db, require_role
from app.db.models import Tenant, TenantUser, User, Payment, AuditLog, RefreshToken
from app.schemas.platform import (
    TenantOut, TenantPatch, TenantCreate,
    TenantUserOut, TenantUserCreate, TenantUserPatch,
    PaymentOut, AuditOut,
    BillingLink, SeatsUpdate, PaymentManualCreate, MessageOut,
    BillingPreviewIn, BillingPreviewOut, BillingChangeIn,
    MollieCreateCustomerIn, MollieStartSubscriptionIn, MollieSyncOut
)
from app.core.security import hash_password
from app.core.audit import audit
from app.core import mollie as mollie_client

router = APIRouter(prefix="/platform", tags=["platform"])

def _ip(req: Request) -> str:
    return req.client.host if req.client else ""

def _ua(req: Request) -> str:
    return req.headers.get("user-agent", "")



def _ensure_webhook_token(t: Tenant) -> None:
    if not getattr(t, "webhook_token", ""):
        t.webhook_token = secrets.token_hex(16)

def _public_base_url() -> str:
    # Used to build webhook URLs for Mollie (must be reachable from the internet in production)
    return os.getenv("PUBLIC_BASE_URL", "http://127.0.0.1:8000").rstrip("/")

@router.post("/tenants", response_model=TenantOut)
def create_tenant(payload: TenantCreate, request: Request, db: Session = Depends(get_db), claims=Depends(require_role("platform_admin"))):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name is required")

    existing = db.query(Tenant).filter(Tenant.name == name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Tenant name already exists")

    now = datetime.now(timezone.utc)
    t = Tenant(
        name=name,
        is_active=bool(payload.is_active),
        status=payload.status or "trial",
        valid_until=payload.valid_until,
        seats_purchased=max(int(payload.seats_purchased or 1), 1),
        price_per_seat_year_cents=max(int(payload.price_per_seat_year_cents or 0), 0),
        billing_provider=payload.billing_provider or "none",
    )
    if payload.trial_days and (t.status == "trial"):
        days = max(int(payload.trial_days), 1)
        t.trial_until = now + timedelta(days=days)
    _ensure_webhook_token(t)
    db.add(t)
    db.commit()
    db.refresh(t)

    # optional: create first admin user for the tenant
    if payload.create_admin:
        email = payload.create_admin.email.lower()
        u = db.query(User).filter(User.email == email).first()
        if not u:
            u = User(email=email, password_hash=hash_password(payload.create_admin.password), is_active=payload.create_admin.is_active)
            db.add(u)
            db.commit()
            db.refresh(u)
        else:
            u.password_hash = hash_password(payload.create_admin.password)
            u.is_active = payload.create_admin.is_active
            db.add(u)
            db.commit()

        link = db.query(TenantUser).filter(TenantUser.tenant_id == t.id, TenantUser.user_id == u.id).first()
        if not link:
            link = TenantUser(tenant_id=t.id, user_id=u.id, role=payload.create_admin.role or "tenant_admin")
            db.add(link)
            db.commit()
        else:
            link.role = payload.create_admin.role or link.role
            db.add(link)
            db.commit()

        audit(db, tenant_id=str(t.id), user_id=claims.get("sub"), action="platform_tenant_create_admin", ip=_ip(request), user_agent=_ua(request), meta={"email": email, "role": link.role})

    audit(db, tenant_id=str(t.id), user_id=claims.get("sub"), action="platform_tenant_create", ip=_ip(request), user_agent=_ua(request), meta={"name": name, "status": t.status})

    users_count = db.query(func.count(TenantUser.user_id)).filter(TenantUser.tenant_id == t.id).scalar() or 0
    return TenantOut(
        id=str(t.id),
        name=t.name,
        is_active=t.is_active,
        status=t.status,
        trial_until=t.trial_until,
        valid_until=t.valid_until,
        seats_purchased=t.seats_purchased,
        price_per_seat_year_cents=t.price_per_seat_year_cents,
        billing_provider=t.billing_provider,
        mollie_customer_id=t.mollie_customer_id,
        mollie_subscription_id=t.mollie_subscription_id,
        webhook_token=getattr(t,'webhook_token',None),
        mollie_subscription_status=getattr(t,'mollie_subscription_status',None),
        mollie_next_payment_date=getattr(t,'mollie_next_payment_date',None),
        mollie_subscription_status_updated_at=getattr(t,'mollie_subscription_status_updated_at',None),
        created_at=t.created_at,
        users_count=int(users_count)
    )


@router.get("/tenants", response_model=list[TenantOut])
def list_tenants(db: Session = Depends(get_db), claims=Depends(require_role("platform_admin"))):
    # users_count via join
    rows = (
        db.query(
            Tenant,
            func.count(TenantUser.user_id).label("users_count")
        )
        .outerjoin(TenantUser, TenantUser.tenant_id == Tenant.id)
        .group_by(Tenant.id)
        .order_by(Tenant.created_at.desc())
        .all()
    )
    out = []
    for t, users_count in rows:
        out.append(TenantOut(
            id=str(t.id),
            name=t.name,
            is_active=t.is_active,
            status=getattr(t, "status", "active"),
            trial_until=getattr(t, "trial_until", None),
            valid_until=getattr(t, "valid_until", None),
            seats_purchased=getattr(t, "seats_purchased", 1),
            price_per_seat_year_cents=getattr(t, "price_per_seat_year_cents", 0),
            billing_provider=getattr(t, "billing_provider", "none"),
            mollie_customer_id=getattr(t, "mollie_customer_id", None),
            mollie_subscription_id=getattr(t, "mollie_subscription_id", None),
            webhook_token=getattr(t, "webhook_token", None),
            mollie_subscription_status=getattr(t, "mollie_subscription_status", None),
            mollie_next_payment_date=getattr(t, "mollie_next_payment_date", None),
            mollie_subscription_status_updated_at=getattr(t, "mollie_subscription_status_updated_at", None),
            created_at=t.created_at,
            users_count=int(users_count or 0)
        ))
    return out

@router.get("/tenants/{tenant_id}", response_model=TenantOut)
def get_tenant(tenant_id: str, db: Session = Depends(get_db), claims=Depends(require_role("platform_admin"))):
    t = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Tenant not found")
    users_count = db.query(func.count(TenantUser.user_id)).filter(TenantUser.tenant_id == t.id).scalar() or 0
    return TenantOut(
        id=str(t.id),
        name=t.name,
        is_active=t.is_active,
        status=getattr(t, "status", "active"),
        trial_until=getattr(t, "trial_until", None),
        valid_until=getattr(t, "valid_until", None),
        seats_purchased=getattr(t, "seats_purchased", 1),
        price_per_seat_year_cents=getattr(t, "price_per_seat_year_cents", 0),
        billing_provider=getattr(t, "billing_provider", "none"),
        mollie_customer_id=getattr(t, "mollie_customer_id", None),
        mollie_subscription_id=getattr(t, "mollie_subscription_id", None),
            webhook_token=getattr(t, "webhook_token", None),
            mollie_subscription_status=getattr(t, "mollie_subscription_status", None),
            mollie_next_payment_date=getattr(t, "mollie_next_payment_date", None),
            mollie_subscription_status_updated_at=getattr(t, "mollie_subscription_status_updated_at", None),
        created_at=t.created_at,
        users_count=int(users_count)
    )

@router.patch("/tenants/{tenant_id}", response_model=TenantOut)
def patch_tenant(tenant_id: str, payload: TenantPatch, request: Request, db: Session = Depends(get_db), claims=Depends(require_role("platform_admin"))):
    t = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Tenant not found")

    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(t, k, v)
    _ensure_webhook_token(t)
    db.add(t)
    db.commit()
    db.refresh(t)

    audit(db, tenant_id=str(t.id), user_id=claims.get("sub"), action="platform_tenant_patch", ip=_ip(request), user_agent=_ua(request), meta=data)

    users_count = db.query(func.count(TenantUser.user_id)).filter(TenantUser.tenant_id == t.id).scalar() or 0
    return TenantOut(
        id=str(t.id),
        name=t.name,
        is_active=t.is_active,
        status=getattr(t, "status", "active"),
        trial_until=getattr(t, "trial_until", None),
        valid_until=getattr(t, "valid_until", None),
        seats_purchased=getattr(t, "seats_purchased", 1),
        price_per_seat_year_cents=getattr(t, "price_per_seat_year_cents", 0),
        billing_provider=getattr(t, "billing_provider", "none"),
        mollie_customer_id=getattr(t, "mollie_customer_id", None),
        mollie_subscription_id=getattr(t, "mollie_subscription_id", None),
            webhook_token=getattr(t, "webhook_token", None),
            mollie_subscription_status=getattr(t, "mollie_subscription_status", None),
            mollie_next_payment_date=getattr(t, "mollie_next_payment_date", None),
            mollie_subscription_status_updated_at=getattr(t, "mollie_subscription_status_updated_at", None),
        created_at=t.created_at,
        users_count=int(users_count)
    )

@router.post("/tenants/{tenant_id}/trial/start", response_model=TenantOut)
def start_trial(tenant_id: str, request: Request, db: Session = Depends(get_db), claims=Depends(require_role("platform_admin"))):
    t = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Tenant not found")
    now = datetime.now(timezone.utc)
    t.status = "trial"
    # default 14 days
    t.trial_until = now + timedelta(days=14)
    _ensure_webhook_token(t)
    db.add(t)
    db.commit()
    db.refresh(t)
    audit(db, tenant_id=str(t.id), user_id=claims.get("sub"), action="platform_trial_start", ip=_ip(request), user_agent=_ua(request), meta={"trial_until": t.trial_until.isoformat() if t.trial_until else None})
    users_count = db.query(func.count(TenantUser.user_id)).filter(TenantUser.tenant_id == t.id).scalar() or 0
    return TenantOut(
        id=str(t.id),
        name=t.name,
        is_active=t.is_active,
        status=t.status,
        trial_until=t.trial_until,
        valid_until=getattr(t, "valid_until", None),
        seats_purchased=getattr(t, "seats_purchased", 1),
        price_per_seat_year_cents=getattr(t, "price_per_seat_year_cents", 0),
        billing_provider=getattr(t, "billing_provider", "none"),
        mollie_customer_id=getattr(t, "mollie_customer_id", None),
        mollie_subscription_id=getattr(t, "mollie_subscription_id", None),
            webhook_token=getattr(t, "webhook_token", None),
            mollie_subscription_status=getattr(t, "mollie_subscription_status", None),
            mollie_next_payment_date=getattr(t, "mollie_next_payment_date", None),
            mollie_subscription_status_updated_at=getattr(t, "mollie_subscription_status_updated_at", None),
        created_at=t.created_at,
        users_count=int(users_count)
    )

@router.get("/tenants/{tenant_id}/users", response_model=list[TenantUserOut])
def list_tenant_users(tenant_id: str, db: Session = Depends(get_db), claims=Depends(require_role("platform_admin"))):
    q = (
        db.query(TenantUser, User)
        .join(User, User.id == TenantUser.user_id)
        .filter(TenantUser.tenant_id == tenant_id)
        .order_by(User.email.asc())
        .all()
    )
    return [
        TenantUserOut(user_id=str(u.id), email=u.email, is_active=u.is_active, role=tu.role)
        for (tu, u) in q
    ]

@router.post("/tenants/{tenant_id}/users", response_model=TenantUserOut)
def create_tenant_user(tenant_id: str, payload: TenantUserCreate, request: Request, db: Session = Depends(get_db), claims=Depends(require_role("platform_admin"))):
    t = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Tenant not found")

    # seat gate: count active memberships
    active_links = (
        db.query(func.count(TenantUser.user_id))
        .join(User, User.id == TenantUser.user_id)
        .filter(TenantUser.tenant_id == t.id, User.is_active == True)
        .scalar() or 0
    )
    seats = getattr(t, "seats_purchased", 1) or 1
    if active_links >= seats:
        raise HTTPException(status_code=400, detail=f"Seat limit reached ({active_links}/{seats}). Increase seats first.")

    email = payload.email.lower()
    u = db.query(User).filter(User.email == email).first()
    if not u:
        u = User(email=email, password_hash=hash_password(payload.password), is_active=payload.is_active)
        db.add(u)
        db.commit()
        db.refresh(u)
    else:
        # update password if provided (MVP)
        u.password_hash = hash_password(payload.password)
        u.is_active = payload.is_active
        db.add(u)
        db.commit()
        db.refresh(u)

    link = db.query(TenantUser).filter(TenantUser.tenant_id == t.id, TenantUser.user_id == u.id).first()
    if not link:
        link = TenantUser(tenant_id=t.id, user_id=u.id, role=payload.role)
        db.add(link)
        db.commit()
    else:
        link.role = payload.role
        db.add(link)
        db.commit()

    audit(db, tenant_id=str(t.id), user_id=claims.get("sub"), action="platform_user_create", ip=_ip(request), user_agent=_ua(request), meta={"email": email, "role": payload.role})
    return TenantUserOut(user_id=str(u.id), email=u.email, is_active=u.is_active, role=link.role)

@router.patch("/tenants/{tenant_id}/users/{user_id}", response_model=TenantUserOut)
def patch_tenant_user(tenant_id: str, user_id: str, payload: TenantUserPatch, request: Request, db: Session = Depends(get_db), claims=Depends(require_role("platform_admin"))):
    link = db.query(TenantUser).filter(TenantUser.tenant_id == tenant_id, TenantUser.user_id == user_id).first()
    if not link:
        raise HTTPException(status_code=404, detail="Membership not found")
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")

    data = payload.model_dump(exclude_unset=True)

    if "role" in data and data["role"]:
        link.role = data["role"]
    if "is_active" in data and data["is_active"] is not None:
        u.is_active = bool(data["is_active"])

    db.add(link)
    db.add(u)
    db.commit()

    audit(db, tenant_id=str(tenant_id), user_id=claims.get("sub"), action="platform_user_patch", ip=_ip(request), user_agent=_ua(request), meta=data)
    return TenantUserOut(user_id=str(u.id), email=u.email, is_active=u.is_active, role=link.role)

@router.get("/tenants/{tenant_id}/payments", response_model=list[PaymentOut])
def list_payments(tenant_id: str, db: Session = Depends(get_db), claims=Depends(require_role("platform_admin"))):
    rows = db.query(Payment).filter(Payment.tenant_id == tenant_id).order_by(Payment.created_at.desc()).limit(200).all()
    return [
        PaymentOut(
            id=str(p.id),
            tenant_id=str(p.tenant_id),
            provider=p.provider,
            provider_payment_id=p.provider_payment_id,
            type=p.type,
            amount_cents=p.amount_cents,
            currency=p.currency,
            status=p.status,
            paid_at=p.paid_at,
            created_at=p.created_at
        ) for p in rows
    ]

@router.get("/tenants/{tenant_id}/audit", response_model=list[AuditOut])
def list_audit(tenant_id: str, db: Session = Depends(get_db), claims=Depends(require_role("platform_admin"))):
    rows = db.query(AuditLog).filter(AuditLog.tenant_id == tenant_id).order_by(AuditLog.created_at.desc()).limit(300).all()
    return [
        AuditOut(
            id=str(a.id),
            tenant_id=str(a.tenant_id),
            user_id=str(a.user_id) if a.user_id else None,
            action=a.action,
            entity=a.entity,
            entity_id=a.entity_id,
            ip=a.ip,
            user_agent=a.user_agent,
            created_at=a.created_at,
            meta=a.meta
        ) for a in rows
    ]

# =========================
# Phase 4.2 — Klantbeheer Fase 3 (Billing actions + CSV + Force logout)
# =========================

def _tenant_out(db: Session, t: Tenant) -> TenantOut:
    users_count = db.query(func.count(TenantUser.user_id)).filter(TenantUser.tenant_id == t.id).scalar() or 0
    return TenantOut(
        id=str(t.id),
        name=t.name,
        is_active=t.is_active,
        status=getattr(t, "status", "active"),
        trial_until=getattr(t, "trial_until", None),
        valid_until=getattr(t, "valid_until", None),
        seats_purchased=getattr(t, "seats_purchased", 1),
        price_per_seat_year_cents=getattr(t, "price_per_seat_year_cents", 0),
        billing_provider=getattr(t, "billing_provider", "none"),
        mollie_customer_id=getattr(t, "mollie_customer_id", None),
        mollie_subscription_id=getattr(t, "mollie_subscription_id", None),
            webhook_token=getattr(t, "webhook_token", None),
            mollie_subscription_status=getattr(t, "mollie_subscription_status", None),
            mollie_next_payment_date=getattr(t, "mollie_next_payment_date", None),
            mollie_subscription_status_updated_at=getattr(t, "mollie_subscription_status_updated_at", None),
        created_at=t.created_at,
        users_count=int(users_count),
    )


@router.post("/tenants/{tenant_id}/force_logout", response_model=MessageOut)
def force_logout_tenant(tenant_id: str, request: Request, db: Session = Depends(get_db), claims=Depends(require_role("platform_admin"))):
    # Revoke all refresh tokens for this tenant (existing access tokens will expire naturally)
    n = (
        db.query(RefreshToken)
        .filter(RefreshToken.tenant_id == tenant_id, RefreshToken.revoked == False)
        .update({"revoked": True})
    )
    db.commit()
    audit(db, tenant_id=str(tenant_id), user_id=claims.get("sub"), action="platform_force_logout", ip=_ip(request), user_agent=_ua(request), meta={"revoked_tokens": int(n or 0)})
    return MessageOut(ok=True, message=f"Force logout uitgevoerd (revoked={int(n or 0)})")


@router.get("/tenants.csv")
def export_tenants_csv(db: Session = Depends(get_db), claims=Depends(require_role("platform_admin"))):
    rows = (
        db.query(Tenant, func.count(TenantUser.user_id).label("users_count"))
        .outerjoin(TenantUser, TenantUser.tenant_id == Tenant.id)
        .group_by(Tenant.id)
        .order_by(Tenant.created_at.desc())
        .all()
    )
    header = [
        "id","name","status","is_active","trial_until","valid_until","seats_purchased","users_count","billing_provider","price_per_seat_year_cents","mollie_customer_id","mollie_subscription_id","created_at"
    ]
    lines = [",".join(header)]
    for t, users_count in rows:
        def q(v):
            if v is None:
                return ""
            s = str(v)
            if "," in s or "\n" in s or '"' in s:
                s = s.replace('"','""')
                return f'"{s}"'
            return s
        lines.append(",".join([
            q(t.id), q(t.name), q(getattr(t,'status','active')), q(t.is_active),
            q(getattr(t,'trial_until',None)), q(getattr(t,'valid_until',None)),
            q(getattr(t,'seats_purchased',1)), q(int(users_count or 0)),
            q(getattr(t,'billing_provider','none')), q(getattr(t,'price_per_seat_year_cents',0)),
            q(getattr(t,'mollie_customer_id',None)), q(getattr(t,'mollie_subscription_id',None)),
            q(t.created_at)
        ]))
    return PlainTextResponse("\n".join(lines), media_type="text/csv")


@router.post("/tenants/{tenant_id}/billing/link", response_model=TenantOut)
def billing_link_mollie(tenant_id: str, payload: BillingLink, request: Request, db: Session = Depends(get_db), claims=Depends(require_role("platform_admin"))):
    t = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Tenant not found")
    # Store provider ids (actual Mollie API integration comes later)
    t.billing_provider = payload.billing_provider or t.billing_provider
    t.mollie_customer_id = payload.mollie_customer_id
    t.mollie_subscription_id = payload.mollie_subscription_id
    _ensure_webhook_token(t)
    db.add(t)
    db.commit()
    db.refresh(t)
    audit(db, tenant_id=str(t.id), user_id=claims.get("sub"), action="platform_billing_link", ip=_ip(request), user_agent=_ua(request), meta=payload.model_dump())
    return _tenant_out(db, t)


@router.post("/tenants/{tenant_id}/billing/seats", response_model=TenantOut)
def billing_update_seats(tenant_id: str, payload: SeatsUpdate, request: Request, db: Session = Depends(get_db), claims=Depends(require_role("platform_admin"))):
    t = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Tenant not found")
    seats = max(int(payload.seats_purchased or 1), 1)

    active_links = (
        db.query(func.count(TenantUser.user_id))
        .join(User, User.id == TenantUser.user_id)
        .filter(TenantUser.tenant_id == t.id, User.is_active == True)
        .scalar() or 0
    )
    if seats < int(active_links):
        raise HTTPException(status_code=400, detail=f"Seats cannot be lower than active users ({active_links}).")

    t.seats_purchased = seats
    if payload.price_per_seat_year_cents is not None:
        t.price_per_seat_year_cents = max(int(payload.price_per_seat_year_cents), 0)
    _ensure_webhook_token(t)

    # Phase 4.4 (Fase 5): if this tenant has an active Mollie subscription, update the amount automatically
    if (getattr(t, 'billing_provider', '') == 'mollie' or t.mollie_subscription_id) and t.mollie_customer_id and t.mollie_subscription_id:
        price = int(t.price_per_seat_year_cents or 0)
        if price > 0:
            amount_cents = int(t.seats_purchased or 1) * price
            webhook_url = f"{_public_base_url()}/api/v1/billing/mollie/webhook?tenant_id={t.id}&token={t.webhook_token}"
            try:
                mollie_client.update_subscription(
                    customer_id=t.mollie_customer_id,
                    subscription_id=t.mollie_subscription_id,
                    amount_cents=amount_cents,
                    currency='EUR',
                    webhook_url=webhook_url,
                    metadata={'tenant_id': str(t.id), 'seats': int(t.seats_purchased or 1), 'price_per_seat_year_cents': price},
                )
                audit(db, t.id, None, 'platform_billing_seats_auto_mollie', {'amount_cents': amount_cents, 'seats': int(t.seats_purchased or 1)}, ip=_ip(request), user_agent=_ua(request))
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Mollie update_subscription failed: {e}")
    db.add(t)
    db.commit()
    db.refresh(t)
    audit(db, tenant_id=str(t.id), user_id=claims.get("sub"), action="platform_billing_seats", ip=_ip(request), user_agent=_ua(request), meta={"seats_purchased": seats, "price_per_seat_year_cents": t.price_per_seat_year_cents})
    return _tenant_out(db, t)




# =========================
# Phase 4.5 — Klantbeheer Fase 6 (pricing/upgrade/downgrade flows)
# =========================

@router.post('/tenants/{tenant_id}/billing/preview', response_model=BillingPreviewOut)
def billing_preview(tenant_id: str, payload: BillingPreviewIn, request: Request, db: Session = Depends(get_db), claims=Depends(require_role('platform_admin'))):
    t = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not t:
        raise HTTPException(status_code=404, detail='Tenant not found')

    current = int(getattr(t, 'seats_purchased', 1) or 1)
    target = max(int(payload.seats_target or current), 1)

    if target == current:
        return BillingPreviewOut(action='none', current_seats=current, target_seats=target, effective_at=None, amount_cents=None, will_update_mollie=False, notes='No changes')

    action = 'upgrade' if target > current else 'downgrade'

    effective_at = None
    notes = ''
    if action == 'downgrade':
        effective_at = getattr(t, 'mollie_next_payment_date', None)
        if effective_at is None:
            notes = 'Next payment date onbekend. Klik eerst Mollie: sync subscription.'
    else:
        effective_at = datetime.now(timezone.utc)

    price = int(getattr(t, 'price_per_seat_year_cents', 0) or 0)
    amount_cents = (target * price) if price > 0 else None

    will_update_mollie = bool(t.mollie_customer_id and t.mollie_subscription_id and price > 0)
    if action == 'downgrade':
        # We plannen downgrade; geen directe Mollie amount update
        will_update_mollie = False

    return BillingPreviewOut(
        action=action,
        current_seats=current,
        target_seats=target,
        effective_at=effective_at,
        amount_cents=amount_cents,
        will_update_mollie=will_update_mollie,
        notes=notes,
    )


@router.post('/tenants/{tenant_id}/billing/upgrade', response_model=TenantOut)
def billing_upgrade(tenant_id: str, payload: BillingChangeIn, request: Request, db: Session = Depends(get_db), claims=Depends(require_role('platform_admin'))):
    t = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not t:
        raise HTTPException(status_code=404, detail='Tenant not found')

    current = int(getattr(t, 'seats_purchased', 1) or 1)
    target = max(int(payload.seats_target or current), 1)
    if target <= current:
        raise HTTPException(status_code=400, detail='Seats target must be higher for upgrade')

    # If Mollie is linked, require subscription active
    if t.mollie_customer_id and t.mollie_subscription_id:
        if getattr(t, 'mollie_subscription_status', None) and getattr(t, 'mollie_subscription_status') not in ('active', 'pending'):
            raise HTTPException(status_code=400, detail=f"Upgrade blocked: subscription status={t.mollie_subscription_status}")

    # Apply immediately
    t.seats_purchased = target
    t.pending_seats = None
    t.pending_seats_effective_at = None

    _ensure_webhook_token(t)

    price = int(getattr(t, 'price_per_seat_year_cents', 0) or 0)
    # Auto Mollie update for upgrades (direct)
    if t.mollie_customer_id and t.mollie_subscription_id and price > 0:
        amount_cents = int(target) * price
        webhook_url = f"{_public_base_url()}/api/v1/billing/mollie/webhook?tenant_id={t.id}&token={t.webhook_token}"
        try:
            mollie_client.update_subscription(
                customer_id=t.mollie_customer_id,
                subscription_id=t.mollie_subscription_id,
                amount_cents=amount_cents,
                currency='EUR',
                webhook_url=webhook_url,
                metadata={'tenant_id': str(t.id), 'seats': int(target), 'price_per_seat_year_cents': price},
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Mollie update_subscription failed: {e}")
        audit(db, t.id, None, 'platform_billing_upgrade_mollie', {'seats': int(target), 'amount_cents': amount_cents}, ip=_ip(request), user_agent=_ua(request))

    db.add(t)
    db.commit()
    db.refresh(t)
    audit(db, t.id, claims.get('sub'), 'platform_billing_upgrade', {'seats_target': int(target)}, ip=_ip(request), user_agent=_ua(request))
    return _tenant_out(db, t)


@router.post('/tenants/{tenant_id}/billing/downgrade', response_model=TenantOut)
def billing_downgrade(tenant_id: str, payload: BillingChangeIn, request: Request, db: Session = Depends(get_db), claims=Depends(require_role('platform_admin'))):
    t = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not t:
        raise HTTPException(status_code=404, detail='Tenant not found')

    current = int(getattr(t, 'seats_purchased', 1) or 1)
    target = max(int(payload.seats_target or current), 1)
    if target >= current:
        raise HTTPException(status_code=400, detail='Seats target must be lower for downgrade')

    # Guardrail: cannot go below active users
    active_links = (
        db.query(func.count(TenantUser.user_id))
        .join(User, User.id == TenantUser.user_id)
        .filter(TenantUser.tenant_id == t.id, User.is_active == True)
        .scalar() or 0
    )
    if target < int(active_links):
        raise HTTPException(status_code=400, detail=f"Seats cannot be lower than active users ({active_links}).")

    # Guardrail: if Mollie linked and status not active -> block
    if t.mollie_customer_id and t.mollie_subscription_id:
        st = getattr(t, 'mollie_subscription_status', None)
        if st and st not in ('active', 'pending'):
            raise HTTPException(status_code=400, detail=f"Downgrade blocked: subscription status={st}")

    # Downgrade is scheduled at next payment date
    eff = getattr(t, 'mollie_next_payment_date', None)
    if t.mollie_customer_id and t.mollie_subscription_id and eff is None:
        raise HTTPException(status_code=400, detail='Next payment date unknown. Run Mollie: sync subscription first.')

    t.pending_seats = int(target)
    t.pending_seats_effective_at = eff

    db.add(t)
    db.commit()
    db.refresh(t)

    audit(db, t.id, claims.get('sub'), 'platform_billing_downgrade_planned', {'seats_target': int(target), 'effective_at': eff.isoformat() if eff else None}, ip=_ip(request), user_agent=_ua(request))
    return _tenant_out(db, t)

@router.post("/tenants/{tenant_id}/billing/activate_year", response_model=TenantOut)
def billing_activate_year(tenant_id: str, request: Request, db: Session = Depends(get_db), claims=Depends(require_role("platform_admin"))):
    t = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Tenant not found")
    now = datetime.now(timezone.utc)
    t.status = "active"
    t.is_active = True
    t.trial_until = None
    t.valid_until = now + timedelta(days=365)
    _ensure_webhook_token(t)
    db.add(t)
    db.commit()
    db.refresh(t)
    audit(db, tenant_id=str(t.id), user_id=claims.get("sub"), action="platform_billing_activate_year", ip=_ip(request), user_agent=_ua(request), meta={"valid_until": t.valid_until.isoformat() if t.valid_until else None})
    return _tenant_out(db, t)


@router.post("/tenants/{tenant_id}/billing/cancel", response_model=TenantOut)
def billing_cancel(tenant_id: str, request: Request, db: Session = Depends(get_db), claims=Depends(require_role("platform_admin"))):
    t = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Tenant not found")
    now = datetime.now(timezone.utc)
    t.status = "cancelled"
    t.is_active = False
    t.valid_until = now
    _ensure_webhook_token(t)
    db.add(t)
    db.commit()
    db.refresh(t)
    audit(db, tenant_id=str(t.id), user_id=claims.get("sub"), action="platform_billing_cancel", ip=_ip(request), user_agent=_ua(request), meta={"valid_until": t.valid_until.isoformat()})
    return _tenant_out(db, t)


@router.post("/tenants/{tenant_id}/payments/manual", response_model=PaymentOut)
def create_manual_payment(tenant_id: str, payload: PaymentManualCreate, request: Request, db: Session = Depends(get_db), claims=Depends(require_role("platform_admin"))):
    # create a payment record manually (useful for testing / backfill)
    t = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Tenant not found")

    pid = payload.provider_payment_id or f"manual_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"
    p = Payment(
        tenant_id=t.id,
        provider=payload.provider,
        provider_payment_id=pid,
        type=payload.type,
        amount_cents=int(payload.amount_cents),
        currency=payload.currency,
        status=payload.status,
        paid_at=payload.paid_at,
        meta=payload.meta or "{}",
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    audit(db, tenant_id=str(t.id), user_id=claims.get("sub"), action="platform_payment_manual", ip=_ip(request), user_agent=_ua(request), meta={"provider": p.provider, "provider_payment_id": p.provider_payment_id, "amount_cents": p.amount_cents, "status": p.status})
    return PaymentOut(
        id=str(p.id),
        tenant_id=str(p.tenant_id),
        provider=p.provider,
        provider_payment_id=p.provider_payment_id,
        type=p.type,
        amount_cents=p.amount_cents,
        currency=p.currency,
        status=p.status,
        paid_at=p.paid_at,
        created_at=p.created_at,
    )


# =========================
# Mollie integration (Phase 4.3 - Klantbeheer Fase 4)
# =========================

@router.post('/tenants/{tenant_id}/mollie/customer', response_model=TenantOut)
def mollie_create_customer(tenant_id: str, payload: MollieCreateCustomerIn, request: Request, db: Session = Depends(get_db), claims=Depends(require_role('platform_admin'))):
    t = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not t:
        raise HTTPException(status_code=404, detail='Tenant not found')

    # Ensure webhook token exists
    _ensure_webhook_token(t)

    if t.mollie_customer_id:
        return TenantOut.model_validate(t)

    try:
        c = mollie_client.create_customer(payload.name, payload.email, metadata={'tenant_id': str(t.id), 'tenant_name': t.name})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    t.billing_provider = 'mollie'
    t.mollie_customer_id = c.get('id')
    db.add(t)
    audit(db, t.id, None, 'billing_mollie_customer_create', {'customer_id': t.mollie_customer_id}, ip=_ip(request), user_agent=_ua(request))
    db.commit()
    db.refresh(t)
    return TenantOut.model_validate(t)


@router.post('/tenants/{tenant_id}/mollie/subscription/start', response_model=TenantOut)
def mollie_start_subscription(tenant_id: str, payload: MollieStartSubscriptionIn, request: Request, db: Session = Depends(get_db), claims=Depends(require_role('platform_admin'))):
    t = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not t:
        raise HTTPException(status_code=404, detail='Tenant not found')

    if not t.mollie_customer_id:
        raise HTTPException(status_code=400, detail='Missing mollie_customer_id (create customer first)')

    _ensure_webhook_token(t)

    # Calculate subscription amount based on seats * price_per_seat_year_cents
    price = int(t.price_per_seat_year_cents or 0)
    seats = int(t.seats_purchased or 1)
    if price <= 0:
        raise HTTPException(status_code=400, detail='price_per_seat_year_cents must be set (>0)')

    amount_cents = price * seats
    webhook_url = f"{_public_base_url()}/api/v1/billing/mollie/webhook?tenant_id={t.id}&token={t.webhook_token}"

    try:
        sub = mollie_client.create_subscription(
            customer_id=t.mollie_customer_id,
            amount_cents=amount_cents,
            currency=payload.currency,
            interval=payload.interval,
            description=payload.description,
            webhook_url=webhook_url,
            metadata={'tenant_id': str(t.id), 'seats': seats, 'price_per_seat_year_cents': price},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    t.billing_provider = 'mollie'
    t.mollie_subscription_id = sub.get('id')
    db.add(t)
    audit(db, t.id, None, 'billing_mollie_subscription_start', {'subscription_id': t.mollie_subscription_id, 'interval': payload.interval, 'amount_cents': amount_cents}, ip=_ip(request), user_agent=_ua(request))
    db.commit()
    db.refresh(t)
    return TenantOut.model_validate(t)


@router.post('/tenants/{tenant_id}/mollie/subscription/update_seats', response_model=TenantOut)
def mollie_update_subscription_seats(tenant_id: str, request: Request, db: Session = Depends(get_db), claims=Depends(require_role('platform_admin'))):
    t = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not t:
        raise HTTPException(status_code=404, detail='Tenant not found')

    if not t.mollie_customer_id or not t.mollie_subscription_id:
        raise HTTPException(status_code=400, detail='Missing mollie customer/subscription')

    _ensure_webhook_token(t)

    price = int(t.price_per_seat_year_cents or 0)
    seats = int(t.seats_purchased or 1)
    if price <= 0:
        raise HTTPException(status_code=400, detail='price_per_seat_year_cents must be set (>0)')

    amount_cents = price * seats
    webhook_url = f"{_public_base_url()}/api/v1/billing/mollie/webhook?tenant_id={t.id}&token={t.webhook_token}"

    try:
        mollie_client.update_subscription(
            customer_id=t.mollie_customer_id,
            subscription_id=t.mollie_subscription_id,
            amount_cents=amount_cents,
            currency='EUR',
            webhook_url=webhook_url,
            metadata={'tenant_id': str(t.id), 'seats': seats, 'price_per_seat_year_cents': price},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    audit(db, t.id, None, 'billing_mollie_subscription_update_seats', {'subscription_id': t.mollie_subscription_id, 'amount_cents': amount_cents, 'seats': seats}, ip=_ip(request), user_agent=_ua(request))
    db.commit()
    db.refresh(t)
    return TenantOut.model_validate(t)


@router.post('/tenants/{tenant_id}/mollie/subscription/cancel', response_model=TenantOut)
def mollie_cancel_subscription(tenant_id: str, request: Request, db: Session = Depends(get_db), claims=Depends(require_role('platform_admin'))):
    t = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not t:
        raise HTTPException(status_code=404, detail='Tenant not found')

    if not t.mollie_customer_id or not t.mollie_subscription_id:
        raise HTTPException(status_code=400, detail='Missing mollie customer/subscription')

    try:
        mollie_client.cancel_subscription(t.mollie_customer_id, t.mollie_subscription_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    audit(db, t.id, None, 'billing_mollie_subscription_cancel', {'subscription_id': t.mollie_subscription_id}, ip=_ip(request), user_agent=_ua(request))
    db.commit()
    db.refresh(t)
    return TenantOut.model_validate(t)



@router.post('/tenants/{tenant_id}/mollie/subscription/sync_status', response_model=TenantOut)
def mollie_sync_subscription_status(tenant_id: str, request: Request, db: Session = Depends(get_db), claims=Depends(require_role('platform_admin'))):
    t = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not t:
        raise HTTPException(status_code=404, detail='Tenant not found')
    if not t.mollie_customer_id or not t.mollie_subscription_id:
        raise HTTPException(status_code=400, detail='Missing mollie customer/subscription')

    try:
        sub = mollie_client.get_subscription(t.mollie_customer_id, t.mollie_subscription_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    status = sub.get('status')
    next_payment = sub.get('nextPaymentDate') or sub.get('next_payment_date')
    next_dt = None
    if next_payment:
        try:
            next_dt = datetime.fromisoformat(str(next_payment).replace('Z','+00:00'))
        except Exception:
            next_dt = None

    t.mollie_subscription_status = status
    t.mollie_next_payment_date = next_dt
    t.mollie_subscription_status_updated_at = datetime.now(timezone.utc)

    # Status-driven tenant validity
    now = datetime.now(timezone.utc)
    if status == 'active':
        t.status = 'active'
        t.is_active = True
        # ensure at least 1 year validity window (annual plans)
        if (t.valid_until is None) or (t.valid_until < now):
            t.valid_until = now + timedelta(days=365)
    elif status in ('past_due','suspended'):
        # keep tenant usable but flag status
        t.status = 'active'
        t.is_active = True
    elif status in ('canceled','cancelled','expired'):
        t.status = 'cancelled'
        # allow access until valid_until if set
        if t.valid_until and t.valid_until > now:
            t.is_active = True
        else:
            t.is_active = False

    # Apply any planned downgrade when effective_at has passed
    if getattr(t,'pending_seats',None) is not None and getattr(t,'pending_seats_effective_at',None) is not None:
        if t.pending_seats_effective_at <= now:
            new_seats = int(t.pending_seats)
            t.seats_purchased = new_seats
            t.pending_seats = None
            t.pending_seats_effective_at = None
            price = int(getattr(t,'price_per_seat_year_cents',0) or 0)
            if t.mollie_customer_id and t.mollie_subscription_id and price > 0:
                amount_cents = new_seats * price
                webhook_url = f"{_public_base_url()}/api/v1/billing/mollie/webhook?tenant_id={t.id}&token={t.webhook_token}"
                try:
                    mollie_client.update_subscription(
                        customer_id=t.mollie_customer_id,
                        subscription_id=t.mollie_subscription_id,
                        amount_cents=amount_cents,
                        currency='EUR',
                        webhook_url=webhook_url,
                        metadata={'tenant_id': str(t.id), 'seats': new_seats, 'price_per_seat_year_cents': price},
                    )
                except Exception as e:
                    raise HTTPException(status_code=500, detail=f"Mollie update_subscription (apply pending downgrade) failed: {e}")
                audit(db, t.id, None, 'platform_billing_downgrade_apply_mollie', {'seats': new_seats, 'amount_cents': amount_cents}, ip=_ip(request), user_agent=_ua(request))
            audit(db, t.id, None, 'platform_billing_downgrade_applied', {'seats': new_seats}, ip=_ip(request), user_agent=_ua(request))

    db.add(t)
    audit(db, t.id, None, 'billing_mollie_subscription_sync_status', {'status': status, 'next_payment_date': str(next_payment)}, ip=_ip(request), user_agent=_ua(request))
    db.commit()
    db.refresh(t)
    return TenantOut.model_validate(t)


@router.post('/tenants/{tenant_id}/mollie/payments/sync', response_model=MollieSyncOut)
def mollie_sync_payments(tenant_id: str, request: Request, db: Session = Depends(get_db), claims=Depends(require_role('platform_admin'))):
    t = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not t:
        raise HTTPException(status_code=404, detail='Tenant not found')

    if not t.mollie_customer_id:
        raise HTTPException(status_code=400, detail='Missing mollie customer id')

    try:
        data = mollie_client.list_payments(t.mollie_customer_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    created = 0
    updated = 0
    items = (data.get('_embedded') or {}).get('payments') or []
    for p in items:
        pid = p.get('id')
        if not pid:
            continue
        existing = db.query(Payment).filter(Payment.provider=='mollie', Payment.provider_payment_id==pid).first()
        amount = p.get('amount', {}) or {}
        currency = amount.get('currency', 'EUR')
        value = amount.get('value', '0.00')
        try:
            amount_cents = int(round(float(value)*100))
        except Exception:
            amount_cents = 0
        status = p.get('status', 'unknown')
        paid_at = p.get('paidAt')
        paid_dt = None
        if paid_at:
            try:
                paid_dt = datetime.fromisoformat(paid_at.replace('Z','+00:00'))
            except Exception:
                paid_dt = None
        meta = json.dumps({'mollie': p})

        if existing:
            existing.status = status
            existing.amount_cents = amount_cents
            existing.currency = currency
            existing.paid_at = paid_dt
            existing.meta = meta
            updated += 1
        else:
            db.add(Payment(
                tenant_id=t.id,
                provider='mollie',
                provider_payment_id=pid,
                type='payment',
                amount_cents=amount_cents,
                currency=currency,
                status=status,
                paid_at=paid_dt,
                meta=meta,
            ))
            created += 1

    audit(db, t.id, None, 'billing_mollie_payments_sync', {'created': created, 'updated': updated, 'count': len(items)}, ip=_ip(request), user_agent=_ua(request))
    db.commit()
    return MollieSyncOut(created=created, updated=updated)
