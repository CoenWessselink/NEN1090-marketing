from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional
import json

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_tenant_id, get_current_claims
from app.core.audit import audit
from app.db.models import Payment, Tenant, TenantUser, User


router = APIRouter(prefix="/tenant/billing", tags=["tenant-billing"])


def _ip(request: Request) -> str:
    return (request.headers.get("x-forwarded-for") or request.client.host or "").split(",")[0].strip()


def _ua(request: Request) -> str:
    return request.headers.get("user-agent", "")[:4000]


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _as_utc(dt):
    if not dt:
        return None
    try:
        return dt.replace(tzinfo=timezone.utc)
    except Exception:
        return None


def _users_count(db: Session, tenant_id) -> int:
    # Count active users in tenant
    return (
        db.query(TenantUser)
        .join(User, User.id == TenantUser.user_id)
        .filter(TenantUser.tenant_id == tenant_id, User.is_active == True)
        .count()
    )


def _ensure_tenant_admin(db: Session, tenant_id, user_id, claims):
    if claims.get("role") == "platform_admin":
        return True
    if claims.get("role") != "tenant_admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    # extra safety: verify mapping still exists
    tu = db.query(TenantUser).filter(TenantUser.tenant_id == tenant_id, TenantUser.user_id == user_id).first()
    if not tu or tu.role != "tenant_admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    return True


class BillingStatusOut(BaseModel):
    tenant_id: str
    status: str
    is_active: bool
    trial_until: Optional[str] = None
    valid_until: Optional[str] = None

    seats_purchased: int
    users_count: int
    price_per_seat_year_cents: int = 0

    billing_provider: str = "none"
    mollie_subscription_status: Optional[str] = None
    mollie_next_payment_date: Optional[str] = None

    pending_seats: Optional[int] = None
    pending_seats_effective_at: Optional[str] = None


class PreviewIn(BaseModel):
    target_seats: int = Field(..., ge=1)


class PreviewOut(BaseModel):
    current_seats: int
    target_seats: int
    action: str  # upgrade | downgrade_planned | noop
    effective_at: Optional[str] = None
    amount_cents_year: int = 0


class ChangeIn(BaseModel):
    target_seats: int = Field(..., ge=1)


@router.get("/status", response_model=BillingStatusOut)
def billing_status(
    request: Request,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    claims=Depends(get_current_claims),
):
    t = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Tenant not found")

    return BillingStatusOut(
        tenant_id=str(t.id),
        status=getattr(t, "status", "active"),
        is_active=bool(getattr(t, "is_active", True)),
        trial_until=t.trial_until.isoformat() if t.trial_until else None,
        valid_until=t.valid_until.isoformat() if t.valid_until else None,
        seats_purchased=int(t.seats_purchased or 1),
        users_count=_users_count(db, t.id),
        price_per_seat_year_cents=int(getattr(t, "price_per_seat_year_cents", 0) or 0),
        billing_provider=getattr(t, "billing_provider", "none") or "none",
        mollie_subscription_status=getattr(t, "mollie_subscription_status", None),
        mollie_next_payment_date=t.mollie_next_payment_date.isoformat() if t.mollie_next_payment_date else None,
        pending_seats=getattr(t, "pending_seats", None),
        pending_seats_effective_at=t.pending_seats_effective_at.isoformat() if t.pending_seats_effective_at else None,
    )


@router.post("/preview", response_model=PreviewOut)
def billing_preview(
    payload: PreviewIn,
    request: Request,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    claims=Depends(get_current_claims),
):
    t = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Tenant not found")

    current = int(t.seats_purchased or 1)
    target = int(payload.target_seats)
    users_cnt = _users_count(db, t.id)
    if target < users_cnt:
        raise HTTPException(status_code=400, detail=f"Target seats ({target}) < actieve users ({users_cnt})")

    price = int(getattr(t, "price_per_seat_year_cents", 0) or 0)
    amount = target * price

    if target == current:
        return PreviewOut(current_seats=current, target_seats=target, action="noop", amount_cents_year=amount)

    if target > current:
        return PreviewOut(current_seats=current, target_seats=target, action="upgrade", amount_cents_year=amount)

    # downgrade planned
    eff = t.mollie_next_payment_date.isoformat() if t.mollie_next_payment_date else None
    return PreviewOut(current_seats=current, target_seats=target, action="downgrade_planned", effective_at=eff, amount_cents_year=amount)


