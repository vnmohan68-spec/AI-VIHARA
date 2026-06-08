"""
Production Middleware for Vihara AI
"""
import time
import logging
from collections import defaultdict
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)


# ── REQUEST LOGGING ───────────────────────────────────────────────
class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start = time.time()
        response: Response = await call_next(request)
        duration = (time.time() - start) * 1000

        logger.info(
            f"{request.method} {request.url.path} "
            f"→ {response.status_code} "
            f"({duration:.1f}ms)"
            f" [{request.client.host if request.client else 'unknown'}]"
        )
        response.headers["X-Response-Time"] = f"{duration:.1f}ms"
        return response


# ── RATE LIMITING (in-memory, use Redis in production) ────────────
class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, calls_per_minute: int = 60):
        super().__init__(app)
        self.calls_per_minute = calls_per_minute
        self._requests: dict = defaultdict(list)

    async def dispatch(self, request: Request, call_next):
        # Skip health check
        if request.url.path in ("/health", "/"):
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        now = time.time()

        # Stricter limits for AI endpoints
        limit = 10 if "/chat" in request.url.path or "/monuments/recognize" in request.url.path else self.calls_per_minute

        # Clean old requests (older than 1 minute)
        self._requests[client_ip] = [t for t in self._requests[client_ip] if now - t < 60]

        if len(self._requests[client_ip]) >= limit:
            from fastapi.responses import JSONResponse
            return JSONResponse(
                {"detail": "Rate limit exceeded. Please slow down."},
                status_code=429,
                headers={"Retry-After": "60"},
            )

        self._requests[client_ip].append(now)
        return await call_next(request)
