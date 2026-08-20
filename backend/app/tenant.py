from fastapi import HTTPException, status
from sqlalchemy import Select, select
from sqlalchemy.orm import Session


class TenantNotFound(HTTPException):
    def __init__(self, detail: str = "School not found"):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


def owned_query(model, school_id: str) -> Select:
    return select(model).where(model.school_id == school_id)


def get_owned(db: Session, model, record_id: str, school_id: str):
    record = db.get(model, record_id)
    if record is None or getattr(record, "school_id", None) != school_id:
        raise TenantNotFound()
    return record


def list_owned(db: Session, model, school_id: str):
    return db.scalars(owned_query(model, school_id)).all()
