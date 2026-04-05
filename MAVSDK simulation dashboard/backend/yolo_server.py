from ultralytics import YOLO
import cv2

model = YOLO("yolov8n.pt")

cap = cv2.VideoCapture("videos/cam1.mp4")

while True:
    ret, frame = cap.read()

    if not ret:
        break

    results = model(frame)

    for r in results:
        for box in r.boxes:
            cls = model.names[int(box.cls)]
            conf = float(box.conf)

            if conf > 0.6:
                print("Detected:", cls)
