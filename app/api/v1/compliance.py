from __future__ import annotations

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_tenant_id, get_current_user, get_db
from app.db.models import MaterialRecord, NDTRecord, Project, WPSRecord, WPQRRecord, WelderProfile
from app.schemas.compliance import (
    MaterialRecordCreate, MaterialRecordOut,
    NDTRecordCreate, NDTRecordOut,
    WelderProfileCreate, WelderProfileOut,
    WPSRecordCreate, WPSRecordOut,
    WPQRRecordCreate, WPQRRecordOut,
)

router = APIRouter(tags=["compliance"])


def _get_project(db: Session, tenant_id, project_id: UUID) -> Project:
    project = db.query(Project).filter(Project.id == project_id, Project.tenant_id == tenant_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.get("/projects/{project_id}/materials", response_model=List[MaterialRecordOut])
def list_materials(project_id: UUID, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), _user=Depends(get_current_user)):
    _get_project(db, tenant_id, project_id)
    return db.query(MaterialRecord).filter(MaterialRecord.project_id == project_id, MaterialRecord.tenant_id == tenant_id).order_by(MaterialRecord.created_at.desc()).all()


@router.post("/projects/{project_id}/materials", response_model=MaterialRecordOut)
def create_material(project_id: UUID, payload: MaterialRecordCreate, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), _user=Depends(get_current_user)):
    _get_project(db, tenant_id, project_id)
    row = MaterialRecord(project_id=project_id, tenant_id=tenant_id, **payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.get("/projects/{project_id}/ndt", response_model=List[NDTRecordOut])
def list_ndt(project_id: UUID, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), _user=Depends(get_current_user)):
    _get_project(db, tenant_id, project_id)
    return db.query(NDTRecord).filter(NDTRecord.project_id == project_id, NDTRecord.tenant_id == tenant_id).order_by(NDTRecord.created_at.desc()).all()


@router.post("/projects/{project_id}/ndt", response_model=NDTRecordOut)
def create_ndt(project_id: UUID, payload: NDTRecordCreate, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), _user=Depends(get_current_user)):
    _get_project(db, tenant_id, project_id)
    row = NDTRecord(project_id=project_id, tenant_id=tenant_id, **payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.get("/welders", response_model=List[WelderProfileOut])
def list_welders(db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), _user=Depends(get_current_user)):
    return db.query(WelderProfile).filter(WelderProfile.tenant_id == tenant_id).order_by(WelderProfile.name.asc()).all()


@router.post("/welders", response_model=WelderProfileOut)
def create_welder(payload: WelderProfileCreate, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), _user=Depends(get_current_user)):
    row = WelderProfile(tenant_id=tenant_id, **payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.get("/wps", response_model=List[WPSRecordOut])
def list_wps(db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), _user=Depends(get_current_user)):
    return db.query(WPSRecord).filter(WPSRecord.tenant_id == tenant_id).order_by(WPSRecord.code.asc()).all()


@router.post("/wps", response_model=WPSRecordOut)
def create_wps(payload: WPSRecordCreate, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), _user=Depends(get_current_user)):
    row = WPSRecord(tenant_id=tenant_id, **payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.get("/wpqr", response_model=List[WPQRRecordOut])
def list_wpqr(db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), _user=Depends(get_current_user)):
    return db.query(WPQRRecord).filter(WPQRRecord.tenant_id == tenant_id).order_by(WPQRRecord.code.asc()).all()


@router.post("/wpqr", response_model=WPQRRecordOut)
def create_wpqr(payload: WPQRRecordCreate, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), _user=Depends(get_current_user)):
    row = WPQRRecord(tenant_id=tenant_id, **payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row
