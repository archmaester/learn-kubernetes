// Patches the Kubernetes Advanced module (m5) with full tutorial lesson content.
// Loaded after curriculum.js. m5 = CURRICULUM.phases[1].modules[1]
(function patchKubernetesAdvancedLessons() {
  const m = CURRICULUM.phases[1].modules[1]; // phase-2 (index 1), second module

  m.lessons = [

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "k8s-networking-deep-dive",
      title: "Kubernetes Networking: Pods, Services & CNI",
      readTime: "14 min",
      content: [
        {
          type: "text",
          text: "You know how to deploy Pods. But how do two Pods actually talk to each other? How does traffic from the internet reach your service? Kubernetes networking is where most engineers hit a wall — and where understanding the fundamentals pays off enormously in debugging production issues."
        },
        {
          type: "callout",
          variant: "info",
          title: "The Four Networking Problems Kubernetes Solves",
          text: "<strong>1. Container-to-container</strong> within a Pod (localhost).<br><strong>2. Pod-to-Pod</strong> across nodes.<br><strong>3. Pod-to-Service</strong> (stable virtual IP).<br><strong>4. External-to-Service</strong> (ingress, LoadBalancer, NodePort)."
        },
        {
          type: "heading",
          text: "Rule #1: Every Pod Gets a Unique IP",
          level: 2
        },
        {
          type: "text",
          text: "Kubernetes mandates a flat network model: <strong>every Pod gets its own IP address</strong>, and any Pod can reach any other Pod's IP directly — without NAT, regardless of which node they're on. This is unlike Docker, where you need port mapping to reach containers. The implication: you treat Pods like real machines on a LAN."
        },
        {
          type: "diagram",
          code: `Node A                          Node B
┌─────────────────────┐        ┌─────────────────────┐
│  Pod: 10.244.0.5    │        │  Pod: 10.244.1.3    │
│  Pod: 10.244.0.6    │──────▶ │  Pod: 10.244.1.4    │
└─────────────────────┘        └─────────────────────┘
       Direct IP routing (no NAT) — enforced by CNI plugin`
        },
        {
          type: "heading",
          text: "CNI: Container Network Interface",
          level: 2
        },
        {
          type: "text",
          text: "Kubernetes doesn't implement networking itself — it delegates to a <strong>CNI plugin</strong> (Container Network Interface). The CNI plugin is responsible for: assigning Pod IPs, setting up routing between nodes, and enforcing Network Policies. Different CNI plugins have different trade-offs:"
        },
        {
          type: "comparison",
          headers: ["CNI Plugin", "Approach", "Network Policy", "Best For"],
          rows: [
            ["Calico", "BGP routing or overlay", "✅ Full support", "Production clusters, policy enforcement"],
            ["Flannel", "VXLAN overlay", "❌ None (use with Canal)", "Simple setups, learning"],
            ["Cilium", "eBPF-based", "✅ Advanced (L7 aware)", "High-performance, observability"],
            ["Weave Net", "Mesh overlay", "✅ Basic", "Multi-cloud, ease of setup"],
            ["AWS VPC CNI", "Native VPC IPs", "✅ Via security groups", "EKS on AWS"],
          ]
        },
        {
          type: "callout",
          variant: "tip",
          title: "On Managed Kubernetes (GKE, EKS, AKS)",
          text: "The cloud provider installs and manages the CNI for you. GKE uses its own VPC-native networking; EKS uses the AWS VPC CNI. You rarely install CNI manually unless you're building clusters from scratch with kubeadm."
        },
        {
          type: "heading",
          text: "Services: Stable Endpoints for Unstable Pods",
          level: 2
        },
        {
          type: "text",
          text: "Pod IPs are ephemeral — a Pod restart gives it a new IP. Services provide a <strong>stable virtual IP (ClusterIP)</strong> that load-balances to matching Pods. The Service uses a <strong>label selector</strong> to find its Pods:"
        },
        {
          type: "code",
          lang: "yaml",
          filename: "api-service.yaml",
          code: `apiVersion: v1
kind: Service
metadata:
  name: api-service
spec:
  selector:
    app: api          # targets all Pods with label app=api
  ports:
    - port: 80        # Service port (what callers use)
      targetPort: 8000  # Pod port (where your app listens)
  type: ClusterIP     # only reachable within the cluster`
        },
        {
          type: "text",
          text: "When you create this Service, Kubernetes assigns it a stable ClusterIP (say <code>10.96.0.10</code>) and creates <strong>Endpoints</strong> — a dynamic list of Pod IPs matching the selector. kube-proxy on each node programs iptables rules to DNAT traffic to the ClusterIP into actual Pod IPs."
        },
        {
          type: "heading",
          text: "DNS: How Pods Find Each Other",
          level: 2
        },
        {
          type: "text",
          text: "Kubernetes runs <strong>CoreDNS</strong> as a cluster-internal DNS server. Every Service gets a DNS name automatically: <code>service-name.namespace.svc.cluster.local</code>. From any Pod, you can curl another service by name:"
        },
        {
          type: "code",
          lang: "bash",
          filename: "dns-resolution.sh",
          code: `# From inside a Pod, these all resolve to the same ClusterIP:
curl http://api-service                         # same namespace
curl http://api-service.default                 # explicit namespace
curl http://api-service.default.svc.cluster.local  # FQDN

# Inspect DNS from a debug pod:
kubectl run dns-test --image=busybox --rm -it -- nslookup api-service`
        },
        {
          type: "heading",
          text: "Service Types: ClusterIP, NodePort, LoadBalancer",
          level: 2
        },
        {
          type: "comparison",
          headers: ["Type", "Reachable From", "Use Case", "How It Works"],
          rows: [
            ["ClusterIP", "Inside cluster only", "Microservice-to-microservice", "Virtual IP, iptables DNAT"],
            ["NodePort", "External via node IP + port", "Dev/testing, legacy", "Opens port 30000–32767 on every node"],
            ["LoadBalancer", "External via cloud LB", "Exposing production services", "Provisions cloud load balancer (ELB, GLB)"],
            ["ExternalName", "Inside cluster → external DNS", "Routing to external services", "CNAME DNS record, no proxying"],
          ]
        },
        {
          type: "callout",
          variant: "warning",
          title: "Don't Use NodePort in Production",
          text: "NodePort exposes your service on a raw port on every node's IP. It's not load-balanced intelligently, has a limited port range (30000–32767), and exposes all nodes. Use <strong>Ingress</strong> (covered next lesson) for HTTP traffic and <strong>LoadBalancer</strong> only when you need TCP/UDP load balancing at the cloud level."
        },
        {
          type: "heading",
          text: "kube-proxy: The Traffic Routing Engine",
          level: 2
        },
        {
          type: "text",
          text: "kube-proxy runs on every node and watches the Kubernetes API for Service/Endpoint changes. It programs the node's <strong>iptables</strong> (or IPVS) rules to implement the Service ClusterIP virtual IP. When a Pod sends traffic to a ClusterIP, the kernel intercepts it and redirects it to a real Pod IP — all in kernel space, with no userspace proxy hop."
        },
        {
          type: "code",
          lang: "bash",
          filename: "debug-networking.sh",
          code: `# See all services and their cluster IPs
kubectl get svc -A

# See the actual Pod IPs backing a service (Endpoints)
kubectl get endpoints api-service

# Describe endpoint details
kubectl describe endpoints api-service

# Check iptables rules for a service (on a node)
sudo iptables -t nat -L KUBE-SERVICES -n | grep api-service`
        },
        {
          type: "callout",
          variant: "info",
          title: "Headless Services for StatefulSets",
          text: "Set <code>clusterIP: None</code> to create a <strong>headless service</strong>. No virtual IP is assigned; DNS returns the individual Pod IPs directly. This is how StatefulSets give each Pod a stable DNS name like <code>postgres-0.postgres-headless.default.svc.cluster.local</code>. Essential for databases and message queues."
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "ingress-controllers",
      title: "Ingress Controllers: NGINX, TLS & Path Routing",
      readTime: "13 min",
      content: [
        {
          type: "text",
          text: "Your FastAPI service runs in the cluster. The internet needs to reach it. You could use a LoadBalancer Service — but that provisions a separate cloud load balancer (and costs money) <em>for every single service</em>. With 20 microservices, that's 20 load balancers. <strong>Ingress</strong> solves this: one load balancer, smart routing to many services."
        },
        {
          type: "heading",
          text: "What Is an Ingress?",
          level: 2
        },
        {
          type: "text",
          text: "Kubernetes has two objects that work together:"
        },
        {
          type: "list",
          items: [
            "<strong>Ingress resource</strong> — a Kubernetes object that <em>declares</em> routing rules (host-based, path-based)",
            "<strong>Ingress Controller</strong> — a running Pod that <em>implements</em> those rules (NGINX, Traefik, Kong, etc.)",
          ]
        },
        {
          type: "text",
          text: "Kubernetes ships with the Ingress API but <em>no built-in controller</em>. You install the controller separately. The most common is the <strong>NGINX Ingress Controller</strong>."
        },
        {
          type: "diagram",
          code: `Internet
    │
    ▼
LoadBalancer (1 cloud LB)
    │
    ▼
NGINX Ingress Controller Pod
    │
    ├── /api/*       ──▶ api-service:80
    ├── /auth/*      ──▶ auth-service:80
    └── /static/*    ──▶ frontend-service:80`
        },
        {
          type: "heading",
          text: "Installing NGINX Ingress Controller",
          level: 2
        },
        {
          type: "code",
          lang: "bash",
          filename: "install-ingress.sh",
          code: `# Install via Helm (recommended)
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace

# Verify the controller pod is running
kubectl get pods -n ingress-nginx

# Get the external IP of the LoadBalancer service
kubectl get svc -n ingress-nginx ingress-nginx-controller
# NAME                      TYPE           CLUSTER-IP    EXTERNAL-IP
# ingress-nginx-controller  LoadBalancer   10.96.0.100   34.120.0.55`
        },
        {
          type: "heading",
          text: "Writing Ingress Rules",
          level: 2
        },
        {
          type: "code",
          lang: "yaml",
          filename: "app-ingress.yaml",
          code: `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /    # strip prefix before forwarding
spec:
  ingressClassName: nginx                            # which controller handles this
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
                  number: 80
    - host: auth.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: auth-service
                port:
                  number: 80`
        },
        {
          type: "heading",
          text: "TLS with cert-manager",
          level: 2
        },
        {
          type: "text",
          text: "Manually managing TLS certificates is painful. <strong>cert-manager</strong> is a Kubernetes add-on that automatically provisions and renews TLS certificates from Let's Encrypt (free) or any ACME-compatible CA. Once installed, you just annotate your Ingress:"
        },
        {
          type: "code",
          lang: "bash",
          filename: "install-cert-manager.sh",
          code: `# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/latest/download/cert-manager.yaml

# Wait for it to be ready
kubectl wait --for=condition=Available deployment --all -n cert-manager --timeout=60s`
        },
        {
          type: "code",
          lang: "yaml",
          filename: "cluster-issuer.yaml",
          code: `# ClusterIssuer: tells cert-manager how to get certificates
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: you@example.com
    privateKeySecretRef:
      name: letsencrypt-prod-key
    solvers:
      - http01:
          ingress:
            ingressClassName: nginx`
        },
        {
          type: "code",
          lang: "yaml",
          filename: "tls-ingress.yaml",
          code: `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ingress-tls
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"   # triggers auto-cert
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - api.example.com
      secretName: api-tls-secret    # cert-manager stores cert here
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
                  number: 80`
        },
        {
          type: "text",
          text: "cert-manager detects the annotation, contacts Let's Encrypt using the HTTP-01 challenge (it temporarily serves a challenge file via the Ingress), gets the certificate, stores it in the Secret, and the Ingress controller picks it up. <strong>Zero manual certificate management.</strong> Certificates auto-renew before expiry."
        },
        {
          type: "heading",
          text: "Useful Ingress Annotations",
          level: 2
        },
        {
          type: "code",
          lang: "yaml",
          filename: "ingress-annotations.yaml",
          code: `metadata:
  annotations:
    # Rate limiting
    nginx.ingress.kubernetes.io/limit-rps: "10"

    # Request size limit (default 1m)
    nginx.ingress.kubernetes.io/proxy-body-size: "50m"

    # Timeouts
    nginx.ingress.kubernetes.io/proxy-connect-timeout: "10"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "60"

    # CORS
    nginx.ingress.kubernetes.io/enable-cors: "true"
    nginx.ingress.kubernetes.io/cors-allow-origin: "https://app.example.com"

    # Force HTTPS redirect
    nginx.ingress.kubernetes.io/ssl-redirect: "true"

    # Rewrite: strip /api prefix before forwarding
    nginx.ingress.kubernetes.io/rewrite-target: /$1
  # path would be: /api/(.*)  with this rewrite`
        },
        {
          type: "callout",
          variant: "tip",
          title: "Ingress vs Gateway API",
          text: "Kubernetes is gradually replacing Ingress with the <strong>Gateway API</strong> (more expressive, supports TCP/UDP/gRPC, multi-team). In 2025, Ingress is still dominant but Gateway API is production-ready on GKE and Cilium. Worth knowing for interviews: 'I'm familiar with Ingress and aware that Gateway API is the successor.'"
        },
        {
          type: "heading",
          text: "Debugging Ingress",
          level: 2
        },
        {
          type: "code",
          lang: "bash",
          filename: "debug-ingress.sh",
          code: `# Check Ingress resource
kubectl describe ingress app-ingress

# Check Ingress controller logs
kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx --tail=50

# Check cert-manager issued the certificate
kubectl get certificate
kubectl describe certificate api-tls-secret

# Check CertificateRequest status
kubectl get certificaterequest

# Test from inside the cluster
kubectl run curl-test --image=curlimages/curl --rm -it -- \
  curl -v http://api-service.default.svc.cluster.local/health`
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "network-policies",
      title: "Network Policies: Zero-Trust Kubernetes Networking",
      readTime: "12 min",
      content: [
        {
          type: "text",
          text: "By default, every Pod in a Kubernetes cluster can talk to every other Pod — no restrictions. If an attacker compromises one microservice, they can reach your database, your secret store, everything. <strong>Network Policies</strong> are Kubernetes firewall rules that let you implement zero-trust networking: explicitly whitelist what's allowed, deny everything else."
        },
        {
          type: "callout",
          variant: "warning",
          title: "Prerequisite: Your CNI Must Support Network Policies",
          text: "Flannel doesn't enforce NetworkPolicy. Calico, Cilium, and WeaveNet do. On managed Kubernetes (GKE, EKS, AKS), Network Policy support depends on the network plugin chosen at cluster creation. Always verify before writing policies."
        },
        {
          type: "heading",
          text: "How NetworkPolicy Works",
          level: 2
        },
        {
          type: "text",
          text: "A NetworkPolicy selects Pods via label selectors and specifies <strong>ingress</strong> (incoming) and/or <strong>egress</strong> (outgoing) rules. Critical rule: if <em>no</em> NetworkPolicy selects a Pod, all traffic is allowed. Once <em>any</em> NetworkPolicy selects a Pod, only explicitly allowed traffic passes."
        },
        {
          type: "heading",
          text: "Step 1: Default Deny All",
          level: 2
        },
        {
          type: "text",
          text: "Start with a catch-all deny policy in each namespace. This ensures nothing is allowed unless you explicitly permit it:"
        },
        {
          type: "code",
          lang: "yaml",
          filename: "default-deny.yaml",
          code: `# Apply to each namespace that needs zero-trust
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: production
spec:
  podSelector: {}      # selects ALL pods in the namespace
  policyTypes:
    - Ingress
    - Egress`
        },
        {
          type: "heading",
          text: "Step 2: Allow Specific Flows",
          level: 2
        },
        {
          type: "text",
          text: "Now add policies that explicitly allow required communication. A typical three-tier app (frontend → API → database):"
        },
        {
          type: "code",
          lang: "yaml",
          filename: "allow-api-to-db.yaml",
          code: `# Allow: API pods can reach PostgreSQL pods on port 5432
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-api-to-db
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: postgres          # this policy applies TO postgres pods
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: api       # only FROM api pods
      ports:
        - protocol: TCP
          port: 5432`
        },
        {
          type: "code",
          lang: "yaml",
          filename: "allow-frontend-to-api.yaml",
          code: `# Allow: frontend → API on port 8000
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
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: ingress-nginx  # allow ingress controller
      ports:
        - protocol: TCP
          port: 8000`
        },
        {
          type: "code",
          lang: "yaml",
          filename: "allow-dns-egress.yaml",
          code: `# Allow all pods to reach CoreDNS for name resolution
# Without this, DNS breaks under default-deny-egress
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns-egress
  namespace: production
spec:
  podSelector: {}        # all pods
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
          port: 53`
        },
        {
          type: "callout",
          variant: "warning",
          title: "Don't Forget DNS Egress",
          text: "The most common mistake when implementing default-deny-egress is forgetting to allow DNS on port 53 UDP/TCP. Without it, Pods can't resolve any DNS names — they'll fail with <code>dial tcp: lookup api-service: no such host</code>. Always add the DNS egress rule."
        },
        {
          type: "heading",
          text: "Allow Monitoring (Prometheus Scraping)",
          level: 2
        },
        {
          type: "code",
          lang: "yaml",
          filename: "allow-monitoring.yaml",
          code: `# Allow Prometheus (in monitoring namespace) to scrape any pod on /metrics
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-prometheus-scrape
  namespace: production
spec:
  podSelector: {}         # applies to all pods
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: monitoring
          podSelector:
            matchLabels:
              app: prometheus
      ports:
        - protocol: TCP
          port: 9090
        - protocol: TCP
          port: 8080   # common metrics port`
        },
        {
          type: "heading",
          text: "Verifying Policies",
          level: 2
        },
        {
          type: "code",
          lang: "bash",
          filename: "verify-netpol.sh",
          code: `# List all network policies in a namespace
kubectl get networkpolicy -n production

# Describe a specific policy
kubectl describe networkpolicy allow-api-to-db -n production

# Test connectivity from a pod (should FAIL with default-deny)
kubectl run test-pod --image=busybox --rm -it -n production -- \
  wget --timeout=3 http://postgres:5432

# Test from API pod (should SUCCEED after allow-api-to-db policy)
kubectl exec -n production deploy/api -- \
  nc -zv postgres 5432`
        },
        {
          type: "comparison",
          headers: ["Rule Type", "podSelector", "namespaceSelector", "ipBlock"],
          rows: [
            ["Selects", "Pods by labels within same namespace", "All pods in labeled namespaces", "CIDR ranges (external IPs)"],
            ["Use case", "Service-to-service within namespace", "Cross-namespace traffic", "External APIs, cloud services"],
            ["Example", "app: api", "kubernetes.io/metadata.name: ingress-nginx", "0.0.0.0/0 except 10.0.0.0/8"],
          ]
        },
        {
          type: "callout",
          variant: "tip",
          title: "Cilium for L7 Network Policies",
          text: "Standard NetworkPolicy works at L3/L4 (IPs and ports). <strong>Cilium</strong> extends this to L7: you can write policies like 'allow HTTP GET to /api/v1/health but block POST to /admin'. This is significantly more powerful for microservice security."
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "statefulsets",
      title: "StatefulSets: Running Databases in Kubernetes",
      readTime: "14 min",
      content: [
        {
          type: "text",
          text: "Deployments are great for stateless apps — any replica can die and be replaced by an identical one with a new IP. Databases are different: a PostgreSQL replica has a specific role (primary or replica), a stable identity, and persistent data that must not be lost. <strong>StatefulSets</strong> are Kubernetes's answer to stateful workloads."
        },
        {
          type: "heading",
          text: "Deployment vs StatefulSet",
          level: 2
        },
        {
          type: "comparison",
          headers: ["Feature", "Deployment", "StatefulSet"],
          rows: [
            ["Pod naming", "Random (pod-7d8f9c-xzb4q)", "Ordered (postgres-0, postgres-1, postgres-2)"],
            ["Pod IP", "Changes on restart", "Changes on restart (use DNS)"],
            ["DNS name", "None per-pod", "Stable: postgres-0.postgres-headless.ns.svc.cluster.local"],
            ["Scaling order", "Parallel (all at once)", "Sequential (0→1→2 up, 2→1→0 down)"],
            ["Storage", "Shared PVC or no PVC", "Separate PVC per Pod (VolumeClaimTemplate)"],
            ["Use case", "Stateless microservices", "Databases, Kafka, Zookeeper, Redis Cluster"],
          ]
        },
        {
          type: "heading",
          text: "StatefulSet Anatomy",
          level: 2
        },
        {
          type: "code",
          lang: "yaml",
          filename: "postgres-statefulset.yaml",
          code: `apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: production
spec:
  serviceName: postgres-headless    # REQUIRED: headless service name
  replicas: 3
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
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "1Gi"
              cpu: "1"
  volumeClaimTemplates:               # creates 1 PVC per Pod
    - metadata:
        name: postgres-data
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: fast-ssd    # choose based on your cloud provider
        resources:
          requests:
            storage: 10Gi`
        },
        {
          type: "heading",
          text: "The Headless Service (Required)",
          level: 2
        },
        {
          type: "text",
          text: "StatefulSets need a <strong>headless service</strong> (clusterIP: None) to provide stable DNS names. Without NAT or a virtual IP, DNS returns the individual Pod IPs directly. This is what gives each Pod its stable DNS identity:"
        },
        {
          type: "code",
          lang: "yaml",
          filename: "postgres-headless-svc.yaml",
          code: `apiVersion: v1
kind: Service
metadata:
  name: postgres-headless
  namespace: production
spec:
  clusterIP: None          # headless!
  selector:
    app: postgres
  ports:
    - port: 5432
      targetPort: 5432
---
# Also create a regular service for read traffic (optional)
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: production
spec:
  selector:
    app: postgres
  ports:
    - port: 5432
      targetPort: 5432`
        },
        {
          type: "text",
          text: "With this headless service, your pods are reachable at: <code>postgres-0.postgres-headless.production.svc.cluster.local</code>, <code>postgres-1.postgres-headless.production.svc.cluster.local</code>, etc. These names are stable across Pod restarts — essential for primary/replica configuration."
        },
        {
          type: "heading",
          text: "Lifecycle: Ordered, Graceful",
          level: 2
        },
        {
          type: "code",
          lang: "bash",
          filename: "statefulset-ops.sh",
          code: `# Scale up: pods created in order (0, 1, 2)
kubectl scale statefulset postgres --replicas=3

# Watch them come up sequentially
kubectl get pods -l app=postgres -w

# Scale down: pods terminated in reverse order (2, 1, 0)
kubectl scale statefulset postgres --replicas=1

# Delete a pod — it comes back with the SAME name and attaches to its PVC
kubectl delete pod postgres-1

# Inspect per-pod PVCs (each has its own)
kubectl get pvc -l app=postgres

# Update (rolling update, pod by pod)
kubectl set image statefulset/postgres postgres=postgres:16.1-alpine`
        },
        {
          type: "callout",
          variant: "info",
          title: "PVCs Outlive the StatefulSet",
          text: "When you delete a StatefulSet, the PersistentVolumeClaims are <strong>not deleted</strong> by default. This is intentional — your data is preserved. If you recreate the StatefulSet with the same name, it re-attaches to the existing PVCs. To fully clean up, delete PVCs manually: <code>kubectl delete pvc -l app=postgres</code>."
        },
        {
          type: "heading",
          text: "Storage Classes: Choosing the Right Disk",
          level: 2
        },
        {
          type: "comparison",
          headers: ["Cloud", "Fast SSD Class", "Standard Class", "Notes"],
          rows: [
            ["GKE", "premium-rwo", "standard-rwo", "premium = Persistent Disk SSD"],
            ["EKS", "gp3", "gp2", "gp3 is newer, better price/perf"],
            ["AKS", "managed-premium", "managed", "LRS vs ZRS for zone redundancy"],
            ["Local (minikube)", "standard", "standard", "HostPath provisioner"],
          ]
        },
        {
          type: "callout",
          variant: "tip",
          title: "For Production Databases: Use Managed Services",
          text: "Running databases on Kubernetes is complex — you need to handle backups, failover, WAL archiving, and version upgrades yourself. <strong>For production, prefer managed services</strong>: Cloud SQL, RDS, Atlas, Redis Cloud. Use StatefulSets in Kubernetes when you need full control, are cost-constrained, or the managed service doesn't support your use case."
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "daemonsets-jobs",
      title: "DaemonSets & Jobs: Node-Level and Batch Workloads",
      readTime: "10 min",
      content: [
        {
          type: "text",
          text: "Deployments manage replicated stateless apps. StatefulSets manage stateful apps. But two more workload types cover critical production needs: <strong>DaemonSets</strong> (run exactly one Pod on every node) and <strong>Jobs/CronJobs</strong> (run to completion, not forever)."
        },
        {
          type: "heading",
          text: "DaemonSets: One Pod Per Node",
          level: 2
        },
        {
          type: "text",
          text: "A DaemonSet ensures that exactly <em>one instance</em> of a Pod runs on <em>every node</em> in the cluster (or a subset using node selectors). When new nodes join the cluster, the DaemonSet Pod is automatically scheduled on them. Classic use cases:"
        },
        {
          type: "list",
          items: [
            "<strong>Log collection</strong> — Fluentd, Fluent Bit reading /var/log from each node",
            "<strong>Metrics collection</strong> — Prometheus node-exporter for CPU/memory/disk metrics",
            "<strong>Network plugins</strong> — CNI agents (Calico, Cilium) that configure node networking",
            "<strong>Security agents</strong> — Falco for runtime threat detection",
            "<strong>Storage plugins</strong> — CSI drivers that need node-level access",
          ]
        },
        {
          type: "code",
          lang: "yaml",
          filename: "fluentbit-daemonset.yaml",
          code: `apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluent-bit
  namespace: logging
spec:
  selector:
    matchLabels:
      app: fluent-bit
  template:
    metadata:
      labels:
        app: fluent-bit
    spec:
      serviceAccountName: fluent-bit
      tolerations:
        - key: node-role.kubernetes.io/control-plane  # also run on control plane nodes
          operator: Exists
          effect: NoSchedule
      containers:
        - name: fluent-bit
          image: fluent/fluent-bit:2.2
          volumeMounts:
            - name: varlog
              mountPath: /var/log
              readOnly: true
            - name: varlibdockercontainers
              mountPath: /var/lib/docker/containers
              readOnly: true
          resources:
            limits:
              memory: 200Mi
            requests:
              cpu: 100m
              memory: 100Mi
      volumes:
        - name: varlog
          hostPath:
            path: /var/log
        - name: varlibdockercontainers
          hostPath:
            path: /var/lib/docker/containers`
        },
        {
          type: "heading",
          text: "Jobs: Run to Completion",
          level: 2
        },
        {
          type: "text",
          text: "A <strong>Job</strong> creates one or more Pods and ensures they complete successfully. Unlike Deployments (which restart Pods forever), Jobs are designed for finite tasks: database migrations, batch processing, report generation, one-off data transforms."
        },
        {
          type: "code",
          lang: "yaml",
          filename: "db-migration-job.yaml",
          code: `apiVersion: batch/v1
kind: Job
metadata:
  name: db-migration-v2
spec:
  backoffLimit: 3          # retry up to 3 times on failure
  activeDeadlineSeconds: 300  # fail job if not done in 5 minutes
  template:
    spec:
      restartPolicy: OnFailure  # required for Jobs (not Always)
      containers:
        - name: migrate
          image: myapp:v2
          command: ["python", "-m", "alembic", "upgrade", "head"]
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: db-secret
                  key: url`
        },
        {
          type: "code",
          lang: "bash",
          filename: "job-ops.sh",
          code: `# Create and watch a job
kubectl apply -f db-migration-job.yaml
kubectl get job db-migration-v2 -w

# Check job status
kubectl describe job db-migration-v2

# View logs from job's pod
kubectl logs -l job-name=db-migration-v2

# Clean up completed job (and its pods)
kubectl delete job db-migration-v2`
        },
        {
          type: "heading",
          text: "CronJobs: Scheduled Tasks",
          level: 2
        },
        {
          type: "text",
          text: "A <strong>CronJob</strong> creates Jobs on a cron schedule. Use for: periodic reports, cache warming, cleanup tasks, health check pings, snapshot backups."
        },
        {
          type: "code",
          lang: "yaml",
          filename: "cleanup-cronjob.yaml",
          code: `apiVersion: batch/v1
kind: CronJob
metadata:
  name: db-cleanup
spec:
  schedule: "0 2 * * *"          # every day at 2am UTC
  timeZone: "UTC"
  concurrencyPolicy: Forbid       # don't run if previous job still running
  successfulJobsHistoryLimit: 3   # keep last 3 successful job records
  failedJobsHistoryLimit: 3       # keep last 3 failed job records
  startingDeadlineSeconds: 60     # if missed by >60s, skip this run
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
            - name: cleanup
              image: myapp:latest
              command: ["python", "scripts/cleanup_old_records.py"]
              env:
                - name: DATABASE_URL
                  valueFrom:
                    secretKeyRef:
                      name: db-secret
                      key: url`
        },
        {
          type: "comparison",
          headers: ["concurrencyPolicy", "Behavior"],
          rows: [
            ["Allow", "Multiple jobs can run simultaneously (default)"],
            ["Forbid", "Skip new run if previous is still running — safe for idempotent tasks"],
            ["Replace", "Cancel running job, start new one — use when freshness matters"],
          ]
        },
        {
          type: "callout",
          variant: "tip",
          title: "Init Containers for Migration Pattern",
          text: "A common pattern: use an <strong>Init Container</strong> in your Deployment to run database migrations before the main app starts. This ensures migrations complete before the app accepts traffic — but be careful with parallel Pods all trying to migrate simultaneously. Use Job-based migrations for more control."
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "rbac",
      title: "RBAC: Roles, ClusterRoles & ServiceAccounts",
      readTime: "13 min",
      content: [
        {
          type: "text",
          text: "Kubernetes RBAC (Role-Based Access Control) controls <em>who can do what to which resources</em>. This applies to: human users (kubectl), external tools (CI/CD pipelines), and Pods themselves (via ServiceAccounts). Getting RBAC right is critical for security — and for interviews."
        },
        {
          type: "heading",
          text: "The Four RBAC Objects",
          level: 2
        },
        {
          type: "comparison",
          headers: ["Object", "Scope", "Purpose"],
          rows: [
            ["Role", "Single namespace", "Defines a set of permissions within one namespace"],
            ["ClusterRole", "Cluster-wide", "Permissions across all namespaces, or for cluster-scoped resources"],
            ["RoleBinding", "Single namespace", "Grants a Role (or ClusterRole) to a user/group/serviceaccount within a namespace"],
            ["ClusterRoleBinding", "Cluster-wide", "Grants a ClusterRole to a user/group/serviceaccount cluster-wide"],
          ]
        },
        {
          type: "heading",
          text: "Defining a Role",
          level: 2
        },
        {
          type: "text",
          text: "A Role is a collection of permission rules. Each rule specifies: <strong>apiGroups</strong> (resource group), <strong>resources</strong> (what objects), and <strong>verbs</strong> (what actions)."
        },
        {
          type: "code",
          lang: "yaml",
          filename: "pod-reader-role.yaml",
          code: `apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: pod-reader
  namespace: production
rules:
  - apiGroups: [""]         # "" = core API group (pods, services, configmaps)
    resources: ["pods", "pods/log"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["apps"]     # apps group: deployments, replicasets
    resources: ["deployments"]
    verbs: ["get", "list"]`
        },
        {
          type: "text",
          text: "Common verbs: <code>get</code>, <code>list</code>, <code>watch</code>, <code>create</code>, <code>update</code>, <code>patch</code>, <code>delete</code>, <code>deletecollection</code>. The <code>*</code> wildcard matches all. Common apiGroups: <code>\"\"</code> (core), <code>apps</code>, <code>batch</code>, <code>networking.k8s.io</code>."
        },
        {
          type: "heading",
          text: "Binding a Role to a Subject",
          level: 2
        },
        {
          type: "code",
          lang: "yaml",
          filename: "pod-reader-binding.yaml",
          code: `apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: pod-reader-binding
  namespace: production
subjects:
  - kind: User             # Human user
    name: alice
    apiGroup: rbac.authorization.k8s.io
  - kind: Group            # Group of users
    name: developers
    apiGroup: rbac.authorization.k8s.io
  - kind: ServiceAccount  # A pod's identity
    name: monitoring-agent
    namespace: monitoring
roleRef:
  kind: Role
  name: pod-reader
  apiGroup: rbac.authorization.k8s.io`
        },
        {
          type: "heading",
          text: "ServiceAccounts: Pod Identity",
          level: 2
        },
        {
          type: "text",
          text: "Every Pod runs as a <strong>ServiceAccount</strong>. By default, pods use the <code>default</code> ServiceAccount (which has minimal permissions). When a Pod needs to interact with the Kubernetes API (e.g., a monitoring agent listing Pods, or a CI/CD system creating Deployments), create a dedicated ServiceAccount with appropriate permissions:"
        },
        {
          type: "code",
          lang: "yaml",
          filename: "monitoring-serviceaccount.yaml",
          code: `# 1. Create the ServiceAccount
apiVersion: v1
kind: ServiceAccount
metadata:
  name: monitoring-agent
  namespace: monitoring
---
# 2. Create a ClusterRole with read access to pods/nodes/metrics
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: monitoring-reader
rules:
  - apiGroups: [""]
    resources: ["pods", "nodes", "endpoints", "services"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["metrics.k8s.io"]
    resources: ["pods", "nodes"]
    verbs: ["get", "list"]
---
# 3. Bind the ClusterRole to the ServiceAccount
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: monitoring-reader-binding
subjects:
  - kind: ServiceAccount
    name: monitoring-agent
    namespace: monitoring
roleRef:
  kind: ClusterRole
  name: monitoring-reader
  apiGroup: rbac.authorization.k8s.io`
        },
        {
          type: "code",
          lang: "yaml",
          filename: "pod-with-sa.yaml",
          code: `# 4. Use the ServiceAccount in your Pod/Deployment
spec:
  serviceAccountName: monitoring-agent   # mount SA token
  automountServiceAccountToken: true     # default: true
  containers:
    - name: agent
      image: monitoring-agent:latest`
        },
        {
          type: "heading",
          text: "Debugging RBAC",
          level: 2
        },
        {
          type: "code",
          lang: "bash",
          filename: "rbac-debug.sh",
          code: `# Check if a user can perform an action
kubectl auth can-i create pods --as alice
kubectl auth can-i create pods --as alice --namespace production

# Check what a ServiceAccount can do
kubectl auth can-i list pods \
  --as system:serviceaccount:monitoring:monitoring-agent

# List all roles in a namespace
kubectl get roles,clusterroles -n production

# See what a RoleBinding grants
kubectl describe rolebinding pod-reader-binding -n production

# Check all permissions for a service account
kubectl auth can-i --list \
  --as system:serviceaccount:production:myapp-sa`
        },
        {
          type: "callout",
          variant: "tip",
          title: "Principle of Least Privilege",
          text: "Never give a Pod cluster-admin. Grant only the exact verbs and resources needed. Use namespace-scoped Roles (not ClusterRoles) when the Pod only needs access within its own namespace. Audit RBAC regularly: <code>kubectl get rolebindings,clusterrolebindings -A</code> to see who has what."
        },
        {
          type: "heading",
          text: "Built-in ClusterRoles",
          level: 2
        },
        {
          type: "comparison",
          headers: ["ClusterRole", "What It Allows"],
          rows: [
            ["cluster-admin", "Full control over everything — use sparingly"],
            ["admin", "Full control within a namespace (no cluster-scoped resources)"],
            ["edit", "Read/write most resources in a namespace, no RBAC management"],
            ["view", "Read-only access to most resources in a namespace"],
          ]
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "pod-security",
      title: "Pod Security Standards & OPA Gatekeeper",
      readTime: "11 min",
      content: [
        {
          type: "text",
          text: "RBAC controls who can create resources. <strong>Pod Security</strong> controls what those resources are allowed to do — preventing Pods from running as root, mounting host paths, or using privileged containers. In 2025, Kubernetes offers two approaches: built-in <strong>Pod Security Standards</strong> and the more powerful <strong>OPA Gatekeeper</strong>."
        },
        {
          type: "heading",
          text: "Pod Security Standards (PSS)",
          level: 2
        },
        {
          type: "text",
          text: "PSS defines three policy levels applied at the namespace level:"
        },
        {
          type: "comparison",
          headers: ["Level", "What It Restricts", "Use Case"],
          rows: [
            ["Privileged", "Nothing — fully open", "System namespaces (kube-system)"],
            ["Baseline", "Privileged containers, hostPID/hostIPC/hostNetwork, some volume types", "Most production workloads"],
            ["Restricted", "Everything in Baseline + must run as non-root, read-only root FS, drop all capabilities", "High-security, regulated environments"],
          ]
        },
        {
          type: "code",
          lang: "bash",
          filename: "enable-pss.sh",
          code: `# Enable PSS on a namespace via labels
kubectl label namespace production \
  pod-security.kubernetes.io/enforce=baseline \
  pod-security.kubernetes.io/warn=restricted \
  pod-security.kubernetes.io/audit=restricted

# enforce: reject violating pods
# warn: allow but warn
# audit: allow but log to audit log

# Test what your namespace allows
kubectl apply --dry-run=server -f my-pod.yaml -n production`
        },
        {
          type: "heading",
          text: "Writing Secure Pod Specs",
          level: 2
        },
        {
          type: "code",
          lang: "yaml",
          filename: "secure-pod.yaml",
          code: `apiVersion: v1
kind: Pod
metadata:
  name: secure-api
spec:
  securityContext:           # Pod-level security context
    runAsNonRoot: true       # don't run as UID 0
    runAsUser: 1000          # specific non-root UID
    runAsGroup: 1000
    fsGroup: 1000            # volume mount group
    seccompProfile:
      type: RuntimeDefault   # use container runtime's seccomp profile
  containers:
    - name: api
      image: myapp:latest
      securityContext:       # Container-level (overrides pod-level)
        allowPrivilegeEscalation: false   # can't gain more privs
        readOnlyRootFilesystem: true      # can't write to /
        capabilities:
          drop: ["ALL"]      # drop all Linux capabilities
          add: ["NET_BIND_SERVICE"]  # only if binding port <1024
      volumeMounts:
        - name: tmp           # app needs to write somewhere
          mountPath: /tmp
        - name: cache
          mountPath: /app/cache
  volumes:
    - name: tmp
      emptyDir: {}
    - name: cache
      emptyDir: {}`
        },
        {
          type: "heading",
          text: "OPA Gatekeeper: Policy as Code",
          level: 2
        },
        {
          type: "text",
          text: "OPA (Open Policy Agent) Gatekeeper is a Kubernetes admission controller that lets you write custom policies in <strong>Rego</strong> (a declarative policy language). It's far more flexible than PSS — you can enforce business rules like 'all images must come from our private registry' or 'resource limits are mandatory'."
        },
        {
          type: "code",
          lang: "bash",
          filename: "install-gatekeeper.sh",
          code: `# Install OPA Gatekeeper
kubectl apply -f https://raw.githubusercontent.com/open-policy-agent/gatekeeper/release-3.14/deploy/gatekeeper.yaml

# Check it's running
kubectl get pods -n gatekeeper-system`
        },
        {
          type: "code",
          lang: "yaml",
          filename: "required-labels-template.yaml",
          code: `# ConstraintTemplate: defines the policy logic in Rego
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8srequiredlabels
spec:
  crd:
    spec:
      names:
        kind: K8sRequiredLabels
      validation:
        openAPIV3Schema:
          type: object
          properties:
            labels:
              type: array
              items:
                type: string
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8srequiredlabels
        violation[{"msg": msg}] {
          provided := {label | input.review.object.metadata.labels[label]}
          required := {label | label := input.parameters.labels[_]}
          missing := required - provided
          count(missing) > 0
          msg := sprintf("Missing required labels: %v", [missing])
        }`
        },
        {
          type: "code",
          lang: "yaml",
          filename: "required-labels-constraint.yaml",
          code: `# Constraint: applies the template to specific resources
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequiredLabels
metadata:
  name: require-app-and-owner-labels
spec:
  match:
    kinds:
      - apiGroups: ["apps"]
        kinds: ["Deployment"]
    namespaces: ["production"]
  parameters:
    labels: ["app", "owner", "version"]`
        },
        {
          type: "callout",
          variant: "info",
          title: "Admission Controllers",
          text: "Both PSS and Gatekeeper work as <strong>admission controllers</strong> — webhook plugins that intercept API server requests before objects are persisted. They can <em>mutate</em> (modify) or <em>validate</em> (approve/reject) objects. Other common admission controllers: LimitRanger (sets default resource limits), ResourceQuota (enforces namespace quotas)."
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "multi-tenancy",
      title: "Multi-Tenancy: Namespaces, ResourceQuotas & LimitRanges",
      readTime: "11 min",
      content: [
        {
          type: "text",
          text: "A single Kubernetes cluster often runs multiple teams' workloads — different services, different environments (dev/staging/production), or even different customers. <strong>Multi-tenancy</strong> is how you isolate teams, limit their blast radius, and ensure fair resource sharing."
        },
        {
          type: "heading",
          text: "Namespaces: The Isolation Unit",
          level: 2
        },
        {
          type: "text",
          text: "Namespaces are Kubernetes's primary isolation mechanism. Resources within a namespace share a name scope, RBAC policies, and ResourceQuotas. Cross-namespace communication is possible but controllable via NetworkPolicies."
        },
        {
          type: "code",
          lang: "bash",
          filename: "namespace-setup.sh",
          code: `# Create namespaces for different environments
kubectl create namespace production
kubectl create namespace staging
kubectl create namespace development

# Label namespaces (useful for NetworkPolicy selectors)
kubectl label namespace production environment=production team=backend
kubectl label namespace staging environment=staging team=backend

# See all namespaces
kubectl get namespaces --show-labels

# Work in a specific namespace
kubectl get pods -n production
kubectl config set-context --current --namespace=production  # set default`
        },
        {
          type: "heading",
          text: "ResourceQuotas: Hard Limits Per Namespace",
          level: 2
        },
        {
          type: "text",
          text: "A <strong>ResourceQuota</strong> limits the total resources consumable within a namespace. If the quota is exceeded, new Pods or PVCs are rejected. This prevents one team from monopolizing cluster resources."
        },
        {
          type: "code",
          lang: "yaml",
          filename: "production-quota.yaml",
          code: `apiVersion: v1
kind: ResourceQuota
metadata:
  name: production-quota
  namespace: production
spec:
  hard:
    # Compute resources
    requests.cpu: "20"          # total CPU requests across all pods
    requests.memory: 40Gi       # total memory requests
    limits.cpu: "40"
    limits.memory: 80Gi

    # Object count limits
    pods: "100"
    services: "20"
    persistentvolumeclaims: "20"
    secrets: "50"
    configmaps: "50"

    # Storage
    requests.storage: 500Gi
    storageclass.storage.k8s.io/fast-ssd.requests.storage: 200Gi`
        },
        {
          type: "code",
          lang: "bash",
          filename: "check-quota.sh",
          code: `# See quota usage
kubectl describe resourcequota production-quota -n production

# Example output:
# Resource                Used   Hard
# --------                ----   ----
# limits.cpu              4      40
# limits.memory           8Gi    80Gi
# pods                    12     100
# requests.cpu            2      20
# requests.memory         4Gi    40Gi`
        },
        {
          type: "heading",
          text: "LimitRanges: Defaults and Per-Pod Limits",
          level: 2
        },
        {
          type: "text",
          text: "If a ResourceQuota requires resource requests/limits but a developer doesn't set them, Pod creation fails. A <strong>LimitRange</strong> solves this by automatically injecting default values and enforcing min/max constraints per container:"
        },
        {
          type: "code",
          lang: "yaml",
          filename: "production-limitrange.yaml",
          code: `apiVersion: v1
kind: LimitRange
metadata:
  name: production-limits
  namespace: production
spec:
  limits:
    - type: Container
      default:               # injected if not specified
        cpu: "500m"
        memory: "256Mi"
      defaultRequest:        # injected as request if not specified
        cpu: "100m"
        memory: "128Mi"
      max:                   # per-container maximum
        cpu: "4"
        memory: "8Gi"
      min:                   # per-container minimum
        cpu: "50m"
        memory: "64Mi"
    - type: PersistentVolumeClaim
      max:
        storage: 50Gi
      min:
        storage: 1Gi`
        },
        {
          type: "heading",
          text: "Putting It Together: Team Namespace Setup",
          level: 2
        },
        {
          type: "text",
          text: "A complete setup for a production namespace with isolation, resource limits, and RBAC:"
        },
        {
          type: "code",
          lang: "bash",
          filename: "team-namespace-setup.sh",
          code: `# 1. Create namespace with labels
kubectl create namespace team-payments
kubectl label namespace team-payments \
  team=payments \
  environment=production \
  pod-security.kubernetes.io/enforce=baseline

# 2. Apply ResourceQuota
kubectl apply -f payments-quota.yaml -n team-payments

# 3. Apply LimitRange
kubectl apply -f payments-limitrange.yaml -n team-payments

# 4. Apply NetworkPolicy (default deny + specific allows)
kubectl apply -f payments-netpol.yaml -n team-payments

# 5. Create ServiceAccount for CI/CD
kubectl create serviceaccount payments-deployer -n team-payments

# 6. Grant namespace-scoped deploy permissions
kubectl create rolebinding payments-deployer-binding \
  --clusterrole=edit \
  --serviceaccount=team-payments:payments-deployer \
  -n team-payments

# 7. Verify the setup
kubectl describe namespace team-payments
kubectl get resourcequota,limitrange,networkpolicy -n team-payments`
        },
        {
          type: "callout",
          variant: "tip",
          title: "Namespace-Level Isolation Is Soft",
          text: "Namespaces provide logical isolation, not hard security boundaries. A compromised Pod can still try to reach other namespaces. Combine namespaces with: <strong>NetworkPolicies</strong> (restrict traffic), <strong>RBAC</strong> (restrict API access), <strong>Pod Security Standards</strong> (restrict what Pods can do), and <strong>ResourceQuotas</strong> (limit resource consumption). Defense in depth."
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "service-mesh-basics",
      title: "Service Mesh Basics: Istio, mTLS & Traffic Management",
      readTime: "14 min",
      content: [
        {
          type: "text",
          text: "You have 20 microservices. Each one needs to: encrypt traffic to every other service, implement retries/timeouts, do canary deployments, emit distributed traces, and rate-limit incoming requests. You could add all of this logic to each service's code — or you could use a <strong>service mesh</strong>, which handles all of it transparently in the network layer."
        },
        {
          type: "heading",
          text: "What Is a Service Mesh?",
          level: 2
        },
        {
          type: "text",
          text: "A service mesh injects a <strong>sidecar proxy</strong> (typically Envoy) into every Pod. All traffic in and out of the Pod passes through this proxy — the application is unaware. The control plane configures all proxies centrally. This gives you:"
        },
        {
          type: "list",
          items: [
            "<strong>mTLS</strong> — automatic mutual TLS between every service pair, zero code changes",
            "<strong>Traffic management</strong> — weighted routing, canary deploys, A/B testing",
            "<strong>Observability</strong> — automatic distributed tracing, metrics, access logs for all traffic",
            "<strong>Resilience</strong> — circuit breaking, retries, timeouts configured centrally",
            "<strong>Security policies</strong> — L7 authorization (allow GET /api but deny POST /admin)",
          ]
        },
        {
          type: "diagram",
          code: `  Service A Pod                    Service B Pod
  ┌───────────────────┐            ┌───────────────────┐
  │  App Container    │            │  App Container    │
  │  (port 8000)      │            │  (port 8000)      │
  ├───────────────────┤            ├───────────────────┤
  │  Envoy Sidecar   │──mTLS─────▶│  Envoy Sidecar   │
  │  (port 15001)     │            │  (port 15001)     │
  └───────────────────┘            └───────────────────┘
           │                                │
           └──────────────┬─────────────────┘
                          │
                   Istio Control Plane
                   (Istiod)
              - distributes config to all sidecars
              - manages certificate rotation
              - handles service discovery`
        },
        {
          type: "heading",
          text: "Istio: The Most Popular Service Mesh",
          level: 2
        },
        {
          type: "text",
          text: "Istio is the dominant service mesh for Kubernetes. Its key components:"
        },
        {
          type: "comparison",
          headers: ["Component", "Role"],
          rows: [
            ["Istiod", "Control plane: pushes config to sidecars, manages certs (Pilot + Citadel + Galley merged)"],
            ["Envoy sidecar", "Data plane proxy injected into every Pod"],
            ["Istio Ingress Gateway", "Replaces NGINX Ingress — handles external traffic with full mesh features"],
            ["istioctl", "CLI for installing, debugging, and analyzing mesh config"],
          ]
        },
        {
          type: "code",
          lang: "bash",
          filename: "install-istio.sh",
          code: `# Install Istio using istioctl
curl -L https://istio.io/downloadIstio | sh -
cd istio-*
export PATH="$PWD/bin:$PATH"

# Install with default profile
istioctl install --set profile=default -y

# Enable sidecar injection for a namespace
kubectl label namespace production istio-injection=enabled

# Verify installation
istioctl verify-install
kubectl get pods -n istio-system`
        },
        {
          type: "heading",
          text: "mTLS: Automatic Encryption Between Services",
          level: 2
        },
        {
          type: "text",
          text: "With Istio, <strong>mTLS is automatic</strong> in STRICT mode — both sides authenticate each other using Istio-managed certificates (rotated automatically). No code changes in your services:"
        },
        {
          type: "code",
          lang: "yaml",
          filename: "peer-authentication.yaml",
          code: `# Enforce mTLS for all services in the production namespace
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: production
spec:
  mtls:
    mode: STRICT    # reject non-mTLS connections`
        },
        {
          type: "heading",
          text: "Traffic Management: Canary Deployments",
          level: 2
        },
        {
          type: "text",
          text: "Istio lets you split traffic by percentage between service versions — no separate Kubernetes Deployments needed for routing logic:"
        },
        {
          type: "code",
          lang: "yaml",
          filename: "canary-virtual-service.yaml",
          code: `# DestinationRule: define service versions (subsets)
apiVersion: networking.istio.io/v1alpha3
kind: DestinationRule
metadata:
  name: api-destination
  namespace: production
spec:
  host: api-service
  subsets:
    - name: v1
      labels:
        version: v1
    - name: v2
      labels:
        version: v2
---
# VirtualService: split traffic 90% v1, 10% v2
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: api-canary
  namespace: production
spec:
  hosts:
    - api-service
  http:
    - match:
        - headers:
            x-canary:
              exact: "true"   # 100% canary for users with this header
      route:
        - destination:
            host: api-service
            subset: v2
    - route:
        - destination:
            host: api-service
            subset: v1
          weight: 90
        - destination:
            host: api-service
            subset: v2
          weight: 10`
        },
        {
          type: "heading",
          text: "Resilience: Retries, Timeouts, Circuit Breaking",
          level: 2
        },
        {
          type: "code",
          lang: "yaml",
          filename: "resilience-virtual-service.yaml",
          code: `apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: api-resilience
  namespace: production
spec:
  hosts:
    - api-service
  http:
    - timeout: 5s             # overall request timeout
      retries:
        attempts: 3           # retry up to 3 times
        perTryTimeout: 2s     # each attempt times out in 2s
        retryOn: "5xx,reset,connect-failure"
      route:
        - destination:
            host: api-service
---
apiVersion: networking.istio.io/v1alpha3
kind: DestinationRule
metadata:
  name: api-circuit-breaker
  namespace: production
spec:
  host: api-service
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 5    # eject after 5 consecutive errors
      interval: 30s              # scanning interval
      baseEjectionTime: 30s      # eject for at least 30s
      maxEjectionPercent: 50     # eject at most 50% of endpoints`
        },
        {
          type: "callout",
          variant: "info",
          title: "Istio vs Linkerd",
          text: "<strong>Istio</strong> is feature-rich but complex — large control plane, steep learning curve. <strong>Linkerd</strong> is simpler, lighter, faster — uses a Rust-based micro-proxy instead of Envoy. For most teams starting with a service mesh: Linkerd if you want simplicity, Istio if you need advanced traffic management or L7 policies. Interview answer: 'I understand the trade-offs and would choose based on team maturity and feature requirements.'"
        },
        {
          type: "heading",
          text: "Observability: Free Distributed Tracing",
          level: 2
        },
        {
          type: "code",
          lang: "bash",
          filename: "mesh-observability.sh",
          code: `# Istio ships with integrations for Jaeger (tracing), Kiali (mesh viz), Grafana
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/jaeger.yaml
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/kiali.yaml
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/grafana.yaml

# Open Kiali dashboard (visualize mesh traffic)
istioctl dashboard kiali

# Open Jaeger (distributed traces)
istioctl dashboard jaeger

# Check proxy config for a specific pod
istioctl proxy-config routes deploy/api -n production

# Analyze mesh configuration for issues
istioctl analyze -n production`
        },
      ]
    },

  ]; // end m.lessons
})();
