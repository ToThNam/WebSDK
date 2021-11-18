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
    '../../../../test/mock/HttpStubber',
    '../../../../test/mock/WebSocketStubber',
    'sdk/room/room.json',
    'sdk/room/member.json'
], function(_, RoomExpress, HttpStubber, WebSocketStubber, room, member) {
    describe('When Sending Multiple Messages', function() {
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
            httpStubber = new HttpStubber();
            httpStubber.stubAuthRequest();
            httpStubber.stubStreamRequest();

            websocketStubber = new WebSocketStubber();
            websocketStubber.stubAuthRequest();

            roomExpress = new RoomExpress({authToken: 'DIGEST:eyJhcHBsaWNhdGlvbklkIjoiZGVtbyIsImRpZ2VzdCI6IjZ3ODQ3S3N2ZFh5WjhRNnlyNWNzMnh0YjMxdFQ0TFR3bHAyeUZyZ0t2K0pDUEJyYkI4Qnd5a3dyT2NIWE52OXQ5eU5qYkFNT2tuQ1N1VnE5eGdBZjdRPT0iLCJ0b2tlbiI6IntcImV4cGlyZXNcIjoxOTI5NjA5NjcwMjI1LFwiY2FwYWJpbGl0aWVzXCI6W1wiYXVkaW8tb25seVwiXSxcInJlcXVpcmVkVGFnXCI6XCJyb29tSWQ6ZXVyb3BlLWNlbnRyYWwjZGVtbyNtdWx0aXBhcnR5Q2hhdERlbW9Sb29tLlpwcWJKNG1Oa2g2dVwifSJ9'});

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

        it('only has one listener for room events when creating and then joining a room', function(done) {
            websocketStubber.stubResponse('chat.CreateRoom', response);
            websocketStubber.stubResponse('chat.JoinRoom', response);

            roomExpress.createRoom({room: mockRoom}, function(error, createRoomResponse) {
                roomExpress.joinRoom({
                    roomId: mockRoom.roomId,
                    role: member.roles.participant.name
                }, function(error, response) {
                    expect(createRoomResponse.roomService).to.not.exist;
                    expect(response.roomService).to.exist;
                    expect(websocketStubber.getNumberOfListeners('chat.RoomEvent')).to.be.equal(1);
                    done();
                }, function(){});
            });
        });

        it('has two listeners for room events when joining two different rooms', function(done) {
            websocketStubber.stubResponse('chat.JoinRoom', response);

            roomExpress.joinRoom({
                roomId: mockRoom.roomId,
                role: member.roles.participant.name
            }, function() {
                response.room.roomId = 'DifferentRoomId';

                websocketStubber.stubResponse('chat.JoinRoom', response);

                roomExpress.joinRoom({
                    roomId: response.room.roomId,
                    role: member.roles.participant.name
                }, function() {
                    expect(websocketStubber.getNumberOfListeners('chat.RoomEvent')).to.be.equal(2);
                    done();
                }, function(){});
            }, function(){});
        });

        it('has one listeners for room events when joining the same room twice', function(done) {
            websocketStubber.stubResponse('chat.JoinRoom', response);

            roomExpress.joinRoom({
                roomId: mockRoom.roomId,
                role: member.roles.participant.name
            }, function() {
                roomExpress.joinRoom({
                    roomId: mockRoom.roomId,
                    role: member.roles.participant.name
                }, function() {
                    expect(websocketStubber.getNumberOfListeners('chat.RoomEvent')).to.be.equal(1);
                    done();
                }, function(){});
            }, function(){});
        });
    });
});