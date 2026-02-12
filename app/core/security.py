import hashlib
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
from jose import jwt
from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=settings.PASSWORD_HASH_ROUNDS)

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(password: str, hashed: str) -> bool:
    return pwd_context.verify(password, hashed)

def _now() -> datetime:
    return datetime.now(timezone.utc)

def create_access_token(*, user_id: str, tenant_id: str, role: str) -> tuple[str, datetime]:
    exp = _now() + timedelta(minutes=settings.JWT_ACCESS_TTL_MIN)
    token = jwt.encode(
        {"sub": user_id, "tenant_id": tenant_id, "role": role, "type": "access", "exp": exp},
        settings.JWT_ACCESS_SECRET,
        algorithm="HS256",
    )
    return token, exp

def create_refresh_token(*, user_id: str, tenant_id: str, role: str) -> tuple[str, datetime]:
    exp = _now() + timedelta(days=settings.JWT_REFRESH_TTL_DAYS)
    token = jwt.encode(
        {"sub": user_id, "tenant_id": tenant_id, "role": role, "type": "refresh", "exp": exp},
        settings.JWT_REFRESH_SECRET,
        algorithm="HS256",
    )
    return token, exp

def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()

def decode_access(token: str) -> dict:
    return jwt.decode(token, settings.JWT_ACCESS_SECRET, algorithms=["HS256"])

def decode_refresh(token: str) -> dict:
    return jwt.decode(token, settings.JWT_REFRESH_SECRET, algorithms=["HS256"])
