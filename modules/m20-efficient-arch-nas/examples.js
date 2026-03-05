// Patches the Efficient Architecture Design & Hardware-Aware NAS module (m20) with comprehensive code examples.
// Loaded after curriculum.js and lessons.js.
// m20 = CURRICULUM.phases[5].modules[4]
(function patchEfficientArchNASExamples() {
  const m = CURRICULUM.phases[5].modules[4];

  m.codeExamples = [

    // ──────────────────────────────────────────────────────────
    // Section 1: Design Space Exploration & Efficiency Benchmark
    // ──────────────────────────────────────────────────────────
    {
      id: "design-space-exploration",
      title: "Design Space Exploration & Efficiency Benchmark",
      icon: "📊",
      items: [

        // ── 1.1 Benchmark Multiple Architectures ──
        {
          title: "Benchmark Efficient Architectures: FLOPs, Params, Latency",
          lang: "python",
          filename: "benchmark_architectures.py",
          desc: "Compare MobileNetV3, EfficientNet-Lite, ShuffleNetV2 across FLOPs, parameter count, model size, and actual CPU/GPU latency. Plot the Pareto frontier.",
          code: `"""
Benchmark efficient architectures on CIFAR-100.
Measures: accuracy, FLOPs, params, model size, CPU latency.
Plots the accuracy-vs-latency Pareto frontier.
"""
import torch
import torch.nn as nn
import torchvision.models as models
import time
import numpy as np

try:
    from thop import profile
    HAS_THOP = True
except ImportError:
    HAS_THOP = False
    print("Install thop for FLOP counting: pip install thop")


def benchmark_latency(model, input_shape=(1, 3, 224, 224),
                      warmup=20, runs=100, device="cpu"):
    """Measure inference latency on the specified device."""
    model = model.to(device).eval()
    x = torch.randn(input_shape, device=device)
    with torch.no_grad():
        for _ in range(warmup):
            model(x)
        if device == "cuda":
            torch.cuda.synchronize()
        t0 = time.perf_counter()
        for _ in range(runs):
            model(x)
        if device == "cuda":
            torch.cuda.synchronize()
        elapsed = (time.perf_counter() - t0) / runs * 1000
    return elapsed


def model_stats(name, model, input_shape=(1, 3, 224, 224)):
    """Compute model statistics."""
    params = sum(p.numel() for p in model.parameters())
    size_mb = params * 4 / (1024 ** 2)

    flops = 0
    if HAS_THOP:
        x = torch.randn(input_shape)
        flops, _ = profile(model, inputs=(x,), verbose=False)

    latency = benchmark_latency(model, input_shape)

    return {
        "name": name,
        "params_m": params / 1e6,
        "size_mb": size_mb,
        "flops_m": flops / 1e6 if flops else 0,
        "latency_ms": latency,
    }


# ── Load models ──
architectures = {
    "MobileNetV3-Small": models.mobilenet_v3_small(weights=None, num_classes=100),
    "MobileNetV3-Large": models.mobilenet_v3_large(weights=None, num_classes=100),
    "ShuffleNetV2-0.5x": models.shufflenet_v2_x0_5(weights=None, num_classes=100),
    "ShuffleNetV2-1.0x": models.shufflenet_v2_x1_0(weights=None, num_classes=100),
    "EfficientNet-B0": models.efficientnet_b0(weights=None, num_classes=100),
    "ResNet-18 (baseline)": models.resnet18(weights=None, num_classes=100),
    "ResNet-50 (baseline)": models.resnet50(weights=None, num_classes=100),
}

print(f"{'Model':<25s} {'Params (M)':>10s} {'Size (MB)':>10s} "
      f"{'MFLOPs':>10s} {'Latency (ms)':>12s}")
print("-" * 75)

results = []
for name, model in architectures.items():
    stats = model_stats(name, model)
    results.append(stats)
    print(f"{stats['name']:<25s} {stats['params_m']:>10.2f} {stats['size_mb']:>10.2f} "
          f"{stats['flops_m']:>10.1f} {stats['latency_ms']:>12.2f}")

# ── Identify Pareto-optimal models ──
print("\\nPareto-optimal models (lowest latency for their param range):")
sorted_by_latency = sorted(results, key=lambda r: r["latency_ms"])
pareto_front = []
best_params = float("inf")
for r in sorted_by_latency:
    if r["params_m"] < best_params:
        pareto_front.append(r["name"])
        best_params = r["params_m"]
        print(f"  {r['name']}: {r['latency_ms']:.2f}ms, {r['params_m']:.2f}M params")`
        },

        // ── 1.2 FLOPs vs Latency Analysis ──
        {
          title: "FLOPs vs Latency Correlation Analysis",
          lang: "python",
          filename: "flops_vs_latency.py",
          desc: "Demonstrate that FLOPs poorly predict latency by measuring the same operations with different memory access patterns.",
          code: `"""
FLOPs vs Latency: demonstrate the correlation gap.
Same FLOPs, different latencies due to memory access patterns.
"""
import torch
import torch.nn as nn
import time


def time_op(op, x, warmup=20, runs=200):
    op.eval()
    with torch.no_grad():
        for _ in range(warmup):
            op(x)
        t0 = time.perf_counter()
        for _ in range(runs):
            op(x)
        return (time.perf_counter() - t0) / runs * 1000


# All operations designed to have ~the same FLOPs
x = torch.randn(1, 64, 56, 56)

# Op 1: One 3x3 standard conv (64→64)
# FLOPs: 3*3*64*64*56*56 ≈ 1.16 GFLOPs
op1 = nn.Conv2d(64, 64, 3, padding=1, bias=False)

# Op 2: 4x depthwise 3x3 (64 channels each) + 4x pointwise 1x1
# Depthwise FLOPs: 4 * 3*3*64*56*56 ≈ 0.073 GFLOPs
# Pointwise FLOPs: 4 * 64*64*56*56 ≈ 0.051 GFLOPs * 4 ≈ ... different total
# Let's make them comparable by adjusting
op2 = nn.Sequential(
    nn.Conv2d(64, 64, 3, padding=1, groups=64, bias=False),
    nn.Conv2d(64, 64, 1, bias=False),
    nn.Conv2d(64, 64, 3, padding=1, groups=64, bias=False),
    nn.Conv2d(64, 64, 1, bias=False),
)

# Op 3: One 1x1 conv but much wider (big batch matmul)
# 64→448→64 to match FLOPs roughly
op3 = nn.Sequential(
    nn.Conv2d(64, 448, 1, bias=False),
    nn.Conv2d(448, 64, 1, bias=False),
)

ops = [("Standard 3x3 conv", op1),
       ("4x (DW + PW) stack", op2),
       ("Wide 1x1 bottleneck", op3)]

print(f"{'Operation':<25s} {'Latency (ms)':>12s} {'Arithmetic Intensity':>20s}")
print("-" * 60)
for name, op in ops:
    lat = time_op(op, x)
    # Rough arithmetic intensity estimate
    params = sum(p.numel() for p in op.parameters())
    ai = "High" if params > 200000 else ("Medium" if params > 50000 else "Low")
    print(f"{name:<25s} {lat:>12.3f} {ai:>20s}")

print("\\nKey insight: operations with higher arithmetic intensity")
print("(more FLOPs per byte of memory accessed) are faster per FLOP.")`
        },
      ]
    },

    // ──────────────────────────────────────────────────────────
    // Section 2: DARTS Implementation
    // ──────────────────────────────────────────────────────────
    {
      id: "darts-implementation",
      title: "Differentiable Architecture Search (DARTS)",
      icon: "🔬",
      items: [

        // ── 2.1 DARTS Cell ──
        {
          title: "DARTS Cell: Mixed Operations with Learnable Architecture",
          lang: "python",
          filename: "darts_cell.py",
          desc: "Full DARTS cell implementation with mixed operations, bi-level optimization, and architecture derivation.",
          code: `"""
DARTS Cell Implementation.
A cell is a DAG of nodes where each edge has a mixed operation
(weighted sum of candidate ops). Architecture params (alpha) are
learned jointly with weights via bi-level optimization.
"""
import torch
import torch.nn as nn
import torch.nn.functional as F


# ── Candidate Operations ──────────────────────────────
class SepConv(nn.Module):
    def __init__(self, C, kernel_size):
        super().__init__()
        pad = kernel_size // 2
        self.op = nn.Sequential(
            nn.ReLU(inplace=False),
            nn.Conv2d(C, C, kernel_size, padding=pad, groups=C, bias=False),
            nn.Conv2d(C, C, 1, bias=False),
            nn.BatchNorm2d(C),
        )

    def forward(self, x):
        return self.op(x)


class DilConv(nn.Module):
    def __init__(self, C, kernel_size, dilation=2):
        super().__init__()
        pad = (kernel_size // 2) * dilation
        self.op = nn.Sequential(
            nn.ReLU(inplace=False),
            nn.Conv2d(C, C, kernel_size, padding=pad, dilation=dilation,
                      groups=C, bias=False),
            nn.Conv2d(C, C, 1, bias=False),
            nn.BatchNorm2d(C),
        )

    def forward(self, x):
        return self.op(x)


class Zero(nn.Module):
    def forward(self, x):
        return x.mul(0.)


OPS = {
    'none':      lambda C: Zero(),
    'skip':      lambda C: nn.Identity(),
    'avg_3x3':   lambda C: nn.Sequential(
        nn.AvgPool2d(3, stride=1, padding=1, count_include_pad=False),
        nn.BatchNorm2d(C)),
    'max_3x3':   lambda C: nn.Sequential(
        nn.MaxPool2d(3, stride=1, padding=1),
        nn.BatchNorm2d(C)),
    'sep_3x3':   lambda C: SepConv(C, 3),
    'sep_5x5':   lambda C: SepConv(C, 5),
    'dil_3x3':   lambda C: DilConv(C, 3, dilation=2),
}
OP_NAMES = list(OPS.keys())


# ── Mixed Operation ──────────────────────────────────
class MixedOp(nn.Module):
    def __init__(self, C):
        super().__init__()
        self.ops = nn.ModuleList([OPS[name](C) for name in OP_NAMES])

    def forward(self, x, weights):
        return sum(w * op(x) for w, op in zip(weights, self.ops))


# ── DARTS Cell ───────────────────────────────────────
class DARTSCell(nn.Module):
    """
    A cell with N intermediate nodes.
    Each node receives input from ALL previous nodes via mixed edges.
    """
    def __init__(self, C, n_nodes=4):
        super().__init__()
        self.n_nodes = n_nodes
        self.edges = nn.ModuleDict()

        # Edges from input nodes (0, 1) and intermediate nodes
        for i in range(n_nodes):
            for j in range(i + 2):  # connect from node j to node i+2
                self.edges[f"{j}_{i+2}"] = MixedOp(C)

        # Architecture parameters: one alpha per edge per op
        self.n_edges = sum(i + 2 for i in range(n_nodes))
        self.alpha = nn.Parameter(
            1e-3 * torch.randn(self.n_edges, len(OP_NAMES))
        )

    def forward(self, s0, s1):
        """s0, s1 are the two input nodes (from previous cells)."""
        states = [s0, s1]
        edge_idx = 0

        for i in range(self.n_nodes):
            node_inputs = []
            for j in range(len(states)):
                weights = F.softmax(self.alpha[edge_idx], dim=0)
                edge_key = f"{j}_{i+2}"
                node_inputs.append(
                    self.edges[edge_key](states[j], weights)
                )
                edge_idx += 1
            # Sum all inputs to this node
            states.append(sum(node_inputs))

        # Concatenate intermediate nodes (exclude inputs)
        return torch.cat(states[2:], dim=1)


# ── Derive final architecture ────────────────────────
def derive_architecture(cell):
    """Extract the discrete architecture from continuous alphas."""
    arch = []
    edge_idx = 0
    for i in range(cell.n_nodes):
        node_edges = []
        for j in range(i + 2):
            weights = F.softmax(cell.alpha[edge_idx], dim=0)
            best_op = weights.argmax().item()
            node_edges.append((j, OP_NAMES[best_op], weights[best_op].item()))
            edge_idx += 1

        # Keep top-2 edges per node (standard DARTS)
        node_edges.sort(key=lambda e: e[2], reverse=True)
        top2 = node_edges[:2]
        for src, op, w in top2:
            arch.append(f"  node {i+2} ← node {src} via {op} (weight={w:.3f})")

    return arch


# ── Demo ──
C = 16
cell = DARTSCell(C, n_nodes=4)
s0 = torch.randn(2, C, 8, 8)
s1 = torch.randn(2, C, 8, 8)

out = cell(s0, s1)
print(f"Input:  2 × ({s0.shape})")
print(f"Output: {out.shape}  (4 nodes × {C} channels concatenated)")

print(f"\\nArchitecture parameters: {cell.alpha.shape}")
print(f"Total cell parameters: {sum(p.numel() for p in cell.parameters()):,}")

print("\\nDerived architecture (before training):")
for line in derive_architecture(cell):
    print(line)`
        },

        // ── 2.2 DARTS Training Loop ──
        {
          title: "DARTS Bi-Level Optimization Training Loop",
          lang: "python",
          filename: "darts_train.py",
          desc: "The bi-level optimization loop: alternate between updating network weights (train loss) and architecture parameters (validation loss).",
          code: `"""
DARTS Bi-Level Optimization.

Outer loop: update architecture params alpha to minimize VALIDATION loss
Inner loop: update network weights w to minimize TRAINING loss

Approximation: one step of each, alternating.
"""
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import DataLoader, TensorDataset


class SimpleSearchNetwork(nn.Module):
    """
    Simplified search network for DARTS demo.
    Uses a single DARTS cell (in practice, you'd stack multiple).
    """
    def __init__(self, C=16, n_nodes=4, num_classes=10):
        super().__init__()
        self.stem = nn.Sequential(
            nn.Conv2d(3, C, 3, padding=1, bias=False),
            nn.BatchNorm2d(C),
        )
        # Import DARTSCell from previous example
        # (inlined here for self-containment)
        self.cell = self._build_cell(C, n_nodes)
        self.gap = nn.AdaptiveAvgPool2d(1)
        self.classifier = nn.Linear(C * n_nodes, num_classes)

    def _build_cell(self, C, n_nodes):
        """Build a simplified mixed-op cell."""
        # Using a simplified version for the training demo
        edges = nn.ModuleList()
        self.n_nodes = n_nodes
        n_edges = sum(i + 2 for i in range(n_nodes))

        for _ in range(n_edges):
            edges.append(nn.ModuleList([
                nn.Conv2d(C, C, 3, padding=1, groups=C, bias=False),  # depthwise
                nn.Conv2d(C, C, 1, bias=False),  # pointwise
                nn.Identity(),  # skip
            ]))

        self.cell_edges = edges
        self.alpha = nn.Parameter(torch.zeros(n_edges, 3))
        return None  # edges stored separately

    def forward(self, x):
        s = self.stem(x)
        states = [s, s]
        edge_idx = 0

        for i in range(self.n_nodes):
            node_inputs = []
            for j in range(len(states)):
                weights = F.softmax(self.alpha[edge_idx], dim=0)
                ops = self.cell_edges[edge_idx]
                mixed = sum(w * op(states[j])
                           for w, op in zip(weights, ops))
                node_inputs.append(mixed)
                edge_idx += 1
            states.append(sum(node_inputs))

        out = torch.cat(states[2:], dim=1)
        out = self.gap(out).flatten(1)
        return self.classifier(out)

    def arch_parameters(self):
        return [self.alpha]

    def weight_parameters(self):
        params = []
        for name, p in self.named_parameters():
            if name != 'alpha':
                params.append(p)
        return params


def train_darts(model, train_loader, val_loader, epochs=5):
    """
    DARTS bi-level optimization.
    """
    # Separate optimizers for weights and architecture
    w_optimizer = torch.optim.SGD(
        model.weight_parameters(), lr=0.025,
        momentum=0.9, weight_decay=3e-4
    )
    alpha_optimizer = torch.optim.Adam(
        model.arch_parameters(), lr=3e-4,
        weight_decay=1e-3
    )

    for epoch in range(epochs):
        model.train()
        train_iter = iter(train_loader)
        val_iter = iter(val_loader)

        epoch_w_loss = 0
        epoch_a_loss = 0
        steps = 0

        for batch_idx in range(min(len(train_loader), len(val_loader))):
            # ── Step 1: Update architecture alpha (validation loss) ──
            try:
                val_x, val_y = next(val_iter)
            except StopIteration:
                val_iter = iter(val_loader)
                val_x, val_y = next(val_iter)

            alpha_optimizer.zero_grad()
            val_logits = model(val_x)
            val_loss = F.cross_entropy(val_logits, val_y)
            val_loss.backward()
            alpha_optimizer.step()
            epoch_a_loss += val_loss.item()

            # ── Step 2: Update weights w (training loss) ──
            try:
                train_x, train_y = next(train_iter)
            except StopIteration:
                break

            w_optimizer.zero_grad()
            train_logits = model(train_x)
            train_loss = F.cross_entropy(train_logits, train_y)
            train_loss.backward()
            w_optimizer.step()
            epoch_w_loss += train_loss.item()
            steps += 1

        # ── Report ──
        alpha_dist = F.softmax(model.alpha, dim=1)
        entropy = -(alpha_dist * (alpha_dist + 1e-8).log()).sum(dim=1).mean()
        print(f"Epoch {epoch+1}: train_loss={epoch_w_loss/max(steps,1):.4f}, "
              f"val_loss={epoch_a_loss/max(steps,1):.4f}, "
              f"alpha_entropy={entropy:.3f}")

    return model


# ── Demo with synthetic data ──
N = 256
train_data = TensorDataset(
    torch.randn(N, 3, 16, 16),
    torch.randint(0, 10, (N,))
)
val_data = TensorDataset(
    torch.randn(N // 2, 3, 16, 16),
    torch.randint(0, 10, (N // 2,))
)
train_loader = DataLoader(train_data, batch_size=32, shuffle=True)
val_loader = DataLoader(val_data, batch_size=32, shuffle=True)

model = SimpleSearchNetwork(C=8, n_nodes=3, num_classes=10)
print(f"Search network: {sum(p.numel() for p in model.parameters()):,} params")
print(f"Architecture params: {model.alpha.shape}\\n")

model = train_darts(model, train_loader, val_loader, epochs=5)

# ── Derive final architecture ──
print("\\nFinal architecture (highest-weight op per edge):")
ops = ["depthwise_3x3", "pointwise_1x1", "skip"]
alpha = F.softmax(model.alpha, dim=1)
for i, weights in enumerate(alpha):
    best = weights.argmax().item()
    print(f"  Edge {i}: {ops[best]} (weight={weights[best]:.3f})")`
        },
      ]
    },

    // ──────────────────────────────────────────────────────────
    // Section 3: Hardware-Aware NAS with Latency Constraints
    // ──────────────────────────────────────────────────────────
    {
      id: "hardware-aware-nas-lab",
      title: "Hardware-Aware NAS with Latency Constraints",
      icon: "🎯",
      items: [

        // ── 3.1 Evolutionary Search with Latency ──
        {
          title: "Evolutionary NAS with Latency-Constrained Search",
          lang: "python",
          filename: "evolutionary_nas.py",
          desc: "Implement a simple evolutionary NAS that searches for architectures under a latency budget using a lookup table predictor.",
          code: `"""
Evolutionary NAS with Hardware-Aware Latency Constraint.
Search for the best architecture under a target latency budget.

Architecture encoding: list of (operation, channels) per layer.
Fitness: accuracy_proxy - penalty * max(0, latency - budget)
"""
import random
import numpy as np
from dataclasses import dataclass
from typing import List, Tuple


# ── Architecture encoding ──
OPERATIONS = ["conv3x3", "dwconv3x3", "dwconv5x5", "mbconv3_t3", "mbconv3_t6"]
CHANNEL_OPTIONS = [16, 24, 32, 48, 64, 96, 128]
N_LAYERS = 6


@dataclass
class Architecture:
    ops: List[str]          # operation per layer
    channels: List[int]     # output channels per layer
    fitness: float = 0.0
    latency: float = 0.0
    accuracy: float = 0.0


# ── Latency lookup table (simulated) ──
# In practice, benchmark each op on real hardware
LATENCY_TABLE = {
    # (op, C_in, C_out, resolution) → latency in ms
    "conv3x3":     lambda c_in, c_out, res: c_in * c_out * 9 * res**2 / 5e9,
    "dwconv3x3":   lambda c_in, c_out, res: (c_in * 9 + c_in * c_out) * res**2 / 5e9,
    "dwconv5x5":   lambda c_in, c_out, res: (c_in * 25 + c_in * c_out) * res**2 / 5e9,
    "mbconv3_t3":  lambda c_in, c_out, res: (c_in * c_in*3 + c_in*3*9 + c_in*3*c_out) * res**2 / 5e9,
    "mbconv3_t6":  lambda c_in, c_out, res: (c_in * c_in*6 + c_in*6*9 + c_in*6*c_out) * res**2 / 5e9,
}


def predict_latency(arch: Architecture) -> float:
    """Predict total latency using the lookup table."""
    total = 0.0
    c_in = 3  # RGB input
    res = 224
    for op, c_out in zip(arch.ops, arch.channels):
        lat_fn = LATENCY_TABLE[op]
        total += lat_fn(c_in, c_out, res)
        c_in = c_out
        res = max(res // 2, 7)  # assume stride-2 every layer
    return total


def predict_accuracy(arch: Architecture) -> float:
    """
    Accuracy predictor (simulated).
    In practice: train a small MLP on (architecture_features, accuracy) pairs
    from a subset of evaluated architectures.
    """
    # Heuristic: more parameters and wider channels → higher accuracy
    total_params = 0
    c_in = 3
    for op, c_out in zip(arch.ops, arch.channels):
        if "conv3x3" == op:
            total_params += c_in * c_out * 9
        elif "dw" in op:
            total_params += c_in * 9 + c_in * c_out
        else:  # mbconv
            t = 3 if "t3" in op else 6
            total_params += c_in * c_in*t + c_in*t*9 + c_in*t*c_out
        c_in = c_out

    # Simulated accuracy (log-scaled params with noise)
    acc = 60 + 5 * np.log10(max(total_params, 1)) + random.gauss(0, 0.5)
    return min(acc, 95.0)


def random_architecture() -> Architecture:
    ops = [random.choice(OPERATIONS) for _ in range(N_LAYERS)]
    channels = [random.choice(CHANNEL_OPTIONS) for _ in range(N_LAYERS)]
    return Architecture(ops=ops, channels=channels)


def mutate(arch: Architecture) -> Architecture:
    """Mutate one random aspect of the architecture."""
    new = Architecture(ops=list(arch.ops), channels=list(arch.channels))
    if random.random() < 0.5:
        # Mutate an operation
        idx = random.randint(0, N_LAYERS - 1)
        new.ops[idx] = random.choice(OPERATIONS)
    else:
        # Mutate channel width
        idx = random.randint(0, N_LAYERS - 1)
        new.channels[idx] = random.choice(CHANNEL_OPTIONS)
    return new


def crossover(a: Architecture, b: Architecture) -> Architecture:
    """Single-point crossover."""
    point = random.randint(1, N_LAYERS - 1)
    return Architecture(
        ops=a.ops[:point] + b.ops[point:],
        channels=a.channels[:point] + b.channels[point:],
    )


# ── Evolutionary Search ──
def evolutionary_search(
    latency_budget: float = 5.0,
    population_size: int = 50,
    generations: int = 30,
    tournament_size: int = 5,
    penalty_weight: float = 100.0,
):
    """
    Search for the best architecture under a latency constraint.
    Uses regularized tournament selection.
    """
    # Initialize population
    population = [random_architecture() for _ in range(population_size)]

    for gen in range(generations):
        # Evaluate
        for arch in population:
            arch.latency = predict_latency(arch)
            arch.accuracy = predict_accuracy(arch)
            # Penalize latency violations
            violation = max(0, arch.latency - latency_budget)
            arch.fitness = arch.accuracy - penalty_weight * violation

        # Sort by fitness
        population.sort(key=lambda a: a.fitness, reverse=True)
        best = population[0]

        if gen % 5 == 0 or gen == generations - 1:
            print(f"Gen {gen:3d}: best_acc={best.accuracy:.2f}%, "
                  f"lat={best.latency:.2f}ms, "
                  f"fitness={best.fitness:.2f}, "
                  f"feasible={best.latency <= latency_budget}")

        # Selection + reproduction
        new_population = population[:5]  # elitism: keep top 5
        while len(new_population) < population_size:
            # Tournament selection
            candidates = random.sample(population, tournament_size)
            parent1 = max(candidates, key=lambda a: a.fitness)
            candidates = random.sample(population, tournament_size)
            parent2 = max(candidates, key=lambda a: a.fitness)

            child = crossover(parent1, parent2)
            child = mutate(child)
            new_population.append(child)

        population = new_population

    # Return Pareto-optimal results
    feasible = [a for a in population if a.latency <= latency_budget]
    feasible.sort(key=lambda a: a.accuracy, reverse=True)
    return feasible[0] if feasible else population[0]


# ── Run search ──
print("Searching for best architecture under 5ms latency budget...\\n")
best = evolutionary_search(latency_budget=5.0)

print(f"\\nBest architecture found:")
print(f"  Predicted accuracy: {best.accuracy:.2f}%")
print(f"  Predicted latency:  {best.latency:.2f} ms")
print(f"  Architecture:")
for i, (op, ch) in enumerate(zip(best.ops, best.channels)):
    print(f"    Layer {i}: {op:15s} → {ch} channels")`
        },
      ]
    },

    // ──────────────────────────────────────────────────────────
    // Section 4: NVIDIA 2:4 Structured Sparsity
    // ──────────────────────────────────────────────────────────
    {
      id: "nvidia-2-4-sparsity-lab",
      title: "NVIDIA 2:4 Structured Sparsity",
      icon: "⚡",
      items: [

        // ── 4.1 Implement and Verify 2:4 Sparsity ──
        {
          title: "2:4 Sparsity: Implementation, Verification & Fine-tuning",
          lang: "python",
          filename: "sparsity_2_4_full.py",
          desc: "Full 2:4 sparsity pipeline: create masks, apply to pretrained model, fine-tune, verify constraint, measure compression.",
          code: `"""
Complete 2:4 Structured Sparsity Pipeline.
1. Create 2:4 masks for all eligible layers
2. Apply to pretrained model
3. Fine-tune with frozen sparsity pattern
4. Verify the 2:4 constraint
5. Measure compression and simulated speedup
"""
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import DataLoader, TensorDataset
import copy


def create_2_4_mask(tensor):
    """
    Create a 2:4 sparsity mask: for every group of 4 consecutive
    elements along the last dimension, keep the 2 with largest magnitude.
    """
    shape = tensor.shape
    # Reshape to 2D for processing
    flat = tensor.reshape(-1, 4)
    mask = torch.zeros_like(flat)
    # Top-2 per group by absolute value
    _, indices = flat.abs().topk(2, dim=1)
    mask.scatter_(1, indices, 1.0)
    return mask.reshape(shape)


def verify_2_4_constraint(tensor, mask):
    """Verify every group of 4 has exactly 2 non-zeros."""
    masked = tensor * mask
    flat = masked.reshape(-1, 4)
    nnz_per_group = (flat != 0).sum(dim=1)
    # Groups where mask is all-zero (original values were zero) are ok
    valid = (nnz_per_group == 2) | (nnz_per_group == 0)
    return valid.all().item()


class SparsityManager:
    """Manages 2:4 sparsity for a model."""

    def __init__(self, model, eligible_types=(nn.Linear, nn.Conv2d)):
        self.model = model
        self.masks = {}
        self.eligible_types = eligible_types

    def apply_sparsity(self):
        """Compute and apply 2:4 masks to all eligible layers."""
        for name, module in self.model.named_modules():
            if isinstance(module, self.eligible_types):
                w = module.weight.data
                original_shape = w.shape
                # Reshape to 2D: (out_features, in_features * k * k)
                w_2d = w.reshape(w.shape[0], -1)

                # Pad to multiple of 4
                pad = (4 - w_2d.shape[1] % 4) % 4
                if pad > 0:
                    w_2d = F.pad(w_2d, (0, pad))

                mask_2d = create_2_4_mask(w_2d)

                # Remove padding
                if pad > 0:
                    mask_2d = mask_2d[:, :w_2d.shape[1] - pad]

                mask = mask_2d.reshape(original_shape)
                self.masks[name] = mask

                # Apply mask
                module.weight.data *= mask

                # Report
                density = mask.sum() / mask.numel()
                print(f"  {name}: {density:.1%} dense "
                      f"({mask.sum().int()}/{mask.numel()} weights)")

    def enforce_masks(self):
        """Re-apply masks after optimizer step (to maintain sparsity)."""
        for name, module in self.model.named_modules():
            if name in self.masks:
                module.weight.data *= self.masks[name]

    def verify_all(self):
        """Verify 2:4 constraint on all masked layers."""
        all_valid = True
        for name, module in self.model.named_modules():
            if name in self.masks:
                w = module.weight.data
                mask = self.masks[name]
                valid = verify_2_4_constraint(w, mask)
                status = "PASS" if valid else "FAIL"
                print(f"  {name}: {status}")
                all_valid = all_valid and valid
        return all_valid


# ── Demo: Apply 2:4 sparsity and fine-tune ──

# Simple model
class DemoNet(nn.Module):
    def __init__(self):
        super().__init__()
        self.features = nn.Sequential(
            nn.Conv2d(3, 32, 3, padding=1, bias=False),
            nn.BatchNorm2d(32), nn.ReLU(),
            nn.Conv2d(32, 64, 3, padding=1, bias=False),
            nn.BatchNorm2d(64), nn.ReLU(),
            nn.AdaptiveAvgPool2d(1),
        )
        self.classifier = nn.Linear(64, 10)

    def forward(self, x):
        x = self.features(x)
        return self.classifier(x.flatten(1))


model = DemoNet()
print("Applying 2:4 sparsity:")
manager = SparsityManager(model)
manager.apply_sparsity()

# ── Fine-tune with sparsity mask frozen ──
print("\\nFine-tuning with frozen sparsity pattern...")
optimizer = torch.optim.SGD(model.parameters(), lr=0.01, momentum=0.9)

# Synthetic data
train_data = TensorDataset(
    torch.randn(128, 3, 16, 16),
    torch.randint(0, 10, (128,))
)
loader = DataLoader(train_data, batch_size=32, shuffle=True)

model.train()
for epoch in range(3):
    total_loss = 0
    for x, y in loader:
        optimizer.zero_grad()
        loss = F.cross_entropy(model(x), y)
        loss.backward()
        optimizer.step()
        # Critical: re-apply masks after each optimizer step
        manager.enforce_masks()
        total_loss += loss.item()
    print(f"  Epoch {epoch+1}: loss={total_loss/len(loader):.4f}")

# ── Verify constraint still holds after fine-tuning ──
print("\\nVerifying 2:4 constraint after fine-tuning:")
assert manager.verify_all(), "2:4 constraint violated!"
print("All constraints verified!")

# ── Compression stats ──
total_params = sum(p.numel() for p in model.parameters())
sparse_params = sum(m.sum().int().item() for m in manager.masks.values())
all_masked = sum(m.numel() for m in manager.masks.values())
print(f"\\nCompression: {all_masked} weights → {sparse_params} non-zero")
print(f"Effective sparsity: {1 - sparse_params/all_masked:.1%}")
print(f"Simulated speedup (GEMM only): 2.0x on Ampere+ GPUs")`
        },
      ]
    },

    // ──────────────────────────────────────────────────────────
    // Section 5: Combined Compression Pipeline
    // ──────────────────────────────────────────────────────────
    {
      id: "combined-compression-lab",
      title: "Combined Compression: Prune + Distill + Quantize",
      icon: "🗜️",
      items: [

        // ── 5.1 Full Pipeline ──
        {
          title: "End-to-End Compression Pipeline with Metrics",
          lang: "python",
          filename: "full_compression_pipeline.py",
          desc: "Complete pipeline: structured pruning → knowledge distillation → INT8 quantization, with accuracy/size/latency measurements at every stage.",
          code: `"""
Full Compression Pipeline: Prune → Distill → Quantize
Each stage measured for accuracy, model size, and latency.

This is the gold-standard pipeline used in production edge AI.
"""
import torch
import torch.nn as nn
import torch.nn.functional as F
import time
import copy


# ── Models ──
class TeacherNet(nn.Module):
    """Large model (teacher)."""
    def __init__(self, ch=128, num_classes=10):
        super().__init__()
        self.net = nn.Sequential(
            nn.Conv2d(3, ch, 3, padding=1, bias=False),
            nn.BatchNorm2d(ch), nn.ReLU(),
            nn.Conv2d(ch, ch*2, 3, stride=2, padding=1, bias=False),
            nn.BatchNorm2d(ch*2), nn.ReLU(),
            nn.Conv2d(ch*2, ch*4, 3, stride=2, padding=1, bias=False),
            nn.BatchNorm2d(ch*4), nn.ReLU(),
            nn.AdaptiveAvgPool2d(1), nn.Flatten(),
            nn.Linear(ch*4, num_classes),
        )
    def forward(self, x):
        return self.net(x)


class StudentNet(nn.Module):
    """Small model (student) — structurally pruned version."""
    def __init__(self, ch=48, num_classes=10):
        super().__init__()
        self.net = nn.Sequential(
            nn.Conv2d(3, ch, 3, padding=1, bias=False),
            nn.BatchNorm2d(ch), nn.ReLU(),
            nn.Conv2d(ch, ch*2, 3, stride=2, padding=1, bias=False),
            nn.BatchNorm2d(ch*2), nn.ReLU(),
            nn.Conv2d(ch*2, ch*4, 3, stride=2, padding=1, bias=False),
            nn.BatchNorm2d(ch*4), nn.ReLU(),
            nn.AdaptiveAvgPool2d(1), nn.Flatten(),
            nn.Linear(ch*4, num_classes),
        )
    def forward(self, x):
        return self.net(x)


# ── Utilities ──
def count_params(model):
    return sum(p.numel() for p in model.parameters())

def model_size(model, bits=32):
    return count_params(model) * bits / 8 / 1024  # KB

def measure_latency(model, shape=(1, 3, 32, 32), runs=100):
    model.eval()
    x = torch.randn(shape)
    with torch.no_grad():
        for _ in range(20):
            model(x)
        t0 = time.perf_counter()
        for _ in range(runs):
            model(x)
        return (time.perf_counter() - t0) / runs * 1000  # ms

def evaluate(model, data_x, data_y):
    model.eval()
    with torch.no_grad():
        logits = model(data_x)
        preds = logits.argmax(dim=1)
        return (preds == data_y).float().mean().item() * 100


# ── Synthetic data ──
torch.manual_seed(42)
N = 512
data_x = torch.randn(N, 3, 32, 32)
data_y = torch.randint(0, 10, (N,))
test_x, test_y = data_x[:128], data_y[:128]
train_x, train_y = data_x[128:], data_y[128:]


# ═══════════════════════════════════════════
# Stage 0: Train Teacher
# ═══════════════════════════════════════════
teacher = TeacherNet(ch=128)
opt = torch.optim.Adam(teacher.parameters(), lr=1e-3)
teacher.train()
for epoch in range(10):
    opt.zero_grad()
    loss = F.cross_entropy(teacher(train_x), train_y)
    loss.backward()
    opt.step()

t_acc = evaluate(teacher, test_x, test_y)
t_size = model_size(teacher)
t_lat = measure_latency(teacher)
print(f"{'='*60}")
print(f"TEACHER: {count_params(teacher):,} params, "
      f"{t_size:.1f} KB, {t_lat:.2f} ms, acc={t_acc:.1f}%")
print(f"{'='*60}")


# ═══════════════════════════════════════════
# Stage 1: Structural Pruning (smaller student)
# ═══════════════════════════════════════════
student = StudentNet(ch=48)
s_size = model_size(student)
s_lat = measure_latency(student)
compression = count_params(teacher) / count_params(student)
print(f"\\nStage 1 — Pruned student: {count_params(student):,} params, "
      f"{s_size:.1f} KB, {s_lat:.2f} ms ({compression:.1f}x smaller)")


# ═══════════════════════════════════════════
# Stage 2: Knowledge Distillation
# ═══════════════════════════════════════════
teacher.eval()
student.train()
opt = torch.optim.Adam(student.parameters(), lr=1e-3)
T, alpha = 4.0, 0.2

for epoch in range(20):
    opt.zero_grad()
    s_logits = student(train_x)
    with torch.no_grad():
        t_logits = teacher(train_x)

    hard_loss = F.cross_entropy(s_logits, train_y)
    soft_loss = F.kl_div(
        F.log_softmax(s_logits / T, dim=1),
        F.softmax(t_logits / T, dim=1),
        reduction='batchmean'
    ) * T * T

    loss = alpha * hard_loss + (1 - alpha) * soft_loss
    loss.backward()
    opt.step()

s_acc_distilled = evaluate(student, test_x, test_y)
print(f"\\nStage 2 — After distillation: acc={s_acc_distilled:.1f}%")


# ═══════════════════════════════════════════
# Stage 3: INT8 Quantization (simulated)
# ═══════════════════════════════════════════
def simulate_quantize(model):
    """Simulate INT8 by quantizing/dequantizing all weights."""
    qmodel = copy.deepcopy(model)
    for name, param in qmodel.named_parameters():
        if param.dim() >= 2:  # skip biases/BN
            amax = param.data.abs().max()
            if amax > 0:
                scale = amax / 127.0
                param.data = (torch.round(param.data / scale)
                             .clamp(-127, 127) * scale)
    return qmodel

q_student = simulate_quantize(student)
q_acc = evaluate(q_student, test_x, test_y)
q_size = model_size(student, bits=8)
q_lat = measure_latency(q_student)  # simulated (real INT8 needs runtime)

print(f"\\nStage 3 — After INT8 quantization: acc={q_acc:.1f}%, "
      f"{q_size:.1f} KB, {q_lat:.2f} ms")


# ═══════════════════════════════════════════
# Summary
# ═══════════════════════════════════════════
print(f"\\n{'='*60}")
print(f"COMPRESSION SUMMARY")
print(f"{'='*60}")
print(f"{'Stage':<30s} {'Params':>10s} {'Size':>10s} {'Acc':>8s}")
print(f"{'-'*60}")
print(f"{'Teacher (FP32)':<30s} {count_params(teacher):>10,} {t_size:>8.1f}KB {t_acc:>7.1f}%")
print(f"{'Pruned student (FP32)':<30s} {count_params(student):>10,} {s_size:>8.1f}KB {'--':>7s}")
print(f"{'+ Distillation (FP32)':<30s} {count_params(student):>10,} {s_size:>8.1f}KB {s_acc_distilled:>7.1f}%")
print(f"{'+ INT8 Quantization':<30s} {count_params(student):>10,} {q_size:>8.1f}KB {q_acc:>7.1f}%")
print(f"{'-'*60}")
print(f"Total compression: {t_size/q_size:.1f}x size reduction")`
        },
      ]
    },

    // ──────────────────────────────────────────────────────────
    // Section 6: Cross-Platform Model Family
    // ──────────────────────────────────────────────────────────
    {
      id: "cross-platform-deployment",
      title: "Cross-Platform Model Export & Validation",
      icon: "🌐",
      items: [

        // ── 6.1 Multi-Format Export ──
        {
          title: "Export Model to ONNX + Validate Numerical Equivalence",
          lang: "python",
          filename: "cross_platform_export.py",
          desc: "Export a PyTorch model to ONNX, run inference in both PyTorch and ONNX Runtime, and validate numerical equivalence with cosine similarity.",
          code: `"""
Cross-Platform Export & Validation.
PyTorch → ONNX → validate numerical equivalence.
Extends to TFLite/TensorRT/CoreML in production.
"""
import torch
import torch.nn as nn
import numpy as np
import os
import tempfile

try:
    import onnx
    import onnxruntime as ort
    HAS_ONNX = True
except ImportError:
    HAS_ONNX = False
    print("Install onnx + onnxruntime: pip install onnx onnxruntime")


class EdgeModel(nn.Module):
    """Simple edge-friendly model for export demo."""
    def __init__(self):
        super().__init__()
        self.features = nn.Sequential(
            nn.Conv2d(3, 32, 3, stride=2, padding=1, bias=False),
            nn.BatchNorm2d(32), nn.ReLU6(),
            # Depthwise separable
            nn.Conv2d(32, 32, 3, padding=1, groups=32, bias=False),
            nn.BatchNorm2d(32), nn.ReLU6(),
            nn.Conv2d(32, 64, 1, bias=False),
            nn.BatchNorm2d(64), nn.ReLU6(),
            nn.AdaptiveAvgPool2d(1),
        )
        self.classifier = nn.Linear(64, 10)

    def forward(self, x):
        x = self.features(x)
        return self.classifier(x.flatten(1))


def export_to_onnx(model, input_shape, path):
    """Export PyTorch model to ONNX format."""
    model.eval()
    dummy = torch.randn(input_shape)
    torch.onnx.export(
        model, dummy, path,
        input_names=["input"],
        output_names=["output"],
        dynamic_axes=None,  # static shapes for edge
        opset_version=13,
        do_constant_folding=True,
    )
    # Validate ONNX model
    onnx_model = onnx.load(path)
    onnx.checker.check_model(onnx_model)
    return path


def validate_equivalence(model, onnx_path, input_shape, n_tests=10):
    """
    Validate numerical equivalence between PyTorch and ONNX Runtime.
    """
    model.eval()
    session = ort.InferenceSession(onnx_path)

    cosine_sims = []
    max_abs_errors = []

    for _ in range(n_tests):
        x_np = np.random.randn(*input_shape).astype(np.float32)
        x_torch = torch.from_numpy(x_np)

        # PyTorch inference
        with torch.no_grad():
            pt_out = model(x_torch).numpy().flatten()

        # ONNX Runtime inference
        ort_out = session.run(None, {"input": x_np})[0].flatten()

        # Cosine similarity
        cos_sim = np.dot(pt_out, ort_out) / (
            np.linalg.norm(pt_out) * np.linalg.norm(ort_out) + 1e-8
        )
        cosine_sims.append(cos_sim)

        # Max absolute error
        max_err = np.abs(pt_out - ort_out).max()
        max_abs_errors.append(max_err)

    return {
        "cosine_sim_mean": np.mean(cosine_sims),
        "cosine_sim_min": np.min(cosine_sims),
        "max_abs_error_mean": np.mean(max_abs_errors),
        "max_abs_error_max": np.max(max_abs_errors),
    }


# ── Demo ──
model = EdgeModel()
model.eval()
input_shape = (1, 3, 224, 224)

params = sum(p.numel() for p in model.parameters())
print(f"Model: {params:,} parameters")

if HAS_ONNX:
    with tempfile.NamedTemporaryFile(suffix=".onnx", delete=False) as f:
        onnx_path = f.name

    print(f"\\nExporting to ONNX (opset 13)...")
    export_to_onnx(model, input_shape, onnx_path)

    onnx_size = os.path.getsize(onnx_path) / 1024
    print(f"ONNX model size: {onnx_size:.1f} KB")

    print(f"\\nValidating numerical equivalence (10 random inputs)...")
    results = validate_equivalence(model, onnx_path, input_shape)
    print(f"  Cosine similarity: {results['cosine_sim_mean']:.6f} "
          f"(min: {results['cosine_sim_min']:.6f})")
    print(f"  Max absolute error: {results['max_abs_error_mean']:.2e} "
          f"(worst: {results['max_abs_error_max']:.2e})")

    threshold = 0.999
    if results["cosine_sim_min"] >= threshold:
        print(f"\\n  PASS: cosine similarity >= {threshold}")
    else:
        print(f"\\n  FAIL: cosine similarity < {threshold}")
        print("  Investigate: check for non-deterministic ops, "
              "dynamic shapes, or unsupported operations.")

    os.unlink(onnx_path)
else:
    print("\\nSkipping ONNX export (onnx/onnxruntime not installed).")
    print("To run this example:")
    print("  pip install onnx onnxruntime")`
        },
      ]
    },

  ];
})();
