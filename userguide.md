# Kairos — User Guide

> AI-Powered Drone Surveillance for Rapid Crisis Response  
> Last updated: 2026-04-27

---

## 1. Prerequisites

Install all of the following before touching any project file.

### Hardware

| Component | Requirement |
|-----------|-------------|
| Ground Station | Windows 10/11, NVIDIA RTX 4050 (or any CUDA GPU) |
| Pi (Live Mode only) | Raspberry Pi 4 Model B (4GB+ RAM recommended) |
| Pi Camera | Official Raspberry Pi Camera Module v2 or HQ Camera |
| Network | Pi and laptop on same LAN (router or hotspot) |

### Software — Ground Station (Windows)

| Tool | Version | Install |
|------|---------|---------|
| Python | 3.10.x | https://www.python.org/downloads/ |
| Node.js | 18.x LTS | https://nodejs.org/ |
| npm | 9.x+ (bundled with Node) | — |
| CUDA Toolkit | 11.8 or 12.x | https://developer.nvidia.com/cuda-downloads |
| cuDNN | Matching CUDA version | https://developer.nvidia.com/cudnn |
| Git | Latest | https://git-scm.com/ |
| pip | Latest (`python -m pip install --upgrade pip`) | — |

> [!IMPORTANT]
> Verify CUDA is detected before installing ultralytics:
> `python -c "import torch; print(torch.cuda.is_available())"`
> Must print `True`. If `False`, fix your CUDA/driver install first.

### Software — Raspberry Pi 4

| Tool | Notes |
|------|-------|
| Raspberry Pi OS (64-bit) | Bookworm recommended |
| libcamera-vid | Pre-installed on Bookworm |
| ffmpeg | `sudo apt install ffmpeg` |
| mediamtx | Downloaded automatically by `stream_setup.sh` |

---

## 2. Environment Setup

### Step 1 — Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/kairos.git
cd kairos
```

### Step 2 — Backend Virtual Environment

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# Linux / macOS
source venv/bin/activate

pip install -r requirements.txt
```

### Step 3 — Configure Environment Variables

```bash
# From the project root
cp .env.example backend/.env
```

Open `backend/.env` and fill in your values:

| Variable | Default | Description |
|----------|---------|-------------|
| `MODE` | `recorded` | `recorded` = demo video loop, `live` = RTSP stream from Pi |
| `PI_RTSP_URL` | `rtsp://192.168.1.100:8554/picam` | RTSP URL printed by `stream_setup.sh` on the Pi |
| `VIDEO_FILE_PATH` | `./assets/visdrone_demo.mp4` | Path to demo video (recorded mode) |
| `DATABASE_URL` | `file:./kairos.db` | SQLite database path |
| `CONFIDENCE_THRESHOLD` | `0.35` | Minimum confidence to report a detection |
| `BASE_LAT` | `19.9975` | GPS center latitude (Nashik, India) |
| `BASE_LNG` | `73.7898` | GPS center longitude (Nashik, India) |
| `PORT` | `8000` | FastAPI port |

### Step 4 — Initialize the Database

```bash
# Inside backend/ with venv activated
prisma generate
prisma db push
```

### Step 5 — Place Demo Video (Recorded Mode)

Download a VisDrone2019 test sequence video from:  
https://github.com/VisDrone/VisDrone-Dataset

Rename/copy it to:
```
backend/assets/visdrone_demo.mp4
```

Create the assets folder if it doesn't exist:
```bash
mkdir backend\assets   # Windows
mkdir -p backend/assets  # Linux/Mac
```

### Step 6 — Install Frontend Dependencies

```bash
cd frontend
npm install
```

---

## 3. Running the Project

Use **separate terminal windows** for each service. Do not close any terminal while the system is running.

---

### Terminal 1 — Backend (FastAPI + Inference)

```bash
cd kairos/backend
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Linux/Mac

uvicorn main:app --reload --port 8000
```

