from __future__ import annotations

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_claims, get_current_tenant_id, get_current_user, get_db, require_tenant_write
from app.db.models import Assembly, MaterialRecord, NDTRecord, Project, WPSRecord, WPQRRecord, WelderProfile, Weld
from app.schemas.compliance import (
    MaterialRecordCreate, MaterialRecordOut, MaterialRecordUpdate,
    NDTRecordCreate, NDTRecordOut, NDTRecordUpdate,
    WelderProfileCreate, WelderProfileOut, WelderProfileUpdate,
    WPSRecordCreate, WPSRecordOut, WPSRecordUpdate,
    WPQRRecordCreate, WPQRRecordOut, WPQRRecordUpdate,
)
from app.services.phase5_audit import log_phase5_event

router = APIRouter(tags=["compliance"])


def _get_project(db: Session, tenant_id, project_id: UUID) -> Project:
    project = db.query(Project).filter(Project.id == project_id, Project.tenant_id == tenant_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


def _validate_links(db: Session, tenant_id, project_id: UUID, assembly_id: UUID | None = None, weld_id: UUID | None = None) -> None:
    if assembly_id:
        assembly = db.query(Assembly).filter(Assembly.id == assembly_id, Assembly.project_id == project_id, Assembly.tenant_id == tenant_id).first()
        if not assembly:
            raise HTTPException(status_code=404, detail="Assembly not found")
    if weld_id:
        weld = db.query(Weld).filter(Weld.id == weld_id, Weld.project_id == project_id, Weld.tenant_id == tenant_id).first()
        if not weld:
            raise HTTPException(status_code=404, detail="Weld not found")


def _get_row(db: Session, model, tenant_id, row_id: UUID, detail: str):
    row = db.query(model).filter(model.id == row_id, model.tenant_id == tenant_id).first()
    if not row:
        raise HTTPException(status_code=404, detail=detail)
    return row


@router.get("/projects/{project_id}/materials", response_model=List[MaterialRecordOut])
def list_materials(project_id: UUID, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), _user=Depends(get_current_user)):
    _get_project(db, tenant_id, project_id)
    return db.query(MaterialRecord).filter(MaterialRecord.project_id == project_id, MaterialRecord.tenant_id == tenant_id).order_by(MaterialRecord.created_at.desc()).all()


@router.post("/projects/{project_id}/materials", response_model=MaterialRecordOut)
def create_material(project_id: UUID, payload: MaterialRecordCreate, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), user=Depends(get_current_user), _claims=Depends(get_current_claims), _write=Depends(require_tenant_write)):
    _get_project(db, tenant_id, project_id)
    _validate_links(db, tenant_id, project_id, assembly_id=payload.assembly_id)
    row = MaterialRecord(project_id=project_id, tenant_id=tenant_id, **payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    log_phase5_event(db, tenant_id=tenant_id, user_id=user.id, action="material_created", entity="material_record", entity_id=row.id, meta={"project_id": str(project_id), "assembly_id": str(row.assembly_id) if row.assembly_id else None})
    return row


@router.get("/projects/{project_id}/materials/{material_id}", response_model=MaterialRecordOut)
def get_material(project_id: UUID, material_id: UUID, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), _user=Depends(get_current_user)):
    _get_project(db, tenant_id, project_id)
    row = _get_row(db, MaterialRecord, tenant_id, material_id, "Material record not found")
    if row.project_id != project_id:
        raise HTTPException(status_code=404, detail="Material record not found")
    return row


@router.patch("/projects/{project_id}/materials/{material_id}", response_model=MaterialRecordOut)
def update_material(project_id: UUID, material_id: UUID, payload: MaterialRecordUpdate, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), user=Depends(get_current_user), _claims=Depends(get_current_claims), _write=Depends(require_tenant_write)):
    _get_project(db, tenant_id, project_id)
    row = _get_row(db, MaterialRecord, tenant_id, material_id, "Material record not found")
    if row.project_id != project_id:
        raise HTTPException(status_code=404, detail="Material record not found")
    changes = payload.model_dump(exclude_unset=True)
    _validate_links(db, tenant_id, project_id, assembly_id=changes.get("assembly_id"))
    for key, value in changes.items():
        setattr(row, key, value)
    db.commit()
    db.refresh(row)
    log_phase5_event(db, tenant_id=tenant_id, user_id=user.id, action="material_updated", entity="material_record", entity_id=row.id, meta={"project_id": str(project_id), "changed_fields": sorted(changes.keys())})
    return row


@router.delete("/projects/{project_id}/materials/{material_id}")
def delete_material(project_id: UUID, material_id: UUID, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), user=Depends(get_current_user), _claims=Depends(get_current_claims), _write=Depends(require_tenant_write)):
    _get_project(db, tenant_id, project_id)
    row = _get_row(db, MaterialRecord, tenant_id, material_id, "Material record not found")
    if row.project_id != project_id:
        raise HTTPException(status_code=404, detail="Material record not found")
    db.delete(row)
    db.commit()
    log_phase5_event(db, tenant_id=tenant_id, user_id=user.id, action="material_deleted", entity="material_record", entity_id=material_id, meta={"project_id": str(project_id)})
    return {"ok": True}


