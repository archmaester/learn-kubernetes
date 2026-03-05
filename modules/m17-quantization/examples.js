// Patches the Quantization module (m17) with comprehensive code examples.
// Loaded after curriculum.js and lessons.js.
// m17 = CURRICULUM.phases[5].modules[1]
(function patchQuantizationExamples() {
  const m = CURRICULUM.phases[5].modules[1];

  m.codeExamples = [

    // ──────────────────────────────────────────────────────────
    // Section 1: Quantize Conv2D by Hand
    // ──────────────────────────────────────────────────────────
    {
      id: "quant-conv2d-hand",
      title: "Quantize Conv2D by Hand",
      icon: "🔧",
      items: [

        // ── 1.1  Affine & Symmetric Quantization Primitives ──
        {
          title: "Affine & Symmetric Quantization Primitives",
          lang: "python",
          filename: "quant_primitives.py",
          desc: "Implement affine (asymmetric) and symmetric quantization from scratch. Derive scale/zero-point, quantize, dequantize, and measure reconstruction error per-tensor and per-channel.",
          code: `"""
Quantization primitives: affine (asymmetric) and symmetric schemes.
All math is explicit — no framework quantization APIs.

Affine:   q = clamp(round(x / scale + zero_point), qmin, qmax)
          scale = (xmax - xmin) / (qmax - qmin)
          zero_point = round(qmin - xmin / scale)

Symmetric: q = clamp(round(x / scale), -127, 127)
           scale = max(|xmin|, |xmax|) / 127
           zero_point = 0  (always)
"""
import numpy as np


# ── Affine (asymmetric) quantization ────────────────────────
def affine_quantize(x: np.ndarray, n_bits: int = 8):
    """Quantize tensor x to n_bits using affine scheme."""
    qmin, qmax = 0, (1 << n_bits) - 1          # 0..255 for 8-bit

    xmin, xmax = x.min(), x.max()
    scale = (xmax - xmin) / (qmax - qmin)
    scale = max(scale, 1e-8)                     # avoid division by zero
    zero_point = int(round(qmin - xmin / scale))
    zero_point = np.clip(zero_point, qmin, qmax)

    # Quantize
    q = np.clip(np.round(x / scale + zero_point), qmin, qmax).astype(np.uint8)

    # Dequantize
    x_hat = (q.astype(np.float32) - zero_point) * scale

    return q, x_hat, scale, zero_point


# ── Symmetric quantization ──────────────────────────────────
def symmetric_quantize(x: np.ndarray, n_bits: int = 8):
    """Quantize tensor x to n_bits using symmetric scheme."""
    qmax = (1 << (n_bits - 1)) - 1              # 127 for 8-bit
    qmin = -qmax                                  # -127 (reserve -128)

    abs_max = max(abs(x.min()), abs(x.max()))
    scale = abs_max / qmax
    scale = max(scale, 1e-8)

    q = np.clip(np.round(x / scale), qmin, qmax).astype(np.int8)
    x_hat = q.astype(np.float32) * scale

    return q, x_hat, scale


# ── Per-channel quantization (symmetric, axis=0) ────────────
def per_channel_symmetric(weight: np.ndarray, n_bits: int = 8):
    """
    Per-output-channel symmetric quantization for conv weights.
    weight shape: (C_out, C_in, kH, kW) — standard PyTorch layout.
    One scale per output channel → better accuracy than per-tensor.
    """
    qmax = (1 << (n_bits - 1)) - 1
    C_out = weight.shape[0]
    scales = np.zeros(C_out, dtype=np.float32)
    q_weight = np.zeros_like(weight, dtype=np.int8)

    for c in range(C_out):
        channel = weight[c]
        abs_max = np.max(np.abs(channel))
        scales[c] = max(abs_max / qmax, 1e-8)
        q_weight[c] = np.clip(
            np.round(channel / scales[c]), -qmax, qmax
        ).astype(np.int8)

    # Dequantize
    w_hat = np.zeros_like(weight, dtype=np.float32)
    for c in range(C_out):
        w_hat[c] = q_weight[c].astype(np.float32) * scales[c]

    return q_weight, w_hat, scales


# ── Demo ─────────────────────────────────────────────────────
if __name__ == "__main__":
    np.random.seed(42)

    # Simulate conv weight: (64, 32, 3, 3)
    W = np.random.randn(64, 32, 3, 3).astype(np.float32) * 0.1

    # Per-tensor affine
    q_a, w_a, s_a, zp_a = affine_quantize(W)
    err_affine = np.mean((W - w_a) ** 2)

    # Per-tensor symmetric
    q_s, w_s, s_s = symmetric_quantize(W)
    err_sym = np.mean((W - w_s) ** 2)

    # Per-channel symmetric
    q_c, w_c, scales_c = per_channel_symmetric(W)
    err_chan = np.mean((W - w_c) ** 2)

    print(f"Per-tensor affine    MSE: {err_affine:.2e}  scale={s_a:.6f}  zp={zp_a}")
    print(f"Per-tensor symmetric MSE: {err_sym:.2e}  scale={s_s:.6f}")
    print(f"Per-channel symmetric MSE: {err_chan:.2e}  (64 scales)")
    print(f"\\nPer-channel reduces error by {err_sym/err_chan:.1f}x vs per-tensor symmetric")

    # Show distribution of scales across channels
    print(f"\\nScale stats: min={scales_c.min():.6f}  max={scales_c.max():.6f}  "
          f"std={scales_c.std():.6f}")
`
        },

        // ── 1.2  INT8 Conv2D with INT32 Accumulator ──
        {
          title: "INT8 Conv2D with INT32 Accumulator",
          lang: "python",
          filename: "int8_conv2d.py",
          desc: "Full INT8 Conv2D: quantize weights and activations, perform integer-only matmul with INT32 accumulator, requantize output. Matches the pipeline used by TFLite and QNN on ARM NEON.",
          code: `"""
INT8 Conv2D: the complete quantized inference pipeline.

Pipeline:
  1. Quantize FP32 weights → INT8  (offline, per-channel symmetric)
  2. Quantize FP32 input   → INT8  (runtime, per-tensor affine from calibration)
  3. INT8 x INT8 matmul    → INT32 accumulator  (the actual hardware op)
  4. Add INT32 bias (pre-scaled)
  5. Requantize INT32 → INT8 for next layer  (scale multiplication + round)

This is exactly what happens inside TFLite's quantized conv kernel
and on ARM NEON / Qualcomm Hexagon DSPs.
"""
import numpy as np


def im2col(x, kH, kW, stride=1, pad=0):
    """Unfold input into column matrix for GEMM-based convolution."""
    if pad > 0:
        x = np.pad(x, ((0,0),(0,0),(pad,pad),(pad,pad)), mode='constant')
    N, C, H, W = x.shape
    out_h = (H - kH) // stride + 1
    out_w = (W - kW) // stride + 1
    cols = np.zeros((N, C * kH * kW, out_h * out_w), dtype=x.dtype)
    idx = 0
    for i in range(out_h):
        for j in range(out_w):
            patch = x[:, :, i*stride:i*stride+kH, j*stride:j*stride+kW]
            cols[:, :, idx] = patch.reshape(N, -1)
            idx += 1
    return cols, out_h, out_w


class QuantizedConv2D:
    """INT8 convolution with full quantization pipeline."""

    def __init__(self, weight_fp32, bias_fp32, input_scale, input_zp,
                 output_scale, output_zp, stride=1, pad=0):
        self.stride = stride
        self.pad = pad

        C_out, C_in, kH, kW = weight_fp32.shape
        self.kH, self.kW = kH, kW

        # ── Step 1: Per-channel symmetric quantization of weights ──
        self.w_scales = np.zeros(C_out, dtype=np.float64)
        self.w_int8 = np.zeros_like(weight_fp32, dtype=np.int8)
        for c in range(C_out):
            abs_max = np.max(np.abs(weight_fp32[c]))
            self.w_scales[c] = max(abs_max / 127.0, 1e-10)
            self.w_int8[c] = np.clip(
                np.round(weight_fp32[c] / self.w_scales[c]), -127, 127
            ).astype(np.int8)

        # ── Pre-compute bias in INT32 domain ──
        # bias_int32 = round(bias_fp32 / (input_scale * w_scale_per_channel))
        combined_scale = input_scale * self.w_scales  # shape: (C_out,)
        self.bias_int32 = np.round(bias_fp32 / combined_scale).astype(np.int32)

        # ── Requantization multiplier: M = (S_in * S_w) / S_out ──
        # Decomposed as M = M0 * 2^(-shift) where M0 is a fixed-point int
        self.requant_scale = combined_scale / output_scale  # per-channel
        self.output_zp = output_zp
        self.input_scale = input_scale
        self.input_zp = input_zp

    def forward(self, x_fp32):
        """Quantize input, run INT8 matmul, requantize output."""
        N = x_fp32.shape[0]

        # ── Step 2: Quantize input (per-tensor affine) ──
        x_int8 = np.clip(
            np.round(x_fp32 / self.input_scale + self.input_zp), 0, 255
        ).astype(np.uint8)

        # ── Step 3: im2col + INT8 GEMM → INT32 accumulator ──
        cols, out_h, out_w = im2col(
            x_int8.astype(np.int32),  # promote for matmul
            self.kH, self.kW, self.stride, self.pad
        )

        # Weight matrix: (C_out, C_in*kH*kW)
        w_mat = self.w_int8.reshape(self.w_int8.shape[0], -1).astype(np.int32)

        # INT8 x INT8 → INT32 (this is the hardware operation)
        # Subtract input zero point so we work with true integer values
        cols_shifted = cols - self.input_zp  # now centered around 0
        acc_int32 = np.zeros((N, w_mat.shape[0], out_h * out_w), dtype=np.int32)
        for n in range(N):
            acc_int32[n] = w_mat @ cols_shifted[n]  # INT32 accumulation

        # ── Step 4: Add pre-scaled bias ──
        acc_int32 += self.bias_int32[np.newaxis, :, np.newaxis]

        # ── Step 5: Requantize INT32 → UINT8 ──
        # output_int8 = clamp(round(acc_int32 * M) + output_zp, 0, 255)
        out_fp = acc_int32.astype(np.float64) * self.requant_scale[np.newaxis, :, np.newaxis]
        out_int8 = np.clip(
            np.round(out_fp + self.output_zp), 0, 255
        ).astype(np.uint8)

        return out_int8.reshape(N, -1, out_h, out_w)


# ── Reference FP32 convolution for accuracy comparison ──────
def fp32_conv2d(x, w, b, stride=1, pad=0):
    cols, oh, ow = im2col(x, w.shape[2], w.shape[3], stride, pad)
    w_mat = w.reshape(w.shape[0], -1)
    out = np.zeros((x.shape[0], w_mat.shape[0], oh * ow), dtype=np.float32)
    for n in range(x.shape[0]):
        out[n] = w_mat @ cols[n]
    out += b[np.newaxis, :, np.newaxis]
    return out.reshape(x.shape[0], -1, oh, ow)


if __name__ == "__main__":
    np.random.seed(0)

    # Random conv layer
    C_in, C_out, kH, kW = 3, 16, 3, 3
    W = np.random.randn(C_out, C_in, kH, kW).astype(np.float32) * 0.1
    b = np.random.randn(C_out).astype(np.float32) * 0.01

    # Random input batch (simulating post-ReLU activations: non-negative)
    X = np.random.rand(4, C_in, 8, 8).astype(np.float32)

    # Calibration: determine input/output quantization params
    out_fp32 = fp32_conv2d(X, W, b, stride=1, pad=1)

    in_scale = X.max() / 255.0
    in_zp = 0
    out_scale = (out_fp32.max() - out_fp32.min()) / 255.0
    out_zp = int(round(-out_fp32.min() / out_scale))

    # Quantized convolution
    qconv = QuantizedConv2D(W, b, in_scale, in_zp, out_scale, out_zp,
                            stride=1, pad=1)
    out_int8 = qconv.forward(X)

    # Dequantize for comparison
    out_deq = (out_int8.astype(np.float32) - out_zp) * out_scale

    mse = np.mean((out_fp32 - out_deq) ** 2)
    max_err = np.max(np.abs(out_fp32 - out_deq))
    cos_sim = np.dot(out_fp32.ravel(), out_deq.ravel()) / (
        np.linalg.norm(out_fp32.ravel()) * np.linalg.norm(out_deq.ravel()))

    print("INT8 Conv2D vs FP32 Conv2D")
    print(f"  MSE:             {mse:.2e}")
    print(f"  Max abs error:   {max_err:.4f}")
    print(f"  Cosine similarity: {cos_sim:.6f}")
    print(f"  Output shape:    {out_int8.shape}")
    print(f"  Weight bytes:    FP32={W.nbytes}  INT8={qconv.w_int8.nbytes}  "
          f"({W.nbytes/qconv.w_int8.nbytes:.0f}x reduction)")
`
        },

        // ── 1.3  Calibration Strategies: MinMax, Percentile, KL-Divergence ──
        {
          title: "Calibration Strategies: MinMax, Percentile, KL-Divergence",
          lang: "python",
          filename: "calibration_strategies.py",
          desc: "Implement three PTQ calibration methods from scratch. Collect activation histograms, compute optimal clipping range via entropy minimization (KL-divergence), and compare quantization error.",
          code: `"""
PTQ Calibration strategies from scratch.

During post-training quantization, we need to determine the clipping range
[a, b] for activations. The choice of range directly affects accuracy:
  - Too wide  → wasted precision on outliers
  - Too narrow → clipping error on tail values

Three approaches:
  1. MinMax:     [min(x), max(x)] — simplest, sensitive to outliers
  2. Percentile: [percentile(x, p), percentile(x, 100-p)] — robust to outliers
  3. KL-Divergence: find threshold that minimizes information loss — TensorRT's approach
"""
import numpy as np
from scipy import stats


class MinMaxCalibrator:
    """Track running min/max across calibration batches."""
    def __init__(self):
        self.running_min = float('inf')
        self.running_max = float('-inf')

    def observe(self, x: np.ndarray):
        self.running_min = min(self.running_min, x.min())
        self.running_max = max(self.running_max, x.max())

    def compute_params(self, n_bits=8, symmetric=False):
        if symmetric:
            abs_max = max(abs(self.running_min), abs(self.running_max))
            scale = abs_max / 127.0
            return scale, 0
        else:
            qmin, qmax = 0, 255
            scale = (self.running_max - self.running_min) / (qmax - qmin)
            zp = int(round(qmin - self.running_min / max(scale, 1e-10)))
            return max(scale, 1e-10), np.clip(zp, qmin, qmax)


class PercentileCalibrator:
    """Clip to [p-th, (100-p)-th] percentile to ignore outliers."""
    def __init__(self, percentile=99.99):
        self.percentile = percentile
        self.all_values = []

    def observe(self, x: np.ndarray):
        # In practice, store a histogram instead of raw values
        self.all_values.append(x.ravel())

    def compute_params(self, n_bits=8, symmetric=False):
        data = np.concatenate(self.all_values)
        lo = np.percentile(data, 100 - self.percentile)
        hi = np.percentile(data, self.percentile)
        if symmetric:
            abs_max = max(abs(lo), abs(hi))
            return abs_max / 127.0, 0
        else:
            scale = (hi - lo) / 255.0
            zp = int(round(-lo / max(scale, 1e-10)))
            return max(scale, 1e-10), np.clip(zp, 0, 255)


class KLDivergenceCalibrator:
    """
    Find optimal clipping threshold by minimizing KL divergence between
    the original activation distribution and the quantized version.
    This is the approach used by TensorRT.

    Algorithm:
    1. Build a fine-grained histogram (2048 bins) of activations
    2. For each candidate threshold T in [128/2048*max, max]:
       a. Quantize the histogram to 128 bins (INT8 range)
       b. Expand back to 2048 bins
       c. Compute KL(original || quantized)
    3. Pick T with minimum KL divergence
    """
    def __init__(self, n_bins=2048):
        self.n_bins = n_bins
        self.all_values = []

    def observe(self, x: np.ndarray):
        self.all_values.append(x.ravel())

    def compute_params(self, n_bits=8, symmetric=True):
        data = np.concatenate(self.all_values)
        # For symmetric quantization of post-ReLU activations: [0, threshold]
        abs_max = np.max(np.abs(data))

        # Build reference histogram
        hist, bin_edges = np.histogram(data, bins=self.n_bins,
                                        range=(0, abs_max))
        hist = hist.astype(np.float64)

        n_quant_bins = (1 << (n_bits - 1)) - 1  # 127 for 8-bit symmetric

        best_kl = float('inf')
        best_threshold_bin = self.n_bins

        # Try different thresholds (from 128 bins to 2048 bins)
        for t in range(n_quant_bins, self.n_bins + 1):
            # Reference distribution: clip to [0, t] bins
            ref = hist[:t].copy()
            # Merge everything beyond t into the last bin
            ref[-1] += np.sum(hist[t:])

            if np.sum(ref) == 0:
                continue

            # Quantize: merge t bins into n_quant_bins
            bin_width = t / n_quant_bins
            quantized = np.zeros(n_quant_bins, dtype=np.float64)
            for i in range(n_quant_bins):
                lo = int(round(i * bin_width))
                hi = int(round((i + 1) * bin_width))
                hi = min(hi, t)
                quantized[i] = np.sum(ref[lo:hi])

            # Expand back to t bins
            expanded = np.zeros(t, dtype=np.float64)
            for i in range(n_quant_bins):
                lo = int(round(i * bin_width))
                hi = int(round((i + 1) * bin_width))
                hi = min(hi, t)
                count = hi - lo
                if count > 0:
                    expanded[lo:hi] = quantized[i] / count

            # KL divergence: D(ref || expanded)
            # Only where ref > 0 and expanded > 0
            mask = (ref > 0) & (expanded > 0)
            if not mask.any():
                continue
            kl = np.sum(ref[mask] * np.log(ref[mask] / expanded[mask]))

            if kl < best_kl:
                best_kl = kl
                best_threshold_bin = t

        threshold = (best_threshold_bin + 0.5) * abs_max / self.n_bins
        scale = threshold / 127.0
        return max(scale, 1e-10), 0  # symmetric → zp=0


# ── Compare all three calibrators on synthetic data ──────────
if __name__ == "__main__":
    np.random.seed(42)

    # Simulate post-ReLU activations with outliers
    # (common pattern: mostly small values with occasional spikes)
    n_samples = 100_000
    base = np.abs(np.random.randn(n_samples).astype(np.float32)) * 0.5
    # Inject 0.1% outliers at 10x the typical range
    outlier_mask = np.random.rand(n_samples) < 0.001
    base[outlier_mask] *= 10.0

    print(f"Activation stats: min={base.min():.3f}  max={base.max():.3f}  "
          f"mean={base.mean():.3f}  std={base.std():.3f}")
    print(f"Outliers: {outlier_mask.sum()} values > {np.percentile(base, 99.9):.2f}")

    calibrators = {
        "MinMax":       MinMaxCalibrator(),
        "Percentile99.99": PercentileCalibrator(99.99),
        "KL-Divergence": KLDivergenceCalibrator(),
    }

    # Feed calibration data
    for name, cal in calibrators.items():
        cal.observe(base)

    # Compare quantization error
    print(f"\\n{'Method':<20} {'Scale':>10} {'ZP':>5} {'MSE':>12} {'MaxErr':>10}")
    print("-" * 60)
    for name, cal in calibrators.items():
        scale, zp = cal.compute_params(n_bits=8, symmetric=True)
        q = np.clip(np.round(base / scale), -127, 127).astype(np.int8)
        deq = q.astype(np.float32) * scale
        mse = np.mean((base - deq) ** 2)
        max_err = np.max(np.abs(base - deq))
        print(f"{name:<20} {scale:>10.6f} {zp:>5} {mse:>12.2e} {max_err:>10.4f}")
`
        },
      ],
    },

    // ──────────────────────────────────────────────────────────
    // Section 2: PTQ vs QAT Comparison Pipeline
    // ──────────────────────────────────────────────────────────
    {
      id: "ptq-vs-qat",
      title: "PTQ vs QAT Comparison Pipeline",
      icon: "⚖️",
      items: [

        // ── 2.1  Static PTQ with PyTorch ──
        {
          title: "Static PTQ with PyTorch",
          lang: "python",
          filename: "static_ptq_pytorch.py",
          desc: "Apply static post-training quantization to a MobileNetV2 using PyTorch's quantization API. Calibrate with representative data, convert, and benchmark size/accuracy/latency.",
          code: `"""
Static Post-Training Quantization (PTQ) with PyTorch.

Static PTQ pre-computes activation ranges from a calibration dataset,
then folds everything into integer ops. This is what you deploy on edge.

Pipeline:
  1. Train or load FP32 model
  2. Fuse Conv+BN+ReLU modules
  3. Insert observer nodes (HistogramObserver for activations)
  4. Run calibration forward passes
  5. Convert to quantized model
  6. Benchmark
"""
import torch
import torch.nn as nn
import torch.quantization as tq
import torchvision.models as models
import torchvision.transforms as T
import torchvision.datasets as datasets
import time
import os


def get_cifar10_loaders(batch_size=128):
    """CIFAR-10 with ImageNet-style preprocessing for MobileNetV2."""
    transform = T.Compose([
        T.Resize(224),
        T.ToTensor(),
        T.Normalize(mean=[0.485, 0.456, 0.406],
                     std=[0.229, 0.224, 0.225]),
    ])
    train_ds = datasets.CIFAR10(root='./data', train=True,
                                 download=True, transform=transform)
    test_ds = datasets.CIFAR10(root='./data', train=False,
                                download=True, transform=transform)
    cal_loader = torch.utils.data.DataLoader(
        train_ds, batch_size=batch_size, shuffle=True, num_workers=2)
    test_loader = torch.utils.data.DataLoader(
        test_ds, batch_size=batch_size, shuffle=False, num_workers=2)
    return cal_loader, test_loader


def evaluate(model, loader, device='cpu'):
    model.eval()
    correct = total = 0
    with torch.no_grad():
        for imgs, labels in loader:
            imgs, labels = imgs.to(device), labels.to(device)
            preds = model(imgs).argmax(dim=1)
            correct += (preds == labels).sum().item()
            total += labels.size(0)
    return correct / total


def measure_latency(model, input_shape=(1, 3, 224, 224), n_runs=100):
    x = torch.randn(*input_shape)
    model.eval()
    # Warmup
    for _ in range(10):
        model(x)
    start = time.perf_counter()
    for _ in range(n_runs):
        model(x)
    elapsed = (time.perf_counter() - start) / n_runs * 1000
    return elapsed  # ms


def model_size_mb(model):
    """Serialize model and measure file size."""
    path = "/tmp/_quant_size_test.pt"
    torch.save(model.state_dict(), path)
    size = os.path.getsize(path) / 1e6
    os.remove(path)
    return size


def static_ptq_pipeline():
    # ── 1. Load pretrained MobileNetV2 ──
    model = models.mobilenet_v2(pretrained=True)
    model.classifier[1] = nn.Linear(1280, 10)  # CIFAR-10
    model.eval()

    cal_loader, test_loader = get_cifar10_loaders()

    # Baseline
    fp32_acc = evaluate(model, test_loader)
    fp32_size = model_size_mb(model)
    fp32_lat = measure_latency(model)
    print(f"FP32:  acc={fp32_acc:.4f}  size={fp32_size:.1f}MB  latency={fp32_lat:.1f}ms")

    # ── 2. Fuse modules ──
    # MobileNetV2 has Conv+BN+ReLU6 blocks
    model_fused = tq.fuse_modules(model, [
        ['features.0.0', 'features.0.1', 'features.0.2'],
    ], inplace=False)

    # ── 3. Prepare: insert observers ──
    model_fused.qconfig = tq.get_default_qconfig('x86')
    # Use histogram observer for better calibration
    model_fused.qconfig = tq.QConfig(
        activation=tq.HistogramObserver.with_args(
            reduce_range=True
        ),
        weight=tq.default_per_channel_weight_observer,
    )
    tq.prepare(model_fused, inplace=True)

    # ── 4. Calibrate with representative data ──
    print("Calibrating with 10 batches...")
    model_fused.eval()
    with torch.no_grad():
        for i, (imgs, _) in enumerate(cal_loader):
            model_fused(imgs)
            if i >= 9:
                break

    # ── 5. Convert to quantized model ──
    model_int8 = tq.convert(model_fused, inplace=False)

    int8_acc = evaluate(model_int8, test_loader)
    int8_size = model_size_mb(model_int8)
    int8_lat = measure_latency(model_int8)
    print(f"INT8:  acc={int8_acc:.4f}  size={int8_size:.1f}MB  latency={int8_lat:.1f}ms")
    print(f"\\nSize reduction: {fp32_size/int8_size:.1f}x")
    print(f"Speedup:        {fp32_lat/int8_lat:.1f}x")
    print(f"Accuracy drop:  {(fp32_acc - int8_acc)*100:.2f}%")

    return model_int8


if __name__ == "__main__":
    static_ptq_pipeline()
`
        },

        // ── 2.2  QAT with Fake Quantization ──
        {
          title: "QAT with Fake Quantization (PyTorch)",
          lang: "python",
          filename: "qat_pytorch.py",
          desc: "Quantization-Aware Training: insert fake quantization nodes, fine-tune for 5 epochs with STE gradients, then convert. Compare to PTQ on the same model.",
          code: `"""
Quantization-Aware Training (QAT) with PyTorch.

QAT simulates quantization during training using fake-quantize nodes:
  Forward:  x_q = dequant(quant(x))  — rounds to nearest INT8 grid point
  Backward: straight-through estimator (STE) — gradient passes through
            the round() operation as if it were the identity function

After training, fake-quant nodes are folded into real INT8 ops.
QAT typically recovers 1-3% accuracy over PTQ because the model learns
to compensate for quantization noise during training.
"""
import torch
import torch.nn as nn
import torch.quantization as tq
import torchvision.models as models
import torchvision.transforms as T
import torchvision.datasets as datasets
from torch.optim import SGD
from torch.optim.lr_scheduler import CosineAnnealingLR
import time
import os


def get_cifar10_loaders(batch_size=64):
    transform_train = T.Compose([
        T.Resize(224), T.RandomHorizontalFlip(),
        T.ToTensor(),
        T.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])
    transform_test = T.Compose([
        T.Resize(224), T.ToTensor(),
        T.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])
    train_ds = datasets.CIFAR10('./data', train=True, download=True,
                                 transform=transform_train)
    test_ds = datasets.CIFAR10('./data', train=False, download=True,
                                transform=transform_test)
    return (torch.utils.data.DataLoader(train_ds, batch_size=batch_size,
                                         shuffle=True, num_workers=2),
            torch.utils.data.DataLoader(test_ds, batch_size=batch_size,
                                         shuffle=False, num_workers=2))


def evaluate(model, loader, device='cpu'):
    model.eval()
    correct = total = 0
    with torch.no_grad():
        for imgs, labels in loader:
            imgs, labels = imgs.to(device), labels.to(device)
            correct += (model(imgs).argmax(1) == labels).sum().item()
            total += labels.size(0)
    return correct / total


def qat_pipeline():
    device = 'cpu'  # QAT must run on CPU for torch.quantization

    # ── 1. Load model ──
    model = models.mobilenet_v2(pretrained=True)
    model.classifier[1] = nn.Linear(1280, 10)
    model.to(device)

    train_loader, test_loader = get_cifar10_loaders()

    fp32_acc = evaluate(model, test_loader, device)
    print(f"FP32 baseline accuracy: {fp32_acc:.4f}")

    # ── 2. Fuse modules (same as PTQ) ──
    model.eval()
    model_fused = tq.fuse_modules(model, [
        ['features.0.0', 'features.0.1', 'features.0.2'],
    ], inplace=False)

    # ── 3. Set QAT qconfig and prepare ──
    model_fused.train()
    model_fused.qconfig = tq.get_default_qat_qconfig('x86')
    tq.prepare_qat(model_fused, inplace=True)

    # ── 4. Fine-tune with fake quantization ──
    optimizer = SGD(model_fused.parameters(), lr=1e-3,
                    momentum=0.9, weight_decay=1e-4)
    scheduler = CosineAnnealingLR(optimizer, T_max=5)
    criterion = nn.CrossEntropyLoss()

    print("\\nQAT fine-tuning (5 epochs)...")
    for epoch in range(5):
        model_fused.train()
        running_loss = 0.0
        for i, (imgs, labels) in enumerate(train_loader):
            imgs, labels = imgs.to(device), labels.to(device)
            optimizer.zero_grad()
            loss = criterion(model_fused(imgs), labels)
            loss.backward()
            optimizer.step()
            running_loss += loss.item()
            if (i + 1) % 100 == 0:
                print(f"  Epoch {epoch+1}, batch {i+1}: loss={running_loss/100:.4f}")
                running_loss = 0.0

        scheduler.step()

        # Freeze BN stats after epoch 3 (common QAT trick)
        if epoch >= 2:
            model_fused.apply(torch.nn.intrinsic.qat.freeze_bn_stats)

        # Freeze observers after epoch 3
        if epoch >= 2:
            model_fused.apply(tq.disable_observer)

        acc = evaluate(model_fused, test_loader, device)
        print(f"  Epoch {epoch+1} QAT accuracy: {acc:.4f}")

    # ── 5. Convert to fully quantized INT8 ──
    model_fused.eval()
    model_int8 = tq.convert(model_fused, inplace=False)

    qat_acc = evaluate(model_int8, test_loader, device)

    # Size comparison
    def model_size(m):
        path = "/tmp/_qat_test.pt"
        torch.save(m.state_dict(), path)
        s = os.path.getsize(path) / 1e6
        os.remove(path)
        return s

    fp32_size = model_size(model)
    int8_size = model_size(model_int8)

    print(f"\\n{'='*50}")
    print(f"FP32 accuracy:     {fp32_acc:.4f}  ({fp32_size:.1f} MB)")
    print(f"QAT INT8 accuracy: {qat_acc:.4f}  ({int8_size:.1f} MB)")
    print(f"Size reduction:    {fp32_size/int8_size:.1f}x")
    print(f"Accuracy change:   {(qat_acc - fp32_acc)*100:+.2f}%")


if __name__ == "__main__":
    qat_pipeline()
`
        },

        // ── 2.3  TensorFlow Lite PTQ + QAT Comparison ──
        {
          title: "TFLite PTQ + Full-Integer Quantization",
          lang: "python",
          filename: "tflite_ptq.py",
          desc: "Quantize a Keras model to TFLite INT8 with representative dataset calibration. Shows both dynamic range and full-integer quantization paths.",
          code: `"""
TensorFlow Lite quantization: dynamic range PTQ and full-integer PTQ.

TFLite is the dominant edge inference engine for Android/embedded.
Two PTQ modes:
  1. Dynamic range: weights INT8, activations FP32 (quantized at runtime)
  2. Full integer: weights INT8, activations INT8 (requires calibration)

Full-integer is what runs on NPUs/DSPs (EdgeTPU, Hexagon, XNNPACK INT8).
"""
import tensorflow as tf
import numpy as np
import os
import tempfile


def build_model():
    """Small CNN for CIFAR-10 — representative of edge deployment."""
    model = tf.keras.Sequential([
        tf.keras.layers.Conv2D(32, 3, padding='same', activation='relu',
                                input_shape=(32, 32, 3)),
        tf.keras.layers.BatchNormalization(),
        tf.keras.layers.Conv2D(32, 3, padding='same', activation='relu'),
        tf.keras.layers.MaxPooling2D(),
        tf.keras.layers.Conv2D(64, 3, padding='same', activation='relu'),
        tf.keras.layers.BatchNormalization(),
        tf.keras.layers.Conv2D(64, 3, padding='same', activation='relu'),
        tf.keras.layers.MaxPooling2D(),
        tf.keras.layers.GlobalAveragePooling2D(),
        tf.keras.layers.Dense(128, activation='relu'),
        tf.keras.layers.Dropout(0.3),
        tf.keras.layers.Dense(10),
    ])
    return model


def train_model(model, epochs=5):
    (x_train, y_train), (x_test, y_test) = tf.keras.datasets.cifar10.load_data()
    x_train = x_train.astype('float32') / 255.0
    x_test = x_test.astype('float32') / 255.0

    model.compile(optimizer='adam',
                  loss=tf.keras.losses.SparseCategoricalCrossentropy(from_logits=True),
                  metrics=['accuracy'])
    model.fit(x_train, y_train, epochs=epochs, batch_size=128,
              validation_data=(x_test, y_test), verbose=1)
    return model, x_train, x_test, y_test


def representative_dataset_gen(x_cal):
    """Generator that yields calibration samples for TFLite converter."""
    for i in range(min(200, len(x_cal))):
        yield [x_cal[i:i+1].astype(np.float32)]


def quantize_and_evaluate():
    model = build_model()
    model, x_train, x_test, y_test = train_model(model, epochs=5)

    # ── Save original Keras model ──
    saved_model_dir = tempfile.mkdtemp()
    model.save(saved_model_dir)

    # ── 1. No quantization (FP32 baseline) ──
    converter_fp32 = tf.lite.TFLiteConverter.from_saved_model(saved_model_dir)
    tflite_fp32 = converter_fp32.convert()

    # ── 2. Dynamic range quantization (weights only) ──
    converter_dyn = tf.lite.TFLiteConverter.from_saved_model(saved_model_dir)
    converter_dyn.optimizations = [tf.lite.Optimize.DEFAULT]
    tflite_dynamic = converter_dyn.convert()

    # ── 3. Full integer quantization (weights + activations) ──
    converter_int8 = tf.lite.TFLiteConverter.from_saved_model(saved_model_dir)
    converter_int8.optimizations = [tf.lite.Optimize.DEFAULT]
    converter_int8.representative_dataset = lambda: representative_dataset_gen(x_train)
    # Force full integer (INT8 input/output)
    converter_int8.target_spec.supported_ops = [
        tf.lite.OpsSet.TFLITE_BUILTINS_INT8
    ]
    converter_int8.inference_input_type = tf.uint8
    converter_int8.inference_output_type = tf.uint8
    tflite_int8 = converter_int8.convert()

    # ── Evaluate each variant ──
    def evaluate_tflite(tflite_model, x_test, y_test, is_int8=False):
        interpreter = tf.lite.Interpreter(model_content=tflite_model)
        interpreter.allocate_tensors()
        input_details = interpreter.get_input_details()
        output_details = interpreter.get_output_details()

        correct = 0
        for i in range(len(x_test)):
            x = x_test[i:i+1]
            if is_int8:
                # Quantize input
                input_scale = input_details[0]['quantization'][0]
                input_zp = input_details[0]['quantization'][1]
                x = (x / input_scale + input_zp).astype(np.uint8)
            else:
                x = x.astype(np.float32)

            interpreter.set_tensor(input_details[0]['index'], x)
            interpreter.invoke()
            output = interpreter.get_tensor(output_details[0]['index'])
            if output.argmax() == y_test[i]:
                correct += 1
        return correct / len(y_test)

    acc_fp32 = evaluate_tflite(tflite_fp32, x_test, y_test)
    acc_dyn = evaluate_tflite(tflite_dynamic, x_test, y_test)
    acc_int8 = evaluate_tflite(tflite_int8, x_test, y_test, is_int8=True)

    print(f"\\n{'Model':<25} {'Size (KB)':>10} {'Accuracy':>10}")
    print("-" * 50)
    print(f"{'FP32':<25} {len(tflite_fp32)/1024:>10.0f} {acc_fp32:>10.4f}")
    print(f"{'Dynamic Range PTQ':<25} {len(tflite_dynamic)/1024:>10.0f} {acc_dyn:>10.4f}")
    print(f"{'Full INT8 PTQ':<25} {len(tflite_int8)/1024:>10.0f} {acc_int8:>10.4f}")
    print(f"\\nFull INT8 size reduction: {len(tflite_fp32)/len(tflite_int8):.1f}x")


if __name__ == "__main__":
    quantize_and_evaluate()
`
        },
      ],
    },

    // ──────────────────────────────────────────────────────────
    // Section 3: Mixed-Precision Sensitivity Analysis
    // ──────────────────────────────────────────────────────────
    {
      id: "mixed-precision-sensitivity",
      title: "Mixed-Precision Sensitivity Analysis",
      icon: "📊",
      items: [

        // ── 3.1  Per-Layer Sensitivity Scanner ──
        {
          title: "Per-Layer Sensitivity Scanner",
          lang: "python",
          filename: "sensitivity_analysis.py",
          desc: "Quantize one layer at a time to INT8 while keeping all others in FP32. Measure accuracy degradation per layer. Identify sensitive layers that need higher precision.",
          code: `"""
Mixed-Precision Sensitivity Analysis.

Strategy: quantize one layer at a time, measure accuracy impact.
Layers with high degradation stay in FP32/FP16; tolerant layers → INT8.
This creates an optimal mixed-precision policy.

This is how NVIDIA's TensorRT auto-selects precision per layer,
and how Qualcomm's AIMET determines the mixed-precision configuration.
"""
import torch
import torch.nn as nn
import torch.quantization as tq
import torchvision.models as models
import torchvision.transforms as T
import torchvision.datasets as datasets
import copy


def get_test_loader(batch_size=128, n_samples=1000):
    """Small subset for fast sensitivity evaluation."""
    transform = T.Compose([
        T.Resize(224), T.ToTensor(),
        T.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])
    full_ds = datasets.CIFAR10('./data', train=False, download=True,
                                transform=transform)
    subset = torch.utils.data.Subset(full_ds, range(n_samples))
    return torch.utils.data.DataLoader(subset, batch_size=batch_size,
                                        num_workers=2)


def evaluate(model, loader):
    model.eval()
    correct = total = 0
    with torch.no_grad():
        for x, y in loader:
            correct += (model(x).argmax(1) == y).sum().item()
            total += y.size(0)
    return correct / total


def get_quantizable_layers(model):
    """Find all Conv2d and Linear layers with their full names."""
    layers = []
    for name, module in model.named_modules():
        if isinstance(module, (nn.Conv2d, nn.Linear)):
            layers.append((name, module))
    return layers


class SingleLayerQuantWrapper(nn.Module):
    """Wraps a single layer with fake quantization for sensitivity test."""
    def __init__(self, layer):
        super().__init__()
        self.layer = layer
        # Fake quantize weight
        self.weight_fake_quant = tq.FakeQuantize.with_args(
            observer=tq.MovingAveragePerChannelMinMaxObserver,
            quant_min=-128, quant_max=127, dtype=torch.qint8,
            qscheme=torch.per_channel_symmetric,
            ch_axis=0 if isinstance(layer, nn.Conv2d) else 0,
        )()
        # Fake quantize activation
        self.act_fake_quant = tq.FakeQuantize.with_args(
            observer=tq.MovingAverageMinMaxObserver,
            quant_min=0, quant_max=255, dtype=torch.quint8,
        )()

    def forward(self, x):
        x = self.act_fake_quant(x)
        # Temporarily replace weight with fake-quantized version
        orig_weight = self.layer.weight.data.clone()
        self.layer.weight.data = self.weight_fake_quant(self.layer.weight)
        out = self.layer(x)
        self.layer.weight.data = orig_weight
        return out


def sensitivity_scan(model, test_loader, cal_loader=None):
    """
    For each quantizable layer:
      1. Deep copy the model
      2. Replace that one layer with a fake-quantized version
      3. Calibrate (forward pass)
      4. Measure accuracy
    """
    baseline_acc = evaluate(model, test_loader)
    print(f"FP32 baseline accuracy: {baseline_acc:.4f}")
    print(f"\\n{'Layer':<45} {'Type':<10} {'Acc':>7} {'Drop':>7}")
    print("-" * 75)

    layers = get_quantizable_layers(model)
    results = []

    for name, layer in layers:
        # Deep copy to avoid modifying original
        model_copy = copy.deepcopy(model)

        # Navigate to parent module and replace the target layer
        parts = name.split('.')
        parent = model_copy
        for p in parts[:-1]:
            parent = getattr(parent, p)

        # Create wrapper
        original_layer = getattr(parent, parts[-1])
        wrapper = SingleLayerQuantWrapper(original_layer)

        # Calibrate the fake quant observers
        wrapper.train()
        with torch.no_grad():
            dummy = torch.randn(1, *([3, 224, 224] if isinstance(layer, nn.Conv2d)
                                      else [layer.in_features]))
            # Simple calibration — in practice use real data
            wrapper.act_fake_quant.enable_observer()
            wrapper.weight_fake_quant.enable_observer()

        setattr(parent, parts[-1], wrapper)

        # Quick calibration pass
        model_copy.eval()
        with torch.no_grad():
            for x, _ in test_loader:
                model_copy(x)
                break  # single batch calibration

        acc = evaluate(model_copy, test_loader)
        drop = baseline_acc - acc
        layer_type = "Conv2d" if isinstance(layer, nn.Conv2d) else "Linear"
        results.append((name, layer_type, acc, drop))
        print(f"{name:<45} {layer_type:<10} {acc:>7.4f} {drop:>+7.4f}")

    # Sort by sensitivity (most sensitive first)
    results.sort(key=lambda x: -x[3])
    print(f"\\n{'='*75}")
    print("Layers ranked by sensitivity (most sensitive → INT8-intolerant):")
    for name, ltype, acc, drop in results[:10]:
        status = "⚠️  KEEP FP32" if drop > 0.01 else "✅ OK for INT8"
        print(f"  {name:<40} drop={drop:+.4f}  {status}")

    return results


if __name__ == "__main__":
    model = models.mobilenet_v2(pretrained=True)
    model.classifier[1] = nn.Linear(1280, 10)
    model.eval()

    test_loader = get_test_loader()
    results = sensitivity_scan(model, test_loader)
`
        },

        // ── 3.2  Automated Mixed-Precision Policy ──
        {
          title: "Automated Mixed-Precision Policy Generator",
          lang: "python",
          filename: "mixed_precision_policy.py",
          desc: "Use sensitivity results to auto-generate an optimal mixed-precision config. Apply INT8 to tolerant layers, keep sensitive layers in FP16/FP32. Measures the Pareto trade-off between accuracy and model size.",
          code: `"""
Automated Mixed-Precision Policy.

Given per-layer sensitivity data, find the optimal assignment of
{FP32, FP16, INT8} to each layer that minimizes model size while
keeping accuracy drop below a threshold.

This is a simplified version of what NVIDIA TensorRT's --best flag does,
and what Qualcomm AIMET's mixed-precision search implements.
"""
import numpy as np
from dataclasses import dataclass
from typing import Dict, List, Tuple


@dataclass
class LayerInfo:
    name: str
    param_count: int          # number of parameters
    sensitivity: float        # accuracy drop when quantized to INT8
    layer_type: str           # Conv2d or Linear


@dataclass
class PrecisionConfig:
    precision: str            # "FP32", "FP16", "INT8"
    bytes_per_param: int      # 4, 2, 1
    accuracy_recovery: float  # fraction of sensitivity recovered vs INT8


PRECISIONS = {
    "FP32": PrecisionConfig("FP32", 4, 1.0),    # no degradation
    "FP16": PrecisionConfig("FP16", 2, 0.85),   # ~85% recovery vs FP32
    "INT8": PrecisionConfig("INT8", 1, 0.0),    # full quantization noise
}


def build_layer_info_from_sensitivity(sensitivity_results, model) -> List[LayerInfo]:
    """Convert sensitivity scan results into LayerInfo objects."""
    import torch.nn as nn
    layers = []
    param_counts = {}
    for name, module in model.named_modules():
        if isinstance(module, (nn.Conv2d, nn.Linear)):
            param_counts[name] = sum(p.numel() for p in module.parameters())

    for name, ltype, acc, drop in sensitivity_results:
        layers.append(LayerInfo(
            name=name,
            param_count=param_counts.get(name, 0),
            sensitivity=drop,
            layer_type=ltype,
        ))
    return layers


def greedy_mixed_precision(
    layers: List[LayerInfo],
    max_accuracy_drop: float = 0.01,
) -> Dict[str, str]:
    """
    Greedy algorithm for mixed-precision assignment:

    1. Start with all layers at INT8 (smallest model)
    2. Sort layers by sensitivity (most sensitive first)
    3. Upgrade most sensitive layers to FP16, then FP32
       until total accuracy drop < threshold

    This is a greedy approximation — optimal solution would
    require exhaustive search (3^N for N layers).
    """
    # Start all layers at INT8
    assignment = {l.name: "INT8" for l in layers}
    total_drop = sum(l.sensitivity for l in layers)

    # Sort by sensitivity (most sensitive first)
    sorted_layers = sorted(layers, key=lambda l: -l.sensitivity)

    for layer in sorted_layers:
        if total_drop <= max_accuracy_drop:
            break

        # Try upgrading to FP16 first
        recovered = layer.sensitivity * PRECISIONS["FP16"].accuracy_recovery
        if total_drop - recovered <= max_accuracy_drop:
            assignment[layer.name] = "FP16"
            total_drop -= recovered
        else:
            # Need full FP32
            assignment[layer.name] = "FP32"
            total_drop -= layer.sensitivity

    return assignment


def analyze_policy(
    layers: List[LayerInfo],
    assignment: Dict[str, str],
) -> None:
    """Print detailed analysis of the mixed-precision policy."""
    total_params = sum(l.param_count for l in layers)
    total_fp32_bytes = total_params * 4

    mixed_bytes = 0
    counts = {"FP32": 0, "FP16": 0, "INT8": 0}
    for layer in layers:
        prec = assignment[layer.name]
        counts[prec] += 1
        mixed_bytes += layer.param_count * PRECISIONS[prec].bytes_per_param

    int8_bytes = total_params * 1

    print(f"\\n{'='*60}")
    print(f"Mixed-Precision Policy Summary")
    print(f"{'='*60}")
    print(f"Total layers:     {len(layers)}")
    print(f"  FP32 layers:    {counts['FP32']}")
    print(f"  FP16 layers:    {counts['FP16']}")
    print(f"  INT8 layers:    {counts['INT8']}")
    print(f"\\nModel size:")
    print(f"  Full FP32:      {total_fp32_bytes/1e6:.1f} MB")
    print(f"  Full INT8:      {int8_bytes/1e6:.1f} MB")
    print(f"  Mixed-precision: {mixed_bytes/1e6:.1f} MB")
    print(f"  Reduction:       {total_fp32_bytes/mixed_bytes:.1f}x vs FP32")

    print(f"\\nLayer assignments:")
    for layer in layers:
        prec = assignment[layer.name]
        marker = {"FP32": "🔴", "FP16": "🟡", "INT8": "🟢"}[prec]
        print(f"  {marker} {layer.name:<40} {prec:<5} "
              f"params={layer.param_count:>8,}  sens={layer.sensitivity:+.4f}")


# ── Demo with synthetic sensitivity data ─────────────────────
if __name__ == "__main__":
    # Simulated sensitivity results for a MobileNetV2-like model
    np.random.seed(42)
    layer_names = [
        ("features.0.0", "Conv2d", 864),
        ("features.1.conv.0.0", "Conv2d", 288),
        ("features.1.conv.1.0", "Conv2d", 512),
        ("features.2.conv.0.0", "Conv2d", 1536),
        ("features.2.conv.1.0", "Conv2d", 1152),
        ("features.2.conv.2", "Conv2d", 3072),
        ("features.5.conv.0.0", "Conv2d", 18432),
        ("features.5.conv.1.0", "Conv2d", 4608),
        ("features.5.conv.2", "Conv2d", 12288),
        ("features.10.conv.0.0", "Conv2d", 55296),
        ("features.10.conv.1.0", "Conv2d", 9216),
        ("features.10.conv.2", "Conv2d", 30720),
        ("features.17.conv.0.0", "Conv2d", 307200),
        ("features.17.conv.1.0", "Conv2d", 25600),
        ("features.17.conv.2", "Conv2d", 409600),
        ("features.18.0", "Conv2d", 1638400),
        ("classifier.1", "Linear", 12810),
    ]

    # Simulate sensitivity: early and final layers are more sensitive
    sensitivities = [0.035, 0.002, 0.003, 0.001, 0.001, 0.002,
                     0.001, 0.001, 0.001, 0.002, 0.001, 0.001,
                     0.003, 0.002, 0.004, 0.015, 0.008]

    layers = [
        LayerInfo(name=n, param_count=p, sensitivity=s, layer_type=t)
        for (n, t, p), s in zip(layer_names, sensitivities)
    ]

    print("Generating mixed-precision policy (max 1% accuracy drop)...")
    assignment = greedy_mixed_precision(layers, max_accuracy_drop=0.01)
    analyze_policy(layers, assignment)

    print("\\n\\nGenerating aggressive policy (max 0.5% drop)...")
    assignment_tight = greedy_mixed_precision(layers, max_accuracy_drop=0.005)
    analyze_policy(layers, assignment_tight)
`
        },
      ],
    },

    // ──────────────────────────────────────────────────────────
    // Section 4: Pruning & Knowledge Distillation
    // ──────────────────────────────────────────────────────────
    {
      id: "pruning-distillation",
      title: "Pruning & Knowledge Distillation",
      icon: "✂️",
      items: [

        // ── 4.1  Structured Pruning (Filter Pruning) ──
        {
          title: "Structured Filter Pruning with L1 Norm",
          lang: "python",
          filename: "structured_pruning.py",
          desc: "Prune entire Conv2d filters based on L1 norm magnitude. Unlike unstructured pruning, this actually reduces FLOPs and latency without sparse hardware. Includes before/after architecture comparison.",
          code: `"""
Structured Pruning: remove entire convolutional filters.

Unstructured pruning (zeroing individual weights) creates sparse matrices
that need special hardware (sparse tensor cores) to speed up. Most edge
devices don't have this.

Structured pruning removes entire filters → smaller dense matrices →
real speedup on ANY hardware.

Algorithm:
  1. Compute L1 norm of each filter: ||W[c_out]||_1
  2. Rank filters by norm (smallest = least important)
  3. Remove bottom-k% filters
  4. Adjust next layer's input channels to match
  5. Fine-tune to recover accuracy
"""
import torch
import torch.nn as nn
import numpy as np
from collections import OrderedDict


class SimpleCNN(nn.Module):
    """Small CNN to demonstrate structured pruning."""
    def __init__(self, num_classes=10):
        super().__init__()
        self.features = nn.Sequential(OrderedDict([
            ('conv1', nn.Conv2d(3, 64, 3, padding=1)),
            ('bn1', nn.BatchNorm2d(64)),
            ('relu1', nn.ReLU(inplace=True)),
            ('conv2', nn.Conv2d(64, 128, 3, padding=1)),
            ('bn2', nn.BatchNorm2d(128)),
            ('relu2', nn.ReLU(inplace=True)),
            ('pool1', nn.MaxPool2d(2)),
            ('conv3', nn.Conv2d(128, 256, 3, padding=1)),
            ('bn3', nn.BatchNorm2d(256)),
            ('relu3', nn.ReLU(inplace=True)),
            ('pool2', nn.AdaptiveAvgPool2d(1)),
        ]))
        self.classifier = nn.Linear(256, num_classes)

    def forward(self, x):
        x = self.features(x)
        x = x.view(x.size(0), -1)
        return self.classifier(x)


def compute_filter_l1_norms(conv_layer: nn.Conv2d) -> torch.Tensor:
    """Compute L1 norm of each output filter. Shape: (C_out,)"""
    # Weight shape: (C_out, C_in, kH, kW)
    return conv_layer.weight.data.abs().sum(dim=(1, 2, 3))


def prune_conv_layer(conv: nn.Conv2d, bn: nn.BatchNorm2d,
                      next_conv: nn.Conv2d, prune_ratio: float):
    """
    Remove the lowest prune_ratio fraction of filters from conv,
    and adjust bn + next_conv input channels accordingly.

    Returns new (conv, bn, next_conv) modules with smaller dimensions.
    """
    norms = compute_filter_l1_norms(conv)
    n_prune = int(conv.out_channels * prune_ratio)
    n_keep = conv.out_channels - n_prune

    # Indices of filters to keep (highest L1 norm)
    keep_idx = torch.argsort(norms, descending=True)[:n_keep]
    keep_idx = keep_idx.sort().values  # maintain order

    # ── Prune current conv ──
    new_conv = nn.Conv2d(
        conv.in_channels, n_keep, conv.kernel_size,
        stride=conv.stride, padding=conv.padding, bias=conv.bias is not None
    )
    new_conv.weight.data = conv.weight.data[keep_idx]
    if conv.bias is not None:
        new_conv.bias.data = conv.bias.data[keep_idx]

    # ── Prune BatchNorm ──
    new_bn = nn.BatchNorm2d(n_keep)
    new_bn.weight.data = bn.weight.data[keep_idx]
    new_bn.bias.data = bn.bias.data[keep_idx]
    new_bn.running_mean = bn.running_mean[keep_idx]
    new_bn.running_var = bn.running_var[keep_idx]

    # ── Adjust next conv input channels ──
    new_next = nn.Conv2d(
        n_keep, next_conv.out_channels, next_conv.kernel_size,
        stride=next_conv.stride, padding=next_conv.padding,
        bias=next_conv.bias is not None
    )
    new_next.weight.data = next_conv.weight.data[:, keep_idx]
    if next_conv.bias is not None:
        new_next.bias.data = next_conv.bias.data

    return new_conv, new_bn, new_next


def prune_model(model: SimpleCNN, prune_ratios: dict) -> SimpleCNN:
    """
    Apply structured pruning to the model.
    prune_ratios: {layer_name: fraction_to_prune}
    """
    model = model.cpu()

    # Prune conv1 → affects conv2 input
    if 'conv1' in prune_ratios:
        new_c1, new_bn1, new_c2 = prune_conv_layer(
            model.features.conv1, model.features.bn1,
            model.features.conv2, prune_ratios['conv1']
        )
        model.features.conv1 = new_c1
        model.features.bn1 = new_bn1
        model.features.conv2 = new_c2

    # Prune conv2 → affects conv3 input
    if 'conv2' in prune_ratios:
        new_c2, new_bn2, new_c3 = prune_conv_layer(
            model.features.conv2, model.features.bn2,
            model.features.conv3, prune_ratios['conv2']
        )
        model.features.conv2 = new_c2
        model.features.bn2 = new_bn2
        model.features.conv3 = new_c3

    # Prune conv3 → affects classifier input
    if 'conv3' in prune_ratios:
        norms = compute_filter_l1_norms(model.features.conv3)
        n_prune = int(model.features.conv3.out_channels * prune_ratios['conv3'])
        n_keep = model.features.conv3.out_channels - n_prune
        keep_idx = torch.argsort(norms, descending=True)[:n_keep].sort().values

        old_conv3 = model.features.conv3
        new_c3 = nn.Conv2d(old_conv3.in_channels, n_keep, 3, padding=1)
        new_c3.weight.data = old_conv3.weight.data[keep_idx]

        new_bn3 = nn.BatchNorm2d(n_keep)
        new_bn3.weight.data = model.features.bn3.weight.data[keep_idx]
        new_bn3.bias.data = model.features.bn3.bias.data[keep_idx]
        new_bn3.running_mean = model.features.bn3.running_mean[keep_idx]
        new_bn3.running_var = model.features.bn3.running_var[keep_idx]

        new_classifier = nn.Linear(n_keep, model.classifier.out_features)
        new_classifier.weight.data = model.classifier.weight.data[:, keep_idx]
        new_classifier.bias.data = model.classifier.bias.data

        model.features.conv3 = new_c3
        model.features.bn3 = new_bn3
        model.classifier = new_classifier

    return model


def count_params(model):
    return sum(p.numel() for p in model.parameters())


def estimate_flops(model, input_size=(1, 3, 32, 32)):
    """Rough FLOP estimate for conv + linear layers."""
    flops = 0
    x = torch.randn(*input_size)
    hooks = []

    def hook_fn(module, inp, out):
        nonlocal flops
        if isinstance(module, nn.Conv2d):
            # FLOPs = 2 * C_in * K^2 * C_out * H_out * W_out
            _, _, h, w = out.shape
            flops += 2 * module.in_channels * module.kernel_size[0] * \
                     module.kernel_size[1] * module.out_channels * h * w
        elif isinstance(module, nn.Linear):
            flops += 2 * module.in_features * module.out_features

    for m in model.modules():
        if isinstance(m, (nn.Conv2d, nn.Linear)):
            hooks.append(m.register_forward_hook(hook_fn))

    with torch.no_grad():
        model(x)

    for h in hooks:
        h.remove()
    return flops


if __name__ == "__main__":
    model = SimpleCNN()
    model.eval()

    orig_params = count_params(model)
    orig_flops = estimate_flops(model)

    print(f"Original model:")
    print(f"  Parameters: {orig_params:,}")
    print(f"  FLOPs:      {orig_flops:,}")
    for name, m in model.named_modules():
        if isinstance(m, nn.Conv2d):
            print(f"  {name}: {m}")

    # Prune 50% of filters in each layer
    pruned = prune_model(model, {'conv1': 0.5, 'conv2': 0.5, 'conv3': 0.5})

    pruned_params = count_params(pruned)
    pruned_flops = estimate_flops(pruned)

    print(f"\\nPruned model (50% per layer):")
    print(f"  Parameters: {pruned_params:,} ({pruned_params/orig_params*100:.0f}%)")
    print(f"  FLOPs:      {pruned_flops:,} ({pruned_flops/orig_flops*100:.0f}%)")
    for name, m in pruned.named_modules():
        if isinstance(m, nn.Conv2d):
            print(f"  {name}: {m}")

    # Verify forward pass works
    x = torch.randn(2, 3, 32, 32)
    out = pruned(x)
    print(f"\\nForward pass OK: input={x.shape} → output={out.shape}")
`
        },

        // ── 4.2  Knowledge Distillation for Quantized Models ──
        {
          title: "Knowledge Distillation for Quantized Students",
          lang: "python",
          filename: "quant_distillation.py",
          desc: "Distill a large FP32 teacher into a small INT8-bound student. Combines Hinton's soft-target loss with intermediate feature matching. The student is QAT-trained so it directly converts to INT8.",
          code: `"""
Knowledge Distillation specifically designed for quantized deployment.

Standard distillation: teacher soft targets → student training
Quant-aware distillation: teacher soft targets → student with fake-quant nodes

The student learns to:
  1. Match the teacher's output distribution (soft targets)
  2. Tolerate quantization noise (from fake-quant nodes)
  3. Match intermediate feature representations (optional, boosts accuracy)

This combination is more effective than QAT alone, especially when the
student architecture is much smaller (e.g., MobileNet from ResNet teacher).
"""
import torch
import torch.nn as nn
import torch.nn.functional as F


class DistillationLoss(nn.Module):
    """
    Combined loss for quantization-aware distillation:

    L = alpha * L_hard + (1 - alpha) * T^2 * L_soft + beta * L_feature

    L_hard:    standard cross-entropy with ground truth labels
    L_soft:    KL divergence between teacher/student softmax at temperature T
    L_feature: MSE between intermediate feature maps (after projection)
    """
    def __init__(self, temperature=4.0, alpha=0.3, beta=0.1):
        super().__init__()
        self.T = temperature
        self.alpha = alpha
        self.beta = beta
        self.ce = nn.CrossEntropyLoss()
        self.kl = nn.KLDivLoss(reduction='batchmean')

    def forward(self, student_logits, teacher_logits, labels,
                student_features=None, teacher_features=None):
        # ── Hard loss (ground truth) ──
        L_hard = self.ce(student_logits, labels)

        # ── Soft loss (teacher knowledge) ──
        # T^2 scaling compensates for the gradient magnitude reduction
        # when using high temperature (Hinton et al., 2015)
        student_soft = F.log_softmax(student_logits / self.T, dim=1)
        teacher_soft = F.softmax(teacher_logits / self.T, dim=1)
        L_soft = self.kl(student_soft, teacher_soft) * (self.T ** 2)

        # ── Feature matching loss (optional) ──
        L_feat = 0.0
        if student_features is not None and teacher_features is not None:
            for s_feat, t_feat in zip(student_features, teacher_features):
                # Normalize features before comparison
                s_norm = F.normalize(s_feat.view(s_feat.size(0), -1), dim=1)
                t_norm = F.normalize(t_feat.view(t_feat.size(0), -1), dim=1)
                L_feat += F.mse_loss(s_norm, t_norm)
            L_feat /= len(student_features)

        total = (self.alpha * L_hard +
                 (1 - self.alpha) * L_soft +
                 self.beta * L_feat)
        return total, {
            'hard': L_hard.item(),
            'soft': L_soft.item(),
            'feat': L_feat.item() if isinstance(L_feat, torch.Tensor) else L_feat,
            'total': total.item(),
        }


class FeatureProjector(nn.Module):
    """Project student features to match teacher feature dimensions."""
    def __init__(self, student_channels, teacher_channels):
        super().__init__()
        self.proj = nn.Sequential(
            nn.Conv2d(student_channels, teacher_channels, 1, bias=False),
            nn.BatchNorm2d(teacher_channels),
        )

    def forward(self, x):
        return self.proj(x)


def distill_with_qat(teacher, student, train_loader, device='cpu',
                      epochs=10, lr=1e-3, temperature=4.0):
    """
    Full distillation pipeline with QAT on the student.

    1. Teacher is frozen in eval mode (FP32)
    2. Student has fake-quant nodes (QAT mode)
    3. Train with combined distillation + hard label loss
    4. Convert student to INT8 after training
    """
    teacher.eval()
    teacher.to(device)
    for p in teacher.parameters():
        p.requires_grad = False

    student.train()
    student.to(device)

    # Set up QAT on student
    student.qconfig = torch.quantization.get_default_qat_qconfig('x86')
    torch.quantization.prepare_qat(student, inplace=True)

    criterion = DistillationLoss(temperature=temperature, alpha=0.3, beta=0.0)
    optimizer = torch.optim.Adam(student.parameters(), lr=lr)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)

    for epoch in range(epochs):
        student.train()
        epoch_loss = 0.0
        n_batches = 0

        for x, y in train_loader:
            x, y = x.to(device), y.to(device)

            with torch.no_grad():
                teacher_logits = teacher(x)

            student_logits = student(x)
            loss, metrics = criterion(student_logits, teacher_logits, y)

            optimizer.zero_grad()
            loss.backward()
            optimizer.step()

            epoch_loss += metrics['total']
            n_batches += 1

        scheduler.step()

        # Freeze BN + observers after 60% of training
        if epoch >= int(0.6 * epochs):
            student.apply(torch.nn.intrinsic.qat.freeze_bn_stats)
            student.apply(torch.quantization.disable_observer)

        avg_loss = epoch_loss / n_batches
        print(f"Epoch {epoch+1}/{epochs}  loss={avg_loss:.4f}  "
              f"(hard={metrics['hard']:.3f}  soft={metrics['soft']:.3f})")

    # Convert to INT8
    student.eval()
    student_int8 = torch.quantization.convert(student, inplace=False)
    return student_int8


# ── Demo ─────────────────────────────────────────────────────
if __name__ == "__main__":
    import torchvision.models as models

    # Teacher: ResNet-18 (larger)
    teacher = models.resnet18(pretrained=True)
    teacher.fc = nn.Linear(512, 10)

    # Student: MobileNetV2 (smaller, will be quantized)
    student = models.mobilenet_v2(pretrained=True)
    student.classifier[1] = nn.Linear(1280, 10)

    # Dummy data for demonstration
    dummy_loader = torch.utils.data.DataLoader(
        torch.utils.data.TensorDataset(
            torch.randn(256, 3, 224, 224),
            torch.randint(0, 10, (256,))
        ),
        batch_size=32, shuffle=True,
    )

    print("Teacher params:", sum(p.numel() for p in teacher.parameters()))
    print("Student params:", sum(p.numel() for p in student.parameters()))

    print("\\nStarting QAT distillation...")
    student_int8 = distill_with_qat(
        teacher, student, dummy_loader,
        epochs=3, temperature=4.0,
    )
    print("\\nDistillation complete. Student converted to INT8.")
`
        },
      ],
    },

    // ──────────────────────────────────────────────────────────
    // Section 5: ONNX Optimization & Export
    // ──────────────────────────────────────────────────────────
    {
      id: "onnx-optimization",
      title: "ONNX Optimization & Graph Transforms",
      icon: "🔄",
      items: [

        // ── 5.1  Export & Optimize ONNX Graph ──
        {
          title: "ONNX Export, Optimization & Quantization",
          lang: "python",
          filename: "onnx_optimize.py",
          desc: "Export PyTorch model to ONNX, apply graph optimizations (constant folding, operator fusion, dead code elimination), then quantize with ONNX Runtime. The standard production pipeline for edge deployment.",
          code: `"""
ONNX Export & Optimization Pipeline.

ONNX (Open Neural Network Exchange) is the lingua franca for deploying
models across different inference engines:
  - ONNX Runtime (CPU/GPU/NPU)
  - TensorRT (NVIDIA GPUs)
  - OpenVINO (Intel)
  - CoreML (Apple)
  - QNN (Qualcomm)

Pipeline:
  1. Export PyTorch model → ONNX
  2. Validate the ONNX graph
  3. Optimize: constant folding, operator fusion, shape inference
  4. Quantize: static INT8 with calibration
  5. Benchmark original vs optimized vs quantized
"""
import torch
import torch.nn as nn
import numpy as np
import onnx
from onnx import shape_inference
import onnxruntime as ort
from onnxruntime.quantization import (
    quantize_static,
    CalibrationDataReader,
    QuantType,
    QuantFormat,
)
import time
import tempfile
import os


def build_model():
    """EfficientNet-like small model for demo."""
    import torchvision.models as models
    model = models.mobilenet_v2(pretrained=True)
    model.classifier[1] = nn.Linear(1280, 10)
    model.eval()
    return model


# ── Step 1: Export to ONNX ───────────────────────────────────
def export_to_onnx(model, output_path, input_shape=(1, 3, 224, 224)):
    dummy_input = torch.randn(*input_shape)

    torch.onnx.export(
        model,
        dummy_input,
        output_path,
        input_names=['input'],
        output_names=['output'],
        dynamic_axes={
            'input': {0: 'batch_size'},
            'output': {0: 'batch_size'},
        },
        opset_version=17,
        do_constant_folding=True,  # fold BN into conv during export
    )
    print(f"Exported ONNX model to {output_path}")

    # Validate
    model_onnx = onnx.load(output_path)
    onnx.checker.check_model(model_onnx)
    print(f"ONNX model validated. Nodes: {len(model_onnx.graph.node)}")
    return output_path


# ── Step 2: Optimize ONNX graph ─────────────────────────────
def optimize_onnx(input_path, output_path):
    """Apply ONNX graph optimizations."""
    # Shape inference (required for some optimizations)
    model = onnx.load(input_path)
    model = shape_inference.infer_shapes(model)

    # Use ONNX Runtime's built-in graph optimizations
    sess_options = ort.SessionOptions()
    sess_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
    sess_options.optimized_model_filepath = output_path

    # Creating session triggers optimization and saves
    ort.InferenceSession(input_path, sess_options,
                          providers=['CPUExecutionProvider'])

    opt_model = onnx.load(output_path)
    print(f"Optimized model. Nodes: {len(opt_model.graph.node)}")

    # List applied optimizations
    orig_nodes = len(onnx.load(input_path).graph.node)
    opt_nodes = len(opt_model.graph.node)
    print(f"  Node reduction: {orig_nodes} → {opt_nodes} "
          f"({(1 - opt_nodes/orig_nodes)*100:.0f}% fewer ops)")

    return output_path


# ── Step 3: Static INT8 Quantization ────────────────────────
class RandomCalibrationReader(CalibrationDataReader):
    """Calibration data reader for ONNX Runtime quantization."""
    def __init__(self, input_name, n_samples=100, input_shape=(1, 3, 224, 224)):
        self.data = iter([
            {input_name: np.random.randn(*input_shape).astype(np.float32)}
            for _ in range(n_samples)
        ])

    def get_next(self):
        return next(self.data, None)


def quantize_onnx(input_path, output_path):
    """Apply static INT8 quantization with calibration."""
    # Get input name from model
    model = onnx.load(input_path)
    input_name = model.graph.input[0].name

    calibration_reader = RandomCalibrationReader(
        input_name, n_samples=100
    )

    quantize_static(
        input_path,
        output_path,
        calibration_reader,
        quant_format=QuantFormat.QDQ,       # Quantize-Dequantize nodes
        per_channel=True,                    # per-channel weight quantization
        weight_type=QuantType.QInt8,
        activation_type=QuantType.QUInt8,
    )

    quant_model = onnx.load(output_path)
    print(f"Quantized model. Nodes: {len(quant_model.graph.node)}")
    return output_path


# ── Step 4: Benchmark ────────────────────────────────────────
def benchmark_onnx(model_path, label, n_runs=100):
    sess = ort.InferenceSession(model_path,
                                 providers=['CPUExecutionProvider'])
    input_name = sess.get_inputs()[0].name
    x = np.random.randn(1, 3, 224, 224).astype(np.float32)

    # Warmup
    for _ in range(10):
        sess.run(None, {input_name: x})

    # Timed runs
    start = time.perf_counter()
    for _ in range(n_runs):
        sess.run(None, {input_name: x})
    elapsed = (time.perf_counter() - start) / n_runs * 1000

    file_size = os.path.getsize(model_path) / 1e6

    print(f"{label:<25} size={file_size:>6.1f}MB  latency={elapsed:>6.1f}ms")
    return elapsed, file_size


# ── Main pipeline ────────────────────────────────────────────
if __name__ == "__main__":
    tmpdir = tempfile.mkdtemp()
    paths = {
        'original': os.path.join(tmpdir, 'model.onnx'),
        'optimized': os.path.join(tmpdir, 'model_opt.onnx'),
        'quantized': os.path.join(tmpdir, 'model_int8.onnx'),
    }

    print("=" * 60)
    print("ONNX Export → Optimize → Quantize Pipeline")
    print("=" * 60)

    # Build and export
    model = build_model()
    export_to_onnx(model, paths['original'])

    # Optimize
    print()
    optimize_onnx(paths['original'], paths['optimized'])

    # Quantize
    print()
    quantize_onnx(paths['optimized'], paths['quantized'])

    # Benchmark all variants
    print(f"\\n{'='*60}")
    print("Benchmark Results")
    print(f"{'='*60}")
    results = {}
    for label, path in paths.items():
        lat, size = benchmark_onnx(path, label.capitalize())
        results[label] = (lat, size)

    orig_lat, orig_size = results['original']
    quant_lat, quant_size = results['quantized']
    print(f"\\nSpeedup (quantized vs original): {orig_lat/quant_lat:.1f}x")
    print(f"Size reduction:                  {orig_size/quant_size:.1f}x")
`
        },

        // ── 5.2  GPTQ-Style Weight-Only Quantization ──
        {
          title: "GPTQ-Style Weight-Only Quantization",
          lang: "python",
          filename: "gptq_quantize.py",
          desc: "Implement the GPTQ algorithm: layer-wise weight quantization using Hessian-based error compensation. The technique behind 4-bit LLM quantization (llama.cpp, GGUF, TheBloke models).",
          code: `"""
GPTQ: Accurate Post-Training Quantization for Generative Models.
Simplified implementation of the core algorithm from Frantar et al., 2022.

GPTQ is a second-order weight quantization method:
  1. For each layer, collect the Hessian H = 2 * X^T @ X (from calibration data)
  2. Quantize weights column by column
  3. After quantizing each column, distribute the quantization error
     to remaining unquantized columns using the Hessian inverse

This "error compensation" is what makes GPTQ dramatically better than
naive round-to-nearest quantization, especially at INT4/INT3 precision.

Used in: AutoGPTQ, llama.cpp, GGML/GGUF, ExLlama, vLLM
"""
import torch
import torch.nn as nn
import numpy as np
import math


def quantize_weight_rtn(w, n_bits=4, group_size=128):
    """
    Round-to-nearest (RTN) quantization — the naive baseline.
    Quantize in groups for better accuracy (group quantization).
    """
    assert w.dim() == 2, "Expected 2D weight matrix"
    rows, cols = w.shape

    if group_size < 0:
        group_size = cols

    q_weight = torch.zeros_like(w, dtype=torch.int8)
    scales = torch.zeros(rows, (cols + group_size - 1) // group_size)
    zeros = torch.zeros_like(scales)

    qmin = -(1 << (n_bits - 1))
    qmax = (1 << (n_bits - 1)) - 1

    for g in range(0, cols, group_size):
        g_end = min(g + group_size, cols)
        group = w[:, g:g_end]
        g_idx = g // group_size

        # Symmetric quantization per group
        abs_max = group.abs().amax(dim=1, keepdim=True).clamp(min=1e-8)
        scale = abs_max / qmax
        scales[:, g_idx] = scale.squeeze()

        q = torch.clamp(torch.round(group / scale), qmin, qmax).to(torch.int8)
        q_weight[:, g:g_end] = q

    return q_weight, scales, zeros


def gptq_quantize_layer(weight, hessian, n_bits=4, group_size=128,
                          block_size=128, damp_percent=0.01):
    """
    GPTQ quantization of a single weight matrix.

    Args:
        weight:  (out_features, in_features) FP32 weight matrix
        hessian: (in_features, in_features) Hessian matrix H = 2*X^T@X
        n_bits:  target bit width
        group_size: quantization group size (-1 for per-tensor)
        block_size: process this many columns at once (for efficiency)
        damp_percent: Hessian damping for numerical stability

    Returns:
        q_weight: quantized weight (int8 storage)
        scales: per-group quantization scales
    """
    W = weight.clone().float()
    rows, cols = W.shape
    H = hessian.clone().float()

    qmin = -(1 << (n_bits - 1))
    qmax = (1 << (n_bits - 1)) - 1

    # Damping for numerical stability
    damp = damp_percent * torch.diag(H).mean()
    H.diagonal().add_(damp)

    # Cholesky decomposition of H^{-1}
    # We need H^{-1} for error compensation
    try:
        H_inv = torch.linalg.cholesky(H)
        H_inv = torch.cholesky_inverse(H_inv)
    except RuntimeError:
        # Fall back to pseudo-inverse if not positive definite
        H_inv = torch.linalg.pinv(H)

    Hinv_diag = torch.diag(H_inv)

    # Output containers
    Q = torch.zeros_like(W, dtype=torch.int8)
    scales = torch.zeros(rows, (cols + group_size - 1) // group_size)
    total_error = 0.0

    # Process columns in blocks
    for col_start in range(0, cols, block_size):
        col_end = min(col_start + block_size, cols)
        block_cols = list(range(col_start, col_end))

        # Error accumulator for this block
        err = torch.zeros(rows, len(block_cols))

        for i, col in enumerate(block_cols):
            w_col = W[:, col]

            # Determine quantization parameters for this column's group
            g_idx = col // group_size
            g_start = g_idx * group_size
            g_end = min(g_start + group_size, cols)

            # Compute scale from the current (possibly error-compensated) weights
            group_w = W[:, g_start:g_end]
            abs_max = group_w.abs().amax(dim=1).clamp(min=1e-8)
            scale = abs_max / qmax
            scales[:, g_idx] = scale

            # Quantize this column
            q_col = torch.clamp(torch.round(w_col / scale), qmin, qmax)
            Q[:, col] = q_col.to(torch.int8)

            # Dequantize to get quantization error
            w_hat = q_col * scale
            error = (w_col - w_hat) / Hinv_diag[col].clamp(min=1e-8)

            # Distribute error to remaining columns in this block
            # This is the key GPTQ insight: use Hessian to optimally
            # distribute quantization error
            for j in range(i + 1, len(block_cols)):
                other_col = block_cols[j]
                # W[:, other_col] += error * H_inv[col, other_col]
                W[:, other_col] += error * H_inv[col, other_col]

            total_error += (error ** 2).sum().item()

    return Q, scales, total_error


# ── Demo: Compare RTN vs GPTQ ───────────────────────────────
if __name__ == "__main__":
    torch.manual_seed(42)

    # Simulate a Linear layer weight matrix
    out_features, in_features = 256, 512
    W = torch.randn(out_features, in_features) * 0.02

    # Simulate calibration data and compute Hessian
    n_cal = 128
    X_cal = torch.randn(n_cal, in_features)
    H = 2.0 * (X_cal.T @ X_cal) / n_cal  # Hessian approximation

    print(f"Weight matrix: ({out_features}, {in_features})")
    print(f"Calibration samples: {n_cal}")

    for n_bits in [8, 4, 3]:
        print(f"\\n{'='*60}")
        print(f"{n_bits}-bit Quantization Comparison")
        print(f"{'='*60}")

        # RTN (naive round-to-nearest)
        Q_rtn, S_rtn, _ = quantize_weight_rtn(W, n_bits=n_bits, group_size=128)
        W_rtn = Q_rtn.float() * S_rtn.repeat_interleave(128, dim=1)[:, :in_features]
        mse_rtn = ((W - W_rtn) ** 2).mean().item()

        # GPTQ (Hessian-compensated)
        Q_gptq, S_gptq, err = gptq_quantize_layer(
            W, H, n_bits=n_bits, group_size=128
        )
        W_gptq = Q_gptq.float() * S_gptq.repeat_interleave(128, dim=1)[:, :in_features]
        mse_gptq = ((W - W_gptq) ** 2).mean().item()

        # Compute output error (what matters for model accuracy)
        Y_ref = X_cal @ W.T
        Y_rtn = X_cal @ W_rtn.T
        Y_gptq = X_cal @ W_gptq.T
        out_mse_rtn = ((Y_ref - Y_rtn) ** 2).mean().item()
        out_mse_gptq = ((Y_ref - Y_gptq) ** 2).mean().item()

        print(f"  {'Method':<10} {'Weight MSE':>15} {'Output MSE':>15}")
        print(f"  {'RTN':<10} {mse_rtn:>15.2e} {out_mse_rtn:>15.2e}")
        print(f"  {'GPTQ':<10} {mse_gptq:>15.2e} {out_mse_gptq:>15.2e}")
        improvement = out_mse_rtn / max(out_mse_gptq, 1e-20)
        print(f"  GPTQ reduces output error by {improvement:.1f}x")
`
        },
      ],
    },
  ];
})();
