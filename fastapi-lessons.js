// Patches the FastAPI module (m2) with full tutorial lesson content.
// Loaded after curriculum.js. m2 = CURRICULUM.phases[0].modules[1]
// COMPLETE REWRITE — 10 lessons building an AI Document Intelligence API from zero to production.
// Running project: every lesson adds to the same codebase, from first endpoint to deployed service.
(function patchFastAPILessons() {
  const m = CURRICULUM.phases[0].modules[1]; // phase-1 (index 0), second module
  m.presentation = "fastapi-presentation.html";

  m.lessons = [

    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 1: Why FastAPI for AI Engineering
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "why-fastapi-ai-engineering",
      title: "Why FastAPI for AI Engineering",
      readTime: "16 min",
      content: [
        {
          type: "text",
          text: "You've trained a document classifier. It works — 94% accuracy on your test set, sub-80ms inference on your MacBook. Now you need to serve it. The content moderation pipeline, the legal document router, the customer support triage system — they all need to call your model over HTTP. You need an API."
        },
        {
          type: "text",
          text: "This is the gap that kills AI projects. Teams spend months training models, then bolt on a Flask endpoint in a Friday afternoon. The result? An API that falls over at 50 concurrent requests, returns cryptic 500 errors on malformed input, has no documentation, and leaks memory because nobody thought about how Python's GIL interacts with model inference. <strong>Model serving is infrastructure, and it deserves the same engineering rigor as the model itself.</strong>"
        },
        {
          type: "callout",
          variant: "info",
          title: "What We're Building: IntelliAPI",
          text: "Throughout this module, we'll build <strong>IntelliAPI</strong> — a production AI document intelligence platform. It accepts documents (text, PDFs, URLs), classifies them into categories (legal, financial, medical, technical), generates summaries, and returns confidence scores. Every lesson adds to the same codebase. By Lesson 10, you'll have a service with auth, caching, background processing, WebSocket streaming, structured logging, and a deployment pipeline ready for Kubernetes."
        },
        {
          type: "heading",
          text: "The Framework Landscape in 2024",
          level: 2
        },
        {
          type: "text",
          text: "Three frameworks dominate Python API development. The choice matters more than most teams realize — it determines your concurrency model, your developer experience, and how much boilerplate you'll write for the next two years."
        },
        {
          type: "comparison",
          headers: ["Dimension", "Flask", "Django REST", "FastAPI"],
          rows: [
            ["Concurrency Model", "WSGI (sync, thread-per-request)", "WSGI (sync) + optional ASGI", "ASGI (async-native, event loop)"],
            ["Request Validation", "Manual (or Flask-Marshmallow)", "DRF Serializers (runtime)", "Pydantic v2 (compile-time, Rust core)"],
            ["API Documentation", "flask-swagger (add-on)", "drf-spectacular (add-on)", "Built-in OpenAPI + Swagger UI"],
            ["Type Safety", "None", "Partial", "Full (leverages Python type hints)"],
            ["200 Concurrent I/O Requests", "200 threads = ~1.6GB RAM", "200 threads = ~1.6GB RAM", "1 event loop = ~80MB RAM"],
            ["Learning Curve", "Low", "Medium-High", "Medium"],
            ["ML Ecosystem Adoption", "Legacy projects", "Rare for ML", "Dominant (HuggingFace, Modal, Replicate)"],
            ["Startup Time", "~50ms", "~800ms (ORM, admin)", "~100ms"]
          ]
        },
        {
          type: "text",
          text: "The key insight: AI backends are <strong>I/O-bound</strong>, not CPU-bound. A typical inference request spends 5ms on actual computation but 50-200ms waiting — for model loading, database lookups, feature store calls, result caching. WSGI frameworks waste a thread on each of those waits. ASGI frameworks release the thread back to the pool and pick up the next request. This is the difference between serving 200 users and 20,000 users on the same hardware."
        },
        {
          type: "heading",
          text: "WSGI vs ASGI: Architecture Deep Dive",
          level: 2
        },
        {
          type: "diagram",
          code: `WSGI (Flask/Django)                     ASGI (FastAPI/Uvicorn)
═══════════════════                     ══════════════════════

  Request 1 ──▶ [Thread 1] ──▶ DB ─ BLOCKED ─ Response     Request 1 ──▶ [Event Loop] ──▶ DB ─ yield ─┐
  Request 2 ──▶ [Thread 2] ──▶ DB ─ BLOCKED ─ Response                                                 │
  Request 3 ──▶ [Thread 3] ──▶ DB ─ BLOCKED ─ Response     Request 2 ──▶ [Event Loop] ──▶ DB ─ yield ─┤
  Request 4 ──▶ [Thread 4] ──▶ DB ─ BLOCKED ─ Response                                                 │
      ...           ...                                     Request 3 ──▶ [Event Loop] ──▶ DB ─ yield ─┤
  Request N ──▶ [Thread N] ──▶ DB ─ BLOCKED ─ Response                                                 │
                                                            Request 4 ──▶ [Event Loop] ──▶ DB ─ yield ─┘
  Each thread: ~8MB stack                                        ...
  200 threads: ~1.6GB                                       DB responses come back, loop resumes each
  Threads mostly IDLE (waiting on I/O)                      coroutine right where it left off.

                                                            1 thread: ~80MB total for thousands of reqs`
        },
        {
          type: "text",
          text: "In the WSGI model, each request occupies a dedicated OS thread for its entire lifetime. When that thread calls a database, an HTTP service, or a file system, it <em>blocks</em> — the thread is parked by the OS, doing nothing, consuming memory. The ASGI model uses a single-threaded event loop. When an async function hits an I/O operation, it <code>yield</code>s control back to the loop, which immediately picks up another request. When the I/O completes, the loop resumes the original coroutine exactly where it left off."
        },
        {
          type: "callout",
          variant: "warning",
          title: "The GIL Doesn't Save You",
          text: "Some engineers think: \"Python has a GIL, so threads don't help anyway.\" This is half-right. The GIL prevents parallel <em>CPU</em> execution, but threads DO run I/O in parallel — the GIL is released during system calls (network, disk). The problem with WSGI isn't the GIL; it's that each thread consumes ~8MB of stack memory whether it's working or waiting. With ASGI, you get I/O parallelism <em>without</em> the memory overhead."
        },
        {
          type: "heading",
          text: "Setting Up the IntelliAPI Project",
          level: 2
        },
        {
          type: "text",
          text: "Let's set up our development environment. We'll use pyenv for Python version management and a virtual environment for dependency isolation. If you're on Apple Silicon (M1/M2/M3/M4), these steps handle the ARM64 compilation correctly."
        },
        {
          type: "code",
          lang: "bash",
          filename: "setup.sh",
          code: `# ── Step 1: Install Python 3.12 via pyenv ────────────────────────────
# pyenv compiles from source, so you get a native arm64 binary
brew install pyenv
pyenv install 3.12.4
pyenv local 3.12.4    # creates .python-version in project root

# ── Step 2: Create project structure ─────────────────────────────────
mkdir -p intelliapi/app/{routers,services,models,schemas,core}
cd intelliapi

# ── Step 3: Virtual environment ──────────────────────────────────────
python -m venv .venv
source .venv/bin/activate

# ── Step 4: Install core dependencies ────────────────────────────────
pip install fastapi==0.115.0 uvicorn[standard]==0.30.6 pydantic==2.9.2 pydantic-settings==2.5.2
pip install httpx==0.27.2    # async HTTP client (for testing + external calls)

# ── Step 5: Freeze dependencies ─────────────────────────────────────
pip freeze > requirements.txt

# ── Step 6: Verify installation ──────────────────────────────────────
python -c "import fastapi; print(f'FastAPI {fastapi.__version__}')"
python -c "import pydantic; print(f'Pydantic {pydantic.__version__}')"`,
          notes: [
            "Always use pyenv, not Homebrew's python — Homebrew's Python is linked to system libraries that break on upgrades.",
            "uvicorn[standard] includes uvloop (faster event loop) and httptools (faster HTTP parsing) — 2-3x throughput vs the pure-Python fallback.",
            "Pin exact versions in requirements.txt. A minor pydantic bump once broke every FastAPI app that used model_validator."
          ]
        },
        {
          type: "heading",
          text: "Our First Endpoint: Document Classification Stub",
          level: 2
        },
        {
          type: "text",
          text: "Let's write our first endpoint. For now, the classifier is a stub — we'll plug in the real model in later lessons. What matters here is the structure: how FastAPI wires a request to a function, validates input, and serializes the response."
        },
        {
          type: "code",
          lang: "python",
          filename: "app/main.py",
          code: `"""IntelliAPI — AI Document Intelligence Platform.

Entry point. Creates the FastAPI application and registers routers.
"""
from fastapi import FastAPI

from app.routers import classify

app = FastAPI(
    title="IntelliAPI",
    description="AI-powered document classification and summarization",
    version="0.1.0",
    docs_url="/docs",       # Swagger UI (auto-generated)
    redoc_url="/redoc",     # ReDoc (alternative docs)
)

app.include_router(classify.router)


@app.get("/health")
async def health_check():
    """Liveness probe — Kubernetes will hit this every 10s."""
    return {"status": "healthy", "version": "0.1.0"}`,
          notes: [
            "docs_url and redoc_url give you two auto-generated documentation UIs for free — no Swagger config files needed.",
            "The health endpoint is async even though it does no I/O. This keeps the event loop unblocked — a sync def here would run in a threadpool.",
            "include_router() is how FastAPI organizes endpoints into modules. One router per domain (classify, summarize, auth)."
          ]
        },
        {
          type: "code",
          lang: "python",
          filename: "app/routers/classify.py",
          code: `"""Document classification router.

Accepts a document (text or URL) and returns predicted categories
with confidence scores. Stub classifier for now — real model in Lesson 8.
"""
from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/v1", tags=["classification"])


# ── Request / Response schemas ───────────────────────────────────────

class DocumentRequest(BaseModel):
    """Input document to classify."""
    text: str = Field(
        ...,
        min_length=10,
        max_length=50_000,
        description="Raw document text (10-50k chars)",
        examples=["This agreement is entered into by and between..."],
    )
    language: str = Field(
        default="en",
        pattern="^[a-z]{2}$",
        description="ISO 639-1 language code",
    )


class ClassificationResult(BaseModel):
    """Single category prediction."""
    category: str
    confidence: float = Field(..., ge=0.0, le=1.0)


class ClassificationResponse(BaseModel):
    """Full classification response."""
    document_id: str
    categories: list[ClassificationResult]
    model_version: str
    processing_time_ms: float


# ── Endpoint ─────────────────────────────────────────────────────────

@router.post("/classify", response_model=ClassificationResponse)
async def classify_document(doc: DocumentRequest):
    """Classify a document into categories.

    Returns top-3 predicted categories with confidence scores.
    """
    import time
    import uuid

    start = time.perf_counter()

    # Stub classifier — returns hardcoded results
    # Real model integration comes in Lesson 8
    categories = [
        ClassificationResult(category="legal_contract", confidence=0.87),
        ClassificationResult(category="financial_report", confidence=0.09),
        ClassificationResult(category="medical_record", confidence=0.04),
    ]

    elapsed = (time.perf_counter() - start) * 1000

    return ClassificationResponse(
        document_id=str(uuid.uuid4()),
        categories=categories,
        model_version="stub-0.1.0",
        processing_time_ms=round(elapsed, 2),
    )`,
          notes: [
            "Field(...) with min_length, max_length, pattern — FastAPI validates all of this BEFORE your function runs. Invalid input never reaches your code.",
            "response_model=ClassificationResponse tells FastAPI to serialize the return value through that schema, stripping any extra fields and enforcing types.",
            "We use uuid4() for document IDs — in production this would come from a database or Snowflake ID generator.",
            "time.perf_counter() is nanosecond-precise on modern Python — never use time.time() for latency measurement."
          ]
        },
        {
          type: "heading",
          text: "Running and Testing",
          level: 2
        },
        {
          type: "code",
          lang: "bash",
          filename: "terminal",
          code: `# Start the dev server with auto-reload
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# In another terminal — test the health endpoint
curl -s http://localhost:8000/health | python -m json.tool

# Test classification with valid input
curl -s -X POST http://localhost:8000/api/v1/classify \\
  -H "Content-Type: application/json" \\
  -d '{"text": "This agreement is entered into by and between Party A and Party B for the purpose of licensing intellectual property."}' \\
  | python -m json.tool

# Test validation — text too short (should return 422)
curl -s -X POST http://localhost:8000/api/v1/classify \\
  -H "Content-Type: application/json" \\
  -d '{"text": "short"}' \\
  | python -m json.tool

# Open the auto-generated docs
open http://localhost:8000/docs`,
          notes: [
            "--reload watches for file changes and restarts the server. NEVER use this in production — it adds ~200ms latency per request.",
            "The 422 response from the short text test is FastAPI's automatic validation. You didn't write any error handling code — Pydantic did it for you."
          ]
        },
        {
          type: "heading",
          text: "How FastAPI Processes a Request",
          level: 2
        },
        {
          type: "text",
          text: "Understanding the request lifecycle is essential for debugging. Here's exactly what happens when a POST hits <code>/api/v1/classify</code>:"
        },
        {
          type: "diagram",
          code: `Client POST /api/v1/classify
         │
         ▼
┌──────────────────────┐
│  Uvicorn (ASGI)      │  1. Parses raw HTTP bytes
│  - HTTP parsing      │  2. Creates ASGI scope dict
│  - Connection mgmt   │  3. Passes to FastAPI app
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│  Starlette Router    │  4. Matches URL path to route
│  - Path matching     │  5. Identifies path params
│  - Method check      │  6. Runs middleware stack
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│  Dependency Injection│  7. Resolves Depends() params
│  - DB sessions       │  8. Auth checks
│  - Request parsing   │  9. Nested dependency graph
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│  Pydantic Validation │  10. Parses JSON body
│  - Type coercion     │  11. Validates constraints
│  - Field defaults    │  12. Returns 422 on failure
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│  Your Function       │  13. Business logic runs
│  classify_document() │  14. Returns Python object
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│  Response Serialize  │  15. Pydantic serializes output
│  - response_model    │  16. Strips extra fields
│  - JSON encoding     │  17. Sets Content-Type header
└──────────┬───────────┘
           ▼
     JSON Response 200`
        },
        {
          type: "text",
          text: "Notice steps 10-12: Pydantic validation happens <em>before</em> your function runs. If the request body fails validation, FastAPI returns a 422 with detailed error messages, and your function is never called. This is a security boundary — your code can trust that <code>doc.text</code> is between 10 and 50,000 characters because the framework already verified it."
        },
        {
          type: "heading",
          text: "What You Get For Free",
          level: 2
        },
        {
          type: "list",
          items: [
            "<strong>Automatic OpenAPI schema</strong> — Visit /docs and /redoc. Every endpoint, every request/response model, every field constraint is documented. No Swagger YAML files to maintain.",
            "<strong>Request validation</strong> — Type checking, string length, regex patterns, numeric ranges. All from Python type hints + Pydantic Field(). Invalid input returns a structured 422 error.",
            "<strong>Response serialization</strong> — response_model strips extra fields, coerces types, and ensures your API never leaks internal data structures.",
            "<strong>Async support</strong> — Write async def and you're on the event loop. Write plain def and FastAPI runs it in a threadpool automatically. You don't need to learn asyncio to start.",
            "<strong>Dependency injection</strong> — Database sessions, auth tokens, rate limiters — all injected as function parameters. No global state, easy to test, easy to swap.",
            "<strong>Standards compliance</strong> — OpenAPI 3.1, JSON Schema 2020-12. Your docs can be imported into Postman, used to generate client SDKs, or fed to API gateways."
          ]
        },
        {
          type: "heading",
          text: "Project Structure So Far",
          level: 2
        },
        {
          type: "code",
          lang: "text",
          filename: "project layout",
          code: `intelliapi/
├── app/
│   ├── __init__.py
│   ├── main.py              ← FastAPI app, health check, router registration
│   ├── routers/
│   │   ├── __init__.py
│   │   └── classify.py      ← /api/v1/classify endpoint + schemas
│   ├── services/            ← Business logic (empty for now)
│   ├── models/              ← Database models (empty for now)
│   ├── schemas/             ← Shared Pydantic schemas (empty for now)
│   └── core/                ← Config, security, constants (empty for now)
├── tests/                   ← Test files (Lesson 7)
├── .python-version          ← pyenv Python version
├── requirements.txt
└── .gitignore`,
          notes: [
            "Routers handle HTTP concerns (path, method, status codes). Services handle business logic. Models handle persistence. This separation makes testing trivial.",
            "Schemas are currently inline in classify.py. In Lesson 3, we'll extract them to app/schemas/ for reuse across routers."
          ]
        },
        {
          type: "callout",
          variant: "interview",
          title: "Common Interview Questions",
          text: "<strong>Q: Why FastAPI over Flask for ML serving?</strong><br>A: Three reasons. (1) Async-native: AI backends are I/O-bound (DB lookups, model loading, feature store calls), and ASGI handles thousands of concurrent connections without thread-per-request overhead. (2) Pydantic validation: ML inputs need strict validation (text length, numeric ranges, enum categories) — FastAPI does this from type hints, eliminating manual validation code. (3) Auto-generated OpenAPI docs: when 15 teams consume your model API, self-documenting endpoints save hundreds of hours. FastAPI is also the de facto standard at HuggingFace, Modal, Replicate, and most ML infrastructure companies.<br><br><strong>Q: What's the difference between WSGI and ASGI?</strong><br>A: WSGI (Web Server Gateway Interface) is synchronous — each request occupies a thread for its entire lifetime. ASGI (Asynchronous Server Gateway Interface) supports async/await — requests yield control during I/O, allowing a single thread to multiplex thousands of connections. ASGI also supports WebSockets and HTTP/2 server push, which WSGI cannot. FastAPI runs on ASGI via Uvicorn; Flask runs on WSGI via Gunicorn (though Gunicorn can proxy to Uvicorn workers).<br><br><strong>Q: What happens when you send invalid JSON to a FastAPI endpoint?</strong><br>A: FastAPI returns a 422 Unprocessable Entity with a structured error body containing the field path, error type, and human-readable message. This happens in the Pydantic validation layer before your endpoint function is called. The validation is based on the type annotations and Field() constraints you define on the request model."
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 2: Async Python Deep Dive
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "async-python-deep-dive",
      title: "Async Python Deep Dive",
      readTime: "18 min",
      content: [
        {
          type: "text",
          text: "In Lesson 1 we wrote <code>async def classify_document()</code> and it just worked. But <em>why</em> is it async? What does the <code>async</code> keyword actually do? And what happens when you accidentally put synchronous code inside an async function? Understanding async Python isn't optional for AI engineering — it's the difference between an API that serves 50 requests/second and one that serves 5,000."
        },
        {
          type: "heading",
          text: "Why Async Matters for AI Backends",
          level: 2
        },
        {
          type: "text",
          text: "Let's trace a typical IntelliAPI request and measure where time is spent:"
        },
        {
          type: "diagram",
          code: `Timeline of a single /classify request (total: ~185ms)
═══════════════════════════════════════════════════════

 0ms        20ms        50ms       120ms      170ms     185ms
  │──────────│───────────│──────────│──────────│─────────│
  │  Auth    │  Feature  │  Model   │  Cache   │ Respond │
  │  check   │  store    │  infer   │  write   │  + log  │
  │  (DB)    │  (HTTP)   │  (CPU)   │  (Redis) │         │
  │          │           │          │          │         │
  └──I/O─────┘──I/O──────┘──CPU─────┘──I/O────┘──CPU────┘

  I/O time:  20 + 30 + 50 = 100ms  (54% of request)
  CPU time:  70 + 15      =  85ms  (46% of request)

  With sync (Flask):  thread blocked for all 185ms
  With async (FastAPI): thread freed during 100ms of I/O
                        = can handle ~2x more requests`
        },
        {
          type: "text",
          text: "More than half the request time is spent <em>waiting</em> — for the database, the feature store, the cache. During those waits, a synchronous framework holds an OS thread hostage. An async framework releases it. At 500 concurrent requests, that's the difference between needing 500 threads (4GB RAM) and needing 1 event loop thread (80MB RAM)."
        },
        {
          type: "heading",
          text: "The Event Loop: How It Actually Works",
          level: 2
        },
        {
          type: "text",
          text: "Python's <code>asyncio</code> event loop is a single-threaded scheduler that multiplexes coroutines. A coroutine is a function declared with <code>async def</code>. When a coroutine hits an <code>await</code> expression, it <em>suspends</em> — its stack frame is saved, and the event loop picks up the next ready coroutine. When the awaited operation completes (a network response arrives, a timer fires), the loop <em>resumes</em> the coroutine from where it left off."
        },
        {
          type: "diagram",
          code: `Event Loop (single thread)
══════════════════════════

  Ready Queue:  [coroutine_A, coroutine_B, coroutine_C]
  Waiting Set:  {coroutine_D: socket_read, coroutine_E: timer}

  Loop iteration:
  ┌─────────────────────────────────────────────────────┐
  │  1. Pop coroutine_A from ready queue                │
  │  2. Run it until it hits 'await'                    │
  │  3. coroutine_A awaits DB query → move to waiting   │
  │  4. Pop coroutine_B from ready queue                │
  │  5. Run it until it hits 'await'                    │
  │  6. coroutine_B awaits HTTP call → move to waiting  │
  │  7. Pop coroutine_C from ready queue                │
  │  8. Run it to completion → send response            │
  │  9. Check waiting set: DB response arrived!         │
  │ 10. Move coroutine_A back to ready queue            │
  │ 11. Repeat forever                                  │
  └─────────────────────────────────────────────────────┘

  Key insight: The loop NEVER blocks. If nothing is ready,
  it polls the OS kernel (epoll/kqueue) for I/O events.`
        },
        {
          type: "callout",
          variant: "info",
          title: "uvloop: The Secret Weapon",
          text: "When you install <code>uvicorn[standard]</code>, you get <strong>uvloop</strong> — a drop-in replacement for asyncio's event loop written in Cython, wrapping libuv (the same C library that powers Node.js). It's 2-4x faster than the default asyncio loop. Uvicorn uses it automatically when available. You don't need to configure anything."
        },
        {
          type: "heading",
          text: "async/await: The Mechanics",
          level: 2
        },
        {
          type: "text",
          text: "Let's build intuition with concrete examples. The key rule: <code>await</code> is a <strong>suspension point</strong>. Every <code>await</code> is a place where the event loop <em>can</em> switch to another coroutine."
        },
        {
          type: "code",
          lang: "python",
          filename: "app/demos/async_basics.py",
          code: `"""Async fundamentals — run these examples to build intuition."""
import asyncio
import time


# ── Example 1: Sequential vs Concurrent ──────────────────────────────

async def fetch_from_db(query: str, delay: float) -> str:
    """Simulate a database query with network latency."""
    print(f"  [DB] Starting: {query}")
    await asyncio.sleep(delay)  # Simulates I/O wait — loop is FREE here
    print(f"  [DB] Finished: {query}")
    return f"result_{query}"


async def sequential():
    """Three queries, one after another. Total: ~0.9s"""
    start = time.perf_counter()
    r1 = await fetch_from_db("users", 0.3)
    r2 = await fetch_from_db("documents", 0.3)
    r3 = await fetch_from_db("categories", 0.3)
    elapsed = time.perf_counter() - start
    print(f"Sequential: {elapsed:.2f}s — results: {[r1, r2, r3]}")


async def concurrent():
    """Three queries, all at once. Total: ~0.3s"""
    start = time.perf_counter()
    r1, r2, r3 = await asyncio.gather(
        fetch_from_db("users", 0.3),
        fetch_from_db("documents", 0.3),
        fetch_from_db("categories", 0.3),
    )
    elapsed = time.perf_counter() - start
    print(f"Concurrent: {elapsed:.2f}s — results: {[r1, r2, r3]}")


# Run both:
# asyncio.run(sequential())   # ~0.9s
# asyncio.run(concurrent())   # ~0.3s  (3x faster!)`,
          notes: [
            "asyncio.sleep() simulates I/O — it yields to the event loop. time.sleep() does NOT yield — it blocks the entire thread.",
            "asyncio.gather() runs coroutines concurrently. All three DB queries start immediately; gather() returns when ALL complete.",
            "This is concurrency, not parallelism. All three coroutines run on ONE thread, interleaving at await points."
          ]
        },
        {
          type: "heading",
          text: "The Blocking Function Trap",
          level: 2
        },
        {
          type: "text",
          text: "This is the #1 mistake in async Python. You write an <code>async def</code> endpoint but call a synchronous library inside it. The event loop is blocked, and <em>every</em> other request has to wait."
        },
        {
          type: "code",
          lang: "python",
          filename: "app/demos/blocking_trap.py",
          code: `"""The blocking trap — DO NOT do this in production."""
import asyncio
import time


async def bad_endpoint():
    """WRONG: Blocks the event loop for 2 seconds.
    Every other request waits — your API is frozen."""
    time.sleep(2)  # ← SYNC sleep — blocks the ENTIRE event loop!
    return {"status": "done"}


async def good_endpoint():
    """RIGHT: Yields to the event loop during the wait."""
    await asyncio.sleep(2)  # ← ASYNC sleep — loop handles other requests
    return {"status": "done"}


# Real-world version of this mistake:

async def bad_model_inference(text: str):
    """WRONG: ML model inference is CPU-bound and synchronous.
    This blocks the event loop while the model runs."""
    import transformers  # hypothetical
    model = transformers.pipeline("classification")
    result = model(text)  # ← BLOCKS for 50-200ms, freezing all other requests
    return result


async def good_model_inference(text: str):
    """RIGHT: Run CPU-bound work in a thread pool."""
    import functools
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(
        None,  # Uses default ThreadPoolExecutor
        functools.partial(sync_model_predict, text),
    )
    return result


def sync_model_predict(text: str) -> dict:
    """Synchronous model inference — safe to run in executor."""
    # model.predict(text) — the actual blocking call
    time.sleep(0.1)  # Simulating inference time
    return {"label": "legal_contract", "score": 0.87}`,
          notes: [
            "time.sleep() is the #1 example, but the real danger is ANY sync I/O: requests.get(), psycopg2 queries, open().read() on large files, ML model forward passes.",
            "run_in_executor() offloads blocking work to a thread pool. The event loop await's the thread, staying free for other requests.",
            "Default executor is a ThreadPoolExecutor with min(32, os.cpu_count() + 4) workers. For CPU-heavy model inference, consider ProcessPoolExecutor."
          ]
        },
        {
          type: "callout",
          variant: "warning",
          title: "How to Detect Blocking Code",
          text: "Set the <code>PYTHONASYNCIODEBUG=1</code> environment variable. Python will warn you when a coroutine takes longer than 100ms without yielding. In production, instrument your event loop with <code>loop.slow_callback_duration = 0.05</code> to log any callback that blocks for more than 50ms. Libraries like <code>aiomonitor</code> let you attach to a running event loop and inspect which coroutines are stuck."
        },
        {
          type: "heading",
          text: "asyncio Patterns for Production",
          level: 2
        },
        {
          type: "text",
          text: "Beyond basic <code>gather()</code>, there are three patterns you'll use constantly in AI backends: TaskGroups for structured concurrency, Semaphores for rate limiting, and timeouts for resilience."
        },
        {
          type: "code",
          lang: "python",
          filename: "app/demos/async_patterns.py",
          code: `"""Production async patterns for AI backends."""
import asyncio
from contextlib import asynccontextmanager


# ── Pattern 1: TaskGroup (Python 3.11+) ──────────────────────────────
# Structured concurrency: if any task fails, ALL are cancelled.

async def enrich_document(doc_id: str) -> dict:
    """Fetch metadata from multiple services concurrently."""
    async with asyncio.TaskGroup() as tg:
        # All three run concurrently
        cat_task = tg.create_task(fetch_categories(doc_id))
        meta_task = tg.create_task(fetch_metadata(doc_id))
        embed_task = tg.create_task(fetch_embeddings(doc_id))

    # If ANY task raised an exception, we never reach here.
    # All other tasks are automatically cancelled.
    return {
        "categories": cat_task.result(),
        "metadata": meta_task.result(),
        "embeddings": embed_task.result(),
    }


# ── Pattern 2: Semaphore (Rate Limiting) ─────────────────────────────
# Don't overwhelm external services with too many concurrent requests.

OPENAI_SEMAPHORE = asyncio.Semaphore(10)  # Max 10 concurrent API calls

async def call_openai(prompt: str) -> str:
    """Call OpenAI with concurrency control."""
    async with OPENAI_SEMAPHORE:
        # At most 10 coroutines execute this block simultaneously.
        # Others wait here until a slot opens.
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                json={"model": "gpt-4", "messages": [{"role": "user", "content": prompt}]},
                headers={"Authorization": f"Bearer {API_KEY}"},
                timeout=30.0,
            )
            return response.json()["choices"][0]["message"]["content"]


async def classify_batch(documents: list[str]) -> list[str]:
    """Classify 1000 documents with max 10 concurrent OpenAI calls."""
    tasks = [call_openai(f"Classify: {doc}") for doc in documents]
    return await asyncio.gather(*tasks)
    # Even though we create 1000 tasks, the semaphore ensures
    # only 10 run concurrently. OpenAI rate limits? No problem.


# ── Pattern 3: Timeout with Fallback ─────────────────────────────────
# Never let a slow external service hang your entire API.

async def classify_with_timeout(text: str) -> dict:
    """Try primary model; fall back to simple heuristic on timeout."""
    try:
        result = await asyncio.wait_for(
            call_primary_model(text),
            timeout=2.0,  # 2 second deadline
        )
        return {"source": "primary_model", **result}
    except asyncio.TimeoutError:
        # Primary model is slow — use fast fallback
        return {"source": "fallback_heuristic", **simple_classify(text)}


# ── Pattern 4: run_in_executor for CPU-bound Work ────────────────────
# Model inference, PDF parsing, image processing — anything CPU-heavy.

import functools
from concurrent.futures import ProcessPoolExecutor

# Create once at module level, not per-request
PROCESS_POOL = ProcessPoolExecutor(max_workers=4)

async def run_inference(text: str) -> dict:
    """Run model inference without blocking the event loop."""
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(
        PROCESS_POOL,
        functools.partial(sync_inference, text=text),
    )
    return result


def sync_inference(text: str) -> dict:
    """Synchronous inference — runs in a separate process."""
    # Heavy computation here — this is in its own process,
    # completely outside the event loop's thread.
    import time
    time.sleep(0.1)  # Simulating model.predict(text)
    return {"category": "legal_contract", "confidence": 0.91}`,
          notes: [
            "TaskGroup (Python 3.11+) replaces gather() for error handling. With gather(), one failure can leave other tasks running as zombies. TaskGroup cancels everything.",
            "Semaphore is critical for AI backends. If you blast 1000 concurrent requests to OpenAI or a model API, you'll get rate-limited or crash the service.",
            "ProcessPoolExecutor bypasses the GIL entirely — use it for true CPU-bound work like model inference. ThreadPoolExecutor is for sync I/O (file reads, old DB drivers).",
            "Always create executor pools at module level, not per-request. Creating a pool per request is 100x slower than reusing one."
          ]
        },
        {
          type: "heading",
          text: "FastAPI's Async Behavior: The Subtlety",
          level: 2
        },
        {
          type: "text",
          text: "FastAPI has a clever trick that most tutorials don't explain. It treats <code>async def</code> and plain <code>def</code> endpoints differently:"
        },
        {
          type: "comparison",
          headers: ["Declaration", "Execution", "When to Use"],
          rows: [
            ["<code>async def endpoint()</code>", "Runs directly on the event loop", "When you use <code>await</code> inside (async DB, HTTP, Redis)"],
            ["<code>def endpoint()</code>", "Runs in a threadpool (via run_in_executor)", "When you call sync libraries (pandas, scikit-learn, old DB drivers)"],
            ["<code>async def</code> + sync call inside", "BLOCKS THE EVENT LOOP", "NEVER DO THIS — this is the trap"]
          ]
        },
        {
          type: "code",
          lang: "python",
          filename: "app/demos/fastapi_async_rules.py",
          code: `"""FastAPI async/sync decision guide."""
from fastapi import APIRouter

router = APIRouter()


# ✅ GOOD: async endpoint with async operations
@router.get("/async-good")
async def async_with_await():
    """This is correct — async endpoint uses await."""
    result = await async_db_query("SELECT * FROM docs")
    return {"data": result}


# ✅ GOOD: sync endpoint with sync operations
@router.get("/sync-good")
def sync_with_sync():
    """This is correct — sync endpoint runs in threadpool.
    FastAPI automatically runs this in a thread, so it
    doesn't block the event loop."""
    import pandas as pd
    df = pd.read_csv("data.csv")  # Sync I/O — fine in a thread
    return {"rows": len(df)}


# ❌ BAD: async endpoint with sync operations
@router.get("/async-bad")
async def async_with_sync():
    """WRONG! This blocks the event loop.
    time.sleep, requests.get, open().read, pandas — all block."""
    import time
    time.sleep(1)  # ← Blocks EVERY other request for 1 second
    return {"status": "done"}


# ✅ FIX: Use run_in_executor for sync code in async context
@router.get("/async-fixed")
async def async_with_executor():
    """RIGHT: Offload sync work to a thread."""
    import asyncio
    import functools
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(None, heavy_sync_function)
    return {"result": result}`,
          notes: [
            "The decision tree: If your endpoint uses await → async def. If it calls sync libraries → plain def. Never mix async def with sync calls.",
            "FastAPI runs plain def endpoints in a threadpool automatically. This is why Flask-to-FastAPI migrations work — just change your decorator and you get async benefits without rewriting your sync code.",
            "The threadpool has a default size of 40. Under heavy load with sync endpoints, you may need to increase it via FASTAPI_THREADPOOL_SIZE or by setting a custom executor."
          ]
        },
        {
          type: "heading",
          text: "Common Async Mistakes and Fixes",
          level: 2
        },
        {
          type: "list",
          items: [
            "<strong>Mistake: Using <code>requests</code> library in async code</strong> — The <code>requests</code> library is synchronous. Use <code>httpx.AsyncClient</code> instead. It has the same API but is fully async: <code>await client.get(url)</code>.",
            "<strong>Mistake: Creating a new DB connection per request</strong> — Async DB drivers (asyncpg, motor) support connection pools. Create the pool once at startup, reuse it. Creating connections is 10-50ms per request; pooling reduces it to <1ms.",
            "<strong>Mistake: Forgetting to await</strong> — If you write <code>result = async_function()</code> without <code>await</code>, you get a coroutine object, not the result. Python 3.12+ warns about this, but earlier versions fail silently.",
            "<strong>Mistake: Using global mutable state</strong> — Coroutines interleave on one thread. If coroutine A reads a global, yields, coroutine B modifies it, and A resumes — you have a race condition. Use <code>contextvars</code> or pass state through function arguments.",
            "<strong>Mistake: Catching <code>Exception</code> too broadly</strong> — <code>asyncio.CancelledError</code> inherits from <code>BaseException</code> in Python 3.9+, so <code>except Exception</code> won't catch it. But if you catch it accidentally with <code>except BaseException</code>, you prevent task cancellation. Always let <code>CancelledError</code> propagate."
          ]
        },
        {
          type: "heading",
          text: "Applying This to IntelliAPI",
          level: 2
        },
        {
          type: "text",
          text: "Let's upgrade our classify endpoint to use async patterns properly. We'll add concurrent enrichment and a timeout:"
        },
        {
          type: "code",
          lang: "python",
          filename: "app/routers/classify.py (updated)",
          code: `"""Updated classify endpoint with proper async patterns."""
import asyncio
import time
import uuid

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/v1", tags=["classification"])


class DocumentRequest(BaseModel):
    text: str = Field(..., min_length=10, max_length=50_000)
    language: str = Field(default="en", pattern="^[a-z]{2}$")


class ClassificationResult(BaseModel):
    category: str
    confidence: float = Field(..., ge=0.0, le=1.0)


class ClassificationResponse(BaseModel):
    document_id: str
    categories: list[ClassificationResult]
    model_version: str
    processing_time_ms: float


# ── Simulated async services ─────────────────────────────────────────

async def check_cache(text_hash: str) -> dict | None:
    """Check Redis for cached classification. Returns None on miss."""
    await asyncio.sleep(0.005)  # Simulate 5ms Redis lookup
    return None  # Cache miss for now


async def run_classifier(text: str) -> list[ClassificationResult]:
    """Run the classification model (async wrapper around sync inference)."""
    loop = asyncio.get_event_loop()
    # Offload CPU-bound inference to threadpool
    categories = await loop.run_in_executor(None, _sync_classify, text)
    return categories


def _sync_classify(text: str) -> list[ClassificationResult]:
    """Synchronous classification — runs in threadpool."""
    time.sleep(0.05)  # Simulate 50ms model inference
    return [
        ClassificationResult(category="legal_contract", confidence=0.87),
        ClassificationResult(category="financial_report", confidence=0.09),
        ClassificationResult(category="medical_record", confidence=0.04),
    ]


async def store_result(doc_id: str, result: dict) -> None:
    """Store classification result in cache + database."""
    await asyncio.sleep(0.01)  # Simulate async write


# ── Endpoint with async patterns ─────────────────────────────────────

@router.post("/classify", response_model=ClassificationResponse)
async def classify_document(doc: DocumentRequest):
    """Classify a document with caching, timeout, and async I/O."""
    start = time.perf_counter()
    doc_id = str(uuid.uuid4())

    # Step 1: Check cache (async I/O — doesn't block)
    text_hash = str(hash(doc.text))
    cached = await check_cache(text_hash)
    if cached:
        return cached

    # Step 2: Run classifier with a 5-second timeout
    try:
        categories = await asyncio.wait_for(
            run_classifier(doc.text),
            timeout=5.0,
        )
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=504,
            detail="Classification timed out after 5s",
        )

    elapsed = (time.perf_counter() - start) * 1000

    response = ClassificationResponse(
        document_id=doc_id,
        categories=categories,
        model_version="stub-0.1.0",
        processing_time_ms=round(elapsed, 2),
    )

    # Step 3: Store result asynchronously (fire-and-forget)
    # We don't await this — we create a background task
    asyncio.create_task(store_result(doc_id, response.model_dump()))

    return response`,
          notes: [
            "Cache check is async (Redis is I/O) — the event loop is free during the 5ms lookup.",
            "Model inference uses run_in_executor — CPU-bound work doesn't block the loop.",
            "asyncio.wait_for() adds a timeout — if the model hangs, we return 504 instead of waiting forever.",
            "create_task() for fire-and-forget: we don't need to wait for the cache write before responding to the client."
          ]
        },
        {
          type: "callout",
          variant: "interview",
          title: "Common Interview Questions",
          text: "<strong>Q: Explain the difference between concurrency and parallelism in Python.</strong><br>A: Concurrency is handling multiple tasks by interleaving their execution on one or more threads. Parallelism is executing multiple tasks simultaneously on multiple cores. Python's asyncio provides concurrency on a single thread — coroutines interleave at await points. Python's multiprocessing provides parallelism across cores — each process has its own GIL. In FastAPI, we use async for I/O concurrency and ProcessPoolExecutor for CPU parallelism.<br><br><strong>Q: You have a FastAPI endpoint that calls a synchronous ML model. How do you prevent it from blocking?</strong><br>A: Two options. (1) Declare the endpoint as <code>def</code> (not <code>async def</code>) — FastAPI will automatically run it in a threadpool. This is simplest for migration. (2) Keep <code>async def</code> and use <code>await loop.run_in_executor(pool, func)</code> to explicitly offload the sync call. Use ThreadPoolExecutor for I/O-bound blocking (old DB drivers) and ProcessPoolExecutor for CPU-bound blocking (model inference, NumPy, pandas). Option 2 gives you more control over pool sizing and error handling.<br><br><strong>Q: What is asyncio.gather() vs asyncio.TaskGroup()?</strong><br>A: Both run coroutines concurrently. gather() returns results in order and by default lets other tasks continue if one fails (unless return_exceptions=False, which raises the first exception and leaves others running). TaskGroup (Python 3.11+) provides structured concurrency — if any task raises, ALL other tasks in the group are cancelled, and the group raises an ExceptionGroup. TaskGroup is safer for production because it prevents task leaks."
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 3: Pydantic V2 — Data Validation at Scale
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "pydantic-v2-data-validation",
      title: "Pydantic V2 — Data Validation at Scale",
      readTime: "20 min",
      content: [
        {
          type: "text",
          text: "Every AI system has the same failure mode: garbage in, garbage out. Your document classifier is 94% accurate — on well-formed text. Feed it a JSON blob, a base64-encoded image, or a 10-million-character string, and it returns confidently wrong results while burning $0.50 of GPU time. <strong>Validation isn't a nice-to-have; it's the first line of defense for your inference budget.</strong>"
        },
        {
          type: "text",
          text: "Pydantic v2 is FastAPI's validation engine. It was rewritten from scratch with a Rust core (<code>pydantic-core</code>), making it 5-50x faster than v1. Every request body, query parameter, and response in FastAPI passes through Pydantic. Understanding it deeply means understanding how your API handles data."
        },
        {
          type: "heading",
          text: "Pydantic v2 vs v1: What Changed",
          level: 2
        },
        {
          type: "comparison",
          headers: ["Feature", "Pydantic v1", "Pydantic v2"],
          rows: [
            ["Core engine", "Pure Python", "Rust (pydantic-core)"],
            ["Validation speed", "Baseline", "5-50x faster"],
            ["Serialization", ".dict(), .json()", ".model_dump(), .model_dump_json()"],
            ["Validators", "@validator, @root_validator", "@field_validator, @model_validator"],
            ["Strict mode", "Not available", "strict=True on model or field"],
            ["JSON Schema", "Draft 7", "Draft 2020-12 (OpenAPI 3.1)"],
            ["Configuration", "class Config:", "model_config = ConfigDict(...)"],
            ["Computed fields", "Not native", "@computed_field decorator"]
          ]
        },
        {
          type: "callout",
          variant: "warning",
          title: "Migration Gotcha",
          text: "If you see <code>@validator</code>, <code>.dict()</code>, or <code>class Config:</code> in code, it's Pydantic v1 syntax. FastAPI 0.100+ requires Pydantic v2. The old syntax still works via a compatibility layer, but it's slower and will be removed. Always use the v2 API: <code>@field_validator</code>, <code>.model_dump()</code>, <code>model_config = ConfigDict(...)</code>."
        },
        {
          type: "heading",
          text: "Building IntelliAPI's Schema Layer",
          level: 2
        },
        {
          type: "text",
          text: "Let's build the complete request/response schema for IntelliAPI. We'll start simple and layer on complexity — field validators, model validators, nested models, discriminated unions."
        },
        {
          type: "code",
          lang: "python",
          filename: "app/schemas/documents.py",
          code: `"""IntelliAPI document schemas — request and response models.

These schemas are the contract between our API and every client.
Change them carefully — they're versioned and documented in OpenAPI.
"""
from datetime import datetime
from enum import Enum
from typing import Annotated

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    computed_field,
    field_validator,
    model_validator,
)


# ── Enums ─────────────────────────────────────────────────────────────

class DocumentCategory(str, Enum):
    """Supported document categories. Tied to model training labels."""
    LEGAL_CONTRACT = "legal_contract"
    FINANCIAL_REPORT = "financial_report"
    MEDICAL_RECORD = "medical_record"
    TECHNICAL_SPEC = "technical_spec"
    NEWS_ARTICLE = "news_article"
    ACADEMIC_PAPER = "academic_paper"
    OTHER = "other"


class Language(str, Enum):
    """Supported languages for classification."""
    EN = "en"
    ES = "es"
    FR = "fr"
    DE = "de"
    ZH = "zh"


class ProcessingPriority(str, Enum):
    """Processing queue priority."""
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    CRITICAL = "critical"


# ── Request Schemas ───────────────────────────────────────────────────

class DocumentRequest(BaseModel):
    """Input document for classification.

    Validates text content, enforces size limits, and normalizes input.
    """
    model_config = ConfigDict(
        str_strip_whitespace=True,  # Strip leading/trailing whitespace
        str_min_length=1,           # No empty strings anywhere
        json_schema_extra={
            "examples": [
                {
                    "text": "This Software License Agreement is entered into...",
                    "language": "en",
                    "priority": "normal",
                }
            ]
        },
    )

    text: str = Field(
        ...,
        min_length=10,
        max_length=100_000,
        description="Document text content (10 - 100,000 characters)",
    )
    language: Language = Field(
        default=Language.EN,
        description="ISO 639-1 language code",
    )
    priority: ProcessingPriority = Field(
        default=ProcessingPriority.NORMAL,
        description="Queue priority for async processing",
    )
    metadata: dict[str, str] = Field(
        default_factory=dict,
        description="Arbitrary key-value metadata (max 10 entries)",
    )
    request_id: str | None = Field(
        default=None,
        description="Client-provided idempotency key",
    )

    @field_validator("text")
    @classmethod
    def validate_text_content(cls, v: str) -> str:
        """Reject text that's mostly whitespace or non-printable."""
        printable_ratio = sum(1 for c in v if c.isprintable()) / len(v)
        if printable_ratio < 0.8:
            raise ValueError(
                f"Text is only {printable_ratio:.0%} printable characters. "
                "Ensure input is clean text, not binary or encoded data."
            )
        return v

    @field_validator("metadata")
    @classmethod
    def validate_metadata_size(cls, v: dict) -> dict:
        """Limit metadata to 10 entries with reasonable key/value sizes."""
        if len(v) > 10:
            raise ValueError(f"Metadata has {len(v)} entries; maximum is 10")
        for key, value in v.items():
            if len(key) > 64:
                raise ValueError(f"Metadata key '{key[:20]}...' exceeds 64 chars")
            if len(value) > 256:
                raise ValueError(f"Metadata value for '{key}' exceeds 256 chars")
        return v`,
          notes: [
            "str_strip_whitespace=True in model_config automatically strips whitespace from ALL string fields. No manual .strip() calls.",
            "Using enums (Language, ProcessingPriority) instead of raw strings — invalid values return a clear 422 error listing valid options.",
            "@field_validator runs AFTER Pydantic's built-in validation (type checking, min_length, etc.). Your custom logic only sees valid-typed data.",
            "json_schema_extra adds example values to the OpenAPI docs. Clients see concrete examples, not just type descriptions."
          ]
        },
        {
          type: "heading",
          text: "Response Schemas with Computed Fields",
          level: 2
        },
        {
          type: "code",
          lang: "python",
          filename: "app/schemas/documents.py (continued)",
          code: `# ── Response Schemas ──────────────────────────────────────────────────

class ClassificationScore(BaseModel):
    """Single category prediction with confidence."""
    category: DocumentCategory
    confidence: float = Field(..., ge=0.0, le=1.0)

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [{"category": "legal_contract", "confidence": 0.87}]
        }
    )


class ClassificationResponse(BaseModel):
    """Full classification response with metadata."""
    model_config = ConfigDict(
        ser_json_timedelta="float",  # Serialize timedelta as seconds
    )

    document_id: str = Field(..., description="Unique document identifier")
    categories: list[ClassificationScore] = Field(
        ...,
        min_length=1,
        max_length=10,
        description="Predicted categories, sorted by confidence descending",
    )
    model_version: str = Field(..., pattern=r"^\\d+\\.\\d+\\.\\d+")
    processing_time_ms: float = Field(..., ge=0)
    cached: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    @computed_field
    @property
    def top_category(self) -> str:
        """Convenience field: the highest-confidence category."""
        return self.categories[0].category.value if self.categories else "unknown"

    @computed_field
    @property
    def is_confident(self) -> bool:
        """True if top category has >0.7 confidence."""
        return bool(self.categories and self.categories[0].confidence > 0.7)

    @model_validator(mode="after")
    def sort_categories_by_confidence(self) -> "ClassificationResponse":
        """Ensure categories are always sorted by confidence descending."""
        self.categories = sorted(
            self.categories, key=lambda c: c.confidence, reverse=True
        )
        return self`,
          notes: [
            "@computed_field creates fields that appear in JSON output but aren't stored — they're computed on serialization. Perfect for convenience fields like top_category.",
            "@model_validator(mode='after') runs after all fields are validated. Use it for cross-field validation or data normalization (like sorting).",
            "The model_version pattern enforces semantic versioning format. A deploy that accidentally sets version='latest' will fail at the schema level."
          ]
        },
        {
          type: "heading",
          text: "Discriminated Unions: Polymorphic Payloads",
          level: 2
        },
        {
          type: "text",
          text: "IntelliAPI accepts different input types — raw text, URLs, and file references. Each has different validation rules. Pydantic's discriminated unions let us handle this cleanly without <code>if/elif/else</code> chains."
        },
        {
          type: "code",
          lang: "python",
          filename: "app/schemas/inputs.py",
          code: `"""Polymorphic input types using discriminated unions.

The client specifies input_type, and Pydantic validates against
the correct schema automatically. No manual type switching.
"""
from typing import Annotated, Literal, Union

from pydantic import BaseModel, Field, HttpUrl, field_validator


class TextInput(BaseModel):
    """Raw text document input."""
    input_type: Literal["text"] = "text"
    content: str = Field(..., min_length=10, max_length=100_000)
    encoding: str = Field(default="utf-8", pattern="^(utf-8|ascii|latin-1)$")


class UrlInput(BaseModel):
    """Web page URL to fetch and classify."""
    input_type: Literal["url"] = "url"
    url: HttpUrl
    follow_redirects: bool = Field(default=True)
    max_content_length: int = Field(default=500_000, le=1_000_000)

    @field_validator("url")
    @classmethod
    def reject_internal_urls(cls, v: HttpUrl) -> HttpUrl:
        """Prevent SSRF: reject internal network URLs."""
        host = str(v.host)
        blocked = ["localhost", "127.0.0.1", "0.0.0.0", "169.254.169.254"]
        if host in blocked or host.startswith("10.") or host.startswith("192.168."):
            raise ValueError(f"Internal URL not allowed: {host}")
        return v


class FileRefInput(BaseModel):
    """Reference to a file in object storage (S3/GCS)."""
    input_type: Literal["file_ref"] = "file_ref"
    bucket: str = Field(..., pattern="^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$")
    key: str = Field(..., min_length=1, max_length=1024)
    content_type: str = Field(
        default="text/plain",
        pattern="^(text/plain|application/pdf|text/html)$",
    )


# ── The discriminated union ──────────────────────────────────────────

DocumentInput = Annotated[
    Union[TextInput, UrlInput, FileRefInput],
    Field(discriminator="input_type"),
]


class UnifiedDocumentRequest(BaseModel):
    """Accepts any input type — Pydantic routes to the right schema."""
    input: DocumentInput
    language: str = Field(default="en", pattern="^[a-z]{2}$")
    priority: str = Field(default="normal")


# Usage in endpoint:
# @router.post("/classify")
# async def classify(req: UnifiedDocumentRequest):
#     match req.input:
#         case TextInput():
#             text = req.input.content
#         case UrlInput():
#             text = await fetch_url(req.input.url)
#         case FileRefInput():
#             text = await download_from_storage(req.input.bucket, req.input.key)`,
          notes: [
            "discriminator='input_type' tells Pydantic to check that field FIRST, then validate against the matching schema. No try/except chain needed.",
            "The SSRF validator on UrlInput is a real security concern — without it, an attacker could use your API to scan internal networks.",
            "Literal['text'] constrains the field to exactly one value. This is how the discriminator knows which schema to use.",
            "Python 3.10+ match/case works perfectly with discriminated unions for type-safe dispatch."
          ]
        },
        {
          type: "heading",
          text: "Serialization Control",
          level: 2
        },
        {
          type: "text",
          text: "Pydantic v2 gives you fine-grained control over how models are serialized. This matters when your internal representation differs from your API contract — which it always does."
        },
        {
          type: "code",
          lang: "python",
          filename: "app/demos/serialization.py",
          code: `"""Pydantic v2 serialization patterns."""
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict, field_serializer


class InternalDocument(BaseModel):
    """Internal representation with serialization control."""
    model_config = ConfigDict(
        # Controls what model_dump() and JSON output include
        populate_by_name=True,  # Allow both alias and field name
    )

    id: str = Field(..., alias="_id")  # MongoDB uses _id; API uses id
    title: str
    score: float
    created_at: datetime
    internal_notes: str = Field(exclude=True)  # NEVER include in API output

    @field_serializer("score")
    def round_score(self, v: float) -> float:
        """Round to 3 decimal places in API output."""
        return round(v, 3)

    @field_serializer("created_at")
    def format_timestamp(self, v: datetime) -> str:
        """ISO 8601 format for API consumers."""
        return v.isoformat() + "Z"


# ── Serialization modes ──────────────────────────────────────────────

doc = InternalDocument(
    _id="doc_abc123",
    title="Contract Draft",
    score=0.87654321,
    created_at=datetime(2024, 1, 15, 10, 30),
    internal_notes="Review with legal team before release",
)

# Full dict (for internal use)
print(doc.model_dump())
# {'id': 'doc_abc123', 'title': 'Contract Draft',
#  'score': 0.877, 'created_at': '2024-01-15T10:30:00Z'}
# Note: internal_notes is EXCLUDED (exclude=True)

# Subset of fields
print(doc.model_dump(include={"id", "title", "score"}))
# {'id': 'doc_abc123', 'title': 'Contract Draft', 'score': 0.877}

# JSON string (uses Rust serializer — 10x faster than json.dumps)
print(doc.model_dump_json(indent=2))

# JSON Schema (for OpenAPI docs)
print(InternalDocument.model_json_schema())`,
          notes: [
            "exclude=True on internal_notes means it NEVER appears in API output, even if someone adds it to response_model. Defense in depth.",
            "alias='_id' maps MongoDB's _id to a clean 'id' field. populate_by_name=True lets you use either name in Python code.",
            "model_dump_json() uses Rust-based serialization — roughly 10x faster than calling json.dumps(model.model_dump()).",
            "@field_serializer controls output format without changing the internal value. score is still a full float internally; it's only rounded on serialization."
          ]
        },
        {
          type: "heading",
          text: "Pydantic Settings: Configuration Management",
          level: 2
        },
        {
          type: "text",
          text: "Every production service needs configuration: database URLs, API keys, model paths, feature flags. Pydantic Settings reads from environment variables, .env files, and secrets — with full validation."
        },
        {
          type: "code",
          lang: "python",
          filename: "app/core/config.py",
          code: `"""Application configuration via Pydantic Settings.

Reads from environment variables and .env file. All values
are validated at startup — not when you first use them.
"""
from functools import lru_cache
from pydantic import Field, field_validator, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """IntelliAPI application settings.

    Values are loaded from (highest to lowest priority):
    1. Environment variables
    2. .env file
    3. Field defaults
    """
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,      # APP_NAME and app_name both work
        env_prefix="INTELLIAPI_",  # All env vars prefixed: INTELLIAPI_DB_URL
    )

    # ── Application ──────────────────────────────────────────────────
    app_name: str = "IntelliAPI"
    app_version: str = "0.1.0"
    debug: bool = False
    log_level: str = Field(default="INFO", pattern="^(DEBUG|INFO|WARNING|ERROR)$")

    # ── Server ───────────────────────────────────────────────────────
    host: str = "0.0.0.0"
    port: int = Field(default=8000, ge=1024, le=65535)
    workers: int = Field(default=4, ge=1, le=32)

    # ── Database ─────────────────────────────────────────────────────
    db_url: str = "postgresql+asyncpg://localhost:5432/intelliapi"
    db_pool_size: int = Field(default=20, ge=5, le=100)
    db_pool_overflow: int = Field(default=10, ge=0, le=50)

    # ── Redis ────────────────────────────────────────────────────────
    redis_url: str = "redis://localhost:6379/0"
    redis_ttl_seconds: int = Field(default=3600, ge=60)

    # ── ML Model ─────────────────────────────────────────────────────
    model_path: str = "./models/classifier_v1"
    model_max_batch_size: int = Field(default=32, ge=1, le=128)
    model_timeout_seconds: float = Field(default=5.0, ge=0.5, le=30.0)

    # ── External APIs ────────────────────────────────────────────────
    openai_api_key: SecretStr | None = None  # SecretStr hides value in logs

    @field_validator("db_url")
    @classmethod
    def validate_db_url(cls, v: str) -> str:
        if not v.startswith(("postgresql", "sqlite")):
            raise ValueError("Only PostgreSQL and SQLite are supported")
        return v


@lru_cache
def get_settings() -> Settings:
    """Singleton settings — loaded once, cached forever.

    Use as a FastAPI dependency:
        @app.get("/health")
        def health(settings: Settings = Depends(get_settings)):
            return {"version": settings.app_version}
    """
    return Settings()`,
          notes: [
            "env_prefix='INTELLIAPI_' means the db_url field reads from INTELLIAPI_DB_URL. This prevents collisions with other apps in the same environment.",
            "SecretStr wraps sensitive values. str(settings.openai_api_key) returns '**********'. Use .get_secret_value() when you actually need the value.",
            "@lru_cache ensures Settings() is only instantiated once. Without it, every request would re-read the .env file and environment variables.",
            "Validation happens at IMPORT time (when get_settings() first runs). A missing required env var crashes the app at startup, not at 2 AM when that code path first executes."
          ]
        },
        {
          type: "code",
          lang: "bash",
          filename: ".env",
          code: `# IntelliAPI local development configuration
INTELLIAPI_DEBUG=true
INTELLIAPI_LOG_LEVEL=DEBUG
INTELLIAPI_DB_URL=postgresql+asyncpg://postgres:secret@localhost:5432/intelliapi
INTELLIAPI_REDIS_URL=redis://localhost:6379/0
INTELLIAPI_MODEL_PATH=./models/classifier_v1
# INTELLIAPI_OPENAI_API_KEY=sk-...  # Uncomment when needed`,
          notes: [
            "NEVER commit .env to git. Add it to .gitignore immediately. Use .env.example with placeholder values for documentation."
          ]
        },
        {
          type: "heading",
          text: "Performance: Why the Rust Core Matters",
          level: 2
        },
        {
          type: "text",
          text: "Pydantic v2's Rust core (<code>pydantic-core</code>) isn't just an implementation detail — it directly affects your API's throughput and latency."
        },
        {
          type: "diagram",
          code: `Validation throughput: objects per second (higher = better)
══════════════════════════════════════════════════════════

Simple model (5 fields):
  Pydantic v1:  ████████████░░░░░░░░░░░░░░░░░░░░░░░░  340K/s
  Pydantic v2:  ████████████████████████████████████░░  3.2M/s  (9.4x)

Complex model (nested, 20+ fields):
  Pydantic v1:  ██████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  45K/s
  Pydantic v2:  ████████████████████████████████░░░░░░  890K/s  (19.8x)

JSON serialization:
  Pydantic v1:  ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░  120K/s
  Pydantic v2:  ████████████████████████████████████░░  2.1M/s  (17.5x)

At 10K requests/sec with a 20-field schema:
  v1 validation overhead: ~220ms per batch of 1000  → 2.2s total
  v2 validation overhead: ~1.1ms per batch of 1000  → 0.011s total`
        },
        {
          type: "text",
          text: "For IntelliAPI, this means validation is essentially free. Even at 10,000 requests/second, Pydantic v2 adds less than 1ms of overhead per request. With v1, validation alone could become a bottleneck at scale. The Rust core also means lower memory allocation — each validation creates fewer temporary Python objects, reducing GC pressure."
        },
        {
          type: "heading",
          text: "Advanced Patterns: Reusable Types",
          level: 2
        },
        {
          type: "code",
          lang: "python",
          filename: "app/schemas/common.py",
          code: `"""Reusable Pydantic types for IntelliAPI.

Define these once, use them across all schemas. Consistent
validation rules everywhere — one source of truth.
"""
from typing import Annotated

from pydantic import AfterValidator, Field, StringConstraints


# ── Custom annotated types ───────────────────────────────────────────

# Document text with validation
DocumentText = Annotated[
    str,
    StringConstraints(min_length=10, max_length=100_000, strip_whitespace=True),
]

# Confidence score (0.0 to 1.0, 4 decimal places max)
Confidence = Annotated[
    float,
    Field(ge=0.0, le=1.0),
    AfterValidator(lambda v: round(v, 4)),
]

# Pagination limit
PageSize = Annotated[
    int,
    Field(ge=1, le=100, default=20),
]

# Non-empty trimmed string
NonEmptyStr = Annotated[
    str,
    StringConstraints(min_length=1, strip_whitespace=True),
]


# ── Reusable base models ────────────────────────────────────────────

from pydantic import BaseModel, ConfigDict
from datetime import datetime


class TimestampMixin(BaseModel):
    """Adds created_at / updated_at to any model."""
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime | None = None


class PaginatedResponse(BaseModel):
    """Standard pagination wrapper."""
    model_config = ConfigDict(from_attributes=True)

    total: int = Field(..., ge=0)
    page: int = Field(..., ge=1)
    page_size: int = Field(..., ge=1, le=100)
    has_next: bool
    has_prev: bool


# Usage:
# class DocumentListResponse(PaginatedResponse):
#     items: list[DocumentSummary]`,
          notes: [
            "Annotated types compose constraints. DocumentText = Annotated[str, ...] is reusable across any schema that accepts document text.",
            "AfterValidator runs a function after Pydantic's core validation. Great for rounding, normalization, or transformation.",
            "from_attributes=True (was orm_mode in v1) allows creating Pydantic models from SQLAlchemy or other ORM objects: Model.model_validate(orm_obj).",
            "PaginatedResponse is a reusable base — every list endpoint inherits from it. Consistent pagination across your entire API."
          ]
        },
        {
          type: "heading",
          text: "Putting It All Together: Updated Classify Router",
          level: 2
        },
        {
          type: "code",
          lang: "python",
          filename: "app/routers/classify.py (updated with schemas)",
          code: `"""Classify router using the new schema layer."""
import asyncio
import time
import uuid

from fastapi import APIRouter, Depends, HTTPException

from app.schemas.documents import (
    ClassificationResponse,
    ClassificationScore,
    DocumentCategory,
    DocumentRequest,
)
from app.schemas.inputs import UnifiedDocumentRequest, TextInput, UrlInput
from app.core.config import Settings, get_settings

router = APIRouter(prefix="/api/v1", tags=["classification"])


@router.post(
    "/classify",
    response_model=ClassificationResponse,
    summary="Classify a document",
    response_description="Classification results with confidence scores",
)
async def classify_document(
    doc: DocumentRequest,
    settings: Settings = Depends(get_settings),
):
    """Classify a text document into predefined categories.

    - Validates input against DocumentRequest schema
    - Runs inference with configurable timeout
    - Returns sorted categories with confidence scores
    """
    start = time.perf_counter()

    try:
        categories = await asyncio.wait_for(
            _run_classifier(doc.text),
            timeout=settings.model_timeout_seconds,
        )
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=504,
            detail=f"Classification timed out after {settings.model_timeout_seconds}s",
        )

    elapsed_ms = (time.perf_counter() - start) * 1000

    return ClassificationResponse(
        document_id=str(uuid.uuid4()),
        categories=categories,
        model_version="0.1.0",
        processing_time_ms=round(elapsed_ms, 2),
    )


async def _run_classifier(text: str) -> list[ClassificationScore]:
    """Stub classifier — replaced with real model in Lesson 8."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _sync_classify, text)


def _sync_classify(text: str) -> list[ClassificationScore]:
    """Synchronous inference in threadpool."""
    time.sleep(0.05)  # Simulating model inference
    return [
        ClassificationScore(
            category=DocumentCategory.LEGAL_CONTRACT, confidence=0.87
        ),
        ClassificationScore(
            category=DocumentCategory.FINANCIAL_REPORT, confidence=0.09
        ),
        ClassificationScore(
            category=DocumentCategory.MEDICAL_RECORD, confidence=0.04
        ),
    ]`,
          notes: [
            "Settings injected via Depends(get_settings) — the timeout comes from config, not a hardcoded value.",
            "response_model ensures the return value passes through ClassificationResponse validation. If you return an extra field, it's stripped. If you forget a required field, you get a 500 (caught in testing, not production).",
            "Notice how clean the endpoint is — all validation is in the schema layer. The function only has business logic."
          ]
        },
        {
          type: "heading",
          text: "Schema Layer Architecture",
          level: 2
        },
        {
          type: "diagram",
          code: `IntelliAPI Schema Architecture
═══════════════════════════════

  app/schemas/
  ├── common.py        ← Reusable types: DocumentText, Confidence, PageSize
  ├── documents.py     ← DocumentRequest, ClassificationResponse, enums
  ├── inputs.py        ← Discriminated unions: TextInput, UrlInput, FileRefInput
  └── errors.py        ← Error response schemas (Lesson 6)

  app/core/
  └── config.py        ← Settings (Pydantic Settings)

  Flow:
  ┌─────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
  │ Request  │───▶│ Pydantic │───▶│ Endpoint │───▶│ Pydantic │───▶ Response
  │  JSON    │    │ Validate │    │  Logic   │    │Serialize │    JSON
  └─────────┘    └──────────┘    └──────────┘    └──────────┘
                    schemas/        routers/        schemas/
                  documents.py    classify.py     documents.py

  Schemas are the API CONTRACT. They live in their own layer.
  Routers import schemas — schemas never import routers.`
        },
        {
          type: "callout",
          variant: "interview",
          title: "Common Interview Questions",
          text: "<strong>Q: How does Pydantic v2 achieve 5-50x speedup over v1?</strong><br>A: Pydantic v2 rewrote the validation core in Rust (the <code>pydantic-core</code> crate). V1 used pure Python with heavy use of dict unpacking and runtime type inspection. V2 compiles a validation schema into a Rust data structure at class definition time, then runs validation in compiled Rust code — no Python interpreter overhead during actual validation. Serialization is similarly compiled. The result is less memory allocation, no Python object creation per field, and SIMD-optimized string processing.<br><br><strong>Q: What's the difference between @field_validator and @model_validator?</strong><br>A: @field_validator runs on a single field after type validation. It receives the field value and returns it (possibly modified). @model_validator runs on the entire model, either before individual fields are validated (mode='before', receives raw input dict) or after all fields are validated (mode='after', receives the model instance). Use field_validator for single-field rules (email format, string cleaning). Use model_validator for cross-field rules (end_date must be after start_date, either email or phone must be provided).<br><br><strong>Q: What is a discriminated union and when would you use one?</strong><br>A: A discriminated union is a type union where one field (the discriminator) determines which variant to use. Pydantic checks the discriminator field first, then validates against the matching model. Without discrimination, Pydantic tries every union member until one succeeds — O(n) with unhelpful error messages. With discrimination, it's O(1) with clear errors. Use it whenever your API accepts multiple input formats: text vs URL vs file upload, different event types in a webhook, different auth methods (API key vs OAuth vs JWT).<br><br><strong>Q: How do you handle sensitive configuration values in FastAPI?</strong><br>A: Use Pydantic's <code>SecretStr</code> type. It wraps the value so that <code>str()</code> and <code>repr()</code> return asterisks — the value never leaks into logs, tracebacks, or API responses. Access the actual value with <code>.get_secret_value()</code>. Combine this with Pydantic Settings to read secrets from environment variables or mounted secret files (Kubernetes Secrets). Never hardcode secrets; never commit .env files."
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 4: Dependency Injection & Application Lifecycle
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "dependency-injection-lifecycle",
      title: "Dependency Injection & Application Lifecycle",
      readTime: "25 min",
      content: [
        // ── Introduction ──────────────────────────────────────────────────
        { type: "heading", text: "Why Dependency Injection Matters", level: 2 },
        { type: "text", text: "Dependency Injection (DI) is the single most important architectural pattern in FastAPI. Unlike traditional Python frameworks where you import and instantiate resources inline, FastAPI's <code>Depends()</code> system lets you <strong>declare what a route needs</strong> and have the framework resolve, cache, and clean up those resources automatically." },
        { type: "text", text: "This isn't just academic IoC — it directly solves production problems: How do you share a database connection pool across routes? How do you load an ML model once at startup? How do you swap real services for mocks in tests? <code>Depends()</code> answers all of these." },

        { type: "comparison", headers: ["Without DI", "With FastAPI Depends()"], rows: [
          ["Import db module at top of every file", "Declare <code>db: Session = Depends(get_db)</code> — framework injects it"],
          ["Manual try/finally for resource cleanup", "Yield dependencies handle cleanup automatically"],
          ["Mocking requires monkeypatching imports", "<code>app.dependency_overrides[get_db] = mock_db</code>"],
          ["Hidden coupling between modules", "Explicit dependency tree visible in function signatures"],
          ["No caching — each call creates new resources", "Sub-dependencies resolved once per request by default"]
        ]},

        // ── Simple Dependencies ───────────────────────────────────────────
        { type: "heading", text: "Simple Dependencies: Functions as Injectables", level: 2 },
        { type: "text", text: "Any callable (function, class, or lambda) can be a dependency. FastAPI inspects its signature, resolves its parameters (including nested <code>Depends()</code>), and passes the return value into your route." },

        { type: "code", lang: "python", filename: "app/deps/database.py", code: `from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

DATABASE_URL = "postgresql+asyncpg://user:pass@localhost:5432/intelliapi"

engine = create_async_engine(DATABASE_URL, pool_size=20, max_overflow=10)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Yield a DB session — cleanup happens after yield."""
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise`, notes: [
          "The yield keyword makes this a generator dependency — code after yield runs during cleanup",
          "commit() on success, rollback() on exception — automatic transaction management",
          "The session is scoped to a single request — no cross-request leakage"
        ]},

        { type: "code", lang: "python", filename: "app/deps/settings.py", code: `from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://user:pass@localhost:5432/intelliapi"
    redis_url: str = "redis://localhost:6379/0"
    model_path: str = "./models/classifier_v2.onnx"
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    debug: bool = False

    model_config = {"env_prefix": "INTELLIAPI_"}


@lru_cache
def get_settings() -> Settings:
    """Cached settings — loaded once, reused everywhere."""
    return Settings()`, notes: [
          "@lru_cache ensures Settings is instantiated only once across all requests",
          "env_prefix means INTELLIAPI_DATABASE_URL env var maps to database_url field"
        ]},

        { type: "code", lang: "python", filename: "app/deps/auth.py", code: `from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps.database import get_db
from app.deps.settings import Settings, get_settings
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    settings: Settings = Depends(get_settings),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Decode JWT → load user from DB. Three nested deps resolved automatically."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = await db.get(User, int(user_id))
    if user is None:
        raise credentials_exception
    return user`, notes: [
          "get_current_user depends on THREE other deps — FastAPI resolves the entire tree",
          "oauth2_scheme extracts the Bearer token from the Authorization header",
          "get_settings is @lru_cache, so it's resolved once globally (not per-request)"
        ]},

        // ── Dependency Resolution Tree ────────────────────────────────────
        { type: "heading", text: "The Dependency Resolution Tree", level: 2 },
        { type: "text", text: "When FastAPI encounters a route with dependencies, it builds a <strong>directed acyclic graph (DAG)</strong> of all required dependencies and resolves them bottom-up. Each dependency is resolved only once per request, even if multiple routes or sub-deps reference it." },

        { type: "diagram", code: `
  POST /classify  (route handler)
       │
       ├── get_current_user
       │       ├── oauth2_scheme        (extracts Bearer token)
       │       ├── get_settings          (cached — @lru_cache)
       │       └── get_db                (yield dep — session)
       │
       ├── get_db  ◄── SAME instance as above (resolved once per request)
       │
       └── get_classifier_model
               └── get_settings  ◄── SAME cached instance

  Resolution order (bottom-up):
  1. get_settings (cached)          ─┐
  2. oauth2_scheme (from header)     ├─ parallel-safe
  3. get_db (yield → session)       ─┘
  4. get_current_user (needs 1,2,3)
  5. get_classifier_model (needs 1)
  6. Route handler receives all five resolved values
` },

        { type: "callout", variant: "info", title: "Per-Request Caching", text: "If <code>get_db</code> appears in both <code>get_current_user</code> and the route itself, FastAPI resolves it <strong>once</strong> and reuses the same session. This is per-request caching — not global. Each new request gets a fresh dependency graph." },

        // ── Yield Dependencies ────────────────────────────────────────────
        { type: "heading", text: "Yield Dependencies: Resource Cleanup", level: 2 },
        { type: "text", text: "Regular dependencies return a value. <strong>Yield dependencies</strong> use Python's <code>yield</code> keyword to provide a value and then run cleanup code after the response is sent. This is the pattern for anything that needs deterministic cleanup: DB sessions, file handles, HTTP clients, temporary directories." },

        { type: "code", lang: "python", filename: "app/deps/http_client.py", code: `from typing import AsyncGenerator
import httpx
from fastapi import Depends


async def get_http_client() -> AsyncGenerator[httpx.AsyncClient, None]:
    """Provide an HTTP client — closed after request completes."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        yield client


async def get_external_classifier(
    client: httpx.AsyncClient = Depends(get_http_client),
):
    """Sub-dependency that uses the HTTP client."""
    response = await client.get("https://model-registry.internal/v1/models/classifier")
    response.raise_for_status()
    return response.json()`, notes: [
          "async with ensures the client is properly closed even if the route raises an exception",
          "Cleanup code (after yield) runs AFTER the response is sent to the client",
          "Exception handling in yield deps: wrap yield in try/except/finally"
        ]},

        { type: "callout", variant: "warning", title: "Yield Dependencies and Exceptions", text: "If code <em>before</em> the yield raises, cleanup (after yield) does NOT run — there's nothing to clean up. If the <em>route handler</em> raises, the exception propagates into the yield dependency as a thrown exception. Use <code>try/yield/except/finally</code> if you need guaranteed cleanup regardless of success or failure." },

        // ── Lifespan ──────────────────────────────────────────────────────
        { type: "heading", text: "Application Lifespan: Startup & Shutdown", level: 2 },
        { type: "text", text: "Some resources should live for the <strong>entire application lifetime</strong>, not per-request. ML models, connection pools, and background schedulers belong here. FastAPI's <code>lifespan</code> context manager handles this." },

        { type: "code", lang: "python", filename: "app/main.py", code: `from contextlib import asynccontextmanager
from typing import AsyncGenerator
import onnxruntime as ort
import redis.asyncio as redis
from fastapi import FastAPI
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

from app.deps.settings import get_settings


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan — startup and shutdown logic."""
    settings = get_settings()

    # ── Startup ──────────────────────────────────────────────
    # 1. Database connection pool
    engine = create_async_engine(settings.database_url, pool_size=20)
    app.state.db_sessionmaker = async_sessionmaker(engine)

    # 2. Redis connection pool
    app.state.redis = redis.from_url(settings.redis_url)

    # 3. Load ML model into memory ONCE
    app.state.classifier = ort.InferenceSession(settings.model_path)
    print(f"Loaded classifier model from {settings.model_path}")

    yield  # ← Application runs here

    # ── Shutdown ─────────────────────────────────────────────
    await app.state.redis.close()
    await engine.dispose()
    print("Cleaned up all resources")


app = FastAPI(title="IntelliAPI", lifespan=lifespan)`, notes: [
          "Everything before yield runs at startup — everything after runs at shutdown",
          "app.state is the recommended way to store application-scoped resources",
          "The old @app.on_event('startup') decorator is deprecated — use lifespan instead"
        ]},

        { type: "code", lang: "python", filename: "app/deps/model.py", code: `from fastapi import Depends, Request
from onnxruntime import InferenceSession


def get_classifier(request: Request) -> InferenceSession:
    """Retrieve the ML model loaded at startup via lifespan."""
    return request.app.state.classifier


def get_redis(request: Request):
    """Retrieve the Redis client loaded at startup via lifespan."""
    return request.app.state.redis`, notes: [
          "Request object gives access to app.state — the bridge between lifespan and per-request deps",
          "These deps are cheap — they just return a reference, no resource creation"
        ]},

        { type: "diagram", code: `
  ┌─────────────────────────────────────────────────────────┐
  │                   APPLICATION LIFESPAN                   │
  │                                                         │
  │  STARTUP                          SHUTDOWN              │
  │  ├─ create DB engine              ├─ close Redis pool   │
  │  ├─ create Redis pool             ├─ dispose DB engine  │
  │  └─ load ML model (.onnx)        └─ log cleanup done   │
  │                                                         │
  │  ─────────── yield (app runs) ───────────               │
  │                                                         │
  │  Per-Request Dependency Layer:                          │
  │  ┌──────────────────────────────────────────┐          │
  │  │ get_db() ──yield──▶ AsyncSession         │          │
  │  │ get_classifier() ──▶ app.state reference  │          │
  │  │ get_redis() ──▶ app.state reference       │          │
  │  │ get_current_user() ──▶ User object        │          │
  │  └──────────────────────────────────────────┘          │
  └─────────────────────────────────────────────────────────┘
` },

        // ── Dependency Overrides for Testing ──────────────────────────────
        { type: "heading", text: "Dependency Overrides for Testing", level: 2 },
        { type: "text", text: "One of the killer features of FastAPI's DI system is <code>app.dependency_overrides</code>. You can swap any dependency with a mock for testing — no monkeypatching, no import tricks." },

        { type: "code", lang: "python", filename: "tests/conftest.py", code: `import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.main import app
from app.deps.database import get_db
from app.deps.auth import get_current_user
from app.models.user import User

TEST_DB_URL = "postgresql+asyncpg://user:pass@localhost:5432/intelliapi_test"
test_engine = create_async_engine(TEST_DB_URL)
TestSession = async_sessionmaker(test_engine, class_=AsyncSession)


async def override_get_db():
    async with TestSession() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def override_get_current_user():
    """Return a fake admin user — skip JWT validation entirely."""
    return User(id=1, email="test@example.com", role="admin")


@pytest.fixture
async def client():
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac

    app.dependency_overrides.clear()`, notes: [
          "dependency_overrides is a dict mapping original dep → replacement dep",
          "The replacement must have a compatible return type",
          "Always .clear() overrides after tests to avoid state leakage"
        ]},

        // ── IntelliAPI Wiring ─────────────────────────────────────────────
        { type: "heading", text: "IntelliAPI: Full Dependency Wiring", level: 2 },
        { type: "text", text: "Let's see how all these patterns come together in a real route. The <code>/classify</code> endpoint needs an authenticated user, a DB session, a cached Redis client, and the ML model — all injected through <code>Depends()</code>." },

        { type: "code", lang: "python", filename: "app/routes/classify.py", code: `from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from onnxruntime import InferenceSession
import redis.asyncio as redis
import json
import hashlib

from app.deps.database import get_db
from app.deps.auth import get_current_user
from app.deps.model import get_classifier, get_redis
from app.models.user import User
from app.schemas.classification import ClassifyRequest, ClassifyResponse

router = APIRouter(prefix="/classify", tags=["classification"])


@router.post("/", response_model=ClassifyResponse)
async def classify_document(
    request: ClassifyRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    model: InferenceSession = Depends(get_classifier),
    cache: redis.Redis = Depends(get_redis),
) -> ClassifyResponse:
    """Classify a document — with caching, auth, and DB logging."""

    # 1. Check cache
    cache_key = f"classify:{hashlib.sha256(request.text.encode()).hexdigest()}"
    cached = await cache.get(cache_key)
    if cached:
        return ClassifyResponse(**json.loads(cached))

    # 2. Run inference
    inputs = tokenize(request.text)  # your tokenization logic
    outputs = model.run(None, {"input": inputs})
    category = LABELS[outputs[0].argmax()]
    confidence = float(outputs[0].max())

    # 3. Build response
    result = ClassifyResponse(
        category=category,
        confidence=confidence,
        model_version="v2.1",
    )

    # 4. Cache for 1 hour
    await cache.setex(cache_key, 3600, result.model_dump_json())

    # 5. Log to DB (the session auto-commits via the yield dep)
    db.add(ClassificationLog(user_id=user.id, text=request.text[:500], result=category))

    return result`, notes: [
          "Five dependencies injected — FastAPI resolves the entire tree before calling the handler",
          "get_db yields a session → auto-commits after handler returns (or rolls back on exception)",
          "get_classifier and get_redis are just lookups into app.state — near-zero overhead"
        ]},

        // ── Class-Based Dependencies ──────────────────────────────────────
        { type: "heading", text: "Advanced: Class-Based Dependencies", level: 3 },
        { type: "text", text: "When a dependency needs configuration, you can use a class with <code>__call__</code>. This is useful for parameterized deps like rate limiters or permission checkers." },

        { type: "code", lang: "python", filename: "app/deps/permissions.py", code: `from fastapi import Depends, HTTPException, status
from app.deps.auth import get_current_user
from app.models.user import User


class RequireRole:
    """Class-based dependency — call with required role."""

    def __init__(self, required_role: str):
        self.required_role = required_role

    async def __call__(self, user: User = Depends(get_current_user)) -> User:
        if user.role != self.required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{self.required_role}' required",
            )
        return user


# Usage in routes:
# admin_only = RequireRole("admin")
# @router.get("/models", dependencies=[Depends(admin_only)])`, notes: [
          "__init__ receives config, __call__ receives injected deps — clean separation",
          "Use dependencies=[Depends(...)] when you need the check but don't need the return value"
        ]},

        { type: "callout", variant: "interview", title: "Interview Questions: Dependency Injection", text: "<strong>Q: How does FastAPI's Depends() differ from traditional DI containers like in Spring or .NET?</strong><br>A: FastAPI uses <em>function-based DI</em> — any callable is a dependency. No container registration, no XML config, no decorators on the dependency itself. Resolution is per-request with automatic caching of sub-dependencies within that request. Yield dependencies add RAII-style cleanup. The result is lighter weight and more Pythonic than class-heavy IoC containers.<br><br><strong>Q: How would you manage database connections in a FastAPI app handling 10K requests/second?</strong><br>A: Use a connection pool (SQLAlchemy's <code>pool_size</code> + <code>max_overflow</code>) created once at startup via lifespan. Each request gets a session from the pool via a yield dependency that auto-commits/rollbacks. The pool handles connection reuse — you never create raw connections per request. Monitor pool exhaustion with <code>pool_pre_ping=True</code> and metrics on checkout wait times.<br><br><strong>Q: How do you test a route that depends on an external ML model?</strong><br>A: Use <code>app.dependency_overrides[get_classifier] = lambda: mock_model</code> to inject a mock. The mock returns predetermined predictions, so tests are fast and deterministic. No monkeypatching, no import-time side effects." }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 5: Authentication & Authorization
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "authentication-authorization",
      title: "Authentication & Authorization",
      readTime: "28 min",
      content: [
        // ── Introduction ──────────────────────────────────────────────────
        { type: "heading", text: "Authentication vs. Authorization", level: 2 },
        { type: "text", text: "These two concepts are constantly confused. <strong>Authentication</strong> (AuthN) answers \"Who are you?\" — verifying identity via passwords, tokens, or certificates. <strong>Authorization</strong> (AuthZ) answers \"What can you do?\" — checking permissions after identity is established." },
        { type: "text", text: "In IntelliAPI, authentication gates every endpoint (you must prove you're a valid user), while authorization determines whether you can access admin-only model management endpoints or are limited to classification requests." },

        { type: "comparison", headers: ["Authentication (AuthN)", "Authorization (AuthZ)"], rows: [
          ["Verifies <strong>identity</strong>", "Verifies <strong>permissions</strong>"],
          ["Username/password, JWT, API key", "Roles, scopes, policies"],
          ["401 Unauthorized on failure", "403 Forbidden on failure"],
          ["Happens first", "Happens after authentication"],
          ["\"Are you who you claim to be?\"", "\"Are you allowed to do this?\""]
        ]},

        // ── OAuth2 Password Flow ──────────────────────────────────────────
        { type: "heading", text: "OAuth2 Password Flow with FastAPI", level: 2 },
        { type: "text", text: "FastAPI provides built-in security utilities that integrate with OpenAPI. The <code>OAuth2PasswordBearer</code> class creates a security scheme that extracts a Bearer token from the <code>Authorization</code> header and generates the login form in the Swagger UI." },

        { type: "diagram", code: `
  OAuth2 Password Flow:

  ┌──────────┐    POST /auth/token          ┌──────────────┐
  │  Client   │ ──────────────────────────▶  │  FastAPI      │
  │           │  { username, password }      │  /auth/token  │
  └──────────┘                               └──────┬───────┘
       ▲                                            │
       │                                   1. Verify password
       │                                   2. Generate JWT
       │                                            │
       │       { access_token, token_type }         │
       │ ◀──────────────────────────────────────────┘
       │
       │     GET /classify
       │     Authorization: Bearer <jwt>
       │ ─────────────────────────────────▶  ┌──────────────┐
       │                                     │  FastAPI      │
       │                                     │  /classify    │
       │                                     └──────┬───────┘
       │                                            │
       │                                   1. Extract token
       │                                   2. Decode JWT
       │                                   3. Load user
       │       { classification result }            │
       └ ◀──────────────────────────────────────────┘
` },

        // ── Password Hashing ──────────────────────────────────────────────
        { type: "heading", text: "Password Hashing with bcrypt", level: 2 },
        { type: "text", text: "Never store plaintext passwords. Use <code>bcrypt</code> — it's intentionally slow (configurable rounds) to resist brute-force attacks. The <code>passlib</code> library provides a clean interface." },

        { type: "code", lang: "python", filename: "app/auth/passwords.py", code: `from passlib.context import CryptContext

# bcrypt with automatic salt generation
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain_password: str) -> str:
    """Hash a plaintext password for storage."""
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against a stored hash."""
    return pwd_context.verify(plain_password, hashed_password)


# Example:
# hashed = hash_password("mysecretpassword")
# → "$2b$12$LJ3m4ys3Lg..."  (60-char bcrypt hash with embedded salt)
# verify_password("mysecretpassword", hashed)  → True
# verify_password("wrongpassword", hashed)     → False`, notes: [
          "bcrypt embeds the salt in the hash — no separate salt column needed",
          "deprecated='auto' will auto-rehash if you later add a stronger scheme",
          "Default bcrypt rounds (12) means ~250ms per hash — intentionally slow"
        ]},

        // ── JWT Tokens ────────────────────────────────────────────────────
        { type: "heading", text: "JWT Token Creation & Validation", level: 2 },
        { type: "text", text: "JSON Web Tokens (JWT) are the standard for stateless authentication. A JWT contains a <strong>header</strong> (algorithm), <strong>payload</strong> (claims like user ID, expiry), and <strong>signature</strong> (HMAC or RSA). The server signs the token at login and validates the signature on each request — no session storage needed." },

        { type: "code", lang: "python", filename: "app/auth/jwt.py", code: `from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from pydantic import BaseModel

from app.deps.settings import get_settings

settings = get_settings()

# Token expiry configuration
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7


class TokenPayload(BaseModel):
    sub: str          # Subject — user ID
    exp: datetime     # Expiry timestamp
    scopes: list[str] = []  # Permission scopes


def create_access_token(
    user_id: int,
    scopes: list[str] | None = None,
    expires_delta: timedelta | None = None,
) -> str:
    """Create a signed JWT access token."""
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    payload = {
        "sub": str(user_id),
        "exp": expire,
        "scopes": scopes or [],
        "type": "access",
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def create_refresh_token(user_id: int) -> str:
    """Create a longer-lived refresh token."""
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    payload = {
        "sub": str(user_id),
        "exp": expire,
        "type": "refresh",
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> TokenPayload:
    """Decode and validate a JWT. Raises JWTError on invalid/expired tokens."""
    payload = jwt.decode(
        token,
        settings.jwt_secret,
        algorithms=[settings.jwt_algorithm],
    )
    return TokenPayload(**payload)`, notes: [
          "sub (subject) is a standard JWT claim — always use it for user identity",
          "Access tokens are short-lived (30 min); refresh tokens are longer (7 days)",
          "python-jose handles signature verification and expiry checking automatically"
        ]},

        { type: "callout", variant: "warning", title: "JWT Security Pitfalls", text: "<strong>Never put sensitive data in JWT payloads</strong> — they're base64-encoded, not encrypted. Anyone can decode and read them. Only put user IDs and scopes in the payload.<br><br><strong>Always validate the algorithm</strong> — pass <code>algorithms=[\"HS256\"]</code> explicitly. The 'none' algorithm attack tricks servers into accepting unsigned tokens.<br><br><strong>Token revocation</strong> — JWTs are stateless, so you can't 'invalidate' one. Use short expiry times and maintain a blocklist in Redis for forced logouts." },

        // ── Login Endpoint ────────────────────────────────────────────────
        { type: "heading", text: "The Login Endpoint", level: 2 },

        { type: "code", lang: "python", filename: "app/routes/auth.py", code: `from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.passwords import verify_password
from app.auth.jwt import create_access_token, create_refresh_token
from app.deps.database import get_db
from app.models.user import User
from app.schemas.auth import TokenResponse

router = APIRouter(prefix="/auth", tags=["authentication"])


@router.post("/token", response_model=TokenResponse)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """OAuth2 password flow — returns access + refresh tokens."""

    # 1. Find user by email
    result = await db.execute(
        select(User).where(User.email == form_data.username)
    )
    user = result.scalar_one_or_none()

    # 2. Verify password (constant-time comparison via bcrypt)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 3. Generate tokens
    access_token = create_access_token(user.id, scopes=user.scopes)
    refresh_token = create_refresh_token(user.id)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
    )`, notes: [
          "OAuth2PasswordRequestForm is a special Depends() — it parses form data (not JSON)",
          "Same error message for wrong email and wrong password — prevents user enumeration",
          "The tokenUrl in OAuth2PasswordBearer must match this endpoint path"
        ]},

        // ── Security Dependency Chain ─────────────────────────────────────
        { type: "heading", text: "The Security Dependency Chain", level: 2 },
        { type: "text", text: "Authentication in FastAPI is built as a <strong>chain of dependencies</strong>, each adding a layer of verification. This is the dependency tree that runs on every protected request:" },

        { type: "diagram", code: `
  Security Dependency Chain:

  ┌─────────────────────────┐
  │  OAuth2PasswordBearer   │  Extracts "Bearer <token>" from
  │  (tokenUrl="/auth/token")│  Authorization header
  └────────────┬────────────┘
               │ token: str
               ▼
  ┌─────────────────────────┐
  │  decode_token()         │  Validates JWT signature + expiry
  │                         │  Returns TokenPayload
  └────────────┬────────────┘
               │ payload.sub → user_id
               ▼
  ┌─────────────────────────┐
  │  get_current_user()     │  Loads User from DB by ID
  │  + get_db() dependency  │  Returns User model
  └────────────┬────────────┘
               │ user: User
               ▼
  ┌─────────────────────────┐
  │  RequireRole("admin")   │  Checks user.role (optional)
  │  or check_scopes()      │  403 if insufficient permissions
  └────────────┬────────────┘
               │ user: User (verified)
               ▼
  ┌─────────────────────────┐
  │  Route Handler          │  Business logic runs with
  │  POST /classify         │  authenticated, authorized user
  └─────────────────────────┘
` },

        // ── Refresh Tokens ────────────────────────────────────────────────
        { type: "heading", text: "Refresh Tokens & Token Rotation", level: 2 },
        { type: "text", text: "Access tokens expire quickly (30 minutes). Rather than forcing users to log in again, a <strong>refresh token</strong> (longer-lived, 7 days) can be exchanged for a new access token. <strong>Token rotation</strong> means issuing a new refresh token each time, invalidating the old one." },

        { type: "code", lang: "python", filename: "app/routes/auth.py", code: `import redis.asyncio as redis_client
from app.auth.jwt import decode_token, create_access_token, create_refresh_token
from app.deps.model import get_redis


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    refresh_token: str,
    db: AsyncSession = Depends(get_db),
    cache: redis_client.Redis = Depends(get_redis),
) -> TokenResponse:
    """Exchange a refresh token for new access + refresh tokens."""

    # 1. Decode the refresh token
    try:
        payload = decode_token(refresh_token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Not a refresh token")

    # 2. Check if token is blocklisted (revoked)
    if await cache.get(f"blocklist:{refresh_token}"):
        raise HTTPException(status_code=401, detail="Token has been revoked")

    # 3. Blocklist the old refresh token (rotation)
    await cache.setex(
        f"blocklist:{refresh_token}",
        60 * 60 * 24 * 7,  # Keep in blocklist for 7 days
        "revoked",
    )

    # 4. Issue new token pair
    user_id = int(payload.sub)
    new_access = create_access_token(user_id)
    new_refresh = create_refresh_token(user_id)

    return TokenResponse(
        access_token=new_access,
        refresh_token=new_refresh,
        token_type="bearer",
    )`, notes: [
          "Token rotation: each refresh issues a NEW refresh token and blocklists the old one",
          "Redis blocklist detects stolen refresh tokens — if an old token is reused, reject it",
          "Blocklist TTL matches the refresh token expiry — no need to store forever"
        ]},

        // ── RBAC with Scopes ──────────────────────────────────────────────
        { type: "heading", text: "Role-Based Access Control (RBAC) with Scopes", level: 2 },
        { type: "text", text: "FastAPI's <code>SecurityScopes</code> integrates with OAuth2 scopes to provide fine-grained authorization. Scopes are strings like <code>classify:read</code>, <code>models:admin</code> that define what a token is allowed to do." },

        { type: "code", lang: "python", filename: "app/deps/auth.py", code: `from fastapi import Depends, HTTPException, Security, status
from fastapi.security import OAuth2PasswordBearer, SecurityScopes
from jose import JWTError, jwt

from app.deps.settings import get_settings
from app.deps.database import get_db
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/auth/token",
    scopes={
        "classify:read": "Submit documents for classification",
        "classify:write": "Create and manage classification jobs",
        "models:read": "View available models",
        "models:admin": "Deploy, update, and delete models",
        "users:admin": "Manage user accounts",
    },
)


async def get_current_user(
    security_scopes: SecurityScopes,
    token: str = Depends(oauth2_scheme),
    settings=Depends(get_settings),
    db=Depends(get_db),
) -> User:
    """Validate JWT and check required scopes."""
    if security_scopes.scopes:
        authenticate_value = f'Bearer scope="{security_scopes.scope_str}"'
    else:
        authenticate_value = "Bearer"

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": authenticate_value},
    )

    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        user_id: str = payload.get("sub")
        token_scopes: list[str] = payload.get("scopes", [])
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    # Check that token has all required scopes
    for scope in security_scopes.scopes:
        if scope not in token_scopes:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing required scope: {scope}",
                headers={"WWW-Authenticate": authenticate_value},
            )

    user = await db.get(User, int(user_id))
    if user is None:
        raise credentials_exception
    return user`, notes: [
          "SecurityScopes is injected by FastAPI — it knows which scopes the route requires",
          "Scopes are declared in the route: Security(get_current_user, scopes=['models:admin'])",
          "This generates proper OAuth2 scope documentation in the OpenAPI spec"
        ]},

        { type: "code", lang: "python", filename: "app/routes/models.py", code: `from fastapi import APIRouter, Security
from app.deps.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/models", tags=["models"])


@router.get("/")
async def list_models(
    user: User = Security(get_current_user, scopes=["models:read"]),
):
    """Any authenticated user with models:read scope can list models."""
    return {"models": ["classifier_v2", "summarizer_v1"]}


@router.delete("/{model_id}")
async def delete_model(
    model_id: str,
    user: User = Security(get_current_user, scopes=["models:admin"]),
):
    """Only users with models:admin scope can delete models."""
    return {"deleted": model_id}`, notes: [
          "Security() is like Depends() but carries scope information",
          "models:read allows viewing; models:admin allows destructive operations",
          "Swagger UI will show scope checkboxes when authenticating"
        ]},

        // ── API Key Auth ──────────────────────────────────────────────────
        { type: "heading", text: "API Key Authentication (Service-to-Service)", level: 2 },
        { type: "text", text: "Not all clients are humans with browsers. Service-to-service communication often uses <strong>API keys</strong> passed in headers. FastAPI supports this with <code>APIKeyHeader</code>." },

        { type: "code", lang: "python", filename: "app/deps/api_key.py", code: `from fastapi import Depends, HTTPException, Security, status
from fastapi.security import APIKeyHeader
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import hashlib

from app.deps.database import get_db
from app.models.api_key import APIKey

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


async def get_api_key_user(
    api_key: str | None = Security(api_key_header),
    db: AsyncSession = Depends(get_db),
):
    """Validate API key from X-API-Key header."""
    if api_key is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing X-API-Key header",
        )

    # Hash the key before lookup (store hashes, not plaintext keys)
    key_hash = hashlib.sha256(api_key.encode()).hexdigest()

    result = await db.execute(
        select(APIKey).where(APIKey.key_hash == key_hash, APIKey.is_active == True)
    )
    key_record = result.scalar_one_or_none()

    if key_record is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
        )

    return key_record  # Contains owner_id, scopes, rate_limit, etc.`, notes: [
          "API keys are hashed before storage — like passwords, never store plaintext",
          "auto_error=False lets us provide a custom error message instead of FastAPI's default",
          "Service accounts get API keys; human users get JWT tokens — different auth paths"
        ]},

        { type: "list", items: [
          "<strong>JWT tokens</strong> — for human users via browser/mobile apps. Short-lived, contain user identity and scopes.",
          "<strong>API keys</strong> — for service-to-service calls. Long-lived, tied to a service account, usually with fixed permissions.",
          "<strong>Mutual TLS (mTLS)</strong> — for high-security service mesh communication. Both sides present certificates. Handled at infrastructure level (Istio, Envoy), not in FastAPI.",
          "<strong>OAuth2 client credentials</strong> — for machine-to-machine. The service authenticates itself (no user involved) to get a token. Similar to API keys but with token rotation."
        ]},

        // ── IntelliAPI Protected Routes ───────────────────────────────────
        { type: "heading", text: "IntelliAPI: Protecting Endpoints", level: 2 },
        { type: "text", text: "Here's how IntelliAPI uses both JWT and API key auth, with different authorization levels:" },

        { type: "code", lang: "python", filename: "app/routes/classify.py", code: `from fastapi import APIRouter, Depends, Security
from app.deps.auth import get_current_user
from app.deps.api_key import get_api_key_user
from app.models.user import User

router = APIRouter(prefix="/classify", tags=["classification"])


async def get_authenticated_entity(
    jwt_user: User | None = Depends(get_current_user_optional),
    api_key=Depends(get_api_key_user_optional),
):
    """Accept EITHER JWT or API key authentication."""
    if jwt_user:
        return {"type": "user", "id": jwt_user.id, "scopes": jwt_user.scopes}
    if api_key:
        return {"type": "service", "id": api_key.owner_id, "scopes": api_key.scopes}
    raise HTTPException(status_code=401, detail="Authentication required")


@router.post("/")
async def classify_document(
    request: ClassifyRequest,
    auth=Depends(get_authenticated_entity),
):
    """Accepts both JWT tokens (users) and API keys (services)."""
    # auth["type"] tells us if it's a human or service
    # auth["scopes"] controls what they can do
    ...


@router.get("/admin/models")
async def manage_models(
    user: User = Security(get_current_user, scopes=["models:admin"]),
):
    """JWT only, admin scope required — no API key access."""
    ...`, notes: [
          "Dual auth: some endpoints accept both JWT and API keys",
          "Admin endpoints are JWT-only with explicit scope requirements",
          "The 'optional' variants return None instead of raising — letting us check both"
        ]},

        { type: "callout", variant: "interview", title: "Interview Questions: Authentication & Authorization", text: "<strong>Q: Why use JWT instead of session-based authentication for an API?</strong><br>A: JWTs are <em>stateless</em> — the server doesn't need to store sessions. This is critical for horizontal scaling: any server instance can validate the token without hitting a shared session store. Trade-offs: you can't easily revoke JWTs (use short expiry + refresh tokens + Redis blocklist), and the payload increases request size.<br><br><strong>Q: How would you implement 'logout' with JWT tokens?</strong><br>A: Add the token's <code>jti</code> (JWT ID) to a Redis blocklist with TTL matching the token's remaining lifetime. Check the blocklist in <code>get_current_user</code>. This is the standard 'token revocation' pattern — it adds a small statefulness cost but is necessary for security features like forced logout and compromised token invalidation.<br><br><strong>Q: How do you prevent timing attacks on password verification?</strong><br>A: bcrypt's <code>verify()</code> uses constant-time comparison — it takes the same time whether the password is wrong at byte 1 or byte 60. Also, always return the same error for 'user not found' and 'wrong password' to prevent user enumeration." }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 6: Middleware, Error Handling & Structured Logging
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "middleware-error-handling-logging",
      title: "Middleware, Error Handling & Structured Logging",
      readTime: "26 min",
      content: [
        // ── Introduction ──────────────────────────────────────────────────
        { type: "heading", text: "The Three Pillars of Production APIs", level: 2 },
        { type: "text", text: "Any FastAPI app can handle requests. A <strong>production</strong> FastAPI app needs three additional systems: <strong>middleware</strong> for cross-cutting concerns (timing, auth, CORS), <strong>error handling</strong> for graceful failure (structured errors, not stack traces), and <strong>structured logging</strong> for observability (JSON logs with request context, not print statements)." },

        { type: "list", items: [
          "<strong>Middleware</strong> — Code that runs on <em>every</em> request/response. Adds headers, measures timing, enforces rate limits, handles CORS.",
          "<strong>Error Handling</strong> — Catches exceptions and converts them into consistent, documented API error responses. Prevents leaking internal details.",
          "<strong>Structured Logging</strong> — JSON-formatted logs with correlation IDs, request context, and timing. Makes logs searchable and parseable by ELK/Datadog/CloudWatch."
        ]},

        // ── Middleware Pipeline ───────────────────────────────────────────
        { type: "heading", text: "The FastAPI Middleware Pipeline", level: 2 },
        { type: "text", text: "Middleware wraps the entire request-response cycle. Each middleware can modify the request before it reaches the route, and modify the response before it's sent to the client. Middleware executes in <strong>reverse order</strong> of registration (last registered = outermost layer)." },

        { type: "diagram", code: `
  Incoming Request
       │
       ▼
  ┌──────────────────┐
  │  CORS Middleware  │  ← Last added = outermost (runs first)
  │  (add headers)   │
  └────────┬─────────┘
           ▼
  ┌──────────────────┐
  │ Request ID MW    │  ← Generate/extract X-Request-ID
  │ (inject ID)      │
  └────────┬─────────┘
           ▼
  ┌──────────────────┐
  │ Timing Middleware │  ← Record start time
  │ (measure latency)│
  └────────┬─────────┘
           ▼
  ┌──────────────────┐
  │ Rate Limit MW    │  ← Check Redis counter
  │ (throttle)       │
  └────────┬─────────┘
           ▼
  ┌──────────────────┐
  │   Exception      │  ← Catch unhandled exceptions
  │   Handlers       │
  └────────┬─────────┘
           ▼
  ┌──────────────────┐
  │  Route Handler   │  ← Your business logic
  │  POST /classify  │
  └────────┬─────────┘
           ▼
       Response flows back UP through each middleware
       (timing MW adds X-Process-Time header, etc.)
` },

        // ── CORS Middleware ───────────────────────────────────────────────
        { type: "heading", text: "CORS Middleware Configuration", level: 2 },
        { type: "text", text: "Cross-Origin Resource Sharing (CORS) is required when your frontend (e.g., <code>app.intelliapi.com</code>) calls your API (<code>api.intelliapi.com</code>). Without CORS headers, browsers block the request. FastAPI provides <code>CORSMiddleware</code> out of the box." },

        { type: "code", lang: "python", filename: "app/main.py", code: `from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="IntelliAPI")

# CORS — configure for your frontend origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://app.intelliapi.com",
        "https://admin.intelliapi.com",
        "http://localhost:3000",  # Local dev
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID", "X-Process-Time"],
    max_age=600,  # Preflight cache: 10 minutes
)`, notes: [
          "Never use allow_origins=['*'] in production with allow_credentials=True",
          "expose_headers lets the frontend read custom headers like X-Request-ID",
          "max_age reduces preflight OPTIONS requests — browser caches the CORS policy"
        ]},

        { type: "callout", variant: "warning", title: "CORS allow_origins=['*'] Trap", text: "Using <code>allow_origins=['*']</code> with <code>allow_credentials=True</code> is <strong>invalid per the CORS spec</strong>. Browsers will reject it. If you need credentials (cookies/auth headers), you must list specific origins. FastAPI will silently allow this misconfiguration but browsers will block requests." },

        // ── Custom Middleware ─────────────────────────────────────────────
        { type: "heading", text: "Custom Middleware: Request ID, Timing, Rate Limiting", level: 2 },
        { type: "text", text: "FastAPI supports two middleware styles: <code>@app.middleware(\"http\")</code> for simple cases, and <code>BaseHTTPMiddleware</code> subclasses for reusable middleware. For best performance, you can also use raw ASGI middleware." },

        { type: "heading", text: "Request ID Middleware", level: 3 },
        { type: "code", lang: "python", filename: "app/middleware/request_id.py", code: `import uuid
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


class RequestIDMiddleware(BaseHTTPMiddleware):
    """Inject a unique request ID into every request/response."""

    async def dispatch(self, request: Request, call_next) -> Response:
        # Use client-provided ID (for tracing) or generate one
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))

        # Store on request state for access in route handlers and deps
        request.state.request_id = request_id

        # Process the request
        response = await call_next(request)

        # Add request ID to response headers
        response.headers["X-Request-ID"] = request_id
        return response`, notes: [
          "request.state is a Starlette feature — arbitrary per-request storage",
          "Accepting X-Request-ID from clients enables distributed tracing across services",
          "The response header lets clients correlate their request with server logs"
        ]},

        { type: "heading", text: "Timing Middleware", level: 3 },
        { type: "code", lang: "python", filename: "app/middleware/timing.py", code: `import time
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


class TimingMiddleware(BaseHTTPMiddleware):
    """Measure and report request processing time."""

    async def dispatch(self, request: Request, call_next) -> Response:
        start_time = time.perf_counter()

        response = await call_next(request)

        process_time = time.perf_counter() - start_time
        response.headers["X-Process-Time"] = f"{process_time:.4f}"

        # Log slow requests
        if process_time > 1.0:
            import structlog
            logger = structlog.get_logger()
            logger.warning(
                "slow_request",
                path=request.url.path,
                method=request.method,
                duration_s=round(process_time, 4),
            )

        return response`, notes: [
          "time.perf_counter() is the most accurate timer for measuring elapsed time",
          "X-Process-Time header lets clients and load balancers see backend latency",
          "Slow request logging (>1s) helps identify performance bottlenecks"
        ]},

        { type: "heading", text: "Rate Limiting Middleware", level: 3 },
        { type: "code", lang: "python", filename: "app/middleware/rate_limit.py", code: `import time
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, JSONResponse


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Token bucket rate limiter using Redis."""

    def __init__(self, app, redis_client, requests_per_minute: int = 60):
        super().__init__(app)
        self.redis = redis_client
        self.rpm = requests_per_minute

    async def dispatch(self, request: Request, call_next) -> Response:
        # Identify client by API key or IP
        client_id = (
            request.headers.get("X-API-Key")
            or request.client.host
            or "unknown"
        )
        key = f"ratelimit:{client_id}:{int(time.time()) // 60}"

        # Atomic increment + expire
        pipe = self.redis.pipeline()
        pipe.incr(key)
        pipe.expire(key, 60)
        results = await pipe.execute()
        current_count = results[0]

        # Set rate limit headers (always, not just on 429)
        remaining = max(0, self.rpm - current_count)

        if current_count > self.rpm:
            return JSONResponse(
                status_code=429,
                content={
                    "error": "rate_limit_exceeded",
                    "detail": f"Rate limit: {self.rpm} requests/minute",
                    "retry_after_seconds": 60 - (int(time.time()) % 60),
                },
                headers={
                    "X-RateLimit-Limit": str(self.rpm),
                    "X-RateLimit-Remaining": "0",
                    "Retry-After": str(60 - (int(time.time()) % 60)),
                },
            )

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(self.rpm)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        return response`, notes: [
          "Fixed-window rate limiting: count resets every minute boundary",
          "Redis pipeline makes the incr+expire atomic — no race conditions",
          "Always return rate limit headers so clients can self-throttle"
        ]},

        // ── Exception Handling ────────────────────────────────────────────
        { type: "heading", text: "Exception Handling: Structured Error Responses", level: 2 },
        { type: "text", text: "FastAPI's default error responses are functional but inconsistent. Production APIs need a <strong>uniform error format</strong> across all error types: validation errors, business logic errors, auth errors, and unexpected server errors." },

        { type: "code", lang: "python", filename: "app/errors/schemas.py", code: `from pydantic import BaseModel


class ErrorResponse(BaseModel):
    """Standard error response format for all IntelliAPI errors."""
    error: str          # Machine-readable error code
    detail: str         # Human-readable message
    request_id: str     # For support/debugging correlation
    path: str           # Request path that failed
    status_code: int    # HTTP status code

    # Optional fields for validation errors
    errors: list[dict] | None = None  # Field-level validation errors`, notes: [
          "Machine-readable 'error' field lets clients handle errors programmatically",
          "request_id enables 'please contact support with this ID' workflows"
        ]},

        { type: "code", lang: "python", filename: "app/errors/exceptions.py", code: `from fastapi import HTTPException


class IntelliAPIError(Exception):
    """Base exception for all IntelliAPI business logic errors."""

    def __init__(self, error: str, detail: str, status_code: int = 400):
        self.error = error
        self.detail = detail
        self.status_code = status_code


class ModelNotFoundError(IntelliAPIError):
    def __init__(self, model_id: str):
        super().__init__(
            error="model_not_found",
            detail=f"Model '{model_id}' not found or not deployed",
            status_code=404,
        )


class ClassificationError(IntelliAPIError):
    def __init__(self, reason: str):
        super().__init__(
            error="classification_failed",
            detail=f"Classification failed: {reason}",
            status_code=422,
        )


class QuotaExceededError(IntelliAPIError):
    def __init__(self, limit: int):
        super().__init__(
            error="quota_exceeded",
            detail=f"Monthly classification quota ({limit}) exceeded",
            status_code=429,
        )`, notes: [
          "Custom exception hierarchy makes error handling consistent across the app",
          "Each exception knows its own error code and HTTP status",
          "Business logic raises these — exception handlers convert them to responses"
        ]},

        { type: "code", lang: "python", filename: "app/errors/handlers.py", code: `import traceback
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
import structlog

from app.errors.exceptions import IntelliAPIError
from app.errors.schemas import ErrorResponse

logger = structlog.get_logger()


def register_exception_handlers(app: FastAPI) -> None:
    """Register all exception handlers on the FastAPI app."""

    @app.exception_handler(IntelliAPIError)
    async def intelliapi_error_handler(request: Request, exc: IntelliAPIError):
        """Handle custom business logic errors."""
        request_id = getattr(request.state, "request_id", "unknown")
        logger.warning(
            "business_error",
            error=exc.error,
            detail=exc.detail,
            status_code=exc.status_code,
            request_id=request_id,
            path=str(request.url.path),
        )
        return JSONResponse(
            status_code=exc.status_code,
            content=ErrorResponse(
                error=exc.error,
                detail=exc.detail,
                request_id=request_id,
                path=str(request.url.path),
                status_code=exc.status_code,
            ).model_dump(),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(request: Request, exc: RequestValidationError):
        """Handle Pydantic validation errors with structured details."""
        request_id = getattr(request.state, "request_id", "unknown")
        errors = []
        for err in exc.errors():
            errors.append({
                "field": " → ".join(str(loc) for loc in err["loc"]),
                "message": err["msg"],
                "type": err["type"],
            })
        logger.info(
            "validation_error",
            error_count=len(errors),
            request_id=request_id,
            path=str(request.url.path),
        )
        return JSONResponse(
            status_code=422,
            content=ErrorResponse(
                error="validation_error",
                detail=f"{len(errors)} validation error(s)",
                request_id=request_id,
                path=str(request.url.path),
                status_code=422,
                errors=errors,
            ).model_dump(),
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_error_handler(request: Request, exc: StarletteHTTPException):
        """Handle standard HTTP exceptions (404, 405, etc.)."""
        request_id = getattr(request.state, "request_id", "unknown")
        return JSONResponse(
            status_code=exc.status_code,
            content=ErrorResponse(
                error="http_error",
                detail=str(exc.detail),
                request_id=request_id,
                path=str(request.url.path),
                status_code=exc.status_code,
            ).model_dump(),
        )

    @app.exception_handler(Exception)
    async def unhandled_error_handler(request: Request, exc: Exception):
        """Catch-all for unexpected errors — log full traceback, return safe message."""
        request_id = getattr(request.state, "request_id", "unknown")
        logger.error(
            "unhandled_exception",
            error_type=type(exc).__name__,
            error_message=str(exc),
            traceback=traceback.format_exc(),
            request_id=request_id,
            path=str(request.url.path),
        )
        # NEVER expose internal error details to clients
        return JSONResponse(
            status_code=500,
            content=ErrorResponse(
                error="internal_server_error",
                detail="An unexpected error occurred. Contact support with the request ID.",
                request_id=request_id,
                path=str(request.url.path),
                status_code=500,
            ).model_dump(),
        )`, notes: [
          "Four handlers cover ALL error types: business, validation, HTTP, and unexpected",
          "The catch-all handler logs the full traceback but returns a safe message to the client",
          "Every error response includes request_id for debugging correlation"
        ]},

        { type: "callout", variant: "info", title: "Exception Handler Order", text: "FastAPI matches exception handlers from <strong>most specific to least specific</strong>. <code>IntelliAPIError</code> is caught before <code>Exception</code>. If you have <code>ModelNotFoundError(IntelliAPIError)</code>, the <code>IntelliAPIError</code> handler catches it — you don't need a separate handler for each subclass unless you want different behavior." },

        // ── Structured Logging ────────────────────────────────────────────
        { type: "heading", text: "Structured Logging with structlog", level: 2 },
        { type: "text", text: "Traditional <code>logging.info(\"User %s classified doc %s\")</code> produces flat text that's difficult to search. <strong>Structured logging</strong> produces JSON with key-value pairs, making logs searchable in ELK, Datadog, or CloudWatch Logs Insights." },

        { type: "comparison", headers: ["Traditional Logging", "Structured Logging (structlog)"], rows: [
          ["<code>INFO: User 42 classified doc abc</code>", "<code>{\"event\": \"classified\", \"user_id\": 42, \"doc_id\": \"abc\", \"level\": \"info\"}</code>"],
          ["Regex parsing required", "Native JSON — query with JQ, Datadog, etc."],
          ["No request context", "request_id, user_id bound to all log entries"],
          ["Hard to filter in production", "<code>level:error AND user_id:42</code>"],
          ["String formatting overhead", "Lazy evaluation — only formats if level enabled"]
        ]},

        { type: "code", lang: "python", filename: "app/logging_config.py", code: `import logging
import structlog


def setup_logging(json_output: bool = True, log_level: str = "INFO") -> None:
    """Configure structlog for production JSON or dev console output."""

    # Shared processors (run on every log entry)
    shared_processors = [
        structlog.contextvars.merge_contextvars,   # Merge request context
        structlog.stdlib.add_log_level,             # Add "level" field
        structlog.stdlib.add_logger_name,           # Add "logger" field
        structlog.processors.TimeStamper(fmt="iso"), # ISO 8601 timestamps
        structlog.processors.StackInfoRenderer(),    # Stack traces
        structlog.processors.UnicodeDecoder(),       # Handle unicode
    ]

    if json_output:
        # Production: JSON output
        renderer = structlog.processors.JSONRenderer()
    else:
        # Development: colored console output
        renderer = structlog.dev.ConsoleRenderer(colors=True)

    structlog.configure(
        processors=[
            *shared_processors,
            structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
        ],
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )

    # Configure stdlib logging to use structlog
    formatter = structlog.stdlib.ProcessorFormatter(
        processors=[
            structlog.stdlib.ProcessorFormatter.remove_processors_meta,
            renderer,
        ],
    )

    handler = logging.StreamHandler()
    handler.setFormatter(formatter)

    root_logger = logging.getLogger()
    root_logger.handlers.clear()
    root_logger.addHandler(handler)
    root_logger.setLevel(log_level)

    # Quiet noisy libraries
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)`, notes: [
          "merge_contextvars pulls in request-scoped context (request_id, user_id)",
          "JSON in production, colored console in development — same code path",
          "Silencing noisy loggers prevents log flooding from uvicorn access logs"
        ]},

        // ── Request Context Propagation ───────────────────────────────────
        { type: "heading", text: "Request Context Propagation", level: 2 },
        { type: "text", text: "The key to useful structured logging is <strong>context propagation</strong>. Every log entry during a request should include the <code>request_id</code> and <code>user_id</code> — without manually passing them through every function call. structlog's <code>contextvars</code> integration handles this." },

        { type: "code", lang: "python", filename: "app/middleware/logging_context.py", code: `import structlog
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


class LoggingContextMiddleware(BaseHTTPMiddleware):
    """Bind request context to all log entries within the request."""

    async def dispatch(self, request: Request, call_next) -> Response:
        # Clear previous request's context
        structlog.contextvars.clear_contextvars()

        # Bind context that will appear in ALL log entries for this request
        structlog.contextvars.bind_contextvars(
            request_id=getattr(request.state, "request_id", "unknown"),
            method=request.method,
            path=request.url.path,
            client_ip=request.client.host if request.client else "unknown",
        )

        logger = structlog.get_logger()
        logger.info("request_started")

        response = await call_next(request)

        # Add response info to context
        structlog.contextvars.bind_contextvars(
            status_code=response.status_code,
        )
        logger.info("request_completed")

        # Clear context after request
        structlog.contextvars.clear_contextvars()

        return response`, notes: [
          "bind_contextvars uses Python's contextvars — async-safe, per-request isolation",
          "Every logger.info/warning/error call ANYWHERE in this request includes these fields",
          "clear_contextvars prevents context leakage between requests"
        ]},

        { type: "text", text: "Now any code in the request chain — route handlers, dependencies, service layers, even database query logging — automatically includes the request context:" },

        { type: "code", lang: "python", filename: "app/services/classifier.py", code: `import structlog

logger = structlog.get_logger()


async def run_classification(text: str, model_name: str) -> dict:
    """Classify text — all logs automatically include request_id."""
    logger.info("classification_started", model=model_name, text_length=len(text))

    # ... model inference logic ...

    logger.info("classification_completed", model=model_name, category="finance", confidence=0.94)

    return {"category": "finance", "confidence": 0.94}

# Output (every log entry includes request_id, method, path from middleware):
# {"event": "classification_started", "model": "v2", "text_length": 1523,
#  "request_id": "abc-123", "method": "POST", "path": "/classify",
#  "client_ip": "10.0.0.5", "level": "info", "timestamp": "2024-01-15T10:30:00Z"}`, notes: [
          "Notice: no request_id parameter passed to run_classification — it's in contextvars",
          "This is the power of structured logging — context flows automatically",
          "These JSON logs are directly queryable in ELK: request_id:abc-123"
        ]},

        // ── Full Middleware Stack ─────────────────────────────────────────
        { type: "heading", text: "IntelliAPI: Full Middleware Stack", level: 2 },
        { type: "text", text: "Here's how all the middleware, error handlers, and logging come together in the IntelliAPI application factory:" },

        { type: "code", lang: "python", filename: "app/main.py", code: `from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.logging_config import setup_logging
from app.deps.settings import get_settings
from app.errors.handlers import register_exception_handlers
from app.middleware.request_id import RequestIDMiddleware
from app.middleware.timing import TimingMiddleware
from app.middleware.logging_context import LoggingContextMiddleware
from app.middleware.rate_limit import RateLimitMiddleware


@asynccontextmanager
async def lifespan(app):
    settings = get_settings()
    setup_logging(json_output=not settings.debug)

    # Startup: load resources
    import redis.asyncio as redis
    app.state.redis = redis.from_url(settings.redis_url)
    # ... load ML model, DB engine, etc.

    yield

    # Shutdown: cleanup
    await app.state.redis.close()


def create_app() -> FastAPI:
    """Application factory — creates and configures the FastAPI app."""
    app = FastAPI(
        title="IntelliAPI",
        version="1.0.0",
        lifespan=lifespan,
    )

    # ── Middleware (order matters! Last added = outermost = runs first) ──

    # 4. Rate limiting (innermost — closest to route)
    # Added after startup since it needs Redis
    # app.add_middleware(RateLimitMiddleware, redis_client=app.state.redis, rpm=100)

    # 3. Logging context (binds request_id to all logs)
    app.add_middleware(LoggingContextMiddleware)

    # 2. Timing (measures total request duration)
    app.add_middleware(TimingMiddleware)

    # 1. Request ID (outermost — runs first, generates ID)
    app.add_middleware(RequestIDMiddleware)

    # 0. CORS (absolute outermost — handles preflight before anything else)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["https://app.intelliapi.com", "http://localhost:3000"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID", "X-Process-Time"],
    )

    # ── Exception handlers ──
    register_exception_handlers(app)

    # ── Routes ──
    from app.routes import auth, classify, models
    app.include_router(auth.router)
    app.include_router(classify.router)
    app.include_router(models.router)

    return app


app = create_app()`, notes: [
          "Application factory pattern: create_app() makes testing easier",
          "Middleware order is critical: CORS → Request ID → Timing → Logging → Rate Limit",
          "setup_logging switches between JSON (prod) and colored console (dev) based on settings.debug"
        ]},

        { type: "diagram", code: `
  IntelliAPI Request Lifecycle:

  Client Request
       │
       ├─▶ CORS Middleware (preflight handling)
       ├─▶ Request ID MW (generate/extract X-Request-ID)
       ├─▶ Timing MW (start timer)
       ├─▶ Logging Context MW (bind request_id to logs)
       ├─▶ Rate Limit MW (check Redis counter)
       │
       ├─▶ Exception Handlers (catch any error below)
       │       ├── IntelliAPIError → structured business error
       │       ├── ValidationError → field-level details
       │       ├── HTTPException → standard HTTP error
       │       └── Exception → safe 500 + full traceback logged
       │
       ├─▶ Dependency Injection
       │       ├── get_current_user (JWT validation)
       │       ├── get_db (yield → session)
       │       └── get_classifier (app.state reference)
       │
       └─▶ Route Handler (business logic)
               │
               ▼
          Response flows back UP:
          ├── DB session commits/rollbacks (yield dep cleanup)
          ├── Rate limit headers added
          ├── request_completed logged (with status_code)
          ├── X-Process-Time header added
          ├── X-Request-ID header added
          └── CORS headers added
` },

        { type: "callout", variant: "info", title: "BaseHTTPMiddleware vs Pure ASGI", text: "FastAPI's <code>BaseHTTPMiddleware</code> is convenient but has a known limitation: it <strong>reads the entire response body into memory</strong> before passing it up. For streaming responses or large file downloads, use pure ASGI middleware instead:<br><br><code>class PureASGIMiddleware:</code><br><code>&nbsp;&nbsp;def __init__(self, app): self.app = app</code><br><code>&nbsp;&nbsp;async def __call__(self, scope, receive, send): ...</code><br><br>For most API endpoints returning JSON, BaseHTTPMiddleware is perfectly fine." },

        // ── Production Logging Patterns ───────────────────────────────────
        { type: "heading", text: "Production Logging Patterns", level: 3 },

        { type: "code", lang: "python", filename: "app/services/audit.py", code: `import structlog

logger = structlog.get_logger()


async def log_classification_audit(
    user_id: int,
    document_id: str,
    result: str,
    confidence: float,
    model_version: str,
    latency_ms: float,
) -> None:
    """Structured audit log for every classification — searchable and alertable."""
    logger.info(
        "classification_audit",
        user_id=user_id,
        document_id=document_id,
        result=result,
        confidence=confidence,
        model_version=model_version,
        latency_ms=round(latency_ms, 2),
    )

    # Alert on low confidence (potential model degradation)
    if confidence < 0.5:
        logger.warning(
            "low_confidence_classification",
            user_id=user_id,
            document_id=document_id,
            confidence=confidence,
            model_version=model_version,
        )

# JSON output in production:
# {
#   "event": "classification_audit",
#   "user_id": 42,
#   "document_id": "doc_abc123",
#   "result": "financial_report",
#   "confidence": 0.94,
#   "model_version": "v2.1",
#   "latency_ms": 145.23,
#   "request_id": "req_xyz789",      ← from contextvars
#   "method": "POST",                ← from contextvars
#   "path": "/classify",             ← from contextvars
#   "level": "info",
#   "timestamp": "2024-01-15T10:30:00.123Z"
# }`, notes: [
          "Audit logs are separate from application logs — they track business events",
          "Low confidence alerts can trigger Datadog/PagerDuty alerts via log-based monitors",
          "All context fields (request_id, method, path) added automatically by structlog"
        ]},

        { type: "callout", variant: "interview", title: "Interview Questions: Middleware, Error Handling & Logging", text: "<strong>Q: In what order do FastAPI middleware execute, and why does it matter?</strong><br>A: Middleware added <em>last</em> runs <em>first</em> (outermost layer). This matters because: (1) CORS must be outermost to handle preflight OPTIONS requests before any auth checks, (2) Request ID must run before logging so the ID is available in log context, (3) Timing must wrap everything to measure total request time. Getting the order wrong causes subtle bugs like missing CORS headers on error responses or missing request IDs in logs.<br><br><strong>Q: How would you implement consistent error responses across a microservice fleet?</strong><br>A: Define a shared error schema (error code, detail, request_id, path) as a Pydantic model in a shared library. Register exception handlers for all error categories: validation, business logic, HTTP, and unhandled. The catch-all handler logs full tracebacks but returns safe messages. Publish the error schema in OpenAPI specs so clients can deserialize any error response.<br><br><strong>Q: What is structured logging and why is it essential for production APIs?</strong><br>A: Structured logging outputs JSON key-value pairs instead of flat text strings. This enables: (1) querying logs with field filters (<code>user_id:42 AND level:error</code>), (2) automatic parsing by log aggregators (ELK, Datadog, CloudWatch), (3) request context propagation via contextvars so every log entry includes the request_id without passing it through every function. The alternative — regex parsing text logs — is brittle and doesn't scale." }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 7 — Testing FastAPI Applications
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "testing-fastapi-applications",
      title: "Testing FastAPI Applications",
      readTime: "25 min",
      content: [
        { type: "text", text: "Production APIs need production-grade tests. FastAPI's architecture — dependency injection, Pydantic validation, async-first design — makes it one of the <strong>most testable</strong> Python frameworks. In this lesson we build a comprehensive test suite for IntelliAPI's <code>/classify</code> endpoint, covering the full testing pyramid." },

        { type: "heading", text: "The Testing Pyramid for FastAPI", level: 2 },

        { type: "diagram", code: `
                    ┌─────────┐
                   ╱  E2E /   ╲        Few — slow, brittle
                  ╱  Contract   ╲       (Playwright, httpx against live server)
                 ╱───────────────╲
                ╱  Integration    ╲     Some — real DB, real deps
               ╱  (TestClient +    ╲    (httpx AsyncClient + testcontainers)
              ╱    real services)    ╲
             ╱───────────────────────╲
            ╱      Unit Tests         ╲   Many — fast, isolated
           ╱  (pure functions, models, ╲  (pytest + dependency overrides)
          ╱    validators, utils)       ╲
         ╱───────────────────────────────╲
        └─────────────────────────────────┘
` },

        { type: "callout", variant: "info", title: "Golden Rule", text: "Test behavior, not implementation. Your tests should survive a refactor. If you rename an internal function, your tests should still pass — only changing the API contract should break them." },

        { type: "heading", text: "Project Setup: pytest + httpx", level: 2 },

        { type: "text", text: "FastAPI's <code>TestClient</code> is sync-only (built on Starlette). For async endpoints, use <code>httpx.AsyncClient</code> with <code>pytest-asyncio</code>." },

        { type: "code", lang: "bash", filename: "requirements-test.txt", code: `
# requirements-test.txt
pytest>=8.0
pytest-asyncio>=0.23
pytest-cov>=4.1
httpx>=0.27
anyio>=4.0
factory-boy>=3.3
faker>=22.0
`, notes: [
          "pytest-asyncio lets you write async test functions",
          "httpx.AsyncClient replaces TestClient for async tests",
          "factory-boy generates realistic test data"
        ]},

        { type: "heading", text: "conftest.py — The Test Foundation", level: 2 },

        { type: "text", text: "A well-structured <code>conftest.py</code> provides reusable fixtures for your entire test suite. Place it at <code>tests/conftest.py</code>." },

        { type: "code", lang: "python", filename: "tests/conftest.py", code: `
import asyncio
from typing import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    create_async_engine,
    async_sessionmaker,
)

from app.main import app
from app.database import get_db, Base
from app.auth import create_access_token
from app.config import settings


# ── async event loop (session-scoped) ──────────────────────
@pytest.fixture(scope="session")
def event_loop():
    """Create a single event loop for the entire test session."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


# ── test database engine ───────────────────────────────────
TEST_DB_URL = "sqlite+aiosqlite:///./test.db"

@pytest_asyncio.fixture(scope="session")
async def test_engine():
    engine = create_async_engine(TEST_DB_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


# ── test database session ──────────────────────────────────
@pytest_asyncio.fixture
async def db_session(test_engine) -> AsyncGenerator[AsyncSession, None]:
    session_factory = async_sessionmaker(
        test_engine, expire_on_commit=False
    )
    async with session_factory() as session:
        yield session
        await session.rollback()   # rollback after each test


# ── async HTTP client ─────────────────────────────────────
@pytest_asyncio.fixture
async def client(db_session) -> AsyncGenerator[AsyncClient, None]:
    """AsyncClient wired to test DB via dependency override."""

    async def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport,
        base_url="http://testserver",
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


# ── authenticated client ───────────────────────────────────
@pytest_asyncio.fixture
async def auth_client(client) -> AsyncClient:
    """Client with a valid JWT in the Authorization header."""
    token = create_access_token(
        data={"sub": "test-user@example.com", "role": "admin"}
    )
    client.headers["Authorization"] = f"Bearer " + token
    return client
`, notes: [
          "Session-scoped engine creates tables once, not per test",
          "db_session rolls back after each test for isolation",
          "dependency_overrides swaps the real DB for the test DB",
          "auth_client adds a JWT so protected endpoints just work"
        ]},

        { type: "callout", variant: "warning", title: "Dependency Override Cleanup", text: "Always call <code>app.dependency_overrides.clear()</code> after tests. Leaked overrides cause mysterious failures in other tests." },

        { type: "heading", text: "Dependency Overrides Deep Dive", level: 2 },

        { type: "text", text: "FastAPI's <code>dependency_overrides</code> dict is the key to testability. You can swap <strong>any</strong> dependency — database sessions, external API clients, ML models — with a test double." },

        { type: "code", lang: "python", filename: "tests/test_classify.py", code: `
import pytest
from httpx import AsyncClient

from app.main import app
from app.services.classifier import ClassifierService


# ── Fake classifier for unit tests ─────────────────────────
class FakeClassifier:
    """Deterministic classifier that always returns the same result."""

    async def classify(self, text: str) -> dict:
        return {
            "label": "invoice",
            "confidence": 0.95,
            "model_version": "test-v1",
        }

    async def health_check(self) -> bool:
        return True


@pytest.fixture
def override_classifier():
    """Swap real ML classifier with a fake."""
    app.dependency_overrides[ClassifierService] = FakeClassifier
    yield
    app.dependency_overrides.pop(ClassifierService, None)


# ── Tests ───────────────────────────────────────────────────
@pytest.mark.asyncio
async def test_classify_returns_label(
    auth_client: AsyncClient,
    override_classifier,
):
    response = await auth_client.post(
        "/api/v1/classify",
        json={"text": "Invoice #12345 due 2024-03-01", "priority": "high"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["label"] == "invoice"
    assert data["confidence"] >= 0.9
    assert "model_version" in data


@pytest.mark.asyncio
async def test_classify_validates_empty_text(
    auth_client: AsyncClient,
    override_classifier,
):
    response = await auth_client.post(
        "/api/v1/classify",
        json={"text": "", "priority": "high"},
    )
    assert response.status_code == 422  # Pydantic validation error
    detail = response.json()["detail"]
    assert any("text" in str(e).lower() for e in detail)


@pytest.mark.asyncio
async def test_classify_requires_auth(client: AsyncClient):
    """Unauthenticated requests should be rejected."""
    response = await client.post(
        "/api/v1/classify",
        json={"text": "Some document text"},
    )
    assert response.status_code == 401
`, notes: [
          "FakeClassifier is deterministic — no ML model needed in tests",
          "override_classifier fixture scopes the swap to individual tests",
          "Test both happy path AND validation/auth failures"
        ]},

        { type: "heading", text: "Testing Authentication", level: 2 },

        { type: "text", text: "Auth tests verify both the <strong>guard</strong> (rejecting bad tokens) and the <strong>gate</strong> (allowing valid tokens with correct roles)." },

        { type: "code", lang: "python", filename: "tests/test_auth.py", code: `
import pytest
from httpx import AsyncClient
from datetime import timedelta

from app.auth import create_access_token


@pytest.mark.asyncio
async def test_expired_token_rejected(client: AsyncClient):
    """Tokens with negative expiry should fail."""
    token = create_access_token(
        data={"sub": "user@test.com"},
        expires_delta=timedelta(seconds=-10),
    )
    response = await client.get(
        "/api/v1/documents",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 401
    assert "expired" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_malformed_token_rejected(client: AsyncClient):
    response = await client.get(
        "/api/v1/documents",
        headers={"Authorization": "Bearer not.a.real.token"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_missing_auth_header(client: AsyncClient):
    response = await client.get("/api/v1/documents")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_role_based_access(client: AsyncClient):
    """Regular users cannot access admin endpoints."""
    user_token = create_access_token(
        data={"sub": "regular@test.com", "role": "viewer"}
    )
    response = await client.delete(
        "/api/v1/admin/purge-cache",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_admin_access_granted(client: AsyncClient):
    admin_token = create_access_token(
        data={"sub": "admin@test.com", "role": "admin"}
    )
    response = await client.delete(
        "/api/v1/admin/purge-cache",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code in (200, 204)
`, notes: [
          "Test expired, malformed, and missing tokens separately",
          "Role-based tests verify both denial and granting",
          "Use real create_access_token — don't mock your own auth"
        ]},

        { type: "heading", text: "Testing Middleware & Error Handlers", level: 2 },

        { type: "code", lang: "python", filename: "tests/test_middleware.py", code: `
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_request_id_header_present(client: AsyncClient):
    """Every response should include X-Request-ID."""
    response = await client.get("/api/v1/health")
    assert "x-request-id" in response.headers
    assert len(response.headers["x-request-id"]) == 36  # UUID length


@pytest.mark.asyncio
async def test_cors_headers(client: AsyncClient):
    """Preflight requests return correct CORS headers."""
    response = await client.options(
        "/api/v1/classify",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "POST",
        },
    )
    assert response.headers.get("access-control-allow-origin")


@pytest.mark.asyncio
async def test_rate_limit_returns_429(client: AsyncClient):
    """Exceeding rate limit returns 429 with Retry-After."""
    # Hammer the endpoint beyond the limit
    responses = []
    for _ in range(150):
        r = await client.get("/api/v1/health")
        responses.append(r)
        if r.status_code == 429:
            break

    limited = [r for r in responses if r.status_code == 429]
    assert len(limited) > 0, "Rate limiter never triggered"
    assert "retry-after" in limited[0].headers


@pytest.mark.asyncio
async def test_unhandled_error_returns_500(
    client: AsyncClient, monkeypatch
):
    """Internal errors return 500 with request_id, not a stack trace."""
    # Force an error by breaking a dependency
    async def _boom():
        raise RuntimeError("Unexpected failure")

    monkeypatch.setattr(
        "app.routes.health.perform_health_check", _boom
    )
    response = await client.get("/api/v1/health")
    assert response.status_code == 500
    body = response.json()
    assert "request_id" in body
    assert "traceback" not in str(body).lower()
`, notes: [
          "Middleware tests verify cross-cutting concerns",
          "Rate limit test runs in a loop until 429 appears",
          "Error handler test uses monkeypatch to force an exception"
        ]},

        { type: "heading", text: "Integration Tests with a Real Database", level: 2 },

        { type: "text", text: "Unit tests use fakes, but integration tests should hit a real database. Use <code>testcontainers</code> to spin up a disposable PostgreSQL instance." },

        { type: "code", lang: "python", filename: "tests/integration/conftest.py", code: `
import pytest_asyncio
from testcontainers.postgres import PostgresContainer
from sqlalchemy.ext.asyncio import (
    create_async_engine,
    async_sessionmaker,
    AsyncSession,
)
from httpx import ASGITransport, AsyncClient
from typing import AsyncGenerator

from app.main import app
from app.database import get_db, Base


@pytest_asyncio.fixture(scope="session")
async def pg_container():
    """Spin up a real Postgres container for integration tests."""
    with PostgresContainer("postgres:16-alpine") as pg:
        yield pg


@pytest_asyncio.fixture(scope="session")
async def pg_engine(pg_container):
    # Convert psycopg2 URL to asyncpg URL
    url = pg_container.get_connection_url()
    async_url = url.replace("psycopg2", "asyncpg")

    engine = create_async_engine(async_url)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture
async def pg_session(pg_engine) -> AsyncGenerator[AsyncSession, None]:
    factory = async_sessionmaker(pg_engine, expire_on_commit=False)
    async with factory() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture
async def pg_client(pg_session) -> AsyncGenerator[AsyncClient, None]:
    async def _override():
        yield pg_session

    app.dependency_overrides[get_db] = _override
    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport, base_url="http://testserver"
    ) as ac:
        yield ac
    app.dependency_overrides.clear()
`, notes: [
          "testcontainers starts a real Postgres in Docker automatically",
          "Session-scoped container — one DB for all integration tests",
          "Each test gets a rolled-back session for isolation"
        ]},

        { type: "code", lang: "python", filename: "tests/integration/test_classify_integration.py", code: `
import pytest
from httpx import AsyncClient
from app.auth import create_access_token


@pytest.mark.asyncio
async def test_classify_persists_result(pg_client: AsyncClient):
    """Integration: classify → store result → retrieve it."""
    token = create_access_token(
        data={"sub": "test@example.com", "role": "admin"}
    )
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Classify a document
    resp = await pg_client.post(
        "/api/v1/classify",
        json={"text": "Purchase Order #9981 for 500 units"},
        headers=headers,
    )
    assert resp.status_code == 200
    doc_id = resp.json()["document_id"]

    # 2. Retrieve the stored result
    resp = await pg_client.get(
        f"/api/v1/documents/{doc_id}",
        headers=headers,
    )
    assert resp.status_code == 200
    assert resp.json()["classification"]["label"] is not None
`, notes: [
          "This test hits a real Postgres — no fakes",
          "Verifies the full flow: classify → persist → read"
        ]},

        { type: "heading", text: "Coverage and What to Test", level: 2 },

        { type: "comparison", headers: ["Test This", "Skip This"], rows: [
          ["Request/response contracts", "SQLAlchemy internals"],
          ["Input validation (Pydantic)", "Third-party library behavior"],
          ["Auth guards & role checks", "Python stdlib functions"],
          ["Business logic in services", "Framework routing mechanics"],
          ["Error handling & status codes", "Logging format strings"],
          ["Database queries (integration)", "ORM model __repr__"],
        ]},

        { type: "code", lang: "bash", filename: "terminal", code: `
# Run tests with coverage
pytest tests/ -v --cov=app --cov-report=term-missing --cov-report=html

# Run only unit tests (fast)
pytest tests/ -v -m "not integration" --cov=app

# Run integration tests only
pytest tests/integration/ -v -m integration
`, notes: [
          "Aim for 80%+ line coverage on business logic",
          "Use -m markers to separate fast unit tests from slow integration tests"
        ]},

        { type: "code", lang: "ini", filename: "pyproject.toml", code: `
[tool.pytest.ini_options]
asyncio_mode = "auto"
markers = [
    "integration: tests that need external services (DB, Redis)",
    "slow: tests that take more than 5 seconds",
]
filterwarnings = [
    "ignore::DeprecationWarning",
]

[tool.coverage.run]
source = ["app"]
omit = ["app/migrations/*", "app/tests/*"]

[tool.coverage.report]
fail_under = 80
show_missing = true
exclude_lines = [
    "pragma: no cover",
    "if TYPE_CHECKING:",
    "if __name__ ==",
]
`, notes: [
          "asyncio_mode = 'auto' removes the need for @pytest.mark.asyncio on every test",
          "fail_under = 80 breaks CI if coverage drops below 80%"
        ]},

        { type: "heading", text: "Test Organization", level: 2 },

        { type: "diagram", code: `
  tests/
  ├── conftest.py              ← shared fixtures (client, db, auth)
  ├── factories.py             ← factory-boy model factories
  ├── test_auth.py             ← authentication & authorization
  ├── test_classify.py         ← /classify endpoint (unit)
  ├── test_documents.py        ← /documents CRUD (unit)
  ├── test_middleware.py       ← request ID, CORS, rate limit
  ├── test_models.py           ← Pydantic model validation
  ├── test_services.py         ← business logic (pure functions)
  └── integration/
      ├── conftest.py           ← testcontainers fixtures
      ├── test_classify_integration.py
      └── test_document_lifecycle.py
` },

        { type: "heading", text: "IntelliAPI: Full Test Suite for /classify", level: 2 },

        { type: "code", lang: "python", filename: "tests/test_classify_full.py", code: `
"""
Complete test suite for the IntelliAPI /classify endpoint.
Covers: validation, auth, happy path, edge cases, error handling.
"""
import pytest
from httpx import AsyncClient
from unittest.mock import AsyncMock, patch

from app.main import app
from app.services.classifier import ClassifierService


# ── Fixtures ────────────────────────────────────────────────
class FakeClassifier:
    async def classify(self, text: str) -> dict:
        if "error" in text.lower():
            raise RuntimeError("Model inference failed")
        return {
            "label": "contract",
            "confidence": 0.92,
            "model_version": "v2.1",
            "tokens_used": len(text.split()),
        }


@pytest.fixture(autouse=True)
def use_fake_classifier():
    app.dependency_overrides[ClassifierService] = FakeClassifier
    yield
    app.dependency_overrides.pop(ClassifierService, None)


# ── Happy Path ──────────────────────────────────────────────
class TestClassifyHappyPath:
    async def test_returns_200_with_label(self, auth_client):
        resp = await auth_client.post(
            "/api/v1/classify",
            json={"text": "Service Agreement between Acme Corp..."},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["label"] == "contract"
        assert 0 <= body["confidence"] <= 1
        assert body["model_version"] == "v2.1"

    async def test_returns_document_id(self, auth_client):
        resp = await auth_client.post(
            "/api/v1/classify",
            json={"text": "Any valid document text"},
        )
        assert "document_id" in resp.json()

    async def test_accepts_optional_priority(self, auth_client):
        resp = await auth_client.post(
            "/api/v1/classify",
            json={"text": "Document text", "priority": "high"},
        )
        assert resp.status_code == 200


# ── Validation ──────────────────────────────────────────────
class TestClassifyValidation:
    async def test_rejects_empty_text(self, auth_client):
        resp = await auth_client.post(
            "/api/v1/classify", json={"text": ""}
        )
        assert resp.status_code == 422

    async def test_rejects_missing_text_field(self, auth_client):
        resp = await auth_client.post(
            "/api/v1/classify", json={"priority": "low"}
        )
        assert resp.status_code == 422

    async def test_rejects_text_too_long(self, auth_client):
        resp = await auth_client.post(
            "/api/v1/classify",
            json={"text": "x" * 100_001},  # over 100k limit
        )
        assert resp.status_code == 422

    async def test_rejects_invalid_priority(self, auth_client):
        resp = await auth_client.post(
            "/api/v1/classify",
            json={"text": "Valid text", "priority": "invalid"},
        )
        assert resp.status_code == 422


# ── Auth ────────────────────────────────────────────────────
class TestClassifyAuth:
    async def test_rejects_unauthenticated(self, client):
        resp = await client.post(
            "/api/v1/classify",
            json={"text": "Some text"},
        )
        assert resp.status_code == 401

    async def test_rejects_viewer_role(self, client):
        from app.auth import create_access_token
        token = create_access_token(
            data={"sub": "viewer@test.com", "role": "viewer"}
        )
        resp = await client.post(
            "/api/v1/classify",
            json={"text": "Some text"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 403


# ── Error Handling ──────────────────────────────────────────
class TestClassifyErrors:
    async def test_classifier_failure_returns_503(self, auth_client):
        """When the ML model fails, return 503 Service Unavailable."""
        resp = await auth_client.post(
            "/api/v1/classify",
            json={"text": "This will trigger an error in FakeClassifier"},
        )
        assert resp.status_code == 503
        assert "model" in resp.json()["detail"].lower()

    async def test_invalid_content_type_returns_422(self, auth_client):
        resp = await auth_client.post(
            "/api/v1/classify",
            content="not json",
            headers={"Content-Type": "text/plain"},
        )
        assert resp.status_code == 422
`, notes: [
          "autouse=True applies the fake classifier to every test in this file",
          "Tests are organized into classes by concern: happy path, validation, auth, errors",
          "FakeClassifier simulates model failures when 'error' appears in text"
        ]},

        { type: "callout", variant: "interview", title: "Interview Deep Dive: Testing", text: "<strong>Q: How do you test async FastAPI endpoints?</strong><br>Use <code>httpx.AsyncClient</code> with <code>ASGITransport</code> — it speaks ASGI directly to your app without starting a server. Pair with <code>pytest-asyncio</code> for async test functions.<br><br><strong>Q: How do you isolate tests from external services?</strong><br>Use <code>app.dependency_overrides</code> to swap real dependencies (DB, ML model, external APIs) with fakes/mocks. Each test gets a rolled-back database session for isolation.<br><br><strong>Q: What's your testing strategy for a FastAPI microservice?</strong><br>Testing pyramid: many fast unit tests (dependency overrides, fake services), some integration tests (testcontainers with real Postgres), few E2E tests. Target 80%+ coverage on business logic. Always test auth, validation, and error handling — these are where production bugs hide.<br><br><strong>Q: TestClient vs AsyncClient?</strong><br><code>TestClient</code> (from Starlette) is synchronous and wraps requests. <code>AsyncClient</code> (from httpx) is async-native and required when your tests need to call async fixtures or test concurrent behavior." },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 8 — Background Tasks, WebSockets & Streaming
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "background-tasks-websockets-streaming",
      title: "Background Tasks, WebSockets & Streaming",
      readTime: "28 min",
      content: [
        { type: "text", text: "Not every operation belongs in a request-response cycle. Sending emails, writing audit logs, streaming LLM output, and pushing real-time notifications all require <strong>asynchronous patterns</strong> beyond basic REST. FastAPI provides three built-in mechanisms: <code>BackgroundTasks</code>, <code>WebSocket</code> endpoints, and <code>StreamingResponse</code>." },

        { type: "heading", text: "FastAPI BackgroundTasks", level: 2 },

        { type: "text", text: "BackgroundTasks run <strong>after</strong> the response is sent. The client gets a fast response while work continues in the background — in the <em>same process</em>." },

        { type: "diagram", code: `
  Client                    FastAPI                   Background
    │                          │                          │
    │── POST /classify ───────▶│                          │
    │                          │── run classifier ───▶    │
    │                          │◀── result ──────────     │
    │◀── 200 {label} ─────────│                          │
    │                          │── fire & forget ────────▶│
    │                          │                   write audit log
    │                          │                   send webhook
    │                          │                   update analytics
` },

        { type: "code", lang: "python", filename: "app/routes/classify.py", code: `
from fastapi import APIRouter, BackgroundTasks, Depends
from datetime import datetime, timezone

from app.schemas import ClassifyRequest, ClassifyResponse
from app.services.classifier import ClassifierService
from app.services.audit import AuditService
from app.auth import get_current_user

router = APIRouter()


async def write_audit_log(
    audit: AuditService,
    user_email: str,
    document_text: str,
    result: dict,
):
    """Runs AFTER response is sent — client doesn't wait for this."""
    await audit.log_classification(
        user=user_email,
        text_preview=document_text[:200],
        label=result["label"],
        confidence=result["confidence"],
        timestamp=datetime.now(timezone.utc),
    )


async def send_webhook_notification(webhook_url: str, payload: dict):
    """Notify external systems about new classifications."""
    import httpx
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            await client.post(webhook_url, json=payload)
        except httpx.HTTPError:
            pass  # Log but don't crash — it's fire-and-forget


@router.post("/classify", response_model=ClassifyResponse)
async def classify_document(
    body: ClassifyRequest,
    background_tasks: BackgroundTasks,
    classifier: ClassifierService = Depends(),
    audit: AuditService = Depends(),
    user=Depends(get_current_user),
):
    # Synchronous work — client waits for this
    result = await classifier.classify(body.text)

    # Background work — runs after response is sent
    background_tasks.add_task(
        write_audit_log, audit, user.email, body.text, result
    )
    background_tasks.add_task(
        send_webhook_notification,
        "https://hooks.example.com/classify",
        {"label": result["label"], "user": user.email},
    )

    return ClassifyResponse(**result)
`, notes: [
          "BackgroundTasks.add_task() accepts both sync and async functions",
          "Tasks run in-process after the response — no separate worker needed",
          "Errors in background tasks don't affect the response (already sent)",
          "Multiple tasks run sequentially in the order they were added"
        ]},

        { type: "heading", text: "BackgroundTasks vs Celery vs Dedicated Workers", level: 2 },

        { type: "comparison", headers: ["Pattern", "Use When", "Limitations"], rows: [
          ["<strong>BackgroundTasks</strong>", "Fire-and-forget, &lt;30s work, non-critical (audit logs, webhooks)", "No retry, no queue, dies with the process, no monitoring"],
          ["<strong>Celery + Redis/RabbitMQ</strong>", "Retries needed, long-running (&gt;30s), must survive restarts", "Separate worker process, complex setup, serialization overhead"],
          ["<strong>Dedicated async worker</strong>", "Streaming, real-time, persistent connections", "Custom code, harder to scale, no built-in task management"],
          ["<strong>arq (async task queue)</strong>", "Async-native alternative to Celery, Redis-backed", "Smaller ecosystem, less battle-tested at scale"],
        ]},

        { type: "callout", variant: "warning", title: "BackgroundTasks Gotcha", text: "BackgroundTasks run in the <strong>same process and event loop</strong>. If a background task is CPU-bound or blocks, it will starve your async endpoints. For heavy work, offload to Celery or a process pool." },

        { type: "heading", text: "Server-Sent Events (SSE) for Streaming", level: 2 },

        { type: "text", text: "SSE is a <strong>one-way</strong> server-to-client stream over HTTP. It's perfect for streaming LLM token output, progress updates, and live feeds. Unlike WebSockets, SSE works through proxies, is auto-reconnecting, and uses standard HTTP." },

        { type: "diagram", code: `
  SSE vs WebSocket

  SSE (Server-Sent Events)          WebSocket
  ┌──────────────────────┐          ┌──────────────────────┐
  │  Client ──GET──▶ Server  │      │  Client ◀──────▶ Server │
  │  Client ◀─stream── Server│      │  Bidirectional         │
  │  One-way (server→client) │      │  Full-duplex           │
  │  HTTP/1.1, auto-reconnect│      │  Upgrade from HTTP     │
  │  text/event-stream       │      │  Binary + text frames  │
  └──────────────────────┘          └──────────────────────┘

  Use SSE for:                      Use WebSocket for:
  • LLM token streaming             • Chat applications
  • Progress updates                • Collaborative editing
  • Live dashboards                 • Gaming
  • Log tailing                     • Bidirectional control
` },

        { type: "code", lang: "python", filename: "app/routes/streaming.py", code: `
import asyncio
import json
from typing import AsyncGenerator

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from sse_starlette.sse import EventSourceResponse

from app.auth import get_current_user
from app.services.classifier import ClassifierService

router = APIRouter()


async def classify_stream(
    text: str, classifier: ClassifierService
) -> AsyncGenerator[str, None]:
    """
    Stream classification progress as SSE events.
    Yields JSON-encoded events the client can parse.
    """
    # Step 1: Preprocessing
    yield json.dumps({
        "event": "progress",
        "stage": "preprocessing",
        "percent": 10,
        "message": "Tokenizing document...",
    })
    await asyncio.sleep(0.3)  # Simulate work

    # Step 2: Model inference
    yield json.dumps({
        "event": "progress",
        "stage": "inference",
        "percent": 40,
        "message": "Running classification model...",
    })
    result = await classifier.classify(text)

    # Step 3: Post-processing
    yield json.dumps({
        "event": "progress",
        "stage": "postprocessing",
        "percent": 80,
        "message": "Applying business rules...",
    })
    await asyncio.sleep(0.2)

    # Step 4: Complete
    yield json.dumps({
        "event": "complete",
        "stage": "done",
        "percent": 100,
        "result": result,
    })


@router.post("/classify/stream")
async def classify_with_progress(
    request: Request,
    body: dict,
    classifier: ClassifierService = Depends(),
    user=Depends(get_current_user),
):
    """SSE endpoint: streams classification progress to the client."""

    async def event_generator():
        async for chunk in classify_stream(body["text"], classifier):
            # Check if client disconnected
            if await request.is_disconnected():
                break
            yield chunk

    return EventSourceResponse(event_generator())
`, notes: [
          "sse-starlette provides EventSourceResponse for proper SSE formatting",
          "Always check request.is_disconnected() to stop work when client leaves",
          "Each yield produces one SSE event the client receives",
          "pip install sse-starlette for SSE support"
        ]},

        { type: "code", lang: "javascript", filename: "client-side.js", code: `
// Client-side: consuming the SSE stream
const eventSource = new EventSource("/api/v1/classify/stream", {
  // Note: EventSource only supports GET. For POST, use fetch:
});

// Better: use fetch with ReadableStream for POST + SSE
async function streamClassification(text) {
  const response = await fetch("/api/v1/classify/stream", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer <token>",
    },
    body: JSON.stringify({ text }),
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    // SSE format: "data: {...}\\n\\n"
    const lines = chunk.split("\\n").filter(l => l.startsWith("data: "));
    for (const line of lines) {
      const event = JSON.parse(line.slice(6)); // strip "data: "
      console.log(event.stage, event.percent + "%");
      updateProgressBar(event.percent);
      if (event.event === "complete") {
        displayResult(event.result);
      }
    }
  }
}
`, notes: [
          "EventSource API only supports GET — use fetch for POST endpoints",
          "ReadableStream API gives you streaming with full HTTP method control"
        ]},

        { type: "heading", text: "WebSocket Endpoints", level: 2 },

        { type: "text", text: "WebSockets provide <strong>full-duplex</strong> communication. FastAPI makes them first-class with the <code>@router.websocket</code> decorator. The lifecycle is: connect → authenticate → loop (receive/send) → disconnect." },

        { type: "code", lang: "python", filename: "app/routes/ws.py", code: `
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from jose import jwt, JWTError

from app.config import settings
from app.services.classifier import ClassifierService

router = APIRouter()


class ConnectionManager:
    """Manages active WebSocket connections."""

    def __init__(self):
        self.active: dict[str, WebSocket] = {}

    async def connect(self, user_id: str, ws: WebSocket):
        await ws.accept()
        self.active[user_id] = ws

    def disconnect(self, user_id: str):
        self.active.pop(user_id, None)

    async def send_to_user(self, user_id: str, data: dict):
        if ws := self.active.get(user_id):
            await ws.send_json(data)

    async def broadcast(self, data: dict):
        for ws in self.active.values():
            await ws.send_json(data)


manager = ConnectionManager()


async def ws_authenticate(ws: WebSocket) -> str | None:
    """
    Authenticate WebSocket via query param or first message.
    Returns user_id or None.
    """
    # Strategy 1: token in query params
    token = ws.query_params.get("token")
    if not token:
        # Strategy 2: token in first message
        await ws.accept()
        first_msg = await ws.receive_json()
        token = first_msg.get("token")

    if not token:
        return None

    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=["HS256"]
        )
        return payload.get("sub")
    except JWTError:
        return None


@router.websocket("/ws/classify")
async def websocket_classify(
    ws: WebSocket,
    classifier: ClassifierService = Depends(),
):
    """
    WebSocket endpoint for interactive document classification.
    Client sends documents, server responds with results in real time.
    """
    # ── Authenticate ────────────────────────────────────────
    user_id = await ws_authenticate(ws)
    if not user_id:
        await ws.close(code=4001, reason="Authentication failed")
        return

    # ── Connect ─────────────────────────────────────────────
    if not ws.client_state.name == "CONNECTED":
        await ws.accept()
    await manager.connect(user_id, ws)

    try:
        # ── Message loop ────────────────────────────────────
        while True:
            data = await ws.receive_json()

            if data.get("type") == "classify":
                result = await classifier.classify(data["text"])
                await ws.send_json({
                    "type": "classification_result",
                    "request_id": data.get("request_id"),
                    **result,
                })

            elif data.get("type") == "ping":
                await ws.send_json({"type": "pong"})

            else:
                await ws.send_json({
                    "type": "error",
                    "message": f"Unknown message type: {data.get('type')}",
                })

    except WebSocketDisconnect:
        manager.disconnect(user_id)
    except Exception as e:
        manager.disconnect(user_id)
        await ws.close(code=1011, reason=str(e))
`, notes: [
          "ConnectionManager tracks active connections by user_id",
          "Authentication via query param (?token=xxx) or first message",
          "Close codes: 4001 = custom auth failure, 1011 = unexpected error",
          "The while True loop is the WebSocket 'event loop' per connection"
        ]},

        { type: "heading", text: "WebSocket Authentication Patterns", level: 2 },

        { type: "list", items: [
          "<strong>Query parameter</strong> — <code>ws://host/ws?token=JWT</code>. Simple but token appears in server logs and browser history. Use for internal services.",
          "<strong>First message</strong> — Connect first, send <code>{\"token\": \"JWT\"}</code> as the first frame. More secure but adds a round trip.",
          "<strong>Cookie-based</strong> — If the user has an HTTP-only session cookie, it's sent automatically on WebSocket upgrade. Best for browser apps.",
          "<strong>Subprotocol header</strong> — Pass the token as a WebSocket subprotocol: <code>new WebSocket(url, [\"access_token\", jwt])</code>. Hacky but avoids query params.",
        ]},

        { type: "callout", variant: "info", title: "WebSocket + Load Balancers", text: "WebSocket connections are <strong>sticky</strong> — they're bound to one server instance. Behind a load balancer, use Redis pub/sub or a message broker to broadcast across instances. Without this, <code>manager.broadcast()</code> only reaches users connected to the same process." },

        { type: "heading", text: "StreamingResponse for Large Documents", level: 2 },

        { type: "text", text: "For large file downloads or document processing results, <code>StreamingResponse</code> avoids loading everything into memory." },

        { type: "code", lang: "python", filename: "app/routes/export.py", code: `
import csv
import io
from typing import AsyncGenerator

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from app.database import get_db
from app.auth import get_current_user

router = APIRouter()


async def generate_csv_rows(db) -> AsyncGenerator[str, None]:
    """Stream CSV rows from DB without loading all into memory."""
    # Write header
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["id", "text_preview", "label", "confidence", "created_at"])
    yield output.getvalue()
    output.seek(0)
    output.truncate(0)

    # Stream rows in batches
    offset = 0
    batch_size = 1000
    while True:
        rows = await db.execute(
            "SELECT id, text, label, confidence, created_at "
            "FROM classifications "
            "ORDER BY created_at DESC "
            f"LIMIT {batch_size} OFFSET {offset}"
        )
        batch = rows.fetchall()
        if not batch:
            break

        for row in batch:
            writer.writerow([
                row.id,
                row.text[:100],
                row.label,
                f"{row.confidence:.4f}",
                row.created_at.isoformat(),
            ])
        yield output.getvalue()
        output.seek(0)
        output.truncate(0)
        offset += batch_size


@router.get("/export/classifications")
async def export_classifications(
    db=Depends(get_db),
    user=Depends(get_current_user),
):
    return StreamingResponse(
        generate_csv_rows(db),
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=classifications.csv"
        },
    )
`, notes: [
          "StreamingResponse takes an async generator — memory stays constant",
          "Batch queries prevent loading millions of rows at once",
          "Content-Disposition triggers a file download in the browser"
        ]},

        { type: "heading", text: "IntelliAPI: Putting It All Together", level: 2 },

        { type: "diagram", code: `
  ┌──────────────────────────────────────────────────────────────┐
  │                    IntelliAPI Architecture                    │
  │                                                              │
  │  POST /classify ──────▶ Classify ──▶ Return result           │
  │                               └──▶ BackgroundTask: audit log │
  │                               └──▶ BackgroundTask: webhook   │
  │                                                              │
  │  POST /classify/stream ──▶ SSE stream progress + result      │
  │        (token-by-token LLM output or stage updates)          │
  │                                                              │
  │  WS /ws/classify ──▶ Interactive bidirectional classification │
  │        (batch mode: send many docs, get results as ready)    │
  │                                                              │
  │  GET /export/classifications ──▶ StreamingResponse CSV       │
  │        (100k+ rows without OOM)                              │
  └──────────────────────────────────────────────────────────────┘
` },

        { type: "heading", text: "Testing Real-Time Endpoints", level: 2 },

        { type: "code", lang: "python", filename: "tests/test_streaming.py", code: `
import pytest
from httpx import AsyncClient, ASGITransport
from starlette.testclient import TestClient

from app.main import app
from app.auth import create_access_token


# ── Test SSE streaming ──────────────────────────────────────
@pytest.mark.asyncio
async def test_sse_streams_progress():
    """Verify SSE endpoint yields progress events."""
    token = create_access_token(
        data={"sub": "user@test.com", "role": "admin"}
    )
    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport, base_url="http://testserver"
    ) as client:
        async with client.stream(
            "POST",
            "/api/v1/classify/stream",
            json={"text": "Test document"},
            headers={"Authorization": f"Bearer {token}"},
        ) as response:
            events = []
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    import json
                    events.append(json.loads(line[6:]))

            assert len(events) >= 2
            assert events[-1]["event"] == "complete"
            assert "result" in events[-1]


# ── Test WebSocket ──────────────────────────────────────────
def test_websocket_classify():
    """WebSocket test uses sync TestClient."""
    token = create_access_token(
        data={"sub": "ws-user@test.com", "role": "admin"}
    )
    client = TestClient(app)

    with client.websocket_connect(
        f"/ws/classify?token={token}"
    ) as ws:
        # Send a classification request
        ws.send_json({
            "type": "classify",
            "text": "Invoice for consulting services",
            "request_id": "test-001",
        })
        result = ws.receive_json()
        assert result["type"] == "classification_result"
        assert result["request_id"] == "test-001"
        assert "label" in result

        # Test ping/pong
        ws.send_json({"type": "ping"})
        pong = ws.receive_json()
        assert pong["type"] == "pong"


def test_websocket_rejects_bad_token():
    client = TestClient(app)
    with client.websocket_connect(
        "/ws/classify?token=invalid.token.here"
    ) as ws:
        # Server should close the connection
        try:
            ws.receive_json()
            assert False, "Should have been disconnected"
        except Exception:
            pass  # Connection closed as expected
`, notes: [
          "SSE tests use client.stream() to read events incrementally",
          "WebSocket tests use sync TestClient — Starlette limitation",
          "Always test both happy path and auth rejection for WS"
        ]},

        { type: "heading", text: "Production Checklist", level: 2 },

        { type: "list", items: [
          "<strong>BackgroundTasks</strong> — Add error handling inside tasks (they fail silently). Log failures. For critical work, use Celery with retries.",
          "<strong>SSE</strong> — Always check <code>request.is_disconnected()</code> in the generator loop. Set appropriate timeouts. Use <code>sse-starlette</code> for proper event formatting.",
          "<strong>WebSockets</strong> — Implement heartbeat/ping-pong to detect dead connections. Set <code>max_message_size</code>. Use Redis pub/sub for multi-instance broadcasting.",
          "<strong>StreamingResponse</strong> — Batch database queries. Set <code>Content-Disposition</code> for downloads. Monitor memory usage under concurrent streams.",
          "<strong>All patterns</strong> — Add structured logging (request_id, user_id) to every async path. Monitor with Prometheus counters for active connections, task queue depth, stream duration.",
        ]},

        { type: "callout", variant: "interview", title: "Interview Deep Dive: Real-Time FastAPI", text: "<strong>Q: When would you use BackgroundTasks vs Celery?</strong><br>BackgroundTasks for lightweight fire-and-forget work (audit logs, cache invalidation, webhooks) that takes under 30 seconds and doesn't need retries. Celery for anything that must survive process restarts, needs retry logic, takes minutes+, or requires monitoring/scheduling. BackgroundTasks run in-process and die with the worker; Celery persists tasks in Redis/RabbitMQ.<br><br><strong>Q: How do you stream LLM output to the client?</strong><br>Use Server-Sent Events (SSE) with <code>EventSourceResponse</code> from sse-starlette. The endpoint yields tokens as they arrive from the model. SSE auto-reconnects, works through proxies, and is simpler than WebSockets for one-way streams. For bidirectional interaction (e.g., user can cancel mid-stream), use WebSockets.<br><br><strong>Q: How do you handle WebSocket authentication?</strong><br>Three patterns: (1) JWT in query parameter — simple but logged in URLs, (2) JWT in the first message after connect — adds a round-trip but more secure, (3) Session cookies sent automatically on upgrade — best for browser apps. Always close with code 4001 on auth failure. Never trust the connection after initial auth without periodic re-validation for long-lived connections.<br><br><strong>Q: What happens to WebSockets behind a load balancer?</strong><br>WebSocket connections are sticky to one instance. To broadcast across instances, use Redis pub/sub: each instance subscribes to a channel, and <code>broadcast()</code> publishes to Redis instead of iterating local connections." },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 9 — Production Deployment
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "production-deployment",
      title: "Production Deployment",
      readTime: "35 min",
      content: [
        { type: "text", text: "You have built IntelliAPI — an AI document classification and summarization platform — across eight lessons. Now it is time to ship it. This lesson covers every layer of the production deployment stack: the ASGI server topology, containerization, health checks, graceful shutdown, observability, and the production hardening checklist that separates weekend demos from real systems." },

        // ── Section 1: Uvicorn + Gunicorn Architecture ─────────────────────
        { type: "heading", text: "Uvicorn + Gunicorn Architecture", level: 2 },
        { type: "text", text: "In production, a single Uvicorn process is not enough. The standard pattern pairs <strong>Gunicorn</strong> as a process manager with <strong>Uvicorn workers</strong>. Gunicorn handles process lifecycle (fork, monitor, restart), while each Uvicorn worker runs its own async event loop." },

        { type: "diagram", code: `
┌──────────────────────────────────────────────────────┐
│                  Gunicorn Master                     │
│         (binds socket, manages workers)              │
│                                                      │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐       │
│  │  Worker 1   │ │  Worker 2   │ │  Worker N   │     │
│  │  Uvicorn    │ │  Uvicorn    │ │  Uvicorn    │     │
│  │  asyncio    │ │  asyncio    │ │  asyncio    │     │
│  │  event loop │ │  event loop │ │  event loop │     │
│  └────────────┘ └────────────┘ └────────────┘       │
│        │              │              │               │
│        ▼              ▼              ▼               │
│   FastAPI app    FastAPI app    FastAPI app           │
│   (IntelliAPI)   (IntelliAPI)   (IntelliAPI)         │
└──────────────────────────────────────────────────────┘
          ▲
          │  HTTP / H2
          │
    ┌─────┴─────┐
    │   Nginx /  │
    │   Traefik  │
    │  (reverse  │
    │   proxy)   │
    └────────────┘
` },

        { type: "text", text: "Each worker is a <strong>separate OS process</strong> with its own memory space. This means a crash in one worker does not take down others, and Gunicorn can automatically restart failed workers." },

        // ── Section 2: Worker Configuration ─────────────────────────────────
        { type: "heading", text: "Worker Configuration", level: 2 },
        { type: "text", text: "Getting worker count right is critical. Too few and you waste CPU cores; too many and you exhaust memory (especially with ML models loaded per-worker)." },

        { type: "comparison", headers: ["Setting", "Recommendation"], rows: [
          ["Worker count", "<code>(2 × CPU_CORES) + 1</code> for I/O-bound; <code>CPU_CORES + 1</code> for CPU/GPU-bound"],
          ["Worker class", "<code>uvicorn.workers.UvicornWorker</code> (async)"],
          ["max-requests", "<code>1000–5000</code> — recycles workers to prevent memory leaks"],
          ["max-requests-jitter", "<code>50–200</code> — prevents all workers recycling simultaneously"],
          ["timeout", "<code>120</code> — kill workers that hang (set higher for AI inference)"],
          ["graceful-timeout", "<code>30</code> — time to finish in-flight requests on shutdown"],
          ["keep-alive", "<code>5</code> — seconds to keep idle connections open"]
        ] },

        { type: "code", lang: "python", filename: "gunicorn.conf.py", code: `
import multiprocessing
import os

# ── Worker settings ──────────────────────────────────────
workers = int(os.getenv("WEB_CONCURRENCY", multiprocessing.cpu_count() + 1))
worker_class = "uvicorn.workers.UvicornWorker"
worker_tmp_dir = "/dev/shm"  # RAM-backed tmpdir for heartbeat (Docker best practice)

# ── Memory leak protection ───────────────────────────────
max_requests = int(os.getenv("MAX_REQUESTS", 2000))
max_requests_jitter = 200

# ── Timeouts ─────────────────────────────────────────────
timeout = int(os.getenv("WORKER_TIMEOUT", 120))
graceful_timeout = 30
keep_alive = 5

# ── Binding ──────────────────────────────────────────────
bind = os.getenv("BIND", "0.0.0.0:8000")

# ── Logging ──────────────────────────────────────────────
accesslog = "-"
errorlog = "-"
loglevel = os.getenv("LOG_LEVEL", "info")

# ── Hooks ────────────────────────────────────────────────
def on_starting(server):
    """Called just before the master process is initialized."""
    pass

def post_fork(server, worker):
    """Called just after a worker has been forked."""
    server.log.info(f"Worker spawned (pid: {worker.pid})")

def pre_exec(server):
    """Called before a new master process is forked (on SIGHUP)."""
    server.log.info("Forked child, re-executing.")
`, notes: [
          "worker_tmp_dir = '/dev/shm' avoids disk I/O for Gunicorn's heartbeat file — essential in containers",
          "max_requests recycles workers periodically to reclaim leaked memory from native extensions",
          "max_requests_jitter prevents the thundering-herd problem of all workers restarting at once"
        ] },

        { type: "callout", variant: "warning", title: "ML Model Memory", text: "If each worker loads a 500 MB model, 4 workers = 2 GB RAM. With GPU inference you typically want <strong>1 worker per GPU</strong> and offload concurrency to the async event loop and request batching." },

        // ── Section 3: Multi-stage Dockerfile ───────────────────────────────
        { type: "heading", text: "Multi-Stage Dockerfile for IntelliAPI", level: 2 },
        { type: "text", text: "A multi-stage build keeps the final image small by separating build-time dependencies (compilers, dev headers) from the runtime image." },

        { type: "code", lang: "dockerfile", filename: "Dockerfile", code: `
# ── Stage 1: Builder ─────────────────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /build

# Install build deps (gcc needed for some wheels)
RUN apt-get update && apt-get install -y --no-install-recommends \\
    gcc libpq-dev && \\
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ── Stage 2: Production ─────────────────────────────────
FROM python:3.12-slim AS production

# Security: run as non-root
RUN groupadd -r appuser && useradd -r -g appuser -d /app -s /sbin/nologin appuser

WORKDIR /app

# Install only runtime libs
RUN apt-get update && apt-get install -y --no-install-recommends \\
    libpq5 curl && \\
    rm -rf /var/lib/apt/lists/*

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Copy application code
COPY --chown=appuser:appuser . .

# Heartbeat tmpdir on RAM
RUN mkdir -p /dev/shm

USER appuser

EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \\
    CMD curl -f http://localhost:8000/health/live || exit 1

# Run with Gunicorn + Uvicorn workers
CMD ["gunicorn", "-c", "gunicorn.conf.py", "app.main:app"]
`, notes: [
          "Builder stage installs wheels with gcc; production stage only has runtime libs — image is ~150 MB vs ~800 MB",
          "Non-root user (appuser) limits blast radius of container escapes",
          "HEALTHCHECK gives Docker and orchestrators a built-in liveness signal"
        ] },

        { type: "code", lang: "text", filename: ".dockerignore", code: `
__pycache__
*.pyc
.git
.github
.env
.env.*
.venv
venv
*.egg-info
tests/
docs/
*.md
.mypy_cache
.pytest_cache
.coverage
htmlcov/
node_modules/
`, notes: [
          "A proper .dockerignore prevents secrets (.env) and test artifacts from leaking into the image",
          "Excluding .git alone can save hundreds of MB in repos with long history"
        ] },

        // ── Section 4: Docker Compose ───────────────────────────────────────
        { type: "heading", text: "Docker Compose for Local Development", level: 2 },

        { type: "code", lang: "yaml", filename: "docker-compose.yml", code: `
version: "3.9"

services:
  app:
    build:
      context: .
      target: production
    ports:
      - "8000:8000"
    env_file: .env
    environment:
      - DATABASE_URL=postgresql+asyncpg://intelliapi:secret@db:5432/intelliapi
      - REDIS_URL=redis://redis:6379/0
      - LOG_LEVEL=debug
      - WEB_CONCURRENCY=2
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - .:/app  # hot-reload in dev
    command: >
      uvicorn app.main:app
      --host 0.0.0.0
      --port 8000
      --reload
      --reload-dir app

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: intelliapi
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: intelliapi
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U intelliapi"]
      interval: 5s
      timeout: 3s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

volumes:
  pgdata:
`, notes: [
          "depends_on with condition: service_healthy ensures the app waits for DB and Redis readiness",
          "The dev command overrides Gunicorn with Uvicorn --reload for hot-reloading",
          "Volumes mount source code into the container so changes reflect instantly"
        ] },

        // ── Section 5: Health Check Endpoints ───────────────────────────────
        { type: "heading", text: "Health Check Endpoints: Liveness vs Readiness", level: 2 },

        { type: "text", text: "Kubernetes (and Docker) distinguish two types of health probes. Getting this wrong causes cascading failures:" },

        { type: "comparison", headers: ["Probe", "Purpose", "Fails →"], rows: [
          ["Liveness", "Is the process alive and not deadlocked?", "Container is <strong>killed and restarted</strong>"],
          ["Readiness", "Can the process serve traffic right now?", "Container is <strong>removed from load balancer</strong> (not killed)"],
          ["Startup", "Has the process finished initializing?", "Liveness/readiness probes are <strong>suppressed</strong> until startup passes"]
        ] },

        { type: "code", lang: "python", filename: "app/routes/health.py", code: `
from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from redis.asyncio import Redis
import time

from app.deps import get_db, get_redis

router = APIRouter(prefix="/health", tags=["health"])

START_TIME = time.time()


@router.get("/live", status_code=status.HTTP_200_OK)
async def liveness():
    """Liveness probe — is the process alive?
    Keep this TRIVIAL. No DB calls. No external deps.
    If this fails, the orchestrator kills the container.
    """
    return {"status": "alive", "uptime": round(time.time() - START_TIME, 1)}


@router.get("/ready", status_code=status.HTTP_200_OK)
async def readiness(
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    """Readiness probe — can we serve traffic?
    Checks all critical dependencies.
    If this fails, we're removed from the load balancer.
    """
    checks = {}

    # Check database
    try:
        await db.execute("SELECT 1")
        checks["database"] = "ok"
    except Exception as e:
        checks["database"] = f"error: {e}"
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"status": "not_ready", "checks": checks},
        )

    # Check Redis
    try:
        await redis.ping()
        checks["redis"] = "ok"
    except Exception as e:
        checks["redis"] = f"error: {e}"
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"status": "not_ready", "checks": checks},
        )

    return {"status": "ready", "checks": checks}
`, notes: [
          "Liveness must be trivial — if it calls the DB and the DB is slow, Kubernetes kills healthy containers",
          "Readiness checks every critical dependency; a 503 removes you from the LB but keeps the pod alive",
          "Include uptime in liveness so dashboards can detect restart loops"
        ] },

        { type: "callout", variant: "info", title: "Startup Probes for ML Models", text: "If your model takes 60 seconds to load, configure a <code>startupProbe</code> with <code>failureThreshold: 30</code> and <code>periodSeconds: 2</code>. Without this, the liveness probe kills the container before it finishes loading." },

        // ── Section 6: Graceful Shutdown ─────────────────────────────────────
        { type: "heading", text: "Graceful Shutdown", level: 2 },
        { type: "text", text: "When Kubernetes sends <code>SIGTERM</code>, your app must drain in-flight requests, close DB connections, flush metrics, and exit cleanly. If it does not finish within <code>terminationGracePeriodSeconds</code> (default 30s), Kubernetes sends <code>SIGKILL</code>." },

        { type: "code", lang: "python", filename: "app/main.py", code: `
from contextlib import asynccontextmanager
from fastapi import FastAPI
from sqlalchemy.ext.asyncio import AsyncEngine
import logging

from app.db import engine
from app.redis_client import redis_pool
from app.ml.model_registry import model_registry

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manages startup and shutdown lifecycle."""
    # ── Startup ──────────────────────────────────────
    logger.info("Loading ML models...")
    await model_registry.load_all()
    logger.info("Models loaded. Ready to serve.")

    yield  # ← App runs here

    # ── Shutdown ─────────────────────────────────────
    logger.info("Shutting down gracefully...")

    # 1. Stop accepting new ML inference jobs
    await model_registry.stop_accepting()

    # 2. Wait for in-flight inference to complete (up to 15s)
    await model_registry.drain(timeout=15.0)

    # 3. Close database connections
    if isinstance(engine, AsyncEngine):
        await engine.dispose()
        logger.info("Database connections closed.")

    # 4. Close Redis connections
    await redis_pool.aclose()
    logger.info("Redis connections closed.")

    # 5. Flush any buffered metrics/traces
    # (OpenTelemetry SDK handles this via its own shutdown)

    logger.info("Shutdown complete.")


app = FastAPI(
    title="IntelliAPI",
    version="1.0.0",
    lifespan=lifespan,
)
`, notes: [
          "The lifespan context manager replaces the deprecated @app.on_event('startup') / @app.on_event('shutdown')",
          "Drain in-flight work BEFORE closing connections — otherwise pending queries fail",
          "Gunicorn sends SIGTERM to workers; this code ensures each worker cleans up"
        ] },

        { type: "diagram", code: `
SIGTERM received
      │
      ▼
┌─────────────────┐
│ Stop accepting   │  ← readiness probe fails → removed from LB
│ new connections   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Drain in-flight  │  ← wait for active requests to complete
│ requests (15s)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Close DB pool    │
│ Close Redis pool │
│ Flush metrics    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Process exits 0  │  ← clean exit before SIGKILL deadline
└─────────────────┘
` },

        // ── Section 7: Observability ────────────────────────────────────────
        { type: "heading", text: "Observability: Metrics and Tracing", level: 2 },
        { type: "text", text: "Production systems are opaque without observability. We instrument IntelliAPI with <strong>Prometheus metrics</strong> for monitoring and <strong>OpenTelemetry traces</strong> for distributed debugging." },

        { type: "code", lang: "python", filename: "app/middleware/metrics.py", code: `
import time
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

# ── Metrics ──────────────────────────────────────────────
REQUEST_COUNT = Counter(
    "http_requests_total",
    "Total HTTP requests",
    ["method", "endpoint", "status_code"],
)

REQUEST_DURATION = Histogram(
    "http_request_duration_seconds",
    "HTTP request duration in seconds",
    ["method", "endpoint"],
    buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0],
)

INFERENCE_DURATION = Histogram(
    "inference_duration_seconds",
    "ML inference duration in seconds",
    ["model_name"],
    buckets=[0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0, 30.0],
)

ACTIVE_REQUESTS = Counter(
    "http_requests_in_progress",
    "Number of HTTP requests currently being processed",
    ["method"],
)


class PrometheusMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        method = request.method
        path = request.url.path

        # Skip metrics endpoint itself
        if path == "/metrics":
            return await call_next(request)

        start = time.perf_counter()
        response = await call_next(request)
        duration = time.perf_counter() - start

        # Normalize path to avoid cardinality explosion
        # e.g., /documents/123 → /documents/{id}
        normalized = self._normalize_path(path)

        REQUEST_COUNT.labels(method, normalized, response.status_code).inc()
        REQUEST_DURATION.labels(method, normalized).observe(duration)

        return response

    @staticmethod
    def _normalize_path(path: str) -> str:
        """Replace dynamic path segments with placeholders."""
        parts = path.strip("/").split("/")
        normalized = []
        for part in parts:
            if part.isdigit() or len(part) == 36:  # UUID-length
                normalized.append("{id}")
            else:
                normalized.append(part)
        return "/" + "/".join(normalized)


async def metrics_endpoint(request: Request) -> Response:
    """Expose Prometheus metrics at /metrics."""
    return Response(
        content=generate_latest(),
        media_type=CONTENT_TYPE_LATEST,
    )
`, notes: [
          "Path normalization prevents cardinality explosion — /documents/1 and /documents/999 become /documents/{id}",
          "Custom buckets for INFERENCE_DURATION capture the expected latency range of ML models",
          "Mount metrics_endpoint at /metrics — Prometheus scrapes this every 15s"
        ] },

        { type: "callout", variant: "warning", title: "Cardinality Explosion", text: "Every unique label combination creates a new time series in Prometheus. If you use raw URL paths with user IDs as labels, you will create millions of series and crash your monitoring system. Always normalize paths." },

        // ── Section 8: Environment Configuration ────────────────────────────
        { type: "heading", text: "Environment-Specific Configuration", level: 2 },

        { type: "code", lang: "python", filename: "app/config.py", code: `
from pydantic_settings import BaseSettings
from functools import lru_cache
from enum import Enum


class Environment(str, Enum):
    DEV = "dev"
    STAGING = "staging"
    PROD = "prod"


class Settings(BaseSettings):
    """Validated, typed configuration from environment variables."""

    # ── App ──────────────────────────────────────────
    app_name: str = "IntelliAPI"
    environment: Environment = Environment.DEV
    debug: bool = False
    log_level: str = "info"

    # ── Database ─────────────────────────────────────
    database_url: str = "postgresql+asyncpg://localhost:5432/intelliapi"
    db_pool_size: int = 10
    db_pool_max_overflow: int = 20

    # ── Redis ────────────────────────────────────────
    redis_url: str = "redis://localhost:6379/0"

    # ── ML ───────────────────────────────────────────
    model_path: str = "./models"
    max_batch_size: int = 32
    inference_timeout: float = 30.0

    # ── Security ─────────────────────────────────────
    secret_key: str = "change-me-in-production"
    allowed_origins: list[str] = ["http://localhost:3000"]
    rate_limit_per_minute: int = 60

    # ── Observability ────────────────────────────────
    otlp_endpoint: str = ""
    enable_metrics: bool = True

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": False,
    }

    @property
    def is_production(self) -> bool:
        return self.environment == Environment.PROD


@lru_cache
def get_settings() -> Settings:
    return Settings()
`, notes: [
          "pydantic_settings validates all env vars at startup — typos cause immediate errors, not runtime surprises",
          "lru_cache ensures Settings is created once and reused (singleton pattern)",
          "Different .env files for each environment; secrets come from vault/secrets manager in production"
        ] },

        { type: "comparison", headers: ["Setting", "Dev", "Staging", "Prod"], rows: [
          ["debug", "True", "False", "False"],
          ["log_level", "debug", "info", "warning"],
          ["db_pool_size", "5", "10", "20"],
          ["rate_limit_per_minute", "1000", "120", "60"],
          ["allowed_origins", "localhost:3000", "staging.intelliapi.com", "intelliapi.com"],
          ["otlp_endpoint", "(empty)", "otel-collector:4317", "otel-collector:4317"],
          ["secret_key", "dev-key", "from vault", "from vault"]
        ] },

        // ── Section 9: Production Checklist ─────────────────────────────────
        { type: "heading", text: "Production Deployment Checklist", level: 2 },
        { type: "text", text: "Before deploying IntelliAPI to production, verify every item on this checklist:" },

        { type: "list", items: [
          "<strong>HTTPS everywhere</strong> — TLS termination at the load balancer or reverse proxy; HSTS header set",
          "<strong>Non-root container user</strong> — the Dockerfile runs as <code>appuser</code>, not root",
          "<strong>Security headers</strong> — X-Content-Type-Options, X-Frame-Options, Strict-Transport-Security via middleware",
          "<strong>.dockerignore</strong> — .env, .git, tests excluded from the image",
          "<strong>Read-only filesystem</strong> — mount the container FS as read-only; use tmpfs for /tmp",
          "<strong>Resource limits</strong> — set CPU/memory limits in Kubernetes to prevent noisy-neighbor issues",
          "<strong>Secret management</strong> — never bake secrets into images; use Kubernetes Secrets or External Secrets Operator",
          "<strong>Dependency scanning</strong> — run <code>pip-audit</code> or <code>trivy</code> in CI to catch CVEs",
          "<strong>Structured logging</strong> — JSON logs with request_id, user_id, duration for log aggregation",
          "<strong>Rate limiting</strong> — protect endpoints from abuse; enforce per-API-key limits",
          "<strong>Graceful shutdown</strong> — lifespan handler drains requests and closes connections",
          "<strong>Health probes</strong> — liveness (trivial), readiness (checks deps), startup (for model loading)",
          "<strong>Prometheus metrics</strong> — request count, latency histogram, error rate, inference duration",
          "<strong>Alerting</strong> — alert on error rate > 1%, p99 latency > 5s, pod restart loops"
        ] },

        { type: "code", lang: "python", filename: "app/middleware/security.py", code: `
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to every response."""

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = (
            "max-age=63072000; includeSubDomains; preload"
        )
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = (
            "camera=(), microphone=(), geolocation=()"
        )

        return response
`, notes: [
          "These headers defend against clickjacking, MIME sniffing, and downgrade attacks",
          "HSTS with preload tells browsers to NEVER use HTTP for your domain",
          "Add this middleware early in the stack so every response gets headers"
        ] },

        // ── Interview Callout ───────────────────────────────────────────────
        { type: "callout", variant: "interview", title: "Interview: How would you deploy a FastAPI app to production?", text: "<strong>Strong answer structure:</strong><br><br><strong>1. Server topology:</strong> 'I use Gunicorn as a process manager with Uvicorn async workers. Worker count is typically 2×CPU+1 for I/O-bound workloads, fewer for GPU inference. max-requests recycles workers to prevent memory leaks.'<br><br><strong>2. Containerization:</strong> 'Multi-stage Docker build — builder stage compiles wheels, production stage copies only runtime deps. Non-root user, .dockerignore to exclude secrets, HEALTHCHECK directive.'<br><br><strong>3. Health checks:</strong> 'Liveness probe is trivial (no external deps). Readiness probe verifies DB and Redis connectivity. Startup probe with generous timeout for model loading.'<br><br><strong>4. Graceful shutdown:</strong> 'The lifespan context manager catches SIGTERM, drains in-flight requests, closes connection pools, and flushes metrics before exit.'<br><br><strong>5. Observability:</strong> 'Prometheus metrics with normalized path labels, OpenTelemetry distributed tracing, structured JSON logs with correlation IDs.'<br><br><strong>6. Security:</strong> 'HTTPS via TLS termination, security headers middleware, rate limiting, secret management through Kubernetes Secrets or External Secrets Operator, dependency scanning in CI.'" }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 10 — System Design: AI Inference Platform
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "system-design-ai-inference-platform",
      title: "System Design: AI Inference Platform",
      readTime: "40 min",
      content: [
        { type: "text", text: "This is the capstone lesson. We take everything built across the previous nine lessons and zoom out: <em>\"Design IntelliAPI at scale.\"</em> This is the kind of system design question you will face in senior backend and ML infrastructure interviews. We will walk through every component — from the load balancer to the GPU workers — with production-grade patterns for rate limiting, caching, batching, circuit breaking, and queue-based inference." },

        // ── Section 1: The Problem Statement ────────────────────────────────
        { type: "heading", text: "The Design Prompt", level: 2 },
        { type: "callout", variant: "info", title: "System Design Question", text: "<em>\"Design a scalable AI inference platform that handles document classification and summarization. It should support 10,000 requests per minute with p99 latency under 2 seconds for classification and under 10 seconds for summarization. The system must handle traffic spikes, model updates without downtime, and graceful degradation when GPU resources are exhausted.\"</em>" },

        { type: "text", text: "Let us break this down systematically using the framework: <strong>Requirements → Architecture → Deep Dives → Bottlenecks → Monitoring</strong>." },

        { type: "list", items: [
          "<strong>Functional requirements:</strong> classify documents (fast, ~200ms), summarize documents (slower, ~2-8s), support multiple model versions, return structured results with confidence scores",
          "<strong>Non-functional requirements:</strong> 10K RPM throughput, p99 < 2s classification / < 10s summarization, 99.9% availability, horizontal scalability, zero-downtime deployments",
          "<strong>Out of scope:</strong> model training, data labeling, user management (assume external auth)"
        ] },

        // ── Section 2: High-Level Architecture ──────────────────────────────
        { type: "heading", text: "High-Level Architecture", level: 2 },

        { type: "diagram", code: `
                         ┌──────────────┐
                         │   Clients    │
                         │  (Web/API)   │
                         └──────┬───────┘
                                │
                         ┌──────▼───────┐
                         │ Load Balancer │
                         │  (L7 / ALB)  │
                         └──────┬───────┘
                                │
                    ┌───────────▼───────────┐
                    │     API Gateway        │
                    │  (rate limit, auth,    │
                    │   request routing)     │
                    └───────────┬───────────┘
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                   │
      ┌───────▼──────┐  ┌──────▼───────┐  ┌───────▼──────┐
      │  Sync Path   │  │  Async Path  │  │  Management  │
      │  (classify)  │  │ (summarize)  │  │    APIs      │
      │  < 2s SLA    │  │  < 60s SLA   │  │              │
      └───────┬──────┘  └──────┬───────┘  └──────────────┘
              │                 │
              ▼                 ▼
      ┌──────────────┐  ┌──────────────┐
      │  GPU Workers │  │  Task Queue  │
      │  (classify)  │  │  (Redis/SQS) │
      │              │  └──────┬───────┘
      └──────────────┘         │
                               ▼
                       ┌──────────────┐
                       │  GPU Workers │
                       │ (summarize)  │
                       └──────────────┘
              │                │
              ▼                ▼
      ┌──────────────────────────────┐
      │         Redis Cache          │
      │   (results, rate limits)     │
      └──────────────────────────────┘
              │                │
              ▼                ▼
      ┌──────────────────────────────┐
      │        PostgreSQL            │
      │  (jobs, results, audit log)  │
      └──────────────────────────────┘
              │
              ▼
      ┌──────────────────────────────┐
      │      Model Registry          │
      │  (S3 / GCS — versioned       │
      │   model artifacts)           │
      └──────────────────────────────┘
` },

        { type: "text", text: "The key architectural insight is the <strong>two-path design</strong>: fast synchronous inference for classification (small models, low latency) and asynchronous queue-based processing for summarization (large models, high latency). This lets us optimize each path independently." },

        // ── Section 3: Rate Limiting ────────────────────────────────────────
        { type: "heading", text: "Rate Limiting Strategies", level: 2 },
        { type: "text", text: "Rate limiting protects GPU resources (expensive!) from abuse and ensures fair access across tenants." },

        { type: "comparison", headers: ["Algorithm", "How It Works", "Best For"], rows: [
          ["Token Bucket", "Tokens added at fixed rate; each request consumes a token. Allows bursts up to bucket size.", "API rate limiting with burst tolerance"],
          ["Sliding Window Log", "Store timestamp of each request; count requests in the trailing window.", "Precise limiting but high memory"],
          ["Sliding Window Counter", "Weighted average of current and previous window counts.", "Good balance of precision and memory"],
          ["Fixed Window", "Count requests per discrete time window.", "Simple but allows 2x burst at window boundary"]
        ] },

        { type: "code", lang: "python", filename: "app/middleware/rate_limiter.py", code: `
import time
from redis.asyncio import Redis
from fastapi import Request, HTTPException, status


class SlidingWindowRateLimiter:
    """Redis-based sliding window rate limiter.

    Uses a sorted set per key where scores are timestamps.
    """

    def __init__(self, redis: Redis, limit: int, window_seconds: int):
        self.redis = redis
        self.limit = limit
        self.window = window_seconds

    async def is_allowed(self, key: str) -> tuple[bool, dict]:
        """Check if request is allowed. Returns (allowed, headers)."""
        now = time.time()
        window_start = now - self.window
        pipe = self.redis.pipeline()

        # Remove expired entries
        pipe.zremrangebyscore(key, 0, window_start)
        # Add current request
        pipe.zadd(key, {f"{now}": now})
        # Count requests in window
        pipe.zcard(key)
        # Set expiry on the key
        pipe.expire(key, self.window)

        results = await pipe.execute()
        request_count = results[2]

        headers = {
            "X-RateLimit-Limit": str(self.limit),
            "X-RateLimit-Remaining": str(max(0, self.limit - request_count)),
            "X-RateLimit-Reset": str(int(now + self.window)),
        }

        return request_count <= self.limit, headers


class TokenBucketRateLimiter:
    """Redis-based token bucket with Lua script for atomicity."""

    REFILL_SCRIPT = """
    local key = KEYS[1]
    local max_tokens = tonumber(ARGV[1])
    local refill_rate = tonumber(ARGV[2])
    local now = tonumber(ARGV[3])

    local bucket = redis.call('HMGET', key, 'tokens', 'last_refill')
    local tokens = tonumber(bucket[1]) or max_tokens
    local last_refill = tonumber(bucket[2]) or now

    -- Refill tokens based on elapsed time
    local elapsed = now - last_refill
    tokens = math.min(max_tokens, tokens + elapsed * refill_rate)

    -- Try to consume one token
    local allowed = 0
    if tokens >= 1 then
        tokens = tokens - 1
        allowed = 1
    end

    redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
    redis.call('EXPIRE', key, max_tokens / refill_rate + 1)

    return {allowed, math.floor(tokens)}
    """

    def __init__(self, redis: Redis, max_tokens: int, refill_rate: float):
        self.redis = redis
        self.max_tokens = max_tokens
        self.refill_rate = refill_rate  # tokens per second
        self._script = None

    async def _get_script(self):
        if self._script is None:
            self._script = self.redis.register_script(self.REFILL_SCRIPT)
        return self._script

    async def is_allowed(self, key: str) -> tuple[bool, int]:
        """Returns (allowed, remaining_tokens)."""
        script = await self._get_script()
        result = await script(
            keys=[f"rl:tb:{key}"],
            args=[self.max_tokens, self.refill_rate, time.time()],
        )
        return bool(result[0]), int(result[1])
`, notes: [
          "The sliding window uses a Redis sorted set — ZREMRANGEBYSCORE removes expired entries atomically",
          "The token bucket uses a Lua script for atomicity — no race conditions between read and write",
          "Always return rate limit headers (X-RateLimit-*) so clients can self-throttle",
          "Use per-API-key keys for tenant isolation: rl:{api_key}:{endpoint}"
        ] },

        // ── Section 4: Caching Layers ───────────────────────────────────────
        { type: "heading", text: "Caching Layers", level: 2 },
        { type: "text", text: "GPU inference is expensive. Every cache hit saves compute cost and reduces latency from seconds to milliseconds." },

        { type: "diagram", code: `
Request arrives
      │
      ▼
┌─────────────────┐     HIT      ┌──────────────┐
│  HTTP Cache      │─────────────▶│ Return cached │
│  (ETag / 304)    │              │ response      │
└────────┬────────┘              └──────────────┘
         │ MISS
         ▼
┌─────────────────┐     HIT      ┌──────────────┐
│  Redis Result    │─────────────▶│ Return cached │
│  Cache           │              │ result        │
│  (content hash)  │              └──────────────┘
└────────┬────────┘
         │ MISS
         ▼
┌─────────────────┐
│  GPU Inference   │──────┐
│  (run model)     │      │
└─────────────────┘      │
                          ▼
                   Store in Redis
                   (TTL: 1 hour)
` },

        { type: "code", lang: "python", filename: "app/cache/inference_cache.py", code: `
import hashlib
import json
from redis.asyncio import Redis
from typing import Optional


class InferenceCache:
    """Content-addressable cache for inference results.

    Key insight: the same document with the same model version
    will always produce the same result. We hash the content
    and model version to create a cache key.
    """

    def __init__(self, redis: Redis, ttl: int = 3600):
        self.redis = redis
        self.ttl = ttl

    def _make_key(self, content: str, model_name: str, model_version: str) -> str:
        """Create a deterministic cache key from content + model."""
        payload = f"{model_name}:{model_version}:{content}"
        content_hash = hashlib.sha256(payload.encode()).hexdigest()[:16]
        return f"inference:{model_name}:{content_hash}"

    async def get(
        self, content: str, model_name: str, model_version: str
    ) -> Optional[dict]:
        key = self._make_key(content, model_name, model_version)
        cached = await self.redis.get(key)
        if cached:
            return json.loads(cached)
        return None

    async def set(
        self,
        content: str,
        model_name: str,
        model_version: str,
        result: dict,
    ) -> None:
        key = self._make_key(content, model_name, model_version)
        await self.redis.setex(key, self.ttl, json.dumps(result))

    async def invalidate_model(self, model_name: str) -> int:
        """Invalidate all cached results for a model (on model update)."""
        pattern = f"inference:{model_name}:*"
        count = 0
        async for key in self.redis.scan_iter(match=pattern, count=100):
            await self.redis.delete(key)
            count += 1
        return count
`, notes: [
          "Content-addressable caching: same input + same model = same result → safe to cache",
          "SHA-256 hash truncated to 16 chars gives collision resistance without bloating key names",
          "invalidate_model uses SCAN (not KEYS) to avoid blocking Redis during model updates"
        ] },

        // ── Section 5: Request Batching ─────────────────────────────────────
        { type: "heading", text: "Dynamic Request Batching for GPU Utilization", level: 2 },
        { type: "text", text: "GPUs achieve peak throughput when processing <strong>batches</strong>, not individual requests. Dynamic batching collects incoming requests over a short window, batches them, and runs a single forward pass." },

        { type: "diagram", code: `
Incoming requests          Batch Assembly            GPU Forward Pass
                          (max 10ms wait)
  req1 ──┐
  req2 ──┤              ┌──────────────┐           ┌──────────────┐
  req3 ──┼─────────────▶│  Batch of 4  │──────────▶│  Single GPU  │
  req4 ──┘              │  [r1,r2,r3,  │           │  forward     │
                        │   r4]        │           │  pass        │
                        └──────────────┘           └──────┬───────┘
                                                          │
                                               ┌──────────▼──────────┐
                                               │  Unbatch results    │
                                               │  r1→res1, r2→res2,  │
                                               │  r3→res3, r4→res4   │
                                               └─────────────────────┘
` },

        { type: "code", lang: "python", filename: "app/ml/batcher.py", code: `
import asyncio
import time
from dataclasses import dataclass, field
from typing import Any
import logging

logger = logging.getLogger(__name__)


@dataclass
class BatchItem:
    """A single inference request waiting to be batched."""
    input_data: Any
    future: asyncio.Future = field(default_factory=lambda: asyncio.get_event_loop().create_future())
    created_at: float = field(default_factory=time.time)


class DynamicBatcher:
    """Collects individual requests into batches for efficient GPU inference.

    Two triggers for batch execution:
    1. Batch reaches max_batch_size
    2. max_wait_ms elapsed since first item in batch
    """

    def __init__(
        self,
        model_fn,           # async callable: list[input] -> list[output]
        max_batch_size: int = 32,
        max_wait_ms: float = 10.0,
    ):
        self.model_fn = model_fn
        self.max_batch_size = max_batch_size
        self.max_wait_ms = max_wait_ms
        self._queue: asyncio.Queue[BatchItem] = asyncio.Queue()
        self._running = False

    async def start(self):
        """Start the batch processing loop."""
        self._running = True
        asyncio.create_task(self._process_loop())

    async def stop(self):
        """Stop accepting new items and drain the queue."""
        self._running = False

    async def submit(self, input_data: Any, timeout: float = 30.0) -> Any:
        """Submit an inference request and wait for the result."""
        item = BatchItem(input_data=input_data)
        await self._queue.put(item)
        return await asyncio.wait_for(item.future, timeout=timeout)

    async def _process_loop(self):
        """Main loop: collect items into batches and execute."""
        while self._running or not self._queue.empty():
            batch = await self._collect_batch()
            if not batch:
                continue

            try:
                inputs = [item.input_data for item in batch]
                results = await self.model_fn(inputs)

                # Distribute results back to individual futures
                for item, result in zip(batch, results):
                    if not item.future.done():
                        item.future.set_result(result)

                logger.info(f"Batch processed: size={len(batch)}")

            except Exception as e:
                # On error, fail all items in the batch
                for item in batch:
                    if not item.future.done():
                        item.future.set_exception(e)
                logger.error(f"Batch failed: {e}")

    async def _collect_batch(self) -> list[BatchItem]:
        """Collect items until batch is full or timeout expires."""
        batch: list[BatchItem] = []

        # Wait for at least one item
        try:
            first = await asyncio.wait_for(
                self._queue.get(), timeout=1.0
            )
            batch.append(first)
        except asyncio.TimeoutError:
            return batch

        # Collect more items up to max_batch_size or max_wait_ms
        deadline = time.time() + (self.max_wait_ms / 1000.0)
        while len(batch) < self.max_batch_size:
            remaining = deadline - time.time()
            if remaining <= 0:
                break
            try:
                item = await asyncio.wait_for(
                    self._queue.get(), timeout=remaining
                )
                batch.append(item)
            except asyncio.TimeoutError:
                break

        return batch
`, notes: [
          "Each caller gets an asyncio.Future — they await their individual result while sharing a batch",
          "max_wait_ms trades latency for throughput: 10ms wait allows larger batches = higher GPU utilization",
          "On batch failure, all items in the batch get the exception — callers see individual errors"
        ] },

        { type: "callout", variant: "info", title: "Batching Impact", text: "A typical transformer model processes a batch of 32 items only 2-3x slower than a single item. This means batching can improve throughput by <strong>10-15x</strong> while adding only 10ms of collection latency. This is the single most impactful optimization for GPU inference systems." },

        // ── Section 6: Horizontal Scaling ───────────────────────────────────
        { type: "heading", text: "Horizontal Scaling: Stateless Workers", level: 2 },
        { type: "text", text: "IntelliAPI workers must be <strong>stateless</strong> — all state lives in Redis and PostgreSQL. This allows the orchestrator to scale workers up and down based on demand." },

        { type: "list", items: [
          "<strong>Session state</strong> — stored in Redis, not in-process memory. Any worker can handle any request.",
          "<strong>Model weights</strong> — loaded from shared storage (S3/GCS) at startup, cached in worker memory. All workers run the same model version via config.",
          "<strong>File uploads</strong> — streamed directly to object storage (S3), never held on local disk.",
          "<strong>Autoscaling signals</strong> — scale on GPU utilization (> 70%), queue depth (> 100 pending jobs), or request latency (p99 > SLA).",
          "<strong>Scale-to-zero</strong> — for cost savings, summarization workers can scale to zero and spin up when the queue has items."
        ] },

        { type: "comparison", headers: ["Component", "Scaling Strategy", "Trigger"], rows: [
          ["API servers (CPU)", "Horizontal Pod Autoscaler", "CPU > 60% or RPS > threshold"],
          ["Classification workers (GPU)", "HPA with custom metrics", "GPU utilization > 70%"],
          ["Summarization workers (GPU)", "KEDA (queue-based)", "Queue depth > 0 (scale-to-zero)"],
          ["Redis", "Vertical (bigger instance) or Redis Cluster", "Memory > 70%"],
          ["PostgreSQL", "Read replicas + connection pooler (PgBouncer)", "Connection count > 80% of max"]
        ] },

        // ── Section 7: Circuit Breaker ──────────────────────────────────────
        { type: "heading", text: "Circuit Breaker Pattern", level: 2 },
        { type: "text", text: "When a downstream service (model server, database) is failing, continuing to send requests makes things worse. The circuit breaker pattern <strong>fails fast</strong> to protect the system." },

        { type: "diagram", code: `
                   ┌───────────────┐
           ┌──────│    CLOSED      │◀─────────────────┐
           │      │ (normal flow)  │                   │
           │      └───────┬───────┘                   │
           │              │                            │
           │    failure_count > threshold               │
           │              │                            │
           │      ┌───────▼───────┐            success_count
           │      │     OPEN      │            > threshold
           │      │ (fail fast —  │                   │
           │      │  return 503)  │            ┌──────┴───────┐
           │      └───────┬───────┘            │  HALF-OPEN   │
           │              │                    │ (allow 1 req │
           │       timeout expires             │  to test)    │
           │              │                    └──────────────┘
           │              └──────────────────────────▶│
           │                                          │
           │              failure → back to OPEN ─────┘
           └──────────────────────────────────────────┘
` },

        { type: "code", lang: "python", filename: "app/resilience/circuit_breaker.py", code: `
import asyncio
import time
from enum import Enum
from typing import Callable, Any
import logging

logger = logging.getLogger(__name__)


class CircuitState(Enum):
    CLOSED = "closed"        # Normal operation
    OPEN = "open"            # Failing fast
    HALF_OPEN = "half_open"  # Testing recovery


class CircuitBreaker:
    """Async circuit breaker for protecting downstream calls."""

    def __init__(
        self,
        name: str,
        failure_threshold: int = 5,
        recovery_timeout: float = 30.0,
        half_open_max_calls: int = 3,
    ):
        self.name = name
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.half_open_max_calls = half_open_max_calls

        self._state = CircuitState.CLOSED
        self._failure_count = 0
        self._success_count = 0
        self._last_failure_time = 0.0
        self._lock = asyncio.Lock()

    @property
    def state(self) -> CircuitState:
        if self._state == CircuitState.OPEN:
            if time.time() - self._last_failure_time > self.recovery_timeout:
                return CircuitState.HALF_OPEN
        return self._state

    async def call(self, func: Callable, *args, **kwargs) -> Any:
        """Execute func through the circuit breaker."""
        current_state = self.state

        if current_state == CircuitState.OPEN:
            raise CircuitBreakerOpenError(
                f"Circuit '{self.name}' is OPEN. Failing fast."
            )

        try:
            result = await func(*args, **kwargs)
            await self._on_success()
            return result
        except Exception as e:
            await self._on_failure()
            raise

    async def _on_success(self):
        async with self._lock:
            if self._state == CircuitState.HALF_OPEN:
                self._success_count += 1
                if self._success_count >= self.half_open_max_calls:
                    self._state = CircuitState.CLOSED
                    self._failure_count = 0
                    self._success_count = 0
                    logger.info(f"Circuit '{self.name}' → CLOSED (recovered)")
            else:
                self._failure_count = 0

    async def _on_failure(self):
        async with self._lock:
            self._failure_count += 1
            self._last_failure_time = time.time()

            if self._state == CircuitState.HALF_OPEN:
                self._state = CircuitState.OPEN
                self._success_count = 0
                logger.warning(f"Circuit '{self.name}' → OPEN (half-open test failed)")
            elif self._failure_count >= self.failure_threshold:
                self._state = CircuitState.OPEN
                logger.warning(
                    f"Circuit '{self.name}' → OPEN "
                    f"(failures: {self._failure_count})"
                )


class CircuitBreakerOpenError(Exception):
    pass
`, notes: [
          "Three states: CLOSED (normal), OPEN (fail fast with 503), HALF_OPEN (let a few requests through to test recovery)",
          "The lock ensures thread-safe state transitions under concurrent requests",
          "Use separate circuit breakers per downstream service: circuit_db, circuit_model_server, etc."
        ] },

        // ── Section 8: Load Shedding ────────────────────────────────────────
        { type: "heading", text: "Load Shedding: Prioritized Degradation", level: 2 },
        { type: "text", text: "When the system is overloaded, it is better to <strong>reject some requests quickly</strong> than to serve all requests slowly. Load shedding prioritizes traffic and drops low-priority requests first." },

        { type: "code", lang: "python", filename: "app/middleware/load_shedding.py", code: `
import asyncio
from enum import IntEnum
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware


class Priority(IntEnum):
    CRITICAL = 1   # Health checks, admin
    HIGH = 2       # Paid tier customers
    NORMAL = 3     # Free tier
    LOW = 4        # Batch / background


class LoadShedder(BaseHTTPMiddleware):
    """Reject low-priority requests when concurrency is too high."""

    def __init__(self, app, max_concurrent: int = 100):
        super().__init__(app)
        self.max_concurrent = max_concurrent
        self._semaphore = asyncio.Semaphore(max_concurrent)
        self._active = 0

    def _get_priority(self, request: Request) -> Priority:
        """Determine request priority from path and headers."""
        path = request.url.path
        if path.startswith("/health"):
            return Priority.CRITICAL
        tier = request.headers.get("X-Customer-Tier", "free")
        if tier == "enterprise":
            return Priority.HIGH
        if tier == "free":
            return Priority.NORMAL
        return Priority.LOW

    async def dispatch(self, request: Request, call_next):
        priority = self._get_priority(request)
        load_ratio = self._active / self.max_concurrent

        # Progressive shedding based on priority and load
        if load_ratio > 0.9 and priority >= Priority.LOW:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Service overloaded. Low-priority request shed.",
            )
        if load_ratio > 0.8 and priority >= Priority.NORMAL:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Service overloaded. Try again shortly.",
            )

        # Critical and High priority requests always proceed
        acquired = self._semaphore.acquire()
        try:
            await asyncio.wait_for(acquired, timeout=5.0)
        except asyncio.TimeoutError:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Server at capacity. Please retry.",
            )

        self._active += 1
        try:
            return await call_next(request)
        finally:
            self._active -= 1
            self._semaphore.release()
`, notes: [
          "Progressive shedding: at 80% capacity drop free-tier; at 90% drop everything except critical and paid",
          "Health checks are always CRITICAL — they must succeed or the orchestrator kills the container",
          "Return 503 (not 429) for load shedding — 429 is for rate limiting, 503 is for overload"
        ] },

        // ── Section 9: Queue-Based Async Inference ──────────────────────────
        { type: "heading", text: "Queue-Based Architecture for Async Inference", level: 2 },
        { type: "text", text: "Summarization takes 2-8 seconds per document. Holding HTTP connections open that long wastes API server resources. Instead, we use a <strong>queue-based architecture</strong> where the API server enqueues jobs and clients poll for results." },

        { type: "diagram", code: `
Client                API Server              Queue (Redis)           GPU Worker
  │                       │                       │                       │
  │  POST /summarize      │                       │                       │
  │──────────────────────▶│                       │                       │
  │                       │   LPUSH job           │                       │
  │                       │──────────────────────▶│                       │
  │  202 { job_id: "x" }  │                       │                       │
  │◀──────────────────────│                       │                       │
  │                       │                       │   BRPOP job           │
  │                       │                       │◀──────────────────────│
  │                       │                       │                       │
  │                       │                       │   (GPU inference)     │
  │                       │                       │                       │
  │                       │                       │   SET result:x        │
  │                       │                       │──────────────────────▶│
  │  GET /jobs/x          │                       │                       │
  │──────────────────────▶│   GET result:x        │                       │
  │                       │──────────────────────▶│                       │
  │  200 { status: done,  │                       │                       │
  │        result: {...} } │                       │                       │
  │◀──────────────────────│                       │                       │
` },

        { type: "code", lang: "python", filename: "app/routes/inference.py", code: `
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from redis.asyncio import Redis

from app.deps import get_redis, get_inference_cache
from app.schemas import SummarizeRequest, JobResponse, JobStatusResponse
from app.cache.inference_cache import InferenceCache

router = APIRouter(prefix="/v1", tags=["inference"])


@router.post(
    "/summarize",
    response_model=JobResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def submit_summarization(
    request: SummarizeRequest,
    redis: Redis = Depends(get_redis),
    cache: InferenceCache = Depends(get_inference_cache),
):
    """Submit a document for async summarization.

    Returns immediately with a job_id. Client polls /jobs/{job_id}.
    """
    # Check cache first
    cached = await cache.get(
        request.content, "summarizer", request.model_version
    )
    if cached:
        job_id = str(uuid.uuid4())
        await redis.setex(
            f"job:{job_id}",
            3600,
            '{"status":"completed","result":' + str(cached) + '}',
        )
        return JobResponse(job_id=job_id, status="completed")

    # Enqueue job
    job_id = str(uuid.uuid4())
    job_payload = {
        "job_id": job_id,
        "content": request.content,
        "model_version": request.model_version,
        "priority": request.priority or "normal",
    }

    # Store job metadata
    import json
    await redis.setex(
        f"job:{job_id}", 3600,
        json.dumps({"status": "queued", "result": None}),
    )

    # Push to priority queue
    queue_name = f"inference:summarize:{job_payload['priority']}"
    await redis.lpush(queue_name, json.dumps(job_payload))

    return JobResponse(job_id=job_id, status="queued")


@router.get("/jobs/{job_id}", response_model=JobStatusResponse)
async def get_job_status(
    job_id: str,
    redis: Redis = Depends(get_redis),
):
    """Poll for job completion."""
    import json
    raw = await redis.get(f"job:{job_id}")
    if not raw:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found or expired",
        )
    data = json.loads(raw)
    return JobStatusResponse(
        job_id=job_id,
        status=data["status"],
        result=data.get("result"),
    )
`, notes: [
          "202 Accepted — the standard HTTP status for 'I received your request, processing async'",
          "Priority queues (high/normal/low) let paid customers jump ahead during high load",
          "Jobs expire after 1 hour (setex) — clients must poll within that window"
        ] },

        // ── Section 10: Monitoring — Four Golden Signals ────────────────────
        { type: "heading", text: "Monitoring: The Four Golden Signals", level: 2 },
        { type: "text", text: "Google's SRE book defines the <strong>four golden signals</strong> — the minimum metrics every production service needs. If you monitor nothing else, monitor these:" },

        { type: "comparison", headers: ["Signal", "What It Measures", "IntelliAPI Metric", "Alert Threshold"], rows: [
          ["Latency", "Time to serve a request", "<code>http_request_duration_seconds</code> (p50, p99)", "p99 > 2s (classify) or > 10s (summarize)"],
          ["Traffic", "Demand on the system", "<code>http_requests_total</code> (rate)", "Sudden drop > 50% (possible upstream failure)"],
          ["Errors", "Rate of failed requests", "<code>http_requests_total{status=~'5..'}</code>", "Error rate > 1% over 5 min"],
          ["Saturation", "How full the system is", "GPU utilization, queue depth, connection pool usage", "GPU > 85%, queue > 500, pool > 90%"]
        ] },

        { type: "list", items: [
          "<strong>Latency:</strong> measure at the <em>server</em> (not just the client) and track percentiles (p50, p95, p99), not averages. Averages hide tail latency.",
          "<strong>Traffic:</strong> a sudden drop in traffic is often worse than a spike — it means something upstream broke and is no longer sending requests.",
          "<strong>Errors:</strong> distinguish between client errors (4xx) and server errors (5xx). Alert on 5xx rate, not total error count.",
          "<strong>Saturation:</strong> for GPU inference, saturation = queue depth. When the queue grows, latency grows linearly. This is your leading indicator of trouble."
        ] },

        // ── Section 11: Capacity Planning ───────────────────────────────────
        { type: "heading", text: "Capacity Planning and Cost Estimation", level: 2 },
        { type: "text", text: "Interviewers love to see back-of-the-envelope calculations. Let us estimate the infrastructure needed for IntelliAPI at 10K RPM:" },

        { type: "code", lang: "text", filename: "capacity-planning.txt", code: `
=== Traffic Breakdown ===
Total: 10,000 requests/min = ~167 RPS
  - Classification: 70% = ~117 RPS
  - Summarization:  30% = ~50 RPS

=== Classification (Sync Path) ===
Model latency: ~200ms per request
GPU batch size: 32
Effective throughput per GPU: 32 / 0.25s = 128 inferences/sec
GPUs needed: 117 / 128 = ~1 GPU (+ 1 for redundancy = 2 GPUs)

=== Summarization (Async Path) ===
Model latency: ~5s per request
GPU batch size: 8 (larger model, less memory for batching)
Effective throughput per GPU: 8 / 5.5s = ~1.5 inferences/sec
GPUs needed: 50 / 1.5 = ~34 requests queued per GPU per minute
  With 4 GPUs: 4 × 1.5 = 6 RPS → 50/6 = need ~9 GPUs
  (or accept longer queue times with fewer GPUs)

=== API Servers (CPU) ===
Each Uvicorn worker handles ~500 concurrent connections
At 167 RPS with ~200ms avg response time: ~33 concurrent connections
2-3 workers per pod, 2 pods = comfortable headroom

=== Redis ===
Rate limit keys: ~10K users × 32 bytes = ~320 KB
Cache entries: ~100K results × 2 KB = ~200 MB
Queue depth: ~1000 jobs × 1 KB = ~1 MB
Total: < 1 GB → single Redis instance is fine

=== PostgreSQL ===
Write rate: ~167 RPM audit log = ~3 writes/sec
Read rate: job status polls ~500 RPM = ~8 reads/sec
This is trivial for PostgreSQL. Single instance + read replica.

=== Monthly Cost Estimate (AWS) ===
9× g5.xlarge (GPU workers):     9 × $1.006/hr × 730 = ~$6,600
2× c6i.xlarge (API servers):    2 × $0.170/hr × 730 = ~$250
1× r6g.large (Redis):           1 × $0.126/hr × 730 = ~$92
1× db.r6g.large (RDS Postgres): 1 × $0.260/hr × 730 = ~$190
Load Balancer + transfer:                              ~$200
                                              Total: ~$7,300/mo
`, notes: [
          "Always show your math in system design interviews — interviewers want to see the reasoning",
          "GPU cost dominates (~90% of total) — this is why caching and batching are critical optimizations",
          "These estimates assume sustained load. With autoscaling and off-peak scale-down, real cost is 40-60% lower"
        ] },

        { type: "callout", variant: "warning", title: "Cost Optimization Levers", text: "Three things that dramatically cut GPU costs: <strong>(1)</strong> Result caching — every cache hit avoids a GPU inference. <strong>(2)</strong> Dynamic batching — 10-15x better GPU utilization. <strong>(3)</strong> Model quantization (FP16/INT8) — 2-4x faster inference with minimal accuracy loss. Together these can reduce the GPU count by 60-70%." },

        // ── Interview Callout ───────────────────────────────────────────────
        { type: "callout", variant: "interview", title: "Interview: System Design — AI Inference Platform", text: "<strong>Full answer walkthrough (use this framework):</strong><br><br><strong>1. Clarify requirements (2 min):</strong> 'What's the expected QPS? What are the latency SLAs? Do we need real-time or is async acceptable? What models — classification (fast) or generation (slow)?'<br><br><strong>2. High-level design (5 min):</strong> 'Two-path architecture: sync path for fast classification behind a load balancer, async queue-based path for summarization. Stateless API servers, GPU workers pulling from priority queues, Redis for caching and rate limiting, PostgreSQL for persistence.'<br><br><strong>3. Deep dive — batching (5 min):</strong> 'GPUs process batches efficiently. I would implement a dynamic batcher that collects requests for up to 10ms, then runs a single forward pass. This improves throughput 10-15x. Each caller gets an asyncio Future for their individual result.'<br><br><strong>4. Deep dive — resilience (5 min):</strong> 'Circuit breakers on all downstream calls — if the model server fails, we fail fast with 503 instead of holding connections. Load shedding drops low-priority requests at 80% capacity. Rate limiting via Redis sliding window with per-customer keys.'<br><br><strong>5. Deep dive — caching (3 min):</strong> 'Content-addressable cache in Redis: hash(document + model_version) → result. Same document always produces the same classification. Cache hit rate of 30-40% is realistic for enterprise use cases with recurring documents.'<br><br><strong>6. Monitoring and scaling (3 min):</strong> 'Four golden signals: latency percentiles, request rate, error rate, GPU saturation. Autoscale API servers on CPU, GPU workers on queue depth via KEDA. Summarization workers can scale to zero when the queue is empty.'<br><br><strong>7. Cost estimation (2 min):</strong> 'At 10K RPM, roughly 9 GPUs for summarization, 2 for classification, ~$7K/month. Caching and batching can reduce this to ~$3K by eliminating 60% of GPU inference calls.'" }
      ]
    },

  ]; // end m.lessons
})();
