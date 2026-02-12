from __future__ import annotations

from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.api.deps import get_db, get_current_tenant_id, get_current_user, require_role
from app.core.audit import audit
from app.db.models import WpsMaster, MaterialMaster, WelderMaster, ProjectWps, ProjectMaterial, ProjectWelder

router = APIRouter(prefix="/settings", tags=["settings"])


class WpsIn(BaseModel):
    kind: str = Field(default="WPS", pattern=r"^(WPS|WPQR)$")
    code: str
    title: str | None = None
    document_no: str | None = None
    version: str | None = None


class WpsOut(BaseModel):
    id: UUID
    kind: str
    code: str
    title: str | None = None
    document_no: str | None = None
    version: str | None = None

    class Config:
        from_attributes = True


@router.get("/wps", response_model=list[WpsOut])
def list_wps(
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    _user=Depends(get_current_user),
):
    return db.query(WpsMaster).filter(WpsMaster.tenant_id == tenant_id).order_by(WpsMaster.kind.asc(), WpsMaster.code.asc()).all()


@router.post("/wps", response_model=WpsOut)
def create_wps(
    payload: WpsIn,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
    _claims=Depends(require_role("tenant_admin", "platform_admin")),
):
    row = WpsMaster(
        tenant_id=tenant_id,
        kind=payload.kind,
        code=payload.code.strip(),
        title=(payload.title or None),
        document_no=(payload.document_no or None),
        version=(payload.version or None),
    )
    db.add(row)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="WPS code already exists")
    db.refresh(row)
    audit(db, tenant_id=str(tenant_id), user_id=str(getattr(user, 'id', '') or ''), action="settings_wps_create", entity="wps_master", entity_id=str(row.id), meta={"kind": row.kind, "code": row.code})
    return row


class WpsPatch(BaseModel):
    kind: str | None = Field(default=None, pattern=r"^(WPS|WPQR)$")
    code: str | None = None
    title: str | None = None
    document_no: str | None = None
    version: str | None = None


@router.patch("/wps/{wps_id}", response_model=WpsOut)
def patch_wps(
    wps_id: UUID,
    payload: WpsPatch,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
    _claims=Depends(require_role("tenant_admin", "platform_admin")),
):
    row = db.query(WpsMaster).filter(WpsMaster.id == wps_id, WpsMaster.tenant_id == tenant_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    data = payload.model_dump(exclude_unset=True)
    if "code" in data and data["code"] is not None:
        data["code"] = data["code"].strip()
    for k, v in data.items():
        setattr(row, k, v)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="WPS code already exists")
    db.refresh(row)
    audit(db, tenant_id=str(tenant_id), user_id=str(getattr(user, 'id', '') or ''), action="settings_wps_update", entity="wps_master", entity_id=str(row.id))
    return row


