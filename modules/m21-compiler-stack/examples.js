// Patches the Compiler Stack module (m21) with code examples.
// Loaded after curriculum.js. m21 = CURRICULUM.phases[5].modules[5]
(function patchCompilerStackExamples() {
  const m = CURRICULUM.phases[5].modules[5]; // phase-6 (index 5), sixth module (m21)

  m.codeExamples = [

    // =====================================================================
    // EXAMPLE 1 - TVM End-to-End: PyTorch to Optimized Binary
    // =====================================================================
    {
      title: "TVM End-to-End: PyTorch to Optimized Binary",
      language: "python",
      code: `"""
TVM End-to-End Compilation Pipeline
====================================
Takes a PyTorch MobileNetV2, converts to TVM Relay IR, applies graph
optimizations, compiles for CPU with auto-tuning, and benchmarks.
"""

import torch
import numpy as np

# ──────────────────────────────────────────────────────────────
# Step 1: Export PyTorch Model to TorchScript
# ──────────────────────────────────────────────────────────────
print("=" * 60)
print("Step 1: Export PyTorch Model")
print("=" * 60)

model = torch.hub.load("pytorch/vision", "mobilenet_v2", pretrained=True)
model.eval()

input_shape = [1, 3, 224, 224]
example_input = torch.randn(input_shape)
scripted = torch.jit.trace(model, example_input)

# Verify correctness
with torch.no_grad():
    torch_output = model(example_input).numpy()
print(f"PyTorch output shape: {torch_output.shape}")
print(f"PyTorch top-5 classes: {torch_output.argsort()[0][-5:][::-1]}")

# ──────────────────────────────────────────────────────────────
# Step 2: Import to TVM Relay IR
# ──────────────────────────────────────────────────────────────
print("\\n" + "=" * 60)
print("Step 2: Import to TVM Relay IR")
print("=" * 60)

import tvm
from tvm import relay

shape_list = [("input0", input_shape)]
mod, params = relay.frontend.from_pytorch(scripted, shape_list)

# Inspect Relay IR structure
print(f"Relay IR has {len(mod.functions)} function(s)")

# Count operators in the graph
op_count = {}
def count_ops(expr):
    if isinstance(expr, tvm.relay.Call):
        op_name = str(expr.op)
        op_count[op_name] = op_count.get(op_name, 0) + 1
tvm.relay.analysis.post_order_visit(mod["main"], count_ops)
print(f"Operator breakdown: {dict(sorted(op_count.items(), key=lambda x: -x[1])[:10])}")

# ──────────────────────────────────────────────────────────────
# Step 3: Apply Graph Optimizations
# ──────────────────────────────────────────────────────────────
print("\\n" + "=" * 60)
print("Step 3: Graph Optimizations")
print("=" * 60)

# Apply specific passes to see their effect
passes = [
    ("SimplifyInference", relay.transform.SimplifyInference()),
    ("FoldConstant", relay.transform.FoldConstant()),
    ("FuseOps", relay.transform.FuseOps(fuse_opt_level=3)),
]

current_mod = mod
for name, pass_fn in passes:
    current_mod = pass_fn(current_mod)
    # Count ops after each pass
    op_count_after = {}
    tvm.relay.analysis.post_order_visit(
        current_mod["main"],
        lambda e: op_count_after.update(
            {str(e.op): op_count_after.get(str(e.op), 0) + 1}
        ) if isinstance(e, tvm.relay.Call) else None
    )
    total_ops = sum(op_count_after.values())
    print(f"After {name}: {total_ops} ops remaining")

# ──────────────────────────────────────────────────────────────
# Step 4: Compile for Target Hardware
# ──────────────────────────────────────────────────────────────
print("\\n" + "=" * 60)
print("Step 4: Compile for CPU")
print("=" * 60)

target = tvm.target.Target("llvm -mcpu=native")

with tvm.transform.PassContext(opt_level=3):
    lib = relay.build(mod, target=target, params=params)

print(f"Compiled library type: {type(lib)}")
lib.export_library("mobilenetv2_tvm.so")
print("Exported: mobilenetv2_tvm.so")

# ──────────────────────────────────────────────────────────────
# Step 5: Run Inference and Verify Correctness
# ──────────────────────────────────────────────────────────────
print("\\n" + "=" * 60)
print("Step 5: Run Inference")
print("=" * 60)

from tvm.contrib import graph_executor

dev = tvm.cpu(0)
runtime = graph_executor.GraphModule(lib["default"](dev))

input_np = example_input.numpy()
runtime.set_input("input0", input_np)
runtime.run()
tvm_output = runtime.get_output(0).numpy()

# Verify numerical accuracy
max_diff = np.max(np.abs(torch_output - tvm_output))
print(f"Max absolute difference vs PyTorch: {max_diff:.6e}")
print(f"Outputs match: {max_diff < 1e-4}")
print(f"TVM top-5 classes: {tvm_output.argsort()[0][-5:][::-1]}")

# ──────────────────────────────────────────────────────────────
# Step 6: Benchmark
# ──────────────────────────────────────────────────────────────
print("\\n" + "=" * 60)
print("Step 6: Benchmark")
print("=" * 60)

import time

# TVM benchmark
timing_results = runtime.benchmark(dev, number=50, repeat=5)
tvm_mean = timing_results.mean * 1000
tvm_std = timing_results.std * 1000
print(f"TVM:     {tvm_mean:.2f} +/- {tvm_std:.2f} ms")

# PyTorch benchmark
model_cpu = model.cpu().eval()
with torch.no_grad():
    # Warmup
    for _ in range(10):
        _ = model_cpu(example_input)

    times = []
    for _ in range(50):
        start = time.perf_counter()
        _ = model_cpu(example_input)
        times.append((time.perf_counter() - start) * 1000)

torch_mean = np.mean(times)
torch_std = np.std(times)
print(f"PyTorch: {torch_mean:.2f} +/- {torch_std:.2f} ms")
print(f"Speedup: {torch_mean / tvm_mean:.2f}x")
`
    },

    // =====================================================================
    // EXAMPLE 2 - XLA / JAX: Compilation and HLO Inspection
    // =====================================================================
    {
      title: "XLA / JAX: Compilation and HLO Inspection",
      language: "python",
      code: `"""
XLA Compilation with JAX
=========================
Demonstrates JIT compilation, HLO inspection, fusion analysis,
and performance comparison between eager and compiled execution.
"""

import jax
import jax.numpy as jnp
import time
import functools

# ──────────────────────────────────────────────────────────────
# Part 1: Basic JIT Compilation and HLO Inspection
# ──────────────────────────────────────────────────────────────
print("=" * 60)
print("Part 1: JIT Compilation and HLO")
print("=" * 60)

def linear_relu(x, w, b):
    """Simple linear + relu — observe how XLA fuses these."""
    return jax.nn.relu(x @ w + b)

# Create inputs
key = jax.random.PRNGKey(42)
x = jax.random.normal(key, (32, 784))
w = jax.random.normal(key, (784, 256))
b = jax.random.normal(key, (256,))

# Lower to HLO (without executing)
lowered = jax.jit(linear_relu).lower(x, w, b)

# Print the StableHLO (human-readable)
print("--- StableHLO (pre-optimization) ---")
hlo_text = lowered.as_text()
# Show first 30 lines
for line in hlo_text.split("\\n")[:30]:
    print(line)

# Compile and inspect optimized HLO
compiled = lowered.compile()
opt_hlo = compiled.as_text()
print("\\n--- Optimized HLO (post-optimization) ---")
for line in opt_hlo.split("\\n")[:30]:
    print(line)

# Count fusion blocks in optimized HLO
fusion_count = opt_hlo.count("fusion")
print(f"\\nNumber of fusion blocks: {fusion_count}")

# ──────────────────────────────────────────────────────────────
# Part 2: Transformer Block — Fusion Analysis
# ──────────────────────────────────────────────────────────────
print("\\n" + "=" * 60)
print("Part 2: Transformer Block — Fusion Analysis")
print("=" * 60)

def attention(q, k, v, mask=None):
    """Scaled dot-product attention."""
    d_k = q.shape[-1]
    scores = jnp.matmul(q, jnp.swapaxes(k, -2, -1)) / jnp.sqrt(d_k)
    if mask is not None:
        scores = jnp.where(mask, scores, jnp.finfo(scores.dtype).min)
    weights = jax.nn.softmax(scores, axis=-1)
    return jnp.matmul(weights, v)

def transformer_block(x, params):
    """Full transformer block with attention + FFN."""
    wq, wk, wv, wo, w1, w2, ln1_s, ln1_b, ln2_s, ln2_b = params

    # Layer norm 1
    mean = jnp.mean(x, axis=-1, keepdims=True)
    var = jnp.var(x, axis=-1, keepdims=True)
    x_norm = (x - mean) / jnp.sqrt(var + 1e-5) * ln1_s + ln1_b

    # Multi-head attention (simplified: single head)
    q = x_norm @ wq
    k = x_norm @ wk
    v = x_norm @ wv
    attn_out = attention(q, k, v) @ wo
    x = x + attn_out  # Residual

    # Layer norm 2
    mean2 = jnp.mean(x, axis=-1, keepdims=True)
    var2 = jnp.var(x, axis=-1, keepdims=True)
    x_norm2 = (x - mean2) / jnp.sqrt(var2 + 1e-5) * ln2_s + ln2_b

    # FFN
    h = jax.nn.gelu(x_norm2 @ w1)
    ffn_out = h @ w2
    x = x + ffn_out  # Residual

    return x

# Initialize parameters
d_model = 512
d_ff = 2048
params = [
    jax.random.normal(key, (d_model, d_model)),   # wq
    jax.random.normal(key, (d_model, d_model)),   # wk
    jax.random.normal(key, (d_model, d_model)),   # wv
    jax.random.normal(key, (d_model, d_model)),   # wo
    jax.random.normal(key, (d_model, d_ff)),      # w1
    jax.random.normal(key, (d_ff, d_model)),      # w2
    jnp.ones((d_model,)),                          # ln1 scale
    jnp.zeros((d_model,)),                         # ln1 bias
    jnp.ones((d_model,)),                          # ln2 scale
    jnp.zeros((d_model,)),                         # ln2 bias
]

x_input = jax.random.normal(key, (16, 128, d_model))

# Compile and analyze
transformer_jit = jax.jit(transformer_block)
lowered_tf = transformer_jit.lower(x_input, params)
compiled_tf = lowered_tf.compile()

# Analyze HLO
opt_hlo_tf = compiled_tf.as_text()
fusion_count_tf = opt_hlo_tf.count("fusion")
dot_count = opt_hlo_tf.count("dot(")
reduce_count = opt_hlo_tf.count("reduce(")
print(f"Fusion blocks: {fusion_count_tf}")
print(f"Dot (matmul) operations: {dot_count}")
print(f"Reduce operations: {reduce_count}")

# ──────────────────────────────────────────────────────────────
# Part 3: Performance Benchmark (Eager vs JIT)
# ──────────────────────────────────────────────────────────────
print("\\n" + "=" * 60)
print("Part 3: Eager vs JIT Performance")
print("=" * 60)

# Warmup
_ = transformer_block(x_input, params)
_ = transformer_jit(x_input, params)

# Benchmark eager
n_iters = 100
start = time.perf_counter()
for _ in range(n_iters):
    out = transformer_block(x_input, params)
    out.block_until_ready()
eager_ms = (time.perf_counter() - start) / n_iters * 1000

# Benchmark JIT
start = time.perf_counter()
for _ in range(n_iters):
    out = transformer_jit(x_input, params)
    out.block_until_ready()
jit_ms = (time.perf_counter() - start) / n_iters * 1000

print(f"Eager mode: {eager_ms:.2f} ms/iter")
print(f"JIT (XLA):  {jit_ms:.2f} ms/iter")
print(f"Speedup:    {eager_ms / jit_ms:.2f}x")

# ──────────────────────────────────────────────────────────────
# Part 4: Custom Compilation Options
# ──────────────────────────────────────────────────────────────
print("\\n" + "=" * 60)
print("Part 4: Custom Compilation Options")
print("=" * 60)

# Enable float16 computation
@functools.partial(jax.jit, backend="cpu")
def transformer_fp16(x, params):
    # Cast to float16 for compute, back to float32 for output
    x_f16 = x.astype(jnp.float16)
    params_f16 = [p.astype(jnp.float16) for p in params]
    out = transformer_block(x_f16, params_f16)
    return out.astype(jnp.float32)

out_fp16 = transformer_fp16(x_input, params)
out_fp32 = transformer_jit(x_input, params)

print(f"FP32 output mean: {jnp.mean(out_fp32):.6f}")
print(f"FP16 output mean: {jnp.mean(out_fp16):.6f}")
print(f"Max diff: {jnp.max(jnp.abs(out_fp32 - out_fp16)):.4f}")

# Show memory savings
fp32_bytes = sum(p.nbytes for p in params) + x_input.nbytes
fp16_bytes = fp32_bytes // 2
print(f"\\nFP32 memory: {fp32_bytes / 1e6:.1f} MB")
print(f"FP16 memory: {fp16_bytes / 1e6:.1f} MB")
`
    },

    // =====================================================================
    // EXAMPLE 3 - MLIR Progressive Lowering
    // =====================================================================
    {
      title: "MLIR Progressive Lowering (Step-by-Step)",
      language: "python",
      code: `"""
MLIR Progressive Lowering — Understanding Each Stage
======================================================
Demonstrates how a matrix multiply is progressively lowered
through MLIR dialects: linalg -> affine -> scf -> LLVM.
Uses mlir-opt command-line tool to apply passes.
"""

# ──────────────────────────────────────────────────────────────
# Stage 0: The MLIR Source (linalg dialect)
# ──────────────────────────────────────────────────────────────
LINALG_SOURCE = """
// Matrix multiply in linalg dialect
// This is the highest-level representation: a named operation
func.func @matmul(%A: tensor<64x128xf32>,
                   %B: tensor<128x256xf32>) -> tensor<64x256xf32> {
  // Create zero-initialized output tensor
  %cst = arith.constant 0.0 : f32
  %init = tensor.empty() : tensor<64x256xf32>
  %C = linalg.fill ins(%cst : f32) outs(%init : tensor<64x256xf32>)
    -> tensor<64x256xf32>

  // Named matmul operation
  // The compiler knows the semantics: C[i,j] += A[i,k] * B[k,j]
  %result = linalg.matmul
    ins(%A, %B : tensor<64x128xf32>, tensor<128x256xf32>)
    outs(%C : tensor<64x256xf32>) -> tensor<64x256xf32>

  return %result : tensor<64x256xf32>
}
"""

print("=" * 60)
print("Stage 0: linalg.matmul (Named Operation)")
print("=" * 60)
print(LINALG_SOURCE)

# ──────────────────────────────────────────────────────────────
# Stage 1: Generalize to linalg.generic
# ──────────────────────────────────────────────────────────────
GENERIC_SOURCE = """
// After: mlir-opt --linalg-generalize-named-ops
// The named matmul is expanded to a generic form with explicit
// indexing maps and iterator types.
func.func @matmul(%A: tensor<64x128xf32>,
                   %B: tensor<128x256xf32>) -> tensor<64x256xf32> {
  %cst = arith.constant 0.0 : f32
  %init = tensor.empty() : tensor<64x256xf32>
  %C = linalg.fill ins(%cst : f32) outs(%init : tensor<64x256xf32>)
    -> tensor<64x256xf32>

  // Generic form: explicit indexing maps
  // affine_map<(i, j, k) -> (i, k)>  = A[i, k]
  // affine_map<(i, j, k) -> (k, j)>  = B[k, j]
  // affine_map<(i, j, k) -> (i, j)>  = C[i, j]
  %result = linalg.generic {
    indexing_maps = [
      affine_map<(i, j, k) -> (i, k)>,
      affine_map<(i, j, k) -> (k, j)>,
      affine_map<(i, j, k) -> (i, j)>
    ],
    iterator_types = ["parallel", "parallel", "reduction"]
  } ins(%A, %B : tensor<64x128xf32>, tensor<128x256xf32>)
    outs(%C : tensor<64x256xf32>) {
  ^bb0(%a: f32, %b: f32, %c: f32):
    %prod = arith.mulf %a, %b : f32
    %sum = arith.addf %c, %prod : f32
    linalg.yield %sum : f32
  } -> tensor<64x256xf32>

  return %result : tensor<64x256xf32>
}
"""

print("\\n" + "=" * 60)
print("Stage 1: linalg.generic (Explicit Indexing)")
print("=" * 60)
print(GENERIC_SOURCE)

# ──────────────────────────────────────────────────────────────
# Stage 2: Tile and vectorize
# ──────────────────────────────────────────────────────────────
TILED_SOURCE = """
// After: mlir-opt --linalg-tile="tile-sizes=32,32,8"
//                 --linalg-vectorize
// The computation is tiled for cache efficiency and inner
// loops are vectorized for SIMD execution.
func.func @matmul(%A: tensor<64x128xf32>,
                   %B: tensor<128x256xf32>) -> tensor<64x256xf32> {
  // ... (init as before) ...

  // Tiled loops (each processes a 32x32 output tile with k-tile=8)
  scf.for %i = 0 to 64 step 32 {
    scf.for %j = 0 to 256 step 32 {
      scf.for %k = 0 to 128 step 8 {
        // Extract tiles
        %a_tile = tensor.extract_slice %A[%i, %k] [32, 8] [1, 1]
        %b_tile = tensor.extract_slice %B[%k, %j] [8, 32] [1, 1]
        %c_tile = tensor.extract_slice %C[%i, %j] [32, 32] [1, 1]

        // Vectorized matmul on tiles
        // vector.contract computes C_tile += A_tile * B_tile
        // using SIMD instructions
        %va = vector.transfer_read %a_tile : vector<32x8xf32>
        %vb = vector.transfer_read %b_tile : vector<8x32xf32>
        %vc = vector.transfer_read %c_tile : vector<32x32xf32>
        %result = vector.contract %va, %vb, %vc
          : vector<32x8xf32>, vector<8x32xf32> into vector<32x32xf32>
        vector.transfer_write %result, %c_tile
      }
    }
  }
}
"""

print("\\n" + "=" * 60)
print("Stage 2: Tiled + Vectorized (scf + vector dialects)")
print("=" * 60)
print(TILED_SOURCE)

# ──────────────────────────────────────────────────────────────
# Stage 3: Bufferize (tensor -> memref)
# ──────────────────────────────────────────────────────────────
BUFFERIZED_SOURCE = """
// After: mlir-opt --one-shot-bufferize
// Tensors (immutable, value-semantic) become memrefs
// (mutable, reference-semantic). This is where allocation happens.
func.func @matmul(%A: memref<64x128xf32>,
                   %B: memref<128x256xf32>,
                   %C: memref<64x256xf32>) {
  // Output buffer is now a memref passed by reference
  // No more tensor.empty() — caller allocates

  scf.for %i = 0 to 64 step 32 {
    scf.for %j = 0 to 256 step 32 {
      scf.for %k = 0 to 128 step 8 {
        // memref.subview replaces tensor.extract_slice
        %a_sub = memref.subview %A[%i, %k] [32, 8] [1, 1]
          : memref<64x128xf32> to memref<32x8xf32, strided<[128, 1], offset: ?>>
        // ... similar for B, C ...

        // Vector ops read/write directly from/to memrefs
        %va = vector.transfer_read %a_sub[%c0, %c0], %cst
          : memref<32x8xf32, ...>, vector<32x8xf32>
        // ... contract and write back ...
      }
    }
  }
  return
}
"""

print("\\n" + "=" * 60)
print("Stage 3: Bufferized (memref dialect)")
print("=" * 60)
print(BUFFERIZED_SOURCE)

# ──────────────────────────────────────────────────────────────
# Stage 4: Lower to LLVM dialect
# ──────────────────────────────────────────────────────────────
LLVM_SOURCE = """
// After: mlir-opt --convert-vector-to-llvm
//                 --convert-memref-to-llvm
//                 --convert-scf-to-cf
//                 --convert-func-to-llvm
// Everything is now in LLVM dialect — ready for LLVM codegen
llvm.func @matmul(%A: !llvm.ptr, %B: !llvm.ptr, %C: !llvm.ptr) {
  // Loops become cf.br (branch) operations
  // Vector ops become LLVM vector intrinsics:
  //   llvm.intr.fmuladd (fused multiply-add)
  //   llvm.intr.x86.avx2.vfmadd.ps (AVX2 FMA)
  // Memory access becomes llvm.load / llvm.store
  // with GEP (get-element-pointer) for indexing

  // This LLVM dialect IR is then:
  // 1. Converted to LLVM IR (.ll)
  // 2. Optimized by LLVM opt passes
  // 3. Compiled to machine code by llc
  // 4. Linked into a shared library (.so)
}
"""

print("\\n" + "=" * 60)
print("Stage 4: LLVM Dialect (Ready for Codegen)")
print("=" * 60)
print(LLVM_SOURCE)

# ──────────────────────────────────────────────────────────────
# Practical: Running the full pipeline with mlir-opt
# ──────────────────────────────────────────────────────────────
PIPELINE_COMMANDS = """
# Save the linalg source to a file
cat > matmul.mlir << 'EOF'
func.func @matmul(%A: tensor<64x128xf32>,
                   %B: tensor<128x256xf32>) -> tensor<64x256xf32> {
  %cst = arith.constant 0.0 : f32
  %init = tensor.empty() : tensor<64x256xf32>
  %C = linalg.fill ins(%cst : f32) outs(%init : tensor<64x256xf32>)
    -> tensor<64x256xf32>
  %result = linalg.matmul
    ins(%A, %B : tensor<64x128xf32>, tensor<128x256xf32>)
    outs(%C : tensor<64x256xf32>) -> tensor<64x256xf32>
  return %result : tensor<64x256xf32>
}
EOF

# Step-by-step lowering (inspect IR at each stage):

# 1. Generalize named ops
mlir-opt matmul.mlir --linalg-generalize-named-ops -o stage1.mlir

# 2. Tile
mlir-opt stage1.mlir \\
  --transform-interpreter='entry-point=tile_matmul' -o stage2.mlir

# 3. Vectorize
mlir-opt stage2.mlir --linalg-vectorize -o stage3.mlir

# 4. Bufferize
mlir-opt stage3.mlir --one-shot-bufferize \\
  --buffer-deallocation -o stage4.mlir

# 5. Lower to LLVM
mlir-opt stage4.mlir \\
  --convert-vector-to-llvm \\
  --convert-memref-to-llvm \\
  --convert-scf-to-cf \\
  --convert-func-to-llvm \\
  --reconcile-unrealized-casts -o stage5.mlir

# 6. Translate to LLVM IR and compile
mlir-translate stage5.mlir --mlir-to-llvmir -o matmul.ll
llc matmul.ll -filetype=obj -o matmul.o
clang matmul.o -shared -o matmul.so
"""

print("\\n" + "=" * 60)
print("Practical: Running the Pipeline with mlir-opt")
print("=" * 60)
print(PIPELINE_COMMANDS)
`
    },

    // =====================================================================
    // EXAMPLE 4 - TVM MetaSchedule Auto-Tuning
    // =====================================================================
    {
      title: "TVM MetaSchedule Auto-Tuning",
      language: "python",
      code: `"""
TVM MetaSchedule Auto-Tuning
==============================
Demonstrates template-free auto-tuning with MetaSchedule.
Tunes a MobileNetV2 model for CPU, comparing tuned vs untuned
performance. Shows search space analysis and cost models.
"""

import tvm
from tvm import relay, meta_schedule as ms
from tvm.meta_schedule import TuneConfig
import numpy as np
import time

# ──────────────────────────────────────────────────────────────
# Step 1: Load Model
# ──────────────────────────────────────────────────────────────
print("=" * 60)
print("Step 1: Load MobileNetV2 into Relay")
print("=" * 60)

import torch
model = torch.hub.load("pytorch/vision", "mobilenet_v2", pretrained=True).eval()
scripted = torch.jit.trace(model, torch.randn(1, 3, 224, 224))
mod, params = relay.frontend.from_pytorch(scripted, [("input0", [1, 3, 224, 224])])
print("Model loaded into Relay IR")

# ──────────────────────────────────────────────────────────────
# Step 2: Extract Tuning Tasks
# ──────────────────────────────────────────────────────────────
print("\\n" + "=" * 60)
print("Step 2: Extract Tuning Tasks")
print("=" * 60)

target = tvm.target.Target("llvm -mcpu=native -num-cores=4")

# Extract unique compute tasks from the model
extracted_tasks = ms.relay_integration.extract_tasks(mod, target, params)

print(f"Found {len(extracted_tasks)} unique tasks to tune:")
for i, task in enumerate(extracted_tasks):
    # Each task is a unique compute pattern (conv2d with specific shapes, etc.)
    print(f"  Task {i}: {task.task_name}")
    print(f"    Workload hash: {task.workload_key[:16]}...")

# ──────────────────────────────────────────────────────────────
# Step 3: Analyze Search Space for One Task
# ──────────────────────────────────────────────────────────────
print("\\n" + "=" * 60)
print("Step 3: Search Space Analysis")
print("=" * 60)

# Pick the first conv2d task
sample_task = extracted_tasks[0]

# Generate design space (all valid schedules)
space_gen = ms.space_generator.PostOrderApply()
# This generates schedule candidates by applying rules:
# - MultiLevelTiling: Tile loops at multiple levels (L1, L2, register)
# - AutoInline: Inline element-wise ops into consumers
# - ParallelizeVectorizeUnroll: Apply parallel/vectorize/unroll
# - AutoBind: Bind loops to GPU threads (if GPU target)
print(f"Space generator: PostOrderApply")
print("Schedule rules applied:")
print("  - MultiLevelTiling (SSRSRS pattern for CPU)")
print("  - AutoInline (fuse element-wise ops)")
print("  - ParallelizeVectorizeUnroll")
print("  - CrossThreadReduction (for GPU)")

# ──────────────────────────────────────────────────────────────
# Step 4: Run Auto-Tuning
# ──────────────────────────────────────────────────────────────
print("\\n" + "=" * 60)
print("Step 4: Auto-Tuning (MetaSchedule)")
print("=" * 60)

work_dir = "./ms_tune_mobilenetv2"

# Configure tuning
# In production, you'd use more trials (1000-5000 per task)
# Here we use fewer for demonstration
tune_config = TuneConfig(
    strategy="evolutionary",          # Evolutionary search
    num_trials_per_iter=64,           # Candidates per iteration
    max_trials_per_task=128,          # Max trials per task (low for demo)
    max_trials_global=512,            # Max total trials
)

print(f"Tuning config:")
print(f"  Strategy: evolutionary")
print(f"  Trials per task: {tune_config.max_trials_per_task}")
print(f"  Global max trials: {tune_config.max_trials_global}")
print(f"  Work dir: {work_dir}")

# Run tuning (this is the time-consuming step)
# In production, this runs for hours on the target hardware
print("\\nStarting tuning... (this may take several minutes)")
database = ms.relay_integration.tune_relay(
    mod=mod,
    params=params,
    target=target,
    work_dir=work_dir,
    max_trials_global=tune_config.max_trials_global,
    max_trials_per_task=tune_config.max_trials_per_task,
    num_trials_per_iter=tune_config.num_trials_per_iter,
    strategy=tune_config.strategy,
)
print("Tuning complete!")

# ──────────────────────────────────────────────────────────────
# Step 5: Compile with Tuned Schedules
# ──────────────────────────────────────────────────────────────
print("\\n" + "=" * 60)
print("Step 5: Compile with Tuned Schedules")
print("=" * 60)

# Compile with tuning database
with ms.database.JSONDatabase(
    path_workload=f"{work_dir}/database_workload.json",
    path_tuning_record=f"{work_dir}/database_tuning_record.json",
):
    with tvm.transform.PassContext(opt_level=3):
        lib_tuned = relay.build(mod, target=target, params=params)

lib_tuned.export_library("mobilenetv2_tuned.so")
print("Tuned model exported: mobilenetv2_tuned.so")

# ──────────────────────────────────────────────────────────────
# Step 6: Compile without Tuning (Baseline)
# ──────────────────────────────────────────────────────────────
print("\\n" + "=" * 60)
print("Step 6: Baseline (No Tuning)")
print("=" * 60)

with tvm.transform.PassContext(opt_level=3):
    lib_baseline = relay.build(mod, target=target, params=params)

lib_baseline.export_library("mobilenetv2_baseline.so")
print("Baseline model exported: mobilenetv2_baseline.so")

# ──────────────────────────────────────────────────────────────
# Step 7: Benchmark Comparison
# ──────────────────────────────────────────────────────────────
print("\\n" + "=" * 60)
print("Step 7: Benchmark Comparison")
print("=" * 60)

from tvm.contrib import graph_executor

dev = tvm.cpu(0)
input_np = np.random.randn(1, 3, 224, 224).astype("float32")

def benchmark_model(lib, name, dev, input_np, warmup=10, repeat=5, number=50):
    """Benchmark a compiled TVM model."""
    runtime = graph_executor.GraphModule(lib["default"](dev))
    runtime.set_input("input0", input_np)

    # Warmup
    for _ in range(warmup):
        runtime.run()

    # Benchmark
    result = runtime.benchmark(dev, number=number, repeat=repeat)
    mean_ms = result.mean * 1000
    std_ms = result.std * 1000
    print(f"  {name}: {mean_ms:.2f} +/- {std_ms:.2f} ms")
    return mean_ms, runtime

baseline_ms, rt_base = benchmark_model(lib_baseline, "Baseline (untuned)", dev, input_np)
tuned_ms, rt_tuned = benchmark_model(lib_tuned, "Tuned (MetaSchedule)", dev, input_np)

print(f"\\n  Speedup: {baseline_ms / tuned_ms:.2f}x")

# Verify correctness
rt_base.set_input("input0", input_np)
rt_base.run()
out_base = rt_base.get_output(0).numpy()

rt_tuned.set_input("input0", input_np)
rt_tuned.run()
out_tuned = rt_tuned.get_output(0).numpy()

print(f"  Max diff: {np.max(np.abs(out_base - out_tuned)):.6e}")

# ──────────────────────────────────────────────────────────────
# Step 8: Inspect Best Schedules
# ──────────────────────────────────────────────────────────────
print("\\n" + "=" * 60)
print("Step 8: Inspect Best Schedules")
print("=" * 60)

import json

# Read tuning records
records_path = f"{work_dir}/database_tuning_record.json"
try:
    with open(records_path) as f:
        records = [json.loads(line) for line in f if line.strip()]

    print(f"Total tuning records: {len(records)}")

    # Show best latencies per task
    task_best = {}
    for record in records:
        task_name = record.get("task_name", "unknown")
        latency = record.get("run_secs", [float("inf")])[0]
        if task_name not in task_best or latency < task_best[task_name]:
            task_best[task_name] = latency

    print("\\nBest latency per task:")
    for name, lat in sorted(task_best.items(), key=lambda x: -x[1]):
        print(f"  {name}: {lat*1000:.3f} ms")
except FileNotFoundError:
    print("(Tuning records not found - run tuning first)")
`
    },

    // =====================================================================
    // EXAMPLE 5 - IREE: Cross-Platform Compilation
    // =====================================================================
    {
      title: "IREE: Cross-Platform Compilation & Deployment",
      language: "python",
      code: `"""
IREE Cross-Platform Compilation
=================================
Demonstrates compiling a model with IREE for multiple targets
(CPU, Vulkan GPU), running inference, and benchmarking.
"""

import numpy as np

# ──────────────────────────────────────────────────────────────
# Part 1: Compile from MLIR Source
# ──────────────────────────────────────────────────────────────
print("=" * 60)
print("Part 1: Compile MLIR to IREE Module")
print("=" * 60)

# A small neural network layer in linalg-on-tensors
MLIR_MODEL = """
func.func @conv_relu(
    %input: tensor<1x3x224x224xf32>,
    %weight: tensor<16x3x3x3xf32>,
    %bias: tensor<16xf32>
  ) -> tensor<1x16x222x222xf32> {

  %cst = arith.constant 0.0 : f32
  %init = tensor.empty() : tensor<1x16x222x222xf32>
  %fill = linalg.fill ins(%cst : f32) outs(%init : tensor<1x16x222x222xf32>)
    -> tensor<1x16x222x222xf32>

  // 2D convolution
  %conv = linalg.conv_2d_nchw_fchw {
    dilations = dense<1> : tensor<2xi64>,
    strides = dense<1> : tensor<2xi64>
  } ins(%input, %weight : tensor<1x3x224x224xf32>, tensor<16x3x3x3xf32>)
    outs(%fill : tensor<1x16x222x222xf32>) -> tensor<1x16x222x222xf32>

  // Add bias (broadcast across spatial dims)
  %bias_4d = tensor.expand_shape %bias [[0, 1, 2, 3]]
    : tensor<16xf32> into tensor<1x16x1x1xf32>
  %biased = linalg.generic {
    indexing_maps = [
      affine_map<(n, c, h, w) -> (n, c, h, w)>,
      affine_map<(n, c, h, w) -> (0, c, 0, 0)>,
      affine_map<(n, c, h, w) -> (n, c, h, w)>
    ],
    iterator_types = ["parallel", "parallel", "parallel", "parallel"]
  } ins(%conv, %bias_4d : tensor<1x16x222x222xf32>, tensor<1x16x1x1xf32>)
    outs(%init : tensor<1x16x222x222xf32>) {
  ^bb0(%a: f32, %b: f32, %c: f32):
    %sum = arith.addf %a, %b : f32
    linalg.yield %sum : f32
  } -> tensor<1x16x222x222xf32>

  // ReLU
  %zero = arith.constant 0.0 : f32
  %relu = linalg.generic {
    indexing_maps = [
      affine_map<(n, c, h, w) -> (n, c, h, w)>,
      affine_map<(n, c, h, w) -> (n, c, h, w)>
    ],
    iterator_types = ["parallel", "parallel", "parallel", "parallel"]
  } ins(%biased : tensor<1x16x222x222xf32>)
    outs(%init : tensor<1x16x222x222xf32>) {
  ^bb0(%a: f32, %c: f32):
    %max = arith.maximumf %a, %zero : f32
    linalg.yield %max : f32
  } -> tensor<1x16x222x222xf32>

  return %relu : tensor<1x16x222x222xf32>
}
"""

# ──────────────────────────────────────────────────────────────
# Compile for CPU using iree-compile (command-line)
# ──────────────────────────────────────────────────────────────
COMPILE_COMMANDS = """
# Save the MLIR source
cat > conv_relu.mlir << 'MLIR_EOF'
{mlir_source}
MLIR_EOF

# Compile for CPU (LLVM backend)
iree-compile \\
  --iree-input-type=auto \\
  --iree-hal-target-backends=llvm-cpu \\
  --iree-llvmcpu-target-cpu=native \\
  conv_relu.mlir -o conv_relu_cpu.vmfb

# Compile for Vulkan GPU
iree-compile \\
  --iree-input-type=auto \\
  --iree-hal-target-backends=vulkan-spirv \\
  --iree-vulkan-target-triple=valhall-unknown-android31 \\
  conv_relu.mlir -o conv_relu_vulkan.vmfb

# Compile for CUDA
iree-compile \\
  --iree-input-type=auto \\
  --iree-hal-target-backends=cuda \\
  --iree-hal-cuda-llvm-target-arch=sm_80 \\
  conv_relu.mlir -o conv_relu_cuda.vmfb

# Benchmark on CPU
iree-benchmark-module \\
  --module=conv_relu_cpu.vmfb \\
  --function=conv_relu \\
  --input=1x3x224x224xf32 \\
  --input=16x3x3x3xf32 \\
  --input=16xf32
"""

print(COMPILE_COMMANDS.format(mlir_source="... (MLIR source above) ..."))

# ──────────────────────────────────────────────────────────────
# Part 2: Python API
# ──────────────────────────────────────────────────────────────
print("\\n" + "=" * 60)
print("Part 2: IREE Python API")
print("=" * 60)

PYTHON_API = """
import iree.compiler as ireec
import iree.runtime as ireert
import numpy as np

# Compile from MLIR string
compiled_bytes = ireec.tools.compile_str(
    MLIR_MODEL,
    target_backends=["llvm-cpu"],
    input_type="auto",
    extra_args=[
        "--iree-llvmcpu-target-cpu=native",
        "--iree-opt-data-tiling",          # Enable data tiling for perf
    ],
)
print(f"Compiled module size: {len(compiled_bytes)} bytes")

# Create runtime config
config = ireert.Config("local-task")  # CPU with task-parallel runtime

# Load module
instance = ireert.SystemContext(config=config)
vm_module = ireert.VmModule.copy_buffer(instance.instance, compiled_bytes)
instance.add_vm_module(vm_module)

# Prepare inputs
input_data = np.random.randn(1, 3, 224, 224).astype(np.float32)
weight_data = np.random.randn(16, 3, 3, 3).astype(np.float32)
bias_data = np.random.randn(16).astype(np.float32)

# Run inference
f = instance.modules.module.conv_relu
result = f(input_data, weight_data, bias_data)
print(f"Output shape: {np.array(result).shape}")  # (1, 16, 222, 222)

# Benchmark
import time
n_runs = 100
# Warmup
for _ in range(10):
    _ = f(input_data, weight_data, bias_data)

start = time.perf_counter()
for _ in range(n_runs):
    _ = f(input_data, weight_data, bias_data)
elapsed = (time.perf_counter() - start) / n_runs * 1000
print(f"IREE CPU inference: {elapsed:.2f} ms")
"""

print(PYTHON_API)

# ──────────────────────────────────────────────────────────────
# Part 3: PyTorch to IREE via torch-mlir
# ──────────────────────────────────────────────────────────────
print("\\n" + "=" * 60)
print("Part 3: PyTorch -> torch-mlir -> IREE")
print("=" * 60)

TORCH_TO_IREE = """
import torch
import torch_mlir
import iree.compiler as ireec
import iree.runtime as ireert
import numpy as np

# Define model
class MobileBlock(torch.nn.Module):
    def __init__(self, in_ch, out_ch, stride=1):
        super().__init__()
        # Depthwise separable convolution
        self.dw = torch.nn.Conv2d(in_ch, in_ch, 3, stride, 1, groups=in_ch, bias=False)
        self.bn1 = torch.nn.BatchNorm2d(in_ch)
        self.pw = torch.nn.Conv2d(in_ch, out_ch, 1, bias=False)
        self.bn2 = torch.nn.BatchNorm2d(out_ch)
        self.relu = torch.nn.ReLU6()

    def forward(self, x):
        x = self.relu(self.bn1(self.dw(x)))
        x = self.relu(self.bn2(self.pw(x)))
        return x

model = MobileBlock(32, 64).eval()
example = torch.randn(1, 32, 112, 112)

# Step 1: PyTorch -> MLIR (linalg-on-tensors)
mlir_module = torch_mlir.compile(
    model,
    example,
    output_type=torch_mlir.OutputType.LINALG_ON_TENSORS,
    use_tracing=True,
)
mlir_text = mlir_module.operation.get_asm(large_elements_limit=10)
print(f"MLIR module size: {len(mlir_text)} chars")

# Step 2: MLIR -> IREE (compile for multiple targets)
targets = {
    "cpu": ["llvm-cpu"],
    "vulkan": ["vulkan-spirv"],
}

for name, backends in targets.items():
    try:
        compiled = ireec.tools.compile_str(
            mlir_text,
            target_backends=backends,
            input_type="auto",
        )
        print(f"  {name}: {len(compiled)} bytes compiled")

        # Run inference on CPU
        if name == "cpu":
            config = ireert.Config("local-task")
            instance = ireert.SystemContext(config=config)
            vm_module = ireert.VmModule.copy_buffer(instance.instance, compiled)
            instance.add_vm_module(vm_module)

            input_np = example.numpy()
            f = instance.modules.module.forward
            result = f(input_np)

            # Compare with PyTorch
            with torch.no_grad():
                torch_out = model(example).numpy()

            max_diff = np.max(np.abs(torch_out - np.array(result)))
            print(f"  Max diff vs PyTorch: {max_diff:.6e}")
    except Exception as e:
        print(f"  {name}: compilation failed ({e})")
"""

print(TORCH_TO_IREE)

# ──────────────────────────────────────────────────────────────
# Part 4: Multi-Target Deployment Strategy
# ──────────────────────────────────────────────────────────────
print("\\n" + "=" * 60)
print("Part 4: Multi-Target Deployment Strategy")
print("=" * 60)

MULTI_TARGET = """
# Production multi-target compilation script
# Compiles a single model for all target platforms

import subprocess
import json
from pathlib import Path

TARGETS = {
    "x86_server": {
        "backend": "llvm-cpu",
        "flags": ["--iree-llvmcpu-target-cpu=skylake-avx512"],
    },
    "arm_mobile": {
        "backend": "llvm-cpu",
        "flags": ["--iree-llvmcpu-target-triple=aarch64-linux-android30"],
    },
    "vulkan_gpu": {
        "backend": "vulkan-spirv",
        "flags": ["--iree-vulkan-target-triple=valhall-unknown-android31"],
    },
    "cuda_gpu": {
        "backend": "cuda",
        "flags": ["--iree-hal-cuda-llvm-target-arch=sm_80"],
    },
}

model_mlir = "model.mlir"
output_dir = Path("compiled_models")
output_dir.mkdir(exist_ok=True)

results = {}
for target_name, config in TARGETS.items():
    output_path = output_dir / f"model_{target_name}.vmfb"
    cmd = [
        "iree-compile",
        f"--iree-hal-target-backends={config['backend']}",
        *config["flags"],
        "--iree-input-type=auto",
        model_mlir,
        "-o", str(output_path),
    ]

    print(f"Compiling for {target_name}...")
    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode == 0:
        size_kb = output_path.stat().st_size / 1024
        results[target_name] = {"status": "ok", "size_kb": size_kb}
        print(f"  OK: {size_kb:.1f} KB")
    else:
        results[target_name] = {"status": "error", "error": result.stderr[:200]}
        print(f"  FAILED: {result.stderr[:200]}")

# Save manifest
manifest = {"model": model_mlir, "targets": results}
with open(output_dir / "manifest.json", "w") as f:
    json.dump(manifest, f, indent=2)
print(f"\\nManifest saved to {output_dir / 'manifest.json'}")
"""

print(MULTI_TARGET)
`
    },

    // =====================================================================
    // EXAMPLE 6 - Full-Stack Profiling & Bottleneck Resolution
    // =====================================================================
    {
      title: "Full-Stack Profiling & Bottleneck Resolution",
      language: "python",
      code: `"""
Full-Stack Profiling & Bottleneck Resolution
==============================================
Demonstrates systematic profiling at every layer:
model -> graph -> operator -> hardware -> runtime.
Identifies bottlenecks and shows how to fix each one.
"""

import numpy as np
import time
import json

# ──────────────────────────────────────────────────────────────
# Part 1: Model-Level Profiling with TVM
# ──────────────────────────────────────────────────────────────
print("=" * 60)
print("Part 1: Model-Level Profiling")
print("=" * 60)

MODEL_PROFILING = """
import tvm
from tvm import relay
from tvm.contrib import graph_executor

# Load and compile model
mod, params = relay.frontend.from_pytorch(scripted_model, shape_list)
target = tvm.target.Target("llvm -mcpu=native")

with tvm.transform.PassContext(opt_level=3):
    lib = relay.build(mod, target=target, params=params)

dev = tvm.cpu(0)
runtime = graph_executor.GraphModule(lib["default"](dev))
runtime.set_input("input0", input_np)

# Profile per-operator execution time
profile_result = runtime.profile(dev)
print(profile_result)

# Output looks like:
# Name                    | Duration (us) | Percent
# ========================|===============|========
# fused_nn_conv2d_add_relu|    1234.5     |  45.2%
# fused_nn_dense_add      |     567.8     |  20.8%
# fused_nn_batch_norm     |     234.1     |   8.6%
# ...

# Identify the hotspot: which operator takes the most time?
# Common findings:
# - First conv2d (large spatial, few channels) = memory-bound
# - Depthwise conv2d = memory-bound (low arithmetic intensity)
# - Final dense/linear = compute-bound (large matmul)
# - Unfused batch_norm = should be fused (compiler issue!)
"""
print(MODEL_PROFILING)

# ──────────────────────────────────────────────────────────────
# Part 2: Graph-Level Analysis
# ──────────────────────────────────────────────────────────────
print("\\n" + "=" * 60)
print("Part 2: Graph-Level Analysis")
print("=" * 60)

GRAPH_ANALYSIS = """
import tvm
from tvm import relay

# Enable fusion logging to see what got fused
with tvm.transform.PassContext(opt_level=3, config={
    "relay.FuseOps.max_depth": 100,  # Allow deep fusion
}) as pass_ctx:
    # Apply fusion pass explicitly to inspect results
    fused_mod = relay.transform.FuseOps(fuse_opt_level=3)(mod)

# Inspect fused functions
for global_var in fused_mod.get_global_vars():
    func = fused_mod[global_var]
    if hasattr(func, 'body'):
        print(f"Function: {global_var.name_hint}")
        # Count ops in each fused group
        op_count = [0]
        def counter(e):
            if isinstance(e, tvm.relay.Call):
                op_count[0] += 1
        relay.analysis.post_order_visit(func.body, counter)
        print(f"  Ops fused: {op_count[0]}")

# Common graph-level issues to look for:

# Issue 1: Unfused batch_norm
# Symptom: batch_norm appears as separate op in profile
# Fix: Ensure SimplifyInference pass runs before FuseOps
#   relay.transform.SimplifyInference() folds BN into conv weights

# Issue 2: Unnecessary transposes
# Symptom: layout_transform ops in the profile (pure memory traffic)
# Fix: Set preferred layout early
with tvm.transform.PassContext(opt_level=3):
    desired_layout = {"nn.conv2d": ["NHWC", "HWIO"]}  # for ARM
    seq = tvm.transform.Sequential([
        relay.transform.ConvertLayout(desired_layout),
        relay.transform.FuseOps(),
    ])
    optimized = seq(mod)

# Issue 3: Dynamic shapes preventing fusion
# Symptom: Operators that should fuse are separate
# Fix: Use static shapes when possible, or use Relax for dynamic
"""
print(GRAPH_ANALYSIS)

# ──────────────────────────────────────────────────────────────
# Part 3: Operator-Level Schedule Analysis
# ──────────────────────────────────────────────────────────────
print("\\n" + "=" * 60)
print("Part 3: Operator-Level Schedule Analysis")
print("=" * 60)

OPERATOR_ANALYSIS = """
# After auto-tuning, inspect the chosen schedule for the hottest operator

import tvm
from tvm import te

# Example: Analyze a conv2d schedule
# Load tuning record for the hottest operator
import json

with open("tune_results/database_tuning_record.json") as f:
    records = [json.loads(line) for line in f if line.strip()]

# Find the record for our target operator
for record in records:
    if "conv2d" in record.get("task_name", ""):
        # The schedule trace shows:
        trace = record.get("trace", {})
        print(f"Task: {record['task_name']}")
        print(f"Latency: {record.get('run_secs', ['?'])[0]*1000:.3f} ms")

        # Inspect schedule decisions:
        # - Tile sizes: Are they good for L1/L2 cache?
        # - Vectorization: Is innermost loop vectorized?
        # - Parallelism: Is outer loop parallelized?

        for step in trace.get("insts", []):
            print(f"  {step}")
        break

# Manual schedule analysis checklist:
# 1. Tile sizes align with cache?
#    L1 = 32KB -> inner tiles should fit: 32*32*4 = 4KB (good)
#    L2 = 256KB -> outer tiles should fit: 128*128*4 = 64KB (good)
#
# 2. Innermost loop vectorized?
#    NEON: vectorize by 4 (float32) or 8 (float16)
#    AVX2: vectorize by 8 (float32)
#    AVX-512: vectorize by 16 (float32)
#
# 3. Reduction axis handled correctly?
#    K-axis tiled for register reuse
#    Inner K loop should be unrolled
#
# 4. Memory access pattern?
#    Innermost loop should access contiguous memory (stride-1)
#    If not -> vectorization is scatter/gather (slow!)
"""
print(OPERATOR_ANALYSIS)

# ──────────────────────────────────────────────────────────────
# Part 4: Hardware-Level Profiling
# ──────────────────────────────────────────────────────────────
print("\\n" + "=" * 60)
print("Part 4: Hardware-Level Profiling")
print("=" * 60)

HARDWARE_PROFILING = """
# CPU Profiling with perf (Linux)
# ================================

# Profile cache behavior
perf stat -e cache-misses,cache-references,instructions,cycles \\
    ./run_inference

# Example output:
#   1,234,567  cache-misses    # 12.3% of all cache refs (HIGH - investigate!)
#  10,000,000  cache-references
# 500,000,000  instructions
# 200,000,000  cycles          # IPC = 2.5 (good for compute-bound)

# If cache miss rate > 10%: tile sizes are wrong
# If IPC < 1.0: likely memory-bound, need better fusion/tiling

# Profile SIMD utilization with perf
perf stat -e fp_arith_inst_retired.128b_packed_single,\\
            fp_arith_inst_retired.256b_packed_single,\\
            fp_arith_inst_retired.512b_packed_single \\
    ./run_inference

# If 128b >> 256b: compiler isn't using AVX2 (check target flags!)
# If 256b >> 512b: AVX-512 not being used (might be intentional - thermal)

# GPU Profiling with NVIDIA Nsight Compute
# ==========================================

# Profile kernel-level metrics
ncu --set full --target-processes all \\
    python run_inference.py

# Key metrics to check:
# - Achieved Occupancy: >50% is good, <30% means register pressure
# - Memory Throughput: close to peak bandwidth = memory-bound
# - Compute Throughput: close to peak FLOPS = compute-bound
# - L2 Cache Hit Rate: >50% means good data reuse
# - Shared Memory Bank Conflicts: should be 0 or very low

# Profile timeline with Nsight Systems
nsys profile --trace=cuda,nvtx \\
    python run_inference.py
# Opens in Nsight Systems GUI - look for:
# - Gaps between kernels (launch overhead)
# - Unnecessary memcpy between host and device
# - Small kernels that should be fused

# ARM CPU Profiling (for mobile/edge)
# =====================================

# Use simpleperf on Android
simpleperf record -g --app com.example.inference
simpleperf report --sort symbol

# Key things to check:
# - NEON utilization (look for NEON instructions in disassembly)
# - Branch misprediction (if-heavy code is bad for ARM in-order cores)
# - Memory stalls (check memory hierarchy access patterns)
"""
print(HARDWARE_PROFILING)

# ──────────────────────────────────────────────────────────────
# Part 5: Common Bottlenecks and Fixes
# ──────────────────────────────────────────────────────────────
print("\\n" + "=" * 60)
print("Part 5: Bottleneck Resolution Playbook")
print("=" * 60)

PLAYBOOK = """
# ================================================================
# BOTTLENECK RESOLUTION PLAYBOOK
# ================================================================

# Symptom 1: Model is 3x slower than expected
# ------------------------------------------
# Diagnostic steps:
# 1. Profile: is one operator dominating? (model-level)
# 2. Check fusion log: are ops fusing correctly? (graph-level)
# 3. Inspect generated code: vectorized? right tile sizes? (operator-level)
# 4. Run hardware profiler: cache misses? SIMD utilization? (hardware-level)

# Symptom 2: Adding a single layer kills performance
# --------------------------------------------------
# Cause: The new op breaks fusion chains
# Example: custom activation between conv and BN
#   Before: conv2d -> relu -> conv2d (fused: 2 kernels)
#   After:  conv2d -> custom_act -> relu -> conv2d (4 kernels!)
# Fix: Register custom op with fusion rules, or inline it

# Symptom 3: First inference is very slow, subsequent are fast
# -----------------------------------------------------------
# Cause: JIT compilation (XLA) or memory allocation (first run)
# Fix:
#   - AOT compilation eliminates JIT overhead
#   - Pre-allocate memory pools: tvm.contrib.cc.create_shared()
#   - Use CUDA graphs for GPU (captures kernel launches)

# Symptom 4: Different latency on "same" hardware
# ------------------------------------------------
# Cause: Frequency scaling, thermal throttling, background processes
# Fix:
#   - Pin CPU frequency: cpupower frequency-set -g performance
#   - Isolate cores: taskset -c 0-3 ./inference
#   - Warm up before benchmarking (10-20 iterations)
#   - Use median, not mean (resistant to outliers)

# Symptom 5: Quantized model is NOT faster
# -----------------------------------------
# Cause: Quantize/dequantize overhead, or hardware doesn't support INT8
# Check:
#   1. Is the target hardware INT8 capable? (VNNI, NEON dot product)
#   2. Are there Q/DQ ops at fusion boundaries? (preventing fusion)
#   3. Is the compiler generating native INT8 instructions?
# Fix: Use per-channel quantization, ensure all ops in a fused
#      group use the same quantization parameters

# Symptom 6: Multi-threaded execution is slower than single-threaded
# ------------------------------------------------------------------
# Cause: Thread synchronization overhead, false sharing, NUMA effects
# Fix:
#   - Increase minimum work per thread (larger outer tiles)
#   - Avoid parallelizing inner loops (overhead > benefit)
#   - Use thread affinity: bind threads to physical cores
#   - For NUMA: allocate memory local to the executing core

# ================================================================
# DECISION TREE: WHICH LEVEL TO OPTIMIZE FIRST?
# ================================================================
#
# [Measure end-to-end latency]
#   |
#   v
# [Profile per-operator] -> One op > 50% of total?
#   |                         |
#   | No                      | Yes
#   v                         v
# [Check fusion log]       [Tune that operator]
# Missing fusions?          - Auto-tune tile sizes
#   |                       - Check vectorization
#   | Yes -> Fix fusion     - Profile cache behavior
#   | No                      |
#   v                         v
# [Check layout]           [Still slow?]
# Unnecessary transposes?    - Check hardware limits
#   |                       - Roofline analysis
#   | Yes -> Fix layout     - Is it already at peak?
#   | No
#   v
# [Check runtime]
# Kernel launch overhead?
# Memory allocation?
# -> Use AOT, pre-alloc, CUDA graphs
"""
print(PLAYBOOK)
`
    }
  ];
})();
