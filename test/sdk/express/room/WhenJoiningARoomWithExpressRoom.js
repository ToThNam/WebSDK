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
    'sdk/room/room.json',
    'sdk/room/member.json',
    'sdk/room/stream.json',
    'sdk/room/track.json'
], function(_, AdminApiProxyClient, RoomExpress, HttpStubber, WebSocketStubber, room, member, stream, track) {
    describe('When Joining a Room with ExpressRoom', function() {
        var mockBackendUri = 'https://mockUri';
        var mockAuthData = {
            name: 'mockUser',
            password: 'somePassword'
        };
        var mockRoom = {
            roomId: 'TestRoom123',
            alias: 'TestRoom123Alias',
            name: 'Test123',
            description: 'My Test Room',
            bridgeId: '',
            pin: '',
            type: room.types.multiPartyChat.name,
            members: []
        };

        var httpStubber;
        var websocketStubber;
        var roomExpress;
        var response;

        beforeEach(function(done) {
            var adminApiProxyClient = new AdminApiProxyClient();

            adminApiProxyClient.setBackendUri(mockBackendUri);
            adminApiProxyClient.setAuthenticationData(mockAuthData);
            httpStubber = new HttpStubber();
            httpStubber.stubAuthRequest();
            httpStubber.stubStreamRequest();

            websocketStubber = new WebSocketStubber();
            websocketStubber.stubAuthRequest();

            roomExpress = new RoomExpress({adminApiProxyClient: adminApiProxyClient});

            response = {
                status: 'ok',
                room: mockRoom,
                members: []
            };

            websocketStubber.stubResponse('chat.JoinRoom', response);

            roomExpress.getPCastExpress().waitForOnline(done);
        });

        afterEach(function() {
            httpStubber.restore();
            websocketStubber.restore();
            roomExpress.dispose();
        });

        it('has method joinRoom', function() {
            expect(roomExpress.joinRoom).to.be.a('function');
        });

        it('successfully calls joinRoom protocol with just room id and no alias', function() {
            websocketStubber.stubResponse('chat.JoinRoom', response, function(type, message) {
                expect(message.roomId).to.be.equal(mockRoom.roomId);
            });

            roomExpress.joinRoom({
                roomId: mockRoom.roomId,
                role: member.roles.participant.name
            }, function() {}, function(){});
        });

        it('successfully calls joinRoom protocol with just alias and no room id', function() {
            websocketStubber.stubResponse('chat.JoinRoom', response, function(type, message) {
                expect(message.alias).to.be.equal(mockRoom.alias);
            });

            roomExpress.joinRoom({
                alias: mockRoom.alias,
                role: member.roles.participant.name
            }, function() {}, function(){});
        });

        it('throws an error when joinRoom called without alias or roomId arguments', function() {
            websocketStubber.stubResponse('chat.JoinRoom', response, function(type, message) {
                expect(message.alias).to.be.equal(mockRoom.alias);
            });

            expect(function() {
                roomExpress.joinRoom({role: member.roles.participant.name}, function() {}, function(){});
            }).to.throw(Error);
        });

        it('returns response object with a roomService and active room from joinRoom callback', function() {
            roomExpress.joinRoom({
                role: member.roles.participant.name,
                alias: 'roomAlias'
            }, function(error, response) {
                expect(response.roomService).to.exist;
                expect(response.roomService.getObservableActiveRoom().getValue()).to.exist;
            }, function(){});
        });

        it('triggers member subscription callback when members changed after successfully joining a room', function(done) {
            roomExpress.joinRoom({
                role: member.roles.participant.name,
                alias: 'roomAlias'
            }, function(error, response) {
                response.roomService.getObservableActiveRoom().getValue().getObservableMembers().setValue([{}]);
            }, function(members){
                expect(members.length).to.be.equal(1);

                done();
            });
        });

        it('has a member stream that has all the URI params to the stream available as info', function(done) {
            var infoKey1 = 'infoKey1';
            var infoValue1 = 'infoValue1';
            var infoKey2 = 'infoKey2';
            var infoValue2 = 'infoValue2';
            var stream1 = {
                type: stream.types.user.name,
                uri: 'Stream1?' + infoKey1 + '=' + infoValue1 + '&' + infoKey2 + '=' + infoValue2,
                audioState: track.states.trackEnabled.name,
                videoState: track.states.trackEnabled.name
            };
            var member1 = {
                state: member.states.passive.name,
                sessionId: 'member1',
                role: member.roles.participant.name,
                streams: [stream1],
                lastUpdate: 123,
                screenName: 'first'
            };

            mockRoom.members = [member1];
            response.members = [member1];

            roomExpress.joinRoom({
                role: member.roles.participant.name,
                alias: 'roomAlias'
            }, function() {}, function(members){
                expect(members.length).to.be.equal(1);

                var memberStreamInfo = members[0].getObservableStreams().getValue()[0].getInfo();

                expect(memberStreamInfo).to.be.a('object');
                expect(memberStreamInfo[infoKey1]).to.be.equal(infoValue1);
                expect(memberStreamInfo[infoKey2]).to.be.equal(infoValue2);
                done();
            });
        });
    });
});