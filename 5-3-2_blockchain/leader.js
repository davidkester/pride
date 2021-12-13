//NODE_EXTRA_CA_CERTS=./certs/rcNL.cert.pem address=rtd.wlkn.nl node leader.js 99

const HTTP_PORT = process.env.HTTP_PORT || 3000;
const fs = require('fs');

const MAX_TX_PER_BLOCK = 30;
const BLOCK_TIMEOUT = 50 * 1000;
const TX_NUM = MAX_TX_PER_BLOCK * 20;

const { MIN_APPROVALS, NUMBER_OF_NODES, NODES_PER_CLUSTER, CLUSTER_SIZE} = require("./config");

const { spawn } = require('child_process');

const express = require("express");
const bodyParser = require("body-parser");
const AssetDirectory = require("./asset-directory");
const { performance } = require('perf_hooks');

const Peer  = require("./peer");

fs.writeFile('./leader/'+NUMBER_OF_NODES+'_leader_results.csv', '', function (err) {
	if (err) return console.log(err);
});


var args = process.argv.slice(2);
const nodeID = parseInt(args[0], 10);

var port = 8000 + nodeID;

process.title = `Leader (node ${nodeID})`;

var i = 0;
var j = 0;
var k = 0;
var start;
var m = 0;
var blockTimeout = null;

const peer = new Peer(nodeID, false, false);

const peers = peer.getAllPeers().filter(peer => {
	return (peer.id == nodeID) ? false : true;
})

const assets = peer.getMyAssets();
var externalAssets = peer.getAssetsByPeer(peers[i].id);

function startBlockTimeout() {
  	return setTimeout(() => {
  		console.log(`BLOCK TIMEOUT`);
		peer.proposeBlock();
	}, BLOCK_TIMEOUT);
}


async function throughoutTest() {

	start = performance.now();

	while (m < TX_NUM) {

		if( ( m % MAX_TX_PER_BLOCK ) == 0 ) {
			blockTimeout = startBlockTimeout(); 
		};

		if (j >= externalAssets.length & i >= peers.length - 1 & k < assets.length){
			k++; j = 0; i = 0;
			externalAssets = peer.getAssetsByPeer( peers[i].id );
		}

		if (j >= externalAssets.length & i < peers.length - 1){
			i++; j = 0;
			externalAssets = peer.getAssetsByPeer( peers[i].id );
		}

		console.log(assets[k]);
		console.log(externalAssets[j]);

		const tx = await peer.addTransaction(assets[k], externalAssets[j]);

		j++; m++;

		if( ( m % MAX_TX_PER_BLOCK ) == 0 ) {
			clearTimeout(blockTimeout);
			return peer.proposeBlock();
		}
	} 
}

peer.eventListener().on('final_committed', async () => {
	console.log('FINAL COMMTITTED');
});

peer.eventListener().on('all_committed', async () => {
	console.log('ALL COMMTITTED');
	peer.clearTransactionPool();

	console.log(performance.now() - start);

	const timeString = performance.now() - start + '\n';

	fs.appendFile('./leader/'+NUMBER_OF_NODES+'_leader_results.csv', timeString, function (err) {
		if (err) throw err;
		console.log(timeString);
	});

	peer.resetTimer();
	setTimeout( () => throughoutTest(), 4000); // 0.004674
	
});


setTimeout(() => {
    peer.listen();
}, 1000 );

setTimeout(() => {
	start = performance.now();
	peer.resetTimer();
	throughoutTest();
}, 10*2000);


process.on('exit', () => {
	peer.exit();
});

process.on('SIGINT', function () {
	process.exit();
});

