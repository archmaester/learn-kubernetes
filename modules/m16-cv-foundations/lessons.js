// Patches the CV Foundations module (m16) with full tutorial lesson content.
// Loaded after curriculum.js. m16 = CURRICULUM.phases[5].modules[0]
(function patchCVFoundationsLessons() {
  const m = CURRICULUM.phases[5].modules[0]; // phase-6 (index 5), first module (m16)

  m.lessons = [

    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 1 — Image Fundamentals & The Convolution Operation
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "image-fundamentals-convolution",
      title: "Image Fundamentals & The Convolution Operation",
      readTime: "15 min",
      content: [
        {
          type: "text",
          text: "Before you ever call nn.Conv2d, you need to understand what it actually computes, how images are stored in memory, and why the memory layout of a tensor can make a 2-3x difference in throughput on the same hardware. This lesson tears apart the fundamentals: pixel representations, color spaces, tensor memory layout, the mathematics of convolution, and — critically — the four algorithms frameworks actually use to compute convolutions. None of this is academic trivia. When you quantize a model for edge deployment, fuse batch normalization into conv weights, or debug why your INT8 model produces garbage on certain input ranges, these fundamentals are what you fall back on."
        },
        {
          type: "callout",
          variant: "info",
          title: "Why This Matters for Edge AI",
          text: "On edge devices (Jetson, Coral, phones), you are memory-bandwidth bound, not compute bound. Understanding NCHW vs NHWC, how im2col expands memory, and how Winograd trades multiplications for additions directly determines whether your model runs at 10 FPS or 30 FPS. Framework defaults are not always optimal — TensorFlow defaults to NHWC, PyTorch to NCHW, and TensorRT will re-layout tensors between layers if you get this wrong."
        },

        // ── Section 1: Pixels & Color Spaces ──
        {
          type: "heading",
          text: "Pixels, Color Spaces & Channel Semantics",
          level: 2
        },
        {
          type: "text",
          text: "A digital image is a 2D grid of pixels. Each pixel stores intensity values in one or more channels. A grayscale image has 1 channel (luminance). An RGB image has 3 channels. A medical CT scan might have 1 channel (Hounsfield units). A satellite image might have 13+ spectral bands. The number of channels is the depth dimension of your input tensor, and it directly determines the shape of your first convolution kernel."
        },
        {
          type: "comparison",
          headers: ["Color Space", "Channels", "Value Range", "Use Case", "Edge Relevance"],
          rows: [
            ["RGB", "Red, Green, Blue", "0-255 (uint8) or 0.0-1.0 (float)", "Default for most DL models", "Standard input; quantize to uint8 trivially"],
            ["BGR", "Blue, Green, Red", "Same as RGB, channel order swapped", "OpenCV default (historical C++ reason)", "Swapping channels is free but forgetting costs accuracy"],
            ["HSV", "Hue, Saturation, Value", "H: 0-179, S: 0-255, V: 0-255 (OpenCV)", "Color-based segmentation, augmentation", "Hue is circular — quantization must wrap around"],
            ["YUV / YCbCr", "Luminance, Chroma-blue, Chroma-red", "Y: 16-235, UV: 16-240 (BT.601)", "Camera sensors, video codecs, JPEG", "Many cameras output YUV natively — avoid RGB conversion on edge"],
            ["Grayscale", "Luminance", "0-255 or 0.0-1.0", "OCR, X-ray, depth maps", "1 channel = 3x less bandwidth than RGB"]
          ]
        },
        {
          type: "callout",
          variant: "warning",
          title: "The BGR Trap",
          text: "OpenCV reads images in BGR order. PyTorch and most pretrained models expect RGB. If you forget to convert (cv2.cvtColor or simply [..., ::-1]), your model accuracy drops silently — sometimes by only 2-3% on ImageNet, making the bug hard to catch. Always verify channel order at the boundary between your data pipeline and your model."
        },

        // ── Section 2: Memory Layout ──
        {
          type: "heading",
          text: "Tensor Memory Layout: NCHW vs NHWC",
          level: 2
        },
        {
          type: "text",
          text: "A batch of color images is a 4D tensor: (batch, channels, height, width) — NCHW — or (batch, height, width, channels) — NHWC. The letters describe which dimension varies fastest in contiguous memory. This is not just notation. It determines cache hit rates, SIMD vectorization efficiency, and GPU memory coalescing. Getting it wrong can halve your throughput."
        },
        {
          type: "diagram",
          code: `NCHW Layout (PyTorch default) — "channel-first"
  Memory order: [N][C][H][W]
  For a 1x3x2x2 tensor (1 image, 3 channels, 2x2):

  Memory: [R00 R01 R10 R11 | G00 G01 G10 G11 | B00 B01 B10 B11]
           ← channel R ───→  ← channel G ───→  ← channel B ───→

  - All spatial values for one channel are contiguous
  - Good for per-channel operations (batch norm, channel-wise conv)
  - cuDNN historically optimized for NCHW

NHWC Layout (TensorFlow default) — "channel-last"
  Memory order: [N][H][W][C]
  For the same 1x3x2x2 tensor:

  Memory: [R00 G00 B00 | R01 G01 B01 | R10 G10 B10 | R11 G11 B11]
           ← pixel(0,0)→  ← pixel(0,1)→  ← pixel(1,0)→  ← pixel(1,1)→

  - All channels for one pixel are contiguous
  - Good for pointwise ops, depthwise conv, and Tensor Cores (NVIDIA)
  - NVIDIA Tensor Cores require NHWC for peak INT8/FP16 throughput`
        },
        {
          type: "text",
          text: "Why does layout matter so much? Consider a 3x3 convolution. In NCHW, a single output pixel requires reading 3x3 values from each input channel. Those 9 values are contiguous for one channel (good cache behavior), but the kernel must jump across channels (stride = H*W elements). In NHWC, the 3 channel values for one spatial position are contiguous, so a 1x1 convolution is a simple dot product on adjacent memory. For 3x3, you need to gather from 9 spatial locations, each giving 3 contiguous channel values."
        },
        {
          type: "comparison",
          headers: ["Property", "NCHW", "NHWC"],
          rows: [
            ["PyTorch default", "Yes", "Supported via channels_last memory format"],
            ["TensorFlow default", "Via data_format param", "Yes"],
            ["NVIDIA Tensor Cores (A100/H100)", "Requires internal transpose", "Native — peak throughput"],
            ["ARM NEON (mobile/edge)", "Suboptimal", "Preferred — matches SIMD width"],
            ["Intel AVX-512", "Preferred for some ops", "Preferred for most fused ops"],
            ["cuDNN autotuner", "Will benchmark both", "Usually selected for modern GPUs"],
            ["TensorRT INT8", "Converts internally", "Native for most layers"],
            ["Memory for batch norm", "Channel dim contiguous — fast", "Channel dim scattered — needs gather"]
          ]
        },
        {
          type: "callout",
          variant: "tip",
          title: "PyTorch channels_last",
          text: "Since PyTorch 1.5 you can use x = x.to(memory_format=torch.channels_last) and model = model.to(memory_format=torch.channels_last). This keeps the logical shape as NCHW but stores data in NHWC order. On A100 with AMP, this alone can give 10-30% speedup for ResNet-family models. Always benchmark with your specific model."
        },

        // ── Section 3: Convolution Math ──
        {
          type: "heading",
          text: "The Mathematics: Convolution vs Cross-Correlation",
          level: 2
        },
        {
          type: "text",
          text: "Mathematically, 2D discrete convolution flips the kernel before sliding it over the input. Cross-correlation does not flip. Every deep learning framework implements cross-correlation but calls it 'convolution'. Since kernel weights are learned, flipping is irrelevant — the network just learns flipped weights. But if you are implementing from scratch or debugging numerical output against a textbook, this distinction matters."
        },
        {
          type: "code",
          lang: "python",
          filename: "conv_math.py",
          desc: "Mathematical definitions — convolution flips the kernel, cross-correlation does not",
          code: `# True 2D convolution (with kernel flip):
# (I * K)[i, j] = sum_m sum_n I[i - m, j - n] * K[m, n]
#
# Cross-correlation (what frameworks compute):
# (I . K)[i, j] = sum_m sum_n I[i + m, j + n] * K[m, n]
#
# For a 3x3 kernel K applied to input I at position (i, j):
#
# Cross-correlation output:
#   O[i,j] = I[i,j]*K[0,0] + I[i,j+1]*K[0,1] + I[i,j+2]*K[0,2]
#          + I[i+1,j]*K[1,0] + I[i+1,j+1]*K[1,1] + I[i+1,j+2]*K[1,2]
#          + I[i+2,j]*K[2,0] + I[i+2,j+1]*K[2,1] + I[i+2,j+2]*K[2,2]
#
# True convolution flips K by 180 degrees first:
#   K_flipped[m, n] = K[kH-1-m, kW-1-n]
#
# Since K is learned, the network absorbs the flip into the weights.
# Conclusion: "convolution" in DL = cross-correlation. Always.`
        },

        // ── Section 4: Stride, Padding, Dilation ──
        {
          type: "heading",
          text: "Kernel Properties: Stride, Padding, Dilation",
          level: 2
        },
        {
          type: "text",
          text: "Three parameters control how the kernel slides over the input and what output size you get. The output spatial dimension formula is: O = floor((I + 2P - D*(K-1) - 1) / S) + 1, where I = input size, P = padding, K = kernel size, S = stride, D = dilation. Memorize this formula — you will use it constantly when designing architectures and debugging shape mismatches."
        },
        {
          type: "comparison",
          headers: ["Parameter", "What It Does", "Common Values", "Effect on Output Size"],
          rows: [
            ["Stride (S)", "Step size between kernel applications", "1 (preserve size), 2 (downsample 2x)", "Output = Input / S (approximately)"],
            ["Padding (P)", "Zero-pad input borders", "0 (valid), K//2 (same), custom", "same padding: Output = Input (when S=1)"],
            ["Dilation (D)", "Gaps between kernel elements", "1 (standard), 2,4,8,16 (atrous)", "Effective kernel size = D*(K-1)+1"]
          ]
        },
        {
          type: "text",
          text: "Dilated (atrous) convolution is critical for semantic segmentation. A 3x3 kernel with dilation=2 has an effective receptive field of 5x5 but only 9 parameters and 9 multiplications. Stacking dilations of 1, 2, 4, 8 gives exponentially growing receptive fields without downsampling — this is the core idea behind DeepLab and WaveNet. On edge devices, dilated convolutions are tricky because the non-contiguous memory access pattern defeats caches; some edge compilers (TensorRT, NNAPI) convert them to equivalent padded standard convolutions internally."
        },

        // ── Section 5: How Frameworks Compute Convolution ──
        {
          type: "heading",
          text: "How Frameworks Actually Compute Convolution",
          level: 2
        },
        {
          type: "text",
          text: "There are four main algorithms for computing convolution. No framework uses a naive nested loop. The choice of algorithm depends on kernel size, input size, stride, dilation, and available hardware. cuDNN's autotuner benchmarks all applicable algorithms at runtime and caches the fastest one."
        },
        {
          type: "comparison",
          headers: ["Algorithm", "How It Works", "Best For", "Memory Overhead", "Edge Relevance"],
          rows: [
            ["Direct", "Nested loops, heavily optimized with SIMD/tiling", "Small kernels (1x1, 3x3) on CPU", "None", "ARM NEON optimized direct conv is fast on mobile"],
            ["im2col + GEMM", "Unfold input patches into columns, multiply with kernel matrix", "General purpose, most common on GPU", "O(C_in * K * K * H_out * W_out) — can be 10-100x input", "Memory-limited on edge; avoid for large inputs"],
            ["FFT-based", "Convert input & kernel to frequency domain, pointwise multiply, IFFT", "Large kernels (7x7+), large inputs", "O(H * W) per channel for FFT buffers", "Rarely used on edge — FFT memory and compute overhead"],
            ["Winograd (F(m,r))", "Algebraic transform that reduces multiplications at cost of additions", "3x3 and 5x5 kernels (F(2,3), F(4,3))", "Small constant overhead for transforms", "cuDNN default for 3x3; some edge NPUs support it"]
          ]
        },

        // ── Section 6: im2col Deep Dive ──
        {
          type: "heading",
          text: "im2col + GEMM: The Workhorse Algorithm",
          level: 2
        },
        {
          type: "text",
          text: "im2col (image to column) is the single most important algorithm to understand. It transforms convolution into matrix multiplication, which is the most optimized operation on every hardware platform (CPU BLAS, GPU cublas, edge NPU). The idea: extract every input patch that the kernel will be applied to, reshape each patch into a column vector, stack them into a matrix. Then multiply the kernel matrix by this column matrix to get all output values at once."
        },
        {
          type: "diagram",
          code: `im2col transformation for a 4x4 input, 3x3 kernel, stride=1, no padding:

Input (1 channel, 4x4):          Kernel (3x3):
┌────┬────┬────┬────┐            ┌────┬────┬────┐
│ a  │ b  │ c  │ d  │            │ k0 │ k1 │ k2 │
├────┼────┼────┼────┤            ├────┼────┼────┤
│ e  │ f  │ g  │ h  │            │ k3 │ k4 │ k5 │
├────┼────┼────┼────┤            ├────┼────┼────┤
│ i  │ j  │ k  │ l  │            │ k6 │ k7 │ k8 │
├────┼────┼────┼────┤            └────┴────┴────┘
│ m  │ n  │ o  │ p  │
└────┴────┴────┴────┘

Output size: (4-3+1) x (4-3+1) = 2x2 = 4 output positions

im2col matrix (9 rows x 4 cols):     Kernel vector (1 x 9):
Each column = one flattened patch     [k0 k1 k2 k3 k4 k5 k6 k7 k8]

     pos(0,0) pos(0,1) pos(1,0) pos(1,1)
     ┌──────────────────────────────────┐
k0:  │  a        b        e        f   │
k1:  │  b        c        f        g   │
k2:  │  c        d        g        h   │
k3:  │  e        f        i        j   │
k4:  │  f        g        j        k   │
k5:  │  g        h        k        l   │
k6:  │  i        j        m        n   │
k7:  │  j        k        n        o   │
k8:  │  k        l        o        p   │
     └──────────────────────────────────┘

Result = Kernel_row @ im2col_matrix = [o0, o1, o2, o3] → reshape to 2x2

For C_out filters: stack all filter rows → (C_out x 9) @ (9 x 4) = (C_out x 4)
For C_in channels: im2col has C_in*K*K rows, kernel is C_out x (C_in*K*K)`
        },

        // ── Section 7: Code — Pure NumPy conv2d ──
        {
          type: "heading",
          text: "Implementation: Pure NumPy Conv2D",
          level: 2
        },
        {
          type: "code",
          lang: "python",
          filename: "naive_conv2d.py",
          desc: "Naive nested-loop convolution — correct but slow. Use as a reference implementation for testing.",
          code: `import numpy as np
import time

def conv2d_naive(x, w, b, stride=1, padding=0):
    """
    Naive 2D convolution (cross-correlation).
    x: (N, C_in, H, W)
    w: (C_out, C_in, kH, kW)
    b: (C_out,) or None
    Returns: (N, C_out, H_out, W_out)
    """
    N, C_in, H, W = x.shape
    C_out, _, kH, kW = w.shape

    # Apply padding
    if padding > 0:
        x = np.pad(x, ((0,0), (0,0), (padding,padding), (padding,padding)),
                   mode='constant', constant_values=0)
        _, _, H, W = x.shape

    H_out = (H - kH) // stride + 1
    W_out = (W - kW) // stride + 1
    out = np.zeros((N, C_out, H_out, W_out), dtype=x.dtype)

    for n in range(N):                    # batch
        for co in range(C_out):           # output channel (filter)
            for i in range(H_out):        # output row
                for j in range(W_out):    # output col
                    h_start = i * stride
                    w_start = j * stride
                    patch = x[n, :, h_start:h_start+kH, w_start:w_start+kW]
                    out[n, co, i, j] = np.sum(patch * w[co])
            if b is not None:
                out[n, co] += b[co]
    return out

# --- Quick test ---
np.random.seed(42)
x = np.random.randn(1, 3, 8, 8).astype(np.float32)
w = np.random.randn(16, 3, 3, 3).astype(np.float32)
b = np.random.randn(16).astype(np.float32)

t0 = time.perf_counter()
out_naive = conv2d_naive(x, w, b, stride=1, padding=1)
t_naive = time.perf_counter() - t0
print(f"Naive conv2d output shape: {out_naive.shape}")  # (1, 16, 8, 8)
print(f"Naive time: {t_naive*1000:.2f} ms")`
        },

        // ── Section 8: Code — im2col conv2d ──
        {
          type: "heading",
          text: "Implementation: im2col + GEMM Conv2D",
          level: 2
        },
        {
          type: "code",
          lang: "python",
          filename: "im2col_conv2d.py",
          desc: "im2col-based convolution — the algorithm most frameworks actually use. Orders of magnitude faster than naive.",
          code: `import numpy as np
import time

def im2col(x, kH, kW, stride=1, padding=0):
    """
    Transform input tensor into column matrix for GEMM-based convolution.
    x: (N, C_in, H, W)
    Returns: (N, C_in*kH*kW, H_out*W_out)
    """
    N, C, H, W = x.shape
    if padding > 0:
        x = np.pad(x, ((0,0), (0,0), (padding,padding), (padding,padding)),
                   mode='constant', constant_values=0)
        _, _, H, W = x.shape

    H_out = (H - kH) // stride + 1
    W_out = (W - kW) // stride + 1

    # Use stride tricks for efficient extraction (no data copy)
    # Shape of output: (N, C, kH, kW, H_out, W_out)
    shape = (N, C, kH, kW, H_out, W_out)
    strides_orig = x.strides  # (N_stride, C_stride, H_stride, W_stride)
    strides = (
        strides_orig[0],                      # N
        strides_orig[1],                      # C
        strides_orig[2] * stride,             # kH (but step by stride in input H)
        strides_orig[3] * stride,             # kW (but step by stride in input W)
        strides_orig[2],                      # H_out (move by 1 row per kernel row)
        strides_orig[3],                      # W_out (move by 1 col per kernel col)
    )
    # Wait — the stride trick indexing is subtle. Let me use the standard approach:
    # Actually the correct strides for im2col using as_strided:
    strides = (
        strides_orig[0],     # batch
        strides_orig[1],     # channel
        strides_orig[2],     # kernel row offset
        strides_orig[3],     # kernel col offset
        strides_orig[2] * stride,  # output row (move by stride in H)
        strides_orig[3] * stride,  # output col (move by stride in W)
    )

    cols = np.lib.stride_tricks.as_strided(x, shape=shape, strides=strides)
    # Reshape to (N, C*kH*kW, H_out*W_out)
    cols = cols.reshape(N, C * kH * kW, H_out * W_out)
    return cols, H_out, W_out


def conv2d_im2col(x, w, b, stride=1, padding=0):
    """
    Conv2D using im2col + GEMM.
    x: (N, C_in, H, W)
    w: (C_out, C_in, kH, kW)
    b: (C_out,) or None
    Returns: (N, C_out, H_out, W_out)
    """
    N, C_in, H, W = x.shape
    C_out, _, kH, kW = w.shape

    # Step 1: im2col — unfold input patches into columns
    cols, H_out, W_out = im2col(x, kH, kW, stride, padding)
    # cols shape: (N, C_in*kH*kW, H_out*W_out)

    # Step 2: Reshape kernel to 2D matrix
    w_matrix = w.reshape(C_out, -1)  # (C_out, C_in*kH*kW)

    # Step 3: GEMM — matrix multiply for each sample in batch
    # out shape: (N, C_out, H_out*W_out)
    out = np.einsum('ij,njk->nik', w_matrix, cols)
    # Equivalent to: out = w_matrix @ cols  (broadcast over N)
    # But let's be explicit with batched matmul:
    out = w_matrix @ cols  # broadcasting: (C_out, C_in*kH*kW) @ (N, C_in*kH*kW, L) — need loop
    # Actually for batched: use einsum or loop
    out = np.stack([w_matrix @ cols[n] for n in range(N)])

    # Step 4: Add bias
    if b is not None:
        out += b.reshape(1, -1, 1)  # (1, C_out, 1)

    # Step 5: Reshape to spatial
    return out.reshape(N, C_out, H_out, W_out)


# --- Benchmark: naive vs im2col ---
np.random.seed(42)
x = np.random.randn(2, 3, 32, 32).astype(np.float32)
w = np.random.randn(64, 3, 3, 3).astype(np.float32)
b = np.random.randn(64).astype(np.float32)

# im2col approach
t0 = time.perf_counter()
out_im2col = conv2d_im2col(x, w, b, stride=1, padding=1)
t_im2col = time.perf_counter() - t0

print(f"im2col output shape: {out_im2col.shape}")  # (2, 64, 32, 32)
print(f"im2col time: {t_im2col*1000:.2f} ms")

# Verify against naive (on smaller input for speed)
x_small = x[:1, :, :8, :8]
out_naive = conv2d_naive(x_small, w, b, stride=1, padding=1)
out_fast  = conv2d_im2col(x_small, w, b, stride=1, padding=1)
# Note: conv2d_naive defined in previous example
print(f"Max difference: {np.max(np.abs(out_naive - out_fast[:1, :, :8, :8])):.2e}")
print(f"im2col memory overhead: {x.size} input elements -> "
      f"{3*3*3 * 32*32} column elements per sample "
      f"({3*3*3*32*32 / x[0].size:.1f}x expansion)")`
        },
        {
          type: "callout",
          variant: "warning",
          title: "im2col Memory Explosion",
          text: "For a 224x224 RGB input with a 3x3 kernel, im2col creates a matrix of shape (27, 50176) = 1.35M elements per sample. The original input is only 150K elements — a 9x expansion. For depthwise convolution (groups = C_in), im2col is even worse relative to direct computation. On memory-constrained edge devices, some frameworks use 'lazy im2col' that processes tiles to bound peak memory. This is why TFLite and NNAPI often prefer optimized direct convolution for mobile."
        },

        // ── Section 9: Winograd ──
        {
          type: "heading",
          text: "Winograd Convolution: Fewer Multiplications",
          level: 3
        },
        {
          type: "text",
          text: "Winograd F(m, r) computes m output elements from an (m+r-1) element input tile using a r-tap filter, reducing multiplications from m*r to (m+r-1). For 1D F(2,3): instead of 6 multiplications, you do 4 — a 1.5x reduction. For 2D F(2x2, 3x3): instead of 36 multiplications, you do 16 — a 2.25x reduction. cuDNN uses Winograd F(2,3) and F(4,3) for 3x3 convolutions by default when it benchmarks as faster than im2col+GEMM."
        },
        {
          type: "text",
          text: "The catch: Winograd requires more additions and the transform matrices introduce numerical error. For FP32 this is negligible, but for FP16 and especially INT8 quantized models, Winograd's numerical properties degrade. This is why some edge inference runtimes disable Winograd for quantized models and fall back to direct or im2col. When you see accuracy drops after quantization, Winograd interaction is one of the things to investigate."
        },
        {
          type: "callout",
          variant: "tip",
          title: "Choosing the Right Algorithm",
          text: "You almost never choose manually — cuDNN autotuner does it. But understanding the tradeoffs helps: (1) 1x1 conv = pure GEMM, no im2col needed. (2) 3x3 conv on GPU = Winograd or im2col+GEMM. (3) Large kernels (7x7+) = FFT might win. (4) Depthwise conv = direct is often best. (5) Quantized INT8 = direct or im2col, avoid Winograd. Use torch.backends.cudnn.benchmark = True to let cuDNN autotuner run."
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 2 — Implementing Conv2D Forward & Backward from Scratch
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "conv2d-forward-backward",
      title: "Implementing Conv2D Forward & Backward from Scratch",
      readTime: "18 min",
      content: [
        {
          type: "text",
          text: "This lesson implements a complete Conv2D layer — forward and backward pass — from scratch in NumPy. This is not an academic exercise. If you want to understand quantization-aware training, you need to know exactly where the gradients flow and how fake-quantization nodes insert into the forward/backward graph. If you want to implement custom operations on edge hardware (e.g., a fused conv+relu for an NPU that does not support your framework), you need to be able to derive and implement the backward pass. If a model's training diverges and you suspect gradient issues in a custom layer, gradient checking against a known-correct implementation is your debugging tool."
        },
        {
          type: "callout",
          variant: "info",
          title: "What nn.Conv2d Actually Does",
          text: "PyTorch's nn.Conv2d is a thin wrapper around the autograd function torch.nn.functional.conv2d, which dispatches to cuDNN (GPU) or MKLDNN/oneDNN (CPU). cuDNN selects the fastest algorithm via autotuner. The backward pass uses cuDNN's convolution backward functions which compute dL/dX, dL/dW, and dL/db in separate calls. Under the hood, dL/dW is another convolution (input cross-correlated with output gradient), and dL/dX is a 'full' convolution of the output gradient with transposed filters."
        },

        // ── Forward Pass ──
        {
          type: "heading",
          text: "Forward Pass: im2col Approach Step by Step",
          level: 2
        },
        {
          type: "text",
          text: "The forward pass using im2col has three steps: (1) Pad input if needed. (2) Extract input patches into a column matrix using im2col. (3) Multiply the weight matrix by the column matrix and add bias. We cache the column matrix and input shape for the backward pass — this is the same caching that PyTorch's autograd does internally when you call ctx.save_for_backward()."
        },
        {
          type: "diagram",
          code: `Forward Pass Data Flow:

  Input X                Weight W              Bias b
  (N, C_in, H, W)       (C_out, C_in, kH, kW)  (C_out,)
       │                      │                    │
       ▼                      │                    │
  ┌─────────┐                │                    │
  │  Pad X  │                │                    │
  └────┬────┘                │                    │
       ▼                      ▼                    │
  ┌─────────┐          ┌──────────┐               │
  │ im2col  │          │ Reshape  │               │
  │ X -> col│          │ W -> mat │               │
  └────┬────┘          └────┬─────┘               │
       │                     │                     │
       │  col: (N, C_in*kH*kW, L)                 │
       │  mat: (C_out, C_in*kH*kW)                │
       ▼                     ▼                     │
       ┌───────────────────────┐                   │
       │   out = mat @ col     │                   │
       │   (N, C_out, L)      │                   │
       └──────────┬────────────┘                   │
                  │                                │
                  ▼                                ▼
            ┌──────────────────────────────────────┐
            │   out += bias.reshape(1, C_out, 1)   │
            └──────────────────┬───────────────────┘
                               │
                               ▼
                    Reshape to (N, C_out, H_out, W_out)

  Cached for backward: col, X_padded_shape, original X shape`
        },

        // ── Backward Pass Theory ──
        {
          type: "heading",
          text: "Backward Pass: Deriving the Gradients",
          level: 2
        },
        {
          type: "text",
          text: "Given upstream gradient dL/dO of shape (N, C_out, H_out, W_out), we need three gradients: dL/dW (to update weights), dL/db (to update bias), and dL/dX (to propagate gradients to earlier layers). All three are derived from the chain rule applied to the GEMM formulation of the forward pass."
        },
        {
          type: "heading",
          text: "1. Bias Gradient: dL/db",
          level: 3
        },
        {
          type: "text",
          text: "Since out[n, co, i, j] += b[co] for all spatial positions and batch samples, the gradient of the loss with respect to b[co] is the sum of dL/dO[n, co, i, j] over all n, i, j. In code: dL_db = dL_dO.sum(axis=(0, 2, 3)). This gives a vector of shape (C_out,). This is the simplest gradient — just sum the upstream gradient over all positions where the bias was added."
        },
        {
          type: "heading",
          text: "2. Weight Gradient: dL/dW",
          level: 3
        },
        {
          type: "text",
          text: "The forward pass computes out = W_mat @ col where W_mat is (C_out, C_in*kH*kW) and col is (N, C_in*kH*kW, L). By matrix calculus, dL/dW_mat = dL/dout @ col^T. We reshape dL/dout to (N, C_out, L), then for each sample: dW_mat += dL_dout[n] @ col[n].T. Sum over the batch and reshape dW_mat to (C_out, C_in, kH, kW). This is equivalent to convolving the input with the output gradient."
        },
        {
          type: "heading",
          text: "3. Input Gradient: dL/dX (col2im)",
          level: 3
        },
        {
          type: "text",
          text: "The forward pass computes out = W_mat @ col. By matrix calculus, dL/dcol = W_mat^T @ dL/dout. This gives us the gradient in 'column space' — shape (N, C_in*kH*kW, L). We then need to map this back to the original input shape. This is col2im: the inverse of im2col. Where im2col extracted overlapping patches, col2im accumulates (adds) gradients back to overlapping positions. Note: col2im is NOT the matrix inverse of im2col. It is the transpose operation — it sums where im2col gathered."
        },
        {
          type: "diagram",
          code: `Backward Pass Data Flow:

  dL/dO (upstream gradient)
  (N, C_out, H_out, W_out)
            │
            ├──────────────────────────────────────────┐
            │                                          │
            ▼                                          ▼
  ┌──────────────────┐                    ┌───────────────────────┐
  │ dL/db = sum over │                    │ Reshape dL/dO to      │
  │ (N, H_out, W_out)│                    │ (N, C_out, L)         │
  │ → (C_out,)       │                    │ where L = H_out*W_out │
  └──────────────────┘                    └───────────┬───────────┘
                                                      │
                                         ┌────────────┼────────────┐
                                         │                         │
                                         ▼                         ▼
                              ┌────────────────────┐  ┌───────────────────────┐
                              │ dL/dW_mat =        │  │ dL/dcol =             │
                              │ dL_dout @ col^T    │  │ W_mat^T @ dL_dout     │
                              │ (C_out, C_in*K*K)  │  │ (N, C_in*K*K, L)     │
                              └────────────────────┘  └───────────┬───────────┘
                              reshape → (C_out, C_in, kH, kW)     │
                                                                   ▼
                                                      ┌───────────────────────┐
                                                      │ col2im: accumulate    │
                                                      │ gradients back to     │
                                                      │ input spatial grid    │
                                                      │ → (N, C_in, H, W)    │
                                                      └───────────────────────┘`
        },

        // ── Full Implementation ──
        {
          type: "heading",
          text: "Full Implementation: Conv2D with Forward & Backward",
          level: 2
        },
        {
          type: "code",
          lang: "python",
          filename: "conv2d_layer.py",
          desc: "Complete Conv2D layer with im2col forward, col2im backward, and gradient checking.",
          code: `import numpy as np

class Conv2D:
    """
    Conv2D layer with forward and backward pass using im2col/col2im.
    Mirrors the semantics of nn.Conv2d(C_in, C_out, kernel_size, stride, padding).
    """

    def __init__(self, c_in, c_out, kernel_size, stride=1, padding=0):
        self.c_in = c_in
        self.c_out = c_out
        self.kH = self.kW = kernel_size
        self.stride = stride
        self.padding = padding

        # Kaiming initialization (appropriate for ReLU networks)
        fan_in = c_in * self.kH * self.kW
        std = np.sqrt(2.0 / fan_in)
        self.W = np.random.randn(c_out, c_in, self.kH, self.kW).astype(np.float32) * std
        self.b = np.zeros(c_out, dtype=np.float32)

        # Gradient accumulators
        self.dW = np.zeros_like(self.W)
        self.db = np.zeros_like(self.b)

        # Cache for backward
        self._col = None
        self._x_shape = None
        self._x_padded_shape = None

    def _pad(self, x):
        if self.padding > 0:
            return np.pad(x,
                ((0,0), (0,0),
                 (self.padding, self.padding),
                 (self.padding, self.padding)),
                mode='constant', constant_values=0)
        return x

    def _im2col(self, x):
        """Extract patches as columns. x: (N, C, H, W)."""
        N, C, H, W = x.shape
        kH, kW, s = self.kH, self.kW, self.stride
        H_out = (H - kH) // s + 1
        W_out = (W - kW) // s + 1

        cols = np.zeros((N, C * kH * kW, H_out * W_out), dtype=x.dtype)
        idx = 0
        for i in range(H_out):
            for j in range(W_out):
                h_start = i * s
                w_start = j * s
                patch = x[:, :, h_start:h_start+kH, w_start:w_start+kW]
                cols[:, :, idx] = patch.reshape(N, -1)
                idx += 1
        return cols, H_out, W_out

    def _col2im(self, dcol, x_padded_shape):
        """
        Inverse of im2col: accumulate column gradients back to spatial input.
        dcol: (N, C_in*kH*kW, H_out*W_out)
        Returns: (N, C_in, H_padded, W_padded)
        """
        N, C, H, W = x_padded_shape
        kH, kW, s = self.kH, self.kW, self.stride
        H_out = (H - kH) // s + 1
        W_out = (W - kW) // s + 1

        dx = np.zeros(x_padded_shape, dtype=dcol.dtype)
        idx = 0
        for i in range(H_out):
            for j in range(W_out):
                h_start = i * s
                w_start = j * s
                # Each column maps back to a (C_in, kH, kW) patch
                patch_grad = dcol[:, :, idx].reshape(N, C, kH, kW)
                dx[:, :, h_start:h_start+kH, w_start:w_start+kW] += patch_grad
                idx += 1
        return dx

    def forward(self, x):
        """
        Forward pass.
        x: (N, C_in, H, W)
        Returns: (N, C_out, H_out, W_out)
        """
        self._x_shape = x.shape
        x_pad = self._pad(x)
        self._x_padded_shape = x_pad.shape

        # im2col: (N, C_in*kH*kW, H_out*W_out)
        col, H_out, W_out = self._im2col(x_pad)
        self._col = col

        # GEMM: W_mat @ col
        W_mat = self.W.reshape(self.c_out, -1)  # (C_out, C_in*kH*kW)
        out = np.stack([W_mat @ col[n] for n in range(x.shape[0])])

        # Add bias
        out += self.b.reshape(1, -1, 1)

        return out.reshape(x.shape[0], self.c_out, H_out, W_out)

    def backward(self, dout):
        """
        Backward pass.
        dout: (N, C_out, H_out, W_out) — upstream gradient
        Returns: dX (N, C_in, H, W) — gradient w.r.t. input
        """
        N = dout.shape[0]
        dout_flat = dout.reshape(N, self.c_out, -1)  # (N, C_out, L)

        # 1. Bias gradient: sum over batch and spatial dims
        self.db = dout_flat.sum(axis=(0, 2))  # (C_out,)

        # 2. Weight gradient: dW = dout @ col^T, summed over batch
        W_mat = self.W.reshape(self.c_out, -1)
        self.dW = np.zeros_like(W_mat)
        dcol_all = np.zeros_like(self._col)

        for n in range(N):
            # dW += dout[n] @ col[n].T
            self.dW += dout_flat[n] @ self._col[n].T
            # 3. Input gradient in col space: W^T @ dout
            dcol_all[n] = W_mat.T @ dout_flat[n]

        self.dW = self.dW.reshape(self.W.shape)

        # 4. col2im: map column gradients back to input space
        dx_padded = self._col2im(dcol_all, self._x_padded_shape)

        # Remove padding
        if self.padding > 0:
            p = self.padding
            dx = dx_padded[:, :, p:-p, p:-p]
        else:
            dx = dx_padded

        return dx


# ──────────────────────────────────────────────────
# Test: verify against PyTorch (if available) or finite differences
# ──────────────────────────────────────────────────
np.random.seed(42)
x = np.random.randn(2, 3, 8, 8).astype(np.float64)  # float64 for gradient check
conv = Conv2D(c_in=3, c_out=4, kernel_size=3, stride=1, padding=1)
conv.W = conv.W.astype(np.float64)
conv.b = conv.b.astype(np.float64)

# Forward
out = conv.forward(x)
print(f"Output shape: {out.shape}")  # (2, 4, 8, 8)

# Backward with random upstream gradient
dout = np.random.randn(*out.shape)
dx = conv.backward(dout)
print(f"dX shape: {dx.shape}")       # (2, 3, 8, 8)
print(f"dW shape: {conv.dW.shape}")  # (4, 3, 3, 3)
print(f"db shape: {conv.db.shape}")  # (4,)`
        },

        // ── Gradient Checking ──
        {
          type: "heading",
          text: "Gradient Checking: Verifying Correctness",
          level: 2
        },
        {
          type: "text",
          text: "Gradient checking uses finite differences to numerically approximate each partial derivative and compares it to the analytically computed gradient. The relative error should be below 1e-5 for float64. If it is above 1e-3, there is almost certainly a bug. This is the single most important debugging technique for custom layers."
        },
        {
          type: "code",
          lang: "python",
          filename: "gradient_check.py",
          desc: "Finite-difference gradient checking for our Conv2D implementation.",
          code: `def gradient_check_conv2d(conv, x, dout, eps=1e-5):
    """
    Numerically verify dL/dW, dL/db, dL/dX using finite differences.
    """
    # Compute analytical gradients
    out = conv.forward(x)
    dx_analytical = conv.backward(dout)
    dW_analytical = conv.dW.copy()
    db_analytical = conv.db.copy()

    def compute_loss(out):
        # Use sum(dout * out) as a proxy loss whose gradient w.r.t. out is dout
        return np.sum(dout * out)

    # --- Check dL/dW ---
    dW_numerical = np.zeros_like(conv.W)
    it = np.nditer(conv.W, flags=['multi_index'])
    while not it.finished:
        idx = it.multi_index
        old_val = conv.W[idx]

        conv.W[idx] = old_val + eps
        loss_plus = compute_loss(conv.forward(x))

        conv.W[idx] = old_val - eps
        loss_minus = compute_loss(conv.forward(x))

        dW_numerical[idx] = (loss_plus - loss_minus) / (2 * eps)
        conv.W[idx] = old_val
        it.iternext()

    rel_error_W = np.max(np.abs(dW_analytical - dW_numerical) /
                         (np.abs(dW_analytical) + np.abs(dW_numerical) + 1e-8))

    # --- Check dL/db ---
    db_numerical = np.zeros_like(conv.b)
    for i in range(conv.b.size):
        old_val = conv.b[i]

        conv.b[i] = old_val + eps
        loss_plus = compute_loss(conv.forward(x))

        conv.b[i] = old_val - eps
        loss_minus = compute_loss(conv.forward(x))

        db_numerical[i] = (loss_plus - loss_minus) / (2 * eps)
        conv.b[i] = old_val

    rel_error_b = np.max(np.abs(db_analytical - db_numerical) /
                         (np.abs(db_analytical) + np.abs(db_numerical) + 1e-8))

    # --- Check dL/dX ---
    dx_numerical = np.zeros_like(x)
    # Only check a subset of elements for speed
    indices = np.random.choice(x.size, min(100, x.size), replace=False)
    for flat_idx in indices:
        idx = np.unravel_index(flat_idx, x.shape)
        old_val = x[idx]

        x[idx] = old_val + eps
        loss_plus = compute_loss(conv.forward(x))

        x[idx] = old_val - eps
        loss_minus = compute_loss(conv.forward(x))

        dx_numerical[idx] = (loss_plus - loss_minus) / (2 * eps)
        x[idx] = old_val

    # Only compare checked indices
    checked = np.zeros_like(x, dtype=bool)
    for flat_idx in indices:
        checked[np.unravel_index(flat_idx, x.shape)] = True
    rel_error_X = np.max(np.abs(dx_analytical[checked] - dx_numerical[checked]) /
                         (np.abs(dx_analytical[checked]) + np.abs(dx_numerical[checked]) + 1e-8))

    print(f"dW relative error: {rel_error_W:.2e}  {'PASS' if rel_error_W < 1e-5 else 'FAIL'}")
    print(f"db relative error: {rel_error_b:.2e}  {'PASS' if rel_error_b < 1e-5 else 'FAIL'}")
    print(f"dX relative error: {rel_error_X:.2e}  {'PASS' if rel_error_X < 1e-5 else 'FAIL'}")


# Run gradient check
np.random.seed(0)
x_check = np.random.randn(1, 2, 6, 6).astype(np.float64)
conv_check = Conv2D(c_in=2, c_out=3, kernel_size=3, stride=1, padding=1)
conv_check.W = np.random.randn(*conv_check.W.shape).astype(np.float64)
conv_check.b = np.random.randn(*conv_check.b.shape).astype(np.float64)

out_check = conv_check.forward(x_check)
dout_check = np.random.randn(*out_check.shape).astype(np.float64)

gradient_check_conv2d(conv_check, x_check, dout_check)
# Expected output: all PASS with relative errors < 1e-7`
        },

        // ── Why This Matters ──
        {
          type: "heading",
          text: "Why Understanding Backward Pass Matters for Production",
          level: 2
        },
        {
          type: "text",
          text: "Here are the concrete production scenarios where understanding conv2d internals pays off:"
        },
        {
          type: "comparison",
          headers: ["Scenario", "What You Need to Know", "Why"],
          rows: [
            ["Quantization-Aware Training (QAT)", "Fake-quantize nodes insert into forward pass; their straight-through estimator gradient flows through the backward pass", "Without understanding the backward graph, you cannot debug why QAT converges slowly or produces different accuracy than post-training quantization"],
            ["Structured Pruning", "Removing a filter changes C_out, which changes the shape of dL/dW and the im2col matrix for the next layer", "Pruning a filter in layer L requires updating the weight gradient computation in layer L+1"],
            ["Custom CUDA Kernels", "You must implement both forward and backward in CUDA; autograd calls your backward kernel", "Missing or incorrect backward = silent gradient corruption = model trains but never converges"],
            ["Gradient Checkpointing", "Recomputing forward activations during backward to save memory", "You need to know which cached values (col, input) are needed and when they can be freed"],
            ["Mixed Precision Training", "FP16 forward, FP32 gradient accumulation, loss scaling", "Understanding where overflow/underflow occurs in the backward GEMM operations"]
          ]
        },
        {
          type: "callout",
          variant: "tip",
          title: "Debugging Gradient Issues in Practice",
          text: "When a custom layer misbehaves during training, use torch.autograd.gradcheck(func, inputs, eps=1e-6, atol=1e-4, rtol=1e-3). This does exactly what our gradient_check function does but integrated with PyTorch autograd. For CUDA kernels, also test with torch.autograd.gradgradcheck to verify second-order derivatives if you use them (e.g., in some GAN training techniques)."
        },

        // ── Computational Cost Analysis ──
        {
          type: "heading",
          text: "Computational Cost: Forward vs Backward",
          level: 2
        },
        {
          type: "text",
          text: "A common rule of thumb: the backward pass costs roughly 2x the forward pass. This is because you compute two GEMMs in the backward (one for dW, one for dX) versus one GEMM in the forward. The col2im operation in backward is cheaper than im2col in forward because it is a scatter-add rather than a gather. For a Conv2D layer with C_in input channels, C_out output channels, kernel K, and spatial output size L = H_out * W_out:"
        },
        {
          type: "comparison",
          headers: ["Operation", "FLOPs", "Memory Reads", "Memory Writes"],
          rows: [
            ["Forward GEMM", "2 * C_out * C_in*K*K * L", "W + col", "out"],
            ["Backward dW GEMM", "2 * C_out * C_in*K*K * L", "dout + col", "dW"],
            ["Backward dX GEMM", "2 * C_in*K*K * C_out * L", "W + dout", "dcol"],
            ["im2col (forward)", "0 (data movement only)", "X_padded", "col"],
            ["col2im (backward)", "0 (data movement only)", "dcol", "dX (accumulate)"]
          ]
        },
        {
          type: "text",
          text: "Total backward FLOPs is approximately 2x forward FLOPs. But memory bandwidth is the real bottleneck on GPUs. The backward pass reads the cached col matrix (which can be huge), plus the weight matrix twice. This is why gradient checkpointing — recomputing col on the fly instead of caching it — trades 33% more compute for potentially 50%+ memory savings."
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 3 — Pooling, Batch Normalization & Activation Functions
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "pooling-batchnorm-activations",
      title: "Pooling, Batch Normalization & Activation Functions — Internals",
      readTime: "14 min",
      content: [
        {
          type: "text",
          text: "Between convolution layers sit three critical components: pooling for spatial downsampling, batch normalization for training stability, and activation functions for nonlinearity. Each has subtle implementation details that become critical at the edge. Batch normalization can be algebraically fused into the preceding convolution, eliminating an entire layer at inference — this is done by every serious edge deployment pipeline. Activation functions that seem trivial (ReLU is just max(0, x)) become nontrivial when you must implement them as integer lookup tables for quantized models. This lesson covers the internals."
        },

        // ── Pooling ──
        {
          type: "heading",
          text: "Pooling Operations: Forward & Backward",
          level: 2
        },
        {
          type: "text",
          text: "Pooling reduces spatial dimensions. Max pooling selects the maximum value in each window; average pooling computes the mean. Global average pooling (GAP) averages over the entire spatial dimension, producing a (N, C, 1, 1) tensor — this replaces the flattening + FC layer in modern architectures (ResNet, EfficientNet) and is parameter-free."
        },
        {
          type: "comparison",
          headers: ["Pooling Type", "Forward", "Backward", "Use Case"],
          rows: [
            ["Max Pool 2x2, stride 2", "Select max in each 2x2 window", "Gradient flows only to the max position (mask-based)", "Most common; preserves strongest activations"],
            ["Average Pool 2x2, stride 2", "Mean of each 2x2 window", "Gradient distributed equally to all 4 positions (1/4 each)", "Smoother gradients; used in some architectures"],
            ["Global Average Pool", "Mean over entire H x W", "Gradient = dout / (H * W) broadcast to all positions", "Replaces FC; invariant to input spatial size"],
            ["Adaptive Average Pool", "Adjusts window/stride to produce target size", "Same as average pool with computed window", "PyTorch: nn.AdaptiveAvgPool2d((1,1)) for GAP"]
          ]
        },
        {
          type: "heading",
          text: "Max Pooling: The Mask-Based Backward Pass",
          level: 3
        },
        {
          type: "text",
          text: "During the forward pass of max pooling, you must record which element was the maximum in each window — this is the 'argmax mask'. During the backward pass, the upstream gradient is routed only to the position that was the maximum; all other positions receive zero gradient. This is why max pooling can cause 'dead' spatial regions during training (positions that are never the maximum never receive gradient). In practice this is rarely a problem because the input changes every iteration."
        },
        {
          type: "diagram",
          code: `Max Pool 2x2, stride 2 — Forward & Backward:

Forward:                          Argmax Mask:
Input 4x4:                       (stored for backward)
┌────┬────┬────┬────┐            ┌────┬────┬────┬────┐
│  1 │  3 │  2 │  1 │            │  0 │  1 │  0 │  0 │
├────┼────┼────┼────┤            ├────┼────┼────┼────┤
│  2 │  0 │  4 │  2 │            │  0 │  0 │  1 │  0 │
├────┼────┼────┼────┤            ├────┼────┼────┼────┤
│  5 │  1 │  3 │  0 │            │  1 │  0 │  0 │  0 │
├────┼────┼────┼────┤            ├────┼────┼────┼────┤
│  0 │  2 │  1 │  7 │            │  0 │  0 │  0 │  1 │
└────┴────┴────┴────┘            └────┴────┴────┴────┘

Output 2x2:                      Backward (dout = [[a, b], [c, d]]):
┌────┬────┐                      ┌────┬────┬────┬────┐
│  3 │  4 │ = max of windows     │  0 │  a │  0 │  0 │
├────┼────┤                      ├────┼────┼────┼────┤
│  5 │  7 │                      │  0 │  0 │  b │  0 │
└────┴────┘                      ├────┼────┼────┼────┤
                                 │  c │  0 │  0 │  0 │
                                 ├────┼────┼────┼────┤
                                 │  0 │  0 │  0 │  d │
                                 └────┴────┴────┴────┘
                                 Gradient goes ONLY to max positions`
        },

        // ── Batch Normalization ──
        {
          type: "heading",
          text: "Batch Normalization Internals",
          level: 2
        },
        {
          type: "text",
          text: "Batch normalization (Ioffe & Szegedy, 2015) normalizes each channel's activations to zero mean and unit variance across the batch and spatial dimensions, then applies a learned affine transform. It stabilizes training, allows higher learning rates, and acts as a mild regularizer. But the implementation details for training vs inference are very different, and getting this wrong is one of the most common deployment bugs."
        },
        {
          type: "heading",
          text: "Training Mode",
          level: 3
        },
        {
          type: "text",
          text: "During training, for each channel c: (1) Compute batch mean: mu_c = mean(x[:, c, :, :]) over batch and spatial dims. (2) Compute batch variance: var_c = var(x[:, c, :, :]) with the same axes. (3) Normalize: x_hat_c = (x[:, c, :, :] - mu_c) / sqrt(var_c + epsilon). (4) Scale and shift: y_c = gamma_c * x_hat_c + beta_c, where gamma and beta are learned parameters. Additionally, update running statistics: running_mean = (1 - momentum) * running_mean + momentum * mu_c, and similarly for running_var. PyTorch default momentum is 0.1."
        },
        {
          type: "heading",
          text: "Inference Mode",
          level: 3
        },
        {
          type: "text",
          text: "During inference (model.eval()), BN uses the accumulated running_mean and running_var instead of batch statistics. The computation becomes: y = gamma * (x - running_mean) / sqrt(running_var + eps) + beta. This is a simple affine transform per channel — no dependency on other samples in the batch. This distinction is critical: if you forget to call model.eval() before inference, you get batch-dependent outputs, which means single-sample inference gives different results than batched inference."
        },
        {
          type: "callout",
          variant: "warning",
          title: "The model.eval() Bug",
          text: "One of the most common deployment bugs: exporting or running inference without calling model.eval() first. In training mode, BN computes statistics from the current batch, so a single input produces different output than the same input in a batch of 32. This causes silent accuracy degradation. Always verify: model.training should be False before export (ONNX, TorchScript, TensorRT)."
        },

        // ── BN Fusion ──
        {
          type: "heading",
          text: "BN Fusion into Convolution: The Key Edge Optimization",
          level: 2
        },
        {
          type: "text",
          text: "At inference time, a Conv2D followed by BatchNorm is equivalent to a single Conv2D with modified weights and bias. This fusion eliminates the BN layer entirely — saving memory bandwidth (one fewer read/write of the entire activation tensor) and compute. Every edge deployment pipeline (TensorRT, TFLite, ONNX Runtime, CoreML) performs this fusion automatically, but understanding the math is essential for debugging quantization issues and implementing custom fusions."
        },
        {
          type: "text",
          text: "The derivation: Conv output is z = W*x + b_conv. BN at inference computes y = gamma * (z - running_mean) / sqrt(running_var + eps) + beta. Substituting z: y = gamma / sqrt(running_var + eps) * (W*x + b_conv - running_mean) + beta. Let scale = gamma / sqrt(running_var + eps). Then y = scale * W * x + scale * (b_conv - running_mean) + beta. This is a convolution with fused weight W_fused = scale * W and fused bias b_fused = scale * (b_conv - running_mean) + beta, where scale is applied per output channel."
        },
        {
          type: "diagram",
          code: `BN Fusion — Before and After:

BEFORE (2 operations):
  x ──► [Conv2D: W, b] ──► z ──► [BN: gamma, beta, mu, var] ──► y
         Memory: read x,     Memory: read z, write y
                 write z      (extra activation tensor!)

AFTER (1 operation):
  x ──► [Conv2D: W_fused, b_fused] ──► y
         Memory: read x, write y only

Fusion math (per output channel c):
  scale_c  = gamma_c / sqrt(running_var_c + eps)
  W_fused[c]  = scale_c * W[c]           ← scale all C_in*kH*kW weights
  b_fused[c]  = scale_c * (b[c] - running_mean_c) + beta_c

Memory savings: eliminates one full activation tensor read+write
Compute savings: eliminates the normalize + affine ops
Latency improvement: typically 10-20% for BN-heavy models (ResNet, MobileNet)`
        },
        {
          type: "code",
          lang: "python",
          filename: "bn_fusion.py",
          desc: "Fuse BatchNorm into the preceding Conv2D — production implementation with PyTorch verification.",
          code: `import numpy as np

def fuse_conv_bn(conv_W, conv_b, bn_gamma, bn_beta, bn_mean, bn_var, eps=1e-5):
    """
    Fuse Conv2D + BatchNorm into a single Conv2D.

    Parameters:
        conv_W:   (C_out, C_in, kH, kW) — convolution weights
        conv_b:   (C_out,) — convolution bias (use zeros if conv has no bias)
        bn_gamma: (C_out,) — BN scale parameter
        bn_beta:  (C_out,) — BN shift parameter
        bn_mean:  (C_out,) — BN running mean
        bn_var:   (C_out,) — BN running variance
        eps:      float — BN epsilon

    Returns:
        W_fused: (C_out, C_in, kH, kW)
        b_fused: (C_out,)
    """
    C_out = conv_W.shape[0]

    # Per-channel scale factor
    scale = bn_gamma / np.sqrt(bn_var + eps)  # (C_out,)

    # Fused weights: multiply each output filter by its scale
    # scale needs to broadcast over (C_in, kH, kW)
    W_fused = conv_W * scale.reshape(C_out, 1, 1, 1)

    # Fused bias
    b_fused = scale * (conv_b - bn_mean) + bn_beta

    return W_fused, b_fused


# ──────────────────────────────────────────────────
# Verify fusion correctness
# ──────────────────────────────────────────────────
np.random.seed(42)

# Simulate a Conv2D layer
C_in, C_out, kH, kW = 3, 16, 3, 3
conv_W = np.random.randn(C_out, C_in, kH, kW).astype(np.float32)
conv_b = np.random.randn(C_out).astype(np.float32)

# Simulate BN parameters (as if accumulated during training)
bn_gamma = np.random.randn(C_out).astype(np.float32) * 0.5 + 1.0  # near 1
bn_beta  = np.random.randn(C_out).astype(np.float32) * 0.1
bn_mean  = np.random.randn(C_out).astype(np.float32) * 0.5
bn_var   = np.abs(np.random.randn(C_out).astype(np.float32)) + 0.1  # positive
eps = 1e-5

# Test input
x = np.random.randn(2, C_in, 8, 8).astype(np.float32)

# --- Path 1: Conv then BN (unfused) ---
# Simple conv (no padding for simplicity)
def simple_conv(x, W, b):
    N, C, H, W_in = x.shape
    C_out, _, kH, kW = W.shape
    H_out = H - kH + 1
    W_out = W_in - kW + 1
    out = np.zeros((N, C_out, H_out, W_out), dtype=x.dtype)
    for n in range(N):
        for co in range(C_out):
            for i in range(H_out):
                for j in range(W_out):
                    out[n, co, i, j] = np.sum(
                        x[n, :, i:i+kH, j:j+kW] * W[co]) + b[co]
    return out

z = simple_conv(x, conv_W, conv_b)  # (2, 16, 6, 6)

# Apply BN in eval mode
scale = bn_gamma / np.sqrt(bn_var + eps)
y_unfused = scale.reshape(1, -1, 1, 1) * (z - bn_mean.reshape(1, -1, 1, 1)) + \
            bn_beta.reshape(1, -1, 1, 1)

# --- Path 2: Fused conv ---
W_fused, b_fused = fuse_conv_bn(conv_W, conv_b, bn_gamma, bn_beta, bn_mean, bn_var, eps)
y_fused = simple_conv(x, W_fused, b_fused)

# --- Compare ---
max_diff = np.max(np.abs(y_unfused - y_fused))
print(f"Max difference between fused and unfused: {max_diff:.2e}")
# Expected: ~1e-6 (float32 rounding)
assert max_diff < 1e-4, "Fusion verification failed!"
print("BN fusion verified successfully!")

# --- PyTorch verification (if available) ---
try:
    import torch
    import torch.nn as nn

    # Create equivalent PyTorch layers
    conv_pt = nn.Conv2d(C_in, C_out, kH, bias=True)
    bn_pt = nn.BatchNorm2d(C_out, eps=eps)

    with torch.no_grad():
        conv_pt.weight.copy_(torch.from_numpy(conv_W))
        conv_pt.bias.copy_(torch.from_numpy(conv_b))
        bn_pt.weight.copy_(torch.from_numpy(bn_gamma))
        bn_pt.bias.copy_(torch.from_numpy(bn_beta))
        bn_pt.running_mean.copy_(torch.from_numpy(bn_mean))
        bn_pt.running_var.copy_(torch.from_numpy(bn_var))

    bn_pt.eval()  # CRITICAL: eval mode uses running stats
    x_pt = torch.from_numpy(x)

    y_pt = bn_pt(conv_pt(x_pt)).detach().numpy()
    y_our = y_fused

    print(f"Max diff vs PyTorch: {np.max(np.abs(y_pt - y_our)):.2e}")
except ImportError:
    print("PyTorch not available; skipping cross-validation")`
        },

        // ── Activation Functions ──
        {
          type: "heading",
          text: "Activation Functions: Compute Cost & Quantization",
          level: 2
        },
        {
          type: "text",
          text: "Activation functions introduce nonlinearity. On GPU with float32, the choice barely matters for speed — ReLU, GELU, and SiLU all run at memory bandwidth speed. On edge devices with INT8 quantization, the story is completely different. ReLU is trivially quantizable (threshold at zero). GELU and SiLU require lookup tables or polynomial approximations, which adds latency and complexity."
        },
        {
          type: "comparison",
          headers: ["Activation", "Formula", "FP32 Cost", "INT8 Quantization", "Edge Suitability"],
          rows: [
            ["ReLU", "max(0, x)", "1 comparison", "Trivial: clamp at zero point", "Excellent — zero overhead"],
            ["ReLU6", "min(max(0, x), 6)", "2 comparisons", "Clamp between zero_point and q(6)", "Excellent — used in MobileNet"],
            ["LeakyReLU", "x if x > 0 else alpha*x", "1 compare + 1 multiply", "Two linear regions; needs careful scale", "Good — small overhead"],
            ["GELU", "x * Phi(x) where Phi = CDF of N(0,1)", "~10 FLOPs (tanh approx)", "256-entry lookup table (LUT)", "Moderate — LUT fits in L1 cache"],
            ["SiLU/Swish", "x * sigmoid(x)", "~5 FLOPs (exp)", "256-entry LUT", "Moderate — used in EfficientNet"],
            ["Hardswish", "x * relu6(x+3)/6", "3 ops (no exp)", "Piecewise linear; easy to quantize", "Good — MobileNetV3 uses this"]
          ]
        },
        {
          type: "heading",
          text: "Quantized Activation via Lookup Table",
          level: 3
        },
        {
          type: "text",
          text: "For INT8 (uint8) quantized inference, the input to an activation function is one of 256 possible integer values. Instead of computing the activation function at runtime, we precompute a 256-entry lookup table (LUT) that maps each quantized input to its quantized output. At runtime, the activation is a single table lookup per element — one memory read, zero arithmetic. This is how TFLite, NNAPI, and custom NPU runtimes handle nonlinear activations."
        },
        {
          type: "code",
          lang: "python",
          filename: "quantized_activation_lut.py",
          desc: "Build quantized lookup tables for activation functions — the actual technique used in edge runtimes.",
          code: `import numpy as np

def build_activation_lut(activation_fn, input_scale, input_zero_point,
                         output_scale, output_zero_point, dtype=np.uint8):
    """
    Build a 256-entry lookup table for a quantized activation function.

    Quantization scheme: real_value = scale * (quantized_value - zero_point)

    For each possible uint8 input q_in (0..255):
      1. Dequantize: x_float = input_scale * (q_in - input_zero_point)
      2. Apply activation: y_float = activation_fn(x_float)
      3. Requantize: q_out = clamp(round(y_float / output_scale + output_zero_point), 0, 255)

    Returns: LUT array of shape (256,) with dtype uint8
    """
    lut = np.zeros(256, dtype=dtype)
    for q_in in range(256):
        # Dequantize
        x_float = input_scale * (q_in - input_zero_point)
        # Apply activation in float
        y_float = activation_fn(x_float)
        # Requantize
        q_out = np.round(y_float / output_scale + output_zero_point)
        lut[q_in] = np.clip(q_out, 0, 255).astype(dtype)
    return lut


def apply_quantized_activation(x_quantized, lut):
    """Apply activation via LUT — O(1) per element, zero arithmetic."""
    return lut[x_quantized]  # NumPy fancy indexing


# ──────────────────────────────────────────────────
# Example: Build LUTs for common activations
# ──────────────────────────────────────────────────

# Quantization parameters (typical for post-training quantization)
input_scale = 0.05      # real_range / 255, e.g., [-6.4, 6.4]
input_zp = 128           # zero point — 128 maps to 0.0
output_scale = 0.04
output_zp = 0             # ReLU output is non-negative

# ReLU
def relu(x):
    return np.maximum(0, x)

lut_relu = build_activation_lut(relu, input_scale, input_zp, output_scale, output_zp)
print("ReLU LUT (first 10 entries, inputs map to negative reals):")
print(f"  q_in=0..9 -> {lut_relu[:10]}")  # All zeros (negative inputs)
print(f"  q_in=128  -> {lut_relu[128]}")   # Zero point -> 0
print(f"  q_in=200  -> {lut_relu[200]}")   # Positive input -> positive output

# GELU (used in Transformers, ViT, BERT)
def gelu(x):
    return 0.5 * x * (1 + np.tanh(np.sqrt(2 / np.pi) * (x + 0.044715 * x**3)))

lut_gelu = build_activation_lut(gelu, input_scale, input_zp,
                                output_scale=0.03, output_zero_point=64)

# SiLU / Swish (used in EfficientNet, YOLOv5+)
def silu(x):
    return x / (1 + np.exp(-x))

lut_silu = build_activation_lut(silu, input_scale, input_zp,
                                output_scale=0.03, output_zero_point=64)

# ──────────────────────────────────────────────────
# Benchmark: LUT vs float computation
# ──────────────────────────────────────────────────
import time

# Simulate a quantized activation map (e.g., 64 channels, 56x56 spatial)
x_quant = np.random.randint(0, 256, size=(1, 64, 56, 56), dtype=np.uint8)
x_float = input_scale * (x_quant.astype(np.float32) - input_zp)

# LUT approach
t0 = time.perf_counter()
for _ in range(100):
    y_lut = lut_gelu[x_quant]
t_lut = (time.perf_counter() - t0) / 100

# Float approach
t0 = time.perf_counter()
for _ in range(100):
    y_float = gelu(x_float)
t_float = (time.perf_counter() - t0) / 100

print(f"\\nGELU benchmark on {x_quant.shape} tensor:")
print(f"  LUT (uint8):   {t_lut*1000:.3f} ms")
print(f"  Float (fp32):  {t_float*1000:.3f} ms")
print(f"  Speedup:       {t_float/t_lut:.1f}x")
print(f"  Memory:        LUT uses {x_quant.nbytes/1024:.0f} KB, "
      f"float uses {x_float.nbytes/1024:.0f} KB")`
        },
        {
          type: "callout",
          variant: "tip",
          title: "Hardswish and Hardsigmoid: Designed for Quantization",
          text: "MobileNetV3 replaced SiLU with Hardswish: x * relu6(x+3)/6. This is piecewise linear, which means it can be computed exactly in integer arithmetic without any lookup table — just shifts, adds, and clamps. Similarly, Hardsigmoid replaces sigmoid. When designing models for edge, prefer these 'hard' variants. They give similar accuracy but are vastly more efficient in INT8."
        },

        // ── BN in Quantized Models ──
        {
          type: "heading",
          text: "BN + Quantization: Why Fusion Order Matters",
          level: 2
        },
        {
          type: "text",
          text: "In a quantized model pipeline, BN fusion must happen BEFORE quantization. The sequence is: (1) Train in FP32 with Conv + BN. (2) Fuse BN into Conv weights (produces new W_fused and b_fused). (3) Then quantize the fused Conv. If you quantize first and then try to fuse, the scale factors interact badly and you lose accuracy. This is why TensorRT, TFLite converter, and ONNX Runtime all fuse BN before applying quantization calibration."
        },
        {
          type: "text",
          text: "There is a subtlety for quantization-aware training (QAT): during QAT, you keep BN unfused in the training graph (because BN statistics evolve during training), but fake-quantize nodes simulate quantized behavior. At export time, you first fold BN into conv, then export the quantized model. PyTorch's torch.ao.quantization handles this automatically with the prepare_qat and convert steps."
        },
        {
          type: "comparison",
          headers: ["Pipeline Step", "What Happens", "Why This Order"],
          rows: [
            ["1. Train FP32", "Conv + BN + ReLU as separate layers", "BN needs running stats accumulation"],
            ["2. Fuse BN", "W_fused = gamma/sqrt(var+eps) * W; b_fused = ...", "Merge BN affine into conv weights"],
            ["3. Calibrate quantization", "Run representative data through fused model; collect activation ranges", "Ranges must reflect fused behavior"],
            ["4. Quantize", "Convert FP32 fused weights to INT8 with computed scales", "INT8 conv replaces FP32 conv+BN"],
            ["5. Export", "Serialize INT8 model for target runtime", "No BN layer exists in final model"]
          ]
        },

        // ── Edge Activation Costs ──
        {
          type: "heading",
          text: "Activation Function Costs on Real Edge Hardware",
          level: 2
        },
        {
          type: "text",
          text: "On a Cortex-A72 (Raspberry Pi 4), a ReLU on a 64x56x56 INT8 tensor takes approximately 0.02 ms — it is a single NEON vector comparison and blend. The same tensor through a GELU LUT takes approximately 0.08 ms — 4x slower due to the random-access memory pattern of the lookup (poor cache behavior for large tensors). On a dedicated NPU (e.g., Google Edge TPU), ReLU is fused into the convolution at zero cost, while GELU requires a CPU fallback — potentially 100x slower because data must be copied from NPU to CPU and back."
        },
        {
          type: "callout",
          variant: "warning",
          title: "NPU-Unfriendly Operations",
          text: "Most edge NPUs (Edge TPU, Hexagon DSP, Apple ANE) only natively support a small set of operations: Conv, DepthwiseConv, ReLU/ReLU6, Add, Concat, Pool, Reshape. GELU, SiLU, LayerNorm, and GroupNorm typically cause 'graph partitioning' — the NPU runs some layers, the CPU runs others, and data bounces between them. A single GELU can fragment an otherwise fully-NPU graph. Always check your target NPU's op support table before choosing activations."
        },
        {
          type: "text",
          text: "Summary: at the edge, every component between convolutions matters. BN fusion is non-negotiable — it is free accuracy at zero runtime cost. Activation choice should be guided by your target hardware: ReLU/ReLU6 for maximum NPU compatibility, Hardswish if you need something smoother, and GELU only if you are on GPU or can tolerate CPU fallback. Pooling choice is less critical for performance but global average pooling is preferred over FC layers for its parameter-free size invariance."
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 4 — Architecture Evolution: From LeNet to EfficientNet
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "architecture-evolution-lenet-to-efficientnet",
      title: "Architecture Evolution: From LeNet to EfficientNet",
      readTime: "16 min",
      content: [
        {
          type: "text",
          text: "Understanding CNN architecture evolution is not optional knowledge for production engineers. When you pick a backbone for an edge detection pipeline, you are choosing from a lineage of designs that each solved a specific bottleneck. LeNet showed convolutions work. AlexNet proved GPUs and ReLU were essential. VGG demonstrated that depth with small kernels beats width with large kernels. GoogLeNet introduced multi-scale processing. ResNet solved the degradation problem that made very deep networks trainable. MobileNet brought everything to phones. EfficientNet showed that scaling all three dimensions — depth, width, resolution — simultaneously is optimal. Every architecture you deploy in production descends from these ideas."
        },
        {
          type: "callout",
          variant: "info",
          title: "Why Architecture Knowledge Matters at the Edge",
          text: "Choosing between MobileNetV2 and EfficientNet-Lite for a 2W NPU is not a model zoo decision — it is an architecture decision. You need to understand why inverted residuals use linear bottlenecks (hint: ReLU destroys information in low-dimensional spaces), why depthwise separable convolutions reduce FLOPs by 8-9x, and why compound scaling outperforms naive width scaling. Without this knowledge, you will either over-provision hardware or ship models that miss latency targets."
        },
        {
          type: "heading",
          text: "LeNet-5 to AlexNet: The GPU Revolution",
          level: 2
        },
        {
          type: "text",
          text: "LeNet-5 (1998) was a 7-layer network for digit recognition: two convolutional layers with 5x5 kernels, subsampling (average pooling), and three fully connected layers. It had ~60K parameters and was trained on CPU. The key insight was weight sharing — the same kernel slides across the entire input, dramatically reducing parameters compared to fully connected layers. But LeNet worked only on 32x32 grayscale images. Scaling to ImageNet (224x224 RGB) required three breakthroughs that AlexNet (2012) delivered."
        },
        {
          type: "text",
          text: "AlexNet's three critical contributions: (1) ReLU activation instead of sigmoid/tanh — this eliminated the vanishing gradient problem for moderate depths and was 6x faster to compute. (2) Dropout regularization at 0.5 probability in the FC layers — this prevented the 60M parameter network from memorizing the training set. (3) GPU training — AlexNet was split across two GTX 580 GPUs with 3GB each, using a model-parallel strategy where each GPU computed half the filters. This was not just faster; it was the only way to fit the model. AlexNet achieved 15.3% top-5 error on ImageNet, compared to 26.2% for the best non-deep-learning approach."
        },
        {
          type: "heading",
          text: "VGG: The 3x3 Stacking Insight",
          level: 2
        },
        {
          type: "text",
          text: "VGG (2014) asked a simple question: what if we use only 3x3 convolutions? Two stacked 3x3 convolutions have the same receptive field as one 5x5, and three stacked 3x3 convolutions match a 7x7. But the parameter count is dramatically different. A single 7x7 conv layer with C input and C output channels has 7x7xCxC = 49C^2 parameters. Three 3x3 layers have 3 x (3x3xCxC) = 27C^2 parameters — a 45% reduction. Additionally, three layers have three non-linearities instead of one, making the function more discriminative. VGG-16 reached 7.3% top-5 error but at a brutal cost: 138M parameters and 15.5G FLOPs. The FC layers alone consumed 124M of those parameters."
        },
        {
          type: "diagram",
          code: `VGG Receptive Field Equivalence:

  Single 7x7 Conv                Three Stacked 3x3 Convs
  ┌───────────────┐              ┌─────┐
  │               │   RF = 7x7   │ 3x3 │ → RF = 3x3
  │     7 x 7     │              └─────┘
  │               │              ┌─────┐
  │   49C^2 params│              │ 3x3 │ → RF = 5x5
  └───────────────┘              └─────┘
                                 ┌─────┐
                                 │ 3x3 │ → RF = 7x7
                                 └─────┘
                                 27C^2 params (45% fewer)
                                 3 ReLUs vs 1 ReLU

  Two Stacked 3x3 Convs
  ┌─────┐
  │ 3x3 │ → RF = 3x3
  └─────┘
  ┌─────┐
  │ 3x3 │ → RF = 5x5            Single 5x5 Conv
  └─────┘                       ┌───────────┐
  18C^2 params                  │   5 x 5   │  25C^2 params
  2 ReLUs vs 1 ReLU             └───────────┘`
        },
        {
          type: "heading",
          text: "GoogLeNet/Inception: Multi-Scale Processing",
          level: 2
        },
        {
          type: "text",
          text: "GoogLeNet (2014) introduced the Inception module, which processes input at multiple scales simultaneously. Each Inception module applies 1x1, 3x3, and 5x5 convolutions in parallel, plus a max pooling branch, then concatenates the outputs along the channel dimension. The critical insight: objects in images appear at different scales, so why commit to a single kernel size per layer? The 1x1 convolutions before larger kernels serve as bottleneck layers that reduce channel dimensions, cutting FLOPs dramatically. GoogLeNet achieved 6.7% top-5 error with only 6.8M parameters — 20x fewer than VGG — by using global average pooling instead of FC layers and the Inception bottleneck design."
        },
        {
          type: "heading",
          text: "ResNet: Skip Connections and the Gradient Highway",
          level: 2
        },
        {
          type: "text",
          text: "ResNet (2015) solved the degradation problem: adding more layers to a plain CNN eventually increases both training AND test error. This is not overfitting — it is an optimization problem. Very deep networks with plain stacking cannot learn the identity function easily, so adding layers hurts even when the extra layers should theoretically just learn identity. ResNet's solution is the skip connection (residual connection): instead of learning H(x), the network learns F(x) = H(x) - x, and the output is F(x) + x. Learning F(x) = 0 (the identity) is trivially easy with weight decay pushing weights toward zero."
        },
        {
          type: "text",
          text: "The gradient flow argument is equally important. During backpropagation through a residual block, the gradient of the loss with respect to an early layer x_l can be decomposed as: dL/dx_l = dL/dx_L * (1 + d/dx_l of sum of F_i terms). The key term is the 1 — it provides a direct gradient highway from the loss all the way back to early layers. Even if the learned residual function gradients vanish, the identity path ensures gradients flow. This is why ResNets with 152 layers train better than 20-layer plain networks. ResNet-152 achieved 3.57% top-5 error on ImageNet."
        },
        {
          type: "diagram",
          code: `ResNet Skip Connection:

  Plain Network:                   Residual Network:

  x ──→ [Conv-BN-ReLU] ──→        x ──┬──→ [Conv-BN-ReLU] ──→
        [Conv-BN-ReLU] ──→ H(x)       │    [Conv-BN    ] ──→ F(x)
                                       │         │
                                       └────(+)──┘
                                             │
                                           ReLU
                                             │
                                          F(x) + x

  Gradient Flow:
  ┌──────────────────────────────────────────────────┐
  │  dL       dL     ┌         ∂           ┐        │
  │ ──── = ─────── × │ 1 + ──── Σ F_i(x) │        │
  │ dx_l    dx_L     └       ∂x_l          ┘        │
  │                    ↑                             │
  │              gradient highway                    │
  │              (never vanishes)                    │
  └──────────────────────────────────────────────────┘

  Bottleneck Block (ResNet-50+):
  x ──┬──→ [1x1 Conv, 64]  ← reduce channels
      │    [3x3 Conv, 64]  ← spatial processing
      │    [1x1 Conv, 256] ← restore channels
      └────────(+)──────── → F(x) + x`
        },
        {
          type: "heading",
          text: "DenseNet: Feature Reuse at a Memory Cost",
          level: 2
        },
        {
          type: "text",
          text: "DenseNet (2017) took skip connections to the extreme: every layer receives feature maps from ALL preceding layers via concatenation (not addition). In a dense block with L layers, there are L(L+1)/2 connections. Each layer produces k feature maps (the growth rate), so after L layers the channel count is k_0 + L*k. A typical growth rate k=32 means after 12 layers you have k_0 + 384 channels. This encourages feature reuse — later layers can directly access low-level features without them being washed out through multiple transformations. DenseNet-121 achieves similar accuracy to ResNet-200 with only 8M parameters versus 64M."
        },
        {
          type: "text",
          text: "The memory cost is the catch. Because every layer's output must be kept alive for all subsequent layers in the block, DenseNet's memory consumption during training is substantially higher than ResNet. The intermediate feature maps cannot be freed until the entire dense block completes. Transition layers between dense blocks (1x1 conv + 2x2 average pooling) compress channels by a factor theta (typically 0.5) to keep the model tractable. In production, DenseNet is rarely chosen over ResNet for edge deployment due to the memory overhead and the difficulty of optimizing concatenation-heavy graphs on NPUs."
        },
        {
          type: "heading",
          text: "MobileNetV1/V2: Depthwise Separable Convolutions",
          level: 2
        },
        {
          type: "text",
          text: "MobileNet (2017) was designed from the ground up for mobile inference. Its core building block is the depthwise separable convolution, which factorizes a standard convolution into two steps: (1) a depthwise convolution that applies a single filter per input channel, and (2) a pointwise 1x1 convolution that mixes channels. A standard convolution with kernel K, C_in input channels, and C_out output channels requires C_in * C_out * K * K multiply-accumulate operations per spatial position. A depthwise separable convolution requires C_in * K * K (depthwise) + C_in * C_out (pointwise) = C_in * (K*K + C_out). The ratio of computation is (K*K + C_out) / (C_out * K*K). For K=3 and C_out=256, this is (9 + 256)/(256 * 9) = 265/2304 = 0.115 — an 8.7x reduction."
        },
        {
          type: "text",
          text: "MobileNetV2 (2018) introduced two critical improvements. First, inverted residuals: instead of the bottleneck block that reduces dimensions (wide → narrow → wide as in ResNet), MobileNetV2 expands dimensions (narrow → wide → narrow). The rationale is that depthwise convolutions operate on individual channels and cannot mix information across channels, so they need more channels to work with. The expansion factor t (typically 6) expands the bottleneck. Second, linear bottlenecks: the last layer of each block uses no activation function. The insight is that ReLU in a low-dimensional space destroys information (it zeros out negative values in a space with few dimensions, losing a significant fraction of the representational capacity). Keeping the bottleneck linear preserves information for the skip connection."
        },
        {
          type: "diagram",
          code: `Depthwise Separable Convolution Decomposition:

  Standard Conv: C_in=64, C_out=128, K=3
  ┌─────────────────────────────────────────┐
  │  64 input channels × 128 filters × 3×3  │
  │  Parameters: 64 × 128 × 3 × 3 = 73,728  │
  │  FLOPs per pixel: 73,728 MACs            │
  └─────────────────────────────────────────┘

  Depthwise Separable Conv:
  Step 1: Depthwise (one 3x3 filter per channel)
  ┌─────────────────────────────────────────┐
  │  64 channels × 1 filter × 3×3           │
  │  Parameters: 64 × 1 × 3 × 3 = 576       │
  └─────────────────────────────────────────┘
           ↓
  Step 2: Pointwise (1x1 conv to mix channels)
  ┌─────────────────────────────────────────┐
  │  64 input × 128 output × 1×1            │
  │  Parameters: 64 × 128 × 1 × 1 = 8,192   │
  └─────────────────────────────────────────┘

  Total: 576 + 8,192 = 8,768 params
  Reduction: 73,728 / 8,768 = 8.4x fewer

  MobileNetV2 Inverted Residual:
  ┌──────┐    ┌──────────┐    ┌──────────┐    ┌──────┐
  │ C=24 │──→ │1x1 expand│──→ │3x3 DWConv│──→ │1x1   │──→ C=24
  │      │    │ C=144    │    │ C=144    │    │linear│
  └──┬───┘    │ +ReLU6   │    │ +ReLU6   │    │no act│
     │        └──────────┘    └──────────┘    └──┬───┘
     └────────────── skip connection ────────────┘
              (narrow → wide → narrow)`
        },
        {
          type: "heading",
          text: "EfficientNet: Compound Scaling",
          level: 2
        },
        {
          type: "text",
          text: "EfficientNet (2019) observed that prior architectures scaled only one dimension at a time: deeper (ResNet-18 to ResNet-152), wider (WideResNet), or higher resolution (input size 224 to 331). Scaling all three dimensions together with fixed ratios — compound scaling — is provably better. The EfficientNet scaling rule uses a compound coefficient phi: depth d = alpha^phi, width w = beta^phi, resolution r = gamma^phi, subject to alpha * beta^2 * gamma^2 approximately equal to 2 (so that FLOPs roughly double when phi increases by 1). Alpha, beta, and gamma are found by grid search on the base model; for EfficientNet the values are alpha=1.2, beta=1.1, gamma=1.15."
        },
        {
          type: "text",
          text: "The base model EfficientNet-B0 was found using Neural Architecture Search (NAS) with a MobileNetV2-like search space. It uses Mobile Inverted Bottleneck Conv (MBConv) blocks with squeeze-and-excitation. Scaling from B0 to B7 using the compound coefficient, EfficientNet-B7 achieves 84.3% top-1 ImageNet accuracy with 66M parameters and 37B FLOPs — compared to GPipe with 84.3% accuracy but 557M parameters. For edge deployment, EfficientNet-Lite variants remove squeeze-and-excitation (not well supported on many NPUs) and use ReLU6 instead of SiLU/Swish."
        },
        {
          type: "comparison",
          headers: ["Architecture", "Year", "Params (M)", "FLOPs (G)", "Top-1 Acc (%)", "Edge Suitable"],
          rows: [
            ["LeNet-5", "1998", "0.06", "0.004", "99.2 (MNIST)", "Yes (trivial)"],
            ["AlexNet", "2012", "60", "0.72", "56.5", "No (FC heavy)"],
            ["VGG-16", "2014", "138", "15.5", "71.5", "No (too large)"],
            ["GoogLeNet", "2014", "6.8", "1.5", "69.8", "Marginal"],
            ["ResNet-50", "2015", "25.6", "4.1", "76.1", "GPU only"],
            ["DenseNet-121", "2017", "8.0", "2.9", "74.4", "No (concat heavy)"],
            ["MobileNetV1", "2017", "4.2", "0.57", "70.6", "Yes"],
            ["MobileNetV2", "2018", "3.4", "0.30", "72.0", "Yes (best NPU)"],
            ["EfficientNet-B0", "2019", "5.3", "0.39", "77.1", "Yes (GPU/NPU)"],
            ["EfficientNet-B4", "2019", "19", "4.2", "82.9", "GPU only"],
            ["EfficientNet-Lite0", "2020", "4.7", "0.39", "75.1", "Yes (NPU optimized)"]
          ]
        },
        {
          type: "heading",
          text: "Implementation: Depthwise Separable Conv from Scratch",
          level: 2
        },
        {
          type: "text",
          text: "Understanding the implementation details matters when debugging quantization issues or writing custom CUDA kernels. Below is a from-scratch implementation of depthwise separable convolution that explicitly separates the two phases — no nn.Conv2d groups trick. This helps you see exactly what the depthwise and pointwise steps compute."
        },
        {
          type: "code",
          lang: "python",
          filename: "depthwise_separable_scratch.py",
          desc: "Manual depthwise separable convolution implementation with parameter counting",
          code: `import torch
import torch.nn as nn
import torch.nn.functional as F


class DepthwiseConv2d(nn.Module):
    """Depthwise conv: one filter per input channel, no cross-channel mixing."""

    def __init__(self, in_channels, kernel_size, stride=1, padding=0, bias=False):
        super().__init__()
        self.in_channels = in_channels
        self.kernel_size = kernel_size
        self.stride = stride
        self.padding = padding

        # One K x K filter per input channel: shape (C_in, 1, K, K)
        self.weight = nn.Parameter(
            torch.randn(in_channels, 1, kernel_size, kernel_size) * 0.01
        )
        self.bias = nn.Parameter(torch.zeros(in_channels)) if bias else None

    def forward(self, x):
        # x: (B, C_in, H, W)
        B, C, H, W = x.shape
        assert C == self.in_channels

        # Unfold input into sliding windows
        # Output shape: (B, C*K*K, H_out*W_out)
        x_unfold = F.unfold(
            x,
            kernel_size=self.kernel_size,
            stride=self.stride,
            padding=self.padding
        )

        H_out = (H + 2 * self.padding - self.kernel_size) // self.stride + 1
        W_out = (W + 2 * self.padding - self.kernel_size) // self.stride + 1

        # Reshape to (B, C, K*K, H_out*W_out)
        x_unfold = x_unfold.view(B, C, self.kernel_size * self.kernel_size, -1)

        # Weight: (C, 1, K, K) -> (C, K*K)
        w = self.weight.view(self.in_channels, -1)  # (C, K*K)

        # Per-channel dot product: (B, C, K*K, L) x (C, K*K) -> (B, C, L)
        # einsum: for each batch, channel: dot product of K*K window with K*K filter
        out = torch.einsum("bckl,ck->bcl", x_unfold, w)

        if self.bias is not None:
            out = out + self.bias.view(1, -1, 1)

        return out.view(B, C, H_out, W_out)


class PointwiseConv2d(nn.Module):
    """Pointwise (1x1) conv: mixes channels at each spatial position."""

    def __init__(self, in_channels, out_channels, bias=False):
        super().__init__()
        self.weight = nn.Parameter(
            torch.randn(out_channels, in_channels) * (2.0 / in_channels) ** 0.5
        )
        self.bias = nn.Parameter(torch.zeros(out_channels)) if bias else None

    def forward(self, x):
        # x: (B, C_in, H, W) -> treat as (B, C_in, H*W)
        B, C_in, H, W = x.shape
        x_flat = x.view(B, C_in, -1)  # (B, C_in, H*W)

        # Matrix multiply: (C_out, C_in) x (B, C_in, H*W) -> (B, C_out, H*W)
        out = torch.einsum("oi,bil->bol", self.weight, x_flat)

        if self.bias is not None:
            out = out + self.bias.view(1, -1, 1)

        return out.view(B, -1, H, W)


class DepthwiseSeparableConv(nn.Module):
    """Full depthwise separable convolution: DW + PW + BN + activation."""

    def __init__(self, in_ch, out_ch, kernel_size=3, stride=1, padding=1):
        super().__init__()
        self.dw = DepthwiseConv2d(in_ch, kernel_size, stride, padding)
        self.bn1 = nn.BatchNorm2d(in_ch)
        self.pw = PointwiseConv2d(in_ch, out_ch)
        self.bn2 = nn.BatchNorm2d(out_ch)
        self.act = nn.ReLU6(inplace=True)

    def forward(self, x):
        x = self.act(self.bn1(self.dw(x)))
        x = self.act(self.bn2(self.pw(x)))
        return x


def count_parameters(in_ch, out_ch, k=3):
    """Compare parameter counts: standard vs depthwise separable."""
    standard = in_ch * out_ch * k * k
    dw = in_ch * k * k
    pw = in_ch * out_ch
    sep = dw + pw
    ratio = standard / sep

    print(f"Standard Conv: {in_ch}->{out_ch}, {k}x{k}")
    print(f"  Parameters: {standard:,}")
    print(f"Depthwise Separable:")
    print(f"  DW params:  {dw:,}")
    print(f"  PW params:  {pw:,}")
    print(f"  Total:      {sep:,}")
    print(f"  Reduction:  {ratio:.1f}x fewer parameters")
    print()


if __name__ == "__main__":
    # Parameter comparison
    count_parameters(64, 128, k=3)
    count_parameters(128, 256, k=3)
    count_parameters(256, 512, k=3)

    # Verify forward pass
    dsc = DepthwiseSeparableConv(64, 128)
    x = torch.randn(2, 64, 56, 56)
    out = dsc(x)
    print(f"Input:  {x.shape}")
    print(f"Output: {out.shape}")
    print(f"DSC total params: {sum(p.numel() for p in dsc.parameters()):,}")`
        },
        {
          type: "callout",
          variant: "tip",
          title: "Production Note: Use nn.Conv2d(groups=C_in) in Practice",
          text: "The manual implementation above is for understanding. In production, use nn.Conv2d(in_channels=C, out_channels=C, kernel_size=3, groups=C) for the depthwise step. PyTorch and ONNX Runtime have optimized kernels for grouped convolutions that are significantly faster than any manual implementation. The manual version matters when you need to understand what happens during quantization or when writing custom TensorRT plugins."
        },
        {
          type: "text",
          text: "The evolution from LeNet to EfficientNet shows a clear trend: reducing redundant computation while preserving or improving representational power. LeNet used full convolutions naively. VGG showed small kernels are better. Inception added multi-scale. ResNet added skip connections. MobileNet factorized convolutions. EfficientNet found the optimal scaling strategy. For edge deployment, MobileNetV2 remains the most NPU-friendly backbone, while EfficientNet-Lite offers the best accuracy-latency tradeoff when GPU inference is available. Your architecture choice should be driven by your target hardware's operation support, not just parameter count."
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 5 — Feature Pyramid Networks, Multi-Scale Detection & Attention
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "fpn-multiscale-attention",
      title: "Feature Pyramid Networks, Multi-Scale Detection & Attention",
      readTime: "14 min",
      content: [
        {
          type: "text",
          text: "Object detection must handle objects at vastly different scales within the same image. A security camera frame might contain a person filling 80% of the image and a license plate occupying 0.5%. Early detectors like Faster R-CNN extracted features from a single layer, which meant small objects were represented by very few pixels in the feature map — often just 2x2 or even 1x1 regions after downsampling. Feature Pyramid Networks solved this by constructing a multi-scale feature representation that preserves both high-resolution spatial detail and deep semantic information. Understanding FPN is non-negotiable for production detection systems: it is the backbone of nearly every modern detector including EfficientDet, YOLO variants, and DETR."
        },
        {
          type: "callout",
          variant: "info",
          title: "Scale Challenge in Numbers",
          text: "In COCO dataset, objects range from 32x32 pixels ('small') to 96x96+ ('large'). After a typical backbone with stride 32, a 32x32 object becomes a single pixel in the deepest feature map. FPN provides feature maps at strides 4, 8, 16, and 32 (P2-P5), so that same 32x32 object gets an 8x8 representation at P3 — enough for reliable detection. Without FPN, small-object AP drops by 10-15 points on COCO."
        },
        {
          type: "heading",
          text: "Why Multi-Scale Feature Extraction Matters",
          level: 2
        },
        {
          type: "text",
          text: "A CNN backbone produces a hierarchy of feature maps. Early layers (after 1-2 downsampling steps) have high spatial resolution but low semantic meaning — they detect edges, textures, and simple patterns. Deep layers have low spatial resolution but rich semantics — they represent object parts and full objects. The fundamental tension is: small object detection needs high-resolution features (because small objects disappear at low resolution), but also needs semantic features (because you need to know what the object IS, not just that edges exist). Using only the deepest layer misses small objects. Using only early layers misses semantic context. FPN solves this by combining both."
        },
        {
          type: "heading",
          text: "FPN Architecture: Top-Down Pathway + Lateral Connections",
          level: 2
        },
        {
          type: "text",
          text: "FPN augments a standard CNN backbone (ResNet, MobileNet, etc.) with a top-down pathway and lateral connections. The bottom-up pathway is just the backbone itself, producing feature maps C2, C3, C4, C5 at strides 4, 8, 16, 32 respectively. The top-down pathway starts from the deepest feature map (C5) and progressively upsamples it by 2x using nearest-neighbor interpolation. At each level, a lateral connection takes the corresponding bottom-up feature map, applies a 1x1 convolution to reduce it to 256 channels, and adds it element-wise to the upsampled top-down feature. A final 3x3 convolution on each merged map produces the output feature pyramid P2, P3, P4, P5. Each P_i has 256 channels regardless of the backbone channel dimensions at that level."
        },
        {
          type: "diagram",
          code: `Feature Pyramid Network (FPN) Architecture:

  Bottom-Up (Backbone)          Top-Down + Lateral          Output Pyramid
  ┌──────────────────┐
  │ C2: 256ch, /4    │────→ [1x1 conv, 256] ──(+)──→ [3x3 conv] ──→ P2 (stride 4)
  └────────┬─────────┘                          ↑
           ↓                                  2x upsample
  ┌──────────────────┐                          │
  │ C3: 512ch, /8    │────→ [1x1 conv, 256] ──(+)──→ [3x3 conv] ──→ P3 (stride 8)
  └────────┬─────────┘                          ↑
           ↓                                  2x upsample
  ┌──────────────────┐                          │
  │ C4: 1024ch, /16  │────→ [1x1 conv, 256] ──(+)──→ [3x3 conv] ──→ P4 (stride 16)
  └────────┬─────────┘                          ↑
           ↓                                  2x upsample
  ┌──────────────────┐                          │
  │ C5: 2048ch, /32  │────→ [1x1 conv, 256] ──────→ [3x3 conv] ──→ P5 (stride 32)
  └──────────────────┘

  Object Assignment to FPN Levels:
  ┌──────────────────────────────────────────────────┐
  │  k = floor(k0 + log2(sqrt(wh) / 224))           │
  │  k0 = 4 (baseline level for 224x224 objects)     │
  │                                                  │
  │  Object 32x32   → k = 4 + log2(32/224) = ~2 → P2│
  │  Object 128x128 → k = 4 + log2(128/224) = ~3 → P3│
  │  Object 300x300 → k = 4 + log2(300/224) = ~4 → P4│
  └──────────────────────────────────────────────────┘`
        },
        {
          type: "heading",
          text: "PANet: Bottom-Up Path Augmentation",
          level: 2
        },
        {
          type: "text",
          text: "Path Aggregation Network (PANet, 2018) observed that FPN's top-down pathway means information from low-level features must traverse many layers to reach P5. While the lateral connections help, the path from C2's fine-grained spatial information to P5 is indirect. PANet adds a second bottom-up pathway after FPN: starting from P2, it downsamples through 3x3 convolutions with stride 2, adding lateral connections from the corresponding FPN level at each step, producing N2-N5. This creates a shortcut for low-level features to reach higher pyramid levels. PANet improves small-object detection by 1-2 AP points on COCO with modest computational overhead."
        },
        {
          type: "heading",
          text: "BiFPN: Weighted Bidirectional Feature Fusion",
          level: 2
        },
        {
          type: "text",
          text: "BiFPN (Bidirectional Feature Pyramid Network, from EfficientDet 2020) makes two key improvements over PANet. First, it removes nodes that have only one input edge — these contribute nothing since they have no fusion to perform. Second, it adds learnable weights to each input of a fusion node. Instead of equal-weight addition, BiFPN computes a weighted sum: O = sum(w_i * I_i) / (epsilon + sum(w_i)), where w_i are learnable scalars passed through a fast normalization (ReLU + normalize, not softmax, for speed). This allows the network to learn which feature levels contribute most to each output level. BiFPN can be stacked multiple times (EfficientDet uses 3-7 repetitions depending on the model size) with shared weights across repetitions."
        },
        {
          type: "heading",
          text: "Attention Mechanisms in Vision",
          level: 2
        },
        {
          type: "text",
          text: "Attention in CNNs allows the network to dynamically re-weight features based on the input itself, rather than applying static learned filters. There are two main types: channel attention (which features/channels matter?) and spatial attention (which spatial locations matter?). The simplest and most edge-friendly attention is the Squeeze-and-Excitation (SE) block."
        },
        {
          type: "heading",
          text: "SE Block: Squeeze-and-Excitation",
          level: 3
        },
        {
          type: "text",
          text: "The SE block (2018) recalibrates channel-wise feature responses in three steps: (1) Squeeze: global average pooling reduces each channel to a single scalar, producing a C-dimensional vector. (2) Excitation: two fully connected layers (C -> C/r -> C, where r is the reduction ratio, typically 16) with ReLU and sigmoid produce per-channel attention weights between 0 and 1. (3) Scale: the original feature map is multiplied channel-wise by these weights. The computational cost is negligible: 2*C*C/r parameters and 2*C*C/r FLOPs per spatial position — but it adds a global average pooling + FC path that some NPUs cannot accelerate."
        },
        {
          type: "diagram",
          code: `Squeeze-and-Excitation (SE) Block:

  Input: X (B, C, H, W)
       │
       ├──────────────────────────────────┐
       │                                  │
       ↓                                  │
  ┌──────────────────┐                    │
  │ Global Avg Pool  │ "Squeeze"          │
  │ (B,C,H,W)→(B,C) │                    │
  └────────┬─────────┘                    │
           ↓                              │
  ┌──────────────────┐                    │
  │ FC: C → C/r      │                    │
  │ + ReLU           │ "Excitation"       │
  └────────┬─────────┘                    │
           ↓                              │
  ┌──────────────────┐                    │
  │ FC: C/r → C      │                    │
  │ + Sigmoid        │                    │
  └────────┬─────────┘                    │
           ↓                              │
  ┌──────────────────┐                    │
  │ Scale: s * X     │ ←──── element-wise │
  │ (B,C,1,1)*(B,C,H,W)     multiply     │
  └──────────────────┘

  CBAM (Channel + Spatial):
  ┌────────────────────────────────────────┐
  │ Input → ChannelAttn → SpatialAttn → Out│
  │                                        │
  │ ChannelAttn: GAP + GMP → shared MLP    │
  │              → sigmoid → scale         │
  │                                        │
  │ SpatialAttn: concat(avgpool, maxpool)  │
  │              → 7x7 conv → sigmoid      │
  │              → scale                   │
  └────────────────────────────────────────┘`
        },
        {
          type: "heading",
          text: "CBAM and Self-Attention in Vision",
          level: 2
        },
        {
          type: "text",
          text: "CBAM (Convolutional Block Attention Module, 2018) extends SE by adding spatial attention. After channel attention (similar to SE but using both max-pool and average-pool), CBAM applies spatial attention: it computes channel-wise max and average across the channel dimension, concatenates them into a 2-channel tensor, applies a 7x7 convolution to produce a spatial attention map, and multiplies it with the feature map. Self-attention in Vision Transformers (ViT) is fundamentally different: it computes attention between every pair of spatial positions (patches), enabling global receptive fields in a single layer. However, self-attention has O(N^2) complexity where N is the number of patches, making it expensive for high-resolution inputs. Swin Transformer uses window-based attention to reduce this to O(N)."
        },
        {
          type: "callout",
          variant: "warning",
          title: "Attention on Edge: Proceed with Caution",
          text: "SE blocks add ~0.5-2% accuracy on ImageNet with minimal FLOPs, but the global average pooling + FC layers cause graph partitioning on many NPUs (Edge TPU, Hexagon DSP). EfficientNet-Lite removes SE blocks specifically for this reason. CBAM's spatial attention adds a 7x7 convolution — typically NPU-friendly — but the channel-wise pooling operations may not be. Full self-attention (ViT-style) is impractical on most edge NPUs due to the dynamic attention matrix computation. For edge deployment: use SE only if your target NPU supports it; prefer CBAM's spatial attention component over channel attention if you must choose one; avoid full self-attention unless you have a capable GPU."
        },
        {
          type: "heading",
          text: "Implementation: FPN and SE Block in PyTorch",
          level: 2
        },
        {
          type: "code",
          lang: "python",
          filename: "fpn_and_se.py",
          desc: "Production-ready FPN and SE block implementations",
          code: `import torch
import torch.nn as nn
import torch.nn.functional as F
from typing import Dict, List


class FPN(nn.Module):
    """Feature Pyramid Network for multi-scale feature extraction.

    Takes backbone feature maps at different strides and produces
    a pyramid of features all with the same channel dimension.
    """

    def __init__(
        self,
        in_channels_list: List[int],  # e.g., [256, 512, 1024, 2048] for ResNet
        out_channels: int = 256,
    ):
        super().__init__()
        self.out_channels = out_channels

        # Lateral connections: 1x1 conv to match channel dimensions
        self.lateral_convs = nn.ModuleList()
        # Output convolutions: 3x3 conv to reduce aliasing from upsampling
        self.output_convs = nn.ModuleList()

        for in_ch in in_channels_list:
            self.lateral_convs.append(
                nn.Conv2d(in_ch, out_channels, kernel_size=1)
            )
            self.output_convs.append(
                nn.Conv2d(out_channels, out_channels, kernel_size=3, padding=1)
            )

        # Initialize weights
        for m in self.modules():
            if isinstance(m, nn.Conv2d):
                nn.init.kaiming_uniform_(m.weight, a=1)
                if m.bias is not None:
                    nn.init.constant_(m.bias, 0)

    def forward(self, features: Dict[str, torch.Tensor]) -> Dict[str, torch.Tensor]:
        """
        Args:
            features: dict with keys like 'c2','c3','c4','c5'
                      values are tensors at increasing strides

        Returns:
            dict with keys 'p2','p3','p4','p5' — the feature pyramid
        """
        keys = sorted(features.keys())  # ['c2', 'c3', 'c4', 'c5']
        feature_list = [features[k] for k in keys]

        # Build top-down pathway
        # Start from the deepest (last) feature map
        laterals = [
            lat_conv(feat)
            for lat_conv, feat in zip(self.lateral_convs, feature_list)
        ]

        # Top-down: add upsampled deeper features to shallower features
        for i in range(len(laterals) - 1, 0, -1):
            upsampled = F.interpolate(
                laterals[i],
                size=laterals[i - 1].shape[-2:],
                mode="nearest"
            )
            laterals[i - 1] = laterals[i - 1] + upsampled

        # Apply output convolutions to reduce aliasing
        outputs = {
            f"p{i+2}": out_conv(lat)
            for i, (out_conv, lat) in enumerate(
                zip(self.output_convs, laterals)
            )
        }

        return outputs


class SEBlock(nn.Module):
    """Squeeze-and-Excitation block for channel attention.

    Recalibrates channel-wise feature responses by learning
    per-channel importance weights.
    """

    def __init__(self, channels: int, reduction: int = 16):
        super().__init__()
        mid = max(channels // reduction, 8)  # minimum 8 hidden units
        self.squeeze = nn.AdaptiveAvgPool2d(1)
        self.excitation = nn.Sequential(
            nn.Linear(channels, mid, bias=False),
            nn.ReLU(inplace=True),
            nn.Linear(mid, channels, bias=False),
            nn.Sigmoid()
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        B, C, _, _ = x.shape
        # Squeeze: (B, C, H, W) -> (B, C)
        s = self.squeeze(x).view(B, C)
        # Excitation: (B, C) -> (B, C) attention weights
        s = self.excitation(s).view(B, C, 1, 1)
        # Scale: multiply input by attention weights
        return x * s


class MBConvWithSE(nn.Module):
    """Mobile Inverted Bottleneck Conv with SE attention.

    Used in EfficientNet: expand -> depthwise -> SE -> project.
    """

    def __init__(
        self,
        in_ch: int,
        out_ch: int,
        expand_ratio: int = 6,
        kernel_size: int = 3,
        stride: int = 1,
        se_ratio: float = 0.25,
    ):
        super().__init__()
        mid_ch = in_ch * expand_ratio
        self.use_residual = (stride == 1 and in_ch == out_ch)

        layers = []
        # Expand phase (skip if expand_ratio == 1)
        if expand_ratio != 1:
            layers.extend([
                nn.Conv2d(in_ch, mid_ch, 1, bias=False),
                nn.BatchNorm2d(mid_ch),
                nn.SiLU(inplace=True),
            ])

        # Depthwise conv
        pad = (kernel_size - 1) // 2
        layers.extend([
            nn.Conv2d(mid_ch, mid_ch, kernel_size, stride, pad,
                      groups=mid_ch, bias=False),
            nn.BatchNorm2d(mid_ch),
            nn.SiLU(inplace=True),
        ])
        self.conv = nn.Sequential(*layers)

        # SE attention on expanded channels
        se_channels = max(1, int(in_ch * se_ratio))
        self.se = nn.Sequential(
            nn.AdaptiveAvgPool2d(1),
            nn.Flatten(),
            nn.Linear(mid_ch, se_channels, bias=False),
            nn.SiLU(inplace=True),
            nn.Linear(se_channels, mid_ch, bias=False),
            nn.Sigmoid(),
        )

        # Project phase (linear bottleneck — no activation)
        self.project = nn.Sequential(
            nn.Conv2d(mid_ch, out_ch, 1, bias=False),
            nn.BatchNorm2d(out_ch),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        residual = x
        out = self.conv(x)

        # SE attention
        B, C, _, _ = out.shape
        se_weight = self.se(out).view(B, C, 1, 1)
        out = out * se_weight

        out = self.project(out)

        if self.use_residual:
            out = out + residual
        return out


# ── Demo ──────────────────────────────────────────────────────────────
if __name__ == "__main__":
    # Simulate ResNet backbone outputs
    batch = 2
    features = {
        "c2": torch.randn(batch, 256, 56, 56),   # stride 4
        "c3": torch.randn(batch, 512, 28, 28),   # stride 8
        "c4": torch.randn(batch, 1024, 14, 14),  # stride 16
        "c5": torch.randn(batch, 2048, 7, 7),    # stride 32
    }

    fpn = FPN(in_channels_list=[256, 512, 1024, 2048], out_channels=256)
    pyramid = fpn(features)

    print("FPN Output Shapes:")
    for k, v in sorted(pyramid.items()):
        print(f"  {k}: {v.shape}")

    fpn_params = sum(p.numel() for p in fpn.parameters())
    print(f"  FPN parameters: {fpn_params:,}")

    # SE block
    se = SEBlock(channels=512, reduction=16)
    x = torch.randn(2, 512, 14, 14)
    out = se(x)
    print(f"\\nSE Block: {x.shape} -> {out.shape}")
    se_params = sum(p.numel() for p in se.parameters())
    print(f"  SE parameters: {se_params:,}")

    # MBConv with SE
    mbconv = MBConvWithSE(in_ch=24, out_ch=24, expand_ratio=6)
    x = torch.randn(2, 24, 56, 56)
    out = mbconv(x)
    print(f"\\nMBConvSE: {x.shape} -> {out.shape}")
    mb_params = sum(p.numel() for p in mbconv.parameters())
    print(f"  MBConvSE parameters: {mb_params:,}")`
        },
        {
          type: "comparison",
          headers: ["Feature Fusion", "Mechanism", "Params Overhead", "NPU Friendly", "AP Gain (COCO)"],
          rows: [
            ["FPN", "Top-down + lateral add", "~2M (256ch)", "Yes", "Baseline"],
            ["PANet", "FPN + bottom-up add", "~4M", "Yes", "+1.0-1.5 AP"],
            ["BiFPN", "Weighted bidirectional", "~4M (shared)", "Mostly", "+1.5-2.0 AP"],
            ["NAS-FPN", "NAS-searched topology", "Variable", "Depends", "+1.5 AP"],
            ["SE Block", "Channel attention", "~0.01M per block", "No (GAP+FC)", "+0.5-1.0 top-1"],
            ["CBAM", "Channel + spatial attn", "~0.02M per block", "Partial", "+0.7-1.2 top-1"],
            ["Self-Attention (ViT)", "Global patch attention", "O(N^2)", "No", "Architecture-dependent"]
          ]
        },
        {
          type: "text",
          text: "Summary: FPN is the foundational building block for multi-scale detection — it is computationally cheap, NPU-friendly, and provides the multi-resolution feature maps that detection heads require. PANet and BiFPN offer incremental improvements at modest cost. For attention, SE blocks provide the best accuracy-per-FLOP ratio but risk NPU incompatibility; use them only when your deployment target supports global pooling + FC in the accelerated graph. For edge production systems, a MobileNetV2 backbone with standard FPN (no SE) remains the most reliably optimized configuration across hardware targets."
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 6 — Transfer Learning, Data Augmentation & Loss Functions
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "transfer-learning-augmentation-losses",
      title: "Transfer Learning, Data Augmentation & Loss Functions for Vision",
      readTime: "14 min",
      content: [
        {
          type: "text",
          text: "Training a vision model from scratch is almost never the right choice in production. ImageNet-pretrained backbones encode a rich hierarchy of visual features — edges, textures, parts, objects — that transfer remarkably well to new domains. The critical decisions are: how much of the pretrained model to freeze, how to schedule learning rates across layer groups, and when pretrained features actually fail (domain shift). Equally important are data augmentation strategies that can 2-5x your effective dataset size without collecting new data, and loss function choices that determine whether your model handles class imbalance, localizes precisely, or reads text accurately."
        },
        {
          type: "callout",
          variant: "info",
          title: "The Transfer Learning Default",
          text: "In 2024+, training from scratch is justified only when: (1) your data distribution is radically different from ImageNet (e.g., medical histopathology, radio spectrograms), (2) you have 10M+ labeled samples, or (3) you need an architecture fundamentally different from standard CNNs/ViTs. For everything else — and especially for edge deployment where model size is constrained — start with a pretrained backbone and fine-tune."
        },
        {
          type: "heading",
          text: "Transfer Learning Strategies",
          level: 2
        },
        {
          type: "text",
          text: "Feature extraction means freezing the entire backbone and only training a new classification head. This is the safest approach when you have very little data (hundreds of images) because the pretrained features are so much better than anything you could learn from a small dataset. It is also the fastest to train since gradients do not flow through the backbone. Fine-tuning means unfreezing some or all backbone layers and training them with a small learning rate. This adapts the pretrained features to your specific domain. The standard practice is differential learning rates: the backbone gets 10-100x smaller learning rate than the head."
        },
        {
          type: "text",
          text: "Progressive unfreezing (also called gradual unfreezing, popularized by ULMFiT and fast.ai) starts with only the head trainable, then unfreezes one layer group at a time from top to bottom over several epochs. The intuition: deeper layers contain more general features (edges, textures) that need less adaptation, while shallower layers near the head contain more task-specific features that should be adapted first. A practical schedule for a ResNet-50: epochs 1-3 train only the head, epochs 4-6 unfreeze layer4, epochs 7-9 unfreeze layer3, epochs 10+ unfreeze everything. Each newly unfrozen group starts with a learning rate 10x smaller than the group above it."
        },
        {
          type: "comparison",
          headers: ["Strategy", "When to Use", "Data Required", "Training Time", "Risk"],
          rows: [
            ["Feature Extraction", "Very small dataset, domain similar to ImageNet", "100-1K images", "Minutes", "Underfitting (features may not match domain)"],
            ["Fine-tune Last Block", "Small dataset, moderate domain shift", "1K-10K images", "Hours", "Low overfitting risk"],
            ["Progressive Unfreezing", "Medium dataset, need careful adaptation", "5K-50K images", "Hours-Days", "Minimal (controlled exposure)"],
            ["Full Fine-tuning", "Large dataset, significant domain shift", "50K+ images", "Days", "Catastrophic forgetting if LR too high"],
            ["Train from Scratch", "Massive dataset, radically different domain", "1M+ images", "Weeks", "May underperform transfer with less data"]
          ]
        },
        {
          type: "heading",
          text: "Domain Shift: When Pretrained Features Fail",
          level: 2
        },
        {
          type: "text",
          text: "ImageNet features transfer well to natural image tasks (retail products, wildlife, vehicles) because the visual primitives are shared: edges, textures, shapes. But certain domains have fundamentally different visual statistics. Medical imaging (histopathology, X-rays, MRI) has different color distributions, texture patterns, and relevant features (staining patterns, tissue architecture). Satellite imagery has different scale, perspective (nadir view), and objects (rooftops, roads, vegetation indices). Industrial inspection (PCB defect detection, weld quality) often involves grayscale or near-infrared images with subtle defects invisible to ImageNet-trained features."
        },
        {
          type: "text",
          text: "For domain-shifted tasks, strategies include: (1) Use ImageNet features for early layers only (edges/textures still transfer) and train later layers from scratch. (2) Use domain-specific pretrained models when available — RadImageNet for radiology, SatCLIP for satellite imagery. (3) Self-supervised pretraining on your unlabeled domain data (SimCLR, DINO, MAE) before fine-tuning on labeled data. (4) For very alien domains (spectrograms, microscopy), consider training from scratch with strong augmentation and modern training recipes (longer schedules, stronger regularization). In practice, even for medical imaging, starting from ImageNet weights and fine-tuning with a low learning rate almost always beats training from scratch when you have fewer than 100K labeled images."
        },
        {
          type: "heading",
          text: "Data Augmentation: Geometric and Photometric Transforms",
          level: 2
        },
        {
          type: "text",
          text: "Data augmentation artificially expands your training set by applying random transformations that preserve semantic labels. For classification, a horizontally flipped cat is still a cat. For detection, you must also transform the bounding box coordinates. Augmentations fall into categories by their computational cost and when they apply."
        },
        {
          type: "text",
          text: "Geometric transforms modify spatial layout: random horizontal/vertical flip, rotation (typically +/- 15 degrees for natural images), scaling (0.8x to 1.2x), translation, affine transforms (shear), and perspective warping. These are train-time only and nearly free computationally. Photometric transforms modify pixel values: brightness, contrast, saturation, hue jitter, histogram equalization, and channel shuffling. These teach the model invariance to lighting conditions — critical for deployment where cameras vary. Both types should be applied with appropriate ranges: too aggressive augmentation (e.g., 90-degree rotation for face detection) can hurt by presenting unrealistic inputs."
        },
        {
          type: "heading",
          text: "Advanced Augmentation: Cutout, MixUp, CutMix, Mosaic",
          level: 2
        },
        {
          type: "text",
          text: "Cutout (2017) randomly masks a square region of the image with zeros or random noise. This forces the model to use non-local features — if part of a cat is masked, the model must recognize it from the remaining parts. It prevents over-reliance on any single discriminative region. MixUp (2018) creates new training samples by linearly interpolating between two images and their labels: x_new = lambda*x1 + (1-lambda)*x2, y_new = lambda*y1 + (1-lambda)*y2, where lambda is drawn from Beta(alpha, alpha) with alpha typically 0.2. This produces ghostly overlaid images that regularize the model's decision boundary."
        },
        {
          type: "text",
          text: "CutMix (2019) combines elements of both: it cuts a rectangular region from one image and pastes it onto another, with labels mixed proportionally to the area ratio. Unlike Cutout, no pixels are wasted on zeros — the masked region contains useful training signal from another image. Mosaic augmentation (2020, YOLOv4) takes this further: four images are resized and combined into a 2x2 grid, with random crop. This provides four different contexts in a single training image, dramatically improving small-object detection because objects appear at many different scales and positions. Mosaic is now standard in YOLO training pipelines."
        },
        {
          type: "comparison",
          headers: ["Augmentation", "Type", "Train-Time Only", "Compute Cost", "Edge Inference Cost", "Best For"],
          rows: [
            ["Horizontal Flip", "Geometric", "Yes", "Negligible", "None", "General (most tasks)"],
            ["Random Crop + Resize", "Geometric", "Yes", "Negligible", "None", "Classification, detection"],
            ["Color Jitter", "Photometric", "Yes", "Negligible", "None", "Varying lighting conditions"],
            ["Random Erasing/Cutout", "Occlusion", "Yes", "Negligible", "None", "Occlusion robustness"],
            ["MixUp", "Sample mixing", "Yes", "Negligible", "None", "Calibration, smooth boundaries"],
            ["CutMix", "Region mixing", "Yes", "Low", "None", "Classification (no wasted pixels)"],
            ["Mosaic", "Multi-image", "Yes", "Moderate", "None", "Detection (multi-scale)"],
            ["TTA (Test-Time Aug)", "Any geometric", "No (inference)", "2-10x", "2-10x latency", "Competition, not edge"],
            ["AutoAugment", "Learned policy", "Yes", "Low (after search)", "None", "When manual tuning fails"]
          ]
        },
        {
          type: "heading",
          text: "Loss Functions: Classification",
          level: 2
        },
        {
          type: "text",
          text: "Cross-entropy loss is the default for classification: L = -sum(y_i * log(p_i)) where y is one-hot and p is softmax output. For binary classification, binary cross-entropy (BCE) is used. Label smoothing replaces the hard one-hot target with (1-epsilon)*y + epsilon/K, where K is the number of classes and epsilon is typically 0.1. This prevents the model from becoming overconfident and improves calibration."
        },
        {
          type: "text",
          text: "Focal loss (2017, RetinaNet) addresses class imbalance in detection. In single-stage detectors, the vast majority of anchor boxes are background (easy negatives). Standard cross-entropy gives equal weight to all samples, so easy negatives dominate the gradient. Focal loss adds a modulating factor: FL(p_t) = -alpha_t * (1 - p_t)^gamma * log(p_t). When the model is confident (p_t is high for the correct class), (1-p_t)^gamma approaches zero, down-weighting easy examples. With gamma=2 (the default), a sample classified with 0.9 confidence gets 100x less loss than one classified with 0.5 confidence. Alpha balances positive/negative classes (typically 0.25 for positives)."
        },
        {
          type: "heading",
          text: "Loss Functions: Bounding Box Regression",
          level: 2
        },
        {
          type: "text",
          text: "L1 and Smooth-L1 losses on box coordinates (x, y, w, h) were the original approach but have a critical flaw: they treat each coordinate independently. Two predictions with the same L1 loss can have very different visual overlap (IoU) with the ground truth. IoU loss directly optimizes intersection over union: L_IoU = 1 - IoU. GIoU (Generalized IoU) adds a penalty for the area of the smallest enclosing box, handling the case where predicted and ground truth boxes do not overlap (where IoU is always 0). DIoU adds a distance penalty between box centers for faster convergence. CIoU adds aspect ratio consistency on top of DIoU."
        },
        {
          type: "text",
          text: "CIoU loss combines three geometric factors: L_CIoU = 1 - IoU + rho^2(b, b_gt)/c^2 + alpha*v, where rho is Euclidean distance between centers, c is the diagonal length of the smallest enclosing box, v = (4/pi^2) * (arctan(w_gt/h_gt) - arctan(w/h))^2 measures aspect ratio consistency, and alpha = v/((1-IoU) + v) is an adaptive weight. CIoU converges faster than GIoU and produces tighter boxes, making it the standard for modern detectors (YOLOv5+, EfficientDet). For edge deployment, the loss function choice does not affect inference cost — it only affects training."
        },
        {
          type: "heading",
          text: "CTC Loss for OCR",
          level: 2
        },
        {
          type: "text",
          text: "Connectionist Temporal Classification (CTC) loss is used when the alignment between input and output is unknown — the typical scenario in OCR and speech recognition. Given an input image of text, the model outputs a probability distribution over characters at each horizontal position. CTC marginalizes over all possible alignments: L_CTC = -log(sum over all valid alignments of product of per-position probabilities). A blank token allows the model to emit 'nothing' at positions between characters. CTC requires the output sequence to be shorter than the input sequence (always true for text recognition where each character spans multiple pixels). CTC runs only during training — at inference, a simple greedy decode (take argmax at each position, collapse repeats, remove blanks) is used."
        },
        {
          type: "heading",
          text: "Implementation: Focal Loss, CIoU Loss, and Mosaic Augmentation",
          level: 2
        },
        {
          type: "code",
          lang: "python",
          filename: "losses_and_augmentation.py",
          desc: "Production implementations of focal loss, CIoU loss, and Mosaic augmentation",
          code: `import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
import math
from typing import Tuple


class FocalLoss(nn.Module):
    """Focal Loss for addressing class imbalance in dense detection.

    FL(p_t) = -alpha_t * (1 - p_t)^gamma * log(p_t)

    With gamma=0, this reduces to standard cross-entropy.
    With gamma=2 (default), easy examples are down-weighted by up to 100x.
    """

    def __init__(
        self,
        alpha: float = 0.25,    # weight for positive class
        gamma: float = 2.0,     # focusing parameter
        reduction: str = "mean"
    ):
        super().__init__()
        self.alpha = alpha
        self.gamma = gamma
        self.reduction = reduction

    def forward(
        self, inputs: torch.Tensor, targets: torch.Tensor
    ) -> torch.Tensor:
        """
        Args:
            inputs: (N, C) raw logits (pre-sigmoid for binary, pre-softmax for multi)
            targets: (N,) integer class labels

        Returns:
            Scalar focal loss
        """
        # Compute standard cross-entropy (log-softmax + nll for numerical stability)
        ce_loss = F.cross_entropy(inputs, targets, reduction="none")

        # Get probability of the correct class
        p_t = torch.exp(-ce_loss)  # p_t = softmax prob of true class

        # Compute focal modulation factor
        focal_weight = (1.0 - p_t) ** self.gamma

        # Compute alpha weighting
        # alpha for positive class, (1-alpha) for negative classes
        if self.alpha is not None:
            alpha_t = torch.where(
                targets > 0,
                torch.tensor(self.alpha, device=inputs.device),
                torch.tensor(1.0 - self.alpha, device=inputs.device)
            )
            focal_weight = alpha_t * focal_weight

        loss = focal_weight * ce_loss

        if self.reduction == "mean":
            return loss.mean()
        elif self.reduction == "sum":
            return loss.sum()
        return loss


def box_iou(box1: torch.Tensor, box2: torch.Tensor) -> torch.Tensor:
    """Compute IoU between two sets of boxes in (x1, y1, x2, y2) format.

    Args:
        box1: (N, 4) predicted boxes
        box2: (N, 4) target boxes

    Returns:
        (N,) IoU values
    """
    inter_x1 = torch.max(box1[:, 0], box2[:, 0])
    inter_y1 = torch.max(box1[:, 1], box2[:, 1])
    inter_x2 = torch.min(box1[:, 2], box2[:, 2])
    inter_y2 = torch.min(box1[:, 3], box2[:, 3])

    inter_area = (inter_x2 - inter_x1).clamp(min=0) * \\
                 (inter_y2 - inter_y1).clamp(min=0)

    area1 = (box1[:, 2] - box1[:, 0]) * (box1[:, 3] - box1[:, 1])
    area2 = (box2[:, 2] - box2[:, 0]) * (box2[:, 3] - box2[:, 1])

    union = area1 + area2 - inter_area
    return inter_area / (union + 1e-7)


class CIoULoss(nn.Module):
    """Complete IoU Loss for bounding box regression.

    Combines three geometric factors:
    1. IoU overlap
    2. Center point distance (normalized by enclosing box diagonal)
    3. Aspect ratio consistency

    L_CIoU = 1 - IoU + distance_penalty + aspect_ratio_penalty
    """

    def __init__(self, reduction: str = "mean"):
        super().__init__()
        self.reduction = reduction

    def forward(
        self,
        pred: torch.Tensor,   # (N, 4) predicted boxes (x1, y1, x2, y2)
        target: torch.Tensor  # (N, 4) target boxes (x1, y1, x2, y2)
    ) -> torch.Tensor:
        # IoU
        iou = box_iou(pred, target)

        # Center points
        pred_cx = (pred[:, 0] + pred[:, 2]) / 2
        pred_cy = (pred[:, 1] + pred[:, 3]) / 2
        gt_cx = (target[:, 0] + target[:, 2]) / 2
        gt_cy = (target[:, 1] + target[:, 3]) / 2

        # Euclidean distance between centers squared
        rho2 = (pred_cx - gt_cx) ** 2 + (pred_cy - gt_cy) ** 2

        # Smallest enclosing box diagonal squared
        enclose_x1 = torch.min(pred[:, 0], target[:, 0])
        enclose_y1 = torch.min(pred[:, 1], target[:, 1])
        enclose_x2 = torch.max(pred[:, 2], target[:, 2])
        enclose_y2 = torch.max(pred[:, 3], target[:, 3])
        c2 = (enclose_x2 - enclose_x1) ** 2 + (enclose_y2 - enclose_y1) ** 2

        # Distance penalty
        distance_penalty = rho2 / (c2 + 1e-7)

        # Aspect ratio consistency
        pred_w = (pred[:, 2] - pred[:, 0]).clamp(min=1e-7)
        pred_h = (pred[:, 3] - pred[:, 1]).clamp(min=1e-7)
        gt_w = (target[:, 2] - target[:, 0]).clamp(min=1e-7)
        gt_h = (target[:, 3] - target[:, 1]).clamp(min=1e-7)

        v = (4.0 / (math.pi ** 2)) * (
            torch.atan(gt_w / gt_h) - torch.atan(pred_w / pred_h)
        ) ** 2

        # Adaptive weight for aspect ratio term
        with torch.no_grad():
            alpha = v / ((1 - iou) + v + 1e-7)

        # CIoU loss
        loss = 1.0 - iou + distance_penalty + alpha * v

        if self.reduction == "mean":
            return loss.mean()
        elif self.reduction == "sum":
            return loss.sum()
        return loss


def mosaic_augmentation(
    images: list,          # list of 4 numpy arrays (H, W, 3) uint8
    bboxes: list,          # list of 4 numpy arrays (N_i, 4) in xyxy format
    labels: list,          # list of 4 numpy arrays (N_i,) class IDs
    output_size: int = 640,
    min_offset: float = 0.25,
    max_offset: float = 0.75,
) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """YOLO-style Mosaic augmentation: combine 4 images into one.

    Places 4 images into a 2x2 grid with a random center point,
    concatenating all bounding boxes with adjusted coordinates.

    Args:
        images: 4 images as numpy arrays
        bboxes: 4 arrays of boxes in (x1, y1, x2, y2) format
        labels: 4 arrays of class labels
        output_size: size of the output image
        min_offset, max_offset: range for the mosaic center point

    Returns:
        (mosaic_image, mosaic_boxes, mosaic_labels)
    """
    assert len(images) == 4, "Mosaic requires exactly 4 images"
    s = output_size

    # Random center point for the mosaic
    cx = int(np.random.uniform(min_offset * s, max_offset * s))
    cy = int(np.random.uniform(min_offset * s, max_offset * s))

    mosaic = np.zeros((s, s, 3), dtype=np.uint8)
    all_boxes = []
    all_labels = []

    # Placement coordinates for each image in the mosaic
    # (x1_m, y1_m, x2_m, y2_m) — region in mosaic image
    placements = [
        (0, 0, cx, cy),             # top-left
        (cx, 0, s, cy),             # top-right
        (0, cy, cx, s),             # bottom-left
        (cx, cy, s, s),             # bottom-right
    ]

    for i, (img, boxes, lbls) in enumerate(zip(images, bboxes, labels)):
        x1_m, y1_m, x2_m, y2_m = placements[i]
        mw, mh = x2_m - x1_m, y2_m - y1_m

        if mw <= 0 or mh <= 0:
            continue

        h_img, w_img = img.shape[:2]

        # Resize image to fit the mosaic region
        import cv2
        resized = cv2.resize(img, (mw, mh))
        mosaic[y1_m:y2_m, x1_m:x2_m] = resized

        # Scale bounding boxes to the mosaic region
        if len(boxes) > 0:
            scaled = boxes.copy().astype(np.float32)
            scaled[:, 0] = scaled[:, 0] / w_img * mw + x1_m  # x1
            scaled[:, 1] = scaled[:, 1] / h_img * mh + y1_m  # y1
            scaled[:, 2] = scaled[:, 2] / w_img * mw + x1_m  # x2
            scaled[:, 3] = scaled[:, 3] / h_img * mh + y1_m  # y2

            # Clip to mosaic bounds
            scaled[:, 0] = np.clip(scaled[:, 0], 0, s)
            scaled[:, 1] = np.clip(scaled[:, 1], 0, s)
            scaled[:, 2] = np.clip(scaled[:, 2], 0, s)
            scaled[:, 3] = np.clip(scaled[:, 3], 0, s)

            # Filter out degenerate boxes (too small after clipping)
            valid = (scaled[:, 2] - scaled[:, 0] > 2) & \\
                    (scaled[:, 3] - scaled[:, 1] > 2)
            all_boxes.append(scaled[valid])
            all_labels.append(lbls[valid])

    if all_boxes:
        mosaic_boxes = np.concatenate(all_boxes, axis=0)
        mosaic_labels = np.concatenate(all_labels, axis=0)
    else:
        mosaic_boxes = np.zeros((0, 4), dtype=np.float32)
        mosaic_labels = np.zeros((0,), dtype=np.int64)

    return mosaic, mosaic_boxes, mosaic_labels


# ── Demo ──────────────────────────────────────────────────────────────
if __name__ == "__main__":
    # Focal Loss demo
    focal = FocalLoss(alpha=0.25, gamma=2.0)
    logits = torch.randn(16, 5)  # 16 samples, 5 classes
    targets = torch.randint(0, 5, (16,))
    fl = focal(logits, targets)
    ce = F.cross_entropy(logits, targets)
    print(f"Focal Loss:       {fl.item():.4f}")
    print(f"Cross-Entropy:    {ce.item():.4f}")
    print(f"Ratio (FL/CE):    {fl.item()/ce.item():.4f}")

    # CIoU Loss demo
    ciou_loss = CIoULoss()
    pred_boxes = torch.tensor([[10, 10, 50, 50], [20, 20, 80, 80]], dtype=torch.float32)
    gt_boxes = torch.tensor([[12, 8, 48, 52], [25, 22, 78, 85]], dtype=torch.float32)
    loss = ciou_loss(pred_boxes, gt_boxes)
    iou = box_iou(pred_boxes, gt_boxes)
    print(f"\\nCIoU Loss: {loss.item():.4f}")
    print(f"IoU values: {iou.tolist()}")

    # Show loss comparison for different box overlaps
    print("\\nBox Overlap vs Loss Comparison:")
    print(f"{'IoU':>6} {'L1':>8} {'GIoU':>8} {'CIoU':>8}")
    for offset in [0, 5, 10, 20, 30, 40]:
        p = torch.tensor([[10.0, 10, 50, 50]])
        g = torch.tensor([[10.0 + offset, 10, 50 + offset, 50]])
        iou_val = box_iou(p, g).item()
        l1_val = F.l1_loss(p, g).item()
        ciou_val = CIoULoss(reduction="none")(p, g).item()
        giou_val = 1 - iou_val  # simplified
        print(f"{iou_val:6.3f} {l1_val:8.3f} {giou_val:8.3f} {ciou_val:8.3f}")`
        },
        {
          type: "callout",
          variant: "tip",
          title: "Augmentation Pipeline for Edge Detection Models",
          text: "A proven augmentation pipeline for YOLO-family edge detection: Mosaic (p=1.0 during early training, p=0.0 last 15 epochs), random perspective (degrees=0, translate=0.1, scale=0.5, shear=0), HSV augmentation (hue=0.015, saturation=0.7, value=0.4), horizontal flip (p=0.5). Disable Mosaic in the final epochs so the model learns single-image statistics — this consistently improves AP by 0.5-1.0 points. All augmentations are train-time only and add zero inference cost."
        },
        {
          type: "callout",
          variant: "warning",
          title: "Loss Function Pitfalls in Production",
          text: "Three common mistakes: (1) Using cross-entropy with severe class imbalance (1:100+ ratio) — switch to focal loss or use class weights. (2) Using L1/Smooth-L1 for box regression in modern detectors — CIoU loss converges faster and produces tighter boxes. (3) Not using label smoothing with knowledge distillation — when the teacher provides soft labels, adding label smoothing on top double-smooths the targets and hurts accuracy. Match your loss function to your problem: focal for imbalanced detection, CIoU for boxes, CTC for sequence recognition, and standard CE with label smoothing for balanced classification."
        },
        {
          type: "text",
          text: "Summary: Transfer learning is the default starting point for production vision models — feature extraction for tiny datasets, progressive unfreezing for medium datasets, full fine-tuning with differential learning rates for large datasets. Data augmentation is the highest-ROI investment in your training pipeline: Mosaic + CutMix + standard geometric/photometric transforms can substitute for 2-5x more labeled data. Loss function selection directly determines model behavior: focal loss for class imbalance, CIoU for precise localization, CTC for text recognition. All augmentation and loss decisions affect only training — they add zero cost at inference, making them free improvements for edge deployment."
        }
      ]
    }

  ];
})();
