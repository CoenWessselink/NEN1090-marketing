import os
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from .db import Base, engine, get_db
from . import crud, models, schemas

Base.metadata.create_all(bind=engine)

app = FastAPI(title="NEN1090 API", version="11.0.0")
origins = [x.strip() for x in os.getenv("CORS_ORIGINS", "*").split(",") if x.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins != ["*"] else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
API = os.getenv("API_PREFIX", "/api/v1")

@app.get("/health")
def health():
    return {"ok": True, "service": "nen1090-api", "version": "11.0.0"}

@app.get(f"{API}/projects")
def list_projects(db: Session = Depends(get_db)):
    rows = db.query(models.Project).order_by(models.Project.project_number.asc()).all()
    return [{"id": r.id, "project_number": r.project_number, "name": r.name, "client": r.client, "exc": r.exc, "acceptance_class": r.acceptance_class, "status": r.status} for r in rows]

@app.post(f"{API}/projects")
def create_or_update_project(payload: schemas.ProjectIn, db: Session = Depends(get_db)):
    row = crud.upsert_project(db, payload)
    db.commit()
    return {"ok": True, "id": row.id}

@app.get(f"{API}/assemblies")
def list_assemblies(project_id: str | None = None, db: Session = Depends(get_db)):
    q = db.query(models.Assembly)
    if project_id:
        q = q.filter(models.Assembly.project_id == project_id)
    rows = q.order_by(models.Assembly.code.asc()).all()
    return [{"id": r.id, "project_id": r.project_id, "code": r.code, "name": r.name, "drawing_no": r.drawing_no, "revision": r.revision, "status": r.status} for r in rows]

@app.post(f"{API}/assemblies")
def create_or_update_assembly(payload: schemas.AssemblyIn, db: Session = Depends(get_db)):
    row = crud.upsert_assembly(db, payload)
    db.commit()
    return {"ok": True, "id": row.id}

@app.get(f"{API}/welds")
def list_welds(project_id: str | None = None, db: Session = Depends(get_db)):
    q = db.query(models.Weld)
    if project_id:
        q = q.filter(models.Weld.project_id == project_id)
    rows = q.order_by(models.Weld.weld_no.asc()).all()
    return [{"id": r.id, "project_id": r.project_id, "assembly_id": r.assembly_id, "weld_no": r.weld_no, "location": r.location, "process": r.process, "material": r.material, "thickness": r.thickness, "welders": r.welders, "wps": r.wps, "vt_status": r.vt_status, "ndo_status": r.ndo_status, "status": r.status, "photos": r.photos} for r in rows]

@app.post(f"{API}/welds")
def create_or_update_weld(payload: schemas.WeldIn, db: Session = Depends(get_db)):
    row = crud.upsert_weld(db, payload)
    db.commit()
    return {"ok": True, "id": row.id}

@app.get(f"{API}/inspections")
def list_inspections(weld_id: str | None = None, db: Session = Depends(get_db)):
    q = db.query(models.Inspection)
    if weld_id:
        q = q.filter(models.Inspection.weld_id == weld_id)
    rows = q.order_by(models.Inspection.id.desc()).all()
    return [{"id": r.id, "weld_id": r.weld_id, "checks": r.checks} for r in rows]

@app.post(f"{API}/inspections")
def create_or_update_inspection(payload: schemas.InspectionIn, db: Session = Depends(get_db)):
    row = crud.upsert_inspection(db, payload)
    db.commit()
    return {"ok": True, "id": row.id}

@app.get(f"{API}/photos")
def list_photos(project_id: str | None = None, weld_id: str | None = None, db: Session = Depends(get_db)):
    q = db.query(models.Photo)
    if project_id:
        q = q.filter(models.Photo.project_id == project_id)
    if weld_id:
        q = q.filter(models.Photo.weld_id == weld_id)
    rows = q.order_by(models.Photo.captured_at.desc()).all()
    return [{"id": r.id, "project_id": r.project_id, "weld_id": r.weld_id, "name": r.name, "mime": r.mime, "captured_at": r.captured_at, "has_data": r.has_data} for r in rows]

@app.post(f"{API}/photos")
def create_or_update_photo(payload: schemas.PhotoIn, db: Session = Depends(get_db)):
    row = crud.upsert_photo(db, payload)
    db.commit()
    return {"ok": True, "id": row.id}

@app.post(f"{API}/projects/import_bundle")
def import_bundle(payload: schemas.ImportBundle, db: Session = Depends(get_db)):
    project = crud.upsert_project(db, payload.project)
    for row in payload.assemblies:
        crud.upsert_assembly(db, row)
    for row in payload.welds:
        crud.upsert_weld(db, row)
    for row in payload.inspections:
        crud.upsert_inspection(db, row)
    for row in payload.photos:
        crud.upsert_photo(db, row)
    db.commit()
    return {"ok": True, "project_id": project.id, "assemblies": len(payload.assemblies), "welds": len(payload.welds), "inspections": len(payload.inspections), "photos": len(payload.photos)}

@app.get(f"{API}/ce_export/{{project_id}}")
def ce_export(project_id: str, db: Session = Depends(get_db)):
    project = db.get(models.Project, project_id)
    assemblies = db.query(models.Assembly).filter(models.Assembly.project_id == project_id).all()
    welds = db.query(models.Weld).filter(models.Weld.project_id == project_id).all()
    inspections = db.query(models.Inspection).join(models.Weld, models.Weld.id == models.Inspection.weld_id).filter(models.Weld.project_id == project_id).all()
    photos = db.query(models.Photo).filter(models.Photo.project_id == project_id).all()
    complete = bool(project and assemblies and welds)
    return {
        "generated_at": __import__('datetime').datetime.utcnow().isoformat() + 'Z',
        "ready_for_export": complete,
        "project": None if project is None else {"id": project.id, "project_number": project.project_number, "name": project.name, "client": project.client, "exc": project.exc, "acceptance_class": project.acceptance_class, "status": project.status},
        "assemblies": [{"id": x.id, "code": x.code, "name": x.name, "drawing_no": x.drawing_no, "revision": x.revision, "status": x.status} for x in assemblies],
        "welds": [{"id": x.id, "weld_no": x.weld_no, "location": x.location, "process": x.process, "material": x.material, "thickness": x.thickness, "welders": x.welders, "wps": x.wps, "vt_status": x.vt_status, "ndo_status": x.ndo_status, "status": x.status, "photos": x.photos} for x in welds],
        "inspections": [{"id": x.id, "weld_id": x.weld_id, "checks": x.checks} for x in inspections],
        "photos": [{"id": x.id, "weld_id": x.weld_id, "name": x.name, "mime": x.mime, "captured_at": x.captured_at, "has_data": x.has_data} for x in photos],
        "counts": {"assemblies": len(assemblies), "welds": len(welds), "inspections": len(inspections), "photos": len(photos)}
    }
