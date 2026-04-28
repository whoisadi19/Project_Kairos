# Kairos — Implementation Plan v2

> AI-Powered Drone Surveillance for Rapid Crisis Response

---

## 1. Problem Statement

During mass-casualty disasters (floods, building collapses, crowd crushes), first responders waste critical minutes manually scanning large areas on foot or via radio reports. There is no real-time, AI-augmented aerial picture of who is down, where fire/smoke is spreading, or which sectors have been cleared.

**Kairos** solves this by mounting a camera on a drone (Raspberry Pi 4 node), streaming live video to a ground station laptop, running YOLOv8s inference on the GPU, and pushing structured detection + triage data to a command-center dashboard — giving incident commanders a live, color-coded operational picture within seconds of deployment.

**Who it helps:** Disaster response teams, NDRF units, search-and-rescue coordinators, and urban crisis management operators.

---

## 2. Goal

Success looks like:

- A drone operator boots the system, and within **30 seconds** the Next.js dashboard shows live bounding boxes, GPS-mapped detections, and triage status for every person in frame.
- CRITICAL (motionless) persons trigger a red alert banner automatically.
- Fire/smoke detections trigger an immediate orange hazard alert.
- The system runs stably at **≥ 15 FPS** inference on an RTX 4050 GPU.
- In **recorded/demo mode** (no Pi required), the app loops a VisDrone .mp4 and behaves identically to live mode.
- All critical detections are persisted to SQLite via Prisma with rate-limiting to prevent DB flooding.

---

## 3. Tech Stack

| Layer         | Technology                                      | Version / Notes                        |
|---------------|-------------------------------------------------|----------------------------------------|
| **AI / CV**   | YOLOv8s (Ultralytics), OpenCV, CUDA             | ultralytics==8.0.196, CUDA on RTX 4050 |
| **Backend**   | FastAPI, Uvicorn, WebSocket, python-dotenv      | FastAPI==0.104.1, Uvicorn==0.24.0      |
| **ORM / DB**  | Prisma (Python client), SQLite                  | prisma==0.11.0, SQLite file DB         |
| **Streaming** | OpenCV VideoCapture (RTSP + file), mediamtx     | Pi streams via RTSP H.264              |
| **Pi Node**   | Raspberry Pi 4, libcamera-vid, ffmpeg, mediamtx | arm64, mediamtx v1.5.1                 |
| **Frontend**  | Next.js 14, React 18, TypeScript, Tailwind CSS  | next==14.0.4                           |
| **Map**       | Leaflet.js, react-leaflet, leaflet.heat         | leaflet==1.9.4                         |
| **Fonts**     | Inter (UI), JetBrains Mono (data/labels)        | Google Fonts CDN                       |
| **DevOps**    | Git, .env config, npm/pip, Windows + WSL2       | No Docker required in v1               |

---

## 4. Phases

### Phase 1 — Project Setup & Environment

- [ ] Create full folder structure as specified (`kairos/`)
- [ ] Create `.env.example` with all required variables
- [ ] Set up Python virtual environment in `backend/`
- [ ] Install backend dependencies: `pip install -r requirements.txt`
- [ ] Initialize Prisma schema and run `prisma generate && prisma db push`
- [ ] Set up Next.js frontend: `npm install` in `frontend/`
- [ ] Verify CUDA availability: `python -c "import torch; print(torch.cuda.is_available())"`
- [ ] Place VisDrone demo video at `backend/assets/visdrone_demo.mp4`
- [ ] Copy `.env.example` to `backend/.env`, set `MODE=recorded`

### Phase 2 — Backend Core (Python / FastAPI)

- [ ] Implement `gps.py` — pixel-to-GPS coordinate mapper
- [ ] Implement `triage.py` — TriageTracker with stillness detection
- [ ] Implement `inference.py` — YOLOv8s CUDA inference pipeline
- [ ] Implement `stream.py` — FrameStream (recorded + RTSP modes, loop on EOF)
- [ ] Implement `main.py` — FastAPI app with:
  - [ ] `/health` GET endpoint
  - [ ] `/mode` POST endpoint (live ↔ recorded switch)
  - [ ] `/detections/history` GET endpoint
  - [ ] `/ws/kairos` WebSocket endpoint with frame + detection streaming
  - [ ] Rate-limited Prisma detection logging
- [ ] Test backend: `uvicorn main:app --reload --port 8000`
- [ ] Verify WebSocket sends base64 JPEG + detection JSON
- [ ] Verify video loops in recorded mode
- [ ] Verify triage returns CRITICAL/STABLE correctly

### Phase 3 — Frontend Dashboard (Next.js / TypeScript)

