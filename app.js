var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var path = require('path');
var http = require('http').Server(app);
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');

////////////
var Dropbox = require("dropbox");
var fs = require("fs");
var path = require("path");
var client = new Dropbox.Client({
    key: "yro7r1co0ouombc",
    secret: "7ngjfq5au877eui",
    token: "6YpeQuDyPhIAAAAAAAAJJavn7qEfVrrjx5IT7rsFZ6fwUYjeJJvQKCMUJIJOTlBX"
});

client.authenticate(function(error, client) {
    if (error) {
        console.log(error);
    }
    console.log("Congratulations on authenticating! :)");
});
////////////

var db;

var url = 'mongodb://localhost:27017/test';
MongoClient.connect(url, function(err, _db) {
  assert.equal(null, err);
  console.log("Connected correctly to server");
  db = _db;
});

var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', "*");
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
}
app.use(allowCrossDomain);
app.use(bodyParser.json());  // parse application/json 
app.use(function(req,res,next) {
    req.db = db;
    next();
});
app.use(express.static('static'));


app.get('/', function(req, res) {
    res.sendFile('index.html', { root: path.join(__dirname, './') });
});

app.get('/projects/', function(req, res) {
    var tests = db.collection("tests");
    tests.find({}, {"project":1}).toArray(function(err, data) {
        if (err) {
            res.send("There was a problem getting the information from the database.");
        }
        else {
            var u = {}, a = [], v = 0;
            for (var i=0; i<data.length; i++) {
                v = data[i].project;
                if (!u.hasOwnProperty(v)) {
                    a.push(v);
                    u[v] = 1;
                }
            }
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify(a));
        }
    });
});

app.get('/projects/:project/summary/', function(req, res) {
    var summary = {};
    var tests = db.collection("tests");

    function get_summary_of_tests(callback) {
        client.readdir("/projects/"+req.params.project+"/tests", function(err, data) {
            if (err) {
                console.log(err);
                return;
            }
            console.log(data);
            summary["tests"] = [];
            for (var i=0; i<data.length; i+=1) {
                summary["tests"].push({"test_number": data[i]});
            }
            callback(summary["tests"][0]["test_number"]);
        });
        // tests.find({"project": req.params.project}, {"test_number":1,"test_name":1, _id: 0}).toArray(function(err, data) {
        //     if (err) {
        //         res.send("There was a problem getting the information from the database.");
        //     }
        //     else {
        //         summary["tests"] = data;
        //         callback(summary["tests"][0]["test_number"]);
        //     }
        // });
    }
    function get_summary_of_signals(test_number) {
        client.readdir("/projects/"+req.params.project+"/tests/"+test_number+"/signals", function(err, data) {
            if (err) {
                console.log(err);
                return;
            }
            console.log(data);
            summary["signals"] = [];
            for (var i=0; i<data.length; i+=1) {
                var signal = data[i].split(".")[0];
                summary["signals"].push(signal);
            }
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify(summary));
        });
        // tests.find({"project": req.params.project, "test_number": test_number}, {"signals":1, _id: 0}).toArray(function(err, data) {
        //     if (err) {
        //         res.send("There was a problem getting the information from the database.");
        //     }
        //     else {
        //         summary["signals"] = [];
        //         for(var attributename in data[0].signals){
        //             summary["signals"].push(attributename);
        //         }
        //         res.setHeader('Content-Type', 'application/json');
        //         res.send(JSON.stringify(summary));
        //     }
        // });
    }

    get_summary_of_tests(get_summary_of_signals);
});

app.get('/projects/:project/tests/', function(req, res) {
    var tests = db.collection("tests");
    tests.find({"project": req.params.project}, {"test_number":1,"test_name":1, _id: 0}).toArray(function(err, data) {
        if (err) {
            res.send("There was a problem getting the information from the database.");
        }
        else {
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify(data));
        }
    });
});

app.get('/projects/:project/tests/:test/', function(req, res) {
    var tests = db.collection("tests");
    tests.find({"project": req.params.project, "test_number": parseInt(req.params.test)}, {"notes":1,"signals":1, _id: 0}).toArray(function(err, data) {
        if (err) {
            res.send("There was a problem getting the information from the database.");
        }
        else {
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify(data));
        }
    });
});

app.delete('/projects/:project/tests/:test/', function(req, res) {
    var tests = db.collection("tests");
    tests.remove({"project": req.params.project, "test_number": parseInt(req.params.test)}, function(err, results) {
        if (err) {
            res.send("There was a problem getting the information from the database.");
        }
        else {
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify(results));
        }
    });
});

app.patch('/projects/:project/tests/:test/', function(req, res) {
    var tests = db.collection("tests"),
        notes = req.body.notes;
    tests.update({"project": req.params.project, "test_number": parseInt(req.params.test)}, {$set: {notes: notes}}, function(err, results) {
        if (err) {
            res.send("There was a problem getting the information from the database.");
        }
        else {
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify(results));
        }
    });
});

app.get('/projects/:project/tests/:test/signals/', function(req, res) {
    var tests = db.collection("tests");
    tests.find({"project": req.params.project, "test_number": parseInt(req.params.test)}, {"signals":1, _id: 0}).toArray(function(err, data) {
        if (err) {
            res.send("There was a problem getting the information from the database.");
        }
        else {
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify(data[0].signals));
        }
    });
});

app.post('/projects/:project/test/', function (req, res) {
    var data = req.body;
    data.project = req.params.project;

    var tests = db.collection("tests");
    
    tests.find({"project": req.params.project}, {"test_number":1, _id: 0}).toArray(function(err, project_numbers) {
        if (err) {
            data.test_number = 0;
        }
        else {
            var new_test_number = 0;
            for (var i=0; i<project_numbers.length; i++) {
                var project_test_number = project_numbers[i].test_number;
                if (project_test_number+1 > new_test_number) {
                    new_test_number = project_test_number+1;
                }
            }
            data.test_number = new_test_number;
        }
        tests.insert(data);  // save the data
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(data));
    });
});

http.listen(81, function(){
  console.log('listening on *:81');
});
 
function originIsAllowed(origin) {
  return true;
}
