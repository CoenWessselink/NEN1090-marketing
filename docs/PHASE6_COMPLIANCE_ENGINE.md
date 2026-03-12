# Phase 6 – ISO 5817 compliance engine

This build adds the first full compliance engine layer on top of the Phase 5 backbone.

## Added
- ISO 5817 reference defect catalog
- richer weld defect model (code, group, zone, severity, measured/permitted size, repair flags)
- weld inspection result entity
- auto-evaluation endpoint that summarizes weld quality status
- result upsert endpoint for manual review/approval

## Main endpoints
- `GET /api/v1/iso5817/reference-defects`
- `GET /api/v1/welds/{weld_id}/iso5817/result`
- `PUT /api/v1/welds/{weld_id}/iso5817/result`
- `POST /api/v1/welds/{weld_id}/iso5817/evaluate`
- existing `/projects/{project_id}/weld-defects` endpoints extended

## Quality status rules
- `rejected` if one or more defects are assessed as rejected
- `repair_required` if there are open defects or repair-required defects
- `pending` if VT result is still open/nok without final evaluation
- `accepted` if no open/rejected/repair-required defects remain
