#include <Adafruit_Sensor.h>
#include <Adafruit_BNO055.h>
#include <imumaths.h>

// This #include statement was automatically added by the Particle IDE.
#include "MQTT/MQTT.h"

#define BNO055_SAMPLERATE_DELAY_MS (55)

void callback(char* topic, byte* payload, unsigned int length);

MQTT client("m11.cloudmqtt.com", 19280, callback);

void callback(char* topic, byte* payload, unsigned int length) {
    char p[length + 1];
    memcpy(p, payload, length);
    p[length] = NULL;
    String message(p);
    delay(1000);
}

int tick = 0;
int loopCount = 0;
int loops = 30;
char msg[100];

void digitalWriteMQTT(int port, int value) {
  digitalWrite(port, value);
  delay(10);
  sprintf(msg, "{\"type\": \"BINARY\", \"label\": \"D%d\", \"value\": %d, \"tick\": \"%lu\"}", port, value, millis());
  client.publish("/outTopic", msg);
}
int analogReadMQTT(int port) {
  delay(10);
  int value = analogRead(A0);    // read the input pin
  sprintf(msg, "{\"type\": \"BINARY\", \"label\": \"A0\", \"value\": %d, \"tick\": \"%lu\"}", value, millis());
  client.publish("/outTopic", msg);
  return value;
}

Adafruit_BNO055 bno = Adafruit_BNO055();


void setup() {
    client.connect("hypespark1", "zettlmtm", "VOUbRcmhjffA");
    if (client.isConnected()) {
        client.publish("/outTopic","hello world");
        client.subscribe("/inTopic");
    }

    if (!bno.begin()) {
        /* There was a problem detecting the BNO055... check your connections */
        client.publish("/outTopic", "{\"type\": \"TEXT\", \"label\": \"TEXT\", \"value\": \"Oops, no BNO055 detected... Check your wiring or IS2 ADDR\"}");
        while(1);
    }

    delay(1000);

    bno.setExtCrystalUse(true);
}

void loop() {
    if (client.isConnected()) {
        client.loop();

        /* Real stuff now */
        imu::Vector<3> euler = bno.getVector(Adafruit_BNO055::VECTOR_EULER);

        sprintf(msg, "{\"type\": \"BINARY\", \"label\": \"Or\", \"X\": %.2f, \"Y\": %.2f, \"Z\": %.2f, \"tick\": \"%lu\"}", euler.x(), euler.y(), euler.z(), millis());
        client.publish("/outTopic", msg);

        client.loop();

        delay(200);
        /* End real stuff */
    }
}
