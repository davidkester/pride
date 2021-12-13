const { workerData, parentPort } = require('worker_threads');
const secp256k1 = require('noble-secp256k1');
const ChainUtil = require("./chain-util");

ChainUtil.n = secp256k1.CURVE.n;


function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {

	const returnData = workerData.map(item => {

		const r = ChainUtil.getRandomNumber();
		const c = ChainUtil.getRandomNumber();

		const G = secp256k1.Point.BASE;
		const K = secp256k1.Point.fromHex(item[2]);
		const U = secp256k1.Point.fromHex(item[0]);
		const V = secp256k1.Point.fromHex(item[1]);

		const R = G.multiply( r ).add( U.multiply( c ) );
		const S = V.multiply( r ).add( K.multiply( c ) );

		return [r,c,U.toHex(true),V.toHex(true),R.toHex(true),S.toHex(true)];

	})

	parentPort.postMessage(returnData)

})();

