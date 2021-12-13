
const WebSocket = require("ws");

var emitter = require('events').EventEmitter;
const { performance } = require('perf_hooks');

const { MIN_APPROVALS, NUMBER_OF_NODES, NODES_PER_CLUSTER, CLUSTER_SIZE} = require("./config");

const Transaction = require('./transaction');
const Block = require('./block');
const secp256k1 = require('noble-secp256k1');
const ChainUtil = require('./chain-util');

const { spawn } = require('child_process');

const { PEERS } = require("./peers");

const AssetDirectory = require("./asset-directory");
const PeerDirectory = require("./peer-directory");

const { Worker } = require('worker_threads');

var path = require('path');
var public = path.join(__dirname, 'public');

const { parse } = require('url');
//const https = require('https');
const { app, server } = require('./server');


const MESSAGE_TYPE = {
	transaction: "TRANSACTION",
	prepare: "PREPARE",
	pre_prepare: "PRE-PREPARE",
	commit: "COMMIT",
	round_change: "ROUND_CHANGE",
	reset: "RESET"
};

const PEER_STATUS = {
	new_round: "NEW_ROUND",
	pre_prepared: "PRE-PREPARED",
	prepared: "PREPARED",
	committed: "COMMITTED",
	final_committed: "FINAL_COMMITTED"
};

const fs = require('fs');


class Peer {
	constructor(id, server = false, ssh = false) {
		this.id = id;
		this.peer = PeerDirectory.setPeerId(id);
		this.peer.location = process.env.location;
		console.log(`Peer ${this.peer.id} setup...`);

		this.events = new emitter();

		this.privateKey = this.peer.sk;
		this.publicKey = this.peer.pk;
		console.log(`Peer ${this.peer.id} public key: ${this.publicKey}\n`);

		AssetDirectory.setPeerId(this.id);
		this.assets = AssetDirectory.getMyAssets();

		this.sockets = [];
		this.blockchain = [];

		this.messages = 0;

		this.ssh = ssh;

		this.oneTwoSum = 0;

		for (let i = 0; i < NUMBER_OF_NODES; i++) { 
		  this.oneTwoSum += i;
		}

		this.transactions = new Map();
		this.commitments = new Map();
		this.preparations = new Map();
		this.blocks = new Map();

		const genesisBlock = {
		  hash: '0be086eff96982144bec7925e9a0e7c238eb43f22f0d42c724665b06b59987ec',
		  lastHash: 0,
		  signature: '304502203f3dd2a5257ccb88e0f5eada858d10b440236462255b3b7375720435ceb3bc8802210093ce1cea506893b5f97db307215762c2874a2910a49d6fc7fdccb89e28362468',
		  timestamp: 1633780854092,
		  sequenceNo: 0,
		  issuer: 0,
		  commitments: [],
		  txs: []
		};

		this.blockchain.push(genesisBlock);

		//this.transactions = [];
		this.status = PEER_STATUS.new_round;
		this.round = 0;

		fs.writeFile('results/'+NUMBER_OF_NODES+'_results-' + this.id + '.csv', '', function (err) {
			if (err) return console.log(err);
		});
	}


	async addTransaction(assetA, assetB){

		return new Promise((resolve, reject) => {
			const time = Math.round ( (0.004674 + (Math.random()*0.000100) ) * 1000 );
			setTimeout( () => resolve(true) , time); // 0.004674
		});

		/*

		var proof =  await AssetDirectory.createOneOutOfKProof(assetA, assetB);  
		const tag =  proof['K'];
		delete proof['K'];

		const payload = 'KMAC Key';

		const tx = await Transaction.createTransaction(payload, tag, proof, this.privateKey);

		//process.stdout.write(`TRANSACTION - ${tx.hash}\n`);
		this.transactions.set(tx.hash, tx);
		return tx;
		*/
	}

