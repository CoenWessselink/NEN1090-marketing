from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.api.public.router import router as public_router
from app.core.config import settings

app = FastAPI(
    title="NEN1090 API",
    version="1.0.0",
)

# Centrale CORS-configuratie voor app, marketing en lokale development
origins = [
    "https://nen-1090-app.pages.dev",
    "https://nen1090.nl",
    "https://www.nen1090.nl",
    "http://127.0.0.1:8080",
    "http://localhost:8080",
    "http://127.0.0.1:8090",
    "http://localhost:8090",
]

# Neem extra origins uit settings mee als die bestaan
try:
    extra_origins = list(getattr(settings, "CORS_ORIGINS", []) or [])
    for origin in extra_origins:
        if origin and origin not in origins:
            origins.append(origin)
except Exception:
    pass

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"ok": True, "service": "nen1090-api"}

@app.get("/health")
def health():
    return {
        "ok": True,
        "db": "ok",
        "env": getattr(settings, "ENV", "dev"),
        "cors_origins": origins,
    }

# Public marketing/demo/contact/config routes
app.include_router(public_router, prefix="/api/public", tags=["public"])

# Hoofd API v1 routes
app.include_router(api_router, prefix="/api/v1")

# Compatibele auth-routes zonder /v1 voor oudere frontend-koppelingen
try:
    from app.api.v1.auth import router as auth_router
    app.include_router(auth_router, prefix="/api/auth", tags=["auth-compat"])
except Exception:
    pass
