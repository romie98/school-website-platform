"""Approval workflow models: change requests, audit events, and in-app notifications."""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin
from app.models.user import new_id

ACTION_CREATE = "create"
ACTION_UPDATE = "update"
ACTION_DELETE = "delete"

STATUS_PENDING = "pending"
STATUS_APPROVED = "approved"
STATUS_DECLINED = "declined"
STATUS_CANCELLED = "cancelled"

RESOURCE_NEWS = "news"
RESOURCE_EVENT = "event"
RESOURCE_STAFF = "staff"
RESOURCE_PAGE = "page"
RESOURCE_DOCUMENT = "document"
RESOURCE_GALLERY = "gallery"
RESOURCE_MEDIA = "media"
RESOURCE_HOMEPAGE = "homepage"
RESOURCE_PRINCIPAL_MESSAGE = "principal_message"
RESOURCE_CONTACT = "contact"
RESOURCE_BRANDING = "branding"
RESOURCE_ANNOUNCEMENT = "announcement"
RESOURCE_DEPARTMENT = "department"
RESOURCE_HOMEPAGE_SECTIONS = "homepage_sections"
RESOURCE_NAVIGATION = "navigation"
RESOURCE_USER = "user"
RESOURCE_AUTH = "auth"

RESOURCE_LABELS = {
    RESOURCE_NEWS: "News Article",
    RESOURCE_EVENT: "Event",
    RESOURCE_STAFF: "Staff Member",
    RESOURCE_PAGE: "Page",
    RESOURCE_DOCUMENT: "Document",
    RESOURCE_GALLERY: "Gallery Album",
    RESOURCE_MEDIA: "Media",
    RESOURCE_HOMEPAGE: "Homepage",
    RESOURCE_PRINCIPAL_MESSAGE: "Principal's Message",
    RESOURCE_CONTACT: "Contact Details",
    RESOURCE_BRANDING: "Branding",
    RESOURCE_ANNOUNCEMENT: "Announcement",
    RESOURCE_DEPARTMENT: "Department",
    RESOURCE_HOMEPAGE_SECTIONS: "Homepage Layout",
    RESOURCE_NAVIGATION: "Navigation",
    RESOURCE_USER: "User Account",
    RESOURCE_AUTH: "Sign-in",
}

AUDIT_CHANGE_SUBMITTED = "CHANGE_SUBMITTED"
AUDIT_CHANGE_RESUBMITTED = "CHANGE_RESUBMITTED"
AUDIT_CHANGE_APPROVED = "CHANGE_APPROVED"
AUDIT_CHANGE_DECLINED = "CHANGE_DECLINED"
AUDIT_CHANGE_CANCELLED = "CHANGE_CANCELLED"
AUDIT_CONTENT_CREATED = "CONTENT_CREATED"
AUDIT_CONTENT_UPDATED = "CONTENT_UPDATED"
AUDIT_CONTENT_PUBLISHED = "CONTENT_PUBLISHED"
AUDIT_CONTENT_DELETED = "CONTENT_DELETED"
AUDIT_PRINCIPAL_DIRECT_PUBLISH = "PRINCIPAL_DIRECT_PUBLISH"
AUDIT_LOGIN_SUCCESS = "LOGIN_SUCCESS"
AUDIT_LOGIN_FAILED = "LOGIN_FAILED"
AUDIT_USER_CREATED = "USER_CREATED"
AUDIT_USER_UPDATED = "USER_UPDATED"
AUDIT_USER_DISABLED = "USER_DISABLED"
AUDIT_USER_ENABLED = "USER_ENABLED"
AUDIT_USER_ROLE_CHANGED = "USER_ROLE_CHANGED"
AUDIT_USER_PASSWORD_CHANGED = "USER_PASSWORD_CHANGED"

SECURITY_ACTIONS = {
    AUDIT_LOGIN_SUCCESS,
    AUDIT_LOGIN_FAILED,
    AUDIT_USER_CREATED,
    AUDIT_USER_UPDATED,
    AUDIT_USER_DISABLED,
    AUDIT_USER_ENABLED,
    AUDIT_USER_ROLE_CHANGED,
    AUDIT_USER_PASSWORD_CHANGED,
}

