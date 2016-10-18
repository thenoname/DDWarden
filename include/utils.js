/*
 * Utilities for this application.
 */
 
module.exports = {};

module.exports.toBytes = function(bytes, precision) {
	if (isNaN(parseFloat(bytes)) || !isFinite(bytes)) return '0 b';
	if ( bytes == 0 ) return '-';
	if (typeof precision === 'undefined') precision = 1;
	var units = ['b', 'kB', 'MB', 'GB', 'TB', 'PB'],
		number = Math.floor(Math.log(bytes) / Math.log(1024));
	return (bytes / Math.pow(1024, Math.floor(number))).toFixed(precision) +  ' ' + units[number];
}