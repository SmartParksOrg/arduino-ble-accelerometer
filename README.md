# Arduino BLE Accelerometer

Stream accelerometer readings from an Arduino Nano 33 BLE Sense over Bluetooth Low Energy (BLE) and view them live in a browser.

## Requirements

- Arduino Nano 33 BLE Sense or Nano 33 BLE Sense Rev2
- Arduino IDE with the appropriate board package installed
- Arduino libraries:
  - `ArduinoBLE`
  - `Arduino_LSM9DS1` for the original Nano 33 BLE Sense
  - `Arduino_BMI270_BMM150` for the Nano 33 BLE Sense Rev2
- A Web Bluetooth-compatible browser, such as Chrome or Edge

## Run it

1. Open `arduino/ArduinoAccel/ArduinoAccel.ino` in the Arduino IDE.
2. Select the correct board and port, then install the libraries listed above.
3. For a Rev2 board, replace the `Arduino_LSM9DS1` include with the commented `Arduino_BMI270_BMM150` include in the sketch.
4. Upload the sketch. The board advertises as `ArduinoAccel`.
5. Serve the `docs` directory from `localhost` (for example, run `python3 -m http.server -d docs 8000`) and open `http://localhost:8000` in Chrome or Edge.
6. Click **Verbind met Arduino** and select the advertised board.

## Updating the Arduino Firmware

Changes committed to GitHub do **not** update the Arduino board automatically. After pulling the latest repository changes, compile and upload the firmware manually:

1. Open Arduino IDE 2.x.
2. Open `arduino/ArduinoAccel/ArduinoAccel.ino`.
3. Connect the Arduino Nano 33 BLE Sense to your computer with USB.
4. Select the correct board and port, then click **Verify** to compile the sketch.
5. Click **Upload** to flash the firmware to the board.
6. Wait for the upload to finish.
7. Open **Serial Monitor**, set it to **115200 baud**, and confirm that the device starts correctly.

## BLE protocol

The sketch sends a notification every 50 ms (20 Hz) through the following custom GATT characteristic:

| Item | UUID |
| --- | --- |
| Service | `19B10000-E8F2-537E-4F6C-D104768A1214` |
| Characteristic | `19B10001-E8F2-537E-4F6C-D104768A1214` |

Each notification is UTF-8 text in `x,y,z` format, for example `0.012,-0.034,1.001`. Values are accelerations in g.

## Project layout

- `arduino/ArduinoAccel/ArduinoAccel.ino` — firmware for the Arduino.
- `docs/index.html` — live Web Bluetooth viewer with a simple three-axis chart.
