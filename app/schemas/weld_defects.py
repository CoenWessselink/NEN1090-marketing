from __future__ import annotations

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class WeldDefectBase(BaseModel):
    defect_type: str = Field(..., max_length=80)
    description: Optional[str] = None
    assessment: str = Field(default="open")  # open/accepted/rejected/repaired
    iso5817_level_used: Optional[str] = None  # if omitted backend uses project/tenant derived
    evidence_attachment_ids: List[UUID] = Field(default_factory=list)


class WeldDefectCreate(WeldDefectBase):
    weld_id: UUID
    inspection_id: Optional[UUID] = None


class WeldDefectUpdate(BaseModel):
    defect_type: Optional[str] = Field(default=None, max_length=80)
    description: Optional[str] = None
    assessment: Optional[str] = None
    iso5817_level_used: Optional[str] = None
    evidence_attachment_ids: Optional[List[UUID]] = None


class WeldDefectOut(BaseModel):
    id: UUID
    tenant_id: UUID
    project_id: UUID
    weld_id: UUID
    inspection_id: Optional[UUID] = None

    iso5817_level_used: str
    defect_type: str
    description: Optional[str] = None
    assessment: str
    evidence_attachment_ids: List[UUID]

    created_by: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
