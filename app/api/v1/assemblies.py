from __future__ import annotations

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_tenant_id, get_current_user, get_db
from app.db.models import Assembly, Project
from app.schemas.assemblies import AssemblyCreate, AssemblyOut, AssemblyUpdate

router = APIRouter(prefix="/projects/{project_id}/assemblies", tags=["assemblies"])


def _get_project(db: Session, tenant_id, project_id: UUID) -> Project:
    project = db.query(Project).filter(Project.id == project_id, Project.tenant_id == tenant_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.get("", response_model=List[AssemblyOut])
def list_assemblies(project_id: UUID, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), _user=Depends(get_current_user)):
    _get_project(db, tenant_id, project_id)
    return db.query(Assembly).filter(Assembly.project_id == project_id, Assembly.tenant_id == tenant_id).order_by(Assembly.created_at.desc()).all()


@router.post("", response_model=AssemblyOut)
def create_assembly(project_id: UUID, payload: AssemblyCreate, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), _user=Depends(get_current_user)):
    _get_project(db, tenant_id, project_id)
    assembly = Assembly(project_id=project_id, tenant_id=tenant_id, **payload.model_dump())
    db.add(assembly)
    db.commit()
    db.refresh(assembly)
    return assembly


@router.patch("/{assembly_id}", response_model=AssemblyOut)
def update_assembly(project_id: UUID, assembly_id: UUID, payload: AssemblyUpdate, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), _user=Depends(get_current_user)):
    _get_project(db, tenant_id, project_id)
    assembly = db.query(Assembly).filter(Assembly.id == assembly_id, Assembly.project_id == project_id, Assembly.tenant_id == tenant_id).first()
    if not assembly:
        raise HTTPException(status_code=404, detail="Assembly not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(assembly, key, value)
    db.commit()
    db.refresh(assembly)
    return assembly


@router.delete("/{assembly_id}")
def delete_assembly(project_id: UUID, assembly_id: UUID, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), _user=Depends(get_current_user)):
    _get_project(db, tenant_id, project_id)
    assembly = db.query(Assembly).filter(Assembly.id == assembly_id, Assembly.project_id == project_id, Assembly.tenant_id == tenant_id).first()
    if not assembly:
        raise HTTPException(status_code=404, detail="Assembly not found")
    db.delete(assembly)
    db.commit()
    return {"ok": True}