@router.get("/projects/{project_id}/ndt", response_model=List[NDTRecordOut])
def list_ndt(project_id: UUID, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), _user=Depends(get_current_user)):
    _get_project(db, tenant_id, project_id)
    return db.query(NDTRecord).filter(NDTRecord.project_id == project_id, NDTRecord.tenant_id == tenant_id).order_by(NDTRecord.created_at.desc()).all()


@router.post("/projects/{project_id}/ndt", response_model=NDTRecordOut)
def create_ndt(project_id: UUID, payload: NDTRecordCreate, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), user=Depends(get_current_user), _claims=Depends(get_current_claims), _write=Depends(require_tenant_write)):
    _get_project(db, tenant_id, project_id)
    _validate_links(db, tenant_id, project_id, assembly_id=payload.assembly_id, weld_id=payload.weld_id)
    row = NDTRecord(project_id=project_id, tenant_id=tenant_id, **payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    log_phase5_event(db, tenant_id=tenant_id, user_id=user.id, action="ndt_created", entity="ndt_record", entity_id=row.id, meta={"project_id": str(project_id), "weld_id": str(row.weld_id) if row.weld_id else None})
    return row


@router.get("/projects/{project_id}/ndt/{ndt_id}", response_model=NDTRecordOut)
def get_ndt(project_id: UUID, ndt_id: UUID, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), _user=Depends(get_current_user)):
    _get_project(db, tenant_id, project_id)
    row = _get_row(db, NDTRecord, tenant_id, ndt_id, "NDT record not found")
    if row.project_id != project_id:
        raise HTTPException(status_code=404, detail="NDT record not found")
    return row


@router.patch("/projects/{project_id}/ndt/{ndt_id}", response_model=NDTRecordOut)
def update_ndt(project_id: UUID, ndt_id: UUID, payload: NDTRecordUpdate, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), user=Depends(get_current_user), _claims=Depends(get_current_claims), _write=Depends(require_tenant_write)):
    _get_project(db, tenant_id, project_id)
    row = _get_row(db, NDTRecord, tenant_id, ndt_id, "NDT record not found")
    if row.project_id != project_id:
        raise HTTPException(status_code=404, detail="NDT record not found")
    changes = payload.model_dump(exclude_unset=True)
    _validate_links(db, tenant_id, project_id, assembly_id=changes.get("assembly_id"), weld_id=changes.get("weld_id"))
    for key, value in changes.items():
        setattr(row, key, value)
    db.commit()
    db.refresh(row)
    log_phase5_event(db, tenant_id=tenant_id, user_id=user.id, action="ndt_updated", entity="ndt_record", entity_id=row.id, meta={"project_id": str(project_id), "changed_fields": sorted(changes.keys())})
    return row


@router.delete("/projects/{project_id}/ndt/{ndt_id}")
def delete_ndt(project_id: UUID, ndt_id: UUID, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), user=Depends(get_current_user), _claims=Depends(get_current_claims), _write=Depends(require_tenant_write)):
    _get_project(db, tenant_id, project_id)
    row = _get_row(db, NDTRecord, tenant_id, ndt_id, "NDT record not found")
    if row.project_id != project_id:
        raise HTTPException(status_code=404, detail="NDT record not found")
    db.delete(row)
    db.commit()
    log_phase5_event(db, tenant_id=tenant_id, user_id=user.id, action="ndt_deleted", entity="ndt_record", entity_id=ndt_id, meta={"project_id": str(project_id)})
    return {"ok": True}


@router.get("/welders", response_model=List[WelderProfileOut])
def list_welders(db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), _user=Depends(get_current_user)):
    return db.query(WelderProfile).filter(WelderProfile.tenant_id == tenant_id).order_by(WelderProfile.name.asc()).all()


@router.post("/welders", response_model=WelderProfileOut)
def create_welder(payload: WelderProfileCreate, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), user=Depends(get_current_user), _claims=Depends(get_current_claims), _write=Depends(require_tenant_write)):
    row = WelderProfile(tenant_id=tenant_id, **payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    log_phase5_event(db, tenant_id=tenant_id, user_id=user.id, action="welder_created", entity="welder_profile", entity_id=row.id, meta={"name": row.name})
    return row


@router.get("/welders/{welder_id}", response_model=WelderProfileOut)
def get_welder(welder_id: UUID, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), _user=Depends(get_current_user)):
    return _get_row(db, WelderProfile, tenant_id, welder_id, "Welder not found")


@router.patch("/welders/{welder_id}", response_model=WelderProfileOut)
def update_welder(welder_id: UUID, payload: WelderProfileUpdate, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), user=Depends(get_current_user), _claims=Depends(get_current_claims), _write=Depends(require_tenant_write)):
    row = _get_row(db, WelderProfile, tenant_id, welder_id, "Welder not found")
    changes = payload.model_dump(exclude_unset=True)
    for key, value in changes.items():
        setattr(row, key, value)
    db.commit()
    db.refresh(row)
    log_phase5_event(db, tenant_id=tenant_id, user_id=user.id, action="welder_updated", entity="welder_profile", entity_id=row.id, meta={"changed_fields": sorted(changes.keys())})
    return row


