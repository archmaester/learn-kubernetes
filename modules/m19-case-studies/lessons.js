// Patches the Case Studies module (m19) with full tutorial lesson content.
// Loaded after curriculum.js. m19 = CURRICULUM.phases[5].modules[3]
(function patchCaseStudiesLessons() {
  const m = CURRICULUM.phases[5].modules[3]; // phase-6 (index 5), fourth module (m19)

  m.lessons = [

    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 1 — Object Detection Fundamentals
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "object-detection-fundamentals",
      title: "Object Detection Fundamentals",
      readTime: "22 min",
      content: [
        {
          type: "text",
          text: "Object detection is the task of simultaneously localizing and classifying every object of interest in an image. Unlike classification (one label per image) or semantic segmentation (per-pixel labels), detection outputs a variable-length list of (bounding-box, class, confidence) tuples. This seemingly simple difference makes detection architecturally more complex: the network must handle spatial reasoning, scale variation, and the combinatorial explosion of possible box locations — all while running fast enough for real-time applications."
        },
        {
          type: "callout",
          variant: "info",
          title: "Why Detection Is Hard",
          text: "A 640x640 image has ~409,000 pixels. If you consider all possible bounding boxes (every combination of top-left and bottom-right corners), there are ~10^10 candidates. Detection architectures are fundamentally strategies for efficiently pruning this search space to a manageable set of high-quality proposals."
        },

        // ── Section 1: Two-Stage vs One-Stage ──
        {
          type: "heading",
          text: "Two-Stage vs One-Stage Detectors"
        },
        {
          type: "text",
          text: "The field split early into two paradigms:\n\n**Two-stage detectors (R-CNN family):** First generate class-agnostic region proposals (~2000 candidate boxes), then classify and refine each proposal. Faster R-CNN introduced the Region Proposal Network (RPN) that shares convolutional features with the classifier, reducing proposal generation from seconds (Selective Search) to ~10ms. The second stage applies RoI Pooling (or RoI Align for sub-pixel accuracy) to extract fixed-size features for each proposal, then runs per-proposal classification + bounding box regression. Cascade R-CNN chains multiple stages with increasing IoU thresholds (0.5 → 0.6 → 0.7) for progressively refined boxes.\n\n**One-stage detectors (YOLO, SSD, RetinaNet):** Skip the proposal stage entirely. Divide the image into a grid (or use anchor boxes at multiple scales) and directly predict class probabilities and box offsets at each position. SSD (2016) used multi-scale feature maps from VGG-16. RetinaNet (2017) introduced Focal Loss to solve the extreme foreground/background imbalance inherent in dense prediction — without it, the overwhelming number of easy negatives drowns out the training signal from rare positives."
        },
        {
          type: "comparison",
          headers: ["Two-Stage (Faster R-CNN, Cascade R-CNN)", "One-Stage (YOLO, SSD, RetinaNet)"],
          rows: [
            ["Higher mAP on COCO (~44-49 mAP)", "Competitive mAP (~40-52 mAP with modern designs)"],
            ["Slower inference (50-150ms on GPU)", "Faster inference (5-30ms on GPU)"],
            ["Better on small objects (explicit RoI features)", "May miss small objects without FPN"],
            ["More memory (per-proposal computation)", "Single forward pass, constant memory"],
            ["Preferred for accuracy-critical offline tasks", "Preferred for real-time and edge deployment"],
          ]
        },
        {
          type: "text",
          text: "The practical significance: for edge deployment, two-stage detectors are essentially off the table. Even Faster R-CNN Lite with a MobileNet backbone runs at ~8 FPS on a Jetson Nano — below the 15+ FPS threshold for useful real-time detection. One-stage detectors optimized for edge (YOLOv8-nano, SSD-MobileNet, NanoDet) achieve 30-60+ FPS on the same hardware."
        },

        // ── Section 2: Anchor-Based vs Anchor-Free ──
        {
          type: "heading",
          text: "Anchor-Based vs Anchor-Free Detection"
        },
        {
          type: "text",
          text: "**Anchor-based detectors** predefine a set of reference boxes (anchors) at each spatial position. Each anchor has a fixed aspect ratio and scale. The network predicts offsets (dx, dy, dw, dh) relative to these anchors, plus objectness and class scores. SSD uses 4-6 anchors per location across 6 feature map scales. YOLOv5 uses 3 anchors per scale across 3 scales (P3/P4/P5), with anchors determined by k-means clustering on the training set's ground truth boxes.\n\nThe anchor design is a critical hyperparameter. If your dataset has unusual aspect ratios (e.g., long thin pipes in industrial inspection), default anchors will produce poor recall. You must run anchor analysis on your specific dataset."
        },
        {
          type: "text",
          text: "**Anchor-free detectors** eliminate anchors entirely. Two main approaches exist:\n\n**Center-based (CenterNet, FCOS):** Predict a heatmap of object centers, then regress box dimensions from each center point. FCOS (Fully Convolutional One-Stage) predicts the distances from each foreground pixel to the four sides of its bounding box, plus a centerness score to suppress low-quality predictions from pixels far from the object center.\n\n**Keypoint-based (CornerNet, ExtremeNet):** Detect object corners or extreme points (top-most, bottom-most, left-most, right-most) and group them into objects. Less common in practice but elegant theoretically.\n\nYOLOv8 and beyond are anchor-free, using a TADDP (Task-Aligned Dynamic Detection head with Positive) assignment strategy instead of IoU-based anchor matching. This simplifies the pipeline and removes the need for anchor hyperparameter tuning."
        },

        // ── Section 3: NMS and Alternatives ──
        {
          type: "heading",
          text: "Non-Maximum Suppression (NMS) and Its Alternatives"
        },
        {
          type: "text",
          text: "Every detector produces many overlapping predictions for the same object. NMS is the post-processing step that eliminates duplicates:\n\n1. Sort all detections by confidence score\n2. Take the highest-confidence detection, add it to the final output\n3. Remove all remaining detections that have IoU > threshold (typically 0.45-0.65) with the selected detection\n4. Repeat from step 2 until no detections remain\n\nNMS runs per-class — a person detection and a car detection can overlap without suppressing each other."
        },
        {
          type: "text",
          text: "**NMS failure modes and alternatives:**\n\n**Problem: Crowded scenes.** When objects of the same class overlap significantly (pedestrians in a crowd), NMS suppresses valid detections. **Solution: Soft-NMS** decays scores of overlapping detections instead of hard-removing them: score *= exp(-IoU^2 / sigma). This preserves partially occluded objects.\n\n**Problem: Orientation-dependent IoU.** Standard IoU is axis-aligned. Rotated objects (aerial images, text) have poor IoU estimates. **Solution: Rotated NMS** computes IoU on oriented bounding boxes.\n\n**Problem: NMS is not differentiable.** It cannot be trained end-to-end. **Solution: DETR (Detection Transformer)** eliminates NMS entirely by using a set prediction approach with Hungarian matching. Each of N learned object queries attends to the image and directly predicts one object, with a bipartite matching loss ensuring one-to-one assignment. However, DETR is too slow for edge deployment (the transformer decoder is expensive).\n\n**DIoU-NMS** replaces IoU with Distance-IoU, considering both overlap and center distance. This better handles cases where boxes overlap moderately but represent different objects (e.g., a parent holding a child)."
        },

        // ── Section 4: Evaluation Metrics ──
        {
          type: "heading",
          text: "Detection Evaluation: mAP, IoU Thresholds, and COCO Metrics"
        },
        {
          type: "text",
          text: "Detection evaluation is more complex than classification because you must match predictions to ground truth boxes:\n\n**IoU (Intersection over Union):** Area of overlap / Area of union between predicted and ground truth boxes. A prediction is a True Positive if IoU >= threshold with a ground truth box, and each ground truth box can only be matched once.\n\n**Precision-Recall Curve:** At each confidence threshold, compute precision (TP / (TP+FP)) and recall (TP / (TP+FN)). The PR curve plots these across all thresholds.\n\n**AP (Average Precision):** Area under the PR curve for a single class. COCO uses 101-point interpolation.\n\n**mAP:** Mean AP across all classes."
        },
        {
          type: "text",
          text: "**COCO metric variants:**\n\n- **mAP@50 (PASCAL VOC style):** IoU threshold = 0.5. Lenient — a 51% overlap counts as correct. Good for applications where rough localization suffices.\n- **mAP@75:** Stricter — requires 75% overlap. Tests precise localization.\n- **mAP@[50:95] (COCO primary metric):** Average mAP across 10 IoU thresholds from 0.50 to 0.95 in steps of 0.05. This is the hardest metric and the standard for comparing detectors.\n- **mAP-small/medium/large:** COCO splits objects by pixel area: small (<32x32), medium (32x32 to 96x96), large (>96x96). Most detectors struggle on small objects.\n\nFor edge deployment, also track **FPS** and **mAP/FLOP** (efficiency). A model with 2 mAP points less but 3x the FPS is often the better choice."
        },
        {
          type: "code",
          lang: "python",
          code: `# Computing mAP with torchmetrics (PyTorch)
from torchmetrics.detection import MeanAveragePrecision

metric = MeanAveragePrecision(iou_type="bbox")

# predictions: list of dicts with 'boxes', 'scores', 'labels'
preds = [
    {
        "boxes": torch.tensor([[100, 50, 300, 250], [200, 100, 400, 350]]),
        "scores": torch.tensor([0.95, 0.87]),
        "labels": torch.tensor([0, 1]),
    }
]

# targets: list of dicts with 'boxes' and 'labels'
targets = [
    {
        "boxes": torch.tensor([[105, 55, 295, 245], [210, 105, 395, 345]]),
        "labels": torch.tensor([0, 1]),
    }
]

metric.update(preds, targets)
result = metric.compute()
print(f"mAP@[50:95]: {result['map']:.4f}")
print(f"mAP@50:      {result['map_50']:.4f}")
print(f"mAP@75:      {result['map_75']:.4f}")
print(f"mAP-small:   {result['map_small']:.4f}")
print(f"mAP-medium:  {result['map_medium']:.4f}")
print(f"mAP-large:   {result['map_large']:.4f}")`
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 2 — YOLO Family Deep Dive
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "yolo-family-deep-dive",
      title: "YOLO Family Deep Dive: YOLOv5 to YOLOv11",
      readTime: "25 min",
      content: [
        {
          type: "text",
          text: "YOLO (You Only Look Once) is the dominant detection family for real-time applications. Since the original 2016 paper, the architecture has been reimagined multiple times by different groups. Understanding the evolution is not academic — each version introduced architectural ideas that are directly relevant to choosing and configuring a detector for your edge deployment."
        },

        // ── Section 1: Architecture Evolution ──
        {
          type: "heading",
          text: "Architecture Evolution: v5 → v8 → v11"
        },
        {
          type: "text",
          text: "**YOLOv5 (Ultralytics, 2020):** Not a paper but an engineering tour de force. Key innovations:\n- CSPDarknet53 backbone: Cross-Stage Partial connections reduce computation by 20% while maintaining gradient flow\n- PANet neck: bottom-up + top-down feature pyramid for multi-scale detection\n- Anchor-based heads: 3 detection scales (P3/P4/P5) with 3 anchors each, auto-computed via k-means\n- Mosaic augmentation: stitch 4 training images together, forcing the model to handle objects at unusual positions and scales\n- Model scaling: nano/small/medium/large/xlarge variants by adjusting depth and width multipliers\n\nYOLOv5n (nano): 1.9M params, 4.5 GFLOPs, 28.0 mAP@50:95 on COCO\nYOLOv5s: 7.2M params, 16.5 GFLOPs, 37.4 mAP"
        },
        {
          type: "text",
          text: "**YOLOv8 (Ultralytics, 2023):** A clean-room redesign, not incremental.\n- **Anchor-free** detection: predicts object center + width/height directly, eliminating anchor hyperparameters\n- C2f (Cross-Stage Partial with 2 convolutions + flexible Bottleneck count): replaces C3 modules. More gradient paths, better feature reuse\n- **Decoupled heads:** separate classification and regression branches (like YOLOX). Classification uses sigmoid per-class; regression uses DFL (Distribution Focal Loss) that predicts a discrete distribution over possible box coordinates instead of a single regression target\n- **Task-Aligned Assigner (TAL):** replaces IoU-based anchor matching with a combined metric of classification score and IoU, ensuring the assignment aligns with what the model actually predicts well\n- Unified API for detection, segmentation, classification, pose estimation, and OBB (oriented bounding boxes)\n\nYOLOv8n: 3.2M params, 8.7 GFLOPs, 37.3 mAP — massive leap over v5n"
        },
        {
          type: "text",
          text: "**YOLOv11 (Ultralytics, 2024):** The latest iteration focuses on efficiency.\n- C3k2 block: a variant of CSP Bottleneck using two smaller 3x3 convolutions instead of one larger kernel, reducing parameters while maintaining receptive field\n- SPPF → SPPF with C2PSA (Cross-Stage Partial Spatial Attention): adds channel and spatial attention to the spatial pyramid pooling, improving detection of objects at varied scales\n- Improved anchor-free decoupled heads with refined DFL\n\nYOLOv11n: 2.6M params, 6.5 GFLOPs, 39.5 mAP — the best nano-class detector available\nYOLOv11s: 9.4M params, 21.5 GFLOPs, 47.0 mAP"
        },
        {
          type: "diagram",
          title: "YOLOv8 Architecture Overview",
          code: "Input (640x640x3)\n    │\n    ▼\n┌─────────────────┐\n│    Backbone      │ CSPDarknet with C2f blocks\n│  (Feature        │ Stem → Conv → C2f → Conv → C2f → Conv → C2f → Conv → C2f → SPPF\n│   Extraction)    │ Outputs: P3(80x80), P4(40x40), P5(20x20)\n└────────┬────────┘\n         │\n         ▼\n┌─────────────────┐\n│      Neck        │ PANet (bidirectional FPN)\n│  (Feature        │ Top-down: P5 → upsample + concat P4 → C2f → upsample + concat P3 → C2f\n│   Fusion)        │ Bottom-up: P3 → downsample + concat P4 → C2f → downsample + concat P5 → C2f\n└────────┬────────┘\n         │\n         ▼\n┌─────────────────┐\n│   Detect Head    │ Anchor-free, Decoupled\n│  (Per-scale)     │ Classification branch: Conv → Conv → Sigmoid (80 classes)\n│                  │ Regression branch: Conv → Conv → DFL (4 × 16 distribution bins)\n└─────────────────┘"
        },

        // ── Section 2: Loss Functions ──
        {
          type: "heading",
          text: "YOLO Loss Functions in Depth"
        },
        {
          type: "text",
          text: "YOLOv8's loss is a weighted sum of three components:\n\n**1. Box Loss (CIoU Loss):** Complete IoU loss considers overlap, center distance, and aspect ratio. CIoU = 1 - IoU + (distance between centers)^2 / (diagonal of enclosing box)^2 + alpha * v, where v measures aspect ratio consistency. This converges faster and produces tighter boxes than L1/L2 regression.\n\n**2. Classification Loss (BCE with logits):** Binary cross-entropy per class allows multi-label classification (an object can be both 'person' and 'pedestrian' in datasets with hierarchy). No softmax — each class is independent.\n\n**3. DFL (Distribution Focal Loss):** Instead of regressing a single value for each box coordinate, the model outputs a probability distribution over discretized coordinate values. For each of the 4 coordinates (left, top, right, bottom relative to anchor point), the model predicts logits over 16 bins. The final coordinate is the expected value of this distribution. This captures uncertainty — a partially occluded object might have a sharp distribution for visible edges and a broad distribution for occluded edges."
        },
        {
          type: "text",
          text: "**Focal Loss (used in training assigners):** FL(pt) = -alpha_t * (1 - pt)^gamma * log(pt). The (1-pt)^gamma term down-weights easy examples. With gamma=2, a sample classified with 0.9 confidence gets 100x less weight than one classified with 0.5. This is critical because in dense detection, ~99.9% of candidate positions are background.\n\n**Loss weighting in YOLOv8:**\n- box_loss weight: 7.5\n- cls_loss weight: 0.5\n- dfl_loss weight: 1.5\n\nThe high box weight reflects that localization accuracy is paramount. These defaults work well but may need tuning for specific domains — for example, increasing cls_loss weight when distinguishing visually similar classes (dog breeds, car models)."
        },

        // ── Section 3: Training Strategies ──
        {
          type: "heading",
          text: "Training Strategies for Production YOLO"
        },
        {
          type: "text",
          text: "**Data augmentation pipeline (YOLOv8 defaults):**\n- Mosaic augmentation (4 images stitched): ON for first 90% of training, OFF for last 10% (close_mosaic=10)\n- MixUp (alpha=0.0 by default for small models, 0.15 for large): blends two images with random alpha\n- Random affine: rotation ±0°, scale ±50%, shear ±0°, translate ±10%\n- HSV augmentation: hue ±1.5%, saturation ±70%, value ±40%\n- Random horizontal flip: 50% probability\n- Copy-paste augmentation (for instance segmentation models)\n\nCritical insight: Mosaic augmentation dramatically improves small object detection because it forces objects to appear at non-standard positions and smaller scales. But it can hurt if your deployment scenario has objects only at specific scales/positions (e.g., fixed overhead camera). In that case, reduce mosaic probability or use a custom augmentation pipeline that matches your deployment distribution."
        },
        {
          type: "text",
          text: "**Transfer learning recipe for custom datasets:**\n\n1. **Start from COCO pretrained weights** — always. Even for domains like medical imaging or satellite imagery, the low-level features (edges, textures, shapes) transfer.\n2. **Freeze backbone for 5-10 epochs** if dataset is small (<1000 images). This prevents the backbone from overfitting while the head adapts.\n3. **Unfreeze and train end-to-end** with lower learning rate (lr0=0.001 instead of 0.01).\n4. **Image size matters**: train at your deployment resolution. If deploying at 320x320, training at 640 wastes compute and introduces a domain gap.\n5. **Batch size**: as large as GPU memory allows. YOLOv8n can do batch=64 on a 12GB GPU at 640x640.\n6. **Epochs**: 100-300 for small datasets, 50-100 for large (>10K images). Use patience=50 early stopping."
        },
        {
          type: "code",
          lang: "python",
          code: `# Complete YOLOv8 training pipeline
from ultralytics import YOLO

# Load pretrained model
model = YOLO("yolov8n.pt")  # nano for edge, 's' for more accuracy

# Train on custom dataset
results = model.train(
    data="ppe_dataset.yaml",       # dataset config (YOLO format)
    epochs=150,
    imgsz=640,                     # match your deployment resolution
    batch=32,
    device=0,                      # GPU index

    # Optimizer
    optimizer="AdamW",
    lr0=0.001,                     # initial LR (lower for fine-tuning)
    lrf=0.01,                      # final LR = lr0 * lrf
    warmup_epochs=3,

    # Augmentation
    mosaic=1.0,                    # mosaic probability
    close_mosaic=10,               # disable mosaic for last 10 epochs
    mixup=0.0,                     # disable mixup for nano (too aggressive)
    hsv_h=0.015,
    hsv_s=0.7,
    hsv_v=0.4,

    # Training
    patience=50,                   # early stopping patience
    save_period=10,                # save checkpoint every 10 epochs
    val=True,                      # validate during training

    # Multi-scale training (optional, helps generalization)
    # rect=False,                  # rectangular training (faster but less aug)
)

# Validate
metrics = model.val()
print(f"mAP@50:    {metrics.box.map50:.4f}")
print(f"mAP@50:95: {metrics.box.map:.4f}")

# Export to ONNX for edge deployment
model.export(format="onnx", imgsz=640, simplify=True, opset=13)`
        },

        // ── Section 4: Edge-Optimized Detection Models ──
        {
          type: "heading",
          text: "Edge-Optimized Detection Models"
        },
        {
          type: "text",
          text: "For edge deployment, model selection follows a strict hierarchy based on available compute:\n\n**>15 TOPS (Jetson Orin, high-end phone NPU):**\n- YOLOv8s/v11s at INT8: ~47 mAP, 80+ FPS on Orin Nano\n- Can run YOLOv8m if FPS target is 20-30\n\n**4-15 TOPS (Coral Edge TPU, Raspberry Pi 5 + Hailo-8):**\n- YOLOv8n/v11n at INT8: ~37-39 mAP, 30-60 FPS\n- EfficientDet-Lite0: 33 mAP, smaller memory footprint\n- SSD-MobileNetV2: 22 mAP but extremely fast (100+ FPS on Edge TPU)\n\n**<4 TOPS (Raspberry Pi 4, older phones):**\n- NanoDet-Plus (ShuffleNetV2 backbone): 30.4 mAP, 1.17M params, <1 GFLOPs\n- PicoDet-S (PaddlePaddle): 32.5 mAP, 1.18M params\n- YOLO-Fastest: 23.3 mAP but runs at 220+ FPS on ARM\n\n**Microcontrollers (<1 TOPS, <2MB RAM):**\n- MCUNet / TinyissimoYOLO: basic detection with ~5-10 mAP, for presence detection only"
        },
        {
          type: "callout",
          variant: "warning",
          title: "The mAP/FPS Trade-off is Non-Linear",
          text: "Going from 30 mAP to 37 mAP costs ~2x compute. Going from 37 to 44 mAP costs another ~3x. Going from 44 to 50 mAP costs yet another ~3x. For edge deployment, carefully define what 'good enough' means for your application. A PPE detector that catches 95% of violations at 30 FPS is more valuable than one that catches 98% at 5 FPS, because the 5 FPS version misses fast-moving workers entirely."
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 3 — Image Classification on Edge
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "image-classification-edge",
      title: "Image Classification on Edge: Efficient Architectures",
      readTime: "18 min",
      content: [
        {
          type: "text",
          text: "Image classification — assigning a single label (or multiple labels) to an image — is the most mature and best-optimized task in edge AI. The architectural innovations driven by the classification task (depthwise separable convolutions, squeeze-and-excitation blocks, neural architecture search) propagate into every other vision task. Understanding these building blocks is essential even if your end task is detection or segmentation."
        },

        // ── Section 1: Efficient Building Blocks ──
        {
          type: "heading",
          text: "Efficient Building Blocks: Depthwise Separable Convolutions"
        },
        {
          type: "text",
          text: "A standard 3x3 convolution on C_in channels producing C_out channels requires C_in * C_out * 3 * 3 * H * W multiply-accumulate operations. A depthwise separable convolution factors this into two steps:\n\n1. **Depthwise convolution:** Apply a single 3x3 filter to each input channel independently. Cost: C_in * 3 * 3 * H * W\n2. **Pointwise convolution:** Apply a 1x1 convolution to combine channels. Cost: C_in * C_out * H * W\n\nTotal cost ratio: (1/C_out + 1/9) ≈ 1/9 of a standard convolution for typical C_out (e.g., 128+). This 8-9x reduction in computation is the foundation of every efficient mobile architecture."
        },
        {
          type: "text",
          text: "**Inverted residual block (MobileNetV2):** The standard residual block expands channels → 3x3 conv → reduce channels. The inverted residual does the opposite: expand channels (1x1 pointwise, 6x expansion), 3x3 depthwise conv on the expanded channels, project back to narrow channels (1x1 pointwise). The skip connection goes between the narrow representations. This is more efficient because the expensive 3x3 conv operates on a single channel in depthwise mode, and the narrow bottleneck reduces memory for skip connections.\n\n**Squeeze-and-Excitation (SE):** A lightweight attention mechanism. Global average pool → FC → ReLU → FC → Sigmoid → channel-wise multiply. Adds ~1-2% accuracy for ~5% extra compute. Used in EfficientNet, MobileNetV3.\n\n**Hard-swish activation (MobileNetV3):** x * ReLU6(x+3)/6. Approximates swish (x * sigmoid(x)) without expensive sigmoid computation. Critical for microcontrollers and DSPs that lack efficient sigmoid hardware."
        },

        // ── Section 2: MobileNet, EfficientNet, ShuffleNet ──
        {
          type: "heading",
          text: "Edge Classification Architectures"
        },
        {
          type: "text",
          text: "**MobileNetV3 (Google, 2019):** Architecture designed by NAS (NetAdapt + MnasNet), hand-tuned for efficiency. Two variants:\n- MobileNetV3-Large: 5.4M params, 219M MAdd, 75.2% ImageNet top-1\n- MobileNetV3-Small: 2.5M params, 56M MAdd, 67.4% ImageNet top-1\n\nKey features: inverted residuals with SE blocks, h-swish activation in later layers only (early layers use ReLU for hardware efficiency), NAS-optimized channel counts per layer.\n\n**EfficientNet-Lite (Google, 2020):** EfficientNet adapted for edge by removing squeeze-and-excitation blocks (poorly supported on many edge accelerators) and using ReLU6 instead of swish. Compound scaling (balances depth, width, and resolution together).\n- EfficientNet-Lite0: 4.7M params, 75.1% top-1\n- EfficientNet-Lite4: 13M params, 80.2% top-1\n\n**ShuffleNetV2 (Megvii, 2018):** Designed around 4 practical guidelines for efficient inference: (1) equal channel width minimizes memory access cost, (2) excessive group convolution increases memory access, (3) network fragmentation reduces parallelism, (4) element-wise operations are non-negligible. Uses channel split + shuffle instead of group convolutions.\n- ShuffleNetV2 1.0x: 2.3M params, 149M FLOPs, 69.4% top-1"
        },
        {
          type: "comparison",
          headers: ["Architecture", "Params", "FLOPs", "Top-1 Acc", "Best For"],
          rows: [
            ["MobileNetV3-Small", "2.5M", "56M", "67.4%", "Ultra-low latency, MCU-capable"],
            ["ShuffleNetV2 1.0x", "2.3M", "149M", "69.4%", "CPU inference (optimized memory access)"],
            ["MobileNetV3-Large", "5.4M", "219M", "75.2%", "Mobile phones, balanced accuracy/speed"],
            ["EfficientNet-Lite0", "4.7M", "390M", "75.1%", "Edge TPU / NPU (no SE blocks)"],
            ["EfficientNet-Lite2", "6.1M", "890M", "77.6%", "Higher accuracy with NPU support"],
          ]
        },

        // ── Section 3: Practical Classification on Edge ──
        {
          type: "heading",
          text: "Practical Edge Classification Pipeline"
        },
        {
          type: "text",
          text: "**Resolution is your biggest lever.** ImageNet benchmarks use 224x224, but for edge deployment you should test at 128x128 and 160x160. Many classification tasks (is this a stop sign? is this produce fresh?) work fine at lower resolution. Halving resolution gives a ~4x speedup (computation scales quadratically with resolution).\n\n**Knowledge distillation** is almost always worth doing for edge classifiers. Train a large teacher (EfficientNet-B4 at 380x380) and distill to a small student (MobileNetV3-Small at 160x160). Typical gain: 2-4% accuracy for free at inference time.\n\n**When not to use a neural network for classification:** If your classes are simple and visually distinct (red/green/blue light, presence/absence of a barcode, clean vs dirty surface), a classical approach (color histogram + SVM, template matching) runs at sub-millisecond latency and uses zero accelerator resources. Reserve neural network compute for tasks that need it."
        },
        {
          type: "code",
          lang: "python",
          code: `# Edge classification: export MobileNetV3-Small to TFLite INT8
import torch
import torch.nn as nn
from torchvision.models import mobilenet_v3_small, MobileNet_V3_Small_Weights

# Fine-tuned model (replace classifier head for your num_classes)
model = mobilenet_v3_small(weights=MobileNet_V3_Small_Weights.DEFAULT)
model.classifier[-1] = nn.Linear(1024, 5)  # 5 classes
model.load_state_dict(torch.load("best_model.pth", map_location="cpu"))
model.eval()

# Export to ONNX
dummy = torch.randn(1, 3, 160, 160)  # deploy resolution
torch.onnx.export(
    model, dummy, "classifier.onnx",
    input_names=["image"], output_names=["logits"],
    opset_version=13, dynamic_axes=None
)

# Convert ONNX → TFLite INT8 (using onnx2tf or ai_edge_torch)
# pip install ai-edge-torch
import ai_edge_torch
import numpy as np

# Calibration dataset (representative images)
def calibration_data():
    for _ in range(200):
        yield [np.random.randn(1, 3, 160, 160).astype(np.float32)]

edge_model = ai_edge_torch.convert(model, (dummy,))
edge_model.export("classifier.tflite")
print(f"TFLite model size: {os.path.getsize('classifier.tflite') / 1024:.0f} KB")`
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 4 — OCR Pipelines
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "ocr-pipelines",
      title: "OCR Pipelines: Text Detection, Recognition & Post-Processing",
      readTime: "22 min",
      content: [
        {
          type: "text",
          text: "Optical Character Recognition (OCR) is a multi-stage pipeline, not a single model. The stages are fundamentally different problems that require different architectures. Getting OCR right on edge devices requires understanding each stage, its computational cost, and where classical methods outperform deep learning."
        },
        {
          type: "callout",
          variant: "info",
          title: "The OCR Pipeline",
          text: "Image → Preprocessing (deskew, denoise, binarize) → Text Detection (locate text regions) → Text Recognition (read characters) → Post-Processing (spell check, format validation, structured extraction). Each stage has 10-100x different computational requirements."
        },

        // ── Section 1: Text Detection ──
        {
          type: "heading",
          text: "Text Detection: Finding Text in Images"
        },
        {
          type: "text",
          text: "Text detection is harder than general object detection because text has extreme aspect ratios (a sentence can be 20:1), variable sizes (a license plate vs a street sign vs a receipt line), and can be oriented at any angle (curved text on bottles, rotated documents).\n\n**EAST (Efficient and Accurate Scene Text Detector, 2017):** Fully convolutional network that outputs per-pixel predictions: (1) a confidence map (probability each pixel is inside a text region), and (2) geometry — either a rotated rectangle (4 distances + angle) or a quadrilateral (8 coordinates) per pixel. The geometry is predicted directly, avoiding anchor boxes. Final output: merge nearby pixels into text instances using locality-aware NMS. EAST is fast (~13ms on GPU at 720p) because there is no RPN or proposal stage.\n\n**DBNet (Differentiable Binarization, 2020):** Predicts a probability map and a threshold map, then combines them with a differentiable binarization formula: B = 1 / (1 + exp(-k * (P - T))), where P is probability, T is threshold, and k is a learned amplification factor (typically 50). The adaptive per-pixel threshold handles varying text/background contrast. DB++ adds an adaptive scale fusion (ASF) module for multi-scale text.\n\nDBNet is the current best choice for edge OCR: it achieves 82.8% F1 on ICDAR 2015 at real-time speed."
        },
        {
          type: "text",
          text: "**CRAFT (Character-Region Awareness for Text Detection):** Instead of detecting whole text lines, CRAFT detects individual characters and the affinity (connection) between adjacent characters. This naturally handles curved and arbitrarily shaped text. The output is a character heatmap + affinity heatmap. Characters are grouped into text instances by connected component analysis on the affinity map.\n\n**For edge deployment, the practical choice is DBNet with a MobileNetV3 backbone.** PaddleOCR's PP-OCRv4 detection model uses this combination and runs at ~15ms per frame on a Snapdragon 865."
        },

        // ── Section 2: Text Recognition ──
        {
          type: "heading",
          text: "Text Recognition: Reading Detected Text"
        },
        {
          type: "text",
          text: "Text recognition takes a cropped text region (typically resized to a fixed height, e.g., 32 or 48 pixels, with variable width) and outputs a string of characters.\n\n**CRNN + CTC (2015):** The foundational architecture that is still competitive.\n1. **CNN backbone** (ResNet or MobileNet): extracts visual features from the text image, producing a feature map of shape (C, 1, W) — the height dimension is collapsed.\n2. **Reshape** to a sequence of W feature vectors, each of dimension C.\n3. **Bidirectional LSTM** (2 layers): models sequential dependencies between characters.\n4. **CTC (Connectionist Temporal Classification) head:** outputs a probability distribution over the alphabet at each of W time steps.\n\n**Why CTC instead of cross-entropy?** CTC handles the alignment problem. The input sequence has W time steps (~25-100), but the output has variable length (~1-50 characters). CTC allows the network to output repeated characters and blanks, and marginalizes over all possible alignments during training. At inference, greedy decoding or beam search collapses the W-length CTC output to the final string."
        },
        {
          type: "text",
          text: "**Attention-based recognition (ASTER, NRTR, ABINet):** Instead of CTC, use an attention decoder (Transformer or LSTM with attention) that explicitly attends to different parts of the image for each output character. Advantages: better on irregular text (curved, distorted) and long sequences. Disadvantages: slower due to auto-regressive decoding (one character at a time), harder to optimize for edge.\n\n**TrOCR (Microsoft, 2021):** Vision Transformer encoder + text Transformer decoder. Pre-trained on large synthetic text data, then fine-tuned. State-of-the-art accuracy but heavy: TrOCR-Base is 334M parameters. TrOCR-Small (62M params) is usable on edge GPUs but not on NPUs or CPUs.\n\n**PP-OCRv4 recognizer (PaddlePaddle):** SVTR-based (Scene-text Visual Transformer Representation). The lightweight version uses a MobileNetV1Enhance backbone + SVTR-Tiny neck + CTC head. 12M params, runs at ~7ms per text crop on Snapdragon. This is the current sweet spot for edge OCR recognition."
        },
        {
          type: "code",
          lang: "python",
          code: `# End-to-end OCR with PaddleOCR (most edge-optimized OCR framework)
from paddleocr import PaddleOCR

# Initialize: det+rec+cls, use mobile models for edge
ocr = PaddleOCR(
    use_angle_cls=True,     # detect and correct text orientation
    lang="en",
    det_model_dir="ch_PP-OCRv4_det_infer",   # DBNet-based detector
    rec_model_dir="ch_PP-OCRv4_rec_infer",   # SVTR-based recognizer
    use_gpu=False,           # CPU inference for edge
    enable_mkldnn=True,      # Intel MKL-DNN acceleration
    cpu_threads=4,
)

# Run on image
result = ocr.ocr("receipt.jpg", cls=True)

for line in result[0]:
    bbox = line[0]       # [[x1,y1], [x2,y2], [x3,y3], [x4,y4]]
    text = line[1][0]    # recognized text string
    conf = line[1][1]    # confidence score
    print(f"[{conf:.2f}] {text}")

# Typical performance on ARM Cortex-A76 (4 threads):
# Detection: ~45ms | Recognition: ~12ms per text line | Total: ~100-200ms per image`
        },

        // ── Section 3: Tesseract vs Deep Learning OCR ──
        {
          type: "heading",
          text: "Tesseract vs Deep Learning OCR: When Classical Wins"
        },
        {
          type: "text",
          text: "Tesseract (v4+) uses an LSTM-based recognizer internally, so it is technically 'deep learning'. But its architecture is much simpler than PaddleOCR or TrOCR, and it relies heavily on classical preprocessing.\n\n**When Tesseract wins:**\n- **Clean document scans** (300 DPI, black text on white background): Tesseract achieves 98%+ character accuracy with zero training, because its pretrained models were specifically designed for this domain.\n- **Resource-constrained environments** (<1 GB RAM): Tesseract runs with minimal memory overhead.\n- **Known document layouts** (forms, invoices with fixed structure): Tesseract + template-based region extraction is simpler and more reliable than training a custom deep learning pipeline.\n\n**When deep learning OCR wins:**\n- **Scene text** (text on signs, products, in the wild): Tesseract drops to 60-70% accuracy; PP-OCRv4 maintains 85%+\n- **Rotated/curved text**: Tesseract cannot handle rotation >5° without preprocessing; deep learning handles arbitrary orientations\n- **Low quality images** (blur, low light, compression artifacts): Deep learning is far more robust\n- **Multilingual**: PP-OCRv4 supports 80+ languages with a single model"
        },
        {
          type: "code",
          lang: "python",
          code: `# Tesseract with OpenCV preprocessing — optimal for documents
import cv2
import pytesseract

def preprocess_for_tesseract(image_path):
    """Preprocessing pipeline that maximizes Tesseract accuracy."""
    img = cv2.imread(image_path)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # 1. Deskew: detect text angle and rotate
    coords = cv2.findNonZero(cv2.bitwise_not(gray))
    angle = cv2.minAreaRect(coords)[-1]
    if angle < -45:
        angle = 90 + angle
    if abs(angle) > 0.5:  # only rotate if skew is significant
        (h, w) = gray.shape
        M = cv2.getRotationMatrix2D((w // 2, h // 2), angle, 1.0)
        gray = cv2.warpAffine(gray, M, (w, h),
                              flags=cv2.INTER_CUBIC,
                              borderMode=cv2.BORDER_REPLICATE)

    # 2. Adaptive thresholding (handles uneven lighting)
    binary = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY, blockSize=21, C=10
    )

    # 3. Noise removal (morphological opening)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
    clean = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel)

    return clean

processed = preprocess_for_tesseract("document.jpg")
text = pytesseract.image_to_string(processed, config="--oem 1 --psm 6")
# --oem 1: LSTM engine only
# --psm 6: assume uniform block of text
print(text)`
        },

        // ── Section 4: Post-Processing ──
        {
          type: "heading",
          text: "OCR Post-Processing: From Raw Text to Structured Data"
        },
        {
          type: "text",
          text: "Raw OCR output is noisy. Post-processing can recover 5-15% of errors:\n\n**1. Confidence thresholding:** Remove low-confidence characters/words. But be careful — a strict threshold on a receipt OCR might drop all '$' symbols (always confused with 'S').\n\n**2. Dictionary/vocabulary correction:** For known vocabularies (product names, street addresses), fuzzy matching (edit distance) corrects OCR errors. A character error 'Appl3' → 'Apple' when the vocabulary contains 'Apple'.\n\n**3. Regular expression validation:** For structured fields (dates, amounts, phone numbers, license plates), regex patterns catch and correct obvious errors: 'O' ↔ '0', 'l' ↔ '1', 'S' ↔ '5'. For license plates with known format (e.g., ABC-1234), you can constrain recognition to only valid characters per position.\n\n**4. Language model correction:** For free-form text, a small n-gram or character-level language model scores candidate corrections. SymSpell (symmetric delete spelling correction) is fast enough for edge: <1ms per word lookup.\n\n**5. Layout analysis:** For documents, understanding the reading order (columns, tables, headers) is critical. Tools like LayoutLM or rule-based approaches (sort text boxes top-to-bottom, left-to-right with column detection) extract structure from spatial positions of detected text."
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 5 — Classical Computer Vision with OpenCV
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "classical-cv-opencv",
      title: "Classical CV with OpenCV: When Deep Learning Is Overkill",
      readTime: "20 min",
      content: [
        {
          type: "text",
          text: "Deep learning dominates vision benchmarks, but in production edge systems, classical computer vision solves 30-50% of visual tasks more reliably, faster, and with zero training data. The key insight: if the problem has known geometry, known colors, or known structure, classical CV is almost always the right choice. Reserve neural networks for tasks requiring semantic understanding."
        },
        {
          type: "callout",
          variant: "warning",
          title: "The Classical CV Decision Rule",
          text: "If you can describe the visual pattern in terms of edges, colors, shapes, or spatial relationships — use classical CV. If you need to understand 'what' something is (a cat vs a dog, a defect vs normal) — use deep learning. Many production systems combine both: classical CV for preprocessing/ROI extraction, deep learning for classification of the extracted regions."
        },

        // ── Section 1: Core Operations ──
        {
          type: "heading",
          text: "Core Operations: Thresholding, Morphology, Contours"
        },
        {
          type: "text",
          text: "**Thresholding** converts a grayscale image to binary, separating foreground from background.\n\n- **Global threshold (cv2.threshold):** Single cutoff value. Works only when lighting is uniform. Otsu's method automatically finds the optimal threshold by minimizing intra-class variance.\n- **Adaptive threshold (cv2.adaptiveThreshold):** Computes a different threshold for each pixel based on its local neighborhood (Gaussian-weighted mean or simple mean). Essential for documents with uneven lighting, shadows, or gradients.\n\n**Morphological operations** refine binary images:\n- **Erosion:** Shrinks white regions. Removes small noise dots (smaller than the kernel).\n- **Dilation:** Expands white regions. Fills small gaps in detected contours.\n- **Opening (erosion → dilation):** Removes noise while preserving shape.\n- **Closing (dilation → erosion):** Fills small holes while preserving shape.\n- **Morphological gradient (dilation - erosion):** Extracts edges/outlines.\n- **Top hat (original - opening):** Extracts small bright features from dark background.\n\n**Contour detection (cv2.findContours):** Finds boundaries of connected white regions in a binary image. Returns a list of contours, each being a list of (x, y) points. Contour analysis gives you area, perimeter, bounding rect, minimum enclosing circle, convex hull, and moments (for centroid calculation)."
        },
        {
          type: "code",
          lang: "python",
          code: `# Classical CV pipeline: detect and count objects by color
import cv2
import numpy as np

frame = cv2.imread("assembly_line.jpg")
hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)

# Detect red components (two ranges because red wraps in HSV)
mask1 = cv2.inRange(hsv, (0, 100, 100), (10, 255, 255))
mask2 = cv2.inRange(hsv, (160, 100, 100), (180, 255, 255))
red_mask = mask1 | mask2

# Clean up: morphological close then open
kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
red_mask = cv2.morphologyEx(red_mask, cv2.MORPH_CLOSE, kernel)
red_mask = cv2.morphologyEx(red_mask, cv2.MORPH_OPEN, kernel)

# Find contours and filter by area
contours, _ = cv2.findContours(red_mask, cv2.RETR_EXTERNAL,
                                cv2.CHAIN_APPROX_SIMPLE)

MIN_AREA, MAX_AREA = 500, 50000  # filter noise and oversized detections
valid_parts = []
for cnt in contours:
    area = cv2.contourArea(cnt)
    if MIN_AREA < area < MAX_AREA:
        # Compute shape metrics
        perimeter = cv2.arcLength(cnt, True)
        circularity = 4 * np.pi * area / (perimeter ** 2 + 1e-6)
        x, y, w, h = cv2.boundingRect(cnt)
        aspect_ratio = w / (h + 1e-6)

        valid_parts.append({
            "bbox": (x, y, w, h),
            "area": area,
            "circularity": circularity,   # 1.0 = perfect circle
            "aspect_ratio": aspect_ratio,
        })

print(f"Detected {len(valid_parts)} red components")
# Total processing time on ARM Cortex-A76: ~2ms for 720p frame`
        },

        // ── Section 2: Edge Detection and Hough Transforms ──
        {
          type: "heading",
          text: "Edge Detection and Hough Transforms"
        },
        {
          type: "text",
          text: "**Canny edge detector** is the workhorse of classical CV. It operates in 4 stages:\n1. **Gaussian blur** (reduces noise that causes false edges)\n2. **Gradient computation** (Sobel operator in x and y, compute magnitude + direction)\n3. **Non-maximum suppression** (thin edges to 1-pixel width by suppressing pixels that are not local maxima along the gradient direction)\n4. **Hysteresis thresholding** (double threshold: strong edges kept, weak edges kept only if connected to strong edges)\n\nKey parameters: low_threshold and high_threshold. Ratio of 1:2 or 1:3 works well. For documents: (30, 100). For natural scenes: (50, 150). For industrial inspection: (100, 200) (you want fewer, more certain edges)."
        },
        {
          type: "text",
          text: "**Hough Line Transform** detects straight lines in edge images by converting each edge pixel to a sinusoidal curve in (rho, theta) parameter space. Lines appear as intersection peaks.\n\n- **Standard Hough Transform (cv2.HoughLines):** Returns (rho, theta) for infinite lines. Use when you need the exact geometric line equation.\n- **Probabilistic Hough Transform (cv2.HoughLinesP):** Returns line segments as (x1, y1, x2, y2). More practical for most applications. Parameters: minLineLength (reject short segments) and maxLineGap (join segments with small gaps).\n\n**Hough Circle Transform (cv2.HoughCircles):** Detects circles using gradient-based voting. Parameters: minDist (minimum distance between circle centers), param1 (Canny high threshold), param2 (accumulator threshold — lower = more circles detected but more false positives), minRadius, maxRadius.\n\n**Use cases for Hough transforms on edge:**\n- Lane detection in driving applications (classical approach, very fast)\n- Industrial alignment verification (are parts straight? are holes circular?)\n- Document edge detection (find the 4 sides of a document for perspective correction)\n- Needle/gauge reading (find the line of a meter needle, compute angle)"
        },

        // ── Section 3: Feature Matching ──
        {
          type: "heading",
          text: "Feature Matching: ORB, Template Matching"
        },
        {
          type: "text",
          text: "**Template matching (cv2.matchTemplate):** Slide a template image across the search image and compute a similarity score at each position. Methods: TM_CCOEFF_NORMED (normalized cross-correlation, handles brightness variation) is most robust. Returns a score map — threshold and find peaks for multiple matches.\n\nLimitations: sensitive to scale and rotation changes. Works best when the template exactly matches the target in size and orientation. For multi-scale matching, build a scale pyramid and search at each level.\n\n**ORB (Oriented FAST and Rotated BRIEF):** A feature detector + descriptor that is free (no patent), fast, and rotation-invariant.\n1. **FAST keypoint detection:** Finds corners by testing 16 pixels on a circle around each pixel\n2. **Orientation assignment:** Computes intensity centroid to assign a dominant orientation\n3. **BRIEF descriptor** (rotated by the keypoint orientation): 256-bit binary descriptor\n4. **Matching:** Hamming distance between binary descriptors — a single XOR + popcount, blazing fast\n\nORB is 100x faster than SIFT and produces results good enough for most edge applications: object localization, homography estimation, visual odometry."
        },
        {
          type: "text",
          text: "**Practical feature matching pipeline:**\n\n1. Detect ORB keypoints in reference image and query image\n2. Compute descriptors for all keypoints\n3. Match descriptors using BFMatcher (brute-force) with Hamming distance\n4. Apply ratio test (Lowe's ratio test): keep match only if distance to best match < 0.75 * distance to second-best match\n5. If >10 good matches, compute homography with RANSAC (cv2.findHomography)\n6. Use homography to localize the reference object in the query image\n\nThis pipeline runs at <10ms on ARM Cortex-A76 for 640x480 images with 500 keypoints. Compare to a neural network object detector that needs 30-100ms."
        },
        {
          type: "code",
          lang: "python",
          code: `# ORB-based object localization (no deep learning needed)
import cv2

# Reference image (the object to find)
ref = cv2.imread("reference_part.jpg", cv2.IMREAD_GRAYSCALE)
query = cv2.imread("camera_frame.jpg", cv2.IMREAD_GRAYSCALE)

# Detect and compute ORB features
orb = cv2.ORB_create(nfeatures=500)
kp1, des1 = orb.detectAndCompute(ref, None)
kp2, des2 = orb.detectAndCompute(query, None)

# Match with brute-force Hamming distance
bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=False)
matches = bf.knnMatch(des1, des2, k=2)

# Lowe's ratio test
good_matches = []
for m, n in matches:
    if m.distance < 0.75 * n.distance:
        good_matches.append(m)

print(f"Good matches: {len(good_matches)}")

if len(good_matches) >= 10:
    # Extract matched keypoint locations
    src_pts = np.float32([kp1[m.queryIdx].pt for m in good_matches])
    dst_pts = np.float32([kp2[m.trainIdx].pt for m in good_matches])

    # Compute homography with RANSAC
    H, mask = cv2.findHomography(src_pts, dst_pts, cv2.RANSAC, 5.0)
    inliers = mask.ravel().sum()
    print(f"Homography inliers: {inliers}/{len(good_matches)}")

    # Project reference corners to find object in query
    h, w = ref.shape
    corners = np.float32([[0,0],[w,0],[w,h],[0,h]]).reshape(-1,1,2)
    projected = cv2.perspectiveTransform(corners, H)

    # Draw detected region
    query_color = cv2.cvtColor(query, cv2.COLOR_GRAY2BGR)
    cv2.polylines(query_color, [np.int32(projected)], True, (0,255,0), 3)`
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 6 — Barcode/QR and Document Scanning
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "barcode-document-scanning",
      title: "Barcode/QR Scanning & Document Scanning Pipelines",
      readTime: "18 min",
      content: [
        {
          type: "text",
          text: "Barcode scanning and document scanning are two of the most commercially valuable classical CV applications. Both combine edge detection, geometric transforms, and pattern decoding without requiring any deep learning. These pipelines run at sub-10ms latency on low-end hardware, making them ideal for embedded edge deployment."
        },

        // ── Section 1: Barcode/QR Detection ──
        {
          type: "heading",
          text: "Barcode and QR Code Detection Pipelines"
        },
        {
          type: "text",
          text: "**1D Barcodes (UPC, EAN, Code 128, Code 39):**\nA 1D barcode encodes data in the widths of alternating black and white bars. The scanner (camera or laser) reads a single scanline across the barcode. The key challenge is finding the barcode region in a full image.\n\nClassical approach: (1) Compute Scharr/Sobel gradient in x and y directions, (2) Subtract: gradient_magnitude = |Gx| - |Gy| (barcode bars are vertical, so horizontal gradient dominates), (3) Blur and threshold to get a barcode region mask, (4) Find contours, filter by aspect ratio (barcodes are wide and short), (5) Decode using ZBar or the bars module.\n\n**QR Codes:**\nQR codes have three finder patterns (large squares in three corners) that enable detection and orientation estimation. The finder patterns have a specific 1:1:3:1:1 black-to-white ratio that is scale and rotation invariant.\n\nDetection: OpenCV's QRCodeDetector finds the three finder patterns, computes the perspective transform, dewarps the code, and decodes the data. For challenging conditions (low contrast, partial occlusion), pyzbar (Python wrapper for ZBar) is more robust."
        },
        {
          type: "code",
          lang: "python",
          code: `# Real-time barcode + QR scanning with multiple fallbacks
import cv2
from pyzbar.pyzbar import decode as zbar_decode
import numpy as np

def scan_codes(frame):
    """Scan barcodes and QR codes with multiple strategies."""
    results = []
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

    # Strategy 1: Direct ZBar scan (fastest, works for clean images)
    codes = zbar_decode(gray)
    for code in codes:
        results.append({
            "data": code.data.decode("utf-8"),
            "type": code.type,              # 'QRCODE', 'EAN13', 'CODE128', etc.
            "bbox": code.rect,              # (x, y, w, h)
            "polygon": code.polygon,        # corner points
        })

    if results:
        return results

    # Strategy 2: Preprocessing for poor conditions
    # Adaptive threshold helps with uneven lighting
    binary = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY, 51, 10
    )
    codes = zbar_decode(binary)
    for code in codes:
        results.append({
            "data": code.data.decode("utf-8"),
            "type": code.type,
            "bbox": code.rect,
        })

    if results:
        return results

    # Strategy 3: Multi-scale scan for small/distant codes
    for scale in [1.5, 2.0]:
        h, w = gray.shape
        scaled = cv2.resize(gray, (int(w * scale), int(h * scale)),
                           interpolation=cv2.INTER_CUBIC)
        # Sharpen to enhance bar edges
        kernel = np.array([[-1,-1,-1],[-1,9,-1],[-1,-1,-1]])
        sharpened = cv2.filter2D(scaled, -1, kernel)
        codes = zbar_decode(sharpened)
        if codes:
            for code in codes:
                # Scale bbox back to original coordinates
                x, y, w, h = code.rect
                results.append({
                    "data": code.data.decode("utf-8"),
                    "type": code.type,
                    "bbox": (int(x/scale), int(y/scale),
                             int(w/scale), int(h/scale)),
                })
            break

    return results

# Performance on Raspberry Pi 4: ~8ms per 720p frame (ZBar direct)`
        },

        // ── Section 2: Document Scanning ──
        {
          type: "heading",
          text: "Document Scanning: Perspective Correction Pipeline"
        },
        {
          type: "text",
          text: "A document scanner transforms a photo of a document (taken at an angle, with perspective distortion) into a clean, flat, high-contrast scan. The pipeline is entirely classical CV:\n\n**Step 1: Edge detection.** Canny with moderate thresholds. Optional: Gaussian blur first (5x5 kernel) to reduce noise.\n\n**Step 2: Contour detection.** Find all contours, sort by area (largest first). The document should be the largest quadrilateral contour.\n\n**Step 3: Quadrilateral approximation.** Use cv2.approxPolyDP with epsilon = 0.02 * perimeter. If the approximation has exactly 4 points, it is likely the document boundary.\n\n**Step 4: Order the 4 corners.** Top-left (smallest x+y sum), top-right (largest x-y diff), bottom-right (largest x+y sum), bottom-left (smallest x-y diff). This consistent ordering is critical for the perspective transform.\n\n**Step 5: Compute output dimensions.** Width = max(distance(tl, tr), distance(bl, br)). Height = max(distance(tl, bl), distance(tr, br)).\n\n**Step 6: Perspective transform.** cv2.getPerspectiveTransform(src_pts, dst_pts) → cv2.warpPerspective. This maps the quadrilateral to a rectangle.\n\n**Step 7: Post-processing.** Convert to grayscale, apply adaptive thresholding for a clean black-and-white output. Optional: sharpen with an unsharp mask."
        },
        {
          type: "code",
          lang: "python",
          code: `# Complete document scanner pipeline
import cv2
import numpy as np

def order_points(pts):
    """Order 4 points: top-left, top-right, bottom-right, bottom-left."""
    rect = np.zeros((4, 2), dtype="float32")
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]       # top-left: smallest x+y
    rect[2] = pts[np.argmax(s)]       # bottom-right: largest x+y
    d = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(d)]       # top-right: smallest x-y
    rect[3] = pts[np.argmax(d)]       # bottom-left: largest x-y
    return rect

def four_point_transform(image, pts):
    """Apply perspective transform to extract document."""
    rect = order_points(pts)
    (tl, tr, br, bl) = rect

    # Compute output dimensions
    width_top = np.linalg.norm(tr - tl)
    width_bottom = np.linalg.norm(br - bl)
    max_width = int(max(width_top, width_bottom))

    height_left = np.linalg.norm(bl - tl)
    height_right = np.linalg.norm(br - tr)
    max_height = int(max(height_left, height_right))

    # Destination points (flat rectangle)
    dst = np.array([
        [0, 0], [max_width - 1, 0],
        [max_width - 1, max_height - 1], [0, max_height - 1]
    ], dtype="float32")

    M = cv2.getPerspectiveTransform(rect, dst)
    return cv2.warpPerspective(image, M, (max_width, max_height))

def scan_document(image_path):
    """Full document scanning pipeline."""
    image = cv2.imread(image_path)
    orig = image.copy()

    # Resize for faster processing (keep aspect ratio)
    ratio = image.shape[0] / 500.0
    resized = cv2.resize(image, (int(image.shape[1] / ratio), 500))

    # Edge detection
    gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blurred, 30, 100)

    # Dilate to close gaps in edges
    edges = cv2.dilate(edges, None, iterations=2)

    # Find contours, sorted by area
    contours, _ = cv2.findContours(edges, cv2.RETR_LIST,
                                    cv2.CHAIN_APPROX_SIMPLE)
    contours = sorted(contours, key=cv2.contourArea, reverse=True)[:5]

    doc_contour = None
    for cnt in contours:
        peri = cv2.arcLength(cnt, True)
        approx = cv2.approxPolyDP(cnt, 0.02 * peri, True)
        if len(approx) == 4:
            doc_contour = approx
            break

    if doc_contour is None:
        raise ValueError("Could not find document boundary")

    # Scale contour back to original image size
    doc_contour = doc_contour.reshape(4, 2) * ratio

    # Apply perspective transform
    warped = four_point_transform(orig, doc_contour)

    # Clean output: adaptive threshold for B&W
    warped_gray = cv2.cvtColor(warped, cv2.COLOR_BGR2GRAY)
    clean = cv2.adaptiveThreshold(
        warped_gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY, 21, 10
    )

    return clean

# Processing time on Raspberry Pi 4: ~15ms for 1080p input`
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 7 — Lane Detection
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "lane-detection",
      title: "Lane Detection: Classical vs Deep Learning Approaches",
      readTime: "18 min",
      content: [
        {
          type: "text",
          text: "Lane detection is one of the most studied edge CV problems because of autonomous driving. It illustrates the classical-vs-deep-learning trade-off perfectly: classical approaches work well in ideal conditions and run at 200+ FPS, while deep learning handles adverse conditions (rain, night, missing markings) but requires 10-100x more compute. Production systems often use a hybrid approach."
        },

        // ── Section 1: Classical Lane Detection ──
        {
          type: "heading",
          text: "Classical Lane Detection: Canny + Hough Pipeline"
        },
        {
          type: "text",
          text: "The classical pipeline exploits the geometric properties of lane markings: they are straight (or smoothly curved) lines on the road surface, viewed from a known camera position.\n\n**Step 1: Region of Interest (ROI).** Mask out the top half of the image (sky, buildings) and the far sides. Only process the trapezoidal road region. This reduces false positives by 80%+ and cuts computation in half.\n\n**Step 2: Color filtering.** Lane markings are white or yellow. Convert to HSV and filter for yellow; convert to grayscale and threshold for white. Combine the two masks. This is more robust than edge detection alone because it eliminates non-lane edges (shadows, road cracks).\n\n**Step 3: Edge detection.** Apply Gaussian blur (5x5) then Canny (50, 150) on the color-filtered image.\n\n**Step 4: Hough Line Transform.** Use probabilistic Hough (cv2.HoughLinesP) with parameters tuned for lane markings: minLineLength=40 (reject short noise segments), maxLineGap=100 (connect dashed lane markings).\n\n**Step 5: Line classification.** Separate lines into left lane (negative slope, x < image_center) and right lane (positive slope, x > image_center). Filter by angle: lane lines should be 25°-75° from horizontal. Reject lines outside this range (horizontal road markings, vertical structures).\n\n**Step 6: Line fitting.** For each side, fit a single line through all detected line segment endpoints using cv2.fitLine or numpy.polyfit. This produces stable output even when individual segments are noisy.\n\n**Step 7: Temporal smoothing.** Average the line parameters over the last N frames (3-5) to reduce jitter. Use exponential moving average: current = alpha * detected + (1 - alpha) * previous, with alpha = 0.3."
        },
        {
          type: "code",
          lang: "python",
          code: `# Classical lane detection pipeline
import cv2
import numpy as np
from collections import deque

class ClassicalLaneDetector:
    def __init__(self, smooth_frames=5):
        self.left_history = deque(maxlen=smooth_frames)
        self.right_history = deque(maxlen=smooth_frames)

    def detect(self, frame):
        h, w = frame.shape[:2]

        # 1. Region of interest (trapezoidal)
        roi_mask = np.zeros((h, w), dtype=np.uint8)
        roi_pts = np.array([[
            (int(w * 0.1), h),           # bottom-left
            (int(w * 0.45), int(h * 0.6)),  # top-left
            (int(w * 0.55), int(h * 0.6)),  # top-right
            (int(w * 0.9), h),           # bottom-right
        ]])
        cv2.fillPoly(roi_mask, roi_pts, 255)

        # 2. Color filtering (white + yellow lanes)
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        yellow = cv2.inRange(hsv, (15, 80, 120), (35, 255, 255))
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        white = cv2.inRange(gray, 200, 255)
        color_mask = yellow | white

        # 3. Edge detection
        blurred = cv2.GaussianBlur(color_mask, (5, 5), 0)
        edges = cv2.Canny(blurred, 50, 150)
        edges = edges & roi_mask  # apply ROI

        # 4. Hough lines
        lines = cv2.HoughLinesP(edges, rho=1, theta=np.pi/180,
                                 threshold=30, minLineLength=40,
                                 maxLineGap=100)

        if lines is None:
            return self._get_smoothed()

        # 5. Classify into left/right by slope
        left_pts, right_pts = [], []
        for line in lines:
            x1, y1, x2, y2 = line[0]
            if x2 == x1:
                continue
            slope = (y2 - y1) / (x2 - x1)
            angle = np.abs(np.degrees(np.arctan(slope)))

            if angle < 25 or angle > 75:  # reject near-horizontal/vertical
                continue

            if slope < 0 and x1 < w // 2:   # left lane
                left_pts.extend([(x1, y1), (x2, y2)])
            elif slope > 0 and x1 > w // 2:  # right lane
                right_pts.extend([(x1, y1), (x2, y2)])

        # 6. Fit lines
        if len(left_pts) >= 4:
            pts = np.array(left_pts)
            [vx, vy, x0, y0] = cv2.fitLine(pts, cv2.DIST_L2, 0, 0.01, 0.01)
            self.left_history.append((vx[0], vy[0], x0[0], y0[0]))
        if len(right_pts) >= 4:
            pts = np.array(right_pts)
            [vx, vy, x0, y0] = cv2.fitLine(pts, cv2.DIST_L2, 0, 0.01, 0.01)
            self.right_history.append((vx[0], vy[0], x0[0], y0[0]))

        return self._get_smoothed()

    def _get_smoothed(self):
        """Average recent detections for temporal stability."""
        result = {}
        for side, hist in [("left", self.left_history),
                           ("right", self.right_history)]:
            if hist:
                avg = np.mean(hist, axis=0)
                result[side] = tuple(avg)
        return result

# Performance: ~2ms per 720p frame on Raspberry Pi 4`
        },

        // ── Section 2: Deep Learning Lane Detection ──
        {
          type: "heading",
          text: "Deep Learning Lane Detection for Adverse Conditions"
        },
        {
          type: "text",
          text: "Classical lane detection fails when:\n- Lane markings are faded, missing, or occluded by vehicles\n- Night driving with headlight glare and low contrast\n- Rain/snow: water reflections create false edges, markings are obscured\n- Complex intersections: multiple overlapping markings\n- Curved roads: Hough Transform only detects straight lines\n\n**LaneNet (2018):** Instance segmentation approach. Two branches: a binary segmentation branch (is this pixel a lane?) and an embedding branch (which lane does this pixel belong to?). Pixels with similar embeddings are clustered into lane instances. Then a polynomial is fit to each lane instance using RANSAC.\n\n**SCNN (Spatial CNN):** Propagates information across rows and columns (not just local receptive fields) to handle occluded/missing lane sections. The spatial propagation allows the network to 'imagine' the continuation of a lane even when it is under a car.\n\n**Ultra-Fast Lane Detection (2020):** Formulates lane detection as row-wise classification: for each predefined row (anchor), predict which column the lane passes through. This is much faster than segmentation (no per-pixel prediction) and naturally handles the structure of lanes. Achieves 300+ FPS on GPU.\n\n**For edge deployment:** Ultra-Fast Lane Detection with a ResNet-18 backbone at INT8 runs at 60+ FPS on Jetson Orin Nano. For ultra-low-power edge (Raspberry Pi level), the classical pipeline is still the practical choice, augmented with basic ML for failure detection (low-confidence → switch to cautious mode)."
        },
        {
          type: "comparison",
          headers: ["Classical (Canny + Hough)", "Deep Learning (LaneNet / Ultra-Fast)"],
          rows: [
            ["~2ms per frame on ARM", "~15-50ms per frame on ARM + NPU"],
            ["Fails on missing/faded markings", "Handles occlusion and missing markings"],
            ["Straight lanes only (or polynomial fit)", "Arbitrary lane shapes including curves"],
            ["No training data needed", "Requires labeled lane dataset (TuSimple, CULane)"],
            ["Deterministic, explainable", "Black box, may fail unpredictably"],
            ["Perfect for structured environments (warehouse, parking)", "Needed for public road driving"],
          ]
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 8 — Defect Detection in Manufacturing
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "defect-detection-manufacturing",
      title: "Defect Detection in Manufacturing",
      readTime: "20 min",
      content: [
        {
          type: "text",
          text: "Manufacturing defect detection is arguably the highest-value edge AI application. A single undetected defect in automotive or semiconductor manufacturing can cost $10,000-$1,000,000 in recalls, rework, or liability. The challenge is unique: defects are rare (0.01-1% of parts), visually diverse (scratches, dents, discoloration, missing components), and the system must achieve 99.9%+ recall while running at production line speed (often 10-60 parts per second)."
        },

        // ── Section 1: Classical Approaches ──
        {
          type: "heading",
          text: "Classical Defect Detection: Template Matching and Differencing"
        },
        {
          type: "text",
          text: "Classical methods work when you have a known 'golden reference' — what a good part looks like.\n\n**Image differencing:** Capture a reference image of a good part under identical lighting. For each new part: align (using feature matching or mechanical fixture), compute the absolute pixel difference, threshold, and flag regions where the difference exceeds the threshold. This is the simplest approach and runs at <1ms per frame.\n\nChallenges: (1) Lighting must be extremely consistent — even 5% brightness variation causes false positives. Use structured lighting (ring lights, dome lights) to eliminate shadows. (2) Part positioning must be repeatable. A 2-pixel misalignment causes edge artifacts. Use fiducial markers or mechanical fixtures for registration.\n\n**Template matching for component presence:**\nIn PCB inspection, verify that each component is present and correctly placed. For each expected component: template match at the expected position, check that the score exceeds a threshold. This catches missing components, misalignment, and wrong component (if the match score is low but something is present).\n\n**Statistical texture analysis:**\nFor surface defects (scratches on metal, pitting on glass), compute texture features: Local Binary Patterns (LBP), Gray-Level Co-occurrence Matrix (GLCM) features (contrast, homogeneity, energy, correlation), or Gabor filter responses. Train a simple classifier (SVM, random forest) on these features. This is an order of magnitude more robust than pixel differencing for textured surfaces."
        },
        {
          type: "code",
          lang: "python",
          code: `# Image differencing for defect detection with registration
import cv2
import numpy as np

class GoldenReferenceInspector:
    def __init__(self, reference_path, threshold=30, min_defect_area=50):
        self.reference = cv2.imread(reference_path, cv2.IMREAD_GRAYSCALE)
        self.threshold = threshold
        self.min_defect_area = min_defect_area

        # Pre-compute ORB features for alignment
        self.orb = cv2.ORB_create(500)
        self.ref_kp, self.ref_des = self.orb.detectAndCompute(
            self.reference, None)

    def inspect(self, part_image_gray):
        """Inspect a part against the golden reference.
        Returns: list of defect regions (bbox, area, severity)."""

        # 1. Align part to reference using ORB + homography
        kp, des = self.orb.detectAndCompute(part_image_gray, None)
        bf = cv2.BFMatcher(cv2.NORM_HAMMING)
        matches = bf.knnMatch(self.ref_des, des, k=2)

        good = [m for m, n in matches if m.distance < 0.75 * n.distance]
        if len(good) < 10:
            return [{"error": "alignment_failed"}]

        src = np.float32([self.ref_kp[m.queryIdx].pt for m in good])
        dst = np.float32([kp[m.trainIdx].pt for m in good])
        H, _ = cv2.findHomography(dst, src, cv2.RANSAC, 3.0)

        aligned = cv2.warpPerspective(
            part_image_gray, H,
            (self.reference.shape[1], self.reference.shape[0]))

        # 2. Compute difference
        diff = cv2.absdiff(self.reference, aligned)

        # 3. Threshold and clean
        _, binary = cv2.threshold(diff, self.threshold, 255,
                                   cv2.THRESH_BINARY)
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
        binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel)

        # 4. Find defect regions
        contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL,
                                        cv2.CHAIN_APPROX_SIMPLE)

        defects = []
        for cnt in contours:
            area = cv2.contourArea(cnt)
            if area >= self.min_defect_area:
                x, y, w, h = cv2.boundingRect(cnt)
                severity = np.mean(diff[y:y+h, x:x+w])
                defects.append({
                    "bbox": (x, y, w, h),
                    "area": area,
                    "severity": float(severity),  # average pixel diff
                })

        return defects

# ~5ms per 1280x960 frame on ARM Cortex-A76`
        },

        // ── Section 2: Deep Learning for Defect Detection ──
        {
          type: "heading",
          text: "Deep Learning: Anomaly Detection and Supervised Detection"
        },
        {
          type: "text",
          text: "Deep learning for defect detection takes two fundamentally different approaches depending on data availability:\n\n**Supervised detection (when you have labeled defect images):**\nTrain YOLOv8 or similar on labeled defect images. Each defect type is a class: scratch, dent, crack, discoloration, missing_component. This gives precise localization and classification but requires 100+ labeled examples per defect type. For rare defect types, use data augmentation (copy-paste augmentation: paste synthetic defects onto good images) to bootstrap the training set.\n\n**Anomaly detection (when you only have good parts — far more common):**\nTrain a model only on images of good parts. At inference, flag anything that does not match the learned distribution of 'good'. This is the realistic scenario: when you start a new production line, you have millions of good parts but zero or few defect examples."
        },
        {
          type: "text",
          text: "**Anomaly detection architectures for manufacturing:**\n\n**Autoencoder-based:** Train a convolutional autoencoder to reconstruct images of good parts. At inference, the reconstruction error (pixel-wise L1/L2 difference between input and reconstruction) is high for defective regions because the autoencoder has never seen defects and cannot reconstruct them. Threshold the reconstruction error map to localize defects.\n\nPros: Simple, interpretable. Cons: Blurry reconstructions cause false positives on fine textures.\n\n**PatchCore (2022, state-of-the-art on MVTec-AD):** Extracts patch-level features from a pretrained ImageNet backbone (WideResNet-50), stores a core-set of representative patch features from good training images (subsampled with greedy coreset selection to ~1-10% of all patches for memory efficiency). At inference, for each patch in the test image, find the nearest neighbor in the core-set. The distance to the nearest neighbor is the anomaly score. No training required — just feature extraction and nearest neighbor search.\n\nPros: 99.1% AUROC on MVTec-AD, no training loop. Cons: Large memory for the core-set (mitigated by coreset subsampling), requires a pretrained backbone.\n\n**EfficientAD (2023):** Student-teacher approach optimized for speed. A lightweight student network is trained to match the output of a pretrained teacher network on good images. At inference, the disagreement between student and teacher indicates anomalies. Achieves 96.7% AUROC on MVTec-AD at 600+ FPS on GPU, making it viable for edge deployment."
        },
        {
          type: "callout",
          variant: "tip",
          title: "The Hybrid Approach in Practice",
          text: "Production defect detection systems almost always combine approaches: (1) Classical image differencing as a fast pre-filter (~1ms, catches gross defects and missing parts), (2) Anomaly detection on regions that pass the classical filter (~10ms, catches subtle defects), (3) Optional supervised classifier on detected anomalies for defect type classification (~5ms). This cascade keeps average latency low while maintaining high recall."
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 9 — Face Detection, Recognition & Pose Estimation
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "face-detection-pose-estimation",
      title: "Face Detection, Recognition & Pose Estimation on Edge",
      readTime: "22 min",
      content: [
        {
          type: "text",
          text: "Face detection and pose estimation are high-profile edge AI applications with unique challenges: they operate on people, so accuracy failures have immediate user-facing consequences, and they carry significant privacy and ethical considerations that affect system design. Both have excellent edge-optimized models available."
        },

        // ── Section 1: Face Detection ──
        {
          type: "heading",
          text: "Face Detection: From Viola-Jones to BlazeFace"
        },
        {
          type: "text",
          text: "**Viola-Jones (2001):** The original real-time face detector. Uses Haar-like features (differences between adjacent rectangular regions), computed efficiently via integral images. A cascade of classifiers (each trained with AdaBoost) progressively filters out non-face regions: the first stages use very few features and reject 50% of regions in <1 microsecond; later stages use more features for difficult cases. Still used in OpenCV (cv2.CascadeClassifier) for simple applications.\n\nLimitations: poor on non-frontal faces, cannot detect small faces, high false-positive rate on complex backgrounds.\n\n**MTCNN (Multi-Task Cascaded Convolutional Networks, 2016):** Three-stage cascade: (1) P-Net (Proposal): lightweight FCN that scans at multiple scales to generate face candidates. (2) R-Net (Refinement): rejects false positives and refines bounding boxes. (3) O-Net (Output): final refinement + 5-point facial landmark detection (eyes, nose, mouth corners). MTCNN runs at ~15ms per 720p frame on GPU.\n\n**RetinaFace (2019):** Single-stage, multi-task face detector based on RetinaNet. Detects faces, predicts 5 landmarks, and optionally predicts 3D face meshes. Uses feature pyramid network (FPN) for multi-scale detection. With a MobileNet-0.25 backbone: 0.5M params, ~5ms on GPU, achieves 90.7% AP on WIDER FACE hard set.\n\n**BlazeFace (Google, 2019):** Specifically designed for mobile. Uses a modified SSD architecture with a custom feature extractor (depthwise separable convs + BlazeBlock with skip connections). Detects faces + 6 keypoints in ~1ms on mobile GPU. The MediaPipe integration makes it trivial to deploy."
        },

        // ── Section 2: Face Recognition ──
        {
          type: "heading",
          text: "Face Recognition: Embeddings and ArcFace"
        },
        {
          type: "text",
          text: "Face recognition is a metric learning problem: train a network to produce embeddings (typically 128-512 dimensional vectors) such that embeddings of the same person are close and embeddings of different people are far apart.\n\n**Pipeline:** Detect face → align (using landmarks to normalize rotation and scale, typically affine transform to place eyes at fixed positions) → extract embedding → compare.\n\n**Loss functions evolution:**\n- Contrastive loss (2005): pulls same-person pairs together, pushes different-person pairs apart. Limited by pair sampling.\n- Triplet loss (FaceNet, 2015): anchor-positive-negative triplets. The embedding distance d(anchor, positive) + margin < d(anchor, negative). Hard negative mining is critical: randomly sampled triplets are too easy after a few epochs.\n- ArcFace (2019): additive angular margin loss in the classification head during training. The embedding is L2-normalized, the classification weight matrix is L2-normalized, and an angular margin m is added to the angle between the embedding and the target class center: L = -log(exp(s*cos(theta_target + m)) / sum(exp(s*cos(theta_j)))). This directly optimizes the geodesic distance on the hypersphere, producing tighter intra-class clusters and wider inter-class gaps."
        },
        {
          type: "text",
          text: "**Edge-optimized face recognition:**\n\n- **MobileFaceNet (2018):** 0.99M params, 128-dim embedding, 99.28% accuracy on LFW. Uses inverted residual blocks (MobileNetV2-style) with a global depthwise convolution instead of global average pooling (preserves spatial information critical for faces). Runs at ~5ms on Snapdragon 845.\n\n- **ArcFace-MobileNetV2 (InsightFace):** 2.1M params, 512-dim embedding, 99.50% on LFW. The InsightFace project provides pretrained models in ONNX format, ready for edge deployment.\n\n**Anti-spoofing (liveness detection):**\nFace recognition systems are vulnerable to presentation attacks: holding up a photo, playing a video, or wearing a 3D mask. Anti-spoofing approaches:\n1. **Texture analysis:** Real faces have skin pores, subtle color variations. Photos have printing artifacts, moiré patterns. A small CNN trained on real vs spoof images achieves 95%+ accuracy.\n2. **Depth estimation:** Using stereo cameras or structured light (like iPhone TrueDepth), verify that the face has 3D geometry. A photo is flat.\n3. **Liveness challenges:** Ask the user to blink, smile, or turn their head. The system verifies the action matches the request. Simple to implement but slower.\n4. **IR-based:** Near-infrared cameras see different reflectance patterns for real skin vs paper/screen. Most robust but requires hardware support."
        },
        {
          type: "callout",
          variant: "warning",
          title: "Privacy and Ethical Considerations",
          text: "Face recognition in edge AI carries significant legal and ethical responsibilities:\n- GDPR (EU): Biometric data is a special category; explicit consent required; right to erasure applies to face embeddings\n- BIPA (Illinois): Written consent, data retention policies, private right of action for violations ($1000-$5000 per violation)\n- Technical measures: process faces on-device (no cloud upload), store only embeddings (not images), implement embedding deletion, use template protection (cancellable biometrics)\n- Bias: Face recognition accuracy varies by demographic. Test on balanced evaluation sets (e.g., Balanced Faces in the Wild). If your edge system shows differential accuracy, do not deploy it."
        },

        // ── Section 3: Pose Estimation ──
        {
          type: "heading",
          text: "Pose Estimation on Edge: MoveNet and BlazePose"
        },
        {
          type: "text",
          text: "Human pose estimation detects body keypoints (joints) and optionally connects them into a skeleton. Edge-optimized models detect 17 keypoints (COCO format) or 33 keypoints (BlazePose/MediaPipe format with hands and face landmarks).\n\n**MoveNet (Google, 2021):** Specifically designed for real-time edge inference.\n- **MoveNet Lightning:** 3.7M params, single-person detection, ~3ms on Coral Edge TPU, ~12ms on CPU. Uses a MobileNetV2 backbone + feature pyramid, predicts heatmaps for each keypoint + offset regression for sub-pixel accuracy.\n- **MoveNet Thunder:** Higher accuracy variant, ~7ms on Coral, ~20ms on CPU.\n\n**Architecture insight:** MoveNet uses a person center detection head that first locates the person, then uses that center to crop and re-process for keypoint detection. This two-step approach (detect person center → regress keypoints) is more efficient than processing the full image for keypoints.\n\n**BlazePose (Google/MediaPipe, 2020):** 33 keypoints including hands and feet. Two models: a detector (runs only when needed — when the person is lost) and a landmark model (runs every frame on the cropped person region). The landmark model is ~3.5M params. Total pipeline: ~15ms on mobile GPU.\n\nBlazePose is preferred when you need hand and foot keypoints (fitness, sign language). MoveNet Lightning is preferred for pure speed (surveillance, counting)."
        },
        {
          type: "text",
          text: "**Edge pose estimation applications:**\n\n**Fitness/rehabilitation:** Count reps (detect joint angle peaks), verify form (compare joint angles to target), track range of motion over time. Key technical challenge: accurate joint angles require accurate depth estimation or known camera geometry, because 2D poses suffer from foreshortening errors.\n\n**Workplace safety:** Detect unsafe postures (bending at the back instead of knees, reaching into hazardous zones). Edge processing is critical — you cannot send continuous worker video to the cloud for privacy reasons.\n\n**Retail analytics:** Count people, track movement patterns, detect interactions with displays. Use centroid tracking on pose keypoints (neck/hip) instead of full bounding boxes for more robust tracking through partial occlusions.\n\n**Fall detection (elderly care):** Detect sudden vertical change in the torso keypoint combined with horizontal spread of limbs. Classical heuristic on pose keypoints: if hip_y moves more than 40% of body height in <1 second and final posture has low vertical extent, flag as potential fall."
        },
        {
          type: "code",
          lang: "python",
          code: `# Real-time pose estimation with MoveNet (TFLite)
import numpy as np
import cv2
import tflite_runtime.interpreter as tflite

# Load MoveNet Lightning
interpreter = tflite.Interpreter(model_path="movenet_lightning.tflite")
interpreter.allocate_tensors()

input_details = interpreter.get_input_details()
output_details = interpreter.get_output_details()

# COCO keypoint connections for skeleton drawing
CONNECTIONS = [
    (0,1),(0,2),(1,3),(2,4),      # head
    (5,6),(5,7),(7,9),(6,8),(8,10), # arms
    (5,11),(6,12),(11,12),         # torso
    (11,13),(13,15),(12,14),(14,16) # legs
]

KEYPOINT_NAMES = [
    "nose","left_eye","right_eye","left_ear","right_ear",
    "left_shoulder","right_shoulder","left_elbow","right_elbow",
    "left_wrist","right_wrist","left_hip","right_hip",
    "left_knee","right_knee","left_ankle","right_ankle"
]

def detect_pose(frame):
    """Detect pose keypoints using MoveNet Lightning."""
    # Preprocess: resize to 192x192, normalize to 0-255 int32
    input_size = input_details[0]["shape"][1]  # 192
    img = cv2.resize(frame, (input_size, input_size))
    img = np.expand_dims(img, axis=0).astype(np.int32)

    interpreter.set_tensor(input_details[0]["index"], img)
    interpreter.invoke()

    # Output: [1, 1, 17, 3] -> 17 keypoints x (y, x, confidence)
    keypoints = interpreter.get_tensor(output_details[0]["index"])
    keypoints = keypoints[0, 0]  # shape: (17, 3)

    # Convert normalized coords to pixel coords
    h, w = frame.shape[:2]
    kps = []
    for i, (y, x, conf) in enumerate(keypoints):
        kps.append({
            "name": KEYPOINT_NAMES[i],
            "x": int(x * w),
            "y": int(y * h),
            "confidence": float(conf),
        })

    return kps

def compute_joint_angle(kp_a, kp_b, kp_c):
    """Compute angle at joint B formed by segments BA and BC."""
    a = np.array([kp_a["x"], kp_a["y"]])
    b = np.array([kp_b["x"], kp_b["y"]])
    c = np.array([kp_c["x"], kp_c["y"]])

    ba = a - b
    bc = c - b
    cos_angle = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-6)
    angle = np.degrees(np.arccos(np.clip(cos_angle, -1, 1)))
    return angle

# Example: detect squat depth by checking knee angle
# kps = detect_pose(frame)
# knee_angle = compute_joint_angle(kps[11], kps[13], kps[15])  # hip-knee-ankle
# if knee_angle < 90: print("Deep squat detected")`
        },
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LESSON 10 — End-to-End MLOps for Edge AI
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: "edge-mlops-pipeline",
      title: "End-to-End MLOps for Edge AI",
      readTime: "22 min",
      content: [
        {
          type: "text",
          text: "Edge MLOps is fundamentally harder than cloud MLOps because you are deploying to thousands of heterogeneous devices that you do not fully control, operating in environments you cannot fully predict, and collecting data that you cannot always send back. The entire lifecycle — data collection, annotation, training, optimization, deployment, monitoring, and retraining — must be designed for this reality from day one."
        },

        // ── Section 1: Data Collection and Annotation ──
        {
          type: "heading",
          text: "Data Collection and Annotation Strategy"
        },
        {
          type: "text",
          text: "**Collecting data from edge devices:**\nYou cannot upload all camera frames to the cloud. A single 720p camera at 30 FPS generates ~1.5 TB/day uncompressed. Strategy:\n1. **Trigger-based capture:** Only save frames when the inference result is uncertain (confidence between 0.3-0.7) or when a rare class is detected.\n2. **Periodic sampling:** Save every Nth frame (e.g., 1 per minute) for distribution monitoring.\n3. **Edge-side preprocessing:** Compress, crop to ROI, downsample before upload. A 224x224 JPEG is ~15 KB vs ~2.7 MB for the full frame.\n4. **Privacy filtering:** Run face detection and blur/remove faces before any data leaves the device. This is not optional in regulated industries.\n\n**Annotation tools and workflows:**\n- **Label Studio (open-source):** Self-hosted, supports detection/segmentation/classification. ML-assisted labeling (pre-annotate with your current model, then correct). Critical for iterative improvement.\n- **Roboflow:** Cloud-hosted, strong augmentation pipeline, auto-annotation with foundation models (Grounding DINO + SAM). Exports directly to YOLO/COCO/TFRecord formats.\n- **CVAT:** Enterprise-grade, supports video annotation, task management for annotation teams.\n\n**Active learning loop:** Use your deployed model's uncertainty to select the most informative samples for annotation. Samples where the model is uncertain (high entropy, low max confidence, high disagreement between ensemble members) provide the most training signal per annotation dollar."
        },

        // ── Section 2: Training and Optimization Pipeline ──
        {
          type: "heading",
          text: "Training Pipeline: From Annotated Data to Optimized Model"
        },
        {
          type: "text",
          text: "**The training pipeline for edge AI:**\n\n1. **Data versioning (DVC):** Track datasets alongside code. Each training run references a specific data version. When you discover a model regression, you can diff the data versions to find the cause.\n\n2. **Experiment tracking (MLflow / W&B):** Log hyperparameters, metrics, model artifacts. For edge AI, also log: model size (bytes), FLOPs, estimated latency per target device, quantization accuracy.\n\n3. **Training:** PyTorch/Ultralytics with standard best practices. For detection: start from COCO pretrained weights, fine-tune on your dataset.\n\n4. **Export to interchange format:** PyTorch → ONNX (with opset 13+, simplify=True). Verify ONNX model produces identical outputs to PyTorch model (max absolute difference < 1e-5 for FP32).\n\n5. **Quantization (INT8):** Post-training quantization with a calibration dataset (200-500 representative images). Verify that quantized mAP is within 1-2 points of FP32 mAP. If not, try QAT (quantization-aware training).\n\n6. **Target-specific compilation:** ONNX → TFLite (for Coral/CPU), TensorRT (for Jetson), NNAPI (for Android NPU), Core ML (for Apple). Each target has its own conversion toolchain and supported op set.\n\n7. **On-device validation:** Run the final model on the actual target device. Measure: latency (p50, p95, p99), memory usage, thermal throttling behavior (run for 10 minutes continuous), accuracy on a held-out test set."
        },
        {
          type: "code",
          lang: "python",
          code: `# Complete edge MLOps pipeline with DVC + MLflow
# dvc.yaml - defines the reproducible pipeline
"""
stages:
  prepare:
    cmd: python src/prepare_data.py
    deps:
      - data/raw/
      - src/prepare_data.py
    params:
      - prepare.train_ratio
      - prepare.image_size
    outs:
      - data/processed/

  train:
    cmd: python src/train.py
    deps:
      - data/processed/
      - src/train.py
    params:
      - train.epochs
      - train.batch_size
      - train.model_variant
    outs:
      - models/best.pt
    metrics:
      - metrics/train_metrics.json:
          cache: false

  export:
    cmd: python src/export.py
    deps:
      - models/best.pt
      - src/export.py
    params:
      - export.format
      - export.quantize
    outs:
      - models/exported/
    metrics:
      - metrics/export_metrics.json:
          cache: false

  validate:
    cmd: python src/validate_edge.py
    deps:
      - models/exported/
      - data/test/
    metrics:
      - metrics/edge_validation.json:
          cache: false
"""

# src/train.py - training with MLflow tracking
import mlflow
import yaml
from ultralytics import YOLO

with open("params.yaml") as f:
    params = yaml.safe_load(f)

mlflow.set_experiment("edge-detector-v2")

with mlflow.start_run():
    model = YOLO(f"yolov8{params['train']['model_variant']}.pt")

    results = model.train(
        data="data/processed/dataset.yaml",
        epochs=params["train"]["epochs"],
        batch=params["train"]["batch_size"],
        imgsz=params["prepare"]["image_size"],
        device=0,
    )

    # Log metrics
    mlflow.log_metrics({
        "mAP50": results.results_dict["metrics/mAP50(B)"],
        "mAP50_95": results.results_dict["metrics/mAP50-95(B)"],
        "params_M": model.model.model[-1].np / 1e6,
    })

    # Log model artifact
    mlflow.log_artifact("runs/detect/train/weights/best.pt")

    print(f"mAP@50:95 = {results.results_dict['metrics/mAP50-95(B)']:.4f}")`
        },

        // ── Section 3: Deployment and Monitoring ──
        {
          type: "heading",
          text: "Edge Deployment, OTA Updates & Drift Monitoring"
        },
        {
          type: "text",
          text: "**Deployment strategies for edge fleets:**\n\n**Containerized deployment (Docker + K3s):** For Linux-based edge devices (Jetson, RPi). Package the model + inference code in a Docker container. Use K3s (lightweight Kubernetes) or Balena for fleet management. Rolling updates ensure zero downtime: deploy to 10% of devices, monitor metrics, expand to 100%.\n\n**OTA (Over-The-Air) updates for constrained devices:** For MCU/RTOS devices that cannot run containers. Binary differential updates (only send the changed bytes) reduce update size by 80-95%. Tools: Mender.io, AWS IoT Greengrass, Azure IoT Edge. Critical: always keep a rollback partition so a failed update does not brick the device.\n\n**A/B model testing:** Deploy model_v2 to 20% of devices while 80% continue running model_v1. Compare accuracy metrics (from edge-side validation), latency, and crash rates. This is harder than cloud A/B testing because you cannot quickly reassign devices — an OTA update takes minutes to hours."
        },
        {
          type: "text",
          text: "**Monitoring edge AI in production:**\n\n**Inference metrics (collected on-device, reported to cloud):**\n- Predictions per second (throughput)\n- Latency histogram (p50, p95, p99)\n- Confidence distribution: if mean confidence drops, the input distribution is shifting\n- Class distribution: if the ratio of detected classes changes, the environment has changed\n- Memory and CPU/GPU utilization, temperature\n\n**Data drift detection:**\nCollect lightweight statistical summaries of input data (mean pixel intensity, color histogram, edge density) and compare to the training distribution. Use KL divergence or Population Stability Index (PSI) as drift metrics. Alert when PSI > 0.2.\n\n**Model performance monitoring (when ground truth is available):**\nFor some applications, you get delayed ground truth (e.g., a human reviews flagged defects). Track accuracy over time. A sustained 2%+ accuracy drop triggers retraining.\n\n**Federated monitoring:**\nAggregate metrics from all edge devices to detect fleet-wide issues (a bad model update) vs device-specific issues (a dirty camera lens, changed lighting). Use a central dashboard (Grafana + Prometheus/InfluxDB) with per-device and aggregate views."
        },
        {
          type: "text",
          text: "**Continuous improvement cycle:**\n\n1. **Detect drift** → confidence distribution or data statistics shift\n2. **Collect targeted data** → edge devices upload uncertain samples\n3. **Annotate** → active learning prioritizes the most informative samples\n4. **Retrain** → incremental training on new data (optionally federated across edge devices)\n5. **Validate** → automated comparison against held-out test set AND previous model version\n6. **Deploy** → staged rollout with automatic rollback on metric regression\n7. **Monitor** → close the loop\n\nThis cycle runs continuously. A mature edge AI system retrains weekly to monthly, depending on the rate of environmental change. The entire pipeline must be automated — manual intervention should only be needed for novel failure modes."
        },
        {
          type: "diagram",
          title: "Edge MLOps Lifecycle",
          code: "┌─────────────────────────────────────────────────────────────────────┐\n│                        CLOUD / TRAINING CLUSTER                     │\n│                                                                     │\n│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐      │\n│  │ Data Lake │───▶│ Annotate │───▶│  Train   │───▶│ Validate │      │\n│  │  (DVC)   │    │ (Label   │    │ (MLflow) │    │ (auto +  │      │\n│  │          │    │  Studio) │    │          │    │  human)  │      │\n│  └────▲─────┘    └──────────┘    └──────────┘    └────┬─────┘      │\n│       │                                               │            │\n│       │ uncertain                              export + quantize   │\n│       │ samples                                       │            │\n│       │                                               ▼            │\n│       │                                        ┌──────────┐        │\n│       │                                        │ Model    │        │\n│       │                                        │ Registry │        │\n│       │                                        └────┬─────┘        │\n└───────┼─────────────────────────────────────────────┼──────────────┘\n        │                                             │ OTA update\n════════╪═════════════════════════════════════════════╪══════════════\n        │                                             │\n┌───────┼─────────────────────────────────────────────┼──────────────┐\n│       │              EDGE DEVICES (fleet)            ▼              │\n│  ┌────┴─────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐     │\n│  │ Upload   │◀───│ Monitor  │◀───│ Infer    │◀───│ Deploy   │     │\n│  │ (select  │    │ (drift + │    │ (camera  │    │ (K3s /   │     │\n│  │  data)   │    │  perf)   │    │  → model │    │  Balena) │     │\n│  └──────────┘    └──────────┘    │  → action│    └──────────┘     │\n│                                  └──────────┘                      │\n└────────────────────────────────────────────────────────────────────┘"
        },
      ]
    },
  ];
})();
