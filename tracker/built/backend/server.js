/// <reference path="../../typings/tsd.d.ts" />
var firebase = require('firebase');
var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var root = new firebase('https://futures-tracker.firebaseio.com/');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.get('/', function (req, res) {
    res.send({ Message: 'Hello futures tracker' });
});
var UserRouter = express.Router();
var MapRouter = express.Router();
var ParkingRouter = express.Router();
UserRouter.route('/user')
    .get(function (req, res) {
    var responseJson = {
        hello: "my json route"
    };
    res.send(responseJson);
})
    .post(function (req, res) {
    var name = req.body.name;
    var email = req.body.email;
    var password = req.body.password;
    var cellNo = req.body.cellNo;
    var address = req.body.address;
    var vehilceNo = req.body.vehicleNo;
    var vehicleModel = req.body.vehicleModel;
    var timestamp = firebase.ServerValue.TIMESTAMP;
    var trackerUUID = req.body.trackerUUID;
    var user = {
        name: name,
        email: email,
        password: password,
        cellNo: cellNo,
        address: address,
        vehicleNo: vehilceNo,
        vehicleModel: vehicleModel,
        timestamp: timestamp,
        trackerUUID: trackerUUID
    };
    root.child('users').once("value", function (snapshot) {
        if (snapshot.child(name + '-' + trackerUUID).exists()) {
            res.send({ status: name + '-' + trackerUUID + " Already exist" });
        }
        else {
            root.child('users').child(name + '-' + trackerUUID).set(user, function (error) {
                if (error) {
                    res.send({ status: "user Not Created" });
                }
                else {
                    res.send({ status: "user Created", user: user });
                }
            });
        }
    });
});
UserRouter.route('/signIn')
    .get(function (reqq, res) {
    res.send({ message: "its sign in api" });
})
    .post(function (req, res) {
    var name = req.body.name;
    var trackerUUID = req.body.trackerUUID;
    var password = req.body.password;
    root.child('users').once("value", function (snapshot) {
        if (snapshot.child(name + '-' + trackerUUID).exists()) {
            root.child('users').child(name + '-' + trackerUUID).once('value', function (snapshot) {
                var data = snapshot.val();
                if (data.name == name && data.trackerUUID == trackerUUID && data.password == password) {
                    res.send({ data: data });
                }
                else {
                    res.send({ 'status': 'your credentials not matched' });
                }
            });
        }
        else {
            res.send({ status: "Tracker is not Registered yet" });
        }
    });
});
MapRouter.route('/Map')
    .get(function (req, res) {
    res.send({ message: 'this is my maps' });
})
    .post(function (req, res) {
    var name = req.body.name;
    var trackerUUID = req.body.trackerUUID;
    var longitude = req.body.longitude;
    var latittude = req.body.latittude;
    var speed = req.body.speed;
    var timestamp = firebase.ServerValue.TIMESTAMP;
    var location = {
        longitude: longitude,
        latittude: latittude,
        speed: speed,
        timestamp: timestamp
    };
    root.child('users').once("value", function (snapshot) {
        if (snapshot.child(name + '-' + trackerUUID).exists()) {
            root.child('Maps').child(name + '-' + trackerUUID).push(location, function (error) {
                if (error) {
                    res.send({ status: 'location not saved' });
                }
                else {
                    res.send({ status: 'location saved' });
                }
            });
        }
        else {
            res.send({ status: "Tracker is not Registered yet" });
        }
    });
});
ParkingRouter.route('/ParkingStart')
    .get(function (req, res) {
    res.send({ message: 'this is my startparking' });
})
    .post(function (req, res) {
    var name = req.body.name;
    var trackerUUID = req.body.trackerUUID;
    var longitude = req.body.longitude;
    var latittude = req.body.latittude;
    var StartTimestamp = firebase.ServerValue.TIMESTAMP;
    var location = {
        longitude: longitude,
        latittude: latittude,
        StartTimestamp: StartTimestamp
    };
    root.child('users').once("value", function (snapshot) {
        if (snapshot.child(name + '-' + trackerUUID).exists()) {
            root.child('Parking').child(name + '-' + trackerUUID).once('value', function (snapshot) {
                var count = 0;
                snapshot.forEach(function (data) {
                    var temp = data.numChildren();
                    if (temp == 1) {
                        count = 1;
                    }
                });
                if (count == 1) {
                    res.send({ status: 'please first add end parking' });
                }
                else {
                    var postRef = root.child('Parking').child(name + '-' + trackerUUID).push();
                    postRef.child('StartParking').set(location, function (error) {
                        if (error) {
                            res.send({ status: 'start parking not saved' });
                        }
                        else {
                            res.send({ status: 'start parking saved', id: postRef.key() });
                        }
                    });
                }
            });
        }
        else {
            res.send({ status: "Tracker is not Registered yet" });
        }
    });
});
ParkingRouter.route('/ParkingEnd')
    .get(function (req, res) {
    res.send({ message: 'this is my Endparking' });
})
    .post(function (req, res) {
    var name = req.body.name;
    var trackerUUID = req.body.trackerUUID;
    var longitude = req.body.longitude;
    var latittude = req.body.latittude;
    var EndTimestamp = firebase.ServerValue.TIMESTAMP;
    var id = req.body.id;
    var location = {
        longitude: longitude,
        latittude: latittude,
        EndTimestamp: EndTimestamp
    };
    root.child('users').once("value", function (snapshot) {
        if (snapshot.child(name + '-' + trackerUUID).exists()) {
            root.child('Parking').child(name + '-' + trackerUUID).once('value', function (snapshot) {
                var count = 0;
                snapshot.forEach(function (data) {
                    var temp = data.numChildren();
                    if (temp == 1) {
                        count = 1;
                    }
                });
                if (count != 1) {
                    res.send({ status: 'please first add start parking' });
                }
                else {
                    var postRef = root.child('Parking').child(name + '-' + trackerUUID).child(id);
                    postRef.child('EndParking').set(location, function (error) {
                        if (error) {
                            res.send({ status: 'end parking not saved' });
                        }
                        else {
                            res.send({ status: 'end parking saved' });
                        }
                    });
                }
            });
        }
        else {
            res.send({ status: "Tracker is not Registered yet" });
        }
    });
});
app.use(UserRouter);
app.use(MapRouter);
app.use(ParkingRouter);
var port = process.env.PORT || 3000;
var server = app.listen(port, function () {
    var listeningPort = server.address().port;
    console.log('The server is listening on port: ' + listeningPort);
});
