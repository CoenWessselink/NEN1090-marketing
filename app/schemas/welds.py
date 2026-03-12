from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class WeldBase(BaseModel):
    weld_no: str = Field(..., max_length=50)
    location: Optional[str] = Field(default=None, max_length=255)
    wps: Optional[str] = Field(default=None, max_length=100)

    # UI-aligned fields (Phase 3.2)
    process: Optional[str] = Field(default=None, max_length=20)
    material: Optional[str] = Field(default=None, max_length=80)
    thickness: Optional[str] = Field(default=None, max_length=30)
    welders: Optional[str] = Field(default=None, max_length=255)
    vt_status: Optional[str] = Field(default=None, max_length=30)
    ndo_status: Optional[str] = Field(default=None, max_length=30)
    photos: int = 0
    status: str = Field(default='open', max_length=30)

    result: str = Field(default="pending", max_length=20)  # pending|ok|nok
    inspector: Optional[str] = Field(default=None, max_length=120)
    inspected_at: Optional[datetime] = None
    notes: Optional[str] = None


class WeldCreate(WeldBase):
    assembly_id: Optional[UUID] = None



class WeldUpdate(BaseModel):
    assembly_id: Optional[UUID] = None
    weld_no: Optional[str] = Field(default=None, max_length=50)
    location: Optional[str] = Field(default=None, max_length=255)
    wps: Optional[str] = Field(default=None, max_length=100)

    # UI-aligned fields (Phase 3.2)
    process: Optional[str] = Field(default=None, max_length=20)
    material: Optional[str] = Field(default=None, max_length=80)
    thickness: Optional[str] = Field(default=None, max_length=30)
    welders: Optional[str] = Field(default=None, max_length=255)
    vt_status: Optional[str] = Field(default=None, max_length=30)
    ndo_status: Optional[str] = Field(default=None, max_length=30)
    photos: int = 0
    status: str = Field(default='open', max_length=30)
    result: Optional[str] = Field(default=None, max_length=20)
    inspector: Optional[str] = Field(default=None, max_length=120)
    inspected_at: Optional[datetime] = None
    notes: Optional[str] = None


class WeldOut(WeldBase):
    id: UUID
    project_id: UUID
    assembly_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
