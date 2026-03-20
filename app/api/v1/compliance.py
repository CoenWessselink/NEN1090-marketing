from __future__ import annotations

from datetime import date, datetime
from typing import Any, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_tenant_id, get_current_user, get_db
from app.db.models import (
    Attachment,
    InspectionPlanTemplate,
    MaterialRecord,
    NDTRecord,
    Project,
    Weld,
    WeldInspection,
    WelderProfile,
    WPSRecord,
    WPQRRecord,
)
from app.schemas.compliance import (
    MaterialRecordCreate, MaterialRecordOut,
    NDTRecordCreate, NDTRecordOut,
    WelderProfileCreate, WelderProfileOut,
    WPSRecordCreate, WPSRecordOut,
    WPQRRecordCreate, WPQRRecordOut,
)
from app.services.ce_dossier_service import build_preview

router = APIRouter(tags=["compliance"])


def _today() -> date:
    return datetime.utcnow().date()


def _get_project(db: Session, tenant_id, project_id: UUID) -> Project:
    project = db.query(Project).filter(Project.id == project_id, Project.tenant_id == tenant_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


def _first_or_none(rows: list[Any], predicate) -> Any | None:
    for row in rows:
        if predicate(row):
            return row
    return None


def _normalize(value: Any) -> str:
    return str(value or "").strip().lower()


def _truthy_text(value: Any) -> bool:
    return bool(str(value or "").strip())


def _project_compliance_snapshot(db: Session, tenant_id: UUID, project_id: UUID) -> dict[str, Any]:
    project = _get_project(db, tenant_id, project_id)
    welds = db.query(Weld).filter(Weld.project_id == project_id, Weld.tenant_id == tenant_id).order_by(Weld.weld_no.asc()).all()
    materials = db.query(MaterialRecord).filter(MaterialRecord.project_id == project_id, MaterialRecord.tenant_id == tenant_id).order_by(MaterialRecord.created_at.asc()).all()
    ndt_records = db.query(NDTRecord).filter(NDTRecord.project_id == project_id, NDTRecord.tenant_id == tenant_id).order_by(NDTRecord.created_at.asc()).all()
    inspections = db.query(WeldInspection).filter(WeldInspection.project_id == project_id, WeldInspection.tenant_id == tenant_id).order_by(WeldInspection.created_at.asc()).all()
    attachments = db.query(Attachment).filter(Attachment.tenant_id == tenant_id, Attachment.scope_type.in_(["project", "weld", "inspection"])).all()

    welders = db.query(WelderProfile).filter(WelderProfile.tenant_id == tenant_id, WelderProfile.is_active.is_(True)).all()
    wps_rows = db.query(WPSRecord).filter(WPSRecord.tenant_id == tenant_id, WPSRecord.is_active.is_(True)).all()
    wpqr_rows = db.query(WPQRRecord).filter(WPQRRecord.tenant_id == tenant_id).all()

    template = None
    if project.execution_class:
        template = db.query(InspectionPlanTemplate).filter(
            InspectionPlanTemplate.tenant_id == tenant_id,
            InspectionPlanTemplate.exc_class == project.execution_class,
        ).order_by(InspectionPlanTemplate.is_default.desc(), InspectionPlanTemplate.version.desc()).first()

    issues: list[dict[str, Any]] = []
    checklist: list[dict[str, Any]] = []
    completed = 0

    def add_check(key: str, label: str, completed_flag: bool, description: str, severity: str = "warning", reason: str | None = None, meta: dict[str, Any] | None = None):
        nonlocal completed
        if completed_flag:
            completed += 1
        else:
            issues.append({
                "key": key,
                "label": label,
                "reason": reason or description,
                "severity": severity,
                **(meta or {}),
            })
        checklist.append({
            "key": key,
            "label": label,
            "description": description,
            "completed": completed_flag,
            "severity": severity,
            **(meta or {}),
        })

    add_check(
        "project-core",
        "Projectbasis aanwezig",
        bool(project.code and project.name),
        "Projectnummer en projectnaam moeten vastliggen.",
        severity="danger",
        reason="Project mist projectnummer of naam.",
    )
    add_check(
        "project-exc",
        "EXC-klasse ingesteld",
        bool(project.execution_class),
        "Project moet een executieklasse hebben voor de compliance-regels.",
        severity="danger",
        reason="Executieklasse ontbreekt op projectniveau.",
    )
    add_check(
        "welds-present",
        "Lassen geregistreerd",
        len(welds) > 0,
        "Minimaal één las is vereist voordat een dossier compleet kan zijn.",
        severity="danger",
        reason="Geen lassen geregistreerd voor dit project.",
        meta={"count": len(welds)},
    )
    add_check(
        "materials-present",
        "Materialen gekoppeld",
        len(materials) > 0,
        "Project moet materiaalregistraties of materiaalselecties bevatten.",
        severity="danger",
        reason="Geen materialen of materiaalselecties gekoppeld.",
        meta={"count": len(materials)},
    )
    add_check(
        "welder-masterdata",
        "Lassers gekoppeld",
        len(welders) > 0,
        "Project moet minimaal één actieve lasser gekoppeld hebben.",
        severity="danger",
        reason="Geen lassers gekoppeld aan dit project.",
        meta={"count": len(welders)},
    )
    add_check(
        "wps-masterdata",
        "WPS gekoppeld",
        len(wps_rows) > 0,
        "Project moet minimaal één actieve WPS gekoppeld hebben.",
        severity="danger",
        reason="Geen WPS gekoppeld aan dit project.",
        meta={"count": len(wps_rows)},
    )

    materials_with_cert = sum(1 for item in materials if _truthy_text(item.certificate_no))
    add_check(
        "material-certificates",
        "Materiaalcertificaten compleet",
        len(materials) > 0 and materials_with_cert == len(materials),
        "Alle materiaalrecords moeten een certificaatnummer hebben.",
        severity="danger",
        reason=f"{len(materials) - materials_with_cert} materiaalrecords missen een certificaatnummer." if materials else "Nog geen materiaalrecords aanwezig.",
        meta={"total": len(materials), "with_certificate": materials_with_cert},
    )

    today = _today()
    valid_welders = sum(1 for item in welders if item.is_active and (item.certificate_valid_until is None or item.certificate_valid_until >= today))
    add_check(
        "welder-certificates",
        "Lassercertificaten geldig",
        len(welders) > 0 and valid_welders == len(welders),
        "Elke gekoppelde lasser moet actief zijn en een geldig certificaat hebben op de huidige datum.",
        severity="danger",
        reason=f"{len(welders) - valid_welders} lasser(s) hebben een verlopen of ongeldig certificaat." if welders else "Geen lassers gekoppeld.",
        meta={"total": len(welders), "valid": valid_welders},
    )

    approved_wpqrs = [row for row in wpqr_rows if _normalize(row.result) in {"approved", "accept", "accepted", "goedgekeurd"}]
    add_check(
        "wpqr-coverage",
        "WPQR dekking beschikbaar",
        len(wps_rows) == 0 or len(approved_wpqrs) > 0,
        "Actieve WPS-records moeten ondersteund worden door minimaal één goedgekeurde WPQR in tenant-masterdata.",
        severity="danger",
        reason="Er zijn WPS-records gekoppeld maar geen goedgekeurde WPQR-records beschikbaar." if wps_rows else "Geen WPS gekoppeld.",
        meta={"wps_count": len(wps_rows), "wpqr_approved_count": len(approved_wpqrs)},
    )

    required_methods = ["VT"]
    if _normalize(project.execution_class) in {"exc3", "exc4"}:
        required_methods.append("MT/UT")
    ndt_methods = {_normalize(item.method).upper() for item in ndt_records if _truthy_text(item.method)}
    add_check(
        "ndt-coverage",
        "NDT dekking aanwezig",
        all(method in ndt_methods or method == "MT/UT" and ("MT" in ndt_methods or "UT" in ndt_methods) for method in required_methods),
        "NDT-methoden worden bepaald op basis van de executieklasse.",
        severity="warning",
        reason=f"Verwachte NDT-methoden ontbreken: {', '.join(required_methods)}.",
        meta={"required_methods": required_methods, "registered_methods": sorted(ndt_methods)},
    )

    add_check(
        "inspection-template",
        "Inspectietemplate beschikbaar",
        template is not None,
        "Voor de gekozen EXC-klasse moet een inspectietemplate beschikbaar zijn.",
        severity="danger",
        reason=f"Geen inspectietemplate gevonden voor {project.execution_class or 'onbekende EXC'}.",
        meta={"template_name": getattr(template, 'name', None), "exc_class": project.execution_class},
    )

    expected_inspections = len(welds)
    completed_inspections = sum(1 for row in inspections if _normalize(row.status) in {"completed", "approved", "conform", "accepted"} or _normalize(row.result) in {"ok", "accepted", "approved", "conform"})
    add_check(
        "inspection-coverage",
        "Inspecties per las aanwezig",
        expected_inspections == 0 or completed_inspections >= expected_inspections,
        "Elke las moet minimaal één afgehandelde inspectie hebben.",
        severity="danger",
        reason=f"{expected_inspections - completed_inspections} las(sen) missen een afgeronde inspectie." if expected_inspections else "Geen lassen aanwezig.",
        meta={"expected": expected_inspections, "completed": completed_inspections},
    )

    doc_types = {_normalize(a.filename).split('.')[-1] for a in attachments if (_normalize(a.scope_id) == _normalize(project_id) or a.scope_type in {"weld", "inspection"}) and _truthy_text(getattr(a, 'file_name', None))}
    has_pdf_or_images = bool(doc_types.intersection({"pdf", "png", "jpg", "jpeg", "webp"}))
    add_check(
        "supporting-documents",
        "Ondersteunende documenten aanwezig",
        has_pdf_or_images,
        "Project moet minimaal één rapport, certificaat of foto bevatten.",
        severity="warning",
        reason="Geen PDF- of afbeeldingsbijlagen gevonden binnen project/lassen/inspecties.",
        meta={"extensions": sorted(doc_types)},
    )

    # Weld-level validations.
    for weld in welds:
        weld_no = weld.weld_no or str(weld.id)
        match_welder = _first_or_none(welders, lambda item: _normalize(item.name) == _normalize(weld.welders))
        match_wps = _first_or_none(wps_rows, lambda item: _normalize(item.code) == _normalize(weld.wps) or _normalize(item.title) == _normalize(weld.wps))
        material_match = _first_or_none(materials, lambda item: _normalize(item.material_grade) == _normalize(weld.material))

        if not _truthy_text(weld.welders):
            issues.append({"key": f"weld-{weld.id}-welder", "label": f"Las {weld_no}: lasser ontbreekt", "reason": "Geen lasser gekoppeld op de las.", "severity": "danger", "weld_id": str(weld.id)})
        elif match_welder is None:
            issues.append({"key": f"weld-{weld.id}-welder-master", "label": f"Las {weld_no}: lasser niet in projectmasterdata", "reason": f"Lasser '{weld.welders}' is niet gekoppeld aan het project.", "severity": "danger", "weld_id": str(weld.id)})

        if not _truthy_text(weld.wps):
            issues.append({"key": f"weld-{weld.id}-wps", "label": f"Las {weld_no}: WPS ontbreekt", "reason": "Geen WPS gekoppeld op de las.", "severity": "danger", "weld_id": str(weld.id)})
        elif match_wps is None:
            issues.append({"key": f"weld-{weld.id}-wps-master", "label": f"Las {weld_no}: WPS niet in projectmasterdata", "reason": f"WPS '{weld.wps}' is niet gekoppeld aan het project.", "severity": "danger", "weld_id": str(weld.id)})
        elif _truthy_text(weld.material) and _truthy_text(match_wps.base_material) and _normalize(match_wps.base_material) not in _normalize(weld.material):
            issues.append({"key": f"weld-{weld.id}-wps-material", "label": f"Las {weld_no}: WPS/materiaal mismatch", "reason": f"WPS '{match_wps.code}' verwacht basismateriaal '{match_wps.base_material}', maar de las gebruikt '{weld.material}'.", "severity": "danger", "weld_id": str(weld.id)})

        if _truthy_text(weld.material) and material_match is None:
            issues.append({"key": f"weld-{weld.id}-material-master", "label": f"Las {weld_no}: materiaal niet geregistreerd", "reason": f"Materiaal '{weld.material}' ontbreekt in de materiaalregistratie.", "severity": "warning", "weld_id": str(weld.id)})

    total_checks = max(len(checklist), 1)
    score = round((completed / total_checks) * 100, 1)

    overview = {
        "project_id": str(project_id),
        "project_code": project.code,
        "project_name": project.name,
        "execution_class": project.execution_class,
        "score": score,
        "missing_items": issues,
        "checklist": checklist,
        "validation_summary": {
            "total_checks": len(checklist),
            "completed_checks": completed,
            "missing_count": len(issues),
            "materials_count": len(materials),
            "welds_count": len(welds),
            "inspections_count": len(inspections),
            "ndt_count": len(ndt_records),
        },
    }
    return overview


@router.get("/projects/{project_id}/materials", response_model=List[MaterialRecordOut])
def list_materials(project_id: UUID, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), _user=Depends(get_current_user)):
    _get_project(db, tenant_id, project_id)
    return db.query(MaterialRecord).filter(MaterialRecord.project_id == project_id, MaterialRecord.tenant_id == tenant_id).order_by(MaterialRecord.created_at.desc()).all()


