# NEN10900-api FIX package

Deze set is aangepast om de Azure startup-fout te herstellen.

## Aangepast
- `requirements.txt` opgeschoond en FastAPI/Pydantic versies vastgezet
- echte `.gitignore` toegevoegd
- lokale rommel uitgesloten uit deployment:
  - `.git/`
  - `venv/`
  - `.env`
  - `storage/`
  - `*.db`
- nieuwe GitHub Action toegevoegd:
  - `.github/workflows/deploy_api_clean.yml`
- clean zip deployment naar Azure met `--clean true`
- startup command wordt opnieuw gezet na deploy

## Gebruik
Kopieer de inhoud van deze zip over je lokale `NEN10900-api` repo heen,
commit en push naar `main`.
