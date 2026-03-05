// Patches the Case Studies module (m19) with comprehensive code examples.
// Loaded after curriculum.js and lessons.js.
// m19 = CURRICULUM.phases[5].modules[3]
(function patchCaseStudiesExamples() {
  const m = CURRICULUM.phases[5].modules[3];

  m.codeExamples = [

    // ──────────────────────────────────────────────────────────
    // Section 1: YOLOv8 Object Detection Pipeline
    // ──────────────────────────────────────────────────────────
    {
      id: "yolo-detection-pipeline",
      title: "YOLOv8 Object Detection Pipeline",
      icon: "🎯",
      items: [

        // ── 1.1  Training YOLOv8 on Custom Dataset ──
        {
          title: "Train YOLOv8-Nano on Custom Dataset",
          lang: "python",
          filename: "yolo_train_custom.py",
          desc: "Train YOLOv8-nano on a custom YOLO-format dataset with augmentation, freeze backbone, mixed precision, and mAP evaluation. Includes dataset YAML setup and Ultralytics API usage.",
          code: `"""
YOLOv8-Nano custom training pipeline.
Covers: data YAML, augmentation config, backbone freeze,
mixed precision, early stopping, mAP evaluation.
"""
from pathlib import Path
from ultralytics import YOLO


# ── 1. Dataset Configuration ────────────────────────────
# data.yaml expected structure:
# path: /datasets/ppe_detection
# train: images/train
# val: images/val
# test: images/test
# names:
#   0: helmet
#   1: vest
#   2: no_helmet
#   3: no_vest
DATA_YAML = "data.yaml"


# ── 2. Model Init ───────────────────────────────────────
# Start from COCO-pretrained nano (3.2M params, ~6MB)
model = YOLO("yolov8n.pt")

# Inspect architecture
print(f"Parameters: {sum(p.numel() for p in model.model.parameters()):,}")
print(f"GFLOPs:     {model.model.info(verbose=False)[1]:.1f}")


# ── 3. Training ─────────────────────────────────────────
results = model.train(
    data=DATA_YAML,
    epochs=100,
    imgsz=640,
    batch=32,
    device=0,                       # GPU index (or 'cpu')

    # ── Optimization ──
    optimizer="AdamW",
    lr0=1e-3,
    lrf=0.01,                       # Final LR = lr0 * lrf
    weight_decay=5e-4,
    warmup_epochs=3,
    cos_lr=True,                    # Cosine annealing

    # ── Augmentation ──
    hsv_h=0.015,                    # Hue shift
    hsv_s=0.7,                      # Saturation shift
    hsv_v=0.4,                      # Value shift
    degrees=10.0,                   # Rotation
    translate=0.1,
    scale=0.5,
    mosaic=1.0,                     # Mosaic probability
    mixup=0.1,                      # Mixup probability
    copy_paste=0.1,                 # Copy-paste augmentation

    # ── Freeze backbone for first N layers ──
    freeze=10,                      # Freeze first 10 layers

    # ── Callbacks ──
    patience=15,                    # Early stopping patience
    save_period=10,                 # Checkpoint every 10 epochs
    plots=True,                     # Generate training plots
    verbose=True,
)


# ── 4. Evaluate on Test Set ─────────────────────────────
metrics = model.val(data=DATA_YAML, split="test")
print(f"""
Test Results:
  mAP@50     = {metrics.box.map50:.4f}
  mAP@50:95  = {metrics.box.map:.4f}
  Precision  = {metrics.box.mp:.4f}
  Recall     = {metrics.box.mr:.4f}
""")

# Per-class breakdown
for i, name in enumerate(model.names.values()):
    print(f"  {name:12s}  AP@50={metrics.box.ap50[i]:.3f}  "
          f"AP@50:95={metrics.box.ap[i]:.3f}")


# ── 5. Export to TFLite INT8 for Edge ───────────────────
model.export(
    format="tflite",
    int8=True,                      # Post-training INT8 quantization
    imgsz=320,                      # Smaller input for edge
    data=DATA_YAML,                 # Calibration data
)
print(f"Exported: {Path('best_int8.tflite').stat().st_size / 1024:.0f} KB")`
        },

        // ── 1.2  Inference + NMS Variants ──
        {
          title: "Inference with NMS Variants (Standard, Soft, DIoU)",
          lang: "python",
          filename: "yolo_inference_nms.py",
          desc: "Run YOLOv8 inference with configurable NMS strategies: standard NMS, Soft-NMS (Gaussian decay), and DIoU-NMS. Demonstrates how NMS choice affects detection quality on crowded scenes.",
          code: `"""
YOLOv8 inference with NMS variant comparison.
Covers: standard NMS, Soft-NMS, DIoU-NMS, confidence
filtering, class-agnostic NMS, and visualization.
"""
import cv2
import numpy as np
import torch
import torchvision
from ultralytics import YOLO


# ── Standard YOLOv8 Inference ───────────────────────────
model = YOLO("yolov8n.pt")

# Built-in NMS (uses torchvision.ops.nms internally)
results = model.predict(
    "crowded_scene.jpg",
    conf=0.25,                      # Confidence threshold
    iou=0.45,                       # IoU threshold for NMS
    max_det=300,                    # Max detections per image
    agnostic_nms=False,             # Per-class NMS
    verbose=False,
)

# Parse results
boxes = results[0].boxes
print(f"Detections: {len(boxes)}")
for box in boxes:
    x1, y1, x2, y2 = box.xyxy[0].tolist()
    conf = box.conf[0].item()
    cls = int(box.cls[0].item())
    print(f"  [{cls}] ({x1:.0f},{y1:.0f})-({x2:.0f},{y2:.0f}) conf={conf:.3f}")


# ── Custom NMS Implementations ──────────────────────────

def soft_nms_gaussian(boxes_xyxy, scores, sigma=0.5, score_thresh=0.01):
    """
    Soft-NMS with Gaussian penalty (Bodla et al., 2017).
    Instead of hard suppression, decays overlapping scores:
      score_i *= exp(-iou^2 / sigma)
    Preserves more detections in crowded scenes.
    """
    boxes_np = boxes_xyxy.cpu().numpy().copy()
    scores_np = scores.cpu().numpy().copy()
    indices = []

    while len(scores_np) > 0:
        max_idx = scores_np.argmax()
        indices.append(max_idx)

        if len(scores_np) == 1:
            break

        # Compute IoU of max-score box with all others
        max_box = boxes_np[max_idx]
        other_mask = np.ones(len(scores_np), dtype=bool)
        other_mask[max_idx] = False
        other_boxes = boxes_np[other_mask]

        x1 = np.maximum(max_box[0], other_boxes[:, 0])
        y1 = np.maximum(max_box[1], other_boxes[:, 1])
        x2 = np.minimum(max_box[2], other_boxes[:, 2])
        y2 = np.minimum(max_box[3], other_boxes[:, 3])
        inter = np.maximum(0, x2 - x1) * np.maximum(0, y2 - y1)

        area_max = (max_box[2] - max_box[0]) * (max_box[3] - max_box[1])
        area_other = (other_boxes[:, 2] - other_boxes[:, 0]) * \
                     (other_boxes[:, 3] - other_boxes[:, 1])
        iou = inter / (area_max + area_other - inter + 1e-6)

        # Gaussian decay instead of hard suppression
        decay = np.exp(-(iou ** 2) / sigma)
        scores_np = scores_np[other_mask] * decay
        boxes_np = boxes_np[other_mask]

        # Remove low-confidence detections
        keep = scores_np > score_thresh
        scores_np = scores_np[keep]
        boxes_np = boxes_np[keep]

    return indices


def diou_nms(boxes_xyxy, scores, iou_thresh=0.45):
    """
    DIoU-NMS (Zheng et al., 2020).
    Uses Distance-IoU which considers center point distance,
    better separating nearby objects of the same class.
    DIoU = IoU - (center_dist^2 / diagonal^2)
    """
    boxes_np = boxes_xyxy.cpu().numpy()
    scores_np = scores.cpu().numpy()

    x1, y1, x2, y2 = boxes_np[:, 0], boxes_np[:, 1], boxes_np[:, 2], boxes_np[:, 3]
    areas = (x2 - x1) * (y2 - y1)
    cx = (x1 + x2) / 2
    cy = (y1 + y2) / 2

    order = scores_np.argsort()[::-1]
    keep = []

    while len(order) > 0:
        i = order[0]
        keep.append(i)
        if len(order) == 1:
            break

        rest = order[1:]

        # Standard IoU
        xx1 = np.maximum(x1[i], x1[rest])
        yy1 = np.maximum(y1[i], y1[rest])
        xx2 = np.minimum(x2[i], x2[rest])
        yy2 = np.minimum(y2[i], y2[rest])
        inter = np.maximum(0, xx2 - xx1) * np.maximum(0, yy2 - yy1)
        iou = inter / (areas[i] + areas[rest] - inter + 1e-6)

        # Enclosing box diagonal
        enc_x1 = np.minimum(x1[i], x1[rest])
        enc_y1 = np.minimum(y1[i], y1[rest])
        enc_x2 = np.maximum(x2[i], x2[rest])
        enc_y2 = np.maximum(y2[i], y2[rest])
        diag_sq = (enc_x2 - enc_x1) ** 2 + (enc_y2 - enc_y1) ** 2 + 1e-6

        # Center distance
        center_dist_sq = (cx[i] - cx[rest]) ** 2 + (cy[i] - cy[rest]) ** 2

        # DIoU = IoU - center_dist^2 / diag^2
        diou = iou - center_dist_sq / diag_sq

        order = rest[diou <= iou_thresh]

    return keep


# ── Compare NMS Strategies ──────────────────────────────
raw_boxes = results[0].boxes.xyxy
raw_scores = results[0].boxes.conf

# Standard (torchvision)
keep_std = torchvision.ops.nms(raw_boxes, raw_scores, 0.45)
print(f"Standard NMS:  {len(keep_std)} detections")

# Soft-NMS
keep_soft = soft_nms_gaussian(raw_boxes, raw_scores, sigma=0.5)
print(f"Soft-NMS:      {len(keep_soft)} detections")

# DIoU-NMS
keep_diou = diou_nms(raw_boxes, raw_scores, iou_thresh=0.45)
print(f"DIoU-NMS:      {len(keep_diou)} detections")

# Visualize side-by-side
img = cv2.imread("crowded_scene.jpg")
for name, indices in [("Standard", keep_std), ("Soft", keep_soft), ("DIoU", keep_diou)]:
    vis = img.copy()
    for idx in indices:
        b = raw_boxes[idx].int().tolist()
        cv2.rectangle(vis, (b[0], b[1]), (b[2], b[3]), (0, 255, 0), 2)
    cv2.imwrite(f"nms_{name.lower()}.jpg", vis)
    print(f"  Saved nms_{name.lower()}.jpg")`
        },

        // ── 1.3  mAP Evaluation from Scratch ──
        {
          title: "mAP Evaluation from Scratch (mAP@50:95)",
          lang: "python",
          filename: "map_evaluation.py",
          desc: "Compute mAP@50, mAP@50:95, per-class AP, precision-recall curves, and confusion matrix from scratch. Explains the COCO evaluation protocol step by step.",
          code: `"""
mAP evaluation from scratch — COCO-style.
Covers: IoU matching, precision-recall curves, AP via
101-point interpolation, mAP@50, mAP@50:95.
"""
import numpy as np
from collections import defaultdict


def compute_iou_matrix(pred_boxes, gt_boxes):
    """Compute pairwise IoU between prediction and GT boxes.
    Both inputs: Nx4 arrays in [x1, y1, x2, y2] format.
    """
    x1 = np.maximum(pred_boxes[:, None, 0], gt_boxes[None, :, 0])
    y1 = np.maximum(pred_boxes[:, None, 1], gt_boxes[None, :, 1])
    x2 = np.minimum(pred_boxes[:, None, 2], gt_boxes[None, :, 2])
    y2 = np.minimum(pred_boxes[:, None, 3], gt_boxes[None, :, 3])

    inter = np.maximum(0, x2 - x1) * np.maximum(0, y2 - y1)
    area_pred = (pred_boxes[:, 2] - pred_boxes[:, 0]) * (pred_boxes[:, 3] - pred_boxes[:, 1])
    area_gt = (gt_boxes[:, 2] - gt_boxes[:, 0]) * (gt_boxes[:, 3] - gt_boxes[:, 1])

    union = area_pred[:, None] + area_gt[None, :] - inter
    return inter / (union + 1e-6)


def compute_ap_single_class(predictions, ground_truths, iou_threshold=0.5):
    """
    Compute AP for a single class at a given IoU threshold.

    predictions: list of (image_id, confidence, [x1,y1,x2,y2])
    ground_truths: dict of image_id -> list of [x1,y1,x2,y2]

    Returns: AP (float), precision array, recall array
    """
    # Sort predictions by confidence (descending)
    preds_sorted = sorted(predictions, key=lambda x: x[1], reverse=True)

    # Count total GT boxes
    n_gt = sum(len(boxes) for boxes in ground_truths.values())
    if n_gt == 0:
        return 0.0, np.array([]), np.array([])

    # Track which GT boxes have been matched
    matched = {img_id: np.zeros(len(boxes), dtype=bool)
               for img_id, boxes in ground_truths.items()}

    tp = np.zeros(len(preds_sorted))
    fp = np.zeros(len(preds_sorted))

    for i, (img_id, conf, pred_box) in enumerate(preds_sorted):
        gt_boxes = ground_truths.get(img_id, [])

        if len(gt_boxes) == 0:
            fp[i] = 1
            continue

        # Compute IoU with all GT boxes in this image
        pred_arr = np.array([pred_box])
        gt_arr = np.array(gt_boxes)
        ious = compute_iou_matrix(pred_arr, gt_arr)[0]  # 1D: IoU with each GT

        best_gt_idx = ious.argmax()
        best_iou = ious[best_gt_idx]

        if best_iou >= iou_threshold and not matched[img_id][best_gt_idx]:
            tp[i] = 1
            matched[img_id][best_gt_idx] = True
        else:
            fp[i] = 1

    # Cumulative sums
    tp_cumsum = np.cumsum(tp)
    fp_cumsum = np.cumsum(fp)

    precision = tp_cumsum / (tp_cumsum + fp_cumsum + 1e-6)
    recall = tp_cumsum / n_gt

    # 101-point interpolation (COCO style)
    recall_levels = np.linspace(0, 1, 101)
    interp_precision = np.zeros_like(recall_levels)
    for j, r in enumerate(recall_levels):
        prec_at_r = precision[recall >= r]
        interp_precision[j] = prec_at_r.max() if len(prec_at_r) > 0 else 0.0

    ap = interp_precision.mean()
    return ap, precision, recall


def compute_map(all_predictions, all_ground_truths, class_names):
    """
    Compute mAP@50 and mAP@50:95 across all classes.

    all_predictions: dict of class_id -> list of (img_id, conf, box)
    all_ground_truths: dict of class_id -> dict of img_id -> list of boxes
    """
    iou_thresholds = np.arange(0.5, 1.0, 0.05)  # [0.50, 0.55, ..., 0.95]

    print(f"{'Class':>15s}  {'AP@50':>7s}  {'AP@50:95':>9s}")
    print("-" * 40)

    all_ap50 = []
    all_ap = []

    for cls_id, cls_name in enumerate(class_names):
        preds = all_predictions.get(cls_id, [])
        gts = all_ground_truths.get(cls_id, {})

        # AP@50
        ap50, _, _ = compute_ap_single_class(preds, gts, 0.5)

        # AP@50:95 — average over 10 IoU thresholds
        ap_per_iou = []
        for iou_t in iou_thresholds:
            ap_t, _, _ = compute_ap_single_class(preds, gts, iou_t)
            ap_per_iou.append(ap_t)
        ap_avg = np.mean(ap_per_iou)

        all_ap50.append(ap50)
        all_ap.append(ap_avg)
        print(f"{cls_name:>15s}  {ap50:7.4f}  {ap_avg:9.4f}")

    map50 = np.mean(all_ap50)
    map_avg = np.mean(all_ap)
    print("-" * 40)
    print(f"{'mAP':>15s}  {map50:7.4f}  {map_avg:9.4f}")

    return map50, map_avg


# ── Example Usage ───────────────────────────────────────
if __name__ == "__main__":
    # Simulated predictions and ground truths for demo
    class_names = ["helmet", "vest", "no_helmet", "no_vest"]

    # predictions[cls_id] = [(img_id, confidence, [x1,y1,x2,y2]), ...]
    predictions = {
        0: [("img1", 0.95, [100, 100, 200, 200]),
            ("img1", 0.80, [110, 105, 205, 195]),
            ("img2", 0.70, [50, 50, 150, 150])],
        1: [("img1", 0.90, [300, 300, 400, 500])],
    }

    # ground_truths[cls_id] = {img_id: [[x1,y1,x2,y2], ...]}
    ground_truths = {
        0: {"img1": [[105, 100, 200, 200]],
            "img2": [[55, 45, 155, 145]]},
        1: {"img1": [[295, 300, 405, 500]]},
    }

    compute_map(predictions, ground_truths, class_names)`
        },
      ]
    },

    // ──────────────────────────────────────────────────────────
    // Section 2: OCR Pipeline (Detection + Recognition)
    // ──────────────────────────────────────────────────────────
    {
      id: "ocr-pipeline",
      title: "OCR Pipeline: Detection + Recognition",
      icon: "📝",
      items: [

        // ── 2.1  Text Detection + Recognition Pipeline ──
        {
          title: "End-to-End OCR with PaddleOCR",
          lang: "python",
          filename: "paddleocr_pipeline.py",
          desc: "Complete OCR pipeline using PaddleOCR: text detection (DBNet), direction classification, text recognition (CRNN+CTC), with preprocessing, confidence filtering, and structured output.",
          code: `"""
End-to-end OCR pipeline with PaddleOCR.
Covers: detection (DBNet), direction classification,
recognition (CRNN+CTC), preprocessing, structured output.
"""
import cv2
import numpy as np
from paddleocr import PaddleOCR


# ── 1. Initialize PaddleOCR ─────────────────────────────
# det_model_dir: DBNet++ (detection)
# rec_model_dir: SVTR-LCNet (recognition)
# cls_model_dir: text direction classifier
ocr = PaddleOCR(
    use_angle_cls=True,             # Enable text direction classification
    lang="en",                      # Language model
    use_gpu=False,                  # CPU mode for edge
    det_db_thresh=0.3,              # Detection binarization threshold
    det_db_box_thresh=0.5,          # Detection box confidence threshold
    det_db_unclip_ratio=1.6,        # Unclip ratio for text region expansion
    rec_batch_num=16,               # Recognition batch size
    drop_score=0.5,                 # Min recognition confidence
    show_log=False,
)


# ── 2. Preprocessing for Better OCR ─────────────────────
def preprocess_for_ocr(image):
    """Apply preprocessing to improve OCR accuracy."""
    # Convert to grayscale
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # Denoise
    denoised = cv2.fastNlMeansDenoising(gray, h=10)

    # CLAHE for contrast enhancement
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(denoised)

    # Binarization (Sauvola-like adaptive threshold)
    binary = cv2.adaptiveThreshold(
        enhanced, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        blockSize=15,
        C=8,
    )

    # Convert back to 3-channel (PaddleOCR expects BGR)
    return cv2.cvtColor(binary, cv2.COLOR_GRAY2BGR)


# ── 3. Run OCR ──────────────────────────────────────────
img = cv2.imread("receipt.jpg")

# Run on original
results_raw = ocr.ocr(img, cls=True)

# Run on preprocessed
img_prep = preprocess_for_ocr(img)
results_prep = ocr.ocr(img_prep, cls=True)


# ── 4. Parse and Structure Results ──────────────────────
def parse_ocr_results(results, min_confidence=0.7):
    """Parse PaddleOCR output into structured format."""
    lines = []
    for page in results:
        if page is None:
            continue
        for detection in page:
            bbox = detection[0]         # [[x1,y1],[x2,y2],[x3,y3],[x4,y4]]
            text = detection[1][0]      # Recognized text
            conf = detection[1][1]      # Confidence score

            if conf < min_confidence:
                continue

            # Compute bounding box center for sorting
            cx = sum(p[0] for p in bbox) / 4
            cy = sum(p[1] for p in bbox) / 4

            lines.append({
                "text": text,
                "confidence": round(conf, 4),
                "bbox": bbox,
                "center": (cx, cy),
            })

    # Sort by Y (top-to-bottom), then X (left-to-right)
    lines.sort(key=lambda l: (l["center"][1], l["center"][0]))
    return lines


parsed = parse_ocr_results(results_raw)
print(f"Detected {len(parsed)} text regions:")
for line in parsed:
    print(f"  [{line['confidence']:.2f}] {line['text']}")


# ── 5. Visualization ────────────────────────────────────
vis = img.copy()
for line in parsed:
    pts = np.array(line["bbox"], dtype=np.int32)
    cv2.polylines(vis, [pts], True, (0, 255, 0), 2)
    cv2.putText(vis, line["text"][:30], tuple(pts[0]),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 1)

cv2.imwrite("ocr_annotated.jpg", vis)
print("Saved ocr_annotated.jpg")`
        },

        // ── 2.2  Tesseract with OpenCV Preprocessing ──
        {
          title: "Tesseract OCR with OpenCV Preprocessing",
          lang: "python",
          filename: "tesseract_pipeline.py",
          desc: "OCR pipeline using Tesseract with extensive OpenCV preprocessing: deskew, noise removal, thresholding, and morphological cleanup. Includes PSM mode selection and confidence-based filtering.",
          code: `"""
Tesseract OCR pipeline with OpenCV preprocessing.
Covers: deskewing, denoising, adaptive thresholding,
morphological cleanup, PSM modes, confidence filtering.
"""
import cv2
import numpy as np
import pytesseract
from pytesseract import Output


# ── 1. Image Preprocessing Pipeline ─────────────────────
def deskew_image(gray):
    """Correct text skew using minimum area rectangle."""
    coords = np.column_stack(np.where(gray < 128))
    if len(coords) < 50:
        return gray

    rect = cv2.minAreaRect(coords)
    angle = rect[-1]

    # Adjust angle
    if angle < -45:
        angle = -(90 + angle)
    else:
        angle = -angle

    if abs(angle) < 0.5:           # Skip tiny corrections
        return gray

    h, w = gray.shape
    center = (w // 2, h // 2)
    M = cv2.getRotationMatrix2D(center, angle, 1.0)
    rotated = cv2.warpAffine(
        gray, M, (w, h),
        flags=cv2.INTER_CUBIC,
        borderMode=cv2.BORDER_REPLICATE,
    )
    print(f"  Deskewed by {angle:.2f} degrees")
    return rotated


def preprocess_pipeline(image):
    """Full preprocessing chain for Tesseract."""
    # Step 1: Grayscale
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # Step 2: Resize (Tesseract works best at ~300 DPI)
    scale = max(1.0, 2000 / max(gray.shape))
    if scale > 1.0:
        gray = cv2.resize(gray, None, fx=scale, fy=scale,
                         interpolation=cv2.INTER_CUBIC)

    # Step 3: Denoise
    gray = cv2.fastNlMeansDenoising(gray, h=10)

    # Step 4: Deskew
    gray = deskew_image(gray)

    # Step 5: Adaptive thresholding
    binary = cv2.adaptiveThreshold(
        gray, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        blockSize=21,
        C=10,
    )

    # Step 6: Morphological cleanup (remove noise specks)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
    binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel)

    return binary


# ── 2. Tesseract Configuration ──────────────────────────
# PSM modes (Page Segmentation Mode):
#  3  = Fully automatic page segmentation (default)
#  4  = Assume a single column of variable-size text
#  6  = Assume a single uniform block of text
#  7  = Treat image as a single text line
#  8  = Treat image as a single word
#  11 = Sparse text. Find as much text as possible
#  13 = Raw line. Treat image as a single text line (no OSD)

TESSERACT_CONFIG = "--oem 3 --psm 6"
# OEM modes:
#  0 = Legacy engine only
#  1 = Neural net LSTM only
#  2 = Legacy + LSTM
#  3 = Default, auto-select


# ── 3. OCR Execution ────────────────────────────────────
img = cv2.imread("document.jpg")
processed = preprocess_pipeline(img)

# Method 1: Simple text extraction
text = pytesseract.image_to_string(processed, config=TESSERACT_CONFIG)
print("=== Raw Text ===")
print(text)

# Method 2: Word-level data with confidence
data = pytesseract.image_to_data(
    processed,
    config=TESSERACT_CONFIG,
    output_type=Output.DICT,
)


# ── 4. Confidence-Based Filtering ───────────────────────
MIN_CONFIDENCE = 60

high_conf_words = []
for i, conf in enumerate(data["conf"]):
    if int(conf) >= MIN_CONFIDENCE and data["text"][i].strip():
        high_conf_words.append({
            "text": data["text"][i],
            "conf": int(conf),
            "bbox": (data["left"][i], data["top"][i],
                     data["width"][i], data["height"][i]),
            "line": data["line_num"][i],
            "block": data["block_num"][i],
        })

# Group by line
from itertools import groupby
lines = []
for _, group in groupby(high_conf_words, key=lambda w: (w["block"], w["line"])):
    words = list(group)
    line_text = " ".join(w["text"] for w in words)
    avg_conf = np.mean([w["conf"] for w in words])
    lines.append({"text": line_text, "avg_conf": avg_conf})

print(f"\\n=== Filtered Lines (conf >= {MIN_CONFIDENCE}) ===")
for line in lines:
    print(f"  [{line['avg_conf']:.0f}%] {line['text']}")`
        },

        // ── 2.3  License Plate OCR Pipeline ──
        {
          title: "License Plate Detection + OCR Pipeline",
          lang: "python",
          filename: "license_plate_ocr.py",
          desc: "End-to-end license plate reader: YOLO detection, perspective correction, OCR with regex validation, and latency benchmarking. Targets <200ms total pipeline latency.",
          code: `"""
End-to-end license plate reader.
Pipeline: Camera → YOLO Detection → Crop → Perspective
Correction → OCR → Regex Validation → Output.
Target: <200ms total latency on CPU.
"""
import re
import time
import cv2
import numpy as np
from ultralytics import YOLO
import pytesseract


# ── 1. Load Models ──────────────────────────────────────
# YOLOv8 trained on license plate dataset
plate_detector = YOLO("yolov8n_plates.pt")

# License plate regex patterns (configurable per region)
PLATE_PATTERNS = [
    r"^[A-Z]{2,3}\\s?\\d{1,4}\\s?[A-Z]{0,3}$",    # US-style
    r"^[A-Z]{2}\\d{2}\\s?[A-Z]{3}$",                # UK-style
    r"^\\d{1,4}\\s?[A-Z]{2,3}\\s?\\d{1,4}$",        # EU-style
]


# ── 2. Plate Detection ─────────────────────────────────
def detect_plates(frame, conf_thresh=0.5):
    """Detect license plates in frame, return crops."""
    results = plate_detector.predict(
        frame, conf=conf_thresh, verbose=False,
    )
    plates = []
    for box in results[0].boxes:
        x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
        conf = box.conf[0].item()
        # Add margin (10%) for better OCR
        h, w = frame.shape[:2]
        mx = int((x2 - x1) * 0.1)
        my = int((y2 - y1) * 0.1)
        x1, y1 = max(0, x1 - mx), max(0, y1 - my)
        x2, y2 = min(w, x2 + mx), min(h, y2 + my)
        crop = frame[y1:y2, x1:x2]
        plates.append({"crop": crop, "bbox": (x1, y1, x2, y2), "conf": conf})
    return plates


# ── 3. Plate Preprocessing ─────────────────────────────
def preprocess_plate(crop):
    """Preprocess plate crop for OCR."""
    # Resize to standard height
    target_h = 64
    scale = target_h / crop.shape[0]
    resized = cv2.resize(crop, None, fx=scale, fy=scale,
                        interpolation=cv2.INTER_CUBIC)

    # Grayscale
    gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)

    # CLAHE contrast enhancement
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)

    # Otsu binarization (works well for high-contrast plates)
    _, binary = cv2.threshold(
        enhanced, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU,
    )

    # Morphological cleanup
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    cleaned = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)

    return cleaned


# ── 4. OCR + Validation ─────────────────────────────────
def read_plate(crop):
    """OCR the plate crop and validate with regex."""
    processed = preprocess_plate(crop)

    # Tesseract with plate-optimized config
    config = "--oem 3 --psm 7 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    text = pytesseract.image_to_string(processed, config=config).strip()

    # Clean common OCR errors
    text = text.replace("O", "0").replace("I", "1").replace(" ", "")
    # Re-insert letter 'O' where context suggests (e.g., after letters)
    # This is heuristic — production systems use a learned correction model

    # Validate against known patterns
    for pattern in PLATE_PATTERNS:
        if re.match(pattern, text):
            return text, True   # Valid plate

    return text, False          # Raw OCR output, unvalidated


# ── 5. Full Pipeline with Benchmarking ──────────────────
def process_frame(frame):
    """Full pipeline: detect → crop → preprocess → OCR → validate."""
    t0 = time.perf_counter()

    plates = detect_plates(frame)
    t_det = time.perf_counter()

    results = []
    for plate in plates:
        text, valid = read_plate(plate["crop"])
        results.append({
            "text": text,
            "valid": valid,
            "det_conf": plate["conf"],
            "bbox": plate["bbox"],
        })

    t_ocr = time.perf_counter()

    print(f"Detection: {(t_det - t0)*1000:.1f}ms | "
          f"OCR: {(t_ocr - t_det)*1000:.1f}ms | "
          f"Total: {(t_ocr - t0)*1000:.1f}ms | "
          f"Plates: {len(results)}")

    return results


# ── 6. Camera Loop ──────────────────────────────────────
if __name__ == "__main__":
    cap = cv2.VideoCapture(0)

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        results = process_frame(frame)

        # Annotate frame
        for r in results:
            x1, y1, x2, y2 = r["bbox"]
            color = (0, 255, 0) if r["valid"] else (0, 165, 255)
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
            label = f"{r['text']} ({r['det_conf']:.2f})"
            cv2.putText(frame, label, (x1, y1 - 10),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)

        cv2.imshow("License Plate Reader", frame)
        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    cap.release()
    cv2.destroyAllWindows()`
        },
      ]
    },

    // ──────────────────────────────────────────────────────────
    // Section 3: Classical CV with OpenCV
    // ──────────────────────────────────────────────────────────
    {
      id: "classical-cv-opencv",
      title: "Classical CV with OpenCV",
      icon: "🔬",
      items: [

        // ── 3.1  Document Scanner ──
        {
          title: "Document Scanner: Edge Detection + Perspective Transform",
          lang: "python",
          filename: "document_scanner.py",
          desc: "Mobile-style document scanner using pure OpenCV: Canny edge detection, contour finding, 4-point perspective transform, and adaptive thresholding for clean output.",
          code: `"""
Document scanner — pure OpenCV, no DNN.
Pipeline: Resize → Blur → Canny → Contours →
4-Point Transform → Adaptive Threshold → Output.
"""
import cv2
import numpy as np


def order_points(pts):
    """Order 4 points as [top-left, top-right, bottom-right, bottom-left].
    Uses sum and difference heuristics.
    """
    rect = np.zeros((4, 2), dtype=np.float32)
    s = pts.sum(axis=1)
    d = np.diff(pts, axis=1)
    rect[0] = pts[s.argmin()]       # Top-left: smallest sum
    rect[2] = pts[s.argmax()]       # Bottom-right: largest sum
    rect[1] = pts[d.argmin()]       # Top-right: smallest difference
    rect[3] = pts[d.argmax()]       # Bottom-left: largest difference
    return rect


def four_point_transform(image, pts):
    """Apply perspective transform to extract document region."""
    rect = order_points(pts)
    tl, tr, br, bl = rect

    # Compute output dimensions
    width_top = np.linalg.norm(tr - tl)
    width_bot = np.linalg.norm(br - bl)
    max_w = int(max(width_top, width_bot))

    height_left = np.linalg.norm(bl - tl)
    height_right = np.linalg.norm(br - tr)
    max_h = int(max(height_left, height_right))

    # Destination points
    dst = np.array([
        [0, 0],
        [max_w - 1, 0],
        [max_w - 1, max_h - 1],
        [0, max_h - 1],
    ], dtype=np.float32)

    M = cv2.getPerspectiveTransform(rect, dst)
    warped = cv2.warpPerspective(image, M, (max_w, max_h))
    return warped


def find_document_contour(image):
    """Find the largest 4-point contour (document boundary)."""
    # Resize for faster processing
    ratio = image.shape[0] / 500.0
    resized = cv2.resize(image, (int(image.shape[1] / ratio), 500))

    # Preprocessing
    gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edged = cv2.Canny(blurred, 50, 200)

    # Dilate to close gaps in edges
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    edged = cv2.dilate(edged, kernel, iterations=1)

    # Find contours
    contours, _ = cv2.findContours(
        edged, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE,
    )

    # Sort by area (largest first)
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
    return doc_contour.reshape(4, 2) * ratio


def scan_document(image_path, output_path="scanned.jpg"):
    """Full document scanning pipeline."""
    image = cv2.imread(image_path)

    # Step 1: Find document contour
    doc_pts = find_document_contour(image)

    # Step 2: Perspective transform
    warped = four_point_transform(image, doc_pts)

    # Step 3: Convert to clean B&W
    gray = cv2.cvtColor(warped, cv2.COLOR_BGR2GRAY)

    # Adaptive threshold — produces clean document-like output
    cleaned = cv2.adaptiveThreshold(
        gray, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        blockSize=21,
        C=10,
    )

    # Step 4: Optional sharpening
    kernel = np.array([[-1, -1, -1],
                       [-1,  9, -1],
                       [-1, -1, -1]])
    sharpened = cv2.filter2D(cleaned, -1, kernel)

    cv2.imwrite(output_path, sharpened)
    print(f"Scanned document saved: {output_path}")
    print(f"  Original: {image.shape[1]}x{image.shape[0]}")
    print(f"  Scanned:  {sharpened.shape[1]}x{sharpened.shape[0]}")

    return sharpened


# ── Run ─────────────────────────────────────────────────
scanned = scan_document("photo_of_document.jpg")`
        },

        // ── 3.2  Feature Matching (ORB) + Barcode/QR ──
        {
          title: "Feature Matching (ORB) + Barcode/QR Scanning",
          lang: "python",
          filename: "feature_matching_barcode.py",
          desc: "ORB feature matching for template-based object detection, plus ZBar-based barcode/QR scanning with real-time camera pipeline. Covers homography estimation and RANSAC.",
          code: `"""
Feature matching (ORB) and barcode/QR scanning.
Covers: ORB keypoints, BFMatcher, homography with RANSAC,
ZBar barcode decoding, real-time camera pipeline.
"""
import cv2
import numpy as np
from pyzbar import pyzbar


# ═══════════════════════════════════════════════════════════
# Part 1: ORB Feature Matching
# ═══════════════════════════════════════════════════════════

def match_template_orb(template_path, scene_path, min_matches=10):
    """
    Find a template object in a scene using ORB feature matching.
    Uses BFMatcher + homography with RANSAC for robust detection.
    """
    template = cv2.imread(template_path, cv2.IMREAD_GRAYSCALE)
    scene = cv2.imread(scene_path, cv2.IMREAD_GRAYSCALE)

    # ── 1. Detect ORB keypoints ─────────────────────────
    orb = cv2.ORB_create(
        nfeatures=1000,             # Max keypoints
        scaleFactor=1.2,            # Pyramid scale factor
        nlevels=8,                  # Pyramid levels
        edgeThreshold=15,
        patchSize=31,
        fastThreshold=20,
    )

    kp1, des1 = orb.detectAndCompute(template, None)
    kp2, des2 = orb.detectAndCompute(scene, None)
    print(f"Template keypoints: {len(kp1)}")
    print(f"Scene keypoints:    {len(kp2)}")

    # ── 2. Match features ───────────────────────────────
    bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=False)
    matches = bf.knnMatch(des1, des2, k=2)

    # Lowe's ratio test — reject ambiguous matches
    good = []
    for m, n in matches:
        if m.distance < 0.75 * n.distance:
            good.append(m)

    print(f"Good matches:       {len(good)} / {len(matches)}")

    if len(good) < min_matches:
        print("Not enough matches — object not found")
        return None

    # ── 3. Compute homography ───────────────────────────
    src_pts = np.float32([kp1[m.queryIdx].pt for m in good]).reshape(-1, 1, 2)
    dst_pts = np.float32([kp2[m.trainIdx].pt for m in good]).reshape(-1, 1, 2)

    H, mask = cv2.findHomography(src_pts, dst_pts, cv2.RANSAC, 5.0)
    inliers = mask.ravel().sum()
    print(f"RANSAC inliers:     {inliers} / {len(good)}")

    # ── 4. Draw detection boundary ──────────────────────
    h, w = template.shape
    corners = np.float32([[0, 0], [w, 0], [w, h], [0, h]]).reshape(-1, 1, 2)
    transformed = cv2.perspectiveTransform(corners, H)

    scene_color = cv2.cvtColor(scene, cv2.COLOR_GRAY2BGR)
    cv2.polylines(scene_color, [np.int32(transformed)], True, (0, 255, 0), 3)

    cv2.imwrite("orb_match_result.jpg", scene_color)
    print("Saved orb_match_result.jpg")
    return transformed


# ═══════════════════════════════════════════════════════════
# Part 2: Barcode & QR Code Scanning
# ═══════════════════════════════════════════════════════════

def decode_barcodes(image):
    """Decode all barcodes and QR codes in an image using ZBar."""
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image

    # Sharpen for better barcode reading
    sharpened = cv2.filter2D(gray, -1, np.array([[-1,-1,-1],[-1,9,-1],[-1,-1,-1]]))

    decoded = pyzbar.decode(sharpened)
    results = []

    for obj in decoded:
        data = obj.data.decode("utf-8")
        barcode_type = obj.type          # QR, EAN13, CODE128, etc.
        points = obj.polygon             # Corner points
        rect = obj.rect                  # Bounding rect (x, y, w, h)

        results.append({
            "data": data,
            "type": barcode_type,
            "rect": (rect.left, rect.top, rect.width, rect.height),
            "polygon": [(p.x, p.y) for p in points],
        })

    return results


def realtime_barcode_scanner():
    """Real-time barcode/QR scanner from camera."""
    cap = cv2.VideoCapture(0)
    seen = set()                         # Track already-scanned codes

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        codes = decode_barcodes(frame)

        for code in codes:
            x, y, w, h = code["rect"]
            color = (0, 255, 0) if code["data"] in seen else (0, 165, 255)

            cv2.rectangle(frame, (x, y), (x + w, y + h), color, 2)
            label = f"{code['type']}: {code['data'][:40]}"
            cv2.putText(frame, label, (x, y - 10),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

            if code["data"] not in seen:
                seen.add(code["data"])
                print(f"[NEW] {code['type']}: {code['data']}")

        cv2.imshow("Barcode Scanner", frame)
        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    cap.release()
    cv2.destroyAllWindows()
    print(f"Total unique codes scanned: {len(seen)}")


# ── Demo ────────────────────────────────────────────────
if __name__ == "__main__":
    # Feature matching
    match_template_orb("template.jpg", "scene.jpg")

    # Barcode scanning (single image)
    img = cv2.imread("barcodes.jpg")
    codes = decode_barcodes(img)
    for c in codes:
        print(f"  {c['type']:10s} → {c['data']}")`
        },

        // ── 3.3  Lane Detection (Classical + Deep Learning) ──
        {
          title: "Lane Detection: Classical Hough vs Deep Learning",
          lang: "python",
          filename: "lane_detection.py",
          desc: "Compare classical lane detection (Canny + Hough Transform + ROI masking) against a simplified deep learning approach. Includes polynomial fitting and lane overlay visualization.",
          code: `"""
Lane detection: Classical (Canny + Hough) vs DNN.
Covers: ROI masking, Hough line detection, polynomial
lane fitting, and deep learning comparison.
"""
import cv2
import numpy as np


# ═══════════════════════════════════════════════════════════
# Classical Lane Detection Pipeline
# ═══════════════════════════════════════════════════════════

def region_of_interest(edges, vertices):
    """Apply ROI mask to keep only the road area."""
    mask = np.zeros_like(edges)
    cv2.fillPoly(mask, vertices, 255)
    return cv2.bitwise_and(edges, mask)


def classify_lines(lines, img_center_x):
    """Separate detected lines into left and right lanes."""
    left_lines = []
    right_lines = []

    for line in lines:
        x1, y1, x2, y2 = line[0]

        if x2 == x1:
            continue

        slope = (y2 - y1) / (x2 - x1)

        # Filter by slope magnitude (reject near-horizontal lines)
        if abs(slope) < 0.5:
            continue

        if slope < 0 and x1 < img_center_x:
            left_lines.append((x1, y1, x2, y2))
        elif slope > 0 and x1 > img_center_x:
            right_lines.append((x1, y1, x2, y2))

    return left_lines, right_lines


def fit_lane_polynomial(lines, img_height, y_start_ratio=0.6):
    """Fit a 1st-degree polynomial to lane line segments."""
    if not lines:
        return None

    xs, ys = [], []
    for x1, y1, x2, y2 in lines:
        xs.extend([x1, x2])
        ys.extend([y1, y2])

    if len(xs) < 2:
        return None

    # Fit line: x = f(y) (since lanes are more vertical)
    coeffs = np.polyfit(ys, xs, deg=1)
    poly = np.poly1d(coeffs)

    y_top = int(img_height * y_start_ratio)
    y_bot = img_height

    x_top = int(poly(y_top))
    x_bot = int(poly(y_bot))

    return (x_top, y_top, x_bot, y_bot)


def detect_lanes_classical(frame):
    """
    Classical lane detection pipeline:
    1. Grayscale + Gaussian blur
    2. Canny edge detection
    3. ROI masking
    4. Hough line transform
    5. Line classification + polynomial fit
    """
    h, w = frame.shape[:2]

    # Step 1: Preprocessing
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)

    # Step 2: Edge detection
    edges = cv2.Canny(blurred, 50, 150)

    # Step 3: ROI — trapezoidal region covering the road
    roi_vertices = np.array([[
        (int(w * 0.1), h),           # Bottom-left
        (int(w * 0.45), int(h * 0.6)),  # Top-left
        (int(w * 0.55), int(h * 0.6)),  # Top-right
        (int(w * 0.9), h),           # Bottom-right
    ]], dtype=np.int32)

    masked = region_of_interest(edges, roi_vertices)

    # Step 4: Hough transform
    lines = cv2.HoughLinesP(
        masked,
        rho=2,                       # Distance resolution (pixels)
        theta=np.pi / 180,          # Angle resolution (radians)
        threshold=50,                # Min votes
        minLineLength=40,            # Min line length
        maxLineGap=150,              # Max gap between segments
    )

    if lines is None:
        return frame, None, None

    # Step 5: Classify and fit
    left_lines, right_lines = classify_lines(lines, w // 2)
    left_lane = fit_lane_polynomial(left_lines, h)
    right_lane = fit_lane_polynomial(right_lines, h)

    # Visualize
    overlay = frame.copy()
    if left_lane:
        cv2.line(overlay, (left_lane[0], left_lane[1]),
                (left_lane[2], left_lane[3]), (0, 255, 0), 5)
    if right_lane:
        cv2.line(overlay, (right_lane[0], right_lane[1]),
                (right_lane[2], right_lane[3]), (0, 255, 0), 5)

    # Fill lane area
    if left_lane and right_lane:
        pts = np.array([
            [left_lane[0], left_lane[1]],
            [right_lane[0], right_lane[1]],
            [right_lane[2], right_lane[3]],
            [left_lane[2], left_lane[3]],
        ], dtype=np.int32)
        cv2.fillPoly(overlay, [pts], (0, 255, 0))
        result = cv2.addWeighted(frame, 0.7, overlay, 0.3, 0)
    else:
        result = overlay

    return result, left_lane, right_lane


# ── Process Video ───────────────────────────────────────
cap = cv2.VideoCapture("road_video.mp4")
while cap.isOpened():
    ret, frame = cap.read()
    if not ret:
        break

    result, left, right = detect_lanes_classical(frame)
    cv2.imshow("Lane Detection", result)
    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

cap.release()
cv2.destroyAllWindows()`
        },
      ]
    },

    // ──────────────────────────────────────────────────────────
    // Section 4: Defect Detection in Manufacturing
    // ──────────────────────────────────────────────────────────
    {
      id: "defect-detection",
      title: "Defect Detection in Manufacturing",
      icon: "🏭",
      items: [

        // ── 4.1  Template Matching + Anomaly Detection ──
        {
          title: "Template Matching + Anomaly Detection Pipeline",
          lang: "python",
          filename: "defect_detection.py",
          desc: "Manufacturing defect detection combining template matching (golden reference comparison), SSIM-based anomaly scoring, and autoencoder anomaly detection. Includes visualization of defect heatmaps.",
          code: `"""
Defect detection for manufacturing inspection.
Covers: template matching, SSIM-based comparison,
autoencoder anomaly detection, defect heatmaps.
"""
import cv2
import numpy as np
from skimage.metrics import structural_similarity as ssim
import torch
import torch.nn as nn


# ═══════════════════════════════════════════════════════════
# Method 1: Golden Reference + SSIM
# ═══════════════════════════════════════════════════════════

def detect_defects_ssim(reference_path, test_path, threshold=0.85):
    """
    Compare test image against golden reference using SSIM.
    Returns defect mask highlighting differences.
    """
    ref = cv2.imread(reference_path, cv2.IMREAD_GRAYSCALE)
    test = cv2.imread(test_path, cv2.IMREAD_GRAYSCALE)

    # Ensure same size
    test = cv2.resize(test, (ref.shape[1], ref.shape[0]))

    # Align using ORB + homography (handles slight misalignment)
    ref_aligned, test_aligned = align_images(ref, test)

    # Compute SSIM with full map
    score, diff_map = ssim(ref_aligned, test_aligned, full=True)
    diff_map = (diff_map * 255).astype(np.uint8)

    print(f"SSIM Score: {score:.4f} (threshold: {threshold})")
    print(f"Status: {'PASS' if score >= threshold else 'DEFECT DETECTED'}")

    # Threshold the difference map to find defect regions
    _, defect_mask = cv2.threshold(
        255 - diff_map, 50, 255, cv2.THRESH_BINARY,
    )

    # Morphological cleanup
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    defect_mask = cv2.morphologyEx(defect_mask, cv2.MORPH_CLOSE, kernel)
    defect_mask = cv2.morphologyEx(defect_mask, cv2.MORPH_OPEN, kernel)

    # Find defect contours
    contours, _ = cv2.findContours(
        defect_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE,
    )

    # Filter by area (ignore tiny noise)
    min_area = 100
    defects = [c for c in contours if cv2.contourArea(c) > min_area]
    print(f"Defect regions found: {len(defects)}")

    # Visualize
    vis = cv2.cvtColor(test_aligned, cv2.COLOR_GRAY2BGR)
    for cnt in defects:
        x, y, w, h = cv2.boundingRect(cnt)
        cv2.rectangle(vis, (x, y), (x + w, y + h), (0, 0, 255), 2)
        area = cv2.contourArea(cnt)
        cv2.putText(vis, f"area={area}", (x, y - 5),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 0, 255), 1)

    # Heatmap overlay
    heatmap = cv2.applyColorMap(255 - diff_map, cv2.COLORMAP_JET)
    overlay = cv2.addWeighted(vis, 0.6, heatmap, 0.4, 0)

    cv2.imwrite("defect_heatmap.jpg", overlay)
    return score, defects


def align_images(ref, test):
    """Align test image to reference using ORB features."""
    orb = cv2.ORB_create(500)
    kp1, des1 = orb.detectAndCompute(ref, None)
    kp2, des2 = orb.detectAndCompute(test, None)

    if des1 is None or des2 is None:
        return ref, test

    bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
    matches = bf.match(des1, des2)
    matches = sorted(matches, key=lambda m: m.distance)[:50]

    if len(matches) < 4:
        return ref, test

    src_pts = np.float32([kp1[m.queryIdx].pt for m in matches]).reshape(-1, 1, 2)
    dst_pts = np.float32([kp2[m.trainIdx].pt for m in matches]).reshape(-1, 1, 2)

    H, _ = cv2.findHomography(dst_pts, src_pts, cv2.RANSAC, 5.0)
    aligned = cv2.warpPerspective(test, H, (ref.shape[1], ref.shape[0]))

    return ref, aligned


# ═══════════════════════════════════════════════════════════
# Method 2: Autoencoder Anomaly Detection
# ═══════════════════════════════════════════════════════════

class DefectAutoencoder(nn.Module):
    """
    Convolutional autoencoder for unsupervised anomaly detection.
    Trained only on 'good' samples. Defects cause high
    reconstruction error → anomaly score.
    """
    def __init__(self, img_size=128):
        super().__init__()
        self.encoder = nn.Sequential(
            nn.Conv2d(1, 32, 3, stride=2, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(),
            nn.Conv2d(32, 64, 3, stride=2, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(),
            nn.Conv2d(64, 128, 3, stride=2, padding=1),
            nn.BatchNorm2d(128),
            nn.ReLU(),
            nn.Conv2d(128, 256, 3, stride=2, padding=1),
            nn.BatchNorm2d(256),
            nn.ReLU(),
        )
        self.decoder = nn.Sequential(
            nn.ConvTranspose2d(256, 128, 3, stride=2, padding=1, output_padding=1),
            nn.BatchNorm2d(128),
            nn.ReLU(),
            nn.ConvTranspose2d(128, 64, 3, stride=2, padding=1, output_padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(),
            nn.ConvTranspose2d(64, 32, 3, stride=2, padding=1, output_padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(),
            nn.ConvTranspose2d(32, 1, 3, stride=2, padding=1, output_padding=1),
            nn.Sigmoid(),
        )

    def forward(self, x):
        z = self.encoder(x)
        return self.decoder(z)


def compute_anomaly_score(model, image, threshold=0.02):
    """
    Compute pixel-wise anomaly score from reconstruction error.
    """
    model.eval()
    with torch.no_grad():
        # Preprocess
        img = cv2.imread(image, cv2.IMREAD_GRAYSCALE)
        img = cv2.resize(img, (128, 128))
        tensor = torch.FloatTensor(img).unsqueeze(0).unsqueeze(0) / 255.0

        # Reconstruct
        recon = model(tensor)

        # Anomaly map = |input - reconstruction|
        anomaly_map = torch.abs(tensor - recon).squeeze().numpy()
        score = anomaly_map.mean()

        print(f"Anomaly score: {score:.4f} (threshold: {threshold})")
        print(f"Status: {'DEFECT' if score > threshold else 'PASS'}")

        # Generate heatmap
        heatmap = (anomaly_map * 255).astype(np.uint8)
        heatmap = cv2.applyColorMap(heatmap, cv2.COLORMAP_JET)
        cv2.imwrite("anomaly_heatmap.jpg", heatmap)

        return score, anomaly_map


# ── Example Usage ───────────────────────────────────────
if __name__ == "__main__":
    # Method 1: SSIM-based
    score, defects = detect_defects_ssim("golden_ref.jpg", "test_sample.jpg")

    # Method 2: Autoencoder (after training)
    model = DefectAutoencoder()
    # model.load_state_dict(torch.load("defect_ae.pth"))
    # score, amap = compute_anomaly_score(model, "test_sample.jpg")`
        },
      ]
    },

    // ──────────────────────────────────────────────────────────
    // Section 5: Face Detection, Recognition & Pose Estimation
    // ──────────────────────────────────────────────────────────
    {
      id: "face-pose-estimation",
      title: "Face Detection, Recognition & Pose Estimation",
      icon: "👤",
      items: [

        // ── 5.1  Face Detection + Recognition ──
        {
          title: "Face Detection (MediaPipe) + Recognition (ArcFace)",
          lang: "python",
          filename: "face_recognition_pipeline.py",
          desc: "Face detection with MediaPipe BlazeFace, embedding extraction with ArcFace (ONNX), and face matching with cosine similarity. Includes anti-spoofing checks and privacy-aware face blurring.",
          code: `"""
Face detection + recognition pipeline.
Covers: MediaPipe BlazeFace detection, ArcFace embeddings,
cosine similarity matching, anti-spoofing, privacy blurring.
"""
import cv2
import numpy as np
import mediapipe as mp
import onnxruntime as ort
from pathlib import Path


# ── 1. Face Detection with MediaPipe ────────────────────
class FaceDetector:
    """MediaPipe BlazeFace — fast, accurate face detection."""

    def __init__(self, min_confidence=0.5):
        self.mp_face = mp.solutions.face_detection
        self.detector = self.mp_face.FaceDetection(
            model_selection=1,         # 0=short-range, 1=full-range
            min_detection_confidence=min_confidence,
        )

    def detect(self, frame):
        """Detect faces, return list of (bbox, confidence, landmarks)."""
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.detector.process(rgb)

        faces = []
        if results.detections:
            h, w = frame.shape[:2]
            for det in results.detections:
                bbox = det.location_data.relative_bounding_box
                x1 = max(0, int(bbox.xmin * w))
                y1 = max(0, int(bbox.ymin * h))
                x2 = min(w, int((bbox.xmin + bbox.width) * w))
                y2 = min(h, int((bbox.ymin + bbox.height) * h))

                # Key landmarks (nose, eyes, etc.)
                landmarks = {}
                for idx, lm in enumerate(det.location_data.relative_keypoints):
                    landmarks[idx] = (int(lm.x * w), int(lm.y * h))

                faces.append({
                    "bbox": (x1, y1, x2, y2),
                    "confidence": det.score[0],
                    "landmarks": landmarks,
                })

        return faces

    def close(self):
        self.detector.close()


# ── 2. Face Embedding with ArcFace (ONNX) ──────────────
class FaceEmbedder:
    """ArcFace embedding extraction via ONNX Runtime."""

    def __init__(self, model_path="arcface_r100.onnx"):
        self.session = ort.InferenceSession(
            model_path,
            providers=["CPUExecutionProvider"],
        )
        self.input_name = self.session.get_inputs()[0].name
        self.input_shape = self.session.get_inputs()[0].shape  # [1,3,112,112]

    def preprocess(self, face_crop):
        """Preprocess face crop for ArcFace."""
        # Resize to 112x112
        face = cv2.resize(face_crop, (112, 112))
        # BGR → RGB, normalize to [-1, 1]
        face = cv2.cvtColor(face, cv2.COLOR_BGR2RGB)
        face = (face.astype(np.float32) - 127.5) / 127.5
        # HWC → CHW → NCHW
        face = face.transpose(2, 0, 1)[np.newaxis, ...]
        return face

    def embed(self, face_crop):
        """Extract 512-dim embedding from face crop."""
        inp = self.preprocess(face_crop)
        embedding = self.session.run(None, {self.input_name: inp})[0][0]
        # L2 normalize
        embedding = embedding / (np.linalg.norm(embedding) + 1e-6)
        return embedding


# ── 3. Face Matching ────────────────────────────────────
class FaceDatabase:
    """Simple face database with cosine similarity matching."""

    def __init__(self, embedder, threshold=0.4):
        self.embedder = embedder
        self.threshold = threshold
        self.db = {}                 # name → embedding

    def register(self, name, face_crop):
        """Register a face in the database."""
        embedding = self.embedder.embed(face_crop)
        self.db[name] = embedding
        print(f"Registered: {name}")

    def identify(self, face_crop):
        """Identify a face against the database."""
        if not self.db:
            return "unknown", 0.0

        query = self.embedder.embed(face_crop)

        best_name = "unknown"
        best_score = 0.0

        for name, ref_emb in self.db.items():
            # Cosine similarity (embeddings are L2-normalized)
            score = float(np.dot(query, ref_emb))
            if score > best_score:
                best_score = score
                best_name = name

        if best_score < self.threshold:
            return "unknown", best_score

        return best_name, best_score


# ── 4. Privacy-Aware Face Blurring ──────────────────────
def blur_unrecognized_faces(frame, faces, recognized_names):
    """Blur faces that are not in the recognized set (GDPR compliance)."""
    result = frame.copy()
    for face, name in zip(faces, recognized_names):
        if name == "unknown":
            x1, y1, x2, y2 = face["bbox"]
            roi = result[y1:y2, x1:x2]
            blurred = cv2.GaussianBlur(roi, (99, 99), 30)
            result[y1:y2, x1:x2] = blurred
    return result


# ── 5. Full Pipeline ────────────────────────────────────
def main():
    detector = FaceDetector(min_confidence=0.5)
    embedder = FaceEmbedder("arcface_r100.onnx")
    db = FaceDatabase(embedder, threshold=0.4)

    # Register known faces
    for img_path in Path("known_faces").glob("*.jpg"):
        name = img_path.stem
        img = cv2.imread(str(img_path))
        faces = detector.detect(img)
        if faces:
            x1, y1, x2, y2 = faces[0]["bbox"]
            db.register(name, img[y1:y2, x1:x2])

    # Real-time recognition
    cap = cv2.VideoCapture(0)

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        faces = detector.detect(frame)
        names = []

        for face in faces:
            x1, y1, x2, y2 = face["bbox"]
            crop = frame[y1:y2, x1:x2]

            if crop.size == 0:
                names.append("unknown")
                continue

            name, score = db.identify(crop)
            names.append(name)

            # Annotate
            color = (0, 255, 0) if name != "unknown" else (0, 0, 255)
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
            label = f"{name} ({score:.2f})"
            cv2.putText(frame, label, (x1, y1 - 10),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

        # Blur unrecognized faces for privacy
        frame = blur_unrecognized_faces(frame, faces, names)

        cv2.imshow("Face Recognition", frame)
        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    cap.release()
    detector.close()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()`
        },

        // ── 5.2  Pose Estimation with MoveNet ──
        {
          title: "Pose Estimation with MoveNet (TFLite)",
          lang: "python",
          filename: "pose_estimation_movenet.py",
          desc: "Real-time pose estimation using MoveNet Lightning (TFLite). Detects 17 keypoints, computes joint angles for exercise form analysis, and tracks rep counting for fitness applications.",
          code: `"""
Pose estimation with MoveNet Lightning (TFLite).
Covers: keypoint detection, joint angle computation,
exercise form analysis, rep counting.
"""
import cv2
import numpy as np
import tensorflow as tf
import math


# ── 1. MoveNet Model Setup ──────────────────────────────
class MoveNetPoseEstimator:
    """MoveNet Lightning — single-person pose estimation."""

    # COCO 17 keypoints
    KEYPOINTS = [
        "nose", "left_eye", "right_eye", "left_ear", "right_ear",
        "left_shoulder", "right_shoulder", "left_elbow", "right_elbow",
        "left_wrist", "right_wrist", "left_hip", "right_hip",
        "left_knee", "right_knee", "left_ankle", "right_ankle",
    ]

    # Skeleton connections for visualization
    EDGES = [
        (0, 1), (0, 2), (1, 3), (2, 4),          # Head
        (5, 6),                                      # Shoulders
        (5, 7), (7, 9),                              # Left arm
        (6, 8), (8, 10),                             # Right arm
        (5, 11), (6, 12),                            # Torso
        (11, 12),                                    # Hips
        (11, 13), (13, 15),                          # Left leg
        (12, 14), (14, 16),                          # Right leg
    ]

    def __init__(self, model_path="movenet_lightning.tflite"):
        self.interpreter = tf.lite.Interpreter(model_path=model_path)
        self.interpreter.allocate_tensors()
        self.input_details = self.interpreter.get_input_details()
        self.output_details = self.interpreter.get_output_details()
        self.input_size = self.input_details[0]["shape"][1]  # 192

    def detect(self, frame):
        """Detect pose keypoints in frame.
        Returns: dict of keypoint_name → (x, y, confidence)
        """
        h, w = frame.shape[:2]

        # Preprocess: resize + normalize
        img = cv2.resize(frame, (self.input_size, self.input_size))
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        input_data = np.expand_dims(img, axis=0).astype(np.int32)

        # Run inference
        self.interpreter.set_tensor(self.input_details[0]["index"], input_data)
        self.interpreter.invoke()

        # Parse output: [1, 1, 17, 3] → (y, x, confidence) normalized
        output = self.interpreter.get_tensor(self.output_details[0]["index"])
        keypoints_raw = output[0][0]  # [17, 3]

        keypoints = {}
        for i, name in enumerate(self.KEYPOINTS):
            ky, kx, conf = keypoints_raw[i]
            keypoints[name] = (int(kx * w), int(ky * h), float(conf))

        return keypoints

    def draw_skeleton(self, frame, keypoints, min_conf=0.3):
        """Draw skeleton overlay on frame."""
        # Draw edges
        kp_list = list(keypoints.values())
        for start, end in self.EDGES:
            x1, y1, c1 = kp_list[start]
            x2, y2, c2 = kp_list[end]
            if c1 > min_conf and c2 > min_conf:
                cv2.line(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)

        # Draw keypoints
        for name, (x, y, conf) in keypoints.items():
            if conf > min_conf:
                cv2.circle(frame, (x, y), 5, (0, 0, 255), -1)

        return frame


# ── 2. Joint Angle Computation ───────────────────────────
def compute_angle(a, b, c):
    """Compute angle at point B given points A, B, C.
    Returns angle in degrees (0-180).
    """
    ba = np.array([a[0] - b[0], a[1] - b[1]])
    bc = np.array([c[0] - b[0], c[1] - b[1]])

    cosine = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-6)
    angle = math.degrees(math.acos(np.clip(cosine, -1.0, 1.0)))
    return angle


def analyze_squat_form(keypoints, min_conf=0.3):
    """Analyze squat form using joint angles."""
    hip = keypoints["left_hip"]
    knee = keypoints["left_knee"]
    ankle = keypoints["left_ankle"]
    shoulder = keypoints["left_shoulder"]

    # Check confidence
    if any(kp[2] < min_conf for kp in [hip, knee, ankle, shoulder]):
        return {"status": "low_confidence"}

    knee_angle = compute_angle(hip, knee, ankle)
    hip_angle = compute_angle(shoulder, hip, knee)

    feedback = []
    if knee_angle < 70:
        feedback.append("Knees too far forward — stop at 90 degrees")
    elif knee_angle > 160:
        feedback.append("Go deeper — aim for 90-degree knee bend")

    if hip_angle < 45:
        feedback.append("Leaning too far forward — keep chest up")

    return {
        "knee_angle": round(knee_angle, 1),
        "hip_angle": round(hip_angle, 1),
        "feedback": feedback or ["Good form!"],
    }


# ── 3. Rep Counter ──────────────────────────────────────
class RepCounter:
    """Count exercise reps based on joint angle thresholds."""

    def __init__(self, up_threshold=160, down_threshold=90):
        self.up_thresh = up_threshold
        self.down_thresh = down_threshold
        self.state = "up"            # "up" or "down"
        self.count = 0

    def update(self, angle):
        """Update state machine and return current count."""
        if self.state == "up" and angle < self.down_thresh:
            self.state = "down"
        elif self.state == "down" and angle > self.up_thresh:
            self.state = "up"
            self.count += 1
        return self.count


# ── 4. Real-Time Pipeline ───────────────────────────────
def main():
    estimator = MoveNetPoseEstimator("movenet_lightning.tflite")
    counter = RepCounter(up_threshold=160, down_threshold=90)

    cap = cv2.VideoCapture(0)

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        keypoints = estimator.detect(frame)

        # Draw skeleton
        frame = estimator.draw_skeleton(frame, keypoints)

        # Analyze form
        analysis = analyze_squat_form(keypoints)
        if "knee_angle" in analysis:
            reps = counter.update(analysis["knee_angle"])

            # Display info
            cv2.putText(frame, f"Knee: {analysis['knee_angle']:.0f}deg",
                       (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
            cv2.putText(frame, f"Reps: {reps}",
                       (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
            for i, fb in enumerate(analysis["feedback"]):
                cv2.putText(frame, fb, (10, 100 + i * 25),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 165, 255), 1)

        cv2.imshow("Pose Estimation", frame)
        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()`
        },
      ]
    },

    // ──────────────────────────────────────────────────────────
    // Section 6: Edge MLOps Pipeline
    // ──────────────────────────────────────────────────────────
    {
      id: "edge-mlops-pipeline",
      title: "Edge MLOps: Train → Deploy → Monitor",
      icon: "🔁",
      items: [

        // ── 6.1  Complete Edge MLOps Pipeline ──
        {
          title: "End-to-End Edge MLOps Pipeline",
          lang: "python",
          filename: "edge_mlops_pipeline.py",
          desc: "Complete MLOps pipeline for edge AI: data versioning with DVC, experiment tracking with MLflow, automated training, ONNX/TFLite export, OTA deployment simulation, and drift monitoring.",
          code: `"""
End-to-end MLOps pipeline for edge AI deployment.
Covers: DVC data versioning, MLflow experiment tracking,
automated training, model export, OTA deployment, drift monitoring.
"""
import json
import hashlib
import subprocess
from datetime import datetime
from pathlib import Path

import mlflow
import numpy as np
import yaml


# ═══════════════════════════════════════════════════════════
# Stage 1: Data Versioning with DVC
# ═══════════════════════════════════════════════════════════

class DataVersionManager:
    """Manage dataset versions with DVC."""

    def __init__(self, data_dir="data"):
        self.data_dir = Path(data_dir)

    def init_dvc(self):
        """Initialize DVC tracking for the data directory."""
        subprocess.run(["dvc", "init"], check=True)
        subprocess.run(["dvc", "add", str(self.data_dir)], check=True)
        print(f"DVC tracking initialized for {self.data_dir}")

    def compute_hash(self):
        """Compute hash of dataset for change detection."""
        hasher = hashlib.md5()
        for f in sorted(self.data_dir.rglob("*")):
            if f.is_file():
                hasher.update(f.read_bytes())
        return hasher.hexdigest()[:12]

    def create_version(self, tag):
        """Create a tagged version of the dataset."""
        data_hash = self.compute_hash()
        version = f"{tag}_{data_hash}"

        subprocess.run(["dvc", "add", str(self.data_dir)], check=True)
        subprocess.run(["git", "add", f"{self.data_dir}.dvc", ".gitignore"], check=True)
        subprocess.run(["git", "commit", "-m", f"data: {version}"], check=True)
        subprocess.run(["git", "tag", version], check=True)

        print(f"Created data version: {version}")
        return version


# ═══════════════════════════════════════════════════════════
# Stage 2: Experiment Tracking with MLflow
# ═══════════════════════════════════════════════════════════

class ExperimentTracker:
    """Track training experiments with MLflow."""

    def __init__(self, experiment_name="edge-detection-model"):
        mlflow.set_experiment(experiment_name)
        self.experiment_name = experiment_name

    def log_training_run(self, config, metrics, model_path, artifacts=None):
        """Log a complete training run."""
        with mlflow.start_run() as run:
            # Log hyperparameters
            mlflow.log_params({
                "model_arch": config["architecture"],
                "input_size": config["input_size"],
                "batch_size": config["batch_size"],
                "epochs": config["epochs"],
                "optimizer": config["optimizer"],
                "lr": config["learning_rate"],
                "augmentation": config.get("augmentation", "standard"),
                "quantization": config.get("quantization", "none"),
            })

            # Log metrics
            for key, value in metrics.items():
                if isinstance(value, list):
                    for i, v in enumerate(value):
                        mlflow.log_metric(key, v, step=i)
                else:
                    mlflow.log_metric(key, value)

            # Log model artifact
            mlflow.log_artifact(model_path)

            # Log additional artifacts (confusion matrix, PR curves, etc.)
            if artifacts:
                for artifact_path in artifacts:
                    mlflow.log_artifact(artifact_path)

            # Log edge-specific metadata
            mlflow.log_params({
                "model_size_mb": Path(model_path).stat().st_size / 1e6,
                "target_device": config.get("target_device", "generic_arm"),
                "target_fps": config.get("target_fps", 30),
            })

            print(f"MLflow run ID: {run.info.run_id}")
            return run.info.run_id


# ═══════════════════════════════════════════════════════════
# Stage 3: Model Export Pipeline
# ═══════════════════════════════════════════════════════════

class ModelExporter:
    """Export trained models to edge-optimized formats."""

    def __init__(self, output_dir="exported_models"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)

    def export_pipeline(self, model_path, config):
        """Full export pipeline: PyTorch → ONNX → TFLite INT8."""
        exports = {}

        # Step 1: ONNX export
        onnx_path = self.output_dir / "model.onnx"
        exports["onnx"] = {
            "path": str(onnx_path),
            "command": (
                f"python -m ultralytics export "
                f"model={model_path} format=onnx "
                f"imgsz={config['input_size']} opset=17 simplify=True"
            ),
        }

        # Step 2: TFLite FP32
        tflite_fp32 = self.output_dir / "model_fp32.tflite"
        exports["tflite_fp32"] = {
            "path": str(tflite_fp32),
            "command": (
                f"python -m ultralytics export "
                f"model={model_path} format=tflite "
                f"imgsz={config['input_size']}"
            ),
        }

        # Step 3: TFLite INT8 (with calibration data)
        tflite_int8 = self.output_dir / "model_int8.tflite"
        exports["tflite_int8"] = {
            "path": str(tflite_int8),
            "command": (
                f"python -m ultralytics export "
                f"model={model_path} format=tflite "
                f"imgsz={config['input_size']} int8=True "
                f"data={config['data_yaml']}"
            ),
        }

        # Generate manifest
        manifest = {
            "model_name": config["model_name"],
            "version": config["version"],
            "exported_at": datetime.now().isoformat(),
            "input_size": config["input_size"],
            "formats": {k: v["path"] for k, v in exports.items()},
        }

        manifest_path = self.output_dir / "manifest.json"
        manifest_path.write_text(json.dumps(manifest, indent=2))

        print(f"Export manifest: {manifest_path}")
        return manifest


# ═══════════════════════════════════════════════════════════
# Stage 4: OTA Deployment Simulation
# ═══════════════════════════════════════════════════════════

class OTADeployer:
    """Simulate OTA model deployment to edge devices."""

    def __init__(self, fleet_config_path="fleet.yaml"):
        self.fleet = yaml.safe_load(Path(fleet_config_path).read_text()) \
            if Path(fleet_config_path).exists() else {"devices": []}

    def create_deployment(self, model_manifest, strategy="canary"):
        """Create a deployment plan."""
        deployment = {
            "id": hashlib.md5(
                json.dumps(model_manifest).encode()
            ).hexdigest()[:8],
            "model": model_manifest["model_name"],
            "version": model_manifest["version"],
            "strategy": strategy,
            "created_at": datetime.now().isoformat(),
            "status": "pending",
            "rollout": self._compute_rollout(strategy),
        }

        print(f"Deployment plan: {deployment['id']}")
        print(f"  Strategy: {strategy}")
        for phase in deployment["rollout"]:
            print(f"  Phase {phase['phase']}: "
                  f"{phase['percentage']}% of fleet "
                  f"({phase['device_count']} devices)")

        return deployment

    def _compute_rollout(self, strategy):
        """Compute phased rollout plan."""
        total = len(self.fleet.get("devices", [])) or 100

        if strategy == "canary":
            return [
                {"phase": 1, "percentage": 5, "device_count": max(1, total * 5 // 100),
                 "duration_hours": 24, "auto_promote": False},
                {"phase": 2, "percentage": 25, "device_count": total * 25 // 100,
                 "duration_hours": 24, "auto_promote": True},
                {"phase": 3, "percentage": 100, "device_count": total,
                 "duration_hours": 0, "auto_promote": True},
            ]
        elif strategy == "blue_green":
            return [
                {"phase": 1, "percentage": 100, "device_count": total,
                 "duration_hours": 0, "auto_promote": False},
            ]
        else:  # rolling
            return [
                {"phase": i + 1, "percentage": (i + 1) * 20,
                 "device_count": total * (i + 1) * 20 // 100,
                 "duration_hours": 12, "auto_promote": True}
                for i in range(5)
            ]


# ═══════════════════════════════════════════════════════════
# Stage 5: Drift Monitoring
# ═══════════════════════════════════════════════════════════

class DriftMonitor:
    """Monitor model performance and data drift on edge."""

    def __init__(self, baseline_stats=None):
        self.baseline = baseline_stats or {}
        self.history = []

    def compute_stats(self, predictions):
        """Compute prediction distribution statistics."""
        confs = [p["confidence"] for p in predictions]
        classes = [p["class"] for p in predictions]

        unique, counts = np.unique(classes, return_counts=True)
        class_dist = dict(zip(unique.tolist(), (counts / counts.sum()).tolist()))

        return {
            "mean_confidence": float(np.mean(confs)),
            "std_confidence": float(np.std(confs)),
            "low_conf_ratio": float(np.mean(np.array(confs) < 0.5)),
            "class_distribution": class_dist,
            "num_predictions": len(predictions),
            "timestamp": datetime.now().isoformat(),
        }

    def check_drift(self, current_stats):
        """Check for data/concept drift against baseline."""
        alerts = []

        if not self.baseline:
            self.baseline = current_stats
            return alerts

        # Confidence drift
        conf_diff = abs(
            current_stats["mean_confidence"] - self.baseline["mean_confidence"]
        )
        if conf_diff > 0.1:
            alerts.append({
                "type": "confidence_drift",
                "severity": "high" if conf_diff > 0.2 else "medium",
                "message": (
                    f"Mean confidence shifted by {conf_diff:.3f} "
                    f"({self.baseline['mean_confidence']:.3f} → "
                    f"{current_stats['mean_confidence']:.3f})"
                ),
            })

        # Low confidence spike
        if current_stats["low_conf_ratio"] > 0.3:
            alerts.append({
                "type": "low_confidence_spike",
                "severity": "high",
                "message": (
                    f"{current_stats['low_conf_ratio']*100:.1f}% of predictions "
                    f"below 0.5 confidence"
                ),
            })

        # Class distribution shift (simple KL divergence)
        baseline_dist = self.baseline.get("class_distribution", {})
        current_dist = current_stats.get("class_distribution", {})
        all_classes = set(list(baseline_dist.keys()) + list(current_dist.keys()))

        kl_div = 0.0
        for cls in all_classes:
            p = current_dist.get(cls, 1e-6)
            q = baseline_dist.get(cls, 1e-6)
            kl_div += p * np.log(p / q + 1e-10)

        if kl_div > 0.5:
            alerts.append({
                "type": "class_distribution_shift",
                "severity": "medium",
                "message": f"KL divergence = {kl_div:.3f} (threshold: 0.5)",
            })

        self.history.append(current_stats)
        return alerts


# ── Full Pipeline Orchestration ─────────────────────────
if __name__ == "__main__":
    # Stage 1: Data versioning
    dvm = DataVersionManager("data/ppe_dataset")

    # Stage 2: Experiment tracking
    tracker = ExperimentTracker("ppe-detection-edge")
    config = {
        "architecture": "yolov8n",
        "input_size": 320,
        "batch_size": 32,
        "epochs": 100,
        "optimizer": "AdamW",
        "learning_rate": 1e-3,
        "target_device": "jetson_orin_nano",
        "target_fps": 30,
        "data_yaml": "data.yaml",
        "model_name": "ppe_detector",
        "version": "1.2.0",
    }

    # (training happens here...)
    metrics = {"mAP50": 0.87, "mAP50_95": 0.62, "latency_ms": 28.5}
    run_id = tracker.log_training_run(config, metrics, "best.pt")

    # Stage 3: Export
    exporter = ModelExporter()
    manifest = exporter.export_pipeline("best.pt", config)

    # Stage 4: Deploy
    deployer = OTADeployer()
    deployment = deployer.create_deployment(manifest, strategy="canary")

    # Stage 5: Monitor
    monitor = DriftMonitor()
    sample_preds = [
        {"class": 0, "confidence": 0.92},
        {"class": 1, "confidence": 0.85},
        {"class": 2, "confidence": 0.45},
        {"class": 0, "confidence": 0.78},
    ]
    stats = monitor.compute_stats(sample_preds)
    alerts = monitor.check_drift(stats)
    for alert in alerts:
        print(f"[{alert['severity'].upper()}] {alert['type']}: {alert['message']}")`
        },
      ]
    },
  ];
})();
