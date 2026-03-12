
from __future__ import annotations

from pathlib import Path
from typing import List
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_claims, get_current_tenant_id, get_current_user, get_db, require_tenant_write
from app.core.config import settings
from app.db.models import ExportJob, Project
from app.schemas.exports import CeDossierExportRequest, ExportJobCreate, ExportJobOut, ExportJobUpdate
from app.services.ce_dossier_service import build_preview, generate_export_bundle
from app.services.export_worker import process_export_job_now
from app.services.phase5_audit import log_phase5_event

router = APIRouter(prefix="/projects/{project_id}", tags=["exports"])


def _get_project(db: Session, tenant_id, project_id: UUID) -> Project:
    project = db.query(Project).filter(Project.id == project_id, Project.tenant_id == tenant_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


def _get_export_job(db: Session, tenant_id, project_id: UUID, export_id: UUID) -> ExportJob:
    row = db.query(ExportJob).filter(ExportJob.id == export_id, ExportJob.project_id == project_id, ExportJob.tenant_id == tenant_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Export job not found")
    return row


@router.get('/ce-dossier/preview')
def get_ce_dossier_preview(project_id: UUID, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), _user=Depends(get_current_user)):
    _get_project(db, tenant_id, project_id)
    return build_preview(db, tenant_id, project_id)



@router.post('/ce-dossier/export', response_model=ExportJobOut)
def export_ce_dossier(project_id: UUID, payload: CeDossierExportRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), user=Depends(get_current_user), _claims=Depends(get_current_claims), _write=Depends(require_tenant_write)):
    _get_project(db, tenant_id, project_id)
    if settings.EXPORT_SYNC_ENABLED:
        return generate_export_bundle(db, tenant_id, project_id, user_id=user.id, requested_by=user.email, bundle_type=payload.bundle_type or 'zip')
    row = ExportJob(project_id=project_id, tenant_id=tenant_id, export_type='ce_dossier', bundle_type=payload.bundle_type or 'zip', requested_by=user.email, status='queued', message='CE-dossier export staat in wachtrij.')
    db.add(row)
    db.commit()
    db.refresh(row)
    background_tasks.add_task(process_export_job_now, db, tenant_id, project_id, row.id, user.email)
    log_phase5_event(db, tenant_id=tenant_id, user_id=user.id, action='export_job_queued', entity='export_job', entity_id=row.id, meta={'project_id': str(project_id), 'export_type': row.export_type})
    return row


@router.get('/exports', response_model=List[ExportJobOut])
def list_exports(project_id: UUID, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), _user=Depends(get_current_user)):
    _get_project(db, tenant_id, project_id)
    return db.query(ExportJob).filter(ExportJob.project_id == project_id, ExportJob.tenant_id == tenant_id).order_by(ExportJob.created_at.desc()).all()


@router.get('/exports/{export_id}', response_model=ExportJobOut)
def get_export(project_id: UUID, export_id: UUID, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), _user=Depends(get_current_user)):
    _get_project(db, tenant_id, project_id)
    return _get_export_job(db, tenant_id, project_id, export_id)


@router.get('/exports/{export_id}/download')
def download_export(project_id: UUID, export_id: UUID, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), _user=Depends(get_current_user)):
    _get_project(db, tenant_id, project_id)
    row = _get_export_job(db, tenant_id, project_id, export_id)
    if not row.file_path:
        raise HTTPException(status_code=409, detail='Export has no file yet')
    target = Path(row.file_path)
    if not target.exists() or not target.is_file():
        raise HTTPException(status_code=404, detail='Export file not found on disk')
    return FileResponse(path=target, filename=target.name, media_type='application/zip')


@router.post('/exports', response_model=ExportJobOut)
def create_export(project_id: UUID, payload: ExportJobCreate, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), user=Depends(get_current_user), _claims=Depends(get_current_claims), _write=Depends(require_tenant_write)):
    _get_project(db, tenant_id, project_id)
    requested_by = payload.requested_by or user.email
    row = ExportJob(project_id=project_id, tenant_id=tenant_id, export_type=payload.export_type, requested_by=requested_by, status='queued', message='Handmatige exportjob aangemaakt.')
    db.add(row)
    db.commit()
    db.refresh(row)
    log_phase5_event(db, tenant_id=tenant_id, user_id=user.id, action='export_job_created', entity='export_job', entity_id=row.id, meta={'project_id': str(project_id), 'export_type': row.export_type})
    return row


@router.patch('/exports/{export_id}', response_model=ExportJobOut)
def update_export(project_id: UUID, export_id: UUID, payload: ExportJobUpdate, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), user=Depends(get_current_user), _claims=Depends(get_current_claims), _write=Depends(require_tenant_write)):
    _get_project(db, tenant_id, project_id)
    row = _get_export_job(db, tenant_id, project_id, export_id)
    changes = payload.model_dump(exclude_unset=True)
    for key, value in changes.items():
        setattr(row, key, value)
    db.commit()
    db.refresh(row)
    log_phase5_event(db, tenant_id=tenant_id, user_id=user.id, action='export_job_updated', entity='export_job', entity_id=row.id, meta={'project_id': str(project_id), 'changed_fields': sorted(changes.keys())})
    return row




@router.post('/exports/{export_id}/retry', response_model=ExportJobOut)
def retry_export(project_id: UUID, export_id: UUID, background_tasks: BackgroundTasks, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), user=Depends(get_current_user), _claims=Depends(get_current_claims), _write=Depends(require_tenant_write)):
    _get_project(db, tenant_id, project_id)
    row = _get_export_job(db, tenant_id, project_id, export_id)
    row.status = 'queued'
    row.message = 'Export retry queued.'
    row.error_code = None
    row.error_detail = None
    db.add(row)
    db.commit()
    db.refresh(row)
    if settings.EXPORT_SYNC_ENABLED:
        return process_export_job_now(db, tenant_id, project_id, row.id, requested_by=user.email)
    background_tasks.add_task(process_export_job_now, db, tenant_id, project_id, row.id, user.email)
    return row

@router.delete('/exports/{export_id}')
def delete_export(project_id: UUID, export_id: UUID, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), user=Depends(get_current_user), _claims=Depends(get_current_claims), _write=Depends(require_tenant_write)):
    _get_project(db, tenant_id, project_id)
    row = _get_export_job(db, tenant_id, project_id, export_id)
    db.delete(row)
    db.commit()
    log_phase5_event(db, tenant_id=tenant_id, user_id=user.id, action='export_job_deleted', entity='export_job', entity_id=export_id, meta={'project_id': str(project_id)})
    return {'ok': True}
