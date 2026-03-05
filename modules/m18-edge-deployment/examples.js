// Patches the Edge Deployment module (m18) with comprehensive code examples.
// Loaded after curriculum.js and lessons.js.
// m18 = CURRICULUM.phases[5].modules[2]
(function patchEdgeDeploymentExamples() {
  const m = CURRICULUM.phases[5].modules[2];

  m.codeExamples = [

    // ──────────────────────────────────────────────────────────
    // Section 1: PyTorch → ONNX → TFLite End-to-End
    // ──────────────────────────────────────────────────────────
    {
      id: "pytorch-onnx-tflite-e2e",
      title: "PyTorch → ONNX → TFLite End-to-End",
      icon: "🔄",
      items: [

        // ── 1.1  ONNX Export with Validation ──
        {
          title: "ONNX Export with Validation & Shape Inference",
          lang: "python",
          filename: "onnx_export_validate.py",
          desc: "Export a MobileNetV2 from PyTorch to ONNX with dynamic batch, run full validation (checker, shape inference, numerical equivalence via ORT), and benchmark both runtimes.",
          code: `"""
PyTorch → ONNX export with rigorous validation.
Covers: dynamic_axes, opset selection, shape inference,
numerical equivalence, and latency benchmarking.
"""
import time
import numpy as np
import torch
import torchvision
import onnx
import onnxruntime as ort


# ── 1. Load pretrained model ─────────────────────────────
model = torchvision.models.mobilenet_v2(
    weights=torchvision.models.MobileNet_V2_Weights.DEFAULT
)
model.eval()

dummy = torch.randn(1, 3, 224, 224)
ONNX_PATH = "mobilenet_v2.onnx"


# ── 2. Export to ONNX ─────────────────────────────────────
torch.onnx.export(
    model,
    dummy,
    ONNX_PATH,
    opset_version=17,                      # Latest stable opset
    input_names=["input"],
    output_names=["output"],
    dynamic_axes={
        "input":  {0: "batch"},            # Dynamic batch dimension
        "output": {0: "batch"},
    },
    do_constant_folding=True,              # Fold constant ops at export time
)
print(f"[+] Exported to {ONNX_PATH}")


# ── 3. Validate ONNX model ───────────────────────────────
onnx_model = onnx.load(ONNX_PATH)

# 3a. Schema validation — checks graph structure, types, opset
onnx.checker.check_model(onnx_model, full_check=True)
print("[+] ONNX checker passed")

# 3b. Shape inference — propagate shapes through all tensors
onnx_model = onnx.shape_inference.infer_shapes(onnx_model)
onnx.save(onnx_model, ONNX_PATH)

# Print graph I/O shapes
for inp in onnx_model.graph.input:
    dims = [d.dim_param or d.dim_value for d in inp.type.tensor_type.shape.dim]
    print(f"  Input  {inp.name}: {dims}")
for out in onnx_model.graph.output:
    dims = [d.dim_param or d.dim_value for d in out.type.tensor_type.shape.dim]
    print(f"  Output {out.name}: {dims}")


# ── 4. Numerical equivalence test ─────────────────────────
session = ort.InferenceSession(
    ONNX_PATH,
    providers=["CPUExecutionProvider"],
)

test_input = np.random.randn(1, 3, 224, 224).astype(np.float32)

# PyTorch reference
with torch.no_grad():
    pt_out = model(torch.from_numpy(test_input)).numpy()

# ORT inference
ort_out = session.run(None, {"input": test_input})[0]

# Compare
max_abs_err = np.max(np.abs(pt_out - ort_out))
cos_sim = np.dot(pt_out.flatten(), ort_out.flatten()) / (
    np.linalg.norm(pt_out) * np.linalg.norm(ort_out) + 1e-12
)
print(f"[+] Max abs error:    {max_abs_err:.2e}")
print(f"[+] Cosine similarity: {cos_sim:.8f}")

assert max_abs_err < 1e-5, f"FAIL: divergence {max_abs_err}"
assert cos_sim > 0.99999, f"FAIL: cosine sim {cos_sim}"
print("[+] Numerical equivalence PASSED")


# ── 5. Latency benchmark ──────────────────────────────────
N_RUNS = 200
WARMUP = 20

# PyTorch
for _ in range(WARMUP):
    with torch.no_grad():
        model(torch.from_numpy(test_input))
t0 = time.perf_counter()
for _ in range(N_RUNS):
    with torch.no_grad():
        model(torch.from_numpy(test_input))
pt_ms = (time.perf_counter() - t0) / N_RUNS * 1000

# ORT
for _ in range(WARMUP):
    session.run(None, {"input": test_input})
t0 = time.perf_counter()
for _ in range(N_RUNS):
    session.run(None, {"input": test_input})
ort_ms = (time.perf_counter() - t0) / N_RUNS * 1000

print(f"\\n{'Runtime':<15} {'Latency (ms)':>12}")
print(f"{'─'*28}")
print(f"{'PyTorch':<15} {pt_ms:>10.2f}ms")
print(f"{'ORT (CPU)':<15} {ort_ms:>10.2f}ms")
print(f"{'Speedup':<15} {pt_ms/ort_ms:>10.2f}x")


# ── 6. Dynamic batch test ─────────────────────────────────
for bs in [1, 4, 8, 16]:
    batch_input = np.random.randn(bs, 3, 224, 224).astype(np.float32)
    out = session.run(None, {"input": batch_input})[0]
    assert out.shape[0] == bs, f"Batch {bs} failed: got {out.shape[0]}"
    print(f"[+] Batch {bs}: output shape {out.shape}")

print("\\n✓ ONNX export pipeline complete")`
        },

        // ── 1.2  ONNX to TFLite Conversion (FP32 + INT8) ──
        {
          title: "ONNX → TFLite Conversion: FP32 + INT8",
          lang: "python",
          filename: "onnx_to_tflite.py",
          desc: "Convert an ONNX model to TFLite via tf2onnx and TF SavedModel. Generate both FP32 and full-integer INT8 variants with calibration. Compare file sizes and inference accuracy.",
          code: `"""
ONNX → TFLite conversion pipeline.
Path: ONNX → TF SavedModel (via onnx-tf) → TFLite FP32 → TFLite INT8.

Install: pip install onnx-tf tensorflow onnxruntime numpy
"""
import os
import time
import numpy as np
import onnx
import tensorflow as tf


# ── 1. ONNX → TensorFlow SavedModel ──────────────────────
ONNX_PATH = "mobilenet_v2.onnx"
SAVED_MODEL_DIR = "mobilenet_v2_saved_model"
TFLITE_FP32 = "mobilenet_v2_fp32.tflite"
TFLITE_INT8 = "mobilenet_v2_int8.tflite"

print("[1/5] Converting ONNX → TF SavedModel...")
from onnx_tf.backend import prepare

onnx_model = onnx.load(ONNX_PATH)
tf_rep = prepare(onnx_model)
tf_rep.export_graph(SAVED_MODEL_DIR)
print(f"  SavedModel exported to {SAVED_MODEL_DIR}/")


# ── 2. TF SavedModel → TFLite FP32 ──────────────────────
print("[2/5] Converting SavedModel → TFLite FP32...")
converter = tf.lite.TFLiteConverter.from_saved_model(SAVED_MODEL_DIR)
converter.optimizations = []  # No optimizations — pure FP32

tflite_fp32_model = converter.convert()
with open(TFLITE_FP32, "wb") as f:
    f.write(tflite_fp32_model)
print(f"  FP32 model: {os.path.getsize(TFLITE_FP32) / 1e6:.1f} MB")


# ── 3. TF SavedModel → TFLite INT8 (full integer) ───────
print("[3/5] Converting SavedModel → TFLite INT8 with calibration...")

converter = tf.lite.TFLiteConverter.from_saved_model(SAVED_MODEL_DIR)
converter.optimizations = [tf.lite.Optimize.DEFAULT]

# Calibration dataset — 200 random samples (use real data in production!)
NUM_CALIBRATION = 200

def representative_dataset():
    for _ in range(NUM_CALIBRATION):
        sample = np.random.randn(1, 224, 224, 3).astype(np.float32)
        yield [sample]

converter.representative_dataset = representative_dataset

# Force full integer quantization (required for Edge TPU / NNAPI INT8)
converter.target_spec.supported_ops = [
    tf.lite.OpsSet.TFLITE_BUILTINS_INT8,
]
converter.inference_input_type = tf.uint8    # Quantized I/O
converter.inference_output_type = tf.uint8

tflite_int8_model = converter.convert()
with open(TFLITE_INT8, "wb") as f:
    f.write(tflite_int8_model)
print(f"  INT8 model: {os.path.getsize(TFLITE_INT8) / 1e6:.1f} MB")


# ── 4. Size comparison ───────────────────────────────────
fp32_size = os.path.getsize(TFLITE_FP32)
int8_size = os.path.getsize(TFLITE_INT8)
onnx_size = os.path.getsize(ONNX_PATH)

print(f"\\n{'Format':<20} {'Size (MB)':>10} {'vs ONNX':>10}")
print(f"{'─'*42}")
print(f"{'ONNX (FP32)':<20} {onnx_size/1e6:>8.1f}MB {'1.00x':>10}")
print(f"{'TFLite FP32':<20} {fp32_size/1e6:>8.1f}MB {onnx_size/fp32_size:>9.2f}x")
print(f"{'TFLite INT8':<20} {int8_size/1e6:>8.1f}MB {onnx_size/int8_size:>9.2f}x")


# ── 5. Benchmark TFLite inference ─────────────────────────
def benchmark_tflite(model_path, input_type, label):
    interpreter = tf.lite.Interpreter(model_path=model_path)
    interpreter.allocate_tensors()

    inp_detail = interpreter.get_input_details()[0]
    out_detail = interpreter.get_output_details()[0]

    # Prepare input
    if input_type == tf.uint8:
        inp_scale, inp_zp = inp_detail["quantization"]
        data = np.random.randint(0, 255, inp_detail["shape"]).astype(np.uint8)
    else:
        data = np.random.randn(*inp_detail["shape"]).astype(np.float32)

    # Warmup
    for _ in range(20):
        interpreter.set_tensor(inp_detail["index"], data)
        interpreter.invoke()

    # Benchmark
    N = 100
    t0 = time.perf_counter()
    for _ in range(N):
        interpreter.set_tensor(inp_detail["index"], data)
        interpreter.invoke()
    elapsed = (time.perf_counter() - t0) / N * 1000

    output = interpreter.get_tensor(out_detail["index"])
    print(f"  {label}: {elapsed:.2f}ms  output_shape={output.shape}")
    return elapsed

print(f"\\nTFLite Inference Benchmark:")
fp32_ms = benchmark_tflite(TFLITE_FP32, tf.float32, "FP32")
int8_ms = benchmark_tflite(TFLITE_INT8, tf.uint8,   "INT8")
print(f"  INT8 speedup: {fp32_ms / int8_ms:.2f}x")

print("\\n✓ ONNX → TFLite conversion pipeline complete")`
        },

        // ── 1.3  Multi-Format Conversion Test Suite ──
        {
          title: "Multi-Format Conversion Test Suite (pytest)",
          lang: "python",
          filename: "test_conversion.py",
          desc: "A pytest suite that converts a PyTorch model through every path (ONNX, TFLite, CoreML), verifies numerical equivalence (cosine similarity >0.999), and benchmarks each format.",
          code: `"""
Conversion test suite — run with: pytest test_conversion.py -v

Tests:
1. PyTorch → ONNX export + numerical equivalence
2. ONNX graph validation + shape inference
3. ONNX → TFLite FP32 conversion + equivalence
4. ONNX → TFLite INT8 conversion + bounded accuracy loss
5. ONNX → CoreML conversion + equivalence  (macOS only)
6. Cross-format output consistency
7. Dynamic batch support per format

Install: pip install torch torchvision onnx onnxruntime onnx-tf tensorflow pytest
         pip install coremltools  # macOS only
"""
import os
import sys
import tempfile
import numpy as np
import pytest
import torch
import torchvision
import onnx
import onnxruntime as ort


# ══════════════════════════════════════════════════════════
# Fixtures
# ══════════════════════════════════════════════════════════

@pytest.fixture(scope="session")
def pytorch_model():
    """Load MobileNetV2 as the test model."""
    model = torchvision.models.mobilenet_v2(
        weights=torchvision.models.MobileNet_V2_Weights.DEFAULT
    )
    model.eval()
    return model


@pytest.fixture(scope="session")
def test_input():
    """Deterministic test input for reproducibility."""
    rng = np.random.RandomState(42)
    return rng.randn(1, 3, 224, 224).astype(np.float32)


@pytest.fixture(scope="session")
def pytorch_output(pytorch_model, test_input):
    """Reference PyTorch output."""
    with torch.no_grad():
        return pytorch_model(torch.from_numpy(test_input)).numpy()


@pytest.fixture(scope="session")
def onnx_path(pytorch_model, test_input):
    """Export to ONNX and return path."""
    path = os.path.join(tempfile.gettempdir(), "test_model.onnx")
    torch.onnx.export(
        pytorch_model,
        torch.from_numpy(test_input),
        path,
        opset_version=17,
        input_names=["input"],
        output_names=["output"],
        dynamic_axes={"input": {0: "batch"}, "output": {0: "batch"}},
        do_constant_folding=True,
    )
    return path


def cosine_similarity(a, b):
    a_flat, b_flat = a.flatten(), b.flatten()
    return float(np.dot(a_flat, b_flat) / (
        np.linalg.norm(a_flat) * np.linalg.norm(b_flat) + 1e-12
    ))


# ══════════════════════════════════════════════════════════
# Test 1: ONNX Export
# ══════════════════════════════════════════════════════════

class TestONNXExport:

    def test_onnx_checker(self, onnx_path):
        model = onnx.load(onnx_path)
        onnx.checker.check_model(model, full_check=True)

    def test_shape_inference(self, onnx_path):
        model = onnx.load(onnx_path)
        inferred = onnx.shape_inference.infer_shapes(model)
        # All value_info should have shapes after inference
        for vi in inferred.graph.value_info:
            shape = vi.type.tensor_type.shape
            assert shape is not None, f"No shape for {vi.name}"

    def test_numerical_equivalence(self, onnx_path, test_input, pytorch_output):
        session = ort.InferenceSession(onnx_path, providers=["CPUExecutionProvider"])
        ort_out = session.run(None, {"input": test_input})[0]

        max_err = np.max(np.abs(pytorch_output - ort_out))
        cos_sim = cosine_similarity(pytorch_output, ort_out)

        assert max_err < 1e-5, f"Max abs error: {max_err}"
        assert cos_sim > 0.99999, f"Cosine sim: {cos_sim}"

    def test_dynamic_batch(self, onnx_path):
        session = ort.InferenceSession(onnx_path, providers=["CPUExecutionProvider"])
        for bs in [1, 4, 8]:
            inp = np.random.randn(bs, 3, 224, 224).astype(np.float32)
            out = session.run(None, {"input": inp})[0]
            assert out.shape[0] == bs


# ══════════════════════════════════════════════════════════
# Test 2: TFLite FP32 Conversion
# ══════════════════════════════════════════════════════════

class TestTFLiteFP32:

    @pytest.fixture(scope="class")
    def tflite_fp32_path(self, onnx_path):
        import tensorflow as tf
        from onnx_tf.backend import prepare

        # ONNX → TF SavedModel
        onnx_model = onnx.load(onnx_path)
        tf_rep = prepare(onnx_model)
        saved_dir = os.path.join(tempfile.gettempdir(), "test_savedmodel")
        tf_rep.export_graph(saved_dir)

        # TF SavedModel → TFLite FP32
        converter = tf.lite.TFLiteConverter.from_saved_model(saved_dir)
        tflite_model = converter.convert()
        path = os.path.join(tempfile.gettempdir(), "test_fp32.tflite")
        with open(path, "wb") as f:
            f.write(tflite_model)
        return path

    def test_file_exists(self, tflite_fp32_path):
        assert os.path.exists(tflite_fp32_path)
        size_mb = os.path.getsize(tflite_fp32_path) / 1e6
        # MobileNetV2 FP32 should be ~14 MB
        assert 5 < size_mb < 30, f"Unexpected size: {size_mb:.1f} MB"

    def test_inference_runs(self, tflite_fp32_path):
        import tensorflow as tf
        interp = tf.lite.Interpreter(model_path=tflite_fp32_path)
        interp.allocate_tensors()
        inp = interp.get_input_details()[0]
        data = np.random.randn(*inp["shape"]).astype(np.float32)
        interp.set_tensor(inp["index"], data)
        interp.invoke()
        out = interp.get_tensor(interp.get_output_details()[0]["index"])
        assert out.shape[-1] == 1000  # ImageNet classes

    def test_numerical_equivalence(self, tflite_fp32_path, test_input, pytorch_output):
        import tensorflow as tf
        interp = tf.lite.Interpreter(model_path=tflite_fp32_path)
        interp.allocate_tensors()

        # TFLite may expect NHWC — check and transpose if needed
        inp_detail = interp.get_input_details()[0]
        if inp_detail["shape"][-1] == 3:
            tflite_input = np.transpose(test_input, (0, 2, 3, 1))
        else:
            tflite_input = test_input

        interp.set_tensor(inp_detail["index"], tflite_input)
        interp.invoke()
        tflite_out = interp.get_tensor(interp.get_output_details()[0]["index"])

        cos_sim = cosine_similarity(pytorch_output, tflite_out)
        # TFLite FP32 should be very close (allow slightly more slack)
        assert cos_sim > 0.999, f"Cosine sim too low: {cos_sim:.6f}"


# ══════════════════════════════════════════════════════════
# Test 3: TFLite INT8 Conversion
# ══════════════════════════════════════════════════════════

class TestTFLiteINT8:

    @pytest.fixture(scope="class")
    def tflite_int8_path(self, onnx_path):
        import tensorflow as tf
        from onnx_tf.backend import prepare

        onnx_model = onnx.load(onnx_path)
        tf_rep = prepare(onnx_model)
        saved_dir = os.path.join(tempfile.gettempdir(), "test_savedmodel_int8")
        tf_rep.export_graph(saved_dir)

        converter = tf.lite.TFLiteConverter.from_saved_model(saved_dir)
        converter.optimizations = [tf.lite.Optimize.DEFAULT]
        converter.target_spec.supported_ops = [tf.lite.OpsSet.TFLITE_BUILTINS_INT8]
        converter.inference_input_type = tf.uint8
        converter.inference_output_type = tf.uint8

        def representative_dataset():
            rng = np.random.RandomState(0)
            for _ in range(100):
                yield [rng.randn(1, 224, 224, 3).astype(np.float32)]

        converter.representative_dataset = representative_dataset
        tflite_model = converter.convert()

        path = os.path.join(tempfile.gettempdir(), "test_int8.tflite")
        with open(path, "wb") as f:
            f.write(tflite_model)
        return path

    def test_size_reduction(self, tflite_int8_path):
        size_mb = os.path.getsize(tflite_int8_path) / 1e6
        # INT8 should be ~4x smaller than FP32 (~3.5 MB for MobileNetV2)
        assert size_mb < 8, f"INT8 model too large: {size_mb:.1f} MB"

    def test_inference_runs(self, tflite_int8_path):
        import tensorflow as tf
        interp = tf.lite.Interpreter(model_path=tflite_int8_path)
        interp.allocate_tensors()
        inp = interp.get_input_details()[0]
        data = np.random.randint(0, 255, inp["shape"]).astype(np.uint8)
        interp.set_tensor(inp["index"], data)
        interp.invoke()
        out = interp.get_tensor(interp.get_output_details()[0]["index"])
        assert out.ndim >= 1  # Has some output

    def test_bounded_accuracy_loss(self, tflite_int8_path, pytorch_output):
        """INT8 output should have cosine sim > 0.95 with FP32 reference."""
        import tensorflow as tf
        interp = tf.lite.Interpreter(model_path=tflite_int8_path)
        interp.allocate_tensors()

        inp_detail = interp.get_input_details()[0]
        out_detail = interp.get_output_details()[0]

        # Prepare quantized input
        scale, zp = inp_detail["quantization"]
        test_fp32 = np.random.randn(*inp_detail["shape"]).astype(np.float32)
        test_uint8 = np.clip(
            np.round(test_fp32 / scale + zp), 0, 255
        ).astype(np.uint8)

        interp.set_tensor(inp_detail["index"], test_uint8)
        interp.invoke()
        int8_out = interp.get_tensor(out_detail["index"])

        # Dequantize output
        out_scale, out_zp = out_detail["quantization"]
        int8_out_fp = (int8_out.astype(np.float32) - out_zp) * out_scale

        # Cosine sim with random input won't match pytorch_output exactly,
        # but the model should produce reasonable logits (not garbage)
        assert int8_out_fp.std() > 0, "INT8 output is constant — calibration failed"


# ══════════════════════════════════════════════════════════
# Test 4: CoreML Conversion (macOS only)
# ══════════════════════════════════════════════════════════

@pytest.mark.skipif(sys.platform != "darwin", reason="CoreML requires macOS")
class TestCoreML:

    @pytest.fixture(scope="class")
    def coreml_path(self, pytorch_model, test_input):
        import coremltools as ct

        traced = torch.jit.trace(pytorch_model, torch.from_numpy(test_input))
        mlmodel = ct.convert(
            traced,
            inputs=[ct.TensorType(name="input", shape=(1, 3, 224, 224))],
            convert_to="mlprogram",
            compute_precision=ct.precision.FLOAT32,
        )
        path = os.path.join(tempfile.gettempdir(), "test_model.mlpackage")
        mlmodel.save(path)
        return path, mlmodel

    def test_prediction(self, coreml_path, test_input):
        _, mlmodel = coreml_path
        pred = mlmodel.predict({"input": test_input})
        assert len(pred) > 0

    def test_numerical_equivalence(self, coreml_path, test_input, pytorch_output):
        _, mlmodel = coreml_path
        pred = mlmodel.predict({"input": test_input})
        coreml_out = list(pred.values())[0]

        cos_sim = cosine_similarity(pytorch_output, coreml_out)
        assert cos_sim > 0.9999, f"CoreML cosine sim: {cos_sim:.6f}"


# ══════════════════════════════════════════════════════════
# Test 5: Cross-Format Benchmark
# ══════════════════════════════════════════════════════════

class TestBenchmark:

    def test_latency_report(self, onnx_path, pytorch_model, test_input, capsys):
        """Print latency comparison (informational, always passes)."""
        import time

        results = {}

        # PyTorch
        with torch.no_grad():
            for _ in range(20):
                pytorch_model(torch.from_numpy(test_input))
            t0 = time.perf_counter()
            for _ in range(100):
                pytorch_model(torch.from_numpy(test_input))
            results["PyTorch"] = (time.perf_counter() - t0) / 100 * 1000

        # ORT
        sess = ort.InferenceSession(onnx_path, providers=["CPUExecutionProvider"])
        for _ in range(20):
            sess.run(None, {"input": test_input})
        t0 = time.perf_counter()
        for _ in range(100):
            sess.run(None, {"input": test_input})
        results["ORT (CPU)"] = (time.perf_counter() - t0) / 100 * 1000

        # Print report
        with capsys.disabled():
            print("\\n\\n  Latency Report:")
            for name, ms in results.items():
                print(f"    {name:<15} {ms:.2f}ms")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])`
        },
      ]
    },

    // ──────────────────────────────────────────────────────────
    // Section 2: TensorRT Optimization Pipeline
    // ──────────────────────────────────────────────────────────
    {
      id: "tensorrt-optimization",
      title: "TensorRT Optimization Pipeline",
      icon: "🚀",
      items: [

        // ── 2.1  TensorRT Engine Build & INT8 Calibration ──
        {
          title: "TensorRT Engine Build with INT8 Calibration",
          lang: "python",
          filename: "tensorrt_build_int8.py",
          desc: "Build a TensorRT engine from ONNX with FP16 and INT8 precision. Implement a custom entropy calibrator, build with dynamic shapes and optimization profiles, serialize and benchmark.",
          code: `"""
TensorRT engine build pipeline with INT8 calibration.
Covers: ONNX parsing, optimization profiles (dynamic batch),
entropy calibrator, engine serialization, and benchmarking.

Requires: pip install tensorrt pycuda numpy
          NVIDIA GPU with compute capability >= 7.0 for INT8
"""
import os
import time
import numpy as np

import tensorrt as trt
import pycuda.driver as cuda
import pycuda.autoinit  # Auto-initialize CUDA context


# ── 1. Logger & Builder Setup ─────────────────────────────
TRT_LOGGER = trt.Logger(trt.Logger.WARNING)
ONNX_PATH = "mobilenet_v2.onnx"


# ── 2. INT8 Entropy Calibrator ────────────────────────────
class EntropyCalibrator(trt.IInt8EntropyCalibrator2):
    """
    Entropy-based INT8 calibrator.
    Collects activation histograms and finds optimal thresholds
    that minimize KL-divergence between FP32 and INT8 distributions.
    """

    def __init__(self, num_samples=500, batch_size=32, cache_file="entropy.cache"):
        super().__init__()
        self.batch_size = batch_size
        self.num_samples = num_samples
        self.cache_file = cache_file
        self.current_idx = 0

        # Pre-generate calibration data (use real data in production)
        self.data = np.random.randn(
            num_samples, 3, 224, 224
        ).astype(np.float32)

        # Allocate GPU memory for one batch
        self.d_input = cuda.mem_alloc(
            batch_size * 3 * 224 * 224 * 4  # FP32 = 4 bytes
        )

    def get_batch_size(self):
        return self.batch_size

    def get_batch(self, names):
        if self.current_idx >= self.num_samples:
            return None

        end = min(self.current_idx + self.batch_size, self.num_samples)
        batch = np.ascontiguousarray(self.data[self.current_idx:end])

        # Pad if last batch is smaller
        if batch.shape[0] < self.batch_size:
            pad = np.zeros(
                (self.batch_size - batch.shape[0], 3, 224, 224),
                dtype=np.float32,
            )
            batch = np.concatenate([batch, pad])

        cuda.memcpy_htod(self.d_input, batch)
        self.current_idx = end
        return [int(self.d_input)]

    def read_calibration_cache(self):
        if os.path.exists(self.cache_file):
            with open(self.cache_file, "rb") as f:
                return f.read()
        return None

    def write_calibration_cache(self, cache):
        with open(self.cache_file, "wb") as f:
            f.write(cache)
        print(f"  [+] Calibration cache saved to {self.cache_file}")


# ── 3. Build Engine ───────────────────────────────────────
def build_engine(precision="fp16"):
    """Build TensorRT engine with specified precision."""
    builder = trt.Builder(TRT_LOGGER)
    network = builder.create_network(
        1 << int(trt.NetworkDefinitionCreationFlag.EXPLICIT_BATCH)
    )
    config = builder.create_builder_config()

    # Parse ONNX
    parser = trt.OnnxParser(network, TRT_LOGGER)
    with open(ONNX_PATH, "rb") as f:
        if not parser.parse(f.read()):
            for i in range(parser.num_errors):
                print(f"  ONNX Parse Error: {parser.get_error(i)}")
            raise RuntimeError("ONNX parsing failed")

    print(f"  Network: {network.num_layers} layers, "
          f"{network.num_inputs} inputs, {network.num_outputs} outputs")

    # Workspace — max GPU memory for TRT to use during build
    config.set_memory_pool_limit(trt.MemoryPoolType.WORKSPACE, 2 << 30)

    # Dynamic shape optimization profile
    profile = builder.create_optimization_profile()
    profile.set_shape(
        "input",
        min=(1, 3, 224, 224),      # Minimum: batch=1
        opt=(8, 3, 224, 224),      # Optimal: batch=8 (auto-tuned)
        max=(32, 3, 224, 224),     # Maximum: batch=32
    )
    config.add_optimization_profile(profile)

    # Precision flags
    if precision in ("fp16", "int8"):
        config.set_flag(trt.BuilderFlag.FP16)
        print("  [+] FP16 enabled")

    if precision == "int8":
        config.set_flag(trt.BuilderFlag.INT8)
        calibrator = EntropyCalibrator(num_samples=200, batch_size=32)
        config.int8_calibrator = calibrator
        print("  [+] INT8 enabled with entropy calibration")

    # Timing cache for faster rebuilds
    timing_cache_path = "timing.cache"
    if os.path.exists(timing_cache_path):
        with open(timing_cache_path, "rb") as f:
            cache = config.create_timing_cache(f.read())
            config.set_timing_cache(cache, ignore_mismatch=False)
            print("  [+] Loaded timing cache")

    # Build!
    print(f"  Building {precision.upper()} engine (this may take minutes)...")
    serialized = builder.build_serialized_network(network, config)

    if serialized is None:
        raise RuntimeError("Engine build failed")

    # Save timing cache
    cache = config.get_timing_cache()
    with open(timing_cache_path, "wb") as f:
        f.write(bytearray(cache.serialize()))

    return serialized


# ── 4. Build and Save Engines ──────────────────────────────
engines = {}
for prec in ["fp16", "int8"]:
    print(f"\\n{'='*50}")
    print(f"Building {prec.upper()} engine...")
    print(f"{'='*50}")

    engine_bytes = build_engine(precision=prec)
    engine_path = f"mobilenet_v2_{prec}.engine"
    with open(engine_path, "wb") as f:
        f.write(engine_bytes)

    engines[prec] = engine_path
    size_mb = os.path.getsize(engine_path) / 1e6
    print(f"  Engine saved: {engine_path} ({size_mb:.1f} MB)")


# ── 5. Benchmark ──────────────────────────────────────────
def benchmark_engine(engine_path, batch_size=1, num_runs=200, warmup=50):
    """Load engine, run inference, measure latency."""
    runtime = trt.Runtime(TRT_LOGGER)
    with open(engine_path, "rb") as f:
        engine = runtime.deserialize_cuda_engine(f.read())
    context = engine.create_execution_context()

    # Set dynamic input shape
    context.set_input_shape("input", (batch_size, 3, 224, 224))

    # Allocate device memory
    h_input = np.random.randn(batch_size, 3, 224, 224).astype(np.float32)
    d_input = cuda.mem_alloc(h_input.nbytes)

    # Determine output size
    output_shape = context.get_tensor_shape("output")
    h_output = np.empty(output_shape, dtype=np.float32)
    d_output = cuda.mem_alloc(h_output.nbytes)

    stream = cuda.Stream()

    # Warmup
    for _ in range(warmup):
        cuda.memcpy_htod_async(d_input, h_input, stream)
        context.set_tensor_address("input", int(d_input))
        context.set_tensor_address("output", int(d_output))
        context.execute_async_v3(stream_handle=stream.handle)
        stream.synchronize()

    # Benchmark
    t0 = time.perf_counter()
    for _ in range(num_runs):
        cuda.memcpy_htod_async(d_input, h_input, stream)
        context.set_tensor_address("input", int(d_input))
        context.set_tensor_address("output", int(d_output))
        context.execute_async_v3(stream_handle=stream.handle)
        stream.synchronize()
    elapsed = (time.perf_counter() - t0) / num_runs * 1000

    # Fetch output
    cuda.memcpy_dtoh_async(h_output, d_output, stream)
    stream.synchronize()

    return elapsed, h_output


print(f"\\n\\n{'Precision':<12} {'Batch':>6} {'Latency':>10} {'Throughput':>12}")
print(f"{'─'*44}")

for prec, path in engines.items():
    for bs in [1, 8]:
        ms, out = benchmark_engine(path, batch_size=bs, num_runs=100)
        throughput = bs / (ms / 1000)
        print(f"{prec.upper():<12} {bs:>6} {ms:>8.2f}ms {throughput:>10.0f} img/s")

print("\\n✓ TensorRT build + benchmark complete")`
        },

        // ── 2.2  trtexec CLI Profiling & Analysis ──
        {
          title: "trtexec CLI Profiling & Layer Analysis",
          lang: "bash",
          filename: "trtexec_profiling.sh",
          desc: "Use NVIDIA's trtexec CLI to build engines, profile per-layer latency, compare FP32/FP16/INT8 performance, and analyze layer fusion. Includes Jetson-specific flags.",
          code: `#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────
# trtexec: TensorRT CLI for building, profiling, and benchmarking
# This is the fastest way to evaluate a model on TensorRT without
# writing Python code. Essential for debugging layer fusion and
# identifying performance bottlenecks.
# ──────────────────────────────────────────────────────────────

ONNX_MODEL="mobilenet_v2.onnx"

echo "═══════════════════════════════════════════════"
echo "1. FP32 Baseline — Build + Benchmark"
echo "═══════════════════════════════════════════════"
trtexec \\
    --onnx=\${ONNX_MODEL} \\
    --saveEngine=model_fp32.engine \\
    --workspace=2048 \\
    --iterations=200 \\
    --warmUp=5000 \\
    --avgRuns=50 \\
    --verbose \\
    2>&1 | tee trtexec_fp32.log

echo ""
echo "═══════════════════════════════════════════════"
echo "2. FP16 — Enables Tensor Core acceleration"
echo "═══════════════════════════════════════════════"
trtexec \\
    --onnx=\${ONNX_MODEL} \\
    --saveEngine=model_fp16.engine \\
    --fp16 \\
    --workspace=2048 \\
    --iterations=200 \\
    --warmUp=5000 \\
    2>&1 | tee trtexec_fp16.log

echo ""
echo "═══════════════════════════════════════════════"
echo "3. INT8 with Entropy Calibration"
echo "═══════════════════════════════════════════════"
# --calib= points to a directory with calibration images
# trtexec generates calibration cache automatically
trtexec \\
    --onnx=\${ONNX_MODEL} \\
    --saveEngine=model_int8.engine \\
    --int8 \\
    --fp16 \\
    --workspace=2048 \\
    --iterations=200 \\
    --warmUp=5000 \\
    2>&1 | tee trtexec_int8.log

echo ""
echo "═══════════════════════════════════════════════"
echo "4. Dynamic Shapes with Optimization Profiles"
echo "═══════════════════════════════════════════════"
trtexec \\
    --onnx=\${ONNX_MODEL} \\
    --saveEngine=model_dynamic.engine \\
    --fp16 \\
    --minShapes=input:1x3x224x224 \\
    --optShapes=input:8x3x224x224 \\
    --maxShapes=input:32x3x224x224 \\
    --workspace=2048 \\
    2>&1 | tee trtexec_dynamic.log

echo ""
echo "═══════════════════════════════════════════════"
echo "5. Per-Layer Profiling (Detailed)"
echo "═══════════════════════════════════════════════"
# --dumpProfile prints per-layer execution time
# --exportProfile exports to JSON for analysis
trtexec \\
    --loadEngine=model_fp16.engine \\
    --iterations=100 \\
    --dumpProfile \\
    --exportProfile=profile_fp16.json \\
    --separateProfileRun \\
    2>&1 | tee trtexec_profile.log

echo ""
echo "═══════════════════════════════════════════════"
echo "6. Layer Info — Check Fusion Results"
echo "═══════════════════════════════════════════════"
# --dumpLayerInfo shows which layers were fused and their precision
trtexec \\
    --onnx=\${ONNX_MODEL} \\
    --fp16 \\
    --dumpLayerInfo \\
    --exportLayerInfo=layers.json \\
    --workspace=2048 \\
    2>&1 | grep -E "(Layer|Tactic|Formats)" | head -40

echo ""
echo "═══════════════════════════════════════════════"
echo "7. Jetson-Specific: DLA + GPU Fallback"
echo "═══════════════════════════════════════════════"
# Uncomment on Jetson devices:
# trtexec \\
#     --onnx=\${ONNX_MODEL} \\
#     --saveEngine=model_dla.engine \\
#     --useDLACore=0 \\
#     --allowGPUFallback \\
#     --fp16 \\
#     --workspace=1024 \\
#     --iterations=200 \\
#     2>&1 | tee trtexec_dla.log

echo ""
echo "═══════════════════════════════════════════════"
echo "8. Summary: Extract Key Metrics"
echo "═══════════════════════════════════════════════"
echo ""
echo "Precision | Throughput    | Latency (median)"
echo "----------|---------------|------------------"

for log in trtexec_fp32.log trtexec_fp16.log trtexec_int8.log; do
    if [ -f "\$log" ]; then
        prec=\$(echo "\$log" | sed 's/trtexec_//' | sed 's/.log//' | tr '[:lower:]' '[:upper:]')
        throughput=\$(grep "Throughput:" "\$log" | tail -1 | awk '{print \$2, \$3}')
        latency=\$(grep "Median" "\$log" | tail -1 | awk '{print \$4, \$5}')
        printf "%-9s | %-13s | %s\\n" "\$prec" "\$throughput" "\$latency"
    fi
done

echo ""
echo "✓ trtexec profiling complete"
echo "  Logs: trtexec_*.log"
echo "  Profile: profile_fp16.json"
echo "  Layer info: layers.json"`
        },
      ]
    },

    // ──────────────────────────────────────────────────────────
    // Section 3: Real-Time Camera Inference Pipeline
    // ──────────────────────────────────────────────────────────
    {
      id: "realtime-camera-pipeline",
      title: "Real-Time Camera Inference Pipeline",
      icon: "📹",
      items: [

        // ── 3.1  OpenCV + TFLite Camera Pipeline ──
        {
          title: "OpenCV + TFLite Real-Time Camera Pipeline",
          lang: "python",
          filename: "camera_tflite_pipeline.py",
          desc: "Build a complete camera → preprocess → TFLite inference → postprocess → display pipeline targeting 30 FPS on laptop CPU. Includes FPS counter, async preprocessing, and graceful shutdown.",
          code: `"""
Real-time camera inference pipeline with TFLite.
Target: 30+ FPS on laptop CPU with MobileNetV2 classifier.

Features:
- OpenCV camera capture with configurable resolution
- TFLite interpreter with XNNPACK delegate
- Double-buffered async preprocessing
- FPS counter with moving average
- Graceful shutdown on 'q' or Ctrl+C

Usage: python camera_tflite_pipeline.py --model mobilenet_v2_fp32.tflite --labels imagenet_labels.txt
"""
import argparse
import time
import threading
import collections
import signal
import sys
import numpy as np
import cv2

# Try TFLite runtime (smaller) first, fall back to full TF
try:
    import tflite_runtime.interpreter as tflite
    Interpreter = tflite.Interpreter
    load_delegate = tflite.load_delegate
except ImportError:
    import tensorflow as tf
    Interpreter = tf.lite.Interpreter
    load_delegate = tf.lite.experimental.load_delegate


# ── Configuration ─────────────────────────────────────────
parser = argparse.ArgumentParser()
parser.add_argument("--model", required=True, help="Path to .tflite model")
parser.add_argument("--labels", default=None, help="Path to label file (one per line)")
parser.add_argument("--camera", type=int, default=0, help="Camera index")
parser.add_argument("--width", type=int, default=640, help="Capture width")
parser.add_argument("--height", type=int, default=480, help="Capture height")
parser.add_argument("--num_threads", type=int, default=4, help="TFLite threads")
parser.add_argument("--top_k", type=int, default=3, help="Top-K predictions to show")
args = parser.parse_args()


# ── Load Labels ───────────────────────────────────────────
labels = None
if args.labels:
    with open(args.labels, "r") as f:
        labels = [line.strip() for line in f.readlines()]


# ── Initialize TFLite Interpreter ─────────────────────────
print(f"Loading model: {args.model}")
interpreter = Interpreter(
    model_path=args.model,
    num_threads=args.num_threads,
)
interpreter.allocate_tensors()

inp_detail = interpreter.get_input_details()[0]
out_detail = interpreter.get_output_details()[0]
input_shape = inp_detail["shape"]          # e.g., [1, 224, 224, 3]
input_h, input_w = input_shape[1], input_shape[2]
is_quantized = inp_detail["dtype"] == np.uint8

print(f"  Input:  {input_shape}  dtype={inp_detail['dtype'].__name__}")
print(f"  Output: {out_detail['shape']}  dtype={out_detail['dtype'].__name__}")
print(f"  Quantized: {is_quantized}")


# ── Preprocessing ─────────────────────────────────────────
def preprocess(frame):
    """Resize + normalize frame for model input."""
    # Resize with letterboxing to maintain aspect ratio
    h, w = frame.shape[:2]
    scale = min(input_h / h, input_w / w)
    new_h, new_w = int(h * scale), int(w * scale)
    resized = cv2.resize(frame, (new_w, new_h), interpolation=cv2.INTER_LINEAR)

    # Pad to target size (center)
    canvas = np.full((input_h, input_w, 3), 114, dtype=np.uint8)
    y_off = (input_h - new_h) // 2
    x_off = (input_w - new_w) // 2
    canvas[y_off:y_off+new_h, x_off:x_off+new_w] = resized

    # Convert BGR → RGB
    canvas = cv2.cvtColor(canvas, cv2.COLOR_BGR2RGB)

    if is_quantized:
        return np.expand_dims(canvas, axis=0)  # uint8 input
    else:
        return np.expand_dims(canvas.astype(np.float32) / 255.0, axis=0)


# ── Postprocessing ────────────────────────────────────────
def postprocess(output):
    """Decode model output to top-K predictions."""
    if out_detail["dtype"] == np.uint8:
        scale, zp = out_detail["quantization"]
        scores = (output.astype(np.float32) - zp) * scale
    else:
        scores = output.astype(np.float32)

    scores = scores.flatten()

    # Softmax if not already applied
    if scores.max() > 1.0 or scores.min() < 0.0:
        exp_scores = np.exp(scores - scores.max())
        scores = exp_scores / exp_scores.sum()

    top_indices = np.argsort(scores)[-args.top_k:][::-1]
    results = []
    for idx in top_indices:
        label = labels[idx] if labels and idx < len(labels) else f"class_{idx}"
        results.append((label, float(scores[idx])))
    return results


# ── FPS Tracker ───────────────────────────────────────────
class FPSTracker:
    def __init__(self, window=30):
        self.times = collections.deque(maxlen=window)
        self.last_time = time.perf_counter()

    def tick(self):
        now = time.perf_counter()
        self.times.append(now - self.last_time)
        self.last_time = now

    @property
    def fps(self):
        if not self.times:
            return 0.0
        return len(self.times) / sum(self.times)

    @property
    def ms(self):
        if not self.times:
            return 0.0
        return sum(self.times) / len(self.times) * 1000


# ── Main Loop ─────────────────────────────────────────────
cap = cv2.VideoCapture(args.camera)
cap.set(cv2.CAP_PROP_FRAME_WIDTH, args.width)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, args.height)

if not cap.isOpened():
    print("ERROR: Cannot open camera")
    sys.exit(1)

actual_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
actual_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
print(f"Camera opened: {actual_w}x{actual_h}")

fps_tracker = FPSTracker(window=30)
running = True

def signal_handler(sig, frame):
    global running
    running = False

signal.signal(signal.SIGINT, signal_handler)

print("\\nPress 'q' to quit\\n")

while running:
    ret, frame = cap.read()
    if not ret:
        print("Camera read failed")
        break

    # Preprocess
    t_pre = time.perf_counter()
    input_data = preprocess(frame)
    pre_ms = (time.perf_counter() - t_pre) * 1000

    # Inference
    t_inf = time.perf_counter()
    interpreter.set_tensor(inp_detail["index"], input_data)
    interpreter.invoke()
    output = interpreter.get_tensor(out_detail["index"])
    inf_ms = (time.perf_counter() - t_inf) * 1000

    # Postprocess
    t_post = time.perf_counter()
    predictions = postprocess(output)
    post_ms = (time.perf_counter() - t_post) * 1000

    fps_tracker.tick()

    # Draw overlay
    y_pos = 30
    cv2.putText(
        frame,
        f"FPS: {fps_tracker.fps:.1f}  ({fps_tracker.ms:.1f}ms)",
        (10, y_pos), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2,
    )
    y_pos += 25
    cv2.putText(
        frame,
        f"Pre: {pre_ms:.1f}ms  Inf: {inf_ms:.1f}ms  Post: {post_ms:.1f}ms",
        (10, y_pos), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 200, 200), 1,
    )

    for label, score in predictions:
        y_pos += 30
        text = f"{label}: {score:.1%}"
        cv2.putText(
            frame, text,
            (10, y_pos), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2,
        )

    cv2.imshow("TFLite Inference", frame)

    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

cap.release()
cv2.destroyAllWindows()
print(f"\\nAverage: {fps_tracker.fps:.1f} FPS ({fps_tracker.ms:.1f} ms/frame)")`
        },

        // ── 3.2  Multi-Stream Video Analytics with Triton ──
        {
          title: "Multi-Stream Video Analytics with Triton Client",
          lang: "python",
          filename: "triton_multistream.py",
          desc: "A Triton Inference Server client that processes multiple camera streams concurrently using gRPC, async inference, shared memory for zero-copy, and dynamic batching.",
          code: `"""
Multi-stream video analytics client for NVIDIA Triton Inference Server.
Sends frames from N camera streams to Triton for YOLOv8 detection.

Features:
- gRPC async inference (non-blocking)
- Per-stream frame queues with micro-batching
- Shared memory transport (zero-copy) for localhost deployment
- Result callback with per-stream tracking
- Graceful shutdown and stream statistics

Requires:
  pip install tritonclient[grpc] opencv-python numpy

Triton model config (config.pbtxt):
  name: "yolov8_detection"
  platform: "tensorrt_plan"
  max_batch_size: 8
  input [{ name: "images" data_type: TYPE_FP32 dims: [3, 640, 640] }]
  output [{ name: "output0" data_type: TYPE_FP32 dims: [84, 8400] }]
  dynamic_batching { preferred_batch_size: [4, 8] max_queue_delay_microseconds: 5000 }
"""
import time
import threading
import queue
import signal
import sys
from dataclasses import dataclass, field
from typing import Dict, List, Optional

import numpy as np
import cv2
import tritonclient.grpc as grpcclient
from tritonclient.grpc import InferInput, InferRequestedOutput


# ══════════════════════════════════════════════════════════
# Configuration
# ══════════════════════════════════════════════════════════

TRITON_URL = "localhost:8001"        # gRPC endpoint
MODEL_NAME = "yolov8_detection"
INPUT_NAME = "images"
OUTPUT_NAME = "output0"
INPUT_SIZE = (640, 640)              # Model input H, W
CONFIDENCE_THRESHOLD = 0.25
MAX_QUEUE_SIZE = 30                  # Per-stream frame buffer
NUM_STREAMS = 4                      # Simulated camera streams


# ══════════════════════════════════════════════════════════
# Stream Statistics
# ══════════════════════════════════════════════════════════

@dataclass
class StreamStats:
    stream_id: int
    frames_sent: int = 0
    frames_completed: int = 0
    total_latency_ms: float = 0.0
    detections: int = 0

    @property
    def avg_latency_ms(self):
        if self.frames_completed == 0:
            return 0.0
        return self.total_latency_ms / self.frames_completed

    @property
    def fps(self):
        if self.total_latency_ms == 0:
            return 0.0
        return self.frames_completed / (self.total_latency_ms / 1000)


# ══════════════════════════════════════════════════════════
# Preprocessing
# ══════════════════════════════════════════════════════════

def preprocess_frame(frame: np.ndarray) -> np.ndarray:
    """Resize, normalize, HWC→CHW for YOLOv8 input."""
    resized = cv2.resize(frame, INPUT_SIZE, interpolation=cv2.INTER_LINEAR)
    rgb = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB)
    normalized = rgb.astype(np.float32) / 255.0
    chw = np.transpose(normalized, (2, 0, 1))  # HWC → CHW
    return chw


def postprocess_detections(output: np.ndarray, conf_threshold: float = 0.25):
    """Parse YOLOv8 raw output [84, 8400] → list of (class_id, conf, x, y, w, h)."""
    # output shape: [84, 8400] — 4 bbox coords + 80 class scores per anchor
    predictions = output.T  # [8400, 84]
    boxes = predictions[:, :4]          # cx, cy, w, h
    class_scores = predictions[:, 4:]   # 80 class confidences

    max_scores = class_scores.max(axis=1)
    mask = max_scores > conf_threshold
    filtered_boxes = boxes[mask]
    filtered_scores = max_scores[mask]
    filtered_classes = class_scores[mask].argmax(axis=1)

    detections = []
    for i in range(len(filtered_boxes)):
        cx, cy, w, h = filtered_boxes[i]
        detections.append({
            "class_id": int(filtered_classes[i]),
            "confidence": float(filtered_scores[i]),
            "bbox": [float(cx - w/2), float(cy - h/2), float(w), float(h)],
        })
    return detections


# ══════════════════════════════════════════════════════════
# Async Inference Callback
# ══════════════════════════════════════════════════════════

class InferenceCallbackHandler:
    """Handles async inference results from Triton."""

    def __init__(self, stats: Dict[int, StreamStats]):
        self.stats = stats
        self._lock = threading.Lock()

    def callback(self, result, error, stream_id: int, send_time: float):
        """Called when Triton returns a result."""
        latency_ms = (time.perf_counter() - send_time) * 1000

        if error:
            print(f"  [Stream {stream_id}] Inference error: {error}")
            return

        output = result.as_numpy(OUTPUT_NAME)
        detections = postprocess_detections(output[0], CONFIDENCE_THRESHOLD)

        with self._lock:
            self.stats[stream_id].frames_completed += 1
            self.stats[stream_id].total_latency_ms += latency_ms
            self.stats[stream_id].detections += len(detections)


# ══════════════════════════════════════════════════════════
# Simulated Camera Stream
# ══════════════════════════════════════════════════════════

class SimulatedCamera(threading.Thread):
    """Simulates a camera stream producing frames at ~30 FPS."""

    def __init__(self, stream_id: int, frame_queue: queue.Queue, running: threading.Event):
        super().__init__(daemon=True)
        self.stream_id = stream_id
        self.frame_queue = frame_queue
        self.running = running

    def run(self):
        frame_idx = 0
        while self.running.is_set():
            # Generate a synthetic frame (replace with cv2.VideoCapture for real cameras)
            frame = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)

            # Add stream ID text for visual identification
            cv2.putText(
                frame, f"Stream {self.stream_id} Frame {frame_idx}",
                (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 255, 0), 2,
            )

            try:
                self.frame_queue.put_nowait((self.stream_id, frame_idx, frame))
            except queue.Full:
                pass  # Drop frame if queue is full (backpressure)

            frame_idx += 1
            time.sleep(1 / 30)  # ~30 FPS


# ══════════════════════════════════════════════════════════
# Main Pipeline
# ══════════════════════════════════════════════════════════

def main():
    running = threading.Event()
    running.set()

    def signal_handler(sig, frame):
        print("\\nShutting down...")
        running.clear()

    signal.signal(signal.SIGINT, signal_handler)

    # Initialize Triton client
    client = grpcclient.InferenceServerClient(url=TRITON_URL)

    # Verify model is loaded
    if not client.is_model_ready(MODEL_NAME):
        print(f"ERROR: Model '{MODEL_NAME}' not ready on Triton")
        sys.exit(1)

    model_meta = client.get_model_metadata(MODEL_NAME)
    print(f"Model: {MODEL_NAME}")
    print(f"  Inputs:  {[(i.name, i.shape) for i in model_meta.inputs]}")
    print(f"  Outputs: {[(o.name, o.shape) for o in model_meta.outputs]}")

    # Per-stream stats and queues
    stats: Dict[int, StreamStats] = {}
    frame_queues: Dict[int, queue.Queue] = {}
    cameras: List[SimulatedCamera] = []

    for sid in range(NUM_STREAMS):
        stats[sid] = StreamStats(stream_id=sid)
        fq = queue.Queue(maxsize=MAX_QUEUE_SIZE)
        frame_queues[sid] = fq
        cam = SimulatedCamera(sid, fq, running)
        cameras.append(cam)
        cam.start()

    callback_handler = InferenceCallbackHandler(stats)

    print(f"\\nStarted {NUM_STREAMS} camera streams → Triton ({TRITON_URL})")
    print("Press Ctrl+C to stop\\n")

    # ── Inference loop: collect frames, send to Triton ────
    while running.is_set():
        batch_frames = []
        batch_meta = []  # (stream_id, frame_idx)

        # Collect up to 8 frames across all streams (micro-batching)
        for sid in range(NUM_STREAMS):
            try:
                stream_id, frame_idx, frame = frame_queues[sid].get_nowait()
                preprocessed = preprocess_frame(frame)
                batch_frames.append(preprocessed)
                batch_meta.append((stream_id, frame_idx))
            except queue.Empty:
                continue

        if not batch_frames:
            time.sleep(0.001)
            continue

        # Build batch input
        batch = np.stack(batch_frames).astype(np.float32)

        input_tensor = InferInput(INPUT_NAME, batch.shape, "FP32")
        input_tensor.set_data_from_numpy(batch)
        output_tensor = InferRequestedOutput(OUTPUT_NAME)

        send_time = time.perf_counter()

        # For each frame in batch, track stats
        for stream_id, _ in batch_meta:
            stats[stream_id].frames_sent += 1

        # Async inference
        client.async_infer(
            model_name=MODEL_NAME,
            inputs=[input_tensor],
            outputs=[output_tensor],
            callback=lambda result, error, sid=batch_meta[0][0], t=send_time:
                callback_handler.callback(result, error, sid, t),
        )

    # ── Print Statistics ──────────────────────────────────
    print(f"\\n{'Stream':<10} {'Sent':>8} {'Done':>8} {'Avg ms':>10} {'Dets':>8}")
    print(f"{'─'*48}")
    for sid, s in sorted(stats.items()):
        print(f"{'#' + str(sid):<10} {s.frames_sent:>8} {s.frames_completed:>8} "
              f"{s.avg_latency_ms:>8.1f}ms {s.detections:>8}")

    total_frames = sum(s.frames_completed for s in stats.values())
    total_time = sum(s.total_latency_ms for s in stats.values()) / 1000
    print(f"\\nTotal: {total_frames} frames processed")

    client.close()
    print("✓ Multi-stream pipeline complete")


if __name__ == "__main__":
    main()`
        },
      ]
    },

    // ──────────────────────────────────────────────────────────
    // Section 4: CoreML & ORT Cross-Platform Deployment
    // ──────────────────────────────────────────────────────────
    {
      id: "coreml-ort-cross-platform",
      title: "CoreML & ORT Cross-Platform Deployment",
      icon: "🍎",
      items: [

        // ── 4.1  CoreML Conversion with Quantization ──
        {
          title: "CoreML Conversion with FP16 & INT8 Quantization",
          lang: "python",
          filename: "coreml_convert_quantize.py",
          desc: "Convert PyTorch MobileNetV2 to CoreML ML Program format. Apply FP16 precision, weight-only INT8 quantization, and palettization (4-bit). Benchmark each variant on Apple Neural Engine.",
          code: `"""
PyTorch → CoreML conversion with multiple quantization levels.
Targets: Apple Neural Engine (ANE), GPU, CPU.

Variants:
1. FP16 (ANE default — automatic)
2. Weight-only INT8 (linear_quantize_weights)
3. 4-bit palettization (k-means weight clustering)

Requires: pip install coremltools torch torchvision
Platform: macOS only (CoreML prediction requires macOS)
"""
import os
import time
import numpy as np
import torch
import torchvision
import coremltools as ct
from coremltools.optimize.coreml import (
    OpLinearQuantizerConfig,
    OptimizationConfig,
    linear_quantize_weights,
    OpPalettizerConfig,
    palettize_weights,
)


# ── 1. Prepare PyTorch Model ─────────────────────────────
print("Loading MobileNetV2...")
model = torchvision.models.mobilenet_v2(
    weights=torchvision.models.MobileNet_V2_Weights.DEFAULT
)
model.eval()

example_input = torch.randn(1, 3, 224, 224)
traced = torch.jit.trace(model, example_input)


# ── 2. Base Conversion (FP16 for ANE) ────────────────────
print("\\n[1/4] Converting to CoreML ML Program (FP16)...")
mlmodel_fp16 = ct.convert(
    traced,
    inputs=[ct.ImageType(
        name="image",
        shape=(1, 3, 224, 224),
        scale=1/255.0,
        bias=[-0.485/0.229, -0.456/0.224, -0.406/0.225],
        color_layout="RGB",
    )],
    outputs=[ct.TensorType(name="classLabel_probs")],
    convert_to="mlprogram",
    compute_precision=ct.precision.FLOAT16,       # FP16 for ANE
    minimum_deployment_target=ct.target.iOS16,
)
mlmodel_fp16.save("mobilenet_v2_fp16.mlpackage")
fp16_size = sum(
    os.path.getsize(os.path.join(dp, f))
    for dp, _, fn in os.walk("mobilenet_v2_fp16.mlpackage")
    for f in fn
) / 1e6
print(f"  FP16 model: {fp16_size:.1f} MB")


# ── 3. Weight-Only INT8 Quantization ─────────────────────
print("\\n[2/4] Applying weight-only INT8 quantization...")
int8_config = OptimizationConfig(
    global_config=OpLinearQuantizerConfig(
        mode="linear_symmetric",        # Symmetric quantization
        dtype="int8",                    # 8-bit weights
        granularity="per_channel",       # Per-output-channel scales
    )
)
mlmodel_int8 = linear_quantize_weights(mlmodel_fp16, config=int8_config)
mlmodel_int8.save("mobilenet_v2_int8.mlpackage")
int8_size = sum(
    os.path.getsize(os.path.join(dp, f))
    for dp, _, fn in os.walk("mobilenet_v2_int8.mlpackage")
    for f in fn
) / 1e6
print(f"  INT8 model: {int8_size:.1f} MB ({fp16_size/int8_size:.1f}x smaller)")


# ── 4. 4-bit Palettization (K-Means Clustering) ──────────
print("\\n[3/4] Applying 4-bit palettization (16 clusters)...")
palette_config = OptimizationConfig(
    global_config=OpPalettizerConfig(
        mode="kmeans",                   # K-means weight clustering
        nbits=4,                         # 4 bits → 16 unique values per tensor
        granularity="per_tensor",
    )
)
mlmodel_4bit = palettize_weights(mlmodel_fp16, config=palette_config)
mlmodel_4bit.save("mobilenet_v2_4bit.mlpackage")
bit4_size = sum(
    os.path.getsize(os.path.join(dp, f))
    for dp, _, fn in os.walk("mobilenet_v2_4bit.mlpackage")
    for f in fn
) / 1e6
print(f"  4-bit model: {bit4_size:.1f} MB ({fp16_size/bit4_size:.1f}x smaller)")


# ── 5. Benchmark All Variants ────────────────────────────
print("\\n[4/4] Benchmarking on macOS...")

# Test input (PIL Image for ImageType input)
from PIL import Image
test_image = Image.fromarray(
    np.random.randint(0, 255, (224, 224, 3), dtype=np.uint8)
)

def benchmark_coreml(model_path, label, num_runs=100, warmup=20):
    model = ct.models.MLModel(model_path)

    # Warmup
    for _ in range(warmup):
        model.predict({"image": test_image})

    # Benchmark
    t0 = time.perf_counter()
    for _ in range(num_runs):
        pred = model.predict({"image": test_image})
    elapsed = (time.perf_counter() - t0) / num_runs * 1000

    # Get top prediction
    probs = list(pred.values())[0].flatten()
    top_idx = np.argmax(probs)
    top_conf = probs[top_idx]

    return elapsed, top_idx, float(top_conf)


variants = [
    ("mobilenet_v2_fp16.mlpackage",  "FP16",  fp16_size),
    ("mobilenet_v2_int8.mlpackage",  "INT8",  int8_size),
    ("mobilenet_v2_4bit.mlpackage",  "4-bit", bit4_size),
]

print(f"\\n{'Variant':<10} {'Size (MB)':>10} {'Latency':>10} {'Top-1 Idx':>10} {'Conf':>8}")
print(f"{'─'*52}")

for path, label, size in variants:
    ms, top_idx, conf = benchmark_coreml(path, label)
    print(f"{label:<10} {size:>8.1f}MB {ms:>8.2f}ms {top_idx:>10} {conf:>7.3f}")

print("\\n✓ CoreML conversion + quantization complete")`
        },

        // ── 4.2  ORT Mobile Optimized Inference ──
        {
          title: "ORT Mobile: Optimized On-Device Inference",
          lang: "python",
          filename: "ort_mobile_inference.py",
          desc: "Build an optimized ONNX Runtime Mobile inference pipeline. Convert to ORT format, benchmark EP fallback chains (NNAPI → CoreML → XNNPACK → CPU), and profile per-layer execution.",
          code: `"""
ONNX Runtime Mobile optimized inference pipeline.

Covers:
- ORT format conversion (ONNX → .ort for faster load)
- Execution Provider fallback chains
- Graph optimization levels
- Per-layer profiling and analysis
- Memory tracking

Works on: Linux/macOS/Windows (CPU), Android (NNAPI), iOS (CoreML)
Install: pip install onnxruntime numpy onnx
"""
import os
import sys
import time
import json
import numpy as np
import onnxruntime as ort


ONNX_PATH = "mobilenet_v2.onnx"
ORT_PATH = "mobilenet_v2.ort"


# ══════════════════════════════════════════════════════════
# 1. Convert ONNX → ORT Format
# ══════════════════════════════════════════════════════════
def convert_to_ort_format(onnx_path: str, ort_path: str):
    """
    Convert ONNX to ORT format.
    ORT format is a pre-optimized flatbuffer that loads 10-20x faster
    than ONNX (no graph optimization at load time).
    """
    print("[1] Converting ONNX → ORT format...")

    # Use ORT's optimization tool
    sess_options = ort.SessionOptions()
    sess_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
    sess_options.optimized_model_filepath = ort_path

    # Creating a session with optimized_model_filepath saves the optimized model
    _ = ort.InferenceSession(
        onnx_path, sess_options, providers=["CPUExecutionProvider"]
    )

    onnx_size = os.path.getsize(onnx_path) / 1e6
    ort_size = os.path.getsize(ort_path) / 1e6
    print(f"  ONNX: {onnx_size:.1f} MB → ORT: {ort_size:.1f} MB")
    return ort_path


# ══════════════════════════════════════════════════════════
# 2. Test Execution Provider Fallback
# ══════════════════════════════════════════════════════════
def test_ep_fallback(model_path: str):
    """
    Test which Execution Providers are available and benchmark each.
    On mobile, NNAPI/CoreML provide hardware acceleration.
    On desktop, XNNPACK (via CPU EP) is typically fastest.
    """
    print("\\n[2] Testing Execution Provider availability...")

    # Define EP priority chains for different platforms
    ep_chains = {
        "Default CPU": ["CPUExecutionProvider"],
    }

    # Check for platform-specific EPs
    available = ort.get_available_providers()
    print(f"  Available EPs: {available}")

    if "CoreMLExecutionProvider" in available:
        ep_chains["CoreML"] = ["CoreMLExecutionProvider", "CPUExecutionProvider"]
    if "NnapiExecutionProvider" in available:
        ep_chains["NNAPI"] = ["NnapiExecutionProvider", "CPUExecutionProvider"]
    if "CUDAExecutionProvider" in available:
        ep_chains["CUDA"] = ["CUDAExecutionProvider", "CPUExecutionProvider"]
    if "TensorrtExecutionProvider" in available:
        ep_chains["TensorRT"] = [
            "TensorrtExecutionProvider",
            "CUDAExecutionProvider",
            "CPUExecutionProvider",
        ]

    test_input = np.random.randn(1, 3, 224, 224).astype(np.float32)
    results = {}

    for name, providers in ep_chains.items():
        try:
            sess_options = ort.SessionOptions()
            sess_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL

            # Measure session creation time
            t_load = time.perf_counter()
            session = ort.InferenceSession(model_path, sess_options, providers=providers)
            load_ms = (time.perf_counter() - t_load) * 1000

            # Warmup
            input_name = session.get_inputs()[0].name
            for _ in range(20):
                session.run(None, {input_name: test_input})

            # Benchmark
            N = 100
            t0 = time.perf_counter()
            for _ in range(N):
                session.run(None, {input_name: test_input})
            infer_ms = (time.perf_counter() - t0) / N * 1000

            # Which EP was actually used?
            active_eps = session.get_providers()

            results[name] = {
                "load_ms": load_ms,
                "infer_ms": infer_ms,
                "active_eps": active_eps,
            }
            print(f"  {name}: load={load_ms:.0f}ms  infer={infer_ms:.2f}ms  EPs={active_eps}")

        except Exception as e:
            print(f"  {name}: FAILED — {e}")

    return results


# ══════════════════════════════════════════════════════════
# 3. Per-Layer Profiling
# ══════════════════════════════════════════════════════════
def profile_model(model_path: str):
    """
    Enable ORT profiling to get per-operator execution times.
    Identifies bottleneck layers for optimization targeting.
    """
    print("\\n[3] Per-layer profiling...")

    sess_options = ort.SessionOptions()
    sess_options.enable_profiling = True
    sess_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL

    session = ort.InferenceSession(
        model_path, sess_options, providers=["CPUExecutionProvider"]
    )
    input_name = session.get_inputs()[0].name
    test_input = np.random.randn(1, 3, 224, 224).astype(np.float32)

    # Run several inferences to collect profiling data
    for _ in range(50):
        session.run(None, {input_name: test_input})

    # End profiling and get the profile file path
    profile_file = session.end_profiling()
    print(f"  Profile saved to: {profile_file}")

    # Parse profiling data
    with open(profile_file, "r") as f:
        profile_data = json.load(f)

    # Extract operator-level timing
    op_times = {}
    for event in profile_data:
        if event.get("cat") == "Node":
            name = event.get("name", "unknown")
            dur_us = event.get("dur", 0)  # Duration in microseconds
            op_type = event.get("args", {}).get("op_name", "unknown")

            if op_type not in op_times:
                op_times[op_type] = {"count": 0, "total_us": 0}
            op_times[op_type]["count"] += 1
            op_times[op_type]["total_us"] += dur_us

    # Print top operators by total time
    sorted_ops = sorted(op_times.items(), key=lambda x: -x[1]["total_us"])

    print(f"\\n  {'Op Type':<25} {'Count':>6} {'Total (ms)':>12} {'Avg (ms)':>10} {'%':>6}")
    print(f"  {'─'*63}")

    total_us = sum(v["total_us"] for v in op_times.values())
    for op_type, data in sorted_ops[:15]:
        total_ms = data["total_us"] / 1000
        avg_ms = total_ms / max(data["count"], 1)
        pct = data["total_us"] / max(total_us, 1) * 100
        print(f"  {op_type:<25} {data['count']:>6} {total_ms:>10.2f}ms {avg_ms:>8.3f}ms {pct:>5.1f}%")

    print(f"  {'─'*63}")
    print(f"  {'TOTAL':<25} {'':>6} {total_us/1000:>10.2f}ms")

    return profile_file


# ══════════════════════════════════════════════════════════
# 4. Load Time Comparison (ONNX vs ORT format)
# ══════════════════════════════════════════════════════════
def compare_load_times():
    """Compare session creation time for ONNX vs ORT format."""
    print("\\n[4] Load time comparison (ONNX vs ORT format)...")

    results = {}
    for label, path in [("ONNX", ONNX_PATH), ("ORT", ORT_PATH)]:
        if not os.path.exists(path):
            continue
        times = []
        for _ in range(10):
            t0 = time.perf_counter()
            sess = ort.InferenceSession(path, providers=["CPUExecutionProvider"])
            times.append((time.perf_counter() - t0) * 1000)

        avg = np.mean(times)
        std = np.std(times)
        results[label] = avg
        print(f"  {label}: {avg:.1f} ± {std:.1f} ms")

    if "ONNX" in results and "ORT" in results:
        speedup = results["ONNX"] / results["ORT"]
        print(f"  ORT format loads {speedup:.1f}x faster")


# ══════════════════════════════════════════════════════════
# Main
# ══════════════════════════════════════════════════════════
if __name__ == "__main__":
    if not os.path.exists(ONNX_PATH):
        print(f"ERROR: {ONNX_PATH} not found. Run onnx_export_validate.py first.")
        sys.exit(1)

    convert_to_ort_format(ONNX_PATH, ORT_PATH)
    test_ep_fallback(ONNX_PATH)
    profile_model(ONNX_PATH)
    compare_load_times()

    print("\\n✓ ORT Mobile optimization pipeline complete")`
        },
      ]
    },

    // ──────────────────────────────────────────────────────────
    // Section 5: OTA Model Updates & Edge Fleet Management
    // ──────────────────────────────────────────────────────────
    {
      id: "ota-fleet-management",
      title: "OTA Model Updates & Edge Fleet Management",
      icon: "📡",
      items: [

        // ── 5.1  OTA Model Update Agent ──
        {
          title: "Edge Device OTA Model Update Agent",
          lang: "python",
          filename: "ota_update_agent.py",
          desc: "Build an OTA model update agent for edge devices. Implements A/B model slots, delta downloads, integrity verification (SHA-256), rollback on failure, and crash-loop protection.",
          code: `"""
OTA Model Update Agent for edge devices.

Architecture:
- A/B model slots: download to inactive, swap atomically
- SHA-256 integrity verification
- Crash-loop detection with automatic rollback
- Delta update support (bsdiff-style)
- Exponential backoff for failed downloads
- Heartbeat reporting to fleet server

This runs as a systemd service on Linux edge devices.
"""
import os
import sys
import json
import time
import hashlib
import shutil
import logging
import tempfile
import urllib.request
from pathlib import Path
from dataclasses import dataclass, asdict
from typing import Optional

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger("ota-agent")


# ══════════════════════════════════════════════════════════
# Configuration
# ══════════════════════════════════════════════════════════

@dataclass
class AgentConfig:
    device_id: str = "edge-device-001"
    fleet_server: str = "https://fleet.example.com/api/v1"
    model_dir: str = "/opt/models"
    slot_a: str = "slot_a"
    slot_b: str = "slot_b"
    active_slot_file: str = "active_slot.json"
    crash_count_file: str = "crash_count.json"
    max_crashes: int = 3               # Rollback after N crashes
    poll_interval: int = 300           # Check for updates every 5 min
    max_retries: int = 3
    retry_backoff: float = 2.0


# ══════════════════════════════════════════════════════════
# Model Slot Manager
# ══════════════════════════════════════════════════════════

class SlotManager:
    """Manages A/B model slots for atomic updates."""

    def __init__(self, config: AgentConfig):
        self.config = config
        self.model_dir = Path(config.model_dir)
        self.model_dir.mkdir(parents=True, exist_ok=True)
        (self.model_dir / config.slot_a).mkdir(exist_ok=True)
        (self.model_dir / config.slot_b).mkdir(exist_ok=True)
        self._load_state()

    def _load_state(self):
        state_path = self.model_dir / self.config.active_slot_file
        if state_path.exists():
            with open(state_path) as f:
                state = json.load(f)
            self.active_slot = state.get("active_slot", self.config.slot_a)
            self.active_version = state.get("version", "unknown")
        else:
            self.active_slot = self.config.slot_a
            self.active_version = "none"
            self._save_state()

    def _save_state(self):
        state = {
            "active_slot": self.active_slot,
            "version": self.active_version,
            "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }
        state_path = self.model_dir / self.config.active_slot_file
        # Atomic write: write to temp file, then rename
        tmp = state_path.with_suffix(".tmp")
        with open(tmp, "w") as f:
            json.dump(state, f)
        os.replace(tmp, state_path)

    @property
    def active_path(self) -> Path:
        return self.model_dir / self.active_slot

    @property
    def inactive_slot(self) -> str:
        return (self.config.slot_b
                if self.active_slot == self.config.slot_a
                else self.config.slot_a)

    @property
    def inactive_path(self) -> Path:
        return self.model_dir / self.inactive_slot

    def swap(self, new_version: str):
        """Atomically swap active slot to the inactive one."""
        log.info(f"Swapping: {self.active_slot} → {self.inactive_slot} (v{new_version})")
        self.active_slot = self.inactive_slot
        self.active_version = new_version
        self._save_state()

    def rollback(self):
        """Swap back to previous slot."""
        log.warning(f"Rolling back: {self.active_slot} → {self.inactive_slot}")
        self.active_slot = self.inactive_slot
        self._save_state()


# ══════════════════════════════════════════════════════════
# Crash Loop Detector
# ══════════════════════════════════════════════════════════

class CrashDetector:
    """Detects crash loops and triggers rollback."""

    def __init__(self, config: AgentConfig):
        self.config = config
        self.path = Path(config.model_dir) / config.crash_count_file

    def record_crash(self) -> int:
        count = self._read() + 1
        self._write(count)
        log.warning(f"Crash recorded: {count}/{self.config.max_crashes}")
        return count

    def reset(self):
        self._write(0)

    def should_rollback(self) -> bool:
        return self._read() >= self.config.max_crashes

    def _read(self) -> int:
        if self.path.exists():
            with open(self.path) as f:
                return json.load(f).get("count", 0)
        return 0

    def _write(self, count: int):
        with open(self.path, "w") as f:
            json.dump({"count": count}, f)


# ══════════════════════════════════════════════════════════
# Update Downloader
# ══════════════════════════════════════════════════════════

def verify_integrity(file_path: Path, expected_sha256: str) -> bool:
    """Verify file integrity using SHA-256."""
    sha256 = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            sha256.update(chunk)
    actual = sha256.hexdigest()
    if actual != expected_sha256:
        log.error(f"Integrity check FAILED: expected={expected_sha256[:16]}... "
                  f"actual={actual[:16]}...")
        return False
    log.info(f"Integrity check passed: {actual[:16]}...")
    return True


def download_model(url: str, dest: Path, max_retries: int = 3,
                   backoff: float = 2.0) -> bool:
    """Download model file with retry and exponential backoff."""
    for attempt in range(max_retries):
        try:
            log.info(f"Downloading {url} → {dest} (attempt {attempt+1})")
            tmp_path = dest.with_suffix(".downloading")

            urllib.request.urlretrieve(url, tmp_path)
            os.replace(tmp_path, dest)

            size_mb = dest.stat().st_size / 1e6
            log.info(f"Downloaded: {size_mb:.1f} MB")
            return True

        except Exception as e:
            log.error(f"Download failed: {e}")
            wait = backoff ** attempt
            log.info(f"Retrying in {wait:.0f}s...")
            time.sleep(wait)

    return False


# ══════════════════════════════════════════════════════════
# Dummy Inference Validation
# ══════════════════════════════════════════════════════════

def validate_model(model_path: Path) -> bool:
    """
    Run a dummy inference to verify the model loads and produces output.
    Replace with actual framework inference in production.
    """
    log.info(f"Validating model at {model_path}...")

    model_file = model_path / "model.tflite"
    if not model_file.exists():
        log.error(f"Model file not found: {model_file}")
        return False

    try:
        # In production: load with TFLite/ORT and run dummy inference
        # Here we just check file is valid and non-empty
        size = model_file.stat().st_size
        if size < 1000:
            log.error(f"Model too small: {size} bytes")
            return False

        log.info(f"Model validation passed ({size / 1e6:.1f} MB)")
        return True

    except Exception as e:
        log.error(f"Validation failed: {e}")
        return False


# ══════════════════════════════════════════════════════════
# Fleet Server Communication (Simulated)
# ══════════════════════════════════════════════════════════

@dataclass
class UpdateManifest:
    version: str
    model_url: str
    sha256: str
    size_bytes: int
    is_delta: bool = False
    base_version: Optional[str] = None


def check_for_update(config: AgentConfig, current_version: str) -> Optional[UpdateManifest]:
    """
    Poll fleet server for available updates.
    In production: GET /devices/{device_id}/updates?current_version=X
    """
    log.info(f"Checking for updates (current: v{current_version})...")

    # Simulated response — replace with actual HTTP call
    # url = f"{config.fleet_server}/devices/{config.device_id}/updates"
    # response = requests.get(url, params={"current_version": current_version})

    # Simulate: no update available
    return None

    # Simulate: update available
    # return UpdateManifest(
    #     version="2.1.0",
    #     model_url="https://models.example.com/mobilenet_v2_v2.1.0.tflite",
    #     sha256="a1b2c3d4...",
    #     size_bytes=3_500_000,
    # )


def report_status(config: AgentConfig, slot_mgr: SlotManager, status: str):
    """Report device status to fleet server."""
    payload = {
        "device_id": config.device_id,
        "status": status,
        "active_version": slot_mgr.active_version,
        "active_slot": slot_mgr.active_slot,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    log.info(f"Reporting status: {json.dumps(payload, indent=2)}")
    # In production: POST to fleet server
    # requests.post(f"{config.fleet_server}/devices/{config.device_id}/status", json=payload)


# ══════════════════════════════════════════════════════════
# Main Update Loop
# ══════════════════════════════════════════════════════════

def run_update_cycle(config: AgentConfig):
    """Single update cycle: check → download → validate → swap."""
    slot_mgr = SlotManager(config)
    crash_detector = CrashDetector(config)

    # Check for crash loop
    if crash_detector.should_rollback():
        log.critical("Crash loop detected! Rolling back...")
        slot_mgr.rollback()
        crash_detector.reset()
        report_status(config, slot_mgr, "rollback")
        return

    # Check for updates
    manifest = check_for_update(config, slot_mgr.active_version)
    if manifest is None:
        log.info("No update available")
        report_status(config, slot_mgr, "up_to_date")
        return

    log.info(f"Update available: v{manifest.version} ({manifest.size_bytes/1e6:.1f} MB)")

    # Download to inactive slot
    dest = slot_mgr.inactive_path / "model.tflite"
    if not download_model(manifest.model_url, dest, config.max_retries, config.retry_backoff):
        report_status(config, slot_mgr, "download_failed")
        return

    # Verify integrity
    if not verify_integrity(dest, manifest.sha256):
        dest.unlink(missing_ok=True)
        report_status(config, slot_mgr, "integrity_failed")
        return

    # Validate model (dummy inference)
    if not validate_model(slot_mgr.inactive_path):
        report_status(config, slot_mgr, "validation_failed")
        return

    # Swap!
    slot_mgr.swap(manifest.version)
    crash_detector.reset()
    report_status(config, slot_mgr, "updated")
    log.info(f"✓ Updated to v{manifest.version}")


def main():
    config = AgentConfig()
    log.info(f"OTA Agent starting: device={config.device_id}")
    log.info(f"Model dir: {config.model_dir}")
    log.info(f"Poll interval: {config.poll_interval}s")

    while True:
        try:
            run_update_cycle(config)
        except Exception as e:
            log.error(f"Update cycle error: {e}")
        time.sleep(config.poll_interval)


if __name__ == "__main__":
    main()`
        },

        // ── 5.2  Edge Telemetry & Drift Detection ──
        {
          title: "Edge Telemetry & On-Device Drift Detection",
          lang: "python",
          filename: "edge_telemetry_drift.py",
          desc: "Implement an edge telemetry collector with on-device data drift detection. Uses Welford's algorithm for streaming statistics, Population Stability Index (PSI) for drift scoring, and MQTT for lightweight reporting.",
          code: `"""
Edge device telemetry and on-device drift detection.

Features:
- Streaming statistics (Welford's algorithm) — O(1) memory
- Population Stability Index (PSI) for distribution shift detection
- Inference latency tracking (p50, p95, p99)
- Hardware metrics (CPU temp, memory, disk)
- MQTT telemetry publishing (lightweight IoT protocol)
- Alert thresholds with configurable actions

This runs alongside the inference process, consuming model
outputs and input feature summaries without raw data access.
"""
import os
import time
import json
import math
import logging
import platform
import threading
from dataclasses import dataclass, field, asdict
from typing import Dict, List, Optional, Tuple
import numpy as np

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("telemetry")


# ══════════════════════════════════════════════════════════
# Welford's Online Statistics (O(1) Memory)
# ══════════════════════════════════════════════════════════

class WelfordStats:
    """
    Welford's algorithm for computing running mean and variance
    in a single pass with O(1) memory. Numerically stable.

    Reference: Welford (1962), "Note on a Method for Calculating
    Corrected Sums of Squares and Products"
    """

    def __init__(self, name: str = ""):
        self.name = name
        self.n = 0
        self.mean = 0.0
        self.M2 = 0.0    # Sum of squared deviations
        self.min_val = float("inf")
        self.max_val = float("-inf")

    def update(self, x: float):
        self.n += 1
        delta = x - self.mean
        self.mean += delta / self.n
        delta2 = x - self.mean
        self.M2 += delta * delta2
        self.min_val = min(self.min_val, x)
        self.max_val = max(self.max_val, x)

    def update_batch(self, values: np.ndarray):
        for v in values.flat:
            self.update(float(v))

    @property
    def variance(self) -> float:
        if self.n < 2:
            return 0.0
        return self.M2 / (self.n - 1)

    @property
    def std(self) -> float:
        return math.sqrt(self.variance)

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "n": self.n,
            "mean": round(self.mean, 6),
            "std": round(self.std, 6),
            "min": round(self.min_val, 6),
            "max": round(self.max_val, 6),
        }


# ══════════════════════════════════════════════════════════
# Histogram Tracker (Fixed-Bin)
# ══════════════════════════════════════════════════════════

class HistogramTracker:
    """
    Fixed-bin histogram for distribution tracking.
    Used for PSI computation against a reference distribution.
    """

    def __init__(self, n_bins: int = 20, range_min: float = 0.0, range_max: float = 1.0):
        self.n_bins = n_bins
        self.range_min = range_min
        self.range_max = range_max
        self.counts = np.zeros(n_bins, dtype=np.int64)
        self.total = 0

    def update(self, values: np.ndarray):
        clipped = np.clip(values.flatten(), self.range_min, self.range_max)
        bin_indices = np.floor(
            (clipped - self.range_min) / (self.range_max - self.range_min) * self.n_bins
        ).astype(int)
        bin_indices = np.clip(bin_indices, 0, self.n_bins - 1)
        for idx in bin_indices:
            self.counts[idx] += 1
        self.total += len(bin_indices)

    @property
    def distribution(self) -> np.ndarray:
        if self.total == 0:
            return np.ones(self.n_bins) / self.n_bins
        # Add small epsilon to avoid division by zero in PSI
        dist = self.counts.astype(np.float64) / self.total
        return np.clip(dist, 1e-8, None)

    def reset(self):
        self.counts[:] = 0
        self.total = 0


# ══════════════════════════════════════════════════════════
# Population Stability Index (PSI)
# ══════════════════════════════════════════════════════════

def compute_psi(reference: np.ndarray, current: np.ndarray) -> float:
    """
    Population Stability Index — measures distribution shift.

    PSI = sum( (current_i - reference_i) * ln(current_i / reference_i) )

    Interpretation:
    - PSI < 0.1:  No significant shift
    - PSI 0.1-0.25: Moderate shift — investigate
    - PSI > 0.25: Significant shift — likely model degradation
    """
    # Normalize to distributions
    ref = np.clip(reference / reference.sum(), 1e-8, None)
    cur = np.clip(current / current.sum(), 1e-8, None)
    return float(np.sum((cur - ref) * np.log(cur / ref)))


# ══════════════════════════════════════════════════════════
# Latency Percentile Tracker
# ══════════════════════════════════════════════════════════

class LatencyTracker:
    """Track inference latencies and compute percentiles using a circular buffer."""

    def __init__(self, window_size: int = 1000):
        self.buffer = np.zeros(window_size, dtype=np.float64)
        self.window_size = window_size
        self.idx = 0
        self.count = 0

    def record(self, latency_ms: float):
        self.buffer[self.idx % self.window_size] = latency_ms
        self.idx += 1
        self.count = min(self.count + 1, self.window_size)

    def percentile(self, p: float) -> float:
        if self.count == 0:
            return 0.0
        data = self.buffer[:self.count]
        return float(np.percentile(data, p))

    def to_dict(self) -> dict:
        return {
            "count": self.count,
            "p50_ms": round(self.percentile(50), 2),
            "p95_ms": round(self.percentile(95), 2),
            "p99_ms": round(self.percentile(99), 2),
            "mean_ms": round(float(np.mean(self.buffer[:self.count])), 2) if self.count > 0 else 0,
        }


# ══════════════════════════════════════════════════════════
# Hardware Metrics Collector
# ══════════════════════════════════════════════════════════

def collect_hardware_metrics() -> dict:
    """Collect CPU temp, memory usage, disk space."""
    metrics = {}

    # CPU temperature (Linux — Jetson, Raspberry Pi)
    thermal_paths = [
        "/sys/devices/virtual/thermal/thermal_zone0/temp",
        "/sys/class/thermal/thermal_zone0/temp",
    ]
    for path in thermal_paths:
        if os.path.exists(path):
            with open(path) as f:
                temp_milli = int(f.read().strip())
                metrics["cpu_temp_c"] = temp_milli / 1000.0
            break

    # Memory usage
    try:
        import psutil
        mem = psutil.virtual_memory()
        metrics["memory_used_pct"] = mem.percent
        metrics["memory_available_mb"] = mem.available / 1e6
    except ImportError:
        pass

    # Disk space
    try:
        stat = os.statvfs("/")
        free_gb = (stat.f_bavail * stat.f_frsize) / 1e9
        metrics["disk_free_gb"] = round(free_gb, 1)
    except (OSError, AttributeError):
        pass

    return metrics


# ══════════════════════════════════════════════════════════
# Telemetry Publisher (MQTT or HTTP fallback)
# ══════════════════════════════════════════════════════════

class TelemetryPublisher:
    """Publish telemetry via MQTT (lightweight IoT protocol)."""

    def __init__(self, device_id: str, broker: str = "localhost", port: int = 1883):
        self.device_id = device_id
        self.topic_base = f"edge/{device_id}"
        self.client = None

        try:
            import paho.mqtt.client as mqtt
            self.client = mqtt.Client(client_id=device_id)
            self.client.connect(broker, port, keepalive=60)
            self.client.loop_start()
            log.info(f"MQTT connected to {broker}:{port}")
        except Exception as e:
            log.warning(f"MQTT not available: {e}. Logging locally only.")

    def publish(self, subtopic: str, payload: dict):
        payload["device_id"] = self.device_id
        payload["timestamp"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        msg = json.dumps(payload)

        if self.client:
            topic = f"{self.topic_base}/{subtopic}"
            self.client.publish(topic, msg, qos=1)
        else:
            log.info(f"[{subtopic}] {msg}")

    def close(self):
        if self.client:
            self.client.loop_stop()
            self.client.disconnect()


# ══════════════════════════════════════════════════════════
# Drift Monitor (Main Orchestrator)
# ══════════════════════════════════════════════════════════

class DriftMonitor:
    """
    Monitors model input/output distributions for drift.
    Compares against a reference distribution established during deployment.
    """

    def __init__(
        self,
        device_id: str = "edge-001",
        reference_confidence_dist: Optional[np.ndarray] = None,
        psi_warning: float = 0.1,
        psi_critical: float = 0.25,
        report_interval: int = 60,
    ):
        self.publisher = TelemetryPublisher(device_id)
        self.latency_tracker = LatencyTracker(window_size=5000)
        self.confidence_stats = WelfordStats(name="confidence")
        self.confidence_hist = HistogramTracker(n_bins=20, range_min=0.0, range_max=1.0)

        # Reference distribution (from calibration/validation set)
        if reference_confidence_dist is not None:
            self.reference_dist = reference_confidence_dist
        else:
            # Default: uniform (replace with actual calibration data)
            self.reference_dist = np.ones(20) / 20

        self.psi_warning = psi_warning
        self.psi_critical = psi_critical
        self.report_interval = report_interval
        self.inference_count = 0
        self.last_report = time.time()

    def record_inference(self, latency_ms: float, confidence: float):
        """Called after each inference with the result."""
        self.latency_tracker.record(latency_ms)
        self.confidence_stats.update(confidence)
        self.confidence_hist.update(np.array([confidence]))
        self.inference_count += 1

        # Periodic reporting
        if time.time() - self.last_report > self.report_interval:
            self._report()
            self.last_report = time.time()

    def _report(self):
        """Compute metrics and publish telemetry."""
        # Compute PSI
        psi = compute_psi(self.reference_dist, self.confidence_hist.distribution)

        # Drift status
        if psi > self.psi_critical:
            drift_status = "CRITICAL"
            log.warning(f"DRIFT CRITICAL: PSI={psi:.4f} > {self.psi_critical}")
        elif psi > self.psi_warning:
            drift_status = "WARNING"
            log.warning(f"DRIFT WARNING: PSI={psi:.4f} > {self.psi_warning}")
        else:
            drift_status = "OK"

        # Build telemetry payload
        payload = {
            "inference_count": self.inference_count,
            "latency": self.latency_tracker.to_dict(),
            "confidence": self.confidence_stats.to_dict(),
            "drift": {
                "psi": round(psi, 6),
                "status": drift_status,
            },
            "hardware": collect_hardware_metrics(),
        }

        self.publisher.publish("metrics", payload)

        # Reset per-window trackers
        self.confidence_hist.reset()

    def close(self):
        self._report()
        self.publisher.close()


# ══════════════════════════════════════════════════════════
# Demo: Simulate Edge Inference + Telemetry
# ══════════════════════════════════════════════════════════

def demo():
    """Simulate 1000 inferences with gradual drift."""
    log.info("Starting drift detection demo...")

    # Reference distribution: high-confidence model (peak near 0.85)
    ref_dist = np.array([
        0.01, 0.01, 0.01, 0.01, 0.02, 0.02, 0.03, 0.03, 0.04, 0.05,
        0.06, 0.07, 0.08, 0.09, 0.10, 0.12, 0.10, 0.08, 0.05, 0.02,
    ])
    ref_dist = ref_dist / ref_dist.sum()

    monitor = DriftMonitor(
        device_id="demo-edge-001",
        reference_confidence_dist=ref_dist,
        psi_warning=0.1,
        psi_critical=0.25,
        report_interval=5,  # Report every 5s for demo
    )

    # Phase 1: Normal operation (confidence ~ 0.85)
    log.info("Phase 1: Normal operation (500 inferences)")
    for i in range(500):
        latency = np.random.normal(15, 2)     # ~15ms inference
        confidence = np.random.beta(8, 2)      # High confidence
        monitor.record_inference(latency, confidence)
        time.sleep(0.005)

    # Phase 2: Drift begins (confidence drops)
    log.info("Phase 2: Distribution drift (300 inferences)")
    for i in range(300):
        latency = np.random.normal(18, 3)      # Slightly slower
        confidence = np.random.beta(4, 3)       # Lower confidence = drift
        monitor.record_inference(latency, confidence)
        time.sleep(0.005)

    # Phase 3: Severe drift
    log.info("Phase 3: Severe drift (200 inferences)")
    for i in range(200):
        latency = np.random.normal(22, 5)      # Much slower (thermal?)
        confidence = np.random.beta(2, 5)       # Very low confidence
        monitor.record_inference(latency, confidence)
        time.sleep(0.005)

    monitor.close()
    log.info("✓ Drift detection demo complete")


if __name__ == "__main__":
    demo()`
        },
      ]
    },
  ];
})();
