const secp256k1 = require('noble-secp256k1');
const ChainUtil = require("../chain-util");

//const { PEERS } = require("../peers");

const fs = require('fs');

let rawPEERS = fs.readFileSync('kmc.json');
let PEERS = JSON.parse(rawPEERS);

var ASSETS = [];
const M = PEERS.length*10;
const G = secp256k1.Point.BASE;

(async () => {

	for (let i = 0; i < M; i++) {
		const sk = ChainUtil.getRandomNumber();
		const pk = G.multiply(sk);

		const homeKMC = 0;//await ChainUtil.getRandomNumberRange(PEERS.length);

		let asset = {
			'sk': ChainUtil.numberToHex(sk),
			'pk': pk.toHex(true),
			'name': 'KMAC entity ' + i,
			'homeKMC': homeKMC,
			'id': 1000 + i,
		}

		const hash = ChainUtil.hash( JSON.stringify( pk.toHex(true) + asset.name ) );
		asset.signature = await secp256k1.sign(hash, PEERS[0].sk);

		ASSETS.push(asset);
	}

	let data = JSON.stringify(ASSETS);
	fs.writeFileSync('./assets.json', data);

})();

