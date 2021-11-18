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
    'sdk/room/ChannelService',
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
], function(_, PCast, RoomService, ChannelService, Room, ImmutableRoom, Member, room, member, stream, track, HttpStubber, WebSocketStubber, ChromeRuntimeStubber) {
    var pcast;
    var roomService;
    var channelService;
    var response;
    var self;
    var httpStubber;
    var websocketStubber;
    var chromeRuntimeStubber = new ChromeRuntimeStubber();

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
    var channelId = '';
    var alias = 'RoomAlias';
    var role = member.roles.presenter.name;

    describe('When creating a ChannelService', function() {
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

            pcast.start('AuthToken', _.noop, function onlineCallback() {
                roomService = new RoomService(pcast);
                channelService = new ChannelService(roomService);
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

        afterEach(function() {
            httpStubber.restore();
            websocketStubber.restore();

            if (channelService) {
                channelService.stop();
            }

            if (roomService) {
                roomService.stop();
            }

            pcast.stop();

            self.sessionId = 'MockSessionId';
        });

        it('Has property createRoom that is a function', function() {
            expect(channelService.createChannel).to.be.a('function');
        });

        it('Has property enterRoom that is a function', function() {
            expect(channelService.enterChannel).to.be.a('function');
        });

        it('Has property leaveRoom that is a function', function() {
            expect(channelService.leaveChannel).to.be.a('function');
        });

        it('Channel is successfully initialized on init', function() {
            channelService.start(role, screenName);

            expect(channelService.getSelf()).to.be.ok;
        });

        describe('When Channel does not exist', function() {
            it('Returns no chatService', function() {
                var chatService = channelService.getChatService();

                expect(chatService).to.be.null;
            });

            it('Expect getRoomInfo to return a status other than "ok" and no room object', function() {
                response.status = 'no-room';

                websocketStubber.stubResponse('chat.GetRoomInfo', response);

                channelService.getChannelInfo('', 'alias', function(error, response) {
                    expect(response.channel).to.be.not.ok;
                    expect(response.status).to.not.be.equal('ok');
                });
            });

            it('Expect created room to be an immutable room', function() {
                channelService.start(role, screenName);

                channelService.createChannel(mockRoom, function(error, response) {
                    expect(response.channel).to.be.an('object');
                    expect(response.status).to.be.equal('ok');
                }, screenName);
            });

            it('Expect enter room callback to return null for room and status', function() {
                response.status = 'Error: room does not exist';
                websocketStubber.stubResponse('chat.JoinRoom', response);

                channelService.start(role, screenName);

                channelService.enterChannel(channelId, alias, function(error, response) {
                    expect(response.status).to.not.be.equal('ok');
                    expect(response.channel).to.be.not.ok;
                });
            });
        });

        describe('When Channel does exist', function() {
            it('Returns channel on getRoomInfo', function() {
                response.status = 'ok';
                websocketStubber.stubResponse('chat.GetRoomInfo', response);

                channelService.getChannelInfo('', alias, function(error, response) {
                    expect(response.channel).to.be.an('object');
                    expect(response.status).to.be.equal('ok');
                });
            });

            it('Return new Channel model with response.channel values', function() {
                channelService.start(role, screenName);

                channelService.enterChannel(channelId, alias, function(error, response) {
                    expect(response.channel.getChannelId()).to.be.equal(mockRoom.roomId);
                });
            });

            describe('When already in channel', function() {
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

                    channelService.start(role, screenName);

                    channelService.enterChannel(channelId, alias, function() {
                        done();
                    });
                });

                it('Success on leaveRoom', function() {
                    channelService.leaveChannel(function(error, response) {
                        expect(response.status).to.be.equal('ok');
                    });
                });

                it('Self is the same in members list', function() {
                    var channelSelf = channelService.getSelf();
                    var channel = channelService.getObservableActiveChannel().getValue();
                    var memberListSelf = channel.getObservableMembers().getValue()[2];

                    expect(channelSelf).to.be.equal(memberListSelf);
                });
            });
        });
    });
});