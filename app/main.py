from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import settings
from app.db.session import get_engine

app = FastAPI(title="NEN1090 Backend (Phase 3)")

# Dev safety: warn if JWT secrets are not configured
if settings.JWT_ACCESS_SECRET == "change-me" or settings.JWT_REFRESH_SECRET == "change-me":
    print("WARNING: JWT secrets are still set to 'change-me'. Set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET in backend/.env for real auth.")


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

def _health_payload():
    try:
        eng = get_engine()
        if eng is None:
            return {"ok": True, "db": "not_configured"}
        with eng.connect() as c:
            c.exec_driver_sql("SELECT 1;")
        return {"ok": True, "db": "connected"}
    except Exception as e:
        # dev-friendly; in prod avoid leaking details
        return {"ok": False, "db": "error", "detail": str(e)}

# Backwards/UX friendly: both paths work
@app.get("/health")
def health_root():
    return _health_payload()

@app.get("/api/health")
def health_api():
    return _health_payload()

app.include_router(api_router)
