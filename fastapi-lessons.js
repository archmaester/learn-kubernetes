// Patches the FastAPI module (m2) with full tutorial lesson content.
// Loaded after curriculum.js. m2 = CURRICULUM.phases[0].modules[1]
(function patchFastAPILessons() {
  const m = CURRICULUM.phases[0].modules[1]; // phase-1 (index 0), second module

  m.lessons = [

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "async-python-event-loop",
      title: "Async Python: How the Event Loop Works",
      readTime: "12 min",
      content: [
        {
          type: "text",
          text: "Most Python you've written is <strong>synchronous</strong>: each line runs one after the other, and if something takes time (a database query, an HTTP call), the entire program waits. That's fine for scripts. It's catastrophic for a web server handling 1,000 concurrent requests."
        },
        {
          type: "callout",
          variant: "info",
          title: "The Core Problem: I/O Blocks Everything",
          text: "A traditional (synchronous) Python web server processes one request at a time. If a request waits 100ms for a database query, the server is frozen for 100ms. 1,000 concurrent users means 1,000 threads — each burning ~8MB of RAM. At scale, you run out of memory before you run out of users."
        },
        {
          type: "heading",
          text: "The Two Types of Tasks",
          level: 2
        },
        {
          type: "text",
          text: "Before understanding async, understand what kind of work a backend server actually does:"
        },
        {
          type: "comparison",
          headers: ["", "CPU-bound", "I/O-bound"],
          rows: [
            ["What it is", "Heavy computation", "Waiting for external systems"],
            ["Examples", "Image processing, ML inference, hashing", "DB queries, HTTP calls, file reads"],
            ["Bottleneck", "CPU cores", "Network / disk latency"],
            ["Solution", "Multiprocessing (use all cores)", "Async / threads (don't block while waiting)"],
            ["FastAPI relevance", "Rare (offload to workers)", "90% of your routes"],
          ]
        },
        {
          type: "text",
          text: "FastAPI and async Python are built for <strong>I/O-bound work</strong> — the kind where your server spends most of its time waiting on databases, external APIs, or caches. While one request waits for Postgres to respond, async lets the server handle ten other requests."
        },
        {
          type: "heading",
          text: "The Event Loop: One Thread, Many Tasks",
          level: 2
        },
        {
          type: "text",
          text: "Python's async model is built on a single-threaded <strong>event loop</strong>. The event loop manages a queue of coroutines. When a coroutine hits an <code>await</code>, it <em>voluntarily pauses</em> and hands control back to the loop. The loop picks another ready coroutine to run. This is called <strong>cooperative multitasking</strong>."
        },
        {
          type: "diagram",
          code: `  EVENT LOOP (single thread)

  ┌──────────────────────────────────────────────────────┐
  │                                                      │
  │  Coroutine A: handle_request_1()                     │
  │    → calls await db.fetch_user(1)                    │
  │    → PAUSES (waiting for DB) ──────────────────────► DB query in flight
  │                                                      │
  │  Coroutine B: handle_request_2()  (runs now!)        │
  │    → calls await redis.get("cache_key")              │
  │    → PAUSES (waiting for Redis) ───────────────────► Cache lookup in flight
  │                                                      │
  │  Coroutine C: handle_request_3()  (runs now!)        │
  │    → purely CPU work, runs to completion             │
  │    → returns response immediately                    │
  │                                                      │
  │  DB responds → Coroutine A RESUMES                   │
  │  Redis responds → Coroutine B RESUMES                │
  │                                                      │
  │  Key insight: all this happens in ONE OS thread.     │
  │  No thread overhead, no locks, no race conditions.   │
  └──────────────────────────────────────────────────────┘`
        },
        {
          type: "heading",
          text: "async def, await, and Coroutines",
          level: 2
        },
        {
          type: "code",
          lang: "python",
          filename: "async_basics.py",
          code: `import asyncio
import time

# ── Synchronous version ─────────────────────────────────────────────────
def fetch_user_sync(user_id: int) -> dict:
    time.sleep(0.1)   # blocks for 100ms — the whole program waits
    return {"id": user_id, "name": "Alice"}

# ── Async version ────────────────────────────────────────────────────────
async def fetch_user(user_id: int) -> dict:
    await asyncio.sleep(0.1)   # yields control; event loop runs other coroutines
    return {"id": user_id, "name": "Alice"}

# Calling a coroutine — two ways:

# 1) await it (inside another coroutine)
async def main():
    user = await fetch_user(1)   # pause here, resume when done
    print(user)

# 2) Run from synchronous code
asyncio.run(main())

# ── Running coroutines concurrently with gather ──────────────────────────
async def slow_main():
    # Sequential: takes 300ms total
    u1 = await fetch_user(1)
    u2 = await fetch_user(2)
    u3 = await fetch_user(3)

async def fast_main():
    # Concurrent: takes ~100ms total (all three run simultaneously)
    u1, u2, u3 = await asyncio.gather(
        fetch_user(1),
        fetch_user(2),
        fetch_user(3),
    )
    print(u1, u2, u3)

asyncio.run(fast_main())`,
          notes: [
            "async def turns a function into a coroutine factory — calling it returns a coroutine object, not a result",
            "await pauses the coroutine until the awaitable completes and hands control to the event loop",
            "asyncio.gather() runs multiple coroutines concurrently — they overlap in time (not parallel: still one thread)",
            "asyncio.run() starts the event loop, runs your coroutine, then closes the loop",
          ]
        },
        {
          type: "heading",
          text: "asyncio.Task: Background Work",
          level: 2
        },
        {
          type: "code",
          lang: "python",
          filename: "tasks.py",
          code: `import asyncio

async def send_notification(user_id: int):
    await asyncio.sleep(2)   # simulate slow email service
    print(f"Notification sent to user {user_id}")

async def handle_request(user_id: int):
    # Fire-and-forget: create task, don't await it yet
    task = asyncio.create_task(send_notification(user_id))

    # Continue processing the request immediately
    result = {"status": "ok", "user_id": user_id}
    print("Response sent to client")

    # Later, if you need to wait for it:
    await task
    return result

# Tasks run concurrently with the rest of the event loop
# create_task schedules the coroutine immediately
asyncio.run(handle_request(42))`,
          notes: [
            "asyncio.create_task() schedules a coroutine to run concurrently — it starts immediately",
            "Unlike gather, you don't need to await a task right away; it runs in the background",
            "In FastAPI, use BackgroundTasks instead of create_task directly (FastAPI manages the lifecycle)",
          ]
        },
        {
          type: "heading",
          text: "The Critical Rule: Don't Block the Event Loop",
          level: 2
        },
        {
          type: "callout",
          variant: "gotcha",
          title: "Blocking Calls Kill Async Performance",
          text: "If you call any blocking function inside an async function — <code>time.sleep()</code>, <code>requests.get()</code>, reading a large file with standard <code>open()</code>, running a CPU-heavy loop — you freeze the entire event loop. All other requests wait. One bad route can stall your entire server."
        },
        {
          type: "code",
          lang: "python",
          filename: "blocking_vs_async.py",
          code: `import asyncio
import time
import httpx  # async HTTP client

# ── BAD: blocks the event loop ───────────────────────────────────────────
async def bad_route():
    import requests
    # This blocks the entire event loop for the duration of the HTTP call!
    resp = requests.get("https://api.example.com/data")
    return resp.json()

async def also_bad():
    time.sleep(5)  # freezes everything — never do this

# ── GOOD: async-compatible alternatives ──────────────────────────────────
async def good_route():
    async with httpx.AsyncClient() as client:
        resp = await client.get("https://api.example.com/data")
    return resp.json()

async def good_sleep():
    await asyncio.sleep(5)  # yields to event loop while waiting

# ── For unavoidable blocking calls (CPU work, sync libraries) ─────────────
async def cpu_intensive():
    loop = asyncio.get_event_loop()
    # run_in_executor offloads blocking work to a thread pool
    result = await loop.run_in_executor(None, heavy_computation)
    return result

def heavy_computation():
    # This runs in a separate thread, not blocking the event loop
    import hashlib
    return hashlib.sha256(b"x" * 10_000_000).hexdigest()`,
          notes: [
            "Use httpx (not requests) for async HTTP calls",
            "Use asyncpg or SQLAlchemy async for database calls",
            "Use aiofiles for file I/O",
            "For CPU-heavy work: run_in_executor() for thread pool, or ProcessPoolExecutor for true parallelism",
            "If you must use a sync library, wrap it in run_in_executor",
          ]
        },
        {
          type: "heading",
          text: "async def vs def in FastAPI",
          level: 2
        },
        {
          type: "text",
          text: "FastAPI supports both <code>async def</code> and regular <code>def</code> route handlers. The choice matters:"
        },
        {
          type: "comparison",
          headers: ["", "async def route", "def route"],
          rows: [
            ["Use when", "Your route does async I/O (DB, HTTP, cache)", "You call sync libraries you can't make async"],
            ["How FastAPI runs it", "Directly in the event loop", "In a thread pool (runs_in_executor)"],
            ["Performance", "Best for I/O-bound work", "Fine — FastAPI handles thread offload"],
            ["Gotcha", "Never block inside! Use async libs.", "Threads have overhead; don't use for async I/O"],
          ]
        },
        {
          type: "callout",
          variant: "tip",
          title: "When in Doubt, Use async def",
          text: "For most FastAPI routes hitting databases, caches, or external APIs, use <code>async def</code> with async-compatible libraries (asyncpg, httpx, motor). If you're using a sync ORM like psycopg2 directly, use <code>def</code> and FastAPI will offload it to a thread automatically."
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "fastapi-fundamentals",
      title: "FastAPI Fundamentals: Routes, Params & Responses",
      readTime: "14 min",
      content: [
        {
          type: "text",
          text: "FastAPI is a modern Python web framework built on <strong>Starlette</strong> (the ASGI layer) and <strong>Pydantic</strong> (data validation). It auto-generates OpenAPI docs, validates request data, and handles serialization — all with near-zero boilerplate. It's the dominant API framework in AI/ML backends."
        },
        {
          type: "callout",
          variant: "info",
          title: "Why FastAPI Dominates AI Backends",
          text: "FastAPI gives you automatic /docs (Swagger UI) and /redoc out of the box — no extra code. Type hints become your API contract. Pydantic validates input automatically. And it's async-native, critical for wrapping ML model inference without blocking. OpenAI, HuggingFace, and most AI API wrappers are built on FastAPI."
        },
        {
          type: "heading",
          text: "Your First FastAPI Application",
          level: 2
        },
        {
          type: "code",
          lang: "python",
          filename: "main.py",
          code: `from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(
    title="My AI API",
    description="Production-grade inference API",
    version="1.0.0",
)

# ── Path operations (routes) ─────────────────────────────────────────────

@app.get("/")
async def root():
    return {"message": "API is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.0"}

# ── Path parameters ───────────────────────────────────────────────────────

@app.get("/users/{user_id}")
async def get_user(user_id: int):   # type hint auto-validates and converts
    return {"user_id": user_id, "name": "Alice"}

# ── Query parameters ──────────────────────────────────────────────────────

@app.get("/items")
async def list_items(
    skip: int = 0,          # ?skip=0
    limit: int = 10,        # ?limit=10
    search: str | None = None,  # ?search=foo  (optional)
):
    return {"skip": skip, "limit": limit, "search": search}

# Run: uvicorn main:app --reload
# Visit: http://localhost:8000/docs`,
          notes: [
            "FastAPI is an instance of the FastAPI class — title/description/version appear in /docs",
            "@app.get(), @app.post(), @app.put(), @app.delete() — decorators define routes",
            "Path parameters are declared in the path string {user_id} and the function signature",
            "Type hints are not optional — they drive validation, docs, and editor completion",
            "Query params with defaults are optional; without defaults they're required",
          ]
        },
        {
          type: "heading",
          text: "Request Bodies with Pydantic",
          level: 2
        },
        {
          type: "code",
          lang: "python",
          filename: "request_bodies.py",
          code: `from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, Field

app = FastAPI()

class CreateUserRequest(BaseModel):
    username: str
    email: str
    age: int = Field(ge=18, le=120, description="Must be an adult")

class UserResponse(BaseModel):
    id: int
    username: str
    email: str

@app.post(
    "/users",
    response_model=UserResponse,         # controls what gets returned
    status_code=status.HTTP_201_CREATED, # default 200, explicitly 201 for create
)
async def create_user(body: CreateUserRequest):
    # FastAPI automatically:
    # 1. Parses JSON body
    # 2. Validates all fields
    # 3. Returns 422 with details if validation fails
    # 4. Filters response through UserResponse model

    # Simulate creating user in DB
    user = {"id": 1, "username": body.username, "email": body.email}
    return user

@app.get("/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: int):
    if user_id != 1:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User {user_id} not found",
        )
    return {"id": 1, "username": "alice", "email": "alice@example.com"}`,
          notes: [
            "response_model filters the return value — extra fields are removed, missing required fields raise an error",
            "HTTPException is the FastAPI way to return error responses with correct status codes",
            "status.HTTP_404_NOT_FOUND is a constant — use these instead of magic numbers",
            "FastAPI returns 422 Unprocessable Entity automatically when validation fails, with field-level error details",
          ]
        },
        {
          type: "heading",
          text: "Path, Query, Header, Cookie — and Body Fields Together",
          level: 2
        },
        {
          type: "code",
          lang: "python",
          filename: "param_types.py",
          code: `from fastapi import FastAPI, Path, Query, Header, Cookie, Body
from typing import Annotated

app = FastAPI()

@app.get("/items/{item_id}")
async def get_item(
    # Path param with validation
    item_id: Annotated[int, Path(ge=1, description="Item ID, must be positive")],

    # Query param with validation
    verbose: Annotated[bool, Query(description="Include extra details")] = False,

    # Header param (FastAPI auto-converts hyphens to underscores)
    x_api_key: Annotated[str | None, Header()] = None,

    # Cookie
    session_id: Annotated[str | None, Cookie()] = None,
):
    return {
        "item_id": item_id,
        "verbose": verbose,
        "has_api_key": x_api_key is not None,
        "session": session_id,
    }

@app.put("/items/{item_id}")
async def update_item(
    item_id: int,
    # Body with explicit embedding
    name: Annotated[str, Body(embed=True)],
    price: Annotated[float, Body(embed=True, ge=0)],
):
    return {"item_id": item_id, "name": name, "price": price}`,
          notes: [
            "Annotated[type, Metadata(...)] is the modern way to add constraints (Python 3.9+)",
            "Header() auto-converts X-API-Key header to x_api_key parameter name",
            "Body(embed=True) wraps the single field in a JSON object: {\"name\": \"foo\"} instead of just \"foo\"",
            "For multiple body params, FastAPI automatically embeds them: {\"name\": ..., \"price\": ...}",
          ]
        },
        {
          type: "heading",
          text: "Structured Error Handling",
          level: 2
        },
        {
          type: "code",
          lang: "python",
          filename: "error_handling.py",
          code: `from fastapi import FastAPI, HTTPException, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

app = FastAPI()

# ── Custom exception class ────────────────────────────────────────────────
class AppError(Exception):
    def __init__(self, message: str, code: str, status_code: int = 400):
        self.message = message
        self.code = code
        self.status_code = status_code

# ── Register a handler for your custom exception ──────────────────────────
@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.code,
            "message": exc.message,
            "path": str(request.url),
        },
    )

# ── Override the default 422 validation error format ──────────────────────
@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "VALIDATION_ERROR",
            "message": "Request validation failed",
            "details": exc.errors(),
        },
    )

@app.get("/users/{user_id}")
async def get_user(user_id: int):
    if user_id > 1000:
        raise AppError(
            message="User not found",
            code="USER_NOT_FOUND",
            status_code=404,
        )
    return {"id": user_id}`,
          notes: [
            "exception_handler decorators catch specific exception types across the entire app",
            "RequestValidationError is raised by Pydantic validation failures — override it for consistent error format",
            "Always return structured JSON errors — never raw strings in production",
            "Include a machine-readable 'error code' string alongside the human message",
          ]
        },
        {
          type: "heading",
          text: "API Versioning",
          level: 2
        },
        {
          type: "code",
          lang: "python",
          filename: "versioning.py",
          code: `from fastapi import FastAPI
from fastapi.routing import APIRouter

# ── Approach 1: URL prefix versioning (most common) ───────────────────────
app = FastAPI()

v1_router = APIRouter(prefix="/v1", tags=["v1"])
v2_router = APIRouter(prefix="/v2", tags=["v2"])

@v1_router.get("/users/{user_id}")
async def get_user_v1(user_id: int):
    return {"id": user_id, "name": "Alice"}   # v1 format

@v2_router.get("/users/{user_id}")
async def get_user_v2(user_id: int):
    return {                                    # v2 adds more fields
        "id": user_id,
        "name": "Alice",
        "created_at": "2024-01-01T00:00:00Z",
    }

app.include_router(v1_router)
app.include_router(v2_router)

# ── Approach 2: Separate apps mounted at path ─────────────────────────────
from fastapi import FastAPI

v1_app = FastAPI(title="API v1")
v2_app = FastAPI(title="API v2")

root_app = FastAPI()
root_app.mount("/v1", v1_app)
root_app.mount("/v2", v2_app)`,
          notes: [
            "URL versioning (/v1/, /v2/) is the most common and explicit approach",
            "APIRouter groups related routes — use it to split your codebase by feature, not just version",
            "include_router() attaches a router to the app — you can add prefix/tags at include time",
            "Never remove v1 without deprecation warnings and a migration guide",
          ]
        },
        {
          type: "callout",
          variant: "tip",
          title: "OpenAPI Docs Are Automatic",
          text: "Every FastAPI app exposes /docs (Swagger UI) and /redoc automatically. Use the title, description, response_model, and docstrings to make the docs useful. Add <code>summary</code> and <code>description</code> to route decorators. The docs become your API's primary interface for teammates and external consumers."
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "pydantic-models",
      title: "Pydantic Models & Data Validation",
      readTime: "12 min",
      content: [
        {
          type: "text",
          text: "Pydantic is the foundation of FastAPI's type safety. Every request body, response model, and configuration class is a Pydantic model. Pydantic v2 (released 2023) is written in Rust — it's 5-50x faster than v1 and is what modern FastAPI uses by default."
        },
        {
          type: "heading",
          text: "BaseModel: The Core Building Block",
          level: 2
        },
        {
          type: "code",
          lang: "python",
          filename: "pydantic_basics.py",
          code: `from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Annotated
from datetime import datetime
from enum import Enum

class UserRole(str, Enum):
    admin = "admin"
    user = "user"
    viewer = "viewer"

class Address(BaseModel):
    street: str
    city: str
    country: str = "US"   # default value

class CreateUserRequest(BaseModel):
    username: str = Field(
        min_length=3,
        max_length=50,
        pattern=r"^[a-zA-Z0-9_]+$",   # alphanumeric + underscore only
        description="Unique username",
    )
    email: str = Field(description="Primary email address")
    age: int = Field(ge=0, le=150)
    role: UserRole = UserRole.user        # enum with default
    address: Address | None = None       # nested model, optional
    tags: list[str] = []                 # list with default

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    role: UserRole
    created_at: datetime

    # Model config
    model_config = {
        "from_attributes": True,   # allow creating from ORM objects
        "json_schema_extra": {
            "example": {
                "id": 1,
                "username": "alice",
                "email": "alice@example.com",
                "role": "user",
                "created_at": "2024-01-01T00:00:00Z",
            }
        }
    }

# Usage
req = CreateUserRequest(
    username="alice_dev",
    email="alice@example.com",
    age=28,
)
print(req.model_dump())        # dict representation
print(req.model_dump_json())   # JSON string`,
          notes: [
            "Field() adds constraints: ge (>=), le (<=), gt (>), lt (<), min_length, max_length, pattern (regex)",
            "Nested models (Address inside CreateUserRequest) validate recursively",
            "from_attributes=True (formerly orm_mode=True) lets you create models from SQLAlchemy ORM objects",
            "model_dump() replaces dict() in Pydantic v2; model_dump_json() replaces json()",
          ]
        },
        {
          type: "heading",
          text: "Field Validators",
          level: 2
        },
        {
          type: "code",
          lang: "python",
          filename: "validators.py",
          code: `from pydantic import BaseModel, field_validator, model_validator, Field
from typing import Self

class PasswordRequest(BaseModel):
    username: str
    password: str
    password_confirm: str

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain an uppercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain a digit")
        return v

    @model_validator(mode="after")
    def passwords_match(self) -> Self:
        if self.password != self.password_confirm:
            raise ValueError("Passwords do not match")
        return self

class NormalizeEmail(BaseModel):
    email: str

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        # mode="before" runs BEFORE type coercion
        return v.strip().lower()

# ── Computed fields (Pydantic v2) ─────────────────────────────────────────
from pydantic import computed_field

class Rectangle(BaseModel):
    width: float
    height: float

    @computed_field
    @property
    def area(self) -> float:
        return self.width * self.height`,
          notes: [
            "@field_validator runs after type coercion; mode='before' runs before (useful for normalization)",
            "@model_validator(mode='after') has access to all validated fields — use for cross-field validation",
            "Always raise ValueError inside validators — Pydantic wraps it in a ValidationError",
            "@computed_field adds read-only properties that appear in model_dump() and JSON output",
          ]
        },
        {
          type: "heading",
          text: "Request vs Response Models — A Critical Pattern",
          level: 2
        },
        {
          type: "text",
          text: "Always define separate models for input (what clients send) and output (what you return). This prevents accidental exposure of sensitive fields and gives you control over what gets validated in each direction."
        },
        {
          type: "code",
          lang: "python",
          filename: "request_response_models.py",
          code: `from pydantic import BaseModel, Field, SecretStr
from datetime import datetime

# ── Input model: what clients POST ───────────────────────────────────────
class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: str
    password: str = Field(min_length=8)   # we'll hash this, never store raw

# ── Update model: what clients PATCH (all fields optional) ────────────────
class UserUpdate(BaseModel):
    username: str | None = None
    email: str | None = None

# ── Response model: what we return (NO password, ever) ───────────────────
class UserPublic(BaseModel):
    id: int
    username: str
    email: str
    created_at: datetime
    is_active: bool

    model_config = {"from_attributes": True}

# ── Admin response model: extends public with extra fields ────────────────
class UserAdmin(UserPublic):
    role: str
    last_login: datetime | None

# In your route:
from fastapi import FastAPI
app = FastAPI()

@app.post("/users", response_model=UserPublic)  # never expose password
async def create_user(body: UserCreate):
    hashed = hash_password(body.password)  # hash before storing
    # ... save to DB ...
    db_user = {"id": 1, "username": body.username,
               "email": body.email, "created_at": datetime.now(),
               "is_active": True}
    return db_user  # FastAPI filters through UserPublic automatically`,
          notes: [
            "Separate Create / Update / Public response models is a professional pattern — not optional",
            "Never include passwords or secrets in response models",
            "Update models use Optional fields to support partial updates (PATCH semantics)",
            "Inheritance works: UserAdmin extends UserPublic — DRY without sacrificing clarity",
          ]
        },
        {
          type: "heading",
          text: "Settings with Pydantic BaseSettings",
          level: 2
        },
        {
          type: "code",
          lang: "python",
          filename: "config.py",
          code: `from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache

class Settings(BaseSettings):
    # App settings
    app_name: str = "My API"
    debug: bool = False
    api_version: str = "v1"

    # Database
    database_url: str                  # required — must be in env
    db_pool_size: int = 10
    db_max_overflow: int = 20

    # Redis
    redis_url: str = "redis://localhost:6379"

    # JWT
    secret_key: str                    # required
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    # External APIs
    openai_api_key: str | None = None

    model_config = SettingsConfigDict(
        env_file=".env",               # load from .env file
        env_file_encoding="utf-8",
        case_sensitive=False,          # DATABASE_URL == database_url
    )

@lru_cache()
def get_settings() -> Settings:
    return Settings()

# Usage in routes via dependency injection:
from fastapi import Depends

def get_db_url(settings: Settings = Depends(get_settings)):
    return settings.database_url`,
          notes: [
            "pydantic-settings (pip install pydantic-settings) handles env var loading with validation",
            "Variables without defaults are required — app fails to start if they're missing (fail-fast)",
            "@lru_cache ensures Settings is parsed once, not on every request",
            "Use Depends(get_settings) in routes to inject settings — enables testing with override",
          ]
        },
        {
          type: "callout",
          variant: "gotcha",
          title: "Pydantic v1 vs v2 Differences",
          text: "If you read older FastAPI tutorials, they use Pydantic v1 syntax: <code>class Config</code> inner class, <code>.dict()</code>, <code>@validator</code>, <code>orm_mode = True</code>. In Pydantic v2 (what you should use): <code>model_config = {...}</code>, <code>.model_dump()</code>, <code>@field_validator</code>, <code>from_attributes = True</code>. FastAPI 0.100+ ships with Pydantic v2."
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "dependency-injection",
      title: "Dependency Injection in FastAPI",
      readTime: "12 min",
      content: [
        {
          type: "text",
          text: "Dependency injection (DI) is FastAPI's most powerful feature. Instead of hardcoding database connections, authentication checks, or configuration into each route, you declare <em>what you need</em> and FastAPI provides it. This makes routes testable, readable, and composable."
        },
        {
          type: "callout",
          variant: "info",
          title: "What Depends() Does",
          text: "Depends(some_function) tells FastAPI: before running this route, call some_function, and inject the result as this parameter. The function can be async or sync, can itself have dependencies (sub-dependencies), and FastAPI resolves the entire dependency graph before calling your route."
        },
        {
          type: "heading",
          text: "Your First Dependency",
          level: 2
        },
        {
          type: "code",
          lang: "python",
          filename: "basic_deps.py",
          code: `from fastapi import FastAPI, Depends, HTTPException, status
from typing import Annotated

app = FastAPI()

# ── Simple function dependency ────────────────────────────────────────────
async def get_pagination(skip: int = 0, limit: int = 10) -> dict:
    if limit > 100:
        raise HTTPException(status_code=400, detail="Limit cannot exceed 100")
    return {"skip": skip, "limit": limit}

# Type alias for cleaner code
Pagination = Annotated[dict, Depends(get_pagination)]

@app.get("/items")
async def list_items(pagination: Pagination):
    # pagination = {"skip": 0, "limit": 10}
    return {"items": [], **pagination}

@app.get("/users")
async def list_users(pagination: Pagination):
    # Reuse the same dependency — DRY
    return {"users": [], **pagination}

# ── Class-based dependency ────────────────────────────────────────────────
class CommonParams:
    def __init__(self, skip: int = 0, limit: int = 10, sort_by: str = "id"):
        self.skip = skip
        self.limit = limit
        self.sort_by = sort_by

CommonDeps = Annotated[CommonParams, Depends(CommonParams)]

@app.get("/products")
async def list_products(commons: CommonDeps):
    return {
        "skip": commons.skip,
        "limit": commons.limit,
        "sort_by": commons.sort_by,
    }`,
          notes: [
            "Depends() takes any callable — function, async function, or class",
            "The callable's parameters are themselves resolved from the request (query params, etc.)",
            "Annotated[type, Depends(fn)] is the modern syntax — keeps type hints clean",
            "Class-based dependencies let you group related parameters with methods",
          ]
        },
        {
          type: "heading",
          text: "Database Session Dependency",
          level: 2
        },
        {
          type: "text",
          text: "The most common use of dependency injection is providing a database session scoped to a request. The session opens when the request starts, is yielded to your route, and closes (with commit or rollback) when the request ends."
        },
        {
          type: "code",
          lang: "python",
          filename: "db_dependency.py",
          code: `from fastapi import FastAPI, Depends
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from typing import AsyncGenerator, Annotated
import os

# ── Engine setup (done once at startup) ──────────────────────────────────
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://user:pass@localhost/db")

engine = create_async_engine(DATABASE_URL, pool_size=10, max_overflow=20)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

# ── Database session dependency ───────────────────────────────────────────
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session          # request handler runs here
            await session.commit() # auto-commit on success
        except Exception:
            await session.rollback()  # rollback on any exception
            raise

DB = Annotated[AsyncSession, Depends(get_db)]

# ── Using the dependency in routes ────────────────────────────────────────
app = FastAPI()

@app.get("/users/{user_id}")
async def get_user(user_id: int, db: DB):
    from sqlalchemy import select
    # db is a real AsyncSession, scoped to this request
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@app.post("/users")
async def create_user(body: UserCreate, db: DB):
    user = User(**body.model_dump())
    db.add(user)
    # commit happens automatically in get_db() after yield
    return user`,
          notes: [
            "Generator dependencies (with yield) act like context managers — setup before yield, teardown after",
            "The try/except ensures rollback on error AND clean session close in all cases",
            "Engine is created once (module level), not per-request — connection pooling is critical",
            "async_sessionmaker with expire_on_commit=False avoids lazy-load errors after commit",
          ]
        },
        {
          type: "heading",
          text: "Sub-Dependencies and Dependency Chains",
          level: 2
        },
        {
          type: "code",
          lang: "python",
          filename: "dependency_chains.py",
          code: `from fastapi import FastAPI, Depends, HTTPException, Header
from typing import Annotated

app = FastAPI()

# ── Level 1: Get the raw token from the Authorization header ──────────────
async def get_token(authorization: str | None = Header(None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    return authorization.removeprefix("Bearer ")

# ── Level 2: Decode the token to get the user ID ─────────────────────────
async def get_current_user_id(token: str = Depends(get_token)) -> int:
    # In real code: decode JWT, verify signature, extract sub claim
    if token == "valid-token-123":
        return 42
    raise HTTPException(status_code=401, detail="Invalid token")

# ── Level 3: Load the full user from DB ──────────────────────────────────
async def get_current_user(
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> User:
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# ── Level 4: Require admin role ───────────────────────────────────────────
async def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

CurrentUser = Annotated[User, Depends(get_current_user)]
AdminUser = Annotated[User, Depends(require_admin)]

# ── Routes use the appropriate dependency level ────────────────────────────
@app.get("/profile")
async def get_profile(user: CurrentUser):
    return user          # any authenticated user

@app.delete("/users/{user_id}")
async def delete_user(user_id: int, admin: AdminUser):
    return {"deleted": user_id}  # admins only`,
          notes: [
            "FastAPI resolves the entire dependency graph — get_token → get_current_user_id → get_current_user",
            "Dependencies are cached per request — get_db() is only called once even if multiple deps use it",
            "This layered pattern keeps each function single-purpose and testable in isolation",
            "Override dependencies in tests: app.dependency_overrides[get_db] = lambda: mock_db",
          ]
        },
        {
          type: "heading",
          text: "Router-Level Dependencies",
          level: 2
        },
        {
          type: "code",
          lang: "python",
          filename: "router_deps.py",
          code: `from fastapi import APIRouter, Depends

# Apply dependency to ALL routes in this router
# — every route requires authentication
protected_router = APIRouter(
    prefix="/api/v1",
    dependencies=[Depends(get_current_user)],  # applied to ALL routes
)

@protected_router.get("/profile")
async def profile():
    return {"message": "authenticated"}   # no need to declare user param

@protected_router.get("/settings")
async def settings():
    return {"message": "also authenticated"}

# ── Or apply to specific routes ────────────────────────────────────────────
@app.get(
    "/admin/report",
    dependencies=[Depends(require_admin)],   # run the dep but don't inject it
)
async def admin_report():
    return {"report": "data"}`,
          notes: [
            "Router-level dependencies apply to all routes in that router — no need to repeat Depends() on every route",
            "dependencies=[...] on a route runs the dependency for its side effects (auth check) without injecting the value",
            "Combine both: router-level auth + route-level for additional per-route requirements",
          ]
        },
        {
          type: "callout",
          variant: "tip",
          title: "Dependency Overrides Make Testing Trivial",
          text: "The killer feature of FastAPI's DI is testing. Instead of mocking the database at the driver level, you simply replace get_db with a function that returns a test transaction: <code>app.dependency_overrides[get_db] = override_db</code>. Your entire auth stack can be bypassed for testing by overriding get_current_user. Clean, explicit, no magic."
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "middleware-cors",
      title: "Middleware, CORS & Request Logging",
      readTime: "10 min",
      content: [
        {
          type: "text",
          text: "Middleware in FastAPI is code that runs on every request before it reaches your route, and on every response before it leaves. It's the right place for cross-cutting concerns: CORS headers, request IDs, logging, timing, rate limiting, and error catching."
        },
        {
          type: "heading",
          text: "How Middleware Works",
          level: 2
        },
        {
          type: "diagram",
          code: `  REQUEST FLOW

  Client
    │
    ▼
  ┌─────────────────────────┐
  │  Middleware 1 (CORS)    │  ← adds CORS headers to response
  │  ┌─────────────────────┐│
  │  │ Middleware 2 (Logging)││ ← logs request, measures time
  │  │ ┌───────────────────┐││
  │  │ │ Middleware 3 (Auth)│││ ← checks token header
  │  │ │ ┌─────────────────┐│││
  │  │ │ │  Route Handler  ││││ ← your business logic
  │  │ │ └─────────────────┘│││
  │  │ └───────────────────┘││
  │  └─────────────────────┘│
  └─────────────────────────┘
    │
    ▼
  Client Response

  Middleware executes like nested functions:
  outer.before → inner.before → route → inner.after → outer.after`
        },
        {
          type: "heading",
          text: "Writing Custom Middleware",
          level: 2
        },
        {
          type: "code",
          lang: "python",
          filename: "middleware.py",
          code: `import time
import uuid
import logging
from fastapi import FastAPI, Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

app = FastAPI()
logger = logging.getLogger("api")

# ── Request ID + Timing middleware ────────────────────────────────────────
class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        # Before: generate request ID, start timer
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        start_time = time.perf_counter()

        # Call the next middleware or route
        response = await call_next(request)

        # After: measure duration, log, add header
        duration_ms = (time.perf_counter() - start_time) * 1000
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Response-Time"] = f"{duration_ms:.2f}ms"

        logger.info(
            "request",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status": response.status_code,
                "duration_ms": round(duration_ms, 2),
            }
        )
        return response

app.add_middleware(RequestContextMiddleware)

# ── Simpler: @app.middleware decorator ────────────────────────────────────
@app.middleware("http")
async def add_security_headers(request: Request, call_next) -> Response:
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response`,
          notes: [
            "BaseHTTPMiddleware is the class-based approach — useful for complex middleware with state",
            "@app.middleware('http') is the function-based approach — simpler for stateless middleware",
            "call_next(request) runs all subsequent middleware and the route handler",
            "request.state is a dict-like namespace for passing data through middleware to route handlers",
            "Add middleware in reverse order of desired execution — last added runs first",
          ]
        },
        {
          type: "heading",
          text: "CORS Configuration",
          level: 2
        },
        {
          type: "code",
          lang: "python",
          filename: "cors.py",
          code: `from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI()

# ── Development: allow all ────────────────────────────────────────────────
if os.getenv("ENV") == "development":
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    # ── Production: explicit origins only ────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "https://app.mycompany.com",
            "https://admin.mycompany.com",
        ],
        allow_credentials=True,         # allow cookies
        allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
        allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
        expose_headers=["X-Request-ID", "X-Response-Time"],
        max_age=3600,                   # how long browsers cache preflight
    )`,
          notes: [
            "CORS must be added FIRST — before other middleware — because it runs last (LIFO order)",
            "allow_origins=[\"*\"] with allow_credentials=True is a CORS spec violation — browsers reject it",
            "expose_headers makes custom response headers accessible to browser JavaScript",
            "max_age reduces preflight requests — browsers cache the CORS check for that duration",
          ]
        },
        {
          type: "heading",
          text: "Rate Limiting with SlowAPI",
          level: 2
        },
        {
          type: "code",
          lang: "python",
          filename: "rate_limiting.py",
          code: `# pip install slowapi
from fastapi import FastAPI, Request
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

# Rate limit by IP address
limiter = Limiter(key_func=get_remote_address)

app = FastAPI()
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

@app.get("/public")
@limiter.limit("100/minute")
async def public_endpoint(request: Request):
    return {"data": "public"}

@app.post("/inference")
@limiter.limit("10/minute")   # expensive endpoint — tighter limit
async def inference_endpoint(request: Request):
    return {"result": "..."}

# ── Custom key function: limit by API key instead of IP ───────────────────
def get_api_key(request: Request) -> str:
    return request.headers.get("X-API-Key", get_remote_address(request))

api_limiter = Limiter(key_func=get_api_key, default_limits=["1000/day"])`,
          notes: [
            "SlowAPI is a simple, Redis-backed rate limiter built on limits library",
            "For production, configure Redis backend: Limiter(key_func=..., storage_uri='redis://...')",
            "Limit by API key for tiered access control (free vs paid plans)",
            "The RateLimitExceeded handler returns 429 Too Many Requests automatically",
          ]
        },
        {
          type: "callout",
          variant: "tip",
          title: "Structured Logging is Non-Negotiable in Production",
          text: "Use JSON logging so your logs are queryable in tools like Datadog, CloudWatch, or ELK. Configure Python's logging module with a JSON formatter (python-json-logger library). Include request_id in every log line — it's the key to tracing a single request through distributed logs. Add request_id to your logger in middleware via logging.setLogRecordFactory or a ContextVar."
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "background-tasks-lifespan",
      title: "Background Tasks & Lifespan Events",
      readTime: "10 min",
      content: [
        {
          type: "text",
          text: "Some work shouldn't block the HTTP response: sending emails, processing uploads, updating analytics. FastAPI provides <strong>BackgroundTasks</strong> for simple fire-and-forget jobs and the <strong>lifespan</strong> context manager for startup/shutdown logic (connecting to databases, loading ML models, etc.)."
        },
        {
          type: "heading",
          text: "BackgroundTasks: Post-Response Work",
          level: 2
        },
        {
          type: "code",
          lang: "python",
          filename: "background_tasks.py",
          code: `from fastapi import FastAPI, BackgroundTasks
import asyncio
import smtplib
import logging

app = FastAPI()
logger = logging.getLogger("api")

# ── The background function ────────────────────────────────────────────────
async def send_welcome_email(user_email: str, username: str):
    """Runs AFTER the HTTP response is sent."""
    try:
        # Simulate slow email delivery
        await asyncio.sleep(2)
        logger.info(f"Email sent to {user_email}")
    except Exception as e:
        logger.error(f"Failed to send email to {user_email}: {e}")
        # Don't let background task failure affect the response

async def update_analytics(user_id: int, action: str):
    await asyncio.sleep(0.1)  # batch analytics update
    logger.info(f"Analytics: user {user_id} performed {action}")

# ── Route using BackgroundTasks ───────────────────────────────────────────
@app.post("/register")
async def register_user(
    body: UserCreate,
    background_tasks: BackgroundTasks,
):
    # 1. Save user to DB (synchronous from client's perspective)
    user = await create_user_in_db(body)

    # 2. Schedule background work — runs AFTER response is returned
    background_tasks.add_task(send_welcome_email, user.email, user.username)
    background_tasks.add_task(update_analytics, user.id, "register")

    # 3. Return immediately — client doesn't wait for email
    return {"id": user.id, "message": "Registration successful"}`,
          notes: [
            "BackgroundTasks run AFTER the response is sent — client doesn't wait",
            "add_task(func, *args, **kwargs) — positional and keyword args passed to the function",
            "Background tasks run in the same process — they don't survive server crashes",
            "For reliability (guaranteed delivery, retries, persistence): use Celery + Redis/RabbitMQ instead",
            "Always catch exceptions in background tasks — unhandled exceptions are silently swallowed",
          ]
        },
        {
          type: "heading",
          text: "When to Use BackgroundTasks vs Celery",
          level: 2
        },
        {
          type: "comparison",
          headers: ["", "BackgroundTasks", "Celery + Redis"],
          rows: [
            ["Use case", "Fast, non-critical post-response work", "Reliable, retryable, long-running jobs"],
            ["Persistence", "Lost if server crashes", "Persisted in broker queue"],
            ["Retry on failure", "No", "Yes (configurable retry policy)"],
            ["Monitoring", "None built-in", "Flower dashboard, task state"],
            ["Scalability", "Tied to web server", "Independent worker pool"],
            ["Setup complexity", "Zero (built into FastAPI)", "Redis/RabbitMQ + Celery workers"],
            ["Good for", "Welcome emails, cache invalidation", "PDF generation, ML batch jobs"],
          ]
        },
        {
          type: "heading",
          text: "Lifespan: Startup & Shutdown",
          level: 2
        },
        {
          type: "text",
          text: "The <strong>lifespan</strong> context manager (FastAPI 0.93+) replaces the old <code>@app.on_event(\"startup\")</code> pattern. Use it to initialize shared resources once at startup and clean them up at shutdown."
        },
        {
          type: "code",
          lang: "python",
          filename: "lifespan.py",
          code: `from fastapi import FastAPI
from contextlib import asynccontextmanager
import httpx
import torch

# ── Shared resources (module-level, initialized in lifespan) ──────────────
http_client: httpx.AsyncClient | None = None
ml_model = None
db_pool = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Code BEFORE yield: startup logic
    Code AFTER yield: shutdown logic
    """
    global http_client, ml_model, db_pool

    # ── STARTUP ──────────────────────────────────────────────────────────
    print("Starting up...")

    # 1. Create a shared HTTP client (connection pooling)
    http_client = httpx.AsyncClient(timeout=30.0, limits=httpx.Limits(
        max_connections=100,
        max_keepalive_connections=20,
    ))

    # 2. Load ML model into memory (expensive — do once)
    print("Loading ML model...")
    ml_model = torch.load("model.pt")
    ml_model.eval()
    print("ML model loaded.")

    # 3. Initialize DB connection pool
    db_pool = await create_db_pool()

    # ── Hand control to the application ──────────────────────────────────
    yield   # application runs here

    # ── SHUTDOWN ──────────────────────────────────────────────────────────
    print("Shutting down...")
    await http_client.aclose()
    await db_pool.close()
    print("Cleanup complete.")

app = FastAPI(lifespan=lifespan)

# Access the shared client/model in routes
@app.post("/inference")
async def inference(body: InferenceRequest):
    # ml_model is already loaded — no cold start per request
    with torch.no_grad():
        output = ml_model(body.input_tensor)
    return {"result": output.tolist()}

@app.get("/external-data")
async def fetch_external(url: str):
    # Reuse the shared HTTP client — benefits from connection pooling
    resp = await http_client.get(url)
    return resp.json()`,
          notes: [
            "lifespan replaces @app.on_event('startup') and @app.on_event('shutdown') — use lifespan exclusively",
            "Resources created before yield are available for the entire application lifetime",
            "Loading an ML model in lifespan means it's in memory for all requests — not reloaded per request",
            "Always clean up resources after yield — the shutdown block runs even if the startup raises an exception after yield",
            "State can be stored in app.state: app.state.db_pool = db_pool — then accessed via request.app.state",
          ]
        },
        {
          type: "code",
          lang: "python",
          filename: "app_state.py",
          code: `from fastapi import FastAPI, Request, Depends
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Store in app.state for access via request
    app.state.db_pool = await create_db_pool()
    app.state.http_client = httpx.AsyncClient()
    yield
    await app.state.db_pool.close()
    await app.state.http_client.aclose()

app = FastAPI(lifespan=lifespan)

# Access via request.app.state in routes
@app.get("/items")
async def list_items(request: Request):
    pool = request.app.state.db_pool
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT * FROM items")
    return rows

# Or create a dependency
async def get_pool(request: Request):
    return request.app.state.db_pool`,
          notes: [
            "app.state is an attribute store — use it to share initialized resources across routes without globals",
            "Access via request.app.state inside route handlers or middleware",
            "Wrap it in a dependency (get_pool) for testability — override in tests with a mock pool",
          ]
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "jwt-authentication",
      title: "JWT Authentication with OAuth2",
      readTime: "14 min",
      content: [
        {
          type: "text",
          text: "JWT (JSON Web Token) authentication is the standard approach for stateless APIs. The client presents a token on every request. The server verifies the token cryptographically — no database lookup required. FastAPI has first-class support for the OAuth2 Bearer token pattern."
        },
        {
          type: "heading",
          text: "How JWT Authentication Works",
          level: 2
        },
        {
          type: "diagram",
          code: `  JWT AUTHENTICATION FLOW

  CLIENT                           SERVER
    │                                │
    │  POST /auth/login               │
    │  { username, password }  ──────►│
    │                                │  1. Verify credentials vs DB
    │                                │  2. Create JWT token:
    │                                │     header.payload.signature
    │◄──────────────────────────── ──│  3. Return {access_token, expires_in}
    │  { access_token: "eyJ..." }    │
    │                                │
    │  GET /users/me                  │
    │  Authorization: Bearer eyJ... ─►│
    │                                │  4. Verify signature (no DB hit!)
    │                                │  5. Decode payload → user_id, role
    │◄────────────────────────────── │  6. Return user data
    │  { id: 1, name: "Alice" }      │

  JWT Structure (base64url encoded):
  eyJhbGciOiJIUzI1NiJ9  .  eyJzdWIiOiIxIiwiZXhwIjoxNzA...  .  SflKxw...
       HEADER                        PAYLOAD                      SIGNATURE
  {"alg":"HS256"}        {"sub":"1","exp":1234,"role":"user"}  HMAC-SHA256`
        },
        {
          type: "heading",
          text: "Complete JWT Implementation",
          level: 2
        },
        {
          type: "code",
          lang: "python",
          filename: "auth.py",
          code: `# pip install python-jose[cryptography] passlib[bcrypt]
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel

# ── Config ────────────────────────────────────────────────────────────────
SECRET_KEY = "your-super-secret-key-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

# ── Password hashing ──────────────────────────────────────────────────────
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

# ── OAuth2 scheme (tells FastAPI where to look for the token) ─────────────
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# ── Pydantic models ────────────────────────────────────────────────────────
class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int

class TokenData(BaseModel):
    user_id: int
    role: str

# ── Token creation ────────────────────────────────────────────────────────
def create_access_token(user_id: int, role: str) -> str:
    payload = {
        "sub": str(user_id),
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        "iat": datetime.now(timezone.utc),
        "type": "access",
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def create_refresh_token(user_id: int) -> str:
    payload = {
        "sub": str(user_id),
        "exp": datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
        "type": "refresh",
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

# ── Token verification ────────────────────────────────────────────────────
def decode_token(token: str, expected_type: str = "access") -> TokenData:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != expected_type:
            raise credentials_exception
        user_id = int(payload["sub"])
        role = payload.get("role", "user")
        return TokenData(user_id=user_id, role=role)
    except JWTError:
        raise credentials_exception

# ── Dependencies ──────────────────────────────────────────────────────────
async def get_current_user(token: str = Depends(oauth2_scheme)) -> TokenData:
    return decode_token(token)

async def require_admin(token_data: TokenData = Depends(get_current_user)) -> TokenData:
    if token_data.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return token_data

# ── Auth router ───────────────────────────────────────────────────────────
router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/login", response_model=TokenResponse)
async def login(
    form: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    user = await get_user_by_username(db, form.username)
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )
    return TokenResponse(
        access_token=create_access_token(user.id, user.role),
        refresh_token=create_refresh_token(user.id),
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )

@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    refresh_token_str: str,
    db: AsyncSession = Depends(get_db),
):
    token_data = decode_token(refresh_token_str, expected_type="refresh")
    user = await db.get(User, token_data.user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return TokenResponse(
        access_token=create_access_token(user.id, user.role),
        refresh_token=create_refresh_token(user.id),
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )`,
          notes: [
            "python-jose handles JWT encoding/decoding; passlib handles bcrypt password hashing",
            "Always include 'exp' (expiry) in tokens — never issue non-expiring tokens",
            "Separate access tokens (short-lived: 30 min) from refresh tokens (long-lived: 7 days)",
            "OAuth2PasswordRequestForm gives you form-body login — compatible with the /docs Authorize button",
            "Store SECRET_KEY in environment variables, never in source code",
          ]
        },
        {
          type: "heading",
          text: "Common JWT Security Mistakes",
          level: 2
        },
        {
          type: "callout",
          variant: "gotcha",
          title: "JWT Security Pitfalls",
          text: "1. <strong>Weak secret key</strong>: Use at least 256 bits of entropy — generate with: <code>openssl rand -hex 32</code>. 2. <strong>No expiry</strong>: Always set 'exp'. 3. <strong>Storing sensitive data in payload</strong>: JWT payload is base64-encoded, NOT encrypted. Don't put passwords, SSNs, or secrets in it. 4. <strong>Not validating algorithm</strong>: Always specify algorithms=[\"HS256\"] in jwt.decode — never accept any algorithm. 5. <strong>Not revoking refresh tokens</strong>: Store refresh tokens in Redis/DB and invalidate on logout."
        },
        {
          type: "heading",
          text: "Protecting Routes",
          level: 2
        },
        {
          type: "code",
          lang: "python",
          filename: "protected_routes.py",
          code: `from fastapi import FastAPI, Depends
from typing import Annotated

app = FastAPI()

CurrentUser = Annotated[TokenData, Depends(get_current_user)]
AdminUser = Annotated[TokenData, Depends(require_admin)]

@app.get("/users/me")
async def get_me(current_user: CurrentUser):
    return {"user_id": current_user.user_id, "role": current_user.role}

@app.get("/admin/users")
async def list_all_users(admin: AdminUser, db: AsyncSession = Depends(get_db)):
    users = await db.execute(select(User))
    return users.scalars().all()

# ── Optional authentication ────────────────────────────────────────────────
from fastapi.security import OAuth2PasswordBearer

optional_oauth2 = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)

async def get_optional_user(token: str | None = Depends(optional_oauth2)):
    if token is None:
        return None
    try:
        return decode_token(token)
    except HTTPException:
        return None

OptionalUser = Annotated[TokenData | None, Depends(get_optional_user)]

@app.get("/feed")
async def get_feed(user: OptionalUser):
    if user:
        return {"feed": "personalized content for user", "user_id": user.user_id}
    return {"feed": "public content"}`,
          notes: [
            "auto_error=False makes the OAuth2 scheme return None instead of 401 when token is missing",
            "Optional auth is useful for endpoints with different behavior for authenticated vs anonymous users",
            "Wrap route groups in APIRouter with dependencies=[Depends(get_current_user)] to protect entire sections",
          ]
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "testing-fastapi",
      title: "Testing FastAPI Applications",
      readTime: "12 min",
      content: [
        {
          type: "text",
          text: "Testing FastAPI apps is straightforward because of dependency injection — you can replace databases, authentication, and external services cleanly. FastAPI's TestClient and httpx's AsyncClient let you write integration tests that exercise the full request/response cycle."
        },
        {
          type: "heading",
          text: "Project Structure for Tests",
          level: 2
        },
        {
          type: "diagram",
          code: `  project/
  ├── app/
  │   ├── main.py           # FastAPI app
  │   ├── routers/
  │   │   ├── users.py
  │   │   └── items.py
  │   ├── models.py         # SQLAlchemy models
  │   ├── schemas.py        # Pydantic models
  │   ├── deps.py           # Shared dependencies
  │   └── database.py       # DB engine + session
  ├── tests/
  │   ├── conftest.py       # Shared fixtures (db, client)
  │   ├── test_users.py
  │   └── test_items.py
  ├── pyproject.toml        # pytest config
  └── .env.test             # Test environment variables`
        },
        {
          type: "heading",
          text: "Setting Up Test Fixtures",
          level: 2
        },
        {
          type: "code",
          lang: "python",
          filename: "tests/conftest.py",
          code: `import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.main import app
from app.database import Base, get_db
from app.deps import get_current_user
from app.schemas import TokenData

# ── Test database (in-memory SQLite) ─────────────────────────────────────
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

@pytest_asyncio.fixture(scope="session")
async def test_engine():
    engine = create_async_engine(TEST_DATABASE_URL)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()

@pytest_asyncio.fixture()
async def db_session(test_engine):
    """Fresh transaction per test — rolls back after each test."""
    async with test_engine.connect() as conn:
        await conn.begin()
        session = AsyncSession(bind=conn)
        try:
            yield session
        finally:
            await session.close()
            await conn.rollback()   # undo everything after test

@pytest_asyncio.fixture()
async def client(db_session):
    """HTTP client with DB override."""
    async def override_db():
        yield db_session

    app.dependency_overrides[get_db] = override_db
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac
    app.dependency_overrides.clear()

@pytest_asyncio.fixture()
async def auth_client(client):
    """Client pre-authenticated as a regular user."""
    fake_user = TokenData(user_id=1, role="user")
    app.dependency_overrides[get_current_user] = lambda: fake_user
    yield client
    app.dependency_overrides.pop(get_current_user, None)

@pytest_asyncio.fixture()
async def admin_client(client):
    """Client pre-authenticated as admin."""
    fake_admin = TokenData(user_id=99, role="admin")
    app.dependency_overrides[get_current_user] = lambda: fake_admin
    yield client
    app.dependency_overrides.pop(get_current_user, None)`,
          notes: [
            "scope='session' for the engine (created once); no scope (default='function') for sessions (per test)",
            "Rolling back after each test means tests are isolated and don't interfere with each other",
            "dependency_overrides replaces the real get_db with the test session — no real DB needed",
            "Override get_current_user with a lambda returning a fake user — no JWT required in tests",
            "ASGITransport(app=app) runs requests in-process without a network socket",
          ]
        },
        {
          type: "heading",
          text: "Writing Tests",
          level: 2
        },
        {
          type: "code",
          lang: "python",
          filename: "tests/test_users.py",
          code: `import pytest
from httpx import AsyncClient
from app.models import User
from app.auth import hash_password

pytestmark = pytest.mark.asyncio

# ── Route tests ───────────────────────────────────────────────────────────
async def test_create_user(client: AsyncClient, db_session):
    response = await client.post("/users", json={
        "username": "testuser",
        "email": "test@example.com",
        "password": "SecurePass123",
    })
    assert response.status_code == 201
    data = response.json()
    assert data["username"] == "testuser"
    assert "password" not in data    # never expose password

async def test_create_user_duplicate_email(client: AsyncClient, db_session):
    # Seed: create user first
    db_session.add(User(username="alice", email="alice@example.com",
                       hashed_password=hash_password("pass")))
    await db_session.flush()

    response = await client.post("/users", json={
        "username": "alice2",
        "email": "alice@example.com",   # duplicate
        "password": "SecurePass123",
    })
    assert response.status_code == 409   # Conflict

async def test_get_own_profile(auth_client: AsyncClient):
    """auth_client is pre-authenticated as user_id=1"""
    response = await auth_client.get("/users/me")
    assert response.status_code == 200

async def test_admin_only_route_forbidden_for_user(auth_client: AsyncClient):
    response = await auth_client.get("/admin/users")
    assert response.status_code == 403

async def test_admin_only_route_allowed_for_admin(admin_client: AsyncClient):
    response = await admin_client.get("/admin/users")
    assert response.status_code == 200

# ── Validation tests ──────────────────────────────────────────────────────
async def test_create_user_invalid_username(client: AsyncClient):
    response = await client.post("/users", json={
        "username": "a",   # too short (min 3)
        "email": "test@example.com",
        "password": "SecurePass123",
    })
    assert response.status_code == 422
    errors = response.json()["details"]
    assert any("username" in str(e) for e in errors)

async def test_unauthenticated_request(client: AsyncClient):
    response = await client.get("/users/me")
    assert response.status_code == 401`,
          notes: [
            "pytestmark = pytest.mark.asyncio marks all tests in the file as async",
            "Test the HTTP contract (status codes, response shape), not internal implementation details",
            "Test the unhappy paths: 401, 403, 404, 409, 422 — these are often untested and broken in prod",
            "Seed data via db_session.add() + db_session.flush() — flush writes to DB without committing",
            "Use specific assertions: assert 'password' not in data catches security regressions",
          ]
        },
        {
          type: "heading",
          text: "Mocking External Services",
          level: 2
        },
        {
          type: "code",
          lang: "python",
          filename: "tests/test_external.py",
          code: `import pytest
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient, Response

pytestmark = pytest.mark.asyncio

# ── Mock an external HTTP call ────────────────────────────────────────────
async def test_webhook_delivery(client: AsyncClient):
    """Test that our service calls the external webhook correctly."""
    mock_response = Response(200, json={"received": True})

    with patch("app.services.webhook.http_client") as mock_client:
        mock_client.post = AsyncMock(return_value=mock_response)

        response = await client.post("/events", json={"type": "user.created"})

        assert response.status_code == 200
        mock_client.post.assert_called_once()
        call_args = mock_client.post.call_args
        assert "/webhook" in str(call_args)

# ── Mock OpenAI / LLM calls ───────────────────────────────────────────────
async def test_inference_endpoint(client: AsyncClient):
    mock_completion = AsyncMock(return_value=AsyncMock(
        choices=[AsyncMock(message=AsyncMock(content="Paris"))]
    ))

    with patch("app.services.llm.openai_client.chat.completions.create",
               new=mock_completion):
        response = await client.post("/inference", json={
            "prompt": "What is the capital of France?"
        })

        assert response.status_code == 200
        assert response.json()["answer"] == "Paris"`,
          notes: [
            "Patch at the point of use (app.services.llm.openai_client), not at the import source",
            "AsyncMock is required for async functions — regular Mock will fail with 'coroutine was never awaited'",
            "Assert both the response AND the call args — verify your service calls the external API correctly",
            "For httpx, use respx library: a purpose-built mock for httpx that's cleaner than patch",
          ]
        },
        {
          type: "callout",
          variant: "tip",
          title: "pytest Configuration",
          text: "Add this to <code>pyproject.toml</code>: <pre>[tool.pytest.ini_options]\nasyncio_mode = \"auto\"  # no need for @pytest.mark.asyncio on every test\ntestpaths = [\"tests\"]\nenv_files = [\".env.test\"]</pre> Use <code>pytest-asyncio</code> for async tests and <code>pytest-env</code> for loading test environment variables. Run: <code>pytest tests/ -v --tb=short</code>"
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "production-deployment",
      title: "Production Deployment: Uvicorn + Gunicorn",
      readTime: "12 min",
      content: [
        {
          type: "text",
          text: "FastAPI runs on Uvicorn, an ASGI server. For production, you need the right server configuration, worker count, health checks, structured logging, and graceful shutdown. Get these wrong and your service will be slow, flaky, or impossible to debug."
        },
        {
          type: "heading",
          text: "Uvicorn vs Gunicorn: Understanding the Stack",
          level: 2
        },
        {
          type: "diagram",
          code: `  PRODUCTION STACK

  ┌─────────────────────────────────────────────────────┐
  │  Kubernetes / Load Balancer                          │
  │  Routes traffic to multiple pods/instances           │
  └──────────────────────────┬──────────────────────────┘
                             │
  ┌──────────────────────────▼──────────────────────────┐
  │  Gunicorn (process manager)                          │
  │  - Spawns and monitors N worker processes            │
  │  - Restarts crashed workers automatically            │
  │  - Handles UNIX signals (SIGTERM for graceful stop)  │
  │                                                      │
  │  Worker 1: Uvicorn          Worker 2: Uvicorn        │
  │  ┌──────────────────┐      ┌──────────────────┐      │
  │  │ asyncio event    │      │ asyncio event    │      │
  │  │ loop             │      │ loop             │      │
  │  │ Handles 100s of  │      │ Handles 100s of  │      │
  │  │ concurrent reqs  │      │ concurrent reqs  │      │
  │  └──────────────────┘      └──────────────────┘      │
  └──────────────────────────────────────────────────────┘

  Gunicorn = process manager (handles crashes, restarts, graceful reload)
  Uvicorn  = ASGI server (handles async requests within one process)
  Workers  = independent processes (bypass Python GIL for true concurrency)`
        },
        {
          type: "heading",
          text: "Worker Count Formula",
          level: 2
        },
        {
          type: "text",
          text: "How many Uvicorn workers should you run? The formula depends on your workload:"
        },
        {
          type: "comparison",
          headers: ["Workload Type", "Worker Formula", "Rationale"],
          rows: [
            ["Pure I/O (async db, http)", "1 worker per pod", "Async handles concurrency; more workers = more memory"],
            ["Mixed I/O + some CPU", "2 × CPU cores", "Classic Gunicorn recommendation"],
            ["CPU-heavy (ML inference)", "1 per CPU core", "Each worker uses one core; no benefit from more"],
            ["Kubernetes (recommended)", "1 worker per pod, scale pods", "K8s handles scaling; keep pods single-purpose"],
          ]
        },
        {
          type: "heading",
          text: "Docker + Gunicorn Configuration",
          level: 2
        },
        {
          type: "code",
          lang: "dockerfile",
          filename: "Dockerfile",
          code: `FROM python:3.12-slim

WORKDIR /app

# Install dependencies first (cached layer)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app/ ./app/

# Create non-root user
RUN useradd --create-home --shell /bin/bash appuser
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD python -c "import httpx; httpx.get('http://localhost:8000/health').raise_for_status()"

EXPOSE 8000

# Use gunicorn with uvicorn workers
CMD ["gunicorn", "app.main:app",
     "--worker-class", "uvicorn.workers.UvicornWorker",
     "--workers", "2",
     "--bind", "0.0.0.0:8000",
     "--timeout", "120",
     "--graceful-timeout", "30",
     "--max-requests", "1000",
     "--max-requests-jitter", "100",
     "--access-logfile", "-",
     "--error-logfile", "-"]`,
          notes: [
            "--worker-class uvicorn.workers.UvicornWorker runs Uvicorn inside Gunicorn's process manager",
            "--timeout: kill workers that don't respond in 120s (handles hung requests)",
            "--graceful-timeout: workers have 30s to finish current requests before force kill on SIGTERM",
            "--max-requests: restart worker after N requests (prevents memory leaks from accumulating)",
            "--max-requests-jitter: randomizes restarts to avoid all workers restarting at once",
          ]
        },
        {
          type: "heading",
          text: "Health Check Endpoint",
          level: 2
        },
        {
          type: "code",
          lang: "python",
          filename: "health.py",
          code: `from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
import time

router = APIRouter(tags=["health"])
START_TIME = time.time()

@router.get("/health")
async def health_check():
    """Basic liveness probe — always returns 200 if app is running."""
    return {"status": "healthy"}

@router.get("/health/ready")
async def readiness_check(db: AsyncSession = Depends(get_db)):
    """
    Readiness probe — returns 200 only if dependencies are available.
    Kubernetes uses this to route traffic; fails = remove from load balancer.
    """
    checks = {}
    overall = True

    # Check DB
    try:
        await db.execute("SELECT 1")
        checks["database"] = "ok"
    except Exception as e:
        checks["database"] = f"error: {e}"
        overall = False

    # Check Redis (if used)
    try:
        import redis.asyncio as redis
        r = redis.from_url("redis://localhost:6379")
        await r.ping()
        checks["redis"] = "ok"
    except Exception as e:
        checks["redis"] = f"error: {e}"
        overall = False

    status_code = 200 if overall else 503
    return {
        "status": "ready" if overall else "not_ready",
        "checks": checks,
        "uptime_seconds": round(time.time() - START_TIME),
    }

@router.get("/health/live")
async def liveness_check():
    """
    Liveness probe — if this fails, K8s restarts the pod.
    Should NOT check external dependencies (only that the app is alive).
    """
    return {"status": "alive", "uptime_seconds": round(time.time() - START_TIME)}`,
          notes: [
            "/health/live — liveness: is the process alive? Failing this restarts the pod",
            "/health/ready — readiness: can the pod serve traffic? Failing this removes it from load balancer",
            "Readiness check should verify DB connectivity; liveness should NOT (DB outage should not restart all pods)",
            "Keep /health lightweight — it's called every 10-30 seconds by K8s",
          ]
        },
        {
          type: "heading",
          text: "Structured Logging for Production",
          level: 2
        },
        {
          type: "code",
          lang: "python",
          filename: "logging_config.py",
          code: `# pip install python-json-logger
import logging
import sys
from pythonjsonlogger import jsonlogger

def setup_logging(log_level: str = "INFO"):
    """Configure JSON logging for structured log ingestion."""
    formatter = jsonlogger.JsonFormatter(
        "%(asctime)s %(levelname)s %(name)s %(message)s",
        timestamp=True,
    )

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)

    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, log_level.upper()))
    root_logger.handlers = [handler]

    # Quiet noisy libraries
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

# Call this in lifespan startup
@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging(os.getenv("LOG_LEVEL", "INFO"))
    logger.info("Application starting", extra={"version": "1.0.0"})
    yield
    logger.info("Application shutting down")

# Usage in routes
logger = logging.getLogger(__name__)

@app.post("/inference")
async def inference(body: InferenceRequest, request: Request):
    logger.info(
        "inference_request",
        extra={
            "request_id": request.state.request_id,
            "model": body.model,
            "input_length": len(body.prompt),
        }
    )`,
          notes: [
            "python-json-logger outputs JSON lines — each log line is parseable by Datadog/CloudWatch/ELK",
            "Every log line should include request_id — enables tracing a single request through all logs",
            "Use logging.getLogger(__name__) — not print() — in every module",
            "Log at the right level: DEBUG (dev only), INFO (normal operations), WARNING (unexpected but handled), ERROR (failures)",
          ]
        },
        {
          type: "callout",
          variant: "tip",
          title: "Development vs Production Command",
          text: "Development: <code>uvicorn app.main:app --reload --host 0.0.0.0 --port 8000</code> — hot reload, single worker. Production: use Gunicorn with Uvicorn workers as shown above, or in Kubernetes: one pod per Uvicorn worker, scale horizontally with HPA. Never use --reload in production."
        }
      ]
    }

  ]; // end m.lessons
})();
