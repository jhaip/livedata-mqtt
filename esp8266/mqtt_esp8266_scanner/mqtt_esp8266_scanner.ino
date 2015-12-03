#include <ESP8266WiFi.h>
#include <PubSubClient.h>

const char* ssid = "STALY2.4";
const char* password = "1 am a tr33";
const char* mqtt_server = "m11.cloudmqtt.com";
int mqtt_server_port = 19280; //1883;

WiFiClient espClient;
PubSubClient client(espClient);
int loopCount = 0;
const int delayTime = 3;
const int pinHold = 12;
const int pinClock = 13;
const int exposureTime = 4;
int tick = 0;
char msg[100];

void setup() {
  pinMode(pinHold, OUTPUT);
  pinMode(pinClock, OUTPUT);
  pinMode(4, OUTPUT); // 4, 5, 2, 15 are pins for the TSL1406
  pinMode(5, OUTPUT);
  pinMode(2, OUTPUT);
  pinMode(15, OUTPUT);
  pinMode(BUILTIN_LED, OUTPUT);     // Initialize the BUILTIN_LED pin as an output
  Serial.begin(115200);
  setup_wifi();
  client.setServer(mqtt_server, mqtt_server_port);
  client.setCallback(callback);
}

void digitalWriteMQTT(int port, int value) {
  digitalWrite(port, value);
  sprintf(msg, "{\"type\": \"BINARY\", \"label\": \"D%d\", \"value\": %d, \"tick\": \"%d\"}", port, value, millis());
  client.publish("/outTopic", msg);
}
int analogReadMQTT(int port) {
  int value = analogRead(A0);    // read the input pin
  sprintf(msg, "{\"type\": \"BINARY\", \"label\": \"A0\", \"value\": %d, \"tick\": \"%d\"}", value, millis());
  client.publish("/outTopic", msg);
  return value;
}

void setStep(int w1, int w2, int w3, int w4) {
  if (w1) {
    digitalWriteMQTT(2, HIGH); //GPIO_REG_WRITE(GPIO_OUT_W1TS_ADDRESS, 1 << 2);
  } else {
    digitalWriteMQTT(2, LOW); // GPIO_REG_WRITE(GPIO_OUT_W1TC_ADDRESS, 1 << 2);
  }
  if (w2) {
    digitalWriteMQTT(5, HIGH); //GPIO_REG_WRITE(GPIO_OUT_W1TS_ADDRESS, 1 << 5);
  } else {
    digitalWriteMQTT(5, LOW); //GPIO_REG_WRITE(GPIO_OUT_W1TC_ADDRESS, 1 << 5);
  }
  if (w3) {
    digitalWriteMQTT(4, HIGH); //GPIO_REG_WRITE(GPIO_OUT_W1TS_ADDRESS, 1 << 4);
  } else {
    digitalWriteMQTT(4, LOW); //GPIO_REG_WRITE(GPIO_OUT_W1TC_ADDRESS, 1 << 4);
  }
  if (w4) {
    digitalWriteMQTT(15, HIGH); //GPIO_REG_WRITE(GPIO_OUT_W1TS_ADDRESS, 1 << 15);
  } else {
    digitalWriteMQTT(15, LOW); //GPIO_REG_WRITE(GPIO_OUT_W1TC_ADDRESS, 1 << 15);
  }
}

void setup_wifi() {

  delay(10);
  // We start by connecting to a WiFi network
  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(ssid);

  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("");
  Serial.println("WiFi connected");
  Serial.println("IP address: ");
  Serial.println(WiFi.localIP());
}

void callback(char* topic, byte* payload, unsigned int length) {
  Serial.print("Message arrived [");
  Serial.print(topic);
  Serial.print("] ");
  for (int i = 0; i < length; i++) {
    Serial.print((char)payload[i]);
  }
  Serial.println();

  // Switch on the LED if an 1 was received as first character
  if ((char)payload[0] == '1') {
    digitalWrite(BUILTIN_LED, LOW);   // Turn the LED on (Note that LOW is the voltage level
    // but actually the LED is on; this is because
    // it is acive low on the ESP-01)
  } else {
    digitalWrite(BUILTIN_LED, HIGH);  // Turn the LED off by making the voltage HIGH
  }

}

