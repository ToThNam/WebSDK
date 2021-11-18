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
    'phenix-web-observable',
    'sdk/room/RoomService',
    'sdk/room/Room',
    'sdk/room/Channel',
    'sdk/room/room.json',
    'sdk/room/member.json',
    'sdk/room/stream.json',
    'sdk/room/track.json'
], function(observable, RoomService, Room, Channel, room, member, stream, track) {
    describe('When Creating a Channel', function() {
        var testRoom;
        var testChannel;
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
            testChannel = new Channel(testRoom);
        });

        it('returns json object with same channelId as the room models roomId', function() {
            expect(testChannel.toJson().channelId).to.be.equal(testRoom.getRoomId());
        });

        it('has the same ChannelId as the room models roomId', function() {
            expect(testChannel.getChannelId()).to.be.equal(testRoom.getRoomId());
        });

        it('returns an observable from observable type', function() {
            expect(testChannel.getObservableType().subscribe).to.be.a('function');
        });
    });
});