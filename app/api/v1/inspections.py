from __future__ import annotations

from datetime import datetime
import json
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user, get_current_tenant_id
from app.db.models import Weld, Project, WeldInspection, InspectionCheck, Attachment, InspectionPlanTemplate
from app.schemas.inspections import WeldInspectionGetResponse, WeldInspectionOut, WeldInspectionUpsert

router = APIRouter(tags=["inspections"])


def _get_weld(db: Session, tenant_id, weld_id: UUID) -> Weld:
    w = db.query(Weld).filter(Weld.id == weld_id, Weld.tenant_id == tenant_id).first()
    if not w:
        raise HTTPException(status_code=404, detail="Weld not found")
    return w


def _ensure_project(db: Session, tenant_id, project_id: UUID) -> Project:
    p = db.query(Project).filter(Project.id == project_id, Project.tenant_id == tenant_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    return p


@router.get("/welds/{weld_id}/inspection", response_model=WeldInspectionGetResponse)
def get_inspection_for_weld(
    weld_id: UUID,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    _user=Depends(get_current_user),
):
    w = _get_weld(db, tenant_id, weld_id)
    insp = (
        db.query(WeldInspection)
        .filter(WeldInspection.tenant_id == tenant_id, WeldInspection.weld_id == weld_id)
        .first()
    )
    if not insp:
        return {"exists": False, "inspection": None}
    # ensure checks are loaded
    _ = insp.checks
    return {"exists": True, "inspection": insp}


@router.post("/welds/{weld_id}/inspection", response_model=WeldInspectionOut)
def create_inspection_for_weld(
    weld_id: UUID,
    payload: WeldInspectionUpsert,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    _user=Depends(get_current_user),
):
    w = _get_weld(db, tenant_id, weld_id)
    p = _ensure_project(db, tenant_id, w.project_id)
    if p.locked:
        raise HTTPException(status_code=423, detail="Project locked")

    exists = (
        db.query(WeldInspection)
        .filter(WeldInspection.tenant_id == tenant_id, WeldInspection.weld_id == weld_id)
        .first()
    )
    if exists:
        raise HTTPException(status_code=409, detail="Inspection already exists")

    insp = WeldInspection(
        tenant_id=tenant_id,
        project_id=w.project_id,
        weld_id=weld_id,
        inspector=payload.inspector,
        inspected_at=payload.inspected_at or datetime.utcnow(),
        overall_status=payload.overall_status or "open",
        remarks=payload.remarks,
    )
    db.add(insp)
    db.flush()  # get insp.id

    for c in payload.checks:
        db.add(
            InspectionCheck(
                tenant_id=tenant_id,
                inspection_id=insp.id,
                group_key=c.group_key,
                criterion_key=c.criterion_key,
                applicable=c.applicable,
                approved=c.approved,
                comment=c.comment,
            )
        )

    db.commit()
    db.refresh(insp)
    _ = insp.checks
    return insp


@router.put("/welds/{weld_id}/inspection", response_model=WeldInspectionOut)
def upsert_inspection_for_weld(
    weld_id: UUID,
    payload: WeldInspectionUpsert,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    _user=Depends(get_current_user),
):
    w = _get_weld(db, tenant_id, weld_id)
    p = _ensure_project(db, tenant_id, w.project_id)
    if p.locked:
        raise HTTPException(status_code=423, detail="Project locked")

    insp = (
        db.query(WeldInspection)
        .filter(WeldInspection.tenant_id == tenant_id, WeldInspection.weld_id == weld_id)
        .first()
    )
    if not insp:
        # create
        insp = WeldInspection(
            tenant_id=tenant_id,
            project_id=w.project_id,
            weld_id=weld_id,
            inspector=payload.inspector,
            inspected_at=payload.inspected_at or datetime.utcnow(),
            overall_status=payload.overall_status or "open",
            remarks=payload.remarks,
        )
        db.add(insp)
        db.flush()
    else:
        # update
        insp.inspector = payload.inspector
        insp.inspected_at = payload.inspected_at or insp.inspected_at or datetime.utcnow()
        insp.overall_status = payload.overall_status or insp.overall_status
        insp.remarks = payload.remarks
        # replace checks (simplest deterministic behavior)
        db.query(InspectionCheck).filter(
            InspectionCheck.tenant_id == tenant_id, InspectionCheck.inspection_id == insp.id
        ).delete(synchronize_session=False)

    for c in payload.checks:
        db.add(
            InspectionCheck(
                tenant_id=tenant_id,
                inspection_id=insp.id,
                group_key=c.group_key,
                criterion_key=c.criterion_key,
                applicable=c.applicable,
                approved=c.approved,
                comment=c.comment,
            )
        )

    db.commit()
    db.refresh(insp)
    _ = insp.checks
    return insp


@router.put("/inspections/{inspection_id}", response_model=WeldInspectionOut)
def update_inspection_by_id(
    inspection_id: UUID,
    payload: WeldInspectionUpsert,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    _user=Depends(get_current_user),
):
    insp = (
        db.query(WeldInspection)
        .filter(WeldInspection.id == inspection_id, WeldInspection.tenant_id == tenant_id)
        .first()
    )
    if not insp:
        raise HTTPException(status_code=404, detail="Inspection not found")
    p = _ensure_project(db, tenant_id, insp.project_id)
    if p.locked:
        raise HTTPException(status_code=423, detail="Project locked")

    insp.inspector = payload.inspector
    insp.inspected_at = payload.inspected_at or insp.inspected_at or datetime.utcnow()
    insp.overall_status = payload.overall_status or insp.overall_status
    insp.remarks = payload.remarks

    db.query(InspectionCheck).filter(
        InspectionCheck.tenant_id == tenant_id, InspectionCheck.inspection_id == insp.id
    ).delete(synchronize_session=False)
    for c in payload.checks:
        db.add(
            InspectionCheck(
                tenant_id=tenant_id,
                inspection_id=insp.id,
                group_key=c.group_key,
                criterion_key=c.criterion_key,
                applicable=c.applicable,
                approved=c.approved,
                comment=c.comment,
            )
        )
    db.commit()
    db.refresh(insp)
    _ = insp.checks
    return insp


from pydantic import BaseModel, Field

class ResetToNormBody(BaseModel):
    exc_class: str = Field(default="EXC2", pattern=r"^EXC[1-4]$")
    acceptance_level: str = Field(default="C", pattern=r"^[BCD]$")

def _default_template_items():
    # Keys must match frontend store.js criterion IDs (criterion_key).
    return [
        # pre
        {"group_key":"pre", "key":"pre-01"}, {"group_key":"pre", "key":"pre-02"}, {"group_key":"pre", "key":"pre-03"}, {"group_key":"pre", "key":"pre-04"},
        # mat
        {"group_key":"mat", "key":"mat-01"}, {"group_key":"mat", "key":"mat-02"}, {"group_key":"mat", "key":"mat-03"}, {"group_key":"mat", "key":"mat-04"},
        # weld (ISO5817 summary)
        {"group_key":"weld", "key":"weld-iso-01"}, {"group_key":"weld", "key":"weld-iso-02"}, {"group_key":"weld", "key":"weld-iso-03"}, {"group_key":"weld", "key":"weld-iso-04"},
        # ndt
        {"group_key":"ndt", "key":"ndt-01", "applicable": True},
        {"group_key":"ndt", "key":"ndt-02", "applicable": False},
        {"group_key":"ndt", "key":"ndt-03", "applicable": False},
        {"group_key":"ndt", "key":"ndt-04", "applicable": False},
        # doc
        {"group_key":"doc", "key":"doc-01"}, {"group_key":"doc", "key":"doc-02"}, {"group_key":"doc", "key":"doc-03"}, {"group_key":"doc", "key":"doc-04"},
    ]

def _get_default_template_items(db: Session, tenant_id, exc_class: str):
    t = (
        db.query(InspectionPlanTemplate)
        .filter(
            InspectionPlanTemplate.tenant_id == tenant_id,
            InspectionPlanTemplate.exc_class == exc_class,
            InspectionPlanTemplate.is_default.is_(True),
        )
        .order_by(InspectionPlanTemplate.version.desc())
        .first()
    )
    if t:
        try:
            items = json.loads(t.items_json or "[]")
            if isinstance(items, list) and items:
                return items
        except Exception:
            pass
    return _default_template_items()

@router.post("/welds/{weld_id}/inspection/reset-to-norm", response_model=WeldInspectionOut)
def reset_to_norm_for_weld(
    weld_id: UUID,
    body: ResetToNormBody,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
):
    """Hard reset: rebuild checklist checks from default template, and wipe comments + evidence.

    Evidence wipe: soft-delete attachments with scope_type='inspection_check' where scope_id == removed InspectionCheck.id.
    """
    w = _get_weld(db, tenant_id, weld_id)
    p = _ensure_project(db, tenant_id, w.project_id)
    if p.locked:
        raise HTTPException(status_code=423, detail="Project locked")

    # Ensure inspection exists
    insp = (
        db.query(WeldInspection)
        .filter(WeldInspection.tenant_id == tenant_id, WeldInspection.weld_id == weld_id)
        .first()
    )
    if not insp:
        insp = WeldInspection(
            tenant_id=tenant_id,
            project_id=w.project_id,
            weld_id=weld_id,
            inspector=getattr(user, "email", None),
            inspected_at=datetime.utcnow(),
            overall_status="open",
            remarks=None,
        )
        db.add(insp)
        db.flush()
    else:
        insp.overall_status = "open"
        insp.remarks = None
        insp.inspected_at = insp.inspected_at or datetime.utcnow()

    # Collect existing checks (for evidence wipe)
    old_checks = (
        db.query(InspectionCheck)
        .filter(InspectionCheck.tenant_id == tenant_id, InspectionCheck.inspection_id == insp.id)
        .all()
    )
    old_ids = [c.id for c in old_checks]

    if old_ids:
        db.query(Attachment).filter(
            Attachment.tenant_id == tenant_id,
            Attachment.scope_type == "inspection_check",
            Attachment.scope_id.in_(old_ids),
            Attachment.deleted_at.is_(None),
        ).update({"deleted_at": datetime.utcnow()}, synchronize_session=False)

    # Delete checks
    db.query(InspectionCheck).filter(
        InspectionCheck.tenant_id == tenant_id, InspectionCheck.inspection_id == insp.id
    ).delete(synchronize_session=False)

    # Recreate from default template
    items = _get_default_template_items(db, tenant_id, body.exc_class)
    created = set()
    for it in items or []:
        g = (it.get("groep") or it.get("group") or it.get("group_key") or "pre")
        k = (it.get("key") or it.get("criterion_key") or "").strip()
        if not k:
            continue
        if k in created:
            continue
        created.add(k)
        applicable = it.get("applicable")
        if applicable is None:
            applicable = True
        db.add(
            InspectionCheck(
                tenant_id=tenant_id,
                inspection_id=insp.id,
                group_key=str(g),
                criterion_key=str(k),
                applicable=bool(applicable),
                approved=False,
                comment=None,
            )
        )

    db.commit()
    db.refresh(insp)
    _ = insp.checks
    return insp
