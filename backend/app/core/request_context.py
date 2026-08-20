from contextvars import ContextVar

request_id_var: ContextVar[str] = ContextVar("request_id", default="")
tenant_id_var: ContextVar[str] = ContextVar("tenant_id", default="")
tenant_name_var: ContextVar[str] = ContextVar("tenant_name", default="")
user_id_var: ContextVar[str] = ContextVar("user_id", default="")
user_role_var: ContextVar[str] = ContextVar("user_role", default="")
route_var: ContextVar[str] = ContextVar("route", default="")
method_var: ContextVar[str] = ContextVar("method", default="")


def bind_user(user) -> None:
    user_id_var.set(getattr(user, "id", None) or "")
    user_role_var.set(getattr(user, "role", None) or "")
    school_id = getattr(user, "school_id", None) or ""
    if school_id:
        tenant_id_var.set(school_id)
    school = getattr(user, "school", None)
    if school is not None and getattr(school, "name", None):
        tenant_name_var.set(school.name)


def snapshot() -> dict[str, str]:
    return {
        "request_id": request_id_var.get(""),
        "tenant_id": tenant_id_var.get(""),
        "tenant_name": tenant_name_var.get(""),
        "user_id": user_id_var.get(""),
        "user_role": user_role_var.get(""),
        "route": route_var.get(""),
        "method": method_var.get(""),
    }
