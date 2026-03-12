# Phase 5 backend start

Deze build zet de definitieve SaaS-ruggengraat neer voor:
- assemblies
- materials
- welders
- WPS / WPQR
- NDT
- export jobs

## Doelstructuur
Project -> Assemblies -> Welds -> Inspecties/NDT/Documenten/Export

## Nieuw in deze build
- SQLAlchemy modellen voor assemblies, material records, welder profiles, WPS, WPQR, NDT en export jobs
- nieuwe API-routes voor bovenstaande domeinen
- schemas toegevoegd voor stabiele request/response contracten
- export jobs staan nu als echte entiteit klaar voor fase 7 CE-dossier pipeline

## Nog niet af in fase 5 start
- alembic migratiebestand
- volledige CRUD voor alle nieuwe objecten
- koppeling naar document storage
- completeness checks
- workflow dashboard in frontend
