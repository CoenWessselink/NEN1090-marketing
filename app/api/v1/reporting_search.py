from __future__ import annotations

import json
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.api.deps import get_current_tenant_id, get_current_user, get_db
from app.db.models import AuditLog, Assembly, Attachment, Document, Project, Weld, WeldInspection

router = APIRouter(tags=["reporting-search"])


def _like(value: str | None) -> str | None:
    if not value:
        return None
    token = value.strip()
    return f"%{token}%" if token else None


@router.get('/search')
def global_search(
    q: str = Query(..., min_length=2),
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    _user=Depends(get_current_user),
):
    token = _like(q)
    projects = db.query(Project).filter(
        Project.tenant_id == tenant_id,
        or_(Project.code.ilike(token), Project.name.ilike(token), Project.client_name.ilike(token)),
    ).order_by(Project.updated_at.desc()).limit(8).all()
    assemblies = db.query(Assembly).filter(
        Assembly.tenant_id == tenant_id,
        or_(Assembly.code.ilike(token), Assembly.name.ilike(token), Assembly.drawing_no.ilike(token)),
    ).order_by(Assembly.updated_at.desc()).limit(8).all()
    welds = db.query(Weld).filter(
        Weld.tenant_id == tenant_id,
        or_(Weld.weld_no.ilike(token), Weld.location.ilike(token), Weld.wps.ilike(token), Weld.welders.ilike(token)),
    ).order_by(Weld.updated_at.desc()).limit(8).all()
    documents = db.query(Document).filter(
        Document.tenant_id == tenant_id,
        or_(Document.filename.ilike(token), Document.kind.ilike(token)),
    ).order_by(Document.created_at.desc()).limit(8).all()
    inspections = db.query(WeldInspection).filter(
        WeldInspection.tenant_id == tenant_id,
        or_(WeldInspection.inspector.ilike(token), WeldInspection.overall_status.ilike(token), WeldInspection.remarks.ilike(token)),
    ).order_by(WeldInspection.updated_at.desc()).limit(8).all()
    return {
        'projects': [
            {
                'id': str(row.id), 'name': row.name, 'projectnummer': row.code, 'client_name': row.client_name,
                'status': row.status, 'execution_class': row.execution_class,
            } for row in projects
        ],
        'assemblies': [
            {
                'id': str(row.id), 'project_id': str(row.project_id), 'code': row.code, 'name': row.name, 'status': row.status,
            } for row in assemblies
        ],
        'welds': [
            {
                'id': str(row.id), 'project_id': str(row.project_id), 'assembly_id': str(row.assembly_id) if getattr(row, 'assembly_id', None) else None,
                'weld_number': row.weld_no, 'location': row.location, 'status': row.status,
                'welder_name': row.welders, 'project_name': row.project.name if getattr(row, 'project', None) else None,
            } for row in welds
        ],
        'documents': [
            {
                'id': str(row.id), 'title': row.filename, 'type': row.kind, 'status': 'beschikbaar',
                'project_name': row.project.name if getattr(row, 'project', None) else None,
            } for row in documents
        ],
        'inspections': [
            {
                'id': str(row.id), 'project_id': str(row.project_id), 'weld_id': str(row.weld_id),
                'status': row.overall_status, 'result': row.overall_status, 'inspector': row.inspector,
            } for row in inspections
        ],
    }


@router.get('/planning')
def list_planning(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=200),
    search: str | None = Query(default=None),
    status: str | None = Query(default=None),
    sort: str = Query('start_date'),
    direction: str = Query('asc'),
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    _user=Depends(get_current_user),
):
    q = db.query(Weld).join(Project, Project.id == Weld.project_id).filter(Weld.tenant_id == tenant_id)
    token = _like(search)
    if token:
        q = q.filter(or_(Weld.weld_no.ilike(token), Weld.location.ilike(token), Weld.welders.ilike(token), Project.name.ilike(token)))
    if status:
        q = q.filter(Weld.status == status)
    total = q.count()
    sort_map = {
        'title': Weld.weld_no,
        'project_name': Project.name,
        'assignee': Weld.welders,
        'start_date': Project.start_date,
        'end_date': Project.end_date,
        'status': Weld.status,
    }
    order_col = sort_map.get(sort, Project.start_date)
    q = q.order_by(order_col.desc() if direction == 'desc' else order_col.asc())
    rows = q.offset((page - 1) * limit).limit(limit).all()
    return {
        'items': [
            {
                'id': str(row.id), 'title': row.weld_no, 'project_name': row.project.name if row.project else None,
                'assignee': row.welders, 'start_date': row.project.start_date.isoformat() if row.project and row.project.start_date else None,
                'end_date': row.project.end_date.isoformat() if row.project and row.project.end_date else None,
                'status': row.status,
            } for row in rows
        ],
        'total': total,
        'page': page,
        'limit': limit,
    }


@router.get('/reports')
def list_reports(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=200),
    search: str | None = Query(default=None),
    status: str | None = Query(default=None),
    sort: str = Query('created_at'),
    direction: str = Query('desc'),
    db: Session = Depends(get_db),
    tenant_id=Depends(get_current_tenant_id),
    _user=Depends(get_current_user),
):
    q = db.query(AuditLog).filter(AuditLog.tenant_id == tenant_id)
    token = _like(search)
    if token:
        q = q.filter(or_(AuditLog.action.ilike(token), AuditLog.entity.ilike(token), AuditLog.entity_id.ilike(token), AuditLog.meta.ilike(token)))
    items = []
    for row in q.order_by(AuditLog.created_at.desc()).all():
        action = (row.action or '').lower()
        computed_status = 'gereed' if any(flag in action for flag in ['create', 'update', 'approve', 'conform', 'export']) else 'concept'
        if status and computed_status != status:
            continue
        meta = {}
        try:
            meta = json.loads(row.meta or '{}')
        except Exception:
            meta = {}
        items.append({
            'id': str(row.id),
            'title': f"{row.entity or 'record'} · {row.action}",
            'type': row.entity or 'audit',
            'status': computed_status,
            'owner': str(row.user_id or meta.get('user_email') or 'systeem'),
            'created_at': row.created_at.isoformat() if row.created_at else None,
        })
    sort_key = sort if sort in {'title', 'type', 'status', 'owner', 'created_at'} else 'created_at'
    items.sort(key=lambda x: str(x.get(sort_key) or ''), reverse=(direction == 'desc'))
    total = len(items)
    paged = items[(page - 1) * limit: page * limit]
    return {'items': paged, 'total': total, 'page': page, 'limit': limit}
