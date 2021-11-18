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
    'phenix-web-disposable',
    './ChatService'
], function(_, assert, observable, disposable, ChatService) {
    'use strict';

    var defaultBatchSize = 0;
    var maxCachedQueueSize = 100;

    function RoomChatService(roomService) {
        assert.isObject(roomService, 'roomService');
        assert.isObject(roomService._pcast, 'roomService._pcast');

        this._roomService = roomService;

        this._chatMessages = new observable.ObservableArray([]);
        this._lastChatMessage = new observable.Observable(null);
        this._disposables = new disposable.DisposableList();
        this._chatRoomId = null;

        this.setPCast(roomService._pcast);
    }

    RoomChatService.prototype.setPCast = function setPCast(pcast) {
        assert.isObject(pcast, 'pcast');
        assert.isFunction(pcast.getLogger, 'pcast.getLogger');

        this._pcast = pcast;
        this._logger = pcast.getLogger();

        if (this._chatService) {
            this._chatService.setPCast(pcast);
        } else {
            this._chatService = new ChatService(pcast);
        }
    };

    RoomChatService.prototype.getBatchSize = function getBatchSize() {
        return this._batchSize;
    };

    RoomChatService.prototype.start = function start(batchSize) {
        this._batchSize = batchSize || defaultBatchSize;
        this._chatService.start();

        setupSubscriptions.call(this);
        setupMessageSubscription.call(this);
    };

    RoomChatService.prototype.stop = function stop() {
        this._chatService.stop();

        disposeOfMessageSubscription.call(this);

        if (this._disposables) {
            this._disposables.dispose();
        }
    };

    RoomChatService.prototype.getObservableChatMessages = function getObservableChatMessages() {
        return this._chatMessages;
    };

    RoomChatService.prototype.getObservableLastChatMessage = function getObservableLastChatMessage() {
        return this._lastChatMessage;
    };

    RoomChatService.prototype.getObservableChatEnabled = function getObservableChatEnabled() {
        return this._chatService.getObservableChatEnabled();
    };

    RoomChatService.prototype.canSendMessage = function canSendMessage() {
        return this._chatService.canSendMessage();
    };

    RoomChatService.prototype.sendMessageToRoom = function sendMessageToRoom(message, callback) {
        var room = this._roomService.getObservableActiveRoom().getValue();

        if (!room) {
            return callback(new Error('Not in room'), null);
        }

        var roomId = room.getRoomId();
        var self = this._roomService._self.getValue();

        if (!self) {
            return callback(new Error('No record for oneself'), null);
        }

        var screenName = self.getObservableScreenName().getValue();
        var role = self.getObservableRole().getValue();
        var lastUpdate = self.getLastUpdate();

        this._chatService.sendMessageToRoom(roomId, screenName, role, lastUpdate, message, callback);
    };

    RoomChatService.prototype.getMessages = function getMessages(batchSize, afterMessageId, beforeMessageId, callback) {
        var room = this._roomService.getObservableActiveRoom().getValue();
        var roomId = room.getRoomId();

        return this._chatService.getMessages(roomId, batchSize, afterMessageId, beforeMessageId, callback);
    };

    RoomChatService.prototype.toString = function toString() {
        return 'RoomChatService';
    };

    function onRoomChange(room) {
        if (room && this._chatRoomId === room.getRoomId()) {
            return;
        }

        disposeOfMessageSubscription.call(this);

        if (room) {
            setupMessageSubscription.call(this);
        }
    }

    function setupSubscriptions() {
        var roomSubscription = this._roomService.getObservableActiveRoom().subscribe(_.bind(onRoomChange, this));

        this._disposables.add(roomSubscription);
    }

    function setupMessageSubscription() {
        disposeOfMessageSubscription.call(this);

        this._roomChatSubscription = subscribeAndLoadMessages.call(this, this._batchSize);
    }

    function disposeOfMessageSubscription() {
        if (this._roomChatSubscription && this._roomChatSubscription.dispose) {
            this._roomChatSubscription.dispose();
        }
    }

    function subscribeAndLoadMessages(batchSize) {
        var room = this._roomService.getObservableActiveRoom().getValue();
        var roomId = room.getRoomId();

        this._chatRoomId = roomId;

        var that = this;

        this._chatMessages.setValue([]);

        return this._chatService.subscribeAndLoadMessages(roomId, batchSize, function onReceiveMessages(error, response) {
            if (error) {
                throw error;
            }

            if (response.status !== 'ok') {
                throw new Error('Unable to subscribe to room chat. Status [' + response.status + ']');
            }

            var messages = that._chatMessages.getValue();

            _.forEach(response.chatMessages, function addMessage(message) {
                var insertIdx = messages.length;

                // Find its position in the history
                while (insertIdx > 0 && message.messageId < _.get(messages, [insertIdx - 1, 'messageId'])) {
                    insertIdx--;
                }

                if (insertIdx === 0 && messages.length > 0) {
                    that._logger.info('[%] Ignoring message [%s]/[%s] prior to current chat history to prevent gaps.',
                        roomId, message.messageId, message.timestamp);

                    return;
                }

                if (insertIdx > 0 && _.get(messages, [insertIdx - 1, 'messageId']) === message.messageId) {
                    that._logger.info('[%] Ignoring duplicate message [%s]/[%s]',
                        roomId, message.messageId, message.timestamp);

                    return;
                }

                messages.splice(insertIdx, 0, message);

                that._lastChatMessage.setValue(message);
            });

            if (messages.length > maxCachedQueueSize) {
                messages.splice(0, messages.length - maxCachedQueueSize);
            }

            that._chatMessages.setValue(messages);
        });
    }

    return RoomChatService;
});