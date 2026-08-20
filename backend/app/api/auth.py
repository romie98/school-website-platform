from time import monotonic

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.models.approval import AUDIT_LOGIN_FAILED, AUDIT_LOGIN_SUCCESS, RESOURCE_AUTH
from app.models.ops import CATEGORY_AUTH, SEVERITY_WARNING
from app.models.user import User
from app.services.audit_service import log_event
from app.services.auth_service import authenticate_user, find_login_user, issue_token
from app.services.system_events import record_event

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginIn(BaseModel):
    username: str
    password: str


def _user_payload(user: User) -> dict:
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "school_id": user.school_id,
        "school_slug": user.school.slug if user.school else None,
        "school_name": user.school.name if user.school else None,
    }


_failed_logins: dict[str, list[float]] = {}


def _note_failed_login(key: str) -> None:
    settings = get_settings()
    now = monotonic()
    window = max(settings.login_fail_window_seconds, 30)
    bucket = [stamp for stamp in _failed_logins.get(key, []) if now - stamp < window]
    bucket.append(now)
    _failed_logins[key] = bucket
    if len(bucket) >= max(settings.login_fail_threshold, 3):
        record_event(
            event_type="AUTH_FAILURE_SPIKE",
            message="Repeated failed sign-in attempts were detected",
            severity=SEVERITY_WARNING,
            category=CATEGORY_AUTH,
            extra={"attempts": len(bucket), "windowSeconds": window},
            debounce_key=f"auth-fail:{key}",
        )


@router.post("/login")
def login(body: LoginIn, request: Request, db: Session = Depends(get_db)):
    user = authenticate_user(db, body.username, body.password)
    if user is None:
        candidate = find_login_user(db, body.username, active_only=False)
        log_event(
            db,
            actor=candidate,
            school_id=candidate.school_id if candidate else None,
            action=AUDIT_LOGIN_FAILED,
            resource_type=RESOURCE_AUTH,
            resource_id=candidate.id if candidate else None,
            resource_name=candidate.email if candidate else body.username.strip().lower(),
            actor_name=candidate.name if candidate else body.username.strip().lower(),
            actor_role=candidate.role if candidate else "",
            status_after="failed",
            metadata={"email": (candidate.email if candidate else body.username.strip().lower())},
        )
        db.commit()
        identity = (candidate.email if candidate else body.username.strip().lower())
        client = request.client.host if request.client else "unknown"
        _note_failed_login(f"{identity}|{client}")
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    if user.school and user.school.status in {"suspended", "archived"}:
        raise HTTPException(status_code=403, detail="This school account is not active")
    log_event(
        db,
        actor=user,
        action=AUDIT_LOGIN_SUCCESS,
        resource_type=RESOURCE_AUTH,
        resource_id=user.id,
        resource_name=user.email,
        status_after="success",
        metadata={"email": user.email},
    )
    db.commit()
    return {
        "access_token": issue_token(user),
        "token_type": "bearer",
        "user": _user_payload(user),
    }


@router.get("/me")
def me(user: User = Depends(get_current_user)):
    return _user_payload(user)
