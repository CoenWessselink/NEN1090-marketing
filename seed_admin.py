"""Seed tenants, admin users and a full demo dataset.

Usage:
  venv\Scripts\activate
  python seed_admin.py

Reads:
  TENANT_NAME (default: demo)
  ADMIN_EMAIL (default: admin@demo.com)
  ADMIN_PASSWORD (default: Admin123!)
  PLATFORM_TENANT (default: platform)
  PLATFORM_ADMIN_EMAIL (default: superadmin@nen1090.com)
  PLATFORM_ADMIN_PASSWORD (default: Admin123!)
  SEED_DEMO_FULL (default: 1)
  RESET_DEMO_FIRST (default: 1)
"""
import os
import secrets

from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.db.models import Tenant, TenantUser, User
from app.db.session import get_engine
from app.services.demo_seed import seed_demo_dataset


def _bcrypt_safe(value: str) -> str:
    value_bytes = value.encode("utf-8")
    if len(value_bytes) > 72:
        print("WARNING: password is longer than 72 bytes; truncating for bcrypt compatibility.")
        return value_bytes[:72].decode("utf-8", errors="ignore")
    return value


def _truthy(name: str, default: str = "0") -> bool:
    return os.getenv(name, default).strip().lower() in {"1", "true", "yes", "y", "on"}


def main():
    eng = get_engine()
    if eng is None:
        raise SystemExit("DATABASE_URL not configured.")

    from sqlalchemy.orm import sessionmaker
    SessionLocal = sessionmaker(bind=eng)

    tenant_name = os.getenv("TENANT_NAME", "demo").strip()
    admin_email = os.getenv("ADMIN_EMAIL", "admin@demo.com").strip().lower()
    admin_pw = _bcrypt_safe(os.getenv("ADMIN_PASSWORD", "Admin123!"))

    platform_tenant_name = os.getenv("PLATFORM_TENANT", "platform").strip()
    platform_email = os.getenv("PLATFORM_ADMIN_EMAIL", "superadmin@nen1090.com").strip().lower()
    platform_pw = _bcrypt_safe(os.getenv("PLATFORM_ADMIN_PASSWORD", "Admin123!"))

    seed_demo_full = _truthy("SEED_DEMO_FULL", "1")
    reset_demo_first = _truthy("RESET_DEMO_FIRST", "1")

    with SessionLocal() as db:  # type: Session
        tenant = db.query(Tenant).filter(Tenant.name == tenant_name).first()
        if not tenant:
            tenant = Tenant(name=tenant_name, is_active=True, status="trial")
            tenant.webhook_token = secrets.token_hex(16)
            db.add(tenant)
            db.commit()
            db.refresh(tenant)

        admin = db.query(User).filter(User.email == admin_email).first()
        if not admin:
            admin = User(email=admin_email, password_hash=hash_password(admin_pw), is_active=True)
            db.add(admin)
            db.commit()
            db.refresh(admin)

        tenant_link = db.query(TenantUser).filter(TenantUser.tenant_id == tenant.id, TenantUser.user_id == admin.id).first()
        if not tenant_link:
            tenant_link = TenantUser(tenant_id=tenant.id, user_id=admin.id, role="tenant_admin")
            db.add(tenant_link)
            db.commit()

        platform_tenant = db.query(Tenant).filter(Tenant.name == platform_tenant_name).first()
        if not platform_tenant:
            platform_tenant = Tenant(name=platform_tenant_name, is_active=True, status="active")
            platform_tenant.webhook_token = secrets.token_hex(16)
            db.add(platform_tenant)
            db.commit()
            db.refresh(platform_tenant)

        platform_admin = db.query(User).filter(User.email == platform_email).first()
        if not platform_admin:
            platform_admin = User(email=platform_email, password_hash=hash_password(platform_pw), is_active=True)
            db.add(platform_admin)
            db.commit()
            db.refresh(platform_admin)

        platform_link = db.query(TenantUser).filter(TenantUser.tenant_id == platform_tenant.id, TenantUser.user_id == platform_admin.id).first()
        if not platform_link:
            platform_link = TenantUser(tenant_id=platform_tenant.id, user_id=platform_admin.id, role="platform_admin")
            db.add(platform_link)
            db.commit()

        seed_result = None
        if seed_demo_full:
            seed_result = seed_demo_dataset(
                db,
                tenant.id,
                tenant_name=tenant.name,
                actor_user_id=admin.id,
                reset_first=reset_demo_first,
                allow_non_demo=False,
            )

    print("Seed OK")
    print("Tenant:", tenant_name)
    print("Admin:", admin_email)
    print("Password:", admin_pw)
    print("Platform tenant:", platform_tenant_name)
    print("Platform admin:", platform_email)
    if seed_result:
        print("Demo dataset:", seed_result)


if __name__ == "__main__":
    main()
