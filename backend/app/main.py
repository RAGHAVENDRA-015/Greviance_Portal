import logging
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

    logger.info("Application startup complete. Ready to receive requests.")
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

