
# Phase 7 – CE dossier export

## Toegevoegd
- `app/services/ce_dossier_service.py`
- preview endpoint: `GET /api/v1/projects/{project_id}/ce-dossier/preview`
- export endpoint: `POST /api/v1/projects/{project_id}/ce-dossier/export`
- download endpoint: `GET /api/v1/projects/{project_id}/exports/{export_id}/download`
- Alembic migratie `0016_phase7_ce_dossier_export.py`

## Wat de service bundelt
- projectgegevens
- assemblies
- welds
- inspectieresultaten
- NDT records
- materials
- audit log
- completeness matrix

## Export output
Deze fase maakt een echte ZIP-bundel met JSON en TXT dossierbestanden. Volledige PDF-opmaak kan in een vervolgfase worden toegevoegd zonder de API-structuur te wijzigen.
