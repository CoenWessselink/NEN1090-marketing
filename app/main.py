from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import settings
from app.middleware.rate_limit import InMemoryRateLimitMiddleware
from app.middleware.security_headers import SecurityHeadersMiddleware
from app.middleware.tenant_context import TenantContextMiddleware

app = FastAPI(
    title="NEN1090 Backend",
    version="0.3.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://nen1090-marketing-new.pages.dev",
    "https://nen-1090-app.pages.dev",
    "https://app.nen1090.nl",
    "https://nen1090.nl",
]


app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=86400,
)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(TenantContextMiddleware)
if settings.ENABLE_RATE_LIMIT:
    app.add_middleware(
        InMemoryRateLimitMiddleware,
        max_requests=settings.RATE_LIMIT_MAX_REQUESTS,
        window_seconds=settings.RATE_LIMIT_WINDOW_SECONDS,
        exempt_paths={'/health', '/livez', '/readyz', '/docs', '/openapi.json', '/redoc'},
    )

app.include_router(api_router, prefix="/api/v1")


@app.get("/")
def root():
    return {"ok": True, "service": "nen1090-api"}


@app.get("/health")
def health():
    return {"ok": True, "db": "ok", "rate_limit_enabled": settings.ENABLE_RATE_LIMIT}
