'use strict';

angular.module('ahoyApp.directives', [])
    .directive("smartBanner",function(smartBanner) {
	return {
    	    restrict: "A",
    	    template: '<meta name="apple-itunes-app" content="app-id={{smartbanner.appId}}, app-argument = {{smartbanner.appArgument}}">',
    	    replace: true,
    	    link: function(scope) {
        	scope.smartbanner = smartBanner
    	    }
	} 
    });

