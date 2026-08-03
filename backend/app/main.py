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


# ---------------------------------------------------------------------------
# Logging — configure before anything else so all module loggers work
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)


# ---------------------------------------------------------------------------
# Application Lifespan
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize external services on startup."""
    initialize_firebase()
    initialize_cloudinary()
    await init_db()
    try:
        yield
    finally:
        await close_db()


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

# Read from env — comma-separated list of allowed origins
# Development default: localhost:3000 and localhost:5173
ALLOWED_ORIGINS = settings.allowed_origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    # Authentication is bearer-token based; no cookies or server sessions.
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With"],
    expose_headers=["Content-Type"],
)

print("Loaded ALLOWED_ORIGINS:", settings.allowed_origins)


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
    logging.getLogger(__name__).error(
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


# ---------------------------------------------------------------------------
# Health Check
# ---------------------------------------------------------------------------

@app.get("/", tags=["Health"])
async def root():
    """Simple health check endpoint."""
    return {"status": "ok", "service": "Citizen Grievance Portal API"}
