app.controller('HeaderController', function ($scope, $rootScope, CoreResource, OIDResource) {
	$scope.root = $rootScope;
	
	CoreResource.getDBStats(function(data) {			
		$scope.DB = data;
		$rootScope.DBStats = data;
	});
});

app.controller('OverviewController', function ($scope, $rootScope, CoreResource, OIDResource) {
	$scope.Current = null;
	$scope.Previous = null;
	
	$scope.currentTheme = "success";
	$scope.previousTheme = "success";
	
	$scope.dataCap = 1099511627776;	// Say hello to a Terabyte in 'bytes'

	$scope.bytesToString = function(raw) {
		var bytes = Number(raw.value);
		if (bytes < 1024) return (bytes).toFixed(1) + ' B';
		if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' kB';
		if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB';
		if (bytes < 1024 * 1024 * 1024 * 1024) return (bytes / 1024 / 1024 / 1024).toFixed(1) + ' GB';
		if (bytes < 1024 * 1024 * 1024 * 1024 * 1024) return (bytes / 1024 / 1024 / 1024 / 1024).toFixed(1) + ' TB';
		return (bytes / 1024 / 1024 / 1024 / 1024 / 1024).toFixed(1) + ' PB';
	}
	
	$scope.formatTooltip = function(raw) { return raw.label + ": " + $scope.bytesToString(raw); }
	$scope.formatMultiTooltip = function(raw) { return raw.datasetLabel + ": " + $scope.bytesToString(raw);	}		
	$scope.options = {
		scaleLabel: $scope.bytesToString,
		tooltipTemplate: $scope.formatTooltip,
		multiTooltipTemplate: $scope.formatMultiTooltip,
		scaleOverride: true,
		scaleSteps: 8,
		scaleStepWidth: ($scope.dataCap / 8),
		maintainAspectRatio: false,
		responsive: true
	};	
	
	
	$scope.postprocess = function(i) {
		return function(data) {			
			$scope.data[i] = [[]];		
			$scope.labels[i] = [];
			delete data.$promise;
			delete data.$resolved;
			$scope.data[i] = [[]];
			
			var lastSample = 0;
			angular.forEach(data, function(v, k) {
				if ( v.value > 0 ) lastSample = k;
			});
			
			var running = 0;
			angular.forEach(data, function(sample, k) { 
				$scope.labels[i].push(sample.name);
				if ( k <= lastSample ) {
					running += sample.value;
					$scope.data[i][0].push(running || null);
				} else {
					$scope.data[i][0].push(null);
				}
			});
		};
	};	
	
	$scope.GetTotals = function() {
		CoreResource.getTotals( { frame: -1 }, function(data) {			
			data.wanTotal = data.wanRecv + data.wanSent;
			$scope.Current = data;
			
			$scope.currentProgress = Math.round((data.wanTotal / $scope.dataCap) * 100);
			if ( $scope.currentProgress >= 70 ) $scope.currentTheme = "warning";
			if ( $scope.currentProgress >= 90 ) $scope.currentTheme = "danger";
		});
		CoreResource.getTotals( { frame: -2 }, function(data) {			
			data.wanTotal = data.wanRecv + data.wanSent;
			$scope.Previous = data;

			$scope.previousProgress = Math.round((data.wanTotal / $scope.dataCap) * 100);
			if ( $scope.previousProgress >= 70 ) $scope.previousTheme = "warning";
			if ( $scope.previousProgress >= 90 ) $scope.previousTheme = "danger";
		});
		CoreResource.getGraph( { mac: $scope.mac || null, mode: 'month', target: -1, includeDay: false }, $scope.postprocess(0));
		CoreResource.getGraph( { mac: $scope.mac || null, mode: 'month', target: -2, includeDay: false }, $scope.postprocess(1));
	}
	
	$scope.Refresh = function() { 
		console.log("Refreshing..");
		$scope.Current = null;
		$scope.Previous = null;
		$scope.currentProgress = 0;
		$scope.previousProgress = 0;
		
		$scope.labels = [[], []];
		$scope.series = [["*"]];
		$scope.data = [null, null];
		
		$scope.GetTotals();
	}
	$scope.Refresh();
});
	
