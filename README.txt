NEN1090 Phase 3 Backend – v14 (All-in-one pack)

Default demo admin (seed_admin.py):
  Tenant:   demo
  Email:    admin@demo.com
  Password: Admin123!

Important (Azure PostgreSQL username):
  Use ONLY the username, e.g. "nen1090admin"
  Do NOT use "nen1090admin@<server>" in DB_USER.

Quick start (Windows):
  1) cd backend
  2) copy .env.example .env  (fill DB_PASSWORD + secrets)
  3) run_backend.bat
  4) venv\Scripts\activate
  5) python seed_admin.py

Health check:
  http://127.0.0.1:8001/health
  http://127.0.0.1:8001/api/health

Tip:
  - If /health returns db=not_configured, your DB_* or DATABASE_URL in .env are still empty.


=== AUTH QUICK TEST ===
1) Seed admin (creates tenant 'demo' + admin user)
   python seed_admin.py

2) Login
   curl -X POST http://127.0.0.1:8001/api/v1/auth/login \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"admin@demo.com\",\"password\":\"Admin123!\",\"tenant\":\"demo\"}"

3) Me (replace TOKEN)
   curl http://127.0.0.1:8001/api/v1/auth/me -H "Authorization: Bearer TOKEN"
