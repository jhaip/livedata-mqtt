var symbols = {"D4": {"data":[], "i": 0}, 
               "D5": {"data":[], "i": 1},
               "D2": {"data":[], "i": 2},
               "D15": {"data":[], "i": 3},
               "D12": {"data":[], "i": 4},
               "D13": {"data":[], "i": 5},
               "A0": {"data":[], "i": 6}};
var margin = {top: 20, right: 20, bottom: 20, left: 40+44},
    width = 1000 - margin.left - margin.right,
    height = 400 - margin.top - margin.bottom,
    graphHeight = 30,
    graphSpacing = 15;
var start_time = new Date();
var first_time = null;
var first_ticks = 0;
var last_time = null;
var received_data = false;
var stop = false;
var time_graph_padding_ms = 100;

var svg = d3.select("body").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

for (var symbol in symbols) {
    if (symbols.hasOwnProperty(symbol)) {
        // do stuff
        symbols[symbol].x = d3.time.scale()
            .domain([start_time, new Date()])
            .range([0, width-44]);

        var y_domain_max = (symbol == "A0") ? 1025 : 1;
        symbols[symbol].y = d3.scale.linear()
            .domain([0, y_domain_max])
            .range([graphHeight, 0]);

        var interpolation = (symbol == "A0") ? "step-after" : "step-after";
        symbols[symbol].line = d3.svg.line()
            .x(function(d, i) { return symbols[symbol].x(d.timestamp); })
            .y(function(d, i) { return symbols[symbol].y(d.value); })
            .interpolate(interpolation);
        symbols[symbol].area = d3.svg.area()
            .x(function(d, i) { return symbols[symbol].x(d.timestamp); })
            .y1(function(d, i) { return symbols[symbol].y(d.value); })
            .y0(graphHeight)
            .interpolate(interpolation);

        symbols[symbol].tick_format = (symbol == "A0") ? null : '';
        symbols[symbol].chart = svg.append("g")
            .attr("class", "chart "+symbol)
            .attr("transform", "translate(0," + (graphHeight+graphSpacing)*symbols[symbol].i + ")");
        symbols[symbol].xAxis = symbols[symbol].chart.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + graphHeight + ")")
            .call(d3.svg.axis().scale(symbols[symbol].x).tickFormat(symbols[symbol].tick_format).outerTickSize(0).orient("bottom"));
        symbols[symbol].chart.append("g")
            .attr("class", "y axis")
            .call(d3.svg.axis().scale(symbols[symbol].y).ticks(1).orient("left"));
        symbols[symbol].clip_path = symbols[symbol].chart.append("g");
        // symbols[symbol].line_path = symbols[symbol].clip_path
        //   .append("path")
        //     .datum(symbols[symbol].data)
        //     .attr("class", "line")
        //     .attr("d", symbols[symbol].line);
        symbols[symbol].area_path = symbols[symbol].clip_path
          .append("path")
            .datum(symbols[symbol].data)
            .attr("class", "area")
            .attr("d", symbols[symbol].area);

        symbols[symbol].chart.append("text")
          .attr("x", -60)
          .attr("y", graphHeight/2+10)
          .text( function(d) { return symbol; })
          .attr("class", "chartlabel");
    }
}

tick();

function tick() {
  for (var symbol in symbols) {
    if (symbols.hasOwnProperty(symbol)) {
      if (first_time != null && last_time != null) {
        symbols[symbol].x = symbols[symbol].x.domain([first_time, new Date()]);
      } else {
        symbols[symbol].x = symbols[symbol].x.domain([start_time, new Date()]);
      }
      symbols[symbol].xAxis = symbols[symbol].xAxis.call(d3.svg.axis().scale(symbols[symbol].x).tickFormat(symbols[symbol].tick_format).outerTickSize(0).orient("bottom"));

      if (symbols[symbol].data.length > 0) {
          var interpolation = (symbol == "A0") ? "step-after" : "step-after";

          if (symbol != "A0") {
            var last_element = jQuery.extend({}, symbols[symbol].data[symbols[symbol].data.length-1]);
            //var last_element = symbols[symbol].data[symbols[symbol].data.length-1];
            last_element.timestamp = new Date();
            symbols[symbol].data.push(last_element);
          }

          symbols[symbol].line = d3.svg.line()
                .x(function(d, i) { return symbols[symbol].x(d.timestamp); })
                .y(function(d, i) { return symbols[symbol].y(d.value); })
                .interpolate(interpolation);
          symbols[symbol].area = d3.svg.area()
                .x(function(d, i) { return symbols[symbol].x(d.timestamp); })
                .y1(function(d, i) { return symbols[symbol].y(d.value); })
                .y0(graphHeight)
                .interpolate(interpolation);
          symbols[symbol].area_path.attr("d", symbols[symbol].area);
          //symbols[symbol].line_path.attr("d", symbols[symbol].line);

          if (symbol != "A0") {
            symbols[symbol].data.pop(); // remove extension of last element
          }
      }
    }
  }

  if (!stop) {
    setTimeout(tick, 1);
  }
}

