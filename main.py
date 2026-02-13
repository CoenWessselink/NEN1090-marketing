from app.main import app
@app.get("/")
def root():
    return {"message": "NEN1090 API is running"}