	async createBlock(){
		const lastHash = this.blockchain[this.blockchain.length - 1].hash;
		const sequenceNo = this.blockchain[this.blockchain.length - 1].sequenceNo + 1;

		const block = await Block.createBlock( Array.from(this.transactions.values()), lastHash, this.privateKey, sequenceNo, this.id);
		return block;
	}

	clearTransactionPool(){
		this.transactions.clear();
	}

	eventListener(){ return this.events; }

	listTransactions(){ return Array.from( this.transactions.values() ); }

	getBlockchain(){ return this.blockchain; }

	getAllPeers(){ return PeerDirectory.getAllPeers(); }

	getAllAssets(){ return AssetDirectory.getAllAssets(); }

	getMyAssets(){ return AssetDirectory.getMyAssets(); }

	getAssetsByPeer(id){ return AssetDirectory.getAssetsByPeer(id); }

	exit(){
		if(this.ssh) { this.tunnel.kill(); };
		this.wsServer.close();
	}

	static app;

	listen(){
		//https://masteringjs.io/tutorials/express/websockets
		server.listen(this.peer.port);

		console.log(server);

		app.get('/', (req, res) => {
			res.render('index', { id: this.peer.id } ); 
		});
		

		this.wsServer = new WebSocket.Server({ noServer: true, maxPayload: 10 * 1024 * 1024});
		this.wss2 = new WebSocket.Server({ noServer: true });

		console.log(this.wsServer);

		server.on('upgrade', (request, socket, head) => {
			const { pathname } = parse(request.url);

			if (pathname === '/') {

				this.wsServer.handleUpgrade(request, socket, head, socket => {
					this.wsServer.emit('connection', socket, request);
				});

			} else if (pathname === '/monitor') {

				this.wss2.handleUpgrade(request, socket, head, socket => {
					this.wss2.emit('connection', socket, request);
				});

			} else {
				socket.destroy();
			}

		});

		


		this.wsServer.on("connection", (socket, req, client) => {
			console.log("New connection from " + req.socket.remoteAddress + req.url);
			socket.isAlive = true;
			socket.id = req.url;
			socket.on('pong', this.heartbeat);
			console.log(`Connection from ${this.wsServer.clients.size} connected to ${this.sockets.length}: ${this.wsServer.clients.size + this.sockets.length}`); 
			this.messageHandler(socket);
		});

		this.wss2.on("connection", (socket, req, client) => {
			console.log("New connection from " + req.socket.remoteAddress + req.url);
			socket.on('message', function message(msg) {
				console.log(`Received message ${msg}`);
			});
		});

		this.interval = setInterval(() => {
		  this.wsServer.clients.forEach(function each(ws) {
		    if (ws.isAlive === false) return ws.terminate();
		    ws.isAlive = false;
		    ws.ping();
		  });
		}, 30000);

		this.wsServer.on("close", (socket, req, client) => {
			console.log("Server closed");
			clearInterval(this.interval);
			process.exit();
		});

		console.log(`Peer ${this.peer.name} listening on port : ${this.peer.port}`);
		return this.connectToPeers();
	}

	heartbeat() {
		this.isAlive = true;
	}

	broadcastTransaction(transaction, delay=true) {
		return new Promise((resolve, reject) => {

			this.wsServer.clients.forEach(client => {
				if (client.readyState === WebSocket.OPEN) {
					client.send(transaction);
				}
			});

			this.sockets.forEach(socket => {
				if (socket.readyState === WebSocket.OPEN) {
					socket.send(transaction);
				}
			});

			resolve(true);
		});

	}

	connectSocket(socket) {
		this.sockets.push(socket);
		this.messageHandler(socket);

		socket.on('close', () => { 
			console.log(`Close external ${socket.id}`);		
		});
	}


