// Patches the CV Foundations module (m16) with comprehensive code examples.
// Loaded after curriculum.js and lessons.js.
// m16 = CURRICULUM.phases[5].modules[0]
(function patchCVFoundationsExamples() {
  const m = CURRICULUM.phases[5].modules[0];

  m.codeExamples = [

    // ──────────────────────────────────────────────────────────
    // Section 1: Conv2D from Scratch
    // ──────────────────────────────────────────────────────────
    {
      id: "conv2d-scratch",
      title: "Conv2D from Scratch",
      icon: "🔧",
      items: [

        // ── 1.1  Conv2D Forward & Backward (NumPy im2col) ──
        {
          title: "Conv2D Forward & Backward (NumPy im2col)",
          lang: "python",
          filename: "conv2d_im2col.py",
          desc: "Full Conv2D layer with im2col-based forward pass and col2im backward pass. Computes dL/dW, dL/db, dL/dX analytically — the same algorithm cuDNN uses under the hood.",
          code: `"""
Conv2D layer implemented from scratch with im2col / col2im.
Mirrors the algorithm cuDNN uses: reshape the convolution into a
matrix multiply so we can leverage optimised BLAS routines (np.dot).
"""
import numpy as np


# ── im2col / col2im helpers ────────────────────────────────
def im2col(X, kH, kW, stride=1, pad=0):
    """
    Convert image patches into columns for GEMM-based convolution.
    X: (N, C, H, W)  →  col: (N*out_h*out_w, C*kH*kW)
    """
    N, C, H, W = X.shape
    # Pad spatial dims only (not batch / channel)
    X_pad = np.pad(X, ((0, 0), (0, 0), (pad, pad), (pad, pad)), mode="constant")
    out_h = (H + 2 * pad - kH) // stride + 1
    out_w = (W + 2 * pad - kW) // stride + 1

    # Pre-allocate the column matrix
    col = np.zeros((N, C, kH, kW, out_h, out_w), dtype=X.dtype)
    for y in range(kH):
        y_max = y + stride * out_h
        for x in range(kW):
            x_max = x + stride * out_w
            col[:, :, y, x, :, :] = X_pad[:, :, y:y_max:stride, x:x_max:stride]

    # Reshape: (N, C, kH, kW, out_h, out_w) → (N*out_h*out_w, C*kH*kW)
    col = col.transpose(0, 4, 5, 1, 2, 3).reshape(N * out_h * out_w, -1)
    return col


def col2im(col, X_shape, kH, kW, stride=1, pad=0):
    """
    Inverse of im2col — scatter column gradients back to image layout.
    col: (N*out_h*out_w, C*kH*kW)  →  X_grad: (N, C, H, W)
    """
    N, C, H, W = X_shape
    out_h = (H + 2 * pad - kH) // stride + 1
    out_w = (W + 2 * pad - kW) // stride + 1

    col = col.reshape(N, out_h, out_w, C, kH, kW).transpose(0, 3, 4, 5, 1, 2)
    X_pad = np.zeros((N, C, H + 2 * pad, W + 2 * pad), dtype=col.dtype)

    for y in range(kH):
        y_max = y + stride * out_h
        for x in range(kW):
            x_max = x + stride * out_w
            # Accumulate (+=) because multiple patches overlap
            X_pad[:, :, y:y_max:stride, x:x_max:stride] += col[:, :, y, x, :, :]

    # Strip padding if it was applied
    if pad > 0:
        return X_pad[:, :, pad:-pad, pad:-pad]
    return X_pad


# ── Conv2D layer ───────────────────────────────────────────
class Conv2D:
    """
    2-D convolution using im2col.
    Weights: (F, C, kH, kW)   Bias: (F,)
    """
    def __init__(self, in_ch, out_ch, kernel_size, stride=1, pad=0):
        self.stride, self.pad = stride, pad
        self.kH = self.kW = kernel_size
        # Kaiming He initialisation (fan-in)
        fan_in = in_ch * kernel_size * kernel_size
        self.W = np.random.randn(out_ch, in_ch, kernel_size, kernel_size) * np.sqrt(2.0 / fan_in)
        self.b = np.zeros(out_ch)
        # Gradient buffers (populated in backward)
        self.dW, self.db, self.dX = None, None, None

    def forward(self, X):
        """
        X: (N, C, H, W) → out: (N, F, out_h, out_w)
        """
        self.X_shape = X.shape
        N, C, H, W = X.shape
        F = self.W.shape[0]
        out_h = (H + 2 * self.pad - self.kH) // self.stride + 1
        out_w = (W + 2 * self.pad - self.kW) // self.stride + 1

        # Step 1: unfold input into column matrix
        self.col = im2col(X, self.kH, self.kW, self.stride, self.pad)
        # Step 2: reshape filters → (F, C*kH*kW)
        self.W_col = self.W.reshape(F, -1)
        # Step 3: GEMM — (N*out_h*out_w, C*kH*kW) @ (C*kH*kW, F) → (N*out_h*out_w, F)
        out = self.col @ self.W_col.T + self.b  # broadcast bias
        # Step 4: reshape to spatial output
        out = out.reshape(N, out_h, out_w, F).transpose(0, 3, 1, 2)
        return out

    def backward(self, dout):
        """
        dout: (N, F, out_h, out_w)
        Computes dL/dW, dL/db, dL/dX and stores them on self.
        """
        N, F, out_h, out_w = dout.shape

        # Reshape dout to (N*out_h*out_w, F)
        dout_flat = dout.transpose(0, 2, 3, 1).reshape(-1, F)

        # ── dL/dW = col^T @ dout_flat  →  (C*kH*kW, F) ──
        self.dW = (self.col.T @ dout_flat).T.reshape(self.W.shape)

        # ── dL/db = sum over all spatial positions + batch ──
        self.db = dout_flat.sum(axis=0)

        # ── dL/dX = col2im(dout_flat @ W_col) ──
        dcol = dout_flat @ self.W_col  # (N*out_h*out_w, C*kH*kW)
        self.dX = col2im(dcol, self.X_shape, self.kH, self.kW, self.stride, self.pad)
        return self.dX


# ── Quick smoke test ───────────────────────────────────────
if __name__ == "__main__":
    np.random.seed(42)
    conv = Conv2D(in_ch=3, out_ch=8, kernel_size=3, stride=1, pad=1)
    X = np.random.randn(2, 3, 8, 8)   # batch=2, 3-channel, 8×8
    out = conv.forward(X)
    print(f"Forward  → output shape: {out.shape}")  # (2, 8, 8, 8)
    dout = np.random.randn(*out.shape)
    dX = conv.backward(dout)
    print(f"Backward → dX shape:     {dX.shape}")   # (2, 3, 8, 8)
    print(f"           dW shape:     {conv.dW.shape}")
    print(f"           db shape:     {conv.db.shape}")
`
        },

        // ── 1.2  Gradient Checker for Custom Layers ──
        {
          title: "Gradient Checker for Custom Layers",
          lang: "python",
          filename: "grad_check.py",
          desc: "Finite-difference gradient verification (two-sided) to validate any custom layer's analytical backward pass. Essential debugging tool when writing new ops.",
          code: `"""
Numerical gradient checker using the two-sided finite difference:
    df/dx ≈ [f(x+h) - f(x-h)] / (2h)
Works with any layer that exposes .forward(X) and .backward(dout).
"""
import numpy as np


def numerical_gradient(layer, X, dout, param_name="W", eps=1e-5):
    """
    Compute numerical gradient of loss = sum(dout * forward(X))
    w.r.t. the named parameter (e.g. 'W' or 'b').
    """
    param = getattr(layer, param_name)
    num_grad = np.zeros_like(param)

    # Iterate over every element in the parameter tensor
    it = np.nditer(param, flags=["multi_index"], op_flags=["readwrite"])
    while not it.finished:
        idx = it.multi_index
        orig = param[idx]

        # f(x + h)
        param[idx] = orig + eps
        out_plus = layer.forward(X)
        loss_plus = np.sum(dout * out_plus)

        # f(x - h)
        param[idx] = orig - eps
        out_minus = layer.forward(X)
        loss_minus = np.sum(dout * out_minus)

        # Two-sided difference
        num_grad[idx] = (loss_plus - loss_minus) / (2 * eps)

        # Restore original value
        param[idx] = orig
        it.iternext()

    return num_grad


def gradient_check(layer, X, dout, param_name="W", eps=1e-5, tol=1e-5):
    """
    Compare analytical gradient (from backward()) against numerical gradient.
    Returns max relative error — should be < 1e-5 for fp64.
    """
    # Analytical: run forward + backward to populate layer.dW / layer.db
    layer.forward(X)
    layer.backward(dout)
    analytical = getattr(layer, "d" + param_name)

    # Numerical: finite-difference over the same parameter
    numerical = numerical_gradient(layer, X, dout, param_name, eps)

    # Relative error: |a - n| / max(|a|, |n|, tiny)
    diff = np.abs(analytical - numerical)
    denom = np.maximum(np.abs(analytical), np.abs(numerical)) + 1e-12
    rel_error = diff / denom
    max_err = np.max(rel_error)

    status = "PASS" if max_err < tol else "FAIL"
    print(f"[{status}] d{param_name} max relative error: {max_err:.2e}  (tol={tol:.0e})")
    return max_err


# ── Example: verify Conv2D gradients ──────────────────────
if __name__ == "__main__":
    # Import our custom Conv2D from the previous example
    from conv2d_im2col import Conv2D

    np.random.seed(0)
    conv = Conv2D(in_ch=2, out_ch=3, kernel_size=3, stride=1, pad=1)
    X = np.random.randn(1, 2, 4, 4)
    dout = np.random.randn(1, 3, 4, 4)

    gradient_check(conv, X, dout, param_name="W", tol=1e-5)
    gradient_check(conv, X, dout, param_name="b", tol=1e-5)
`
        },

        // ── 1.3  3-Layer CNN on CIFAR-10 (Pure NumPy) ──
        {
          title: "3-Layer CNN on CIFAR-10 (Pure NumPy)",
          lang: "python",
          filename: "numpy_cnn_cifar10.py",
          desc: "End-to-end training loop with hand-rolled Conv2D, ReLU, MaxPool, and fully-connected layers on CIFAR-10. SGD with momentum. No frameworks.",
          code: `"""
3-layer CNN on CIFAR-10 — entirely in NumPy.
Architecture: Conv(3→16,3x3) → ReLU → MaxPool(2)
              Conv(16→32,3x3) → ReLU → MaxPool(2)
              FC(32*8*8 → 10) → Softmax + Cross-Entropy
Uses the Conv2D from conv2d_im2col.py.
"""
import numpy as np
from conv2d_im2col import Conv2D


# ── Activation / Pooling layers ───────────────────────────
class ReLU:
    def forward(self, X):
        self.mask = (X > 0).astype(X.dtype)
        return X * self.mask

    def backward(self, dout):
        return dout * self.mask


class MaxPool2x2:
    """Non-overlapping 2×2 max pool via reshape trick."""
    def forward(self, X):
        N, C, H, W = X.shape
        self.X_shape = X.shape
        # Reshape into 2×2 blocks → take max over block axes
        X_reshaped = X.reshape(N, C, H // 2, 2, W // 2, 2)
        self.out = X_reshaped.max(axis=(3, 5))
        # Store argmax mask for backward
        self.mask = (X_reshaped == self.out[:, :, :, None, :, None])
        return self.out

    def backward(self, dout):
        # Distribute gradient only to max positions
        dout_expanded = dout[:, :, :, None, :, None]
        dX = (self.mask * dout_expanded).reshape(self.X_shape)
        return dX


class FCLayer:
    """Fully connected layer with Kaiming init."""
    def __init__(self, in_dim, out_dim):
        self.W = np.random.randn(in_dim, out_dim) * np.sqrt(2.0 / in_dim)
        self.b = np.zeros(out_dim)
        self.dW, self.db = None, None

    def forward(self, X):
        self.X = X
        return X @ self.W + self.b

    def backward(self, dout):
        self.dW = self.X.T @ dout
        self.db = dout.sum(axis=0)
        return dout @ self.W.T


# ── Loss ───────────────────────────────────────────────────
def softmax_cross_entropy(logits, labels):
    """Numerically stable softmax + cross-entropy. Returns loss, dlogits."""
    # Shift for stability
    shifted = logits - logits.max(axis=1, keepdims=True)
    exp_s = np.exp(shifted)
    probs = exp_s / exp_s.sum(axis=1, keepdims=True)

    N = logits.shape[0]
    # Cross-entropy loss
    log_probs = -np.log(probs[np.arange(N), labels] + 1e-12)
    loss = log_probs.mean()

    # Gradient of loss w.r.t. logits
    dlogits = probs.copy()
    dlogits[np.arange(N), labels] -= 1
    dlogits /= N
    return loss, dlogits


# ── Network assembly ──────────────────────────────────────
class SimpleCNN:
    def __init__(self):
        # Conv block 1: 3→16 channels, 3×3, pad=1 → 32×32 preserved
        self.conv1 = Conv2D(3, 16, kernel_size=3, stride=1, pad=1)
        self.relu1 = ReLU()
        self.pool1 = MaxPool2x2()  # → 16×16

        # Conv block 2: 16→32 channels
        self.conv2 = Conv2D(16, 32, kernel_size=3, stride=1, pad=1)
        self.relu2 = ReLU()
        self.pool2 = MaxPool2x2()  # → 8×8

        # Classifier
        self.fc = FCLayer(32 * 8 * 8, 10)

        # Ordered params for SGD
        self.param_layers = [self.conv1, self.conv2, self.fc]

    def forward(self, X):
        h = self.pool1.forward(self.relu1.forward(self.conv1.forward(X)))
        h = self.pool2.forward(self.relu2.forward(self.conv2.forward(h)))
        self.flat_shape = h.shape
        h = h.reshape(h.shape[0], -1)  # flatten
        return self.fc.forward(h)

    def backward(self, dlogits):
        dh = self.fc.backward(dlogits)
        dh = dh.reshape(self.flat_shape)
        dh = self.conv2.backward(self.relu2.backward(self.pool2.backward(dh)))
        dh = self.conv1.backward(self.relu1.backward(self.pool1.backward(dh)))
        return dh


# ── SGD with momentum ────────────────────────────────────
def sgd_momentum(layers, lr=0.01, momentum=0.9, velocities=None):
    """Update W, b for each layer using SGD + momentum."""
    if velocities is None:
        velocities = {}
    for layer in layers:
        for pname in ("W", "b"):
            p = getattr(layer, pname)
            dp = getattr(layer, "d" + pname)
            key = (id(layer), pname)
            v = velocities.get(key, np.zeros_like(p))
            v = momentum * v - lr * dp
            setattr(layer, pname, p + v)
            velocities[key] = v
    return velocities


# ── Training loop (synthetic data demo) ──────────────────
if __name__ == "__main__":
    np.random.seed(42)
    net = SimpleCNN()
    velocities = None

    # Synthetic CIFAR-10-shaped data (replace with real dataset)
    N_train = 128
    X_train = np.random.randn(N_train, 3, 32, 32).astype(np.float32)
    y_train = np.random.randint(0, 10, size=N_train)

    batch_size, epochs, lr = 32, 5, 0.01
    for epoch in range(epochs):
        # Shuffle
        perm = np.random.permutation(N_train)
        X_train, y_train = X_train[perm], y_train[perm]
        epoch_loss = 0.0
        n_batches = 0

        for i in range(0, N_train, batch_size):
            Xb = X_train[i:i + batch_size]
            yb = y_train[i:i + batch_size]

            logits = net.forward(Xb)
            loss, dlogits = softmax_cross_entropy(logits, yb)
            net.backward(dlogits)
            velocities = sgd_momentum(net.param_layers, lr=lr, velocities=velocities)

            epoch_loss += loss
            n_batches += 1

        print(f"Epoch {epoch + 1}/{epochs}  loss={epoch_loss / n_batches:.4f}")
`
        }

      ]
    },

    // ──────────────────────────────────────────────────────────
    // Section 2: Architecture Implementations
    // ──────────────────────────────────────────────────────────
    {
      id: "arch-implementations",
      title: "Architecture Implementations",
      icon: "🏗️",
      items: [

        // ── 2.1  MobileNetV2 Inverted Residual Block ──
        {
          title: "MobileNetV2 Inverted Residual Block (PyTorch)",
          lang: "python",
          filename: "mobilenetv2_block.py",
          desc: "Depthwise separable convolution with expansion factor, implemented using unfold for manual depthwise conv rather than the groups=in_channels shortcut. Includes the inverted residual skip connection.",
          code: `"""
MobileNetV2 Inverted Residual Block — manual depthwise conv via unfold.
Instead of nn.Conv2d(groups=in_channels), we use unfold to extract patches
and apply per-channel filters explicitly. This teaches what 'depthwise'
really means at the tensor level.

Architecture per block:
  1×1 Pointwise expand  →  BN → ReLU6
  3×3 Depthwise         →  BN → ReLU6
  1×1 Pointwise project →  BN
  + residual skip (if stride=1 and in_ch == out_ch)
"""
import torch
import torch.nn as nn
import torch.nn.functional as F


class ManualDepthwiseConv2d(nn.Module):
    """
    Depthwise conv via unfold: each channel gets its own 3×3 filter.
    No cross-channel mixing — that's the 'depthwise' guarantee.
    """
    def __init__(self, channels, kernel_size=3, stride=1, padding=1):
        super().__init__()
        self.channels = channels
        self.kernel_size = kernel_size
        self.stride = stride
        self.padding = padding
        # One kH×kW filter per channel — shape (C, kH*kW)
        self.weight = nn.Parameter(
            torch.randn(channels, kernel_size * kernel_size) * (2.0 / (kernel_size * kernel_size)) ** 0.5
        )
        self.bias = nn.Parameter(torch.zeros(channels))

    def forward(self, x):
        N, C, H, W = x.shape
        assert C == self.channels, "Input channels must match depthwise filter count"

        # unfold extracts sliding local blocks: (N, C*kH*kW, L)
        # where L = out_h * out_w
        x_unf = F.unfold(x, kernel_size=self.kernel_size,
                         padding=self.padding, stride=self.stride)

        # Reshape to (N, C, kH*kW, L) so we can dot each channel
        # with its own filter independently
        out_h = (H + 2 * self.padding - self.kernel_size) // self.stride + 1
        out_w = (W + 2 * self.padding - self.kernel_size) // self.stride + 1
        L = out_h * out_w
        x_unf = x_unf.view(N, C, self.kernel_size * self.kernel_size, L)

        # Per-channel dot product: weight (C, kH*kW) → (1, C, kH*kW, 1)
        w = self.weight.unsqueeze(0).unsqueeze(-1)  # (1, C, kH*kW, 1)
        out = (x_unf * w).sum(dim=2)                # (N, C, L)
        out = out + self.bias.view(1, -1, 1)         # add per-channel bias

        return out.view(N, C, out_h, out_w)


class InvertedResidualBlock(nn.Module):
    """
    MobileNetV2 inverted residual:
    thin → expand (1×1) → depthwise (3×3) → project (1×1) → thin
    """
    def __init__(self, in_ch, out_ch, stride=1, expand_ratio=6):
        super().__init__()
        mid_ch = in_ch * expand_ratio
        self.use_residual = (stride == 1 and in_ch == out_ch)

        layers = []

        # Expansion phase (skip if ratio == 1, like first block)
        if expand_ratio != 1:
            layers.extend([
                nn.Conv2d(in_ch, mid_ch, 1, bias=False),
                nn.BatchNorm2d(mid_ch),
                nn.ReLU6(inplace=True),
            ])

        # Depthwise phase — using our manual unfold-based conv
        layers.extend([
            ManualDepthwiseConv2d(mid_ch, kernel_size=3, stride=stride, padding=1),
            nn.BatchNorm2d(mid_ch),
            nn.ReLU6(inplace=True),
        ])

        # Projection phase (linear bottleneck — no activation)
        layers.extend([
            nn.Conv2d(mid_ch, out_ch, 1, bias=False),
            nn.BatchNorm2d(out_ch),
        ])

        self.block = nn.Sequential(*layers)

    def forward(self, x):
        out = self.block(x)
        if self.use_residual:
            out = out + x  # skip connection
        return out


# ── Quick test ────────────────────────────────────────────
if __name__ == "__main__":
    # Typical MobileNetV2 block: 24→24 channels, stride 1, expansion 6
    block = InvertedResidualBlock(in_ch=24, out_ch=24, stride=1, expand_ratio=6)
    x = torch.randn(2, 24, 56, 56)
    out = block(x)
    print(f"Input:  {x.shape}")
    print(f"Output: {out.shape}")  # same spatial dims, residual applied
    assert out.shape == x.shape, "Residual block must preserve shape"

    # Stride-2 block: 24→32, no residual
    block2 = InvertedResidualBlock(in_ch=24, out_ch=32, stride=2, expand_ratio=6)
    out2 = block2(x)
    print(f"Stride-2 output: {out2.shape}")  # (2, 32, 28, 28)

    # Parameter count
    n_params = sum(p.numel() for p in block.parameters())
    print(f"Block params: {n_params:,}")
`
        },

        // ── 2.2  EfficientNet MBConv + SE Block ──
        {
          title: "EfficientNet MBConv + SE Block (PyTorch)",
          lang: "python",
          filename: "efficientnet_mbconv_se.py",
          desc: "Mobile inverted bottleneck with squeeze-and-excitation attention. The SE module learns per-channel importance via global avg pool → FC → ReLU → FC → Sigmoid gating.",
          code: `"""
EfficientNet MBConv block with Squeeze-and-Excitation (SE).
Adds channel-wise attention on top of the MobileNetV2 inverted residual.

SE mechanism:
  1. Global Average Pool  →  (N, C, 1, 1)
  2. FC reduce            →  (N, C//ratio, 1, 1)  + ReLU (SiLU in newer variants)
  3. FC expand            →  (N, C, 1, 1)         + Sigmoid
  4. Scale                →  x * sigmoid_output

The compound scaling (depth, width, resolution) is what makes EfficientNet
different from MobileNet, but the core building block is this MBConv+SE.
"""
import torch
import torch.nn as nn
import torch.nn.functional as F


class SqueezeExcitation(nn.Module):
    """
    SE block: channel attention via global pooling + 2-layer FC bottleneck.
    """
    def __init__(self, channels, se_ratio=0.25):
        super().__init__()
        squeezed = max(1, int(channels * se_ratio))
        self.fc1 = nn.Conv2d(channels, squeezed, 1)  # 1×1 conv = FC on spatial dims
        self.fc2 = nn.Conv2d(squeezed, channels, 1)

    def forward(self, x):
        # Global average pool → (N, C, 1, 1)
        scale = F.adaptive_avg_pool2d(x, 1)
        scale = F.silu(self.fc1(scale))     # SiLU (Swish) — EfficientNet preference
        scale = torch.sigmoid(self.fc2(scale))
        return x * scale                    # channel-wise reweighting


class MBConvSE(nn.Module):
    """
    Mobile Inverted Bottleneck + SE — the core EfficientNet block.
    expand (1×1) → depthwise (k×k) → SE → project (1×1)
    Stochastic depth (drop_path) applied during training.
    """
    def __init__(self, in_ch, out_ch, kernel_size=3, stride=1,
                 expand_ratio=6, se_ratio=0.25, drop_path_rate=0.0):
        super().__init__()
        mid_ch = in_ch * expand_ratio
        self.use_residual = (stride == 1 and in_ch == out_ch)
        self.drop_path_rate = drop_path_rate
        pad = kernel_size // 2

        # ── Expansion ──
        self.expand = nn.Identity() if expand_ratio == 1 else nn.Sequential(
            nn.Conv2d(in_ch, mid_ch, 1, bias=False),
            nn.BatchNorm2d(mid_ch),
            nn.SiLU(inplace=True),
        )

        # ── Depthwise ── (groups=mid_ch for real depthwise)
        self.depthwise = nn.Sequential(
            nn.Conv2d(mid_ch, mid_ch, kernel_size, stride, pad,
                      groups=mid_ch, bias=False),
            nn.BatchNorm2d(mid_ch),
            nn.SiLU(inplace=True),
        )

        # ── Squeeze-and-Excitation ──
        self.se = SqueezeExcitation(mid_ch, se_ratio)

        # ── Projection (linear — no activation) ──
        self.project = nn.Sequential(
            nn.Conv2d(mid_ch, out_ch, 1, bias=False),
            nn.BatchNorm2d(out_ch),
        )

    def _drop_path(self, x):
        """Stochastic depth: randomly drop entire residual branch per sample."""
        if not self.training or self.drop_path_rate == 0.0:
            return x
        keep = torch.rand(x.shape[0], 1, 1, 1, device=x.device) > self.drop_path_rate
        return x * keep / (1.0 - self.drop_path_rate)  # scale to preserve expectation

    def forward(self, x):
        residual = x
        out = self.expand(x)
        out = self.depthwise(out)
        out = self.se(out)
        out = self.project(out)

        if self.use_residual:
            out = self._drop_path(out) + residual
        return out


# ── Demo ──────────────────────────────────────────────────
if __name__ == "__main__":
    # Stage 3 of EfficientNet-B0: 40→40, k=5, expand=6
    block = MBConvSE(in_ch=40, out_ch=40, kernel_size=5, stride=1,
                     expand_ratio=6, se_ratio=0.25, drop_path_rate=0.2)
    x = torch.randn(4, 40, 14, 14)
    block.train()
    out_train = block(x)
    block.eval()
    out_eval = block(x)
    print(f"Input:        {x.shape}")
    print(f"Train output: {out_train.shape}")
    print(f"Eval output:  {out_eval.shape}")

    # Count parameters
    n_params = sum(p.numel() for p in block.parameters())
    print(f"MBConv+SE params: {n_params:,}")
`
        },

        // ── 2.3  ResNet-18 + FPN Neck ──
        {
          title: "ResNet-18 + FPN Neck (PyTorch)",
          lang: "python",
          filename: "resnet18_fpn.py",
          desc: "ResNet-18 backbone with a Feature Pyramid Network neck for multi-scale feature extraction. Used as the standard backbone-neck combo in modern detectors (Faster R-CNN, RetinaNet, YOLO).",
          code: `"""
ResNet-18 backbone + Feature Pyramid Network (FPN) neck.
The FPN produces multi-scale feature maps (P2–P5) from the backbone's
C2–C5 stages, enabling detectors to handle objects at different scales.

ResNet-18 stages:
  C1: conv7×7 + maxpool  →  64ch,  H/4
  C2: 2× BasicBlock      →  64ch,  H/4   ← lateral to P2
  C3: 2× BasicBlock      → 128ch,  H/8   ← lateral to P3
  C4: 2× BasicBlock      → 256ch,  H/16  ← lateral to P4
  C5: 2× BasicBlock      → 512ch,  H/32  ← lateral to P5

FPN top-down pathway:
  P5 = lateral(C5)
  P4 = lateral(C4) + upsample(P5)
  P3 = lateral(C3) + upsample(P4)
  P2 = lateral(C2) + upsample(P3)
  Each Pi is then smoothed by a 3×3 conv.
"""
import torch
import torch.nn as nn
import torch.nn.functional as F


# ── ResNet BasicBlock ─────────────────────────────────────
class BasicBlock(nn.Module):
    """Two 3×3 conv layers with skip connection. Downsamples if stride > 1."""
    expansion = 1

    def __init__(self, in_ch, out_ch, stride=1):
        super().__init__()
        self.conv1 = nn.Conv2d(in_ch, out_ch, 3, stride, 1, bias=False)
        self.bn1 = nn.BatchNorm2d(out_ch)
        self.conv2 = nn.Conv2d(out_ch, out_ch, 3, 1, 1, bias=False)
        self.bn2 = nn.BatchNorm2d(out_ch)

        # Projection shortcut when dimensions change
        self.shortcut = nn.Sequential()
        if stride != 1 or in_ch != out_ch:
            self.shortcut = nn.Sequential(
                nn.Conv2d(in_ch, out_ch, 1, stride, bias=False),
                nn.BatchNorm2d(out_ch),
            )

    def forward(self, x):
        out = F.relu(self.bn1(self.conv1(x)), inplace=True)
        out = self.bn2(self.conv2(out))
        out += self.shortcut(x)
        return F.relu(out, inplace=True)


# ── ResNet-18 Backbone ────────────────────────────────────
class ResNet18Backbone(nn.Module):
    """
    Returns feature maps from stages C2–C5.
    We split the standard ResNet into a stem + 4 stages so the FPN
    can tap into intermediate features.
    """
    def __init__(self):
        super().__init__()
        # Stem: 7×7 conv, stride 2, + maxpool → H/4
        self.stem = nn.Sequential(
            nn.Conv2d(3, 64, 7, stride=2, padding=3, bias=False),
            nn.BatchNorm2d(64),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(3, stride=2, padding=1),
        )
        # Stage C2–C5 (each has 2 BasicBlocks)
        self.layer1 = self._make_stage(64, 64, blocks=2, stride=1)   # C2: H/4
        self.layer2 = self._make_stage(64, 128, blocks=2, stride=2)  # C3: H/8
        self.layer3 = self._make_stage(128, 256, blocks=2, stride=2) # C4: H/16
        self.layer4 = self._make_stage(256, 512, blocks=2, stride=2) # C5: H/32

    @staticmethod
    def _make_stage(in_ch, out_ch, blocks, stride):
        layers = [BasicBlock(in_ch, out_ch, stride)]
        for _ in range(1, blocks):
            layers.append(BasicBlock(out_ch, out_ch, stride=1))
        return nn.Sequential(*layers)

    def forward(self, x):
        x = self.stem(x)
        c2 = self.layer1(x)
        c3 = self.layer2(c2)
        c4 = self.layer3(c3)
        c5 = self.layer4(c4)
        return c2, c3, c4, c5


# ── Feature Pyramid Network ──────────────────────────────
class FPN(nn.Module):
    """
    Feature Pyramid Network: lateral connections + top-down upsampling.
    All output feature maps share the same channel dimension (fpn_ch).
    """
    def __init__(self, in_channels_list, fpn_ch=256):
        """
        Args:
            in_channels_list: channels of C2, C3, C4, C5 (e.g. [64, 128, 256, 512])
            fpn_ch: unified output channels for all pyramid levels
        """
        super().__init__()
        # Lateral 1×1 convs: reduce each Ci to fpn_ch
        self.laterals = nn.ModuleList([
            nn.Conv2d(in_ch, fpn_ch, 1) for in_ch in in_channels_list
        ])
        # Smooth 3×3 convs: reduce aliasing from upsampling
        self.smooths = nn.ModuleList([
            nn.Conv2d(fpn_ch, fpn_ch, 3, padding=1) for _ in in_channels_list
        ])

    def forward(self, features):
        """
        features: [C2, C3, C4, C5] from backbone
        returns:  [P2, P3, P4, P5] pyramid levels
        """
        # Lateral projections
        laterals = [l(f) for l, f in zip(self.laterals, features)]

        # Top-down pathway: start from P5, upsample and add to lower level
        for i in range(len(laterals) - 1, 0, -1):
            # Upsample Pi+1 to match Pi spatial size, then add
            upsampled = F.interpolate(laterals[i], size=laterals[i - 1].shape[2:],
                                      mode="nearest")
            laterals[i - 1] = laterals[i - 1] + upsampled

        # Apply 3×3 smoothing to each merged feature map
        outputs = [s(l) for s, l in zip(self.smooths, laterals)]
        return outputs  # [P2, P3, P4, P5]


# ── Combined Backbone + FPN ──────────────────────────────
class ResNet18FPN(nn.Module):
    """Full backbone-neck: input image → multi-scale feature pyramid."""
    def __init__(self, fpn_ch=256):
        super().__init__()
        self.backbone = ResNet18Backbone()
        self.fpn = FPN(in_channels_list=[64, 128, 256, 512], fpn_ch=fpn_ch)

    def forward(self, x):
        c2, c3, c4, c5 = self.backbone(x)
        p2, p3, p4, p5 = self.fpn([c2, c3, c4, c5])
        return p2, p3, p4, p5


# ── Demo ──────────────────────────────────────────────────
if __name__ == "__main__":
    model = ResNet18FPN(fpn_ch=256)
    x = torch.randn(2, 3, 224, 224)
    p2, p3, p4, p5 = model(x)

    print("ResNet-18 + FPN output feature maps:")
    for name, feat in [("P2", p2), ("P3", p3), ("P4", p4), ("P5", p5)]:
        print(f"  {name}: {feat.shape}")
    # Expected:
    #   P2: (2, 256, 56, 56)   — stride 4
    #   P3: (2, 256, 28, 28)   — stride 8
    #   P4: (2, 256, 14, 14)   — stride 16
    #   P5: (2, 256, 7, 7)     — stride 32

    total = sum(p.numel() for p in model.parameters())
    backbone_p = sum(p.numel() for p in model.backbone.parameters())
    fpn_p = sum(p.numel() for p in model.fpn.parameters())
    print(f"\\nTotal params:    {total:>10,}")
    print(f"Backbone params: {backbone_p:>10,}")
    print(f"FPN params:      {fpn_p:>10,}")
`
        }

      ]
    },

    // ──────────────────────────────────────────────────────────
    // Section 3: Batch Norm Fusion & Inference Optimization
    // ──────────────────────────────────────────────────────────
    {
      id: "bn-fusion",
      title: "Batch Norm Fusion & Inference Optimization",
      icon: "⚡",
      items: [

        // ── 3.1  Fold BN into Conv2d Weights ──
        {
          title: "Fold BN into Conv2d Weights (PyTorch)",
          lang: "python",
          filename: "bn_fold_manual.py",
          desc: "Analytically folds BatchNorm parameters (gamma, beta, running_mean, running_var) into the preceding Conv2d weight and bias. Eliminates BN as a separate op at inference — saves memory bandwidth and latency.",
          code: `"""
Batch Normalization Folding into Conv2d — the math and implementation.

During training, BN normalises per-channel:
    y = gamma * (x - mu) / sqrt(var + eps) + beta

After training, mu and var are fixed (running stats). We can absorb BN
into the preceding conv's W and b:

    W_fused = gamma / sqrt(var + eps) * W
    b_fused = gamma / sqrt(var + eps) * (b - mu) + beta

Result: identical output, one fewer op, ~10-15% faster inference.
"""
import torch
import torch.nn as nn
import copy


def fold_bn_into_conv(conv: nn.Conv2d, bn: nn.BatchNorm2d) -> nn.Conv2d:
    """
    Fuse a Conv2d + BatchNorm2d pair into a single Conv2d.
    Returns a new Conv2d with folded weights and bias.
    """
    assert not bn.training, "BN must be in eval mode (frozen running stats)"

    # Clone conv to avoid mutating the original
    fused = copy.deepcopy(conv)

    # Extract BN parameters
    gamma = bn.weight                     # (C_out,)
    beta = bn.bias                        # (C_out,)
    mu = bn.running_mean                  # (C_out,)
    var = bn.running_var                  # (C_out,)
    eps = bn.eps

    # Scale factor per output channel
    scale = gamma / torch.sqrt(var + eps)  # (C_out,)

    # Fold into conv weight: W_fused[c] = scale[c] * W[c]
    # Conv weight shape: (C_out, C_in, kH, kW)
    fused.weight.data = conv.weight.data * scale.view(-1, 1, 1, 1)

    # Fold into conv bias: b_fused[c] = scale[c] * (b[c] - mu[c]) + beta[c]
    if conv.bias is not None:
        b_orig = conv.bias.data
    else:
        b_orig = torch.zeros(conv.out_channels, device=conv.weight.device)
        fused.bias = nn.Parameter(torch.zeros(conv.out_channels, device=conv.weight.device))

    fused.bias.data = scale * (b_orig - mu) + beta
    return fused


# ── Verification ──────────────────────────────────────────
if __name__ == "__main__":
    torch.manual_seed(42)

    # Original Conv + BN
    conv = nn.Conv2d(3, 16, 3, padding=1, bias=False)
    bn = nn.BatchNorm2d(16)

    # Simulate training to populate running stats
    bn.train()
    for _ in range(50):
        x = torch.randn(8, 3, 32, 32)
        bn(conv(x))
    bn.eval()

    # Fuse
    fused_conv = fold_bn_into_conv(conv, bn)

    # Compare outputs
    x_test = torch.randn(2, 3, 32, 32)
    with torch.no_grad():
        y_original = bn(conv(x_test))
        y_fused = fused_conv(x_test)

    max_diff = (y_original - y_fused).abs().max().item()
    print(f"Max absolute difference: {max_diff:.2e}")
    assert max_diff < 1e-5, f"Fusion error too large: {max_diff}"
    print("BN folding verified — outputs match within fp32 tolerance")

    # Parameter count comparison
    orig_params = sum(p.numel() for p in [conv.weight, bn.weight, bn.bias])
    fused_params = sum(p.numel() for p in fused_conv.parameters())
    print(f"Original params: {orig_params:,}  →  Fused params: {fused_params:,}")
`
        },

        // ── 3.2  Auto-Fuse All Conv-BN Pairs in a Model ──
        {
          title: "Auto-Fuse All Conv-BN Pairs in a Model",
          lang: "python",
          filename: "auto_fuse_model.py",
          desc: "Recursively walks a model's module tree, detects Conv2d→BN sequences, and replaces them with fused Conv2d + Identity. Works on any architecture (ResNet, MobileNet, EfficientNet).",
          code: `"""
Automatic BN fusion for any PyTorch model.
Walks the module tree, finds Conv2d→BatchNorm2d pairs in Sequential
containers and nn.Module attributes, and replaces with fused Conv2d.
"""
import torch
import torch.nn as nn
import copy
from bn_fold_manual import fold_bn_into_conv


def fuse_conv_bn_pairs(model: nn.Module) -> nn.Module:
    """
    Recursively fuse all Conv2d + BatchNorm2d pairs in a model.
    Modifies the model in-place and returns it.
    """
    model.eval()

    # Handle nn.Sequential containers
    for name, module in model.named_children():
        if isinstance(module, nn.Sequential):
            _fuse_sequential(module)
        else:
            fuse_conv_bn_pairs(module)  # recurse into submodules

    # Handle adjacent attributes (e.g., self.conv1 followed by self.bn1)
    _fuse_adjacent_attrs(model)
    return model


def _fuse_sequential(seq: nn.Sequential):
    """Fuse consecutive Conv2d + BN in a Sequential."""
    modules = list(seq.children())
    i = 0
    while i < len(modules) - 1:
        if isinstance(modules[i], nn.Conv2d) and isinstance(modules[i + 1], nn.BatchNorm2d):
            fused = fold_bn_into_conv(modules[i], modules[i + 1])
            seq[i] = fused
            seq[i + 1] = nn.Identity()  # replace BN with no-op
        elif hasattr(modules[i], 'children'):
            fuse_conv_bn_pairs(modules[i])  # recurse deeper
        i += 1


def _fuse_adjacent_attrs(module: nn.Module):
    """
    Detect patterns like module.conv1 + module.bn1 by naming convention.
    Handles 'conv1/bn1', 'conv2/bn2', etc.
    """
    children = dict(module.named_children())
    fused_bns = set()

    for name, child in children.items():
        if isinstance(child, nn.Conv2d):
            # Try common BN naming: conv1→bn1, conv2→bn2
            bn_name = name.replace("conv", "bn")
            if bn_name in children and isinstance(children[bn_name], nn.BatchNorm2d):
                bn = children[bn_name]
                fused = fold_bn_into_conv(child, bn)
                setattr(module, name, fused)
                setattr(module, bn_name, nn.Identity())
                fused_bns.add(bn_name)


# ── Demo: fuse a ResNet-18 ────────────────────────────────
if __name__ == "__main__":
    from torchvision.models import resnet18

    model = resnet18(weights=None)
    model.eval()

    # Warmup running stats
    with torch.no_grad():
        for _ in range(10):
            model.train()
            model(torch.randn(4, 3, 224, 224))
    model.eval()

    # Count BN layers before fusion
    bn_before = sum(1 for m in model.modules() if isinstance(m, nn.BatchNorm2d))

    # Fuse
    model_fused = fuse_conv_bn_pairs(copy.deepcopy(model))

    # Count BN layers after (should be mostly Identity now)
    bn_after = sum(1 for m in model_fused.modules() if isinstance(m, nn.BatchNorm2d))

    print(f"BatchNorm2d layers: {bn_before} → {bn_after}")

    # Verify output equivalence
    x = torch.randn(1, 3, 224, 224)
    with torch.no_grad():
        y_orig = model(x)
        y_fused = model_fused(x)
    diff = (y_orig - y_fused).abs().max().item()
    print(f"Max output diff: {diff:.2e}")

    # Benchmark (rough)
    import time
    n_iters = 50
    x_bench = torch.randn(1, 3, 224, 224)
    with torch.no_grad():
        t0 = time.perf_counter()
        for _ in range(n_iters):
            model(x_bench)
        t_orig = (time.perf_counter() - t0) / n_iters

        t0 = time.perf_counter()
        for _ in range(n_iters):
            model_fused(x_bench)
        t_fused = (time.perf_counter() - t0) / n_iters

    speedup = (t_orig - t_fused) / t_orig * 100
    print(f"Original: {t_orig*1000:.1f}ms  Fused: {t_fused*1000:.1f}ms  ({speedup:.1f}% faster)")
`
        },

        // ── 3.3  Benchmark: BN Fused vs Unfused on GPU ──
        {
          title: "Benchmark: BN Fused vs Unfused (GPU + torch.compile)",
          lang: "python",
          filename: "bn_fusion_benchmark.py",
          desc: "CUDA-timed benchmark comparing original model vs BN-fused vs torch.compile. Measures latency, throughput, and memory. Shows that BN fusion is orthogonal to compiler optimisations.",
          code: `"""
GPU benchmark: original vs BN-fused vs torch.compile.
Uses torch.cuda.Event for accurate GPU timing (avoids CPU-GPU sync noise).
"""
import torch
import torch.nn as nn
import copy
import time
from auto_fuse_model import fuse_conv_bn_pairs

# ── Helpers ───────────────────────────────────────────────
def gpu_timer(model, x, warmup=20, iters=100):
    """Time model inference on GPU using CUDA events."""
    model.eval()
    # Warmup
    with torch.no_grad():
        for _ in range(warmup):
            model(x)

    start = torch.cuda.Event(enable_timing=True)
    end = torch.cuda.Event(enable_timing=True)

    torch.cuda.synchronize()
    start.record()
    with torch.no_grad():
        for _ in range(iters):
            model(x)
    end.record()
    torch.cuda.synchronize()

    ms = start.elapsed_time(end) / iters
    return ms


def count_memory_mb(model, x):
    """Measure peak GPU memory during forward pass."""
    torch.cuda.reset_peak_memory_stats()
    torch.cuda.synchronize()
    with torch.no_grad():
        model(x)
    torch.cuda.synchronize()
    return torch.cuda.max_memory_allocated() / 1024 / 1024


# ── Main benchmark ────────────────────────────────────────
if __name__ == "__main__":
    assert torch.cuda.is_available(), "CUDA required for this benchmark"
    device = torch.device("cuda")

    from torchvision.models import resnet50, mobilenet_v2

    results = {}
    batch_size = 16
    x = torch.randn(batch_size, 3, 224, 224, device=device)

    for model_name, model_fn in [("ResNet-50", resnet50), ("MobileNetV2", mobilenet_v2)]:
        print(f"\\n{'='*50}")
        print(f"  {model_name}  (batch={batch_size})")
        print(f"{'='*50}")

        # 1. Original
        model_orig = model_fn(weights=None).to(device).eval()
        # Populate BN running stats
        model_orig.train()
        with torch.no_grad():
            for _ in range(20):
                model_orig(x)
        model_orig.eval()

        ms_orig = gpu_timer(model_orig, x)
        mem_orig = count_memory_mb(model_orig, x)

        # 2. BN-fused
        model_fused = fuse_conv_bn_pairs(copy.deepcopy(model_orig)).to(device).eval()
        ms_fused = gpu_timer(model_fused, x)
        mem_fused = count_memory_mb(model_fused, x)

        # 3. torch.compile (PyTorch 2.x)
        model_compiled = torch.compile(copy.deepcopy(model_orig), mode="reduce-overhead")
        ms_compiled = gpu_timer(model_compiled, x, warmup=5)
        mem_compiled = count_memory_mb(model_compiled, x)

        # 4. Fused + compiled
        model_both = torch.compile(copy.deepcopy(model_fused), mode="reduce-overhead")
        ms_both = gpu_timer(model_both, x, warmup=5)
        mem_both = count_memory_mb(model_both, x)

        print(f"  {'Variant':<25} {'Latency':>10} {'Mem (MB)':>10} {'Speedup':>10}")
        print(f"  {'-'*55}")
        for label, ms, mem in [
            ("Original",        ms_orig,     mem_orig),
            ("BN-Fused",        ms_fused,    mem_fused),
            ("torch.compile",   ms_compiled, mem_compiled),
            ("Fused + compile", ms_both,     mem_both),
        ]:
            speedup = ms_orig / ms
            print(f"  {label:<25} {ms:>8.2f}ms {mem:>8.1f}MB {speedup:>9.2f}x")

    print("\\nNote: BN fusion benefits scale with memory-bound models (MobileNet > ResNet).")
`
        }

      ]
    },

    // ──────────────────────────────────────────────────────────
    // Section 4: Data Pipeline & Augmentation
    // ──────────────────────────────────────────────────────────
    {
      id: "data-pipeline",
      title: "Data Pipeline & Augmentation",
      icon: "📊",
      items: [

        // ── 4.1  Mosaic + MixUp + CutMix Augmentations ──
        {
          title: "Mosaic + MixUp + CutMix Augmentations (PyTorch)",
          lang: "python",
          filename: "advanced_augmentations.py",
          desc: "Production augmentations used by YOLOv4/v5 (Mosaic), CutMix (ResNet improvements), and MixUp (Beyond Empirical Risk Minimization). Implements all three with correct label mixing.",
          code: `"""
Advanced data augmentations for vision training:
  - Mosaic: 4 images stitched into one (YOLOv4/v5 default)
  - MixUp:  convex combination of two images + labels
  - CutMix: rectangular patch from one image pasted onto another

All operate on (C, H, W) tensors and return mixed labels for CE loss.
"""
import torch
import torch.nn.functional as F
import numpy as np


# ── Mosaic (4-image stitch) ──────────────────────────────
def mosaic_augment(images, labels, target_size=640):
    """
    Stitch 4 random images into one mosaic.
    Args:
        images: list of tensors [(C, H_i, W_i), ...]  (at least 4)
        labels: corresponding class labels (ints)
        target_size: output spatial dimension
    Returns:
        mosaic_img: (C, target_size, target_size)
        mosaic_label: dict with quadrant labels for multi-label loss
    """
    assert len(images) >= 4, "Need at least 4 images for mosaic"
    s = target_size
    C = images[0].shape[0]

    # Random center point for the mosaic split
    cx = int(np.random.uniform(s * 0.25, s * 0.75))
    cy = int(np.random.uniform(s * 0.25, s * 0.75))

    mosaic = torch.zeros(C, s, s)
    quadrant_labels = []

    # Pick 4 random images
    indices = np.random.choice(len(images), 4, replace=False)

    regions = [
        (0, 0, cx, cy),         # top-left
        (cx, 0, s, cy),         # top-right
        (0, cy, cx, s),         # bottom-left
        (cx, cy, s, s),         # bottom-right
    ]

    for idx, (x1, y1, x2, y2) in zip(indices, regions):
        img = images[idx]
        rh, rw = y2 - y1, x2 - x1
        # Resize image to fit the quadrant
        resized = F.interpolate(img.unsqueeze(0), size=(rh, rw),
                                mode="bilinear", align_corners=False).squeeze(0)
        mosaic[:, y1:y2, x1:x2] = resized
        quadrant_labels.append({
            "label": labels[idx],
            "area_fraction": (rh * rw) / (s * s)
        })

    return mosaic, quadrant_labels


# ── MixUp ────────────────────────────────────────────────
def mixup(img1, label1, img2, label2, alpha=0.2):
    """
    MixUp: x_mix = lambda*x1 + (1-lambda)*x2
    Labels are soft: y_mix = lambda*y1 + (1-lambda)*y2
    Lambda ~ Beta(alpha, alpha).
    """
    lam = np.random.beta(alpha, alpha) if alpha > 0 else 1.0

    # Resize img2 to match img1 if needed
    if img1.shape != img2.shape:
        img2 = F.interpolate(img2.unsqueeze(0), size=img1.shape[1:],
                             mode="bilinear", align_corners=False).squeeze(0)

    mixed = lam * img1 + (1 - lam) * img2
    return mixed, lam, label1, label2


def mixup_criterion(criterion, pred, lam, label_a, label_b):
    """Compute loss for MixUp: weighted sum of CE with both labels."""
    return lam * criterion(pred, label_a) + (1 - lam) * criterion(pred, label_b)


# ── CutMix ───────────────────────────────────────────────
def cutmix(img1, label1, img2, label2, alpha=1.0):
    """
    CutMix: cut a random rectangle from img2 and paste onto img1.
    The label ratio equals the area ratio of the pasted region.
    """
    lam = np.random.beta(alpha, alpha)
    C, H, W = img1.shape

    # Random bounding box
    cut_ratio = np.sqrt(1.0 - lam)  # area of cut = 1-lam
    cut_h = int(H * cut_ratio)
    cut_w = int(W * cut_ratio)
    cy = np.random.randint(H)
    cx = np.random.randint(W)

    # Clip to image bounds
    y1 = max(0, cy - cut_h // 2)
    y2 = min(H, cy + cut_h // 2)
    x1 = max(0, cx - cut_w // 2)
    x2 = min(W, cx + cut_w // 2)

    mixed = img1.clone()
    # Resize img2 to match if needed
    if img1.shape != img2.shape:
        img2 = F.interpolate(img2.unsqueeze(0), size=(H, W),
                             mode="bilinear", align_corners=False).squeeze(0)
    mixed[:, y1:y2, x1:x2] = img2[:, y1:y2, x1:x2]

    # Adjust lambda to actual cut area
    lam_actual = 1.0 - (y2 - y1) * (x2 - x1) / (H * W)
    return mixed, lam_actual, label1, label2


# ── Demo ──────────────────────────────────────────────────
if __name__ == "__main__":
    torch.manual_seed(42)
    np.random.seed(42)

    # Synthetic images (3-channel, 224×224)
    imgs = [torch.randn(3, 224, 224) for _ in range(8)]
    labels = list(range(8))

    # Mosaic
    mosaic_img, quad_labels = mosaic_augment(imgs, labels, target_size=448)
    print(f"Mosaic output: {mosaic_img.shape}")
    for q in quad_labels:
        print(f"  class={q['label']}, area={q['area_fraction']:.2%}")

    # MixUp
    mixed, lam, la, lb = mixup(imgs[0], 0, imgs[1], 1, alpha=0.2)
    print(f"\\nMixUp: lambda={lam:.3f}, labels=({la}, {lb}), shape={mixed.shape}")

    # CutMix
    cut, lam_a, la, lb = cutmix(imgs[0], 0, imgs[1], 1, alpha=1.0)
    print(f"CutMix: lambda={lam_a:.3f}, labels=({la}, {lb}), shape={cut.shape}")
`
        },

        // ── 4.2  LMDB Dataset for Fast I/O ──
        {
          title: "LMDB Dataset for Fast Random-Access I/O",
          lang: "python",
          filename: "lmdb_dataset.py",
          desc: "Memory-mapped LMDB dataset that eliminates small-file I/O bottlenecks. Packs images into a single LMDB database with msgpack serialization. 5-10x faster than reading individual files for random access.",
          code: `"""
LMDB-backed dataset for PyTorch — eliminates filesystem I/O bottleneck.

Why LMDB?
  - Memory-mapped: OS pages data in/out automatically, zero-copy reads
  - Single file: no millions of small .jpg files hammering the filesystem
  - Random access: O(1) key lookup vs directory traversal
  - 5-10x faster DataLoader throughput vs ImageFolder on HDD/NFS

Workflow:
  1. Pack images into LMDB once (create_lmdb_dataset)
  2. Read via LMDBDataset with standard DataLoader
"""
import os
import io
import lmdb
import msgpack
import numpy as np
from PIL import Image
from pathlib import Path
from torch.utils.data import Dataset, DataLoader
import torchvision.transforms as T


# ── Pack images into LMDB ─────────────────────────────────
def create_lmdb_dataset(image_dir: str, lmdb_path: str, map_size: int = 1 << 40):
    """
    Read all images from image_dir (class subfolders) and pack into LMDB.
    Key: index (utf-8), Value: msgpack({image_bytes, label, filename})
    """
    image_dir = Path(image_dir)
    classes = sorted([d.name for d in image_dir.iterdir() if d.is_dir()])
    class_to_idx = {c: i for i, c in enumerate(classes)}

    env = lmdb.open(lmdb_path, map_size=map_size)
    txn = env.begin(write=True)

    idx = 0
    for class_name in classes:
        class_dir = image_dir / class_name
        for img_path in sorted(class_dir.glob("*")):
            if img_path.suffix.lower() not in (".jpg", ".jpeg", ".png", ".bmp"):
                continue
            with open(img_path, "rb") as f:
                img_bytes = f.read()

            value = msgpack.packb({
                "image": img_bytes,
                "label": class_to_idx[class_name],
                "filename": img_path.name,
            }, use_bin_type=True)

            txn.put(str(idx).encode("utf-8"), value)
            idx += 1

            # Commit every 1000 entries to avoid huge transactions
            if idx % 1000 == 0:
                txn.commit()
                txn = env.begin(write=True)
                print(f"  Packed {idx} images...")

    # Store metadata
    meta = msgpack.packb({"num_samples": idx, "classes": classes}, use_bin_type=True)
    txn.put(b"__meta__", meta)
    txn.commit()
    env.close()
    print(f"Created LMDB at {lmdb_path} with {idx} images, {len(classes)} classes")


# ── PyTorch Dataset over LMDB ─────────────────────────────
class LMDBDataset(Dataset):
    """
    Memory-mapped LMDB dataset. Each worker gets its own env handle
    (LMDB requirement for multi-process DataLoader).
    """
    def __init__(self, lmdb_path: str, transform=None):
        self.lmdb_path = lmdb_path
        self.transform = transform
        self._env = None  # lazy init for multi-worker safety

        # Read metadata to get length (single-use env)
        env = lmdb.open(lmdb_path, readonly=True, lock=False)
        with env.begin() as txn:
            meta = msgpack.unpackb(txn.get(b"__meta__"), raw=False)
            self.num_samples = meta["num_samples"]
            self.classes = meta["classes"]
        env.close()

    def _init_env(self):
        """Lazy-open env in each DataLoader worker process."""
        self._env = lmdb.open(self.lmdb_path, readonly=True, lock=False,
                              readahead=False, meminit=False)

    def __len__(self):
        return self.num_samples

    def __getitem__(self, idx):
        if self._env is None:
            self._init_env()

        with self._env.begin() as txn:
            raw = txn.get(str(idx).encode("utf-8"))

        data = msgpack.unpackb(raw, raw=False)
        img = Image.open(io.BytesIO(data["image"])).convert("RGB")
        label = data["label"]

        if self.transform:
            img = self.transform(img)
        return img, label


# ── Demo ──────────────────────────────────────────────────
if __name__ == "__main__":
    # Assuming you have an ImageFolder-style directory:
    #   data/train/cat/001.jpg, data/train/dog/001.jpg, ...

    # Step 1: Create LMDB (run once)
    # create_lmdb_dataset("data/train", "data/train.lmdb")

    # Step 2: Use in training
    transform = T.Compose([
        T.RandomResizedCrop(224),
        T.RandomHorizontalFlip(),
        T.ToTensor(),
        T.Normalize(mean=[0.485, 0.456, 0.406],
                     std=[0.229, 0.224, 0.225]),
    ])

    # dataset = LMDBDataset("data/train.lmdb", transform=transform)
    # loader = DataLoader(dataset, batch_size=64, shuffle=True,
    #                     num_workers=8, pin_memory=True)
    #
    # for images, labels in loader:
    #     images = images.cuda(non_blocking=True)
    #     # ... training step ...

    print("LMDB dataset module loaded successfully.")
    print("Uncomment the create + load sections with a real image directory.")
`
        },

        // ── 4.3  Edge-Optimised Preprocessing Pipeline ──
        {
          title: "Edge-Optimised Preprocessing (OpenCV + NumPy)",
          lang: "python",
          filename: "edge_preprocess.py",
          desc: "Minimal-dependency preprocessing pipeline for edge devices. Uses OpenCV (no PIL/torchvision) with in-place ops, letterboxing (preserve aspect ratio), and pre-allocated buffers for zero-allocation inference.",
          code: `"""
Edge-optimised image preprocessing — zero-copy, zero-allocation pipeline.

On edge devices (Jetson, RPi, mobile), every allocation and copy matters.
This pipeline:
  1. Uses OpenCV (C++ backend) instead of PIL
  2. Letterboxes to preserve aspect ratio (critical for detection)
  3. Pre-allocates buffers to avoid GC pressure
  4. Converts to NCHW float32 in a single operation
"""
import cv2
import numpy as np
from typing import Tuple


class EdgePreprocessor:
    """
    Reusable preprocessor with pre-allocated buffers.
    Thread-safe if each thread has its own instance.
    """
    def __init__(self, target_size: Tuple[int, int] = (640, 640),
                 mean: Tuple[float, ...] = (0.485, 0.456, 0.406),
                 std: Tuple[float, ...] = (0.229, 0.224, 0.225),
                 pad_value: int = 114):
        self.target_h, self.target_w = target_size
        self.pad_value = pad_value

        # Pre-compute normalisation arrays for vectorised ops
        # Shape (1, 1, 3) for broadcasting over (H, W, 3)
        self.mean = np.array(mean, dtype=np.float32).reshape(1, 1, 3)
        self.std = np.array(std, dtype=np.float32).reshape(1, 1, 3)
        self.inv_std = 1.0 / self.std  # multiply is faster than divide

        # Pre-allocate letterbox canvas (reused every call)
        self._canvas = np.full(
            (self.target_h, self.target_w, 3), self.pad_value, dtype=np.uint8
        )
        # Pre-allocate float32 output buffer
        self._float_buf = np.empty(
            (1, 3, self.target_h, self.target_w), dtype=np.float32
        )

    def letterbox(self, img: np.ndarray) -> Tuple[np.ndarray, float, Tuple[int, int]]:
        """
        Resize image to fit target while preserving aspect ratio.
        Pads the shorter side with pad_value (grey).
        Returns: (letterboxed_img, scale, (pad_top, pad_left))
        """
        h, w = img.shape[:2]
        scale = min(self.target_h / h, self.target_w / w)
        new_h, new_w = int(h * scale), int(w * scale)

        # Resize with area interpolation (best for downscaling)
        resized = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)

        # Compute padding offsets (center the image)
        pad_top = (self.target_h - new_h) // 2
        pad_left = (self.target_w - new_w) // 2

        # Reset canvas and place resized image
        self._canvas[:] = self.pad_value
        self._canvas[pad_top:pad_top + new_h, pad_left:pad_left + new_w] = resized

        return self._canvas, scale, (pad_top, pad_left)

    def preprocess(self, img: np.ndarray) -> Tuple[np.ndarray, float, Tuple[int, int]]:
        """
        Full pipeline: BGR→RGB → letterbox → normalise → NCHW float32.
        Returns: (tensor, scale, padding) for post-processing coordinate recovery.
        """
        # BGR → RGB (OpenCV loads as BGR)
        rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

        # Letterbox
        canvas, scale, padding = self.letterbox(rgb)

        # Normalise: (pixel/255 - mean) / std = pixel/255 * inv_std - mean * inv_std
        # Single fused operation to minimise memory traffic
        np.multiply(canvas, 1.0 / 255.0, out=self._float_buf[0].transpose(1, 2, 0),
                    casting="unsafe")
        # Work in HWC, then transpose
        hwc = self._float_buf[0].transpose(1, 2, 0)
        np.subtract(hwc, self.mean, out=hwc)
        np.multiply(hwc, self.inv_std, out=hwc)

        # HWC → CHW (already in self._float_buf via view)
        self._float_buf[0] = hwc.transpose(2, 0, 1)

        return self._float_buf, scale, padding

    def preprocess_batch(self, images: list) -> Tuple[np.ndarray, list]:
        """Process a batch of images. Returns stacked NCHW array + metadata."""
        batch = np.empty(
            (len(images), 3, self.target_h, self.target_w), dtype=np.float32
        )
        metas = []
        for i, img in enumerate(images):
            tensor, scale, padding = self.preprocess(img)
            batch[i] = tensor[0]
            metas.append({"scale": scale, "padding": padding})
        return batch, metas


# ── Demo ──────────────────────────────────────────────────
if __name__ == "__main__":
    # Create a synthetic image (simulating camera capture)
    img = np.random.randint(0, 256, (480, 640, 3), dtype=np.uint8)

    pp = EdgePreprocessor(target_size=(640, 640))

    # Single image
    tensor, scale, padding = pp.preprocess(img)
    print(f"Input:   {img.shape} ({img.dtype})")
    print(f"Output:  {tensor.shape} ({tensor.dtype})")
    print(f"Scale:   {scale:.4f}")
    print(f"Padding: top={padding[0]}, left={padding[1]}")

    # Benchmark
    import time
    n = 1000
    t0 = time.perf_counter()
    for _ in range(n):
        pp.preprocess(img)
    elapsed = (time.perf_counter() - t0) / n * 1000
    print(f"\\nPreprocess latency: {elapsed:.2f} ms/image ({1000/elapsed:.0f} FPS)")
`
        }

      ]
    },

    // ──────────────────────────────────────────────────────────
    // Section 5: Transfer Learning Recipes
    // ──────────────────────────────────────────────────────────
    {
      id: "transfer-learning",
      title: "Transfer Learning Recipes",
      icon: "🔄",
      items: [

        // ── 5.1  Progressive Fine-Tuning (PyTorch) ──
        {
          title: "Progressive Fine-Tuning (PyTorch)",
          lang: "python",
          filename: "progressive_finetune.py",
          desc: "Layer-by-layer unfreezing with discriminative learning rates. Starts by training only the head, then progressively unfreezes deeper layers with smaller LRs — the standard recipe for transfer learning on small datasets.",
          code: `"""
Progressive fine-tuning with discriminative learning rates.

Strategy (from ULMFiT / fastai, adapted for vision):
  Phase 1: Freeze backbone, train only the new head (1-3 epochs)
  Phase 2: Unfreeze top layers with small LR (3-5 epochs)
  Phase 3: Unfreeze all with layer-wise LR decay (5-10 epochs)

Key insight: early layers learn universal features (edges, textures)
that transfer well — fine-tune them least. Later layers are task-specific
— fine-tune them most.
"""
import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import models, transforms
from torch.utils.data import DataLoader, TensorDataset


def create_model(num_classes: int, pretrained: bool = True):
    """Load pretrained ResNet-50 with a new classification head."""
    weights = models.ResNet50_Weights.DEFAULT if pretrained else None
    model = models.resnet50(weights=weights)

    # Replace final FC layer
    in_features = model.fc.in_features
    model.fc = nn.Sequential(
        nn.Dropout(0.3),
        nn.Linear(in_features, num_classes),
    )
    return model


def get_param_groups(model, base_lr=1e-3, lr_decay=0.1):
    """
    Create parameter groups with layer-wise learning rate decay.
    Deeper layers (closer to input) get smaller LRs.
    """
    # Group layers from deepest to shallowest
    layer_groups = [
        ("head",   list(model.fc.parameters())),
        ("layer4", list(model.layer4.parameters())),
        ("layer3", list(model.layer3.parameters())),
        ("layer2", list(model.layer2.parameters())),
        ("layer1", list(model.layer1.parameters())),
        ("stem",   list(model.conv1.parameters()) + list(model.bn1.parameters())),
    ]

    param_groups = []
    for i, (name, params) in enumerate(layer_groups):
        lr = base_lr * (lr_decay ** i)
        param_groups.append({
            "params": params,
            "lr": lr,
            "name": name,
        })
        print(f"  {name:<10} lr={lr:.2e}  params={sum(p.numel() for p in params):>10,}")

    return param_groups


def freeze_backbone(model):
    """Freeze everything except the head (fc layer)."""
    for name, param in model.named_parameters():
        if "fc" not in name:
            param.requires_grad = False
    trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
    print(f"Frozen backbone — trainable params: {trainable:,}")


def unfreeze_from(model, layer_name: str):
    """Unfreeze from a given layer onwards (inclusive)."""
    found = False
    for name, param in model.named_parameters():
        if layer_name in name:
            found = True
        if found or "fc" in name:
            param.requires_grad = True
    trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
    print(f"Unfrozen from '{layer_name}' — trainable params: {trainable:,}")


def train_epoch(model, loader, optimizer, criterion, device):
    """Single training epoch."""
    model.train()
    total_loss, correct, total = 0, 0, 0
    for X, y in loader:
        X, y = X.to(device), y.to(device)
        optimizer.zero_grad()
        out = model(X)
        loss = criterion(out, y)
        loss.backward()
        optimizer.step()
        total_loss += loss.item() * X.size(0)
        correct += (out.argmax(1) == y).sum().item()
        total += X.size(0)
    return total_loss / total, correct / total


# ── Full progressive training loop ───────────────────────
if __name__ == "__main__":
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    num_classes = 5  # e.g., 5-class classification

    model = create_model(num_classes).to(device)
    criterion = nn.CrossEntropyLoss()

    # Synthetic dataset (replace with real data)
    X_dummy = torch.randn(200, 3, 224, 224)
    y_dummy = torch.randint(0, num_classes, (200,))
    loader = DataLoader(TensorDataset(X_dummy, y_dummy), batch_size=16, shuffle=True)

    # ── Phase 1: Head only ──
    print("\\n=== Phase 1: Train head only ===")
    freeze_backbone(model)
    optimizer = optim.Adam(filter(lambda p: p.requires_grad, model.parameters()), lr=1e-3)
    for epoch in range(2):
        loss, acc = train_epoch(model, loader, optimizer, criterion, device)
        print(f"  Epoch {epoch+1}: loss={loss:.4f}, acc={acc:.2%}")

    # ── Phase 2: Unfreeze top layers ──
    print("\\n=== Phase 2: Unfreeze layer4 + head ===")
    unfreeze_from(model, "layer4")
    optimizer = optim.Adam(filter(lambda p: p.requires_grad, model.parameters()), lr=3e-4)
    for epoch in range(3):
        loss, acc = train_epoch(model, loader, optimizer, criterion, device)
        print(f"  Epoch {epoch+1}: loss={loss:.4f}, acc={acc:.2%}")

    # ── Phase 3: Full fine-tune with discriminative LRs ──
    print("\\n=== Phase 3: Full fine-tune with discriminative LRs ===")
    for p in model.parameters():
        p.requires_grad = True
    param_groups = get_param_groups(model, base_lr=1e-3, lr_decay=0.3)
    optimizer = optim.AdamW(param_groups, weight_decay=0.01)

    for epoch in range(5):
        loss, acc = train_epoch(model, loader, optimizer, criterion, device)
        print(f"  Epoch {epoch+1}: loss={loss:.4f}, acc={acc:.2%}")
`
        },

        // ── 5.2  Knowledge Distillation (Teacher → Student) ──
        {
          title: "Knowledge Distillation (Teacher → Student)",
          lang: "python",
          filename: "knowledge_distillation.py",
          desc: "Train a small student network to mimic a large teacher's soft predictions. Implements Hinton's distillation loss (KL divergence on soft logits) combined with hard-label CE. The standard technique for model compression.",
          code: `"""
Knowledge Distillation — compress a large teacher into a small student.

Loss = alpha * KL(soft_teacher || soft_student) * T^2
     + (1 - alpha) * CE(student, hard_labels)

Key hyperparameters:
  - T (temperature): higher T → softer distributions → more inter-class info
  - alpha: balance between soft (teacher) and hard (ground truth) targets
  - Typical: T=4-8, alpha=0.7-0.9

The T^2 scaling ensures gradient magnitudes are comparable between the
KL and CE terms when T > 1 (from Hinton et al., 2015).
"""
import torch
import torch.nn as nn
import torch.nn.functional as F
import torch.optim as optim
from torchvision import models


class DistillationLoss(nn.Module):
    """
    Combined distillation + classification loss.
    """
    def __init__(self, temperature=4.0, alpha=0.7):
        super().__init__()
        self.T = temperature
        self.alpha = alpha
        self.ce = nn.CrossEntropyLoss()

    def forward(self, student_logits, teacher_logits, labels):
        """
        student_logits: (N, C) raw logits from student
        teacher_logits: (N, C) raw logits from teacher (detached)
        labels:         (N,) ground truth class indices
        """
        # Soft targets from teacher (detached — no grad through teacher)
        soft_teacher = F.softmax(teacher_logits.detach() / self.T, dim=1)
        soft_student = F.log_softmax(student_logits / self.T, dim=1)

        # KL divergence on softened distributions
        # Multiply by T^2 to scale gradients correctly
        kl_loss = F.kl_div(soft_student, soft_teacher, reduction="batchmean") * (self.T ** 2)

        # Standard cross-entropy with hard labels
        ce_loss = self.ce(student_logits, labels)

        return self.alpha * kl_loss + (1 - self.alpha) * ce_loss


def create_teacher(num_classes):
    """Large teacher: ResNet-50."""
    model = models.resnet50(weights=models.ResNet50_Weights.DEFAULT)
    model.fc = nn.Linear(model.fc.in_features, num_classes)
    return model


def create_student(num_classes):
    """Small student: MobileNetV2 (5x fewer params)."""
    model = models.mobilenet_v2(weights=None)
    model.classifier[1] = nn.Linear(model.classifier[1].in_features, num_classes)
    return model


# ── Training loop ─────────────────────────────────────────
def train_distillation(teacher, student, train_loader, epochs=10,
                       temperature=4.0, alpha=0.7, lr=1e-3, device="cuda"):
    teacher.eval()  # teacher is frozen
    student.train()

    criterion = DistillationLoss(temperature=temperature, alpha=alpha)
    optimizer = optim.AdamW(student.parameters(), lr=lr, weight_decay=0.01)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)

    for epoch in range(epochs):
        total_loss, correct, total = 0, 0, 0

        for X, y in train_loader:
            X, y = X.to(device), y.to(device)

            # Teacher forward (no grad)
            with torch.no_grad():
                teacher_logits = teacher(X)

            # Student forward
            student_logits = student(X)
            loss = criterion(student_logits, teacher_logits, y)

            optimizer.zero_grad()
            loss.backward()
            optimizer.step()

            total_loss += loss.item() * X.size(0)
            correct += (student_logits.argmax(1) == y).sum().item()
            total += X.size(0)

        scheduler.step()
        avg_loss = total_loss / total
        acc = correct / total
        print(f"Epoch {epoch+1}/{epochs}  loss={avg_loss:.4f}  acc={acc:.2%}  "
              f"lr={scheduler.get_last_lr()[0]:.2e}")


# ── Demo ──────────────────────────────────────────────────
if __name__ == "__main__":
    from torch.utils.data import DataLoader, TensorDataset

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    num_classes = 10

    teacher = create_teacher(num_classes).to(device)
    student = create_student(num_classes).to(device)

    # Parameter count comparison
    t_params = sum(p.numel() for p in teacher.parameters())
    s_params = sum(p.numel() for p in student.parameters())
    print(f"Teacher (ResNet-50):   {t_params:>12,} params")
    print(f"Student (MobileNetV2): {s_params:>12,} params")
    print(f"Compression ratio:     {t_params/s_params:.1f}x\\n")

    # Synthetic data (replace with real dataset)
    X = torch.randn(256, 3, 224, 224)
    y = torch.randint(0, num_classes, (256,))
    loader = DataLoader(TensorDataset(X, y), batch_size=32, shuffle=True)

    # "Pre-train" teacher (in practice, load a trained checkpoint)
    print("Training with knowledge distillation:")
    train_distillation(teacher, student, loader, epochs=5,
                       temperature=4.0, alpha=0.7, device=device)
`
        },

        // ── 5.3  Transfer Learning (TensorFlow / Keras) ──
        {
          title: "Transfer Learning (TensorFlow / Keras)",
          lang: "python",
          filename: "tf_transfer_learning.py",
          desc: "Equivalent transfer learning recipe in TensorFlow/Keras. Uses EfficientNetB0 backbone with layer freezing, discriminative fine-tuning, and cosine decay schedule.",
          code: `"""
Transfer learning with TensorFlow/Keras — EfficientNetB0 backbone.
Demonstrates the same progressive unfreezing strategy in the Keras API.
"""
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers, Model
import numpy as np


def create_model(num_classes: int, input_shape=(224, 224, 3)):
    """
    EfficientNetB0 backbone + custom classification head.
    The backbone is loaded with ImageNet weights, head is fresh.
    """
    # Load backbone (exclude top classification layer)
    backbone = keras.applications.EfficientNetB0(
        include_top=False,
        weights="imagenet",
        input_shape=input_shape,
        pooling=None,  # we'll add our own pooling
    )

    # Custom head
    inputs = keras.Input(shape=input_shape)
    x = backbone(inputs, training=False)  # BN in inference mode initially
    x = layers.GlobalAveragePooling2D()(x)
    x = layers.Dropout(0.3)(x)
    x = layers.Dense(256, activation="relu")(x)
    x = layers.Dropout(0.2)(x)
    outputs = layers.Dense(num_classes, activation="softmax")(x)

    model = Model(inputs, outputs)
    return model, backbone


def freeze_backbone(backbone):
    """Freeze all backbone layers."""
    backbone.trainable = False
    trainable = sum(
        tf.size(w).numpy() for w in backbone.trainable_weights
    ) if backbone.trainable_weights else 0
    print(f"Backbone frozen — trainable weights: {trainable:,}")


def unfreeze_top_n(backbone, n: int):
    """Unfreeze the last n layers of the backbone."""
    backbone.trainable = True
    for layer in backbone.layers[:-n]:
        layer.trainable = False
    trainable = sum(tf.size(w).numpy() for w in backbone.trainable_weights)
    total = sum(tf.size(w).numpy() for w in backbone.weights)
    print(f"Unfroze top {n} layers — trainable: {trainable:,} / {total:,}")


def cosine_schedule(epoch, total_epochs, initial_lr, min_lr=1e-6):
    """Cosine annealing learning rate schedule."""
    cos_inner = np.pi * epoch / total_epochs
    return min_lr + 0.5 * (initial_lr - min_lr) * (1 + np.cos(cos_inner))


# ── Progressive training ──────────────────────────────────
if __name__ == "__main__":
    num_classes = 5
    model, backbone = create_model(num_classes)

    # Synthetic dataset (replace with real tf.data pipeline)
    X_train = np.random.randn(200, 224, 224, 3).astype(np.float32)
    y_train = np.random.randint(0, num_classes, 200)

    # ── Phase 1: Head only ──
    print("\\n=== Phase 1: Train head only ===")
    freeze_backbone(backbone)
    model.compile(
        optimizer=keras.optimizers.Adam(1e-3),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )
    model.fit(X_train, y_train, epochs=3, batch_size=16, verbose=1)

    # ── Phase 2: Unfreeze top 30 layers ──
    print("\\n=== Phase 2: Unfreeze top 30 backbone layers ===")
    unfreeze_top_n(backbone, n=30)
    model.compile(
        optimizer=keras.optimizers.Adam(3e-4),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )
    model.fit(X_train, y_train, epochs=5, batch_size=16, verbose=1)

    # ── Phase 3: Full fine-tune with cosine schedule ──
    print("\\n=== Phase 3: Full fine-tune ===")
    backbone.trainable = True  # unfreeze all
    total_epochs = 10
    lr_callback = keras.callbacks.LearningRateScheduler(
        lambda epoch: cosine_schedule(epoch, total_epochs, 1e-4, 1e-6)
    )
    model.compile(
        optimizer=keras.optimizers.AdamW(1e-4, weight_decay=0.01),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )
    model.fit(X_train, y_train, epochs=total_epochs, batch_size=16,
              callbacks=[lr_callback], verbose=1)

    # Summary
    total_params = model.count_params()
    print(f"\\nTotal model parameters: {total_params:,}")
    model.summary(print_fn=lambda x: print(f"  {x}"))
`
        }

      ]
    },

  ];
})();
