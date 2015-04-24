'use strict';

angular.module('ahoyApp.controllers', [])
  .controller('JoinCtrl', ['$scope', '$state', '$stateParams', '$timeout', '$translate', 'ahoyService', 'AHOY_CONFIG', function($scope, $state, $stateParams, $timeout, $translate, ahoyService, AHOY_CONFIG) {
    console.log('JoinCtrl language: ' + $stateParams.lang);
    if ($stateParams.lang) {
	$translate.use($stateParams.lang);
    }
    if (ahoyService.inConference() == true) {
      $state.transitionTo('conference');
      return;
    }

    $scope.AHOY_CONFIG = AHOY_CONFIG;
    $scope.transmitOnly = false;
    $scope.captureHdVideo = false;
    $scope.room = $stateParams.room;
    $scope.name = $stateParams.name;
    
    $scope.joinConference = function() {
	if(!!navigator.platform.match(/^iPad/i)) {
	    var url = "ahoyconference://join/"+btoa(JSON.stringify({ wsUrl: ahoyService.getWsUrl(), room: $scope.room, name: $scope.name, password: $scope.password  }));
	    deeplink.open(url);
	    return;
	}
	
	ahoyService.joinConference(null, $scope.room, $scope.name, $scope.password, $scope.transmitOnly, $scope.captureHdVideo,
	  function(ws, speaker) {
	    console.log("yes!");
	    $translate("conference.onbeforeunload").then(function (translation) {
	      window.onbeforeunload = function() {
	        return translation; 
	      }
	    });
	    if (speaker) {
		if (AdapterJS.onwebrtcreadyDone) {
		    $state.transitionTo('mediasharing');
		} else {
		    $state.transitionTo('nousermedia_plugin');
		}
	    } else {
		$state.transitionTo('conference');
	    }
	  },
	  function(status, reconnect) {
	    if (status == 404) {
		ahoyService.showErrorDialog($scope, "join.unknown_conference_title", "join.unknown_conference_text");
	    } else if (status == 403) {
		ahoyService.showErrorDialog($scope, "join.wrong_password_title", "join.wrong_password_text");
	        $scope.$apply(function() {
	          $scope.password = "";
	        });
	    } else if (status == 470) {
		ahoyService.showErrorDialog($scope, "join.conference_locked_title", "join.conference_locked_text");
	    } else if (status == 486) {
		ahoyService.showErrorDialog($scope, "join.conference_full_title", "join.conference_full_text");
	    } else if (status == 302) {
	      console.log("redirecting...");
	      $timeout(function() {
	        $scope.joinConference();
	      }, 500);
	    } else if (reconnect) {
	      console.log("please reconnect");
	      $timeout(function() {
	        $scope.joinConference();
	      }, 500);
	    }
	    console.log("onerror: "+status+" "+reconnect);
	  }
	);
    };
    
  }])

  .controller('LinkCtrl', ['$scope', '$state', '$stateParams', '$timeout', '$translate', 'ahoyService', 'AHOY_CONFIG', function($scope, $state, $stateParams, $timeout, $translate, ahoyService, AHOY_CONFIG) {
    console.log('LinkCtrl token: ' + $stateParams.token);
    var link = null;
    if ($stateParams.token != undefined) {
	try {
	    var token = $stateParams.token;
	    var data = atob(token);
	    if (data != null) {
		link = JSON.parse(data);
	    }
	} catch (error) {
	}
    }
    if (!link || !link.wsUrl || !link.room) {
	$state.transitionTo("join");
	return;
    }
    $scope.wsUrl = link.wsUrl;
    $scope.room = link.room;
    $scope.name = link.name;
    $scope.password = link.password;

    if ($stateParams.lang) {
	$translate.use($stateParams.lang);
    }
    if (ahoyService.inConference() == true) {
      $state.transitionTo('conference');
      return;
    }

    $scope.AHOY_CONFIG = AHOY_CONFIG;
    $scope.transmitOnly = false;
    $scope.captureHdVideo = false;
    
    $scope.joinConference = function() {
	console.log('join: '+$scope.room);
	ahoyService.joinConference($scope.wsUrl, $scope.room, $scope.name, $scope.password, $scope.transmitOnly, $scope.captureHdVideo,
	  function(ws, speaker) {
	    console.log("yes!");
	    $translate("conference.onbeforeunload").then(function (translation) {
	      window.onbeforeunload = function() {
	        return translation; 
	      }
	    });
	    if (speaker) {
		if (AdapterJS.onwebrtcreadyDone) {
		    $state.transitionTo('mediasharing');
		} else {
		    $state.transitionTo('nousermedia_plugin');
		}
	    } else {
		$state.transitionTo('conference');
	    }
	  },
	  function(status, reconnect) {
	    $scope.wsUrl = null;
	    if (status == 404) {
		ahoyService.showErrorDialog($scope, "join.unknown_conference_title", "join.unknown_conference_text");
	    } else if (status == 403) {
		ahoyService.showErrorDialog($scope, "join.wrong_password_title", "join.wrong_password_text");
	        $scope.$apply(function() {
	          $scope.password = "";
	        });
	    } else if (status == 470) {
		ahoyService.showErrorDialog($scope, "join.conference_locked_title", "join.conference_locked_text");
	    } else if (status == 486) {
		ahoyService.showErrorDialog($scope, "join.conference_full_title", "join.conference_full_text");
	    } else if (status == 302) {
	      console.log("redirecting...");
	      $timeout(function() {
	        $scope.joinConference();
	      }, 500);
	    } else if (reconnect) {
	      console.log("please reconnect");
	      $timeout(function() {
	        $scope.joinConference();
	      }, 500);
	    }
	    console.log("onerror: "+status+" "+reconnect);
	  }
	);
    };
    
  }])

  .controller('StartCtrl', ['$scope', '$timeout', '$state', '$stateParams', '$translate', 'ahoyService', function($scope, $timeout, $state, $stateParams, $translate, ahoyService) {
    console.log('StartCtrl language: ' + $stateParams.lang);
    if ($stateParams.lang) {
	$translate.use($stateParams.lang);
    }
    if (ahoyService.inConference() == true) {
      $state.transitionTo('conference');
      return;
    }

    $scope.joinConference = function() {
	ahoyService.joinConference(null, $scope.conferenceID, $scope.name, $scope.password, false, false,
	    function(ws, speaker) {
		$translate("conference.onbeforeunload").then(function (translation) {
		    window.onbeforeunload = function() {
			return translation; 
		    }
		});
		if (AdapterJS.onwebrtcreadyDone) {
		    $state.transitionTo('mediasharing');
		} else {
		    $state.transitionTo('nousermedia_plugin');
		}
	    },
	    function(status, reconnect) {
		if (status == 302) {
	    	    console.log("redirecting...");
	    	    $timeout(function() {
	    	        $scope.joinConference();
	    	    }, 500);
		}
	    }
	);
    }

    $scope.startConference = function() {
	if(!!navigator.platform.match(/^iPad/i)) {
	    var url = "ahoyconference://start/"+btoa(JSON.stringify({ wsUrl: ahoyService.getWsUrl(), room: $scope.room, name: $scope.name, password: $scope.password, moderatorpassword: $scope.moderatorpassword  }));
	    deeplink.open(url);
	    return;
	}


	ahoyService.startConference($scope.room, $scope.name, $scope.password, $scope.moderatorpassword,
	  function(conferenceID) {
	    $scope.$apply(function() {
		$scope.conferenceID = conferenceID;
		if ($scope.moderatorpassword != undefined) {
		    $scope.password = $scope.moderatorpassword;
		}
		if ($scope.password != undefined) {
		    if (($scope.moderatorpassword == undefined) || ($scope.moderatorpassword == "")) {
			$scope.moderatorpassword = $scope.password;
		    }
		}
	    });
	    $scope.joinConference();
	  },
	  function(status) {
	    console.log("no!");
	    if (status == 486) {
	      $scope.$apply(function() {
	        $scope.roomExists = true;
	      });
	    }
	  }
	);
    };
    
  }])

  .controller('MediaShareCtrl', ['$scope', '$state', '$stateParams', '$timeout', '$translate', 'ahoyService', function($scope, $state, $stateParams, $timeout, $translate, ahoyService) {
    console.log('MediaShareCtrl');

    if (ahoyService.inConference() && (ahoyService.sharingAudio() || ahoyService.sharingVideo())) {
      $state.transitionTo('conference');
      return;
    }
    
	$scope.temasysPluginUrl = AdapterJS.WebRTCPlugin.pluginInfo.downloadLink;
    $scope.optionsList = [
	{val: '1000', translationKey: 'mediashare.bandwidth_fast'},
	{val: '500', translationKey: 'mediashare.bandwidth_standard'},
	{val: '250', translationKey: 'mediashare.bandwidth_slow'}
    ];

    $scope.bandwidth = 500;

    var localVideo = document.getElementById('localVideo');
    $scope.sharingMic = ahoyService.sharingAudio();
    $scope.sharingCam = ahoyService.sharingVideo();
    
    $scope.$watch("bandwidth", function(newValue, oldValue) {
	ahoyService.setMaxVideoBitrate(parseInt(newValue));
    });


    $scope.shareMedia = function(audio, video) {
      $scope.requestingMedia = true;
	ahoyService.shareMedia(audio, video,
	  function(stream) {
	    if (stream) {
	      $timeout(function() {
    	        $scope.$apply(function() {
    		  $scope.requestingMedia = false;
    		  $scope.sharingMic = ahoyService.sharingAudio();
		  $scope.sharingCam = ahoyService.sharingVideo();
	    	  $timeout(function() {
	    	    attachMediaStream(localVideo, stream);
	    	  }, 1);
		  return;
    	        });
	      }, 1);
	    } else {
	      $timeout(function() {
	        $scope.$apply(function() {
	          $scope.requestingMedia = false;
	        });
	      }, 1);
	      localVideo.src = "";
	    }
	  },
	  function(error) {
	    console.log("Unable to request user media (audio: "+audio+", video: "+video+").");
	    if (audio && video) {
		/* try again with just audio */
		video = false;
		$scope.shareMedia(audio, video);
	    } else {
    	      $scope.$apply(function() {
	        $scope.requestingMedia = false;
	      });
	    }
	  }
	);
	if (!audio && !video) {
    	  $scope.sharingMic = false;
	  $scope.sharingCam = false;
	  $scope.requestingMedia = false;
	}
    }

    $scope.toggleShareMic = function() {
	$scope.shareMedia(!ahoyService.sharingAudio(), ahoyService.sharingVideo());
    }

    $scope.toggleShareCam = function() {
	$scope.shareMedia(ahoyService.sharingAudio(), !ahoyService.sharingVideo());
    }
    
    $scope.next = function() {
	if (webrtcDetectedBrowser == "firefox") {
	    localVideo.pause();
	    localVideo.mozSrcObject = null;
	}
	if (ahoyService.isTransmitOnly()) {
	    $state.transitionTo("transmit");
	} else {
	    $state.transitionTo("conference");
	}
    }
    
	if (AdapterJS.onwebrtcreadyDone) {
	$scope.shareMedia(true, true);
    }
  }])

  .controller('ConferenceCtrl', ['$scope', '$state', '$stateParams', '$timeout', '$modal', '$translate', 'ahoyService', 'AHOY_CONFIG',  function($scope, $state, $stateParams, $timeout, $modal, $translate, ahoyService, AHOY_CONFIG) {
    console.log('ConferenceCtrl');

    if (ahoyService.inConference() != true) {
      $state.transitionTo('join');
      return;
    }

    function scopeApply() {
      $timeout(function() {
        $scope.$apply(function() {
        });
      }, 1);
    }

    var preferences = ahoyService.getPreferences();
    $scope.AHOY_CONFIG = AHOY_CONFIG;
    $scope.sharingCameraControl = false;
    $scope.sharingMic = ahoyService.sharingAudio();
    $scope.sharingCam = ahoyService.sharingVideo();
    $scope.mutingMic = ahoyService.mutingAudio();
    $scope.mutingCam = ahoyService.mutingVideo();
    $scope.webrtcDetectedBrowser = webrtcDetectedBrowser;
    $scope.bigScreenAuto = true;
    $scope.bigScreenLock = false;
    $scope.bigScreenMirror = false;
    $scope.localMember = ahoyService.getLocalMember();;
    $scope.members = ahoyService.getMembers();
    $scope.bigMember = { name: "" };
    $scope.bigMembers = { "bigMember":  $scope.bigMember };
    $scope.endsAt = ahoyService.getEndsAt();
    $scope.allowFullscreen = false;
    $scope.isPlugin = false;
    $scope.isAbleToMuteMic = ahoyService.isAbleToMuteMic();
    $scope.isAbleToMuteCam = ahoyService.isAbleToMuteCam();
    if ((webrtcDetectedBrowser == "safari") || (webrtcDetectedBrowser == "IE")) {
	$scope.isPlugin = true;
    }


    $scope.$on('timer-stopped', function (event, data){
	$scope.leaveConference();
    });
    $scope.countdown = {};
    $scope.$on('timer-tick', function (event, args) {
	if (event && event.targetScope) {
	  $timeout(function() {
	    $scope.$apply(function() {
	      $scope.countdown.hours = event.targetScope.hours;
	      $scope.countdown.minutes = event.targetScope.minutes;
	      $scope.countdown.seconds = event.targetScope.seconds;
	    });
	  }, 1);
	}
    });

    $scope.chatMessagesStyle = {"overflow-y": "scroll", "padding": "0px", "padding-left": "5px", "margin-left": "5px"};
    if ($scope.endsAt > 0) {
	$scope.chatMessagesStyle.height = "390px";
    } else {
	$scope.chatMessagesStyle.height = "450px";
    }
    window.postMessage({ type: "FROM_PAGE", payload: {event: "joinedConference", wsUrl: preferences.wsUrl, room: preferences.room, name: preferences.name, password: preferences.password}}, "*");

    // handle communication with  content scripts (injected by the chrome extensions)
    function handleEvent(event) {
	if (event.data.type && (event.data.type == "FROM_CONTENT")) {
	    try {
		var json_msg = JSON.parse(event.data.payload);
		if (json_msg.cameras) {
		    $timeout(function() {
    	    		$scope.$apply(function() {
			    $scope.cameras = json_msg.cameras;
			    $scope.localMember.haveCameraControl = true;
			});
		    }, 1);
		}
	    } catch (error) {
	    }
	}
    }
    window.addEventListener("message", handleEvent, false);

    // camera control (if available, provided by cameracontrol websocket service on port 40404)
    function broadcastCameraControl() {
	if ($scope.localMember.haveCameraControl) {
	    ahoyService.sendControlMessage({ cameraControl: { camera: { name: $scope.cameras[0].name, id: $scope.cameras[0].id}, allow: $scope.sharingCameraControl}});
	}
    }
    
    $scope.toggleCameraControl = function() {
	if ($scope.sharingCameraControl) {
	    $scope.sharingCameraControl = false;
	    window.postMessage({ type: "FROM_PAGE", payload: {event: "controlCamera", control: {control:{led:{state:"on"}}}}}, "*");
	} else {
	    $scope.sharingCameraControl = true;
	    window.postMessage({ type: "FROM_PAGE", payload: {event: "controlCamera", control: {control:{led:{state:"blink"}}}}}, "*");
	}
	broadcastCameraControl();
    }

    $scope.cameraControl = function(memberID, keyCode) {
	var msg = { member: { memberID: memberID}, camera: { control:{} }};
	if (!keyCode) {
	    msg.camera.control.reset = true;
	    ahoyService.sendControlMessage(msg);
	} else {
	    msg.camera.control.move = {};
	    switch (keyCode) {
		case 37:
		    msg.camera.control.move.left = true;
		    break;
		case 38:
		    msg.camera.control.move.up = true;
		    break;
		case 39:
		    msg.camera.control.move.right = true;
		    break;
		case 40:
		    msg.camera.control.move.down = true;
		    break;
		case 32:
		    msg.camera.control.shoot = true;
		    break;
		default:
		    msg = null;
	    }
	}
	if (msg) {
	    if (memberID == $scope.localMember.memberID) {
		window.postMessage({ type: "FROM_PAGE", payload: {event: "controlCamera", control: msg.camera}}, "*");
	    } else {
		    ahoyService.sendControlMessage(msg);
	    }
	}
    }

    $scope.toggleMuteMic = function() {
	ahoyService.muteAudio(!ahoyService.mutingAudio());
	$scope.mutingMic = ahoyService.mutingAudio();
    }

    $scope.toggleMuteCam = function() {
	ahoyService.muteVideo(!ahoyService.mutingVideo());
	$scope.mutingCam = ahoyService.mutingVideo();
    }
    
    $scope.leaveConference = function() {
      window.onbeforeunload = null;
      if ($scope.allowFullscreen) {
	document.removeEventListener(screenfull.raw.fullscreenchange, $scope.fullscreenListener);
      }
      ahoyService.leaveConference();
      if (AHOY_CONFIG.allow_dynamic_conferences) {
	$state.transitionTo('start');
      } else {
	$state.transitionTo('join');
      }
    }
    
    $scope.toggleConferenceLock = function() {
      ahoyService.lockConference(!$scope.preferences.conferenceLocked);
    }

    $scope.mouseEnter = function(member) {
	putOnBigScreen(member.memberID);
	$scope.bigScreenLock = true;
	$scope.hide = true;
	member.showOverlay = true;
    }

    $scope.mouseLeave = function(member) {
	$scope.bigScreenLock = false;
	$scope.hide = true;
	member.showOverlay = false;
    }
    
    $scope.kick = function(member) {
	ahoyService.kickMember(member);
    }

    $scope.toggleVideoSwitching = function() {
	$scope.bigScreenAuto = !$scope.bigScreenAuto;
    }

    $scope.preferences = preferences;

    // handle conference events
    function conferenceEventListener(msg) {
      switch (msg.messageType) {
        case "CONFERENCE_JOIN_indication":
    	    broadcastCameraControl();
    	    break;
        case "STREAM_ADDED_event":
	    $timeout(function() {
    	        $scope.$apply(function() {
    	    	    var video = document.getElementById('video-'+msg.memberID);
    	    	    if (video) {
    			if ($scope.localMember.memberID == msg.memberID) {
    			    video.muted = true;
    			} else {
    			    video.muted = false;
    			}
    			console.log("attaching stream to video "+msg.memberID);
    			attachMediaStream(video, msg.stream);
    	    	    }
    	    	});
    	    }, 1);
    	    if (msg.memberID == bigScreenMemberID) {
    		bigScreenMemberID = null;
    		putOnBigScreen(msg.memberID);
    	    }
          break;
        case "SPEAKER_CHANGED_event":
	    if (($scope.bigScreenAuto && !$scope.bigScreenLock) || msg.force) {
		putOnBigScreen(msg.memberID);
	    }
          break;
      }
    }

    ahoyService.registerConferenceEventListener(conferenceEventListener);
    ahoyService.registerScopeListener(scopeApply);

    $scope.putOnBigScreen = function(memberID) {
	console.log("$scope.putOnBigScreen: "+memberID);
	putOnBigScreen(memberID);
    }

    var bigScreenMemberID = "";
    var bigScreen = document.getElementById('bigScreen');
    
    function putOnBigScreen(memberID) {
      if (bigScreenMemberID == memberID) {
        return;
      }
      var mirror = false;
      if (memberID == $scope.localMember.memberID) {
        mirror = true;
      }

      var member = ahoyService.getMember(memberID);
      if (member.stream) {
        console.log("putting "+member.name+" on the big screen");

        $timeout(function() {
          $scope.$apply(function() {
            if ($scope.isPlugin) {
        	/* 
        	    The Temasys plugin replaces the <video> element with an <object> element. It is not possible to replace the video stream, yet. 
        	    That's why we use Angular to remove the old element and add a fresh one.
        	*/
		$scope.bigMembers = {};;
	        $scope.bigMembers[member.memberID] = member;
    	    } else {
		$scope.bigMember = member;
		$scope.bigMembers["bigMember"] = member;
            }
	    $scope.bigScreenMirror = mirror;
    	    $timeout(function() {
        	$scope.$apply(function() {
        	    bigScreen = document.getElementById('bigScreen');
        	    attachMediaStream(bigScreen, member.stream);
        	    bigScreen.muted = true;
        	});
    	    }, 1);
          });
        }, 1);
      }
      bigScreenMemberID = memberID;
    }

    $scope.isFullscreen = false;
    $scope.fullscreenListener = function() {
	console.log("fullscreenListener: " +screenfull.isFullscreen);
	$scope.$apply(function() {
	    $scope.isFullscreen = screenfull.isFullscreen;
	});
    }
    if (window.screenfull != undefined) {
	if (!$scope.isPlugin) {
	    $scope.allowFullscreen = true;
	    document.addEventListener(screenfull.raw.fullscreenchange, $scope.fullscreenListener);
	}
    }
    $scope.fullscreen = function() {
        if ($scope.allowFullscreen) {
	    if (screenfull.enabled) {
    		screenfull.request(bigScreen);
    	    }
    	}
    }
    
    $scope.showConferenceLink = function() {
	console.log("showConferenceLink");
	$scope.conferenceLink= document.location.href.substring(0,document.location.href.indexOf("/#/conference")) + "/#/link/" + ahoyService.getLinkToken();
	var modalInstance = $modal.open({
	    templateUrl: 'tpl/showLinkModal.html',
	    size: "lg",
	    scope: $scope,
	    controller: function($scope, $modalInstance) {
		$scope.hideConferenceLink = function() {
		    $modalInstance.close();
		}
	    }
	});
    }
    
    $scope.confirmLeaveConference = function() {
	ahoyService.showConfirmDialog($scope, "conference.confirm_leave_title", "conference.confirm_leave_text", $scope.leaveConference);
    }

    ahoyService.registerMediaEventListener(function(msg) {
      switch (msg.event) {
        case "audio_muted":
          scopeApply();
    	  break;
        case "audio_unmuted":
          scopeApply();
    	  break;
      }
    });

    ahoyService.registerControlMessageListener(function(msg) {
      try {
         var text_json = JSON.parse(msg.message.text);
	 if (text_json.control) {
	    if (text_json.control.camera) {
		if (text_json.control.member.memberID == $scope.localMember.memberID) {
		    /* somebody sent us a control message */
		    if ($scope.sharingCameraControl) {
			window.postMessage({ type: "FROM_PAGE", payload: {event: "controlCamera", control: text_json.control.camera}}, "*");
		    }
		}
	    }
	 }

      } catch (error) {
      }
    
    });

    $translate("conference.onbeforeunload").then(function (translation) {
	window.onbeforeunload = function() {
	    return translation; 
	}
    });

    if (!ahoyService.publishingMedia() && (ahoyService.sharingAudio() || ahoyService.sharingVideo())) {
	ahoyService.publishMedia();
    }
    ahoyService.subscribeMedia();
  }])

  .controller('ChatCtrl', ['$scope', '$state', '$stateParams', '$timeout', '$translate', 'ahoyService', function($scope, $state, $stateParams, $timeout, $translate, ahoyService) {
    var self = this;
    console.log('ChatCtrl:');
    $scope.messages = new Array();

    $scope.chatMessage = "";
    $scope.sendChatMessage = function() {
      if ($scope.chatMessage != "") {
	console.log("sendChatMessage: "+$scope.chatMessage);
	ahoyService.sendChatMessage($scope.chatMessage);
	$translate("chat.me").then(function (translation) {
	  self.addChatMessage(translation, $scope.chatMessage, false);
	  $scope.chatMessage = "";
	});
      }
      return false;
    };
    var chatMessage = document.getElementById('chatMessages');

    // inspired by http://stackoverflow.com/a/3890175/3702894
    function linkify(inputText) {
	var replacedText, replacePattern1, replacePattern2, replacePattern3;

	//URLs starting with http://, https://, or ftp://
	replacePattern1 = /(\b(https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim;
	replacedText = inputText.replace(replacePattern1, '$1');

	//URLs starting with "www." (without // before it, or it'd re-link the ones done above).
	replacePattern2 = /(^|[^\/])(www\.[\S]+(\b|$))/gim;
	replacedText = replacedText.replace(replacePattern2, '$1http://$2');

	return replacedText;
    }

    this.addChatMessage = function(from, text, apply) {
      var message = { from: from+":", text: linkify(text) };
      if (apply) {
        $scope.$apply(function() {
          $scope.messages.push(message);
        });
      } else {
          $scope.messages.push(message);
      }
      $timeout(function() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }, 1);
    }

    this.addStatusMessage = function(text, apply) {
      var message = { from: "", text: text };
      if (apply) {
        $scope.$apply(function() {
          $scope.messages.push(message);
        });
      } else {
          $scope.messages.push(message);
      }
      $timeout(function() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }, 1);
    }

    ahoyService.registerChatMessageListener(function(msg) {
      try {
         var text_json = JSON.parse(msg.message.text);
          self.addChatMessage(msg.from.name, text_json.chat, true);
      } catch (error) {
      }
    });

    ahoyService.registerStatusMessageListener(function(msg) {
      self.addStatusMessage(msg.text, false);
    });

  }])
  
  .controller('ViewCtrl', ['$scope', '$state', '$stateParams', '$timeout', 'ahoyService', function($scope, $state, $stateParams, $timeout, ahoyService) {
    console.log('ViewCtrl');

    $scope.room = $stateParams.room;
    $scope.name = "viewer";

    $scope.webrtcDetectedBrowser = webrtcDetectedBrowser;
    $scope.bigScreenAuto = true;
    $scope.bigScreenLock = false;
    $scope.bigMember = { name: "" };
    $scope.bigMembers = { "bigMember":  $scope.bigMember };

    $scope.isPlugin = false;
    if ((webrtcDetectedBrowser == "safari") || (webrtcDetectedBrowser == "IE")) {
	$scope.isPlugin = true;
    }

    $scope.localMember = ahoyService.getLocalMember();;
    $scope.members = ahoyService.getMembers();

    ahoyService.registerConferenceEventListener(function(msg) {
      switch (msg.messageType) {
        case "STREAM_ADDED_event":
	    $timeout(function() {
    	        $scope.$apply(function() {
    	    	    var audio = document.getElementById('audio-'+msg.memberID);
    	    	    if (audio) {
    			console.log("attaching stream to audio "+msg.memberID);
    			attachMediaStream(audio, msg.stream);
    	    	    }
    	    	});
    	    }, 1);
    	    if (msg.memberID == bigScreenMemberID) {
    		bigScreenMemberID = null;
    		putOnBigScreen(msg.memberID);
    	    }
          break;
        case "SPEAKER_CHANGED_event":
	    putOnBigScreen(msg.memberID);
          break;
      }
    });

    function scopeApply() {
      $timeout(function() {
        $scope.$apply(function() {
        });
      }, 1);
    }

    ahoyService.registerScopeListener(scopeApply);

    var bigScreenMemberID = "";
    var bigScreen = document.getElementById('bigScreen');
    
    function putOnBigScreen(memberID) {
      if (bigScreenMemberID == memberID) {
        return;
      }

      var member = ahoyService.getMember(memberID);
      if (member.stream) {
        console.log("putting "+member.name+" on the big screen");

        $timeout(function() {
          $scope.$apply(function() {
            if ($scope.isPlugin) {
        	/* 
        	    The Temasys plugin replaces the <video> element with an <object> element. It is not possible to replace the video stream, yet. 
        	    That's why we use Angular to remove the old element and add a fresh one.
        	*/
		$scope.bigMembers = {};;
	        $scope.bigMembers[member.memberID] = member;
    	    } else {
		$scope.bigMember = member;
		$scope.bigMembers["bigMember"] = member;
            }
            $timeout(function() {
        	$scope.$apply(function() {
        	    bigScreen = document.getElementById('bigScreen');
        	    attachMediaStream(bigScreen, member.stream);
        	    bigScreen.muted = true;
        	});
    	    }, 1);

          });
        }, 1);
      }
      bigScreenMemberID = memberID;
    }

    $scope.joinConference = function() {
      ahoyService.joinConference(null, $scope.room, $scope.name, null, false, false,
	  function(ws, speaker) {
	    window.onbeforeunload = function() {
		ahoyService.leaveConference();
	    }
	    $timeout(function() {
		$scope.$apply(function() {
		    $scope.members = ahoyService.getMembers();
		});
	    }, 1);
	    ahoyService.subscribeMedia();
	  },
	  function(status, reconnect) {
	    if (status == 302) {
	      console.log("redirecting...");
	      $timeout(function() {
	        $scope.joinConference();
	      }, 500);
	    } else {
	      window.onbeforeunload = null;
	      console.log("onerror: "+status+" "+reconnect);
	    }
	  }
      );
    }
    
    $scope.joinConference();
    
  }])

