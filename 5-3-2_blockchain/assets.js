const ASSETS = {};

const fs = require('fs');

let rawAssets = fs.readFileSync('assets.json');
let ASSETS_LIST = JSON.parse(rawAssets);

ASSETS_LIST.forEach(asset => {
  ASSETS[asset.id] = asset;
})

module.exports = {
  ASSETS
}