const WebSocket = require("ws");
const https = require('https');
const fs = require('fs');

const express = require('express');
let bodyParser = require('body-parser');

var ejs = require("ejs");

const app = express();

var path = require('path');
var public = path.join(__dirname, 'public');

app.set('views', path.join(__dirname, '/', 'views'));
app.set('view engine', 'ejs');

/*
app.get('/', function(req, res) {
    res.sendFile(path.join(public, 'index.html'));
});
*/

app.use('/', express.static(public));

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

const ID = process.env.ID;


const address = process.env.address;


const options = {
  key: fs.readFileSync(`./certs/${address}/${address}.key.pem`),
  cert: fs.readFileSync(`./certs/${address}/${address}.cert.pem`),
  //secureProtocol: 'SSLv23_method'
};

//const server = https.createServer(options, app).listen(8000 + parseInt(ID, 10));
const server = https.createServer(options, app);


module.exports = {
    app: app,
    server: server
};
