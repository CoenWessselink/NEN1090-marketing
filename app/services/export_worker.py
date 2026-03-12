from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.orm import Session

from app.db.models import ExportJob
from app.services.ce_dossier_service import generate_export_bundle


def process_export_job_now(db: Session, tenant_id: UUID, project_id: UUID, export_id: UUID, *, requested_by: str | None = None):
    row = db.query(ExportJob).filter(ExportJob.id == export_id, ExportJob.tenant_id == tenant_id, ExportJob.project_id == project_id).first()
    if not row:
        raise ValueError('Export job not found')
    row.status = 'running'
    row.started_at = datetime.now(timezone.utc)
    row.error_code = None
    row.error_detail = None
    db.add(row)
    db.commit()
    db.refresh(row)
    try:
        generated = generate_export_bundle(db, tenant_id, project_id, user_id=None, requested_by=requested_by or row.requested_by, bundle_type=row.bundle_type or 'zip')
        if generated.id != row.id:
            row.file_path = generated.file_path
            row.message = generated.message
            row.manifest_json = generated.manifest_json
            row.status = generated.status
            row.completed_at = generated.completed_at
            row.bundle_type = generated.bundle_type
            db.add(row)
            db.commit()
            db.refresh(row)
        return row
    except Exception as exc:
        row.status = 'failed'
        row.retry_count = int(row.retry_count or 0) + 1
        row.error_code = 'EXPORT_BUILD_FAILED'
        row.error_detail = str(exc)[:4000]
        db.add(row)
        db.commit()
        db.refresh(row)
        raise
