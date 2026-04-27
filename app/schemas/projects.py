from __future__ import annotations

from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class ProjectBase(BaseModel):
    # These fields map 1:1 to what the current Projecten UI already shows.
    # Keep names "backend-style" (code/name/...) and let the frontend map to its Dutch keys.
    code: Optional[str] = Field(default=None, max_length=50, description="Projectnummer (e.g. P-1001)")
    name: str = Field(..., max_length=255, description="Projectnaam")
    client_name: Optional[str] = Field(default=None, max_length=255, description="Opdrachtgever")
    execution_class: Optional[str] = Field(default=None, max_length=10, description="EXC1..EXC4")
    acceptance_class: Optional[str] = Field(default=None, max_length=10, description="A/B/C/D")
    locked: bool = Field(default=False)
    status: str = Field(default="in_controle", max_length=30)
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    code: Optional[str] = Field(default=None, max_length=50)
    name: Optional[str] = Field(default=None, max_length=255)
    client_name: Optional[str] = Field(default=None, max_length=255)
    execution_class: Optional[str] = Field(default=None, max_length=10)
    acceptance_class: Optional[str] = Field(default=None, max_length=10)
    locked: Optional[bool] = None
    status: Optional[str] = Field(default=None, max_length=30)
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class ProjectOut(ProjectBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
