// Patches the FastAPI module (m2) with full tutorial lesson content.
// Loaded after curriculum.js. m2 = CURRICULUM.phases[0].modules[1]
// COMPLETE REWRITE — 9 lessons building a Sentiment Analysis Inference API from zero to production.
// Running project: every lesson adds to the same codebase, from first endpoint to deployed service.
(function patchFastAPILessons() {
  const m = CURRICULUM.phases[0].modules[1]; // phase-1 (index 0), second module

  m.lessons = [

    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 1: Why FastAPI for AI Backends
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "why-fastapi-for-ai",
      title: "Why FastAPI for AI Backends",
      readTime: "14 min",
      content: [
        {
          type: "text",
          text: "You've trained a sentiment classifier. It works — 92% accuracy, sub-100ms inference on your MacBook. Now you need to serve it. Hundreds of internal services need to call your model over HTTP: the recommendation engine, the content moderation pipeline, the customer support bot. You need an API."
        },
        {
          type: "text",
          text: "You could use Flask. It's what every Python tutorial teaches. But here's what happens when 200 concurrent clients hit your Flask endpoint: each request blocks a thread while the model runs inference. Flask spawns threads, each burning ~8MB of RAM. At 200 concurrent users you're using 1.6GB just on thread stacks — before your model even loads into memory. And when a request needs to call another service (a feature store, a database, a cache), that thread sits idle, <em>blocked</em>, waiting for the network response. Your server is doing nothing but waiting, and it's using all your RAM to do it."
        },
        {
          type: "text",
          text: "FastAPI was built to solve exactly this problem. It's an <strong>async-first</strong> Python framework that handles thousands of concurrent connections on a single process, without spawning a thread for every request. It ships with automatic request validation via Pydantic, auto-generated OpenAPI docs, and it's the dominant framework for serving ML models in production at companies like Uber, Netflix, and Microsoft."
        },
        {
          type: "callout",
          variant: "info",
          title: "What We're Building",
          text: "Throughout this module, we'll build a <strong>Sentiment Analysis Inference API</strong> — a production-grade service that accepts text, runs it through a model, caches results in Redis, authenticates callers with JWT, logs structured telemetry, and deploys behind Gunicorn in Docker. Every lesson adds to the same codebase. By the end, you'll have a service that's ready for Kubernetes (Module 4)."
        },
        {
          type: "heading",
          text: "Setting Up on macOS (Apple Silicon)",
          level: 2
        },
        {
          type: "text",
          text: "Before writing any code, let's set up a proper Python environment. If you're on an M-series Mac (M1/M2/M3/M4), there are specific steps to avoid the common ARM64 headaches with Python packages."
        },
        {
          type: "code",
          lang: "bash",
          filename: "setup.sh",
          code: `# ── Step 1: Install Python via pyenv (not Homebrew's python) ─────────
# pyenv compiles Python from source for your architecture (arm64)
# This avoids the x86 vs arm64 confusion that plagues Homebrew Python
brew install pyenv

# Add to your ~/.zshrc (Apple Silicon Macs use zsh by default)
echo 'export PYENV_ROOT="$HOME/.pyenv"' >> ~/.zshrc
echo 'export PATH="$PYENV_ROOT/bin:$PATH"' >> ~/.zshrc
echo 'eval "$(pyenv init -)"' >> ~/.zshrc
source ~/.zshrc

# Install Python 3.12 (latest stable, great FastAPI compatibility)
pyenv install 3.12.4
pyenv global 3.12.4

# Verify — should say arm64, NOT x86_64
python --version          # Python 3.12.4
python -c "import platform; print(platform.machine())"  # arm64

# ── Step 2: Create a project with virtual environment ────────────────
mkdir sentiment-api && cd sentiment-api
python -m venv .venv
source .venv/bin/activate

# ── Step 3: Install FastAPI + production dependencies ────────────────
pip install fastapi[standard]   # includes uvicorn, httpx, etc.
pip install pydantic-settings   # for env-based config (separate from core pydantic)

# Freeze dependencies for reproducibility
pip freeze > requirements.txt`,
          notes: [
            "pyenv compiles Python natively for arm64 — avoids Rosetta translation overhead",
            "fastapi[standard] bundles uvicorn, httpx, python-multipart, and other essentials",
            "Always use a venv — never install into system Python",
            "pydantic-settings is a separate package since Pydantic v2",
          ]
        },
        {
          type: "heading",
          text: "The Python Web Framework Landscape",
          level: 2
        },
        {
          type: "text",
          text: "To understand why FastAPI dominates AI backends, you need to understand what came before it and what each framework optimizes for."
        },
        {
          type: "comparison",
          headers: ["", "Flask", "Django", "FastAPI"],
          rows: [
            ["Released", "2010", "2005", "2018"],
            ["Paradigm", "Sync (WSGI)", "Sync (WSGI, async optional)", "Async-first (ASGI)"],
            ["Validation", "Manual / marshmallow", "Django Forms / DRF serializers", "Built-in via Pydantic"],
            ["API docs", "Manual (Swagger codegen)", "DRF browsable API", "Automatic OpenAPI + Swagger"],
            ["Type hints", "Optional, ignored at runtime", "Optional, ignored at runtime", "Core to the framework — drives validation, docs, serialization"],
            ["Performance", "~800 req/s (single worker)", "~400 req/s (single worker)", "~4,000+ req/s (single worker, async)"],
            ["ML serving", "Common but painful at scale", "Rare (too heavy)", "Dominant — Uber, Netflix, Microsoft, Hugging Face"],
          ]
        },
        {
          type: "text",
          text: "The performance numbers aren't the whole story. Flask <em>can</em> serve ML models — people do it. The difference shows up at scale: when you have 500 concurrent callers, each waiting for model inference, database lookups, and cache checks. Flask blocks a thread on each wait. FastAPI's async model handles them all on a single thread. The resource savings are dramatic."
        },
        {
          type: "heading",
          text: "WSGI vs ASGI: The Protocol Difference",
          level: 2
        },
        {
          type: "text",
          text: "This is the architectural difference that matters. Flask and Django are WSGI apps. FastAPI is an ASGI app. The protocol determines how your server handles connections."
        },
        {
          type: "diagram",
          code: `  WSGI (Flask, Django)                    ASGI (FastAPI)
  ════════════════════                    ════════════════

  Client A ──► Thread 1 ──► Route        Client A ──┐
  Client B ──► Thread 2 ──► Route        Client B ──┤
  Client C ──► Thread 3 ──► Route        Client C ──┼──► Event Loop ──► Coroutines
  Client D ──► Thread 4 ──► Route        Client D ──┤   (single thread)
  Client E ──► Thread 5 ──► Route        Client E ──┘
               ▲                                     ▲
       Each thread: ~8MB RAM              One thread handles ALL
       200 clients = 1.6GB               200 clients = ~50MB
       Threads block on I/O              Coroutines yield on I/O

  WSGI: synchronous, blocking            ASGI: asynchronous, non-blocking
  One request per thread                 Thousands of requests per thread
  Scales with RAM (expensive)            Scales with connections (cheap)`
        },
        {
          type: "text",
          text: "ASGI also supports WebSockets and Server-Sent Events natively — critical for streaming LLM responses. With WSGI, you need hacky workarounds (gevent, eventlet) that break in subtle ways. With ASGI, streaming is a first-class feature."
        },
        {
          type: "heading",
          text: "Your First FastAPI Endpoint",
          level: 2
        },
        {
          type: "text",
          text: "Let's write the first endpoint of our sentiment API. We'll start with the simplest possible version — a health check and a mock prediction endpoint — then build it up over the next 8 lessons."
        },
        {
          type: "code",
          lang: "python",
          filename: "main.py",
          code: `"""Sentiment Analysis Inference API — Lesson 1: skeleton."""
from fastapi import FastAPI

app = FastAPI(
    title="Sentiment Analysis API",
    description="Production inference service for text sentiment classification",
    version="0.1.0",
    docs_url="/docs",       # Swagger UI — visit http://localhost:8000/docs
    redoc_url="/redoc",     # ReDoc alternative docs
)


# ── Health check ─────────────────────────────────────────────────────────
# Every production service needs this. Kubernetes probes hit it every 10s.
# Return 200 = healthy. Anything else = kill and restart the pod.
@app.get("/health")
async def health():
    return {"status": "healthy"}


# ── Mock prediction endpoint ─────────────────────────────────────────────
# We'll replace this with real model inference in Lesson 3.
@app.post("/predict")
async def predict(text: str):
    # Mock: just return a placeholder
    return {
        "text": text,
        "sentiment": "positive",
        "confidence": 0.95,
    }`,
          notes: [
            "FastAPI() creates an ASGI application object",
            "async def makes the route a coroutine — non-blocking by default",
            "@app.get / @app.post are route decorators — they register URL paths with HTTP methods",
            "The /health endpoint is the first thing any production service needs",
          ]
        },
        {
          type: "heading",
          text: "Running the Server",
          level: 2
        },
        {
          type: "code",
          lang: "bash",
          filename: "terminal",
          code: `# Start the development server (from your project directory)
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# You should see:
# INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
# INFO:     Started reloader process [12345] using StatReload

# Test it:
curl http://localhost:8000/health
# {"status":"healthy"}

curl -X POST "http://localhost:8000/predict?text=This+movie+was+amazing"
# {"text":"This movie was amazing","sentiment":"positive","confidence":0.95}

# Open the auto-generated docs:
open http://localhost:8000/docs    # macOS — opens Swagger UI in browser`,
          notes: [
            "main:app means 'the app object in main.py' — uvicorn imports it",
            "--reload watches for file changes and restarts (development only, never in production)",
            "--host 0.0.0.0 binds to all interfaces (needed for Docker later)",
            "Swagger UI at /docs is auto-generated from your route signatures and type hints",
          ]
        },
        {
          type: "heading",
          text: "What Happened Automatically",
          level: 2
        },
        {
          type: "text",
          text: "With those 20 lines of code, FastAPI gave you:"
        },
        {
          type: "list",
          items: [
            "<strong>Input validation</strong> — the <code>text: str</code> parameter is automatically validated. If you send a request without it, FastAPI returns a 422 with a clear error message. No manual checking.",
            "<strong>OpenAPI schema</strong> — visit <code>/openapi.json</code> and you'll see a full OpenAPI 3.1 specification for your API. Every route, parameter, and response type is documented.",
            "<strong>Swagger UI</strong> — <code>/docs</code> renders an interactive UI where you can test every endpoint directly from the browser. No Postman needed during development.",
            "<strong>ReDoc</strong> — <code>/redoc</code> renders a clean, read-only documentation page suitable for sharing with consumers of your API.",
            "<strong>JSON serialization</strong> — dictionaries are automatically serialized to JSON responses with the correct <code>Content-Type</code> header.",
          ]
        },
        {
          type: "text",
          text: "In Flask, every one of these would require installing and configuring a separate library. In FastAPI, they're all built in, and they all work from your type hints. This is the core philosophy: <strong>write Python types, get production features for free</strong>."
        },
        {
          type: "heading",
          text: "Project Structure: Starting Simple",
          level: 2
        },
        {
          type: "text",
          text: "We'll start with a flat structure and evolve it as the project grows. Many tutorials show you the \"final\" structure immediately — that's confusing because you don't understand <em>why</em> each directory exists. We'll add structure only when the pain of not having it becomes obvious."
        },
        {
          type: "code",
          lang: "bash",
          filename: "project layout (Lesson 1)",
          code: `sentiment-api/
├── .venv/                 # Virtual environment (gitignored)
├── main.py                # Our FastAPI app — everything in one file for now
├── requirements.txt       # pip freeze output
└── .gitignore             # .venv/, __pycache__/, .env`
        },
        {
          type: "text",
          text: "By lesson 4, this will grow into a proper package structure with routers, services, and dependencies. But right now, one file is the right amount of complexity."
        },
        {
          type: "heading",
          text: "How FastAPI Processes a Request",
          level: 2
        },
        {
          type: "text",
          text: "Understanding the request lifecycle is essential for debugging production issues. Here's what happens when a client sends <code>POST /predict?text=great+movie</code>:"
        },
        {
          type: "diagram",
          code: `  Client sends: POST /predict?text=great+movie
  ──────────────────────────────────────────────────────────────────

  1. Uvicorn (ASGI server)
     │  Receives raw TCP connection
     │  Parses HTTP request
     │  Creates ASGI scope dict
     │
  2. FastAPI (ASGI app)
     │  Routes request to @app.post("/predict")
     │  Resolves dependencies (Depends — none yet)
     │
  3. Parameter resolution
     │  Sees text: str in the function signature
     │  Looks for "text" in: query params → found!
     │  Validates type (str) → passes
     │
  4. Route handler executes
     │  predict(text="great movie") runs
     │  Returns dict
     │
  5. Response serialization
     │  Dict → JSON bytes
     │  Sets Content-Type: application/json
     │  Sets status code 200
     │
  6. Uvicorn sends HTTP response
     └─► Client receives: {"text":"great movie","sentiment":"positive","confidence":0.95}`
        },
        {
          type: "callout",
          variant: "interview",
          title: "Interview Question: Why FastAPI Over Flask for ML Serving?",
          text: "<strong>Weak answer:</strong> \"FastAPI is faster.\" <strong>Strong answer:</strong> \"FastAPI is async-first (ASGI), so it handles concurrent I/O-bound requests — like waiting for model inference, DB lookups, or cache hits — without spawning threads. This means 10x better resource efficiency under concurrent load. It also generates OpenAPI docs from type hints, so API consumers get a spec without manual maintenance. And Pydantic validation catches malformed requests at the framework level, so your model code never sees bad input.\""
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 2: Async Python — The Engine Under FastAPI
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "async-python-engine",
      title: "Async Python: The Engine Under FastAPI",
      readTime: "16 min",
      content: [
        {
          type: "text",
          text: "In Lesson 1, we wrote <code>async def predict()</code> without explaining what <code>async</code> actually does. If you've never written async Python before, this keyword probably feels like magic syntax you copy from tutorials. It's not magic — it's a specific execution model, and understanding it is the difference between a FastAPI service that handles 5,000 req/s and one that falls over at 200."
        },
        {
          type: "heading",
          text: "The Problem: I/O Wastes CPU Time",
          level: 2
        },
        {
          type: "text",
          text: "A typical request to our sentiment API will eventually do this: receive text → look up cache in Redis → if cache miss, run model inference → store result in Postgres → return response. Most of the wall-clock time is spent <em>waiting</em> — waiting for Redis to respond (0.5ms), waiting for Postgres to write (2ms), waiting for the network. During that waiting, the CPU is doing literally nothing."
        },
        {
          type: "text",
          text: "In synchronous Python, \"doing nothing\" means the thread is <strong>blocked</strong>. No other code can run on that thread until the I/O completes. If you have 200 concurrent requests, you need 200 threads, each sitting idle 95% of the time. That's 200 × 8MB = 1.6GB of RAM to accomplish nothing."
        },
        {
          type: "diagram",
          code: `  SYNCHRONOUS: 3 requests on 3 threads
  ════════════════════════════════════════════════════════════════════
  Thread 1: ██░░░░░░░░░░░░░░██  (2ms work, 14ms waiting, 2ms work)
  Thread 2:   ██░░░░░░░░░░░░██
  Thread 3:     ██░░░░░░░░░░██

  ░ = idle/blocked (wasting RAM)    ██ = actual CPU work
  3 threads used. ~5% CPU utilization. 24MB thread stack RAM.

  ASYNC: 3 requests on 1 thread
  ════════════════════════════════════════════════════════════════════
  Thread 1: ██  ██  ██░░░░░░██  ██  ██
            R1  R2  R3 wait  R1  R2  R3

  1 thread used. ~15% CPU utilization. 8MB thread stack RAM.
  While R1 waits for DB, R2 and R3 run. No wasted time.`
        },
        {
          type: "heading",
          text: "How the Event Loop Works",
          level: 2
        },
        {
          type: "text",
          text: "Python's async model is built on a <strong>single-threaded event loop</strong>. The event loop is a scheduler. It maintains a queue of coroutines (functions declared with <code>async def</code>). When a coroutine hits an <code>await</code>, it <em>voluntarily pauses</em> and tells the event loop: \"I'm waiting for I/O — go run someone else.\" The event loop picks another ready coroutine and runs it. When the I/O completes, the original coroutine gets put back in the queue."
        },
        {
          type: "text",
          text: "This is called <strong>cooperative multitasking</strong>. Unlike threads (where the OS forcibly switches between them), coroutines explicitly hand back control at each <code>await</code>. This means no locks, no race conditions, no thread-safety bugs — but it also means <strong>one bad coroutine that never awaits can freeze everything</strong>."
        },
        {
          type: "diagram",
          code: `  EVENT LOOP (single thread, runs forever)
  ─────────────────────────────────────────────────────────────────

  Ready Queue              Running              Waiting (I/O)
  ┌──────────┐
  │ handle_1 │ ──pick──►  handle_1()
  │ handle_2 │            hits: await db.fetch()
  │ handle_3 │            ──pause──►            ┌─────────────┐
  └──────────┘                                  │ handle_1    │
  ┌──────────┐                                  │ (DB query)  │
  │ handle_2 │ ──pick──►  handle_2()            └─────────────┘
  │ handle_3 │            hits: await redis.get()
  └──────────┘            ──pause──►            ┌─────────────┐
  ┌──────────┐                                  │ handle_1    │
  │ handle_3 │ ──pick──►  handle_3()            │ handle_2    │
  └──────────┘            returns result ✓      └─────────────┘
  ┌──────────┐
  │ handle_1 │ ◄── DB responded! back in queue
  │ handle_2 │ ◄── Redis responded! back in queue
  └──────────┘`
        },
        {
          type: "heading",
          text: "async def, await, and Coroutines",
          level: 2
        },
        {
          type: "text",
          text: "Let's make this concrete. Three keywords are the entire async vocabulary:"
        },
        {
          type: "code",
          lang: "python",
          filename: "async_basics.py",
          code: `import asyncio
import time

# ── Regular function: runs, returns result ───────────────────────────
def fetch_user_sync(user_id: int) -> dict:
    time.sleep(0.1)   # BLOCKS for 100ms — the entire program waits
    return {"id": user_id, "name": "Alice"}

# ── Coroutine: calling it returns a coroutine object, NOT a result ───
async def fetch_user(user_id: int) -> dict:
    await asyncio.sleep(0.1)   # YIELDS to event loop for 100ms
    return {"id": user_id, "name": "Alice"}

# ── How to call a coroutine ──────────────────────────────────────────

# WRONG — this does nothing:
# fetch_user(1)  # returns <coroutine object>, never executes

# RIGHT — await it from inside another coroutine:
async def main():
    user = await fetch_user(1)   # pause here, resume when result ready
    print(user)                  # {"id": 1, "name": "Alice"}

# RIGHT — run from synchronous code (entry point):
asyncio.run(main())

# ── The power: concurrent execution with gather ─────────────────────
async def sequential():
    """3 calls × 100ms each = 300ms total."""
    u1 = await fetch_user(1)
    u2 = await fetch_user(2)
    u3 = await fetch_user(3)    # total: ~300ms

async def concurrent():
    """3 calls overlap = ~100ms total."""
    u1, u2, u3 = await asyncio.gather(
        fetch_user(1),
        fetch_user(2),
        fetch_user(3),
    )                            # total: ~100ms (all three ran simultaneously)
    print(u1, u2, u3)`,
          notes: [
            "async def creates a coroutine function — calling it returns a coroutine OBJECT, not a result",
            "await pauses the current coroutine and yields control to the event loop",
            "asyncio.gather() runs multiple coroutines concurrently — they overlap in time (but on ONE thread)",
            "asyncio.run() starts the event loop, runs your top-level coroutine, then shuts down the loop",
          ]
        },
        {
          type: "heading",
          text: "The Cardinal Sin: Blocking the Event Loop",
          level: 2
        },
        {
          type: "text",
          text: "This is the single most common mistake in async Python, and it will destroy your FastAPI server's performance silently. If you call <em>any</em> blocking function inside an async route — <code>time.sleep()</code>, <code>requests.get()</code>, reading a large file with <code>open()</code>, running CPU-heavy computation — you freeze the entire event loop. Every other request waits. One blocking call in one route can stall your entire server."
        },
        {
          type: "code",
          lang: "python",
          filename: "blocking_disaster.py",
          code: `import asyncio
import time

# ── BAD: blocks the event loop ──────────────────────────────────────
# If this route takes 2 seconds, ALL other requests wait 2 seconds.

from fastapi import FastAPI
app = FastAPI()

@app.post("/predict-bad")
async def predict_bad(text: str):
    import requests  # sync HTTP client — BLOCKS!
    # While this waits for the response, no other request can be served
    features = requests.get(f"http://feature-store:8000/features?text={text}")
    time.sleep(0.5)  # simulates CPU work but BLOCKS the event loop
    return {"sentiment": "positive"}


# ── GOOD: async alternatives ────────────────────────────────────────
import httpx  # async HTTP client

@app.post("/predict-good")
async def predict_good(text: str):
    async with httpx.AsyncClient() as client:
        # YIELDS to event loop while waiting — other requests proceed
        features = await client.get(f"http://feature-store:8000/features?text={text}")
    await asyncio.sleep(0.5)  # yields, doesn't block
    return {"sentiment": "positive"}


# ── For unavoidable blocking work (CPU-bound, sync libraries) ───────
import functools
from concurrent.futures import ProcessPoolExecutor

# Thread pool for I/O-blocking sync libraries
@app.post("/predict-with-sync-lib")
async def predict_with_sync_lib(text: str):
    loop = asyncio.get_event_loop()
    # Offload to thread pool — event loop stays free
    result = await loop.run_in_executor(None, sync_model_predict, text)
    return result

def sync_model_predict(text: str) -> dict:
    """This runs in a thread, not on the event loop."""
    # Imagine this uses a sync library like scikit-learn
    import hashlib
    score = len(hashlib.sha256(text.encode()).hexdigest()) / 100
    return {"sentiment": "positive", "confidence": score}`,
          notes: [
            "Use httpx instead of requests for async HTTP calls",
            "Use asyncpg or SQLAlchemy async engine for database queries",
            "Use aiofiles for async file I/O",
            "For CPU-heavy work: run_in_executor(None, fn) for thread pool, or ProcessPoolExecutor for true parallelism",
            "If you MUST use a sync library, wrap it in run_in_executor — never call it directly in an async route",
          ]
        },
        {
          type: "heading",
          text: "async def vs def in FastAPI Routes",
          level: 2
        },
        {
          type: "text",
          text: "FastAPI supports both <code>async def</code> and regular <code>def</code> for route handlers. This is a deliberate design choice, and picking wrong causes subtle performance issues."
        },
        {
          type: "comparison",
          headers: ["", "async def route", "def route"],
          rows: [
            ["Use when", "Your route uses async libraries (httpx, asyncpg, motor)", "Your route uses sync libraries (requests, psycopg2, sklearn)"],
            ["How FastAPI runs it", "Directly on the event loop", "In a thread pool via run_in_executor"],
            ["Performance", "Best for I/O-bound — no thread overhead", "Fine — FastAPI handles offloading automatically"],
            ["Danger", "NEVER call blocking code inside", "Threads have overhead (~8MB each); don't use for async I/O"],
          ]
        },
        {
          type: "callout",
          variant: "gotcha",
          title: "The Sneaky Mistake",
          text: "If you write <code>async def my_route()</code> but call a sync library inside (like <code>requests.get()</code>), you get the <strong>worst of both worlds</strong>: the event loop is blocked (because the sync call never yields), AND you don't get thread pool offloading (because FastAPI only uses run_in_executor for <code>def</code> routes, not <code>async def</code>). If you must use sync libraries, use <code>def</code> — FastAPI will automatically run it in a thread pool."
        },
        {
          type: "heading",
          text: "Updating Our Sentiment API",
          level: 2
        },
        {
          type: "text",
          text: "Let's apply what we've learned. We'll update our sentiment API to demonstrate proper async patterns — concurrent I/O, non-blocking calls, and correct use of async vs sync routes."
        },
        {
          type: "code",
          lang: "python",
          filename: "main.py (updated)",
          code: `"""Sentiment Analysis Inference API — Lesson 2: async patterns."""
import asyncio
from fastapi import FastAPI

app = FastAPI(
    title="Sentiment Analysis API",
    version="0.2.0",
)


# ── Simulated external services (will be real in later lessons) ──────
async def check_cache(text: str) -> dict | None:
    """Simulate Redis cache lookup — 0.5ms."""
    await asyncio.sleep(0.0005)
    return None  # cache miss for now

async def run_inference(text: str) -> dict:
    """Simulate model inference — 50ms."""
    await asyncio.sleep(0.05)
    # Mock sentiment analysis
    positive_words = {"great", "amazing", "love", "excellent", "good", "happy"}
    negative_words = {"bad", "terrible", "hate", "awful", "poor", "sad"}
    words = set(text.lower().split())
    pos = len(words & positive_words)
    neg = len(words & negative_words)
    if pos > neg:
        return {"label": "positive", "confidence": 0.85}
    elif neg > pos:
        return {"label": "negative", "confidence": 0.82}
    return {"label": "neutral", "confidence": 0.60}

async def store_result(text: str, result: dict) -> None:
    """Simulate writing to Postgres — 2ms."""
    await asyncio.sleep(0.002)


# ── Routes ───────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "healthy", "version": "0.2.0"}


@app.post("/predict")
async def predict(text: str):
    # Step 1: Check cache (non-blocking)
    cached = await check_cache(text)
    if cached:
        return {**cached, "source": "cache"}

    # Step 2: Run inference (non-blocking)
    result = await run_inference(text)

    # Step 3: Cache result + log to DB concurrently
    # These two operations are independent — run them at the same time!
    await asyncio.gather(
        store_result(text, result),   # writes to DB
        check_cache(text),            # would write to cache in real version
    )

    return {"text": text, **result, "source": "model"}


@app.post("/predict/batch")
async def predict_batch(texts: list[str]):
    """Run inference on multiple texts concurrently."""
    # All inferences run at the same time — total time = slowest single inference
    results = await asyncio.gather(
        *[run_inference(t) for t in texts]
    )
    return [
        {"text": text, **result}
        for text, result in zip(texts, results)
    ]`,
          notes: [
            "asyncio.gather() runs cache write + DB write concurrently — saves ~2ms per request",
            "The batch endpoint runs ALL inferences concurrently — 100 texts take the same time as 1",
            "Every I/O operation uses await — the event loop is never blocked",
            "We'll replace these mock functions with real Redis/Postgres/model calls in later lessons",
          ]
        },
        {
          type: "heading",
          text: "Measuring the Difference",
          level: 2
        },
        {
          type: "text",
          text: "Let's prove this matters with a simple benchmark. Run the server, then hit it with concurrent requests."
        },
        {
          type: "code",
          lang: "bash",
          filename: "benchmark.sh",
          code: `# Install hey (HTTP load generator) — great for quick benchmarks on macOS
brew install hey

# Start the server in another terminal:
# uvicorn main:app --host 0.0.0.0 --port 8000

# Single request — baseline latency
curl -w "\\nTime: %{time_total}s\\n" -X POST \\
  "http://localhost:8000/predict?text=this+movie+was+great"

# 200 concurrent requests, 1000 total
hey -n 1000 -c 200 -m POST \\
  "http://localhost:8000/predict?text=this+movie+was+great"

# You should see:
#   Requests/sec:  ~4000+
#   Average:       ~50ms (the model inference time)
#   99th %ile:     ~55ms
#
# With a sync Flask equivalent, you'd see:
#   Requests/sec:  ~200 (limited by thread count)
#   Average:       ~500ms (requests queuing behind threads)`,
          notes: [
            "hey is a simple load testing tool — much better than curl for benchmarks",
            "The key metric is requests/sec under concurrency, not single-request latency",
            "Async shines when concurrent > thread count — that's when sync frameworks queue",
          ]
        },
        {
          type: "heading",
          text: "asyncio.Task: Fire-and-Forget Work",
          level: 2
        },
        {
          type: "text",
          text: "Sometimes you want to start async work without waiting for it. For example, logging analytics after sending the response. <code>asyncio.create_task()</code> schedules a coroutine to run in the background."
        },
        {
          type: "code",
          lang: "python",
          filename: "fire_and_forget.py",
          code: `import asyncio

async def log_analytics(text: str, result: dict):
    """Send analytics to tracking service — takes 100ms."""
    await asyncio.sleep(0.1)   # simulate slow analytics call
    print(f"Logged: {text} → {result['label']}")

async def handle_request(text: str):
    result = await run_inference(text)

    # Fire-and-forget: schedule analytics but don't wait for it
    # The response goes back to the client immediately
    task = asyncio.create_task(log_analytics(text, result))

    # IMPORTANT: hold a reference to task, or it may be garbage collected!
    # In FastAPI, use BackgroundTasks instead (covered in Lesson 6)
    return result`,
          notes: [
            "create_task() schedules the coroutine immediately — it runs concurrently with everything else",
            "Don't use create_task() in FastAPI routes — use BackgroundTasks instead (it manages lifecycle)",
            "If you don't hold a reference to the task, Python may garbage-collect it before it finishes",
          ]
        },
        {
          type: "callout",
          variant: "interview",
          title: "Interview Question: What Happens If You Call time.sleep(5) in an async def Route?",
          text: "<strong>Weak answer:</strong> \"The route takes 5 seconds.\" <strong>Strong answer:</strong> \"It blocks the event loop for 5 seconds. During that time, EVERY other request — across all routes — is frozen. No other coroutine can run because cooperative multitasking requires explicit <code>await</code> to yield control. The fix is <code>await asyncio.sleep(5)</code> for actual delays, or <code>await loop.run_in_executor(None, time.sleep, 5)</code> if you must call a blocking function. In general, if you're calling any sync function that does I/O or takes more than ~1ms, offload it to a thread pool.\""
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 3: Request Validation with Pydantic
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "pydantic-validation",
      title: "Request Validation with Pydantic",
      readTime: "16 min",
      content: [
        {
          type: "text",
          text: "Our sentiment API has a problem. The <code>/predict</code> endpoint accepts <code>text: str</code> as a query parameter. That means clients send data in the URL: <code>POST /predict?text=this+movie+was+great</code>. This works for testing but is wrong for production: URLs have length limits (~2048 chars), the text is visible in server logs, and there's no way to send structured metadata alongside the text."
        },
        {
          type: "text",
          text: "We need to accept a JSON body with validated fields. In Flask, you'd write <code>request.get_json()</code>, manually check each field exists, validate types, check string lengths, handle missing fields... and you'd do this in every single route. It's tedious, error-prone, and the resulting code is 50% validation boilerplate."
        },
        {
          type: "text",
          text: "FastAPI solves this with <strong>Pydantic models</strong>. You define a Python class with type annotations, and FastAPI automatically parses the request body, validates every field, returns detailed error messages for invalid input, and converts the data to your Python types. Zero manual validation code."
        },
        {
          type: "heading",
          text: "Pydantic: What It Does and Why It Matters",
          level: 2
        },
        {
          type: "text",
          text: "Pydantic is a data validation library that uses Python type annotations. When you create a Pydantic model (a class inheriting from <code>BaseModel</code>), it automatically validates input data, coerces compatible types, and raises clear errors for invalid data. FastAPI uses Pydantic as its validation engine — they're deeply integrated."
        },
        {
          type: "code",
          lang: "python",
          filename: "schemas.py",
          code: `"""Pydantic models for our Sentiment Analysis API."""
from pydantic import BaseModel, Field, field_validator
from enum import Enum


# ── Enums for constrained values ─────────────────────────────────────
class SentimentLabel(str, Enum):
    """Fixed set of possible sentiment values."""
    positive = "positive"
    negative = "negative"
    neutral = "neutral"


# ── Request models ───────────────────────────────────────────────────
class PredictRequest(BaseModel):
    """What the client sends to POST /predict."""
    text: str = Field(
        ...,                        # ... means required (no default)
        min_length=1,               # reject empty strings
        max_length=5000,            # protect against huge payloads
        description="Text to analyze for sentiment",
        examples=["This product is amazing! Best purchase I've ever made."],
    )
    language: str = Field(
        default="en",
        pattern=r"^[a-z]{2}$",     # exactly 2 lowercase letters
        description="ISO 639-1 language code",
    )
    include_probabilities: bool = Field(
        default=False,
        description="If true, return probability distribution over all labels",
    )

    @field_validator("text")
    @classmethod
    def text_must_not_be_whitespace(cls, v: str) -> str:
        """Reject strings that are technically non-empty but just whitespace."""
        if not v.strip():
            raise ValueError("text must contain non-whitespace characters")
        return v.strip()   # also normalize by stripping leading/trailing whitespace


class BatchPredictRequest(BaseModel):
    """Batch prediction — analyze multiple texts in one call."""
    texts: list[str] = Field(
        ...,
        min_length=1,               # at least 1 text
        max_length=100,             # cap batch size to prevent OOM
        description="List of texts to analyze",
    )
    language: str = Field(default="en", pattern=r"^[a-z]{2}$")


# ── Response models ──────────────────────────────────────────────────
class PredictResponse(BaseModel):
    """What POST /predict returns."""
    text: str
    sentiment: SentimentLabel
    confidence: float = Field(ge=0.0, le=1.0)   # between 0 and 1
    probabilities: dict[str, float] | None = None
    source: str = Field(
        description="Where the result came from: 'model' or 'cache'",
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "text": "This product is amazing!",
                    "sentiment": "positive",
                    "confidence": 0.94,
                    "probabilities": None,
                    "source": "model",
                }
            ]
        }
    }


class BatchPredictResponse(BaseModel):
    """Batch prediction response."""
    results: list[PredictResponse]
    total: int


class ErrorDetail(BaseModel):
    """Standard error response format."""
    detail: str
    error_code: str | None = None`,
          notes: [
            "Field(...) means required — no default value, client must provide it",
            "min_length, max_length, pattern, ge, le are built-in Pydantic validators",
            "@field_validator runs custom logic after type validation passes",
            "Enum types restrict values to a fixed set — invalid values get a clear error",
            "model_config replaces the old class Config (Pydantic v2 syntax)",
          ]
        },
        {
          type: "heading",
          text: "Using Pydantic Models in Routes",
          level: 2
        },
        {
          type: "text",
          text: "Now let's update our FastAPI routes to use these models. The magic: just declare the type in the function signature, and FastAPI handles everything."
        },
        {
          type: "code",
          lang: "python",
          filename: "main.py (updated — Lesson 3)",
          code: `"""Sentiment Analysis Inference API — Lesson 3: Pydantic validation."""
import asyncio
from fastapi import FastAPI, HTTPException, status
from schemas import (
    PredictRequest, PredictResponse,
    BatchPredictRequest, BatchPredictResponse,
    SentimentLabel,
)

app = FastAPI(
    title="Sentiment Analysis API",
    version="0.3.0",
)


async def run_inference(text: str) -> dict:
    """Mock inference — will be replaced with real model in production."""
    await asyncio.sleep(0.05)
    positive_words = {"great", "amazing", "love", "excellent", "good", "happy", "best"}
    negative_words = {"bad", "terrible", "hate", "awful", "poor", "sad", "worst"}
    words = set(text.lower().split())
    pos = len(words & positive_words)
    neg = len(words & negative_words)
    total = max(pos + neg, 1)

    if pos > neg:
        return {
            "label": SentimentLabel.positive,
            "confidence": round(0.5 + 0.5 * pos / total, 2),
            "probabilities": {"positive": 0.85, "negative": 0.10, "neutral": 0.05},
        }
    elif neg > pos:
        return {
            "label": SentimentLabel.negative,
            "confidence": round(0.5 + 0.5 * neg / total, 2),
            "probabilities": {"positive": 0.10, "negative": 0.82, "neutral": 0.08},
        }
    return {
        "label": SentimentLabel.neutral,
        "confidence": 0.60,
        "probabilities": {"positive": 0.35, "negative": 0.25, "neutral": 0.40},
    }


@app.get("/health")
async def health():
    return {"status": "healthy", "version": "0.3.0"}


# ── Single prediction ────────────────────────────────────────────────
@app.post(
    "/predict",
    response_model=PredictResponse,         # validates the RESPONSE too
    status_code=status.HTTP_200_OK,
    summary="Analyze text sentiment",
    responses={
        422: {"description": "Validation error — bad input"},
        500: {"description": "Internal error — model failure"},
    },
)
async def predict(request: PredictRequest):
    """
    Accepts text and returns sentiment analysis.

    - **text**: The text to analyze (1-5000 chars)
    - **language**: ISO 639-1 code (default: en)
    - **include_probabilities**: Return full distribution (default: false)
    """
    if request.language != "en":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Language '{request.language}' not yet supported. Only 'en' is available.",
        )

    result = await run_inference(request.text)

    return PredictResponse(
        text=request.text,
        sentiment=result["label"],
        confidence=result["confidence"],
        probabilities=result["probabilities"] if request.include_probabilities else None,
        source="model",
    )


# ── Batch prediction ─────────────────────────────────────────────────
@app.post(
    "/predict/batch",
    response_model=BatchPredictResponse,
    summary="Analyze multiple texts concurrently",
)
async def predict_batch(request: BatchPredictRequest):
    """Runs inference on all texts concurrently via asyncio.gather."""
    results = await asyncio.gather(
        *[run_inference(t) for t in request.texts]
    )

    responses = [
        PredictResponse(
            text=text,
            sentiment=r["label"],
            confidence=r["confidence"],
            probabilities=None,
            source="model",
        )
        for text, r in zip(request.texts, results)
    ]

    return BatchPredictResponse(results=responses, total=len(responses))`,
          notes: [
            "request: PredictRequest in the signature tells FastAPI to parse the JSON body as PredictRequest",
            "response_model=PredictResponse validates your RESPONSE — catches bugs where you return wrong fields",
            "HTTPException raises a proper HTTP error — status code + JSON detail message",
            "The docstring becomes the endpoint description in Swagger UI",
          ]
        },
        {
          type: "heading",
          text: "What Validation Gets You for Free",
          level: 2
        },
        {
          type: "text",
          text: "Send an invalid request and see what happens:"
        },
        {
          type: "code",
          lang: "bash",
          filename: "testing validation",
          code: `# ── Valid request ────────────────────────────────────────────────────
curl -s -X POST http://localhost:8000/predict \\
  -H "Content-Type: application/json" \\
  -d '{"text": "This movie was absolutely amazing!"}' | python -m json.tool

# Response:
# {
#     "text": "This movie was absolutely amazing!",
#     "sentiment": "positive",
#     "confidence": 0.85,
#     "probabilities": null,
#     "source": "model"
# }

# ── Empty text — rejected by min_length=1 ────────────────────────────
curl -s -X POST http://localhost:8000/predict \\
  -H "Content-Type: application/json" \\
  -d '{"text": ""}' | python -m json.tool

# Response (422):
# {
#     "detail": [
#         {
#             "type": "string_too_short",
#             "loc": ["body", "text"],
#             "msg": "String should have at least 1 character",
#             "input": ""
#         }
#     ]
# }

# ── Whitespace-only — rejected by our custom validator ───────────────
curl -s -X POST http://localhost:8000/predict \\
  -H "Content-Type: application/json" \\
  -d '{"text": "   "}' | python -m json.tool

# ── Invalid language code ────────────────────────────────────────────
curl -s -X POST http://localhost:8000/predict \\
  -H "Content-Type: application/json" \\
  -d '{"text": "hello", "language": "english"}' | python -m json.tool

# Response (422):
# {
#     "detail": [
#         {
#             "type": "string_pattern_mismatch",
#             "loc": ["body", "language"],
#             "msg": "String should match pattern '^[a-z]{2}$'",
#             "input": "english"
#         }
#     ]
# }

# ── Missing required field ───────────────────────────────────────────
curl -s -X POST http://localhost:8000/predict \\
  -H "Content-Type: application/json" \\
  -d '{}' | python -m json.tool

# Response (422): tells you "text" is required

# ── Batch with too many items ────────────────────────────────────────
# If you send 101+ texts, Pydantic rejects it (max_length=100)`,
          notes: [
            "422 Unprocessable Entity is the standard status for validation errors",
            "Error responses include the exact field path (loc), error type, and human-readable message",
            "All of this validation is automatic — zero manual code in the route",
            "The Swagger UI at /docs shows all constraints in the schema",
          ]
        },
        {
          type: "heading",
          text: "Advanced Pydantic Patterns for ML APIs",
          level: 2
        },
        {
          type: "text",
          text: "Real ML APIs need more sophisticated validation. Here are patterns you'll use constantly:"
        },
        {
          type: "code",
          lang: "python",
          filename: "advanced_schemas.py",
          code: `"""Advanced Pydantic patterns for production ML APIs."""
from pydantic import BaseModel, Field, field_validator, model_validator
from datetime import datetime
from typing import Annotated


# ── Pattern 1: Discriminated unions for different model types ────────
class TextInput(BaseModel):
    input_type: str = "text"
    text: str = Field(..., min_length=1, max_length=5000)

class URLInput(BaseModel):
    input_type: str = "url"
    url: str = Field(..., pattern=r"^https?://")

# Accept either text or URL — Pydantic picks the right model
class FlexiblePredictRequest(BaseModel):
    input: TextInput | URLInput
    language: str = "en"


# ── Pattern 2: Computed fields (Pydantic v2) ────────────────────────
from pydantic import computed_field

class TimestampedResponse(BaseModel):
    """Base response that auto-adds timing metadata."""
    @computed_field
    @property
    def timestamp(self) -> str:
        return datetime.utcnow().isoformat() + "Z"


# ── Pattern 3: model_validator for cross-field validation ────────────
class DateRangeRequest(BaseModel):
    """Example: query sentiment trends between two dates."""
    start_date: datetime
    end_date: datetime
    granularity: str = "day"

    @model_validator(mode="after")
    def end_after_start(self):
        if self.end_date <= self.start_date:
            raise ValueError("end_date must be after start_date")
        if (self.end_date - self.start_date).days > 365:
            raise ValueError("date range must not exceed 365 days")
        return self


# ── Pattern 4: Reusable field types with Annotated ───────────────────
# Define once, use everywhere — consistent validation across your API
TextBody = Annotated[str, Field(min_length=1, max_length=5000, description="Text to analyze")]
LanguageCode = Annotated[str, Field(default="en", pattern=r"^[a-z]{2}$")]
Confidence = Annotated[float, Field(ge=0.0, le=1.0)]

class CleanPredictRequest(BaseModel):
    text: TextBody
    language: LanguageCode

class CleanPredictResponse(BaseModel):
    text: TextBody
    sentiment: str
    confidence: Confidence


# ── Pattern 5: Serialization control (what clients see) ─────────────
class InternalResult(BaseModel):
    """Internal representation — includes fields we don't expose."""
    text: str
    sentiment: str
    confidence: float
    model_version: str          # internal — which model produced this
    inference_time_ms: float    # internal — for monitoring
    cache_hit: bool             # internal

    model_config = {
        "json_schema_extra": {
            "examples": [{"text": "great", "sentiment": "positive",
                          "confidence": 0.9, "model_version": "v3.2",
                          "inference_time_ms": 12.5, "cache_hit": False}]
        }
    }

class PublicResult(BaseModel):
    """What clients actually see — no internal details leaked."""
    text: str
    sentiment: str
    confidence: float

    # In the route: return PublicResult(**internal_result.model_dump())
    # Only text, sentiment, confidence are serialized — internal fields are dropped`,
          notes: [
            "Union types (TextInput | URLInput) let endpoints accept multiple input formats",
            "model_validator validates relationships between fields — essential for date ranges, constraints",
            "Annotated[type, Field(...)] creates reusable validated types — DRY across your API",
            "Use separate internal vs public models to avoid leaking implementation details to clients",
          ]
        },
        {
          type: "heading",
          text: "Pydantic Settings: Environment-Based Configuration",
          level: 2
        },
        {
          type: "text",
          text: "Production services need configuration that changes between environments (dev, staging, production) without changing code. Pydantic Settings reads from environment variables and <code>.env</code> files with the same validation you get for request bodies."
        },
        {
          type: "code",
          lang: "python",
          filename: "config.py",
          code: `"""Environment-based configuration with validation."""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """
    All config comes from environment variables.
    Variables without defaults are REQUIRED — the app won't start without them.
    """
    # ── App ──────────────────────────────────────────────────────────
    app_name: str = "Sentiment Analysis API"
    debug: bool = False
    environment: str = "development"    # development | staging | production

    # ── Model ────────────────────────────────────────────────────────
    model_path: str = "models/sentiment-v3.2"
    model_max_batch_size: int = 100
    model_timeout_seconds: float = 5.0

    # ── Redis (for caching) ──────────────────────────────────────────
    redis_url: str = "redis://localhost:6379/0"
    cache_ttl_seconds: int = 3600       # 1 hour default

    # ── Database ─────────────────────────────────────────────────────
    database_url: str               # REQUIRED — no default, app fails if missing

    # ── Auth ─────────────────────────────────────────────────────────
    jwt_secret_key: str             # REQUIRED
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 30

    model_config = {
        "env_file": ".env",            # reads from .env file
        "env_file_encoding": "utf-8",
        "case_sensitive": False,       # DATABASE_URL and database_url both work
    }


@lru_cache
def get_settings() -> Settings:
    """
    Cached settings — parsed once, reused everywhere.
    @lru_cache ensures Settings() is called exactly once.
    In tests, override this with app.dependency_overrides.
    """
    return Settings()`,
          notes: [
            "Fields without defaults (database_url, jwt_secret_key) are REQUIRED — app crashes on startup if missing",
            "@lru_cache ensures settings are parsed once, not on every request — pure performance optimization",
            ".env file is read automatically — never commit .env to git",
            "case_sensitive=False means DATABASE_URL env var maps to database_url field",
          ]
        },
        {
          type: "code",
          lang: "bash",
          filename: ".env",
          code: `# .env — local development config
# NEVER commit this file to git (add to .gitignore)
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/sentiment
JWT_SECRET_KEY=dev-secret-change-in-production
REDIS_URL=redis://localhost:6379/0
DEBUG=true
ENVIRONMENT=development`
        },
        {
          type: "heading",
          text: "Project Structure After Lesson 3",
          level: 2
        },
        {
          type: "text",
          text: "We've outgrown a single file. Time to organize. Notice we're splitting only because we have a clear reason — schemas are shared across routes, config is shared across everything."
        },
        {
          type: "code",
          lang: "bash",
          filename: "project layout (Lesson 3)",
          code: `sentiment-api/
├── .venv/
├── .env                   # local dev config (gitignored)
├── .gitignore
├── main.py                # FastAPI app + routes
├── schemas.py             # Pydantic request/response models
├── config.py              # Settings from environment variables
└── requirements.txt`
        },
        {
          type: "callout",
          variant: "gotcha",
          title: "Pydantic v1 vs v2 — Don't Mix Them Up",
          text: "If you're reading tutorials from before 2023, they use Pydantic v1 syntax. Key differences: <strong>v1:</strong> <code>class Config:</code> inner class, <code>.dict()</code>, <code>@validator</code>, <code>orm_mode = True</code>. <strong>v2 (use this):</strong> <code>model_config = {}</code>, <code>.model_dump()</code>, <code>@field_validator</code>, <code>from_attributes = True</code>. FastAPI 0.100+ ships with Pydantic v2. If you see <code>class Config</code> in a tutorial, it's outdated."
        },
        {
          type: "callout",
          variant: "interview",
          title: "Interview Question: Why Use Pydantic Instead of Manual Validation?",
          text: "<strong>Weak answer:</strong> \"It's less code.\" <strong>Strong answer:</strong> \"Pydantic gives you three things: (1) <em>Request validation</em> — malformed input never reaches your business logic, so your model inference code doesn't need defensive checks. (2) <em>Response validation</em> — setting response_model ensures you never accidentally leak internal fields (like model_version or inference_time) to clients. (3) <em>Documentation</em> — the OpenAPI schema is generated directly from the models, so docs are always in sync with the actual API contract. In ML APIs specifically, constraining inputs (max_length, valid enum values) prevents expensive model inference on garbage input.\""
        }
      ]
    },


    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 4: Dependency Injection — The Wiring System
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "dependency-injection-wiring",
      title: "Dependency Injection — The Wiring System",
      readTime: "16 min",
      content: [
        {
          type: "text",
          text: "Your Sentiment API is growing. Right now <code>main.py</code> does everything: creates the app, defines schemas (moved to <code>schemas.py</code>), reads config (moved to <code>config.py</code>), and will soon need a database session, a Redis client, a model loader, and authentication. If you hardcode all of these inside each route function, every route becomes untestable — you can't swap the real database for a test database, you can't replace the model with a mock, and you can't change Redis without editing 15 files."
        },
        {
          type: "text",
          text: "FastAPI solves this with <strong>Dependency Injection (DI)</strong>. Instead of importing and constructing dependencies yourself, you <em>declare what you need</em> and FastAPI provides it. The framework resolves the entire dependency graph, caches results per-request, and handles cleanup automatically. It's the most important architectural pattern in FastAPI — and the one interviewers ask about most."
        },
        {
          type: "heading",
          text: "How Depends() Works",
          level: 2
        },
        {
          type: "diagram",
          code: `  DEPENDENCY INJECTION RESOLUTION

  Client calls: POST /predict
                    │
                    ▼
  FastAPI sees route signature:
  ┌───────────────────────────────────────────────────────────────┐
  │  async def predict(                                           │
  │      body: PredictRequest,           ← from request body     │
  │      settings: Settings = Depends(get_settings),              │
  │      db: AsyncSession = Depends(get_db),                      │
  │      model: SentimentModel = Depends(get_model),              │
  │  ):                                                           │
  └───────────────────────────────────────────────────────────────┘
                    │
  Step 1: Parse & validate body  ────────────►  PredictRequest
  Step 2: Call get_settings()    ────────────►  Settings (cached)
  Step 3: Call get_db()          ────────────►  AsyncSession (yield)
  Step 4: Call get_model()       ────────────►  SentimentModel
                    │
  Step 5: Call predict(body, settings, db, model)
                    │
  Step 6: After response sent → get_db() cleanup runs (close session)

  KEY: Dependencies with \`yield\` have cleanup code that runs AFTER the response.
       Dependencies are CACHED per request — get_settings() called once even if
       multiple dependencies use it.`
        },
        {
          type: "heading",
          text: "Adding Dependencies to Our API",
          level: 2
        },
        {
          type: "text",
          text: "Let's add three real dependencies to the sentiment API: a settings provider, a database session, and a model loader. Each pattern teaches a different DI concept."
        },
        {
          type: "code",
          lang: "python",
          filename: "deps.py",
          code: `"""
Dependency providers for the Sentiment Analysis API.
Each function here is injected via Depends() — never imported directly in routes.
"""
from typing import Annotated, AsyncGenerator
from fastapi import Depends, HTTPException, status

from config import Settings, get_settings
from schemas import PredictRequest


# ═══════════════════════════════════════════════════════════════════════
# Pattern 1: Simple function dependency (returns a value)
# ═══════════════════════════════════════════════════════════════════════

async def get_pagination(skip: int = 0, limit: int = 50) -> dict:
    """Extracts & validates pagination from query params."""
    if limit > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="limit cannot exceed 100",
        )
    return {"skip": skip, "limit": limit}


# Type alias — use this in route signatures instead of raw Depends()
Pagination = Annotated[dict, Depends(get_pagination)]


# ═══════════════════════════════════════════════════════════════════════
# Pattern 2: Generator dependency (yield = setup + cleanup)
# ═══════════════════════════════════════════════════════════════════════

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    create_async_engine,
    async_sessionmaker,
)

# Engine created once at module level — connection pool shared across requests
_engine = create_async_engine(
    get_settings().database_url,
    pool_size=10,          # keep 10 connections open
    max_overflow=20,       # allow 20 more under load
    pool_recycle=3600,     # recycle connections after 1 hour
)
AsyncSessionLocal = async_sessionmaker(_engine, expire_on_commit=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Yields a database session scoped to a single request.
    Commits on success, rolls back on exception, always closes.

    This is the MOST COMMON dependency in any FastAPI app.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session               # ← route runs here
            await session.commit()      # auto-commit if no exception
        except Exception:
            await session.rollback()    # rollback on any error
            raise                       # re-raise so FastAPI returns proper error


DB = Annotated[AsyncSession, Depends(get_db)]


# ═══════════════════════════════════════════════════════════════════════
# Pattern 3: Class-based dependency (callable class)
# ═══════════════════════════════════════════════════════════════════════

class RateLimiter:
    """
    Rate limiter as a class dependency.
    FastAPI calls __init__ with query/header params, then injects the instance.
    """
    def __init__(
        self,
        requests_per_minute: int = 60,
        settings: Settings = Depends(get_settings),
    ):
        self.rpm = requests_per_minute
        self.settings = settings

    async def check(self, client_ip: str) -> bool:
        # In production: check Redis counter for client_ip
        # For now: always allow (we'll add Redis in Lesson 6)
        return True


# ═══════════════════════════════════════════════════════════════════════
# Pattern 4: Sub-dependencies (dependencies that depend on other deps)
# ═══════════════════════════════════════════════════════════════════════

async def validate_batch_size(
    body: PredictRequest,
    settings: Settings = Depends(get_settings),
):
    """
    Sub-dependency: validates request body against config.
    Depends on BOTH the request body AND settings — FastAPI resolves both.
    """
    # We'll use this for batch predictions later
    pass`,
          notes: [
            "Pattern 1 (function): simplest — parse, validate, return. Good for pagination, sorting, filtering",
            "Pattern 2 (generator with yield): setup before yield, cleanup after. THE pattern for DB sessions, file handles, locks",
            "Pattern 3 (class): __init__ params resolved from request. Good for stateful/configurable dependencies",
            "Pattern 4 (sub-dependency): a dependency that itself has Depends() — FastAPI resolves the full graph",
            "Annotated[Type, Depends(fn)] is the modern syntax — keeps signatures clean and enables reuse",
          ]
        },
        {
          type: "heading",
          text: "Using Dependencies in Routes",
          level: 2
        },
        {
          type: "code",
          lang: "python",
          filename: "main.py (updated — Lesson 4)",
          code: `"""Sentiment Analysis API — with dependency injection."""
from fastapi import FastAPI, Depends
from typing import Annotated
from contextlib import asynccontextmanager

from config import Settings, get_settings
from schemas import PredictRequest, PredictResponse, HealthResponse
from deps import DB, Pagination, get_db


# ── Lifespan: startup/shutdown (we'll expand in Lesson 6) ────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 Starting Sentiment API...")
    yield
    print("Shutting down...")


app = FastAPI(
    title="Sentiment Analysis API",
    version="0.2.0",
    lifespan=lifespan,
)

# ── Type aliases for clean signatures ─────────────────────────────────
AppSettings = Annotated[Settings, Depends(get_settings)]


# ── Routes ────────────────────────────────────────────────────────────
@app.get("/health", response_model=HealthResponse)
async def health(settings: AppSettings):
    return {
        "status": "healthy",
        "environment": settings.environment,
        "model_path": settings.model_path,
    }


@app.post("/predict", response_model=PredictResponse)
async def predict(body: PredictRequest, settings: AppSettings):
    """
    Run sentiment inference.
    Settings injected via DI — not imported directly.
    Easy to override in tests.
    """
    # Stub model inference (replaced with real model in Lesson 6)
    return PredictResponse(
        text=body.text,
        sentiment="positive",
        confidence=0.85,
    )


@app.get("/predictions")
async def list_predictions(db: DB, pagination: Pagination):
    """
    List past predictions from the database.
    db session and pagination both injected via DI.
    """
    from sqlalchemy import text
    result = await db.execute(
        text("SELECT * FROM predictions LIMIT :limit OFFSET :skip"),
        {"limit": pagination["limit"], "skip": pagination["skip"]},
    )
    return {"predictions": [dict(r._mapping) for r in result], **pagination}`,
          notes: [
            "Every external resource (settings, db, model) is injected — routes never import globals directly",
            "AppSettings = Annotated[Settings, Depends(get_settings)] — reusable across all routes that need config",
            "DB = Annotated[AsyncSession, Depends(get_db)] — defined once in deps.py, used everywhere",
            "Pagination auto-validates query params (skip, limit) before the route runs",
          ]
        },
        {
          type: "heading",
          text: "Dependency Overrides: Why DI Makes Testing Trivial",
          level: 2
        },
        {
          type: "text",
          text: "Here's the payoff. With DI, swapping the real database for a test database is a single line:"
        },
        {
          type: "code",
          lang: "python",
          filename: "test_predict.py (preview)",
          code: `"""Preview of how DI enables testing — full testing lesson is Lesson 8."""
from fastapi.testclient import TestClient
from main import app
from deps import get_db, get_settings
from config import Settings


# ── Override the database dependency ──────────────────────────────────
async def override_db():
    """Returns an in-memory SQLite session instead of real PostgreSQL."""
    async with test_session_maker() as session:
        yield session

app.dependency_overrides[get_db] = override_db


# ── Override settings to use test config ──────────────────────────────
def override_settings():
    return Settings(
        database_url="sqlite+aiosqlite:///:memory:",
        jwt_secret_key="test-secret",
        environment="test",
    )

app.dependency_overrides[get_settings] = override_settings


# ── Now tests use the overridden dependencies automatically ──────────
# No mocking libraries. No monkey-patching. Just swap the function.
# This is why FastAPI DI is the #1 interview topic.`,
          notes: [
            "app.dependency_overrides[original_fn] = replacement_fn — that's the entire testing strategy",
            "No unittest.mock needed. No monkey-patching. No mocking at the driver level",
            "Every Depends() in your routes becomes a clean injection point for tests",
            "Clear overrides after tests: app.dependency_overrides.clear()",
          ]
        },
        {
          type: "heading",
          text: "Router-Level Dependencies",
          level: 2
        },
        {
          type: "text",
          text: "As the API grows, you'll have groups of routes that all need the same dependency (e.g., all <code>/admin/*</code> routes require admin auth). Instead of adding <code>Depends(require_admin)</code> to every route, apply it to the entire router:"
        },
        {
          type: "code",
          lang: "python",
          filename: "routers/admin.py",
          code: `"""Admin routes — all routes require admin authentication."""
from fastapi import APIRouter, Depends
from deps import DB
# (require_admin defined in Lesson 7: JWT Authentication)

admin_router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(require_admin)],  # applied to ALL routes below
)


@admin_router.get("/stats")
async def get_stats(db: DB):
    """Admin-only. Auth check runs automatically via router dependency."""
    return {"total_predictions": 42, "active_users": 10}


@admin_router.delete("/cache")
async def clear_cache():
    """Admin-only. Clears the Redis prediction cache."""
    return {"cleared": True}


# In main.py:
# app.include_router(admin_router)`,
          notes: [
            "dependencies=[Depends(fn)] on APIRouter applies to ALL routes in that router",
            "The dependency runs for its side effect (auth check) — the return value is discarded",
            "Combine: router-level auth + route-level DB injection = clean separation of concerns",
            "Multiple routers with different auth levels: public_router, user_router, admin_router",
          ]
        },
        {
          type: "heading",
          text: "Dependency Caching: The Per-Request Rule",
          level: 2
        },
        {
          type: "callout",
          variant: "gotcha",
          title: "Dependencies Are Cached Per Request, Not Globally",
          text: "If <code>get_db()</code> appears in 3 places in the dependency graph for a single request, it's called <strong>once</strong> and the same session is reused. But on the next request, it's called again — fresh session. This is exactly what you want: shared state within a request, isolated state between requests. If you need to bypass caching (rare), use <code>Depends(fn, use_cache=False)</code>."
        },
        {
          type: "heading",
          text: "Project Structure After Lesson 4",
          level: 2
        },
        {
          type: "code",
          lang: "bash",
          filename: "project layout (Lesson 4)",
          code: `sentiment-api/
├── .venv/
├── .env
├── .gitignore
├── main.py                # FastAPI app + routes (uses DI now)
├── schemas.py             # Pydantic models
├── config.py              # Settings from env vars
├── deps.py                # ✨ NEW — all dependency providers
├── routers/               # ✨ NEW — route grouping
│   └── admin.py           # admin routes with router-level deps
└── requirements.txt       # + sqlalchemy[asyncio], asyncpg`
        },
        {
          type: "callout",
          variant: "interview",
          title: "Interview Question: Explain FastAPI's Dependency Injection",
          text: "<strong>Weak answer:</strong> \"Depends() injects parameters into routes.\" <strong>Strong answer:</strong> \"FastAPI's DI system resolves a directed acyclic graph of callable providers. Each <code>Depends(fn)</code> declaration tells FastAPI to call that function, resolve <em>its</em> dependencies recursively, and inject the result. Generator dependencies (with <code>yield</code>) get cleanup code that runs after the response — this is how database sessions are scoped to requests. Results are cached per-request to avoid duplicate calls. The killer feature is <code>dependency_overrides</code>: in tests, you replace <code>get_db</code> with a function returning an in-memory session — no mocking library needed. This is why FastAPI services are more testable than Flask services, where you'd need to mock at the driver level.\""
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 5: Middleware, CORS & Structured Logging
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "middleware-logging",
      title: "Middleware, CORS & Structured Logging",
      readTime: "16 min",
      content: [
        {
          type: "text",
          text: "Your sentiment API now has clean dependency injection, validated schemas, and environment-based config. But every production API needs cross-cutting concerns that apply to <em>every</em> request: CORS headers so browser clients can call your API, request IDs so you can trace a single request through distributed logs, timing so you know which endpoints are slow, and structured logging so your logs are queryable in Datadog or CloudWatch instead of being a wall of unstructured text."
        },
        {
          type: "text",
          text: "Middleware is code that wraps <em>every</em> request-response cycle. It runs before your route handler and after. Think of it as a series of nested Russian dolls — the request passes through each layer going in, hits your route handler, and then passes through each layer going out."
        },
        {
          type: "heading",
          text: "The Middleware Onion",
          level: 2
        },
        {
          type: "diagram",
          code: `  REQUEST LIFECYCLE (ASGI middleware stack)

  Client → HTTP Request
    │
    ▼
  ┌─────────────────────────────────────────────────────────────┐
  │  Layer 1: CORSMiddleware                                     │
  │  IN:  check Origin header, handle preflight OPTIONS          │
  │  ┌─────────────────────────────────────────────────────────┐ │
  │  │  Layer 2: RequestContextMiddleware (custom)              │ │
  │  │  IN:  generate request_id, start timer                  │ │
  │  │  ┌─────────────────────────────────────────────────────┐│ │
  │  │  │  Layer 3: GZipMiddleware                            ││ │
  │  │  │  IN:  check Accept-Encoding                         ││ │
  │  │  │  ┌─────────────────────────────────────────────────┐││ │
  │  │  │  │  Your Route Handler                             │││ │
  │  │  │  │  async def predict(body, settings, db): ...     │││ │
  │  │  │  └─────────────────────────────────────────────────┘││ │
  │  │  │  OUT: compress response body if > 500 bytes         ││ │
  │  │  └─────────────────────────────────────────────────────┘│ │
  │  │  OUT: log request, add X-Request-ID + timing headers    │ │
  │  └─────────────────────────────────────────────────────────┘ │
  │  OUT: add Access-Control-Allow-Origin headers                │
  └─────────────────────────────────────────────────────────────┘
    │
    ▼
  Client ← HTTP Response

  IMPORTANT: Middleware added LAST executes FIRST (LIFO/stack order).
  Add CORS first in code so it's the outermost layer.`
        },
        {
          type: "heading",
          text: "Adding CORS to the Sentiment API",
          level: 2
        },
        {
          type: "text",
          text: "If a React or Vue frontend calls your <code>/predict</code> endpoint, the browser blocks the response unless your API sends CORS headers. This is the browser's Same-Origin Policy — it protects users but annoys developers. CORS middleware adds the right headers automatically."
        },
        {
          type: "code",
          lang: "python",
          filename: "main.py (CORS section)",
          code: `from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from config import get_settings


app = FastAPI(title="Sentiment Analysis API", version="0.3.0")
settings = get_settings()

# ── CORS — add FIRST so it's the outermost middleware layer ───────────
if settings.environment == "development":
    # Dev: allow everything (localhost frontends, Postman, etc.)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    # Production: explicit allowlist only
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "https://app.yourcompany.com",
            "https://dashboard.yourcompany.com",
        ],
        allow_credentials=True,        # allow cookies/auth headers
        allow_methods=["GET", "POST", "PUT", "DELETE"],
        allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
        expose_headers=["X-Request-ID", "X-Response-Time"],
        max_age=3600,                  # cache preflight for 1 hour
    )

# ── GZip — compress responses > 500 bytes ─────────────────────────────
app.add_middleware(GZipMiddleware, minimum_size=500)`,
          notes: [
            "CORS must be added first in code — it runs last (outermost layer) due to LIFO ordering",
            "allow_origins=['*'] + allow_credentials=True is INVALID per CORS spec — browsers reject it",
            "expose_headers makes custom headers (X-Request-ID) readable by browser JavaScript",
            "max_age reduces preflight OPTIONS requests — browser caches the CORS check",
            "In Kubernetes: use the ingress controller for CORS instead of app-level middleware",
          ]
        },
        {
          type: "heading",
          text: "Custom Middleware: Request Context & Timing",
          level: 2
        },
        {
          type: "text",
          text: "Now the custom middleware that makes your API debuggable in production. Every request gets a unique ID (for tracing) and a timer (for latency monitoring)."
        },
        {
          type: "code",
          lang: "python",
          filename: "middleware.py",
          code: `"""Custom middleware for the Sentiment Analysis API."""
import time
import uuid
import logging
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("sentiment_api")


class RequestContextMiddleware(BaseHTTPMiddleware):
    """
    Adds to every request:
    1. A unique request_id (for distributed tracing)
    2. Response timing (X-Response-Time header)
    3. Structured request/response logging
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        # ── BEFORE the route handler ──────────────────────────────
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        request.state.request_id = request_id
        start = time.perf_counter()

        # ── Call the route handler (and any inner middleware) ──────
        try:
            response = await call_next(request)
        except Exception as exc:
            # Log unhandled exceptions with request context
            duration_ms = (time.perf_counter() - start) * 1000
            logger.error(
                "unhandled_exception",
                extra={
                    "request_id": request_id,
                    "method": request.method,
                    "path": request.url.path,
                    "duration_ms": round(duration_ms, 2),
                    "error": str(exc),
                },
            )
            raise

        # ── AFTER the route handler ───────────────────────────────
        duration_ms = (time.perf_counter() - start) * 1000
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Response-Time"] = f"{duration_ms:.2f}ms"

        logger.info(
            "request_completed",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_ms": round(duration_ms, 2),
                "client_ip": request.client.host if request.client else "unknown",
            },
        )
        return response


# ── Security headers middleware (simpler: function-based) ─────────────
async def add_security_headers(request: Request, call_next) -> Response:
    """Adds OWASP-recommended security headers to every response."""
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response`,
          notes: [
            "BaseHTTPMiddleware = class-based (complex middleware with state/logging). @app.middleware('http') = function-based (simple, stateless)",
            "Accept X-Request-ID from callers (for distributed tracing) or generate one if missing",
            "request.state is a namespace for passing data from middleware to route handlers",
            "Log the request_id in EVERY log line — it's your lifeline for debugging in production",
            "Catch exceptions in middleware to log them with request context before they propagate",
          ]
        },
        {
          type: "heading",
          text: "Wiring Middleware into the App",
          level: 2
        },
        {
          type: "code",
          lang: "python",
          filename: "main.py (middleware registration)",
          code: `from middleware import RequestContextMiddleware, add_security_headers

# ── Register middleware (order matters: last added = first to run) ─────
# These are added AFTER CORS (which was added first = outermost)

app.add_middleware(RequestContextMiddleware)
app.middleware("http")(add_security_headers)


# ── Verify it works ────────────────────────────────────────────────────
# curl -s -D - http://localhost:8000/health
#
# HTTP/1.1 200 OK
# x-request-id: a3f2b8c1-...
# x-response-time: 1.23ms
# x-content-type-options: nosniff
# x-frame-options: DENY
# strict-transport-security: max-age=31536000; includeSubDomains`,
          notes: [
            "Middleware order in code = reverse execution order. CORS first → outermost → runs last going in, first going out",
            "curl -D - shows response headers — use this to verify middleware is working",
            "In production: also check headers with browser DevTools Network tab",
          ]
        },
        {
          type: "heading",
          text: "Structured Logging: JSON Logs for Production",
          level: 2
        },
        {
          type: "text",
          text: "Those <code>logger.info()</code> calls in the middleware are useless if they produce unstructured text like <code>INFO: request completed</code>. In production, you need JSON logs so they're queryable in Datadog, CloudWatch, or ELK. One library makes this trivial:"
        },
        {
          type: "code",
          lang: "bash",
          filename: "install",
          code: `# Add to requirements.txt
pip install python-json-logger`
        },
        {
          type: "code",
          lang: "python",
          filename: "logging_config.py",
          code: `"""Structured JSON logging for the Sentiment Analysis API."""
import logging
import sys
from pythonjsonlogger import jsonlogger


def setup_logging(log_level: str = "INFO") -> None:
    """
    Configure JSON logging. Call once at startup (in lifespan).
    Every logger.info("msg", extra={...}) now outputs a JSON line:

    {"asctime": "2024-01-15T10:30:00", "levelname": "INFO",
     "name": "sentiment_api", "message": "request_completed",
     "request_id": "a3f2b8c1-...", "method": "POST",
     "path": "/predict", "status_code": 200, "duration_ms": 12.5}
    """
    formatter = jsonlogger.JsonFormatter(
        "%(asctime)s %(levelname)s %(name)s %(message)s",
        timestamp=True,
    )

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)

    root = logging.getLogger()
    root.setLevel(getattr(logging, log_level.upper()))
    root.handlers = [handler]

    # Quiet noisy libraries
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)


# ── In lifespan ──────────────────────────────────────────────────
# @asynccontextmanager
# async def lifespan(app: FastAPI):
#     setup_logging(get_settings().log_level)
#     logger.info("api_starting", extra={"version": "0.3.0"})
#     yield
#     logger.info("api_stopping")`,
          notes: [
            "Every log line is a JSON object — queryable with jq locally or in log aggregators",
            "The extra={} dict from middleware gets merged into the JSON output automatically",
            "Quiet noisy libraries: uvicorn.access logs every request (redundant with your middleware logging)",
            "Call setup_logging() once in lifespan — not at module import time (avoids double-init)",
          ]
        },
        {
          type: "heading",
          text: "Rate Limiting: Protecting Expensive Endpoints",
          level: 2
        },
        {
          type: "text",
          text: "ML inference is expensive. A single misbehaving client hammering <code>/predict</code> can saturate your GPU. Rate limiting is essential — and it's better applied as middleware than in every route."
        },
        {
          type: "code",
          lang: "python",
          filename: "rate_limit.py",
          code: `"""Rate limiting for the Sentiment API. Uses SlowAPI (Redis-backed)."""
# pip install slowapi
from fastapi import FastAPI, Request
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware


def setup_rate_limiting(app: FastAPI) -> Limiter:
    """Configure rate limiting. Call in lifespan or after app creation."""
    limiter = Limiter(
        key_func=get_remote_address,   # limit by client IP
        # Production: use Redis backend for shared state across workers
        # storage_uri="redis://localhost:6379/1",
    )
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)
    return limiter


# ── Apply per-route limits ────────────────────────────────────────
limiter = setup_rate_limiting(app)

@app.post("/predict")
@limiter.limit("30/minute")           # inference is expensive
async def predict(request: Request, body: PredictRequest):
    ...

@app.get("/health")
@limiter.limit("200/minute")          # health checks are cheap
async def health(request: Request):
    ...

# ── Custom key: rate limit by API key instead of IP ───────────────
def rate_limit_by_api_key(request: Request) -> str:
    """Limit by API key header — enables tiered rate limits."""
    return request.headers.get("X-API-Key", get_remote_address(request))`,
          notes: [
            "SlowAPI wraps the limits library — supports in-memory, Redis, and Memcached backends",
            "In-memory limits don't work with multiple Gunicorn workers — use Redis in production",
            "429 Too Many Requests returned automatically when limit exceeded",
            "Rate limit by API key for tiered access (free: 10/min, paid: 1000/min)",
            "Important: the Request parameter must be named 'request' for SlowAPI decorator to work",
          ]
        },
        {
          type: "heading",
          text: "Project Structure After Lesson 5",
          level: 2
        },
        {
          type: "code",
          lang: "bash",
          filename: "project layout (Lesson 5)",
          code: `sentiment-api/
├── .venv/
├── .env
├── .gitignore
├── main.py                # app creation + middleware registration
├── schemas.py             # Pydantic models
├── config.py              # Settings
├── deps.py                # dependency providers
├── middleware.py           # ✨ NEW — request context, security headers
├── logging_config.py      # ✨ NEW — structured JSON logging
├── routers/
│   └── admin.py
└── requirements.txt       # + python-json-logger, slowapi`
        },
        {
          type: "callout",
          variant: "interview",
          title: "Interview Question: What's the Difference Between Middleware and Dependencies?",
          text: "<strong>Weak answer:</strong> \"Middleware runs on every request, dependencies run on specific routes.\" <strong>Strong answer:</strong> \"Middleware operates at the <em>ASGI protocol level</em> — it wraps the entire request-response cycle and runs for every request regardless of the route. It has access to the raw request and response objects but <em>not</em> to route-specific data like path parameters or the parsed request body. Dependencies operate at the <em>route level</em> — they're resolved per-route, have access to the full FastAPI context (path params, query params, parsed body), are cached per-request, and can be overridden in tests. Use middleware for cross-cutting concerns (logging, CORS, request IDs). Use dependencies for route-specific logic (auth, DB sessions, pagination). The key insight: middleware can't use <code>Depends()</code> and dependencies can't modify response headers.\""
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 6: Background Tasks, Lifespan & Model Loading
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "background-tasks-lifespan",
      title: "Background Tasks, Lifespan & Model Loading",
      readTime: "16 min",
      content: [
        {
          type: "text",
          text: "Your API has routes, validation, DI, middleware, and logging. But there's a critical missing piece: <em>where does the ML model load?</em> Right now, each request would need to load the model from disk — a 2-second operation that makes your API unusable. You need the model loaded <strong>once at startup</strong>, shared across all requests, and cleaned up on shutdown. That's what FastAPI's <strong>lifespan</strong> context manager is for."
        },
        {
          type: "text",
          text: "And there's another pattern we need: some work shouldn't block the HTTP response. When a client calls <code>/predict</code>, they want the sentiment result immediately — they don't want to wait while you log the prediction to the database, update analytics counters, or invalidate a cache. FastAPI's <strong>BackgroundTasks</strong> let you return the response first and do the bookkeeping after."
        },
        {
          type: "heading",
          text: "The Lifespan Context Manager",
          level: 2
        },
        {
          type: "diagram",
          code: `  APPLICATION LIFECYCLE

  uvicorn app.main:app
       │
       ▼
  ┌──────────────────────────────────────────────────┐
  │  LIFESPAN: STARTUP (code before yield)            │
  │                                                    │
  │  1. Setup structured logging                       │
  │  2. Connect to PostgreSQL (create pool)            │
  │  3. Connect to Redis (create client)               │
  │  4. Load sentiment model into memory (2 sec)       │
  │  5. Create shared httpx client (connection pool)   │
  │                                                    │
  │  yield  ─────── Application serves requests ────►  │
  │                  (model, db, redis all available)   │
  │                                                    │
  │  LIFESPAN: SHUTDOWN (code after yield)             │
  │                                                    │
  │  6. Close httpx client                             │
  │  7. Close Redis connection                         │
  │  8. Close database pool                            │
  │  9. Log "shutdown complete"                        │
  └──────────────────────────────────────────────────┘
       │
       ▼
  Process exits

  WHY NOT @app.on_event("startup")?
  Deprecated since FastAPI 0.93. Lifespan is better because:
  - Resources are scoped (cleanup guaranteed even on crash)
  - Clear visual pairing of setup ↔ teardown
  - Supports async context managers (async with)`
        },
        {
          type: "heading",
          text: "Implementing Lifespan for the Sentiment API",
          level: 2
        },
        {
          type: "code",
          lang: "python",
          filename: "main.py (lifespan — Lesson 6)",
          code: `"""Sentiment Analysis API — full lifespan with model loading."""
import logging
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI

from config import get_settings
from logging_config import setup_logging

logger = logging.getLogger("sentiment_api")


# ── Shared resources (initialized in lifespan, accessed via app.state) ──
@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()

    # ── STARTUP ────────────────────────────────────────────────────
    setup_logging(settings.log_level)
    logger.info("api_starting", extra={
        "version": "0.4.0",
        "environment": settings.environment,
        "model_path": settings.model_path,
    })

    # 1. Load the sentiment model into memory
    logger.info("loading_model", extra={"path": settings.model_path})
    from model import SentimentModel
    model = SentimentModel(settings.model_path)
    await model.load()   # async because it might download from S3
    app.state.model = model
    logger.info("model_loaded", extra={
        "path": settings.model_path,
        "load_time_ms": model.load_time_ms,
    })

    # 2. Create shared HTTP client (for calling external services)
    app.state.http_client = httpx.AsyncClient(
        timeout=30.0,
        limits=httpx.Limits(max_connections=50, max_keepalive_connections=10),
    )

    # 3. Redis client (for caching predictions)
    import redis.asyncio as aioredis
    app.state.redis = aioredis.from_url(
        settings.redis_url,
        decode_responses=True,
    )
    await app.state.redis.ping()  # verify connection
    logger.info("redis_connected", extra={"url": settings.redis_url})

    logger.info("api_ready", extra={"environment": settings.environment})

    # ── HAND OFF TO APPLICATION ────────────────────────────────────
    yield

    # ── SHUTDOWN ───────────────────────────────────────────────────
    logger.info("api_stopping")
    await app.state.http_client.aclose()
    await app.state.redis.close()
    logger.info("api_stopped")


app = FastAPI(
    title="Sentiment Analysis API",
    version="0.4.0",
    lifespan=lifespan,
)`,
          notes: [
            "Everything before yield = startup. Everything after yield = shutdown. The app serves requests during yield",
            "Store resources on app.state — accessible in routes via request.app.state",
            "Model is loaded ONCE at startup, not per-request — eliminates cold-start latency",
            "Always verify connections at startup (redis.ping()) — fail fast if a dependency is down",
            "Shutdown cleanup runs even if startup partially failed (after yield)",
          ]
        },
        {
          type: "heading",
          text: "Accessing Lifespan Resources in Routes",
          level: 2
        },
        {
          type: "text",
          text: "Resources stored in <code>app.state</code> during lifespan are accessed via dependencies. This keeps routes testable — you can override these dependencies in tests."
        },
        {
          type: "code",
          lang: "python",
          filename: "deps.py (updated — Lesson 6)",
          code: `"""Updated dependency providers — now includes model and Redis."""
from typing import Annotated
from fastapi import Depends, Request

from model import SentimentModel
import redis.asyncio as aioredis


# ── Model dependency (loaded in lifespan, accessed via app.state) ─────
async def get_model(request: Request) -> SentimentModel:
    return request.app.state.model

Model = Annotated[SentimentModel, Depends(get_model)]


# ── Redis dependency ──────────────────────────────────────────────────
async def get_redis(request: Request) -> aioredis.Redis:
    return request.app.state.redis

Redis = Annotated[aioredis.Redis, Depends(get_redis)]


# ── Now routes use clean type aliases ─────────────────────────────────
# @app.post("/predict")
# async def predict(body: PredictRequest, model: Model, redis: Redis):
#     cached = await redis.get(f"predict:{body.text}")
#     if cached:
#         return json.loads(cached)
#     result = await model.predict(body.text)
#     await redis.set(f"predict:{body.text}", result.json(), ex=3600)
#     return result`,
          notes: [
            "request.app.state.model accesses the model loaded in lifespan — zero per-request cost",
            "Wrap in dependencies (get_model, get_redis) so tests can override with mocks",
            "Type aliases (Model, Redis) keep route signatures clean — same pattern as DB",
            "In tests: app.dependency_overrides[get_model] = lambda: FakeModel()",
          ]
        },
        {
          type: "heading",
          text: "The Model Class",
          level: 2
        },
        {
          type: "code",
          lang: "python",
          filename: "model.py",
          code: `"""Sentiment model wrapper — loaded once at startup via lifespan."""
import time
import logging
from transformers import pipeline

logger = logging.getLogger("sentiment_api")


class SentimentModel:
    """
    Wraps a HuggingFace sentiment pipeline.
    In production, replace with your own model or an API call.
    """

    def __init__(self, model_path: str):
        self.model_path = model_path
        self._pipeline = None
        self.load_time_ms: float = 0

    async def load(self) -> None:
        """Load model into memory. Called once in lifespan."""
        start = time.perf_counter()
        # pipeline() downloads & caches the model on first call
        self._pipeline = pipeline(
            "sentiment-analysis",
            model=self.model_path,
            device=-1,   # CPU. Use device=0 for GPU (CUDA)
        )
        self.load_time_ms = (time.perf_counter() - start) * 1000
        logger.info("model_loaded", extra={
            "model": self.model_path,
            "load_time_ms": round(self.load_time_ms, 2),
        })

    async def predict(self, text: str) -> dict:
        """Run inference. Returns {sentiment, confidence}."""
        if not self._pipeline:
            raise RuntimeError("Model not loaded — call load() first")
        result = self._pipeline(text, truncation=True, max_length=512)[0]
        return {
            "sentiment": result["label"].lower(),
            "confidence": round(result["score"], 4),
        }

    async def predict_batch(self, texts: list[str]) -> list[dict]:
        """Batch inference — more efficient than individual calls."""
        if not self._pipeline:
            raise RuntimeError("Model not loaded")
        results = self._pipeline(texts, truncation=True, max_length=512, batch_size=32)
        return [
            {"sentiment": r["label"].lower(), "confidence": round(r["score"], 4)}
            for r in results
        ]`,
          notes: [
            "Model is loaded ONCE in lifespan, stored in app.state, injected via Depends(get_model)",
            "device=-1 = CPU, device=0 = GPU. On Apple Silicon: device='mps' for Metal acceleration",
            "predict_batch() is more efficient than calling predict() in a loop — HuggingFace batches internally",
            "In production, you might call a remote model server (TorchServe, Triton) instead of running locally",
          ]
        },
        {
          type: "heading",
          text: "BackgroundTasks: Post-Response Work",
          level: 2
        },
        {
          type: "text",
          text: "Now the second pattern. When <code>/predict</code> returns a result, we want to <em>also</em> log the prediction to a database and update a counter — but the client shouldn't wait for that. FastAPI's <code>BackgroundTasks</code> runs functions <em>after</em> the response is sent."
        },
        {
          type: "code",
          lang: "python",
          filename: "routers/predict.py (with background tasks)",
          code: `"""Prediction routes with caching and background tasks."""
import json
import logging
from fastapi import APIRouter, BackgroundTasks

from schemas import PredictRequest, PredictResponse, BatchPredictRequest
from deps import Model, Redis, DB

logger = logging.getLogger("sentiment_api")
router = APIRouter(tags=["inference"])


# ── Background task: log prediction to database ──────────────────────
async def log_prediction(db_session, text: str, sentiment: str, confidence: float):
    """Runs AFTER the HTTP response is sent. Client doesn't wait."""
    try:
        from sqlalchemy import text as sql_text
        await db_session.execute(
            sql_text(
                "INSERT INTO predictions (input_text, sentiment, confidence) "
                "VALUES (:text, :sentiment, :confidence)"
            ),
            {"text": text, "sentiment": sentiment, "confidence": confidence},
        )
        await db_session.commit()
    except Exception as e:
        logger.error("log_prediction_failed", extra={"error": str(e)})
        # Never let a background task failure affect the client


# ── POST /predict — with caching + background logging ─────────────────
@router.post("/predict", response_model=PredictResponse)
async def predict(
    body: PredictRequest,
    model: Model,
    redis: Redis,
    db: DB,
    background_tasks: BackgroundTasks,
):
    # 1. Check cache first
    cache_key = f"predict:{body.text}"
    cached = await redis.get(cache_key)
    if cached:
        logger.info("cache_hit", extra={"text": body.text[:50]})
        return PredictResponse(**json.loads(cached))

    # 2. Run inference
    result = await model.predict(body.text)

    # 3. Build response
    response = PredictResponse(
        text=body.text,
        sentiment=result["sentiment"],
        confidence=result["confidence"],
    )

    # 4. Cache the result (async, but fast — no need for background)
    await redis.set(cache_key, response.model_dump_json(), ex=3600)

    # 5. Log to DB in background (client doesn't wait for this)
    background_tasks.add_task(
        log_prediction, db, body.text, result["sentiment"], result["confidence"]
    )

    return response


# ── POST /predict/batch ───────────────────────────────────────────────
@router.post("/predict/batch")
async def predict_batch(
    body: BatchPredictRequest,
    model: Model,
    background_tasks: BackgroundTasks,
):
    results = await model.predict_batch(body.texts)
    responses = [
        PredictResponse(text=text, sentiment=r["sentiment"], confidence=r["confidence"])
        for text, r in zip(body.texts, results)
    ]

    # Log all predictions in background
    for resp in responses:
        background_tasks.add_task(
            log_prediction, None, resp.text, resp.sentiment, resp.confidence
        )

    return {"predictions": [r.model_dump() for r in responses]}`,
          notes: [
            "BackgroundTasks run AFTER the response is sent — client doesn't wait",
            "Always catch exceptions in background tasks — unhandled errors are silently swallowed",
            "Cache check before inference = huge performance win (Redis GET is ~0.1ms vs model inference ~50ms)",
            "add_task(fn, *args) — positional args passed to the function",
            "Background tasks run in the same process — they DON'T survive server crashes",
          ]
        },
        {
          type: "heading",
          text: "BackgroundTasks vs Celery: When to Use Each",
          level: 2
        },
        {
          type: "comparison",
          headers: ["", "BackgroundTasks", "Celery + Redis"],
          rows: [
            ["Use case", "Fast, non-critical post-response work", "Reliable, retryable, long-running jobs"],
            ["Persistence", "Lost if server crashes", "Persisted in broker queue"],
            ["Retry on failure", "No built-in retry", "Configurable retry policy + dead letter queue"],
            ["Monitoring", "None built-in", "Flower dashboard + Prometheus metrics"],
            ["Scalability", "Tied to web server process", "Independent worker pool (scale separately)"],
            ["Setup complexity", "Zero (built into FastAPI)", "Redis/RabbitMQ + Celery workers + config"],
            ["Our API uses it for", "Prediction logging, cache warm-up", "Batch reprocessing, report generation"],
          ]
        },
        {
          type: "heading",
          text: "The Complete /predict Flow",
          level: 2
        },
        {
          type: "diagram",
          code: `  POST /predict {"text": "This product is amazing"}
       │
  ┌────▼─────────────────────────────────────────────────┐
  │  1. Middleware: assign request_id, start timer        │
  │  2. Pydantic: validate body (PredictRequest)          │
  │  3. DI: inject model, redis, db, background_tasks     │
  └────┬─────────────────────────────────────────────────┘
       │
  ┌────▼─────────────────────────────────────────────────┐
  │  4. Redis cache check: GET predict:This product...    │
  │     ├─ HIT  → return cached result (skip model)      │
  │     └─ MISS → continue to step 5                      │
  └────┬─────────────────────────────────────────────────┘
       │
  ┌────▼─────────────────────────────────────────────────┐
  │  5. Model inference: model.predict(text) → ~50ms      │
  │  6. Cache result: SET predict:... EX 3600             │
  │  7. Schedule background: log_prediction(db, ...)      │
  └────┬─────────────────────────────────────────────────┘
       │
  ┌────▼─────────────────────────────────────────────────┐
  │  8. Return response: {"sentiment":"positive", ...}    │
  │  9. Middleware: log request, add timing headers        │
  └────┬─────────────────────────────────────────────────┘
       │
  ┌────▼─────────────────────────────────────────────────┐
  │  10. Background: INSERT INTO predictions (...) ─ async│
  │      Client already has their response ✓              │
  └──────────────────────────────────────────────────────┘`
        },
        {
          type: "heading",
          text: "Project Structure After Lesson 6",
          level: 2
        },
        {
          type: "code",
          lang: "bash",
          filename: "project layout (Lesson 6)",
          code: `sentiment-api/
├── .venv/
├── .env
├── .gitignore
├── main.py                # app + lifespan (model/redis/httpx init)
├── model.py               # ✨ NEW — SentimentModel wrapper
├── schemas.py             # Pydantic models
├── config.py              # Settings
├── deps.py                # dependencies (db, model, redis)
├── middleware.py           # request context, security headers
├── logging_config.py      # structured JSON logging
├── routers/
│   ├── predict.py         # ✨ NEW — /predict with cache + bg tasks
│   └── admin.py
└── requirements.txt       # + transformers, redis, httpx`
        },
        {
          type: "callout",
          variant: "interview",
          title: "Interview Question: How Do You Load an ML Model in a FastAPI Service?",
          text: "<strong>Weak answer:</strong> \"Load it in the route function.\" <strong>Strong answer:</strong> \"Use FastAPI's lifespan context manager. The model loads <em>once</em> at startup into <code>app.state.model</code>, before the server starts accepting traffic. Every request accesses the already-loaded model via a dependency (<code>Depends(get_model)</code>), which reads from <code>request.app.state</code>. This eliminates per-request loading latency. For cleanup, the shutdown section of lifespan releases the model from memory. You <em>never</em> load models per-request — that's a 2-second overhead on every call. And you don't use module-level globals because they're not testable — dependencies can be overridden with <code>app.dependency_overrides[get_model] = lambda: mock_model</code>.\""
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 7 — JWT Authentication & API Keys
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "jwt-auth-api-keys",
      title: "JWT Authentication & API Keys",
      readTime: "16 min",
      content: [
        {
          type: "text",
          text: "Every production API needs authentication. Our Sentiment Analysis API currently lets anyone call <code>/predict</code> — that's fine for development, but in production you need to know <em>who</em> is making requests, enforce rate limits per-user, and restrict admin operations. We'll implement two auth strategies: <strong>JWT tokens</strong> for user sessions (dashboards, admin panels) and <strong>API keys</strong> for service-to-service calls (the pattern most AI APIs use — OpenAI, Anthropic, Stripe)."
        },
        {
          type: "heading",
          text: "Auth Strategy Decision",
          level: 2
        },
        {
          type: "diagram",
          code: `  WHEN TO USE WHAT
  ═══════════════════════════════════════════════════════════

  JWT (JSON Web Token)                  API Key
  ──────────────────────                ──────────
  Browser → API                         Service → API
  Short-lived (15-30 min)               Long-lived (months)
  Carry user claims (id, role)          Identify caller only
  Self-validating (no DB hit)           DB lookup required
  Login flow with username/password     Dashboard-generated
  Refresh token rotation                Revokable instantly

  Our API will support BOTH:
  ┌──────────────────────────────────────────────────────┐
  │  POST /auth/login        → JWT for dashboard users   │
  │  POST /predict           → API key for programmatic  │
  │  GET  /admin/users       → JWT + admin role          │
  └──────────────────────────────────────────────────────┘`
        },
        {
          type: "heading",
          text: "JWT Flow — How It Works",
          level: 2
        },
        {
          type: "diagram",
          code: `  CLIENT                             SERVER
    │                                  │
    │  POST /auth/login                │
    │  { email, password }  ──────────►│
    │                                  │  1. Hash password → compare with DB
    │                                  │  2. Create JWT:
    │                                  │     header.payload.signature
    │◄──────────────────────────────── │  3. Return tokens
    │  { access_token, refresh_token } │
    │                                  │
    │  GET /users/me                   │
    │  Authorization: Bearer eyJ... ──►│
    │                                  │  4. Decode JWT (no DB hit!)
    │                                  │  5. Verify expiry + signature
    │◄──────────────────────────────── │  6. Return user data
    │  { id: 1, role: "user" }         │
    │                                  │
    │  ── Token expired (30 min) ──    │
    │                                  │
    │  POST /auth/refresh              │
    │  { refresh_token: "eyJ..." } ───►│
    │                                  │  7. Verify refresh token
    │◄──────────────────────────────── │  8. Issue new access + refresh
    │  { access_token, refresh_token } │

  JWT Structure (base64url-encoded, NOT encrypted):
  eyJhbGciOiJIUzI1NiJ9 . eyJzdWIiOiIxIiwiZXhwIjoxNz... . SflKxw...
       HEADER                     PAYLOAD                    SIGNATURE
  {"alg":"HS256"}      {"sub":"1","role":"user","exp":...}  HMAC(header+payload, SECRET)`
        },
        {
          type: "heading",
          text: "Password Hashing & Token Creation",
          level: 2
        },
        {
          type: "code",
          lang: "python",
          filename: "auth.py",
          code: `# pip install python-jose[cryptography] passlib[bcrypt]
from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel

from config import settings

# ── Password hashing ────────────────────────────────────────────────────
# bcrypt: slow by design → brute-force resistant
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


# ── Token schemas ────────────────────────────────────────────────────────
class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int

class TokenPayload(BaseModel):
    sub: str          # user id
    role: str         # "user" or "admin"
    type: str         # "access" or "refresh"


# ── Token creation ───────────────────────────────────────────────────────
def create_access_token(user_id: int, role: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "role": role,
        "type": "access",
        "iat": now,
        "exp": now + timedelta(minutes=settings.access_token_expire_minutes),
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm="HS256")

def create_refresh_token(user_id: int) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "type": "refresh",
        "iat": now,
        "exp": now + timedelta(days=settings.refresh_token_expire_days),
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm="HS256")

def decode_token(token: str, expected_type: str = "access") -> TokenPayload:
    """Decode and validate a JWT. Raises JWTError on failure."""
    payload = jwt.decode(
        token,
        settings.jwt_secret_key,
        algorithms=["HS256"],       # ALWAYS pin algorithm — prevents alg:none attack
    )
    if payload.get("type") != expected_type:
        raise JWTError("Wrong token type")
    return TokenPayload(**payload)`,
          notes: [
            "bcrypt is intentionally slow (~100ms per hash) — makes brute-force attacks impractical",
            "Always pin algorithms=['HS256'] in jwt.decode — accepting 'none' algorithm is a critical vulnerability",
            "access_token: short-lived (15-30 min), carries user claims (id, role), self-validating",
            "refresh_token: long-lived (7 days), used only to get new access tokens, stored securely",
            "JWT_SECRET_KEY comes from settings (env var) — generate with: openssl rand -hex 32",
          ]
        },
        {
          type: "heading",
          text: "Auth Dependencies — Protecting Routes",
          level: 2
        },
        {
          type: "code",
          lang: "python",
          filename: "deps.py (add to existing)",
          code: `from typing import Annotated
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError

from auth import decode_token, TokenPayload

# ── OAuth2 scheme (tells Swagger UI where the login endpoint is) ─────────
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# ── Current user from JWT ────────────────────────────────────────────────
async def get_current_user(
    token: str = Depends(oauth2_scheme),
) -> TokenPayload:
    """Extract and validate user from Bearer token."""
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        return decode_token(token, expected_type="access")
    except JWTError:
        raise credentials_exc

# ── Role-based access ────────────────────────────────────────────────────
async def require_admin(
    user: TokenPayload = Depends(get_current_user),
) -> TokenPayload:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

# ── API key auth (for service-to-service calls) ─────────────────────────
async def verify_api_key(request: Request) -> str:
    """
    Check X-API-Key header against database.
    Unlike JWT, API keys require a DB lookup — but they're simpler
    for programmatic access and can be revoked instantly.
    """
    api_key = request.headers.get("X-API-Key")
    if not api_key:
        raise HTTPException(status_code=401, detail="X-API-Key header required")

    redis = request.app.state.redis
    # Check Redis cache first (avoid DB hit on every request)
    cached = await redis.get(f"apikey:{api_key}")
    if cached:
        return cached.decode()   # returns the owner/client_id

    # If not cached, you'd check the DB here:
    # client = await db.execute(select(APIKey).where(APIKey.key == api_key, APIKey.active == True))
    # For now, raise 401
    raise HTTPException(status_code=401, detail="Invalid API key")

# ── Optional auth (public + personalized endpoints) ─────────────────────
optional_oauth2 = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)

async def get_optional_user(
    token: str | None = Depends(optional_oauth2),
) -> TokenPayload | None:
    """Returns user if authenticated, None if anonymous. Never raises 401."""
    if not token:
        return None
    try:
        return decode_token(token)
    except JWTError:
        return None

# ── Type aliases for clean route signatures ──────────────────────────────
CurrentUser = Annotated[TokenPayload, Depends(get_current_user)]
AdminUser   = Annotated[TokenPayload, Depends(require_admin)]
OptionalUser = Annotated[TokenPayload | None, Depends(get_optional_user)]
ApiKeyOwner = Annotated[str, Depends(verify_api_key)]`,
          notes: [
            "OAuth2PasswordBearer extracts the Bearer token from the Authorization header automatically",
            "tokenUrl='/auth/login' tells Swagger UI where to POST credentials — enables the 'Authorize' button",
            "get_current_user is the workhorse — every protected route depends on it",
            "API key auth uses X-API-Key header + Redis cache → DB fallback — revocation is instant (delete from Redis)",
            "Optional auth with auto_error=False returns None instead of 401 when no token present",
            "Annotated type aliases (CurrentUser, AdminUser) keep route signatures clean",
          ]
        },
        {
          type: "heading",
          text: "Auth Router — Login, Refresh, Register",
          level: 2
        },
        {
          type: "code",
          lang: "python",
          filename: "routers/auth.py",
          code: `from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from auth import (
    hash_password, verify_password,
    create_access_token, create_refresh_token, decode_token,
    TokenResponse,
)
from deps import DB
from schemas import UserCreate, UserResponse
# Assume: User SQLAlchemy model with id, email, hashed_password, role

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=UserResponse, status_code=201)
async def register(body: UserCreate, db: DB):
    # Check duplicate
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
    """
    OAuth2PasswordRequestForm expects form data (not JSON):
    username=alice@example.com&password=secret
    This makes it compatible with Swagger UI's Authorize button.
    """
    result = await db.execute(
        select(User).where(User.email == form.username)
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(form.password, user.hashed_password):
        # Same error for both — don't leak whether email exists
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password",
        )

    return TokenResponse(
        access_token=create_access_token(user.id, user.role),
        refresh_token=create_refresh_token(user.id),
        expires_in=settings.access_token_expire_minutes * 60,
    )

@router.post("/refresh", response_model=TokenResponse)
async def refresh(refresh_token: str, db: DB):
    """Exchange a valid refresh token for a new token pair."""
    from jose import JWTError
    try:
        payload = decode_token(refresh_token, expected_type="refresh")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user = await db.get(User, int(payload.sub))
    if not user:
        raise HTTPException(status_code=401, detail="User no longer exists")

    return TokenResponse(
        access_token=create_access_token(user.id, user.role),
        refresh_token=create_refresh_token(user.id),
        expires_in=settings.access_token_expire_minutes * 60,
    )`,
          notes: [
            "OAuth2PasswordRequestForm uses 'username' field — we map it to email internally",
            "Same error for wrong email AND wrong password — prevents email enumeration attacks",
            "Register hashes password before storing — never store plain text",
            "Refresh endpoint issues a NEW pair of tokens (access + refresh) — this is 'token rotation'",
            "Production: store refresh tokens in DB/Redis and check if revoked before issuing new tokens",
          ]
        },
        {
          type: "heading",
          text: "Wiring Auth into the Sentiment API",
          level: 2
        },
        {
          type: "code",
          lang: "python",
          filename: "routers/predict.py (updated)",
          code: `from fastapi import APIRouter, BackgroundTasks
from deps import CurrentUser, OptionalUser, ApiKeyOwner, Model, Redis, DB

router = APIRouter(tags=["predictions"])

# ── Public endpoint with optional personalization ────────────────────────
@router.get("/models")
async def list_models(user: OptionalUser):
    """Anyone can see available models. Logged-in users see their usage stats."""
    models = [{"name": "sentiment-v1", "version": "1.0"}]
    if user:
        models[0]["your_requests_today"] = 42   # fetch from DB
    return {"models": models}

# ── API-key-protected prediction (service-to-service) ────────────────────
@router.post("/predict")
async def predict(
    body: PredictRequest,
    owner: ApiKeyOwner,          # requires X-API-Key header
    model: Model,
    redis: Redis,
    bg: BackgroundTasks,
):
    """Production prediction endpoint — authenticated via API key."""
    # Cache check (include owner in key for per-client caching)
    cache_key = f"predict:{owner}:{body.text[:80]}"
    cached = await redis.get(cache_key)
    if cached:
        return json.loads(cached)

    result = model.predict(body.text)
    response = {"sentiment": result["label"], "score": result["score"]}

    await redis.setex(cache_key, 3600, json.dumps(response))
    bg.add_task(log_prediction, owner=owner, text=body.text, result=response)
    return response

# ── JWT-protected admin endpoint ─────────────────────────────────────────
@router.get("/predictions/history")
async def prediction_history(user: CurrentUser, db: DB):
    """Dashboard users can see their prediction history."""
    # query predictions table filtered by user.sub
    return {"user_id": user.sub, "predictions": []}`,
          notes: [
            "/predict uses API key auth (X-API-Key header) — the standard for programmatic API access",
            "/predictions/history uses JWT auth (Bearer token) — for dashboard/browser users",
            "/models uses optional auth — works for anonymous, adds personalization when logged in",
            "Cache key includes owner — prevents one client from seeing another's cached results",
            "Three auth patterns in one router: API key, JWT required, JWT optional",
          ]
        },
        {
          type: "heading",
          text: "Updated main.py",
          level: 2
        },
        {
          type: "code",
          lang: "python",
          filename: "main.py (add auth router)",
          code: `from fastapi import FastAPI
from contextlib import asynccontextmanager
from routers import predict, admin, auth     # ✨ add auth

@asynccontextmanager
async def lifespan(app: FastAPI):
    # ... model loading, redis, httpx (from Lesson 6)
    yield
    # ... cleanup

app = FastAPI(title="Sentiment Analysis API", lifespan=lifespan)

# Mount routers
app.include_router(auth.router)              # ✨ /auth/login, /auth/register, /auth/refresh
app.include_router(predict.router)
app.include_router(admin.router)`,
          notes: [
            "Auth router is included first — its tokenUrl is referenced by OAuth2PasswordBearer",
            "Swagger UI now shows an 'Authorize' button — click it to login and test protected routes",
          ]
        },
        {
          type: "heading",
          text: "JWT Security Checklist",
          level: 2
        },
        {
          type: "callout",
          variant: "gotcha",
          title: "JWT Security — Get These Right",
          text: "<strong>1. Secret key entropy:</strong> Generate with <code>openssl rand -hex 32</code> — never use \"secret\" or \"changeme\".<br/><strong>2. Pin the algorithm:</strong> Always <code>algorithms=['HS256']</code> in decode — the <code>alg:none</code> attack lets attackers forge tokens if you accept any algorithm.<br/><strong>3. Set expiry:</strong> Access tokens: 15-30 min. Refresh tokens: 7 days. Never issue non-expiring tokens.<br/><strong>4. Don't store secrets in payload:</strong> JWT payload is base64-encoded, <em>not encrypted</em> — anyone can decode it.<br/><strong>5. Revocation strategy:</strong> For immediate revocation (user logout, password change), store a blocklist in Redis. Check it in <code>get_current_user</code>.<br/><strong>6. HTTPS only:</strong> Tokens in HTTP headers travel in plaintext over HTTP — always use TLS in production."
        },
        {
          type: "heading",
          text: "Config Updates",
          level: 2
        },
        {
          type: "code",
          lang: "python",
          filename: "config.py (add JWT settings)",
          code: `from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # ... existing settings from Lesson 3 ...

    # JWT
    jwt_secret_key: str                         # REQUIRED — no default
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    model_config = {"env_file": ".env"}

settings = Settings()`,
          notes: [
            "jwt_secret_key has no default — app crashes on startup if not set. This is intentional.",
            "Pydantic Settings validates all config at startup — fail fast, not on first auth request",
          ]
        },
        {
          type: "code",
          lang: "bash",
          filename: ".env (add)",
          code: `# Generate a real secret:
# openssl rand -hex 32
JWT_SECRET_KEY=your-256-bit-secret-here-generate-with-openssl
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7`,
          notes: [
            "Never commit .env to git — add it to .gitignore",
            "In production, inject via Kubernetes secrets or cloud secret manager",
          ]
        },
        {
          type: "heading",
          text: "Project Structure After Lesson 7",
          level: 2
        },
        {
          type: "code",
          lang: "bash",
          filename: "project layout (Lesson 7)",
          code: `sentiment-api/
├── .venv/
├── .env                  # + JWT_SECRET_KEY
├── .gitignore
├── main.py               # + auth router mounted
├── auth.py               # ✨ NEW — password hashing, JWT create/decode
├── model.py              # SentimentModel wrapper
├── schemas.py            # + UserCreate, UserResponse, TokenResponse
├── config.py             # + jwt_secret_key, token expiry settings
├── deps.py               # + CurrentUser, AdminUser, OptionalUser, ApiKeyOwner
├── middleware.py          # request context, security headers
├── logging_config.py     # structured JSON logging
├── routers/
│   ├── auth.py           # ✨ NEW — /auth/login, /register, /refresh
│   ├── predict.py        # updated: API key + JWT protected routes
│   └── admin.py
└── requirements.txt      # + python-jose[cryptography], passlib[bcrypt]`
        },
        {
          type: "callout",
          variant: "interview",
          title: "Interview Question: How Do You Secure an AI Inference API?",
          text: "<strong>Weak answer:</strong> \"Add a login page.\" <strong>Strong answer:</strong> \"Two strategies depending on the caller. For <em>programmatic access</em> (other services, SDKs), use API keys in the <code>X-API-Key</code> header — they're long-lived, simple, and revokable via Redis/DB. For <em>dashboard users</em>, use JWT with short-lived access tokens (30 min) and refresh token rotation. API keys are validated against Redis (cached) → DB (fallback), so revocation is instant. JWTs are self-validating (no DB hit per request), but for immediate revocation you need a Redis blocklist. Rate limiting is per-key and per-user via SlowAPI. All traffic is over HTTPS. Secrets come from environment variables (never hardcoded), validated at startup by Pydantic Settings.\""
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 8 — Testing the Sentiment API
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "testing-sentiment-api",
      title: "Testing the Sentiment API",
      readTime: "16 min",
      content: [
        {
          type: "text",
          text: "We have a full Sentiment Analysis API with DI, middleware, caching, background tasks, and auth. Now we need to prove it works — and <em>keeps</em> working as we change it. FastAPI's killer testing feature is <code>dependency_overrides</code>: you can swap the real database, ML model, Redis, and auth with fakes in one line. No monkeypatching, no environment variable hacks. This lesson tests every layer of our API."
        },
        {
          type: "heading",
          text: "Test Architecture — What We're Swapping",
          level: 2
        },
        {
          type: "diagram",
          code: `  PRODUCTION                              TESTS
  ══════════                              ═════

  get_db() → PostgreSQL AsyncSession      get_db() → SQLite in-memory
  get_model() → HuggingFace pipeline      get_model() → FakeModel (instant)
  get_redis() → Redis server              get_redis() → fakeredis
  get_current_user() → JWT decode         get_current_user() → hardcoded user
  verify_api_key() → Redis + DB lookup    verify_api_key() → always "test-client"

  HOW:
  ┌───────────────────────────────────────────────────────────────┐
  │  app.dependency_overrides[get_db] = override_get_db           │
  │  app.dependency_overrides[get_model] = lambda: fake_model     │
  │  app.dependency_overrides[get_current_user] = lambda: user    │
  │                                                               │
  │  That's it. No monkeypatching. No env var hacks.              │
  │  FastAPI resolves the override instead of the real dependency. │
  └───────────────────────────────────────────────────────────────┘`
        },
        {
          type: "heading",
          text: "Install Test Dependencies",
          level: 2
        },
        {
          type: "code",
          lang: "bash",
          filename: "terminal (macOS)",
          code: `# In your venv:
pip install pytest pytest-asyncio httpx fakeredis[lua] aiosqlite

# pytest.ini / pyproject.toml config:
# [tool.pytest.ini_options]
# asyncio_mode = "auto"
# testpaths = ["tests"]`,
          notes: [
            "pytest-asyncio: run async test functions with pytest",
            "httpx: AsyncClient for testing ASGI apps in-process (no network)",
            "fakeredis[lua]: in-memory Redis mock — supports Lua scripts, pub/sub, all data structures",
            "aiosqlite: async SQLite driver for in-memory test database",
            "asyncio_mode = 'auto' means you don't need @pytest.mark.asyncio on every test",
          ]
        },
        {
          type: "heading",
          text: "Shared Fixtures — conftest.py",
          level: 2
        },
        {
          type: "code",
          lang: "python",
          filename: "tests/conftest.py",
          code: `import pytest
import fakeredis.aioredis
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import (
    create_async_engine, async_sessionmaker, AsyncSession,
)

from main import app
from deps import get_db, get_model, get_redis, get_current_user, verify_api_key
from auth import TokenPayload

# ═══════════════════════════════════════════════════════════════════════════
# DATABASE — in-memory SQLite (isolated per test)
# ═══════════════════════════════════════════════════════════════════════════
TEST_DB_URL = "sqlite+aiosqlite:///:memory:"
engine = create_async_engine(TEST_DB_URL)
TestSession = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

@pytest.fixture(autouse=True)
async def setup_db():
    """Create tables before each test, drop after."""
    from models import Base   # your SQLAlchemy declarative base
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

async def override_get_db():
    async with TestSession() as session:
        yield session

# ═══════════════════════════════════════════════════════════════════════════
# ML MODEL — fake that returns instantly
# ═══════════════════════════════════════════════════════════════════════════
class FakeModel:
    """Drop-in replacement for SentimentModel. No GPU, no downloads."""
    def predict(self, text: str) -> dict:
        # Deterministic: "good" → positive, anything else → negative
        label = "positive" if "good" in text.lower() else "negative"
        return {"label": label, "score": 0.95}

    def predict_batch(self, texts: list[str]) -> list[dict]:
        return [self.predict(t) for t in texts]

fake_model = FakeModel()

# ═══════════════════════════════════════════════════════════════════════════
# REDIS — fakeredis (in-memory, no server needed)
# ═══════════════════════════════════════════════════════════════════════════
@pytest.fixture
async def fake_redis():
    r = fakeredis.aioredis.FakeRedis()
    yield r
    await r.flushall()

# ═══════════════════════════════════════════════════════════════════════════
# AUTH — pre-authenticated users
# ═══════════════════════════════════════════════════════════════════════════
test_user = TokenPayload(sub="1", role="user", type="access")
test_admin = TokenPayload(sub="99", role="admin", type="access")

# ═══════════════════════════════════════════════════════════════════════════
# HTTP CLIENTS — with all dependencies overridden
# ═══════════════════════════════════════════════════════════════════════════
@pytest.fixture
async def client(fake_redis):
    """Unauthenticated client — no user, no API key."""
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_model] = lambda: fake_model
    app.dependency_overrides[get_redis] = lambda: fake_redis

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac

    app.dependency_overrides.clear()

@pytest.fixture
async def auth_client(client):
    """Client authenticated as regular user (JWT)."""
    app.dependency_overrides[get_current_user] = lambda: test_user
    yield client

@pytest.fixture
async def admin_client(client):
    """Client authenticated as admin (JWT)."""
    app.dependency_overrides[get_current_user] = lambda: test_admin
    yield client

@pytest.fixture
async def api_key_client(client):
    """Client with valid API key."""
    app.dependency_overrides[verify_api_key] = lambda: "test-client-id"
    yield client`,
          notes: [
            "autouse=True on setup_db means every test gets fresh tables — no test pollution",
            "FakeModel is deterministic: 'good' → positive, else → negative — makes assertions predictable",
            "fakeredis runs in-memory — no Redis server needed, tests run anywhere (CI included)",
            "Four client fixtures: unauthenticated, user JWT, admin JWT, API key — test all access levels",
            "dependency_overrides.clear() in the client fixture teardown ensures no leaks between tests",
            "Pattern: override deps at the client level, not per-test — keeps tests focused on behavior",
          ]
        },
        {
          type: "heading",
          text: "Testing Predictions",
          level: 2
        },
        {
          type: "code",
          lang: "python",
          filename: "tests/test_predict.py",
          code: `import json

# ═══════════════════════════════════════════════════════════════════════════
# HAPPY PATH
# ═══════════════════════════════════════════════════════════════════════════
async def test_predict_positive(api_key_client):
    response = await api_key_client.post("/predict", json={"text": "This is good"})
    assert response.status_code == 200
    data = response.json()
    assert data["sentiment"] == "positive"
    assert data["score"] == 0.95

async def test_predict_negative(api_key_client):
    response = await api_key_client.post("/predict", json={"text": "This is terrible"})
    assert response.status_code == 200
    assert response.json()["sentiment"] == "negative"

# ═══════════════════════════════════════════════════════════════════════════
# CACHING — second call should return cached result
# ═══════════════════════════════════════════════════════════════════════════
async def test_predict_cache_hit(api_key_client, fake_redis):
    # First call — cache miss
    r1 = await api_key_client.post("/predict", json={"text": "This is good"})
    assert r1.status_code == 200

    # Verify value was cached
    keys = await fake_redis.keys("predict:*")
    assert len(keys) == 1

    # Second call — cache hit (same result, faster)
    r2 = await api_key_client.post("/predict", json={"text": "This is good"})
    assert r2.json() == r1.json()

# ═══════════════════════════════════════════════════════════════════════════
# AUTH ENFORCEMENT
# ═══════════════════════════════════════════════════════════════════════════
async def test_predict_without_api_key(client):
    """Unauthenticated client should get 401."""
    response = await client.post("/predict", json={"text": "test"})
    assert response.status_code == 401

# ═══════════════════════════════════════════════════════════════════════════
# VALIDATION
# ═══════════════════════════════════════════════════════════════════════════
async def test_predict_empty_text(api_key_client):
    response = await api_key_client.post("/predict", json={"text": ""})
    assert response.status_code == 422   # Pydantic validation error

async def test_predict_missing_text(api_key_client):
    response = await api_key_client.post("/predict", json={})
    assert response.status_code == 422`,
          notes: [
            "test_predict_positive: FakeModel returns 'positive' for text containing 'good' — deterministic",
            "test_predict_cache_hit: verifies the caching layer works without testing Redis internals",
            "test_predict_without_api_key: the unauthenticated 'client' fixture doesn't override verify_api_key",
            "Always test validation (422) — Pydantic catches empty/missing fields, verify it surfaces correctly",
            "Tests don't know or care about the real model — they test the HTTP contract and behavior",
          ]
        },
        {
          type: "heading",
          text: "Testing Auth Endpoints",
          level: 2
        },
        {
          type: "code",
          lang: "python",
          filename: "tests/test_auth.py",
          code: `from auth import hash_password

# ═══════════════════════════════════════════════════════════════════════════
# REGISTRATION
# ═══════════════════════════════════════════════════════════════════════════
async def test_register_success(client):
    response = await client.post("/auth/register", json={
        "email": "alice@example.com",
        "password": "StrongPass123!",
    })
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "alice@example.com"
    assert "password" not in data            # never leak password
    assert "hashed_password" not in data     # never leak hash either

async def test_register_duplicate_email(client):
    # Register once
    await client.post("/auth/register", json={
        "email": "alice@example.com",
        "password": "StrongPass123!",
    })
    # Register again with same email
    response = await client.post("/auth/register", json={
        "email": "alice@example.com",
        "password": "DifferentPass456!",
    })
    assert response.status_code == 409   # Conflict

# ═══════════════════════════════════════════════════════════════════════════
# LOGIN
# ═══════════════════════════════════════════════════════════════════════════
async def test_login_success(client):
    # Register first
    await client.post("/auth/register", json={
        "email": "bob@example.com",
        "password": "MySecret789!",
    })
    # Login (OAuth2 form data, not JSON)
    response = await client.post("/auth/login", data={
        "username": "bob@example.com",   # OAuth2 spec uses 'username'
        "password": "MySecret789!",
    })
    assert response.status_code == 200
    tokens = response.json()
    assert "access_token" in tokens
    assert "refresh_token" in tokens
    assert tokens["token_type"] == "bearer"

async def test_login_wrong_password(client):
    await client.post("/auth/register", json={
        "email": "eve@example.com",
        "password": "RealPassword!",
    })
    response = await client.post("/auth/login", data={
        "username": "eve@example.com",
        "password": "WrongPassword!",
    })
    assert response.status_code == 401

async def test_login_nonexistent_user(client):
    response = await client.post("/auth/login", data={
        "username": "nobody@example.com",
        "password": "anything",
    })
    assert response.status_code == 401   # same error — no user enumeration

# ═══════════════════════════════════════════════════════════════════════════
# PROTECTED ROUTES
# ═══════════════════════════════════════════════════════════════════════════
async def test_prediction_history_authenticated(auth_client):
    response = await auth_client.get("/predictions/history")
    assert response.status_code == 200

async def test_prediction_history_unauthenticated(client):
    response = await client.get("/predictions/history")
    assert response.status_code == 401

async def test_admin_route_forbidden_for_regular_user(auth_client):
    response = await auth_client.get("/admin/users")
    assert response.status_code == 403

async def test_admin_route_allowed_for_admin(admin_client):
    response = await admin_client.get("/admin/users")
    assert response.status_code == 200`,
          notes: [
            "Login uses data= (form data), not json= — OAuth2PasswordRequestForm expects form encoding",
            "Same 401 for wrong password AND nonexistent user — prevents email enumeration",
            "Never assert passwords or hashes appear in responses — these are security regression tests",
            "Protected route tests use fixtures: auth_client (user), admin_client (admin), client (anonymous)",
            "Test the full register → login flow end-to-end — this catches integration issues",
          ]
        },
        {
          type: "heading",
          text: "Testing Middleware",
          level: 2
        },
        {
          type: "code",
          lang: "python",
          filename: "tests/test_middleware.py",
          code: `# ═══════════════════════════════════════════════════════════════════════════
# REQUEST ID — every response should have a unique request ID
# ═══════════════════════════════════════════════════════════════════════════
async def test_request_id_header(api_key_client):
    r1 = await api_key_client.post("/predict", json={"text": "good"})
    r2 = await api_key_client.post("/predict", json={"text": "bad"})

    assert "X-Request-ID" in r1.headers
    assert "X-Request-ID" in r2.headers
    assert r1.headers["X-Request-ID"] != r2.headers["X-Request-ID"]  # unique

# ═══════════════════════════════════════════════════════════════════════════
# TIMING HEADER
# ═══════════════════════════════════════════════════════════════════════════
async def test_timing_header(api_key_client):
    response = await api_key_client.post("/predict", json={"text": "good"})
    assert "X-Process-Time" in response.headers
    process_time = float(response.headers["X-Process-Time"])
    assert process_time < 5.0   # should be fast with FakeModel

# ═══════════════════════════════════════════════════════════════════════════
# SECURITY HEADERS
# ═══════════════════════════════════════════════════════════════════════════
async def test_security_headers(api_key_client):
    response = await api_key_client.post("/predict", json={"text": "good"})
    assert response.headers.get("X-Content-Type-Options") == "nosniff"
    assert response.headers.get("X-Frame-Options") == "DENY"`,
          notes: [
            "Middleware tests verify cross-cutting concerns without testing specific routes",
            "X-Request-ID uniqueness test catches the bug where you forget to generate a new UUID per request",
            "Security header tests prevent accidental removal during refactoring",
            "These tests work with any authenticated fixture — middleware runs on every request",
          ]
        },
        {
          type: "heading",
          text: "Running Tests",
          level: 2
        },
        {
          type: "code",
          lang: "bash",
          filename: "terminal (macOS)",
          code: `# Run all tests with verbose output
pytest tests/ -v

# Run a specific test file
pytest tests/test_predict.py -v

# Run a specific test by name
pytest tests/ -k "test_predict_positive" -v

# Run with coverage report
pip install pytest-cov
pytest tests/ --cov=. --cov-report=term-missing

# Example output:
# tests/test_predict.py::test_predict_positive       PASSED
# tests/test_predict.py::test_predict_negative       PASSED
# tests/test_predict.py::test_predict_cache_hit      PASSED
# tests/test_predict.py::test_predict_without_api_key PASSED
# tests/test_auth.py::test_register_success          PASSED
# tests/test_auth.py::test_login_success             PASSED
# ...
#
# ---------- coverage ----------
# Name                  Stmts   Miss  Cover   Missing
# deps.py                  45      2    96%   78-79
# routers/predict.py       30      0   100%
# auth.py                  42      3    93%   65-67
# TOTAL                   220     12    95%`,
          notes: [
            "-v: verbose — shows each test name and PASSED/FAILED",
            "-k: filter tests by name pattern — useful for running related tests",
            "--cov-report=term-missing shows exactly which lines aren't covered",
            "Aim for >90% coverage on routes and auth — 100% is diminishing returns",
            "Tests run in-process (no server, no network) — the entire suite finishes in seconds",
          ]
        },
        {
          type: "heading",
          text: "What to Test vs. What Not to Test",
          level: 2
        },
        {
          type: "comparison",
          headers: ["Test This", "Skip This"],
          rows: [
            ["HTTP status codes (200, 401, 403, 422)", "Pydantic internals (already tested by library)"],
            ["Response shape (required fields present)", "SQLAlchemy query syntax (test via integration)"],
            ["Auth enforcement (who can access what)", "bcrypt hashing (passlib tests this)"],
            ["Validation errors (empty/invalid input)", "FastAPI routing (framework tests this)"],
            ["Cache behavior (hit/miss)", "Redis commands (fakeredis tests this)"],
            ["Error messages (user-facing text)", "Log output format (test in integration/staging)"],
          ]
        },
        {
          type: "heading",
          text: "Project Structure After Lesson 8",
          level: 2
        },
        {
          type: "code",
          lang: "bash",
          filename: "project layout (Lesson 8)",
          code: `sentiment-api/
├── .venv/
├── .env
├── .gitignore
├── main.py
├── auth.py
├── model.py
├── schemas.py
├── config.py
├── deps.py
├── middleware.py
├── logging_config.py
├── routers/
│   ├── auth.py
│   ├── predict.py
│   └── admin.py
├── tests/                    # ✨ NEW — full test suite
│   ├── conftest.py           # shared fixtures (db, model, redis, auth)
│   ├── test_predict.py       # prediction happy path, cache, auth, validation
│   ├── test_auth.py          # register, login, refresh, protected routes
│   └── test_middleware.py    # request ID, timing, security headers
├── pyproject.toml            # + [tool.pytest.ini_options]
└── requirements.txt          # + pytest, pytest-asyncio, httpx, fakeredis`
        },
        {
          type: "callout",
          variant: "interview",
          title: "Interview Question: How Do You Test a FastAPI Service With External Dependencies?",
          text: "<strong>Weak answer:</strong> \"Mock everything with unittest.mock.patch.\" <strong>Strong answer:</strong> \"FastAPI's <code>dependency_overrides</code> is the key. Instead of monkeypatching at the module level, I override dependencies at the app level: <code>app.dependency_overrides[get_db] = override_fn</code>. The DB gets swapped to an in-memory SQLite session. The ML model gets replaced with a <code>FakeModel</code> that returns deterministic results. Redis gets replaced with <code>fakeredis</code>. Auth gets replaced with lambdas returning hardcoded users. Tests run in-process via <code>httpx.AsyncClient</code> with <code>ASGITransport</code> — no real server, no network. Each test gets fresh database tables (<code>create_all</code> / <code>drop_all</code>), so tests are fully isolated. The fixtures are layered: <code>client</code> (unauthenticated) → <code>auth_client</code> (user) → <code>admin_client</code> (admin). The entire suite runs in under 2 seconds.\""
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 9 — Dockerize & Deploy to Production
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "dockerize-deploy-production",
      title: "Dockerize & Deploy to Production",
      readTime: "16 min",
      content: [
        {
          type: "text",
          text: "Our Sentiment Analysis API works locally. Now we need to package it into a Docker image and configure it for production. This lesson connects directly to what you learned in Module 1 (Docker Deep Dive) — we'll use multi-stage builds, non-root users, health checks, and layer caching. Then we'll configure Gunicorn + Uvicorn for production serving and set up the Kubernetes manifests you'll use in Module 4."
        },
        {
          type: "heading",
          text: "Production Architecture",
          level: 2
        },
        {
          type: "diagram",
          code: `  LOCAL DEV                           PRODUCTION
  ═════════                           ══════════

  uvicorn main:app --reload           Gunicorn (process manager)
  ┌──────────────────────┐            ┌──────────────────────────────────┐
  │  Single process       │            │  Gunicorn master                  │
  │  Auto-reload on save  │            │  ├── Worker 1: Uvicorn (asyncio)  │
  │  Debug mode           │            │  ├── Worker 2: Uvicorn (asyncio)  │
  │  SQLite               │            │  └── Worker N: Uvicorn (asyncio)  │
  └──────────────────────┘            └──────────────────────────────────┘
                                      ▲
                                      │ SIGTERM → graceful shutdown
                                      │ Worker crash → auto restart
                                      │ --max-requests → recycle memory

  WHY GUNICORN + UVICORN?
  ───────────────────────
  Uvicorn alone = single process, no crash recovery
  Gunicorn alone = no async support (WSGI only)
  Gunicorn + UvicornWorker = process management + async

  In Kubernetes: 1 worker per pod, scale pods (not workers)
  On bare metal: 2×CPU workers per instance`
        },
        {
          type: "heading",
          text: "Production Dockerfile — Multi-Stage Build",
          level: 2
        },
        {
          type: "code",
          lang: "dockerfile",
          filename: "Dockerfile",
          code: `# ═══════════════════════════════════════════════════════════════════════════
# Stage 1: Build dependencies (large, cached, discarded)
# ═══════════════════════════════════════════════════════════════════════════
FROM python:3.12-slim AS builder

WORKDIR /build

# Install build tools for compiled packages (bcrypt, uvloop)
RUN apt-get update && apt-get install -y --no-install-recommends \\
    gcc libffi-dev \\
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ═══════════════════════════════════════════════════════════════════════════
# Stage 2: Production image (slim, no build tools)
# ═══════════════════════════════════════════════════════════════════════════
FROM python:3.12-slim AS production

WORKDIR /app

# Copy only installed packages from builder (no gcc, no pip cache)
COPY --from=builder /install /usr/local

# Create non-root user BEFORE copying code
RUN useradd --create-home --shell /bin/bash appuser

# Copy application code
COPY main.py config.py deps.py auth.py model.py schemas.py \\
     middleware.py logging_config.py ./
COPY routers/ ./routers/

# Switch to non-root user
USER appuser

# Health check (Kubernetes also does its own, but this catches startup issues)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \\
    CMD ["python", "-c", \\
         "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"]

EXPOSE 8000

# Gunicorn with Uvicorn workers
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
            "Multi-stage: builder has gcc for compiling bcrypt/uvloop; production image has no build tools (~40% smaller)",
            "--prefix=/install in pip install → copies cleanly to production stage via COPY --from=builder",
            "Non-root user (appuser) — container shouldn't run as root even if K8s securityContext isn't set",
            "--start-period=40s gives the ML model time to load before health checks begin",
            "--workers=1 because we scale via Kubernetes pods, not Gunicorn workers",
            "--max-requests=1000 recycles workers after N requests — prevents memory leaks from accumulating",
            "HEALTHCHECK uses urllib (stdlib) not httpx — avoids adding the dependency just for health checks",
          ]
        },
        {
          type: "heading",
          text: "Docker Compose for Local Development",
          level: 2
        },
        {
          type: "code",
          lang: "yaml",
          filename: "docker-compose.yml",
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
    # Override CMD for development (auto-reload, single worker)
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
            "Development: command overrides Gunicorn with uvicorn --reload for hot reload",
            "volumes: .:/app mounts source code so changes are reflected without rebuilding",
            "depends_on with condition: service_healthy ensures DB/Redis are ready before API starts",
            "Production: remove command override and volumes mount — use the Dockerfile CMD",
            "Database URL uses 'db' hostname (Docker DNS) not localhost",
          ]
        },
        {
          type: "heading",
          text: "Build & Run",
          level: 2
        },
        {
          type: "code",
          lang: "bash",
          filename: "terminal (macOS)",
          code: `# Build the production image
docker build -t sentiment-api:latest .

# Check image size (should be ~300MB with ML model deps, not 1.5GB)
docker images sentiment-api

# Run with compose (development mode)
docker compose up -d

# Check logs
docker compose logs -f api

# Test it
curl -X POST http://localhost:8000/predict \\
  -H "X-API-Key: your-test-key" \\
  -H "Content-Type: application/json" \\
  -d '{"text": "This product is amazing"}'

# Run tests inside container
docker compose exec api pytest tests/ -v

# Production build (no compose overrides)
docker build -t sentiment-api:1.0.0 .
docker run -p 8000:8000 --env-file .env sentiment-api:1.0.0`,
          notes: [
            "Tag with version (1.0.0) for production — :latest is for development only",
            "Image size: python:3.12-slim base is ~120MB, add ML deps and you're ~300MB. Full python: is 900MB+",
            "docker compose exec runs commands inside running container — useful for running tests",
            "Production: use --env-file for secrets, never bake them into the image",
          ]
        },
        {
          type: "heading",
          text: "Health Check Endpoints",
          level: 2
        },
        {
          type: "code",
          lang: "python",
          filename: "routers/health.py",
          code: `import time
from fastapi import APIRouter, Depends
from deps import DB, Redis

router = APIRouter(tags=["health"])
START_TIME = time.time()

@router.get("/health")
async def health():
    """
    Liveness probe — is the process alive?
    K8s: if this fails, restart the pod.
    Should NOT check external deps (DB down ≠ restart all pods).
    """
    return {
        "status": "healthy",
        "uptime": round(time.time() - START_TIME),
    }

@router.get("/health/ready")
async def readiness(db: DB, redis: Redis):
    """
    Readiness probe — can this pod serve traffic?
    K8s: if this fails, remove from load balancer (don't restart).
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
            "Liveness: lightweight, no external deps — a crash loop restarts make things worse if DB is down",
            "Readiness: checks DB + Redis — failing removes pod from Service (load balancer) but doesn't restart",
            "K8s probes hit these every 10-30s — keep them fast (<100ms)",
            "Never check the ML model in health probes — model loading is handled by --start-period",
          ]
        },
        {
          type: "heading",
          text: "Kubernetes Manifests — Preview",
          level: 2
        },
        {
          type: "code",
          lang: "yaml",
          filename: "k8s/deployment.yaml (preview — full coverage in Module 4)",
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
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          livenessProbe:
            httpGet:
              path: /health
              port: 8000
            initialDelaySeconds: 45    # model loading time
            periodSeconds: 15
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 8000
            initialDelaySeconds: 50
            periodSeconds: 10
          startupProbe:
            httpGet:
              path: /health
              port: 8000
            failureThreshold: 30       # 30 × 10s = 5 min max startup
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
            "Secrets come from K8s Secrets (not env vars in YAML) — never commit secrets to git",
            "startupProbe: gives ML model up to 5 min to load before liveness/readiness probes kick in",
            "resources.requests: scheduler uses these to place pods; limits: OOMKilled if exceeded",
            "3 replicas behind a ClusterIP Service — internal load balancing across pods",
            "This is a preview — Module 4 (Kubernetes Fundamentals) covers deployments, services, and scaling in depth",
          ]
        },
        {
          type: "heading",
          text: "Production Checklist",
          level: 2
        },
        {
          type: "comparison",
          headers: ["Category", "Requirement", "Status"],
          rows: [
            ["Security", "Non-root container user", "✅ Lesson 9"],
            ["Security", "JWT with pinned algorithm + expiry", "✅ Lesson 7"],
            ["Security", "Secrets from env vars / K8s secrets", "✅ Lesson 3, 7"],
            ["Security", "CORS allowlist (not wildcard)", "✅ Lesson 5"],
            ["Security", "Security headers (nosniff, DENY)", "✅ Lesson 5"],
            ["Reliability", "Health checks (liveness + readiness)", "✅ Lesson 9"],
            ["Reliability", "Graceful shutdown (lifespan)", "✅ Lesson 6"],
            ["Reliability", "Worker recycling (--max-requests)", "✅ Lesson 9"],
            ["Observability", "Structured JSON logging", "✅ Lesson 5"],
            ["Observability", "Request ID tracing", "✅ Lesson 5"],
            ["Observability", "Request timing headers", "✅ Lesson 5"],
            ["Performance", "ML model loaded once at startup", "✅ Lesson 6"],
            ["Performance", "Redis prediction caching", "✅ Lesson 6"],
            ["Performance", "Background tasks for logging", "✅ Lesson 6"],
            ["Testing", "Dependency override test fixtures", "✅ Lesson 8"],
            ["Testing", "Auth enforcement tests", "✅ Lesson 8"],
            ["Build", "Multi-stage Docker build", "✅ Lesson 9"],
            ["Build", "Layer caching (deps before code)", "✅ Lesson 9"],
          ]
        },
        {
          type: "heading",
          text: "Final Project Structure",
          level: 2
        },
        {
          type: "code",
          lang: "bash",
          filename: "project layout (complete)",
          code: `sentiment-api/
├── .venv/
├── .env                      # local env vars (git-ignored)
├── .env.example              # template for other developers
├── .gitignore
├── .dockerignore             # exclude .venv, __pycache__, .env
├── Dockerfile                # ✨ multi-stage production build
├── docker-compose.yml        # ✨ local dev with Postgres + Redis
├── main.py                   # FastAPI app + lifespan
├── auth.py                   # JWT + password hashing
├── model.py                  # SentimentModel (HuggingFace)
├── schemas.py                # Pydantic request/response models
├── config.py                 # Pydantic Settings (validated config)
├── deps.py                   # all dependencies (db, model, redis, auth)
├── middleware.py              # request context, timing, security headers
├── logging_config.py         # structured JSON logging
├── routers/
│   ├── auth.py               # /auth/login, /register, /refresh
│   ├── predict.py            # /predict (API key auth + caching)
│   ├── admin.py              # admin routes (JWT + admin role)
│   └── health.py             # ✨ /health, /health/ready
├── tests/
│   ├── conftest.py           # fixtures (fake DB, model, Redis, auth)
│   ├── test_predict.py       # prediction tests
│   ├── test_auth.py          # auth flow tests
│   └── test_middleware.py    # middleware tests
├── k8s/                      # ✨ Kubernetes manifests (preview)
│   └── deployment.yaml
├── pyproject.toml            # pytest config
└── requirements.txt          # all dependencies`
        },
        {
          type: "heading",
          text: "What's Next — Module Connections",
          level: 2
        },
        {
          type: "callout",
          variant: "tip",
          title: "Where Each Module Picks Up",
          text: "<strong>Module 3 — Databases:</strong> Replace the SQLite/in-memory DB with production PostgreSQL (ACID, indexes, connection pooling, migrations with Alembic). Add MongoDB for unstructured prediction logs. Add Redis patterns beyond caching (rate limiting, pub/sub, distributed locks).<br/><br/><strong>Module 4 — Kubernetes:</strong> Take the Dockerfile and K8s manifests from this lesson and deploy to a real cluster. ConfigMaps, Secrets, Ingress, HPA autoscaling, rolling updates, and resource quotas.<br/><br/><strong>Module 5 — Kubernetes Advanced:</strong> Helm charts, service mesh, observability stack (Prometheus + Grafana), and production-grade networking.<br/><br/><strong>Module 6 — CI/CD:</strong> GitHub Actions pipeline that builds the Docker image, runs the test suite, pushes to a registry, and deploys to Kubernetes via ArgoCD."
        },
        {
          type: "callout",
          variant: "interview",
          title: "Interview Question: Walk Me Through Deploying a FastAPI ML Service to Production",
          text: "<strong>Weak answer:</strong> \"Use Docker and deploy to a server.\" <strong>Strong answer:</strong> \"I package the service with a multi-stage Dockerfile — builder stage compiles native dependencies (bcrypt, uvloop), production stage copies only the installed packages (~300MB vs 1.5GB). The app runs as a non-root user. Gunicorn manages Uvicorn workers with <code>--max-requests</code> for memory leak protection and <code>--graceful-timeout</code> for clean shutdowns. The ML model loads once in FastAPI's lifespan context manager — not per-request. Health checks are split: <code>/health</code> (liveness, no deps) and <code>/health/ready</code> (readiness, checks DB + Redis). Kubernetes startupProbe gives the model 5 minutes to load before other probes activate. Secrets come from K8s Secrets via env vars, validated at startup by Pydantic Settings. The CI pipeline runs pytest (with dependency overrides swapping in fakes), builds the image, pushes to a registry, and ArgoCD syncs the deployment. I scale via pod replicas (not Gunicorn workers) because K8s handles scheduling and resource allocation better than a process manager.\""
        }
      ]
    }

  ]; // end m.lessons
})();
