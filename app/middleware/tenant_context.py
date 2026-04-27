from __future__ import annotations

import uuid
from typing import Callable

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from app.core.security import decode_access


class TenantContextMiddleware(BaseHTTPMiddleware):
    """Best-effort middleware.

    - Parses Bearer access token when present.
    - Stores claims on request.state without blocking unauthenticated routes.
    - Adds lightweight tenant/user headers to every response for debugging/UI use.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        request.state.request_id = str(uuid.uuid4())
        request.state.claims = None

        authorization = request.headers.get("authorization", "")
        if authorization.lower().startswith("bearer "):
            token = authorization.split(" ", 1)[1].strip()
            try:
                claims = decode_access(token)
                if claims.get("type") == "access":
                    request.state.claims = claims
            except Exception:
                request.state.claims = None

        response = await call_next(request)
        response.headers["X-Request-Id"] = request.state.request_id

        claims = getattr(request.state, "claims", None) or {}
        if claims.get("tenant_id"):
            response.headers["X-Tenant-Id"] = str(claims.get("tenant_id"))
        if claims.get("role"):
            response.headers["X-Role"] = str(claims.get("role"))
        return response