- [ ] Configure `package.json`
- [ ] Generate `tsconfig.json` (standard Next.js 14 TS settings)
- [ ] Generate `tailwind.config.ts` (content: `app/**/*.{ts,tsx}`)
- [ ] Implement `globals.css` — design tokens, animations, radar grid
- [ ] Implement `hooks/useDetectionSocket.ts` — buffered WebSocket hook
- [ ] Implement `components/VideoCanvas.tsx` — img + canvas overlay (RAF loop)
- [ ] Implement `components/TopBar.tsx` — live status, FPS, mode toggle
- [ ] Implement `components/AlertBanner.tsx` — CRITICAL/FIRE alert bar
- [ ] Implement `components/DetectionLog.tsx` — scrollable detection list
- [ ] Implement `components/MapView.tsx` — Leaflet dark map + heatmap + markers
- [ ] Implement `components/SystemStatus.tsx` — system health grid
- [ ] Implement `components/TriageSummary.tsx` — animated triage bars
- [ ] Implement `app/layout.tsx` — root layout with `globals.css` and Leaflet CDN script/css tags
- [ ] Implement `app/page.tsx` — main dashboard grid layout
- [ ] Test: `npm run dev` → `http://localhost:3000`
- [ ] Verify bounding boxes render over video frame
- [ ] Verify map markers appear at correct GPS coords
- [ ] Verify AlertBanner triggers on CRITICAL detection
- [ ] Verify mode toggle switches backend stream

### Phase 4 — Training Pipeline

- [ ] Create `training/dataset.yaml` — VisDrone class mapping
- [ ] Create `training/train.py` — YOLOv8s fine-tuning script
- [ ] Create `training/results/.gitkeep`
- [ ] Download VisDrone2019 dataset → `training/VisDrone2019/`
- [ ] Run training: `python training/train.py`
- [ ] Evaluate: check mAP@50 in training results
- [ ] Export best weights and update model path in `inference.py`

### Phase 5 — Raspberry Pi Integration (Live Mode)

- [ ] Create `pi_setup/stream_setup.sh` with mediamtx + libcamera-vid setup
- [ ] SSH into Pi, run `stream_setup.sh`
- [ ] Note printed RTSP URL, update `.env` → `PI_RTSP_URL`
- [ ] Set `MODE=live` in `.env`
- [ ] Restart backend and verify live stream connects
- [ ] Verify FPS ≥ 15 over local network

### Phase 6 — Integration Testing & Polish

- [ ] Run full verification checklist (all 31 items)
- [ ] Test signal loss recovery (WS reconnect)
- [ ] Test DB rate limiting (no duplicate writes within 5s)
- [ ] Test detection history endpoint (`/detections/history`)
- [ ] Profile inference latency (target < 50ms per frame on RTX 4050)
- [ ] Test on fresh machine with only README instructions
- [ ] Finalize README, userguide, worklog

---

## 5. Decision Log

| Decision | Reason | Date |
|---|---|---|
| YOLOv8s (small) over YOLOv8n or YOLOv8m | Best balance of speed and accuracy on RTX 4050 at 1080p input; nano too imprecise, medium too slow for 15fps target | 2026-04-27 |
| SQLite over PostgreSQL | No infra overhead; this is edge/field-deployed system; Prisma makes migration to Postgres trivial later | 2026-04-27 |
| FastAPI WebSocket over socket.io | Native async support; no JS server needed; easier to integrate with Python inference pipeline | 2026-04-27 |
| Base64 JPEG over raw frame streaming | Avoids binary frame protocol complexity; JPEG at quality 75 is bandwidth-efficient; browser decodes natively | 2026-04-27 |
| Canvas RAF loop separate from React state | Prevents React re-render cascade on every frame; canvas draws at native speed without VDOM overhead | 2026-04-27 |
| Buffered WebSocket (100ms flush) over direct setState | Prevents UI thread flooding at 15fps; decouples WebSocket message rate from React render cycle | 2026-04-27 |
| mediamtx for RTSP on Pi over gstreamer | Simpler setup, single binary, no GStreamer pipeline debugging; supports libcamera output directly | 2026-04-27 |
| React.memo + custom comparator on MapView | Leaflet map must never remount; only update markers when detection count or triage status changes | 2026-04-27 |
| CartoDB Dark tiles for map | Free, no API key required, dark theme matches dashboard aesthetic | 2026-04-27 |
| Pixel-to-GPS bbox hash for track_id | YOLOv8s base model has no built-in tracker; bbox-cell hashing provides stable IDs for triage across frames | 2026-04-27 |
| `MODE=recorded` as default | Ensures the app runs on any machine without a Pi; lowers barrier to demo and judging | 2026-04-27 |
| Prisma Python client with asyncio interface | Matches FastAPI's async architecture; avoids blocking DB writes on the WebSocket event loop | 2026-04-27 |

---

## 6. Revision History

| Version | Date | Changes Made |
|---------|------|--------------|
| v1 | 2026-04-27 | Initial implementation plan created. All 6 phases defined, full tech stack documented, decision log initialized. |
| v2 | 2026-04-27 | Explicitly added generation of `layout.tsx`, `tailwind.config.ts`, and `tsconfig.json` to Phase 3 checkboxes. |
