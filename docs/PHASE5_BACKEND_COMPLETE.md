# Phase 5 backend complete

Deze build maakt fase 5 inhoudelijk veel completer.

## Toegevoegd
- Alembic migratie `0014_phase5_backbone.py`
- Assemblies als expliciete tussenlaag tussen project en las
- `assembly_id` koppeling op `welds`
- Volledige CRUD voor:
  - assemblies
  - materials
  - NDT records
  - welders
  - WPS
  - WPQR
  - export jobs
- Audit hooks voor create/update/delete op fase-5 entiteiten
- Uitgebreide Pydantic update-schema's voor compliance en exports

## Doelstructuur
Project -> Assemblies -> Welds -> inspections/NDT/materials/welder/certificates

## Nog niet volledig eindfase
- Volledige CE-dossier generatiepipeline
- Bestandsopslag en export-bestanden schrijven
- Frontendkoppeling van alle nieuwe tabbladen
- Geautomatiseerde tests
