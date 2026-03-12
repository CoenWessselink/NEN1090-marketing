from __future__ import annotations

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class WeldDefectBase(BaseModel):
    defect_type: str = Field(..., max_length=80)
    defect_code: Optional[str] = Field(default=None, max_length=40)
    defect_group: Optional[str] = Field(default=None, max_length=80)
    location_zone: Optional[str] = Field(default=None, max_length=80)
    severity: str = Field(default="major")
    measured_size_mm: Optional[float] = None
    permitted_size_mm: Optional[float] = None
    description: Optional[str] = None
    assessment: str = Field(default="open")  # open/accepted/rejected/repaired
    repair_required: bool = False
    repair_state: str = Field(default="not_required")
    iso5817_level_used: Optional[str] = None  # if omitted backend uses project/tenant derived
    evidence_attachment_ids: List[UUID] = Field(default_factory=list)


class WeldDefectCreate(WeldDefectBase):
    weld_id: UUID
    inspection_id: Optional[UUID] = None


class WeldDefectUpdate(BaseModel):
    defect_type: Optional[str] = Field(default=None, max_length=80)
    defect_code: Optional[str] = Field(default=None, max_length=40)
    defect_group: Optional[str] = Field(default=None, max_length=80)
    location_zone: Optional[str] = Field(default=None, max_length=80)
    severity: Optional[str] = None
    measured_size_mm: Optional[float] = None
    permitted_size_mm: Optional[float] = None
    description: Optional[str] = None
    assessment: Optional[str] = None
    repair_required: Optional[bool] = None
    repair_state: Optional[str] = None
    iso5817_level_used: Optional[str] = None
    evidence_attachment_ids: Optional[List[UUID]] = None


class WeldDefectOut(BaseModel):
    id: UUID
    tenant_id: UUID
    project_id: UUID
    weld_id: UUID
    inspection_id: Optional[UUID] = None

    iso5817_level_used: str
    defect_code: Optional[str] = None
    defect_type: str
    defect_group: Optional[str] = None
    location_zone: Optional[str] = None
    severity: str
    measured_size_mm: Optional[float] = None
    permitted_size_mm: Optional[float] = None
    description: Optional[str] = None
    assessment: str
    repair_required: bool
    repair_state: str
    evidence_attachment_ids: List[UUID]

    created_by: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ISO5817ReferenceDefectOut(BaseModel):
    id: UUID
    code: str
    title: str
    defect_group: str
    description: Optional[str] = None
    default_severity: str
    is_active: bool

    class Config:
        from_attributes = True


class WeldInspectionResultUpsert(BaseModel):
    iso5817_level: str = Field(default="C", max_length=2)
    acceptance_level: str = Field(default="C", max_length=2)
    quality_status: str = Field(default="pending", max_length=30)
    visual_result: str = Field(default="open", max_length=20)
    reinspection_required: bool = False
    approved_by: Optional[str] = Field(default=None, max_length=120)
    approved_at: Optional[datetime] = None
    summary: Optional[str] = None
    notes: Optional[str] = None


class WeldInspectionResultOut(WeldInspectionResultUpsert):
    id: UUID
    tenant_id: UUID
    project_id: UUID
    weld_id: UUID
    inspection_id: UUID
    defect_count: int
    open_defect_count: int
    repair_required_count: int
    accepted_defect_count: int
    rejected_defect_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ISO5817EvaluationOut(BaseModel):
    weld_id: UUID
    inspection_id: UUID
    iso5817_level: str
    acceptance_level: str
    quality_status: str
    defect_count: int
    open_defect_count: int
    repair_required_count: int
    accepted_defect_count: int
    rejected_defect_count: int
    reinspection_required: bool
    summary: str
