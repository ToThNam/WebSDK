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
    'sdk/room/room.json',
    'sdk/room/member.json'
], function(_, ChannelExpress, AdminApiProxyClient, HttpStubber, WebSocketStubber, ChromeRuntimeStubber, PeerConnectionStubber, room, member) {
    describe('When using two ChannelExpress instances', function() {
        var mockBackendUri = 'https://mockUri';
        var mockAuthData = {
            name: 'mockUser',
            password: 'somePassword'
        };
        var mockRoom = {
            roomId: 'ChannelId',
            alias: 'ChannelAlias',
            name: 'ChannelAlias',
            description: 'Channel',
            bridgeId: '',
            pin: '',
            type: room.types.channel.name,
            members: []
        };

        var httpStubber;
        var websocketStubber;
        var chromeRuntimeStubber = new ChromeRuntimeStubber();
        var peerConnectionStubber = new PeerConnectionStubber();
        var channelExpressPublisher;
        var channelExpressSubscriber;

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
                room: mockRoom
            });
            websocketStubber.stubResponse('chat.JoinRoom', {
                status: 'ok',
                room: mockRoom,
                members: []
            });

            var adminApiProxyClient = new AdminApiProxyClient();

            adminApiProxyClient.setBackendUri(mockBackendUri);
            adminApiProxyClient.setAuthenticationData(mockAuthData);

            channelExpressPublisher = new ChannelExpress({
                adminApiProxyClient: adminApiProxyClient,
                uri: 'wss://mockURI'
            });
            channelExpressSubscriber = new ChannelExpress({
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
            channelExpressPublisher.dispose();
            channelExpressSubscriber.dispose();
        });

        it('successfully publishes to a channel then joins in another', function(done) {
            channelExpressPublisher.publishToChannel({
                capabilities: [],
                enableWildcardCapability: true,
                room: {
                    alias: 'ChannelAlias',
                    name: 'Channel'
                },
                streamUri: 'StreamUri'
            }, function() {
                channelExpressSubscriber.joinChannel({
                    role: member.roles.participant.name,
                    alias: 'ChannelAlias'
                }, _.noop, function(error, response){
                    expect(response.status).to.be.equal('no-stream-playing');

                    done();
                });
            });
        });

        it('successfully joins a channel then publishes to another', function(done) {
            var responseCount = 0;

            channelExpressSubscriber.joinChannel({
                role: member.roles.participant.name,
                alias: 'ChannelAlias'
            }, _.noop, function(){
                channelExpressPublisher.publishToChannel({
                    capabilities: [],
                    enableWildcardCapability: true,
                    room: {
                        alias: 'ChannelAlias',
                        name: 'Channel'
                    },
                    streamUri: 'StreamUri'
                }, function(error, response) {
                    responseCount++;

                    if (responseCount === 1) {
                        expect(response.status).to.be.equal('ok');

                        done();
                    }
                });
            });
        });
    });
});