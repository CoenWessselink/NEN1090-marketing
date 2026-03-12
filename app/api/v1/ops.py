from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.sql import func

from app.api.deps import get_db, require_platform_admin
from app.core.config import settings
from app.db.models import BackupManifest, ExportJob
from app.schemas.exports import ExportJobOut
from app.schemas.platform import BackupManifestOut, OpsMetricsOut
from app.services.backup_manifest import create_platform_backup_manifest
from app.services.export_worker import process_export_job_now

router = APIRouter(prefix='/ops', tags=['ops'])


@router.get('/metrics-lite', response_model=OpsMetricsOut)
def metrics_lite(db: Session = Depends(get_db), _claims=Depends(require_platform_admin)):
    return OpsMetricsOut(
        env=settings.ENV,
        rate_limit_enabled=settings.ENABLE_RATE_LIMIT,
        exports_running=int(db.query(func.count(ExportJob.id)).filter(ExportJob.status == 'running').scalar() or 0),
        exports_failed=int(db.query(func.count(ExportJob.id)).filter(ExportJob.status == 'failed').scalar() or 0),
        exports_completed_last_24h=int(db.query(func.count(ExportJob.id)).filter(ExportJob.completed_at >= datetime.now(timezone.utc) - timedelta(hours=24)).scalar() or 0),
        backup_manifests_total=int(db.query(func.count(BackupManifest.id)).scalar() or 0),
        db_configured=True,
    )


@router.post('/backups/manifest', response_model=BackupManifestOut)
def create_backup_manifest(db: Session = Depends(get_db), _claims=Depends(require_platform_admin)):
    row = create_platform_backup_manifest(db)
    return BackupManifestOut(
        id=str(row.id), tenant_id=str(row.tenant_id) if row.tenant_id else None, scope=row.scope,
        storage_path=row.storage_path, checksum=row.checksum, status=row.status, meta=row.meta, created_at=row.created_at,
    )


@router.get('/backups/manifest', response_model=list[BackupManifestOut])
def list_backup_manifests(db: Session = Depends(get_db), _claims=Depends(require_platform_admin)):
    rows = db.query(BackupManifest).order_by(BackupManifest.created_at.desc()).limit(50).all()
    return [BackupManifestOut(
        id=str(r.id), tenant_id=str(r.tenant_id) if r.tenant_id else None, scope=r.scope,
        storage_path=r.storage_path, checksum=r.checksum, status=r.status, meta=r.meta, created_at=r.created_at,
    ) for r in rows]


@router.post('/projects/{project_id}/exports/{export_id}/retry', response_model=ExportJobOut)
def retry_export(project_id: str, export_id: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db), _claims=Depends(require_platform_admin)):
    row = db.query(ExportJob).filter(ExportJob.id == export_id, ExportJob.project_id == project_id).first()
    if not row:
        raise HTTPException(status_code=404, detail='Export job not found')
    row.status = 'queued'
    row.message = 'Export retry queued from ops endpoint.'
    db.add(row)
    db.commit()
    db.refresh(row)
    if settings.EXPORT_SYNC_ENABLED:
        process_export_job_now(db, row.tenant_id, row.project_id, row.id, requested_by=row.requested_by)
        db.refresh(row)
        return row
    background_tasks.add_task(process_export_job_now, db, row.tenant_id, row.project_id, row.id, row.requested_by)
    return row
