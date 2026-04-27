from fastapi import APIRouter
from app.core.config import settings

router = APIRouter()

@router.get("/health")
def health_v1():
    return {
        "ok": True,
        "env": settings.ENV,
        "cors_origins": settings.CORS_ORIGINS,
        "cors_allow_credentials": settings.CORS_ALLOW_CREDENTIALS,
        "app_url": settings.APP_URL,
        "marketing_url": settings.MARKETING_URL,
    }
