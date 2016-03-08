/// <reference path="../../typings/tsd.d.ts" />
var firebase = require('firebase');
var express = require('express');
var bodyParser = require('body-parser');
var bcrypt = require('bcrypt');
var Request = require('request');
var Moment = require('moment');
var FirebaseTokenGenerator = require("firebase-token-generator");
var app = express();
var root = new firebase('https://futures-tracker.firebaseio.com/');
var prevTimestamp;
var prevLattitude = 0;
var prevLongitude = 0;
var parkingId;
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.all('*', function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
});
app.get('/', function (req, res) {
    res.send({ Message: 'Hello futures tracker' });
});
var UserRouter = express.Router();
var MapRouter = express.Router();
var ParkingRouter = express.Router();
UserRouter.route('/user')
    .get(function (req, res) {
    var responseJson = {
        hello: "My User Route"
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
    root.child('users').once("value", function (snapshot) {
        if (snapshot.child(name + '-' + trackerUUID).exists()) {
            res.send({ status: name + '-' + trackerUUID + " Already exist" });
        }
        else {
            bcrypt.genSalt(10, function (err, salt) {
                bcrypt.hash(password, salt, function (err, hash) {
                    if (err) {
                        res.send({ status: 'password encryption failed' });
                    }
                    else {
                        var user = {
                            name: name,
                            email: email,
                            password: hash,
                            cellNo: cellNo,
                            address: address,
                            vehicleNo: vehilceNo,
                            vehicleModel: vehicleModel,
                            timestamp: timestamp,
                            trackerUUID: trackerUUID
                        };
                        res.send({ status: "user Not Created in firebase auth" });
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
                bcrypt.compare(password, data.password, function (err, flag) {
                    if (err) {
                        res.send({ sucess: "false", status: 'password decryption failed' });
                    }
                    else {
                        if (data.name == name && data.trackerUUID == trackerUUID && flag) {
                            var tokenGenerator = new FirebaseTokenGenerator("uRnO40MgXdiefLvVUqgekzjEaZskm6qLyrfyiitu");
                            var token = tokenGenerator.createToken({ uid: "1", data: data });
                            console.log(token);
                            res.send({ sucess: "true", token: token });
                        }
                        else {
                            res.send({ sucess: "false", 'status': 'your credentials not matched' });
                        }
                    }
                });
            });
        }
        else {
            res.send({ sucess: false, status: "Tracker is not Registered yet" });
        }
    });
});
MapRouter.route('/Map')
    .get(function (req, res) {
    res.send({ message: "Map Route is Here" });
})
    .post(function (req, res) {
    var name = req.body.name;
    var trackerUUID = req.body.trackerUUID;
    var longitude = req.body.longitude;
    var latittude = req.body.latittude;
    var speed = req.body.speed;
    var timestamp = Date.now();
    var url = 'https://roads.googleapis.com/v1/snapToRoads?path=' + latittude + ',' + longitude + '&key=AIzaSyBehWXXONQ7xeYPtJnstLl4pucOZ0iF0U8';
    console.log(latittude);
    if (latittude != 0 && latittude != "nan") {
        root.child('users').once("value", function (snapshot) {
            if (snapshot.child(name + '-' + trackerUUID).exists()) {
                Request(url, function (error, response, body) {
                    var temp = JSON.parse(body);
                    var location = {
                        longitude: longitude,
                        latittude: latittude,
                        speed: speed,
                        timestamp: timestamp,
                        snaped: (temp && temp.snappedPoints && temp.snappedPoints[0]) ? temp.snappedPoints[0] : {} // road api response object
                    };
                    Parking.checkParkingCondition(latittude, longitude, trackerUUID, name);
                    var loc = root.child('Maps').child(name + '-' + trackerUUID).push(location, function (error) {
                        if (error) {
                            res.send({ status: 'location not saved' });
                        }
                        else {
                            res.send({ status: 'location saved' });
                        }
                    });
                });
            }
            else {
                res.send({ status: "Tracker is not Registered yet" });
            }
        });
    }
    else {
        res.send({ status: "GPS sending null data!" });
    }
});
var Parking = (function () {
    function Parking() {
    }
    Parking.Start = function (latittude, longitude, trackerUUID, name) {
        var parkinLocation = {
            latittude: latittude,
            longitude: longitude,
            timestamp: Date.now()
        };
        root.child('Parking').child(name + '-' + trackerUUID).once('value', function (snapshot) {
            var count = 0;
            snapshot.forEach(function (data) {
                var temp = data.numChildren();
                if (temp == 1) {
                    count = 1;
                }
            });
            if (count == 1) {
                // res.send({ status: 'please first add end parking' })
                console.log("please first add end parking");
            }
            else {
                var postRef = root.child('Parking').child(name + '-' + trackerUUID).push();
                postRef.child('StartParking').set(parkinLocation, function (error) {
                    if (error) {
                        // res.send({ status: 'start parking not saved' })
                        console.log('start parking not saved');
                    }
                    else {
                        parkingId = postRef.key();
                        // res.send({ status: 'start parking saved', id: postRef.key() })
                        console.log("start parking saved");
                    }
                });
            }
        });
    };
    Parking.end = function (latittude, longitude, trackerUUID, name) {
        var parkinLocation = {
            latittude: latittude,
            longitude: longitude,
            timestamp: Date.now()
        };
        root.child('Parking').child(name + '-' + trackerUUID).once('value', function (snapshot) {
            var count = 0;
            snapshot.forEach(function (data) {
                var temp = data.numChildren();
                if (temp == 1) {
                    count = 1;
                }
            });
            if (count != 1) {
                // res.send({ status: 'please first add start parking' })
                console.log('please first add start parking');
            }
            else {
                var postRef = root.child('Parking').child(name + '-' + trackerUUID).child(parkingId);
                postRef.child('EndParking').set(parkinLocation, function (error) {
                    if (error) {
                        // res.send({ status: 'end parking not saved' })
                        console.log('end parking not saved');
                    }
                    else {
                        // res.send({ status: 'end parking saved' })
                        console.log('end parking saved');
                    }
                });
            }
        });
    };
    Parking.checkParkingCondition = function (latittude, longitude, trackerUUID, name) {
        if (prevTimestamp == null) {
            prevTimestamp = Moment(new Date()); //todays date
            prevLattitude = latittude;
            prevLongitude = longitude;
        }
        else {
            var duration = Moment.duration(Moment(new Date()).diff(prevTimestamp));
            var minutes = duration.asMinutes();
            if (minutes >= 1) {
                var distance = Parking.CalculateDistance(prevLattitude, prevLongitude, latittude, longitude, "K") * 1000;
                if (distance <= 15) {
                    Parking.Start(latittude, longitude, trackerUUID, name);
                    console.log("distance=" + distance + "minutes=" + minutes);
                }
                else {
                    Parking.end(latittude, longitude, trackerUUID, name);
                    prevLattitude = null;
                    prevLongitude = null;
                    prevTimestamp = null;
                    parkingId = null;
                    console.log("distance1=" + distance + "minutes1=" + minutes);
                }
            }
        }
    };
    Parking.CalculateDistance = function (lat1, lon1, lat2, lon2, unit) {
        //:::    unit = the unit you desire for results                               :::
        //:::           where: 'M' is statute miles (default)                         :::
        //:::                  'K' is kilometers                                      :::
        //:::                  'N' is nautical miles                                  :::
        var radlat1 = Math.PI * lat1 / 180;
        var radlat2 = Math.PI * lat2 / 180;
        // var radlon1 = Math.PI * lon1 / 180;
        // var radlon2 = Math.PI * lon2 / 180;
        var theta = lon1 - lon2;
        var radtheta = Math.PI * theta / 180;
        var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
        dist = Math.acos(dist);
        dist = dist * 180 / Math.PI;
        dist = dist * 60 * 1.1515;
        if (unit == "K") {
            dist = dist * 1.609344;
        }
        if (unit == "N") {
            dist = dist * 0.8684;
        }
        return dist;
    };
    return Parking;
})();
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
var port = process.env.PORT || 4000;
var server = app.listen(port, function () {
    var listeningPort = server.address().port;
    console.log('The server is listening on port: ' + listeningPort);
});
