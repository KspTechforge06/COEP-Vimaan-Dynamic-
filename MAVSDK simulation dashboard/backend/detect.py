from ultralytics import YOLO
import cv2
from camera_locations import camera_locations

model = YOLO("yolov8n.pt")

video = "videos/cam1.mp4"

cap = cv2.VideoCapture(video)

while True:

    ret, frame = cap.read()

    if not ret:
        break

    results = model(frame)

    for r in results:
        for box in r.boxes:

            cls = model.names[int(box.cls)]

            if cls == "person":
                print("Incident detected")

                location = camera_locations["cam1"]

                print("Send drone to", location)
