// Patches the Edge Deployment module (m18) with full tutorial lesson content.
// Loaded after curriculum.js. m18 = CURRICULUM.phases[5].modules[2]
(function patchEdgeDeploymentLessons() {
  const m = CURRICULUM.phases[5].modules[2]; // phase-6 (index 5), third module (m18)

  m.lessons = [

    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 1 — Edge Hardware Landscape & Compute Trade-offs
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "edge-hardware-landscape",
      title: "Edge Hardware Landscape & Compute Trade-offs",
      readTime: "18 min",
      content: [
        {
          type: "text",
          text: "Edge inference is not a single problem — it is a family of wildly different problems unified only by the constraint that compute happens near the data source rather than in a data center. The hardware landscape spans four orders of magnitude in both power budget and compute capability, from a 100 mW Cortex-M microcontroller running a keyword spotter to a 60 W NVIDIA Jetson AGX Orin running multi-stream video analytics. Choosing the wrong hardware platform is the single most expensive mistake in an edge AI project, because it locks you into a specific inference engine, memory budget, and thermal envelope that are nearly impossible to change after deployment."
        },
        {
          type: "callout",
          variant: "info",
          title: "The Edge Spectrum",
          text: "Edge devices are not a category — they are a spectrum. A Raspberry Pi 5 (~10 TOPS CPU+GPU) sits in a completely different design space than a Google Coral Edge TPU (~4 TOPS INT8 only) or a Qualcomm Snapdragon 8 Gen 3 (~73 TOPS across CPU+GPU+Hexagon NPU). Understanding the compute architecture determines which models you can deploy, which inference engines you can use, and whether you can achieve real-time performance."
        },

        // ── Section 1: ARM Architecture for ML ──
        {
          type: "heading",
          text: "ARM Architecture for ML Inference"
        },
        {
          type: "text",
          text: "ARM dominates edge AI because of power efficiency. The architecture splits into two families relevant to ML:\n\n**Cortex-A (Application processors):** Found in phones, tablets, Raspberry Pi, and Jetson. These are full Linux-capable cores with NEON SIMD units (128-bit, processes 16 INT8 ops per cycle) and optional SVE/SVE2 extensions. The A-series can run any inference framework — TFLite, ONNX Runtime, PyTorch Mobile. Cortex-A78AE is the automotive variant with lockstep cores for safety-critical inference.\n\n**Cortex-M (Microcontrollers):** Found in sensors, wearables, and tiny IoT devices. These run bare-metal or RTOS (no Linux). RAM is measured in KB (256 KB-2 MB typical). Only TFLite Micro and CMSIS-NN run here. Models must be under ~1 MB. Use cases: keyword spotting, anomaly detection, gesture recognition. The M55 added Helium (M-Profile Vector Extension) for 8x INT8 throughput over M4."
        },
        {
          type: "text",
          text: "The critical performance metric on ARM is not TOPS — it is memory bandwidth utilization. A Cortex-A76 can do ~30 GOPS INT8 but only has ~15 GB/s LPDDR4X bandwidth. A quantized MobileNetV2 forward pass reads ~3.4 MB of weights. At 30 inferences/sec, that is 102 MB/s of weight reads alone — well within bandwidth. But a ResNet-50 at INT8 is ~25 MB of weights; 30 inferences/sec = 750 MB/s just for weights. Add activations and you start competing with other system traffic."
        },

        // ── Section 2: GPU and DSP Accelerators ──
        {
          type: "heading",
          text: "GPU and DSP Accelerators on Mobile/Edge"
        },
        {
          type: "text",
          text: "Modern mobile SoCs are heterogeneous — they contain CPU, GPU, DSP, and increasingly a dedicated NPU, each with different strengths:\n\n**Mobile GPUs (Adreno, Mali, Apple GPU):** General-purpose parallel compute. Good for FP16 inference via OpenCL or Metal. Apple's GPU in M-series chips supports FP16 at ~11 TFLOPS. Adreno 740 (Snapdragon 8 Gen 2) does ~3.6 TFLOPS FP16. GPUs excel at large batch sizes but have higher power draw than NPUs.\n\n**DSPs (Hexagon, CEVA):** Qualcomm's Hexagon DSP is specifically designed for fixed-point vector operations. The Hexagon Tensor Processor (HTP) in Snapdragon 8 Gen 3 delivers ~73 TOPS INT8 at much lower power than GPU inference. Key advantage: DSPs are designed for sustained throughput without thermal throttling.\n\n**Dedicated NPUs (Apple Neural Engine, Google Edge TPU, Hailo-8):** Purpose-built for tensor operations. Apple's Neural Engine does ~35 TOPS INT8 at ~5W. Google Coral Edge TPU does 4 TOPS INT8 at 2W. Hailo-8 does 26 TOPS INT8 at 2.5W. The limitation: NPUs only support a subset of operations. Unsupported ops fall back to CPU, creating pipeline stalls."
        },
        {
          type: "callout",
          variant: "warning",
          title: "The Fallback Trap",
          text: "NPUs achieve their peak TOPS only for supported operations. A single unsupported op (e.g., a custom activation or an unusual reshape) forces a round-trip to CPU: NPU → DMA transfer to system memory → CPU execution → DMA back to NPU. This can cost 1-5ms per fallback. A model with 3 unsupported ops can lose 50% of its theoretical speedup. Always check the operator support matrix before targeting an NPU."
        },

        // ── Section 3: NVIDIA Jetson Platform ──
        {
          type: "heading",
          text: "NVIDIA Jetson Platform"
        },
        {
          type: "text",
          text: "The Jetson family is the workhorse of edge AI for applications that need more compute than a phone but less than a server:\n\n**Jetson Orin Nano (4GB/8GB):** 20-40 TOPS INT8, ~7-15W TDP. The entry point for multi-model inference. Can run YOLOv8-nano at 60+ FPS with TensorRT INT8. Costs ~$200-500.\n\n**Jetson Orin NX:** 70-100 TOPS INT8, 10-25W. Sweet spot for multi-camera video analytics. Supports 2-4 simultaneous HD inference streams.\n\n**Jetson AGX Orin:** 200-275 TOPS INT8, 15-60W. The flagship. Ampere GPU with 2048 CUDA cores + 64 Tensor Cores. Can run multiple complex models simultaneously (detection + tracking + classification + action recognition). Industrial variant (AGX Orin Industrial) rated for -25°C to 85°C.\n\nAll Jetsons run JetPack SDK (Ubuntu + CUDA + cuDNN + TensorRT + DeepStream). The software stack is the real value — TensorRT integration, hardware video decoder (NVDEC for zero-CPU-cost video decode), and DeepStream SDK for multi-stream pipelines."
        },
        {
          type: "text",
          text: "**Critical Jetson performance factors:**\n\n1. **Power mode:** Jetsons have multiple power modes (e.g., 15W/30W/60W for AGX Orin). Lower power modes clock down GPU and memory, reducing throughput by 30-60%. Always benchmark in the target power mode.\n\n2. **Memory bandwidth:** Jetson Orin uses LPDDR5 with 102-205 GB/s bandwidth. For memory-bound models, this is the bottleneck, not compute TOPS.\n\n3. **DLA (Deep Learning Accelerator):** Jetsons include 1-2 DLA cores separate from the GPU. DLAs handle standard convolution/pooling/activation at lower power than GPU. You can run models on DLA + GPU simultaneously, but DLA supports fewer ops than GPU.\n\n4. **NVDEC/NVENC:** Hardware video encode/decode frees the GPU entirely for inference. A Jetson AGX Orin can decode 8x 4K30 streams in hardware with zero GPU utilization."
        },

        // ── Section 4: Power and Thermal Management ──
        {
          type: "heading",
          text: "Power and Thermal Management"
        },
        {
          type: "text",
          text: "Thermal throttling is the silent killer of edge AI performance. Every edge device has a thermal design power (TDP) that it cannot sustain indefinitely. When junction temperature exceeds the threshold (typically 85-100°C), the SoC reduces clock speeds, directly cutting throughput. A model that benchmarks at 30 FPS on a cool device may drop to 15 FPS after 5 minutes of continuous inference."
        },
        {
          type: "text",
          text: "**Mitigation strategies:**\n\n**Dynamic frequency scaling (DVFS):** Instead of running at max clock and throttling, proactively reduce clock speed to a sustainable level. On Jetson: `sudo jetson_clocks --show` to see current clocks, set custom profiles via nvpmodel. On Android: the OS handles DVFS automatically, but inference frameworks can hint at workload priority.\n\n**Model switching:** Deploy multiple model variants (e.g., YOLOv8-nano and YOLOv8-pico). When temperature exceeds a threshold, switch to the smaller model. When it cools down, switch back. This requires monitoring junction temperature:\n- Jetson: read from `/sys/devices/virtual/thermal/thermal_zone*/temp`\n- Android: `android.os.HardwarePropertiesManager`\n- Linux: `sensors` command or `hwmon` sysfs\n\n**Duty cycling:** Run inference every N frames instead of every frame. At 30 FPS camera input, running inference every 3rd frame gives 10 inference/sec while reducing compute by 67%. Use motion detection (cheap frame-diff) to trigger full-rate inference only when there is activity.\n\n**Heat spreading:** Passive heatsinks, thermal pads, and fan profiles. For outdoor deployments, consider IP67 enclosures with passive cooling only — fans fail in dusty/wet environments."
        },

        // ── Section 5: Choosing the Right Hardware ──
        {
          type: "heading",
          text: "Choosing the Right Hardware: Decision Framework"
        },
        {
          type: "text",
          text: "Use this decision tree based on your constraints:\n\n**Power budget < 500 mW → Cortex-M + TFLite Micro**\n- Models under 1 MB, simple classification/detection\n- Examples: keyword spotting, anomaly detection on vibration data\n\n**Power budget 1-5W, cost < $50 → Coral Edge TPU or Hailo-8**\n- INT8-only models, MobileNet-class complexity\n- Good for: single-stream classification, simple detection\n\n**Power budget 5-15W, need flexibility → Jetson Orin Nano or Snapdragon with NPU**\n- Multiple frameworks, model diversity, on-device training possible\n- Good for: smart cameras, robotics, drones\n\n**Power budget 15-60W, need multi-stream → Jetson AGX Orin**\n- Multi-camera, complex pipelines (detection + tracking + classification)\n- Good for: video analytics, autonomous machines, industrial inspection\n\n**Phone/tablet deployment → Target NPU via NNAPI (Android) or CoreML (iOS)**\n- Leverage existing hardware, massive installed base\n- Constraint: model must use NPU-supported ops or performance craters"
        },
        {
          type: "callout",
          variant: "tip",
          title: "Cost of Wrong Hardware",
          text: "A startup burned 6 months deploying a YOLOv5-small model on Coral Edge TPU before discovering that the model's SPP (Spatial Pyramid Pooling) layer was not supported by the Edge TPU compiler. The layer fell back to CPU, making inference 5x slower than expected. They had to redesign the model architecture to avoid SPP — which required retraining and revalidating. Always run a proof-of-concept on target hardware in week 1 of any edge AI project."
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 2 — TensorFlow Lite: Converter, Interpreter & Delegates
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "tensorflow-lite-converter-interpreter-delegates",
      title: "TensorFlow Lite: Converter, Interpreter & Delegates",
      readTime: "20 min",
      content: [
        {
          type: "text",
          text: "TensorFlow Lite (TFLite) is the most widely deployed inference engine for on-device ML, running on billions of Android devices and embedded Linux systems. Understanding its internals — not just the API — is essential for squeezing maximum performance from constrained hardware. TFLite's architecture is fundamentally different from TensorFlow: it uses a flatbuffer-based model format, a static memory planner, and a delegate system that routes operations to specialized hardware accelerators."
        },

        // ── Section 1: The TFLite Model Format ──
        {
          type: "heading",
          text: "The TFLite Model Format (.tflite)"
        },
        {
          type: "text",
          text: "A .tflite file is a FlatBuffer — a serialization format that supports zero-copy deserialization. Unlike protobuf (used by TF SavedModel), FlatBuffers can be memory-mapped and accessed without parsing. This means a 10 MB model can be loaded in microseconds rather than milliseconds, because the runtime reads directly from the mmap'd file.\n\nThe FlatBuffer schema defines:\n- **Operator codes:** An enum mapping to built-in ops (CONV_2D, DEPTHWISE_CONV_2D, FULLY_CONNECTED, etc.) or custom ops\n- **Subgraphs:** Most models have a single subgraph. Each subgraph defines tensors, operators (in topological order), and input/output tensor indices\n- **Buffers:** Weight data stored as raw byte arrays. For quantized models, INT8 weights are stored directly — no conversion needed at load time\n- **Metadata:** Optional key-value pairs for labels, normalization parameters, etc."
        },
        {
          type: "text",
          text: "**Why FlatBuffers matter for edge:** On a Cortex-M with 512 KB SRAM, you cannot afford to allocate memory for both the serialized model and the deserialized representation. FlatBuffers let you read weights directly from flash storage (XIP — eXecute In Place) without copying to RAM. This is why TFLite Micro can run models on devices with less RAM than the model size — the weights live in flash."
        },

        // ── Section 2: The TFLite Converter ──
        {
          type: "heading",
          text: "The TFLite Converter Pipeline"
        },
        {
          type: "text",
          text: "The converter transforms a TensorFlow model (SavedModel, Keras H5, or concrete function) into a .tflite file. The pipeline has several stages:\n\n**1. Import:** Load the source model and extract the computation graph.\n\n**2. Graph transformations:** Constant folding, dead code elimination, and shape inference. For Keras models, batch normalization folding is automatic — the BN parameters are fused into the preceding Conv2D weights.\n\n**3. Op compatibility check:** Each TF op is mapped to a TFLite built-in op. If a mapping does not exist, the converter either fails or uses Select TF Ops (a compatibility layer that bundles full TF kernels — adds ~6 MB binary size).\n\n**4. Quantization (optional):** Post-training quantization (dynamic range, full integer, or float16) applied here. This is where calibration data flows in for full-integer quantization.\n\n**5. Serialization:** Write the FlatBuffer .tflite file."
        },
        {
          type: "code",
          lang: "python",
          code: `import tensorflow as tf

# Basic conversion from SavedModel
converter = tf.lite.TFLiteConverter.from_saved_model("saved_model_dir")

# Enable Select TF Ops for unsupported operations
converter.target_spec.supported_ops = [
    tf.lite.OpsSet.TFLITE_BUILTINS,      # Default TFLite ops
    tf.lite.OpsSet.SELECT_TF_OPS          # Full TF ops (larger binary)
]

# Full integer quantization with calibration
converter.optimizations = [tf.lite.Optimize.DEFAULT]
converter.target_spec.supported_types = [tf.int8]

def representative_dataset():
    """Yield ~100-500 calibration samples."""
    for image in calibration_images:
        yield [image.astype(np.float32)]

converter.representative_dataset = representative_dataset

# Force integer-only I/O (required for Edge TPU, NNAPI INT8 path)
converter.inference_input_type = tf.uint8
converter.inference_output_type = tf.uint8

tflite_model = converter.convert()
with open("model_int8.tflite", "wb") as f:
    f.write(tflite_model)`
        },

        // ── Section 3: The TFLite Interpreter ──
        {
          type: "heading",
          text: "The TFLite Interpreter: Memory Planning & Execution"
        },
        {
          type: "text",
          text: "The interpreter is the runtime that executes .tflite models. Its design prioritizes minimal memory allocation and deterministic execution:\n\n**1. Memory planning (AllocateTensors):** Before the first inference, the interpreter analyzes the graph to determine which tensors' lifetimes overlap. It then allocates a single contiguous arena and assigns non-overlapping regions to tensors whose lifetimes do not overlap. This means a model with 100 intermediate tensors might only need memory for 5-10 tensors simultaneously.\n\n**2. Op resolution:** Each operator in the graph is resolved to a kernel implementation. Built-in ops use hand-optimized kernels (NEON on ARM, SSE/AVX on x86). If a delegate claims the op, the delegate's kernel is used instead.\n\n**3. Execution:** Operators execute in topological order within a single thread (by default). Multi-threaded execution is available for CPU inference via `interpreter.set_num_threads(N)`. Each op reads from input tensors, computes, and writes to output tensors — all within the pre-planned arena."
        },
        {
          type: "text",
          text: "**Performance-critical interpreter settings:**\n\n- `set_num_threads(N)`: For CPU inference, using 2-4 threads on big cores typically gives best throughput on mobile. Going higher causes cache thrashing.\n- `allocate_tensors()`: Must be called once before inference. Calling it repeatedly (e.g., per frame) wastes ~1-5ms per call. Call once, reuse.\n- `resize_input_tensor()`: For dynamic shapes. Requires re-calling `allocate_tensors()` — the memory plan is invalidated.\n- Tensor data access: Use `interpreter.tensor(idx)` in C++ for zero-copy access. In Python, `get_tensor()` copies data — use `interpreter.get_tensor_data()` or numpy integration for lower overhead."
        },

        // ── Section 4: Delegates ──
        {
          type: "heading",
          text: "Delegates: Hardware Acceleration"
        },
        {
          type: "text",
          text: "Delegates are the mechanism by which TFLite routes operations to specialized hardware. The delegate system works through graph partitioning:\n\n1. The delegate examines the model graph and claims ops it can accelerate\n2. Claimed ops are replaced with a single delegate node in the graph\n3. Unclaimed ops remain as CPU-executed built-in ops\n4. At inference time, execution alternates between CPU and delegate\n\nThis partitioning is why delegate coverage matters — every transition between CPU and delegate incurs data transfer overhead."
        },
        {
          type: "text",
          text: "**Key delegates and when to use them:**\n\n**XNNPACK (CPU):** Default CPU delegate since TFLite 2.3. Replaces the reference CPU kernels with XNNPACK's highly optimized implementations using NEON (ARM) or AVX (x86). Typically 2-3x faster than reference kernels. Enabled by default — you get it for free.\n\n**GPU Delegate:** Uses OpenGL ES 3.1 (Android), Metal (iOS), or OpenCL for GPU inference. Best for FP16 models with large batch sizes. Startup cost is high (100-500ms for shader compilation), but sustained throughput can be 2-5x faster than CPU for suitable models. Not ideal for tiny models where the CPU-GPU transfer dominates.\n\n**NNAPI Delegate (Android):** Android's Neural Networks API routes ops to the best available accelerator (GPU, DSP, or NPU) based on the device's HAL drivers. The HAL implementation is vendor-specific — Samsung, Qualcomm, and MediaTek each optimize for their hardware. NNAPI quality varies dramatically across devices and Android versions.\n\n**Hexagon Delegate:** Directly targets Qualcomm's Hexagon DSP, bypassing NNAPI. More consistent performance than NNAPI on Qualcomm devices. Requires Hexagon SDK libraries.\n\n**Edge TPU Delegate:** Targets the Google Coral Edge TPU. Only works with full-integer quantized models (INT8). The Edge TPU compiler (separate from TFLite) pre-compiles the model into the TPU's native instruction format. Unsupported ops are automatically partitioned to CPU.\n\n**CoreML Delegate (iOS):** Routes ops to Apple's CoreML framework, which in turn can use the Neural Engine, GPU, or CPU. Best path to Apple Neural Engine's 35 TOPS INT8."
        },
        {
          type: "callout",
          variant: "warning",
          title: "NNAPI Fragmentation",
          text: "NNAPI is Android's answer to hardware-agnostic acceleration, but in practice it is fragmented. A model that runs perfectly on a Pixel 8 (Tensor G3) may fail or perform poorly on a Samsung Galaxy S23 (Snapdragon 8 Gen 2) because the NNAPI driver implementations differ. Always test on representative devices from each chipset vendor. For production apps, consider falling back to XNNPACK (CPU) if NNAPI inference time exceeds a threshold."
        },

        // ── Section 5: TFLite Micro ──
        {
          type: "heading",
          text: "TFLite Micro: Inference on Microcontrollers"
        },
        {
          type: "text",
          text: "TFLite Micro (TFLM) is a separate codebase from TFLite, designed for bare-metal and RTOS environments with no OS, no filesystem, no dynamic memory allocation:\n\n**Key constraints:**\n- All memory is pre-allocated in a single byte array (the tensor arena). You must estimate the arena size and allocate it at compile time.\n- No dynamic memory allocation — `malloc`/`free` are never called. This is critical for safety-certified systems (ISO 26262, IEC 62304).\n- No filesystem — the model is compiled into the binary as a C array.\n- Limited op set — only ops needed for your specific model are compiled in.\n\n**Performance on microcontrollers:** A keyword spotting model (20 KB weights, MFCC features → 3-layer CNN) runs in ~20ms on a Cortex-M4 @ 80 MHz. An anomaly detection model (autoencoder, 50 KB weights) runs in ~50ms on the same hardware. These are real-time for their use cases.\n\n**CMSIS-NN integration:** ARM's CMSIS-NN library provides hand-optimized INT8 kernels for Cortex-M. When linked with TFLM, Conv2D and DepthwiseConv2D run 4-8x faster than the reference C implementations. On Cortex-M55 with Helium, INT8 convolutions are further accelerated by the MVE (M-Profile Vector Extension)."
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 3 — ONNX Runtime: Execution Providers & Graph Optimization
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "onnx-runtime-execution-providers",
      title: "ONNX Runtime: Execution Providers & Graph Optimization",
      readTime: "18 min",
      content: [
        {
          type: "text",
          text: "ONNX Runtime (ORT) is the Swiss Army knife of inference engines — it runs on everything from cloud GPUs to mobile phones, supports every major hardware backend, and handles the widest range of model architectures. While TFLite dominates mobile and TensorRT dominates NVIDIA GPUs, ORT is the only engine that lets you deploy the same ONNX model across all these targets with a single API. Understanding ORT's execution provider (EP) system and graph optimization pipeline is essential for portable, high-performance inference."
        },

        // ── Section 1: ONNX Model Format ──
        {
          type: "heading",
          text: "The ONNX Model Format"
        },
        {
          type: "text",
          text: "ONNX (Open Neural Network Exchange) defines a standard computation graph format using Protocol Buffers. A .onnx file contains:\n\n**Graph:** Nodes (operators), edges (tensors), and initializers (weights). Each node has an op_type (Conv, Relu, MatMul, etc.) from the ONNX operator specification.\n\n**Opset version:** ONNX operators evolve across opset versions. Opset 17 (current stable) defines ~180 operators. Models pin to a specific opset version. Higher opset versions add new ops and refine existing ones.\n\n**Type system:** ONNX has a strict type system — every tensor has a defined element type (float32, float16, int8, etc.) and shape. Shape dimensions can be symbolic (e.g., 'batch_size') for dynamic shapes.\n\n**Metadata:** Model version, description, and custom metadata key-value pairs.\n\nThe format is designed for interop: PyTorch, TensorFlow, JAX, scikit-learn, and XGBoost can all export to ONNX. This makes ONNX the lingua franca for model exchange across frameworks."
        },

        // ── Section 2: Exporting to ONNX ──
        {
          type: "heading",
          text: "Exporting PyTorch Models to ONNX"
        },
        {
          type: "text",
          text: "PyTorch's ONNX export traces the model by running a forward pass with example inputs and recording the operations. There are two export paths:\n\n**torch.onnx.export (TorchScript-based, legacy):** Uses `torch.jit.trace` under the hood. Limitations: cannot handle data-dependent control flow (if/else based on tensor values), dynamic shapes require explicit `dynamic_axes` specification. This is the stable, well-tested path.\n\n**torch.onnx.dynamo_export (Dynamo-based, newer):** Uses TorchDynamo to capture the full Python program, including control flow. Handles more model architectures but is less mature. Produces cleaner graphs for transformer models."
        },
        {
          type: "code",
          lang: "python",
          code: `import torch
import torch.onnx

model = torchvision.models.mobilenet_v2(pretrained=True).eval()
dummy_input = torch.randn(1, 3, 224, 224)

torch.onnx.export(
    model,
    dummy_input,
    "mobilenet_v2.onnx",
    opset_version=17,
    input_names=["input"],
    output_names=["output"],
    dynamic_axes={
        "input": {0: "batch_size"},     # Dynamic batch dimension
        "output": {0: "batch_size"},
    },
)

# Verify the exported model
import onnx
model_onnx = onnx.load("mobilenet_v2.onnx")
onnx.checker.check_model(model_onnx)  # Validates graph structure and types`
        },
        {
          type: "text",
          text: "**Common export pitfalls:**\n\n1. **Dynamic control flow:** `if x.sum() > 0` in forward() produces different graphs for different inputs. torch.onnx.export traces one path. Use `torch.where()` instead for branchless computation.\n\n2. **Unsupported ops:** Custom CUDA kernels, some torchvision ops (NMS, RoIAlign until recent opsets). Check with `torch.onnx.verification.find_mismatch()`.\n\n3. **Shape mismatches:** Hardcoded tensor reshapes like `x.view(1, -1)` bake in the batch size. Use `x.view(x.size(0), -1)` and set `dynamic_axes`.\n\n4. **Numerical divergence:** FP32 export should match PyTorch within 1e-5. If not, check for in-place operations or non-deterministic ops."
        },

        // ── Section 3: Graph Optimization Levels ──
        {
          type: "heading",
          text: "Graph Optimization Levels"
        },
        {
          type: "text",
          text: "ORT applies graph optimizations in three levels, each progressively more aggressive:\n\n**Level 1 — Basic (default):** Safe, always-beneficial transforms:\n- Constant folding: Pre-compute subgraphs with only constant inputs\n- Dead code elimination: Remove unreachable nodes\n- Redundant node elimination: Remove identity ops, duplicate computations\n\n**Level 2 — Extended:** Operator fusion that requires pattern matching:\n- Conv + BatchNorm fusion: Fold BN parameters into Conv weights (eliminates BN entirely)\n- Conv + Relu fusion: Single fused kernel (ConvRelu) — avoids writing Conv output to memory then re-reading for Relu\n- MatMul + Add fusion: Fuse bias addition into GEMM\n- Attention fusion: Fuse Q/K/V projections + scaled dot-product attention into a single optimized kernel (critical for transformers)\n- GELU fusion: Fuse the multi-op GELU approximation into a single kernel\n\n**Level 3 — Layout transformations:** Change tensor memory layout for hardware efficiency:\n- NCHW → NHWC: ARM NEON and XNNPACK are faster with channels-last layout\n- NCHW → NCHWc: Blocked layout for x86 AVX-512 (Intel oneDNN)\n\nThese optimizations can be saved to disk (optimized .onnx file) to avoid re-running at startup."
        },
        {
          type: "callout",
          variant: "tip",
          title: "Measuring Optimization Impact",
          text: "Use ORT's built-in profiling to measure per-op latency before and after optimization: `sess_options.enable_profiling = True`. The profiling output (JSON) shows time per kernel, memory allocation, and data copies. This is invaluable for identifying which fusions actually helped and which ops are bottlenecks."
        },

        // ── Section 4: Execution Providers ──
        {
          type: "heading",
          text: "Execution Providers: The EP Architecture"
        },
        {
          type: "text",
          text: "Execution Providers (EPs) are ORT's abstraction for hardware backends. When you create an InferenceSession, you specify a priority-ordered list of EPs. ORT routes each node to the highest-priority EP that supports it:\n\n**CPUExecutionProvider:** Always available. Uses oneDNN (Intel), ACL (ARM), or MLAS (Microsoft's hand-tuned kernels). Good baseline performance.\n\n**CUDAExecutionProvider:** NVIDIA GPUs via CUDA + cuDNN. Supports FP32, FP16, and BF16. For INT8, prefer TensorRT EP.\n\n**TensorrtExecutionProvider:** Wraps TensorRT as an ORT EP. ORT identifies subgraphs that TensorRT can handle, passes them to TensorRT for compilation, and executes the remainder on CPU/CUDA. This gives you TensorRT's kernel fusion and INT8 calibration within ORT's unified API.\n\n**CoreMLExecutionProvider:** Targets Apple's Neural Engine and GPU on iOS/macOS. Requires coremltools for model conversion (handled automatically by ORT).\n\n**QNNExecutionProvider:** Targets Qualcomm's AI Engine (Hexagon DSP/HTP). The preferred path for Snapdragon devices — better performance and consistency than NNAPI.\n\n**OpenVINOExecutionProvider:** Intel CPUs, integrated GPUs, and VPUs (Movidius). Good for Intel NUC and similar x86 edge devices.\n\n**NNAPIExecutionProvider:** Android's NNAPI. Same fragmentation caveats as TFLite's NNAPI delegate."
        },
        {
          type: "code",
          lang: "python",
          code: `import onnxruntime as ort

# Multi-EP session: try TensorRT first, fall back to CUDA, then CPU
sess_options = ort.SessionOptions()
sess_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL

# Enable profiling for performance analysis
sess_options.enable_profiling = True

# Save optimized model to disk (avoid re-optimization on next load)
sess_options.optimized_model_filepath = "model_optimized.onnx"

providers = [
    ("TensorrtExecutionProvider", {
        "trt_max_workspace_size": 2 * 1024 * 1024 * 1024,  # 2GB
        "trt_fp16_enable": True,
        "trt_int8_enable": True,
        "trt_int8_calibration_table_name": "calibration.cache",
        "trt_engine_cache_enable": True,
        "trt_engine_cache_path": "./trt_cache",
    }),
    "CUDAExecutionProvider",
    "CPUExecutionProvider",
]

session = ort.InferenceSession("model.onnx", sess_options, providers=providers)

# Check which EP each node is assigned to
for node in session.get_providers():
    print(f"Active provider: {node}")`
        },

        // ── Section 5: ORT on Mobile ──
        {
          type: "heading",
          text: "ORT Mobile and ORT Web"
        },
        {
          type: "text",
          text: "**ORT Mobile:** A reduced-size build of ORT for Android and iOS. Key optimizations:\n- Custom build: Include only the ops your model needs. A MobileNet-only build can be under 1 MB.\n- ORT Format (.ort): A pre-optimized, flatbuffer-based format that eliminates graph optimization at load time. Reduces session creation from ~200ms to ~10ms.\n- NNAPI and CoreML EPs work on mobile builds.\n\n**ORT Web:** Runs ONNX models in the browser via WebAssembly (WASM) or WebGL/WebGPU:\n- WASM backend: ~2-5x slower than native CPU, but works everywhere. Uses XNNPACK for SIMD acceleration.\n- WebGPU backend: Near-native GPU performance in supported browsers (Chrome 113+). Enables running transformer models (BERT, Whisper) client-side.\n- Use case: Privacy-preserving inference where data never leaves the browser.\n\n**ORT GenAI:** Optimized runtime for generative AI models (LLMs, image generation). Includes KV-cache management, beam search, and sampling. Targets the specific inference pattern of autoregressive generation."
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 4 — TensorRT: Layer Fusion, Auto-Tuning & INT8 Calibration
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "tensorrt-fusion-autotuning-calibration",
      title: "TensorRT: Layer Fusion, Auto-Tuning & INT8 Calibration",
      readTime: "22 min",
      content: [
        {
          type: "text",
          text: "TensorRT is NVIDIA's inference optimizer and runtime — the fastest path to NVIDIA GPU inference by a significant margin. A ResNet-50 that runs at 300 img/sec with PyTorch can hit 5000+ img/sec with TensorRT INT8 on the same GPU. The speedup comes from three pillars: aggressive layer fusion that reduces memory traffic, kernel auto-tuning that selects the fastest CUDA kernel for each operation on the specific GPU, and INT8 quantization with calibration. Understanding these internals is what separates engineers who get 2x speedup from those who get 10x."
        },

        // ── Section 1: The TensorRT Build Phase ──
        {
          type: "heading",
          text: "The Build Phase: From Network to Engine"
        },
        {
          type: "text",
          text: "TensorRT's build phase transforms a network definition into an optimized engine (serialized as a .plan or .engine file). This is a compile step — it can take minutes but only runs once:\n\n**1. Graph import:** TensorRT parses ONNX (primary), UFF (legacy TF), or its own C++/Python network definition API. The ONNX parser maps ONNX ops to TensorRT layers.\n\n**2. Layer fusion:** TensorRT identifies patterns of layers that can be fused into a single kernel. Common fusions:\n- Conv + BN + ReLU → single CBR kernel (one memory read/write instead of three)\n- Conv + Add + ReLU → for residual connections\n- Shuffle + Reshape → eliminated entirely (zero cost)\n- Q/K/V MatMul + Scale + Softmax + MatMul → fused multi-head attention (MHA) kernel\n- Element-wise chains → fused into a single point-wise kernel\n\n**3. Kernel auto-tuning:** For each fused layer, TensorRT has multiple CUDA kernel implementations (tiling strategies, thread block sizes, data layouts). During build, it benchmarks each candidate on the target GPU and selects the fastest. This is why engines are GPU-specific — an engine built on A100 will not run on a Jetson.\n\n**4. Memory optimization:** TensorRT determines tensor lifetimes and reuses memory across non-overlapping tensors (same concept as TFLite's arena allocation but for GPU memory).\n\n**5. Precision calibration (optional):** For INT8 mode, TensorRT collects activation statistics from calibration data to compute per-tensor quantization parameters."
        },
        {
          type: "callout",
          variant: "info",
          title: "Why Engines Are Not Portable",
          text: "A TensorRT engine is specific to: (1) the exact GPU model (SM architecture), (2) the TensorRT version, (3) the CUDA version, and (4) the build-time configuration (max batch size, workspace size, precision flags). Deploying to a different GPU requires rebuilding the engine. This is the price of hardware-specific kernel auto-tuning — and it is worth it."
        },

        // ── Section 2: Layer Fusion In-Depth ──
        {
          type: "heading",
          text: "Layer Fusion: Why It Matters More Than Compute"
        },
        {
          type: "text",
          text: "Layer fusion is TensorRT's most impactful optimization, and understanding why requires understanding GPU memory hierarchy. A typical NVIDIA GPU has:\n\n- Register file: ~256 KB per SM, ~0.5 cycle access\n- L1 cache / shared memory: 128-256 KB per SM, ~30 cycles\n- L2 cache: 4-40 MB total, ~200 cycles\n- Global memory (HBM): 8-80 GB, ~400-600 cycles\n\nWithout fusion, each layer reads its input from global memory and writes its output back to global memory. A Conv-BN-ReLU sequence requires 6 global memory transfers (3 reads + 3 writes). With fusion, the intermediate results stay in registers or L1 — only 1 read and 1 write to global memory. This 3x reduction in memory traffic often translates directly to 3x speedup for memory-bound layers."
        },
        {
          type: "text",
          text: "**Fusion categories in TensorRT:**\n\n**Vertical fusion:** Sequential layers fused into one kernel (Conv+BN+ReLU). The most common and impactful fusion.\n\n**Horizontal fusion:** Parallel branches processed by a single wider kernel. Example: In Inception blocks, multiple parallel convolutions with different kernel sizes can be fused into a single kernel that processes all branches simultaneously.\n\n**Loop fusion:** For recurrent structures, multiple timestep computations can be fused to reduce launch overhead.\n\n**Custom fusion plugins:** When TensorRT's built-in fusions do not cover your pattern, you can write a custom TensorRT plugin (CUDA kernel) that implements the fused operation. Common for custom attention mechanisms, unusual activations, or domain-specific ops."
        },

        // ── Section 3: Kernel Auto-Tuning ──
        {
          type: "heading",
          text: "Kernel Auto-Tuning: The Performance Multiplier"
        },
        {
          type: "text",
          text: "For each layer, TensorRT maintains a library of CUDA kernel implementations called tactics. For a Conv2D layer, tactics vary in:\n\n- **Algorithm:** Direct convolution, im2col + GEMM, Winograd (for 3x3), FFT (for large kernels)\n- **Tile size:** How many output elements each thread block computes (e.g., 32x32, 64x64, 128x128)\n- **Data layout:** NCHW, NHWC, NCHW32 (32-channel blocks for Tensor Cores)\n- **Tensor Core usage:** Whether to use Tensor Cores (requires specific alignments and data types)\n\nDuring the build phase, TensorRT runs each tactic candidate with representative data and measures the wall-clock execution time. For a model with 50 layers and 10 tactics per layer, this means ~500 kernel benchmarks — which is why the build phase takes minutes.\n\nThe auto-tuning results are cached in the engine file. This is why the same ONNX model produces different engines (with different performance) on A100 vs V100 vs Jetson AGX Orin — the optimal tactics differ."
        },
        {
          type: "text",
          text: "**Timing cache:** TensorRT supports a timing cache that persists tactic benchmarks across builds. If you rebuild an engine (e.g., after model update), cached tactic timings avoid re-benchmarking unchanged layers. This can reduce build time from 10 minutes to 30 seconds.\n\n**Builder optimization level:** TensorRT 8.6+ allows setting the optimization level (1-5). Higher levels try more tactics and take longer to build but may find faster kernels. Level 3 (default) is a good balance. Level 5 is useful for production deployments where you build once and deploy for months."
        },

        // ── Section 4: INT8 Calibration ──
        {
          type: "heading",
          text: "INT8 Calibration: From FP32 to INT8"
        },
        {
          type: "text",
          text: "TensorRT's INT8 mode uses post-training quantization with calibration to determine per-tensor scale factors. The calibration process:\n\n1. Run 500-1000 representative inputs through the FP32 network\n2. For each tensor (activations between layers), collect a histogram of values\n3. Choose a quantization threshold that minimizes information loss\n\nTensorRT supports multiple calibration strategies:\n\n**MinMax (IInt8MinMaxCalibrator):** Uses the observed min/max values. Simple but sensitive to outliers. A single activation value of 1000 when typical range is [-5, 5] wastes 99% of the INT8 range.\n\n**Entropy (IInt8EntropyCalibrator2):** Minimizes KL divergence between the FP32 activation distribution and its quantized approximation. Finds an optimal threshold that clips outliers. Default and recommended for most models.\n\n**Percentile (IInt8LegacyCalibrator):** Clips at a fixed percentile (e.g., 99.99th percentile) of the activation distribution. Robust to outliers but may clip too aggressively for long-tailed distributions."
        },
        {
          type: "code",
          lang: "python",
          code: `import tensorrt as trt
import pycuda.driver as cuda
import numpy as np

class Int8Calibrator(trt.IInt8EntropyCalibrator2):
    """Custom INT8 calibrator with entropy-based threshold selection."""

    def __init__(self, calibration_data, batch_size=32, cache_file="calibration.cache"):
        super().__init__()
        self.data = calibration_data        # List of numpy arrays
        self.batch_size = batch_size
        self.cache_file = cache_file
        self.current_index = 0
        # Allocate GPU memory for one batch
        self.device_input = cuda.mem_alloc(
            batch_size * 3 * 224 * 224 * np.float32().itemsize
        )

    def get_batch_size(self):
        return self.batch_size

    def get_batch(self, names):
        if self.current_index >= len(self.data):
            return None
        batch = self.data[self.current_index:self.current_index + self.batch_size]
        batch = np.ascontiguousarray(np.stack(batch).astype(np.float32))
        cuda.memcpy_htod(self.device_input, batch)
        self.current_index += self.batch_size
        return [int(self.device_input)]

    def read_calibration_cache(self):
        """Load cached calibration data to skip re-calibration."""
        try:
            with open(self.cache_file, "rb") as f:
                return f.read()
        except FileNotFoundError:
            return None

    def write_calibration_cache(self, cache):
        """Save calibration data for future builds."""
        with open(self.cache_file, "wb") as f:
            f.write(cache)`
        },

        // ── Section 5: Dynamic Shapes ──
        {
          type: "heading",
          text: "Dynamic Shapes and Optimization Profiles"
        },
        {
          type: "text",
          text: "TensorRT supports dynamic input shapes through optimization profiles. Each profile specifies min, optimal, and max dimensions for each dynamic axis:\n\n- **MIN:** The smallest input size the engine will accept\n- **OPT:** The input size TensorRT auto-tunes for (best performance)\n- **MAX:** The largest input size the engine will accept\n\nYou can define multiple profiles for different operating modes. For example, a video analytics system might use one profile for single-image inference (batch=1, for real-time detection) and another for batch inference (batch=32, for offline processing)."
        },
        {
          type: "code",
          lang: "python",
          code: `# Build engine with dynamic shapes
builder = trt.Builder(logger)
network = builder.create_network(
    1 << int(trt.NetworkDefinitionCreationFlag.EXPLICIT_BATCH)
)
parser = trt.OnnxParser(network, logger)
parser.parse_from_file("model.onnx")

config = builder.create_builder_config()
config.set_memory_pool_limit(trt.MemoryPoolType.WORKSPACE, 2 << 30)  # 2GB
config.set_flag(trt.BuilderFlag.FP16)  # Enable FP16
config.set_flag(trt.BuilderFlag.INT8)  # Enable INT8

# Optimization profile for dynamic batch size
profile = builder.create_optimization_profile()
profile.set_shape(
    "input",
    min=(1, 3, 224, 224),    # Minimum batch=1
    opt=(8, 3, 224, 224),    # Optimal batch=8 (auto-tuned for this)
    max=(32, 3, 224, 224),   # Maximum batch=32
)
config.add_optimization_profile(profile)

# Build and serialize engine
engine = builder.build_serialized_network(network, config)
with open("model.engine", "wb") as f:
    f.write(engine)`
        },

        // ── Section 6: Engine Serialization ──
        {
          type: "heading",
          text: "Engine Serialization and Deployment"
        },
        {
          type: "text",
          text: "The serialized engine (.engine or .plan file) contains everything needed for inference: fused layer graph, selected kernel tactics, quantization parameters, and memory allocation plan. Key deployment considerations:\n\n**1. Engine caching:** Build the engine once on the target device (or a device with identical GPU), serialize to disk, and load for subsequent runs. First load from ONNX: 2-15 minutes. Subsequent loads from engine: 100-500ms.\n\n**2. Version compatibility:** Engines are forward-compatible within a minor version (8.6.x) but not across major versions. A TensorRT 8.x engine will not load in TensorRT 9.x. Plan for engine rebuilds during TensorRT upgrades.\n\n**3. Context creation:** A TensorRT execution context holds the state for one inference stream. You can create multiple contexts from a single engine for parallel inference on different CUDA streams. Each context has its own device memory for activations.\n\n**4. DLA support (Jetson):** Set `config.default_device_type = trt.DeviceType.DLA` to target the DLA accelerator. DLA supports a subset of ops — unsupported ops fall back to GPU. Use `config.set_flag(trt.BuilderFlag.GPU_FALLBACK)` to allow this.\n\n**5. Safety mode (Jetson AGX):** For automotive/industrial use, TensorRT supports a safety-certified runtime (TensorRT Safety) that eliminates dynamic memory allocation and provides deterministic execution times. Required for ISO 26262 ASIL-D applications."
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 5 — CoreML, Apple Neural Engine & OpenCV DNN
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "coreml-ane-opencv-dnn",
      title: "CoreML, Apple Neural Engine & OpenCV DNN",
      readTime: "16 min",
      content: [
        {
          type: "text",
          text: "Apple devices represent the largest single-vendor edge AI deployment target. With Neural Engine (ANE) hardware in every iPhone since iPhone 8 (A11 Bionic), iPad, and Apple Silicon Mac, understanding CoreML is essential for reaching billions of devices. On the other end, OpenCV's DNN module provides a framework-free way to run inference on any CPU — no ML framework installation required."
        },

        // ── Section 1: CoreML Architecture ──
        {
          type: "heading",
          text: "CoreML Architecture and Model Format"
        },
        {
          type: "text",
          text: "CoreML is Apple's ML inference framework. It sits at the top of a stack:\n\n**CoreML (user-facing API)** → **Espresso (internal runtime)** → **Hardware dispatch (ANE / GPU / CPU)**\n\nThe CoreML model format (.mlmodel or .mlpackage) supports two internal representations:\n\n**Neural Network (legacy):** Layer-based description similar to Keras. Each layer specifies its type, parameters, and connections. Supports ~150 layer types. Being phased out.\n\n**ML Program (current):** A typed, SSA-based (Static Single Assignment) intermediate representation using the MIL (Model Intermediate Language) format. More expressive, supports control flow, and is the future of CoreML. All new coremltools features target ML Program.\n\nCoreML decides at runtime whether to execute on ANE, GPU, or CPU based on model structure, input size, and device state. You can request a specific compute unit but CoreML may override for efficiency."
        },
        {
          type: "text",
          text: "**Apple Neural Engine (ANE) specifics:**\n\n- **Architecture:** The ANE is a dedicated neural network accelerator with a systolic array architecture optimized for 8-bit and 16-bit matrix operations. On M2/A16, it delivers ~17 TOPS at ~8W.\n- **Supported ops:** Convolution, depthwise convolution, fully connected, pooling, elementwise, softmax, reshape, concat. Notably, some attention patterns are supported as fused ops.\n- **Unsupported ops trigger CPU fallback:** Custom activations, unusual reshapes, gather/scatter with complex indices. Each fallback adds ~0.5-2ms for the data transfer round-trip.\n- **Memory:** The ANE has a dedicated on-chip SRAM cache. If the model's working set fits, performance is excellent. If it spills to unified memory, performance degrades.\n- **FP16 default:** The ANE operates in FP16 natively. CoreML automatically converts FP32 models to FP16 for ANE execution. INT8 quantization with coremltools gives additional speedup but requires explicit calibration."
        },

        // ── Section 2: coremltools Conversion ──
        {
          type: "heading",
          text: "Model Conversion with coremltools"
        },
        {
          type: "text",
          text: "coremltools is the official Python library for creating CoreML models. It supports conversion from PyTorch, TensorFlow, JAX, and ONNX."
        },
        {
          type: "code",
          lang: "python",
          code: `import coremltools as ct
import torch
import torchvision

# Load and trace PyTorch model
model = torchvision.models.mobilenet_v2(pretrained=True).eval()
example_input = torch.randn(1, 3, 224, 224)
traced_model = torch.jit.trace(model, example_input)

# Convert to CoreML ML Program format
mlmodel = ct.convert(
    traced_model,
    inputs=[ct.ImageType(
        name="image",
        shape=(1, 3, 224, 224),
        scale=1/255.0,          # Preprocessing: scale pixel values
        bias=[-0.485/0.229, -0.456/0.224, -0.406/0.225],  # ImageNet normalization
        color_layout="RGB",
    )],
    outputs=[ct.TensorType(name="classLabel_probs")],
    convert_to="mlprogram",     # Use ML Program format (not legacy neuralnetwork)
    compute_precision=ct.precision.FLOAT16,  # Default for ANE
    minimum_deployment_target=ct.target.iOS16,
)

# Add metadata
mlmodel.author = "ML Engineer"
mlmodel.short_description = "MobileNetV2 ImageNet classifier"

# Save
mlmodel.save("MobileNetV2.mlpackage")`
        },
        {
          type: "text",
          text: "**Flexible shapes:** CoreML supports dynamic input dimensions through `EnumeratedShapes` (fixed set of allowed shapes) or `RangeDim` (continuous range). For ANE execution, enumerated shapes are preferred because the ANE compiler can pre-optimize each shape.\n\n**Quantization with coremltools:**\n- `ct.optimize.coreml.linear_quantize_weights()`: Weight-only quantization (INT8 weights, FP16 compute). Reduces model size 2x with minimal accuracy loss.\n- `ct.optimize.coreml.palettize_weights()`: K-means weight clustering (e.g., 16 clusters = 4-bit). More aggressive compression.\n- `ct.optimize.coreml.prune_weights()`: Sets small weights to zero, then uses sparse storage.\n- Post-training activation quantization: Available via `ct.optimize.coreml.OpActivationLinearQuantizerConfig` with calibration data."
        },

        // ── Section 3: OpenCV DNN Module ──
        {
          type: "heading",
          text: "OpenCV DNN: Framework-Free Inference"
        },
        {
          type: "text",
          text: "OpenCV's DNN module is the simplest path to running inference when you do not want to install TensorFlow, PyTorch, or ONNX Runtime. It reads ONNX, TFLite, Caffe, and Darknet model formats and runs inference using OpenCV's own compute backends:\n\n**Backends:**\n- **OpenCV CPU:** Uses hand-tuned C++ with SIMD (SSE/AVX on x86, NEON on ARM). No dependencies.\n- **OpenCV CUDA:** GPU acceleration for NVIDIA GPUs. Requires OpenCV built with CUDA support.\n- **Halide:** Code-generation backend that auto-tunes for the target CPU. Good for unusual architectures.\n- **Intel Inference Engine (OpenVINO):** For Intel CPUs/GPUs/VPUs when OpenCV is built with OpenVINO support."
        },
        {
          type: "code",
          lang: "python",
          code: `import cv2
import numpy as np

# Load ONNX model
net = cv2.dnn.readNetFromONNX("yolov8n.onnx")

# Set backend and target
net.setPreferableBackend(cv2.dnn.DNN_BACKEND_OPENCV)
net.setPreferableTarget(cv2.dnn.DNN_TARGET_CPU)
# For GPU: cv2.dnn.DNN_BACKEND_CUDA, cv2.dnn.DNN_TARGET_CUDA

# Read and preprocess image
img = cv2.imread("input.jpg")
blob = cv2.dnn.blobFromImage(
    img,
    scalefactor=1/255.0,
    size=(640, 640),
    mean=(0, 0, 0),
    swapRB=True,       # BGR to RGB
    crop=False
)

# Run inference
net.setInput(blob)
outputs = net.forward(net.getUnconnectedOutLayersNames())

# Get per-layer timing
times, _ = net.getPerfProfile()
print(f"Inference time: {times * 1000 / cv2.getTickFrequency():.1f} ms")`
        },
        {
          type: "text",
          text: "**When to use OpenCV DNN vs dedicated runtimes:**\n\n- **Use OpenCV DNN when:** You already use OpenCV for preprocessing, you need minimal dependencies, your model is a standard architecture (classification, detection, segmentation), and CPU inference is acceptable.\n- **Use TFLite/ORT when:** You need hardware acceleration (NPU, DSP), dynamic shapes, INT8 quantization, or advanced operators not supported by OpenCV DNN.\n- **Performance comparison:** For MobileNetV2 on ARM64 CPU: OpenCV DNN ~15ms, TFLite XNNPACK ~10ms, ORT ~11ms. OpenCV DNN is ~30-50% slower than dedicated runtimes but has zero additional dependencies."
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 6 — Model Conversion Pipelines: PyTorch → ONNX → Target Formats
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "model-conversion-pipelines",
      title: "Model Conversion Pipelines: PyTorch → ONNX → Target Formats",
      readTime: "17 min",
      content: [
        {
          type: "text",
          text: "Model conversion is where most edge AI projects hit unexpected roadblocks. The path from a PyTorch model to running inference on target hardware involves multiple format translations, each with potential failure modes: operator support gaps, numerical precision drift, shape inference failures, and metadata loss. A robust conversion pipeline is not a one-time export — it is a validated, tested, and versioned artifact."
        },

        // ── Section 1: The Conversion Graph ──
        {
          type: "heading",
          text: "The Conversion Graph: Understanding All Paths"
        },
        {
          type: "text",
          text: "The practical conversion paths from training frameworks to inference engines:\n\n**PyTorch:**\n- PyTorch → ONNX → TFLite (via onnx-tf → TF SavedModel → TFLite converter)\n- PyTorch → ONNX → TensorRT (via TensorRT's ONNX parser)\n- PyTorch → ONNX → CoreML (via coremltools, which reads ONNX directly)\n- PyTorch → ONNX → ORT (direct, ONNX is ORT's native format)\n- PyTorch → TorchScript → CoreML (via coremltools, direct trace conversion)\n- PyTorch → ExecuTorch (Meta's new on-device runtime, direct from PyTorch 2.x export)\n\n**TensorFlow/Keras:**\n- TF → TFLite (native converter, most reliable path)\n- TF → ONNX (via tf2onnx) → TensorRT / ORT / CoreML\n- TF → TF SavedModel → TensorFlow Serving (cloud deployment)\n\n**ONNX as the hub:** ONNX serves as the universal interchange format. The safest strategy: export to ONNX first, validate the ONNX model, then convert ONNX to target format. This isolates export bugs from conversion bugs."
        },

        // ── Section 2: Common Pitfalls ──
        {
          type: "heading",
          text: "Common Conversion Pitfalls and Fixes"
        },
        {
          type: "text",
          text: "**1. Unsupported operators:**\nEvery inference engine has an op support matrix. Common problematic ops:\n- `torch.nn.functional.grid_sample` — limited TFLite support, requires recent opset for ONNX\n- Custom CUDA kernels — not exportable to ONNX, need custom op registration\n- `torch.einsum` — exported as a series of transpose/reshape/matmul, which may not fuse well\n- `torch.stft` / `torch.istft` — no TFLite support, use manual FFT implementation\n\n**Fix:** Replace unsupported ops with equivalent supported ops before export. For example, replace `F.grid_sample` with manual bilinear interpolation using basic ops."
        },
        {
          type: "text",
          text: "**2. Dynamic shapes vs static shapes:**\nTFLite traditionally requires static shapes (though recent versions support some dynamism). TensorRT supports dynamic shapes with optimization profiles. CoreML supports enumerated or ranged dynamic shapes.\n\n**Fix:** If targeting TFLite, remove dynamic control flow and use fixed input sizes. Use `opset_version=17` for ONNX export (better dynamic shape support). For batch flexibility, export with `dynamic_axes={'input': {0: 'batch'}}`.\n\n**3. Numerical divergence:**\nConversion should produce numerically equivalent models (within FP32 precision). Sources of divergence:\n- Batch normalization: Different running mean/var handling in eval mode across frameworks\n- Padding: PyTorch uses `floor` for output size, TF uses `ceil` by default\n- Interpolation: Resize/upsample coordinate mapping differs (align_corners, half_pixel)\n\n**Fix:** Always run a numerical equivalence test with the same input. Acceptable tolerance: max absolute error < 1e-5 for FP32, < 1e-3 for FP16."
        },
        {
          type: "text",
          text: "**4. Metadata and preprocessing:**\nTraining code often includes preprocessing (normalization, resize, color space conversion) that is separate from the model. When converting, you must document or embed preprocessing parameters:\n- Input scale and bias (e.g., ImageNet normalization)\n- Color layout (RGB vs BGR)\n- Input data type (float32 vs uint8)\n- Resize method (bilinear vs nearest neighbor)\n\n**Fix:** Use ONNX metadata, TFLite metadata API, or CoreML's `ImageType` with scale/bias to embed preprocessing in the model file itself.\n\n**5. Large model size:**\nONNX files can be very large because they store weights in protobuf (text-like encoding). A 500 MB PyTorch model might become a 1.5 GB ONNX file.\n\n**Fix:** Use `onnx.save(model, path, save_as_external_data=True)` to store weights in a separate binary file. For TFLite, the FlatBuffer format is more compact."
        },

        // ── Section 3: Validation Pipeline ──
        {
          type: "heading",
          text: "Building a Conversion Validation Pipeline"
        },
        {
          type: "text",
          text: "A production conversion pipeline must verify correctness at each stage. The minimum validation steps:"
        },
        {
          type: "code",
          lang: "python",
          code: `import numpy as np
import torch
import onnx
import onnxruntime as ort

def validate_conversion(pytorch_model, onnx_path, test_inputs, atol=1e-5):
    """Validate ONNX model matches PyTorch output."""

    # 1. Run PyTorch inference
    pytorch_model.eval()
    with torch.no_grad():
        pt_output = pytorch_model(test_inputs).numpy()

    # 2. Validate ONNX graph structure
    onnx_model = onnx.load(onnx_path)
    onnx.checker.check_model(onnx_model)  # Schema validation
    onnx.shape_inference.infer_shapes(onnx_model)  # Shape inference

    # 3. Run ONNX Runtime inference
    session = ort.InferenceSession(onnx_path)
    ort_output = session.run(None, {"input": test_inputs.numpy()})[0]

    # 4. Numerical comparison
    max_abs_error = np.max(np.abs(pt_output - ort_output))
    cosine_sim = np.dot(pt_output.flatten(), ort_output.flatten()) / (
        np.linalg.norm(pt_output) * np.linalg.norm(ort_output)
    )

    print(f"Max absolute error: {max_abs_error:.2e}")
    print(f"Cosine similarity:  {cosine_sim:.8f}")

    assert max_abs_error < atol, f"Numerical divergence: {max_abs_error}"
    assert cosine_sim > 0.99999, f"Cosine similarity too low: {cosine_sim}"

    # 5. Performance comparison
    import time
    # PyTorch
    start = time.perf_counter()
    for _ in range(100):
        with torch.no_grad():
            pytorch_model(test_inputs)
    pt_time = (time.perf_counter() - start) / 100

    # ORT
    start = time.perf_counter()
    for _ in range(100):
        session.run(None, {"input": test_inputs.numpy()})
    ort_time = (time.perf_counter() - start) / 100

    print(f"PyTorch: {pt_time*1000:.1f}ms | ORT: {ort_time*1000:.1f}ms")
    return True`
        },
        {
          type: "text",
          text: "**Multi-format validation:** Extend this pattern to validate each downstream format (TFLite, TensorRT, CoreML). The key metric is cosine similarity between the original PyTorch output and each target format's output. A cosine similarity > 0.99999 for FP32 and > 0.999 for INT8 indicates a correct conversion.\n\n**CI integration:** Add conversion validation to your CI pipeline. If a model architecture change breaks conversion to any target format, you catch it immediately rather than discovering it during deployment."
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 7 — Profiling Edge Inference & Batching Strategies
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "profiling-edge-inference-batching",
      title: "Profiling Edge Inference & Batching Strategies",
      readTime: "16 min",
      content: [
        {
          type: "text",
          text: "Profiling edge inference is fundamentally different from profiling cloud inference. In the cloud, you optimize for throughput (images/second) with abundant compute. On the edge, you optimize for latency (milliseconds per inference) under power, thermal, and memory constraints. A model that benchmarks at 15ms on a cool Jetson may run at 25ms after 10 minutes of sustained inference due to thermal throttling. Profiling must capture these real-world dynamics."
        },

        // ── Section 1: What to Measure ──
        {
          type: "heading",
          text: "What to Measure: Beyond Latency"
        },
        {
          type: "text",
          text: "Edge inference profiling must capture multiple dimensions:\n\n**1. End-to-end latency:** Total time from raw input (camera frame, audio chunk) to final output. This includes preprocessing (resize, normalize), inference, and postprocessing (NMS, decode). Inference is often only 40-60% of end-to-end latency.\n\n**2. Per-layer latency:** Which layers dominate execution time. On CPU, depthwise convolutions are often surprisingly slow (poor cache utilization). On NPUs, unsupported-op fallbacks create latency spikes.\n\n**3. Memory footprint:**\n- Model size on disk (storage constraint)\n- Peak runtime memory (RAM constraint). Includes weights, activations, intermediate buffers, and framework overhead\n- Memory bandwidth utilization (often the actual bottleneck)\n\n**4. Power consumption:** Measured in milliwatts. Critical for battery-powered devices. A model that runs at 10ms but draws 5W gives 50mJ per inference. An alternative at 15ms and 2W gives 30mJ — the slower model is more power-efficient.\n\n**5. Thermal behavior:** Run the model in a loop for 30 minutes. Plot latency over time. If latency increases by >20%, thermal throttling is a deployment risk.\n\n**6. Throughput under load:** What happens when multiple models share the device (detection + classification + tracking)? Resource contention can cause individual model latencies to spike."
        },

        // ── Section 2: Profiling Tools ──
        {
          type: "heading",
          text: "Profiling Tools by Platform"
        },
        {
          type: "text",
          text: "**TFLite:**\n- `benchmark_model` tool: Built-in CLI that measures latency, memory, and per-op timing. Run with `--enable_op_profiling=true` for per-layer breakdown.\n- Python: `interpreter.get_profiled_duration()` after enabling profiling\n\n**ONNX Runtime:**\n- `sess_options.enable_profiling = True` → JSON profiling output with per-kernel timings, memory allocation, and EP assignments\n- `ort_profile_viewer` for visualization\n\n**TensorRT:**\n- `trtexec` CLI: NVIDIA's official benchmarking tool. `trtexec --onnx=model.onnx --int8 --verbose` gives per-layer timing, memory usage, and kernel selection.\n- Nsight Systems: GPU-level profiling showing CUDA kernel launches, memory transfers, and pipeline stalls\n- Nsight Compute: Per-kernel profiling showing compute utilization, memory throughput, and occupancy\n\n**Jetson-specific:**\n- `tegrastats`: Real-time monitoring of GPU/CPU utilization, memory, temperature, and power\n- `jetson_clocks`: Lock clocks for reproducible benchmarks (prevents DVFS from skewing results)\n- `jtop`: Top-like interface for Jetson monitoring\n\n**Android:**\n- `Perfetto` for system-wide tracing (CPU scheduling, GPU commands, memory)\n- Android GPU Inspector for GPU profiling\n- `systrace` for general Android profiling"
        },
        {
          type: "callout",
          variant: "warning",
          title: "The Warm-Up Tax",
          text: "Always discard the first 5-10 inference runs when benchmarking. First-run latency includes JIT compilation (NNAPI), cache warming, memory allocation, and GPU shader compilation. Reporting first-run latency as steady-state performance is the most common benchmarking mistake. For TensorRT, the first run after engine deserialization can be 10-100x slower than steady-state."
        },

        // ── Section 3: Batching Strategies ──
        {
          type: "heading",
          text: "Batching Strategies on Edge Devices"
        },
        {
          type: "text",
          text: "Batching on edge is counterintuitive — unlike cloud inference where larger batches always improve GPU utilization, edge devices often perform best at batch=1:\n\n**Why batch=1 is often optimal on edge:**\n- Latency constraint: Each additional item in the batch adds to per-batch latency. If your latency budget is 30ms, batch=4 might push you to 50ms.\n- Memory constraint: Activation memory scales linearly with batch size. A batch=8 MobileNet needs 8x the activation memory.\n- Cache behavior: Batch=1 keeps the working set in L2 cache. Larger batches may cause cache thrashing.\n\n**When batching helps:**\n- GPU inference: Even mobile GPUs benefit from small batches (2-4) because the kernel launch overhead is amortized. The GPU is underutilized at batch=1 for small models.\n- Video analytics: If processing multiple camera streams, batch frames from different cameras together rather than processing them sequentially.\n- Offline processing: When latency is not critical (e.g., batch processing photos overnight), use the largest batch that fits in memory."
        },
        {
          type: "text",
          text: "**Micro-batching pattern:**\nFor multi-stream video analytics, accumulate frames from multiple streams and process as a batch:\n\n1. Camera threads push frames to a shared queue (lock-free ring buffer)\n2. Inference thread dequeues up to N frames (or waits max T milliseconds)\n3. Batch inference on N frames\n4. Distribute results back to per-stream queues\n\nThis amortizes GPU kernel launch overhead while keeping per-frame latency bounded by T. Typical values: N=4-8, T=10-30ms.\n\n**Async preprocessing pipeline:**\nOverlap preprocessing with inference using double buffering:\n- While the GPU processes batch K, the CPU preprocesses batch K+1\n- Requires two input buffers but hides preprocessing latency entirely\n- On Jetson, combine with NVDEC (hardware video decode) for zero-CPU-cost frame acquisition"
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 8 — On-Device Training, Federated Learning & Personalization
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "on-device-training-federated-learning",
      title: "On-Device Training, Federated Learning & Personalization",
      readTime: "15 min",
      content: [
        {
          type: "text",
          text: "On-device training flips the traditional ML pipeline: instead of sending data to the cloud for training, you bring training to where the data lives. This is driven by three forces: privacy regulations (GDPR, HIPAA) that restrict data movement, latency requirements that demand instant adaptation, and bandwidth costs that make uploading raw data impractical. The challenge is that edge devices have 100-1000x less compute and memory than training servers."
        },

        // ── Section 1: On-Device Fine-Tuning ──
        {
          type: "heading",
          text: "On-Device Fine-Tuning: What Is Practical"
        },
        {
          type: "text",
          text: "Full training of large models on edge devices is impractical — a MobileNetV2 backward pass requires ~8x the memory of a forward pass. But targeted fine-tuning is feasible:\n\n**Last-layer fine-tuning:** Freeze all layers except the final classifier. Only the last FC layer's gradients and optimizer state need memory. For MobileNetV2 with 1000 classes, the last layer is 1280×1000 = 1.28M parameters × 4 bytes × 3 (weight + gradient + optimizer) ≈ 15 MB. Feasible on any phone.\n\n**Adapter layers (LoRA on device):** Insert small trainable matrices (rank 4-16) into frozen layers. For a model with 10 adapted layers, this might add 50K-200K trainable parameters. PyTorch Mobile and TFLite support custom training loops.\n\n**Personalization layers:** Add a small head that learns user-specific patterns while the backbone stays frozen. Example: a keyboard prediction model that adapts to each user's vocabulary without sending their text to the cloud."
        },
        {
          type: "text",
          text: "**Framework support for on-device training:**\n\n- **PyTorch Mobile:** Supports `model.train()` mode on Android/iOS. Full autograd support. Memory is the constraint — use gradient checkpointing and small batch sizes.\n- **TFLite Transfer Learning:** TFLite supports training via the `Interpreter` API with trainable variables. Limited to supported ops in training mode.\n- **CoreML On-Device Training:** Available since iOS 15. Supports updating any subset of model parameters. Apple provides pre-built personalization APIs for vision and NLP.\n- **ExecuTorch:** Meta's new runtime supports on-device fine-tuning with memory-efficient attention and quantized training."
        },

        // ── Section 2: Federated Learning ──
        {
          type: "heading",
          text: "Federated Learning: Training Without Data Movement"
        },
        {
          type: "text",
          text: "Federated Learning (FL) trains a global model across distributed edge devices without centralizing data:\n\n**Federated Averaging (FedAvg) — the baseline algorithm:**\n1. Server sends global model weights to K selected devices\n2. Each device trains on its local data for E epochs (typically E=1-5)\n3. Each device sends its weight update (delta) to the server\n4. Server averages the updates: `global_weights += (1/K) * sum(deltas)`\n5. Repeat\n\n**Key challenges:**\n\n**Non-IID data:** Each device has different data distributions. A keyboard model on a doctor's phone sees medical terms; a teenager's phone sees slang. FedAvg can diverge on highly non-IID data. Fixes: FedProx (adds a proximal term to keep local updates close to global), SCAFFOLD (variance reduction), per-layer personalization.\n\n**Communication efficiency:** Sending full model updates (e.g., 10 MB for MobileNet) from millions of devices is expensive. Compression techniques:\n- Gradient quantization: Send INT8 or even binary (±1) gradients\n- Top-K sparsification: Only send the K largest gradient values\n- Federated distillation: Send soft labels instead of gradients\n\n**Privacy:** Even without sending raw data, model updates can leak information. Differential Privacy (DP) adds calibrated noise to updates, providing mathematical privacy guarantees. Google's FL framework clips per-example gradients and adds Gaussian noise."
        },
        {
          type: "callout",
          variant: "info",
          title: "FL in Production",
          text: "Google deploys federated learning at scale for Gboard (next-word prediction), Hey Google (hotword model), and Smart Compose. Apple uses FL for Siri, QuickType keyboard, and photo search. These systems train across millions of devices with differential privacy guarantees. The scale is staggering: Google's FL system can aggregate updates from 10,000+ devices in a single round, running on-device training only when the phone is idle, charging, and on WiFi."
        },

        // ── Section 3: Practical FL Architecture ──
        {
          type: "heading",
          text: "Practical FL Architecture"
        },
        {
          type: "text",
          text: "A production FL system has several components beyond the basic FedAvg loop:\n\n**Device eligibility:** Only train when the device is: charging (to avoid battery drain), on WiFi (to avoid mobile data costs), idle (to avoid user-perceived slowdowns), has sufficient storage for training data cache.\n\n**Secure aggregation:** Cryptographic protocol that allows the server to compute the sum of updates without seeing any individual update. Uses secret sharing: each device splits its update into shares, sends shares to other devices, and the server only sees the aggregated sum.\n\n**Model versioning:** The FL server maintains model versions. Devices may be training on version N while version N+1 is already deployed to other devices. The server must handle stale updates gracefully (typically by discarding updates from models more than M versions behind).\n\n**Failure handling:** Devices can disconnect mid-round (user leaves WiFi, phone runs out of battery). The server uses over-provisioning: select 1.3K devices to start a round, require only K completions. Stragglers are dropped.\n\n**Open-source frameworks:**\n- **Flower (flwr.ai):** Python framework, supports PyTorch/TF/JAX. Clean API, good for research and production.\n- **PySyft:** Focuses on privacy-preserving FL with secure computation primitives.\n- **TensorFlow Federated (TFF):** Google's framework, deeply integrated with TF ecosystem.\n- **FedML:** Supports cross-silo and cross-device FL, MLOps integration."
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 9 — Model Serving at the Edge: REST, gRPC & Triton
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "edge-model-serving-triton",
      title: "Model Serving at the Edge: REST, gRPC & Triton",
      readTime: "15 min",
      content: [
        {
          type: "text",
          text: "Model serving at the edge exists on a spectrum from direct function calls (model loaded in the application process) to full inference servers with HTTP/gRPC APIs, model management, and multi-model support. The right choice depends on your deployment topology: a single model in a mobile app uses direct function calls; a Jetson running 5 models for a smart camera system benefits from Triton Inference Server."
        },

        // ── Section 1: Serving Patterns ──
        {
          type: "heading",
          text: "Edge Serving Patterns"
        },
        {
          type: "text",
          text: "**Pattern 1: In-Process Inference (Direct Function Call)**\nThe model is loaded directly in the application process. The inference call is a function call — no serialization, no network overhead.\n\n- **When to use:** Mobile apps, single-model embedded systems, latency-critical applications (<5ms budget)\n- **Advantages:** Zero serialization overhead, minimum latency, no additional processes\n- **Disadvantages:** Model lifecycle tied to application lifecycle, no model versioning, hard to run multiple models with different frameworks\n- **Example:** TFLite Interpreter in an Android app, CoreML in an iOS app\n\n**Pattern 2: Sidecar Inference Server**\nA lightweight inference process running alongside the application on the same device. Communication via Unix domain sockets, shared memory, or localhost HTTP/gRPC.\n\n- **When to use:** Multi-model systems, microservice architecture on edge\n- **Advantages:** Model can be updated independently, process isolation, can serve multiple applications\n- **Disadvantages:** IPC overhead (0.1-1ms per inference), additional process management\n- **Example:** NVIDIA Triton on Jetson, ONNX Runtime Server\n\n**Pattern 3: Edge Gateway**\nA dedicated inference server that multiple edge devices connect to. Runs on a more powerful edge node (e.g., Jetson AGX Orin in a server rack at the edge location).\n\n- **When to use:** Multiple simple devices (cameras) need inference but cannot run models locally\n- **Advantages:** Centralized model management, efficient GPU utilization, easier updates\n- **Disadvantages:** Network latency (1-10ms LAN), single point of failure\n- **Example:** Triton on an edge server processing feeds from 8 IP cameras"
        },

        // ── Section 2: REST vs gRPC ──
        {
          type: "heading",
          text: "REST vs gRPC for Edge Inference"
        },
        {
          type: "text",
          text: "**REST (HTTP/JSON):**\n- Overhead: JSON serialization of tensors is expensive. A 224x224x3 FP32 image is 600 KB as JSON (text encoding of floats) vs 150 KB as binary. Add HTTP headers, TCP overhead.\n- Latency: 1-5ms overhead per request on localhost, 5-20ms over LAN\n- Advantages: Universal client support, easy debugging (curl), browser-compatible\n- Use case: Low-frequency inference (< 10 req/sec), development/debugging\n\n**gRPC (HTTP/2 + Protobuf):**\n- Overhead: Binary protobuf serialization is ~10x smaller than JSON for tensor data. HTTP/2 multiplexing and header compression reduce per-request overhead.\n- Latency: 0.3-1ms overhead per request on localhost, 1-5ms over LAN\n- Advantages: Streaming (bidirectional for real-time pipelines), strong typing, code generation\n- Use case: High-frequency inference (>10 req/sec), multi-stream video, production systems\n\n**Shared memory (zero-copy):**\n- Overhead: Near-zero. Client writes tensor to shared memory region, sends a small message with offset/size. Server reads directly.\n- Latency: ~0.01-0.05ms\n- Advantages: Maximum throughput for co-located processes\n- Disadvantages: Complex error handling, platform-specific, security considerations\n- Use case: Triton's shared memory protocol for high-throughput video analytics"
        },

        // ── Section 3: Triton Inference Server on Edge ──
        {
          type: "heading",
          text: "Triton Inference Server on Jetson"
        },
        {
          type: "text",
          text: "NVIDIA Triton Inference Server is production-grade inference serving software that runs on Jetson (ARM64) as well as data center GPUs. It handles model management, scheduling, and hardware optimization.\n\n**Key capabilities for edge:**\n\n**Multi-framework support:** Load TensorRT, ONNX Runtime, TFLite, PyTorch, and TensorFlow models simultaneously. Each model can target a different backend — run your detection model on TensorRT and your classification model on TFLite within the same server.\n\n**Dynamic batching:** Triton queues incoming requests and combines them into batches to improve GPU utilization. Configure `max_batch_size`, `preferred_batch_size`, and `max_queue_delay_microseconds` per model.\n\n**Model ensembles:** Chain multiple models without client round-trips. Define a pipeline (e.g., preprocess → detect → classify) as an ensemble — Triton handles the intermediate data flow.\n\n**Model versioning:** Each model has a versioned directory. Triton can serve multiple versions simultaneously and handle gradual traffic shifting (canary deployment).\n\n**Metrics:** Prometheus endpoint with per-model latency, throughput, queue depth, GPU utilization, and error rates."
        },
        {
          type: "code",
          lang: "bash",
          code: `# Triton model repository structure on Jetson
model_repository/
├── yolov8_detection/
│   ├── config.pbtxt
│   ├── 1/
│   │   └── model.plan          # TensorRT engine
│   └── 2/
│       └── model.plan          # Updated TensorRT engine (v2)
├── mobilenet_classifier/
│   ├── config.pbtxt
│   └── 1/
│       └── model.onnx          # ONNX model (ORT backend)
└── ensemble_pipeline/
    ├── config.pbtxt             # Ensemble config chaining detection + classification
    └── 1/                       # Empty — ensemble has no model file

# config.pbtxt for TensorRT model
# name: "yolov8_detection"
# platform: "tensorrt_plan"
# max_batch_size: 8
# input [{ name: "images" data_type: TYPE_FP32 dims: [3, 640, 640] }]
# output [{ name: "output0" data_type: TYPE_FP32 dims: [84, 8400] }]
# dynamic_batching { preferred_batch_size: [4, 8] max_queue_delay_microseconds: 5000 }
# instance_group [{ count: 1 kind: KIND_GPU gpus: [0] }]

# Launch Triton on Jetson
docker run --gpus all --rm -p 8000:8000 -p 8001:8001 -p 8002:8002 \\
  -v /path/to/model_repository:/models \\
  nvcr.io/nvidia/tritonserver:24.01-py3-igpu \\
  tritonserver --model-repository=/models`
        },
        {
          type: "text",
          text: "**Resource management on Jetson:**\n\nTriton on a Jetson Orin Nano (8GB) requires careful resource allocation:\n- Triton base memory: ~500 MB\n- Each TensorRT model: model size + activation memory (typically 100-500 MB)\n- Each ORT model: model size + ORT runtime overhead\n- Leave 1-2 GB for OS and other processes\n\nPractical limit: 2-4 models on Orin Nano 8GB, 4-8 models on AGX Orin 64GB.\n\nUse `instance_group` to control GPU sharing. `count: 1` means one model instance — suitable for edge. `count: 2` means two instances that can run concurrently (useful for hiding memory transfer latency). On Jetson, `count: 1` is usually optimal to avoid memory contention."
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 10 — OTA Model Updates, Edge-Cloud Hybrid & Fleet Management
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "ota-updates-edge-cloud-hybrid-fleet",
      title: "OTA Model Updates, Edge-Cloud Hybrid & Fleet Management",
      readTime: "16 min",
      content: [
        {
          type: "text",
          text: "Deploying a model to edge devices is the beginning, not the end. The real challenge is maintaining, updating, and monitoring thousands or millions of devices in the field. This lesson covers the operational infrastructure needed for production edge AI: over-the-air (OTA) model updates, edge-cloud hybrid inference patterns, and fleet management strategies."
        },

        // ── Section 1: OTA Model Updates ──
        {
          type: "heading",
          text: "OTA Model Updates: Architecture and Safety"
        },
        {
          type: "text",
          text: "Updating a model on a remote edge device is fundamentally different from deploying a container to a cloud server. Edge devices are unreliable: they lose power, lose network connectivity, have limited storage for staging updates, and a bricked device might require a physical site visit to recover.\n\n**Update architecture:**\n\n**1. Model registry:** A central service that stores model versions with metadata (accuracy, size, target hardware, quantization config). Each model version has a unique ID and is immutable once published.\n\n**2. Update manifest:** A JSON document specifying: target model version, target device criteria (hardware type, current model version, device group), rollout percentage, and rollback triggers.\n\n**3. Device agent:** A lightweight daemon on each edge device that: polls for updates (or receives push notifications), downloads the new model, validates it (checksum, schema check, dummy inference), atomically swaps the active model, and reports the result."
        },
        {
          type: "text",
          text: "**Safe update patterns:**\n\n**A/B partition:** Maintain two model slots on the device. Download the new model to the inactive slot. Validate. Swap the active pointer (an atomic filesystem operation). If the new model fails (crash, accuracy regression), swap back. This is the same pattern used by Android OS updates.\n\n**Delta updates:** Instead of downloading the full model (e.g., 50 MB), compute a binary diff between the old and new model files. Delta sizes are typically 5-15% of the full model because most weights do not change between versions. Use bsdiff or zstd dictionary compression for efficient deltas.\n\n**Staged rollout:** Never push a model to all devices simultaneously:\n- 1% canary group (monitor for 24h)\n- 10% early adopters (monitor for 48h)\n- 50% general availability\n- 100% full rollout\n\nAt each stage, compare edge accuracy/latency/crash rate against the baseline. Automated rollback if any metric regresses by more than a threshold."
        },
        {
          type: "callout",
          variant: "warning",
          title: "The Brick Problem",
          text: "If a model update causes the inference process to crash on startup, and the device auto-restarts the process (systemd restart), you get a crash loop that can drain the battery, overheat the device, or make it unresponsive to further updates. Always implement a crash counter: if the new model crashes N times (typically N=3), automatically roll back to the previous version and report the failure. This is non-negotiable for any fleet deployment."
        },

        // ── Section 2: Edge-Cloud Hybrid Inference ──
        {
          type: "heading",
          text: "Edge-Cloud Hybrid Inference"
        },
        {
          type: "text",
          text: "Pure edge and pure cloud each have limitations. Hybrid architectures combine both:\n\n**Pattern 1: Edge-First with Cloud Fallback**\n- Run a fast, small model on-device for all inputs\n- When confidence is below a threshold, send the input to a larger cloud model\n- Example: On-device MobileNet classifier (5ms, 85% accuracy). Inputs with confidence < 0.7 are sent to a cloud EfficientNet-L2 (200ms round-trip, 98% accuracy). If 80% of inputs are above threshold, average latency = 0.8×5ms + 0.2×200ms = 44ms\n\n**Pattern 2: Edge Preprocessing + Cloud Inference**\n- Edge device handles data acquisition, preprocessing, and filtering\n- Only relevant data is sent to the cloud\n- Example: A security camera runs motion detection on-device (nearly free). Only frames with motion are sent to a cloud model for person detection. This reduces cloud costs by 90%+.\n\n**Pattern 3: Edge Inference + Cloud Aggregation**\n- Each edge device runs full inference locally\n- Results (not raw data) are sent to the cloud for aggregation, alerting, and analytics\n- Example: 500 retail cameras each run person counting locally. The cloud receives count data (tiny payload), builds store-wide heatmaps, and triggers staffing alerts."
        },
        {
          type: "text",
          text: "**Latency budget analysis:**\nFor edge-cloud hybrid, decompose the latency budget:\n\n```\nTotal budget: 200ms (interactive application)\n\nEdge preprocessing:     10ms\nEdge inference:         15ms\nNetwork RTT (LAN→WAN):  50-150ms (variable)\nCloud inference:        20ms\nNetwork RTT (return):   50-150ms\nPost-processing:         5ms\n\nTotal (cloud path):     150-350ms  ← exceeds budget!\nTotal (edge path):       30ms      ← within budget\n```\n\nThe analysis shows: for a 200ms budget, cloud fallback only works on fast networks (RTT < 75ms). On mobile networks (RTT 100-300ms), you must run everything on-device or accept timeout failures. Design the system to degrade gracefully: the edge model always produces an answer, and the cloud result improves the answer if it arrives in time."
        },

        // ── Section 3: Fleet Management ──
        {
          type: "heading",
          text: "Fleet Management: Monitoring 100K Devices"
        },
        {
          type: "text",
          text: "Managing a fleet of edge AI devices requires infrastructure that most ML engineers underestimate:\n\n**Device registry:** A database of all devices with their hardware specs, current model versions, last check-in time, location, and health status. This is your single source of truth for the fleet.\n\n**Telemetry pipeline:** Each device periodically reports:\n- Inference latency (p50, p95, p99)\n- Model accuracy proxy (confidence distribution, output distribution)\n- Hardware metrics (temperature, CPU/GPU utilization, memory usage, disk space)\n- Error counts (inference failures, OOM events, crash count)\n\nUse a lightweight agent (< 10 MB) that batches metrics and sends them via MQTT or HTTP to a time-series database (InfluxDB, TimescaleDB, or cloud equivalent). Budget 1-5 KB/minute per device. For 100K devices, that is 100-500 MB/hour of telemetry."
        },
        {
          type: "text",
          text: "**Data drift detection on-device:**\nCloud-based drift detection requires sending data to the cloud, which may be impractical. On-device drift detection:\n\n1. During initial deployment, compute a reference distribution of model input features (mean, std, histogram) from calibration data\n2. On-device, maintain a running statistics tracker (Welford's algorithm for online mean/variance)\n3. Periodically compare on-device distribution to reference using KS statistic or population stability index (PSI)\n4. If drift exceeds threshold, alert the fleet management system\n\nThis catches distribution shifts early — before they cause accuracy degradation.\n\n**Tools for fleet management:**\n- **AWS IoT Greengrass / Azure IoT Edge / Google Cloud IoT:** Cloud-managed edge runtimes with model deployment, OTA updates, and telemetry\n- **balena.io:** Docker-based device management for Linux devices (Raspberry Pi, Jetson)\n- **Mender:** Open-source OTA update manager for embedded Linux\n- **Edge Impulse:** End-to-end platform for edge ML from data collection to deployment\n- **Custom:** For large fleets, most companies build custom fleet management on top of Kubernetes (K3s on edge devices) with ArgoCD for GitOps-based model deployment"
        },

        // ── Section 4: Security ──
        {
          type: "heading",
          text: "Security Considerations for Edge AI"
        },
        {
          type: "text",
          text: "Edge devices are physically accessible to adversaries — unlike cloud servers in locked data centers:\n\n**Model theft:** Models on edge devices can be extracted from flash storage. Mitigations:\n- Encrypt the model at rest, decrypt into secure memory at runtime\n- Use hardware security modules (HSM) or Trusted Execution Environments (TEE) — ARM TrustZone, Intel SGX\n- Obfuscate the model format (not security, just speed bump)\n\n**Adversarial attacks:** Physical adversarial examples (stickers, patterns) can fool edge vision models. The model runs locally, so there is no cloud-side sanity check. Mitigations:\n- Adversarial training during model development\n- Input validation (check for unusual pixel patterns)\n- Ensemble of diverse models (harder to attack simultaneously)\n\n**Secure boot and attestation:** Ensure the device runs authorized software:\n- Secure boot chain: bootloader verifies kernel, kernel verifies filesystem, filesystem contains verified model files\n- Remote attestation: device proves to the fleet server that it is running the expected software stack\n\n**Update security:** Sign all model updates with the organization's private key. The device agent verifies the signature before applying the update. This prevents supply-chain attacks where a compromised CDN serves malicious models."
        }
      ]
    }
  ];
})();
