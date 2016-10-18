/*
 * Include the configuration file
 */
var colors = require('colors');
var fs = require('fs');
 
module.exports = {};

try {
	module.exports = JSON.parse(fs.readFileSync("./config/config.json", 'utf8'));
} catch(e) {
	console.error("[Config] An error occured attempting to parse the ./config/config.json file.".red);
	console.error(e);
	process.exit(1);
}