@router.post("/change", response_model=BillingStatusOut)
def billing_change(
    payload: ChangeIn,
    request: Request,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    claims=Depends(get_current_claims),
):
    user_id = claims.get("sub")
    _ensure_tenant_admin(db, tenant_id, user_id, claims)

    t = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Tenant not found")

    current = int(t.seats_purchased or 1)
    target = int(payload.target_seats)

    users_cnt = _users_count(db, t.id)
    if target < users_cnt:
        raise HTTPException(status_code=400, detail=f"Target seats ({target}) < actieve users ({users_cnt})")

    if target == current:
        return billing_status(request, db, tenant_id, claims)

    if target > current:
        # Upgrade direct (and let platform billing autosync handle Mollie via existing logic)
        t.seats_purchased = target
        t.pending_seats = None
        t.pending_seats_effective_at = None
        db.commit()
        audit(db, tenant_id=str(t.id), user_id=str(user_id) if user_id else None, action="tenant_billing_upgrade", entity="tenant", entity_id=str(t.id), ip=_ip(request), user_agent=_ua(request), meta={"seats": target})
        return billing_status(request, db, tenant_id, claims)

    # Downgrade planned on next payment date
    if not t.mollie_next_payment_date:
        raise HTTPException(status_code=400, detail="Downgrade plannen vereist next payment date. Doe eerst: Mollie sync subscription.")

    t.pending_seats = target
    t.pending_seats_effective_at = t.mollie_next_payment_date
    db.commit()
    audit(db, tenant_id=str(t.id), user_id=str(user_id) if user_id else None, action="tenant_billing_downgrade_planned", entity="tenant", entity_id=str(t.id), ip=_ip(request), user_agent=_ua(request), meta={"seats": target, "effective_at": t.mollie_next_payment_date.isoformat()})
    return billing_status(request, db, tenant_id, claims)


class MarketingSubscriptionIn(BaseModel):
    plan: str = Field(..., min_length=1)
    billing: str = Field(default="monthly")
    seats: int = Field(..., ge=1)


def _infer_plan_name(tenant: Tenant) -> str:
    price = int(getattr(tenant, "price_per_seat_year_cents", 0) or 0)
    if price >= 5900:
        return "enterprise"
    if price >= 4200:
        return "professional"
    if price > 0:
        return "starter"
    return "professional"


def _infer_billing_cycle(tenant: Tenant) -> str:
    return "yearly" if getattr(tenant, "billing_provider", "") == "mollie" else "monthly"


def _tenant_contact_email(db: Session, tenant_id) -> str:
    membership = (
        db.query(TenantUser, User)
        .join(User, User.id == TenantUser.user_id)
        .filter(TenantUser.tenant_id == tenant_id)
        .order_by(TenantUser.created_at.asc())
        .first()
    )
    if not membership:
        return ""
    return str(getattr(membership[1], "email", "") or "")


def _payment_meta(payment: Payment) -> dict:
    try:
        return json.loads(getattr(payment, "meta", "") or "{}")
    except Exception:
        return {}


@router.get('/subscription')
def marketing_subscription(
    request: Request,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    claims=Depends(get_current_claims),
):
    t = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not t:
        raise HTTPException(status_code=404, detail='Tenant not found')

    payments = (
        db.query(Payment)
        .filter(Payment.tenant_id == t.id)
        .order_by(Payment.created_at.desc())
        .limit(10)
        .all()
    )
    invoices = []
    for index, payment in enumerate(payments):
        invoices.append({
            'id': str(payment.id),
            'number': f'PAY-{index + 1:03d}',
            'amount': f"€{(int(payment.amount_cents or 0) / 100):.2f}".replace('.', ','),
            'status': str(payment.status or 'unknown').lower(),
            'date': payment.created_at.isoformat() if payment.created_at else None,
            'url': '',
        })

    return {
        'subscription': {
            'plan': _infer_plan_name(t),
            'billing': _infer_billing_cycle(t),
            'seats': int(getattr(t, 'pending_seats', None) or t.seats_purchased or 1),
            'company': t.name,
            'contactEmail': _tenant_contact_email(db, t.id),
            'nextInvoiceDate': t.mollie_next_payment_date.isoformat() if t.mollie_next_payment_date else (t.valid_until.isoformat() if t.valid_until else None),
            'amount': f"€{(int(t.seats_purchased or 1) * int(getattr(t, 'price_per_seat_year_cents', 0) or 0) / 100):.2f}".replace('.', ','),
            'status': getattr(t, 'mollie_subscription_status', None) or getattr(t, 'status', 'active'),
            'portalUrl': '',
            'cancelAtPeriodEnd': bool(getattr(t, 'pending_seats', None)),
            'invoices': invoices,
        }
    }


