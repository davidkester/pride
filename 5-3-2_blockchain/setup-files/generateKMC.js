const secp256k1 = require('noble-secp256k1');
const ChainUtil = require("../chain-util");

const fs = require('fs');

const N = 1;
var kmc = [];

const G = secp256k1.Point.BASE;

for (let i = 0; i < N; i++) {
	const sk = ChainUtil.getRandomNumber();
	const pk = G.multiply(sk);

	kmc.push({
		'sk': ChainUtil.numberToHex(sk),
		'pk': pk.toHex(true),
		'name': 'KMC ' + i,
		'id': 1000 + i,
		'address': 'davidkester.nl',
		'port': 8000 + i, 
		'location': 'Rotterdam'
	})

}

console.log(kmc)


let data = JSON.stringify(kmc);
fs.writeFileSync('./kmc.json', data);