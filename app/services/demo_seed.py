from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from typing import Iterable
from uuid import UUID

from sqlalchemy.orm import Session

from app.db.models import (
    Project,
    Weld,
    WeldInspection,
    InspectionCheck,
    InspectionPlanTemplate,
    WpsMaster,
    MaterialMaster,
    WelderMaster,
    ProjectWps,
    ProjectMaterial,
    ProjectWelder,
    Tenant,
    User,
)

DEMO_PROJECTS: list[dict] = [
    {
        "code": "P-1001",
        "name": "Warmtepompplatform Gemeentehuis",
        "client_name": "Gemeente Voorbeeldstad",
        "execution_class": "EXC2",
        "acceptance_class": "B",
        "status": "in_controle",
        "locked": False,
    },
    {
        "code": "P-1002",
        "name": "Roostervloer Industriehal Delta",
        "client_name": "Bouwbedrijf Delta",
        "execution_class": "EXC3",
        "acceptance_class": "C",
        "status": "conform",
        "locked": False,
    },
    {
        "code": "P-1003",
        "name": "Bordestrap Kantoorvleugel Oost",
        "client_name": "Architectenbureau Van Dijk",
        "execution_class": "EXC1",
        "acceptance_class": "B",
        "status": "in_controle",
        "locked": False,
    },
    {
        "code": "P-1004",
        "name": "Machineframe Verpakkingslijn 4",
        "client_name": "Tech Solutions BV",
        "execution_class": "EXC3",
        "acceptance_class": "C",
        "status": "afgekeurd",
        "locked": False,
    },
    {
        "code": "P-1005",
        "name": "Balkonconstructies Fase 2",
        "client_name": "Woningbouwgroep NL",
        "execution_class": "EXC2",
        "acceptance_class": "B",
        "status": "conform",
        "locked": False,
    },
    {
        "code": "P-1006",
        "name": "Dakopbouw Logistiek Centrum",
        "client_name": "LogiBuild Nederland",
        "execution_class": "EXC2",
        "acceptance_class": "B",
        "status": "in_controle",
        "locked": False,
    },
    {
        "code": "P-1007",
        "name": "Trappenhuis Renovatie Noord",
        "client_name": "Renova Vastgoed",
        "execution_class": "EXC1",
        "acceptance_class": "A",
        "status": "conform",
        "locked": False,
    },
    {
        "code": "P-1008",
        "name": "Ondersteuningsframe Productiecel",
        "client_name": "Metaaltechniek Oost",
        "execution_class": "EXC3",
        "acceptance_class": "C",
        "status": "in_controle",
        "locked": True,
    },
    {
        "code": "P-1009",
        "name": "Loopbrug Distributiecentrum",
        "client_name": "Warehousing Europe",
        "execution_class": "EXC2",
        "acceptance_class": "B",
        "status": "afgekeurd",
        "locked": False,
    },
    {
        "code": "P-1010",
        "name": "Portaalconstructie Technische Ruimte",
        "client_name": "Installatiebedrijf Jansen",
        "execution_class": "EXC2",
        "acceptance_class": "B",
        "status": "in_controle",
        "locked": False,
    },
]

DEMO_WPS: list[dict] = [
    {"code": "WPS-135-01", "title": "MAG staal hoeknaad", "kind": "WPS", "document_no": "WPS-135-01", "version": "1.0"},
    {"code": "WPS-135-02", "title": "MAG staal stompe naad", "kind": "WPS", "document_no": "WPS-135-02", "version": "1.1"},
    {"code": "WPS-111-01", "title": "Elektrode buitenwerk", "kind": "WPS", "document_no": "WPS-111-01", "version": "1.0"},
    {"code": "WPS-141-01", "title": "TIG RVS detailwerk", "kind": "WPS", "document_no": "WPS-141-01", "version": "2.0"},
    {"code": "WPQR-135-TS-01", "title": "WPQR MAG plaat 10 mm", "kind": "WPQR", "document_no": "WPQR-135-TS-01", "version": "2025-01"},
    {"code": "WPQR-111-TS-01", "title": "WPQR Elektrode profiel 12 mm", "kind": "WPQR", "document_no": "WPQR-111-TS-01", "version": "2024-11"},
]

DEMO_MATERIALS: list[dict] = [
    {"code": "S235JR", "title": "Constructiestaal S235JR"},
    {"code": "S355J2", "title": "Constructiestaal S355J2"},
    {"code": "S355NL", "title": "Constructiestaal S355NL"},
    {"code": "RVS304", "title": "RVS 304"},
    {"code": "A4-70", "title": "Bevestigingsmateriaal A4-70"},
    {"code": "Z275", "title": "Verzinkte plaat Z275"},
]

