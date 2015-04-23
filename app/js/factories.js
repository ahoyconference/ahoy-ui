'use strict';

angular.module('ahoyApp.factories', [])
    .factory("smartBanner", function() {
	var argument = "";
	if (document.location.hash.indexOf("#/link/") != -1) {
	    argument = "ahoyconference://link/"+document.location.hash.substring("#/link/".length);;
	}
	return {
    	    appId: "973996885",
    	    appArgument: argument
	}
    });
