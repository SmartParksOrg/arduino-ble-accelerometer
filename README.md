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
6. Click **Connect to Arduino** and select the advertised board.

## Real-time motion statistics

The browser calculates rolling movement statistics from the live BLE samples; the Arduino continues to send only raw X, Y, and Z acceleration. Choose a 2, 5, 10, or 30 second window to view ODBA, VeDBA, axis mean/standard deviation, peak acceleration, and a simple still/active/peak-activity classification. The default window is 5 seconds.

ODBA and VeDBA are dynamic body acceleration metrics commonly used as relative movement/activity proxies in animal biologging. They need calibration for the target species, tag position, and behaviour before biological interpretation. The summary fields are inspired by the [OpenCollar ACC Calculator](https://github.com/SmartParksOrg/opencollar-acc-calculator), but are calculated live in the browser without its power, storage, or runtime model.

The firmware remains separate: changes to it must still be compiled and uploaded to the board manually through Arduino IDE.

## Rhino behaviour classifier

The Arduino streams raw triaxial acceleration at 50 Hz as `sample_counter,x,y,z`; it does not classify behaviour. The browser keeps four-second windows (200 samples), calculates the classifier features in real time using a centered three-second static-acceleration mean, and applies the rhino behaviour classifier to label each completed window as `rest`, `fast_locomotion`, `eating`, `walking`, or `other_active`.

Classifier versions are defined in `docs/classifier.js` and shown in the classifier dropdown. To add a new version, add another model object to `RHINO_CLASSIFIER_MODELS` with an `id`, `label`, class list, feature definitions, feature extractor, and `predict(features)` function.

The classifier runs entirely in the web app. Updating its thresholds or logic only requires changing and publishing the web files; reflashing the Arduino is required only when the sample format or sample rate changes. This model was trained for rhino accelerometer data and needs validation before use with another species, collar position, or sensor orientation.

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

The sketch sends a notification every 20 ms (50 Hz) through the following custom GATT characteristic:

| Item | UUID |
| --- | --- |
| Service | `19B10000-E8F2-537E-4F6C-D104768A1214` |
| Characteristic | `19B10001-E8F2-537E-4F6C-D104768A1214` |

Each notification is UTF-8 text in `sample_counter,x,y,z` format, for example `1234,0.012,-0.034,1.001`. Values are accelerations in g.

## Project layout

- `arduino/ArduinoAccel/ArduinoAccel.ino` — firmware for the Arduino.
- `docs/index.html` — live Web Bluetooth viewer with a simple three-axis chart.
