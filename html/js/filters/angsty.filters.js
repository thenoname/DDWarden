/*
 * Some of my more common angular filters
 */

app.filter('isEmpty', function() {
    return function(input, replaceText) { return ( input ? input : replaceText ); }
});

/*
app.filter('formatTicketId', function() {
    return function(input) { 
		return String("000000" + input).slice(-6)
	}
});
*/


app.filter('timeAgo', function() {
    return function(input) { 
		return ( !input ? null : moment(input).fromNow() );
	}
});

app.filter('unixMoment', function() { return function(input) { return moment.unix(input).toDate(); } });

app.filter('percentage', function() {
    return function(current, total, precision) { 
		if ( total == 0 ) return "-";
		return ((current/total)*100).toFixed(precision);
	}
});

app.filter('capitalize', function() {
  return function(input, scope) {
    if (input!=null)
    input = input.toLowerCase();
    return input.substring(0,1).toUpperCase()+input.substring(1);
  }
});

app.filter('count', function() {
    return function(input) { 
		return ( !input ? 0 : input.length );
	}
});

app.filter('formatPhone', function() {
    return function(input) { 
		var prefix = ( input.length > 10 ? input.substring(0, input.length-10) + " " : "" );		
		if ( prefix == "1 " ) prefix = "";	// We don't care.
		input = input.slice(-10);
		return prefix + "(" + input.substring(0,3) + ") " + input.substring(3,6) + "-" + input.substring(6);
	}
});

// Returns a 4-character string, left padded with 0's.
app.filter('formatHospital', function() {
    return function(input) { 
		return String("0000" + input).slice(-4)
	}
});

app.filter('formatMAC', function() {
	return function(input) {
		var t = input.replace(new RegExp(":", 'g'), "");
		t = t.replace(new RegExp("-", 'g'), "");
		if ( t.length != 12 ) return input;
		
		var b = [];
		for ( i = 0; i < t.length; i += 2 ) b.push(t.substring(i, i+2));
		return b.join(":").toUpperCase();
	}
});

app.filter('replace', function() {
	return function(input, find, replace) {
		return input.replace(new RegExp(find, 'g'), replace);
	}
});

app.filter('nl2br', function () {
    return function(text) {
        return text.replace(/\n/g, '<br/>');
    }
});

app.filter('bytes', function() {
	return function(bytes, precision) {
		if (isNaN(parseFloat(bytes)) || !isFinite(bytes)) return '-';
		if ( bytes == 0 ) return '-';
		if (typeof precision === 'undefined') precision = 1;
		var units = ['b', 'kB', 'MB', 'GB', 'TB', 'PB'],
			number = Math.floor(Math.log(bytes) / Math.log(1024));
		return (bytes / Math.pow(1024, Math.floor(number))).toFixed(precision) +  ' ' + units[number];
	}
});


app.filter('json', function () {
    return function(obj) {
        return JSON.stringify(obj);
    }
})

// Just wrap the return in <PRE> tags
app.filter('prettyJSON', function () {
    function syntaxHighlight(json) {
      return JSON ? JSON.stringify(json, null, '  ') : 'your browser doesnt support JSON so cant pretty print';
    }
    return syntaxHighlight;
});

app.filter('startsWith', function() {
	return function(array, search) {
		var matches = [];
		for(var i = 0; i < array.length; i++) {
			if (array[i].indexOf(search) === 0 &&
				search.length < array[i].length) {
				matches.push(array[i]);
			}
		}
		return matches;
	};
});

app.filter('iif', function () {
   return function(input, trueValue, falseValue) {
        return input ? trueValue : falseValue;
   };
});

app.filter('html', ['$sce', function ($sce) { 
    return function (text) {
        return $sce.trustAsHtml(text);
    };    
}]);

app.filter('toArray', function () {
  return function (obj, addKey) {
    if (!angular.isObject(obj)) return obj;
    if ( addKey === false ) {
      return Object.keys(obj).map(function(key) {
        return obj[key];
      });
    } else {
      return Object.keys(obj).map(function (key) {
        var value = obj[key];
        return angular.isObject(value) ?
          Object.defineProperty(value, '$key', { enumerable: false, value: key}) :
          { $key: key, $value: value };
      });
    }
  };
});