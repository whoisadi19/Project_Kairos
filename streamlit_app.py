import streamlit as st
import cv2
import numpy as np
import os
import time
from ultralytics import YOLO
import folium
from streamlit_folium import st_folium
from collections import defaultdict
import PIL.Image

# --- STYLING ---
st.set_page_config(page_title="Kairos Tactical Dashboard", layout="wide", initial_sidebar_state="expanded")

st.markdown("""
    <style>
    .main { background-color: #090b0f; color: #eef3f8; }
    .stMetric { background-color: #10141b; border: 1px solid #1b222c; padding: 10px; border-radius: 5px; }
    .stSidebar { background-color: #10141b; }
    h1, h2, h3 { color: #7dd3fc !important; font-family: 'Inter', sans-serif; }
    .critical-alert { color: #ef4444; font-weight: bold; animation: blinker 1.5s linear infinite; }
    @keyframes blinker { 50% { opacity: 0; } }
    </style>
    """, unsafe_allow_html=True)

# --- LOGIC CLASSES (Mirrored from backend) ---
class TriageTracker:
    def __init__(self, stillness_frames=10, movement_threshold=15):
        self.history = defaultdict(list)
        self.stillness_frames = stillness_frames
        self.movement_threshold = movement_threshold

    def get_triage(self, track_id, cx, cy, class_name):
        if class_name != "person": return None
        self.history[track_id].append((cx, cy))
        if len(self.history[track_id]) > self.stillness_frames: self.history[track_id].pop(0)
        if len(self.history[track_id]) < self.stillness_frames: return "STABLE"
        positions = self.history[track_id]
        total_movement = sum(abs(positions[i][0] - positions[i-1][0]) + abs(positions[i][1] - positions[i-1][1]) for i in range(1, len(positions)))
        return "CRITICAL" if total_movement < self.movement_threshold else "STABLE"

def pixel_to_gps(cx, cy, frame_w=1920, frame_h=1080):
    # Simplified mock for Nashik region
    base_lat, base_lng = 19.9975, 73.7898
    lat = base_lat + (0.5 - cy / frame_h) * 0.01
    lng = base_lng + (cx / frame_w - 0.5) * 0.01
    return round(lat, 6), round(lng, 6)

# --- LOAD MODEL ---
@st.cache_resource
def load_model():
    model_path = os.path.join(os.getcwd(), "models", "yolov8s.pt")
    if not os.path.exists(model_path):
        # Fallback to current dir if not in models/
        model_path = "yolov8s.pt"
    model = YOLO(model_path)
    return model

model = load_model()
triage_tracker = TriageTracker()

# --- SIDEBAR ---
st.sidebar.title("Kairos Control")
mode = st.sidebar.selectbox("Feed Mode", ["Demo (Recorded)", "Live RTSP Stream"])
conf_threshold = st.sidebar.slider("Confidence Threshold", 0.1, 0.9, 0.35)
iou_threshold = st.sidebar.slider("IOU Threshold", 0.1, 0.9, 0.55)
enabled_classes = st.sidebar.multiselect("Active Classes", ["person", "vehicle", "fire", "smoke", "debris"], default=["person", "vehicle"])

# --- HEADER ---
col1, col2, col3, col4 = st.columns(4)
with col1:
    st.image("https://img.icons8.com/fluency/48/000000/drone.png", width=48)
    st.subheader("Project Kairos")
with col2:
    critical_placeholder = st.empty()
with col3:
    st.metric("System Load", "Low", delta="Nominal")
with col4:
    st.metric("Uptime", "10:24", delta="+01:00")

# --- MAIN LAYOUT ---
main_col, side_col = st.columns([2, 1])

with main_col:
    st.markdown("### 🚁 Aerial Observation Feed")
    video_placeholder = st.empty()
    
    st.markdown("### 🗺️ Tactical Map")
    map_placeholder = st.empty()

with side_col:
    st.markdown("### 🚨 Incident Queue")
    incident_placeholder = st.empty()
    
    st.markdown("### 📊 Triage Summary")
    triage_placeholder = st.empty()

# --- STREAMING LOGIC ---
def run_app():
    # Use a dummy video or camera for demo
    # Robust path finding for Streamlit Cloud
    video_source = 0 if mode == "Live RTSP Stream" else "backend/assets/visdrone_demo.mp4"
    if mode != "Live RTSP Stream" and not os.path.exists(str(video_source)):
        # Try local path if relative fails
        video_source = "visdrone_demo.mp4"
        if not os.path.exists(str(video_source)):
            st.error("Demo video not found. Please ensure 'backend/assets/visdrone_demo.mp4' is in the repository.")
            return

    cap = cv2.VideoCapture(video_source)
    frame_id = 0
    
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret: 
            if mode == "Demo (Recorded)": cap.set(cv2.CAP_PROP_POS_FRAMES, 0); continue
            else: break
            
        frame_id += 1
        img = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        h, w = img.shape[:2]
        
        # Inference
        results = model(img, conf=conf_threshold, iou=iou_threshold, verbose=False)[0]
        
        detections = []
        active_ids = set()
        
        for box in results.boxes:
            cls_id = int(box.cls[0])
            class_name = model.names[cls_id]
            if class_name not in enabled_classes: continue
            
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            conf = float(box.conf[0])
            cx, cy = (x1 + x2) / 2, (y1 + y2) / 2
            
            track_id = f"{cls_id}_{int(cx // 50)}_{int(cy // 50)}"
            active_ids.add(track_id)
            
            triage = triage_tracker.get_triage(track_id, cx, cy, class_name)
            lat, lng = pixel_to_gps(cx, cy, w, h)
            
            detections.append({
                "label": f"{class_name.upper()} {triage if triage else ''}",
                "conf": conf,
                "box": [x1, y1, x2, y2],
                "color": (239, 68, 68) if triage == "CRITICAL" else (34, 197, 94) if triage == "STABLE" else (96, 165, 250),
                "lat": lat, "lng": lng, "class": class_name, "triage": triage
            })
        
        # Draw
        for d in detections:
            x1, y1, x2, y2 = map(int, d["box"])
            cv2.rectangle(img, (x1, y1), (x2, y2), d["color"], 3)
            cv2.putText(img, d["label"], (x1, y1-10), cv2.FONT_HERSHEY_SIMPLEX, 0.7, d["color"], 2)
            
        # Update UI
        video_placeholder.image(img, use_column_width=True)
        
        critical_count = len([d for d in detections if d["triage"] == "CRITICAL"])
        if critical_count > 0:
            critical_placeholder.markdown(f"<div class='critical-alert'>🚨 {critical_count} CRITICAL INCIDENTS</div>", unsafe_allow_html=True)
        else:
            critical_placeholder.markdown("<div style='color: #22c55e'>✅ AREA SECURE</div>", unsafe_allow_html=True)
            
        # Triage Summary
        summary_df = { "Class": [d["label"] for d in detections], "Confidence": [f"{d['conf']:.2f}" for d in detections] }
        triage_placeholder.table(summary_df)
        
        # Map (update every 30 frames to avoid lag)
        if frame_id % 30 == 0:
            m = folium.Map(location=[19.9975, 73.7898], zoom_start=15, tiles="CartoDB dark_matter")
            for d in detections:
                folium.CircleMarker([d["lat"], d["lng"]], radius=5, color="red" if d["triage"]=="CRITICAL" else "blue", fill=True).add_to(m)
            with map_placeholder:
                st_folium(m, height=300, width=700, key=f"map_{frame_id}")

        time.sleep(0.01)

if __name__ == "__main__":
    run_app()