**Expected output:**
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Started reloader process
INFO:     Application startup complete.
```

Verify health: open http://localhost:8000/health in browser.  
Expected response: `{"status": "online", "mode": "recorded", "fps": ..., "frame_id": ...}`

---

### Terminal 2 — Frontend (Next.js Dev Server)

```bash
cd kairos/frontend
npm run dev
```

**Expected output:**
```
▲ Next.js 14.0.4
- Local: http://localhost:3000
```

Open http://localhost:3000 to view the Kairos dashboard.

---

### Terminal 3 — Raspberry Pi Stream (Live Mode Only)

> **Run this on the Raspberry Pi, not the laptop.**

```bash
# SSH into the Pi first
ssh pi@<PI_IP_ADDRESS>

# Run setup script
chmod +x ~/kairos/pi_setup/stream_setup.sh
~/kairos/pi_setup/stream_setup.sh
```

**Expected output:**
```
Pi IP Address: 192.168.1.XXX
RTSP URL will be: rtsp://192.168.1.XXX:8554/picam
...
Stream is LIVE
RTSP URL: rtsp://192.168.1.XXX:8554/picam
Copy this URL to your .env: PI_RTSP_URL=rtsp://192.168.1.XXX:8554/picam
```

Copy the RTSP URL into your `backend/.env`:
```
MODE=live
PI_RTSP_URL=rtsp://192.168.1.XXX:8554/picam
```

Then restart **Terminal 1** (the backend).

---

### Terminal 4 — Training (Optional)

```bash
cd kairos
# Ensure VisDrone2019 dataset is at training/VisDrone2019/
python training/train.py
```

Training output will be saved to `training/results/kairos_v1/`.

---

## 4. Hardware Setup (Raspberry Pi)

### SSH into the Pi

```bash
ssh pi@192.168.1.100
# Default password: raspberry (change immediately)
```

### Enable Camera Interface

```bash
sudo raspi-config
# Interface Options → Camera → Enable → Reboot
```

### Test Camera Works

```bash
libcamera-hello --timeout 3000
```

Should open a preview window for 3 seconds. If it errors, check camera ribbon cable connection.

### Run Stream Setup

```bash
chmod +x pi_setup/stream_setup.sh
./pi_setup/stream_setup.sh
```

The script will:
1. Download mediamtx RTSP server binary (arm64)
2. Start mediamtx on port 8554
3. Start `libcamera-vid` → `ffmpeg` → RTSP pipeline
4. Print the RTSP URL for your `.env`

### GPIO / Camera Pinout

| Pin | Connection |
|-----|-----------|
| Camera CSI port | Official Pi Camera ribbon cable |
| No GPIO pins needed | Camera uses dedicated CSI interface |

---

## 5. Folder Structure

```
kairos/
├── backend/
│   ├── main.py              ← FastAPI app, WebSocket, DB logging
│   ├── inference.py         ← YOLOv8s CUDA inference pipeline
│   ├── triage.py            ← Motion-based person triage engine
│   ├── stream.py            ← Frame capture (RTSP + recorded)
│   ├── gps.py               ← Pixel-to-GPS coordinate mapper
│   ├── requirements.txt     ← Python dependencies
│   ├── assets/
│   │   └── visdrone_demo.mp4  ← Demo video (you add this)
│   └── prisma/
│       └── schema.prisma    ← Database schema (Detection model)
├── frontend/
│   ├── app/
│   │   ├── page.tsx         ← Main dashboard page
│   │   ├── layout.tsx       ← Root layout (Leaflet CDN scripts here)
│   │   ├── globals.css      ← Design tokens, animations, Tailwind
│   │   ├── components/
│   │   │   ├── VideoCanvas.tsx    ← Live video + bounding box overlay
│   │   │   ├── MapView.tsx        ← Leaflet dark map + heatmap
│   │   │   ├── DetectionLog.tsx   ← Scrollable detection list
│   │   │   ├── AlertBanner.tsx    ← CRITICAL/FIRE alert bar
│   │   │   ├── SystemStatus.tsx   ← System health grid
│   │   │   ├── TriageSummary.tsx  ← Animated triage category bars
│   │   │   └── TopBar.tsx         ← Header: status, FPS, mode toggle
│   │   └── hooks/
│   │       └── useDetectionSocket.ts  ← Buffered WebSocket hook
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── package.json
├── training/
│   ├── train.py             ← YOLOv8s fine-tuning script
│   ├── dataset.yaml         ← VisDrone class mapping
│   └── results/
│       └── .gitkeep
├── pi_setup/
│   └── stream_setup.sh      ← Pi RTSP stream setup (run on Pi)
├── .env.example             ← Environment variable template
└── README.md
```

---

## 6. API Reference

| Endpoint | Method | Description | Request Body | Response |
|----------|--------|-------------|--------------|----------|
| `/health` | GET | System health check | None | `{"status": "online", "mode": "recorded", "fps": 14.9, "frame_id": 423}` |
| `/mode` | POST | Switch stream mode | `{"mode": "live"}` or `{"mode": "recorded"}` | `{"mode": "live", "status": "switched"}` |
| `/detections/history` | GET | Fetch detection log (default last 50) | Query param: `?limit=100` | Array of Detection objects |
| `/ws/kairos` | WebSocket | Live frame + detection stream | — | JSON frames: `{type, frame_id, frame (base64), detections[], mode}` |

### WebSocket Message Format

**Frame message:**
```json
{
  "type": "frame",
  "frame_id": 512,
  "frame": "<base64-jpeg>",
  "detections": [
    {
      "class_name": "person",
      "confidence": 0.87,
      "x": 412.0, "y": 305.0, "w": 48.0, "h": 92.0,
      "cx": 436.0, "cy": 351.0,
      "triage": "CRITICAL",
      "lat": 19.9971, "lng": 73.7896,
      "frame_id": 512,
      "track_id": "0_8_7"
    }
  ],
  "mode": "recorded"
}
```

**Signal lost message:**
```json
{
  "type": "signal_lost",
  "frame_id": 513
}
```

---

## 7. Common Issues

| Issue | Fix |
|-------|-----|
| `torch.cuda.is_available()` returns `False` | Reinstall CUDA toolkit matching your driver version. Run `nvidia-smi` to check driver. |
| `Cannot open stream: recorded` | Demo video not found. Check `VIDEO_FILE_PATH` in `.env` and ensure file exists at that path. |
| `RuntimeError: CUDA out of memory` | Close other GPU applications. Reduce `imgsz` in inference or use `batch=1`. |
| `prisma generate` fails | Ensure you're in `backend/` directory with venv active and `prisma==0.11.0` installed. |
| `prisma db push` fails | Check `DATABASE_URL` in `.env`. For SQLite, path must be relative to `backend/`. |
| Frontend map doesn't load | Leaflet CSS/JS not loading. Ensure CDN links are in `layout.tsx` `<head>`. |
| WebSocket shows DISCONNECTED immediately | Backend not running or wrong port. Verify `uvicorn` is on port 8000. |
| RTSP stream not connecting (live mode) | Check Pi IP in `.env`. Ensure Pi and laptop are on same network. Run `ping <PI_IP>`. |
| `libcamera-vid: command not found` on Pi | Update Pi OS: `sudo apt update && sudo apt upgrade`. Camera must be enabled in `raspi-config`. |
| FPS < 5 on dashboard | Check GPU utilization. Close browser dev tools. Ensure `CONFIDENCE_THRESHOLD` isn't too low flooding detections. |
| AlertBanner flickers on/off | Normal behavior — it renders only when CRITICAL detections are present in current frame. |
| Map markers not showing | Leaflet `window.L` may not be loaded. Check browser console for Leaflet errors. |
| `npm run dev` port conflict | Another process on port 3000. Use `npx next dev -p 3001` or kill the conflicting process. |
