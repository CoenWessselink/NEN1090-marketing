from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr


class TenantOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    is_active: bool
    status: str
    trial_until: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    seats_purchased: int
    price_per_seat_year_cents: int
    billing_provider: str
    mollie_customer_id: Optional[str] = None
    mollie_subscription_id: Optional[str] = None
    webhook_token: Optional[str] = None
    mollie_subscription_status: Optional[str] = None
    mollie_next_payment_date: Optional[datetime] = None
    mollie_subscription_status_updated_at: Optional[datetime] = None
    pending_seats: Optional[int] = None
    pending_seats_effective_at: Optional[datetime] = None
    created_at: datetime
    users_count: int = 0


class TenantPatch(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None
    status: Optional[str] = None
    trial_until: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    seats_purchased: Optional[int] = None
    price_per_seat_year_cents: Optional[int] = None
    billing_provider: Optional[str] = None
    mollie_customer_id: Optional[str] = None
    mollie_subscription_id: Optional[str] = None
    webhook_token: Optional[str] = None
    mollie_subscription_status: Optional[str] = None
    mollie_next_payment_date: Optional[datetime] = None
    mollie_subscription_status_updated_at: Optional[datetime] = None
    pending_seats: Optional[int] = None
    pending_seats_effective_at: Optional[datetime] = None


class TenantCreateAdmin(BaseModel):
    email: EmailStr
    password: str
    role: str = "tenant_admin"
    is_active: bool = True


class TenantCreate(BaseModel):
    name: str
    is_active: bool = True
    status: str = "trial"
    trial_days: Optional[int] = 14
    valid_until: Optional[datetime] = None
    seats_purchased: int = 1
    price_per_seat_year_cents: int = 0
    billing_provider: str = "none"
    create_admin: Optional[TenantCreateAdmin] = None


class TenantUserOut(BaseModel):
    user_id: str
    email: EmailStr
    is_active: bool
    role: str


class TenantUserCreate(BaseModel):
    email: EmailStr
    password: str
    role: str = "viewer"
    is_active: bool = True


class TenantUserPatch(BaseModel):
    role: Optional[str] = None
    is_active: Optional[bool] = None


class PaymentOut(BaseModel):
    id: str
    tenant_id: str
    provider: str
    provider_payment_id: str
    type: str
    amount_cents: int
    currency: str
    status: str
    paid_at: Optional[datetime] = None
    created_at: datetime


class AuditOut(BaseModel):
    id: str
    tenant_id: str
    user_id: Optional[str] = None
    action: str
    entity: str
    entity_id: str
    ip: str
    user_agent: str
    created_at: datetime
    meta: str


class BillingLink(BaseModel):
    billing_provider: str = "mollie"
    mollie_customer_id: Optional[str] = None
    mollie_subscription_id: Optional[str] = None
    webhook_token: Optional[str] = None
    mollie_subscription_status: Optional[str] = None
    mollie_next_payment_date: Optional[datetime] = None
    mollie_subscription_status_updated_at: Optional[datetime] = None
    pending_seats: Optional[int] = None
    pending_seats_effective_at: Optional[datetime] = None


class SeatsUpdate(BaseModel):
    seats_purchased: int
    price_per_seat_year_cents: Optional[int] = None


class BillingPreviewIn(BaseModel):
    seats_target: int


class BillingPreviewOut(BaseModel):
    current_seats: int
    target_seats: int
    action: str
    effective_at: Optional[datetime] = None
    amount_cents: Optional[int] = None
    will_update_mollie: bool = False
    notes: str = ""


class BillingChangeIn(BaseModel):
    seats_target: int


class PaymentManualCreate(BaseModel):
    provider: str = "manual"
    provider_payment_id: Optional[str] = None
    type: str = "subscription"
    amount_cents: int
    currency: str = "EUR"
    status: str = "paid"
    paid_at: Optional[datetime] = None
    meta: Optional[str] = None


class MessageOut(BaseModel):
    ok: bool = True
    message: str = ""


class MollieCreateCustomerIn(BaseModel):
    name: str
    email: EmailStr


class MollieStartSubscriptionIn(BaseModel):
    interval: str = "12 months"
    currency: str = "EUR"
    description: str = "NEN1090 abonnement"


class MollieSyncOut(BaseModel):
    created: int = 0
    updated: int = 0
