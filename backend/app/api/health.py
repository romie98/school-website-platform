from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.models.ops import STATUS_UNHEALTHY
from app.services.health_service import check_database, check_storage, overall_status

router = APIRouter(tags=["health"])


@router.get("/api/health")
def health():
    return {"status": "healthy"}


@router.get("/api/health/ready")
def ready():
    database = check_database()["status"]
    storage = check_storage()["status"]
    status = overall_status(database, storage)
    body = {
        "status": status.lower(),
        "database": database.lower(),
        "storage": storage.lower(),
    }
    if database == STATUS_UNHEALTHY:
        return JSONResponse(body, status_code=503)
    return body
