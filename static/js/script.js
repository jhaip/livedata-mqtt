/* Global Variables */
var tests = {"LIVE": {"selected": false}},
    signals = {},
    selecting_state = false,
    chart_data = {},
    live_data_array = {},
    start_time = new Date(),
    stop = false,
    time_graph_padding_ms = 100;

function timeSeriesChart() {
  /* Modification of Mike Bostock's code http://bost.ocks.org/mike/chart/time-series-chart.js
     while reading http://bost.ocks.org/mike/chart/
  */
  var margin = {top: 10, right: 10, bottom: 20, left: 10},
      width = 760,
      height = 120,
      xValue = function(d) { return d[0]; },
      yValue = function(d) { return d[1]; },
      xScale = d3.time.scale(),
      yScale = d3.scale.linear(),
      xAxis = d3.svg.axis().scale(xScale).orient("bottom").tickSize(6, 0),
      area = d3.svg.area().x(X).y1(Y);
      ////line = d3.svg.line().x(X).y(Y);

  function chart(selection) {
    selection.each(function(data) {

      // Convert data to standard representation greedily;
      // this is needed for nondeterministic accessors.
      data = data.map(function(d, i) {
        return [xValue.call(data, d, i), yValue.call(data, d, i)];
      });

      // Update the x-scale.
      xScale
          .domain(d3.extent(data, function(d) { return d[0]; }))
          .range([0, width - margin.left - margin.right]);

      // Update the y-scale.
      yScale
          .domain([0, d3.max(data, function(d) { return d[1]; })])
          .range([height - margin.top - margin.bottom, 0]);

      // Select the svg element, if it exists.
      var svg = d3.select(this).selectAll("svg").data([data]);

      // Otherwise, create the skeletal chart.
      var gEnter = svg.enter().append("svg").append("g");
      gEnter.append("path").attr("class", "area");
      ////gEnter.append("path").attr("class", "line");
      gEnter.append("g").attr("class", "x axis");

      // Update the outer dimensions.
      svg .attr("width", width)
          .attr("height", height);

      // Update the inner dimensions.
      var g = svg.select("g")
          .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      // Update the area path.
      g.select(".area")
          .attr("d", area.y0(yScale.range()[0]).interpolate("step-after"));

      // Update the line path.
      ////g.select(".line")
      ////    .attr("d", line);

      // Update the x-axis.
      g.select(".x.axis")
          .attr("transform", "translate(0," + yScale.range()[0] + ")")
          .call(xAxis);
    });
  }

  // The x-accessor for the path generator; xScale ∘ xValue.
  function X(d) {
    return xScale(d[0]);
  }

  // The x-accessor for the path generator; yScale ∘ yValue.
  function Y(d) {
    return yScale(d[1]);
  }

  chart.margin = function(_) {
    if (!arguments.length) return margin;
    margin = _;
    return chart;
  };

  chart.width = function(_) {
    if (!arguments.length) return width;
    width = _;
    return chart;
  };

  chart.height = function(_) {
    if (!arguments.length) return height;
    height = _;
    return chart;
  };

  chart.x = function(_) {
    if (!arguments.length) return xValue;
    xValue = _;
    return chart;
  };

  chart.y = function(_) {
    if (!arguments.length) return yValue;
    yValue = _;
    return chart;
  };

  return chart;
}

function init_mqtt() {
    console.log("in init_mqtt()");
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
                    msg.value = v;
                    msg.timestamp = new Date(start_time.valueOf()+msg_tick);//new Date(dd);
                    // if (msg.label in signals) {
                    //     live_data_array[msg.label].push(msg);
                    // } else {
                    //     console.error("Received data outside the set of valid signals: "+msg.label);
                    // }
                    if (!(msg.label in live_data_array)) {
                        live_data_array[msg.label] = [];
                        // create new chart?
                    }
                    live_data_array[msg.label].push(msg);
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
}

