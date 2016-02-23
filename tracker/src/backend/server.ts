/// <reference path="../../typings/tsd.d.ts" />


import firebase = require('firebase');
import express = require('express');
import bodyParser = require('body-parser')
import bcrypt = require('bcrypt')
import Request = require('request')

var FirebaseTokenGenerator = require("firebase-token-generator");


var app: express.Express = express();
var root = new firebase('https://futures-tracker.firebaseio.com/')

app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

app.all('*', function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
});


app.get('/', (req, res) => {
    res.send({ Message: 'Hello futures tracker' })
});


var UserRouter = express.Router()
var MapRouter = express.Router()
var ParkingRouter = express.Router()

UserRouter.route('/user')

    .get((req, res) => {
        var responseJson = {
            hello: "my json route"
        }
        res.send(responseJson)

    })

    .post((req, res) => {

        var name = req.body.name
        var email = req.body.email
        var password = req.body.password
        var cellNo = req.body.cellNo
        var address = req.body.address
        var vehilceNo = req.body.vehicleNo
        var vehicleModel = req.body.vehicleModel
        var timestamp = firebase.ServerValue.TIMESTAMP
        var trackerUUID = req.body.trackerUUID





        root.child('users').once("value", (snapshot) => {




            if (snapshot.child(name + '-' + trackerUUID).exists()) {
                res.send({ status: name + '-' + trackerUUID + " Already exist" })


            } else {



                bcrypt.genSalt(10, (err, salt) => {
                    bcrypt.hash(password, salt, (err, hash) => {

                        if (err) {
                            res.send({ status: 'password encryption failed' })
                        } else {

                            var user =

                                {
                                    name: name,
                                    email: email,
                                    password: hash,
                                    cellNo: cellNo,
                                    address: address,
                                    vehicleNo: vehilceNo,
                                    vehicleModel: vehicleModel,
                                    timestamp: timestamp,
                                    trackerUUID: trackerUUID
                                }



                            res.send({ status: "user Not Created in firebase auth" })

                            root.child('users').child(name + '-' + trackerUUID).set(user, (error) => {
                                if (error) {
                                    res.send({ status: "user Not Created" })
                                } else {
                                    res.send({ status: "user Created", user: user })
                                }
                            })
                        }
                    })
                })


            }


        })




    })

UserRouter.route('/signIn')

    .get((reqq, res) => {
        res.send({ message: "its sign in api" })
    })

    .post((req, res) => {

        var name = req.body.name
        var trackerUUID = req.body.trackerUUID
        var password = req.body.password

        root.child('users').once("value", (snapshot) => {

            if (snapshot.child(name + '-' + trackerUUID).exists()) {

                root.child('users').child(name + '-' + trackerUUID).once('value', (snapshot) => {

                    var data = snapshot.val()

                    bcrypt.compare(password, data.password, (err, flag) => {

                        if (err) {
                            res.send({ sucess: "false", status: 'password decryption failed' })
                        } else {
                            if (data.name == name && data.trackerUUID == trackerUUID && flag) {
                                var tokenGenerator = new FirebaseTokenGenerator("uRnO40MgXdiefLvVUqgekzjEaZskm6qLyrfyiitu");
                                var token = tokenGenerator.createToken({ uid: "1", data: data });
                                console.log(token)
                                res.send({ sucess: "true", token: token })
                            } else {

                                res.send({ sucess: "false", 'status': 'your credentials not matched' })

                            }
                        }

                    })
                })
            } else {
                res.send({ sucess: false, status: "Tracker is not Registered yet" })
            }

        })


    })


