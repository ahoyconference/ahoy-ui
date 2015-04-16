'use strict';

angular.module('ahoyApp.services', [])
    .service('ahoyService', ["$modal", "$translate", "AHOY_CONFIG", function($modal, $translate, AHOY_CONFIG) {
      var self = this;
      var activeConference = false;
      var activeMedia = false;
      var subscribingMedia = false;
      var transmitOnly = false;
      var preferences = {};
      preferences.room = '';
      preferences.conferenceID = '';
      preferences.name = '';
      preferences.password = '';
      preferences.shareVideo = false;
      preferences.shareAudio = false;
      preferences.maxVideoBitrate = 1000;
      preferences.captureHdVideo = false;
      preferences.speaker = false;
      preferences.moderator = false;
      preferences.muteVideo = false;
      preferences.muteAudio = false;
      
      var scopeListener = null;
      var chatMessageListener = null;
      var controlMessageListener = null;
      var statusMessageListener = null;
      var mediaEventListener = null;
      var conferenceEventListener = null;
      var members = {};
      var localMember = {};
      var speakerID = null;

      var ws = null;
      var wsUrl;

      function resetWsUrl() {
        if (AHOY_CONFIG.wsUrl) {
    	    wsUrl = AHOY_CONFIG.wsUrl;
        } else {
    	    if (document.location.href.indexOf("ttp://") > 0) {
		wsUrl = "ws://"+document.location.href.substring(7, document.location.href.indexOf("/", 7));
	    } else if (document.location.href.indexOf("ttps://") > 0) {
    		wsUrl = "wss://"+document.location.href.substring(8, document.location.href.indexOf("/", 8));
    	    }
        }

	preferences.wsUrl = wsUrl;
        console.log('ahoyService: '+wsUrl);
      }

      resetWsUrl();
      
	function sendMediaRequest(members) {
	    var request_members = Array();
	    if ((members == null) || (members.length == 0)) return;
	    for (var key in members) {
		if (members[key] != localMember) {
		    request_members.push({memberID: members[key].memberID, audio: members[key].audio.available, video: members[key].video.available});
		}
	    }
	    ws.send(JSON.stringify({messageType:"MEDIA_request", members: request_members, transactionID: generateTransactionID()}));
	}


      function generateTransactionID() {
	    var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
            var string_length = 32;
            var randomstring = '';
            for (var i=0; i<string_length; i++) {
                var rnum = Math.floor(Math.random() * chars.length);
                randomstring += chars.substring(rnum,rnum+1);
            }
            return randomstring;
      }
	function processSdp(sdp_str) {
            var sdp = new Array();
            var sdp_idx = 0;
            var fingerprint = "";
            var has_mid = false;
            var lines = sdp_str.split("\r\n");

            for (var i = 0; i < lines.length; i++) {
                if (lines[i].indexOf("=crypto") > 0) {
            	    /* no SDES, DTLS all the way */
                } else {
                    /* keep the rest */
                    sdp[sdp_idx++] = lines[i];
                }
            }
            return sdp.join("\r\n");
        }

	function createPeerConnection(memberID) {
	    var peer_connection = null;
	    console.log("createPeerConnection: browser is " + webrtcDetectedBrowser);
	    try {
		var pc_config = null;
		if (AHOY_CONFIG.iceServers != undefined) {
		    pc_config = { iceServers: AHOY_CONFIG.iceServers };
		}
		if (webrtcDetectedBrowser == "firefox") {
		    peer_connection = new RTCPeerConnection(pc_config);
		} else {
		    var pc_constraints = {optional: [{DtlsSrtpKeyAgreement: true}, {googCpuOveruseDetection: true}, {googImprovedWifiBwe: true}]};
		    peer_connection = new RTCPeerConnection(pc_config, pc_constraints);
		}
		if (peer_connection == null) {
		    console.log("createPeerConnection: FAILED.");
		}
		if (memberID != null) {
		  peer_connection.onaddstream = function(event) {
		    if (members[memberID]) {
		      members[memberID].stream = event.stream;
		    }
		
	            if (conferenceEventListener != null) {
	              var msg = {};
	              msg.messageType = "STREAM_ADDED_event";
	              msg.memberID = memberID;
	              msg.stream = event.stream;
	    	      conferenceEventListener(msg);
	            }
	            electSpeaker();
		}
		peer_connection.onicecandidate = function(event) {
		    // we dont need to wait for ice candidates
		}
	    }
    		console.log("createPeerConnection: created RTCPeerConnection.");
	    } catch (e) {
    		console.log("createPeerConnection: unable to create peerconnection.");
	    }
	    return peer_connection;
	}

	function destroyPeerConnection(peer_connection) {
	    console.log("destroyPeerConnection: called");
	    if (peer_connection != null) {
		peer_connection.close();
	    }
	};
      
      	function createSdpAnswer(peer_connection, transactionID, remote_sdp_str) {
	    var jsep_msg = { "type": "offer", "sdp": processSdp(remote_sdp_str)};
	    var remoteDescription = new RTCSessionDescription(jsep_msg);
	    
	    if (peer_connection == localMember.peerConnection) {
		peer_connection.setRemoteDescription(remoteDescription, 
		function() {
		    peer_connection.createAnswer(
			function(sessionDescription) { 
			    sessionDescription.sdp = processSdp(sessionDescription.sdp);
			    peer_connection.setLocalDescription(sessionDescription, 
				function() {
				    ws.send(JSON.stringify({messageType:"MEDIA_RECEIVE_response", status: 200, reason: "OK", sdp: sessionDescription.sdp, transactionID: transactionID}));
				},
				function() {
				    console.log("setLocalSessionDescription: ERROR");
				}
			    )
			},
			function() {
			    console.log("createSdpAnswerErrorCallback:");
			},
			{'mandatory': {'OfferToReceiveAudio':false, 'OfferToReceiveVideo':false}}
		    );
		},
		function() {
		    console.log("setRemoteDescription: ERROR");
		    }
		);
	    } else {
		peer_connection.setRemoteDescription(remoteDescription, 
		function() {
		    peer_connection.createAnswer(
			function(sessionDescription) { 
			    peer_connection.setLocalDescription(sessionDescription, 
				function() {
				    ws.send(JSON.stringify({messageType:"SDP_response", status: 200, reason: "OK", sdp: sessionDescription.sdp, transactionID: transactionID}));
				},
				function() {
				    console.log("setLocalSessionDescription: ERROR");
				}
			    )
			},
			function() {
			    console.log("createSdpAnswerErrorCallback:");
			},
			{'mandatory': {'OfferToReceiveAudio':true, 'OfferToReceiveVideo':true}}
		    );
		},
		function() {
		    console.log("setRemoteDescription: ERROR");
		    }
		);
	    }
	};


      this.inConference = function() {
        return activeConference;
      }

      this.sharingAudio = function() {
        return preferences.shareAudio;
      }
      this.mutingAudio = function() {
        return preferences.muteAudio;
      }
      this.muteAudio = function(mute) {
      	if (localMember.stream != null) {
    	    if (localMember.stream.getAudioTracks().length == 1) {
    		localMember.stream.getAudioTracks()[0].enabled = !mute;
	    }
    	}
        preferences.muteAudio = mute;
      }
      this.isAbleToMuteMic = function() {
      	if (localMember.stream != null) {
      	    if (localMember.stream.getAudioTracks != undefined) {
    		if (localMember.stream.getAudioTracks().length == 1) {
    		    return true;
		}
	    }
    	}
    	return false;
      }
      this.isAbleToMuteCam = function() {
      	if (localMember.stream != null) {
      	    if (localMember.stream.getVideoTracks != undefined) {
    		if (localMember.stream.getVideoTracks().length == 1) {
    		    return true;
		}
	    }
    	}
    	return false;
      }

      this.sharingVideo = function() {
        return preferences.shareVideo;
      }
      this.mutingVideo = function() {
        return preferences.muteVideo;
      }
      this.muteVideo = function(mute) {
      	if (localMember.stream != null) {
    	    if (localMember.stream.getVideoTracks().length == 1) {
    		localMember.stream.getVideoTracks()[0].enabled = !mute;
    	    }
    	}
        preferences.muteVideo = mute;
      }
      
      this.setMaxVideoBitrate = function(bitrate) {
        preferences.maxVideoBitrate = bitrate;
      }

      this.shareMedia = function(audio, video, successCallback, errorCallback) {
        if (audio || video) {
    	    preferences.shareAudio = false;
    	    preferences.shareVideo = false;
    	    var mediaConstraints = {audio: audio}
	    if (video) {
		mediaConstraints.video = { optional: [] };
    		if (preferences.captureHdVideo) {
		    mediaConstraints.video.optional.push({minWidth: 1280});
		    mediaConstraints.video.optional.push({maxWidth: 1280});
		    mediaConstraints.video.optional.push({minHeight: 720});
		    mediaConstraints.video.optional.push({maxHeight: 720});
		} else {
		    mediaConstraints.video.optional.push({minWidth: 640});
		    mediaConstraints.video.optional.push({maxWidth: 640});
		    mediaConstraints.video.optional.push({minHeight: 480});
		    mediaConstraints.video.optional.push({maxHeight: 480});
		}
		if (webrtcDetectedBrowser == "chrome") {
		    mediaConstraints.video.optional.push({googLeakyBucket: true});
		    mediaConstraints.video.optional.push({googNoiseReduction: false});
		}
	    }
    	    getUserMedia(mediaConstraints, 
    	      function(stream) {
    	      console.log("userMediaSuccess");
		if (webrtcDetectedBrowser == "chrome") {
    	    	  var isAudio = 0;
    		  var isVideo = 0;
    		  try {
    		    isAudio = stream.getAudioTracks().length;
    		    isVideo = stream.getVideoTracks().length;
    		  } catch (e) {
    		  console.log("e: "+e);
    		    isAudio = stream.audioTracks.length;
    		    isVideo = stream.videoTracks.length;
    		  }
    		  if (isAudio) {
    		    preferences.shareAudio = true;
    		  }
    		  if (isVideo) {
    		    preferences.shareVideo = true;
    		  }
    		} else {
    		    preferences.shareAudio = audio;
    		    preferences.shareVideo = video;
    		}
    	        successCallback(stream);
    		if (localMember.stream != null) {
        	  localMember.stream.stop();
    		}
    	        localMember.stream = stream;
    	      },
    	      function(error) {
    	      console.log("error: "+JSON.stringify(error)+" mediaConstraints: "+JSON.stringify(mediaConstraints));
    		preferences.shareAudio = false;
    		preferences.shareVideo = false;
    	        errorCallback(error);
    	      }
    	    );
        } else {
    	  /* do not share anything */
    	  preferences.shareAudio = false;
    	  preferences.shareVideo = false;
    	  if (localMember.stream != null) {
            localMember.stream.stop();
            localMember.stream = null;
    	  }
    	  successCallback(null);
        }
      }

      function electSpeaker() {
        console.log("electSpeaker: speakerID = "+speakerID);
        var newSpeakerID = speakerID;
        if (((members[speakerID]) == null) || (localMember.memberID == speakerID)) {
            /* the current speaker left, or we were staring at ourself and somebody joined */
            newSpeakerID = null;
            for (var key in members) {
        	if (members[key] && (members[key] != localMember) && members[key].audio && members[key].audio.available) {
        	  newSpeakerID = members[key].memberID;
        	  break;
        	}
            }
            if (!newSpeakerID) {
              /* fall back to staring at ourself */
              newSpeakerID = localMember.memberID;
            }
        }
        if (speakerID != newSpeakerID) {
	  speakerID = newSpeakerID;
        console.log("electSpeaker: newSpeakerID = "+newSpeakerID);
	}
	if (conferenceEventListener != null) {
	  var msg = {};
	  msg.messageType = "SPEAKER_CHANGED_event";
	  msg.memberID = speakerID;
	  msg.force = true;
	  conferenceEventListener(msg);
	}
      }
      
      this.isTransmitOnly = function() {
        return self.transmitOnly;
      }

      this.joinConference = function(room, name, password, transmitOnly, captureHdVideo, successCallback, errorCallback) {
        preferences.name = name;
        self.transmitOnly = transmitOnly;
        preferences.captureHdVideo = captureHdVideo;
        localMember = {};
        members = {};
	ws = new WebSocket(wsUrl, "conference-protocol");
	try {
	    ws.onopen = function() {
	      console.log("onopen: connected to "+wsUrl);
	      ws.send(JSON.stringify({messageType:"CONFERENCE_JOIN_request", name: name, password: password, conferenceID: room, transactionID: generateTransactionID()}));
	    } 

	   ws.onclose = function(error){
	     resetWsUrl();
	     if (activeConference) {
	       for (var memberID in members) {
		  if (members[memberID] != null) {
		    if (members[memberID].peerConnection != null) {
			members[memberID].peerConnection.close();
			members[memberID].peerConnection = null;
		    }
		    if (members[memberID].stream != null) {
			members[memberID].stream.stop();
			members[memberID].stream = null;
		    }
		    delete members[memberID];
	    	  }
	       }
	       activeConference = false;
	       document.location.reload();
	     } else {
               errorCallback(500, false);
             }
	   }

	   ws.onmessage = function(message) {
	      var msg = JSON.parse(message.data);
	      switch (msg.messageType) {
	        case "CONFERENCE_JOIN_response":
		  if (msg.status == 200) {
		    if (msg.conferenceName && msg.conferenceName.length) {
			preferences.room = msg.conferenceName;
		    } else {
			preferences.room = msg.conferenceID;
		    }
		    preferences.conferenceID = msg.conferenceID;
		    preferences.password = password;
		    preferences.speaker = msg.speaker;
		    preferences.moderator = msg.moderator;
		    preferences.conferenceLocked = msg.locked;
		    speakerID = msg.speakerID;
		    
		    if (msg.remainingSeconds > 0) {
			var nowDate = new Date();
			preferences.endDate = new Date((msg.remainingSeconds * 1000) + nowDate.getTime());
		    } else {
		        preferences.endDate = null;
		    }

		    for (var key in msg.members) {
			members[msg.members[key].memberID] = msg.members[key];
			members[msg.members[key].memberID].peerConnection = null;
			members[msg.members[key].memberID].stream = null;
			members[msg.members[key].memberID].micMuted = msg.members[key].audio.muted;
			members[msg.members[key].memberID].muted = false;
			members[msg.members[key].memberID].mirror = false;
    	    		members[msg.members[key].memberID].allowCameraControl = false;
    	    		members[msg.members[key].memberID].haveCameraControl = false;
		    }
		    localMember.memberID = msg.memberID;
		    localMember.name = name;
		    localMember.speaker = msg.speaker;
		    localMember.moderator = msg.moderator;
		    localMember.peerConnection = null;
		    localMember.muted = true;
		    localMember.mirror = true;
		    localMember.micMuted = false;
    	    	    localMember.allowCameraControl = true;
    	    	    localMember.haveCameraControl = false;
	            members[localMember.memberID] = localMember;

		    activeConference = true;
		    if (subscribingMedia) {
			sendMediaRequest(members);
		    }
		    if (activeMedia) {
		      self.publishMedia();
		    } else {
		      successCallback(ws, msg.speaker);
		    }
		  } else if (msg.status == 302) {
		    wsUrl = msg.url;
		    preferences.wsUrl = wsUrl;
		    ws.onclose = null;
		    ws.close();
		    ws = null;
		    errorCallback(msg.status, true);
		  } else {
		    resetWsUrl();
		    activeConference = false;
		    ws.close();
		    ws = null;
		    errorCallback(msg.status, false);
		  }
		  break;
		case "CONFERENCE_KICK_indication":
		  document.location.reload();
		  break;
	        case "CONFERENCE_LOCK_indication":
	    	  preferences.conferenceLocked = msg.locked;
	          if (scopeListener != null) {
	    	    scopeListener();
	          }
	          if (statusMessageListener != null) {
	            $translate("conference.room_" + (msg.locked?"locked":"unlocked")).then(function (translation) {
	              var event = { text: translation };
	    	      statusMessageListener(event);
	            });
	          }
	    	  break;
		case "MEDIA_RECEIVE_request":
		  var call_peer_sdp = unescape(msg.sdp);
		  console.log("MEDIA_RECEIVE_request: "+call_peer_sdp);
		  localMember.peerConnection = createPeerConnection(null);
		  localMember.peerConnection.addStream(localMember.stream);
		  createSdpAnswer(localMember.peerConnection, msg.transactionID, call_peer_sdp);
		  break;
	        case "CONFERENCE_JOIN_indication":
	          var member = {};
	          member.memberID = msg.member.memberID;
	          member.name = msg.member.name;
	          member.speaker = msg.member.speaker;
	          member.moderator = msg.member.moderator;
    	    	  member.muted = false;
    	    	  member.mirror = false;
    	    	  member.allowCameraControl = false;
    		  member.micMuted = msg.member.audio.muted;
	          members[member.memberID] = member;

	          if (scopeListener != null) {
	    	    scopeListener();
	          }
	          if (conferenceEventListener != null) {
	    	    conferenceEventListener(msg);
	          }
	          if (statusMessageListener != null) {
	            $translate("conference.member_join").then(function (translation) {
	              var event = { text: msg.member.name + " " + translation };
	    	      statusMessageListener(event);
	            });
	          }
		  break;
		case "CONFERENCE_LEAVE_indication":
		  if (members[msg.member.memberID] != null) {
		    if (members[msg.member.memberID].peerConnection != null) {
			members[msg.member.memberID].peerConnection.close();
			members[msg.member.memberID].peerConnection = null;
		    }
		    if (members[msg.member.memberID].stream != null) {
			if (webrtcDetectedBrowser == "chrome") {
			    members[msg.member.memberID].stream.stop();
			}
			members[msg.member.memberID].stream = null;
		    }
		    delete members[msg.member.memberID];
	            if (scopeListener != null) {
	    	      scopeListener();
	            }
	            if (statusMessageListener != null) {
	              $translate("conference.member_leave").then(function (translation) {
	                var event = { text: msg.member.name + " " + translation };
	    	        statusMessageListener(event);
		      });
	            }
	            electSpeaker();
		  }
		  break;
		case "SDP_request":
		  if (members[msg.member.memberID].peerConnection != null) {
		    destroyPeerConnection(members[msg.member.memberID].peerConnection);
		    members[msg.member.memberID].peerConnection = null;
		  }
		  var call_peer_sdp = unescape(msg.sdp);
		  
		  members[msg.member.memberID].peerConnection= createPeerConnection(msg.member.memberID);
		  createSdpAnswer(members[msg.member.memberID].peerConnection, msg.transactionID, call_peer_sdp);
		  break;
	        case "CHAT_MESSAGE_indication":
	    	  try {
	    	    var json_msg = JSON.parse(msg.message.text);
	    	    if (json_msg.control) {
	    		if (json_msg.control.cameraControl) {
	    		    if (members[msg.from.memberID]) {
	    			members[msg.from.memberID].haveCameraControl = true;
	    			members[msg.from.memberID].allowCameraControl = json_msg.control.cameraControl.allow;
	        		if (scopeListener != null) {
	    			    scopeListener();
	        		}
	    		    }
	    		} else if (json_msg.control.camera) {
	    		
	    		}
	        	if (controlMessageListener != null) {
	            	    controlMessageListener(msg);
	        	}
	    	     } else if (json_msg.chat) {
	        	if (chatMessageListener != null) {
	            	    chatMessageListener(msg);
	        	}
	    	    }
	          } catch (error) {
	          }
	          break;
	        case "MEDIA_event":
		  switch (msg.event) {
		    case "start_speaking":
	    	      speakerID = msg.member.memberID;
		      if (localMember.memberID != msg.member.memberID) {
		        if (conferenceEventListener != null) {
			  var msg = {};
			  msg.messageType = "SPEAKER_CHANGED_event";
			  msg.force = false;
			  msg.member = {};
			  msg.memberID = members[speakerID].memberID;
			  msg.name = members[speakerID].name;
			  conferenceEventListener(msg);
			}
		      }
	    	      break;
		    case "audio_muted":
			if (mediaEventListener != null) {
			  if (members[msg.member.memberID]) {
			    members[msg.member.memberID].micMuted = true;
	        	    mediaEventListener(msg);
			  }
			}
		      break;
		    case "audio_unmuted":
			if (mediaEventListener != null) {
			  if (members[msg.member.memberID]) {
			    members[msg.member.memberID].micMuted = false;
	        	    mediaEventListener(msg);
			  }
			}
		      break;
	          }
	          break;
	        case "MEDIA_indication":
		    if (members[msg.member.memberID]) {
		      members[msg.member.memberID].audio = msg.audio;
		      members[msg.member.memberID].video = msg.video;
    		      members[msg.member.memberID].micMuted = msg.audio.muted;

		      if (subscribingMedia) {
		        sendMediaRequest(new Array({"memberID": msg.member.memberID, "audio": msg.audio, "video": msg.video}));
		      }
	              if (statusMessageListener != null) {
	                $translate("conference.member_started_media").then(function (translation) {
	                  var event = { text: msg.member.name + " " + translation };
	    	          statusMessageListener(event);
		        });
	              }
		    }
	          break;
	      }
	    }

	} catch(exception) {
	  ws = null;
	  errorCallback(500, false);
	}
      }

      this.startConference = function(room, name, password, moderatorpassword, successCallback, errorCallback) {
	ws = new WebSocket(wsUrl, "conference-protocol");
	try {
	    ws.onopen = function() {
	      console.log("onopen: connected to "+wsUrl);
	      ws.send(JSON.stringify({messageType:"CONFERENCE_CREATE_request", conferenceName: room, password: password, moderatorPassword: moderatorpassword, listenerPassword: generateTransactionID(), transactionID: generateTransactionID()}));
	    } 

	   ws.onclose = function(error){
             errorCallback(error);
	   }

	   ws.onmessage = function(message) {
	      var msg = JSON.parse(message.data);
	      if (msg.messageType == "CONFERENCE_CREATE_response") {
		if (msg.status == 200) {
		  preferences.room = msg.conferenceID;
		  preferences.conferenceID = msg.conferenceID;
		  preferences.password = moderatorpassword;
		  ws.onclose = null;
		  ws.close();
		  ws = null;
		  successCallback(msg.conferenceID);
		} else {
		  activeConference = false;
		  ws.close();
		  ws = null;
		  errorCallback(msg.status);
		}
	      }
	    }

	} catch(exception) {
	  ws = null;
	  errorCallback(exception);
	}
      }
      
      this.getPreferences = function() {
        return preferences;
      }
      
      this.getLocalMember = function() {
        return localMember;
      }

      this.getSpeaker = function() {
	if (speakerID && members[speakerID]) {
	    return members[speakerID];
	} else {
	  return null;
	}
      }

      this.getMember = function(memberID) {
        if (members[memberID] != null) {
    	  return members[memberID];
    	} else {
    	  return null;
    	}
      }

      this.getMembers = function() {
        return members;
      }

      this.publishMedia = function() {
        if (ws != null) {
	  ws.send(JSON.stringify({messageType:"MEDIA_SHARE_request", audio: preferences.shareAudio, video: preferences.shareVideo, maxVideoBitrate: preferences.maxVideoBitrate, transactionID: generateTransactionID()}));
	}
	activeMedia = true;
      }

      this.unpublishMedia = function() {
        if (ws != null) {
	  ws.send(JSON.stringify({messageType:"MEDIA_SHARE_request", audio: false, video: false, transactionID: generateTransactionID()}));
	}
	activeMedia = false;
      }
      
      this.publishingMedia = function() {
        return activeMedia;
      }

      this.subscribeMemberMedia = function(member, audio, video) {
          if (self.tranmitOnly) return;
	  var requestMembers = new Array();
	  var msg = {memberID: member.memberID, audio: false, video: false};
	  if (audio && member.audio && member.audio.available) {
	    msg.audio = true;
	  }
	  if (video && member.video && member.video.available) {
	    msg.video = true;
	  }
//	  console.log("SUBSCRIBING to "+member.name+" ("+member.memberID+") audio "+JSON.stringify(member.audio)+" video "+JSON.stringify(member.video));
	  ws.send(JSON.stringify({messageType:"MEDIA_request", members: [msg], transactionID: generateTransactionID()}));
      }

      this.unsubscribeMemberMedia = function(member) {
	  self.subscribeMemberMedia(member, false, false);
      }
      

      this.subscribeMedia = function() {
        if (self.tranmitOnly) return;
        /* request media from all members */
	for (var memberID in members) {
	    if (members[memberID] != localMember) {
	      self.subscribeMemberMedia(members[memberID], true, true);
	    }
	}
	if (localMember.stream != null) {
	  if (conferenceEventListener != null) {
	    var msg = {};
	    msg.messageType = "STREAM_ADDED_event";
	    msg.memberID = localMember.memberID;
	    msg.stream = localMember.stream;
	    conferenceEventListener(msg);
	  }
	}
	subscribingMedia = true;
	electSpeaker();
      }

      this.subscribeMediaOld = function() {
	/* send list of members when joining by emitting fake events */
	for (var key in members) {
	  if (conferenceEventListener != null) {
	    var event = {};
	    event.messageType = "CONFERENCE_JOIN_indication";
	    event.member = {};
	    event.member.name = members[key].name;
	    event.member.memberID = members[key].memberID;
	    event.member.speaker = members[key].speaker;
	    event.member.moderator = members[key].moderator;
	    conferenceEventListener(event);

	    if (members[key].stream != null) {
	        var msg = {};
	        msg.messageType = "STREAM_ADDED_event";
	        msg.memberID = members[key].memberID;
	        msg.stream = members[key].stream;
	    	conferenceEventListener(msg);
	    }
	    
	  }
	}

	if (mediaEventListener != null) {
	  for (var key in members) {
	    if (members[key].micMuted == true) {
	      var msg = {};
	      msg.member = {};
	      msg.messageType = "MEDIA_event";
	      msg.member.memberID = members[key].memberID;
	      msg.event = "audio_muted";
	      mediaEventListener(msg);
	    }
	  }
	}
	electSpeaker();
      }

      this.leaveConference = function() {
        activeMedia = false;
        activeConference = false;
        preferences.sharingAudio = false;
        preferences.room = '';
        preferences.conferenceID = '';
        preferences.name = '';
        preferences.password = '';
        preferences.shareVideo = false;
        preferences.shareAudio = false;
        preferences.speaker = false;
        preferences.moderator = false;
        preferences.muteVideo = false;
        preferences.muteAudio = false;
      
        if (localMember.stream) {
    	  if (webrtcDetectedBrowser == "chrome") {
            localMember.stream.stop();
    	  }
          localMember.stream = null;
        }
        if (localMember.peerConnection) {
          localMember.peerConnection.close();
          localMember.peerConnection = null;
        }

	for (var memberID in members) {
	    if (members[memberID].peerConnection != null) {
		members[memberID].peerConnection.close();
		members[memberID].peerConnection = null;
	    }
	}
        
        localMember = {};
        members = {};
        
        if (ws) {
          ws.onclose = null;
    	  ws.close();
    	  ws = null;
        }
        resetWsUrl();
      }

    this.destroyConference = function() {
	ws.send(JSON.stringify({messageType:"CONFERENCE_DESTROY_request", transactionID: generateTransactionID()}));
    }

    this.lockConference = function(lock) {
	ws.send(JSON.stringify({messageType:"CONFERENCE_LOCK_request", lock: lock, transactionID: generateTransactionID()}));
    }

    this.registerChatMessageListener = function(callback) {
      chatMessageListener = callback;
    }

    this.registerControlMessageListener = function(callback) {
      controlMessageListener = callback;
    }

    this.registerStatusMessageListener = function(callback) {
      statusMessageListener = callback;
    }
    
    this.registerMediaEventListener = function(callback) {
      mediaEventListener = callback;
    }

    this.registerConferenceEventListener = function(callback) {
      conferenceEventListener = callback;
    }

    this.registerScopeListener = function(callback) {
      scopeListener = callback;
    }
      
    this.sendChatMessage = function(message) {
      if(ws) {
	ws.send(JSON.stringify({messageType:"CHAT_MESSAGE_request", message: { text: JSON.stringify({chat:message}) }, transactionID: generateTransactionID()}));
      }
    }

    this.sendControlMessage = function(message) {
      if(ws) {
	ws.send(JSON.stringify({messageType:"CHAT_MESSAGE_request", message: { text: JSON.stringify({control:message}) }, transactionID: generateTransactionID()}));
      }
    }
    
    this.kickMember = function(member) {
	ws.send(JSON.stringify({messageType:"CONFERENCE_KICK_request", memberID: member.memberID, transactionID: generateTransactionID()}));
    }
      

    this.getEndsAt = function() {
	if (preferences.endDate) {
	    return preferences.endDate.getTime();
	} else {
	    return 0;
	}
    }
    
    this.showErrorDialog = function(scope, title, message) {
	window.modal = $modal;
	scope.errorDialog = { title: title, message: message };
	var modalInstance = $modal.open({
	    templateUrl: 'tpl/errorModal.html',
	    scope: scope,
	    controller: function($scope, $modalInstance) {
		$scope.close = function() {
		    $modalInstance.close();
		}
	    }
	});
    }

    this.showConfirmDialog = function(scope, title, message, confirmCallback) {
	window.modal = $modal;
	scope.confirmDialog = { title: title, message: message };
	var modalInstance = $modal.open({
	    templateUrl: 'tpl/confirmModal.html',
	    scope: scope,
	    controller: function($scope, $modalInstance) {
		$scope.confirm = function() {
		    if (confirmCallback) confirmCallback();
		    $modalInstance.close();
		}
		$scope.cancel = function() {
		    $modalInstance.close();
		}
	    }
	});
    }
      
    }]);
    
