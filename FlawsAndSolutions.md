# Kairos — Flaws & Solutions Tracker

> AI-Powered Drone Surveillance for Rapid Crisis Response  
> Last updated: 2026-04-27

---

## Flaw Index

| # | Title | Severity | Status | Reported |
|---|-------|----------|--------|----------|
| — | No flaws logged yet | — | — | — |

---

## Flaw Entries

<!--
=== TEMPLATE — COPY AND FILL ===

### Flaw #N — [SHORT TITLE]
**Reported On:** YYYY-MM-DD
**Severity:** Critical / High / Medium / Low
**Description:** What the flaw is and where it occurs.
**Root Cause:** Why it happened.
**Solution Implemented:** Exact steps taken or code changes made.
**Status:** Fixed / In Progress / Won't Fix

-->

---

## Severity Reference

| Level | Definition |
|-------|------------|
| **Critical** | System cannot run / data corruption |
| **High** | Core feature broken, major UX failure |
| **Medium** | Feature partially broken, workaround exists |
| **Low** | Cosmetic issue, minor edge case |

---

## Known Design Trade-offs (Not Flaws)

| Limitation | Accepted Trade-off |
|------------|-------------------|
| Track IDs based on bbox-cell hash | No built-in SORT tracker in YOLOv8s base; hash is fast and stable for 10-frame triage |
| GPS uses fixed 0.05° box | Accurate GPS requires real sensor; box is sufficient for localized demo area |
| Base64 JPEG over WebSocket | Simpler than binary protocol; JPEG quality 75 is acceptable for dashboard display |
| MapView re-renders only on count/triage change | Prevents Leaflet remount on every frame |
| DB rate-limited to 1 write per class per 5s | Prevents SQLite flooding; may miss very short events |
| No API authentication in v1 | LAN-only field deployment; add auth before internet exposure |