void reconnect() {
  // Loop until we're reconnected
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    // Attempt to connect
    if (client.connect("ESP8266Client", "zettlmtm", "VOUbRcmhjffA")) {
      Serial.println("connected");
      // Once connected, publish an announcement...
      client.publish("/outTopic", "hello world from esp8266");
      // ... and resubscribe
      client.subscribe("/inTopic");
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5 seconds");
      // Wait 5 seconds before retrying
      delay(5000);
    }
  }
}
void loop() {

  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  ++loopCount;
  if (loopCount < 4) {
    sprintf(msg, "{\"type\": \"BREAK\", \"label\": \"LOOP\", \"value\": %d, \"tick\": \"%d\"}", loopCount, millis());
    client.publish("/outTopic", msg);

    client.publish("/outTopic", "{\"type\": \"TEXT\", \"label\": \"TEXT\", \"value\": \"Scan line\"}");
    /* Scan line */
    digitalWriteMQTT(pinHold, HIGH); // GPIO_REG_WRITE(GPIO_OUT_W1TS_ADDRESS, 1 << pinHold);
    digitalWriteMQTT(pinClock, HIGH); // GPIO_REG_WRITE(GPIO_OUT_W1TS_ADDRESS, 1 << pinClock);
    digitalWriteMQTT(pinClock, LOW); // GPIO_REG_WRITE(GPIO_OUT_W1TC_ADDRESS, 1 << pinClock);
    digitalWriteMQTT(pinHold, LOW); // GPIO_REG_WRITE(GPIO_OUT_W1TC_ADDRESS, 1 << pinHold);
    client.publish("/outTopic", "{\"type\": \"TEXT\", \"label\": \"TEXT\", \"value\": \"Cleared buffer\"}");
    // 769
    for (int i=0; i<21; i++) {
      digitalWriteMQTT(pinClock, HIGH); // GPIO_REG_WRITE(GPIO_OUT_W1TS_ADDRESS, 1 << pinClock);
      delay(2);
      digitalWriteMQTT(pinClock, LOW); // GPIO_REG_WRITE(GPIO_OUT_W1TC_ADDRESS, 1 << pinClock);
    }
    client.publish("/outTopic", "{\"type\": \"TEXT\", \"label\": \"TEXT\", \"value\": \"delaying for exposure\"}");
    delay(exposureTime);
    digitalWriteMQTT(pinHold, HIGH); // GPIO_REG_WRITE(GPIO_OUT_W1TS_ADDRESS, 1 << pinHold);
    digitalWriteMQTT(pinClock, HIGH); // GPIO_REG_WRITE(GPIO_OUT_W1TS_ADDRESS, 1 << pinClock);
    digitalWriteMQTT(pinClock, LOW); // GPIO_REG_WRITE(GPIO_OUT_W1TC_ADDRESS, 1 << pinClock);
    digitalWriteMQTT(pinHold, LOW); //GPIO_REG_WRITE(GPIO_OUT_W1TC_ADDRESS, 1 << pinHold);
    /* reading each pixel value */
    client.publish("/outTopic", "{\"type\": \"TEXT\", \"label\": \"TEXT\", \"value\": \"Measuring pixel values\"}");
    // 768
    for (int i=0; i<20; i++) {
        int val = analogReadMQTT(A0);
        digitalWriteMQTT(pinClock, HIGH); // GPIO_REG_WRITE(GPIO_OUT_W1TS_ADDRESS, 1 << pinClock);
        digitalWriteMQTT(pinClock, LOW); // GPIO_REG_WRITE(GPIO_OUT_W1TC_ADDRESS, 1 << pinClock);
    }
    client.publish("/outTopic", "{\"type\": \"TEXT\", \"label\": \"TEXT\", \"value\": \"delaying for exposure again.\"}");
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
  } else if (loopCount == 4) {
    client.publish("/outTopic", "{\"type\": \"BREAK\", \"label\": \"LOOP\", \"value\": \"END\"}");
  }
}
