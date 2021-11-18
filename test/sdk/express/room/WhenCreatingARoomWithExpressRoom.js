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
    'sdk/express/RoomExpress',
    'sdk/AdminApiProxyClient',
    '../../../../test/mock/HttpStubber',
    '../../../../test/mock/WebSocketStubber',
    'sdk/room/room.json'
], function(_, RoomExpress, AdminApiProxyClient, HttpStubber, WebSocketStubber, room) {
    describe('When Creating a Room with ExpressRoom', function() {
        var mockBackendUri = 'https://mockUri';
        var mockAuthData = {
            name: 'mockUser',
            password: 'somePassword'
        };
        var mockRoom = {
            roomId: 'TestRoom123',
            alias: '',
            name: 'Test123',
            description: 'Room Description',
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
            httpStubber = new HttpStubber();
            httpStubber.stubAuthRequest();
            httpStubber.stubStreamRequest();

            websocketStubber = new WebSocketStubber();
            websocketStubber.stubAuthRequest();

            var adminApiProxyClient = new AdminApiProxyClient();

            adminApiProxyClient.setBackendUri(mockBackendUri);
            adminApiProxyClient.setAuthenticationData(mockAuthData);
            roomExpress = new RoomExpress({
                adminApiProxyClient: adminApiProxyClient,
                authenticationData: mockAuthData
            });

            response = {
                status: 'ok',
                room: mockRoom,
                members: []
            };

            websocketStubber.stubResponse('chat.CreateRoom', response);

            roomExpress.getPCastExpress().waitForOnline(done);
        });

        afterEach(function() {
            httpStubber.restore();
            websocketStubber.restore();
            roomExpress.dispose();
        });

        it('Has method createRoom', function() {
            expect(roomExpress.createRoom).to.be.a('function');
        });

        it('Expect createRoom protocol to be called with required values', function(done) {
            websocketStubber.stubResponse('chat.CreateRoom', response, function(type, message) {
                expect(message.room.name).to.be.equal(mockRoom.name);
                expect(message.room.type).to.be.equal(mockRoom.type);
                expect(message.room.description).to.not.be.empty;
                done();
            });

            roomExpress.createRoom({room: mockRoom}, function() {});
        });

        it('Expect createRoom protocol to be called with default description value', function(done) {
            var roomToCreate = _.assign({}, mockRoom, {description: ''});

            websocketStubber.stubResponse('chat.CreateRoom', roomToCreate, function(type, message) {
                expect(message.room.description).to.be.equal('Multi Party Chat');
                done();
            });

            roomExpress.createRoom({room: roomToCreate}, function() {});
        });

        it('Expect room to be returned from createRoom', function(done) {
            websocketStubber.stubResponse('chat.CreateRoom', {
                status: 'ok',
                room: mockRoom
            });

            roomExpress.createRoom({room: mockRoom}, function(error, response) {
                expect(response.room).to.exist;
                done();
            });
        });
    });
});