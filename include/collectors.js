var Collector = require("Netflow");
var colors = require('colors');
var moment = require('moment');
var fs = require('fs');
var _ = require('lodash');

var Utils = require('./utils');
var Config = require('./config');
var MACupd = require('./macupd');
var DB = require('./db');

module.exports = {};

var Map = module.exports.Map = {};				// IP to MAC Map
var Devices = module.exports.Devices = {};		// Known network devices, by MAC address.
var Traffic = module.exports.Traffic = {};		// Traffic per device (Commited and wiped once per minute)

var NetflowServer = null;
var MACServer = null;

var data_timestamp = null;		// Integer Timestamp of the minute our current dataset began.
data_timestamp = Math.floor(moment().unix() / 60);

function checkTime() {
	var i = Math.floor(moment().unix() / 60);
	if ( i == data_timestamp ) return;
	commitDB();
}

/*
 * Prepare the collectors by loading existing devices from the database.
 */
module.exports.prepare = function(callback) {
	console.log("[Collectors] Loading existing devices from database...".cyan);
	DB.each("SELECT * FROM Devices", function(err, row) {
		Devices[row.mac] = { name: row.name, host: row.host, ip: row.ip, discovered: row.discovered, lastseen: row.lastseen };
		if ( !row.discovered ) Devices[row.mac].discovered = moment().unix();
		Map[row.ip] = row.mac;
	}, function() {
		console.log(("[Collectors] Loaded " + Object.keys(Devices).length + " devices from database.").green);
		callback();
	});	
}

/*
 * Init and start the Collectors
 */
module.exports.start = function(callback) {
	var nfPort = Config.RFLOW_PORT;
	var macPort = Config.MACUPD_PORT;
	
	NetflowServer = new Collector(function (err) {
		if ( err == null ) return;
		console.error("[Collectors] An error has occured with the Netflow collector endpoint.".red);
		console.error(err);
	});
	NetflowServer.on("listening",function() { console.log(("[Collectors] Netflow collector is listening on " + nfPort).magenta); } );
	NetflowServer.on("packet",function(packet) { 	
		_.each(packet.v5Flows, function(p) {
			var srcip = p.srcaddr.join(".");
			var dstip = p.dstaddr.join(".");
			
			// var isLocalSrc = (p.srcaddr[0] == 192 && p.srcaddr[1] == 168);
			// var isLocalDst = (p.dstaddr[0] == 192 && p.dstaddr[1] == 168);
			var isLocalSrc = ( Map[srcip] ? true : false );
			var isLocalDst = ( Map[dstip] ? true : false );
			
			var isLocalTraffic = ( isLocalSrc && isLocalDst );
			var isWANTraffic = (isLocalTraffic ? false : true);
			
			// Ignore traffic we can't track for now. 
			if ( !isLocalDst && !isLocalSrc ) return;
			
			// Ignore local traffic because it's JUST to/from the router.
			if ( isLocalTraffic ) return;
			
			// Track the traffic on the source device, if it's a local device.
			if ( isLocalSrc ) {		
				var mac = Map[srcip];
				if ( !Traffic[mac] ) Traffic[mac] = { wanSent: 0, wanRecv: 0 };
				if ( !Devices[mac] ) {
					Devices[mac] = { name: mac, discovered: moment().unix() };
					checkDevice(mac, srcip);
				}
				var device = Traffic[mac];
				
				device.ip = srcip;
				Devices[mac].ip = srcip;
				Devices[mac].lastseen = moment().unix();
				device.wanSent += p.dOctets;
			}
			
			// Track the traffic on the destination device, if it's a local device.
			if ( isLocalDst ) {
				var mac = Map[dstip];
				if ( !Traffic[mac] ) Traffic[mac] = { wanSent: 0, wanRecv: 0 };
				if ( !Devices[mac] ) {
					Devices[mac] = { name: mac, discovered: moment().unix() };
					checkDevice(mac, dstip);
				}
				var device = Traffic[mac];
				
				device.ip = dstip;
				Devices[mac].ip = dstip;
				Devices[mac].lastseen = moment().unix();
				device.wanRecv += p.dOctets;
			}
		});
	});
	NetflowServer.listen(nfPort);

	/*
	 * Create and bind our MACupd Collector.
	 */
	var MACServer = new MACupd(function(err) { 
		if ( err != null ) console.error("[Error with MACupd Server]\n" + err);
	});
	MACServer.on("listening", function() { console.log(("[Collectors] MACupd collector is listening on " + macPort).magenta); } )
	MACServer.on("packet", function(packet) { 
		if ( !packet || !packet.ip || !packet.mac ) return;
		if ( packet.ip === "rssi" ) return;
		if ( packet.signal != "*" ) return;
		
		if ( !Map[packet.ip] || Map[packet.ip] != packet.mac ) 
			console.log(("[MACupd] Mapped " + packet.ip + "\t = \t" + packet.mac.toUpperCase()).magenta);
		
		Map[packet.ip] = packet.mac;	
	});
	MACServer.listen(macPort);
	
	setInterval(checkTime, 3000);	
	
	callback();
}

var checkDevice = module.exports.checkDevice = function(mac, ip) {
	require('dns').reverse(ip, function(err, domains) {
		if ( err ) {
			console.log(("[Collectors] Unable to resolve DNS name for new device at " + ip).red);
			return;
		}
		
		if ( domains.length > 0 ) {
			var name = domains[0].trim();
			if ( name.indexOf(".") > 0 ) name = name.split(".")[0];
			Devices[mac].name = name;
			Devices[mac].host = name;
			console.log(("[Collectors] Resolved " + mac + " at " + ip + " to " + Devices[mac].name).green);
		}
	});	
}

