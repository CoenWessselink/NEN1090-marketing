from __future__ import annotations

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_tenant_id, get_current_user, get_db
from app.db.models import ExportJob, Project
from app.schemas.exports import ExportJobCreate, ExportJobOut

router = APIRouter(prefix="/projects/{project_id}/exports", tags=["exports"])


def _get_project(db: Session, tenant_id, project_id: UUID) -> Project:
    project = db.query(Project).filter(Project.id == project_id, Project.tenant_id == tenant_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.get("", response_model=List[ExportJobOut])
def list_exports(project_id: UUID, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), _user=Depends(get_current_user)):
    _get_project(db, tenant_id, project_id)
    return db.query(ExportJob).filter(ExportJob.project_id == project_id, ExportJob.tenant_id == tenant_id).order_by(ExportJob.created_at.desc()).all()


@router.post("", response_model=ExportJobOut)
def create_export(project_id: UUID, payload: ExportJobCreate, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), _user=Depends(get_current_user)):
    _get_project(db, tenant_id, project_id)
    row = ExportJob(project_id=project_id, tenant_id=tenant_id, export_type=payload.export_type, requested_by=payload.requested_by, status="queued", message="Phase 5 start: export job aangemaakt, pipeline volgt in fase 7.")
    db.add(row)
    db.commit()
    db.refresh(row)
    return row
