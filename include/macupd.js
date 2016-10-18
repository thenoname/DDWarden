var dgram=require("dgram");
var events=require("events");
var sys=require('util');

var MACupd = module.exports = function() {
	this.server = dgram.createSocket("udp4");
	events.EventEmitter.call(this);
	var eventContext = this;
	
	this.server.on("message", function (mesg, rinfo) {
		try	{
			var data = mesg.toString().trim().split(/[ ,]+/);
			var packet = { };
			packet.ip = data[1];
			packet.flag1 = data[2];				// Function unknown
			packet.flag2 = data[3];				// Function unknown
			packet.mac = data[4];
			packet.signal = data[5];			// Unknown, suspect wireless signal strength?
			packet.interface = data[6];					
			
			this.emit.call(eventContext, "packet", packet);
		} catch(err) {
			this.emit.call(eventContext, "error", err);
		}
	});
	
	this.server.on("listening", this.emit.bind(this,"listening"));

	this.listen = function(port) {
		this.server.bind(port);  
	}
}
sys.inherits(MACupd, events.EventEmitter);
