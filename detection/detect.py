import cv2
from ultralytics import YOLO
import yt_dlp
import datetime

# ─── FUNCTION: Get YouTube Stream ───────────────────────────
def get_stream_url(youtube_url):
    ydl_opts = {
        'format': 'best[ext=mp4]/best',
        'quiet': True
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(youtube_url, download=False)
        return info['url']

# ─── DRONE TRIGGER FUNCTION ──────────────────────────
def trigger_drone():
    print("Drone trigger activated")
    # Integration point for drone system

# ─── YOUR VIDEO ──────────────────────────────────────
YOUTUBE_URL = "https://www.youtube.com/watch?v=F9OpS2UxNgg"

# ─── LOAD MODEL ──────────────────────────────────────
model = YOLO('best_drone.pt')

print("Fetching YouTube stream...")
stream_url = get_stream_url(YOUTUBE_URL)
print("Stream found. Starting detection...")

cap = cv2.VideoCapture(stream_url)

if not cap.isOpened():
    print("Could not open stream.")
    exit()

print("Detection running. Press 'q' to quit")

# ─── PARAMETERS ──────────────────────────────────────
detection_count = 0
MAX_COUNT = 10
ALERT_THRESHOLD = 5
alert_triggered = False

while True:
    ret, frame = cap.read()
    if not ret:
        print("Stream ended.")
        break

    # Resize frame
    frame = cv2.resize(frame, (1280, 720))

    # Optional zoom
    h, w, _ = frame.shape
    frame = frame[int(h * 0.1):h, int(w * 0.1):w]

    # Run YOLO with lower confidence
    results = model(frame, conf=0.15)

    annotated_frame = results[0].plot()

    fire = False
    smoke = False

    # Process detections
    for box in results[0].boxes:
        cls = results[0].names[int(box.cls)]
        conf = float(box.conf)

        print(f"{cls} detected with confidence {conf:.2f}")

        if cls == 'fire' and conf > 0.25:
            fire = True

        if cls == 'smoke' and conf > 0.15:
            smoke = True

    # Smooth detection counter
    if fire or smoke:
        detection_count = min(detection_count + 1, MAX_COUNT)
    else:
        detection_count = max(detection_count - 1, 0)

    # Risk logic based on stability
    if detection_count >= ALERT_THRESHOLD:
        risk = "HIGH"
    elif detection_count > 0:
        risk = "MEDIUM"
    else:
        risk = "LOW"

    # Trigger alert once
    if detection_count >= ALERT_THRESHOLD and not alert_triggered:
        print("ALERT TRIGGERED")
        trigger_drone()
        alert_triggered = True

    if detection_count == 0:
        alert_triggered = False

    # UI colors
    if risk == "HIGH":
        color = (0, 0, 255)
    elif risk == "MEDIUM":
        color = (0, 255, 255)
    else:
        color = (0, 255, 0)

    # Draw border
    cv2.rectangle(
        annotated_frame,
        (0, 0),
        (annotated_frame.shape[1], annotated_frame.shape[0]),
        color,
        5
    )

    # Display risk
    cv2.putText(
        annotated_frame,
        f"Risk: {risk}",
        (20, 100),
        cv2.FONT_HERSHEY_SIMPLEX,
        1,
        color,
        2
    )

    # Alert text
    if detection_count >= ALERT_THRESHOLD:
        cv2.putText(
            annotated_frame,
            "ALERT: FIRE/SMOKE DETECTED",
            (20, 50),
            cv2.FONT_HERSHEY_SIMPLEX,
            1,
            (0, 0, 255),
            3
        )

    # Timestamp overlay
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cv2.putText(
        annotated_frame,
        f"CCTV CAM 01 | {timestamp}",
        (10, annotated_frame.shape[0] - 10),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.5,
        (255, 255, 255),
        1
    )

    # Display frame
    cv2.imshow('Fire and Smoke Detection', annotated_frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()