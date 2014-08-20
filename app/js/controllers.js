'use strict';

angular.module('ahoyApp.controllers', [])
  .controller('JoinCtrl', ['$scope', '$state', '$stateParams', '$timeout', 'ahoyService', function($scope, $state, $stateParams, $timeout, ahoyService) {
    console.log('JoinCtrl');
    if (ahoyService.inConference() == true) {
      $state.transitionTo('conference');
      return;
    }

    $scope.transmitOnly = false;
    $scope.captureHdVideo = false;
    $scope.room = $stateParams.room;
    $scope.name = $stateParams.name;
    
    $scope.joinConference = function() {
	console.log('join: '+$scope.room);
	ahoyService.joinConference($scope.room, $scope.name, $scope.password, $scope.transmitOnly, $scope.captureHdVideo,
	  function(ws, speaker) {
	    console.log("yes!");
	    if (speaker) {
		$state.transitionTo('mediasharing');
	    } else {
		$state.transitionTo('conference');
	    }
	  },
	  function(status, reconnect) {
	    if (status == 404) {
		ahoyService.showErrorDialog($scope, "Unknown conference", "Sorry, that conference room does not exist.");
	    } else if (status == 403) {
		ahoyService.showErrorDialog($scope, "Wrong password", "Sorry, the password for the conference is wrong.");
	        $scope.$apply(function() {
	          $scope.password = "";
	        });
	    } else if (status == 486) {
		ahoyService.showErrorDialog($scope, "Conference full", "Sorry, the conference room is full.");
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

  .controller('StartCtrl', ['$scope', '$state', '$stateParams', 'ahoyService', function($scope, $state, $stateParams, ahoyService) {
    console.log('StartCtrl');
    if (ahoyService.inConference() == true) {
      $state.transitionTo('conference');
      return;
    }

    $scope.startConference = function() {
	ahoyService.startConference($scope.room, $scope.name, $scope.password, $scope.moderatorpassword,
	  function(conferenceID) {
	    $scope.$apply(function() {
		$scope.room = conferenceID;
		if ($scope.moderatorpassword != undefined) {
		    $scope.password = $scope.moderatorpassword;
		}
		if ($scope.password != undefined) {
		    if (($scope.moderatorpassword == undefined) || ($scope.moderatorpassword == "")) {
			$scope.moderatorpassword = $scope.password;
		    }
		}
	    });
	    ahoyService.joinConference($scope.room, $scope.name, $scope.password, false, false,
		function(ws, speaker) {
		    $state.transitionTo('mediasharing');
		},
		function(status, reconnect) {
		}
	    );
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

  .controller('MediaShareCtrl', ['$scope', '$state', '$stateParams', '$timeout', 'ahoyService', function($scope, $state, $stateParams, $timeout, ahoyService) {
    console.log('MediaShareCtrl');
    if (ahoyService.inConference() && (ahoyService.sharingAudio() || ahoyService.sharingVideo())) {
      $state.transitionTo('conference');
      return;
    }

    var localVideo = document.getElementById('localVideo');
    $scope.sharingMic = ahoyService.sharingAudio();
    $scope.sharingCam = ahoyService.sharingVideo();


    var shareMedia = function(audio, video) {
      $scope.requestingMedia = true;
	ahoyService.shareMedia(audio, video,
	  function(stream) {
	    if (stream) {
	      attachMediaStream(localVideo, stream, true);
	      $timeout(function() {
    	        $scope.$apply(function() {
    		  $scope.requestingMedia = false;
    		  $scope.sharingMic = ahoyService.sharingAudio();
		  $scope.sharingCam = ahoyService.sharingVideo();
		  return;
    	        });
	      }, 1);
	    } else {
	      $timeout(function() {
	        $scope.$apply(function() {
	          $scope.requestingMedia = false;
	        });
	      }, 1);
	      localVideo.src = null;
	    }
	  },
	  function(error) {
	    console.log("Unable to request user media (audio: "+audio+", video: "+video+").");
	    if (audio && video) {
		/* try again with just audio */
		video = false;
		shareMedia(audio, video);
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
	shareMedia(!ahoyService.sharingAudio(), ahoyService.sharingVideo());
    }

    $scope.toggleShareCam = function() {
	shareMedia(ahoyService.sharingAudio(), !ahoyService.sharingVideo());
    }
    
    $scope.next = function() {
	if (ahoyService.isTransmitOnly()) {
	    $state.transitionTo("transmit");
	} else {
	    $state.transitionTo("conference");
	}
    }
    
    shareMedia(true, true);
  }])

  .controller('ConferenceCtrl', ['$scope', '$state', '$stateParams', '$timeout', '$modal', 'ahoyService', function($scope, $state, $stateParams, $timeout, $modal, ahoyService) {
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
    $scope.sharingCameraControl = false;
    $scope.sharingMic = ahoyService.sharingAudio();
    $scope.sharingCam = ahoyService.sharingVideo();
    $scope.mutingMic = ahoyService.mutingAudio();
    $scope.mutingCam = ahoyService.mutingVideo();
    $scope.webrtcDetectedBrowser = webrtcDetectedBrowser;
    $scope.bigScreenAuto = true;
    $scope.bigScreenLock = false;
    $scope.bigScreenMirror = true;
    $scope.localMember = ahoyService.getLocalMember();;
    $scope.members = ahoyService.getMembers();
    $scope.endsAt = ahoyService.getEndsAt();

    $scope.$on('timer-stopped', function (event, data){
	$scope.leaveConference();
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
      ahoyService.leaveConference();
      $state.transitionTo('start');
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

    $scope.preferences = preferences;

    // handle conference events
    ahoyService.registerConferenceEventListener(function(msg) {
      console.log("conference event handler: "+JSON.stringify(msg));
      switch (msg.messageType) {
        case "CONFERENCE_JOIN_indication":
    	    broadcastCameraControl();
    	    break;
        case "STREAM_ADDED_event":
	    $timeout(function() {
    	        $scope.$apply(function() {
    	    	    var video = document.getElementById('video-'+msg.memberID);
    	    	    if (video) {
    	    		var pauseBeforePlay = false;
    			if ($scope.localMember.memberID == msg.memberID) {
    			    video.muted = true;
    			    pauseBeforePlay = false;
    			} else {
    			    video.muted = false;
    			}
    			console.log("attaching stream to video "+msg.memberID);
    			attachMediaStream(video, msg.stream, pauseBeforePlay);
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
    });

    ahoyService.registerScopeListener(function(msg) {
	scopeApply();
    });

    var bigScreenMemberID = "";
    var bigScreen = document.getElementById('bigScreen');
    
    window.requestAnimFrame = (function(){
	    return  window.requestAnimationFrame       ||
		    window.webkitRequestAnimationFrame ||
		    window.mozRequestAnimationFrame    || 
		    function( callback ){
			window.setTimeout(callback, 1000 / 10);
		    };
    })();


    function drawBigScreen(time) {
	bigScreenCanvas.width = bigScreenCanvas.clientWidth;
	bigScreenCanvas.height = bigScreenCanvas.clientHeight;

	var video_ar = bigScreenVideo.videoWidth / bigScreenVideo.videoHeight;
	var canvas_ar = bigScreenCanvas.width / bigScreenCanvas.height;
	var offset_x = (bigScreenCanvas.width - (bigScreenCanvas.width / (canvas_ar / video_ar))) / 2;
	var offset_y = 0;
	var height = bigScreenCanvas.height;
	var width = (bigScreenCanvas.width / canvas_ar) * video_ar;
    
	if (screenfull.isFullscreen) {
	    if (canvas_ar <= video_ar) {
		/* video is wider than canvas, make video 100% wide */
		height = (bigScreenCanvas.height / video_ar) * canvas_ar;
		width = height * video_ar;
		offset_x = 0;
		offset_y = (bigScreenCanvas.height - height) / 2;
	    } else {
		/* canvas is wider than the video, make video 100% high */
		width = (bigScreenCanvas.width / canvas_ar) * video_ar;
		height = width / video_ar
		offset_x = (bigScreenCanvas.width - width) / 2;
		offset_y = 0;
	    }
	}

	if (bigScreenClear) {
	    bigScreenClear = false;
	    bigScreenContext.clearRect( 0 , 0 , bigScreenCanvas.width, bigScreenCanvas.height);
	}
	bigScreenContext.drawImage(bigScreenVideo, offset_x, offset_y, width, height);
	if (bigScreenAnimating) {
//	    requestAnimFrame(drawBigScreen);
	    // use a 30ms timeout instead of requestAnimFrame (which tries to achieve 60fps and burns lots of cpu for our 30fps video...)
	    window.setTimeout(drawBigScreen, 1000 / 30);
	}
    }
    
    var bigScreenCanvas = document.getElementById('bigScreenCanvas');
    var bigScreenContext = bigScreenCanvas.getContext('2d');
    var bigScreenVideo = null;
    var bigScreenAnimating = false;
    var bigScreenClear = false;
    bigScreenCanvas.width = bigScreenCanvas.clientWidth;
    bigScreenCanvas.height = bigScreenCanvas.clientHeight;
    
    
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
    	  bigScreenVideo = document.getElementById("video-"+member.memberID);
	  bigScreenClear = true;
	  if (!bigScreenAnimating) {
	    bigScreenAnimating = true;
    	    requestAnimFrame(drawBigScreen);
    	  }
          $scope.$apply(function() {
            $scope.bigScreenName = member.name;
	    $scope.bigScreenMirror = mirror;
          });
        }, 1);
      }
      bigScreenMemberID = memberID;
    }

    $scope.putOnBigScreen = function(memberID) {
	console.log("$scope.putOnBigScreen: "+memberID);
	putOnBigScreen(memberID);
    }

    $scope.fullscreen = function() {
	if (screenfull.enabled) {
    	    document.addEventListener(screenfull.raw.fullscreenchange, function () {
    		bigScreenClear = true;
    	    });
	    screenfull.request(bigScreenCanvas);
	}
    }
    
    $scope.showConferenceLink = function() {
	console.log("showConferenceLink");
	$scope.conferenceLink= document.location.href.substring(0,document.location.href.indexOf("/#/conference")) + "/#/join/" + $scope.preferences.room;
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
         console.log("control message handler: "+JSON.stringify(text_json));
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

    window.onbeforeunload = function() {
	ahoyService.leaveConference();
    }

    if (!ahoyService.publishingMedia() && (ahoyService.sharingAudio() || ahoyService.sharingVideo())) {
	ahoyService.publishMedia();
    }
    ahoyService.subscribeMedia();
  }])

  .controller('ChatCtrl', ['$scope', '$state', '$stateParams', '$timeout', 'ahoyService', function($scope, $state, $stateParams, $timeout, ahoyService) {
    var self = this;
    console.log('ChatCtrl:');
    $scope.messages = new Array();

    $scope.chatMessage = "";
    $scope.sendChatMessage = function() {
      if ($scope.chatMessage != "") {
	console.log("sendChatMessage: "+$scope.chatMessage);
	ahoyService.sendChatMessage($scope.chatMessage);
	self.addChatMessage("me", $scope.chatMessage, false);
	$scope.chatMessage = "";
      }
      return false;
    };
    var chatMessage = document.getElementById('chatMessages');

    this.addChatMessage = function(from, text, apply) {
      var message = { from: from+":", text: text };
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
      console.log("chat handler: "+JSON.stringify(msg));
      try {
         var text_json = JSON.parse(msg.message.text);
          self.addChatMessage(msg.from.name, text_json.chat, true);
      } catch (error) {
      }
    });

    ahoyService.registerStatusMessageListener(function(msg) {
      console.log("status handler: "+JSON.stringify(msg));
      self.addStatusMessage(msg.text, true);
    });

  }])
  
  .controller('ViewCtrl', ['$scope', '$state', '$stateParams', '$timeout', 'ahoyService', function($scope, $state, $stateParams, $timeout, ahoyService) {
    console.log('ViewCtrl');

    $scope.room = $stateParams.room;
    $scope.name = "viewer";

    $scope.webrtcDetectedBrowser = webrtcDetectedBrowser;
    $scope.bigScreenAuto = true;
    $scope.bigScreenLock = false;
    $scope.bigScreenMirror = false;

    $scope.localMember = ahoyService.getLocalMember();;
    $scope.members = ahoyService.getMembers();

    ahoyService.registerConferenceEventListener(function(msg) {
      switch (msg.messageType) {
        case "STREAM_ADDED_event":
    	    if (msg.memberID == bigScreenMemberID) {
    		bigScreenMemberID = null;
    		putOnBigScreen(msg.memberID);
    	    }
	    $timeout(function() {
    	        $scope.$apply(function() {
    	    	});
    	    }, 1);
          break;
        case "SPEAKER_CHANGED_event":
	    putOnBigScreen(msg.memberID);
          break;
      }
    });

    ahoyService.registerScopeListener(function(msg) {
	scopeApply();
    });

    var bigScreenMemberID = "";
    var bigScreen = document.getElementById('bigScreen');
    
    function putOnBigScreen(memberID) {
      if (bigScreenMemberID == memberID) {
        return;
      }
      var member = ahoyService.getMember(memberID);
      if (member && member.stream) {
        attachMediaStream(bigScreen, member.stream, true);
	bigScreenMemberID = memberID;
      }
    }

    $scope.fullscreen = function() {
	if (screenfull.enabled) {
    	    screenfull.request(bigScreen);
        }
    }

    ahoyService.joinConference($scope.room, $scope.name, "", false, false,
	  function(ws, speaker) {
	    window.onbeforeunload = function() {
		ahoyService.leaveConference();
	    }
	    ahoyService.subscribeMedia();
	  },
	  function(status, reconnect) {
	    window.onbeforeunload = null;
	    console.log("onerror: "+status+" "+reconnect);
	  }
    )
    
  }])

