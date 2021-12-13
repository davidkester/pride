const MAX_TX_PER_BLOCK = 30;
const BLOCK_TIMEOUT = 50 * 1000;
const TX_NUM = 100 * 100;

const AssetDirectory = require("./asset-directory");
const { performance } = require('perf_hooks');

const Peer  = require("./peer");

const nodeID = 99
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



peer.listen();
throughoutTest();

