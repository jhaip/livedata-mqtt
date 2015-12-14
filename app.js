var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var path = require('path');
var http = require('http').Server(app);
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');

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

app.post('/projects/:project/test', function (req, res) {
    var data = req.body;
    data.project = req.params.project;

    var tests = db.collection("tests");
    tests.insert(tests);

    res.send('Thanks');
});

http.listen(81, function(){
  console.log('listening on *:3000');
});
 
function originIsAllowed(origin) {
  return true;
}
