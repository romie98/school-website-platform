from __future__ import annotations

import logging
import time
import uuid

from starlette.types import ASGIApp, Receive, Scope, Send

from app.core.config import get_settings
from app.core.request_context import method_var, request_id_var, route_var
from app.models.ops import CATEGORY_NETWORK, CATEGORY_UNKNOWN, SEVERITY_ERROR

log = logging.getLogger("app.access")


class RequestContextMiddleware:
    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        headers = {key.decode().lower(): value.decode() for key, value in scope.get("headers") or []}
        request_id = headers.get("x-request-id") or str(uuid.uuid4())
        path = scope.get("path") or ""
        method = scope.get("method") or ""
        request_id_var.set(request_id)
        method_var.set(method)
        route_var.set(path)
        scope.setdefault("state", {})
        scope["state"]["request_id"] = request_id
        started = time.perf_counter()
        status_code = 500

        async def send_wrapper(message):
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message.get("status", 500)
                raw_headers = list(message.get("headers") or [])
                raw_headers.append((b"x-request-id", request_id.encode()))
                message = {**message, "headers": raw_headers}
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        finally:
            duration_ms = int((time.perf_counter() - started) * 1000)
            log.info("request method=%s route=%s status=%s duration_ms=%s", method, path, status_code, duration_ms)
            settings = get_settings()
            if duration_ms >= max(settings.slow_request_ms, 100):
                log.warning("slow_request method=%s route=%s duration_ms=%s", method, path, duration_ms)
            if status_code >= 500 and not path.startswith("/api/health"):
                try:
                    from app.services.system_events import record_event

                    record_event(
                        event_type="HTTP_5XX",
                        message=f"{method} {path} returned {status_code}",
                        severity=SEVERITY_ERROR,
                        category=CATEGORY_NETWORK if status_code == 502 else CATEGORY_UNKNOWN,
                        extra={"statusCode": status_code, "durationMs": duration_ms},
                        debounce_key=f"http5xx:{path}:{status_code}",
                    )
                except Exception:
                    log.warning("Failed to record 5xx system event", exc_info=True)
