from __future__ import annotations

import json
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import (
    get_db,
    get_current_user,
    get_current_tenant,
    get_current_tenant_id,
    get_current_claims,
    require_tenant_write,
)
from app.core.audit import audit
from app.db.models import (
    AuditLog,
    Project,
    WeldInspection,
    InspectionCheck,
    InspectionPlanTemplate,
    WpsMaster,
    MaterialMaster,
    WelderMaster,
    ProjectWps,
    ProjectMaterial,
    ProjectWelder,
)
from app.schemas.projects import ProjectCreate, ProjectOut, ProjectUpdate
from app.services.demo_seed import BASE_TEMPLATE_ITEMS, clear_demo_dataset, seed_demo_dataset

router = APIRouter(prefix="/projects", tags=["projects"])


class ApplyTemplateBody(BaseModel):
    template_id: UUID
    mode: str  # merge|replace


class ApproveAllBody(BaseModel):
    mode: str  # open_only|overwrite_all


class DemoSeedBody(BaseModel):
    reset_first: bool = True
    allow_non_demo: bool = False


class ProjectSelectionBody(BaseModel):
    ref_id: UUID


def _create_project_link(db: Session, tenant_id, user_id, project_id: UUID, ref_id: UUID, link_model, kind: str):
    exists = db.query(link_model).filter(link_model.tenant_id == tenant_id, link_model.project_id == project_id, link_model.ref_id == ref_id).first()
    if exists:
        return {"ok": True, "already_linked": True, "ref_id": str(ref_id)}
    db.add(link_model(tenant_id=tenant_id, project_id=project_id, ref_id=ref_id, added_by=user_id))
    db.commit()
    audit(db, tenant_id=tenant_id, user_id=user_id, action=f"project_{kind}_link_add", entity="project", entity_id=str(project_id), meta={"ref_id": str(ref_id)})
    return {"ok": True, "ref_id": str(ref_id)}


def _delete_project_link(db: Session, tenant_id, user_id, project_id: UUID, ref_id: UUID, link_model, kind: str):
    row = db.query(link_model).filter(link_model.tenant_id == tenant_id, link_model.project_id == project_id, link_model.ref_id == ref_id).first()
    if not row:
        raise HTTPException(status_code=404, detail=f"{kind} link not found")
    db.delete(row)
    db.commit()
    audit(db, tenant_id=tenant_id, user_id=user_id, action=f"project_{kind}_link_delete", entity="project", entity_id=str(project_id), meta={"ref_id": str(ref_id)})
    return {"ok": True, "ref_id": str(ref_id)}