@router.post('/update-subscription')
def marketing_update_subscription(
    payload: MarketingSubscriptionIn,
    request: Request,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    claims=Depends(get_current_claims),
):
    change_payload = ChangeIn(target_seats=payload.seats)
    status = billing_change(change_payload, request, db, tenant_id, claims)
    return {
        'ok': True,
        'message': 'Abonnement bijgewerkt via tenant billing adapter.',
        'status': getattr(status, 'status', 'updated'),
        'effective_at': getattr(status, 'pending_seats_effective_at', None),
        'plan': payload.plan,
        'billing': payload.billing,
        'seats': payload.seats,
    }


@router.post('/cancel-subscription')
def marketing_cancel_subscription(
    request: Request,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    claims=Depends(get_current_claims),
):
    user_id = claims.get('sub')
    _ensure_tenant_admin(db, tenant_id, user_id, claims)
    t = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not t:
        raise HTTPException(status_code=404, detail='Tenant not found')
    t.status = 'cancelled'
    db.commit()
    audit(db, tenant_id=str(t.id), user_id=str(user_id) if user_id else None, action='tenant_billing_cancelled_via_shell', entity='tenant', entity_id=str(t.id), ip=_ip(request), user_agent=_ua(request), meta={'source': 'marketing-shell'})
    return {'ok': True, 'message': 'Abonnement stopgezet.', 'status': 'cancelled'}


class PaymentReferenceIn(BaseModel):
    order_ref: Optional[str] = None
    orderRef: Optional[str] = None
    reference: Optional[str] = None


@router.post('/payment-reference')
def payment_reference_lookup(payload: PaymentReferenceIn, db: Session = Depends(get_db)):
    order_ref = str(payload.order_ref or payload.orderRef or payload.reference or '').strip()
    if not order_ref:
        raise HTTPException(status_code=400, detail='order_ref required')

    payment = db.query(Payment).order_by(Payment.created_at.desc()).all()
    for row in payment:
        meta = _payment_meta(row)
        mollie_meta = meta.get('mollie', {}).get('metadata', {}) if isinstance(meta.get('mollie'), dict) else {}
        candidates = {
            str(mollie_meta.get('orderRef') or ''),
            str(mollie_meta.get('order_ref') or ''),
            str(meta.get('orderRef') or ''),
            str(meta.get('order_ref') or ''),
        }
        if order_ref in {c for c in candidates if c}:
            return {
                'ok': True,
                'orderRef': order_ref,
                'paymentId': row.provider_payment_id,
                'status': row.status,
            }
    return {'ok': False, 'orderRef': order_ref, 'paymentId': '', 'status': 'pending_reference'}


class ConfirmPaymentIn(BaseModel):
    provider: str = 'mollie'
    payment: dict = Field(default_factory=dict)
    order_ref: Optional[str] = None


@router.post('/confirm-payment')
def confirm_payment(payload: ConfirmPaymentIn, db: Session = Depends(get_db)):
    payment = payload.payment or {}
    payment_id = str(payment.get('id') or '').strip()
    if not payment_id:
        raise HTTPException(status_code=400, detail='payment.id required')

    row = db.query(Payment).filter(Payment.provider == payload.provider, Payment.provider_payment_id == payment_id).first()
    if not row:
        raise HTTPException(status_code=404, detail='Payment not found')

    tenant = db.query(Tenant).filter(Tenant.id == row.tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail='Tenant not found')

    is_paid = str(payment.get('status') or row.status or '').lower() == 'paid'
    if is_paid:
        tenant.is_active = True
        if getattr(tenant, 'status', 'active') in ('trial', 'suspended', 'cancelled'):
            tenant.status = 'active'
        row.status = 'paid'
        if not row.paid_at:
            row.paid_at = _now_utc()
        db.commit()

    onboarding_url = '/app/set-password.html'
    return {
        'ok': True,
        'activated': is_paid,
        'needsOnboarding': is_paid,
        'onboardingUrl': onboarding_url,
        'activationStatus': 'activated' if is_paid else str(row.status or 'pending'),
        'message': 'Betaling bevestigd en tenantstatus ververst.' if is_paid else 'Betaling nog niet afgerond.',
        'tenantId': str(tenant.id),
    }
