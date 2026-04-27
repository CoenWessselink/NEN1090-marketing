"""Command line helper for a full demo seed.

Usage:
  python scripts/seed_demo_full.py

Environment variables:
  TENANT_NAME=demo
  ADMIN_EMAIL=admin@demo.com
  ALLOW_NON_DEMO=0
  RESET_DEMO_FIRST=1
"""
from __future__ import annotations

import os

from sqlalchemy.orm import Session, sessionmaker

from app.db.models import Tenant, TenantUser, User
from app.db.session import get_engine
from app.services.demo_seed import seed_demo_dataset


def _truthy(name: str, default: str = "0") -> bool:
    return os.getenv(name, default).strip().lower() in {"1", "true", "yes", "y", "on"}


def main() -> None:
    engine = get_engine()
    if engine is None:
        raise SystemExit("DATABASE_URL not configured.")

    SessionLocal = sessionmaker(bind=engine)
    tenant_name = os.getenv("TENANT_NAME", "demo").strip()
    admin_email = os.getenv("ADMIN_EMAIL", "admin@demo.com").strip().lower()
    allow_non_demo = _truthy("ALLOW_NON_DEMO", "0")
    reset_demo_first = _truthy("RESET_DEMO_FIRST", "1")

    with SessionLocal() as db:  # type: Session
        tenant = db.query(Tenant).filter(Tenant.name == tenant_name).first()
        if not tenant:
            raise SystemExit(f"Tenant '{tenant_name}' not found. Run seed_admin.py first.")

        user = db.query(User).filter(User.email == admin_email).first()
        if not user:
            raise SystemExit(f"User '{admin_email}' not found. Run seed_admin.py first.")

        link = db.query(TenantUser).filter(TenantUser.tenant_id == tenant.id, TenantUser.user_id == user.id).first()
        if not link:
            raise SystemExit(f"User '{admin_email}' is not linked to tenant '{tenant_name}'.")

        result = seed_demo_dataset(
            db,
            tenant.id,
            tenant_name=tenant.name,
            actor_user_id=user.id,
            reset_first=reset_demo_first,
            allow_non_demo=allow_non_demo,
        )

    print("Demo seed OK")
    print(result)


if __name__ == "__main__":
    main()