	async connectToPeers() {
		
		const cluster = Math.floor(this.id / CLUSTER_SIZE);
		console.log(cluster);
		console.log(this.id);
		console.log(NODES_PER_CLUSTER);

		for (let i = 0; i <= cluster; i++) {
			for (let j = 0; j < NODES_PER_CLUSTER; j++) {

				const item = PEERS[i*CLUSTER_SIZE + j];
				var url = `wss://${item.address}:${item.port}`;
				console.log(url);

				//if(item.id == this.id) {continue;}
			 	if(item.id >= this.id) {break;}

				const socket = new WebSocket(url, { handshakeTimeout: 10000 });
			
			 	socket.on("open", () => {
					socket.id = item.id;
					//console.log(`Connection from ${this.wsServer.clients.size} connected to ${this.sockets.length}: ${this.wsServer.clients.size + this.sockets.length}`); 
					//process.stdout.write(`CONNECTED TO ${url}`);
					this.connectSocket(socket);
				});

				socket.on('ping', this.heartbeat);

				socket.on("error", (error) => {
					console.log(`ERROR ${socket.url} ${error} ${socket.address}:${socket.port}`);	
					socket.close();

					setTimeout( () => {
						//this.connectToSocket(socket.url);
					}, 1000);
				});
			}
		}
		return true;
	}

	connectToSocket(url) {

		const socket = new WebSocket(`${url}`, { handshakeTimeout: 10000 });

		socket.on("open", () => {
			process.stdout.write(`CONNECTED TO ${url}\n`);
			console.log(`Connection from ${this.wsServer.clients.size} connected to ${this.sockets.length}: ${this.wsServer.clients.size + this.sockets.length}`);
			this.connectSocket(socket);
		});

		socket.on("error", (error) => {
			console.log(`ERROR ${socket.url} ${error} ${socket.address}:${socket.port}`);		
			socket.terminate();
			//this.connectToSocket(socket.url);
		});
	}

	resetTimer(){
		this.start = performance.now();
	}

	async proposeBlock(verify = false) {

		const block = await this.createBlock();
		const signature = await secp256k1.sign(block.hash, this.privateKey);

		var message = {
			"from": this.peer.name,
			"issuer": this.id,
			"signature": signature,
			"type": MESSAGE_TYPE.pre_prepare,
			"blockHash": block.hash,
			"sequenceNo": block.sequenceNo,
			"timestamp": new Date(),
		};

		if( !this.preparations.has(block.hash) ) { this.preparations.set(block.hash, []); }
		this.preparations.get(block.hash).push(message);

		message.block = block;

		process.stdout.write(`PROPOSING BLOCK ${block.sequenceNo} - ${block.hash}\n`);
		process.stdout.write(`No. of transactions ${block.txs.length}\n`);

		this.blocks.set(block.hash, block);
		this.prePrepareTime = performance.now() - this.start;
		this.status = PEER_STATUS.pre_prepared;

		if (verify){
			const verificationPromise = await this.verifyTransactionsPromise( block.txs );
			console.log(verificationPromise);
		}

		if (this.wsServer.clients.size + this.sockets.length != NUMBER_OF_NODES - 1) {

			console.error(`NETWORK NOT FULLY CONNECTED! ${this.wsServer.clients.size + this.sockets.length} : ${NUMBER_OF_NODES}`);
		}
	
		return this.broadcastTransaction( JSON.stringify(message), false);
	}

	verifyTransactionsPromise(txArray){


		return new Promise((resolve, reject) => {
			const time = Math.round ( (0.004674 + (Math.random()*0.000750) ) * 120 * 1000 );
			setTimeout( () => resolve(true), time); // 0.004674

			/*

			const worker = new Worker('./verifyTransactions.js', {workerData: JSON.stringify(txArray)});
		    worker.on('message', resolve);
		    worker.on('error', reject);
		    worker.on('exit', (code) => {
		      if (code !== 0)
		        reject(new Error(`Worker stopped with exit code ${code}`));
		    })

		    */
		    
		})
	}


