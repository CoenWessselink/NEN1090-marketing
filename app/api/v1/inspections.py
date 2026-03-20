from __future__ import annotations

from datetime import datetime
import json
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user, get_current_tenant_id
from app.core.audit import audit
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


def _inspection_row_to_card(row: WeldInspection) -> dict:
    return {
        "id": row.id,
        "project_id": row.project_id,
        "weld_id": row.weld_id,
        "status": row.overall_status,
        "result": row.overall_status,
        "due_date": row.inspected_at.isoformat() if row.inspected_at else None,
        "inspector": row.inspector,
        "remarks": row.remarks,
    }


@router.get("/inspections")
def list_inspections(
    project_id: UUID | None = Query(default=None),
    search: str | None = Query(default=None),
    status: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=25, ge=1, le=250),
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    _user=Depends(get_current_user),
):
    q = db.query(WeldInspection).filter(WeldInspection.tenant_id == tenant_id)
    if project_id:
        q = q.filter(WeldInspection.project_id == project_id)
    if status:
        q = q.filter(WeldInspection.overall_status == status)
    if search:
        token = f"%{search.strip()}%"
        q = q.filter((WeldInspection.inspector.ilike(token)) | (WeldInspection.remarks.ilike(token)))
    total = q.count()
    rows = q.order_by(WeldInspection.updated_at.desc(), WeldInspection.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
    return {"items": [_inspection_row_to_card(row) for row in rows], "total": total, "page": page, "limit": limit}


@router.get("/projects/{project_id}/inspections")
def list_project_inspections(
    project_id: UUID,
    search: str | None = Query(default=None),
    status: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=25, ge=1, le=250),
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    _user=Depends(get_current_user),
):
    _ensure_project(db, tenant_id, project_id)
    return list_inspections(project_id, search, status, page, limit, db, tenant_id, _user)


