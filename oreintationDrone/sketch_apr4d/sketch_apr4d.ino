/*
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  HEXACOPTER GCS FIRMWARE — ESP8266 (NodeMCU/D1 Mini)             ║
 * ║  Hardware:                                                       ║
 * ║    IMU    : MPU-6050           → I2C  SDA=D2 (GPIO4) SCL=D1 (GPIO5)║
 * ║    GPS    : GY-NEO6M           → SoftSerial RX=D6 TX=D7           ║
 * ║    SERVO  : Standard Servo     → GPIO D5 (GPIO14)                 ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

#include <ESP8266WiFi.h>
#include <WebSocketsServer.h>
#include <MPU6050.h>
#include <TinyGPS++.h>
#include <ArduinoJson.h>
#include <Servo.h>
#include <SoftwareSerial.h>

// ─── WiFi credentials ───────────────────────────────────────────────
#define WIFI_SSID      "Redmi Note 11 Pro+5G"
#define WIFI_PASSWORD  "psk662006"

// ─── Pin definitions (ESP8266 Mapping) ──────────────────────────────
#define GPS_RX_PIN    12      // D6 on NodeMCU
#define GPS_TX_PIN    13      // D7 on NodeMCU
#define GPS_BAUD      9600
#define SERVO_PIN     14      // D5 on NodeMCU

// ─── Objects ──────────────────────────────────────────────────────────
MPU6050          mpu;
TinyGPSPlus      gps;
WebSocketsServer wsServer(81);
Servo            myServo;
SoftwareSerial   gpsSerial(GPS_RX_PIN, GPS_TX_PIN); // RX, TX

// ─── State ────────────────────────────────────────────────────────────
unsigned long lastTx = 0;
float cfRoll = 0, cfPitch = 0;
unsigned long lastCF = 0;
const float CF_ALPHA = 0.96f;

// ─── Forward Declarations ─────────────────────────────────────────────
void onWebSocketEvent(uint8_t num, WStype_t type, uint8_t* payload, size_t length);
void readIMU(float& roll, float& pitch, float& yaw);
void sendTelemetry();

void setup() {
  Serial.begin(115200);
  
  // I2C for ESP8266 (SDA, SCL)
  Wire.begin(4, 5); // D2, D1
  
  mpu.initialize();
  if (!mpu.testConnection()) {
    Serial.println("[IMU ] MPU-6050 FAILED");
  }

  gpsSerial.begin(GPS_BAUD);
  myServo.attach(SERVO_PIN);
  myServo.write(0);

  // WiFi Connection
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.printf("\n[WiFi] Connected! IP: %s\n", WiFi.localIP().toString().c_str());

  wsServer.begin();
  wsServer.onEvent(onWebSocketEvent);
}

void loop() {
  wsServer.loop();

  while (gpsSerial.available() > 0) {
    gps.encode(gpsSerial.read());
  }

  if (millis() - lastTx >= 50) {
    lastTx = millis();
    sendTelemetry();
  }
}

void readIMU(float& roll, float& pitch, float& yaw) {
  int16_t ax, ay, az, gx, gy, gz;
  mpu.getMotion6(&ax, &ay, &az, &gx, &gy, &gz);

  float dt = (millis() - lastCF) / 1000.0f;
  if (dt <= 0.0f || dt > 0.5f) dt = 0.01f;
  lastCF = millis();

  float accelRoll  = atan2f(ay, az) * 180.0f / PI;
  float accelPitch = atan2f(-ax, sqrtf(ay*ay + az*az)) * 180.0f / PI;

  cfRoll  = CF_ALPHA * (cfRoll  + (gx/131.0f) * dt) + (1.0f - CF_ALPHA) * accelRoll;
  cfPitch = CF_ALPHA * (cfPitch + (gy/131.0f) * dt) + (1.0f - CF_ALPHA) * accelPitch;

  roll = cfRoll;
  pitch = cfPitch;
  
  static float intYaw = 0.0f;
  intYaw += (gz/131.0f) * dt;
  yaw = fmodf(intYaw, 360.0f);
}

void sendTelemetry() {
  float r, p, y;
  readIMU(r, p, y);

  StaticJsonDocument<256> doc;
  doc["roll"]  = round(r * 10) / 10.0;
  doc["pitch"] = round(p * 10) / 10.0;
  doc["yaw"]   = round(y * 10) / 10.0;
  doc["lat"]   = gps.location.isValid() ? gps.location.lat() : 0.0;
  doc["lng"]   = gps.location.isValid() ? gps.location.lng() : 0.0;
  doc["sats"]  = gps.satellites.value();

  String out;
  serializeJson(doc, out);
  wsServer.broadcastTXT(out);
}

void onWebSocketEvent(uint8_t num, WStype_t type, uint8_t* payload, size_t length) {
  if (type == WStype_TEXT) {
    String msg = String((char*)payload).substring(0, length);
    if (msg == "servo:1") myServo.write(90);
    else if (msg == "servo:0") myServo.write(0);
  }
}