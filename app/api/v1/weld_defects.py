from __future__ import annotations

import json
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_tenant_id, get_current_user, get_db
from app.core.audit import audit
from app.db.models import ISO5817ReferenceDefect, Project, Tenant, Weld, WeldDefect, WeldInspection, WeldInspectionResult
from app.schemas.weld_defects import ISO5817EvaluationOut, ISO5817ReferenceDefectOut, WeldDefectCreate, WeldDefectOut, WeldDefectUpdate, WeldInspectionResultOut, WeldInspectionResultUpsert

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
        "defect_code": getattr(d, "defect_code", None),
        "defect_type": d.defect_type,
        "defect_group": getattr(d, "defect_group", None),
        "location_zone": getattr(d, "location_zone", None),
        "severity": getattr(d, "severity", "major") or "major",
        "measured_size_mm": getattr(d, "measured_size_mm", None),
        "permitted_size_mm": getattr(d, "permitted_size_mm", None),
        "description": d.description,
        "assessment": d.assessment,
        "repair_required": bool(getattr(d, "repair_required", False)),
        "repair_state": getattr(d, "repair_state", "not_required") or "not_required",
        "evidence_attachment_ids": [UUID(x) for x in json.loads(d.evidence_attachment_ids or "[]")],
        "created_by": d.created_by,
        "created_at": d.created_at,
        "updated_at": d.updated_at,
    }

def _derive_iso_level(db: Session, tenant_id, project: Project) -> str:
    # project override > tenant default
    if getattr(project, "iso5817_level", None):
        return project.iso5817_level
    t = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not t:
        return "C"
    return getattr(t, "iso5817_level", "C") or "C"