@router.get("/inspections/{inspection_id}")
def get_inspection_by_id(
    inspection_id: UUID,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    _user=Depends(get_current_user),
):
    row = db.query(WeldInspection).filter(WeldInspection.id == inspection_id, WeldInspection.tenant_id == tenant_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Inspection not found")
    return _inspection_row_to_card(row)


@router.get("/welds/{weld_id}/inspection", response_model=WeldInspectionGetResponse)
def get_inspection_for_weld(
    weld_id: UUID,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    _user=Depends(get_current_user),
):
    _get_weld(db, tenant_id, weld_id)
    insp = db.query(WeldInspection).filter(WeldInspection.tenant_id == tenant_id, WeldInspection.weld_id == weld_id).first()
    if not insp:
        return {"exists": False, "inspection": None}
    _ = insp.checks
    return {"exists": True, "inspection": insp}


@router.post("/welds/{weld_id}/inspection", response_model=WeldInspectionOut)
def create_inspection_for_weld(
    weld_id: UUID,
    payload: WeldInspectionUpsert,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
):
    w = _get_weld(db, tenant_id, weld_id)
    p = _ensure_project(db, tenant_id, w.project_id)
    if p.locked:
        raise HTTPException(status_code=423, detail="Project locked")
    exists = db.query(WeldInspection).filter(WeldInspection.tenant_id == tenant_id, WeldInspection.weld_id == weld_id).first()
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
    db.flush()
    for c in payload.checks:
        db.add(InspectionCheck(tenant_id=tenant_id, inspection_id=insp.id, group_key=c.group_key, criterion_key=c.criterion_key, applicable=c.applicable, approved=c.approved, comment=c.comment))
    db.commit()
    db.refresh(insp)
    _ = insp.checks
    audit(db, tenant_id=str(tenant_id), user_id=str(getattr(user, "id", "") or ""), action="inspection_create", entity="inspection", entity_id=str(insp.id), meta={"project_id": str(w.project_id), "weld_id": str(weld_id)})
    return insp


@router.post("/projects/{project_id}/welds/{weld_id}/inspections")
def create_inspection_project_alias(
    project_id: UUID,
    weld_id: UUID,
    payload: dict,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
):
    w = _get_weld(db, tenant_id, weld_id)
    if w.project_id != project_id:
        raise HTTPException(status_code=400, detail="Weld does not belong to project")
    data = WeldInspectionUpsert(
        inspector=getattr(user, "email", None),
        inspected_at=datetime.utcnow(),
        overall_status=str(payload.get("result") or payload.get("status") or "open"),
        remarks=str(payload.get("notes") or "") or None,
        checks=[],
    )
    result = create_inspection_for_weld(weld_id, data, db, tenant_id, user)
    return _inspection_row_to_card(result)


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
    insp = db.query(WeldInspection).filter(WeldInspection.tenant_id == tenant_id, WeldInspection.weld_id == weld_id).first()
    if not insp:
        insp = WeldInspection(tenant_id=tenant_id, project_id=w.project_id, weld_id=weld_id, inspector=payload.inspector, inspected_at=payload.inspected_at or datetime.utcnow(), overall_status=payload.overall_status or "open", remarks=payload.remarks)
        db.add(insp)
        db.flush()
    else:
        insp.inspector = payload.inspector
        insp.inspected_at = payload.inspected_at or insp.inspected_at or datetime.utcnow()
        insp.overall_status = payload.overall_status or insp.overall_status
        insp.remarks = payload.remarks
        db.query(InspectionCheck).filter(InspectionCheck.tenant_id == tenant_id, InspectionCheck.inspection_id == insp.id).delete(synchronize_session=False)
    for c in payload.checks:
        db.add(InspectionCheck(tenant_id=tenant_id, inspection_id=insp.id, group_key=c.group_key, criterion_key=c.criterion_key, applicable=c.applicable, approved=c.approved, comment=c.comment))
    db.commit()
    db.refresh(insp)
    _ = insp.checks
    return insp


@router.put("/inspections/{inspection_id}")
def update_inspection_by_id(
    inspection_id: UUID,
    payload: dict,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
):
    insp = db.query(WeldInspection).filter(WeldInspection.id == inspection_id, WeldInspection.tenant_id == tenant_id).first()
    if not insp:
        raise HTTPException(status_code=404, detail="Inspection not found")
    p = _ensure_project(db, tenant_id, insp.project_id)
    if p.locked:
        raise HTTPException(status_code=423, detail="Project locked")
    insp.inspector = getattr(user, "email", None) or insp.inspector
    insp.inspected_at = datetime.utcnow()
    insp.overall_status = str(payload.get("result") or payload.get("status") or insp.overall_status)
    insp.remarks = str(payload.get("notes") or payload.get("remarks") or "") or None
    db.commit()
    db.refresh(insp)
    audit(db, tenant_id=str(tenant_id), user_id=str(getattr(user, "id", "") or ""), action="inspection_update", entity="inspection", entity_id=str(inspection_id), meta={"project_id": str(insp.project_id)})
    return _inspection_row_to_card(insp)


@router.delete("/inspections/{inspection_id}")
def delete_inspection(
    inspection_id: UUID,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
):
    insp = db.query(WeldInspection).filter(WeldInspection.id == inspection_id, WeldInspection.tenant_id == tenant_id).first()
    if not insp:
        raise HTTPException(status_code=404, detail="Inspection not found")
    db.query(InspectionCheck).filter(InspectionCheck.tenant_id == tenant_id, InspectionCheck.inspection_id == insp.id).delete(synchronize_session=False)
    db.delete(insp)
    db.commit()
    audit(db, tenant_id=str(tenant_id), user_id=str(getattr(user, "id", "") or ""), action="inspection_delete", entity="inspection", entity_id=str(inspection_id))
    return {"ok": True}


@router.get("/inspections/{inspection_id}/results")
def inspection_results(
    inspection_id: UUID,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    _user=Depends(get_current_user),
):
    insp = db.query(WeldInspection).filter(WeldInspection.id == inspection_id, WeldInspection.tenant_id == tenant_id).first()
    if not insp:
        raise HTTPException(status_code=404, detail="Inspection not found")
    checks = db.query(InspectionCheck).filter(InspectionCheck.tenant_id == tenant_id, InspectionCheck.inspection_id == inspection_id).order_by(InspectionCheck.created_at.asc()).all()
    return {"inspection_id": str(inspection_id), "status": insp.overall_status, "remarks": insp.remarks, "checks": [{"id": str(item.id), "group_key": item.group_key, "criterion_key": item.criterion_key, "approved": item.approved, "comment": item.comment} for item in checks]}


@router.post("/inspections/{inspection_id}/results")
def create_inspection_result(
    inspection_id: UUID,
    payload: dict,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
):
    insp = db.query(WeldInspection).filter(WeldInspection.id == inspection_id, WeldInspection.tenant_id == tenant_id).first()
    if not insp:
        raise HTTPException(status_code=404, detail="Inspection not found")
    insp.overall_status = str(payload.get("result") or payload.get("status") or insp.overall_status)
    insp.remarks = str(payload.get("notes") or payload.get("remarks") or "") or None
    db.commit()
    audit(db, tenant_id=str(tenant_id), user_id=str(getattr(user, "id", "") or ""), action="inspection_result_save", entity="inspection", entity_id=str(inspection_id))
    return {"ok": True, "id": str(inspection_id), "status": insp.overall_status}


@router.post("/inspections/{inspection_id}/approve")
def approve_inspection(
    inspection_id: UUID,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
):
    insp = db.query(WeldInspection).filter(WeldInspection.id == inspection_id, WeldInspection.tenant_id == tenant_id).first()
    if not insp:
        raise HTTPException(status_code=404, detail="Inspection not found")
    insp.overall_status = "approved"
    insp.inspector = getattr(user, "email", None) or insp.inspector
    insp.inspected_at = datetime.utcnow()
    db.commit()
    audit(db, tenant_id=str(tenant_id), user_id=str(getattr(user, "id", "") or ""), action="inspection_approve", entity="inspection", entity_id=str(inspection_id))
    return {"ok": True, "id": str(inspection_id), "status": insp.overall_status}


@router.post("/inspections/{inspection_id}/attachments")
def inspection_attachment_placeholder(
    inspection_id: UUID,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    _user=Depends(get_current_user),
):
    insp = db.query(WeldInspection).filter(WeldInspection.id == inspection_id, WeldInspection.tenant_id == tenant_id).first()
    if not insp:
        raise HTTPException(status_code=404, detail="Inspection not found")
    return {"ok": True, "inspection_id": str(inspection_id)}


from pydantic import BaseModel, Field

class ResetToNormBody(BaseModel):
    exc_class: str = Field(default="EXC2", pattern=r"^EXC[1-4]$")
    acceptance_level: str = Field(default="C", pattern=r"^[BCD]$")


def _default_template_items():
    return [
        {"group_key":"pre", "key":"pre-01"}, {"group_key":"pre", "key":"pre-02"}, {"group_key":"pre", "key":"pre-03"}, {"group_key":"pre", "key":"pre-04"},
        {"group_key":"mat", "key":"mat-01"}, {"group_key":"mat", "key":"mat-02"}, {"group_key":"mat", "key":"mat-03"}, {"group_key":"mat", "key":"mat-04"},
        {"group_key":"weld", "key":"weld-iso-01"}, {"group_key":"weld", "key":"weld-iso-02"}, {"group_key":"weld", "key":"weld-iso-03"}, {"group_key":"weld", "key":"weld-iso-04"},
        {"group_key":"ndt", "key":"ndt-01", "applicable": True},
        {"group_key":"ndt", "key":"ndt-02", "applicable": False},
        {"group_key":"ndt", "key":"ndt-03", "applicable": False},
        {"group_key":"ndt", "key":"ndt-04", "applicable": False},
        {"group_key":"doc", "key":"doc-01"}, {"group_key":"doc", "key":"doc-02"}, {"group_key":"doc", "key":"doc-03"}, {"group_key":"doc", "key":"doc-04"},
    ]


def _get_default_template_items(db: Session, tenant_id, exc_class: str):
    t = db.query(InspectionPlanTemplate).filter(InspectionPlanTemplate.tenant_id == tenant_id, InspectionPlanTemplate.exc_class == exc_class, InspectionPlanTemplate.is_default.is_(True)).order_by(InspectionPlanTemplate.version.desc()).first()
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
    w = _get_weld(db, tenant_id, weld_id)
    p = _ensure_project(db, tenant_id, w.project_id)
    if p.locked:
        raise HTTPException(status_code=423, detail="Project locked")
    insp = db.query(WeldInspection).filter(WeldInspection.tenant_id == tenant_id, WeldInspection.weld_id == weld_id).first()
    if not insp:
        insp = WeldInspection(tenant_id=tenant_id, project_id=w.project_id, weld_id=weld_id, inspector=getattr(user, "email", None), inspected_at=datetime.utcnow(), overall_status="open", remarks=None)
        db.add(insp)
        db.flush()
    else:
        insp.overall_status = "open"
        insp.remarks = None
        insp.inspected_at = insp.inspected_at or datetime.utcnow()
    old_checks = db.query(InspectionCheck).filter(InspectionCheck.tenant_id == tenant_id, InspectionCheck.inspection_id == insp.id).all()
    old_ids = [c.id for c in old_checks]
    if old_ids:
        db.query(Attachment).filter(Attachment.tenant_id == tenant_id, Attachment.scope_type == "inspection_check", Attachment.scope_id.in_(old_ids), Attachment.deleted_at.is_(None)).update({"deleted_at": datetime.utcnow()}, synchronize_session=False)
    db.query(InspectionCheck).filter(InspectionCheck.tenant_id == tenant_id, InspectionCheck.inspection_id == insp.id).delete(synchronize_session=False)
    items = _get_default_template_items(db, tenant_id, body.exc_class)
    created = set()
    for it in items or []:
        g = (it.get("groep") or it.get("group") or it.get("group_key") or "pre")
        k = (it.get("key") or it.get("criterion_key") or "").strip()
        if not k or k in created:
            continue
        created.add(k)
        applicable = it.get("applicable") if it.get("applicable") is not None else True
        db.add(InspectionCheck(tenant_id=tenant_id, inspection_id=insp.id, group_key=str(g), criterion_key=str(k), applicable=bool(applicable), approved=False, comment=None))
    db.commit()
    db.refresh(insp)
    _ = insp.checks
    return insp
