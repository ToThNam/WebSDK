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
    '../../../../test/mock/HttpStubber',
    '../../../../test/mock/WebSocketStubber',
    '../../../../test/mock/ChromeRuntimeStubber',
    '../../../../test/mock/PeerConnectionStubber',
    '../../../../test/mock/UserMediaStubber',
    'sdk/room/room.json',
    'sdk/room/member.json',
    'sdk/room/stream.json'
], function(_, ChannelExpress, AdminApiProxyClient, HttpStubber, WebSocketStubber, ChromeRuntimeStubber, PeerConnectionStubber, UserMediaStubber, room, member, stream) {
    describe('When publishing to a channel with ExpressRoom', function() {
        var mockBackendUri = 'https://mockUri';
        var mockAuthData = {
            name: 'mockUser',
            password: 'somePassword'
        };

        var httpStubber;
        var websocketStubber;
        var chromeRuntimeStubber = new ChromeRuntimeStubber();
        var peerConnectionStubber = new PeerConnectionStubber();
        var channelExpress;

        before(function() {
            chromeRuntimeStubber.stub();
            peerConnectionStubber.stub();
        });

        beforeEach(function() {
            httpStubber = new HttpStubber();
            httpStubber.stubAuthRequest();
            httpStubber.stubStreamRequest();

            websocketStubber = new WebSocketStubber();
            websocketStubber.stubAuthRequest();

            websocketStubber.stubSetupStream();
            websocketStubber.stubResponse('chat.CreateRoom', {
                status: 'ok',
                room: {
                    roomId: 'ChannelId',
                    alias: 'ChannelAlias',
                    name: 'ChannelAlias',
                    description: 'Channel',
                    type: room.types.channel.name
                }
            });

            var adminApiProxyClient = new AdminApiProxyClient();

            adminApiProxyClient.setBackendUri(mockBackendUri);
            adminApiProxyClient.setAuthenticationData(mockAuthData);
            channelExpress = new ChannelExpress({
                adminApiProxyClient: adminApiProxyClient,
                uri: 'wss://mockURI'
            });
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

        it('returns a publisher and no channelService when publishing remotely', function(done) {
            channelExpress.publishToChannel({
                capabilities: [],
                enableWildcardCapability: true,
                room: {
                    alias: 'ChannelAlias',
                    name: 'Channel'
                },
                streamUri: 'StreamUri'
            }, function(error, response) {
                if (response.status !== 'ok') {
                    return;
                }

                expect(response.publisher, 'publisher').to.be.an('object');
                expect(response.channelService, 'channelService').to.be.null;
                done();
            });
        });

        it('returns a publisher and a channelService when publishing locally', function(done) {
            var mockRoom = {
                roomId: 'TestRoom123',
                alias: 'ChannelAlias',
                name: 'Channel',
                description: 'My Test Room',
                bridgeId: '',
                pin: '',
                type: room.types.channel.name,
                members: []
            };
            var response = {
                status: 'ok',
                room: mockRoom,
                members: []
            };

            websocketStubber.stubJoinRoomResponse(response.room, response.members);

            channelExpress.publishToChannel({
                capabilities: [],
                enableWildcardCapability: true,
                userMediaStream: UserMediaStubber.getMockMediaStream(),
                streamType: stream.types.user.name,
                memberRole: member.roles.participant.name,
                room: {
                    alias: 'ChannelAlias',
                    name: 'Channel'
                }
            }, function(error, response) {
                if (response.status !== 'ok') {
                    return;
                }

                expect(error).to.not.exist;
                expect(response.status).to.be.equal('ok');
                expect(response.publisher, 'publisher').to.be.an('object');
                expect(response.channelService, 'channelService').to.be.an('object');
                done();
            });
        });

        it('Expect stream ended reason of censored to trigger a callback and not re-publish', function(done) {
            var publishCount = 0;

            channelExpress.publishToChannel({
                capabilities: [],
                enableWildcardCapability: true,
                room: {
                    alias: 'ChannelAlias',
                    name: 'Channel'
                },
                streamUri: 'StreamUri'
            }, function(error, response) {
                if (response.status === 'ok') {
                    expect(response.publisher).to.be.an('object');

                    publishCount++;

                    if (publishCount === 1) {
                        return websocketStubber.stubEvent('pcast.StreamEnded', {
                            streamId: 'mockStreamId',
                            reason: 'censored',
                            sessionId: 'mockSessionId'
                        });
                    }
                }

                expect(publishCount).to.be.equal(1);
                expect(response.status).to.be.equal('censored');
                done();
            });
        });

        it('Expect stream ended reason of ended to trigger callback with reason ended', function(done) {
            var publishCount = 0;

            channelExpress.publishToChannel({
                capabilities: [],
                enableWildcardCapability: true,
                room: {
                    alias: 'ChannelAlias',
                    name: 'Channel'
                },
                streamUri: 'StreamUri'
            }, function(error, response) {
                if (response.status === 'ok') {
                    publishCount++;

                    if (publishCount === 1) {
                        return websocketStubber.stubEvent('pcast.StreamEnded', {
                            streamId: 'mockStreamId',
                            reason: 'ended',
                            sessionId: 'mockSessionId'
                        });
                    }
                }

                expect(response.status).to.be.equal('ended');
                expect(response.reason).to.be.equal('ended');
                done();
            });
        });
    });
});