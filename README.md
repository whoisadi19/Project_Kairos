# 🎯 Kairos

**AI-Powered Drone Surveillance for Rapid Crisis Response**

![Status](https://img.shields.io/badge/status-In%20Development-orange?style=flat-square)
![Python](https://img.shields.io/badge/Python-3.10-3776AB?style=flat-square&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.104.1-009688?style=flat-square&logo=fastapi&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-14-000000?style=flat-square&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)
![YOLOv8](https://img.shields.io/badge/YOLOv8s-Ultralytics-FF6B00?style=flat-square)
![CUDA](https://img.shields.io/badge/CUDA-RTX%204050-76B900?style=flat-square&logo=nvidia&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-Prisma-003B57?style=flat-square&logo=sqlite&logoColor=white)
![Leaflet](https://img.shields.io/badge/Leaflet.js-Map-199900?style=flat-square&logo=leaflet&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)

---

## What It Does

- 🚁 **Live drone video** streams from a Raspberry Pi 4 via RTSP to a ground station laptop over LAN
- 🧠 **YOLOv8s on CUDA** detects persons and four-wheel vehicles in real time. Fire, smoke, debris, bicycles, motors, and tricycles stay disabled until the project has labeled data for them.
- 🔴 **Triage engine** classifies motionless persons as `CRITICAL` after 10 frames of no movement — triggering immediate alert banners
- 🗺️ **Live GPS mapping** translates pixel detections to geo-coordinates, rendered on a Leaflet dark map with heatmap overlay

---

## Demo

![Kairos Dashboard Demo](demo.gif)

> *Replace with actual screen recording once running.*

---

## Quick Start

```bash
# 1. Clone
git clone https://github.com/YOUR_USERNAME/kairos.git && cd kairos

# 2. Backend
cd backend && python -m venv venv && venv\Scripts\activate
pip install -r requirements.txt && prisma generate && prisma db push
cp ../.env.example .env   # set MODE=recorded, add demo video

# 3. Start backend
uvicorn main:app --reload --port 8000

# 4. Frontend (new terminal)
cd ../frontend && npm install && npm run dev
```

Open **http://localhost:3000** — dashboard is live.

> **Demo mode** (no Pi needed): set `MODE=recorded` in `.env` and place a VisDrone .mp4 at `backend/assets/visdrone_demo.mp4`

---

## Training And Test Footage

The current checked-in training prep uses VisDrone DET images. For fewer `person -> vehicle` mistakes, the default converter maps only pedestrian/people to `person` and car/van/truck/bus to `vehicle`; bicycle, motor, and tricycle labels are ignored unless `INCLUDE_LIGHT_VEHICLES=true` is set.

```bash
# Rebuild YOLO-format labels after changing the mapping
python training/prep_dataset.py

# Longer aerial-object training defaults
EPOCHS=60 IMGSZ=960 BATCH=4 python training/train.py

# After reviewing validation metrics, promote the best checkpoint
PROMOTE_BEST=true python training/train.py

# Build a local MP4 from dataset frames for backend demo mode
python training/make_test_video.py --frames training/visdrone_test/VisDrone2019-DET-val/images --output backend/assets/visdrone_val_holdout.mp4 --fps 12 --max-frames 300
```

Best public sources for better evaluation clips:

| Dataset | Why it helps |
|---------|--------------|
| VisDrone VID | Drone video sequences with pedestrian and vehicle annotations |
| AU-AIR | Low-altitude UAV traffic footage with pedestrian/vehicle-like classes |
| Stanford Drone Dataset | Top-down campus videos with pedestrians, cyclists, carts, cars, and buses |
| UAVDT | Drone traffic videos for stress-testing vehicle detections |

---

## Model Validation (v1.0)

We fine-tuned YOLOv8s on the VisDrone dataset for 10 epochs to achieve the following baseline performance:

| Metric | Value |
|--------|-------|
| **mAP50** | 46.6% |
| **Precision** | 60.6% |
| **Recall** | 41.6% |
| **mAP50-95** | 22.6% |

---

## Deployment (Streamlit Community Cloud)

Project Kairos is optimized for **Streamlit Community Cloud** for rapid MVP deployment.

1.  Push this repository to GitHub.
2.  Go to [share.streamlit.io](https://share.streamlit.io/).
3.  Select your repo and `streamlit_app.py`.
4.  Deployment takes < 2 minutes.

---

## Architecture

```
Raspberry Pi 4 (Camera)
      ↓ RTSP H.264 (mediamtx)
Ground Station — RTX 4050
  OpenCV → YOLOv8s (CUDA) → TriageTracker → GPS Mapper
      ↓ WebSocket (base64 JPEG + detection JSON)
Next.js Dashboard
  VideoCanvas + Leaflet Map + Detection Log + Alert Banner
      ↓ Prisma ORM
SQLite (rate-limited detection history)
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| AI / CV | YOLOv8s, OpenCV, CUDA (RTX 4050) |
| Backend | FastAPI, WebSocket, Uvicorn |
| Database | SQLite + Prisma Python Client |
| Streaming | mediamtx RTSP, libcamera-vid (Pi) |
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS |
| Map | Leaflet.js, react-leaflet, leaflet.heat |
| Pi Node | Raspberry Pi 4, libcamera-vid, ffmpeg |

---

## Docs

| Document | Description |
|----------|-------------|
| [implementationv1.md](./implementationv1.md) | Full implementation plan — phases, tech stack, decision log |
| [worklog.md](./worklog.md) | Session-based work log with error tracking |
| [userguide.md](./userguide.md) | Prerequisites, env setup, named terminals, API reference |
| [FlawsAndSolutions.md](./FlawsAndSolutions.md) | Numbered flaw tracker with severity and root cause |

---

## Detection Classes

| Class | Triage Logic | Alert |
|-------|-------------|-------|
| 🔴 Person (CRITICAL) | Motionless > 10 frames | Red banner |
| 🟢 Person (STABLE) | Moving normally | None |
| 🔵 Vehicle | Four-wheel vehicle only by default | None |

Fire, smoke, debris, bicycles, motors, and tricycles are intentionally excluded from the default model config until we add reliable labels for them.

---

## Project Status

![Status](https://img.shields.io/badge/Hackathon%20Build-In%20Development-orange?style=for-the-badge)

> Built for rapid deployment at disaster response scenarios. v1 targets demo mode on any CUDA laptop without a Pi.
