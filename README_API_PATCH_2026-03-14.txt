API patch uitgevoerd op 2026-03-14

Aangepast:
- CORS gecentraliseerd via settings.CORS_ORIGINS
- localhost:8080/127.0.0.1:8080 toegevoegd voor marketing lokaal testen
- CORS_ALLOW_CREDENTIALS setting toegevoegd
- APP_URL / MARKETING_URL / API_BASE_URL / DEMO_DEFAULT_PASSWORD settings toegevoegd
- /api/auth/* compatibiliteitsroutes toegevoegd naast /api/v1/auth/*
- /api/public/* en /api/v1/public/* toegevoegd voor config, demo, contact, checkout preview
- /api/v1/health gefixt zodat health endpoint niet crasht

Belangrijke endpoints:
- POST /api/v1/auth/login
- POST /api/auth/login
- GET /api/v1/auth/me
- GET /api/auth/me
- GET /api/v1/public/config
- GET /api/public/config
- POST /api/v1/public/demo/start
- POST /api/public/demo/start
- POST /api/v1/public/contact
- POST /api/public/contact
- POST /api/v1/public/checkout/create-session
- POST /api/public/checkout/create-session

Na uitpakken lokaal uitvoeren:
1. alembic upgrade head
2. python seed_admin.py
3. uvicorn app.main:app --reload --port 8000

Test login met:
tenant: demo
email: admin@demo.com
password: Admin123!
