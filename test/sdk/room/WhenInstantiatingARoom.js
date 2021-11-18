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
    'sdk/room/RoomService',
    'sdk/room/Room',
    'sdk/room/room.json',
    'sdk/room/member.json',
    'sdk/room/stream.json',
    'sdk/room/track.json'
], function(RoomService, Room, room, member, stream, track) {
    describe('When instantiating a Room', function() {
        var testRoom;
        var member1;
        var stubRoomService;

        var mockTrack = {enabled: track.states.trackEnabled.name};
        var stream1 = {
            type: stream.types.user.name,
            uri: '',
            audioState: track.states.trackEnabled.name,
            videoState: track.states.trackEnabled.name,
            getTracks: function() {
                return [mockTrack];
            }
        };

        beforeEach(function() {
            stubRoomService = new sinon.createStubInstance(RoomService);

            member1 = {
                state: member.states.passive.name,
                sessionId: 'member1',
                role: member.roles.participant.name,
                streams: [stream1],
                lastUpdate: 123,
                screenName: 'first'
            };
            testRoom = new Room(stubRoomService, 'asd', 'User', 'MyRoom', 'My Mutli Party Chat', room.types.multiPartyChat.name, [member1], 'bridgeId', 'pin');
        });

        it('Has property toJson that is a function', function() {
            expect(testRoom.toJson).to.be.a('function');
        });

        it('InValid type results in error', function() {
            expect(function() {
                testRoom.getObservableType().setValue('off');
            }).to.throw(Error);
        });

        it('Valid type results in change of state', function() {
            testRoom.getObservableType().subscribe(function(state) {
                expect(state).to.be.equal(room.types.moderatedChat.name);
            });

            testRoom.getObservableType().setValue(room.types.moderatedChat.name);
        });

        it('Valid type enum results in change of state', function() {
            testRoom.getObservableType().subscribe(function(state) {
                expect(state).to.be.equal(room.types.moderatedChat.name);
            });

            testRoom.getObservableType().setValue(room.types.moderatedChat.id);
        });

        it('InValid type enum results in error', function() {
            expect(function() {
                testRoom.getObservableType().setValue(8);
            }).to.throw(Error);
        });

        describe('When updating room', function() {
            var roomResponse;

            beforeEach(function() {
                roomResponse = {};
            });

            it('New roomId value updated', function() {
                roomResponse.roomId = 'NewId';
                testRoom._update(roomResponse);

                expect(testRoom.getRoomId()).to.be.equal('NewId');
            });

            it('New alias value updated', function() {
                roomResponse.alias = 'NewAlias';
                testRoom._update(roomResponse);

                expect(testRoom.getObservableAlias().getValue()).to.be.equal('NewAlias');
            });

            it('New name value updated', function() {
                roomResponse.name = 'NewName';
                testRoom._update(roomResponse);

                expect(testRoom.getObservableName().getValue()).to.be.equal('NewName');
            });

            it('New description value updated', function() {
                roomResponse.description = 'NewDescription';
                testRoom._update(roomResponse);

                expect(testRoom.getObservableDescription().getValue()).to.be.equal('NewDescription');
            });

            it('New type value updated', function() {
                roomResponse.type = room.types.moderatedChat.name;
                testRoom._update(roomResponse);

                expect(testRoom.getObservableType().getValue()).to.be.equal(room.types.moderatedChat.name);
            });

            it('New bridgeId value updated', function() {
                roomResponse.bridgeId = 'NewBridgeId';
                testRoom._update(roomResponse);

                expect(testRoom.getObservableBridgeId().getValue()).to.be.equal('NewBridgeId');
            });

            it('New pin value updated', function() {
                roomResponse.pin = 'NewPin';
                testRoom._update(roomResponse);

                expect(testRoom.getObservablePin().getValue()).to.be.equal('NewPin');
            });
        });

        describe('When committing changes on member', function() {
            it('CommitChanges calls roomService updateMember', function() {
                stubRoomService.updateRoom.restore();
                stubRoomService.updateRoom = sinon.stub(stubRoomService, 'updateRoom').callsFake(function(room) {
                    expect(room).to.be.equal(testRoom);
                });

                testRoom.commitChanges(function() {});

                sinon.assert.calledOnce(stubRoomService.updateRoom);
            });
        });

        describe('When reverting changes on room', function() {
            it('Reload calls roomService updateRoom', function() {
                stubRoomService.revertRoomChanges.restore();
                stubRoomService.revertRoomChanges = sinon.stub(stubRoomService, 'revertRoomChanges').callsFake(function(room) {
                    expect(room).to.be.equal(testRoom);
                });

                testRoom.reload(function() {});

                sinon.assert.calledOnce(stubRoomService.revertRoomChanges);
            });
        });

        describe('When modifying room members', function() {
            it('Remove successfully removes member when latestUpdate is the same as cached members latestUpdate', function() {
                testRoom._removeMembers([member1]);

                expect(testRoom.getObservableMembers().getValue().length).to.be.equal(0);
            });

            it('Remove does not remove member when latestUpdate is less than cached members latestUpdate', function() {
                member1.lastUpdate = 120;
                testRoom._removeMembers([member1]);

                expect(testRoom.getObservableMembers().getValue().length).to.be.equal(1);
            });

            it('Remove does not remove member when sessionId does not match cached members sessionId', function() {
                member1.sessionId = 'member2';
                testRoom._removeMembers([member1]);

                expect(testRoom.getObservableMembers().getValue().length).to.be.equal(1);
            });

            it('Add Members successfully adds a member to the room', function() {
                member1.sessionId = 'member2';
                testRoom._addMembers([member1]);

                expect(testRoom.getObservableMembers().getValue().length).to.be.equal(2);
            });

            it('Update Members successfully updates cached members in the room', function() {
                member1.lastUpdate = 125;
                testRoom._updateMembers([member1]);

                expect(testRoom.getObservableMembers().getValue()[0].getObservableLastUpdate().getValue()).to.be.equal(125);
            });
        });
    });
});