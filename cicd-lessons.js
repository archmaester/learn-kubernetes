// Patches the CI/CD Pipelines module (m6) with full tutorial lesson content.
// Loaded after curriculum.js. m6 = CURRICULUM.phases[1].modules[2]
(function patchCICDLessons() {
  const m = CURRICULUM.phases[1].modules[2]; // phase-2 (index 1), third module (m6)

  m.lessons = [

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "cicd-concepts",
      title: "CI/CD: From Code Commit to Production",
      readTime: "10 min",
      content: [
        {
          type: "text",
          text: "CI/CD is the engineering practice that turns a manual, error-prone deployment process into a reliable, repeatable pipeline. Before CI/CD, deploying meant SSHing into servers, running scripts by hand, and hoping nothing broke. With CI/CD, every commit is automatically tested, built, and — when ready — deployed without human intervention."
        },
        {
          type: "callout",
          variant: "info",
          title: "Why CI/CD Matters for AI Backend Engineers",
          text: "AI systems move fast. You'll ship new model versions, prompt changes, RAG index updates, and API features constantly. Without automated pipelines you either slow down (manual deploys) or break prod (untested changes). CI/CD is the foundation that lets you move fast safely."
        },
        {
          type: "heading",
          text: "The Three Terms Defined",
          level: 2
        },
        {
          type: "comparison",
          headers: ["Term", "What it means", "Who triggers it", "Gate to production"],
          rows: [
            ["Continuous Integration (CI)", "Every code push runs tests, linting, and a build automatically", "Every developer on every commit", "Merge blocked if tests fail"],
            ["Continuous Delivery (CD)", "Every passing build is packaged and made deployable — but a human approves the release", "Automated pipeline after CI", "Human approval before prod deploy"],
            ["Continuous Deployment (CD)", "Every passing build ships to production automatically — no human approval", "Automated pipeline end-to-end", "No gate — tests are the only gatekeeper"],
          ]
        },
        {
          type: "text",
          text: "Most companies practice Continuous Delivery — fully automated up to staging, with a manual approval step for production. Continuous Deployment is used by mature companies with strong test coverage and robust rollback mechanisms."
        },
        {
          type: "heading",
          text: "A Full Pipeline: What Happens on Every Push",
          level: 2
        },
        {
          type: "diagram",
          code: `  git push → GitHub
       │
       ▼
  ┌─────────────────────────────────────────────────────────┐
  │                   CI PIPELINE                           │
  │                                                         │
  │  1. Checkout code                                       │
  │  2. Install dependencies                                │
  │  3. Lint (ruff, mypy, eslint)          ← fast feedback  │
  │  4. Unit tests (pytest)                                 │
  │  5. Integration tests                                   │
  │  6. SAST scan (Semgrep, CodeQL)        ← security       │
  │  7. Docker build                                        │
  │  8. Container scan (Trivy)             ← security       │
  │  9. Push image to registry (GHCR/ECR)                  │
  └───────────────────────┬─────────────────────────────────┘
                          │ on main branch only
                          ▼
  ┌─────────────────────────────────────────────────────────┐
  │                   CD PIPELINE                           │
  │                                                         │
  │  10. Update image tag in Helm values / K8s manifest     │
  │  11. Commit updated manifest to git                     │
  │  12. ArgoCD detects drift → syncs cluster               │
  │  13. Rolling deploy to staging                          │
  │  14. Smoke tests / E2E tests on staging                 │
  │  15. [Manual approval] → promote to production          │
  │  16. ArgoCD syncs production cluster                    │
  │  17. Notify Slack: ✅ deploy complete                   │
  └─────────────────────────────────────────────────────────┘`
        },
        {
          type: "heading",
          text: "Key Principles",
          level: 2
        },
        {
          type: "comparison",
          headers: ["Principle", "What it means in practice"],
          rows: [
            ["Everything in version control", "Pipeline definitions, Helm charts, K8s manifests, Dockerfiles — all in git. If it's not in git, it doesn't exist."],
            ["Fail fast", "Run the cheapest checks first (lint → unit tests → build → integration tests). Don't run 20-minute integration tests before catching a syntax error."],
            ["Immutable artifacts", "Build the Docker image once, promote the same image through environments. Never rebuild in staging or prod — what you tested is what you ship."],
            ["Trunk-based development", "Short-lived branches, merge to main frequently. Avoids long-running branches that diverge and cause painful merge conflicts."],
            ["Automated rollback", "If health checks fail after deploy, the pipeline rolls back automatically. Don't rely on humans to notice and react."],
          ]
        },
        {
          type: "callout",
          variant: "tip",
          title: "Interview Framing",
          text: "\"CI ensures the main branch is always in a deployable state. CD automates getting that deployable state to users. The key metric is deployment frequency — high-performing teams deploy multiple times per day. The enabler is confidence from automated tests, not bravery.\""
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "github-actions",
      title: "GitHub Actions: Workflows, Jobs, and Secrets",
      readTime: "14 min",
      content: [
        {
          type: "text",
          text: "GitHub Actions is the most widely used CI/CD platform for open-source and startup projects. It's free for public repos, deeply integrated with GitHub, and powerful enough to run production-grade pipelines. Understanding its concepts well means you can read and write any Actions workflow confidently."
        },
        {
          type: "heading",
          text: "Core Concepts",
          level: 2
        },
        {
          type: "comparison",
          headers: ["Concept", "What it is", "Analogy"],
          rows: [
            ["Workflow", "A YAML file in `.github/workflows/`. Defines when and what to run.", "The pipeline definition itself"],
            ["Event", "What triggers the workflow: push, pull_request, schedule, workflow_dispatch, etc.", "The starting gun"],
            ["Job", "A group of steps that run on the same runner (VM). Jobs run in parallel by default.", "A stage in the pipeline"],
            ["Step", "A single action or shell command within a job. Steps within a job run sequentially.", "One task"],
            ["Action", "A reusable unit of work, published to the Marketplace (e.g. `actions/checkout`).", "A library function"],
            ["Runner", "The VM that executes a job. GitHub-hosted (ubuntu-latest) or self-hosted.", "The server"],
            ["Secret", "Encrypted values stored in repo/org settings, injected as env vars at runtime.", "Environment credentials"],
          ]
        },
        {
          type: "heading",
          text: "Workflow Structure",
          level: 2
        },
        {
          type: "code",
          lang: "yaml",
          filename: ".github/workflows/ci.yml",
          code: `name: CI

# What triggers this workflow
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  workflow_dispatch:  # manual trigger from GitHub UI

# Cancel in-progress runs when a new commit is pushed to the same PR
concurrency:
  group: ci-\${{ github.ref }}
  cancel-in-progress: true

# Jobs run in PARALLEL by default
jobs:
  lint:
    name: Lint & Type Check
    runs-on: ubuntu-latest   # GitHub-hosted runner
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
          cache: pip

      - run: pip install ruff mypy

      - run: ruff check .
      - run: mypy app/

  test:
    name: Unit Tests
    runs-on: ubuntu-latest
    # Start a PostgreSQL service container alongside the runner
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: testdb
        options: >-
          --health-cmd pg_isready
          --health-interval 5s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
          cache: pip

      - run: pip install -r requirements.txt -r requirements-dev.txt

      - name: Run tests with coverage
        run: pytest --cov=app --cov-report=xml -v
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/testdb

      - uses: codecov/codecov-action@v4
        with:
          files: coverage.xml

  build:
    name: Build & Push Docker Image
    runs-on: ubuntu-latest
    needs: [lint, test]   # only runs if lint AND test pass
    # Only build on pushes to main, not on PRs
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    permissions:
      contents: read
      packages: write   # required to push to GHCR

    steps:
      - uses: actions/checkout@v4

      - uses: docker/setup-buildx-action@v3  # enables BuildKit cache

      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: \${{ github.actor }}
          password: \${{ secrets.GITHUB_TOKEN }}  # auto-provided by Actions

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: |
            ghcr.io/\${{ github.repository }}:latest
            ghcr.io/\${{ github.repository }}:\${{ github.sha }}
          cache-from: type=gha     # GitHub Actions cache (speeds up layer reuse)
          cache-to: type=gha,mode=max`
        },
        {
          type: "heading",
          text: "Matrix Builds: Test Against Multiple Versions",
          level: 2
        },
        {
          type: "code",
          lang: "yaml",
          filename: ".github/workflows/matrix.yml",
          code: `jobs:
  test:
    strategy:
      fail-fast: false   # don't cancel other versions if one fails
      matrix:
        python-version: ["3.11", "3.12"]
        os: [ubuntu-latest, macos-latest]

    runs-on: \${{ matrix.os }}
    name: Test Python \${{ matrix.python-version }} on \${{ matrix.os }}

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: \${{ matrix.python-version }}

      - run: pip install -r requirements.txt
      - run: pytest`
        },
        {
          type: "heading",
          text: "Reusable Workflows",
          level: 2
        },
        {
          type: "text",
          text: "When multiple repos share the same pipeline logic (test → build → deploy), extract it into a reusable workflow. The caller passes inputs; the callee runs the logic. This is the DRY principle applied to CI/CD."
        },
        {
          type: "code",
          lang: "yaml",
          filename: ".github/workflows/reusable-deploy.yml",
          code: `# This workflow is called by others, not triggered directly
on:
  workflow_call:
    inputs:
      environment:
        required: true
        type: string
      image-tag:
        required: true
        type: string
    secrets:
      KUBE_CONFIG:
        required: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: \${{ inputs.environment }}  # maps to GitHub Environment (with approval)
    steps:
      - uses: actions/checkout@v4

      - name: Set kubectl context
        run: |
          echo "\${{ secrets.KUBE_CONFIG }}" | base64 -d > kubeconfig.yaml
          export KUBECONFIG=kubeconfig.yaml

      - name: Update image tag and apply
        run: |
          kubectl set image deployment/api \\
            api=ghcr.io/myorg/api:\${{ inputs.image-tag }} \\
            --namespace=\${{ inputs.environment }}

      - name: Wait for rollout
        run: kubectl rollout status deployment/api --namespace=\${{ inputs.environment }} --timeout=5m

# Caller workflow:
# jobs:
#   deploy-staging:
#     uses: ./.github/workflows/reusable-deploy.yml
#     with:
#       environment: staging
#       image-tag: \${{ needs.build.outputs.sha }}
#     secrets:
#       KUBE_CONFIG: \${{ secrets.STAGING_KUBE_CONFIG }}`
        },
        {
          type: "heading",
          text: "Managing Secrets Safely",
          level: 2
        },
        {
          type: "comparison",
          headers: ["Secret type", "Where to store", "When to use"],
          rows: [
            ["GITHUB_TOKEN", "Auto-provided by Actions", "Push to GHCR, create releases, comment on PRs"],
            ["Repository secrets", "Repo Settings → Secrets", "Credentials specific to one repo"],
            ["Organization secrets", "Org Settings → Secrets", "Shared credentials across many repos (Docker Hub, Slack webhook)"],
            ["Environment secrets", "Repo → Environments → Secrets", "Different values per environment (staging DB vs prod DB)"],
          ]
        },
        {
          type: "callout",
          variant: "warning",
          title: "Never Print Secrets",
          text: "GitHub Actions automatically redacts known secrets from logs, but if you base64-encode or split a secret across multiple echo statements, it may leak. Never run `echo $SECRET` or `env` in a step that runs with secrets present. Use `::add-mask::` for dynamic values that should be redacted."
        },
        {
          type: "heading",
          text: "Caching Dependencies",
          level: 2
        },
        {
          type: "code",
          lang: "yaml",
          filename: "cache_example.yml",
          code: `# The setup-python action handles pip caching automatically when cache: pip is set.
# For manual cache control:
- uses: actions/cache@v4
  with:
    path: ~/.cache/pip
    key: pip-\${{ runner.os }}-\${{ hashFiles('requirements*.txt') }}
    restore-keys: |
      pip-\${{ runner.os }}-

# Docker layer cache via BuildKit (much faster rebuilds):
- uses: docker/build-push-action@v5
  with:
    cache-from: type=gha
    cache-to: type=gha,mode=max
# mode=max caches all layers; mode=min caches only final layer`
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "gitops-argocd",
      title: "GitOps with ArgoCD",
      readTime: "13 min",
      content: [
        {
          type: "text",
          text: "GitOps is the practice of using git as the single source of truth for infrastructure and application state. Instead of running kubectl apply from a CI pipeline (push-based), a GitOps agent inside the cluster watches git and pulls changes to apply them (pull-based). ArgoCD is the leading GitOps tool for Kubernetes."
        },
        {
          type: "heading",
          text: "Push vs Pull: Why It Matters",
          level: 2
        },
        {
          type: "comparison",
          headers: ["", "Push-based (traditional CI)", "Pull-based (GitOps / ArgoCD)"],
          rows: [
            ["Who applies changes", "CI runner (outside cluster)", "ArgoCD agent (inside cluster)"],
            ["Cluster credentials needed by", "CI server — credentials leak risk", "Only ArgoCD inside cluster"],
            ["Drift detection", "None — cluster may diverge from git", "Continuous — ArgoCD alerts on drift"],
            ["Rollback", "Re-run old pipeline", "git revert → ArgoCD syncs"],
            ["Audit trail", "CI logs (may expire)", "Git history — permanent"],
            ["Multi-cluster", "Give CI access to each cluster", "Each cluster pulls from same git"],
          ]
        },
        {
          type: "diagram",
          code: `  GITOPS FLOW WITH ARGOCD

  Developer
      │
      │  git push feature → main
      ▼
  ┌─────────────┐
  │   GitHub    │  ← git repos
  │             │
  │  app-code/  │  ← application source code
  │  k8s/       │  ← Kubernetes manifests / Helm values
  └──────┬──────┘
         │
         │  CI: test → build → push image
         │  CI: update image tag in k8s/values.yaml → git commit
         │
         ▼
  ┌─────────────────────────────────────────┐
  │           Kubernetes Cluster            │
  │                                         │
  │  ┌──────────────────────────────────┐   │
  │  │   ArgoCD (runs inside cluster)   │   │
  │  │                                  │   │
  │  │  polls git every 3 minutes  ─────┼───┼── detects new image tag in values.yaml
  │  │  compares live state vs git      │   │
  │  │  drift found → auto sync        ─┼───┼── kubectl apply (inside cluster)
  │  └──────────────────────────────────┘   │
  │                                         │
  │  Deployment: api (image: v1.2.3) ──────►│ updated to v1.2.4
  └─────────────────────────────────────────┘`
        },
        {
          type: "heading",
          text: "Installing ArgoCD",
          level: 2
        },
        {
          type: "code",
          lang: "bash",
          filename: "install_argocd.sh",
          code: `# Install ArgoCD into its own namespace
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Wait for all pods to be ready
kubectl wait --for=condition=Ready pod -l app.kubernetes.io/name=argocd-server -n argocd --timeout=120s

# Access the UI (port-forward for local testing)
kubectl port-forward svc/argocd-server -n argocd 8080:443

# Get the initial admin password
kubectl get secret argocd-initial-admin-secret -n argocd \
  -o jsonpath="{.data.password}" | base64 -d && echo

# Login via CLI
argocd login localhost:8080 --username admin --insecure

# Change the password
argocd account update-password`
        },
        {
          type: "heading",
          text: "ArgoCD Application Manifest",
          level: 2
        },
        {
          type: "text",
          text: "An ArgoCD Application is a Kubernetes CRD that tells ArgoCD where to find manifests (git repo + path) and where to deploy them (cluster + namespace). This is the core config you'll write and commit to git."
        },
        {
          type: "code",
          lang: "yaml",
          filename: "argocd/app-staging.yaml",
          code: `apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-api-staging
  namespace: argocd
  # Auto-delete the Application when this manifest is deleted
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  project: default

  source:
    repoURL: https://github.com/myorg/my-api
    targetRevision: main        # branch, tag, or commit SHA
    path: helm/my-api           # path to Helm chart in repo

    helm:
      valueFiles:
        - values.yaml
        - values-staging.yaml   # environment-specific overrides

  destination:
    server: https://kubernetes.default.svc   # in-cluster
    namespace: staging

  syncPolicy:
    automated:
      prune: true      # delete resources removed from git
      selfHeal: true   # re-apply if someone manually edits the cluster
    syncOptions:
      - CreateNamespace=true
    retry:
      limit: 3
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m`
        },
        {
          type: "heading",
          text: "App of Apps Pattern",
          level: 2
        },
        {
          type: "text",
          text: "For multiple services, don't create ArgoCD Applications by hand. Use the 'App of Apps' pattern: one root Application points to a directory of Application manifests. When you add a new service, commit its Application YAML and ArgoCD picks it up automatically."
        },
        {
          type: "code",
          lang: "yaml",
          filename: "argocd/root-app.yaml",
          code: `# Root Application — manages all other Applications
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: root
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/platform
    targetRevision: main
    path: argocd/apps     # this directory contains Application manifests

  destination:
    server: https://kubernetes.default.svc
    namespace: argocd

  syncPolicy:
    automated:
      prune: true
      selfHeal: true

# argocd/apps/ directory contains:
# ├── api.yaml            ← Application for the main API
# ├── worker.yaml         ← Application for background workers
# ├── postgres.yaml       ← Application for PostgreSQL (StatefulSet)
# └── monitoring.yaml     ← Application for Prometheus stack`
        },
        {
          type: "heading",
          text: "Sync Strategies and Rollbacks",
          level: 2
        },
        {
          type: "code",
          lang: "bash",
          filename: "argocd_operations.sh",
          code: `# Check sync status of all apps
argocd app list

# Manually trigger a sync (if automated sync is off)
argocd app sync my-api-staging

# View sync history
argocd app history my-api-staging

# Rollback to a previous git commit (by history ID)
argocd app rollback my-api-staging 3

# View differences between live cluster and git (drift)
argocd app diff my-api-staging

# Hard refresh: bypass ArgoCD cache, fetch from git now
argocd app get my-api-staging --hard-refresh

# Suspend automated sync (e.g., during an incident)
argocd app set my-api-staging --sync-policy none`
        },
        {
          type: "callout",
          variant: "tip",
          title: "Interview: GitOps Rollback",
          text: "\"With GitOps, rollback is just a git revert. If the deploy of commit abc123 broke production, you run git revert abc123 and push. ArgoCD detects the new HEAD, syncs the cluster back to the previous state — the same image and config that was running before. No special rollback command, no remembering what was deployed. Git history is the deployment history.\""
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "helm-kustomize",
      title: "Helm Charts and Kustomize",
      readTime: "14 min",
      content: [
        {
          type: "text",
          text: "Raw Kubernetes YAML doesn't scale. When you have dev, staging, and production environments with slightly different configs (different replica counts, resource limits, hostnames), you need a templating or overlay system. Helm and Kustomize are the two dominant approaches."
        },
        {
          type: "heading",
          text: "Helm: The Package Manager for Kubernetes",
          level: 2
        },
        {
          type: "text",
          text: "Helm packages Kubernetes manifests as a Chart — a directory with templates and default values. You install a chart with custom values, and Helm renders the templates and applies them. Think of it as apt/brew but for Kubernetes."
        },
        {
          type: "comparison",
          headers: ["", "Helm", "Kustomize"],
          rows: [
            ["Approach", "Templating (Go templates + values.yaml)", "Overlay/patching (no templates, pure YAML)"],
            ["Learning curve", "Steeper (template syntax, chart structure)", "Gentler (just YAML + patches)"],
            ["Package sharing", "Publish/consume charts from registries (Artifact Hub)", "Not designed for sharing"],
            ["Dynamic values", "Full Go template logic (conditionals, loops, functions)", "Limited (only patches and generators)"],
            ["Best for", "Distributable software (Prometheus, cert-manager, your own app)", "Environment-specific overlays on existing YAML"],
            ["ArgoCD support", "Native", "Native"],
          ]
        },
        {
          type: "heading",
          text: "Helm Chart Structure",
          level: 2
        },
        {
          type: "code",
          lang: "bash",
          filename: "chart_structure.sh",
          code: `my-api/                     # chart root (chart name)
├── Chart.yaml              # metadata: name, version, appVersion
├── values.yaml             # default values — override at install time
├── values-staging.yaml     # staging overrides (used by ArgoCD)
├── values-prod.yaml        # prod overrides
├── templates/
│   ├── deployment.yaml     # Deployment template
│   ├── service.yaml        # Service template
│   ├── ingress.yaml        # Ingress template (conditional)
│   ├── configmap.yaml      # ConfigMap template
│   ├── hpa.yaml            # HPA template (conditional)
│   ├── serviceaccount.yaml
│   └── _helpers.tpl        # reusable template snippets (no manifest output)
└── charts/                 # sub-charts (dependencies)

# Create a new chart skeleton:
helm create my-api

# Render templates locally (great for debugging):
helm template my-api ./my-api --values values-staging.yaml

# Install/upgrade (idempotent):
helm upgrade --install my-api ./my-api \
  --namespace staging \
  --create-namespace \
  --values values-staging.yaml \
  --set image.tag=abc123

# List releases:
helm list --all-namespaces

# Rollback to previous release:
helm rollback my-api 1 --namespace staging`
        },
        {
          type: "heading",
          text: "Writing a Helm Deployment Template",
          level: 2
        },
        {
          type: "code",
          lang: "yaml",
          filename: "templates/deployment.yaml",
          code: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "my-api.fullname" . }}
  labels:
    {{- include "my-api.labels" . | nindent 4 }}
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      {{- include "my-api.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      labels:
        {{- include "my-api.selectorLabels" . | nindent 8 }}
      annotations:
        # Force pod restart when ConfigMap changes
        checksum/config: {{ include (print $.Template.BasePath "/configmap.yaml") . | sha256sum }}
    spec:
      containers:
        - name: api
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"
          imagePullPolicy: {{ .Values.image.pullPolicy }}
          ports:
            - containerPort: 8000
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: {{ include "my-api.fullname" . }}-secrets
                  key: database-url
          resources:
            {{- toYaml .Values.resources | nindent 12 }}
          readinessProbe:
            httpGet:
              path: /health
              port: 8000
            initialDelaySeconds: 5
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /health
              port: 8000
            initialDelaySeconds: 30
            periodSeconds: 30
      {{- with .Values.nodeSelector }}
      nodeSelector:
        {{- toYaml . | nindent 8 }}
      {{- end }}`
        },
        {
          type: "code",
          lang: "yaml",
          filename: "values.yaml",
          code: `# Default values — override per environment
replicaCount: 2

image:
  repository: ghcr.io/myorg/my-api
  tag: ""           # overridden by CI with the git SHA
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  port: 80
  targetPort: 8000

ingress:
  enabled: false    # enable per environment
  host: ""
  tls: true

resources:
  requests:
    cpu: 100m
    memory: 256Mi
  limits:
    cpu: 500m
    memory: 512Mi

autoscaling:
  enabled: false
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70

nodeSelector: {}

config:
  logLevel: INFO
  workers: 4`
        },
        {
          type: "code",
          lang: "yaml",
          filename: "values-prod.yaml",
          code: `# Production overrides — merged with values.yaml
replicaCount: 4

ingress:
  enabled: true
  host: api.mycompany.com
  tls: true

resources:
  requests:
    cpu: 500m
    memory: 512Mi
  limits:
    cpu: 2000m
    memory: 1Gi

autoscaling:
  enabled: true
  minReplicas: 4
  maxReplicas: 20

config:
  logLevel: WARNING
  workers: 8`
        },
        {
          type: "heading",
          text: "Kustomize: Overlays Without Templates",
          level: 2
        },
        {
          type: "text",
          text: "Kustomize works differently from Helm. You write plain Kubernetes YAML as a base, then write overlays that patch specific fields for each environment. No template language — just YAML merging and strategic patches."
        },
        {
          type: "code",
          lang: "bash",
          filename: "kustomize_structure.sh",
          code: `k8s/
├── base/                      # shared base — no environment-specific values
│   ├── kustomization.yaml
│   ├── deployment.yaml
│   ├── service.yaml
│   └── configmap.yaml
│
└── overlays/
    ├── staging/
    │   ├── kustomization.yaml
    │   └── patch-replicas.yaml   # patches just the replica count
    │
    └── prod/
        ├── kustomization.yaml
        ├── patch-replicas.yaml
        └── patch-resources.yaml  # patches resource requests/limits`
        },
        {
          type: "code",
          lang: "yaml",
          filename: "k8s/overlays/prod/kustomization.yaml",
          code: `apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

# Inherit from the base
resources:
  - ../../base

# Override the image tag (set by CI)
images:
  - name: ghcr.io/myorg/my-api
    newTag: "abc123def"   # replaced by CI: kustomize edit set image ...

# Apply patches on top of base manifests
patches:
  - path: patch-replicas.yaml
  - path: patch-resources.yaml

# Add labels to ALL resources in this overlay
commonLabels:
  environment: production

# Prefix all resource names
namePrefix: prod-`
        },
        {
          type: "code",
          lang: "yaml",
          filename: "k8s/overlays/prod/patch-replicas.yaml",
          code: `# Strategic merge patch — only specifies what changes
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-api    # must match base resource name
spec:
  replicas: 6     # overrides base value`
        },
        {
          type: "callout",
          variant: "tip",
          title: "Helm vs Kustomize: When to Use Which",
          text: "Use Helm when you're packaging an app for others to install (you control the template, they control the values), or when you need complex conditional logic in your manifests. Use Kustomize when you have your own plain YAML that you want to customize per environment without introducing a template language. Many teams use both: Helm for third-party charts (Prometheus, cert-manager), Kustomize for their own app manifests."
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "canary-deployments",
      title: "Canary Deployments and Rollout Strategies",
      readTime: "11 min",
      content: [
        {
          type: "text",
          text: "A canary deployment routes a small percentage of traffic to a new version before shifting all traffic. If metrics look good, you progressively increase traffic to the new version. If they don't, you roll back. It's the safest way to deploy changes to production systems serving real users."
        },
        {
          type: "heading",
          text: "Deployment Strategies Compared",
          level: 2
        },
        {
          type: "comparison",
          headers: ["Strategy", "How it works", "Downtime", "Risk", "Use when"],
          rows: [
            ["Recreate", "Kill all old pods, start all new pods", "Yes — gap between old and new", "High", "Dev/test only — never production"],
            ["RollingUpdate (default)", "Replace old pods one-by-one", "No", "Medium — both versions serve traffic briefly", "Stateless apps with backward-compatible changes"],
            ["Blue-Green", "Run both versions simultaneously, switch traffic instantly", "No (instant cutover)", "Low — instant rollback", "When you need instant rollback capability"],
            ["Canary", "Route N% traffic to new version, monitor, gradually increase", "No", "Very low — small blast radius", "High-traffic systems, risky changes, LLM prompt updates"],
          ]
        },
        {
          type: "diagram",
          code: `  CANARY DEPLOYMENT PROGRESSION

  Time →
  ─────────────────────────────────────────────────────────
  Step 1:  v1 100% │ v2 0%    Deploy v2, no traffic yet
  Step 2:  v1  90% │ v2 10%   Monitor for 10 minutes
  Step 3:  v1  50% │ v2 50%   Metrics OK → increase
  Step 4:  v1   0% │ v2 100%  Full rollout complete
  ─────────────────────────────────────────────────────────
  If error rate spikes at any step → rollback to v1 100%

  Traffic split happens at the INGRESS layer, not deployment layer.
  (Kubernetes Services don't support weighted routing natively.)`
        },
        {
          type: "heading",
          text: "Argo Rollouts: Canary on Kubernetes",
          level: 2
        },
        {
          type: "text",
          text: "Kubernetes Deployments only support RollingUpdate. For canary and blue-green, you need Argo Rollouts — a drop-in replacement for Deployment that adds progressive delivery with automatic analysis."
        },
        {
          type: "code",
          lang: "yaml",
          filename: "rollout.yaml",
          code: `apiVersion: argoproj.io/v1alpha1
kind: Rollout              # replaces kind: Deployment
metadata:
  name: my-api
spec:
  replicas: 10
  selector:
    matchLabels:
      app: my-api
  template:
    metadata:
      labels:
        app: my-api
    spec:
      containers:
        - name: api
          image: ghcr.io/myorg/my-api:v2
          ports:
            - containerPort: 8000

  strategy:
    canary:
      # Traffic weights at each step (requires Ingress controller integration)
      canaryService: my-api-canary     # Service for canary pods
      stableService: my-api-stable     # Service for stable pods

      steps:
        - setWeight: 10          # 10% traffic to new version
        - pause: {duration: 5m}  # wait 5 minutes
        - analysis:              # run automated analysis
            templates:
              - templateName: error-rate-check
        - setWeight: 50          # 50% if analysis passed
        - pause: {duration: 10m}
        - setWeight: 100         # full rollout

      # Automatically roll back if this analysis fails
      analysis:
        templates:
          - templateName: error-rate-check
        startingStep: 2`
        },
        {
          type: "code",
          lang: "yaml",
          filename: "analysis-template.yaml",
          code: `# AnalysisTemplate: queries Prometheus and fails if error rate is too high
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: error-rate-check
spec:
  metrics:
    - name: error-rate
      interval: 1m
      count: 5          # query 5 times
      successCondition: result[0] < 0.01   # <1% error rate
      failureLimit: 1   # fail after 1 bad measurement
      provider:
        prometheus:
          address: http://prometheus:9090
          query: |
            sum(rate(http_requests_total{status=~"5..",job="my-api",version="canary"}[2m]))
            /
            sum(rate(http_requests_total{job="my-api",version="canary"}[2m]))`
        },
        {
          type: "heading",
          text: "Security in Pipelines: SAST and Image Scanning",
          level: 2
        },
        {
          type: "text",
          text: "Security checks in CI are cheap. Security incidents in production are very expensive. Two categories of automated checks every pipeline should include:"
        },
        {
          type: "comparison",
          headers: ["Check", "Tool", "What it catches", "When to run"],
          rows: [
            ["SAST (Static Analysis)", "Semgrep, CodeQL, Bandit", "Hardcoded secrets, SQL injection, insecure patterns in source code", "On every PR, before build"],
            ["Container image scanning", "Trivy, Grype, Snyk", "CVEs in base image and Python packages baked into the image", "After docker build, before push"],
            ["Dependency audit", "pip-audit, safety, npm audit", "Known vulnerabilities in requirements.txt", "On every PR"],
            ["Secret detection", "truffleHog, gitleaks", "Accidentally committed API keys, passwords", "Pre-commit hook + CI"],
          ]
        },
        {
          type: "code",
          lang: "yaml",
          filename: ".github/workflows/security.yml",
          code: `jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Scan Python dependencies for known CVEs
      - name: Audit Python dependencies
        run: |
          pip install pip-audit
          pip-audit -r requirements.txt --ignore-vuln PYSEC-2022-42969

      # SAST: scan source code for security issues
      - name: Run Semgrep
        uses: semgrep/semgrep-action@v1
        with:
          config: p/python p/secrets p/owasp-top-ten

      # Scan Docker image for CVEs (after build)
      - name: Scan image with Trivy
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: ghcr.io/myorg/my-api:latest
          format: sarif
          output: trivy-results.sarif
          severity: CRITICAL,HIGH
          exit-code: 1    # fail the pipeline on CRITICAL/HIGH CVEs

      # Upload results to GitHub Security tab
      - uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: trivy-results.sarif`
        },
        {
          type: "callout",
          variant: "info",
          title: "Handling CVEs in Practice",
          text: "Trivy will find CVEs. Not all are exploitable in your context. Use .trivyignore to suppress accepted risks with documented justification. Set exit-code: 1 only for CRITICAL severity to avoid pipeline paralysis from MEDIUM CVEs in transitive dependencies. Review HIGH CVEs weekly and patch before they become CRITICAL."
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "secrets-management",
      title: "Secrets Management in CI/CD",
      readTime: "10 min",
      content: [
        {
          type: "text",
          text: "Secrets are the most common source of security incidents in cloud-native systems. API keys, database passwords, and TLS certificates must never appear in git, logs, or container images. A mature secrets management strategy covers how secrets are stored, rotated, injected, and audited."
        },
        {
          type: "heading",
          text: "The Problem with Naive Approaches",
          level: 2
        },
        {
          type: "comparison",
          headers: ["Anti-pattern", "Why it's dangerous"],
          rows: [
            ["Hardcoded in source code", "Committed to git → permanent history → anyone with repo access has the secret"],
            ["In Kubernetes Secrets (base64 only)", "base64 is encoding, not encryption. Anyone with kubectl get secret can decode instantly"],
            ["In environment variables in Dockerfile", "Baked into image layers → docker history reveals them → any image puller can read"],
            ["Passed as build args in CI", "May appear in CI logs if command is echoed"],
            ["In ConfigMaps", "ConfigMaps are not encrypted at rest by default"],
          ]
        },
        {
          type: "heading",
          text: "Production Secrets Architecture",
          level: 2
        },
        {
          type: "diagram",
          code: `  SECRETS FLOW IN PRODUCTION

  ┌──────────────────┐
  │  Secret Store    │  ← source of truth (never in git)
  │  (Vault / AWS    │
  │   Secrets Mgr /  │
  │   GCP Secret Mgr)│
  └────────┬─────────┘
           │
           │  sync (pull)
           ▼
  ┌──────────────────────────────────┐
  │      Kubernetes Cluster          │
  │                                  │
  │  External Secrets Operator (ESO) │  ← syncs secrets from Vault → K8s
  │            │                     │
  │            ▼                     │
  │   Kubernetes Secret (encrypted   │  ← etcd encrypts at rest
  │   at rest via KMS)               │
  │            │                     │
  │            ▼                     │
  │   Pod env vars / mounted files   │  ← app reads via env or volume
  └──────────────────────────────────┘`
        },
        {
          type: "heading",
          text: "External Secrets Operator",
          level: 2
        },
        {
          type: "text",
          text: "External Secrets Operator (ESO) bridges your secret store (Vault, AWS Secrets Manager, GCP Secret Manager) and Kubernetes. You commit an ExternalSecret manifest to git — it contains no secret values, just a reference to where the secret lives. ESO fetches the real value and creates a Kubernetes Secret."
        },
        {
          type: "code",
          lang: "yaml",
          filename: "external-secret.yaml",
          code: `# Committed to git — contains NO secret values
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: my-api-secrets
  namespace: production
spec:
  refreshInterval: 1h     # re-sync every hour (picks up rotations)

  secretStoreRef:
    name: aws-secretsmanager   # ClusterSecretStore connecting to AWS
    kind: ClusterSecretStore

  target:
    name: my-api-secrets      # creates/updates this Kubernetes Secret
    creationPolicy: Owner

  data:
    - secretKey: database-url       # key in the K8s Secret
      remoteRef:
        key: production/my-api      # AWS Secrets Manager secret name
        property: DATABASE_URL      # JSON key within the secret

    - secretKey: openai-api-key
      remoteRef:
        key: production/my-api
        property: OPENAI_API_KEY`
        },
        {
          type: "heading",
          text: "Sealed Secrets: Encrypting Secrets for Git",
          level: 2
        },
        {
          type: "text",
          text: "Sealed Secrets (by Bitnami) takes a different approach: encrypt the secret with the cluster's public key, commit the encrypted SealedSecret to git. Only the cluster's controller can decrypt it. Safe to commit — even if someone reads the file, they can't decrypt without the cluster's private key."
        },
        {
          type: "code",
          lang: "bash",
          filename: "sealed_secrets.sh",
          code: `# Install Sealed Secrets controller
helm install sealed-secrets sealed-secrets/sealed-secrets -n kube-system

# Install kubeseal CLI
brew install kubeseal

# Create a regular Kubernetes Secret YAML (DO NOT commit this)
kubectl create secret generic my-api-secrets \
  --from-literal=database-url="postgresql://..." \
  --from-literal=openai-api-key="sk-..." \
  --dry-run=client -o yaml > secret.yaml

# Encrypt it into a SealedSecret (safe to commit)
kubeseal --format yaml < secret.yaml > sealed-secret.yaml

# The SealedSecret is encrypted and safe to commit to git
# The cluster controller decrypts it and creates the real Secret
git add sealed-secret.yaml
git commit -m "Add sealed secret for my-api"

# Never commit secret.yaml — add it to .gitignore
echo "secret.yaml" >> .gitignore`
        },
        {
          type: "heading",
          text: "CI Pipeline Secrets Best Practices",
          level: 2
        },
        {
          type: "comparison",
          headers: ["Practice", "How"],
          rows: [
            ["Use OIDC instead of long-lived tokens", "GitHub Actions OIDC lets you authenticate to AWS/GCP without storing credentials as secrets — the token is short-lived and scoped to the workflow run"],
            ["Scope secrets to environments", "Use GitHub Environments with required reviewers for production secrets — a PR pipeline can't access prod secrets"],
            ["Rotate secrets regularly", "Use AWS Secrets Manager / Vault with automatic rotation. ESO picks up new values within refreshInterval"],
            ["Audit secret access", "CloudTrail (AWS) or Vault audit logs show every secret read — set alerts on anomalous access patterns"],
            ["Scan for accidental commits", "Add gitleaks as a pre-commit hook and in CI — catches secrets before they reach git history"],
          ]
        },
        {
          type: "code",
          lang: "yaml",
          filename: ".github/workflows/oidc-aws.yml",
          code: `# Use OIDC to authenticate to AWS — no stored AWS credentials!
jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      id-token: write   # required for OIDC
      contents: read

    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials via OIDC
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789:role/GitHubActionsDeployRole
          aws-region: us-east-1
          # No AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY needed!

      - name: Push image to ECR
        run: |
          aws ecr get-login-password | docker login --username AWS \
            --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com
          docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/my-api:latest`
        },
        {
          type: "callout",
          variant: "tip",
          title: "Interview: How Do You Handle Secrets in CI/CD?",
          text: "\"We never store long-lived credentials in CI. For AWS, we use OIDC federation — GitHub Actions exchanges a short-lived JWT for temporary AWS credentials scoped to the specific workflow. For runtime secrets in Kubernetes, we use External Secrets Operator syncing from AWS Secrets Manager. Secrets are never in git — only ExternalSecret references. Rotation happens in Secrets Manager and ESO picks it up within the refresh interval.\""
        },
      ]
    },

  ]; // end m.lessons
})();
