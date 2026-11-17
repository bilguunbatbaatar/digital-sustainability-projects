import network
import time
import dht
import json

from machine import Pin
from umqtt.simple import MQTTClient


# ==========================================
# SETTINGS
# ==========================================

SSID = "YOUR_WIFI_NAME"
PASSWORD = "YOUR_WIFI_PASSWORD"

# MQTT server ажиллаж байгаа PC-ийн IP
BROKER = "192.168.x.x"  # IP of the PC running Mosquitto

PORT = 1883

CLIENT_ID = "esp32_team01"

TELEMETRY_TOPIC = b"team1/msg"

CONTROL_TOPIC = b"team1/led"


# ==========================================
# HARDWARE
# ==========================================

led = Pin(
    2,
    Pin.OUT
)

sensor = dht.DHT11(
    Pin(4)
)

led.off()


# ==========================================
# MQTT CALLBACK
# ==========================================

def mqtt_callback(topic, message):

    print(
        "MQTT received:",
        topic,
        message
    )

    if topic == CONTROL_TOPIC:

        if message == b"ON":

            led.on()

            print("LED -> ON")

        elif message == b"OFF":

            led.off()

            print("LED -> OFF")


# ==========================================
# WIFI CONNECT
# ==========================================

def connect_wifi():

    wifi = network.WLAN(
        network.STA_IF
    )

    wifi.active(True)

    if not wifi.isconnected():

        print("Connecting Wi-Fi...")

        wifi.connect(
            SSID,
            PASSWORD
        )

        while not wifi.isconnected():

            print(".", end="")

            time.sleep(0.5)


    print("\nWi-Fi connected")

    print(
        "ESP32 IP:",
        wifi.ifconfig()[0]
    )

    return wifi


# ==========================================
# WIFI
# ==========================================

wifi = connect_wifi()


# ==========================================
# MQTT
# ==========================================

client = MQTTClient(
    CLIENT_ID,
    BROKER,
    port=PORT
)

client.set_callback(
    mqtt_callback
)

client.connect()

client.subscribe(
    CONTROL_TOPIC
)

print("MQTT connected")

print(
    "Subscribed:",
    CONTROL_TOPIC
)


# ==========================================
# MAIN LOOP
# ==========================================

while True:

    # --------------------------
    # Receive MQTT command
    # --------------------------

    client.check_msg()


    # --------------------------
    # Read sensor
    # --------------------------

    try:

        sensor.measure()

        temperature = sensor.temperature()

        humidity = sensor.humidity()


        # --------------------------
        # JSON payload
        # --------------------------

        data = {

            "temperature": temperature,

            "humidity": humidity,

            "led": led.value()
        }


        message = json.dumps(
            data
        )


        # --------------------------
        # MQTT publish
        # --------------------------

        client.publish(
            TELEMETRY_TOPIC,
            message
        )


        print(
            "Published:",
            message
        )


    except Exception as e:

        print(
            "Error:",
            e
        )


    # --------------------------
    # 5 seconds
    # --------------------------

    for i in range(50):

        client.check_msg()

        time.sleep(0.1)