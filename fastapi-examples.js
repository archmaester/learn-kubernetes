// Patches the FastAPI module (m2) with comprehensive code examples.
// Loaded after curriculum.js and fastapi-lessons.js.
(function patchFastAPIExamples() {
  const m = CURRICULUM.phases[0].modules[1]; // phase-1 (index 0), second module (m2)

  m.codeExamples = [

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "app-setup",
      icon: "🚀",
      title: "App Setup & Project Structure",
      items: [
        {
          title: "Minimal FastAPI App",
          lang: "python",
          filename: "main.py",
          desc: "The smallest possible FastAPI app. Visit /docs for the auto-generated Swagger UI.",
          code: `from fastapi import FastAPI

app = FastAPI(
    title="AI Inference API",
    description="Production-grade API for AI model serving",
    version="1.0.0",
    docs_url="/docs",        # Swagger UI — set to None to disable
    redoc_url="/redoc",      # ReDoc — set to None to disable
    openapi_url="/openapi.json",
)

@app.get("/")
async def root():
    return {"message": "API is running", "version": "1.0.0"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

# Run: uvicorn main:app --reload`,
          notes: [
            "FastAPI is an ASGI app — it requires an ASGI server like Uvicorn",
            "--reload watches for file changes and restarts the server (dev only)",
            "Visit http://localhost:8000/docs for interactive Swagger UI",
          ]
        },
        {
          title: "Production Project Layout",
          lang: "bash",
          filename: "project-structure.sh",
          desc: "Recommended directory structure for a production FastAPI application.",
          code: `# Production FastAPI project layout
my-api/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI app + lifespan
│   ├── config.py            # Settings (pydantic-settings)
│   ├── database.py          # Engine, sessionmaker, get_db
│   ├── models.py            # SQLAlchemy ORM models
│   ├── schemas/             # Pydantic request/response models
│   │   ├── __init__.py
│   │   ├── user.py
│   │   └── item.py
│   ├── routers/             # APIRouter modules
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── users.py
│   │   └── items.py
│   ├── services/            # Business logic (no HTTP layer)
│   │   ├── __init__.py
│   │   └── user_service.py
│   ├── deps.py              # Shared Depends() functions
│   └── middleware.py        # Custom middleware
├── tests/
│   ├── conftest.py
│   ├── test_users.py
│   └── test_auth.py
├── alembic/                 # DB migrations
│   └── versions/
├── Dockerfile
├── docker-compose.yml
├── pyproject.toml
└── .env`,
          notes: [
            "Separate routers/, schemas/, services/ prevents one massive file",
            "Services contain business logic — no FastAPI imports — easy to unit test",
            "Routers contain HTTP layer only — call services, return responses",
            "deps.py centralizes Depends() functions used across multiple routers",
          ]
        },
        {
          title: "App Factory with Lifespan",
          lang: "python",
          filename: "app/main.py",
          desc: "Production app.py with lifespan, routers, middleware, and CORS.",
          code: `from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.config import get_settings
from app.routers import auth, users, items
from app.middleware import RequestContextMiddleware
from app.database import engine, Base

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    logger.info("Starting up", extra={"env": settings.env})

    # Create tables (in production, use Alembic instead)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield

    logger.info("Shutting down")
    await engine.dispose()

def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title=settings.app_name,
        version=settings.api_version,
        lifespan=lifespan,
        docs_url="/docs" if settings.env != "production" else None,
    )

    # Middleware (added in reverse execution order)
    app.add_middleware(RequestContextMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Routers
    app.include_router(auth.router)
    app.include_router(users.router, prefix="/api/v1")
    app.include_router(items.router, prefix="/api/v1")

    return app

app = create_app()`,
          notes: [
            "create_app() factory pattern enables testing with different settings",
            "docs_url=None in production hides Swagger from external users (security)",
            "Middleware added last runs first — CORSMiddleware should run before auth middleware",
            "include_router with prefix avoids repeating /api/v1 on every route",
          ]
        },
        {
          title: "Environment Configuration",
          lang: "python",
          filename: "app/config.py",
          desc: "Type-safe settings with pydantic-settings — validates all required env vars at startup.",
          code: `# pip install pydantic-settings
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
from typing import Literal

class Settings(BaseSettings):
    # App
    app_name: str = "My API"
    api_version: str = "1.0.0"
    env: Literal["development", "staging", "production"] = "development"
    log_level: str = "INFO"

    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    workers: int = 1

    # Database
    database_url: str                     # required — no default
    db_pool_size: int = 10
    db_max_overflow: int = 20
    db_pool_timeout: int = 30

    # Redis
    redis_url: str = "redis://localhost:6379"
    cache_ttl_seconds: int = 300

    # JWT
    secret_key: str                       # required
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    # CORS
    cors_origins: list[str] = ["http://localhost:3000"]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

@lru_cache()
def get_settings() -> Settings:
    return Settings()`,
          notes: [
            "Fields without defaults are required — app fails fast if env vars are missing",
            "@lru_cache() ensures Settings is parsed once per process, not per request",
            "Literal[...] for env restricts to valid environment names",
            "Use Depends(get_settings) in routes to inject settings — override in tests",
          ]
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "routing",
      icon: "🛤️",
      title: "Routing & Request Handling",
      items: [
        {
          title: "APIRouter with Prefix and Tags",
          lang: "python",
          filename: "app/routers/users.py",
          desc: "Modular routing with APIRouter — keeps routes organized by feature.",
          code: `from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Annotated
from app.schemas.user import UserCreate, UserPublic, UserUpdate
from app.deps import get_db, get_current_user, require_admin
from app.services.user_service import UserService

router = APIRouter(
    prefix="/users",
    tags=["users"],
    responses={
        401: {"description": "Not authenticated"},
        403: {"description": "Not authorized"},
    }
)

DB = Annotated[AsyncSession, Depends(get_db)]
CurrentUser = Annotated[TokenData, Depends(get_current_user)]

@router.get("/", response_model=list[UserPublic])
async def list_users(
    db: DB,
    current_user: CurrentUser,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    search: str | None = Query(None, description="Filter by username"),
):
    service = UserService(db)
    return await service.list_users(skip=skip, limit=limit, search=search)

@router.get("/{user_id}", response_model=UserPublic)
async def get_user(user_id: int, db: DB, current_user: CurrentUser):
    service = UserService(db)
    user = await service.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.post("/", response_model=UserPublic, status_code=status.HTTP_201_CREATED)
async def create_user(body: UserCreate, db: DB):
    service = UserService(db)
    return await service.create_user(body)

@router.patch("/{user_id}", response_model=UserPublic)
async def update_user(
    user_id: int,
    body: UserUpdate,
    db: DB,
    current_user: CurrentUser,
):
    if current_user.user_id != user_id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Cannot update other users")
    service = UserService(db)
    return await service.update_user(user_id, body)

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    db: DB,
    _: Annotated[TokenData, Depends(require_admin)],
):
    service = UserService(db)
    await service.delete_user(user_id)`,
          notes: [
            "tags=[\"users\"] groups all routes under the same section in /docs",
            "responses={401: ...} adds these possible responses to the OpenAPI schema",
            "Query(0, ge=0) on a function param sets a default AND validation",
            "DELETE returns 204 No Content — no response body, just status code",
          ]
        },
        {
          title: "Path, Query, Header, Cookie Parameters",
          lang: "python",
          filename: "params.py",
          desc: "All FastAPI parameter sources with validation examples.",
          code: `from fastapi import FastAPI, Path, Query, Header, Cookie, Body
from typing import Annotated
from enum import Enum

app = FastAPI()

class SortOrder(str, Enum):
    asc = "asc"
    desc = "desc"

@app.get("/items/{item_id}")
async def get_item(
    # Path param — required, validated
    item_id: Annotated[int, Path(ge=1, title="Item ID", description="The unique item identifier")],

    # Query params
    include_deleted: bool = False,
    sort: SortOrder = SortOrder.asc,
    tags: list[str] = Query(default=[], description="Filter by tags"),

    # Headers (hyphen auto-converted to underscore)
    x_api_version: Annotated[str | None, Header()] = None,
    accept_language: Annotated[str | None, Header()] = None,

    # Cookies
    session_token: Annotated[str | None, Cookie()] = None,
):
    return {
        "item_id": item_id,
        "include_deleted": include_deleted,
        "sort": sort,
        "tags": tags,
        "api_version": x_api_version,
        "lang": accept_language,
        "session": session_token is not None,
    }

# Repeated query param: /items?tags=python&tags=fastapi
# → tags = ["python", "fastapi"]`,
          notes: [
            "list[str] query params accept repeated ?key=a&key=b syntax",
            "Enum query params show allowed values in /docs automatically",
            "Header() converts X-API-Version → x_api_version (underscore substitution)",
            "Path() with title/description enriches the OpenAPI spec",
          ]
        },
        {
          title: "File Uploads",
          lang: "python",
          filename: "file_upload.py",
          desc: "Handle file uploads — single file, multiple files, and file + form fields together.",
          code: `from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from typing import Annotated
import aiofiles
import uuid

app = FastAPI()

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

@app.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    description: str = Form(""),
):
    # Validate file type
    allowed_types = {"image/jpeg", "image/png", "image/webp", "application/pdf"}
    if file.content_type not in allowed_types:
        raise HTTPException(400, f"File type {file.content_type} not allowed")

    # Read and validate size
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(413, "File too large (max 10 MB)")

    # Save to disk (in production: upload to S3/GCS instead)
    filename = f"{uuid.uuid4()}-{file.filename}"
    async with aiofiles.open(f"/uploads/{filename}", "wb") as f:
        await f.write(content)

    return {
        "filename": filename,
        "original_name": file.filename,
        "content_type": file.content_type,
        "size_bytes": len(content),
        "description": description,
    }

@app.post("/upload-multiple")
async def upload_multiple(files: list[UploadFile] = File(...)):
    results = []
    for file in files:
        content = await file.read()
        results.append({
            "filename": file.filename,
            "size": len(content),
            "type": file.content_type,
        })
    return results`,
          notes: [
            "UploadFile gives you async read() and the filename/content_type",
            "File(...) makes it required; File(None) makes it optional",
            "Always validate file type AND size before processing",
            "In production: stream to S3/GCS with aiobotocore or google-cloud-storage",
            "Form() and File() cannot be used with a JSON body — they use multipart/form-data",
          ]
        },
        {
          title: "Streaming Responses (SSE for LLMs)",
          lang: "python",
          filename: "streaming.py",
          desc: "Stream LLM tokens to the client using Server-Sent Events — the pattern used by ChatGPT.",
          code: `from fastapi import FastAPI
from fastapi.responses import StreamingResponse
import asyncio
import json

app = FastAPI()

async def token_stream(prompt: str):
    """Generator that yields SSE-formatted chunks."""
    # In real code: stream from OpenAI / vLLM / HuggingFace
    words = f"This is a streamed response to: {prompt}".split()
    for word in words:
        # SSE format: "data: <payload>\n\n"
        chunk = {"token": word + " ", "done": False}
        yield f"data: {json.dumps(chunk)}\n\n"
        await asyncio.sleep(0.05)   # simulate token generation delay

    # Final message signals completion
    yield f"data: {json.dumps({'token': '', 'done': True})}\n\n"

from pydantic import BaseModel

class InferenceRequest(BaseModel):
    prompt: str
    model: str = "gpt-4o-mini"

@app.post("/inference/stream")
async def stream_inference(body: InferenceRequest):
    return StreamingResponse(
        token_stream(body.prompt),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",   # disable nginx buffering
        },
    )

# OpenAI-compatible streaming with the openai library
@app.post("/openai/stream")
async def openai_stream(body: InferenceRequest):
    from openai import AsyncOpenAI
    client = AsyncOpenAI()

    async def generate():
        stream = await client.chat.completions.create(
            model=body.model,
            messages=[{"role": "user", "content": body.prompt}],
            stream=True,
        )
        async for chunk in stream:
            delta = chunk.choices[0].delta.content or ""
            if delta:
                yield f"data: {json.dumps({'token': delta})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")`,
          notes: [
            "StreamingResponse accepts any async generator that yields bytes or strings",
            "SSE format is 'data: <content>\\n\\n' — double newline is mandatory",
            "X-Accel-Buffering: no prevents Nginx from buffering the stream",
            "Clients read SSE with EventSource API in the browser or httpx in Python",
          ]
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "pydantic",
      icon: "✅",
      title: "Pydantic Models",
      items: [
        {
          title: "CRUD Schema Pattern",
          lang: "python",
          filename: "app/schemas/user.py",
          desc: "Separate schemas for create, update, DB, and public response — the professional pattern.",
          code: `from pydantic import BaseModel, Field, EmailStr, field_validator
from datetime import datetime
from enum import Enum
from typing import Self

class UserRole(str, Enum):
    admin = "admin"
    user = "user"
    viewer = "viewer"

# ── Create (POST body) ────────────────────────────────────────────────────
class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_]+$")
    email: EmailStr                          # validates email format
    password: str = Field(min_length=8)
    role: UserRole = UserRole.user

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError("Must contain uppercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Must contain a digit")
        return v

# ── Update (PATCH body — all optional) ────────────────────────────────────
class UserUpdate(BaseModel):
    username: str | None = Field(None, min_length=3, max_length=50)
    email: EmailStr | None = None

# ── DB row representation (from ORM) ─────────────────────────────────────
class UserInDB(BaseModel):
    id: int
    username: str
    email: str
    hashed_password: str
    role: UserRole
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

# ── Public response (never expose password) ───────────────────────────────
class UserPublic(BaseModel):
    id: int
    username: str
    email: str
    role: UserRole
    is_active: bool
    created_at: datetime

    model_config = {
        "from_attributes": True,
        "json_schema_extra": {
            "example": {
                "id": 1,
                "username": "alice",
                "email": "alice@example.com",
                "role": "user",
                "is_active": True,
                "created_at": "2024-01-01T00:00:00Z",
            }
        }
    }

# ── Paginated list response ────────────────────────────────────────────────
class PaginatedUsers(BaseModel):
    items: list[UserPublic]
    total: int
    skip: int
    limit: int`,
          notes: [
            "EmailStr from pydantic validates RFC-compliant email addresses",
            "Never put hashed_password in UserPublic — response_model filters automatically",
            "json_schema_extra.example appears in /docs as a sample request/response",
            "PaginatedUsers wraps lists with metadata — consistent pagination across all list endpoints",
          ]
        },
        {
          title: "Advanced Validators",
          lang: "python",
          filename: "validators.py",
          desc: "Field validators, model validators, and computed fields for complex validation logic.",
          code: `from pydantic import BaseModel, field_validator, model_validator, computed_field, Field
from datetime import date
from typing import Self

class DateRange(BaseModel):
    start_date: date
    end_date: date
    max_days: int = Field(default=365, exclude=True)  # internal, not serialized

    @model_validator(mode="after")
    def check_date_range(self) -> Self:
        if self.end_date <= self.start_date:
            raise ValueError("end_date must be after start_date")
        delta = (self.end_date - self.start_date).days
        if delta > self.max_days:
            raise ValueError(f"Range cannot exceed {self.max_days} days")
        return self

    @computed_field
    @property
    def duration_days(self) -> int:
        return (self.end_date - self.start_date).days

class NormalizedRequest(BaseModel):
    name: str
    email: str
    phone: str | None = None

    @field_validator("name", mode="before")
    @classmethod
    def strip_name(cls, v: str) -> str:
        return v.strip().title()   # "  alice smith " → "Alice Smith"

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()

    @field_validator("phone", mode="before")
    @classmethod
    def clean_phone(cls, v: str | None) -> str | None:
        if v is None:
            return None
        # Strip non-digits
        digits = "".join(c for c in v if c.isdigit())
        if len(digits) not in (10, 11):
            raise ValueError("Phone must be 10 or 11 digits")
        return digits`,
          notes: [
            "mode='before' runs before type coercion — ideal for normalization (strip, lower)",
            "mode='after' runs after all field validation — use for cross-field checks",
            "exclude=True on a Field means it's used internally but not included in model_dump()",
            "@computed_field adds a read-only derived property that IS included in model_dump()",
          ]
        },
        {
          title: "Generic Responses and Pagination",
          lang: "python",
          filename: "generic_responses.py",
          desc: "Reusable generic response wrappers using Python generics.",
          code: `from pydantic import BaseModel
from typing import TypeVar, Generic

T = TypeVar("T")

class PagedResponse(BaseModel, Generic[T]):
    """Generic paginated response wrapper."""
    items: list[T]
    total: int
    page: int
    size: int
    pages: int

    @classmethod
    def create(cls, items: list[T], total: int, page: int, size: int):
        return cls(
            items=items,
            total=total,
            page=page,
            size=size,
            pages=(total + size - 1) // size,
        )

class ApiResponse(BaseModel, Generic[T]):
    """Standard envelope for all responses."""
    data: T
    message: str = "success"
    request_id: str | None = None

# Usage in routes
from fastapi import FastAPI
app = FastAPI()

@app.get("/users", response_model=PagedResponse[UserPublic])
async def list_users(page: int = 1, size: int = 20, db: AsyncSession = Depends(get_db)):
    offset = (page - 1) * size
    users, total = await get_users_paginated(db, offset=offset, limit=size)
    return PagedResponse.create(items=users, total=total, page=page, size=size)

@app.post("/users", response_model=ApiResponse[UserPublic])
async def create_user(body: UserCreate, db: AsyncSession = Depends(get_db)):
    user = await create_user_in_db(db, body)
    return ApiResponse(data=user, message="User created successfully")`,
          notes: [
            "Generic[T] with TypeVar makes the wrapper reusable for any response type",
            "response_model=PagedResponse[UserPublic] — FastAPI supports generic response models",
            "Consistent response envelopes make frontend integration predictable",
            "pages = ceil(total / size) without importing math library",
          ]
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "dependency-injection",
      icon: "🔗",
      title: "Dependency Injection",
      items: [
        {
          title: "Database Session Dependency",
          lang: "python",
          filename: "app/database.py",
          desc: "Async SQLAlchemy setup with per-request session and automatic commit/rollback.",
          code: `from sqlalchemy.ext.asyncio import (
    AsyncSession,
    create_async_engine,
    async_sessionmaker,
)
from sqlalchemy.orm import DeclarativeBase
import os

DATABASE_URL = os.environ["DATABASE_URL"]
# e.g. "postgresql+asyncpg://user:password@localhost:5432/mydb"

engine = create_async_engine(
    DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_timeout=30,
    pool_pre_ping=True,   # verify connections before using from pool
    echo=False,           # set True to log all SQL (dev only)
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    expire_on_commit=False,  # don't expire objects after commit
    class_=AsyncSession,
)

class Base(DeclarativeBase):
    pass

# ── Dependency ────────────────────────────────────────────────────────────
from typing import AsyncGenerator
from fastapi import Depends
from typing import Annotated

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise

DB = Annotated[AsyncSession, Depends(get_db)]`,
          notes: [
            "pool_pre_ping=True prevents 'connection closed' errors by testing connections before use",
            "expire_on_commit=False: after commit, attributes stay accessible without re-querying",
            "Commit is automatic in get_db — routes don't need to call commit()",
            "Rollback on any exception ensures no partial writes leak to the database",
          ]
        },
        {
          title: "Auth Dependency Chain",
          lang: "python",
          filename: "app/deps.py",
          desc: "Layered authentication dependencies — token → user ID → user → role checks.",
          code: `from fastapi import Depends, HTTPException, status, Header
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from typing import Annotated
from app.config import get_settings
from app.schemas.auth import TokenData

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# ── Layer 1: Extract and verify JWT ──────────────────────────────────────
async def get_current_user(
    token: str = Depends(oauth2_scheme),
    settings = Depends(get_settings),
) -> TokenData:
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        user_id = int(payload["sub"])
        role = payload.get("role", "user")
        return TokenData(user_id=user_id, role=role)
    except (JWTError, KeyError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

# ── Layer 2: Role checks ──────────────────────────────────────────────────
async def require_admin(user: TokenData = Depends(get_current_user)) -> TokenData:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

async def require_active(user: TokenData = Depends(get_current_user)) -> TokenData:
    # Could check DB for is_active flag
    return user

# ── Layer 3: API Key auth (alternative to JWT) ────────────────────────────
async def api_key_auth(
    x_api_key: Annotated[str | None, Header()] = None,
    db: AsyncSession = Depends(get_db),
) -> TokenData:
    if not x_api_key:
        raise HTTPException(status_code=401, detail="API key required")
    # Look up key in DB
    api_key_record = await get_api_key(db, x_api_key)
    if not api_key_record or not api_key_record.is_active:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return TokenData(user_id=api_key_record.user_id, role=api_key_record.role)

# ── Type aliases ──────────────────────────────────────────────────────────
CurrentUser = Annotated[TokenData, Depends(get_current_user)]
AdminUser = Annotated[TokenData, Depends(require_admin)]`,
          notes: [
            "Each layer has a single responsibility — easy to test each in isolation",
            "Type aliases (CurrentUser, AdminUser) keep route signatures readable",
            "get_settings is also a dependency — settings can be overridden in tests",
            "Dependency caching: get_current_user is called once per request even if multiple routes use it",
          ]
        },
        {
          title: "Service Layer Pattern",
          lang: "python",
          filename: "app/services/user_service.py",
          desc: "Business logic separated from HTTP — testable without FastAPI.",
          code: `from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException
from app.models import User
from app.schemas.user import UserCreate, UserUpdate
from app.auth import hash_password

class UserService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_user(self, data: UserCreate) -> User:
        user = User(
            username=data.username,
            email=data.email,
            hashed_password=hash_password(data.password),
            role=data.role,
        )
        self.db.add(user)
        try:
            await self.db.flush()  # write to DB, check constraints
        except IntegrityError:
            raise HTTPException(409, "Username or email already exists")
        return user

    async def get_user(self, user_id: int) -> User | None:
        return await self.db.get(User, user_id)

    async def list_users(
        self,
        skip: int = 0,
        limit: int = 20,
        search: str | None = None,
    ) -> tuple[list[User], int]:
        query = select(User)
        if search:
            query = query.where(
                or_(
                    User.username.ilike(f"%{search}%"),
                    User.email.ilike(f"%{search}%"),
                )
            )
        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total = (await self.db.execute(count_query)).scalar_one()
        # Get page
        users = (await self.db.execute(
            query.offset(skip).limit(limit).order_by(User.created_at.desc())
        )).scalars().all()
        return list(users), total

    async def update_user(self, user_id: int, data: UserUpdate) -> User:
        user = await self.get_user(user_id)
        if not user:
            raise HTTPException(404, "User not found")
        update_data = data.model_dump(exclude_unset=True)  # only changed fields
        for field, value in update_data.items():
            setattr(user, field, value)
        await self.db.flush()
        return user`,
          notes: [
            "Service has no FastAPI imports except HTTPException — pure business logic",
            "flush() writes to DB within the transaction without committing — lets you catch IntegrityError",
            "model_dump(exclude_unset=True) — only update fields that were actually provided in PATCH",
            "ilike() is case-insensitive LIKE — works in PostgreSQL",
          ]
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "middleware-security",
      icon: "🛡️",
      title: "Middleware & Security",
      items: [
        {
          title: "Request Logging Middleware",
          lang: "python",
          filename: "app/middleware.py",
          desc: "Middleware that adds request IDs, measures response time, and logs structured JSON.",
          code: `import time
import uuid
import logging
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("api.access")

class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        request.state.request_id = request_id
        start = time.perf_counter()

        try:
            response = await call_next(request)
        except Exception:
            logger.error(
                "unhandled_exception",
                extra={
                    "request_id": request_id,
                    "method": request.method,
                    "path": request.url.path,
                },
                exc_info=True,
            )
            raise

        duration_ms = round((time.perf_counter() - start) * 1000, 2)
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Response-Time-Ms"] = str(duration_ms)

        logger.info(
            "request",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "query": str(request.query_params),
                "status": response.status_code,
                "duration_ms": duration_ms,
                "user_agent": request.headers.get("user-agent"),
                "ip": request.client.host if request.client else None,
            }
        )
        return response`,
          notes: [
            "Accept X-Request-ID from upstream proxies so trace IDs flow through the system",
            "Log at the middleware level for consistent coverage — routes don't need to log individually",
            "exc_info=True in the error log includes the full traceback",
            "duration_ms in every log line enables latency monitoring in log aggregation tools",
          ]
        },
        {
          title: "Rate Limiting with Redis",
          lang: "python",
          filename: "rate_limiter.py",
          desc: "Sliding window rate limiter using Redis — production-grade, works across multiple workers.",
          code: `import time
import redis.asyncio as redis
from fastapi import Request, HTTPException

class RateLimiter:
    def __init__(self, redis_url: str):
        self.redis = redis.from_url(redis_url, decode_responses=True)

    async def check_rate_limit(
        self,
        key: str,
        limit: int,
        window_seconds: int,
    ) -> tuple[bool, int, int]:
        """
        Sliding window rate limiter using Redis sorted sets.
        Returns: (allowed, remaining, reset_at_timestamp)
        """
        now = time.time()
        window_start = now - window_seconds
        pipe_key = f"ratelimit:{key}"

        async with self.redis.pipeline() as pipe:
            # Remove entries outside the window
            await pipe.zremrangebyscore(pipe_key, 0, window_start)
            # Count current entries in window
            await pipe.zcard(pipe_key)
            # Add current request
            await pipe.zadd(pipe_key, {str(now): now})
            # Set expiry
            await pipe.expire(pipe_key, window_seconds * 2)
            _, count, *_ = await pipe.execute()

        remaining = max(0, limit - count - 1)
        allowed = count < limit
        reset_at = int(now + window_seconds)
        return allowed, remaining, reset_at

# Dependency factory
def rate_limit(limit: int, window_seconds: int = 60, key_func=None):
    async def check(request: Request):
        limiter: RateLimiter = request.app.state.rate_limiter
        # Default key: IP address
        key = key_func(request) if key_func else (
            request.headers.get("X-Forwarded-For", request.client.host)
        )
        allowed, remaining, reset_at = await limiter.check_rate_limit(
            key, limit, window_seconds
        )
        if not allowed:
            raise HTTPException(
                status_code=429,
                detail="Rate limit exceeded",
                headers={
                    "X-RateLimit-Limit": str(limit),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(reset_at),
                    "Retry-After": str(reset_at - int(time.time())),
                }
            )
        return {"remaining": remaining}
    return check

# Usage
from fastapi import FastAPI, Depends
app = FastAPI()

@app.post("/inference", dependencies=[Depends(rate_limit(10, window_seconds=60))])
async def inference(body: dict):
    return {"result": "..."}`,
          notes: [
            "Sliding window with sorted sets: entries are timestamps, ZREMRANGEBYSCORE removes expired ones",
            "Pipeline (atomic multi-command) avoids race conditions between check and increment",
            "X-RateLimit-* headers are the standard way to communicate limits to clients",
            "In Kubernetes with multiple pods, Redis ensures rate limits are shared across all pods",
          ]
        },
        {
          title: "CORS and Security Headers",
          lang: "python",
          filename: "security_headers.py",
          desc: "Production CORS configuration and security headers middleware.",
          code: `from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

app = FastAPI()

# ── Security headers middleware ────────────────────────────────────────────
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        response.headers.update({
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "X-XSS-Protection": "1; mode=block",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
            "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
        })
        return response

# ── CORS (must be added BEFORE other middleware) ───────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://app.mycompany.com",
        "https://admin.mycompany.com",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
    expose_headers=["X-Request-ID", "X-Response-Time-Ms", "X-RateLimit-Remaining"],
    max_age=600,
)

app.add_middleware(SecurityHeadersMiddleware)`,
          notes: [
            "Add middleware in reverse execution order — last added runs first (LIFO)",
            "CORS must run before any middleware that might return 401/403 — preflight needs to pass first",
            "HSTS header (Strict-Transport-Security) tells browsers to always use HTTPS",
            "Permissions-Policy restricts browser APIs — camera=() means 'no access'",
          ]
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "background-tasks",
      icon: "⚙️",
      title: "Background Tasks & Async Patterns",
      items: [
        {
          title: "BackgroundTasks Pattern",
          lang: "python",
          filename: "background.py",
          desc: "Using FastAPI's BackgroundTasks for post-response work like notifications and analytics.",
          code: `from fastapi import FastAPI, BackgroundTasks, Depends
import logging
import asyncio

app = FastAPI()
logger = logging.getLogger(__name__)

# ── Background task functions ─────────────────────────────────────────────
async def send_welcome_email(email: str, username: str):
    """Runs after HTTP response is returned to client."""
    try:
        # In prod: use an email service like SendGrid, Resend, SES
        await asyncio.sleep(0.5)   # simulate network call
        logger.info("welcome_email_sent", extra={"email": email})
    except Exception as e:
        logger.error("welcome_email_failed", extra={"email": email, "error": str(e)})

async def invalidate_user_cache(user_id: int):
    try:
        import redis.asyncio as redis
        r = redis.from_url("redis://localhost:6379")
        await r.delete(f"user:{user_id}", f"user:profile:{user_id}")
        logger.info("cache_invalidated", extra={"user_id": user_id})
    except Exception as e:
        logger.warning("cache_invalidation_failed", extra={"error": str(e)})

async def log_audit_event(action: str, user_id: int, resource: str):
    """Write audit log to a separate store."""
    await asyncio.sleep(0)  # yield to event loop
    logger.info("audit", extra={"action": action, "user_id": user_id, "resource": resource})

# ── Routes using BackgroundTasks ──────────────────────────────────────────
@app.post("/users", status_code=201)
async def create_user(
    body: UserCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    user = await create_user_in_db(db, body)

    background_tasks.add_task(send_welcome_email, user.email, user.username)
    background_tasks.add_task(log_audit_event, "user.created", user.id, f"/users/{user.id}")

    return user   # returned to client immediately

@app.put("/users/{user_id}")
async def update_user(
    user_id: int,
    body: UserUpdate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    user = await update_user_in_db(db, user_id, body)

    background_tasks.add_task(invalidate_user_cache, user_id)
    background_tasks.add_task(log_audit_event, "user.updated", current_user.user_id, f"/users/{user_id}")

    return user`,
          notes: [
            "BackgroundTasks.add_task(func, *args, **kwargs) — runs after response is sent",
            "Always catch exceptions in background tasks — failures are silent otherwise",
            "BackgroundTasks is not persistent — tasks are lost if the server crashes mid-flight",
            "For guaranteed delivery: use Celery + Redis/RabbitMQ or a proper job queue",
          ]
        },
        {
          title: "Celery Integration",
          lang: "python",
          filename: "celery_tasks.py",
          desc: "Celery for reliable background jobs with retries, scheduling, and monitoring.",
          code: `# pip install celery redis
from celery import Celery
import asyncio

# ── Celery app setup ──────────────────────────────────────────────────────
celery_app = Celery(
    "worker",
    broker="redis://localhost:6379/0",
    backend="redis://localhost:6379/1",
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    task_track_started=True,
    task_acks_late=True,         # ack only after task completes (safer)
    worker_prefetch_multiplier=1, # one task at a time per worker
)

# ── Task definitions ──────────────────────────────────────────────────────
@celery_app.task(
    name="process_document",
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def process_document(self, document_id: int, user_id: int):
    """Long-running document processing task."""
    try:
        # Run async code inside a sync Celery task
        result = asyncio.run(_process_document_async(document_id))
        return {"document_id": document_id, "status": "completed", "result": result}
    except Exception as exc:
        # Exponential backoff: 60s, 120s, 240s
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))

async def _process_document_async(document_id: int):
    # Your actual async processing logic
    return {"pages": 10, "words": 5000}

# ── Enqueue from FastAPI routes ───────────────────────────────────────────
from fastapi import FastAPI
app = FastAPI()

@app.post("/documents/{doc_id}/process")
async def trigger_processing(doc_id: int, current_user: TokenData = Depends(get_current_user)):
    task = process_document.delay(doc_id, current_user.user_id)
    return {"task_id": task.id, "status": "queued"}

@app.get("/tasks/{task_id}")
async def get_task_status(task_id: str):
    task = celery_app.AsyncResult(task_id)
    return {
        "task_id": task_id,
        "status": task.status,      # PENDING, STARTED, SUCCESS, FAILURE, RETRY
        "result": task.result if task.ready() else None,
    }`,
          notes: [
            "task_acks_late=True: message stays in queue until task succeeds — prevents data loss on crash",
            "max_retries + retry(countdown=...) implements exponential backoff automatically",
            "AsyncResult lets you poll task status — expose this as an API endpoint for long-running jobs",
            "Run workers: celery -A celery_tasks.celery_app worker --loglevel=info",
            "Monitor with Flower: pip install flower && celery -A worker flower",
          ]
        },
        {
          title: "Concurrent I/O with asyncio.gather",
          lang: "python",
          filename: "concurrent_io.py",
          desc: "Pattern for fetching multiple data sources concurrently in a single route.",
          code: `import asyncio
import httpx
from fastapi import FastAPI

app = FastAPI()

async def get_user_profile(db, user_id: int):
    return await db.get(User, user_id)

async def get_user_posts(db, user_id: int):
    result = await db.execute(select(Post).where(Post.user_id == user_id).limit(10))
    return result.scalars().all()

async def get_user_stats(redis_client, user_id: int):
    data = await redis_client.hgetall(f"stats:user:{user_id}")
    return data or {"views": 0, "likes": 0}

async def get_external_reputation(http_client: httpx.AsyncClient, user_id: int):
    try:
        resp = await http_client.get(f"https://api.external.com/reputation/{user_id}")
        return resp.json()
    except Exception:
        return None   # graceful degradation

@app.get("/users/{user_id}/dashboard")
async def user_dashboard(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    request: Request = None,
):
    redis = request.app.state.redis
    http = request.app.state.http_client

    # Fire all queries concurrently — total time ≈ max(individual times)
    profile, posts, stats, reputation = await asyncio.gather(
        get_user_profile(db, user_id),
        get_user_posts(db, user_id),
        get_user_stats(redis, user_id),
        get_external_reputation(http, user_id),
        return_exceptions=True,   # don't raise if one fails
    )

    return {
        "profile": profile if not isinstance(profile, Exception) else None,
        "posts": posts if not isinstance(posts, Exception) else [],
        "stats": stats if not isinstance(stats, Exception) else {},
        "reputation": reputation if not isinstance(reputation, Exception) else None,
    }`,
          notes: [
            "asyncio.gather() runs all coroutines concurrently — total time = slowest query, not sum",
            "return_exceptions=True: exceptions are returned as values instead of propagating",
            "Check isinstance(result, Exception) to handle partial failures gracefully",
            "For 4 queries each taking 100ms: sequential = 400ms, concurrent = ~100ms",
          ]
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "jwt-auth",
      icon: "🔐",
      title: "JWT Authentication",
      items: [
        {
          title: "Complete Auth Router",
          lang: "python",
          filename: "app/routers/auth.py",
          desc: "Login, refresh, logout, and change-password endpoints with JWT.",
          code: `from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.auth import (
    verify_password, create_access_token, create_refresh_token,
    decode_token, hash_password,
)
from app.models import User, RefreshToken
from app.schemas.auth import TokenResponse, RefreshRequest, ChangePasswordRequest
from app.deps import get_current_user
from datetime import datetime, timezone

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/login", response_model=TokenResponse)
async def login(
    form: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    # Get user
    result = await db.execute(select(User).where(User.username == form.username))
    user = result.scalar_one_or_none()

    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled")

    # Create tokens
    access_token = create_access_token(user.id, user.role)
    refresh_token_str = create_refresh_token(user.id)

    # Store refresh token in DB (for revocation)
    rt = RefreshToken(user_id=user.id, token=refresh_token_str)
    db.add(rt)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token_str,
        expires_in=30 * 60,
    )

@router.post("/refresh", response_model=TokenResponse)
async def refresh(body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    token_data = decode_token(body.refresh_token, expected_type="refresh")

    # Check token is in DB (not revoked)
    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.token == body.refresh_token,
            RefreshToken.revoked_at.is_(None),
        )
    )
    stored_token = result.scalar_one_or_none()
    if not stored_token:
        raise HTTPException(status_code=401, detail="Refresh token revoked")

    user = await db.get(User, token_data.user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or disabled")

    # Rotate: revoke old, issue new
    stored_token.revoked_at = datetime.now(timezone.utc)
    new_access = create_access_token(user.id, user.role)
    new_refresh = create_refresh_token(user.id)
    db.add(RefreshToken(user_id=user.id, token=new_refresh))

    return TokenResponse(access_token=new_access, refresh_token=new_refresh, expires_in=1800)

@router.post("/logout", status_code=204)
async def logout(
    body: RefreshRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    # Revoke refresh token
    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.token == body.refresh_token,
            RefreshToken.user_id == current_user.user_id,
        )
    )
    token = result.scalar_one_or_none()
    if token:
        token.revoked_at = datetime.now(timezone.utc)`,
          notes: [
            "Store refresh tokens in DB to enable revocation (logout, compromised token)",
            "Token rotation: on refresh, revoke old refresh token and issue a new one",
            "Always verify both the JWT signature AND that the token is in the DB (not revoked)",
            "Return 401 for invalid credentials — never reveal whether username or password was wrong",
          ]
        },
        {
          title: "JWT Token Creation & Verification",
          lang: "python",
          filename: "app/auth.py",
          desc: "JWT encode/decode, password hashing, and token models.",
          code: `# pip install python-jose[cryptography] passlib[bcrypt]
from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status
from pydantic import BaseModel
import os

# ── Config ────────────────────────────────────────────────────────────────
SECRET_KEY = os.environ["SECRET_KEY"]   # openssl rand -hex 32
ALGORITHM = "HS256"
ACCESS_TOKEN_MINUTES = 30
REFRESH_TOKEN_DAYS = 7

# ── Password hashing ──────────────────────────────────────────────────────
_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(plain: str) -> str:
    return _pwd.hash(plain)

def verify_password(plain: str, hashed: str) -> bool:
    return _pwd.verify(plain, hashed)

# ── Token schemas ─────────────────────────────────────────────────────────
class TokenData(BaseModel):
    user_id: int
    role: str = "user"

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int

# ── Token creation ────────────────────────────────────────────────────────
def create_access_token(user_id: int, role: str) -> str:
    return jwt.encode(
        {
            "sub": str(user_id),
            "role": role,
            "type": "access",
            "iat": datetime.now(timezone.utc),
            "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_MINUTES),
        },
        SECRET_KEY,
        algorithm=ALGORITHM,
    )

def create_refresh_token(user_id: int) -> str:
    return jwt.encode(
        {
            "sub": str(user_id),
            "type": "refresh",
            "exp": datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_DAYS),
        },
        SECRET_KEY,
        algorithm=ALGORITHM,
    )

# ── Token verification ────────────────────────────────────────────────────
def decode_token(token: str, expected_type: str = "access") -> TokenData:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if payload.get("type") != expected_type:
        raise HTTPException(status_code=401, detail=f"Expected {expected_type} token")
    return TokenData(user_id=int(payload["sub"]), role=payload.get("role", "user"))`,
          notes: [
            "Generate SECRET_KEY with: openssl rand -hex 32 — never commit it to git",
            "Include 'type' claim to prevent access tokens from being used as refresh tokens",
            "algorithms=[ALGORITHM] in jwt.decode — always explicit, never accept any algorithm",
            "Use timezone.utc for all datetime operations — naive datetimes cause subtle bugs",
          ]
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "testing",
      icon: "🧪",
      title: "Testing Patterns",
      items: [
        {
          title: "Test Fixtures (conftest.py)",
          lang: "python",
          filename: "tests/conftest.py",
          desc: "Complete test setup: in-memory SQLite, per-test transaction rollback, auth overrides.",
          code: `import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.main import app, create_app
from app.database import Base, get_db
from app.deps import get_current_user
from app.schemas.auth import TokenData

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"

@pytest_asyncio.fixture(scope="session")
async def engine():
    eng = create_async_engine(TEST_DB_URL, echo=False)
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield eng
    await eng.dispose()

@pytest_asyncio.fixture()
async def db(engine):
    """Isolated per-test transaction — rolls back after each test."""
    conn = await engine.connect()
    await conn.begin()
    session = AsyncSession(bind=conn, expire_on_commit=False)
    try:
        yield session
    finally:
        await session.close()
        await conn.rollback()
        await conn.close()

@pytest_asyncio.fixture()
async def client(db):
    """Unauthenticated HTTP client with DB override."""
    async def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()

@pytest_asyncio.fixture()
async def user_client(client):
    """Authenticated as regular user."""
    app.dependency_overrides[get_current_user] = lambda: TokenData(user_id=1, role="user")
    yield client
    app.dependency_overrides.pop(get_current_user, None)

@pytest_asyncio.fixture()
async def admin_client(client):
    """Authenticated as admin."""
    app.dependency_overrides[get_current_user] = lambda: TokenData(user_id=99, role="admin")
    yield client
    app.dependency_overrides.pop(get_current_user, None)

# pyproject.toml:
# [tool.pytest.ini_options]
# asyncio_mode = "auto"
# testpaths = ["tests"]`,
          notes: [
            "scope='session' for the engine (once per test run); default scope for db (once per test)",
            "Transaction rollback after each test ensures complete isolation",
            "dependency_overrides is the clean way to swap dependencies — no monkeypatching needed",
            "ASGITransport runs the app in-process — no network, very fast",
          ]
        },
        {
          title: "Integration Tests",
          lang: "python",
          filename: "tests/test_users.py",
          desc: "Comprehensive integration tests covering happy path, auth, and error cases.",
          code: `import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import User
from app.auth import hash_password

pytestmark = pytest.mark.asyncio

# ── Helper to seed data ───────────────────────────────────────────────────
async def make_user(db: AsyncSession, **kwargs) -> User:
    defaults = {
        "username": "testuser",
        "email": "test@example.com",
        "hashed_password": hash_password("SecurePass1"),
        "role": "user",
        "is_active": True,
    }
    user = User(**{**defaults, **kwargs})
    db.add(user)
    await db.flush()
    return user

# ── Create user ───────────────────────────────────────────────────────────
async def test_create_user_success(client: AsyncClient):
    resp = await client.post("/api/v1/users", json={
        "username": "alice",
        "email": "alice@example.com",
        "password": "SecurePass1",
    })
    assert resp.status_code == 201
    body = resp.json()
    assert body["username"] == "alice"
    assert "password" not in body
    assert "hashed_password" not in body

async def test_create_user_weak_password(client: AsyncClient):
    resp = await client.post("/api/v1/users", json={
        "username": "bob",
        "email": "bob@example.com",
        "password": "weak",       # too short
    })
    assert resp.status_code == 422

async def test_create_user_duplicate_email(client: AsyncClient, db: AsyncSession):
    await make_user(db, email="dup@example.com", username="existing")

    resp = await client.post("/api/v1/users", json={
        "username": "newuser",
        "email": "dup@example.com",    # duplicate
        "password": "SecurePass1",
    })
    assert resp.status_code == 409

# ── Auth tests ────────────────────────────────────────────────────────────
async def test_get_own_profile(user_client: AsyncClient):
    resp = await user_client.get("/users/me")
    assert resp.status_code == 200

async def test_unauthenticated_returns_401(client: AsyncClient):
    resp = await client.get("/users/me")
    assert resp.status_code == 401

async def test_user_cannot_access_admin_route(user_client: AsyncClient):
    resp = await user_client.get("/api/v1/admin/users")
    assert resp.status_code == 403

async def test_admin_can_access_admin_route(admin_client: AsyncClient, db: AsyncSession):
    await make_user(db)
    resp = await admin_client.get("/api/v1/admin/users")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)

# ── Pagination ────────────────────────────────────────────────────────────
async def test_list_users_pagination(admin_client: AsyncClient, db: AsyncSession):
    for i in range(5):
        await make_user(db, username=f"user{i}", email=f"u{i}@example.com")

    resp = await admin_client.get("/api/v1/users?skip=0&limit=2")
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["items"]) == 2
    assert body["total"] >= 5`,
          notes: [
            "make_user helper with **kwargs allows per-test customization with sensible defaults",
            "Test the response contract, not internal implementation — avoid assert user.id == db_user.id",
            "Always test both success and failure cases — 201, 409, 422 for create",
            "Flush (not commit) in fixtures — the test transaction captures it and rolls back after",
          ]
        },
        {
          title: "Mocking External Services",
          lang: "python",
          filename: "tests/test_external.py",
          desc: "Mock OpenAI, HTTP clients, and email services in tests.",
          code: `import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from httpx import AsyncClient, Response as HttpxResponse

pytestmark = pytest.mark.asyncio

# ── Mock OpenAI completion ────────────────────────────────────────────────
async def test_inference_returns_completion(user_client: AsyncClient):
    mock_choice = MagicMock()
    mock_choice.message.content = "The capital of France is Paris."

    mock_completion = MagicMock()
    mock_completion.choices = [mock_choice]
    mock_completion.usage.total_tokens = 42

    with patch(
        "app.services.llm.openai_client.chat.completions.create",
        new=AsyncMock(return_value=mock_completion),
    ):
        resp = await user_client.post("/inference", json={
            "prompt": "What is the capital of France?",
            "model": "gpt-4o-mini",
        })

    assert resp.status_code == 200
    body = resp.json()
    assert "Paris" in body["answer"]
    assert body["tokens_used"] == 42

# ── Mock httpx for external API calls ────────────────────────────────────
async def test_webhook_delivery(user_client: AsyncClient):
    # Using respx (pip install respx) — cleaner than patch for httpx
    import respx

    with respx.mock(assert_all_called=True) as mock:
        mock.post("https://hooks.example.com/notify").mock(
            return_value=HttpxResponse(200, json={"ok": True})
        )
        resp = await user_client.post("/events", json={
            "type": "user.created",
            "user_id": 1,
        })

    assert resp.status_code == 200

# ── Mock email sending ─────────────────────────────────────────────────────
async def test_registration_sends_email(client: AsyncClient):
    with patch("app.services.email.send_welcome_email") as mock_email:
        mock_email.return_value = None   # it's a BackgroundTask, returns None

        resp = await client.post("/api/v1/users", json={
            "username": "newuser",
            "email": "new@example.com",
            "password": "SecurePass1",
        })
        assert resp.status_code == 201

        # Email was scheduled (called once with correct args)
        mock_email.assert_called_once()
        call_kwargs = mock_email.call_args
        assert "new@example.com" in str(call_kwargs)`,
          notes: [
            "Patch at the point of use: 'app.services.llm.openai_client', not 'openai.AsyncOpenAI'",
            "AsyncMock is required for async functions — regular Mock raises 'coroutine never awaited'",
            "respx is purpose-built for mocking httpx — cleaner than patch for HTTP tests",
            "assert_all_called=True in respx ensures the mock was actually hit (catches dead code)",
          ]
        },
      ]
    },

  ]; // end m.codeExamples
})();
