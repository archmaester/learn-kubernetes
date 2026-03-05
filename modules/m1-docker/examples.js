// Patches the Docker module (m1) with topics, labs, interviewQuestions, and codeExamples.
// Loaded after curriculum.js but before docker-lessons.js.
// Tells a coherent story: building an ML recommendation/inference system with Docker.
(function patchDockerModule() {
  const m = CURRICULUM.phases[0].modules[0];

  // ── Topics ──────────────────────────────────────────────────────────────────
  m.topics = [
    // Architecture & internals
    "Docker architecture: dockerd daemon, REST API, Docker CLI — how they communicate",
    "Linux primitives: namespaces (pid, net, mnt, uts, ipc, user) that isolate containers",
    "cgroups v2: resource limits (CPU, memory, PIDs, block I/O) enforced by the kernel",
    "Storage driver: OverlayFS — union mounts, lowerdir/upperdir, copy-on-write layers",
    "Container runtimes: runc (OCI), containerd, CRI-O — how they relate to Docker",

    // Setup & configuration
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
    "Container lifecycle: created -> running -> paused -> stopped -> removed",
    "docker run key flags: -d, -it, --rm, --name, -p, -v, -e, --env-file, --network, --restart",
    "Restart policies: no, always, unless-stopped, on-failure[:max-retries]",
    "Resource limits: --memory, --memory-swap, --cpus, --cpu-shares, --pids-limit",
    "The PID 1 problem: shell form CMD wraps in /bin/sh, orphans signals; use exec form or tini",
    "Signal handling: SIGTERM sent on docker stop; --stop-timeout sets grace period before SIGKILL",
    "tini / --init: lightweight init to reap zombie processes and forward signals correctly",

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
    "Port publishing: -p host:container; bind to 127.0.0.1 to avoid exposing to public interface",
    "Network aliases: --network-alias; multiple names for same container",

    // Volumes & storage
    "Volume types: named volumes (managed by Docker), bind mounts (host path), tmpfs (in-memory)",
    "Volume lifecycle: independent of containers; persist until explicitly deleted",
    "Bind mount vs volume: bind mounts for dev (hot reload); named volumes for production data",
    "Volume backup: tar via docker run with --volumes-from or explicit -v mount",

    // Compose
    "Compose file structure: services, networks, volumes, configs, secrets (version field deprecated)",
    "depends_on with condition: service_healthy waits for HEALTHCHECK to pass",
    "Environment variables: environment (inline), env_file, .env for compose variable interpolation",
    "Compose profiles: --profile flag; mark services with profiles: [dev] to exclude by default",
    "Compose override: docker-compose.override.yml auto-merged; docker-compose -f base.yml -f dev.yml",
    "Compose watch (v2.22+): sync+restart or rebuild on file change for dev inner loop",

    // Registry & images
    "Image naming: registry/repository:tag; default registry is docker.io; :latest is not special",
    "Image tagging strategy: semantic version + git SHA; never rely on :latest in production",
    "Multi-arch builds: docker buildx + QEMU emulation; --platform linux/amd64,linux/arm64",
    "Manifest lists (image index): one tag pointing to arch-specific images",
    "ECR authentication: aws ecr get-login-password | docker login; token expires in 12h",
    "GCR/GAR authentication: gcloud auth configure-docker or Workload Identity + credential helper",
    "Image scanning: Trivy, Docker Scout, Snyk — integrate in CI before push",
    "Image signing: cosign (Sigstore), Docker Content Trust (Notary v1), SLSA provenance",

    // Debugging & observability
    "docker logs: --follow, --tail N, --since 1h, --timestamps",
    "docker exec: -it for interactive; run one-off diagnostic commands",
    "docker inspect: full JSON state — network, mounts, env, labels, restart policy",
    "docker stats: live CPU%, MEM usage/limit, NET I/O, BLOCK I/O",
    "docker events: audit trail — container start/stop/die, image pull, network connect",
    "Debugging crashed containers: override --entrypoint to /bin/sh; run with --rm -it",
    "docker system df: disk usage by images/containers/volumes/build cache",
    "docker system prune: clean unused resources; -a removes all unused images",
    "Ephemeral debug containers: docker run --pid=container:TARGET --net=container:TARGET nicolaka/netshoot",

    // CI/CD integration
    "BuildKit cache in CI: --cache-from type=registry and --cache-to type=registry,mode=max",
    "GitHub Actions cache: type=gha uses Actions cache API (no registry needed)",
    "DinD (Docker-in-Docker): privileged pod running its own daemon; security risk",
    "DooD (Docker-outside-of-Docker): mount /var/run/docker.sock; host daemon, container socket",
    "Kaniko: builds images from Dockerfile inside a container without Docker daemon; safe for K8s CI",
    "docker/build-push-action: GitHub Actions action for BuildKit builds with cache and push",
    "docker/metadata-action: generate tags and labels from git refs and events",
  ];

  // ── Labs ────────────────────────────────────────────────────────────────────
  m.labs = [
    {
      title: "Install Docker & Explore Image Layers with dive",
      desc: "Install Docker Desktop (macOS) or Docker Engine (Linux). Pull python:3.12 and python:3.12-slim. Run 'docker history' on both and compare layers. Install wagoodman/dive and interactively explore layer contents. Identify wasted space and understand how OverlayFS layers stack.",
      difficulty: "beginner",
    },
    {
      title: "Containerize a FastAPI ML Inference API",
      desc: "Write a Dockerfile for a FastAPI app that loads a scikit-learn model from a pickle file and serves /predict. Use multi-stage build (builder installs deps, runtime copies only wheel + model). Add HEALTHCHECK, non-root USER, and .dockerignore. Target image size under 200 MB.",
      difficulty: "beginner",
    },
    {
      title: "Multi-Stage Build: Shrink a PyTorch Inference Image",
      desc: "Start with a naive Dockerfile that installs PyTorch + transformers (3+ GB). Refactor into multi-stage: builder stage compiles dependencies, runtime stage uses python:3.12-slim with only CPU torch wheel and the exported model. Goal: reduce from 3 GB to under 800 MB. Compare with dive.",
      difficulty: "intermediate",
    },
    {
      title: "Docker Compose: ML Inference Stack",
      desc: "Build a complete ML stack with Compose: FastAPI inference API, a TorchServe model server, Redis for prediction caching, PostgreSQL for request logging. Add health checks on all 4 services, use depends_on conditions, custom bridge network, named volumes for model artifacts and DB data.",
      difficulty: "intermediate",
    },
    {
      title: "BuildKit Cache Mounts for ML Dependencies",
      desc: "Benchmark builds with and without --mount=type=cache for pip, apt, and model weight downloads. Cold build vs warm build timing. Add a new Python dependency and rebuild — cache mount should only install the delta. Also cache model weights download in a separate mount target.",
      difficulty: "intermediate",
    },
    {
      title: "Security Hardening Audit with Trivy",
      desc: "Scan your ML inference image with Trivy. Fix all CRITICAL and HIGH CVEs by changing base images or pinning package versions. Apply runtime hardening: --cap-drop ALL, --read-only, --tmpfs /tmp, --security-opt no-new-privileges. Run before/after comparison. Integrate Trivy into a pre-push hook.",
      difficulty: "intermediate",
    },
    {
      title: "Multi-Architecture Build for amd64 + arm64",
      desc: "Set up docker buildx with a new builder using QEMU. Build your ML inference image for linux/amd64 AND linux/arm64. Push to Docker Hub with a manifest list. Verify with 'docker buildx imagetools inspect'. Test on both platforms (AWS Graviton for arm64 if available).",
      difficulty: "advanced",
    },
    {
      title: "GPU Container Setup for Model Training",
      desc: "Install NVIDIA Container Toolkit. Run nvidia-smi inside a container. Build a training image based on nvidia/cuda with PyTorch and your training script. Use --gpus all and verify CUDA is accessible. Set up compose with runtime: nvidia. Benchmark CPU vs GPU training time.",
      difficulty: "advanced",
    },
    {
      title: "CI Pipeline: GitHub Actions Build + Scan + Push",
      desc: "Write a complete GitHub Actions workflow: lint Dockerfile with hadolint, run unit tests, build with docker/build-push-action and BuildKit GHA cache, scan with Trivy (fail on CRITICAL), push to GHCR with docker/metadata-action tags (semver + git SHA). Add multi-arch build step.",
      difficulty: "advanced",
    },
    {
      title: "Debug a Production Container Crash",
      desc: "Given a container that OOM-kills on startup (intentionally misconfigured memory limit + large model load), debug using: docker logs, docker inspect (find OOMKilled flag), docker stats, override entrypoint to shell in. Fix by adjusting memory limits, adding swap, or lazy-loading the model. Document the debugging playbook.",
      difficulty: "advanced",
    },
  ];

  // ── Interview Questions ─────────────────────────────────────────────────────
  m.interviewQuestions = [
    // Fundamentals (MLE level)
    "Explain how Docker containers differ from VMs at the kernel level. What Linux primitives (namespaces, cgroups) make isolation possible?",
    "Walk me through what happens when you run 'docker build'. What is the build context, how do layers get created, and why does context size matter?",
    "What is the difference between CMD and ENTRYPOINT? Show an example of using both together for a configurable ML inference container.",
    "Why should you use exec form (JSON array) for CMD/ENTRYPOINT instead of shell form? What breaks with shell form regarding signal handling?",
    "How does OverlayFS work in Docker? Explain lowerdir, upperdir, and what happens when a running container writes to a file from the base image.",

    // Dockerfile best practices (MLE level)
    "A developer added a 500 MB dataset in one RUN layer and deleted it in the next. The image is still huge. Why? How do you fix it?",
    "Explain multi-stage builds. How would you use them to produce a minimal runtime image for a PyTorch inference service?",
    "What is the difference between ARG and ENV? An ARG is 'not in the final image' — but can you still extract its value? How do you safely pass build-time secrets?",
    "Explain the layer caching algorithm. You have a Dockerfile where COPY requirements.txt comes before COPY . — why is that ordering critical for CI build speed?",
    "What is .dockerignore and why is it important? What happens if your build context contains a 2 GB training dataset?",

    // BuildKit & advanced builds (Senior MLE level)
    "What does --mount=type=cache do in BuildKit? How does it differ from layer caching? Give an example for ML dependency installation.",
    "How do --mount=type=secret and --mount=type=ssh work? Why are they better than passing secrets via ARG for private PyPI registries?",
    "Explain how multi-architecture builds work with buildx and QEMU. What is a manifest list? How do you build for both amd64 and arm64 in CI?",
    "Compare BuildKit cache strategies for CI: inline cache, registry cache (mode=max), and GitHub Actions cache (type=gha). When would you use each?",

    // Networking & volumes (Senior MLE level)
    "What is the difference between bridge, host, and overlay network drivers? When would you use host networking for an ML workload?",
    "Explain named volumes vs bind mounts. Which would you use for model artifacts in production? What about for development hot-reload?",
    "A container's /tmp fills up and crashes the app. The filesystem is read-only. What happened and how do you fix it?",

    // Security (Staff MLE level)
    "Walk me through a complete security hardening strategy for an ML container: base image, user, capabilities, filesystem, seccomp, and scanning.",
    "What is the difference between --cap-drop ALL and --security-opt no-new-privileges? Are they redundant or complementary?",
    "Explain rootless Docker. What security advantages does it provide? What are the practical limitations for ML workloads (GPU access, port binding)?",
    "How would you implement image signing with cosign in a CI pipeline? What supply-chain attacks does it protect against?",

    // Operations & debugging (Staff MLE level)
    "A container in production is using 100% CPU and responding slowly. Walk me through diagnosis using only Docker CLI tools (stats, top, exec, logs).",
    "The container exits immediately with code 137. What does that mean? How do you distinguish between OOMKill and manual docker kill?",
    "Explain live-restore in daemon.json. Why is it critical for production? What happens to running containers during a Docker daemon upgrade without it?",

    // System design (Staff MLE level)
    "Design the container architecture for an ML recommendation system: API gateway, inference service, feature store, model registry, async processing. How do containers communicate? How do you handle model updates with zero downtime?",
  ];

  // ── Code Examples ───────────────────────────────────────────────────────────
  // Story: Building "RecSys" — a production ML recommendation/inference system
  m.codeExamples = [

    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 1: Installation & Setup
    // ═══════════════════════════════════════════════════════════════════════════
    {
      id: "install",
      title: "Installation & Setup",
      icon: "⚙️",
      items: [
        {
          title: "Install Docker — macOS vs Linux",
          desc: "Platform-specific installation: Docker Desktop with Homebrew on macOS, Docker Engine from the official apt repository on Ubuntu/Debian.",
          lang: "bash",
          platforms: {
            mac: {
              filename: "install-docker-macos.sh",
              code: `#!/usr/bin/env bash
# ── Docker Desktop via Homebrew (recommended) ─────────────────────────
brew install --cask docker

# Launch Docker Desktop (first run requires license acceptance)
open -a Docker

# Wait for daemon readiness, then verify
docker version
docker run --rm hello-world

# Docker Desktop installs:
#   /Applications/Docker.app          - GUI + daemon (Linux VM via Apple Hypervisor)
#   /usr/local/bin/docker             - CLI (symlinked from app bundle)
#   /usr/local/bin/docker-compose     - Compose v2 plugin
#   /usr/local/bin/docker-buildx      - BuildKit plugin

# ── Alternative: colima (lightweight, no GUI, good for CI) ────────────
brew install colima docker docker-buildx docker-compose
colima start --cpu 4 --memory 8 --disk 60
# Apple Silicon optimised:
#   colima start --arch aarch64 --vm-type vz --vz-rosetta

# ── Recommended Desktop settings ──────────────────────────────────────
# Resources -> CPUs: 4+  Memory: 8 GB+  Swap: 2 GB
# Features in Development -> Use Rosetta for x86_64/amd64 emulation
# Kubernetes -> Enable (optional, for local K8s dev)`
            },
            linux: {
              filename: "install-docker-ubuntu.sh",
              code: `#!/usr/bin/env bash
set -euo pipefail

# ── Remove old/conflicting packages ──────────────────────────────────
for pkg in docker.io docker-doc docker-compose podman-docker containerd runc; do
  sudo apt-get remove -y "\$pkg" 2>/dev/null || true
done

# ── Add Docker official GPG key + apt repository ─────────────────────
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \\
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add the repository
echo \\
  "deb [arch=\$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \\
  https://download.docker.com/linux/ubuntu \\
  \$(. /etc/os-release && echo "\$VERSION_CODENAME") stable" | \\
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# ── Install Docker Engine + plugins ──────────────────────────────────
sudo apt-get update
sudo apt-get install -y \\
  docker-ce docker-ce-cli containerd.io \\
  docker-buildx-plugin docker-compose-plugin

# ── Post-install: run Docker without sudo ─────────────────────────────
sudo groupadd docker 2>/dev/null || true
sudo usermod -aG docker "\$USER"
newgrp docker

# ── Enable on boot ───────────────────────────────────────────────────
sudo systemctl enable docker.service
sudo systemctl enable containerd.service

# ── Verify ───────────────────────────────────────────────────────────
docker version
docker run --rm hello-world`
            }
          },
          notes: [
            "macOS has no native Linux kernel, so Docker Desktop runs a lightweight Linux VM via Apple Hypervisor Framework — this adds a small overhead vs bare-metal Linux.",
            "colima is preferred for CI/headless environments because it avoids Docker Desktop licensing requirements for large organizations.",
            "On Linux, always install from Docker's official apt repo — the distro-packaged docker.io is typically several versions behind.",
            "The 'newgrp docker' activates the group in the current shell; alternatively log out and back in.",
            "Never run Docker as root in production — use the docker group or rootless mode instead.",
          ]
        },
        {
          title: "Production daemon.json Configuration",
          desc: "Daemon configuration tuned for an ML inference server: log rotation, live-restore for zero-downtime daemon upgrades, storage driver, and metrics.",
          lang: "json",
          filename: "daemon.json",
          code: `{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "50m",
    "max-file": "5",
    "compress": "true"
  },
  "storage-driver": "overlay2",
  "live-restore": true,
  "default-address-pools": [
    { "base": "172.20.0.0/16", "size": 24 },
    { "base": "172.21.0.0/16", "size": 24 }
  ],
  "default-ulimits": {
    "nofile": { "Name": "nofile", "Hard": 65536, "Soft": 65536 },
    "memlock": { "Name": "memlock", "Hard": -1, "Soft": -1 }
  },
  "metrics-addr": "127.0.0.1:9323",
  "experimental": false,
  "features": { "buildkit": true },
  "insecure-registries": [],
  "registry-mirrors": [],
  "default-runtime": "runc",
  "runtimes": {
    "nvidia": {
      "path": "nvidia-container-runtime",
      "runtimeArgs": []
    }
  }
}`,
          notes: [
            "log rotation (max-size + max-file) is critical — without it, container logs grow unbounded and can fill the disk, crashing the host.",
            "live-restore keeps containers running during dockerd restarts — essential for production where daemon upgrades must not kill inference services.",
            "memlock ulimit set to unlimited (-1) is required for ML workloads that use GPU memory or large mmap'd model files.",
            "The nvidia runtime entry is needed for GPU containers — install NVIDIA Container Toolkit first, then add this config.",
            "metrics-addr exposes Prometheus-compatible metrics at /metrics — scrape with Prometheus for daemon-level monitoring.",
          ]
        },
        {
          title: "Verify Installation & Environment",
          desc: "Comprehensive verification that Docker, BuildKit, Compose, and networking are all working correctly before building the ML system.",
          lang: "bash",
          platforms: {
            mac: {
              filename: "verify-docker-macos.sh",
              code: `#!/usr/bin/env bash
set -euo pipefail

echo "=== Docker Version ==="
docker version --format '{{.Server.Version}}'

echo "=== BuildKit Enabled ==="
docker buildx version

echo "=== Compose Version ==="
docker compose version

echo "=== System Info ==="
docker info --format '{{.OSType}}/{{.Architecture}} | Storage: {{.Driver}} | Runtimes: {{range .Runtimes}}{{.Path}} {{end}}'

echo "=== Run Test Container ==="
docker run --rm alpine:3.19 sh -c 'echo "Container OK: $(uname -m)"'

echo "=== Network Test ==="
docker network create --driver bridge test-net 2>/dev/null || true
docker run --rm --network test-net alpine:3.19 sh -c 'nslookup host.docker.internal || echo "DNS OK (host resolution available on Desktop)"'
docker network rm test-net 2>/dev/null || true

echo "=== Disk Usage ==="
docker system df

echo "All checks passed. Ready to build RecSys."`
            },
            linux: {
              filename: "verify-docker-linux.sh",
              code: `#!/usr/bin/env bash
set -euo pipefail

echo "=== Docker Version ==="
docker version --format '{{.Server.Version}}'

echo "=== BuildKit Enabled ==="
docker buildx version

echo "=== Compose Version ==="
docker compose version

echo "=== System Info ==="
docker info --format '{{.OSType}}/{{.Architecture}} | Storage: {{.Driver}} | Cgroup: {{.CgroupDriver}} {{.CgroupVersion}}'

echo "=== Run Test Container ==="
docker run --rm alpine:3.19 sh -c 'echo "Container OK: \$(uname -m)"'

echo "=== Network Test ==="
docker network create --driver bridge test-net 2>/dev/null || true
docker run --rm --network test-net alpine:3.19 ping -c 1 -W 2 8.8.8.8
docker network rm test-net 2>/dev/null || true

echo "=== GPU Check (optional) ==="
if command -v nvidia-smi &>/dev/null; then
  docker run --rm --gpus all nvidia/cuda:12.3.1-base-ubuntu22.04 nvidia-smi --query-gpu=name,memory.total --format=csv
else
  echo "No NVIDIA GPU detected (install nvidia-container-toolkit for GPU support)"
fi

echo "=== Disk Usage ==="
docker system df

echo "All checks passed. Ready to build RecSys."`
            }
          },
          notes: [
            "Always verify BuildKit is available — it provides cache mounts, secrets, and parallel stage builds that dramatically improve ML image build times.",
            "On macOS, host.docker.internal resolves to the host machine — useful for connecting containers to services running on the host during development.",
            "The GPU check on Linux verifies nvidia-container-toolkit is installed and working — required for any ML training or GPU inference containers.",
            "docker system df shows how much disk images, containers, and build cache consume — ML images are large, so monitor this regularly.",
          ]
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 2: Your First Dockerfile — ML Inference API
    // ═══════════════════════════════════════════════════════════════════════════
    {
      id: "first-dockerfile",
      title: "Your First Dockerfile — ML Inference API",
      icon: "📦",
      items: [
        {
          title: "The Bad Dockerfile (Anti-Patterns)",
          desc: "A naive Dockerfile for an ML inference API that contains every common mistake. Each anti-pattern is marked with a comment explaining why it is wrong.",
          lang: "docker",
          filename: "Dockerfile.bad",
          code: `# BAD: Using :latest tag — not reproducible across builds
FROM python:latest

# BAD: Running as root (default) — security risk
# BAD: No WORKDIR set — files go to / which is messy

# BAD: Copying everything first breaks layer caching
# Any code change invalidates pip install cache
COPY . /app
WORKDIR /app

# BAD: Not pinning package versions — builds break over time
# BAD: pip cache left in layer — wasted 200+ MB
# BAD: Installing dev dependencies in production image
RUN pip install -r requirements.txt

# BAD: Using requirements.txt with unpinned versions
# (e.g., torch>=2.0 instead of torch==2.2.1)

# BAD: Model file baked into image — 500 MB+ per rebuild
# BAD: No .dockerignore — build context sends .git, __pycache__, .venv
COPY models/recommendation_model.pkl /app/models/

# BAD: EXPOSE does nothing for security — just documentation
EXPOSE 8000

# BAD: Shell form wraps in /bin/sh — PID 1 problem
# Signals (SIGTERM) go to shell, not uvicorn — no graceful shutdown
CMD python -m uvicorn main:app --host 0.0.0.0 --port 8000

# BAD: No HEALTHCHECK — orchestrator cannot detect unhealthy state
# BAD: No LABEL — no metadata for image management
# BAD: No .dockerignore — huge build context
# Total issues: 12+ anti-patterns`,
          notes: [
            "The :latest tag is mutable — it points to whatever was pushed last. Two builds a week apart can produce completely different images.",
            "Running as root means a container escape gives the attacker root on the host (unless user namespace remapping is enabled).",
            "COPY . before pip install means every code change invalidates the pip cache layer, forcing a full reinstall on every build (minutes wasted).",
            "Shell form CMD (no JSON array) runs via /bin/sh -c, which does not forward SIGTERM to the child process — the container gets SIGKILL after the grace period.",
            "Without a HEALTHCHECK, Docker (and Kubernetes) cannot distinguish between a running but broken container and a healthy one.",
          ]
        },
        {
          title: "The Good Dockerfile (Production-Grade)",
          desc: "Production-grade multi-stage Dockerfile for the RecSys inference API. Non-root user, pinned versions, proper layer ordering, health check, and OCI labels.",
          lang: "docker",
          filename: "Dockerfile",
          code: `# syntax=docker/dockerfile:1.7
# ──────────────────────────────────────────────────────────────────────
# RecSys Inference API — Production Dockerfile
# Multi-stage: builder (compile deps) -> runtime (minimal)
# ──────────────────────────────────────────────────────────────────────

# ── Stage 1: Builder ─────────────────────────────────────────────────
FROM python:3.12.3-slim-bookworm AS builder

WORKDIR /build

# Install system build dependencies (cleaned up, not carried to runtime)
RUN apt-get update && \\
    apt-get install -y --no-install-recommends \\
      build-essential \\
      libpq-dev \\
    && rm -rf /var/lib/apt/lists/*

# Copy dependency specs first — cache this layer across code changes
COPY requirements.lock ./requirements.txt

# Install Python deps into a virtualenv (easy to copy to runtime)
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:\$PATH"

# Cache pip downloads between builds (BuildKit)
RUN --mount=type=cache,target=/root/.cache/pip \\
    pip install --no-compile -r requirements.txt

# ── Stage 2: Runtime ─────────────────────────────────────────────────
FROM python:3.12.3-slim-bookworm AS runtime

# OCI image labels for metadata
LABEL org.opencontainers.image.title="recsys-inference" \\
      org.opencontainers.image.description="ML Recommendation Inference API" \\
      org.opencontainers.image.source="https://github.com/company/recsys" \\
      org.opencontainers.image.version="1.0.0"

# Install only runtime system dependencies
RUN apt-get update && \\
    apt-get install -y --no-install-recommends \\
      libpq5 \\
      curl \\
      tini \\
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd --gid 1000 recsys && \\
    useradd --uid 1000 --gid recsys --shell /bin/bash --create-home recsys

WORKDIR /app

# Copy virtualenv from builder (only runtime packages, no build tools)
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:\$PATH" \\
    PYTHONDONTWRITEBYTECODE=1 \\
    PYTHONUNBUFFERED=1

# Copy application code (after deps — code changes don't bust dep cache)
COPY --chown=recsys:recsys ./src /app/src
COPY --chown=recsys:recsys ./main.py /app/

# Model files loaded at runtime from volume mount, NOT baked into image
# Mount point: /app/models (see compose.yml or docker run -v)
RUN mkdir -p /app/models && chown recsys:recsys /app/models
VOLUME ["/app/models"]

# Switch to non-root user
USER recsys

# Expose port (documentation only)
EXPOSE 8000

# Health check — FastAPI /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \\
    CMD curl -f http://localhost:8000/health || exit 1

# Use tini as PID 1 for proper signal handling and zombie reaping
ENTRYPOINT ["tini", "--"]

# Exec form — uvicorn receives SIGTERM directly for graceful shutdown
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]`,
          notes: [
            "Multi-stage builds reduce image size dramatically: build tools (gcc, make) are only in the builder stage and never appear in the final image.",
            "requirements.lock is copied before source code — code changes only rebuild the COPY + CMD layers, not the slow pip install layer.",
            "tini as PID 1 solves two problems: forwarding SIGTERM to child processes for graceful shutdown, and reaping zombie processes.",
            "The /app/models VOLUME is a mount point — models are loaded from external storage (named volume or bind mount), not baked into the image. This keeps images small and allows model updates without rebuilds.",
            "PYTHONDONTWRITEBYTECODE=1 prevents .pyc files (saves space); PYTHONUNBUFFERED=1 ensures logs appear immediately in docker logs.",
          ]
        },
        {
          title: ".dockerignore",
          desc: "Exclude unnecessary files from the build context. Without this, Docker sends everything (including .git, datasets, and virtual envs) to the daemon — adding minutes to build time.",
          lang: "bash",
          filename: ".dockerignore",
          code: `# Version control
.git
.gitignore

# Python artifacts
__pycache__
*.pyc
*.pyo
.mypy_cache
.pytest_cache
.ruff_cache
*.egg-info
dist
build

# Virtual environments
.venv
venv
env

# IDE
.vscode
.idea
*.swp
*.swo

# Docker files (don't send Dockerfiles into context)
Dockerfile*
docker-compose*.yml
compose*.yml
.dockerignore

# ML artifacts (models loaded from volumes, not baked in)
models/
*.pkl
*.pt
*.onnx
*.safetensors
data/
datasets/

# Notebooks and docs
*.ipynb
*.md
docs/
notebooks/

# Environment and secrets (NEVER send to build context)
.env
.env.*
*.pem
*.key
credentials/

# OS files
.DS_Store
Thumbs.db`,
          notes: [
            "Without .dockerignore, a .git directory alone can add 100+ MB to build context, and a models/ directory can add gigabytes — all transferred to the daemon on every build.",
            "Excluding Dockerfile* prevents sending Dockerfiles into the context (they are already available to the build engine separately).",
            "NEVER include .env or credential files in build context — even if you do not COPY them, they are sent to the daemon and could leak in build logs.",
            "Excluding *.pkl, *.pt, *.onnx prevents accidentally baking model files into images — models should always be loaded from volumes or downloaded at startup.",
          ]
        },
        {
          title: "Build, Run, and Verify",
          desc: "Build the production image, run it with proper resource limits, and verify it works end-to-end.",
          lang: "bash",
          filename: "build-and-run.sh",
          code: `#!/usr/bin/env bash
set -euo pipefail

IMAGE="recsys-inference"
TAG="1.0.0"

# ── Build with BuildKit (progress=plain shows full output) ────────────
DOCKER_BUILDKIT=1 docker build \\
  --tag "\$IMAGE:\$TAG" \\
  --tag "\$IMAGE:latest" \\
  --file Dockerfile \\
  --progress=plain \\
  .

# ── Verify image metadata ────────────────────────────────────────────
echo "=== Image size ==="
docker images "\$IMAGE:\$TAG" --format "{{.Repository}}:{{.Tag}} — {{.Size}}"

echo "=== Image labels ==="
docker inspect "\$IMAGE:\$TAG" --format '{{json .Config.Labels}}' | python3 -m json.tool

echo "=== Non-root user check ==="
docker inspect "\$IMAGE:\$TAG" --format '{{.Config.User}}'
# Should output: recsys

echo "=== Health check configured ==="
docker inspect "\$IMAGE:\$TAG" --format '{{json .Config.Healthcheck}}' | python3 -m json.tool

# ── Run with resource limits ──────────────────────────────────────────
docker run -d \\
  --name recsys-api \\
  --publish 8000:8000 \\
  --memory 2g \\
  --memory-swap 2g \\
  --cpus 2.0 \\
  --pids-limit 256 \\
  --read-only \\
  --tmpfs /tmp:rw,noexec,nosuid,size=100m \\
  --cap-drop ALL \\
  --security-opt no-new-privileges \\
  --restart unless-stopped \\
  --volume recsys-models:/app/models:ro \\
  --env-file .env.production \\
  "\$IMAGE:\$TAG"

# ── Wait for healthy, then test ───────────────────────────────────────
echo "Waiting for container to become healthy..."
for i in \$(seq 1 30); do
  STATUS=\$(docker inspect recsys-api --format '{{.State.Health.Status}}' 2>/dev/null || echo "starting")
  if [ "\$STATUS" = "healthy" ]; then
    echo "Container is healthy after \${i}s"
    break
  fi
  sleep 1
done

echo "=== Test inference endpoint ==="
curl -s http://localhost:8000/health | python3 -m json.tool
curl -s -X POST http://localhost:8000/predict \\
  -H "Content-Type: application/json" \\
  -d '{"user_id": "u123", "context": {"page": "home"}}' | python3 -m json.tool

echo "=== Container resource usage ==="
docker stats recsys-api --no-stream --format "CPU: {{.CPUPerc}} | MEM: {{.MemUsage}} | PIDs: {{.PIDs}}"`,
          notes: [
            "--memory and --memory-swap set to the same value disables swap inside the container — ML workloads should fail fast on OOM rather than swap to disk and become unresponsive.",
            "--read-only with --tmpfs /tmp gives a read-only root filesystem while allowing the app to write temporary files — prevents attackers from modifying the filesystem.",
            "--cap-drop ALL removes all Linux capabilities; the inference API needs none. Add back specific capabilities only if required (e.g., NET_BIND_SERVICE for port 80).",
            "The model volume is mounted :ro (read-only) — the inference service should never modify model files. A separate process handles model updates.",
            "--pids-limit 256 prevents fork bombs — if a dependency has a bug that spawns unlimited processes, this limit protects the host.",
          ]
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 3: Multi-Stage Builds for ML
    // ═══════════════════════════════════════════════════════════════════════════
    {
      id: "multistage",
      title: "Multi-Stage Builds for ML",
      icon: "🏗️",
      items: [
        {
          title: "PyTorch Model Serving — Optimised Multi-Stage",
          desc: "A production Dockerfile for serving a PyTorch recommendation model. Builder stage compiles C extensions and installs full PyTorch; runtime stage uses CPU-only torch wheel on slim base.",
          lang: "docker",
          filename: "Dockerfile.torch-inference",
          code: `# syntax=docker/dockerfile:1.7
# ──────────────────────────────────────────────────────────────────────
# RecSys PyTorch Inference — Multi-Stage Build
# Goal: 3.2 GB naive -> ~850 MB optimised
# ──────────────────────────────────────────────────────────────────────

# ── Stage 1: Builder — full build environment ────────────────────────
FROM python:3.12.3-slim-bookworm AS builder

WORKDIR /build

RUN apt-get update && \\
    apt-get install -y --no-install-recommends \\
      build-essential \\
      libpq-dev \\
      git \\
    && rm -rf /var/lib/apt/lists/*

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:\$PATH"

# Install PyTorch CPU-only (no CUDA runtime — saves 1.5 GB+)
# Pin exact versions for reproducibility
RUN --mount=type=cache,target=/root/.cache/pip \\
    pip install \\
      torch==2.2.1+cpu \\
      --index-url https://download.pytorch.org/whl/cpu

# Install remaining dependencies
COPY requirements.lock ./requirements.txt
RUN --mount=type=cache,target=/root/.cache/pip \\
    pip install --no-compile -r requirements.txt

# ── Stage 2: Export model to TorchScript (optional build stage) ──────
FROM builder AS model-export

COPY ./src /build/src
COPY ./scripts/export_model.py /build/

# Convert model to TorchScript for production serving
# This removes dependency on the model class definition at runtime
RUN python export_model.py \\
    --input /build/src/models/recommendation_model.py \\
    --output /build/model_scripted.pt \\
    --format torchscript

# ── Stage 3: Runtime — minimal production image ─────────────────────
FROM python:3.12.3-slim-bookworm AS runtime

RUN apt-get update && \\
    apt-get install -y --no-install-recommends \\
      libpq5 \\
      libgomp1 \\
      curl \\
      tini \\
    && rm -rf /var/lib/apt/lists/*

RUN groupadd --gid 1000 recsys && \\
    useradd --uid 1000 --gid recsys --shell /bin/bash --create-home recsys

WORKDIR /app

# Copy only the virtualenv (no build tools, no source code for build)
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:\$PATH" \\
    PYTHONDONTWRITEBYTECODE=1 \\
    PYTHONUNBUFFERED=1 \\
    OMP_NUM_THREADS=4 \\
    TORCH_NUM_THREADS=4

# Copy application code
COPY --chown=recsys:recsys ./src /app/src
COPY --chown=recsys:recsys ./main.py /app/

# Model directory — loaded from volume or copied from export stage
RUN mkdir -p /app/models && chown recsys:recsys /app/models

USER recsys
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \\
    CMD curl -f http://localhost:8000/health || exit 1

ENTRYPOINT ["tini", "--"]
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]`,
          notes: [
            "The CPU-only PyTorch wheel (torch+cpu) saves 1.5+ GB over the default CUDA-bundled wheel. For GPU inference, use a separate nvidia/cuda base image instead.",
            "OMP_NUM_THREADS and TORCH_NUM_THREADS limit parallelism to match container CPU allocation — without this, PyTorch tries to use all host CPUs, causing contention in multi-container environments.",
            "libgomp1 (OpenMP runtime) is required for PyTorch even in CPU mode — missing it causes cryptic 'cannot find libgomp' errors at import time.",
            "The optional model-export stage converts the model to TorchScript format, which removes the dependency on the Python model class at runtime and enables JIT optimisations.",
            "start-period=30s in HEALTHCHECK gives the model time to load into memory before health checks begin — large models can take 10-20 seconds to initialise.",
          ]
        },
        {
          title: "Distroless Final Stage — Minimal Attack Surface",
          desc: "Using Google's distroless image as the final stage eliminates the shell, package manager, and all OS utilities — dramatically reducing the attack surface.",
          lang: "docker",
          filename: "Dockerfile.distroless",
          code: `# syntax=docker/dockerfile:1.7
# ──────────────────────────────────────────────────────────────────────
# Distroless variant — no shell, no package manager, no OS utils
# Trade-off: harder to debug, but much more secure
# ──────────────────────────────────────────────────────────────────────

# ── Builder (same as before) ─────────────────────────────────────────
FROM python:3.12.3-slim-bookworm AS builder

WORKDIR /build
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:\$PATH"

COPY requirements.lock ./requirements.txt
RUN --mount=type=cache,target=/root/.cache/pip \\
    pip install \\
      torch==2.2.1+cpu \\
      --index-url https://download.pytorch.org/whl/cpu && \\
    pip install --no-compile -r requirements.txt

# ── Runtime: distroless Python ───────────────────────────────────────
FROM gcr.io/distroless/python3-debian12:nonroot AS runtime

# No apt, no shell, no curl — just the Python runtime
WORKDIR /app

COPY --from=builder /opt/venv/lib/python3.12/site-packages /opt/venv/lib/python3.12/site-packages
ENV PYTHONPATH="/opt/venv/lib/python3.12/site-packages" \\
    PYTHONDONTWRITEBYTECODE=1 \\
    PYTHONUNBUFFERED=1

COPY ./src /app/src
COPY ./main.py /app/

# Distroless :nonroot tag runs as uid 65534 by default
# No need for USER instruction

EXPOSE 8000

# No curl available — use a Python-based health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \\
    CMD ["python3", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"]

# No shell — must use exec form (JSON array)
ENTRYPOINT ["python3", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]`,
          notes: [
            "Distroless images contain only the language runtime and your app — no shell, no package manager, no ls/cat/curl. This eliminates most post-exploitation tools an attacker would use.",
            "Debugging distroless containers requires ephemeral debug containers: docker run --pid=container:TARGET --net=container:TARGET nicolaka/netshoot.",
            "The :nonroot tag variant runs as uid 65534 (nobody) by default — no need for explicit USER instruction.",
            "Health checks cannot use curl (not installed). Use a Python-based check or rely on an external probe (e.g., Kubernetes liveness probe hitting the endpoint).",
            "Trade-off: distroless saves ~30-50 MB and removes attack surface, but makes debugging significantly harder. Best for production; use slim for staging/debug environments.",
          ]
        },
        {
          title: "Build Size Comparison",
          desc: "Compare image sizes across different build strategies to quantify the impact of multi-stage builds and base image selection.",
          lang: "bash",
          filename: "compare-sizes.sh",
          code: `#!/usr/bin/env bash
set -euo pipefail

echo "Building all variants for size comparison..."

# ── Naive single-stage build ──────────────────────────────────────────
docker build -t recsys:naive -f Dockerfile.bad .

# ── Multi-stage with slim base ────────────────────────────────────────
docker build -t recsys:multistage -f Dockerfile .

# ── Multi-stage with distroless ───────────────────────────────────────
docker build -t recsys:distroless -f Dockerfile.distroless .

# ── Size comparison ───────────────────────────────────────────────────
echo ""
echo "=== Image Size Comparison ==="
echo "──────────────────────────────────────────────────"
docker images --format "table {{.Repository}}:{{.Tag}}\\t{{.Size}}" \\
  --filter "reference=recsys:*"

# Expected output:
# recsys:naive        3.2 GB
# recsys:multistage   ~850 MB
# recsys:distroless   ~780 MB

# ── Layer analysis with dive ──────────────────────────────────────────
echo ""
echo "=== Layer analysis (install dive: brew install dive) ==="
echo "Run: dive recsys:naive       — see wasted space"
echo "Run: dive recsys:multistage  — see optimised layers"

# ── Security scan comparison ──────────────────────────────────────────
echo ""
echo "=== Vulnerability comparison ==="
for tag in naive multistage distroless; do
  COUNT=\$(docker run --rm aquasec/trivy:latest image --severity CRITICAL,HIGH --quiet "recsys:\$tag" 2>/dev/null | grep -c "Total:" || echo "0")
  echo "recsys:\$tag — \$COUNT vulnerability groups"
done`,
          notes: [
            "Multi-stage builds typically reduce ML image size by 60-75% by excluding build tools (gcc, make, python-dev) and pip cache from the final image.",
            "Distroless saves an additional 50-70 MB over slim because it removes the shell, coreutils, apt, and other OS packages entirely.",
            "Smaller images are not just about disk space — they reduce pull time in CI/CD (critical for fast deployments), reduce cold-start time in auto-scaling, and reduce attack surface.",
            "dive (wagoodman/dive) gives an interactive layer-by-layer breakdown showing exactly what each layer adds and identifying wasted space.",
            "Trivy scan comparison shows that fewer OS packages = fewer CVEs. Distroless images typically have 50-80% fewer vulnerabilities than full or slim bases.",
          ]
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 4: Networking & Volumes
    // ═══════════════════════════════════════════════════════════════════════════
    {
      id: "networking-volumes",
      title: "Networking & Volumes",
      icon: "🔌",
      items: [
        {
          title: "Custom Bridge Network for the ML Stack",
          desc: "Create an isolated bridge network where containers discover each other by name. This is the foundation for the multi-service RecSys stack.",
          lang: "bash",
          filename: "setup-network.sh",
          code: `#!/usr/bin/env bash
set -euo pipefail

# ── Create a custom bridge network ────────────────────────────────────
# Custom bridge provides:
#   1. Automatic DNS: containers resolve each other by name
#   2. Isolation: separate from the default bridge network
#   3. Custom subnet: predictable IP ranges

docker network create \\
  --driver bridge \\
  --subnet 172.28.0.0/16 \\
  --gateway 172.28.0.1 \\
  --opt com.docker.network.bridge.name=recsys-br0 \\
  --label project=recsys \\
  recsys-net

# ── Launch services on the custom network ─────────────────────────────
# Redis — feature cache and prediction cache
docker run -d \\
  --name recsys-redis \\
  --network recsys-net \\
  --network-alias cache \\
  --memory 512m \\
  redis:7.2-alpine \\
  redis-server --maxmemory 400mb --maxmemory-policy allkeys-lru

# PostgreSQL — request logging and A/B test results
docker run -d \\
  --name recsys-postgres \\
  --network recsys-net \\
  --network-alias db \\
  --memory 1g \\
  -e POSTGRES_DB=recsys \\
  -e POSTGRES_USER=recsys \\
  -e POSTGRES_PASSWORD=changeme \\
  -v recsys-pgdata:/var/lib/postgresql/data \\
  postgres:16-alpine

# Inference API — connects to Redis and PostgreSQL by name
docker run -d \\
  --name recsys-api \\
  --network recsys-net \\
  --publish 8000:8000 \\
  --memory 2g \\
  -e REDIS_URL=redis://cache:6379/0 \\
  -e DATABASE_URL=postgresql://recsys:changeme@db:5432/recsys \\
  recsys-inference:1.0.0

# ── Verify DNS resolution ────────────────────────────────────────────
docker exec recsys-api python3 -c "
import socket
for host in ['cache', 'db', 'recsys-redis', 'recsys-postgres']:
    ip = socket.gethostbyname(host)
    print(f'{host} -> {ip}')
"

# ── Inspect network ──────────────────────────────────────────────────
docker network inspect recsys-net --format '{{range .Containers}}{{.Name}}: {{.IPv4Address}}{{println}}{{end}}'`,
          notes: [
            "The default bridge network does NOT provide DNS resolution between containers — you must use --link (deprecated) or create a custom bridge network.",
            "Network aliases (--network-alias cache) allow multiple names for the same container, making it easy to swap implementations without changing connection strings.",
            "Custom subnets prevent IP conflicts when running multiple isolated projects — each project gets its own /16 range.",
            "Containers on the same custom bridge can communicate on all ports without -p. The -p flag only exposes ports to the host (and external traffic).",
            "Always set --memory limits on database containers to prevent a single service from consuming all host memory and OOM-killing other containers.",
          ]
        },
        {
          title: "Named Volumes for Model Artifacts",
          desc: "Named volumes persist model files independently of containers. This pattern allows model updates without rebuilding or restarting the inference container.",
          lang: "bash",
          filename: "model-volumes.sh",
          code: `#!/usr/bin/env bash
set -euo pipefail

# ── Create named volume for model artifacts ───────────────────────────
docker volume create \\
  --label project=recsys \\
  --label type=models \\
  recsys-models

# ── Load model into volume (one-time or on model update) ─────────────
# Use an ephemeral container to copy model file into the volume
docker run --rm \\
  -v recsys-models:/models \\
  -v "\$(pwd)/model-registry:/source:ro" \\
  alpine:3.19 sh -c '
    cp /source/recommendation_v2.pt /models/recommendation.pt
    cp /source/feature_encoder.pkl /models/feature_encoder.pkl
    echo "Model version: v2.1.0" > /models/VERSION
    chown -R 1000:1000 /models
    ls -lah /models
  '

# ── Mount model volume into inference container (read-only) ──────────
docker run -d \\
  --name recsys-api \\
  --network recsys-net \\
  --publish 8000:8000 \\
  -v recsys-models:/app/models:ro \\
  recsys-inference:1.0.0

# ── Update model without restart (if app supports hot-reload) ────────
# Copy new model into the volume
docker run --rm \\
  -v recsys-models:/models \\
  -v "\$(pwd)/model-registry:/source:ro" \\
  alpine:3.19 sh -c '
    cp /source/recommendation_v3.pt /models/recommendation.pt
    echo "Model version: v3.0.0" > /models/VERSION
  '
# Signal the app to reload (if it watches for file changes or has an API)
docker exec recsys-api kill -SIGHUP 1

# ── Volume backup ────────────────────────────────────────────────────
docker run --rm \\
  -v recsys-models:/source:ro \\
  -v "\$(pwd)/backups:/backup" \\
  alpine:3.19 tar czf /backup/models-backup-\$(date +%Y%m%d).tar.gz -C /source .

# ── Volume inspection ────────────────────────────────────────────────
docker volume inspect recsys-models
docker system df -v | grep recsys`,
          notes: [
            "Named volumes persist until explicitly deleted (docker volume rm) — they survive container restarts, removals, and even image updates.",
            "Mounting models :ro (read-only) prevents the inference container from modifying model files. A separate process or pipeline handles model deployment.",
            "Using an ephemeral container (--rm) to load models keeps the volume management separate from the running service — clean separation of concerns.",
            "For hot model reload: the app can watch the VERSION file via inotify or expose a /reload endpoint. SIGHUP is a common convention for config reload.",
            "Always label volumes (--label project=recsys) so you can find and manage them later — unlabeled volumes become orphans that waste disk space.",
          ]
        },
        {
          title: "Bind Mounts for Development Hot-Reload",
          desc: "Bind mounts map a host directory into the container in real-time. Combined with uvicorn --reload, code changes appear instantly without rebuilding.",
          lang: "bash",
          filename: "dev-bind-mounts.sh",
          code: `#!/usr/bin/env bash
set -euo pipefail

# ── Development mode with bind mounts ────────────────────────────────
# Source code changes on host are instantly visible inside the container
docker run -d \\
  --name recsys-dev \\
  --network recsys-net \\
  --publish 8000:8000 \\
  -v "\$(pwd)/src:/app/src" \\
  -v "\$(pwd)/main.py:/app/main.py" \\
  -v "\$(pwd)/tests:/app/tests" \\
  -v recsys-models:/app/models:ro \\
  -e ENVIRONMENT=development \\
  -e LOG_LEVEL=debug \\
  recsys-inference:1.0.0 \\
  uvicorn main:app --host 0.0.0.0 --port 8000 --reload --reload-dir /app/src

# ── Key difference from volumes ───────────────────────────────────────
# Bind mount: host path -> container (bidirectional, host owns the data)
# Named volume: Docker manages storage (container-first, survives removal)
#
# Use bind mounts for:     dev hot-reload, local config files
# Use named volumes for:   database data, model artifacts, logs

# ── Common pitfall: permission mismatch ───────────────────────────────
# Host user UID may not match container user UID
# Fix 1: Match UIDs
docker run --rm \\
  --user "\$(id -u):\$(id -g)" \\
  -v "\$(pwd)/src:/app/src" \\
  recsys-inference:1.0.0 ls -la /app/src

# Fix 2: Use fixuid (add to Dockerfile)
# RUN curl -SsL https://github.com/boxboat/fixuid/releases/... | tar -C /usr/local/bin -xzf -

# ── tmpfs for temporary/scratch data ──────────────────────────────────
# In-memory filesystem — fast, but data lost when container stops
docker run -d \\
  --name recsys-api-prod \\
  --read-only \\
  --tmpfs /tmp:rw,noexec,nosuid,size=200m \\
  --tmpfs /app/.cache:rw,noexec,size=100m \\
  -v recsys-models:/app/models:ro \\
  recsys-inference:1.0.0`,
          notes: [
            "Bind mounts are bidirectional — changes on the host appear in the container and vice versa. This is powerful for development but a security concern in production.",
            "uvicorn --reload watches for file changes and restarts the server. Combined with bind mounts, this gives near-instant feedback during development.",
            "Permission mismatches (host UID 501 vs container UID 1000) are the most common bind mount issue. Use --user or fixuid to resolve.",
            "tmpfs mounts are in-memory and perfect for scratch files, caches, and /tmp — they disappear when the container stops, which is exactly what you want for ephemeral data.",
            "Never use bind mounts in production — they create a dependency on the host filesystem structure. Named volumes are portable and Docker-managed.",
          ]
        },
        {
          title: "Network Debugging with netshoot",
          desc: "When containers cannot communicate, use nicolaka/netshoot — a debug container packed with networking tools — to diagnose connectivity issues.",
          lang: "bash",
          filename: "debug-networking.sh",
          code: `#!/usr/bin/env bash
set -euo pipefail

# ── Attach a debug container to the same network ─────────────────────
docker run --rm -it \\
  --network recsys-net \\
  nicolaka/netshoot

# Inside netshoot:
#   dig recsys-redis          # DNS resolution
#   ping -c 3 recsys-postgres # ICMP connectivity
#   nslookup cache            # Alias resolution
#   curl http://recsys-api:8000/health  # HTTP test
#   tcpdump -i eth0 port 6379 # Capture Redis traffic
#   ss -tlnp                  # List listening ports

# ── Debug from the perspective of a specific container ────────────────
# Share network AND PID namespace with the target container
docker run --rm -it \\
  --network container:recsys-api \\
  --pid container:recsys-api \\
  nicolaka/netshoot

# Inside netshoot (now in recsys-api's network namespace):
#   ss -tlnp                  # See what ports recsys-api is listening on
#   curl localhost:8000/health # Access as localhost (same net namespace)
#   ps aux                    # See recsys-api's processes (shared PID ns)
#   strace -p 1               # Trace syscalls of the main process

# ── Quick DNS check without interactive shell ─────────────────────────
docker run --rm \\
  --network recsys-net \\
  nicolaka/netshoot \\
  dig +short recsys-redis recsys-postgres recsys-api

# ── Port connectivity check ──────────────────────────────────────────
docker run --rm \\
  --network recsys-net \\
  nicolaka/netshoot \\
  sh -c '
    for svc in "recsys-redis 6379" "recsys-postgres 5432" "recsys-api 8000"; do
      set -- \$svc
      nc -zv "\$1" "\$2" 2>&1
    done
  '`,
          notes: [
            "netshoot includes curl, dig, nslookup, ping, tcpdump, ss, nmap, strace, and dozens more tools — everything you need to debug container networking.",
            "Using --network container:TARGET puts netshoot into the same network namespace as the target, so localhost refers to the target's loopback — essential for debugging port binding issues.",
            "Sharing the PID namespace (--pid container:TARGET) lets you see the target's processes and even strace them — useful for debugging hanging connections.",
            "Never install debugging tools in production images — they increase attack surface. Use ephemeral debug containers instead.",
          ]
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 5: Docker Compose — Full ML Stack
    // ═══════════════════════════════════════════════════════════════════════════
    {
      id: "compose-ml",
      title: "Docker Compose — Full ML Stack",
      icon: "🐙",
      items: [
        {
          title: "Complete compose.yml — RecSys ML Stack",
          desc: "Production-grade Compose file for the full recommendation system: FastAPI inference API, model server, Redis feature/prediction cache, PostgreSQL for logging, and Celery worker for async processing.",
          lang: "yaml",
          filename: "compose.yml",
          code: `# compose.yml — RecSys ML Inference Stack
# Start:    docker compose up -d
# Logs:     docker compose logs -f api
# Teardown: docker compose down -v (removes volumes too)

services:

  # ── PostgreSQL — request logging + A/B experiment tracking ─────────
  postgres:
    image: postgres:16-alpine
    container_name: recsys-postgres
    environment:
      POSTGRES_DB: recsys
      POSTGRES_USER: recsys
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    secrets:
      - db_password
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./db/init.sql:/docker-entrypoint-initdb.d/01-schema.sql:ro
    networks: [recsys-net]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U recsys -d recsys"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 15s
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: "1.0"
    restart: unless-stopped

  # ── Redis — feature cache + prediction cache + rate limiting ───────
  redis:
    image: redis:7.2-alpine
    container_name: recsys-redis
    command: >
      redis-server
      --maxmemory 512mb
      --maxmemory-policy allkeys-lru
      --save 60 1000
      --appendonly yes
      --requirepass \\\${REDIS_PASSWORD:-changeme}
    volumes:
      - redis-data:/data
    networks: [recsys-net]
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "\\\${REDIS_PASSWORD:-changeme}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits:
          memory: 768M
          cpus: "0.5"
    restart: unless-stopped

  # ── Model Server — serves PyTorch models via gRPC ──────────────────
  model-server:
    build:
      context: ./model-server
      dockerfile: Dockerfile
    container_name: recsys-model-server
    volumes:
      - models:/app/models:ro
    environment:
      MODEL_PATH: /app/models/recommendation.pt
      GRPC_PORT: "50051"
      NUM_WORKERS: "2"
      OMP_NUM_THREADS: "4"
    networks: [recsys-net]
    healthcheck:
      test: ["CMD", "python3", "-c", "import grpc; ch=grpc.insecure_channel('localhost:50051'); grpc.channel_ready_future(ch).result(timeout=5)"]
      interval: 15s
      timeout: 10s
      retries: 5
      start_period: 30s
    deploy:
      resources:
        limits:
          memory: 4G
          cpus: "4.0"
    restart: unless-stopped

  # ── FastAPI Inference API — public-facing HTTP endpoint ────────────
  api:
    build:
      context: .
      dockerfile: Dockerfile
      target: runtime
    container_name: recsys-api
    depends_on:
      postgres:  { condition: service_healthy }
      redis:     { condition: service_healthy }
      model-server: { condition: service_healthy }
    ports:
      - "127.0.0.1:8000:8000"
    environment:
      DATABASE_URL: postgresql+asyncpg://recsys:\\\${DB_PASSWORD}@postgres:5432/recsys
      REDIS_URL: redis://:\\\${REDIS_PASSWORD:-changeme}@redis:6379/0
      MODEL_SERVER_URL: model-server:50051
      ENVIRONMENT: production
      LOG_LEVEL: info
      WORKERS: "4"
    env_file:
      - .env
    networks: [recsys-net]
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 15s
      timeout: 5s
      retries: 3
      start_period: 10s
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: "2.0"
    read_only: true
    tmpfs:
      - /tmp:size=100M
    security_opt:
      - no-new-privileges:true
    restart: unless-stopped

  # ── Celery Worker — async tasks (batch predictions, logging) ───────
  worker:
    build:
      context: .
      dockerfile: Dockerfile
      target: runtime
    container_name: recsys-worker
    depends_on:
      postgres: { condition: service_healthy }
      redis:    { condition: service_healthy }
    command: ["celery", "-A", "src.tasks", "worker", "--loglevel=info", "--concurrency=4"]
    environment:
      DATABASE_URL: postgresql+asyncpg://recsys:\\\${DB_PASSWORD}@postgres:5432/recsys
      CELERY_BROKER_URL: redis://:\\\${REDIS_PASSWORD:-changeme}@redis:6379/1
      CELERY_RESULT_BACKEND: redis://:\\\${REDIS_PASSWORD:-changeme}@redis:6379/2
    env_file:
      - .env
    networks: [recsys-net]
    healthcheck:
      test: ["CMD", "celery", "-A", "src.tasks", "inspect", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 15s
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: "2.0"
    restart: unless-stopped

  # ── pgAdmin (dev/debug profile only) ───────────────────────────────
  pgadmin:
    image: dpage/pgadmin4:8.3
    container_name: recsys-pgadmin
    profiles: [debug]
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@recsys.local
      PGADMIN_DEFAULT_PASSWORD: admin
    ports:
      - "127.0.0.1:5050:80"
    networks: [recsys-net]
    depends_on:
      postgres: { condition: service_healthy }

volumes:
  pgdata:
    labels:
      project: recsys
      type: database
  redis-data:
    labels:
      project: recsys
      type: cache
  models:
    labels:
      project: recsys
      type: models

networks:
  recsys-net:
    driver: bridge
    labels:
      project: recsys

secrets:
  db_password:
    file: ./secrets/db_password.txt`,
          notes: [
            "depends_on with condition: service_healthy ensures services start in the correct order AND wait for health checks to pass — without conditions, depends_on only waits for container start, not readiness.",
            "Binding to 127.0.0.1:8000 instead of 0.0.0.0:8000 prevents the API from being accessible on the public network interface — use a reverse proxy (nginx/traefik) for public access.",
            "Compose secrets (file-based) mount the secret at /run/secrets/db_password as a read-only file. POSTGRES_PASSWORD_FILE reads from this path — more secure than passing via environment variable.",
            "The debug profile (profiles: [debug]) excludes pgAdmin from normal 'docker compose up'. Use 'docker compose --profile debug up' to include it.",
            "deploy.resources.limits set memory and CPU caps per service — critical for ML workloads where a model server could otherwise consume all available resources.",
          ]
        },
        {
          title: ".env File Management",
          desc: "Environment variables for the Compose stack. The .env file is used by Compose for variable interpolation; env_file directives load vars into containers.",
          lang: "bash",
          filename: ".env.example",
          code: `# .env.example — Copy to .env and fill in values
# This file is used by Docker Compose for variable interpolation
# NEVER commit .env to git — only commit .env.example

# ── Database ──────────────────────────────────────────────────────────
DB_PASSWORD=your-strong-password-here
POSTGRES_DB=recsys
POSTGRES_USER=recsys

# ── Redis ─────────────────────────────────────────────────────────────
REDIS_PASSWORD=your-redis-password-here

# ── API Configuration ────────────────────────────────────────────────
ENVIRONMENT=production
LOG_LEVEL=info
API_KEY=your-api-key-for-clients

# ── Model Configuration ──────────────────────────────────────────────
MODEL_VERSION=v2.1.0
MODEL_BATCH_SIZE=32
INFERENCE_TIMEOUT_MS=100

# ── Observability ────────────────────────────────────────────────────
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317
SENTRY_DSN=

# ── Registry (for CI/CD) ─────────────────────────────────────────────
REGISTRY=ghcr.io/company/recsys
IMAGE_TAG=latest`,
          notes: [
            "The .env file at the Compose file level is automatically loaded for variable interpolation in compose.yml (the \\$\\{VAR} syntax). This is separate from env_file which loads into containers.",
            "Always provide a .env.example with dummy values and add .env to .gitignore. This documents required variables without leaking real secrets.",
            "For production, use Docker secrets or external secret managers (Vault, AWS Secrets Manager) instead of .env files — env vars are visible in docker inspect.",
            "INFERENCE_TIMEOUT_MS should be tuned based on your model's p99 latency — set it high enough to avoid false timeouts, low enough to fail fast on stuck inferences.",
          ]
        },
        {
          title: "compose.override.yml — Dev vs Prod",
          desc: "Compose automatically merges compose.override.yml on top of compose.yml. Use it for development-specific config: bind mounts for hot-reload, debug ports, verbose logging.",
          lang: "yaml",
          filename: "compose.override.yml",
          code: `# compose.override.yml — DEVELOPMENT overrides
# Auto-merged with compose.yml when running: docker compose up
# For production: docker compose -f compose.yml -f compose.prod.yml up

services:

  api:
    # Override command for hot-reload in development
    command: ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload", "--reload-dir", "/app/src"]
    # Bind mount source code for live editing
    volumes:
      - ./src:/app/src
      - ./main.py:/app/main.py
      - ./tests:/app/tests
    environment:
      ENVIRONMENT: development
      LOG_LEVEL: debug
    # Remove read-only filesystem for development
    read_only: false
    # Expose debug port
    ports:
      - "127.0.0.1:8000:8000"
      - "127.0.0.1:5678:5678"    # debugpy remote debugging

  worker:
    command: ["celery", "-A", "src.tasks", "worker", "--loglevel=debug", "--concurrency=2"]
    volumes:
      - ./src:/app/src
    environment:
      LOG_LEVEL: debug

  postgres:
    ports:
      - "127.0.0.1:5432:5432"   # Expose for local DB tools

  redis:
    ports:
      - "127.0.0.1:6379:6379"   # Expose for redis-cli`,
          notes: [
            "compose.override.yml is merged automatically (no -f flag needed). This is the recommended pattern for dev overrides — just run 'docker compose up'.",
            "For production, explicitly specify files: 'docker compose -f compose.yml -f compose.prod.yml up' — this skips the override file entirely.",
            "Bind mounts in override replace the read_only: true setting from the base file, allowing live code editing during development.",
            "Exposing database ports (5432, 6379) is only safe in development. The override file adds these while the base compose.yml keeps them internal-only.",
            "debugpy on port 5678 enables remote debugging from VS Code — add 'import debugpy; debugpy.listen((\"0.0.0.0\", 5678))' to main.py for dev.",
          ]
        },
        {
          title: "Compose Profiles and Operational Commands",
          desc: "Profiles partition services into groups (default, debug, monitoring). Operational commands for day-to-day management of the ML stack.",
          lang: "bash",
          filename: "compose-operations.sh",
          code: `#!/usr/bin/env bash
set -euo pipefail

# ── Start the core stack (default profile) ────────────────────────────
docker compose up -d
# Starts: postgres, redis, model-server, api, worker
# Skips:  pgadmin (debug profile)

# ── Include debug tools ───────────────────────────────────────────────
docker compose --profile debug up -d
# Also starts: pgadmin

# ── View logs (follow mode, specific services) ───────────────────────
docker compose logs -f api model-server
docker compose logs --since 5m worker

# ── Scale workers for batch processing ───────────────────────────────
docker compose up -d --scale worker=4
# Runs 4 Celery worker containers for parallel batch predictions

# ── Rolling restart (one service at a time) ───────────────────────────
docker compose up -d --no-deps api
# Recreates only the api service without touching its dependencies

# ── Health check status ──────────────────────────────────────────────
docker compose ps --format "table {{.Name}}\\t{{.Status}}\\t{{.Ports}}"

# ── Resource usage across all services ────────────────────────────────
docker compose stats --no-stream

# ── Run one-off commands ──────────────────────────────────────────────
# Database migration
docker compose exec api alembic upgrade head

# Run tests inside the API container
docker compose run --rm api pytest tests/ -v

# Open a shell in the model server
docker compose exec model-server /bin/bash

# ── Graceful shutdown ─────────────────────────────────────────────────
docker compose down          # Stop and remove containers + default network
docker compose down -v       # Also remove named volumes (DATA LOSS)
docker compose down --rmi all  # Also remove built images`,
          notes: [
            "docker compose up -d --scale worker=4 is an easy way to parallelise batch processing without changing the compose.yml file.",
            "--no-deps prevents cascading restarts: updating the API does not restart PostgreSQL or Redis, avoiding unnecessary downtime.",
            "docker compose run --rm creates a one-off container (with deps) for ad-hoc tasks. The --rm flag ensures cleanup after the command finishes.",
            "docker compose down -v removes named volumes — this is destructive and deletes all database data. Never use -v in production unless you intend full data reset.",
            "docker compose stats shows live resource usage for all services in a single view — essential for identifying memory leaks or CPU spikes in the ML stack.",
          ]
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 6: Security Hardening
    // ═══════════════════════════════════════════════════════════════════════════
    {
      id: "security",
      title: "Security Hardening",
      icon: "🔒",
      items: [
        {
          title: "Non-Root User Setup",
          desc: "Running containers as root is the single biggest security risk. This example shows how to properly configure a non-root user for the ML inference container.",
          lang: "docker",
          filename: "Dockerfile.nonroot",
          code: `# syntax=docker/dockerfile:1.7
# ── Non-root user setup for ML inference ─────────────────────────────

FROM python:3.12.3-slim-bookworm AS runtime

# Create a dedicated user and group with explicit IDs
# Using numeric IDs avoids issues with /etc/passwd resolution in minimal images
RUN groupadd --gid 1000 recsys && \\
    useradd --uid 1000 --gid recsys \\
      --shell /usr/sbin/nologin \\
      --no-log-init \\
      --create-home \\
      recsys

# Install dependencies AS ROOT (needs write to /usr)
RUN apt-get update && \\
    apt-get install -y --no-install-recommends \\
      libpq5 curl tini \\
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy application files and set ownership in one layer
COPY --from=builder --chown=recsys:recsys /opt/venv /opt/venv
COPY --chown=recsys:recsys ./src /app/src
COPY --chown=recsys:recsys ./main.py /app/

# Create writable directories owned by the app user
RUN mkdir -p /app/models /app/.cache && \\
    chown -R recsys:recsys /app/models /app/.cache

# Switch to non-root user — all subsequent instructions run as recsys
USER recsys

# Verify (build will fail if user switch did not work)
RUN whoami && id

ENTRYPOINT ["tini", "--"]
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]`,
          notes: [
            "Install system packages (apt-get) before USER switch — non-root users cannot install system packages. All apt-get calls must happen while still root.",
            "Use --no-log-init to prevent a known vulnerability where large UID values can cause a DoS via a huge /var/log/lastlog file.",
            "/usr/sbin/nologin as the shell prevents interactive login to this user account — defense in depth against container escape.",
            "--chown in COPY sets ownership in the same layer as the copy, avoiding a separate RUN chown that creates an extra layer with duplicate data.",
            "Always use numeric UIDs (1000:1000) in Kubernetes deployments — runAsUser in pod security context requires numeric IDs, not names.",
          ]
        },
        {
          title: "Read-Only Filesystem + tmpfs",
          desc: "A read-only root filesystem prevents an attacker from modifying binaries, installing malware, or creating reverse shells. tmpfs provides writable space for legitimate temporary files.",
          lang: "bash",
          filename: "readonly-run.sh",
          code: `#!/usr/bin/env bash
set -euo pipefail

# ── Run with read-only filesystem ─────────────────────────────────────
docker run -d \\
  --name recsys-api \\
  --read-only \\
  --tmpfs /tmp:rw,noexec,nosuid,size=100m \\
  --tmpfs /app/.cache:rw,noexec,size=50m \\
  --tmpfs /var/run:rw,noexec,nosuid,size=10m \\
  -v recsys-models:/app/models:ro \\
  recsys-inference:1.0.0

# ── What --read-only blocks ───────────────────────────────────────────
# Attempting to write anywhere except tmpfs or volumes will fail:
docker exec recsys-api sh -c 'echo "test" > /app/malicious.py' 2>&1
# Output: sh: /app/malicious.py: Read-only file system

# ── tmpfs flags explained ─────────────────────────────────────────────
# rw       — writable (needed for /tmp)
# noexec   — prevent executing binaries from tmpfs (blocks dropped payloads)
# nosuid   — prevent setuid bit exploitation
# size=100m — cap total tmpfs usage (prevent memory exhaustion)

# ── Common writable paths needed by Python apps ──────────────────────
# /tmp                    — temporary files, multiprocessing locks
# /app/.cache             — ML model inference caches
# /var/run                — PID files, UNIX sockets
# /home/recsys/.local     — pip cache (if pip runs at startup)

# ── Debugging read-only issues ────────────────────────────────────────
# Find what paths the app tries to write to:
docker run --rm \\
  --security-opt seccomp=unconfined \\
  recsys-inference:1.0.0 \\
  strace -f -e trace=openat,mkdir -o /dev/stderr uvicorn main:app 2>&1 | \\
  grep "O_WRONLY\\|O_RDWR\\|O_CREAT" | head -20
# Add tmpfs mounts for each discovered writable path`,
          notes: [
            "--read-only makes the entire container root filesystem read-only, preventing binary modification, malware installation, and config tampering.",
            "noexec on tmpfs prevents an attacker from writing and executing a payload in /tmp — a common post-exploitation technique.",
            "Size limits on tmpfs prevent a bug or attacker from writing unlimited data to in-memory tmpfs, which would consume host RAM.",
            "Python applications commonly need writable /tmp (for tempfile module) and sometimes /.local or .cache — use strace to discover which paths need tmpfs.",
            "Read-only + tmpfs is not a silver bullet — an attacker with code execution can still exfiltrate data via network. It is one layer of defense in depth.",
          ]
        },
        {
          title: "Capability Dropping and Security Options",
          desc: "Linux capabilities break root privileges into granular units. Dropping all capabilities and adding back only what is needed follows the principle of least privilege.",
          lang: "bash",
          filename: "capabilities.sh",
          code: `#!/usr/bin/env bash
set -euo pipefail

# ── Drop ALL capabilities, add none ──────────────────────────────────
# ML inference APIs typically need zero capabilities
docker run -d \\
  --name recsys-api \\
  --cap-drop ALL \\
  --security-opt no-new-privileges \\
  --security-opt apparmor=docker-default \\
  --user 1000:1000 \\
  --read-only \\
  --tmpfs /tmp:rw,noexec,nosuid,size=100m \\
  recsys-inference:1.0.0

# ── Verify capabilities are dropped ──────────────────────────────────
docker exec recsys-api cat /proc/1/status | grep Cap
# CapEff: 0000000000000000 (no effective capabilities)

# ── What if you need specific capabilities? ───────────────────────────
# Example: binding to port 80 (requires NET_BIND_SERVICE)
docker run -d \\
  --cap-drop ALL \\
  --cap-add NET_BIND_SERVICE \\
  --user 1000:1000 \\
  recsys-inference:1.0.0

# ── Common capabilities and when you need them ───────────────────────
# NET_BIND_SERVICE  — bind to ports < 1024 as non-root
# SYS_PTRACE        — strace / debugging (NEVER in production)
# NET_RAW           — ping (useful for health checks, but usually not needed)
# CHOWN             — change file ownership (usually only needed in entrypoint scripts)
# DAC_OVERRIDE      — bypass file permission checks (security risk — avoid)

# ── Custom seccomp profile ────────────────────────────────────────────
# Docker's default seccomp profile blocks 44 dangerous syscalls
# For ML workloads, you can tighten further:
docker run -d \\
  --security-opt seccomp=./seccomp-recsys.json \\
  --cap-drop ALL \\
  recsys-inference:1.0.0

# ── Generate a custom seccomp profile (trace what syscalls are used) ──
# Run with seccomp logging to see which syscalls your app actually uses:
docker run --rm \\
  --security-opt seccomp=unconfined \\
  recsys-inference:1.0.0 \\
  timeout 30 strace -c -f uvicorn main:app 2>&1 | tail -30
# Use the output to build a minimal seccomp allow-list`,
          notes: [
            "--cap-drop ALL removes all 41 Linux capabilities. Most applications (especially inference APIs) need zero capabilities to function.",
            "no-new-privileges prevents any process in the container from gaining new privileges via setuid/setgid binaries — critical even with non-root USER.",
            "Capabilities and no-new-privileges are complementary: --cap-drop ALL removes current capabilities, no-new-privileges prevents future escalation.",
            "Custom seccomp profiles reduce the kernel attack surface by allowing only the syscalls your application actually uses — trace with strace first to build the allow-list.",
            "Never add SYS_PTRACE or SYS_ADMIN in production — SYS_PTRACE allows container escape via process injection, SYS_ADMIN grants near-root powers.",
          ]
        },
        {
          title: "Trivy Image Scanning",
          desc: "Scan images for OS and library vulnerabilities. Integrate Trivy into the build pipeline to catch CVEs before they reach production.",
          lang: "bash",
          filename: "trivy-scan.sh",
          code: `#!/usr/bin/env bash
set -euo pipefail

IMAGE="recsys-inference:1.0.0"

# ── Full vulnerability scan ───────────────────────────────────────────
docker run --rm \\
  -v /var/run/docker.sock:/var/run/docker.sock \\
  -v trivy-cache:/root/.cache/trivy \\
  aquasec/trivy:latest image \\
  --severity CRITICAL,HIGH \\
  --exit-code 1 \\
  "\$IMAGE"

# exit-code 1 makes the command fail if CRITICAL or HIGH CVEs are found
# Use this in CI to block deployment of vulnerable images

# ── Scan with JSON output (for CI parsing) ────────────────────────────
docker run --rm \\
  -v /var/run/docker.sock:/var/run/docker.sock \\
  -v trivy-cache:/root/.cache/trivy \\
  aquasec/trivy:latest image \\
  --format json \\
  --output /dev/stdout \\
  "\$IMAGE" | python3 -c "
import json, sys
results = json.load(sys.stdin).get('Results', [])
for r in results:
    for v in r.get('Vulnerabilities', []):
        if v['Severity'] in ('CRITICAL', 'HIGH'):
            print(f\"{v['Severity']:8s} {v['VulnerabilityID']:15s} {v['PkgName']:30s} {v.get('FixedVersion', 'no fix')}\")
"

# ── Scan only the application dependencies (not OS) ──────────────────
docker run --rm \\
  -v "\$(pwd):/src:ro" \\
  aquasec/trivy:latest fs \\
  --scanners vuln \\
  --severity CRITICAL,HIGH \\
  /src/requirements.lock

# ── Generate SBOM (Software Bill of Materials) ───────────────────────
docker run --rm \\
  -v /var/run/docker.sock:/var/run/docker.sock \\
  aquasec/trivy:latest image \\
  --format spdx-json \\
  --output /dev/stdout \\
  "\$IMAGE" > sbom.spdx.json

# ── Compare before/after base image change ────────────────────────────
echo "=== Scanning python:3.12 (full) ==="
docker run --rm aquasec/trivy:latest image --severity CRITICAL,HIGH python:3.12 2>/dev/null | tail -3

echo "=== Scanning python:3.12-slim ==="
docker run --rm aquasec/trivy:latest image --severity CRITICAL,HIGH python:3.12-slim 2>/dev/null | tail -3

echo "=== Scanning distroless ==="
docker run --rm aquasec/trivy:latest image --severity CRITICAL,HIGH gcr.io/distroless/python3-debian12 2>/dev/null | tail -3`,
          notes: [
            "--exit-code 1 makes Trivy return a non-zero exit code when vulnerabilities above the threshold are found — essential for CI gate enforcement.",
            "Cache the Trivy vulnerability database (trivy-cache volume) to avoid re-downloading ~30 MB on every scan. In CI, use GitHub Actions cache or a pre-built DB image.",
            "Scanning requirements.lock with 'trivy fs' catches Python library CVEs without building the image first — shift security left in the pipeline.",
            "SBOM (Software Bill of Materials) in SPDX format provides a machine-readable inventory of all packages — increasingly required for supply-chain compliance.",
            "Switching from python:3.12 to python:3.12-slim typically eliminates 50-100 CVEs. Switching to distroless eliminates even more.",
          ]
        },
        {
          title: "BuildKit Secrets for Private PyPI",
          desc: "When your ML model depends on private Python packages, use BuildKit --mount=type=secret to inject the PyPI token during build without leaking it into any image layer.",
          lang: "docker",
          filename: "Dockerfile.private-pypi",
          code: `# syntax=docker/dockerfile:1.7
# ──────────────────────────────────────────────────────────────────────
# Installing from a private PyPI registry securely
# The token NEVER appears in any layer or docker history
# ──────────────────────────────────────────────────────────────────────

FROM python:3.12.3-slim-bookworm AS builder

WORKDIR /build
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:\$PATH"

# Mount the PyPI token as a secret during pip install
# The secret is available only during this RUN instruction
# It does NOT exist in the resulting layer
RUN --mount=type=secret,id=pypi_token \\
    --mount=type=cache,target=/root/.cache/pip \\
    pip install \\
      --extra-index-url "https://__token__:\$(cat /run/secrets/pypi_token)@pypi.company.com/simple/" \\
      -r requirements.txt

# ── Verify the secret is not in any layer ─────────────────────────────
# After building, check:
#   docker history recsys-inference:1.0.0
#   docker inspect recsys-inference:1.0.0
# Neither will show the token value

# ── Build command ─────────────────────────────────────────────────────
# docker build --secret id=pypi_token,src=./secrets/pypi-token.txt -t recsys-inference:1.0.0 .

# ── WRONG WAY (DO NOT DO THIS) ───────────────────────────────────────
# ARG PYPI_TOKEN
# RUN pip install --extra-index-url "https://\$PYPI_TOKEN@pypi.company.com/..." ...
# The token is visible in:
#   docker history --no-trunc
#   The layer's filesystem (docker save | tar xf)
#   docker inspect (in Env or Cmd arrays)

FROM python:3.12.3-slim-bookworm AS runtime
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:\$PATH"
COPY --chown=1000:1000 ./src /app/src
USER 1000:1000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]`,
          notes: [
            "BuildKit secrets are mounted only during the RUN instruction and never written to any image layer. Even docker history --no-trunc will not reveal the value.",
            "The ARG approach is insecure because ARG values are recorded in the image metadata and visible via docker history and docker inspect.",
            "In CI, pass the secret from a GitHub Actions secret or Vault: docker build --secret id=pypi_token,env=PYPI_TOKEN (reads from environment variable).",
            "For SSH-based private repos (git+ssh://), use --mount=type=ssh to forward your SSH agent instead of copying keys into the build.",
            "Always use a separate builder stage so that even if the secret were somehow captured, it would not exist in the final runtime image.",
          ]
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 7: CI/CD Pipeline
    // ═══════════════════════════════════════════════════════════════════════════
    {
      id: "cicd",
      title: "CI/CD Pipeline",
      icon: "🚀",
      items: [
        {
          title: "GitHub Actions: Build, Scan, Push Workflow",
          desc: "Complete CI pipeline for the RecSys inference image: lint Dockerfile, run tests, build with BuildKit + cache, scan with Trivy, push to GHCR with semantic tags.",
          lang: "yaml",
          filename: ".github/workflows/docker-build.yml",
          code: `# .github/workflows/docker-build.yml
name: Build & Push RecSys Image

on:
  push:
    branches: [main]
    tags: ["v*"]
  pull_request:
    branches: [main]
    paths:
      - "src/**"
      - "Dockerfile"
      - "requirements.lock"
      - ".github/workflows/docker-build.yml"

permissions:
  contents: read
  packages: write        # Push to GHCR
  security-events: write # Upload Trivy SARIF

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: \\\${{ github.repository }}/recsys-inference

jobs:
  # ── Step 1: Lint Dockerfile ───────────────────────────────────────
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hadolint/hadolint-action@v3.1.0
        with:
          dockerfile: Dockerfile
          failure-threshold: warning

  # ── Step 2: Run tests ─────────────────────────────────────────────
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
          cache: pip
      - run: pip install -r requirements.lock
      - run: pytest tests/ -v --tb=short

  # ── Step 3: Build, scan, and push ─────────────────────────────────
  build:
    needs: [lint, test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Set up Docker Buildx (BuildKit)
      - uses: docker/setup-buildx-action@v3

      # Login to GHCR (skip on PRs from forks)
      - uses: docker/login-action@v3
        if: github.event_name != 'pull_request'
        with:
          registry: \\\${{ env.REGISTRY }}
          username: \\\${{ github.actor }}
          password: \\\${{ secrets.GITHUB_TOKEN }}

      # Generate tags and labels from git context
      - uses: docker/metadata-action@v5
        id: meta
        with:
          images: \\\${{ env.REGISTRY }}/\\\${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=sha,prefix=,format=short
          labels: |
            org.opencontainers.image.title=recsys-inference
            org.opencontainers.image.description=ML Recommendation Inference API

      # Build and push (with BuildKit GHA cache)
      - uses: docker/build-push-action@v5
        id: build
        with:
          context: .
          push: \\\${{ github.event_name != 'pull_request' }}
          tags: \\\${{ steps.meta.outputs.tags }}
          labels: \\\${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          platforms: linux/amd64
          provenance: true
          sbom: true

      # Scan with Trivy
      - uses: aquasecurity/trivy-action@master
        with:
          image-ref: \\\${{ env.REGISTRY }}/\\\${{ env.IMAGE_NAME }}:\\\${{ steps.meta.outputs.version }}
          format: sarif
          output: trivy-results.sarif
          severity: CRITICAL,HIGH
          exit-code: "1"

      # Upload scan results to GitHub Security tab
      - uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: trivy-results.sarif

      # Print image digest for verification
      - run: echo "Image digest - \\\${{ steps.build.outputs.digest }}"`,
          notes: [
            "The paths filter on pull_request prevents CI from running when unrelated files change — saves compute and reduces feedback time.",
            "docker/metadata-action generates tags automatically: v1.2.3 creates tags for 1.2.3, 1.2, and the git SHA — no manual tag management needed.",
            "GHA cache (type=gha) uses the GitHub Actions cache API — no registry needed for caching. mode=max exports all layers, not just the final stage.",
            "provenance: true and sbom: true attach SLSA provenance attestation and Software Bill of Materials to the image — required for supply-chain security compliance.",
            "Trivy results in SARIF format are uploaded to GitHub's Security tab, providing a dashboard of vulnerabilities across all builds.",
          ]
        },
        {
          title: "BuildKit Cache Strategies for CI",
          desc: "Different cache strategies for different CI environments. The right choice depends on whether you have registry access, GitHub Actions, or a self-hosted runner.",
          lang: "yaml",
          filename: "cache-strategies.yml",
          code: `# ── Strategy 1: GitHub Actions Cache (GHA) ────────────────────────────
# Best for: GitHub Actions workflows
# Pros: No registry needed, free with Actions minutes
# Cons: 10 GB cache limit per repo, not shared across repos
- uses: docker/build-push-action@v5
  with:
    cache-from: type=gha
    cache-to: type=gha,mode=max

# ── Strategy 2: Registry Cache ────────────────────────────────────────
# Best for: Self-hosted CI, GitLab CI, or when GHA cache is full
# Pros: Unlimited size, shared across all CI runners
# Cons: Registry egress costs, slightly slower than local cache
- uses: docker/build-push-action@v5
  with:
    cache-from: type=registry,ref=ghcr.io/company/recsys-inference:cache
    cache-to: type=registry,ref=ghcr.io/company/recsys-inference:cache,mode=max

# ── Strategy 3: Local Cache (self-hosted runners) ────────────────────
# Best for: Persistent self-hosted runners with fast local storage
# Pros: Fastest, no network transfer
# Cons: Only works on the same runner, disk management needed
- uses: docker/build-push-action@v5
  with:
    cache-from: type=local,src=/tmp/.buildx-cache
    cache-to: type=local,dest=/tmp/.buildx-cache-new,mode=max
# Move cache to avoid unbounded growth:
- run: |
    rm -rf /tmp/.buildx-cache
    mv /tmp/.buildx-cache-new /tmp/.buildx-cache

# ── Strategy 4: Inline Cache (simplest) ──────────────────────────────
# Best for: Simple setups, small images
# Pros: No extra infrastructure, cache lives in the image itself
# Cons: Only caches final stage layers, not intermediate stages
- uses: docker/build-push-action@v5
  with:
    cache-from: type=registry,ref=ghcr.io/company/recsys-inference:latest
    build-args: BUILDKIT_INLINE_CACHE=1

# ── ML-Specific: Cache pip downloads + model weights ─────────────────
# In the Dockerfile, use cache mounts for maximum benefit:
#   RUN --mount=type=cache,target=/root/.cache/pip pip install ...
#   RUN --mount=type=cache,target=/root/.cache/models python download_model.py
# These cache mounts are preserved by BuildKit's cache export`,
          notes: [
            "mode=max exports all layers from all stages (including intermediate build stages). Without it, only the final stage layers are cached — much less effective for multi-stage builds.",
            "GHA cache has a 10 GB per-repo limit. ML images with PyTorch can easily exceed this. If you hit the limit, switch to registry cache or prune stale cache entries.",
            "Registry cache with mode=max is the most robust strategy for teams — it works across all CI runners and scales with your registry.",
            "Local cache on self-hosted runners requires the move trick (cache-new -> cache) to prevent unbounded growth. Without it, each build appends to the cache directory.",
            "Inline cache (BUILDKIT_INLINE_CACHE=1) embeds cache metadata in the image itself. Simple but only caches final stage — use mode=max for multi-stage builds.",
          ]
        },
        {
          title: "Multi-Architecture Build in CI",
          desc: "Build for both amd64 (Intel/AMD servers) and arm64 (AWS Graviton, Apple Silicon) in a single CI pipeline. Graviton instances are 20% cheaper, so arm64 support saves money.",
          lang: "yaml",
          filename: ".github/workflows/multi-arch.yml",
          code: `# Multi-architecture build job
# Produces a manifest list: one tag -> amd64 + arm64 images
multi-arch-build:
  needs: [lint, test]
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4

    # QEMU emulator for arm64 on amd64 runners
    - uses: docker/setup-qemu-action@v3
      with:
        platforms: arm64

    - uses: docker/setup-buildx-action@v3

    - uses: docker/login-action@v3
      with:
        registry: ghcr.io
        username: \\\${{ github.actor }}
        password: \\\${{ secrets.GITHUB_TOKEN }}

    - uses: docker/metadata-action@v5
      id: meta
      with:
        images: ghcr.io/\\\${{ github.repository }}/recsys-inference
        tags: |
          type=semver,pattern={{version}}
          type=sha,prefix=,format=short

    # Build for both architectures
    - uses: docker/build-push-action@v5
      with:
        context: .
        platforms: linux/amd64,linux/arm64
        push: true
        tags: \\\${{ steps.meta.outputs.tags }}
        labels: \\\${{ steps.meta.outputs.labels }}
        cache-from: type=gha
        cache-to: type=gha,mode=max

    # Verify manifest list
    - run: |
        docker buildx imagetools inspect ghcr.io/\\\${{ github.repository }}/recsys-inference:\\\${{ steps.meta.outputs.version }}

# ── Expected output of imagetools inspect ────────────────────────────
# Name:      ghcr.io/company/recsys-inference:1.0.0
# MediaType: application/vnd.oci.image.index.v1+json
# Manifests:
#   Name:     ghcr.io/company/recsys-inference:1.0.0@sha256:abc...
#   Platform: linux/amd64
#
#   Name:     ghcr.io/company/recsys-inference:1.0.0@sha256:def...
#   Platform: linux/arm64`,
          notes: [
            "QEMU emulation allows building arm64 images on amd64 runners. It is 3-5x slower than native but eliminates the need for arm64 CI runners.",
            "For faster multi-arch builds, use native arm64 runners (GitHub offers them as larger runners) and merge manifests separately.",
            "The resulting manifest list means 'docker pull recsys:1.0.0' automatically selects the correct architecture — no user intervention needed.",
            "PyTorch wheel availability differs by architecture. Verify that all Python dependencies have arm64 wheels, or they will be compiled from source (very slow under QEMU).",
            "AWS Graviton (arm64) instances are 20% cheaper than equivalent x86 instances. Multi-arch builds enable cost savings without code changes.",
          ]
        },
        {
          title: "docker/metadata-action Tag Strategies",
          desc: "Automatic tag generation from git context. Different events (push, tag, PR) produce different tags, eliminating manual tag management.",
          lang: "yaml",
          filename: "metadata-examples.yml",
          code: `# docker/metadata-action generates tags based on git context
# This removes all manual tag management from your workflow

- uses: docker/metadata-action@v5
  id: meta
  with:
    images: |
      ghcr.io/company/recsys-inference
      company/recsys-inference
    tags: |
      # On push to main: "main", "sha-abc1234"
      type=ref,event=branch

      # On PR #42: "pr-42"
      type=ref,event=pr

      # On tag v1.2.3: "1.2.3", "1.2", "1"
      type=semver,pattern={{version}}
      type=semver,pattern={{major}}.{{minor}}
      type=semver,pattern={{major}}

      # Always: short git SHA
      type=sha,prefix=,format=short

      # Schedule (nightly): "nightly"
      type=schedule,pattern=nightly

      # Raw static tag
      type=raw,value=latest,enable={{is_default_branch}}

    labels: |
      org.opencontainers.image.title=recsys-inference
      org.opencontainers.image.vendor=Company
      maintainer=ml-platform@company.com

# ── Tag output examples by trigger ───────────────────────────────────
# Push to main:     main, sha-abc1234, latest
# Push tag v1.2.3:  1.2.3, 1.2, 1, sha-abc1234
# PR #42:           pr-42
# Scheduled:        nightly, sha-abc1234
#
# All tags go into steps.meta.outputs.tags (newline-separated)
# All labels go into steps.meta.outputs.labels`,
          notes: [
            "Semantic versioning tags (1.2.3, 1.2, 1) allow consumers to pin to different levels of stability: exact version, minor, or major.",
            "The SHA tag (sha-abc1234) provides a unique, immutable reference for every build — essential for tracing a running container back to its exact source code.",
            "latest is only applied on the default branch (main). Never push :latest from feature branches — it would overwrite the stable tag.",
            "PR tags (pr-42) allow testing the exact image that a PR will produce without merging — essential for integration testing in staging environments.",
            "Multiple images in the images field push the same build to multiple registries (e.g., GHCR + Docker Hub) with all the same tags — useful for redundancy.",
          ]
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 8: System Design — Complete ML Platform
    // ═══════════════════════════════════════════════════════════════════════════
    {
      id: "system-design",
      title: "System Design: Complete ML Platform",
      icon: "🏛️",
      items: [
        {
          title: "Full ML Platform — compose.yml",
          desc: "A complete ML recommendation platform with all components: API gateway, inference service, feature store (Redis), vector database (Qdrant), async processing (Celery), PostgreSQL, and monitoring (Prometheus + Grafana).",
          lang: "yaml",
          filename: "compose.platform.yml",
          code: `# compose.platform.yml — Complete ML Recommendation Platform
# Architecture:
#   Client -> Traefik (gateway) -> API (FastAPI) -> Model Server (gRPC)
#                                      |-> Redis (feature cache + predictions)
#                                      |-> Qdrant (vector similarity search)
#                                      |-> PostgreSQL (request log + experiments)
#                                      |-> Celery Worker -> Redis (broker)
#   Prometheus + Grafana for monitoring

services:

  # ── API Gateway (Traefik) ──────────────────────────────────────────
  gateway:
    image: traefik:v3.0
    container_name: recsys-gateway
    command:
      - "--api.dashboard=true"
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--metrics.prometheus=true"
      - "--metrics.prometheus.entrypoint=metrics"
      - "--entrypoints.metrics.address=:8082"
    ports:
      - "80:80"
      - "443:443"
      - "127.0.0.1:8080:8080"   # Dashboard (dev only)
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    networks: [recsys-net]
    deploy:
      resources:
        limits:
          memory: 256M
          cpus: "0.5"
    restart: unless-stopped

  # ── Inference API (FastAPI) ────────────────────────────────────────
  api:
    build:
      context: .
      dockerfile: Dockerfile
      target: runtime
    container_name: recsys-api
    depends_on:
      postgres:      { condition: service_healthy }
      redis:         { condition: service_healthy }
      model-server:  { condition: service_healthy }
      qdrant:        { condition: service_healthy }
    environment:
      DATABASE_URL: postgresql+asyncpg://recsys:\\\${DB_PASSWORD}@postgres:5432/recsys
      REDIS_URL: redis://:\\\${REDIS_PASSWORD}@redis:6379/0
      MODEL_SERVER_URL: model-server:50051
      QDRANT_URL: http://qdrant:6333
      OTEL_EXPORTER_OTLP_ENDPOINT: http://otel-collector:4317
      WORKERS: "4"
    labels:
      traefik.enable: "true"
      traefik.http.routers.api.rule: "Host(\`api.recsys.local\`)"
      traefik.http.routers.api.entrypoints: "web"
      traefik.http.services.api.loadbalancer.server.port: "8000"
      traefik.http.services.api.loadbalancer.healthcheck.path: "/health"
      traefik.http.services.api.loadbalancer.healthcheck.interval: "10s"
    networks: [recsys-net]
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 15s
      timeout: 5s
      retries: 3
      start_period: 10s
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: "2.0"
      replicas: 2
    read_only: true
    tmpfs:
      - /tmp:size=100M
    security_opt:
      - no-new-privileges:true
    restart: unless-stopped

  # ── Model Server (PyTorch gRPC) ────────────────────────────────────
  model-server:
    build:
      context: ./model-server
      dockerfile: Dockerfile
    container_name: recsys-model-server
    volumes:
      - models:/app/models:ro
    environment:
      MODEL_PATH: /app/models/recommendation.pt
      GRPC_PORT: "50051"
      OMP_NUM_THREADS: "4"
      TORCH_NUM_THREADS: "4"
    networks: [recsys-net]
    healthcheck:
      test: ["CMD", "python3", "-c", "import grpc; ch=grpc.insecure_channel('localhost:50051'); grpc.channel_ready_future(ch).result(timeout=5)"]
      interval: 15s
      timeout: 10s
      retries: 5
      start_period: 30s
    deploy:
      resources:
        limits:
          memory: 4G
          cpus: "4.0"
    restart: unless-stopped

  # ── Feature Store / Cache (Redis) ──────────────────────────────────
  redis:
    image: redis:7.2-alpine
    container_name: recsys-redis
    command: >
      redis-server
      --maxmemory 1gb
      --maxmemory-policy allkeys-lru
      --save 300 100
      --appendonly yes
      --requirepass \\\${REDIS_PASSWORD}
    volumes:
      - redis-data:/data
    networks: [recsys-net]
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "\\\${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits:
          memory: 1280M
          cpus: "1.0"
    restart: unless-stopped

  # ── Vector Database (Qdrant) ───────────────────────────────────────
  qdrant:
    image: qdrant/qdrant:v1.8.1
    container_name: recsys-qdrant
    volumes:
      - qdrant-data:/qdrant/storage
    environment:
      QDRANT__SERVICE__GRPC_PORT: "6334"
    networks: [recsys-net]
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:6333/healthz"]
      interval: 15s
      timeout: 5s
      retries: 5
      start_period: 10s
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: "2.0"
    restart: unless-stopped

  # ── PostgreSQL — request log + A/B experiments ─────────────────────
  postgres:
    image: postgres:16-alpine
    container_name: recsys-postgres
    environment:
      POSTGRES_DB: recsys
      POSTGRES_USER: recsys
      POSTGRES_PASSWORD: \\\${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./db/init.sql:/docker-entrypoint-initdb.d/01-schema.sql:ro
    networks: [recsys-net]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U recsys -d recsys"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 15s
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: "1.0"
    restart: unless-stopped

  # ── Async Worker (Celery) ──────────────────────────────────────────
  worker:
    build:
      context: .
      dockerfile: Dockerfile
      target: runtime
    container_name: recsys-worker
    depends_on:
      postgres: { condition: service_healthy }
      redis:    { condition: service_healthy }
    command: ["celery", "-A", "src.tasks", "worker", "--loglevel=info", "--concurrency=4"]
    environment:
      DATABASE_URL: postgresql+asyncpg://recsys:\\\${DB_PASSWORD}@postgres:5432/recsys
      CELERY_BROKER_URL: redis://:\\\${REDIS_PASSWORD}@redis:6379/1
      QDRANT_URL: http://qdrant:6333
    networks: [recsys-net]
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: "2.0"
    restart: unless-stopped

  # ── Prometheus (metrics) ───────────────────────────────────────────
  prometheus:
    image: prom/prometheus:v2.50.0
    container_name: recsys-prometheus
    profiles: [monitoring]
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus-data:/prometheus
    command:
      - "--config.file=/etc/prometheus/prometheus.yml"
      - "--storage.tsdb.retention.time=7d"
      - "--web.enable-lifecycle"
    networks: [recsys-net]
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: "0.5"
    restart: unless-stopped

  # ── Grafana (dashboards) ───────────────────────────────────────────
  grafana:
    image: grafana/grafana:10.3.1
    container_name: recsys-grafana
    profiles: [monitoring]
    depends_on: [prometheus]
    environment:
      GF_SECURITY_ADMIN_PASSWORD: \\\${GRAFANA_PASSWORD:-admin}
    ports:
      - "127.0.0.1:3000:3000"
    volumes:
      - grafana-data:/var/lib/grafana
      - ./monitoring/dashboards:/etc/grafana/provisioning/dashboards:ro
    networks: [recsys-net]
    deploy:
      resources:
        limits:
          memory: 256M
          cpus: "0.5"
    restart: unless-stopped

volumes:
  pgdata:
  redis-data:
  models:
  qdrant-data:
  prometheus-data:
  grafana-data:

networks:
  recsys-net:
    driver: bridge`,
          notes: [
            "Traefik as API gateway provides automatic service discovery via Docker labels, SSL termination, and load balancing — no manual nginx config needed.",
            "The API has replicas: 2, so Traefik automatically load-balances between both instances. Health check on the load balancer ensures traffic only goes to healthy replicas.",
            "Qdrant is a vector database for similarity search — the recommendation system uses it to find similar items/users based on embedding vectors from the ML model.",
            "Monitoring (Prometheus + Grafana) is behind the 'monitoring' profile — not started by default. Use 'docker compose --profile monitoring up' to include it.",
            "Every service has resource limits, health checks, and restart policies — the three pillars of container reliability in a multi-service architecture.",
          ]
        },
        {
          title: "Production Health Check Patterns",
          desc: "Health check patterns for different service types in the ML platform. Proper health checks enable self-healing and prevent routing traffic to broken services.",
          lang: "python",
          filename: "health.py",
          code: `"""
RecSys Health Check Endpoints — Production Patterns
Three levels: liveness, readiness, and startup probes
"""
from fastapi import FastAPI, HTTPException, status
from fastapi.responses import JSONResponse
import asyncio
import time
from contextlib import asynccontextmanager

# ── Global state for health tracking ─────────────────────────────────
_health_state = {
    "model_loaded": False,
    "db_connected": False,
    "redis_connected": False,
    "startup_time": None,
    "last_prediction_time": None,
}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: load model, connect to dependencies."""
    _health_state["startup_time"] = time.time()

    # Connect to dependencies
    await connect_database()
    _health_state["db_connected"] = True

    await connect_redis()
    _health_state["redis_connected"] = True

    # Load ML model (can take 10-30 seconds for large models)
    await load_model()
    _health_state["model_loaded"] = True

    yield  # App is running

    # Shutdown: graceful cleanup
    await close_connections()


app = FastAPI(lifespan=lifespan)


# ── Liveness Probe ───────────────────────────────────────────────────
# "Is the process alive and not deadlocked?"
# If this fails, the container should be RESTARTED
@app.get("/healthz")
async def liveness():
    """Minimal check: can the event loop respond?
    Do NOT check dependencies here — a slow DB should not
    cause the container to restart (that makes things worse).
    """
    return {"status": "alive"}


# ── Readiness Probe ──────────────────────────────────────────────────
# "Can this instance serve traffic?"
# If this fails, remove from load balancer but do NOT restart
@app.get("/ready")
async def readiness():
    """Check all dependencies. If any are down, this instance
    should not receive traffic until they recover.
    """
    checks = {}

    # Check model is loaded
    checks["model"] = _health_state["model_loaded"]

    # Check database connectivity
    try:
        await db.execute("SELECT 1")
        checks["database"] = True
    except Exception:
        checks["database"] = False

    # Check Redis connectivity
    try:
        await redis.ping()
        checks["redis"] = True
    except Exception:
        checks["redis"] = False

    # Check model server (gRPC)
    try:
        await model_client.health_check(timeout=2.0)
        checks["model_server"] = True
    except Exception:
        checks["model_server"] = False

    all_healthy = all(checks.values())

    if not all_healthy:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"status": "not_ready", "checks": checks},
        )

    return {"status": "ready", "checks": checks}


# ── Startup Probe ────────────────────────────────────────────────────
# "Has the app finished initialising?"
# Prevents liveness/readiness from running during slow startup
@app.get("/startup")
async def startup_probe():
    """Return 200 only after model is loaded and all
    connections are established. Kubernetes uses this to
    know when to start liveness/readiness checks.
    """
    if not _health_state["model_loaded"]:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Model still loading",
        )
    return {"status": "started", "uptime_seconds": time.time() - _health_state["startup_time"]}


# ── Detailed Health (for monitoring dashboards) ──────────────────────
@app.get("/health")
async def detailed_health():
    """Full health report with latency metrics.
    Used by monitoring systems, not by container orchestrators.
    """
    start = time.time()

    # Measure dependency latencies
    db_latency = await measure_latency(db.execute, "SELECT 1")
    redis_latency = await measure_latency(redis.ping)

    return {
        "status": "healthy" if _health_state["model_loaded"] else "degraded",
        "uptime_seconds": time.time() - _health_state["startup_time"],
        "dependencies": {
            "database": {"connected": True, "latency_ms": db_latency},
            "redis": {"connected": True, "latency_ms": redis_latency},
            "model": {"loaded": _health_state["model_loaded"]},
        },
        "last_prediction": _health_state["last_prediction_time"],
        "check_latency_ms": round((time.time() - start) * 1000, 2),
    }


async def measure_latency(func, *args):
    start = time.time()
    try:
        await func(*args)
        return round((time.time() - start) * 1000, 2)
    except Exception:
        return -1`,
          notes: [
            "Liveness checks should NEVER test dependencies (DB, Redis). If the DB is slow, restarting the API container makes the situation worse (thundering herd).",
            "Readiness checks test all dependencies. Failing readiness removes the instance from the load balancer without restarting it — traffic shifts to healthy instances.",
            "Startup probes prevent premature liveness/readiness checks during model loading. Without a startup probe, a 30-second model load triggers liveness timeout and causes a restart loop.",
            "The /health endpoint is for monitoring dashboards (Grafana/Prometheus), not for container orchestration. It includes latency metrics that would be too expensive for frequent probes.",
            "These three probe levels (startup -> liveness -> readiness) map directly to Kubernetes probe types and Docker HEALTHCHECK with start_period.",
          ]
        },
        {
          title: "Resource Limits and Container Sizing",
          desc: "How to right-size containers for ML workloads. Under-provisioning causes OOM kills; over-provisioning wastes money. This script profiles and recommends limits.",
          lang: "bash",
          filename: "resource-sizing.sh",
          code: `#!/usr/bin/env bash
set -euo pipefail

# ── Monitor actual resource usage under load ──────────────────────────
echo "=== Current resource usage for all RecSys services ==="
docker compose -f compose.platform.yml stats --no-stream \\
  --format "table {{.Name}}\\t{{.CPUPerc}}\\t{{.MemUsage}}\\t{{.MemPerc}}\\t{{.NetIO}}\\t{{.BlockIO}}"

# ── Run a load test and observe peak usage ────────────────────────────
# Terminal 1: watch stats
# docker compose stats

# Terminal 2: run load test (k6, locust, or hey)
# hey -n 10000 -c 50 -m POST \\
#   -H "Content-Type: application/json" \\
#   -d '{"user_id":"u123","context":{"page":"home"}}' \\
#   http://localhost:8000/predict

# ── Recommended limits by service type ────────────────────────────────
cat <<'SIZING'
Service Type          | Memory Limit | CPU Limit | Why
──────────────────────|──────────────|───────────|─────────────────────────
API (FastAPI)         | 1-2 GB       | 1-2 cores | Mostly I/O bound; memory for request objects
Model Server (PyTorch)| 2-8 GB       | 2-4 cores | Model weights in memory; inference is CPU-bound
Redis (cache)         | 512M-2 GB    | 0.5-1     | In-memory store; size = dataset
PostgreSQL            | 512M-2 GB    | 0.5-1     | shared_buffers + connections
Qdrant (vector DB)    | 1-4 GB       | 1-2       | Vector index in memory; size = collection
Celery Worker         | 512M-1 GB    | 1-2       | Depends on task; batch predictions need more
Traefik (gateway)     | 128-256 MB   | 0.25-0.5  | Very lightweight; just proxying
Prometheus            | 256-512 MB   | 0.5       | Depends on scrape targets and retention
Grafana               | 128-256 MB   | 0.25-0.5  | Dashboard rendering; mostly idle
SIZING

# ── Detect OOM kills ─────────────────────────────────────────────────
echo ""
echo "=== Checking for OOM-killed containers ==="
for container in \$(docker compose -f compose.platform.yml ps -q 2>/dev/null); do
  NAME=\$(docker inspect "\$container" --format '{{.Name}}' | tr -d '/')
  OOM=\$(docker inspect "\$container" --format '{{.State.OOMKilled}}')
  if [ "\$OOM" = "true" ]; then
    echo "WARNING: \$NAME was OOM-killed! Increase memory limit."
  fi
done

# ── Memory limit best practices for ML ────────────────────────────────
# 1. Set memory == memory-swap (disable swap — ML should fail fast, not swap)
# 2. Start at 2x observed peak usage, then tune down
# 3. PyTorch models: memory = model_size_on_disk * 2-3x (weights + activations + overhead)
# 4. Always set --pids-limit to prevent fork bombs
# 5. Monitor with docker stats or Prometheus cadvisor`,
          notes: [
            "Set memory and memory-swap to the same value to disable swap. ML workloads that swap become 100-1000x slower — it is better to fail fast and scale horizontally.",
            "Start with generous limits (2-3x observed peak) and tune down gradually. OOM kills in production are much more expensive than slightly over-provisioning.",
            "PyTorch model memory usage is roughly: model_file_size * 2 (weights + overhead) + batch_size * per_sample_activation_memory. Profile with torch.cuda.memory_summary().",
            "docker stats shows real-time usage but misses spikes. For accurate profiling, use Prometheus + cAdvisor which records time-series data at second resolution.",
            "In Kubernetes, requests (guaranteed) and limits (maximum) are separate. Set requests to p50 usage and limits to p99 + 20% headroom.",
          ]
        },
        {
          title: "Debugging a Production Container Crash",
          desc: "Systematic playbook for debugging a container that crashes on startup, OOM-kills, or becomes unresponsive. The RecSys model server is crashing — walk through the diagnosis.",
          lang: "bash",
          filename: "debug-crash.sh",
          code: `#!/usr/bin/env bash
set -euo pipefail

CONTAINER="recsys-model-server"

# ── Step 1: Check container state ─────────────────────────────────────
echo "=== Container State ==="
docker inspect "\$CONTAINER" --format '
  Status:     {{.State.Status}}
  ExitCode:   {{.State.ExitCode}}
  OOMKilled:  {{.State.OOMKilled}}
  Error:      {{.State.Error}}
  StartedAt:  {{.State.StartedAt}}
  FinishedAt: {{.State.FinishedAt}}
  RestartCnt: {{.RestartCount}}
'

# Exit codes:
#   0   — normal exit
#   1   — application error (uncaught exception)
#   137 — SIGKILL (OOM kill or docker kill)
#   139 — SIGSEGV (segmentation fault — C extension crash)
#   143 — SIGTERM (docker stop, graceful shutdown)

# ── Step 2: Check logs ───────────────────────────────────────────────
echo "=== Last 100 log lines ==="
docker logs "\$CONTAINER" --tail 100 --timestamps 2>&1

echo "=== Logs around the crash time ==="
docker logs "\$CONTAINER" --since 5m --until 1m 2>&1

# ── Step 3: Check system-level events ─────────────────────────────────
echo "=== Docker events (last 10 minutes) ==="
docker events --since 10m --until 0s --filter "container=\$CONTAINER" 2>/dev/null &
EVENTS_PID=\$!
sleep 2
kill \$EVENTS_PID 2>/dev/null || true

# ── Step 4: If OOM-killed, check memory ──────────────────────────────
OOM=\$(docker inspect "\$CONTAINER" --format '{{.State.OOMKilled}}')
if [ "\$OOM" = "true" ]; then
  echo "=== OOM KILL DETECTED ==="
  echo "Memory limit:"
  docker inspect "\$CONTAINER" --format '{{.HostConfig.Memory}}'

  echo "Peak memory usage (from cgroup):"
  # On Linux, check cgroup memory stats:
  # cat /sys/fs/cgroup/docker/<container-id>/memory.peak

  echo "Fix options:"
  echo "  1. Increase --memory limit"
  echo "  2. Use a smaller model (quantized, distilled)"
  echo "  3. Lazy-load model components"
  echo "  4. Reduce batch size / worker count"
fi

# ── Step 5: Debug interactively ───────────────────────────────────────
echo "=== Starting debug container with same config ==="
# Override entrypoint to get a shell instead of the crashing app
docker run --rm -it \\
  --name "\$CONTAINER-debug" \\
  --entrypoint /bin/bash \\
  --memory 4g \\
  -v models:/app/models:ro \\
  recsys-model-server:latest

# Inside the debug container:
#   python -c "import torch; m = torch.load('/app/models/recommendation.pt'); print(f'Model params: {sum(p.numel() for p in m.parameters()):,}')"
#   python -c "import resource; print(f'Memory limit: {resource.getrlimit(resource.RLIMIT_AS)}')"
#   python -c "import psutil; print(f'Available memory: {psutil.virtual_memory().available / 1e9:.1f} GB')"

# ── Step 6: Check host-level issues ──────────────────────────────────
echo "=== Host resource status ==="
docker system df
echo ""
docker info --format 'Containers: {{.Containers}} | Running: {{.ContainersRunning}} | Memory: {{.MemTotal}}'

# ── Step 7: Check for cascading failures ──────────────────────────────
echo "=== All service health ==="
docker compose -f compose.platform.yml ps \\
  --format "table {{.Name}}\\t{{.Status}}"`,
          notes: [
            "Exit code 137 means the process received SIGKILL — either from the OOM killer (check OOMKilled flag) or from docker kill / docker stop timeout.",
            "Exit code 139 (SIGSEGV) in ML containers usually means a C extension (PyTorch, numpy) crashed due to incompatible CUDA versions or corrupted model files.",
            "Always check docker events for the time window around the crash — it reveals the exact sequence of container state changes that led to the failure.",
            "Overriding --entrypoint to /bin/bash lets you get a shell inside the exact same environment where the crash occurs, with access to the model files and dependencies.",
            "Cascading failures are common: model-server crashes -> API cannot serve predictions -> health check fails -> API restarts -> thundering herd on model-server. Check all services, not just the crashed one.",
          ]
        },
      ]
    },

  ];
})();

