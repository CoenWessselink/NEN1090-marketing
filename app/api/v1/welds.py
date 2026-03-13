from __future__ import annotations

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user, get_current_tenant_id
from app.db.models import Weld, Project
from app.schemas.welds import WeldCreate, WeldOut, WeldUpdate

router = APIRouter(prefix="/projects/{project_id}/welds", tags=["welds"])


def _get_project(db: Session, tenant_id, project_id: UUID) -> Project:
    p = db.query(Project).filter(Project.id == project_id, Project.tenant_id == tenant_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    return p


@router.get("", response_model=List[WeldOut])
def list_welds(
    project_id: UUID,
    db: Session = Depends(get_db),
    tenant_id = Depends(get_current_tenant_id),
    _user = Depends(get_current_user),
):
    _get_project(db, tenant_id, project_id)
    return (
        db.query(Weld)
        .filter(Weld.project_id == project_id, Weld.tenant_id == tenant_id)
        .order_by(Weld.created_at.desc())
        .all()
    )


@router.post("", response_model=WeldOut)
def create_weld(
    project_id: UUID,
    payload: WeldCreate,
    db: Session = Depends(get_db),
    tenant_id = Depends(get_current_tenant_id),
    _user = Depends(get_current_user),
):
    _get_project(db, tenant_id, project_id)
    w = Weld(tenant_id=tenant_id, project_id=project_id, **payload.model_dump())
    db.add(w)
    db.commit()
    db.refresh(w)
    return w


@router.patch("/{weld_id}", response_model=WeldOut)
def update_weld(
    project_id: UUID,
    weld_id: UUID,
    payload: WeldUpdate,
    db: Session = Depends(get_db),
    tenant_id = Depends(get_current_tenant_id),
    _user = Depends(get_current_user),
):
    _get_project(db, tenant_id, project_id)
    w = db.query(Weld).filter(Weld.id == weld_id, Weld.project_id == project_id, Weld.tenant_id == tenant_id).first()
    if not w:
        raise HTTPException(status_code=404, detail="Weld not found")
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(w, k, v)
    db.commit()
    db.refresh(w)
    return w


@router.delete("/{weld_id}")
def delete_weld(
    project_id: UUID,
    weld_id: UUID,
    db: Session = Depends(get_db),
    tenant_id = Depends(get_current_tenant_id),
    _user = Depends(get_current_user),
):
    _get_project(db, tenant_id, project_id)
    w = db.query(Weld).filter(Weld.id == weld_id, Weld.project_id == project_id, Weld.tenant_id == tenant_id).first()
    if not w:
        raise HTTPException(status_code=404, detail="Weld not found")
    db.delete(w)
    db.commit()
    return {"ok": True}
