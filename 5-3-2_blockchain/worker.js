const secp256k1 = require('noble-secp256k1');
const ChainUtil = require("./chain-util");

ChainUtil.n = secp256k1.CURVE.n;

module.exports = async ({ _G, _U, _V, _K }) => {

	console.log('test')

	const r = ChainUtil.getRandomNumber();
	const c = ChainUtil.getRandomNumber();

	const G = secp256k1.Point.BASE;
	const K = new secp256k1.Point(_K.x, _K.y);
	const U = new secp256k1.Point(_U.x, _U.y);
	const V = new secp256k1.Point(_V.x, _V.y);

	const R = G.multiply( r ).add( U.multiply( c ) );
	const S = V.multiply( r ).add( K.multiply( c ) );


  	return [r,c,U,V,R,S];
};