ACTION_FILTER_GROUPS = {
    "submitted": {AUDIT_CHANGE_SUBMITTED, AUDIT_CHANGE_RESUBMITTED},
    "approved": {AUDIT_CHANGE_APPROVED},
    "declined": {AUDIT_CHANGE_DECLINED},
    "published": {AUDIT_CONTENT_PUBLISHED, AUDIT_PRINCIPAL_DIRECT_PUBLISH, AUDIT_CONTENT_CREATED, AUDIT_CONTENT_UPDATED},
    "deleted": {AUDIT_CONTENT_DELETED},
    "created": {AUDIT_CONTENT_CREATED},
    "updated": {AUDIT_CONTENT_UPDATED},
    "login": {AUDIT_LOGIN_SUCCESS, AUDIT_LOGIN_FAILED},
    "users": {
        AUDIT_USER_CREATED,
        AUDIT_USER_UPDATED,
        AUDIT_USER_DISABLED,
        AUDIT_USER_ENABLED,
        AUDIT_USER_ROLE_CHANGED,
        AUDIT_USER_PASSWORD_CHANGED,
    },
}


class ContentChange(Base, TimestampMixin):
    __tablename__ = "content_changes"
    __table_args__ = (
        Index("ix_changes_school_status_submitted", "school_id", "status", "submitted_at"),
        Index("ix_changes_school_resource", "school_id", "resource_type", "resource_id"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    school_id: Mapped[str] = mapped_column(ForeignKey("schools.id"), index=True)
    resource_type: Mapped[str] = mapped_column(String(40), index=True)
    resource_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    action: Mapped[str] = mapped_column(String(20), index=True)
    title: Mapped[str] = mapped_column(String(255), default="")
    submitted_by: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    submitted_by_name: Mapped[str] = mapped_column(String(160), default="")
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    old_data: Mapped[str] = mapped_column(Text, default="{}")
    new_data: Mapped[str] = mapped_column(Text, default="{}")
    status: Mapped[str] = mapped_column(String(20), default=STATUS_PENDING, index=True)
    reviewed_by: Mapped[str | None] = mapped_column(String(36), nullable=True)
    reviewed_by_name: Mapped[str] = mapped_column(String(160), default="")
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    decline_reason: Mapped[str] = mapped_column(Text, default="")
    supersedes_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)


class AuditEvent(Base, TimestampMixin):
    __tablename__ = "audit_events"
    __table_args__ = (
        Index("ix_audit_school_created", "school_id", "created_at"),
        Index("ix_audit_school_action", "school_id", "action"),
        Index("ix_audit_school_resource_type", "school_id", "resource_type"),
        Index("ix_audit_school_actor", "school_id", "user_id"),
        Index("ix_audit_resource", "resource_type", "resource_id"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    school_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    school_name: Mapped[str] = mapped_column(String(160), default="")
    user_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    user_name: Mapped[str] = mapped_column(String(160), default="")
    user_role: Mapped[str] = mapped_column(String(32), default="")
    action: Mapped[str] = mapped_column(String(48), index=True)
    resource_type: Mapped[str] = mapped_column(String(40), default="")
    resource_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    resource_name: Mapped[str] = mapped_column(String(255), default="")
    change_request_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    old_data: Mapped[str] = mapped_column(Text, default="{}")
    new_data: Mapped[str] = mapped_column(Text, default="{}")
    status_before: Mapped[str] = mapped_column(String(40), default="")
    status_after: Mapped[str] = mapped_column(String(40), default="")
    reviewed_by_user_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    reviewed_by_name: Mapped[str] = mapped_column(String(160), default="")
    decline_reason: Mapped[str] = mapped_column(Text, default="")
    data: Mapped[str] = mapped_column(Text, default="{}")


class AppNotification(Base, TimestampMixin):
    __tablename__ = "app_notifications"
    __table_args__ = (Index("ix_notifications_user_read", "user_id", "read_at"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    school_id: Mapped[str] = mapped_column(String(36), index=True)
    user_id: Mapped[str] = mapped_column(String(36), index=True)
    title: Mapped[str] = mapped_column(String(255), default="")
    body: Mapped[str] = mapped_column(Text, default="")
    href: Mapped[str] = mapped_column(String(255), default="")
    kind: Mapped[str] = mapped_column(String(40), default="approval")
    change_request_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
