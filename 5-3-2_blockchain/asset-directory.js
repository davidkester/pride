const { ASSETS } = require('./assets');
const keys = Object.keys(ASSETS);

const { k } = require("./config");

const secp256k1 = require('noble-secp256k1');
const ChainUtil = require('./chain-util');

const G = secp256k1.Point.BASE;
const n = secp256k1.CURVE.n;
ChainUtil.n = n;

class AssetDirectory {

	static setPeerId(id=-1){
		this.peerId = id;
	}

	static getAssetbyId(id){
		return ASSETS[id];
	}

	static getPublicKeybyId(id){
		return ASSETS[ id ].pk;
	}

	static getAssetsByPeer(peerId){

		let assetList = [];

		for (let i = 0; i < keys.length; i++) {
			if ( ASSETS[ keys[i] ].homeKMC === peerId){

				const asset = {
					'pk': ASSETS[ keys[i] ].pk,
					'name': ASSETS[ keys[i] ].name,
					'signature': ASSETS[ keys[i] ].signature,
					'id': ASSETS[ keys[i] ].id,
					'homeKMC': ASSETS[ keys[i] ].homeKMC
				};
				assetList.push(asset);
			}
		}

		return assetList;
	}

	static getAllAssets(){

		let assetList = [];

		for (let i = 0; i < keys.length; i++) {
			const asset = {
				'pk': ASSETS[ keys[i] ].pk,
				'name': ASSETS[ keys[i] ].name,
				'signature': ASSETS[ keys[i] ].signature,
				'id': ASSETS[ keys[i] ].id,
				'homeKMC': ASSETS[ keys[i] ].homeKMC
			};
			assetList.push(asset);
		}

		return assetList;
	}



	static getMyAssets(){

		let assetList = [];

		for (let i = 0; i < keys.length; i++) {
			if ( ASSETS[ keys[i] ].homeKMC == this.peerId){
				assetList.push( ASSETS[ keys[i] ] );
			}
		}

		return assetList;
	}


	static computeTag(assetA, assetB){
		const U = assetA.sk
		const V = new secp256k1.Point.fromHex(assetB.pk);
		const K = V.multiply(U);

		return {U: assetA.pk, V: assetB.pk, K: {x: tag.x, y: tag.y}};
	}

	static async createOneOutOfKProof(assetA, assetB){

		if (assetA.id == assetB.id) {
	        throw new Error('Assets should be different');
	    }

		//process.stdout.write(`Generating 1-out-of-${k} proof for Asset ${assetA.id} and Asset ${assetB.id}... `);

		const nAssets = Object.keys(ASSETS).length;

		const assetBpk = secp256k1.Point.fromHex(assetB.pk);

		const pi = (k > 2) ? await ChainUtil.getRandomNumberRange(k) : 0

		var challenges = Array(k); challenges[pi] = ChainUtil.numberToHex(0n);
		var responses = Array(k); 

		var K = assetBpk.multiply( ChainUtil.hexToNumber(assetA.sk) );

		var R = Array(k); var S = Array(k);
		var U = Array(k); var V = Array(k);

		const v = ChainUtil.getRandomNumber();

		U[pi] = assetA.id; //G.multiply( assetA.sk ).toHex();
		V[pi] = assetB.id; //assetBpk.toHex();

		R[pi] = G.multiply( v );
		S[pi] = ( assetBpk ).multiply(v);	

		for (let i = 0; i < k; i++) {
			if (i == pi) {continue;}

			var l = await ChainUtil.getRandomNumberRange(nAssets);
			var m = await ChainUtil.getRandomNumberRange(nAssets);

			if ( l == m ) {i--; continue;}
			if ( (l == U[pi] && m == V[pi]) || (l == V[pi] && m == U[pi]) ) {i--; continue;}

			responses[i] = ChainUtil.getRandomNumber();
			challenges[i] = ChainUtil.getRandomNumber();

			U[i] = secp256k1.Point.fromHex( this.getPublicKeybyId(l) );
			V[i] = secp256k1.Point.fromHex( this.getPublicKeybyId(m) );

			R[i] = G.multiply( responses[i] ).add( U[i].multiply(challenges[i] ) );
			S[i] = V[i].multiply( responses[i] ).add( K.multiply(challenges[i] ) );

			U[i] = l; //U[i].toHex();
			V[i] = m; //V[i].toHex();

			responses[i] = ChainUtil.numberToHex(responses[i]);
			challenges[i] = ChainUtil.numberToHex(challenges[i]);

		}

		const rString = R.reduce((acc, curr) => acc + curr.toHex(), "");
		const sString = S.reduce((acc, curr) =>  acc + curr.toHex(), "");

		K = K.toHex(true);

		const c = ChainUtil.hash2num( G.toHex() + rString + sString + K );

		challenges[pi] = ChainUtil.mod( c - challenges.reduce((acc, curr) => ChainUtil.mod( acc + ChainUtil.hexToNumber(curr)), 0n ));
		responses[pi] = ChainUtil.mod(v - challenges[pi] * ChainUtil.hexToNumber(assetA.sk) );

		responses[pi] = ChainUtil.numberToHex(responses[pi]);
		challenges[pi] = ChainUtil.numberToHex(challenges[pi]);

		//process.stdout.write(`done\n`);

		return {U, V, responses, challenges, K}
	}

	static verifyOneOutOfKProof(signature, tag){

		//process.stdout.write(`Verifying 1-out-of-${k} proof for tag ${proof.K}... `);

		let K = secp256k1.Point.fromHex(tag);

		var R = Array(k); var S = Array(k);		

		for (let i = 0; i < signature.U.length; i++) {

			const U = secp256k1.Point.fromHex( this.getPublicKeybyId( signature.U[i] ) );
			const V = secp256k1.Point.fromHex( this.getPublicKeybyId( signature.V[i] ) );

			//const U = secp256k1.Point.fromHex( proof.U[i] );
			//const V = secp256k1.Point.fromHex( proof.V[i] );

			const r = ChainUtil.hexToNumber( signature.responses[i] );
			const c = ChainUtil.hexToNumber( signature.challenges[i] ); 

			R[i] = G.multiply( r ).add( U.multiply( c ) )
			S[i] = V.multiply( r ).add( K.multiply( c ) )
		}

		const rString = R.reduce((acc, curr) => acc + curr.toHex(), "");
		const sString = S.reduce((acc, curr) =>  acc + curr.toHex(), "");

		const c = signature.challenges.reduce((acc, curr) => ChainUtil.mod(acc + ChainUtil.hexToNumber(curr)), 0n );

		const result = c === ChainUtil.hash2num( G.toHex() + rString + sString + tag );

		//process.stdout.write(`${result ? 'valid!' : 'invalid!' }\n`);
		return result;
	}
}

module.exports = AssetDirectory;