@router.get("/projects/{project_id}/weld-defects", response_model=list[WeldDefectOut])
def list_defects_for_project(
    project_id: UUID,
    weld_id: UUID | None = None,
    inspection_id: UUID | None = None,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
):
    _get_project(db, tenant_id, project_id)
    q = db.query(WeldDefect).filter(
        WeldDefect.tenant_id == tenant_id,
        WeldDefect.project_id == project_id,
        WeldDefect.deleted_at.is_(None),
    )
    if weld_id:
        q = q.filter(WeldDefect.weld_id == weld_id)
    if inspection_id:
        q = q.filter(WeldDefect.inspection_id == inspection_id)
    rows = q.order_by(WeldDefect.created_at.desc()).all()
    # parse evidence list
    out = []
    for r in rows:
        r.evidence_attachment_ids = r.evidence_attachment_ids or "[]"
        out.append(r)
    return [_defect_to_out(r) for r in rows]


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

    d = WeldDefect(
        tenant_id=tenant_id,
        project_id=p.id,
        weld_id=w.id,
        inspection_id=payload.inspection_id,
        iso5817_level_used=iso,
        defect_code=payload.defect_code,
        defect_type=payload.defect_type,
        defect_group=payload.defect_group,
        location_zone=payload.location_zone,
        severity=payload.severity or "major",
        measured_size_mm=payload.measured_size_mm,
        permitted_size_mm=payload.permitted_size_mm,
        description=payload.description,
        assessment=payload.assessment or "open",
        repair_required=payload.repair_required,
        repair_state=payload.repair_state or ("required" if payload.repair_required else "not_required"),
        evidence_attachment_ids=evidence,
        created_by=getattr(user, "id", None),
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(d)
    db.commit()
    db.refresh(d)

    audit(
        db=db,
        tenant_id=tenant_id,
        user_id=getattr(user, "id", None),
        action="iso5817_defect_create",
        entity="weld_defect",
        entity_id=str(d.id),
        meta={"project_id": str(project_id), "weld_id": str(payload.weld_id), "iso": iso, "type": payload.defect_type},
    )
    return _defect_to_out(d)


@router.patch("/projects/{project_id}/weld-defects/{defect_id}", response_model=WeldDefectOut)
def update_defect(
    project_id: UUID,
    defect_id: UUID,
    payload: WeldDefectUpdate,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
):
    _get_project(db, tenant_id, project_id)
    d = db.query(WeldDefect).filter(
        WeldDefect.id == defect_id,
        WeldDefect.tenant_id == tenant_id,
        WeldDefect.project_id == project_id,
        WeldDefect.deleted_at.is_(None),
    ).first()
    if not d:
        raise HTTPException(status_code=404, detail="Defect not found")

    if payload.defect_code is not None:
        d.defect_code = payload.defect_code
    if payload.defect_type is not None:
        d.defect_type = payload.defect_type
    if payload.defect_group is not None:
        d.defect_group = payload.defect_group
    if payload.location_zone is not None:
        d.location_zone = payload.location_zone
    if payload.severity is not None:
        d.severity = payload.severity
    if payload.measured_size_mm is not None:
        d.measured_size_mm = payload.measured_size_mm
    if payload.permitted_size_mm is not None:
        d.permitted_size_mm = payload.permitted_size_mm
    if payload.description is not None:
        d.description = payload.description
    if payload.assessment is not None:
        d.assessment = payload.assessment
    if payload.repair_required is not None:
        d.repair_required = payload.repair_required
    if payload.repair_state is not None:
        d.repair_state = payload.repair_state
    if payload.iso5817_level_used is not None:
        d.iso5817_level_used = payload.iso5817_level_used
    if payload.evidence_attachment_ids is not None:
        d.evidence_attachment_ids = json.dumps([str(x) for x in payload.evidence_attachment_ids])

    d.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(d)

    audit(
        db=db,
        tenant_id=tenant_id,
        user_id=getattr(user, "id", None),
        action="iso5817_defect_update",
        entity="weld_defect",
        entity_id=str(d.id),
        meta={"project_id": str(project_id)},
    )
    return _defect_to_out(d)


@router.delete("/projects/{project_id}/weld-defects/{defect_id}")
def delete_defect(
    project_id: UUID,
    defect_id: UUID,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
):
    _get_project(db, tenant_id, project_id)
    d = db.query(WeldDefect).filter(
        WeldDefect.id == defect_id,
        WeldDefect.tenant_id == tenant_id,
        WeldDefect.project_id == project_id,
        WeldDefect.deleted_at.is_(None),
    ).first()
    if not d:
        raise HTTPException(status_code=404, detail="Defect not found")
    d.deleted_at = datetime.utcnow()
    d.updated_at = datetime.utcnow()
    db.commit()

    audit(
        db=db,
        tenant_id=tenant_id,
        user_id=getattr(user, "id", None),
        action="iso5817_defect_delete",
        entity="weld_defect",
        entity_id=str(d.id),
        meta={"project_id": str(project_id)},
    )
    return {"ok": True}


@router.get("/iso5817/reference-defects", response_model=list[ISO5817ReferenceDefectOut])
def list_reference_defects(db: Session = Depends(get_db), _tenant_id=Depends(get_current_tenant_id), _user=Depends(get_current_user)):
    return db.query(ISO5817ReferenceDefect).filter(ISO5817ReferenceDefect.is_active.is_(True)).order_by(ISO5817ReferenceDefect.defect_group.asc(), ISO5817ReferenceDefect.code.asc()).all()


def _get_or_create_result(db: Session, tenant_id, project_id: UUID, weld_id: UUID, inspection_id: UUID) -> WeldInspectionResult:
    row = (
        db.query(WeldInspectionResult)
        .filter(WeldInspectionResult.tenant_id == tenant_id, WeldInspectionResult.inspection_id == inspection_id)
        .first()
    )
    if row:
        return row
    row = WeldInspectionResult(tenant_id=tenant_id, project_id=project_id, weld_id=weld_id, inspection_id=inspection_id)
    db.add(row)
    db.flush()
    return row


@router.get("/welds/{weld_id}/iso5817/result", response_model=WeldInspectionResultOut | None)
def get_iso5817_result_for_weld(
    weld_id: UUID,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    _user=Depends(get_current_user),
):
    weld = _get_weld(db, tenant_id, weld_id)
    inspection = db.query(WeldInspection).filter(WeldInspection.tenant_id == tenant_id, WeldInspection.weld_id == weld_id).first()
    if not inspection:
        return None
    return db.query(WeldInspectionResult).filter(WeldInspectionResult.tenant_id == tenant_id, WeldInspectionResult.inspection_id == inspection.id).first()


@router.put("/welds/{weld_id}/iso5817/result", response_model=WeldInspectionResultOut)
def upsert_iso5817_result_for_weld(
    weld_id: UUID,
    payload: WeldInspectionResultUpsert,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
):
    weld = _get_weld(db, tenant_id, weld_id)
    inspection = db.query(WeldInspection).filter(WeldInspection.tenant_id == tenant_id, WeldInspection.weld_id == weld_id).first()
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found for weld")
    row = _get_or_create_result(db, tenant_id, weld.project_id, weld_id, inspection.id)
    for key, value in payload.model_dump().items():
        setattr(row, key, value)
    db.commit()
    db.refresh(row)
    audit(
        db=db,
        tenant_id=tenant_id,
        user_id=getattr(user, "id", None),
        action="iso5817_result_upsert",
        entity="weld_inspection_result",
        entity_id=str(row.id),
        meta={"project_id": str(weld.project_id), "weld_id": str(weld_id), "inspection_id": str(inspection.id)},
    )
    return row


@router.post("/welds/{weld_id}/iso5817/evaluate", response_model=ISO5817EvaluationOut)
def evaluate_iso5817_for_weld(
    weld_id: UUID,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
):
    weld = _get_weld(db, tenant_id, weld_id)
    inspection = db.query(WeldInspection).filter(WeldInspection.tenant_id == tenant_id, WeldInspection.weld_id == weld_id).first()
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found for weld")

    defects = db.query(WeldDefect).filter(
        WeldDefect.tenant_id == tenant_id,
        WeldDefect.weld_id == weld_id,
        WeldDefect.deleted_at.is_(None),
    ).all()

    defect_count = len(defects)
    open_defect_count = sum(1 for d in defects if (d.assessment or "open") == "open")
    repair_required_count = sum(1 for d in defects if bool(getattr(d, "repair_required", False)))
    accepted_defect_count = sum(1 for d in defects if (d.assessment or "") == "accepted")
    rejected_defect_count = sum(1 for d in defects if (d.assessment or "") == "rejected")

    quality_status = "accepted"
    reinspection_required = False
    if rejected_defect_count > 0:
        quality_status = "rejected"
        reinspection_required = True
    elif repair_required_count > 0 or open_defect_count > 0:
        quality_status = "repair_required"
        reinspection_required = True
    elif inspection.overall_status in ("nok", "open"):
        quality_status = "pending"

    result = _get_or_create_result(db, tenant_id, weld.project_id, weld_id, inspection.id)
    result.iso5817_level = getattr(result, "iso5817_level", None) or _derive_iso_level(db, tenant_id, _get_project(db, tenant_id, weld.project_id))
    result.acceptance_level = result.acceptance_level or result.iso5817_level
    result.visual_result = inspection.overall_status or "open"
    result.quality_status = quality_status
    result.defect_count = defect_count
    result.open_defect_count = open_defect_count
    result.repair_required_count = repair_required_count
    result.accepted_defect_count = accepted_defect_count
    result.rejected_defect_count = rejected_defect_count
    result.reinspection_required = reinspection_required
    result.summary = f"VT={inspection.overall_status or 'open'}; defects={defect_count}; open={open_defect_count}; repair_required={repair_required_count}; rejected={rejected_defect_count}"

    db.commit()
    db.refresh(result)

    audit(
        db=db,
        tenant_id=tenant_id,
        user_id=getattr(user, "id", None),
        action="iso5817_evaluated",
        entity="weld_inspection_result",
        entity_id=str(result.id),
        meta={
            "project_id": str(weld.project_id),
            "weld_id": str(weld_id),
            "inspection_id": str(inspection.id),
            "quality_status": quality_status,
            "defect_count": defect_count,
        },
    )
    return {
        "weld_id": weld_id,
        "inspection_id": inspection.id,
        "iso5817_level": result.iso5817_level,
        "acceptance_level": result.acceptance_level,
        "quality_status": result.quality_status,
        "defect_count": result.defect_count,
        "open_defect_count": result.open_defect_count,
        "repair_required_count": result.repair_required_count,
        "accepted_defect_count": result.accepted_defect_count,
        "rejected_defect_count": result.rejected_defect_count,
        "reinspection_required": result.reinspection_required,
        "summary": result.summary or "",
    }
