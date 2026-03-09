from fastapi import APIRouter

from app.api.v1 import auth

api_router = APIRouter()

# Auth
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])

# Optionele routers: alleen includen als ze bestaan
try:
    from app.api.v1 import projects
    api_router.include_router(projects.router, prefix="/projects", tags=["projects"])
except Exception:
    pass

try:
    from app.api.v1 import health
    api_router.include_router(health.router, prefix="/health", tags=["health"])
except Exception:
    pass

try:
    from app.api.v1 import platform
    api_router.include_router(platform.router, prefix="/platform", tags=["platform"])
except Exception:
    pass