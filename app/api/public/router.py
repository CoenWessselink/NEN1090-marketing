from fastapi import APIRouter, Request, Depends
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import Tenant, User, TenantUser
from app.core.security import hash_password
from app.core.config import settings
import secrets
from datetime import datetime, timedelta

router = APIRouter()


class DemoStartRequest(BaseModel):
    name: str
    company: str | None = None
    email: EmailStr


class ContactRequest(BaseModel):
    name: str
    email: EmailStr
    message: str
    company: str | None = None


class CheckoutSessionRequest(BaseModel):
    plan: str = "professional"
    users: int = 1
    company: str | None = None
    email: EmailStr | None = None


@router.get("/config")
def public_config():
    return {
        "ok": True,
        "app_url": settings.APP_URL,
        "marketing_url": settings.MARKETING_URL,
        "api_base_url": settings.API_BASE_URL,
        "plans": [
            {"key": "starter", "label": "Starter"},
            {"key": "professional", "label": "Professional"},
            {"key": "enterprise", "label": "Enterprise"},
        ],
    }


@router.post("/demo/start")
def demo_start(
    payload: DemoStartRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == payload.email.lower()).first()

    tenant_name = (
        payload.company or payload.email.split("@")[0]
    ).strip().lower().replace(" ", "-")[:40] or "demo"

    tenant_name = "".join(c for c in tenant_name if c.isalnum() or c == "-")

    if not tenant_name:
        tenant_name = "demo"

    base_name = tenant_name
    idx = 1

    while db.query(Tenant).filter(Tenant.name == tenant_name).first():
        idx += 1
        tenant_name = f"{base_name}-{idx}"

    if not user:
        demo_password = settings.DEMO_DEFAULT_PASSWORD
        user = User(
            email=payload.email.lower(),
            password_hash=hash_password(demo_password),
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        demo_password = None

    tenant = Tenant(
        name=tenant_name,
        is_active=True,
        status="trial",
        trial_until=datetime.utcnow() + timedelta(days=14),
    )
    tenant.webhook_token = secrets.token_hex(16)
    db.add(tenant)
    db.commit()
    db.refresh(tenant)

    link = db.query(TenantUser).filter(
        TenantUser.tenant_id == tenant.id,
        TenantUser.user_id == user.id,
    ).first()

    if not link:
        db.add(
            TenantUser(
                tenant_id=tenant.id,
                user_id=user.id,
                role="tenant_admin",
            )
        )
        db.commit()

    return {
        "ok": True,
        "message": "Demo gestart",
        "tenant": tenant.name,
        "email": user.email,
        "password": demo_password,
        "login_url": settings.APP_URL.rstrip("/") + "/login",
    }


@router.post("/contact")
def contact(payload: ContactRequest):
    return {
        "ok": True,
        "message": "Bericht ontvangen",
        "contact": {
            "name": payload.name,
            "email": payload.email,
            "company": payload.company,
        },
    }


@router.post("/checkout/create-session")
def checkout_session(payload: CheckoutSessionRequest):
    return {
        "ok": True,
        "provider": "preview",
        "checkout_url": settings.MARKETING_URL.rstrip("/") + "/pricing.html?plan=" + payload.plan,
        "plan": payload.plan,
        "users": payload.users,
    }
