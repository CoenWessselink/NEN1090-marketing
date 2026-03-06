from __future__ import annotations

from typing import Dict, List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user, get_current_tenant_id
from app.db.models import Weld, Project

router = APIRouter(prefix="/welds", tags=["welds-admin"])


DEMO_WELDS: Dict[str, List[dict]] = {
    "P-1001": [
        {"weld_no": "W-001", "location": "Frame A – ligger L1", "process": "135", "material": "S355", "thickness": "8", "welders": "J. de Vries", "vt_status": "open", "ndo_status": "nvt", "photos": 0, "status": "open"},
        {"weld_no": "W-002", "location": "Kolom K2 – voetplaat", "process": "111", "material": "S235", "thickness": "12", "welders": "A. Jansen", "vt_status": "ok", "ndo_status": "open", "photos": 1, "status": "in_controle"},
    ],
    "P-1002": [
        {"weld_no": "W-101", "location": "Rooster – randprofiel", "process": "135", "material": "S355", "thickness": "6", "welders": "S. Bakker", "vt_status": "ok", "ndo_status": "nvt", "photos": 0, "status": "conform"},
    ],
}


@router.post("/seed_demo")
def seed_demo_welds(
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    _user=Depends(get_current_user),
):
    """Seed demo welds for demo projects (idempotent)."""
    created = 0
    touched_projects = 0

    projects = db.query(Project).filter(Project.tenant_id == tenant_id).all()
    by_code = { (p.code or ""): p for p in projects }
    for code, weld_list in DEMO_WELDS.items():
        p = by_code.get(code)
        if not p:
            continue
        touched_projects += 1
        for w in weld_list:
            exists = (
                db.query(Weld)
                .filter(Weld.tenant_id == tenant_id, Weld.project_id == p.id, Weld.weld_no == w["weld_no"])
                .first()
            )
            if exists:
                continue
            db.add(Weld(tenant_id=tenant_id, project_id=p.id, **w))
            created += 1

    db.commit()
    return {"ok": True, "projects": touched_projects, "created": created}


@router.delete("")
def clear_all_welds(
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    _user=Depends(get_current_user),
):
    n = db.query(Weld).filter(Weld.tenant_id == tenant_id).delete(synchronize_session=False)
    db.commit()
    return {"ok": True, "deleted": n}
