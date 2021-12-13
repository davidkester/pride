const crypto = require('crypto');
const randomNumber = require("random-number-csprng");

class ChainUtil {

	static n;

	static mod(a, b = this.n) {
	    const result = a % b;
	    return result >= 0 ? result : b + result;
	}	

	static hash(message){
		//return this.mod( BigInt('0x' + crypto.createHash('sha256').update(message).digest('hex') ) );
		if (typeof message !== 'string') {
	        throw new TypeError('hexToNumber: expected string, got ' + typeof message);
	    }
		return crypto.createHash('sha256').update(message).digest('hex');
	}

	static hash2num(message){
		return this.mod( BigInt('0x' + this.hash(message) ) );
		//return crypto.createHash('sha256').update(message).digest('hex');
	}

	static getRandomNumber(){
		return BigInt('0x' + this.getRandomString());
	}

	static getRandomString(bytes=32){
		return crypto.randomBytes(bytes).toString('hex');
	}

	static getRandomBytes(bytes=32){
		return crypto.randomBytes(bytes);
	}

	static getRandomNumberRange(k){
		return randomNumber(0, k-1);
	}

	static numberToHex(num) {
	    const hex = num.toString(16);
	    return hex.length & 1 ? `0${hex}` : hex;
	}

	static hexToNumber(hex) {
	    if (typeof hex !== 'string') {
	        throw new TypeError('hexToNumber: expected string, got ' + typeof hex);
	    }
	    return BigInt(`0x${hex}`);
	}

}

module.exports = ChainUtil;