DEMO_WELDERS: list[dict] = [
    {"code": "LAS-001", "name": "Jan de Lasser"},
    {"code": "LAS-002", "name": "Piet van den Berg"},
    {"code": "LAS-003", "name": "Kees Jansen"},
    {"code": "LAS-004", "name": "Maria de Groot"},
    {"code": "LAS-005", "name": "Sven Bakker"},
]

BASE_TEMPLATE_ITEMS: list[dict] = [
    {"groep": "pre", "key": "pre.drawing_ok", "label": "Tekeningen / lasplan aanwezig", "required": True, "default_state": "na", "evidence_required": False},
    {"groep": "pre", "key": "pre.materials_traceable", "label": "Materiaaltraceerbaarheid vastgelegd", "required": True, "default_state": "na", "evidence_required": False},
    {"groep": "weld", "key": "weld.wps_selected", "label": "Juiste WPS / WPQR gekoppeld", "required": True, "default_state": "na", "evidence_required": False},
    {"groep": "weld", "key": "weld.preparation_ok", "label": "Lasnaadvoorbereiding akkoord", "required": True, "default_state": "na", "evidence_required": False},
    {"groep": "vt", "key": "vt.visual_ok", "label": "Visuele controle akkoord", "required": True, "default_state": "na", "evidence_required": False},
    {"groep": "vt", "key": "vt.dimensions_ok", "label": "Afmetingen / uitlijning akkoord", "required": True, "default_state": "na", "evidence_required": False},
    {"groep": "ndo", "key": "ndo.required", "label": "NDO uitgevoerd conform plan", "required": False, "default_state": "nvt", "evidence_required": False},
    {"groep": "post", "key": "post.report_done", "label": "Rapportage afgerond", "required": False, "default_state": "na", "evidence_required": False},
]

WELD_SCENARIOS: list[dict] = [
    {"weld_no": "L-001", "location": "Kolom A1 / Ligger 1", "wps": "WPS-135-01", "process": "135", "material": "S355J2", "thickness": "8 mm", "welder_code": "LAS-001", "vt_status": "open", "ndo_status": "nvt", "status": "in_controle", "result": "pending", "overall_status": "open", "approved_keys": ["pre.drawing_ok", "weld.wps_selected"]},
    {"weld_no": "L-002", "location": "Kolom A2 / Ligger 1", "wps": "WPS-135-02", "process": "135", "material": "S355J2", "thickness": "10 mm", "welder_code": "LAS-002", "vt_status": "ok", "ndo_status": "nvt", "status": "conform", "result": "ok", "overall_status": "ok", "approved_keys": ["pre.drawing_ok", "pre.materials_traceable", "weld.wps_selected", "weld.preparation_ok", "vt.visual_ok", "vt.dimensions_ok", "post.report_done"]},
    {"weld_no": "L-003", "location": "Stijgpunt B1 / Console", "wps": "WPS-111-01", "process": "111", "material": "S235JR", "thickness": "6 mm", "welder_code": "LAS-003", "vt_status": "nok", "ndo_status": "mt", "status": "afgekeurd", "result": "nok", "overall_status": "nok", "approved_keys": ["pre.drawing_ok", "weld.wps_selected"]},
]


def _utcnow_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _demo_guard(tenant_name: str, allow_non_demo: bool = False) -> None:
    if not allow_non_demo and tenant_name.strip().lower() != "demo":
        raise ValueError("Demo seed is alleen toegestaan voor tenant 'demo'.")


def _ensure_templates(db: Session, tenant_id: UUID) -> None:
    existing = {
        (t.exc_class, t.name): t
        for t in db.query(InspectionPlanTemplate).filter(InspectionPlanTemplate.tenant_id == tenant_id).all()
    }
    for exc in ("EXC1", "EXC2", "EXC3", "EXC4"):
        key = (exc, f"{exc} standaard")
        if key in existing:
            tpl = existing[key]
            tpl.items_json = json.dumps(BASE_TEMPLATE_ITEMS)
            tpl.is_default = True
            tpl.version = 1
        else:
            db.add(
                InspectionPlanTemplate(
                    tenant_id=tenant_id,
                    name=f"{exc} standaard",
                    exc_class=exc,
                    version=1,
                    is_default=True,
                    items_json=json.dumps(BASE_TEMPLATE_ITEMS),
                )
            )
    db.flush()


