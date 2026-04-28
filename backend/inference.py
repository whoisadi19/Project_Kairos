import os

import numpy as np
import torch
from ultralytics import YOLO

from gps import pixel_to_gps
from triage import TriageTracker

CONFIDENCE_THRESHOLD = float(os.getenv("CONFIDENCE_THRESHOLD", "0.35"))
INFERENCE_IOU = float(os.getenv("INFERENCE_IOU", "0.55"))
AGNOSTIC_NMS = os.getenv("AGNOSTIC_NMS", "true").lower() in {"1", "true", "yes", "on"}
VEHICLE_PERSON_IOU_SUPPRESSION = float(
    os.getenv("VEHICLE_PERSON_IOU_SUPPRESSION", "0.65")
)

ENABLED_CLASSES = {
    name.strip()
    for name in os.getenv("ENABLED_CLASSES", "person,vehicle,fire,smoke,debris").split(",")
    if name.strip()
}


def _class_threshold(class_name: str) -> float:
    default_threshold = CONFIDENCE_THRESHOLD
    if class_name == "vehicle":
        default_threshold = max(default_threshold, 0.55)

    env_name = f"{class_name.upper()}_CONFIDENCE_THRESHOLD"
    return float(os.getenv(env_name, str(default_threshold)))


CLASS_CONFIDENCE_THRESHOLDS = {
    class_name: _class_threshold(class_name)
    for class_name in ENABLED_CLASSES
}

device = "cuda" if torch.cuda.is_available() else "cpu"
model_path = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "models", "yolov8s.pt")
)
model = YOLO(model_path)
model.to(device)
CLASS_NAMES = dict(model.names)

triage_tracker = TriageTracker()


def get_model_status() -> dict:
    return {
        "device": device,
        "model_path": model_path,
        "model_classes": list(CLASS_NAMES.values()),
        "enabled_classes": sorted(ENABLED_CLASSES),
        "class_confidence_thresholds": CLASS_CONFIDENCE_THRESHOLDS,
        "agnostic_nms": AGNOSTIC_NMS,
        "inference_iou": INFERENCE_IOU,
        "vehicle_person_iou_suppression": VEHICLE_PERSON_IOU_SUPPRESSION,
        "cuda_available": torch.cuda.is_available()
    }


def _box_iou(a: dict, b: dict) -> float:
    ax1, ay1 = a["x"], a["y"]
    ax2, ay2 = a["x"] + a["w"], a["y"] + a["h"]
    bx1, by1 = b["x"], b["y"]
    bx2, by2 = b["x"] + b["w"], b["y"] + b["h"]

    inter_x1 = max(ax1, bx1)
    inter_y1 = max(ay1, by1)
    inter_x2 = min(ax2, bx2)
    inter_y2 = min(ay2, by2)
    inter_w = max(0.0, inter_x2 - inter_x1)
    inter_h = max(0.0, inter_y2 - inter_y1)
    inter_area = inter_w * inter_h

    area_a = max(0.0, a["w"]) * max(0.0, a["h"])
    area_b = max(0.0, b["w"]) * max(0.0, b["h"])
    union = area_a + area_b - inter_area
    if union <= 0:
        return 0.0
    return inter_area / union


def _suppress_overlapping_vehicle_predictions(detections: list) -> list:
    if VEHICLE_PERSON_IOU_SUPPRESSION <= 0:
        return detections

    people = [d for d in detections if d["class_name"] == "person"]
    if not people:
        return detections

    filtered = []
    for detection in detections:
        if detection["class_name"] != "vehicle":
            filtered.append(detection)
            continue

        overlaps_person = any(
            _box_iou(detection, person) >= VEHICLE_PERSON_IOU_SUPPRESSION
            for person in people
        )
        if not overlaps_person:
            filtered.append(detection)

    return filtered


def run_inference(frame: np.ndarray, frame_id: int) -> list:
    """
    Runs YOLOv8s on a single frame.
    Returns list of detection dicts.
    Never blocks; must be called from asyncio.run_in_executor.
    """
    results = model(
        frame,
        device=device,
        verbose=False,
        conf=CONFIDENCE_THRESHOLD,
        iou=INFERENCE_IOU,
        agnostic_nms=AGNOSTIC_NMS
    )[0]

    raw_detections = []

    for box in results.boxes:
        cls_id = int(box.cls[0])
        class_name = CLASS_NAMES.get(cls_id, "unknown")
        if class_name not in ENABLED_CLASSES:
            continue

        confidence = float(box.conf[0])
        if confidence < CLASS_CONFIDENCE_THRESHOLDS.get(class_name, CONFIDENCE_THRESHOLD):
            continue

        x1, y1, x2, y2 = box.xyxy[0].tolist()
        w = x2 - x1
        h = y2 - y1
        cx = x1 + w / 2
        cy = y1 + h / 2

        raw_detections.append({
            "class_name": class_name,
            "confidence": confidence,
            "x": x1,
            "y": y1,
            "w": w,
            "h": h,
            "cx": cx,
            "cy": cy,
            "cls_id": cls_id
        })

    detections = []
    active_ids = set()

    for raw in _suppress_overlapping_vehicle_predictions(raw_detections):
        class_name = raw["class_name"]
        confidence = raw["confidence"]
        x1 = raw["x"]
        y1 = raw["y"]
        w = raw["w"]
        h = raw["h"]
        cx = raw["cx"]
        cy = raw["cy"]
        cls_id = raw["cls_id"]

        track_id = f"{cls_id}_{int(cx // 50)}_{int(cy // 50)}"
        active_ids.add(track_id)

        triage = triage_tracker.get_triage(track_id, cx, cy, class_name)
        lat, lng = pixel_to_gps(cx, cy)

        detections.append({
            "class_name": class_name,
            "confidence": round(confidence, 3),
            "x": round(x1, 1),
            "y": round(y1, 1),
            "w": round(w, 1),
            "h": round(h, 1),
            "cx": round(cx, 1),
            "cy": round(cy, 1),
            "triage": triage,
            "lat": lat,
            "lng": lng,
            "frame_id": frame_id,
            "track_id": track_id
        })

    triage_tracker.cleanup(active_ids)
    return detections
