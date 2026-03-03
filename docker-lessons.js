// Patches the Docker module (m1) with full tutorial lesson content.
// Loaded after curriculum.js and docker-examples.js.
// COMPLETE REWRITE — 10 lessons building from zero to Staff MLE depth.
(function patchDockerLessons() {
  const m = CURRICULUM.phases[0].modules[0];

  m.lessons = [

    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 1: The Problem Docker Solves
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "the-problem-docker-solves",
      title: "The Problem Docker Solves",
      readTime: "12 min",
      content: [
        {
          type: "text",
          text: "Let me tell you a story that every ML engineer has lived through at least once."
        },
        {
          type: "text",
          text: "You've spent two weeks training a sentiment classifier. It works beautifully on your MacBook — 94% accuracy, sub-50ms inference. You hand the model weights and the inference script to the platform team so they can deploy it. An hour later, your Slack lights up: <em>\"It doesn't work.\"</em>"
        },
        {
          type: "text",
          text: "You jump on a call. Their server runs Ubuntu 22.04. You developed on macOS with Python 3.11, but their server has Python 3.9. Your code uses <code>match</code> statements (3.10+). So they install Python 3.11 — but now NumPy can't find the right <code>libopenblas</code>. They fix that, but then PyTorch complains about CUDA 11.8 vs 12.1. Three days later, after dozens of back-and-forth messages, it finally runs — but only after they've polluted their production server with a fragile tower of pinned system libraries that will break the next time someone deploys a different model."
        },
        {
          type: "text",
          text: "This is <strong>dependency hell</strong>. And it's the world Docker was built to eliminate."
        },
        {
          type: "heading",
          text: "The Evolution: Bare Metal → VMs → Containers",
          level: 2
        },
        {
          type: "text",
          text: "To understand why Docker exists, you need to understand the three eras of deploying software — and the specific pain that drove each transition."
        },
        {
          type: "heading",
          text: "Era 1: Bare Metal (The Wild West)",
          level: 3
        },
        {
          type: "text",
          text: "In the beginning, you had physical servers. One application per server. If your ML training job needed 64GB of RAM and 8 GPUs, you bought a server with 64GB of RAM and 8 GPUs. If your API server needed very different libraries, you bought another server. Hardware utilization was typically 10-15% — most of those expensive machines sat idle most of the time. Provisioning a new server took weeks (ordering hardware, racking it, installing the OS, configuring networking). And every server was a unique snowflake with its own configuration drift."
        },
        {
          type: "heading",
          text: "Era 2: Virtual Machines (Better, But Heavy)",
          level: 3
        },
        {
          type: "text",
          text: "VMware and later cloud providers (EC2 launched in 2006) solved the hardware problem. A hypervisor could carve one physical machine into many virtual machines, each running its own full operating system. Now you could run multiple applications on the same hardware, provision new environments in minutes instead of weeks, and snapshot entire machines for backup."
        },
        {
          type: "text",
          text: "But VMs had their own pain. Each VM ran a complete OS kernel — that's 1-2GB of overhead before your application even starts. Booting a VM took 30-60 seconds. VM images were 10-20GB, making them slow to transfer. And you still had the dependency problem <em>inside</em> each VM. Running 50 microservices meant 50 VMs, each wasting gigabytes on duplicate OS components."
        },
        {
          type: "heading",
          text: "Era 3: Containers (The Insight)",
          level: 3
        },
        {
          type: "text",
          text: "The key insight behind containers is deceptively simple: <strong>you don't need a separate OS kernel for each application</strong>. Applications don't actually use most of the kernel differently — they just need their own isolated view of the filesystem, processes, and network. What if you could give each application its own isolated environment while sharing the host's kernel?"
        },
        {
          type: "text",
          text: "That's exactly what containers do. A container packages your application code, its runtime (Python 3.11), its libraries (NumPy, PyTorch), and its system dependencies (libopenblas, CUDA toolkit) into a single unit — but it shares the host's Linux kernel. The result: containers start in milliseconds, use megabytes of overhead instead of gigabytes, and the image that runs on your laptop is <em>byte-for-byte identical</em> to the one that runs in production."
        },
        {
          type: "diagram",
          title: "The Three Eras of Deployment",
          content: `  BARE METAL              VIRTUAL MACHINES           CONTAINERS
  ┌─────────────┐         ┌──────────────┐           ┌──────────────┐
  │   App A      │         │ App A│ App B │           │ App A│ App B │
  │   + all deps │         │ Libs │ Libs  │           │ Libs │ Libs  │
  ├─────────────┤         ├──────┼───────┤           └──────┴───────┘
  │             │         │GuestOS│GuestOS│           ┌──────────────┐
  │   Host OS    │         │ 2 GB │ 2 GB  │           │Container Rntm│
  │             │         ├──────┴───────┤           ├──────────────┤
  ├─────────────┤         │  Hypervisor   │           │  Host Kernel  │
  │  Hardware    │         ├──────────────┤           ├──────────────┤
  └─────────────┘         │  Host OS      │           │  Hardware     │
  1 app per server        ├──────────────┤           └──────────────┘
  10-15% utilization      │  Hardware     │           Millisecond start
  Weeks to provision      └──────────────┘           MB of overhead
                          Minutes to start           Identical everywhere
                          GB of overhead`
        },
        {
          type: "heading",
          text: "The Apartment Building Analogy",
          level: 2
        },
        {
          type: "text",
          text: "Here's the analogy that makes this click. <strong>Virtual machines are like separate houses.</strong> Each house has its own foundation, plumbing, electrical wiring, heating system, and roof. You get complete isolation — your neighbor's plumbing problems never affect you. But building each house is expensive, and every house duplicates the same infrastructure."
        },
        {
          type: "text",
          text: "<strong>Containers are like apartments in a building.</strong> The building has shared plumbing, shared electrical, shared foundation (the kernel). Each apartment has its own locked door, its own interior layout, its own furniture (your application and dependencies). You can't see into your neighbor's apartment, and they can't see into yours. But you're all sharing the building's infrastructure, which means each apartment is cheaper, faster to set up, and more efficient."
        },
        {
          type: "text",
          text: "The trade-off is real: if the building's foundation has a crack (a kernel vulnerability), it affects every apartment. VMs, with their separate foundations, don't have that risk. We'll talk about container security in Lesson 7."
        },
        {
          type: "heading",
          text: "What Docker Actually Is",
          level: 2
        },
        {
          type: "text",
          text: "Docker didn't invent containers. Linux has had the building blocks (namespaces, cgroups) since 2008. Google was running everything in containers internally years before Docker existed. What Docker did was make containers <em>usable</em>. Before Docker, creating a container required deep Linux kernel knowledge and dozens of manual commands. Docker gave you a simple CLI (<code>docker run</code>), a packaging format (Dockerfile), and a distribution system (Docker Hub). It turned a systems-engineering task into a developer tool."
        },
        {
          type: "text",
          text: "When you hear \"Docker,\" you're actually hearing about several things: the <strong>Docker CLI</strong> (the command-line tool), the <strong>Docker Engine</strong> (the daemon that manages containers), the <strong>Docker image format</strong> (now an open standard called OCI), and <strong>Docker Hub</strong> (the default image registry). The image format and runtime are now open standards — Docker the company doesn't own them. That's why Kubernetes can run containers without Docker."
        },
        {
          type: "callout",
          variant: "info",
          title: "Why This Matters for ML Engineers",
          text: "In ML, the dependency problem is worse than in typical web development. You're dealing with CUDA versions, cuDNN, Python versions, C extensions in NumPy/SciPy, model framework versions (PyTorch 2.0 vs 2.1), and hardware-specific optimizations. A Docker image freezes ALL of this. The exact image you tested with is the exact image that runs in production. No more \"works on my machine.\""
        },
        {
          type: "heading",
          text: "What You Should Understand Now",
          level: 2
        },
        {
          type: "list",
          items: [
            "Docker exists because shipping code alone isn't enough — you need to ship the entire runtime environment",
            "Containers share the host kernel, which makes them fast and lightweight compared to VMs",
            "The trade-off: containers have weaker isolation than VMs (shared kernel), but vastly better resource efficiency",
            "Docker didn't invent containers — it made them accessible through good tooling and standardized formats",
            "A container is fundamentally just an isolated process. If you hold onto that mental model, everything else will make sense."
          ]
        },
        {
          type: "text",
          text: "Now that you understand <em>why</em> containers exist, let's look at <em>how</em> they work. In the next lesson, we'll trace exactly what happens when you type <code>docker run</code> — from the CLI all the way down to the Linux kernel."
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 2: Docker Architecture
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "docker-architecture",
      title: "Docker Architecture — What Actually Runs When You Type 'docker run'",
      readTime: "15 min",
      content: [
        {
          type: "text",
          text: "You type <code>docker run python:3.12 python -c \"print('hello')\"</code> and a second later you see <code>hello</code>. It looks simple. But between your keypress and that output, a remarkable chain of events unfolds — involving a REST API, a daemon process, two separate container runtimes, and several Linux kernel features working in concert. Understanding this chain is the difference between being a Docker user and being someone who can debug Docker when things go wrong."
        },
        {
          type: "heading",
          text: "The Client-Server Architecture",
          level: 2
        },
        {
          type: "text",
          text: "Docker is not a single program. It's a client-server system with multiple components, and understanding the separation matters."
        },
        {
          type: "diagram",
          title: "Docker Architecture — Full Stack",
          content: `  ┌─────────────┐      REST API       ┌──────────────────────────────────┐
  │             │    (unix socket)     │          dockerd                 │
  │  docker CLI │ ──────────────────→  │      (Docker daemon)             │
  │             │  /var/run/docker.sock│                                  │
  └─────────────┘                      │  • image management              │
                                       │  • network management            │
        You type                       │  • volume management             │
    "docker run ..."                   │  • build orchestration           │
                                       │  • REST API server               │
                                       └──────────┬───────────────────────┘
                                                  │ gRPC
                                       ┌──────────▼───────────────────────┐
                                       │        containerd                 │
                                       │   (container lifecycle manager)   │
                                       │                                  │
                                       │  • pulls/pushes images            │
                                       │  • manages container lifecycle    │
                                       │  • manages snapshots (layers)     │
                                       └──────────┬───────────────────────┘
                                                  │ exec
                                       ┌──────────▼───────────────────────┐
                                       │          runc                     │
                                       │   (OCI runtime — the actual      │
                                       │    container spawner)             │
                                       │                                  │
                                       │  • creates namespaces             │
                                       │  • sets up cgroups                │
                                       │  • calls pivot_root               │
                                       │  • execs the container process    │
                                       └──────────────────────────────────┘`
        },
        {
          type: "text",
          text: "Let's walk through each component."
        },
        {
          type: "text",
          text: "<strong>docker CLI</strong> — This is what you interact with. It's a thin client that translates your commands into REST API calls. When you type <code>docker run nginx</code>, the CLI sends a POST request to the Docker daemon. The CLI and daemon don't have to be on the same machine — you can point your CLI at a remote daemon. This is how Docker contexts and remote Docker hosts work."
        },
        {
          type: "text",
          text: "<strong>dockerd (Docker daemon)</strong> — The brain of Docker. It listens on a Unix socket (<code>/var/run/docker.sock</code>) for API requests. It manages images, containers, networks, and volumes. It orchestrates builds. It's a long-running background process. When people say \"Docker is running,\" they mean this daemon is running."
        },
        {
          type: "text",
          text: "<strong>containerd</strong> — A lower-level container runtime that manages the complete container lifecycle: pulling images, creating containers, starting/stopping them, managing filesystem snapshots. Docker delegates all container operations to containerd. Here's the important part: <strong>Kubernetes also uses containerd directly</strong>, skipping dockerd entirely. That's why Kubernetes \"dropped Docker\" in 2021 — it didn't need the dockerd layer, just containerd."
        },
        {
          type: "text",
          text: "<strong>runc</strong> — The lowest level. This is the program that actually talks to the Linux kernel to create a container. It sets up namespaces, configures cgroups, mounts the filesystem, and execs your process. runc starts the container and then exits — it doesn't stay running. containerd keeps track of the running container after runc is done."
        },
        {
          type: "callout",
          variant: "info",
          title: "Why So Many Layers?",
          text: "This separation exists for good reason. containerd and runc are open standards (OCI — Open Container Initiative). Any tool can use them. Kubernetes uses containerd. Podman uses a different OCI runtime (crun). The layered design means you can swap components without rebuilding everything. It also means that if dockerd crashes, your running containers (managed by containerd) keep running."
        },
        {
          type: "heading",
          text: "Linux Namespaces — The Isolation Mechanism",
          level: 2
        },
        {
          type: "text",
          text: "When runc creates a container, the first thing it does is set up <strong>namespaces</strong>. A namespace makes a process think it has its own private instance of a global resource. Docker uses six types of namespaces, and each one isolates something specific."
        },
        {
          type: "diagram",
          title: "Linux Namespaces — What Each One Isolates",
          content: `  ┌────────────┬──────────────────────────────────────────────────────┐
  │ Namespace  │ What It Isolates                                    │
  ├────────────┼──────────────────────────────────────────────────────┤
  │ pid        │ Process IDs. Inside the container, your process     │
  │            │ is PID 1. It can't see host processes.              │
  ├────────────┼──────────────────────────────────────────────────────┤
  │ net        │ Network stack. Container gets its own IP address,   │
  │            │ routing table, port space. Port 8080 inside the     │
  │            │ container is different from port 8080 on the host.  │
  ├────────────┼──────────────────────────────────────────────────────┤
  │ mnt        │ Filesystem mounts. Container sees its own root      │
  │            │ filesystem. It can't see host files (unless you     │
  │            │ explicitly mount them).                              │
  ├────────────┼──────────────────────────────────────────────────────┤
  │ uts        │ Hostname. Container can have its own hostname,      │
  │            │ independent of the host machine.                     │
  ├────────────┼──────────────────────────────────────────────────────┤
  │ ipc        │ Inter-process communication. Shared memory and      │
  │            │ semaphores are isolated per container.               │
  ├────────────┼──────────────────────────────────────────────────────┤
  │ user       │ User IDs. Root (UID 0) inside the container can     │
  │            │ map to a non-root user on the host. This is key     │
  │            │ for security (covered in Lesson 7).                  │
  └────────────┴──────────────────────────────────────────────────────┘`
        },
        {
          type: "code",
          lang: "bash",
          title: "Seeing Namespaces in Action",
          code: `# Start a container in the background
docker run -d --name ns-demo nginx:alpine

# See the PID namespace: inside the container, nginx is PID 1
docker exec ns-demo ps aux
# PID 1 = nginx master process (inside the container)

# On the host, that same process has a DIFFERENT PID
docker inspect --format '{{.State.Pid}}' ns-demo
# e.g., 48291 — that's the host PID for the container's PID 1

# See the network namespace: container has its own IP
docker exec ns-demo hostname -i
# e.g., 172.17.0.2 — this is the container's virtual IP

# See the mount namespace: container has its own filesystem
docker exec ns-demo ls /
# Shows the container's root filesystem, not your host's

# Clean up
docker rm -f ns-demo`
        },
        {
          type: "heading",
          text: "cgroups v2 — The Resource Limits",
          level: 2
        },
        {
          type: "text",
          text: "Namespaces handle <em>isolation</em> (what a process can see). <strong>cgroups (control groups)</strong> handle <em>resource limits</em> (how much a process can use). Without cgroups, a container could consume all the host's CPU and memory, starving other containers. cgroups let you say: \"this container gets at most 2 CPU cores and 512MB of RAM.\""
        },
        {
          type: "text",
          text: "The kernel enforces these limits. If a container tries to allocate more memory than its cgroup allows, the kernel's OOM (Out Of Memory) killer terminates the process. This is why you sometimes see containers with exit code 137 — they got OOM-killed. We'll cover how to set these limits properly in Lesson 5."
        },
        {
          type: "code",
          lang: "bash",
          title: "cgroups in Action",
          code: `# Run a container with resource limits
docker run -d --name cg-demo \\
  --memory 256m \\
  --cpus 0.5 \\
  nginx:alpine

# See the cgroup limits the kernel is enforcing
docker inspect cg-demo --format '{{.HostConfig.Memory}}'
# 268435456 (256 MB in bytes)

# See real-time resource usage
docker stats cg-demo --no-stream
# CONTAINER   CPU %   MEM USAGE / LIMIT   MEM %
# cg-demo     0.00%   4.5MiB / 256MiB     1.76%

# What happens when you exceed memory? The container gets OOM-killed.
# Exit code 137 = 128 + 9 (SIGKILL from the OOM killer)

docker rm -f cg-demo`
        },
        {
          type: "heading",
          text: "OverlayFS — The Copy-on-Write Filesystem",
          level: 2
        },
        {
          type: "text",
          text: "The third kernel feature Docker relies on is <strong>OverlayFS</strong>, a union filesystem that makes Docker's layer model possible. Remember from Lesson 1 that images are stacks of read-only layers. When you start a container, Docker adds a thin <strong>writable layer</strong> on top of the image layers. This is the copy-on-write (CoW) mechanism."
        },
        {
          type: "diagram",
          title: "OverlayFS: How Container Writes Work",
          content: `  CONTAINER (running)
  ┌──────────────────────────────────────────────────┐
  │  upperdir (writable layer — container changes)    │  ← New files, modified
  │  ┌──────────────────────────────────────────┐    │    files, deleted files
  │  │ modified: /app/logs/app.log              │    │    go here
  │  │ new file: /tmp/cache.db                  │    │
  │  │ deleted:  /etc/nginx/conf.d/default.conf │    │
  │  └──────────────────────────────────────────┘    │
  ├──────────────────────────────────────────────────┤
  │  lowerdir (read-only image layers — never change) │
  │  ┌──────────────────────────────────────────┐    │
  │  │ Layer 3: COPY app/ /app/                  │    │
  │  │ Layer 2: RUN pip install -r requirements  │    │
  │  │ Layer 1: python:3.12-slim base image      │    │
  │  └──────────────────────────────────────────┘    │
  └──────────────────────────────────────────────────┘

  READ a file:  kernel checks upperdir first, then lowerdir top-to-bottom
  WRITE a file: kernel copies it from lowerdir → upperdir, then modifies
                (this is "copy-on-write" — the original layer is untouched)
  DELETE a file: kernel creates a "whiteout" marker in upperdir`
        },
        {
          type: "text",
          text: "This design is why 100 containers from the same image don't use 100x the disk space. They all share the same read-only lower layers. Each container only uses extra disk for its own writable layer — which is usually tiny (log files, temp files, pid files). It's also why <code>docker commit</code> can snapshot a running container: it just saves the upperdir as a new layer."
        },
        {
          type: "heading",
          text: "Docker on macOS: The Hidden VM",
          level: 2
        },
        {
          type: "text",
          text: "If you're on a Mac (and most ML engineers develop on Macs), there's an important detail: <strong>Docker doesn't run natively on macOS</strong>. Containers require Linux kernel features (namespaces, cgroups). macOS has a completely different kernel (XNU/Darwin). So Docker Desktop runs a lightweight Linux VM behind the scenes using Apple's Virtualization framework."
        },
        {
          type: "diagram",
          title: "Docker on macOS vs Linux",
          content: `  macOS                                    Linux
  ┌──────────────────────────┐            ┌──────────────────────────┐
  │  docker CLI               │            │  docker CLI               │
  │         │                 │            │         │                 │
  │         ▼                 │            │         ▼                 │
  │  ┌────────────────────┐  │            │  ┌────────────────────┐  │
  │  │  Linux VM           │  │            │  │  dockerd            │  │
  │  │  ┌────────────────┐│  │            │  │  containerd         │  │
  │  │  │ dockerd        ││  │            │  │  runc               │  │
  │  │  │ containerd     ││  │            │  └────────────────────┘  │
  │  │  │ runc           ││  │            │         │                 │
  │  │  └────────────────┘│  │            │         ▼                 │
  │  │  Linux kernel       │  │            │  Linux kernel             │
  │  └────────────────────┘  │            │  (namespaces, cgroups)    │
  │  macOS kernel (XNU)      │            └──────────────────────────┘
  └──────────────────────────┘
  Extra VM layer = slower I/O             Direct kernel access = fast
  File sharing across OS boundary         Native filesystem`
        },
        {
          type: "text",
          text: "This is why Docker on macOS is slower than on Linux, especially for filesystem operations (bind mounts). The file sharing between macOS and the Linux VM is the bottleneck. Tools like VirtioFS (the default in modern Docker Desktop) have improved this significantly, but it's still not native speed. If your builds feel slow on macOS, this is often why."
        },
        {
          type: "callout",
          variant: "warning",
          title: "Production Containers Always Run on Linux",
          text: "No matter what OS you develop on, your containers will run on Linux in production (EKS, GKE, bare-metal servers). The macOS VM layer only exists for development. This is actually Docker's superpower — you develop on macOS, test on Linux (in the VM), and deploy to Linux servers. The container is the same everywhere."
        },
        {
          type: "heading",
          text: "The Complete 'docker run' Sequence",
          level: 2
        },
        {
          type: "text",
          text: "Now let's put it all together. When you type <code>docker run -p 8080:80 nginx:alpine</code>, here's the exact sequence:"
        },
        {
          type: "list",
          items: [
            "<strong>CLI → daemon:</strong> The docker CLI sends a POST to <code>/containers/create</code> on the Docker daemon's REST API via the Unix socket.",
            "<strong>Image check:</strong> dockerd checks if <code>nginx:alpine</code> exists locally. If not, it tells containerd to pull it from Docker Hub (downloading each layer as a compressed tar).",
            "<strong>Container creation:</strong> dockerd tells containerd to create a container. containerd sets up the OverlayFS (stacking image layers + writable layer) and prepares the container config.",
            "<strong>Container start:</strong> containerd spawns runc with the OCI container specification. runc creates new namespaces (pid, net, mnt, uts, ipc, user), configures cgroups for resource limits, sets up the network (creates a veth pair connecting to the docker0 bridge), calls <code>pivot_root</code> to switch the filesystem root, and finally <code>exec()</code>s the nginx process.",
            "<strong>runc exits:</strong> Once the container process is running, runc exits. The container process is now a child of containerd-shim (a thin process that keeps the container alive even if containerd restarts).",
            "<strong>Port mapping:</strong> dockerd sets up iptables rules to forward host port 8080 to the container's port 80."
          ]
        },
        {
          type: "heading",
          text: "What You Should Understand Now",
          level: 2
        },
        {
          type: "list",
          items: [
            "Docker is a client-server system: CLI → dockerd → containerd → runc",
            "Namespaces provide isolation (what a container can see), cgroups provide limits (how much it can use), OverlayFS provides the layered filesystem",
            "On macOS, everything runs inside a hidden Linux VM — that's the performance tax you pay for development convenience",
            "Kubernetes uses containerd directly, skipping Docker's daemon — that's what \"Kubernetes dropped Docker\" means",
            "runc is the program that actually creates containers by calling Linux kernel syscalls"
          ]
        },
        {
          type: "text",
          text: "Now that you understand the runtime architecture, let's look at the packaging side. In the next lesson, we'll explore Docker images — how they're built, how layers stack, and why image size is an engineering concern you can't ignore."
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 3: Images and Layers
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "images-and-layers",
      title: "Images and Layers — The Packaging Model",
      readTime: "12 min",
      content: [
        {
          type: "text",
          text: "You've just been asked to deploy three ML services that all use Python 3.12 and NumPy. If Docker stored each image as a single monolithic blob, you'd have three copies of Python and three copies of NumPy on disk and in transit. But Docker doesn't work that way. It uses a layered filesystem that shares common components automatically. Understanding this layer model is what separates people who write 2GB images from people who write 150MB images."
        },
        {
          type: "heading",
          text: "What IS a Docker Image?",
          level: 2
        },
        {
          type: "text",
          text: "A Docker image is a <strong>stack of read-only filesystem layers</strong>, plus some metadata (environment variables, the command to run, exposed ports). Each layer is a set of filesystem changes — files added, modified, or deleted. Layers stack on top of each other using OverlayFS (which we covered in Lesson 2), and the union of all layers forms the complete filesystem that a container sees."
        },
        {
          type: "text",
          text: "Every instruction in a Dockerfile that modifies the filesystem creates a new layer. <code>FROM</code> pulls in the base layers. <code>RUN</code>, <code>COPY</code>, and <code>ADD</code> each create a layer. Instructions that only set metadata (<code>ENV</code>, <code>EXPOSE</code>, <code>CMD</code>) do not create layers — they only modify the image config."
        },
        {
          type: "diagram",
          title: "How Layers Stack",
          content: `  Dockerfile                              Resulting Image Layers
  ─────────────────────                   ─────────────────────────────
  FROM python:3.12-slim              →    ┌────────────────────────────┐
                                          │ Layer 1: Debian slim base   │  45 MB
                                          │ Layer 2: Python 3.12 runtime│  25 MB
                                          ├────────────────────────────┤
  WORKDIR /app                       →    │ (metadata only, no layer)   │
                                          ├────────────────────────────┤
  COPY requirements.txt .            →    │ Layer 3: requirements.txt   │  < 1 KB
                                          ├────────────────────────────┤
  RUN pip install -r requirements.txt →   │ Layer 4: pip packages       │  80 MB
                                          ├────────────────────────────┤
  COPY . .                           →    │ Layer 5: application code   │  2 MB
                                          ├────────────────────────────┤
  CMD ["python", "main.py"]          →    │ (metadata only, no layer)   │
                                          └────────────────────────────┘
                                                         Total: ~152 MB

  Key: Every RUN, COPY, and ADD creates a new layer.
       ENV, WORKDIR, CMD, EXPOSE only modify config metadata.`
        },
        {
          type: "heading",
          text: "Layer Sharing — Why Layers Matter",
          level: 2
        },
        {
          type: "text",
          text: "Layers are <strong>content-addressable</strong>: each layer is identified by a SHA256 hash of its contents. If two images share the same base layer (same hash), Docker stores it only once. This has massive practical benefits."
        },
        {
          type: "code",
          lang: "bash",
          title: "Seeing Layer Sharing in Action",
          code: `# Pull two images that share the same base
docker pull python:3.12-slim
docker pull python:3.12-slim-bookworm

# Check how much disk space images actually use
docker system df
# TYPE          TOTAL   ACTIVE  SIZE     RECLAIMABLE
# Images        5       2       1.2GB    800MB (66%)
# Containers    0       0       0B       0B
# Volumes       3       1       200MB    150MB

# See the layers in an image
docker history python:3.12-slim
# IMAGE          CREATED BY                                      SIZE
# a1b2c3d4e5f6   CMD ["python3"]                                 0B
# <missing>      RUN /bin/sh -c set -eux; ...                    6.2MB
# <missing>      ENV PYTHON_VERSION=3.12.7                       0B
# <missing>      RUN apt-get update && apt-get install -y...     50MB

# Inspect the exact layer digests
docker inspect python:3.12-slim --format '{{range .RootFS.Layers}}{{println .}}{{end}}'
# sha256:1a2b3c...  (debian base)
# sha256:4d5e6f...  (python runtime)
# sha256:7g8h9i...  (pip setup)`
        },
        {
          type: "heading",
          text: "Layer Caching — Why Order Matters",
          level: 2
        },
        {
          type: "text",
          text: "This is the single most important thing to understand about Dockerfiles: <strong>Docker caches layers and reuses them if nothing has changed</strong>. But there's a catch — if any layer changes, <em>all subsequent layers are invalidated</em> and must be rebuilt."
        },
        {
          type: "text",
          text: "Think of it like a stack of pancakes. If you need to replace the third pancake, you have to remove everything above it, replace it, and re-stack everything on top. Docker's cache works the same way."
        },
        {
          type: "diagram",
          title: "Layer Cache Invalidation",
          content: `  BAD ORDER: Code changes invalidate pip install (slow rebuilds)
  ┌────────────────────────────────┐
  │ FROM python:3.12-slim          │  ✓ cached
  │ COPY . .                       │  ✗ INVALIDATED (code changed)
  │ RUN pip install -r req.txt     │  ✗ must rebuild (even though
  │ CMD ["python", "main.py"]      │     requirements didn't change!)
  └────────────────────────────────┘
  Build time: 2 minutes (pip install runs every time)

  GOOD ORDER: Code changes don't invalidate pip install
  ┌────────────────────────────────┐
  │ FROM python:3.12-slim          │  ✓ cached
  │ COPY requirements.txt .        │  ✓ cached (requirements unchanged)
  │ RUN pip install -r req.txt     │  ✓ cached (this layer is reused!)
  │ COPY . .                       │  ✗ rebuilt (but it's just a file copy)
  │ CMD ["python", "main.py"]      │
  └────────────────────────────────┘
  Build time: 5 seconds (pip install is cached)`
        },
        {
          type: "callout",
          variant: "warning",
          title: "The Golden Rule of Dockerfile Ordering",
          text: "Put things that change RARELY first (base image, system packages, dependency installation) and things that change FREQUENTLY last (your application code). This maximizes cache hits and minimizes rebuild time."
        },
        {
          type: "heading",
          text: "Image Naming — Registries, Repositories, and Tags",
          level: 2
        },
        {
          type: "text",
          text: "Image names follow the format: <code>[registry/]repository[:tag|@digest]</code>. Understanding this format prevents many mistakes."
        },
        {
          type: "code",
          lang: "bash",
          title: "Decoding Image Names",
          code: `# Shorthand — Docker Hub is the default registry
python:3.12-slim
# Fully qualified: docker.io/library/python:3.12-slim
#                  ^^^^^^^^  ^^^^^^^ ^^^^^^ ^^^^^^^^^
#                  registry  org     repo   tag

# Private registry
us-docker.pkg.dev/my-project/ml-models/inference:v1.2.3
# ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^  ^^^^^^^^^  ^^^^^
# Google Artifact Registry               repo       tag

# AWS ECR
123456789.dkr.ecr.us-east-1.amazonaws.com/my-api:latest
# ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^   ^^^^^^  ^^^^^^
# ECR registry                             repo     tag

# Pinned by digest (immutable — this is the most reproducible)
python@sha256:a1b2c3d4e5f6...
# The digest uniquely identifies the EXACT image content`
        },
        {
          type: "callout",
          variant: "danger",
          title: "Never Deploy :latest to Production",
          text: "<code>:latest</code> is just a tag name — it's not magical, and it doesn't mean \"most recent.\" It's the default tag when none is specified. The problem: <code>:latest</code> is mutable. Someone can push a new image with the same <code>:latest</code> tag, and now your deployment pulls a completely different image. Use specific version tags (<code>:v1.2.3</code>) or SHA digests for reproducible deployments."
        },
        {
          type: "heading",
          text: "Content-Addressable Storage — Why Digests Matter",
          level: 2
        },
        {
          type: "text",
          text: "Every image and every layer has a <strong>digest</strong> — a SHA256 hash of its contents. This makes Docker images content-addressable: you can refer to an image by its exact content, not just a mutable tag. Two key implications:"
        },
        {
          type: "list",
          items: [
            "<strong>Reproducibility:</strong> If you pin to a digest (<code>python@sha256:abc123...</code>), you'll get the exact same image every time, even if the tag is updated. This is critical for ML reproducibility — you want to know exactly what ran during training.",
            "<strong>Integrity:</strong> When Docker pulls an image, it verifies the digest. If the content was tampered with during transit, the hash won't match and Docker rejects it. This is your first line of defense in supply chain security."
          ]
        },
        {
          type: "code",
          lang: "bash",
          title: "Working with Digests",
          code: `# Get the digest of an image
docker inspect python:3.12-slim --format '{{index .RepoDigests 0}}'
# python@sha256:a1b2c3d4e5f6...

# Pull by digest (immutable, reproducible)
docker pull python@sha256:a1b2c3d4e5f6...

# In a Dockerfile, pin your base image by digest for max reproducibility
# FROM python@sha256:a1b2c3d4e5f6...`
        },
        {
          type: "heading",
          text: "Image Size — An Engineering Concern",
          level: 2
        },
        {
          type: "text",
          text: "Image size is not just an aesthetic concern. It has real engineering impact across your entire deployment pipeline."
        },
        {
          type: "list",
          items: [
            "<strong>Deploy speed:</strong> A 2GB image takes 30-60 seconds to pull on a new node. A 150MB image takes 5 seconds. When your autoscaler needs to spin up new pods during a traffic spike, those seconds matter.",
            "<strong>Security surface:</strong> Every binary and library in your image is a potential attack vector. Larger images have more CVEs. The python:3.12 image (full Debian) has 100+ known CVEs. python:3.12-slim has about 20. python:3.12-alpine has about 5.",
            "<strong>Storage costs:</strong> Your CI builds 50 images per day. Your registry stores them for 90 days. At 2GB each, that's 9TB of storage. At 150MB each, it's 675GB.",
            "<strong>Build cache efficiency:</strong> Smaller layers mean faster cache operations and less network transfer during layer uploads."
          ]
        },
        {
          type: "code",
          lang: "bash",
          title: "Comparing Base Image Sizes",
          code: `# Full Debian — includes gcc, make, and many system packages
docker pull python:3.12
docker images python:3.12 --format '{{.Size}}'
# ~1.0 GB

# Slim — minimal Debian, just enough for Python
docker pull python:3.12-slim
docker images python:3.12-slim --format '{{.Size}}'
# ~150 MB

# Alpine — musl-based, smallest possible
docker pull python:3.12-alpine
docker images python:3.12-alpine --format '{{.Size}}'
# ~50 MB

# Distroless — Google's minimal image (no shell, no package manager)
docker pull gcr.io/distroless/python3-debian12
# ~30 MB — but you can't exec into it for debugging`
        },
        {
          type: "callout",
          variant: "info",
          title: "Alpine Looks Tempting, But Beware",
          text: "Alpine uses musl libc instead of glibc. Many Python C extensions (NumPy, pandas, SciPy) are built against glibc. On Alpine, pip has to compile them from source, which is slow and sometimes fails entirely. For ML workloads, <code>python:3.12-slim</code> (Debian-based, glibc) is usually the right choice. Alpine is great for Go binaries and simple utilities."
        },
        {
          type: "heading",
          text: "What You Should Understand Now",
          level: 2
        },
        {
          type: "list",
          items: [
            "A Docker image is a stack of read-only filesystem layers, identified by SHA256 digests",
            "Layer caching is critical for build speed — put rarely-changing instructions first",
            "Images are named as <code>registry/repository:tag</code> — never deploy <code>:latest</code> to production",
            "Content-addressable storage (digests) provides both reproducibility and integrity",
            "Image size directly impacts deploy speed, security surface, and storage costs",
            "For Python/ML workloads, <code>python:3.12-slim</code> is usually the best base image"
          ]
        },
        {
          type: "text",
          text: "Now that you understand what images are and how layers work, it's time to learn how to build them. In the next lesson, we'll write Dockerfiles — starting with a deliberately bad one and progressively improving it to production grade."
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 4: Writing Dockerfiles — From Bad to Production-Grade
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "writing-dockerfiles",
      title: "Writing Dockerfiles — From Bad to Production-Grade",
      readTime: "18 min",
      content: [
        {
          type: "text",
          text: "Your team lead asks you to containerize an ML inference API. You google \"python Dockerfile,\" copy the first StackOverflow answer, and it works. Three months later, your builds take 8 minutes, your image is 2.3GB, your container runs as root, and a security scan finds 247 CVEs. Every one of those problems traces back to that Dockerfile. Let's learn to write them properly."
        },
        {
          type: "heading",
          text: "The Bad Dockerfile — And Everything Wrong With It",
          level: 2
        },
        {
          type: "text",
          text: "Here's a Dockerfile you'll find in countless tutorials. It works. It's also terrible."
        },
        {
          type: "code",
          lang: "docker",
          title: "The Bad Dockerfile",
          code: `FROM python:3.12
WORKDIR /app
COPY . .
RUN pip install -r requirements.txt
RUN apt-get update && apt-get install -y curl vim htop
EXPOSE 8000
CMD python main.py`
        },
        {
          type: "text",
          text: "Let's count the problems:"
        },
        {
          type: "list",
          items: [
            "<strong>FROM python:3.12</strong> — Full Debian image (~1GB). Includes gcc, make, and hundreds of packages you don't need. More CVEs, larger transfer, slower deploys.",
            "<strong>COPY . . before pip install</strong> — Any code change invalidates the pip install cache. Every build reinstalls all packages. Remember Lesson 3: put rarely-changing things first.",
            "<strong>No .dockerignore</strong> — COPY . . grabs everything: .git (50MB+), __pycache__, .env files (secrets!), model weights, test data. The build context becomes enormous.",
            "<strong>apt-get without cleanup</strong> — The apt cache stays in the layer (~30MB of wasted space). vim and htop are debug tools that don't belong in production.",
            "<strong>Runs as root</strong> — The container process runs as root by default. If an attacker exploits your app, they're root inside the container.",
            "<strong>CMD python main.py</strong> — Shell form, not exec form. This runs as <code>/bin/sh -c python main.py</code>, which means python is not PID 1. Signals (SIGTERM) go to the shell, not your app. Graceful shutdown breaks.",
            "<strong>No HEALTHCHECK</strong> — The orchestrator (Docker Compose, Kubernetes) has no way to know if your app is actually working."
          ]
        },
        {
          type: "heading",
          text: "Rebuilding It — Instruction by Instruction",
          level: 2
        },
        {
          type: "text",
          text: "Let's fix every problem. We'll go through each Dockerfile instruction and understand when and how to use it."
        },
        {
          type: "heading",
          text: "FROM — Choosing Your Base Image",
          level: 3
        },
        {
          type: "text",
          text: "Your base image is the foundation. Choose the smallest one that meets your needs."
        },
        {
          type: "code",
          lang: "docker",
          title: "Choosing the Right Base",
          code: `# BAD: Full Debian, includes everything
FROM python:3.12           # ~1 GB, 100+ CVEs

# GOOD: Slim Debian, just enough for Python
FROM python:3.12-slim      # ~150 MB, ~20 CVEs

# SOMETIMES: Alpine (small but musl libc — problematic for NumPy/SciPy)
FROM python:3.12-alpine    # ~50 MB, ~5 CVEs

# FOR ML: NVIDIA CUDA base (when you need GPU support)
FROM nvidia/cuda:12.1.1-runtime-ubuntu22.04  # ~3.5 GB, but you need it

# Pin the exact version for reproducibility
FROM python:3.12.7-slim-bookworm`
        },
        {
          type: "heading",
          text: "WORKDIR — Set the Working Directory",
          level: 3
        },
        {
          type: "text",
          text: "<code>WORKDIR /app</code> sets the working directory for all subsequent instructions. It creates the directory if it doesn't exist. Always use WORKDIR instead of <code>RUN mkdir -p /app && cd /app</code> — it's cleaner and each RUN starts fresh (cd doesn't persist between RUN instructions)."
        },
        {
          type: "heading",
          text: "COPY — The Cache-Friendly Order",
          level: 3
        },
        {
          type: "code",
          lang: "docker",
          title: "COPY Order for Cache Efficiency",
          code: `# Copy ONLY the dependency file first
COPY requirements.txt .

# Install dependencies (this layer is cached until requirements.txt changes)
RUN pip install --no-cache-dir -r requirements.txt

# NOW copy the application code (this layer rebuilds on every code change,
# but the expensive pip install above stays cached)
COPY . .`
        },
        {
          type: "callout",
          variant: "info",
          title: "The --no-cache-dir Flag",
          text: "By default, pip caches downloaded packages in <code>~/.cache/pip</code> so it can reinstall them faster later. Inside a Docker build, you'll never reinstall — the layer IS the cache. So <code>--no-cache-dir</code> prevents storing a useless duplicate, saving 50-200MB per image."
        },
        {
          type: "heading",
          text: "RUN — Executing Commands",
          level: 3
        },
        {
          type: "text",
          text: "Each RUN instruction creates a layer. Chain related commands with <code>&&</code> to keep them in one layer. Always clean up after yourself in the same layer — if you delete files in a later layer, they still exist in the previous layer (that's how OverlayFS works)."
        },
        {
          type: "code",
          lang: "docker",
          title: "RUN Best Practices",
          code: `# BAD: Three layers, apt cache stays in first layer
RUN apt-get update
RUN apt-get install -y libpq5
RUN rm -rf /var/lib/apt/lists/*   # Too late! Cache is in the first layer

# GOOD: One layer, cache cleaned in the same layer
RUN apt-get update \\
    && apt-get install -y --no-install-recommends libpq5 \\
    && rm -rf /var/lib/apt/lists/*

# --no-install-recommends prevents pulling in suggested packages you don't need`
        },
        {
          type: "heading",
          text: "ENV and ARG — Configuration",
          level: 3
        },
        {
          type: "code",
          lang: "docker",
          title: "ENV vs ARG",
          code: `# ARG: build-time only. Available during build, NOT in the running container.
ARG PYTHON_VERSION=3.12
FROM python:\${PYTHON_VERSION}-slim

# You can override ARG at build time:
# docker build --build-arg PYTHON_VERSION=3.11 .

# ENV: available during build AND in the running container
ENV PYTHONUNBUFFERED=1 \\
    PYTHONDONTWRITEBYTECODE=1 \\
    PIP_NO_CACHE_DIR=1

# PYTHONUNBUFFERED=1  → don't buffer stdout/stderr (see logs immediately)
# PYTHONDONTWRITEBYTECODE=1 → don't create .pyc files (saves space)
# PIP_NO_CACHE_DIR=1 → same as --no-cache-dir for all pip commands`
        },
        {
          type: "callout",
          variant: "warning",
          title: "Never Put Secrets in ENV or ARG",
          text: "ARG and ENV values are baked into the image metadata. Anyone who pulls your image can see them with <code>docker inspect</code> or <code>docker history</code>. Never use ENV for database passwords, API keys, or tokens. We'll cover the right way in Lesson 7."
        },
        {
          type: "heading",
          text: "USER — Don't Run as Root",
          level: 3
        },
        {
          type: "code",
          lang: "docker",
          title: "Creating a Non-Root User",
          code: `# Create a non-root user
RUN groupadd --gid 1000 appuser \\
    && useradd --uid 1000 --gid appuser --shell /bin/bash --create-home appuser

# Change ownership of the app directory
COPY --chown=appuser:appuser . .

# Switch to non-root user for all subsequent instructions
USER appuser

# Now the container process runs as 'appuser' (UID 1000), not root`
        },
        {
          type: "heading",
          text: "EXPOSE and HEALTHCHECK",
          level: 3
        },
        {
          type: "code",
          lang: "docker",
          title: "EXPOSE and HEALTHCHECK",
          code: `# EXPOSE documents which ports the container listens on.
# It does NOT publish the port — that's done with -p at runtime.
EXPOSE 8000

# HEALTHCHECK tells Docker how to test if the container is working.
# Docker Compose and Swarm use this. Kubernetes uses its own probes instead.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \\
  CMD ["curl", "-f", "http://localhost:8000/health"]
# If the health check fails 3 times in a row, the container is marked unhealthy.`
        },
        {
          type: "heading",
          text: "CMD vs ENTRYPOINT — The PID 1 Problem",
          level: 3
        },
        {
          type: "text",
          text: "This is one of the most misunderstood aspects of Docker. The distinction between CMD and ENTRYPOINT, and between shell form and exec form, affects signal handling, graceful shutdown, and container behavior."
        },
        {
          type: "code",
          lang: "docker",
          title: "Shell Form vs Exec Form",
          code: `# SHELL FORM — runs via /bin/sh -c "..."
CMD python main.py
# Process tree:
#   PID 1: /bin/sh -c "python main.py"
#     PID 7: python main.py
# Problem: SIGTERM goes to sh (PID 1), NOT to python.
# Python never gets the signal. Graceful shutdown fails.
# After 10 seconds, Docker sends SIGKILL — hard kill.

# EXEC FORM — runs the process directly (no shell)
CMD ["python", "main.py"]
# Process tree:
#   PID 1: python main.py
# SIGTERM goes directly to python. Graceful shutdown works.`
        },
        {
          type: "code",
          lang: "docker",
          title: "ENTRYPOINT + CMD Pattern",
          code: `# ENTRYPOINT is the command that always runs.
# CMD provides default arguments that can be overridden.
ENTRYPOINT ["python", "main.py"]
CMD ["--host", "0.0.0.0", "--port", "8000"]

# docker run myimage
# → python main.py --host 0.0.0.0 --port 8000

# docker run myimage --port 9000
# → python main.py --port 9000  (CMD is overridden)

# Common pattern: use a shell script as entrypoint for initialization
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["python", "main.py"]`
        },
        {
          type: "heading",
          text: "Multi-Stage Builds — The Size Destroyer",
          level: 2
        },
        {
          type: "text",
          text: "Multi-stage builds are the most powerful Dockerfile feature for reducing image size. The idea: use one stage to <em>build</em> your application (where you need compilers, build tools, dev headers), then copy only the output into a clean <em>runtime</em> stage."
        },
        {
          type: "code",
          lang: "docker",
          title: "Multi-Stage Build — Python ML App",
          code: `# ── Stage 1: Builder ──────────────────────────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /app

# Install build dependencies (gcc, etc.) needed to compile C extensions
RUN apt-get update \\
    && apt-get install -y --no-install-recommends gcc g++ libffi-dev \\
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies into a virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:\$PATH"

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ── Stage 2: Runtime ─────────────────────────────────────────────
FROM python:3.12-slim AS runtime

WORKDIR /app

# Install ONLY runtime system dependencies (no gcc!)
RUN apt-get update \\
    && apt-get install -y --no-install-recommends libpq5 curl \\
    && rm -rf /var/lib/apt/lists/*

# Copy the virtual environment from the builder stage
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:\$PATH"

# Create non-root user
RUN groupadd --gid 1000 appuser \\
    && useradd --uid 1000 --gid appuser --shell /bin/bash --create-home appuser

# Copy application code
COPY --chown=appuser:appuser . .

USER appuser
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \\
  CMD ["curl", "-f", "http://localhost:8000/health"]

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]`
        },
        {
          type: "text",
          text: "The builder stage has gcc, g++, header files — everything needed to compile Python C extensions. But none of that ends up in the final image. The runtime stage only has the compiled packages (in the venv), runtime libraries, and your code. Image drops from ~1.2GB to ~200MB."
        },
        {
          type: "heading",
          text: "BuildKit Features — Cache Mounts and Secrets",
          level: 2
        },
        {
          type: "text",
          text: "BuildKit (Docker's modern build engine, enabled by default since Docker 23.0) adds powerful features via the <code>RUN --mount</code> syntax."
        },
        {
          type: "code",
          lang: "docker",
          title: "BuildKit Cache Mount and Secret Mount",
          code: `# syntax=docker/dockerfile:1

# ── Cache mount: persist pip's download cache across builds ──
# The cache directory is NOT included in the layer — it's a
# build-time mount that persists on the build host
RUN --mount=type=cache,target=/root/.cache/pip \\
    pip install -r requirements.txt
# First build: downloads + installs (2 min)
# Second build with new package: only downloads the new one (15 sec)

# ── Secret mount: access secrets during build without leaking them ──
# Build command: docker build --secret id=pip_token,src=./pip-token.txt .
RUN --mount=type=secret,id=pip_token \\
    pip install -r requirements.txt \\
    --extra-index-url https://token:\$(cat /run/secrets/pip_token)@pypi.mycompany.com/simple/
# The secret is available during the RUN command but is NOT stored in the layer.
# docker history will NOT show the token value.`
        },
        {
          type: "heading",
          text: ".dockerignore — What NOT to Copy",
          level: 2
        },
        {
          type: "code",
          lang: "bash",
          title: ".dockerignore File",
          code: `# .dockerignore — keeps build context small and clean
.git
.gitignore
.dockerignore
Dockerfile*
docker-compose*.yml

# Python artifacts
__pycache__
*.pyc
*.pyo
.pytest_cache
.mypy_cache
.ruff_cache

# Virtual environments
.venv
venv

# IDE
.vscode
.idea

# Secrets and local config
.env
.env.*
*.pem
*.key

# ML artifacts (large files that shouldn't be in the image)
*.pt
*.onnx
*.pkl
models/
data/
notebooks/`
        },
        {
          type: "callout",
          variant: "warning",
          title: "Without .dockerignore, COPY . . Copies Everything",
          text: "Including your .git directory (often 50-100MB), model weights (gigabytes), .env files (secrets), and node_modules. The build context is sent to the daemon before the build starts, so large contexts slow down every build even if COPY doesn't use those files."
        },
        {
          type: "heading",
          text: "The Production-Grade Dockerfile Checklist",
          level: 2
        },
        {
          type: "list",
          items: [
            "Use a specific, minimal base image (<code>python:3.12.7-slim-bookworm</code>)",
            "Set <code>PYTHONUNBUFFERED=1</code> and <code>PYTHONDONTWRITEBYTECODE=1</code>",
            "COPY requirements.txt before COPY . . for cache efficiency",
            "Use <code>--no-cache-dir</code> or <code>PIP_NO_CACHE_DIR=1</code>",
            "Use multi-stage builds to separate build-time and runtime dependencies",
            "Create and use a non-root user",
            "Use exec form for CMD/ENTRYPOINT (<code>[\"python\", \"main.py\"]</code>)",
            "Add a HEALTHCHECK",
            "Have a comprehensive .dockerignore",
            "Clean up apt caches in the same RUN layer",
            "Pin dependency versions in requirements.txt"
          ]
        },
        {
          type: "heading",
          text: "What You Should Understand Now",
          level: 2
        },
        {
          type: "list",
          items: [
            "Every Dockerfile instruction has performance, security, and size implications",
            "Layer cache efficiency depends on instruction ordering — stable things first, volatile things last",
            "Multi-stage builds let you use build tools without shipping them in the final image",
            "Exec form (<code>[\"cmd\", \"arg\"]</code>) is essential for proper signal handling and graceful shutdown",
            "BuildKit cache mounts and secret mounts are production-grade features you should use",
            "A .dockerignore file is not optional — it's a security and performance requirement"
          ]
        },
        {
          type: "text",
          text: "You can write a solid Dockerfile now. But a Dockerfile just creates an image. In the next lesson, we'll explore what happens when you <em>run</em> that image — container lifecycle, networking, volumes, and resource limits."
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 5: Running Containers — Lifecycle, Networking, Volumes
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "running-containers",
      title: "Running Containers — Lifecycle, Networking, Volumes",
      readTime: "15 min",
      content: [
        {
          type: "text",
          text: "You've built an image for your ML inference API. Now you need to run it. But \"running\" a container involves dozens of decisions: what port does it listen on? How does it talk to the database? Where does it store model weights? What happens when it crashes? How much memory should it get? Each of these decisions maps to a <code>docker run</code> flag, and picking wrong defaults leads to containers that work in dev and fail in production."
        },
        {
          type: "heading",
          text: "Container Lifecycle",
          level: 2
        },
        {
          type: "text",
          text: "A container moves through a well-defined set of states. Understanding these states is critical for debugging — when your container keeps restarting, you need to know <em>where</em> in the lifecycle it's failing."
        },
        {
          type: "diagram",
          title: "Container Lifecycle States",
          content: `  docker create        docker start        docker pause
  ─────────────→  ┌─────────────→  ┌──────────────→  ┌──────────┐
                  │ CREATED     │  │ RUNNING      │  │ PAUSED   │
                  └─────────────┘  └───────┬──────┘  └────┬─────┘
                                           │              │
                                           │ docker stop  │ docker unpause
                                           │ (or process  │
                                           │  exits)      │
                                           ▼              │
                                    ┌──────────────┐      │
                                    │  STOPPED      │ ←────┘
                                    │  (Exited)     │
                                    └──────┬───────┘
                                           │ docker rm
                                           ▼
                                    ┌──────────────┐
                                    │  REMOVED      │
                                    │  (gone)       │
                                    └──────────────┘

  docker run = docker create + docker start (combined)
  docker run --rm = auto-remove after exit`
        },
        {
          type: "code",
          lang: "bash",
          title: "Lifecycle Commands",
          code: `# Run a container (create + start in one command)
docker run -d --name my-api my-image:v1

# Check the state
docker inspect my-api --format '{{.State.Status}}'
# "running"

# Graceful stop: sends SIGTERM, waits 10s, then SIGKILL
docker stop my-api

# Force kill immediately (SIGKILL — no graceful shutdown)
docker kill my-api

# Restart (stop + start)
docker restart my-api

# Remove a stopped container
docker rm my-api

# Remove a running container (force)
docker rm -f my-api

# Run and auto-remove on exit (great for one-off tasks)
docker run --rm my-image:v1 python -c "print('done')"`
        },
        {
          type: "heading",
          text: "Essential docker run Flags",
          level: 2
        },
        {
          type: "text",
          text: "Instead of listing every flag alphabetically, let's group them by what problem they solve."
        },
        {
          type: "code",
          lang: "bash",
          title: "Flags for Running ML Services",
          code: `# ── Identity and lifecycle ──
docker run -d \\                    # detached (background)
  --name inference-api \\           # give it a name (otherwise random)
  --restart unless-stopped \\       # restart on crash, not on manual stop

# ── Networking ──
  -p 8080:8000 \\                  # host:8080 → container:8000
  --network ml-services \\         # join a custom network

# ── Resource limits ──
  --memory 2g \\                   # max 2GB RAM (OOM-killed if exceeded)
  --cpus 2.0 \\                    # max 2 CPU cores

# ── Environment ──
  -e MODEL_PATH=/models/v3 \\      # set env vars
  --env-file ./prod.env \\         # load env vars from file

# ── Volumes ──
  -v model-weights:/models:ro \\   # named volume, read-only
  -v /host/logs:/app/logs \\       # bind mount for log access

# ── Security ──
  --user 1000:1000 \\              # run as non-root
  --read-only \\                   # read-only filesystem
  --tmpfs /tmp \\                  # writable tmpfs for temp files

# ── The image and command ──
  my-inference:v1.2.3 \\
  uvicorn main:app --host 0.0.0.0 --port 8000`
        },
        {
          type: "heading",
          text: "Networking — How Containers Talk to Each Other",
          level: 2
        },
        {
          type: "text",
          text: "Networking is where most Docker beginners get stuck. Your API container needs to talk to Redis, your Redis container needs to be reachable by name, and nothing should be accessible from outside unless you explicitly expose it."
        },
        {
          type: "diagram",
          title: "Docker Network Types",
          content: `  BRIDGE (default)                    CUSTOM BRIDGE (recommended)
  ┌──────────────────────────┐       ┌──────────────────────────┐
  │  ┌───────┐  ┌───────┐   │       │  ┌───────┐  ┌───────┐   │
  │  │ App A │  │ App B │   │       │  │ App A │  │ App B │   │
  │  └───┬───┘  └───┬───┘   │       │  └───┬───┘  └───┬───┘   │
  │      │          │        │       │      │          │        │
  │  ┌───┴──────────┴────┐   │       │  ┌───┴──────────┴────┐   │
  │  │   docker0 bridge   │   │       │  │ ml-services bridge│   │
  │  │   (172.17.0.0/16)  │   │       │  │ (172.20.0.0/16)   │   │
  │  └────────────────────┘   │       │  └────────────────────┘   │
  └──────────────────────────┘       └──────────────────────────┘
  • No DNS resolution between            • DNS resolution by container
    containers (only by IP)                name ("redis", "postgres")
  • All containers on same bridge        • Network isolation between
  • Legacy — avoid in production           different custom networks

  HOST MODE                           NONE
  Container shares host's             No networking at all.
  network stack directly.             Used for batch jobs that
  No port mapping needed.             don't need network access.
  No network isolation.`
        },
        {
          type: "code",
          lang: "bash",
          title: "Custom Bridge Network with DNS",
          code: `# Create a custom network
docker network create ml-services

# Run Redis on the custom network
docker run -d --name redis --network ml-services redis:7-alpine

# Run your API on the same network
docker run -d --name api --network ml-services -p 8080:8000 my-api:v1

# Inside the API container, Redis is reachable by NAME:
docker exec api python -c "
import redis
r = redis.Redis(host='redis', port=6379)  # 'redis' resolves via DNS
r.ping()
print('Connected to Redis!')
"

# Containers on DIFFERENT networks can't communicate:
docker network create other-net
docker run -d --name isolated --network other-net alpine sleep 3600
docker exec isolated ping redis  # FAILS — different network

# Clean up
docker rm -f redis api isolated
docker network rm ml-services other-net`
        },
        {
          type: "callout",
          variant: "info",
          title: "Always Use Custom Bridge Networks",
          text: "The default <code>bridge</code> network doesn't support DNS resolution — containers can only reach each other by IP address, which changes on every restart. Custom bridge networks give you automatic DNS: <code>docker run --network my-net --name redis</code> makes \"redis\" a resolvable hostname for all containers on <code>my-net</code>."
        },
        {
          type: "heading",
          text: "Volumes — Persistent and Shared Data",
          level: 2
        },
        {
          type: "text",
          text: "Containers are ephemeral — when a container is removed, its writable layer (from Lesson 2) is deleted. If your ML service caches model predictions in a SQLite database, those predictions vanish when the container restarts. Volumes solve this by providing persistent storage that survives container removal."
        },
        {
          type: "diagram",
          title: "Three Types of Storage",
          content: `  NAMED VOLUME                  BIND MOUNT                   TMPFS
  ┌──────────────┐              ┌──────────────┐              ┌──────────────┐
  │  Container    │              │  Container    │              │  Container    │
  │  /app/data ───┼──→ Docker   │  /app/code ───┼──→ Host     │  /tmp     ───┼──→ RAM
  │              │    managed   │              │    directory │              │
  └──────────────┘    storage   └──────────────┘    (your    └──────────────┘
                                                     code)
  Use for:                      Use for:                      Use for:
  • Database files              • Dev hot-reload              • Secrets at runtime
  • Model weights               • Source code mounting        • Temporary scratch
  • Persistent caches           • Config files                • Sensitive temp files

  Survives container            Host filesystem               Only in memory
  removal. Portable.            directly. Fast.               Never hits disk.`
        },
        {
          type: "code",
          lang: "bash",
          title: "Volume Examples",
          code: `# Named volume — Docker manages the storage location
docker volume create model-cache
docker run -d -v model-cache:/app/cache my-api:v1
# Data persists even after: docker rm -f <container>
# Data is at: /var/lib/docker/volumes/model-cache/_data (on Linux)

# Bind mount — map a host directory into the container
docker run -d -v /home/user/project/src:/app/src my-api:v1
# Changes on host immediately visible in container (great for dev)

# Read-only volume — container can read but not modify
docker run -d -v model-weights:/models:ro my-api:v1

# tmpfs — in-memory, never written to disk
docker run -d --tmpfs /tmp:size=100m my-api:v1

# Inspect volume details
docker volume inspect model-cache`
        },
        {
          type: "heading",
          text: "Resource Limits — Memory and CPU",
          level: 2
        },
        {
          type: "text",
          text: "Without resource limits, a single container can consume all host resources and starve every other container. In production, always set limits."
        },
        {
          type: "code",
          lang: "bash",
          title: "Resource Limits",
          code: `# Memory limit — container gets OOM-killed if it exceeds this
docker run -d --memory 2g --name api my-api:v1

# Memory reservation — soft limit, used for scheduling hints
docker run -d --memory 2g --memory-reservation 1g my-api:v1

# CPU limit — container can use at most 1.5 CPU cores
docker run -d --cpus 1.5 my-api:v1

# GPU access (requires NVIDIA Container Toolkit)
docker run -d --gpus all my-training-job:v1     # all GPUs
docker run -d --gpus '"device=0,1"' my-job:v1   # specific GPUs

# Check what happens when memory is exceeded
docker run --memory 50m --rm python:3.12-slim python -c "
x = bytearray(100 * 1024 * 1024)  # allocate 100MB
"
# Killed — exit code 137 (128 + SIGKILL signal 9)`
        },
        {
          type: "heading",
          text: "Restart Policies",
          level: 2
        },
        {
          type: "text",
          text: "Restart policies tell Docker what to do when a container exits. Choosing the right one prevents both \"container died and nobody noticed\" and \"container is in a crash loop consuming resources.\""
        },
        {
          type: "list",
          items: [
            "<code>--restart no</code> — Default. Container stays stopped after exit. Use for one-off tasks.",
            "<code>--restart on-failure[:max]</code> — Restart only on non-zero exit codes. <code>on-failure:5</code> gives up after 5 retries. Good for batch jobs.",
            "<code>--restart always</code> — Always restart, even after <code>docker stop</code> (restarts on daemon start). Use for infrastructure services you always want running.",
            "<code>--restart unless-stopped</code> — Like <code>always</code>, but doesn't restart if you manually stopped it with <code>docker stop</code>. This is usually what you want for long-running services."
          ]
        },
        {
          type: "callout",
          variant: "warning",
          title: "Restart Policies Don't Replace Orchestration",
          text: "Restart policies handle simple crashes on a single host. They can't handle: the host machine dying, scaling to multiple instances, rolling updates, health-based restarts, or resource scheduling across machines. That's what Kubernetes is for — and it's what we'll cover in Module 4."
        },
        {
          type: "heading",
          text: "What You Should Understand Now",
          level: 2
        },
        {
          type: "list",
          items: [
            "Containers have a well-defined lifecycle: created → running → stopped → removed",
            "Always use custom bridge networks for DNS resolution between containers",
            "Named volumes for persistent data, bind mounts for development, tmpfs for sensitive temp files",
            "Set memory and CPU limits in production — a container without limits can starve the host",
            "Use <code>--restart unless-stopped</code> for long-running services",
            "GPU pass-through requires the NVIDIA Container Toolkit"
          ]
        },
        {
          type: "text",
          text: "Running a single container is straightforward. But real systems have 5, 10, or 20 containers that need to work together. Managing them with individual <code>docker run</code> commands is a nightmare. In the next lesson, we'll learn Docker Compose — the tool that makes multi-container applications manageable."
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 6: Docker Compose — Multi-Container Applications
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "docker-compose",
      title: "Docker Compose — Multi-Container Applications",
      readTime: "15 min",
      content: [
        {
          type: "text",
          text: "Your ML system has grown. The inference API needs Redis for prediction caching, PostgreSQL for request metadata, a Celery worker for async batch predictions, and a Prometheus exporter for metrics. That's five containers, each with its own ports, volumes, networks, environment variables, and startup order. You're maintaining a shell script with five <code>docker run</code> commands, and every new team member spends half a day figuring out the correct incantation to bring the system up. Docker Compose solves this."
        },
        {
          type: "heading",
          text: "What Docker Compose Does",
          level: 2
        },
        {
          type: "text",
          text: "Docker Compose is a tool for defining and running multi-container applications using a single YAML file. Instead of five <code>docker run</code> commands, you describe your entire application stack in <code>compose.yml</code> and bring it up with <code>docker compose up</code>. Compose handles creating networks, volumes, and containers in the right order."
        },
        {
          type: "callout",
          variant: "info",
          title: "docker-compose (v1) vs docker compose (v2)",
          text: "The old <code>docker-compose</code> (with hyphen) was a separate Python tool. The new <code>docker compose</code> (with space) is a plugin built into Docker CLI, written in Go, and much faster. Always use <code>docker compose</code> (v2). The file format is the same."
        },
        {
          type: "heading",
          text: "Anatomy of a Compose File",
          level: 2
        },
        {
          type: "code",
          lang: "yaml",
          title: "compose.yml — ML Inference Stack",
          code: `# compose.yml — ML inference service with all dependencies
services:
  # ── The API server ──────────────────────────────────────────
  api:
    build:
      context: .
      dockerfile: Dockerfile
      target: runtime            # use the runtime stage of multi-stage build
    ports:
      - "8080:8000"              # host:container
    environment:
      - MODEL_PATH=/models/current
      - REDIS_URL=redis://redis:6379/0
      - DATABASE_URL=postgresql://app:secret@postgres:5432/mldb
      - WORKERS=4
    volumes:
      - model-weights:/models:ro  # read-only model weights
    networks:
      - ml-net
    depends_on:
      redis:
        condition: service_healthy
      postgres:
        condition: service_healthy
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: "2.0"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 5s
      start_period: 15s
      retries: 3

  # ── Async worker for batch predictions ──────────────────────
  worker:
    build:
      context: .
      target: runtime
    command: celery -A tasks worker --loglevel=info --concurrency=2
    environment:
      - REDIS_URL=redis://redis:6379/0
      - DATABASE_URL=postgresql://app:secret@postgres:5432/mldb
    volumes:
      - model-weights:/models:ro
    networks:
      - ml-net
    depends_on:
      redis:
        condition: service_healthy
    deploy:
      resources:
        limits:
          memory: 4G
    restart: unless-stopped

  # ── Redis for prediction caching ────────────────────────────
  redis:
    image: redis:7-alpine
    volumes:
      - redis-data:/data
    networks:
      - ml-net
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 3
    restart: unless-stopped

  # ── PostgreSQL for request metadata ─────────────────────────
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: mldb
      POSTGRES_USER: app
      POSTGRES_PASSWORD: secret    # use .env file in real projects!
    volumes:
      - pg-data:/var/lib/postgresql/data
    networks:
      - ml-net
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d mldb"]
      interval: 10s
      timeout: 3s
      retries: 3
    restart: unless-stopped

volumes:
  model-weights:
    external: true                 # created outside compose
  redis-data:
  pg-data:

networks:
  ml-net:
    driver: bridge`
        },
        {
          type: "heading",
          text: "depends_on with Health Checks — Startup Order Done Right",
          level: 2
        },
        {
          type: "text",
          text: "Plain <code>depends_on</code> only waits for the container to <em>start</em>, not for the service inside to be <em>ready</em>. PostgreSQL takes 2-5 seconds to accept connections after the container starts. If your API container starts immediately and tries to connect, it fails."
        },
        {
          type: "code",
          lang: "yaml",
          title: "depends_on with Conditions",
          code: `# BAD: only waits for container start, not service readiness
depends_on:
  - postgres

# GOOD: waits for the health check to pass
depends_on:
  postgres:
    condition: service_healthy
  redis:
    condition: service_healthy

# The postgres service MUST have a healthcheck defined for this to work.
# Without a healthcheck, service_healthy will wait forever.`
        },
        {
          type: "callout",
          variant: "warning",
          title: "Health Checks Are Not Optional in Compose",
          text: "If you use <code>condition: service_healthy</code> but the dependency doesn't define a healthcheck, Compose will wait forever and your stack will never start. Always define health checks for database and cache services."
        },
        {
          type: "heading",
          text: "Environment Management",
          level: 2
        },
        {
          type: "code",
          lang: "yaml",
          title: "Three Ways to Set Environment Variables",
          code: `services:
  api:
    # Method 1: Inline (simple, but clutters the file)
    environment:
      - APP_ENV=production
      - LOG_LEVEL=info

    # Method 2: From a file (keeps secrets out of compose.yml)
    env_file:
      - .env                     # loaded first
      - .env.production          # overrides .env values

    # Method 3: Compose variable interpolation
    # Values come from shell environment or .env file in project root
    environment:
      - "DATABASE_URL=postgresql://app:\${POSTGRES_PASSWORD}@db:5432/mldb"
      - "LOG_LEVEL=\${LOG_LEVEL:-info}"`
        },
        {
          type: "code",
          lang: "bash",
          title: ".env File (Never Commit This!)",
          code: `# .env — loaded automatically by Compose
POSTGRES_PASSWORD=super-secret-password
REDIS_PASSWORD=another-secret
LOG_LEVEL=debug
MODEL_VERSION=v3.2.1`
        },
        {
          type: "heading",
          text: "Profiles — Dev vs Production Service Sets",
          level: 2
        },
        {
          type: "text",
          text: "In development, you might want additional services (pgAdmin for database browsing, a debug container, hot-reload configurations) that shouldn't run in production. Profiles let you define optional services."
        },
        {
          type: "code",
          lang: "yaml",
          title: "Compose Profiles",
          code: `services:
  api:
    # ... (always runs, no profile needed)

  postgres:
    # ... (always runs)

  # Only runs when the "debug" profile is activated
  pgadmin:
    image: dpage/pgadmin4
    profiles: ["debug"]
    ports:
      - "5050:80"
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@local.dev
      PGADMIN_DEFAULT_PASSWORD: admin

  # Only runs when the "monitoring" profile is activated
  prometheus:
    image: prom/prometheus
    profiles: ["monitoring"]
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml`
        },
        {
          type: "code",
          lang: "bash",
          title: "Using Profiles",
          code: `# Start only the core services (no profiles)
docker compose up -d

# Start core + debug tools
docker compose --profile debug up -d

# Start core + monitoring
docker compose --profile monitoring up -d

# Start everything
docker compose --profile debug --profile monitoring up -d`
        },
        {
          type: "heading",
          text: "The Override Pattern — Base + Environment-Specific Config",
          level: 2
        },
        {
          type: "text",
          text: "For more complex setups, Compose supports file overrides. You define a base configuration and layer environment-specific changes on top."
        },
        {
          type: "code",
          lang: "yaml",
          title: "compose.yml (base)",
          code: `# compose.yml — base configuration (shared by all environments)
services:
  api:
    image: my-api:latest
    networks:
      - ml-net
    restart: unless-stopped

networks:
  ml-net:`
        },
        {
          type: "code",
          lang: "yaml",
          title: "compose.override.yml (dev — loaded automatically)",
          code: `# compose.override.yml — automatically merged with compose.yml
services:
  api:
    build: .                     # build from source in dev
    ports:
      - "8080:8000"
    volumes:
      - ./src:/app/src           # hot-reload with bind mount
    environment:
      - APP_ENV=development
      - LOG_LEVEL=debug`
        },
        {
          type: "code",
          lang: "yaml",
          title: "compose.prod.yml (production — explicit)",
          code: `# compose.prod.yml — must be explicitly specified
services:
  api:
    image: us-docker.pkg.dev/my-proj/ml/api:v1.2.3  # pinned image
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: "2.0"
      replicas: 3
    environment:
      - APP_ENV=production
      - LOG_LEVEL=warning`
        },
        {
          type: "code",
          lang: "bash",
          title: "Using Override Files",
          code: `# Dev (compose.yml + compose.override.yml merged automatically)
docker compose up -d

# Production (compose.yml + compose.prod.yml, skip override)
docker compose -f compose.yml -f compose.prod.yml up -d`
        },
        {
          type: "heading",
          text: "Compose Watch — Dev Inner Loop",
          level: 2
        },
        {
          type: "text",
          text: "Compose Watch (Docker Compose 2.22+) provides file watching that automatically syncs code changes or rebuilds containers — like hot-reload for your Docker dev environment."
        },
        {
          type: "code",
          lang: "yaml",
          title: "Compose Watch Configuration",
          code: `services:
  api:
    build: .
    develop:
      watch:
        # Sync source code changes without rebuilding
        - action: sync
          path: ./src
          target: /app/src

        # Rebuild when dependencies change
        - action: rebuild
          path: ./requirements.txt

        # Restart when config changes
        - action: sync+restart
          path: ./config
          target: /app/config`
        },
        {
          type: "code",
          lang: "bash",
          title: "Using Compose Watch",
          code: `# Start with file watching enabled
docker compose watch

# Now edit src/main.py → automatically synced into container
# Edit requirements.txt → container rebuilds automatically
# Edit config/settings.yaml → file synced + container restarted`
        },
        {
          type: "heading",
          text: "Essential Compose Commands",
          level: 2
        },
        {
          type: "code",
          lang: "bash",
          title: "Daily Compose Commands",
          code: `# Start all services (detached)
docker compose up -d

# Start and rebuild images if Dockerfile changed
docker compose up -d --build

# View logs from all services (follow mode)
docker compose logs -f

# View logs from one service
docker compose logs -f api

# Stop all services (containers keep existing)
docker compose stop

# Stop and remove containers, networks
docker compose down

# Stop, remove containers, AND delete volumes (destroys data!)
docker compose down -v

# Scale a service (run 3 worker instances)
docker compose up -d --scale worker=3

# Execute a command in a running service
docker compose exec api python manage.py migrate

# Run a one-off command (new temporary container)
docker compose run --rm api python -c "print('test')"`
        },
        {
          type: "heading",
          text: "What You Should Understand Now",
          level: 2
        },
        {
          type: "list",
          items: [
            "Docker Compose defines multi-container applications in a single YAML file",
            "Use <code>depends_on</code> with <code>condition: service_healthy</code> for proper startup ordering",
            "Use <code>.env</code> files for secrets and environment-specific configuration",
            "Profiles let you define optional services (debug tools, monitoring) without separate files",
            "The override pattern (<code>compose.override.yml</code>) keeps dev and prod configs clean",
            "Compose Watch provides hot-reload for your Docker dev environment"
          ]
        },
        {
          type: "text",
          text: "Your application stack runs. But is it secure? In the next lesson, we'll harden these containers for production — non-root users, capability dropping, read-only filesystems, image scanning, and secret management."
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 7: Security — Making Containers Production-Safe
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "container-security",
      title: "Security — Making Containers Production-Safe",
      readTime: "12 min",
      content: [
        {
          type: "text",
          text: "A junior engineer on your team deploys an ML inference API. It works great. Then a penetration test reveals that the container runs as root, has all Linux capabilities enabled, the filesystem is writable, and the image contains 180 known vulnerabilities including two critical remote code execution flaws. An attacker who exploits any one of those CVEs gets root access inside the container — and with root plus full capabilities, escaping to the host is frighteningly plausible. This lesson is about making sure that never happens."
        },
        {
          type: "callout",
          variant: "danger",
          title: "Containers Are Not a Security Boundary by Default",
          text: "A default Docker container shares the host kernel, runs as root, has dozens of Linux capabilities, and has a writable filesystem. It provides process isolation, not security isolation. Every hardening step in this lesson removes an attack vector."
        },
        {
          type: "heading",
          text: "Non-Root Users — The First and Most Important Step",
          level: 2
        },
        {
          type: "text",
          text: "By default, processes inside a container run as root (UID 0). Even though the container's root is technically isolated by namespaces, a kernel vulnerability or misconfiguration can allow a root process to break out of the container. Running as a non-root user is the single most impactful security improvement."
        },
        {
          type: "code",
          lang: "docker",
          title: "Non-Root User in Dockerfile",
          code: `FROM python:3.12-slim

WORKDIR /app

# Install dependencies as root (needs write access to /usr/local)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Create a non-root user
RUN groupadd --gid 1000 appuser \\
    && useradd --uid 1000 --gid appuser --no-create-home appuser

# Copy app code and set ownership
COPY --chown=appuser:appuser . .

# Switch to non-root for all subsequent commands
USER appuser

# This process runs as UID 1000, not root
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]`
        },
        {
          type: "code",
          lang: "bash",
          title: "Verify the Container Runs as Non-Root",
          code: `# Check who the container process runs as
docker run --rm my-api:v1 whoami
# appuser

docker run --rm my-api:v1 id
# uid=1000(appuser) gid=1000(appuser) groups=1000(appuser)

# Override at runtime (if the image doesn't set USER)
docker run --user 1000:1000 --rm python:3.12-slim whoami
# I have no name!   (UID 1000 has no entry in /etc/passwd — that's fine)`
        },
        {
          type: "heading",
          text: "Linux Capabilities — Drop Everything, Add Back What You Need",
          level: 2
        },
        {
          type: "text",
          text: "Linux capabilities split root's superpowers into ~40 individual permissions. By default, Docker containers get 14 capabilities — including <code>NET_RAW</code> (craft raw packets for ARP spoofing), <code>SYS_CHROOT</code> (change root directory), and <code>SETUID/SETGID</code> (change user identity). Most applications need zero of these."
        },
        {
          type: "code",
          lang: "bash",
          title: "Dropping and Adding Capabilities",
          code: `# Drop ALL capabilities, then add back only what you need
docker run --cap-drop ALL --cap-add NET_BIND_SERVICE my-api:v1
# NET_BIND_SERVICE: needed only if binding to ports < 1024

# Most applications need ZERO capabilities
docker run --cap-drop ALL my-api:v1

# See what capabilities a running container has
docker inspect my-container --format '{{.HostConfig.CapDrop}}'

# Common capabilities you might need:
# NET_BIND_SERVICE  — bind to ports < 1024
# CHOWN             — change file ownership
# SETUID/SETGID     — needed for su/sudo (usually not needed)
# SYS_PTRACE        — needed for debugging tools like strace`
        },
        {
          type: "heading",
          text: "Read-Only Filesystem",
          level: 2
        },
        {
          type: "text",
          text: "If an attacker gets into your container, the first thing they'll do is download tools (wget a reverse shell, install a crypto miner). A read-only filesystem prevents writing anywhere in the container's filesystem. You allow specific writable paths using <code>--tmpfs</code>."
        },
        {
          type: "code",
          lang: "bash",
          title: "Read-Only Container with tmpfs Exceptions",
          code: `docker run -d \\
  --read-only \\                       # entire filesystem is read-only
  --tmpfs /tmp:size=100m \\            # except /tmp (in RAM, max 100MB)
  --tmpfs /app/logs:size=50m \\        # except logs directory
  -v model-cache:/app/cache \\         # named volume is writable
  my-api:v1

# Test: try to write to a non-allowed path
docker exec my-container touch /etc/hacked
# touch: cannot touch '/etc/hacked': Read-only file system`
        },
        {
          type: "heading",
          text: "no-new-privileges — Prevent Escalation",
          level: 2
        },
        {
          type: "text",
          text: "The <code>--security-opt no-new-privileges</code> flag prevents processes inside the container from gaining additional privileges through setuid binaries, file capabilities, or other mechanisms. Even if an attacker finds a setuid binary, it won't escalate their privileges."
        },
        {
          type: "code",
          lang: "bash",
          title: "no-new-privileges Flag",
          code: `docker run -d \\
  --security-opt no-new-privileges \\
  --cap-drop ALL \\
  --read-only \\
  --tmpfs /tmp \\
  --user 1000:1000 \\
  my-api:v1

# This container:
# • Runs as non-root (UID 1000)
# • Has zero Linux capabilities
# • Cannot gain new privileges via setuid
# • Has a read-only filesystem (except /tmp)
# This is the MINIMUM for production containers.`
        },
        {
          type: "heading",
          text: "Seccomp and AppArmor — Kernel-Level Sandboxing",
          level: 2
        },
        {
          type: "text",
          text: "Docker applies a default seccomp (secure computing) profile that blocks ~44 dangerous syscalls out of ~300+ available. This prevents containers from calling <code>reboot()</code>, <code>mount()</code>, <code>kexec_load()</code>, and other syscalls that could affect the host. For most applications, the default profile is sufficient."
        },
        {
          type: "text",
          text: "<strong>AppArmor</strong> (on Ubuntu/Debian) and <strong>SELinux</strong> (on RHEL/CentOS) provide mandatory access control — rules about what files and network resources a process can access, enforced by the kernel regardless of the process's user ID. Docker applies a default AppArmor profile automatically."
        },
        {
          type: "callout",
          variant: "info",
          title: "When Do You Need Custom Seccomp/AppArmor Profiles?",
          text: "Almost never, unless you're in a highly regulated environment (finance, healthcare) or running untrusted code. The default profiles combined with non-root + dropped capabilities + read-only filesystem cover 95% of use cases. Custom profiles are complex to write and maintain — only invest the effort when compliance requires it."
        },
        {
          type: "heading",
          text: "Image Scanning — Find Vulnerabilities Before Deployment",
          level: 2
        },
        {
          type: "text",
          text: "Every package in your Docker image is a potential vulnerability. Image scanners compare the packages in your image against CVE databases and report known vulnerabilities. <strong>Trivy</strong> is the most widely used open-source scanner."
        },
        {
          type: "code",
          lang: "bash",
          title: "Scanning Images with Trivy",
          code: `# Install Trivy
brew install trivy   # macOS
# Or: apt-get install trivy  # Debian/Ubuntu

# Scan an image
trivy image my-api:v1

# Output:
# my-api:v1 (debian 12.5)
# Total: 23 (UNKNOWN: 0, LOW: 12, MEDIUM: 8, HIGH: 2, CRITICAL: 1)
#
# ┌──────────────┬──────────────┬──────────┬────────────────┐
# │   Library     │ Vulnerability │ Severity │ Fixed Version  │
# ├──────────────┼──────────────┼──────────┼────────────────┤
# │ openssl       │ CVE-2024-XXX │ CRITICAL │ 3.0.13-1       │
# │ curl          │ CVE-2024-YYY │ HIGH     │ 7.88.1-10+12   │
# └──────────────┴──────────────┴──────────┴────────────────┘

# Fail the build if HIGH or CRITICAL vulnerabilities exist
trivy image --exit-code 1 --severity HIGH,CRITICAL my-api:v1

# Scan a Dockerfile for misconfigurations (not just CVEs)
trivy config Dockerfile
# Checks: running as root, ADD instead of COPY, missing HEALTHCHECK, etc.`
        },
        {
          type: "heading",
          text: "Rootless Docker — Defense in Depth",
          level: 2
        },
        {
          type: "text",
          text: "Standard Docker requires the daemon to run as root. Rootless Docker runs the entire daemon and containers under a regular user account. If an attacker escapes the container, they land as an unprivileged user on the host — not root."
        },
        {
          type: "text",
          text: "Rootless mode has trade-offs: no privileged ports (< 1024), limited cgroup resource control, and some networking limitations. For most development and many production setups, it works fine. In Kubernetes environments, you typically rely on the container runtime's rootless support instead."
        },
        {
          type: "heading",
          text: "Secret Management — Never Use ENV for Secrets",
          level: 2
        },
        {
          type: "text",
          text: "This is the most common security mistake in Docker. Engineers put database passwords, API keys, and tokens in <code>ENV</code> variables or <code>ARG</code> build arguments. Both are visible in the image metadata."
        },
        {
          type: "code",
          lang: "bash",
          title: "Why ENV Secrets Are Visible",
          code: `# Anyone with image access can see ALL environment variables:
docker inspect my-api:v1 --format '{{json .Config.Env}}' | python -m json.tool
# [
#   "DATABASE_PASSWORD=super-secret-123",    ← exposed!
#   "API_KEY=sk-abc123def456",               ← exposed!
#   "PATH=/usr/local/bin:/usr/bin"
# ]

# Even build ARGs are visible in image history:
docker history my-api:v1
# STEP 4: ARG SECRET_TOKEN=my-build-secret   ← exposed!`
        },
        {
          type: "code",
          lang: "bash",
          title: "The Right Way: Secrets at Build Time and Runtime",
          code: `# ── Build-time secrets (BuildKit) ──
# Secret is available during build but NOT stored in image layers
docker build --secret id=pip_token,src=./pip-token.txt .

# In Dockerfile:
# RUN --mount=type=secret,id=pip_token \\
#     pip install --extra-index-url \\
#     https://token:\$(cat /run/secrets/pip_token)@pypi.internal/simple/ \\
#     -r requirements.txt

# ── Runtime secrets ──
# Option 1: Mount a secret file
docker run -v /secure/db-password:/run/secrets/db_password:ro my-api:v1
# App reads: open('/run/secrets/db_password').read().strip()

# Option 2: Docker Swarm secrets (if using Swarm)
echo "super-secret" | docker secret create db_password -
docker service create --secret db_password my-api:v1

# Option 3: In Kubernetes, use Kubernetes Secrets (covered in Module 4)`
        },
        {
          type: "heading",
          text: "The Production Security Checklist",
          level: 2
        },
        {
          type: "list",
          items: [
            "Run as non-root user (USER directive in Dockerfile)",
            "Drop all capabilities (<code>--cap-drop ALL</code>), add back only what's needed",
            "Read-only filesystem (<code>--read-only</code>) with tmpfs for writable paths",
            "Enable no-new-privileges (<code>--security-opt no-new-privileges</code>)",
            "Scan images in CI with Trivy (fail on HIGH/CRITICAL CVEs)",
            "Use minimal base images (slim or distroless) to reduce attack surface",
            "Never put secrets in ENV, ARG, or COPY — use BuildKit secret mounts and runtime file mounts",
            "Pin base images by digest for reproducibility and tamper resistance",
            "Keep images updated — rebuild weekly to pick up base image security patches"
          ]
        },
        {
          type: "heading",
          text: "What You Should Understand Now",
          level: 2
        },
        {
          type: "list",
          items: [
            "Default containers are NOT secure — hardening is required for production",
            "Non-root + dropped capabilities + read-only filesystem is the minimum baseline",
            "Image scanning (Trivy) catches known CVEs before they reach production",
            "Secrets in ENV/ARG are visible to anyone with image access — use secret mounts instead",
            "The default seccomp and AppArmor profiles block dangerous syscalls automatically"
          ]
        },
        {
          type: "text",
          text: "Your containers are now hardened. But they need to be distributed — pushed to registries, built in CI pipelines, and deployed across architectures. In the next lesson, we'll cover image registries, CI/CD integration, and multi-architecture builds."
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 8: Image Registries and CI/CD Integration
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "registries-and-cicd",
      title: "Image Registries and CI/CD Integration",
      readTime: "12 min",
      content: [
        {
          type: "text",
          text: "You've built a production-grade image on your laptop. Now what? You need to store it somewhere your production servers can pull it from, your CI pipeline needs to build and scan it automatically on every merge, and your images need to work on both the x86 servers in your data center and the arm64 Graviton instances on AWS. This lesson covers the infrastructure that gets your images from development to production."
        },
        {
          type: "heading",
          text: "Where Images Live — Container Registries",
          level: 2
        },
        {
          type: "text",
          text: "A container registry is like a package repository (npm, PyPI) but for Docker images. When you <code>docker push</code>, images go to a registry. When you <code>docker pull</code> (or Kubernetes pulls during a deployment), they come from a registry."
        },
        {
          type: "diagram",
          title: "Registry Landscape",
          content: `  ┌──────────────────────────────────────────────────────────────────┐
  │                    Container Registries                          │
  ├─────────────────┬──────────────────────────────────────────────┤
  │ PUBLIC           │                                              │
  │  Docker Hub      │ Default registry. Free for public images.    │
  │                  │ Rate-limited for anonymous pulls (100/6h).   │
  │  ghcr.io         │ GitHub Container Registry. Free for public.  │
  │  quay.io         │ Red Hat's registry. Popular for k8s images.  │
  ├─────────────────┼──────────────────────────────────────────────┤
  │ CLOUD PROVIDER   │                                              │
  │  ECR             │ AWS. IAM auth. Tight EKS integration.        │
  │  Artifact Reg.   │ GCP. Replaces GCR. Regional replication.     │
  │  ACR             │ Azure. AAD integration.                      │
  ├─────────────────┼──────────────────────────────────────────────┤
  │ SELF-HOSTED      │                                              │
  │  Harbor          │ CNCF project. Scanning, signing, replication.│
  │                  │ Best choice when you need full control.       │
  └─────────────────┴──────────────────────────────────────────────┘`
        },
        {
          type: "code",
          lang: "bash",
          title: "Pushing to Different Registries",
          code: `# ── Docker Hub ──
docker login
docker tag my-api:v1 myuser/my-api:v1
docker push myuser/my-api:v1

# ── AWS ECR ──
aws ecr get-login-password --region us-east-1 | \\
  docker login --username AWS --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com
docker tag my-api:v1 123456789.dkr.ecr.us-east-1.amazonaws.com/my-api:v1
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/my-api:v1

# ── Google Artifact Registry ──
gcloud auth configure-docker us-docker.pkg.dev
docker tag my-api:v1 us-docker.pkg.dev/my-project/ml-images/my-api:v1
docker push us-docker.pkg.dev/my-project/ml-images/my-api:v1

# ── GitHub Container Registry ──
echo \$GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin
docker tag my-api:v1 ghcr.io/myorg/my-api:v1
docker push ghcr.io/myorg/my-api:v1`
        },
        {
          type: "heading",
          text: "Image Tagging Strategy",
          level: 2
        },
        {
          type: "text",
          text: "Your tagging strategy determines how you identify which code is running in production, how you roll back, and how you audit deployments. A good strategy uses multiple tags per image."
        },
        {
          type: "code",
          lang: "bash",
          title: "Tagging Strategy",
          code: `# Build with multiple tags: semver + git SHA + branch
docker build \\
  -t my-api:v1.2.3 \\           # semantic version (human-readable)
  -t my-api:abc123f \\           # git short SHA (traceable to exact commit)
  -t my-api:main-20240115 \\     # branch + date (for cleanup policies)
  .

# In Kubernetes deployment YAML, use the semver tag:
# image: us-docker.pkg.dev/proj/ml/my-api:v1.2.3
# To roll back: change to v1.2.2 and re-deploy

# For maximum reproducibility, use the digest:
# image: us-docker.pkg.dev/proj/ml/my-api@sha256:abc123...`
        },
        {
          type: "callout",
          variant: "warning",
          title: "Never Deploy :latest",
          text: "The <code>:latest</code> tag is mutable — pushing a new image with the same tag overwrites it. If two different servers pull <code>:latest</code> at different times, they might get different images. Use immutable tags (semver, git SHA) for anything that matters."
        },
        {
          type: "heading",
          text: "Multi-Architecture Builds",
          level: 2
        },
        {
          type: "text",
          text: "You develop on an Apple Silicon Mac (arm64). Your CI runs on x86 GitHub runners. Your production uses arm64 AWS Graviton instances for cost savings. Your image needs to work on all of them. Multi-arch builds solve this."
        },
        {
          type: "code",
          lang: "bash",
          title: "Multi-Architecture Builds with buildx",
          code: `# Create a builder that supports multi-arch
docker buildx create --name multiarch --driver docker-container --use

# Build for multiple architectures and push to registry
docker buildx build \\
  --platform linux/amd64,linux/arm64 \\
  -t myuser/my-api:v1.2.3 \\
  --push \\
  .

# How it works:
# 1. BuildKit builds the image twice (once for each arch)
#    - arm64 build uses QEMU emulation on x86 (slower)
#    - or uses native arm64 builders (faster)
# 2. Pushes both images to the registry
# 3. Creates a "manifest list" that maps arch → image
# 4. When someone does "docker pull my-api:v1.2.3",
#    Docker automatically picks the right arch

# Verify the manifest
docker buildx imagetools inspect myuser/my-api:v1.2.3
# Name:      myuser/my-api:v1.2.3
# MediaType: application/vnd.oci.image.index.v1+json
# Digest:    sha256:abc123...
# Platform:  linux/amd64
# Platform:  linux/arm64`
        },
        {
          type: "heading",
          text: "CI Pipeline — Build, Scan, Push",
          level: 2
        },
        {
          type: "text",
          text: "In production, you never build images manually. A CI pipeline builds, tests, scans, and pushes images automatically on every merge to main. Here's a complete GitHub Actions workflow."
        },
        {
          type: "code",
          lang: "yaml",
          title: "GitHub Actions — Docker Build Pipeline",
          code: `name: Build and Push

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  REGISTRY: us-docker.pkg.dev
  IMAGE: my-project/ml-images/inference-api

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write        # for OIDC authentication to GCP

    steps:
      - uses: actions/checkout@v4

      # Authenticate to GCP using OIDC (no long-lived keys!)
      - uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: projects/123/locations/global/workloadIdentityPools/github/providers/gh
          service_account: ci-builder@my-project.iam.gserviceaccount.com

      - uses: google-github-actions/setup-gcloud@v2

      - run: gcloud auth configure-docker us-docker.pkg.dev

      # Set up BuildKit with layer caching
      - uses: docker/setup-buildx-action@v3

      # Build and push with GitHub Actions cache
      - uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          platforms: linux/amd64,linux/arm64
          tags: |
            \$REGISTRY/\$IMAGE:v1.2.3
            \$REGISTRY/\$IMAGE:\${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      # Scan for vulnerabilities
      - uses: aquasecurity/trivy-action@master
        with:
          image-ref: "\$REGISTRY/\$IMAGE:v1.2.3"
          exit-code: "1"
          severity: CRITICAL,HIGH`
        },
        {
          type: "callout",
          variant: "info",
          title: "OIDC Authentication — No More Long-Lived Secrets",
          text: "The workflow above uses OIDC (OpenID Connect) to authenticate to GCP. Instead of storing a GCP service account key as a GitHub secret (which can leak and never expires), GitHub proves its identity to GCP using a short-lived token. AWS, GCP, and Azure all support this pattern. It's the gold standard for CI/CD authentication."
        },
        {
          type: "heading",
          text: "BuildKit Cache Strategies in CI",
          level: 2
        },
        {
          type: "text",
          text: "In CI, there's no persistent local disk between builds. Without a cache strategy, every build starts from scratch. Two main strategies exist."
        },
        {
          type: "list",
          items: [
            "<strong>GitHub Actions cache (<code>type=gha</code>):</strong> Stores layers in GitHub's cache. Fast (same data center), 10GB limit per repository. Best for most teams.",
            "<strong>Registry cache (<code>type=registry</code>):</strong> Pushes cache layers to a separate registry tag. No size limit. Shared across all CI runners and even local development. Slightly slower (network transfer)."
          ]
        },
        {
          type: "code",
          lang: "bash",
          title: "Registry Cache Example",
          code: `# Build with registry cache
docker buildx build \\
  --cache-from type=registry,ref=myuser/my-api:cache \\
  --cache-to type=registry,ref=myuser/my-api:cache,mode=max \\
  -t myuser/my-api:v1.2.3 \\
  --push .

# mode=max: cache ALL layers (not just the final stage)
# This means builder-stage layers are cached too,
# even though they're not in the final image.`
        },
        {
          type: "heading",
          text: "Image Signing with cosign — Supply Chain Security",
          level: 2
        },
        {
          type: "text",
          text: "How do you know the image you're pulling hasn't been tampered with? Digests verify integrity (the content hasn't changed), but signing verifies <em>provenance</em> (the image was built by your CI pipeline, not an attacker who gained write access to your registry)."
        },
        {
          type: "code",
          lang: "bash",
          title: "Signing Images with cosign",
          code: `# Install cosign
brew install cosign

# Generate a keypair (or use keyless signing with OIDC — preferred in CI)
cosign generate-key-pair

# Sign an image after pushing
cosign sign --key cosign.key myuser/my-api:v1.2.3

# Verify before deploying
cosign verify --key cosign.pub myuser/my-api:v1.2.3

# Keyless signing in CI (uses GitHub's OIDC identity — no keys to manage)
# cosign sign myuser/my-api:v1.2.3
# This records: WHO built it (the GitHub workflow), WHEN, and from WHAT repo.

# Kubernetes can enforce signature verification with Sigstore policy-controller
# or Kyverno — reject any image that isn't signed by your CI pipeline.`
        },
        {
          type: "heading",
          text: "What You Should Understand Now",
          level: 2
        },
        {
          type: "list",
          items: [
            "Container registries store and distribute images — choose based on your cloud provider and security needs",
            "Tag with semver + git SHA for traceability; never deploy <code>:latest</code>",
            "Multi-arch builds (buildx) let one tag serve both amd64 and arm64",
            "CI pipelines should: build → scan (Trivy) → push → sign (cosign)",
            "Use OIDC for CI authentication instead of long-lived credentials",
            "BuildKit caching (GHA or registry) eliminates redundant rebuilds in CI"
          ]
        },
        {
          type: "text",
          text: "Your images are built, scanned, signed, and pushed by CI. But production containers will still have problems — crashes, memory leaks, network issues. In the next lesson, we'll build a systematic approach to debugging containers when things go wrong."
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 9: Debugging Containers — When Things Go Wrong
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "debugging-containers",
      title: "Debugging Containers — When Things Go Wrong",
      readTime: "12 min",
      content: [
        {
          type: "text",
          text: "It's 2 AM. PagerDuty fires. Your ML inference service is returning 500 errors. The container keeps restarting. You have 15 minutes before the SLA breach. You need a systematic debugging workflow — not random guessing. This lesson gives you that workflow."
        },
        {
          type: "heading",
          text: "The Debugging Flowchart",
          level: 2
        },
        {
          type: "diagram",
          title: "Container Debugging Decision Tree",
          content: `  Container has a problem
          │
          ▼
  ┌─ Is it running? ──────────────────────────────────────┐
  │                                                        │
  │ YES                                                    │ NO
  │                                                        │
  ▼                                                        ▼
  docker logs <name>                              docker logs <name>
  docker exec <name> sh                           (check why it exited)
  docker stats <name>                                      │
  docker inspect <name>                           Exit code?
                                                           │
                                               ┌───────────┼───────────┐
                                               │           │           │
                                            Code 0      Code 1     Code 137
                                            (success)   (app error) (OOM kill)
                                               │           │           │
                                            Process       Check       Increase
                                            exited        app logs    --memory
                                            normally      for errors  limit
                                               │
                                            Check CMD/
                                            ENTRYPOINT`
        },
        {
          type: "heading",
          text: "docker logs — Your First Stop",
          level: 2
        },
        {
          type: "text",
          text: "90% of debugging starts and ends with logs. Docker captures everything written to stdout and stderr by the container's PID 1 process."
        },
        {
          type: "code",
          lang: "bash",
          title: "Working with Container Logs",
          code: `# View all logs
docker logs my-api

# Follow logs in real-time (like tail -f)
docker logs -f my-api

# Last 100 lines
docker logs --tail 100 my-api

# Logs from the last 5 minutes
docker logs --since 5m my-api

# Logs with timestamps
docker logs -t my-api

# Logs between two times
docker logs --since 2024-01-15T10:00:00 --until 2024-01-15T10:05:00 my-api

# Combine: follow + tail + timestamps
docker logs -f --tail 50 -t my-api`
        },
        {
          type: "callout",
          variant: "info",
          title: "Structured Logging Makes Debugging Faster",
          text: "If your app logs JSON to stdout (<code>{\"level\": \"error\", \"msg\": \"DB connection failed\", \"host\": \"postgres\", \"latency_ms\": 5023}</code>), you can pipe docker logs through <code>jq</code> to filter and format. Structured logs are searchable, filterable, and parseable by log aggregators (ELK, Loki, CloudWatch). Always use structured logging in production containers."
        },
        {
          type: "heading",
          text: "docker exec — Get Inside a Running Container",
          level: 2
        },
        {
          type: "text",
          text: "When logs aren't enough, you need to get inside the container and poke around. <code>docker exec</code> runs a new command inside an already-running container."
        },
        {
          type: "code",
          lang: "bash",
          title: "Interactive Debugging with exec",
          code: `# Open a shell inside the container
docker exec -it my-api /bin/bash
# Or if bash isn't installed (Alpine images):
docker exec -it my-api /bin/sh

# Run a specific command
docker exec my-api cat /app/config.yaml
docker exec my-api python -c "import torch; print(torch.cuda.is_available())"

# Check network connectivity from inside the container
docker exec my-api ping redis
docker exec my-api curl -v http://model-server:8080/health

# Check what processes are running
docker exec my-api ps aux

# Check disk usage inside the container
docker exec my-api df -h

# Check environment variables (for debugging config issues)
docker exec my-api env | sort`
        },
        {
          type: "heading",
          text: "docker inspect — Deep Metadata",
          level: 2
        },
        {
          type: "text",
          text: "When you need to know <em>everything</em> about a container — its IP address, mounted volumes, restart count, exit code, health check results — <code>docker inspect</code> is the tool."
        },
        {
          type: "code",
          lang: "bash",
          title: "Useful docker inspect Queries",
          code: `# Get the container's IP address
docker inspect my-api --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}'

# Get the exit code (why did it stop?)
docker inspect my-api --format '{{.State.ExitCode}}'
# 0 = clean exit, 1 = app error, 137 = OOM killed, 143 = SIGTERM

# Check restart count (is it crash-looping?)
docker inspect my-api --format '{{.RestartCount}}'

# See mount points (volumes and bind mounts)
docker inspect my-api --format '{{json .Mounts}}' | python -m json.tool

# See health check results
docker inspect my-api --format '{{json .State.Health}}' | python -m json.tool

# See the full command being run
docker inspect my-api --format '{{json .Config.Cmd}}'
docker inspect my-api --format '{{json .Config.Entrypoint}}'

# Check resource limits
docker inspect my-api --format 'Memory: {{.HostConfig.Memory}}, CPUs: {{.HostConfig.NanoCpus}}'`
        },
        {
          type: "heading",
          text: "docker stats — Live Resource Monitoring",
          level: 2
        },
        {
          type: "text",
          text: "When your container is slow or unresponsive, check if it's hitting resource limits."
        },
        {
          type: "code",
          lang: "bash",
          title: "Real-Time Resource Usage",
          code: `# Live stats for all running containers
docker stats

# CONTAINER   CPU %   MEM USAGE / LIMIT     MEM %   NET I/O         BLOCK I/O
# my-api      85.3%   1.8GiB / 2GiB         90.1%   1.2GB / 500MB   50MB / 10MB
# redis       2.1%    50MiB / 256MiB        19.5%   800MB / 600MB   5MB / 1MB
# postgres    12.4%   200MiB / 512MiB       39.1%   400MB / 350MB   2GB / 500MB

# Single snapshot (no live updating)
docker stats --no-stream

# Watch for: CPU > 90% (bottleneck), MEM close to limit (about to OOM)`
        },
        {
          type: "heading",
          text: "Container Won't Start? Override the Entrypoint",
          level: 2
        },
        {
          type: "text",
          text: "The most frustrating scenario: your container crashes immediately on startup, so you can't <code>docker exec</code> into it (there's nothing running). The fix: override the entrypoint to get a shell."
        },
        {
          type: "code",
          lang: "bash",
          title: "Debugging a Container That Won't Start",
          code: `# Container exits immediately — can't exec into it
docker run my-api:v1
# Error: ModuleNotFoundError: No module named 'uvicorn'
# Container exits with code 1

# Override entrypoint to get a shell
docker run -it --entrypoint /bin/bash my-api:v1

# Now you're inside the container and can investigate:
# ls /app/
# pip list | grep uvicorn
# python -c "import main"
# cat /app/requirements.txt

# For containers that crash due to config issues,
# check what the entrypoint script does:
docker run -it --entrypoint /bin/bash my-api:v1
# cat /usr/local/bin/docker-entrypoint.sh
# bash -x /usr/local/bin/docker-entrypoint.sh  # run with debug tracing`
        },
        {
          type: "heading",
          text: "The Debug Container Pattern — netshoot and Beyond",
          level: 2
        },
        {
          type: "text",
          text: "Production containers (especially distroless or minimal images) often don't have debugging tools — no curl, no ping, no dig, no strace. Instead of adding tools to your production image, use a debug sidecar container on the same network."
        },
        {
          type: "code",
          lang: "bash",
          title: "Debug Sidecar with netshoot",
          code: `# nicolaka/netshoot has EVERY network debug tool:
# curl, wget, ping, dig, nslookup, traceroute, tcpdump,
# iperf, mtr, netcat, ss, ip, nmap, strace, and more

# Attach to the same network as your container
docker run -it --rm \\
  --network container:my-api \\
  nicolaka/netshoot

# Now you share the network namespace with my-api:
# curl localhost:8000/health     # test the API from inside its network
# dig redis                      # check DNS resolution
# tcpdump -i eth0 port 5432     # capture PostgreSQL traffic
# ss -tlnp                      # see listening ports

# For filesystem debugging, mount the same volumes
docker run -it --rm \\
  -v model-weights:/models:ro \\
  nicolaka/netshoot \\
  ls -la /models/`
        },
        {
          type: "heading",
          text: "docker events — The Audit Trail",
          level: 2
        },
        {
          type: "text",
          text: "When you need to know what happened to a container over time — when it started, stopped, was OOM-killed, or had its health check fail — <code>docker events</code> gives you the timeline."
        },
        {
          type: "code",
          lang: "bash",
          title: "Monitoring Docker Events",
          code: `# Watch all events in real-time
docker events

# Filter events for a specific container
docker events --filter container=my-api

# Filter by event type
docker events --filter event=die --filter event=oom --filter event=health_status

# Events from the last hour
docker events --since 1h

# Example output:
# 2024-01-15T10:23:45 container die abc123 (exitCode=137, name=my-api)
# 2024-01-15T10:23:45 container oom abc123 (name=my-api)
# 2024-01-15T10:23:46 container start abc123 (name=my-api)
#
# Translation: my-api was OOM-killed (exit 137), then auto-restarted`
        },
        {
          type: "heading",
          text: "Common Exit Codes and Their Meanings",
          level: 2
        },
        {
          type: "list",
          items: [
            "<strong>Exit 0:</strong> Clean exit. The process finished successfully. Check if CMD is correct (maybe it ran a script that completed instead of a long-running server).",
            "<strong>Exit 1:</strong> Application error. Check <code>docker logs</code> for the traceback. Common: missing module, config file not found, database connection refused.",
            "<strong>Exit 126:</strong> Command found but not executable. Check file permissions on your entrypoint script (<code>chmod +x</code>).",
            "<strong>Exit 127:</strong> Command not found. The binary in CMD/ENTRYPOINT doesn't exist in the image. Common when using shell form and the shell is missing.",
            "<strong>Exit 137:</strong> Killed by SIGKILL (128 + 9). Usually OOM-killed. Increase <code>--memory</code> limit or fix the memory leak.",
            "<strong>Exit 143:</strong> Killed by SIGTERM (128 + 15). Normal graceful shutdown via <code>docker stop</code>. If unexpected, check if your orchestrator is terminating the container (health check failures, resource pressure)."
          ]
        },
        {
          type: "heading",
          text: "What You Should Understand Now",
          level: 2
        },
        {
          type: "list",
          items: [
            "Start debugging with <code>docker logs</code> — it solves 90% of problems",
            "Use <code>docker exec</code> to get inside running containers for interactive debugging",
            "Use <code>docker inspect --format</code> to extract specific metadata (IP, exit code, restart count)",
            "Override the entrypoint when a container won't start at all",
            "Use debug sidecar containers (netshoot) instead of adding tools to production images",
            "Know your exit codes: 0 (clean), 1 (app error), 137 (OOM), 143 (SIGTERM)"
          ]
        },
        {
          type: "text",
          text: "You can now build, run, secure, distribute, and debug Docker containers. In the final lesson, we'll put it all together — designing real ML systems with Docker, understanding the patterns that work at scale, and seeing exactly where Docker ends and Kubernetes begins."
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 10: System Design Patterns — Docker in Real ML Systems
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "docker-system-design",
      title: "System Design Patterns — Docker in Real ML Systems",
      readTime: "18 min",
      content: [
        {
          type: "text",
          text: "You've learned Docker's mechanics. Now let's see how those pieces combine in real ML systems. This lesson walks through five production patterns you'll encounter as a Staff MLE — each with a Compose architecture, scaling considerations, and an honest look at where Docker Compose breaks down and Kubernetes becomes necessary."
        },
        {
          type: "heading",
          text: "Pattern 1: ML Inference Service",
          level: 2
        },
        {
          type: "text",
          text: "The most common pattern: serve a trained model behind an API. Requests come in, the model predicts, results go back. It sounds simple until you add prediction caching, async batch processing, health monitoring, and graceful model version switching."
        },
        {
          type: "diagram",
          title: "ML Inference Service Architecture",
          content: `  Client Request
       │
       ▼
  ┌─────────┐     ┌──────────┐     ┌─────────────────┐
  │  nginx   │────→│  FastAPI  │────→│  Model Server    │
  │ (reverse │     │  API      │     │  (TorchServe /   │
  │  proxy)  │     │  Gateway  │     │   Triton)        │
  └─────────┘     └────┬─────┘     └─────────────────┘
                       │                    │
                  ┌────┴─────┐        ┌────┴──────┐
                  │  Redis    │        │  Model     │
                  │  (pred.   │        │  Weights   │
                  │   cache)  │        │  (volume)  │
                  └──────────┘        └───────────┘
                       │
                  ┌────┴──────┐
                  │  Celery    │
                  │  Worker    │
                  │  (batch)   │
                  └────┬──────┘
                       │
                  ┌────┴──────┐
                  │ PostgreSQL │
                  │ (request   │
                  │  metadata) │
                  └───────────┘`
        },
        {
          type: "code",
          lang: "yaml",
          title: "compose.yml — ML Inference Stack",
          code: `services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      api:
        condition: service_healthy
    networks:
      - frontend

  api:
    build:
      context: .
      target: runtime
    environment:
      - MODEL_SERVER_URL=http://model-server:8080
      - REDIS_URL=redis://redis:6379/0
      - DATABASE_URL=postgresql://app:secret@postgres:5432/mldb
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: "2.0"
          memory: 1G
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 15s
      timeout: 5s
      retries: 3
    networks:
      - frontend
      - backend

  model-server:
    image: pytorch/torchserve:latest
    volumes:
      - model-weights:/models:ro
    deploy:
      resources:
        limits:
          memory: 4G
    # GPU passthrough (uncomment if GPUs available):
    # runtime: nvidia
    # environment:
    #   - NVIDIA_VISIBLE_DEVICES=0
    networks:
      - backend

  redis:
    image: redis:7-alpine
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
    networks:
      - backend

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: mldb
      POSTGRES_USER: app
      POSTGRES_PASSWORD: secret
    volumes:
      - pg-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d mldb"]
      interval: 10s
    networks:
      - backend

  worker:
    build:
      context: .
      target: runtime
    command: celery -A tasks worker --loglevel=info
    environment:
      - REDIS_URL=redis://redis:6379/0
      - DATABASE_URL=postgresql://app:secret@postgres:5432/mldb
    deploy:
      replicas: 2
      resources:
        limits:
          memory: 2G
    networks:
      - backend

volumes:
  model-weights:
    external: true
  redis-data:
  pg-data:

networks:
  frontend:
  backend:`
        },
        {
          type: "callout",
          variant: "info",
          title: "Network Segmentation",
          text: "Notice the two networks: <code>frontend</code> and <code>backend</code>. Nginx and the API are on <code>frontend</code>. The API, databases, and workers are on <code>backend</code>. This means nginx can't directly access PostgreSQL or Redis — it must go through the API. This is defense-in-depth at the network level."
        },
        {
          type: "heading",
          text: "Pattern 2: Training Pipeline",
          level: 2
        },
        {
          type: "text",
          text: "Training pipelines are fundamentally different from inference services. They're batch jobs, not long-running servers. They need GPU access, large data volumes, and they produce artifacts (model weights) that need to be stored durably."
        },
        {
          type: "diagram",
          title: "Training Pipeline Architecture",
          content: `  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
  │  Data Prep    │────→│  Training     │────→│  Evaluation   │
  │  Container    │     │  Container    │     │  Container    │
  │              │     │              │     │              │
  │ • Download    │     │ • GPU access  │     │ • Load model  │
  │ • Clean       │     │ • Read data   │     │ • Run metrics │
  │ • Split       │     │ • Write ckpts │     │ • Push to     │
  │ • Write to    │     │ • Log metrics │     │   registry    │
  │   shared vol  │     │              │     │              │
  └──────┬───────┘     └──────┬───────┘     └──────┬───────┘
         │                    │                    │
    ┌────┴────────────────────┴────────────────────┴────┐
    │              Shared Volume: /data                  │
    │    raw/ → processed/ → checkpoints/ → final/      │
    └───────────────────────────────────────────────────┘`
        },
        {
          type: "code",
          lang: "yaml",
          title: "compose.yml — Training Pipeline",
          code: `services:
  data-prep:
    build:
      context: .
      dockerfile: Dockerfile.data-prep
    volumes:
      - training-data:/data
    environment:
      - DATA_SOURCE=s3://my-bucket/raw-data/
      - OUTPUT_DIR=/data/processed

  train:
    build:
      context: .
      dockerfile: Dockerfile.train
    volumes:
      - training-data:/data
      - checkpoints:/checkpoints
    environment:
      - DATA_DIR=/data/processed
      - CHECKPOINT_DIR=/checkpoints
      - EPOCHS=50
      - BATCH_SIZE=32
      - LEARNING_RATE=0.001
    deploy:
      resources:
        limits:
          memory: 16G
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
    depends_on:
      data-prep:
        condition: service_completed_successfully

  evaluate:
    build:
      context: .
      dockerfile: Dockerfile.eval
    volumes:
      - training-data:/data:ro
      - checkpoints:/checkpoints:ro
    environment:
      - MODEL_PATH=/checkpoints/best_model.pt
      - TEST_DATA=/data/processed/test.csv
    depends_on:
      train:
        condition: service_completed_successfully

volumes:
  training-data:
  checkpoints:`
        },
        {
          type: "text",
          text: "Key detail: <code>service_completed_successfully</code> (not <code>service_healthy</code>) makes Compose wait for the previous stage to <em>exit with code 0</em> before starting the next. This turns Compose into a simple DAG executor for batch pipelines."
        },
        {
          type: "heading",
          text: "Pattern 3: RAG System",
          level: 2
        },
        {
          type: "text",
          text: "Retrieval-Augmented Generation (RAG) systems combine document retrieval with LLM generation. They have multiple specialized containers that form a processing pipeline."
        },
        {
          type: "diagram",
          title: "RAG System Architecture",
          content: `  User Query
       │
       ▼
  ┌──────────────┐    embed query     ┌──────────────┐
  │  API Gateway  │──────────────────→│  Embedding    │
  │  (FastAPI)    │                    │  Service      │
  └──────┬───────┘                    │  (sentence-   │
         │                            │   transformers)│
         │    ┌───────────────────────└──────┬───────┘
         │    │ vector search                │
         │    ▼                              │
         │  ┌──────────────┐                │
         │  │  Vector DB    │   index docs   │
         │  │  (Qdrant /    │←───────────────┘
         │  │   Weaviate)   │
         │  └──────┬───────┘
         │         │ relevant chunks
         │         ▼
         │  ┌──────────────┐
         └─→│  LLM Gateway  │
            │  (vLLM /      │
            │   text-gen)   │
            └──────────────┘
                   │
              Generated Answer`
        },
        {
          type: "code",
          lang: "yaml",
          title: "compose.yml — RAG System",
          code: `services:
  api:
    build: ./api
    ports:
      - "8080:8000"
    environment:
      - EMBEDDING_URL=http://embedder:8000
      - VECTOR_DB_URL=http://qdrant:6333
      - LLM_URL=http://llm:8000
    depends_on:
      embedder:
        condition: service_healthy
      qdrant:
        condition: service_healthy
      llm:
        condition: service_healthy
    networks:
      - rag-net

  embedder:
    build: ./embedding-service
    deploy:
      resources:
        limits:
          memory: 4G
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 15s
      start_period: 30s       # model loading takes time
    networks:
      - rag-net

  qdrant:
    image: qdrant/qdrant:latest
    volumes:
      - qdrant-data:/qdrant/storage
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:6333/healthz"]
      interval: 10s
    networks:
      - rag-net

  llm:
    image: vllm/vllm-openai:latest
    environment:
      - MODEL=meta-llama/Llama-3-8B-Instruct
      - MAX_MODEL_LEN=4096
    volumes:
      - model-cache:/root/.cache/huggingface
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 15s
      start_period: 120s      # LLM loading is slow
    networks:
      - rag-net

  # Document ingestion worker
  ingester:
    build: ./ingester
    environment:
      - EMBEDDING_URL=http://embedder:8000
      - VECTOR_DB_URL=http://qdrant:6333
    volumes:
      - ./documents:/data/documents:ro
    networks:
      - rag-net

volumes:
  qdrant-data:
  model-cache:

networks:
  rag-net:`
        },
        {
          type: "callout",
          variant: "warning",
          title: "start_period Is Critical for ML Services",
          text: "The LLM container needs <code>start_period: 120s</code> because loading a 16GB model takes 1-2 minutes. Without this, the health check fails during loading and Compose restarts the container in an infinite loop. Always set <code>start_period</code> to at least your model's load time."
        },
        {
          type: "heading",
          text: "Pattern 4: Real-Time Feature Engineering",
          level: 2
        },
        {
          type: "text",
          text: "This pattern processes streaming events (from Kafka) to compute real-time features for ML models — like \"number of transactions in the last 5 minutes\" for fraud detection."
        },
        {
          type: "diagram",
          title: "Real-Time Feature Pipeline",
          content: `  Events (Kafka)
       │
       ▼
  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
  │  Consumer     │────→│  Feature      │────→│  Redis        │
  │  Container    │     │  Compute      │     │  (Feature     │
  │  (reads from  │     │  Container    │     │   Store)      │
  │   topic)      │     │  (windowed    │     │              │
  │              │     │   aggregates) │     │  Serving API  │←── ML Model
  └──────────────┘     └──────────────┘     │  reads here   │    reads features
                                            └──────────────┘    at inference time`
        },
        {
          type: "code",
          lang: "yaml",
          title: "compose.yml — Feature Engineering Pipeline (Dev)",
          code: `services:
  kafka:
    image: confluentinc/cp-kafka:7.6.0
    environment:
      KAFKA_NODE_ID: 1
      KAFKA_PROCESS_ROLES: broker,controller
      KAFKA_LISTENERS: PLAINTEXT://0.0.0.0:9092,CONTROLLER://0.0.0.0:9093
      KAFKA_CONTROLLER_QUORUM_VOTERS: 1@kafka:9093
      KAFKA_CONTROLLER_LISTENER_NAMES: CONTROLLER
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092
      CLUSTER_ID: "MkU3OEVBNTcwNTJENDM2Qk"
    volumes:
      - kafka-data:/var/lib/kafka/data
    healthcheck:
      test: ["CMD", "kafka-broker-api-versions", "--bootstrap-server", "localhost:9092"]
      interval: 15s
      start_period: 30s
    networks:
      - pipeline-net

  feature-worker:
    build: ./feature-worker
    environment:
      - KAFKA_BROKERS=kafka:9092
      - KAFKA_TOPIC=user-events
      - KAFKA_GROUP=feature-workers
      - REDIS_URL=redis://redis:6379/0
    deploy:
      replicas: 3
    depends_on:
      kafka:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - pipeline-net

  redis:
    image: redis:7-alpine
    command: redis-server --maxmemory 1gb --maxmemory-policy allkeys-lru
    volumes:
      - redis-features:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
    networks:
      - pipeline-net

volumes:
  kafka-data:
  redis-features:

networks:
  pipeline-net:`
        },
        {
          type: "heading",
          text: "Pattern 5: A/B Testing Infrastructure",
          level: 2
        },
        {
          type: "text",
          text: "A/B testing ML models requires routing traffic to different model versions and collecting performance metrics for comparison."
        },
        {
          type: "diagram",
          title: "A/B Testing Architecture",
          content: `                    ┌──────────────────────────┐
  Client ──────────→│  Traffic Splitter         │
                    │  (nginx / Envoy)          │
                    │                           │
                    │  70% ──→ model-v2 (new)   │
                    │  30% ──→ model-v1 (safe)  │
                    └────┬─────────────┬────────┘
                         │             │
                    ┌────▼────┐  ┌────▼────┐
                    │ Model   │  │ Model   │
                    │ v2      │  │ v1      │
                    │ (canary)│  │ (stable)│
                    └────┬────┘  └────┬────┘
                         │             │
                    ┌────▼─────────────▼────┐
                    │  Metrics Collector     │
                    │  (Prometheus)          │
                    │                       │
                    │  Compare: latency,     │
                    │  accuracy, error rate  │
                    └───────────────────────┘`
        },
        {
          type: "code",
          lang: "yaml",
          title: "compose.yml — A/B Testing (Simplified)",
          code: `services:
  router:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx-ab.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - model-v1
      - model-v2
    networks:
      - ab-net

  model-v1:
    image: my-model:v1.0.0
    deploy:
      replicas: 2
      resources:
        limits:
          memory: 2G
    networks:
      - ab-net

  model-v2:
    image: my-model:v2.0.0
    deploy:
      replicas: 1         # fewer replicas for canary
      resources:
        limits:
          memory: 2G
    networks:
      - ab-net

  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus-data:/prometheus
    ports:
      - "9090:9090"
    networks:
      - ab-net

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    volumes:
      - grafana-data:/var/lib/grafana
    networks:
      - ab-net

volumes:
  prometheus-data:
  grafana-data:

networks:
  ab-net:`
        },
        {
          type: "heading",
          text: "When Docker Compose Isn't Enough",
          level: 2
        },
        {
          type: "text",
          text: "Docker Compose runs everything on a <strong>single host</strong>. This is perfect for development, demos, and small-scale deployments. But every pattern above eventually hits limits that Compose can't solve."
        },
        {
          type: "diagram",
          title: "Docker Compose vs Kubernetes",
          content: `  ┌──────────────────────────────────────────────────────────────┐
  │  Docker Compose Can Do              │  Needs Kubernetes      │
  ├─────────────────────────────────────┼────────────────────────┤
  │  Run multi-container apps           │  Multi-node clusters    │
  │  Basic health checks                │  Auto-healing across    │
  │  Simple scaling (--scale)           │   nodes                │
  │  Named volumes on one host          │  Distributed storage    │
  │  Custom bridge networking           │  Service mesh           │
  │  Restart on crash                   │  Rolling updates with   │
  │  Resource limits                    │   zero downtime         │
  │  Dev/test environments              │  Auto-scaling (HPA)     │
  │                                     │  RBAC and multi-tenancy │
  │                                     │  GPU scheduling across  │
  │                                     │   a cluster             │
  │                                     │  Secrets management     │
  │                                     │  Ingress routing        │
  └─────────────────────────────────────┴────────────────────────┘`
        },
        {
          type: "text",
          text: "The transition from Compose to Kubernetes typically happens when you need any of these:"
        },
        {
          type: "list",
          items: [
            "<strong>Multi-node deployment:</strong> Your service outgrows a single machine. Compose can't schedule containers across multiple servers.",
            "<strong>Zero-downtime deploys:</strong> Compose's <code>docker compose up -d</code> restarts containers, causing brief downtime. Kubernetes does rolling updates — starting new pods before stopping old ones.",
            "<strong>Auto-scaling:</strong> Kubernetes' Horizontal Pod Autoscaler scales based on CPU, memory, or custom metrics (like inference queue depth). Compose has no equivalent.",
            "<strong>Self-healing:</strong> If a Kubernetes node dies, its pods are automatically rescheduled to other nodes. With Compose, if the host dies, everything dies.",
            "<strong>GPU scheduling:</strong> You have 4 GPU nodes and 10 training jobs. Kubernetes schedules them based on available GPUs. Compose has no cluster-wide scheduling."
          ]
        },
        {
          type: "callout",
          variant: "info",
          title: "The Compose-to-Kubernetes Path",
          text: "You don't need to choose one or the other. Most teams use Compose for local development and Kubernetes for staging/production. Your Dockerfile is the same in both. Your application code is the same. Only the orchestration layer changes. Module 4 (Kubernetes Fundamentals) picks up exactly where this module ends."
        },
        {
          type: "heading",
          text: "What You Should Understand Now",
          level: 2
        },
        {
          type: "list",
          items: [
            "ML inference services need caching (Redis), async processing (workers), and proper health checks with start_period for model loading",
            "Training pipelines use <code>service_completed_successfully</code> to chain batch stages with shared volumes",
            "RAG systems combine multiple specialized containers — each with different resource profiles and startup times",
            "Network segmentation (frontend/backend networks) provides defense-in-depth",
            "Docker Compose is for single-host deployments; Kubernetes is for multi-node orchestration",
            "The Dockerfile you wrote in Lesson 4 works in both Compose and Kubernetes — containerization is the portable foundation"
          ]
        },
        {
          type: "heading",
          text: "Where to Go From Here",
          level: 2
        },
        {
          type: "text",
          text: "You've completed the Docker module. You understand why containers exist, how they work at the kernel level, how to build production-grade images, how to compose multi-container systems, how to secure and debug them, and how they fit into real ML architectures. The next module — Kubernetes Fundamentals — takes everything you've learned and extends it to multi-node clusters, where your containers run across dozens or hundreds of machines with automatic scaling, healing, and zero-downtime deployments."
        }
      ]
    }

  ]; // end m.lessons
})();
