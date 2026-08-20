from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.security import create_access_token, verify_password
from app.models.user import User


def find_login_user(db: Session, username: str, *, active_only: bool = True) -> User | None:
    identity = username.strip().lower()
    query = select(User).options(joinedload(User.school))
    if active_only:
        query = query.where(User.is_active.is_(True))
    if "@" in identity:
        return db.scalar(query.where(User.email == identity))
    matches = db.scalars(query.where(User.email.like(f"{identity}@%"))).unique().all()
    return matches[0] if len(matches) == 1 else None


def authenticate_user(db: Session, username: str, password: str) -> User | None:
    user = find_login_user(db, username, active_only=True)
    if user and verify_password(password, user.password_hash):
        return user
    return None


def issue_token(user: User) -> str:
    return create_access_token(user_id=user.id, role=user.role, school_id=user.school_id)
