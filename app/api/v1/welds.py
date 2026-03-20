from __future__ import annotations

from datetime import datetime
import json
import os
import uuid
from pathlib import Path
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_db, get_current_user, get_current_tenant_id
from app.core.audit import audit
from app.db.models import Attachment, Project, Weld, WeldDefect, WeldInspection
from app.schemas.welds import WeldCreate, WeldOut, WeldUpdate

router = APIRouter(tags=["welds"])
_STORAGE_ROOT = Path(__file__).resolve().parents[4] / "storage" / "attachments"


def _ensure_dir(p: Path) -> None:
    p.mkdir(parents=True, exist_ok=True)


def _get_project(db: Session, tenant_id, project_id: UUID) -> Project:
    p = db.query(Project).filter(Project.id == project_id, Project.tenant_id == tenant_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    return p


def _get_weld(db: Session, tenant_id, project_id: UUID, weld_id: UUID) -> Weld:
    w = db.query(Weld).filter(Weld.id == weld_id, Weld.project_id == project_id, Weld.tenant_id == tenant_id).first()
    if not w:
        raise HTTPException(status_code=404, detail="Weld not found")
    return w


def _normalize_status(value: str | None) -> str:
    raw = (value or "open").strip().lower().replace("_", "-")
    mapping = {
        "in controle": "in-controle",
        "in-controle": "in-controle",
        "concept": "concept",
        "open": "open",
        "pending": "open",
        "conform": "conform",
        "approved": "conform",
        "ok": "conform",
        "accepted": "conform",
        "afgekeurd": "afgekeurd",
        "rejected": "afgekeurd",
        "repair-required": "afgekeurd",
    }
    return mapping.get(raw, raw or "open")


def _serialize_weld(db: Session, weld: Weld) -> dict[str, Any]:
    defect_count = (
        db.query(WeldDefect)
        .filter(WeldDefect.tenant_id == weld.tenant_id, WeldDefect.weld_id == weld.id, WeldDefect.deleted_at.is_(None))
        .count()
    )
    latest_inspection = (
        db.query(WeldInspection)
        .filter(WeldInspection.tenant_id == weld.tenant_id, WeldInspection.weld_id == weld.id)
        .order_by(WeldInspection.updated_at.desc())
        .first()
    )
    return {
        "id": weld.id,
        "project_id": weld.project_id,
        "project_name": getattr(weld.project, "name", None),
        "assembly_id": weld.assembly_id,
        "weld_number": weld.weld_no,
        "weld_no": weld.weld_no,
        "welder_name": (weld.welders or "").split(",")[0].strip() if weld.welders else None,
        "welders": weld.welders,
        "wps_id": weld.wps,
        "wps": weld.wps,
        "process": weld.process,
        "location": weld.location,
        "status": weld.status,
        "result": weld.result,
        "inspector_name": weld.inspector,
        "inspection_date": weld.inspected_at.isoformat() if weld.inspected_at else None,
        "created_at": weld.created_at.isoformat() if weld.created_at else None,
        "updated_at": weld.updated_at.isoformat() if weld.updated_at else None,
        "defect_count": defect_count,
        "inspection_status": latest_inspection.overall_status if latest_inspection else None,
        "photos": weld.photos,
        "material": weld.material,
        "thickness": weld.thickness,
        "ndt_required": str(weld.ndo_status or "").lower() not in {"", "n.v.t.", "nvt", "none"},
    }


def _store_attachment(
    db: Session,
    tenant_id: UUID,
    weld: Weld,
    upload: UploadFile,
    user_id: UUID | None,
) -> dict[str, Any]:
    att_id = uuid.uuid4()
    tenant_dir = _STORAGE_ROOT / str(tenant_id) / str(att_id)
    _ensure_dir(tenant_dir)
    filename = os.path.basename(upload.filename or "bestand")
    storage_path = tenant_dir / filename
    size = 0
    with storage_path.open("wb") as handle:
        while True:
            chunk = upload.file.read(1024 * 1024)
            if not chunk:
                break
            handle.write(chunk)
            size += len(chunk)
    attachment = Attachment(
        id=att_id,
        tenant_id=tenant_id,
        scope_type="weld",
        scope_id=weld.id,
        kind="photo" if (upload.content_type or "").startswith("image/") else "document",
        filename=filename,
        storage_path=str(storage_path),
        mime_type=upload.content_type,
        size_bytes=size,
        meta_json=json.dumps({"project_id": str(weld.project_id), "weld_number": weld.weld_no}),
        uploaded_by=user_id,
    )
    db.add(attachment)
    db.commit()
    return {
        "id": attachment.id,
        "title": attachment.filename,
        "type": attachment.kind,
        "status": "actief",
        "version": "1.0",
        "uploaded_at": attachment.uploaded_at.isoformat() if attachment.uploaded_at else None,
        "download_url": f"/api/v1/projects/{weld.project_id}/welds/{weld.id}/attachments/{attachment.id}/download",
    }


@router.get("/welds")
def list_welds_global(
    search: str | None = Query(default=None),
    status: str | None = Query(default=None),
    project_id: UUID | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=25, ge=1, le=250),
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    _user=Depends(get_current_user),
):
    q = db.query(Weld).options(joinedload(Weld.project)).filter(Weld.tenant_id == tenant_id)
    if project_id:
        q = q.filter(Weld.project_id == project_id)
    if status:
        q = q.filter(Weld.status == _normalize_status(status))
    if search:
        token = f"%{search.strip()}%"
        q = q.filter(
            (Weld.weld_no.ilike(token))
            | (Weld.location.ilike(token))
            | (Weld.wps.ilike(token))
            | (Weld.welders.ilike(token))
            | (Project.name.ilike(token))
        )
    total = q.count()
    rows = q.order_by(Weld.updated_at.desc(), Weld.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
    return {"items": [_serialize_weld(db, row) for row in rows], "total": total, "page": page, "limit": limit}


@router.get("/projects/{project_id}/welds")
def list_welds(
    project_id: UUID,
    search: str | None = Query(default=None),
    status: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=25, ge=1, le=250),
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    _user=Depends(get_current_user),
):
    _get_project(db, tenant_id, project_id)
    q = db.query(Weld).options(joinedload(Weld.project)).filter(Weld.project_id == project_id, Weld.tenant_id == tenant_id)
    if status:
        q = q.filter(Weld.status == _normalize_status(status))
    if search:
        token = f"%{search.strip()}%"
        q = q.filter((Weld.weld_no.ilike(token)) | (Weld.location.ilike(token)) | (Weld.wps.ilike(token)) | (Weld.welders.ilike(token)))
    total = q.count()
    rows = q.order_by(Weld.updated_at.desc(), Weld.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
    return {"items": [_serialize_weld(db, row) for row in rows], "total": total, "page": page, "limit": limit}


@router.get("/projects/{project_id}/welds/{weld_id}")
def get_weld(
    project_id: UUID,
    weld_id: UUID,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    _user=Depends(get_current_user),
):
    return _serialize_weld(db, _get_weld(db, tenant_id, project_id, weld_id))


@router.post("/projects/{project_id}/welds", response_model=WeldOut)
def create_weld(
    project_id: UUID,
    payload: WeldCreate,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
):
    project = _get_project(db, tenant_id, project_id)
    if project.locked:
        raise HTTPException(status_code=423, detail="Project locked")
    row = Weld(tenant_id=tenant_id, project_id=project_id, **payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    audit(db, tenant_id=str(tenant_id), user_id=str(getattr(user, "id", "") or ""), action="weld_create", entity="weld", entity_id=str(row.id), meta={"project_id": str(project_id), "weld_no": row.weld_no})
    return row


@router.patch("/projects/{project_id}/welds/{weld_id}", response_model=WeldOut)
def patch_weld(
    project_id: UUID,
    weld_id: UUID,
    payload: WeldUpdate,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
):
    project = _get_project(db, tenant_id, project_id)
    if project.locked:
        raise HTTPException(status_code=423, detail="Project locked")
    row = _get_weld(db, tenant_id, project_id, weld_id)
    data = payload.model_dump(exclude_unset=True)
    if "status" in data:
        data["status"] = _normalize_status(data.get("status"))
    for key, value in data.items():
        setattr(row, key, value)
    db.commit()
    db.refresh(row)
    audit(db, tenant_id=str(tenant_id), user_id=str(getattr(user, "id", "") or ""), action="weld_update", entity="weld", entity_id=str(row.id), meta={"project_id": str(project_id)})
    return row


@router.put("/projects/{project_id}/welds/{weld_id}", response_model=WeldOut)
def update_weld(
    project_id: UUID,
    weld_id: UUID,
    payload: WeldUpdate,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
):
    return patch_weld(project_id, weld_id, payload, db, tenant_id, user)


@router.delete("/projects/{project_id}/welds/{weld_id}")
def delete_weld(
    project_id: UUID,
    weld_id: UUID,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
):
    project = _get_project(db, tenant_id, project_id)
    if project.locked:
        raise HTTPException(status_code=423, detail="Project locked")
    row = _get_weld(db, tenant_id, project_id, weld_id)
    db.delete(row)
    db.commit()
    audit(db, tenant_id=str(tenant_id), user_id=str(getattr(user, "id", "") or ""), action="weld_delete", entity="weld", entity_id=str(weld_id), meta={"project_id": str(project_id)})
    return {"ok": True}


@router.post("/projects/{project_id}/welds/{weld_id}/conform")
def conform_weld(
    project_id: UUID,
    weld_id: UUID,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
):
    row = _get_weld(db, tenant_id, project_id, weld_id)
    row.status = "conform"
    row.result = "ok"
    row.inspector = getattr(user, "email", None) or row.inspector
    row.inspected_at = datetime.utcnow()
    db.commit()
    audit(db, tenant_id=str(tenant_id), user_id=str(getattr(user, "id", "") or ""), action="weld_conform", entity="weld", entity_id=str(weld_id), meta={"project_id": str(project_id)})
    return {"ok": True, "id": str(row.id), "status": row.status}


@router.post("/projects/{project_id}/welds/{weld_id}/reset-to-norm")
def reset_weld_to_norm(
    project_id: UUID,
    weld_id: UUID,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
):
    row = _get_weld(db, tenant_id, project_id, weld_id)
    row.status = "open"
    row.result = "pending"
    db.commit()
    audit(db, tenant_id=str(tenant_id), user_id=str(getattr(user, "id", "") or ""), action="weld_reset_to_norm", entity="weld", entity_id=str(weld_id), meta={"project_id": str(project_id)})
    return {"ok": True, "id": str(row.id), "status": row.status}


@router.post("/projects/{project_id}/welds/bulk-approve")
def bulk_approve_welds(
    project_id: UUID,
    payload: dict[str, Any],
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
):
    _get_project(db, tenant_id, project_id)
    weld_ids = [UUID(str(item)) for item in (payload.get("weld_ids") or payload.get("ids") or [])]
    if not weld_ids:
        raise HTTPException(status_code=400, detail="No weld ids supplied")
    rows = db.query(Weld).filter(Weld.tenant_id == tenant_id, Weld.project_id == project_id, Weld.id.in_(weld_ids)).all()
    approved = 0
    for row in rows:
        row.status = "conform"
        row.result = "ok"
        row.inspector = getattr(user, "email", None) or row.inspector
        row.inspected_at = datetime.utcnow()
        approved += 1
    db.commit()
    audit(db, tenant_id=str(tenant_id), user_id=str(getattr(user, "id", "") or ""), action="weld_bulk_approve", entity="project", entity_id=str(project_id), meta={"count": approved, "weld_ids": [str(item) for item in weld_ids]})
    return {"ok": True, "approved": approved}


@router.get("/projects/{project_id}/welds/{weld_id}/inspections")
def list_weld_inspections(
    project_id: UUID,
    weld_id: UUID,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    _user=Depends(get_current_user),
):
    _get_weld(db, tenant_id, project_id, weld_id)
    rows = db.query(WeldInspection).filter(WeldInspection.tenant_id == tenant_id, WeldInspection.project_id == project_id, WeldInspection.weld_id == weld_id).order_by(WeldInspection.updated_at.desc()).all()
    return {"items": [{"id": row.id, "project_id": row.project_id, "weld_id": row.weld_id, "status": row.overall_status, "result": row.overall_status, "due_date": row.inspected_at.isoformat() if row.inspected_at else None} for row in rows]}


@router.get("/projects/{project_id}/welds/{weld_id}/defects")
def list_weld_defects(
    project_id: UUID,
    weld_id: UUID,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    _user=Depends(get_current_user),
):
    _get_weld(db, tenant_id, project_id, weld_id)
    rows = db.query(WeldDefect).filter(WeldDefect.tenant_id == tenant_id, WeldDefect.project_id == project_id, WeldDefect.weld_id == weld_id, WeldDefect.deleted_at.is_(None)).order_by(WeldDefect.updated_at.desc()).all()
    return {"items": [{"id": row.id, "project_id": row.project_id, "weld_id": row.weld_id, "status": row.assessment, "severity": row.iso5817_level_used, "defect_type": row.defect_type, "notes": row.description} for row in rows]}




@router.get("/projects/{project_id}/welds/{weld_id}/compliance")
def get_weld_compliance(
    project_id: UUID,
    weld_id: UUID,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    _user=Depends(get_current_user),
):
    row = _get_weld(db, tenant_id, project_id, weld_id)
    inspections = db.query(WeldInspection).filter(WeldInspection.tenant_id == tenant_id, WeldInspection.project_id == project_id, WeldInspection.weld_id == weld_id).all()
    defects = db.query(WeldDefect).filter(WeldDefect.tenant_id == tenant_id, WeldDefect.project_id == project_id, WeldDefect.weld_id == weld_id, WeldDefect.deleted_at.is_(None)).all()
    attachments = db.query(Attachment).filter(Attachment.tenant_id == tenant_id, Attachment.scope_type == "weld", Attachment.scope_id == row.id, Attachment.deleted_at.is_(None)).all()
    checklist = [
        {"key": "weld.wps", "label": "WPS gekoppeld", "status": "complete" if (row.wps or '').strip() else "incomplete"},
        {"key": "weld.welder", "label": "Lasser gekoppeld", "status": "complete" if (row.welders or '').strip() else "incomplete"},
        {"key": "inspection.exists", "label": "Inspectie aanwezig", "status": "complete" if inspections else "incomplete"},
        {"key": "attachments.exists", "label": "Bijlage / foto aanwezig", "status": "complete" if attachments else "warning"},
        {"key": "defects.open", "label": "Open defecten", "status": "complete" if not defects else "warning"},
    ]
    missing_items = [item for item in checklist if item["status"] == "incomplete"]
    complete_count = sum(1 for item in checklist if item["status"] == "complete")
    score = round((complete_count / max(1, len(checklist))) * 100)
    return {
        "weld_id": str(row.id),
        "score": score,
        "checklist": checklist,
        "missing_items": missing_items,
        "inspection_count": len(inspections),
        "defect_count": len(defects),
        "attachments_count": len(attachments),
    }

@router.get("/projects/{project_id}/welds/{weld_id}/attachments")
def list_weld_attachments(
    project_id: UUID,
    weld_id: UUID,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    _user=Depends(get_current_user),
):
    row = _get_weld(db, tenant_id, project_id, weld_id)
    attachments = db.query(Attachment).filter(Attachment.tenant_id == tenant_id, Attachment.scope_type == "weld", Attachment.scope_id == row.id, Attachment.deleted_at.is_(None)).order_by(Attachment.uploaded_at.desc()).all()
    return {"items": [{"id": item.id, "title": item.filename, "type": item.kind, "status": "actief", "version": "1.0", "uploaded_at": item.uploaded_at.isoformat() if item.uploaded_at else None, "download_url": f"/api/v1/projects/{project_id}/welds/{weld_id}/attachments/{item.id}/download"} for item in attachments]}


@router.post("/projects/{project_id}/welds/{weld_id}/attachments")
def upload_weld_attachments(
    project_id: UUID,
    weld_id: UUID,
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
):
    row = _get_weld(db, tenant_id, project_id, weld_id)
    results = [_store_attachment(db, tenant_id, row, upload, getattr(user, "id", None)) for upload in files]
    audit(db, tenant_id=str(tenant_id), user_id=str(getattr(user, "id", "") or ""), action="weld_attachments_upload", entity="weld", entity_id=str(weld_id), meta={"project_id": str(project_id), "count": len(results)})
    return {"items": results}


@router.get("/projects/{project_id}/welds/{weld_id}/attachments/{attachment_id}/download")
def download_weld_attachment(
    project_id: UUID,
    weld_id: UUID,
    attachment_id: UUID,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    _user=Depends(get_current_user),
):
    _get_weld(db, tenant_id, project_id, weld_id)
    item = db.query(Attachment).filter(Attachment.id == attachment_id, Attachment.tenant_id == tenant_id, Attachment.scope_type == "weld", Attachment.scope_id == weld_id, Attachment.deleted_at.is_(None)).first()
    if not item:
        raise HTTPException(status_code=404, detail="Attachment not found")
    path = Path(item.storage_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="File missing on disk")
    return FileResponse(str(path), media_type=item.mime_type or "application/octet-stream", filename=item.filename)
