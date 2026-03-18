from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from fastapi import Depends, Header, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.security import decode_access
from app.db.models import Tenant, TenantUser, User
from app.db.session import get_db

PLATFORM_ROLES = {"platform_admin"}
TENANT_ADMIN_ROLES = {"platform_admin", "tenant_admin"}
TENANT_WRITE_ROLES = {"platform_admin", "tenant_admin", "planner", "qc", "inspector"}


def _as_uuid(value: Any) -> UUID | None:
    if value is None:
        return None
    if isinstance(value, UUID):
        return value
    try:
        return UUID(str(value))
    except Exception:
        return None


def _as_utc(dt):
    if not dt:
        return None
    try:
        return dt if getattr(dt, "tzinfo", None) else dt.replace(tzinfo=timezone.utc)
    except Exception:
        return None


def get_current_claims(
    authorization: str | None = Header(default=None),
    x_tenant_id: str | None = Header(default=None, alias="X-Tenant-Id"),
    x_tenant: str | None = Header(default=None, alias="X-Tenant"),
):
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization.split(" ", 1)[1].strip()
    try:
        claims = decode_access(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    if claims.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid token type")
    if not claims.get("sub"):
        raise HTTPException(status_code=401, detail="Invalid token (no sub)")
    if not claims.get("tenant_id"):
        raise HTTPException(status_code=401, detail="Invalid token (no tenant_id)")
    if x_tenant_id and str(x_tenant_id) != str(claims.get("tenant_id")):
        raise HTTPException(status_code=403, detail="Tenant header komt niet overeen met de sessie")
    normalized_tenant = str(x_tenant).strip().lower() if x_tenant else ''
    if normalized_tenant == 'undefined':
        raise HTTPException(status_code=400, detail='Ongeldige tenant header')
    if normalized_tenant and claims.get('tenant') and normalized_tenant != str(claims.get('tenant')).strip().lower():
        raise HTTPException(status_code=403, detail='Tenant header komt niet overeen met de sessie')
    return claims


def get_optional_claims(request: Request) -> dict | None:
    return getattr(request.state, "claims", None)


def get_current_user(db: Session = Depends(get_db), claims=Depends(get_current_claims)) -> User:
    user_id = _as_uuid(claims.get("sub"))
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token (no sub)")
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")
    return user


def get_current_tenant_id(claims=Depends(get_current_claims)) -> UUID:
    tid = _as_uuid(claims.get("tenant_id"))
    if not tid:
        raise HTTPException(status_code=401, detail="Invalid token (no tenant_id)")
    return tid


def get_current_tenant(db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id)) -> Tenant:
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=401, detail="Tenant not found")
    return tenant


def get_current_membership(
    db: Session = Depends(get_db),
    claims=Depends(get_current_claims),
    tenant_id=Depends(get_current_tenant_id),
) -> TenantUser:
    user_id = _as_uuid(claims.get("sub"))
    membership = (
        db.query(TenantUser)
        .filter(TenantUser.tenant_id == tenant_id, TenantUser.user_id == user_id)
        .first()
    )
    if not membership:
        raise HTTPException(status_code=403, detail="Tenant membership not found")
    return membership


def require_role(*roles: str):
    allowed = {r for r in roles if r}

    def _dep(claims=Depends(get_current_claims)):
        role = claims.get("role")
        if allowed and role not in allowed:
            raise HTTPException(status_code=403, detail="Forbidden")
        return claims

    return _dep


def require_platform_admin(claims=Depends(get_current_claims)):
    if claims.get("role") not in PLATFORM_ROLES:
        raise HTTPException(status_code=403, detail="Forbidden")
    return claims


def require_tenant_admin(claims=Depends(get_current_claims)):
    if claims.get("role") not in TENANT_ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Forbidden")
    return claims


def _tenant_is_read_only(tenant: Tenant) -> bool:
    if getattr(tenant, "is_active", True) is False:
        return True

    status = (getattr(tenant, "status", "") or "").lower().strip()
    if status in ("suspended", "cancelled"):
        return True

    now = datetime.now(timezone.utc)

    if status == "trial":
        trial_until = _as_utc(getattr(tenant, "trial_until", None))
        if trial_until and trial_until < now:
            return True

    valid_until = _as_utc(getattr(tenant, "valid_until", None))
    if valid_until and valid_until < now:
        return True

    return False


def tenant_read_only_reasons(tenant: Tenant) -> list[dict]:
    reasons: list[dict] = []
    now = datetime.now(timezone.utc)

    if getattr(tenant, "is_active", True) is False:
        reasons.append({"code": "INACTIVE"})

    status = (getattr(tenant, "status", "") or "").lower().strip()
    if status == "suspended":
        reasons.append({"code": "STATUS_SUSPENDED"})
    if status == "cancelled":
        reasons.append({"code": "STATUS_CANCELLED"})
    if status == "trial":
        trial_until = _as_utc(getattr(tenant, "trial_until", None))
        if trial_until and trial_until < now:
            reasons.append({"code": "TRIAL_EXPIRED", "trial_until": trial_until.isoformat()})

    valid_until = _as_utc(getattr(tenant, "valid_until", None))
    if valid_until and valid_until < now:
        reasons.append({"code": "VALID_UNTIL_EXPIRED", "valid_until": valid_until.isoformat()})

    return reasons


def require_tenant_write(
    tenant: Tenant = Depends(get_current_tenant),
    claims=Depends(get_current_claims),
):
    if claims.get("role") in PLATFORM_ROLES:
        return True
    if claims.get("role") not in TENANT_WRITE_ROLES:
        raise HTTPException(status_code=403, detail="Forbidden")
    if _tenant_is_read_only(tenant):
        raise HTTPException(
            status_code=403,
            detail={"code": "TENANT_READONLY", "reasons": tenant_read_only_reasons(tenant)},
        )
    return True


def get_tenant_context(
    request: Request,
    claims=Depends(get_current_claims),
    tenant: Tenant = Depends(get_current_tenant),
    user: User = Depends(get_current_user),
):
    return {
        "claims": claims,
        "tenant": tenant,
        "user": user,
        "tenant_id": str(tenant.id),
        "user_id": str(user.id),
        "role": claims.get("role", "viewer"),
        "tenant_status": getattr(tenant, "status", "active"),
        "tenant_is_active": getattr(tenant, "is_active", True),
        "tenant_read_only": _tenant_is_read_only(tenant),
        "tenant_read_only_reasons": tenant_read_only_reasons(tenant),
        "request_id": getattr(request.state, "request_id", None),
    }
