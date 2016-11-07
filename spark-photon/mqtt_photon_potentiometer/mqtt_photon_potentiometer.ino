// This #include statement was automatically added by the Particle IDE.
#include "MQTT/MQTT.h"

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


void setup() {
    client.connect("hypespark1", "zettlmtm", "VOUbRcmhjffA");
    if (client.isConnected()) {
        client.publish("/outTopic","hello world");
        client.subscribe("/inTopic");
    }
}

void loop() {
    if (client.isConnected()) {
        client.loop();

        /* Real stuff now */
        ++loopCount;
        if (loopCount < loops) {
            sprintf(msg, "{\"type\": \"BREAK\", \"label\": \"LOOP\", \"value\": %d, \"tick\": \"%lu\"}", loopCount, millis());
            client.publish("/outTopic", msg);

            int val = analogReadMQTT(A0);
            delay(500);

            client.loop();
        } else if (loopCount == loops) {
            client.publish("/outTopic", "{\"type\": \"BREAK\", \"label\": \"LOOP\", \"value\": \"END\"}");
        }
        /* End real stuff */
    }
}
