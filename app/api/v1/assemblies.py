from __future__ import annotations

import json
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_tenant_id, get_current_user, get_db, require_tenant_write
from app.core.audit import audit
from app.db.models import Assembly, Attachment, Project, Weld
from app.schemas.assemblies import AssemblyCreate, AssemblyOut, AssemblyUpdate

router = APIRouter(prefix="/projects/{project_id}/assemblies", tags=["assemblies"])


def _get_project(db: Session, tenant_id, project_id: UUID) -> Project:
    project = db.query(Project).filter(Project.id == project_id, Project.tenant_id == tenant_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


def _get_assembly(db: Session, tenant_id, project_id: UUID, assembly_id: UUID) -> Assembly:
    assembly = db.query(Assembly).filter(Assembly.id == assembly_id, Assembly.project_id == project_id, Assembly.tenant_id == tenant_id).first()
    if not assembly:
        raise HTTPException(status_code=404, detail="Assembly not found")
    return assembly


def _meta_snapshot(assembly: Assembly) -> dict:
    return {
        'code': assembly.code,
        'name': assembly.name,
        'drawing_no': assembly.drawing_no,
        'revision': assembly.revision,
        'status': assembly.status,
        'notes': assembly.notes,
    }


@router.get("", response_model=List[AssemblyOut])
def list_assemblies(project_id: UUID, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), _user=Depends(get_current_user)):
    _get_project(db, tenant_id, project_id)
    return db.query(Assembly).filter(Assembly.project_id == project_id, Assembly.tenant_id == tenant_id).order_by(Assembly.updated_at.desc()).all()


@router.get("/{assembly_id}", response_model=AssemblyOut)
def get_assembly(project_id: UUID, assembly_id: UUID, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), _user=Depends(get_current_user)):
    _get_project(db, tenant_id, project_id)
    return _get_assembly(db, tenant_id, project_id, assembly_id)


@router.get("/{assembly_id}/welds")
def list_assembly_welds(project_id: UUID, assembly_id: UUID, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), _user=Depends(get_current_user)):
    _get_project(db, tenant_id, project_id)
    _get_assembly(db, tenant_id, project_id, assembly_id)
    rows = db.query(Weld).filter(Weld.project_id == project_id, Weld.assembly_id == assembly_id, Weld.tenant_id == tenant_id).order_by(Weld.updated_at.desc()).all()
    return {'items': [{'id': str(row.id), 'weld_number': row.weld_no, 'location': row.location, 'status': row.status, 'welder_name': row.welders, 'project_id': str(row.project_id), 'assembly_id': str(row.assembly_id) if row.assembly_id else None} for row in rows], 'total': len(rows), 'page': 1, 'limit': len(rows) or 10}


@router.get("/{assembly_id}/documents")
def list_assembly_documents(project_id: UUID, assembly_id: UUID, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), _user=Depends(get_current_user)):
    _get_project(db, tenant_id, project_id)
    _get_assembly(db, tenant_id, project_id, assembly_id)
    rows = db.query(Attachment).filter(Attachment.project_id == project_id, Attachment.assembly_id == assembly_id, Attachment.tenant_id == tenant_id).order_by(Attachment.created_at.desc()).all()
    return {'items': [{'id': str(row.id), 'title': row.filename, 'type': row.kind, 'status': 'beschikbaar', 'uploaded_at': row.created_at.isoformat() if row.created_at else None} for row in rows], 'total': len(rows), 'page': 1, 'limit': len(rows) or 10}


@router.get("/{assembly_id}/compliance")
def get_assembly_compliance(project_id: UUID, assembly_id: UUID, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), _user=Depends(get_current_user)):
    _get_project(db, tenant_id, project_id)
    assembly = _get_assembly(db, tenant_id, project_id, assembly_id)
    welds = db.query(Weld).filter(Weld.project_id == project_id, Weld.assembly_id == assembly_id, Weld.tenant_id == tenant_id).all()
    missing = []
    if not assembly.drawing_no:
        missing.append({'label': 'Tekeningnummer', 'reason': 'Assembly mist drawing_no.'})
    if not welds:
        missing.append({'label': 'Lassen', 'reason': 'Geen lassen gekoppeld aan assembly.'})
    score = max(0, 100 - (len(missing) * 25))
    return {
        'score': score,
        'missing_items': missing,
        'checklist': [
            {'label': 'Assembly basisgegevens', 'completed': bool(assembly.code and assembly.name)},
            {'label': 'Tekeningnummer', 'completed': bool(assembly.drawing_no)},
            {'label': 'Lassen gekoppeld', 'completed': bool(welds)},
        ],
    }


@router.post("", response_model=AssemblyOut)
def create_assembly(project_id: UUID, payload: AssemblyCreate, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), user=Depends(get_current_user), _write=Depends(require_tenant_write)):
    _get_project(db, tenant_id, project_id)
    assembly = Assembly(project_id=project_id, tenant_id=tenant_id, **payload.model_dump())
    db.add(assembly)
    db.commit()
    db.refresh(assembly)
    audit(db, tenant_id=str(tenant_id), user_id=str(getattr(user, 'id', '') or ''), action='assembly_create', entity='assembly', entity_id=str(assembly.id), meta={'project_id': str(project_id), 'after': _meta_snapshot(assembly)})
    return assembly


@router.patch("/{assembly_id}", response_model=AssemblyOut)
def update_assembly(project_id: UUID, assembly_id: UUID, payload: AssemblyUpdate, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), user=Depends(get_current_user), _write=Depends(require_tenant_write)):
    _get_project(db, tenant_id, project_id)
    assembly = _get_assembly(db, tenant_id, project_id, assembly_id)
    before = _meta_snapshot(assembly)
    changed = payload.model_dump(exclude_unset=True)
    for key, value in changed.items():
        setattr(assembly, key, value)
    db.commit()
    db.refresh(assembly)
    audit(db, tenant_id=str(tenant_id), user_id=str(getattr(user, 'id', '') or ''), action='assembly_update', entity='assembly', entity_id=str(assembly.id), meta={'project_id': str(project_id), 'before': before, 'after': _meta_snapshot(assembly), 'fields': sorted(changed.keys())})
    return assembly


@router.put("/{assembly_id}", response_model=AssemblyOut)
def update_assembly_put(project_id: UUID, assembly_id: UUID, payload: AssemblyUpdate, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), user=Depends(get_current_user), _write=Depends(require_tenant_write)):
    return update_assembly(project_id, assembly_id, payload, db=db, tenant_id=tenant_id, user=user)


@router.delete("/{assembly_id}")
def delete_assembly(project_id: UUID, assembly_id: UUID, db: Session = Depends(get_db), tenant_id=Depends(get_current_tenant_id), user=Depends(get_current_user), _write=Depends(require_tenant_write)):
    _get_project(db, tenant_id, project_id)
    assembly = _get_assembly(db, tenant_id, project_id, assembly_id)
    before = _meta_snapshot(assembly)
    db.delete(assembly)
    db.commit()
    audit(db, tenant_id=str(tenant_id), user_id=str(getattr(user, 'id', '') or ''), action='assembly_delete', entity='assembly', entity_id=str(assembly_id), meta={'project_id': str(project_id), 'before': before})
    return {"ok": True}
