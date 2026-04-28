# Kairos — Work Log

> AI-Powered Drone Surveillance for Rapid Crisis Response  
> Log every step. Major or minor. No exceptions.

---

## Log Format

```
### [DATE] — [SHORT TITLE]
**Session:** [Start time – End time]
**Type:** Major / Minor / Bug Fix / Error / Config
**Description:** What was done or attempted
**Outcome:** Result or current status
**Error (if any):** Exact error message or issue
**Solution:** How it was resolved (fill after fix)
```

---

### 2026-04-28 — Fine-tuning & Taxonomy Update
**Session:** 18:38 IST – Ongoing
**Type:** Major
**Description:** Updated the project to use a 5-class tactical taxonomy (person, vehicle, fire, smoke, debris) as per the objective. Modified `training/prep_dataset.py`, `training/dataset.yaml`, and `backend/inference.py` to support these classes. Executed the data preparation script and initiated the YOLOv8s fine-tuning pipeline on the VisDrone2019 dataset.
**Outcome:** Dataset prepared with 548 images (438 train / 110 val). Fine-tuning in progress.
**Error (if any):** None
**Solution:** N/A

### 2026-04-27 — Dashboard UI Bug Fixes
**Session:** 03:47 IST – 03:55 IST
**Type:** Bug Fix
**Description:** Addressed major UI collapse and overlapping issues on the frontend. Created missing `postcss.config.js` to enable Tailwind CSS compilation, which resolved all `flex` and `grid` overlapping layout breakages. Refactored `AlertBanner.tsx` to return an empty `display: none` div instead of `null` to preserve CSS Grid track structure. Removed restrictive SRI hashes from `layout.tsx` to ensure Leaflet maps load correctly.
**Outcome:** Dashboard layout is fully restored, responsive, and visually stable. All components correctly constrained to their designated grid sectors.
**Error (if any):** UI Overlap, Leaflet script integrity failure.
**Solution:** Added PostCSS config, patched React conditional render, removed SRI hashes.

---

### 2026-04-27 — System Integration & Testing
**Session:** 03:37 IST – 03:45 IST
**Type:** Major
**Description:** Downloaded VisDrone test video using yt-dlp to `backend/assets/visdrone_demo.mp4`. Created `models` directory to store weights. Resolved PyTorch 2.6 CUDA initialization bug by ensuring device fallback in `inference.py` and upgrading Ultralytics. Fixed Prisma schema generation Pydantic validation error by removing `recursive_model_sort`. Verified end-to-end data flow: backend successfully processing RTSP/video frames through YOLOv8s inference and pushing coordinate/triage state via WebSocket to Next.js frontend.
**Outcome:** Full stack operational. Next.js dashboard correctly rendering video frames over canvas with bounding boxes. Detections currently show some "unknown" classes because the base YOLOv8 COCO weights are in use prior to running the fine-tuning script.
**Error (if any):** `Invalid CUDA 'device=0'` (PyTorch 2.6 mismatch), `spawn prisma-client-py ENOENT` (Prisma validation).
**Solution:** Upgraded Ultralytics, implemented `torch.cuda.is_available()` check, removed `recursive_model_sort`.

---

### 2026-04-27 — Implementation Phase 1 & 2 Execution
**Session:** 03:27 IST – 03:30 IST
**Type:** Major
**Description:** Generated all core backend Python files (`main.py`, `inference.py`, `triage.py`, `gps.py`, `stream.py`, `schema.prisma`) and Next.js frontend components (`VideoCanvas`, `MapView`, `TopBar`, `AlertBanner`, `SystemStatus`, `page.tsx`, etc.). Executed background commands to set up Python virtual environment (`pip install`), initialized Prisma SQLite db, and installed Next.js dependencies (`npm install`). Generated YOLOv8 fine-tuning script (`train.py`) and Pi setup bash script.
**Outcome:** All application files successfully created from the spec. Virtual environments and `node_modules` are installing/completed.
**Error (if any):** None
**Solution:** N/A

---

### 2026-04-27 — Project Initialization & Documentation

**Session:** 03:20 IST – Ongoing  
**Type:** Major  
**Description:** Project Kairos officially started. Full architecture defined. Generated all 5 project documentation files: `implementationv1.md`, `worklog.md`, `userguide.md`, `FlawsAndSolutions.md`, `README.md`. Tech stack finalized. Decision log populated with 12 architectural decisions. Implementation plan broken into 6 phases with checkbox sub-tasks.  
**Outcome:** All 5 documentation files created. Ready to begin Phase 1 — folder structure + environment setup.  
**Error (if any):** None  
**Solution:** N/A

---

<!-- 
=== TEMPLATE FOR NEXT ENTRY — COPY AND FILL ===

### YYYY-MM-DD — [SHORT TITLE]
**Session:** HH:MM IST – HH:MM IST
**Type:** Major / Minor / Bug Fix / Error / Config
**Description:** 
**Outcome:** 
**Error (if any):** 
**Solution:** 

-->

---

## Error Index

> Quick-reference table of all errors encountered. Fill as issues arise.

| # | Date | Component | Error Summary | Status |
|---|------|-----------|---------------|--------|
| — | — | — | No errors logged yet | — |

---

## Commands Run Log

> Every terminal command executed, in order.

| # | Date | Terminal | Command | Result |
|---|------|----------|---------|--------|
| 1 | 2026-04-27 | — | Documentation files generated (no commands run yet) | ✓ |
| 2 | 2026-04-27 | Backend | `python -m venv venv && pip install -r requirements.txt && prisma generate && prisma db push` | Running |
| 3 | 2026-04-27 | Frontend | `npm install` | ✓ |

---

## Notes

- Keep entries in **reverse chronological order** (newest at top of the log section, above this template block).
- For errors: log immediately, fill `Solution` after fixing.
- Mark session end time when switching away from the project.
