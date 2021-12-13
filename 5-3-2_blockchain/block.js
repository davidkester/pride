const secp256k1 = require('noble-secp256k1');
const ChainUtil = require("./chain-util");

class Block {
	constructor(timestamp, _hash, lastHash, txs, signature, issuer, sequenceNo) {
		this.hash = _hash;
		this.lastHash = lastHash;
		this.signature = signature;
		this.timestamp = timestamp;
		this.sequenceNo = sequenceNo;
		this.issuer = issuer;
		this.txs = txs;
	}

	static async createBlock(txs, lastHash, privateKey, sequenceNo, issuer){
		
	    let timestamp = Date.now();

	    const hash = ChainUtil.hash( JSON.stringify(txs) + timestamp + lastHash );
	    const signature = await secp256k1.sign(hash, privateKey);

		return new this(
			timestamp,
			hash,
			lastHash,
			txs,
			signature,
			issuer,
			sequenceNo
		);
	}


}


module.exports = Block;