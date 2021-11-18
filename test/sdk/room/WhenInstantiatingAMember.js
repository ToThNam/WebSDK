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
    'long',
    'sdk/room/Member',
    'sdk/room/member.json',
    'sdk/room/stream.json',
    'sdk/room/track.json'
], function(RoomService, Long, Member, member, stream, track) {
    describe('When instantiating a Member', function() {
        var testMember;
        var stubRoomService;

        var mockTrack = {enabled: 'true'};
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
            stubRoomService = sinon.createStubInstance(RoomService);

            testMember = new Member(stubRoomService, member.states.passive.name, 'member1', 'MyName', member.roles.participant.name, [stream1], 123);
        });

        it('Has property toJson that is a function', function() {
            expect(testMember.toJson).to.be.a('function');
        });

        it('Invalid role results in error', function() {
            expect(function() {
                testMember.getObservableRole().setValue('off');
            }).to.throw(Error);
        });

        it('Valid role results in change of state', function() {
            testMember.getObservableRole().subscribe(function(state) {
                expect(state).to.be.equal(member.roles.moderator.name);
            });

            testMember.getObservableRole().setValue(member.roles.moderator.name);
        });

        it('Valid role enum results in change of state', function() {
            testMember.getObservableRole().subscribe(function(state) {
                expect(state).to.be.equal(member.roles.moderator.name);
            });

            testMember.getObservableRole().setValue(member.roles.moderator.id);
        });

        it('InValid role enum results in error', function() {
            expect(function() {
                testMember.getObservableRole().setValue(8);
            }).to.throw(Error);
        });

        describe('When getting state', function() {
            it('If state is Offline always return Offline', function() {
                testMember.getObservableState().setValue(member.states.offline.name);

                expect(testMember.getObservableState().getValue()).to.be.equal(member.states.offline.name);
            });
        });

        describe('When updating a member', function() {
            var memberResponse;

            beforeEach(function() {
                memberResponse = {};
            });

            it('New roomId value updated', function() {
                memberResponse.state = member.states.active.name;
                testMember._update(memberResponse);

                expect(testMember.getObservableState().getValue()).to.be.equal(member.states.active.name);
            });

            it('New sessionId value not updated', function() {
                memberResponse.sessionId = 'NewSessionId';
                testMember._update(memberResponse);

                expect(testMember.getSessionId()).to.not.be.equal('NewSessionId');
            });

            it('New screenName value updated', function() {
                memberResponse.screenName = 'NewScreenName';
                testMember._update(memberResponse);

                expect(testMember.getObservableScreenName().getValue()).to.be.equal('NewScreenName');
            });

            it('New role value updated', function() {
                memberResponse.role = member.roles.moderator.name;
                testMember._update(memberResponse);

                expect(testMember.getObservableRole().getValue()).to.be.equal(member.roles.moderator.name);
            });

            it('New lastUpdate value updated', function() {
                memberResponse.lastUpdate = 125;
                testMember._update(memberResponse);

                expect(testMember.getLastUpdate()).to.be.equal(125);
            });
        });

        describe('When committing changes on member', function() {
            it('CommitChanges calls roomService updateMember', function() {
                stubRoomService.updateMember.restore();
                stubRoomService.updateMember = sinon.stub(stubRoomService, 'updateMember').callsFake(function(member) {
                    expect(member).to.be.equal(testMember);
                });

                testMember.commitChanges(function() {});

                sinon.assert.calledOnce(stubRoomService.updateMember);
            });
        });

        describe('When reverting changes on member', function() {
            it('Reload calls roomService updateMember', function() {
                stubRoomService.revertMemberChanges.restore();
                stubRoomService.revertMemberChanges = sinon.stub(stubRoomService, 'revertMemberChanges').callsFake(function(member) {
                    expect(member).to.be.equal(testMember);
                });

                testMember.reload(function() {});

                sinon.assert.calledOnce(stubRoomService.revertMemberChanges);
            });
        });

        describe('When modifying member streams', function() {
            it('Get Streams returns an object without observables', function() {
                var streams = testMember.getStreams();

                expect(streams[0].audioState).to.be.equal(track.states.trackEnabled.name);
            });

            it('Set Streams successfully overrides cached members in the room', function() {
                stream1.audioState = track.states.trackDisabled.name;
                testMember.setStreams([stream1]);

                var streams = testMember.getStreams();

                expect(streams[0].audioState).to.be.equal(track.states.trackDisabled.name);
            });
        });

        describe('When modifying LastUpdate', function() {
            var memberResponse;

            beforeEach(function() {
                memberResponse = {};
            });

            it('Should accept Long value', function() {
                var myLong = Long.fromNumber(1488469432437);

                memberResponse.lastUpdate = myLong;
                testMember._update(memberResponse);

                expect(testMember.getLastUpdate()).to.be.equal(1488469432437);
            });

            it('Should accept int value', function() {
                memberResponse.lastUpdate = 1488469432437;
                testMember._update(memberResponse);

                expect(testMember.getLastUpdate()).to.be.equal(1488469432437);
            });

            it('Should accept Long value on constructor', function() {
                var myLong = Long.fromNumber(1488469432437);
                var roomService = stubRoomService;
                var myMember = new Member(roomService, member.states.passive.name, 'member1', 'MyName', member.roles.participant.name, [stream1], myLong);

                expect(myMember.getLastUpdate()).to.be.equal(1488469432437);
            });
        });
    });
});