from __future__ import annotations

from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class ExportJobCreate(BaseModel):
    export_type: str = Field(default="ce_dossier", max_length=50)
    requested_by: Optional[str] = Field(default=None, max_length=120)


class ExportJobUpdate(BaseModel):
    status: Optional[str] = Field(default=None, max_length=30)
    file_path: Optional[str] = Field(default=None, max_length=500)
    message: Optional[str] = None
    manifest_json: Optional[str] = None
    completed_at: Optional[datetime] = None


class ExportJobOut(BaseModel):
    id: UUID
    project_id: UUID
    export_type: str
    bundle_type: Optional[str] = None
    status: str
    requested_by: Optional[str] = None
    file_path: Optional[str] = None
    message: Optional[str] = None
    manifest_json: Optional[str] = None
    completed_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    retry_count: int = 0
    error_code: Optional[str] = None
    error_detail: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True



class CeDossierPreviewOut(BaseModel):
    generated_at: datetime
    project: dict[str, Any]
    summary: dict[str, Any]
    completeness: list[dict[str, Any]]
    ready_for_export: bool


class CeDossierExportRequest(BaseModel):
    bundle_type: str = Field(default='zip', max_length=30)
