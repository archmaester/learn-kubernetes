// Patches the Scaling Edge ML Pipelines & Multi-Platform CI/CD module (m22) with comprehensive code examples.
// Loaded after curriculum.js and lessons.js.
// m22 = CURRICULUM.phases[5].modules[6]
(function patchScalingEdgePipelinesExamples() {
  const m = CURRICULUM.phases[5].modules[6];

  m.codeExamples = [

    // ──────────────────────────────────────────────────────────
    // Section 1: Edge Model Registry — Full Implementation
    // ──────────────────────────────────────────────────────────
    {
      id: "edge-model-registry",
      title: "Edge Model Registry — Full Implementation",
      icon: "📦",
      items: [

        // ── 1.1 Registry Core ──
        {
          title: "Model Registry with Per-Target Artifacts",
          lang: "python",
          filename: "registry_core.py",
          desc: "Complete model registry implementation with per-hardware artifact tracking, benchmark storage, and lineage. Uses SQLite for portability — swap to PostgreSQL for production.",
          code: `"""
Edge Model Registry — stores compiled artifacts per hardware target
with full lineage tracking and benchmark results.
"""
import sqlite3
import json
import hashlib
from pathlib import Path
from datetime import datetime
from contextlib import contextmanager


class EdgeModelRegistry:
    """Production-grade model registry for edge ML deployments."""

    def __init__(self, db_path: str = "model_registry.db",
                 artifact_store: str = "./artifacts"):
        self.db_path = db_path
        self.artifact_store = Path(artifact_store)
        self.artifact_store.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _init_db(self):
        with self._conn() as conn:
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS model_versions (
                    version_id TEXT PRIMARY KEY,
                    model_family TEXT NOT NULL,
                    source_framework TEXT,
                    training_run_id TEXT,
                    dataset_version TEXT,
                    onnx_hash TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    metadata_json TEXT DEFAULT '{}'
                );

                CREATE TABLE IF NOT EXISTS compiled_artifacts (
                    artifact_id TEXT PRIMARY KEY,
                    version_id TEXT NOT NULL REFERENCES model_versions(version_id),
                    target TEXT NOT NULL,
                    compiler TEXT NOT NULL,
                    compiler_version TEXT,
                    quantization TEXT DEFAULT 'fp32',
                    artifact_path TEXT NOT NULL,
                    artifact_hash TEXT NOT NULL,
                    artifact_size_bytes INTEGER,
                    compile_flags_json TEXT DEFAULT '{}',
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS benchmarks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    artifact_id TEXT NOT NULL REFERENCES compiled_artifacts(artifact_id),
                    latency_p50_ms REAL,
                    latency_p95_ms REAL,
                    latency_p99_ms REAL,
                    accuracy REAL,
                    accuracy_metric_name TEXT DEFAULT 'mAP@0.5',
                    memory_peak_mb REAL,
                    power_watts REAL,
                    throughput_fps REAL,
                    hardware_serial TEXT,
                    measured_at TEXT DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS deployments (
                    device_id TEXT NOT NULL,
                    artifact_id TEXT NOT NULL REFERENCES compiled_artifacts(artifact_id),
                    deployed_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    status TEXT DEFAULT 'active',
                    PRIMARY KEY (device_id, artifact_id)
                );

                CREATE INDEX IF NOT EXISTS idx_artifacts_version
                    ON compiled_artifacts(version_id);
                CREATE INDEX IF NOT EXISTS idx_artifacts_target
                    ON compiled_artifacts(target, quantization);
                CREATE INDEX IF NOT EXISTS idx_benchmarks_artifact
                    ON benchmarks(artifact_id);
            """)

    @contextmanager
    def _conn(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        finally:
            conn.close()

    # ── Registration ──

    def register_version(self, version_id: str, model_family: str,
                         source_framework: str, training_run_id: str,
                         dataset_version: str, onnx_path: str,
                         metadata: dict = None) -> str:
        """Register a new model version with its ONNX export."""
        onnx_hash = self._hash_file(onnx_path)

        # Store ONNX in artifact store
        dest = self.artifact_store / "onnx" / f"{version_id}.onnx"
        dest.parent.mkdir(parents=True, exist_ok=True)
        import shutil
        shutil.copy2(onnx_path, dest)

        with self._conn() as conn:
            conn.execute(
                """INSERT INTO model_versions
                   (version_id, model_family, source_framework,
                    training_run_id, dataset_version, onnx_hash, metadata_json)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (version_id, model_family, source_framework,
                 training_run_id, dataset_version, onnx_hash,
                 json.dumps(metadata or {}))
            )
        return version_id

    def register_artifact(self, version_id: str, artifact_path: str,
                          target: str, compiler: str,
                          compiler_version: str,
                          quantization: str = "fp32",
                          compile_flags: dict = None) -> str:
        """Register a compiled artifact for a specific target."""
        artifact_hash = self._hash_file(artifact_path)
        artifact_id = f"{version_id}_{target}_{quantization}_{artifact_hash[:8]}"
        artifact_size = Path(artifact_path).stat().st_size

        # Store in artifact store
        dest = self.artifact_store / "compiled" / target / f"{artifact_id}.bin"
        dest.parent.mkdir(parents=True, exist_ok=True)
        import shutil
        shutil.copy2(artifact_path, dest)

        with self._conn() as conn:
            conn.execute(
                """INSERT INTO compiled_artifacts
                   (artifact_id, version_id, target, compiler,
                    compiler_version, quantization, artifact_path,
                    artifact_hash, artifact_size_bytes, compile_flags_json)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (artifact_id, version_id, target, compiler,
                 compiler_version, quantization, str(dest),
                 artifact_hash, artifact_size,
                 json.dumps(compile_flags or {}))
            )
        return artifact_id

    def record_benchmark(self, artifact_id: str, **metrics):
        """Record benchmark results for a compiled artifact."""
        with self._conn() as conn:
            conn.execute(
                """INSERT INTO benchmarks
                   (artifact_id, latency_p50_ms, latency_p95_ms,
                    latency_p99_ms, accuracy, accuracy_metric_name,
                    memory_peak_mb, power_watts, throughput_fps,
                    hardware_serial)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (artifact_id,
                 metrics.get("latency_p50_ms"),
                 metrics.get("latency_p95_ms"),
                 metrics.get("latency_p99_ms"),
                 metrics.get("accuracy"),
                 metrics.get("accuracy_metric_name", "mAP@0.5"),
                 metrics.get("memory_peak_mb"),
                 metrics.get("power_watts"),
                 metrics.get("throughput_fps"),
                 metrics.get("hardware_serial"))
            )

    # ── Queries ──

    def find_best_artifact(self, model_family: str, target: str,
                           max_latency_p95_ms: float = None,
                           min_accuracy: float = None,
                           quantization: str = None) -> dict:
        """Find the best artifact for a target meeting constraints."""
        query = """
            SELECT a.*, b.latency_p95_ms, b.accuracy, b.memory_peak_mb,
                   b.throughput_fps, v.model_family
            FROM compiled_artifacts a
            JOIN model_versions v ON a.version_id = v.version_id
            LEFT JOIN benchmarks b ON a.artifact_id = b.artifact_id
            WHERE v.model_family = ? AND a.target = ?
        """
        params = [model_family, target]

        if quantization:
            query += " AND a.quantization = ?"
            params.append(quantization)
        if max_latency_p95_ms:
            query += " AND b.latency_p95_ms <= ?"
            params.append(max_latency_p95_ms)
        if min_accuracy:
            query += " AND b.accuracy >= ?"
            params.append(min_accuracy)

        query += " ORDER BY b.latency_p95_ms ASC LIMIT 1"

        with self._conn() as conn:
            row = conn.execute(query, params).fetchone()
            return dict(row) if row else None

    def compare_versions(self, version_a: str, version_b: str) -> dict:
        """Compare benchmark results across all targets for two versions."""
        query = """
            SELECT a.target, a.quantization, a.version_id,
                   b.latency_p95_ms, b.accuracy, b.memory_peak_mb
            FROM compiled_artifacts a
            JOIN benchmarks b ON a.artifact_id = b.artifact_id
            WHERE a.version_id IN (?, ?)
            ORDER BY a.target, a.quantization
        """
        with self._conn() as conn:
            rows = conn.execute(query, (version_a, version_b)).fetchall()

        comparison = {}
        for row in rows:
            key = f"{row['target']}/{row['quantization']}"
            if key not in comparison:
                comparison[key] = {}
            comparison[key][row["version_id"]] = {
                "latency_p95": row["latency_p95_ms"],
                "accuracy": row["accuracy"],
                "memory_mb": row["memory_peak_mb"],
            }
        return comparison

    def find_by_compiler(self, compiler_version: str) -> list[dict]:
        """Find all artifacts compiled with a specific compiler version."""
        query = """
            SELECT a.artifact_id, a.version_id, a.target, a.quantization,
                   d.device_id, d.status
            FROM compiled_artifacts a
            LEFT JOIN deployments d ON a.artifact_id = d.artifact_id
            WHERE a.compiler_version = ?
        """
        with self._conn() as conn:
            rows = conn.execute(query, (compiler_version,)).fetchall()
            return [dict(r) for r in rows]

    @staticmethod
    def _hash_file(path: str) -> str:
        h = hashlib.sha256()
        with open(path, "rb") as f:
            for chunk in iter(lambda: f.read(8192), b""):
                h.update(chunk)
        return h.hexdigest()


# ── Usage Example ──
if __name__ == "__main__":
    registry = EdgeModelRegistry()

    # Register a model version
    # registry.register_version(
    #     version_id="yolov8n-v3",
    #     model_family="yolov8-nano",
    #     source_framework="pytorch",
    #     training_run_id="run-20240315",
    #     dataset_version="coco-v2",
    #     onnx_path="exports/yolov8n.onnx",
    # )

    # Register compiled artifacts for each target
    # for target, path in compiled_artifacts.items():
    #     artifact_id = registry.register_artifact(
    #         version_id="yolov8n-v3",
    #         artifact_path=path,
    #         target=target,
    #         compiler="tvm",
    #         compiler_version="0.15.0",
    #         quantization="int8",
    #     )
    #     registry.record_benchmark(artifact_id, ...)

    # Query: best model for Jetson Orin under 30ms
    # best = registry.find_best_artifact(
    #     model_family="yolov8-nano",
    #     target="jetson-orin",
    #     max_latency_p95_ms=30.0,
    #     min_accuracy=0.80,
    # )
    print("Registry initialized successfully")`
        },

        // ── 1.2 Registry CLI ──
        {
          title: "Registry CLI for CI/CD Integration",
          lang: "python",
          filename: "registry_cli.py",
          desc: "Command-line interface for the model registry — used by CI/CD pipelines to register, query, and deploy artifacts.",
          code: `"""
CLI for Edge Model Registry — integrates with CI/CD pipelines.

Usage:
    python registry_cli.py register-version --id v3 --family yolov8-nano --onnx model.onnx
    python registry_cli.py register-artifact --version v3 --target jetson-orin --path model.engine
    python registry_cli.py benchmark --artifact-id v3_jetson-orin_int8_abc12345
    python registry_cli.py find-best --family yolov8-nano --target jetson-orin --max-latency 30
    python registry_cli.py compare --version-a v2 --version-b v3
    python registry_cli.py find-by-compiler --version tvm-0.14.2
"""
import argparse
import json
import sys

# Assuming registry_core.py is importable
# from registry_core import EdgeModelRegistry


def main():
    parser = argparse.ArgumentParser(description="Edge Model Registry CLI")
    sub = parser.add_subparsers(dest="command")

    # register-version
    rv = sub.add_parser("register-version")
    rv.add_argument("--id", required=True)
    rv.add_argument("--family", required=True)
    rv.add_argument("--framework", default="pytorch")
    rv.add_argument("--training-run", default="")
    rv.add_argument("--dataset-version", default="")
    rv.add_argument("--onnx", required=True)

    # register-artifact
    ra = sub.add_parser("register-artifact")
    ra.add_argument("--version", required=True)
    ra.add_argument("--target", required=True)
    ra.add_argument("--compiler", default="tvm")
    ra.add_argument("--compiler-version", default="0.15.0")
    ra.add_argument("--quantization", default="fp32")
    ra.add_argument("--path", required=True)
    ra.add_argument("--flags", default="{}")

    # find-best
    fb = sub.add_parser("find-best")
    fb.add_argument("--family", required=True)
    fb.add_argument("--target", required=True)
    fb.add_argument("--max-latency", type=float, default=None)
    fb.add_argument("--min-accuracy", type=float, default=None)
    fb.add_argument("--quantization", default=None)

    # compare
    cmp = sub.add_parser("compare")
    cmp.add_argument("--version-a", required=True)
    cmp.add_argument("--version-b", required=True)

    # find-by-compiler
    fc = sub.add_parser("find-by-compiler")
    fc.add_argument("--version", required=True)

    args = parser.parse_args()

    # In production, initialize from environment/config
    # registry = EdgeModelRegistry(
    #     db_path=os.environ.get("REGISTRY_DB", "model_registry.db"),
    #     artifact_store=os.environ.get("ARTIFACT_STORE", "./artifacts"),
    # )

    if args.command == "register-version":
        print(f"Registering version {args.id} for {args.family}")
        # vid = registry.register_version(args.id, args.family, ...)
        # print(f"Registered: {vid}")

    elif args.command == "register-artifact":
        print(f"Registering artifact for {args.version} -> {args.target}")
        # aid = registry.register_artifact(args.version, args.path, ...)
        # print(f"Registered: {aid}")

    elif args.command == "find-best":
        print(f"Finding best {args.family} for {args.target}")
        # result = registry.find_best_artifact(args.family, args.target, ...)
        # print(json.dumps(result, indent=2))

    elif args.command == "compare":
        print(f"Comparing {args.version_a} vs {args.version_b}")
        # result = registry.compare_versions(args.version_a, args.version_b)
        # print(json.dumps(result, indent=2))

    elif args.command == "find-by-compiler":
        print(f"Finding artifacts compiled with {args.version}")
        # results = registry.find_by_compiler(args.version)
        # for r in results:
        #     print(f"  {r['artifact_id']} -> device: {r.get('device_id', 'N/A')}")

    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()`
        },
      ],
    },


    // ──────────────────────────────────────────────────────────
    // Section 2: Multi-Platform CI/CD Pipeline
    // ──────────────────────────────────────────────────────────
    {
      id: "multi-platform-cicd-pipeline",
      title: "Multi-Platform CI/CD Pipeline",
      icon: "🔄",
      items: [

        // ── 2.1 Complete GitHub Actions Workflow ──
        {
          title: "Complete Edge ML CI/CD Workflow (GitHub Actions)",
          lang: "yaml",
          filename: ".github/workflows/edge-ml-pipeline.yml",
          desc: "Full CI/CD pipeline: export model → cross-compile for 4 targets → validate golden references → benchmark on real hardware → gate deployment → register artifacts.",
          code: `# Edge ML CI/CD Pipeline — Full Implementation
# Compiles for multiple hardware targets, benchmarks on real HW, gates deployment.

name: Edge ML Pipeline

on:
  push:
    branches: [main, release/*]
    paths: ['models/**', 'configs/**', 'scripts/**']
  pull_request:
    branches: [main]
    paths: ['models/**', 'configs/**', 'scripts/**']
  workflow_dispatch:
    inputs:
      force_benchmark:
        description: 'Force benchmark on real hardware'
        type: boolean
        default: false

env:
  REGISTRY_URL: \${{ secrets.MODEL_REGISTRY_URL }}
  ONNX_CACHE_KEY_PREFIX: "onnx-v1"

# ── Stage 1: Export & Validate ──
jobs:
  export:
    name: "Export to ONNX"
    runs-on: ubuntu-latest
    outputs:
      onnx_hash: \${{ steps.export.outputs.onnx_hash }}
      cache_hit: \${{ steps.cache.outputs.cache-hit }}
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          cache: 'pip'

      - run: pip install torch torchvision onnx onnxruntime onnxsim

      - name: Export and simplify ONNX
        id: export
        run: |
          python scripts/export_onnx.py \\
            --config configs/model.yaml \\
            --output exported/model.onnx \\
            --simplify
          HASH=$(sha256sum exported/model.onnx | cut -d' ' -f1)
          echo "onnx_hash=$HASH" >> "$GITHUB_OUTPUT"

      - name: Check ONNX cache
        id: cache
        uses: actions/cache@v4
        with:
          path: exported/
          key: "\${{ env.ONNX_CACHE_KEY_PREFIX }}-\${{ steps.export.outputs.onnx_hash }}"

      - name: Generate golden references
        run: |
          python scripts/generate_golden.py \\
            --model exported/model.onnx \\
            --inputs test_data/calibration/ \\
            --output exported/golden/

      - uses: actions/upload-artifact@v4
        with:
          name: onnx-export
          path: exported/
          retention-days: 7

  # ── Stage 2: Cross-compile for each target ──
  compile:
    name: "Compile: \${{ matrix.target }}/\${{ matrix.quantization }}"
    needs: export
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        include:
          - target: jetson-orin
            compiler: tensorrt
            quantization: int8
            image: ghcr.io/myorg/tensorrt-cross:8.6
          - target: cortex-a78-arm64
            compiler: tflite
            quantization: int8
            image: ghcr.io/myorg/tflite-cross-arm64:2.15
          - target: cortex-a78-arm64
            compiler: tvm
            quantization: fp16
            image: ghcr.io/myorg/tvm-cross-arm64:0.15
          - target: x86-avx512
            compiler: tvm
            quantization: fp32
            image: ghcr.io/myorg/tvm-x86:0.15
    container:
      image: \${{ matrix.image }}
    steps:
      - uses: actions/checkout@v4

      - uses: actions/download-artifact@v4
        with:
          name: onnx-export
          path: exported/

      # Check if this exact compilation is cached
      - name: Check compile cache
        id: compile-cache
        uses: actions/cache@v4
        with:
          path: compiled/
          key: "compiled-\${{ needs.export.outputs.onnx_hash }}-\${{ matrix.target }}-\${{ matrix.compiler }}-\${{ matrix.quantization }}"

      - name: Cross-compile
        if: steps.compile-cache.outputs.cache-hit != 'true'
        env:
          SOURCE_DATE_EPOCH: "0"
          PYTHONHASHSEED: "42"
        run: |
          python scripts/compile_model.py \\
            --model exported/model.onnx \\
            --target \${{ matrix.target }} \\
            --compiler \${{ matrix.compiler }} \\
            --quantization \${{ matrix.quantization }} \\
            --output compiled/

      - name: Validate golden references (QEMU)
        run: |
          python scripts/validate_golden.py \\
            --compiled compiled/ \\
            --golden exported/golden/ \\
            --quantization \${{ matrix.quantization }} \\
            --tolerance auto

      - uses: actions/upload-artifact@v4
        with:
          name: "compiled-\${{ matrix.target }}-\${{ matrix.compiler }}-\${{ matrix.quantization }}"
          path: compiled/

  # ── Stage 3: Benchmark on real hardware ──
  benchmark:
    name: "Benchmark: \${{ matrix.target }}"
    needs: compile
    if: github.ref == 'refs/heads/main' || github.event.inputs.force_benchmark == 'true'
    strategy:
      fail-fast: false
      matrix:
        include:
          - target: jetson-orin
            runner: [self-hosted, linux, arm64, jetson-orin]
          - target: cortex-a78-arm64
            runner: [self-hosted, linux, arm64, rpi5]
    runs-on: \${{ matrix.runner }}
    steps:
      - uses: actions/checkout@v4

      - uses: actions/download-artifact@v4
        with:
          pattern: "compiled-\${{ matrix.target }}-*"
          merge-multiple: true
          path: compiled/

      - name: Benchmark on real hardware
        run: |
          python scripts/run_benchmark.py \\
            --compiled-dir compiled/ \\
            --target \${{ matrix.target }} \\
            --warmup 100 \\
            --iterations 500 \\
            --output results/benchmark.json

      - name: Regression check
        run: |
          python scripts/check_regression.py \\
            --current results/benchmark.json \\
            --baseline-from "\$REGISTRY_URL" \\
            --latency-threshold 10 \\
            --accuracy-threshold 0.5 \\
            --fail-on-critical

      - uses: actions/upload-artifact@v4
        with:
          name: "benchmark-\${{ matrix.target }}"
          path: results/

  # ── Stage 4: Register (main branch only) ──
  register:
    name: "Register Artifacts"
    needs: [compile, benchmark]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/download-artifact@v4
        with:
          pattern: "compiled-*"
          merge-multiple: true
          path: all-compiled/

      - uses: actions/download-artifact@v4
        with:
          pattern: "benchmark-*"
          merge-multiple: true
          path: all-benchmarks/

      - name: Register in model registry
        run: |
          python scripts/register_artifacts.py \\
            --version "\${{ github.sha }}" \\
            --compiled-dir all-compiled/ \\
            --benchmarks-dir all-benchmarks/ \\
            --registry "\$REGISTRY_URL"
          echo "Artifacts registered for commit \${{ github.sha }}"`
        },

        // ── 2.2 Cross-Compilation Script ──
        {
          title: "Cross-Compilation Script with Caching",
          lang: "python",
          filename: "scripts/compile_model.py",
          desc: "Unified compilation script that handles multiple compilers (TVM, TFLite, TensorRT) and targets with deterministic builds and artifact caching.",
          code: `"""
Unified model compilation script for CI/CD.
Supports TVM, TFLite, and TensorRT backends.
Ensures deterministic compilation with caching.
"""
import argparse
import hashlib
import json
import os
import sys
import shutil
from pathlib import Path


def compile_tvm(onnx_path: str, target: str, quantization: str,
                output_dir: str) -> str:
    """Compile ONNX model using Apache TVM."""
    import onnx
    import tvm
    from tvm import relay
    import numpy as np

    # Load ONNX model
    onnx_model = onnx.load(onnx_path)
    shape_dict = {"input": (1, 3, 224, 224)}  # from config in production

    mod, params = relay.frontend.from_onnx(onnx_model, shape_dict)

    # Target mapping
    target_map = {
        "cortex-a78-arm64": "llvm -mtriple=aarch64-linux-gnu -mcpu=cortex-a78",
        "x86-avx512": "llvm -mcpu=skylake-avx512",
        "jetson-orin": "cuda -arch=sm_87",
    }

    tvm_target = target_map.get(target, f"llvm -mtriple={target}")

    # Apply optimizations
    with tvm.transform.PassContext(opt_level=3):
        # Quantize if requested
        if quantization == "int8":
            from tvm.relay.quantize import quantize
            mod = quantize(mod, params=params)
        elif quantization == "fp16":
            mod = relay.transform.ToMixedPrecision("float16")(mod)

        lib = relay.build(mod, target=tvm_target, params=params)

    # Export
    output_path = Path(output_dir) / f"model_{target}_{quantization}.tar"
    lib.export_library(str(output_path))

    print(f"TVM compiled: {output_path} ({output_path.stat().st_size} bytes)")
    return str(output_path)


def compile_tflite(onnx_path: str, target: str, quantization: str,
                   output_dir: str) -> str:
    """Convert ONNX to TFLite with optional quantization."""
    import tensorflow as tf
    import onnx
    from onnx_tf.backend import prepare
    import numpy as np

    # ONNX -> TF SavedModel
    onnx_model = onnx.load(onnx_path)
    tf_rep = prepare(onnx_model)
    saved_model_dir = Path(output_dir) / "tf_saved_model"
    tf_rep.export_graph(str(saved_model_dir))

    # TF SavedModel -> TFLite
    converter = tf.lite.TFLiteConverter.from_saved_model(str(saved_model_dir))

    if quantization == "int8":
        converter.optimizations = [tf.lite.Optimize.DEFAULT]

        # Representative dataset for calibration
        def representative_dataset():
            for _ in range(100):
                yield [np.random.randn(1, 224, 224, 3).astype(np.float32)]

        converter.representative_dataset = representative_dataset
        converter.target_spec.supported_ops = [tf.lite.OpsSet.TFLITE_BUILTINS_INT8]
        converter.inference_input_type = tf.int8
        converter.inference_output_type = tf.int8

    elif quantization == "fp16":
        converter.optimizations = [tf.lite.Optimize.DEFAULT]
        converter.target_spec.supported_types = [tf.float16]

    tflite_model = converter.convert()

    output_path = Path(output_dir) / f"model_{target}_{quantization}.tflite"
    with open(output_path, "wb") as f:
        f.write(tflite_model)

    # Cleanup temp SavedModel
    shutil.rmtree(saved_model_dir, ignore_errors=True)

    print(f"TFLite compiled: {output_path} ({output_path.stat().st_size} bytes)")
    return str(output_path)


def compile_tensorrt(onnx_path: str, target: str, quantization: str,
                     output_dir: str) -> str:
    """Compile ONNX model using TensorRT."""
    import tensorrt as trt

    logger = trt.Logger(trt.Logger.WARNING)
    builder = trt.Builder(logger)
    network = builder.create_network(
        1 << int(trt.NetworkDefinitionCreationFlag.EXPLICIT_BATCH)
    )
    parser = trt.OnnxParser(network, logger)

    with open(onnx_path, "rb") as f:
        if not parser.parse(f.read()):
            for i in range(parser.num_errors):
                print(f"TensorRT parse error: {parser.get_error(i)}")
            sys.exit(1)

    config = builder.create_builder_config()
    config.set_memory_pool_limit(trt.MemoryPoolType.WORKSPACE, 1 << 30)

    if quantization == "fp16":
        config.set_flag(trt.BuilderFlag.FP16)
    elif quantization == "int8":
        config.set_flag(trt.BuilderFlag.INT8)
        # In production: set calibrator with real calibration data
        # config.int8_calibrator = MyCalibrator(...)

    engine = builder.build_serialized_network(network, config)

    output_path = Path(output_dir) / f"model_{target}_{quantization}.engine"
    with open(output_path, "wb") as f:
        f.write(engine)

    print(f"TensorRT compiled: {output_path} ({output_path.stat().st_size} bytes)")
    return str(output_path)


COMPILERS = {
    "tvm": compile_tvm,
    "tflite": compile_tflite,
    "tensorrt": compile_tensorrt,
}


def main():
    parser = argparse.ArgumentParser(description="Compile ONNX model for target")
    parser.add_argument("--model", required=True, help="Path to ONNX model")
    parser.add_argument("--target", required=True, help="Hardware target")
    parser.add_argument("--compiler", required=True, choices=list(COMPILERS.keys()))
    parser.add_argument("--quantization", default="fp32",
                        choices=["fp32", "fp16", "int8"])
    parser.add_argument("--output", required=True, help="Output directory")
    args = parser.parse_args()

    Path(args.output).mkdir(parents=True, exist_ok=True)

    compile_fn = COMPILERS[args.compiler]
    artifact_path = compile_fn(
        args.model, args.target, args.quantization, args.output
    )

    # Write metadata
    metadata = {
        "model_hash": hashlib.sha256(
            Path(args.model).read_bytes()).hexdigest(),
        "artifact_hash": hashlib.sha256(
            Path(artifact_path).read_bytes()).hexdigest(),
        "target": args.target,
        "compiler": args.compiler,
        "quantization": args.quantization,
    }
    meta_path = Path(args.output) / "metadata.json"
    with open(meta_path, "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"Compilation complete: {artifact_path}")
    print(f"Metadata: {meta_path}")


if __name__ == "__main__":
    main()`
        },
      ],
    },


    // ──────────────────────────────────────────────────────────
    // Section 3: OTA Updates & Delta Patching
    // ──────────────────────────────────────────────────────────
    {
      id: "ota-updates-delta",
      title: "OTA Updates & Delta Patching",
      icon: "📡",
      items: [

        // ── 3.1 Delta Update System ──
        {
          title: "Delta OTA Update System with A/B Partitioning",
          lang: "python",
          filename: "ota_update_system.py",
          desc: "Complete OTA system: delta patch generation, A/B slot management, integrity verification, bandwidth-aware scheduling, and automatic rollback.",
          code: `"""
OTA Model Update System for Edge Devices
- Delta patching (bsdiff4) for bandwidth efficiency
- A/B slot partitioning for instant rollback
- Integrity verification (SHA-256)
- Bandwidth-aware update scheduling
"""
import hashlib
import json
import os
import time
from pathlib import Path
from dataclasses import dataclass, asdict
from datetime import datetime


@dataclass
class UpdateManifest:
    """Describes a pending model update."""
    model_name: str
    from_version: str
    to_version: str
    from_hash: str
    to_hash: str
    update_type: str           # "full" or "delta"
    payload_url: str
    payload_size_bytes: int
    payload_hash: str
    min_battery_pct: int = 20
    require_wifi: bool = False
    priority: str = "normal"
    created_at: str = ""


class DeltaPatchGenerator:
    """Generate delta patches between model versions (server-side)."""

    @staticmethod
    def generate_patch(old_path: str, new_path: str,
                       output_path: str) -> dict:
        """Generate a bsdiff4 delta patch between two model files."""
        try:
            import bsdiff4
        except ImportError:
            raise ImportError("pip install bsdiff4")

        old_bytes = Path(old_path).read_bytes()
        new_bytes = Path(new_path).read_bytes()

        patch_bytes = bsdiff4.diff(old_bytes, new_bytes)
        Path(output_path).write_bytes(patch_bytes)

        old_size = len(old_bytes)
        new_size = len(new_bytes)
        patch_size = len(patch_bytes)
        compression_ratio = (1 - patch_size / new_size) * 100

        return {
            "old_size": old_size,
            "new_size": new_size,
            "patch_size": patch_size,
            "compression_pct": round(compression_ratio, 1),
            "old_hash": hashlib.sha256(old_bytes).hexdigest(),
            "new_hash": hashlib.sha256(new_bytes).hexdigest(),
            "patch_hash": hashlib.sha256(patch_bytes).hexdigest(),
        }


class ABSlotManager:
    """Manage A/B model slots on an edge device."""

    def __init__(self, base_dir: str = "/opt/models"):
        self.base = Path(base_dir)
        self.slot_a = self.base / "slot_a"
        self.slot_b = self.base / "slot_b"
        self.state_file = self.base / "slot_state.json"

        # Create directories
        self.slot_a.mkdir(parents=True, exist_ok=True)
        self.slot_b.mkdir(parents=True, exist_ok=True)

        self._load_state()

    def _load_state(self):
        if self.state_file.exists():
            with open(self.state_file) as f:
                state = json.load(f)
            self.active = state.get("active", "A")
            self.versions = state.get("versions", {"A": None, "B": None})
            self.boot_count = state.get("boot_count", 0)
        else:
            self.active = "A"
            self.versions = {"A": None, "B": None}
            self.boot_count = 0
            self._save_state()

    def _save_state(self):
        with open(self.state_file, "w") as f:
            json.dump({
                "active": self.active,
                "versions": self.versions,
                "boot_count": self.boot_count,
                "updated_at": datetime.utcnow().isoformat(),
            }, f, indent=2)

    @property
    def active_slot_path(self) -> Path:
        return self.slot_a if self.active == "A" else self.slot_b

    @property
    def inactive_slot(self) -> str:
        return "B" if self.active == "A" else "A"

    @property
    def inactive_slot_path(self) -> Path:
        return self.slot_b if self.active == "A" else self.slot_a

    def install_to_inactive(self, model_bytes: bytes,
                            version: str, expected_hash: str) -> bool:
        """Write new model to inactive slot with verification."""
        actual_hash = hashlib.sha256(model_bytes).hexdigest()
        if actual_hash != expected_hash:
            print(f"HASH MISMATCH: {actual_hash[:16]} != {expected_hash[:16]}")
            return False

        model_path = self.inactive_slot_path / "model.bin"
        model_path.write_bytes(model_bytes)
        self.versions[self.inactive_slot] = version
        self._save_state()
        print(f"Installed {version} to slot {self.inactive_slot}")
        return True

    def swap(self) -> str:
        """Atomically swap to the inactive slot (activate new model)."""
        old_active = self.active
        self.active = self.inactive_slot
        self.boot_count = 0  # reset boot counter for rollback detection
        self._save_state()
        print(f"Swapped: {old_active} -> {self.active}")
        return self.active

    def rollback(self) -> str:
        """Roll back to previous slot."""
        return self.swap()

    def check_health(self, max_boot_failures: int = 3) -> bool:
        """
        Check if current model is healthy.
        If boot_count exceeds threshold, auto-rollback.
        """
        self.boot_count += 1
        self._save_state()

        if self.boot_count > max_boot_failures:
            print(f"Boot count {self.boot_count} > {max_boot_failures}, "
                  f"auto-rolling back!")
            self.rollback()
            return False
        return True

    def mark_healthy(self):
        """Mark current slot as healthy (reset boot counter)."""
        self.boot_count = 0
        self._save_state()


class OTAClient:
    """Client-side OTA update handler for edge devices."""

    def __init__(self, slot_manager: ABSlotManager):
        self.slots = slot_manager

    def apply_update(self, manifest: UpdateManifest,
                     payload_bytes: bytes) -> dict:
        """Apply an OTA update (full or delta)."""
        # Verify payload integrity
        actual_hash = hashlib.sha256(payload_bytes).hexdigest()
        if actual_hash != manifest.payload_hash:
            return {"success": False,
                    "error": "Payload hash mismatch"}

        if manifest.update_type == "delta":
            return self._apply_delta(manifest, payload_bytes)
        else:
            return self._apply_full(manifest, payload_bytes)

    def _apply_delta(self, manifest: UpdateManifest,
                     patch_bytes: bytes) -> dict:
        """Apply a delta patch to current model."""
        try:
            import bsdiff4
        except ImportError:
            return {"success": False, "error": "bsdiff4 not available"}

        # Read current model
        current_path = self.slots.active_slot_path / "model.bin"
        if not current_path.exists():
            return {"success": False, "error": "No current model for delta"}

        current_bytes = current_path.read_bytes()
        current_hash = hashlib.sha256(current_bytes).hexdigest()

        if current_hash != manifest.from_hash:
            return {"success": False,
                    "error": f"Base hash mismatch: {current_hash[:16]}"}

        # Apply patch
        new_bytes = bsdiff4.patch(current_bytes, patch_bytes)

        # Install to inactive slot
        if self.slots.install_to_inactive(
            new_bytes, manifest.to_version, manifest.to_hash
        ):
            self.slots.swap()
            return {"success": True, "slot": self.slots.active}
        else:
            return {"success": False, "error": "Installation failed"}

    def _apply_full(self, manifest: UpdateManifest,
                    model_bytes: bytes) -> dict:
        """Apply a full model replacement."""
        if self.slots.install_to_inactive(
            model_bytes, manifest.to_version, manifest.to_hash
        ):
            self.slots.swap()
            return {"success": True, "slot": self.slots.active}
        else:
            return {"success": False, "error": "Installation failed"}


# ── Usage ──
if __name__ == "__main__":
    # Server-side: generate delta patch
    # patcher = DeltaPatchGenerator()
    # result = patcher.generate_patch("model_v1.bin", "model_v2.bin", "patch_v1_v2.bin")
    # print(f"Patch compression: {result['compression_pct']}%")

    # Device-side: apply update
    # slots = ABSlotManager("/opt/models")
    # client = OTAClient(slots)
    # result = client.apply_update(manifest, patch_bytes)

    print("OTA system ready")`
        },

        // ── 3.2 Update Server ──
        {
          title: "OTA Update Server (FastAPI)",
          lang: "python",
          filename: "ota_server.py",
          desc: "Server-side update management: serves manifests, generates deltas on-demand, tracks device update status, and manages staged rollouts.",
          code: `"""
OTA Update Server — manages model updates for edge fleet.
Serves update manifests, delta patches, and tracks rollout status.
"""
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
import hashlib
from pathlib import Path


app = FastAPI(title="Edge ML OTA Server")


# ── Data Models ──

class DeviceCheckin(BaseModel):
    device_id: str
    hardware_class: str
    current_model_version: str
    current_model_hash: str
    battery_pct: int = 100
    on_wifi: bool = False
    os_version: str = ""


class UpdateResponse(BaseModel):
    update_available: bool
    manifest: Optional[dict] = None
    message: str = ""


class RolloutStatus(BaseModel):
    model_version: str
    stage: str                  # canary, staged_5, staged_25, full
    target_hardware: str
    updated_count: int
    total_count: int
    health_status: str          # healthy, degraded, rolled_back


# ── In-memory state (use DB in production) ──
ACTIVE_ROLLOUTS = {}
DEVICE_STATE = {}
MODEL_ARTIFACTS = {}  # version -> {target -> artifact_path}


# ── Endpoints ──

@app.post("/api/v1/checkin", response_model=UpdateResponse)
async def device_checkin(checkin: DeviceCheckin):
    """
    Device check-in endpoint. Called periodically by edge devices.
    Returns update manifest if an update is available for this device.
    """
    # Record device state
    DEVICE_STATE[checkin.device_id] = checkin.dict()

    # Find applicable rollout for this device's hardware class
    rollout = _find_active_rollout(checkin.hardware_class)
    if not rollout:
        return UpdateResponse(update_available=False,
                              message="No updates available")

    # Check if device is in rollout group
    if not _device_in_rollout_group(checkin.device_id, rollout):
        return UpdateResponse(update_available=False,
                              message="Device not in rollout group")

    # Check if device already has the target version
    if checkin.current_model_version == rollout["target_version"]:
        return UpdateResponse(update_available=False,
                              message="Already on target version")

    # Generate manifest
    target_artifact = _get_artifact(
        rollout["target_version"], checkin.hardware_class)

    if not target_artifact:
        return UpdateResponse(update_available=False,
                              message="No artifact for hardware class")

    # Try delta update first
    can_delta = (checkin.current_model_hash ==
                 _get_model_hash(checkin.current_model_version,
                                 checkin.hardware_class))

    manifest = {
        "model_name": rollout["model_name"],
        "from_version": checkin.current_model_version,
        "to_version": rollout["target_version"],
        "update_type": "delta" if can_delta else "full",
        "payload_url": f"/api/v1/download/{rollout['target_version']}"
                       f"/{checkin.hardware_class}"
                       f"/{'delta' if can_delta else 'full'}",
        "payload_size_bytes": target_artifact["size"],
        "payload_hash": target_artifact["hash"],
        "to_hash": target_artifact["model_hash"],
        "from_hash": checkin.current_model_hash if can_delta else "",
        "require_wifi": target_artifact["size"] > 10_000_000,  # >10MB
        "min_battery_pct": 20,
        "priority": rollout.get("priority", "normal"),
    }

    return UpdateResponse(update_available=True, manifest=manifest)


@app.post("/api/v1/update-status")
async def report_update_status(device_id: str, version: str,
                                success: bool, error: str = ""):
    """Device reports update result."""
    if device_id in DEVICE_STATE:
        if success:
            DEVICE_STATE[device_id]["current_model_version"] = version
        else:
            print(f"Update failed on {device_id}: {error}")
    return {"acknowledged": True}


@app.get("/api/v1/rollout/{rollout_id}/status")
async def get_rollout_status(rollout_id: str):
    """Get current rollout status."""
    if rollout_id not in ACTIVE_ROLLOUTS:
        raise HTTPException(404, "Rollout not found")
    return ACTIVE_ROLLOUTS[rollout_id]


# ── Helpers ──

def _find_active_rollout(hardware_class: str) -> Optional[dict]:
    for rollout in ACTIVE_ROLLOUTS.values():
        if rollout.get("hardware_class") == hardware_class:
            if rollout.get("status") in ("active", "canary"):
                return rollout
    return None

def _device_in_rollout_group(device_id: str, rollout: dict) -> bool:
    # Hash-based deterministic group assignment
    group_hash = hashlib.md5(
        f"{device_id}:{rollout['id']}".encode()
    ).hexdigest()
    pct = int(group_hash[:4], 16) / 0xFFFF * 100
    return pct <= rollout.get("rollout_pct", 0)

def _get_artifact(version: str, hardware_class: str) -> Optional[dict]:
    return MODEL_ARTIFACTS.get(version, {}).get(hardware_class)

def _get_model_hash(version: str, hardware_class: str) -> str:
    artifact = _get_artifact(version, hardware_class)
    return artifact["model_hash"] if artifact else ""


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)`
        },
      ],
    },


    // ──────────────────────────────────────────────────────────
    // Section 4: Fleet Monitoring & Drift Detection
    // ──────────────────────────────────────────────────────────
    {
      id: "fleet-monitoring-drift",
      title: "Fleet Monitoring & Drift Detection",
      icon: "📊",
      items: [

        // ── 4.1 On-Device Telemetry Agent ──
        {
          title: "On-Device Telemetry Agent",
          lang: "python",
          filename: "device_telemetry_agent.py",
          desc: "Lightweight telemetry agent that runs alongside the inference engine. Collects latency, confidence, and input statistics with minimal overhead, then reports periodically.",
          code: `"""
Edge Telemetry Agent — lightweight, runs alongside inference.
Collects aggregated stats with <1% CPU overhead.
Reports to central monitoring on a configurable interval.
"""
import time
import json
import threading
import numpy as np
from collections import deque
from dataclasses import dataclass, field, asdict
from urllib.request import Request, urlopen
from urllib.error import URLError


@dataclass
class InferenceRecord:
    """Single inference result — stored in memory ring buffer."""
    latency_ms: float
    confidence: float
    predicted_class: str
    input_mean: float = 0.0
    input_std: float = 0.0
    timestamp: float = 0.0


@dataclass
class TelemetryReport:
    """Aggregated telemetry for one reporting window."""
    device_id: str
    hardware_class: str
    model_version: str
    window_start: float
    window_end: float
    inference_count: int

    # Latency
    latency_p50_ms: float = 0
    latency_p95_ms: float = 0
    latency_p99_ms: float = 0
    latency_mean_ms: float = 0

    # Confidence
    confidence_mean: float = 0
    confidence_std: float = 0
    low_confidence_pct: float = 0

    # Input distribution
    input_mean_avg: float = 0
    input_std_avg: float = 0

    # Predictions
    class_distribution: dict = field(default_factory=dict)

    # Errors
    error_count: int = 0
    oom_count: int = 0

    # System
    cpu_pct: float = 0
    memory_mb: float = 0
    temperature_c: float = 0


class TelemetryAgent:
    """
    Lightweight agent that collects inference telemetry.

    Usage:
        agent = TelemetryAgent(device_id="cam-042", ...)
        agent.start()

        # In inference loop:
        agent.record(latency_ms=12.3, confidence=0.92,
                     predicted_class="car", input_tensor=frame)

        # On shutdown:
        agent.stop()
    """

    def __init__(self, device_id: str, hardware_class: str,
                 model_version: str, report_url: str,
                 report_interval_sec: int = 300,
                 buffer_size: int = 50000,
                 confidence_threshold: float = 0.5):
        self.device_id = device_id
        self.hardware_class = hardware_class
        self.model_version = model_version
        self.report_url = report_url
        self.report_interval = report_interval_sec
        self.conf_threshold = confidence_threshold

        self._buffer = deque(maxlen=buffer_size)
        self._error_count = 0
        self._oom_count = 0
        self._window_start = time.time()
        self._lock = threading.Lock()
        self._running = False
        self._reporter_thread = None

    def start(self):
        """Start the background reporting thread."""
        self._running = True
        self._reporter_thread = threading.Thread(
            target=self._report_loop, daemon=True
        )
        self._reporter_thread.start()

    def stop(self):
        """Stop the agent and flush final report."""
        self._running = False
        if self._reporter_thread:
            self._reporter_thread.join(timeout=5)
        self._send_report()  # flush final window

    def record(self, latency_ms: float, confidence: float,
               predicted_class: str, input_tensor=None):
        """Record a single inference result. Thread-safe, <0.1ms overhead."""
        rec = InferenceRecord(
            latency_ms=latency_ms,
            confidence=confidence,
            predicted_class=predicted_class,
            timestamp=time.time(),
        )
        if input_tensor is not None:
            rec.input_mean = float(np.mean(input_tensor))
            rec.input_std = float(np.std(input_tensor))

        with self._lock:
            self._buffer.append(rec)

    def record_error(self, error_type: str = "error"):
        """Record an inference error."""
        with self._lock:
            if error_type == "oom":
                self._oom_count += 1
            else:
                self._error_count += 1

    def _report_loop(self):
        """Background thread: aggregate and send telemetry."""
        while self._running:
            time.sleep(self.report_interval)
            self._send_report()

    def _send_report(self):
        """Aggregate buffer into report and send to server."""
        with self._lock:
            if not self._buffer:
                return

            records = list(self._buffer)
            errors = self._error_count
            ooms = self._oom_count

            self._buffer.clear()
            self._error_count = 0
            self._oom_count = 0

        now = time.time()
        latencies = np.array([r.latency_ms for r in records])
        confidences = np.array([r.confidence for r in records])
        input_means = [r.input_mean for r in records if r.input_mean != 0]

        # Class distribution
        class_counts = {}
        for r in records:
            class_counts[r.predicted_class] = class_counts.get(
                r.predicted_class, 0) + 1
        total = len(records)
        class_dist = {k: round(v / total, 4) for k, v in class_counts.items()}

        low_conf = sum(1 for c in confidences if c < self.conf_threshold)

        report = TelemetryReport(
            device_id=self.device_id,
            hardware_class=self.hardware_class,
            model_version=self.model_version,
            window_start=self._window_start,
            window_end=now,
            inference_count=total,
            latency_p50_ms=float(np.percentile(latencies, 50)),
            latency_p95_ms=float(np.percentile(latencies, 95)),
            latency_p99_ms=float(np.percentile(latencies, 99)),
            latency_mean_ms=float(np.mean(latencies)),
            confidence_mean=float(np.mean(confidences)),
            confidence_std=float(np.std(confidences)),
            low_confidence_pct=round(low_conf / total * 100, 2),
            input_mean_avg=float(np.mean(input_means)) if input_means else 0,
            input_std_avg=float(np.std(input_means)) if input_means else 0,
            class_distribution=class_dist,
            error_count=errors,
            oom_count=ooms,
        )

        self._window_start = now

        # Send to monitoring server
        try:
            payload = json.dumps(asdict(report)).encode()
            req = Request(
                f"{self.report_url}/api/v1/telemetry",
                data=payload,
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            urlopen(req, timeout=10)
        except (URLError, OSError) as e:
            # Silently fail — don't disrupt inference for telemetry
            pass


# ── Usage Example ──
if __name__ == "__main__":
    agent = TelemetryAgent(
        device_id="cam-042",
        hardware_class="jetson-orin",
        model_version="yolov8n-v3",
        report_url="https://monitoring.example.com",
        report_interval_sec=60,  # report every minute
    )
    agent.start()

    # Simulate inference loop
    for i in range(100):
        latency = np.random.normal(25, 3)  # ~25ms avg
        confidence = np.random.beta(8, 2)  # high confidence
        classes = np.random.choice(["car", "truck", "person"],
                                   p=[0.6, 0.3, 0.1])
        agent.record(latency, confidence, classes)
        time.sleep(0.033)  # ~30 FPS

    agent.stop()
    print("Telemetry agent stopped")`
        },

        // ── 4.2 Drift Detection Pipeline ──
        {
          title: "Fleet-Wide Drift Detection Pipeline",
          lang: "python",
          filename: "fleet_drift_detector.py",
          desc: "Centralized drift detection that analyzes telemetry across the fleet. Detects confidence, prediction, and input drift per device group. Triggers alerts and retraining recommendations.",
          code: `"""
Fleet-wide drift detection pipeline.
Analyzes aggregated telemetry to detect model degradation
without ground truth labels.
"""
import numpy as np
from scipy import stats
from dataclasses import dataclass
from typing import Optional
from enum import Enum


class DriftSeverity(Enum):
    NONE = "none"
    LOW = "low"         # monitoring only
    MEDIUM = "medium"   # investigate
    HIGH = "high"       # halt rollout / trigger retraining
    CRITICAL = "critical"  # immediate rollback


@dataclass
class DriftAlert:
    """A drift detection alert."""
    device_group: str
    drift_type: str         # confidence, prediction, input, latency
    severity: DriftSeverity
    score: float
    threshold: float
    details: str
    recommendation: str


class FleetDriftDetector:
    """
    Analyze fleet telemetry for distribution shifts.
    Compares current windows against a baseline established at deployment.
    """

    def __init__(self, baseline: dict):
        """
        baseline = {
            "confidence": {"mean": 0.87, "std": 0.10, "histogram": [...]},
            "class_distribution": {"car": 0.60, "truck": 0.30, "person": 0.10},
            "input": {"mean": 128.5, "std": 42.0},
            "latency_p95": 25.0,
        }
        """
        self.baseline = baseline

    def analyze_group(self, group_id: str,
                      telemetry_windows: list[dict]) -> list[DriftAlert]:
        """
        Analyze telemetry from a device group for drift.
        telemetry_windows: list of TelemetryReport dicts from devices in group.
        """
        alerts = []

        # Aggregate across devices in group
        all_conf_means = [w["confidence_mean"] for w in telemetry_windows]
        all_conf_stds = [w["confidence_std"] for w in telemetry_windows]
        all_latencies = [w["latency_p95_ms"] for w in telemetry_windows]
        all_input_means = [w["input_mean_avg"] for w in telemetry_windows
                           if w.get("input_mean_avg")]

        # 1. Confidence drift
        conf_alert = self._check_confidence(group_id, all_conf_means)
        if conf_alert:
            alerts.append(conf_alert)

        # 2. Prediction distribution drift
        merged_dist = self._merge_class_distributions(
            [w["class_distribution"] for w in telemetry_windows]
        )
        pred_alert = self._check_prediction(group_id, merged_dist)
        if pred_alert:
            alerts.append(pred_alert)

        # 3. Input drift
        if all_input_means:
            input_alert = self._check_input(group_id, all_input_means)
            if input_alert:
                alerts.append(input_alert)

        # 4. Latency drift (not model drift, but operational)
        lat_alert = self._check_latency(group_id, all_latencies)
        if lat_alert:
            alerts.append(lat_alert)

        return alerts

    def _check_confidence(self, group: str,
                           conf_means: list[float]) -> Optional[DriftAlert]:
        """Detect confidence distribution shift."""
        current_mean = np.mean(conf_means)
        baseline_mean = self.baseline["confidence"]["mean"]
        baseline_std = self.baseline["confidence"]["std"]

        # Z-score of group mean vs baseline
        z = abs(current_mean - baseline_mean) / (baseline_std + 1e-8)
        drop_pct = (baseline_mean - current_mean) / baseline_mean * 100

        if z < 2:
            return None

        severity = DriftSeverity.LOW
        if drop_pct > 5:
            severity = DriftSeverity.MEDIUM
        if drop_pct > 10:
            severity = DriftSeverity.HIGH
        if drop_pct > 20:
            severity = DriftSeverity.CRITICAL

        return DriftAlert(
            device_group=group,
            drift_type="confidence",
            severity=severity,
            score=z,
            threshold=2.0,
            details=f"Confidence mean: {current_mean:.3f} "
                    f"(baseline: {baseline_mean:.3f}, "
                    f"drop: {drop_pct:.1f}%, z={z:.1f})",
            recommendation=(
                "Investigate data distribution. Possible causes: "
                "environment change (lighting, weather), sensor degradation, "
                "new object types. Consider retraining with recent data."
                if severity.value in ("high", "critical")
                else "Monitor closely."
            ),
        )

    def _check_prediction(self, group: str,
                           current_dist: dict) -> Optional[DriftAlert]:
        """Detect prediction distribution shift via JS divergence."""
        ref = self.baseline["class_distribution"]
        all_classes = sorted(set(list(ref.keys()) + list(current_dist.keys())))

        p = np.array([ref.get(c, 1e-10) for c in all_classes])
        q = np.array([current_dist.get(c, 1e-10) for c in all_classes])
        p, q = p / p.sum(), q / q.sum()

        m = 0.5 * (p + q)
        js = float(0.5 * (stats.entropy(p, m) + stats.entropy(q, m)))

        if js < 0.05:
            return None

        severity = DriftSeverity.LOW
        if js > 0.10:
            severity = DriftSeverity.MEDIUM
        if js > 0.20:
            severity = DriftSeverity.HIGH
        if js > 0.35:
            severity = DriftSeverity.CRITICAL

        # Find biggest distribution changes
        changes = {}
        for i, cls in enumerate(all_classes):
            change = q[i] - p[i]
            if abs(change) > 0.02:
                changes[cls] = f"{p[i]:.2%} -> {q[i]:.2%}"

        return DriftAlert(
            device_group=group,
            drift_type="prediction_distribution",
            severity=severity,
            score=js,
            threshold=0.05,
            details=f"JS divergence: {js:.4f}. Changes: {changes}",
            recommendation=(
                "Prediction distribution shifted significantly. "
                "Check for environment changes or new object categories."
            ),
        )

    def _check_input(self, group: str,
                      input_means: list[float]) -> Optional[DriftAlert]:
        """Detect input distribution shift."""
        current = np.mean(input_means)
        ref_mean = self.baseline["input"]["mean"]
        ref_std = self.baseline["input"]["std"]

        z = abs(current - ref_mean) / (ref_std + 1e-8)

        if z < 3:
            return None

        return DriftAlert(
            device_group=group,
            drift_type="input_distribution",
            severity=DriftSeverity.MEDIUM if z < 5 else DriftSeverity.HIGH,
            score=z,
            threshold=3.0,
            details=f"Input mean: {current:.1f} (baseline: {ref_mean:.1f}), "
                    f"z={z:.1f}",
            recommendation="Input distribution shifted. Check sensors, "
                           "camera settings, or environmental conditions.",
        )

    def _check_latency(self, group: str,
                        latencies: list[float]) -> Optional[DriftAlert]:
        """Detect latency regression."""
        current_p95 = np.percentile(latencies, 95)
        baseline_p95 = self.baseline["latency_p95"]

        increase_pct = (current_p95 - baseline_p95) / baseline_p95 * 100

        if increase_pct < 15:
            return None

        return DriftAlert(
            device_group=group,
            drift_type="latency",
            severity=DriftSeverity.HIGH if increase_pct > 30
                     else DriftSeverity.MEDIUM,
            score=increase_pct,
            threshold=15.0,
            details=f"Latency P95: {current_p95:.1f}ms "
                    f"(baseline: {baseline_p95:.1f}ms, "
                    f"+{increase_pct:.1f}%)",
            recommendation="Latency regression detected. Check thermal "
                           "throttling, background processes, or model update.",
        )

    @staticmethod
    def _merge_class_distributions(distributions: list[dict]) -> dict:
        """Merge class distributions from multiple devices."""
        merged = {}
        for dist in distributions:
            for cls, pct in dist.items():
                merged[cls] = merged.get(cls, 0) + pct
        # Normalize
        total = sum(merged.values()) or 1
        return {k: v / total for k, v in merged.items()}


# ── Usage ──
if __name__ == "__main__":
    # Establish baseline at deployment time
    baseline = {
        "confidence": {"mean": 0.87, "std": 0.10},
        "class_distribution": {"car": 0.60, "truck": 0.30, "person": 0.10},
        "input": {"mean": 128.5, "std": 42.0},
        "latency_p95": 25.0,
    }

    detector = FleetDriftDetector(baseline)

    # Simulate telemetry from 10 devices
    telemetry = [
        {
            "confidence_mean": 0.72,    # dropped from 0.87!
            "confidence_std": 0.15,
            "latency_p95_ms": 27.0,
            "input_mean_avg": 115.0,    # shifted from 128.5
            "class_distribution": {"car": 0.45, "truck": 0.35, "person": 0.20},
        }
        for _ in range(10)
    ]

    alerts = detector.analyze_group("production-orin", telemetry)
    for alert in alerts:
        print(f"[{alert.severity.value.upper()}] {alert.drift_type}: "
              f"{alert.details}")
        print(f"  -> {alert.recommendation}")
        print()`
        },
      ],
    },


    // ──────────────────────────────────────────────────────────
    // Section 5: Deterministic Builds & Model Security
    // ──────────────────────────────────────────────────────────
    {
      id: "deterministic-builds-security",
      title: "Deterministic Builds & Model Security",
      icon: "🔐",
      items: [

        // ── 5.1 Reproducible Build Pipeline ──
        {
          title: "Reproducible Build Verification",
          lang: "python",
          filename: "reproducible_build.py",
          desc: "Verify that model compilations are deterministic: compile twice with identical inputs, compare output hashes. Detects non-determinism sources and reports them.",
          code: `"""
Reproducible Build Verification
Compiles a model twice and verifies bit-identical output.
"""
import hashlib
import json
import os
import subprocess
import tempfile
from pathlib import Path


class ReproducibleBuildVerifier:
    """
    Verify that model compilation is deterministic.
    Compiles the same model twice and checks for identical output.
    """

    # Environment that enforces determinism
    DETERMINISM_ENV = {
        "SOURCE_DATE_EPOCH": "0",
        "PYTHONHASHSEED": "42",
        "TVM_NUM_THREADS": "1",
        "OMP_NUM_THREADS": "1",
        "MKL_NUM_THREADS": "1",
        "TF_DETERMINISTIC_OPS": "1",
        "CUBLAS_WORKSPACE_CONFIG": ":4096:8",
        "TF_CUDNN_DETERMINISTIC": "1",
    }

    def __init__(self, compile_script: str):
        self.compile_script = compile_script

    def verify(self, model_path: str, target: str,
               compiler: str, config: dict) -> dict:
        """
        Compile twice and compare outputs.

        Returns: {
            "deterministic": bool,
            "hash_a": str,
            "hash_b": str,
            "details": str,
        }
        """
        with tempfile.TemporaryDirectory() as tmpdir:
            out_a = Path(tmpdir) / "build_a"
            out_b = Path(tmpdir) / "build_b"
            out_a.mkdir()
            out_b.mkdir()

            # Build A
            self._compile(model_path, target, compiler, config, str(out_a))
            hash_a = self._hash_directory(str(out_a))

            # Build B (identical inputs)
            self._compile(model_path, target, compiler, config, str(out_b))
            hash_b = self._hash_directory(str(out_b))

            is_deterministic = hash_a == hash_b

            details = ""
            if not is_deterministic:
                details = self._find_differences(str(out_a), str(out_b))

            return {
                "deterministic": is_deterministic,
                "hash_a": hash_a,
                "hash_b": hash_b,
                "details": details,
            }

    def _compile(self, model_path, target, compiler, config, output_dir):
        """Run compilation with deterministic environment."""
        env = os.environ.copy()
        env.update(self.DETERMINISM_ENV)

        cmd = [
            "python", self.compile_script,
            "--model", model_path,
            "--target", target,
            "--compiler", compiler,
            "--config", json.dumps(config),
            "--output", output_dir,
        ]

        result = subprocess.run(cmd, env=env, capture_output=True, text=True)
        if result.returncode != 0:
            raise RuntimeError(f"Compilation failed: {result.stderr}")

    def _hash_directory(self, dir_path: str) -> str:
        """Hash all files in directory for comparison."""
        h = hashlib.sha256()
        for path in sorted(Path(dir_path).rglob("*")):
            if path.is_file():
                h.update(path.name.encode())
                h.update(path.read_bytes())
        return h.hexdigest()

    def _find_differences(self, dir_a: str, dir_b: str) -> str:
        """Find which files differ between two builds."""
        files_a = {p.relative_to(dir_a): p for p in Path(dir_a).rglob("*")
                   if p.is_file()}
        files_b = {p.relative_to(dir_b): p for p in Path(dir_b).rglob("*")
                   if p.is_file()}

        diffs = []

        # Files in A but not B
        for f in files_a.keys() - files_b.keys():
            diffs.append(f"Only in build A: {f}")

        # Files in B but not A
        for f in files_b.keys() - files_a.keys():
            diffs.append(f"Only in build B: {f}")

        # Files that differ
        for f in files_a.keys() & files_b.keys():
            ha = hashlib.sha256(files_a[f].read_bytes()).hexdigest()
            hb = hashlib.sha256(files_b[f].read_bytes()).hexdigest()
            if ha != hb:
                size_a = files_a[f].stat().st_size
                size_b = files_b[f].stat().st_size
                diffs.append(f"Differs: {f} "
                             f"(A: {ha[:8]} {size_a}B, "
                             f"B: {hb[:8]} {size_b}B)")

        return "\\n".join(diffs) if diffs else "No differences found"


# ── Usage ──
if __name__ == "__main__":
    verifier = ReproducibleBuildVerifier("scripts/compile_model.py")

    # result = verifier.verify(
    #     model_path="exported/model.onnx",
    #     target="cortex-a78-arm64",
    #     compiler="tvm",
    #     config={"opt_level": 3, "quantization": "int8"},
    # )
    # if result["deterministic"]:
    #     print(f"Build is deterministic: {result['hash_a'][:16]}")
    # else:
    #     print(f"NON-DETERMINISTIC BUILD DETECTED!")
    #     print(f"Build A: {result['hash_a'][:16]}")
    #     print(f"Build B: {result['hash_b'][:16]}")
    #     print(f"Differences:\\n{result['details']}")

    print("Reproducible build verifier ready")`
        },

        // ── 5.2 Model Signing ──
        {
          title: "End-to-End Model Signing & Verification",
          lang: "python",
          filename: "model_security.py",
          desc: "Complete model signing pipeline: generate signing keys, sign artifacts in CI, verify on device before loading. Uses Ed25519 for fast, compact signatures.",
          code: `"""
Model Signing & Verification for Secure Edge Deployment
- CI signs artifacts with Ed25519 private key
- Devices verify with embedded public key before loading
"""
import hashlib
import json
from pathlib import Path
from datetime import datetime


def generate_keypair(output_dir: str = ".keys"):
    """Generate Ed25519 signing keypair (run once, store securely)."""
    from cryptography.hazmat.primitives.asymmetric.ed25519 import (
        Ed25519PrivateKey,
    )
    from cryptography.hazmat.primitives import serialization

    private_key = Ed25519PrivateKey.generate()
    public_key = private_key.public_key()

    out = Path(output_dir)
    out.mkdir(exist_ok=True)

    # Private key (store in CI secrets, NEVER in repo)
    with open(out / "signing_key.pem", "wb") as f:
        f.write(private_key.private_bytes(
            serialization.Encoding.PEM,
            serialization.PrivateFormat.PKCS8,
            serialization.NoEncryption(),
        ))

    # Public key (embed in device firmware)
    with open(out / "verify_key.pem", "wb") as f:
        f.write(public_key.public_bytes(
            serialization.Encoding.PEM,
            serialization.PublicFormat.SubjectPublicKeyInfo,
        ))

    print(f"Keys generated in {out}/")
    print(f"  Private: signing_key.pem (keep in CI secrets)")
    print(f"  Public:  verify_key.pem (embed in device firmware)")


class ArtifactSigner:
    """Sign model artifacts in CI pipeline."""

    def __init__(self, private_key_path: str):
        from cryptography.hazmat.primitives import serialization
        with open(private_key_path, "rb") as f:
            self._key = serialization.load_pem_private_key(f.read(), None)

    def sign(self, artifact_path: str, metadata: dict) -> dict:
        """
        Sign an artifact. Returns a signed manifest.
        The manifest is stored alongside the artifact and
        transmitted to the device with the OTA update.
        """
        artifact_hash = _hash_file(artifact_path)
        artifact_size = Path(artifact_path).stat().st_size

        # Canonical payload (deterministic JSON)
        payload = json.dumps({
            "artifact_hash": artifact_hash,
            "artifact_size": artifact_size,
            "metadata": metadata,
            "signed_at": datetime.utcnow().isoformat(),
        }, sort_keys=True)

        signature = self._key.sign(payload.encode())

        manifest = {
            "payload": payload,
            "signature": signature.hex(),
            "algorithm": "Ed25519",
            "key_id": "production-signing-key-v1",
        }

        # Write manifest alongside artifact
        manifest_path = artifact_path + ".manifest.json"
        with open(manifest_path, "w") as f:
            json.dump(manifest, f, indent=2)

        return manifest


class ArtifactVerifier:
    """Verify signed artifacts on edge devices."""

    def __init__(self, public_key_path: str):
        from cryptography.hazmat.primitives import serialization
        with open(public_key_path, "rb") as f:
            self._key = serialization.load_pem_public_key(f.read())

    def verify(self, artifact_path: str, manifest: dict) -> dict:
        """
        Verify artifact integrity and authenticity.
        Call this BEFORE loading any model into the inference engine.

        Returns: {"valid": bool, "checks": {...}, "error": str}
        """
        checks = {
            "hash_match": False,
            "signature_valid": False,
            "size_match": False,
        }

        # 1. Hash check
        actual_hash = _hash_file(artifact_path)
        payload_data = json.loads(manifest["payload"])
        expected_hash = payload_data["artifact_hash"]
        checks["hash_match"] = (actual_hash == expected_hash)

        if not checks["hash_match"]:
            return {
                "valid": False, "checks": checks,
                "error": f"Hash mismatch: {actual_hash[:16]} "
                         f"!= {expected_hash[:16]}"
            }

        # 2. Size check
        actual_size = Path(artifact_path).stat().st_size
        expected_size = payload_data["artifact_size"]
        checks["size_match"] = (actual_size == expected_size)

        if not checks["size_match"]:
            return {
                "valid": False, "checks": checks,
                "error": f"Size mismatch: {actual_size} != {expected_size}"
            }

        # 3. Signature check
        try:
            sig_bytes = bytes.fromhex(manifest["signature"])
            self._key.verify(sig_bytes, manifest["payload"].encode())
            checks["signature_valid"] = True
        except Exception as e:
            return {
                "valid": False, "checks": checks,
                "error": f"Signature invalid: {e}"
            }

        return {"valid": True, "checks": checks, "error": None}


def _hash_file(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


class SecureModelLoader:
    """Secure model loading with signature verification."""

    def __init__(self, verifier: ArtifactVerifier):
        self.verifier = verifier

    def load(self, model_path: str, manifest_path: str):
        """
        Securely load a model: verify first, then load.

        Raises SecurityError if verification fails.
        """
        with open(manifest_path) as f:
            manifest = json.load(f)

        result = self.verifier.verify(model_path, manifest)

        if not result["valid"]:
            raise SecurityError(
                f"Model verification failed: {result['error']}. "
                f"Refusing to load potentially tampered artifact."
            )

        print(f"Model verified: {model_path}")
        print(f"  Hash: {json.loads(manifest['payload'])['artifact_hash'][:16]}...")
        print(f"  Signed at: {json.loads(manifest['payload'])['signed_at']}")

        # Now safe to load into inference engine
        # return inference_engine.load(model_path)
        return model_path


class SecurityError(Exception):
    pass


# ── Usage ──
if __name__ == "__main__":
    # One-time: generate keys
    # generate_keypair()

    # CI pipeline: sign artifact
    # signer = ArtifactSigner(".keys/signing_key.pem")
    # manifest = signer.sign("compiled/model_jetson_int8.engine", {
    #     "model": "yolov8n", "version": "v3",
    #     "target": "jetson-orin", "compiler": "tensorrt-8.6",
    # })

    # Edge device: verify and load
    # verifier = ArtifactVerifier("/etc/ml-keys/verify_key.pem")
    # loader = SecureModelLoader(verifier)
    # model = loader.load("model.engine", "model.engine.manifest.json")

    print("Model security system ready")`
        },
      ],
    },


    // ──────────────────────────────────────────────────────────
    // Section 6: End-to-End Pipeline Integration
    // ──────────────────────────────────────────────────────────
    {
      id: "e2e-pipeline-integration",
      title: "End-to-End Pipeline Integration",
      icon: "🔗",
      items: [

        // ── 6.1 Full Pipeline Orchestrator ──
        {
          title: "Full Pipeline: Train → Compile → Test → Deploy → Monitor",
          lang: "python",
          filename: "pipeline_orchestrator.py",
          desc: "Orchestrator that ties all components together: triggers compilation on new training runs, runs benchmarks, gates deployment, manages rollouts, and monitors drift. The glue code that makes everything work as a system.",
          code: `"""
Edge ML Pipeline Orchestrator
Ties together: registry, compilation, benchmarking,
deployment, and monitoring into an automated pipeline.
"""
from dataclasses import dataclass
from enum import Enum
from typing import Optional
import json


class PipelineStage(Enum):
    EXPORT = "export"
    COMPILE = "compile"
    BENCHMARK = "benchmark"
    GATE = "gate"
    REGISTER = "register"
    DEPLOY = "deploy"
    MONITOR = "monitor"


@dataclass
class PipelineConfig:
    """Configuration for the full edge ML pipeline."""
    model_family: str
    targets: list[str]                     # ["jetson-orin", "cortex-a78"]
    compilers: dict                        # target -> compiler config
    quantizations: dict                    # target -> quantization level
    benchmark_suite: str                   # path to benchmark config
    deployment_config: dict                # rollout stages, thresholds
    monitoring_baseline: dict              # drift detection baseline


class EdgeMLPipeline:
    """
    Orchestrates the full lifecycle of edge ML models.

    Typical flow:
    1. New training run completes → triggers pipeline
    2. Export to ONNX + generate golden references
    3. Cross-compile for all targets (parallel)
    4. Benchmark on real hardware (parallel per target)
    5. Gate: check regression thresholds
    6. Register artifacts in model registry
    7. Deploy via staged rollout
    8. Monitor for drift and regressions
    """

    def __init__(self, config: PipelineConfig, registry, compiler,
                 benchmarker, deployer, monitor):
        self.config = config
        self.registry = registry
        self.compiler = compiler
        self.benchmarker = benchmarker
        self.deployer = deployer
        self.monitor = monitor

    def run(self, training_run_id: str, checkpoint_path: str) -> dict:
        """Execute the full pipeline for a new training run."""
        result = {
            "training_run": training_run_id,
            "stages": {},
            "status": "running",
        }

        try:
            # 1. Export
            print(f"[1/7] Exporting {self.config.model_family}...")
            onnx_path, golden_dir = self._export(checkpoint_path)
            result["stages"]["export"] = {"status": "pass", "onnx": onnx_path}

            # 2. Compile for all targets
            print(f"[2/7] Compiling for {len(self.config.targets)} targets...")
            artifacts = {}
            for target in self.config.targets:
                compiler_cfg = self.config.compilers[target]
                quant = self.config.quantizations.get(target, "fp32")

                artifact_path = self.compiler.compile(
                    onnx_path, target, compiler_cfg["name"],
                    {"quantization": quant, **compiler_cfg.get("flags", {})}
                )
                artifacts[target] = artifact_path

                # Validate golden references
                self._validate_golden(artifact_path, golden_dir, quant)

            result["stages"]["compile"] = {
                "status": "pass",
                "targets": list(artifacts.keys()),
            }

            # 3. Benchmark on real hardware
            print(f"[3/7] Benchmarking...")
            benchmarks = {}
            for target, artifact_path in artifacts.items():
                bench = self.benchmarker.run(
                    artifact_path, target, self.config.benchmark_suite
                )
                benchmarks[target] = bench
            result["stages"]["benchmark"] = benchmarks

            # 4. Gate: check regression thresholds
            print(f"[4/7] Checking regression gates...")
            gate_result = self._check_gates(benchmarks)
            result["stages"]["gate"] = gate_result

            if not gate_result["pass"]:
                result["status"] = "gated"
                print(f"GATED: {gate_result['reason']}")
                return result

            # 5. Register
            print(f"[5/7] Registering artifacts...")
            version_id = f"{self.config.model_family}-{training_run_id[:8]}"
            self.registry.register_version(
                version_id=version_id,
                model_family=self.config.model_family,
                source_framework="pytorch",
                training_run_id=training_run_id,
                dataset_version="latest",
                onnx_path=onnx_path,
            )

            for target, artifact_path in artifacts.items():
                artifact_id = self.registry.register_artifact(
                    version_id, artifact_path, target,
                    self.config.compilers[target]["name"],
                    self.config.compilers[target].get("version", "latest"),
                    self.config.quantizations.get(target, "fp32"),
                )
                bench = benchmarks[target]
                self.registry.record_benchmark(
                    artifact_id, **bench
                )

            result["stages"]["register"] = {
                "status": "pass", "version_id": version_id
            }

            # 6. Deploy (staged rollout)
            print(f"[6/7] Starting staged rollout...")
            rollout_id = self.deployer.start_rollout(
                version_id,
                self.config.deployment_config,
            )
            result["stages"]["deploy"] = {
                "status": "rolling_out",
                "rollout_id": rollout_id,
            }

            # 7. Monitor (async — continues after pipeline returns)
            print(f"[7/7] Monitoring enabled for rollout {rollout_id}")
            self.monitor.watch_rollout(
                rollout_id,
                baseline=self.config.monitoring_baseline,
                auto_rollback=True,
            )
            result["stages"]["monitor"] = {"status": "watching"}

            result["status"] = "deployed"

        except Exception as e:
            result["status"] = "failed"
            result["error"] = str(e)

        return result

    def _export(self, checkpoint_path: str) -> tuple[str, str]:
        """Export checkpoint to ONNX and generate golden refs."""
        # In production: use export script
        onnx_path = checkpoint_path.replace(".pt", ".onnx")
        golden_dir = checkpoint_path.replace(".pt", "_golden/")
        return onnx_path, golden_dir

    def _validate_golden(self, artifact_path, golden_dir, quantization):
        """Validate compiled artifact against golden references."""
        # In production: run golden reference validator
        pass

    def _check_gates(self, benchmarks: dict) -> dict:
        """Check if benchmarks pass deployment gates."""
        gates = self.config.deployment_config.get("gates", {})
        failures = []

        for target, bench in benchmarks.items():
            target_gates = gates.get(target, gates.get("default", {}))

            if "max_latency_p95_ms" in target_gates:
                if bench.get("latency_p95_ms", 0) > target_gates["max_latency_p95_ms"]:
                    failures.append(
                        f"{target}: latency P95 {bench['latency_p95_ms']:.1f}ms "
                        f"> {target_gates['max_latency_p95_ms']}ms"
                    )

            if "min_accuracy" in target_gates:
                if bench.get("accuracy", 0) < target_gates["min_accuracy"]:
                    failures.append(
                        f"{target}: accuracy {bench['accuracy']:.3f} "
                        f"< {target_gates['min_accuracy']}"
                    )

        return {
            "pass": len(failures) == 0,
            "reason": "; ".join(failures) if failures else "All gates passed",
        }


# ── Configuration Example ──
EXAMPLE_CONFIG = PipelineConfig(
    model_family="yolov8-nano",
    targets=["jetson-orin", "cortex-a78", "x86-avx512"],
    compilers={
        "jetson-orin": {"name": "tensorrt", "version": "8.6.1"},
        "cortex-a78": {"name": "tflite", "version": "2.15.0"},
        "x86-avx512": {"name": "tvm", "version": "0.15.0"},
    },
    quantizations={
        "jetson-orin": "int8",
        "cortex-a78": "int8",
        "x86-avx512": "fp32",
    },
    benchmark_suite="configs/benchmark_suite.yaml",
    deployment_config={
        "stages": [
            {"name": "canary", "pct": 1, "hold_hours": 4},
            {"name": "staged", "pct": 25, "hold_hours": 24},
            {"name": "full",   "pct": 100, "hold_hours": 0},
        ],
        "gates": {
            "jetson-orin": {"max_latency_p95_ms": 30, "min_accuracy": 0.80},
            "cortex-a78": {"max_latency_p95_ms": 50, "min_accuracy": 0.78},
            "default": {"max_latency_p95_ms": 100, "min_accuracy": 0.75},
        },
    },
    monitoring_baseline={
        "confidence": {"mean": 0.87, "std": 0.10},
        "class_distribution": {"car": 0.60, "truck": 0.30, "person": 0.10},
        "input": {"mean": 128.5, "std": 42.0},
        "latency_p95": 25.0,
    },
)


if __name__ == "__main__":
    print("Pipeline configuration:")
    print(f"  Model: {EXAMPLE_CONFIG.model_family}")
    print(f"  Targets: {EXAMPLE_CONFIG.targets}")
    print(f"  Gates: {json.dumps(EXAMPLE_CONFIG.deployment_config['gates'], indent=4)}")
    print("\\nReady to orchestrate edge ML pipeline")`
        },
      ],
    },

  ];
})();
