from __future__ import annotations

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_claims, get_current_tenant_id, get_current_user, get_db, require_tenant_write
from app.db.models import Assembly, Project
from app.schemas.assemblies import AssemblyCreate, AssemblyOut, AssemblyUpdate
from app.services.phase5_audit import log_phase5_event

router = APIRouter(prefix="/projects/{project_id}/assemblies", tags=["assemblies"])


def _get_project(db: Session, tenant_id, project_id: UUID) -> Project:
    project = db.query(Project).filter(Project.id == project_id, Project.tenant_id == tenant_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


def _get_assembly(db: Session, tenant_id, project_id: UUID, assembly_id: UUID) -> Assembly:
    assembly = db.query(Assembly).filter(Assembly.id == assembly_id, Assembly.project_id == project_id, Assembly.tenant_id == tenant_id).first()
    if not assembly:
        raise HTTPException(status_code=404, detail="Assembly not found")
    return assembly


@router.get("", response_model=List[AssemblyOut])
def list_assemblies(project_id: UUID, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), _user=Depends(get_current_user)):
    _get_project(db, tenant_id, project_id)
    return db.query(Assembly).filter(Assembly.project_id == project_id, Assembly.tenant_id == tenant_id).order_by(Assembly.created_at.desc()).all()


@router.get("/{assembly_id}", response_model=AssemblyOut)
def get_assembly(project_id: UUID, assembly_id: UUID, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), _user=Depends(get_current_user)):
    _get_project(db, tenant_id, project_id)
    return _get_assembly(db, tenant_id, project_id, assembly_id)


@router.post("", response_model=AssemblyOut)
def create_assembly(project_id: UUID, payload: AssemblyCreate, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), user=Depends(get_current_user), _claims=Depends(get_current_claims), _write=Depends(require_tenant_write)):
    _get_project(db, tenant_id, project_id)
    assembly = Assembly(project_id=project_id, tenant_id=tenant_id, **payload.model_dump())
    db.add(assembly)
    db.commit()
    db.refresh(assembly)
    log_phase5_event(db, tenant_id=tenant_id, user_id=user.id, action="assembly_created", entity="assembly", entity_id=assembly.id, meta={"project_id": str(project_id), "code": assembly.code})
    return assembly


@router.patch("/{assembly_id}", response_model=AssemblyOut)
def update_assembly(project_id: UUID, assembly_id: UUID, payload: AssemblyUpdate, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), user=Depends(get_current_user), _claims=Depends(get_current_claims), _write=Depends(require_tenant_write)):
    _get_project(db, tenant_id, project_id)
    assembly = _get_assembly(db, tenant_id, project_id, assembly_id)
    changes = payload.model_dump(exclude_unset=True)
    for key, value in changes.items():
        setattr(assembly, key, value)
    db.commit()
    db.refresh(assembly)
    log_phase5_event(db, tenant_id=tenant_id, user_id=user.id, action="assembly_updated", entity="assembly", entity_id=assembly.id, meta={"project_id": str(project_id), "changed_fields": sorted(changes.keys())})
    return assembly


@router.delete("/{assembly_id}")
def delete_assembly(project_id: UUID, assembly_id: UUID, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), user=Depends(get_current_user), _claims=Depends(get_current_claims), _write=Depends(require_tenant_write)):
    _get_project(db, tenant_id, project_id)
    assembly = _get_assembly(db, tenant_id, project_id, assembly_id)
    assembly_code = assembly.code
    db.delete(assembly)
    db.commit()
    log_phase5_event(db, tenant_id=tenant_id, user_id=user.id, action="assembly_deleted", entity="assembly", entity_id=assembly_id, meta={"project_id": str(project_id), "code": assembly_code})
    return {"ok": True}
