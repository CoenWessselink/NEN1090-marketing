from __future__ import annotations

import json
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_tenant_id, get_current_user, get_db
from app.core.audit import audit
from app.db.models import Project, Tenant, Weld, WeldDefect
from app.schemas.weld_defects import WeldDefectCreate, WeldDefectOut, WeldDefectUpdate

router = APIRouter(tags=["iso5817"])


def _get_project(db: Session, tenant_id, project_id: UUID) -> Project:
    p = db.query(Project).filter(Project.id == project_id, Project.tenant_id == tenant_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    return p


def _get_weld(db: Session, tenant_id, weld_id: UUID) -> Weld:
    w = db.query(Weld).filter(Weld.id == weld_id, Weld.tenant_id == tenant_id).first()
    if not w:
        raise HTTPException(status_code=404, detail="Weld not found")
    return w


def _defect_to_out(d: WeldDefect) -> dict:
    return {
        "id": d.id,
        "tenant_id": d.tenant_id,
        "project_id": d.project_id,
        "weld_id": d.weld_id,
        "inspection_id": d.inspection_id,
        "iso5817_level_used": d.iso5817_level_used,
        "defect_type": d.defect_type,
        "description": d.description,
        "assessment": d.assessment,
        "status": d.assessment,
        "severity": d.iso5817_level_used,
        "evidence_attachment_ids": [UUID(x) for x in json.loads(d.evidence_attachment_ids or "[]")],
        "created_by": d.created_by,
        "created_at": d.created_at,
        "updated_at": d.updated_at,
    }


def _derive_iso_level(db: Session, tenant_id, project: Project) -> str:
    if getattr(project, "iso5817_level", None):
        return project.iso5817_level
    t = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not t:
        return "C"
    return getattr(t, "iso5817_level", "C") or "C"


@router.get("/weld-defects")
def list_defects_global(
    project_id: UUID | None = Query(default=None),
    weld_id: UUID | None = Query(default=None),
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    _user=Depends(get_current_user),
):
    q = db.query(WeldDefect).filter(WeldDefect.tenant_id == tenant_id, WeldDefect.deleted_at.is_(None))
    if project_id:
        q = q.filter(WeldDefect.project_id == project_id)
    if weld_id:
        q = q.filter(WeldDefect.weld_id == weld_id)
    rows = q.order_by(WeldDefect.created_at.desc()).all()
    return {"items": [_defect_to_out(r) for r in rows], "total": len(rows)}


@router.get("/projects/{project_id}/weld-defects")
def list_defects_for_project(
    project_id: UUID,
    weld_id: UUID | None = None,
    inspection_id: UUID | None = None,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
):
    _get_project(db, tenant_id, project_id)
    q = db.query(WeldDefect).filter(WeldDefect.tenant_id == tenant_id, WeldDefect.project_id == project_id, WeldDefect.deleted_at.is_(None))
    if weld_id:
        q = q.filter(WeldDefect.weld_id == weld_id)
    if inspection_id:
        q = q.filter(WeldDefect.inspection_id == inspection_id)
    rows = q.order_by(WeldDefect.created_at.desc()).all()
    return {"items": [_defect_to_out(r) for r in rows], "total": len(rows)}


@router.get("/weld-defects/{defect_id}")
def get_defect(
    defect_id: UUID,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    _user=Depends(get_current_user),
):
    row = db.query(WeldDefect).filter(WeldDefect.id == defect_id, WeldDefect.tenant_id == tenant_id, WeldDefect.deleted_at.is_(None)).first()
    if not row:
        raise HTTPException(status_code=404, detail="Defect not found")
    return _defect_to_out(row)


@router.post("/projects/{project_id}/weld-defects", response_model=WeldDefectOut)
def create_defect(
    project_id: UUID,
    payload: WeldDefectCreate,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
):
    p = _get_project(db, tenant_id, project_id)
    w = _get_weld(db, tenant_id, payload.weld_id)
    if w.project_id != p.id:
        raise HTTPException(status_code=400, detail="Weld does not belong to project")
    iso = payload.iso5817_level_used or _derive_iso_level(db, tenant_id, p)
    evidence = json.dumps([str(x) for x in (payload.evidence_attachment_ids or [])])
    d = WeldDefect(tenant_id=tenant_id, project_id=p.id, weld_id=w.id, inspection_id=payload.inspection_id, iso5817_level_used=iso, defect_type=payload.defect_type, description=payload.description, assessment=payload.assessment or "open", evidence_attachment_ids=evidence, created_by=getattr(user, "id", None), created_at=datetime.utcnow(), updated_at=datetime.utcnow())
    db.add(d)
    db.commit()
    db.refresh(d)
    audit(db=db, tenant_id=tenant_id, user_id=getattr(user, "id", None), action="iso5817_defect_create", entity="weld_defect", entity_id=str(d.id), meta={"project_id": str(project_id), "weld_id": str(payload.weld_id), "iso": iso, "type": payload.defect_type})
    return _defect_to_out(d)


@router.post("/projects/{project_id}/welds/{weld_id}/defects")
def create_defect_alias(
    project_id: UUID,
    weld_id: UUID,
    payload: dict,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
):
    data = WeldDefectCreate(weld_id=weld_id, defect_type=str(payload.get("defect_type") or "Onbekend"), description=str(payload.get("notes") or "") or None, assessment=str(payload.get("status") or "open"), iso5817_level_used=str(payload.get("severity") or "C"))
    return _defect_to_out(create_defect(project_id, data, db, tenant_id, user))


@router.patch("/projects/{project_id}/weld-defects/{defect_id}", response_model=WeldDefectOut)
def patch_defect(
    project_id: UUID,
    defect_id: UUID,
    payload: WeldDefectUpdate,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
):
    _get_project(db, tenant_id, project_id)
    d = db.query(WeldDefect).filter(WeldDefect.id == defect_id, WeldDefect.tenant_id == tenant_id, WeldDefect.project_id == project_id, WeldDefect.deleted_at.is_(None)).first()
    if not d:
        raise HTTPException(status_code=404, detail="Defect not found")
    if payload.defect_type is not None:
        d.defect_type = payload.defect_type
    if payload.description is not None:
        d.description = payload.description
    if payload.assessment is not None:
        d.assessment = payload.assessment
    if payload.iso5817_level_used is not None:
        d.iso5817_level_used = payload.iso5817_level_used
    if payload.evidence_attachment_ids is not None:
        d.evidence_attachment_ids = json.dumps([str(x) for x in payload.evidence_attachment_ids])
    d.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(d)
    audit(db=db, tenant_id=tenant_id, user_id=getattr(user, "id", None), action="iso5817_defect_update", entity="weld_defect", entity_id=str(d.id), meta={"project_id": str(project_id)})
    return _defect_to_out(d)


@router.put("/weld-defects/{defect_id}")
def update_defect_alias(
    defect_id: UUID,
    payload: dict,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
):
    d = db.query(WeldDefect).filter(WeldDefect.id == defect_id, WeldDefect.tenant_id == tenant_id, WeldDefect.deleted_at.is_(None)).first()
    if not d:
        raise HTTPException(status_code=404, detail="Defect not found")
    patch = WeldDefectUpdate(defect_type=payload.get("defect_type"), description=payload.get("notes"), assessment=payload.get("status"), iso5817_level_used=payload.get("severity"))
    return _defect_to_out(patch_defect(d.project_id, defect_id, patch, db, tenant_id, user))


@router.post("/weld-defects/{defect_id}/resolve")
def resolve_defect(
    defect_id: UUID,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
):
    d = db.query(WeldDefect).filter(WeldDefect.id == defect_id, WeldDefect.tenant_id == tenant_id, WeldDefect.deleted_at.is_(None)).first()
    if not d:
        raise HTTPException(status_code=404, detail="Defect not found")
    d.assessment = "resolved"
    d.updated_at = datetime.utcnow()
    db.commit()
    audit(db=db, tenant_id=tenant_id, user_id=getattr(user, "id", None), action="iso5817_defect_resolve", entity="weld_defect", entity_id=str(d.id))
    return {"ok": True}


@router.post("/weld-defects/{defect_id}/reopen")
def reopen_defect(
    defect_id: UUID,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
):
    d = db.query(WeldDefect).filter(WeldDefect.id == defect_id, WeldDefect.tenant_id == tenant_id, WeldDefect.deleted_at.is_(None)).first()
    if not d:
        raise HTTPException(status_code=404, detail="Defect not found")
    d.assessment = "open"
    d.updated_at = datetime.utcnow()
    db.commit()
    audit(db=db, tenant_id=tenant_id, user_id=getattr(user, "id", None), action="iso5817_defect_reopen", entity="weld_defect", entity_id=str(d.id))
    return {"ok": True}


@router.delete("/projects/{project_id}/weld-defects/{defect_id}")
def delete_defect(
    project_id: UUID,
    defect_id: UUID,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
):
    _get_project(db, tenant_id, project_id)
    d = db.query(WeldDefect).filter(WeldDefect.id == defect_id, WeldDefect.tenant_id == tenant_id, WeldDefect.project_id == project_id, WeldDefect.deleted_at.is_(None)).first()
    if not d:
        raise HTTPException(status_code=404, detail="Defect not found")
    d.deleted_at = datetime.utcnow()
    d.updated_at = datetime.utcnow()
    db.commit()
    audit(db=db, tenant_id=tenant_id, user_id=getattr(user, "id", None), action="iso5817_defect_delete", entity="weld_defect", entity_id=str(d.id), meta={"project_id": str(project_id)})
    return {"ok": True}


@router.delete("/weld-defects/{defect_id}")
def delete_defect_alias(
    defect_id: UUID,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
):
    d = db.query(WeldDefect).filter(WeldDefect.id == defect_id, WeldDefect.tenant_id == tenant_id, WeldDefect.deleted_at.is_(None)).first()
    if not d:
        raise HTTPException(status_code=404, detail="Defect not found")
    return delete_defect(d.project_id, defect_id, db, tenant_id, user)
