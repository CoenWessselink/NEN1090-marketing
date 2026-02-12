"""Seed a default tenant + admin user (run locally once after migrations).

Usage:
  venv\Scripts\activate
  python seed_admin.py

Reads:
  TENANT_NAME (default: demo)
  ADMIN_EMAIL (default: admin@demo.com)
  ADMIN_PASSWORD (default: Admin123!)
# NOTE: Use a real email domain (e.g. demo.com). Reserved domains like .local may be rejected by email-validator.

"""
import os
from sqlalchemy.orm import Session
from app.core.config import settings
from app.db.session import get_engine
from app.db.models import Tenant, User, TenantUser
from app.core.security import hash_password

# Optional demo entities (present in v13+). Keep seed_admin working even if you run an older backend.
try:
    from app.db.models import Project, Weld  # type: ignore
except Exception:
    Project = None  # type: ignore
    Weld = None  # type: ignore

def main():
    eng = get_engine()
    if eng is None:
        raise SystemExit("DATABASE_URL not configured.")
    from sqlalchemy.orm import sessionmaker
    SessionLocal = sessionmaker(bind=eng)
    tenant_name = os.getenv("TENANT_NAME", "demo")
    admin_email = os.getenv("ADMIN_EMAIL", "admin@demo.com").lower()
    admin_pw = os.getenv("ADMIN_PASSWORD", "Admin123!")

    # bcrypt only uses first 72 bytes of the password; longer secrets can raise errors depending on backend.
    pw_bytes = admin_pw.encode('utf-8')
    if len(pw_bytes) > 72:
        print('WARNING: ADMIN_PASSWORD is longer than 72 bytes; truncating to 72 bytes for bcrypt compatibility.')
        print('         Tip: set a shorter ADMIN_PASSWORD in your environment or .env when seeding.')
        admin_pw = pw_bytes[:72].decode('utf-8', errors='ignore')

    with SessionLocal() as db:  # type: Session
        t = db.query(Tenant).filter(Tenant.name == tenant_name).first()
        if not t:
            t = Tenant(name=tenant_name)
            db.add(t)
            db.commit()
            db.refresh(t)

        u = db.query(User).filter(User.email == admin_email).first()
        if not u:
            u = User(email=admin_email, password_hash=hash_password(admin_pw))
            db.add(u)
            db.commit()
            db.refresh(u)

        link = db.query(TenantUser).filter(TenantUser.tenant_id == t.id, TenantUser.user_id == u.id).first()
        if not link:
            link = TenantUser(tenant_id=t.id, user_id=u.id, role="tenant_admin")
            db.add(link)
            db.commit()

        
        # ---- Platform (Superadmin) seed ----
        platform_tenant_name = os.getenv("PLATFORM_TENANT", "platform")
        platform_email = os.getenv("PLATFORM_ADMIN_EMAIL", "superadmin@nen1090.com").lower()
        platform_pw = os.getenv("PLATFORM_ADMIN_PASSWORD", "Admin123!")
        pwb = platform_pw.encode("utf-8")
        if len(pwb) > 72:
            platform_pw = pwb[:72].decode("utf-8", errors="ignore")

        pt = db.query(Tenant).filter(Tenant.name == platform_tenant_name).first()
        if not pt:
            pt = Tenant(name=platform_tenant_name)
            try:
                pt.webhook_token = __import__('secrets').token_hex(16)
            except Exception:
                pass
            # mark as active platform tenant
            try:
                pt.status = "active"
            except Exception:
                pass
            db.add(pt)
            db.commit()
            db.refresh(pt)

        pu = db.query(User).filter(User.email == platform_email).first()
        if not pu:
            pu = User(email=platform_email, password_hash=hash_password(platform_pw))
            db.add(pu)
            db.commit()
            db.refresh(pu)

        plink = db.query(TenantUser).filter(TenantUser.tenant_id == pt.id, TenantUser.user_id == pu.id).first()
        if not plink:
            plink = TenantUser(tenant_id=pt.id, user_id=pu.id, role="platform_admin")
            db.add(plink)
            db.commit()

        # Seed a tiny bit of demo data (safe to run multiple times)
        if Project is not None and Weld is not None:
            existing_project = (
                db.query(Project)
                .filter(Project.tenant_id == t.id)
                .order_by(Project.created_at.desc())
                .first()
            )
            if not existing_project:
                p = Project(
                    tenant_id=t.id,
                    code="DEMO-001",
                    name="Demo project (NEN1090)",
                    status="active",
                )
                db.add(p)
                db.commit()
                db.refresh(p)

                db.add_all([
                    Weld(tenant_id=t.id, project_id=p.id, weld_no="L-001", location="Kolom A1", wps="WPS-135", result="pending"),
                    Weld(tenant_id=t.id, project_id=p.id, weld_no="L-002", location="Ligger B2", wps="WPS-135", result="pending"),
                ])
                db.commit()

    print("Seed OK")
    print("Tenant:", tenant_name)
    print("Admin:", admin_email)
    print("Password:", admin_pw)
if __name__ == "__main__":
    main()
