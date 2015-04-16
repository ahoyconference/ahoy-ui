var config_module = angular.module('ahoyApp.config', []);

var config_data = {
  AHOY_CONFIG: {
    title: 'Ahoy! Conference',
    allow_dynamic_conferences: true,
    wsUrl: "wss://director.ahoyconference.com",
    iceServers: [
    	{
    	    url: "turn:dev.ahoyrtc.com:443?transport=tcp",
    	    urls: "turn:dev.ahoyrtc.com:443?transport=tcp",
    	    username: "turn",
    	    credential: "pass"
    	}
    ]
  }
};

angular.forEach(config_data, function(key,value) {
  config_module.constant(value,key);
});
