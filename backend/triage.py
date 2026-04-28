from collections import defaultdict

# Tracks bounding box positions across frames
# If a person box hasn't moved for STILLNESS_FRAMES
# consecutive frames → CRITICAL, else STABLE

STILLNESS_FRAMES = 10
MOVEMENT_THRESHOLD = 15  # pixels

class TriageTracker:
    def __init__(self):
        self.history = defaultdict(list)
        # key: detection_id (track_id or bbox hash)
        # value: list of (cx, cy) positions

    def get_triage(
        self, 
        track_id: str, 
        cx: float, 
        cy: float, 
        class_name: str
    ) -> str:
        if class_name != "person":
            return None

        self.history[track_id].append((cx, cy))

        # Keep only last N frames
        if len(self.history[track_id]) > STILLNESS_FRAMES:
            self.history[track_id].pop(0)

        if len(self.history[track_id]) < STILLNESS_FRAMES:
            return "STABLE"

        # Check total movement over last N frames
        positions = self.history[track_id]
        total_movement = sum(
            abs(positions[i][0] - positions[i-1][0]) +
            abs(positions[i][1] - positions[i-1][1])
            for i in range(1, len(positions))
        )

        return "CRITICAL" if total_movement < MOVEMENT_THRESHOLD \
               else "STABLE"

    def cleanup(self, active_ids: set):
        # Remove stale track IDs not seen recently
        stale = [k for k in self.history 
                 if k not in active_ids]
        for k in stale:
            del self.history[k]
