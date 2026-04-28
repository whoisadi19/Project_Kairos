import os
import zipfile
import urllib.request
import shutil
from PIL import Image

TRAIN_RATIO = 0.8
SUPPORTED_CLASS_COUNT = 5
INCLUDE_LIGHT_VEHICLES = os.getenv("INCLUDE_LIGHT_VEHICLES", "false").lower() in {
    "1",
    "true",
    "yes",
    "on",
}

# VisDrone to Kairos mapping
VISDRONE_TO_KAIROS = {
    0: 0,  # pedestrian -> person
    1: 0,  # people -> person
    3: 1,  # car -> vehicle
    4: 1,  # van -> vehicle
    5: 1,  # truck -> vehicle
    9: 1,  # bus -> vehicle
    # 10 = ignored region / others - skipped automatically
}

if INCLUDE_LIGHT_VEHICLES:
    VISDRONE_TO_KAIROS.update({
        2: 1,  # bicycle -> vehicle
        6: 1,  # tricycle -> vehicle
        7: 1,  # awning-tricycle -> vehicle
        8: 1,  # motor -> vehicle
    })

def verify_labels(label_dir):
    print("Verifying generated labels...")
    for f in os.listdir(label_dir):
        if not f.endswith(".txt"):
            continue
        filepath = os.path.join(label_dir, f)
        for line in open(filepath):
            parts = line.strip().split()
            if not parts:
                continue
            assert len(parts) == 5, f"Bad label in {f}: {line}"
            cls = int(parts[0])
            assert 0 <= cls < SUPPORTED_CLASS_COUNT, f"Invalid class {cls} in {f}"
            coords = [float(x) for x in parts[1:]]
            assert all(0 <= c <= 1 for c in coords), f"Unnormalized coords in {f}: {coords}"
    print("All labels valid")

def prep_dataset():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    zip_path = os.path.join(base_dir, "val.zip")
    extract_dir = os.path.join(base_dir, "visdrone_test")
    dataset_url = "https://github.com/ultralytics/yolov5/releases/download/v1.0/VisDrone2019-DET-val.zip"

    # 1. Download if not exists
    if not os.path.exists(zip_path) and not os.path.exists(extract_dir):
        print("Downloading VisDrone validation set...")
        urllib.request.urlretrieve(dataset_url, zip_path)

    # 2. Extract
    if not os.path.exists(extract_dir):
        print("Extracting VisDrone validation set...")
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(extract_dir)

    raw_val_dir = os.path.join(extract_dir, "VisDrone2019-DET-val")
    raw_images_dir = os.path.join(raw_val_dir, "images")
    raw_labels_dir = os.path.join(raw_val_dir, "annotations")

    # 3. Setup YOLO directory structure
    yolo_dir = os.path.join(base_dir, "VisDrone2019")
    if os.path.exists(yolo_dir):
        shutil.rmtree(yolo_dir)

    # Also create train/test dirs so Ultralytics doesn't complain
    for split in ["train", "val", "test"]:
        os.makedirs(os.path.join(yolo_dir, "images", split), exist_ok=True)
        os.makedirs(os.path.join(yolo_dir, "labels", split), exist_ok=True)

    print("Converting annotations to YOLO format...")
    valid_count = 0
    converted = []

    for img_name in sorted(os.listdir(raw_images_dir)):
        if not img_name.endswith(('.jpg', '.png')):
            continue

        base_name = os.path.splitext(img_name)[0]
        raw_label_path = os.path.join(raw_labels_dir, f"{base_name}.txt")

        if not os.path.exists(raw_label_path):
            continue

        img_path = os.path.join(raw_images_dir, img_name)
        with Image.open(img_path) as img:
            img_width, img_height = img.size

        yolo_lines = []

        with open(raw_label_path, 'r') as f:
            for line in f:
                parts = line.strip().split(',')
                if len(parts) < 6:
                    continue

                left = int(parts[0])
                top = int(parts[1])
                width = int(parts[2])
                height = int(parts[3])
                score = int(parts[4])
                category = int(parts[5])

                # Skip ignored regions based on score
                if score == 0:
                    continue

                # User instruction: "Adjust all IDs down by 1"
                visdrone_class = category - 1

                if visdrone_class not in VISDRONE_TO_KAIROS:
                    continue

                kairos_class = VISDRONE_TO_KAIROS[visdrone_class]

                # Convert to YOLO normalized format
                x_center = (left + width / 2.0) / img_width
                y_center = (top + height / 2.0) / img_height
                norm_width = width / img_width
                norm_height = height / img_height

                # Ensure values are strictly within [0, 1] to pass sanity check
                x_center = max(0.0, min(1.0, x_center))
                y_center = max(0.0, min(1.0, y_center))
                norm_width = max(0.0, min(1.0, norm_width))
                norm_height = max(0.0, min(1.0, norm_height))

                yolo_lines.append(f"{kairos_class} {x_center:.6f} {y_center:.6f} {norm_width:.6f} {norm_height:.6f}")

        converted.append((img_path, img_name, base_name, yolo_lines))
        valid_count += 1

    split_index = int(len(converted) * TRAIN_RATIO)
    for index, (img_path, img_name, base_name, yolo_lines) in enumerate(converted):
        split = "train" if index < split_index else "val"
        label_path = os.path.join(yolo_dir, "labels", split, f"{base_name}.txt")
        image_path = os.path.join(yolo_dir, "images", split, img_name)

        with open(label_path, 'w') as f:
            f.write("\n".join(yolo_lines) + "\n")
        shutil.copy2(img_path, image_path)

    print(f"Successfully processed {valid_count} images.")
    print(f"Train images: {split_index}")
    print(f"Val images: {len(converted) - split_index}")
    verify_labels(os.path.join(yolo_dir, "labels", "train"))
    verify_labels(os.path.join(yolo_dir, "labels", "val"))

if __name__ == "__main__":
    prep_dataset()
