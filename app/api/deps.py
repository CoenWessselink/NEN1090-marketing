from __future__ import annotations

from datetime import datetime, timezone
from fastapi import Depends, HTTPException, Header
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import decode_access
from app.db.models import User, Tenant


def get_current_claims(authorization: str | None = Header(default=None)):
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization.split(" ", 1)[1].strip()
    try:
        claims = decode_access(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    if claims.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid token type")
    return claims


def require_role(*roles: str):
    def _dep(claims=Depends(get_current_claims)):
        if roles and claims.get("role") not in roles:
            raise HTTPException(status_code=403, detail="Forbidden")
        return claims
    return _dep


def get_current_user(db: Session = Depends(get_db), claims=Depends(get_current_claims)) -> User:
    user_id = claims.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token (no sub)")
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")
    return user


def get_current_tenant_id(claims=Depends(get_current_claims)):
    tid = claims.get("tenant_id")
    if not tid:
        raise HTTPException(status_code=401, detail="Invalid token (no tenant_id)")
    return tid


def get_current_tenant(db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id)) -> Tenant:
    t = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not t:
        raise HTTPException(status_code=401, detail="Tenant not found")
    return t


def _as_utc(dt):
    if not dt:
        return None
    # DB stores naive datetimes in many setups; treat as UTC
    try:
        return dt.replace(tzinfo=timezone.utc)
    except Exception:
        return None


def _tenant_is_read_only(t: Tenant) -> bool:
    # Hard disables
    if getattr(t, "is_active", True) is False:
        return True

    status = (getattr(t, "status", "") or "").lower().strip()
    if status in ("suspended", "cancelled"):
        return True

    now = datetime.now(timezone.utc)

    # Trial expired
    if status == "trial":
        tu = _as_utc(getattr(t, "trial_until", None))
        if tu and tu < now:
            return True

    # Validity expired
    vu = _as_utc(getattr(t, "valid_until", None))
    if vu and vu < now:
        return True

    return False




def tenant_read_only_reasons(t: Tenant) -> list[dict]:
    """Machine-readable reasons why the tenant is in read-only mode."""
    reasons: list[dict] = []
    now = datetime.now(timezone.utc)

    if getattr(t, "is_active", True) is False:
        reasons.append({"code": "INACTIVE"})

    status = (getattr(t, "status", "") or "").lower().strip()
    if status == "suspended":
        reasons.append({"code": "STATUS_SUSPENDED"})
    if status == "cancelled":
        reasons.append({"code": "STATUS_CANCELLED"})
    if status == "trial":
        tu = _as_utc(getattr(t, "trial_until", None))
        if tu and tu < now:
            reasons.append({"code": "TRIAL_EXPIRED", "trial_until": tu.isoformat()})
    vu = _as_utc(getattr(t, "valid_until", None))
    if vu and vu < now:
        reasons.append({"code": "VALID_UNTIL_EXPIRED", "valid_until": vu.isoformat()})

    return reasons
def require_tenant_write(
    tenant: Tenant = Depends(get_current_tenant),
    claims=Depends(get_current_claims),
):
    # Platform admin can always write
    if claims.get("role") == "platform_admin":
        return True
    if _tenant_is_read_only(tenant):
        raise HTTPException(status_code=403, detail={"code":"TENANT_READONLY","reasons": tenant_read_only_reasons(tenant)})
    return True
