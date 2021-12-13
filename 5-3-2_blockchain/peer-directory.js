const { PEERS } = require("./peers");

const secp256k1 = require('noble-secp256k1');
const ChainUtil = require('./chain-util');

const G = secp256k1.Point.BASE;
const n = secp256k1.CURVE.n;
ChainUtil.n = n;

class PeerDirectory {

	static setPeerId(id){
		this.id = id;
		return this.getPeerById(this.id);
	}

	static getPeerById(id){

		const peer = {
			'pk': PEERS[ id ].pk,
			'sk': (id === this.id) ? PEERS[ id ].sk : null, 
			'name': PEERS[ id ].name,
			'location': PEERS[ id ].location,
			'address': PEERS[ id ].address,
			'port': PEERS[ id ].port,
			'id': PEERS[ id ].id,
		};

		return peer;
	}

	static getPublicKeyById(id){
		return secp256k1.Point.fromHex(PEERS[ id ].pk);
	}

	static getAllPeers(){

		return PEERS.filter(peer => {
			return peer.id == this.id ? false : true;
		}).map(peer => {
			return {
				'pk': peer.pk,
				'name': peer.name,
				'address': peer.location,
				'location': peer.address,
				'port': peer.port,
				'id': peer.id,
			}
		})

	}

}

module.exports = PeerDirectory;