@router.post("/projects/{project_id}/materials", response_model=MaterialRecordOut)
def create_material(project_id: UUID, payload: MaterialRecordCreate, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), _user=Depends(get_current_user)):
    _get_project(db, tenant_id, project_id)
    row = MaterialRecord(project_id=project_id, tenant_id=tenant_id, **payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.get("/projects/{project_id}/ndt", response_model=List[NDTRecordOut])
def list_ndt(project_id: UUID, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), _user=Depends(get_current_user)):
    _get_project(db, tenant_id, project_id)
    return db.query(NDTRecord).filter(NDTRecord.project_id == project_id, NDTRecord.tenant_id == tenant_id).order_by(NDTRecord.created_at.desc()).all()


@router.post("/projects/{project_id}/ndt", response_model=NDTRecordOut)
def create_ndt(project_id: UUID, payload: NDTRecordCreate, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), _user=Depends(get_current_user)):
    _get_project(db, tenant_id, project_id)
    row = NDTRecord(project_id=project_id, tenant_id=tenant_id, **payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.get("/projects/{project_id}/compliance")
def get_project_compliance(project_id: UUID, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), _user=Depends(get_current_user)):
    return _project_compliance_snapshot(db, tenant_id, project_id)


@router.get("/projects/{project_id}/compliance/missing-items")
def get_project_compliance_missing_items(project_id: UUID, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), _user=Depends(get_current_user)):
    snapshot = _project_compliance_snapshot(db, tenant_id, project_id)
    return {"items": snapshot["missing_items"], "missing_items": snapshot["missing_items"], "score": snapshot["score"]}


