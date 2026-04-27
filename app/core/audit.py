import json
from sqlalchemy.orm import Session
from app.db.models import AuditLog

def audit(db: Session, *, tenant_id: str, user_id: str | None, action: str, entity: str = "", entity_id: str = "", ip: str = "", user_agent: str = "", meta: dict | None = None):
    rec = AuditLog(
        tenant_id=tenant_id,
        user_id=user_id,
        action=action,
        entity=entity,
        entity_id=entity_id,
        ip=ip,
        user_agent=user_agent,
        meta=json.dumps(meta or {}, ensure_ascii=False),
    )
    db.add(rec)
    db.commit()
