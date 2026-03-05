// Patches the FastAPI module (m2) with comprehensive code examples.
// Loaded after curriculum.js and fastapi-lessons.js.
// All examples follow the IntelliAPI document intelligence platform built across 10 lessons.
(function patchFastAPIExamples() {
  const m = CURRICULUM.phases[0].modules[1]; // phase-1 (index 0), second module (m2)

  m.codeExamples = [

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "project-setup",
      icon: "🚀",
      title: "Installation & Setup",
      items: [
        {
          title: "macOS Setup (Apple Silicon)",
          lang: "bash",
          filename: "setup.sh",
          desc: "Full dev environment setup — pyenv, venv, and all dependencies for IntelliAPI.",
          code: `# ── Python via pyenv (native arm64 compilation) ──────────────────────
brew install pyenv
echo 'export PYENV_ROOT="\$HOME/.pyenv"' >> ~/.zshrc
echo 'export PATH="\$PYENV_ROOT/bin:\$PATH"' >> ~/.zshrc
echo 'eval "\$(pyenv init -)"' >> ~/.zshrc
source ~/.zshrc

pyenv install 3.12.4
pyenv global 3.12.4

# Verify architecture
python -c "import platform; print(platform.machine())"  # arm64

# ── Project setup ─────────────────────────────────────────────────────
mkdir intelliapi && cd intelliapi
python -m venv .venv
source .venv/bin/activate

# ── Dependencies (all we need across 10 lessons) ─────────────────────
pip install fastapi[standard]         # uvicorn, httpx, python-multipart
pip install pydantic-settings         # env-based config
pip install sqlalchemy[asyncio]       # async ORM
pip install asyncpg                   # PostgreSQL async driver
pip install redis[hiredis]            # Redis client (async + C parser)
pip install python-jose[cryptography] # JWT encoding/decoding
pip install "passlib[bcrypt]"         # password hashing
pip install structlog                 # structured logging
pip install gunicorn                  # production process manager
pip install httpx                     # async HTTP client
pip install pytest-asyncio pytest-httpx # testing

pip freeze > requirements.txt`,
          notes: [
            "pyenv compiles Python natively for arm64 — no Rosetta overhead",
            "fastapi[standard] bundles uvicorn, httpx, and python-multipart",
            "redis[hiredis] adds the C parser — 10x faster RESP deserialization",
            "passlib[bcrypt] needs quotes in zsh (brackets are glob characters)",
          ]
        },
        {
          title: "Minimal IntelliAPI App",
          lang: "python",
          filename: "main.py",
          desc: "The starting point — a FastAPI app with one endpoint that will grow into the full document intelligence platform.",
          code: `from fastapi import FastAPI

app = FastAPI(
    title="IntelliAPI",
    description="Document classification & summarization platform",
    version="1.0.0",
    docs_url="/docs",        # Swagger UI — set to None in production
    redoc_url="/redoc",
)

@app.get("/")
async def root():
    return {"service": "intelliapi", "version": "1.0.0"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.post("/documents/classify")
async def classify_document(text: str):
    """Stub endpoint — replaced with real ML in later lessons."""
    return {
        "category": "technical",
        "confidence": 0.92,
        "text_length": len(text),
    }

# Run: uvicorn main:app --reload --port 8000`,
          notes: [
            "FastAPI is ASGI-native — requires an async server like Uvicorn",
            "--reload watches for file changes (dev only, never in production)",
            "Visit http://localhost:8000/docs for interactive Swagger UI",
            "This is the same app we build upon across all 10 lessons",
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
    app_name: str = "IntelliAPI"
    env: Literal["development", "staging", "production"] = "development"
    debug: bool = False

    # Database
    database_url: str = "postgresql+asyncpg://intelliapi:secret@localhost:5432/intelliapi"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Auth
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 30

    # ML model
    model_name: str = "document-classifier-v2"
    max_document_length: int = 50_000
    inference_timeout: float = 10.0

    # Rate limiting
    rate_limit_per_minute: int = 60

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": False,
    }

# Singleton — imported everywhere
settings = Settings()`,
          notes: [
            "Pydantic Settings reads from environment variables automatically",
            "Literal type restricts env to known deployment targets",
            "model_config replaces the old inner class Config (Pydantic V2)",
            "Validation runs at import time — bad DATABASE_URL crashes immediately, not mid-request",
          ]
        },
        {
          title: "Project Structure",
          lang: "bash",
          filename: "tree.txt",
          desc: "Recommended layout for the IntelliAPI project — feature-based with clear separation.",
          code: `intelliapi/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI app + lifespan
│   ├── config.py             # Pydantic Settings
│   ├── dependencies.py       # Shared Depends() factories
│   ├── models/
│   │   ├── __init__.py
│   │   ├── document.py       # SQLAlchemy ORM models
│   │   └── user.py
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── document.py       # Pydantic request/response schemas
│   │   └── auth.py
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── documents.py      # /documents endpoints
│   │   ├── auth.py           # /auth endpoints
│   │   └── admin.py          # /admin endpoints
│   ├── services/
│   │   ├── __init__.py
│   │   ├── classifier.py     # ML inference logic
│   │   └── summarizer.py
│   ├── middleware/
│   │   ├── __init__.py
│   │   ├── request_id.py
│   │   └── logging.py
│   └── utils/
│       ├── __init__.py
│       └── security.py       # JWT + hashing helpers
├── tests/
│   ├── conftest.py           # Shared fixtures
│   ├── test_documents.py
│   └── test_auth.py
├── Dockerfile
├── docker-compose.yml
├── gunicorn.conf.py
├── .env
└── requirements.txt`,
          notes: [
            "schemas/ holds Pydantic models, models/ holds SQLAlchemy ORM — keep them separate",
            "services/ contains business logic — routers stay thin, just HTTP glue",
            "Each router is included via app.include_router() in main.py",
            "tests/ mirrors app/ structure for easy navigation",
          ]
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "async-patterns",
      icon: "⚡",
      title: "Async Patterns",
      items: [
        {
          title: "Concurrent I/O with asyncio.gather",
          lang: "python",
          filename: "routers/documents.py",
          desc: "Fan out to multiple async services in parallel — classify and summarize a document simultaneously.",
          code: `import asyncio
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/documents", tags=["documents"])

async def call_classifier(text: str) -> dict:
    """Simulate calling an ML classifier service."""
    await asyncio.sleep(0.3)  # network latency
    return {"category": "technical", "confidence": 0.94}

async def call_summarizer(text: str) -> dict:
    """Simulate calling a summarization service."""
    await asyncio.sleep(0.5)  # network latency
    words = text.split()
    return {"summary": " ".join(words[:20]) + "...", "ratio": 0.1}

async def fetch_metadata(doc_id: str) -> dict:
    """Simulate fetching document metadata from a database."""
    await asyncio.sleep(0.1)
    return {"doc_id": doc_id, "source": "upload", "pages": 12}

@router.post("/analyze")
async def analyze_document(text: str, doc_id: str = "doc-001"):
    """
    Fan-out pattern: run classification, summarization, and metadata
    fetch concurrently. Total latency = max(individual latencies),
    not the sum.
    """
    # All three run concurrently — total time ~0.5s, not 0.9s
    classification, summary, metadata = await asyncio.gather(
        call_classifier(text),
        call_summarizer(text),
        fetch_metadata(doc_id),
    )

    return {
        "doc_id": doc_id,
        "classification": classification,
        "summary": summary,
        "metadata": metadata,
    }`,
          notes: [
            "asyncio.gather runs all coroutines concurrently on the event loop",
            "Total latency = max(0.3, 0.5, 0.1) = 0.5s instead of sequential 0.9s",
            "If any coroutine raises, gather cancels the rest by default",
            "Use return_exceptions=True if you want partial results instead of failing fast",
          ]
        },
        {
          title: "run_in_executor for CPU-bound Inference",
          lang: "python",
          filename: "services/classifier.py",
          desc: "Offload CPU-heavy ML inference to a thread pool so the event loop stays responsive.",
          code: `import asyncio
from concurrent.futures import ThreadPoolExecutor
from functools import lru_cache

# Dedicated pool for ML inference — separate from default executor
_inference_pool = ThreadPoolExecutor(
    max_workers=4,
    thread_name_prefix="ml-inference",
)

class DocumentClassifier:
    """Wraps a CPU-bound ML model for async usage."""

    def __init__(self, model_name: str):
        self.model_name = model_name
        self._model = None

    def load_model(self):
        """Load model weights — called once at startup."""
        # In production: self._model = torch.load(...)
        import time
        time.sleep(1)  # simulate heavy model loading
        self._model = {"name": self.model_name, "loaded": True}
        return self

    def _predict_sync(self, text: str) -> dict:
        """
        CPU-bound prediction — MUST NOT be called directly
        from an async context (blocks the event loop).
        """
        import time
        time.sleep(0.2)  # simulate model inference
        categories = ["technical", "legal", "financial", "medical"]
        import hashlib
        idx = int(hashlib.md5(text.encode()).hexdigest(), 16) % len(categories)
        return {
            "category": categories[idx],
            "confidence": 0.87 + (idx * 0.03),
            "model": self.model_name,
        }

    async def predict(self, text: str) -> dict:
        """
        Async wrapper — runs CPU-bound inference in a thread pool
        so the event loop continues serving other requests.
        """
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(
            _inference_pool,
            self._predict_sync,
            text,
        )

@lru_cache(maxsize=1)
def get_classifier() -> DocumentClassifier:
    return DocumentClassifier("doc-classifier-v2").load_model()`,
          notes: [
            "run_in_executor releases the event loop while the thread does CPU work",
            "Dedicated ThreadPoolExecutor prevents ML from starving the default pool",
            "max_workers=4 matches typical CPU cores — tune to your hardware",
            "lru_cache(maxsize=1) ensures the model is loaded exactly once",
          ]
        },
        {
          title: "TaskGroup with Error Handling",
          lang: "python",
          filename: "services/batch_processor.py",
          desc: "Python 3.11+ TaskGroup for structured concurrency — errors propagate cleanly with ExceptionGroup.",
          code: `import asyncio
from dataclasses import dataclass

@dataclass
class ProcessingResult:
    doc_id: str
    success: bool
    result: dict | None = None
    error: str | None = None

async def process_single_document(doc_id: str, text: str) -> ProcessingResult:
    """Process one document — may fail."""
    await asyncio.sleep(0.1)  # simulate I/O

    if len(text) < 10:
        raise ValueError(f"Document {doc_id} too short: {len(text)} chars")

    return ProcessingResult(
        doc_id=doc_id,
        success=True,
        result={"category": "technical", "words": len(text.split())},
    )

async def batch_process_documents(
    documents: list[dict],
) -> list[ProcessingResult]:
    """
    Process a batch of documents concurrently using TaskGroup.
    Collects individual errors without cancelling the entire batch.
    """
    results: list[ProcessingResult] = []

    async def safe_process(doc: dict):
        """Wrapper that catches per-document errors."""
        try:
            result = await process_single_document(
                doc["id"], doc["text"]
            )
            results.append(result)
        except Exception as e:
            results.append(ProcessingResult(
                doc_id=doc["id"],
                success=False,
                error=str(e),
            ))

    async with asyncio.TaskGroup() as tg:
        for doc in documents:
            tg.create_task(safe_process(doc))

    return results

# Usage in a route:
# @router.post("/documents/batch")
# async def batch_classify(docs: list[DocumentInput]):
#     results = await batch_process_documents(
#         [{"id": d.id, "text": d.text} for d in docs]
#     )
#     return {"results": results, "total": len(results)}`,
          notes: [
            "TaskGroup (Python 3.11+) enforces structured concurrency — all tasks finish before exiting the block",
            "The safe_process wrapper catches per-document errors so one failure does not cancel siblings",
            "Without the wrapper, TaskGroup raises ExceptionGroup and cancels all running tasks",
            "Prefer TaskGroup over gather for new code — it handles cancellation and error scoping correctly",
          ]
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "pydantic-models",
      icon: "✅",
      title: "Pydantic Models",
      items: [
        {
          title: "Request/Response Schemas with Validators",
          lang: "python",
          filename: "schemas/document.py",
          desc: "Pydantic V2 schemas with field validators, computed fields, and model serialization config.",
          code: `from pydantic import BaseModel, Field, field_validator, computed_field
from datetime import datetime
from enum import Enum

class DocumentCategory(str, Enum):
    TECHNICAL = "technical"
    LEGAL = "legal"
    FINANCIAL = "financial"
    MEDICAL = "medical"
    GENERAL = "general"

class ClassifyRequest(BaseModel):
    """Input schema for document classification."""
    text: str = Field(
        ...,
        min_length=10,
        max_length=50_000,
        description="Document text to classify",
        examples=["This technical report covers the architecture of..."],
    )
    language: str = Field(
        default="en",
        pattern=r"^[a-z]{2}$",
        description="ISO 639-1 language code",
    )
    priority: int = Field(default=0, ge=0, le=10)

    @field_validator("text")
    @classmethod
    def clean_whitespace(cls, v: str) -> str:
        """Normalize whitespace — models are sensitive to formatting."""
        return " ".join(v.split())

    @computed_field
    @property
    def word_count(self) -> int:
        return len(self.text.split())

class ClassifyResponse(BaseModel):
    """Output schema for document classification."""
    doc_id: str = Field(..., examples=["doc-abc123"])
    category: DocumentCategory
    confidence: float = Field(..., ge=0.0, le=1.0)
    processing_time_ms: float
    classified_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "doc_id": "doc-abc123",
                    "category": "technical",
                    "confidence": 0.94,
                    "processing_time_ms": 42.5,
                    "classified_at": "2025-01-15T10:30:00Z",
                }
            ]
        }
    }

class BatchClassifyResponse(BaseModel):
    """Response for batch classification."""
    results: list[ClassifyResponse]
    total: int
    successful: int
    failed: int

    @computed_field
    @property
    def success_rate(self) -> float:
        return self.successful / self.total if self.total > 0 else 0.0`,
          notes: [
            "@field_validator runs before the value is assigned — perfect for normalization",
            "@computed_field appears in JSON output but is derived, not stored",
            "model_config replaces the old inner Config class in Pydantic V2",
            "Field(examples=[...]) populates the OpenAPI schema — Swagger UI shows them",
          ]
        },
        {
          title: "Discriminated Union for Multi-Format Input",
          lang: "python",
          filename: "schemas/ingest.py",
          desc: "Accept multiple document formats through a single endpoint using tagged unions.",
          code: `from pydantic import BaseModel, Field
from typing import Annotated, Literal, Union
from datetime import datetime

class TextDocument(BaseModel):
    """Plain text input."""
    format: Literal["text"] = "text"
    content: str = Field(..., min_length=1, max_length=100_000)
    encoding: str = "utf-8"

class URLDocument(BaseModel):
    """URL to fetch and process."""
    format: Literal["url"] = "url"
    url: str = Field(
        ...,
        pattern=r"^https?://",
        examples=["https://example.com/report.pdf"],
    )
    follow_redirects: bool = True
    timeout: float = Field(default=30.0, gt=0, le=120)

class Base64Document(BaseModel):
    """Base64-encoded binary (PDF, DOCX, etc.)."""
    format: Literal["base64"] = "base64"
    data: str = Field(..., min_length=4)
    mime_type: str = Field(
        ...,
        pattern=r"^(application|text)/",
        examples=["application/pdf", "text/plain"],
    )
    filename: str | None = None

# Discriminated union — Pydantic checks the "format" field to pick the type
DocumentInput = Annotated[
    Union[TextDocument, URLDocument, Base64Document],
    Field(discriminator="format"),
]

class IngestRequest(BaseModel):
    """Ingest endpoint accepts any document format."""
    document: DocumentInput
    tags: list[str] = Field(default_factory=list, max_length=10)
    callback_url: str | None = Field(
        default=None,
        pattern=r"^https?://",
        description="Webhook URL for async processing notification",
    )

# Usage in a router:
# @router.post("/documents/ingest")
# async def ingest(request: IngestRequest):
#     match request.document:
#         case TextDocument():
#             text = request.document.content
#         case URLDocument():
#             text = await fetch_url(request.document.url)
#         case Base64Document():
#             text = decode_b64(request.document.data)
#     return {"status": "accepted", "format": request.document.format}`,
          notes: [
            "discriminator='format' tells Pydantic to check the format field first — O(1) dispatch, not trial-and-error",
            "Each variant has format as a Literal type — Pydantic uses it as the tag",
            "Python 3.10+ structural pattern matching works cleanly with discriminated unions",
            "OpenAPI schema shows all three variants — clients get full type information",
          ]
        },
        {
          title: "Reusable Annotated Types",
          lang: "python",
          filename: "schemas/types.py",
          desc: "Define validation constraints once with Annotated and reuse across all schemas.",
          code: `from typing import Annotated
from pydantic import Field, AfterValidator, BeforeValidator
from datetime import datetime
import re

# ── String types ──────────────────────────────────────────────────────
def _strip_whitespace(v: str) -> str:
    return v.strip()

def _validate_slug(v: str) -> str:
    if not re.match(r"^[a-z0-9-]+$", v):
        raise ValueError("Slug must contain only lowercase letters, digits, and hyphens")
    return v

CleanStr = Annotated[str, BeforeValidator(_strip_whitespace)]
Slug = Annotated[str, AfterValidator(_validate_slug), Field(min_length=1, max_length=64)]
DocText = Annotated[str, Field(min_length=10, max_length=50_000, description="Document text")]

# ── Numeric types ─────────────────────────────────────────────────────
Confidence = Annotated[float, Field(ge=0.0, le=1.0, description="Model confidence score")]
PageNumber = Annotated[int, Field(ge=1, le=10_000)]
Priority = Annotated[int, Field(ge=0, le=10, description="Processing priority (0=low, 10=critical)")]

# ── ID types ──────────────────────────────────────────────────────────
DocId = Annotated[str, Field(pattern=r"^doc-[a-z0-9]{6,12}$", examples=["doc-abc123"])]
UserId = Annotated[str, Field(pattern=r"^usr-[a-z0-9]{6,12}$", examples=["usr-xyz789"])]

# ── Pagination ────────────────────────────────────────────────────────
PageSize = Annotated[int, Field(default=20, ge=1, le=100)]
Offset = Annotated[int, Field(default=0, ge=0)]

# ── Usage in schemas ──────────────────────────────────────────────────
from pydantic import BaseModel

class ClassifyRequest(BaseModel):
    text: DocText                    # reuse: min_length, max_length, description
    priority: Priority = 0

class ClassifyResult(BaseModel):
    doc_id: DocId
    category: str
    confidence: Confidence           # reuse: ge=0, le=1
    page_count: PageNumber | None = None

class ListDocumentsParams(BaseModel):
    limit: PageSize
    offset: Offset
    tag: Slug | None = None`,
          notes: [
            "Annotated types compose Field constraints with custom validators",
            "BeforeValidator runs before Pydantic's own validation — good for normalization",
            "AfterValidator runs after — the value is already the correct type",
            "Define these once in a types module and import everywhere — DRY validation",
          ]
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "dependency-injection",
      icon: "🔌",
      title: "Dependency Injection",
      items: [
        {
          title: "Lifespan with ML Model + DB Pool + Redis",
          lang: "python",
          filename: "main.py",
          desc: "Application lifespan manages startup/shutdown of all shared resources — ML model, database pool, and Redis connection.",
          code: `from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
import redis.asyncio as aioredis
from app.config import settings
from app.services.classifier import DocumentClassifier

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Runs once at startup (before yield) and once at shutdown (after yield).
    All resources attached to app.state are available in every request.
    """
    # ── Startup ───────────────────────────────────────────────────────
    # 1. Database connection pool
    engine = create_async_engine(
        settings.database_url,
        pool_size=20,
        max_overflow=10,
        pool_pre_ping=True,
    )
    app.state.db_session_factory = async_sessionmaker(
        engine, expire_on_commit=False
    )

    # 2. Redis connection pool
    app.state.redis = aioredis.from_url(
        settings.redis_url,
        decode_responses=True,
        max_connections=50,
    )

    # 3. ML model (CPU-heavy load — do once, not per-request)
    classifier = DocumentClassifier(settings.model_name)
    await classifier.async_load()
    app.state.classifier = classifier

    yield  # ← app is running, serving requests

    # ── Shutdown ──────────────────────────────────────────────────────
    await app.state.redis.aclose()
    await engine.dispose()

app = FastAPI(
    title="IntelliAPI",
    lifespan=lifespan,
)

# Resources are available via request.app.state in any endpoint
@app.get("/health")
async def health(request: Request):
    redis_ok = await request.app.state.redis.ping()
    return {"status": "healthy", "redis": redis_ok}`,
          notes: [
            "lifespan replaces the deprecated @app.on_event('startup') / @app.on_event('shutdown')",
            "Everything before yield runs once at startup; everything after runs at shutdown",
            "app.state is the idiomatic place to store shared resources — not global variables",
            "pool_pre_ping=True detects stale connections before handing them to a request",
          ]
        },
        {
          title: "Yield Dependency for DB Session",
          lang: "python",
          filename: "dependencies.py",
          desc: "Yield dependency ensures each request gets its own session with automatic cleanup, commit, or rollback.",
          code: `from typing import Annotated, AsyncGenerator
from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
import redis.asyncio as aioredis

async def get_db(request: Request) -> AsyncGenerator[AsyncSession, None]:
    """
    Yield dependency — FastAPI calls __anext__ to get the session,
    then __anext__ again after the response to run cleanup.
    """
    session_factory = request.app.state.db_session_factory
    async with session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise

# Type alias — use in endpoint signatures
DB = Annotated[AsyncSession, Depends(get_db)]

async def get_redis(request: Request) -> aioredis.Redis:
    """Non-yield dependency — Redis pool manages its own lifecycle."""
    return request.app.state.redis

Redis = Annotated[aioredis.Redis, Depends(get_redis)]

async def get_classifier(request: Request):
    """Return the pre-loaded ML classifier from app state."""
    return request.app.state.classifier

Classifier = Annotated[object, Depends(get_classifier)]

# ── Usage in routes ───────────────────────────────────────────────────
from fastapi import APIRouter

router = APIRouter(prefix="/documents", tags=["documents"])

@router.get("/{doc_id}")
async def get_document(doc_id: str, db: DB, cache: Redis):
    """
    Both DB and Redis are injected — FastAPI resolves the
    dependency graph automatically.
    """
    # Check cache first
    cached = await cache.get(f"doc:{doc_id}")
    if cached:
        import json
        return json.loads(cached)

    # Fall back to database
    result = await db.execute(
        "SELECT * FROM documents WHERE id = :id",
        {"id": doc_id},
    )
    doc = result.fetchone()
    if not doc:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Document not found")
    return dict(doc._mapping)`,
          notes: [
            "Yield dependencies act like context managers — cleanup runs even if the endpoint raises",
            "commit-on-success, rollback-on-error is the standard pattern for write endpoints",
            "Annotated[X, Depends(fn)] creates reusable type aliases — endpoints stay clean",
            "FastAPI resolves the full dependency tree: get_db and get_redis run before the endpoint",
          ]
        },
        {
          title: "Class-Based Dependency (RequireRole)",
          lang: "python",
          filename: "dependencies.py",
          desc: "Callable class dependency for role-based access — parameterized at route registration time.",
          code: `from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from typing import Annotated
from app.config import settings

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")

class RequireRole:
    """
    Class-based dependency — instantiated with allowed roles,
    called per-request to enforce access control.
    """

    def __init__(self, *allowed_roles: str):
        self.allowed_roles = set(allowed_roles)

    async def __call__(
        self,
        token: Annotated[str, Depends(oauth2_scheme)],
    ) -> dict:
        """Validate JWT and check role membership."""
        try:
            payload = jwt.decode(
                token,
                settings.jwt_secret,
                algorithms=[settings.jwt_algorithm],
            )
        except JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
                headers={"WWW-Authenticate": "Bearer"},
            )

        user_role = payload.get("role", "viewer")
        if user_role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{user_role}' not in {self.allowed_roles}",
            )

        return {
            "user_id": payload["sub"],
            "role": user_role,
            "scopes": payload.get("scopes", []),
        }

# Pre-built instances for common roles
require_admin = RequireRole("admin")
require_editor = RequireRole("admin", "editor")
require_viewer = RequireRole("admin", "editor", "viewer")

# ── Usage in routes ───────────────────────────────────────────────────
from fastapi import APIRouter

router = APIRouter(prefix="/admin", tags=["admin"])

@router.delete("/documents/{doc_id}")
async def delete_document(
    doc_id: str,
    user: Annotated[dict, Depends(require_admin)],
):
    """Only admins can delete documents."""
    return {"deleted": doc_id, "by": user["user_id"]}

@router.put("/documents/{doc_id}")
async def update_document(
    doc_id: str,
    user: Annotated[dict, Depends(require_editor)],
):
    """Admins and editors can update."""
    return {"updated": doc_id, "by": user["user_id"]}`,
          notes: [
            "__init__ captures config (roles), __call__ runs per-request — clean separation",
            "RequireRole chains with oauth2_scheme — FastAPI resolves the full dependency tree",
            "Pre-built instances (require_admin, require_editor) avoid repeated setup in routes",
            "The Depends(require_admin) call invokes __call__, which itself depends on oauth2_scheme",
          ]
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "auth-security",
      icon: "🔐",
      title: "Auth & Security",
      items: [
        {
          title: "JWT Token Creation and Validation",
          lang: "python",
          filename: "utils/security.py",
          desc: "JWT helper functions for creating and validating access tokens with expiry and scopes.",
          code: `from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_access_token(
    user_id: str,
    role: str = "viewer",
    scopes: list[str] | None = None,
    expires_delta: timedelta | None = None,
) -> str:
    """Create a signed JWT with user claims."""
    now = datetime.now(timezone.utc)
    expire = now + (expires_delta or timedelta(minutes=settings.jwt_expire_minutes))

    payload = {
        "sub": user_id,
        "role": role,
        "scopes": scopes or [],
        "iat": now,
        "exp": expire,
        "iss": "intelliapi",
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)

def decode_access_token(token: str) -> dict:
    """
    Decode and validate a JWT. Raises JWTError on invalid/expired tokens.
    """
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
            options={"require_exp": True, "require_sub": True},
        )
        return payload
    except JWTError as e:
        raise JWTError(f"Token validation failed: {e}")

# ── Example usage ─────────────────────────────────────────────────────
# token = create_access_token("usr-abc123", role="editor", scopes=["documents:write"])
# payload = decode_access_token(token)
# payload == {"sub": "usr-abc123", "role": "editor", "scopes": ["documents:write"], ...}`,
          notes: [
            "bcrypt is the gold standard for password hashing — passlib handles salt and rounds",
            "Always use timezone.utc — naive datetimes cause subtle timezone bugs",
            "require_exp and require_sub ensure malformed tokens fail validation immediately",
            "iss (issuer) claim identifies which service created the token — useful in microservices",
          ]
        },
        {
          title: "OAuth2 Password Flow Endpoint",
          lang: "python",
          filename: "routers/auth.py",
          desc: "Complete login endpoint with OAuth2 password flow — Swagger UI shows the login form automatically.",
          code: `from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from typing import Annotated
from pydantic import BaseModel
from app.utils.security import verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])

# ── Fake user database (replace with real DB in production) ──────────
FAKE_USERS_DB = {
    "alice@intelliapi.com": {
        "user_id": "usr-alice01",
        "email": "alice@intelliapi.com",
        "hashed_password": "$2b$12$LJ3mBZ8Nq2MXvTqvKEX6NeUvoJKQF/Cml5c8U9Y.7kGHwE3xzYH.C",
        "role": "admin",
        "scopes": ["documents:read", "documents:write", "admin:manage"],
    },
    "bob@intelliapi.com": {
        "user_id": "usr-bob002",
        "email": "bob@intelliapi.com",
        "hashed_password": "$2b$12$wRSf8hj0rB9q1F4e2L3YzuyZkVW8nPfxBdR6mQnI4lZ/bLv8R5G7e",
        "role": "viewer",
        "scopes": ["documents:read"],
    },
}

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    role: str

@router.post("/token", response_model=TokenResponse)
async def login(form: Annotated[OAuth2PasswordRequestForm, Depends()]):
    """
    OAuth2 password flow — Swagger UI renders a login form for this.
    The 'username' field accepts email addresses.
    """
    user = FAKE_USERS_DB.get(form.username)
    if not user or not verify_password(form.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(
        user_id=user["user_id"],
        role=user["role"],
        scopes=user["scopes"],
    )

    return TokenResponse(
        access_token=token,
        expires_in=1800,
        role=user["role"],
    )`,
          notes: [
            "OAuth2PasswordRequestForm expects form-data with 'username' and 'password' fields",
            "Setting tokenUrl='/auth/token' on OAuth2PasswordBearer links Swagger UI to this endpoint",
            "WWW-Authenticate: Bearer header is required by the OAuth2 spec for 401 responses",
            "Never reveal whether the email or password was wrong — always say 'invalid email or password'",
          ]
        },
        {
          title: "API Key Authentication",
          lang: "python",
          filename: "dependencies.py",
          desc: "API key auth via header — simpler than JWT for service-to-service calls.",
          code: `from fastapi import Security, HTTPException, status
from fastapi.security import APIKeyHeader
from typing import Annotated

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

# In production, these come from a database or secrets manager
VALID_API_KEYS = {
    "sk-live-abc123def456": {
        "client": "data-pipeline",
        "scopes": ["documents:write", "documents:read"],
        "rate_limit": 1000,
    },
    "sk-live-xyz789ghi012": {
        "client": "mobile-app",
        "scopes": ["documents:read"],
        "rate_limit": 100,
    },
}

async def require_api_key(
    api_key: Annotated[str | None, Security(api_key_header)],
) -> dict:
    """
    Validate API key from X-API-Key header.
    Returns client metadata for downstream use.
    """
    if api_key is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing X-API-Key header",
        )

    client = VALID_API_KEYS.get(api_key)
    if client is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid API key",
        )

    return client

APIClient = Annotated[dict, Security(require_api_key)]

# ── Usage ─────────────────────────────────────────────────────────────
from fastapi import APIRouter

router = APIRouter(prefix="/api/v1", tags=["api"])

@router.post("/documents/classify")
async def classify_via_api_key(text: str, client: APIClient):
    """Service-to-service endpoint authenticated via API key."""
    if "documents:write" not in client["scopes"]:
        raise HTTPException(status_code=403, detail="Insufficient scope")
    return {
        "category": "technical",
        "client": client["client"],
    }`,
          notes: [
            "APIKeyHeader with auto_error=False lets us return a custom error instead of FastAPI's default",
            "Security() is like Depends() but also marks the parameter in OpenAPI's securitySchemes",
            "API keys are best for server-to-server; JWTs are better for user-facing auth",
            "Prefix keys with 'sk-live-' or 'sk-test-' so developers can tell them apart at a glance",
          ]
        },
        {
          title: "RBAC with Scopes",
          lang: "python",
          filename: "dependencies.py",
          desc: "Fine-grained scope checking — verify the token includes the required permissions.",
          code: `from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, SecurityScopes
from typing import Annotated
from app.utils.security import decode_access_token
from jose import JWTError

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/auth/token",
    scopes={
        "documents:read": "Read documents and classifications",
        "documents:write": "Create and update documents",
        "admin:manage": "Manage users, API keys, and system settings",
    },
)

async def get_current_user(
    security_scopes: SecurityScopes,
    token: Annotated[str, Depends(oauth2_scheme)],
) -> dict:
    """
    Validate JWT and check that all required scopes are present.
    SecurityScopes is populated from Security(... scopes=[...]).
    """
    try:
        payload = decode_access_token(token)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    token_scopes = set(payload.get("scopes", []))
    required_scopes = set(security_scopes.scopes)

    if not required_scopes.issubset(token_scopes):
        missing = required_scopes - token_scopes
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Missing required scopes: {missing}",
        )

    return {
        "user_id": payload["sub"],
        "role": payload["role"],
        "scopes": list(token_scopes),
    }

# ── Usage with per-route scopes ──────────────────────────────────────
from fastapi import APIRouter, Security

router = APIRouter(prefix="/documents", tags=["documents"])

@router.get("/{doc_id}")
async def read_document(
    doc_id: str,
    user: Annotated[dict, Security(get_current_user, scopes=["documents:read"])],
):
    return {"doc_id": doc_id, "reader": user["user_id"]}

@router.post("/")
async def create_document(
    user: Annotated[dict, Security(get_current_user, scopes=["documents:write"])],
):
    return {"created": True, "by": user["user_id"]}

@router.delete("/{doc_id}")
async def delete_document(
    doc_id: str,
    user: Annotated[dict, Security(get_current_user, scopes=["admin:manage"])],
):
    return {"deleted": doc_id, "by": user["user_id"]}`,
          notes: [
            "SecurityScopes is injected by FastAPI — it contains scopes from the Security() declaration",
            "Scopes are declared per-route via Security(dep, scopes=[...]) — each route sets its own required permissions",
            "The OAuth2 scopes dict at the top populates the OpenAPI docs with descriptions",
            "Use issubset() to check that all required scopes are present in the token",
          ]
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "middleware-logging",
      icon: "📋",
      title: "Middleware & Logging",
      items: [
        {
          title: "Request ID + Timing Middleware",
          lang: "python",
          filename: "middleware/request_id.py",
          desc: "Attach a unique request ID and measure total processing time for every request.",
          code: `import time
import uuid
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

class RequestContextMiddleware(BaseHTTPMiddleware):
    """
    Adds X-Request-ID and X-Process-Time headers to every response.
    The request ID propagates through logs for distributed tracing.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        # Generate or propagate request ID
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        request.state.request_id = request_id

        start = time.perf_counter()
        response = await call_next(request)
        process_time = (time.perf_counter() - start) * 1000  # ms

        # Attach to response headers
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Process-Time"] = f"{process_time:.1f}ms"

        return response

# ── Register in main.py ──────────────────────────────────────────────
# from app.middleware.request_id import RequestContextMiddleware
# app.add_middleware(RequestContextMiddleware)`,
          notes: [
            "BaseHTTPMiddleware wraps the entire request/response cycle",
            "request.state is a per-request namespace — attach anything, read it anywhere downstream",
            "If the client sends X-Request-ID, we propagate it — useful for distributed tracing across services",
            "time.perf_counter() is monotonic and has nanosecond resolution — use it for benchmarking, not datetime.now()",
          ]
        },
        {
          title: "Structured Logging with structlog",
          lang: "python",
          filename: "middleware/logging.py",
          desc: "JSON-structured request logging — every log line includes request ID, method, path, status, and timing.",
          code: `import structlog
import time
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

# ── Configure structlog once at startup ───────────────────────────────
def setup_logging(json_output: bool = True):
    """Call once in lifespan or main.py."""
    processors = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
    ]
    if json_output:
        processors.append(structlog.processors.JSONRenderer())
    else:
        processors.append(structlog.dev.ConsoleRenderer())

    structlog.configure(
        processors=processors,
        wrapper_class=structlog.make_filtering_bound_logger(20),  # INFO+
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )

logger = structlog.get_logger()

class StructuredLoggingMiddleware(BaseHTTPMiddleware):
    """Log every request as a structured JSON line."""

    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = getattr(request.state, "request_id", "unknown")

        # Bind request context — all log calls in this request include these fields
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(
            request_id=request_id,
            method=request.method,
            path=request.url.path,
        )

        start = time.perf_counter()
        try:
            response = await call_next(request)
            duration_ms = (time.perf_counter() - start) * 1000

            logger.info(
                "request_completed",
                status_code=response.status_code,
                duration_ms=round(duration_ms, 1),
                client_ip=request.client.host if request.client else None,
            )
            return response

        except Exception as exc:
            duration_ms = (time.perf_counter() - start) * 1000
            logger.error(
                "request_failed",
                error=str(exc),
                error_type=type(exc).__name__,
                duration_ms=round(duration_ms, 1),
            )
            raise

# Output: {"event":"request_completed","request_id":"abc-123","method":"POST",
#          "path":"/documents/classify","status_code":200,"duration_ms":42.3,
#          "timestamp":"2025-01-15T10:30:00Z","level":"info"}`,
          notes: [
            "structlog.contextvars binds fields to the current async context — all log calls in the same request share them",
            "JSON logs are machine-parseable — feed them to Loki, Datadog, or CloudWatch directly",
            "Use ConsoleRenderer in dev for colored, human-readable output; JSONRenderer in prod",
            "Order middleware registration matters: RequestContextMiddleware must run before StructuredLoggingMiddleware",
          ]
        },
        {
          title: "Custom Exception Handlers",
          lang: "python",
          filename: "main.py",
          desc: "Unified error responses — catch domain exceptions and return consistent JSON shapes.",
          code: `from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel
from datetime import datetime, timezone
import structlog

logger = structlog.get_logger()

# ── Domain exceptions ─────────────────────────────────────────────────
class IntelliAPIError(Exception):
    """Base exception for all IntelliAPI domain errors."""
    def __init__(self, message: str, code: str, status_code: int = 400):
        self.message = message
        self.code = code
        self.status_code = status_code

class DocumentTooLargeError(IntelliAPIError):
    def __init__(self, size: int, max_size: int):
        super().__init__(
            message=f"Document size {size} exceeds max {max_size}",
            code="DOCUMENT_TOO_LARGE",
            status_code=413,
        )

class ModelUnavailableError(IntelliAPIError):
    def __init__(self, model_name: str):
        super().__init__(
            message=f"Model '{model_name}' is not available",
            code="MODEL_UNAVAILABLE",
            status_code=503,
        )

# ── Error response schema ────────────────────────────────────────────
class ErrorResponse(BaseModel):
    error: str
    code: str
    detail: str | None = None
    timestamp: str

# ── Register handlers ────────────────────────────────────────────────
def register_exception_handlers(app: FastAPI):

    @app.exception_handler(IntelliAPIError)
    async def handle_domain_error(request: Request, exc: IntelliAPIError):
        logger.warning("domain_error", code=exc.code, message=exc.message)
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": exc.code,
                "code": exc.code,
                "detail": exc.message,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            },
        )

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(request: Request, exc: RequestValidationError):
        logger.warning("validation_error", errors=exc.errors())
        return JSONResponse(
            status_code=422,
            content={
                "error": "VALIDATION_ERROR",
                "code": "VALIDATION_ERROR",
                "detail": exc.errors(),
                "timestamp": datetime.now(timezone.utc).isoformat(),
            },
        )

    @app.exception_handler(Exception)
    async def handle_unexpected_error(request: Request, exc: Exception):
        logger.error("unhandled_exception", error=str(exc), type=type(exc).__name__)
        return JSONResponse(
            status_code=500,
            content={
                "error": "INTERNAL_ERROR",
                "code": "INTERNAL_ERROR",
                "detail": "An unexpected error occurred" if True else str(exc),
                "timestamp": datetime.now(timezone.utc).isoformat(),
            },
        )`,
          notes: [
            "Domain exceptions carry machine-readable codes (DOCUMENT_TOO_LARGE) — clients switch on these, not messages",
            "Override RequestValidationError to return your own shape instead of FastAPI's default",
            "The catch-all Exception handler prevents stack traces from leaking to clients in production",
            "Log the actual error server-side but return a generic message to the client",
          ]
        },
        {
          title: "CORS Configuration",
          lang: "python",
          filename: "main.py",
          desc: "CORS middleware setup — restrict origins in production, allow everything in development.",
          code: `from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings

app = FastAPI(title="IntelliAPI")

# ── CORS ──────────────────────────────────────────────────────────────
if settings.env == "development":
    origins = ["*"]
else:
    origins = [
        "https://intelliapi.example.com",
        "https://dashboard.intelliapi.example.com",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID", "X-Process-Time"],
    max_age=600,  # Cache preflight for 10 minutes
)

# ── Middleware order matters! ─────────────────────────────────────────
# Middleware runs in REVERSE registration order (LIFO).
# Register in this order so they execute as:
#   CORS → RequestContext → Logging → route handler
#
# from app.middleware.logging import StructuredLoggingMiddleware
# from app.middleware.request_id import RequestContextMiddleware
# app.add_middleware(StructuredLoggingMiddleware)    # runs 2nd
# app.add_middleware(RequestContextMiddleware)       # runs 1st
# CORS is already added above                       # runs 0th`,
          notes: [
            "Never use allow_origins=['*'] with allow_credentials=True in production — browsers block it",
            "expose_headers makes custom headers readable by JavaScript — without it, fetch() cannot see X-Request-ID",
            "max_age=600 caches preflight responses so browsers skip OPTIONS requests for 10 minutes",
            "Middleware executes in LIFO order — last added runs first",
          ]
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "testing",
      icon: "🧪",
      title: "Testing",
      items: [
        {
          title: "conftest.py with Async Fixtures",
          lang: "python",
          filename: "tests/conftest.py",
          desc: "Shared test fixtures — async client, test database, and authenticated users.",
          code: `import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from app.main import app
from app.dependencies import get_db
from app.utils.security import create_access_token

# ── Use asyncio for all tests ────────────────────────────────────────
pytestmark = pytest.mark.anyio

@pytest_asyncio.fixture
async def async_client():
    """Async HTTP client that talks directly to the ASGI app (no network)."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

@pytest_asyncio.fixture
async def db_session():
    """In-memory SQLite session for isolated tests."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")

    # Create tables
    from app.models import Base
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session

    await engine.dispose()

@pytest_asyncio.fixture
async def client_with_db(async_client, db_session):
    """Client with database dependency overridden to use test DB."""
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    yield async_client
    app.dependency_overrides.clear()

@pytest.fixture
def admin_token() -> str:
    """JWT for an admin user."""
    return create_access_token(
        user_id="usr-testadm",
        role="admin",
        scopes=["documents:read", "documents:write", "admin:manage"],
    )

@pytest.fixture
def viewer_token() -> str:
    """JWT for a viewer user."""
    return create_access_token(
        user_id="usr-testview",
        role="viewer",
        scopes=["documents:read"],
    )

@pytest.fixture
def auth_headers(admin_token) -> dict:
    """Authorization headers with admin token."""
    return {"Authorization": f"Bearer {admin_token}"}`,
          notes: [
            "ASGITransport connects httpx directly to the ASGI app — no server needed, tests run in milliseconds",
            "dependency_overrides is FastAPI's built-in DI replacement mechanism — perfect for testing",
            "Always clear dependency_overrides after tests to prevent cross-test contamination",
            "In-memory SQLite is fast but does not support PostgreSQL-specific features — use testcontainers for integration tests",
          ]
        },
        {
          title: "Testing Protected Endpoints",
          lang: "python",
          filename: "tests/test_documents.py",
          desc: "Test classification endpoint with auth — verify happy path, validation errors, and forbidden access.",
          code: `import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.anyio

class TestClassifyDocument:
    """Tests for POST /documents/classify."""

    async def test_classify_success(
        self, async_client: AsyncClient, auth_headers: dict
    ):
        """Happy path — valid document returns classification."""
        response = await async_client.post(
            "/documents/classify",
            json={"text": "This technical document describes the microservices architecture."},
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["category"] in ["technical", "legal", "financial", "medical", "general"]
        assert 0.0 <= data["confidence"] <= 1.0
        assert "doc_id" in data

    async def test_classify_validation_error(
        self, async_client: AsyncClient, auth_headers: dict
    ):
        """Text too short — returns 422 with validation details."""
        response = await async_client.post(
            "/documents/classify",
            json={"text": "short"},
            headers=auth_headers,
        )
        assert response.status_code == 422
        errors = response.json()["detail"]
        assert any("min_length" in str(e) or "too_short" in str(e) for e in errors)

    async def test_classify_no_auth(self, async_client: AsyncClient):
        """Missing token — returns 401."""
        response = await async_client.post(
            "/documents/classify",
            json={"text": "Some document text for classification testing."},
        )
        assert response.status_code == 401

    async def test_classify_forbidden_scope(
        self, async_client: AsyncClient, viewer_token: str
    ):
        """Viewer token lacks documents:write scope — returns 403."""
        response = await async_client.post(
            "/documents/classify",
            json={"text": "This document should be rejected due to insufficient scope."},
            headers={"Authorization": f"Bearer {viewer_token}"},
        )
        # Viewer can read but not write — classify is a write operation
        assert response.status_code == 403

    async def test_classify_response_timing(
        self, async_client: AsyncClient, auth_headers: dict
    ):
        """Response includes processing time header."""
        response = await async_client.post(
            "/documents/classify",
            json={"text": "Verify that the response includes timing information in headers."},
            headers=auth_headers,
        )
        assert "X-Process-Time" in response.headers
        assert "X-Request-ID" in response.headers`,
          notes: [
            "Group related tests in a class — pytest discovers them automatically",
            "Test the 4 main scenarios: success, validation error, unauthenticated, unauthorized",
            "Assert on response structure, not exact values — ML outputs are non-deterministic",
            "Check response headers too — middleware behavior is part of the contract",
          ]
        },
        {
          title: "Dependency Overrides with Fakes",
          lang: "python",
          filename: "tests/test_with_fakes.py",
          desc: "Replace real services with fakes — test business logic without ML models or external APIs.",
          code: `import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.dependencies import get_classifier, get_db, get_redis

pytestmark = pytest.mark.anyio

# ── Fake implementations ─────────────────────────────────────────────
class FakeClassifier:
    """Deterministic classifier for testing."""

    async def predict(self, text: str) -> dict:
        # Always returns the same result — no ML model needed
        return {
            "category": "technical",
            "confidence": 0.95,
            "model": "fake-classifier-v1",
        }

class FakeRedis:
    """In-memory Redis replacement."""

    def __init__(self):
        self._store: dict[str, str] = {}

    async def get(self, key: str) -> str | None:
        return self._store.get(key)

    async def set(self, key: str, value: str, ex: int | None = None) -> None:
        self._store[key] = value

    async def incr(self, key: str) -> int:
        val = int(self._store.get(key, "0")) + 1
        self._store[key] = str(val)
        return val

    async def ping(self) -> bool:
        return True

# ── Fixtures ──────────────────────────────────────────────────────────
@pytest.fixture
def fake_classifier():
    return FakeClassifier()

@pytest.fixture
def fake_redis():
    return FakeRedis()

@pytest.fixture
def override_deps(fake_classifier, fake_redis):
    """Override all external dependencies with fakes."""
    app.dependency_overrides[get_classifier] = lambda: fake_classifier
    app.dependency_overrides[get_redis] = lambda: fake_redis
    yield
    app.dependency_overrides.clear()

@pytest.fixture
async def client(override_deps):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c

# ── Tests ─────────────────────────────────────────────────────────────
async def test_classify_uses_fake_model(client: AsyncClient, auth_headers: dict):
    """Fake classifier always returns 'technical' — predictable for assertions."""
    response = await client.post(
        "/documents/classify",
        json={"text": "Any text will be classified as technical by the fake."},
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["category"] == "technical"
    assert response.json()["confidence"] == 0.95

async def test_health_with_fake_redis(client: AsyncClient):
    """Health endpoint works with fake Redis."""
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json()["redis"] is True`,
          notes: [
            "Fakes implement the same interface as real services — no protocol classes needed for simple cases",
            "dependency_overrides maps the original function to a factory that returns the fake",
            "FakeRedis stores data in a plain dict — tests run in microseconds, no Redis server needed",
            "Always clear overrides in fixture teardown to prevent leaking between test files",
          ]
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "streaming",
      icon: "📡",
      title: "WebSockets & Streaming",
      items: [
        {
          title: "SSE Endpoint for Streaming Responses",
          lang: "python",
          filename: "routers/documents.py",
          desc: "Server-Sent Events for streaming document summarization — client receives chunks as they are generated.",
          code: `import asyncio
import json
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from typing import AsyncGenerator, Annotated

router = APIRouter(prefix="/documents", tags=["documents"])

async def generate_summary_chunks(text: str) -> AsyncGenerator[str, None]:
    """
    Simulate a streaming summarizer — yields chunks as they are generated.
    In production, this wraps an LLM streaming API (OpenAI, Anthropic, etc.).
    """
    words = text.split()
    chunk_size = 5
    total_chunks = (len(words) + chunk_size - 1) // chunk_size

    for i in range(0, len(words), chunk_size):
        chunk = " ".join(words[i:i + chunk_size])
        await asyncio.sleep(0.1)  # simulate generation latency

        # SSE format: data: <json>\\n\\n
        event_data = json.dumps({
            "chunk": chunk,
            "chunk_index": i // chunk_size,
            "total_chunks": total_chunks,
            "done": (i + chunk_size) >= len(words),
        })
        yield f"data: {event_data}\\n\\n"

    # Final event signals completion
    yield f"data: {json.dumps({'done': True, 'summary_length': len(words)})}\\n\\n"

@router.post("/summarize/stream")
async def stream_summary(text: str):
    """
    Stream a document summary via Server-Sent Events.
    Client connects with EventSource or fetch() with readable stream.
    """
    return StreamingResponse(
        generate_summary_chunks(text),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        },
    )

# ── Client-side usage ────────────────────────────────────────────────
# const source = new EventSource("/documents/summarize/stream?text=...");
# source.onmessage = (event) => {
#     const data = JSON.parse(event.data);
#     if (data.done) { source.close(); return; }
#     console.log(data.chunk);
# };`,
          notes: [
            "SSE uses text/event-stream content type — each event is 'data: ...\\n\\n'",
            "X-Accel-Buffering: no prevents nginx from buffering the entire response before sending",
            "StreamingResponse accepts any async generator — FastAPI sends each yield as a chunk",
            "SSE is simpler than WebSockets for server-to-client streaming — no bidirectional protocol needed",
          ]
        },
        {
          title: "WebSocket with Auth and Connection Manager",
          lang: "python",
          filename: "routers/ws.py",
          desc: "WebSocket endpoint with JWT authentication and a connection manager for broadcasting updates.",
          code: `import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from jose import JWTError, jwt
from app.config import settings

router = APIRouter()

class ConnectionManager:
    """Manages active WebSocket connections for broadcasting."""

    def __init__(self):
        self.active: dict[str, WebSocket] = {}  # user_id → websocket

    async def connect(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active[user_id] = websocket

    def disconnect(self, user_id: str):
        self.active.pop(user_id, None)

    async def send_to_user(self, user_id: str, message: dict):
        ws = self.active.get(user_id)
        if ws:
            await ws.send_json(message)

    async def broadcast(self, message: dict, exclude: str | None = None):
        for uid, ws in self.active.items():
            if uid != exclude:
                await ws.send_json(message)

manager = ConnectionManager()

async def authenticate_ws(token: str | None) -> dict | None:
    """Validate JWT from query parameter (WebSocket cannot send headers)."""
    if not token:
        return None
    try:
        payload = jwt.decode(
            token, settings.jwt_secret, algorithms=[settings.jwt_algorithm]
        )
        return {"user_id": payload["sub"], "role": payload.get("role", "viewer")}
    except JWTError:
        return None

@router.websocket("/ws/documents")
async def document_updates(
    websocket: WebSocket,
    token: str | None = Query(default=None),
):
    """
    WebSocket for real-time document processing updates.
    Auth via query param: ws://host/ws/documents?token=<jwt>
    """
    user = await authenticate_ws(token)
    if not user:
        await websocket.close(code=4001, reason="Authentication required")
        return

    user_id = user["user_id"]
    await manager.connect(user_id, websocket)

    try:
        while True:
            # Receive commands from client
            data = await websocket.receive_json()
            action = data.get("action")

            if action == "subscribe":
                await websocket.send_json({
                    "type": "subscribed",
                    "channel": data.get("channel", "all"),
                })
            elif action == "ping":
                await websocket.send_json({"type": "pong"})
            else:
                await websocket.send_json({
                    "type": "error",
                    "message": f"Unknown action: {action}",
                })

    except WebSocketDisconnect:
        manager.disconnect(user_id)
        await manager.broadcast(
            {"type": "user_left", "user_id": user_id},
            exclude=user_id,
        )`,
          notes: [
            "WebSocket auth uses query parameters because browsers cannot set custom headers on WebSocket connections",
            "Close code 4001 is a custom application code (4000-4999 range) — standard codes are 1000-1015",
            "The connection manager pattern scales to a single process — use Redis pub/sub for multi-process broadcasting",
            "Always wrap the receive loop in try/except WebSocketDisconnect for clean disconnection handling",
          ]
        },
        {
          title: "Background Task for Audit Logging",
          lang: "python",
          filename: "routers/documents.py",
          desc: "Background tasks run after the response is sent — perfect for audit logs that should not slow down the response.",
          code: `import json
from datetime import datetime, timezone
from fastapi import APIRouter, BackgroundTasks, Depends
from typing import Annotated
from pydantic import BaseModel
from app.dependencies import DB, Redis

router = APIRouter(prefix="/documents", tags=["documents"])

class ClassifyRequest(BaseModel):
    text: str
    priority: int = 0

class AuditEntry(BaseModel):
    timestamp: str
    user_id: str
    action: str
    resource: str
    details: dict

async def write_audit_log(
    entry: AuditEntry,
    db_session_factory,
    redis_client,
):
    """
    Background task — runs AFTER the response is sent to the client.
    The response is not delayed by this work.
    """
    # 1. Write to database for permanent storage
    async with db_session_factory() as session:
        await session.execute(
            "INSERT INTO audit_log (timestamp, user_id, action, resource, details) "
            "VALUES (:ts, :uid, :action, :resource, :details)",
            {
                "ts": entry.timestamp,
                "uid": entry.user_id,
                "action": entry.action,
                "resource": entry.resource,
                "details": json.dumps(entry.details),
            },
        )
        await session.commit()

    # 2. Publish to Redis for real-time dashboards
    await redis_client.publish(
        "audit:stream",
        entry.model_dump_json(),
    )

@router.post("/classify")
async def classify_document(
    request: ClassifyRequest,
    background_tasks: BackgroundTasks,
    db: DB,
    cache: Redis,
):
    """
    Classify a document and log the action in the background.
    The client gets the response immediately — audit logging
    happens asynchronously after the response is sent.
    """
    # Do the actual work
    result = {
        "doc_id": "doc-abc123",
        "category": "technical",
        "confidence": 0.94,
    }

    # Schedule audit log — runs after response is sent
    background_tasks.add_task(
        write_audit_log,
        AuditEntry(
            timestamp=datetime.now(timezone.utc).isoformat(),
            user_id="usr-current",
            action="classify",
            resource="doc-abc123",
            details={"category": result["category"], "priority": request.priority},
        ),
        db_session_factory=db.get_bind(),  # pass factory, not session
        redis_client=cache,
    )

    return result`,
          notes: [
            "BackgroundTasks runs after the response — the client does not wait for audit logging",
            "Background tasks share the same process — they are not distributed workers like Celery",
            "For heavy or unreliable work (email, webhooks), use a proper task queue instead",
            "Multiple add_task calls queue tasks in order — they run sequentially after the response",
          ]
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "production-deployment",
      icon: "🏭",
      title: "Production Deployment",
      items: [
        {
          title: "Multi-Stage Dockerfile",
          lang: "dockerfile",
          filename: "Dockerfile",
          desc: "Multi-stage build — builder stage installs deps, runtime stage copies only what is needed.",
          code: `# ── Stage 1: Builder ──────────────────────────────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /build

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \\
    gcc libpq-dev && \\
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ── Stage 2: Runtime ─────────────────────────────────────────────────
FROM python:3.12-slim AS runtime

# Security: non-root user
RUN groupadd -r intelliapi && useradd -r -g intelliapi intelliapi

# Runtime dependencies only (no gcc)
RUN apt-get update && apt-get install -y --no-install-recommends \\
    libpq5 curl && \\
    rm -rf /var/lib/apt/lists/*

# Copy installed packages from builder
COPY --from=builder /install /usr/local

WORKDIR /app
COPY app/ ./app/
COPY gunicorn.conf.py .

# Own the workdir
RUN chown -R intelliapi:intelliapi /app

USER intelliapi

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \\
    CMD curl -f http://localhost:8000/health/liveness || exit 1

CMD ["gunicorn", "app.main:app", "-c", "gunicorn.conf.py"]`,
          notes: [
            "Multi-stage build: builder has gcc for compiling C extensions, runtime only has shared libraries",
            "Non-root user (intelliapi) follows the principle of least privilege",
            "--no-cache-dir prevents pip from storing wheel caches — smaller image",
            "HEALTHCHECK tells Docker (and orchestrators) how to verify the container is alive",
          ]
        },
        {
          title: "docker-compose.yml (App + Postgres + Redis)",
          lang: "yaml",
          filename: "docker-compose.yml",
          desc: "Full local development stack — API, PostgreSQL, and Redis with health checks and volume persistence.",
          code: `services:
  api:
    build: .
    ports:
      - "8000:8000"
    environment:
      - ENV=development
      - DATABASE_URL=postgresql+asyncpg://intelliapi:secret@postgres:5432/intelliapi
      - REDIS_URL=redis://redis:6379/0
      - JWT_SECRET=dev-secret-change-in-prod
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./app:/app/app  # Hot-reload in development
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: intelliapi
      POSTGRES_USER: intelliapi
      POSTGRES_PASSWORD: secret
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U intelliapi"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redisdata:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru

volumes:
  pgdata:
  redisdata:`,
          notes: [
            "depends_on with condition: service_healthy waits for Postgres/Redis to be ready, not just started",
            "Volume mount ./app:/app/app enables hot-reload without rebuilding the image",
            "Redis appendonly yes enables AOF persistence — data survives container restarts",
            "Named volumes (pgdata, redisdata) persist across docker compose down/up cycles",
          ]
        },
        {
          title: "gunicorn.conf.py",
          lang: "python",
          filename: "gunicorn.conf.py",
          desc: "Gunicorn config for running FastAPI in production — uvicorn workers, graceful shutdown, and logging.",
          code: `import multiprocessing
import os

# ── Server socket ─────────────────────────────────────────────────────
bind = "0.0.0.0:8000"
backlog = 2048

# ── Worker processes ──────────────────────────────────────────────────
# UvicornWorker gives us async — each worker runs its own event loop.
worker_class = "uvicorn.workers.UvicornWorker"

# Rule of thumb: 2-4 workers per CPU core for I/O-bound apps.
# For ML inference (CPU-bound), use fewer workers + more threads.
workers = int(os.getenv("WEB_WORKERS", multiprocessing.cpu_count() * 2 + 1))

# ── Timeouts ──────────────────────────────────────────────────────────
timeout = 120        # Kill worker if request takes > 120s
graceful_timeout = 30  # Time for worker to finish in-flight requests on shutdown
keepalive = 5        # Seconds to wait for next request on keep-alive connection

# ── Lifecycle ─────────────────────────────────────────────────────────
max_requests = 1000         # Restart worker after N requests (prevents memory leaks)
max_requests_jitter = 50    # Random jitter so workers don't all restart at once
preload_app = True          # Load app before forking — shares memory via copy-on-write

# ── Logging ───────────────────────────────────────────────────────────
accesslog = "-"             # stdout
errorlog = "-"              # stdout
loglevel = os.getenv("LOG_LEVEL", "info")

# JSON access log format for structured logging
access_log_format = (
    '{"remote_ip":"%(h)s","request_line":"%(r)s",'
    '"status":"%(s)s","response_length":"%(b)s",'
    '"request_time":"%(D)s","user_agent":"%(a)s"}'
)

# ── Server hooks ──────────────────────────────────────────────────────
def on_starting(server):
    """Called just before the master process is initialized."""
    pass

def post_fork(server, worker):
    """Called just after a worker has been forked."""
    server.log.info(f"Worker spawned (pid: {worker.pid})")

def worker_exit(server, worker):
    """Called when a worker has been killed or exited."""
    server.log.info(f"Worker exited (pid: {worker.pid})")`,
          notes: [
            "UvicornWorker runs each worker with its own asyncio event loop — required for async FastAPI",
            "preload_app=True loads the app once then forks — workers share read-only memory pages via copy-on-write",
            "max_requests prevents slow memory leaks from accumulating — jitter prevents thundering herd restarts",
            "timeout=120 is generous for ML inference — lower it for pure API services (30s)",
          ]
        },
        {
          title: "Health Check Endpoints (Liveness + Readiness)",
          lang: "python",
          filename: "routers/health.py",
          desc: "Separate liveness and readiness probes — Kubernetes uses them to decide when to restart or route traffic.",
          code: `from fastapi import APIRouter, Request
from pydantic import BaseModel
from datetime import datetime, timezone

router = APIRouter(tags=["health"])

class HealthResponse(BaseModel):
    status: str
    timestamp: str
    version: str = "1.0.0"

class ReadinessResponse(HealthResponse):
    database: str
    redis: str
    model: str

@router.get("/health/liveness", response_model=HealthResponse)
async def liveness():
    """
    Liveness probe — is the process alive and responding?
    Kubernetes restarts the pod if this fails.
    Keep it simple: no dependency checks.
    """
    return HealthResponse(
        status="alive",
        timestamp=datetime.now(timezone.utc).isoformat(),
    )

@router.get("/health/readiness", response_model=ReadinessResponse)
async def readiness(request: Request):
    """
    Readiness probe — can this instance serve traffic?
    Kubernetes removes the pod from the service if this fails
    (but does NOT restart it).
    """
    checks = {"database": "unknown", "redis": "unknown", "model": "unknown"}

    # Check database
    try:
        db_factory = request.app.state.db_session_factory
        async with db_factory() as session:
            await session.execute("SELECT 1")
        checks["database"] = "ok"
    except Exception as e:
        checks["database"] = f"error: {e}"

    # Check Redis
    try:
        pong = await request.app.state.redis.ping()
        checks["redis"] = "ok" if pong else "error: no pong"
    except Exception as e:
        checks["redis"] = f"error: {e}"

    # Check ML model
    try:
        classifier = request.app.state.classifier
        checks["model"] = "ok" if classifier and classifier._model else "not loaded"
    except Exception as e:
        checks["model"] = f"error: {e}"

    all_ok = all(v == "ok" for v in checks.values())
    status_code = 200 if all_ok else 503

    from fastapi.responses import JSONResponse
    return JSONResponse(
        status_code=status_code,
        content=ReadinessResponse(
            status="ready" if all_ok else "not_ready",
            timestamp=datetime.now(timezone.utc).isoformat(),
            **checks,
        ).model_dump(),
    )`,
          notes: [
            "Liveness checks if the process is alive — keep it fast and dependency-free",
            "Readiness checks if the instance can serve traffic — it verifies database, Redis, and ML model",
            "Kubernetes uses liveness to restart pods and readiness to route traffic — they serve different purposes",
            "Return 503 on readiness failure — Kubernetes removes the pod from the load balancer but does not kill it",
          ]
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "system-design-patterns",
      icon: "🏗️",
      title: "System Design Patterns",
      items: [
        {
          title: "Rate Limiting (Sliding Window with Redis)",
          lang: "python",
          filename: "middleware/rate_limit.py",
          desc: "Sliding window rate limiter using Redis sorted sets — accurate per-user limits without race conditions.",
          code: `import time
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
import redis.asyncio as aioredis

class SlidingWindowRateLimiter(BaseHTTPMiddleware):
    """
    Sliding window rate limiter using Redis sorted sets.
    Each request is a member scored by its timestamp.
    The window slides with real time — no fixed bucket boundaries.
    """

    def __init__(self, app, max_requests: int = 60, window_seconds: int = 60):
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds

    async def dispatch(self, request: Request, call_next) -> Response:
        # Skip health checks
        if request.url.path.startswith("/health"):
            return await call_next(request)

        redis_client: aioredis.Redis = request.app.state.redis

        # Identify client (user ID from JWT or IP address)
        client_id = getattr(request.state, "user_id", None)
        if not client_id:
            client_id = request.client.host if request.client else "unknown"

        key = f"ratelimit:{client_id}"
        now = time.time()
        window_start = now - self.window_seconds

        # Atomic pipeline: remove old entries, add current, count, set TTL
        pipe = redis_client.pipeline(transaction=True)
        pipe.zremrangebyscore(key, 0, window_start)   # Remove expired entries
        pipe.zadd(key, {f"{now}": now})                # Add current request
        pipe.zcard(key)                                # Count requests in window
        pipe.expire(key, self.window_seconds + 1)      # Auto-cleanup
        results = await pipe.execute()

        request_count = results[2]

        # Set rate limit headers (draft RFC 7398)
        remaining = max(0, self.max_requests - request_count)
        headers = {
            "X-RateLimit-Limit": str(self.max_requests),
            "X-RateLimit-Remaining": str(remaining),
            "X-RateLimit-Reset": str(int(now + self.window_seconds)),
        }

        if request_count > self.max_requests:
            return Response(
                status_code=429,
                content='{"error":"RATE_LIMIT_EXCEEDED","detail":"Too many requests"}',
                media_type="application/json",
                headers={**headers, "Retry-After": str(self.window_seconds)},
            )

        response = await call_next(request)
        for k, v in headers.items():
            response.headers[k] = v
        return response

# Register: app.add_middleware(SlidingWindowRateLimiter, max_requests=60, window_seconds=60)`,
          notes: [
            "Sorted sets score each request by timestamp — zremrangebyscore removes entries outside the window",
            "Pipeline with transaction=True makes all four commands atomic — no race conditions under concurrency",
            "Sliding window avoids the burst problem of fixed windows — no double-rate at bucket boundaries",
            "Rate limit headers follow the draft RFC — clients can back off gracefully",
          ]
        },
        {
          title: "Circuit Breaker",
          lang: "python",
          filename: "utils/circuit_breaker.py",
          desc: "Circuit breaker for external service calls — prevents cascading failures when a downstream service is unhealthy.",
          code: `import asyncio
import time
from enum import Enum
from dataclasses import dataclass, field
from typing import Callable, Any
from functools import wraps

class CircuitState(str, Enum):
    CLOSED = "closed"        # Normal — requests pass through
    OPEN = "open"            # Tripped — requests fail immediately
    HALF_OPEN = "half_open"  # Testing — one request allowed through

@dataclass
class CircuitBreaker:
    """
    Stops calling a failing service, waits, then tests recovery.
    Closed → Open → Half-Open → Closed (or back to Open).
    """
    name: str
    failure_threshold: int = 5        # Failures before opening
    recovery_timeout: float = 30.0    # Seconds before trying again
    success_threshold: int = 3        # Successes in half-open to close

    state: CircuitState = field(default=CircuitState.CLOSED, init=False)
    failure_count: int = field(default=0, init=False)
    success_count: int = field(default=0, init=False)
    last_failure_time: float = field(default=0.0, init=False)

    def _should_attempt(self) -> bool:
        if self.state == CircuitState.CLOSED:
            return True
        if self.state == CircuitState.OPEN:
            if time.monotonic() - self.last_failure_time >= self.recovery_timeout:
                self.state = CircuitState.HALF_OPEN
                self.success_count = 0
                return True
            return False
        # HALF_OPEN — allow requests through
        return True

    def _record_success(self):
        if self.state == CircuitState.HALF_OPEN:
            self.success_count += 1
            if self.success_count >= self.success_threshold:
                self.state = CircuitState.CLOSED
                self.failure_count = 0
        else:
            self.failure_count = 0

    def _record_failure(self):
        self.failure_count += 1
        self.last_failure_time = time.monotonic()
        if self.failure_count >= self.failure_threshold:
            self.state = CircuitState.OPEN

    async def call(self, func: Callable, *args, **kwargs) -> Any:
        if not self._should_attempt():
            raise CircuitBreakerOpenError(
                f"Circuit '{self.name}' is OPEN — failing fast"
            )
        try:
            result = await func(*args, **kwargs)
            self._record_success()
            return result
        except Exception as e:
            self._record_failure()
            raise

class CircuitBreakerOpenError(Exception):
    pass

# ── Usage ─────────────────────────────────────────────────────────────
summarizer_circuit = CircuitBreaker(
    name="summarizer-service",
    failure_threshold=5,
    recovery_timeout=30.0,
)

async def call_summarizer(text: str) -> dict:
    """Wrap external call with circuit breaker."""
    async def _call(text: str) -> dict:
        import httpx
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "http://summarizer:8001/summarize",
                json={"text": text},
                timeout=10.0,
            )
            resp.raise_for_status()
            return resp.json()

    return await summarizer_circuit.call(_call, text)`,
          notes: [
            "CLOSED: normal operation. OPEN: fail-fast without calling the service. HALF_OPEN: test with limited traffic",
            "time.monotonic() is immune to system clock changes — always use it for measuring elapsed time",
            "After recovery_timeout, one request is allowed through to test if the service recovered",
            "This is a single-process implementation — use Redis for shared state across multiple workers",
          ]
        },
        {
          title: "Dynamic Request Batching",
          lang: "python",
          filename: "services/batcher.py",
          desc: "Collect individual inference requests into batches for GPU efficiency — amortize model overhead across requests.",
          code: `import asyncio
from dataclasses import dataclass, field
from typing import Any

@dataclass
class PendingRequest:
    text: str
    future: asyncio.Future = field(default_factory=lambda: asyncio.get_event_loop().create_future())

class DynamicBatcher:
    """
    Collects individual inference requests and processes them in
    batches. Each request gets its own Future that resolves when
    the batch completes.

    Batching triggers when:
    1. Batch is full (max_batch_size), OR
    2. Timeout expires (max_wait_ms) — whichever comes first.
    """

    def __init__(
        self,
        process_batch_fn,
        max_batch_size: int = 32,
        max_wait_ms: float = 50.0,
    ):
        self.process_batch_fn = process_batch_fn
        self.max_batch_size = max_batch_size
        self.max_wait_ms = max_wait_ms
        self._queue: asyncio.Queue[PendingRequest] = asyncio.Queue()
        self._running = False

    async def start(self):
        """Start the background batch processing loop."""
        self._running = True
        asyncio.create_task(self._batch_loop())

    async def stop(self):
        self._running = False

    async def submit(self, text: str) -> Any:
        """
        Submit a single request. Returns when the batch containing
        this request has been processed.
        """
        pending = PendingRequest(text=text)
        await self._queue.put(pending)
        return await pending.future  # Suspends until batch completes

    async def _batch_loop(self):
        while self._running:
            batch: list[PendingRequest] = []

            # Wait for at least one request
            try:
                first = await asyncio.wait_for(
                    self._queue.get(), timeout=1.0
                )
                batch.append(first)
            except asyncio.TimeoutError:
                continue

            # Collect more requests up to batch size or timeout
            deadline = asyncio.get_event_loop().time() + (self.max_wait_ms / 1000)
            while len(batch) < self.max_batch_size:
                remaining = deadline - asyncio.get_event_loop().time()
                if remaining <= 0:
                    break
                try:
                    item = await asyncio.wait_for(
                        self._queue.get(), timeout=remaining
                    )
                    batch.append(item)
                except asyncio.TimeoutError:
                    break

            # Process the batch
            try:
                texts = [req.text for req in batch]
                results = await self.process_batch_fn(texts)

                for req, result in zip(batch, results):
                    req.future.set_result(result)
            except Exception as e:
                for req in batch:
                    if not req.future.done():
                        req.future.set_exception(e)

# ── Usage ─────────────────────────────────────────────────────────────
async def classify_batch(texts: list[str]) -> list[dict]:
    """Simulate batched ML inference — processes all texts at once."""
    await asyncio.sleep(0.1)  # model inference time (same for 1 or 32 texts)
    return [{"category": "technical", "confidence": 0.9} for _ in texts]

# In lifespan:
# batcher = DynamicBatcher(classify_batch, max_batch_size=32, max_wait_ms=50)
# await batcher.start()
# app.state.batcher = batcher
#
# In endpoint:
# result = await request.app.state.batcher.submit(text)`,
          notes: [
            "GPU inference cost is nearly the same for 1 or 32 texts — batching amortizes the overhead",
            "Each caller gets a Future that resolves when its batch is processed — callers do not know about batching",
            "max_wait_ms caps latency — a batch fires after 50ms even if not full",
            "This pattern converts N sequential model calls into 1 batched call — critical for GPU utilization",
          ]
        },
        {
          title: "Content-Addressable Inference Cache",
          lang: "python",
          filename: "services/cache.py",
          desc: "Cache ML results by content hash — identical documents get instant results without re-running inference.",
          code: `import hashlib
import json
from typing import Any
import redis.asyncio as aioredis

class InferenceCache:
    """
    Content-addressable cache for ML inference results.
    Key = hash(model_version + normalized_text), so:
    - Same document always hits cache
    - Model upgrade invalidates all cache entries
    - Whitespace variations don't cause cache misses
    """

    def __init__(
        self,
        redis: aioredis.Redis,
        model_version: str,
        ttl_seconds: int = 3600,
        prefix: str = "inference",
    ):
        self.redis = redis
        self.model_version = model_version
        self.ttl = ttl_seconds
        self.prefix = prefix

    def _normalize(self, text: str) -> str:
        """Normalize text so minor variations hit the same cache entry."""
        return " ".join(text.lower().split())

    def _cache_key(self, text: str) -> str:
        """Content-addressable key: hash of model version + normalized text."""
        normalized = self._normalize(text)
        content = f"{self.model_version}:{normalized}"
        digest = hashlib.sha256(content.encode()).hexdigest()[:16]
        return f"{self.prefix}:{digest}"

    async def get(self, text: str) -> dict | None:
        """Return cached result or None."""
        key = self._cache_key(text)
        cached = await self.redis.get(key)
        if cached:
            result = json.loads(cached)
            result["_cached"] = True
            return result
        return None

    async def set(self, text: str, result: dict) -> None:
        """Cache an inference result."""
        key = self._cache_key(text)
        await self.redis.set(key, json.dumps(result), ex=self.ttl)

    async def invalidate(self, text: str) -> None:
        """Remove a specific cache entry."""
        key = self._cache_key(text)
        await self.redis.delete(key)

    async def get_stats(self) -> dict:
        """Return cache hit/miss statistics."""
        info = await self.redis.info("stats")
        return {
            "hits": info.get("keyspace_hits", 0),
            "misses": info.get("keyspace_misses", 0),
            "hit_rate": info.get("keyspace_hits", 0)
            / max(1, info.get("keyspace_hits", 0) + info.get("keyspace_misses", 0)),
        }

# ── Usage in an endpoint ─────────────────────────────────────────────
# cache = InferenceCache(redis, model_version="v2.1", ttl_seconds=3600)
#
# @router.post("/classify")
# async def classify(text: str):
#     cached = await cache.get(text)
#     if cached:
#         return cached  # Instant response, no GPU
#
#     result = await classifier.predict(text)
#     await cache.set(text, result)
#     return result`,
          notes: [
            "Content-addressable: same text always produces the same key — deduplicates redundant inference",
            "Model version is part of the key — upgrading the model automatically invalidates the entire cache",
            "Normalization (lowercase + whitespace collapse) increases cache hit rate for near-identical inputs",
            "SHA-256 truncated to 16 hex chars (64 bits) is sufficient for cache keys — collisions are negligible",
          ]
        },
      ]
    },

  ]; // end m.codeExamples
})();
