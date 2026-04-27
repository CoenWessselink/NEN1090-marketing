from sqlalchemy.orm import Session
from . import models, schemas

def upsert_project(db: Session, data: schemas.ProjectIn):
    row = db.get(models.Project, data.id) or models.Project(id=data.id)
    row.project_number = data.project_number or data.nummer or data.id
    row.name = data.name or data.naam or ""
    row.client = data.client or data.opdrachtgever or ""
    row.exc = data.exc
    row.acceptance_class = data.acceptance_class or data.acceptatieklasse or "5817-B"
    row.status = data.status
    db.add(row)
    db.flush()
    return row

def upsert_assembly(db: Session, data: schemas.AssemblyIn):
    row = db.get(models.Assembly, data.id) or models.Assembly(id=data.id)
    row.project_id = data.project_id or data.projectId
    row.code = data.code
    row.name = data.name
    row.drawing_no = data.drawing_no or data.drawingNo or ""
    row.revision = data.revision
    row.status = data.status
    row.notes = data.notes
    db.add(row)
    db.flush()
    return row

def upsert_weld(db: Session, data: schemas.WeldIn):
    row = db.get(models.Weld, data.id) or models.Weld(id=data.id)
    row.project_id = data.project_id or data.projectId
    row.assembly_id = data.assembly_id or data.assemblyId
    row.weld_no = data.weld_no or data.weldNo or data.id
    row.location = data.location or data.locatie or ""
    row.process = data.process or data.proces or ""
    row.material = data.material or data.materiaal or ""
    row.thickness = data.thickness or data.dikte or ""
    row.welders = data.welders or data.lassers or ""
    row.wps = data.wps or ""
    row.vt_status = data.vt_status or data.vtStatus or "open"
    row.ndo_status = data.ndo_status or data.ndoStatus or "nvt"
    row.status = data.status
    row.photos = data.photos if data.photos is not None else (data.fotos or 0)
    db.add(row)
    db.flush()
    return row

def upsert_inspection(db: Session, data: schemas.InspectionIn):
    row = db.query(models.Inspection).filter(models.Inspection.weld_id == data.weld_id).one_or_none()
    if row is None:
        row = models.Inspection(weld_id=data.weld_id)
    row.checks = data.checks
    db.add(row)
    db.flush()
    return row

def upsert_photo(db: Session, data: schemas.PhotoIn):
    row = db.get(models.Photo, data.id) or models.Photo(id=data.id)
    row.project_id = data.project_id
    row.weld_id = data.weld_id
    row.name = data.name
    row.mime = data.mime
    row.captured_at = data.captured_at
    row.has_data = data.has_data
    db.add(row)
    db.flush()
    return row
