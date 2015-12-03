#### Doing better science:

I realized that while writing Arduino code I would change a threshold or rerun a test over and over and quit when it just worked.  That's bad science.  Good science is making a hypothesis, gathering data, visualizing it, making a conclusion, and repeating it all again.  To help me be a smarter scientist this project seeks to aid in all of those areas:

* *Gathering data*: Every reset and programming of a microcontroller is a separate test.  A smart system saves a log of inputs and outputs, with timestamps and other annotations, for future use.
* *Making a hypothesis*: With data separated into tests, I can make a guess about how a change will influence the data for the next test.
* *Visualizing the data*: Enough of the Arduino serial log spam.  Plot the data in real time and use small multitudes make comparisons between tests.
* *Making a conclusion*: Graphs of inputs and outputs can suggest generic techniques to improve them.  Let me see those normal distributions.  Graph showing the oscillating effect of bang bang control?  Throw some PID control at it.
* *Repeating it all again*: A solution to "Woah what just happened?"  By saving the inputs and outputs in real time, it is possible to replay a test with **new code** and **data from a previous test**.  Arduino simulation.

#### Milestones:

1. *Dec 2, 2015*: 
ESP8266 microcontroller is running code controlling a theoretical CCD and drive motor.  Every `digitalWrite()` and `analogRead()` also sends it's signal to a free CloudMQTT via the MQTT protocol.  The ESP8266's `millis()` time is included in every send.  A web page running on my local computer subscribes to these MQTT messages and uses D3.js to plot them in real time.  Timestamps are my web browsers current time offset by the number of milliseconds the ESP8266 recorded.  Data is recognizable but it appears the overhead of sending data via MQTT in between every request causes visible timing delay and inconsistencies as shown in the graph below.

![Dec 2 Screenshot](https://cloud.githubusercontent.com/assets/1444697/11550369/8674e782-993d-11e5-9bdd-bcd408fba0bd.png)