client = new Paho.MQTT.Client("m11.cloudmqtt.com", 39280,"hype_" + parseInt(Math.random() * 100, 10)); 
client.onConnectionLost = onConnectionLost;
client.onMessageArrived = onMessageArrived;
var options = {
    useSSL: true,
    userName: "zettlmtm",
    password: "VOUbRcmhjffA",
    onSuccess:onConnect,
    onFailure:doFail
}
client.connect(options);

function onConnect() {
    console.log("onConnect");
    client.subscribe("/outTopic");
    message = new Paho.MQTT.Message("Hello CloudMQTT from websocket hype");
    message.destinationName = "/outTopic";
    client.send(message); 
}

function doFail(e){
    console.log(e);
}

function onConnectionLost(responseObject) {
    if (responseObject.errorCode !== 0) {
        console.log("onConnectionLost:"+responseObject.errorMessage);
    }
}

function onMessageArrived(message) {
    //console.log("onMessageArrived:"+message.payloadString);
    try {
        msg = JSON.parse(message.payloadString);
        //console.log(msg);

        if (msg.type == "BINARY" && !isNaN(msg.value)) {
            var v = parseInt(msg.value);
            var msg_tick = parseInt(msg.tick);
            if (!isNaN(v)) {
                //msg.timestamp = new Date();
                msg.value = v;
                // if (received_data === false) {
                //   //start_time = new Date();//msg.timestamp-1;
                //   var st = new Date();
                //   //start_time -= msg_tick;
                //   start_time = new Date(st.valueOf()-msg_tick);
                //   console.log("START TIME:");
                //   console.log(start_time);
                //   console.log("triggered by:");
                //   console.log(msg.label);
                // }
                msg.timestamp = new Date(start_time.valueOf()+msg_tick);//new Date(dd);
                if (received_data === false) {
                  //msg.timestamp = new Date(start_time.valueOf()+msg_tick);
                  first_time = new Date(msg.timestamp.valueOf());
                  received_data = true;
                } else {
                  //msg.timestamp = new Date(first_time.valueOf()+msg_tick);//new Date(dd);
                  last_time = new Date(msg.timestamp.valueOf());
                }
                //console.log(msg.timestamp);
                symbols[msg.label].data.push(msg);
            }
        } else if (msg.type == "BREAK") {
            if (msg.value == "END") {
                console.log("END");
                setTimeout(function() {
                  stop = true;
                }, time_graph_padding_ms);
            }
        } else if (msg.type == "TEXT") {
            console.log("Update: "+msg.value);
        } else {
            console.error("Bad input:");
            console.error(msg);
        }
    } catch (e) {
        console.log("error");
        console.log(e);
    }
}

$(document).ready(function() {
    $("#save_test").click(function() {
        // get rid of the extra fields only really useful for D3
        var symbols_copy = jQuery.extend({}, symbols);
        for (var key in symbols_copy) {
          if (symbols_copy.hasOwnProperty(key)) {
            for (var key2 in symbols_copy[key]) {
              if (symbols_copy[key].hasOwnProperty(key2)) {
                if (key2 !== "data") {
                  delete symbols_copy[key][key2];
                }
              }
            }
          }
        }
        var dataa = {"notes": "", "signals": symbols_copy};
        console.log(dataa);
        $.ajax({
            type: "POST",
            url: "http://localhost:81/projects/mini-scanner/test/",
            data: JSON.stringify(dataa),
            contentType: "application/json; charset=utf-8"
        }).done(function() {
            alert("done!");
            console.log("done!");
        });
    });

    $("#load_test").click(function() {
        $.ajax({
            type: "GET",
            url: "http://localhost:81/projects/mini-scanner/tests/10/"
        }).done(function(data) {
            console.log("received:");
            console.log(data[0]);
        });
    })
});