#include <WiFi.h>
#include <HTTPClient.h>
#include <WebSocketsClient.h>
#include <Ultrasonic.h>
#include <NTPClient.h>
#include <WiFiUdp.h>
#include <time.h>

const char* ssid = "";  
const char* password = "";

Ultrasonic ultrasonic(13, 23); 

WebSocketsClient webSocket;

const int segmentPins[8] = {
  12, 
  26, 
  4,  
  2,  
  15, 
  14, 
  5,  
  13  
};

const int digitPins[4] = {
  32, 
  27, 
  25, 
  22  
};

const byte digitMap[10] = {
  0b11000000, 
  0b11111001, 
  0b10100100, 
  0b10110000, 
  0b10011001, 
  0b10010010, 
  0b10000010, 
  0b11111000, 
  0b10000000, 
  0b10010000  
};

const int buzzerPin = 19;

int entranceCount = 0;
unsigned long lastDetectionTime = 0;
const unsigned long debounceDelay = 1000;
const int detectionThreshold = 100;
bool showTime = false;
unsigned long timeDisplayStart = 0;

WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "pool.ntp.org", -6 * 3600, 60000); 

void displayNumber(int num) {
  int digits[4] = {
    (num / 1000) % 10,
    (num / 100) % 10,
    (num / 10) % 10,
    num % 10
  };

  for (int d = 0; d < 4; d++) {

    for (int i = 0; i < 4; i++) digitalWrite(digitPins[i], HIGH);

    byte segments = digitMap[digits[d]];

    for (int s = 0; s < 7; s++) {
      digitalWrite(segmentPins[s], bitRead(segments, s) ? LOW : HIGH);
    }

    digitalWrite(digitPins[d], LOW);

    delay(5); 
  }
}

void fetchInitialCount() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin("https://ceb-enp2-c86949157183.herokuapp.com/entradasHoy");
    int httpCode = http.GET();
    if (httpCode == 200) {
      String payload = http.getString();
      int index = payload.indexOf("\"data\":");
      if (index != -1) {
        entranceCount = payload.substring(index + 7).toInt();
        Serial.printf("Initial count: %d\n", entranceCount);
      }
    }
    http.end();
  }
}

void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  if (type == WStype_CONNECTED) {
    Serial.println("WebSocket connected");
  } else if (type == WStype_DISCONNECTED) {
    Serial.println("WebSocket disconnected");
  } else if (type == WStype_TEXT) {
    Serial.printf("Received message: %s\n", payload);
  }
}

void setup() {
  Serial.begin(115200);

  for (int i = 0; i < 8; i++) pinMode(segmentPins[i], OUTPUT);
  for (int i = 0; i < 4; i++) pinMode(digitPins[i], OUTPUT);

  pinMode(buzzerPin, OUTPUT);
  digitalWrite(buzzerPin, LOW);

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected");

  timeClient.begin();
  fetchInitialCount();
  webSocket.beginSSL("ceb-enp2-c86949157183.herokuapp.com", 443, "/");
  webSocket.onEvent(webSocketEvent);
}

void loop() {
  webSocket.loop();
  timeClient.update();

  unsigned long now = millis();

  if (showTime && (now - timeDisplayStart < 1500)) {

    int hour = timeClient.getHours();
    int minute = timeClient.getMinutes();
    int timeToDisplay = hour * 100 + minute; 
    displayNumber(timeToDisplay);
  } else {
    showTime = false;
    for (int i = 0; i < 20; i++) {
      displayNumber(entranceCount);
    }
  }

  float distance = ultrasonic.read();
  if (distance > 0 && distance < detectionThreshold) {
    unsigned long currentTime = millis();
    if (currentTime - lastDetectionTime > debounceDelay) {
      entranceCount++;
      webSocket.sendTXT("Person detected!");
      lastDetectionTime = currentTime;
      Serial.printf("Person detected! New count: %d\n", entranceCount);

      digitalWrite(buzzerPin, HIGH);
      delay(100);
      digitalWrite(buzzerPin, LOW);

      showTime = true;
      timeDisplayStart = millis();
    }
  }
}