function get_summary_of_project(projectName, callback) {
    $.ajax({
        type: "GET",
        url: "http://localhost:81/projects/"+projectName+"/summary/"
    }).done(function(data) {
        $.each(data.signals, function(index, signalName) {
            signals[signalName] = {"selected": true};
            // live_data_array[signalName] = [];  // let the live data create it's own signal groups
        });
        $.each(data.tests, function(index, value) {
            var test_name = (value.test_name) ? value.test_name : "Test "+value.test_number
            tests[test_name] = {"test_name": value.test_name, "test_number": value.test_number, "selected": true};
        });
        callback();
    });
}

function populate_selection_ui() {
    function add_selection_el(container_el, display_name, data_name, data_value, selected) {
        var selection_el = $("<div></div>");
        selection_el.addClass("selection").addClass("clickable");
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

function save_live_data(projectName) {
    console.log("Saving to project "+projectName);
    var live_signals_to_save = $.extend({}, live_data_array);
    $.each(live_signals_to_save, function(signalName, signalData) {
        live_signals_to_save[signalName] = {"data": signalData};
    });
    var notes = $("textarea").filter('[data-testnumber="LIVE"]').val();
    var data = {"notes": notes, "signals": live_signals_to_save};
    $.ajax({
        type: "POST",
        url: "http://localhost:81/projects/"+projectName+"/test/",
        data: JSON.stringify(data),
        contentType: "application/json; charset=utf-8"
    }).done(function() {
        alert("done!");
        console.log("done!");
    });
}

function delete_test(test_number) {
    // TODO
    // $.ajax({
    //     type: "DELETE",
    //     url: "http://localhost:81/projects/mini-scanner/tests/"+test_number+"/",
    //     contentType: "application/json; charset=utf-8"
    // }).done(function() {
    //     alert("deleted!");
    //     console.log("deleted! "+test_number);
    // });
}

function update_test(test_number) {
    var notes = $("textarea").filter('[data-testnumber="'+test_number+'"]').val();
    var data = {"notes": notes};
    // TODO
    // $.ajax({
    //     type: "PATCH",
    //     url: "http://localhost:81/projects/mini-scanner/tests/"+test_number+"/",
    //     data: JSON.stringify(data),
    //     contentType: "application/json; charset=utf-8"
    // }).done(function() {
    //     alert("patched!");
    //     console.log("patched!");
    // });
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

function setup_signal_and_test_selection_check(projectName) {
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

            chart_data = {};  // clear old graph data;
            create_graph_ui(projectName);
            fetch_chart_data(projectName);
            if (stop) {
                tick(); // tick once to update the live graph with the saved data
            }
        }
        dropdown_el.hover(function() {}, update_selection);
        update_selection(projectName);  // Call first to make sure display text matches initial settings
    }
    test_selection($("#signal-select-dropdown"), $("#signal-select"), signals, "all signals");
    test_selection($("#test-select-dropdown"), $("#test-select"), tests, "all tests");
}

function create_graph_ui(projectName) {
    $("#main").empty();
    console.log("main should be empty");
    var table = $("<table></table>");
    var tr, td;

    /* Test Heading Row */
    tr = $("<tr></tr>");
    tr.append($("<td></td>"));  // blank top left corner
    $.each(tests, function(testName, testData) {
        if (testData.selected) {
            td = $("<td></td>").addClass("heading-cell").text(testName);
            tr.append(td);
        }
    });
    table.append(tr);

    /* signal rows */
    $.each(signals, function(signalName, signalData) {
        if (signalData.selected) {
            tr = $("<tr></tr>");
            td = $("<td></td>").addClass("heading-cell").text(signalName);
            tr.append(td);
            $.each(tests, function(testName, testData) {
                if (testData.selected) {
                    td = $("<td></td>");
                    var testNumber = (testName == "LIVE") ? "LIVE" : testData.test_number;
                    generate_graph(signalName, testName, td, testNumber);
                    tr.append(td);
                }
            });
            table.append(tr);
        }
    });

    /* Test Notes, Saving, etc. */
    tr = $("<tr></tr>").addClass("annotation-row");
    td = $("<td></td>");
    tr.append(td);
    $.each(tests, function(testName, testData) {
        if (testData.selected) {
            td = $("<td></td>");
            var textarea = $("<textarea></textarea>");
            var datatestnumber = (testName == "LIVE") ? "LIVE" : testData.test_number;
            textarea.attr("data-testnumber", datatestnumber);
            td.append(textarea);
            if (testName == "LIVE") {
                var save_button = $('<button class="button expanded">Save Live Data as new Test Case</button>');
                save_button.click(function() {
                    save_live_data(projectName);
                });
                td.append(save_button);
            } else {
                var update_button = $('<button class="button expanded">Update this Test</button>');
                update_button.click(function() { 
                    update_test(testData.test_number);
                });
                td.append(update_button);

                var delete_button = $('<button class="button expanded alert">Delete this Test</button>');
                delete_button.click(function() { 
                    delete_test(testData.test_number);
                });
                td.append(delete_button);
            }
            tr.append(td);
        }
    });
    table.append(tr);

    $("#main").append(table);
}

function add_new_signal_to_graph_ui(signalName) {
    var tableAnnotationRow = $("table tr.annotation-row");

    var tr = $("<tr></tr>"),
        td = $("<td></td>").addClass("heading-cell").text(signalName);
    tr.append(td);

    td = $("<td></td>");
    generate_graph(signalName, "LIVE", td, "LIVE", 900);
    tr.append(td);

    tableAnnotationRow.before(tr);
}

function populate_live_data_annotation_row(projectName) {
    var tr = $("tr.annotation-row"),
        td = $("<td></td>");
    var textarea = $("<textarea></textarea>");
    textarea.attr("data-testnumber", "LIVE");
    td.append(textarea);
    var save_button = $('<button class="button expanded">Save Live Data as new Test Case</button>');
    save_button.click(function() {
        save_live_data(projectName)
    });
    td.append(save_button);
    tr.append(td);
}

function generate_graph(signalName, testName, c, testNumber, w) {
    var w = typeof w !== 'undefined' ?  w : 300;
    var data = [];
    var chart = timeSeriesChart()
        .x(function(d) { return d.timestamp; })
        .y(function(d) { return d.value; })
        .width(w)
        .height(60);
    var container_el = $("<div></div>");
    c.append(container_el);
    d3.select(container_el[0]).datum(data).call(chart);

    if (!(testNumber in chart_data)) {
        chart_data[testNumber] = {};
    }
    chart_data[testNumber][signalName] = {"chart": chart, "el": d3.select(container_el[0])};
}

function fetch_test_data(projectName, test_number) {
    console.log("FETCHING TEST DATA");
    $.ajax({
        type: "GET",
        url: "http://localhost:81/projects/"+projectName+"/tests/"+test_number+"/"
    }).done(function(data) {
        $.each(data[0].signals, function(signalName, signalData) {
            if ((signalName in signals) && signals[signalName].selected) {
                var data_tuples_array = signalData.data;
                $.each(data_tuples_array, function(index, data_tuple) {
                    data_tuples_array[index].timestamp = new Date(data_tuple.timestamp);
                });
                // update graph with new data;
                chart_data[test_number][signalName].el.datum(data_tuples_array).call(chart_data[test_number][signalName].chart);
                // Updates Notes:
                $("textarea").filter('[data-testnumber="'+test_number+'"]').val(data[0].notes);
            }
        });
    });
}

function fetch_chart_data(projectName) {
    $.each(tests, function(testName, testData) {
        if (testData.selected && testName != "LIVE") {
            fetch_test_data(projectName, testData.test_number);
        }
    });
}

function tick() {
    // update graph with new data
    // if (tests["LIVE"].selected) {
    //     $.each(signals, function(signalName, signalData) {
    //         if (signalData.selected) {
    //             chart_data["LIVE"][signalName].el.datum(live_data_array[signalName]).call(chart_data["LIVE"][signalName].chart);
    //         }
    //     });
    // }
    $.each(live_data_array, function(signalName, signalData) {
        if (!(signalName in chart_data["LIVE"])) {
            // this is a new signal that doesn't have a graph yet
            // generate a graph and add it as a new row to the table
            add_new_signal_to_graph_ui(signalName);
        }
        chart_data["LIVE"][signalName].el.datum(live_data_array[signalName]).call(chart_data["LIVE"][signalName].chart);
    });
    if (!stop) {
        setTimeout(tick, 1);
    }
}

tick();

var router = null;

var LandingView = Backbone.View.extend({
    initialize: function() {
        this.render();
        this.data = [];
        this.fetch_projects_list();
    },

    events: {
        'click .project': 'select_project',
        'click #createNewProjectButton': 'create_new_project'
    },

    fetch_projects_list: function() {
        var that = this;
        $.ajax({
            type: "GET",
            url: "http://localhost:81/projects/",
            contentType: "application/json; charset=utf-8"
        }).done(function(data) {
            console.log(data);
            that.data = data;
            that.render();
        });
    },

    render: function() {
        var template = _.template($('#landing-template').html());
        this.$el.html(template({projects: this.data}));

        $(document).foundation();

        return this;
    },

    select_project: function(e) {
        var projectName = $(e.currentTarget).attr("data-project");
        router.navigate(projectName, {trigger: true});
    },

    create_new_project: function(e) {
        var projectName = $("#newProjectName").val();
        var projectDescription = $("#newProjectDescription").val();
        var data = {name: projectName, description: projectDescription};
        $.ajax({
            type: "POST",
            url: "http://localhost:81/projects/",
            data: JSON.stringify(data),
            contentType: "application/json; charset=utf-8"
        }).done(function() {
            $('#newProjectModal').foundation('close');
            router.navigate(projectName, {trigger: true});
        });
    }
});

var ProjectView = Backbone.View.extend({
    initialize: function(opts) {
        this.project = opts.project;
        this.render();
    },

    render: function() {
        var self = this;

        var template = _.template($('#project-template').html(), {});
        this.$el.html(template);
        
        $(document).foundation();

        get_summary_of_project(self.project, function() {
            populate_selection_ui();
            setup_signal_and_test_selection_state_updating();
            setup_signal_and_test_selection_check(self.project);
        });
        return this;
    }
});

var LiveDataView = Backbone.View.extend({
    initialize: function(opts) {
        this.render();

        init_mqtt();
    },

    render: function() {
        var template = _.template($('#live-data-template').html(), {});
        this.$el.html(template);

        $(document).foundation();

        
        return this;
    }
});

var ContainerView = Backbone.View.extend({
    myChildView: null,

    render: function() {
        this.$el.html(this.myChildView.$el);
        $(document).foundation();
        console.log($("#main"));
        return this;
    }
});


var myRouter = Backbone.Router.extend({
    container: null,

    initialize: function() {
        this.container = new ContainerView({ el: $("#appContainer") });
    },

    routes: {
        "": "landing",
        "live": "live_data_page",
        ":project": "project_page"
    },

    landing: function() {
        console.log("on the landing page!");
        this.container.myChildView = new LandingView();
        this.container.render();
    },

    project_page: function(project) {
        console.log("on the "+project+" project page");
        this.container.myChildView = new ProjectView({ project: project });
        this.container.render();
    },

    live_data_page: function() {
        this.container.myChildView = new LiveDataView();
        this.container.render();
        chart_data["LIVE"] = {};  // TODO: put this somewhere more appropriate
        create_graph_ui("Mini-Scanner");
        populate_live_data_annotation_row("Mini-Scanner");
    }
});

$(document).ready(function () {
    router = new myRouter();
    Backbone.history.start();
});