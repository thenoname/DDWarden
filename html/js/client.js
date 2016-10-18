'use strict';

var app = angular.module('Angsty', [
 "ngRoute",
 'ngCookies',
 'ngResource',
 "ngSanitize",
 'Angsty.filters',
 'Angsty.directives',
 'ui.bootstrap',
 'chart.js',
 'angularMoment',
 'smart-table', 
 'oitozero.ngSweetAlert',
 'angular-abortable-requests',
 // "angular-web-notification",
 // "btford.socket-io",
]);

var filters = angular.module('Angsty.filters', []);
var directives = angular.module('Angsty.directives', []);

app.config(['stConfig', '$routeProvider', '$resourceProvider', function(stConfig, $routeProvider, $resourceProvider) {
	console.log("Configuring application, running on angular " + angular.version.full);
	
	// $routeProvider.when('/', { controller:'DashboardController', templateUrl:'templates/dashboard.html' });
	$routeProvider.when('/', { controller:'OverviewController', templateUrl:'templates/overview.html' });
	$routeProvider.when('/report', { controller:'ReportController', templateUrl:'templates/report.html' });
	$routeProvider.when('/charts', { controller:'ChartsController', templateUrl:'templates/charts.html' });
	$routeProvider.when('/charts/:mac', { controller:'ChartsController', templateUrl:'templates/charts.html' });
	$routeProvider.when('/charts/:mac/:name', { controller:'ChartsController', templateUrl:'templates/charts.html' });
	$routeProvider.when('/db', { controller:'DatabaseController', templateUrl:'templates/database.html' });
	$routeProvider.when('/edit/:id/:name', { controller: 'DeviceEditController', templateUrl:'templates/edit_device.html' });

	// EXAMPLE:
	// $routeProvider.when('/hospital/', { controller: 'HospitalController', templateUrl:'partials/hospital/hospital.html' });
	// $routeProvider.when('/hospital/:id', { controller: 'HospitalController', templateUrl:'partials/hospital/hospital.html' });

	$routeProvider.otherwise({redirectTo: '/'});
}]);	

app.run(['$rootScope', '$route', '$templateCache', '$location', '$cookieStore', '$http',
	function($rootScope, $route, $templateCache, $location, $cookieStore, $http) {

	// Preload templates to ease page transitions.
	var url;
	for (var i in $route.routes) {
		if ($route.routes[i].preload !== false) {
			if (url = $route.routes[i].templateUrl) {
				// console.log("Preloading: " + url);
				$http.get(url, { cache: $templateCache });
			}
		}
	}

	// Location Management - Useful for blocking navigation until logged in.
	/*
	$rootScope.$on('$locationChangeStart', function (event, next, current) {
		// redirect to login page if not logged in
		if ($location.path() !== '/login' && !AuthService.IsLoggedIn()) {
			console.log("AuthGate: Not logged in. No access to " + $location.path());
			AuthService.SetLoginRedirect($location.path());
			$location.path('/login');
		}
	});	
	*/
}]);
