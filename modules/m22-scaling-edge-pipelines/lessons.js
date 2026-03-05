// Patches the Scaling Edge ML Pipelines & Multi-Platform CI/CD module (m22) with full tutorial lesson content.
// Loaded after curriculum.js. m22 = CURRICULUM.phases[5].modules[6]
(function patchScalingEdgePipelinesLessons() {
  const m = CURRICULUM.phases[5].modules[6]; // phase-6 (index 5), seventh module (m22)

  m.lessons = [

    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 1 — Model Registry & Artifact Management for Edge
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "model-registry-edge",
      title: "Model Registry & Artifact Management for Edge",
      readTime: "18 min",
      content: [
        {
          type: "text",
          text: "Edge ML deployment introduces a problem that cloud-only teams never face: the same model needs to exist as multiple compiled artifacts, one per hardware target. A single YOLOv8-nano model might ship as a TFLite FlatBuffer for Cortex-A CPUs, a TensorRT engine for Jetson Orin, a compiled TVM module for Qualcomm Hexagon DSP, and a Core ML package for Apple Neural Engine. Each artifact has different latency, accuracy, and memory characteristics. Without a disciplined registry, teams drown in a combinatorial explosion of model versions times hardware targets times compiler versions."
        },
        {
          type: "callout",
          variant: "warning",
          title: "The Artifact Explosion Problem",
          text: "With 10 model versions, 5 hardware targets, and 3 compiler versions, you have 150 artifacts to track. Add quantization variants (FP16, INT8, INT4) and it becomes 450+. Manual management is impossible — you need automation from day one."
        },

        // ── Section 1: Why Edge Needs a Different Registry ──
        {
          type: "heading",
          text: "Why Edge Needs a Different Registry"
        },
        {
          type: "text",
          text: "Traditional ML registries (MLflow, Weights & Biases) track a model as a single artifact — a saved checkpoint or exported ONNX file. Edge deployment breaks this assumption. A model in the registry is not one file but a family of artifacts: the source checkpoint, the exported ONNX, and N compiled binaries (one per target). Each compiled binary has its own metadata: target hardware, compiler version, optimization flags, benchmark results (latency P50/P95/P99, accuracy, memory peak, power draw), and a cryptographic hash for integrity verification."
        },
        {
          type: "text",
          text: "The registry must answer questions that cloud registries cannot: 'What is the fastest INT8 model for Jetson Orin that still meets 85% mAP?' or 'Which compiler version produced the artifact currently running on fleet group A?' or 'Show me all artifacts affected by the TVM 0.15 regression.' These queries require structured metadata, not just file storage."
        },
        {
          type: "comparison",
          headers: ["Dimension", "Cloud Model Registry", "Edge Model Registry"],
          rows: [
            ["Artifacts per model", "1 (checkpoint or container)", "N (one per hardware target × quantization level)"],
            ["Key metadata", "Accuracy, training params", "Latency per target, memory, power, compiler version"],
            ["Deployment target", "Uniform (Kubernetes pods)", "Heterogeneous (ARM, NPU, DSP, MCU)"],
            ["Rollback scope", "Single service", "Per device group, per hardware class"],
            ["Size constraints", "Minimal (cloud storage)", "Critical (OTA bandwidth, device flash)"],
          ]
        },

        // ── Section 2: Registry Architecture ──
        {
          type: "heading",
          text: "Registry Architecture"
        },
        {
          type: "text",
          text: "A production edge model registry has three layers: (1) a metadata store (PostgreSQL or a purpose-built service) that tracks model families, versions, target mappings, and benchmark results; (2) an artifact store (S3, GCS, or MinIO) that holds the actual compiled binaries with content-addressable storage; and (3) a lineage graph that connects each artifact back to its source checkpoint, training dataset version, compiler version, and optimization configuration."
        },
        {
          type: "code",
          lang: "python",
          filename: "registry_schema.py",
          code: `"""
Edge model registry schema — core data model.
"""
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional


class HardwareTarget(Enum):
    JETSON_ORIN = "jetson-orin"
    CORTEX_A78 = "cortex-a78"
    QUALCOMM_HEXAGON = "qualcomm-hexagon"
    APPLE_ANE = "apple-ane"
    INTEL_MOVIDIUS = "intel-movidius"
    HAILO_8 = "hailo-8"


class QuantizationLevel(Enum):
    FP32 = "fp32"
    FP16 = "fp16"
    INT8 = "int8"
    INT4 = "int4"


@dataclass
class BenchmarkResult:
    """Benchmark results for a single artifact on target hardware."""
    latency_p50_ms: float
    latency_p95_ms: float
    latency_p99_ms: float
    accuracy_metric: float          # mAP, top-1, etc.
    accuracy_metric_name: str       # "mAP@0.5", "top1_acc", etc.
    memory_peak_mb: float
    power_draw_watts: Optional[float] = None
    throughput_fps: Optional[float] = None
    measured_at: datetime = field(default_factory=datetime.utcnow)
    hardware_serial: Optional[str] = None  # specific device used


@dataclass
class CompiledArtifact:
    """A single compiled model binary for a specific target."""
    artifact_id: str
    model_version_id: str
    target: HardwareTarget
    quantization: QuantizationLevel
    compiler: str                    # "tvm-0.15.0", "tensorrt-8.6.1"
    compiler_flags: dict             # optimization flags used
    artifact_path: str               # s3://bucket/path/to/artifact
    artifact_hash_sha256: str        # content-addressable integrity
    artifact_size_bytes: int
    benchmark: Optional[BenchmarkResult] = None
    created_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class ModelVersion:
    """A model version — the source checkpoint + all compiled artifacts."""
    version_id: str
    model_family: str               # "yolov8-nano", "mobilenet-v3-small"
    source_checkpoint_path: str
    source_framework: str            # "pytorch", "tensorflow", "jax"
    training_run_id: str
    dataset_version: str
    artifacts: list[CompiledArtifact] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.utcnow)

    def best_artifact(self, target: HardwareTarget,
                      max_latency_ms: float = None,
                      min_accuracy: float = None) -> Optional[CompiledArtifact]:
        """Find the best artifact for a target meeting constraints."""
        candidates = [a for a in self.artifacts if a.target == target]
        if max_latency_ms:
            candidates = [a for a in candidates
                          if a.benchmark and a.benchmark.latency_p95_ms <= max_latency_ms]
        if min_accuracy:
            candidates = [a for a in candidates
                          if a.benchmark and a.benchmark.accuracy_metric >= min_accuracy]
        if not candidates:
            return None
        # Sort by latency (fastest first), break ties by accuracy (highest)
        return sorted(candidates,
                      key=lambda a: (a.benchmark.latency_p95_ms,
                                     -a.benchmark.accuracy_metric))[0]`
        },

        // ── Section 3: Artifact Lineage and Reproducibility ──
        {
          type: "heading",
          text: "Artifact Lineage and Reproducibility"
        },
        {
          type: "text",
          text: "Every compiled artifact must be traceable back to its origin. When a device in the field exhibits unexpected behavior, you need to answer: which checkpoint was this compiled from? What dataset was it trained on? Which compiler version and flags were used? Was this the same build that passed CI, or was it recompiled? Lineage is not optional — it is a debugging and compliance requirement."
        },
        {
          type: "text",
          text: "Implement lineage as a directed acyclic graph (DAG): training_run → checkpoint → ONNX_export → compiled_artifact → deployed_artifact. Each edge records the tool and version that performed the transformation. Store the full compilation command (with all flags) as an immutable record. Use content-addressable hashing (SHA-256 of artifact bytes) so that any two identical compilations produce the same hash — if they don't, your build is not deterministic, and that itself is a bug to fix."
        },
        {
          type: "code",
          lang: "python",
          filename: "lineage_tracker.py",
          code: `"""
Artifact lineage tracking — connects every deployed binary
back to its source checkpoint and compilation parameters.
"""
import hashlib
import json
from pathlib import Path


class LineageTracker:
    """Track the full provenance chain for compiled artifacts."""

    def __init__(self, db_path: str = "lineage.db"):
        import sqlite3
        self.conn = sqlite3.connect(db_path)
        self._init_schema()

    def _init_schema(self):
        self.conn.executescript("""
            CREATE TABLE IF NOT EXISTS lineage (
                artifact_hash TEXT PRIMARY KEY,
                parent_hash TEXT,
                transform_type TEXT,  -- 'train', 'export', 'compile', 'quantize'
                tool_name TEXT,       -- 'pytorch-2.1', 'tvm-0.15', 'onnxruntime-1.17'
                tool_version TEXT,
                command TEXT,         -- full compilation command
                config_json TEXT,     -- all flags and parameters
                timestamp TEXT DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_parent ON lineage(parent_hash);
        """)

    def record(self, artifact_path: str, parent_hash: str,
               transform_type: str, tool_name: str,
               tool_version: str, command: str, config: dict) -> str:
        """Record a transformation step and return artifact hash."""
        artifact_hash = self._hash_file(artifact_path)
        self.conn.execute(
            "INSERT OR REPLACE INTO lineage VALUES (?,?,?,?,?,?,?,CURRENT_TIMESTAMP)",
            (artifact_hash, parent_hash, transform_type,
             tool_name, tool_version, command, json.dumps(config))
        )
        self.conn.commit()
        return artifact_hash

    def trace_full_lineage(self, artifact_hash: str) -> list[dict]:
        """Walk the lineage chain from artifact back to training run."""
        chain = []
        current = artifact_hash
        while current:
            row = self.conn.execute(
                "SELECT * FROM lineage WHERE artifact_hash = ?", (current,)
            ).fetchone()
            if not row:
                break
            chain.append({
                "hash": row[0], "parent": row[1],
                "transform": row[2], "tool": f"{row[3]}@{row[4]}",
                "command": row[5], "config": json.loads(row[6]),
                "timestamp": row[7]
            })
            current = row[1]  # follow parent
        return list(reversed(chain))  # training_run → ... → artifact

    @staticmethod
    def _hash_file(path: str) -> str:
        h = hashlib.sha256()
        with open(path, "rb") as f:
            for chunk in iter(lambda: f.read(8192), b""):
                h.update(chunk)
        return h.hexdigest()`
        },

        // ── Section 4: Querying the Registry ──
        {
          type: "heading",
          text: "Querying the Registry"
        },
        {
          type: "text",
          text: "The registry API must support three query patterns that drive production workflows: (1) Deployment queries — 'give me the best artifact for Jetson Orin that meets 30ms P95 latency and 80% mAP.' This drives OTA deployments and fleet management. (2) Debugging queries — 'show me the lineage of the artifact running on device X' or 'which devices are running artifacts compiled with TVM 0.14?' This drives incident response. (3) Comparison queries — 'compare latency across all targets for model version 47 vs 48' or 'show me all models that regressed on Hexagon DSP after the compiler upgrade.' This drives development iteration."
        },
        {
          type: "code",
          lang: "python",
          filename: "registry_queries.py",
          code: `"""
Example registry queries for edge ML production workflows.
"""

class EdgeModelRegistry:
    """High-level registry API for edge deployment workflows."""

    def find_best_for_target(self, model_family: str,
                             target: str, constraints: dict) -> dict:
        """
        Deployment query: find the best artifact meeting constraints.

        Example:
            registry.find_best_for_target(
                model_family="yolov8-nano",
                target="jetson-orin",
                constraints={
                    "max_latency_p95_ms": 30,
                    "min_accuracy": 0.80,
                    "quantization": ["int8", "fp16"],
                }
            )
        Returns the artifact with lowest latency meeting all constraints.
        """
        ...

    def trace_device_artifact(self, device_id: str) -> dict:
        """
        Debugging query: full lineage of what's running on a device.

        Returns: {
            "device_id": "cam-0042",
            "artifact_hash": "a1b2c3...",
            "model_version": "v47",
            "compiler": "tvm-0.15.0",
            "training_run": "run-2024-0312",
            "dataset": "ds-v23",
            "deployed_at": "2024-03-15T10:30:00Z",
            "lineage_chain": [...]
        }
        """
        ...

    def compare_versions(self, model_family: str,
                         version_a: str, version_b: str) -> dict:
        """
        Comparison query: side-by-side benchmark results across targets.

        Returns: {
            "jetson-orin": {
                "v47": {"latency_p95": 28.3, "accuracy": 0.82},
                "v48": {"latency_p95": 25.1, "accuracy": 0.83}
            },
            "cortex-a78": { ... },
            "qualcomm-hexagon": { ... },
        }
        """
        ...

    def find_affected_by_compiler(self, compiler_version: str) -> list:
        """
        Impact query: find all deployed artifacts using a specific compiler.

        Useful for: 'TVM 0.14.2 has a bug in INT8 quantized conv2d.
        Which devices are running artifacts compiled with it?'
        """
        ...`
        },

        // ── Section 5: MLflow for Edge ──
        {
          type: "heading",
          text: "Adapting MLflow for Edge Deployments"
        },
        {
          type: "text",
          text: "MLflow can serve as an edge registry with some adaptation. Use MLflow's model registry for version management and its artifact store for compiled binaries. The key extension: log each compiled artifact as a separate MLflow artifact within the same run, tagged with target hardware and benchmark results. Use MLflow's search API to query across targets. For production scale, front MLflow with a thin API layer that adds hardware-aware queries and integrates with your CI/CD pipeline."
        },
        {
          type: "code",
          lang: "python",
          filename: "mlflow_edge_registry.py",
          code: `"""
Using MLflow as an edge model registry — logging per-target artifacts.
"""
import mlflow
from mlflow.tracking import MlflowClient


def register_edge_model(
    model_name: str,
    source_checkpoint: str,
    compiled_artifacts: dict,   # target -> {"path": str, "benchmark": dict}
    training_params: dict,
    compiler_config: dict,
):
    """
    Register a model with per-target compiled artifacts in MLflow.

    compiled_artifacts example:
    {
        "jetson-orin-int8": {
            "path": "/builds/yolo-orin-int8.engine",
            "benchmark": {"latency_p95": 25.1, "accuracy": 0.83, "memory_mb": 120}
        },
        "cortex-a78-int8": {
            "path": "/builds/yolo-arm-int8.tflite",
            "benchmark": {"latency_p95": 45.2, "accuracy": 0.81, "memory_mb": 85}
        }
    }
    """
    with mlflow.start_run(run_name=f"{model_name}-compilation") as run:
        # Log training parameters
        mlflow.log_params(training_params)
        mlflow.log_params({f"compiler_{k}": v
                           for k, v in compiler_config.items()})

        # Log each compiled artifact with target-specific metrics
        for target, info in compiled_artifacts.items():
            # Tag artifact with target
            mlflow.log_artifact(info["path"], artifact_path=f"compiled/{target}")

            # Log per-target benchmark as metrics with target prefix
            for metric_name, value in info["benchmark"].items():
                mlflow.log_metric(f"{target}/{metric_name}", value)

        # Log source checkpoint
        mlflow.log_artifact(source_checkpoint, artifact_path="source")

        # Register in model registry
        model_uri = f"runs:/{run.info.run_id}/source"
        mv = mlflow.register_model(model_uri, model_name)

        # Tag the model version with compilation info
        client = MlflowClient()
        client.set_model_version_tag(
            model_name, mv.version, "targets",
            ",".join(compiled_artifacts.keys())
        )

        return mv


def find_best_artifact(model_name: str, target: str,
                       max_latency_ms: float) -> dict:
    """Query MLflow for the best artifact meeting latency constraint."""
    client = MlflowClient()

    # Search runs with target benchmark data
    runs = mlflow.search_runs(
        filter_string=f"metrics.\\"{target}/latency_p95\\" <= {max_latency_ms}",
        order_by=[f"metrics.\\"{target}/latency_p95\\" ASC"],
        max_results=1,
    )

    if runs.empty:
        return None

    best_run = runs.iloc[0]
    return {
        "run_id": best_run.run_id,
        "latency_p95": best_run[f"metrics.{target}/latency_p95"],
        "accuracy": best_run[f"metrics.{target}/accuracy"],
        "artifact_path": f"compiled/{target}",
    }`
        },

        // ── Summary ──
        {
          type: "callout",
          variant: "tip",
          title: "Key Takeaways",
          text: "An edge model registry is fundamentally different from a cloud registry: it must track N artifacts per model version (one per target), store hardware-specific benchmarks, maintain full lineage for debugging, and support hardware-aware queries. Start with MLflow extended with per-target artifacts and structured tags. Invest in lineage tracking from day one — when a device in the field misbehaves, you need to trace back to the exact training run, dataset, and compiler version within minutes."
        },
      ],
    },


    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 2 — Automated Benchmark & Regression Testing
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "benchmark-regression-testing",
      title: "Automated Benchmark & Regression Testing",
      readTime: "20 min",
      content: [
        {
          type: "text",
          text: "Every model change — a new training run, a compiler upgrade, a quantization tweak — can silently degrade performance on one or more hardware targets. Without automated benchmarking and regression gates, you discover problems when devices in the field start dropping frames or misclassifying objects. This lesson covers building benchmark infrastructure that catches regressions before they reach production."
        },
        {
          type: "callout",
          variant: "warning",
          title: "The Silent Regression",
          text: "A common failure mode: a compiler upgrade improves average latency by 5% across targets, but introduces a P99 latency spike on one specific operator combination on Hexagon DSP. Average-only benchmarks miss this. You need percentile-level profiling per operator, per target, in CI."
        },

        // ── Section 1: Benchmark Infrastructure Design ──
        {
          type: "heading",
          text: "Benchmark Infrastructure Design"
        },
        {
          type: "text",
          text: "A production benchmark system has three components: (1) Benchmark runners — processes that execute model inference on target hardware and collect metrics. These can be CI-hosted self-hosted runners (a Jetson Orin rack in your lab, an ARM server pool) or remote device farms. (2) A benchmark suite — a fixed set of models, input datasets, and measurement configurations that define what gets benchmarked on every change. (3) A results database — time-series storage of benchmark results that enables trend analysis, regression detection, and historical comparisons."
        },
        {
          type: "text",
          text: "The critical design decision is whether to benchmark on real hardware or emulators. Real hardware gives accurate results but limits CI parallelism (you have a fixed number of devices). Emulators (QEMU for ARM, TVM's CPU backend as a proxy) give unlimited parallelism but inaccurate absolute numbers. The practical answer: use emulators for smoke tests (did the model compile and produce correct outputs?) and real hardware for performance benchmarks (does it meet latency requirements?)."
        },
        {
          type: "comparison",
          headers: ["Approach", "Latency Accuracy", "Throughput", "Cost", "When to Use"],
          rows: [
            ["Real hardware (device farm)", "Exact", "Limited by device count", "High (hardware + maintenance)", "Final benchmark before deployment"],
            ["QEMU emulation", "Inaccurate (10-100x slower)", "Unlimited (cloud VMs)", "Low", "Functional correctness testing"],
            ["Cross-compiled + host profiling", "Approximate (wrong cache/memory)", "High", "Low", "Development iteration"],
            ["Hardware-calibrated simulator", "Good (±15%)", "Moderate", "Medium", "Pre-screening before real HW"],
          ]
        },

        // ── Section 2: Building a Benchmark Suite ──
        {
          type: "heading",
          text: "Building a Benchmark Suite"
        },
        {
          type: "text",
          text: "A benchmark suite is a versioned, reproducible collection of test cases. Each test case specifies: the model to benchmark, the input data (fixed synthetic inputs for latency tests, real validation data for accuracy tests), warmup iterations, measurement iterations, and the metrics to collect. Version the benchmark suite alongside your code — when you add a new model or change input preprocessing, the benchmark suite must update in the same commit."
        },
        {
          type: "code",
          lang: "python",
          filename: "benchmark_suite.py",
          code: `"""
Benchmark suite definition — versioned, reproducible benchmarks.
"""
import time
import json
import statistics
import numpy as np
from dataclasses import dataclass, field, asdict
from pathlib import Path


@dataclass
class BenchmarkCase:
    """A single benchmark test case."""
    name: str
    model_path: str
    input_shape: tuple                    # (1, 3, 224, 224)
    input_dtype: str = "float32"
    warmup_iterations: int = 50
    measure_iterations: int = 200
    expected_output_path: str = None      # golden reference for correctness
    accuracy_tolerance: float = 1e-3      # max deviation from golden ref
    tags: list[str] = field(default_factory=list)


@dataclass
class BenchmarkResult:
    """Results from running a single benchmark case."""
    case_name: str
    target_hardware: str
    latency_ms: list[float]           # raw measurements
    latency_p50_ms: float = 0
    latency_p95_ms: float = 0
    latency_p99_ms: float = 0
    latency_mean_ms: float = 0
    latency_std_ms: float = 0
    memory_peak_mb: float = 0
    correctness_pass: bool = True
    max_output_deviation: float = 0   # vs golden reference
    timestamp: str = ""

    def compute_stats(self):
        """Compute percentile statistics from raw latency measurements."""
        self.latency_p50_ms = float(np.percentile(self.latency_ms, 50))
        self.latency_p95_ms = float(np.percentile(self.latency_ms, 95))
        self.latency_p99_ms = float(np.percentile(self.latency_ms, 99))
        self.latency_mean_ms = float(np.mean(self.latency_ms))
        self.latency_std_ms = float(np.std(self.latency_ms))


class BenchmarkRunner:
    """Execute benchmark cases on a specific target."""

    def __init__(self, target_hardware: str, results_dir: str = "bench_results"):
        self.target = target_hardware
        self.results_dir = Path(results_dir)
        self.results_dir.mkdir(exist_ok=True)

    def run_case(self, case: BenchmarkCase, runtime) -> BenchmarkResult:
        """Run a single benchmark case and return results."""
        # Load model into runtime
        model = runtime.load(case.model_path)
        input_data = np.random.randn(*case.input_shape).astype(case.input_dtype)

        # Warmup
        for _ in range(case.warmup_iterations):
            model.run(input_data)

        # Measure
        latencies = []
        for _ in range(case.measure_iterations):
            start = time.perf_counter()
            output = model.run(input_data)
            end = time.perf_counter()
            latencies.append((end - start) * 1000)  # ms

        result = BenchmarkResult(
            case_name=case.name,
            target_hardware=self.target,
            latency_ms=latencies,
        )
        result.compute_stats()

        # Correctness check against golden reference
        if case.expected_output_path:
            golden = np.load(case.expected_output_path)
            deviation = float(np.max(np.abs(output - golden)))
            result.max_output_deviation = deviation
            result.correctness_pass = deviation <= case.accuracy_tolerance

        # Persist results
        result_path = self.results_dir / f"{case.name}_{self.target}.json"
        with open(result_path, "w") as f:
            json.dump(asdict(result), f, indent=2, default=str)

        return result

    def run_suite(self, cases: list[BenchmarkCase], runtime) -> list[BenchmarkResult]:
        """Run all benchmark cases and return results."""
        results = []
        for case in cases:
            print(f"  Benchmarking: {case.name} on {self.target}...")
            result = self.run_case(case, runtime)
            status = "PASS" if result.correctness_pass else "FAIL"
            print(f"    P50={result.latency_p50_ms:.1f}ms  "
                  f"P95={result.latency_p95_ms:.1f}ms  "
                  f"Correctness: {status}")
            results.append(result)
        return results`
        },

        // ── Section 3: Regression Detection ──
        {
          type: "heading",
          text: "Regression Detection"
        },
        {
          type: "text",
          text: "Regression detection compares current benchmark results against a baseline. The baseline can be: (1) the last known-good deployment (most common), (2) a fixed golden version, or (3) a rolling window of recent results. A regression is detected when any metric exceeds a threshold: latency P95 increased by more than 10%, accuracy dropped by more than 0.5%, memory usage increased by more than 15%, or correctness check failed (output deviation exceeded tolerance)."
        },
        {
          type: "text",
          text: "Be careful with threshold-based regression detection — it produces false positives from measurement noise. Latency measurements on real hardware vary by 5-15% between runs due to thermal throttling, background processes, and OS scheduling. Mitigation: run benchmarks multiple times (3-5 repetitions), use the median of medians, and set thresholds above the noise floor. Some teams use statistical tests (Mann-Whitney U) instead of fixed thresholds, but in practice a well-tuned fixed threshold with sufficient repetitions works just as well and is easier to understand."
        },
        {
          type: "code",
          lang: "python",
          filename: "regression_detector.py",
          code: `"""
Regression detection — compare current benchmarks against baseline.
"""
from dataclasses import dataclass


@dataclass
class RegressionThresholds:
    """Thresholds for regression detection."""
    max_latency_p95_increase_pct: float = 10.0    # 10% slower = regression
    max_latency_p99_increase_pct: float = 15.0
    max_accuracy_decrease_pct: float = 0.5         # 0.5% accuracy drop
    max_memory_increase_pct: float = 15.0
    correctness_must_pass: bool = True


@dataclass
class RegressionResult:
    """Result of comparing current vs baseline."""
    metric_name: str
    target: str
    baseline_value: float
    current_value: float
    change_pct: float
    threshold_pct: float
    is_regression: bool
    severity: str           # "critical", "warning", "info"


class RegressionDetector:
    """Detect performance regressions across benchmark runs."""

    def __init__(self, thresholds: RegressionThresholds = None):
        self.thresholds = thresholds or RegressionThresholds()

    def compare(self, baseline: dict, current: dict,
                target: str) -> list[RegressionResult]:
        """
        Compare current benchmark results against baseline.

        baseline/current format: {
            "latency_p95_ms": 25.1,
            "latency_p99_ms": 28.3,
            "accuracy": 0.83,
            "memory_peak_mb": 120.0,
            "correctness_pass": True
        }
        """
        results = []

        # Latency P95 check (higher = worse)
        results.append(self._check_increase(
            "latency_p95", target,
            baseline["latency_p95_ms"], current["latency_p95_ms"],
            self.thresholds.max_latency_p95_increase_pct, "critical"
        ))

        # Latency P99 check
        results.append(self._check_increase(
            "latency_p99", target,
            baseline["latency_p99_ms"], current["latency_p99_ms"],
            self.thresholds.max_latency_p99_increase_pct, "critical"
        ))

        # Accuracy check (lower = worse, invert comparison)
        results.append(self._check_decrease(
            "accuracy", target,
            baseline["accuracy"], current["accuracy"],
            self.thresholds.max_accuracy_decrease_pct, "critical"
        ))

        # Memory check (higher = worse)
        results.append(self._check_increase(
            "memory_peak", target,
            baseline["memory_peak_mb"], current["memory_peak_mb"],
            self.thresholds.max_memory_increase_pct, "warning"
        ))

        # Correctness check (binary)
        if self.thresholds.correctness_must_pass:
            if not current.get("correctness_pass", True):
                results.append(RegressionResult(
                    metric_name="correctness", target=target,
                    baseline_value=1, current_value=0,
                    change_pct=-100, threshold_pct=0,
                    is_regression=True, severity="critical"
                ))

        return results

    def _check_increase(self, name, target, baseline, current,
                        threshold_pct, severity):
        change = ((current - baseline) / baseline) * 100 if baseline else 0
        return RegressionResult(
            name, target, baseline, current, change,
            threshold_pct, change > threshold_pct, severity
        )

    def _check_decrease(self, name, target, baseline, current,
                        threshold_pct, severity):
        change = ((baseline - current) / baseline) * 100 if baseline else 0
        return RegressionResult(
            name, target, baseline, current, -change,
            threshold_pct, change > threshold_pct, severity
        )

    def generate_report(self, results: list[RegressionResult]) -> str:
        """Generate a human-readable regression report."""
        regressions = [r for r in results if r.is_regression]
        if not regressions:
            return "No regressions detected. All metrics within thresholds."

        lines = [f"REGRESSION DETECTED — {len(regressions)} metric(s) exceeded thresholds:\\n"]
        for r in regressions:
            lines.append(
                f"  [{r.severity.upper()}] {r.metric_name} on {r.target}: "
                f"{r.baseline_value:.2f} -> {r.current_value:.2f} "
                f"({r.change_pct:+.1f}%, threshold: {r.threshold_pct}%)"
            )
        return "\\n".join(lines)`
        },

        // ── Section 4: Golden-Reference Testing ──
        {
          type: "heading",
          text: "Golden-Reference Testing"
        },
        {
          type: "text",
          text: "Golden-reference testing validates that a compiled model produces numerically correct outputs. The idea: run the model in a trusted reference environment (the original PyTorch/TensorFlow framework, FP32, on CPU), save the outputs for a fixed set of inputs, then compare every compiled artifact's outputs against these golden references. The tolerance depends on the quantization level: FP32 artifacts should match to 1e-5, FP16 to 1e-3, INT8 to 1e-2, and INT4 may require cosine similarity (>0.99) rather than absolute tolerance."
        },
        {
          type: "code",
          lang: "python",
          filename: "golden_reference.py",
          code: `"""
Golden-reference testing — validate compiled model numerical accuracy.
"""
import numpy as np
from pathlib import Path


class GoldenReferenceValidator:
    """Validate compiled artifacts against golden reference outputs."""

    # Tolerance per quantization level
    TOLERANCES = {
        "fp32": {"atol": 1e-5, "rtol": 1e-4},
        "fp16": {"atol": 1e-3, "rtol": 1e-2},
        "int8": {"atol": 5e-2, "rtol": 5e-2},
        "int4": {"atol": 1e-1, "rtol": 1e-1},  # also check cosine sim
    }

    def __init__(self, golden_dir: str):
        self.golden_dir = Path(golden_dir)

    def generate_golden(self, model, test_inputs: list[np.ndarray],
                        model_name: str):
        """Generate golden reference outputs from the source framework."""
        output_dir = self.golden_dir / model_name
        output_dir.mkdir(parents=True, exist_ok=True)

        for i, inp in enumerate(test_inputs):
            # Save input
            np.save(output_dir / f"input_{i}.npy", inp)
            # Run in reference environment (framework, FP32, CPU)
            output = model(inp)
            np.save(output_dir / f"output_{i}.npy", output)

        print(f"Generated {len(test_inputs)} golden references "
              f"for {model_name}")

    def validate(self, compiled_model, model_name: str,
                 quantization: str = "fp32") -> dict:
        """Validate compiled model outputs against golden references."""
        golden_dir = self.golden_dir / model_name
        tol = self.TOLERANCES[quantization]

        results = {"pass": True, "details": []}

        for input_path in sorted(golden_dir.glob("input_*.npy")):
            idx = input_path.stem.split("_")[1]
            inp = np.load(input_path)
            golden = np.load(golden_dir / f"output_{idx}.npy")

            # Run compiled model
            output = compiled_model(inp)

            # Check absolute + relative tolerance
            close = np.allclose(output, golden,
                                atol=tol["atol"], rtol=tol["rtol"])
            max_diff = float(np.max(np.abs(output - golden)))

            # For aggressive quantization, also check cosine similarity
            cos_sim = None
            if quantization in ("int4", "int8"):
                flat_out = output.flatten()
                flat_gold = golden.flatten()
                cos_sim = float(
                    np.dot(flat_out, flat_gold) /
                    (np.linalg.norm(flat_out) * np.linalg.norm(flat_gold) + 1e-8)
                )
                # Fail if cosine sim < 0.99 for INT8, < 0.95 for INT4
                cos_threshold = 0.99 if quantization == "int8" else 0.95
                close = close or (cos_sim >= cos_threshold)

            results["details"].append({
                "input": str(input_path.name),
                "pass": close,
                "max_abs_diff": max_diff,
                "cosine_similarity": cos_sim,
            })
            if not close:
                results["pass"] = False

        return results`
        },

        // ── Summary ──
        {
          type: "callout",
          variant: "tip",
          title: "Key Takeaways",
          text: "Automated benchmarking is your safety net against silent regressions. Build a versioned benchmark suite that runs on every model or compiler change. Use real hardware for performance benchmarks, emulators for correctness. Set per-metric, per-target regression thresholds above the noise floor. Golden-reference testing catches numerical correctness issues — set tolerance per quantization level. Gate deployments on both performance and correctness passing."
        },
      ],
    },


    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 3 — Multi-Platform CI/CD for Edge ML
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "multi-platform-cicd",
      title: "Multi-Platform CI/CD for Edge ML",
      readTime: "22 min",
      content: [
        {
          type: "text",
          text: "Building ML models for edge deployment means compiling for targets that your CI servers cannot natively run. Your CI runs on x86_64 Linux, but your targets are ARM Cortex-A, Qualcomm Hexagon DSP, Apple Neural Engine, and RISC-V microcontrollers. This lesson covers the CI/CD patterns that bridge this gap: cross-compilation toolchains, QEMU emulation, self-hosted runners on real hardware, Docker multi-arch builds, and the pipeline design that ties them together."
        },

        // ── Section 1: Cross-Compilation Fundamentals ──
        {
          type: "heading",
          text: "Cross-Compilation Fundamentals"
        },
        {
          type: "text",
          text: "Cross-compilation produces executable code for a different architecture than the build host. For ML, this means compiling TFLite models, TVM modules, or TensorRT engines on x86 CI runners that will execute on ARM or other targets. The toolchain consists of: a cross-compiler (GCC or Clang targeting the foreign architecture), a sysroot (headers and libraries from the target OS), and target-specific SDK components (CUDA toolkit for Jetson, Hexagon SDK for Qualcomm, etc.)."
        },
        {
          type: "text",
          text: "The main challenge is dependency management. Your model compilation may depend on target-specific libraries (TensorRT, NNAPI, Core ML) that only exist on the target platform. Solution: use a containerized sysroot — a Docker image containing the target's root filesystem with all required libraries. Mount this sysroot during cross-compilation. For TVM, set the target triple and link against the sysroot's libraries. For TensorRT, use NVIDIA's cross-compilation container."
        },
        {
          type: "code",
          lang: "dockerfile",
          filename: "Dockerfile.cross-compile-arm",
          code: `# Cross-compilation container for ARM64 (aarch64) targets
# Includes TVM, TFLite, and ARM sysroot

FROM ubuntu:22.04 AS cross-builder

# Install cross-compilation toolchain
RUN apt-get update && apt-get install -y \\
    gcc-aarch64-linux-gnu \\
    g++-aarch64-linux-gnu \\
    qemu-user-static \\
    cmake \\
    ninja-build \\
    python3-pip \\
    wget \\
    && rm -rf /var/lib/apt/lists/*

# Install ARM64 sysroot (target libraries)
RUN dpkg --add-architecture arm64 && \\
    apt-get update && \\
    apt-get install -y \\
    libstdc++-12-dev:arm64 \\
    libc6-dev:arm64

# Install TVM with cross-compilation support
RUN pip3 install apache-tvm==0.15.0 numpy onnx onnxruntime

# Install TFLite tools
RUN pip3 install tflite-runtime tensorflow

# Set cross-compilation environment
ENV CC=aarch64-linux-gnu-gcc
ENV CXX=aarch64-linux-gnu-g++
ENV TARGET_ARCH=aarch64
ENV SYSROOT=/usr/aarch64-linux-gnu

WORKDIR /workspace
COPY scripts/compile_for_target.py .
COPY models/ models/

# Entry point: compile all models for ARM64
ENTRYPOINT ["python3", "compile_for_target.py"]`
        },

        // ── Section 2: GitHub Actions Matrix Builds ──
        {
          type: "heading",
          text: "GitHub Actions Matrix Builds for Multi-Target"
        },
        {
          type: "text",
          text: "GitHub Actions matrix strategies compile your model for multiple targets in parallel. Define a matrix of target configurations, each specifying the hardware target, compiler, quantization level, and Docker image. Each matrix entry runs independently, producing one compiled artifact. After all matrix jobs complete, a downstream job collects artifacts, runs benchmarks (on real hardware via self-hosted runners), and gates deployment."
        },
        {
          type: "code",
          lang: "yaml",
          filename: ".github/workflows/edge-ml-ci.yml",
          code: `name: Edge ML CI/CD Pipeline

on:
  push:
    branches: [main]
    paths:
      - 'models/**'
      - 'configs/**'
      - 'scripts/compile_*'
  pull_request:
    branches: [main]

env:
  MODEL_REGISTRY_URL: \${{ secrets.REGISTRY_URL }}
  BENCHMARK_DB_URL: \${{ secrets.BENCHMARK_DB_URL }}

jobs:
  # ── Stage 1: Export from framework to ONNX ──
  export:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: pip install torch torchvision onnx onnxruntime
      - name: Export model to ONNX
        run: python scripts/export_to_onnx.py --model configs/model.yaml
      - name: Generate golden references
        run: python scripts/generate_golden.py --model exported/model.onnx
      - uses: actions/upload-artifact@v4
        with:
          name: onnx-model
          path: exported/

  # ── Stage 2: Cross-compile for each target (parallel matrix) ──
  compile:
    needs: export
    runs-on: ubuntu-latest
    strategy:
      matrix:
        include:
          - target: jetson-orin
            compiler: tensorrt
            quantization: int8
            container: nvcr.io/nvidia/tensorrt:23.12-py3
          - target: cortex-a78
            compiler: tflite
            quantization: int8
            container: ghcr.io/myorg/cross-arm64:latest
          - target: cortex-a78
            compiler: tvm
            quantization: fp16
            container: ghcr.io/myorg/tvm-cross-arm64:latest
          - target: qualcomm-hexagon
            compiler: qnn
            quantization: int8
            container: ghcr.io/myorg/qnn-sdk:latest
          - target: x86-server
            compiler: tvm
            quantization: fp32
            container: ghcr.io/myorg/tvm-x86:latest
      fail-fast: false  # Don't cancel others if one fails
    container:
      image: \${{ matrix.container }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with:
          name: onnx-model
          path: exported/
      - name: Compile for \${{ matrix.target }}
        run: |
          python scripts/compile_for_target.py \\
            --model exported/model.onnx \\
            --target \${{ matrix.target }} \\
            --compiler \${{ matrix.compiler }} \\
            --quantization \${{ matrix.quantization }}
      - name: Validate against golden reference (QEMU)
        run: |
          python scripts/validate_golden.py \\
            --compiled compiled/model_\${{ matrix.target }}.bin \\
            --golden exported/golden/ \\
            --quantization \${{ matrix.quantization }}
      - uses: actions/upload-artifact@v4
        with:
          name: compiled-\${{ matrix.target }}-\${{ matrix.compiler }}
          path: compiled/

  # ── Stage 3: Benchmark on real hardware (self-hosted runners) ──
  benchmark:
    needs: compile
    strategy:
      matrix:
        include:
          - target: jetson-orin
            runner: self-hosted-orin
          - target: cortex-a78
            runner: self-hosted-rpi5
    runs-on: \${{ matrix.runner }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with:
          pattern: compiled-\${{ matrix.target }}-*
          merge-multiple: true
          path: compiled/
      - name: Run benchmarks on real hardware
        run: |
          python scripts/benchmark.py \\
            --model-dir compiled/ \\
            --target \${{ matrix.target }} \\
            --output bench_results.json
      - name: Check for regressions
        run: |
          python scripts/check_regression.py \\
            --current bench_results.json \\
            --baseline-from-registry \\
            --fail-on-regression
      - uses: actions/upload-artifact@v4
        with:
          name: benchmark-\${{ matrix.target }}
          path: bench_results.json

  # ── Stage 4: Register and deploy ──
  register:
    needs: [compile, benchmark]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with:
          pattern: compiled-*
          merge-multiple: true
          path: compiled/
      - uses: actions/download-artifact@v4
        with:
          pattern: benchmark-*
          merge-multiple: true
          path: benchmarks/
      - name: Register artifacts in model registry
        run: |
          python scripts/register_model.py \\
            --artifacts-dir compiled/ \\
            --benchmarks-dir benchmarks/ \\
            --registry-url "\$MODEL_REGISTRY_URL"`
        },

        // ── Section 3: Self-Hosted Runners on Edge Hardware ──
        {
          type: "heading",
          text: "Self-Hosted Runners on Edge Hardware"
        },
        {
          type: "text",
          text: "Self-hosted GitHub Actions runners on real edge hardware are essential for accurate benchmarking. Set up dedicated benchmark devices (Jetson Orin, Raspberry Pi 5, Qualcomm dev board) as persistent runners. Key practices: (1) Dedicate devices to CI — don't share them with development. Background processes cause measurement variance. (2) Use labels to route jobs — a job targeting 'jetson-orin' runs only on runners labeled 'self-hosted-orin'. (3) Run one job at a time per device to avoid interference. (4) Monitor device health — thermal throttling, disk space, connectivity. (5) Pin firmware and OS versions — an OS update can change benchmark results."
        },
        {
          type: "code",
          lang: "bash",
          filename: "setup_self_hosted_runner.sh",
          code: `#!/bin/bash
# Set up a GitHub Actions self-hosted runner on edge hardware
# Run this on the target device (e.g., Jetson Orin)

set -euo pipefail

RUNNER_VERSION="2.314.1"
GITHUB_ORG="your-org"
GITHUB_REPO="your-repo"
RUNNER_LABELS="self-hosted,linux,arm64,jetson-orin"

# 1. Create runner user (no sudo, isolated)
sudo useradd -m -s /bin/bash gh-runner
sudo loginctl enable-linger gh-runner

# 2. Download and configure runner
sudo -u gh-runner bash <<'SETUP'
cd ~
mkdir -p actions-runner && cd actions-runner

# Download runner
curl -sL "https://github.com/actions/runner/releases/download/v$RUNNER_VERSION/actions-runner-linux-arm64-$RUNNER_VERSION.tar.gz" | tar xz

# Configure (use a registration token from GitHub)
echo "Get token from: Settings > Actions > Runners > New self-hosted runner"
echo "Then run: ./config.sh --url https://github.com/$GITHUB_ORG/$GITHUB_REPO --token YOUR_TOKEN --labels $RUNNER_LABELS"
SETUP

# 3. Install as systemd service (auto-start on boot)
cd /home/gh-runner/actions-runner
sudo ./svc.sh install gh-runner
sudo ./svc.sh start

# 4. Pin performance governor (no thermal throttling variation)
echo performance | sudo tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor

# 5. Disable swap (consistent memory measurements)
sudo swapoff -a

echo "Runner configured with labels: $RUNNER_LABELS"
echo "Verify at: GitHub repo > Settings > Actions > Runners"`
        },

        // ── Section 4: Docker Multi-Arch Builds ──
        {
          type: "heading",
          text: "Docker Multi-Arch Builds"
        },
        {
          type: "text",
          text: "For edge deployments that use containers (Jetson with Docker, Kubernetes on ARM), Docker buildx creates multi-architecture images from a single Dockerfile. Use buildx with QEMU for builds that don't need native performance, or with cross-compilation for performance-critical builds. The key: separate the build stage (cross-compile on x86) from the runtime stage (ARM base image with compiled binaries)."
        },
        {
          type: "code",
          lang: "dockerfile",
          filename: "Dockerfile.multi-arch-inference",
          code: `# Multi-arch inference container
# Builds for both amd64 (cloud) and arm64 (edge)

# ── Stage 1: Build (cross-compile on any host) ──
FROM --platform=$BUILDPLATFORM python:3.11-slim AS builder

ARG TARGETPLATFORM
ARG BUILDPLATFORM

RUN pip install --no-cache-dir \\
    onnxruntime \\
    numpy \\
    pillow

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY models/ models/
COPY src/ src/

# Compile/optimize model for target platform
RUN python src/optimize_model.py \\
    --model models/yolov8n.onnx \\
    --target "$TARGETPLATFORM" \\
    --output models/optimized.onnx

# ── Stage 2: Runtime (target architecture) ──
FROM python:3.11-slim

RUN pip install --no-cache-dir onnxruntime numpy pillow fastapi uvicorn

WORKDIR /app
COPY --from=builder /app/models/optimized.onnx models/
COPY src/inference_server.py .

EXPOSE 8080
CMD ["uvicorn", "inference_server:app", "--host", "0.0.0.0", "--port", "8080"]`
        },
        {
          type: "code",
          lang: "bash",
          filename: "build_multi_arch.sh",
          code: `#!/bin/bash
# Build and push multi-arch inference container
set -euo pipefail

IMAGE="ghcr.io/myorg/edge-inference"
TAG="v1.2.0"

# Create buildx builder (once)
docker buildx create --name edge-builder --use 2>/dev/null || true

# Build for both architectures and push
docker buildx build \\
    --platform linux/amd64,linux/arm64 \\
    --tag "$IMAGE:$TAG" \\
    --tag "$IMAGE:latest" \\
    --file Dockerfile.multi-arch-inference \\
    --push .

echo "Multi-arch image pushed: $IMAGE:$TAG"
echo "Verify: docker buildx imagetools inspect $IMAGE:$TAG"`
        },

        // ── Section 5: Pipeline Design Patterns ──
        {
          type: "heading",
          text: "Pipeline Design Patterns"
        },
        {
          type: "text",
          text: "The optimal edge ML CI/CD pipeline follows a diamond pattern: (1) Single export stage (PyTorch → ONNX), (2) Fan-out to N parallel compilation jobs (one per target), (3) Fan-out to M benchmark jobs on real hardware, (4) Fan-in to a single gate/register stage. This maximizes parallelism while maintaining clear dependencies. Add caching at two levels: ONNX export (skip if model code unchanged) and compiled artifacts (skip compilation if ONNX hash and compiler version match a cached build). Artifact caching alone can cut pipeline time from 45 minutes to 5 minutes for compiler-only changes."
        },
        {
          type: "list",
          items: [
            "Diamond pattern: export → fan-out compile → fan-out benchmark → fan-in register",
            "Cache ONNX exports by model code hash — skip export if unchanged",
            "Cache compiled artifacts by (ONNX hash + compiler version + flags) — skip recompilation",
            "Use fail-fast: false in matrix builds — one target failing shouldn't block others",
            "Separate correctness tests (QEMU, fast, every PR) from performance tests (real HW, slower, merge only)",
            "Store benchmark results in a time-series DB for trend analysis and alerting",
          ]
        },

        {
          type: "callout",
          variant: "tip",
          title: "Key Takeaways",
          text: "Multi-platform CI/CD requires cross-compilation toolchains, self-hosted runners on real hardware, and a diamond pipeline pattern. Use Docker containers with target sysroots for reproducible cross-compilation. Route benchmark jobs to real hardware via self-hosted runners. Cache aggressively — ONNX exports and compiled artifacts. Separate correctness tests (fast, every PR) from performance benchmarks (slow, on merge)."
        },
      ],
    },


    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 4 — OTA Model Updates & Fleet Management
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "ota-fleet-management",
      title: "OTA Model Updates & Fleet Management",
      readTime: "20 min",
      content: [
        {
          type: "text",
          text: "Deploying an ML model to edge devices is not the end — it is the beginning of ongoing operations. Models need updates (improved accuracy, new classes, bug fixes), and updates must reach thousands of devices reliably over constrained networks. This lesson covers Over-The-Air (OTA) update strategies for ML models, fleet management patterns, staged rollouts, and automatic rollback — the operational infrastructure that keeps your edge ML system running in production."
        },

        // ── Section 1: OTA Update Strategies ──
        {
          type: "heading",
          text: "OTA Update Strategies"
        },
        {
          type: "text",
          text: "Naive OTA: push the entire model binary to every device on every update. For a 50MB model across 10,000 devices, that is 500GB of bandwidth per update — often over cellular connections at $0.01/MB, costing $5,000 per update. Real systems use four strategies to reduce this cost: (1) Delta updates — compute a binary diff between old and new model, send only the diff. Typical compression: 60-90% for small model changes. (2) A/B partitioning — maintain two model slots on device, download to inactive slot, switch atomically. Enables instant rollback. (3) Compression — gzip/zstd the model binary for transfer, decompress on device. (4) Scheduling — update during off-peak hours or when device is on WiFi."
        },
        {
          type: "comparison",
          headers: ["Strategy", "Bandwidth Saving", "Rollback Speed", "Complexity", "Best For"],
          rows: [
            ["Full replacement", "None", "Re-download old version", "Low", "Small models (<5MB), infrequent updates"],
            ["Delta update (bsdiff)", "60-90%", "Must store delta + base", "Medium", "Large models, frequent updates"],
            ["A/B partition", "None (but enables instant rollback)", "Instant (swap partitions)", "Medium", "Safety-critical, any model size"],
            ["Delta + A/B", "60-90% + instant rollback", "Instant", "High", "Production edge ML at scale"],
          ]
        },
        {
          type: "code",
          lang: "python",
          filename: "delta_update_manager.py",
          code: `"""
Delta-based OTA model update system.
Uses bsdiff4 for binary diffing — typically achieves 60-90% compression
for model updates where weights change incrementally.
"""
import hashlib
import json
from pathlib import Path
from dataclasses import dataclass


@dataclass
class UpdateManifest:
    """Manifest describing an OTA update."""
    model_name: str
    from_version: str
    to_version: str
    update_type: str           # "full" or "delta"
    payload_url: str
    payload_size_bytes: int
    payload_hash_sha256: str
    target_hash_sha256: str    # expected hash after applying update
    min_battery_pct: int = 20  # don't update below this battery level
    require_wifi: bool = False
    priority: str = "normal"   # "normal", "critical", "security"


class OTAUpdateManager:
    """Manage model updates on an edge device."""

    def __init__(self, model_dir: str, active_slot: str = "A"):
        self.model_dir = Path(model_dir)
        self.slots = {
            "A": self.model_dir / "slot_a",
            "B": self.model_dir / "slot_b",
        }
        self.active_slot = active_slot
        self.inactive_slot = "B" if active_slot == "A" else "A"

        # Ensure directories exist
        for slot_dir in self.slots.values():
            slot_dir.mkdir(parents=True, exist_ok=True)

    def check_update(self, manifest: UpdateManifest, device_state: dict) -> dict:
        """Check if device should apply this update."""
        reasons = []

        if device_state.get("battery_pct", 100) < manifest.min_battery_pct:
            reasons.append(f"Battery too low: {device_state['battery_pct']}%")

        if manifest.require_wifi and not device_state.get("on_wifi", False):
            reasons.append("WiFi required but not connected")

        current_hash = self._hash_active_model()
        if manifest.update_type == "delta" and current_hash != self._expected_base_hash(manifest):
            reasons.append("Base model hash mismatch — need full update")

        return {
            "should_update": len(reasons) == 0,
            "reasons": reasons,
        }

    def apply_delta_update(self, manifest: UpdateManifest,
                           delta_path: str) -> dict:
        """Apply a delta update to the inactive slot."""
        try:
            import bsdiff4
        except ImportError:
            return {"success": False, "error": "bsdiff4 not installed"}

        active_model = self._active_model_path()
        inactive_dir = self.slots[self.inactive_slot]
        new_model_path = inactive_dir / "model.bin"

        # Apply delta patch
        with open(active_model, "rb") as f:
            old_bytes = f.read()
        with open(delta_path, "rb") as f:
            patch_bytes = f.read()

        new_bytes = bsdiff4.patch(old_bytes, patch_bytes)

        # Verify hash
        actual_hash = hashlib.sha256(new_bytes).hexdigest()
        if actual_hash != manifest.target_hash_sha256:
            return {
                "success": False,
                "error": f"Hash mismatch: expected {manifest.target_hash_sha256}, "
                         f"got {actual_hash}"
            }

        # Write to inactive slot
        with open(new_model_path, "wb") as f:
            f.write(new_bytes)

        return {"success": True, "path": str(new_model_path)}

    def swap_slots(self) -> str:
        """Atomically switch to the updated model (swap A/B slots)."""
        self.active_slot, self.inactive_slot = self.inactive_slot, self.active_slot
        # Persist slot state
        state_file = self.model_dir / "active_slot.json"
        with open(state_file, "w") as f:
            json.dump({"active": self.active_slot}, f)
        return self.active_slot

    def rollback(self) -> str:
        """Roll back to previous model (swap back to previous slot)."""
        return self.swap_slots()

    def _active_model_path(self) -> Path:
        return self.slots[self.active_slot] / "model.bin"

    def _hash_active_model(self) -> str:
        model_path = self._active_model_path()
        if not model_path.exists():
            return ""
        return hashlib.sha256(model_path.read_bytes()).hexdigest()

    def _expected_base_hash(self, manifest: UpdateManifest) -> str:
        # In practice, this comes from the manifest or registry
        return ""`
        },

        // ── Section 2: Staged Rollouts ──
        {
          type: "heading",
          text: "Staged Rollouts"
        },
        {
          type: "text",
          text: "Never update all devices at once. Staged rollouts progressively expand the update to larger groups while monitoring for issues. A typical progression: (1) Shadow mode — run the new model alongside the old one on 10 devices, compare outputs without using the new model's predictions. (2) Canary — deploy to 1% of the fleet, monitor all metrics. (3) Staged expansion — 5%, 25%, 50%, 100%, with hold periods at each stage. (4) Automatic rollback — if any monitored metric degrades beyond threshold, halt the rollout and roll back the canary group."
        },
        {
          type: "text",
          text: "Edge rollouts are harder than cloud rollouts for three reasons: (1) You cannot instantly roll back — devices may be offline for hours or days, so rollback only happens when the device next connects. (2) Monitoring is delayed — devices report telemetry on connection, not in real-time. Your canary metrics may be hours old. (3) Hardware heterogeneity — a model that works on Jetson Orin may fail on an older Jetson Nano in the same fleet. Always group rollouts by hardware class, not just randomly."
        },
        {
          type: "code",
          lang: "python",
          filename: "rollout_manager.py",
          code: `"""
Staged rollout manager for edge ML fleet updates.
"""
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime, timedelta


class RolloutStage(Enum):
    SHADOW = "shadow"           # Run alongside, compare outputs
    CANARY = "canary"           # 1% of fleet, live predictions
    STAGED_5 = "staged_5"      # 5%
    STAGED_25 = "staged_25"    # 25%
    STAGED_50 = "staged_50"    # 50%
    FULL = "full"               # 100%
    ROLLED_BACK = "rolled_back"
    COMPLETED = "completed"


@dataclass
class RolloutConfig:
    """Configuration for a staged rollout."""
    model_version: str
    target_hardware_class: str   # "jetson-orin", "cortex-a78", etc.
    stages: list[dict] = field(default_factory=lambda: [
        {"stage": "canary",    "pct": 1,   "hold_hours": 4,  "auto_advance": True},
        {"stage": "staged_5",  "pct": 5,   "hold_hours": 12, "auto_advance": True},
        {"stage": "staged_25", "pct": 25,  "hold_hours": 24, "auto_advance": True},
        {"stage": "staged_50", "pct": 50,  "hold_hours": 24, "auto_advance": False},
        {"stage": "full",      "pct": 100, "hold_hours": 0,  "auto_advance": False},
    ])
    rollback_thresholds: dict = field(default_factory=lambda: {
        "max_latency_p95_increase_pct": 15,
        "max_error_rate_increase_pct": 5,
        "min_confidence_score": 0.70,
    })


class RolloutManager:
    """Manage staged rollouts to edge device fleet."""

    def __init__(self, fleet_registry, telemetry_db):
        self.fleet = fleet_registry
        self.telemetry = telemetry_db
        self.active_rollouts = {}

    def start_rollout(self, config: RolloutConfig) -> str:
        """Start a new staged rollout."""
        rollout_id = f"rollout-{config.model_version}-{datetime.utcnow():%Y%m%d%H%M}"

        # Get eligible devices (matching hardware class, online, healthy)
        eligible = self.fleet.get_devices(
            hardware_class=config.target_hardware_class,
            status="healthy",
        )

        # Select canary group (first stage percentage)
        first_stage = config.stages[0]
        canary_count = max(1, int(len(eligible) * first_stage["pct"] / 100))
        canary_devices = eligible[:canary_count]

        self.active_rollouts[rollout_id] = {
            "config": config,
            "current_stage_idx": 0,
            "stage_started_at": datetime.utcnow(),
            "updated_devices": [d.id for d in canary_devices],
            "total_eligible": len(eligible),
        }

        # Push update to canary devices
        for device in canary_devices:
            self.fleet.schedule_update(device.id, config.model_version)

        return rollout_id

    def check_health(self, rollout_id: str) -> dict:
        """Check if rollout is healthy or needs rollback."""
        rollout = self.active_rollouts[rollout_id]
        config = rollout["config"]
        updated_ids = rollout["updated_devices"]

        # Collect telemetry from updated devices
        metrics = self.telemetry.get_recent(
            device_ids=updated_ids,
            window_hours=2,
        )

        # Compare against non-updated devices (control group)
        control_ids = self.fleet.get_devices_not_in(updated_ids,
            hardware_class=config.target_hardware_class)
        control_metrics = self.telemetry.get_recent(
            device_ids=[d.id for d in control_ids[:100]],
            window_hours=2,
        )

        # Check thresholds
        issues = []
        thresholds = config.rollback_thresholds

        if metrics["latency_p95"] > control_metrics["latency_p95"] * (1 + thresholds["max_latency_p95_increase_pct"] / 100):
            issues.append(f"Latency P95 regression: {metrics['latency_p95']:.1f}ms vs control {control_metrics['latency_p95']:.1f}ms")

        if metrics.get("error_rate", 0) > control_metrics.get("error_rate", 0) * (1 + thresholds["max_error_rate_increase_pct"] / 100):
            issues.append(f"Error rate increase: {metrics['error_rate']:.2%}")

        return {
            "healthy": len(issues) == 0,
            "issues": issues,
            "updated_count": len(updated_ids),
            "total_eligible": rollout["total_eligible"],
            "current_stage": config.stages[rollout["current_stage_idx"]]["stage"],
        }

    def rollback(self, rollout_id: str) -> dict:
        """Roll back all updated devices to previous model version."""
        rollout = self.active_rollouts[rollout_id]
        updated_ids = rollout["updated_devices"]

        for device_id in updated_ids:
            self.fleet.trigger_rollback(device_id)

        rollout["current_stage_idx"] = -1  # rolled back
        return {
            "rolled_back_count": len(updated_ids),
            "status": "rolled_back",
        }`
        },

        // ── Section 3: Fleet Management ──
        {
          type: "heading",
          text: "Fleet Management"
        },
        {
          type: "text",
          text: "Fleet management is the control plane for your edge devices. It tracks: which devices exist (inventory), what hardware they have (capability detection), what model version they're running (deployment state), and whether they're healthy (status monitoring). The fleet registry is the single source of truth that CI/CD pipelines, rollout managers, and monitoring systems all query."
        },
        {
          type: "text",
          text: "Key design decisions: (1) Device grouping — group by hardware class (all Jetson Orins), by deployment environment (factory vs. field), by geography, or by customer. Rollouts target groups, not individual devices. (2) Desired state vs. actual state — the fleet registry records the desired model version per group and the actual model version per device. A reconciliation loop detects drift (device running wrong version) and triggers re-deployment. (3) Offline handling — edge devices go offline for hours or days. Queue updates and apply them when the device reconnects. Track pending updates and their age."
        },
        {
          type: "code",
          lang: "python",
          filename: "fleet_registry.py",
          code: `"""
Fleet registry — single source of truth for edge device fleet.
"""
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional


@dataclass
class EdgeDevice:
    """A single edge device in the fleet."""
    device_id: str
    hardware_class: str          # "jetson-orin", "rpi5-cortex-a76"
    hardware_serial: str
    location: str                # "factory-floor-3", "vehicle-042"
    group: str                   # "production-orin", "staging-arm"
    current_model_version: str
    desired_model_version: str
    status: str = "healthy"      # healthy, degraded, offline, updating
    last_heartbeat: Optional[datetime] = None
    last_update: Optional[datetime] = None
    capabilities: dict = field(default_factory=dict)  # NPU type, memory, etc.
    pending_update: Optional[str] = None


class FleetRegistry:
    """Manage the fleet of edge devices."""

    def __init__(self, db):
        self.db = db

    def register_device(self, device: EdgeDevice):
        """Register a new device or update an existing one."""
        self.db.upsert("devices", device.device_id, device.__dict__)

    def get_devices(self, hardware_class: str = None,
                    group: str = None, status: str = None) -> list[EdgeDevice]:
        """Query devices by hardware class, group, or status."""
        filters = {}
        if hardware_class:
            filters["hardware_class"] = hardware_class
        if group:
            filters["group"] = group
        if status:
            filters["status"] = status
        return self.db.query("devices", filters)

    def get_drift_report(self) -> list[dict]:
        """Find devices where actual != desired model version."""
        all_devices = self.db.query("devices", {})
        drifted = []
        for d in all_devices:
            if d.current_model_version != d.desired_model_version:
                drifted.append({
                    "device_id": d.device_id,
                    "current": d.current_model_version,
                    "desired": d.desired_model_version,
                    "status": d.status,
                    "last_heartbeat": d.last_heartbeat,
                    "pending_since": d.last_update,
                })
        return drifted

    def set_desired_version(self, group: str, model_version: str):
        """Set the desired model version for a device group."""
        devices = self.get_devices(group=group)
        for device in devices:
            device.desired_model_version = model_version
            if device.current_model_version != model_version:
                device.pending_update = model_version
            self.register_device(device)
        return len(devices)

    def heartbeat(self, device_id: str, status: dict):
        """Process a device heartbeat — update status, model version."""
        device = self.db.get("devices", device_id)
        if not device:
            return
        device.last_heartbeat = datetime.utcnow()
        device.status = status.get("health", "healthy")
        device.current_model_version = status.get("model_version",
                                                    device.current_model_version)

        # Clear pending update if device has applied it
        if device.current_model_version == device.desired_model_version:
            device.pending_update = None

        self.register_device(device)`
        },

        {
          type: "callout",
          variant: "tip",
          title: "Key Takeaways",
          text: "OTA for edge ML requires delta updates (60-90% bandwidth savings), A/B partitioning (instant rollback), and staged rollouts (canary → staged → full). Group devices by hardware class for rollouts — never update all device types simultaneously. The fleet registry is your control plane: track desired vs. actual state, detect drift, and queue updates for offline devices. Always compare updated devices against a control group to detect regressions."
        },
      ],
    },


    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 5 — Edge Observability & Drift Detection
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "edge-observability-drift",
      title: "Edge Observability & Drift Detection",
      readTime: "18 min",
      content: [
        {
          type: "text",
          text: "Edge ML systems operate far from your monitoring infrastructure. Devices connect intermittently, bandwidth is limited, and you cannot SSH into every camera or sensor to debug issues. Observability for edge ML means designing telemetry that fits bandwidth constraints, detecting model degradation from proxy metrics (since you often lack ground truth labels), and building alerting pipelines that surface problems before users notice them."
        },

        // ── Section 1: On-Device Telemetry ──
        {
          type: "heading",
          text: "On-Device Telemetry Design"
        },
        {
          type: "text",
          text: "The telemetry you collect on device must balance signal quality against bandwidth cost. You cannot stream every inference result to the cloud — a camera at 30 FPS producing 1KB of telemetry per frame generates 2.5GB per day. Instead, collect aggregated statistics on device and report periodically. The core telemetry set: (1) Inference latency histogram (P50, P95, P99 per reporting period), (2) Prediction confidence distribution (histogram of softmax max values), (3) Input statistics (mean, variance, min, max of input tensors — detects sensor drift), (4) Error counts (failed inferences, out-of-memory events, timeout events), (5) System metrics (CPU/GPU utilization, temperature, memory usage)."
        },
        {
          type: "code",
          lang: "python",
          filename: "edge_telemetry.py",
          code: `"""
Lightweight on-device telemetry collector for edge ML.
Aggregates statistics locally, reports periodically to reduce bandwidth.
"""
import time
import json
import numpy as np
from collections import deque
from dataclasses import dataclass, field, asdict
from threading import Lock


@dataclass
class TelemetryWindow:
    """Aggregated telemetry for a single reporting window."""
    window_start: float = 0
    window_end: float = 0
    inference_count: int = 0

    # Latency statistics (milliseconds)
    latency_p50: float = 0
    latency_p95: float = 0
    latency_p99: float = 0
    latency_mean: float = 0

    # Confidence distribution
    confidence_mean: float = 0
    confidence_std: float = 0
    low_confidence_count: int = 0     # below threshold
    low_confidence_pct: float = 0

    # Input statistics (detect sensor drift)
    input_mean: float = 0
    input_std: float = 0
    input_min: float = 0
    input_max: float = 0

    # Class distribution
    class_counts: dict = field(default_factory=dict)

    # Errors
    error_count: int = 0
    timeout_count: int = 0
    oom_count: int = 0

    # System
    cpu_utilization_pct: float = 0
    gpu_utilization_pct: float = 0
    temperature_celsius: float = 0
    memory_used_mb: float = 0


class EdgeTelemetryCollector:
    """Collect and aggregate inference telemetry on-device."""

    def __init__(self, window_seconds: int = 300,
                 confidence_threshold: float = 0.5,
                 max_buffer_size: int = 10000):
        self.window_seconds = window_seconds
        self.confidence_threshold = confidence_threshold
        self.max_buffer_size = max_buffer_size

        self._latencies = deque(maxlen=max_buffer_size)
        self._confidences = deque(maxlen=max_buffer_size)
        self._input_stats = deque(maxlen=max_buffer_size)
        self._class_preds = deque(maxlen=max_buffer_size)
        self._errors = {"error": 0, "timeout": 0, "oom": 0}
        self._lock = Lock()
        self._window_start = time.time()

    def record_inference(self, latency_ms: float, confidence: float,
                         predicted_class: str, input_tensor: np.ndarray = None):
        """Record a single inference result."""
        with self._lock:
            self._latencies.append(latency_ms)
            self._confidences.append(confidence)
            self._class_preds.append(predicted_class)
            if input_tensor is not None:
                self._input_stats.append({
                    "mean": float(input_tensor.mean()),
                    "std": float(input_tensor.std()),
                    "min": float(input_tensor.min()),
                    "max": float(input_tensor.max()),
                })

    def record_error(self, error_type: str = "error"):
        """Record an inference error."""
        with self._lock:
            if error_type in self._errors:
                self._errors[error_type] += 1

    def flush(self) -> TelemetryWindow:
        """Aggregate current window and reset for next period."""
        with self._lock:
            now = time.time()
            latencies = np.array(self._latencies) if self._latencies else np.array([0])
            confidences = np.array(self._confidences) if self._confidences else np.array([0])

            # Count classes
            class_counts = {}
            for cls in self._class_preds:
                class_counts[cls] = class_counts.get(cls, 0) + 1

            # Input statistics
            input_means = [s["mean"] for s in self._input_stats]
            input_stds = [s["std"] for s in self._input_stats]

            low_conf = sum(1 for c in confidences if c < self.confidence_threshold)

            window = TelemetryWindow(
                window_start=self._window_start,
                window_end=now,
                inference_count=len(self._latencies),
                latency_p50=float(np.percentile(latencies, 50)),
                latency_p95=float(np.percentile(latencies, 95)),
                latency_p99=float(np.percentile(latencies, 99)),
                latency_mean=float(np.mean(latencies)),
                confidence_mean=float(np.mean(confidences)),
                confidence_std=float(np.std(confidences)),
                low_confidence_count=low_conf,
                low_confidence_pct=low_conf / max(len(confidences), 1) * 100,
                input_mean=float(np.mean(input_means)) if input_means else 0,
                input_std=float(np.mean(input_stds)) if input_stds else 0,
                class_counts=class_counts,
                error_count=self._errors["error"],
                timeout_count=self._errors["timeout"],
                oom_count=self._errors["oom"],
            )

            # Reset for next window
            self._latencies.clear()
            self._confidences.clear()
            self._input_stats.clear()
            self._class_preds.clear()
            self._errors = {"error": 0, "timeout": 0, "oom": 0}
            self._window_start = now

            return window

    def export_json(self) -> str:
        """Export current window as compact JSON for transmission."""
        window = self.flush()
        return json.dumps(asdict(window), separators=(",", ":"))`
        },

        // ── Section 2: Drift Detection Without Labels ──
        {
          type: "heading",
          text: "Drift Detection Without Ground Truth"
        },
        {
          type: "text",
          text: "In cloud ML, you can compare predictions against ground truth labels to detect accuracy degradation. At the edge, ground truth is rarely available — nobody is labeling camera frames in real time. You must detect drift from proxy metrics that correlate with model degradation."
        },
        {
          type: "text",
          text: "The three most reliable proxy signals: (1) Confidence distribution shift — if the model's average confidence drops or the distribution changes shape, the model is seeing data it wasn't trained on. Track the mean, standard deviation, and percentile distribution of confidence scores over time. (2) Prediction distribution shift — if a detection model that typically finds 60% cars, 30% trucks, 10% pedestrians suddenly reports 40% cars, 20% trucks, 40% unknown, something changed. Use chi-squared or Jensen-Shannon divergence to detect distribution shifts. (3) Input distribution shift — if the mean pixel intensity, variance, or frequency spectrum of input images changes, the sensor or environment has changed (new camera angle, lighting change, lens degradation)."
        },
        {
          type: "code",
          lang: "python",
          filename: "drift_detector.py",
          code: `"""
Lightweight drift detection for edge ML — no ground truth required.
Detects shifts in confidence, prediction, and input distributions.
"""
import numpy as np
from scipy import stats
from dataclasses import dataclass


@dataclass
class DriftResult:
    """Result of a drift detection check."""
    metric_name: str
    drift_detected: bool
    score: float               # drift magnitude
    threshold: float
    p_value: float = None      # statistical significance
    details: str = ""


class EdgeDriftDetector:
    """Detect distribution shifts from telemetry data."""

    def __init__(self, reference_window: dict):
        """
        Initialize with a reference window (baseline from deployment time).
        reference_window: {
            "confidence_mean": 0.85,
            "confidence_std": 0.12,
            "confidence_histogram": [0.01, 0.02, 0.05, 0.12, 0.80],  # 5 bins
            "class_distribution": {"car": 0.6, "truck": 0.3, "person": 0.1},
            "input_mean": 128.5,
            "input_std": 45.2,
        }
        """
        self.reference = reference_window

    def check_confidence_drift(self, current_confidences: list[float],
                                threshold: float = 0.05) -> DriftResult:
        """
        Detect confidence distribution shift using KS test.
        A significant shift suggests the model is seeing OOD data.
        """
        # Generate reference samples from stored statistics
        ref_samples = np.random.normal(
            self.reference["confidence_mean"],
            self.reference["confidence_std"],
            size=len(current_confidences)
        )
        ref_samples = np.clip(ref_samples, 0, 1)

        ks_stat, p_value = stats.ks_2samp(current_confidences, ref_samples)

        return DriftResult(
            metric_name="confidence_distribution",
            drift_detected=p_value < threshold,
            score=ks_stat,
            threshold=threshold,
            p_value=p_value,
            details=f"KS statistic: {ks_stat:.4f}, "
                    f"current mean: {np.mean(current_confidences):.3f} "
                    f"(ref: {self.reference['confidence_mean']:.3f})"
        )

    def check_prediction_drift(self, current_class_counts: dict,
                                threshold: float = 0.1) -> DriftResult:
        """
        Detect prediction distribution shift using Jensen-Shannon divergence.
        A significant shift suggests the environment has changed.
        """
        ref_dist = self.reference["class_distribution"]
        all_classes = set(list(ref_dist.keys()) + list(current_class_counts.keys()))

        # Normalize current counts to distribution
        total = sum(current_class_counts.values()) or 1
        current_dist = {c: current_class_counts.get(c, 0) / total
                        for c in all_classes}

        # Compute JS divergence
        p = np.array([ref_dist.get(c, 1e-10) for c in sorted(all_classes)])
        q = np.array([current_dist.get(c, 1e-10) for c in sorted(all_classes)])

        # Normalize
        p = p / p.sum()
        q = q / q.sum()

        # Jensen-Shannon divergence
        m = 0.5 * (p + q)
        js_div = 0.5 * (stats.entropy(p, m) + stats.entropy(q, m))

        return DriftResult(
            metric_name="prediction_distribution",
            drift_detected=js_div > threshold,
            score=js_div,
            threshold=threshold,
            details=f"JS divergence: {js_div:.4f}, "
                    f"current: {dict(sorted(current_dist.items()))}"
        )

    def check_input_drift(self, current_input_mean: float,
                           current_input_std: float,
                           z_threshold: float = 3.0) -> DriftResult:
        """
        Detect input distribution shift using z-score.
        A significant shift suggests sensor or environment change.
        """
        ref_mean = self.reference["input_mean"]
        ref_std = self.reference["input_std"]

        z_score = abs(current_input_mean - ref_mean) / (ref_std + 1e-8)

        return DriftResult(
            metric_name="input_distribution",
            drift_detected=z_score > z_threshold,
            score=z_score,
            threshold=z_threshold,
            details=f"Input mean: {current_input_mean:.1f} "
                    f"(ref: {ref_mean:.1f}), z-score: {z_score:.2f}"
        )

    def check_all(self, telemetry_window: dict) -> list[DriftResult]:
        """Run all drift checks on a telemetry window."""
        results = []

        if "confidences" in telemetry_window:
            results.append(self.check_confidence_drift(
                telemetry_window["confidences"]))

        if "class_counts" in telemetry_window:
            results.append(self.check_prediction_drift(
                telemetry_window["class_counts"]))

        if "input_mean" in telemetry_window:
            results.append(self.check_input_drift(
                telemetry_window["input_mean"],
                telemetry_window.get("input_std", 0)))

        return results`
        },

        // ── Section 3: Centralized Monitoring Pipeline ──
        {
          type: "heading",
          text: "Centralized Monitoring Pipeline"
        },
        {
          type: "text",
          text: "The monitoring pipeline collects telemetry from all edge devices, stores it in a time-series database, runs drift detection and anomaly detection, and triggers alerts. Architecture: devices report telemetry windows via HTTPS POST (or MQTT for constrained devices) → an ingestion service validates and stores in a time-series DB (InfluxDB, TimescaleDB, or Prometheus with remote write) → a drift detection worker periodically analyzes aggregated telemetry per device group → alerts fire to PagerDuty/Slack when drift or anomalies are detected → a Grafana dashboard provides fleet-wide visibility."
        },
        {
          type: "text",
          text: "Key alerting rules for edge ML: (1) Latency P95 increased >20% vs. baseline for any hardware group → possible compiler regression or thermal issue. (2) Average confidence dropped >10% for a device group → data drift, model degradation, or sensor issue. (3) Error rate >1% for any device → hardware failure, OOM, or model corruption. (4) Prediction distribution JS-divergence >0.15 → significant environment change. (5) Device offline >24h → hardware failure or network issue."
        },
        {
          type: "code",
          lang: "python",
          filename: "monitoring_pipeline.py",
          code: `"""
Centralized monitoring pipeline — ingest, analyze, alert.
"""
from dataclasses import dataclass
from datetime import datetime, timedelta


@dataclass
class AlertRule:
    """A monitoring alert rule."""
    name: str
    metric: str
    condition: str       # "gt" (greater than) or "lt" (less than)
    threshold: float
    window_minutes: int
    group_by: str        # "hardware_class", "device_group", "device_id"
    severity: str        # "critical", "warning", "info"


class MonitoringPipeline:
    """Ingest telemetry, detect anomalies, fire alerts."""

    DEFAULT_RULES = [
        AlertRule("latency_regression", "latency_p95",
                  "gt", 1.20, 30, "hardware_class", "critical"),
        AlertRule("confidence_drop", "confidence_mean",
                  "lt", 0.70, 60, "hardware_class", "warning"),
        AlertRule("high_error_rate", "error_rate",
                  "gt", 0.01, 15, "device_group", "critical"),
        AlertRule("prediction_drift", "js_divergence",
                  "gt", 0.15, 60, "hardware_class", "warning"),
        AlertRule("device_offline", "heartbeat_age_hours",
                  "gt", 24, 0, "device_id", "warning"),
    ]

    def __init__(self, tsdb, alerter, rules=None):
        self.tsdb = tsdb
        self.alerter = alerter
        self.rules = rules or self.DEFAULT_RULES

    def ingest(self, device_id: str, telemetry: dict):
        """Ingest a telemetry window from an edge device."""
        # Store raw metrics
        self.tsdb.write(
            measurement="edge_inference",
            tags={"device_id": device_id,
                  "hardware_class": telemetry.get("hardware_class", "unknown")},
            fields={
                "latency_p50": telemetry["latency_p50"],
                "latency_p95": telemetry["latency_p95"],
                "latency_p99": telemetry["latency_p99"],
                "confidence_mean": telemetry["confidence_mean"],
                "confidence_std": telemetry["confidence_std"],
                "low_confidence_pct": telemetry["low_confidence_pct"],
                "inference_count": telemetry["inference_count"],
                "error_count": telemetry["error_count"],
            },
            timestamp=telemetry["window_end"],
        )

    def evaluate_rules(self):
        """Evaluate all alert rules against recent telemetry."""
        fired = []
        for rule in self.rules:
            groups = self.tsdb.group_by(
                measurement="edge_inference",
                field=rule.metric,
                group_by=rule.group_by,
                window_minutes=rule.window_minutes,
            )
            for group_key, value in groups.items():
                triggered = (
                    (rule.condition == "gt" and value > rule.threshold) or
                    (rule.condition == "lt" and value < rule.threshold)
                )
                if triggered:
                    alert = {
                        "rule": rule.name,
                        "severity": rule.severity,
                        "group": group_key,
                        "value": value,
                        "threshold": rule.threshold,
                        "timestamp": datetime.utcnow().isoformat(),
                    }
                    self.alerter.fire(alert)
                    fired.append(alert)
        return fired`
        },

        {
          type: "callout",
          variant: "tip",
          title: "Key Takeaways",
          text: "Edge observability requires on-device aggregation (bandwidth is expensive), proxy metrics for drift detection (ground truth is unavailable), and a centralized pipeline for fleet-wide visibility. The three most reliable drift signals: confidence distribution shift, prediction distribution shift, and input distribution shift. Alert on latency regressions, confidence drops, error rates, and prediction drift — always compare against a baseline, not absolute thresholds."
        },
      ],
    },


    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 6 — Reproducibility, Security & Cost Optimization
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "reproducibility-security-cost",
      title: "Reproducibility, Security & Cost Optimization",
      readTime: "16 min",
      content: [
        {
          type: "text",
          text: "The final operational concerns for edge ML at scale: ensuring builds are deterministic, securing model artifacts from tampering, and keeping infrastructure costs under control. These topics are often afterthoughts but become critical as you scale from a prototype to thousands of deployed devices."
        },

        // ── Section 1: Deterministic Builds ──
        {
          type: "heading",
          text: "Deterministic Compilation"
        },
        {
          type: "text",
          text: "A deterministic build means: given the same source model, compiler version, and configuration, you get byte-identical output every time. This matters for three reasons: (1) Artifact caching — if builds are deterministic, you can skip recompilation when the inputs haven't changed. (2) Auditing — you can verify that a deployed artifact was produced by your CI pipeline by reproducing the build. (3) Debugging — when investigating a production issue, you need to reproduce the exact binary running on the device."
        },
        {
          type: "text",
          text: "Sources of non-determinism in ML compilation: (1) Floating-point operation ordering — parallel compilation may reorder FP additions, producing different rounding. Fix: use deterministic thread scheduling or single-threaded compilation for release builds. (2) Timestamps embedded in artifacts — some compilers embed build timestamps. Fix: use SOURCE_DATE_EPOCH to set a fixed timestamp. (3) Random seeds in auto-tuning — TVM's tuning uses random search. Fix: pin seeds or use pre-tuned schedules. (4) ASLR and pointer-based hashing — hash tables ordered by pointer address change between runs. Fix: use sorted containers or disable ASLR in build containers."
        },
        {
          type: "code",
          lang: "python",
          filename: "deterministic_build.py",
          code: `"""
Deterministic compilation pipeline — byte-identical outputs.
"""
import os
import hashlib
import json
import subprocess
from pathlib import Path


class DeterministicCompiler:
    """Wrapper that ensures deterministic ML model compilation."""

    def __init__(self, cache_dir: str = ".compile_cache"):
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(exist_ok=True)

    def compile(self, model_path: str, target: str,
                compiler: str, config: dict) -> str:
        """
        Compile model deterministically.
        Returns path to compiled artifact.
        """
        # Compute cache key from all inputs
        cache_key = self._cache_key(model_path, target, compiler, config)
        cached = self.cache_dir / f"{cache_key}.bin"

        if cached.exists():
            print(f"Cache hit: {cache_key[:12]}...")
            return str(cached)

        # Set determinism environment variables
        env = os.environ.copy()
        env["SOURCE_DATE_EPOCH"] = "0"           # fixed timestamp
        env["PYTHONHASHSEED"] = "42"             # deterministic hashing
        env["TVM_NUM_THREADS"] = "1"             # single-thread for determinism
        env["OMP_NUM_THREADS"] = "1"
        env["TF_DETERMINISTIC_OPS"] = "1"        # TF deterministic mode
        env["CUBLAS_WORKSPACE_CONFIG"] = ":4096:8"  # CUDA deterministic

        # Compile
        output_path = str(self.cache_dir / f"{cache_key}.bin")
        result = subprocess.run(
            [
                "python", "scripts/compile_model.py",
                "--model", model_path,
                "--target", target,
                "--compiler", compiler,
                "--config", json.dumps(config),
                "--output", output_path,
            ],
            env=env,
            capture_output=True,
            text=True,
        )

        if result.returncode != 0:
            raise RuntimeError(f"Compilation failed: {result.stderr}")

        # Verify determinism: compile again and compare hashes
        verify_path = str(self.cache_dir / f"{cache_key}_verify.bin")
        subprocess.run(
            [
                "python", "scripts/compile_model.py",
                "--model", model_path,
                "--target", target,
                "--compiler", compiler,
                "--config", json.dumps(config),
                "--output", verify_path,
            ],
            env=env,
            capture_output=True,
        )

        hash1 = self._hash_file(output_path)
        hash2 = self._hash_file(verify_path)

        if hash1 != hash2:
            print(f"WARNING: Non-deterministic build detected! "
                  f"{hash1[:12]} != {hash2[:12]}")
        else:
            print(f"Determinism verified: {hash1[:12]}")

        # Clean up verify file
        Path(verify_path).unlink(missing_ok=True)

        return output_path

    def _cache_key(self, model_path, target, compiler, config) -> str:
        """Compute cache key from all compilation inputs."""
        model_hash = self._hash_file(model_path)
        config_str = json.dumps(config, sort_keys=True)
        key_input = f"{model_hash}:{target}:{compiler}:{config_str}"
        return hashlib.sha256(key_input.encode()).hexdigest()

    @staticmethod
    def _hash_file(path: str) -> str:
        h = hashlib.sha256()
        with open(path, "rb") as f:
            for chunk in iter(lambda: f.read(8192), b""):
                h.update(chunk)
        return h.hexdigest()`
        },

        // ── Section 2: Model Security ──
        {
          type: "heading",
          text: "Model Security: Signing and Attestation"
        },
        {
          type: "text",
          text: "Edge devices are physically accessible to attackers. A compromised model — one that has been tampered with to misclassify stop signs, for example — is a safety and security risk. Protect against this with three mechanisms: (1) Model signing — sign every compiled artifact with a private key. The device verifies the signature before loading the model. (2) Secure boot chain — extend the device's secure boot to include ML model verification. The bootloader verifies the OS, the OS verifies the inference runtime, the runtime verifies the model. (3) Encrypted storage — encrypt model files at rest on device. Decrypt only into a secure enclave or TEE (Trusted Execution Environment) for inference."
        },
        {
          type: "code",
          lang: "python",
          filename: "model_signing.py",
          code: `"""
Model artifact signing and verification.
Uses Ed25519 for fast, compact signatures.
"""
from pathlib import Path
from cryptography.hazmat.primitives.asymmetric.ed25519 import (
    Ed25519PrivateKey,
    Ed25519PublicKey,
)
from cryptography.hazmat.primitives import serialization
import json
import hashlib


class ModelSigner:
    """Sign compiled model artifacts for secure edge deployment."""

    def __init__(self, private_key_path: str):
        with open(private_key_path, "rb") as f:
            self.private_key = serialization.load_pem_private_key(
                f.read(), password=None
            )

    def sign_artifact(self, artifact_path: str, metadata: dict) -> dict:
        """
        Sign a model artifact. Returns a manifest with signature.

        The manifest contains:
        - artifact hash (SHA-256)
        - metadata (target, compiler, version, etc.)
        - signature over (hash + metadata)
        """
        artifact_hash = self._hash_file(artifact_path)

        # Create the signing payload: hash + metadata
        payload = json.dumps({
            "artifact_hash": artifact_hash,
            "metadata": metadata,
        }, sort_keys=True).encode()

        # Sign
        signature = self.private_key.sign(payload)

        return {
            "artifact_hash": artifact_hash,
            "artifact_size": Path(artifact_path).stat().st_size,
            "metadata": metadata,
            "signature": signature.hex(),
            "payload": payload.decode(),
        }

    @staticmethod
    def _hash_file(path: str) -> str:
        h = hashlib.sha256()
        with open(path, "rb") as f:
            for chunk in iter(lambda: f.read(8192), b""):
                h.update(chunk)
        return h.hexdigest()


class ModelVerifier:
    """Verify signed model artifacts on edge devices."""

    def __init__(self, public_key_path: str):
        with open(public_key_path, "rb") as f:
            self.public_key = serialization.load_pem_public_key(f.read())

    def verify_artifact(self, artifact_path: str, manifest: dict) -> dict:
        """
        Verify a model artifact against its signed manifest.

        Returns: {"valid": bool, "reason": str}
        """
        # 1. Verify artifact hash
        actual_hash = ModelSigner._hash_file(artifact_path)
        if actual_hash != manifest["artifact_hash"]:
            return {
                "valid": False,
                "reason": f"Hash mismatch: expected {manifest['artifact_hash'][:16]}, "
                          f"got {actual_hash[:16]}"
            }

        # 2. Verify signature
        try:
            payload = manifest["payload"].encode()
            signature = bytes.fromhex(manifest["signature"])
            self.public_key.verify(signature, payload)
        except Exception as e:
            return {
                "valid": False,
                "reason": f"Signature verification failed: {e}"
            }

        return {"valid": True, "reason": "Artifact verified successfully"}`
        },

        // ── Section 3: Cost Optimization ──
        {
          type: "heading",
          text: "Cost Optimization"
        },
        {
          type: "text",
          text: "The biggest cost drivers in edge ML infrastructure: (1) Auto-tuning compute — TVM MetaSchedule tuning can take 2-8 hours of GPU time per model per target. At $3/hour for a GPU instance, tuning 5 models for 5 targets costs $150-$600 per tuning cycle. Mitigate: use transfer learning (tune on one model, transfer schedules to similar models), cache tuning results, use spot instances. (2) CI compute — matrix builds across targets add up. Mitigate: cache compiled artifacts aggressively, skip unchanged targets, use incremental compilation. (3) OTA bandwidth — cellular data at scale is expensive. Mitigate: delta updates, compression, WiFi-only for large updates. (4) Device hardware — benchmark devices need to be dedicated. Mitigate: share a smaller device farm across teams, schedule benchmark jobs to maximize utilization."
        },
        {
          type: "code",
          lang: "python",
          filename: "cost_optimizer.py",
          code: `"""
Cost optimization strategies for edge ML infrastructure.
"""


class CIArtifactCache:
    """
    Cache compiled artifacts to avoid redundant recompilation.
    Cache key = hash(model_onnx) + compiler_version + target + flags

    Typical savings: 80-90% of CI time when only model weights change
    (same architecture → same compilation, just different weights).
    """

    def __init__(self, storage_backend):
        self.storage = storage_backend

    def get_or_compile(self, model_hash: str, compiler: str,
                       target: str, flags: dict, compile_fn) -> str:
        """Return cached artifact or compile and cache."""
        import json, hashlib

        key_input = f"{model_hash}:{compiler}:{target}:{json.dumps(flags, sort_keys=True)}"
        cache_key = hashlib.sha256(key_input.encode()).hexdigest()

        # Check cache
        cached_path = self.storage.get(cache_key)
        if cached_path:
            print(f"Cache HIT for {target} [{cache_key[:8]}]")
            return cached_path

        # Compile
        print(f"Cache MISS for {target} [{cache_key[:8]}], compiling...")
        artifact_path = compile_fn()

        # Store in cache
        self.storage.put(cache_key, artifact_path)
        return artifact_path


class SpotInstanceTuner:
    """
    Run auto-tuning on spot instances to reduce cost by 60-80%.

    Strategy:
    - Use spot instances for tuning (interruptible, checkpointed)
    - Save tuning progress periodically
    - Resume from checkpoint on new spot instance if interrupted
    """

    def __init__(self, cloud_provider, checkpoint_bucket: str):
        self.cloud = cloud_provider
        self.checkpoint_bucket = checkpoint_bucket

    def tune_with_spot(self, model_path: str, target: str,
                       max_trials: int = 2000):
        """Run TVM MetaSchedule tuning on a spot instance."""
        # Check for existing checkpoint
        checkpoint = self.cloud.storage.get(
            f"{self.checkpoint_bucket}/tune_{target}_checkpoint.json"
        )
        completed_trials = checkpoint.get("completed", 0) if checkpoint else 0

        if completed_trials >= max_trials:
            print(f"Tuning already complete: {completed_trials} trials")
            return checkpoint["best_schedule_path"]

        # Launch spot instance
        instance = self.cloud.launch_spot(
            instance_type="g5.xlarge",     # GPU for tuning
            max_price_per_hour=1.50,       # 60% below on-demand
            startup_script=self._tuning_script(
                model_path, target,
                start_trial=completed_trials,
                max_trials=max_trials,
            ),
        )

        print(f"Tuning on spot instance {instance.id} "
              f"(starting from trial {completed_trials})")
        return instance

    def _tuning_script(self, model_path, target, start_trial, max_trials):
        return f"""
import tvm
from tvm import meta_schedule as ms

# Load model and resume from checkpoint
work_dir = "/tmp/tune_workdir"
database = ms.database.JSONDatabase(work_dir=work_dir)

# Checkpoint every 100 trials
with ms.Profiler() as profiler:
    database = ms.tune_tir(
        mod=tvm.IRModule.from_expr(...),
        target="{target}",
        work_dir=work_dir,
        max_trials_global={max_trials - start_trial},
    )

# Upload checkpoint
# ... (upload to {self.checkpoint_bucket})
"""`
        },

        {
          type: "list",
          items: [
            "Cache compiled artifacts by (model_hash + compiler + target + flags) — skip recompilation on cache hit",
            "Use spot instances for auto-tuning with periodic checkpointing — 60-80% cost reduction",
            "Implement incremental compilation — only recompile operators that changed",
            "Delta OTA updates save 60-90% bandwidth vs. full model replacement",
            "Schedule benchmark jobs to maximize device farm utilization (batch similar targets)",
            "Use transfer learning for tuning — tune one model, transfer schedules to similar architectures",
          ]
        },

        {
          type: "callout",
          variant: "tip",
          title: "Key Takeaways",
          text: "Deterministic builds enable caching, auditing, and debugging — pin compiler versions, seeds, and thread counts. Sign every model artifact and verify on device before loading. The biggest cost drivers are auto-tuning compute and OTA bandwidth — use spot instances with checkpointing for tuning, delta updates for OTA. Cache aggressively at every level: ONNX exports, compiled artifacts, and tuning schedules."
        },
      ],
    },

  ];
})();
