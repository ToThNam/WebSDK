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
    'sdk/AdminApiProxyClient',
    'sdk/express/RoomExpress',
    '../../../../test/mock/HttpStubber',
    '../../../../test/mock/WebSocketStubber',
    '../../../../test/mock/ChromeRuntimeStubber',
    '../../../../test/mock/PeerConnectionStubber',
    '../../../../test/mock/UserMediaStubber',
    'sdk/room/room.json',
    'sdk/room/member.json',
    'sdk/room/stream.json'
], function(_, AdminApiProxyClient, RoomExpress, HttpStubber, WebSocketStubber, ChromeRuntimeStubber, PeerConnectionStubber, UserMediaStubber, room, member, stream) {
    describe('When Reconnecting to Room Express', function() {
        var mockBackendUri = 'https://mockUri';
        var mockAuthData = {
            name: 'mockUser',
            password: 'somePassword'
        };
        var roomAlias = 'TestRoom123Alias';
        var roomType = room.types.multiPartyChat.name;
        var roomName = 'Test123';

        var mockRoom = {
            roomId: 'TestRoom123',
            alias: roomAlias,
            name: roomName,
            description: 'My Test Room',
            bridgeId: '',
            pin: '',
            type: roomType,
            members: []
        };

        var httpStubber;
        var websocketStubber;
        var chromeRuntimeStubber = new ChromeRuntimeStubber();
        var peerConnectionStubber = new PeerConnectionStubber();
        var roomExpress;
        var roomResponse;

        before(function() {
            chromeRuntimeStubber.stub();
            peerConnectionStubber.stub();
        });

        beforeEach(function(done) {
            httpStubber = new HttpStubber();
            httpStubber.stubAuthRequest();
            httpStubber.stubStreamRequest();

            roomResponse = {
                status: 'ok',
                room: mockRoom,
                members: []
            };

            websocketStubber = new WebSocketStubber();
            websocketStubber.stubAuthRequest();
            websocketStubber.stubResponse('chat.JoinRoom', roomResponse);
            websocketStubber.stubResponse('chat.CreateRoom', roomResponse);

            var adminApiProxyClient = new AdminApiProxyClient();

            adminApiProxyClient.setBackendUri(mockBackendUri);
            adminApiProxyClient.setAuthenticationData(mockAuthData);

            roomExpress = new RoomExpress({
                adminApiProxyClient: adminApiProxyClient,
                uri: 'wss://mockURI'
            });

            websocketStubber.stubSetupStream();

            roomExpress.getPCastExpress().waitForOnline(function() {
                websocketStubber.triggerReconnected();
                done();
            });
        });

        after(function() {
            chromeRuntimeStubber.restore();
            peerConnectionStubber.restore();
        });

        afterEach(function() {
            httpStubber.restore();
            websocketStubber.restore();
            roomExpress.dispose();
        });

        it('successfully publishes to a room', function(done) {
            roomExpress.publishToRoom({
                capabilities: [],
                enableWildcardCapability: true,
                userMediaStream: UserMediaStubber.getMockMediaStream(),
                room: {
                    alias: roomAlias,
                    type: roomType,
                    name: roomName
                },
                streamType: stream.types.user.name,
                memberRole: member.roles.participant.name
            }, function(error, response) {
                expect(response.publisher).to.be.a('object');
                done();
            });
        });

        describe('When auth fails with status unauthorized while in a room and then successfully reconnects with a new session id after getting a new auth token', function() {
            var reauthTokenSpy = null;

            beforeEach(function(done) {
                reauthTokenSpy = sinon.spy();

                roomExpress.publishToRoom({
                    capabilities: [],
                    enableWildcardCapability: true,
                    userMediaStream: UserMediaStubber.getMockMediaStream(),
                    room: {
                        alias: roomAlias,
                        type: roomType,
                        name: roomName
                    },
                    streamType: stream.types.user.name,
                    memberRole: member.roles.participant.name
                }, function(error, response) {
                    expect(response.publisher).to.be.a('object');

                    roomResponse = {
                        status: 'ok',
                        room: mockRoom,
                        members: []
                    };

                    websocketStubber.stubAuthRequestFailure('unauthorized');
                    websocketStubber.stubResponse('chat.JoinRoom', roomResponse);
                    websocketStubber.stubResponse('chat.CreateRoom', roomResponse);
                    httpStubber.stubAuthRequest(function() {
                        websocketStubber.stubAuthRequest('NewSessionId');
                        reauthTokenSpy();
                    });
                    websocketStubber.triggerReconnected();

                    roomExpress.getPCastExpress().waitForOnline(function() {
                        sinon.assert.calledOnce(reauthTokenSpy);
                        expect(response.publisher.isActive()).to.be.true;

                        setTimeout(done, 501);
                    });
                });
            });

            it('successfully publishes to a room', function(done) {
                roomExpress.publishToRoom({
                    capabilities: [],
                    enableWildcardCapability: true,
                    userMediaStream: UserMediaStubber.getMockMediaStream(),
                    room: {
                        alias: roomAlias,
                        type: roomType,
                        name: roomName
                    },
                    streamType: stream.types.user.name,
                    memberRole: member.roles.participant.name
                }, function(error, response) {
                    expect(response.publisher).to.be.a('object');
                    done();
                });
            });
        });
    });
});