@router.get("/projects/{project_id}/compliance/checklist")
def get_project_compliance_checklist(project_id: UUID, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), _user=Depends(get_current_user)):
    snapshot = _project_compliance_snapshot(db, tenant_id, project_id)
    return {"items": snapshot["checklist"], "checklist": snapshot["checklist"], "score": snapshot["score"]}


@router.get("/projects/{project_id}/ce-dossier")
def get_project_ce_dossier(project_id: UUID, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), _user=Depends(get_current_user)):
    snapshot = _project_compliance_snapshot(db, tenant_id, project_id)
    preview = build_preview(db, tenant_id, project_id)
    sections = []
    for item in preview.get("completeness", []):
        sections.append({
            "id": item.get("key"),
            "label": item.get("label"),
            "description": item.get("detail"),
            "completed": item.get("status") == "complete",
            "status": item.get("status"),
        })
    return {
        "project": preview.get("project", {}),
        "summary": preview.get("summary", {}),
        "sections": sections,
        "ready_for_export": preview.get("ready_for_export", False),
        "missing_items": snapshot.get("missing_items", []),
        "validation_summary": snapshot.get("validation_summary", {}),
    }


@router.get("/welders", response_model=List[WelderProfileOut])
def list_welders(db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), _user=Depends(get_current_user)):
    return db.query(WelderProfile).filter(WelderProfile.tenant_id == tenant_id).order_by(WelderProfile.name.asc()).all()


@router.post("/welders", response_model=WelderProfileOut)
def create_welder(payload: WelderProfileCreate, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), _user=Depends(get_current_user)):
    row = WelderProfile(tenant_id=tenant_id, **payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.get("/wps", response_model=List[WPSRecordOut])
def list_wps(db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), _user=Depends(get_current_user)):
    return db.query(WPSRecord).filter(WPSRecord.tenant_id == tenant_id).order_by(WPSRecord.code.asc()).all()


@router.post("/wps", response_model=WPSRecordOut)
def create_wps(payload: WPSRecordCreate, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), _user=Depends(get_current_user)):
    row = WPSRecord(tenant_id=tenant_id, **payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.get("/wpqr", response_model=List[WPQRRecordOut])
def list_wpqr(db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), _user=Depends(get_current_user)):
    return db.query(WPQRRecord).filter(WPQRRecord.tenant_id == tenant_id).order_by(WPQRRecord.code.asc()).all()


@router.post("/wpqr", response_model=WPQRRecordOut)
def create_wpqr(payload: WPQRRecordCreate, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), _user=Depends(get_current_user)):
    row = WPQRRecord(tenant_id=tenant_id, **payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row
