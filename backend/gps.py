import os

BASE_LAT = float(os.getenv("BASE_LAT", "19.9975"))
BASE_LNG = float(os.getenv("BASE_LNG", "73.7898"))

FRAME_W = 1920
FRAME_H = 1080

# Maps pixel (x, y) center of bounding box
# to lat/lng offsets around Nashik, India
# Covers a 0.05 degree box (~5.5km x ~5.5km)

def pixel_to_gps(px: float, py: float) -> tuple:
    lat = BASE_LAT + ((py / FRAME_H) - 0.5) * 0.05
    lng = BASE_LNG + ((px / FRAME_W) - 0.5) * 0.05
    return round(lat, 6), round(lng, 6)
