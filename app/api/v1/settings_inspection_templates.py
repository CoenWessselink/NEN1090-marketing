from __future__ import annotations

import json
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_tenant_id, get_current_user, require_role
from app.db.models import InspectionPlanTemplate


router = APIRouter(prefix="/settings", tags=["settings"])


class InspectionTemplateIn(BaseModel):
    name: str
    exc_class: str = Field(pattern=r"^EXC[1-4]$")
    version: int = 1
    is_default: bool = False
    items_json: list = Field(default_factory=list)


class InspectionTemplateOut(BaseModel):
    id: UUID
    name: str
    exc_class: str
    version: int
    is_default: bool
    items_json: list

    class Config:
        from_attributes = True


@router.get("/inspection-templates", response_model=list[InspectionTemplateOut])
def list_templates(
    exc: str | None = None,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    _user=Depends(get_current_user),
):
    q = db.query(InspectionPlanTemplate).filter(InspectionPlanTemplate.tenant_id == tenant_id)
    if exc:
        q = q.filter(InspectionPlanTemplate.exc_class == exc)
    rows = q.order_by(InspectionPlanTemplate.exc_class.asc(), InspectionPlanTemplate.version.desc()).all()
    out = []
    for r in rows:
        try:
            items = json.loads(r.items_json or "[]")
        except Exception:
            items = []
        out.append(InspectionTemplateOut(
            id=r.id,
            name=r.name,
            exc_class=r.exc_class,
            version=r.version,
            is_default=r.is_default,
            items_json=items,
        ))
    return out


@router.post("/inspection-templates", response_model=InspectionTemplateOut)
def create_template(
    payload: InspectionTemplateIn,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    _user=Depends(get_current_user),
    _claims=Depends(require_role("tenant_admin", "platform_admin")),
):
    t = InspectionPlanTemplate(
        tenant_id=tenant_id,
        name=payload.name,
        exc_class=payload.exc_class,
        version=payload.version,
        is_default=payload.is_default,
        items_json=json.dumps(payload.items_json or []),
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return InspectionTemplateOut(
        id=t.id,
        name=t.name,
        exc_class=t.exc_class,
        version=t.version,
        is_default=t.is_default,
        items_json=payload.items_json or [],
    )


class InspectionTemplatePatch(BaseModel):
    name: str | None = None
    version: int | None = None
    is_default: bool | None = None
    items_json: list | None = None


@router.patch("/inspection-templates/{template_id}", response_model=InspectionTemplateOut)
def patch_template(
    template_id: UUID,
    payload: InspectionTemplatePatch,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    _user=Depends(get_current_user),
    _claims=Depends(require_role("tenant_admin", "platform_admin")),
):
    t = db.query(InspectionPlanTemplate).filter(InspectionPlanTemplate.id == template_id, InspectionPlanTemplate.tenant_id == tenant_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Template not found")
    data = payload.model_dump(exclude_unset=True)
    if "items_json" in data:
        t.items_json = json.dumps(data["items_json"] or [])
        data.pop("items_json", None)
    for k, v in data.items():
        setattr(t, k, v)
    db.commit()
    db.refresh(t)
    try:
        items = json.loads(t.items_json or "[]")
    except Exception:
        items = []
    return InspectionTemplateOut(
        id=t.id,
        name=t.name,
        exc_class=t.exc_class,
        version=t.version,
        is_default=t.is_default,
        items_json=items,
    )


@router.put("/inspection-templates/{template_id}", response_model=InspectionTemplateOut)
def update_template(
    template_id: UUID,
    payload: InspectionTemplatePatch,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    _user=Depends(get_current_user),
    _claims=Depends(require_role("tenant_admin", "platform_admin")),
):
    return patch_template(template_id, payload, db, tenant_id, _user, _claims)
