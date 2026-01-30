#include "OV7670.h"
#include <WiFi.h>
#include <WiFiUdp.h>
#include "esp_wifi.h"

// Camera pins
const int SIOD = 21, SIOC = 22, VSYNC = 34, HREF = 35;
const int XCLK = 32, PCLK = 33;
const int D0 = 27, D1 = 17, D2 = 16, D3 = 15;
const int D4 = 14, D5 = 13, D6 = 12, D7 = 4;

// Hardware
const int BUZZER_PIN = 25;
const int IR_LED_PIN = 26;

// WiFi
const char* ssid = "ESP32_Drowsy";
const char* password = "12345678";

// UDP
WiFiUDP udp;
WiFiUDP cmdUdp;
const char* targetIP = "192.168.4.255";
const int targetPort = 5000;
const int commandPort = 8889;

// Simple 80x60 grayscale
const int WIDTH = 80;
const int HEIGHT = 60;
const int CHUNK_SIZE = 800;  // Smaller chunks for reliability
uint16_t frameCounter = 0;

OV7670 *camera;

struct __attribute__((packed)) PacketHeader {
  uint16_t magic;
  uint16_t frameId;
  uint16_t chunkId;
  uint16_t chunksTotal;
  uint16_t payloadLen;
  uint16_t flags;
};

unsigned long buzzerStartTime = 0;
bool buzzerActive = false;

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(IR_LED_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);
  digitalWrite(IR_LED_PIN, HIGH);
  
  Serial.println("\n=== ESP32 DROWSINESS MONITOR ===");
  
  // AP mode
  WiFi.softAP(ssid, password);
  WiFi.setSleep(false);
  esp_wifi_set_ps(WIFI_PS_NONE);
  
  Serial.print("AP IP: ");
  Serial.println(WiFi.softAPIP());
  Serial.println("WiFi: ESP32_Drowsy / 12345678");
  
  udp.begin(8888);
  cmdUdp.begin(commandPort);
  Serial.println("UDP ready");
  
  Serial.println("Starting camera...");
  camera = new OV7670(OV7670::Mode::QQQVGA_RGB565, SIOD, SIOC, VSYNC, HREF, XCLK, PCLK, 
                      D0, D1, D2, D3, D4, D5, D6, D7);
  
  delay(500);
  Serial.println("✓ Camera ready!\n");
}

void loop() {
  static unsigned long lastCapture = 0;
  static unsigned long lastStats = 0;
  static int framesSent = 0;
  unsigned long now = millis();
  
  checkForCommands();
  
  if (buzzerActive && (now - buzzerStartTime > 3000)) {
    digitalWrite(BUZZER_PIN, LOW);
    buzzerActive = false;
  }
  
  // 10 FPS
  if (now - lastCapture >= 100) {
    lastCapture = now;
    camera->oneFrame();
    sendFrameUDP();
    framesSent++;
  }
  
  if (now - lastStats >= 3000) {
    Serial.printf("FPS: %.1f | Clients: %d | Frame: %d\n", 
                  framesSent/3.0, WiFi.softAPgetStationNum(), frameCounter);
    framesSent = 0;
    lastStats = now;
  }
}

void checkForCommands() {
  int packetSize = cmdUdp.parsePacket();
  if (packetSize) {
    char command[32];
    int len = cmdUdp.read(command, 31);
    command[len] = '\0';
    
    if (strcmp(command, "BUZZER_ON") == 0) {
      digitalWrite(BUZZER_PIN, HIGH);
      buzzerActive = true;
      buzzerStartTime = millis();
      Serial.println("🚨 ALERT!");
    }
  }
}

void sendFrameUDP() {
  unsigned char* frameData = camera->frame;
  const int FRAME_SIZE = WIDTH * HEIGHT;
  static uint8_t grayFrame[WIDTH * HEIGHT];
  
  // Convert RGB565 -> Grayscale
  for (int i = 0; i < FRAME_SIZE; i++) {
    uint16_t pixel = ((uint16_t)frameData[i*2+1] << 8) | frameData[i*2];
    uint8_t r = ((pixel >> 11) & 0x1F) << 3;
    uint8_t g = ((pixel >> 5) & 0x3F) << 2;
    uint8_t b = (pixel & 0x1F) << 3;
    grayFrame[i] = (r * 77 + g * 151 + b * 28) >> 8;
  }
  
  // Calculate chunks
  int chunksTotal = (FRAME_SIZE + CHUNK_SIZE - 1) / CHUNK_SIZE;
  
  // Send each chunk
  for (int chunkId = 0; chunkId < chunksTotal; chunkId++) {
    int offset = chunkId * CHUNK_SIZE;
    int payloadLen = min(CHUNK_SIZE, FRAME_SIZE - offset);
    
    PacketHeader header;
    header.magic = 0xCAFE;
    header.frameId = frameCounter;
    header.chunkId = chunkId;
    header.chunksTotal = chunksTotal;
    header.payloadLen = payloadLen;
    header.flags = 0;
    
    udp.beginPacket(targetIP, targetPort);
    udp.write((uint8_t*)&header, sizeof(PacketHeader));
    udp.write(grayFrame + offset, payloadLen);
    udp.endPacket();
    
    delayMicroseconds(200);  // More delay for stability
  }
  
  frameCounter++;
}
