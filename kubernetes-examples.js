// Patches the Kubernetes Fundamentals module (m4) with code examples.
// Loaded after curriculum.js and kubernetes-lessons.js.
(function patchKubernetesExamples() {
  const m = CURRICULUM.phases[1].modules[0]; // phase-2 (index 1), first module (m4)

  m.codeExamples = [

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "pods",
      icon: "📦",
      title: "Pods",
      items: [
        {
          title: "Minimal Pod",
          lang: "yaml",
          filename: "pod-minimal.yaml",
          desc: "The simplest Pod — one container. You almost never create bare Pods in production; use Deployments instead.",
          code: `apiVersion: v1
kind: Pod
metadata:
  name: fastapi-pod
  labels:
    app: fastapi
spec:
  containers:
  - name: app
    image: myorg/fastapi-app:1.0.0
    ports:
    - containerPort: 8000`,
          notes: [
            "apiVersion, kind, metadata, spec are the four universal Kubernetes fields",
            "Labels are key-value pairs used for selection, not just documentation",
            "containerPort is informational only — it does NOT publish the port to the host",
          ]
        },
        {
          title: "Pod with Environment Variables",
          lang: "yaml",
          filename: "pod-env.yaml",
          desc: "Inject configuration via environment variables — from literals, ConfigMaps, or Secrets.",
          code: `apiVersion: v1
kind: Pod
metadata:
  name: fastapi-pod
spec:
  containers:
  - name: app
    image: myorg/fastapi-app:1.0.0
    env:
    # Literal value
    - name: LOG_LEVEL
      value: "info"

    # From ConfigMap key
    - name: DB_HOST
      valueFrom:
        configMapKeyRef:
          name: app-config
          key: db_host

    # From Secret key
    - name: DB_PASSWORD
      valueFrom:
        secretKeyRef:
          name: db-secret
          key: password`,
          notes: [
            "Never hardcode passwords in env.value — use secretKeyRef",
            "envFrom loads ALL keys from a ConfigMap/Secret at once",
            "Environment variables are set at Pod start and don't change unless Pod restarts",
          ]
        },
        {
          title: "Multi-Container Pod (Sidecar Pattern)",
          lang: "yaml",
          filename: "pod-sidecar.yaml",
          desc: "Two containers sharing a Volume. App writes logs to /var/log; Fluent Bit ships them to a log aggregator.",
          code: `apiVersion: v1
kind: Pod
metadata:
  name: app-with-logging
spec:
  containers:
  - name: app
    image: myorg/fastapi-app:1.0.0
    volumeMounts:
    - name: logs
      mountPath: /var/log/app

  - name: log-shipper
    image: fluent/fluent-bit:3.0
    volumeMounts:
    - name: logs
      mountPath: /var/log/app
      readOnly: true

  volumes:
  - name: logs
    emptyDir: {}   # shared, ephemeral — exists while Pod lives`,
          notes: [
            "Containers in a Pod share: network (same IP, localhost), and mounted volumes",
            "emptyDir is created when Pod starts, deleted when Pod dies",
            "Use sidecar for: logging agents, TLS proxies, config reloaders, git sync",
          ]
        },
        {
          title: "Init Containers — Wait and Migrate",
          lang: "yaml",
          filename: "pod-init.yaml",
          desc: "Init containers run sequentially before main containers. Use them to gate startup on dependency readiness.",
          code: `apiVersion: v1
kind: Pod
metadata:
  name: fastapi-with-init
spec:
  initContainers:
  # Step 1: wait for Postgres to accept connections
  - name: wait-for-db
    image: busybox:1.36
    command:
    - sh
    - -c
    - |
      until nc -z postgres-svc 5432; do
        echo "waiting for postgres..."
        sleep 3
      done
      echo "postgres is up"

  # Step 2: run Alembic migrations
  - name: run-migrations
    image: myorg/fastapi-app:1.0.0
    command: ["python", "-m", "alembic", "upgrade", "head"]
    envFrom:
    - secretRef:
        name: db-secret

  # Main container starts only after both init containers succeed
  containers:
  - name: app
    image: myorg/fastapi-app:1.0.0
    ports:
    - containerPort: 8000`,
          notes: [
            "Init containers run to completion in order — each must exit 0 before next starts",
            "If an init container fails, the Pod restarts (with backoff)",
            "Separating migration from app container is a production best practice",
          ]
        },
        {
          title: "Debug Pod — One-Shot Troubleshooting",
          lang: "bash",
          filename: "debug-pod.sh",
          desc: "Launch an ephemeral pod for debugging networking, DNS, and connectivity in the cluster.",
          code: `# Launch busybox for network debugging
kubectl run debug --image=busybox:1.36 -it --rm -- /bin/sh
# --rm deletes the Pod when you exit

# Test DNS resolution
nslookup postgres-svc
nslookup postgres-svc.production.svc.cluster.local

# Test TCP connectivity
nc -zv postgres-svc 5432

# Use curl for HTTP debugging
kubectl run debug --image=curlimages/curl:latest -it --rm -- sh
curl http://fastapi-svc/health
curl -v http://fastapi-svc:80/api/v1/users

# Debug with a Python shell
kubectl run debug --image=python:3.12-slim -it --rm -- python3
# >>> import socket; socket.gethostbyname("postgres-svc")`,
          notes: [
            "--rm flag ensures the debug Pod is deleted when you exit",
            "Use the same image as your app to test dependency imports",
            "Run in the same namespace as your app to test Service DNS",
          ]
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "deployments",
      icon: "🚀",
      title: "Deployments",
      items: [
        {
          title: "Production Deployment",
          lang: "yaml",
          filename: "deployment-production.yaml",
          desc: "A complete, production-ready Deployment with replicas, resources, probes, and rolling update strategy.",
          code: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: fastapi-app
  namespace: production
  labels:
    app: fastapi-app
    version: "2.1.0"
spec:
  replicas: 3
  revisionHistoryLimit: 5

  selector:
    matchLabels:
      app: fastapi-app

  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1    # at most 1 unavailable during update
      maxSurge: 1          # at most 1 extra Pod during update

  template:
    metadata:
      labels:
        app: fastapi-app
    spec:
      containers:
      - name: app
        image: myorg/fastapi-app:2.1.0
        ports:
        - containerPort: 8000

        envFrom:
        - configMapRef:
            name: fastapi-config
        - secretRef:
            name: fastapi-secrets

        resources:
          requests:
            cpu: "250m"
            memory: "256Mi"
          limits:
            cpu: "1"
            memory: "512Mi"

        readinessProbe:
          httpGet:
            path: /health/ready
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 10

        livenessProbe:
          httpGet:
            path: /health/live
            port: 8000
          initialDelaySeconds: 15
          periodSeconds: 20
          failureThreshold: 3`,
          notes: [
            "selector.matchLabels must be a subset of template.metadata.labels",
            "maxUnavailable=1 + maxSurge=1 means: at any point, 2-4 Pods exist during rollout",
            "revisionHistoryLimit controls how many old ReplicaSets are kept for rollback",
          ]
        },
        {
          title: "Horizontal Pod Autoscaler (HPA)",
          lang: "yaml",
          filename: "hpa.yaml",
          desc: "Automatically scale replicas based on CPU or memory. Requires metrics-server installed in the cluster.",
          code: `apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: fastapi-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: fastapi-app

  minReplicas: 3
  maxReplicas: 20

  metrics:
  # Scale up when average CPU > 70%
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70

  # Scale up when average memory > 80%
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80

  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60    # wait 60s before scaling up again
      policies:
      - type: Pods
        value: 4                        # add at most 4 Pods per window
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300   # wait 5min before scaling down`,
          notes: [
            "Requires metrics-server: kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml",
            "Resource requests MUST be set on containers — HPA uses requests as the denominator for utilization",
            "stabilizationWindowSeconds prevents flapping during brief traffic spikes",
            "For queue-based scaling (Kafka lag, SQS depth), use KEDA instead of HPA",
          ]
        },
        {
          title: "Rolling Update Commands",
          lang: "bash",
          filename: "rolling-update.sh",
          desc: "Commands to manage deployments, rollouts, and rollbacks in production.",
          code: `# Deploy a new image version (triggers rolling update)
kubectl set image deployment/fastapi-app app=myorg/fastapi-app:2.2.0 -n production

# Watch the rollout in real time
kubectl rollout status deployment/fastapi-app -n production

# View rollout history
kubectl rollout history deployment/fastapi-app -n production

# View specific revision details
kubectl rollout history deployment/fastapi-app --revision=3

# Roll back to previous version
kubectl rollout undo deployment/fastapi-app -n production

# Roll back to specific revision
kubectl rollout undo deployment/fastapi-app --to-revision=2

# Restart all Pods (useful to pick up new ConfigMap/Secret values)
kubectl rollout restart deployment/fastapi-app -n production

# Pause a rollout (to inspect mid-way)
kubectl rollout pause deployment/fastapi-app
kubectl rollout resume deployment/fastapi-app

# Check current ReplicaSets (shows old RS kept for rollback)
kubectl get replicasets -l app=fastapi-app`,
          notes: [
            "kubectl rollout undo is safe — it goes back to the previous ReplicaSet",
            "kubectl rollout restart creates a new rollout without changing the spec — Pods get new IPs",
            "Always watch rollout status in CI/CD pipelines — don't just apply and move on",
          ]
        },
        {
          title: "PodDisruptionBudget — Protect During Node Maintenance",
          lang: "yaml",
          filename: "pdb.yaml",
          desc: "Guarantee a minimum number of available Pods during voluntary disruptions (node upgrades, cluster maintenance).",
          code: `apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: fastapi-pdb
  namespace: production
spec:
  selector:
    matchLabels:
      app: fastapi-app

  # Option A: minimum available (at least 2 Pods always running)
  minAvailable: 2

  # Option B: maximum unavailable (at most 1 Pod unavailable at a time)
  # maxUnavailable: 1`,
          notes: [
            "PDB only protects against VOLUNTARY disruptions (kubectl drain, node upgrades)",
            "Hardware failures bypass PDB — they're involuntary",
            "For 3 replicas, minAvailable: 2 means drain can only proceed if 2+ Pods are running elsewhere",
            "Required for production clusters that undergo regular node upgrades (GKE, EKS auto-upgrades)",
          ]
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "services",
      icon: "🌐",
      title: "Services & Networking",
      items: [
        {
          title: "ClusterIP Service",
          lang: "yaml",
          filename: "service-clusterip.yaml",
          desc: "Internal-only service. Other Pods in the cluster reach it by name (via CoreDNS). The default type.",
          code: `apiVersion: v1
kind: Service
metadata:
  name: fastapi-svc
  namespace: production
spec:
  # type: ClusterIP  # This is the default — can omit
  selector:
    app: fastapi-app      # routes to Pods with this label
  ports:
  - name: http
    protocol: TCP
    port: 80              # port clients use
    targetPort: 8000      # port the Pod listens on
  - name: metrics
    port: 9090
    targetPort: 9090`,
          notes: [
            "DNS: fastapi-svc (same namespace) or fastapi-svc.production.svc.cluster.local (cross-namespace)",
            "Traffic is load-balanced across all Ready Pods matching the selector",
            "Pods NOT passing readiness probe are excluded from routing automatically",
          ]
        },
        {
          title: "LoadBalancer Service",
          lang: "yaml",
          filename: "service-loadbalancer.yaml",
          desc: "Exposes a service externally via a cloud load balancer. Each LoadBalancer Service costs money (one LB per service).",
          code: `apiVersion: v1
kind: Service
metadata:
  name: fastapi-public
  namespace: production
  annotations:
    # GCP: force internal load balancer (private VPC access only)
    # cloud.google.com/load-balancer-type: "Internal"
    # AWS: annotation for NLB instead of CLB
    # service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
spec:
  type: LoadBalancer
  selector:
    app: fastapi-app
  ports:
  - name: http
    port: 80
    targetPort: 8000
  - name: https
    port: 443
    targetPort: 8443`,
          notes: [
            "In production, prefer one Ingress controller over many LoadBalancer Services",
            "After apply, run 'kubectl get svc fastapi-public' to see the EXTERNAL-IP (may take 1-2 min)",
            "GCP: creates a TCP/UDP Network Load Balancer by default",
          ]
        },
        {
          title: "Headless Service for StatefulSets",
          lang: "yaml",
          filename: "service-headless.yaml",
          desc: "clusterIP: None disables the virtual IP. DNS returns individual Pod IPs. Required for StatefulSets.",
          code: `apiVersion: v1
kind: Service
metadata:
  name: postgres-headless
  namespace: production
spec:
  clusterIP: None      # headless — no virtual IP
  selector:
    app: postgres
  ports:
  - port: 5432
    name: postgres

# DNS now returns A records per Pod:
# postgres-0.postgres-headless.production.svc.cluster.local -> 10.244.1.5
# postgres-1.postgres-headless.production.svc.cluster.local -> 10.244.2.3`,
          notes: [
            "StatefulSet Pods get stable hostnames: {pod-name}.{headless-service}.{namespace}.svc.cluster.local",
            "This allows peer-to-peer discovery (Postgres replication, Redis Cluster, Kafka brokers)",
            "The serviceName in a StatefulSet spec must match this Service's name",
          ]
        },
        {
          title: "Kubernetes DNS Reference",
          lang: "bash",
          filename: "dns-reference.sh",
          desc: "How to construct DNS names for Services and Pods in a Kubernetes cluster.",
          code: `# Service DNS patterns:
# <service-name>.<namespace>.svc.cluster.local  (fully qualified)
# <service-name>.<namespace>                     (short)
# <service-name>                                 (same namespace only)

# Example: FastAPI service in 'production' namespace
# From inside production namespace: fastapi-svc
# From other namespaces:            fastapi-svc.production

# Test DNS from inside a Pod
kubectl exec -it my-pod -- nslookup fastapi-svc
kubectl exec -it my-pod -- nslookup fastapi-svc.production.svc.cluster.local

# Debug DNS with a one-shot Pod
kubectl run dnsutils --image=registry.k8s.io/e2e-test-images/jessie-dnsutils:1.3 \
  -it --rm -- nslookup kubernetes.default

# Check CoreDNS is running
kubectl get pods -n kube-system -l k8s-app=kube-dns

# View CoreDNS config
kubectl get configmap coredns -n kube-system -o yaml`,
          notes: [
            "cluster.local is the default cluster domain — may differ in some setups",
            "Pods also get DNS: <pod-ip-dashes>.<namespace>.pod.cluster.local (rarely used)",
            "CoreDNS is the default DNS server in all modern Kubernetes clusters",
          ]
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "config",
      icon: "⚙️",
      title: "ConfigMaps & Secrets",
      items: [
        {
          title: "ConfigMap — Key-Value and File Config",
          lang: "yaml",
          filename: "configmap.yaml",
          desc: "Store non-sensitive configuration. Can hold key-value pairs or entire file contents.",
          code: `apiVersion: v1
kind: ConfigMap
metadata:
  name: fastapi-config
  namespace: production
data:
  # Simple key-value pairs (inject as env vars)
  LOG_LEVEL: "info"
  WORKERS: "4"
  ALLOWED_HOSTS: "*.myapp.com"
  MAX_CONNECTIONS: "100"

  # Entire config file as a value (inject as volume mount)
  gunicorn.conf.py: |
    bind = "0.0.0.0:8000"
    workers = 4
    worker_class = "uvicorn.workers.UvicornWorker"
    timeout = 120
    keepalive = 5
    accesslog = "-"
    errorlog = "-"`,
          notes: [
            "ConfigMaps are namespace-scoped — same name in different namespaces are independent",
            "Max size: 1 MiB. For larger config, use a volume mount from a PVC",
            "Files mounted via volume update automatically (~1 min delay). Env vars do not.",
          ]
        },
        {
          title: "Secret with stringData",
          lang: "yaml",
          filename: "secret.yaml",
          desc: "stringData lets you write plain text — Kubernetes base64-encodes it for you at creation time.",
          code: `apiVersion: v1
kind: Secret
metadata:
  name: fastapi-secrets
  namespace: production
type: Opaque
# Use stringData for human-readable values (K8s encodes them)
stringData:
  DATABASE_URL: "postgresql+asyncpg://user:pass@postgres-svc:5432/prod"
  REDIS_URL: "redis://:password@redis-svc:6379/0"
  JWT_SECRET: "your-256-bit-secret-here"
  OPENAI_API_KEY: "sk-proj-..."

---
# TLS Secret (for Ingress TLS termination)
apiVersion: v1
kind: Secret
metadata:
  name: tls-secret
  namespace: production
type: kubernetes.io/tls
data:
  tls.crt: <base64-encoded-cert>
  tls.key: <base64-encoded-key>`,
          notes: [
            "stringData is write-only — kubectl get secret shows base64 in data, not stringData",
            "type: Opaque is general-purpose. Other types: kubernetes.io/tls, kubernetes.io/dockerconfigjson",
            "Never commit real secrets to Git. Use Sealed Secrets or External Secrets Operator instead",
          ]
        },
        {
          title: "External Secrets Operator",
          lang: "yaml",
          filename: "external-secret.yaml",
          desc: "Sync secrets from AWS Secrets Manager / GCP Secret Manager into Kubernetes Secrets automatically.",
          code: `# Install ESO: helm install external-secrets external-secrets/external-secrets -n external-secrets

# 1. Configure the SecretStore (how to authenticate to the external provider)
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: aws-secretsmanager
  namespace: production
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-east-1
      auth:
        serviceAccount:
          name: external-secrets-sa   # IAM role attached via IRSA

---
# 2. Create an ExternalSecret (what to sync)
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: fastapi-secrets
  namespace: production
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secretsmanager
    kind: SecretStore
  target:
    name: fastapi-secrets    # K8s Secret to create/update
    creationPolicy: Owner
  data:
  - secretKey: DATABASE_URL
    remoteRef:
      key: prod/fastapi/database
      property: url
  - secretKey: JWT_SECRET
    remoteRef:
      key: prod/fastapi/auth
      property: jwt_secret`,
          notes: [
            "ESO creates and keeps Kubernetes Secrets in sync with external stores",
            "refreshInterval controls how often ESO polls for changes",
            "On GCP: use ClusterSecretStore with workload identity for GCP Secret Manager",
            "This is the production-grade solution — not manual Secret YAML files",
          ]
        },
        {
          title: "Sealed Secrets — GitOps-Safe Secrets",
          lang: "bash",
          filename: "sealed-secrets.sh",
          desc: "Encrypt a Kubernetes Secret with the cluster's public key. Commit the encrypted SealedSecret safely to Git.",
          code: `# Install kubeseal CLI
brew install kubeseal

# Install Sealed Secrets controller in cluster
helm install sealed-secrets sealed-secrets/sealed-secrets -n kube-system

# Create a plain Secret YAML (DO NOT commit this)
kubectl create secret generic db-secret \
  --from-literal=DATABASE_URL="postgresql://..." \
  --dry-run=client -o yaml > plain-secret.yaml

# Seal it with the cluster's public key
kubeseal --format=yaml < plain-secret.yaml > sealed-secret.yaml

# Commit sealed-secret.yaml to Git (safe — only your cluster can decrypt)
git add sealed-secret.yaml && git commit -m "add sealed db secret"

# Apply to cluster (controller decrypts and creates the real Secret)
kubectl apply -f sealed-secret.yaml

# Clean up the plain secret file
rm plain-secret.yaml`,
          notes: [
            "The SealedSecret is cluster-specific — it can't be decrypted by other clusters",
            "The private key stays inside the cluster in kube-system namespace",
            "Back up the controller's private key: kubectl get secret -n kube-system sealed-secrets-key -o yaml",
          ]
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "kubectl",
      icon: "🖥️",
      title: "kubectl Reference",
      items: [
        {
          title: "Essential Daily Commands",
          lang: "bash",
          filename: "kubectl-daily.sh",
          desc: "The commands you'll use every single day working with Kubernetes.",
          code: `# ── APPLY / DELETE ──────────────────────────────────────────────
kubectl apply -f manifest.yaml            # create or update
kubectl apply -f ./k8s/                   # apply whole directory
kubectl delete -f manifest.yaml           # delete by file
kubectl delete pod my-pod                 # delete by name
kubectl delete pod -l app=fastapi-app     # delete by label

# ── GET / DESCRIBE ───────────────────────────────────────────────
kubectl get pods                          # list Pods
kubectl get pods -o wide                  # + node, IP
kubectl get pods --watch                  # stream changes
kubectl get all -n production             # everything in namespace
kubectl get pods -A                       # all namespaces

kubectl describe pod my-pod               # full details + events
kubectl describe node my-node             # node capacity, taints
kubectl describe svc my-svc               # endpoints, selectors

# ── LOGS ─────────────────────────────────────────────────────────
kubectl logs my-pod                       # current logs
kubectl logs my-pod -f                    # follow
kubectl logs my-pod --previous            # last crash
kubectl logs my-pod --tail=50             # last 50 lines
kubectl logs -l app=fastapi-app --tail=20 # logs from all matching pods

# ── EXEC / DEBUG ─────────────────────────────────────────────────
kubectl exec -it my-pod -- /bin/bash
kubectl port-forward svc/my-svc 8080:80   # local → cluster
kubectl cp my-pod:/app/error.log ./error.log

# ── SCALE / RESTART ──────────────────────────────────────────────
kubectl scale deployment my-dep --replicas=5
kubectl rollout restart deployment/my-dep`,
          notes: [
            "alias k=kubectl saves thousands of keystrokes — add to .zshrc",
            "kubectl get pods --watch is invaluable during deployments and debugging",
            "kubectl describe shows Events section — the first place to look when something's broken",
          ]
        },
        {
          title: "JSONPath and Output Formatting",
          lang: "bash",
          filename: "kubectl-output.sh",
          desc: "Extract specific fields from Kubernetes objects using JSONPath — essential for scripting.",
          code: `# Get all Pod names
kubectl get pods -o jsonpath='{.items[*].metadata.name}'

# Get image names for all containers in all Pods
kubectl get pods -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.containers[0].image}{"\n"}{end}'

# Get node IPs
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.addresses[0].address}{"\n"}{end}'

# Get all Pods NOT in Running state
kubectl get pods --field-selector=status.phase!=Running

# Custom columns (cleaner than -o wide)
kubectl get pods -o custom-columns="NAME:.metadata.name,STATUS:.status.phase,NODE:.spec.nodeName,IMAGE:.spec.containers[0].image"

# Sort by field
kubectl get pods --sort-by='.metadata.creationTimestamp'
kubectl get pods --sort-by='.status.startTime' --all-namespaces

# Get events sorted by time
kubectl get events --sort-by='.lastTimestamp' -n production`,
          notes: [
            "JSONPath uses Go template syntax — test with -o json first to see the structure",
            "custom-columns is great for dashboards and scripts where you need specific fields",
            "--field-selector filters by object fields (vs -l which filters by labels)",
          ]
        },
        {
          title: "Namespace and Context Management",
          lang: "bash",
          filename: "kubectl-context.sh",
          desc: "Switch between clusters and namespaces. Install kubectx/kubens for a much better experience.",
          code: `# See all configured contexts (one per cluster)
kubectl config get-contexts

# Switch context
kubectl config use-context gke_myproject_us-central1_prod

# Set default namespace for current context (avoid typing -n every time)
kubectl config set-context --current --namespace=production

# See current context
kubectl config current-context

# ── kubectx / kubens (install: brew install kubectx) ────────────
kubectx                    # list contexts
kubectx prod-cluster       # switch to prod context
kubectx -                  # switch back to previous

kubens                     # list namespaces
kubens production          # set default namespace

# ── k9s (install: brew install k9s) ─────────────────────────────
k9s                        # full terminal UI for cluster navigation
# :pods → list pods, :deploy → deployments, :logs → log viewer
# / to search, d to describe, l for logs, e to edit, ctrl+d to delete`,
          notes: [
            "kubectx and kubens are community tools that make switching much faster",
            "k9s is a must-have — it's a full terminal UI that replaces most kubectl commands",
            "Never run commands against prod without verifying your context first",
          ]
        },
        {
          title: "Debugging a CrashLoopBackOff",
          lang: "bash",
          filename: "debug-crashloop.sh",
          desc: "Step-by-step procedure to diagnose a Pod stuck in CrashLoopBackOff.",
          code: `# Step 1: Get the Pod name and basic status
kubectl get pods -n production
# NAME                           READY   STATUS             RESTARTS
# fastapi-app-abc123-xyz         0/1     CrashLoopBackOff   5

# Step 2: Get the crash logs (--previous = last crashed instance)
kubectl logs fastapi-app-abc123-xyz --previous -n production

# Step 3: Describe the Pod — check Events section at the bottom
kubectl describe pod fastapi-app-abc123-xyz -n production
# Look for:
#   - OOMKilled (increase memory limit)
#   - ImagePullBackOff (wrong image name/tag, no pull secret)
#   - Back-off restarting (crash loop — look at logs)
#   - Liveness probe failed (probe misconfigured or app not ready in time)

# Step 4: If the container exits immediately, override the entrypoint
kubectl run debug-copy --image=myorg/fastapi-app:2.1.0 \
  -it --rm -- /bin/bash
# Now check: are dependencies missing? env vars set? file permissions?

# Step 5: Check resource limits (OOMKilled)
kubectl get pod fastapi-app-abc123-xyz -o jsonpath='{.status.containerStatuses[0].lastState.terminated.reason}'
# If "OOMKilled" — increase memory limit

# Step 6: Check for config/secret issues
kubectl describe pod fastapi-app-abc123-xyz | grep -A 5 "Environment\|Mounts"`,
          notes: [
            "CrashLoopBackOff = the container keeps starting and crashing (backoff delay grows to 5min)",
            "Always check --previous logs — current container may have no logs if it crashes immediately",
            "OOMKilled in lastState.terminated.reason = container exceeded memory limit — increase limits",
            "ImagePullBackOff = image doesn't exist or wrong credentials — check image name and imagePullSecrets",
          ]
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "probes",
      icon: "❤️",
      title: "Health Probes",
      items: [
        {
          title: "All Three Probe Types",
          lang: "yaml",
          filename: "probes-all.yaml",
          desc: "Using startup + readiness + liveness together — the gold standard for containers that load models or connect to databases.",
          code: `spec:
  containers:
  - name: ml-inference-server
    image: myorg/llm-server:1.0.0

    # STARTUP PROBE: disables liveness/readiness until model is loaded
    # failureThreshold × periodSeconds = max startup time
    # 30 × 10 = 300 seconds (5 minutes) allowed
    startupProbe:
      httpGet:
        path: /health/startup
        port: 8080
      failureThreshold: 30
      periodSeconds: 10

    # READINESS PROBE: controls if traffic is sent to this Pod
    # Fails if: DB unreachable, cache miss, model not loaded
    readinessProbe:
      httpGet:
        path: /health/ready
        port: 8080
      initialDelaySeconds: 0    # startup probe handles the delay
      periodSeconds: 10
      failureThreshold: 3       # remove from LB after 3 failures
      successThreshold: 1

    # LIVENESS PROBE: restarts container if it becomes deadlocked
    # Should be lightweight — just "is the process responding?"
    livenessProbe:
      httpGet:
        path: /health/live
        port: 8080
      periodSeconds: 20
      failureThreshold: 3       # restart after 3 failures`,
          notes: [
            "Startup probe prevents liveness from killing a slow-starting container",
            "Readiness failure = removed from Service (no restart) — ideal for temporary overload",
            "Liveness failure = container restart — use only for permanent failures (deadlock, OOM)",
            "Never check downstream dependencies in the liveness probe",
          ]
        },
        {
          title: "TCP and Exec Probes",
          lang: "yaml",
          filename: "probes-tcp-exec.yaml",
          desc: "Use TCP socket probes for databases and exec probes for scripts.",
          code: `spec:
  containers:
  # TCP socket probe — for non-HTTP services (Redis, PostgreSQL, Kafka)
  - name: redis
    image: redis:7
    readinessProbe:
      tcpSocket:
        port: 6379
      initialDelaySeconds: 5
      periodSeconds: 10
    livenessProbe:
      tcpSocket:
        port: 6379
      initialDelaySeconds: 15
      periodSeconds: 20

  # Exec probe — run a command inside the container
  - name: postgres
    image: postgres:16
    readinessProbe:
      exec:
        command:
        - pg_isready
        - -U
        - postgres
      initialDelaySeconds: 5
      periodSeconds: 10`,
          notes: [
            "tcpSocket just checks if the port accepts connections — doesn't send data",
            "exec runs a command and checks exit code (0 = healthy, non-zero = unhealthy)",
            "Exec probes add process overhead — prefer httpGet or tcpSocket when possible",
          ]
        },
        {
          title: "FastAPI Health Endpoints",
          lang: "python",
          filename: "health.py",
          desc: "Production-ready health check endpoints for FastAPI — separate live/ready/startup.",
          code: `from fastapi import FastAPI, HTTPException, status
from typing import Optional
import asyncpg
import redis.asyncio as aioredis
import time

app = FastAPI()
_start_time = time.time()
_model_loaded = False  # set to True when model finishes loading

# ── Liveness: just check the process is alive ──────────────────
@app.get("/health/live", status_code=200)
async def liveness():
    """
    Lightweight — just proves the server is responding.
    NEVER check database or external services here.
    """
    return {"status": "alive", "uptime": time.time() - _start_time}

# ── Readiness: check all dependencies ─────────────────────────
@app.get("/health/ready", status_code=200)
async def readiness():
    """
    Checks: DB connection, cache, model loaded.
    Returns 503 if anything is wrong — removes Pod from LB.
    """
    errors = []

    # Check database
    try:
        async with app.state.db_pool.acquire() as conn:
            await conn.fetchval("SELECT 1")
    except Exception as e:
        errors.append(f"database: {e}")

    # Check Redis
    try:
        await app.state.cache.ping()
    except Exception as e:
        errors.append(f"cache: {e}")

    # Check model loaded (for ML servers)
    if not _model_loaded:
        errors.append("model: not loaded yet")

    if errors:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"status": "not ready", "errors": errors}
        )

    return {"status": "ready"}

# ── Startup: used by startupProbe while initializing ──────────
@app.get("/health/startup", status_code=200)
async def startup_check():
    """
    Returns 503 until model loading is complete.
    The startupProbe calls this; liveness/readiness probes wait.
    """
    if not _model_loaded:
        raise HTTPException(status_code=503, detail="model still loading")
    return {"status": "started"}`,
          notes: [
            "Split liveness and readiness into separate endpoints for different behaviors",
            "Return structured JSON in 503 responses so logs show exactly what failed",
            "The startup endpoint can check _model_loaded flag set by your background startup task",
          ]
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "resources",
      icon: "📊",
      title: "Resources & Namespaces",
      items: [
        {
          title: "Resource Requests and Limits",
          lang: "yaml",
          filename: "resources.yaml",
          desc: "Define CPU/memory requests (scheduling) and limits (hard cap). Always set both in production.",
          code: `spec:
  containers:
  # ── Web service: moderate resources ──────────────────────────
  - name: fastapi-app
    image: myorg/fastapi-app:2.1.0
    resources:
      requests:
        cpu: "250m"       # 0.25 cores reserved for scheduling
        memory: "256Mi"   # 256 MiB reserved
      limits:
        cpu: "1"          # throttled to 1 core (never OOMKilled for CPU)
        memory: "512Mi"   # OOMKilled if exceeds 512 MiB

  # ── ML inference: large resources ────────────────────────────
  - name: llm-server
    image: myorg/llm-server:1.0.0
    resources:
      requests:
        cpu: "4"
        memory: "14Gi"    # model fits in memory
        nvidia.com/gpu: "1"   # request 1 GPU (requires nvidia device plugin)
      limits:
        cpu: "8"
        memory: "16Gi"
        nvidia.com/gpu: "1"

  # ── Sidecar: tiny resources ───────────────────────────────────
  - name: log-shipper
    image: fluent/fluent-bit:3.0
    resources:
      requests:
        cpu: "50m"
        memory: "64Mi"
      limits:
        cpu: "100m"
        memory: "128Mi"`,
          notes: [
            "requests == limits → Guaranteed QoS (best for critical services, no throttle surprises)",
            "requests < limits → Burstable QoS (allows bursting, evicted after BestEffort under pressure)",
            "No requests/limits → BestEffort QoS (evicted first — never use in production)",
            "CPU is compressible (throttled), memory is not (OOMKilled when over limit)",
          ]
        },
        {
          title: "Namespace with ResourceQuota",
          lang: "yaml",
          filename: "namespace-quota.yaml",
          desc: "Isolate teams with namespaces + ResourceQuota to cap total resource usage per team.",
          code: `# Create namespace
apiVersion: v1
kind: Namespace
metadata:
  name: team-ml
  labels:
    team: ml-platform
    env: production

---
# Cap total resource usage for this namespace
apiVersion: v1
kind: ResourceQuota
metadata:
  name: team-ml-quota
  namespace: team-ml
spec:
  hard:
    # Compute
    requests.cpu: "20"
    requests.memory: "40Gi"
    limits.cpu: "40"
    limits.memory: "80Gi"
    # Object counts
    pods: "50"
    services: "20"
    persistentvolumeclaims: "10"
    secrets: "50"
    configmaps: "50"

---
# Set default limits so Pods without explicit limits still get some
apiVersion: v1
kind: LimitRange
metadata:
  name: team-ml-limits
  namespace: team-ml
spec:
  limits:
  - type: Container
    default:
      cpu: "500m"
      memory: "256Mi"
    defaultRequest:
      cpu: "100m"
      memory: "128Mi"
    max:
      cpu: "8"
      memory: "16Gi"`,
          notes: [
            "ResourceQuota prevents one team from monopolizing cluster resources",
            "LimitRange provides defaults so Pods without explicit resources still get sensible values",
            "Combine with RBAC to give teams admin rights in their namespace only",
          ]
        },
        {
          title: "Node Affinity and Taints",
          lang: "yaml",
          filename: "scheduling.yaml",
          desc: "Control which nodes a Pod runs on using node affinity (pod preference) and taints/tolerations (node restrictions).",
          code: `spec:
  # ── Node Affinity: prefer/require specific node types ─────────
  affinity:
    nodeAffinity:
      # Hard requirement: must run on a node in us-central1
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
        - matchExpressions:
          - key: topology.kubernetes.io/region
            operator: In
            values: ["us-central1"]

      # Soft preference: prefer GPU nodes, fall back to CPU
      preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 100
        preference:
          matchExpressions:
          - key: cloud.google.com/gke-accelerator
            operator: Exists

    # Pod anti-affinity: spread replicas across nodes
    podAntiAffinity:
      preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 100
        podAffinityTerm:
          labelSelector:
            matchLabels:
              app: fastapi-app
          topologyKey: kubernetes.io/hostname

  # ── Tolerations: run on tainted nodes (e.g. GPU nodes) ───────
  tolerations:
  - key: "nvidia.com/gpu"
    operator: "Exists"
    effect: "NoSchedule"

  containers:
  - name: app
    image: myorg/fastapi-app:2.1.0`,
          notes: [
            "requiredDuring = hard rule (Pod stays Pending if no matching node)",
            "preferredDuring = soft hint (tries to match, falls back if not available)",
            "podAntiAffinity with topologyKey=hostname spreads replicas for HA",
            "Tolerations allow scheduling onto tainted nodes (common for GPU/spot nodes)",
          ]
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "storage",
      icon: "💾",
      title: "Persistent Volumes",
      items: [
        {
          title: "PVC + Pod Mount",
          lang: "yaml",
          filename: "pvc-pod.yaml",
          desc: "Request persistent storage with a PVC, then mount it into a Pod.",
          code: `# Step 1: Create the PersistentVolumeClaim
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-data
  namespace: production
spec:
  accessModes:
  - ReadWriteOnce          # only one node can mount at a time (block storage)
  storageClassName: premium-rwo   # SSD on GKE; use gp3 on EKS
  resources:
    requests:
      storage: 50Gi

---
# Step 2: Use the PVC in a Pod
apiVersion: v1
kind: Pod
metadata:
  name: postgres
  namespace: production
spec:
  containers:
  - name: postgres
    image: postgres:16
    env:
    - name: POSTGRES_PASSWORD
      valueFrom:
        secretKeyRef:
          name: postgres-secret
          key: password
    - name: PGDATA
      value: /var/lib/postgresql/data/pgdata
    volumeMounts:
    - name: data
      mountPath: /var/lib/postgresql/data
  volumes:
  - name: data
    persistentVolumeClaim:
      claimName: postgres-data`,
          notes: [
            "ReadWriteOnce (RWO): one node at a time — most block storage (GCE PD, EBS, Azure Disk)",
            "ReadWriteMany (RWX): multiple nodes — requires NFS/GCS Filestore/EFS",
            "PVC lifecycle is independent of Pod lifecycle — data survives Pod deletion",
            "Use PGDATA subdirectory to avoid postgres permissions issues with mounted volumes",
          ]
        },
        {
          title: "StatefulSet with VolumeClaimTemplates",
          lang: "yaml",
          filename: "statefulset.yaml",
          desc: "StatefulSet auto-creates one PVC per replica. Pods get stable hostnames. Perfect for databases.",
          code: `apiVersion: v1
kind: Service
metadata:
  name: postgres-headless
  namespace: production
spec:
  clusterIP: None      # headless — required for StatefulSet DNS
  selector:
    app: postgres
  ports:
  - port: 5432

---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: production
spec:
  serviceName: postgres-headless   # must match headless Service name
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:16
        ports:
        - containerPort: 5432
        env:
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: password
        - name: PGDATA
          value: /var/lib/postgresql/data/pgdata
        resources:
          requests:
            cpu: "500m"
            memory: "1Gi"
          limits:
            cpu: "2"
            memory: "4Gi"
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data

  # Auto-creates PVC "data-postgres-0", "data-postgres-1", etc.
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: premium-rwo
      resources:
        requests:
          storage: 50Gi`,
          notes: [
            "Pod DNS: postgres-0.postgres-headless.production.svc.cluster.local",
            "PVCs are NOT deleted when StatefulSet is deleted — data persists for safety",
            "Scale down before scale up to avoid data inconsistency in replicated databases",
            "For production PostgreSQL, use a Helm chart (Bitnami/Zalando operator) instead of manual StatefulSet",
          ]
        },
        {
          title: "Volume Types Reference",
          lang: "yaml",
          filename: "volume-types.yaml",
          desc: "Quick reference for the most common volume types and when to use each.",
          code: `spec:
  volumes:
  # emptyDir: ephemeral, deleted with Pod — for shared scratch space
  - name: tmp-cache
    emptyDir:
      sizeLimit: 1Gi
      medium: Memory   # optional: use RAM instead of disk (faster, limited)

  # configMap: mount ConfigMap keys as files
  - name: app-config
    configMap:
      name: fastapi-config
      defaultMode: 0444   # read-only for all users

  # secret: mount Secret keys as files
  - name: tls-certs
    secret:
      secretName: tls-secret
      defaultMode: 0400   # read-only for owner only

  # persistentVolumeClaim: durable storage
  - name: data
    persistentVolumeClaim:
      claimName: postgres-data

  # hostPath: mount a path from the node — avoid in production (not portable)
  - name: node-logs
    hostPath:
      path: /var/log
      type: Directory`,
          notes: [
            "emptyDir with medium: Memory is useful for ML model caching between requests",
            "configMap and secret volumes auto-update when the source changes (~1 min)",
            "hostPath breaks pod portability and has security implications — avoid unless necessary",
            "For temporary files in containers, just write to the container's writable layer (no volume needed)",
          ]
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "patterns",
      icon: "🏗️",
      title: "Production Patterns",
      items: [
        {
          title: "Full Stack: FastAPI + Postgres + Redis",
          lang: "yaml",
          filename: "full-stack.yaml",
          desc: "A complete multi-service stack with Deployment, StatefulSet, Services, ConfigMap, and Secret.",
          code: `# ── ConfigMap ──────────────────────────────────────────────────
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: production
data:
  LOG_LEVEL: "info"
  REDIS_URL: "redis://redis-svc:6379/0"
  DB_HOST: "postgres-0.postgres-headless"
  DB_PORT: "5432"
  DB_NAME: "myapp"

---
# ── Secret ─────────────────────────────────────────────────────
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
  namespace: production
stringData:
  DB_PASSWORD: "changeme"
  JWT_SECRET: "replace-with-real-secret"

---
# ── FastAPI Deployment ──────────────────────────────────────────
apiVersion: apps/v1
kind: Deployment
metadata:
  name: fastapi-app
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: fastapi-app
  template:
    metadata:
      labels:
        app: fastapi-app
    spec:
      containers:
      - name: app
        image: myorg/fastapi-app:1.0.0
        ports:
        - containerPort: 8000
        envFrom:
        - configMapRef:
            name: app-config
        - secretRef:
            name: app-secrets
        resources:
          requests: { cpu: "250m", memory: "256Mi" }
          limits: { cpu: "1", memory: "512Mi" }
        readinessProbe:
          httpGet: { path: /health/ready, port: 8000 }
          periodSeconds: 10
        livenessProbe:
          httpGet: { path: /health/live, port: 8000 }
          periodSeconds: 20

---
# ── FastAPI Service ─────────────────────────────────────────────
apiVersion: v1
kind: Service
metadata:
  name: fastapi-svc
  namespace: production
spec:
  selector:
    app: fastapi-app
  ports:
  - port: 80
    targetPort: 8000

---
# ── Redis Deployment ────────────────────────────────────────────
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: production
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        ports:
        - containerPort: 6379
        resources:
          requests: { cpu: "100m", memory: "128Mi" }
          limits: { cpu: "500m", memory: "512Mi" }

---
apiVersion: v1
kind: Service
metadata:
  name: redis-svc
  namespace: production
spec:
  selector:
    app: redis
  ports:
  - port: 6379`,
          notes: [
            "This stack: 3 FastAPI replicas, 1 Redis, 1 Postgres StatefulSet (add separately)",
            "All in one namespace = simple; separate namespaces per service = better RBAC isolation",
            "In production: add HPA for FastAPI, PVC for Redis persistence",
          ]
        },
        {
          title: "Kustomize — Environment Overlays",
          lang: "yaml",
          filename: "kustomize-overlay.yaml",
          desc: "Use Kustomize to manage dev/staging/prod variations without duplicating YAML.",
          code: `# Directory structure:
# k8s/
# ├── base/
# │   ├── kustomization.yaml
# │   ├── deployment.yaml
# │   └── service.yaml
# └── overlays/
#     ├── dev/
#     │   └── kustomization.yaml
#     └── prod/
#         └── kustomization.yaml

# base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
- deployment.yaml
- service.yaml

---
# overlays/prod/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: production
resources:
- ../../base
patches:
- patch: |-
    - op: replace
      path: /spec/replicas
      value: 5
  target:
    kind: Deployment
    name: fastapi-app
- patch: |-
    - op: replace
      path: /spec/template/spec/containers/0/resources/limits/memory
      value: "1Gi"
  target:
    kind: Deployment
    name: fastapi-app
images:
- name: myorg/fastapi-app
  newTag: "2.1.0"`,
          notes: [
            "kubectl apply -k overlays/prod/ applies the base + all overlay patches",
            "Kustomize is built into kubectl — no extra tools needed",
            "For complex multi-environment setups, consider Helm charts instead",
          ]
        },
        {
          title: "Complete kubectl Cheat Sheet",
          lang: "bash",
          filename: "cheatsheet.sh",
          desc: "The most useful kubectl commands in one place — print and pin to your wall.",
          code: `# ════ APPLY & DELETE ════════════════════════════════════════════
kubectl apply -f file.yaml
kubectl apply -f ./directory/
kubectl apply -k ./overlays/prod/        # kustomize
kubectl delete -f file.yaml
kubectl delete pod,svc -l app=myapp      # delete by label

# ════ GET (info) ═════════════════════════════════════════════════
kubectl get pods -o wide -A              # all namespaces + details
kubectl get all -n production            # everything in namespace
kubectl get events --sort-by=.lastTimestamp -n production

# ════ DESCRIBE (deep dive) ═══════════════════════════════════════
kubectl describe pod <name>              # events + conditions
kubectl describe node <name>             # capacity + allocations

# ════ LOGS ═══════════════════════════════════════════════════════
kubectl logs <pod> -f --tail=100
kubectl logs <pod> --previous            # last crash
kubectl logs -l app=myapp --max-log-requests=10

# ════ EXEC / DEBUG ════════════════════════════════════════════════
kubectl exec -it <pod> -- /bin/bash
kubectl port-forward svc/<svc> 8080:80
kubectl run tmp --image=curlimages/curl -it --rm -- sh

# ════ ROLLOUTS ════════════════════════════════════════════════════
kubectl rollout status deploy/<name>
kubectl rollout history deploy/<name>
kubectl rollout undo deploy/<name>
kubectl rollout restart deploy/<name>    # restart without spec change

# ════ SCALE ══════════════════════════════════════════════════════
kubectl scale deploy/<name> --replicas=5
kubectl autoscale deploy/<name> --min=3 --max=20 --cpu-percent=70

# ════ RESOURCES ══════════════════════════════════════════════════
kubectl top pods -n production
kubectl top nodes

# ════ CONTEXT / NAMESPACE ════════════════════════════════════════
kubectl config get-contexts
kubectl config use-context <ctx>
kubectl config set-context --current --namespace=production`,
          notes: [
            "Add 'alias k=kubectl' to .zshrc — saves enormous time",
            "kubectl completion zsh >> ~/.zshrc — enables tab completion",
            "k9s (brew install k9s) provides an interactive terminal UI for everything above",
          ]
        },
      ]
    },

  ]; // end m.codeExamples
})();