@router.post("/{project_id}/apply-inspection-template")
def apply_inspection_template(
    project_id: UUID,
    body: ApplyTemplateBody,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
    claims=Depends(get_current_claims),
    _write=Depends(require_tenant_write),
):
    p = db.query(Project).filter(Project.id == project_id, Project.tenant_id == tenant_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    t = db.query(InspectionPlanTemplate).filter(InspectionPlanTemplate.id == body.template_id, InspectionPlanTemplate.tenant_id == tenant_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Template not found")
    mode = (body.mode or "merge").lower()
    if mode not in ("merge", "replace"):
        raise HTTPException(status_code=400, detail="Invalid mode")
    if mode == "replace" and claims.get("role") not in ("tenant_admin", "platform_admin"):
        raise HTTPException(status_code=403, detail="Forbidden")

    try:
        items = json.loads(t.items_json or "[]")
    except Exception:
        items = []
    wanted = []
    for it in items:
        g = (it.get("groep") or it.get("group") or it.get("group_key") or "pre")
        k = (it.get("key") or it.get("criterion_key") or "").strip()
        if not k:
            continue
        wanted.append((str(g), str(k)))
    wanted = list(dict.fromkeys(wanted))

    inspections = db.query(WeldInspection).filter(WeldInspection.tenant_id == tenant_id, WeldInspection.project_id == project_id).all()
    added = 0
    removed = 0
    for insp in inspections:
        existing_checks = db.query(InspectionCheck).filter(InspectionCheck.tenant_id == tenant_id, InspectionCheck.inspection_id == insp.id).all()
        existing_by_key = {(c.group_key, c.criterion_key): c for c in existing_checks}
        if mode == "replace":
            wanted_set = set(wanted)
            for c in existing_checks:
                if (c.group_key, c.criterion_key) not in wanted_set:
                    db.delete(c)
                    removed += 1
        for g, k in wanted:
            if (g, k) in existing_by_key:
                continue
            db.add(InspectionCheck(
                tenant_id=tenant_id,
                inspection_id=insp.id,
                group_key=g,
                criterion_key=k,
                applicable=True,
                approved=False,
                comment=None,
            ))
            added += 1

    db.commit()
    audit(db, tenant_id=tenant_id, user_id=user.id, action="apply_inspection_template", entity="project", entity_id=str(project_id), meta={"template_id": str(body.template_id), "mode": mode, "checks_added": added, "checks_removed": removed})
    return {"ok": True, "mode": mode, "checks_added": added, "checks_removed": removed}


def _bulk_add(db: Session, tenant_id, user_id, project_id: UUID, master_model, link_model, kind: str):
    masters = db.query(master_model).filter(master_model.tenant_id == tenant_id).all()
    if not masters:
        return 0
    existing = db.query(link_model).filter(link_model.tenant_id == tenant_id, link_model.project_id == project_id).all()
    existing_ids = {e.ref_id for e in existing}
    to_add = [m for m in masters if m.id not in existing_ids]
    for m in to_add:
        db.add(link_model(tenant_id=tenant_id, project_id=project_id, ref_id=m.id, added_by=user_id))
    db.commit()
    audit(db, tenant_id=tenant_id, user_id=user_id, action=f"add_all_{kind}", entity="project", entity_id=str(project_id), meta={"added": len(to_add)})
    return len(to_add)


@router.post("/{project_id}/add-all-wps")
def add_all_wps(
    project_id: UUID,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
    claims=Depends(get_current_claims),
    _write=Depends(require_tenant_write),
):
    p = db.query(Project).filter(Project.id == project_id, Project.tenant_id == tenant_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    if p.locked and claims.get("role") not in ("tenant_admin", "platform_admin"):
        raise HTTPException(status_code=423, detail="Project is locked")
    n = _bulk_add(db, tenant_id, user.id, project_id, WpsMaster, ProjectWps, "wps")
    return {"ok": True, "wps_added": n}


@router.post("/{project_id}/add-all-materials")
def add_all_materials(
    project_id: UUID,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
    claims=Depends(get_current_claims),
    _write=Depends(require_tenant_write),
):
    p = db.query(Project).filter(Project.id == project_id, Project.tenant_id == tenant_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    if p.locked and claims.get("role") not in ("tenant_admin", "platform_admin"):
        raise HTTPException(status_code=423, detail="Project is locked")
    n = _bulk_add(db, tenant_id, user.id, project_id, MaterialMaster, ProjectMaterial, "materials")
    return {"ok": True, "materials_added": n}


@router.post("/{project_id}/add-all-welders")
def add_all_welders(
    project_id: UUID,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
    claims=Depends(get_current_claims),
    _write=Depends(require_tenant_write),
):
    p = db.query(Project).filter(Project.id == project_id, Project.tenant_id == tenant_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    if p.locked and claims.get("role") not in ("tenant_admin", "platform_admin"):
        raise HTTPException(status_code=423, detail="Project is locked")
    n = _bulk_add(db, tenant_id, user.id, project_id, WelderMaster, ProjectWelder, "welders")
    return {"ok": True, "welders_added": n}




@router.post("/{project_id}/inspection-template/apply")
def apply_inspection_template_alias(
    project_id: UUID,
    body: ApplyTemplateBody,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
    claims=Depends(get_current_claims),
    _write=Depends(require_tenant_write),
):
    return apply_inspection_template(project_id, body, db=db, tenant_id=tenant_id, user=user, claims=claims, _write=_write)


@router.post("/{project_id}/wps/add-all")
def add_all_wps_alias(
    project_id: UUID,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
    claims=Depends(get_current_claims),
    _write=Depends(require_tenant_write),
):
    return add_all_wps(project_id, db=db, tenant_id=tenant_id, user=user, claims=claims, _write=_write)


@router.post("/{project_id}/materials/add-all")
def add_all_materials_alias(
    project_id: UUID,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
    claims=Depends(get_current_claims),
    _write=Depends(require_tenant_write),
):
    return add_all_materials(project_id, db=db, tenant_id=tenant_id, user=user, claims=claims, _write=_write)


@router.post("/{project_id}/welders/add-all")
def add_all_welders_alias(
    project_id: UUID,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
    claims=Depends(get_current_claims),
    _write=Depends(require_tenant_write),
):
    return add_all_welders(project_id, db=db, tenant_id=tenant_id, user=user, claims=claims, _write=_write)


@router.post("/{project_id}/add-all-lascontrole")
def add_all_lascontrole(
    project_id: UUID,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
    claims=Depends(get_current_claims),
    _write=Depends(require_tenant_write),
):
    p = db.query(Project).filter(Project.id == project_id, Project.tenant_id == tenant_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    if p.locked and claims.get("role") not in ("tenant_admin", "platform_admin"):
        raise HTTPException(status_code=423, detail="Project is locked")
    wps_added = _bulk_add(db, tenant_id, user.id, project_id, WpsMaster, ProjectWps, "wps")
    materials_added = _bulk_add(db, tenant_id, user.id, project_id, MaterialMaster, ProjectMaterial, "materials")
    welders_added = _bulk_add(db, tenant_id, user.id, project_id, WelderMaster, ProjectWelder, "welders")
    return {"ok": True, "wps_added": wps_added, "materials_added": materials_added, "welders_added": welders_added}


@router.post("/{project_id}/lascontrole/approve_all")
def approve_all_lascontrole(
    project_id: UUID,
    body: ApproveAllBody,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
    claims=Depends(get_current_claims),
    _write=Depends(require_tenant_write),
):
    p = db.query(Project).filter(Project.id == project_id, Project.tenant_id == tenant_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    if p.locked and claims.get("role") not in ("tenant_admin", "platform_admin"):
        raise HTTPException(status_code=423, detail="Project is locked")

    mode = (body.mode or "open_only").lower()
    if mode not in ("open_only", "overwrite_all"):
        raise HTTPException(status_code=400, detail="Invalid mode")
    if mode == "overwrite_all" and claims.get("role") not in ("tenant_admin", "platform_admin"):
        raise HTTPException(status_code=403, detail="Forbidden")

    inspections = db.query(WeldInspection).filter(
        WeldInspection.tenant_id == tenant_id,
        WeldInspection.project_id == project_id,
    ).all()
    if not inspections:
        return {"ok": True, "mode": mode, "inspections": 0, "checks_updated": 0, "inspections_set_ok": 0}

    insp_ids = [i.id for i in inspections]
    checks = db.query(InspectionCheck).filter(
        InspectionCheck.tenant_id == tenant_id,
        InspectionCheck.inspection_id.in_(insp_ids),
    ).all()

    updated = 0
    by_insp: dict[UUID, list[InspectionCheck]] = {}
    for c in checks:
        by_insp.setdefault(c.inspection_id, []).append(c)

    for c in checks:
        if not c.applicable:
            continue
        if mode == "open_only":
            if not c.approved:
                c.approved = True
                updated += 1
        else:
            if not c.approved:
                updated += 1
            c.approved = True

    set_ok = 0
    for insp in inspections:
        insp_checks = by_insp.get(insp.id, [])
        applicable = [c for c in insp_checks if c.applicable]
        if applicable and all(c.approved for c in applicable):
            if insp.overall_status != "ok":
                insp.overall_status = "ok"
                set_ok += 1

    db.commit()
    audit(
        db,
        tenant_id=tenant_id,
        user_id=user.id,
        action="lascontrole_approve_all",
        entity="project",
        entity_id=str(project_id),
        meta={"mode": mode, "inspections": len(inspections), "checks_updated": updated, "inspections_set_ok": set_ok},
    )
    return {"ok": True, "mode": mode, "inspections": len(inspections), "checks_updated": updated, "inspections_set_ok": set_ok}




@router.post("/{project_id}/approve-all")
def approve_all_lascontrole_alias(
    project_id: UUID,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
    claims=Depends(get_current_claims),
    _write=Depends(require_tenant_write),
):
    body = ApproveAllBody(mode="open_only")
    return approve_all_lascontrole(project_id, body, db=db, tenant_id=tenant_id, user=user, claims=claims, _write=_write)


@router.get("/{project_id}/selected/wps")
def list_selected_wps(
    project_id: UUID,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    _user=Depends(get_current_user),
):
    rows = (
        db.query(ProjectWps, WpsMaster)
        .join(WpsMaster, ProjectWps.ref_id == WpsMaster.id)
        .filter(ProjectWps.tenant_id == tenant_id, ProjectWps.project_id == project_id)
        .order_by(WpsMaster.code.asc())
        .all()
    )
    return [
        {
            "id": str(m.id),
            "code": m.code,
            "title": m.title or "",
        }
        for _, m in rows
    ]


@router.get("/{project_id}/selected/materials")
def list_selected_materials(
    project_id: UUID,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    _user=Depends(get_current_user),
):
    rows = (
        db.query(ProjectMaterial, MaterialMaster)
        .join(MaterialMaster, ProjectMaterial.ref_id == MaterialMaster.id)
        .filter(ProjectMaterial.tenant_id == tenant_id, ProjectMaterial.project_id == project_id)
        .order_by(MaterialMaster.code.asc())
        .all()
    )
    return [
        {
            "id": str(m.id),
            "code": m.code,
            "title": m.title or "",
        }
        for _, m in rows
    ]


@router.get("/{project_id}/selected/welders")
def list_selected_welders(
    project_id: UUID,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    _user=Depends(get_current_user),
):
    rows = (
        db.query(ProjectWelder, WelderMaster)
        .join(WelderMaster, ProjectWelder.ref_id == WelderMaster.id)
        .filter(ProjectWelder.tenant_id == tenant_id, ProjectWelder.project_id == project_id)
        .order_by(WelderMaster.code.asc())
        .all()
    )
    return [
        {
            "id": str(m.id),
            "code": m.code,
            "name": m.name or "",
        }
        for _, m in rows
    ]






@router.post("/{project_id}/materials")
def add_project_material(
    project_id: UUID,
    body: ProjectSelectionBody,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
    claims=Depends(get_current_claims),
    _write=Depends(require_tenant_write),
):
    p = db.query(Project).filter(Project.id == project_id, Project.tenant_id == tenant_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    if p.locked and claims.get("role") not in ("tenant_admin", "platform_admin"):
        raise HTTPException(status_code=423, detail="Project is locked")
    master = db.query(MaterialMaster).filter(MaterialMaster.id == body.ref_id, MaterialMaster.tenant_id == tenant_id).first()
    if not master:
        raise HTTPException(status_code=404, detail="Material not found")
    return _create_project_link(db, tenant_id, user.id, project_id, body.ref_id, ProjectMaterial, "material")


@router.delete("/{project_id}/materials/{ref_id}")
def delete_project_material(
    project_id: UUID,
    ref_id: UUID,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
    claims=Depends(get_current_claims),
    _write=Depends(require_tenant_write),
):
    p = db.query(Project).filter(Project.id == project_id, Project.tenant_id == tenant_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    if p.locked and claims.get("role") not in ("tenant_admin", "platform_admin"):
        raise HTTPException(status_code=423, detail="Project is locked")
    return _delete_project_link(db, tenant_id, user.id, project_id, ref_id, ProjectMaterial, "material")


@router.post("/{project_id}/wps")
def add_project_wps(
    project_id: UUID,
    body: ProjectSelectionBody,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
    claims=Depends(get_current_claims),
    _write=Depends(require_tenant_write),
):
    p = db.query(Project).filter(Project.id == project_id, Project.tenant_id == tenant_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    if p.locked and claims.get("role") not in ("tenant_admin", "platform_admin"):
        raise HTTPException(status_code=423, detail="Project is locked")
    master = db.query(WpsMaster).filter(WpsMaster.id == body.ref_id, WpsMaster.tenant_id == tenant_id).first()
    if not master:
        raise HTTPException(status_code=404, detail="WPS not found")
    return _create_project_link(db, tenant_id, user.id, project_id, body.ref_id, ProjectWps, "wps")


@router.delete("/{project_id}/wps/{ref_id}")
def delete_project_wps(
    project_id: UUID,
    ref_id: UUID,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
    claims=Depends(get_current_claims),
    _write=Depends(require_tenant_write),
):
    p = db.query(Project).filter(Project.id == project_id, Project.tenant_id == tenant_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    if p.locked and claims.get("role") not in ("tenant_admin", "platform_admin"):
        raise HTTPException(status_code=423, detail="Project is locked")
    return _delete_project_link(db, tenant_id, user.id, project_id, ref_id, ProjectWps, "wps")


@router.post("/{project_id}/welders")
def add_project_welder(
    project_id: UUID,
    body: ProjectSelectionBody,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
    claims=Depends(get_current_claims),
    _write=Depends(require_tenant_write),
):
    p = db.query(Project).filter(Project.id == project_id, Project.tenant_id == tenant_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    if p.locked and claims.get("role") not in ("tenant_admin", "platform_admin"):
        raise HTTPException(status_code=423, detail="Project is locked")
    master = db.query(WelderMaster).filter(WelderMaster.id == body.ref_id, WelderMaster.tenant_id == tenant_id).first()
    if not master:
        raise HTTPException(status_code=404, detail="Welder not found")
    return _create_project_link(db, tenant_id, user.id, project_id, body.ref_id, ProjectWelder, "welder")


@router.delete("/{project_id}/welders/{ref_id}")
def delete_project_welder(
    project_id: UUID,
    ref_id: UUID,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
    claims=Depends(get_current_claims),
    _write=Depends(require_tenant_write),
):
    p = db.query(Project).filter(Project.id == project_id, Project.tenant_id == tenant_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    if p.locked and claims.get("role") not in ("tenant_admin", "platform_admin"):
        raise HTTPException(status_code=423, detail="Project is locked")
    return _delete_project_link(db, tenant_id, user.id, project_id, ref_id, ProjectWelder, "welder")


@router.get("/{project_id}/wps")
def list_selected_wps_alias(
    project_id: UUID,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    _user=Depends(get_current_user),
):
    return list_selected_wps(project_id, db=db, tenant_id=tenant_id, _user=_user)


@router.get("/{project_id}/materials")
def list_selected_materials_alias(
    project_id: UUID,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    _user=Depends(get_current_user),
):
    return list_selected_materials(project_id, db=db, tenant_id=tenant_id, _user=_user)


@router.get("/{project_id}/welders")
def list_selected_welders_alias(
    project_id: UUID,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    _user=Depends(get_current_user),
):
    return list_selected_welders(project_id, db=db, tenant_id=tenant_id, _user=_user)


@router.get("", response_model=List[ProjectOut])
def list_projects(
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    _user=Depends(get_current_user),
    _claims=Depends(get_current_claims),
):
    return (
        db.query(Project)
        .filter(Project.tenant_id == tenant_id)
        .order_by(Project.created_at.desc())
        .all()
    )


@router.post("", response_model=ProjectOut)
def create_project(
    payload: ProjectCreate,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
    claims=Depends(get_current_claims),
    _write=Depends(require_tenant_write),
):
    p = Project(tenant_id=tenant_id, **payload.model_dump())
    db.add(p)
    db.commit()
    db.refresh(p)
    audit(db, tenant_id=tenant_id, user_id=user.id, action="project_create", entity="project", entity_id=str(p.id), meta={"code": p.code, "role": claims.get("role")})
    return p


@router.get("/{project_id}", response_model=ProjectOut)
def get_project(
    project_id: UUID,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    _user=Depends(get_current_user),
    _claims=Depends(get_current_claims),
):
    p = db.query(Project).filter(Project.id == project_id, Project.tenant_id == tenant_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    return p


@router.patch("/{project_id}", response_model=ProjectOut)
def update_project(
    project_id: UUID,
    payload: ProjectUpdate,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
    claims=Depends(get_current_claims),
    _write=Depends(require_tenant_write),
):
    p = db.query(Project).filter(Project.id == project_id, Project.tenant_id == tenant_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")

    data = payload.model_dump(exclude_unset=True)
    if getattr(p, "locked", False):
        want_unlock = ("locked" in data and data.get("locked") is False)
        if not (want_unlock and claims.get("role") == "tenant_admin"):
            raise HTTPException(status_code=423, detail="Project is locked")
    for k, v in data.items():
        setattr(p, k, v)
    db.commit()
    db.refresh(p)
    audit(db, tenant_id=tenant_id, user_id=user.id, action="project_update", entity="project", entity_id=str(p.id), meta={"fields": sorted(data.keys())})
    return p


@router.put("/{project_id}", response_model=ProjectOut)
def update_project_put(
    project_id: UUID,
    payload: ProjectUpdate,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
    claims=Depends(get_current_claims),
    _write=Depends(require_tenant_write),
):
    return update_project(project_id, payload, db=db, tenant_id=tenant_id, user=user, claims=claims)


@router.delete("/{project_id}")
def delete_project(
    project_id: UUID,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
    claims=Depends(get_current_claims),
    _write=Depends(require_tenant_write),
):
    p = db.query(Project).filter(Project.id == project_id, Project.tenant_id == tenant_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    if getattr(p, "locked", False) and claims.get("role") != "tenant_admin":
        raise HTTPException(status_code=423, detail="Project is locked")
    db.delete(p)
    db.commit()
    audit(db, tenant_id=tenant_id, user_id=user.id, action="project_delete", entity="project", entity_id=str(project_id), meta={"code": p.code})
    return {"ok": True}



@router.get("/{project_id}/audit")
def list_project_audit(
    project_id: UUID,
    limit: int = 200,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    _user=Depends(get_current_user),
    _claims=Depends(get_current_claims),
):
    p = db.query(Project).filter(Project.id == project_id, Project.tenant_id == tenant_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    rows = db.query(AuditLog).filter(AuditLog.tenant_id == tenant_id).order_by(AuditLog.created_at.desc()).limit(max(1, min(limit, 500))).all()
    result = []
    for row in rows:
        try:
            meta = json.loads(row.meta or '{}')
        except Exception:
            meta = {}
        entity_id_matches = str(row.entity_id or '') == str(project_id)
        project_match = str(meta.get('project_id') or '') == str(project_id)
        if not (entity_id_matches or project_match):
            continue
        result.append({
            'id': str(row.id),
            'tenant_id': str(row.tenant_id),
            'user_id': str(row.user_id) if row.user_id else None,
            'action': row.action,
            'entity': row.entity,
            'entity_id': row.entity_id,
            'ip': row.ip,
            'user_agent': row.user_agent,
            'created_at': row.created_at.isoformat() if row.created_at else None,
            'meta': meta,
        })
    return {'items': result, 'total': len(result), 'page': 1, 'limit': min(limit, 500)}

@router.post("/seed_demo")
def seed_demo_projects(
    body: DemoSeedBody | None = None,
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    tenant=Depends(get_current_tenant),
    user=Depends(get_current_user),
    claims=Depends(get_current_claims),
    _write=Depends(require_tenant_write),
):
    payload = body or DemoSeedBody()
    if claims.get("role") not in ("tenant_admin", "platform_admin"):
        raise HTTPException(status_code=403, detail="Forbidden")
    try:
        result = seed_demo_dataset(
            db,
            tenant_id,
            tenant_name=tenant.name,
            actor_user_id=user.id,
            reset_first=payload.reset_first,
            allow_non_demo=payload.allow_non_demo,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    audit(db, tenant_id=tenant_id, user_id=user.id, action="demo_seed", entity="tenant", entity_id=str(tenant_id), meta=result)
    return {"ok": True, **result}


@router.delete("")
def delete_all_projects(
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    user=Depends(get_current_user),
    claims=Depends(get_current_claims),
    _write=Depends(require_tenant_write),
):
    if claims.get("role") not in ("tenant_admin", "platform_admin"):
        raise HTTPException(status_code=403, detail="Forbidden")
    q = db.query(Project).filter(Project.tenant_id == tenant_id)
    count = q.count()
    q.delete(synchronize_session=False)
    db.commit()
    audit(db, tenant_id=tenant_id, user_id=user.id, action="project_delete_all", entity="tenant", entity_id=str(tenant_id), meta={"count": count})
    return {"ok": True, "deleted": count}


@router.post("/clear_demo")
def clear_demo_projects(
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    tenant=Depends(get_current_tenant),
    user=Depends(get_current_user),
    claims=Depends(get_current_claims),
    _write=Depends(require_tenant_write),
):
    if claims.get("role") not in ("tenant_admin", "platform_admin"):
        raise HTTPException(status_code=403, detail="Forbidden")
    if tenant.name.strip().lower() != "demo" and claims.get("role") != "platform_admin":
        raise HTTPException(status_code=400, detail="Demo clear is alleen toegestaan voor tenant 'demo'.")
    result = clear_demo_dataset(db, tenant_id)
    audit(db, tenant_id=tenant_id, user_id=user.id, action="demo_clear", entity="tenant", entity_id=str(tenant_id), meta=result)
    return {"ok": True, **result}