def _upsert_masterdata(db: Session, tenant_id: UUID) -> dict:
    counts = {"wps": 0, "materials": 0, "welders": 0}

    existing_wps = {m.code: m for m in db.query(WpsMaster).filter(WpsMaster.tenant_id == tenant_id).all()}
    for item in DEMO_WPS:
        row = existing_wps.get(item["code"])
        if row:
            row.title = item["title"]
            row.kind = item["kind"]
            row.document_no = item["document_no"]
            row.version = item["version"]
        else:
            db.add(WpsMaster(tenant_id=tenant_id, **item))
            counts["wps"] += 1

    existing_mat = {m.code: m for m in db.query(MaterialMaster).filter(MaterialMaster.tenant_id == tenant_id).all()}
    for item in DEMO_MATERIALS:
        row = existing_mat.get(item["code"])
        if row:
            row.title = item["title"]
        else:
            db.add(MaterialMaster(tenant_id=tenant_id, **item))
            counts["materials"] += 1

    existing_welders = {m.code: m for m in db.query(WelderMaster).filter(WelderMaster.tenant_id == tenant_id).all()}
    for item in DEMO_WELDERS:
        row = existing_welders.get(item["code"])
        if row:
            row.name = item["name"]
        else:
            db.add(WelderMaster(tenant_id=tenant_id, **item))
            counts["welders"] += 1

    db.flush()
    return counts


def clear_demo_dataset(db: Session, tenant_id: UUID) -> dict:
    weld_ids = [row[0] for row in db.query(Weld.id).filter(Weld.tenant_id == tenant_id).all()]
    inspection_ids = [row[0] for row in db.query(WeldInspection.id).filter(WeldInspection.tenant_id == tenant_id).all()]

    deleted_checks = 0
    deleted_inspections = 0
    deleted_welds = 0
    deleted_project_links = 0
    deleted_projects = 0

    if inspection_ids:
        deleted_checks = db.query(InspectionCheck).filter(InspectionCheck.tenant_id == tenant_id, InspectionCheck.inspection_id.in_(inspection_ids)).delete(synchronize_session=False)
        deleted_inspections = db.query(WeldInspection).filter(WeldInspection.tenant_id == tenant_id, WeldInspection.id.in_(inspection_ids)).delete(synchronize_session=False)

    if weld_ids:
        deleted_welds = db.query(Weld).filter(Weld.tenant_id == tenant_id, Weld.id.in_(weld_ids)).delete(synchronize_session=False)

    deleted_project_links += db.query(ProjectWps).filter(ProjectWps.tenant_id == tenant_id).delete(synchronize_session=False)
    deleted_project_links += db.query(ProjectMaterial).filter(ProjectMaterial.tenant_id == tenant_id).delete(synchronize_session=False)
    deleted_project_links += db.query(ProjectWelder).filter(ProjectWelder.tenant_id == tenant_id).delete(synchronize_session=False)
    deleted_projects = db.query(Project).filter(Project.tenant_id == tenant_id).delete(synchronize_session=False)

    db.commit()
    return {
        "checks_deleted": deleted_checks,
        "inspections_deleted": deleted_inspections,
        "welds_deleted": deleted_welds,
        "project_links_deleted": deleted_project_links,
        "projects_deleted": deleted_projects,
    }


