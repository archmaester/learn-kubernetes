// Patches the CI/CD Pipelines module (m6) with comprehensive code examples.
// Loaded after curriculum.js and cicd-lessons.js.
(function patchCICDExamples() {
  const m = CURRICULUM.phases[1].modules[2]; // phase-2 (index 1), third module (m6)

  m.codeExamples = [

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "github-actions-pipelines",
      icon: "⚙️",
      title: "GitHub Actions: Full CI/CD Pipelines",
      items: [
        {
          title: "Complete CI Pipeline (Test → Build → Push)",
          lang: "yaml",
          filename: ".github/workflows/ci.yml",
          desc: "Production-grade CI pipeline: lint, type check, unit tests with Postgres service, Docker build with layer caching, and push to GHCR. Only builds on main branch pushes.",
          code: `name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ci-\${{ github.ref }}
  cancel-in-progress: true

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: \${{ github.repository }}

jobs:
  # ── Lint & Type Check ─────────────────────────────────────────────────
  lint:
    name: Lint & Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
          cache: pip

      - run: pip install ruff mypy types-redis

      - name: Lint with ruff
        run: ruff check . --output-format github

      - name: Type check with mypy
        run: mypy app/ --ignore-missing-imports

  # ── Unit + Integration Tests ───────────────────────────────────────────
  test:
    name: Tests
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: testdb
        options: >-
          --health-cmd pg_isready
          --health-interval 5s
          --health-retries 5
        ports:
          - 5432:5432
      redis:
        image: redis:7-alpine
        options: --health-cmd "redis-cli ping" --health-interval 5s --health-retries 5
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
          cache: pip

      - name: Install dependencies
        run: pip install -r requirements.txt -r requirements-dev.txt

      - name: Run migrations
        run: alembic upgrade head
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/testdb

      - name: Run tests
        run: pytest tests/ -v --cov=app --cov-report=xml --cov-report=term-missing
        env:
          DATABASE_URL: postgresql+asyncpg://test:test@localhost:5432/testdb
          REDIS_URL: redis://localhost:6379

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: coverage.xml
          fail_ci_if_error: false

  # ── Build & Push Docker Image ──────────────────────────────────────────
  build:
    name: Build & Push
    runs-on: ubuntu-latest
    needs: [lint, test]
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    permissions:
      contents: read
      packages: write
    outputs:
      image-tag: \${{ steps.meta.outputs.tags }}
      digest: \${{ steps.build.outputs.digest }}

    steps:
      - uses: actions/checkout@v4

      - uses: docker/setup-buildx-action@v3

      - uses: docker/login-action@v3
        with:
          registry: \${{ env.REGISTRY }}
          username: \${{ github.actor }}
          password: \${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: \${{ env.REGISTRY }}/\${{ env.IMAGE_NAME }}
          tags: |
            type=sha,prefix=,format=short
            type=raw,value=latest,enable={{is_default_branch}}

      - name: Build and push
        id: build
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: \${{ steps.meta.outputs.tags }}
          labels: \${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          build-args: |
            BUILD_DATE=\${{ github.event.head_commit.timestamp }}
            GIT_SHA=\${{ github.sha }}`,
          notes: [
            "concurrency: cancel-in-progress saves runner minutes by killing stale PR runs when a new commit is pushed",
            "needs: [lint, test] ensures build only runs when both quality gates pass",
            "outputs: passes the image tag to downstream deploy jobs without re-computing it",
            "type=sha tag uses the short git SHA — unique, traceable, never mutable",
          ]
        },
        {
          title: "CD Pipeline: Deploy to Staging + Prod",
          lang: "yaml",
          filename: ".github/workflows/cd.yml",
          desc: "Deployment pipeline triggered after CI passes. Auto-deploys to staging; requires manual approval for production. Updates image tag in Helm values and commits to git for ArgoCD.",
          code: `name: CD

on:
  workflow_run:
    workflows: [CI]
    types: [completed]
    branches: [main]

jobs:
  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    if: \${{ github.event.workflow_run.conclusion == 'success' }}
    environment: staging

    steps:
      - uses: actions/checkout@v4
        with:
          token: \${{ secrets.GIT_TOKEN }}   # PAT with repo write access

      - name: Get image tag from CI run
        id: tag
        run: |
          echo "sha=\$(echo \${{ github.event.workflow_run.head_sha }} | cut -c1-7)" >> \$GITHUB_OUTPUT

      - name: Update image tag in Helm values
        run: |
          sed -i 's|tag:.*|tag: "\${{ steps.tag.outputs.sha }}"|' helm/my-api/values-staging.yaml

      - name: Commit and push
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add helm/my-api/values-staging.yaml
          git diff --staged --quiet || git commit -m "chore: deploy \${{ steps.tag.outputs.sha }} to staging [skip ci]"
          git push
        # [skip ci] in commit message prevents re-triggering this workflow

      - name: Wait for ArgoCD sync
        run: |
          argocd app wait my-api-staging \
            --sync --health --timeout 300 \
            --server \${{ secrets.ARGOCD_SERVER }} \
            --auth-token \${{ secrets.ARGOCD_TOKEN }} \
            --insecure

      - name: Run smoke tests
        run: |
          STAGING_URL=https://api-staging.mycompany.com
          curl --fail \$STAGING_URL/health
          curl --fail "\$STAGING_URL/api/v1/status"

  deploy-prod:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: deploy-staging
    environment:
      name: production        # requires manual approval in GitHub UI
      url: https://api.mycompany.com

    steps:
      - uses: actions/checkout@v4
        with:
          token: \${{ secrets.GIT_TOKEN }}
          ref: main
          fetch-depth: 0

      - name: Get image tag
        id: tag
        run: |
          echo "sha=\$(echo \${{ github.event.workflow_run.head_sha }} | cut -c1-7)" >> \$GITHUB_OUTPUT

      - name: Update production values
        run: |
          sed -i 's|tag:.*|tag: "\${{ steps.tag.outputs.sha }}"|' helm/my-api/values-prod.yaml
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add helm/my-api/values-prod.yaml
          git commit -m "chore: deploy \${{ steps.tag.outputs.sha }} to production [skip ci]"
          git push

      - name: Notify Slack
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {"text": "✅ Deployed \`\${{ steps.tag.outputs.sha }}\` to production by \${{ github.actor }}"}
        env:
          SLACK_WEBHOOK_URL: \${{ secrets.SLACK_WEBHOOK }}`,
          notes: [
            "environment: production in GitHub creates a required reviewer gate — no deploy without approval",
            "[skip ci] prevents the commit from triggering the CI workflow again (infinite loop)",
            "ArgoCD `app wait` blocks until the rollout completes or times out — gives real deploy status",
            "Separate staging/prod values files means the same chart is used with environment-specific config",
          ]
        },
        {
          title: "Matrix Build: Multi-Architecture Images",
          lang: "yaml",
          filename: ".github/workflows/multiarch.yml",
          desc: "Build Docker images for both AMD64 and ARM64 (Apple Silicon, AWS Graviton) using QEMU emulation and merge into a multi-arch manifest.",
          code: `name: Multi-Architecture Build

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      packages: write
    strategy:
      matrix:
        platform: [linux/amd64, linux/arm64]

    steps:
      - uses: actions/checkout@v4

      - uses: docker/setup-qemu-action@v3   # enable ARM64 emulation on AMD64 runner

      - uses: docker/setup-buildx-action@v3

      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: \${{ github.actor }}
          password: \${{ secrets.GITHUB_TOKEN }}

      - name: Build and push by digest
        id: build
        uses: docker/build-push-action@v5
        with:
          platforms: \${{ matrix.platform }}
          outputs: type=image,name=ghcr.io/\${{ github.repository }},push-by-digest=true,name-canonical=true,push=true
          cache-from: type=gha,scope=\${{ matrix.platform }}
          cache-to: type=gha,scope=\${{ matrix.platform }},mode=max

      - name: Export digest
        run: |
          mkdir -p /tmp/digests
          digest="\${{ steps.build.outputs.digest }}"
          touch "/tmp/digests/\${digest#sha256:}"

      - uses: actions/upload-artifact@v4
        with:
          name: digest-\${{ strategy.job-index }}
          path: /tmp/digests/*

  merge:
    runs-on: ubuntu-latest
    needs: build
    steps:
      - uses: actions/download-artifact@v4
        with:
          path: /tmp/digests
          merge-multiple: true

      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: \${{ github.actor }}
          password: \${{ secrets.GITHUB_TOKEN }}

      - uses: docker/metadata-action@v5
        id: meta
        with:
          images: ghcr.io/\${{ github.repository }}

      # Merge amd64 + arm64 digests into a single manifest list
      - uses: docker/buildx-action@v3
      - run: |
          docker buildx imagetools create \$(jq -cr '.tags | map("-t " + .) | join(" ")' <<< "\$DOCKER_METADATA_OUTPUT_JSON") \\
            \$(printf 'ghcr.io/\${{ github.repository }}@sha256:%s ' *)
        working-directory: /tmp/digests`,
          notes: [
            "Multi-arch images let ARM64 hosts (AWS Graviton, Apple Silicon dev machines) pull the right binary",
            "QEMU emulation is slow — for production, use native ARM64 runners (GitHub now offers them)",
            "Separate cache scopes per platform avoids amd64/arm64 cache collision",
            "The merge job creates a manifest list — one tag that resolves to the correct arch automatically",
          ]
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "helm-charts",
      icon: "⎈",
      title: "Helm: Charts, Templates, and Values",
      items: [
        {
          title: "Production-Ready Helm Chart",
          lang: "yaml",
          filename: "helm/my-api/Chart.yaml",
          desc: "Complete Helm chart for a FastAPI application with configurable replicas, HPA, ingress, and resource limits. All environment differences handled through values files.",
          code: `# Chart.yaml
apiVersion: v2
name: my-api
description: AI Backend API — FastAPI + PostgreSQL + Redis
type: application
version: 0.1.0        # chart version (bump when chart structure changes)
appVersion: "1.0.0"   # default app version (overridden by image.tag in values)

---
# values.yaml
replicaCount: 2

image:
  repository: ghcr.io/myorg/my-api
  tag: ""             # set by CI: --set image.tag=abc1234
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  port: 80
  targetPort: 8000

ingress:
  enabled: false
  className: nginx
  host: ""
  tlsSecretName: ""

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

env:
  LOG_LEVEL: INFO
  WORKERS: "4"

# Secret references (created separately by ExternalSecrets or Sealed Secrets)
existingSecret: ""    # name of K8s Secret to mount as env vars

readinessProbe:
  path: /health
  initialDelaySeconds: 5
  periodSeconds: 10

livenessProbe:
  path: /health
  initialDelaySeconds: 30
  periodSeconds: 30

podDisruptionBudget:
  enabled: true
  minAvailable: 1

serviceAccount:
  create: true
  annotations: {}`,
          notes: [
            "version bumps whenever you change the chart structure; appVersion tracks the application release",
            "existingSecret lets the app consume secrets without the chart knowing their values",
            "PodDisruptionBudget ensures at least 1 pod stays running during node maintenance/upgrades",
          ]
        },
        {
          title: "Helm Deployment + HPA Templates",
          lang: "yaml",
          filename: "helm/my-api/templates/deployment.yaml",
          desc: "Helm templates for Deployment and HPA with conditional blocks, checksum-based config reload, and environment variable injection from both values and existing secrets.",
          code: `# templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "my-api.fullname" . }}
  labels: {{- include "my-api.labels" . | nindent 4 }}
spec:
  {{- if not .Values.autoscaling.enabled }}
  replicas: {{ .Values.replicaCount }}   # HPA manages replicas when enabled
  {{- end }}
  selector:
    matchLabels: {{- include "my-api.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      labels: {{- include "my-api.selectorLabels" . | nindent 8 }}
      annotations:
        # Rolling restart when ConfigMap or Secret changes
        checksum/config: {{ include (print $.Template.BasePath "/configmap.yaml") . | sha256sum }}
    spec:
      {{- if .Values.serviceAccount.create }}
      serviceAccountName: {{ include "my-api.fullname" . }}
      {{- end }}
      containers:
        - name: {{ .Chart.Name }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"
          imagePullPolicy: {{ .Values.image.pullPolicy }}
          ports:
            - containerPort: {{ .Values.service.targetPort }}
          # Plain env vars from values
          env:
            {{- range $key, $val := .Values.env }}
            - name: {{ $key }}
              value: {{ $val | quote }}
            {{- end }}
          # All keys from an existing Secret as env vars
          {{- if .Values.existingSecret }}
          envFrom:
            - secretRef:
                name: {{ .Values.existingSecret }}
          {{- end }}
          resources: {{- toYaml .Values.resources | nindent 12 }}
          readinessProbe:
            httpGet:
              path: {{ .Values.readinessProbe.path }}
              port: {{ .Values.service.targetPort }}
            initialDelaySeconds: {{ .Values.readinessProbe.initialDelaySeconds }}
            periodSeconds: {{ .Values.readinessProbe.periodSeconds }}
          livenessProbe:
            httpGet:
              path: {{ .Values.livenessProbe.path }}
              port: {{ .Values.service.targetPort }}
            initialDelaySeconds: {{ .Values.livenessProbe.initialDelaySeconds }}
            periodSeconds: {{ .Values.livenessProbe.periodSeconds }}

---
# templates/hpa.yaml
{{- if .Values.autoscaling.enabled }}
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: {{ include "my-api.fullname" . }}
  labels: {{- include "my-api.labels" . | nindent 4 }}
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: {{ include "my-api.fullname" . }}
  minReplicas: {{ .Values.autoscaling.minReplicas }}
  maxReplicas: {{ .Values.autoscaling.maxReplicas }}
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: {{ .Values.autoscaling.targetCPUUtilizationPercentage }}
{{- end }}`,
          notes: [
            "{{- if not .Values.autoscaling.enabled }} removes the replicas field when HPA is active (HPA owns replica count)",
            "checksum/config annotation triggers a rolling restart when the ConfigMap content changes",
            "range $key, $val iterates over the env map — no need to list every variable explicitly",
            "toYaml | nindent N serializes a YAML sub-tree inline with correct indentation",
          ]
        },
        {
          title: "Helm Ingress Template + Values per Environment",
          lang: "yaml",
          filename: "helm/my-api/templates/ingress.yaml",
          desc: "Conditional Ingress template and environment-specific values files showing how staging vs prod differ only in overrides.",
          code: `# templates/ingress.yaml
{{- if .Values.ingress.enabled }}
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: {{ include "my-api.fullname" . }}
  labels: {{- include "my-api.labels" . | nindent 4 }}
  annotations:
    nginx.ingress.kubernetes.io/proxy-read-timeout: "300"
    nginx.ingress.kubernetes.io/proxy-body-size: "50m"
    {{- if .Values.ingress.tls }}
    cert-manager.io/cluster-issuer: letsencrypt-prod
    {{- end }}
spec:
  ingressClassName: {{ .Values.ingress.className }}
  {{- if .Values.ingress.tlsSecretName }}
  tls:
    - hosts:
        - {{ .Values.ingress.host | quote }}
      secretName: {{ .Values.ingress.tlsSecretName }}
  {{- end }}
  rules:
    - host: {{ .Values.ingress.host | quote }}
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: {{ include "my-api.fullname" . }}
                port:
                  number: {{ .Values.service.port }}
{{- end }}

---
# values-staging.yaml  (overrides only what differs from values.yaml)
replicaCount: 1

ingress:
  enabled: true
  host: api-staging.mycompany.com
  tlsSecretName: api-staging-tls

resources:
  requests:
    cpu: 50m
    memory: 128Mi
  limits:
    cpu: 200m
    memory: 256Mi

env:
  LOG_LEVEL: DEBUG
  WORKERS: "2"

existingSecret: my-api-staging-secrets

---
# values-prod.yaml
replicaCount: 4

ingress:
  enabled: true
  host: api.mycompany.com
  tlsSecretName: api-prod-tls

resources:
  requests:
    cpu: 500m
    memory: 512Mi
  limits:
    cpu: 2
    memory: 1Gi

autoscaling:
  enabled: true
  minReplicas: 4
  maxReplicas: 20

env:
  LOG_LEVEL: WARNING
  WORKERS: "8"

existingSecret: my-api-prod-secrets`,
          notes: [
            "cert-manager.io/cluster-issuer annotation triggers automatic TLS certificate provisioning",
            "Values files only need to include keys that differ from values.yaml — Helm deep-merges them",
            "Never put actual secret values in values files — use existingSecret to reference a K8s Secret",
          ]
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "argocd-gitops",
      icon: "🔄",
      title: "ArgoCD: GitOps Applications and App of Apps",
      items: [
        {
          title: "ArgoCD Application + Project",
          lang: "yaml",
          filename: "argocd/applications/my-api.yaml",
          desc: "Full ArgoCD Application manifest with automated sync, pruning, self-heal, and retry. Scoped to an ArgoCD Project that restricts which repos and clusters the app can touch.",
          code: `# ArgoCD Project — limits what apps in this project can deploy where
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: backend
  namespace: argocd
spec:
  description: Backend services

  # Only allow deploying from these repos
  sourceRepos:
    - https://github.com/myorg/my-api
    - https://github.com/myorg/platform

  # Only allow deploying to these namespaces
  destinations:
    - namespace: staging
      server: https://kubernetes.default.svc
    - namespace: production
      server: https://kubernetes.default.svc

  # RBAC: which ArgoCD roles can do what
  roles:
    - name: developer
      description: Can sync staging only
      policies:
        - p, proj:backend:developer, applications, sync, backend/*, staging/*
        - p, proj:backend:developer, applications, get, backend/*, allow
    - name: deployer
      description: Can sync both environments
      policies:
        - p, proj:backend:deployer, applications, *, backend/*, allow

---
# Application manifest for production
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-api-production
  namespace: argocd
  annotations:
    notifications.argoproj.io/subscribe.on-sync-succeeded.slack: deployments
    notifications.argoproj.io/subscribe.on-sync-failed.slack: alerts
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  project: backend

  source:
    repoURL: https://github.com/myorg/my-api
    targetRevision: main
    path: helm/my-api
    helm:
      valueFiles:
        - values.yaml
        - values-prod.yaml

  destination:
    server: https://kubernetes.default.svc
    namespace: production

  syncPolicy:
    automated:
      prune: true       # delete K8s resources removed from git
      selfHeal: true    # re-sync if cluster state drifts from git
      allowEmpty: false # never sync an empty application (safety)
    syncOptions:
      - CreateNamespace=true
      - PrunePropagationPolicy=foreground
      - ApplyOutOfSyncOnly=true   # only apply changed resources
    retry:
      limit: 5
      backoff:
        duration: 10s
        factor: 2
        maxDuration: 5m

  ignoreDifferences:
    # Ignore HPA-managed replica count (HPA owns this, not git)
    - group: apps
      kind: Deployment
      jsonPointers:
        - /spec/replicas`,
          notes: [
            "AppProject is the RBAC boundary — prevents a staging app from accidentally deploying to production",
            "ignoreDifferences prevents ArgoCD from reverting HPA-managed replica counts back to the values.yaml default",
            "notifications annotations send Slack messages on sync success/failure (requires ArgoCD Notifications addon)",
            "allowEmpty: false is a safety net — prevents wiping a namespace if the source path is accidentally emptied",
          ]
        },
        {
          title: "App of Apps Pattern",
          lang: "yaml",
          filename: "argocd/root.yaml",
          desc: "Bootstrap an entire cluster's state from a single root Application. Every service's Application manifest lives in git — adding a service is a git commit.",
          code: `# Root Application — bootstraps everything else
# Apply this once manually; ArgoCD then manages itself
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
    path: argocd/apps          # directory of Application manifests

  destination:
    server: https://kubernetes.default.svc
    namespace: argocd

  syncPolicy:
    automated:
      prune: true
      selfHeal: true

---
# argocd/apps/my-api.yaml   — one file per service/app
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-api-staging
  namespace: argocd
spec:
  project: backend
  source:
    repoURL: https://github.com/myorg/my-api
    targetRevision: main
    path: helm/my-api
    helm:
      valueFiles: [values.yaml, values-staging.yaml]
  destination:
    server: https://kubernetes.default.svc
    namespace: staging
  syncPolicy:
    automated: {prune: true, selfHeal: true}

---
# argocd/apps/prometheus.yaml  — third-party chart via Helm repo
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: kube-prometheus-stack
  namespace: argocd
spec:
  project: infra
  source:
    repoURL: https://prometheus-community.github.io/helm-charts
    chart: kube-prometheus-stack
    targetRevision: 57.0.0    # pin chart version — never use latest
    helm:
      valuesObject:           # inline values (alternative to valueFiles)
        grafana:
          adminPassword: \${{ argo-secret }}
        prometheus:
          retention: 15d
  destination:
    server: https://kubernetes.default.svc
    namespace: monitoring
  syncPolicy:
    syncOptions: [CreateNamespace=true]`,
          notes: [
            "The root app only needs to be applied once (kubectl apply -f argocd/root.yaml) — it manages all other apps",
            "pin targetRevision for third-party charts — floating 'latest' causes surprise upgrades",
            "valuesObject lets you inline Helm values directly in the Application manifest without a values file",
            "Adding a new service = add a new file to argocd/apps/ and commit — ArgoCD creates the Application automatically",
          ]
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "security-scanning",
      icon: "🔒",
      title: "Security: Scanning, SAST, and Secrets",
      items: [
        {
          title: "Full Security Pipeline",
          lang: "yaml",
          filename: ".github/workflows/security.yml",
          desc: "Dedicated security workflow: dependency audit, SAST with Semgrep, container CVE scanning with Trivy, and secret detection with gitleaks. Results uploaded to GitHub Security tab.",
          code: `name: Security Scan

on:
  push:
    branches: [main]
  pull_request:
  schedule:
    - cron: '0 6 * * 1'   # weekly scan every Monday at 6am

jobs:
  dependency-audit:
    name: Dependency Audit
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
          cache: pip
      - run: pip install pip-audit
      - name: Audit Python dependencies
        run: pip-audit -r requirements.txt --format json -o audit.json || true
      - name: Fail on CRITICAL
        run: |
          python3 -c "
          import json, sys
          data = json.load(open('audit.json'))
          critical = [v for dep in data.get('dependencies',[]) for v in dep.get('vulns',[]) if v.get('fix_versions')]
          if critical:
              print(f'Found {len(critical)} vulnerabilities with fixes available')
              sys.exit(1)
          "

  sast:
    name: SAST (Semgrep)
    runs-on: ubuntu-latest
    permissions:
      security-events: write
    steps:
      - uses: actions/checkout@v4
      - name: Run Semgrep
        uses: semgrep/semgrep-action@v1
        with:
          config: >-
            p/python
            p/secrets
            p/owasp-top-ten
            p/fastapi
          generateSarif: true
      - uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: semgrep.sarif

  container-scan:
    name: Container Scan (Trivy)
    runs-on: ubuntu-latest
    needs: []
    permissions:
      security-events: write
    steps:
      - uses: actions/checkout@v4

      - name: Build image for scanning
        uses: docker/build-push-action@v5
        with:
          context: .
          push: false
          tags: scan-target:latest
          load: true

      - name: Scan for CVEs
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: scan-target:latest
          format: sarif
          output: trivy.sarif
          severity: CRITICAL,HIGH
          ignore-unfixed: true   # only report CVEs with available fixes
          exit-code: 1

      - uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: trivy.sarif

  secret-detection:
    name: Secret Detection (Gitleaks)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0   # full history — scan all commits

      - uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}`,
          notes: [
            "ignore-unfixed: true in Trivy reduces noise — only report CVEs where a patched version exists",
            "SARIF format integrates with GitHub's Security tab — view findings alongside code without leaving GitHub",
            "fetch-depth: 0 in gitleaks checkout scans ALL git history, not just the latest commit",
            "Scheduled weekly scans catch new CVEs published after your last PR even without new commits",
          ]
        },
        {
          title: "External Secrets Operator Setup",
          lang: "yaml",
          filename: "k8s/secrets/external-secret.yaml",
          desc: "Complete External Secrets Operator setup: install with Helm, configure a ClusterSecretStore for AWS Secrets Manager, and define ExternalSecrets that sync to Kubernetes Secrets.",
          code: `# Install ESO with Helm
# helm repo add external-secrets https://charts.external-secrets.io
# helm install external-secrets external-secrets/external-secrets -n external-secrets --create-namespace

---
# ClusterSecretStore: connects ESO to AWS Secrets Manager
# The ESO pod uses its ServiceAccount IRSA to authenticate (no stored credentials)
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: aws-secretsmanager
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-east-1
      auth:
        jwt:
          serviceAccountRef:
            name: external-secrets
            namespace: external-secrets

---
# ExternalSecret: syncs specific keys from AWS Secrets Manager → K8s Secret
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: my-api-production
  namespace: production
spec:
  refreshInterval: 1h   # re-sync hourly — picks up secret rotations

  secretStoreRef:
    name: aws-secretsmanager
    kind: ClusterSecretStore

  target:
    name: my-api-production   # K8s Secret name created/updated by ESO
    creationPolicy: Owner     # ESO owns the Secret lifecycle
    template:
      type: Opaque
      data:
        # Transform the secret value if needed
        DATABASE_URL: "postgresql+asyncpg://{{ .username }}:{{ .password }}@{{ .host }}/{{ .dbname }}"

  data:
    - secretKey: database-url
      remoteRef:
        key: production/my-api/database        # AWS Secrets Manager path
        property: connection_string

    - secretKey: openai-api-key
      remoteRef:
        key: production/my-api/openai
        property: api_key

    - secretKey: redis-url
      remoteRef:
        key: production/my-api/redis
        property: url

  # Bulk import: sync ALL keys from a secret
  dataFrom:
    - extract:
        key: production/my-api/env-vars    # import all JSON keys as K8s Secret keys`,
          notes: [
            "IRSA (IAM Roles for Service Accounts) lets the ESO pod authenticate to AWS without stored credentials",
            "refreshInterval: 1h means secret rotations in AWS are picked up within an hour — no pod restart needed",
            "template.data allows transforming raw secret values (e.g., building a connection string from parts)",
            "dataFrom.extract bulk-imports all keys from a JSON secret — no need to list each key explicitly",
          ]
        },
        {
          title: "Dockerfile Security Best Practices",
          lang: "dockerfile",
          filename: "Dockerfile",
          desc: "Production Dockerfile following security best practices: non-root user, minimal base image, no secrets in layers, multi-stage build to exclude dev dependencies.",
          code: `# ── Build stage ──────────────────────────────────────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /build

# Install build deps (only needed at build time)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
# Install to a separate prefix so we can copy just the packages
RUN pip install --prefix=/install --no-cache-dir -r requirements.txt

# ── Runtime stage ─────────────────────────────────────────────────────────
FROM python:3.12-slim

# Security: create a non-root user
RUN groupadd --gid 1001 appgroup && \
    useradd --uid 1001 --gid appgroup --no-create-home appuser

WORKDIR /app

# Copy only installed packages from build stage (no gcc, no build tools)
COPY --from=builder /install /usr/local

# Copy application code
COPY --chown=appuser:appgroup app/ ./app/

# Switch to non-root user
USER appuser

# Metadata
ARG GIT_SHA=unknown
ARG BUILD_DATE=unknown
LABEL org.opencontainers.image.revision="\$GIT_SHA"
LABEL org.opencontainers.image.created="\$BUILD_DATE"

EXPOSE 8000

# Use exec form (no shell wrapper) — signals go directly to the process
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]`,
          notes: [
            "Multi-stage build: final image has no gcc, git, or build tools — dramatically reduces attack surface",
            "Non-root user (uid 1001) prevents container breakout from escalating to host root",
            "--no-cache-dir prevents pip from caching packages in the image layer",
            "Never use ENV or ARG for secrets — they appear in docker inspect and docker history",
            "COPY --chown sets file ownership in one layer rather than a separate RUN chown (saves a layer)",
          ]
        },
      ]
    },

  ]; // end m.codeExamples
})();
