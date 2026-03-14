from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.api.v1.auth import router as auth_router
from app.api.public.router import router as public_router
from app.core.config import settings
from app.middleware.tenant_context import TenantContextMiddleware

app = FastAPI(
    title="NEN1090 Backend",
    version="0.2.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

app.add_middleware(

    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=86400,
)
app.add_middleware(TenantContextMiddleware)

app.include_router(api_router, prefix="/api/v1")
app.include_router(auth_router, prefix="/api/auth", tags=["auth-compat"])
app.include_router(public_router, prefix="/api/public", tags=["public-compat"])
app.include_router(public_router, prefix="/api/v1/public", tags=["public"])


@app.get("/")
def root():
    return {"ok": True, "service": "nen1090-api"}


@app.get("/health")
def health():
    return {"ok": True, "db": "ok", "env": settings.ENV}
