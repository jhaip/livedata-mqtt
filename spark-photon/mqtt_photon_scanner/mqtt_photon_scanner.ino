// This #include statement was automatically added by the Particle IDE.
#include "MQTT/MQTT.h"

void callback(char* topic, byte* payload, unsigned int length);

/**
 * if want to use IP address,
 * byte server[] = { XXX,XXX,XXX,XXX };
 * MQTT client(server, 1883, callback);
 * want to use domain name,
 * MQTT client("www.sample.com", 1883, callback);
 **/
//byte server[] = { 192,168,1,14 };
MQTT client("m11.cloudmqtt.com", 19280, callback);

// recieve message
void callback(char* topic, byte* payload, unsigned int length) {
    char p[length + 1];
    memcpy(p, payload, length);
    p[length] = NULL;
    String message(p);

    if (message.equals("RED"))    
        RGB.color(255, 0, 0);
    else if (message.equals("GREEN"))    
        RGB.color(0, 255, 0);
    else if (message.equals("BLUE"))    
        RGB.color(0, 0, 255);
    else    
        RGB.color(255, 255, 255);
    delay(1000);
}


int loopCount = 0;
int delayTime = 3;
int pinHold = 12;
int pinClock = 13;
int exposureTime = 4;
int tick = 0;
char msg[100];

void digitalWriteMQTT(int port, int value) {
  //digitalWrite(port, value);
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

void setStep(int w1, int w2, int w3, int w4) {
  if (w1) {
    digitalWriteMQTT(2, HIGH);
  } else {
    digitalWriteMQTT(2, LOW);
  }
  if (w2) {
    digitalWriteMQTT(5, HIGH);
  } else {
    digitalWriteMQTT(5, LOW);
  }
  if (w3) {
    digitalWriteMQTT(4, HIGH);
  } else {
    digitalWriteMQTT(4, LOW);
  }
  if (w4) {
    digitalWriteMQTT(15, HIGH);
  } else {
    digitalWriteMQTT(15, LOW);
  }
}


void setup() {
    RGB.control(true);
    
    // connect to the server
    client.connect("hypespark1", "zettlmtm", "VOUbRcmhjffA");

    // publish/subscribe
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
          if (loopCount < 4) {
            sprintf(msg, "{\"type\": \"BREAK\", \"label\": \"LOOP\", \"value\": %d, \"tick\": \"%lu\"}", loopCount, millis());
            client.publish("/outTopic", msg);
        
            client.publish("/outTopic", "{\"type\": \"TEXT\", \"label\": \"TEXT\", \"value\": \"Scan line\"}");
            /* Scan line */
            digitalWriteMQTT(pinHold, HIGH);
            digitalWriteMQTT(pinClock, HIGH);
            digitalWriteMQTT(pinClock, LOW);
            digitalWriteMQTT(pinHold, LOW);
            client.publish("/outTopic", "{\"type\": \"TEXT\", \"label\": \"TEXT\", \"value\": \"Cleared buffer\"}");
            client.loop(); //////
            // 769
            for (int i=0; i<21; i++) {
              digitalWriteMQTT(pinClock, HIGH);
              delay(2);
              digitalWriteMQTT(pinClock, LOW);
            }
            client.publish("/outTopic", "{\"type\": \"TEXT\", \"label\": \"TEXT\", \"value\": \"delaying for exposure\"}");
            client.loop(); //////
            delay(exposureTime);
            digitalWriteMQTT(pinHold, HIGH);
            digitalWriteMQTT(pinClock, HIGH);
            digitalWriteMQTT(pinClock, LOW);
            digitalWriteMQTT(pinHold, LOW);
            /* reading each pixel value */
            client.publish("/outTopic", "{\"type\": \"TEXT\", \"label\": \"TEXT\", \"value\": \"Measuring pixel values\"}");
            // 768
            for (int i=0; i<20; i++) {
                int val = analogReadMQTT(A0);
                digitalWriteMQTT(pinClock, HIGH);
                digitalWriteMQTT(pinClock, LOW);
            }
            client.publish("/outTopic", "{\"type\": \"TEXT\", \"label\": \"TEXT\", \"value\": \"delaying for exposure again.\"}");
            client.loop(); //////
            delay(exposureTime);
        
            client.publish("/outTopic", "{\"type\": \"TEXT\", \"label\": \"TEXT\", \"value\": \"Moving stepper motor\"}");
            if (tick == 0) {
              setStep(HIGH, LOW, LOW, LOW);
              delay(delayTime);
              tick = 1;
            } else if (tick == 1) {
              setStep(LOW, LOW, HIGH, LOW);
              delay(delayTime);
              tick = 2;
            } else if (tick == 2) {
              setStep(LOW, HIGH, LOW, LOW);
              delay(delayTime);
              tick = 3;
            } else if (tick == 3) {
              setStep(LOW, LOW, LOW, HIGH);
              delay(delayTime);
              tick = 0;
            }
            client.loop(); //////
          } else if (loopCount == 4) {
            client.publish("/outTopic", "{\"type\": \"BREAK\", \"label\": \"LOOP\", \"value\": \"END\"}");
          }
        /* End real stuff */
    }    
}
