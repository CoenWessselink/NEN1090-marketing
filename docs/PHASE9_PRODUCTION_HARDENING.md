# Phase 9 – Production Hardening

## Added in this phase
- In-memory rate limiting middleware with configurable window and request cap.
- Security headers middleware with request-id propagation.
- RBAC permission matrix helper for future fine-grained checks.
- Ops endpoints for lightweight metrics, backup manifest generation and export retries.
- Export job resiliency fields: started_at, retry_count, error_code, error_detail.
- Backup manifest persistence for platform/tenant backup snapshots.
- Readiness and liveness endpoints.

## New endpoints
- `GET /api/v1/health`
- `GET /api/v1/livez`
- `GET /api/v1/readyz`
- `GET /api/v1/ops/metrics-lite`
- `POST /api/v1/ops/backups/manifest`
- `GET /api/v1/ops/backups/manifest`
- `POST /api/v1/ops/projects/{project_id}/exports/{export_id}/retry`
- `POST /api/v1/projects/{project_id}/exports/{export_id}/retry`

## Env vars
- `ENABLE_RATE_LIMIT`
- `RATE_LIMIT_MAX_REQUESTS`
- `RATE_LIMIT_WINDOW_SECONDS`
- `EXPORT_SYNC_ENABLED`
- `BACKUP_MANIFEST_DIR`

## Notes
- The export worker is still process-local. For full production, move retries/background work to a durable queue/worker.
- The backup manifest is a metadata snapshot, not a full database backup engine.
