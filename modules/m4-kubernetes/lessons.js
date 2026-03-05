// Patches the Kubernetes Fundamentals module (m4) with full tutorial lesson content.
// Loaded after curriculum.js. m4 = CURRICULUM.phases[1].modules[0]
(function patchKubernetesLessons() {
  const m = CURRICULUM.phases[1].modules[0]; // phase-2 (index 1), first module

  m.lessons = [

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "why-kubernetes",
      title: "Why Kubernetes? The Problem It Solves",
      readTime: "10 min",
      content: [
        {
          type: "text",
          text: "You've mastered Docker. You can containerize anything. But production is not a single server running <code>docker run</code>. Production is 50 servers, 500 containers, traffic spikes at 3am, and a Pod crashing silently at midnight. Docker alone can't handle that. <strong>Kubernetes is the answer.</strong>"
        },
        {
          type: "callout",
          variant: "info",
          title: "What Kubernetes Is",
          text: "Kubernetes (K8s) is a container orchestration platform. It takes a fleet of machines and a set of containers, and makes decisions about <em>where to run them, how many copies to run, how to route traffic to them, and what to do when they fail.</em> You declare what you want; Kubernetes makes it happen and keeps it that way."
        },
        {
          type: "heading",
          text: "The Problem: Running Containers at Scale",
          level: 2
        },
        {
          type: "text",
          text: "Imagine you deploy a FastAPI inference service. Day one: one server, <code>docker run -p 80:8000 myapp</code>. Works great. Then your startup gets 10,000 users. You need:"
        },
        {
          type: "list",
          items: [
            "<strong>Multiple replicas</strong> — run 10 copies to handle load, spread across machines",
            "<strong>Auto-scaling</strong> — add replicas when CPU spikes, remove when load drops",
            "<strong>Self-healing</strong> — if a container crashes, restart it automatically",
            "<strong>Rolling deploys</strong> — update from v1 to v2 with zero downtime",
            "<strong>Service discovery</strong> — containers need to find each other without hardcoded IPs",
            "<strong>Load balancing</strong> — spread traffic evenly across all replicas",
            "<strong>Resource management</strong> — guarantee each container gets the CPU/memory it needs",
            "<strong>Config management</strong> — inject different configs per environment without rebuilding images"
          ]
        },
        {
          type: "text",
          text: "Docker Compose handles one machine. Kubernetes handles a <em>cluster</em> of machines. It's the difference between a bicycle and a logistics company."
        },
        {
          type: "heading",
          text: "Kubernetes History in 60 Seconds",
          level: 2
        },
        {
          type: "text",
          text: "Google ran everything on containers internally for years using a system called Borg. They open-sourced a new version in 2014 and called it Kubernetes (Greek for 'helmsman' or 'pilot'). The Cloud Native Computing Foundation (CNCF) now maintains it. Today it runs on every major cloud: GKE (Google), EKS (AWS), AKS (Azure). It's the dominant platform for production containerized workloads."
        },
        {
          type: "heading",
          text: "The Declarative Model — The Core Mental Shift",
          level: 2
        },
        {
          type: "text",
          text: "The most important thing to understand about Kubernetes is its <strong>declarative model</strong>. You don't tell Kubernetes <em>what to do</em>. You tell it <em>what state you want</em>."
        },
        {
          type: "comparison",
          headers: ["", "Imperative (Docker CLI)", "Declarative (Kubernetes)"],
          rows: [
            ["Approach", "\"Run this command now\"", "\"Here is the desired state\""],
            ["Example", "docker run -d --replicas 3 myapp", "spec.replicas: 3 in a YAML file"],
            ["Self-healing", "Manual — you re-run the command", "Automatic — K8s reconciles continuously"],
            ["Audit trail", "Command history", "Git — version-controlled YAML"],
            ["Scale", "Works for 1-5 containers", "Works for 5,000+ containers"],
          ]
        },
        {
          type: "callout",
          variant: "tip",
          title: "The Reconciliation Loop",
          text: "Kubernetes constantly compares <em>desired state</em> (what you wrote in YAML) against <em>actual state</em> (what's actually running). If they differ, it takes action to close the gap. This is called the reconciliation loop. It's why Kubernetes is self-healing: even if a node dies at 3am, K8s will reschedule Pods elsewhere without you doing anything."
        },
        {
          type: "heading",
          text: "A Taste of Kubernetes YAML",
          level: 2
        },
        {
          type: "text",
          text: "Here's what it looks like to run your FastAPI app in Kubernetes. Don't worry about every field yet — just notice how you're <em>describing</em> what you want:"
        },
        {
          type: "code",
          lang: "yaml",
          filename: "fastapi-deployment.yaml",
          code: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: fastapi-app
spec:
  replicas: 3          # I want 3 copies running at all times
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
        image: myorg/fastapi-app:v2.1.0
        ports:
        - containerPort: 8000
        resources:
          requests:
            cpu: "250m"
            memory: "256Mi"
          limits:
            cpu: "1"
            memory: "512Mi"`
        },
        {
          type: "text",
          text: "You save this file and run <code>kubectl apply -f fastapi-deployment.yaml</code>. Kubernetes reads it, finds that 0 Pods currently match, and starts 3. If one crashes, it starts a fourth. If you change <code>replicas: 3</code> to <code>replicas: 10</code> and apply again, it starts 7 more. That's the declarative model in action."
        },
        {
          type: "callout",
          variant: "gotcha",
          title: "Kubernetes Is Not Magic — It Has Real Complexity",
          text: "K8s solves hard problems, but it adds operational complexity. A small team running 3 containers does not need Kubernetes. It's the right choice when you need: multiple replicas, multiple services talking to each other, autoscaling, zero-downtime deploys, or multi-team isolation. Know when to use it — and when plain Docker Compose is enough."
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "architecture",
      title: "Kubernetes Architecture — Control Plane and Worker Nodes",
      readTime: "12 min",
      content: [
        {
          type: "text",
          text: "A Kubernetes cluster has two types of machines: the <strong>control plane</strong> (the brain) and <strong>worker nodes</strong> (the muscle). The control plane makes decisions; workers run your containers. Understanding this split is essential for debugging and operations."
        },
        {
          type: "diagram",
          code: `  KUBERNETES CLUSTER
  ┌─────────────────────────────────────────────────────────────────────┐
  │                         CONTROL PLANE                              │
  │  ┌──────────────┐  ┌──────────┐  ┌──────────────┐  ┌──────────┐  │
  │  │  API Server  │  │   etcd   │  │  Scheduler   │  │Controller│  │
  │  │ (kube-apisvr)│  │(key-val) │  │              │  │ Manager  │  │
  │  └──────────────┘  └──────────┘  └──────────────┘  └──────────┘  │
  └──────────────────────────────┬──────────────────────────────────────┘
                                 │ kubelet watches API server
  ┌──────────────────────────────┼──────────────────────────────────────┐
  │        WORKER NODES          │                                      │
  │  ┌────────────────────────┐  │  ┌────────────────────────────────┐ │
  │  │  Node 1                │  │  │  Node 2                        │ │
  │  │  ┌─────────┬─────────┐ │  │  │  ┌─────────┬─────────────────┐│ │
  │  │  │  Pod A  │  Pod B  │ │  │  │  │  Pod C  │    Pod D        ││ │
  │  │  └─────────┴─────────┘ │  │  │  └─────────┴─────────────────┘│ │
  │  │  kubelet | kube-proxy  │  │  │  kubelet | kube-proxy         │ │
  │  │  container runtime     │  │  │  container runtime             │ │
  │  └────────────────────────┘  │  └────────────────────────────────┘ │
  └──────────────────────────────────────────────────────────────────────┘`
        },
        {
          type: "heading",
          text: "Control Plane Components",
          level: 2
        },
        {
          type: "heading",
          text: "kube-apiserver — The Front Door",
          level: 3
        },
        {
          type: "text",
          text: "Everything in Kubernetes goes through the API server. <code>kubectl apply</code>, the scheduler, the controller manager, kubelets on worker nodes — they all talk to kube-apiserver via REST. It validates requests, enforces RBAC, persists to etcd, and notifies watchers. There is no backdoor to Kubernetes — it's all API."
        },
        {
          type: "callout",
          variant: "info",
          title: "What kubectl apply Actually Does",
          text: "When you run <code>kubectl apply -f deployment.yaml</code>, kubectl sends a PATCH request to <code>kube-apiserver</code>. The API server validates the object, writes it to etcd, and returns success. Then other components (the scheduler, controller manager) react to the change."
        },
        {
          type: "heading",
          text: "etcd — The Source of Truth",
          level: 3
        },
        {
          type: "text",
          text: "<code>etcd</code> is a distributed key-value store that holds all cluster state. Every Deployment spec, every Pod status, every Secret — it's all in etcd. If etcd data is lost and you have no backup, your cluster configuration is gone (though running Pods keep running until the next restart). In production, etcd runs as a 3- or 5-node cluster for HA, and you back it up regularly."
        },
        {
          type: "callout",
          variant: "gotcha",
          title: "etcd Is Not a Database for Your App",
          text: "etcd is only for Kubernetes control-plane state. Don't use it to store application data. It's optimized for small writes (configuration), not large datasets. The recommended limit is ~8GB of data."
        },
        {
          type: "heading",
          text: "kube-scheduler — Pod Placement",
          level: 3
        },
        {
          type: "text",
          text: "When a Pod is created and has no assigned node, the scheduler finds the best node for it. It considers: available CPU/memory (resource requests), node selectors, affinity/anti-affinity rules, taints/tolerations, and spread constraints. It <em>only</em> decides placement — it doesn't actually start anything. The kubelet on the chosen node does that."
        },
        {
          type: "heading",
          text: "kube-controller-manager — The Reconciliation Engine",
          level: 3
        },
        {
          type: "text",
          text: "This runs dozens of controllers in a single process. Each controller watches a resource type and reconciles actual state to desired state:"
        },
        {
          type: "list",
          items: [
            "<strong>Deployment controller</strong> — ensures the right number of ReplicaSets exist",
            "<strong>ReplicaSet controller</strong> — ensures the right number of Pods exist",
            "<strong>Node controller</strong> — notices when nodes go offline and evicts their Pods",
            "<strong>Job controller</strong> — runs one-off tasks to completion",
            "<strong>Endpoints controller</strong> — keeps Service endpoints up to date"
          ]
        },
        {
          type: "heading",
          text: "Worker Node Components",
          level: 2
        },
        {
          type: "heading",
          text: "kubelet — The Node Agent",
          level: 3
        },
        {
          type: "text",
          text: "The kubelet runs on every worker node. It watches the API server for Pods assigned to its node. When it sees one, it tells the container runtime (containerd) to pull images and start containers. It also runs health checks (liveness/readiness probes) and reports Pod status back to the API server."
        },
        {
          type: "heading",
          text: "kube-proxy — Network Rules",
          level: 3
        },
        {
          type: "text",
          text: "<code>kube-proxy</code> runs on every node and maintains iptables (or IPVS) rules that implement Service routing. When you hit a Service IP, kube-proxy's rules redirect the traffic to one of the healthy backing Pods. It doesn't proxy requests itself anymore — it just programs the kernel networking rules."
        },
        {
          type: "heading",
          text: "Container Runtime",
          level: 3
        },
        {
          type: "text",
          text: "The component that actually pulls images and runs containers. Kubernetes uses the Container Runtime Interface (CRI) to talk to any compliant runtime. Modern clusters use <code>containerd</code> (which Docker also uses internally). The kubelet talks to containerd via a gRPC API; containerd calls <code>runc</code> to fork the actual process."
        },
        {
          type: "comparison",
          headers: ["Component", "Runs on", "Responsibility"],
          rows: [
            ["kube-apiserver", "Control plane", "All API requests — single source of truth"],
            ["etcd", "Control plane", "Persistent storage of all cluster state"],
            ["kube-scheduler", "Control plane", "Decide which node each Pod runs on"],
            ["controller-manager", "Control plane", "Reconcile desired vs actual state"],
            ["kubelet", "Every worker node", "Start/stop containers per assigned Pods"],
            ["kube-proxy", "Every worker node", "Program iptables rules for Service routing"],
            ["containerd", "Every worker node", "Pull images, run/stop containers"],
          ]
        },
        {
          type: "callout",
          variant: "tip",
          title: "Managed Kubernetes (GKE/EKS/AKS) Hides the Control Plane",
          text: "When you use GKE, EKS, or AKS, the cloud provider runs and manages the control plane for you. You never SSH into the API server or etcd nodes. You only manage worker nodes (or use managed node groups). This is the most common production setup — don't manage your own control plane unless you have a strong reason."
        },
        {
          type: "code",
          lang: "bash",
          filename: "inspect-cluster.sh",
          code: `# See cluster info (API server address)
kubectl cluster-info

# List all nodes in the cluster
kubectl get nodes
kubectl get nodes -o wide   # show IP, OS, container runtime version

# Describe a node (see capacity, allocations, conditions)
kubectl describe node <node-name>

# Check control plane component health
kubectl get componentstatuses   # deprecated but still works in many clusters

# See all system Pods (control plane + networking)
kubectl get pods -n kube-system`
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "pods",
      title: "Pods — The Atomic Unit of Kubernetes",
      readTime: "14 min",
      content: [
        {
          type: "text",
          text: "In Kubernetes, you don't run containers directly. You run <strong>Pods</strong>. A Pod is a wrapper around one or more containers that share a network namespace and storage volumes. The Pod is the smallest deployable unit in Kubernetes."
        },
        {
          type: "callout",
          variant: "info",
          title: "Why Not Just Use Containers Directly?",
          text: "The Pod abstraction lets Kubernetes manage groups of tightly-coupled containers as a single unit. Containers inside a Pod share the same IP address (localhost), the same volumes, and the same lifecycle. The Pod also holds metadata (labels, annotations) and scheduling directives that don't belong inside a container image."
        },
        {
          type: "heading",
          text: "A Minimal Pod YAML",
          level: 2
        },
        {
          type: "code",
          lang: "yaml",
          filename: "pod.yaml",
          code: `apiVersion: v1
kind: Pod
metadata:
  name: fastapi-pod
  labels:
    app: fastapi
    env: production
spec:
  containers:
  - name: app
    image: myorg/fastapi-app:v1.0.0
    ports:
    - containerPort: 8000
    env:
    - name: DATABASE_URL
      value: "postgresql://user:pass@postgres:5432/mydb"`
        },
        {
          type: "text",
          text: "Every Kubernetes object has the same four top-level fields: <code>apiVersion</code>, <code>kind</code>, <code>metadata</code>, and <code>spec</code>. Learn to recognize this structure — it's everywhere in Kubernetes YAML."
        },
        {
          type: "comparison",
          headers: ["Field", "Purpose", "Example"],
          rows: [
            ["apiVersion", "Which API group and version to use", "v1, apps/v1, batch/v1"],
            ["kind", "The resource type", "Pod, Deployment, Service, ConfigMap"],
            ["metadata", "Name, namespace, labels, annotations", "name: my-app, labels: {app: web}"],
            ["spec", "The desired state of the object", "containers, replicas, ports, volumes"],
          ]
        },
        {
          type: "heading",
          text: "Multi-Container Pods — Sidecar Pattern",
          level: 2
        },
        {
          type: "text",
          text: "A Pod can contain multiple containers that collaborate. This is the <strong>sidecar pattern</strong>. Use it for: logging agents (ship logs from a file to Elasticsearch), proxies (inject an Envoy sidecar for mTLS), or config reloaders (watch a ConfigMap and reload the app)."
        },
        {
          type: "code",
          lang: "yaml",
          filename: "sidecar-pod.yaml",
          code: `apiVersion: v1
kind: Pod
metadata:
  name: app-with-logger
spec:
  containers:
  # Main application container
  - name: app
    image: myorg/fastapi-app:v1.0.0
    ports:
    - containerPort: 8000
    volumeMounts:
    - name: log-volume
      mountPath: /var/log/app

  # Sidecar: reads logs from shared volume, ships to Elasticsearch
  - name: log-shipper
    image: fluent/fluent-bit:3.0
    volumeMounts:
    - name: log-volume
      mountPath: /var/log/app
      readOnly: true

  volumes:
  - name: log-volume
    emptyDir: {}   # ephemeral, exists as long as Pod lives`
        },
        {
          type: "callout",
          variant: "tip",
          title: "Containers in a Pod Share localhost",
          text: "All containers in a Pod share one network namespace. If your app container listens on port 8000, the sidecar can reach it at <code>localhost:8000</code>. No DNS, no Service — just localhost. This is why they need to use different port numbers."
        },
        {
          type: "heading",
          text: "Init Containers — Pre-Flight Checks",
          level: 2
        },
        {
          type: "text",
          text: "<strong>Init containers</strong> run sequentially before the main containers start. Use them to: wait for a database to be ready, run migrations, pull secrets, or pre-populate a shared volume. If any init container fails, the Pod restarts."
        },
        {
          type: "code",
          lang: "yaml",
          filename: "init-container.yaml",
          code: `apiVersion: v1
kind: Pod
metadata:
  name: fastapi-with-init
spec:
  initContainers:
  # Wait for Postgres to be ready before starting app
  - name: wait-for-db
    image: busybox:1.36
    command: ['sh', '-c',
      'until nc -z postgres 5432; do echo waiting for postgres; sleep 2; done']

  # Run DB migrations before starting app
  - name: run-migrations
    image: myorg/fastapi-app:v1.0.0
    command: ['python', '-m', 'alembic', 'upgrade', 'head']
    env:
    - name: DATABASE_URL
      valueFrom:
        secretKeyRef:
          name: db-secret
          key: url

  containers:
  - name: app
    image: myorg/fastapi-app:v1.0.0
    ports:
    - containerPort: 8000`
        },
        {
          type: "heading",
          text: "Pod Lifecycle",
          level: 2
        },
        {
          type: "text",
          text: "Pods go through well-defined phases. Understanding these helps you debug stuck or failed Pods."
        },
        {
          type: "comparison",
          headers: ["Phase", "Meaning", "What to Check"],
          rows: [
            ["Pending", "Accepted by K8s, not yet running", "Check events: image pull, scheduling failure, resource limits"],
            ["Running", "At least one container started", "Check container state: may still be starting up"],
            ["Succeeded", "All containers exited 0", "Normal for Jobs; not for long-running apps"],
            ["Failed", "At least one container exited non-zero", "Check logs: kubectl logs pod-name"],
            ["Unknown", "Node unreachable", "Node may be down; check node status"],
            ["CrashLoopBackOff", "Crashing repeatedly (with backoff)", "kubectl logs --previous pod-name"],
          ]
        },
        {
          type: "callout",
          variant: "gotcha",
          title: "Pods Are Ephemeral — Never Count on a Pod's IP",
          text: "When a Pod dies and Kubernetes restarts it, it gets a <em>new IP address</em>. Never hardcode Pod IPs. Use Services (which have stable IPs and DNS names) to route traffic to Pods. This is one of the first things engineers get wrong when moving from Docker to Kubernetes."
        },
        {
          type: "heading",
          text: "Essential Pod Commands",
          level: 2
        },
        {
          type: "code",
          lang: "bash",
          filename: "pod-commands.sh",
          code: `# Create a Pod from YAML
kubectl apply -f pod.yaml

# List Pods
kubectl get pods                          # basic view
kubectl get pods -o wide                  # show node, IP
kubectl get pods --watch                  # live updates

# Inspect a Pod
kubectl describe pod fastapi-pod          # events, conditions, resource usage

# Get logs
kubectl logs fastapi-pod                  # latest logs
kubectl logs fastapi-pod -f               # follow (stream)
kubectl logs fastapi-pod --previous       # last crashed container's logs
kubectl logs fastapi-pod -c log-shipper   # specific container in multi-container Pod

# Run a command inside a container
kubectl exec -it fastapi-pod -- /bin/bash
kubectl exec -it fastapi-pod -c app -- python -c "import sys; print(sys.version)"

# Port-forward to your local machine (no Service needed)
kubectl port-forward pod/fastapi-pod 8080:8000
# Now: curl http://localhost:8080/health

# Delete a Pod (it will be recreated if part of a Deployment)
kubectl delete pod fastapi-pod`
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "deployments",
      title: "Deployments and ReplicaSets — Self-Healing at Scale",
      readTime: "12 min",
      content: [
        {
          type: "text",
          text: "Running a single Pod directly is fine for experiments, but in production you need <strong>Deployments</strong>. A Deployment manages a set of identical Pods, ensures the desired number are always running, and handles rolling updates. It's the primary way to run stateless applications in Kubernetes."
        },
        {
          type: "heading",
          text: "The Deployment → ReplicaSet → Pod Hierarchy",
          level: 2
        },
        {
          type: "diagram",
          code: `  Deployment (fastapi-deployment)
  │  spec.replicas: 3
  │  spec.template: Pod spec
  │
  └── ReplicaSet (fastapi-deployment-7d9f4b8c6)
      │  Manages 3 identical Pods
      │  Has its own pod template hash in name
      │
      ├── Pod (fastapi-deployment-7d9f4b8c6-abc12)  ← node-1
      ├── Pod (fastapi-deployment-7d9f4b8c6-def34)  ← node-2
      └── Pod (fastapi-deployment-7d9f4b8c6-ghi56)  ← node-3

  When you update the Deployment (new image, new env var):
  └── New ReplicaSet (fastapi-deployment-9a1e2f3d4)
      ├── Pod (new version, scaling up)
      └── Old ReplicaSet scales down in parallel`
        },
        {
          type: "text",
          text: "You rarely interact with ReplicaSets directly — they're an implementation detail of Deployments. Deployments keep old ReplicaSets around (by default, the last 10) so you can roll back."
        },
        {
          type: "heading",
          text: "A Production-Ready Deployment",
          level: 2
        },
        {
          type: "code",
          lang: "yaml",
          filename: "deployment.yaml",
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
  revisionHistoryLimit: 5     # keep last 5 ReplicaSets for rollback

  selector:
    matchLabels:
      app: fastapi-app         # must match template labels

  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1        # at most 1 Pod unavailable during update
      maxSurge: 1              # at most 1 extra Pod during update

  template:
    metadata:
      labels:
        app: fastapi-app       # must match selector.matchLabels
    spec:
      containers:
      - name: app
        image: myorg/fastapi-app:2.1.0
        ports:
        - containerPort: 8000

        # Resource requests: what the scheduler reserves
        # Resource limits: the hard ceiling
        resources:
          requests:
            cpu: "250m"        # 0.25 CPU cores
            memory: "256Mi"
          limits:
            cpu: "1"           # 1 full core
            memory: "512Mi"

        # Health checks — critical for zero-downtime deploys
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
          initialDelaySeconds: 15
          periodSeconds: 20
          failureThreshold: 3`
        },
        {
          type: "heading",
          text: "Labels and Selectors — How K8s Finds Things",
          level: 2
        },
        {
          type: "text",
          text: "Labels are key-value pairs attached to objects. Selectors filter objects by labels. They're how a Deployment knows which Pods it owns, and how a Service knows which Pods to route traffic to. Getting labels wrong is a common source of confusion."
        },
        {
          type: "callout",
          variant: "gotcha",
          title: "The Selector Must Match the Template Labels",
          text: "In a Deployment, <code>spec.selector.matchLabels</code> must be a subset of <code>spec.template.metadata.labels</code>. If they don't match, the Deployment controller can't find its own Pods, and <code>kubectl apply</code> will error. Double-check this if you're copying YAML templates."
        },
        {
          type: "heading",
          text: "Scaling Deployments",
          level: 2
        },
        {
          type: "code",
          lang: "bash",
          filename: "scale-commands.sh",
          code: `# Scale up imperatively
kubectl scale deployment fastapi-app --replicas=10

# Scale by editing the YAML (declarative — preferred for production)
# Edit spec.replicas in the file, then:
kubectl apply -f deployment.yaml

# Auto-scaling based on CPU (requires metrics-server)
kubectl autoscale deployment fastapi-app --min=3 --max=20 --cpu-percent=70

# Check HPA status
kubectl get hpa

# Watch Pods being created/deleted
kubectl get pods --watch`
        },
        {
          type: "heading",
          text: "Rolling Updates — Zero Downtime Deploys",
          level: 2
        },
        {
          type: "text",
          text: "When you update the container image in a Deployment, Kubernetes does a rolling update by default. It gradually replaces old Pods with new ones. With <code>maxUnavailable: 1</code> and <code>maxSurge: 1</code>: it starts one new Pod, waits for it to pass readiness, then kills one old Pod, repeat."
        },
        {
          type: "code",
          lang: "bash",
          filename: "rolling-update.sh",
          code: `# Update the image (triggers rolling update)
kubectl set image deployment/fastapi-app app=myorg/fastapi-app:2.2.0

# Watch the rollout happen live
kubectl rollout status deployment/fastapi-app

# See rollout history
kubectl rollout history deployment/fastapi-app

# Roll back to previous version
kubectl rollout undo deployment/fastapi-app

# Roll back to a specific revision
kubectl rollout undo deployment/fastapi-app --to-revision=3

# Pause a rollout mid-way (canary-style check)
kubectl rollout pause deployment/fastapi-app
kubectl rollout resume deployment/fastapi-app`
        },
        {
          type: "callout",
          variant: "tip",
          title: "Readiness Probes Make Rolling Updates Safe",
          text: "Kubernetes waits for a new Pod to become <em>ready</em> before removing an old Pod. 'Ready' means the readiness probe passes. If you skip readiness probes, Kubernetes will send traffic to Pods that haven't finished starting, causing 503 errors. <strong>Always define a readiness probe for production Deployments.</strong>"
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "services",
      title: "Services — Stable Networking for Ephemeral Pods",
      readTime: "13 min",
      content: [
        {
          type: "text",
          text: "Pods die and get rescheduled constantly, getting new IP addresses each time. <strong>Services</strong> solve this by providing a stable virtual IP (ClusterIP) and DNS name that always routes to healthy Pods. Services are the networking backbone of Kubernetes."
        },
        {
          type: "heading",
          text: "How a Service Works",
          level: 2
        },
        {
          type: "diagram",
          code: `  Client (another Pod or external traffic)
        │
        │ DNS: fastapi-svc.production.svc.cluster.local
        ▼
  Service (ClusterIP: 10.96.45.12)
        │  selector: {app: fastapi-app}
        │  Watches Pod lifecycle; keeps Endpoints list current
        │
        ├──► Pod A (10.244.1.5:8000)  ✓ Ready
        ├──► Pod B (10.244.2.8:8000)  ✓ Ready
        └──► Pod C (10.244.1.9:8000)  ✓ Ready
             (Pod D: 10.244.2.3:8000) ✗ Not Ready — excluded from routing`
        },
        {
          type: "text",
          text: "The Service object maintains an <strong>Endpoints</strong> list of all Pod IPs that match its selector <em>and</em> have passing readiness probes. kube-proxy on each node turns the ClusterIP into load-balancing iptables rules. No reverse proxy, no extra hop — pure kernel networking."
        },
        {
          type: "heading",
          text: "Service Types",
          level: 2
        },
        {
          type: "comparison",
          headers: ["Type", "Accessible From", "Use Case"],
          rows: [
            ["ClusterIP (default)", "Inside cluster only", "Internal service-to-service communication"],
            ["NodePort", "Any node's IP + port (30000–32767)", "Dev/testing without a load balancer"],
            ["LoadBalancer", "Internet (via cloud LB)", "Expose a service to external traffic"],
            ["ExternalName", "Returns CNAME to external DNS", "Route to external services (e.g., RDS)"],
          ]
        },
        {
          type: "heading",
          text: "ClusterIP — Internal Service-to-Service",
          level: 2
        },
        {
          type: "code",
          lang: "yaml",
          filename: "service-clusterip.yaml",
          code: `apiVersion: v1
kind: Service
metadata:
  name: fastapi-svc
  namespace: production
spec:
  type: ClusterIP       # default; omit to get ClusterIP
  selector:
    app: fastapi-app    # routes to Pods with this label
  ports:
  - name: http
    protocol: TCP
    port: 80            # port on the Service (what clients use)
    targetPort: 8000    # port on the Pod (where your app listens)`
        },
        {
          type: "text",
          text: "Other Pods can now reach this service as <code>fastapi-svc</code> (within the same namespace) or <code>fastapi-svc.production.svc.cluster.local</code> (full DNS name, works across namespaces). Kubernetes' built-in CoreDNS resolves these names automatically."
        },
        {
          type: "heading",
          text: "LoadBalancer — Expose to the Internet",
          level: 2
        },
        {
          type: "code",
          lang: "yaml",
          filename: "service-loadbalancer.yaml",
          code: `apiVersion: v1
kind: Service
metadata:
  name: fastapi-public
  namespace: production
  annotations:
    # GCP: Uncomment to request a specific static IP
    # cloud.google.com/load-balancer-type: "External"
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
    targetPort: 8443`
        },
        {
          type: "callout",
          variant: "info",
          title: "LoadBalancer Provisions a Cloud Load Balancer",
          text: "On GKE/EKS/AKS, creating a LoadBalancer Service automatically provisions a cloud load balancer (Google Cloud LB, AWS ALB, Azure LB). This costs money per service. In production with many microservices, use one <strong>Ingress</strong> controller instead of one LoadBalancer per service."
        },
        {
          type: "heading",
          text: "Kubernetes DNS — How Services Find Each Other",
          level: 2
        },
        {
          type: "text",
          text: "Every Service gets a DNS entry in the cluster's CoreDNS. The full pattern is: <code>&lt;service-name&gt;.&lt;namespace&gt;.svc.cluster.local</code>. Within the same namespace, just <code>&lt;service-name&gt;</code> works. This is how your FastAPI app talks to a <code>postgres</code> Service — simply connect to <code>postgres:5432</code>."
        },
        {
          type: "code",
          lang: "bash",
          filename: "service-commands.sh",
          code: `# Create service from YAML
kubectl apply -f service.yaml

# List services
kubectl get services
kubectl get svc             # short form

# Inspect service and see its Endpoints
kubectl describe svc fastapi-svc

# See the actual Pod IPs behind the service
kubectl get endpoints fastapi-svc

# Test a ClusterIP service from inside a Pod
kubectl run debug --image=curlimages/curl:latest -it --rm -- /bin/sh
# Inside: curl http://fastapi-svc/health

# Port-forward a Service to local machine
kubectl port-forward svc/fastapi-svc 8080:80`
        },
        {
          type: "heading",
          text: "Headless Services — When You Need Pod IPs Directly",
          level: 2
        },
        {
          type: "text",
          text: "Sometimes you need DNS to return individual Pod IPs rather than a virtual ClusterIP. This is called a <strong>headless service</strong>. StatefulSets use them so each Pod gets its own stable DNS name (<code>redis-0.redis-headless</code>, <code>redis-1.redis-headless</code>)."
        },
        {
          type: "code",
          lang: "yaml",
          filename: "headless-service.yaml",
          code: `apiVersion: v1
kind: Service
metadata:
  name: redis-headless
spec:
  clusterIP: None    # This makes it headless
  selector:
    app: redis
  ports:
  - port: 6379
# DNS now returns A records for each Pod IP, not a single ClusterIP`
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "configmaps-secrets",
      title: "ConfigMaps and Secrets — External Configuration",
      readTime: "10 min",
      content: [
        {
          type: "text",
          text: "Your container image should be environment-agnostic. The same image should run in dev, staging, and production — with different configuration injected at runtime. Kubernetes provides two objects for this: <strong>ConfigMaps</strong> (non-sensitive config) and <strong>Secrets</strong> (sensitive data)."
        },
        {
          type: "heading",
          text: "ConfigMaps — Inject Non-Sensitive Config",
          level: 2
        },
        {
          type: "code",
          lang: "yaml",
          filename: "configmap.yaml",
          code: `apiVersion: v1
kind: ConfigMap
metadata:
  name: fastapi-config
  namespace: production
data:
  # Simple key-value pairs
  LOG_LEVEL: "info"
  WORKERS: "4"
  CORS_ORIGINS: "https://myapp.com,https://api.myapp.com"

  # A whole config file as a value
  app.conf: |
    [server]
    host = 0.0.0.0
    port = 8000
    workers = 4

    [logging]
    level = info
    format = json`
        },
        {
          type: "heading",
          text: "Consuming ConfigMaps: envFrom vs volumeMount",
          level: 2
        },
        {
          type: "code",
          lang: "yaml",
          filename: "pod-with-configmap.yaml",
          code: `spec:
  containers:
  - name: app
    image: myorg/fastapi-app:2.1.0

    # Method 1: Load all ConfigMap keys as environment variables
    envFrom:
    - configMapRef:
        name: fastapi-config   # LOG_LEVEL, WORKERS, CORS_ORIGINS all become env vars

    # Method 2: Load specific keys as env vars
    env:
    - name: MY_LOG_LEVEL
      valueFrom:
        configMapKeyRef:
          name: fastapi-config
          key: LOG_LEVEL

    # Method 3: Mount config file to a path in the container
    volumeMounts:
    - name: config-volume
      mountPath: /etc/app        # app.conf appears at /etc/app/app.conf

  volumes:
  - name: config-volume
    configMap:
      name: fastapi-config`
        },
        {
          type: "callout",
          variant: "tip",
          title: "ConfigMap File Mounts Update Automatically",
          text: "When you update a ConfigMap, files mounted via volumeMount are updated automatically (within ~1 minute). Environment variables loaded via <code>envFrom</code> are NOT — they're baked in at Pod start. For config that changes, prefer file mounts and have your app watch the file, or use a reload sidecar."
        },
        {
          type: "heading",
          text: "Secrets — For Sensitive Data",
          level: 2
        },
        {
          type: "text",
          text: "Secrets work exactly like ConfigMaps but values are base64-encoded and the API server treats them with slightly more care (separate RBAC, audit logs, optional encryption at rest). <strong>Important: base64 is NOT encryption.</strong> For real secret management, use External Secrets Operator (AWS Secrets Manager, GCP Secret Manager) or Sealed Secrets."
        },
        {
          type: "code",
          lang: "yaml",
          filename: "secret.yaml",
          code: `apiVersion: v1
kind: Secret
metadata:
  name: db-secret
  namespace: production
type: Opaque
data:
  # Values must be base64 encoded
  # echo -n "postgresql://user:pass@db:5432/prod" | base64
  DATABASE_URL: cG9zdGdyZXNxbDovL3VzZXI6cGFzc0BkYjoxNTQzMi9wcm9k
  API_KEY: c29tZXJlYWxseXNlY3JldGtleQ==

# Or use stringData — K8s encodes it for you
# stringData:
#   DATABASE_URL: "postgresql://user:pass@db:5432/prod"
#   API_KEY: "somereallysecretkey"`
        },
        {
          type: "code",
          lang: "yaml",
          filename: "pod-with-secret.yaml",
          code: `spec:
  containers:
  - name: app
    image: myorg/fastapi-app:2.1.0

    # Load all Secret keys as env vars
    envFrom:
    - secretRef:
        name: db-secret

    # Or load specific key
    env:
    - name: DATABASE_URL
      valueFrom:
        secretKeyRef:
          name: db-secret
          key: DATABASE_URL`
        },
        {
          type: "callout",
          variant: "gotcha",
          title: "Never Commit Secrets to Git",
          text: "A Secret YAML with real credentials in your repo is a security incident waiting to happen. Use one of: (1) <strong>Sealed Secrets</strong> — encrypt the Secret with a cluster public key, commit the encrypted form safely; (2) <strong>External Secrets Operator</strong> — sync secrets from AWS Secrets Manager / GCP Secret Manager into Kubernetes Secrets automatically; (3) <strong>Vault Agent Injector</strong> — inject secrets from HashiCorp Vault at Pod start. Pick one and use it consistently."
        },
        {
          type: "code",
          lang: "bash",
          filename: "secret-commands.sh",
          code: `# Create a secret from literal values (never stored in a file)
kubectl create secret generic db-secret \
  --from-literal=DATABASE_URL="postgresql://user:pass@db:5432/prod" \
  --from-literal=API_KEY="supersecret"

# Create a secret from a file
kubectl create secret generic tls-certs \
  --from-file=tls.crt=./cert.pem \
  --from-file=tls.key=./key.pem

# View secret keys (not values — base64 shown, not decoded)
kubectl get secret db-secret -o yaml

# Decode a specific value
kubectl get secret db-secret -o jsonpath='{.data.DATABASE_URL}' | base64 --decode`
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "kubectl-mastery",
      title: "kubectl Mastery — The Kubernetes CLI",
      readTime: "11 min",
      content: [
        {
          type: "text",
          text: "<code>kubectl</code> is the primary interface to your cluster. Learning to use it efficiently saves hours of debugging time. This lesson covers the commands you'll use every day in a production Kubernetes environment."
        },
        {
          type: "heading",
          text: "Essential CRUD Commands",
          level: 2
        },
        {
          type: "code",
          lang: "bash",
          filename: "kubectl-basics.sh",
          code: `# Apply (create or update) — declarative, preferred
kubectl apply -f deployment.yaml
kubectl apply -f ./k8s/          # apply all YAML files in a directory
kubectl apply -k ./overlays/prod # apply a Kustomize overlay

# Get resources
kubectl get pods
kubectl get pods,services,deployments   # multiple types at once
kubectl get all                          # everything in current namespace
kubectl get pods -n kube-system          # specific namespace
kubectl get pods -A                      # all namespaces

# Detailed view
kubectl get pods -o wide         # add IP, node
kubectl get pods -o yaml         # full YAML output
kubectl get pods -o json         # JSON output
kubectl get pods -o jsonpath='{.items[*].metadata.name}'  # custom query

# Describe (full details + events — great for debugging)
kubectl describe pod my-pod
kubectl describe node my-node
kubectl describe deployment my-deployment

# Delete
kubectl delete pod my-pod
kubectl delete -f deployment.yaml      # delete what was applied
kubectl delete pod -l app=fastapi-app  # delete by label`
        },
        {
          type: "heading",
          text: "Debugging Commands",
          level: 2
        },
        {
          type: "code",
          lang: "bash",
          filename: "kubectl-debug.sh",
          code: `# Logs
kubectl logs my-pod                        # current logs
kubectl logs my-pod --previous             # previous crashed container's logs
kubectl logs my-pod -f                     # follow/stream
kubectl logs my-pod --tail=100             # last 100 lines
kubectl logs my-pod -c sidecar-container   # specific container in pod
kubectl logs -l app=fastapi-app            # logs from all matching pods

# Execute commands in a container
kubectl exec -it my-pod -- /bin/bash
kubectl exec -it my-pod -- python -c "import redis; r=redis.Redis('redis'); print(r.ping())"

# Copy files
kubectl cp my-pod:/app/logfile.txt ./logfile.txt
kubectl cp ./config.json my-pod:/etc/app/config.json

# Port-forward for local testing
kubectl port-forward pod/my-pod 8080:8000
kubectl port-forward svc/my-svc 8080:80
kubectl port-forward deployment/my-deploy 8080:8000

# Run a one-off debug pod
kubectl run debug --image=busybox:1.36 -it --rm -- /bin/sh
kubectl run debug --image=curlimages/curl -it --rm -- sh`
        },
        {
          type: "heading",
          text: "Rollout and History",
          level: 2
        },
        {
          type: "code",
          lang: "bash",
          filename: "kubectl-rollout.sh",
          code: `# Check rollout status
kubectl rollout status deployment/my-deployment

# View history
kubectl rollout history deployment/my-deployment
kubectl rollout history deployment/my-deployment --revision=3

# Undo rollout
kubectl rollout undo deployment/my-deployment
kubectl rollout undo deployment/my-deployment --to-revision=2

# Restart all pods in a deployment (e.g. to pick up new ConfigMap)
kubectl rollout restart deployment/my-deployment`
        },
        {
          type: "heading",
          text: "Resource Management and Monitoring",
          level: 2
        },
        {
          type: "code",
          lang: "bash",
          filename: "kubectl-resources.sh",
          code: `# Resource usage (requires metrics-server)
kubectl top pods
kubectl top pods -n production
kubectl top nodes

# Edit a live resource (opens in $EDITOR — avoid in production, use apply)
kubectl edit deployment my-deployment

# Patch a resource inline
kubectl patch deployment my-deployment -p '{"spec":{"replicas":5}}'

# Label management
kubectl label pod my-pod version=v2
kubectl label pod my-pod version-    # remove label
kubectl get pods -l app=fastapi-app  # filter by label
kubectl get pods -l "app in (fastapi-app, nginx)"  # IN selector`
        },
        {
          type: "heading",
          text: "Context and Namespace Switching",
          level: 2
        },
        {
          type: "code",
          lang: "bash",
          filename: "kubectl-context.sh",
          code: `# List all configured clusters/contexts
kubectl config get-contexts

# Switch context (switch cluster)
kubectl config use-context gke_myproject_us-central1_prod-cluster

# Set default namespace for current context
kubectl config set-context --current --namespace=production

# Check current context
kubectl config current-context

# Install kubectx/kubens for fast switching
# brew install kubectx
kubectx prod-cluster       # switch cluster
kubens production          # switch namespace`
        },
        {
          type: "callout",
          variant: "tip",
          title: "Aliases Save Thousands of Keystrokes",
          text: "Add to your <code>~/.zshrc</code>: <code>alias k=kubectl</code> and <code>alias kgp='kubectl get pods'</code>. Enable kubectl shell completion: <code>source &lt;(kubectl completion zsh)</code>. Install <code>k9s</code> for a terminal UI that makes navigating cluster state dramatically faster."
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "probes",
      title: "Health Probes — Liveness, Readiness, Startup",
      readTime: "10 min",
      content: [
        {
          type: "text",
          text: "Kubernetes uses <strong>probes</strong> to check container health. Probes are the foundation of self-healing and zero-downtime deployments. Configure them wrong and you'll get unnecessary restarts or traffic sent to dead containers. Get them right and Kubernetes handles failures transparently."
        },
        {
          type: "comparison",
          headers: ["Probe", "Question It Answers", "On Failure"],
          rows: [
            ["Liveness", "Is this container still running correctly?", "Restart the container"],
            ["Readiness", "Is this container ready to receive traffic?", "Remove from Service Endpoints (no restart)"],
            ["Startup", "Has this container finished starting up?", "Restart (disables other probes until passing)"],
          ]
        },
        {
          type: "heading",
          text: "Probe Mechanisms",
          level: 2
        },
        {
          type: "list",
          items: [
            "<strong>httpGet</strong> — HTTP request to a path/port. Success = 2xx or 3xx response. Most common for web servers.",
            "<strong>tcpSocket</strong> — TCP connection check. Success = port is open. Good for non-HTTP services (databases, message queues).",
            "<strong>exec</strong> — Run a command inside the container. Success = exit code 0. Most flexible but adds process overhead.",
            "<strong>grpc</strong> — gRPC health check (Kubernetes 1.24+). Uses the gRPC Health Checking Protocol."
          ]
        },
        {
          type: "heading",
          text: "Liveness Probe — Detect Deadlocks",
          level: 2
        },
        {
          type: "text",
          text: "Liveness probes answer: <em>\"Is this container alive?\"</em> A container can be running but stuck in a deadlock, out of memory, or in an infinite loop. The liveness probe restarts it when this happens."
        },
        {
          type: "code",
          lang: "yaml",
          filename: "liveness-probe.yaml",
          code: `spec:
  containers:
  - name: app
    image: myorg/fastapi-app:2.1.0
    livenessProbe:
      httpGet:
        path: /health/live    # lightweight endpoint, no DB checks
        port: 8000
      initialDelaySeconds: 15  # wait 15s before first check (app startup time)
      periodSeconds: 20         # check every 20s
      timeoutSeconds: 5         # fail if no response within 5s
      failureThreshold: 3       # restart after 3 consecutive failures
      successThreshold: 1       # 1 success resets the failure count`
        },
        {
          type: "callout",
          variant: "gotcha",
          title: "Liveness Probe Endpoint Must Be Lightweight",
          text: "Your <code>/health/live</code> endpoint should only check if the process is responsive — NOT check database connectivity. If your DB goes down, a liveness probe that checks DB connectivity will restart all your Pods in a cascade, making a bad situation worse. Use the liveness probe only to detect truly stuck/deadlocked processes."
        },
        {
          type: "heading",
          text: "Readiness Probe — Control Traffic Routing",
          level: 2
        },
        {
          type: "text",
          text: "Readiness probes answer: <em>\"Should this Pod receive traffic right now?\"</em> When a readiness probe fails, Kubernetes removes the Pod from the Service's Endpoints — but does NOT restart the container. This is the right probe to check database connectivity, cache warmup, or model loading."
        },
        {
          type: "code",
          lang: "yaml",
          filename: "readiness-probe.yaml",
          code: `spec:
  containers:
  - name: app
    image: myorg/fastapi-app:2.1.0
    readinessProbe:
      httpGet:
        path: /health/ready   # checks DB connection, cache status, etc.
        port: 8000
      initialDelaySeconds: 5
      periodSeconds: 10
      failureThreshold: 3
      successThreshold: 1     # must pass once to re-enter rotation`
        },
        {
          type: "heading",
          text: "Startup Probe — Handle Slow-Starting Containers",
          level: 2
        },
        {
          type: "text",
          text: "For containers with long initialization (loading ML models, warming caches, running migrations), the startup probe buys extra time. While the startup probe is active, liveness and readiness probes are disabled. Once startup succeeds, normal probes kick in."
        },
        {
          type: "code",
          lang: "yaml",
          filename: "startup-probe.yaml",
          code: `spec:
  containers:
  - name: model-server
    image: myorg/llm-server:1.0.0  # loads a 7B parameter model on startup
    startupProbe:
      httpGet:
        path: /health/startup
        port: 8080
      failureThreshold: 30   # 30 * 10s = 5 minutes allowed for startup
      periodSeconds: 10
    livenessProbe:
      httpGet:
        path: /health/live
        port: 8080
      periodSeconds: 20
    readinessProbe:
      httpGet:
        path: /health/ready
        port: 8080
      periodSeconds: 10`
        },
        {
          type: "heading",
          text: "Implementing Health Endpoints in FastAPI",
          level: 2
        },
        {
          type: "code",
          lang: "python",
          filename: "main.py",
          code: `from fastapi import FastAPI, HTTPException
from contextlib import asynccontextmanager
import asyncpg
import redis.asyncio as redis

app = FastAPI()
db_pool = None
cache = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global db_pool, cache
    db_pool = await asyncpg.create_pool(DATABASE_URL, min_size=2, max_size=10)
    cache = await redis.from_url(REDIS_URL)
    yield
    await db_pool.close()
    await cache.close()

# Liveness: just return 200 — proves the process is responsive
@app.get("/health/live")
async def liveness():
    return {"status": "alive"}

# Readiness: check all dependencies
@app.get("/health/ready")
async def readiness():
    errors = []
    try:
        async with db_pool.acquire() as conn:
            await conn.fetchval("SELECT 1")
    except Exception as e:
        errors.append(f"db: {e}")

    try:
        await cache.ping()
    except Exception as e:
        errors.append(f"cache: {e}")

    if errors:
        raise HTTPException(status_code=503, detail={"errors": errors})
    return {"status": "ready"}`
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "resources",
      title: "Resource Requests, Limits, and QoS Classes",
      readTime: "9 min",
      content: [
        {
          type: "text",
          text: "Kubernetes runs multiple Pods on the same nodes. Without resource management, a single misbehaving Pod can starve all others of CPU and memory. <strong>Requests and limits</strong> are how you tell Kubernetes how much resource a container expects and how much it's allowed to use."
        },
        {
          type: "comparison",
          headers: ["", "requests", "limits"],
          rows: [
            ["Purpose", "Reserved capacity for scheduling", "Hard ceiling on usage"],
            ["Scheduling", "Scheduler uses this to find a node with enough free capacity", "Not used for scheduling"],
            ["CPU enforcement", "Container may burst above requests if node is free", "Container is throttled at the limit (never killed)"],
            ["Memory enforcement", "Container may use more if available", "Container is OOMKilled if it exceeds the limit"],
          ]
        },
        {
          type: "heading",
          text: "CPU and Memory Units",
          level: 2
        },
        {
          type: "list",
          items: [
            "<strong>CPU:</strong> <code>1</code> = 1 physical/virtual core. <code>500m</code> = 500 millicores = 0.5 core. Most web services: 100m–500m requests, 1–2 limits.",
            "<strong>Memory:</strong> <code>256Mi</code> = 256 mebibytes. <code>1Gi</code> = 1 gibibyte. <code>512M</code> = 512 megabytes (note: Mi vs M). Use <code>Mi</code> and <code>Gi</code> to avoid ambiguity.",
            "<strong>Ephemeral storage:</strong> disk space used by the container's writable layer and emptyDir volumes. <code>1Gi</code> etc. Pod is evicted if it exceeds the limit."
          ]
        },
        {
          type: "code",
          lang: "yaml",
          filename: "resources.yaml",
          code: `spec:
  containers:
  - name: fastapi-app
    image: myorg/fastapi-app:2.1.0
    resources:
      requests:
        cpu: "250m"      # reserve 0.25 cores for scheduling
        memory: "256Mi"  # reserve 256 MiB for scheduling
      limits:
        cpu: "1"         # throttle at 1 core (never OOMKilled for CPU)
        memory: "512Mi"  # OOMKill if exceeds 512 MiB

  - name: llm-inference
    image: myorg/llm-server:1.0.0
    resources:
      requests:
        cpu: "2"
        memory: "8Gi"    # large model in memory
      limits:
        cpu: "4"
        memory: "16Gi"`
        },
        {
          type: "heading",
          text: "QoS Classes — What Happens Under Pressure",
          level: 2
        },
        {
          type: "text",
          text: "Kubernetes assigns a <strong>Quality of Service (QoS) class</strong> to each Pod based on its resource configuration. QoS determines eviction priority when a node runs out of memory."
        },
        {
          type: "comparison",
          headers: ["QoS Class", "Condition", "Eviction Priority", "Use For"],
          rows: [
            ["Guaranteed", "requests == limits for all containers", "Last to be evicted", "Critical production workloads"],
            ["Burstable", "requests < limits (or only one set)", "Evicted after BestEffort", "Most production workloads"],
            ["BestEffort", "No requests or limits set", "First to be evicted", "Never in production"],
          ]
        },
        {
          type: "callout",
          variant: "tip",
          title: "Always Set Requests and Limits in Production",
          text: "Never deploy to production without resource requests. Without requests: (1) the scheduler doesn't know how to place Pods, leading to unbalanced nodes; (2) your Pods are BestEffort and will be evicted first when nodes are under memory pressure. For critical services, set requests == limits (Guaranteed QoS) to prevent throttling surprises."
        },
        {
          type: "heading",
          text: "LimitRange — Default Limits per Namespace",
          level: 2
        },
        {
          type: "code",
          lang: "yaml",
          filename: "limitrange.yaml",
          code: `apiVersion: v1
kind: LimitRange
metadata:
  name: default-limits
  namespace: production
spec:
  limits:
  - type: Container
    default:              # applied if container has no limits set
      cpu: "500m"
      memory: "256Mi"
    defaultRequest:       # applied if container has no requests set
      cpu: "100m"
      memory: "128Mi"
    max:                  # hard maximum per container
      cpu: "4"
      memory: "4Gi"`
        },
        {
          type: "callout",
          variant: "info",
          title: "ResourceQuota — Limit Total Resource Usage per Namespace",
          text: "Use <code>ResourceQuota</code> to cap total CPU/memory across all Pods in a namespace. Useful for multi-tenant clusters: each team gets a namespace with a quota, preventing one team from using all cluster resources."
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "storage",
      title: "Persistent Volumes — Storage for Stateful Workloads",
      readTime: "10 min",
      content: [
        {
          type: "text",
          text: "Container filesystems are ephemeral — when a container restarts, all its writes are lost. For databases, logs, and ML model checkpoints, you need <strong>persistent storage</strong> that outlives containers. Kubernetes has three objects for this: PersistentVolume (PV), PersistentVolumeClaim (PVC), and StorageClass."
        },
        {
          type: "diagram",
          code: `  Developer                    Kubernetes                    Cloud Provider
      │                             │                                │
      │  PersistentVolumeClaim      │                                │
      │  (I need 50Gi SSD storage)  │                                │
      │────────────────────────────►│                                │
      │                             │  StorageClass: gke-ssd         │
      │                             │  (how to provision it)         │
      │                             │────────────────────────────────►
      │                             │                                │ create 50Gi
      │                             │                                │ persistent disk
      │                             │◄────────────────────────────────
      │                             │  PersistentVolume created      │
      │                             │  PVC bound to PV               │
      │                             │                                │
      │  Pod mounts the PVC         │                                │
      │  (reads/writes survive      │                                │
      │   container restarts)       │                                │`
        },
        {
          type: "heading",
          text: "StorageClass — How Storage Gets Provisioned",
          level: 2
        },
        {
          type: "text",
          text: "A <strong>StorageClass</strong> describes the type of storage available: SSD vs HDD, local vs network, single-zone vs multi-zone. Cloud providers come with pre-configured StorageClasses. You reference a StorageClass in a PVC, and Kubernetes automatically provisions the underlying storage."
        },
        {
          type: "code",
          lang: "bash",
          filename: "storageclass.sh",
          code: `# See available StorageClasses in your cluster
kubectl get storageclass

# On GKE you might see:
# standard (default) — balanced persistent disk
# premium-rwo         — SSD persistent disk
# standard-rwx        — multi-writer (Cloud Filestore / NFS)`
        },
        {
          type: "heading",
          text: "PersistentVolumeClaim — Request Storage",
          level: 2
        },
        {
          type: "code",
          lang: "yaml",
          filename: "pvc.yaml",
          code: `apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-data
  namespace: production
spec:
  accessModes:
  - ReadWriteOnce      # RWO: one node at a time (most block storage)
                       # ROX: many nodes, read-only
                       # RWX: many nodes, read-write (needs NFS/Filestore)
  storageClassName: premium-rwo   # request SSD storage
  resources:
    requests:
      storage: 50Gi`
        },
        {
          type: "heading",
          text: "Mounting a PVC in a Pod",
          level: 2
        },
        {
          type: "code",
          lang: "yaml",
          filename: "pod-with-pvc.yaml",
          code: `apiVersion: v1
kind: Pod
metadata:
  name: postgres
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
    volumeMounts:
    - name: data
      mountPath: /var/lib/postgresql/data
  volumes:
  - name: data
    persistentVolumeClaim:
      claimName: postgres-data   # reference the PVC`
        },
        {
          type: "callout",
          variant: "info",
          title: "StatefulSets Auto-Create PVCs",
          text: "For databases and other stateful workloads, use a <strong>StatefulSet</strong> instead of a Deployment + PVC. StatefulSets automatically create one PVC per replica via <code>volumeClaimTemplates</code>, give each Pod a stable DNS name (<code>postgres-0</code>, <code>postgres-1</code>), and scale Pods in order. The PVCs persist even when Pods are deleted, so your data survives."
        },
        {
          type: "code",
          lang: "yaml",
          filename: "statefulset-postgres.yaml",
          code: `apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
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
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
  # Auto-creates a PVC for each Pod: data-postgres-0, data-postgres-1...
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: premium-rwo
      resources:
        requests:
          storage: 50Gi`
        }
      ]
    },

  ]; // end m.lessons
})();
