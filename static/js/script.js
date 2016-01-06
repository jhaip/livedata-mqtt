//////////* Global Variables *////////////
var symbols = {"D4": {"data":[], "i": 0}, 
               "D5": {"data":[], "i": 1},
               "D2": {"data":[], "i": 2},
               "D15": {"data":[], "i": 3},
               "D12": {"data":[], "i": 4},
               "D13": {"data":[], "i": 5},
               "A0": {"data":[], "i": 6}};
var symbols_blank = {"D4": {"data":[], "i": 0}, 
               "D5": {"data":[], "i": 1},
               "D2": {"data":[], "i": 2},
               "D15": {"data":[], "i": 3},
               "D12": {"data":[], "i": 4},
               "D13": {"data":[], "i": 5},
               "A0": {"data":[], "i": 6}};
var margin = {top: 20, right: 0, bottom: 20, left: 20+44},
    width = 1000 - margin.left - margin.right,
    height = 350 - margin.top - margin.bottom,
    graphHeight = 30,
    graphSpacing = 15;
var start_time = new Date();
var first_time = null;
var first_ticks = 0;
var last_time = null;
var received_data = false;
var stop = false;
var time_graph_padding_ms = 100;
var svg = null;

function init_graph() {
    svg = d3.select("#svg_container").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    console.log(symbols);

    var spacing_count = 0;

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
                .attr("transform", "translate(0," + (graphHeight+graphSpacing)*spacing_count + ")");
            spacing_count += 1;
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
}

init_graph();

tick();