app.controller('ReportController', function ($scope, $rootScope, CoreResource, OIDResource) {
	$scope.sortOptions = [
		{ name: "Sort by IP Address", value: "sortIndex" },
		{ name: "Sort by MAC Address", value: "mac" },
		{ name: "Sort by Nametag", value: "nameIndex" },
	];
	
	$scope.timeOptions = [
		{ name: "Show this Month", value: -1 },
		{ name: "Show last Month", value: -2 },
		{ name: "Show last 5 minutes", value: 5 },
		{ name: "Show last 10 minutes", value: 10 },
		{ name: "Show last 15 minutes", value: 15 },
		{ name: "Show last 30 minutes", value: 30 },
		{ name: "Show last Hour", value: 60 },
		{ name: "Show last 2 Hours", value: 120 },
		{ name: "Show last 6 Hours", value: 360 },
		{ name: "Show last 12 Hours", value: 720 },
		{ name: "Show last 24 Hours", value: 1440 },
		{ name: "Show last 3 Days", value: 4320 },
		{ name: "Show last 7 Days", value: 10080 },
		{ name: "Show last 14 Days", value: 20160 },
		{ name: "Show last 30 Days", value: 43200 },
		{ name: "Show last 60 Days", value: 86400 },
	];
	
	$scope.timeframe = $scope.timeOptions[0];
	$scope.sortMode = $scope.sortOptions[0];
	$scope.Devices = {};
	$scope.deviceList = [];
	$scope.Data = {};			// Datasets for each device.
	$scope.OID = {};			// OID Vendor for each device.
	
	$scope.rebuildList = function() {
		$scope.deviceList = [];
		angular.forEach($scope.Devices, function(v) { $scope.deviceList.push(v); });
	}
	
	$scope.GetDevices = function() {
		$scope.Data = {};
		
		CoreResource.getDevices(function(data) {
			console.error(data);
			delete data.$promise;
			delete data.$resolved;
			
			angular.forEach(data, function(v, k) {
				v.ipIndex = 0;
				v.nameIndex = v.name;
				if ( v.name == v.mac ) v.nameIndex = "ZZZZ" + v.mac;
				if ( v.ip ) {
					var octets = v.ip.split(".");
					v.ipIndex = 100 + parseInt(octets[3]);
				}
				
				// $scope.Devices.push(v);
				$scope.Devices[k] = v;
				$scope.Devices[k].stats = { live: false };
			});		

			$scope.rebuildList();
			$scope.UpdateTimeframe();
		});
	}
	
	$scope.UpdateTimeframe = function() {
		var timeframe = $scope.timeframe ? $scope.timeframe.value : 5;
		console.error("Requesting timeframe of " + timeframe);
		CoreResource.getTotals( { frame: timeframe }, function(data) {			
			data.wanTotal = data.wanRecv + data.wanSent;
			$scope.Totals = data;
			$rootScope.Totals = data;
			// console.error(data);
		});
		
		angular.forEach($scope.Devices, function(d) {
			var mac = d.mac;
			CoreResource.getTraffic( { mac: mac, frame: timeframe }, function(data) {
				// $scope.Data[mac] = data;
				data.wanTotal = data.wanRecv + data.wanSent;
				$scope.Devices[mac].stats = data;
				$scope.Devices[mac].stats.live = true;
				$scope.rebuildList();
				
				// console.error("Data for " + mac);
				// console.error(data);
			});			
			
			if ( $scope.OID[mac] ) return;
			OIDResource.get( { id: mac }, function(data) {
				delete data.$promise;
				delete data.$resolved;
				var r = "";
				for ( var i = 0; i < Object.keys(data).length; i++ ) r += data[i];
				$scope.OID[mac] = r;
			});
		});			
	}
	
	$scope.Refresh = function() { 
		console.log("Refreshing..");
		$scope.GetDevices();
		$scope.Totals = null;
	}
	$scope.GetDevices();
	// $scope.UpdateTimeframe();
});

app.controller('DeviceEditController', function ($scope, $routeParams, $location, CoreResource) {
	$scope.mac = $routeParams['id'];
	$scope.name = $routeParams['name'];
	$scope.newName = $routeParams['name'];
	
	$scope.Submit = function() {
		var bundle = { mac: $routeParams['id'], name: $scope.newName };
		console.error(bundle);
		CoreResource.setDevice(bundle, function(r) {
			$location.path("/report");
		});
	}
});

app.controller('DatabaseController', function ($scope, $rootScope, CoreResource, OIDResource) {
	CoreResource.getDBStats( function(data) {			
		$scope.DB = data;
		console.error(data);
	});
});

