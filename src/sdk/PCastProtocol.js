/**
 * Copyright 2020 Phenix Real Time Solutions, Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define([
    'phenix-web-lodash-light',
    'phenix-web-assert',
    'phenix-web-observable',
    'phenix-web-proto',
    'phenix-rtc',
    './protocol/pcastProto.json',
    './protocol/chatProto.json'
], function(_, assert, observable, proto, phenixRTC, pcastProto, chatProto) {
    'use strict';

    var apiVersion = 5;

    function PCastProtocol(uri, deviceId, version, logger) {
        assert.isStringNotEmpty(uri, 'uri');
        assert.isString(deviceId, 'deviceId');
        assert.isStringNotEmpty(version, 'version');
        assert.isObject(logger, 'logger');

        this._deviceId = deviceId;
        this._version = version;
        this._logger = logger;
        this._mqWebSocket = new proto.MQWebSocket(uri, this._logger, [pcastProto, chatProto], apiVersion);
        this._observableSessionId = new observable.Observable(null).extend({rateLimit: 0});
    }

    PCastProtocol.prototype.onEvent = function(eventName, handler) {
        return this._mqWebSocket.onEvent(eventName, handler);
    };

    PCastProtocol.prototype.disconnect = function() {
        this._observableSessionId.setValue(null);

        return this._mqWebSocket.disconnect();
    };

    PCastProtocol.prototype.authenticate = function(authToken, callback) {
        assert.isStringNotEmpty(authToken, 'authToken');
        assert.isFunction(callback, 'callback');

        var authenticate = {
            apiVersion: this._mqWebSocket.getApiVersion(),
            clientVersion: this._version,
            deviceId: this._deviceId,
            platform: phenixRTC.browser,
            platformVersion: phenixRTC.browserVersion.toString(),
            authenticationToken: authToken
        };

        if (this.getSessionId()) {
            authenticate.sessionId = this.getSessionId();
        }

        var that = this;

        return this._mqWebSocket.sendRequest('pcast.Authenticate', authenticate, function(error, response) {
            if (response) {
                var previousSessionId = that._observableSessionId.getValue();

                if (previousSessionId && previousSessionId !== response.sessionId) {
                    that._mqWebSocket.disposeOfPendingRequests();
                }

                that._observableSessionId.setValue(response.sessionId);
            }

            return callback(error, response);
        });
    };

    PCastProtocol.prototype.getSessionId = function() {
        return this._observableSessionId.getValue();
    };

    PCastProtocol.prototype.getObservableSessionId = function() {
        return this._observableSessionId;
    };

    PCastProtocol.prototype.bye = function(reason, callback) {
        assert.isStringNotEmpty(reason, 'reason');
        assert.isFunction(callback, 'callback');

        var bye = {
            sessionId: this.getSessionId(),
            reason: reason
        };

        return this._mqWebSocket.sendRequest('pcast.Bye', bye, callback);
    };

    PCastProtocol.prototype.setupStream = function(streamType, streamToken, options, rtt, callback) {
        assert.isStringNotEmpty(streamType, 'streamType');
        assert.isStringNotEmpty(streamToken, 'streamToken');
        assert.isObject(options, 'options');
        assert.isFunction(callback, 'callback');

        var browser = phenixRTC.browser || 'UnknownBrowser';
        var browserWithVersion = browser + '-' + (phenixRTC.browserVersion || 0);
        var rttString = 'rtt[http]=' + rtt;
        var setupStream = {
            streamToken: streamToken,
            createStream: {
                sessionId: this.getSessionId(),
                options: ['data-quality-notifications', rttString],
                connectUri: options.connectUri,
                connectOptions: options.connectOptions || [],
                tags: options.tags || [],
                userAgent: _.get(phenixRTC, ['global', 'navigator', 'userAgent'], browserWithVersion)
            }
        };

        if (options.originStreamId) {
            setupStream.createStream.originStreamId = options.originStreamId;
        }

        if (options.negotiate) {
            setupStream.createStream.createOfferDescription = {
                streamId: '',
                options: [streamType, browser, browserWithVersion],
                apiVersion: this._mqWebSocket.getApiVersion()
            };

            if (typeof screen !== 'undefined') {
                setupStream.createStream.createOfferDescription.options.push('screen=' + screen.width + 'x' + screen.height);
            }
        }

        if (options.receiveAudio === false) {
            setupStream.createStream.options.push('no-audio');
        }

        if (options.receiveVideo === false) {
            setupStream.createStream.options.push('no-video');
        }

        return this._mqWebSocket.sendRequest('pcast.SetupStream', setupStream, callback);
    };

    PCastProtocol.prototype.setAnswerDescription = function(streamId, sdp, callback) {
        assert.isStringNotEmpty(streamId, 'streamId');
        assert.isStringNotEmpty(sdp, 'sdp');
        assert.isFunction(callback, 'callback');

        var setRemoteDescription = {
            streamId: streamId,
            sessionDescription: {
                type: 'Answer',
                sdp: sdp
            },
            apiVersion: this._mqWebSocket.getApiVersion()
        };

        return this._mqWebSocket.sendRequest('pcast.SetRemoteDescription', setRemoteDescription, callback);
    };

    PCastProtocol.prototype.addIceCandidates = function(streamId, candidates, options, callback) {
        assert.isStringNotEmpty(streamId, 'streamId');
        assert.isArray(candidates, 'candidates');
        assert.isObject(options, 'options');
        assert.isFunction(callback, 'callback');

        var sanitizedCandidates = _.map(candidates, function(candidate, index) {
            assert.isStringNotEmpty(candidate.candidate, 'candidate[' + index + '].candidate');
            assert.isNumber(candidate.sdpMLineIndex, 'candidate[' + index + '].sdpMLineIndex');
            assert.isStringNotEmpty(candidate.sdpMid, 'candidate[' + index + '].sdpMid');

            return {
                candidate: candidate.candidate,
                sdpMLineIndex: candidate.sdpMLineIndex,
                sdpMid: candidate.sdpMid
            };
        });

        var addIceCandidates = {
            streamId: streamId,
            candidates: sanitizedCandidates,
            options: options,
            apiVersion: this._mqWebSocket.getApiVersion()
        };

        return this._mqWebSocket.sendRequest('pcast.AddIceCandidates', addIceCandidates, callback);
    };

    PCastProtocol.prototype.updateStreamState = function(streamId, signalingState, iceGatheringState, iceConnectionState, callback) {
        assert.isStringNotEmpty(streamId, 'streamId');
        assert.isStringNotEmpty(signalingState, 'signalingState');
        assert.isStringNotEmpty(iceGatheringState, 'iceGatheringState');
        assert.isStringNotEmpty(iceConnectionState, 'iceConnectionState');
        assert.isFunction(callback, 'callback');

        var updateStreamState = {
            streamId: streamId,
            signalingState: signalingState,
            iceGatheringState: iceGatheringState,
            iceConnectionState: iceConnectionState,
            apiVersion: this._mqWebSocket.getApiVersion()
        };

        return this._mqWebSocket.sendRequest('pcast.UpdateStreamState', updateStreamState, callback);
    };

    PCastProtocol.prototype.destroyStream = function(streamId, reason, callback) {
        assert.isStringNotEmpty(streamId, 'streamId');
        assert.isString(reason, 'reason');
        assert.isFunction(callback, 'callback');

        var destroyStream = {
            streamId: streamId,
            reason: reason
        };

        return this._mqWebSocket.sendRequest('pcast.DestroyStream', destroyStream, callback);
    };

    PCastProtocol.prototype.getRoomInfo = function(roomId, alias, callback) {
        if (roomId) {
            assert.isString(roomId, 'roomId');
        } else {
            assert.isString(alias, 'alias');
        }

        assert.isFunction(callback, 'callback');

        var getRoomInfo = {
            roomId: roomId,
            alias: alias,
            sessionId: this.getSessionId()
        };

        return this._mqWebSocket.sendRequest('chat.GetRoomInfo', getRoomInfo, callback);
    };

    PCastProtocol.prototype.createRoom = function(room, callback) {
        assert.isObject(room, 'room');
        assert.isStringNotEmpty(room.name, 'room.name');
        assert.isStringNotEmpty(room.type, 'room.type');
        assert.isStringNotEmpty(room.description, 'room.description');
        assert.isFunction(callback, 'callback');

        var createRoom = {
            sessionId: this.getSessionId(),
            room: room
        };

        return this._mqWebSocket.sendRequest('chat.CreateRoom', createRoom, callback);
    };

    PCastProtocol.prototype.enterRoom = function(roomId, alias, member, options, timestamp, callback) {
        if (roomId) {
            assert.isString(roomId, 'roomId');
        } else {
            assert.isString(alias, 'alias');
        }

        assert.isObject(member, 'member');
        assert.isNumber(timestamp, 'timestamp');
        assert.isArray(options, 'options');
        assert.isFunction(callback, 'callback');

        var joinRoom = {
            roomId: roomId,
            alias: alias,
            sessionId: this.getSessionId(),
            member: member,
            options: options,
            timestamp: timestamp
        };

        return this._mqWebSocket.sendRequest('chat.JoinRoom', joinRoom, callback);
    };

    PCastProtocol.prototype.leaveRoom = function(roomId, timestamp, callback) {
        assert.isString(roomId, 'roomId');
        assert.isNumber(timestamp, 'timestamp');
        assert.isFunction(callback, 'callback');

        var leaveRoom = {
            roomId: roomId,
            sessionId: this.getSessionId(),
            timestamp: timestamp
        };

        return this._mqWebSocket.sendRequest('chat.LeaveRoom', leaveRoom, callback);
    };

    PCastProtocol.prototype.updateMember = function(roomId, member, timestamp, callback) {
        assert.isStringNotEmpty(roomId, 'roomId');
        assert.isObject(member, 'member');
        assert.isNumber(timestamp, 'timestamp');
        assert.isFunction(callback, 'callback');

        member.updateStreams = Object.prototype.hasOwnProperty.call(member, 'streams');

        var updateMember = {
            sessionId: this.getSessionId(),
            roomId: roomId,
            member: member,
            timestamp: timestamp
        };

        return this._mqWebSocket.sendRequest('chat.UpdateMember', updateMember, callback);
    };

    PCastProtocol.prototype.updateRoom = function(room, timestamp, callback) {
        assert.isObject(room, 'room');
        assert.isNumber(timestamp, 'timestamp');
        assert.isFunction(callback, 'callback');

        var updateRoom = {
            sessionId: this.getSessionId(),
            room: room,
            timestamp: timestamp
        };

        return this._mqWebSocket.sendRequest('chat.UpdateRoom', updateRoom, callback);
    };

    PCastProtocol.prototype.sendMessageToRoom = function(roomId, chatMessage, callback) {
        assert.isStringNotEmpty(roomId, 'roomId');
        assert.isObject(chatMessage, 'chatMessage');

        var sendMessage = {
            roomId: roomId,
            chatMessage: chatMessage
        };

        return this._mqWebSocket.sendRequest('chat.SendMessageToRoom', sendMessage, callback);
    };

    PCastProtocol.prototype.subscribeToRoomConversation = function(sessionId, roomId, batchSize, callback) {
        assert.isStringNotEmpty(sessionId, 'sessionId');
        assert.isStringNotEmpty(roomId, 'roomId');
        assert.isNumber(batchSize, 'batchSize');

        var fetchRoomConversation = {
            sessionId: sessionId,
            roomId: roomId,
            limit: batchSize,
            options: ['Subscribe']
        };

        return this._mqWebSocket.sendRequest('chat.FetchRoomConversation', fetchRoomConversation, callback);
    };

    PCastProtocol.prototype.getMessages = function(sessionId, roomId, batchSize, afterMessageId, beforeMessageId, callback) {
        assert.isStringNotEmpty(sessionId, 'sessionId');
        assert.isStringNotEmpty(roomId, 'roomId');

        if (!beforeMessageId || !afterMessageId) {
            assert.isNumber(batchSize, 'batchSize');
        }

        var fetchRoomConversation = {
            sessionId: sessionId,
            roomId: roomId,
            limit: batchSize || 0,
            options: []
        };

        if (beforeMessageId) {
            assert.isStringNotEmpty(beforeMessageId, 'beforeMessageId');

            fetchRoomConversation.beforeMessageId = beforeMessageId;
        }

        if (afterMessageId) {
            assert.isStringNotEmpty(afterMessageId, 'afterMessageId');

            fetchRoomConversation.afterMessageId = afterMessageId;
        }

        return this._mqWebSocket.sendRequest('chat.FetchRoomConversation', fetchRoomConversation, callback);
    };

    PCastProtocol.prototype.toString = function() {
        return 'PCastProtocol[' + this._mqWebSocket.toString() + ']';
    };

    return PCastProtocol;
});