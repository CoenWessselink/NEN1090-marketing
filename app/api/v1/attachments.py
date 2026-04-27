import json
import os
import uuid
from datetime import date, datetime
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_claims
from app.core.audit import audit
from app.db.session import get_db
from app.db.models import Attachment

router = APIRouter(prefix="/attachments", tags=["attachments"])

_STORAGE_ROOT = Path(__file__).resolve().parents[4] / "storage" / "attachments"


def _ua(req: Request) -> str:
    return req.headers.get("user-agent", "")


def _ip(req: Request) -> str:
    return req.client.host if req.client else ""


def _ensure_dir(p: Path) -> None:
    p.mkdir(parents=True, exist_ok=True)


def _parse_uuid(val: str, field: str) -> uuid.UUID:
    try:
        return uuid.UUID(str(val))
    except Exception:
        raise HTTPException(status_code=422, detail=f"Invalid UUID for {field}")


@router.post("/upload")
async def upload(
    request: Request,
    files: list[UploadFile] = File(...),
    scope_type: str = Form(...),
    scope_id: str = Form(...),
    kind: str = Form(...),
    meta: str | None = Form(default=None),
    db: Session = Depends(get_db),
    claims=Depends(get_current_claims),
):
    """Multi-upload attachments. Stored on disk, metadata in DB."""
    tenant_id = str(claims.get("tenant_id"))
    user_id = claims.get("sub")

    # Enforce company scope: scope_id must equal tenant_id
    if scope_type == "company" and scope_id != tenant_id:
        raise HTTPException(status_code=403, detail="scope_id must match tenant_id for company scope")

    sid = _parse_uuid(scope_id, "scope_id")

    # meta is stored as JSON string
    meta_json = "{}"
    if meta:
        try:
            meta_json = json.dumps(json.loads(meta))
        except Exception:
            raise HTTPException(status_code=422, detail="meta must be valid JSON string")

    out = []
    for f in files:
        att_id = uuid.uuid4()
        tenant_dir = _STORAGE_ROOT / tenant_id / str(att_id)
        _ensure_dir(tenant_dir)

        # sanitize filename lightly
        filename = os.path.basename(f.filename or "file")
        storage_path = tenant_dir / filename

        # write file
        size = 0
        with storage_path.open("wb") as w:
            while True:
                chunk = await f.read(1024 * 1024)
                if not chunk:
                    break
                w.write(chunk)
                size += len(chunk)

        att = Attachment(
            id=att_id,
            tenant_id=_parse_uuid(tenant_id, "tenant_id"),
            scope_type=scope_type,
            scope_id=sid,
            kind=kind,
            filename=filename,
            storage_path=str(storage_path),
            mime_type=f.content_type,
            size_bytes=size,
            valid_until=None,
            meta_json=meta_json,
            uploaded_by=_parse_uuid(user_id, "user_id") if user_id else None,
        )
        db.add(att)
        db.commit()

        out.append(
            {
                "id": str(att.id),
                "scope_type": att.scope_type,
                "scope_id": str(att.scope_id),
                "kind": att.kind,
                "filename": att.filename,
                "mime_type": att.mime_type,
                "size_bytes": att.size_bytes,
                "valid_until": att.valid_until.isoformat() if att.valid_until else None,
                "uploaded_at": att.uploaded_at.isoformat() if att.uploaded_at else None,
                "uploaded_by": str(att.uploaded_by) if att.uploaded_by else None,
            }
        )

    audit(
        db,
        tenant_id=tenant_id,
        user_id=str(user_id) if user_id else None,
        action="attachments_upload",
        entity="attachment",
        entity_id="",
        ip=_ip(request),
        user_agent=_ua(request),
        meta={"scope_type": scope_type, "scope_id": scope_id, "kind": kind, "count": len(out)},
    )

    return out


@router.get("")
def list_attachments(
    scope_type: str,
    scope_id: str,
    kind: str | None = None,
    db: Session = Depends(get_db),
    claims=Depends(get_current_claims),
):
    tenant_id = str(claims.get("tenant_id"))

    if scope_type == "company" and scope_id != tenant_id:
        raise HTTPException(status_code=403, detail="scope_id must match tenant_id for company scope")

    sid = _parse_uuid(scope_id, "scope_id")

    q = db.query(Attachment).filter(
        Attachment.tenant_id == _parse_uuid(tenant_id, "tenant_id"),
        Attachment.scope_type == scope_type,
        Attachment.scope_id == sid,
        Attachment.deleted_at.is_(None),
    )
    if kind:
        q = q.filter(Attachment.kind == kind)

    rows = q.order_by(Attachment.uploaded_at.desc()).all()
    return [
        {
            "id": str(a.id),
            "scope_type": a.scope_type,
            "scope_id": str(a.scope_id),
            "kind": a.kind,
            "filename": a.filename,
            "mime_type": a.mime_type,
            "size_bytes": a.size_bytes,
            "valid_until": a.valid_until.isoformat() if a.valid_until else None,
            "uploaded_at": a.uploaded_at.isoformat() if a.uploaded_at else None,
            "uploaded_by": str(a.uploaded_by) if a.uploaded_by else None,
            "meta": json.loads(a.meta_json or "{}"),
        }
        for a in rows
    ]


@router.delete("/{attachment_id}")
def delete_attachment(
    attachment_id: str,
    request: Request,
    db: Session = Depends(get_db),
    claims=Depends(get_current_claims),
):
    tenant_id = str(claims.get("tenant_id"))
    user_id = claims.get("sub")

    aid = _parse_uuid(attachment_id, "attachment_id")
    a = (
        db.query(Attachment)
        .filter(Attachment.id == aid, Attachment.tenant_id == _parse_uuid(tenant_id, "tenant_id"), Attachment.deleted_at.is_(None))
        .first()
    )
    if not a:
        raise HTTPException(status_code=404, detail="Attachment not found")

    a.deleted_at = datetime.utcnow()
    db.commit()

    audit(
        db,
        tenant_id=tenant_id,
        user_id=str(user_id) if user_id else None,
        action="attachments_delete",
        entity="attachment",
        entity_id=str(a.id),
        ip=_ip(request),
        user_agent=_ua(request),
        meta={"scope_type": a.scope_type, "scope_id": str(a.scope_id), "kind": a.kind, "filename": a.filename},
    )

    return {"ok": True}


@router.get("/{attachment_id}/download")
def download_attachment(
    attachment_id: str,
    db: Session = Depends(get_db),
    claims=Depends(get_current_claims),
):
    tenant_id = str(claims.get("tenant_id"))
    aid = _parse_uuid(attachment_id, "attachment_id")

    a = (
        db.query(Attachment)
        .filter(Attachment.id == aid, Attachment.tenant_id == _parse_uuid(tenant_id, "tenant_id"), Attachment.deleted_at.is_(None))
        .first()
    )
    if not a:
        raise HTTPException(status_code=404, detail="Attachment not found")

    p = Path(a.storage_path)
    if not p.exists():
        raise HTTPException(status_code=404, detail="File missing on disk")

    return FileResponse(str(p), media_type=a.mime_type or "application/octet-stream", filename=a.filename)
