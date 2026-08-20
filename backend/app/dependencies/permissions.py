from fastapi import Depends

from app.dependencies.auth import require_school_user
from app.models.user import User
from app.services.feature_service import feature_enabled, parse_flags


def require_feature(name: str):
    def checker(user: User = Depends(require_school_user)) -> User:
        from fastapi import HTTPException, status
        from sqlalchemy.orm import object_session

        from app.models.school import School

        db = object_session(user)
        school = db.get(School, user.school_id) if db else None
        flags = parse_flags(school.feature_flags if school else "{}")
        if not feature_enabled(flags, name):
            raise HTTPException(status.HTTP_403_FORBIDDEN, f"Feature '{name}' is not enabled")
        return user

    return checker
