from app.db.session import SessionLocal
from app.models.user import User
from app.models.tenant import Tenant
from app.core.security import get_password_hash

db = SessionLocal()

# 1. Platform tenant ophalen of maken
platform = db.query(Tenant).filter(Tenant.name == "platform").first()

if not platform:
    platform = Tenant(
        name="platform",
        is_active=True
    )
    db.add(platform)
    db.commit()
    db.refresh(platform)

# 2. Superadmin gebruiker
existing = db.query(User).filter(User.email == "admin@platform.com").first()

if not existing:
    user = User(
        email="admin@platform.com",
        hashed_password=get_password_hash("Admin123!"),
        role="super_admin",
        tenant_id=platform.id,
        is_active=True
    )
    db.add(user)
    db.commit()

print("Superadmin klaar")