// Patches the Docker module (m1) with comprehensive production-grade content.
// Loaded after curriculum.js — runs immediately to enrich the module before app.js uses it.
(function patchDockerModule() {
  const m = CURRICULUM.phases[0].modules[0];

  // ── Enhanced topics ──────────────────────────────────────────────────────
  m.topics = [
    // Architecture & internals
    "Docker architecture: dockerd daemon, REST API, Docker CLI — how they communicate",
    "Linux primitives: namespaces (pid, net, mnt, uts, ipc, user) that isolate containers",
    "cgroups v2: resource limits (CPU, memory, PIDs, block I/O) enforced by the kernel",
    "Storage driver: OverlayFS — union mounts, lowerdir/upperdir, copy-on-write layers",
    "Container runtimes: runc (OCI), containerd, CRI-O — how they relate to Docker",
    // Setup
    "Docker Engine vs Docker Desktop: Engine is daemon-only (Linux); Desktop bundles daemon + CLI + GUI + K8s (macOS/Windows)",
    "daemon.json: log-driver, storage-driver, live-restore, metrics-addr, registry-mirrors",
    "Post-install: adding user to 'docker' group to run without sudo; socket permissions",
    "Docker contexts: switch between local, remote SSH, and Kubernetes endpoints",
    // Dockerfile instructions
    "FROM: base image selection — scratch, distroless, alpine, slim, full — trade-offs",
    "RUN: exec form vs shell form; apt-get best practices (no cache, single layer)",
    "COPY vs ADD: always prefer COPY; ADD is for remote URLs and auto-extracting tarballs",
    "COPY --chown=user:group: set file ownership in one layer instead of a separate RUN chown",
    "COPY --link (BuildKit): detached layer for faster cache-aware rebuilds",
    "ARG vs ENV: ARG is build-time only (still visible in docker history!); ENV persists at runtime",
    "CMD vs ENTRYPOINT: exec form vs shell form; how they combine; override behavior",
    "WORKDIR: always absolute; creates directories automatically; affects COPY/RUN/CMD",
    "USER: switch to non-root; uid:gid numeric form avoids name-resolution issues",
    "HEALTHCHECK: --interval, --timeout, --retries, --start-period; exit 0=healthy, 1=unhealthy",
    "LABEL: OCI image spec labels (org.opencontainers.image.*); structured metadata",
    "STOPSIGNAL: override SIGTERM for apps that handle a different signal (e.g., SIGQUIT for nginx)",
    "ONBUILD: deferred instructions for base images; rarely useful, often confusing",
    ".dockerignore: glob syntax, negation (!), reduces build context sent to daemon",
    "Layer caching rules: each instruction is a layer; cache breaks on first change",
    "Multi-stage builds: AS named stages; --target flag; COPY --from=stage",
    // BuildKit
    "BuildKit: enable via DOCKER_BUILDKIT=1 or buildx; parallel stages, better caching",
    "--mount=type=cache: persistent cache dir between builds (pip, apt, cargo, npm)",
    "--mount=type=secret: inject secret at build time without leaving it in any layer",
    "--mount=type=ssh: forward SSH agent for private git repos or package registries",
    "--mount=type=bind: bind-mount source for read-only access during RUN",
    "Heredoc RUN syntax (Docker 1.23+): RUN <<EOF for multi-command blocks",
    "docker buildx bake: HCL/JSON build matrix config for multiple images",
    // Running containers
    "Container lifecycle: created → running → paused → stopped → removed",
    "docker run key flags: -d, -it, --rm, --name, -p, -v, -e, --env-file, --network, --restart",
    "Restart policies: no, always, unless-stopped, on-failure[:max-retries]",
    "Resource limits: --memory, --memory-swap, --cpus, --cpu-shares, --pids-limit",
    "The PID 1 problem: shell form CMD wraps in /bin/sh, orphans signals; use exec form or tini",
    "Signal handling: SIGTERM sent on docker stop; --stop-timeout sets grace period before SIGKILL",
    "tini / --init: lightweight init to reap zombie processes and forward signals correctly",
    "User namespace remapping: --userns-remap for rootless-like isolation at daemon level",
    // Security
    "Capabilities: --cap-drop ALL then --cap-add only what you need (principle of least privilege)",
    "--read-only filesystem: pair with --tmpfs for writable runtime paths",
    "--security-opt no-new-privileges: prevent setuid binaries from escalating privileges",
    "Seccomp profiles: default profile blocks 44 syscalls; custom profiles for tighter lockdown",
    "AppArmor profiles: Docker ships a default; custom profiles via --security-opt apparmor",
    "Rootless Docker: run dockerd as non-root; limitations: no host ports <1024, some volumes",
    // Networking
    "Network drivers: bridge (default), host, none, overlay (Swarm), macvlan, ipvlan",
    "Custom bridge network: automatic DNS by container name; isolated from default bridge",
    "Host networking: container shares host network stack; useful for performance-sensitive apps",
    "Overlay network: Swarm multi-host networking; VXLAN tunneling between nodes",
    "Port publishing: -p host:container; bind to 127.0.0.1 to avoid exposing to public interface",
    "Network aliases: --network-alias; multiple names for same container",
    // Volumes
    "Volume types: named volumes (managed by Docker), bind mounts (host path), tmpfs (in-memory)",
    "Volume lifecycle: independent of containers; persist until explicitly deleted",
    "Bind mount vs volume: bind mounts for dev (hot reload); named volumes for production data",
    "Volume backup: tar via docker run with --volumes-from or explicit -v mount",
    "Volume plugins: NFS, AWS EFS, GCS FUSE — pluggable via --volume-driver",
    // Compose
    "Compose file structure: services, networks, volumes, configs, secrets (version field deprecated)",
    "depends_on with condition: service_healthy waits for HEALTHCHECK to pass",
    "Environment variables: environment (inline), env_file, .env for compose variable interpolation",
    "Compose profiles: --profile flag; mark services with profiles: [dev] to exclude by default",
    "Compose override: docker-compose.override.yml auto-merged; docker-compose -f base.yml -f dev.yml",
    "Compose secrets: file-based (for local) and external (for Swarm); mounted at /run/secrets/",
    "Compose watch (v2.22+): sync+restart or rebuild on file change for dev inner loop",
    // Registry & images
    "Image naming: registry/repository:tag; default registry is docker.io; :latest is not special",
    "Image tagging strategy: semantic version + git SHA; never rely on :latest in production",
    "Multi-arch builds: docker buildx + QEMU emulation; --platform linux/amd64,linux/arm64",
    "Manifest lists (image index): one tag pointing to arch-specific images",
    "docker buildx imagetools: inspect and manipulate manifest lists",
    "ECR authentication: aws ecr get-login-password | docker login; token expires in 12h",
    "GCR/GAR authentication: gcloud auth configure-docker or Workload Identity + credential helper",
    "Harbor: self-hosted registry with vulnerability scanning, replication, RBAC, Helm chart repo",
    "Image scanning: Trivy, Docker Scout, Snyk — integrate in CI before push",
    "Image signing: cosign (Sigstore), Docker Content Trust (Notary v1), SLSA provenance",
    // Debugging
    "docker logs: --follow, --tail N, --since 1h, --timestamps",
    "docker exec: -it for interactive; run one-off diagnostic commands",
    "docker inspect: full JSON state — network, mounts, env, labels, restart policy",
    "docker stats: live CPU%, MEM usage/limit, NET I/O, BLOCK I/O",
    "docker events: audit trail — container start/stop/die, image pull, network connect",
    "Debugging crashed containers: override --entrypoint to /bin/sh; run with --rm -it",
    "nsenter: enter container namespaces from host — use when exec is not available",
    "docker system df: disk usage by images/containers/volumes/build cache",
    "docker system prune: clean unused resources; -a removes all unused images",
    "Ephemeral debug containers: docker run --pid=container:TARGET --net=container:TARGET nicolaka/netshoot",
    // CI/CD
    "BuildKit cache in CI: --cache-from type=registry and --cache-to type=registry,mode=max",
    "GitHub Actions cache: type=gha uses Actions cache API (no registry needed)",
    "DinD (Docker-in-Docker): privileged pod running its own daemon; security risk",
    "DooD (Docker-outside-of-Docker): mount /var/run/docker.sock; host daemon, container socket",
    "Kaniko: builds images from Dockerfile inside a container without Docker daemon; safe for K8s CI",
    "docker/build-push-action: GitHub Actions action for BuildKit builds with cache and push",
    "docker/metadata-action: generate tags and labels from git refs and events",
  ];

  // ── Enhanced labs ────────────────────────────────────────────────────────
  m.labs = [
    {
      title: "Understand Image Layers with dive",
      desc: "Pull a public image (python:3.12). Run `docker history` to see layers. Install 'dive' (wagoodman/dive) and explore the layer breakdown. Find wasted space. Then build a multi-stage version and compare sizes.",
      difficulty: "beginner",
    },
    {
      title: "Containerize a FastAPI App from Scratch",
      desc: "Write a Dockerfile for a FastAPI app: multi-stage build (builder + runtime), non-root user, .dockerignore, HEALTHCHECK. Target image size < 150 MB. Verify with `docker inspect` that USER is non-root.",
      difficulty: "beginner",
    },
    {
      title: "BuildKit Cache Mount Benchmark",
      desc: "Benchmark pip install with and without --mount=type=cache. Build a Python image cold (no cache) vs warm. Measure time difference. Add a new dependency and rebuild — the cache mount should only re-install the new package.",
      difficulty: "intermediate",
    },
    {
      title: "Multi-Service Compose Stack",
      desc: "Build a FastAPI + PostgreSQL + Redis Compose stack. Add health checks to all services. Use depends_on: condition: service_healthy. Create a .env file for credentials. Add a profiles: [debug] pgAdmin service.",
      difficulty: "intermediate",
    },
    {
      title: "Security Hardening Audit",
      desc: "Take your FastAPI container and apply: --cap-drop ALL, --read-only, --tmpfs /tmp, --security-opt no-new-privileges, non-root user. Scan with Trivy. Fix all CRITICAL and HIGH CVEs by changing base images. Compare before/after.",
      difficulty: "intermediate",
    },
    {
      title: "Debug a Crashed Container",
      desc: "Intentionally break a container (bad env var, missing file). Debug it using: docker logs, docker inspect, override --entrypoint to /bin/sh. Then use nsenter (PID from docker inspect) to poke around the namespace from the host.",
      difficulty: "intermediate",
    },
    {
      title: "Multi-Architecture Build",
      desc: "Set up docker buildx with a new builder using QEMU. Build your FastAPI image for linux/amd64 AND linux/arm64 and push to Docker Hub. Verify both architectures with `docker buildx imagetools inspect`. Run on both platforms if available.",
      difficulty: "advanced",
    },
    {
      title: "Secrets in Build without Leaking",
      desc: "Build an image that installs from a private PyPI server. Use --mount=type=secret to inject the token. Verify the token does NOT appear in `docker history` or any layer. Compare with a naive ARG approach (which DOES leak).",
      difficulty: "advanced",
    },
    {
      title: "GitHub Actions CI Pipeline",
      desc: "Write a GitHub Actions workflow: lint → test → docker/build-push-action with BuildKit gha cache → push to GHCR (GitHub Container Registry). Add Trivy scanning and fail the build on CRITICAL CVEs. Use docker/metadata-action for tags.",
      difficulty: "advanced",
    },
    {
      title: "Compose Watch for Dev Inner Loop",
      desc: "Configure 'develop: watch:' in compose.yml for a FastAPI app. Use 'sync' for Python files and 'rebuild' for Dockerfile changes. Measure how fast code changes appear vs a full docker-compose up --build cycle.",
      difficulty: "intermediate",
    },
  ];

  // ── Enhanced interview questions ─────────────────────────────────────────
  m.interviewQuestions = [
    "Explain how Docker containers differ from VMs at the kernel level. What Linux primitives make isolation possible?",
    "Walk me through what happens when you run `docker build`. What is the build context and why does its size matter?",
    "How does OverlayFS work? What are lowerdir, upperdir, and workdir? What happens when a container writes a file?",
    "What is the PID 1 problem in containers? How do you solve it, and why does it matter for graceful shutdown?",
    "What is the difference between CMD and ENTRYPOINT? Give an example of when you'd use both together.",
    "An ARG value is 'not stored in the final image' — but can you still extract it? How would you pass a build-time secret safely?",
    "Why should you always use exec form (JSON array) for CMD/ENTRYPOINT? What breaks with shell form?",
    "A Docker image grew from 200 MB to 800 MB after a developer added a large dataset. They later deleted it in a subsequent RUN. Is the image actually smaller? Why or why not? How do you fix it?",
    "Explain multi-stage builds. How do you use them to produce a minimal runtime image for a Python app?",
    "What does --mount=type=cache do in BuildKit? How does it differ from a regular COPY/RUN cache layer?",
    "You need to install packages from a private registry that requires an API token. How do you pass the token securely during build?",
    "What is the difference between a named volume and a bind mount? When would you use each in production?",
    "Explain the depends_on condition: service_healthy option in Docker Compose. How does it interact with HEALTHCHECK?",
    "A container is running in production and consuming 100% CPU. Walk me through how you'd diagnose it using only Docker CLI tools.",
    "The container died immediately and you can't exec into it. How do you debug it?",
    "What is the difference between --cap-drop ALL and --security-opt no-new-privileges? Are they redundant?",
    "Explain Docker's default seccomp profile. What does it block? How would you customize it for a specific workload?",
    "What is rootless Docker? What are its security advantages and practical limitations?",
    "You have an image that works on your amd64 laptop but fails on an arm64 EC2 Graviton instance. How do you build for both architectures from a single CI pipeline?",
    "What is the difference between DinD, DooD, and Kaniko for running Docker builds inside Kubernetes? Which would you choose for a production CI pipeline and why?",
    "How does BuildKit's registry cache (type=registry,mode=max) differ from the default inline cache? When would you use each?",
    "A container's /tmp directory fills up because it's using the overlay filesystem. How do you fix this without changing the application?",
    "Explain live-restore in daemon.json. Why would you enable it in production?",
    "What is the difference between docker stop and docker kill? What happens during the grace period?",
    "How would you implement image signing in a CI/CD pipeline using cosign? What does it protect against?",
  ];

  // ── Code examples ─────────────────────────────────────────────────────────
  m.codeExamples = [
    // ──────────────────────────────────────────────────────────────────────
    {
      id: "install",
      title: "Installation & Daemon Setup",
      icon: "⚙️",
      items: [
        {
          title: "Install Docker Desktop on macOS",
          desc: "Docker Desktop is the recommended way to run Docker on macOS — it bundles the daemon, CLI, BuildKit, Compose, and an optional local Kubernetes cluster.",
          lang: "bash",
          filename: "install-docker-macos.sh",
          code: `# Option 1 — Homebrew (recommended for developers)
brew install --cask docker

# Launch Docker Desktop (first run opens the GUI for license acceptance)
open -a Docker

# Wait for the daemon to be ready, then verify
docker run --rm hello-world

# ── What Homebrew installs ─────────────────────────────────────────────
# /Applications/Docker.app          ← GUI + daemon (runs a Linux VM via Apple Hypervisor)
# /usr/local/bin/docker             ← CLI (symlinked from the app bundle)
# /usr/local/bin/docker-compose     ← Compose v2 plugin wrapper
# /usr/local/bin/docker-buildx      ← BuildKit CLI plugin

# ── Optional: install CLI tools separately (without Desktop GUI) ───────
# Docker Desktop is required for the daemon on macOS — there is no native
# Docker Engine for macOS. The alternatives below still require a daemon:

# colima: lightweight VM-based Docker daemon (good for CI or headless use)
brew install colima docker docker-buildx docker-compose
colima start --cpu 4 --memory 8 --disk 60
# colima start --arch aarch64 --vm-type vz  ← Apple Silicon optimised

# orbstack: fast, low-overhead Docker + Linux VMs (commercial, free tier)
brew install --cask orbstack

# ── Docker Desktop settings to tweak ──────────────────────────────────
# Settings → Resources → CPUs / Memory   ← increase from defaults (2 CPU / 2 GB)
# Settings → Features in development → Use Rosetta for x86_64 emulation  ← Apple Silicon
# Settings → Kubernetes → Enable Kubernetes  ← single-node k8s for local dev`,
          notes: [
            "Docker Desktop on macOS runs containers inside a lightweight Linux VM (Apple Hypervisor Framework on Apple Silicon, HyperKit on Intel).",
            "colima is a popular headless alternative — useful in CI or when you want to avoid the Docker Desktop GUI and license requirements.",
            "On Apple Silicon (M1/M2/M3) always pull linux/arm64 images when available; use --platform linux/arm64 explicitly to avoid silent Rosetta emulation.",
            "Docker Desktop 4.x ships Compose V2 as 'docker compose' (space, not hyphen) — the old standalone 'docker-compose' binary is deprecated.",
          ],
        },
        {
          title: "Install Docker Engine on Linux (Ubuntu/Debian)",
          desc: "Install the official Docker Engine on Ubuntu or Debian — never use the distro's outdated package.",
          lang: "bash",
          filename: "install-docker-linux.sh",
          code: `# Remove old versions
sudo apt-get remove -y docker docker-engine docker.io containerd runc

# Set up the official Docker repo
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \\
  | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \\
  https://download.docker.com/linux/ubuntu \\
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \\
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y \\
  docker-ce docker-ce-cli containerd.io \\
  docker-buildx-plugin docker-compose-plugin

# Post-install: run Docker without sudo
sudo groupadd docker 2>/dev/null || true
sudo usermod -aG docker $USER
newgrp docker

# Verify
docker run --rm hello-world`,
          notes: [
            "Use docker-compose-plugin (the 'docker compose' command), not the standalone docker-compose binary.",
            "newgrp docker applies the group change in the current shell without a full logout/login.",
            "For RHEL/Fedora/Amazon Linux replace 'apt-get' with 'dnf' and use the centos repo URL.",
            "On Linux, Docker Engine runs natively — no VM layer, unlike macOS or Windows.",
          ],
        },
        {
          title: "/etc/docker/daemon.json — Production Configuration",
          desc: "Tune the Docker daemon for production: log rotation, metrics, live-restore.",
          lang: "json",
          filename: "/etc/docker/daemon.json",
          code: `{
  "storage-driver": "overlay2",
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "50m",
    "max-file": "5",
    "compress": "true"
  },
  "live-restore": true,
  "userland-proxy": false,
  "metrics-addr": "127.0.0.1:9323",
  "experimental": false,
  "max-concurrent-uploads": 5,
  "max-concurrent-downloads": 10,
  "registry-mirrors": [],
  "insecure-registries": [],
  "default-ulimits": {
    "nofile": { "Name": "nofile", "Hard": 64000, "Soft": 64000 }
  },
  "features": { "buildkit": true }
}`,
          notes: [
            "live-restore: true keeps containers running if the daemon crashes or is upgraded.",
            "userland-proxy: false uses iptables DNAT instead of a Go proxy for port forwarding — more performant.",
            "json-file with max-size prevents containers from filling the disk with logs.",
            "Apply changes: sudo systemctl restart docker (brief service disruption if live-restore is true).",
            "metrics-addr exposes Prometheus metrics at /metrics for cAdvisor / node_exporter integration.",
          ],
        },
        {
          title: "Rootless Docker Setup",
          desc: "Run the Docker daemon as a non-root user — best security posture for shared hosts.",
          lang: "bash",
          filename: "setup-rootless.sh",
          code: `# Prerequisites
sudo apt-get install -y uidmap dbus-user-session

# Install rootless Docker for current user
dockerd-rootless-setuptool.sh install

# Set env in your shell profile
echo 'export PATH=$HOME/bin:$PATH' >> ~/.bashrc
echo 'export DOCKER_HOST=unix:///run/user/$(id -u)/docker.sock' >> ~/.bashrc
source ~/.bashrc

# Start the rootless daemon via systemd user service
systemctl --user start docker
systemctl --user enable docker
sudo loginctl enable-linger $USER

# Verify
docker info | grep "rootless"
# Should output: rootless: true

# Limitation: ports < 1024 require net.ipv4.ip_unprivileged_port_start=0
sudo sysctl -w net.ipv4.ip_unprivileged_port_start=0`,
          notes: [
            "Rootless Docker maps container root → your UID using /etc/subuid and /etc/subgid.",
            "Containers running as 'root' inside are actually your UID on the host — escapes are contained.",
            "Limitation: overlayfs may require newuidmap/newgidmap; performance is slightly lower.",
            "Preferred over --userns-remap because it applies to the entire daemon.",
          ],
        },
      ],
    },

    // ──────────────────────────────────────────────────────────────────────
    {
      id: "dockerfile-ref",
      title: "Dockerfile — Full Instructions Reference",
      icon: "📄",
      items: [
        {
          title: "All Dockerfile Instructions — Annotated Reference",
          desc: "Every instruction you'll ever need, with production notes on each.",
          lang: "docker",
          filename: "Dockerfile.reference",
          code: `# syntax=docker/dockerfile:1
# ↑ Pin BuildKit frontend version — enables all modern features

# ── FROM ──────────────────────────────────────────────────────────────
# Use a specific digest for reproducible builds (not just a tag)
FROM python:3.12-slim-bookworm AS base
# FROM python:3.12-slim-bookworm@sha256:abc123...  ← pinned by digest

# ── LABEL ─────────────────────────────────────────────────────────────
# OCI standard labels for image metadata
LABEL org.opencontainers.image.title="My App" \\
      org.opencontainers.image.version="1.0.0" \\
      org.opencontainers.image.source="https://github.com/org/repo"

# ── ARG ───────────────────────────────────────────────────────────────
# Build-time variable; does NOT persist in final image
# WARNING: still visible in docker history — do NOT use for secrets
ARG BUILD_VERSION=dev
ARG TARGETARCH   # automatically set by buildx for multi-arch builds

# ── ENV ───────────────────────────────────────────────────────────────
# Runtime environment variable; persists in image and containers
ENV PYTHONUNBUFFERED=1 \\
    PYTHONDONTWRITEBYTECODE=1 \\
    PIP_NO_CACHE_DIR=1 \\
    PIP_DISABLE_PIP_VERSION_CHECK=1

# ── WORKDIR ───────────────────────────────────────────────────────────
# Always use absolute paths; creates the directory automatically
WORKDIR /app

# ── COPY ──────────────────────────────────────────────────────────────
# Prefer COPY over ADD (ADD has surprising behavior with URLs/tarballs)
# Copy requirements FIRST to maximize cache hits
COPY --chown=app:app requirements.txt .

# ── RUN ───────────────────────────────────────────────────────────────
# Exec form (array): no shell, signals work correctly
# Shell form: wraps in /bin/sh -c, breaks signal propagation
# Combine related commands into one RUN to minimize layers
RUN apt-get update \\
    && apt-get install -y --no-install-recommends \\
       libpq5 curl \\
    && rm -rf /var/lib/apt/lists/* \\
    && pip install --no-cache-dir -r requirements.txt

# ── USER ──────────────────────────────────────────────────────────────
# Create a non-root user; use numeric UID to avoid name resolution issues
RUN groupadd --gid 1001 app \\
    && useradd --uid 1001 --gid app --shell /bin/sh --create-home app

# ── COPY remaining source ─────────────────────────────────────────────
COPY --chown=app:app . .

USER 1001

# ── EXPOSE ────────────────────────────────────────────────────────────
# Documentation only — does NOT actually publish the port
EXPOSE 8000

# ── HEALTHCHECK ───────────────────────────────────────────────────────
# --start-period: grace time before health checks matter
# exit 0 = healthy, exit 1 = unhealthy
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=20s \\
  CMD curl -f http://localhost:8000/health || exit 1

# ── STOPSIGNAL ────────────────────────────────────────────────────────
# Override the signal sent on docker stop (default SIGTERM)
# Nginx uses SIGQUIT for graceful shutdown
STOPSIGNAL SIGTERM

# ── VOLUME ────────────────────────────────────────────────────────────
# Declare a mount point — creates anonymous volume if no -v given
# Generally avoid in production; use explicit named volumes instead
# VOLUME ["/data"]

# ── ENTRYPOINT + CMD ──────────────────────────────────────────────────
# ENTRYPOINT: the executable (cannot be overridden without --entrypoint)
# CMD: default arguments to ENTRYPOINT (easily overridden)
# Together: ENTRYPOINT + CMD = full command
ENTRYPOINT ["uvicorn"]
CMD ["main:app", "--host", "0.0.0.0", "--port", "8000"]`,
          notes: [
            "The '# syntax=docker/dockerfile:1' directive is crucial — it unlocks all BuildKit features like --mount.",
            "Shell form CMD ('CMD uvicorn main:app') wraps in /bin/sh -c, making /bin/sh PID 1. SIGTERM goes to sh, not uvicorn. Always use exec form.",
            "ARG before FROM is available only to FROM. ARG after FROM has a different scope. Redeclare if you need it post-FROM.",
            "ENV variables set during build persist in running containers and are visible via docker inspect. Never put secrets here.",
          ],
        },
        {
          title: ".dockerignore — Comprehensive Example",
          desc: "Exclude everything that shouldn't be in the build context or image.",
          lang: "bash",
          filename: ".dockerignore",
          code: `# Version control
.git
.gitignore
.gitattributes

# Python
__pycache__
*.pyc
*.pyo
*.pyd
.Python
*.egg-info
dist/
build/
.eggs/
.venv
venv/
env/
pip-wheel-metadata/
.mypy_cache/
.pytest_cache/
.ruff_cache/
htmlcov/
.coverage
coverage.xml

# Node
node_modules/
npm-debug.log*
yarn-error.log*
.npm/

# IDE & OS
.idea/
.vscode/
*.swp
*.swo
.DS_Store
Thumbs.db
*.iml

# Docker
Dockerfile*
docker-compose*.yml
.dockerignore

# Secrets & config
.env
.env.*
*.pem
*.key
*.cert
*.crt
secrets/
credentials/

# Docs & tests (exclude from runtime image)
docs/
tests/
*.md
*.txt
!requirements.txt
!requirements-*.txt

# CI
.github/
.gitlab-ci.yml
.circleci/
Makefile`,
          notes: [
            "The build context is the entire directory sent to the daemon before any instruction runs. A large .git history adds seconds to every build.",
            "Note the '!requirements.txt' exception — the '!' prefix negates a previous exclusion pattern.",
            "Excluding tests/ and docs/ keeps the runtime image lean AND speeds up builds by reducing context size.",
            "'.venv' is critical — if accidentally copied it can be gigabytes and break the image (wrong platform binaries).",
          ],
        },
        {
          title: "Layer Caching — Wrong vs Right Order",
          desc: "Cache busting is the #1 cause of slow builds. Order instructions by change frequency.",
          lang: "docker",
          filename: "Dockerfile.cache-comparison",
          code: `# ── BAD: copies all source first, busts cache on every change ─────────
FROM python:3.12-slim AS bad
WORKDIR /app
COPY . .                          # ← EVERY file change invalidates ALL subsequent layers
RUN pip install -r requirements.txt  # ← reinstalls on every source change: SLOW


# ── GOOD: copy requirements first, source second ──────────────────────
FROM python:3.12-slim AS good
WORKDIR /app
COPY requirements.txt .           # ← only changes when deps change
RUN pip install -r requirements.txt  # ← cached unless requirements.txt changes
COPY . .                          # ← source changes don't affect pip layer above
CMD ["python", "main.py"]


# ── BEST: BuildKit cache mount (stays cached between builds) ──────────
# syntax=docker/dockerfile:1
FROM python:3.12-slim AS best
WORKDIR /app
COPY requirements.txt .
# --mount=type=cache persists the pip cache dir on the build host
# Even a cold build on a new machine benefits from the warmed cache
RUN --mount=type=cache,target=/root/.cache/pip \\
    pip install -r requirements.txt
COPY . .
CMD ["python", "main.py"]


# ── Rules for cache ordering ──────────────────────────────────────────
# 1. Install system deps (changes rarely)
# 2. Copy dependency manifest (requirements.txt, package.json)
# 3. Install dependencies (pip install, npm install)
# 4. Copy application source (changes frequently)
# 5. Build/compile source (if needed)
# 6. Set runtime config (CMD, ENV, ENTRYPOINT)`,
          notes: [
            "The Docker build cache is keyed on: instruction + all previous layers + COPY checksum (for COPY).",
            "A cache miss on layer N invalidates ALL layers N+1 onwards — even if those files didn't change.",
            "With BuildKit cache mounts, the pip cache directory survives between builds on the same host, reducing installs from 60s → 5s on a warm cache.",
          ],
        },
      ],
    },

    // ──────────────────────────────────────────────────────────────────────
    {
      id: "prod-dockerfiles",
      title: "Production-Grade Dockerfiles",
      icon: "🏗️",
      items: [
        {
          title: "FastAPI — Production Multi-Stage Build",
          desc: "Builder compiles deps + copies source. Runtime stage is minimal, non-root, with health check.",
          lang: "docker",
          filename: "Dockerfile",
          code: `# syntax=docker/dockerfile:1
# ── Stage 1: dependency builder ───────────────────────────────────────
FROM python:3.12-slim-bookworm AS builder

WORKDIR /app

# Install build tools (only in builder stage — not in final image)
RUN apt-get update && apt-get install -y --no-install-recommends \\
    build-essential libpq-dev curl \\
    && rm -rf /var/lib/apt/lists/*

# Install uv for fast dependency resolution (10-100x faster than pip)
RUN pip install --no-cache-dir uv

# Install dependencies into /app/.venv using uv
COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/uv \\
    uv venv .venv && \\
    uv pip install --python .venv -r requirements.txt

# ── Stage 2: runtime ──────────────────────────────────────────────────
FROM python:3.12-slim-bookworm AS runtime

# Runtime system deps only (libpq for psycopg, not libpq-dev)
RUN apt-get update && apt-get install -y --no-install-recommends \\
    libpq5 curl \\
    && rm -rf /var/lib/apt/lists/* \\
    && apt-get clean

# Create non-root user with fixed UID/GID for predictable permissions
RUN groupadd --gid 1001 appuser \\
    && useradd --uid 1001 --gid 1001 --no-create-home appuser

WORKDIR /app

# Copy only the virtualenv and source — not build tools
COPY --from=builder --chown=1001:1001 /app/.venv ./.venv
COPY --chown=1001:1001 . .

# Activate the venv by prepending to PATH
ENV PATH="/app/.venv/bin:$PATH" \\
    PYTHONUNBUFFERED=1 \\
    PYTHONDONTWRITEBYTECODE=1

USER 1001

EXPOSE 8000

# Health check hits your /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --retries=3 --start-period=15s \\
  CMD curl -f http://localhost:8000/health || exit 1

# Exec form — signals go directly to uvicorn, not via shell
ENTRYPOINT ["uvicorn", "app.main:app"]
CMD ["--host", "0.0.0.0", "--port", "8000", "--workers", "1"]`,
          notes: [
            "Two-stage: builder has libpq-dev + build-essential (adds ~200 MB); runtime has only libpq5 (~5 MB). Final image ~120 MB vs ~400 MB single-stage.",
            "uv is a Rust-based pip replacement — 10-100x faster for cold installs. Compatible with requirements.txt.",
            "--mount=type=cache on /root/.cache/uv persists the download cache between builds without adding it to the image.",
            "Pinning UID/GID to 1001 means volume mounts with matching host UID don't have permission issues.",
            "ENTRYPOINT + CMD split lets you override just the port: docker run myapp --port 9000",
          ],
        },
        {
          title: "Go — Scratch Image (Zero OS)",
          desc: "Compile a Go binary statically, ship it with zero base OS. Final image is just the binary.",
          lang: "docker",
          filename: "Dockerfile.go",
          code: `# syntax=docker/dockerfile:1
FROM golang:1.23-alpine AS builder

WORKDIR /app

# Download modules first (cached separately from source)
COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod \\
    go mod download

COPY . .

# Build a fully static binary
# CGO_ENABLED=0: no C bindings (no glibc dependency)
# -trimpath: remove local path info from binary (reproducibility)
# -ldflags: strip debug symbols (-s) and DWARF info (-w) → smaller binary
RUN --mount=type=cache,target=/go/pkg/mod \\
    --mount=type=cache,target=/root/.cache/go-build \\
    CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \\
    go build -trimpath \\
    -ldflags="-s -w -X main.version=$(git describe --tags --always)" \\
    -o /bin/server ./cmd/server

# ── Runtime: scratch (literally empty filesystem) ─────────────────────
FROM scratch AS runtime

# Copy CA certificates for HTTPS (scratch has none)
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

# Copy the static binary
COPY --from=builder /bin/server /server

# Scratch has no shell, no exec, no tools — that's the point
EXPOSE 8080

ENTRYPOINT ["/server"]`,
          notes: [
            "Final image is ~8 MB vs ~300 MB for a normal Go image. Attack surface: exactly one binary.",
            "CGO_ENABLED=0 is critical — with CGO the binary links against glibc which scratch doesn't have.",
            "Go module cache mount: first build downloads modules; subsequent builds reuse them from cache even for clean builds.",
            "Scratch has no /tmp, no passwd, no resolv.conf — your app must handle all of this itself.",
            "For apps needing DNS or TLS: copy ca-certificates.crt and /etc/resolv.conf from builder stage.",
          ],
        },
        {
          title: "Python — Distroless Runtime",
          desc: "Google's distroless images contain only runtime libs, no shell or package manager.",
          lang: "docker",
          filename: "Dockerfile.distroless",
          code: `# syntax=docker/dockerfile:1
FROM python:3.12-slim AS builder

WORKDIR /app

RUN pip install --no-cache-dir uv
COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/uv \\
    uv venv /opt/venv && \\
    uv pip install --python /opt/venv -r requirements.txt

COPY . .

# ── Distroless Python runtime ─────────────────────────────────────────
# gcr.io/distroless/python3: Python runtime only, no shell, no apt, no bash
# Available tags: latest, 3.11, 3.12, debug (has busybox shell for debugging)
FROM gcr.io/distroless/python3-debian12 AS runtime

# Non-root user is the default in distroless (65532:65532 = nonroot)
WORKDIR /app

COPY --from=builder /opt/venv /opt/venv
COPY --from=builder /app .

ENV PATH="/opt/venv/bin:$PATH" \\
    PYTHONUNBUFFERED=1

# No shell in distroless — must use exec form
ENTRYPOINT ["/opt/venv/bin/uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]`,
          notes: [
            "Distroless has no shell, no apt, no curl. You cannot 'docker exec -it ... /bin/bash'. Use the ':debug' tag variant during development.",
            "Attack surface is dramatically reduced — no shell means no remote code execution via shell injection.",
            "Vulnerability scanners will report far fewer CVEs because most come from unused system packages.",
            "For debugging production issues, temporarily swap to the ':debug' tag which adds busybox.",
          ],
        },
      ],
    },

    // ──────────────────────────────────────────────────────────────────────
    {
      id: "buildkit",
      title: "BuildKit Advanced Features",
      icon: "⚡",
      items: [
        {
          title: "Cache Mounts — Speed Up Package Installs",
          desc: "Persistent cache between builds on the same host. The single biggest build speedup.",
          lang: "docker",
          filename: "Dockerfile.cache-mounts",
          code: `# syntax=docker/dockerfile:1
FROM python:3.12-slim AS python-example

WORKDIR /app
COPY requirements.txt .

# --mount=type=cache,target=PATH
# - The cache dir persists on the build HOST between builds
# - It does NOT appear in the final image layers
# - id= lets multiple Dockerfiles share the same cache
# - sharing=locked prevents concurrent build corruption
RUN --mount=type=cache,target=/root/.cache/pip,id=pip-cache,sharing=locked \\
    pip install -r requirements.txt

COPY . .

# ── apt cache mount ───────────────────────────────────────────────────
FROM ubuntu:24.04 AS apt-example

RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \\
    --mount=type=cache,target=/var/lib/apt,sharing=locked \\
    apt-get update && apt-get install -y --no-install-recommends \\
    build-essential curl git \\
    && rm -rf /var/lib/apt/lists/*
# Note: apt lists are NOT cached (they expire), only the .deb packages are

# ── npm cache mount ───────────────────────────────────────────────────
FROM node:22-alpine AS node-example

WORKDIR /app
COPY package.json package-lock.json ./

RUN --mount=type=cache,target=/root/.npm \\
    npm ci --prefer-offline

COPY . .
RUN npm run build

# ── Cargo (Rust) cache mount ──────────────────────────────────────────
FROM rust:1.82-alpine AS rust-example

WORKDIR /app
COPY Cargo.toml Cargo.lock ./
# Create dummy src to allow dependency compilation
RUN mkdir src && echo "fn main() {}" > src/main.rs

RUN --mount=type=cache,target=/usr/local/cargo/registry \\
    --mount=type=cache,target=/app/target \\
    cargo build --release
# Only recompiles YOUR code on source changes, not all dependencies`,
          notes: [
            "Without cache mounts: every build re-downloads all packages from the internet. With: only new/changed packages are fetched.",
            "The cache is keyed by 'id='. Default id is the target path. Set explicit ids when sharing cache across Dockerfiles.",
            "'sharing=locked' prevents two concurrent builds from corrupting a shared cache. Use 'sharing=shared' for read-heavy caches.",
            "Cache mounts are host-local. In CI, use a registry cache (--cache-to type=registry) to share between agents.",
          ],
        },
        {
          title: "Secret Mounts — Build Without Leaking Secrets",
          desc: "Inject tokens, credentials, or SSH keys at build time — never in any image layer.",
          lang: "docker",
          filename: "Dockerfile.secrets",
          code: `# syntax=docker/dockerfile:1
FROM python:3.12-slim AS app

WORKDIR /app

# ── Method: --mount=type=secret ───────────────────────────────────────
# The secret is ONLY available during this RUN instruction.
# It does NOT appear in docker history, image layers, or docker inspect.
# Secret is mounted at /run/secrets/<id> by default.

COPY requirements.txt requirements-private.txt ./

# Install from private PyPI that requires a token
RUN --mount=type=secret,id=pypi_token \\
    pip install --no-cache-dir \\
      --extra-index-url https://$(cat /run/secrets/pypi_token)@private.pypi.company.com/simple/ \\
      -r requirements-private.txt

# Install public packages normally
RUN --mount=type=cache,target=/root/.cache/pip \\
    pip install -r requirements.txt

COPY . .
CMD ["python", "main.py"]`,
          notes: [
            "Bad: ARG TOKEN=secret → RUN pip install ... $TOKEN  ← TOKEN visible in 'docker history'.",
            "Build command: docker buildx build --secret id=pypi_token,src=~/.pypi-token .",
            "Or from env var: docker buildx build --secret id=pypi_token,env=PYPI_TOKEN .",
            "In CI (GitHub Actions): echo $PYPI_TOKEN > /tmp/pypi-token && docker buildx build --secret id=pypi_token,src=/tmp/pypi-token .",
            "You can mount multiple secrets: --mount=type=secret,id=secret1 --mount=type=secret,id=secret2.",
          ],
        },
        {
          title: "SSH Agent Forwarding — Private Git Repos",
          desc: "Install packages from private GitHub repos without embedding SSH keys in the image.",
          lang: "docker",
          filename: "Dockerfile.ssh",
          code: `# syntax=docker/dockerfile:1
FROM python:3.12-slim AS app

# Install git and openssh-client for cloning (builder only)
RUN apt-get update && apt-get install -y --no-install-recommends git openssh-client \\
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .

# --mount=type=ssh forwards the host's SSH agent into the RUN step
# The key NEVER enters the image — only the agent socket is forwarded
RUN --mount=type=ssh \\
    mkdir -p -m 0600 ~/.ssh && \\
    ssh-keyscan github.com >> ~/.ssh/known_hosts && \\
    pip install --no-cache-dir \\
      git+ssh://git@github.com/your-org/private-lib.git@v1.2.3 \\
      -r requirements.txt

COPY . .
CMD ["python", "main.py"]`,
          notes: [
            "Build command: eval $(ssh-agent) && ssh-add ~/.ssh/id_ed25519 && docker buildx build --ssh default .",
            "Or pass a specific key: docker buildx build --ssh default=~/.ssh/deploy_key .",
            "The SSH agent socket is forwarded into the RUN step. No key material is ever written to a layer.",
            "ssh-keyscan populates known_hosts so git doesn't prompt for host verification.",
            "In CI: use your CI provider's SSH key secret and run ssh-agent before the build step.",
          ],
        },
      ],
    },

    // ──────────────────────────────────────────────────────────────────────
    {
      id: "running",
      title: "Running Containers",
      icon: "▶️",
      items: [
        {
          title: "docker run — Complete Flags Reference",
          desc: "Every important flag with explanations. Copy-paste as needed.",
          lang: "bash",
          filename: "docker-run-reference.sh",
          code: `# ── Lifecycle ──────────────────────────────────────────────────────────
docker run \\
  -d \\                          # detached: run in background
  --name myapp \\                # container name (use in scripts instead of ID)
  --rm \\                        # auto-remove on exit (for one-off tasks)
  --restart unless-stopped \\   # restart policy: no | always | unless-stopped | on-failure:5

# ── Port mapping ───────────────────────────────────────────────────────
  -p 127.0.0.1:8000:8000 \\     # bind to localhost ONLY (not public interface!)
  -p 8080:80 \\                  # host-port:container-port
  --expose 9000 \\               # document a port without publishing it

# ── Environment ────────────────────────────────────────────────────────
  -e DATABASE_URL=postgres://... \\
  --env-file .env \\             # load from file (safer than -e for many vars)

# ── Volumes ────────────────────────────────────────────────────────────
  -v myvolume:/data \\           # named volume (persists between container restarts)
  -v $(pwd)/config:/app/config:ro \\ # bind mount, read-only
  --tmpfs /tmp:size=100m,mode=1777 \\  # in-memory filesystem for /tmp

# ── Networking ─────────────────────────────────────────────────────────
  --network mynet \\             # attach to custom bridge network
  --network-alias myalias \\    # additional DNS name
  --hostname mycontainer \\     # set container hostname
  --dns 8.8.8.8 \\              # custom DNS server

# ── Resource limits ────────────────────────────────────────────────────
  --memory 512m \\               # hard memory limit (OOM kill if exceeded)
  --memory-reservation 256m \\  # soft limit (Docker scheduler hint)
  --cpus 1.5 \\                  # CPU cores (fractional OK)
  --cpu-shares 512 \\            # relative weight (default 1024)
  --pids-limit 200 \\            # max PIDs (prevents fork bombs)
  --blkio-weight 500 \\          # I/O weight (100-1000, default 500)

# ── Security ───────────────────────────────────────────────────────────
  --user 1001:1001 \\            # run as specific UID:GID
  --cap-drop ALL \\              # drop ALL Linux capabilities
  --cap-add NET_BIND_SERVICE \\  # add back only what you need
  --read-only \\                 # read-only root filesystem
  --security-opt no-new-privileges \\  # block privilege escalation
  --security-opt seccomp=./seccomp.json \\  # custom seccomp profile

# ── Signals and init ───────────────────────────────────────────────────
  --init \\                      # run tini as PID 1 (proper signal forwarding)
  --stop-timeout 30 \\           # seconds to wait for SIGTERM before SIGKILL

# ── Debugging ──────────────────────────────────────────────────────────
  --log-driver json-file \\
  --log-opt max-size=50m \\
  myimage:tag`,
          notes: [
            "-p 127.0.0.1:8000:8000 is safer than -p 8000:8000. The latter binds to 0.0.0.0 and is publicly accessible regardless of host firewall rules.",
            "--init is the quick fix for the PID 1 problem. For production, embed tini in your Dockerfile instead: RUN apk add tini && ENTRYPOINT [\"/sbin/tini\", \"--\"].",
            "--pids-limit 200 prevents a buggy app or attacker from fork-bombing the host.",
            "--read-only + --tmpfs /tmp is the recommended security baseline for any production container.",
          ],
        },
        {
          title: "Graceful Shutdown — Python Signal Handling",
          desc: "Without this, docker stop kills your app mid-request. A 10-year engineer always handles SIGTERM.",
          lang: "python",
          filename: "app/main.py",
          code: `import asyncio
import signal
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
import uvicorn

logger = logging.getLogger(__name__)


# ── Lifespan: startup and graceful shutdown ───────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting up: connecting to DB, loading models...")
    # await db.connect()
    # await model_cache.load()

    yield  # ← app runs here

    # Shutdown (triggered by SIGTERM → uvicorn → lifespan exit)
    logger.info("Shutting down: closing connections...")
    # await db.disconnect()
    # await model_cache.cleanup()
    logger.info("Shutdown complete")


app = FastAPI(lifespan=lifespan)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/items/{item_id}")
async def get_item(item_id: int):
    # Simulate work
    await asyncio.sleep(0.1)
    return {"id": item_id}


# ── Running uvicorn programmatically with signal handling ─────────────
# Uvicorn handles SIGTERM by default when run as a process.
# But if you need custom shutdown logic in a non-FastAPI context:

class GracefulServer:
    def __init__(self):
        self._shutdown_event = asyncio.Event()

    def _handle_signal(self, sig):
        logger.info(f"Received signal {sig.name}, initiating shutdown...")
        self._shutdown_event.set()

    async def serve(self):
        loop = asyncio.get_running_loop()
        for sig in (signal.SIGTERM, signal.SIGINT):
            loop.add_signal_handler(sig, lambda s=sig: self._handle_signal(s))

        config = uvicorn.Config(
            app,
            host="0.0.0.0",
            port=8000,
            loop="asyncio",
            # Give in-flight requests time to complete
            timeout_graceful_shutdown=30,
            log_config=None,  # use your own logging config
        )
        server = uvicorn.Server(config)

        serve_task = asyncio.create_task(server.serve())
        await self._shutdown_event.wait()

        logger.info("Stopping uvicorn...")
        server.should_exit = True
        await serve_task
        logger.info("Server stopped")


if __name__ == "__main__":
    asyncio.run(GracefulServer().serve())`,
          notes: [
            "docker stop sends SIGTERM, waits --stop-timeout (default 10s), then sends SIGKILL. Your app must finish in-flight requests within that window.",
            "Uvicorn's --timeout-graceful-shutdown controls how long it waits for open connections after receiving the shutdown signal.",
            "The lifespan context manager (FastAPI 0.95+) is the modern way to manage startup/shutdown instead of @app.on_event.",
            "If using gunicorn: set --graceful-timeout and handle SIGTERM in your worker class.",
            "In Kubernetes: set terminationGracePeriodSeconds > uvicorn's graceful shutdown timeout to avoid SIGKILL races.",
          ],
        },
      ],
    },

    // ──────────────────────────────────────────────────────────────────────
    {
      id: "networking",
      title: "Networking",
      icon: "🌐",
      items: [
        {
          title: "Custom Bridge Networks — DNS & Isolation",
          desc: "Containers on a custom bridge resolve each other by name. The default bridge doesn't do this.",
          lang: "bash",
          filename: "networking.sh",
          code: `# ── Create a custom bridge network ────────────────────────────────────
docker network create \\
  --driver bridge \\
  --subnet 172.20.0.0/16 \\
  --ip-range 172.20.240.0/20 \\
  --gateway 172.20.0.1 \\
  --opt "com.docker.network.bridge.name"="br-myapp" \\
  myapp-net

# ── Containers on the same custom network resolve each other by name ──
docker run -d --name postgres --network myapp-net postgres:16
docker run -d --name redis    --network myapp-net redis:7
docker run -d --name api \\
  --network myapp-net \\
  -e DATABASE_URL=postgres://postgres:5432/mydb \\
  -e REDIS_URL=redis://redis:6379 \\
  myapp:latest

# 'redis' and 'postgres' resolve via Docker's embedded DNS (127.0.0.11)
# This ONLY works on custom networks — NOT on the default bridge!

# ── Connect a container to multiple networks ──────────────────────────
docker network connect frontend-net api    # api is now on both networks

# ── Inspect network ────────────────────────────────────────────────────
docker network inspect myapp-net

# ── Network aliases ────────────────────────────────────────────────────
# Same container, multiple DNS names on the same network
docker run -d --name db \\
  --network myapp-net \\
  --network-alias database \\
  --network-alias pg \\
  postgres:16
# Now: 'db', 'database', and 'pg' all resolve to the same container IP

# ── Isolate networks ───────────────────────────────────────────────────
docker network create --internal private-net
# --internal: no external connectivity; containers can't reach internet`,
          notes: [
            "The default bridge (docker0) does NOT have automatic DNS. You must use --link (deprecated) or container IPs. Always use custom networks.",
            "Docker's embedded DNS server runs at 127.0.0.11 inside each container. It resolves container names, aliases, and service names.",
            "A container can join multiple networks. Useful for an 'api' container that needs to reach both a 'db network' and a 'frontend network' without the two networks reaching each other.",
            "--internal networks have no gateway — containers can talk to each other but not the internet. Use for databases.",
          ],
        },
        {
          title: "Host Networking & Secure Port Binding",
          desc: "When to skip NAT entirely, and how to avoid exposing ports to the public internet.",
          lang: "bash",
          filename: "port-binding.sh",
          code: `# ── Host network: container shares the host's network namespace ────────
# Use case: performance-critical apps, monitoring agents (Prometheus node_exporter)
docker run -d \\
  --network host \\
  --name node_exporter \\
  prom/node-exporter:latest
# Container IS the host network — no port mapping needed, no NAT overhead

# ── DANGEROUS: bind to all interfaces (default) ────────────────────────
docker run -p 5432:5432 postgres:16
# Exposes PostgreSQL on 0.0.0.0:5432 — PUBLICLY ACCESSIBLE on a cloud VM
# (even if you think your security group/firewall covers this!)

# ── SAFE: bind to localhost only ───────────────────────────────────────
docker run -p 127.0.0.1:5432:5432 postgres:16
# Now only accessible from the same host — use SSH tunnel for remote access

# ── Binding to a specific interface ───────────────────────────────────
docker run -p 10.0.0.5:8080:8080 myapp:latest
# Only accessible via the internal IP 10.0.0.5

# ── View what's actually bound ─────────────────────────────────────────
docker ps --format "table {{.Names}}\\t{{.Ports}}"
# Or:
ss -tlnp | grep docker

# ── Best practice: never publish DB/cache ports publicly ──────────────
# Let your app container reach them via the Docker network (by name)
# Only publish the app port, and only on localhost if behind a reverse proxy`,
          notes: [
            "This is a real security footgun. docker run -p 5432:5432 on an EC2 instance bypasses Security Groups because Docker modifies iptables directly, and AWS Security Groups operate at the NIC level.",
            "Always use 127.0.0.1:host:container binding for databases, caches, and internal services.",
            "Host networking removes all network isolation — the container can bind to any host port. Only use for monitoring agents or extreme performance cases.",
          ],
        },
      ],
    },

    // ──────────────────────────────────────────────────────────────────────
    {
      id: "volumes",
      title: "Volumes & Storage",
      icon: "💾",
      items: [
        {
          title: "Volume Types — When to Use Each",
          desc: "Named volumes, bind mounts, and tmpfs each have different use cases.",
          lang: "bash",
          filename: "volumes-reference.sh",
          code: `# ── Named Volume (production data) ────────────────────────────────────
# Docker manages the storage location (/var/lib/docker/volumes/)
# Persists across container restarts and removal
# Use for: database data, file uploads, any persistent state
docker volume create pgdata
docker run -d \\
  --name postgres \\
  -v pgdata:/var/lib/postgresql/data \\
  postgres:16

# Inspect a volume
docker volume inspect pgdata
# Shows: Mountpoint on host, Driver, Labels

# ── Bind Mount (development) ────────────────────────────────────────────
# Mount a host directory into the container
# Use for: dev hot-reload, config files, log collection from host
docker run -d \\
  --name api-dev \\
  -v $(pwd)/src:/app/src:ro \\       # read-only bind mount
  -v $(pwd)/logs:/app/logs \\        # read-write for logs
  myapp:dev

# WARNING: UID mismatch — host file owner vs container user
# Fix: use :z or :Z on SELinux hosts, or match UIDs

# ── tmpfs (in-memory, ephemeral) ──────────────────────────────────────
# Written to RAM, never touches disk, gone when container stops
# Use for: /tmp, session files, scratch space — improves security + speed
docker run -d \\
  --name api \\
  --read-only \\
  --tmpfs /tmp:size=128m,mode=1777 \\
  --tmpfs /run:size=32m \\
  myapp:latest

# ── Volume Backup ─────────────────────────────────────────────────────
# Spin up a helper container, mount the volume, tar to stdout
docker run --rm \\
  -v pgdata:/source:ro \\
  -v $(pwd)/backups:/backup \\
  alpine \\
  tar czf /backup/pgdata-$(date +%Y%m%d-%H%M%S).tar.gz -C /source .

# ── Volume Restore ────────────────────────────────────────────────────
docker volume create pgdata-restored
docker run --rm \\
  -v pgdata-restored:/target \\
  -v $(pwd)/backups:/backup:ro \\
  alpine \\
  tar xzf /backup/pgdata-20240101-120000.tar.gz -C /target

# ── Copy between volumes (migration) ──────────────────────────────────
docker run --rm \\
  -v source-vol:/from:ro \\
  -v dest-vol:/to \\
  alpine \\
  cp -av /from/. /to/`,
          notes: [
            "Named volumes are portable: docker volume create → docker run -v vol:/path. The actual path (/var/lib/docker/volumes/) is irrelevant.",
            "Bind mounts are simpler for dev but problematic in production: host path must exist, UID mismatches, no portability.",
            "tmpfs + --read-only is the recommended security baseline. Your app needs to know which paths it writes to so you can add --tmpfs for each.",
            "For database backups in production, prefer pg_dump/mysqldump over raw volume copies — they're consistent and portable.",
          ],
        },
      ],
    },

    // ──────────────────────────────────────────────────────────────────────
    {
      id: "compose",
      title: "Docker Compose — Production Patterns",
      icon: "🎼",
      items: [
        {
          title: "Production Compose Stack",
          desc: "FastAPI + PostgreSQL + Redis with health checks, named volumes, and least-privilege config.",
          lang: "yaml",
          filename: "docker-compose.yml",
          code: `name: myapp

services:
  # ── Application ──────────────────────────────────────────────────────
  api:
    image: myapp:\${IMAGE_TAG:-latest}
    build:
      context: .
      dockerfile: Dockerfile
      cache_from:
        - type=registry,ref=ghcr.io/org/myapp:buildcache
    restart: unless-stopped
    ports:
      - "127.0.0.1:8000:8000"     # localhost-only — put a reverse proxy in front
    environment:
      DATABASE_URL: "postgresql+asyncpg://app:\${POSTGRES_PASSWORD}@postgres:5432/appdb"
      REDIS_URL: "redis://redis:6379/0"
      LOG_LEVEL: "\${LOG_LEVEL:-info}"
    env_file:
      - .env                       # override above with local .env
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - backend
    volumes:
      - uploads:/app/uploads
    deploy:
      resources:
        limits:
          cpus: "2"
          memory: 512M
        reservations:
          memory: 128M
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 20s

  # ── PostgreSQL ────────────────────────────────────────────────────────
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}
      POSTGRES_DB: appdb
      PGDATA: /var/lib/postgresql/data/pgdata
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./init-scripts:/docker-entrypoint-initdb.d:ro
    networks:
      - backend
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d appdb"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
    deploy:
      resources:
        limits:
          cpus: "1"
          memory: 512M

  # ── Redis ─────────────────────────────────────────────────────────────
  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: >
      redis-server
      --maxmemory 128mb
      --maxmemory-policy allkeys-lru
      --appendonly yes
      --requirepass \${REDIS_PASSWORD:-}
    volumes:
      - redisdata:/data
    networks:
      - backend
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 3

  # ── Reverse Proxy ─────────────────────────────────────────────────────
  nginx:
    image: nginx:1.27-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/certs:ro
    depends_on:
      api:
        condition: service_healthy
    networks:
      - backend
      - frontend

networks:
  backend:
    driver: bridge
    internal: false          # set true to block external access from this network
  frontend:
    driver: bridge

volumes:
  pgdata:
  redisdata:
  uploads:`,
          notes: [
            "POSTGRES_PASSWORD:? syntax causes compose to exit with an error if the variable is unset — better than silently using an empty password.",
            "condition: service_healthy waits for the healthcheck to pass, not just the container to start. Without this, the API starts before Postgres is accepting connections.",
            "'internal: true' on a network prevents containers on that network from reaching the internet. Use for databases.",
            "IMAGE_TAG:-latest uses 'latest' as default. In CI, pass IMAGE_TAG=$(git rev-parse --short HEAD) for immutable deployments.",
          ],
        },
        {
          title: "Compose Override — Dev vs Production",
          desc: "Base file defines the contract. Overrides customize per environment. Never duplicate.",
          lang: "yaml",
          filename: "docker-compose.override.yml",
          code: `# docker-compose.override.yml is auto-merged on 'docker compose up'
# For explicit: docker compose -f docker-compose.yml -f docker-compose.dev.yml up

# ── Development overrides ─────────────────────────────────────────────
services:
  api:
    build:
      context: .
      target: builder         # use the builder stage (has dev tools)
    volumes:
      - .:/app                # bind-mount source for hot reload
      - /app/.venv            # keep venv from image (anonymous volume shadows bind mount)
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
    environment:
      LOG_LEVEL: debug
      OTEL_SDK_DISABLED: "true"   # disable tracing in dev
    ports:
      - "8000:8000"           # publish directly (no nginx in dev)

  postgres:
    ports:
      - "127.0.0.1:5432:5432"   # expose to host for DB GUIs (TablePlus etc.)

  redis:
    ports:
      - "127.0.0.1:6379:6379"   # expose for redis-cli on host

  # ── Dev-only services (not in production) ────────────────────────────
  pgadmin:
    image: dpage/pgadmin4:latest
    profiles: [debug]           # only start with: docker compose --profile debug up
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@admin.com
      PGADMIN_DEFAULT_PASSWORD: admin
    ports:
      - "127.0.0.1:5050:80"
    depends_on:
      - postgres

  mailhog:
    image: mailhog/mailhog:latest
    profiles: [debug]
    ports:
      - "127.0.0.1:8025:8025"   # web UI
      - "127.0.0.1:1025:1025"   # SMTP`,
          notes: [
            "The trick with volumes: [/app/.venv] creates an anonymous volume that 'shadows' the bind mount at /app/.venv, preserving the venv from the image instead of exposing the host's (wrong platform) .venv.",
            "Profiles let you run 'docker compose --profile debug up' to also start pgadmin. Without --profile, those services are ignored.",
            "docker compose -f docker-compose.yml -f docker-compose.prod.yml up is the pattern for explicit environment switching in CI.",
          ],
        },
        {
          title: "Compose Secrets",
          desc: "Mount secrets as files rather than environment variables — avoids leaking via env inspection.",
          lang: "yaml",
          filename: "docker-compose.secrets.yml",
          code: `name: myapp-secrets-example

services:
  api:
    image: myapp:latest
    secrets:
      - db_password
      - api_key
    environment:
      # App reads from /run/secrets/db_password instead of an env var
      DB_PASSWORD_FILE: /run/secrets/db_password
      API_KEY_FILE: /run/secrets/api_key

  postgres:
    image: postgres:16
    secrets:
      - db_password
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password   # postgres supports _FILE suffix natively

# ── File-based secrets (local / non-Swarm) ────────────────────────────
secrets:
  db_password:
    file: ./secrets/db_password.txt    # plain text file, not committed to git
  api_key:
    file: ./secrets/api_key.txt

# ── External secrets (Docker Swarm) ───────────────────────────────────
# secrets:
#   db_password:
#     external: true    # secret must exist in Swarm: docker secret create db_password -`,
          notes: [
            "Secrets are mounted as files at /run/secrets/<name>. Your app reads them with open('/run/secrets/db_password').read().strip().",
            "Many official images (postgres, mysql, redis) support _FILE env var suffix natively.",
            "docker inspect on a container does NOT show secret values — only that they are mounted. This is the key advantage over -e.",
            "For production K8s, use Kubernetes Secrets or External Secrets Operator instead of Docker secrets.",
          ],
        },
      ],
    },

    // ──────────────────────────────────────────────────────────────────────
    {
      id: "security",
      title: "Security Hardening",
      icon: "🔒",
      items: [
        {
          title: "Full Security Hardening — docker run",
          desc: "The complete set of flags for a hardened production container.",
          lang: "bash",
          filename: "hardened-run.sh",
          code: `# Hardened production docker run command
# Explain each flag so you can justify it in a security review

docker run -d \\
  --name api \\
  # ── Identity ────────────────────────────────────────────────────────
  --user 1001:1001 \\              # non-root UID:GID

  # ── Capabilities ────────────────────────────────────────────────────
  --cap-drop ALL \\                # drop all 40+ Linux capabilities
  --cap-add NET_BIND_SERVICE \\   # re-add only: bind ports < 1024 (if needed)
  # Common caps you might need:
  # NET_BIND_SERVICE: bind to ports < 1024
  # CHOWN: change file ownership
  # DAC_OVERRIDE: bypass file permission checks
  # SETUID/SETGID: change process UID/GID

  # ── Filesystem ──────────────────────────────────────────────────────
  --read-only \\                   # root filesystem is read-only
  --tmpfs /tmp:size=64m,mode=1777 \\  # writable /tmp in RAM
  --tmpfs /run:size=16m \\         # writable /run for pid files

  # ── Privilege escalation ────────────────────────────────────────────
  --security-opt no-new-privileges \\  # blocks setuid/setgid escalation
  --security-opt seccomp=./seccomp-default.json \\  # syscall whitelist

  # ── Resource isolation ──────────────────────────────────────────────
  --memory 256m \\
  --cpus 0.5 \\
  --pids-limit 100 \\

  # ── Networking ──────────────────────────────────────────────────────
  --network myapp-net \\
  -p 127.0.0.1:8000:8000 \\

  myapp:latest

# ── What to check after hardening ─────────────────────────────────────
docker inspect api --format '{{json .HostConfig.SecurityOpt}}'
docker inspect api --format '{{json .HostConfig.CapDrop}}'
docker inspect api --format '{{.Config.User}}'`,
          notes: [
            "--cap-drop ALL is the most impactful single security measure. Containers rarely need capabilities beyond the defaults, which themselves are already restricted.",
            "--read-only prevents an attacker who gets RCE from persisting malware to disk.",
            "--security-opt no-new-privileges prevents a process running as non-root from gaining root via setuid binaries (like sudo).",
            "Test your hardened container: if it starts and works, great. If it fails, check 'docker logs' for 'operation not permitted' to identify missing capabilities.",
          ],
        },
        {
          title: "Image Scanning with Trivy",
          desc: "Find and fix CVEs before they reach production.",
          lang: "bash",
          filename: "trivy-scan.sh",
          code: `# Install Trivy
brew install aquasecurity/trivy/trivy        # macOS
# or:
curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh

# ── Scan a local image ────────────────────────────────────────────────
trivy image myapp:latest

# ── Scan and show only CRITICAL and HIGH CVEs ─────────────────────────
trivy image --severity CRITICAL,HIGH myapp:latest

# ── Exit with non-zero if CRITICAL CVEs found (for CI) ────────────────
trivy image --exit-code 1 --severity CRITICAL myapp:latest

# ── Scan with SBOM output (Software Bill of Materials) ────────────────
trivy image --format cyclonedx --output sbom.json myapp:latest

# ── Scan a Dockerfile for misconfigurations ───────────────────────────
trivy config --severity HIGH,CRITICAL Dockerfile

# ── Scan a running container (live filesystem) ────────────────────────
trivy rootfs --severity CRITICAL /proc/$(docker inspect api --format '{{.State.Pid}}')/root/

# ── Compare before vs after base image change ─────────────────────────
trivy image --format json python:3.12 | jq '.Results[].Vulnerabilities | length'
trivy image --format json python:3.12-slim | jq '.Results[].Vulnerabilities | length'
trivy image --format json python:3.12-alpine | jq '.Results[].Vulnerabilities | length'

# ── GitHub Actions integration ────────────────────────────────────────
# See CI/CD section for full workflow`,
          notes: [
            "python:3.12 has ~500 CVEs. python:3.12-slim has ~80. python:3.12-alpine has ~10. Choosing the right base image is the biggest CVE reducer.",
            "Trivy also scans: filesystems, git repos, Kubernetes clusters, Terraform/Helm configs. It's a Swiss Army knife for security scanning.",
            "Use --ignore-unfixed to skip CVEs with no available fix — reduces noise from known but unfixable issues.",
            "Integrate trivy in CI with --exit-code 1 --severity CRITICAL so builds fail on critical vulnerabilities.",
          ],
        },
        {
          title: "Image Signing with cosign (Sigstore)",
          desc: "Sign images in CI, verify before deployment. Protects against supply chain attacks.",
          lang: "bash",
          filename: "cosign-signing.sh",
          code: `# Install cosign
brew install sigstore/tap/cosign   # macOS
# or: go install github.com/sigstore/cosign/v2/cmd/cosign@latest

# ── Keyless signing (GitHub Actions / OIDC) ────────────────────────────
# Cosign can sign without a long-lived key using OIDC identity
# In GitHub Actions:
cosign sign --yes ghcr.io/org/myapp:sha-abc1234

# Verify (anyone can verify against the public Rekor transparency log)
cosign verify \\
  --certificate-identity "https://github.com/org/repo/.github/workflows/ci.yml@refs/heads/main" \\
  --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \\
  ghcr.io/org/myapp:sha-abc1234

# ── Key-based signing (if you prefer explicit keys) ───────────────────
cosign generate-key-pair          # creates cosign.key (private) + cosign.pub (public)
cosign sign --key cosign.key ghcr.io/org/myapp:latest
cosign verify --key cosign.pub ghcr.io/org/myapp:latest

# ── Attach SBOM as attestation ────────────────────────────────────────
trivy image --format cyclonedx --output sbom.json myapp:latest
cosign attest --yes --predicate sbom.json --type cyclonedx ghcr.io/org/myapp:sha-abc1234

# ── Verify attestation ────────────────────────────────────────────────
cosign verify-attestation \\
  --type cyclonedx \\
  --certificate-identity "..." \\
  --certificate-oidc-issuer "..." \\
  ghcr.io/org/myapp:sha-abc1234 | jq .

# ── Enforce signing in Kubernetes (with Policy Controller) ────────────
# kubectl apply -f https://github.com/sigstore/policy-controller/releases/latest/download/policy-controller.yaml
# Then create a ClusterImagePolicy requiring signed images`,
          notes: [
            "Keyless signing (OIDC) is the recommended modern approach — no long-lived keys to rotate or leak.",
            "The Rekor transparency log is public and immutable — every signing event is recorded, enabling audit.",
            "In Kubernetes: pair cosign with the Sigstore Policy Controller to reject unsigned images at admission.",
            "Cosign signatures are stored as OCI artifacts in the same registry as the image — no separate infrastructure.",
          ],
        },
      ],
    },

    // ──────────────────────────────────────────────────────────────────────
    {
      id: "multiarch",
      title: "Multi-Architecture Builds",
      icon: "🏛️",
      items: [
        {
          title: "Build & Push Multi-Arch Images with buildx",
          desc: "Build once, run on amd64 (cloud) and arm64 (Apple Silicon / AWS Graviton) from the same CI.",
          lang: "bash",
          filename: "multiarch-build.sh",
          code: `# ── Setup buildx with QEMU emulation ─────────────────────────────────
# Install QEMU for cross-architecture emulation
docker run --rm --privileged tonistiigi/binfmt --install all

# Create a new buildx builder (the 'default' builder doesn't support multi-arch push)
docker buildx create --name multiarch \\
  --driver docker-container \\
  --driver-opt network=host \\
  --use

docker buildx inspect multiarch --bootstrap
# Should show: Platforms: linux/amd64, linux/arm64, linux/arm/v7, etc.

# ── Build for multiple platforms and push ─────────────────────────────
docker buildx build \\
  --platform linux/amd64,linux/arm64 \\
  --tag ghcr.io/org/myapp:latest \\
  --tag ghcr.io/org/myapp:1.2.3 \\
  --cache-from type=registry,ref=ghcr.io/org/myapp:buildcache \\
  --cache-to   type=registry,ref=ghcr.io/org/myapp:buildcache,mode=max \\
  --push \\                       # --push required for multi-arch; --load only loads single arch
  .

# ── Inspect the resulting manifest list ──────────────────────────────
docker buildx imagetools inspect ghcr.io/org/myapp:latest
# Output shows two manifests: one for amd64, one for arm64
# When you pull on any platform, Docker picks the right one automatically

# ── Build locally without push (single arch only) ─────────────────────
docker buildx build --platform linux/arm64 --load --tag myapp:arm64-test .
docker run --rm myapp:arm64-test uname -m   # → aarch64

# ── TARGETARCH in Dockerfile for conditional steps ────────────────────
# FROM python:3.12-slim
# ARG TARGETARCH  (auto-set by buildx)
# RUN if [ "$TARGETARCH" = "arm64" ]; then echo "arm64 specific step"; fi`,
          notes: [
            "QEMU emulation makes arm64 builds ~3-5x slower than native arm64 hardware. For CI, consider using GitHub's arm64 runners (available on paid plans) or AWS Graviton runners.",
            "mode=max in cache-to exports all layers, not just the final stage. This is slower to push but much better cache hit rate for future builds.",
            "--push is required for multi-arch builds because multi-arch manifests can't be loaded into the local docker daemon.",
            "AWS Graviton (arm64) instances are 20-40% cheaper than amd64 equivalents. Multi-arch enables you to run on them.",
          ],
        },
      ],
    },

    // ──────────────────────────────────────────────────────────────────────
    {
      id: "registry",
      title: "Registry Operations",
      icon: "📦",
      items: [
        {
          title: "ECR (AWS) & GAR (GCP) Authentication",
          desc: "Cloud registries use temporary tokens, not passwords. Automate the login.",
          lang: "bash",
          filename: "registry-auth.sh",
          code: `# ══ AWS ECR ═══════════════════════════════════════════════════════════
# ECR login tokens expire after 12 hours
# The aws CLI pipes the password to docker login

AWS_ACCOUNT=123456789012
AWS_REGION=us-east-1
ECR_REGISTRY="\${AWS_ACCOUNT}.dkr.ecr.\${AWS_REGION}.amazonaws.com"

# Login (valid for 12h)
aws ecr get-login-password --region $AWS_REGION \\
  | docker login --username AWS --password-stdin $ECR_REGISTRY

# Create a repository (one-time)
aws ecr create-repository \\
  --repository-name myapp \\
  --image-scanning-configuration scanOnPush=true \\
  --encryption-configuration encryptionType=AES256

# Build, tag, push
docker build --tag $ECR_REGISTRY/myapp:latest .
docker push $ECR_REGISTRY/myapp:latest

# Pull
docker pull $ECR_REGISTRY/myapp:latest

# ── ECR Credential Helper (auto-refreshes tokens) ─────────────────────
# Install: brew install docker-credential-helper-ecr
# ~/.docker/config.json:
# { "credHelpers": { "123456789012.dkr.ecr.us-east-1.amazonaws.com": "ecr-login" } }
# Now 'docker push' auto-refreshes the token without manual aws ecr get-login-password

# ══ GCP Artifact Registry ═════════════════════════════════════════════
GCP_PROJECT=my-project
GCP_REGION=us-central1
GAR_REGISTRY="\${GCP_REGION}-docker.pkg.dev/\${GCP_PROJECT}/myrepo"

# Login
gcloud auth configure-docker \${GCP_REGION}-docker.pkg.dev

# Build, tag, push
docker build --tag $GAR_REGISTRY/myapp:latest .
docker push $GAR_REGISTRY/myapp:latest

# ── Workload Identity for GKE (no static credentials) ─────────────────
# Configure Workload Identity on the GKE node pool
# Grant 'Artifact Registry Reader' to the Kubernetes service account
# Nodes can pull from GAR without any credentials in pods`,
          notes: [
            "In CI (GitHub Actions), use the official AWS action: aws-actions/amazon-ecr-login. For GCP: google-github-actions/auth.",
            "ECR lifecycle policies prevent disk exhaustion: expire untagged images after 1 day, keep only the last N tagged images.",
            "Credential helpers are superior to manual docker login — they auto-refresh expiring tokens and store credentials securely in the OS keychain.",
            "For GKE, Workload Identity is the gold standard — no static service account keys anywhere.",
          ],
        },
      ],
    },

    // ──────────────────────────────────────────────────────────────────────
    {
      id: "debugging",
      title: "Debugging & Troubleshooting",
      icon: "🔍",
      items: [
        {
          title: "Essential Debug Commands Reference",
          desc: "Everything you need to diagnose any container issue from the CLI.",
          lang: "bash",
          filename: "debug-reference.sh",
          code: `# ── Logs ──────────────────────────────────────────────────────────────
docker logs api --follow                    # stream live
docker logs api --tail 100                  # last 100 lines
docker logs api --since 30m                 # last 30 minutes
docker logs api --since 2024-01-01T10:00:00 # since timestamp
docker logs api 2>&1 | grep ERROR           # filter (stderr + stdout)

# ── Exec into running container ───────────────────────────────────────
docker exec -it api /bin/bash              # interactive shell
docker exec api env                        # dump environment variables
docker exec api cat /proc/1/cmdline        # what is PID 1?
docker exec api curl -s http://localhost:8000/health  # test from inside

# ── Inspect ───────────────────────────────────────────────────────────
docker inspect api                                        # full JSON
docker inspect api --format '{{.State.Status}}'          # running/stopped/dead
docker inspect api --format '{{.State.ExitCode}}'        # why did it die?
docker inspect api --format '{{.Config.User}}'           # which user?
docker inspect api --format '{{json .HostConfig.Binds}}' # volume mounts
docker inspect api --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' # IP

# ── Resource usage ────────────────────────────────────────────────────
docker stats                              # live stats for ALL containers
docker stats api --no-stream              # snapshot (one line)
docker top api                            # process list inside container

# ── System ────────────────────────────────────────────────────────────
docker system df                          # disk usage (images/containers/volumes/build cache)
docker system df -v                       # verbose (per-image breakdown)
docker system events --since 1h           # audit trail: start/stop/die/pull/etc.
docker system info                        # daemon config, storage driver, cgroup version

# ── Cleanup (be careful in production!) ──────────────────────────────
docker container prune                    # remove stopped containers
docker image prune                        # remove dangling images
docker image prune -a --filter "until=24h" # remove images not used in 24h
docker volume prune                       # remove unused volumes ← IRREVERSIBLE
docker system prune -a                    # EVERYTHING unused ← use with extreme caution`,
          notes: [
            "docker inspect --format with Go template syntax is extremely powerful. Learn the format string to extract exactly what you need without piping through jq.",
            "docker system events is your audit log. If something happened to a container at 3am, this is how you find it.",
            "docker volume prune is IRREVERSIBLE and will delete data. Always confirm before running in production.",
            "'docker stats --no-stream' is great for a snapshot in scripts; '--follow' for real-time monitoring.",
          ],
        },
        {
          title: "Debug a Crashed Container (Can't exec in)",
          desc: "Container exits immediately — the standard docker exec approach won't work. Here's how to debug.",
          lang: "bash",
          filename: "debug-crashed.sh",
          code: `# ── Scenario: container keeps crashing (CrashLoopBackOff equivalent) ──

# Step 1: Get the exit code and OOM status
docker inspect api --format 'Exit: {{.State.ExitCode}}, OOMKilled: {{.State.OOMKilled}}'
# Exit 137 = OOM killed (exit code 128 + signal 9)
# Exit 1 = application error
# Exit 126 = permission denied
# Exit 127 = command not found

# Step 2: Read logs from the last (failed) run
docker logs api --tail 50

# Step 3: Get logs even after container is removed (if using json-file driver)
# Logs stored at: /var/lib/docker/containers/<id>/<id>-json.log
docker inspect api --format '{{.Id}}' | xargs -I{} cat /var/lib/docker/containers/{}/{}-json.log | tail -50

# Step 4: Override entrypoint to get a shell (bypass the crashing process)
docker run -it --rm \\
  --entrypoint /bin/sh \\
  --env-file .env \\
  myapp:latest
# Now you're inside with the same env/mounts, but the app isn't running
# Manually run the start command to see the error:
# $ uvicorn app.main:app
# → ImportError: no module named 'xxx'  ← found the bug!

# Step 5: Check file permissions
docker run -it --rm --entrypoint /bin/sh myapp:latest -c "ls -la /app && id"

# Step 6: Check if it's a config issue
docker run -it --rm \\
  --entrypoint /bin/sh \\
  -e DATABASE_URL=postgres://test:test@localhost/test \\
  myapp:latest \\
  -c "python -c 'from app.config import settings; print(settings)'"

# Step 7: Ephemeral sidecar for network debugging
# Share the crashed container's network namespace
CONTAINER_ID=$(docker ps -aqf name=api)
docker run -it --rm \\
  --network container:$CONTAINER_ID \\
  --pid container:$CONTAINER_ID \\
  nicolaka/netshoot \\
  /bin/bash
# Now inside netshoot, you have: ss, curl, ping, tcpdump, strace all pointing at api's namespaces`,
          notes: [
            "Exit code 137 = OOM kill. Increase memory limit or find the memory leak. Exit code 1 = your app crashed. Exit code 127 = binary not found.",
            "The --entrypoint override trick is the #1 debug technique for crashing containers. You get the exact same environment but bypass the failing start command.",
            "nicolaka/netshoot is a Swiss Army knife image (200+ network tools) for debugging network issues in containers.",
            "--pid container:X lets you see (and strace) the processes of another container from your debug sidecar.",
          ],
        },
        {
          title: "nsenter — Deep Namespace Debugging",
          desc: "Attach to a container's namespaces from the host. Bypasses container runtime entirely.",
          lang: "bash",
          filename: "nsenter-debug.sh",
          code: `# nsenter: enter Linux namespaces of a running process
# Useful when: distroless/scratch image (no shell), docker exec hangs, or you need host-level tools

# Step 1: Get the host PID of the container's PID 1
CONTAINER_PID=$(docker inspect api --format '{{.State.Pid}}')
echo "Container PID on host: $CONTAINER_PID"

# Step 2: Enter ALL namespaces (behave exactly like docker exec)
sudo nsenter \\
  --target $CONTAINER_PID \\
  --mount \\           # filesystem namespace
  --uts \\             # hostname namespace
  --ipc \\             # IPC namespace
  --net \\             # network namespace
  --pid \\             # PID namespace
  -- /bin/sh           # command to run

# Step 3: Enter only the network namespace (run host tools with container network)
# Useful: run tcpdump on the container's interface from the host
sudo nsenter --target $CONTAINER_PID --net -- ss -tlnp
sudo nsenter --target $CONTAINER_PID --net -- curl http://localhost:8000/health
sudo nsenter --target $CONTAINER_PID --net -- tcpdump -i eth0 -w /tmp/cap.pcap

# Step 4: Enter network namespace of a scratch/distroless container
# The container has no shell — but nsenter uses host tools
sudo nsenter --target $CONTAINER_PID --net ip addr
sudo nsenter --target $CONTAINER_PID --net netstat -tlnp

# Step 5: Read the container's /proc to understand its state without entering
# Filesystem (what the container sees at /)
ls /proc/$CONTAINER_PID/root/

# Environment variables
cat /proc/$CONTAINER_PID/environ | tr '\\0' '\\n'

# Open file descriptors
ls -la /proc/$CONTAINER_PID/fd/

# Memory maps
cat /proc/$CONTAINER_PID/maps | grep heap`,
          notes: [
            "nsenter requires root (sudo) on the host because it's entering privileged kernel namespaces.",
            "The killer use case: distroless or scratch images have no shell. docker exec fails. nsenter lets you use host tools to inspect the container.",
            "/proc/<PID>/environ gives you the exact environment the container sees, including any runtime-injected values.",
            "/proc/<PID>/root is the container's root filesystem as seen from the host. You can read files, copy them out, etc.",
          ],
        },
      ],
    },

    // ──────────────────────────────────────────────────────────────────────
    {
      id: "cicd",
      title: "CI/CD Integration",
      icon: "🔄",
      items: [
        {
          title: "GitHub Actions — Full Production Build Pipeline",
          desc: "Build, scan, sign, and push with BuildKit layer caching. The real-world CI pattern.",
          lang: "yaml",
          filename: ".github/workflows/docker.yml",
          code: `name: Build & Push

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: \${{ github.repository }}

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write           # push to GHCR
      id-token: write           # keyless cosign signing (OIDC)

    steps:
      - uses: actions/checkout@v4

      # ── Setup ──────────────────────────────────────────────────────
      - name: Set up QEMU (for multi-arch)
        uses: docker/setup-qemu-action@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to GHCR
        uses: docker/login-action@v3
        with:
          registry: \${{ env.REGISTRY }}
          username: \${{ github.actor }}
          password: \${{ secrets.GITHUB_TOKEN }}

      # ── Generate image metadata (tags + labels) ─────────────────────
      - name: Generate image metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: \${{ env.REGISTRY }}/\${{ env.IMAGE_NAME }}
          tags: |
            type=sha,prefix=sha-
            type=ref,event=branch
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=raw,value=latest,enable=\${{ github.ref == 'refs/heads/main' }}

      # ── Build & push ────────────────────────────────────────────────
      - name: Build and push
        id: build-push
        uses: docker/build-push-action@v6
        with:
          context: .
          platforms: linux/amd64,linux/arm64
          push: \${{ github.event_name != 'pull_request' }}
          tags: \${{ steps.meta.outputs.tags }}
          labels: \${{ steps.meta.outputs.labels }}
          cache-from: type=gha              # GitHub Actions cache
          cache-to: type=gha,mode=max

      # ── Vulnerability scan ──────────────────────────────────────────
      - name: Run Trivy vulnerability scan
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: \${{ env.REGISTRY }}/\${{ env.IMAGE_NAME }}:\${{ steps.meta.outputs.version }}
          format: sarif
          output: trivy-results.sarif
          severity: CRITICAL,HIGH
          exit-code: 1            # fail build on CRITICAL

      - name: Upload Trivy SARIF to GitHub Security tab
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: trivy-results.sarif

      # ── Sign with cosign (keyless OIDC) ─────────────────────────────
      - name: Install cosign
        if: github.event_name != 'pull_request'
        uses: sigstore/cosign-installer@v3

      - name: Sign the image
        if: github.event_name != 'pull_request'
        run: |
          cosign sign --yes \\
            \${{ env.REGISTRY }}/\${{ env.IMAGE_NAME }}@\${{ steps.build-push.outputs.digest }}`,
          notes: [
            "type=gha cache is the easiest CI cache — uses GitHub's own cache API, no external registry needed for caching.",
            "mode=max exports all intermediate layer caches, not just the final stage. Slower to push but dramatically better cache hits.",
            "The cosign step signs the specific digest (not tag) — tags are mutable, digests are immutable.",
            "SARIF output uploads vulnerabilities to GitHub Security tab for tracking without failing PRs (use if: always()).",
            "Separate 'push: ${{ github.event_name != pull_request }}' prevents pushing unreviewed PR images.",
          ],
        },
        {
          title: "Kaniko — Rootless Builds Inside Kubernetes",
          desc: "Build Docker images inside a K8s pod without privileged access or a Docker daemon.",
          lang: "yaml",
          filename: "kaniko-job.yml",
          code: `# Kaniko: Google's tool for building container images inside K8s
# No Docker daemon, no privileged pods, no DinD security risks

apiVersion: batch/v1
kind: Job
metadata:
  name: kaniko-build
spec:
  template:
    spec:
      restartPolicy: Never
      initContainers:
        # Clone the source repo (or use a git init container)
        - name: clone-repo
          image: alpine/git:latest
          command:
            - git
            - clone
            - --depth=1
            - https://github.com/org/myapp.git
            - /workspace
          volumeMounts:
            - name: workspace
              mountPath: /workspace

      containers:
        - name: kaniko
          image: gcr.io/kaniko-project/executor:latest
          args:
            - --context=/workspace
            - --dockerfile=/workspace/Dockerfile
            - --destination=ghcr.io/org/myapp:latest
            - --destination=ghcr.io/org/myapp:$(git rev-parse --short HEAD)
            - --cache=true
            - --cache-repo=ghcr.io/org/myapp/cache
            - --compressed-caching=false   # faster for large images
            - --snapshot-mode=redo         # more reliable than default
          volumeMounts:
            - name: workspace
              mountPath: /workspace
            - name: docker-config
              mountPath: /kaniko/.docker/
          resources:
            requests:
              memory: "512Mi"
              cpu: "500m"
            limits:
              memory: "2Gi"
              cpu: "2"

      volumes:
        - name: workspace
          emptyDir: {}
        - name: docker-config
          secret:
            secretName: registry-credentials
            items:
              - key: .dockerconfigjson
                path: config.json

---
# Registry credentials secret
# kubectl create secret docker-registry registry-credentials \\
#   --docker-server=ghcr.io \\
#   --docker-username=org \\
#   --docker-password=$GITHUB_TOKEN`,
          notes: [
            "Kaniko runs as a regular (non-privileged) pod. No --privileged, no Docker socket mount — much safer than DinD.",
            "DinD requires --privileged which gives the build pod near-root access to the node. Avoid in shared clusters.",
            "Kaniko caches layers in a registry (--cache-repo). First build is slow; subsequent builds reuse cached layers.",
            "For GitHub Actions in K8s, prefer BuildKit with Docker's actions over Kaniko — easier cache management. Use Kaniko for self-hosted K8s CI where Actions isn't available.",
          ],
        },
      ],
    },
    // ──────────────────────────────────────────────────────────────────────
    {
      id: "system-design",
      title: "System Design Case Studies",
      icon: "🏗️",
      items: [
        // ── Case Study 1 ────────────────────────────────────────────────
        {
          title: "Case Study 1: ML Training Pipeline — Train Inside Docker, Persist Model Outside",
          desc: `Problem: A data scientist runs GPU-accelerated PyTorch training inside a container. The trained model checkpoint (several GB) must be saved to the host filesystem so that a separate, lightweight inference container can serve it — without baking the model weights into any image.

Key design decisions:
• Use a named bind mount (host path) for \`/models\` — not a named volume — so ops can rsync / back up the path directly.
• Training container is ephemeral (--rm); it writes to /models and exits. The image itself stays small (~4 GB GPU runtime, but no weights).
• Inference container mounts the same host path read-only. It can be restarted independently and rolled back by pointing at a different checkpoint directory.
• A separate "exporter" stage converts the raw checkpoint to TorchScript/ONNX for the inference server, keeping concerns separated.`,
          lang: "bash",
          filename: "ml-training-pipeline.sh",
          code: `# ── Directory layout on the HOST ──────────────────────────────────────
# /data/ml-project/
#   datasets/          ← training data (read-only for container)
#   models/
#     checkpoints/     ← raw .pt checkpoints written by trainer
#     exports/         ← TorchScript / ONNX for inference server
#   code/              ← Python source (bind-mounted for dev iteration)

mkdir -p /data/ml-project/{datasets,models/checkpoints,models/exports,code}

# ── Stage 1: Training container (GPU, ephemeral, --rm) ────────────────
# The image bundles the Python environment, NOT the weights.
# We mount data + code + output dir from the host.
docker run --rm \\
  --name trainer \\
  --gpus '"device=0"' \\
  --shm-size=8g \\            # PyTorch DataLoader uses /dev/shm for multiprocessing
  --memory=32g \\
  --cpus=8 \\
  --env EPOCHS=50 \\
  --env BATCH_SIZE=64 \\
  --env CHECKPOINT_DIR=/models/checkpoints \\
  --env WANDB_API_KEY_FILE=/run/secrets/wandb_key \\
  --mount type=bind,src=/data/ml-project/datasets,dst=/datasets,readonly \\
  --mount type=bind,src=/data/ml-project/code,dst=/app,readonly \\
  --mount type=bind,src=/data/ml-project/models,dst=/models \\
  --mount type=secret,id=wandb_key,target=/run/secrets/wandb_key \\
  my-registry/pytorch-trainer:cuda12.1 \\
  python /app/train.py
# train.py saves: /models/checkpoints/epoch_50_val0.92.pt

# How the secret is provided (Docker 23+ with BuildKit secrets at runtime):
# WANDB_KEY=$(cat ~/.wandb_key) docker run ... (avoid: leaks to process list)
# Better: use --env-file with a .env file that is .gitignored
# Best: use --mount type=secret (shown above) — only visible inside the container

# ── Stage 2: Export container (CPU-only, converts checkpoint → ONNX) ──
docker run --rm \\
  --name exporter \\
  --memory=8g \\
  --cpus=4 \\
  --env CHECKPOINT=/models/checkpoints/epoch_50_val0.92.pt \\
  --env OUTPUT_DIR=/models/exports \\
  --mount type=bind,src=/data/ml-project/models,dst=/models \\
  my-registry/pytorch-exporter:latest \\
  python /app/export_onnx.py
# Writes: /models/exports/model_v1.onnx

# ── Stage 3: Inference server (long-running, read-only model mount) ────
docker run -d \\
  --name inference-server \\
  --restart unless-stopped \\
  --cpus=4 \\
  --memory=8g \\
  -p 8080:8080 \\
  --mount type=bind,src=/data/ml-project/models/exports,dst=/models,readonly \\
  --env MODEL_PATH=/models/model_v1.onnx \\
  --health-cmd='curl -sf http://localhost:8080/health || exit 1' \\
  --health-interval=15s \\
  --health-retries=3 \\
  my-registry/onnx-inference-server:latest

# ── Rollback: point the inference server at an older export ───────────
# No image rebuild needed — just restart with a different MODEL_PATH:
docker stop inference-server
docker run -d \\
  --name inference-server \\
  --restart unless-stopped \\
  -p 8080:8080 \\
  --mount type=bind,src=/data/ml-project/models/exports,dst=/models,readonly \\
  --env MODEL_PATH=/models/model_v0.onnx \\
  my-registry/onnx-inference-server:latest

# ── Key insight ────────────────────────────────────────────────────────
# Container images stay small and reusable across experiments.
# Host path = single source of truth for artifacts — easy to back up,
# rsync to other machines, or mount into K8s PersistentVolumes later.`,
          notes: [
            "--shm-size is critical for PyTorch DataLoader with num_workers > 0 — workers communicate via /dev/shm. The default 64 MB is almost always too small.",
            "Use --gpus '\"device=0\"' (or 'all') only on the training container; inference typically runs on CPU with ONNX Runtime.",
            "Bind mounts (host path) are preferred over named volumes here because the artifacts need to be accessible to external tools (rsync, S3 sync scripts, monitoring).",
            "The exporter stage keeps the training image and inference image decoupled — the inference server only needs ONNX Runtime, not the full PyTorch GPU stack.",
            "In production, swap the host bind mount for a cloud storage volume (AWS EFS, GCS Filestore) mounted into both the training VM and inference cluster nodes.",
          ],
        },
        // ── Case Study 2 ────────────────────────────────────────────────
        {
          title: "Case Study 2: Zero-Downtime Web App Deployment with Blue-Green Switch via Compose",
          desc: `Problem: A team deploys a FastAPI backend behind an nginx reverse proxy. They need zero-downtime deployments with instant rollback capability — on a single VM, without Kubernetes.

Key design decisions:
• Run two app versions simultaneously (blue + green), each on an isolated Docker network.
• nginx is the traffic router. Switching traffic = updating nginx upstream + reload (SIGHUP, no restart).
• HEALTHCHECK on the new container must pass before traffic is cut over.
• The old container stays up for 60 s as a fallback, then is removed.
• Named volumes for PostgreSQL and Redis are shared across deployments — DB is not part of the blue/green swap.`,
          lang: "yaml",
          filename: "docker-compose.blue-green.yml",
          code: `# compose.yml — baseline services (DB, cache, proxy) always running
services:

  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: appdb
      POSTGRES_USER: app
      POSTGRES_PASSWORD_FILE: /run/secrets/pg_password
    secrets: [pg_password]
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d appdb"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks: [backend]

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server --save 60 1 --loglevel warning
    volumes:
      - redisdata:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
    networks: [backend]

  nginx:
    image: nginx:1.27-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/conf.d:/etc/nginx/conf.d       # ← writable: deploy script swaps upstream
      - ./certs:/etc/nginx/certs:ro
    networks: [backend, frontend]
    depends_on:
      postgres: { condition: service_healthy }

volumes:
  pgdata:
  redisdata:

secrets:
  pg_password:
    file: ./secrets/pg_password.txt

networks:
  backend:
  frontend:

---
# nginx/conf.d/upstream.conf — managed by deploy.sh, NOT by humans
# Active slot is written here during deployment.
# upstream app {
#     server app-blue:8000;   ← or app-green:8000
# }`,
          lang2: "bash",
          filename2: "deploy.sh",
          code2: `#!/usr/bin/env bash
# deploy.sh — zero-downtime blue/green swap
# Usage: ./deploy.sh ghcr.io/org/myapp:v2.3.1
set -euo pipefail

IMAGE="$1"
COMPOSE_FILE="compose.yml"
UPSTREAM_CONF="./nginx/conf.d/upstream.conf"

# ── 1. Determine current active slot ────────────────────────────────
if docker ps --filter name=app-blue --filter status=running -q | grep -q .; then
  ACTIVE="blue"; IDLE="green"
else
  ACTIVE="green"; IDLE="blue"
fi
echo "Active: $ACTIVE  →  Deploying to: $IDLE"

# ── 2. Start the idle slot with the new image ───────────────────────
docker run -d \\
  --name "app-$IDLE" \\
  --network backend \\         # same network as postgres + redis + nginx
  --network-alias "app-$IDLE" \\
  --restart unless-stopped \\
  --memory=512m --cpus=1 \\
  --env-file .env.production \\
  --env DB_HOST=postgres \\
  --env REDIS_HOST=redis \\
  --health-cmd='curl -sf http://localhost:8000/health || exit 1' \\
  --health-interval=10s \\
  --health-retries=6 \\       # 60 s window to become healthy
  --health-start-period=20s \\ # grace period before checks start
  "$IMAGE"

# ── 3. Wait for the new container to be healthy ─────────────────────
echo "Waiting for app-$IDLE to become healthy..."
for i in $(seq 1 18); do   # 18 × 10 s = 180 s timeout
  STATUS=$(docker inspect --format='{{.State.Health.Status}}' "app-$IDLE")
  [ "$STATUS" = "healthy" ] && break
  [ "$STATUS" = "unhealthy" ] && {
    echo "New container is unhealthy. Aborting."
    docker rm -f "app-$IDLE"
    exit 1
  }
  echo "  Status: $STATUS (attempt $i/18)..."
  sleep 10
done
[ "$STATUS" != "healthy" ] && { echo "Timeout waiting for health."; docker rm -f "app-$IDLE"; exit 1; }

# ── 4. Atomic nginx upstream switch (SIGHUP, no downtime) ───────────
cat > "$UPSTREAM_CONF" <<EOF
upstream app {
    server app-$IDLE:8000;
}
EOF
docker exec nginx nginx -s reload
echo "Traffic switched to app-$IDLE"

# ── 5. Drain and remove the old container ───────────────────────────
echo "Draining app-$ACTIVE (60 s)..."
sleep 60
docker rm -f "app-$ACTIVE"
echo "Deployment complete. Active slot: $IDLE"`,
          notes: [
            "nginx -s reload sends SIGHUP which triggers a graceful reload — existing connections finish, new connections use the updated upstream. Zero dropped requests.",
            "HEALTHCHECK --health-start-period gives the app time to warm up (DB connections, model loading) before checks count against retries.",
            "The 60-second drain after the switch lets in-flight requests on the old slot complete. Tune based on your p99 request latency.",
            "Named volumes (pgdata, redisdata) are outside the blue/green swap — they persist across deployments and are shared by both slots.",
            "This pattern works on a single VM. In production, the same concept maps directly to Kubernetes Deployments with RollingUpdate strategy and readinessProbes.",
          ],
        },
        // ── Case Study 3 ────────────────────────────────────────────────
        {
          title: "Case Study 3: Containerized ETL Pipeline — Multi-Stage Data Processing with Sidecar Log Shipping",
          desc: `Problem: A data engineering team runs a nightly ETL pipeline: (1) extract from a REST API, (2) transform/validate with pandas, (3) load into PostgreSQL. Each stage is a separate container so it can be scaled, retried, or replaced independently. A sidecar container ships structured logs to an external observability platform.

Key design decisions:
• Stages communicate via a shared tmpfs volume (in-memory, fast, auto-deleted when containers exit).
• A named volume stores the final "loaded" confirmation file — used as a success sentinel for idempotency checks on retry.
• The sidecar (Fluent Bit) shares the log volume with all pipeline stages — no application-level log forwarding code needed.
• Resource limits are set per stage reflecting actual workload (extract is I/O-bound, transform is CPU/mem-bound).
• depends_on with condition: service_completed_successfully ensures strict ordering.`,
          lang: "yaml",
          filename: "compose.etl-pipeline.yml",
          code: `# compose.etl-pipeline.yml
# Run: docker compose -f compose.etl-pipeline.yml up --abort-on-container-exit
services:

  # ── Stage 0: pre-flight idempotency check ─────────────────────────
  check-already-run:
    image: alpine:3.20
    volumes:
      - etl-state:/state
    # Exit 0 if already completed today, exit 1 if we should proceed.
    # Compose --abort-on-container-exit will stop the stack on exit 0,
    # which is intentional — we use a wrapper script to interpret the code.
    entrypoint: ["sh", "-c"]
    command:
      - |
        DATE=$(date +%Y-%m-%d)
        if [ -f /state/completed_$$DATE ]; then
          echo "ETL already completed for $$DATE, skipping."
          exit 0
        fi
        echo "No completion marker found. Proceeding."
        exit 1   # non-zero so Compose continues to dependent services

  # ── Stage 1: Extract ──────────────────────────────────────────────
  extract:
    image: my-registry/etl-extract:latest
    restart: "no"
    depends_on:
      check-already-run:
        condition: service_completed_successfully
    environment:
      API_URL: https://api.source.example.com/v2/records
      OUTPUT_FILE: /workspace/raw.jsonl
      LOG_FILE: /logs/extract.jsonl
    env_file: [.env.etl]
    secrets: [source_api_token]
    volumes:
      - workspace:/workspace         # tmpfs: fast, auto-cleaned
      - etl-logs:/logs               # shared with sidecar
    networks: [pipeline-net]
    mem_limit: 256m
    cpus: "0.5"                      # I/O-bound: doesn't need much CPU
    healthcheck:
      test: ["CMD-SHELL", "[ -f /workspace/raw.jsonl ] || exit 1"]
      interval: 5s
      retries: 12
      start_period: 10s

  # ── Stage 2: Transform / Validate ─────────────────────────────────
  transform:
    image: my-registry/etl-transform:latest
    restart: "no"
    depends_on:
      extract:
        condition: service_completed_successfully
    environment:
      INPUT_FILE: /workspace/raw.jsonl
      OUTPUT_FILE: /workspace/clean.parquet
      SCHEMA_FILE: /app/schemas/records_v3.json
      LOG_FILE: /logs/transform.jsonl
      REJECT_THRESHOLD: "0.05"       # fail if >5% rows rejected
    volumes:
      - workspace:/workspace
      - etl-logs:/logs
    networks: [pipeline-net]
    mem_limit: 2g                    # pandas needs headroom
    cpus: "2"                        # CPU-bound: vectorised ops

  # ── Stage 3: Load ─────────────────────────────────────────────────
  load:
    image: my-registry/etl-load:latest
    restart: "no"
    depends_on:
      transform:
        condition: service_completed_successfully
    environment:
      INPUT_FILE: /workspace/clean.parquet
      DB_HOST: postgres
      DB_PORT: "5432"
      DB_NAME: warehouse
      DB_USER: etl_writer
      LOG_FILE: /logs/load.jsonl
      STATE_DIR: /state
    secrets: [db_password]
    volumes:
      - workspace:/workspace
      - etl-logs:/logs
      - etl-state:/state             # writes completion sentinel here
    networks: [pipeline-net]
    mem_limit: 512m
    cpus: "1"

  # ── Sidecar: Fluent Bit log shipper ───────────────────────────────
  # Shares the log volume. Reads JSONL files written by each stage
  # and forwards to an observability backend (Loki, Datadog, etc.)
  log-shipper:
    image: fluent/fluent-bit:3.1
    restart: "no"
    depends_on:
      - extract      # start as soon as extract begins writing logs
    volumes:
      - etl-logs:/logs:ro
      - ./fluent-bit/fluent-bit.conf:/fluent-bit/etc/fluent-bit.conf:ro
    environment:
      LOKI_HOST: loki.monitoring.internal
      LOKI_PORT: "3100"
      PIPELINE_RUN_ID: "\${PIPELINE_RUN_ID:-unknown}"
    networks: [pipeline-net]
    mem_limit: 64m
    cpus: "0.1"

  # ── Dependency: PostgreSQL (could be external in production) ──────
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: warehouse
      POSTGRES_USER: etl_writer
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    secrets: [db_password]
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U etl_writer -d warehouse"]
      interval: 10s
      retries: 5
    networks: [pipeline-net]

volumes:
  workspace:
    driver_opts:
      type: tmpfs
      device: tmpfs
      o: size=4g,mode=1777    # in-memory workspace — fast I/O, auto-wiped on compose down
  etl-logs:                   # named volume: sidecar reads, stages write
  etl-state:                  # persists completion sentinels across runs
  pgdata:

secrets:
  source_api_token:
    file: ./secrets/source_api_token.txt
  db_password:
    file: ./secrets/db_password.txt

networks:
  pipeline-net:`,
          notes: [
            "tmpfs as a Compose volume (driver_opts type: tmpfs) gives you in-memory I/O between stages — ideal for intermediate files that are large but short-lived. No disk writes, automatic cleanup.",
            "condition: service_completed_successfully (Compose 2.1+) means a stage only starts if the previous container exited with code 0. A non-zero exit aborts the pipeline — no partial loads.",
            "The sidecar pattern (log-shipper) keeps observability concerns out of business logic containers. Fluent Bit tails JSONL log files; stages just append to a file — no SDK, no network call in the app code.",
            "etl-state with a date-stamped sentinel file provides idempotency: re-running the compose stack on the same day is a no-op. This is cheap, file-based, and works even if the DB was already loaded.",
            "In production this pipeline would be triggered by Airflow, Prefect, or a cron job. The container abstraction means you can run the exact same images locally, in CI, and on the production scheduler with no code changes.",
          ],
        },
      ],
    },
  ];
})();
