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
    'sdk/room/ImmutableRoom',
    'sdk/room/room.json',
    'sdk/room/member.json',
    'sdk/room/stream.json',
    'sdk/room/track.json'
], function(RoomService, ImmutableRoom, room, member, stream, track) {
    describe('When Creating An Immutable Room', function() {
        var testRoom;
        var member1;
        var roomService;

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
            member1 = {
                state: member.states.passive.name,
                sessionId: 'member1',
                role: member.roles.participant.name,
                streams: [stream1],
                lastUpdate: 123,
                screenName: 'first'
            };

            roomService = sinon.createStubInstance(RoomService);
            testRoom = new ImmutableRoom(roomService, 'asd', 'User', 'MyRoom', 'Immutable Room', room.types.multiPartyChat.name, [member1], 'bridgeId', 'pin');
        });

        it('Has property toJson that is a function', function() {
            expect(testRoom.toJson).to.be.a('function');
        });

        it('Expect roomId on to be passed roomId value', function() {
            expect(testRoom.getRoomId()).to.be.equal('asd');
        });

        it('Expect setValue on getObservableType to throw error', function() {
            expect(function() {
                testRoom.getObservableType().setValue();
            }).to.throw(Error);
        });

        it('Expect subscribe on getObservableType to throw error', function() {
            expect(function() {
                testRoom.getObservableType().subscribe();
            }).to.throw(Error);
        });

        it('Expect setValue on getObservableAlias to throw error', function() {
            expect(function() {
                testRoom.getObservableAlias().setValue();
            }).to.throw(Error);
        });

        it('Expect setValue on getObservableName to throw error', function() {
            expect(function() {
                testRoom.getObservableName().setValue();
            }).to.throw(Error);
        });

        it('Expect setValue on getObservableDescription to throw error', function() {
            expect(function() {
                testRoom.getObservableDescription().setValue();
            }).to.throw(Error);
        });

        it('Expect setValue on getObservableMembers to throw error', function() {
            expect(function() {
                testRoom.getObservableMembers().setValue();
            }).to.throw(Error);
        });

        it('Expect setValue on getObservableBridgeId to throw error', function() {
            expect(function() {
                testRoom.getObservableBridgeId().setValue();
            }).to.throw(Error);
        });

        it('Expect setValue on getObservablePin to throw error', function() {
            expect(function() {
                testRoom.getObservablePin().setValue();
            }).to.throw(Error);
        });

        it('Expect setValue on commitChanges to throw error', function() {
            expect(function() {
                testRoom.commitChanges();
            }).to.throw(Error);
        });

        it('Expect reload to throw error', function() {
            expect(function() {
                testRoom.reload();
            }).to.throw(Error);
        });

        it('Expect _update to throw error', function() {
            expect(function() {
                testRoom._update();
            }).to.throw(Error);
        });

        it('Expect _addMembers to throw error', function() {
            expect(function() {
                testRoom._addMembers();
            }).to.throw(Error);
        });

        it('Expect _removeMembers to throw error', function() {
            expect(function() {
                testRoom._removeMembers();
            }).to.throw(Error);
        });

        it('Expect _updateMembers to throw error', function() {
            expect(function() {
                testRoom._updateMembers();
            }).to.throw(Error);
        });
        describe('When attempting to update member', function() {
            var member;

            beforeEach(function() {
                member = testRoom.getObservableMembers().getValue()[0];
            });

            it('Expect setValue on getObservableScreenName to throw error', function() {
                expect(function() {
                    member.getObservableScreenName().setValue();
                }).to.throw(Error);
            });

            it('Expect setValue on getObservableRole to throw error', function() {
                expect(function() {
                    member.getObservableRole().setValue();
                }).to.throw(Error);
            });

            it('Expect subscribe on getObservableRole to throw error', function() {
                expect(function() {
                    member.getObservableRole().subscribe();
                }).to.throw(Error);
            });

            describe('When attempting to update stream', function() {
                var stream;

                beforeEach(function() {
                    stream = member.getObservableStreams().getValue()[0];
                });

                it('Expect setValue on getObservableAudioState to throw error', function() {
                    expect(function() {
                        stream.getObservableAudioState().setValue();
                    }).to.throw(Error);
                });

                it('Expect setValue on getObservableVideoState to throw error', function() {
                    expect(function() {
                        stream.getObservableVideoState().setValue();
                    }).to.throw(Error);
                });

                it('Expect subscribe on getObservableVideoState to throw error', function() {
                    expect(function() {
                        stream.getObservableVideoState().subscribe();
                    }).to.throw(Error);
                });
            });
        });
    });
});