import os
from dotenv import load_dotenv
from pathlib import Path
import urllib.parse

BASE_DIR = Path(__file__).resolve().parents[2]  # backend
ENV_PATH = BASE_DIR / '.env'  # backend/.env
# Do not let a bundled/local .env override Azure App Service settings.
# Local .env is only used as fallback for development.
load_dotenv(dotenv_path=ENV_PATH, override=False)

def _running_on_azure() -> bool:
    return any(os.getenv(k) for k in ("WEBSITE_SITE_NAME", "WEBSITE_INSTANCE_ID", "WEBSITES_PORT"))

def _is_local_db_url(url: str) -> bool:
    lowered = url.lower()
    return any(token in lowered for token in ("@localhost", "@127.0.0.1", "@::1", "://localhost", "://127.0.0.1", "://[::1]"))

def _get_db_url() -> str:
    # Prefer full URL if provided
    url = os.getenv("DATABASE_URL", "").strip()
    if url:
        # Normalize driver: prefer psycopg (v3) to avoid psycopg2 dependency
        if url.startswith('postgresql://'):
            url = 'postgresql+psycopg://' + url[len('postgresql://'):]
        if url.startswith('postgres://'):
            url = 'postgresql+psycopg://' + url[len('postgres://'):]
        # Safety net: on Azure we should never connect to a local database from a bundled .env.
        if _running_on_azure() and _is_local_db_url(url):
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

    # Safely percent-encode user/password for URLs (Azure usernames often contain '@')
    user_enc = urllib.parse.quote(user, safe="")
    pass_enc = urllib.parse.quote(password, safe="")

    # Use psycopg (v3) driver (we ship psycopg[binary] in requirements.txt)
    return f"postgresql+psycopg://{user_enc}:{pass_enc}@{host}:{port}/{name}?sslmode={sslmode}"

class Settings:
    ENV: str = os.getenv("ENV", "dev")
    DATABASE_URL: str = _get_db_url()
    CORS_ORIGINS: list[str] = [o.strip() for o in os.getenv(
        "CORS_ORIGINS",
        "http://127.0.0.1:5173,http://localhost:5173,https://nen1090.pages.dev,https://nen1090-marketing.pages.dev"
    ).split(",") if o.strip()]

    JWT_ACCESS_SECRET: str = os.getenv("JWT_ACCESS_SECRET", "change-me")
    JWT_REFRESH_SECRET: str = os.getenv("JWT_REFRESH_SECRET", "change-me")
    JWT_ACCESS_TTL_MIN: int = int(os.getenv("JWT_ACCESS_TTL_MIN", "15"))
    JWT_REFRESH_TTL_DAYS: int = int(os.getenv("JWT_REFRESH_TTL_DAYS", "14"))
    PASSWORD_HASH_ROUNDS: int = int(os.getenv("PASSWORD_HASH_ROUNDS", "12"))

settings = Settings()
