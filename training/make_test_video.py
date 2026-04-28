"""
Create a demo MP4 from a folder of dataset frames.

Example:
  python training/make_test_video.py ^
    --frames training/visdrone_test/VisDrone2019-DET-val/images ^
    --output backend/assets/visdrone_val_holdout.mp4 ^
    --fps 12 --max-frames 300
"""

import argparse
import os
from pathlib import Path

import cv2

IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


def list_frames(frames_dir: Path) -> list[Path]:
    frames = [
        path
        for path in sorted(frames_dir.iterdir())
        if path.is_file() and path.suffix.lower() in IMAGE_SUFFIXES
    ]
    if not frames:
        raise FileNotFoundError(f"No image frames found in {frames_dir}")
    return frames


def make_video(frames_dir: Path, output_path: Path, fps: float, max_frames: int | None) -> None:
    frames = list_frames(frames_dir)
    if max_frames:
        frames = frames[:max_frames]

    first = cv2.imread(str(frames[0]))
    if first is None:
        raise RuntimeError(f"Could not read first frame: {frames[0]}")

    height, width = first.shape[:2]
    output_path.parent.mkdir(parents=True, exist_ok=True)

    writer = cv2.VideoWriter(
        str(output_path),
        cv2.VideoWriter_fourcc(*"mp4v"),
        fps,
        (width, height)
    )
    if not writer.isOpened():
        raise RuntimeError(f"Could not open video writer for {output_path}")

    try:
        for frame_path in frames:
            frame = cv2.imread(str(frame_path))
            if frame is None:
                print(f"Skipping unreadable frame: {frame_path}")
                continue
            if frame.shape[:2] != (height, width):
                frame = cv2.resize(frame, (width, height), interpolation=cv2.INTER_AREA)
            writer.write(frame)
    finally:
        writer.release()

    print(f"Wrote {len(frames)} frames to {output_path}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--frames", required=True, help="Directory containing image frames")
    parser.add_argument("--output", required=True, help="Output MP4 path")
    parser.add_argument("--fps", type=float, default=12.0)
    parser.add_argument("--max-frames", type=int, default=None)
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    make_video(
        Path(args.frames).resolve(),
        Path(args.output).resolve(),
        args.fps,
        args.max_frames
    )
