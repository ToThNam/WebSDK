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
    'phenix-web-proto',
    'phenix-web-event',
    'phenix-web-disposable'
], function(_, proto, event, disposable) {
    var mqWebSocketClone = proto.MQWebSocket;

    function WebSocketStubber() {
        this._handlers = {};
        this._defaultResponse = {
            message: {status: 'ok'},
            callback: function() {}
        };
        this._namedEvents = {};
        this._websocketCount = 0;
    }

    WebSocketStubber.prototype.stub = function(callback) {
        setupStubIfNoneExist.call(this);

        this._defaultResponse.callback = callback;
    };

    WebSocketStubber.prototype.stubAuthRequest = function(sessionId, callback) {
        setupStubIfNoneExist.call(this);

        this.stubResponse('pcast.Authenticate', {
            status: 'ok',
            sessionId: sessionId || 'MockSessionId'
        }, callback);
    };

    WebSocketStubber.prototype.stubAuthRequestFailure = function(status, callback) {
        setupStubIfNoneExist.call(this);

        this.stubResponse('pcast.Authenticate', {status: status}, callback);
    };

    WebSocketStubber.prototype.stubSetupStream = function(callback) {
        this.stubResponse('pcast.SetupStream', {
            status: 'ok',
            createStreamResponse: {
                status: 'ok',
                streamId: 'mockStreamId',
                offset: 100,
                createOfferDescriptionResponse: {
                    status: 'ok',
                    sessionDescription: {sdp: 'mockSdp'}
                }
            }
        }, callback);

        this.stubResponse('pcast.SetRemoteDescription', {
            status: 'ok',
            sessionDescription: {sdp: 'mockSdp'}
        }, callback);
    };

    WebSocketStubber.prototype.stubUpdateMemberResponse = function(callback) {
        var that = this;

        this.stubResponse('chat.UpdateMember', {status: 'ok'}, function(type, message, id) {
            if (message.member.role === 'Audience') {
                that.stubEvent('chat.RoomEvent', {
                    roomId: message.roomId,
                    eventType: 'MemberLeft',
                    members: [message.member]
                }, id);
            }

            if (message.member.role && message.member.role !== 'Audience') {
                that.stubEvent('chat.RoomEvent', {
                    roomId: message.roomId,
                    eventType: 'MemberJoined',
                    members: [message.member]
                }, id);
            }

            if (callback) {
                callback();
            }
        });
    };

    WebSocketStubber.prototype.stubJoinRoomResponse = function(room, members, callback) {
        var response = {
            status: 'ok',
            room: room,
            members: members.slice()
        };

        this.stubResponse('chat.JoinRoom', response, function(type, message) {
            if (message.member.role && message.member.role !== 'Audience') {
                response.members.push(message.member);
            }

            if (callback) {
                callback();
            }
        });
    };

    WebSocketStubber.prototype.stubResponse = function(type, message, callback) {
        setupStubIfNoneExist.call(this);

        this._handlers[type] = {
            message: message,
            callback: callback
        };
    };

    WebSocketStubber.prototype.stubResponseError = function(type, message, callback) {
        setupStubIfNoneExist.call(this);

        this._handlers[type] = {
            message: message,
            callback: callback,
            isError: true
        };
    };

    WebSocketStubber.prototype.stubEvent = function(type, message, id) {
        setupStubIfNoneExist.call(this);

        id = _.isNumber(id) ? id : (this._websocketCount - 1);

        if (this._namedEvents[id]) {
            this._namedEvents[id].fire(type, [message]);
        }
    };

    WebSocketStubber.prototype.triggerConnected = function(id) {
        id = _.isNumber(id) ? id : (this._websocketCount - 1);

        if (this._namedEvents[id]) {
            this._namedEvents[id].fire('connected');
        } else {
            console.warn('No matching connection [%s] to trigger event [%s] on', id, 'connected');
        }
    };

    WebSocketStubber.prototype.triggerReconnected = function(id) {
        id = _.isNumber(id) ? id : (this._websocketCount - 1);

        if (this._namedEvents[id]) {
            this._namedEvents[id].fire('reconnected');
        } else {
            console.warn('No matching connection [%s] to trigger event [%s] on', id, 'reconnected');
        }
    };

    WebSocketStubber.prototype.triggerDisconnected = function(id) {
        id = _.isNumber(id) ? id : (this._websocketCount - 1);

        if (this._namedEvents[id]) {
            this._namedEvents[id].fire('disconnected');
        } else {
            console.warn('No matching connection [%s] to trigger event [%s] on', id, 'disconnected');
        }
    };

    WebSocketStubber.prototype.getNumberOfListeners = function(eventName, id) {
        id = _.isNumber(id) ? id : (this._websocketCount - 1);

        if (this._namedEvents[id]) {
            return this._namedEvents[id].size(eventName);
        }

        console.warn('No matching connection [%s] to trigger event [%s] on', id, eventName);

        return 0;
    };

    WebSocketStubber.prototype.restore = function() {
        _.forOwn(this._namedEvents, function(namedEvent) {
            namedEvent.dispose();
        });

        this._namedEvents = {};
        this._websocketCount = 0;
        this._handlers = {};

        proto.MQWebSocket = mqWebSocketClone; // eslint-disable-line no-global-assign
    };

    function setupStubIfNoneExist() {
        var that = this;

        if (proto.MQWebSocket !== mqWebSocketClone) {
            return;
        }

        proto.MQWebSocket = function() { // eslint-disable-line no-global-assign
            var id = that._websocketCount++;

            setTimeout(function() {
                that.triggerConnected(id);
            }, 0);

            that._namedEvents[id] = new event.NamedEvents();

            return {
                disconnect: function() {
                    if (that._namedEvents[id]) {
                        that._namedEvents[id].dispose();
                    }
                },
                sendRequest: function(type, message, callback) {
                    var handler = that._handlers[type] || that._defaultResponse;

                    if (_.isFunction(handler.callback)) {
                        handler.callback(type, message, callback);
                    }

                    if (handler.isError) {
                        return callback(handler.message);
                    }

                    callback(null, handler.message);
                },
                onEvent: function(eventName, callback) {
                    if (that._namedEvents[id]) {
                        return that._namedEvents[id].listen(eventName, callback);
                    }

                    return new disposable.Disposable(_.noop);
                },
                getApiVersion: function() {
                    return 'version';
                },
                disposeOfPendingRequests: _.noop
            };
        };
    }

    return WebSocketStubber;
});