function tick() {
  for (var symbol in symbols) {
    if (symbols.hasOwnProperty(symbol)) {
      if (first_time != null && last_time != null) {
        symbols[symbol].x = symbols[symbol].x.domain([first_time, last_time]);
      } else {
        symbols[symbol].x = symbols[symbol].x.domain([start_time, new Date()]);
      }
      symbols[symbol].xAxis = symbols[symbol].xAxis.call(d3.svg.axis().scale(symbols[symbol].x).tickFormat(symbols[symbol].tick_format).outerTickSize(0).orient("bottom"));

      if (symbols[symbol].data.length > 0) {
          var interpolation = (symbol == "A0") ? "step-after" : "step-after";

          if (symbol != "A0") {
            var last_element = jQuery.extend({}, symbols[symbol].data[symbols[symbol].data.length-1]);
            //var last_element = symbols[symbol].data[symbols[symbol].data.length-1];
            if (first_time != null && last_time != null) {
              last_element.timestamp = last_time;
            } else {
              last_element.timestamp = new Date();
            }
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

/* Global Variables */
var tests = {"LIVE": {"selected": true}};
var signals = {};
var selecting_state = false;

function get_summary_of_project(callback) {
    $.ajax({
        type: "GET",
        url: "http://localhost:81/projects/mini-scanner/summary/"
    }).done(function(data) {
        $.each(data.signals, function(index, signalName) {
            signals[signalName] = {"selected": true};
        });
        $.each(data.tests, function(index, value) {
            var test_name = (value.test_name) ? value.test_name : "Test "+value.test_number
            tests[test_name] = {"test_name": value.test_name, "test_number": value.test_number, "selected": false};
        });
        callback();
    });
}

function populate_selection_ui() {
    function add_selection_el(container_el, display_name, data_name, data_value, selected) {
        var selection_el = $("<div></div>");
        selection_el.addClass("selection");
        if (selected) {
            selection_el.addClass("selected");
        }
        selection_el.text(display_name);
        container_el.append(selection_el);
    }
    $.each(tests, function(testName, testNameData) {
        add_selection_el($("#test-select-dropdown"), testName, "test", testNameData.test_number, testNameData.selected);
    });
    $.each(signals, function(signalName, signalNameData) {
        add_selection_el($("#signal-select-dropdown"), signalName, "signal", signalName, signalNameData.selected);
    });
}

function save_live_data() {
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
}

function setup_signal_and_test_selection_state_updating() {
    $(".selection").mousedown(function() {
        if ($(this).hasClass("selected")) {
            $(this).removeClass("selected");
            selecting_state = "DESELECT";
        } else {
            $(this).addClass("selected");
            selecting_state = "SELECT";
        }
    });
    $(".selection").hover(function() {
        if (selecting_state == "SELECT") {
            $(this).addClass("selected");
        } else if (selecting_state == "DESELECT") {
            $(this).removeClass("selected");
        }
    }, function() {});
    $("body").mouseup(function() {
        selecting_state = false;
    });
}

function setup_signal_and_test_selection_check() {
    function test_selection(dropdown_el, display_el, state_object, all_selected_text) {
        function update_selection() {
            var number_of_state_selections = 0;
            $.each(state_object, function(name, data) {
                state_object[name].selected = false;
                number_of_state_selections += 1;
            });
            var selected_group = [];
            dropdown_el.find(".selection.selected").each(function() {
                var name = $(this).text();
                if (name in state_object) {
                    state_object[name].selected = true;
                    selected_group.push(name);
                }
            });
            if (selected_group.length < number_of_state_selections) {
                display_el.text(selected_group.join(", "));
            } else {
                display_el.text(all_selected_text);
            }
        }
        dropdown_el.hover(function() {}, update_selection);
        update_selection();  // Call first to make sure display text matches initial settings
    }
    test_selection($("#signal-select-dropdown"), $("#signal-select"), signals, "all signals");
    test_selection($("#test-select-dropdown"), $("#test-select"), tests, "all tests");
}

$(document).ready(function() {

    $(document).foundation();

    get_summary_of_project(function() {
        populate_selection_ui();
        setup_signal_and_test_selection_state_updating();
        setup_signal_and_test_selection_check();
    });
    return;

    $.ajax({
        type: "GET",
        url: "http://localhost:81/projects/mini-scanner/tests/"
    }).done(function(data) {
        var signal_selection_state = {"ALL": true, "D4": true, "D5": true, "D2": true, "D15": true, "D12": true, "D13": true, "A0": true};
        var test_selection_state = {"ALL": false, "LIVE": true};

        /* Add list of test names to Test Selection Dropdown */
        $.each(data, function(index, value) {
            var test_name = (value.test_name) ? value.test_name : "Test "+value.test_number
            var test_select_el = $("<div></div>");
            test_select_el.append($('<input id="checkbox_test_'+value.test_number+'" type="checkbox" data-test='+value.test_number+">"));
            test_select_el.append($('<label for="checkbox_test_'+value.test_number+'">'+test_name+'</label>'));
            $("#test-select-dropdown").append(test_select_el);
            test_selection_state[value.test_number] = false;
        });

        $(document).foundation();

        $('#signal-select-dropdown input').prop('checked', true);  // initially have all signals selected
        $('#test-select-dropdown input').filter('[data-test="LIVE"]').prop('checked', true);

        var all_signal_text = "All signals";
        var all_test_text = "All tests";

        $('#signal-select-dropdown input').change(function() {
            var signal_selection = $(this).attr("data-signal");

            // check if check already matches the state
            if (this.checked == signal_selection_state[signal_selection]) {
                return;
            }

            // select all
            if (signal_selection == "ALL") {
              for (var key in signal_selection_state) {
                if (signal_selection_state.hasOwnProperty(key)) {
                  signal_selection_state[key] = true;
                }
              }
              $('#signal-select-dropdown input').prop('checked', true);
              $("#signal-select").text(all_signal_text);
              return;
            }

            if (this.checked) {
              signal_selection_state[signal_selection] = true;
              var all_signals_are_selected_now = true;
              $.each(signal_selection_state, function(key, value) {
                if (key != "ALL" && value == false) {
                  all_signals_are_selected_now = false;
                }
              });

              if (all_signals_are_selected_now) {
                signal_selection_state["ALL"] = true;
                $('#signal-select-dropdown input').filter('[data-signal="ALL"]').prop('checked', true);
                $("#signal-select").text(all_signal_text);
                return;
              }
            } else {
              signal_selection_state[signal_selection] = false;
              var all_signals_are_unselected_now = true;
              $.each(signal_selection_state, function(key, value) {
                if (key != "ALL" && value == true) {
                  all_signals_are_unselected_now = false;
                }
              });
              if (all_signals_are_unselected_now) {
                signal_selection_state[signal_selection] = true;
                $(this).prop('checked', true);
                return;
              }

              // if something is being unchecked we can't be in the "all selected" state
              signal_selection_state["ALL"] = false;
              $('#signal-select-dropdown input').filter('[data-signal="ALL"]').prop('checked', false);
            }

            // Update label:
            var label = "";
            $.each(signal_selection_state, function(key, value) {
              if (signal_selection_state[key] == true) {
                label = (label == "") ? key : label+", "+key;
              }
            });
            $("#signal-select").text(label);
        });

        ///////////////////// TEST SELECT
        $('#test-select-dropdown input').change(function() {
            var test_selection = $(this).attr("data-test");

            // check if check already matches the state
            if (this.checked == test_selection_state[test_selection]) {
                return;
            }

            // select all
            if (test_selection == "ALL") {
              for (var key in test_selection_state) {
                if (test_selection_state.hasOwnProperty(key)) {
                  test_selection_state[key] = true;
                }
              }
              test_selection_state["LIVE"] = false;
              $('#test-select-dropdown input').filter('[data-test="LIVE"]').prop('checked', false);
              $('#test-select-dropdown input').filter('[data-test!="LIVE"]').prop('checked', true);
              $("#test-select").text(all_test_text);
              return;
            }

            if (test_selection == "LIVE") {
              // mark all other tests unselected and live selected
              test_selection_state["LIVE"] = true;
              $.each(test_selection_state, function(key, value) {
                if (key != "LIVE") {
                  test_selection_state[key] = false;
                }
              });
              $('#test-select-dropdown input').filter('[data-test!="LIVE"]').prop('checked', false);
              $('#test-select-dropdown input').filter('[data-test="LIVE"]').prop('checked', true);
              $("#test-select").text("LIVE DATA");
              return;
            }

            test_selection_state["LIVE"] = false;
            $('#test-select-dropdown input').filter('[data-test="LIVE"]').prop('checked', false);

            if (this.checked) {
              test_selection_state[test_selection] = true;
              var all_signals_are_selected_now = true;
              $.each(test_selection_state, function(key, value) {
                if (key != "LIVE" && key != "ALL" && value == false) {
                  all_signals_are_selected_now = false;
                }
              });

              if (all_signals_are_selected_now) {
                test_selection_state["ALL"] = true;
                $('#test-select-dropdown input').filter('[data-test="ALL"]').prop('checked', true);
                $("#test-select").text(all_test_text);
                return;
              }
            } else {
              test_selection_state[test_selection] = false;
              var all_signals_are_unselected_now = true;
              $.each(test_selection_state, function(key, value) {
                if (key != "LIVE" && key != "ALL" && value == true) {
                  all_signals_are_unselected_now = false;
                }
              });
              if (all_signals_are_unselected_now) {
                test_selection_state[test_selection] = true;
                $(this).prop('checked', true);
                return;
              }

              // if something is being unchecked we can't be in the "all selected" state
              test_selection_state["ALL"] = false;
              $('#test-select-dropdown input').filter('[data-test="ALL"]').prop('checked', false);
            }

            // Update label:
            var label = "";
            $.each(test_selection_state, function(key, value) {
              if (key != "LIVE" && key != "ALL" && value == true) {
                label = (label == "") ? "Test "+key : label+", Test "+key;
              }
            });
            $("#test-select").text(label);
        });

        $("#save_test").click(save_live_data);

        $("#test-select-dropdown").hover(function() {}, function() { 
        //$(".test-select").click(function() {
            if (test_selection_state["LIVE"]) {
                symbols = jQuery.extend({}, symbols_blank);
                start_time = new Date();
                first_time = null;
                first_ticks = 0;
                last_time = null;
                received_data = false;
                stop = false;
                d3.select("#svg_container svg").remove();
                $("#active-test-name").text("Live Data");
                $("#save_test").show();
                init_graph();
                tick();
                return;
            }

            $("#save_test").hide();

            var test_number = 0;
            $.each(test_selection_state, function(key, value) {
                if (key != "LIVE" && key != "ALL" && value == true) {
                    test_number = key;
                }
            });

            $.ajax({
                type: "GET",
                url: "http://localhost:81/projects/mini-scanner/tests/"+test_number+"/"
            }).done(function(data) {
                console.log("received:");
                console.log(data[0]);
                d3.select("#svg_container svg").remove();
                $("#active-test-name").text("Test "+test_number);
                symbols = data[0].signals;
                for (var key in symbols) {
                  var symbol_data = symbols[key].data;
                  for (var i=0; i<symbol_data.length; i++) {
                    symbols[key].data[i].timestamp = new Date(symbols[key].data[i].timestamp);
                  }
                }

                var x = data[0].signals.A0.data;
                first_time = new Date(x[0].timestamp.valueOf());
                last_time = new Date(x[x.length-1].timestamp.valueOf());
                for (var key in symbols) {
                  var symbol_data = symbols[key].data;
                  for (var i=0; i<symbol_data.length; i++) {
                    var t = symbols[key].data[i].timestamp;
                    if (t<first_time) { first_time = t; console.log("found earlier"); }
                    if (t>last_time) { last_time = t; console.log("found later"); }
                  }
                }
                stop = true;
                init_graph();
                tick();
            });
        });
    });
});