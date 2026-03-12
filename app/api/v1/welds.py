from __future__ import annotations

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_claims, get_current_user, get_current_tenant_id, get_db, require_tenant_write
from app.db.models import Assembly, Project, Weld
from app.schemas.welds import WeldCreate, WeldOut, WeldUpdate
from app.services.phase5_audit import log_phase5_event

router = APIRouter(prefix="/projects/{project_id}/welds", tags=["welds"])


def _get_project(db: Session, tenant_id, project_id: UUID) -> Project:
    p = db.query(Project).filter(Project.id == project_id, Project.tenant_id == tenant_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    return p


def _validate_assembly(db: Session, tenant_id, project_id: UUID, assembly_id: UUID | None) -> None:
    if not assembly_id:
        return
    assembly = db.query(Assembly).filter(Assembly.id == assembly_id, Assembly.project_id == project_id, Assembly.tenant_id == tenant_id).first()
    if not assembly:
        raise HTTPException(status_code=404, detail="Assembly not found")


def _get_weld(db: Session, tenant_id, project_id: UUID, weld_id: UUID) -> Weld:
    w = db.query(Weld).filter(Weld.id == weld_id, Weld.project_id == project_id, Weld.tenant_id == tenant_id).first()
    if not w:
        raise HTTPException(status_code=404, detail="Weld not found")
    return w


@router.get("", response_model=List[WeldOut])
def list_welds(project_id: UUID, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), _user=Depends(get_current_user)):
    _get_project(db, tenant_id, project_id)
    return db.query(Weld).filter(Weld.project_id == project_id, Weld.tenant_id == tenant_id).order_by(Weld.created_at.desc()).all()


@router.get("/{weld_id}", response_model=WeldOut)
def get_weld(project_id: UUID, weld_id: UUID, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), _user=Depends(get_current_user)):
    _get_project(db, tenant_id, project_id)
    return _get_weld(db, tenant_id, project_id, weld_id)


@router.post("", response_model=WeldOut)
def create_weld(project_id: UUID, payload: WeldCreate, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), user=Depends(get_current_user), _claims=Depends(get_current_claims), _write=Depends(require_tenant_write)):
    _get_project(db, tenant_id, project_id)
    data = payload.model_dump()
    _validate_assembly(db, tenant_id, project_id, data.get("assembly_id"))
    w = Weld(tenant_id=tenant_id, project_id=project_id, **data)
    db.add(w)
    db.commit()
    db.refresh(w)
    log_phase5_event(db, tenant_id=tenant_id, user_id=user.id, action="weld_created", entity="weld", entity_id=w.id, meta={"project_id": str(project_id), "assembly_id": str(w.assembly_id) if w.assembly_id else None, "weld_no": w.weld_no})
    return w


@router.patch("/{weld_id}", response_model=WeldOut)
def update_weld(project_id: UUID, weld_id: UUID, payload: WeldUpdate, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), user=Depends(get_current_user), _claims=Depends(get_current_claims), _write=Depends(require_tenant_write)):
    _get_project(db, tenant_id, project_id)
    w = _get_weld(db, tenant_id, project_id, weld_id)
    data = payload.model_dump(exclude_unset=True)
    _validate_assembly(db, tenant_id, project_id, data.get("assembly_id"))
    for k, v in data.items():
        setattr(w, k, v)
    db.commit()
    db.refresh(w)
    log_phase5_event(db, tenant_id=tenant_id, user_id=user.id, action="weld_updated", entity="weld", entity_id=w.id, meta={"project_id": str(project_id), "changed_fields": sorted(data.keys())})
    return w


@router.delete("/{weld_id}")
def delete_weld(project_id: UUID, weld_id: UUID, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), user=Depends(get_current_user), _claims=Depends(get_current_claims), _write=Depends(require_tenant_write)):
    _get_project(db, tenant_id, project_id)
    w = _get_weld(db, tenant_id, project_id, weld_id)
    db.delete(w)
    db.commit()
    log_phase5_event(db, tenant_id=tenant_id, user_id=user.id, action="weld_deleted", entity="weld", entity_id=weld_id, meta={"project_id": str(project_id)})
    return {"ok": True}
