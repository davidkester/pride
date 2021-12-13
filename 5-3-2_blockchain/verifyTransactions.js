const { workerData, parentPort } = require('worker_threads');
const secp256k1 = require('noble-secp256k1');
const AssetDirectory = require("./asset-directory");


(() => {
	const txs = JSON.parse(workerData);
	
	const valid = txs.map(tx => {
		return AssetDirectory.verifyOneOutOfKProof( tx.signature, tx.tag ); 
	}).reduce((acc, curr) => curr & acc, true);
	
	parentPort.postMessage(valid);

})();

