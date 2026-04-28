import os
import asyncio
import time
import base64
from contextlib import asynccontextmanager

import cv2
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

load_dotenv()

from stream import frame_stream
from inference import run_inference, get_model_status
from prisma import Prisma

db = Prisma()

# FPS tracking
fps_counter = {"frames": 0, "start": time.time(), "fps": 0}
frame_id_counter = {"count": 0}

# Log rate limiting: per class, max 1 log per 5 seconds
log_timestamps = {}
LOG_INTERVAL = 5.0
LOG_CONFIDENCE_THRESHOLD = 0.5

@asynccontextmanager
async def lifespan(app: FastAPI):
    await db.connect()
    yield
    await db.disconnect()
    frame_stream.release()

app = FastAPI(
    title="Kairos API",
    description="AI-Powered Drone Crisis Response",
    lifespan=lifespan
)

frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url],
    allow_methods=["*"],
    allow_headers=["*"]
)

@app.get("/health")
async def health():
    elapsed = time.time() - fps_counter["start"]
    if elapsed > 1:
        fps_counter["fps"] = fps_counter["frames"] / elapsed
        fps_counter["frames"] = 0
        fps_counter["start"] = time.time()

    db_ok = True
    db_error = None
    try:
        await db.detection.find_many(take=1)
    except Exception as exc:
        db_ok = False
        db_error = str(exc)

    stream_status = frame_stream.status()
    model_status = get_model_status()

    return {
        "status": "online",
        "mode": stream_status["mode"],
        "fps": round(fps_counter["fps"], 1),
        "frame_id": frame_id_counter["count"],
        "stream_ok": stream_status["stream_ok"],
        "stream_source": stream_status["source"],
        "stream_error": stream_status["last_error"],
        "db_ok": db_ok,
        "db_error": db_error,
        **model_status
    }

@app.post("/mode")
async def switch_mode(body: dict):
    new_mode = body.get("mode", "recorded")
    if new_mode not in ("live", "recorded"):
        return JSONResponse(
            {"error": "Invalid mode"}, 
            status_code=400
        )
    frame_stream.switch_mode(new_mode)
    return {"mode": new_mode, "status": "switched"}

@app.get("/detections/history")
async def get_history(limit: int = 50):
    detections = await db.detection.find_many(
        order={"timestamp": "desc"},
        take=limit
    )
    return detections

@app.websocket("/ws/kairos")
async def kairos_websocket(websocket: WebSocket):
    await websocket.accept()
    
    try:
        while True:
            loop = asyncio.get_event_loop()
            start = time.time()

            # Read frame
            frame = await loop.run_in_executor(
                None, frame_stream.read_frame
            )
            
            if frame is None:
                await websocket.send_json({
                    "type": "signal_lost",
                    "frame_id": frame_id_counter["count"]
                })
                await asyncio.sleep(0.5)
                continue

            frame_id_counter["count"] += 1
            fid = frame_id_counter["count"]

            # Run inference on executor — never blocks WS loop
            detections = await loop.run_in_executor(
                None, run_inference, frame, fid
            )

            # Encode frame as JPEG base64 for video feed
            # Only send every frame for video
            # Send detections separately
            _, jpeg = cv2.imencode(
                '.jpg', frame, 
                [cv2.IMWRITE_JPEG_QUALITY, 75]
            )
            frame_b64 = base64.b64encode(
                jpeg.tobytes()
            ).decode('utf-8')

            # Send combined message
            await websocket.send_json({
                "type": "frame",
                "frame_id": fid,
                "frame": frame_b64,
                "detections": detections,
                "mode": frame_stream.current_mode
            })

            # Log critical/high-confidence detections
            # with rate limiting
            for det in detections:
                if det["confidence"] < LOG_CONFIDENCE_THRESHOLD:
                    continue
                if det["triage"] != "CRITICAL" and \
                   det["class_name"] not in ("fire", "smoke"):
                    continue

                cache_key = f"{det['class_name']}_{det['triage']}"
                last_logged = log_timestamps.get(cache_key, 0)
                
                if time.time() - last_logged > LOG_INTERVAL:
                    log_timestamps[cache_key] = time.time()
                    await db.detection.create(data={
                        "class_name": det["class_name"],
                        "confidence": det["confidence"],
                        "triage":     det.get("triage"),
                        "lat":        det["lat"],
                        "lng":        det["lng"],
                        "x":          det["x"],
                        "y":          det["y"],
                        "w":          det["w"],
                        "h":          det["h"],
                        "frame_id":   fid
                    })

            # FPS tracking
            fps_counter["frames"] += 1

            # Maintain ~15fps
            elapsed = time.time() - start
            sleep_time = max(0, (1/15) - elapsed)
            await asyncio.sleep(sleep_time)

    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"WebSocket error: {e}")
        await websocket.close()
