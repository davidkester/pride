
const WebSocket = require("ws");
const { WebSocketServer } = require('ws');
var path = require('path');
var public = path.join(__dirname, 'public');

const Peer  = require("./peer");
const { NUMBER_OF_NODES } = require("./config");

//var args = process.argv.slice(2);
//const nodeID = parseInt(args[0], 10);

const ID = process.env.ID;
process.title = "Peer Node " + ID;

const offset = process.env.offset;

const peer = new Peer(ID, false, false);

setTimeout(() => {
	console.log('Start listening');
    peer.listen();
}, ( ID % offset ) * 2000 );


process.on('exit', () => {
	console.log('Got exit');
	peer.exit();
});

process.on('SIGINT', function () {
	console.log('Got SIGINT');
	process.exit();
});



