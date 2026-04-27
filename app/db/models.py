import uuid
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Date, Boolean, ForeignKey, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

class Tenant(Base):
    __tablename__ = "tenants"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(200), nullable=False, unique=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Platform / billing fields (Phase 4.0 - Klantbeheer Fase 1)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")  # active | trial | suspended | cancelled
    trial_until: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    valid_until: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    seats_purchased: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    price_per_seat_year_cents: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    billing_provider: Mapped[str] = mapped_column(String(50), nullable=False, default="none")  # none | mollie
    mollie_customer_id: Mapped[str | None] = mapped_column(String(120), nullable=True)
    mollie_subscription_id: Mapped[str | None] = mapped_column(String(120), nullable=True)
    webhook_token: Mapped[str] = mapped_column(String(64), nullable=False, default="")  # for Mollie webhook URLs

    # Mollie subscription status cache (Phase 4.4 - Klantbeheer Fase 5)
    mollie_subscription_status: Mapped[str | None] = mapped_column(String(50), nullable=True)
    mollie_next_payment_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    mollie_subscription_status_updated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Billing seat change scheduling (Phase 4.5 - Klantbeheer Fase 6)
    pending_seats: Mapped[int | None] = mapped_column(Integer, nullable=True)
    pending_seats_effective_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class User(Base):
    __tablename__ = "users"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(320), nullable=False, unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

class TenantUser(Base):
    __tablename__ = "tenant_users"
    __table_args__ = (UniqueConstraint("tenant_id", "user_id", name="uq_tenant_user"),)
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    role: Mapped[str] = mapped_column(String(50), nullable=False, default="viewer")  # platform_admin/tenant_admin/qc/auditor/viewer
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

class RefreshToken(Base):
    __tablename__ = "refresh_tokens"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    token_hash: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    revoked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)

class AuditLog(Base):
    __tablename__ = "audit_log"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    entity: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    entity_id: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    ip: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    user_agent: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    meta: Mapped[str] = mapped_column(Text, nullable=False, default="{}")


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    token_hash: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    jti: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(320), nullable=False, index=True)
    issued_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    used_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class AuthRateLimitEvent(Base):
    __tablename__ = "auth_rate_limit_events"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    action: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    subject_key: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False, index=True)


class Payment(Base):
    __tablename__ = "payments"
    __table_args__ = (UniqueConstraint("provider", "provider_payment_id", name="uq_payment_provider_pid"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)

    provider: Mapped[str] = mapped_column(String(50), nullable=False, default="manual")  # manual | mollie | stripe | etc.
    provider_payment_id: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    type: Mapped[str] = mapped_column(String(50), nullable=False, default="subscription")
    amount_cents: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="EUR")
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="created")  # created|paid|failed|refunded|cancelled
    paid_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    meta: Mapped[str] = mapped_column(Text, nullable=False, default="{}")



# =========================
# Domain models (Phase 3)
# =========================
class Project(Base):
    __tablename__ = "projects"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)

    # NOTE: The original Phase 3 backend started with a minimal Project model.
    # The frontend (Projecten) already has a richer table (projectnummer/naam/opdrachtgever/exc/acceptatie/status).
    # We store those fields explicitly so Projecten can become API-backed without changing the UI.
    code = Column(String(50), nullable=True, index=True)  # projectnummer (e.g. P-1001)
    name = Column(String(255), nullable=False)  # projectnaam
    client_name = Column(String(255), nullable=True)  # opdrachtgever
    execution_class = Column(String(10), nullable=True)  # EXC1..EXC4
    acceptance_class = Column(String(10), nullable=True)  # A/B/C/D
    locked = Column(Boolean, nullable=False, server_default="false")
    status = Column(String(30), nullable=False, default="in_controle")  # in_controle|conform|afgekeurd|locked

    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    tenant = relationship("Tenant", backref="projects")


class Weld(Base):
    __tablename__ = "welds"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)

    weld_no = Column(String(50), nullable=False)  # e.g. "L-001"
    location = Column(String(255), nullable=True)
    wps = Column(String(100), nullable=True)

    # UI-aligned weld fields (Phase 3.2)
    process = Column(String(20), nullable=True)
    material = Column(String(80), nullable=True)
    thickness = Column(String(30), nullable=True)
    welders = Column(String(255), nullable=True)
    vt_status = Column(String(30), nullable=True)
    ndo_status = Column(String(30), nullable=True)
    photos = Column(Integer, nullable=False, server_default="0")
    status = Column(String(30), nullable=False, server_default="open")  # open|in_controle|conform|afgekeurd|locked

    result = Column(String(20), nullable=False, default="pending")  # pending|ok|nok
    inspector = Column(String(120), nullable=True)
    inspected_at = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    tenant = relationship("Tenant")
    project = relationship("Project", backref="welds")


