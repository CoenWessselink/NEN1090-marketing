from fastapi import FastAPI, Response, Request
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router

app = FastAPI(
    title="NEN1090 Backend (Phase 3)",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://nen1090.pages.dev",
    "https://nen1090-marketing.pages.dev",
    "https://app.nen1090.nl",
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

app.include_router(api_router, prefix="/api/v1")


@app.get("/")
def root():
    return {"ok": True, "service": "nen1090-api"}


@app.get("/health")
def health():
    return {"ok": True, "db": "ok"}


@app.options("/health")
def options_health():
    return Response(status_code=204)


@app.options("/api/v1/auth/login")
def options_auth_login():
    return Response(status_code=204)


@app.options("/{full_path:path}")
def options_all(full_path: str, request: Request):
    return Response(status_code=204)