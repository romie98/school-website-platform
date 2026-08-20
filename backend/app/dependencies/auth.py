from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import InvalidTokenError
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.request_context import bind_user
from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.school import School
from app.models.user import EDITOR, PRINCIPAL, PUBLISH_ROLES, SCHOOL_ADMIN, SCHOOL_ROLES, SUPER_ADMIN, User

bearer = HTTPBearer(auto_error=False)


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    if creds is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    try:
        payload = decode_access_token(creds.credentials)
    except InvalidTokenError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token") from exc
    user = db.scalar(select(User).options(joinedload(User.school)).where(User.id == payload.get("sub")))
    if user is None or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")
    bind_user(user)
    return user


def require_school_user(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> User:
    if user.role == SUPER_ADMIN:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Use platform routes for this account")
    if user.role not in SCHOOL_ROLES or not user.school_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "School access required")
    school = db.get(School, user.school_id)
    if school is None or school.status in {"suspended", "archived"}:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This school account is not active")
    return user


def require_school_admin(user: User = Depends(require_school_user)) -> User:
    if user.role not in {SCHOOL_ADMIN, PRINCIPAL}:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Administrator access required")
    return user


def require_principal(user: User = Depends(require_school_user)) -> User:
    if user.role != PRINCIPAL:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Principal access required")
    return user


def can_publish_directly(user: User) -> bool:
    return user.role in PUBLISH_ROLES


def require_super_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != SUPER_ADMIN:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Platform access required")
    return user


def school_id_for(user: User) -> str:
    if not user.school_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "No school bound to this account")
    return user.school_id
