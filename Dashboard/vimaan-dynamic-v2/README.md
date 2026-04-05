# VIMAAN DYNAMIC v2
### Urban Drone Response Command Platform

A real-time drone fleet management dashboard for urban surveillance and incident response, built with Leaflet.js, TensorFlow.js (COCO-SSD), and a ROS/MAVLink simulation layer.

---

## 🗂️ Project Structure

```
vimaan-dynamic-v2/
├── index.html          # Main entry point (lean shell — links CSS & JS)
├── css/
│   └── main.css        # All styles, CSS variables, responsive layout
├── js/
│   └── app.js          # Full application logic (state, rendering, simulation)
├── assets/             # Static assets (icons, images — add as needed)
├── .gitignore
└── README.md
```

---

## 🚀 Quick Start

No build step required — pure HTML/CSS/JS.

```bash
# Clone the repo
git clone <your-repo-url>
cd vimaan-dynamic-v2

# Serve locally (any static server works)
npx serve .
# or
python3 -m http.server 8080
# or just open index.html directly in a browser
```

Then open `http://localhost:8080` (or the file directly).

---

## 🗺️ Map Modes

| Mode       | Tile Provider         | Description                          |
|------------|----------------------|--------------------------------------|
| **GREY**   | CartoDB Light        | Default — clear, high-visibility grey |
| **DARK**   | CartoDB Dark Matter  | Tactical dark overlay               |
| **SATELLITE** | ESRI World Imagery | Real-world aerial view              |
| **TERRAIN** | OpenStreetMap       | Standard street + terrain view      |

---

## ⚙️ Features

- **Live Drone Fleet** — 6 drones with Bezier-curve path navigation and obstacle avoidance
- **Incident Management** — Real-time incident queue with auto-dispatch and ETA tracking
- **Geofence Zones** — Exclusion and operational zones overlaid on map
- **YOLO Object Detection** — Live webcam feed with COCO-SSD inference via TensorFlow.js
- **ROS/MAVLink Simulation** — PX4/MAVSDK simulation tab with ROSBridge WebSocket support
- **Operational Boundary** — Polygon flight-zone enforcement with breach alerts
- **Coordinate Tracking** — Live lat/lng for all drones and incidents (Pune grid)

---

## 🛰️ ROS Integration

Connect a live `rosbridge_server` on `ws://localhost:9090` to receive real drone telemetry:

```bash
# Start ROSBridge (ROS2)
ros2 launch rosbridge_server rosbridge_websocket_launch.xml

# Expected topics
/mavros/state                   # mavros_msgs/State
/mavros/local_position/pose     # geometry_msgs/PoseStamped
/yolov8/detections              # vision_msgs/Detection2DArray
/camera/image_raw               # sensor_msgs/Image
```

Without a live connection the platform runs in **simulation mode** automatically.

---

## 📦 Dependencies (CDN — no npm install needed)

| Library          | Version | Purpose                        |
|-----------------|---------|--------------------------------|
| Leaflet.js       | 1.9.4   | Interactive map                |
| leaflet.heat     | 0.2.0   | Incident heatmap layer         |
| TensorFlow.js    | 4.10.0  | ML inference runtime           |
| COCO-SSD         | 2.2.2   | Real-time object detection     |
| JetBrains Mono   | —       | Primary monospace font         |
| Syne / Space Mono| —       | UI accent fonts                |

---

## 📍 Coordinate Reference

The platform uses **Pune, India** as its operational grid:

```
Bounds:  N 18.605° | S 18.435° | W 73.775° | E 73.955°
Centre:  18.5204°N, 73.8567°E
```

---

## 📄 License

MIT — see LICENSE for details.
