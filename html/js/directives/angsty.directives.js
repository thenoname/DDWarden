directives.directive('ngEnter', function () {
    return function (scope, element, attrs) {
        element.bind("keydown keypress", function (event) {
            if(event.which === 13) {
                scope.$apply(function (){
                    scope.$eval(attrs.ngEnter);
                });
 
                event.preventDefault();
            }
        });
    };
});

// this is the angular way to stop even propagation
directives.directive('stopEvent', function () {
    return {
        restrict:'A',
        link:function (scope, element, attr) {
            element.bind(attr.stopEvent, function (e) {
                e.stopPropagation();
            });
        }
    }
});

directives.directive('letterbar', function() {
	return {
		restrict: 'E',
		scope: {
			select:"&"
		},
		template: "<DIV><A HREF CLASS='text-muted label label-default' NG-CLICK='select({value:\"\"})'>All</A> &nbsp; "
			+ "<SPAN NG-REPEAT='L in Options'>"
			+ "<A HREF CLASS='text-muted' NG-CLICK='select({value:L})'>"
			+ "<B>{{L}}</B></A> &nbsp; "
			+ "</SPAN></DIV>",
		
		link: function (scope, element, attrs) {
			scope.Options = [
				'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'
			];
		}		
	}	
});

directives.directive('compile', function ($compile) {
	// directive factory creates a link function
	return function(scope, element, attrs) {
		scope.$watch(
			function(scope) {
				// watch the 'compile' expression for changes
				return scope.$eval(attrs.compile);
			},
			function(value) {
				// when the 'compile' expression changes
				// assign it into the current DOM
				element.html(value);

				// compile the new DOM and link it to the current
				// scope.
				// NOTE: we only compile .childNodes so that
				// we don't get into infinite loop compiling ourselves
				$compile(element.contents())(scope);
			}
		);
	};
});