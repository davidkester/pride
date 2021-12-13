const NODES_PER_CLUSTER =2;
const CLUSTER_ID = 4;
const CLUSTER_SIZE = 20;
const NODE_EXTRA_CA_CERTS = "certs/rcNL.cert.pem";

var instances = [];

for (let i = 0; i < NODES_PER_CLUSTER - 1; i++) {

  const ID = CLUSTER_ID*CLUSTER_SIZE + i;

  const app = {
    name: 'Node ' + ID,
    script: 'main.js',
    env: {
          "ID": ID, // 0 25 50 75 //// 0 
          "location": "Rotterdam - Mac Mini",
          "address":"rtd.wlkn.nl",
          "autorestart": false,
          "offset": CLUSTER_SIZE, 
          "NODE_EXTRA_CA_CERTS": NODE_EXTRA_CA_CERTS
      }
  };

  instances[i] = app;
}


module.exports = {
  apps: instances
};


/*
ssh -N -R 8000:localhost:8000 david@davidkester.nl
NODE_EXTRA_CA_CERTS=/usr/local/share/ca-certificates/rcNL.crt  address=gd.wlkn.nl ID=1 node main.js

module.exports = {
  apps : [
      {
        name: "Peer Node",
        autorestart: false,
        script: "./main.js",
        instances: NODES_PER_CLUSTER,
        exec_mode: "fork",
        increment_var : 'ID',
        env: {
            "ID": 25, // 0 25 50 75 //// 0 
            "location": "Gouda",
            "address":"gd.wlkn.nl",
            "offset": 25, 
            "NODE_EXTRA_CA_CERTS": "/usr/local/share/ca-certificates/rcNL.crt"
        }
      }
  ]
}

*/




