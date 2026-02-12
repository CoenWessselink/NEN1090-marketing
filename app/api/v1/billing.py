from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import json

from app.api.deps import get_db
from app.db.models import Tenant, Payment
from app.core.audit import audit
from app.core import mollie as mollie_client

router = APIRouter(prefix="/billing", tags=["billing"])

@router.post("/mollie/webhook")
async def mollie_webhook(request: Request, db: Session = Depends(get_db)):
    # Mollie sends x-www-form-urlencoded with "id=<payment_id>"
    form = await request.form()
    payment_id = str(form.get("id") or "").strip()
    tenant_id = request.query_params.get("tenant_id", "").strip()
    token = request.query_params.get("token", "").strip()

    if not payment_id:
        raise HTTPException(status_code=400, detail="Missing payment id")

    # Optional tenant validation (recommended)
    tenant = None
    if tenant_id:
        tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant not found")
        if tenant.webhook_token and token != tenant.webhook_token:
            raise HTTPException(status_code=403, detail="Invalid token")

    # Fetch payment details from Mollie
    try:
        pdata = mollie_client.get_payment(payment_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    provider = "mollie"
    amount = pdata.get("amount", {}) or {}
    currency = amount.get("currency", "EUR")
    value = amount.get("value", "0.00")
    try:
        amount_cents = int(round(float(value) * 100))
    except Exception:
        amount_cents = 0
    status = pdata.get("status", "unknown")
    paid_at = pdata.get("paidAt")
    paid_dt = None
    if paid_at:
        try:
            paid_dt = datetime.fromisoformat(paid_at.replace("Z","+00:00"))
        except Exception:
            paid_dt = None

    meta = {
        "mollie": pdata,
        "webhook_ip": request.client.host if request.client else "",
        "received_at": datetime.now(timezone.utc).isoformat(),
    }

    # Infer tenant from metadata if not provided
    if tenant is None:
        md = pdata.get("metadata") or {}
        tid = (md.get("tenant_id") or "").strip()
        if tid:
            tenant = db.query(Tenant).filter(Tenant.id == tid).first()

    if tenant is None:
        # Store as orphan payment (no tenant) is not useful; reject
        raise HTTPException(status_code=400, detail="Tenant not resolved (provide tenant_id or metadata.tenant_id)")

    # Upsert payment record
    existing = db.query(Payment).filter(Payment.provider == provider, Payment.provider_payment_id == payment_id).first()
    if existing:
        existing.status = status
        existing.amount_cents = amount_cents
        existing.currency = currency
        existing.paid_at = paid_dt
        existing.meta = json.dumps(meta)
    else:
        pay = Payment(
            tenant_id=tenant.id,
            provider=provider,
            provider_payment_id=payment_id,
            type="payment",
            amount_cents=amount_cents,
            currency=currency,
            status=status,
            paid_at=paid_dt,
            meta=json.dumps(meta),
        )
        db.add(pay)

    audit(db, tenant.id, None, "billing_mollie_webhook", {"payment_id": payment_id, "status": status}, ip=request.client.host if request.client else "", user_agent=request.headers.get("user-agent",""))
    db.commit()
    return {"ok": True}
