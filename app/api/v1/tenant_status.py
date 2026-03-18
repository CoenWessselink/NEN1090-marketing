from __future__ import annotations

from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_claims, get_current_tenant_id, tenant_read_only_reasons, _tenant_is_read_only
from app.db.models import Tenant

router = APIRouter(prefix="/tenant", tags=["tenant"])


@router.get("/status")
def tenant_status(
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    claims=Depends(get_current_claims),
):
    t = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not t:
        return {"tenant_id": str(tenant_id), "found": False}

    # Normalize dates as ISO strings
    def iso(dt):
        if not dt:
            return None
        try:
            return dt.replace(tzinfo=timezone.utc).isoformat()
        except Exception:
            return str(dt)

    ro = _tenant_is_read_only(t)
    reasons = tenant_read_only_reasons(t) if ro else []
    seats = int(getattr(t, "seats_purchased", 0) or 0)
    return {
        "tenant_id": str(t.id),
        "name": t.name,
        "tenant_name": t.name,
        "company": t.name,
        "is_active": bool(getattr(t, "is_active", True)),
        "status": getattr(t, "status", None),
        "trial_until": iso(getattr(t, "trial_until", None)),
        "valid_until": iso(getattr(t, "valid_until", None)),
        "read_only": ro,
        "read_only_reasons": reasons,
        "reasons": reasons,
        "seats_purchased": seats,
        "seats": seats,
        # billing signals (optional fields)
        "billing_provider": getattr(t, "billing_provider", None),
        "mollie_subscription_status": getattr(t, "mollie_subscription_status", None),
        "mollie_next_payment_date": iso(getattr(t, "mollie_next_payment_date", None)),
        "pending_seats": getattr(t, "pending_seats", None),
        "pending_seats_effective_at": iso(getattr(t, "pending_seats_effective_at", None)),
        "now": datetime.now(timezone.utc).isoformat(),
    }
