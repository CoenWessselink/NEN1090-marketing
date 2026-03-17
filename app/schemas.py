from typing import Any
from pydantic import BaseModel, Field

class ProjectIn(BaseModel):
    id: str
    nummer: str | None = None
    project_number: str | None = None
    naam: str | None = None
    name: str | None = None
    opdrachtgever: str | None = None
    client: str | None = None
    exc: str = "EXC2"
    acceptatieklasse: str | None = None
    acceptance_class: str | None = None
    status: str = "in_controle"

class AssemblyIn(BaseModel):
    id: str
    projectId: str | None = None
    project_id: str | None = None
    code: str
    name: str = ""
    drawingNo: str | None = None
    drawing_no: str | None = None
    revision: str = ""
    status: str = "open"
    notes: str = ""

class WeldIn(BaseModel):
    id: str
    projectId: str | None = None
    project_id: str | None = None
    assemblyId: str | None = None
    assembly_id: str | None = None
    weldNo: str | None = None
    weld_no: str | None = None
    locatie: str | None = None
    location: str | None = None
    proces: str | None = None
    process: str | None = None
    materiaal: str | None = None
    material: str | None = None
    dikte: str | None = None
    thickness: str | None = None
    lassers: str | None = None
    welders: str | None = None
    wps: str | None = None
    vtStatus: str | None = None
    vt_status: str | None = None
    ndoStatus: str | None = None
    ndo_status: str | None = None
    status: str = "open"
    fotos: int | None = 0
    photos: int | None = 0

class InspectionIn(BaseModel):
    weld_id: str
    checks: dict[str, Any] = Field(default_factory=dict)

class PhotoIn(BaseModel):
    id: str
    project_id: str
    weld_id: str | None = None
    name: str
    mime: str = ""
    captured_at: str = ""
    has_data: bool = False

class ImportBundle(BaseModel):
    project: ProjectIn
    assemblies: list[AssemblyIn] = Field(default_factory=list)
    welds: list[WeldIn] = Field(default_factory=list)
    inspections: list[InspectionIn] = Field(default_factory=list)
    photos: list[PhotoIn] = Field(default_factory=list)
