from __future__ import annotations

import threading
import time
from collections import defaultdict, deque
from typing import Deque

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse


class InMemoryRateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, *, max_requests: int = 120, window_seconds: int = 60, exempt_paths: set[str] | None = None):
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.exempt_paths = exempt_paths or set()
        self._hits: dict[str, Deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def _key(self, request) -> str:
        ip = request.headers.get('x-forwarded-for', request.client.host if request.client else 'unknown')
        path = request.url.path
        return f"{ip}:{path}"

    async def dispatch(self, request, call_next):
        path = request.url.path
        if any(path.startswith(p) for p in self.exempt_paths):
            return await call_next(request)

        now = time.time()
        key = self._key(request)
        with self._lock:
            q = self._hits[key]
            while q and q[0] <= now - self.window_seconds:
                q.popleft()
            if len(q) >= self.max_requests:
                retry_after = max(1, int(self.window_seconds - (now - q[0]))) if q else self.window_seconds
                return JSONResponse(
                    status_code=429,
                    content={
                        'detail': 'Too many requests',
                        'code': 'RATE_LIMITED',
                        'retry_after_seconds': retry_after,
                    },
                    headers={'Retry-After': str(retry_after)},
                )
            q.append(now)
        return await call_next(request)
