// Patches the Quantization module (m17) with full tutorial lesson content.
// Loaded after curriculum.js. m17 = CURRICULUM.phases[5].modules[1]
(function patchQuantizationLessons() {
  const m = CURRICULUM.phases[5].modules[1]; // phase-6 (index 5), second module (m17)

  m.lessons = [

    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 1 — Why Quantization: Memory Bandwidth, Energy & Number Representations
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "why-quantization-bandwidth-energy-numbers",
      title: "Why Quantization: Memory Bandwidth, Energy & Number Representations",
      readTime: "16 min",
      content: [
        {
          type: "text",
          text: "Most engineers approach quantization as a compression trick — make the model smaller so it fits on a phone. That framing misses the real story. The dominant bottleneck in modern neural network inference is not compute — it is memory bandwidth. A single MAC (multiply-accumulate) operation on an INT8 accelerator takes a fraction of a picojoule, but fetching the operands from DRAM costs 100-200x more energy. Quantization is fundamentally a memory bandwidth optimization that happens to also reduce model size and unlock integer arithmetic units."
        },
        {
          type: "callout",
          variant: "info",
          title: "The Bandwidth Wall",
          text: "A typical edge SoC (e.g., Qualcomm Snapdragon 8 Gen 2) has ~50 GB/s DRAM bandwidth. A ResNet-50 forward pass requires reading ~100 MB of weights. At FP32 that is 100 MB; at INT8 it is 25 MB. The 4x bandwidth reduction translates almost directly to 4x inference speedup when the model is memory-bound — which most models are on edge devices."
        },

        // ── Section 1: The Memory Bandwidth Bottleneck ──
        {
          type: "heading",
          text: "The Memory Bandwidth Bottleneck"
        },
        {
          type: "text",
          text: "Modern accelerators (GPUs, NPUs, DSPs) have enormous compute throughput measured in TOPS (tera-operations per second). An Apple A17 Pro delivers ~35 TOPS for INT8. To keep those ALUs busy, you need to feed them data at a matching rate. But DRAM bandwidth is typically 50-100 GB/s on mobile. Let us do the arithmetic: 35 TOPS at INT8 means 35 trillion 1-byte operands per second = 35 TB/s required bandwidth. Actual bandwidth is 50 GB/s — a 700:1 ratio. This is the compute-to-memory ratio, and it means the hardware is starved for data ~99% of the time unless you exploit on-chip SRAM caches and reduce the size of each operand."
        },
        {
          type: "text",
          text: "Quantization attacks this bottleneck directly. Going from FP32 (4 bytes) to INT8 (1 byte) means 4x more weights and activations fit in the same cache line, the same SRAM bank, and the same DRAM burst. The effect compounds: smaller operands also mean smaller intermediate activations, less memory pressure, and fewer cache evictions. On a Cortex-A78 core with 512 KB L2 cache, an INT8 model can keep 4x more of its working set on-chip compared to FP32."
        },
        {
          type: "diagram",
          code: `Memory Hierarchy & Access Costs (approximate, 7nm process)

  ┌─────────────────────────────────────────────────────┐
  │  Register File    ~0.5 pJ/access    ~1 cycle        │
  ├─────────────────────────────────────────────────────┤
  │  L1 SRAM (64KB)   ~5 pJ/access      ~4 cycles      │
  ├─────────────────────────────────────────────────────┤
  │  L2 SRAM (512KB)  ~25 pJ/access     ~12 cycles     │
  ├─────────────────────────────────────────────────────┤
  │  DRAM (GB)         ~640 pJ/access    ~100+ cycles   │
  └─────────────────────────────────────────────────────┘

  INT8 MAC operation:  ~0.2 pJ  (compute)
  DRAM fetch of 1 byte: ~640 pJ (memory)

  Ratio: 3200:1 — memory access dominates energy by >3 orders of magnitude`
        },

        // ── Section 2: Energy Cost Comparisons ──
        {
          type: "heading",
          text: "MAC Energy Costs: The Horowitz Numbers"
        },
        {
          type: "text",
          text: "Mark Horowitz presented the seminal energy cost data at ISSCC 2014 (45nm process). These numbers have been updated for newer nodes but the ratios remain roughly constant. The key insight: the energy cost of arithmetic scales quadratically with bit-width, while memory access cost dominates everything."
        },
        {
          type: "comparison",
          headers: ["Operation", "Energy (pJ) @ 45nm", "Energy (pJ) @ 7nm (est.)", "Relative Cost"],
          rows: [
            ["8-bit INT Add", "0.03", "0.005", "1x"],
            ["8-bit INT Multiply", "0.2", "0.03", "6x"],
            ["16-bit FP Add", "0.4", "0.06", "12x"],
            ["16-bit FP Multiply", "1.1", "0.17", "34x"],
            ["32-bit FP Add", "0.9", "0.14", "28x"],
            ["32-bit FP Multiply", "3.7", "0.56", "112x"],
            ["SRAM Read (8KB)", "5", "0.8", "160x"],
            ["DRAM Read", "640", "100", "20000x"]
          ]
        },
        {
          type: "text",
          text: "The critical takeaway: an INT8 multiply is ~18x cheaper than an FP32 multiply, but both are dwarfed by the cost of reading the operand from DRAM. Quantization wins on both fronts — cheaper arithmetic AND fewer bytes to move. For a typical conv layer with 3x3 kernel, the ratio of memory accesses to compute operations (arithmetic intensity) is very low, making memory bandwidth the binding constraint."
        },

        // ── Section 3: Number Representations Deep Dive ──
        {
          type: "heading",
          text: "Number Representations: FP32, FP16, BF16, INT8, INT4"
        },
        {
          type: "text",
          text: "To understand quantization you must understand what bits represent in each format. Every floating-point number follows IEEE 754: value = (-1)^sign * 2^(exponent - bias) * (1 + mantissa). The bit allocation between exponent and mantissa determines the trade-off between dynamic range and precision."
        },
        {
          type: "diagram",
          code: `IEEE 754 Float Formats — Bit Layout

FP32 (float32):  [1 sign | 8 exponent | 23 mantissa]  = 32 bits
                  Range: ~1.2e-38 to ~3.4e+38
                  Precision: ~7.2 decimal digits

FP16 (float16):  [1 sign | 5 exponent | 10 mantissa]  = 16 bits
                  Range: ~6.1e-5 to ~6.5e+4
                  Precision: ~3.3 decimal digits

BF16 (bfloat16): [1 sign | 8 exponent | 7 mantissa]   = 16 bits
                  Range: ~1.2e-38 to ~3.4e+38  (SAME as FP32!)
                  Precision: ~2.4 decimal digits

INT8 (signed):   [1 sign | 7 magnitude]                = 8 bits
                  Range: -128 to +127
                  Precision: exact integers only

INT4 (signed):   [1 sign | 3 magnitude]                = 4 bits
                  Range: -8 to +7
                  Precision: exact integers, only 16 values`
        },
        {
          type: "text",
          text: "BF16 deserves special attention. Google introduced it specifically for deep learning. By keeping the same 8-bit exponent as FP32, BF16 preserves FP32's enormous dynamic range (~1e-38 to ~3e+38) while sacrificing mantissa precision (7 bits vs 23 bits). This works because neural network training is far more sensitive to range (gradients can span many orders of magnitude) than to precision (individual weight values do not need 7 decimal digits of accuracy). Converting FP32 to BF16 is trivial — just truncate the lower 16 bits of the mantissa."
        },
        {
          type: "text",
          text: "FP16, by contrast, has only 5 exponent bits giving a max value of ~65504. This is problematic during training where loss values and gradients can easily exceed this range, causing overflow to infinity. That is why FP16 training requires loss scaling — multiplying the loss by a large factor before backprop, then dividing gradients after. BF16 training needs no such workaround."
        },

        // ── Section 4: Why DL Tolerates Low Precision ──
        {
          type: "heading",
          text: "Why Deep Learning Models Tolerate Low Precision"
        },
        {
          type: "text",
          text: "Neural networks are remarkably robust to quantization noise for several deep reasons. First, weight distributions in trained models are approximately Gaussian with small variance — most weights cluster near zero. A symmetric INT8 quantization with 256 levels can represent this distribution with very low error because the levels are densely packed where the weights are concentrated."
        },
        {
          type: "text",
          text: "Second, activations after ReLU are sparse — often 50-90% zeros in typical CNNs. Zero maps to zero exactly in any quantization scheme, so sparsity is preserved perfectly. Third, neural networks are trained with stochastic gradient descent, which inherently adds noise to the optimization process. The model has already learned to be robust to noise — quantization noise is just another form of noise, typically smaller than SGD noise during training."
        },
        {
          type: "text",
          text: "Fourth, redundancy: modern networks are heavily over-parameterized. ResNet-50 has 25.6M parameters but can be pruned to 10% of its weights with <1% accuracy loss. This redundancy means quantization errors in individual weights are absorbed by the ensemble effect of millions of other weights."
        },
        {
          type: "list",
          items: [
            "Weight distributions are Gaussian-like with small variance — most quantization levels cover the dense center",
            "Post-ReLU activations are sparse (50-90% zeros) — zero is represented exactly",
            "SGD training noise builds in implicit robustness to perturbations",
            "Over-parameterization provides redundancy that absorbs per-weight errors",
            "Batch normalization rescales activations into well-behaved ranges before each layer",
            "Softmax at the output saturates, making the final prediction robust to small logit changes"
          ]
        },

        // ── Section 5: Float32 to INT8 Step by Step ──
        {
          type: "heading",
          text: "Float32 to INT8 Quantization: Step-by-Step Math"
        },
        {
          type: "text",
          text: "Let us walk through the actual math of converting a floating-point tensor to INT8. We will use affine (asymmetric) quantization where the mapping is: Q = round(x / scale + zero_point), and the inverse is: x_approx = scale * (Q - zero_point). The scale and zero_point are chosen so that the float range [x_min, x_max] maps exactly to the int range [0, 255] for unsigned or [-128, 127] for signed."
        },
        {
          type: "code",
          language: "python",
          code: `import numpy as np

# Step 1: Start with a floating-point weight tensor
weights_fp32 = np.array([0.023, -0.87, 1.45, -0.002, 0.56, -1.23, 0.91, 0.003],
                         dtype=np.float32)

print("FP32 weights:", weights_fp32)
print("Range: [{:.3f}, {:.3f}]".format(weights_fp32.min(), weights_fp32.max()))
print("Size: {} bytes".format(weights_fp32.nbytes))

# Step 2: Compute scale and zero_point for unsigned INT8 [0, 255]
x_min, x_max = weights_fp32.min(), weights_fp32.max()
qmin, qmax = 0, 255  # unsigned INT8

scale = (x_max - x_min) / (qmax - qmin)
zero_point = round(-x_min / scale)  # maps x_min -> 0
zero_point = int(np.clip(zero_point, qmin, qmax))

print(f"\\nScale: {scale:.6f}")
print(f"Zero point: {zero_point}")
print(f"  (zero_point maps to float value: {scale * (0 - zero_point) + x_min:.4f})")

# Step 3: Quantize — map each float to nearest integer in [0, 255]
quantized = np.clip(np.round(weights_fp32 / scale + zero_point), qmin, qmax).astype(np.uint8)
print(f"\\nQuantized (uint8): {quantized}")
print(f"Size: {quantized.nbytes} bytes  (4x smaller!)")

# Step 4: Dequantize — reconstruct approximate float values
dequantized = scale * (quantized.astype(np.float32) - zero_point)
print(f"\\nDequantized: {dequantized}")

# Step 5: Measure quantization error
error = np.abs(weights_fp32 - dequantized)
print(f"Absolute errors: {error}")
print(f"Max error: {error.max():.6f}")
print(f"Mean error: {error.mean():.6f}")
print(f"Error as % of range: {100 * error.mean() / (x_max - x_min):.2f}%")`
        },
        {
          type: "text",
          text: "Notice the quantization error is bounded by scale/2 in the worst case (rounding error). With 256 levels spanning a range of ~2.68, the scale is ~0.0105, so the maximum error per element is ~0.005 — far smaller than typical weight magnitudes. This is why INT8 quantization preserves accuracy for most models: the per-element error is negligible relative to the weight values themselves."
        },

        // ── Section 6: Dynamic Range vs Precision ──
        {
          type: "heading",
          text: "Dynamic Range vs Precision: Concrete Trade-offs"
        },
        {
          type: "text",
          text: "Every number format makes a trade-off between dynamic range (the ratio of largest to smallest representable nonzero value) and precision (the spacing between adjacent representable values). FP32 has enormous dynamic range (~1e38 / 1e-38 = 1e76) but INT8 has a dynamic range of only 255:1. This means INT8 quantization forces you to choose a fixed range and accept that anything outside it is clipped."
        },
        {
          type: "comparison",
          headers: ["Format", "Dynamic Range", "Precision (near 1.0)", "Best For"],
          rows: [
            ["FP32", "~1e76", "~1e-7", "Training, reference inference"],
            ["BF16", "~1e76", "~0.008", "Training (same range as FP32)"],
            ["FP16", "~1e8", "~0.001", "Mixed-precision training/inference"],
            ["INT8", "255:1", "uniform (= scale)", "Edge inference, most layers"],
            ["INT4", "15:1", "uniform (= scale)", "Weight-only quant for LLMs"]
          ]
        },
        {
          type: "text",
          text: "The limited dynamic range of INT8 is why calibration — choosing the right [x_min, x_max] clipping range — is the central challenge of post-training quantization. Clip too wide and you waste levels on empty space. Clip too narrow and you saturate outliers. We will cover calibration strategies in detail in Lesson 3."
        },
        {
          type: "callout",
          variant: "warning",
          title: "Outlier Sensitivity",
          text: "A single outlier activation can ruin INT8 quantization for an entire tensor. If 99.99% of values are in [-1, 1] but one value is 10, the scale becomes ~10/127 = 0.079, meaning the 256 quantization levels are spread over [-10, 10] instead of [-1, 1]. The vast majority of values get squashed into a small number of levels, destroying precision. This is the root cause of most PTQ accuracy failures, especially in attention layers of transformers where activations have heavy tails."
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 2 — Quantization Fundamentals: Affine, Symmetric, Per-Channel
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "quantization-fundamentals-affine-symmetric",
      title: "Quantization Fundamentals: Affine, Symmetric, Per-Channel",
      readTime: "18 min",
      content: [
        {
          type: "text",
          text: "Now that you understand why quantization matters and how numbers are represented, we need to formalize the two core quantization schemes — affine (asymmetric) and symmetric — and understand the critical distinction between per-tensor and per-channel granularity. These are not academic variants: choosing the wrong scheme for your model can mean the difference between <0.5% accuracy loss and a completely broken model. Every production quantization tool (TensorRT, ONNX Runtime, TFLite, Core ML) implements these schemes, and understanding them lets you debug failures instead of treating quantization as a black box."
        },

        // ── Section 1: Affine (Asymmetric) Quantization ──
        {
          type: "heading",
          text: "Affine (Asymmetric) Quantization"
        },
        {
          type: "text",
          text: "Affine quantization maps a floating-point range [alpha, beta] to the full integer range [qmin, qmax]. The mapping uses two parameters: a scale (float) and a zero_point (integer). The zero_point is the integer value that corresponds to floating-point zero. This is critical because zero has special meaning in neural networks — ReLU outputs zeros, zero-padding introduces zeros, and skip connections add to zero-initialized tensors. If floating-point 0.0 does not map to an exact integer, you get a systematic bias error that accumulates through the network."
        },
        {
          type: "text",
          text: "The quantization formulas are:\n\nQuantize:    Q(x) = clamp(round(x / scale + zero_point), qmin, qmax)\nDequantize:  x' = scale * (Q - zero_point)\n\nWhere:\n  scale = (beta - alpha) / (qmax - qmin)\n  zero_point = round(qmin - alpha / scale)\n\nFor unsigned INT8: qmin=0, qmax=255\nFor signed INT8:   qmin=-128, qmax=127"
        },
        {
          type: "text",
          text: "The zero_point ensures that float 0.0 maps exactly to an integer with zero quantization error. This is enforced by construction: zero_point = round(-alpha / scale) when qmin = 0. During dequantization, scale * (zero_point - zero_point) = 0.0 exactly. Without this guarantee, zero-padding in convolutions would introduce a small constant bias at every padded position, compounding through dozens of layers."
        },
        {
          type: "diagram",
          code: `Affine Quantization Mapping:

  Float range:    [alpha] ─────────── [0.0] ─────────── [beta]
                     │                  │                   │
                     ▼                  ▼                   ▼
  Int range:      [qmin] ──────── [zero_point] ──────── [qmax]
                     0                 zp                  255

  Key property: float 0.0  <──>  integer zero_point  (exact, no error)

  Example:  alpha=-1.5, beta=3.5, qmin=0, qmax=255
    scale = (3.5 - (-1.5)) / (255 - 0) = 5.0 / 255 = 0.01961
    zero_point = round(0 - (-1.5) / 0.01961) = round(76.5) = 76
    float 0.0  -> round(0.0 / 0.01961 + 76) = 76  ✓  exact zero`
        },

        // ── Section 2: Symmetric Quantization ──
        {
          type: "heading",
          text: "Symmetric Quantization"
        },
        {
          type: "text",
          text: "Symmetric quantization is a simplification where zero_point is fixed at 0 (for signed integers). The float range is forced to be symmetric around zero: [-alpha, +alpha] where alpha = max(|x_min|, |x_max|). The formula simplifies to:\n\nscale = alpha / (2^(b-1) - 1)\nQ(x) = clamp(round(x / scale), -2^(b-1), 2^(b-1) - 1)\n\nFor INT8: scale = alpha / 127, range = [-127, 127] (we sacrifice -128 for symmetry)."
        },
        {
          type: "text",
          text: "The advantage of symmetric quantization is computational efficiency. With zero_point = 0, the dequantization simplifies to x' = scale * Q. More importantly, when both weights and activations use symmetric quantization, the quantized matmul simplifies dramatically. In affine quantization, expanding (s_x * (Q_x - zp_x)) * (s_w * (Q_w - zp_w)) produces four cross terms including a zp_x * zp_w constant and terms involving sums of Q_x and Q_w. In symmetric quantization, it reduces to s_x * s_w * (Q_x * Q_w) — a single integer matmul followed by a single float scale multiply."
        },
        {
          type: "text",
          text: "The trade-off: symmetric quantization wastes levels when the distribution is asymmetric. If weights range from [-0.1, 2.0], symmetric quantization uses alpha=2.0, mapping [-2.0, 2.0] to [-127, 127]. The range [-2.0, -0.1] is allocated ~120 levels that are almost entirely unused. Affine quantization would map [-0.1, 2.0] using all 256 levels, giving ~2x better precision. In practice, weights are often nearly symmetric (Gaussian around zero), so the waste is small. Activations after ReLU are strictly non-negative and benefit significantly from affine quantization."
        },
        {
          type: "comparison",
          headers: ["Property", "Affine (Asymmetric)", "Symmetric"],
          rows: [
            ["Zero point", "Computed; maps float 0.0 to an integer", "Fixed at 0"],
            ["Float range", "[alpha, beta] (any)", "[-alpha, +alpha] symmetric"],
            ["Matmul complexity", "4 cross terms, needs pre-computed sums", "Single INT matmul + scale"],
            ["Hardware support", "Universal but slower kernel", "NVIDIA INT8 Tensor Cores, ARM NEON optimized"],
            ["Best for weights", "Good if asymmetric distribution", "Usually sufficient (weights are ~Gaussian)"],
            ["Best for activations", "Excellent for post-ReLU (non-negative)", "Wastes half the range for post-ReLU"]
          ]
        },

        // ── Section 3: Per-Tensor vs Per-Channel ──
        {
          type: "heading",
          text: "Per-Tensor vs Per-Channel Quantization"
        },
        {
          type: "text",
          text: "Per-tensor quantization uses a single scale and zero_point for the entire weight tensor. Per-channel quantization uses separate scale and zero_point for each output channel (axis 0 of the weight tensor). The difference is dramatic for convolutions because different filters often learn very different weight ranges."
        },
        {
          type: "text",
          text: "Consider a Conv2D with weight shape [64, 3, 3, 3] (64 output channels). Some filters might detect low-contrast edges with weights in [-0.01, 0.01], while other filters detect high-contrast features with weights in [-2.0, 2.0]. Per-tensor quantization must use scale = 2.0/127 = 0.0157 for the entire tensor, giving the small-range filters effectively only 1-2 quantization levels. Per-channel quantization gives the small-range filter scale = 0.01/127 = 0.00008, providing 127 levels to represent its weights. This can mean the difference between 0.5% and 15% accuracy degradation."
        },
        {
          type: "diagram",
          code: `Per-Tensor vs Per-Channel Quantization of Conv Weights

  Weight tensor shape: [C_out, C_in, K_h, K_w] = [4, 3, 3, 3]

  Per-Tensor (one scale for all):
  ┌──────────────────────────────────────────────┐
  │  Filter 0: range [-0.01, 0.01]  → 1 level!  │  scale = 2.0/127 = 0.0157
  │  Filter 1: range [-2.0, 2.0]    → 255 levels │  (determined by max range)
  │  Filter 2: range [-0.5, 0.5]    → 64 levels  │
  │  Filter 3: range [-0.8, 0.8]    → 102 levels │
  └──────────────────────────────────────────────┘

  Per-Channel (one scale per output channel):
  ┌──────────────────────────────────────────────┐
  │  Filter 0: range [-0.01, 0.01]  → 127 levels │  scale_0 = 0.01/127
  │  Filter 1: range [-2.0, 2.0]    → 255 levels │  scale_1 = 2.0/127
  │  Filter 2: range [-0.5, 0.5]    → 127 levels │  scale_2 = 0.5/127
  │  Filter 3: range [-0.8, 0.8]    → 127 levels │  scale_3 = 0.8/127
  └──────────────────────────────────────────────┘

  Per-channel gives every filter its full 127-255 quantization levels.`
        },
        {
          type: "text",
          text: "Per-channel quantization is now the industry standard for weights. Every production framework supports it: TensorRT, ONNX Runtime, TFLite, PyTorch, Core ML. It adds negligible overhead — the per-channel scales are a vector of C_out floats, applied once after the integer matmul. Activations typically remain per-tensor quantized because per-channel activation quantization would require knowing the channel ranges dynamically, adding significant overhead."
        },

        // ── Section 4: Quantized Convolution Pipeline ──
        {
          type: "heading",
          text: "The Quantized Conv2D Inference Pipeline"
        },
        {
          type: "text",
          text: "Understanding how a convolution layer executes in INT8 end-to-end is essential for debugging quantization failures. The pipeline has multiple stages, each with specific precision requirements to avoid overflow and maintain accuracy."
        },
        {
          type: "diagram",
          code: `Quantized Conv2D Pipeline (Symmetric weights, Affine activations)

  Input (INT8)  Weights (INT8, per-channel scales)
       │              │
       ▼              ▼
  ┌─────────────────────────┐
  │  INT8 x INT8 MatMul     │  Each multiply: INT8 * INT8 = INT16
  │  with INT32 accumulator  │  Accumulate into INT32 (avoid overflow)
  │                          │  K*K*C_in products accumulated
  └────────────┬─────────────┘
               ▼
  ┌─────────────────────────┐
  │  Add Bias (INT32)       │  Bias is pre-quantized to INT32
  │  bias_q = bias / (s_x   │  s_x = input scale, s_w = weight scales
  │            * s_w)        │
  └────────────┬─────────────┘
               ▼
  ┌─────────────────────────┐
  │  Requantize to INT8     │  output = round(acc * M) where
  │  (with output scale)     │  M = s_x * s_w / s_out
  │  + ReLU fusion          │  ReLU: clamp lower bound to zero_point
  └────────────┬─────────────┘
               ▼
  Output (INT8, with output scale & zero_point)`
        },
        {
          type: "text",
          text: "The INT32 accumulator is critical. A 3x3 convolution over 256 input channels accumulates 3*3*256 = 2304 INT8*INT8 products. Each product can be up to 127*127 = 16129, so the accumulator can reach 2304 * 16129 = ~37 million, well within INT32 range (2.1 billion). But for large kernels or many input channels, you must verify the accumulator will not overflow. For depthwise convolutions (C_in=1 per group), the accumulation is over K*K values only, so INT16 accumulators sometimes suffice."
        },

        // ── Section 5: Worked Example ──
        {
          type: "heading",
          text: "Worked Example: INT8 Conv2D With Real Numbers"
        },
        {
          type: "text",
          text: "Let us trace a 1x1 convolution (single spatial position) through the full quantized pipeline with actual numbers to make this concrete."
        },
        {
          type: "code",
          language: "python",
          code: `import numpy as np

# === FP32 Reference Computation ===
# 1x1 Conv with 2 input channels, 2 output channels, 1x1 kernel
W_fp32 = np.array([[0.5, -0.3],   # output channel 0
                    [0.1,  0.8]], dtype=np.float32)  # output channel 1
bias_fp32 = np.array([0.05, -0.02], dtype=np.float32)
x_fp32 = np.array([1.2, 0.7], dtype=np.float32)  # one spatial position, 2 channels

# FP32 result
y_fp32 = W_fp32 @ x_fp32 + bias_fp32
print("FP32 output:", y_fp32)  # [0.44, 0.66]

# === INT8 Quantized Computation ===
# Step 1: Quantize weights (symmetric, per-channel)
w_scales = np.abs(W_fp32).max(axis=1) / 127  # per output channel
W_int8 = np.round(W_fp32 / w_scales[:, None]).astype(np.int8)
print("Weight scales:", w_scales)
print("W_int8:", W_int8)

# Step 2: Quantize input activation (affine, per-tensor)
x_min, x_max = 0.0, 1.5  # calibrated range (from representative data)
x_scale = (x_max - x_min) / 255
x_zp = int(round(-x_min / x_scale))  # = 0 since x_min = 0
x_int8 = np.clip(np.round(x_fp32 / x_scale + x_zp), 0, 255).astype(np.uint8)
print("Input scale:", x_scale, "zero_point:", x_zp)
print("x_int8:", x_int8)

# Step 3: Integer matmul with INT32 accumulator
# For affine input: subtract zero_point first
x_shifted = x_int8.astype(np.int32) - x_zp
acc_int32 = W_int8.astype(np.int32) @ x_shifted
print("INT32 accumulator (before bias):", acc_int32)

# Step 4: Add bias (pre-quantized to INT32)
bias_scales = x_scale * w_scales  # one per output channel
bias_int32 = np.round(bias_fp32 / bias_scales).astype(np.int32)
acc_int32 = acc_int32 + bias_int32
print("INT32 accumulator (after bias):", acc_int32)

# Step 5: Requantize to INT8 output
y_min, y_max = -0.5, 1.5  # output activation range (calibrated)
y_scale = (y_max - y_min) / 255
y_zp = int(round(-y_min / y_scale))

# Effective scale: converts INT32 accumulator to output INT8
M = (x_scale * w_scales) / y_scale  # per output channel
y_int8 = np.clip(np.round(acc_int32 * M + y_zp), 0, 255).astype(np.uint8)
print("Output INT8:", y_int8)

# Step 6: Dequantize for comparison
y_deq = y_scale * (y_int8.astype(np.float32) - y_zp)
print("Dequantized output:", y_deq)
print("FP32 reference:    ", y_fp32)
print("Absolute error:    ", np.abs(y_fp32 - y_deq))`
        },

        // ── Section 6: Implementation Code ──
        {
          type: "heading",
          text: "Implementing Affine, Symmetric & Per-Channel Quantization"
        },
        {
          type: "code",
          language: "python",
          code: `import torch
import torch.nn as nn

class AffineQuantizer:
    """Unsigned affine (asymmetric) quantization to [0, 2^bits - 1]."""
    def __init__(self, bits=8):
        self.qmin = 0
        self.qmax = 2**bits - 1

    def compute_params(self, x: torch.Tensor):
        x_min = x.min().item()
        x_max = x.max().item()
        scale = (x_max - x_min) / (self.qmax - self.qmin)
        scale = max(scale, 1e-8)  # avoid division by zero
        zero_point = int(round(self.qmin - x_min / scale))
        zero_point = max(self.qmin, min(self.qmax, zero_point))
        return scale, zero_point

    def quantize(self, x, scale, zero_point):
        return torch.clamp(torch.round(x / scale + zero_point),
                           self.qmin, self.qmax).to(torch.uint8)

    def dequantize(self, q, scale, zero_point):
        return scale * (q.float() - zero_point)


class SymmetricQuantizer:
    """Signed symmetric quantization to [-2^(bits-1)+1, 2^(bits-1)-1]."""
    def __init__(self, bits=8):
        self.qmax = 2**(bits - 1) - 1  # 127 for INT8

    def compute_params(self, x: torch.Tensor):
        alpha = x.abs().max().item()
        scale = alpha / self.qmax
        scale = max(scale, 1e-8)
        return scale  # zero_point is always 0

    def quantize(self, x, scale):
        return torch.clamp(torch.round(x / scale),
                           -self.qmax, self.qmax).to(torch.int8)

    def dequantize(self, q, scale):
        return scale * q.float()


class PerChannelQuantizer:
    """Symmetric per-channel quantization along axis 0 (output channels)."""
    def __init__(self, bits=8):
        self.qmax = 2**(bits - 1) - 1

    def compute_params(self, weight: torch.Tensor):
        # weight shape: [C_out, C_in, K_h, K_w]
        # Compute scale per output channel
        flat = weight.reshape(weight.shape[0], -1)  # [C_out, C_in*K*K]
        alpha = flat.abs().max(dim=1).values        # [C_out]
        scales = alpha / self.qmax
        scales = torch.clamp(scales, min=1e-8)
        return scales  # shape: [C_out]

    def quantize(self, weight, scales):
        # scales shape: [C_out], broadcast over other dims
        shape = [-1] + [1] * (weight.dim() - 1)  # [C_out, 1, 1, 1]
        return torch.clamp(
            torch.round(weight / scales.reshape(shape)),
            -self.qmax, self.qmax
        ).to(torch.int8)

    def dequantize(self, q, scales):
        shape = [-1] + [1] * (q.dim() - 1)
        return scales.reshape(shape) * q.float()


# === Demo: Compare per-tensor vs per-channel ===
torch.manual_seed(42)
# Simulate a conv weight where channels have very different magnitudes
conv_weight = torch.randn(4, 3, 3, 3)
conv_weight[0] *= 0.01   # very small filter
conv_weight[1] *= 2.0    # large filter
conv_weight[2] *= 0.1    # medium-small
conv_weight[3] *= 1.0    # medium

# Per-tensor symmetric
sym_q = SymmetricQuantizer(bits=8)
scale_pt = sym_q.compute_params(conv_weight)
q_pt = sym_q.quantize(conv_weight, scale_pt)
deq_pt = sym_q.dequantize(q_pt, scale_pt)
err_pt = (conv_weight - deq_pt).abs()

# Per-channel symmetric
pch_q = PerChannelQuantizer(bits=8)
scales_pc = pch_q.compute_params(conv_weight)
q_pc = pch_q.quantize(conv_weight, scales_pc)
deq_pc = pch_q.dequantize(q_pc, scales_pc)
err_pc = (conv_weight - deq_pc).abs()

for ch in range(4):
    pt_err = err_pt[ch].mean().item()
    pc_err = err_pc[ch].mean().item()
    ratio = pt_err / max(pc_err, 1e-10)
    print(f"Channel {ch}: per-tensor err={pt_err:.6f}, "
          f"per-channel err={pc_err:.6f}, ratio={ratio:.1f}x")`
        },
        {
          type: "text",
          text: "You will see that per-channel quantization reduces error on the small-magnitude channels by 10-100x compared to per-tensor, while maintaining the same error on the large channels. This is why per-channel is essential for production deployment — it is a free accuracy improvement with negligible runtime cost."
        },
        {
          type: "callout",
          variant: "info",
          title: "Industry Standard Practice",
          text: "The standard recipe used by TensorRT, ONNX Runtime, and TFLite: symmetric per-channel quantization for weights + affine per-tensor quantization for activations. Weights are symmetric because they are known at compile time and tend to be symmetric. Activations use affine because post-ReLU activations are non-negative and affine avoids wasting half the integer range."
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 3 — Post-Training Quantization (PTQ): Calibration & Strategies
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "ptq-calibration-strategies",
      title: "Post-Training Quantization (PTQ): Calibration & Strategies",
      readTime: "15 min",
      content: [
        {
          type: "text",
          text: "Post-training quantization converts a pre-trained FP32 model to INT8 without any retraining. It is the fastest path to deployment — no training infrastructure needed, no GPU hours burned, typically completed in minutes. The catch: PTQ quality depends entirely on calibration — the process of determining the optimal quantization ranges for activations. Weights have known ranges (just inspect the tensors), but activation ranges depend on input data and must be measured empirically."
        },

        // ── Section 1: Static vs Dynamic PTQ ──
        {
          type: "heading",
          text: "Static vs Dynamic PTQ"
        },
        {
          type: "text",
          text: "Dynamic quantization computes activation scales on-the-fly during inference for each input. The weights are pre-quantized to INT8 at load time, but activations remain in FP32 until just before each quantized operation, where the min/max is computed, scales derived, and the activation quantized. This adds overhead (computing min/max per layer per inference) but requires zero calibration data."
        },
        {
          type: "text",
          text: "Static quantization pre-computes activation scales using a calibration dataset. During inference, both weights and activations use pre-determined INT8 scales — no runtime range computation. This is faster but requires representative calibration data and assumes activation distributions are stable across inputs."
        },
        {
          type: "comparison",
          headers: ["Property", "Dynamic PTQ", "Static PTQ"],
          rows: [
            ["Calibration data required", "None", "100-1000 representative samples"],
            ["Activation quantization", "Computed per-input at runtime", "Pre-computed, fixed"],
            ["Runtime overhead", "Higher (online min/max + quant)", "Lower (all scales pre-baked)"],
            ["Accuracy", "Often better (input-specific ranges)", "Good if calibration is representative"],
            ["Best for", "NLP models (variable sequence length)", "Vision models (stable activation ranges)"],
            ["Speed gain vs FP32", "~1.5-2x (memory-bound layers)", "~2-4x (all layers quantized)"],
            ["Framework support", "PyTorch torch.ao.quantization", "TensorRT, ONNX RT, TFLite, Core ML"]
          ]
        },

        // ── Section 2: Calibration Methods ──
        {
          type: "heading",
          text: "Calibration: Determining Activation Ranges"
        },
        {
          type: "text",
          text: "For static PTQ, you run a calibration dataset (typically 100-1000 samples) through the FP32 model and record the activation distributions at each quantization point. The calibration method determines how you convert these distributions into scale and zero_point values. The choice of calibration method is often the single biggest lever for PTQ accuracy."
        },
        {
          type: "heading",
          text: "Min-Max Calibration"
        },
        {
          type: "text",
          text: "The simplest approach: track the running min and max of activations across the calibration set. scale = (max - min) / 255. This is fast and deterministic but extremely sensitive to outliers. A single anomalous activation can stretch the range, wasting quantization levels on empty space. In practice, min-max calibration is rarely the best choice for activations, though it works well for weights (where you can inspect the actual min/max directly)."
        },
        {
          type: "heading",
          text: "Percentile Calibration"
        },
        {
          type: "text",
          text: "Clip the range at a percentile rather than using the absolute min/max. Typical choices: 99.9th or 99.99th percentile. Values beyond the clipping threshold are saturated (mapped to qmin or qmax). This trades a small amount of saturation error on outliers for much better precision on the bulk of the distribution. For activations with heavy tails (common in transformers), percentile calibration can recover 2-5% accuracy compared to min-max."
        },
        {
          type: "heading",
          text: "KL-Divergence (Entropy) Calibration"
        },
        {
          type: "text",
          text: "TensorRT's default calibration method. The idea: find the clipping threshold T that minimizes the KL-divergence (information loss) between the original FP32 activation distribution and its quantized approximation. This is more principled than percentile because it explicitly optimizes for minimal information loss rather than using an arbitrary percentile."
        },
        {
          type: "text",
          text: "The algorithm works as follows:\n1. Collect a histogram of activation values with high resolution (e.g., 2048 bins)\n2. For each candidate threshold T (e.g., 128 to 2048 bins):\n   a. Clip the histogram at T (merge everything beyond T into the last bin)\n   b. Quantize the clipped histogram to 128 bins (simulating INT8)\n   c. Expand the 128-bin quantized histogram back to T bins\n   d. Compute KL-divergence between original (clipped) and expanded quantized distribution\n3. Choose T with minimum KL-divergence\n4. Derive scale from T: scale = T / 127 (for symmetric)"
        },
        {
          type: "code",
          language: "python",
          code: `import numpy as np
from scipy.stats import entropy

def kl_divergence_calibration(activation_histogram, num_quantized_bins=128):
    """
    TensorRT-style KL-divergence calibration.

    Given a high-resolution histogram of FP32 activations, find the
    optimal clipping threshold that minimizes KL(original || quantized).

    Args:
        activation_histogram: np.array of bin counts (e.g., 2048 bins)
        num_quantized_bins: target number of quantization bins (128 for INT8 symmetric)

    Returns:
        optimal_threshold_bin: the bin index at which to clip
    """
    num_bins = len(activation_histogram)
    # Normalize to a probability distribution
    hist = activation_histogram.copy().astype(np.float64)
    hist[hist == 0] = 1e-10  # avoid log(0)

    best_divergence = float("inf")
    best_threshold = num_quantized_bins  # minimum meaningful threshold

    # Try each possible clipping threshold from 128 to num_bins
    for threshold in range(num_quantized_bins, num_bins + 1):
        # Step 1: Clip the distribution at 'threshold'
        # Everything beyond threshold is merged into the last bin
        clipped = hist[:threshold].copy()
        clipped[-1] += hist[threshold:].sum()

        # Step 2: Quantize the clipped distribution to num_quantized_bins bins
        # This simulates what INT8 does to the distribution
        bin_width = threshold / num_quantized_bins
        quantized = np.zeros(num_quantized_bins, dtype=np.float64)
        for i in range(num_quantized_bins):
            start = int(round(i * bin_width))
            end = int(round((i + 1) * bin_width))
            end = min(end, threshold)
            if start < end:
                quantized[i] = clipped[start:end].sum()

        # Step 3: Expand quantized back to 'threshold' bins for comparison
        expanded = np.zeros(threshold, dtype=np.float64)
        for i in range(num_quantized_bins):
            start = int(round(i * bin_width))
            end = int(round((i + 1) * bin_width))
            end = min(end, threshold)
            num_expanded = end - start
            if num_expanded > 0:
                expanded[start:end] = quantized[i] / num_expanded

        # Step 4: Normalize both to probability distributions
        clipped_norm = clipped / clipped.sum()
        expanded_norm = expanded / expanded.sum()

        # Avoid log(0) in KL computation
        clipped_norm = np.clip(clipped_norm, 1e-10, None)
        expanded_norm = np.clip(expanded_norm, 1e-10, None)

        # Step 5: Compute KL divergence
        kl_div = entropy(clipped_norm, expanded_norm)

        if kl_div < best_divergence:
            best_divergence = kl_div
            best_threshold = threshold

    return best_threshold


# === Demo: Generate synthetic activation distribution and calibrate ===
np.random.seed(42)
# Simulate typical post-ReLU activations: mostly near zero, long tail
activations = np.concatenate([
    np.random.exponential(scale=0.5, size=100000),  # bulk near zero
    np.random.normal(loc=5.0, scale=1.0, size=500)  # outlier cluster
])
activations = np.clip(activations, 0, None)  # post-ReLU

# Create high-resolution histogram (2048 bins)
hist_range = (0, activations.max())
histogram, bin_edges = np.histogram(activations, bins=2048, range=hist_range)

# Run KL-divergence calibration
optimal_bin = kl_divergence_calibration(histogram, num_quantized_bins=128)
optimal_threshold = bin_edges[optimal_bin]

print(f"Activation range: [0, {activations.max():.2f}]")
print(f"Min-max scale: {activations.max() / 127:.6f}")
print(f"KL-optimal threshold: {optimal_threshold:.2f}")
print(f"KL-optimal scale: {optimal_threshold / 127:.6f}")
print(f"Clipping at {100 * (activations <= optimal_threshold).mean():.2f}% of values")`
        },
        {
          type: "text",
          text: "The KL-divergence calibration typically clips at around the 99.9th-99.99th percentile, but the exact threshold is determined by the shape of the distribution rather than an arbitrary percentile. For distributions with a long sparse tail, it clips aggressively. For distributions with significant density in the tail, it preserves more range."
        },

        // ── Section 3: Common Pitfalls ──
        {
          type: "heading",
          text: "Calibration Pitfalls & Debugging"
        },
        {
          type: "list",
          items: [
            "Non-representative calibration data: If you calibrate on bright images but deploy on low-light inputs, activation ranges will shift and accuracy degrades. Always calibrate on data that matches your deployment distribution.",
            "Batch normalization state: BatchNorm running_mean/running_var must be frozen (model.eval()) during calibration. If you accidentally calibrate in training mode, BN statistics get corrupted and all downstream activation ranges shift.",
            "Too few calibration samples: 100 samples is often the minimum. For models with input-dependent dynamic ranges (NLP, video), use 500-1000 samples. Diminishing returns beyond ~1000.",
            "Layer sensitivity varies wildly: The first and last layers of a network are typically most sensitive to quantization. A common pattern: keep first/last layers in FP16, quantize everything else to INT8.",
            "Depthwise convolutions are fragile: Depthwise separable convolutions have low channel count per group, making per-channel quantization less effective. These layers often need special handling.",
            "Residual connections accumulate error: In ResNets, quantization errors from the skip connection and the conv branch add up at each residual block, potentially compounding through 50+ blocks."
          ]
        },
        {
          type: "heading",
          text: "Per-Layer Error Analysis"
        },
        {
          type: "text",
          text: "When PTQ accuracy is unacceptable, the debugging workflow is: (1) quantize each layer independently while keeping all others in FP32, (2) measure the end-to-end accuracy for each single-layer quantization, (3) rank layers by sensitivity (accuracy drop), (4) keep the top-K most sensitive layers in higher precision (FP16 or FP32). This is called mixed-precision or sensitivity analysis and is the standard approach before resorting to QAT."
        },
        {
          type: "code",
          language: "python",
          code: `import torch
import torch.nn as nn

def per_layer_sensitivity_analysis(model, calibration_loader, eval_fn):
    """
    Quantize one layer at a time, measure accuracy impact.

    Args:
        model: FP32 model
        calibration_loader: DataLoader with calibration data
        eval_fn: function(model) -> accuracy (float)

    Returns:
        dict: {layer_name: accuracy_drop}
    """
    # Step 1: Baseline FP32 accuracy
    baseline_acc = eval_fn(model)
    print(f"FP32 baseline accuracy: {baseline_acc:.4f}")

    sensitivity = {}

    # Step 2: For each quantizable layer, quantize only that layer
    for name, module in model.named_modules():
        if not isinstance(module, (nn.Conv2d, nn.Linear)):
            continue

        # Save original weights
        original_weight = module.weight.data.clone()

        # Quantize this layer's weights (symmetric per-channel)
        scales = module.weight.data.reshape(
            module.weight.shape[0], -1
        ).abs().max(dim=1).values / 127.0
        scales = torch.clamp(scales, min=1e-8)

        shape = [-1] + [1] * (module.weight.dim() - 1)
        q_weight = torch.clamp(
            torch.round(module.weight.data / scales.reshape(shape)),
            -127, 127
        )
        # Dequantize back to float (simulated quantization)
        module.weight.data = q_weight * scales.reshape(shape)

        # Evaluate with this one layer quantized
        acc = eval_fn(model)
        drop = baseline_acc - acc
        sensitivity[name] = drop
        print(f"  {name:40s}  acc={acc:.4f}  drop={drop:+.4f}")

        # Restore original weights
        module.weight.data = original_weight

    # Sort by sensitivity (most sensitive first)
    ranked = sorted(sensitivity.items(), key=lambda x: x[1], reverse=True)
    print("\\nMost sensitive layers (keep in FP16):")
    for name, drop in ranked[:5]:
        print(f"  {name}: {drop:+.4f}")

    return sensitivity`
        },
        {
          type: "callout",
          variant: "warning",
          title: "The Mixed-Precision Sweet Spot",
          text: "In practice, keeping just 2-5% of layers in FP16 (the most sensitive ones) while quantizing the rest to INT8 often recovers 90%+ of the accuracy loss with minimal speed impact. This is the standard production approach: TensorRT and ONNX Runtime both support per-layer precision overrides. Always run sensitivity analysis before resorting to full QAT."
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 4 — QAT & Straight-Through Estimator
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "qat-straight-through-estimator",
      title: "Quantization-Aware Training (QAT) & Straight-Through Estimator",
      readTime: "16 min",
      content: [
        {
          type: "text",
          text: "When post-training quantization fails — accuracy drops more than 1-2% — the next tool in the arsenal is quantization-aware training (QAT). QAT inserts simulated quantization operations into the training graph so the model learns to be robust to quantization noise. The model's weights are adjusted via backpropagation to compensate for the information loss caused by rounding. QAT typically recovers accuracy to within 0.1-0.5% of the FP32 baseline, even for aggressive INT4 quantization."
        },

        // ── Section 1: Why PTQ Fails ──
        {
          type: "heading",
          text: "When and Why PTQ Fails"
        },
        {
          type: "text",
          text: "PTQ assumes that the model's learned weight and activation distributions can be directly quantized without significant loss. This breaks down in several scenarios:"
        },
        {
          type: "list",
          items: [
            "Models with high weight variance across channels (MobileNets, EfficientNets with depthwise convolutions)",
            "Transformer attention layers where softmax produces near-one-hot distributions with extreme dynamic range",
            "Sub-INT8 quantization (INT4, INT2) where 16 or 4 levels cannot adequately represent the weight distribution",
            "Models with narrow bottleneck layers (e.g., squeeze-and-excitation blocks) where few channels amplify per-channel quantization error",
            "Detection models where small-object features are subtle and quantization noise drowns the signal",
            "Models without batch normalization where weight ranges are unconstrained"
          ]
        },
        {
          type: "text",
          text: "In these cases, the model needs to 'see' quantization during training and adjust its weights to compensate. This is fundamentally different from PTQ: instead of finding the best quantization for fixed weights, QAT finds the best weights for a fixed quantization scheme."
        },

        // ── Section 2: Fake Quantization ──
        {
          type: "heading",
          text: "Fake Quantization: Simulating INT8 in FP32"
        },
        {
          type: "text",
          text: "QAT works by inserting 'fake quantization' (or 'simulated quantization') nodes into the computation graph. A fake-quant node takes a float tensor, quantizes it to INT8 (rounding to the nearest quantization level), then immediately dequantizes it back to float. The output is still float, but it has been 'snapped' to the nearest value representable in INT8. This simulates the effect of quantization while keeping the computation in float for gradient computation."
        },
        {
          type: "diagram",
          code: `Fake Quantization in QAT Forward Pass

  FP32 Input                         FP32 Output (quantized values)
      │                                      ▲
      ▼                                      │
  ┌──────────┐    ┌──────────┐    ┌──────────────┐
  │  Quantize │───▶│  Round   │───▶│  Dequantize  │
  │  x/s + zp │    │  to int  │    │  s*(q - zp)  │
  └──────────┘    └──────────┘    └──────────────┘

  FP32: 0.73 ──▶ 0.73/0.01 + 0 = 73 ──▶ round(73) = 73 ──▶ 0.01 * 73 = 0.73  ✓
  FP32: 0.735 ──▶ 0.735/0.01 = 73.5 ──▶ round(73.5) = 74 ──▶ 0.01 * 74 = 0.74
                                                                        ▲
                                                    quantization error: 0.005

  The forward pass "feels" the effect of quantization.
  The backward pass must handle the non-differentiable round() function.`
        },

        // ── Section 3: Straight-Through Estimator ──
        {
          type: "heading",
          text: "The Straight-Through Estimator (STE)"
        },
        {
          type: "text",
          text: "The central mathematical challenge of QAT: the round() function has zero derivative almost everywhere (it is piecewise constant) and undefined derivative at half-integers. If you use the true gradient of round(), no gradients flow through fake-quant nodes, and the model cannot learn. The straight-through estimator (STE), introduced by Bengio et al. (2013), resolves this by replacing the gradient of round() with 1 during backpropagation."
        },
        {
          type: "text",
          text: "Formally, define the fake-quant operation as:\n\nForward:  q(x) = clamp(round(x/s + zp), qmin, qmax)\n          x_hat = s * (q(x) - zp)\n\nBackward (STE):  dx_hat/dx = 1   if qmin <= x/s + zp <= qmax\n                 dx_hat/dx = 0   if x/s + zp < qmin or x/s + zp > qmax\n\nIn other words: pretend round() is the identity function in the backward pass, but still kill gradients for values that are clipped (outside the quantization range). The clipping gradient is exact — clamp truly has zero gradient outside its range. Only the round() gradient is approximated."
        },
        {
          type: "text",
          text: "Why does STE work despite being mathematically wrong? Two reasons. First, the round() error is bounded by scale/2, which is small — the STE gradient points in approximately the right direction. Second, the round() function oscillates rapidly (period = scale), so the average gradient over a small neighborhood is approximately 1, which is exactly what STE provides. Empirically, STE has been shown to work reliably across thousands of architectures, and remains the standard approach in all production QAT frameworks."
        },

        // ── Section 4: QAT Training Recipe ──
        {
          type: "heading",
          text: "QAT Training Recipe"
        },
        {
          type: "list",
          items: [
            "Start from a fully trained FP32 model — never QAT from scratch",
            "Insert fake-quant nodes after weights and after activations at each quantizable layer",
            "Use the same quantization scheme you will deploy (symmetric per-channel for weights, affine per-tensor for activations)",
            "Fine-tune for 5-10% of the original training schedule (e.g., 10 epochs if originally trained for 100)",
            "Use a lower learning rate: 1-10% of the original final learning rate",
            "Keep batch normalization in eval mode (frozen running stats) — critical for stable calibration",
            "Optionally: warm up without fake-quant for 1-2 epochs, then enable fake-quant gradually",
            "Monitor per-layer quantization error during training to detect divergence early"
          ]
        },

        // ── Section 5: FakeQuantize Implementation ──
        {
          type: "heading",
          text: "Implementing FakeQuantize with STE"
        },
        {
          type: "code",
          language: "python",
          code: `import torch
import torch.nn as nn
import torch.nn.functional as F

class FakeQuantize(torch.autograd.Function):
    """
    Fake quantization with Straight-Through Estimator (STE).

    Forward: quantize then dequantize (snaps to nearest INT8 value)
    Backward: pass gradients through as if round() were identity,
              but zero-out gradients for clipped (saturated) values.
    """
    @staticmethod
    def forward(ctx, x, scale, zero_point, qmin, qmax):
        # Quantize
        x_q = torch.clamp(torch.round(x / scale + zero_point), qmin, qmax)
        # Dequantize back to float
        x_hat = scale * (x_q - zero_point)

        # Save mask for backward: only pass gradients where not clipped
        mask = ((x / scale + zero_point) >= qmin) & ((x / scale + zero_point) <= qmax)
        ctx.save_for_backward(mask.float())

        return x_hat

    @staticmethod
    def backward(ctx, grad_output):
        mask, = ctx.saved_tensors
        # STE: pass gradient through, zero out where clipped
        grad_input = grad_output * mask
        # No gradients for scale, zero_point, qmin, qmax
        return grad_input, None, None, None, None


class FakeQuantizeModule(nn.Module):
    """
    Learnable fake quantization module for QAT.
    Tracks running min/max to compute scale and zero_point.
    """
    def __init__(self, bits=8, symmetric=True, per_channel=False, num_channels=1):
        super().__init__()
        self.bits = bits
        self.symmetric = symmetric
        self.per_channel = per_channel

        if symmetric:
            self.qmin = -(2**(bits - 1) - 1)
            self.qmax = 2**(bits - 1) - 1
        else:
            self.qmin = 0
            self.qmax = 2**bits - 1

        # Running statistics for calibration during QAT
        shape = (num_channels,) if per_channel else (1,)
        self.register_buffer("running_min", torch.zeros(shape))
        self.register_buffer("running_max", torch.zeros(shape))
        self.register_buffer("num_batches_tracked", torch.tensor(0, dtype=torch.long))
        self.momentum = 0.1

    def compute_scale_zp(self, x):
        if self.per_channel:
            # Reshape to [C, -1] and compute per-channel stats
            flat = x.reshape(x.shape[0], -1)
            x_min = flat.min(dim=1).values
            x_max = flat.max(dim=1).values
        else:
            x_min = x.min()
            x_max = x.max()

        if self.training:
            # Update running stats with EMA
            if self.num_batches_tracked == 0:
                self.running_min.copy_(x_min)
                self.running_max.copy_(x_max)
            else:
                self.running_min.mul_(1 - self.momentum).add_(x_min * self.momentum)
                self.running_max.mul_(1 - self.momentum).add_(x_max * self.momentum)
            self.num_batches_tracked += 1
            use_min, use_max = x_min, x_max
        else:
            use_min, use_max = self.running_min, self.running_max

        if self.symmetric:
            alpha = torch.max(use_min.abs(), use_max.abs())
            scale = alpha / self.qmax
            zero_point = torch.zeros_like(scale)
        else:
            scale = (use_max - use_min) / (self.qmax - self.qmin)
            zero_point = torch.round(self.qmin - use_min / scale)
            zero_point = torch.clamp(zero_point, self.qmin, self.qmax)

        scale = torch.clamp(scale, min=1e-8)
        return scale, zero_point

    def forward(self, x):
        scale, zero_point = self.compute_scale_zp(x)

        if self.per_channel:
            shape = [-1] + [1] * (x.dim() - 1)
            scale = scale.reshape(shape)
            zero_point = zero_point.reshape(shape)

        return FakeQuantize.apply(x, scale, zero_point, self.qmin, self.qmax)


# === QAT-enabled Conv2d wrapper ===
class QATConv2d(nn.Module):
    """Conv2d with fake quantization on weights and activations."""
    def __init__(self, in_channels, out_channels, kernel_size, **kwargs):
        super().__init__()
        self.conv = nn.Conv2d(in_channels, out_channels, kernel_size, **kwargs)
        # Weight fake-quant: symmetric, per-channel
        self.weight_fq = FakeQuantizeModule(
            bits=8, symmetric=True, per_channel=True,
            num_channels=out_channels
        )
        # Activation fake-quant: affine, per-tensor
        self.activation_fq = FakeQuantizeModule(
            bits=8, symmetric=False, per_channel=False
        )

    def forward(self, x):
        # Fake-quantize weights
        q_weight = self.weight_fq(self.conv.weight)
        # Run conv with fake-quantized weights
        out = F.conv2d(x, q_weight, self.conv.bias,
                       self.conv.stride, self.conv.padding)
        # Fake-quantize output activations
        out = self.activation_fq(out)
        return out


# === Demo: Compare FakeQuantize forward/backward ===
x = torch.randn(1, 4, requires_grad=True)
fq = FakeQuantizeModule(bits=8, symmetric=True)

# Forward: values are snapped to INT8 grid
x_hat = fq(x)
print("Input:         ", x.data)
print("Fake-quantized:", x_hat.data)
print("Difference:    ", (x - x_hat).data)

# Backward: STE passes gradients through
loss = x_hat.sum()
loss.backward()
print("Gradient:      ", x.grad)  # Should be all 1s (STE)`
        },

        // ── Section 6: Mixed-Precision QAT ──
        {
          type: "heading",
          text: "Mixed-Precision QAT & Sensitivity Analysis"
        },
        {
          type: "text",
          text: "Not all layers benefit equally from QAT. The standard workflow combines sensitivity analysis with QAT: first identify the most quantization-sensitive layers via per-layer analysis (as shown in Lesson 3), then apply QAT only to those layers while keeping others with simple PTQ. For extremely sensitive layers (often the first conv and last FC), you may keep them in FP16 entirely."
        },
        {
          type: "text",
          text: "Advanced QAT frameworks (e.g., NVIDIA's pytorch-quantization) support mixed bit-widths: some layers at INT8, others at INT4, others at FP16. The bit-width assignment can be automated using hardware-aware neural architecture search (NAS), where the search space includes bit-width per layer and the reward function includes both accuracy and latency on the target hardware."
        },
        {
          type: "code",
          language: "python",
          code: `import torch
import torch.nn as nn

def convert_model_to_qat(model, sensitive_layers=None, keep_fp16=None):
    """
    Convert a model to QAT mode.

    Args:
        model: FP32 pre-trained model
        sensitive_layers: set of layer names to apply QAT (others get PTQ)
        keep_fp16: set of layer names to keep in FP16 (no quantization)
    """
    sensitive_layers = sensitive_layers or set()
    keep_fp16 = keep_fp16 or set()

    for name, module in model.named_children():
        if name in keep_fp16:
            # Convert to FP16, no quantization
            module.half()
            print(f"  {name}: keeping FP16 (too sensitive)")
            continue

        if isinstance(module, nn.Conv2d):
            # Replace with QAT wrapper
            qat_conv = QATConv2d(
                module.in_channels, module.out_channels,
                module.kernel_size, stride=module.stride,
                padding=module.padding, bias=(module.bias is not None)
            )
            qat_conv.conv.weight.data.copy_(module.weight.data)
            if module.bias is not None:
                qat_conv.conv.bias.data.copy_(module.bias.data)
            setattr(model, name, qat_conv)
            print(f"  {name}: QAT-enabled (INT8)")

        elif len(list(module.children())) > 0:
            # Recurse into container modules
            convert_model_to_qat(module, sensitive_layers, keep_fp16)

    return model

# Usage pattern:
# model = load_pretrained_fp32_model()
# sensitivity = per_layer_sensitivity_analysis(model, ...)
# top_sensitive = {name for name, drop in sensitivity.items() if drop > 0.01}
# model = convert_model_to_qat(model, keep_fp16=top_sensitive)
# qat_train(model, train_loader, epochs=10, lr=1e-4)`
        },
        {
          type: "callout",
          variant: "info",
          title: "PyTorch Native QAT",
          text: "PyTorch provides torch.ao.quantization (formerly torch.quantization) with built-in QAT support. Use torch.ao.quantization.prepare_qat() to insert fake-quant nodes automatically, and torch.ao.quantization.convert() to produce the final INT8 model. The implementation above is pedagogical — in production, use the framework's built-in QAT tools for better hardware backend integration."
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 5 — Pruning: Structured, Unstructured & Lottery Ticket
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "pruning-structured-unstructured-lottery-ticket",
      title: "Pruning: Structured, Unstructured & the Lottery Ticket",
      readTime: "14 min",
      content: [
        {
          type: "text",
          text: "Pruning removes redundant parameters from a neural network to reduce computation and memory. While quantization reduces the precision of each parameter, pruning eliminates parameters entirely. The two techniques are complementary and are often combined in production: prune first (reduce parameter count), then quantize the remaining parameters to INT8. A ResNet-50 pruned to 50% sparsity and quantized to INT8 uses ~12.5x less memory than the original FP32 model."
        },

        // ── Section 1: Unstructured Pruning ──
        {
          type: "heading",
          text: "Unstructured (Weight-Level) Pruning"
        },
        {
          type: "text",
          text: "Unstructured pruning zeroes out individual weights based on some criterion (usually magnitude). After pruning, the weight tensors still have the same shape, but many values are zero. The surviving non-zero weights form a sparse pattern with no regularity — hence 'unstructured'."
        },
        {
          type: "text",
          text: "Magnitude pruning is the simplest and most common approach: sort all weights by absolute value, zero out the smallest p% of them. The intuition is that small weights contribute little to the output and can be removed with minimal accuracy impact. This is surprisingly effective — most models can be pruned to 80-90% sparsity (80-90% of weights zeroed) with less than 1% accuracy loss after fine-tuning."
        },
        {
          type: "text",
          text: "The catch: unstructured sparsity rarely translates to real speedups on commodity hardware. A sparse weight matrix with random zero patterns cannot be computed faster with standard dense matrix multiply kernels. You need either (1) sparse matrix libraries (cuSPARSE), which only outperform dense when sparsity exceeds ~95%, or (2) hardware with native sparse support like NVIDIA's 2:4 structured sparsity on Ampere/Hopper GPUs, where exactly 2 of every 4 values must be zero."
        },

        // ── Section 2: Structured Pruning ──
        {
          type: "heading",
          text: "Structured Pruning: Filters, Channels & Heads"
        },
        {
          type: "text",
          text: "Structured pruning removes entire structural units: complete convolution filters (all K*K*C_in weights for one output channel), entire attention heads in transformers, or complete neurons in fully-connected layers. The pruned model has smaller tensor dimensions — a Conv2D with 256 output filters pruned to 192 filters actually has shape [192, C_in, K, K] instead of [256, C_in, K, K]. This yields immediate speedups on any hardware with no sparse library required."
        },
        {
          type: "text",
          text: "The challenge with structured pruning: removing an output filter from layer L changes the output tensor shape, which means the input shape of layer L+1 must also change. For ResNets with skip connections, you must ensure the pruned residual branch and the skip connection have matching channel dimensions. This requires careful bookkeeping and sometimes constrains which filters can be pruned."
        },
        {
          type: "diagram",
          code: `Structured Pruning: Removing Conv Filters

  Before pruning:  Conv2d(64, 128, 3x3)   →  128 output channels
                   Next: Conv2d(128, 256, 3x3) expects 128 input channels
                   Next: BatchNorm2d(128)

  Prune filters [5, 23, 67, 100] from first conv:

  After pruning:   Conv2d(64, 124, 3x3)   →  124 output channels
                   Next: Conv2d(124, 256, 3x3) expects 124 input channels  ← MUST UPDATE
                   Next: BatchNorm2d(124)   ← MUST UPDATE

  What gets removed:
  - Weight rows 5, 23, 67, 100 from layer L:     shape [128,64,3,3] → [124,64,3,3]
  - Weight columns 5, 23, 67, 100 from layer L+1: shape [256,128,3,3] → [256,124,3,3]
  - Bias entries 5, 23, 67, 100 from layer L
  - BN parameters (weight, bias, running_mean, running_var) entries 5, 23, 67, 100`
        },

        // ── Section 3: Iterative Magnitude Pruning ──
        {
          type: "heading",
          text: "Iterative Magnitude Pruning (IMP)"
        },
        {
          type: "text",
          text: "One-shot pruning (prune everything at once) is aggressive and often degrades accuracy significantly at high sparsity levels. Iterative magnitude pruning (IMP) achieves much better accuracy by interleaving pruning and fine-tuning:\n\n1. Train the model to convergence\n2. Prune p% of the smallest-magnitude weights (e.g., p=20%)\n3. Fine-tune the pruned model for a few epochs\n4. Repeat steps 2-3 until target sparsity is reached\n\nEach round of fine-tuning allows the remaining weights to compensate for the pruned ones. IMP typically achieves 90%+ sparsity with <1% accuracy loss, while one-shot pruning at the same sparsity might lose 5-10%."
        },

        // ── Section 4: Movement Pruning ──
        {
          type: "heading",
          text: "Movement Pruning"
        },
        {
          type: "text",
          text: "Magnitude pruning assumes small weights are unimportant. This is often true but not always — a small weight with a large gradient is actively being learned and should not be pruned. Movement pruning (Sanh et al., 2020) uses a different criterion: prune weights whose magnitude is decreasing during training. Formally, the importance score is |w * grad_w| — the product of the weight value and its gradient. Weights moving toward zero (w > 0, grad < 0 or w < 0, grad > 0) are pruned; weights moving away from zero are kept. Movement pruning consistently outperforms magnitude pruning for fine-tuning pretrained transformers (BERT, GPT) and is the recommended approach for NLP model compression."
        },

        // ── Section 5: Lottery Ticket Hypothesis ──
        {
          type: "heading",
          text: "The Lottery Ticket Hypothesis"
        },
        {
          type: "text",
          text: "Frankle & Carlin (2019) made a striking discovery: within a randomly initialized dense network, there exist sparse subnetworks (winning tickets) that, when trained in isolation from the same initialization, can match the accuracy of the full dense network trained from scratch. The procedure to find these winning tickets is:\n\n1. Initialize network with weights w_0\n2. Train to convergence, reaching weights w_T\n3. Prune the smallest-magnitude weights in w_T to create a binary mask m\n4. Reset the surviving weights to their original initialization: w_0 * m\n5. Retrain the sparse network w_0 * m from scratch\n\nThe retrained sparse network matches the original dense network's accuracy, despite having 80-95% fewer parameters. This suggests that the lottery of initialization matters — the specific initial values of the winning ticket weights are critical."
        },
        {
          type: "text",
          text: "Practical implications: the lottery ticket hypothesis explains why pruning works so well — trained networks contain massive redundancy and the essential computation is performed by a small subnetwork. However, finding the winning ticket requires training the full network first (to identify which weights to keep), so the lottery ticket hypothesis has not yet yielded practical training cost savings. Its main impact is theoretical: it changed our understanding of what makes neural network training work."
        },

        // ── Section 6: NVIDIA 2:4 Structured Sparsity ──
        {
          type: "heading",
          text: "Hardware-Friendly Sparsity: NVIDIA 2:4"
        },
        {
          type: "text",
          text: "NVIDIA's Ampere and Hopper GPUs include dedicated hardware for 2:4 structured sparsity: in every group of 4 consecutive values, exactly 2 must be zero. This gives exactly 50% sparsity with a very regular pattern that the hardware can exploit for 2x speedup. The sparse tensor core stores only the 2 non-zero values plus a 2-bit index indicating their positions within the group of 4."
        },
        {
          type: "text",
          text: "The 2:4 pattern is restrictive but practically useful. To prune a weight tensor to 2:4 sparsity: reshape to groups of 4, keep the 2 largest-magnitude values in each group, zero the other 2. Combined with INT8 quantization, 2:4 sparsity achieves a theoretical 4x speedup over dense FP32 (2x from sparsity * 2x from INT8). In practice, the speedup is ~3x due to memory overhead and kernel launch costs."
        },

        // ── Section 7: Structured Pruning Code ──
        {
          type: "heading",
          text: "Implementation: Structured Filter Pruning"
        },
        {
          type: "code",
          language: "python",
          code: `import torch
import torch.nn as nn
import numpy as np

def compute_filter_importance(conv_layer):
    """
    Compute importance score for each output filter using L1 norm.
    Higher = more important.
    """
    # weight shape: [C_out, C_in, K_h, K_w]
    weight = conv_layer.weight.data
    # L1 norm of each filter (sum of absolute values)
    importance = weight.abs().reshape(weight.shape[0], -1).sum(dim=1)
    return importance

def prune_conv_filter(model, layer_name, next_layer_name, bn_name=None,
                      prune_ratio=0.25):
    """
    Remove the least important filters from a Conv2d layer
    and update all downstream dependent layers.

    Args:
        model: the full model
        layer_name: name of the conv layer to prune
        next_layer_name: name of the next conv/linear layer
        bn_name: name of the batch norm layer (if any) between them
        prune_ratio: fraction of filters to remove
    """
    # Get layers
    conv = dict(model.named_modules())[layer_name]
    next_layer = dict(model.named_modules())[next_layer_name]
    bn = dict(model.named_modules())[bn_name] if bn_name else None

    # Compute importance and select filters to keep
    importance = compute_filter_importance(conv)
    num_filters = conv.weight.shape[0]
    num_prune = int(num_filters * prune_ratio)
    num_keep = num_filters - num_prune

    # Get indices of filters to KEEP (sorted by importance, descending)
    keep_indices = torch.argsort(importance, descending=True)[:num_keep]
    keep_indices = keep_indices.sort().values  # maintain original order

    print(f"Pruning {layer_name}: {num_filters} -> {num_keep} filters "
          f"({num_prune} removed, {prune_ratio*100:.0f}%)")

    # --- Prune the conv layer (output channels) ---
    new_weight = conv.weight.data[keep_indices]
    new_bias = conv.bias.data[keep_indices] if conv.bias is not None else None

    new_conv = nn.Conv2d(
        conv.in_channels, num_keep, conv.kernel_size,
        stride=conv.stride, padding=conv.padding,
        groups=conv.groups, bias=(new_bias is not None)
    )
    new_conv.weight.data = new_weight
    if new_bias is not None:
        new_conv.bias.data = new_bias

    # Replace in model
    _set_module(model, layer_name, new_conv)

    # --- Prune batch norm (if present) ---
    if bn is not None:
        new_bn = nn.BatchNorm2d(num_keep)
        new_bn.weight.data = bn.weight.data[keep_indices]
        new_bn.bias.data = bn.bias.data[keep_indices]
        new_bn.running_mean = bn.running_mean[keep_indices]
        new_bn.running_var = bn.running_var[keep_indices]
        _set_module(model, bn_name, new_bn)

    # --- Prune next layer (input channels) ---
    if isinstance(next_layer, nn.Conv2d):
        new_next_weight = next_layer.weight.data[:, keep_indices]
        next_layer_new = nn.Conv2d(
            num_keep, next_layer.out_channels, next_layer.kernel_size,
            stride=next_layer.stride, padding=next_layer.padding,
            bias=(next_layer.bias is not None)
        )
        next_layer_new.weight.data = new_next_weight
        if next_layer.bias is not None:
            next_layer_new.bias.data = next_layer.bias.data.clone()
        _set_module(model, next_layer_name, next_layer_new)

    elif isinstance(next_layer, nn.Linear):
        # For Conv -> Flatten -> Linear transition
        # Must figure out spatial dimensions to compute correct indexing
        # (simplified: assumes direct channel mapping)
        pass

    return model

def _set_module(model, name, new_module):
    """Set a module in the model by its dotted name."""
    parts = name.split(".")
    parent = model
    for part in parts[:-1]:
        parent = getattr(parent, part)
    setattr(parent, parts[-1], new_module)


# === Demo: Prune a simple model ===
class SimpleNet(nn.Module):
    def __init__(self):
        super().__init__()
        self.conv1 = nn.Conv2d(3, 64, 3, padding=1)
        self.bn1 = nn.BatchNorm2d(64)
        self.conv2 = nn.Conv2d(64, 128, 3, padding=1)

    def forward(self, x):
        x = torch.relu(self.bn1(self.conv1(x)))
        x = self.conv2(x)
        return x

model = SimpleNet()
print("Before pruning:")
print(f"  conv1: {model.conv1.weight.shape}")
print(f"  conv2: {model.conv2.weight.shape}")

total_before = sum(p.numel() for p in model.parameters())

model = prune_conv_filter(
    model, "conv1", "conv2", bn_name="bn1", prune_ratio=0.5
)

print("\\nAfter pruning 50% of conv1 filters:")
print(f"  conv1: {model.conv1.weight.shape}")
print(f"  conv2: {model.conv2.weight.shape}")

total_after = sum(p.numel() for p in model.parameters())
print(f"\\nParameters: {total_before} -> {total_after} "
      f"({100*(1-total_after/total_before):.1f}% reduction)")`
        },
        {
          type: "callout",
          variant: "warning",
          title: "Pruning + Quantization: The Order Matters",
          text: "Always prune first, then quantize. Pruning changes the weight distribution (removes small values, making the remaining distribution more spread out), which affects optimal quantization ranges. If you quantize first and then prune, the quantization levels were calibrated for a distribution that no longer exists. The standard pipeline is: Train -> Prune -> Fine-tune -> Quantize (PTQ or QAT) -> Deploy."
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 6 — Operator Fusion, ONNX Optimization & Sub-Byte Quantization
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "operator-fusion-onnx-subbyte-quantization",
      title: "Operator Fusion, ONNX Optimization & INT4/Sub-Byte Quantization",
      readTime: "14 min",
      content: [
        {
          type: "text",
          text: "Quantization reduces the cost of each operation, but operator fusion reduces the number of operations themselves. A Conv2D followed by BatchNorm followed by ReLU is three separate kernel launches on a GPU/NPU, each requiring reading inputs from memory and writing outputs back. Fused into a single kernel, the intermediate results stay in registers or L1 cache, eliminating two full round-trips to memory. On bandwidth-constrained edge devices, fusion often provides a larger speedup than quantization alone."
        },

        // ── Section 1: Operator Fusion ──
        {
          type: "heading",
          text: "Operator Fusion: Conv + BN + ReLU"
        },
        {
          type: "text",
          text: "Batch normalization during inference is a simple affine transform: y = gamma * (x - mean) / sqrt(var + eps) + beta. Since this is a linear operation applied element-wise, it can be algebraically folded into the preceding convolution's weights and bias. After folding, the BN layer disappears entirely — zero additional compute, zero additional memory access."
        },
        {
          type: "text",
          text: "The folding math:\n\nOriginal: y = gamma * (Conv(x) - mean) / sqrt(var + eps) + beta\n\nLet s = gamma / sqrt(var + eps)\n\nFolded weight: W_fused = s * W_conv  (broadcast s over spatial dims)\nFolded bias:   b_fused = s * (b_conv - mean) + beta\n\nResult: y = Conv_fused(x) using W_fused and b_fused — identical output, one fewer layer."
        },
        {
          type: "text",
          text: "ReLU fusion goes further: after folding BN into Conv, the subsequent ReLU(max(0, x)) can be fused into the same kernel. The compute kernel performs the convolution and applies the ReLU clamp in the same loop iteration, before writing the output back to memory. On ARM NEON, this means the ReLU is a single VMAX instruction interleaved with the MAC pipeline — effectively free."
        },
        {
          type: "diagram",
          code: `Operator Fusion Progression

  Unfused (3 memory round-trips):
  ┌───────┐  write   ┌──────────┐  write   ┌──────┐  write
  │ Conv  │ ──────▶  │ BatchNorm │ ──────▶  │ ReLU │ ──────▶ output
  └───────┘  read    └──────────┘  read    └──────┘  read

  After BN folding (2 memory round-trips):
  ┌──────────────┐  write   ┌──────┐  write
  │ Conv (BN     │ ──────▶  │ ReLU │ ──────▶ output
  │  folded in)  │  read    └──────┘  read
  └──────────────┘

  After full fusion (1 memory round-trip):
  ┌──────────────────────┐  write
  │ Conv + BN + ReLU     │ ──────▶ output
  │ (single kernel)      │
  └──────────────────────┘

  Memory traffic reduced by ~3x → direct latency improvement`
        },

        // ── Section 2: Depthwise + Pointwise Fusion ──
        {
          type: "heading",
          text: "Depthwise-Pointwise Fusion"
        },
        {
          type: "text",
          text: "MobileNet-style architectures use depthwise separable convolutions: a depthwise 3x3 conv (per-channel) followed by a pointwise 1x1 conv. These are typically fused into a single kernel on mobile inference engines. The depthwise output stays in registers and is immediately consumed by the pointwise multiply-accumulate, avoiding a memory write+read for the intermediate feature map."
        },
        {
          type: "text",
          text: "This fusion pattern is especially important because depthwise convolutions have very low arithmetic intensity (only K*K operations per element, no cross-channel accumulation). Without fusion, depthwise conv is almost entirely memory-bound. Fused with the pointwise conv, the combined kernel has reasonable arithmetic intensity and can actually utilize the compute hardware."
        },

        // ── Section 3: ONNX Graph Optimizations ──
        {
          type: "heading",
          text: "ONNX Graph Optimizations"
        },
        {
          type: "text",
          text: "ONNX (Open Neural Network Exchange) provides a standardized graph format that enables framework-independent optimizations. ONNX Runtime applies optimization passes in increasing levels of aggressiveness:"
        },
        {
          type: "list",
          items: [
            "Level 0 (Basic): Constant folding — pre-compute operations on constant inputs. Dead node elimination — remove nodes whose outputs are unused. Redundant node elimination — merge duplicate subgraphs.",
            "Level 1 (Extended): Conv+BN fusion, Conv+BN+ReLU fusion, Gemm+Relu fusion. Shape inference propagation. Reshape/Transpose optimization (eliminate redundant layout changes).",
            "Level 2 (All): Attention fusion (Q/K/V matmuls + softmax + output matmul fused into a single FlashAttention-like kernel). GELU approximation fusion. Layer normalization fusion. SkipLayerNorm fusion for transformers.",
            "Hardware-specific: TensorRT backend applies INT8 quantization + layer fusion jointly. CoreML backend optimizes for Apple Neural Engine constraints. XNNPACK backend optimizes for ARM CPU SIMD."
          ]
        },
        {
          type: "code",
          language: "python",
          code: `import onnx
from onnxruntime.transformers import optimizer as ort_optimizer
import onnxruntime as ort

# === Step 1: Export PyTorch model to ONNX ===
# (Assuming you have a PyTorch model and dummy input)
# torch.onnx.export(model, dummy_input, "model.onnx", opset_version=17)

# === Step 2: Apply ONNX graph optimizations ===
def optimize_onnx_model(input_path, output_path, opt_level=99):
    """
    Apply ONNX Runtime graph optimizations.

    opt_level:
        0 = disable all optimizations
        1 = basic (constant folding, dead code elimination)
        2 = extended (operator fusion)
        99 = all optimizations
    """
    # Method 1: Using ONNX Runtime session options
    sess_options = ort.SessionOptions()

    # Set optimization level
    if opt_level == 0:
        sess_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_DISABLE_ALL
    elif opt_level == 1:
        sess_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_BASIC
    elif opt_level == 2:
        sess_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_EXTENDED
    else:
        sess_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL

    # Save optimized model
    sess_options.optimized_model_filepath = output_path

    # Creating the session triggers optimization and saves the model
    _ = ort.InferenceSession(input_path, sess_options,
                             providers=["CPUExecutionProvider"])

    print(f"Optimized model saved to {output_path}")

    # Compare model sizes
    original = onnx.load(input_path)
    optimized = onnx.load(output_path)
    print(f"Original nodes:  {len(original.graph.node)}")
    print(f"Optimized nodes: {len(optimized.graph.node)}")

    return output_path


def inspect_onnx_graph(model_path):
    """Print all node types and their counts in an ONNX model."""
    model = onnx.load(model_path)
    from collections import Counter
    node_types = Counter(node.op_type for node in model.graph.node)

    print(f"\\nONNX Model: {model_path}")
    print(f"Total nodes: {len(model.graph.node)}")
    print("Node types:")
    for op_type, count in node_types.most_common():
        print(f"  {op_type:30s} {count}")

    # Check for fusible patterns
    nodes = list(model.graph.node)
    fusible = 0
    for i in range(len(nodes) - 1):
        if nodes[i].op_type == "Conv" and nodes[i+1].op_type == "Relu":
            fusible += 1
        if nodes[i].op_type == "Conv" and nodes[i+1].op_type == "BatchNormalization":
            fusible += 1
    if fusible:
        print(f"\\n  Found {fusible} fusible Conv+BN/ReLU patterns")

    return node_types


# === Step 3: ONNX quantization (static PTQ) ===
def quantize_onnx_static(model_path, output_path, calibration_data_reader):
    """
    Apply static INT8 quantization to an ONNX model.
    """
    from onnxruntime.quantization import (
        quantize_static,
        CalibrationDataReader,
        QuantType,
        QuantFormat,
    )

    quantize_static(
        model_input=model_path,
        model_output=output_path,
        calibration_data_reader=calibration_data_reader,
        quant_format=QuantFormat.QDQ,  # QuantizeLinear/DequantizeLinear nodes
        per_channel=True,              # per-channel weight quantization
        weight_type=QuantType.QInt8,
        activation_type=QuantType.QUInt8,
        # Calibration method: MinMax, Entropy (KL), or Percentile
        calibrate_method=3,  # 3 = Percentile (recommended starting point)
    )

    # Compare sizes
    import os
    orig_size = os.path.getsize(model_path) / 1024 / 1024
    quant_size = os.path.getsize(output_path) / 1024 / 1024
    print(f"\\nOriginal size:  {orig_size:.1f} MB")
    print(f"Quantized size: {quant_size:.1f} MB")
    print(f"Compression:    {orig_size/quant_size:.1f}x")


# Usage:
# optimize_onnx_model("model.onnx", "model_optimized.onnx", opt_level=99)
# inspect_onnx_graph("model_optimized.onnx")
# quantize_onnx_static("model_optimized.onnx", "model_int8.onnx", data_reader)`
        },

        // ── Section 4: INT4 and Sub-Byte Quantization ──
        {
          type: "heading",
          text: "INT4 & Sub-Byte Quantization: GPTQ and AWQ"
        },
        {
          type: "text",
          text: "Large language models (LLMs) have driven the need for sub-INT8 quantization. A 70B parameter model at FP16 requires 140 GB of memory — far beyond a single GPU. At INT4, it fits in 35 GB on a single A100. The challenge: with only 16 distinct values, INT4 quantization introduces severe information loss if done naively."
        },
        {
          type: "text",
          text: "GPTQ (Frantar et al., 2023) applies layer-wise quantization using an approximate second-order method. For each layer, it quantizes weights one column at a time, and after quantizing each column, it adjusts all remaining unquantized columns to compensate for the quantization error using the inverse Hessian. This is based on the Optimal Brain Surgeon framework. GPTQ can quantize a 175B model to INT4 in about 4 GPU-hours with minimal accuracy loss."
        },
        {
          type: "text",
          text: "AWQ (Activation-Aware Weight Quantization, Lin et al., 2023) observes that a small fraction (~1%) of weight channels are disproportionately important because they correspond to large activation magnitudes. AWQ keeps these salient channels at higher precision (or applies per-channel scaling to reduce their quantization error) while aggressively quantizing the remaining 99% of channels. AWQ is simpler than GPTQ and often achieves comparable quality."
        },
        {
          type: "comparison",
          headers: ["Method", "Approach", "Speed", "Quality", "Best For"],
          rows: [
            ["Round-to-Nearest (RTN)", "Naive round each weight to nearest INT4", "Instant", "Poor for INT4", "Baseline, quick experiments"],
            ["GPTQ", "Column-wise quant with Hessian-based error compensation", "Hours (one-time)", "Excellent", "LLMs, weight-only INT4"],
            ["AWQ", "Scale salient channels by activation magnitude", "Minutes (one-time)", "Excellent", "LLMs, simpler than GPTQ"],
            ["QAT for INT4", "Train with fake-quant at INT4", "Days (retraining)", "Best", "When PTQ INT4 fails"]
          ]
        },

        // ── Section 5: Hardware-Aware Quantization ──
        {
          type: "heading",
          text: "Hardware-Aware Quantization"
        },
        {
          type: "text",
          text: "Different edge hardware supports different quantization schemes and data layouts. Choosing the wrong scheme means the runtime silently falls back to FP32, negating all your optimization work."
        },
        {
          type: "comparison",
          headers: ["Hardware", "Supported Types", "Memory Layout", "Key Constraint"],
          rows: [
            ["ARM Cortex-A (NEON)", "INT8 symmetric, FP16", "NHWC preferred", "NEON SIMD is 128-bit: processes 16 INT8 or 8 FP16 values per cycle"],
            ["Apple ANE", "INT8 only (some FP16)", "NHWC8 (padded to 8 channels)", "Strict 8-channel alignment; odd channel counts waste silicon"],
            ["Qualcomm Hexagon DSP", "INT8, INT16, FP16", "NHWC", "HVX vector unit: 1024-bit SIMD, processes 128 INT8 values/cycle"],
            ["NVIDIA INT8 Tensor Cores", "INT8, INT4, FP16, BF16", "NCHW or NHWC", "2:4 sparsity support on Ampere+; INT8 needs calibration via TensorRT"],
            ["Google Edge TPU", "INT8 only (uint8)", "Internal tiled layout", "ALL operations must be INT8; any unsupported op falls back to CPU"],
            ["Intel VNNI (AVX-512)", "INT8 (VNNI), BF16 (AMX)", "NCHW", "VNNI fuses multiply+add: 4 INT8 MACs per cycle per lane"]
          ]
        },

        // ── Section 6: NHWC vs NCHW ──
        {
          type: "heading",
          text: "NHWC vs NCHW: Why Layout Matters for Edge"
        },
        {
          type: "text",
          text: "PyTorch defaults to NCHW (channel-first), but most edge hardware prefers NHWC (channel-last). The reason is SIMD vectorization: NEON, HVX, and SSE/AVX process contiguous memory lanes in parallel. In NHWC, adjacent memory locations are different channels of the same spatial position — exactly what a 1x1 pointwise convolution needs. In NCHW, adjacent memory locations are adjacent spatial positions of the same channel, which is useful for depthwise conv but inefficient for pointwise."
        },
        {
          type: "text",
          text: "TensorFlow has always defaulted to NHWC and optimizes for it. PyTorch added channels_last memory format (torch.channels_last) which stores tensors in NHWC layout while presenting an NCHW logical view. When exporting to edge runtimes (TFLite, Core ML, ONNX with XNNPACK), ensure your model uses NHWC. Unnecessary NCHW-to-NHWC transposes between layers can cost 10-20% of total inference time."
        },

        // ── Section 7: Debugging Tools ──
        {
          type: "heading",
          text: "Quantization Debugging Tools"
        },
        {
          type: "list",
          items: [
            "Netron (netron.app): Visualize ONNX/TFLite/CoreML graphs. Inspect quantization parameters (scale, zero_point) per node. Verify fusion patterns. Check for unexpected FP32 fallback nodes.",
            "ONNX Runtime quantization debugger: onnxruntime.quantization.qdq_quantizer has a debug mode that dumps per-node quantization error statistics.",
            "TensorRT trtexec --dumpLayerInfo: Shows per-layer precision selection, whether layers were fused, and memory allocation.",
            "Per-layer accuracy profiling: Run inference with progressive quantization (quantize layers 1..N one at a time) to identify the layer causing accuracy degradation.",
            "Weight/activation histogram visualization: Plot histograms of weights and activations per layer. Look for outliers (long tails), bimodal distributions, or zero-centered distributions that might benefit from symmetric vs affine quantization.",
            "torch.ao.quantization.observer: PyTorch's built-in observers (MinMaxObserver, HistogramObserver, MovingAverageMinMaxObserver) record activation statistics during calibration and expose the computed scale/zero_point."
          ]
        },
        {
          type: "callout",
          variant: "info",
          title: "The Complete Edge Optimization Pipeline",
          text: "The production pipeline for edge model optimization: (1) Train in FP32/BF16, (2) Structured pruning + fine-tune, (3) Export to ONNX, (4) ONNX graph optimization (BN folding, operator fusion), (5) Static PTQ with KL-divergence calibration, (6) If accuracy insufficient: mixed-precision (sensitive layers in FP16) or QAT, (7) Hardware-specific compilation (TensorRT/TFLite/Core ML), (8) Benchmark on target device. Each step compounds: 2x from pruning * 4x from INT8 * 1.5x from fusion = ~12x total speedup is achievable for typical vision models."
        }
      ]
    }

  ];
})();
