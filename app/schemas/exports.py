from __future__ import annotations

from datetime import datetime
import json
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class ExportJobCreate(BaseModel):
    export_type: str = Field(default="ce_dossier", max_length=50)
    requested_by: Optional[str] = Field(default=None, max_length=120)
    bundle_type: str = Field(default="zip", max_length=30)


class ExportJobOut(BaseModel):
    id: UUID
    project_id: UUID
    export_type: str
    status: str
    requested_by: Optional[str] = None
    file_path: Optional[str] = None
    message: Optional[str] = None
    bundle_type: Optional[str] = None
    manifest_json: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    retry_count: int = 0
    error_code: Optional[str] = None
    error_detail: Optional[str] = None
    download_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    @property
    def manifest(self) -> dict[str, Any] | None:
        if not self.manifest_json:
            return None
        try:
            parsed = json.loads(self.manifest_json)
            return parsed if isinstance(parsed, dict) else None
        except Exception:
            return None

    class Config:
        from_attributes = True