function commitDB() {
	DB.serialize(function() {
		// Copy our database to a new variable and wipe the old dataset.
		var dataset = Traffic;
		Traffic = {};
		var Totals = { wanSent: 0, wanRecv: 0 };	
		
		// console.log("Commiting " + Object.keys(dataset).length + " devices to database.");
		var dc = Object.keys(dataset).length;	
		
		// Commit the old dataset to memory.
		var stmt = DB.prepare("INSERT INTO Traffic VALUES (?, ?, ?, ?, ?, ?)");
		_.each(dataset, function(v, k) {
			Totals.wanSent += v.wanSent;
			Totals.wanRecv += v.wanRecv;
			
			stmt.run([k, v.ip, data_timestamp, v.wanSent, v.wanRecv, 1]);
		});
		stmt.finalize(); // function(err) { console.log("Statement finalized!!\n" + err); });
				
		// Commit our total metrics for the minute.
		DB.run("INSERT INTO Totals VALUES (?, ?, ?, ?)", [data_timestamp, Totals.wanSent, Totals.wanRecv, 1]);
		
		// Commit our device details index
		var stmt = DB.prepare("REPLACE INTO Devices VALUES (?, ?, ?, ?, ?, ?)");
		_.each(Devices, function(v, k) {
			stmt.run([k, v.ip, v.host, v.name, v.discovered, v.lastseen]);
		});
		stmt.finalize();		
		
		// Reset our timestamp
		data_timestamp = Math.floor(moment().unix() / 60);
		
		// Log the event
		console.log(("[Collectors] DB Commit at " + moment().format("h:mm:ss a") + " - " + dc + " devices, " + Utils.toBytes(Totals.wanSent) + " up, " + Utils.toBytes(Totals.wanRecv) + " down." ).yellow);
		
		compactDB();
	});
	
	DBExists = true;	
}

/*
 * Beyond an hour, it starts getting silly to have a minute-by-minute traffic indicator. For the sake of graphing, we want to support hourly when possible. 
 * But we can turn 1440 records per device/day into 24 records per device/day. This takes a month of data from around 43,200 records down to 720.
 * A year of data then drops from 518,400 to 8640 per device/year. This is a lot more managable in this lightweight DB.
 * - I want to consider compacting down to days as well, but we would lose the 'hourly' report view.
 */
function compactDB() {
	// Take our current hour. Subtract 1 hour, then first the start of that.
	// So if this runs at 5:04pm, we're going to index everything from 3pm to 4pm. (Or earlier, realistically)
	// We must have atleast one row from two hours ago (the start of the range) to ensure it's ready to compact.
	var timeframe = Math.floor(moment().subtract(1, 'hour').startOf('hour').unix() / 60);
	
	var newTotals = {};
	var newTraffic = {};
	
	var toRows = 0;
	var trRows = 0;
	
	DB.each("SELECT rowid, * FROM Totals WHERE resolution=1 AND stamp < " + timeframe, function(err, row) {
		toRows++;
		var k = Math.floor(moment.unix(row.stamp * 60).startOf('hour').unix() / 60);
		if ( !newTotals[k] ) newTotals[k] = { stamp: k, wanSent: 0, wanRecv: 0, resolution: 60 };
		newTotals[k].wanSent += row.wanSent;
		newTotals[k].wanRecv += row.wanRecv;
	}, function() {
		if ( Object.keys(newTotals).length <= 0 ) return;			
				
		console.log(("[Maint] Compacting " + toRows + " Totals rows into " + Object.keys(newTotals).length + " rows.").green);

		var stmt = DB.prepare("INSERT INTO Totals VALUES (?, ?, ?, ?)");
		_.each(newTotals, function(v, k) { stmt.run([v.stamp, v.wanSent, v.wanRecv, v.resolution]); });
		stmt.finalize(function() { 
			console.log("Finished creating compacted Totals rows, flushing old rows.".yellow);
			DB.run("DELETE FROM Totals WHERE resolution=1 AND stamp < " + timeframe);
		});
	});
	
	DB.each("SELECT rowid, * FROM Traffic WHERE resolution=1 AND stamp < " + timeframe, function(err, row) {
		trRows++;		
		var t = Math.floor(moment.unix(row.stamp * 60).startOf('hour').unix() / 60);
		var k = row.mac + "-" + t;
		if ( !newTraffic[k] ) newTraffic[k] = { ip: row.ip, mac: row.mac, stamp: t, wanSent: 0, wanRecv: 0, resolution: 60 };
		newTraffic[k].ip = row.ip;
		newTraffic[k].wanSent += row.wanSent;
		newTraffic[k].wanRecv += row.wanRecv;
	}, function() {
		if ( Object.keys(newTraffic).length <= 0 ) return;			
		
		console.log(("[Maint] Compacting " + trRows + " Traffic rows into " + Object.keys(newTraffic).length + " rows.").green);
		
		var stmt = DB.prepare("INSERT INTO Traffic VALUES (?, ?, ?, ?, ?, ?)");
		_.each(newTraffic, function(v, k) { stmt.run([v.mac, v.ip, v.stamp, v.wanSent, v.wanRecv, v.resolution]); });
		stmt.finalize(function() { 
			console.log("Finished creating compacted Traffic rows, flushing old rows.".yellow);
			DB.run("DELETE FROM Traffic WHERE resolution=1 AND stamp < " + timeframe);
		});
	});
}