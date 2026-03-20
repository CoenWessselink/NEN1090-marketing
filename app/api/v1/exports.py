from __future__ import annotations

from pathlib import Path
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_tenant_id, get_current_user, get_db
from app.db.models import ExportJob, Project
from app.schemas.exports import ExportJobCreate, ExportJobOut
from app.services.export_worker import process_export_job_now

router = APIRouter(prefix="/projects/{project_id}/exports", tags=["exports"])


def _get_project(db: Session, tenant_id, project_id: UUID) -> Project:
    project = db.query(Project).filter(Project.id == project_id, Project.tenant_id == tenant_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


def _as_out(row: ExportJob, project_id: UUID) -> ExportJobOut:
    payload = ExportJobOut.model_validate(row)
    if row.status == 'completed' and row.file_path:
        payload.download_url = f"/api/v1/projects/{project_id}/exports/{row.id}/download"
    return payload


def _queue_and_run(project_id: UUID, export_type: str, bundle_type: str, requested_by: str | None, db: Session, tenant_id: UUID, current_user) -> ExportJobOut:
    _get_project(db, tenant_id, project_id)
    row = ExportJob(
        project_id=project_id,
        tenant_id=tenant_id,
        export_type=export_type,
        bundle_type=bundle_type,
        requested_by=requested_by or getattr(current_user, 'email', None),
        status="queued",
        message="Export aangevraagd.",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    process_export_job_now(db, tenant_id, project_id, row.id, requested_by=row.requested_by)
    db.refresh(row)
    return _as_out(row, project_id)


@router.get("", response_model=List[ExportJobOut])
def list_exports(project_id: UUID, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), _user=Depends(get_current_user)):
    _get_project(db, tenant_id, project_id)
    rows = db.query(ExportJob).filter(ExportJob.project_id == project_id, ExportJob.tenant_id == tenant_id).order_by(ExportJob.created_at.desc()).all()
    return [_as_out(row, project_id) for row in rows]


@router.post("", response_model=ExportJobOut)
def create_export(project_id: UUID, payload: ExportJobCreate, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), current_user=Depends(get_current_user)):
    return _queue_and_run(project_id, payload.export_type, payload.bundle_type, payload.requested_by, db, tenant_id, current_user)


@router.post('/ce-report', response_model=ExportJobOut)
def create_ce_report(project_id: UUID, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), current_user=Depends(get_current_user)):
    return _queue_and_run(project_id, 'ce_report', 'zip', getattr(current_user, 'email', None), db, tenant_id, current_user)


@router.post('/zip', response_model=ExportJobOut)
def create_zip_export(project_id: UUID, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), current_user=Depends(get_current_user)):
    return _queue_and_run(project_id, 'zip_export', 'zip', getattr(current_user, 'email', None), db, tenant_id, current_user)


@router.post('/pdf', response_model=ExportJobOut)
def create_pdf_export(project_id: UUID, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), current_user=Depends(get_current_user)):
    return _queue_and_run(project_id, 'pdf_export', 'pdf', getattr(current_user, 'email', None), db, tenant_id, current_user)


@router.post('/excel', response_model=ExportJobOut)
def create_excel_export(project_id: UUID, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), current_user=Depends(get_current_user)):
    return _queue_and_run(project_id, 'excel_export', 'excel', getattr(current_user, 'email', None), db, tenant_id, current_user)


@router.get('/{export_id}', response_model=ExportJobOut)
def get_export(project_id: UUID, export_id: UUID, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), _user=Depends(get_current_user)):
    _get_project(db, tenant_id, project_id)
    row = db.query(ExportJob).filter(ExportJob.id == export_id, ExportJob.project_id == project_id, ExportJob.tenant_id == tenant_id).first()
    if not row:
        raise HTTPException(status_code=404, detail='Export job not found')
    return _as_out(row, project_id)


@router.get('/{export_id}/download')
def download_export(project_id: UUID, export_id: UUID, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), _user=Depends(get_current_user)):
    _get_project(db, tenant_id, project_id)
    row = db.query(ExportJob).filter(ExportJob.id == export_id, ExportJob.project_id == project_id, ExportJob.tenant_id == tenant_id).first()
    if not row:
        raise HTTPException(status_code=404, detail='Export job not found')
    if row.status != 'completed' or not row.file_path:
        raise HTTPException(status_code=409, detail='Export job not completed')
    path = Path(row.file_path)
    if not path.exists() or not path.is_file():
        raise HTTPException(status_code=404, detail='Exportbestand niet gevonden')
    media_type = 'application/octet-stream'
    suffix = path.suffix.lower()
    if suffix == '.zip':
        media_type = 'application/zip'
    elif suffix == '.pdf':
        media_type = 'application/pdf'
    elif suffix in {'.xlsx', '.xls'}:
        media_type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    return FileResponse(path=path, media_type=media_type, filename=path.name)


@router.post('/{export_id}/retry', response_model=ExportJobOut)
def retry_export(project_id: UUID, export_id: UUID, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), current_user=Depends(get_current_user)):
    _get_project(db, tenant_id, project_id)
    row = db.query(ExportJob).filter(ExportJob.id == export_id, ExportJob.project_id == project_id, ExportJob.tenant_id == tenant_id).first()
    if not row:
        raise HTTPException(status_code=404, detail='Export job not found')
    if row.status == 'running':
        raise HTTPException(status_code=409, detail='Export job already running')
    row.status = 'queued'
    row.message = 'Export opnieuw aangevraagd.'
    row.error_code = None
    row.error_detail = None
    db.add(row)
    db.commit()
    db.refresh(row)
    process_export_job_now(db, tenant_id, project_id, row.id, requested_by=getattr(current_user, 'email', None) or row.requested_by)
    db.refresh(row)
    return _as_out(row, project_id)
