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
    'sdk/PCast',
    'sdk/room/RoomService',
    'sdk/room/Room',
    'sdk/room/ImmutableRoom',
    'sdk/room/Member',
    'sdk/room/room.json',
    'sdk/room/member.json',
    'sdk/room/stream.json',
    'sdk/room/track.json',
    '../../../test/mock/HttpStubber',
    '../../../test/mock/WebSocketStubber',
    '../../../test/mock/ChromeRuntimeStubber'
], function(_, PCast, RoomService, Room, ImmutableRoom, Member, room, member, stream, track, HttpStubber, WebSocketStubber, ChromeRuntimeStubber) {
    var pcast;
    var roomService;
    var response;
    var self;
    var httpStubber;
    var websocketStubber;
    var chromeRuntimeStubber = new ChromeRuntimeStubber();
    var sessionId;

    var mockTrack = {
        enabled: 'true',
        state: track.states.trackEnabled.name
    };
    var stream1 = {
        type: stream.types.user.name,
        uri: 'Stream1',
        audioState: track.states.trackEnabled.name,
        videoState: track.states.trackEnabled.name,
        getTracks: function() {
            return [mockTrack];
        }
    };
    var member1 = {
        state: member.states.passive.name,
        sessionId: 'member1',
        role: member.roles.participant.name,
        streams: [stream1],
        lastUpdate: 123,
        screenName: 'first'
    };
    var mockRoom = {
        roomId: 'TestRoom123',
        alias: '',
        name: 'Test123',
        description: 'Test 123',
        bridgeId: '',
        pin: '',
        type: room.types.multiPartyChat.name,
        getRoomId: function() {
            return room.roomId;
        },
        members: [member1]
    };

    var screenName = 'MyRoom';
    var roomId = '';
    var alias = 'RoomAlias';
    var role = member.roles.presenter.name;

    describe('When instantiating a RoomService', function() {
        before(function() {
            chromeRuntimeStubber.stub();
        });

        beforeEach(function(done) {
            httpStubber = new HttpStubber();
            httpStubber.stub();

            websocketStubber = new WebSocketStubber();
            websocketStubber.stubAuthRequest();

            self = {
                state: member.states.passive.name,
                sessionId: 'MockSessionId',
                role: member.roles.participant.name,
                streams: [stream1],
                lastUpdate: 123,
                screenName: 'self'
            };

            pcast = new PCast();

            pcast.start('AuthToken', function(pcast, status, authSessionId) {
                sessionId = authSessionId;
            }, function onlineCallback() {
                roomService = new RoomService(pcast);
                done();
            }, function offlineCallback() {});

            response = {
                status: 'ok',
                room: mockRoom,
                members: [member1, self]
            };

            websocketStubber.stubResponse('chat.JoinRoom', response);
            websocketStubber.stubResponse('chat.LeaveRoom', response);
            websocketStubber.stubResponse('chat.CreateRoom', response);
            websocketStubber.stubResponse('chat.UpdateMember', response);
            websocketStubber.stubResponse('chat.UpdateRoom', response);
        });

        after(function() {
            chromeRuntimeStubber.restore();
        });

        function cleanUp() {
            httpStubber.restore();
            websocketStubber.restore();

            if (roomService) {
                roomService.stop();
            }

            pcast.stop();

            self.sessionId = 'MockSessionId';
        }

        afterEach(function() {
            cleanUp();
        });

        it('Has property createRoom that is a function', function() {
            expect(roomService.createRoom).to.be.a('function');
        });

        it('Has property enterRoom that is a function', function() {
            expect(roomService.enterRoom).to.be.a('function');
        });

        it('Has property leaveRoom that is a function', function() {
            expect(roomService.leaveRoom).to.be.a('function');
        });

        it('Room is successfully initialized on init', function() {
            roomService.start(role, screenName);

            expect(roomService._self).to.be.a('object');
        });

        context('Given the room does not exist', function() {
            it('Returns no roomChatService', function() {
                var roomChatService = roomService.getChatService();

                expect(roomChatService).to.be.null;
            });

            it('Expect getRoomInfo to return a status other than "ok" and no room object', function() {
                response.status = 'no-room';

                websocketStubber.stubResponse('chat.GetRoomInfo', response);

                roomService.getRoomInfo('', 'alias', function(error, response) {
                    expect(response.room).to.be.not.ok;
                    expect(response.status).to.not.be.equal('ok');
                });
            });

            it('Expect getRoomInfo to return an error when error returned from protocol', function() {
                websocketStubber.stubResponseError('chat.GetRoomInfo', new Error('Error'));

                roomService.getRoomInfo('', 'alias', function(error, response) {
                    expect(response).to.be.not.ok;
                    expect(error).to.be.ok;
                });
            });

            it('Expect created room to be an immutable room', function() {
                roomService.start(role, screenName);

                roomService.createRoom(mockRoom, function(error, response) {
                    expect(response.room).to.be.an.instanceof(ImmutableRoom);
                    expect(response.status).to.be.equal('ok');
                }, screenName);
            });

            it('Expect room to be undefined when protocol returns error status', function() {
                response.status = 'error';
                response.reason = 'Error creating room';

                websocketStubber.stubResponse('chat.CreateRoom', response);

                roomService.start(role, screenName);

                roomService.createRoom(mockRoom, function(error, response) {
                    expect(response.status).to.not.be.equal('ok');
                    expect(response.room).to.be.not.ok;
                }, screenName);
            });

            it('Expect createRoom to return an error when error returned from protocol', function() {
                websocketStubber.stubResponseError('chat.CreateRoom', new Error('Error'));

                roomService.createRoom(mockRoom, function(error, response) {
                    expect(response).to.be.not.ok;
                    expect(error).to.be.ok;
                });
            });

            it('Expect enter room callback to return null for room and status', function() {
                response.status = 'Error: room does not exist';
                websocketStubber.stubResponse('chat.JoinRoom', response);

                roomService.start(role, screenName);

                roomService.enterRoom(roomId, alias, function(error, response) {
                    expect(response.status).to.not.be.equal('ok');
                    expect(response.room).to.be.not.ok;
                });
            });

            it('Expect enterRoom to return an error when error returned from protocol', function() {
                websocketStubber.stubResponseError('chat.JoinRoom', new Error('Error'));

                roomService.start(role, screenName);

                roomService.enterRoom(roomId, alias, function(error, response) {
                    expect(response).to.be.not.ok;
                    expect(error).to.be.ok;
                });
            });

            it('Expect status to not be equal to ok', function() {
                response.status = 'Error: room does not exist';
                websocketStubber.stubResponse('chat.LeaveRoom', response);

                roomService.start(role, screenName);

                roomService.enterRoom('', alias, function() {
                    roomService.leaveRoom(function(error, response) {
                        expect(response.status).to.not.be.equal('ok');
                    });
                });
            });

            it('Expect leaveRoom to return an error when error returned from protocol', function() {
                websocketStubber.stubResponseError('chat.LeaveRoom', new Error('Error'));

                roomService.start(role, screenName);

                roomService.enterRoom('', alias, function() {
                    roomService.leaveRoom(function(error, response) {
                        expect(response).to.be.not.ok;
                        expect(error).to.be.ok;
                    }, false);
                });
            });
        });

        context('Given the room does exist', function() {
            it('Returns an immutable room on getRoomInfo', function() {
                response.status = 'ok';
                websocketStubber.stubResponse('chat.GetRoomInfo', response);

                roomService.getRoomInfo('', alias, function(error, response) {
                    expect(response.room).to.be.an.instanceof(ImmutableRoom);
                    expect(response.status).to.be.equal('ok');
                });
            });

            it('Expect createRoom to return status other than "ok"', function() {
                response.status = 'already-exists';
                websocketStubber.stubResponse('chat.CreateRoom', response);

                roomService.start(role, screenName);

                roomService.createRoom(mockRoom, function(error, response) {
                    expect(response.status).to.not.be.equal('ok');
                });
            });

            it('Expect createRoom to have all valid values (no members, and no roomId) passed to protocol', function() {
                var roomToCreate = _.assign({}, mockRoom, {invalidProp: 'myInvalidValue'});

                websocketStubber.stubResponse('chat.CreateRoom', response, function(type, message) {
                    var room = message.room;

                    expect(room.roomId).to.be.empty;
                    expect(room.alias).to.be.equal(roomToCreate.alias);
                    expect(room.roomType).to.be.equal(roomToCreate.roomType);
                    expect(room.name).to.be.equal(roomToCreate.name);
                    expect(room.description).to.be.equal(roomToCreate.description);
                    expect(room.bridgeId).to.be.equal(roomToCreate.bridgeId);
                    expect(room.pin).to.be.equal(roomToCreate.pin);
                    expect(room.members).to.not.exist;
                    expect(room.invalidProp).to.not.exist;
                });

                roomService.start(role, screenName);

                roomService.createRoom(roomToCreate, function() {});
            });

            it('Return new Room model with response.room values', function() {
                roomService.start(role, screenName);

                roomService.enterRoom(roomId, alias, function(error, response) {
                    expect(response.room.getRoomId()).to.be.equal(mockRoom.roomId);
                    expect(roomService._cachedRoom.getValue()).to.not.be.equal(null);
                });
            });

            it('Self in enterRoomRequest should have all values', function() {
                websocketStubber.stubResponse('chat.JoinRoom', response, function(type, message) {
                    var selfForRequest = message.member;

                    expect(selfForRequest.sessionId).to.be.a('string');
                    expect(selfForRequest.screenName).to.be.a('string');
                    expect(selfForRequest.role).to.be.a('string');
                    expect(selfForRequest.state).to.be.a('string');
                    expect(selfForRequest.streams).to.be.a('array');
                    expect(selfForRequest.lastUpdate).to.be.a('number');
                });

                roomService.start(role, screenName);

                roomService.enterRoom(roomId, alias, function(error, response) {
                    expect(response.room.getRoomId()).to.be.equal(mockRoom.roomId);
                    expect(roomService._cachedRoom.getValue()).to.not.be.equal(null);
                });
            });

            it('Self not returned from Enter Room does not throw error.', function() {
                websocketStubber.stubResponse('chat.JoinRoom', {
                    status: 'ok',
                    room: mockRoom,
                    members: [member1]
                });

                roomService.start(role, screenName);

                roomService.enterRoom(roomId, alias, function(error, response) {
                    expect(error).to.not.exist;
                    expect(response.status).to.be.equal('ok');
                });
            });

            context('Given member is already in room', function() {
                var member2 = {
                    state: member.states.passive.name,
                    sessionId: 'member2',
                    role: member.roles.participant.name,
                    streams: [stream1],
                    lastUpdate: 123,
                    screenName: 'second'
                };

                beforeEach(function(done) {
                    response.members = [member1, member2, self];
                    response.room.members = [member1, member2, self];

                    roomService.start(role, screenName);

                    roomService.enterRoom(roomId, alias, function() {
                        done();
                    });
                });

                it('Success on leaveRoom', function() {
                    roomService.leaveRoom(function(error, response) {
                        expect(response.status).to.be.equal('ok');
                    });
                });

                it('Self is the same in members list', function() {
                    var roomSelf = roomService.getSelf();
                    var room = roomService.getObservableActiveRoom().getValue();
                    var memberListSelf = room.getObservableMembers().getValue()[2];

                    expect(roomSelf).to.be.equal(memberListSelf);
                });

                describe('When onRoomEvent occurs', function() {
                    it('MemberJoined event adds member to room', function() {
                        var member3 = {
                            state: member.states.passive.name,
                            sessionId: 'member3',
                            role: member.roles.participant.name,
                            streams: [stream1],
                            lastUpdate: 123,
                            screenName: 'third'
                        };

                        websocketStubber.stubEvent('chat.RoomEvent', {
                            eventType: room.events.memberJoined.name,
                            roomId: 'TestRoom123',
                            members: [member1, member2, member3]
                        });

                        var currentRoom = roomService.getObservableActiveRoom().getValue();

                        expect(currentRoom.getObservableMembers().getValue()).to.have.lengthOf(4);
                    });

                    it('Self joined has self instance in room with updated values', function() {
                        var member3 = {
                            state: member.states.passive.name,
                            sessionId: self.sessionId,
                            role: member.roles.participant.name,
                            streams: [stream1],
                            lastUpdate: 123,
                            screenName: 'third'
                        };

                        websocketStubber.stubEvent('chat.RoomEvent', {
                            eventType: room.events.memberJoined.name,
                            roomId: 'TestRoom123',
                            members: [member1, member2, member3]
                        });

                        var currentRoom = roomService.getObservableActiveRoom().getValue();
                        var observableSelf = _.find(currentRoom.getObservableMembers().getValue(), function(member) {
                            return member.getSessionId() === self.sessionId;
                        });

                        expect(observableSelf).to.exist;
                        expect(observableSelf).to.be.equal(roomService.getSelf());
                        expect(roomService.getSelf().getObservableScreenName().getValue()).to.be.equal('third');
                    });

                    it('MemberLeft event handled removes member from room', function() {
                        websocketStubber.stubEvent('chat.RoomEvent', {
                            eventType: room.events.memberLeft.name,
                            roomId: 'TestRoom123',
                            members: [member2]
                        });

                        var currentRoom = roomService.getObservableActiveRoom().getValue();

                        expect(currentRoom.getObservableMembers().getValue()).to.have.lengthOf(2);
                    });

                    it('MemberLeft event for self removes member from room', function() {
                        websocketStubber.stubEvent('chat.RoomEvent', {
                            eventType: room.events.memberLeft.name,
                            roomId: 'TestRoom123',
                            members: [self]
                        });

                        var currentRoom = roomService.getObservableActiveRoom().getValue();

                        expect(currentRoom.getObservableMembers().getValue()).to.have.lengthOf(2);
                    });

                    it('MemberUpdated event updates room member screenName', function() {
                        var updatedMember2 = {
                            state: member.states.passive.name,
                            sessionId: 'member2',
                            screenName: 'James',
                            role: member.roles.participant.name,
                            streams: [stream1],
                            lastUpdate: 125
                        };

                        websocketStubber.stubEvent('chat.RoomEvent', {
                            eventType: room.events.memberUpdated.name,
                            roomId: 'TestRoom123',
                            members: [updatedMember2]
                        });

                        var currentRoom = roomService.getObservableActiveRoom().getValue();
                        var updatedMemberModel = _.find(currentRoom.getObservableMembers().getValue(), function(member) {
                            return member.getSessionId() === 'member2';
                        });

                        expect(updatedMemberModel._screenName.getValue()).to.be.equal('James');
                    });

                    it('MemberUpdated event with new screen name does not override other local changes to member', function() {
                        var updatedMember2 = {
                            state: member.states.passive.name,
                            sessionId: 'member2',
                            screenName: 'James',
                            role: member.roles.participant.name,
                            streams: [stream1],
                            lastUpdate: 125
                        };

                        var currentRoom = roomService.getObservableActiveRoom().getValue();
                        var updatedMemberModel = _.find(currentRoom.getObservableMembers().getValue(), function(member) {
                            return member.getSessionId() === 'member2';
                        });
                        var observableState = updatedMemberModel.getObservableState();

                        observableState.setValue(member.states.active.name);

                        websocketStubber.stubEvent('chat.RoomEvent', {
                            eventType: room.events.memberUpdated.name,
                            roomId: 'TestRoom123',
                            members: [updatedMember2]
                        });

                        expect(updatedMemberModel.getObservableScreenName().getValue()).to.be.equal('James');
                        expect(updatedMemberModel.getObservableState().getValue()).to.be.equal(member.states.active.name);
                    });

                    it('MemberUpdated event updates self screenName', function() {
                        var newSelf = {
                            state: member.states.passive.name,
                            sessionId: sessionId,
                            screenName: 'NewScreenName',
                            role: member.roles.participant.name,
                            streams: [stream1],
                            lastUpdate: 125
                        };

                        websocketStubber.stubEvent('chat.RoomEvent', {
                            eventType: room.events.memberUpdated.name,
                            roomId: 'TestRoom123',
                            members: [newSelf]
                        });

                        var self = roomService.getSelf();

                        expect(self._screenName.getValue()).to.be.equal('NewScreenName');
                    });

                    it('Updated (room) event updates room name', function() {
                        var updatedRoom = {
                            roomId: 'TestRoom123',
                            alias: '',
                            name: 'TestRoom',
                            description: '',
                            bridgeId: '',
                            pin: '',
                            type: ''
                        };

                        websocketStubber.stubEvent('chat.RoomEvent', {
                            eventType: room.events.roomUpdated.name,
                            roomId: 'TestRoom123',
                            room: updatedRoom,
                            members: [member1, member2]
                        });

                        var currentRoom = roomService.getObservableActiveRoom().getValue();

                        expect(currentRoom._name.getValue()).to.be.equal('TestRoom');
                    });

                    it('DISABLED: Ended (room) event handled successfully', function() {
                        cleanUp();
                        this.skip();

                        websocketStubber.stubEvent('chat.RoomEvent', {
                            eventType: room.events.roomEnded.name,
                            roomId: 'TestRoom123',
                            room: mockRoom,
                            members: [member1, member2]
                        });

                        var currentRoom = roomService.getObservableActiveRoom().getValue();

                        expect(currentRoom._name.getValue()).to.be.equal('TestRoom');
                    });
                });

                describe('When Member Updated (memberUpdate) triggered', function() {
                    var publishedStream1 = {
                        type: 'User',
                        uri: 'Stream1',
                        audioState: track.states.trackEnabled.name,
                        videoState: track.states.trackEnabled.name
                    };
                    var publishedStream2 = {
                        type: 'User',
                        uri: 'Stream2',
                        audioState: track.states.trackEnabled.name,
                        videoState: track.states.trackEnabled.name
                    };
                    var self;

                    beforeEach(function() {
                        self = roomService.getSelf();

                        self.setStreams([publishedStream1]);
                    });

                    it('Published Streams updated with 2 streams results in request with 2 streams', function(done) {
                        websocketStubber.stubResponse('chat.UpdateMember', response, function(type, message) {
                            var memberToUpdate = message.member;

                            expect(memberToUpdate).to.have.property('streams');
                            expect(memberToUpdate.streams).to.have.lengthOf(2);
                            done();
                        });

                        var publishedStreams = self.getStreams();

                        publishedStreams.push(publishedStream2);

                        expect(publishedStreams).to.have.lengthOf(2);

                        self.setStreams(publishedStreams);

                        roomService.updateSelf(function() {});
                    });

                    it('Published Streams updated with no streams results in request with no streams', function(done) {
                        websocketStubber.stubResponse('chat.UpdateMember', response, function(type, message) {
                            var memberToUpdate = message.member;

                            expect(memberToUpdate.streams).to.have.lengthOf(0);
                            done();
                        });

                        self.setStreams([]);

                        roomService.updateSelf(function() {});
                    });

                    it('Screen Name Updated results in request with updated screen name', function(done) {
                        websocketStubber.stubResponse('chat.UpdateMember', response, function(type, message) {
                            var memberToUpdate = message.member;

                            expect(memberToUpdate.screenName).to.be.equal('MyNewScreenName');
                            done();
                        });

                        var screenNameObs = self.getObservableScreenName();

                        screenNameObs.setValue('MyNewScreenName');

                        roomService.updateSelf(function() {});
                    });

                    it('Screen Name Updated does not include state property when state has not changed', function(done) {
                        websocketStubber.stubResponse('chat.UpdateMember', response, function(type, message) {
                            var memberToUpdate = message.member;

                            expect(memberToUpdate.state).to.be.undefined;
                            done();
                        });

                        var screenNameObs = self.getObservableScreenName();

                        screenNameObs.setValue('MyNewScreenName');

                        roomService.updateSelf(function() {});
                    });

                    it('Role Updated results in request with updated role when valid role passed in', function(done) {
                        websocketStubber.stubResponse('chat.UpdateMember', response, function(type, message) {
                            var memberToUpdate = message.member;

                            expect(memberToUpdate.role).to.be.equal(member.roles.presenter.name);
                            done();
                        });

                        var roleObs = self.getObservableRole();

                        roleObs.setValue(member.roles.presenter.name);

                        roomService.updateSelf(function() {});
                    });

                    it('Role Updated results in exception when invalid role passed in', function() {
                        var stateObs = self.getObservableRole();

                        expect(function() {
                            stateObs.setValue('MasterOfNone');

                            roomService.updateSelf(function() {});
                        }).to.throw(Error);
                    });
                });

                describe('When reverting changes on member', function() {
                    it('Changes to member screenName are reverted successfully to cached value', function() {
                        var room = roomService.getObservableActiveRoom().getValue();
                        var cachedRoom = roomService._cachedRoom.getValue();

                        var member = room.getObservableMembers().getValue()[0];
                        var cachedMember = cachedRoom.getObservableMembers().getValue()[0];

                        member.getObservableScreenName().setValue('newScreenName');

                        roomService.revertMemberChanges(member);

                        expect(member.getObservableScreenName().getValue()).to.be.equal(cachedMember.getObservableScreenName().getValue());
                    });
                });

                describe('When Updating Room', function() {
                    var room;

                    beforeEach(function() {
                        room = roomService.getObservableActiveRoom().getValue();
                    });

                    it('Update description yields change in description value on cached room', function(done) {
                        websocketStubber.stubResponse('chat.UpdateRoom', response, function(type, message) {
                            var roomToUpdate = message.room;

                            expect(roomToUpdate.description).to.be.equal('newDescription');
                            done();
                        });

                        var descriptionObs = room.getObservableDescription();

                        descriptionObs.setValue('newDescription');
                        response.room.description = 'newDescription';

                        roomService.updateRoom(function() {});
                    });
                });

                describe('When reverting Room Changes', function() {
                    var room;

                    beforeEach(function() {
                        room = roomService.getObservableActiveRoom().getValue();
                    });

                    it('Changes to description are reverted to cached value', function() {
                        var descriptionObs = room.getObservableDescription();

                        descriptionObs.setValue('newDescription');

                        roomService.revertRoomChanges();

                        expect(descriptionObs.getValue()).to.be.equal(mockRoom.description);
                    });
                });

                describe('When Streams updated', function() {
                    it('Role Updated results in request with updated role when valid role passed in', function(done) {
                        websocketStubber.stubResponse('chat.UpdateMember', response, function(type, message) {
                            var memberToUpdate = message.member;

                            expect(memberToUpdate.role).to.be.equal(member.roles.presenter.name);
                            done();
                        });

                        var roleObs = roomService.getSelf().getObservableRole();

                        roleObs.setValue(member.roles.presenter.name);

                        roomService.updateSelf(function() {});
                    });
                });

                describe('When Session Id updated', function() {
                    // TODO This is not desired b/c to get a new session ID one gets disconnected first
                    it.skip('Session Id update causes member to leave and then enter room', function(done) {
                        var leaveRoomSpy = sinon.spy();
                        websocketStubber.stubResponse('chat.LeaveRoom', {status: 'ok'}, leaveRoomSpy);
                        websocketStubber.stubResponse('chat.JoinRoom', response, function() {
                            sinon.assert.calledOnce(leaveRoomSpy);
                            done();
                        });

                        response.members[2].sessionId = 'NewSessionId';
                        response.room.members[2].sessionId = 'NewSessionId';

                        pcast.getProtocol().getObservableSessionId().setValue('NewSessionId');
                    });
                });
            });
        });
    });
});