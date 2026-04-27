"""DB smoke test for NEN1090 backend.

Runs a quick connectivity + schema check against DATABASE_URL from backend/.env.

Usage:
  cd backend
  venv\Scripts\activate
  python db_smoketest.py
"""
from __future__ import annotations

from sqlalchemy import create_engine, text
from app.core.config import settings

def main() -> int:
    url = settings.DATABASE_URL
    if not url:
        print("ERROR: DATABASE_URL not configured. Fill backend/.env (DB_* or DATABASE_URL).")
        return 2

    eng = create_engine(url, pool_pre_ping=True)

    with eng.connect() as conn:
        # Basic ping
        conn.execute(text("SELECT 1"))
        # Postgres version
        version = conn.execute(text("SHOW server_version")).scalar_one()
        print("OK: Connected to Postgres server_version =", version)

        # Alembic version (if table exists)
        try:
            alembic_ver = conn.execute(text("SELECT version_num FROM alembic_version")).scalar_one()
            print("OK: alembic_version =", alembic_ver)
        except Exception as e:
            print("WARN: alembic_version table not found yet (did migrations run?).", str(e))

        # List tables (public schema)
        rows = conn.execute(text("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema='public'
            ORDER BY table_name
        """)).fetchall()
        tables = [r[0] for r in rows]
        print("Tables (public):", ", ".join(tables) if tables else "(none)")

        required = {"tenants","users","tenant_users","refresh_tokens","audit_log","projects","welds","documents"}
        missing = sorted(required - set(tables))
        if missing:
            print("ERROR: Missing required tables:", ", ".join(missing))
            return 3

    print("SMOKETEST OK ✅")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
