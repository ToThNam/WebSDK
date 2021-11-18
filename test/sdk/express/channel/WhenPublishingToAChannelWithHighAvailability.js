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
    'sdk/express/ChannelExpress',
    'sdk/AdminApiProxyClient',
    'sdk/room/Stream',
    '../../../../test/mock/HttpStubber',
    '../../../../test/mock/WebSocketStubber',
    '../../../../test/mock/ChromeRuntimeStubber',
    '../../../../test/mock/PeerConnectionStubber',
    '../../../../test/mock/UserMediaStubber',
    'sdk/room/room.json',
    'sdk/room/member.json',
    'sdk/room/stream.json',
    'sdk/room/track.json'
], function(_, ChannelExpress, AdminApiProxyClient, Stream, HttpStubber, WebSocketStubber, ChromeRuntimeStubber, PeerConnectionStubber, UserMediaStubber, room, member, stream, track) {
    describe('When publishing to a channel with high availability', function() {
        var mockBackendUri = 'https://mockUri';
        var mockAuthData = {
            name: 'mockUser',
            password: 'somePassword'
        };
        var roomId = 'TestRoom123';
        var roomAlias = 'TestRoom123Alias';
        var roomType = room.types.channel.name;
        var roomName = 'Test123';

        var mockRoom = {
            roomId: roomId,
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
        var channelExpress;
        var response;

        before(function() {
            chromeRuntimeStubber.stub();
            peerConnectionStubber.stub();
        });

        beforeEach(function() {
            httpStubber = new HttpStubber();
            httpStubber.stubAuthRequest();

            response = {
                status: 'ok',
                room: mockRoom,
                members: []
            };

            websocketStubber = new WebSocketStubber();
            websocketStubber.stubAuthRequest();
            websocketStubber.stubResponse('chat.JoinRoom', response);
            websocketStubber.stubResponse('chat.CreateRoom', response);

            var adminApiProxyClient = new AdminApiProxyClient();

            adminApiProxyClient.setBackendUri(mockBackendUri);
            adminApiProxyClient.setAuthenticationData(mockAuthData);
            channelExpress = new ChannelExpress({
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
            channelExpress.dispose();
        });

        it('has method publishToChannel', function() {
            expect(channelExpress.publishToChannel).to.be.a('function');
        });

        it('creates a viewer token with no alternateOriginStreamIds when no other members are present', function(done) {
            httpStubber.stubStreamRequest(function(request, streamInfo) {
                if (streamInfo.originStreamId) {
                    expect(streamInfo.alternateOriginStreamIds).to.be.undefined;
                    done();
                }
            });

            channelExpress.publishToChannel({
                capabilities: [],
                enableWildcardCapability: true,
                userMediaStream: UserMediaStubber.getMockMediaStream(),
                room: {
                    alias: roomAlias,
                    type: roomType,
                    name: roomName
                },
                streamType: stream.types.user.name,
                memberRole: member.roles.participant.name,
                viewerStreamSelectionStrategy: 'high-availability',
                screenName: 'primary'
            }, function() {});
        });

        it('creates a viewer token with one alternateOriginStreamIds when one other similar members are present', function(done) {
            var stream1 = {
                type: stream.types.user.name,
                uri: Stream.getPCastPrefix() + 'Stream1',
                audioState: track.states.trackEnabled.name,
                videoState: track.states.trackEnabled.name
            };
            var member1 = {
                state: member.states.passive.name,
                sessionId: 'member1',
                role: member.roles.participant.name,
                streams: [stream1],
                lastUpdate: 123,
                screenName: 'primary1'
            };

            mockRoom.members = [member1];
            response.members = [member1];

            httpStubber.stubStreamRequest(function(request, streamInfo) {
                if (streamInfo.originStreamId && !_.includes(streamInfo.capabilities, 'broadcast')) {
                    expect(streamInfo.alternateOriginStreamIds).to.be.a('array');
                    expect(streamInfo.alternateOriginStreamIds.length).to.be.equal(1);
                    expect(streamInfo.alternateOriginStreamIds[0]).to.be.equal('Stream1');
                    done();
                }
            });

            channelExpress.publishToChannel({
                capabilities: [],
                enableWildcardCapability: true,
                userMediaStream: UserMediaStubber.getMockMediaStream(),
                room: {
                    alias: roomAlias,
                    type: roomType,
                    name: roomName
                },
                streamType: stream.types.user.name,
                memberRole: member.roles.participant.name,
                viewerStreamSelectionStrategy: 'high-availability',
                screenName: 'primary2'
            }, function() {});
        });

        it('creates a viewer token with one alternateOriginStreamIds when a similar member joins', function(done) {
            var createViewerTokenCount = 0;

            httpStubber.stubStreamRequest(function(request, streamInfo) {
                if (streamInfo.originStreamId && !_.includes(streamInfo.capabilities, 'broadcast')) {
                    createViewerTokenCount++;
                }

                if (createViewerTokenCount === 1) {
                    setTimeout(function() {
                        websocketStubber.stubEvent('chat.RoomEvent', {
                            eventType: room.events.memberJoined.name,
                            roomId: roomId,
                            members: [member1]
                        });
                    }, 10);
                }

                if (createViewerTokenCount === 2) {
                    expect(streamInfo.alternateOriginStreamIds).to.be.a('array');
                    expect(streamInfo.alternateOriginStreamIds.length).to.be.equal(1);
                    expect(streamInfo.alternateOriginStreamIds[0]).to.be.equal('Stream1');
                    done();
                }
            });

            var stream1 = {
                type: stream.types.user.name,
                uri: Stream.getPCastPrefix() + 'Stream1',
                audioState: track.states.trackEnabled.name,
                videoState: track.states.trackEnabled.name
            };
            var member1 = {
                state: member.states.passive.name,
                sessionId: 'member1',
                role: member.roles.participant.name,
                streams: [stream1],
                lastUpdate: 123,
                screenName: 'primary1'
            };

            channelExpress.publishToChannel({
                capabilities: [],
                enableWildcardCapability: true,
                userMediaStream: UserMediaStubber.getMockMediaStream(),
                room: {
                    alias: roomAlias,
                    type: roomType,
                    name: roomName
                },
                streamType: stream.types.user.name,
                memberRole: member.roles.participant.name,
                viewerStreamSelectionStrategy: 'high-availability',
                screenName: 'primary'
            }, function() {});
        });
    });
});