def seed_demo_dataset(
    db: Session,
    tenant_id: UUID,
    *,
    tenant_name: str = "demo",
    actor_user_id: UUID | None = None,
    reset_first: bool = True,
    allow_non_demo: bool = False,
) -> dict:
    _demo_guard(tenant_name, allow_non_demo=allow_non_demo)

    cleared = {
        "checks_deleted": 0,
        "inspections_deleted": 0,
        "welds_deleted": 0,
        "project_links_deleted": 0,
        "projects_deleted": 0,
    }
    if reset_first:
        cleared = clear_demo_dataset(db, tenant_id)

    _ensure_templates(db, tenant_id)
    master_counts = _upsert_masterdata(db, tenant_id)
    db.commit()

    wps_by_code = {row.code: row for row in db.query(WpsMaster).filter(WpsMaster.tenant_id == tenant_id).all()}
    materials_by_code = {row.code: row for row in db.query(MaterialMaster).filter(MaterialMaster.tenant_id == tenant_id).all()}
    welders_by_code = {row.code: row for row in db.query(WelderMaster).filter(WelderMaster.tenant_id == tenant_id).all()}

    created_projects = 0
    created_welds = 0
    created_inspections = 0
    created_checks = 0
    created_project_links = 0

    now = _utcnow_naive()

    for project_index, pdata in enumerate(DEMO_PROJECTS, start=1):
        project = Project(tenant_id=tenant_id, **pdata)
        db.add(project)
        db.flush()
        created_projects += 1

        project_wps_codes = ["WPS-135-01", "WPS-135-02", "WPQR-135-TS-01"] if pdata["execution_class"] in ("EXC2", "EXC3") else ["WPS-111-01", "WPQR-111-TS-01"]
        project_material_codes = ["S355J2", "S235JR"] if pdata["execution_class"] != "EXC1" else ["S235JR"]
        project_welder_codes = ["LAS-001", "LAS-002", "LAS-003"] if not pdata.get("locked") else ["LAS-004", "LAS-005"]

        for code in project_wps_codes:
            ref = wps_by_code.get(code)
            if ref:
                db.add(ProjectWps(tenant_id=tenant_id, project_id=project.id, ref_id=ref.id, added_by=actor_user_id))
                created_project_links += 1
        for code in project_material_codes:
            ref = materials_by_code.get(code)
            if ref:
                db.add(ProjectMaterial(tenant_id=tenant_id, project_id=project.id, ref_id=ref.id, added_by=actor_user_id))
                created_project_links += 1
        for code in project_welder_codes:
            ref = welders_by_code.get(code)
            if ref:
                db.add(ProjectWelder(tenant_id=tenant_id, project_id=project.id, ref_id=ref.id, added_by=actor_user_id))
                created_project_links += 1

        for weld_index, scenario in enumerate(WELD_SCENARIOS, start=1):
            welder_name = welders_by_code.get(scenario["welder_code"]).name if welders_by_code.get(scenario["welder_code"]) else scenario["welder_code"]
            weld = Weld(
                tenant_id=tenant_id,
                project_id=project.id,
                weld_no=f"{scenario['weld_no']}-{project_index}",
                location=scenario["location"],
                wps=scenario["wps"],
                process=scenario["process"],
                material=scenario["material"],
                thickness=scenario["thickness"],
                welders=welder_name,
                vt_status=scenario["vt_status"],
                ndo_status=scenario["ndo_status"],
                photos=2 if scenario["overall_status"] == "ok" else 1,
                status=scenario["status"],
                result=scenario["result"],
                inspector="QC Demo" if scenario["overall_status"] != "open" else None,
                inspected_at=now - timedelta(days=project_index + weld_index) if scenario["overall_status"] != "open" else None,
                notes=f"Demo las {scenario['weld_no']} voor {pdata['code']}",
            )
            db.add(weld)
            db.flush()
            created_welds += 1

            inspection = WeldInspection(
                tenant_id=tenant_id,
                project_id=project.id,
                weld_id=weld.id,
                inspector="QC Demo",
                inspected_at=now - timedelta(days=project_index + weld_index) if scenario["overall_status"] != "open" else None,
                overall_status=scenario["overall_status"],
                remarks=f"Automatisch gegenereerde demo-inspectie voor {weld.weld_no}",
            )
            db.add(inspection)
            db.flush()
            created_inspections += 1

            approved_keys = set(scenario.get("approved_keys", []))
            for item in BASE_TEMPLATE_ITEMS:
                approved = item["key"] in approved_keys
                applicable = not (item["key"] == "ndo.required" and pdata["execution_class"] == "EXC1")
                if item["key"] == "ndo.required" and scenario["ndo_status"] not in ("nvt", ""):
                    approved = scenario["overall_status"] == "ok"
                    applicable = True
                check = InspectionCheck(
                    tenant_id=tenant_id,
                    inspection_id=inspection.id,
                    group_key=item["groep"],
                    criterion_key=item["key"],
                    applicable=applicable,
                    approved=approved,
                    comment=None if approved else ("Nog af te ronden" if scenario["overall_status"] == "open" else "Afwijking geconstateerd"),
                )
                db.add(check)
                created_checks += 1

    db.commit()
    return {
        "tenant": tenant_name,
        "masterdata": master_counts,
        "projects_created": created_projects,
        "welds_created": created_welds,
        "inspections_created": created_inspections,
        "checks_created": created_checks,
        "project_links_created": created_project_links,
        "reset_first": reset_first,
        "cleared": cleared,
    }


def ensure_demo_tenant_and_admin(
    db: Session,
    *,
    tenant_name: str = "demo",
    admin_email: str = "admin@demo.com",
    password_hash: str | None = None,
) -> tuple[Tenant, User | None]:
    tenant = db.query(Tenant).filter(Tenant.name == tenant_name).first()
    if not tenant:
        tenant = Tenant(name=tenant_name, is_active=True, status="trial")
        db.add(tenant)
        db.commit()
        db.refresh(tenant)

    user = None
    if admin_email:
        user = db.query(User).filter(User.email == admin_email.lower()).first()
        if user is None and password_hash is not None:
            user = User(email=admin_email.lower(), password_hash=password_hash, is_active=True)
            db.add(user)
            db.commit()
            db.refresh(user)

    return tenant, user