MapRouter.route('/Map')

    .get((req, res) => {
        res.send({ message: 'this is my maps' })
    })

    .post((req, res) => {

        var name = req.body.name
        var trackerUUID = req.body.trackerUUID
        var longitude = req.body.longitude
        var latittude = req.body.latittude
        var speed = req.body.speed
        var timestamp = Date.now()
        var url = 'https://roads.googleapis.com/v1/snapToRoads?path=' + latittude + ',' + longitude + '&key=AIzaSyBehWXXONQ7xeYPtJnstLl4pucOZ0iF0U8'



        Request(url, (error, response, body) => { //Road api calling 
            var temp = JSON.parse(body)

            var location = {
                longitude: longitude,
                latittude: latittude,
                speed: speed,
                timestamp: timestamp,
                snaped: temp.snappedPoints[0]
            }
            
            if (error) {
                res.send({ status: error })
            } else {

                root.child('users').once("value", (snapshot) => { // write to firebase

                    if (snapshot.child(name + '-' + trackerUUID).exists()) {
                        var loc = root.child('Maps').child(name + '-' + trackerUUID).push(location, (error) => {
                            if (error) {
                                res.send({ status: 'location not saved' })
                            } else {
                                res.send({ status: 'location saved' })
                            }
                        })


                    } else {
                        res.send({ status: "Tracker is not Registered yet" })
                    }

                })

            }

        })
    })

ParkingRouter.route('/ParkingStart')

    .get((req, res) => {
        res.send({ message: 'this is my startparking' })
    })

    .post((req, res) => {

        var name = req.body.name
        var trackerUUID = req.body.trackerUUID
        var longitude = req.body.longitude
        var latittude = req.body.latittude
        var StartTimestamp = firebase.ServerValue.TIMESTAMP

        var location = {
            longitude: longitude,
            latittude: latittude,
            StartTimestamp: StartTimestamp
        }

        root.child('users').once("value", (snapshot) => {

            if (snapshot.child(name + '-' + trackerUUID).exists()) {


                root.child('Parking').child(name + '-' + trackerUUID).once('value', (snapshot) => {
                    var count = 0
                    snapshot.forEach((data) => {
                        var temp = data.numChildren()
                        if (temp == 1) {
                            count = 1
                        }
                    })
                    if (count == 1) {
                        res.send({ status: 'please first add end parking' })
                    } else {


                        var postRef = root.child('Parking').child(name + '-' + trackerUUID).push()

                        postRef.child('StartParking').set(location, (error) => {
                            if (error) {
                                res.send({ status: 'start parking not saved' })
                            } else {
                                res.send({ status: 'start parking saved', id: postRef.key() })
                            }
                        })

                    }
                })

            } else {
                res.send({ status: "Tracker is not Registered yet" })
            }

        })
    })

ParkingRouter.route('/ParkingEnd')

    .get((req, res) => {
        res.send({ message: 'this is my Endparking' })
    })

    .post((req, res) => {

        var name = req.body.name
        var trackerUUID = req.body.trackerUUID
        var longitude = req.body.longitude
        var latittude = req.body.latittude
        var EndTimestamp = firebase.ServerValue.TIMESTAMP
        var id = req.body.id

        var location = {
            longitude: longitude,
            latittude: latittude,
            EndTimestamp: EndTimestamp
        }

        root.child('users').once("value", (snapshot) => {

            if (snapshot.child(name + '-' + trackerUUID).exists()) {


                root.child('Parking').child(name + '-' + trackerUUID).once('value', (snapshot) => {
                    var count = 0
                    snapshot.forEach((data) => {
                        var temp = data.numChildren()
                        if (temp == 1) {
                            count = 1
                        }
                    })
                    if (count != 1) {
                        res.send({ status: 'please first add start parking' })
                    } else {


                        var postRef = root.child('Parking').child(name + '-' + trackerUUID).child(id)

                        postRef.child('EndParking').set(location, (error) => {
                            if (error) {
                                res.send({ status: 'end parking not saved' })
                            } else {
                                res.send({ status: 'end parking saved' })
                            }
                        })

                    }
                })

            } else {
                res.send({ status: "Tracker is not Registered yet" })
            }

        })
    })

app.use(UserRouter)
app.use(MapRouter)
app.use(ParkingRouter)

var port: number = process.env.PORT || 3000;

var server = app.listen(port, () => {
    var listeningPort: number = server.address().port;
    console.log('The server is listening on port: ' + listeningPort);
});