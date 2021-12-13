const fs = require('fs');

let rawPEERS = fs.readFileSync('kmc.json');
let PEERS = JSON.parse(rawPEERS);

/*
const addresses = [
	{'range': 24, 'address': 'gd.wlkn.nl', 'location': 'Gouda'},
	{'range': 49, 'address': 'rtd.wlkn.nl', 'location': 'Rotterdam'},
	{'range': 74, 'address': 'dt.wlkn.nl', 'location': 'Delft'},
	{'range': 99, 'address': 'rtd.wlkn.nl', 'location': 'Utrecht'}, 
	{'range': 100, 'address': 'rtd.wlkn.nl', 'location': 'Rotterdam'},
];
*/

const addresses = [
	{'range': 0, 'address': 'gd.wlkn.nl', 'location': 'Gouda'},
	{'range': 20, 'address': 'rtd.wlkn.nl', 'location': 'Rotterdam'},
	{'range': 40, 'address': 'dt.wlkn.nl', 'location': 'Delft'},
	{'range': 60, 'address': 'rtd.wlkn.nl', 'location': 'Utrecht'}, 
	{'range': 80, 'address': 'rtd.wlkn.nl', 'location': 'Rotterdam'},
];

var m = 0;

PEERS.forEach((peer,index) => {
	if(m < addresses.length - 1 && addresses[m+1].range <= peer.id){ m++; }
	console.log(m)
	peer.address = addresses[m].address;
})

module.exports = {
	PEERS
}

