from fastapi import APIRouter

from app.api.v1.attachments import router as attachments_router
from app.api.v1.auth import router as auth_router
from app.api.v1.billing import router as billing_router
from app.api.v1.inspections import router as inspections_router
from app.api.v1.platform import router as platform_router
from app.api.v1.projects import router as projects_router
from app.api.v1.settings_inspection_templates import router as settings_inspection_templates_router
from app.api.v1.settings_masterdata import router as settings_masterdata_router
from app.api.v1.tenant_billing import router as tenant_billing_router
from app.api.v1.tenant_status import router as tenant_status_router
from app.api.v1.weld_defects import router as weld_defects_router
from app.api.v1.welds import router as welds_router
from app.api.v1.welds_admin import router as welds_admin_router

api_router = APIRouter()

api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(projects_router)
api_router.include_router(welds_router)
api_router.include_router(inspections_router)
api_router.include_router(attachments_router)
api_router.include_router(settings_masterdata_router)
api_router.include_router(settings_inspection_templates_router)
api_router.include_router(weld_defects_router)
api_router.include_router(welds_admin_router)
api_router.include_router(platform_router)
api_router.include_router(tenant_status_router)
api_router.include_router(tenant_billing_router)
api_router.include_router(billing_router)
