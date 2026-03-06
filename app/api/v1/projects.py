from __future__ import annotations

import json
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user, get_current_tenant_id, get_current_claims
from app.db.models import (
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
from app.core.audit import audit
from app.schemas.projects import ProjectCreate, ProjectOut, ProjectUpdate

router = APIRouter(prefix="/projects", tags=["projects"])


from pydantic import BaseModel


class ApplyTemplateBody(BaseModel):
    template_id: UUID
    mode: str  # merge|replace


class ApproveAllBody(BaseModel):
    mode: str  # open_only|overwrite_all


@router.post("/{project_id}/apply-inspection-template")
def apply_inspection_template(
    project_id: UUID,
    body: ApplyTemplateBody,
    db: Session = Depends(get_db),
    tenant_id = Depends(get_current_tenant_id),
    user = Depends(get_current_user),
    claims = Depends(get_current_claims),
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
    # Flatten to unique (group,key)
    wanted = []
    for it in items:
        g = (it.get("groep") or it.get("group") or it.get("group_key") or "pre")
        k = (it.get("key") or it.get("criterion_key") or "").strip()
        if not k:
            continue
        wanted.append((str(g), str(k)))
    # de-dup
    wanted = list(dict.fromkeys(wanted))

    inspections = db.query(WeldInspection).filter(WeldInspection.tenant_id == tenant_id, WeldInspection.project_id == project_id).all()
    added = 0
    removed = 0
    for insp in inspections:
        existing_checks = db.query(InspectionCheck).filter(InspectionCheck.tenant_id == tenant_id, InspectionCheck.inspection_id == insp.id).all()
        existing_by_key = {(c.group_key, c.criterion_key): c for c in existing_checks}
        if mode == "replace":
            # Remove any check not in wanted
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
    tenant_id = Depends(get_current_tenant_id),
    user = Depends(get_current_user),
    claims = Depends(get_current_claims),
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
    tenant_id = Depends(get_current_tenant_id),
    user = Depends(get_current_user),
    claims = Depends(get_current_claims),
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
    tenant_id = Depends(get_current_tenant_id),
    user = Depends(get_current_user),
    claims = Depends(get_current_claims),
):
    p = db.query(Project).filter(Project.id == project_id, Project.tenant_id == tenant_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    if p.locked and claims.get("role") not in ("tenant_admin", "platform_admin"):
        raise HTTPException(status_code=423, detail="Project is locked")
    n = _bulk_add(db, tenant_id, user.id, project_id, WelderMaster, ProjectWelder, "welders")
    return {"ok": True, "welders_added": n}


@router.post("/{project_id}/add-all-lascontrole")
def add_all_lascontrole(
    project_id: UUID,
    db: Session = Depends(get_db),
    tenant_id = Depends(get_current_tenant_id),
    user = Depends(get_current_user),
    claims = Depends(get_current_claims),
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
    tenant_id = Depends(get_current_tenant_id),
    user = Depends(get_current_user),
    claims = Depends(get_current_claims),
):
    """Bulk approve inspection checks for all weld inspections in a project.

    Modes:
      - open_only: approve only checks that are currently not approved
      - overwrite_all: set approved=True for all applicable checks (admin only)
    """
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
    # Load all checks in one go
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

    # Set inspection overall_status="ok" when all applicable checks are approved
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


@router.get("/{project_id}/selected/wps")
def list_selected_wps(
    project_id: UUID,
    db: Session = Depends(get_db),
    tenant_id = Depends(get_current_tenant_id),
    _user = Depends(get_current_user),
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
    tenant_id = Depends(get_current_tenant_id),
    _user = Depends(get_current_user),
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
    tenant_id = Depends(get_current_tenant_id),
    _user = Depends(get_current_user),
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


DEMO_PROJECTS = [
    {
        "code": "P-1001",
        "name": "Tasche Staalbouw – Warmtepompruimte",
        "client_name": "Gemeente Voorbeeldstad",
        "execution_class": "EXC2",
        "acceptance_class": "B",
        "status": "in_controle",
        "locked": False,
    },
    {
        "code": "P-1002",
        "name": "Roostervloer – Industriehal",
        "client_name": "Bouwbedrijf Delta",
        "execution_class": "EXC3",
        "acceptance_class": "C",
        "status": "conform",
        "locked": False,
    },
]


def _ensure_phase1_demo_masterdata(db: Session, tenant_id):
    # Templates
    existing_tpl = db.query(InspectionPlanTemplate).filter(InspectionPlanTemplate.tenant_id == tenant_id).first()
    if not existing_tpl:
      base_items = [
        {"groep":"pre","key":"pre.drawing_ok","label":"Tekeningen/plan aanwezig","required":True,"default_state":"na","evidence_required":False},
        {"groep":"weld","key":"weld.wps_selected","label":"WPS/WPQR gekozen","required":True,"default_state":"na","evidence_required":False},
        {"groep":"vt","key":"vt.visual_ok","label":"Visuele controle OK","required":True,"default_state":"na","evidence_required":False},
        {"groep":"ndo","key":"ndo.required","label":"NDO volgens plan","required":False,"default_state":"nvt","evidence_required":False},
        {"groep":"post","key":"post.report_done","label":"Rapportage afgerond","required":False,"default_state":"na","evidence_required":False},
      ]
      for exc in ["EXC1","EXC2","EXC3","EXC4"]:
        db.add(InspectionPlanTemplate(
          tenant_id=tenant_id,
          name=f"{exc} standaard",
          exc_class=exc,
          version=1,
          is_default=True,
          items_json=json.dumps(base_items),
        ))

    # WPS
    if not db.query(WpsMaster).filter(WpsMaster.tenant_id == tenant_id).first():
      for code, title in [("WPS-135-01","MAG staal"),("WPS-111-01","Elektrode"),("WPQR-135-TS-01","WPQR kwalificatie")]:
        db.add(WpsMaster(tenant_id=tenant_id, code=code, title=title))

    # Materials
    if not db.query(MaterialMaster).filter(MaterialMaster.tenant_id == tenant_id).first():
      for code, title in [("S235JR","Konstruktie staal"),("S355J2","Konstruktie staal"),("A4-70","RVS bevestiging")]:
        db.add(MaterialMaster(tenant_id=tenant_id, code=code, title=title))

    # Welders
    if not db.query(WelderMaster).filter(WelderMaster.tenant_id == tenant_id).first():
      for code, name in [("LAS-001","Lasser Jan"),("LAS-002","Lasser Piet"),("LAS-003","Lasser Kees")]:
        db.add(WelderMaster(tenant_id=tenant_id, code=code, name=name))

    db.commit()


@router.get("", response_model=List[ProjectOut])
def list_projects(
    db: Session = Depends(get_db),
    tenant_id = Depends(get_current_tenant_id),
    _user = Depends(get_current_user),
    claims = Depends(get_current_claims),
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
    tenant_id = Depends(get_current_tenant_id),
    _user = Depends(get_current_user),
    claims = Depends(get_current_claims),
):
    p = Project(tenant_id=tenant_id, **payload.model_dump())
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


@router.get("/{project_id}", response_model=ProjectOut)
def get_project(
    project_id: UUID,
    db: Session = Depends(get_db),
    tenant_id = Depends(get_current_tenant_id),
    _user = Depends(get_current_user),
    claims = Depends(get_current_claims),
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
    tenant_id = Depends(get_current_tenant_id),
    _user = Depends(get_current_user),
    claims = Depends(get_current_claims),
):
    p = db.query(Project).filter(Project.id == project_id, Project.tenant_id == tenant_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")

    data = payload.model_dump(exclude_unset=True)
    # Enforce lock: only tenant_admin can unlock; otherwise locked projects are read-only
    if getattr(p, "locked", False):
        want_unlock = ("locked" in data and data.get("locked") is False)
        if not (want_unlock and claims.get("role") == "tenant_admin"):
            raise HTTPException(status_code=423, detail="Project is locked")
    for k, v in data.items():
        setattr(p, k, v)
    db.commit()
    db.refresh(p)
    return p


@router.put("/{project_id}", response_model=ProjectOut)
def update_project_put(
    project_id: UUID,
    payload: ProjectUpdate,
    db: Session = Depends(get_db),
    tenant_id = Depends(get_current_tenant_id),
    _user = Depends(get_current_user),
    claims = Depends(get_current_claims),
):
    """PUT alias for update (frontend uses PUT semantics)."""
    return update_project(project_id, payload, db=db, tenant_id=tenant_id, _user=_user)


@router.delete("/{project_id}")
def delete_project(
    project_id: UUID,
    db: Session = Depends(get_db),
    tenant_id = Depends(get_current_tenant_id),
    _user = Depends(get_current_user),
    claims = Depends(get_current_claims),
):
    p = db.query(Project).filter(Project.id == project_id, Project.tenant_id == tenant_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    if getattr(p, "locked", False) and claims.get("role") != "tenant_admin":
        raise HTTPException(status_code=423, detail="Project is locked")
    db.delete(p)
    db.commit()
    return {"ok": True}


@router.post("/seed_demo")
def seed_demo_projects(
    db: Session = Depends(get_db),
    tenant_id = Depends(get_current_tenant_id),
    _user = Depends(get_current_user),
    claims = Depends(get_current_claims),
):
    """Idempotent seed of demo projects for the current tenant."""
    created = 0
    updated = 0
    for item in DEMO_PROJECTS:
        code = item.get("code")
        existing = None
        if code:
            existing = (
                db.query(Project)
                .filter(Project.tenant_id == tenant_id, Project.code == code)
                .first()
            )
        if existing:
            for k, v in item.items():
                setattr(existing, k, v)
            updated += 1
        else:
            p = Project(tenant_id=tenant_id, **item)
            db.add(p)
            created += 1
    db.commit()
    # Phase 1: ensure demo masterdata/templates exist so the UI can use "Alles toevoegen" and EXC apply.
    try:
        _ensure_phase1_demo_masterdata(db, tenant_id)
    except Exception:
        pass
    return {"ok": True, "created": created, "updated": updated}


@router.delete("")
def delete_all_projects(
    db: Session = Depends(get_db),
    tenant_id = Depends(get_current_tenant_id),
    _user = Depends(get_current_user),
    claims = Depends(get_current_claims),
):
    """Delete all projects for current tenant (used by 'Data leegmaken')."""
    q = db.query(Project).filter(Project.tenant_id == tenant_id)
    count = q.count()
    q.delete(synchronize_session=False)
    db.commit()
    return {"ok": True, "deleted": count}


