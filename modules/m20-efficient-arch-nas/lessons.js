// Patches the Efficient Architecture Design & Hardware-Aware NAS module (m20) with full tutorial lesson content.
// Loaded after curriculum.js. m20 = CURRICULUM.phases[5].modules[4]
(function patchEfficientArchNASLessons() {
  const m = CURRICULUM.phases[5].modules[4]; // phase-6 (index 5), fifth module (m20)

  m.lessons = [

    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 1 — Efficient Architecture Design Principles
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "efficient-arch-design-principles",
      title: "Efficient Architecture Design Principles",
      readTime: "18 min",
      content: [
        {
          type: "text",
          text: "Designing efficient neural networks is not about making big models smaller — it is about building architectures that are inherently efficient from the ground up. The difference matters: a well-designed small model consistently outperforms a large model that has been compressed after the fact. This lesson covers the fundamental principles that separate efficient architectures from merely small ones."
        },
        {
          type: "callout",
          variant: "info",
          title: "FLOPs Are a Lie",
          text: "Two models with identical FLOPs can have 5x different latency on the same hardware. Why? Because FLOPs count arithmetic operations but ignore memory access patterns, parallelism, and hardware utilization. A depthwise convolution has very few FLOPs but terrible arithmetic intensity — the hardware spends most of its time waiting for memory. Always benchmark on target hardware; never trust FLOP counts alone."
        },

        // ── Section 1: Why FLOPs ≠ Latency ──
        {
          type: "heading",
          text: "Why FLOPs Do Not Equal Latency"
        },
        {
          type: "text",
          text: "The disconnect between FLOPs and latency comes from three factors that FLOP counting ignores: (1) Memory Access Cost (MAC) — every operation must read inputs from and write outputs to memory. A 1x1 convolution and a 3x3 depthwise convolution might have similar FLOPs, but the 1x1 conv has much higher arithmetic intensity (FLOPs per byte transferred), making it far more hardware-friendly. (2) Parallelism — hardware accelerators are massively parallel. Operations with small channel counts cannot saturate the compute units, leaving most of the chip idle. A layer with 16 channels on hardware with 128 parallel units runs at 12.5% utilization. (3) Operator Overhead — each operator (conv, relu, add) has a fixed dispatch cost. Architectures with many tiny layers (e.g., aggressive residual connections) accumulate significant overhead."
        },
        {
          type: "comparison",
          headers: ["Metric", "What It Measures", "Correlates with Latency?", "When to Use"],
          rows: [
            ["FLOPs (MACs)", "Total multiply-accumulate operations", "Weakly — ignores memory", "Rough initial comparison"],
            ["Parameter Count", "Number of learnable weights", "Poorly — small model can be slow", "Model size on disk/RAM"],
            ["Memory Access Cost", "Total bytes read + written", "Strongly for memory-bound ops", "Edge/mobile optimization"],
            ["Arithmetic Intensity", "FLOPs / bytes transferred", "Strongly — predicts HW utilization", "Architecture design decisions"],
            ["Actual Latency", "Wall-clock inference time", "Perfect (it IS the metric)", "Final evaluation — always measure"],
          ]
        },
        {
          type: "code",
          lang: "python",
          filename: "measure_flops_vs_latency.py",
          desc: "Demonstrate the FLOPs-latency gap: compare models with similar FLOPs but different latencies.",
          code: `"""
Compare FLOPs vs actual latency for architectures with
similar theoretical compute but very different real-world speed.
"""
import torch
import torch.nn as nn
import time
from thop import profile  # pip install thop

def benchmark_model(model, input_shape=(1, 3, 224, 224), warmup=10, runs=100):
    """Benchmark latency on CPU."""
    x = torch.randn(input_shape)
    model.eval()
    # Warmup
    for _ in range(warmup):
        with torch.no_grad():
            model(x)
    # Timed runs
    start = time.perf_counter()
    for _ in range(runs):
        with torch.no_grad():
            model(x)
    elapsed = (time.perf_counter() - start) / runs * 1000  # ms
    return elapsed

# Model A: standard 3x3 conv (high arithmetic intensity)
model_a = nn.Sequential(
    nn.Conv2d(3, 64, 3, padding=1, stride=2),
    nn.ReLU(),
    nn.Conv2d(64, 128, 3, padding=1, stride=2),
    nn.ReLU(),
    nn.AdaptiveAvgPool2d(1),
    nn.Flatten(),
    nn.Linear(128, 10),
)

# Model B: many depthwise + pointwise layers (low arithmetic intensity per layer)
model_b = nn.Sequential(
    nn.Conv2d(3, 64, 1), nn.ReLU(),       # pointwise expand
    nn.Conv2d(64, 64, 3, padding=1, stride=2, groups=64), nn.ReLU(),  # depthwise
    nn.Conv2d(64, 64, 1), nn.ReLU(),       # pointwise project
    nn.Conv2d(64, 128, 1), nn.ReLU(),      # pointwise expand
    nn.Conv2d(128, 128, 3, padding=1, stride=2, groups=128), nn.ReLU(), # depthwise
    nn.Conv2d(128, 128, 1), nn.ReLU(),     # pointwise project
    nn.AdaptiveAvgPool2d(1),
    nn.Flatten(),
    nn.Linear(128, 10),
)

x = torch.randn(1, 3, 224, 224)
flops_a, params_a = profile(model_a, inputs=(x,), verbose=False)
flops_b, params_b = profile(model_b, inputs=(x,), verbose=False)

lat_a = benchmark_model(model_a)
lat_b = benchmark_model(model_b)

print(f"Model A: {flops_a/1e6:.1f} MFLOPs, {params_a/1e3:.1f}K params, {lat_a:.2f} ms")
print(f"Model B: {flops_b/1e6:.1f} MFLOPs, {params_b/1e3:.1f}K params, {lat_b:.2f} ms")
print(f"FLOP ratio (B/A): {flops_b/flops_a:.2f}x")
print(f"Latency ratio (B/A): {lat_b/lat_a:.2f}x  <-- this is what matters")`
        },

        // ── Section 2: Depthwise Separable Convolutions ──
        {
          type: "heading",
          text: "Depthwise Separable Convolutions: The Foundation of Efficient Design"
        },
        {
          type: "text",
          text: "A standard 3x3 convolution with C_in input channels and C_out output channels costs K*K*C_in*C_out*H*W FLOPs. Depthwise separable convolutions factor this into two steps: (1) Depthwise — apply one K*K filter per input channel independently (cost: K*K*C_in*H*W), and (2) Pointwise — combine channels with a 1x1 convolution (cost: C_in*C_out*H*W). The total cost ratio is 1/C_out + 1/K^2, which for a 3x3 conv with 128 output channels gives ~8-9x reduction in FLOPs. But the real advantage is deeper than FLOPs: the depthwise step is memory-bound (low arithmetic intensity) while the pointwise step is compute-bound (high arithmetic intensity). Hardware can pipeline these two phases efficiently when the channel counts are large enough."
        },
        {
          type: "diagram",
          code: `Standard Conv (3x3, Cin=64, Cout=128):
  ┌──────────────────────────────────────────────┐
  │  64 input channels × 128 filters × 3×3       │
  │  FLOPs: 3×3×64×128×H×W = 73,728·H·W         │
  │  One fused operation — high arithmetic        │
  │  intensity, good HW utilization               │
  └──────────────────────────────────────────────┘

Depthwise Separable Conv (3x3, Cin=64, Cout=128):
  ┌──────────────────────────┐    ┌────────────────────────────┐
  │  Step 1: Depthwise       │    │  Step 2: Pointwise (1×1)   │
  │  64 filters × 3×3        │ →  │  64×128 × H × W            │
  │  FLOPs: 576·H·W          │    │  FLOPs: 8,192·H·W          │
  │  Memory-bound             │    │  Compute-bound              │
  └──────────────────────────┘    └────────────────────────────┘
  Total: 8,768·H·W  (8.4x fewer FLOPs than standard)`
        },

        // ── Section 3: Inverted Residuals ──
        {
          type: "heading",
          text: "Inverted Residuals & Linear Bottlenecks (MobileNetV2)"
        },
        {
          type: "text",
          text: "MobileNetV1 used depthwise separable convolutions but had a problem: the depthwise layer operates on a small number of channels, meaning information flows through a bottleneck. MobileNetV2 flipped the script with inverted residuals: (1) Expand — a 1x1 conv expands from a narrow bottleneck to a wider intermediate representation (expansion ratio t, typically 6), (2) Depthwise — a 3x3 depthwise conv operates on the expanded channels where there is enough capacity, (3) Project — a 1x1 conv projects back down to the narrow bottleneck. The residual connection is on the narrow bottleneck (not the wide expansion), keeping the skip connection memory-efficient. Crucially, the projection uses a linear activation (no ReLU) — this is the 'linear bottleneck' insight. ReLU on low-dimensional features destroys information; keeping the bottleneck linear preserves it."
        },
        {
          type: "code",
          lang: "python",
          filename: "inverted_residual.py",
          desc: "MobileNetV2 inverted residual block implementation with the linear bottleneck.",
          code: `"""
MobileNetV2 Inverted Residual Block.
Key design choices:
  1. Expand → Depthwise → Project (inverted from standard bottleneck)
  2. Linear activation on the projection (no ReLU on narrow features)
  3. Residual on the narrow bottleneck (memory-efficient)
"""
import torch
import torch.nn as nn


class InvertedResidual(nn.Module):
    def __init__(self, in_ch, out_ch, stride, expand_ratio):
        super().__init__()
        self.use_residual = (stride == 1 and in_ch == out_ch)
        hidden = int(in_ch * expand_ratio)

        layers = []
        # Expand (skip if expand_ratio == 1)
        if expand_ratio != 1:
            layers.extend([
                nn.Conv2d(in_ch, hidden, 1, bias=False),
                nn.BatchNorm2d(hidden),
                nn.ReLU6(inplace=True),
            ])
        # Depthwise
        layers.extend([
            nn.Conv2d(hidden, hidden, 3, stride=stride, padding=1,
                      groups=hidden, bias=False),
            nn.BatchNorm2d(hidden),
            nn.ReLU6(inplace=True),
        ])
        # Project (LINEAR — no activation!)
        layers.extend([
            nn.Conv2d(hidden, out_ch, 1, bias=False),
            nn.BatchNorm2d(out_ch),
            # No ReLU here — this is the linear bottleneck
        ])
        self.block = nn.Sequential(*layers)

    def forward(self, x):
        if self.use_residual:
            return x + self.block(x)
        return self.block(x)


# ── Verify parameter counts ──
block = InvertedResidual(in_ch=24, out_ch=24, stride=1, expand_ratio=6)
params = sum(p.numel() for p in block.parameters())
print(f"Inverted residual (24→24, t=6): {params:,} params")

# Compare to a standard 3x3 conv
std_conv = nn.Conv2d(24, 24, 3, padding=1)
std_params = sum(p.numel() for p in std_conv.parameters())
print(f"Standard 3x3 conv (24→24):      {std_params:,} params")
print(f"Ratio: {params / std_params:.1f}x")`
        },

        // ── Section 4: Compound Scaling ──
        {
          type: "heading",
          text: "Compound Scaling: EfficientNet's Key Insight"
        },
        {
          type: "text",
          text: "Before EfficientNet, models were scaled in a single dimension: deeper (ResNet-18 → 152), wider (WideResNet), or higher resolution. Tan and Le showed that scaling all three dimensions together with a fixed ratio works dramatically better. The compound scaling rule uses a compound coefficient phi: depth = alpha^phi, width = beta^phi, resolution = gamma^phi, subject to alpha * beta^2 * gamma^2 ≈ 2 (so that total FLOPs increase by roughly 2^phi). The base architecture (EfficientNet-B0) is found via NAS, then scaled up to B1-B7 using this rule. EfficientNet-B0 achieves 77.3% ImageNet top-1 with just 5.3M params — comparable to ResNet-50 (25.6M params) at 5x fewer parameters."
        },
        {
          type: "comparison",
          headers: ["Model", "Params (M)", "FLOPs (B)", "ImageNet Top-1 (%)", "Scaling Method"],
          rows: [
            ["ResNet-50", "25.6", "4.1", "76.0", "Depth only"],
            ["ResNet-152", "60.2", "11.6", "77.8", "Depth only"],
            ["WideResNet-50-2", "68.9", "11.4", "78.1", "Width only"],
            ["EfficientNet-B0", "5.3", "0.39", "77.3", "Compound (NAS baseline)"],
            ["EfficientNet-B3", "12.0", "1.8", "81.6", "Compound scaled"],
            ["EfficientNet-B7", "66.0", "37.0", "84.3", "Compound scaled"],
            ["EfficientNetV2-S", "21.5", "8.4", "83.9", "Compound + progressive"],
          ]
        },

        // ── Section 5: Extreme Efficiency ──
        {
          type: "heading",
          text: "Architectures for Extreme Resource Constraints"
        },
        {
          type: "text",
          text: "When deploying to microcontrollers (ARM Cortex-M, 256KB SRAM, no FPU), even MobileNet is too large. A new class of architectures pushes efficiency to the extreme: ShuffleNetV2 uses channel shuffle operations to enable cross-group information flow without the FLOPs of full 1x1 convolutions. GhostNet generates 'ghost' feature maps from cheap linear transformations of existing ones, avoiding redundant computation. MCUNet (MIT HAN Lab) co-designs the model architecture and the inference engine together — the architecture search is aware of exactly how the inference code will tile computations and use the limited SRAM. MCUNet achieves 70.7% ImageNet top-1 accuracy on a Cortex-M7 with just 1MB flash and 320KB SRAM — something that was previously considered impossible."
        },
        {
          type: "diagram",
          code: `Efficiency Frontier: Architectures by Resource Budget

  Target Platform         SRAM      Typical Architecture      ImageNet Top-1
  ┌─────────────────────────────────────────────────────────────────────────┐
  │ Cloud GPU (A100)      80 GB     EfficientNetV2-L / ViT-L    ~85%      │
  │ Edge GPU (Jetson)     8 GB      EfficientNet-B3 / YOLOv8    ~82%      │
  │ Mobile (phone)        4-6 GB    MobileNetV3 / EfficientLite ~78%      │
  │ DSP (Hexagon)         ~8 MB     ShuffleNetV2 0.5x            ~61%     │
  │ MCU (Cortex-M7)       320 KB    MCUNet / MicroNets            ~71%    │
  │ MCU (Cortex-M4)       256 KB    MCUNet-5fps                   ~63%    │
  └─────────────────────────────────────────────────────────────────────────┘

  Key insight: each hardware tier needs fundamentally different architectures,
  not just scaled-down versions of the same model.`
        },
        {
          type: "callout",
          variant: "tip",
          title: "Design Rules of Thumb",
          text: "From years of efficient architecture research, a few robust principles have emerged: (1) Avoid low-arithmetic-intensity operations at high resolution — push depthwise convolutions to later (lower-resolution) stages. (2) Use wide-then-narrow rather than narrow-then-wide — expand early, compress late. (3) Match channel widths to hardware vector widths — multiples of 8 (CPU NEON), 32 (GPU warps), or 64 (NPU). (4) Minimize activation memory, not just parameters — activations dominate memory in inference. (5) Benchmark, don't calculate — the only trustworthy metric is wall-clock time on target hardware."
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 2 — Neural Architecture Search: Search Spaces & Strategies
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "nas-search-spaces-strategies",
      title: "Neural Architecture Search: Search Spaces & Strategies",
      readTime: "20 min",
      content: [
        {
          type: "text",
          text: "Neural Architecture Search (NAS) automates the process of designing neural network architectures. Instead of a human engineer choosing the number of layers, kernel sizes, and channel widths, a search algorithm explores a defined space of possible architectures and finds the one that maximizes accuracy (or any objective). The three pillars of NAS are: the search space (what architectures are possible), the search strategy (how to explore), and the evaluation strategy (how to estimate an architecture's quality without full training)."
        },

        // ── Section 1: Search Space Design ──
        {
          type: "heading",
          text: "Search Space Design"
        },
        {
          type: "text",
          text: "The search space determines what the algorithm can possibly find. A poorly designed search space either excludes good architectures or is so large that search becomes intractable. Two dominant paradigms exist:"
        },
        {
          type: "text",
          text: "Macro search spaces define the entire network architecture end-to-end. Each position in the network is a decision: what operation to use, how many channels, whether to downsample. The original NASNet controller operated in a macro space and required 500 GPUs for 4 days — thousands of GPU-days of compute. This is impractical for most teams."
        },
        {
          type: "text",
          text: "Cell-based (micro) search spaces define a single repeatable cell (a small DAG of operations), then stack this cell multiple times to build the full network. The search only needs to find the optimal cell, dramatically reducing the search space. DARTS, for example, searches a cell with ~7 nodes and ~14 edges, each choosing from ~8 operations — vastly smaller than a full macro space. The downside: the assumption that one cell design is optimal everywhere in the network is a strong prior that may miss important macro-level patterns."
        },
        {
          type: "diagram",
          code: `Cell-Based Search Space (DARTS-style)

  Input 1 ──→ ○ ──→ ○ ──→ ○ ──→ ○ ──→ Output
               ↑     ↑     ↑     ↑
  Input 2 ──→ ○ ──→ ○ ──→ ○ ─────┘
               │           ↑
               └───────────┘

  Each edge is a CHOICE among operations:
  ┌─────────────────────────────────────────────┐
  │  3×3 sep conv  │  5×5 sep conv  │  3×3 dil  │
  │  max pool 3×3  │  avg pool 3×3  │  skip      │
  │  zero (none)   │  1×1 conv      │            │
  └─────────────────────────────────────────────┘

  The cell is stacked N times to build the full network:
  ┌──────┐   ┌──────┐   ┌──────┐   ┌──────┐
  │ Cell │ → │ Cell │ → │Reduce│ → │ Cell │ → ... → Output
  │  ×6  │   │  ×6  │   │ Cell │   │  ×6  │
  └──────┘   └──────┘   └──────┘   └──────┘`
        },

        // ── Section 2: RL-Based NAS ──
        {
          type: "heading",
          text: "Reinforcement Learning NAS (NASNet)"
        },
        {
          type: "text",
          text: "The original NAS approach (Zoph & Le, 2017) used an RNN controller that generates architecture descriptions token by token. The controller is trained with REINFORCE — the reward signal is the validation accuracy of the generated architecture after training it for some epochs. Each architecture is trained from scratch, making this approach extremely expensive. NASNet (2018) improved efficiency by searching in a cell-based space and transferring the found cell from CIFAR-10 to ImageNet. The cost dropped from 22,400 GPU-days (original NAS) to 2,000 GPU-days (NASNet). Still enormous, but the concept was proven: automated search could match or beat human-designed architectures."
        },

        // ── Section 3: Evolutionary NAS ──
        {
          type: "heading",
          text: "Evolutionary NAS (AmoebaNet)"
        },
        {
          type: "text",
          text: "Evolutionary approaches maintain a population of architectures. In each generation: (1) select parents based on fitness (accuracy), (2) mutate them (change an operation, add/remove a connection, modify channels), (3) evaluate the offspring, (4) remove the weakest from the population. AmoebaNet (Real et al., 2019) showed that regularized evolution (adding an age penalty so old architectures are eventually removed regardless of fitness) found architectures matching or exceeding RL-based NAS at similar cost. The key advantage of evolutionary NAS: it is embarrassingly parallel — each architecture evaluation is independent, making it trivial to scale across many GPUs."
        },

        // ── Section 4: Differentiable NAS (DARTS) ──
        {
          type: "heading",
          text: "Differentiable NAS: DARTS"
        },
        {
          type: "text",
          text: "DARTS (Differentiable Architecture Search, Liu et al., 2019) transformed NAS from a discrete combinatorial problem into a continuous optimization problem. The key trick: instead of choosing one operation per edge, compute a weighted sum of all candidate operations on every edge. The weights (architecture parameters alpha) are learned jointly with the network weights via gradient descent. This is called continuous relaxation."
        },
        {
          type: "text",
          text: "Specifically, for each edge (i,j) in the cell, the output is: o_ij(x) = sum_k [ softmax(alpha_ij)_k * op_k(x) ]. During search, all operations run in parallel (expensive in memory but fast in wall-clock). After search, the final architecture is derived by keeping only the operation with the highest alpha on each edge."
        },
        {
          type: "text",
          text: "DARTS uses bi-level optimization: the outer loop updates architecture parameters alpha to minimize validation loss, the inner loop updates network weights w to minimize training loss. In practice, this is approximated with alternating gradient steps. The total search cost: ~1 GPU-day on CIFAR-10. This was a 1000x reduction compared to NASNet."
        },
        {
          type: "code",
          lang: "python",
          filename: "darts_mixed_op.py",
          desc: "Core DARTS building block: the mixed operation that computes a weighted sum of candidate operations.",
          code: `"""
DARTS Mixed Operation: the core of differentiable NAS.
Each edge in the cell computes a weighted sum of all
candidate operations, with weights from softmax(alpha).
"""
import torch
import torch.nn as nn
import torch.nn.functional as F


# ── Candidate operations ─────────────────────────────────
OPS = {
    'skip':     lambda C: nn.Identity(),
    'avg_3x3':  lambda C: nn.AvgPool2d(3, stride=1, padding=1),
    'max_3x3':  lambda C: nn.MaxPool2d(3, stride=1, padding=1),
    'sep_3x3':  lambda C: SepConv(C, C, 3),
    'sep_5x5':  lambda C: SepConv(C, C, 5),
    'dil_3x3':  lambda C: nn.Sequential(
        nn.Conv2d(C, C, 3, padding=2, dilation=2, groups=C, bias=False),
        nn.BatchNorm2d(C),
        nn.Conv2d(C, C, 1, bias=False),
        nn.BatchNorm2d(C),
        nn.ReLU(inplace=True),
    ),
    'zero':     lambda C: Zero(),
}


class SepConv(nn.Module):
    """Depthwise separable convolution."""
    def __init__(self, C_in, C_out, kernel_size):
        super().__init__()
        pad = kernel_size // 2
        self.op = nn.Sequential(
            nn.Conv2d(C_in, C_in, kernel_size, padding=pad,
                      groups=C_in, bias=False),
            nn.BatchNorm2d(C_in),
            nn.ReLU(inplace=True),
            nn.Conv2d(C_in, C_out, 1, bias=False),
            nn.BatchNorm2d(C_out),
        )

    def forward(self, x):
        return self.op(x)


class Zero(nn.Module):
    """Zero operation — represents 'no connection'."""
    def forward(self, x):
        return torch.zeros_like(x)


class MixedOp(nn.Module):
    """
    The core DARTS building block.
    Computes: output = sum_k softmax(alpha)_k * op_k(x)
    """
    def __init__(self, C, op_names=None):
        super().__init__()
        if op_names is None:
            op_names = list(OPS.keys())
        self.ops = nn.ModuleList([OPS[name](C) for name in op_names])
        # Architecture parameters (learnable)
        self.alpha = nn.Parameter(torch.zeros(len(self.ops)))

    def forward(self, x):
        weights = F.softmax(self.alpha, dim=0)
        return sum(w * op(x) for w, op in zip(weights, self.ops))


# ── Demo: search step ────────────────────────────────────
C = 16
mixed = MixedOp(C)
x = torch.randn(2, C, 32, 32)
out = mixed(x)
print(f"Input:  {x.shape}")
print(f"Output: {out.shape}")
print(f"Alpha:  {F.softmax(mixed.alpha, dim=0).detach().numpy().round(3)}")

# After search: pick the winning operation
winner_idx = mixed.alpha.argmax().item()
winner_name = list(OPS.keys())[winner_idx]
print(f"Winning op: {winner_name}")`
        },
        {
          type: "callout",
          variant: "warning",
          title: "DARTS Failure Modes",
          text: "DARTS has well-documented failure modes: (1) Skip connection collapse — the search converges to architectures dominated by skip connections because they have the smoothest gradients. The network becomes nearly linear. (2) Performance gap — the continuous architecture (all ops active) behaves very differently from the discretized one (only best op kept). (3) Instability — architecture parameters can oscillate rather than converge. Several fixes exist: DARTS+ adds auxiliary loss, P-DARTS uses progressive search space shrinking, SDARTS adds perturbation-based regularization. Fair-DARTS constrains each edge to have at most one operation active via exclusive competition."
        },

        // ── Section 5: One-Shot NAS ──
        {
          type: "heading",
          text: "One-Shot NAS & Weight Sharing"
        },
        {
          type: "text",
          text: "One-shot NAS takes a radically different approach: train a single large 'supernet' that contains every possible architecture as a subnetwork. Each candidate architecture shares weights with the supernet. To evaluate a candidate, simply extract its weights from the supernet — no training needed. This decouples the search from training: (1) Train the supernet once (with various subnetworks sampled uniformly during training), (2) Search by evaluating thousands of subnetworks on a validation set using their shared weights, (3) Fine-tune the final selected architecture. Once-for-All (OFA, Cai et al. 2020) is the state-of-the-art here. It trains a single supernet with progressive shrinking (start training the largest subnet, then gradually include smaller ones). OFA supports elastic kernel size (3/5/7), elastic depth (2/3/4 layers per stage), elastic width (channel multipliers), and elastic resolution — yielding over 10^19 possible architectures from one supernet."
        },
        {
          type: "comparison",
          headers: ["NAS Method", "Search Cost", "Key Idea", "Pros", "Cons"],
          rows: [
            ["NASNet (RL)", "2000 GPU-days", "RNN controller + REINFORCE", "Pioneered the field", "Extremely expensive"],
            ["AmoebaNet (Evo)", "3150 GPU-days", "Regularized evolution", "Simple, parallelizable", "Still expensive"],
            ["DARTS (Diff)", "1 GPU-day", "Continuous relaxation + gradient", "Fast, elegant", "Skip collapse, instability"],
            ["ProxylessNAS", "~8 GPU-hours", "Path-level binarization", "Memory efficient DARTS", "Biased gradient estimator"],
            ["OFA (One-shot)", "1200 GPU-hours train, minutes search", "Weight sharing + progressive shrinking", "Search is free after supernet training", "Supernet training is complex"],
          ]
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 3 — Hardware-Aware NAS: Optimizing for Real Devices
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "hardware-aware-nas",
      title: "Hardware-Aware NAS: Optimizing for Real Devices",
      readTime: "18 min",
      content: [
        {
          type: "text",
          text: "Standard NAS optimizes for accuracy alone. But edge deployment demands a specific accuracy under a hard latency constraint on a specific piece of hardware. Hardware-aware NAS integrates hardware metrics (latency, energy, memory) directly into the search objective. The result: architectures custom-tailored to specific silicon, often 1.5-2x faster than manually designed models at the same accuracy."
        },

        // ── Section 1: Why Hardware-Aware? ──
        {
          type: "heading",
          text: "The Case for Hardware-Aware Search"
        },
        {
          type: "text",
          text: "Different hardware has fundamentally different performance characteristics. A 5x5 depthwise convolution is essentially free on an NPU with dedicated depthwise hardware, but can be 3x slower than a 3x3 on a CPU without SIMD support. A channel count of 96 is perfect for a GPU (divisible by 32 warp size) but wasteful on a CPU with 128-bit NEON (prefers multiples of 16 for INT8). These differences mean the optimal architecture is hardware-dependent. A model optimized for Cortex-A78 will not be optimal for Apple ANE, and vice versa."
        },
        {
          type: "comparison",
          headers: ["Hardware", "Prefers", "Avoids", "Optimal Channel Multiple"],
          rows: [
            ["ARM CPU (NEON)", "3x3 conv, depthwise, INT8", "Large kernels, high channel counts", "8 (INT8) or 4 (FP32)"],
            ["Apple ANE", "Convolutions up to 7x7, grouped ops", "Non-standard ops, dynamic shapes", "32 or 64"],
            ["Qualcomm Hexagon DSP", "3x3/5x5 depthwise, INT8", "Large activations, transpose ops", "32"],
            ["NVIDIA GPU (TensorRT)", "Large batch, large channel, 1x1 conv", "Small channel depthwise, CPU ops", "8 (tensor cores) or 32"],
            ["Google Edge TPU", "Standard conv/depthwise, INT8 only", "Any FP ops, unsupported ops", "8"],
          ]
        },

        // ── Section 2: Latency Predictors ──
        {
          type: "heading",
          text: "Latency Predictors: Making Search Practical"
        },
        {
          type: "text",
          text: "You cannot run inference on real hardware for every candidate during NAS — it would be too slow. Instead, hardware-aware NAS uses latency predictors: models that estimate the inference time of an architecture without actually running it. Three approaches exist: (1) Lookup tables — measure the latency of each individual operation (3x3 conv with C channels at HxW resolution) on the target hardware, then sum per-layer latencies. Simple and accurate for sequential models, but misses inter-layer effects. (2) Predictive models — train a neural network or gradient-boosted tree to predict latency from architecture features. Can capture inter-layer effects but needs a large dataset of (architecture, latency) pairs. (3) Analytical models — use hardware specs (compute throughput, bandwidth, cache size) to predict latency from first principles. Most general but least accurate."
        },
        {
          type: "code",
          lang: "python",
          filename: "latency_lookup_table.py",
          desc: "Build a latency lookup table by benchmarking individual operators on CPU, then use it to predict full-model latency.",
          code: `"""
Latency Lookup Table for Hardware-Aware NAS.
Benchmark individual operators on target hardware,
then predict full-model latency as the sum of per-layer latencies.
"""
import torch
import torch.nn as nn
import time
import itertools
import json


def benchmark_op(op, input_shape, warmup=20, runs=100):
    """Benchmark a single operator on CPU."""
    x = torch.randn(input_shape)
    op.eval()
    with torch.no_grad():
        for _ in range(warmup):
            op(x)
        start = time.perf_counter()
        for _ in range(runs):
            op(x)
        return (time.perf_counter() - start) / runs * 1000  # ms


def build_lookup_table():
    """
    Build a lookup table for common edge operations.
    Keys: (op_type, kernel, C_in, C_out, H, W, stride)
    Values: latency in ms
    """
    table = {}
    resolutions = [56, 28, 14, 7]
    channels = [16, 24, 32, 48, 64, 96, 128, 160, 192]
    kernels = [3, 5]

    for H, C_in, C_out, k in itertools.product(
        resolutions, channels, channels, kernels
    ):
        # Standard conv
        op = nn.Conv2d(C_in, C_out, k, padding=k // 2, bias=False)
        lat = benchmark_op(op, (1, C_in, H, H))
        table[f"conv_{k}x{k}_{C_in}_{C_out}_{H}"] = round(lat, 4)

        # Depthwise conv (only when C_in == C_out)
        if C_in == C_out:
            op = nn.Conv2d(C_in, C_in, k, padding=k // 2,
                          groups=C_in, bias=False)
            lat = benchmark_op(op, (1, C_in, H, H))
            table[f"dw_{k}x{k}_{C_in}_{H}"] = round(lat, 4)

    # Pointwise (1x1) convs
    for H, C_in, C_out in itertools.product(resolutions, channels, channels):
        op = nn.Conv2d(C_in, C_out, 1, bias=False)
        lat = benchmark_op(op, (1, C_in, H, H))
        table[f"pw_1x1_{C_in}_{C_out}_{H}"] = round(lat, 4)

    return table


def predict_model_latency(arch_config, table):
    """
    Predict total model latency from an architecture config.
    arch_config: list of dicts with op_type, kernel, C_in, C_out, H, stride
    """
    total = 0.0
    for layer in arch_config:
        key = f"{layer['op']}_{layer['k']}x{layer['k']}_{layer['C_in']}_{layer['C_out']}_{layer['H']}"
        if key in table:
            total += table[key]
        else:
            # Interpolate or fall back to analytical estimate
            total += layer['C_in'] * layer['C_out'] * layer['k']**2 * layer['H']**2 / 1e9
    return total


# ── Example usage ──
# (In practice, build this once and save to JSON)
print("Building lookup table (subset for demo)...")
# Just build a small subset for demonstration
demo_table = {}
for H in [28, 14]:
    for C in [32, 64]:
        op = nn.Conv2d(C, C, 3, padding=1, groups=C, bias=False)
        lat = benchmark_op(op, (1, C, H, H), warmup=5, runs=50)
        demo_table[f"dw_3x3_{C}_{H}"] = round(lat, 4)
        print(f"  dw 3x3 C={C} H={H}: {lat:.4f} ms")

# Predict latency for a 3-layer model
arch = [
    {"op": "dw", "k": 3, "C_in": 32, "C_out": 32, "H": 28},
    {"op": "dw", "k": 3, "C_in": 64, "C_out": 64, "H": 14},
    {"op": "dw", "k": 3, "C_in": 64, "C_out": 64, "H": 14},
]
predicted = predict_model_latency(arch, demo_table)
print(f"\\nPredicted total latency: {predicted:.4f} ms")`
        },

        // ── Section 3: MnasNet ──
        {
          type: "heading",
          text: "MnasNet: The First Practical Hardware-Aware NAS"
        },
        {
          type: "text",
          text: "MnasNet (Tan et al., 2019) was the first NAS method to directly incorporate measured latency on a real mobile device (Pixel phone) into the search objective. The reward function uses a multi-objective: maximize ACC(m) * [LAT(m) / TARGET]^w where w is a weight factor (typically -0.07 to -0.15). This soft constraint prefers architectures near the target latency, with a smooth penalty for exceeding it. Key innovations: (1) Factorized hierarchical search space — different blocks can have different operations and channel sizes, unlike cell-based methods that repeat one cell everywhere. (2) The search found that different layers benefit from different operations — early layers prefer regular 3x3 convolutions while later layers prefer larger kernels and squeeze-excitation blocks."
        },

        // ── Section 4: Once-for-All in Detail ──
        {
          type: "heading",
          text: "Once-for-All: Train Once, Deploy Everywhere"
        },
        {
          type: "text",
          text: "OFA solves a practical problem: you have N different hardware targets and need an optimal architecture for each. Training a separate NAS per target is prohibitive. OFA trains a single supernet that supports elastic kernel size (3/5/7), elastic depth (2/3/4 per stage), and elastic width (channel multipliers). Progressive shrinking ensures all subnets work well: (1) Train the full supernet (largest configuration) until convergence, (2) Fine-tune while also sampling smaller kernel sizes (5→3 by center-cropping the 7x7 kernel), (3) Further fine-tune while sampling reduced depth (dropping later layers in each stage), (4) Finally fine-tune while sampling reduced width (pruning channels by importance)."
        },
        {
          type: "code",
          lang: "python",
          filename: "ofa_progressive_shrinking.py",
          desc: "Simplified progressive shrinking: train one network that supports multiple kernel sizes via center-cropping.",
          code: `"""
Progressive Shrinking (simplified): support elastic kernel sizes
by training a 7×7 kernel and extracting 5×5 and 3×3 via center-crop.

This is the core trick in Once-for-All (OFA).
"""
import torch
import torch.nn as nn
import torch.nn.functional as F


class ElasticConv2d(nn.Module):
    """
    A conv layer that supports multiple kernel sizes (3, 5, 7)
    by center-cropping a single large kernel.
    """
    def __init__(self, C_in, C_out, max_kernel=7, stride=1):
        super().__init__()
        self.max_kernel = max_kernel
        self.stride = stride
        # Single large kernel — sub-kernels are center-cropped
        self.weight = nn.Parameter(
            torch.randn(C_out, C_in, max_kernel, max_kernel) * 0.02
        )
        self.bias = nn.Parameter(torch.zeros(C_out))
        # Transform matrices for kernel adaptation (OFA uses these
        # to avoid accuracy loss when center-cropping)
        self.register_buffer('transform_5',
            torch.eye(5 * 5).view(25, 25))  # simplified
        self.register_buffer('transform_3',
            torch.eye(3 * 3).view(9, 9))    # simplified

    def get_kernel(self, kernel_size):
        """Extract sub-kernel by center-cropping."""
        if kernel_size == self.max_kernel:
            return self.weight
        start = (self.max_kernel - kernel_size) // 2
        end = start + kernel_size
        return self.weight[:, :, start:end, start:end]

    def forward(self, x, kernel_size=None):
        if kernel_size is None:
            kernel_size = self.max_kernel
        kernel = self.get_kernel(kernel_size)
        padding = kernel_size // 2
        return F.conv2d(x, kernel, self.bias, self.stride, padding)


# ── Demo: same layer, different kernel sizes ──
elastic_conv = ElasticConv2d(32, 64, max_kernel=7)
x = torch.randn(1, 32, 14, 14)

for ks in [7, 5, 3]:
    out = elastic_conv(x, kernel_size=ks)
    # Count effective parameters
    effective_params = 64 * 32 * ks * ks + 64  # weights + bias
    print(f"Kernel {ks}x{ks}: output={out.shape}, "
          f"effective params={effective_params:,}")


# ── Progressive shrinking training loop (pseudocode) ──
"""
Phase 1: Train full supernet (all layers, max kernel, max channels)
    for epoch in range(25):
        subnet = sample_subnet(kernel=[7], depth=[max], width=[max])
        loss = train_step(subnet, data)

Phase 2: Elastic kernel (sample from {7, 5, 3})
    for epoch in range(25):
        kernel_choices = random.choices([7, 5, 3], k=num_layers)
        subnet = sample_subnet(kernel=kernel_choices, depth=[max], width=[max])
        loss = train_step(subnet, data)

Phase 3: Elastic depth (sample layers per stage)
    for epoch in range(25):
        kernel_choices = random.choices([7, 5, 3], k=num_layers)
        depth_choices = random.choices([4, 3, 2], k=num_stages)
        subnet = sample_subnet(kernel=kernel_choices, depth=depth_choices, width=[max])
        loss = train_step(subnet, data)

Phase 4: Elastic width (sample channel multipliers)
    for epoch in range(25):
        kernel_choices = random.choices([7, 5, 3], k=num_layers)
        depth_choices = random.choices([4, 3, 2], k=num_stages)
        width_mults = random.choices([1.0, 0.75, 0.5], k=num_stages)
        subnet = sample_subnet(kernel=kernel_choices, depth=depth_choices, width=width_mults)
        loss = train_step(subnet, data)

After training: search among 10^19 subnets using accuracy predictor + latency LUT
"""`
        },

        // ── Section 5: Multi-Objective Pareto Search ──
        {
          type: "heading",
          text: "Multi-Objective Pareto Search"
        },
        {
          type: "text",
          text: "Given a trained OFA supernet, the deployment search finds the best subnet for each hardware target. This is a multi-objective optimization problem: maximize accuracy while staying under a latency budget. The approach: (1) Build a latency lookup table for the target hardware, (2) Train an accuracy predictor (a small MLP that predicts accuracy from subnet architecture features without actual evaluation), (3) Run evolutionary search with the multi-objective fitness function. The search evaluates ~10,000 subnets in minutes (using the predictor, not real training), producing a Pareto frontier of accuracy-vs-latency tradeoffs. The engineer then picks the subnet that meets their specific constraint."
        },
        {
          type: "diagram",
          code: `Multi-Objective NAS: Pareto Frontier

  Accuracy (%)
  84 ┤                                          ★ Full supernet (too slow)
     │
  82 ┤                              ● Pareto-optimal
     │                          ●
  80 ┤                     ●
     │                ●
  78 ┤           ●                      ○ Sub-optimal (dominated)
     │       ●          ○
  76 ┤   ●        ○          ○
     │ ●     ○         ○
  74 ┤●
     └──┬──────┬──────┬──────┬──────┬──────┬──→ Latency (ms)
        5     10     15     20     25     30

  Each ● is a Pareto-optimal subnet — no other subnet is both
  faster AND more accurate. Engineer picks based on their budget:
    • 10ms budget → 78% accuracy subnet
    • 20ms budget → 81% accuracy subnet`
        },
        {
          type: "callout",
          variant: "tip",
          title: "Practical Hardware-Aware NAS Workflow",
          text: "For most teams, full NAS from scratch is overkill. The practical workflow is: (1) Start from a pretrained OFA supernet (MIT HAN Lab releases these), (2) Build a latency LUT for your target hardware, (3) Run the provided evolutionary search to find your optimal subnet, (4) Fine-tune the extracted subnet on your task. This takes hours, not GPU-days, and gives you a hardware-optimized architecture without the research overhead of building a NAS system from scratch."
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 4 — Structured Sparsity & NVIDIA 2:4
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "structured-sparsity-nvidia-2-4",
      title: "Structured Sparsity & NVIDIA 2:4 Sparsity",
      readTime: "17 min",
      content: [
        {
          type: "text",
          text: "Pruning removes weights from a neural network to reduce computation. But not all pruning delivers actual speedup. Unstructured pruning (setting individual weights to zero) achieves high sparsity ratios with minimal accuracy loss, but sparse matrix operations are rarely faster than dense ones on commodity hardware — the irregular memory access pattern defeats caches and SIMD units. Structured pruning removes entire structures (channels, filters, attention heads) to produce smaller dense matrices that are universally faster. NVIDIA's 2:4 sparsity offers a middle ground: fine-grained structured sparsity with dedicated hardware support that guarantees exactly 2x speedup."
        },

        // ── Section 1: Unstructured vs Structured ──
        {
          type: "heading",
          text: "The Sparsity Spectrum: Unstructured → Structured"
        },
        {
          type: "comparison",
          headers: ["Sparsity Type", "Granularity", "Typical Sparsity", "Accuracy Impact", "Speedup on Real HW"],
          rows: [
            ["Unstructured", "Individual weights", "90-99%", "Low (lottery ticket)", "None on GPU/CPU (needs sparse HW)"],
            ["Block sparse (4x4)", "4x4 weight blocks", "75-90%", "Moderate", "2-3x with library support"],
            ["N:M (2:4)", "2 of every 4 weights", "50% exactly", "Very low", "2x guaranteed (Ampere+)"],
            ["Channel pruning", "Entire output channels", "30-70%", "Moderate-high", "Direct (smaller dense model)"],
            ["Filter pruning", "Entire conv filters", "30-60%", "Moderate-high", "Direct (fewer filters)"],
            ["Layer removal", "Entire layers", "10-30%", "High if not careful", "Direct (fewer layers)"],
          ]
        },
        {
          type: "text",
          text: "The key insight: structured pruning at any granularity produces a smaller dense model that runs faster everywhere. Unstructured pruning produces a sparse model that only runs faster on hardware with dedicated sparse tensor units. For edge deployment, structured pruning is almost always the right choice unless you are specifically targeting NVIDIA Ampere+ GPUs or specialized sparse accelerators."
        },

        // ── Section 2: Channel Pruning ──
        {
          type: "heading",
          text: "Channel Pruning: Removing Entire Feature Maps"
        },
        {
          type: "text",
          text: "Channel pruning removes entire output channels from a convolutional layer. If you remove channel j from layer L, you also remove: (1) The j-th filter in layer L (shape: C_in × K × K), (2) The j-th input channel of layer L+1 (one slice of each filter). The result is a smaller dense model — no sparse matrix support needed. The challenge is deciding which channels to remove. Common criteria: (1) L1-norm of the filter weights (smaller norm ≈ less important), (2) Batch normalization scaling factor (gamma) — after training, small gamma means the channel contributes little, (3) Taylor expansion — approximate the loss change from removing each channel, (4) Learned masks — make pruning masks differentiable and learn them during training."
        },
        {
          type: "code",
          lang: "python",
          filename: "channel_pruning.py",
          desc: "Implement channel pruning using BN scaling factors (Network Slimming) and L1-norm criteria.",
          code: `"""
Channel pruning: remove entire output channels from conv layers.
Two criteria demonstrated:
  1. L1-norm of filter weights
  2. Batch normalization gamma (Network Slimming, Liu et al. 2017)

Result: a genuinely smaller dense model — faster on ANY hardware.
"""
import torch
import torch.nn as nn
import torch.nn.functional as F
import copy


class SimpleCNN(nn.Module):
    def __init__(self, channels=(32, 64, 128)):
        super().__init__()
        self.conv1 = nn.Conv2d(3, channels[0], 3, padding=1, bias=False)
        self.bn1 = nn.BatchNorm2d(channels[0])
        self.conv2 = nn.Conv2d(channels[0], channels[1], 3, padding=1, bias=False)
        self.bn2 = nn.BatchNorm2d(channels[1])
        self.conv3 = nn.Conv2d(channels[1], channels[2], 3, padding=1, bias=False)
        self.bn3 = nn.BatchNorm2d(channels[2])
        self.pool = nn.AdaptiveAvgPool2d(1)
        self.fc = nn.Linear(channels[2], 10)

    def forward(self, x):
        x = F.relu(self.bn1(self.conv1(x)))
        x = F.max_pool2d(x, 2)
        x = F.relu(self.bn2(self.conv2(x)))
        x = F.max_pool2d(x, 2)
        x = F.relu(self.bn3(self.conv3(x)))
        x = self.pool(x).flatten(1)
        return self.fc(x)


def get_bn_importance(model):
    """Rank channels by BN gamma (scaling factor)."""
    importances = {}
    for name, module in model.named_modules():
        if isinstance(module, nn.BatchNorm2d):
            gamma = module.weight.data.abs()
            importances[name] = gamma
    return importances


def get_l1_importance(model):
    """Rank channels by L1-norm of conv filters."""
    importances = {}
    for name, module in model.named_modules():
        if isinstance(module, nn.Conv2d):
            # L1-norm per output channel
            l1 = module.weight.data.abs().sum(dim=(1, 2, 3))
            importances[name] = l1
    return importances


def prune_channel(conv, bn, next_conv, keep_idx):
    """Prune output channels from conv+bn and input channels from next_conv."""
    # Prune output channels of current layer
    new_conv = nn.Conv2d(
        conv.in_channels, len(keep_idx), conv.kernel_size[0],
        padding=conv.padding[0], bias=False
    )
    new_conv.weight.data = conv.weight.data[keep_idx]

    new_bn = nn.BatchNorm2d(len(keep_idx))
    new_bn.weight.data = bn.weight.data[keep_idx]
    new_bn.bias.data = bn.bias.data[keep_idx]
    new_bn.running_mean = bn.running_mean[keep_idx]
    new_bn.running_var = bn.running_var[keep_idx]

    # Prune input channels of next layer
    if next_conv is not None:
        new_next = nn.Conv2d(
            len(keep_idx), next_conv.out_channels,
            next_conv.kernel_size[0], padding=next_conv.padding[0],
            bias=False
        )
        new_next.weight.data = next_conv.weight.data[:, keep_idx]
    else:
        new_next = None

    return new_conv, new_bn, new_next


# ── Demo: Prune 50% of channels using BN gamma ──
model = SimpleCNN(channels=(32, 64, 128))
# Simulate some training (random gamma values)
model.bn1.weight.data = torch.rand(32)
model.bn2.weight.data = torch.rand(64)

params_before = sum(p.numel() for p in model.parameters())
print(f"Before pruning: {params_before:,} params")

# Prune 50% from conv1
gamma = model.bn1.weight.data.abs()
keep_k = len(gamma) // 2  # keep top 50%
keep_idx = gamma.argsort(descending=True)[:keep_k]
keep_idx = keep_idx.sort().values  # maintain order

new_conv1, new_bn1, new_conv2 = prune_channel(
    model.conv1, model.bn1, model.conv2, keep_idx
)
model.conv1 = new_conv1
model.bn1 = new_bn1
model.conv2 = new_conv2

params_after = sum(p.numel() for p in model.parameters())
print(f"After pruning conv1 (50%): {params_after:,} params")
print(f"Reduction: {(1 - params_after/params_before)*100:.1f}%")

# Verify forward pass still works
x = torch.randn(1, 3, 32, 32)
out = model(x)
print(f"Output shape: {out.shape}")  # Should be (1, 10)`
        },

        // ── Section 3: NVIDIA 2:4 Sparsity ──
        {
          type: "heading",
          text: "NVIDIA 2:4 Structured Sparsity"
        },
        {
          type: "text",
          text: "NVIDIA introduced 2:4 sparsity in the Ampere architecture (A100, RTX 3090). The constraint: in every group of 4 consecutive values in a weight matrix row, exactly 2 must be zero. This is 50% sparsity with a very specific structure that maps directly to the sparse tensor core hardware. The tensor core processes the non-zero values and their column indices, effectively halving the number of multiply-accumulate operations. The result: a guaranteed 2x speedup for GEMM operations on Ampere+ GPUs, with no software overhead."
        },
        {
          type: "diagram",
          code: `NVIDIA 2:4 Sparsity Pattern

  Dense weight matrix (one row shown):
  [0.5  0.1  0.8  0.3  |  0.2  0.9  0.4  0.7  |  0.6  0.1  0.3  0.8]

  After 2:4 pruning (keep 2 largest per group of 4):
  [0.5  0    0.8  0    |  0    0.9  0    0.7  |  0.6  0    0    0.8]
         ↓                        ↓                       ↓
  Compressed storage:
  Values:  [0.5, 0.8,  0.9, 0.7,  0.6, 0.8]  (50% of original)
  Indices: [0,   2,    1,   3,    0,   3]      (2-bit column index per value)

  Sparse Tensor Core execution:
  ┌─────────────────────────────────────────────┐
  │  For each group of 4 in the weight row:     │
  │  - Load 2 non-zero weights + 2 indices      │
  │  - Gather 2 activation values using indices  │
  │  - Compute 2 MACs instead of 4              │
  │  → Exactly 2x throughput                     │
  └─────────────────────────────────────────────┘`
        },
        {
          type: "code",
          lang: "python",
          filename: "nvidia_2_4_sparsity.py",
          desc: "Implement 2:4 sparsity mask generation and apply it using NVIDIA ASP (Automatic SParsity).",
          code: `"""
NVIDIA 2:4 Structured Sparsity.
For each group of 4 weights, zero out the 2 smallest.

In production, use NVIDIA ASP (Automatic SParsity):
  pip install nvidia-pyindex
  pip install nvidia-dlprof  # or use torch sparse semi-structured

Here we implement the mask from scratch to understand the mechanics.
"""
import torch
import torch.nn as nn
import numpy as np


def create_2_4_mask(weight):
    """
    Create a 2:4 sparsity mask for a 2D weight matrix.
    For every 4 consecutive elements in each row, keep the 2 largest.
    """
    # Reshape to process groups of 4
    shape = weight.shape
    assert shape[-1] % 4 == 0, f"Last dim must be divisible by 4, got {shape[-1]}"

    flat = weight.reshape(-1, 4)  # (N, 4)
    mask = torch.zeros_like(flat)

    # For each group of 4, find the top-2 by magnitude
    _, top2_idx = flat.abs().topk(2, dim=1)
    mask.scatter_(1, top2_idx, 1.0)

    return mask.reshape(shape)


def apply_2_4_sparsity(model, layer_types=(nn.Linear, nn.Conv2d)):
    """Apply 2:4 sparsity to all eligible layers in a model."""
    masks = {}
    for name, module in model.named_modules():
        if isinstance(module, layer_types):
            weight = module.weight.data
            # For Conv2d, reshape to 2D: (C_out, C_in * K * K)
            original_shape = weight.shape
            w2d = weight.reshape(weight.shape[0], -1)

            # Pad last dim to multiple of 4 if needed
            pad = (4 - w2d.shape[1] % 4) % 4
            if pad > 0:
                w2d = torch.nn.functional.pad(w2d, (0, pad))

            mask = create_2_4_mask(w2d)

            # Remove padding
            if pad > 0:
                mask = mask[:, :w2d.shape[1] - pad]

            mask = mask.reshape(original_shape)
            module.weight.data *= mask
            masks[name] = mask

            # Stats
            nnz = mask.sum().item()
            total = mask.numel()
            print(f"{name}: {nnz}/{total} non-zero "
                  f"({nnz/total*100:.1f}% dense)")

    return masks


# ── Demo ──
model = nn.Sequential(
    nn.Linear(64, 128),
    nn.ReLU(),
    nn.Linear(128, 64),
    nn.ReLU(),
    nn.Linear(64, 10),
)

print("Applying 2:4 sparsity...")
masks = apply_2_4_sparsity(model)

# Verify the constraint: every group of 4 has exactly 2 non-zeros
w = model[0].weight.data
for row_idx in range(min(3, w.shape[0])):
    row = w[row_idx]
    for g in range(0, len(row), 4):
        group = row[g:g+4]
        nnz = (group != 0).sum().item()
        assert nnz == 2, f"Row {row_idx}, group {g}: {nnz} non-zeros (expected 2)"
print("\\n2:4 constraint verified for all groups!")


# ── PyTorch 2.1+ native semi-structured sparsity ──
# (Use this in production instead of manual masking)
"""
from torch.sparse import to_sparse_semi_structured, SparseSemiStructuredTensor

# Enable semi-structured sparsity for a Linear layer
SparseSemiStructuredTensor._FORCE_CUTLASS = True
model.linear.weight = nn.Parameter(
    to_sparse_semi_structured(model.linear.weight)
)
# Now model.linear uses sparse tensor cores automatically
"""`
        },

        // ── Section 4: Sparsity-Aware Training ──
        {
          type: "heading",
          text: "Sparsity-Aware Training Strategies"
        },
        {
          type: "text",
          text: "Pruning a pretrained model and hoping accuracy recovers is the naive approach. Better strategies integrate sparsity into training:"
        },
        {
          type: "text",
          text: "Gradual Magnitude Pruning (GMP) starts with a dense model and progressively increases sparsity during training using a schedule (typically cubic: start slow, accelerate, then slow down). At each pruning step, remove the weights with smallest magnitude and allow the remaining weights to adapt. Google's 'To Prune or Not to Prune' paper showed that GMP with a cubic schedule and 50-80% sparsity loses minimal accuracy, especially when the total training budget is kept constant."
        },
        {
          type: "text",
          text: "Movement Pruning (Sanh et al., 2020) prunes based on which direction weights are moving during fine-tuning, not their magnitude. Weights moving toward zero are pruned; weights moving away from zero are kept, regardless of absolute value. This is particularly effective for transfer learning: a pretrained weight with large magnitude but moving toward zero has learned to be less important for the downstream task."
        },
        {
          type: "text",
          text: "RigL (Evci et al., 2020) does sparse-to-sparse training: it starts with a random sparse topology and periodically regrows connections by checking the gradient magnitude of zero-valued weights. Weights with large gradients (even though currently zero) are regrown because the gradient indicates they would be useful. Simultaneously, active weights with small magnitudes are pruned. The total number of non-zeros stays constant throughout training — only the topology changes. This achieves the same accuracy as dense training at 80-90% sparsity."
        },
        {
          type: "callout",
          variant: "tip",
          title: "2:4 Sparsity Training Recipe (NVIDIA Recommended)",
          text: "NVIDIA's recommended approach: (1) Train the model to convergence with dense weights, (2) Apply 2:4 magnitude pruning (zero out 2 smallest per group of 4), (3) Fine-tune for ~10% of the original training epochs with the sparsity mask frozen. This typically recovers within 0.5% of the dense accuracy. For even better results, apply 2:4 pruning at the start of training and use the sparsity mask throughout — the model learns to distribute information across the non-zero positions."
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 5 — Combined Compression: Pruning + Quantization + Distillation
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "combined-compression-pipelines",
      title: "Combined Compression: Pruning + Quantization + Distillation",
      readTime: "16 min",
      content: [
        {
          type: "text",
          text: "Each compression technique — pruning, quantization, distillation — targets a different axis of redundancy. Pruning removes unnecessary connections. Quantization reduces the precision of remaining connections. Distillation transfers knowledge from a larger model into the compressed one. When combined correctly, the effects are multiplicative. A well-designed pipeline can achieve 10-50x compression with minimal accuracy loss. But the order and interactions matter enormously."
        },

        // ── Section 1: Interaction Effects ──
        {
          type: "heading",
          text: "How Compression Techniques Interact"
        },
        {
          type: "text",
          text: "The three techniques are not independent — they interact in important ways: (1) Pruning before quantization helps because fewer weights means fewer values need to be represented by the quantization scheme, reducing quantization error. However, pruning can create outlier weights (surviving high-magnitude weights) that are harder to quantize. (2) Distillation helps both pruning and quantization by providing a better training signal. A student trained with soft labels from a teacher model recovers accuracy more effectively than one trained only on hard labels. (3) Quantization after pruning is standard, but quantization-aware pruning (pruning with the quantization error accounted for) gives better results."
        },
        {
          type: "comparison",
          headers: ["Pipeline Order", "Typical Compression", "Accuracy Recovery", "Notes"],
          rows: [
            ["Prune → Distill → Quantize", "10-20x", "Best", "Gold standard — distillation recovers pruning loss, then quantize"],
            ["Prune → Quantize → Fine-tune", "8-15x", "Good", "Simpler, no teacher model needed"],
            ["Distill → Prune → Quantize", "10-20x", "Good", "Start with distilled student, then compress"],
            ["Quantize → Prune", "5-8x", "Moderate", "Unusual order — quantized weights are harder to prune"],
            ["Joint (all simultaneously)", "15-30x", "Variable", "Complex to tune, research frontier"],
          ]
        },

        // ── Section 2: The Gold Standard Pipeline ──
        {
          type: "heading",
          text: "The Gold Standard Pipeline: Prune → Distill → Quantize"
        },
        {
          type: "text",
          text: "Step 1 — Structured Pruning: remove 30-50% of channels from the pretrained model using BN scaling or Taylor importance. This creates a smaller dense architecture. Fine-tune for a few epochs to partially recover accuracy. Step 2 — Knowledge Distillation: train the pruned student model using soft targets from the original unpruned teacher. Use a combined loss: L = alpha * L_hard(student, labels) + (1-alpha) * T^2 * KL_div(student_soft, teacher_soft). Temperature T=4-6 and alpha=0.1-0.3 typically work well. Train for full epochs — this is where most accuracy recovery happens. Step 3 — Post-Training Quantization: apply INT8 quantization with calibration. The model is already small and well-trained, so PTQ usually works. If accuracy drops >1%, switch to QAT for 5-10 more epochs."
        },
        {
          type: "code",
          lang: "python",
          filename: "combined_compression.py",
          desc: "End-to-end compression pipeline: prune → distill → quantize with metrics at each stage.",
          code: `"""
Combined Compression Pipeline: Prune → Distill → Quantize
Demonstrates the full workflow with measurements at each stage.
"""
import torch
import torch.nn as nn
import torch.nn.functional as F
import copy


# ── Simple CNN for demonstration ──
class TinyCNN(nn.Module):
    def __init__(self, ch=(32, 64, 128)):
        super().__init__()
        self.features = nn.Sequential(
            nn.Conv2d(3, ch[0], 3, padding=1, bias=False),
            nn.BatchNorm2d(ch[0]), nn.ReLU(),
            nn.MaxPool2d(2),
            nn.Conv2d(ch[0], ch[1], 3, padding=1, bias=False),
            nn.BatchNorm2d(ch[1]), nn.ReLU(),
            nn.MaxPool2d(2),
            nn.Conv2d(ch[1], ch[2], 3, padding=1, bias=False),
            nn.BatchNorm2d(ch[2]), nn.ReLU(),
            nn.AdaptiveAvgPool2d(1),
        )
        self.classifier = nn.Linear(ch[2], 10)

    def forward(self, x):
        x = self.features(x)
        return self.classifier(x.flatten(1))


def count_params(model):
    return sum(p.numel() for p in model.parameters())


def model_size_mb(model):
    """Model size in MB (assuming FP32)."""
    return count_params(model) * 4 / (1024 * 1024)


# ══════════════════════════════════════════════════════
# Stage 0: Pretrained teacher
# ══════════════════════════════════════════════════════
teacher = TinyCNN(ch=(64, 128, 256))
print(f"Teacher: {count_params(teacher):,} params, {model_size_mb(teacher):.2f} MB")

# ══════════════════════════════════════════════════════
# Stage 1: Structural Pruning (50% channel reduction)
# ══════════════════════════════════════════════════════
student = TinyCNN(ch=(32, 64, 128))  # 50% fewer channels
print(f"\\nAfter pruning (50% channels):")
print(f"  Student: {count_params(student):,} params, {model_size_mb(student):.2f} MB")
print(f"  Compression: {count_params(teacher)/count_params(student):.1f}x (params)")

# ══════════════════════════════════════════════════════
# Stage 2: Knowledge Distillation
# ══════════════════════════════════════════════════════
def distillation_loss(student_logits, teacher_logits, labels,
                      temperature=4.0, alpha=0.2):
    """
    Combined hard + soft target loss for knowledge distillation.
    """
    # Hard loss (standard cross-entropy with true labels)
    hard_loss = F.cross_entropy(student_logits, labels)

    # Soft loss (KL divergence with teacher's soft predictions)
    student_soft = F.log_softmax(student_logits / temperature, dim=1)
    teacher_soft = F.softmax(teacher_logits / temperature, dim=1)
    soft_loss = F.kl_div(student_soft, teacher_soft, reduction='batchmean')
    soft_loss *= temperature ** 2  # Scale gradient magnitude

    return alpha * hard_loss + (1 - alpha) * soft_loss


# Training loop (pseudocode with real loss computation)
teacher.eval()
student.train()
optimizer = torch.optim.Adam(student.parameters(), lr=1e-3)

# Simulate one training step
x = torch.randn(8, 3, 32, 32)
labels = torch.randint(0, 10, (8,))

with torch.no_grad():
    teacher_logits = teacher(x)
student_logits = student(x)

loss = distillation_loss(student_logits, teacher_logits, labels)
loss.backward()
optimizer.step()
print(f"  Distillation loss: {loss.item():.4f}")

# ══════════════════════════════════════════════════════
# Stage 3: Post-Training Quantization (INT8)
# ══════════════════════════════════════════════════════
def simulate_int8_quantization(model):
    """
    Simulate INT8 quantization by quantizing all float parameters
    to 8-bit and computing the compression ratio.
    """
    total_params = 0
    total_error = 0.0

    for name, param in model.named_parameters():
        fp32_data = param.data
        total_params += fp32_data.numel()

        # Symmetric quantization
        amax = fp32_data.abs().max()
        scale = amax / 127.0
        if scale == 0:
            continue

        # Quantize → dequantize
        q = torch.clamp(torch.round(fp32_data / scale), -127, 127)
        dequant = q * scale

        # Measure error
        error = (fp32_data - dequant).abs().mean().item()
        total_error += error

    fp32_size = total_params * 4 / (1024 * 1024)  # MB
    int8_size = total_params * 1 / (1024 * 1024)   # MB

    return fp32_size, int8_size


fp32_size, int8_size = simulate_int8_quantization(student)
print(f"\\nAfter INT8 quantization:")
print(f"  FP32 size: {fp32_size:.2f} MB")
print(f"  INT8 size: {int8_size:.2f} MB")

# ══════════════════════════════════════════════════════
# Final summary
# ══════════════════════════════════════════════════════
teacher_size = count_params(teacher) * 4 / (1024**2)
final_size = int8_size
print(f"\\n{'='*50}")
print(f"COMPRESSION SUMMARY")
print(f"{'='*50}")
print(f"Teacher (FP32):             {teacher_size:.2f} MB")
print(f"After pruning (FP32):       {fp32_size:.2f} MB  ({teacher_size/fp32_size:.1f}x)")
print(f"After pruning + quant (INT8): {int8_size:.2f} MB  ({teacher_size/int8_size:.1f}x)")
print(f"Total compression:          {teacher_size/final_size:.1f}x")`
        },

        // ── Section 3: Compound Compression in Practice ──
        {
          type: "heading",
          text: "Compound Compression at Scale: Industry Examples"
        },
        {
          type: "text",
          text: "Google's on-device models use compound compression extensively. The pipeline for Google Lens models: (1) EfficientNet backbone found via NAS, (2) Distill from EfficientNet-B7 teacher to B0 student, (3) Apply QAT with INT8 quantization, (4) Deploy via TFLite. The total pipeline compresses by ~40x while keeping accuracy within 2% of the teacher."
        },
        {
          type: "text",
          text: "Apple's CoreML models follow a similar pattern but add pruning. For on-device Siri models: (1) Large server model as teacher, (2) Structured pruning to fit the Neural Engine's constraints, (3) Palettization (weight clustering to 4-6 bits), (4) 16-bit activation quantization. The combination fits complex NLP models into <50MB on-device."
        },
        {
          type: "text",
          text: "NVIDIA's approach for Jetson deployment: (1) Prune with 2:4 structured sparsity (2x speedup), (2) Quantize to INT8 (another 2-4x speedup), (3) TensorRT layer fusion (20-30% additional speedup). The combined effect: 5-10x end-to-end speedup with <1% accuracy loss."
        },
        {
          type: "callout",
          variant: "warning",
          title: "Compression Budget Planning",
          text: "Before starting compression, define your budget: What is the target latency? What is the maximum acceptable accuracy drop? What hardware are you targeting? Work backwards from these constraints. If you need 4x compression, pruning + quantization alone is probably sufficient. If you need 20x+, you almost certainly need distillation into a fundamentally smaller architecture, not just compression of the large one."
        },

        // ── Section 4: Automated Compression ──
        {
          type: "heading",
          text: "Automated Compression: AMC and Beyond"
        },
        {
          type: "text",
          text: "Just as NAS automates architecture design, AutoML Compression (AMC, He et al., 2018) automates compression. An RL agent learns per-layer compression ratios to maximize accuracy under a model size or latency constraint. For each layer, the agent decides the pruning ratio, and the compressed model is evaluated to provide the reward signal. AMC found non-obvious strategies: it aggressively prunes early layers (which have few parameters but are computationally expensive at high resolution) while preserving later layers (which have many parameters but process small feature maps). This counterintuitive policy outperformed uniform pruning by 2-5% accuracy."
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 6 — Cross-Platform Architecture Selection
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "cross-platform-arch-selection",
      title: "Cross-Platform Architecture Selection & Deployment",
      readTime: "15 min",
      content: [
        {
          type: "text",
          text: "Real-world edge AI must deploy to heterogeneous hardware: phones with ARM CPUs and NPUs, IoT devices with DSPs, cameras with dedicated vision processors, drones with NVIDIA Jetson, cars with custom AI chips. A single model optimized for one platform will underperform on others. This lesson covers strategies for designing and deploying architecture families that work across multiple platforms."
        },

        // ── Section 1: The Multi-Platform Challenge ──
        {
          type: "heading",
          text: "The Multi-Platform Deployment Challenge"
        },
        {
          type: "text",
          text: "Consider a company deploying a person detection model to three platforms: (1) NVIDIA Jetson Orin — has tensor cores, prefers large batch, wide channels, standard convolutions, INT8 via TensorRT, (2) Qualcomm Hexagon DSP — prefers depthwise separable convolutions, quantized INT8, specific channel multiples, via QNN/SNPE, (3) ARM Cortex-A (CPU-only IoT) — prefers XNNPACK-friendly ops, small activation footprint, TFLite runtime. The naive approach: design one model, convert to three formats, hope for the best. Reality: the optimal architecture is fundamentally different for each. The Jetson model should use standard convolutions (tensor cores are wasted on depthwise). The Hexagon model should maximize depthwise ops (the DSP has dedicated depthwise hardware). The ARM model should minimize activation memory (limited SRAM)."
        },

        // ── Section 2: Architecture Families ──
        {
          type: "heading",
          text: "Designing Architecture Families"
        },
        {
          type: "text",
          text: "Instead of one model, design an architecture family — a set of models that share the same training pipeline but have different configurations per platform. The Once-for-All approach is ideal: train one supernet, extract different subnets per target. But even without OFA, you can design a family manually: (1) Define a shared backbone structure (number of stages, downsampling pattern), (2) For each platform, choose the optimal building block (standard conv for GPU, depthwise separable for DSP, etc.), (3) Use NAS or manual tuning to find optimal channel widths per platform, (4) Share the training recipe (data augmentation, loss function, learning rate schedule) across all variants."
        },
        {
          type: "code",
          lang: "python",
          filename: "platform_aware_model_family.py",
          desc: "Define a model family with platform-specific building blocks but shared structure.",
          code: `"""
Platform-aware Model Family: shared structure, platform-specific blocks.
One training codebase produces optimized models for GPU, DSP, and CPU.
"""
import torch
import torch.nn as nn


# ── Platform-specific building blocks ──

class GPUBlock(nn.Module):
    """Standard conv block — maximizes tensor core utilization."""
    def __init__(self, C_in, C_out, stride=1):
        super().__init__()
        self.block = nn.Sequential(
            nn.Conv2d(C_in, C_out, 3, stride=stride, padding=1, bias=False),
            nn.BatchNorm2d(C_out),
            nn.ReLU6(inplace=True),
        )
    def forward(self, x):
        return self.block(x)


class DSPBlock(nn.Module):
    """Depthwise separable — maps to dedicated DSP hardware."""
    def __init__(self, C_in, C_out, stride=1):
        super().__init__()
        self.block = nn.Sequential(
            # Depthwise
            nn.Conv2d(C_in, C_in, 3, stride=stride, padding=1,
                      groups=C_in, bias=False),
            nn.BatchNorm2d(C_in),
            nn.ReLU6(inplace=True),
            # Pointwise
            nn.Conv2d(C_in, C_out, 1, bias=False),
            nn.BatchNorm2d(C_out),
            nn.ReLU6(inplace=True),
        )
    def forward(self, x):
        return self.block(x)


class CPUBlock(nn.Module):
    """
    Lightweight block for CPU — small activations, XNNPACK-friendly.
    Uses inverted residual with small expansion ratio.
    """
    def __init__(self, C_in, C_out, stride=1, expand=3):
        super().__init__()
        hidden = C_in * expand
        self.use_res = (stride == 1 and C_in == C_out)
        self.block = nn.Sequential(
            nn.Conv2d(C_in, hidden, 1, bias=False),
            nn.BatchNorm2d(hidden),
            nn.ReLU6(inplace=True),
            nn.Conv2d(hidden, hidden, 3, stride=stride, padding=1,
                      groups=hidden, bias=False),
            nn.BatchNorm2d(hidden),
            nn.ReLU6(inplace=True),
            nn.Conv2d(hidden, C_out, 1, bias=False),
            nn.BatchNorm2d(C_out),
        )
    def forward(self, x):
        if self.use_res:
            return x + self.block(x)
        return self.block(x)


# ── Platform configurations ──
PLATFORM_CONFIGS = {
    "jetson_orin": {
        "block": GPUBlock,
        "channels": [32, 64, 128, 256],   # Wide — tensor cores love big channels
        "description": "NVIDIA Jetson Orin (TensorRT INT8)",
    },
    "hexagon_dsp": {
        "block": DSPBlock,
        "channels": [32, 64, 96, 160],     # Multiples of 32 for Hexagon
        "description": "Qualcomm Hexagon DSP (QNN INT8)",
    },
    "arm_cpu": {
        "block": CPUBlock,
        "channels": [16, 32, 48, 96],      # Narrow — minimize memory
        "description": "ARM Cortex-A CPU (TFLite XNNPACK)",
    },
}


class PlatformAwareDetector(nn.Module):
    """Shared architecture structure, platform-specific implementation."""
    def __init__(self, platform="arm_cpu", num_classes=80):
        super().__init__()
        config = PLATFORM_CONFIGS[platform]
        Block = config["block"]
        ch = config["channels"]

        # Shared structure: stem + 4 stages + head
        self.stem = nn.Sequential(
            nn.Conv2d(3, ch[0], 3, stride=2, padding=1, bias=False),
            nn.BatchNorm2d(ch[0]),
            nn.ReLU6(inplace=True),
        )
        self.stage1 = self._make_stage(Block, ch[0], ch[1], n=2, stride=2)
        self.stage2 = self._make_stage(Block, ch[1], ch[2], n=3, stride=2)
        self.stage3 = self._make_stage(Block, ch[2], ch[3], n=3, stride=2)
        self.head = nn.Sequential(
            nn.AdaptiveAvgPool2d(1),
            nn.Flatten(),
            nn.Linear(ch[3], num_classes),
        )

    def _make_stage(self, Block, C_in, C_out, n, stride):
        layers = [Block(C_in, C_out, stride=stride)]
        for _ in range(n - 1):
            layers.append(Block(C_out, C_out, stride=1))
        return nn.Sequential(*layers)

    def forward(self, x):
        x = self.stem(x)
        x = self.stage1(x)
        x = self.stage2(x)
        x = self.stage3(x)
        return self.head(x)


# ── Compare variants ──
x = torch.randn(1, 3, 224, 224)
for platform, config in PLATFORM_CONFIGS.items():
    model = PlatformAwareDetector(platform=platform, num_classes=10)
    model.eval()
    with torch.no_grad():
        out = model(x)
    params = sum(p.numel() for p in model.parameters())
    print(f"{platform:15s} | {config['description']:40s} | "
          f"{params/1e3:6.1f}K params | output: {out.shape}")`
        },

        // ── Section 3: ONNX as Interchange ──
        {
          type: "heading",
          text: "ONNX as the Cross-Platform Interchange Format"
        },
        {
          type: "text",
          text: "ONNX (Open Neural Network Exchange) serves as the universal interchange format between training frameworks and deployment runtimes. The workflow: PyTorch → ONNX (via torch.onnx.export) → platform-specific format (TFLite, TensorRT, CoreML, QNN). Key considerations for cross-platform ONNX: (1) Opset version compatibility — different runtimes support different ONNX opsets. Target opset 13+ for broad compatibility. (2) Dynamic vs static shapes — some runtimes (TensorRT, Edge TPU) require static shapes; others (ONNX Runtime, TFLite) support dynamic. Always export with explicit static shapes for edge deployment. (3) Operator support — not every ONNX op is supported on every runtime. Custom ops or exotic activations may need fallback implementations. Use ONNX Runtime's operator support matrix to verify before designing your architecture."
        },

        // ── Section 4: Testing Strategy ──
        {
          type: "heading",
          text: "Cross-Platform Validation Strategy"
        },
        {
          type: "text",
          text: "When deploying one model family to multiple platforms, correctness validation is critical. The validation pipeline should: (1) Numerical equivalence — run the same input through PyTorch, ONNX, and each target runtime. Compare outputs with cosine similarity > 0.999 and max absolute error < 0.01 for FP32, < 0.5 for INT8. (2) Accuracy validation — run the full test set through each platform variant and verify accuracy is within the acceptable delta. (3) Latency profiling — measure per-layer and end-to-end latency on each target device. Identify bottleneck layers. (4) Memory profiling — measure peak activation memory. On devices with limited SRAM (MCUs), this is often the binding constraint, not model size."
        },
        {
          type: "callout",
          variant: "info",
          title: "The Rule of Platform Parity",
          text: "In production edge ML, you should never have a model that runs only on one platform unless the product truly has only one hardware target. Build your CI/CD pipeline to export, quantize, validate, and benchmark every model on every target platform. This catches platform-specific regressions early (e.g., a new ONNX opset breaking TFLite conversion, or a layer configuration that causes 10x slowdown on one specific DSP)."
        },
        {
          type: "diagram",
          code: `Cross-Platform Deployment Pipeline

  ┌──────────────┐
  │  PyTorch      │
  │  Training     │
  └──────┬───────┘
         │ torch.onnx.export()
         ▼
  ┌──────────────┐
  │  ONNX Model  │ ← Graph optimization (onnxoptimizer)
  └──┬─────┬────┬┘   Shape inference, constant folding
     │     │    │
     ▼     ▼    ▼
  ┌─────┐ ┌────┐ ┌──────┐ ┌───────┐
  │TFLite│ │TRT │ │CoreML│ │  QNN  │
  │INT8  │ │INT8│ │FP16  │ │ INT8  │
  └──┬───┘ └─┬──┘ └──┬───┘ └──┬────┘
     │       │       │        │
     ▼       ▼       ▼        ▼
  ┌─────┐ ┌─────┐ ┌──────┐ ┌───────┐
  │ ARM │ │Jetson│ │iPhone│ │Hexagon│
  │ CPU │ │ Orin │ │ ANE  │ │  DSP  │
  └─────┘ └─────┘ └──────┘ └───────┘

  Each path: export → quantize → validate (numerics + accuracy) → benchmark`
        },
      ]
    },

  ];
})();
