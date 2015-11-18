/// <reference path="../../typings/tsd.d.ts" />
var express = require('express');
var app = express();
app.get('/', function (req, res) {
    res.send('futures tracker');
});
var port = process.env.PORT || 3000;
var server = app.listen(port, function () {
    var listeningPort = server.address().port;
    console.log('The server is listening on port: ' + listeningPort);
});