@router.delete("/welders/{welder_id}")
def delete_welder(welder_id: UUID, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), user=Depends(get_current_user), _claims=Depends(get_current_claims), _write=Depends(require_tenant_write)):
    row = _get_row(db, WelderProfile, tenant_id, welder_id, "Welder not found")
    db.delete(row)
    db.commit()
    log_phase5_event(db, tenant_id=tenant_id, user_id=user.id, action="welder_deleted", entity="welder_profile", entity_id=welder_id)
    return {"ok": True}


@router.get("/wps", response_model=List[WPSRecordOut])
def list_wps(db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), _user=Depends(get_current_user)):
    return db.query(WPSRecord).filter(WPSRecord.tenant_id == tenant_id).order_by(WPSRecord.code.asc()).all()


@router.post("/wps", response_model=WPSRecordOut)
def create_wps(payload: WPSRecordCreate, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), user=Depends(get_current_user), _claims=Depends(get_current_claims), _write=Depends(require_tenant_write)):
    row = WPSRecord(tenant_id=tenant_id, **payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    log_phase5_event(db, tenant_id=tenant_id, user_id=user.id, action="wps_created", entity="wps_record", entity_id=row.id, meta={"code": row.code})
    return row


@router.get("/wps/{wps_id}", response_model=WPSRecordOut)
def get_wps(wps_id: UUID, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), _user=Depends(get_current_user)):
    return _get_row(db, WPSRecord, tenant_id, wps_id, "WPS not found")


@router.patch("/wps/{wps_id}", response_model=WPSRecordOut)
def update_wps(wps_id: UUID, payload: WPSRecordUpdate, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), user=Depends(get_current_user), _claims=Depends(get_current_claims), _write=Depends(require_tenant_write)):
    row = _get_row(db, WPSRecord, tenant_id, wps_id, "WPS not found")
    changes = payload.model_dump(exclude_unset=True)
    for key, value in changes.items():
        setattr(row, key, value)
    db.commit()
    db.refresh(row)
    log_phase5_event(db, tenant_id=tenant_id, user_id=user.id, action="wps_updated", entity="wps_record", entity_id=row.id, meta={"changed_fields": sorted(changes.keys())})
    return row


@router.delete("/wps/{wps_id}")
def delete_wps(wps_id: UUID, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), user=Depends(get_current_user), _claims=Depends(get_current_claims), _write=Depends(require_tenant_write)):
    row = _get_row(db, WPSRecord, tenant_id, wps_id, "WPS not found")
    db.delete(row)
    db.commit()
    log_phase5_event(db, tenant_id=tenant_id, user_id=user.id, action="wps_deleted", entity="wps_record", entity_id=wps_id)
    return {"ok": True}


@router.get("/wpqr", response_model=List[WPQRRecordOut])
def list_wpqr(db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), _user=Depends(get_current_user)):
    return db.query(WPQRRecord).filter(WPQRRecord.tenant_id == tenant_id).order_by(WPQRRecord.code.asc()).all()


@router.post("/wpqr", response_model=WPQRRecordOut)
def create_wpqr(payload: WPQRRecordCreate, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), user=Depends(get_current_user), _claims=Depends(get_current_claims), _write=Depends(require_tenant_write)):
    row = WPQRRecord(tenant_id=tenant_id, **payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    log_phase5_event(db, tenant_id=tenant_id, user_id=user.id, action="wpqr_created", entity="wpqr_record", entity_id=row.id, meta={"code": row.code})
    return row


@router.get("/wpqr/{wpqr_id}", response_model=WPQRRecordOut)
def get_wpqr(wpqr_id: UUID, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), _user=Depends(get_current_user)):
    return _get_row(db, WPQRRecord, tenant_id, wpqr_id, "WPQR not found")


@router.patch("/wpqr/{wpqr_id}", response_model=WPQRRecordOut)
def update_wpqr(wpqr_id: UUID, payload: WPQRRecordUpdate, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), user=Depends(get_current_user), _claims=Depends(get_current_claims), _write=Depends(require_tenant_write)):
    row = _get_row(db, WPQRRecord, tenant_id, wpqr_id, "WPQR not found")
    changes = payload.model_dump(exclude_unset=True)
    for key, value in changes.items():
        setattr(row, key, value)
    db.commit()
    db.refresh(row)
    log_phase5_event(db, tenant_id=tenant_id, user_id=user.id, action="wpqr_updated", entity="wpqr_record", entity_id=row.id, meta={"changed_fields": sorted(changes.keys())})
    return row


@router.delete("/wpqr/{wpqr_id}")
def delete_wpqr(wpqr_id: UUID, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), user=Depends(get_current_user), _claims=Depends(get_current_claims), _write=Depends(require_tenant_write)):
    row = _get_row(db, WPQRRecord, tenant_id, wpqr_id, "WPQR not found")
    db.delete(row)
    db.commit()
    log_phase5_event(db, tenant_id=tenant_id, user_id=user.id, action="wpqr_deleted", entity="wpqr_record", entity_id=wpqr_id)
    return {"ok": True}