class Document(Base):
    __tablename__ = "documents"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="SET NULL"), nullable=True, index=True)

    kind = Column(String(50), nullable=False, default="generic")  # e.g. certificate|drawing|wps|report
    filename = Column(String(255), nullable=False)
    content_type = Column(String(120), nullable=True)

    # in Phase 3 we keep it simple: store a path reference. Later: blob storage.
    storage_path = Column(String(500), nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    tenant = relationship("Tenant")
    project = relationship("Project", backref="documents")


# =========================
# Lasinspecties (Phase 3.3)
# =========================


class WeldInspection(Base):
    __tablename__ = "weld_inspections"
    __table_args__ = (UniqueConstraint("tenant_id", "weld_id", name="uq_tenant_weld_inspection"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    weld_id = Column(UUID(as_uuid=True), ForeignKey("welds.id", ondelete="CASCADE"), nullable=False, index=True)

    inspector = Column(String(120), nullable=True)
    inspected_at = Column(DateTime(timezone=True), nullable=True)
    overall_status = Column(String(20), nullable=False, server_default="open")  # open|ok|nok|nvt
    remarks = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    tenant = relationship("Tenant")
    project = relationship("Project")
    weld = relationship("Weld", backref="inspection")


class InspectionCheck(Base):
    __tablename__ = "inspection_checks"
    __table_args__ = (UniqueConstraint("inspection_id", "criterion_key", name="uq_inspection_criterion"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    inspection_id = Column(UUID(as_uuid=True), ForeignKey("weld_inspections.id", ondelete="CASCADE"), nullable=False, index=True)

    group_key = Column(String(20), nullable=False, server_default="pre")
    criterion_key = Column(String(120), nullable=False)
    applicable = Column(Boolean, nullable=False, server_default="true")
    approved = Column(Boolean, nullable=False, server_default="false")
    comment = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    tenant = relationship("Tenant")
    inspection = relationship("WeldInspection", backref="checks")


# =========================
# Phase 1: EXC templates + project selections (WPS / materials / welders)
# =========================


class InspectionPlanTemplate(Base):
    __tablename__ = "inspection_plan_templates"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(200), nullable=False)
    exc_class = Column(String(10), nullable=False)
    version = Column(Integer, nullable=False, default=1)
    is_default = Column(Boolean, nullable=False, default=False)
    # keep JSON as text for simplicity; API treats it as list
    items_json = Column(Text, nullable=False, default="[]")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    tenant = relationship("Tenant")


class WpsMaster(Base):
    __tablename__ = "wps_master"
    __table_args__ = (UniqueConstraint("tenant_id", "code", name="uq_wps_master_code"),)
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    code = Column(String(80), nullable=False)
    title = Column(String(255), nullable=True)
    kind = Column(String(10), nullable=False, server_default='WPS')  # WPS/WPQR
    document_no = Column(String(100), nullable=True)
    version = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class MaterialMaster(Base):
    __tablename__ = "materials_master"
    __table_args__ = (UniqueConstraint("tenant_id", "code", name="uq_materials_master_code"),)
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    code = Column(String(80), nullable=False)
    title = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class WelderMaster(Base):
    __tablename__ = "welders_master"
    __table_args__ = (UniqueConstraint("tenant_id", "code", name="uq_welders_master_code"),)
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    code = Column(String(80), nullable=False)
    name = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class ProjectWps(Base):
    __tablename__ = "project_wps"
    __table_args__ = (UniqueConstraint("project_id", "ref_id", name="uq_project_wps"),)
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    ref_id = Column(UUID(as_uuid=True), ForeignKey("wps_master.id", ondelete="CASCADE"), nullable=False)
    added_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    added_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class ProjectMaterial(Base):
    __tablename__ = "project_materials"
    __table_args__ = (UniqueConstraint("project_id", "ref_id", name="uq_project_materials"),)
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    ref_id = Column(UUID(as_uuid=True), ForeignKey("materials_master.id", ondelete="CASCADE"), nullable=False)
    added_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    added_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class ProjectWelder(Base):
    __tablename__ = "project_welders"
    __table_args__ = (UniqueConstraint("project_id", "ref_id", name="uq_project_welders"),)
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    ref_id = Column(UUID(as_uuid=True), ForeignKey("welders_master.id", ondelete="CASCADE"), nullable=False)
    added_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    added_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


# =========================
# Phase 2: Uniform attachments (multi-upload + list + delete)
# =========================


class Attachment(Base):
    __tablename__ = "attachments"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)

    scope_type = Column(String(40), nullable=False, index=True)  # company/project/weld/inspection/wps/material/other
    scope_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    kind = Column(String(50), nullable=False, index=True)  # certificate/wps/wpqr/report/drawing/photo/other

    filename = Column(String(255), nullable=False)
    storage_path = Column(String(700), nullable=False)
    mime_type = Column(String(160), nullable=True)
    size_bytes = Column(Integer, nullable=False, default=0)
    valid_until = Column(Date, nullable=True)
    meta_json = Column(Text, nullable=False, default="{}")

    uploaded_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    tenant = relationship("Tenant")

class WeldDefect(Base):
    __tablename__ = "weld_defects"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    weld_id = Column(UUID(as_uuid=True), ForeignKey("welds.id", ondelete="CASCADE"), nullable=False, index=True)
    inspection_id = Column(UUID(as_uuid=True), ForeignKey("weld_inspections.id", ondelete="CASCADE"), nullable=True, index=True)

    iso5817_level_used = Column(String(2), nullable=False)  # B/C/D
    defect_type = Column(String(80), nullable=False)
    description = Column(Text, nullable=True)
    assessment = Column(String(30), nullable=False, default="open")  # open/accepted/rejected/repaired
    evidence_attachment_ids = Column(Text, nullable=False, default="[]")  # JSON array of attachment UUIDs

    created_by = Column(UUID(as_uuid=True), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    deleted_at = Column(DateTime, nullable=True)


# =========================
# Phase 5: Definitive SaaS backbone
# =========================
class Assembly(Base):
    __tablename__ = "assemblies"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)

    code = Column(String(50), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    drawing_no = Column(String(120), nullable=True)
    revision = Column(String(40), nullable=True)
    status = Column(String(30), nullable=False, server_default="open")
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    tenant = relationship("Tenant")
    project = relationship("Project", backref="assemblies")


class MaterialRecord(Base):
    __tablename__ = "material_records"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    assembly_id = Column(UUID(as_uuid=True), ForeignKey("assemblies.id", ondelete="SET NULL"), nullable=True, index=True)

    heat_no = Column(String(120), nullable=True)
    material_grade = Column(String(120), nullable=False)
    profile = Column(String(120), nullable=True)
    dimensions = Column(String(120), nullable=True)
    quantity = Column(Integer, nullable=False, server_default="1")
    certificate_no = Column(String(120), nullable=True)
    status = Column(String(30), nullable=False, server_default="available")
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    tenant = relationship("Tenant")
    project = relationship("Project", backref="material_records")
    assembly = relationship("Assembly", backref="material_records")


class WelderProfile(Base):
    __tablename__ = "welder_profiles"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)

    employee_no = Column(String(50), nullable=True)
    name = Column(String(200), nullable=False)
    process_scope = Column(String(120), nullable=True)
    qualification = Column(String(120), nullable=True)
    certificate_no = Column(String(120), nullable=True)
    certificate_valid_until = Column(Date, nullable=True)
    is_active = Column(Boolean, nullable=False, server_default="true")
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    tenant = relationship("Tenant", backref="welder_profiles")


class WPSRecord(Base):
    __tablename__ = "wps_records"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)

    code = Column(String(120), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    process = Column(String(50), nullable=True)
    base_material = Column(String(120), nullable=True)
    filler_material = Column(String(120), nullable=True)
    thickness_range = Column(String(120), nullable=True)
    revision = Column(String(40), nullable=True)
    is_active = Column(Boolean, nullable=False, server_default="true")
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    tenant = relationship("Tenant", backref="wps_records")


class WPQRRecord(Base):
    __tablename__ = "wpqr_records"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)

    code = Column(String(120), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    process = Column(String(50), nullable=True)
    test_standard = Column(String(120), nullable=True)
    result = Column(String(30), nullable=False, server_default="approved")
    revision = Column(String(40), nullable=True)
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    tenant = relationship("Tenant", backref="wpqr_records")


class NDTRecord(Base):
    __tablename__ = "ndt_records"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    assembly_id = Column(UUID(as_uuid=True), ForeignKey("assemblies.id", ondelete="SET NULL"), nullable=True, index=True)
    weld_id = Column(UUID(as_uuid=True), ForeignKey("welds.id", ondelete="SET NULL"), nullable=True, index=True)

    method = Column(String(30), nullable=False)  # VT/PT/MT/UT/RT
    inspection_date = Column(Date, nullable=True)
    result = Column(String(30), nullable=False, server_default="pending")
    report_no = Column(String(120), nullable=True)
    inspector = Column(String(120), nullable=True)
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    tenant = relationship("Tenant")
    project = relationship("Project", backref="ndt_records")
    assembly = relationship("Assembly", backref="ndt_records")
    weld = relationship("Weld", backref="ndt_records")


class ExportJob(Base):
    __tablename__ = "export_jobs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)

    export_type = Column(String(50), nullable=False, server_default="ce_dossier")
    status = Column(String(30), nullable=False, server_default="queued")
    requested_by = Column(String(120), nullable=True)
    file_path = Column(String(500), nullable=True)
    message = Column(Text, nullable=True)
    bundle_type = Column(String(30), nullable=False, server_default="zip")
    manifest_json = Column(Text, nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    retry_count = Column(Integer, nullable=False, server_default="0")
    error_code = Column(String(80), nullable=True)
    error_detail = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    tenant = relationship("Tenant")
    project = relationship("Project", backref="export_jobs")
