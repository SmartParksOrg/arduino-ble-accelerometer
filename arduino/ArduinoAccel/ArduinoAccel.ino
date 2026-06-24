#include <ArduinoBLE.h>

// For the original Nano 33 BLE Sense:
#include <Arduino_LSM9DS1.h>

// For the Nano 33 BLE Sense Rev2, use this instead of the include above:
// #include <Arduino_BMI270_BMM150.h>

constexpr char kDeviceName[] = "ArduinoAccel";
constexpr char kInitialReading[] = "0,0,0";
constexpr unsigned long kSampleIntervalMs = 20;  // 50 Hz

// "4294967295,-16.000,-16.000,-16.000" plus the terminating null byte.
constexpr size_t kAccelPayloadSize = 40;

BLEService accelService("19B10000-E8F2-537E-4F6C-D104768A1214");
BLECharacteristic accelCharacteristic(
  "19B10001-E8F2-537E-4F6C-D104768A1214",
  BLERead | BLENotify,
  kAccelPayloadSize
);

unsigned long lastSampleMs = 0;
unsigned long sampleCounter = 0;
bool wasConnected = false;
char payload[kAccelPayloadSize];

void setup() {
  Serial.begin(115200);

  if (!IMU.begin()) {
    Serial.println(F("IMU not found"));
    while (true) {
    }
  }

  if (!BLE.begin()) {
    Serial.println(F("BLE start failed"));
    while (true) {
    }
  }

  BLE.setLocalName(kDeviceName);
  BLE.setAdvertisedService(accelService);
  accelService.addCharacteristic(accelCharacteristic);
  BLE.addService(accelService);
  accelCharacteristic.writeValue(kInitialReading);
  BLE.advertise();

  Serial.println(F("BLE active: ArduinoAccel"));
}

void loop() {
  // Keep the BLE stack responsive even while no central is connected.
  BLE.poll();

  BLEDevice central = BLE.central();
  const bool connected = central && central.connected();

  if (!connected) {
    if (wasConnected) {
      Serial.println(F("Connection disconnected"));
    }
    wasConnected = false;
    return;
  }

  if (!wasConnected) {
    Serial.print(F("Connected to: "));
    Serial.println(central.address());
    wasConnected = true;
  }

  const unsigned long now = millis();
  if (now - lastSampleMs < kSampleIntervalMs || !accelCharacteristic.subscribed()) {
    return;
  }
  lastSampleMs = now;

  if (!IMU.accelerationAvailable()) {
    return;
  }

  float x;
  float y;
  float z;
  IMU.readAcceleration(x, y, z);

  const int length = snprintf(payload, sizeof(payload), "%lu,%.3f,%.3f,%.3f", sampleCounter++, x, y, z);
  if (length > 0 && static_cast<size_t>(length) < sizeof(payload)) {
    accelCharacteristic.writeValue(payload);
  }
}
