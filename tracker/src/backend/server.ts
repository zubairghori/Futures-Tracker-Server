/// <reference path="../../typings/tsd.d.ts" />
import express = require('express');

var app : express.Express = express();

app.get('/', (req, res) => {
	res.send('futures tracker')
});

var port: number = process.env.PORT || 3000;

var server = app.listen(port, () => {
	var listeningPort: number = server.address().port;
	console.log('The server is listening on port: ' + listeningPort);
});