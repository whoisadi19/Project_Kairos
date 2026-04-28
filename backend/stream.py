import os
import cv2

MODE = os.getenv("MODE", "recorded")
PI_RTSP_URL = os.getenv(
    "PI_RTSP_URL", 
    "rtsp://192.168.1.100:8554/picam"
)
VIDEO_FILE_PATH = os.getenv(
    "VIDEO_FILE_PATH", 
    "./assets/visdrone_demo.mp4"
)

class FrameStream:
    def __init__(self):
        self.cap = None
        self.current_mode = MODE
        self.last_error = None

    def _open_capture(self):
        if self.cap:
            self.cap.release()
        
        if self.current_mode == "live":
            self.cap = cv2.VideoCapture(PI_RTSP_URL)
            self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        else:
            self.cap = cv2.VideoCapture(VIDEO_FILE_PATH)

        if not self.cap.isOpened():
            self.last_error = f"Cannot open stream: {self.current_mode}"
            print(f"Warning: {self.last_error}")
            self.cap = None
        else:
            self.last_error = None

    def switch_mode(self, new_mode: str):
        self.current_mode = new_mode
        self._open_capture()

    def read_frame(self):
        if self.cap is None:
            self._open_capture()

        if not self.cap or not self.cap.isOpened():
            return None

        ret, frame = self.cap.read()

        if not ret:
            if self.current_mode == "recorded":
                # Loop the video
                self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                ret, frame = self.cap.read()
            if not ret:
                return None

        # Resize to 1920x1080 if needed
        if frame.shape[1] != 1920:
            frame = cv2.resize(frame, (1920, 1080))

        return frame

    def release(self):
        if self.cap:
            self.cap.release()
            self.cap = None

    def status(self):
        return {
            "mode": self.current_mode,
            "stream_ok": bool(self.cap and self.cap.isOpened()),
            "source": PI_RTSP_URL if self.current_mode == "live" else VIDEO_FILE_PATH,
            "last_error": self.last_error
        }

# Global stream instance
frame_stream = FrameStream()
