from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Routers
from app.api.v1.auth import router as auth_router

# -------------------------------------------------
# FASTAPI APP
# -------------------------------------------------

app = FastAPI(
    title="NEN1090 API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# -------------------------------------------------
# CORS CONFIG
# -------------------------------------------------

origins = [
    # Local development
    "http://localhost:5173",
    "http://127.0.0.1:5173",

    # Cloudflare Pages
    "https://nen1090.pages.dev",

    # toekomstige productie
    "https://app.nen1090.nl",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------------------------
# ROUTERS
# -------------------------------------------------

app.include_router(auth_router, prefix="/api/v1/auth", tags=["Auth"])

# -------------------------------------------------
# HEALTH CHECK
# -------------------------------------------------

@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "nen1090-api"
    }

# -------------------------------------------------
# ROOT
# -------------------------------------------------

@app.get("/")
def root():
    return {
        "message": "NEN1090 API running"
    }
