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
    describe('When publishing to a room', function() {
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
        var response;

        before(function() {
            chromeRuntimeStubber.stub();
            peerConnectionStubber.stub();
        });

        beforeEach(function() {
            var adminApiProxyClient = new AdminApiProxyClient();

            adminApiProxyClient.setBackendUri(mockBackendUri);
            adminApiProxyClient.setAuthenticationData(mockAuthData);

            httpStubber = new HttpStubber();
            httpStubber.stubAuthRequest();
            httpStubber.stubStreamRequest();

            response = {
                status: 'ok',
                room: mockRoom,
                members: []
            };

            websocketStubber = new WebSocketStubber();
            websocketStubber.stubAuthRequest();
            websocketStubber.stubUpdateMemberResponse();
            websocketStubber.stubResponse('chat.JoinRoom', response);
            websocketStubber.stubResponse('chat.CreateRoom', response);

            roomExpress = new RoomExpress({
                adminApiProxyClient: adminApiProxyClient,
                uri: 'wss://mockURI'
            });

            websocketStubber.stubSetupStream();
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

        it('has method publishToRoom', function() {
            expect(roomExpress.publishToRoom).to.be.a('function');
        });

        it('returns publisher from publishToRoom callback', function(done) {
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
                if (response.status !== 'ok') {
                    return;
                }

                expect(response.publisher).to.be.a('object');
                expect(response.roomService).to.be.a('object');
                done();
            });
        });

        it('returns remote publisher from publishToRoom callback', function(done) {
            roomExpress.publishToRoom({
                capabilities: [],
                enableWildcardCapability: true,
                streamUri: 'streamUri',
                room: {
                    alias: roomAlias,
                    type: roomType,
                    name: roomName
                },
                streamType: stream.types.user.name,
                memberRole: member.roles.participant.name
            }, function(error, response) {
                if (response.status !== 'ok') {
                    return;
                }

                expect(response.publisher).to.be.a('object');
                expect(response.roomService).to.be.null;
                done();
            });
        });

        it('results in new member with the same stream info as passed argument', function(done) {
            var infoKey1 = 'infoKey1';
            var infoValue1 = 'infoValue1';
            var infoKey2 = 'infoKey2';
            var infoValue2 = 'infoValue2';
            var streamInfo = {};

            streamInfo[infoKey1] = infoValue1;
            streamInfo[infoKey2] = infoValue2;

            websocketStubber.stubJoinRoomResponse(response.room, response.members);

            roomExpress.publishToRoom({
                capabilities: [],
                enableWildcardCapability: true,
                userMediaStream: UserMediaStubber.getMockMediaStream(),
                streamInfo: streamInfo,
                room: {
                    alias: roomAlias,
                    type: roomType,
                    name: roomName
                },
                streamType: stream.types.user.name,
                memberRole: member.roles.participant.name
            }, function() {});

            roomExpress.joinRoom({
                role: member.roles.participant.name,
                alias: roomAlias,
                name: roomName
            }, function() {}, function(members){
                if (members.length === 0) {
                    return;
                }

                expect(members.length).to.be.equal(1);

                var memberStreamInfo = members[0].getObservableStreams().getValue()[0].getInfo();
                expect(memberStreamInfo[infoKey1]).to.be.equal(infoValue1);
                expect(memberStreamInfo[infoKey2]).to.be.equal(infoValue2);
                expect(memberStreamInfo.streamToken).to.be.a('string');
                done();
            });
        });

        it('results in new member with real-time streamToken if no capability passed in', function(done) {
            websocketStubber.stubJoinRoomResponse(response.room, response.members);

            roomExpress.publishToRoom({
                capabilities: ['streaming'],
                enableWildcardCapability: true,
                userMediaStream: UserMediaStubber.getMockMediaStream(),
                room: {
                    alias: roomAlias,
                    type: roomType,
                    name: roomName
                },
                streamType: stream.types.user.name,
                memberRole: member.roles.participant.name
            }, function() {});

            roomExpress.joinRoom({
                role: member.roles.participant.name,
                alias: roomAlias,
                name: roomName
            }, function() {}, function(members){
                if (members.length === 0) {
                    return;
                }

                expect(members.length).to.be.equal(1);

                var memberStreamInfo = members[0].getObservableStreams().getValue()[0].getInfo();

                expect(memberStreamInfo.streamToken).to.be.a('string');
                done();
            });
        });

        it('results in new member with streaming and real-time streamToken if streaming capability passed in', function(done) {
            websocketStubber.stubJoinRoomResponse(response.room, response.members);

            roomExpress.publishToRoom({
                capabilities: ['streaming'],
                enableWildcardCapability: true,
                userMediaStream: UserMediaStubber.getMockMediaStream(),
                room: {
                    alias: roomAlias,
                    type: roomType,
                    name: roomName
                },
                streamType: stream.types.user.name,
                memberRole: member.roles.participant.name
            }, function() {});

            roomExpress.joinRoom({
                role: member.roles.participant.name,
                alias: roomAlias,
                name: roomName
            }, function() {}, function(members){
                if (members.length === 0) {
                    return;
                }

                expect(members.length).to.be.equal(1);

                var memberStreamInfo = members[0].getObservableStreams().getValue()[0].getInfo();

                expect(memberStreamInfo.streamToken).to.be.a('string');
                expect(memberStreamInfo.streamTokenForLiveStream).to.be.a('string');
                done();
            });
        });
    });
});