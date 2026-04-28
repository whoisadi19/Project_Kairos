"""
Kairos YOLOv8 fine-tuning script.

Defaults are tuned for small aerial objects and a laptop GPU. Override any
setting with environment variables, for example:

  EPOCHS=80 IMGSZ=960 BATCH=4 python training/train.py

Set PROMOTE_BEST=true only after reviewing validation results; it copies the
best checkpoint into models/yolov8s.pt for the backend to load.
"""

import os
import shutil
import tempfile
from pathlib import Path

import yaml

import torch
from ultralytics import YOLO


def env_bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.lower() in {"1", "true", "yes", "on"}


def train():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    repo_dir = os.path.dirname(base_dir)
    weights_path = os.getenv("MODEL_WEIGHTS", os.path.join(base_dir, "yolov8s.pt"))
    yaml_path = os.getenv("DATASET_YAML", os.path.join(base_dir, "dataset.yaml"))
    dataset_root = os.path.join(base_dir, "VisDrone2019")

    with open(yaml_path, "r", encoding="utf-8") as f:
        dataset_config = yaml.safe_load(f)

    # Force absolute dataset root to avoid Ultralytics global datasets_dir remapping.
    dataset_config["path"] = str(Path(dataset_root).resolve())

    temp_dataset_file = tempfile.NamedTemporaryFile(
        mode="w",
        suffix=".yaml",
        prefix="kairos_dataset_",
        delete=False,
        encoding="utf-8"
    )
    with temp_dataset_file as f:
        yaml.safe_dump(dataset_config, f, sort_keys=False)
    runtime_yaml_path = temp_dataset_file.name

    model = YOLO(weights_path)
    device = "cuda" if torch.cuda.is_available() else "cpu"
    workers = min(int(os.getenv("WORKERS", "8")), os.cpu_count() or 4)

    epochs = int(os.getenv("EPOCHS", "60"))
    imgsz = int(os.getenv("IMGSZ", "960"))
    batch = int(os.getenv("BATCH", "4"))
    run_name = os.getenv("RUN_NAME", "kairos_aerial_person_vehicle")

    print(f"Starting training on {device} with {workers} workers")
    print(f"weights={weights_path}")
    print(f"data={runtime_yaml_path}")
    print(f"epochs={epochs} imgsz={imgsz} batch={batch}")

    results = model.train(
        data=runtime_yaml_path,
        epochs=epochs,
        imgsz=imgsz,
        batch=batch,
        cache=env_bool("CACHE_IMAGES", False),
        device=device,
        project=os.path.join(base_dir, "results"),
        name=run_name,
        patience=int(os.getenv("PATIENCE", "20")),
        save=True,
        save_period=int(os.getenv("SAVE_PERIOD", "10")),
        plots=True,
        workers=workers,
        optimizer=os.getenv("OPTIMIZER", "AdamW"),
        lr0=float(os.getenv("LR0", "0.002")),
        lrf=float(os.getenv("LRF", "0.01")),
        cos_lr=True,
        warmup_epochs=float(os.getenv("WARMUP_EPOCHS", "3")),
        close_mosaic=int(os.getenv("CLOSE_MOSAIC", "10")),
        augment=True,
        mosaic=float(os.getenv("MOSAIC", "0.7")),
        scale=float(os.getenv("SCALE", "0.4")),
        degrees=float(os.getenv("DEGREES", "5.0")),
        translate=float(os.getenv("TRANSLATE", "0.1")),
        flipud=0.0,
        fliplr=float(os.getenv("FLIPLR", "0.5")),
        seed=int(os.getenv("SEED", "42")),
        deterministic=True
    )

    result_dir = getattr(results, "save_dir", None)
    best_path = os.path.join(str(result_dir), "weights", "best.pt") if result_dir else ""
    print("Training complete.")
    print(f"Best mAP@50: {results.results_dict.get('metrics/mAP50(B)', 'n/a')}")
    print(f"Best checkpoint: {best_path}")

    if env_bool("PROMOTE_BEST", False) and os.path.exists(best_path):
        target_path = os.path.join(repo_dir, "models", "yolov8s.pt")
        shutil.copy2(best_path, target_path)
        print(f"Promoted best checkpoint to {target_path}")

    if os.path.exists(runtime_yaml_path):
        os.unlink(runtime_yaml_path)


if __name__ == "__main__":
    train()
