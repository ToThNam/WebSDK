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
    describe('When joining a channel with high availability stream selection strategy', function() {
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

        beforeEach(function() {
            chromeRuntimeStubber.stub();
            peerConnectionStubber.stub();
        });

        afterEach(function() {
            chromeRuntimeStubber.restore();
            peerConnectionStubber.restore();
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
                uri: 'wss://mockURI',
                onlineTimeout: 600000
            });
        });

        afterEach(function() {
            httpStubber.restore();
            websocketStubber.restore();
            channelExpress.dispose();
        });

        function createMember(type, suffix) {
            var stream = _.assign({}, streamModel, {uri: pcastPrefix + 'stream' + type + suffix});

            return _.assign({}, memberModel, {
                screenName: type + suffix,
                streams: [stream]
            });
        }

        function parseStreamIdFromUri(uri) {
            return uri.substring(pcastPrefix.length, uri.length);
        }

        it('upon failure iterates through each member in order from primary to alternate to anything else', function(done) {
            var subscribeCount = 0;
            var primaryMember = createMember('primary', '1');
            var alternateMember = createMember('alternate', '1');
            var normalMember = createMember('', '1');

            joinRoomResponse.members = [normalMember, primaryMember, alternateMember];

            httpStubber.stubStreamRequest(function(request, body) {
                switch (subscribeCount) {
                case 0:
                    return expect(body.originStreamId).to.be.equal(parseStreamIdFromUri(primaryMember.streams[0].uri));
                case 1:
                    return expect(body.originStreamId).to.be.equal(parseStreamIdFromUri(alternateMember.streams[0].uri));
                case 2:
                    return expect(body.originStreamId).to.be.equal(parseStreamIdFromUri(normalMember.streams[0].uri));
                default:
                    return;
                }
            });

            channelExpress.joinChannel({
                alias: 'ChannelAlias',
                streamSelectionStrategy: 'high-availability'
            }, function() {}, function() {
                subscribeCount++;

                if (subscribeCount > 0 && subscribeCount < 4) {
                    return websocketStubber.stubEvent('pcast.StreamEnded', {
                        streamId: 'mockStreamId',
                        reason: 'ended',
                        sessionId: 'mockSessionId'
                    });
                }

                if (subscribeCount >= 4) {
                    done();
                }
            });
        });

        it('upon failure iterates through each primary member before iterating through alternates', function(done) {
            var subscribeCount = 0;
            var primaryMember1 = createMember('primary', '1');
            var primaryMember2 = createMember('primary', '2');
            var alternateMember = createMember('alternate', '1');

            joinRoomResponse.members = [primaryMember2, alternateMember, primaryMember1];

            httpStubber.stubStreamRequest(function(request, body) {
                switch (subscribeCount) {
                case 0:
                    return expect(_.includes(body.originStreamId, 'primary')).to.be.true;
                case 1:
                    return expect(_.includes(body.originStreamId, 'primary')).to.be.true;
                case 2:
                    return expect(body.originStreamId).to.be.equal(parseStreamIdFromUri(alternateMember.streams[0].uri));
                default:
                    return;
                }
            });

            channelExpress.joinChannel({
                alias: 'ChannelAlias',
                streamSelectionStrategy: 'high-availability'
            }, function() {}, function() {
                subscribeCount++;

                if (subscribeCount >= 1 && subscribeCount < 4) {
                    return websocketStubber.stubEvent('pcast.StreamEnded', {
                        streamId: 'mockStreamId',
                        reason: 'ended',
                        sessionId: 'mockSessionId'
                    });
                }

                if (subscribeCount >= 4) {
                    done();
                }
            });
        });

        it('upon failure iterates through each primary member even with the same screen name and different sessionIds and streamIds', function(done) {
            var subscribeCount = 0;
            var primaryMember1 = createMember('primary', '1');
            var primaryMember2 = createMember('primary', '2');

            primaryMember2.sessionId = 'DifferentSessionId';
            primaryMember2.screenName = primaryMember1.screenName;

            joinRoomResponse.members = [primaryMember2, primaryMember1];

            httpStubber.stubStreamRequest(function(request, body) {
                switch (subscribeCount) {
                case 0:
                    return expect(_.includes(body.originStreamId, 'primary')).to.be.true;
                case 1:
                    return expect(_.includes(body.originStreamId, 'primary')).to.be.true;
                default:
                    return;
                }
            });

            channelExpress.joinChannel({
                alias: 'ChannelAlias',
                streamSelectionStrategy: 'high-availability'
            }, function() {}, function() {
                subscribeCount++;

                if (subscribeCount >= 1 && subscribeCount < 3) {
                    return websocketStubber.stubEvent('pcast.StreamEnded', {
                        streamId: 'mockStreamId',
                        reason: 'ended',
                        sessionId: 'mockSessionId'
                    });
                }

                if (subscribeCount >= 3) {
                    done();
                }
            });
        });

        it('does not iterate through members when primary stream ends with reason of app-background', function(done) {
            var subscribeCount = 0;
            var primaryMember = createMember('primary', '1');
            var alternateMember = createMember('alternate', '1');

            joinRoomResponse.members = [primaryMember, alternateMember];

            httpStubber.stubStreamRequest(function(request, body) {
                switch (subscribeCount) {
                case 0:
                    return expect(body.originStreamId).to.be.equal(parseStreamIdFromUri(primaryMember.streams[0].uri));
                default:
                    return;
                }
            });

            channelExpress.joinChannel({
                alias: 'ChannelAlias',
                streamSelectionStrategy: 'high-availability'
            }, function() {}, function(error, response) {
                if (response.status === 'ok') {
                    subscribeCount++;

                    return websocketStubber.stubEvent('pcast.StreamEnded', {
                        streamId: 'mockStreamId',
                        reason: 'app-background',
                        sessionId: 'mockSessionId'
                    });
                }

                expect(response.status).to.be.equal('stream-ended');
                expect(response.reason).to.be.equal('app-background');
                expect(subscribeCount).to.be.equal(1);
                done();
            });
        });

        it('fails if all members trigger more than allowed client side failures', function(done) {
            this.timeout(30000);

            var subscribeCount = 0;
            var primaryMember = createMember('primary', '1');
            var alternateMember = createMember('alternate', '1');
            var timeoutLength = 3 * 60 * 1000;

            var startClone = PeerConnectionMonitor.prototype.start;
            var setTimeoutClone = setTimeout;

            window.setTimeout = function(callback, timeout) {
                return setTimeoutClone(callback, timeout / 100);
            };

            PeerConnectionMonitor.prototype.start = function(options, activeCallback, monitorCallback) {
                setTimeout(function() {
                    monitorCallback(null, {type: 'client-side-failure'});
                }, timeoutLength / 100);
            };

            joinRoomResponse.members = [primaryMember, alternateMember];

            httpStubber.stubStreamRequest();

            channelExpress.joinChannel({
                alias: 'ChannelAlias',
                streamSelectionStrategy: 'high-availability',
                failureCountForBanningAMember: 2
            }, function() {}, function(error, response) {
                if (response.status === 'ok') {
                    return subscribeCount++;
                }

                window.setTimeout = setTimeoutClone;
                PeerConnectionMonitor.prototype.start = startClone;
                expect(response.status).to.be.equal('client-side-failure');
                expect(subscribeCount).to.be.equal(4);
                done();
            });
        });

        it('fails if all members trigger more than the allowed capacity failures', function(done) {
            this.timeout(30000);

            var attemptCount = 0;
            var primaryMember = createMember('primary', '1');
            var alternateMember = createMember('alternate', '1');

            var setTimeoutClone = setTimeout;

            window.setTimeout = function(callback, timeout) {
                return setTimeoutClone(callback, timeout / 100);
            };

            joinRoomResponse.members = [primaryMember, alternateMember];

            httpStubber.stubStreamRequestWithStatus('capacity', function() {
                attemptCount++;
            });

            channelExpress.joinChannel({
                alias: 'ChannelAlias',
                streamSelectionStrategy: 'high-availability',
                banMemberOnCapacityFailureCount: 2
            }, function() {}, function(error, response) {
                window.setTimeout = setTimeoutClone;
                expect(response.status).to.be.equal('capacity');
                expect(attemptCount).to.be.equal(4);
                done();
            });
        });

        it('fails if all members ended', function(done) {
            this.timeout(30000);

            var notificationCount = 0;
            var attemptCount = 0;
            var subscribeCount = 0;
            var primaryMember = createMember('primary', '1');
            var alternateMember = createMember('alternate', '1');

            var setTimeoutClone = setTimeout;

            window.setTimeout = function(callback, timeout) {
                return setTimeoutClone(callback, timeout / 100);
            };

            joinRoomResponse.members = [primaryMember, alternateMember];

            httpStubber.stubStreamRequest(function() {
                attemptCount++;
            });

            channelExpress.joinChannel({
                alias: 'ChannelAlias',
                streamSelectionStrategy: 'high-availability'
            }, function() {}, function(error, response) {
                notificationCount++;

                if (response.status === 'ok') {
                    subscribeCount++;

                    return websocketStubber.stubEvent('pcast.StreamEnded', {
                        streamId: 'mockStreamId',
                        reason: 'ended',
                        sessionId: 'mockSessionId'
                    });
                }

                window.setTimeout = setTimeoutClone;
                expect(response.status).to.be.equal('ended');
                expect(subscribeCount).to.be.equal(attemptCount);
                expect(subscribeCount).to.be.at.most(2);
                expect(notificationCount).to.be.at.most(3);

                if (subscribeCount === 2) {
                    expect(notificationCount).to.be.equal(3);

                    done();
                }
            });
        });
    });
});