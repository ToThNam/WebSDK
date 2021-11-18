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
    'sdk/room/Stream',
    'sdk/room/room.json',
    'sdk/room/member.json',
    'sdk/room/stream.json',
    'sdk/room/track.json',
    'sdk/streaming/PeerConnectionMonitor'
], function(_, ChannelExpress, AdminApiProxyClient, HttpStubber, WebSocketStubber, ChromeRuntimeStubber, PeerConnectionStubber, Stream, room, member, stream, track, PeerConnectionMonitor) {
    describe('When joining a channel with ExpressRoom that has a presenter', function() {
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
            websocketStubber.stubResponse('chat.JoinRoom', {
                status: 'ok',
                room: {
                    roomId: 'ChannelId',
                    alias: 'ChannelAlias',
                    name: 'ChannelAlias',
                    description: 'Channel',
                    type: room.types.channel.name
                },
                members: [{
                    sessionId: 'ChannelMemberId',
                    screenName: 'ChannelMember',
                    role: member.roles.presenter.name,
                    state: member.states.active.name,
                    streams: [{
                        uri: Stream.getPCastPrefix() + 'streamId',
                        type: stream.types.presentation.name,
                        audioState: track.states.trackEnabled.name,
                        videoState: track.states.trackEnabled.name
                    }],
                    lastUpdate: _.now()
                }]
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

        it('triggers a callback and re-subscribes when the monitor triggers', function(done) {
            var subscribeCount = 0;
            var startClone = PeerConnectionMonitor.prototype.start;

            PeerConnectionMonitor.prototype.start = function(options, activeCallback, monitorCallback) {
                setTimeout(function() {
                    monitorCallback(null, {type: 'client-side-failure'});
                }, 3);
            };

            channelExpress.joinChannel({alias: 'ChannelAlias'}, function() {}, function(error, response) {
                if (response.status === 'ok') {
                    subscribeCount++;
                }

                if (subscribeCount === 2) {
                    PeerConnectionMonitor.prototype.start = startClone;
                    expect(response.status).to.be.equal('ok');
                    expect(subscribeCount).to.be.equal(2);
                    done();
                }
            });
        });

        it('triggers a callback with reason ended when the stream terminated with reason ended', function(done) {
            var subscribeCount = 0;

            channelExpress.joinChannel({alias: 'ChannelAlias'}, function() {}, function(error, response) {
                if (response.status === 'ok') {
                    subscribeCount++;

                    return websocketStubber.stubEvent('pcast.StreamEnded', {
                        streamId: 'mockStreamId',
                        reason: 'ended',
                        sessionId: 'mockSessionId'
                    });
                }

                expect(subscribeCount).to.be.equal(1);
                expect(response.status).to.be.equal('ended');
                done();
            });
        });
    });
});