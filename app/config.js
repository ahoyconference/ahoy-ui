var config_module = angular.module('ahoyApp.config', []);

var config_data = {
  AHOY_CONFIG: {
    title: 'Ahoy! Conference',
    allow_dynamic_conferences: true
  }
};

angular.forEach(config_data, function(key,value) {
  config_module.constant(value,key);
});
