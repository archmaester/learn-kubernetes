// Patches the Compiler Stack module (m21) with full tutorial lesson content.
// Loaded after curriculum.js. m21 = CURRICULUM.phases[5].modules[5]
(function patchCompilerStackLessons() {
  const m = CURRICULUM.phases[5].modules[5]; // phase-6 (index 5), sixth module (m21)

  m.lessons = [

    // =====================================================================
    // LESSON 1 - The ML Compiler Landscape
    // =====================================================================
    {
      id: "ml-compiler-landscape",
      title: "The ML Compiler Landscape: Why Compilers Matter",
      readTime: "20 min",
      content: [
        {
          type: "heading",
          text: "The Gap Between Frameworks and Hardware"
        },
        {
          type: "text",
          text: "When you write <code>model(input)</code> in PyTorch or TensorFlow, dozens of software layers intervene before any silicon actually computes. Each layer is an opportunity for optimization &mdash; or waste. ML compilers exist to close the gap between the high-level, framework-friendly representation of your model and the hardware-specific instructions that run on CPUs, GPUs, NPUs, DSPs, and custom accelerators."
        },
        {
          type: "text",
          text: "Without a compiler, every operator dispatches individually: framework overhead, memory allocation, kernel launch &mdash; repeated per op. A compiler sees the <strong>entire computation graph</strong> and can fuse, reorder, and transform operations holistically."
        },
        {
          type: "heading",
          text: "The Problem: One Model, Many Targets"
        },
        {
          type: "text",
          text: "Consider deploying a single MobileNetV2 to: (1) an x86 server CPU, (2) an NVIDIA GPU, (3) a Qualcomm Hexagon DSP, (4) an Apple Neural Engine, (5) a Cortex-M microcontroller. Each target has radically different ISAs, memory hierarchies, parallelism models, and supported operations. Hand-tuning for each is impossible at scale."
        },
        {
          type: "code",
          lang: "text",
          filename: "The Compilation Pipeline (Conceptual)",
          code: "Framework Model (PyTorch / TF / JAX / ONNX)\n        |\n        v\n+------------------+\n| Frontend Import  |  Convert to compiler IR\n+------------------+\n        |\n        v\n+------------------+\n| Graph-Level Opts |  Fusion, constant folding, layout transform\n+------------------+\n        |\n        v\n+------------------+\n| Operator-Level   |  Loop tiling, vectorization, scheduling\n| Optimizations    |\n+------------------+\n        |\n        v\n+------------------+\n| Hardware Codegen |  LLVM IR, CUDA, OpenCL, custom NPU code\n+------------------+\n        |\n        v\n  Executable Binary / Shared Library"
        },
        {
          type: "heading",
          text: "Intermediate Representations (IRs)"
        },
        {
          type: "text",
          text: "The core abstraction in any compiler is the <strong>IR</strong> &mdash; an intermediate representation that decouples the source (model) from the target (hardware). Different compilers use different IRs:"
        },
        {
          type: "list",
          items: [
            "<strong>TVM Relay</strong>: A functional, statically-typed IR for tensor computations. Supports control flow, closures, and algebraic data types. Being succeeded by TVM Unity / Relax.",
            "<strong>TVM TIR (Tensor IR)</strong>: A lower-level loop-based IR where scheduling decisions (tiling, unrolling, vectorization) are explicit.",
            "<strong>XLA HLO (High Level Optimizer)</strong>: Google's IR for XLA. Functional, SSA-form, hardware-agnostic. StableHLO is the open, versioned variant.",
            "<strong>MLIR</strong>: Not a single IR but a <em>framework for building IRs</em>. Uses 'dialects' (linalg, affine, scf, tensor, memref, arith, LLVM) that progressively lower from high-level to machine-level.",
            "<strong>ONNX</strong>: An interchange format, not a compiler IR. But it serves as the common frontend for many compiler stacks.",
            "<strong>TOSA (Tensor Operator Set Architecture)</strong>: An MLIR dialect designed as a portable, hardware-agnostic target for edge inference compilers."
          ]
        },
        {
          type: "heading",
          text: "Major ML Compiler Stacks"
        },
        {
          type: "code",
          lang: "text",
          filename: "Compiler Stack Comparison",
          code: "Stack       | IR(s)              | Strengths                        | Best For\n------------|--------------------|---------------------------------|------------------\nTVM         | Relay, TIR         | Auto-tuning, broad HW support    | Edge, custom HW\nXLA         | HLO, StableHLO    | Google ecosystem, TPU support    | JAX/TF on GPU/TPU\nMLIR/IREE   | MLIR dialects      | Modular, progressive lowering    | Cross-platform\nTensorRT    | Proprietary        | NVIDIA GPU perf, INT8/FP16       | NVIDIA deployment\nOpenVINO    | nGraph/MLIR        | Intel CPU/GPU/VPU optimization   | Intel hardware\nCoreML      | MIL                | Apple Silicon (ANE/GPU/CPU)      | iOS/macOS\nQNN         | Proprietary        | Qualcomm DSP/NPU                 | Mobile (Snapdragon)"
        },
        {
          type: "heading",
          text: "Why This Matters for Edge AI"
        },
        {
          type: "text",
          text: "On edge devices, you cannot afford the overhead of framework-level dispatch. Every microsecond and milliwatt counts. The compiler is your primary lever for performance after model architecture and quantization. A well-compiled INT8 MobileNetV2 can be <strong>5-10x faster</strong> than naive eager execution of the same model."
        },
        {
          type: "text",
          text: "Understanding compilers also demystifies performance cliffs: why does adding one seemingly simple op tank your latency? Often it's because the compiler couldn't fuse across it, forcing a memory round-trip. Compiler literacy lets you design models that <em>compile well</em>."
        },
        {
          type: "heading",
          text: "The Full-Stack Mental Model"
        },
        {
          type: "code",
          lang: "text",
          filename: "Performance Bottleneck Layers",
          code: "Layer 1: Model Architecture     -> Choose efficient ops, avoid compiler-unfriendly patterns\nLayer 2: Graph Optimizations     -> Fusion, layout, constant folding\nLayer 3: Operator Scheduling     -> Tiling, vectorization, parallelism\nLayer 4: Hardware Codegen        -> ISA-specific instructions, DMA, cache utilization\nLayer 5: Runtime                 -> Memory allocation, kernel dispatch, pipeline overlap\n\nBottleneck at ANY layer limits end-to-end performance.\nProfiling must span all layers to find the true bottleneck."
        },
        {
          type: "text",
          text: "In this module, we'll work through each layer &mdash; understanding what happens, what can go wrong, and how to fix it. By the end, you'll be able to take a trained model and systematically compile, optimize, and profile it for any target hardware."
        }
      ]
    },

    // =====================================================================
    // LESSON 2 - TVM: End-to-End ML Compilation
    // =====================================================================
    {
      id: "tvm-end-to-end",
      title: "TVM: End-to-End ML Compilation",
      readTime: "25 min",
      content: [
        {
          type: "heading",
          text: "TVM Architecture Overview"
        },
        {
          type: "text",
          text: "Apache TVM is the most widely-used open-source ML compiler. It takes models from any framework (PyTorch, TF, ONNX, MXNet) and compiles them into optimized code for any hardware target. TVM's architecture has two key IR levels: <strong>Relay</strong> (graph-level) and <strong>TIR</strong> (tensor-level), connected by a lowering pipeline."
        },
        {
          type: "code",
          lang: "text",
          filename: "TVM Compilation Flow",
          code: "PyTorch / ONNX / TF Model\n        |\n        v\n  relay.frontend.from_pytorch()  (or from_onnx, etc.)\n        |\n        v\n  Relay IR  (high-level graph: conv2d, relu, add, ...)\n        |\n        v\n  Relay Passes  (FuseOps, FoldConstant, AlterOpLayout, ...)\n        |\n        v\n  TE (Tensor Expression) / TIR  (loop nests, schedules)\n        |\n        v\n  Auto-Tuning  (MetaSchedule / AutoTVM)\n        |\n        v\n  Code Generation  (LLVM, CUDA, OpenCL, Vulkan, C, ...)\n        |\n        v\n  tvm.runtime.Module  (deployable .so / .tar)"
        },
        {
          type: "heading",
          text: "Relay IR: The Graph Level"
        },
        {
          type: "text",
          text: "Relay is a functional IR for tensor computations. Unlike imperative graph representations, Relay supports <strong>let-bindings</strong>, <strong>closures</strong>, <strong>pattern matching</strong>, and <strong>type inference</strong>. This enables powerful graph transformations."
        },
        {
          type: "code",
          lang: "python",
          filename: "Importing a PyTorch Model to Relay",
          code: "import torch\nimport tvm\nfrom tvm import relay\n\n# Load a pretrained PyTorch model\nmodel = torch.hub.load('pytorch/vision', 'mobilenet_v2', pretrained=True)\nmodel.eval()\n\n# Create example input\ninput_shape = [1, 3, 224, 224]\ninput_data = torch.randn(input_shape)\n\n# Trace the model\nscripted = torch.jit.trace(model, input_data)\n\n# Convert to Relay IR\nshape_list = [(\"input0\", input_shape)]\nmod, params = relay.frontend.from_pytorch(scripted, shape_list)\n\n# Inspect the Relay IR\nprint(mod.astext(show_meta_data=False))  # Human-readable Relay\nprint(f\"Number of parameters: {len(params)}\")"
        },
        {
          type: "heading",
          text: "Relay Optimization Passes"
        },
        {
          type: "text",
          text: "TVM applies a sequence of <strong>optimization passes</strong> to the Relay graph. Each pass transforms the IR while preserving semantics. Key passes include:"
        },
        {
          type: "list",
          items: [
            "<strong>FuseOps</strong>: Merges compatible operators into a single kernel (e.g., conv2d + bias_add + relu). The single most impactful optimization.",
            "<strong>FoldConstant</strong>: Evaluates operations on constant inputs at compile time. Removes dead computations.",
            "<strong>AlterOpLayout</strong>: Transforms data layouts (NCHW -> NCHW8c, NHWC) to match hardware preferences.",
            "<strong>SimplifyInference</strong>: Folds batch normalization into preceding convolution weights.",
            "<strong>EliminateCommonSubexpr</strong>: Detects and removes redundant computations.",
            "<strong>CombineParallelConv2D</strong>: Groups independent convolutions for batch execution.",
            "<strong>DeadCodeElimination</strong>: Removes unreachable or unused computations."
          ]
        },
        {
          type: "code",
          lang: "python",
          filename: "Applying Relay Passes and Compiling",
          code: "# Define the target hardware\ntarget = tvm.target.Target(\"llvm -mcpu=skylake-avx512\")\n# For GPU: target = tvm.target.Target(\"cuda -arch=sm_80\")\n\n# Apply optimization passes and compile\nwith tvm.transform.PassContext(opt_level=3):  # 0=none, 3=aggressive\n    lib = relay.build(mod, target=target, params=params)\n\n# The compiled module is ready for deployment\n# Save it:\nlib.export_library(\"mobilenetv2_compiled.so\")\n\n# Run inference:\nfrom tvm.contrib import graph_executor\ndev = tvm.cpu(0)  # or tvm.cuda(0)\nruntime = graph_executor.GraphModule(lib[\"default\"](dev))\n\nimport numpy as np\ninput_np = np.random.randn(1, 3, 224, 224).astype(\"float32\")\nruntime.set_input(\"input0\", input_np)\nruntime.run()\noutput = runtime.get_output(0).numpy()\nprint(f\"Output shape: {output.shape}\")"
        },
        {
          type: "heading",
          text: "TIR: The Tensor Level"
        },
        {
          type: "text",
          text: "Below Relay, each fused operator is lowered to <strong>TIR (Tensor IR)</strong> &mdash; a loop-level representation where scheduling decisions become explicit. TIR represents computations as nested loops with explicit memory access patterns."
        },
        {
          type: "code",
          lang: "python",
          filename: "Understanding TIR Schedule Primitives",
          code: "# TIR schedule primitives control how loops execute:\n#\n# split(loop, factor)     -> Breaks a loop into outer/inner\n# reorder(loops)          -> Changes loop nesting order\n# vectorize(loop)         -> Maps loop to SIMD instructions\n# unroll(loop)            -> Eliminates loop overhead\n# parallel(loop)          -> Multi-thread the loop\n# bind(loop, thread_axis) -> Map to GPU thread/block\n# cache_read / cache_write -> Explicit data staging\n# compute_at              -> Fuse producer into consumer loop\n\n# Example: simple matrix multiply in TE (Tensor Expression)\nfrom tvm import te\n\nM, N, K = 1024, 1024, 1024\nA = te.placeholder((M, K), name=\"A\")\nB = te.placeholder((K, N), name=\"B\")\nk = te.reduce_axis((0, K), name=\"k\")\nC = te.compute((M, N), lambda i, j: te.sum(A[i, k] * B[k, j], axis=k), name=\"C\")\n\n# Create a schedule\ns = te.create_schedule(C.op)\n\n# Apply tiling for cache efficiency\nxo, xi = s[C].split(C.op.axis[0], factor=32)  # Tile rows\nyo, yi = s[C].split(C.op.axis[1], factor=32)  # Tile cols\nko, ki = s[C].split(k, factor=4)               # Tile reduction\ns[C].reorder(xo, yo, ko, xi, ki, yi)           # Reorder for locality\ns[C].vectorize(yi)                              # Vectorize innermost\ns[C].parallel(xo)                               # Parallelize outer\n\n# Build and run\nfunc = tvm.build(s, [A, B, C], target=\"llvm\")\nprint(tvm.lower(s, [A, B, C], simple_mode=True))  # Inspect lowered TIR"
        },
        {
          type: "heading",
          text: "Operator Fusion in Detail"
        },
        {
          type: "text",
          text: "Operator fusion is the most impactful single optimization. Without fusion, each operator reads from and writes to global memory (DRAM). With fusion, intermediate results stay in fast registers or cache. TVM classifies operators into fusion categories:"
        },
        {
          type: "code",
          lang: "text",
          filename: "TVM Fusion Categories",
          code: "Category       | Description                    | Examples\n---------------|--------------------------------|---------------------------\nInjective      | 1:1 element mapping            | relu, add, sigmoid, cast\nReduction      | Many:1 mapping                 | sum, mean, max, softmax\nComplex-out    | Fused compute pattern          | conv2d, matmul, dense\nOpaque         | Cannot fuse (side effects)     | sort, NMS, custom ops\n\nFusion Rules:\n- Injective ops chain freely: relu(add(x, y)) -> single kernel\n- Injective after reduction: OK (e.g., relu(batch_norm(...)))\n- Injective after complex-out: OK (e.g., relu(conv2d(...)))\n- Complex-out + complex-out: CANNOT fuse (each needs its own loop nest)\n- Opaque ops: always boundary, never fuse\n\nFusion breaks at:\n- Dynamic shapes (in some compilers)\n- Non-element-wise ops between fusible ops\n- Memory layout mismatches"
        },
        {
          type: "heading",
          text: "BYOC: Bring Your Own Codegen"
        },
        {
          type: "text",
          text: "Not every operator is best compiled by TVM. Hardware vendors often provide hand-tuned kernels (e.g., cuDNN for NVIDIA, ACL for ARM). TVM's <strong>BYOC framework</strong> lets you partition the graph: offload supported subgraphs to vendor libraries while TVM handles the rest."
        },
        {
          type: "code",
          lang: "python",
          filename: "BYOC Partitioning Example (Conceptual)",
          code: "from tvm.relay.op.contrib import get_pattern_table\n\n# Register patterns that should be offloaded to a vendor runtime\n# (e.g., DNNL for x86, ACL for ARM, TensorRT for NVIDIA)\npatterns = get_pattern_table(\"dnnl\")\n\n# Partition the Relay graph\nmod = relay.transform.MergeComposite(patterns)(mod)\nmod = relay.transform.AnnotateTarget([\"dnnl\"])(mod)\nmod = relay.transform.PartitionGraph()(mod)\n\n# Result: some subgraphs run via DNNL, rest compiled by TVM\n# This is how TVM achieves performance close to vendor SDKs\n# while still handling the full model end-to-end."
        },
        {
          type: "heading",
          text: "TVM Unity / Relax (Next Generation)"
        },
        {
          type: "text",
          text: "TVM is evolving toward <strong>TVM Unity</strong>, which introduces <strong>Relax</strong> &mdash; a new graph-level IR that natively supports dynamic shapes, first-class GPU kernel abstractions, and tighter integration between graph and tensor levels. Relax replaces Relay with a more flexible IR that can represent modern workloads (LLMs, dynamic batching) that Relay struggles with."
        },
        {
          type: "list",
          items: [
            "<strong>Dynamic shapes</strong>: Relax uses symbolic shape inference, supporting models with variable sequence lengths or batch sizes.",
            "<strong>First-class GPU abstractions</strong>: GPU kernels are first-class objects in Relax, enabling finer-grained optimization.",
            "<strong>TVMScript</strong>: Python-syntax DSL for writing both Relax and TIR programs, making compiler development more accessible.",
            "<strong>Unified pipeline</strong>: Graph (Relax) and tensor (TIR) levels share the same compilation infrastructure."
          ]
        }
      ]
    },

    // =====================================================================
    // LESSON 3 - XLA and StableHLO
    // =====================================================================
    {
      id: "xla-stablehlo",
      title: "XLA and StableHLO: Google's Compiler Stack",
      readTime: "22 min",
      content: [
        {
          type: "heading",
          text: "What is XLA?"
        },
        {
          type: "text",
          text: "<strong>XLA (Accelerated Linear Algebra)</strong> is Google's domain-specific compiler for linear algebra. Originally built for TensorFlow, it's now the default compiler for <strong>JAX</strong> and powers all TPU workloads. XLA takes high-level tensor operations and produces optimized machine code for CPUs, GPUs, and TPUs."
        },
        {
          type: "text",
          text: "XLA's key insight: by seeing the entire computation as a single compilation unit, it can make global optimization decisions that per-operator libraries cannot. This is especially powerful for <strong>fusion</strong> &mdash; XLA aggressively fuses element-wise operations, broadcasts, and reductions."
        },
        {
          type: "heading",
          text: "HLO: High Level Optimizer IR"
        },
        {
          type: "text",
          text: "XLA's IR is called <strong>HLO (High Level Optimizer)</strong>. It's a functional, SSA-form representation where every value is defined exactly once. Operations are called 'instructions' and grouped into 'computations'."
        },
        {
          type: "code",
          lang: "python",
          filename: "Inspecting XLA HLO with JAX",
          code: "import jax\nimport jax.numpy as jnp\n\ndef simple_model(x, w, b):\n    \"\"\"A simple linear + relu computation.\"\"\"\n    return jax.nn.relu(x @ w + b)\n\n# Create inputs\nx = jnp.ones((32, 784))\nw = jnp.ones((784, 256))\nb = jnp.zeros((256,))\n\n# JIT compile and inspect HLO\nlowered = jax.jit(simple_model).lower(x, w, b)\nprint(lowered.as_text())  # StableHLO text representation\n\n# You can also see the optimized HLO:\ncompiled = lowered.compile()\nprint(compiled.as_text())  # Optimized HLO after XLA passes\n\n# Key things to look for in HLO:\n# - fusion{} blocks: operations XLA fused into a single kernel\n# - dot (matrix multiply), add, maximum (relu)\n# - Parameter shapes and layouts"
        },
        {
          type: "heading",
          text: "XLA Fusion Strategies"
        },
        {
          type: "text",
          text: "XLA's fusion is more aggressive than most compilers. It categorizes operations and decides fusion based on profitability heuristics:"
        },
        {
          type: "code",
          lang: "text",
          filename: "XLA Fusion Categories",
          code: "Fusion Kind     | Description                           | Example\n----------------|---------------------------------------|------------------\nkInput          | Fuse into the input of a dot/conv     | bias_add into matmul\nkOutput         | Fuse into the output of a dot/conv    | relu after matmul\nkLoop           | Fuse element-wise loop nests          | add + mul + exp\nkCustom         | Vendor-specific fused kernels         | cuDNN conv+bn+relu\n\nXLA Fusion Rules:\n1. Element-wise ops fuse greedily (loop fusion)\n2. Reduction + element-wise: fuse if shapes allow\n3. Dot/Conv + element-wise epilog: fuse into output\n4. Scatter/Gather: limited fusion, often boundaries\n5. Profitability check: fusion must reduce memory traffic\n\nXLA will NOT fuse if:\n- Fused kernel would exceed register/shared memory limits\n- Fusion creates a large intermediate that slows down the kernel\n- Operations have incompatible iteration patterns"
        },
        {
          type: "heading",
          text: "StableHLO: The Open Standard"
        },
        {
          type: "text",
          text: "<strong>StableHLO</strong> is an open, versioned specification extracted from XLA's HLO. It serves as a portable IR that frameworks (JAX, PyTorch/XLA, TF) can target, and compilers (XLA, IREE, TVM) can consume. It provides a stable contract between producers and consumers."
        },
        {
          type: "list",
          items: [
            "<strong>Versioned</strong>: Each op has a versioned specification with defined semantics. Backward compatibility is guaranteed within major versions.",
            "<strong>Portable</strong>: StableHLO programs can be serialized and deserialized across different versions and platforms.",
            "<strong>MLIR-based</strong>: StableHLO is defined as an MLIR dialect, enabling integration with the broader MLIR ecosystem.",
            "<strong>Framework-agnostic</strong>: JAX, PyTorch/XLA, and TensorFlow can all emit StableHLO."
          ]
        },
        {
          type: "code",
          lang: "python",
          filename: "JAX to StableHLO Workflow",
          code: "import jax\nimport jax.numpy as jnp\nfrom jax._src.lib.mlir import ir\n\ndef attention(q, k, v):\n    \"\"\"Simplified attention.\"\"\"\n    scores = q @ k.T / jnp.sqrt(q.shape[-1])\n    weights = jax.nn.softmax(scores, axis=-1)\n    return weights @ v\n\n# Lower to StableHLO\nq = jnp.ones((8, 64))\nk = jnp.ones((16, 64))\nv = jnp.ones((16, 64))\n\nlowered = jax.jit(attention).lower(q, k, v)\nstablehlo_text = lowered.as_text()\nprint(stablehlo_text)\n\n# The StableHLO can be:\n# 1. Compiled by XLA (default in JAX)\n# 2. Consumed by IREE for cross-platform deployment\n# 3. Imported by TVM for auto-tuning\n# 4. Serialized to a file for offline compilation\n\n# Serialize to bytes (portable)\nstablehlo_bytes = lowered.compiler_ir(dialect=\"stablehlo\")"
        },
        {
          type: "heading",
          text: "XLA for GPUs: How It Generates CUDA Kernels"
        },
        {
          type: "text",
          text: "When targeting NVIDIA GPUs, XLA generates CUDA kernels (PTX assembly). It makes critical decisions about:"
        },
        {
          type: "list",
          items: [
            "<strong>Thread block configuration</strong>: How many threads per block, blocks per grid.",
            "<strong>Shared memory usage</strong>: Which intermediates to stage in shared memory.",
            "<strong>Memory coalescing</strong>: Arranging memory accesses so adjacent threads access adjacent addresses.",
            "<strong>Fusion boundaries</strong>: Where to split the graph into separate CUDA kernels.",
            "<strong>cuBLAS/cuDNN offload</strong>: For matmul and conv, XLA can offload to hand-tuned vendor libraries."
          ]
        },
        {
          type: "heading",
          text: "XLA for TPUs"
        },
        {
          type: "text",
          text: "TPUs are XLA's native target. The compiler handles:<br/><br/>1. <strong>MXU (Matrix Multiply Unit) scheduling</strong>: Maps matmuls to the 128x128 systolic array.<br/>2. <strong>Memory tiling</strong>: TPU HBM has specific alignment requirements; XLA tiles data accordingly.<br/>3. <strong>Infeed/outfeed</strong>: Manages data movement between host and TPU.<br/>4. <strong>SPMD partitioning</strong>: For multi-chip TPU pods, XLA partitions the computation across chips with appropriate communication (all-reduce, all-gather)."
        },
        {
          type: "heading",
          text: "XLA vs Eager Mode: Performance Impact"
        },
        {
          type: "code",
          lang: "python",
          filename: "Benchmarking XLA Compilation Impact",
          code: "import jax\nimport jax.numpy as jnp\nimport time\n\ndef transformer_block(x, wq, wk, wv, wo, w1, w2):\n    \"\"\"Simplified transformer block.\"\"\"\n    # Self-attention\n    q, k, v = x @ wq, x @ wk, x @ wv\n    scores = q @ k.T / jnp.sqrt(q.shape[-1])\n    attn = jax.nn.softmax(scores, axis=-1) @ v\n    x = x + attn @ wo  # residual\n    # FFN\n    h = jax.nn.gelu(x @ w1)\n    x = x + h @ w2  # residual\n    return x\n\n# Create inputs\nkey = jax.random.PRNGKey(0)\nd = 512\nparams = [jax.random.normal(key, (d, d)) for _ in range(6)]\nx = jax.random.normal(key, (128, d))\n\n# Without JIT (dispatches ops individually)\nx_eager = transformer_block(x, *params)  # warmup\nstart = time.time()\nfor _ in range(100):\n    x_eager = transformer_block(x, *params)\n    x_eager.block_until_ready()\neager_time = (time.time() - start) / 100\n\n# With JIT (XLA compiles the entire function)\ntransformer_jit = jax.jit(transformer_block)\nx_jit = transformer_jit(x, *params)  # warmup + compile\nstart = time.time()\nfor _ in range(100):\n    x_jit = transformer_jit(x, *params)\n    x_jit.block_until_ready()\njit_time = (time.time() - start) / 100\n\nprint(f\"Eager: {eager_time*1000:.2f}ms  |  XLA JIT: {jit_time*1000:.2f}ms\")\nprint(f\"Speedup: {eager_time/jit_time:.1f}x\")\n# Typical speedup: 2-5x from fusion + memory optimization alone"
        },
        {
          type: "heading",
          text: "XLA Limitations and Gotchas"
        },
        {
          type: "list",
          items: [
            "<strong>Recompilation on shape change</strong>: XLA compiles for fixed shapes. New shapes trigger recompilation (costly). Use padding or bucketing to limit shape diversity.",
            "<strong>Dynamic control flow</strong>: Python control flow is traced once. Use <code>jax.lax.cond</code>, <code>jax.lax.scan</code> for dynamic behavior.",
            "<strong>Custom ops</strong>: Adding custom operations requires writing XLA custom calls &mdash; non-trivial.",
            "<strong>Debugging</strong>: Compiled code is hard to debug. HLO dumps help but require expertise to interpret.",
            "<strong>Compilation latency</strong>: First compilation can take seconds to minutes for large models. AOT compilation mitigates this."
          ]
        }
      ]
    },

    // =====================================================================
    // LESSON 4 - MLIR and IREE
    // =====================================================================
    {
      id: "mlir-iree",
      title: "MLIR and IREE: The Modular Compiler Infrastructure",
      readTime: "24 min",
      content: [
        {
          type: "heading",
          text: "Why MLIR?"
        },
        {
          type: "text",
          text: "Before MLIR, every ML compiler built its own IR from scratch: TVM had Relay/TIR, XLA had HLO, Glow had its IR, CoreML had MIL. This fragmentation meant duplicated effort and no reuse between stacks. <strong>MLIR (Multi-Level Intermediate Representation)</strong>, created at Google and now an LLVM project, solves this by providing a <em>framework for building IRs</em> rather than a single fixed IR."
        },
        {
          type: "text",
          text: "MLIR's key innovation is the <strong>dialect</strong> system. A dialect is a collection of operations, types, and attributes that model a specific abstraction level. You can define custom dialects for your domain and mix them freely. The compilation pipeline is a series of <strong>passes</strong> that progressively lower from high-level dialects to low-level ones."
        },
        {
          type: "heading",
          text: "MLIR Dialect Hierarchy"
        },
        {
          type: "code",
          lang: "text",
          filename: "Key MLIR Dialects (High to Low Level)",
          code: "Level          | Dialect       | What It Represents\n---------------|---------------|--------------------------------------------\nML Model       | StableHLO     | Hardware-agnostic tensor operations\n               | TOSA          | Portable tensor ops for edge inference\n               | torch         | PyTorch operations (via torch-mlir)\n               |\nTensor Math    | linalg        | Named tensor operations (matmul, conv, etc.)\n               | tensor        | Tensor creation, extraction, insertion\n               |\nLoop Level     | affine        | Polyhedral loop nests (enables tiling, fusion)\n               | scf           | Structured control flow (for, if, while)\n               |\nMemory Level   | memref        | Memory references (buffers with layout)\n               | bufferization | Tensor -> memref conversion\n               |\nHardware       | vector        | SIMD/vector operations\n               | gpu           | GPU thread/block/grid abstractions\n               | spirv         | Vulkan/OpenCL compute shaders\n               | arm_neon      | ARM NEON intrinsics\n               | llvm          | LLVM IR operations\n               |\nExecution      | async         | Asynchronous execution\n               | func          | Function definitions and calls"
        },
        {
          type: "heading",
          text: "Progressive Lowering"
        },
        {
          type: "text",
          text: "MLIR compilation works by <strong>progressive lowering</strong>: each pass converts operations from a higher-level dialect to a lower-level one. This is fundamentally different from monolithic compilers that go directly from graph to machine code."
        },
        {
          type: "code",
          lang: "text",
          filename: "Example: Lowering a Matrix Multiply",
          code: "Step 1: linalg.matmul (Named tensor operation)\n  linalg.matmul ins(%A, %B : tensor<64x128xf32>, tensor<128x256xf32>)\n                outs(%C : tensor<64x256xf32>) -> tensor<64x256xf32>\n\nStep 2: linalg.generic (Generalized loop representation)\n  linalg.generic {indexing_maps = [...], iterator_types = [\"parallel\", \"parallel\", \"reduction\"]}\n    ins(%A, %B) outs(%C) {\n      ^bb0(%a, %b, %c):\n        %prod = arith.mulf %a, %b\n        %sum = arith.addf %c, %prod\n        linalg.yield %sum\n    }\n\nStep 3: scf.for (Explicit loop nests after tiling)\n  scf.for %i = 0 to 64 step 32 {\n    scf.for %j = 0 to 256 step 32 {\n      scf.for %k = 0 to 128 step 4 {\n        // Vectorized inner kernel\n        vector.contract %a_tile, %b_tile, %c_tile\n      }\n    }\n  }\n\nStep 4: memref (Bufferized - tensors become memory references)\n  memref.alloc() : memref<64x256xf32>  // Output buffer\n  // Loads and stores to concrete memory\n\nStep 5: llvm (LLVM IR operations)\n  llvm.call @llvm.x86.avx512.vfmadd.ps(...)  // Fused multiply-add"
        },
        {
          type: "heading",
          text: "IREE: From IR to Deployment"
        },
        {
          type: "text",
          text: "<strong>IREE (Intermediate Representation Execution Environment)</strong> is a compiler and runtime that takes MLIR programs and produces efficient executables for CPUs, GPUs (Vulkan, CUDA, Metal, HIP), and embedded targets. Built by Google, IREE focuses on <strong>deployment</strong> &mdash; it's designed to produce small, fast, portable executables."
        },
        {
          type: "code",
          lang: "text",
          filename: "IREE Compilation Pipeline",
          code: "Input: StableHLO / TOSA / linalg-on-tensors\n        |\n        v\n  +-------------+\n  | Flow dialect |  Data flow + dispatch region formation\n  +-------------+  (identifies parallelizable work)\n        |\n        v\n  +--------------+\n  | Stream dialect|  Execution scheduling\n  +--------------+  (async, pipelining)\n        |\n        v\n  +-------------+\n  | HAL dialect  |  Hardware Abstraction Layer\n  +-------------+  (device-agnostic execution model)\n        |\n        v\n  Target-specific codegen:\n    - LLVM/CPU: x86, ARM, RISC-V\n    - SPIR-V: Vulkan, OpenCL\n    - CUDA/HIP: NVIDIA, AMD GPUs\n    - VMVX: Portable virtual machine (fallback)\n        |\n        v\n  IREE FlatBuffer Module (.vmfb)\n  (contains compiled kernels + execution plan)"
        },
        {
          type: "code",
          lang: "python",
          filename: "Compiling and Running with IREE (Python API)",
          code: "import iree.compiler as ireec\nimport iree.runtime as ireert\nimport numpy as np\n\n# MLIR input (StableHLO or linalg-on-tensors)\nmlir_source = \"\"\"\nfunc.func @simple_matmul(%arg0: tensor<64x128xf32>, %arg1: tensor<128x256xf32>)\n    -> tensor<64x256xf32> {\n  %cst = arith.constant 0.0 : f32\n  %init = tensor.empty() : tensor<64x256xf32>\n  %fill = linalg.fill ins(%cst : f32) outs(%init : tensor<64x256xf32>) -> tensor<64x256xf32>\n  %result = linalg.matmul ins(%arg0, %arg1 : tensor<64x128xf32>, tensor<128x256xf32>)\n                          outs(%fill : tensor<64x256xf32>) -> tensor<64x256xf32>\n  return %result : tensor<64x256xf32>\n}\n\"\"\"\n\n# Compile for CPU\ncompiled = ireec.tools.compile_str(\n    mlir_source,\n    target_backends=[\"llvm-cpu\"],\n    input_type=\"auto\",\n)\n\n# Load and run\nconfig = ireert.Config(\"local-task\")  # CPU backend\nmodule = ireert.load_vm_module(\n    ireert.VmModule.copy_buffer(ireert.instance(), compiled),\n    config,\n)\n\na = np.random.randn(64, 128).astype(np.float32)\nb = np.random.randn(128, 256).astype(np.float32)\nresult = module.simple_matmul(a, b)\nprint(f\"Result shape: {result.shape}\")  # (64, 256)\n\n# For Vulkan GPU backend:\n# compiled = ireec.tools.compile_str(mlir_source, target_backends=[\"vulkan-spirv\"])\n# config = ireert.Config(\"vulkan\")"
        },
        {
          type: "heading",
          text: "torch-mlir: PyTorch to MLIR"
        },
        {
          type: "text",
          text: "<strong>torch-mlir</strong> bridges PyTorch and the MLIR ecosystem. It converts PyTorch models into MLIR dialects (StableHLO, TOSA, or linalg-on-tensors), which can then be compiled by IREE, XLA, or other MLIR-based compilers."
        },
        {
          type: "code",
          lang: "python",
          filename: "PyTorch to IREE via torch-mlir",
          code: "import torch\nimport torch_mlir\n\n# Define a PyTorch model\nclass ConvBlock(torch.nn.Module):\n    def __init__(self):\n        super().__init__()\n        self.conv = torch.nn.Conv2d(3, 16, 3, padding=1)\n        self.bn = torch.nn.BatchNorm2d(16)\n        self.relu = torch.nn.ReLU()\n\n    def forward(self, x):\n        return self.relu(self.bn(self.conv(x)))\n\nmodel = ConvBlock().eval()\nexample_input = torch.randn(1, 3, 224, 224)\n\n# Lower to StableHLO MLIR\nmodule = torch_mlir.compile(\n    model,\n    example_input,\n    output_type=torch_mlir.OutputType.STABLEHLO,\n)\nprint(module.operation.get_asm(large_elements_limit=10))\n\n# Alternative: lower to linalg-on-tensors for IREE\nmodule_linalg = torch_mlir.compile(\n    model,\n    example_input,\n    output_type=torch_mlir.OutputType.LINALG_ON_TENSORS,\n)\n# This can be directly compiled by IREE:\n# iree-compile --iree-input-type=tm_tensor module.mlir -o model.vmfb"
        },
        {
          type: "heading",
          text: "MLIR Advantages for Custom Hardware"
        },
        {
          type: "text",
          text: "MLIR's modular design makes it the preferred choice for custom AI accelerator companies. Instead of building a compiler from scratch, they:"
        },
        {
          type: "list",
          items: [
            "Reuse existing frontends (torch-mlir, StableHLO) for model import.",
            "Reuse existing high-level optimizations (linalg fusion, tiling).",
            "Write a <strong>custom dialect</strong> modeling their hardware's capabilities (special instructions, memory hierarchy).",
            "Write <strong>lowering passes</strong> from standard dialects to their custom dialect.",
            "Write a <strong>codegen backend</strong> that emits their hardware's binary format.",
            "The result: a complete compiler stack with minimal bespoke code, and automatic benefit from upstream improvements."
          ]
        },
        {
          type: "heading",
          text: "IREE vs TVM: When to Use Which"
        },
        {
          type: "code",
          lang: "text",
          filename: "IREE vs TVM Decision Matrix",
          code: "Dimension           | IREE                          | TVM\n--------------------|-------------------------------|---------------------------\nDesign philosophy   | MLIR-native, progressive lower| Custom IR (Relay/TIR)\nAuto-tuning         | Limited (relies on codegen)   | Strong (MetaSchedule)\nPortability         | Vulkan/SPIR-V (very broad)    | LLVM, CUDA, OpenCL\nRuntime size         | Tiny (embedded-friendly)      | Larger\nDynamic shapes      | First-class support           | Improving (Relax)\nCustom hardware     | Write MLIR dialect            | Write TVM backend/BYOC\nMaturity            | Younger, rapidly evolving     | More mature ecosystem\nBest for            | Cross-platform deploy, custom | Auto-tuning, edge perf\n                    | accelerators, MLIR ecosystem  | broad HW support"
        }
      ]
    },

    // =====================================================================
    // LESSON 5 - Graph and Operator Optimizations Deep Dive
    // =====================================================================
    {
      id: "graph-operator-optimizations",
      title: "Graph and Operator Optimizations Deep Dive",
      readTime: "22 min",
      content: [
        {
          type: "heading",
          text: "Graph-Level Optimizations"
        },
        {
          type: "text",
          text: "Graph-level optimizations transform the computation graph without changing the meaning of individual operations. They operate on the <strong>structure</strong> of the computation. These passes run early in the pipeline and their impact cascades through all subsequent stages."
        },
        {
          type: "heading",
          text: "1. Operator Fusion (Deep Dive)"
        },
        {
          type: "text",
          text: "We covered fusion categories in Lesson 2. Now let's understand <strong>why</strong> fusion helps so dramatically. The key metric is <strong>memory traffic</strong>."
        },
        {
          type: "code",
          lang: "text",
          filename: "Memory Traffic Analysis: Fused vs Unfused",
          code: "Example: conv2d -> batch_norm -> relu (input: 1x64x56x56, output: 1x64x56x56)\n\nUNFUSED (3 separate kernels):\n  conv2d:     Read input (802KB) + weights (36KB) -> Write output (802KB)\n  batch_norm: Read output (802KB) + params (0.5KB) -> Write output (802KB)\n  relu:       Read output (802KB) -> Write output (802KB)\n  Total DRAM traffic: 802 + 36 + 802 + 802 + 0.5 + 802 + 802 + 802 = ~4.85 MB\n\nFUSED (1 kernel):\n  fused_conv_bn_relu: Read input (802KB) + weights (36KB) + bn_params (0.5KB)\n                      -> Write output (802KB)\n  Total DRAM traffic: 802 + 36 + 0.5 + 802 = ~1.64 MB\n\nMemory traffic reduction: 3x\nFor memory-bandwidth-bound operations (most element-wise ops), this directly\ntranslates to ~3x speedup.\n\nOn edge devices with limited bandwidth (e.g., 25 GB/s for a mobile SoC vs\n900 GB/s for A100), fusion impact is even more critical."
        },
        {
          type: "heading",
          text: "2. Layout Transformation"
        },
        {
          type: "text",
          text: "Data layout has a massive impact on performance. Different hardware prefers different memory layouts for tensors:"
        },
        {
          type: "code",
          lang: "text",
          filename: "Tensor Layout Preferences by Hardware",
          code: "Layout    | Description              | Preferred By\n----------|--------------------------|----------------------------\nNCHW      | Batch, Channel, H, W     | NVIDIA cuDNN (default)\nNHWC      | Batch, H, W, Channel     | TFLite, ARM, Apple ANE, TPU\nNCHW4c    | Channels blocked by 4    | TensorRT INT8, x86 SSE\nNCHW8c    | Channels blocked by 8    | x86 AVX2\nNCHW16c   | Channels blocked by 16   | x86 AVX-512\nNCHW32c   | Channels blocked by 32   | NVIDIA Tensor Cores (INT8)\n\nWhy layout matters:\n- NHWC: Adjacent channels in memory -> vectorize across channels\n- NCHW: Adjacent spatial pixels in memory -> vectorize across width\n- Blocked layouts (NCHWxc): Best of both - spatial locality + channel vectorization\n\nLayout mismatch penalty:\n- If model is NCHW but hardware wants NHWC, compiler inserts transpose\n- Transpose is pure memory traffic with no compute -> wasted bandwidth\n- Smart compilers propagate layout preferences backward through the graph\n  to minimize transpose count"
        },
        {
          type: "heading",
          text: "3. Constant Folding and Algebraic Simplification"
        },
        {
          type: "code",
          lang: "python",
          filename: "Constant Folding Examples",
          code: "# Before constant folding:\n# shape = get_shape(input)       # Known at compile time: [1, 3, 224, 224]\n# n = shape[0]                   # Constant: 1\n# c = shape[1] * 2               # Constant: 6\n# y = reshape(x, [n, c, -1])     # reshape(x, [1, 6, -1])\n\n# After constant folding:\n# y = reshape(x, [1, 6, 50176])  # All shape math evaluated at compile time\n\n# Algebraic simplifications:\n# x * 1.0       -> x              (identity multiply)\n# x + 0.0       -> x              (identity add)\n# x * 0.0       -> zeros_like(x)  (zero multiply)\n# relu(relu(x)) -> relu(x)        (idempotent)\n# transpose(transpose(x, [1,0]), [1,0]) -> x  (inverse)\n# concat([x], axis=0) -> x        (single-element concat)\n# pad(x, all_zeros)   -> x        (no-op pad)\n\n# Batch norm folding (critical for inference):\n# y = gamma * (x - mean) / sqrt(var + eps) + beta\n# Fold into: y = x * w_folded + b_folded\n# where w_folded = gamma / sqrt(var + eps)\n#       b_folded = beta - gamma * mean / sqrt(var + eps)\n# This eliminates 5 ops -> 1 multiply + 1 add (or fuse into conv weights)"
        },
        {
          type: "heading",
          text: "Operator-Level Optimizations"
        },
        {
          type: "text",
          text: "Once graph-level passes are done, each operator (or fused group) needs an efficient <strong>schedule</strong> &mdash; a mapping from the abstract computation to concrete hardware execution. This is where the compiler makes decisions about loop structure, parallelism, and memory access."
        },
        {
          type: "heading",
          text: "4. Loop Tiling"
        },
        {
          type: "code",
          lang: "text",
          filename: "Loop Tiling for Cache Efficiency",
          code: "Naive matrix multiply: C[M,N] = A[M,K] * B[K,N]\n\nfor i in range(M):         # Iterate over rows of A\n  for j in range(N):       # Iterate over cols of B\n    for k in range(K):     # Reduction over K\n      C[i,j] += A[i,k] * B[k,j]   # B access strides by N (cache-hostile!)\n\nTiled version (tile size T):\nfor ii in range(0, M, T):        # Tile rows\n  for jj in range(0, N, T):      # Tile cols\n    for kk in range(0, K, T):    # Tile reduction\n      for i in range(ii, ii+T):  # Inner tile\n        for j in range(jj, jj+T):\n          for k in range(kk, kk+T):\n            C[i,j] += A[i,k] * B[k,j]\n\nWhy tiling works:\n- Inner loop operates on T x T blocks that fit in L1/L2 cache\n- Data reuse: each element of A/B is used T times before eviction\n- Cache misses reduced from O(M*N*K/cache_line) to O(M*N*K/T/cache_line)\n\nOptimal tile size depends on:\n- L1 cache size (typically 32-64 KB)\n- L2 cache size (typically 256 KB - 1 MB)\n- Register file size\n- SIMD width (AVX2=256bit=8 floats, AVX512=16 floats)"
        },
        {
          type: "heading",
          text: "5. Vectorization"
        },
        {
          type: "code",
          lang: "text",
          filename: "SIMD Vectorization",
          code: "Scalar (1 element at a time):\n  for i in range(N):\n    C[i] = A[i] + B[i]     # 1 add per cycle\n\nVectorized (8 elements at a time with AVX-256):\n  for i in range(0, N, 8):\n    va = _mm256_load_ps(&A[i])    # Load 8 floats\n    vb = _mm256_load_ps(&B[i])    # Load 8 floats\n    vc = _mm256_add_ps(va, vb)    # 8 adds in 1 instruction\n    _mm256_store_ps(&C[i], vc)    # Store 8 floats\n\nSpeedup: theoretically 8x (practically 4-6x due to memory bandwidth)\n\nVectorization requirements:\n1. Loop must be innermost (or innermost after tiling)\n2. Memory accesses must be contiguous (stride-1)\n3. No data dependencies between loop iterations\n4. Trip count must be known (or use masked operations)\n\nCompiler vectorizes by:\n- Choosing the innermost loop dimension that gives stride-1 access\n- Applying loop strip-mining: split loop by vector width\n- Replacing scalar ops with SIMD intrinsics\n- For non-contiguous access: gather/scatter (much slower)"
        },
        {
          type: "heading",
          text: "6. Memory Access Optimization"
        },
        {
          type: "text",
          text: "On modern hardware, compute is cheap but memory access is expensive. The <strong>arithmetic intensity</strong> (FLOPs per byte of memory traffic) determines whether an operation is compute-bound or memory-bound."
        },
        {
          type: "code",
          lang: "text",
          filename: "Roofline Model Analysis",
          code: "Roofline Model: Performance = min(Peak_Compute, Bandwidth * Arithmetic_Intensity)\n\nOperation          | FLOPs    | Bytes    | Intensity | Bound\n-------------------|----------|----------|-----------|--------\nElement-wise add   | N        | 3*4*N    | 0.083     | Memory\nBatch norm         | ~5N      | ~4*4*N   | 0.31      | Memory\nDepthwise conv 3x3 | 9*N      | ~4*4*N   | 0.56      | Memory\nMatmul (large)     | 2*M*N*K  | 4*(M*K+K*N+M*N) | High | Compute\nConv2d (large)     | 2*C*K*H*W*R*S | ...  | High      | Compute\n\nImplication:\n- Memory-bound ops (element-wise, BN): Fusion is the optimization\n- Compute-bound ops (matmul, conv): Tiling + vectorization matter\n- Mixed: Get fusion right first, then optimize compute kernels\n\nEdge devices have LOW bandwidth (10-50 GB/s) vs datacenter (900+ GB/s)\n-> MORE operations are memory-bound on edge\n-> Fusion is even MORE critical on edge devices"
        },
        {
          type: "heading",
          text: "7. Putting It All Together: Optimization Pipeline Order"
        },
        {
          type: "code",
          lang: "text",
          filename: "Optimization Pass Ordering (Typical)",
          code: "1. Shape inference + type inference       (required for all subsequent passes)\n2. Constant folding + dead code elimination (reduce graph size early)\n3. Batch norm folding                      (fuse BN into conv/linear weights)\n4. Algebraic simplification                (simplify remaining math)\n5. Layout transformation                   (switch to hardware-preferred layout)\n6. Operator fusion                         (THE critical pass)\n7. Memory planning                         (allocate buffers, reuse memory)\n8. Per-operator scheduling                 (tiling, vectorization, parallel)\n9. Auto-tuning (if available)              (search for best schedule per op)\n10. Codegen                                (emit hardware-specific code)\n\nWhy this order matters:\n- BN folding before fusion: fewer ops to fuse\n- Layout before fusion: fused kernels use correct layout from the start\n- Fusion before scheduling: schedule fused groups, not individual ops\n- Memory planning after fusion: know actual buffer lifetimes"
        }
      ]
    },

    // =====================================================================
    // LESSON 6 - Auto-Tuning and Hardware Code Generation
    // =====================================================================
    {
      id: "auto-tuning-codegen",
      title: "Auto-Tuning and Hardware Code Generation",
      readTime: "24 min",
      content: [
        {
          type: "heading",
          text: "Why Auto-Tuning?"
        },
        {
          type: "text",
          text: "Hand-written optimization rules work well for common cases, but the combinatorial space of schedule choices (tile sizes, unroll factors, vectorization strategies, parallelism configurations) is enormous. For a single matmul, there can be <strong>millions</strong> of valid schedules. Auto-tuning searches this space to find the best one for a specific hardware target."
        },
        {
          type: "heading",
          text: "TVM AutoTVM (First Generation)"
        },
        {
          type: "text",
          text: "AutoTVM was TVM's first auto-tuning system. It uses <strong>template-based</strong> tuning: humans write schedule templates with tunable knobs, and the tuner searches for optimal knob values."
        },
        {
          type: "code",
          lang: "python",
          filename: "AutoTVM Template Example",
          code: "from tvm import autotvm\n\n# A schedule template for matmul with tunable parameters\n@autotvm.template(\"matmul\")\ndef matmul_template(N, L, M):\n    A = te.placeholder((N, L), name=\"A\")\n    B = te.placeholder((L, M), name=\"B\")\n    k = te.reduce_axis((0, L), name=\"k\")\n    C = te.compute((N, M), lambda i, j: te.sum(A[i, k] * B[k, j], axis=k))\n    s = te.create_schedule(C.op)\n\n    # Define tunable knobs\n    cfg = autotvm.get_config()\n    \n    # Tile sizes are tunable\n    cfg.define_split(\"tile_y\", N, num_outputs=2)  # Split rows\n    cfg.define_split(\"tile_x\", M, num_outputs=2)  # Split cols\n    cfg.define_split(\"tile_k\", L, num_outputs=2)  # Split reduction\n    \n    # Apply splits\n    yo, yi = cfg[\"tile_y\"].apply(s, C, C.op.axis[0])\n    xo, xi = cfg[\"tile_x\"].apply(s, C, C.op.axis[1])\n    ko, ki = cfg[\"tile_k\"].apply(s, C, k)\n    \n    s[C].reorder(yo, xo, ko, yi, ki, xi)\n    s[C].vectorize(xi)\n    s[C].parallel(yo)\n    \n    return s, [A, B, C]\n\n# Run the tuner\ntask = autotvm.task.create(\"matmul\", args=(1024, 1024, 1024), target=\"llvm\")\n\n# XGBoost cost model + simulated annealing search\nmeasure_option = autotvm.measure_option(\n    builder=autotvm.LocalBuilder(),\n    runner=autotvm.LocalRunner(repeat=3, min_repeat_ms=100),\n)\n\ntuner = autotvm.tuner.XGBTuner(task)\ntuner.tune(\n    n_trial=1000,\n    measure_option=measure_option,\n    callbacks=[autotvm.callback.log_to_file(\"matmul.log\")],\n)"
        },
        {
          type: "heading",
          text: "MetaSchedule (Next Generation Auto-Tuning)"
        },
        {
          type: "text",
          text: "MetaSchedule replaces AutoTVM with a <strong>template-free</strong> approach. Instead of humans writing schedule templates, MetaSchedule automatically generates the search space from the TIR representation. This eliminates the template engineering bottleneck."
        },
        {
          type: "code",
          lang: "python",
          filename: "MetaSchedule Tuning Pipeline",
          code: "import tvm\nfrom tvm import relay, meta_schedule as ms\n\n# Load model (Relay IR)\nmod, params = relay.frontend.from_pytorch(scripted_model, shape_list)\n\n# Define target\ntarget = tvm.target.Target(\"llvm -mcpu=skylake-avx512 -num-cores=4\")\n\n# Create tuning database\nwork_dir = \"./tune_results\"\n\n# Run MetaSchedule tuning\nwith ms.database.JSONDatabase(\n    path_workload=f\"{work_dir}/workload.json\",\n    path_tuning_record=f\"{work_dir}/records.json\",\n) as database:\n    with target:\n        extracted_tasks = ms.relay_integration.extract_tasks(mod, target, params)\n        print(f\"Found {len(extracted_tasks)} tasks to tune\")\n        \n        # Tune each task\n        for task in extracted_tasks:\n            print(f\"Tuning: {task.task_name}, {task.dispatched[0].script()}\")\n            \n            # MetaSchedule auto-generates the search space\n            # No template needed!\n            tune_context = ms.TuneContext(\n                mod=task.dispatched[0],\n                target=target,\n                space_generator=ms.space_generator.PostOrderApply(),\n                search_strategy=ms.search_strategy.EvolutionarySearch(),\n                task_name=task.task_name,\n                num_threads=\"physical\",\n            )\n            tune_context.generate_design_space()\n            tune_context.pre_tuning(max_trials=500)\n            \n            # Measure candidates on hardware\n            runner = ms.runner.LocalRunner()\n            # ... run tuning loop ...\n\n# After tuning: compile with best schedules\nwith ms.database.JSONDatabase(\n    path_workload=f\"{work_dir}/workload.json\",\n    path_tuning_record=f\"{work_dir}/records.json\",\n):\n    with tvm.transform.PassContext(opt_level=3):\n        lib = relay.build(mod, target=target, params=params)\n\nlib.export_library(\"model_tuned.so\")"
        },
        {
          type: "heading",
          text: "Search Space and Cost Models"
        },
        {
          type: "code",
          lang: "text",
          filename: "MetaSchedule Search Space Exploration",
          code: "Search Space for a single conv2d (3x3, 64->128, 56x56):\n\nSchedule decisions:\n1. Tile spatial dims (H, W): 7 * 7 = 49 options per dim\n2. Tile output channels: ~10 options\n3. Tile reduction (input channels * kernel): ~10 options\n4. Vectorization target: 1, 4, 8, 16\n5. Unroll factor: 1, 2, 4, 8, 16\n6. Parallel strategy: which loop to parallelize\n7. Cache stage: write to shared mem / register?\n\nTotal search space: ~10^6 to 10^9 configurations\n\nSearch strategies:\n- Random: Simple baseline. ~1000 trials for decent result.\n- XGBoost cost model: Predicts performance from schedule features.\n  Trained on measurements. Guides search toward promising regions.\n- Evolutionary search: Population of schedules. Mutate + crossover.\n  MetaSchedule default. Good exploration/exploitation balance.\n- Transfer learning: Reuse cost model from similar hardware.\n  80-90% fewer trials needed.\n\nCost model features (what the model learns):\n- Tile sizes relative to cache sizes\n- Vectorization width vs SIMD width\n- Memory access patterns (stride, reuse distance)\n- Thread count vs core count\n- Instruction mix (multiply-add ratio)"
        },
        {
          type: "heading",
          text: "Hardware Code Generation"
        },
        {
          type: "text",
          text: "After optimization and scheduling, the compiler must generate code for the target hardware. This is where abstract schedule decisions become concrete machine instructions."
        },
        {
          type: "heading",
          text: "LLVM-Based CPU Codegen"
        },
        {
          type: "code",
          lang: "text",
          filename: "CPU Code Generation Pipeline",
          code: "TIR (scheduled loops)\n    |\n    v\nLLVM IR Generation\n    - Map TIR ops to LLVM instructions\n    - Insert vectorization intrinsics (AVX2/AVX-512/NEON)\n    - Apply memory alignment annotations\n    |\n    v\nLLVM Optimization Passes\n    - Instruction selection\n    - Register allocation\n    - Instruction scheduling\n    - Auto-vectorization (LLVM's own, complementing compiler's)\n    |\n    v\nMachine Code (.o / .so)\n    - x86-64, AArch64, RISC-V, etc.\n    - Linked with runtime library\n\nTarget-specific considerations:\n- x86 AVX-512: 16 float32 per vector, 32 ZMM registers\n  Best tile size: multiples of 16\n- ARM NEON: 4 float32 per vector, 32 registers\n  Best tile size: multiples of 4\n- RISC-V V: Variable-length vectors (VL)\n  Tile to maximum VL, hardware handles remainder"
        },
        {
          type: "heading",
          text: "GPU Kernel Generation"
        },
        {
          type: "code",
          lang: "text",
          filename: "GPU Code Generation Pipeline",
          code: "TIR (scheduled loops with GPU bindings)\n    |\n    v\nThread Hierarchy Mapping:\n    - Outer loops -> CUDA blocks (gridDim)\n    - Inner loops -> CUDA threads (blockDim)\n    - Reduction loops -> shared memory reduction\n    |\n    v\nShared Memory Allocation:\n    - Cache frequently accessed data in shared memory (48KB-228KB)\n    - Bank conflict avoidance (pad shared memory rows)\n    |\n    v\nCode Emission:\n    - CUDA: Generate .cu -> nvcc -> PTX -> cubin\n    - Vulkan: Generate SPIR-V binary\n    - OpenCL: Generate .cl kernel source\n    - Metal: Generate .metallib\n    |\n    v\nKernel Binary (loaded by runtime)\n\nGPU-specific optimizations:\n- Memory coalescing: Adjacent threads access adjacent addresses\n- Occupancy tuning: Balance threads/block vs registers/shared mem\n- Warp-level primitives: __shfl, cooperative groups\n- Tensor Core mapping: wmma instructions for matmul (requires specific shapes)"
        },
        {
          type: "heading",
          text: "AOT Compilation for Bare-Metal Targets"
        },
        {
          type: "text",
          text: "<strong>Ahead-of-Time (AOT)</strong> compilation produces a self-contained binary that runs without a runtime interpreter. This is essential for microcontrollers and bare-metal targets where you cannot run a VM or dynamic library loader."
        },
        {
          type: "code",
          lang: "python",
          filename: "TVM AOT Compilation (microTVM)",
          code: "import tvm\nfrom tvm import relay\n\n# Compile for bare-metal ARM Cortex-M\ntarget = tvm.target.Target(\"c -mcpu=cortex-m4\")\nruntime = tvm.relay.backend.Runtime(\"crt\")  # C runtime (no OS)\nexecutor = tvm.relay.backend.Executor(\n    \"aot\",\n    {\"unpacked-api\": True, \"interface-api\": \"c\"}\n)\n\nwith tvm.transform.PassContext(opt_level=3):\n    module = relay.build(\n        mod,\n        target=target,\n        runtime=runtime,\n        executor=executor,\n        params=params,\n    )\n\n# This produces:\n# - model.c: Generated C code with the inference function\n# - model.h: Header file with the API\n# - model_params.bin: Quantized weights (stored in flash)\n# - model_graph.json: Execution plan\n#\n# The generated C code:\n# - Statically allocates all memory (no malloc)\n# - Inline function calls (no virtual dispatch)\n# - Direct array indexing (no tensor abstraction overhead)\n# - Fits in ~100KB flash + ~50KB RAM for small models\n\n# Export for integration with embedded project\nmodule.export_library(\"model_aot.tar\")\n\n# In your embedded C code:\n# #include \"model.h\"\n# TVMExecute(input_data, output_data);  // Single function call"
        },
        {
          type: "heading",
          text: "Full-Stack Profiling Methodology"
        },
        {
          type: "code",
          lang: "text",
          filename: "Systematic Bottleneck Identification",
          code: "Step 1: Model-Level Profiling\n  Tool: tvm.runtime.profiling, torch.profiler, nsight systems\n  What: End-to-end latency, per-operator breakdown\n  Find: Which operators dominate total time?\n\nStep 2: Compiler-Level Analysis\n  Tool: Inspect compiler IR (Relay, TIR, HLO), fusion log\n  What: Did fusion happen as expected? Any unexpected boundaries?\n  Find: Missed fusion opportunities, unnecessary transposes\n\nStep 3: Schedule-Level Analysis\n  Tool: TIR schedule dump, MetaSchedule trace\n  What: Are tile sizes appropriate? Vectorization applied?\n  Find: Suboptimal tiling, missed vectorization, wrong parallelism\n\nStep 4: Hardware-Level Profiling\n  Tool: perf, vtune, nsight compute, ARM Streamline\n  What: Cache miss rate, SIMD utilization, branch misprediction\n  Find: Cache thrashing (wrong tile size), low SIMD efficiency\n\nStep 5: Runtime-Level Analysis\n  Tool: timeline trace, memory allocator profiling\n  What: Kernel launch overhead, memory alloc/free patterns\n  Find: Excessive small allocations, serialized kernel launches\n\nCommon bottleneck resolution:\n- Missed fusion -> Add custom fusion rule or restructure model\n- Bad layout -> Force correct layout early in pipeline\n- Cache misses -> Adjust tile sizes to fit L1/L2\n- Low SIMD util -> Change innermost loop dimension, ensure alignment\n- Launch overhead -> Fuse more ops, use CUDA graphs"
        },
        {
          type: "heading",
          text: "Comparing Compiler Stacks: Decision Framework"
        },
        {
          type: "code",
          lang: "text",
          filename: "When to Use Which Compiler",
          code: "Decision tree:\n\n1. Target is NVIDIA GPU only?\n   -> TensorRT (best single-GPU perf, INT8 calibration built-in)\n   -> Or XLA if using JAX (JIT, good fusion, TPU support too)\n\n2. Target is Intel CPU/GPU/VPU?\n   -> OpenVINO (optimized for Intel, INT8 VNNI support)\n\n3. Target is Apple devices?\n   -> CoreML (ANE, GPU, CPU — Apple's runtime is unbeatable here)\n\n4. Target is Qualcomm mobile?\n   -> QNN (Hexagon DSP, Adreno GPU — Qualcomm's stack)\n\n5. Target is multiple platforms / custom hardware?\n   -> TVM (broadest target support, strong auto-tuning)\n   -> IREE (MLIR-native, good for custom accelerators)\n\n6. Target is bare-metal MCU?\n   -> microTVM (AOT compilation, no OS needed)\n   -> IREE VMVX (portable fallback)\n\n7. Training + inference in same framework?\n   -> XLA/JAX (best compile-train loop)\n   -> torch.compile / Inductor (PyTorch native)\n\nHybrid approach (common in production):\n  Use TVM/IREE for graph optimization + fusion\n  Offload specific ops to vendor libraries (cuDNN, ACL, DNNL)\n  via BYOC / custom runtime calls"
        }
      ]
    }
  ];
})();
