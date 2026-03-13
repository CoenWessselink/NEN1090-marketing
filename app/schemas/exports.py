from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class ExportJobCreate(BaseModel):
    export_type: str = Field(default="ce_dossier", max_length=50)
    requested_by: Optional[str] = Field(default=None, max_length=120)


class ExportJobOut(BaseModel):
    id: UUID
    project_id: UUID
    export_type: str
    status: str
    requested_by: Optional[str] = None
    file_path: Optional[str] = None
    message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
