from __future__ import annotations

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class InspectionCheckBase(BaseModel):
    group_key: str = Field(default="pre", max_length=20)
    criterion_key: str = Field(..., max_length=120)
    applicable: bool = True
    approved: bool = False
    comment: Optional[str] = None


class InspectionCheckCreate(InspectionCheckBase):
    pass


class InspectionCheckOut(InspectionCheckBase):
    id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


class WeldInspectionBase(BaseModel):
    inspector: Optional[str] = Field(default=None, max_length=120)
    inspected_at: Optional[datetime] = None
    overall_status: str = Field(default="open", max_length=20)  # open|ok|nok|nvt
    remarks: Optional[str] = None


class WeldInspectionUpsert(WeldInspectionBase):
    checks: List[InspectionCheckCreate] = Field(default_factory=list)


class WeldInspectionOut(WeldInspectionBase):
    id: UUID
    project_id: UUID
    weld_id: UUID
    created_at: datetime
    updated_at: datetime
    checks: List[InspectionCheckOut] = Field(default_factory=list)

    class Config:
        from_attributes = True


class WeldInspectionGetResponse(BaseModel):
    exists: bool
    inspection: Optional[WeldInspectionOut] = None
