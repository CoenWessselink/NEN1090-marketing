from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.sql import func
from .db import Base

class Project(Base):
    __tablename__ = "projects"
    id = Column(String, primary_key=True)
    project_number = Column(String, nullable=False, index=True)
    name = Column(String, nullable=False)
    client = Column(String, default="")
    exc = Column(String, default="EXC2")
    acceptance_class = Column(String, default="5817-B")
    status = Column(String, default="in_controle")
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class Assembly(Base):
    __tablename__ = "assemblies"
    id = Column(String, primary_key=True)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False)
    code = Column(String, nullable=False)
    name = Column(String, default="")
    drawing_no = Column(String, default="")
    revision = Column(String, default="")
    status = Column(String, default="open")
    notes = Column(Text, default="")

class Weld(Base):
    __tablename__ = "welds"
    id = Column(String, primary_key=True)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False)
    assembly_id = Column(String, ForeignKey("assemblies.id", ondelete="SET NULL"), nullable=True)
    weld_no = Column(String, nullable=False)
    location = Column(String, default="")
    process = Column(String, default="")
    material = Column(String, default="")
    thickness = Column(String, default="")
    welders = Column(String, default="")
    wps = Column(String, default="")
    vt_status = Column(String, default="open")
    ndo_status = Column(String, default="nvt")
    status = Column(String, default="open")
    photos = Column(Integer, default=0)
    last = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class Inspection(Base):
    __tablename__ = "inspections"
    id = Column(Integer, primary_key=True, autoincrement=True)
    weld_id = Column(String, ForeignKey("welds.id", ondelete="CASCADE"), index=True, nullable=False)
    checks = Column(JSON, nullable=False, default={})
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class Photo(Base):
    __tablename__ = "photos"
    id = Column(String, primary_key=True)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False)
    weld_id = Column(String, ForeignKey("welds.id", ondelete="SET NULL"), nullable=True)
    name = Column(String, nullable=False)
    mime = Column(String, default="")
    captured_at = Column(String, default="")
    has_data = Column(Boolean, default=False)
