# Fire and Smoke Detection System

This project uses YOLOv8 for real-time fire and smoke detection from CCTV/video streams.

## Features
- Real-time detection using YOLOv8
- Smoke and fire classification
- Risk level classification (LOW / MEDIUM / HIGH)
- Alert triggering system
- Works with video streams (YouTube/OpenCV)

## Setup

Install dependencies:

pip install ultralytics opencv-python yt-dlp

## Usage

Place your trained model file (`best_drone.pt`) in the project directory.

Run:

python detection/detect.py

## Notes
- The model file is not included due to size constraints.
- Adjust thresholds in code if needed.

## Demo

### Output 1
![Detection Output](https://github.com/user-attachments/assets/069b173b-f4fa-4eaf-bdd4-2f398ccc8294)

### Output 2
![Detection Output](https://github.com/user-attachments/assets/28ef04c4-6564-45f5-9e4f-c86cfa5ae511)






