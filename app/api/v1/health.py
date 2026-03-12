from __future__ import annotations

from fastapi import APIRouter

from app.core.config import settings

router = APIRouter(tags=['health'])


@router.get('/health')
def health_v1():
    return {
        'ok': True,
        'env': settings.ENV,
        'cors_origins': settings.CORS_ORIGINS,
        'cors_allow_credentials': False,
        'rate_limit_enabled': settings.ENABLE_RATE_LIMIT,
    }


@router.get('/livez')
def livez():
    return {'ok': True, 'status': 'live'}


@router.get('/readyz')
def readyz():
    return {
        'ok': True,
        'status': 'ready',
        'db_configured': bool(settings.DATABASE_URL),
    }
