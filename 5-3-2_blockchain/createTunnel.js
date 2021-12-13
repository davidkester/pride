const { MIN_APPROVALS, NUMBER_OF_NODES } = require("./config");
const { spawn } = require('child_process');

const { PEERS } = require("./peers");

const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 4046,  maxPayload: 256 });

var tunnel = [];

function createTunnel(port){

	return new Promise((resolve, reject) => {
		setTimeout( () => {
			console.log(`${ port }:localhost:${ port }`)
			tunnel.push(spawn('ssh', ['-N',`-R`, `${ port }:localhost:${ port }`,'david@davidkester.nl']));
			resolve(true);
		}, 2000);
	})

}


(async () => {

	//await createTunnel( PEERS[ PEERS.length - 1 ].port );

	for (const [index, item] of Object.entries(PEERS)) {
	 	if( item.id >= NUMBER_OF_NODES ) {break;}
	 	await createTunnel(item.port);
	}

})();


process.on('exit', () => {
	console.log('Got exit');
});

process.on('SIGINT', function () {
	console.log('Got SIGINT');

	tunnel.forEach(item => {
		item.kill();
	});

	process.exit();
});



