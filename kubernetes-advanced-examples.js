// Patches the Kubernetes Advanced module (m5) with code examples.
// Loaded after curriculum.js and kubernetes-advanced-lessons.js.
(function patchKubernetesAdvancedExamples() {
  const m = CURRICULUM.phases[1].modules[1]; // phase-2 (index 1), second module (m5)

  m.codeExamples = [

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "networking",
      icon: "🌐",
      title: "Networking",
      items: [
        {
          title: "Headless Service for StatefulSet",
          lang: "yaml",
          filename: "headless-service.yaml",
          desc: "A headless Service (clusterIP: None) gives each StatefulSet Pod a stable DNS name like pod-0.svc-name.ns.svc.cluster.local.",
          code: `apiVersion: v1
kind: Service
metadata:
  name: postgres-headless
  namespace: production
spec:
  clusterIP: None          # headless — DNS returns Pod IPs directly
  selector:
    app: postgres
  ports:
    - name: postgres
      port: 5432
      targetPort: 5432`,
          notes: [
            "Required by StatefulSets — set serviceName: postgres-headless in the StatefulSet spec",
            "DNS: postgres-0.postgres-headless.production.svc.cluster.local",
            "Unlike ClusterIP services, DNS returns actual Pod IPs — clients connect directly",
          ]
        },
        {
          title: "Service Types Comparison",
          lang: "yaml",
          filename: "service-types.yaml",
          desc: "The four Service types and when to use each one.",
          code: `# ClusterIP (default): internal only
apiVersion: v1
kind: Service
metadata:
  name: api-internal
spec:
  type: ClusterIP
  selector:
    app: api
  ports:
    - port: 80
      targetPort: 8000
---
# NodePort: external via <nodeIP>:30080 — dev/testing only
apiVersion: v1
kind: Service
metadata:
  name: api-nodeport
spec:
  type: NodePort
  selector:
    app: api
  ports:
    - port: 80
      targetPort: 8000
      nodePort: 30080    # range: 30000–32767
---
# LoadBalancer: cloud LB — use for TCP/UDP services
apiVersion: v1
kind: Service
metadata:
  name: api-lb
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: nlb   # AWS NLB
spec:
  type: LoadBalancer
  selector:
    app: api
  ports:
    - port: 443
      targetPort: 8000`,
          notes: [
            "ClusterIP for internal microservice communication (most common)",
            "LoadBalancer provisions a real cloud LB — costs money per service, use Ingress instead for HTTP",
            "NodePort is rarely used in production — no real load balancing, exposes all nodes",
          ]
        },
        {
          title: "Debugging Network Connectivity",
          lang: "bash",
          filename: "network-debug.sh",
          desc: "Practical commands to debug Pod-to-Pod and Pod-to-Service networking issues.",
          code: `# Run a one-off debug pod with network tools
kubectl run netdebug --image=nicolaka/netshoot --rm -it -- bash

# Inside the debug pod:
# DNS resolution
nslookup api-service.production.svc.cluster.local
dig api-service.production.svc.cluster.local

# TCP connectivity test
nc -zv api-service 80
curl -v http://api-service/health

# Port scan
nmap -p 80,443,5432 api-service

# Trace route
traceroute api-service

# From outside the pod — check endpoints
kubectl get endpoints api-service -n production

# Describe a service (shows selector and endpoint details)
kubectl describe service api-service -n production`,
          notes: [
            "nicolaka/netshoot is a powerful network debug image with curl, nmap, dig, tcpdump, etc.",
            "Empty Endpoints means the selector doesn't match any Pod labels — verify with kubectl get pods --show-labels",
            "If DNS fails, check CoreDNS: kubectl get pods -n kube-system -l k8s-app=kube-dns",
          ]
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "ingress",
      icon: "🚪",
      title: "Ingress & TLS",
      items: [
        {
          title: "NGINX Ingress with Path Routing",
          lang: "yaml",
          filename: "path-ingress.yaml",
          desc: "Route traffic to different services based on URL path — one load balancer, many services.",
          code: `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ingress
  namespace: production
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /$2
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "60"
spec:
  ingressClassName: nginx
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /api(/|$)(.*)
            pathType: Prefix
            backend:
              service:
                name: api-service
                port:
                  number: 80
          - path: /auth(/|$)(.*)
            pathType: Prefix
            backend:
              service:
                name: auth-service
                port:
                  number: 80
          - path: /
            pathType: Prefix
            backend:
              service:
                name: frontend-service
                port:
                  number: 80`,
          notes: [
            "rewrite-target removes the path prefix before forwarding to the backend service",
            "The capture group ($2) in the path regex maps to /$2 in the rewrite target",
            "Order matters: more specific paths first, catch-all / last",
          ]
        },
        {
          title: "TLS Ingress with cert-manager",
          lang: "yaml",
          filename: "tls-ingress.yaml",
          desc: "Automatic TLS certificate provisioning and renewal via cert-manager + Let's Encrypt.",
          code: `# Step 1: ClusterIssuer (one-time setup)
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: ops@example.com
    privateKeySecretRef:
      name: letsencrypt-prod-key
    solvers:
      - http01:
          ingress:
            ingressClassName: nginx
---
# Step 2: Ingress with TLS annotation
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-tls-ingress
  namespace: production
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - api.example.com
      secretName: api-example-com-tls   # cert stored here
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: api-service
                port:
                  number: 80`,
          notes: [
            "cert-manager watches for this annotation and automatically provisions the cert",
            "Certs are stored as Kubernetes Secrets and auto-renewed before expiry",
            "For staging/testing, use letsencrypt-staging issuer to avoid rate limits",
          ]
        },
        {
          title: "Rate Limiting & CORS Annotations",
          lang: "yaml",
          filename: "ingress-annotations.yaml",
          desc: "Common NGINX Ingress annotations for rate limiting, CORS, and timeouts.",
          code: `metadata:
  annotations:
    # Rate limiting
    nginx.ingress.kubernetes.io/limit-connections: "20"
    nginx.ingress.kubernetes.io/limit-rps: "10"           # requests per second
    nginx.ingress.kubernetes.io/limit-rpm: "300"          # requests per minute
    nginx.ingress.kubernetes.io/limit-burst-multiplier: "5"

    # CORS
    nginx.ingress.kubernetes.io/enable-cors: "true"
    nginx.ingress.kubernetes.io/cors-allow-origin: "https://app.example.com"
    nginx.ingress.kubernetes.io/cors-allow-methods: "GET, POST, PUT, DELETE, OPTIONS"
    nginx.ingress.kubernetes.io/cors-allow-headers: "Authorization, Content-Type"

    # Timeouts
    nginx.ingress.kubernetes.io/proxy-connect-timeout: "10"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "60"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "60"

    # Request size
    nginx.ingress.kubernetes.io/proxy-body-size: "50m"

    # Custom headers
    nginx.ingress.kubernetes.io/configuration-snippet: |
      add_header X-Frame-Options "DENY";
      add_header X-Content-Type-Options "nosniff";`,
          notes: [
            "Rate limiting is per-IP by default; use nginx.ingress.kubernetes.io/limit-whitelist to exclude IPs",
            "CORS annotations save you from implementing CORS in every microservice",
            "configuration-snippet lets you inject raw NGINX config for advanced use cases",
          ]
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "network-policies",
      icon: "🔒",
      title: "Network Policies",
      items: [
        {
          title: "Default Deny All + DNS Allowance",
          lang: "yaml",
          filename: "default-deny.yaml",
          desc: "Zero-trust baseline: deny all ingress and egress, then explicitly allow what's needed. Always include DNS egress.",
          code: `# 1. Default deny all traffic in namespace
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: production
spec:
  podSelector: {}    # all pods
  policyTypes:
    - Ingress
    - Egress
---
# 2. Allow DNS (required for any name resolution)
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns-egress
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Egress
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
      ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53`,
          notes: [
            "Apply default-deny-all FIRST before adding allow rules — or you'll briefly have an open namespace",
            "DNS egress is the most commonly forgotten rule — causes cryptic name resolution failures",
            "Verify your CNI supports NetworkPolicy (Calico, Cilium, WeaveNet — NOT Flannel alone)",
          ]
        },
        {
          title: "Three-Tier App Network Policies",
          lang: "yaml",
          filename: "three-tier-netpol.yaml",
          desc: "Frontend → API → Database traffic rules for a standard three-tier application.",
          code: `# Allow ingress controller → frontend pods
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-ingress-to-frontend
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: frontend
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: ingress-nginx
---
# Allow frontend → API
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend-to-api
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: api
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: frontend
      ports:
        - protocol: TCP
          port: 8000
---
# Allow API → PostgreSQL
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-api-to-postgres
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: postgres
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: api
      ports:
        - protocol: TCP
          port: 5432`,
          notes: [
            "Policies stack — all matching policies' ingress rules are OR'd together",
            "Both podSelector and namespaceSelector can be combined: AND within a single rule item, OR across items",
            "Test with: kubectl exec <pod> -- nc -zv <target-service> <port>",
          ]
        },
        {
          title: "Cross-Namespace Traffic",
          lang: "yaml",
          filename: "cross-namespace-netpol.yaml",
          desc: "Allow traffic from a specific service in another namespace — e.g., Prometheus scraping metrics.",
          code: `# Allow Prometheus (in monitoring ns) to scrape all pods' metrics ports
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-prometheus-scrape
  namespace: production
spec:
  podSelector: {}    # all pods in production
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: monitoring
          podSelector:
            matchLabels:
              app.kubernetes.io/name: prometheus
      ports:
        - protocol: TCP
          port: 9090
        - protocol: TCP
          port: 8080
        - protocol: TCP
          port: 8000`,
          notes: [
            "When namespaceSelector AND podSelector appear in the same 'from' item, both must match (AND logic)",
            "When they appear in separate 'from' items, either can match (OR logic) — a common source of overly-permissive policies",
            "Label namespaces explicitly: kubectl label ns monitoring kubernetes.io/metadata.name=monitoring",
          ]
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "statefulsets",
      icon: "🗄️",
      title: "StatefulSets",
      items: [
        {
          title: "PostgreSQL StatefulSet",
          lang: "yaml",
          filename: "postgres-statefulset.yaml",
          desc: "Production-ready PostgreSQL StatefulSet with per-pod PVCs, secrets, and resource limits.",
          code: `apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: production
spec:
  serviceName: postgres-headless
  replicas: 1        # start with 1; add replicas with a replication solution
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      securityContext:
        runAsUser: 999
        fsGroup: 999
      containers:
        - name: postgres
          image: postgres:16-alpine
          ports:
            - containerPort: 5432
          env:
            - name: POSTGRES_DB
              value: appdb
            - name: POSTGRES_USER
              valueFrom:
                secretKeyRef:
                  name: postgres-secret
                  key: username
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgres-secret
                  key: password
            - name: PGDATA
              value: /var/lib/postgresql/data/pgdata
          volumeMounts:
            - name: postgres-data
              mountPath: /var/lib/postgresql/data
          readinessProbe:
            exec:
              command: ["pg_isready", "-U", "appuser", "-d", "appdb"]
            initialDelaySeconds: 5
            periodSeconds: 10
          livenessProbe:
            exec:
              command: ["pg_isready", "-U", "appuser"]
            initialDelaySeconds: 30
            periodSeconds: 30
          resources:
            requests:
              cpu: "250m"
              memory: "512Mi"
            limits:
              cpu: "2"
              memory: "2Gi"
  volumeClaimTemplates:
    - metadata:
        name: postgres-data
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: premium-rwo   # GKE: premium SSD
        resources:
          requests:
            storage: 20Gi`,
          notes: [
            "volumeClaimTemplates creates postgres-data-postgres-0, postgres-data-postgres-1, etc.",
            "PVCs persist after StatefulSet deletion — delete them manually to reclaim storage",
            "For multi-replica PostgreSQL, use an operator (CloudNativePG, Zalando postgres-operator) instead of managing replication manually",
          ]
        },
        {
          title: "StatefulSet Operations",
          lang: "bash",
          filename: "statefulset-ops.sh",
          desc: "Essential kubectl commands for managing and debugging StatefulSets.",
          code: `# Deploy StatefulSet
kubectl apply -f postgres-statefulset.yaml
kubectl apply -f postgres-headless-svc.yaml

# Watch pods come up sequentially
kubectl get pods -l app=postgres -w

# List per-pod PVCs
kubectl get pvc -l app=postgres

# Connect to a specific pod by ordinal
kubectl exec -it postgres-0 -n production -- psql -U appuser -d appdb

# Check StatefulSet status
kubectl rollout status statefulset/postgres -n production

# Rolling update (updates pods one by one, in reverse order)
kubectl set image statefulset/postgres postgres=postgres:16.1-alpine -n production

# Scale (scale-down terminates in reverse order: N-1, N-2, ...)
kubectl scale statefulset postgres --replicas=3

# Force delete a stuck pod (it will reschedule with same name)
kubectl delete pod postgres-1 --grace-period=0 --force`,
          notes: [
            "StatefulSet pods scale up 0→1→2 and scale down 2→1→0 sequentially by default",
            "Force-deleting a pod is safe for StatefulSets — it respawns with the same name and PVC",
            "Never manually delete PVCs unless you intend to lose data",
          ]
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "rbac",
      icon: "🔑",
      title: "RBAC",
      items: [
        {
          title: "Minimal ServiceAccount with Role",
          lang: "yaml",
          filename: "sa-with-role.yaml",
          desc: "Create a ServiceAccount for a Pod that needs to read Pods and ConfigMaps in its namespace.",
          code: `# ServiceAccount
apiVersion: v1
kind: ServiceAccount
metadata:
  name: app-reader
  namespace: production
automountServiceAccountToken: false   # opt-in, not opt-out
---
# Role: namespace-scoped permissions
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: pod-configmap-reader
  namespace: production
rules:
  - apiGroups: [""]
    resources: ["pods", "configmaps"]
    verbs: ["get", "list", "watch"]
---
# RoleBinding: grant role to SA
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: app-reader-binding
  namespace: production
subjects:
  - kind: ServiceAccount
    name: app-reader
    namespace: production
roleRef:
  kind: Role
  name: pod-configmap-reader
  apiGroup: rbac.authorization.k8s.io`,
          notes: [
            "Set automountServiceAccountToken: false on the SA and opt-in per-Pod for tighter security",
            "Use namespace-scoped Role (not ClusterRole) when access is limited to one namespace",
            "Test with: kubectl auth can-i list pods --as system:serviceaccount:production:app-reader",
          ]
        },
        {
          title: "CI/CD Deployer Role",
          lang: "yaml",
          filename: "cicd-deployer-role.yaml",
          desc: "A minimal RBAC setup for a CI/CD pipeline that needs to update Deployments and ConfigMaps.",
          code: `apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: deployer
  namespace: production
rules:
  # Read/update Deployments (for rolling updates)
  - apiGroups: ["apps"]
    resources: ["deployments", "replicasets"]
    verbs: ["get", "list", "update", "patch"]
  # Manage ConfigMaps and Secrets (for config updates)
  - apiGroups: [""]
    resources: ["configmaps", "secrets"]
    verbs: ["get", "list", "create", "update", "patch"]
  # Read Pod status (to wait for rollout)
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["get", "list", "watch"]
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: cicd-deployer
  namespace: production
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: cicd-deployer-binding
  namespace: production
subjects:
  - kind: ServiceAccount
    name: cicd-deployer
    namespace: production
roleRef:
  kind: Role
  name: deployer
  apiGroup: rbac.authorization.k8s.io`,
          notes: [
            "Never give CI/CD cluster-admin — scope to exactly the namespaces and verbs needed",
            "Get a kubeconfig for this SA: kubectl create token cicd-deployer --duration=8h",
            "On cloud K8s (EKS/GKE), use IRSA/Workload Identity instead of long-lived tokens",
          ]
        },
        {
          title: "RBAC Debugging Commands",
          lang: "bash",
          filename: "rbac-debug.sh",
          desc: "Commands to audit and test RBAC permissions.",
          code: `# Check if current user can do something
kubectl auth can-i create deployments -n production
kubectl auth can-i delete pods -n production --all-namespaces

# Check if a ServiceAccount can do something
kubectl auth can-i list pods \
  --as system:serviceaccount:production:cicd-deployer \
  -n production

# List ALL permissions for a ServiceAccount
kubectl auth can-i --list \
  --as system:serviceaccount:production:cicd-deployer \
  -n production

# Who can create pods in production?
kubectl get rolebindings,clusterrolebindings -A \
  -o json | jq '.items[] | select(.roleRef.name=="admin")'

# List all RoleBindings in a namespace
kubectl get rolebindings -n production -o wide

# Describe a specific binding
kubectl describe rolebinding cicd-deployer-binding -n production`,
          notes: [
            "auth can-i is your primary debugging tool — use it after any RBAC change",
            "--list flag shows all allowed actions for a given subject",
            "Use kubectl-who-can plugin (kubectl plugin) for 'who can do X' queries across the whole cluster",
          ]
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "multi-tenancy",
      icon: "🏢",
      title: "Multi-Tenancy",
      items: [
        {
          title: "ResourceQuota for Team Namespace",
          lang: "yaml",
          filename: "team-resourcequota.yaml",
          desc: "Enforce hard resource limits per namespace to prevent one team from consuming all cluster resources.",
          code: `apiVersion: v1
kind: ResourceQuota
metadata:
  name: team-backend-quota
  namespace: team-backend
spec:
  hard:
    # Compute
    requests.cpu: "10"
    requests.memory: 20Gi
    limits.cpu: "20"
    limits.memory: 40Gi
    # Objects
    pods: "50"
    services: "10"
    persistentvolumeclaims: "10"
    configmaps: "30"
    secrets: "30"
    # Storage
    requests.storage: 100Gi`,
          notes: [
            "Once a ResourceQuota exists, ALL pods must specify resource requests/limits — use LimitRange to set defaults",
            "Check quota usage: kubectl describe resourcequota team-backend-quota -n team-backend",
            "Separate quotas for requests vs limits: requests are scheduling guarantees, limits are hard caps",
          ]
        },
        {
          title: "LimitRange with Defaults",
          lang: "yaml",
          filename: "team-limitrange.yaml",
          desc: "Automatically inject resource requests/limits and enforce per-container min/max bounds.",
          code: `apiVersion: v1
kind: LimitRange
metadata:
  name: team-backend-limits
  namespace: team-backend
spec:
  limits:
    - type: Container
      defaultRequest:         # injected if request not set
        cpu: "100m"
        memory: "128Mi"
      default:                # injected if limit not set
        cpu: "500m"
        memory: "512Mi"
      max:                    # hard per-container cap
        cpu: "4"
        memory: "8Gi"
      min:                    # minimum allowed
        cpu: "50m"
        memory: "64Mi"
    - type: PersistentVolumeClaim
      max:
        storage: 20Gi
      min:
        storage: 1Gi`,
          notes: [
            "LimitRange and ResourceQuota work together: LimitRange injects defaults so ResourceQuota enforcement doesn't fail",
            "Apply LimitRange before ResourceQuota to avoid a window where pod creation fails",
            "Container-level limits are separate from Pod-level — Pod limit = sum of container limits",
          ]
        },
        {
          title: "Namespace Setup Script",
          lang: "bash",
          filename: "setup-team-namespace.sh",
          desc: "Complete namespace provisioning for a new team: quota, limits, network policy, RBAC.",
          code: `#!/usr/bin/env bash
set -euo pipefail

TEAM="\${1:?Usage: setup-team-namespace.sh <team-name>}"
NS="team-\${TEAM}"

echo "Creating namespace: \${NS}"

# Create namespace with labels
kubectl create namespace "\${NS}"
kubectl label namespace "\${NS}" \
  team="\${TEAM}" \
  environment=production \
  pod-security.kubernetes.io/enforce=baseline \
  pod-security.kubernetes.io/warn=restricted

# Apply resource controls
kubectl apply -f "quotas/\${TEAM}-quota.yaml" -n "\${NS}"
kubectl apply -f "limitranges/\${TEAM}-limits.yaml" -n "\${NS}"

# Apply default-deny network policy
kubectl apply -f network-policies/default-deny.yaml -n "\${NS}"
kubectl apply -f network-policies/allow-dns.yaml -n "\${NS}"
kubectl apply -f network-policies/allow-prometheus.yaml -n "\${NS}"

# Create CI/CD service account
kubectl create serviceaccount "\${TEAM}-deployer" -n "\${NS}"
kubectl create rolebinding "\${TEAM}-deployer-binding" \
  --clusterrole=edit \
  --serviceaccount="\${NS}:\${TEAM}-deployer" \
  -n "\${NS}"

echo "Done. Namespace \${NS} is ready."
kubectl get resourcequota,limitrange,networkpolicy,serviceaccount -n "\${NS}"`,
          notes: [
            "Automate namespace provisioning — manual steps lead to inconsistency between team namespaces",
            "Use GitOps (Argo CD, Flux) to manage namespace configs declaratively in a 'tenants' repo",
            "Consider Capsule or HNC (Hierarchical Namespace Controller) for enterprise multi-tenancy patterns",
          ]
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "service-mesh",
      icon: "🕸️",
      title: "Service Mesh",
      items: [
        {
          title: "Istio mTLS Policy",
          lang: "yaml",
          filename: "istio-mtls.yaml",
          desc: "Enforce mutual TLS for all services in a namespace — automatic encryption with no code changes.",
          code: `# Enforce strict mTLS: reject non-mTLS connections
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default-mtls
  namespace: production
spec:
  mtls:
    mode: STRICT
---
# AuthorizationPolicy: only allow API to call the payments service
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: payments-authz
  namespace: production
spec:
  selector:
    matchLabels:
      app: payments-service
  rules:
    - from:
        - source:
            principals:
              - "cluster.local/ns/production/sa/api-service-account"
    - to:
        - operation:
            methods: ["GET", "POST"]
            paths: ["/payments/*"]`,
          notes: [
            "PeerAuthentication + AuthorizationPolicy = zero-trust service-to-service security",
            "Principals are based on ServiceAccount identity (SPIFFE format)",
            "Start with PERMISSIVE mode to migrate existing traffic to mTLS before enforcing STRICT",
          ]
        },
        {
          title: "Traffic Splitting for Canary Deploy",
          lang: "yaml",
          filename: "canary-traffic.yaml",
          desc: "Route 10% of production traffic to a new version while keeping 90% on stable.",
          code: `# DestinationRule: define v1 and v2 subsets
apiVersion: networking.istio.io/v1alpha3
kind: DestinationRule
metadata:
  name: api-versions
  namespace: production
spec:
  host: api-service
  subsets:
    - name: v1
      labels:
        version: "v1"
    - name: v2
      labels:
        version: "v2"
---
# VirtualService: 90/10 traffic split
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: api-canary
  namespace: production
spec:
  hosts:
    - api-service
  http:
    # Internal testers get 100% v2 via header
    - match:
        - headers:
            x-canary-user:
              exact: "true"
      route:
        - destination:
            host: api-service
            subset: v2
    # All others: 90% v1, 10% v2
    - route:
        - destination:
            host: api-service
            subset: v1
          weight: 90
        - destination:
            host: api-service
            subset: v2
          weight: 10`,
          notes: [
            "Requires two Deployments: one with label version=v1, one with version=v2",
            "Monitor error rates in Grafana/Kiali before increasing v2 weight",
            "To promote v2: change weights to 0/100, then delete the VirtualService and DestinationRule",
          ]
        },
        {
          title: "Circuit Breaker & Retries",
          lang: "yaml",
          filename: "circuit-breaker.yaml",
          desc: "Prevent cascading failures with circuit breaking and configure intelligent retries.",
          code: `apiVersion: networking.istio.io/v1alpha3
kind: DestinationRule
metadata:
  name: api-circuit-breaker
  namespace: production
spec:
  host: api-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 50
        http2MaxRequests: 100
        maxRequestsPerConnection: 10
    outlierDetection:
      consecutive5xxErrors: 5     # eject after 5 errors
      interval: 10s               # check every 10s
      baseEjectionTime: 30s       # eject for minimum 30s
      maxEjectionPercent: 50      # eject at most 50% of hosts
---
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: api-retries
  namespace: production
spec:
  hosts:
    - api-service
  http:
    - timeout: 10s
      retries:
        attempts: 3
        perTryTimeout: 3s
        retryOn: "5xx,reset,connect-failure,retriable-4xx"
      route:
        - destination:
            host: api-service`,
          notes: [
            "outlierDetection implements the circuit breaker: temporarily removes failing endpoints from the load balancer",
            "connectionPool limits prevent one slow service from queuing up unlimited requests",
            "retryOn: retriable-4xx only retries 409 Conflict by default — configure per your API semantics",
          ]
        },
      ]
    },

  ]; // end m.codeExamples
})();
