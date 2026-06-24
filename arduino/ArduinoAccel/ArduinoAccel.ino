#include <ArduinoBLE.h>

// Voor originele Nano 33 BLE Sense:
#include <Arduino_LSM9DS1.h>

// Voor Nano 33 BLE Sense Rev2 gebruik deze in plaats van bovenstaande:
// #include <Arduino_BMI270_BMM150.h>

BLEService accelService("19B10000-E8F2-537E-4F6C-D104768A1214");

BLECharacteristic accelCharacteristic(
  "19B10001-E8F2-537E-4F6C-D104768A1214",
  BLERead | BLENotify,
  64
);

unsigned long lastSample = 0;
const int sampleIntervalMs = 50; // 20 Hz

void setup() {
  Serial.begin(115200);
  delay(1000);

  if (!IMU.begin()) {
    Serial.println("IMU niet gevonden");
    while (1);
  }

  if (!BLE.begin()) {
    Serial.println("BLE start mislukt");
    while (1);
  }

  BLE.setLocalName("ArduinoAccel");
  BLE.setAdvertisedService(accelService);

  accelService.addCharacteristic(accelCharacteristic);
  BLE.addService(accelService);

  accelCharacteristic.writeValue("0,0,0");

  BLE.advertise();
  Serial.println("BLE actief: ArduinoAccel");
}

void loop() {
  BLEDevice central = BLE.central();

  if (central) {
    Serial.print("Verbonden met: ");
    Serial.println(central.address());

    while (central.connected()) {
      if (millis() - lastSample >= sampleIntervalMs) {
        lastSample = millis();

        float x, y, z;

        if (IMU.accelerationAvailable()) {
          IMU.readAcceleration(x, y, z);

          char data[64];
          snprintf(data, sizeof(data), "%.3f,%.3f,%.3f", x, y, z);

          accelCharacteristic.writeValue(data);
          Serial.println(data);
        }
      }
    }

    Serial.println("Verbinding verbroken");
  }
}