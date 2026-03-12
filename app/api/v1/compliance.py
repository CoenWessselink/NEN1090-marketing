from __future__ import annotations

from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class MaterialRecordBase(BaseModel):
    heat_no: Optional[str] = Field(default=None, max_length=120)
    material_grade: str = Field(..., max_length=120)
    profile: Optional[str] = Field(default=None, max_length=120)
    dimensions: Optional[str] = Field(default=None, max_length=120)
    quantity: int = 1
    certificate_no: Optional[str] = Field(default=None, max_length=120)
    status: str = Field(default="available", max_length=30)
    notes: Optional[str] = None


class MaterialRecordCreate(MaterialRecordBase):
    assembly_id: Optional[UUID] = None


class MaterialRecordUpdate(BaseModel):
    assembly_id: Optional[UUID] = None
    heat_no: Optional[str] = Field(default=None, max_length=120)
    material_grade: Optional[str] = Field(default=None, max_length=120)
    profile: Optional[str] = Field(default=None, max_length=120)
    dimensions: Optional[str] = Field(default=None, max_length=120)
    quantity: Optional[int] = None
    certificate_no: Optional[str] = Field(default=None, max_length=120)
    status: Optional[str] = Field(default=None, max_length=30)
    notes: Optional[str] = None


class MaterialRecordOut(MaterialRecordBase):
    id: UUID
    project_id: UUID
    assembly_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class WelderProfileBase(BaseModel):
    employee_no: Optional[str] = Field(default=None, max_length=50)
    name: str = Field(..., max_length=200)
    process_scope: Optional[str] = Field(default=None, max_length=120)
    qualification: Optional[str] = Field(default=None, max_length=120)
    certificate_no: Optional[str] = Field(default=None, max_length=120)
    certificate_valid_until: Optional[date] = None
    is_active: bool = True
    notes: Optional[str] = None


class WelderProfileCreate(WelderProfileBase):
    pass


class WelderProfileUpdate(BaseModel):
    employee_no: Optional[str] = Field(default=None, max_length=50)
    name: Optional[str] = Field(default=None, max_length=200)
    process_scope: Optional[str] = Field(default=None, max_length=120)
    qualification: Optional[str] = Field(default=None, max_length=120)
    certificate_no: Optional[str] = Field(default=None, max_length=120)
    certificate_valid_until: Optional[date] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None


class WelderProfileOut(WelderProfileBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class WPSRecordBase(BaseModel):
    code: str = Field(..., max_length=120)
    title: str = Field(..., max_length=255)
    process: Optional[str] = Field(default=None, max_length=50)
    base_material: Optional[str] = Field(default=None, max_length=120)
    filler_material: Optional[str] = Field(default=None, max_length=120)
    thickness_range: Optional[str] = Field(default=None, max_length=120)
    revision: Optional[str] = Field(default=None, max_length=40)
    is_active: bool = True
    notes: Optional[str] = None


class WPSRecordCreate(WPSRecordBase):
    pass


class WPSRecordUpdate(BaseModel):
    code: Optional[str] = Field(default=None, max_length=120)
    title: Optional[str] = Field(default=None, max_length=255)
    process: Optional[str] = Field(default=None, max_length=50)
    base_material: Optional[str] = Field(default=None, max_length=120)
    filler_material: Optional[str] = Field(default=None, max_length=120)
    thickness_range: Optional[str] = Field(default=None, max_length=120)
    revision: Optional[str] = Field(default=None, max_length=40)
    is_active: Optional[bool] = None
    notes: Optional[str] = None


class WPSRecordOut(WPSRecordBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class WPQRRecordBase(BaseModel):
    code: str = Field(..., max_length=120)
    title: str = Field(..., max_length=255)
    process: Optional[str] = Field(default=None, max_length=50)
    test_standard: Optional[str] = Field(default=None, max_length=120)
    result: str = Field(default="approved", max_length=30)
    revision: Optional[str] = Field(default=None, max_length=40)
    notes: Optional[str] = None


class WPQRRecordCreate(WPQRRecordBase):
    pass


class WPQRRecordUpdate(BaseModel):
    code: Optional[str] = Field(default=None, max_length=120)
    title: Optional[str] = Field(default=None, max_length=255)
    process: Optional[str] = Field(default=None, max_length=50)
    test_standard: Optional[str] = Field(default=None, max_length=120)
    result: Optional[str] = Field(default=None, max_length=30)
    revision: Optional[str] = Field(default=None, max_length=40)
    notes: Optional[str] = None


class WPQRRecordOut(WPQRRecordBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class NDTRecordBase(BaseModel):
    assembly_id: Optional[UUID] = None
    weld_id: Optional[UUID] = None
    method: str = Field(..., max_length=30)
    inspection_date: Optional[date] = None
    result: str = Field(default="pending", max_length=30)
    report_no: Optional[str] = Field(default=None, max_length=120)
    inspector: Optional[str] = Field(default=None, max_length=120)
    notes: Optional[str] = None


class NDTRecordCreate(NDTRecordBase):
    pass


class NDTRecordUpdate(BaseModel):
    assembly_id: Optional[UUID] = None
    weld_id: Optional[UUID] = None
    method: Optional[str] = Field(default=None, max_length=30)
    inspection_date: Optional[date] = None
    result: Optional[str] = Field(default=None, max_length=30)
    report_no: Optional[str] = Field(default=None, max_length=120)
    inspector: Optional[str] = Field(default=None, max_length=120)
    notes: Optional[str] = None


class NDTRecordOut(NDTRecordBase):
    id: UUID
    project_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
