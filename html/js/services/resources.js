app.factory("CoreResource", [ '$resource', function($resource) { 
	return $resource('/api', { id: '@id' }, {
		getDevices: { method: 'GET', url:'/api/devices' },
		setDevice: { method: 'POST', url:'/api/device/edit' },
		getTotals: { method: 'POST', url:'/api/totals' },
		getTraffic: { method: 'POST', url:'/api/traffic' },		
		getDBStats: { method: 'GET', url:'/api/db' },
		getGraph: { method: 'POST', url:'/api/graph' },
		getGraphMonth: { method: 'POST', url:'/api/graphMonth' },
	}); 
}]);

app.factory("OIDResource", [ '$resource', function($resource) { 
	return $resource('http://api.macvendors.com/:id', { id: '@id' }); 
}]);