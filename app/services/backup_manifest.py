from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models import BackupManifest, ExportJob, Tenant, TenantUsageSnapshot


def _sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode('utf-8')).hexdigest()


def create_platform_backup_manifest(db: Session, tenant_id: UUID | None = None) -> BackupManifest:
    base = Path(settings.BACKUP_MANIFEST_DIR)
    base.mkdir(parents=True, exist_ok=True)
    tenants_total = int(db.query(Tenant).count())
    exports_total = int(db.query(ExportJob).count())
    snapshots_total = int(db.query(TenantUsageSnapshot).count())
    payload = {
        'generated_at': datetime.now(timezone.utc).isoformat(),
        'tenant_id': str(tenant_id) if tenant_id else None,
        'tenants_total': tenants_total,
        'exports_total': exports_total,
        'usage_snapshots_total': snapshots_total,
    }
    stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    target = base / f'backup_manifest_{stamp}.json'
    body = json.dumps(payload, ensure_ascii=False, indent=2)
    target.write_text(body, encoding='utf-8')
    row = BackupManifest(
        tenant_id=tenant_id,
        scope='tenant' if tenant_id else 'platform',
        storage_path=str(target),
        checksum=_sha256_text(body),
        status='created',
        meta=body,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row
