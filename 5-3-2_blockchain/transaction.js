const secp256k1 = require('noble-secp256k1');
const ChainUtil = require('./chain-util');

class Transaction {
	constructor(timestamp, payload, tag, signature, hash) {
		this.timestamp = timestamp
		this.payload = payload;
		this.tag = tag;
		this.signature = signature;
		this.hash = hash
		this.signature = signature;
	}

	static async createTransaction(payload, tag, signature, privateKey){
		var timestamp = new Date();
		timestamp = timestamp.getTime();

		const hash = ChainUtil.hash(JSON.stringify(payload) + tag +  JSON.stringify(signature) + timestamp  );
		//const signature = await secp256k1.sign(hash, privateKey);

		return new this(
			timestamp,
			payload,
			tag,
			signature,
			hash
		);
	}
}

module.exports = Transaction;

