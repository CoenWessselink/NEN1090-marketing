from __future__ import annotations

import json
import os
import uuid
from datetime import datetime
from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_tenant_id, get_current_user
from app.core.audit import audit
from app.db.models import Attachment, AuditLog, InspectionCheck, InspectionPlanTemplate, Project, Weld, WeldInspection
from app.schemas.inspections import WeldInspectionGetResponse, WeldInspectionOut, WeldInspectionUpsert

router = APIRouter(tags=["inspections"])
_STORAGE_ROOT = Path(__file__).resolve().parents[4] / "storage" / "attachments"


def _get_weld(db: Session, tenant_id, weld_id: UUID) -> Weld:
    row = db.query(Weld).filter(Weld.id == weld_id, Weld.tenant_id == tenant_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Weld not found")
    return row


def _ensure_project(db: Session, tenant_id, project_id: UUID) -> Project:
    row = db.query(Project).filter(Project.id == project_id, Project.tenant_id == tenant_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Project not found")
    return row


def _inspection_or_404(db: Session, tenant_id, inspection_id: UUID) -> WeldInspection:
    row = db.query(WeldInspection).filter(WeldInspection.id == inspection_id, WeldInspection.tenant_id == tenant_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Inspection not found")
    return row


def _attachment_to_card(project_id: UUID, inspection_id: UUID, attachment: Attachment) -> dict:
    return {
        "id": str(attachment.id),
        "title": attachment.filename,
        "type": attachment.kind,
        "status": "actief",
        "version": "1.0",
        "uploaded_at": attachment.uploaded_at.isoformat() if attachment.uploaded_at else None,
        "download_url": f"/api/v1/inspections/{inspection_id}/attachments/{attachment.id}/download",
        "project_id": str(project_id),
        "inspection_id": str(inspection_id),
        "size_bytes": int(attachment.size_bytes or 0),
        "mime_type": attachment.mime_type,
    }


def _inspection_row_to_card(row: WeldInspection) -> dict:
    return {
        "id": str(row.id),
        "project_id": str(row.project_id),
        "weld_id": str(row.weld_id),
        "status": row.overall_status,
        "result": row.overall_status,
        "due_date": row.inspected_at.isoformat() if row.inspected_at else None,
        "inspector": row.inspector,
        "remarks": row.remarks,
    }


def _save_inspection_files(
    db: Session,
    tenant_id: UUID,
    inspection: WeldInspection,
    user_id: str | None,
    files: list[UploadFile],
    *,
    kind: str,
) -> list[dict]:
    tenant_dir = _STORAGE_ROOT / str(tenant_id)
    tenant_dir.mkdir(parents=True, exist_ok=True)
    results: list[dict] = []
    for upload in files:
        attachment_id = uuid.uuid4()
        attachment_dir = tenant_dir / str(attachment_id)
        attachment_dir.mkdir(parents=True, exist_ok=True)
        filename = os.path.basename(upload.filename or "bestand")
        target = attachment_dir / filename
        size = 0
        with target.open("wb") as handle:
            while True:
                chunk = awaitable_read(upload)
                if not chunk:
                    break
                handle.write(chunk)
                size += len(chunk)
        row = Attachment(
            id=attachment_id,
            tenant_id=tenant_id,
            scope_type="inspection",
            scope_id=inspection.id,
            kind=kind,
            filename=filename,
            storage_path=str(target),
            mime_type=upload.content_type,
            size_bytes=size,
            meta_json=json.dumps({"project_id": str(inspection.project_id), "inspection_id": str(inspection.id)}),
            uploaded_by=UUID(str(user_id)) if user_id else None,
        )
        db.add(row)
        db.flush()
        results.append(_attachment_to_card(inspection.project_id, inspection.id, row))
    db.commit()
    return results


def awaitable_read(upload: UploadFile, chunk_size: int = 1024 * 1024) -> bytes:
    # UploadFile.read is async in FastAPI, but can also be backed by SpooledTemporaryFile.
    maybe = upload.file.read(chunk_size)
    if isinstance(maybe, bytes):
        return maybe
    raise RuntimeError("Unexpected async file object in sync endpoint")


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
    query = db.query(WeldInspection).filter(WeldInspection.tenant_id == tenant_id)
    if project_id:
        query = query.filter(WeldInspection.project_id == project_id)
    if status:
        query = query.filter(WeldInspection.overall_status == status)
    if search:
        token = f"%{search.strip()}%"
        query = query.filter((WeldInspection.inspector.ilike(token)) | (WeldInspection.remarks.ilike(token)))
    total = query.count()
    rows = query.order_by(WeldInspection.updated_at.desc(), WeldInspection.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
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
    return _inspection_row_to_card(_inspection_or_404(db, tenant_id, inspection_id))


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
    weld = _get_weld(db, tenant_id, weld_id)
    project = _ensure_project(db, tenant_id, weld.project_id)
    if project.locked:
        raise HTTPException(status_code=423, detail="Project locked")
    exists = db.query(WeldInspection).filter(WeldInspection.tenant_id == tenant_id, WeldInspection.weld_id == weld_id).first()
    if exists:
        raise HTTPException(status_code=409, detail="Inspection already exists")
    insp = WeldInspection(
        tenant_id=tenant_id,
        project_id=weld.project_id,
        weld_id=weld_id,
        inspector=payload.inspector,
        inspected_at=payload.inspected_at or datetime.utcnow(),
        overall_status=payload.overall_status or "open",
        remarks=payload.remarks,
    )
    db.add(insp)
    db.flush()
    for check in payload.checks:
        db.add(InspectionCheck(tenant_id=tenant_id, inspection_id=insp.id, group_key=check.group_key, criterion_key=check.criterion_key, applicable=check.applicable, approved=check.approved, comment=check.comment))
    db.commit()
    db.refresh(insp)
    _ = insp.checks
    audit(db, tenant_id=str(tenant_id), user_id=str(getattr(user, "id", "") or ""), action="inspection_create", entity="inspection", entity_id=str(insp.id), meta={"project_id": str(weld.project_id), "weld_id": str(weld_id)})
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
    weld = _get_weld(db, tenant_id, weld_id)
    if weld.project_id != project_id:
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
    weld = _get_weld(db, tenant_id, weld_id)
    project = _ensure_project(db, tenant_id, weld.project_id)
    if project.locked:
        raise HTTPException(status_code=423, detail="Project locked")
    insp = db.query(WeldInspection).filter(WeldInspection.tenant_id == tenant_id, WeldInspection.weld_id == weld_id).first()
    if not insp:
        insp = WeldInspection(tenant_id=tenant_id, project_id=weld.project_id, weld_id=weld_id, inspector=payload.inspector, inspected_at=payload.inspected_at or datetime.utcnow(), overall_status=payload.overall_status or "open", remarks=payload.remarks)
        db.add(insp)
        db.flush()
    else:
        insp.inspector = payload.inspector
        insp.inspected_at = payload.inspected_at or insp.inspected_at or datetime.utcnow()
        insp.overall_status = payload.overall_status or insp.overall_status
        insp.remarks = payload.remarks
        db.query(InspectionCheck).filter(InspectionCheck.tenant_id == tenant_id, InspectionCheck.inspection_id == insp.id).delete(synchronize_session=False)
    for check in payload.checks:
        db.add(InspectionCheck(tenant_id=tenant_id, inspection_id=insp.id, group_key=check.group_key, criterion_key=check.criterion_key, applicable=check.applicable, approved=check.approved, comment=check.comment))
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
    insp = _inspection_or_404(db, tenant_id, inspection_id)
    project = _ensure_project(db, tenant_id, insp.project_id)
    if project.locked:
        raise HTTPException(status_code=423, detail="Project locked")
    insp.inspector = getattr(user, "email", None) or insp.inspector
    insp.inspected_at = datetime.utcnow()
    insp.overall_status = str(payload.get("result") or payload.get("status") or insp.overall_status)
    insp.remarks = str(payload.get("notes") or payload.get("remarks") or "") or None
    db.commit()
    db.refresh(insp)
    audit(db, tenant_id=str(tenant_id), user_id=str(getattr(user, "id", "") or ""), action="inspection_update", entity="inspection", entity_id=str(inspection_id), meta={"project_id": str(insp.project_id), "weld_id": str(insp.weld_id)})
    return _inspection_row_to_card(insp)


@router.delete("/inspections/{inspection_id}")
def delete_inspection(
    inspection_id: UUID,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
):
    insp = _inspection_or_404(db, tenant_id, inspection_id)
    db.query(InspectionCheck).filter(InspectionCheck.tenant_id == tenant_id, InspectionCheck.inspection_id == insp.id).delete(synchronize_session=False)
    db.query(Attachment).filter(Attachment.tenant_id == tenant_id, Attachment.scope_type == "inspection", Attachment.scope_id == insp.id, Attachment.deleted_at.is_(None)).update({"deleted_at": datetime.utcnow()}, synchronize_session=False)
    db.delete(insp)
    db.commit()
    audit(db, tenant_id=str(tenant_id), user_id=str(getattr(user, "id", "") or ""), action="inspection_delete", entity="inspection", entity_id=str(inspection_id), meta={"project_id": str(insp.project_id), "weld_id": str(insp.weld_id)})
    return {"ok": True}


@router.get("/inspections/{inspection_id}/results")
def inspection_results(
    inspection_id: UUID,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    _user=Depends(get_current_user),
):
    insp = _inspection_or_404(db, tenant_id, inspection_id)
    checks = db.query(InspectionCheck).filter(InspectionCheck.tenant_id == tenant_id, InspectionCheck.inspection_id == inspection_id).order_by(InspectionCheck.created_at.asc()).all()
    attachments = db.query(Attachment).filter(Attachment.tenant_id == tenant_id, Attachment.scope_type == "inspection", Attachment.scope_id == inspection_id, Attachment.deleted_at.is_(None)).order_by(Attachment.uploaded_at.desc()).all()
    return {
        "inspection_id": str(inspection_id),
        "project_id": str(insp.project_id),
        "weld_id": str(insp.weld_id),
        "status": insp.overall_status,
        "remarks": insp.remarks,
        "inspector": insp.inspector,
        "inspected_at": insp.inspected_at.isoformat() if insp.inspected_at else None,
        "checks": [{"id": str(item.id), "group_key": item.group_key, "criterion_key": item.criterion_key, "approved": item.approved, "comment": item.comment} for item in checks],
        "attachments": [_attachment_to_card(insp.project_id, inspection_id, item) for item in attachments],
    }


@router.post("/inspections/{inspection_id}/results")
def create_inspection_result(
    inspection_id: UUID,
    payload: dict,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
):
    insp = _inspection_or_404(db, tenant_id, inspection_id)
    insp.overall_status = str(payload.get("result") or payload.get("status") or insp.overall_status)
    insp.remarks = str(payload.get("notes") or payload.get("remarks") or "") or None
    insp.inspector = getattr(user, "email", None) or insp.inspector
    insp.inspected_at = datetime.utcnow()
    db.commit()
    audit(db, tenant_id=str(tenant_id), user_id=str(getattr(user, "id", "") or ""), action="inspection_result_save", entity="inspection", entity_id=str(inspection_id), meta={"project_id": str(insp.project_id), "weld_id": str(insp.weld_id), "status": insp.overall_status})
    return {"ok": True, "id": str(inspection_id), "status": insp.overall_status}


@router.post("/inspections/{inspection_id}/approve")
def approve_inspection(
    inspection_id: UUID,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
):
    insp = _inspection_or_404(db, tenant_id, inspection_id)
    insp.overall_status = "approved"
    insp.inspector = getattr(user, "email", None) or insp.inspector
    insp.inspected_at = datetime.utcnow()
    db.commit()
    audit(db, tenant_id=str(tenant_id), user_id=str(getattr(user, "id", "") or ""), action="inspection_approve", entity="inspection", entity_id=str(inspection_id), meta={"project_id": str(insp.project_id), "weld_id": str(insp.weld_id)})
    return {"ok": True, "id": str(inspection_id), "status": insp.overall_status}


@router.get("/inspections/{inspection_id}/attachments")
def list_inspection_attachments(
    inspection_id: UUID,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    _user=Depends(get_current_user),
):
    insp = _inspection_or_404(db, tenant_id, inspection_id)
    rows = db.query(Attachment).filter(Attachment.tenant_id == tenant_id, Attachment.scope_type == "inspection", Attachment.scope_id == inspection_id, Attachment.deleted_at.is_(None)).order_by(Attachment.uploaded_at.desc()).all()
    return {"items": [_attachment_to_card(insp.project_id, insp.id, row) for row in rows], "total": len(rows)}


@router.post("/inspections/{inspection_id}/attachments")
def upload_inspection_attachments(
    inspection_id: UUID,
    files: list[UploadFile] = File(default=[]),
    file: UploadFile | None = File(default=None),
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
):
    insp = _inspection_or_404(db, tenant_id, inspection_id)
    uploads = [*files, *([file] if file is not None else [])]
    if not uploads:
        raise HTTPException(status_code=422, detail="No files supplied")
    results = _save_inspection_files(db, tenant_id, insp, str(getattr(user, "id", "") or "") or None, uploads, kind="inspection_document")
    audit(db, tenant_id=str(tenant_id), user_id=str(getattr(user, "id", "") or ""), action="inspection_attachments_upload", entity="inspection", entity_id=str(inspection_id), meta={"project_id": str(insp.project_id), "weld_id": str(insp.weld_id), "count": len(results)})
    return {"items": results, "total": len(results)}


@router.post("/inspections/{inspection_id}/photos")
def upload_inspection_photos(
    inspection_id: UUID,
    files: list[UploadFile] = File(default=[]),
    file: UploadFile | None = File(default=None),
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
):
    insp = _inspection_or_404(db, tenant_id, inspection_id)
    uploads = [*files, *([file] if file is not None else [])]
    if not uploads:
        raise HTTPException(status_code=422, detail="No files supplied")
    results = _save_inspection_files(db, tenant_id, insp, str(getattr(user, "id", "") or "") or None, uploads, kind="inspection_photo")
    audit(db, tenant_id=str(tenant_id), user_id=str(getattr(user, "id", "") or ""), action="inspection_photos_upload", entity="inspection", entity_id=str(inspection_id), meta={"project_id": str(insp.project_id), "weld_id": str(insp.weld_id), "count": len(results)})
    return {"items": results, "total": len(results)}


@router.get("/inspections/{inspection_id}/attachments/{attachment_id}/download")
def download_inspection_attachment(
    inspection_id: UUID,
    attachment_id: UUID,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    _user=Depends(get_current_user),
):
    _inspection_or_404(db, tenant_id, inspection_id)
    item = db.query(Attachment).filter(Attachment.id == attachment_id, Attachment.tenant_id == tenant_id, Attachment.scope_type == "inspection", Attachment.scope_id == inspection_id, Attachment.deleted_at.is_(None)).first()
    if not item:
        raise HTTPException(status_code=404, detail="Attachment not found")
    path = Path(item.storage_path)
    if not path.exists() or not path.is_file():
        raise HTTPException(status_code=404, detail="File missing on disk")
    return FileResponse(path=str(path), media_type=item.mime_type or "application/octet-stream", filename=item.filename)


@router.get("/inspections/{inspection_id}/audit")
def get_inspection_audit(
    inspection_id: UUID,
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    _user=Depends(get_current_user),
):
    insp = _inspection_or_404(db, tenant_id, inspection_id)
    rows = db.query(AuditLog).filter(AuditLog.tenant_id == tenant_id).order_by(AuditLog.created_at.desc()).limit(limit * 4).all()
    items: list[dict] = []
    for row in rows:
        try:
            meta = json.loads(row.meta or "{}")
        except Exception:
            meta = {}
        if not (
            str(row.entity_id or "") == str(inspection_id)
            or str(meta.get("inspection_id") or "") == str(inspection_id)
            or (str(meta.get("project_id") or "") == str(insp.project_id) and str(meta.get("weld_id") or "") == str(insp.weld_id) and str(row.entity or "") == "inspection")
        ):
            continue
        items.append({
            "id": str(row.id),
            "action": row.action,
            "entity": row.entity,
            "entity_id": row.entity_id,
            "user_id": str(row.user_id) if row.user_id else None,
            "created_at": row.created_at.isoformat() if row.created_at else None,
            "meta": meta,
        })
        if len(items) >= limit:
            break
    return {"items": items, "total": len(items), "inspection_id": str(inspection_id)}


class ResetToNormBody(BaseModel):
    exc_class: str = Field(default="EXC2", pattern=r"^EXC[1-4]$")
    acceptance_level: str = Field(default="C", pattern=r"^[BCD]$")


def _default_template_items():
    return [
        {"group_key": "pre", "key": "pre-01"}, {"group_key": "pre", "key": "pre-02"}, {"group_key": "pre", "key": "pre-03"}, {"group_key": "pre", "key": "pre-04"},
        {"group_key": "mat", "key": "mat-01"}, {"group_key": "mat", "key": "mat-02"}, {"group_key": "mat", "key": "mat-03"}, {"group_key": "mat", "key": "mat-04"},
        {"group_key": "weld", "key": "weld-iso-01"}, {"group_key": "weld", "key": "weld-iso-02"}, {"group_key": "weld", "key": "weld-iso-03"}, {"group_key": "weld", "key": "weld-iso-04"},
        {"group_key": "ndt", "key": "ndt-01", "applicable": True},
        {"group_key": "ndt", "key": "ndt-02", "applicable": False},
        {"group_key": "ndt", "key": "ndt-03", "applicable": False},
        {"group_key": "ndt", "key": "ndt-04", "applicable": False},
        {"group_key": "doc", "key": "doc-01"}, {"group_key": "doc", "key": "doc-02"}, {"group_key": "doc", "key": "doc-03"}, {"group_key": "doc", "key": "doc-04"},
    ]


def _get_default_template_items(db: Session, tenant_id, exc_class: str):
    template = db.query(InspectionPlanTemplate).filter(InspectionPlanTemplate.tenant_id == tenant_id, InspectionPlanTemplate.exc_class == exc_class, InspectionPlanTemplate.is_default.is_(True)).order_by(InspectionPlanTemplate.version.desc()).first()
    if template:
        try:
            items = json.loads(template.items_json or "[]")
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
    weld = _get_weld(db, tenant_id, weld_id)
    project = _ensure_project(db, tenant_id, weld.project_id)
    if project.locked:
        raise HTTPException(status_code=423, detail="Project locked")
    insp = db.query(WeldInspection).filter(WeldInspection.tenant_id == tenant_id, WeldInspection.weld_id == weld_id).first()
    if not insp:
        insp = WeldInspection(tenant_id=tenant_id, project_id=weld.project_id, weld_id=weld_id, inspector=getattr(user, "email", None), inspected_at=datetime.utcnow(), overall_status="open", remarks=None)
        db.add(insp)
        db.flush()
    else:
        insp.overall_status = "open"
        insp.remarks = None
        insp.inspected_at = insp.inspected_at or datetime.utcnow()
    old_checks = db.query(InspectionCheck).filter(InspectionCheck.tenant_id == tenant_id, InspectionCheck.inspection_id == insp.id).all()
    old_ids = [check.id for check in old_checks]
    if old_ids:
        db.query(Attachment).filter(Attachment.tenant_id == tenant_id, Attachment.scope_type == "inspection_check", Attachment.scope_id.in_(old_ids), Attachment.deleted_at.is_(None)).update({"deleted_at": datetime.utcnow()}, synchronize_session=False)
    db.query(InspectionCheck).filter(InspectionCheck.tenant_id == tenant_id, InspectionCheck.inspection_id == insp.id).delete(synchronize_session=False)
    created = set()
    for item in _get_default_template_items(db, tenant_id, body.exc_class) or []:
        group_key = item.get("groep") or item.get("group") or item.get("group_key") or "pre"
        key = (item.get("key") or item.get("criterion_key") or "").strip()
        if not key or key in created:
            continue
        created.add(key)
        applicable = item.get("applicable") if item.get("applicable") is not None else True
        db.add(InspectionCheck(tenant_id=tenant_id, inspection_id=insp.id, group_key=str(group_key), criterion_key=str(key), applicable=bool(applicable), approved=False, comment=None))
    db.commit()
    db.refresh(insp)
    _ = insp.checks
    audit(db, tenant_id=str(tenant_id), user_id=str(getattr(user, "id", "") or ""), action="inspection_reset_to_norm", entity="inspection", entity_id=str(insp.id), meta={"project_id": str(insp.project_id), "weld_id": str(insp.weld_id), "exc_class": body.exc_class, "acceptance_level": body.acceptance_level})
    return insp
