from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router


app = FastAPI(
    title="NEN1090 API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)


# CORS volledig open (voor development)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# API routes
app.include_router(api_router, prefix="/api/v1")


@app.get("/")
def root():
    return {
        "status": "ok",
        "service": "nen1090-api"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }