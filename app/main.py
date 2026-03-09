from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, projects

app = FastAPI(
    title="NEN1090 API",
    version="1.0"
)

# ---------------------------------------------------
# CORS CONFIGURATIE (BELANGRIJK)
# ---------------------------------------------------

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://nen1090-marketing.pages.dev",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------
# ROUTES
# ---------------------------------------------------

app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(projects.router, prefix="/api/v1/projects", tags=["projects"])


# ---------------------------------------------------
# HEALTH CHECK
# ---------------------------------------------------

@app.get("/health")
def health():
    return {"status": "ok"}