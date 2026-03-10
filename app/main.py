from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.middleware.tenant_context import TenantContextMiddleware

app = FastAPI(
    title="NEN1090 Backend",
    version="0.2.0",
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
app.add_middleware(TenantContextMiddleware)

app.include_router(api_router, prefix="/api/v1")


@app.get("/")
def root():
    return {"ok": True, "service": "nen1090-api"}


@app.get("/health")
def health():
    return {"ok": True, "db": "ok"}
