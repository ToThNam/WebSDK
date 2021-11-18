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
    'phenix-web-observable',
    'long',
    'sdk/PCast',
    'sdk/chat/ChatService',
    '../../../test/mock/HttpStubber',
    '../../../test/mock/WebSocketStubber',
    '../../../test/mock/ChromeRuntimeStubber'
], function(_, observable, Long, PCast, ChatService, HttpStubber, WebSocketStubber, ChromeRuntimeStubber) {
    var pcast;
    var chatService;
    var response;
    var httpStubber;
    var websocketStubber;
    var chromeRuntimeStubber = new ChromeRuntimeStubber();

    describe('When Instantiating a ChatService', function() {
        before(function() {
            chromeRuntimeStubber.stub();
        });

        beforeEach(function(done) {
            httpStubber = new HttpStubber();
            httpStubber.stub();

            websocketStubber = new WebSocketStubber();
            websocketStubber.stubAuthRequest();

            pcast = new PCast();

            pcast.start('AuthToken', function() {}, function onlineCallback() {
                chatService = new ChatService(pcast);
                done();
            }, function offlineCallback() {});

            response = {
                status: 'ok',
                chatMessages: []
            };

            websocketStubber.stubResponse('chat.FetchRoomConversation', response);
            websocketStubber.stubResponse('chat.SendMessageToRoom', response);
        });

        after(function() {
            chromeRuntimeStubber.restore();
        });

        afterEach(function() {
            pcast.stop();
            httpStubber.restore();
            websocketStubber.restore();
        });

        it('Has property start that is a function', function() {
            expect(chatService.start).to.be.a('function');
        });

        it('Has property stop that is a function', function() {
            expect(chatService.stop).to.be.a('function');
        });

        it('Has property sendMessage that is a function', function() {
            expect(chatService.sendMessageToRoom).to.be.a('function');
        });

        it('Has property loadMessages that is a function', function() {
            expect(chatService.subscribeAndLoadMessages).to.be.a('function');
        });

        describe('When chat service is started', function() {
            beforeEach(function() {
                chatService.start();
            });

            afterEach(function() {
                chatService.stop();
            });

            it('loadMessages returns list of existing messages for roomId', function() {
                response.chatMessages = [{id: '1'}];

                websocketStubber.stubResponse('chat.FetchRoomConversation', response);

                chatService.subscribeAndLoadMessages('roomId', 1, function(error, response) {
                    expect(response.chatMessages[0].id).to.be.equal('1');
                });
            });

            it('loadMessages successfully converts Long Timestamp', function() {
                response.chatMessages = [{
                    id: '1',
                    timestamp: Long.fromNumber(1488469432437)
                }];

                websocketStubber.stubResponse('chat.FetchRoomConversation', response);

                chatService.subscribeAndLoadMessages('roomId', 1, function(error, response) {
                    expect(response.chatMessages[0].timestamp).to.be.equal(1488469432437);
                });
            });

            it('loadMessages status other than ok with no chatMessages when status other than ok returned from protocol', function() {
                response.status = 'no-room';

                websocketStubber.stubResponse('chat.FetchRoomConversation', response);

                chatService.subscribeAndLoadMessages('roomId', 1, function(error, response) {
                    expect(response.status).to.not.be.equal('ok');
                    expect(response.chatMessages).to.not.be.ok;
                });
            });

            it('Expect subscribeAndLoadMessages to return an error when error returned from protocol', function() {
                websocketStubber.stubResponseError('chat.FetchRoomConversation', new Error('Error'));

                chatService.subscribeAndLoadMessages('roomId', 1, function(error, response) {
                    expect(response).to.be.not.ok;
                    expect(error).to.be.ok;
                });
            });

            it('sendMessage results in request to send chat message', function() {
                var sendMessageSpy = sinon.spy();

                websocketStubber.stubResponse('chat.SendMessageToRoom', response, sendMessageSpy);

                chatService.sendMessageToRoom('roomId', 'screenName', 'role', 123, 'Hi', function() {});

                sinon.assert.calledOnce(sendMessageSpy);
            });

            it('Expect sendMessageToRoom to return an error when error returned from protocol', function() {
                websocketStubber.stubResponseError('chat.SendMessageToRoom', new Error('Error'));

                chatService.sendMessageToRoom('roomId', 'screenName', 'role', 123, 'Hi', function(error, response) {
                    expect(response).to.be.not.ok;
                    expect(error).to.be.ok;
                });
            });
        });

        describe('When listening for messages', function() {
            beforeEach(function() {
                chatService.start();
            });

            afterEach(function() {
                chatService.stop();
            });

            it('Message event returns list of messages to handler', function() {
                websocketStubber.stubResponse('chat.FetchRoomConversation', response);

                chatService.subscribeAndLoadMessages('roomId', 1, function(error, response) {
                    if (response.chatMessages.length > 0) {
                        expect(response.chatMessages[0].id).to.be.equal('1');
                    }
                });

                websocketStubber.stubEvent('chat.RoomConversationEvent', {
                    roomId: 'roomId',
                    eventType: 'Message',
                    chatMessages: [{id: '1'}]
                });
            });

            it('Chat Message timestamp Long values successfully converted', function() {
                chatService.subscribeAndLoadMessages('roomId', 1, function(error, response) {
                    if (response.chatMessages.length) {
                        expect(response.chatMessages[0].timestamp).to.be.equal(1488469432437);
                    }
                });

                websocketStubber.stubEvent('chat.RoomConversationEvent', {
                    roomId: 'roomId',
                    eventType: 'Message',
                    chatMessages: [{
                        id: '1',
                        timestamp: Long.fromNumber(1488469432437)
                    }]
                });
            });

            it('Chat Message From lastUpdate Long values successfully converted', function() {
                chatService.subscribeAndLoadMessages('roomId', 1, function(error, response) {
                    if (response.chatMessages.length) {
                        expect(response.chatMessages[0].from.lastUpdate).to.be.equal(1488469432437);
                    }
                });

                websocketStubber.stubEvent('chat.RoomConversationEvent', {
                    roomId: 'roomId',
                    eventType: 'Message',
                    chatMessages: [{
                        id: '1',
                        from: {lastUpdate: Long.fromNumber(1488469432437)}
                    }]
                });
            });
        });

        describe('When getting messages', function() {
            beforeEach(function() {
                chatService.start();
            });

            afterEach(function() {
                chatService.stop();
            });

            it('batchSize and toMessageId yields messages', function() {
                websocketStubber.stubResponse('chat.FetchRoomConversation', {
                    status: 'ok',
                    chatMessages: [{id: '1'}]
                });

                chatService.getMessages('roomId', 1, 'toMessageId', null, function(error, response) {
                    if (response.chatMessages.length > 0) {
                        expect(response.chatMessages[0].id).to.be.equal('1');
                    }
                });
            });

            it('batchSize and fromMessageId yields messages', function() {
                websocketStubber.stubResponse('chat.FetchRoomConversation', {
                    status: 'ok',
                    chatMessages: [{id: '1'}]
                });

                chatService.getMessages('roomId', 1, null, 'fromMessageId', function(error, response) {
                    if (response.chatMessages.length > 0) {
                        expect(response.chatMessages[0].id).to.be.equal('1');
                    }
                });
            });

            it('toMessageId and fromMessageId yields messages', function() {
                websocketStubber.stubResponse('chat.FetchRoomConversation', {
                    status: 'ok',
                    chatMessages: [{id: '1'}]
                });

                chatService.getMessages('roomId', 1, null, 'fromMessageId', function(error, response) {
                    if (response.chatMessages.length > 0) {
                        expect(response.chatMessages[0].id).to.be.equal('1');
                    }
                });
            });

            it('Message lastUpdates are successfully converted from Long', function() {
                websocketStubber.stubResponse('chat.FetchRoomConversation', {
                    status: 'ok',
                    chatMessages: [{
                        id: '1',
                        from: {lastUpdate: Long.fromNumber(1488469432437)}
                    }]
                });

                chatService.getMessages('roomId', 1, 'toMessageId', null, function(error, response) {
                    if (response.chatMessages.length) {
                        expect(response.chatMessages[0].from.lastUpdate).to.be.equal(1488469432437);
                    }
                });
            });

            it('Message timestamps are successfully converted from Long', function() {
                websocketStubber.stubResponse('chat.FetchRoomConversation', {
                    status: 'ok',
                    chatMessages: [{
                        id: '1',
                        timestamp: Long.fromNumber(1488469432437)
                    }]
                });

                chatService.getMessages('roomId', 1, 'toMessageId', null, function(error, response) {
                    if (response.chatMessages.length) {
                        expect(response.chatMessages[0].timestamp).to.be.equal(1488469432437);
                    }
                });
            });
        });

        describe('When PCast SessionId Changes', function() {
            var sessionIdObservable;
            var setTimeoutClone = setTimeout;

            beforeEach(function() {
                window.setTimeout = function(callback, timeout) {
                    return setTimeoutClone(callback, timeout / 100);
                };

                sessionIdObservable = pcast.getProtocol().getObservableSessionId();

                chatService.start();
            });

            afterEach(function() {
                window.setTimeout = setTimeoutClone;
                chatService.stop();
            });

            it('Expect sessionId to not cause fetchRoomMessages for all existing listeners', function(done) {
                var subscribeToConversationSpy = sinon.spy();

                websocketStubber.stubResponse('chat.FetchRoomConversation', response, subscribeToConversationSpy);

                chatService.subscribeAndLoadMessages('roomId', 10, function(){});

                sessionIdObservable.setValue('mockNewSessionId');

                setTimeout(function() {
                    sinon.assert.calledOnce(subscribeToConversationSpy);
                    done();
                }, 500);
            });
        });

        describe('When PCast Status Changes', function() {
            var statusObservable;
            var setTimeoutClone = setTimeout;

            beforeEach(function() {
                window.setTimeout = function(callback, timeout) {
                    return setTimeoutClone(callback, timeout / 100);
                };

                statusObservable = pcast.getObservableStatus();

                chatService.start();
            });

            afterEach(function() {
                window.setTimeout = setTimeoutClone;
                chatService.stop();
            });

            it('Status changed to online causes fetchRoomMessages for no listeners', function(done) {
                var subscribeToConversationSpy = sinon.spy();

                websocketStubber.stubResponse('chat.FetchRoomConversation', response, subscribeToConversationSpy);

                chatService._roomMessagesListeners = {
                    'id1': function() {},
                    'id2': function() {},
                    'id3': function() {}
                };

                statusObservable.setValue('Offline');

                setTimeout(function() {
                    statusObservable.setValue('Online');

                    setTimeout(function() {
                        sinon.assert.notCalled(subscribeToConversationSpy);
                        done();
                    }, 200);
                }, 200);
            });
        });
    });
});