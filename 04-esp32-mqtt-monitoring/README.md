# ESP32 Sensor Monitoring over MQTT

An ESP32 reads a DHT11 temperature and humidity sensor and publishes JSON to a Mosquitto broker every 5 seconds. A browser dashboard subscribes over WebSockets, charts the readings live and can switch the board's LED on and off.

```
ESP32 + DHT11 --MQTT (1883)--> Mosquitto --WebSocket (9001)--> Web dashboard
      ^                                                            |
      +-------------------- team1/led (ON / OFF) ------------------+
```

## Run it

1. Start the broker: `mosquitto -c dashboard/mosquitto-lab.conf`
2. Put your Wi-Fi name, password and the broker PC's IP into `esp32/main.py`, then copy `main.py` and `umqttsimple.py` to the ESP32 (MicroPython).
3. Open `dashboard/index.html`. Add `?host=<broker-ip>` to the URL to point it at another broker.

Topics: `team1/msg` (telemetry), `team1/led` (control).

`umqttsimple.py` is the MicroPython `umqtt.simple` client; `dashboard/lib/` contains MQTT.js and Chart.js.
