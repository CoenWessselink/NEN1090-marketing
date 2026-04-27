from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class AssemblyBase(BaseModel):
    code: str = Field(..., max_length=50)
    name: str = Field(..., max_length=255)
    drawing_no: Optional[str] = Field(default=None, max_length=120)
    revision: Optional[str] = Field(default=None, max_length=40)
    status: str = Field(default="open", max_length=30)
    notes: Optional[str] = None


class AssemblyCreate(AssemblyBase):
    pass


class AssemblyUpdate(BaseModel):
    code: Optional[str] = Field(default=None, max_length=50)
    name: Optional[str] = Field(default=None, max_length=255)
    drawing_no: Optional[str] = Field(default=None, max_length=120)
    revision: Optional[str] = Field(default=None, max_length=40)
    status: Optional[str] = Field(default=None, max_length=30)
    notes: Optional[str] = None


class AssemblyOut(AssemblyBase):
    id: UUID
    project_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
