import uuid

from sqlalchemy import Boolean, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.school import School

SUPER_ADMIN = "super_admin"
SCHOOL_ADMIN = "school_admin"
PRINCIPAL = "principal"
EDITOR = "editor"
SCHOOL_ROLES = {SCHOOL_ADMIN, PRINCIPAL, EDITOR}
PUBLISH_ROLES = {PRINCIPAL, SUPER_ADMIN}


def new_id() -> str:
    return str(uuid.uuid4())


class User(Base, TimestampMixin):
    __tablename__ = "users"
    __table_args__ = (UniqueConstraint("email", name="uq_users_email"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    school_id: Mapped[str | None] = mapped_column(ForeignKey("schools.id"), nullable=True, index=True)
    name: Mapped[str] = mapped_column(String(160))
    email: Mapped[str] = mapped_column(String(255), index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(32), index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    school: Mapped[School | None] = relationship(back_populates="users")

    @property
    def is_super_admin(self) -> bool:
        return self.role == SUPER_ADMIN
