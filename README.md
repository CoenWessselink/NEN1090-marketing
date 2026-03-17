# NEN1090 API – fase 11

FastAPI backend voor projecten, assemblies, lassen, inspecties, foto's en CE export.

## Start lokaal

```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8010
```

## Endpoints

- `/health`
- `/api/v1/projects`
- `/api/v1/projects/import_bundle`
- `/api/v1/assemblies`
- `/api/v1/welds`
- `/api/v1/inspections`
- `/api/v1/photos`
- `/api/v1/ce_export/{project_id}`

## PostgreSQL

Gebruik `DATABASE_URL` uit `.env`.
