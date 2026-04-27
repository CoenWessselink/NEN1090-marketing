from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.audit import audit


def log_phase5_event(
    db: Session,
    *,
    tenant_id: UUID | str,
    user_id: UUID | str | None,
    action: str,
    entity: str,
    entity_id: UUID | str,
    meta: dict[str, Any] | None = None,
) -> None:
    audit(
        db,
        tenant_id=str(tenant_id),
        user_id=str(user_id) if user_id else None,
        action=action,
        entity=entity,
        entity_id=str(entity_id),
        meta=meta or {},
    )