@router.delete("/wps/{wps_id}")
def delete_wps(
    wps_id: UUID,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
    _claims=Depends(require_role("tenant_admin", "platform_admin")),
):
    row = db.query(WpsMaster).filter(WpsMaster.id == wps_id, WpsMaster.tenant_id == tenant_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    linked = db.query(ProjectWps).filter(ProjectWps.tenant_id == tenant_id, ProjectWps.ref_id == row.id).first()
    if linked:
        raise HTTPException(status_code=409, detail="Cannot delete: linked to project")
    db.delete(row)
    db.commit()
    audit(db, tenant_id=str(tenant_id), user_id=str(getattr(user, 'id', '') or ''), action="settings_wps_delete", entity="wps_master", entity_id=str(wps_id))
    return {"ok": True}


# --- Materials ---
class MaterialIn(BaseModel):
    code: str
    title: str | None = None


class MaterialOut(BaseModel):
    id: UUID
    code: str
    title: str | None = None

    class Config:
        from_attributes = True


@router.get("/materials", response_model=list[MaterialOut])
def list_materials(
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    _user=Depends(get_current_user),
):
    return db.query(MaterialMaster).filter(MaterialMaster.tenant_id == tenant_id).order_by(MaterialMaster.code.asc()).all()


@router.post("/materials", response_model=MaterialOut)
def create_material(
    payload: MaterialIn,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
    _claims=Depends(require_role("tenant_admin", "platform_admin")),
):
    row = MaterialMaster(tenant_id=tenant_id, code=payload.code.strip(), title=(payload.title or None))
    db.add(row)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Material code already exists")
    db.refresh(row)
    audit(db, tenant_id=str(tenant_id), user_id=str(getattr(user, 'id', '') or ''), action="settings_material_create", entity="materials_master", entity_id=str(row.id))
    return row


class MaterialPatch(BaseModel):
    code: str | None = None
    title: str | None = None


@router.patch("/materials/{material_id}", response_model=MaterialOut)
def patch_material(
    material_id: UUID,
    payload: MaterialPatch,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
    _claims=Depends(require_role("tenant_admin", "platform_admin")),
):
    row = db.query(MaterialMaster).filter(MaterialMaster.id == material_id, MaterialMaster.tenant_id == tenant_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    data = payload.model_dump(exclude_unset=True)
    if "code" in data and data["code"] is not None:
        data["code"] = data["code"].strip()
    for k, v in data.items():
        setattr(row, k, v)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Material code already exists")
    db.refresh(row)
    audit(db, tenant_id=str(tenant_id), user_id=str(getattr(user, 'id', '') or ''), action="settings_material_update", entity="materials_master", entity_id=str(row.id))
    return row


@router.delete("/materials/{material_id}")
def delete_material(
    material_id: UUID,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
    _claims=Depends(require_role("tenant_admin", "platform_admin")),
):
    row = db.query(MaterialMaster).filter(MaterialMaster.id == material_id, MaterialMaster.tenant_id == tenant_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    linked = db.query(ProjectMaterial).filter(ProjectMaterial.tenant_id == tenant_id, ProjectMaterial.ref_id == row.id).first()
    if linked:
        raise HTTPException(status_code=409, detail="Cannot delete: linked to project")
    db.delete(row)
    db.commit()
    audit(db, tenant_id=str(tenant_id), user_id=str(getattr(user, 'id', '') or ''), action="settings_material_delete", entity="materials_master", entity_id=str(material_id))
    return {"ok": True}


# --- Welders ---
class WelderIn(BaseModel):
    code: str
    name: str | None = None


class WelderOut(BaseModel):
    id: UUID
    code: str
    name: str | None = None

    class Config:
        from_attributes = True


@router.get("/welders", response_model=list[WelderOut])
def list_welders(
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    _user=Depends(get_current_user),
):
    return db.query(WelderMaster).filter(WelderMaster.tenant_id == tenant_id).order_by(WelderMaster.code.asc()).all()


@router.post("/welders", response_model=WelderOut)
def create_welder(
    payload: WelderIn,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
    _claims=Depends(require_role("tenant_admin", "platform_admin")),
):
    row = WelderMaster(tenant_id=tenant_id, code=payload.code.strip(), name=(payload.name or None))
    db.add(row)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Welder code already exists")
    db.refresh(row)
    audit(db, tenant_id=str(tenant_id), user_id=str(getattr(user, 'id', '') or ''), action="settings_welder_create", entity="welders_master", entity_id=str(row.id))
    return row


class WelderPatch(BaseModel):
    code: str | None = None
    name: str | None = None


@router.patch("/welders/{welder_id}", response_model=WelderOut)
def patch_welder(
    welder_id: UUID,
    payload: WelderPatch,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
    _claims=Depends(require_role("tenant_admin", "platform_admin")),
):
    row = db.query(WelderMaster).filter(WelderMaster.id == welder_id, WelderMaster.tenant_id == tenant_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    data = payload.model_dump(exclude_unset=True)
    if "code" in data and data["code"] is not None:
        data["code"] = data["code"].strip()
    for k, v in data.items():
        setattr(row, k, v)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Welder code already exists")
    db.refresh(row)
    audit(db, tenant_id=str(tenant_id), user_id=str(getattr(user, 'id', '') or ''), action="settings_welder_update", entity="welders_master", entity_id=str(row.id))
    return row


@router.delete("/welders/{welder_id}")
def delete_welder(
    welder_id: UUID,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
    _claims=Depends(require_role("tenant_admin", "platform_admin")),
):
    row = db.query(WelderMaster).filter(WelderMaster.id == welder_id, WelderMaster.tenant_id == tenant_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    linked = db.query(ProjectWelder).filter(ProjectWelder.tenant_id == tenant_id, ProjectWelder.ref_id == row.id).first()
    if linked:
        raise HTTPException(status_code=409, detail="Cannot delete: linked to project")
    db.delete(row)
    db.commit()
    audit(db, tenant_id=str(tenant_id), user_id=str(getattr(user, 'id', '') or ''), action="settings_welder_delete", entity="welders_master", entity_id=str(welder_id))
    return {"ok": True}
