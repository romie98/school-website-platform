"""Operational models: backup runs and system events (separate from content audit)."""

from datetime import datetime

from sqlalchemy import DateTime, Index, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.user import new_id

BACKUP_RUNNING = "RUNNING"
BACKUP_SUCCESS = "SUCCESS"
BACKUP_FAILED = "FAILED"

BACKUP_TYPE_FULL = "full"
BACKUP_TYPE_DATABASE = "database"
BACKUP_TYPE_MEDIA = "media"

SEVERITY_INFO = "INFO"
SEVERITY_WARNING = "WARNING"
SEVERITY_ERROR = "ERROR"
SEVERITY_CRITICAL = "CRITICAL"

CATEGORY_DATABASE = "DATABASE"
CATEGORY_STORAGE = "STORAGE"
CATEGORY_AUTH = "AUTH"
CATEGORY_UPLOAD = "UPLOAD"
CATEGORY_APPROVAL = "APPROVAL"
CATEGORY_AUDIT = "AUDIT"
CATEGORY_BACKUP = "BACKUP"
CATEGORY_NETWORK = "NETWORK"
CATEGORY_FRONTEND = "FRONTEND"
CATEGORY_UNKNOWN = "UNKNOWN"

STATUS_HEALTHY = "HEALTHY"
STATUS_DEGRADED = "DEGRADED"
STATUS_UNHEALTHY = "UNHEALTHY"
STATUS_UNKNOWN = "UNKNOWN"


class BackupRun(Base):
    __tablename__ = "backup_runs"
    __table_args__ = (
        Index("ix_backup_runs_started", "started_at"),
        Index("ix_backup_runs_status", "status"),
        Index("ix_backup_runs_environment", "environment"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    backup_type: Mapped[str] = mapped_column(String(32), default=BACKUP_TYPE_FULL)
    environment: Mapped[str] = mapped_column(String(32))
    status: Mapped[str] = mapped_column(String(20), default=BACKUP_RUNNING)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    location: Mapped[str] = mapped_column(String(500), default="")
    provider: Mapped[str] = mapped_column(String(80), default="local")
    size_bytes: Mapped[int] = mapped_column(Integer, default=0)
    error_message: Mapped[str] = mapped_column(Text, default="")
    extra: Mapped[str] = mapped_column(Text, default="{}")


class SystemEvent(Base):
    __tablename__ = "system_events"
    __table_args__ = (
        Index("ix_system_events_created", "created_at"),
        Index("ix_system_events_category", "category"),
        Index("ix_system_events_severity", "severity"),
        Index("ix_system_events_tenant", "tenant_id"),
        Index("ix_system_events_type", "event_type"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    event_type: Mapped[str] = mapped_column(String(64))
    severity: Mapped[str] = mapped_column(String(20), default=SEVERITY_ERROR)
    category: Mapped[str] = mapped_column(String(32), default=CATEGORY_UNKNOWN)
    tenant_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    tenant_name: Mapped[str] = mapped_column(String(160), default="")
    service: Mapped[str] = mapped_column(String(40), default="api")
    message: Mapped[str] = mapped_column(Text, default="")
    extra: Mapped[str] = mapped_column(Text, default="{}")
    request_id: Mapped[str] = mapped_column(String(64), default="")
    route: Mapped[str] = mapped_column(String(255), default="")
    user_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    user_role: Mapped[str] = mapped_column(String(32), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
