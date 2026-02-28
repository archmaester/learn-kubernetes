// Patches the Docker module (m1) with full tutorial lesson content.
// Loaded after curriculum.js and docker-examples.js.
(function patchDockerLessons() {
  const m = CURRICULUM.phases[0].modules[0];

  m.lessons = [

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "what-is-docker",
      title: "What Is Docker and Why Does It Exist?",
      readTime: "10 min",
      content: [
        {
          type: "text",
          text: "Before Docker, deploying software was painful. You'd build an app on your laptop, hand it to ops, and hear: <em>\"it doesn't run on the server.\"</em> The server had a different Python version, different system libraries, different OS. You'd spend days debugging environment differences instead of writing code. This was called <strong>dependency hell</strong>."
        },
        {
          type: "callout",
          variant: "info",
          title: "The Core Problem Docker Solves",
          text: "How do you ship not just code, but the entire environment the code needs to run? Docker's answer: package the app and all its dependencies into a single portable unit called a container."
        },
        {
          type: "heading",
          text: "VMs vs Containers — The Key Difference",
          level: 2
        },
        {
          type: "text",
          text: "Virtual machines solve the same problem but differently. A VM emulates an entire computer, including a full OS kernel. Containers share the host's kernel but isolate the filesystem, processes, and network. This makes containers start in milliseconds and use megabytes of memory instead of gigabytes."
        },
        {
          type: "diagram",
          code: `   VIRTUAL MACHINES                    CONTAINERS
  ┌─────────────────────┐             ┌─────────────────────┐
  │  App A  │  App B    │             │  App A  │  App B    │
  ├─────────┼───────────┤             ├─────────┼───────────┤
  │  Libs   │  Libs     │             │  Libs   │  Libs     │
  ├─────────┼───────────┤             └─────────┴───────────┘
  │ Guest   │ Guest     │             ┌─────────────────────┐
  │ OS      │ OS        │             │  Container Runtime  │
  │ (2 GB)  │ (2 GB)    │             │  (Docker / containerd)│
  ├─────────┴───────────┤             ├─────────────────────┤
  │    Hypervisor        │             │     Host OS Kernel  │
  ├─────────────────────┤             ├─────────────────────┤
  │    Host OS           │             │     Host Hardware   │
  ├─────────────────────┤             └─────────────────────┘
  │    Host Hardware     │
  └─────────────────────┘

  Each VM: ~2 GB RAM, ~30s startup       Each container: ~10 MB RAM, <1s startup
  Full OS isolation                       Process-level isolation (shared kernel)`
        },
        {
          type: "comparison",
          headers: ["", "Virtual Machine", "Container"],
          rows: [
            ["Boot time", "30–60 seconds", "< 1 second"],
            ["Memory overhead", "~1–2 GB per VM", "~10–50 MB per container"],
            ["Disk size", "~10–20 GB", "~50–500 MB"],
            ["OS isolation", "Full separate kernel", "Shared host kernel"],
            ["Security boundary", "Stronger (hypervisor)", "Weaker (shared kernel)"],
            ["Portability", "Large VM image", "Tiny image, runs anywhere"],
            ["Best for", "Strong isolation, legacy apps", "Microservices, CI/CD, scale"],
          ]
        },
        {
          type: "heading",
          text: "How Linux Makes Containers Possible",
          level: 2
        },
        {
          type: "text",
          text: "Docker isn't magic — it's a user-friendly API over Linux kernel features that have existed since 2008. Two features do all the heavy lifting:"
        },
        {
          type: "list",
          items: [
            "<strong>Namespaces</strong> — make a process think it's the only one running. Docker uses 6 types: <code>pid</code> (isolated process IDs), <code>net</code> (isolated network stack), <code>mnt</code> (isolated filesystem view), <code>uts</code> (isolated hostname), <code>ipc</code> (isolated shared memory), <code>user</code> (isolated user IDs).",
            "<strong>cgroups (control groups)</strong> — limit how much CPU, memory, and I/O a process can use. This is how <code>--memory 512m</code> works. Without cgroups, a container could consume all host resources.",
            "<strong>OverlayFS</strong> — a union filesystem that stacks read-only image layers with a writable container layer on top. We'll cover this in the next lesson."
          ]
        },
        {
          type: "callout",
          variant: "tip",
          title: "Mental Model",
          text: "A container is not a mini-VM. It's a regular Linux process with extra restrictions applied: <em>it can only see certain files, it can only see certain other processes, it can only use certain network interfaces, and it can only consume a limited amount of resources.</em> That's it."
        },
        {
          type: "heading",
          text: "Docker Architecture",
          level: 2
        },
        {
          type: "text",
          text: "When you run <code>docker run nginx</code>, what actually happens?"
        },
        {
          type: "diagram",
          code: `  You (CLI)         Docker Daemon         Container Runtime
     │                    │                       │
     │  docker run nginx  │                       │
     │─────────────────→  │                       │
     │                    │  pull image (if needed)│
     │                    │──────────────────────→│
     │                    │  create container      │
     │                    │──────────────────────→│
     │                    │  start container       │
     │                    │──────────────────────→│
     │                    │                       │  fork nginx process
     │                    │                       │  apply namespaces
     │                    │                       │  apply cgroups
     │     Container ID   │                       │  mount overlay FS
     │←─────────────────  │←──────────────────────│
     │                    │                       │

  Docker CLI:     Sends REST API calls to the daemon
  Docker Daemon:  Manages images, containers, networks, volumes
  containerd:     OCI-compliant runtime (replaced the old 'libcontainer')
  runc:           Actually calls Linux kernel syscalls to start the process`
        },
        {
          type: "callout",
          variant: "gotcha",
          title: "Common Confusion: Docker vs containerd",
          text: "Docker (the company) created Docker (the tool). Kubernetes dropped Docker as its container runtime in 2021 in favor of containerd directly. But Docker still uses containerd under the hood. When you install Docker, you get: docker CLI → dockerd daemon → containerd → runc. Kubernetes just skips the dockerd layer."
        },
        {
          type: "code",
          lang: "bash",
          filename: "verify-your-setup.sh",
          code: `# Verify Docker is working
docker --version           # Docker version 27.x.x

# See the full architecture info
docker info                # shows: Storage Driver, Runtime, OS, CPUs, Memory

# Confirm containerd is running underneath
docker info | grep -E "Runtime|Containerd"

# Your first container
docker run --rm hello-world

# See what just happened: pull → create → start → exit → remove
# The --rm flag removes the container after it exits`
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "images-layers",
      title: "Images and Layers — How Docker Storage Works",
      readTime: "8 min",
      content: [
        {
          type: "text",
          text: "Understanding how Docker stores images is one of those things that makes everything else click. Once you understand layers, you'll instinctively write better Dockerfiles, understand why builds are fast or slow, and know exactly what's inside an image."
        },
        {
          type: "heading",
          text: "What Is a Docker Image?",
          level: 2
        },
        {
          type: "text",
          text: "A Docker image is a <strong>read-only stack of filesystem layers</strong>. Each instruction in a Dockerfile that changes the filesystem creates a new layer. Layers are identified by a SHA256 hash of their contents — if the content is the same, the layer is the same, and it's shared between images."
        },
        {
          type: "diagram",
          code: `  docker history python:3.12-slim
  ┌────────────────────────────────────────────────┐  ← Layer 4: 2 MB
  │  RUN pip install uvicorn fastapi               │     "your pip install"
  ├────────────────────────────────────────────────┤  ← Layer 3: 5 MB
  │  RUN apt-get install libpq5                    │     "your apt-get"
  ├────────────────────────────────────────────────┤  ← Layer 2: 50 MB
  │  [python:3.12-slim base layers]                │     shared with other
  │  Python runtime, pip, stdlib...                │     python:3.12-slim images
  ├────────────────────────────────────────────────┤  ← Layer 1: 20 MB
  │  Debian base filesystem                        │     shared with all debian
  └────────────────────────────────────────────────┘     images on this host

  Total: 77 MB. But layers 1 and 2 are SHARED on disk.
  If you have 10 images based on python:3.12-slim, layers 1+2 are stored ONCE.`
        },
        {
          type: "callout",
          variant: "info",
          title: "Layers Are Shared",
          text: "This is why pulling a second image based on the same base is fast — Docker only downloads the layers it doesn't already have. It's also why changing an early layer (e.g., a system package) invalidates all layers above it."
        },
        {
          type: "heading",
          text: "How OverlayFS Works",
          level: 2
        },
        {
          type: "text",
          text: "When a container starts, Docker uses <strong>OverlayFS</strong> (overlay filesystem) to give it a writable view of the image without actually copying any files. This is the copy-on-write mechanism."
        },
        {
          type: "diagram",
          code: `  WHAT THE CONTAINER SEES:        HOW IT'S STORED ON DISK:
  ┌─────────────────────────┐
  │  /                      │       upperdir (read-write)
  │  /app/                  │  ←──  ┌──────────────────┐
  │  /app/main.py (modified)│       │ /app/main.py      │  ← container's copy
  │  /usr/bin/python        │       └──────────────────┘
  │  /etc/apt/...           │
  └─────────────────────────┘       lowerdir (read-only image layers)
                                    ┌──────────────────┐
                                    │ /app/main.py      │  ← original (unchanged)
                                    │ /usr/bin/python   │
                                    │ /etc/apt/...      │
                                    └──────────────────┘

  When container writes /app/main.py:
  1. Docker copies original from lowerdir to upperdir  (copy-on-write)
  2. Container modifies the upperdir copy
  3. Original in lowerdir is UNTOUCHED
  4. When container stops, upperdir is discarded → changes are LOST`
        },
        {
          type: "callout",
          variant: "warning",
          title: "Containers Are Ephemeral by Default",
          text: "Any file a container writes to its own filesystem is lost when the container is removed. This is intentional — containers are designed to be stateless. To persist data, you must use volumes (covered in a later lesson)."
        },
        {
          type: "heading",
          text: "Inspecting Images in Practice",
          level: 2
        },
        {
          type: "code",
          lang: "bash",
          filename: "image-inspection.sh",
          code: `# See all layers and their sizes
docker image history python:3.12-slim

# See exact disk usage
docker image ls
docker system df -v

# Install 'dive' to interactively explore layers
# brew install dive  (macOS)
dive python:3.12-slim
# dive shows: each layer, files added/modified, wasted space

# Pull an image (downloads only missing layers)
docker pull nginx:1.27
# You'll see: "Already exists" for layers shared with other images on your system

# Inspect full image metadata (size, env, exposed ports, labels)
docker image inspect python:3.12-slim

# See layers as SHA256 digests (the actual storage IDs)
docker image inspect python:3.12-slim --format '{{json .RootFS.Layers}}'`
        },
        {
          type: "heading",
          text: "What Makes Images Small or Large?",
          level: 2
        },
        {
          type: "text",
          text: "The size of a Docker image matters for pull time, startup time, storage cost, and attack surface. Here's how base images compare:"
        },
        {
          type: "comparison",
          headers: ["Base Image", "Size", "Package Manager", "Shell", "CVE Count", "Use Case"],
          rows: [
            ["ubuntu:24.04", "~80 MB", "apt", "bash", "~200", "General purpose, familiar"],
            ["debian:bookworm-slim", "~75 MB", "apt", "bash", "~100", "Good default for most apps"],
            ["python:3.12-slim", "~130 MB", "apt + pip", "bash", "~80", "Python apps (recommended)"],
            ["python:3.12-alpine", "~55 MB", "apk + pip", "ash", "~10", "Smallest, but musl libc can cause issues"],
            ["gcr.io/distroless/python3", "~50 MB", "none", "none", "~5", "Production (no shell attack surface)"],
            ["scratch", "0 MB", "none", "none", "0", "Static binaries only (Go, Rust)"],
          ]
        },
        {
          type: "callout",
          variant: "gotcha",
          title: "Alpine Is Not Always Smaller in Practice",
          text: "Alpine uses musl libc instead of glibc. Many Python packages include C extensions compiled for glibc. When you pip install on Alpine, Python has to compile from source (adding 100+ MB of build tools and time). Use python:3.12-slim (Debian) unless you have a specific reason for Alpine. The compiled .so files are larger on Alpine after compilation anyway."
        },
        {
          type: "callout",
          variant: "tip",
          title: "The Single Biggest Image Size Win",
          text: "Deleting files in a later RUN layer does NOT reduce image size — the original layer still contains the file. The solution is multi-stage builds: compile in a builder stage with all tools, then COPY only the output into a clean runtime stage. A Python app built this way can go from 800 MB to 120 MB."
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "dockerfile-mastery",
      title: "Dockerfile Mastery",
      readTime: "18 min",
      content: [
        {
          type: "text",
          text: "The Dockerfile is your recipe for building an image. Writing a <em>correct</em> Dockerfile is easy. Writing a <em>fast, small, and secure</em> one takes understanding. This lesson covers every instruction and the production patterns a senior engineer uses."
        },
        {
          type: "heading",
          text: "The Two Golden Rules",
          level: 2
        },
        {
          type: "list",
          items: [
            "<strong>Order instructions by change frequency — least changed at top, most changed at bottom.</strong> Cache breaks at the first changed layer and all layers below it are rebuilt.",
            "<strong>Use multi-stage builds for every compiled or dependency-heavy app.</strong> Never ship build tools in a production image."
          ]
        },
        {
          type: "heading",
          text: "Every Instruction Explained",
          level: 2
        },
        {
          type: "heading",
          text: "FROM — Choosing Your Base",
          level: 3
        },
        {
          type: "code",
          lang: "docker",
          code: `# Always pin to a specific version tag — never FROM python:latest
FROM python:3.12-slim-bookworm

# For maximum reproducibility: pin by digest (the SHA256 of the manifest)
# This guarantees you get EXACTLY this image even if the tag is re-pushed
FROM python:3.12-slim-bookworm@sha256:c4c8b3534fca21e0e9e3c2c1e4a0d...

# Multi-stage: name your stages with AS
FROM python:3.12-slim AS builder
FROM python:3.12-slim AS runtime

# Scratch: empty base for statically compiled binaries
FROM scratch`
        },
        {
          type: "heading",
          text: "RUN — Executing Commands",
          level: 3
        },
        {
          type: "text",
          text: "Every RUN creates a new layer. The key insight: <strong>group related commands into one RUN to keep layers lean</strong>. Also, always clean up in the same RUN instruction — cleanup in a later RUN doesn't shrink the earlier layer."
        },
        {
          type: "code",
          lang: "docker",
          code: `# BAD: 3 layers, and the cleanup in layer 3 doesn't remove layer 1's apt cache
RUN apt-get update
RUN apt-get install -y curl git
RUN rm -rf /var/lib/apt/lists/*

# GOOD: 1 layer, cache cleaned in the same RUN
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       curl \
       git \
       libpq5 \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# BEST (BuildKit): cache mount keeps apt cache between builds without adding to image
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install -y --no-install-recommends curl git libpq5

# Exec form vs Shell form:
# Shell form: RUN pip install flask      → runs as /bin/sh -c "pip install flask"
# Exec form:  RUN ["pip", "install", "flask"]  → runs directly, no shell`
        },
        {
          type: "callout",
          variant: "tip",
          title: "--no-install-recommends",
          text: "Always use --no-install-recommends with apt-get install. Without it, apt installs suggested and recommended packages you don't need. This can add 50-200 MB to your image."
        },
        {
          type: "heading",
          text: "COPY vs ADD",
          level: 3
        },
        {
          type: "text",
          text: "<strong>Always use COPY. Avoid ADD.</strong> ADD has two extra behaviors that are usually surprising: (1) it can fetch from a URL, and (2) it automatically extracts .tar.gz files. This implicit behavior is a footgun. Use COPY for copying local files, and RUN curl | tar for remote files."
        },
        {
          type: "code",
          lang: "docker",
          code: `# COPY: explicit, predictable, preferred
COPY requirements.txt .
COPY --chown=app:app src/ ./src/    # set ownership in one step (no extra layer)
COPY --chmod=755 entrypoint.sh .   # set permissions in one step

# ADD: avoid unless you specifically need auto-extraction
ADD myapp.tar.gz /app/              # extracts the tarball (ADD's "feature")
# Better: COPY myapp.tar.gz . && RUN tar xzf myapp.tar.gz && rm myapp.tar.gz

# COPY --from: copy from another stage (the key to multi-stage builds)
COPY --from=builder /app/dist ./dist
COPY --from=builder /usr/local/lib/python3.12 /usr/local/lib/python3.12`
        },
        {
          type: "heading",
          text: "ENV vs ARG",
          level: 3
        },
        {
          type: "text",
          text: "This is one of the most confused pairs in Dockerfile writing. The key difference:"
        },
        {
          type: "comparison",
          headers: ["", "ARG", "ENV"],
          rows: [
            ["Scope", "Build time only", "Build time + runtime"],
            ["Visible at runtime", "No", "Yes (in docker inspect)"],
            ["Override", "--build-arg NAME=val", "-e NAME=val at runtime"],
            ["In docker history", "YES (visible!)", "YES (visible!)"],
            ["Use for secrets?", "NEVER — it leaks", "NEVER — it leaks"],
            ["Good for", "Version numbers, build targets", "App config, Python flags"],
          ]
        },
        {
          type: "callout",
          variant: "warning",
          title: "ARG Values Are NOT Secret",
          text: "A common mistake: passing tokens via ARG thinking they're safe because they're 'only build-time'. Run docker history myimage and you'll see every ARG value in plain text. Use --mount=type=secret for build-time secrets (covered in the BuildKit lesson)."
        },
        {
          type: "code",
          lang: "docker",
          code: `# ARG: build-time variable, gone after build
ARG APP_VERSION=1.0.0
ARG TARGETARCH          # auto-set by buildx for multi-arch builds

# ENV: persists in the image and all containers
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

# Using ARG to set a default that ENV can reference:
ARG BUILD_DATE
ENV BUILD_DATE=\${BUILD_DATE}

# Build with: docker build --build-arg APP_VERSION=2.0.0 .`
        },
        {
          type: "heading",
          text: "CMD vs ENTRYPOINT",
          level: 3
        },
        {
          type: "text",
          text: "This confuses almost every Docker beginner. The short version: ENTRYPOINT is the executable, CMD is the default arguments. Together they form the full command: ENTRYPOINT + CMD."
        },
        {
          type: "diagram",
          code: `  DOCKERFILE:                          EFFECTIVE COMMAND:
  ENTRYPOINT ["uvicorn"]
  CMD ["main:app", "--port", "8000"]  →  uvicorn main:app --port 8000

  # Override CMD at runtime (common):
  docker run myimage main:app --port 9000  →  uvicorn main:app --port 9000

  # Override ENTRYPOINT (less common):
  docker run --entrypoint /bin/bash myimage  →  /bin/bash

  ─────────────────────────────────────────────────────────────
  EXEC FORM (array):  ENTRYPOINT ["uvicorn"]
    → Docker runs: uvicorn directly as PID 1
    → Signals (SIGTERM) go directly to uvicorn ✓
    → Graceful shutdown works ✓

  SHELL FORM (string):  ENTRYPOINT uvicorn
    → Docker runs: /bin/sh -c "uvicorn ..."
    → /bin/sh becomes PID 1, uvicorn is a child
    → SIGTERM goes to /bin/sh, NOT uvicorn ✗
    → Graceful shutdown BREAKS ✗
  ─────────────────────────────────────────────────────────────`
        },
        {
          type: "callout",
          variant: "gotcha",
          title: "Always Use Exec Form",
          text: "Shell form CMD/ENTRYPOINT is the #1 cause of broken graceful shutdown in production. When you run docker stop, Docker sends SIGTERM to PID 1. If PID 1 is /bin/sh (from shell form), the signal never reaches your app. Always write: CMD [\"uvicorn\", \"main:app\"] not CMD uvicorn main:app."
        },
        {
          type: "heading",
          text: "USER — Non-Root is Non-Negotiable",
          level: 3
        },
        {
          type: "text",
          text: "By default, containers run as root. If an attacker exploits your app and escapes the container, they'd be root on the host (or close to it). Always create and switch to a non-root user."
        },
        {
          type: "code",
          lang: "docker",
          code: `# Create a non-root user with a fixed numeric UID
# Using numeric UID (1001) instead of name avoids issues if /etc/passwd
# doesn't exist (e.g., in distroless images) or if names differ between stages
RUN groupadd --gid 1001 appuser \
    && useradd --uid 1001 --gid 1001 \
       --no-create-home \
       --shell /sbin/nologin \
       appuser

# Copy files with correct ownership in one step (no extra chmod layer)
COPY --chown=1001:1001 . /app

USER 1001

# Verify: docker run myimage id
# Should output: uid=1001(appuser) gid=1001(appuser)`
        },
        {
          type: "heading",
          text: "HEALTHCHECK — Production Readiness Signal",
          level: 3
        },
        {
          type: "text",
          text: "A HEALTHCHECK tells Docker (and Kubernetes) whether your container is actually ready to serve traffic — not just whether the process is running. Without it, a container that starts but immediately crashes its internal state will still receive traffic."
        },
        {
          type: "code",
          lang: "docker",
          code: `# Test that the app actually responds (not just that the process exists)
HEALTHCHECK \
    --interval=30s \      # check every 30 seconds
    --timeout=5s \        # fail if no response within 5 seconds
    --retries=3 \         # mark unhealthy after 3 consecutive failures
    --start-period=20s \  # grace period after start (don't fail during startup)
  CMD curl -f http://localhost:8000/health || exit 1

# For apps without curl, use wget:
HEALTHCHECK CMD wget -qO- http://localhost:8000/health || exit 1

# Or use a native Python check:
HEALTHCHECK CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

# Check health from outside:
docker inspect myapp --format '{{.State.Health.Status}}'
# → healthy / unhealthy / starting`
        },
        {
          type: "heading",
          text: "Multi-Stage Builds — The Professional Pattern",
          level: 2
        },
        {
          type: "text",
          text: "Multi-stage builds let you use a large image with all build tools to compile your app, then copy only the result into a clean minimal runtime image. This is how you get from 800 MB to 120 MB."
        },
        {
          type: "diagram",
          code: `  SINGLE STAGE:                        MULTI-STAGE:
  ┌─────────────────────┐             ┌─────────────────────┐
  │ python:3.12         │             │ python:3.12 AS builder│
  │ + gcc               │             │ + gcc                │
  │ + build-essential   │   ──────→   │ + build-essential    │
  │ + pip cache         │             │ + pip downloads      │
  │ + .git              │  (SHIPPED!) │                      │
  │ + test files        │             └──────────┬──────────┘
  │ + your app          │                        │ COPY --from=builder
  └─────────────────────┘             ┌──────────▼──────────┐
  Size: ~800 MB                       │ python:3.12-slim    │
                                      │   + your app only   │  ← ONLY THIS IS SHIPPED
                                      └─────────────────────┘
                                      Size: ~130 MB`
        },
        {
          type: "heading",
          text: ".dockerignore — Your First Performance Fix",
          level: 2
        },
        {
          type: "text",
          text: "When you run docker build, the entire directory (the build context) is sent to the Docker daemon before any instruction runs. A large .git history or node_modules can add 5–30 seconds to every build. The .dockerignore file is your filter."
        },
        {
          type: "callout",
          variant: "tip",
          title: "Always Create .dockerignore Before Writing Dockerfile",
          text: "Measure your build context: <code>docker build . 2>&1 | head -5</code> — it shows 'Sending build context to Docker daemon X.XX MB'. If it's more than a few MB, your .dockerignore needs work. The .git directory alone is often 200-500 MB in older repos."
        },
        {
          type: "heading",
          text: "Layer Cache Optimization — The Most Impactful Skill",
          level: 2
        },
        {
          type: "text",
          text: "Understanding Docker's cache invalidation rule is the single most impactful thing you can do for build speed. The rule is simple but must be deeply internalized:"
        },
        {
          type: "callout",
          variant: "info",
          title: "The Cache Rule",
          text: "For COPY/ADD instructions: the cache is invalidated if the file contents change. For RUN: the cache is invalidated if the instruction text changes OR if any previous layer's cache was invalidated. A cache miss on layer N means layers N+1 through the end ALL rebuild — even if their content didn't change."
        },
        {
          type: "diagram",
          code: `  Dockerfile order:         When you change main.py:

  FROM python:3.12-slim     ← CACHED ✓ (never changes)
  RUN apt-get install ...   ← CACHED ✓ (didn't change)
  COPY requirements.txt .   ← CACHED ✓ (didn't change)
  RUN pip install ...       ← CACHED ✓ (requirements.txt didn't change)
  COPY . .                  ← CACHE MISS ✗ (main.py changed)
  CMD [...]                 ← REBUILT (cache broken above)

  Total rebuild: ~1 second (just COPY . . and CMD)

  ─────────────────────────────────────────────────────────
  WRONG ORDER — changes to main.py bust the pip install:

  FROM python:3.12-slim
  COPY . .                  ← CACHE MISS on main.py change
  RUN pip install ...       ← REBUILT (1-5 minutes wasted!)
  CMD [...]`
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "running-containers",
      title: "Running and Managing Containers",
      readTime: "12 min",
      content: [
        {
          type: "text",
          text: "Building images is half the job. The other half is running containers correctly: handling signals for graceful shutdown, setting resource limits so one bad pod doesn't take down the host, and understanding the full container lifecycle."
        },
        {
          type: "heading",
          text: "Container Lifecycle",
          level: 2
        },
        {
          type: "diagram",
          code: `  docker create ─→  CREATED  ─→  docker start  ─→  RUNNING
                                                           │
                    PAUSED  ←─ docker pause                │
                    PAUSED  ─→ docker unpause ─────────────┘
                                                           │
                    STOPPED ←─────────────────────────────┘ (docker stop)
                       │                                     (process exits)
                       ▼
                    docker rm  ─→  (gone)

  docker run = docker create + docker start (most common workflow)

  Container exit codes:
    0   = clean exit (success)
    1   = application error
    126 = permission denied (can't execute)
    127 = command not found
    128+N = killed by signal N (e.g., 137 = killed by SIGKILL = OOM killed)`
        },
        {
          type: "heading",
          text: "The PID 1 Problem — Why Your App Doesn't Shut Down Gracefully",
          level: 2
        },
        {
          type: "text",
          text: "This is the most important thing to understand about running containers in production. When you run <code>docker stop mycontainer</code>, Docker sends <strong>SIGTERM</strong> to process ID 1 (PID 1) inside the container. If your app is PID 1 and handles SIGTERM, it can finish in-flight requests and shut down cleanly. If it doesn't, Docker waits 10 seconds (the default stop timeout) and then sends <strong>SIGKILL</strong>, immediately killing everything."
        },
        {
          type: "diagram",
          code: `  EXEC FORM (correct):                 SHELL FORM (broken):
  CMD ["uvicorn", "main:app"]          CMD uvicorn main:app

  Container process tree:              Container process tree:
  PID 1: uvicorn                       PID 1: /bin/sh -c "uvicorn..."
                                       PID 2:   uvicorn

  docker stop:                         docker stop:
  → SIGTERM sent to PID 1 (uvicorn)   → SIGTERM sent to PID 1 (/bin/sh)
  → uvicorn handles it                 → /bin/sh does NOT forward to children
  → finishes in-flight requests        → uvicorn never receives SIGTERM
  → exits cleanly ✓                   → 10s timeout → SIGKILL sent to all
                                       → requests are cut mid-flight ✗`
        },
        {
          type: "callout",
          variant: "tip",
          title: "Quick Fix: --init Flag",
          text: "Add --init to docker run (or init: true in Compose). This runs tini as PID 1, which correctly forwards signals to your app and reaps zombie processes. Better long-term: embed tini in your Dockerfile or use exec form."
        },
        {
          type: "heading",
          text: "Resource Limits — Protecting the Host",
          level: 2
        },
        {
          type: "text",
          text: "Without resource limits, a single runaway container can consume all host memory and bring down every other container on the machine. Always set limits in production."
        },
        {
          type: "code",
          lang: "bash",
          filename: "resource-limits.sh",
          code: `# Memory: hard limit — OOM kill if exceeded
docker run --memory 512m --memory-swap 512m myapp
# memory-swap = memory + swap. Setting equal to memory = no swap = faster OOM detection.
# Container killed with exit code 137 when it exceeds memory limit.

# CPU: fractional cores
docker run --cpus 1.5 myapp
# Container gets at most 1.5 CPU cores (time-shared across available CPUs)
# --cpu-shares is a RELATIVE weight (default 1024) — only matters under contention

# PIDs: prevent fork bombs
docker run --pids-limit 200 myapp
# Container can have at most 200 processes/threads total

# Check what a running container is actually using:
docker stats myapp --no-stream
# Output: CONTAINER, CPU%, MEM USAGE/LIMIT, MEM%, NET I/O, BLOCK I/O, PIDS`
        },
        {
          type: "callout",
          variant: "warning",
          title: "OOM Kill is Silent by Default",
          text: "When Docker OOM-kills a container, the exit code is 137, but the logs show nothing — the kernel just kills the process. Check with: <code>docker inspect myapp --format '{{.State.OOMKilled}}'</code>. If true, increase memory limit or fix the memory leak."
        },
        {
          type: "heading",
          text: "Restart Policies — Handling Crashes",
          level: 2
        },
        {
          type: "comparison",
          headers: ["Policy", "Behavior", "Use When"],
          rows: [
            ["no (default)", "Never restart", "Dev/testing, one-off tasks"],
            ["always", "Restart always, including on daemon start", "Services that must always run"],
            ["unless-stopped", "Restart always EXCEPT if manually stopped", "Production services (recommended)"],
            ["on-failure[:N]", "Restart only on non-zero exit, max N times", "Batch jobs with transient failures"],
          ]
        },
        {
          type: "callout",
          variant: "tip",
          title: "unless-stopped vs always",
          text: "Use unless-stopped for production services. The difference: if you run docker stop myapp (manually stopping for maintenance), unless-stopped respects that and won't restart. always would start it again on daemon restart. This matters during deployments."
        },
        {
          type: "heading",
          text: "Essential docker run Flags You'll Use Every Day",
          level: 2
        },
        {
          type: "code",
          lang: "bash",
          filename: "everyday-flags.sh",
          code: `# -d: run in background (detached)
docker run -d --name myapp nginx

# -it: interactive terminal (for debugging, not production)
docker run -it python:3.12 bash

# --rm: auto-remove container when it exits (great for one-off commands)
docker run --rm python:3.12 python -c "import sys; print(sys.version)"

# --name: give it a meaningful name (scripts should use names, not IDs)
docker run --name postgres-dev postgres:16

# -e / --env-file: environment variables
docker run -e DATABASE_URL=postgres://... myapp
docker run --env-file .env myapp     # load from file (safer for many vars)

# -p: publish ports   HOST:CONTAINER
docker run -p 127.0.0.1:8000:8000 myapp  # always bind to localhost, not 0.0.0.0

# -v: mount volumes or bind mounts
docker run -v mydata:/data myapp               # named volume
docker run -v $(pwd)/config:/app/config:ro myapp  # bind mount, read-only

# --log-driver / --log-opt: control where logs go
docker run --log-driver json-file --log-opt max-size=50m myapp

# Exec into a running container
docker exec -it myapp bash
docker exec myapp env     # dump env vars
docker exec myapp cat /proc/1/cmdline  # what is PID 1?`
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "networking",
      title: "Docker Networking — How Containers Talk",
      readTime: "12 min",
      content: [
        {
          type: "text",
          text: "Docker networking is one of those topics that looks complicated but has a simple mental model. The key insight: containers are like computers on a virtual network. Docker creates virtual switches (bridges), assigns IP addresses, and gives containers DNS names so they can find each other."
        },
        {
          type: "heading",
          text: "The Four Network Drivers",
          level: 2
        },
        {
          type: "comparison",
          headers: ["Driver", "What It Does", "When to Use"],
          rows: [
            ["bridge (default)", "Container on a virtual private network, NAT to host", "Most cases — isolated from other networks"],
            ["host", "Container shares host's network stack directly", "When you need max performance or need to bind to host ports"],
            ["none", "No network at all", "Batch jobs that don't need networking"],
            ["overlay", "Multi-host networking via VXLAN tunneling", "Docker Swarm, containers on different machines"],
            ["macvlan", "Container gets its own MAC address, looks like a physical device on the LAN", "Legacy apps that need to be on the physical network"],
          ]
        },
        {
          type: "heading",
          text: "The Default Bridge vs Custom Bridge",
          level: 2
        },
        {
          type: "text",
          text: "This is the most important networking concept to get right. The default bridge network (docker0) <strong>does not have automatic DNS</strong>. Containers can only communicate by IP address, which changes every restart. Custom bridge networks <strong>do</strong> have automatic DNS — containers can find each other by name."
        },
        {
          type: "diagram",
          code: `  DEFAULT BRIDGE (docker0) — AVOID:       CUSTOM BRIDGE — USE THIS:

  docker run --name api myapp             docker network create mynet
  docker run --name db postgres           docker run --name api --network mynet myapp
                                          docker run --name db  --network mynet postgres

  From api, reaching db:                  From api, reaching db:
  ✗ ping db     (name doesn't resolve)    ✓ ping db     (resolves via Docker DNS)
  ✗ curl db:5432                          ✓ curl db:5432
  ✓ curl 172.17.0.3:5432 (IP only)       ✓ curl postgres:5432 (also by image alias)
  (IP changes on restart!)

  The difference: Docker runs an embedded DNS server at 127.0.0.11
  inside each container on custom networks. It serves A records for
  every container name and network alias on that network.`
        },
        {
          type: "callout",
          variant: "warning",
          title: "docker run --link is Deprecated",
          text: "You may see old tutorials using --link to connect containers. This was the old DNS workaround for the default bridge. It's deprecated and removed in some contexts. Always use custom networks instead."
        },
        {
          type: "heading",
          text: "The 0.0.0.0 Port Binding Trap",
          level: 2
        },
        {
          type: "text",
          text: "This is a real security vulnerability that catches experienced engineers. When you run <code>docker run -p 5432:5432 postgres</code>, Docker binds to <strong>0.0.0.0:5432</strong> on the host — which means it's accessible from ANY network interface, including the public internet. Docker does this by modifying iptables rules directly, which can bypass your cloud provider's Security Groups/Firewall rules."
        },
        {
          type: "code",
          lang: "bash",
          filename: "port-binding-safety.sh",
          code: `# DANGEROUS: binds to 0.0.0.0 (all interfaces, publicly accessible!)
docker run -p 5432:5432 postgres

# Check: your PostgreSQL is reachable from the internet on port 5432
# even if your security group says it isn't

# SAFE: bind to localhost only
docker run -p 127.0.0.1:5432:5432 postgres

# Verify what's actually bound:
ss -tlnp | grep 5432
# Should show: 127.0.0.1:5432, not 0.0.0.0:5432

# Rule of thumb:
# Databases, caches, internal services → always 127.0.0.1:host:container
# Public-facing services (web server) → 0.0.0.0:80:80 is OK (with firewalls)
# Even better: put a reverse proxy (nginx/Caddy) in front and only publish 80/443`
        },
        {
          type: "heading",
          text: "How Compose Networking Works",
          level: 2
        },
        {
          type: "text",
          text: "Docker Compose automatically creates a custom bridge network for each project. All services in the same compose file can reach each other by their service name. You don't need to manually create networks in most cases."
        },
        {
          type: "code",
          lang: "yaml",
          filename: "docker-compose.yml",
          code: `services:
  api:
    image: myapp
    # Can reach 'db' by hostname 'db' and 'redis' by hostname 'redis'
    environment:
      DATABASE_URL: "postgresql://user:pass@db:5432/mydb"
      REDIS_URL: "redis://redis:6379"

  db:
    image: postgres:16
    # 'db' is the DNS name — matches the service key

  redis:
    image: redis:7
    # 'redis' is the DNS name

# Compose creates a network called 'projectname_default'
# All three services are on it automatically`
        },
        {
          type: "callout",
          variant: "tip",
          title: "Network Isolation Between Compose Files",
          text: "Two different Compose projects each get their own default network. Services in project A cannot reach services in project B by name. If you need cross-project communication, create an explicitly-named network and reference it as external: true in both compose files."
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "volumes-storage",
      title: "Volumes and Data Persistence",
      readTime: "8 min",
      content: [
        {
          type: "text",
          text: "Containers are ephemeral by design. When a container is removed, everything written to its filesystem is gone. For databases, uploads, logs, and any other persistent state, you need volumes."
        },
        {
          type: "heading",
          text: "Three Ways to Mount Storage",
          level: 2
        },
        {
          type: "diagram",
          code: `  HOST MACHINE                        CONTAINER

  /var/lib/docker/volumes/
  └── myvolume/                       /data
      └── _data/        ────────────→ (named volume: Docker manages location)
          └── ...

  /home/user/project/
  └── config/           ────────────→ /app/config
                                      (bind mount: you specify host path)

  RAM                                 /tmp
  (no disk)             ────────────→ (tmpfs: in-memory, lost on stop)

  Named Volume: persistent, portable, Docker-managed
  Bind Mount:   host path, for development, UID mismatch risk
  tmpfs:        in-memory, fast, secure for temp data, gone on restart`
        },
        {
          type: "comparison",
          headers: ["", "Named Volume", "Bind Mount", "tmpfs"],
          rows: [
            ["Persists after container removed", "Yes", "Yes (host file)", "No"],
            ["Managed by Docker", "Yes", "No", "N/A"],
            ["Works on any host", "Yes (portable)", "No (path specific)", "Yes"],
            ["Host UID mismatch risk", "Rare", "Common", "None"],
            ["Best for", "Databases, uploads", "Dev hot-reload", "/tmp, session data"],
          ]
        },
        {
          type: "heading",
          text: "Named Volumes — The Production Standard",
          level: 2
        },
        {
          type: "code",
          lang: "bash",
          filename: "named-volumes.sh",
          code: `# Create and use a named volume
docker volume create pgdata
docker run -v pgdata:/var/lib/postgresql/data postgres:16

# Docker stores it at: /var/lib/docker/volumes/pgdata/_data/
# You don't need to know the path — Docker manages it

# Volume commands
docker volume ls                    # list all volumes
docker volume inspect pgdata        # see mountpoint, driver, labels
docker volume rm pgdata             # remove (only if no container uses it)

# In Compose: declare volumes at the bottom
# services:
#   db:
#     volumes:
#       - pgdata:/var/lib/postgresql/data
# volumes:
#   pgdata:   ← creates 'projectname_pgdata' volume`
        },
        {
          type: "heading",
          text: "Bind Mounts — For Development",
          level: 2
        },
        {
          type: "text",
          text: "Bind mounts are ideal for development: mount your source code into the container and the app picks up changes without rebuilding. The critical trap: if the container runs as a different UID than your host user, file permission errors occur."
        },
        {
          type: "code",
          lang: "bash",
          filename: "bind-mounts.sh",
          code: `# Mount current directory as source (hot reload in dev)
docker run -v $(pwd):/app myapp-dev

# Read-only bind mount (config files)
docker run -v $(pwd)/nginx.conf:/etc/nginx/nginx.conf:ro nginx

# The UID mismatch problem:
# Host: your files owned by uid=1000 (your user)
# Container: app runs as uid=1001 (app user)
# Result: container can't write to mounted files

# Fix 1: Match UIDs — build image with same UID as your host user
# Fix 2: Use a named volume instead for directories the app writes to
# Fix 3: Run container as your UID: docker run --user $(id -u):$(id -g) ...

# Compose trick: keep the venv from the image, not from the host
services:
  api:
    volumes:
      - .:/app            # mount source
      - /app/.venv        # anonymous volume "shadows" the .venv in the mount
                          # so container uses the venv baked into the image`
        },
        {
          type: "heading",
          text: "tmpfs — Security + Performance for Ephemeral Data",
          level: 2
        },
        {
          type: "text",
          text: "tmpfs mounts are stored in host memory, never hit disk, and disappear when the container stops. Use them for /tmp, session files, and any scratch space that doesn't need to persist — especially when combined with --read-only."
        },
        {
          type: "code",
          lang: "bash",
          filename: "tmpfs.sh",
          code: `# Read-only container with tmpfs for writable paths
docker run \
  --read-only \                          # root filesystem is read-only
  --tmpfs /tmp:size=64m,mode=1777 \      # writable /tmp in RAM
  --tmpfs /run:size=16m \                # writable /run for pid files
  myapp

# Why this matters for security:
# --read-only: attacker can't write malware to disk
# --tmpfs: app still has scratch space, but it's RAM-only and size-limited
# Combined: dramatically limits what an attacker can do after exploiting your app`
        },
        {
          type: "heading",
          text: "Volume Backup Strategy",
          level: 2
        },
        {
          type: "text",
          text: "For production databases, never rely solely on volume backups. A raw volume copy captures files mid-write and may be inconsistent. Always use database-native backup tools (pg_dump, mysqldump). Volumes are for disaster recovery, not your primary backup."
        },
        {
          type: "callout",
          variant: "warning",
          title: "docker volume prune is Irreversible",
          text: "This command removes ALL volumes not attached to a running container. This includes volumes with important data (databases, uploads) if no container is currently using them. Never run this in production without knowing exactly what volumes exist and what they contain."
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "docker-compose",
      title: "Docker Compose — Multi-Service Orchestration",
      readTime: "14 min",
      content: [
        {
          type: "text",
          text: "Running a single container is simple. Running a web app that needs a database, a cache, a background worker, and a reverse proxy — in the right order, with the right configuration — is where Docker Compose shines. It's the standard tool for local development and small production deployments."
        },
        {
          type: "heading",
          text: "What Compose Actually Does",
          level: 2
        },
        {
          type: "text",
          text: "Compose reads a YAML file describing your services and translates it into docker run commands with all the right flags. Running <code>docker compose up</code> is equivalent to running 5-10 docker run commands in the right order. The real value is: it's reproducible, documented, and committed to version control."
        },
        {
          type: "heading",
          text: "The Compose File Structure",
          level: 2
        },
        {
          type: "code",
          lang: "yaml",
          filename: "docker-compose.yml",
          code: `name: myapp    # project name (prefixes all resources: myapp_api, myapp_db, etc.)

services:      # the containers
  api: ...
  db: ...

networks:      # virtual networks (auto-created if not specified)
  backend: ...

volumes:       # persistent storage
  pgdata: ...

secrets:       # secret files (mounted at /run/secrets/)
  db_password: ...`
        },
        {
          type: "heading",
          text: "depends_on — The Right Way to Order Startup",
          level: 2
        },
        {
          type: "text",
          text: "This is the most misunderstood feature in Compose. <code>depends_on</code> without a condition only waits for the container to <em>start</em>, not for the service to be <em>ready</em>. PostgreSQL takes 5–30 seconds to be ready to accept connections after its container starts. The correct pattern uses condition: service_healthy."
        },
        {
          type: "diagram",
          code: `  WITHOUT condition: service_healthy       WITH condition: service_healthy

  0s:  postgres container starts           0s:  postgres container starts
  0s:  api container starts                1s:  postgres: initializing...
  0s:  api tries to connect to postgres    10s: postgres: ready ✓ (HEALTHCHECK passes)
  0s:  ERROR: connection refused ✗         10s: api container starts (Compose waited)
       app crashes, restart loop           10s: api connects to postgres ✓

  The fix:                                HEALTHCHECK must be defined in either:
  depends_on:                             1. The service's image (postgres:16 has one)
    db:                                   2. The healthcheck: key in compose.yml
      condition: service_healthy`
        },
        {
          type: "code",
          lang: "yaml",
          filename: "healthcheck-compose.yml",
          code: `services:
  api:
    image: myapp
    depends_on:
      db:
        condition: service_healthy    # wait for db healthcheck to pass
      redis:
        condition: service_healthy

  db:
    image: postgres:16
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d mydb"]
      interval: 5s
      timeout: 5s
      retries: 5
      start_period: 10s    # give postgres time to initialize before checking

  redis:
    image: redis:7
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 3`
        },
        {
          type: "heading",
          text: "Environment Variables — Never Hardcode Credentials",
          level: 2
        },
        {
          type: "callout",
          variant: "warning",
          title: "Never Commit Credentials to Git",
          text: "Use a .env file for local development (add it to .gitignore). Use environment-specific secrets management (AWS Secrets Manager, GCP Secret Manager, K8s Secrets) for production. If you accidentally commit a password, treat it as compromised and rotate it immediately."
        },
        {
          type: "code",
          lang: "yaml",
          filename: "env-compose.yml",
          code: `# Method 1: .env file (auto-loaded from the same directory as compose.yml)
# .env:
#   POSTGRES_PASSWORD=mypassword
#   LOG_LEVEL=info

services:
  api:
    environment:
      # Reference .env file variables with \${VAR} syntax
      DATABASE_URL: "postgresql://app:\${POSTGRES_PASSWORD}@db:5432/mydb"
      LOG_LEVEL: "\${LOG_LEVEL:-info}"    # :-default uses 'info' if not set

    # Method 2: load all vars from a file
    env_file:
      - .env
      - .env.local     # overrides .env (for local customization)

  db:
    environment:
      # :? syntax causes compose to EXIT with error if var is not set
      POSTGRES_PASSWORD: "\${POSTGRES_PASSWORD:?Must set POSTGRES_PASSWORD}"
      POSTGRES_USER: app
      POSTGRES_DB: mydb`
        },
        {
          type: "heading",
          text: "Override Files — Dev vs Production",
          level: 2
        },
        {
          type: "text",
          text: "The override pattern keeps your base compose file clean and production-focused, while letting developers add their own local customizations without modifying the shared file. Docker Compose automatically merges <code>docker-compose.override.yml</code> on top of <code>docker-compose.yml</code>."
        },
        {
          type: "code",
          lang: "bash",
          filename: "override-workflow.sh",
          code: `# Development (auto-merges docker-compose.override.yml):
docker compose up

# Equivalent to:
docker compose -f docker-compose.yml -f docker-compose.override.yml up

# Production (use explicit files — no override):
docker compose -f docker-compose.yml -f docker-compose.prod.yml up

# CI (run tests):
docker compose -f docker-compose.yml -f docker-compose.test.yml run --rm tests`
        },
        {
          type: "heading",
          text: "Useful Compose Commands",
          level: 2
        },
        {
          type: "code",
          lang: "bash",
          filename: "compose-commands.sh",
          code: `docker compose up -d              # start all services in background
docker compose up --build -d      # rebuild images and start
docker compose down               # stop and remove containers (keeps volumes)
docker compose down -v            # stop, remove containers AND volumes ← careful!

docker compose ps                 # status of all services
docker compose logs -f            # stream all logs
docker compose logs -f api        # stream logs for one service
docker compose exec api bash      # exec into a running service

docker compose restart api        # restart one service (without rebuilding)
docker compose pull               # pull latest images (for updating production)

docker compose run --rm api pytest  # run a one-off command in a service container
# This starts the 'api' service (and its dependencies), runs pytest, then removes it

docker compose config             # validate and print the merged compose file
# Great for debugging override merges`
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "security",
      title: "Container Security — Defense in Depth",
      readTime: "12 min",
      content: [
        {
          type: "text",
          text: "Security isn't one thing you add at the end — it's a set of layers you apply throughout your container setup. Each layer reduces blast radius: if one is bypassed, the others still limit the damage. An attacker who gets Remote Code Execution (RCE) in your app should find themselves in a very restricted environment."
        },
        {
          type: "heading",
          text: "Layer 1: Non-Root User",
          level: 2
        },
        {
          type: "text",
          text: "By default, Docker containers run as root. 'But it's root inside the container, not root on the host' — this is <strong>mostly</strong> true, with an important caveat: if an attacker escapes the container (via a kernel vulnerability), they'd be root on the host. Running as non-root adds a layer even before any container escape."
        },
        {
          type: "callout",
          variant: "info",
          title: "Container Root vs Host Root",
          text: "When user namespace remapping is NOT enabled (the default), root in a container IS root on the host for many operations — including creating setuid files and manipulating cgroups. User namespaces map container root (uid 0) to an unprivileged host UID, but this adds complexity. The simple approach: just don't run as root."
        },
        {
          type: "heading",
          text: "Layer 2: Linux Capabilities",
          level: 2
        },
        {
          type: "text",
          text: "Linux capabilities divide root privileges into ~40 distinct units. Instead of all-or-nothing root, a process can have exactly the capabilities it needs. Docker grants a subset by default. You should drop all and add back only what you need."
        },
        {
          type: "comparison",
          headers: ["Capability", "What It Allows", "Typical Need"],
          rows: [
            ["NET_BIND_SERVICE", "Bind to ports < 1024", "Web servers on port 80/443"],
            ["CHOWN", "Change file ownership", "Almost never — set in Dockerfile"],
            ["DAC_OVERRIDE", "Bypass file permission checks", "Almost never"],
            ["NET_ADMIN", "Configure network interfaces, iptables", "Network tools only"],
            ["SYS_PTRACE", "Use ptrace (attach debugger)", "Debug containers only"],
            ["SYS_ADMIN", "Many privileged operations", "Almost never — huge attack surface"],
          ]
        },
        {
          type: "code",
          lang: "bash",
          filename: "capabilities.sh",
          code: `# Drop ALL capabilities, then add back only what you need
docker run \
  --cap-drop ALL \
  --cap-add NET_BIND_SERVICE \   # if your app binds to port 80
  myapp

# Test: if your app breaks after --cap-drop ALL, find what it needs:
docker run --cap-drop ALL myapp 2>&1 | grep "operation not permitted"
# → "epoll_create: operation not permitted" might mean you need SYS_RESOURCE
# → "bind: operation not permitted" means you need NET_BIND_SERVICE

# Check what capabilities a running container has:
docker inspect myapp --format '{{json .HostConfig.CapAdd}}'
docker inspect myapp --format '{{json .HostConfig.CapDrop}}'`
        },
        {
          type: "heading",
          text: "Layer 3: Read-Only Filesystem",
          level: 2
        },
        {
          type: "text",
          text: "If an attacker gets code execution, they'll try to: (1) write malicious files, (2) modify existing files, (3) install tools. A read-only root filesystem blocks all three. Pair it with tmpfs for paths your app legitimately writes to."
        },
        {
          type: "code",
          lang: "bash",
          filename: "readonly-fs.sh",
          code: `# Run with read-only root filesystem
docker run \
  --read-only \
  --tmpfs /tmp:size=64m,mode=1777 \    # app can write to /tmp
  --tmpfs /run:size=16m \              # app can write to /run
  myapp

# Figure out what your app writes to:
# 1. Run it normally and strace it:
docker run myapp strace -e trace=file uvicorn main:app 2>&1 | grep openat
# Look for O_WRONLY and O_RDWR flags — those are writes

# 2. Or run with --read-only and see what fails:
docker run --read-only myapp 2>&1 | grep "Read-only file system"
# Then add --tmpfs for each path that shows up`
        },
        {
          type: "heading",
          text: "Layer 4: No New Privileges",
          level: 2
        },
        {
          type: "text",
          text: "<code>--security-opt no-new-privileges</code> is a single kernel flag that prevents any process in the container from gaining additional privileges via setuid binaries (like sudo) or file capabilities. It's low-cost and high-value — always include it."
        },
        {
          type: "heading",
          text: "Layer 5: Image Vulnerability Scanning",
          level: 2
        },
        {
          type: "text",
          text: "Every library in your image is a potential attack vector. CVE (Common Vulnerabilities and Exposures) databases track known vulnerabilities. Image scanners check your image layers against these databases."
        },
        {
          type: "callout",
          variant: "info",
          title: "Understanding CVE Severity",
          text: "<strong>CRITICAL:</strong> Remote code execution, no authentication needed — fix immediately. <strong>HIGH:</strong> Significant impact, fix in your next release. <strong>MEDIUM:</strong> Some impact, fix when practical. <strong>LOW:</strong> Minimal impact, track but don't panic. For most teams: fail CI on CRITICAL, track HIGH."
        },
        {
          type: "code",
          lang: "bash",
          filename: "scanning.sh",
          code: `# Scan your image
trivy image myapp:latest

# Practical approach in CI:
# 1. Fail on CRITICAL only (LOW/MEDIUM creates too much noise)
trivy image --exit-code 1 --severity CRITICAL myapp:latest

# 2. Find the source of CVEs:
trivy image --severity CRITICAL myapp:latest
# Look at the Package column — is it in python, libssl, or your base OS?

# 3. Fix strategy:
# - Base OS CVE (libssl, libc): upgrade base image FROM python:3.12-slim → check if newer digest fixes it
# - Python package CVE: upgrade the package in requirements.txt
# - Unused package CVE: remove the package if you don't need it
# - Unfixable CVE: use --ignore-unfixed to suppress if no patch exists

# Compare base images:
trivy image --format json python:3.12 | jq '[.Results[].Vulnerabilities // [] | .[]] | length'
trivy image --format json python:3.12-slim | jq '[.Results[].Vulnerabilities // [] | .[]] | length'
# Slim typically has 60-80% fewer CVEs`
        },
        {
          type: "heading",
          text: "Secrets Management — What NOT to Do",
          level: 2
        },
        {
          type: "callout",
          variant: "gotcha",
          title: "Three Ways Engineers Accidentally Leak Secrets",
          text: "(1) <code>ENV SECRET=mypassword</code> in Dockerfile → secret in every layer, visible via docker inspect and docker history. (2) <code>ARG TOKEN=mytoken</code> → visible in docker history even though not at runtime. (3) <code>COPY .env /app/.env</code> → your .env file is baked into every layer forever, even if you delete it in a later RUN."
        },
        {
          type: "comparison",
          headers: ["Method", "Secure?", "Use Case"],
          rows: [
            ["ENV in Dockerfile", "No — in image forever", "Never for secrets"],
            ["ARG in Dockerfile", "No — in history", "Never for secrets"],
            ["-e at runtime", "Better — not in image", "Dev only (visible in docker inspect)"],
            ["--env-file .env", "Better — not in image", "Dev/staging"],
            ["--mount=type=secret", "Yes — never in image", "Build-time secrets (tokens, keys)"],
            ["Docker secrets (/run/secrets/)", "Yes — mounted as file", "Runtime secrets in Compose/Swarm"],
            ["Cloud secret manager", "Best", "Production (AWS Secrets, GCP Secret Manager)"],
          ]
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "buildkit",
      title: "BuildKit — Fast, Secure Builds",
      readTime: "10 min",
      content: [
        {
          type: "text",
          text: "BuildKit is the next-generation build engine that replaced the classic builder in Docker 23+. It's enabled by default now, but understanding its features lets you write Dockerfiles that build in seconds instead of minutes."
        },
        {
          type: "heading",
          text: "What BuildKit Changes",
          level: 2
        },
        {
          type: "comparison",
          headers: ["Feature", "Classic Builder", "BuildKit"],
          rows: [
            ["Parallel stage builds", "No (sequential)", "Yes (parallel)"],
            ["Cache mounts", "No", "Yes (--mount=type=cache)"],
            ["Secret mounts", "No", "Yes (--mount=type=secret)"],
            ["SSH agent forwarding", "No", "Yes (--mount=type=ssh)"],
            ["Build output", "One image", "Any target (image, directory, tarball)"],
            ["Provenance attestation", "No", "Yes (SLSA level 1/2/3)"],
          ]
        },
        {
          type: "heading",
          text: "Cache Mounts — The Biggest CI Speed Win",
          level: 2
        },
        {
          type: "text",
          text: "Without cache mounts: every build downloads all packages from the internet, even for a 1-line change. With cache mounts: packages are cached on the build host between builds. A Python app that takes 3 minutes to install deps takes 5 seconds on a warm cache."
        },
        {
          type: "diagram",
          code: `  WITHOUT cache mount:                 WITH --mount=type=cache:

  Build 1: pip install (45 packages)    Build 1: pip install (45 packages)
           downloads from PyPI: 90s              downloads from PyPI: 90s
           ← no cache saved                      ← cache saved to host dir

  Build 2: change main.py              Build 2: change main.py
           pip install again: 90s               pip sees cached packages
           (SAME packages, re-downloaded)        pip install from cache: 5s

  Build 3: add one dependency          Build 3: add one dependency
           pip install all: 90s                 pip installs 1 new package: 8s
                                                (43 existing packages from cache)

  10 builds with source changes:
  Classic: 15 minutes of wasted time   BuildKit: 1.5 minutes total`
        },
        {
          type: "callout",
          variant: "info",
          title: "Cache Mounts Don't Add to Image Size",
          text: "This is the key insight. The cache directory exists on the build host between builds but is NEVER included in any layer of the resulting image. It's purely a build-time optimization."
        },
        {
          type: "heading",
          text: "Secret Mounts — Secrets That Can't Leak",
          level: 2
        },
        {
          type: "text",
          text: "The classic problem: you need a token to install from a private package registry during build. But if you put it in ARG or ENV, it's baked into the image history forever. Secret mounts solve this — the secret is available during the RUN step but never written to any layer."
        },
        {
          type: "diagram",
          code: `  ARG approach (LEAKS):               Secret mount approach (SAFE):

  ARG PYPI_TOKEN                       # syntax=docker/dockerfile:1
  RUN pip install \                    RUN --mount=type=secret,id=pypi_token \
    --extra-index-url \                    pip install \
    https://$PYPI_TOKEN@pypi.co/         --extra-index-url \
    my-private-lib                         https://$(cat /run/secrets/pypi_token)@pypi.co/ \
                                           my-private-lib

  docker history myimage:              docker history myimage:
  → ARG PYPI_TOKEN=s3cr3t ← EXPOSED  → RUN --mount=type=secret,id=pypi_token...
                                       (no value stored anywhere in image)

  Build command:
  docker buildx build --secret id=pypi_token,src=~/.tokens/pypi .
  # or from env var:
  docker buildx build --secret id=pypi_token,env=PYPI_TOKEN .`
        },
        {
          type: "heading",
          text: "Multi-Architecture Builds — Why This Matters",
          level: 2
        },
        {
          type: "text",
          text: "The cloud is increasingly multi-architecture. AWS Graviton (arm64) instances are 20-40% cheaper than equivalent x86 instances. Apple Silicon Macs use arm64. If you only build for amd64, you're locked out of these cost savings. BuildKit's buildx makes multi-arch builds a single command."
        },
        {
          type: "code",
          lang: "bash",
          filename: "multiarch.sh",
          code: `# Build for both amd64 (Intel/AMD cloud) and arm64 (Graviton/Apple Silicon)
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --tag myapp:latest \
  --push \
  .

# The result in the registry: one tag, two manifests
# When someone pulls 'myapp:latest', Docker automatically picks the right arch
# amd64 machine → gets amd64 image
# arm64 machine → gets arm64 image

# Run your CI on arm64 (GitHub Actions arm64 runners available):
# jobs:
#   build:
#     runs-on: ubuntu-24.04-arm   # GitHub's arm64 runner
# This builds arm64 natively (10x faster than QEMU emulation)`
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "debugging",
      title: "Debugging — The Systematic Playbook",
      readTime: "10 min",
      content: [
        {
          type: "text",
          text: "When something goes wrong in production, you need to diagnose quickly and confidently. This lesson gives you a systematic approach to any container issue."
        },
        {
          type: "heading",
          text: "The 5-Step Debug Checklist",
          level: 2
        },
        {
          type: "list",
          items: [
            "<strong>Step 1: Get the exit code</strong> — <code>docker inspect CONTAINER --format '{{.State.ExitCode}}'</code>. 0=clean exit, 1=app error, 137=OOM kill, 127=command not found.",
            "<strong>Step 2: Read the logs</strong> — <code>docker logs CONTAINER --tail 100</code>. The error is almost always here.",
            "<strong>Step 3: Check resource usage</strong> — <code>docker stats CONTAINER --no-stream</code>. Is it OOM-killed? CPU-throttled?",
            "<strong>Step 4: Inspect configuration</strong> — <code>docker inspect CONTAINER</code>. Check: env vars, volume mounts, network, restart policy.",
            "<strong>Step 5: Get a shell</strong> — <code>docker exec -it CONTAINER /bin/bash</code>. If the container is running, poke around. If it crashed, see below."
          ]
        },
        {
          type: "heading",
          text: "The Crashed Container Problem",
          level: 2
        },
        {
          type: "text",
          text: "The hardest case: the container exits immediately and you can't exec into it. Here's the systematic approach:"
        },
        {
          type: "code",
          lang: "bash",
          filename: "debug-crashed.sh",
          code: `# 1. Get exit code (137 = OOM, 1 = app error, 127 = command not found)
docker inspect myapp --format '{{.State.ExitCode}} OOM:{{.State.OOMKilled}}'

# 2. Read logs from the last failed run
docker logs myapp --tail 50

# 3. Override the entrypoint to get a shell
docker run -it --rm \
  --entrypoint /bin/sh \       # bypass your app's entrypoint
  --env-file .env \            # use same env vars
  myimage:latest               # same image

# Now you're inside with the same environment:
$ uvicorn app.main:app         # manually run your start command
# → ImportError: No module named 'app.config'  ← found the bug!
$ python -c "from app.config import settings"  # test imports
$ env                          # check env vars are set correctly
$ ls /app                      # check files are in place

# 4. For distroless/scratch images with no shell:
# Use nsenter to enter namespaces from the host
CONTAINER_PID=$(docker inspect myapp --format '{{.State.Pid}}')
sudo nsenter --target $CONTAINER_PID --mount --net ip addr`
        },
        {
          type: "heading",
          text: "Reading docker stats",
          level: 2
        },
        {
          type: "text",
          text: "docker stats is often misread. Here's what each column actually means:"
        },
        {
          type: "diagram",
          code: `docker stats --no-stream

NAME     CPU %   MEM USAGE / LIMIT    MEM %   NET I/O          BLOCK I/O    PIDS
api      45.2%   423MiB / 512MiB      82.6%   2.3GB / 1.2GB    0B / 0B      12

CPU %:   Percentage of ONE core. 100% = fully using one core.
         200% on a 4-core host = using 2 cores fully.
         If you set --cpus 0.5 and you see 50%, it's CPU-throttled.

MEM:     Current usage vs limit. If usage ≈ limit, it will be OOM-killed soon.
         Note: Python/JVM don't release memory to OS after freeing it.
         Steady growth = memory leak. Stable with spikes = normal GC behavior.

NET I/O: Total bytes sent/received since container started.
         2.3 GB received = large amount of data coming in (check if expected).

PIDS:    Number of processes/threads. Growing over time = thread leak.
         Hitting your --pids-limit? New fork() calls will fail → app errors.`
        },
        {
          type: "heading",
          text: "docker events — Your Audit Trail",
          level: 2
        },
        {
          type: "code",
          lang: "bash",
          filename: "docker-events.sh",
          code: `# See everything that happened in the last hour
docker events --since 1h

# Filter by container name:
docker events --since 24h --filter container=myapp

# Typical output for a container crash:
# 2024-01-15T03:42:11Z container die myapp (exitCode=137)   ← OOM killed at 3am
# 2024-01-15T03:42:12Z container start myapp                ← restart policy kicked in

# Watch for OOM kills in real time:
docker events --filter event=oom

# Watch for any container death:
docker events --filter event=die`
        },
        {
          type: "heading",
          text: "Disk Usage and Cleanup",
          level: 2
        },
        {
          type: "code",
          lang: "bash",
          filename: "disk-management.sh",
          code: `# See what's using disk
docker system df
# TYPE            TOTAL     ACTIVE    SIZE      RECLAIMABLE
# Images          23        10        14.2GB    8.1GB (57%)
# Containers      5         3         120MB     20MB (16%)
# Local Volumes   8         6         5.3GB     200MB (3%)
# Build Cache     -         -         2.1GB     2.1GB

docker system df -v    # per-image breakdown — find the big ones

# Safe cleanup (only removes unused/stopped resources):
docker container prune     # remove stopped containers
docker image prune         # remove dangling images (untagged)
docker network prune       # remove unused networks

# More aggressive (removes unused images even if tagged):
docker image prune -a --filter "until=48h"   # unused in last 48h

# Nuclear option (use only in dev, NEVER in production):
docker system prune -a --volumes
# Removes: stopped containers, all unused images, unused networks, all volumes`
        },
        {
          type: "callout",
          variant: "gotcha",
          title: "Build Cache Is Often the Biggest Disk User",
          text: "docker system df often shows the build cache as the top disk consumer, especially in CI. Run docker buildx prune --filter until=24h to clear build caches older than 24 hours. In CI, this is safe — the registry cache handles cross-build caching."
        }
      ]
    }

  ]; // end m.lessons
})();
