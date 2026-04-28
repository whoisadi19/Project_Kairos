#!/bin/bash

# Kairos Pi Setup Script
# Sets up RTSP streaming on Raspberry Pi 4
# Run this on the Pi, NOT on the laptop

set -e

echo "========================================="
echo " KAIROS — Raspberry Pi Stream Setup"
echo "========================================="

# Get Pi IP address
PI_IP=$(hostname -I | awk '{print $1}')
echo "Pi IP Address: $PI_IP"
echo "RTSP URL will be: rtsp://$PI_IP:8554/picam"
echo ""

# Download mediamtx
MEDIAMTX_VERSION="v1.5.1"
MEDIAMTX_URL="https://github.com/bluenviron/mediamtx/releases/download/${MEDIAMTX_VERSION}/mediamtx_${MEDIAMTX_VERSION}_linux_arm64v8.tar.gz"

echo "Downloading mediamtx ${MEDIAMTX_VERSION}..."
wget -q "$MEDIAMTX_URL" -O mediamtx.tar.gz
tar -xzf mediamtx.tar.gz
rm mediamtx.tar.gz
chmod +x mediamtx

# Start mediamtx in background
echo "Starting mediamtx RTSP server..."
./mediamtx &
MEDIAMTX_PID=$!
sleep 2

# Start libcamera stream
echo "Starting libcamera-vid stream..."
libcamera-vid \
  --width 1920 \
  --height 1080 \
  --framerate 30 \
  --timeout 0 \
  --codec h264 \
  --inline \
  -o - | \
ffmpeg \
  -re \
  -f h264 \
  -i - \
  -c:v copy \
  -f rtsp \
  rtsp://localhost:8554/picam &

echo ""
echo "========================================="
echo " Stream is LIVE"
echo " RTSP URL: rtsp://$PI_IP:8554/picam"
echo " Copy this URL to your .env:"
echo " PI_RTSP_URL=rtsp://$PI_IP:8554/picam"
echo "========================================="

# Keep script running
wait $MEDIAMTX_PID
