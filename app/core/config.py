import os
from dotenv import load_dotenv
from pathlib import Path
import urllib.parse

BASE_DIR = Path(__file__).resolve().parents[2]  # backend
ENV_PATH = BASE_DIR / '.env'  # backend/.env
# Local .env is optional and must never override Azure App Service settings.
if ENV_PATH.exists():
    load_dotenv(dotenv_path=ENV_PATH, override=False)

def _running_on_azure() -> bool:
    return any(os.getenv(k) for k in ("WEBSITE_SITE_NAME", "WEBSITE_INSTANCE_ID", "WEBSITES_PORT"))

def _is_local_db_url(url: str) -> bool:
    lowered = url.lower()
    return any(token in lowered for token in (
        "@localhost", "@127.0.0.1", "@::1", "://localhost", "://127.0.0.1", "://[::1]"
    ))

def _normalize_driver(url: str) -> str:
    if url.startswith('postgresql://'):
        return 'postgresql+psycopg://' + url[len('postgresql://'):]
    if url.startswith('postgres://'):
        return 'postgresql+psycopg://' + url[len('postgres://'):]
    return url

def _mask_db_url(url: str) -> str:
    if not url:
        return '<empty>'
    try:
        parsed = urllib.parse.urlsplit(url)
        host = parsed.hostname or '<no-host>'
        scheme = parsed.scheme or '<no-scheme>'
        port = parsed.port or '<no-port>'
        db = parsed.path.lstrip('/') or '<no-db>'
        user = urllib.parse.unquote(parsed.username or '')
        user_mask = user[:3] + '***' if user else '<no-user>'
        return f"{scheme}://{user_mask}:***@{host}:{port}/{db}"
    except Exception:
        return '<unparseable>'

def _get_db_url() -> str:
    url = os.getenv("DATABASE_URL", "").strip()
    if url:
        url = _normalize_driver(url)
        if _running_on_azure() and _is_local_db_url(url):
            print("WARNING: Ignoring local DATABASE_URL on Azure:", _mask_db_url(url))
            url = ""
        else:
            return url

    host = os.getenv("DB_HOST", "").strip()
    port = os.getenv("DB_PORT", "5432").strip() or "5432"
    name = os.getenv("DB_NAME", "").strip()
    user = os.getenv("DB_USER", "").strip()
    password = os.getenv("DB_PASSWORD", "").strip()
    sslmode = os.getenv("DB_SSLMODE", "require").strip() or "require"

    if not (host and name and user and password):
        return ""

    user_enc = urllib.parse.quote(user, safe="")
    pass_enc = urllib.parse.quote(password, safe="")
    return f"postgresql+psycopg://{user_enc}:{pass_enc}@{host}:{port}/{name}?sslmode={sslmode}"

class Settings:
    ENV: str = os.getenv("ENV", "dev")
    DATABASE_URL: str = _get_db_url()
    CORS_ORIGINS: list[str] = [o.strip() for o in os.getenv(
        "CORS_ORIGINS",
        "http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:8080,http://localhost:8080,https://nen1090-marketing-new.pages.dev,https://nen-1090-app.pages.dev,https://nen1090.nl,https://app.nen1090.nl"
    ).split(",") if o.strip()]
    CORS_ALLOW_CREDENTIALS: bool = os.getenv("CORS_ALLOW_CREDENTIALS", "0").strip().lower() in {"1", "true", "yes", "on"}
    APP_URL: str = os.getenv("APP_URL", "https://nen-1090-app.pages.dev")
    MARKETING_URL: str = os.getenv("MARKETING_URL", "https://nen1090.nl")
    API_BASE_URL: str = os.getenv("API_BASE_URL", "/api")
    DEMO_DEFAULT_PASSWORD: str = os.getenv("DEMO_DEFAULT_PASSWORD", "Admin123!")

    JWT_ACCESS_SECRET: str = os.getenv("JWT_ACCESS_SECRET", "change-me")
    JWT_REFRESH_SECRET: str = os.getenv("JWT_REFRESH_SECRET", "change-me")
    JWT_ACCESS_TTL_MIN: int = int(os.getenv("JWT_ACCESS_TTL_MIN", "15"))
    JWT_REFRESH_TTL_DAYS: int = int(os.getenv("JWT_REFRESH_TTL_DAYS", "14"))
    PASSWORD_HASH_ROUNDS: int = int(os.getenv("PASSWORD_HASH_ROUNDS", "12"))

settings = Settings()
