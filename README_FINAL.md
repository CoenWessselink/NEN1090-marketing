# NEN10900 API - final clean package

Dit pakket bevat:
- 1 enkele Azure workflow: `.github/workflows/deploy_api_clean.yml`
- opgeschoonde `requirements.txt`
- correcte `.gitignore`
- geen `.git`, `.python_packages`, `venv`, `storage`, `.env`

## Gebruik
1. Pak uit over `C:\NEN1090\NEN10900-api`
2. Controleer dat in `.github\workflows` alleen `deploy_api_clean.yml` staat
3. Push:

```powershell
cd C:\NEN1090\NEN10900-api
git add -A
git commit -m "Apply final clean API package"
git push
```