	messageHandler(socket) {
	    socket.on("message", async message => {

			const data = JSON.parse(message);
			const connections = this.wsServer.clients.size + this.sockets.length; 

			/*

			if( this.wsServer ) { 
				this.wsServer.clients.forEach(client => {
					if (client.readyState === WebSocket.OPEN) { client.send( JSON.stringify(JSON.parse(message)) ); }
				});
			}

			*/
			
			switch (data.type) {
				case MESSAGE_TYPE.pre_prepare:

					const block = data.block;
					
					if ( this.blocks.has(data.blockHash) ) { return false; }
					this.blocks.set(data.blockHash, block);

					delete data.block;
					this.start = performance.now();
					
					process.stdout.write(`VERIFYING BLOCK ${block.sequenceNo}... `);

					// Verify signature
					// Get last hash block
					const hash = ChainUtil.hash( JSON.stringify(block.txs) + block.timestamp + this.blockchain[this.blockchain.length - 1].hash );
					if( !secp256k1.verify( block.signature, hash, PeerDirectory.getPublicKeyById( block.issuer ) ) ) { 
						console.error('Invalid block signature');
						return false; 
					}

					// Verify sequence number
					if( block.sequenceNo != this.round + 1 ) { 
						console.error('Invalid block sequence number');
						return false; 
					}

					// Verify previous hash
					process.stdout.write(`BLOCK ${block.sequenceNo} valid after ${performance.now() - this.start} (${connections} connections)\n`);
					process.stdout.write(`VERIFYING TRANSACTIONS... `);

					// Verify transactions
					const verificationPromise = this.verifyTransactionsPromise(block.txs).then( result => {
						process.stdout.write(`${this.status} ${result} block ${block.sequenceNo} after ${this.prePrepareTime}\n`);
		    			this.status = PEER_STATUS.pre_prepared;
						this.prePrepareTime = performance.now() - this.start;	

						return secp256k1.sign(block.hash, this.privateKey);
					}).then(signature => {

						const message = {
							"from": this.peer.name,
							"issuer": this.peer.id,
							"location": this.peer.location,
							"type": MESSAGE_TYPE.prepare,
							"signature": signature,
							"sequenceNo": data.sequenceNo,
							"blockHash": block.hash,
							"timestamp": new Date(),
						};

						if( !this.preparations.has(data.blockHash) ) { this.preparations.set(data.blockHash, []); }
						
						this.preparations.get(data.blockHash).push(data);
						this.preparations.get(data.blockHash).push(message);
						this.broadcastTransaction(JSON.stringify(message));

						if( this.preparations.get(data.blockHash).length >= MIN_APPROVALS ) {
							this.prepare(data.blockHash, data.sequenceNo);
						}

						if( !this.commitments.has(data.blockHash) ) { return true; }

						if( this.commitments.get( data.blockHash ).size >= MIN_APPROVALS ) {
							this.commit(data.blockHash);
						}

						return true;
					});
	
				break;
				case MESSAGE_TYPE.prepare:

					if( !this.preparations.has( data.blockHash ) ) { this.preparations.set( data.blockHash , []); }
					this.preparations.get( data.blockHash ).push( data );

					if( data.sequenceNo <= this.round ) { 
						return false; 
					};
					

					if( ! secp256k1.verify( data.signature, data.blockHash, PeerDirectory.getPublicKeyById( data.issuer ) ) ) { 
						console.error('Invalid message signature');
						return false; 
					};

					process.stdout.write(`${MESSAGE_TYPE.prepare} ${this.preparations.get(data.blockHash).length}/${NUMBER_OF_NODES} VALID from ${data.location} - ${data.from} - ${data.sequenceNo} (${connections} connections)\n`);

					if (this.preparations.get(data.blockHash).length >= MIN_APPROVALS & this.status === PEER_STATUS.pre_prepared){
						return this.prepare(data.blockHash, data.sequenceNo);
					}
	
				break;
				case MESSAGE_TYPE.commit:

					if(!secp256k1.verify(data.signature, data.blockHash, PeerDirectory.getPublicKeyById( data.issuer) ) ) {
						console.error('Invalid message signature');
						return false;
					};					

					if( !this.commitments.has(data.blockHash) ) { this.commitments.set(data.blockHash, new Map() ); }

					if( !this.commitments.get(data.blockHash).has( data.issuer ) ) {  
						this.commitments.get(data.blockHash).set( data.issuer, message ); 
					} else {
						return false;
					}

					process.stdout.write(`${MESSAGE_TYPE.commit} ${ this.commitments.get(data.blockHash).size }/${NUMBER_OF_NODES} VALID from ${data.location} - ${data.from} - ${data.sequenceNo} (${connections} connections)\n`);

					if ( this.commitments.get(data.blockHash).size == NUMBER_OF_NODES  ) {
						this.events.emit('all_committed');
						return false;
					}

					if( data.sequenceNo <= this.round) { 
						return false; 
					};

					
					if ( this.commitments.get( data.blockHash ).size >= MIN_APPROVALS & this.status === PEER_STATUS.prepared ){
						return this.commit(data.blockHash);
					}


				break;
				case MESSAGE_TYPE.transaction:
					this.transactions.set(data.txHash, data);

				break;

				case MESSAGE_TYPE.reset:
					this.transactions.clear();
					this.commitments.clear();
					this.preparations.clear();
					this.blocks.clear();

					const genesisBlock = {
					  hash: '0be086eff96982144bec7925e9a0e7c238eb43f22f0d42c724665b06b59987ec',
					  lastHash: 0,
					  signature: '304502203f3dd2a5257ccb88e0f5eada858d10b440236462255b3b7375720435ceb3bc8802210093ce1cea506893b5f97db307215762c2874a2910a49d6fc7fdccb89e28362468',
					  timestamp: 1633780854092,
					  sequenceNo: 0,
					  issuer: 0,
					  commitments: [],
					  txs: []
					};

					this.blockchain.push(genesisBlock);
					this.status = PEER_STATUS.new_round;
					this.round = 0;
					
				break;

        	}


	    });
	}

