'use strict';


angular.module('ahoyApp', [
  'ahoyApp.services',
  'ahoyApp.controllers',
  'ui.router',
  'ui.bootstrap',
  'ngAnimate'
])

.run(
  [ '$rootScope', '$state', '$stateParams',
    function ($rootScope,   $state,   $stateParams) {

    // It's very handy to add references to $state and $stateParams to the $rootScope
    // so that you can access them from any scope within your applications.For example,
    // <li ui-sref-active="active }"> will set the <li> // to active whenever
    // 'contacts.list' or one of its decendents is active.
      $rootScope.$state = $state;
      $rootScope.$stateParams = $stateParams;
/*      $('input[type="checkbox"].large').checkbox({
        buttonStyle: 'btn-link btn-large',
        checkedClass: 'icon-check',
        uncheckedClass: 'icon-check-empty'
      }); */
    }
  ]
)
.config(
  [ '$stateProvider', '$urlRouterProvider',
    function ($stateProvider,   $urlRouterProvider) {


      $stateProvider
        .state("joinRoom", {
          url: '/join/:room',
          templateUrl: 'tpl/join.html',
          controller: 'JoinCtrl'
        })

        .state("joinRoomWithName", {
          url: '/join/:room/:name',
          templateUrl: 'tpl/join.html',
          controller: 'JoinCtrl'
        })

        .state("join", {
          url: '/join',
          templateUrl: 'tpl/join.html',
          controller: 'JoinCtrl'
        })

        .state("start", {
          url: '/start',
          templateUrl: 'tpl/start.html',
          controller: 'StartCtrl'
        })

        .state("mediasharing", {
          url: '/mediasharing',
          templateUrl: 'tpl/mediasharing.html',
          controller: 'MediaShareCtrl'
        })
        
        .state("conference", {
          url: '/conference',
          templateUrl: 'tpl/conference.html',
          controller: 'ConferenceCtrl'
        })

        .state("view", {
          url: '/view/:room',
          templateUrl: 'tpl/view.html',
          controller: 'ViewCtrl'
        })


      $urlRouterProvider
        .otherwise('/start');

    }
  ]
);
