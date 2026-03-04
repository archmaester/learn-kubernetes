// Patches the FastAPI module (m2) with comprehensive code examples.
// Loaded after curriculum.js and fastapi-lessons.js.
// All examples follow the Sentiment Analysis Inference API built across the 9 lessons.
(function patchFastAPIExamples() {
  const m = CURRICULUM.phases[0].modules[1]; // phase-1 (index 0), second module (m2)

  m.codeExamples = [

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "project-setup",
      icon: "🚀",
      title: "Project Setup & First Endpoint",
      items: [
        {
          title: "Minimal Sentiment API",
          lang: "python",
          filename: "main.py",
          desc: "The starting point — a FastAPI app with one endpoint that will grow into our full service.",
          code: `from fastapi import FastAPI

app = FastAPI(
    title="Sentiment Analysis API",
    description="Production-grade ML inference service",
    version="1.0.0",
    docs_url="/docs",        # Swagger UI — set to None in production
    redoc_url="/redoc",
)

@app.get("/")
async def root():
    return {"service": "sentiment-api", "version": "1.0.0"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

# Run: uvicorn main:app --reload --port 8000`,
          notes: [
            "FastAPI is ASGI — requires an async server like Uvicorn",
            "--reload watches for file changes (dev only, never in production)",
            "Visit http://localhost:8000/docs for interactive Swagger UI",
            "This is the same app we build across all 9 lessons",
          ]
        },
        {
          title: "macOS Setup (Apple Silicon)",
          lang: "bash",
          filename: "setup.sh",
          desc: "Full setup from scratch — pyenv, venv, and all dependencies for the Sentiment API.",
          code: `# ── Python via pyenv (native arm64 compilation) ──────────────────────
brew install pyenv
echo 'export PYENV_ROOT="$HOME/.pyenv"' >> ~/.zshrc
echo 'export PATH="$PYENV_ROOT/bin:$PATH"' >> ~/.zshrc
echo 'eval "$(pyenv init -)"' >> ~/.zshrc
source ~/.zshrc

pyenv install 3.12.4
pyenv global 3.12.4

# Verify architecture
python -c "import platform; print(platform.machine())"  # arm64

# ── Project setup ─────────────────────────────────────────────────────
mkdir sentiment-api && cd sentiment-api
python -m venv .venv
source .venv/bin/activate

# ── Dependencies (all we need across 9 lessons) ──────────────────────
pip install fastapi[standard]         # uvicorn, httpx, python-multipart
pip install pydantic-settings         # env-based config
pip install sqlalchemy[asyncio]       # async ORM
pip install aiosqlite                 # SQLite async driver (dev)
pip install asyncpg                   # PostgreSQL async driver (prod)
pip install redis                     # Redis client (async)
pip install python-jose[cryptography] # JWT encoding/decoding
pip install "passlib[bcrypt]"         # password hashing
pip install gunicorn                  # production process manager

pip freeze > requirements.txt`,
          notes: [
            "pyenv compiles Python natively for arm64 — no Rosetta overhead",
            "fastapi[standard] bundles uvicorn, httpx, and essentials",
            "aiosqlite for dev/testing, asyncpg for production PostgreSQL",
            "passlib[bcrypt] needs quotes in zsh (brackets are glob characters)",
          ]
        },
        {
          title: "Environment Config (Pydantic Settings)",
          lang: "python",
          filename: "config.py",
          desc: "Type-safe config that validates all env vars at startup — fail fast, not on first request.",
          code: `from pydantic_settings import BaseSettings
from typing import Literal

class Settings(BaseSettings):
    # App
    app_name: str = "Sentiment Analysis API"
    env: Literal["development", "staging", "production"] = "development"

    # Database
    database_url: str = "sqlite+aiosqlite:///./dev.db"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # JWT
    jwt_secret_key: str            # REQUIRED — no default, crashes if missing
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    # Model
    model_name: str = "distilbert-base-uncased-finetuned-sst-2-english"

    model_config = {"env_file": ".env"}

settings = Settings()

# .env file:
# JWT_SECRET_KEY=your-256-bit-secret-generate-with-openssl-rand-hex-32
# DATABASE_URL=sqlite+aiosqlite:///./dev.db
# REDIS_URL=redis://localhost:6379/0`,
          notes: [
            "jwt_secret_key has no default — app won't start without it (intentional)",
            "Literal['development', 'staging', 'production'] restricts to valid values",
            "Pydantic Settings reads from env vars AND .env file automatically",
            "Generate secret: openssl rand -hex 32",
          ]
        },
        {
          title: "Project Structure (Complete)",
          lang: "bash",
          filename: "project-structure.sh",
          desc: "The full project structure after all 9 lessons — every file we build.",
          code: `sentiment-api/
├── .venv/
├── .env                      # local secrets (git-ignored)
├── .env.example              # template for other devs
├── .gitignore
├── .dockerignore
├── Dockerfile                # multi-stage production build
├── docker-compose.yml        # local dev (Postgres + Redis)
├── main.py                   # FastAPI app + lifespan
├── auth.py                   # JWT + password hashing
├── model.py                  # SentimentModel (HuggingFace)
├── schemas.py                # Pydantic request/response models
├── config.py                 # Pydantic Settings
├── deps.py                   # all dependencies (DI)
├── middleware.py              # request context, timing, security
├── logging_config.py         # structured JSON logging
├── routers/
│   ├── auth.py               # /auth/login, /register, /refresh
│   ├── predict.py            # /predict (API key + caching)
│   ├── admin.py              # admin routes (JWT + role)
│   └── health.py             # /health, /health/ready
├── tests/
│   ├── conftest.py           # fixtures (fake DB, model, Redis)
│   ├── test_predict.py       # prediction tests
│   ├── test_auth.py          # auth flow tests
│   └── test_middleware.py    # middleware tests
├── k8s/
│   └── deployment.yaml       # K8s preview (Module 4)
├── pyproject.toml
└── requirements.txt`,
          notes: [
            "Every file is introduced in a specific lesson — no surprise files",
            "routers/ keeps HTTP layer thin — business logic lives in services/deps",
            "tests/ mirror the routers they test — conftest.py holds shared fixtures",
            "k8s/ directory is a preview — full coverage in Module 4",
          ]
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "schemas-validation",
      icon: "✅",
      title: "Pydantic Schemas & Validation",
      items: [
        {
          title: "Request & Response Schemas",
          lang: "python",
          filename: "schemas.py",
          desc: "All Pydantic models for the Sentiment API — request validation, response shapes, and auth.",
          code: `from pydantic import BaseModel, Field, EmailStr, field_validator
from datetime import datetime

# ═══════════════════════════════════════════════════════════════════════
# PREDICTION
# ═══════════════════════════════════════════════════════════════════════
class PredictRequest(BaseModel):
    text: str = Field(
        ...,
        min_length=1,
        max_length=5000,
        description="Text to analyze for sentiment",
        examples=["This product is absolutely wonderful!"],
    )
    model_version: str = "v1"

    @field_validator("text", mode="before")
    @classmethod
    def strip_whitespace(cls, v: str) -> str:
        return v.strip()

class PredictResponse(BaseModel):
    sentiment: str          # "positive" or "negative"
    score: float = Field(ge=0.0, le=1.0)
    cached: bool = False

class BatchPredictRequest(BaseModel):
    texts: list[str] = Field(
        ...,
        min_length=1,
        max_length=100,
        description="List of texts (max 100 per batch)",
    )

class BatchPredictResponse(BaseModel):
    results: list[PredictResponse]
    count: int

# ═══════════════════════════════════════════════════════════════════════
# AUTH
# ═══════════════════════════════════════════════════════════════════════
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)

    @field_validator("password")
    @classmethod
    def strong_password(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError("Must contain an uppercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Must contain a digit")
        return v

class UserResponse(BaseModel):
    id: int
    email: str
    role: str
    created_at: datetime

    model_config = {"from_attributes": True}

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int`,
          notes: [
            "PredictRequest validates text is 1-5000 chars — prevents empty input and abuse",
            "strip_whitespace with mode='before' normalizes input before Pydantic validation",
            "Field(ge=0.0, le=1.0) on score ensures the confidence score is always 0-1",
            "UserResponse uses from_attributes=True to accept SQLAlchemy model objects directly",
            "Never include password or hashed_password in UserResponse — Pydantic excludes them automatically",
          ]
        },
        {
          title: "Model Validators (Cross-Field)",
          lang: "python",
          filename: "validators.py",
          desc: "Validators that check relationships between fields — useful for time ranges, paired params.",
          code: `from pydantic import BaseModel, Field, model_validator, computed_field
from datetime import date
from typing import Self

class DateRangeQuery(BaseModel):
    """Used for /predictions/history?start=2024-01-01&end=2024-03-01"""
    start_date: date
    end_date: date
    max_days: int = Field(default=90, exclude=True)  # internal limit

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

class PredictWithOptions(BaseModel):
    """Extended prediction request with optional thresholds."""
    text: str = Field(min_length=1)
    min_confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    return_all_labels: bool = False

    @model_validator(mode="after")
    def validate_options(self) -> Self:
        if self.return_all_labels and self.min_confidence > 0:
            raise ValueError(
                "Cannot filter by min_confidence when returning all labels"
            )
        return self`,
          notes: [
            "model_validator(mode='after') runs after all field validation — ideal for cross-field checks",
            "exclude=True on max_days keeps it out of model_dump() — internal config, not serialized",
            "@computed_field adds a derived property that IS included in JSON output",
            "DateRangeQuery would be used as a query dependency for the predictions history endpoint",
          ]
        },
        {
          title: "Generic API Response Wrapper",
          lang: "python",
          filename: "response_wrapper.py",
          desc: "Consistent response envelope for all endpoints — makes frontend integration predictable.",
          code: `from pydantic import BaseModel
from typing import TypeVar, Generic

T = TypeVar("T")

class ApiResponse(BaseModel, Generic[T]):
    """Standard envelope for all API responses."""
    data: T
    message: str = "success"
    request_id: str | None = None

class PagedResponse(BaseModel, Generic[T]):
    """Paginated response for list endpoints."""
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

# Usage in routes:
# @router.get("/predictions/history", response_model=PagedResponse[PredictResponse])
# async def history(page: int = 1, size: int = 20):
#     predictions, total = await get_predictions(page, size)
#     return PagedResponse.create(items=predictions, total=total, page=page, size=size)
#
# @router.post("/predict", response_model=ApiResponse[PredictResponse])
# async def predict(body: PredictRequest):
#     result = model.predict(body.text)
#     return ApiResponse(data=result)`,
          notes: [
            "Generic[T] makes the wrapper reusable — PagedResponse[PredictResponse], PagedResponse[UserResponse]",
            "response_model= in the route definition generates correct OpenAPI schema",
            "Consistent envelopes let frontend code parse every response the same way",
            "pages = ceil(total / size) computed without importing math",
          ]
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "dependency-injection",
      icon: "🔗",
      title: "Dependency Injection & Wiring",
      items: [
        {
          title: "All Dependencies (deps.py)",
          lang: "python",
          filename: "deps.py",
          desc: "The DI hub — every shared resource injected into routes via Depends().",
          code: `from typing import Annotated, AsyncGenerator
from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import (
    AsyncSession, create_async_engine, async_sessionmaker,
)

from config import settings

# ═══════════════════════════════════════════════════════════════════════
# DATABASE
# ═══════════════════════════════════════════════════════════════════════
engine = create_async_engine(
    settings.database_url,
    pool_pre_ping=True,    # verify connections before use
    echo=False,            # True to log all SQL (dev only)
)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise

# ═══════════════════════════════════════════════════════════════════════
# ML MODEL
# ═══════════════════════════════════════════════════════════════════════
class SentimentModel:
    """Loaded once in lifespan, injected per-request via Depends."""
    def __init__(self, pipeline):
        self._pipe = pipeline

    def predict(self, text: str) -> dict:
        result = self._pipe(text)[0]
        return {"label": result["label"].lower(), "score": round(result["score"], 4)}

    def predict_batch(self, texts: list[str]) -> list[dict]:
        results = self._pipe(texts)
        return [
            {"label": r["label"].lower(), "score": round(r["score"], 4)}
            for r in results
        ]

def get_model(request: Request) -> SentimentModel:
    return request.app.state.model

# ═══════════════════════════════════════════════════════════════════════
# REDIS
# ═══════════════════════════════════════════════════════════════════════
def get_redis(request: Request):
    return request.app.state.redis

# ═══════════════════════════════════════════════════════════════════════
# TYPE ALIASES — clean route signatures
# ═══════════════════════════════════════════════════════════════════════
DB    = Annotated[AsyncSession, Depends(get_db)]
Model = Annotated[SentimentModel, Depends(get_model)]
Redis = Annotated[object, Depends(get_redis)]`,
          notes: [
            "get_db: auto-commit on success, rollback on exception — routes don't call commit()",
            "get_model: returns model from app.state (loaded once in lifespan, not per-request)",
            "pool_pre_ping=True prevents 'connection closed' errors from idle connections",
            "Type aliases (DB, Model, Redis) keep route signatures clean: def predict(db: DB, model: Model)",
          ]
        },
        {
          title: "Lifespan (Startup/Shutdown)",
          lang: "python",
          filename: "main.py",
          desc: "The lifespan context manager — loads the ML model, connects Redis, sets up httpx.",
          code: `from fastapi import FastAPI
from contextlib import asynccontextmanager
import logging
import redis.asyncio as aioredis

from config import settings
from deps import SentimentModel, engine
from routers import predict, admin, auth, health
from middleware import RequestContextMiddleware

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ──────────────────────────────────────────────────────
    logger.info("Loading ML model: %s", settings.model_name)
    from transformers import pipeline
    pipe = pipeline("sentiment-analysis", model=settings.model_name)
    app.state.model = SentimentModel(pipe)
    logger.info("Model loaded")

    # Redis connection
    app.state.redis = aioredis.from_url(
        settings.redis_url, decode_responses=True,
    )

    yield

    # ── Shutdown ─────────────────────────────────────────────────────
    await app.state.redis.close()
    await engine.dispose()
    logger.info("Shutdown complete")

app = FastAPI(
    title=settings.app_name,
    lifespan=lifespan,
    docs_url="/docs" if settings.env != "production" else None,
)

# Middleware
app.add_middleware(RequestContextMiddleware)

# Routers
app.include_router(auth.router)
app.include_router(predict.router)
app.include_router(admin.router)
app.include_router(health.router)`,
          notes: [
            "ML model loads ONCE at startup — not per-request (would be ~2s per call vs ~50ms)",
            "app.state stores shared resources accessible from any route via request.app.state",
            "yield separates startup from shutdown — code after yield runs on SIGTERM",
            "docs_url=None in production hides Swagger UI (security best practice)",
          ]
        },
        {
          title: "Prediction Router with Caching",
          lang: "python",
          filename: "routers/predict.py",
          desc: "The core prediction endpoint — validates input, checks cache, runs model, stores result.",
          code: `import json
from fastapi import APIRouter, BackgroundTasks
from deps import Model, Redis, DB
from schemas import PredictRequest, PredictResponse

router = APIRouter(tags=["predictions"])

async def log_prediction(text: str, result: dict):
    """Background task — runs after response is returned."""
    import logging
    logging.getLogger("predictions").info(
        "prediction", extra={"text": text[:100], **result},
    )

@router.post("/predict", response_model=PredictResponse)
async def predict(
    body: PredictRequest,
    model: Model,
    redis: Redis,
    bg: BackgroundTasks,
):
    # ── Cache check ──────────────────────────────────────────────
    cache_key = f"predict:{body.text[:80]}"
    cached = await redis.get(cache_key)
    if cached:
        data = json.loads(cached)
        data["cached"] = True
        return data

    # ── Model inference ──────────────────────────────────────────
    result = model.predict(body.text)
    response = {
        "sentiment": result["label"],
        "score": result["score"],
        "cached": False,
    }

    # ── Cache result + background log ────────────────────────────
    await redis.setex(cache_key, 3600, json.dumps(response))
    bg.add_task(log_prediction, body.text, response)
    return response`,
          notes: [
            "Cache key uses first 80 chars of text — prevents extremely long Redis keys",
            "setex: set with expiry (3600s = 1 hour) — cache doesn't grow unbounded",
            "Background task logs after response — doesn't add latency to the prediction",
            "This version has no auth — Lesson 7 adds API key and JWT protection",
          ]
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "middleware-logging",
      icon: "🛡️",
      title: "Middleware, CORS & Logging",
      items: [
        {
          title: "Request Context Middleware",
          lang: "python",
          filename: "middleware.py",
          desc: "Adds request IDs, measures response time, and attaches security headers to every response.",
          code: `import time
import uuid
import logging
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("api.access")

class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        # ── Request ID (accept from upstream proxy or generate) ────
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        request.state.request_id = request_id
        start = time.perf_counter()

        try:
            response = await call_next(request)
        except Exception:
            logger.error(
                "unhandled_exception",
                extra={"request_id": request_id, "path": request.url.path},
                exc_info=True,
            )
            raise

        # ── Response headers ──────────────────────────────────────
        duration_ms = round((time.perf_counter() - start) * 1000, 2)
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Process-Time"] = str(duration_ms)

        # ── Security headers ──────────────────────────────────────
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains"
        )

        # ── Structured access log ─────────────────────────────────
        logger.info(
            "request",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status": response.status_code,
                "duration_ms": duration_ms,
                "ip": request.client.host if request.client else None,
            }
        )
        return response`,
          notes: [
            "X-Request-ID flows through from upstream proxies — enables distributed tracing",
            "perf_counter() is monotonic and high-resolution — better than time.time() for durations",
            "Security headers prevent clickjacking (DENY), MIME sniffing (nosniff), and force HTTPS (HSTS)",
            "Structured access log: every field is queryable in log aggregation (Loki, CloudWatch, etc.)",
          ]
        },
        {
          title: "Structured JSON Logging",
          lang: "python",
          filename: "logging_config.py",
          desc: "JSON logs that are parseable by log aggregation tools — not human-readable text.",
          code: `import logging
import json
import sys
from datetime import datetime, timezone

class JSONFormatter(logging.Formatter):
    """Outputs structured JSON — one line per log entry."""
    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        # Merge extra fields (request_id, path, duration_ms, etc.)
        if hasattr(record, "request_id"):
            log_data["request_id"] = record.request_id
        if hasattr(record, "path"):
            log_data["path"] = record.path
        if hasattr(record, "status"):
            log_data["status"] = record.status
        if hasattr(record, "duration_ms"):
            log_data["duration_ms"] = record.duration_ms
        if hasattr(record, "ip"):
            log_data["ip"] = record.ip
        if hasattr(record, "method"):
            log_data["method"] = record.method
        # Include exception info if present
        if record.exc_info and record.exc_info[0]:
            log_data["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_data)

def setup_logging():
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JSONFormatter())
    logging.basicConfig(
        level=logging.INFO,
        handlers=[handler],
    )
    # Suppress noisy libraries
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

# Call at startup: setup_logging()
# Output example:
# {"timestamp":"2024-06-15T10:30:45Z","level":"INFO","logger":"api.access",
#  "message":"request","request_id":"abc-123","method":"POST","path":"/predict",
#  "status":200,"duration_ms":42.5,"ip":"10.0.0.1"}`,
          notes: [
            "JSON logs: one field per key — grep by request_id, filter by status, aggregate duration_ms",
            "Extra fields from middleware (request_id, duration_ms) are merged into the JSON",
            "Suppress uvicorn.access and sqlalchemy.engine to avoid duplicate/noisy logs",
            "In production with Kubernetes: logs go to stdout → collected by Fluentd/Promtail → Loki/CloudWatch",
          ]
        },
        {
          title: "CORS Configuration",
          lang: "python",
          filename: "cors_setup.py",
          desc: "Production CORS — explicit origins, not wildcards. Protects against cross-site request abuse.",
          code: `from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# ── CORS must be added BEFORE other middleware (LIFO order) ──────────
app.add_middleware(
    CORSMiddleware,
    # NEVER use ["*"] in production — list exact origins
    allow_origins=[
        "https://dashboard.yourcompany.com",
        "http://localhost:3000",           # dev frontend
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-API-Key"],
    expose_headers=[
        "X-Request-ID",
        "X-Process-Time",
        "X-RateLimit-Remaining",
    ],
    max_age=600,     # browser caches preflight for 10 min
)

# WHY THIS MATTERS:
# Without CORS headers, browsers block requests from dashboard.yourcompany.com
# to api.yourcompany.com (different subdomain = different origin).
#
# allow_origins=["*"] is dangerous: any website can call your API
# from the user's browser, using their cookies/auth.
#
# expose_headers: by default, browsers can only see Cache-Control,
# Content-Language, Content-Type, Expires, Last-Modified, Pragma.
# Any custom header needs to be explicitly exposed.`,
          notes: [
            "Middleware added last runs first (LIFO) — add CORS before auth middleware",
            "allow_origins=['*'] with allow_credentials=True is a security vulnerability",
            "expose_headers lets JavaScript read X-Request-ID from responses (hidden by default)",
            "max_age=600: browser caches the preflight OPTIONS response for 10 minutes",
          ]
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "auth-security",
      icon: "🔐",
      title: "JWT Authentication & API Keys",
      items: [
        {
          title: "JWT Token Creation & Verification",
          lang: "python",
          filename: "auth.py",
          desc: "JWT encode/decode and password hashing — the auth foundation for the Sentiment API.",
          code: `from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel

from config import settings

# ── Password hashing (bcrypt: intentionally slow) ─────────────────────
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

# ── Token payload ─────────────────────────────────────────────────────
class TokenPayload(BaseModel):
    sub: str          # user ID as string
    role: str         # "user" or "admin"
    type: str         # "access" or "refresh"

# ── Token creation ────────────────────────────────────────────────────
def create_access_token(user_id: int, role: str) -> str:
    now = datetime.now(timezone.utc)
    return jwt.encode(
        {
            "sub": str(user_id),
            "role": role,
            "type": "access",
            "iat": now,
            "exp": now + timedelta(minutes=settings.access_token_expire_minutes),
        },
        settings.jwt_secret_key,
        algorithm="HS256",
    )

def create_refresh_token(user_id: int) -> str:
    now = datetime.now(timezone.utc)
    return jwt.encode(
        {
            "sub": str(user_id),
            "type": "refresh",
            "iat": now,
            "exp": now + timedelta(days=settings.refresh_token_expire_days),
        },
        settings.jwt_secret_key,
        algorithm="HS256",
    )

# ── Token verification ────────────────────────────────────────────────
def decode_token(token: str, expected_type: str = "access") -> TokenPayload:
    payload = jwt.decode(
        token,
        settings.jwt_secret_key,
        algorithms=["HS256"],       # ALWAYS pin — prevents alg:none attack
    )
    if payload.get("type") != expected_type:
        raise JWTError("Wrong token type")
    return TokenPayload(**payload)`,
          notes: [
            "bcrypt is ~100ms per hash — makes brute-force attacks impractical",
            "algorithms=['HS256'] must be pinned — accepting 'none' lets attackers forge tokens",
            "'type' claim prevents access tokens from being used as refresh tokens (and vice versa)",
            "Always use timezone.utc — naive datetimes cause subtle bugs with JWT expiry",
          ]
        },
        {
          title: "Auth Dependencies (JWT + API Key)",
          lang: "python",
          filename: "deps.py (auth section)",
          desc: "Auth dependencies added to deps.py — JWT for users, API keys for services.",
          code: `from typing import Annotated
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError

from auth import decode_token, TokenPayload

# ── JWT auth (for dashboard/browser users) ────────────────────────────
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

async def get_current_user(
    token: str = Depends(oauth2_scheme),
) -> TokenPayload:
    try:
        return decode_token(token, expected_type="access")
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def require_admin(
    user: TokenPayload = Depends(get_current_user),
) -> TokenPayload:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

# ── API key auth (for service-to-service calls) ───────────────────────
async def verify_api_key(request: Request) -> str:
    api_key = request.headers.get("X-API-Key")
    if not api_key:
        raise HTTPException(status_code=401, detail="X-API-Key header required")

    redis = request.app.state.redis
    cached = await redis.get(f"apikey:{api_key}")
    if cached:
        return cached   # returns owner/client_id

    # In production: fall back to DB lookup here
    raise HTTPException(status_code=401, detail="Invalid API key")

# ── Optional auth (public with optional personalization) ──────────────
optional_oauth2 = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)

async def get_optional_user(
    token: str | None = Depends(optional_oauth2),
) -> TokenPayload | None:
    if not token:
        return None
    try:
        return decode_token(token)
    except JWTError:
        return None

# ── Type aliases ──────────────────────────────────────────────────────
CurrentUser  = Annotated[TokenPayload, Depends(get_current_user)]
AdminUser    = Annotated[TokenPayload, Depends(require_admin)]
OptionalUser = Annotated[TokenPayload | None, Depends(get_optional_user)]
ApiKeyOwner  = Annotated[str, Depends(verify_api_key)]`,
          notes: [
            "OAuth2PasswordBearer: tokenUrl tells Swagger UI where to POST credentials",
            "API key auth: Redis cache first, then DB — instant revocation by deleting from Redis",
            "Optional auth: auto_error=False returns None instead of 401 when no token present",
            "Type aliases keep routes clean: def predict(owner: ApiKeyOwner, model: Model)",
          ]
        },
        {
          title: "Auth Router (Register/Login/Refresh)",
          lang: "python",
          filename: "routers/auth.py",
          desc: "Complete auth flow — register, login (OAuth2 form), and token refresh with rotation.",
          code: `from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select

from auth import (
    hash_password, verify_password,
    create_access_token, create_refresh_token, decode_token,
)
from deps import DB
from schemas import UserCreate, UserResponse, TokenResponse
from config import settings
# Assume: User SQLAlchemy model with id, email, hashed_password, role

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=UserResponse, status_code=201)
async def register(body: UserCreate, db: DB):
    existing = await db.execute(
        select(User).where(User.email == body.email)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        email=body.email,
        hashed_password=hash_password(body.password),
        role="user",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user

@router.post("/login", response_model=TokenResponse)
async def login(
    form: OAuth2PasswordRequestForm = Depends(),
    db: DB = None,
):
    result = await db.execute(
        select(User).where(User.email == form.username)
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    return TokenResponse(
        access_token=create_access_token(user.id, user.role),
        refresh_token=create_refresh_token(user.id),
        expires_in=settings.access_token_expire_minutes * 60,
    )

@router.post("/refresh", response_model=TokenResponse)
async def refresh(refresh_token: str, db: DB):
    from jose import JWTError
    try:
        payload = decode_token(refresh_token, expected_type="refresh")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user = await db.get(User, int(payload.sub))
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return TokenResponse(
        access_token=create_access_token(user.id, user.role),
        refresh_token=create_refresh_token(user.id),
        expires_in=settings.access_token_expire_minutes * 60,
    )`,
          notes: [
            "OAuth2PasswordRequestForm uses 'username' field — we map it to email",
            "Same error for wrong email AND wrong password — prevents email enumeration",
            "Refresh issues a NEW token pair — this is 'token rotation'",
            "Production: store refresh tokens in DB/Redis and check revocation before issuing new tokens",
          ]
        },
        {
          title: "Protected Predict Route (API Key + JWT)",
          lang: "python",
          filename: "routers/predict.py (after Lesson 7)",
          desc: "The predict router with both auth strategies — API key for services, JWT for users.",
          code: `import json
from fastapi import APIRouter, BackgroundTasks
from deps import (
    CurrentUser, OptionalUser, ApiKeyOwner,
    Model, Redis, DB,
)
from schemas import PredictRequest, PredictResponse

router = APIRouter(tags=["predictions"])

# ── API key protected (service-to-service) ────────────────────────────
@router.post("/predict", response_model=PredictResponse)
async def predict(
    body: PredictRequest,
    owner: ApiKeyOwner,          # requires X-API-Key header
    model: Model,
    redis: Redis,
    bg: BackgroundTasks,
):
    cache_key = f"predict:{owner}:{body.text[:80]}"
    cached = await redis.get(cache_key)
    if cached:
        data = json.loads(cached)
        data["cached"] = True
        return data

    result = model.predict(body.text)
    response = {"sentiment": result["label"], "score": result["score"], "cached": False}

    await redis.setex(cache_key, 3600, json.dumps(response))
    bg.add_task(log_prediction, owner=owner, text=body.text, result=response)
    return response

# ── JWT protected (dashboard users) ──────────────────────────────────
@router.get("/predictions/history")
async def prediction_history(user: CurrentUser, db: DB):
    return {"user_id": user.sub, "predictions": []}

# ── Public with optional personalization ──────────────────────────────
@router.get("/models")
async def list_models(user: OptionalUser):
    models = [{"name": "sentiment-v1", "version": "1.0"}]
    if user:
        models[0]["your_requests_today"] = 42
    return {"models": models}`,
          notes: [
            "/predict: API key auth — the standard for programmatic access (like OpenAI, Stripe)",
            "/predictions/history: JWT auth — for dashboard/browser users",
            "/models: optional auth — works anonymous, adds personalization when logged in",
            "Cache key includes owner — each client gets its own cache namespace",
          ]
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "testing",
      icon: "🧪",
      title: "Testing with Dependency Overrides",
      items: [
        {
          title: "Test Fixtures (conftest.py)",
          lang: "python",
          filename: "tests/conftest.py",
          desc: "Complete test setup — fake DB, fake model, fake Redis, and layered auth fixtures.",
          code: `import pytest
import fakeredis.aioredis
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import (
    create_async_engine, async_sessionmaker, AsyncSession,
)

from main import app
from deps import get_db, get_model, get_redis, get_current_user, verify_api_key
from auth import TokenPayload

# ═══════════════════════════════════════════════════════════════════════
# DATABASE — in-memory SQLite (fresh tables per test)
# ═══════════════════════════════════════════════════════════════════════
TEST_DB_URL = "sqlite+aiosqlite:///:memory:"
engine = create_async_engine(TEST_DB_URL)
TestSession = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

@pytest.fixture(autouse=True)
async def setup_db():
    from models import Base
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

async def override_get_db():
    async with TestSession() as session:
        yield session

# ═══════════════════════════════════════════════════════════════════════
# ML MODEL — deterministic fake (no GPU, no downloads)
# ═══════════════════════════════════════════════════════════════════════
class FakeModel:
    def predict(self, text: str) -> dict:
        label = "positive" if "good" in text.lower() else "negative"
        return {"label": label, "score": 0.95}

    def predict_batch(self, texts: list[str]) -> list[dict]:
        return [self.predict(t) for t in texts]

fake_model = FakeModel()

# ═══════════════════════════════════════════════════════════════════════
# REDIS — fakeredis (in-memory, no server needed)
# ═══════════════════════════════════════════════════════════════════════
@pytest.fixture
async def fake_redis():
    r = fakeredis.aioredis.FakeRedis()
    yield r
    await r.flushall()

# ═══════════════════════════════════════════════════════════════════════
# AUTH — pre-authenticated users
# ═══════════════════════════════════════════════════════════════════════
test_user = TokenPayload(sub="1", role="user", type="access")
test_admin = TokenPayload(sub="99", role="admin", type="access")

# ═══════════════════════════════════════════════════════════════════════
# HTTP CLIENTS — layered dependency overrides
# ═══════════════════════════════════════════════════════════════════════
@pytest.fixture
async def client(fake_redis):
    """Unauthenticated — no user, no API key."""
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_model] = lambda: fake_model
    app.dependency_overrides[get_redis] = lambda: fake_redis
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test",
    ) as ac:
        yield ac
    app.dependency_overrides.clear()

@pytest.fixture
async def auth_client(client):
    """Authenticated as regular user (JWT)."""
    app.dependency_overrides[get_current_user] = lambda: test_user
    yield client

@pytest.fixture
async def admin_client(client):
    """Authenticated as admin (JWT)."""
    app.dependency_overrides[get_current_user] = lambda: test_admin
    yield client

@pytest.fixture
async def api_key_client(client):
    """Authenticated with valid API key."""
    app.dependency_overrides[verify_api_key] = lambda: "test-client-id"
    yield client`,
          notes: [
            "autouse=True on setup_db: every test gets fresh tables — total isolation",
            "FakeModel: 'good' in text → positive, else → negative — deterministic assertions",
            "fakeredis: full Redis API in-memory — no server required, works in CI",
            "Four client fixtures: unauthenticated, user JWT, admin JWT, API key",
            "dependency_overrides.clear() on teardown prevents leaks between tests",
          ]
        },
        {
          title: "Prediction Tests",
          lang: "python",
          filename: "tests/test_predict.py",
          desc: "Tests for /predict — happy path, caching, auth enforcement, and validation.",
          code: `import json

# ── Happy path ────────────────────────────────────────────────────────
async def test_predict_positive(api_key_client):
    response = await api_key_client.post(
        "/predict", json={"text": "This is good"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["sentiment"] == "positive"
    assert data["score"] == 0.95

async def test_predict_negative(api_key_client):
    response = await api_key_client.post(
        "/predict", json={"text": "This is terrible"}
    )
    assert response.status_code == 200
    assert response.json()["sentiment"] == "negative"

# ── Caching ───────────────────────────────────────────────────────────
async def test_predict_cache_hit(api_key_client, fake_redis):
    r1 = await api_key_client.post("/predict", json={"text": "This is good"})
    assert r1.status_code == 200

    keys = await fake_redis.keys("predict:*")
    assert len(keys) == 1    # result was cached

    r2 = await api_key_client.post("/predict", json={"text": "This is good"})
    assert r2.json()["sentiment"] == r1.json()["sentiment"]

# ── Auth enforcement ──────────────────────────────────────────────────
async def test_predict_without_api_key_returns_401(client):
    response = await client.post("/predict", json={"text": "test"})
    assert response.status_code == 401

# ── Validation ────────────────────────────────────────────────────────
async def test_predict_empty_text_returns_422(api_key_client):
    response = await api_key_client.post("/predict", json={"text": ""})
    assert response.status_code == 422

async def test_predict_missing_text_returns_422(api_key_client):
    response = await api_key_client.post("/predict", json={})
    assert response.status_code == 422`,
          notes: [
            "FakeModel returns 'positive' for text with 'good' — tests are deterministic",
            "Cache test: verifies caching layer works without testing Redis internals",
            "Auth test: unauthenticated 'client' doesn't override verify_api_key → 401",
            "422 tests verify Pydantic validation surfaces correctly through FastAPI",
          ]
        },
        {
          title: "Auth Flow Tests",
          lang: "python",
          filename: "tests/test_auth.py",
          desc: "End-to-end auth tests — register, login, protected routes, and role enforcement.",
          code: `# ── Registration ──────────────────────────────────────────────────────
async def test_register_success(client):
    response = await client.post("/auth/register", json={
        "email": "alice@example.com",
        "password": "StrongPass123!",
    })
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "alice@example.com"
    assert "password" not in data
    assert "hashed_password" not in data

async def test_register_duplicate_email(client):
    await client.post("/auth/register", json={
        "email": "alice@example.com", "password": "StrongPass123!",
    })
    response = await client.post("/auth/register", json={
        "email": "alice@example.com", "password": "DifferentPass456!",
    })
    assert response.status_code == 409

# ── Login ─────────────────────────────────────────────────────────────
async def test_login_success(client):
    await client.post("/auth/register", json={
        "email": "bob@example.com", "password": "MySecret789!",
    })
    response = await client.post("/auth/login", data={
        "username": "bob@example.com",    # OAuth2 spec uses 'username'
        "password": "MySecret789!",
    })
    assert response.status_code == 200
    tokens = response.json()
    assert "access_token" in tokens
    assert "refresh_token" in tokens
    assert tokens["token_type"] == "bearer"

async def test_login_wrong_password(client):
    await client.post("/auth/register", json={
        "email": "eve@example.com", "password": "RealPassword1!",
    })
    response = await client.post("/auth/login", data={
        "username": "eve@example.com", "password": "WrongPassword!",
    })
    assert response.status_code == 401

# ── Protected routes ──────────────────────────────────────────────────
async def test_history_requires_auth(client):
    response = await client.get("/predictions/history")
    assert response.status_code == 401

async def test_history_with_auth(auth_client):
    response = await auth_client.get("/predictions/history")
    assert response.status_code == 200

async def test_admin_route_forbidden_for_user(auth_client):
    response = await auth_client.get("/admin/users")
    assert response.status_code == 403

async def test_admin_route_allowed_for_admin(admin_client):
    response = await admin_client.get("/admin/users")
    assert response.status_code == 200`,
          notes: [
            "Login uses data= (form data), not json= — OAuth2PasswordRequestForm expects form encoding",
            "Same 401 for wrong password AND nonexistent user — no email enumeration",
            "Never assert passwords appear in responses — these are security regression tests",
            "Full register → login flow: catches integration issues between routes",
          ]
        },
        {
          title: "Middleware Tests",
          lang: "python",
          filename: "tests/test_middleware.py",
          desc: "Tests for cross-cutting concerns — request IDs, timing, and security headers.",
          code: `# ── Request ID uniqueness ─────────────────────────────────────────────
async def test_request_id_header(api_key_client):
    r1 = await api_key_client.post("/predict", json={"text": "good"})
    r2 = await api_key_client.post("/predict", json={"text": "bad"})

    assert "X-Request-ID" in r1.headers
    assert "X-Request-ID" in r2.headers
    assert r1.headers["X-Request-ID"] != r2.headers["X-Request-ID"]

# ── Timing header ─────────────────────────────────────────────────────
async def test_timing_header(api_key_client):
    response = await api_key_client.post("/predict", json={"text": "good"})
    assert "X-Process-Time" in response.headers
    process_time = float(response.headers["X-Process-Time"])
    assert process_time < 5.0   # FakeModel is instant

# ── Security headers ─────────────────────────────────────────────────
async def test_security_headers(api_key_client):
    response = await api_key_client.post("/predict", json={"text": "good"})
    assert response.headers.get("X-Content-Type-Options") == "nosniff"
    assert response.headers.get("X-Frame-Options") == "DENY"

# ── Running the full suite ────────────────────────────────────────────
# pytest tests/ -v
# pytest tests/ --cov=. --cov-report=term-missing
# pytest tests/ -k "test_predict" -v   # run only predict tests
#
# pyproject.toml:
# [tool.pytest.ini_options]
# asyncio_mode = "auto"
# testpaths = ["tests"]`,
          notes: [
            "Request ID uniqueness catches the bug of reusing UUIDs across requests",
            "Security header tests prevent accidental removal during refactoring",
            "asyncio_mode='auto' means no @pytest.mark.asyncio needed on every test",
            "The full suite runs in <2 seconds — all in-process, no network, no real services",
          ]
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "async-patterns",
      icon: "⚡",
      title: "Async Patterns & Background Tasks",
      items: [
        {
          title: "Concurrent I/O with asyncio.gather",
          lang: "python",
          filename: "concurrent_io.py",
          desc: "Fetch multiple data sources concurrently — total time equals the slowest query, not the sum.",
          code: `import asyncio
from fastapi import APIRouter
from deps import DB, Redis, CurrentUser

router = APIRouter(tags=["dashboard"])

async def get_prediction_count(db, user_id: str) -> int:
    result = await db.execute(
        "SELECT COUNT(*) FROM predictions WHERE user_id = :uid",
        {"uid": user_id},
    )
    return result.scalar_one()

async def get_cached_predictions(redis, user_id: str) -> int:
    keys = await redis.keys(f"predict:{user_id}:*")
    return len(keys)

async def get_model_info(redis) -> dict:
    info = await redis.get("model:info")
    return {"name": "sentiment-v1", "loaded": info is not None}

@router.get("/dashboard")
async def user_dashboard(
    user: CurrentUser,
    db: DB,
    redis: Redis,
):
    # Fire all queries concurrently
    total, cached, model = await asyncio.gather(
        get_prediction_count(db, user.sub),
        get_cached_predictions(redis, user.sub),
        get_model_info(redis),
        return_exceptions=True,
    )

    return {
        "user_id": user.sub,
        "total_predictions": total if not isinstance(total, Exception) else 0,
        "cached_predictions": cached if not isinstance(cached, Exception) else 0,
        "model": model if not isinstance(model, Exception) else None,
    }

# Sequential: 3 queries × 50ms = 150ms
# Concurrent: max(50ms, 50ms, 50ms) = ~50ms`,
          notes: [
            "asyncio.gather runs all coroutines concurrently — 3x speedup for 3 independent queries",
            "return_exceptions=True: failures return as values instead of crashing the whole gather",
            "isinstance(result, Exception) handles partial failures gracefully",
            "This pattern works because all queries are I/O-bound (waiting on DB/Redis), not CPU-bound",
          ]
        },
        {
          title: "BackgroundTasks for Post-Response Work",
          lang: "python",
          filename: "background_tasks.py",
          desc: "Run work after the HTTP response is returned — logging, notifications, cache invalidation.",
          code: `from fastapi import APIRouter, BackgroundTasks
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

# ── Background task functions ─────────────────────────────────────────
async def log_prediction_to_db(
    user_id: str,
    text: str,
    sentiment: str,
    score: float,
):
    """Runs after response — doesn't add latency to the prediction."""
    try:
        # In production: insert into predictions table
        logger.info(
            "prediction_logged",
            extra={
                "user_id": user_id,
                "text_preview": text[:100],
                "sentiment": sentiment,
                "score": score,
            },
        )
    except Exception as e:
        # Background task failures are silent — must catch and log
        logger.error("prediction_log_failed", extra={"error": str(e)})

async def invalidate_user_cache(redis, user_id: str):
    """Clear cached predictions when user updates preferences."""
    try:
        keys = await redis.keys(f"predict:{user_id}:*")
        if keys:
            await redis.delete(*keys)
    except Exception as e:
        logger.warning("cache_invalidation_failed", extra={"error": str(e)})

# ── Usage in route ────────────────────────────────────────────────────
@router.post("/predict")
async def predict(
    body: PredictRequest,
    model: Model,
    bg: BackgroundTasks,
    owner: ApiKeyOwner,
):
    result = model.predict(body.text)

    # These run AFTER the response is returned to the client
    bg.add_task(log_prediction_to_db, owner, body.text, result["label"], result["score"])

    return {"sentiment": result["label"], "score": result["score"]}`,
          notes: [
            "BackgroundTasks run after response — client doesn't wait for logging/notifications",
            "Always wrap background tasks in try/except — failures are silent by default",
            "BackgroundTasks are NOT persistent — if the server crashes, tasks are lost",
            "For guaranteed delivery: use Celery + Redis or a proper job queue",
          ]
        },
        {
          title: "Streaming Responses (SSE)",
          lang: "python",
          filename: "streaming.py",
          desc: "Stream results to the client using Server-Sent Events — the pattern ChatGPT uses.",
          code: `from fastapi import FastAPI
from fastapi.responses import StreamingResponse
import asyncio
import json

app = FastAPI()

async def batch_stream(texts: list[str], model):
    """Generator that yields SSE-formatted results as each completes."""
    for i, text in enumerate(texts):
        # Process one at a time, streaming results
        result = model.predict(text)
        chunk = {
            "index": i,
            "text": text[:50],
            "sentiment": result["label"],
            "score": result["score"],
            "done": i == len(texts) - 1,
        }
        yield f"data: {json.dumps(chunk)}\\n\\n"
        await asyncio.sleep(0)   # yield to event loop

    yield f"data: {json.dumps({'done': True, 'total': len(texts)})}\\n\\n"

@app.post("/predict/stream")
async def stream_predictions(body: BatchPredictRequest, model: Model):
    return StreamingResponse(
        batch_stream(body.texts, model),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",   # disable nginx buffering
        },
    )

# Client-side usage:
# const source = new EventSource('/predict/stream')
# source.onmessage = (e) => {
#   const data = JSON.parse(e.data)
#   console.log(data.sentiment, data.score)
# }`,
          notes: [
            "SSE format: 'data: <payload>\\n\\n' — double newline is mandatory",
            "X-Accel-Buffering: no prevents Nginx from buffering the stream",
            "StreamingResponse accepts any async generator yielding bytes or strings",
            "Use for batch predictions where you want to show progress as each completes",
          ]
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "docker-production",
      icon: "🐳",
      title: "Dockerize & Production Deploy",
      items: [
        {
          title: "Multi-Stage Dockerfile",
          lang: "dockerfile",
          filename: "Dockerfile",
          desc: "Production build — builder stage compiles dependencies, production stage is slim and secure.",
          code: `# ═══════════════════════════════════════════════════════════════════════
# Stage 1: Build dependencies (discarded after build)
# ═══════════════════════════════════════════════════════════════════════
FROM python:3.12-slim AS builder

WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends \\
    gcc libffi-dev \\
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ═══════════════════════════════════════════════════════════════════════
# Stage 2: Production (no gcc, no pip cache, non-root)
# ═══════════════════════════════════════════════════════════════════════
FROM python:3.12-slim AS production

WORKDIR /app

COPY --from=builder /install /usr/local

RUN useradd --create-home --shell /bin/bash appuser

COPY main.py config.py deps.py auth.py model.py schemas.py \\
     middleware.py logging_config.py ./
COPY routers/ ./routers/

USER appuser

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \\
    CMD ["python", "-c", \\
         "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"]

EXPOSE 8000

CMD ["gunicorn", "main:app", \\
     "--worker-class", "uvicorn.workers.UvicornWorker", \\
     "--workers", "1", \\
     "--bind", "0.0.0.0:8000", \\
     "--timeout", "120", \\
     "--graceful-timeout", "30", \\
     "--max-requests", "1000", \\
     "--max-requests-jitter", "100", \\
     "--access-logfile", "-", \\
     "--error-logfile", "-"]`,
          notes: [
            "Multi-stage: production image has no gcc, no pip cache (~40% smaller)",
            "--prefix=/install: pip installs to a separate dir, COPY --from=builder copies it cleanly",
            "Non-root user (appuser) — never run containers as root, even inside K8s",
            "--workers=1 because K8s scales via pod replicas, not Gunicorn workers",
            "--max-requests=1000 recycles workers to prevent memory leaks from accumulating",
            "--start-period=40s gives the ML model time to load before health checks begin",
          ]
        },
        {
          title: "Docker Compose (Dev Environment)",
          lang: "yaml",
          filename: "docker-compose.yml",
          desc: "Local dev stack — API with hot reload, PostgreSQL, and Redis with health checks.",
          code: `services:
  api:
    build: .
    ports:
      - "8000:8000"
    env_file: .env
    environment:
      - DATABASE_URL=postgresql+asyncpg://postgres:postgres@db:5432/sentiment
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    # Dev override: hot reload instead of Gunicorn
    command: >
      uvicorn main:app
      --host 0.0.0.0
      --port 8000
      --reload
    volumes:
      - .:/app    # mount source for hot reload

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: sentiment
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  pgdata:`,
          notes: [
            "command overrides Gunicorn with uvicorn --reload for hot reload in dev",
            "volumes: .:/app mounts source — changes reflected without rebuilding",
            "depends_on with condition: service_healthy waits for DB/Redis readiness",
            "Production: remove command and volumes — use the Dockerfile CMD",
            "Database URL uses 'db' hostname (Docker DNS), not localhost",
          ]
        },
        {
          title: "Health Check Endpoints",
          lang: "python",
          filename: "routers/health.py",
          desc: "Liveness vs readiness probes — Kubernetes uses these to manage pod lifecycle.",
          code: `import time
from fastapi import APIRouter
from deps import DB, Redis

router = APIRouter(tags=["health"])
START_TIME = time.time()

@router.get("/health")
async def health():
    """
    Liveness probe — is the process alive?
    K8s: if this fails, RESTART the pod.
    Should NOT check DB/Redis (their outage != restart all pods).
    """
    return {
        "status": "healthy",
        "uptime": round(time.time() - START_TIME),
    }

@router.get("/health/ready")
async def readiness(db: DB, redis: Redis):
    """
    Readiness probe — can this pod serve traffic?
    K8s: if this fails, REMOVE from load balancer (don't restart).
    """
    checks = {}
    healthy = True

    try:
        await db.execute("SELECT 1")
        checks["database"] = "ok"
    except Exception as e:
        checks["database"] = str(e)
        healthy = False

    try:
        await redis.ping()
        checks["redis"] = "ok"
    except Exception as e:
        checks["redis"] = str(e)
        healthy = False

    return {
        "status": "ready" if healthy else "not_ready",
        "checks": checks,
    }`,
          notes: [
            "Liveness: lightweight, no external deps — restarting pods when DB is down makes things worse",
            "Readiness: checks DB + Redis — failing removes pod from Service endpoints (load balancer)",
            "K8s probes hit these every 10-30s — keep them fast (<100ms)",
            "startupProbe (in K8s manifest) gives the ML model time to load before probes begin",
          ]
        },
        {
          title: "Build & Deploy Commands",
          lang: "bash",
          filename: "terminal (macOS)",
          desc: "Build, test, and run the Sentiment API — from local dev to production image.",
          code: `# ── Build production image ────────────────────────────────────────────
docker build -t sentiment-api:latest .

# Check image size (should be ~300MB, not 1.5GB)
docker images sentiment-api

# ── Local development with compose ───────────────────────────────────
docker compose up -d
docker compose logs -f api

# Test the API
curl -X POST http://localhost:8000/predict \\
  -H "X-API-Key: your-test-key" \\
  -H "Content-Type: application/json" \\
  -d '{"text": "This product is amazing"}'

# Run tests inside the container
docker compose exec api pytest tests/ -v

# ── Production build ─────────────────────────────────────────────────
docker build -t sentiment-api:1.0.0 .
docker run -p 8000:8000 --env-file .env sentiment-api:1.0.0

# ── Push to registry ─────────────────────────────────────────────────
docker tag sentiment-api:1.0.0 ghcr.io/yourorg/sentiment-api:1.0.0
docker push ghcr.io/yourorg/sentiment-api:1.0.0

# ── Kubernetes (preview — Module 4 covers this in depth) ─────────────
kubectl apply -f k8s/deployment.yaml
kubectl get pods -w                  # watch pod status
kubectl logs -f deploy/sentiment-api # stream logs`,
          notes: [
            "Tag with version (1.0.0) for production — :latest is for development only",
            "python:3.12-slim base is ~120MB, ML deps add ~180MB = ~300MB total",
            "docker compose exec runs commands inside running containers",
            "Production: --env-file for secrets — never bake secrets into the image",
          ]
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "kubernetes-preview",
      icon: "☸️",
      title: "Kubernetes Manifests (Preview)",
      items: [
        {
          title: "Deployment + Service",
          lang: "yaml",
          filename: "k8s/deployment.yaml",
          desc: "K8s manifests for the Sentiment API — 3 replicas, secrets, resource limits, and probes.",
          code: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: sentiment-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: sentiment-api
  template:
    metadata:
      labels:
        app: sentiment-api
    spec:
      containers:
        - name: api
          image: sentiment-api:1.0.0
          ports:
            - containerPort: 8000
          env:
            - name: JWT_SECRET_KEY
              valueFrom:
                secretKeyRef:
                  name: api-secrets
                  key: jwt-secret
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: api-secrets
                  key: database-url
            - name: REDIS_URL
              value: "redis://redis-svc:6379/0"
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          startupProbe:
            httpGet:
              path: /health
              port: 8000
            failureThreshold: 30       # 30 x 10s = 5 min max startup
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /health
              port: 8000
            initialDelaySeconds: 5
            periodSeconds: 15
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 8000
            initialDelaySeconds: 5
            periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: sentiment-api
spec:
  selector:
    app: sentiment-api
  ports:
    - port: 80
      targetPort: 8000
  type: ClusterIP`,
          notes: [
            "Secrets from K8s Secrets (secretKeyRef), not plain env vars — never commit secrets to YAML",
            "startupProbe: gives ML model up to 5 min to load before liveness/readiness activate",
            "resources.requests: scheduler uses these for pod placement; limits: OOMKilled if exceeded",
            "3 replicas behind ClusterIP Service — internal load balancing across pods",
            "This is a preview — Module 4 covers Deployments, Services, Ingress, and HPA in depth",
          ]
        },
        {
          title: "Production Checklist",
          lang: "bash",
          filename: "production-checklist.sh",
          desc: "Everything you need for production — mapped to the lesson where each was implemented.",
          code: `# ═══════════════════════════════════════════════════════════════════════
# PRODUCTION READINESS CHECKLIST — Sentiment Analysis API
# ═══════════════════════════════════════════════════════════════════════

# SECURITY
# ✅ Non-root container user (appuser)          — Lesson 9: Dockerfile
# ✅ JWT with pinned algorithm + expiry         — Lesson 7: auth.py
# ✅ Secrets from env vars / K8s secrets        — Lesson 3: config.py
# ✅ CORS allowlist (not wildcard)              — Lesson 5: middleware
# ✅ Security headers (nosniff, DENY, HSTS)     — Lesson 5: middleware

# RELIABILITY
# ✅ Health checks (liveness + readiness)       — Lesson 9: health.py
# ✅ Graceful shutdown (lifespan)               — Lesson 6: main.py
# ✅ Worker recycling (--max-requests)          — Lesson 9: Dockerfile

# OBSERVABILITY
# ✅ Structured JSON logging                    — Lesson 5: logging_config.py
# ✅ Request ID tracing                         — Lesson 5: middleware
# ✅ Request timing headers                     — Lesson 5: middleware

# PERFORMANCE
# ✅ ML model loaded once at startup            — Lesson 6: lifespan
# ✅ Redis prediction caching                   — Lesson 6: predict.py
# ✅ Background tasks for logging               — Lesson 6: predict.py

# TESTING
# ✅ Dependency override test fixtures          — Lesson 8: conftest.py
# ✅ Auth enforcement tests                     — Lesson 8: test_auth.py
# ✅ >90% code coverage                         — Lesson 8: pytest-cov

# BUILD
# ✅ Multi-stage Docker build                   — Lesson 9: Dockerfile
# ✅ Layer caching (deps before code)           — Lesson 9: Dockerfile
# ✅ .dockerignore (exclude .venv, __pycache__) — Lesson 9`,
          notes: [
            "Every item maps to a specific lesson — nothing appears out of thin air",
            "This checklist connects the entire FastAPI module into a coherent production story",
            "Module 3 adds: PostgreSQL with connection pooling, Redis patterns, MongoDB",
            "Module 4 adds: full Kubernetes deployment, Ingress, HPA autoscaling",
            "Module 6 adds: CI/CD pipeline (GitHub Actions → Docker build → K8s deploy)",
          ]
        },
      ]
    },

  ]; // end m.codeExamples
})();
