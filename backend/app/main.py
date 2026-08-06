import asyncio
import logging
import re
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.firebase import initialize_firebase
from app.core.config import settings
from app.core.cloudinary import initialize_cloudinary
from app.database.mongodb import close_db, init_db

from app.api.routes.auth import router as auth_router
from app.api.routes.complaints import router as complaint_router
from app.api.routes.users import router as user_router
from app.api.routes.admin import router as admin_router
from app.chatbot.routes import router as chatbot_router, chat_router


# ---------------------------------------------------------------------------
# Logging — configure before anything else so all module loggers work
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)


logger = logging.getLogger("app.main")


# ---------------------------------------------------------------------------
# Application Lifespan
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize external services on startup."""
    logger.info("Application startup: initializing services...")
    try:
        initialize_firebase()
    except Exception as exc:
        logger.error("Failed to initialize Firebase: %s", exc)

    try:
        initialize_cloudinary()
    except Exception as exc:
        logger.error("Failed to initialize Cloudinary: %s", exc)

    try:
        await init_db()
        logger.info("MongoDB initialized successfully.")
    except Exception as exc:
        logger.critical("Failed to initialize MongoDB: %s", exc)
        raise

    # Warm up chatbot subsystems in background — FAQ cache, Response cache, FAISS vector store.
    # This eliminates cold-start delay on the first user request without blocking app startup.
    async def _warmup_chatbot():
        try:
            import gc
            from app.chatbot.service import get_chatbot_service
            from app.chatbot.faq_cache import FAQCache
            from app.chatbot.response_cache import ResponseCache

            # 1. Initialize ResponseCache singleton
            ResponseCache.get_instance(
                max_size=settings.CACHE_MAX_SIZE,
                ttl_seconds=settings.CACHE_TTL_SECONDS,
            )
            logger.info("ResponseCache singleton initialized.")

            # 2. Load FAQCache with pre-computed embeddings
            faq_cache = FAQCache.get_instance()
            await asyncio.to_thread(
                faq_cache.load,
                settings.faq_data_path_resolved,
                settings.FAQ_SIMILARITY_THRESHOLD,
            )
            logger.info("FAQCache loaded with %d entries.", faq_cache.size)
            gc.collect()

            # 3. Pre-warm FAISS vector store retriever
            service = get_chatbot_service()
            await asyncio.to_thread(service.retriever.retrieve, "warmup portal")
            logger.info("Chatbot FAISS vector store pre-warmed successfully.")
            gc.collect()

            # 4. Pre-warm Gemini API connection
            try:
                await service._call_gemini("hi")
                logger.info("Gemini API connection pre-warmed successfully.")
            except Exception as gem_exc:
                logger.debug("Gemini pre-warm ping notice: %s", gem_exc)

            gc.collect()
            logger.info("All AI chatbot subsystems pre-warmed successfully.")

        except Exception as exc:
            logger.warning("Chatbot warmup partial failure (non-fatal): %s", exc)

    asyncio.create_task(_warmup_chatbot())

    logger.info("Application startup complete. Web server ready to handle requests.")

    try:
        yield
    finally:
        logger.info("Application shutdown: closing connections...")
        await close_db()
        logger.info("Application shutdown complete.")


# ---------------------------------------------------------------------------
# FastAPI Application
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Citizen Grievance Portal API",
    description=(
        "A robust FastAPI backend for the AI-powered Citizen Grievance Portal. "
        "Features Firebase Authentication, MongoDB (Beanie ODM), and RBAC."
    ),
    version="1.0.0",
    lifespan=lifespan,
)


# ---------------------------------------------------------------------------
# CORS — Allow React frontend to communicate
# ---------------------------------------------------------------------------

ALLOWED_ORIGINS = settings.allowed_origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Type"],
)

logger.info("Configured CORS with ALLOWED_ORIGINS: %s", ALLOWED_ORIGINS)


def is_origin_allowed(origin: str) -> bool:
    """Helper to check if a request origin is permitted (supports localhost and vercel.app preview subdomains)."""
    if not origin:
        return False
    normalized = origin.strip().rstrip("/")
    if normalized in ALLOWED_ORIGINS:
        return True
    # Allow localhost on any port for development
    if re.match(r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$", normalized):
        return True
    # Allow Vercel preview/production deployments
    if re.match(r"^https://[a-zA-Z0-9-]+\.vercel\.app$", normalized):
        return True
    return False


@app.middleware("http")
async def debug_cors_middleware(request: Request, call_next):
    """
    Middleware that:
    1. Logs incoming requests and preflights.
    2. Serves as a bulletproof safety net to inject CORS headers onto any response
       (redirects, 4xx/500 errors, exception responses) if CORSMiddleware is bypassed.
    """
    origin = request.headers.get("origin")
    method = request.method
    path = request.url.path
    auth_header = request.headers.get("authorization")
    has_auth = "Yes" if auth_header else "No"

    logger.info(
        "CORS Debug — REQUEST: Method=%s Path=%s Origin=%s AuthorizationPresent=%s",
        method,
        path,
        origin,
        has_auth,
    )

    # Bulletproof fallback for preflight OPTIONS requests
    if method == "OPTIONS":
        if origin and is_origin_allowed(origin):
            logger.info("CORS Debug — Preflight OPTIONS matched allowed origin: %s", origin)
            response = JSONResponse(status_code=200, content={"status": "ok"})
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
            response.headers["Access-Control-Allow-Headers"] = request.headers.get(
                "access-control-request-headers", "*"
            )
            return response

    try:
        response = await call_next(request)
    except Exception as exc:
        logger.error(
            "CORS Debug — UNHANDLED EXCEPTION in router/middleware: %s %s | Error: %s",
            method,
            path,
            exc,
            exc_info=True,
        )
        response = JSONResponse(
            status_code=500,
            content={"detail": "An internal server error occurred."},
        )

    # Bulletproof fallback: ensure every response returned to an allowed origin has CORS headers
    if origin and is_origin_allowed(origin):
        if "access-control-allow-origin" not in response.headers:
            response.headers["access-control-allow-origin"] = origin
            response.headers["access-control-allow-credentials"] = "true"
            response.headers["access-control-allow-methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
            response.headers["access-control-allow-headers"] = request.headers.get(
                "access-control-request-headers", "*"
            )
            logger.info("CORS Debug — Injected missing CORS headers for Origin: %s", origin)

    logger.info(
        "CORS Debug — RESPONSE: Method=%s Path=%s Status=%d OriginHeader=%s",
        method,
        path,
        response.status_code,
        response.headers.get("access-control-allow-origin"),
    )
    return response


# ---------------------------------------------------------------------------
# Global Exception Handlers
# ---------------------------------------------------------------------------

@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    return JSONResponse(
        status_code=404,
        content={"detail": "The requested resource was not found."},
    )


@app.exception_handler(500)
async def internal_error_handler(request: Request, exc):
    logger.error(
        "Unhandled server error for %s %s",
        request.method,
        request.url.path,
        exc_info=(type(exc), exc, exc.__traceback__),
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred."},
    )


# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

app.include_router(auth_router)
app.include_router(complaint_router)
app.include_router(user_router)
app.include_router(admin_router)
app.include_router(chatbot_router)
app.include_router(chat_router)  # Provides POST /chat/stream (SSE)


# ---------------------------------------------------------------------------
# Health Check Endpoints
# ---------------------------------------------------------------------------

@app.get("/", tags=["Health"])
async def root():
    """Fast root health check endpoint for deployment monitoring."""
    return {"status": "ok", "service": "Citizen Grievance Portal API"}


@app.get("/health", tags=["Health"])
async def health():
    """Explicit health check endpoint."""
    return {"status": "ok"}

