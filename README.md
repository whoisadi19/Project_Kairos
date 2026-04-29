# Kairos

**AI-Powered Drone Surveillance for Rapid Crisis Response**

![Status](https://img.shields.io/badge/status-Production-green?style=flat-square)
![Python](https://img.shields.io/badge/Python-3.10-3776AB?style=flat-square&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.104.1-009688?style=flat-square&logo=fastapi&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-14-000000?style=flat-square&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)
![YOLOv8](https://img.shields.io/badge/YOLOv8s-Ultralytics-FF6B00?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)

---

## Live Demo
**Dashboard URL:** [https://projectkairos-nm4hetsg7xs8kkahn4h6ge.streamlit.app](https://projectkairos-nm4hetsg7xs8kkahn4h6ge.streamlit.app)

---

## Overview

- **Drone Observation**: Real-time drone video streams via RTSP for immediate aerial awareness.
- **Intelligent Detection**: YOLOv8s fine-tuned on aerial datasets to detect persons and vehicles.
- **Automated Triage**: Movement-based tracking system that classifies motionless detections as CRITICAL.
- **Geospatial Intelligence**: Real-time mapping that translates pixel coordinates to geographic locations on a tactical map.

---

## Quick Start

```bash
# 1. Clone
git clone https://github.com/whoisadi19/Project_Kairos.git && cd Project_Kairos

# 2. Backend Setup
cd backend && python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp ../.env.example .env

# 3. Frontend Setup
cd ../frontend && npm install && npm run dev
```

---

## Architecture

- **Capture**: Raspberry Pi 4 Node with libcamera-vid and RTSP.
- **Inference Server**: Python FastAPI backend with YOLOv8s and TriageTracker logic.
- **Tactical Dashboard**: Next.js 14 frontend with VideoCanvas and Leaflet.js mapping.
- **Deployment**: Next.js (Vercel), FastAPI (Render), and Iframe Wrapper (Streamlit).

---

## Technical Details

| Layer | Technology |
|-------|-----------|
| AI / CV | YOLOv8s, OpenCV, CUDA |
| Backend | FastAPI, WebSocket, Uvicorn |
| Database | SQLite + Prisma |
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS |
| Mapping | Leaflet.js, react-leaflet |

---

## Documentation

- [User Guide](./userguide.md): Prerequisites and environment setup instructions.
- [Implementation Plan](./implementationv1.md): Technical roadmap and architectural decisions.
- [Flaw Tracker](./FlawsAndSolutions.md): Security and operational review findings.

---

## Deployment Status

![Status](https://img.shields.io/badge/Deployment-Live-brightgreen?style=for-the-badge)

Built for professional deployment in disaster response scenarios.
