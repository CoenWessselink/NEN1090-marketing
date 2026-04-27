# NEN10900 API - Azure ready package

Deze zip bevat een opgeschoonde API-set voor Azure App Service.

## Inhoud
- exact 1 workflow: `.github/workflows/deploy_api_clean.yml`
- vaste FastAPI/Pydantic versies
- geen `.git`, `venv`, `.python_packages`, `storage`, `.env`

## Azure startup command
Zet in Azure App Service handmatig:

export PYTHONPATH=/home/site/wwwroot/.python_packages/lib/site-packages:$PYTHONPATH && gunicorn -k uvicorn.workers.UvicornWorker main:app --bind 0.0.0.0:$PORT --workers 2 --timeout 120

## Gebruik
1. Pak deze zip uit over `C:\NEN1090\NEN10900-api`
2. Controleer dat in `.github\workflows` alleen `deploy_api_clean.yml` staat
3. Push:
   git add -A
   git commit -m "Apply Azure ready API package"
   git push
