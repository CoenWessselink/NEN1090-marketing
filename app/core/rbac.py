from __future__ import annotations

ROLE_PERMISSIONS = {
    'platform_admin': {
        'platform.read', 'platform.write', 'tenant.read', 'tenant.write', 'tenant.users.manage',
        'project.read', 'project.write', 'inspection.read', 'inspection.write', 'export.read', 'export.write',
    },
    'tenant_admin': {
        'tenant.read', 'tenant.write', 'tenant.users.manage', 'project.read', 'project.write',
        'inspection.read', 'inspection.write', 'export.read', 'export.write',
    },
    'planner': {'project.read', 'project.write', 'inspection.read', 'export.read'},
    'qc': {'project.read', 'inspection.read', 'inspection.write', 'export.read', 'export.write'},
    'inspector': {'project.read', 'inspection.read', 'inspection.write'},
    'viewer': {'project.read', 'inspection.read', 'export.read'},
}


def has_permission(role: str | None, permission: str) -> bool:
    if not role:
        return False
    return permission in ROLE_PERMISSIONS.get(role, set())
