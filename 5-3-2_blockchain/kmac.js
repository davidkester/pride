const crypto = require('crypto');
const buffer = require('buffer');


  
(async () => {

	const key = Buffer.alloc(32, crypto.randomBytes(32));
	const iv = Buffer.alloc(12, crypto.randomBytes(12));

	console.log(iv.toString('hex'));
	console.log(key.toString('hex'));

    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    const secret = crypto.randomBytes(24).toString('hex');
    console.log(secret)

    let enc = cipher.update(secret, 'utf8', 'base64');

    enc += cipher.final('base64');

    console.log( [enc, iv.toString('hex'), cipher.getAuthTag().toString('hex') ] );


    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    
    decipher.setAuthTag(cipher.getAuthTag());


    let str = decipher.update(enc, 'base64', 'utf8');
    str += decipher.final('utf8');
    console.log(str);

})();