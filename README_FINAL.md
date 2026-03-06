# NEN10900 API final rebuild

Dit pakket is opgeschoond en bedoeld om de API-repo opnieuw goed te zetten.

Inhoud:
- exact 1 workflow: `.github/workflows/deploy_api_clean.yml`
- opgeschoonde `requirements.txt`
- correcte `.gitignore`
- geen `.git`, `venv`, `.python_packages`, `.env`, `storage`

Gebruik:
1. Maak lokaal een backup van `C:\NEN1090\NEN10900-api`
2. Pak deze zip uit over `C:\NEN1090\NEN10900-api`
3. Controleer dat in `.github\workflows` alleen `deploy_api_clean.yml` staat
4. Push:
   git add -A
   git commit -m "Apply rebuilt final API package"
   git push