	commit(hash){
		this.status = PEER_STATUS.committed;
		this.commitTime = performance.now() - this.start;
		//process.stdout.write(`${this.status} block ${this.block.sequenceNo} after ${this.commitTime}\n`);		

		var proposedBlock = this.blocks.get( hash );
		//proposedBlock.commitments = Array.from(this.commitments.get(data.blockHash));

		this.blockchain.push( proposedBlock );
		this.round++;

		// Update UTXO and tags list
		this.status = PEER_STATUS.final_committed;

		const time = {
			'prePrepare': Math.round(this.prePrepareTime),
			'prepare': Math.round(this.prepareTime), 
			'commit': Math.round(this.commitTime),
		};

		const timeString = [time.prePrepare, time.prepare, time.commit].join(';') + '\n';

		fs.appendFile('results/'+NUMBER_OF_NODES+'_results-' + this.id + '.csv', timeString, function (err) {
			if (err) throw err;
			console.log(time);
		});

		// Ready for new round
		this.status = PEER_STATUS.new_round;
		this.events.emit('final_committed');

		return true;
	}

	async prepare(hash, sequence){
		this.status = PEER_STATUS.prepared;
		this.prepareTime = performance.now() - this.start;

		//const signature = await secp256k1.sign(hash, this.privateKey);
		return secp256k1.sign(hash, this.privateKey).then( signature => {
			const message = {
				"from": this.peer.name,
				"location": this.peer.location,
				"issuer": this.peer.id,
				"type": MESSAGE_TYPE.commit,
				"sequenceNo": sequence,
				"blockHash": hash, // what if still have no block? 
				"signature": signature,
				"timestamp": new Date(),
			}

			//if( !this.commitments.has(data.blockHash) ) { this.commitments.set(data.blockHash, []); }
			//this.commitments.get(data.blockHash).push(message);

			if( !this.commitments.has(hash) ) { this.commitments.set(hash, new Map() ); }
			this.commitments.get( hash ).set(this.peer.id, message);

			this.broadcastTransaction( JSON.stringify(message) );	

			return true;	
		})
	

	}

}

module.exports = Peer;