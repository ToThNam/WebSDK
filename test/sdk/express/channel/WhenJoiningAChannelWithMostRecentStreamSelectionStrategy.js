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
    'sdk/room/track.json'
], function(_, ChannelExpress, AdminApiProxyClient, HttpStubber, WebSocketStubber, ChromeRuntimeStubber, PeerConnectionStubber, Stream, room, member, stream, track) {
    describe('When joining a channel with most recent stream selection strategy', function() {
        var mockBackendUri = 'https://mockUri';
        var mockAuthData = {
            name: 'mockUser',
            password: 'somePassword'
        };
        var pcastPrefix = Stream.getPCastPrefix();
        var httpStubber;
        var websocketStubber;
        var chromeRuntimeStubber = new ChromeRuntimeStubber();
        var peerConnectionStubber = new PeerConnectionStubber();
        var channelExpress;
        var streamModel = {
            uri: pcastPrefix + 'streamId',
            type: stream.types.presentation.name,
            audioState: track.states.trackEnabled.name,
            videoState: track.states.trackEnabled.name
        };
        var memberModel = {
            sessionId: 'ChannelMemberId',
            screenName: 'ChannelMember',
            role: member.roles.presenter.name,
            state: member.states.active.name,
            streams: [],
            lastUpdate: _.now()
        };
        var joinRoomResponse = {
            status: 'ok',
            room: {
                roomId: 'ChannelId',
                alias: 'ChannelAlias',
                name: 'ChannelAlias',
                description: 'Channel',
                type: room.types.channel.name
            },
            members: []
        };

        before(function() {
            chromeRuntimeStubber.stub();
            peerConnectionStubber.stub();
        });

        beforeEach(function() {
            httpStubber = new HttpStubber();
            httpStubber.stubAuthRequest();

            websocketStubber = new WebSocketStubber();
            websocketStubber.stubAuthRequest();
            websocketStubber.stubResponse('chat.JoinRoom', joinRoomResponse);
            websocketStubber.stubSetupStream();

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

        function createMember(type, suffix, time) {
            var stream = _.assign({}, streamModel, {uri: pcastPrefix + 'stream' + type + suffix});

            return _.assign({}, memberModel, {
                screenName: type + suffix,
                streams: [stream],
                lastUpdate: time
            });
        }

        function parseStreamIdFromUri(uri) {
            return uri.substring(pcastPrefix.length, uri.length);
        }

        it('upon failure iterates through all member and stops once each failed', function(done) {
            var subscribeCount = 0;
            var primaryMember = createMember('primary', '1', _.now());
            var alternateMember = createMember('alternate', '1', _.now() + 2);
            var normalMember = createMember('', '1', _.now() + 3);

            joinRoomResponse.members = [normalMember, primaryMember, alternateMember];

            httpStubber.stubStreamRequest(function(request, body) {
                switch (subscribeCount) {
                case 1:
                    return expect(body.originStreamId).to.be.equal(parseStreamIdFromUri(alternateMember.streams[0].uri));
                default:
                    return;
                }
            });

            channelExpress.joinChannel({
                alias: 'ChannelAlias',
                streamSelectionStrategy: 'most-recent'
            }, function() {}, function(error, response) {
                if (response.status !== 'ok') {
                    expect(response.status).to.be.equal('ended');
                    expect(subscribeCount).to.be.equal(3);

                    done();

                    return;
                }

                subscribeCount++;

                return websocketStubber.stubEvent('pcast.StreamEnded', {
                    streamId: 'mockStreamId',
                    reason: 'ended',
                    sessionId: 'mockSessionId'
                });
            });
        });
    });
});