app.controller('ChartsController', function ($scope, $rootScope, $routeParams, CoreResource, OIDResource, $timeout) {
	$scope.mac = $routeParams['mac'];
	$scope.name = $routeParams['name'] || $scope.mac;
	
	$scope.bytesToString = function(raw) {
		var bytes = Number(raw.value);
		if (bytes < 1024) return (bytes).toFixed(1) + ' B';
		if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' kB';
		if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB';
		if (bytes < 1024 * 1024 * 1024 * 1024) return (bytes / 1024 / 1024 / 1024).toFixed(1) + ' GB';
		if (bytes < 1024 * 1024 * 1024 * 1024 * 1024) return (bytes / 1024 / 1024 / 1024 / 1024).toFixed(1) + ' TB';
		return (bytes / 1024 / 1024 / 1024 / 1024 / 1024).toFixed(1) + ' PB';
	}
	
	$scope.formatTooltip = function(raw) {
		return raw.label + ": " + $scope.bytesToString(raw);
	}
	$scope.formatMultiTooltip = function(raw) {
		return raw.datasetLabel + ": " + $scope.bytesToString(raw);
	}	
	
	var minDate = null;
	if ( $rootScope.DBStats && $rootScope.DBStats.minimumAge ) minDate = new Date($rootScope.DBStats.minimumAge);
	
	$scope.dayOptions = { dateDisabled: false, maxDate: new Date(), minDate: minDate, startingDay: 1, datepickerMode:'day', minMode:'day' };
	$scope.monthOptions = { dateDisabled: false, maxDate: new Date(), minDate: minDate, startingDay: 1, datepickerMode:'month', minMode:'month' };
	$scope.yearOptions = { dateDisabled: false, maxDate: new Date(), minDate: minDate, startingDay: 1, datepickerMode:'year', minMode:'year' };

	$scope.dayFormat = "yyyy-MM-dd"; // "dd-MMMM-yyyy";
	$scope.monthFormat = "yyyy-MM"; // "dd-MMMM-yyyy";
	$scope.yearFormat = "yyyy"; // "dd-MMMM-yyyy";
	
	$scope.dt = new Date();
	$scope.datePicker = { opened: false };
	$scope.open = function() { $scope.datePicker.opened = true; }		
	
	$scope.isLoading = 0;
	
	$scope.options = {
		scaleLabel: $scope.bytesToString,
		tooltipTemplate: $scope.formatTooltip,
		multiTooltipTemplate: $scope.formatMultiTooltip,
	};	

	$scope.cache = [null, null, null];
	$scope.options.showTotal = true;
	$scope.options.showSent = false;
	$scope.options.showRecv = false;
	
	$scope.postprocess = function(i) {
		return function(data) {			
			$scope.data[i] = [[]];		
			$scope.labels[i] = [];
			delete data.$promise;
			delete data.$resolved;
			$scope.cache[i] = data;

			$scope.isLoading--;
			if ( $scope.isLoading <= 0 ) $scope.remap();
		};
	};
	
	$scope.remap = function() {
		for ( var i = 0; i < 3; i++ ) {
			$scope.data[i] = [];
			$scope.labels[i] = [];
			
			var tSet = [];
			var sSet = [];
			var rSet = [];
			
			angular.forEach($scope.cache[i], function(sample) {
				$scope.labels[i].push(sample.name);
				tSet.push(sample.value);
				sSet.push(sample.sent);
				rSet.push(sample.recv);
			});
			
			if ( $scope.options.showSent ) $scope.data[i].push(sSet);
			if ( $scope.options.showRecv ) $scope.data[i].push(rSet);			
			if ( $scope.options.showTotal ) $scope.data[i].push(tSet);
		}
		
		$scope.series = [];
		$scope.chart.colors = [];
		if ( $scope.options.showSent ) {
			$scope.series.push("Sent");
			$scope.chart.colors.push("#D4282B");
		}
		if ( $scope.options.showRecv ) {
			$scope.series.push("Recv");
			$scope.chart.colors.push("#28D436");
		}
		if ( $scope.options.showTotal ) {
			$scope.series.push("Total");
			$scope.chart.colors.push("#4D5360");
		}
	}
	
	$scope.chart = {};
	$scope.chart.colors = ["#4D5360"];

	$scope.loadCharts = function(when) {
		if ( $scope.isLoading > 0 ) return;
		
		$scope.isLoading += 3;
		
		$scope.labels = [[],[],[]];
		$scope.series = [["*"]];
		$scope.data = [[],[],[]];
		
		CoreResource.getGraph( { mac: $scope.mac || null, mode: 'day', target: when }, $scope.postprocess(0) );
		CoreResource.getGraph( { mac: $scope.mac || null, mode: 'month', target: when, includeDay: true }, $scope.postprocess(1) );
		CoreResource.getGraph( { mac: $scope.mac || null, mode: 'year', target: when }, $scope.postprocess(2) );
	}
	
	$scope.loadCharts($scope.dt);
	
	$scope.tabActive = [ true, false, false];
	$scope.enable = function(tab) { $timeout(function() { $scope.tabActive[tab] = true; }, 100); }
	$scope.disable = function(tab) { $scope.tabActive[tab] = false; }
	// $scope.loadCharts();
});
