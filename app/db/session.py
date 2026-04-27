from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings


def get_engine():
    if not settings.DATABASE_URL:
        return None
    return create_engine(settings.DATABASE_URL, pool_pre_ping=True)


_engine = get_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_engine) if _engine else None


def get_db():
    if SessionLocal is None:
        raise RuntimeError(
            "DATABASE_URL not configured. Set DB_* or DATABASE_URL in backend/.env. "
            "(Local dev example: postgresql+psycopg://postgres:<local-password>@localhost:5432/nen1090 or set Azure DATABASE_URL)"
        )
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
