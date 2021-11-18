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
    'sdk/room/Member',
    'sdk/room/Stream',
    'sdk/room/room.json',
    'sdk/room/member.json',
    'sdk/room/stream.json',
    'sdk/room/track.json'
], function(_, ChannelExpress, AdminApiProxyClient, HttpStubber, WebSocketStubber, Member, Stream, room, member, stream, track) {
    describe('When joining a channel with ExpressRoom', function() {
        var mockBackendUri = 'https://mockUri';
        var mockStreamId = 'mystreamId';
        var mockAuthData = {
            name: 'mockUser',
            password: 'somePassword'
        };
        var mockRoom = {
            roomId: 'TestRoom123',
            alias: 'TestRoom123Alias',
            name: 'Test123',
            description: 'My Test Room',
            bridgeId: '',
            pin: '',
            type: room.types.multiPartyChat.name,
            members: []
        };
        var mockTrack = {enabled: 'true'};
        var mockStream = {
            type: stream.types.user.name,
            uri: Stream.getPCastPrefix() + mockStreamId,
            audioState: track.states.trackEnabled.name,
            videoState: track.states.trackEnabled.name,
            getTracks: function() {
                return [mockTrack];
            },
            getUri: function() {
                return mockStream.uri;
            }
        };
        var mockMediaStream = {
            setStreamEndedCallback: function() {},
            stop: function() {},
            getStream: function() {}
        };
        var noStreamsPlayingStatus = 'no-stream-playing';

        var httpStubber;
        var websocketStubber;
        var channelExpress;
        var response;

        beforeEach(function(done) {
            httpStubber = new HttpStubber();
            httpStubber.stubAuthRequest();
            httpStubber.stubStreamRequest();

            websocketStubber = new WebSocketStubber();
            websocketStubber.stubAuthRequest();

            var adminApiProxyClient = new AdminApiProxyClient();

            adminApiProxyClient.setBackendUri(mockBackendUri);
            adminApiProxyClient.setAuthenticationData(mockAuthData);
            channelExpress = new ChannelExpress({adminApiProxyClient: adminApiProxyClient});

            response = {
                status: 'ok',
                room: mockRoom,
                members: []
            };

            websocketStubber.stubResponse('chat.JoinRoom', response);

            channelExpress.getPCastExpress().waitForOnline(done);
        });

        afterEach(function() {
            httpStubber.restore();
            websocketStubber.restore();
            channelExpress.dispose();
        });

        it('Has method joinRoom', function() {
            expect(channelExpress.joinChannel).to.be.a('function');
        });

        it('Expect joinChannel protocol to be called with just alias and participant member role', function() {
            websocketStubber.stubResponse('chat.JoinRoom', response, function(type, message) {
                expect(message.alias).to.be.equal(mockRoom.alias);
                expect(message.member.role).to.be.equal(member.roles.participant.name);
            });

            channelExpress.joinChannel({
                alias: mockRoom.alias,
                role: member.roles.participant.name
            }, function() {}, function(){});
        });

        it('Expect joinChannel protocol to be called with just alias and default audience role', function() {
            websocketStubber.stubResponse('chat.JoinRoom', response, function(type, message) {
                expect(message.alias).to.be.equal(mockRoom.alias);
                expect(message.member.role).to.be.equal(member.roles.audience.name);
            });

            channelExpress.joinChannel({alias: mockRoom.alias}, function() {}, function(){});
        });

        // Write member joined logic -
        it('Expect joinChannel members subscription event with presenter with no streams playing to return no-streams-playing', function(done) {
            channelExpress.joinChannel({
                role: member.roles.participant.name,
                alias: mockRoom.alias
            }, function(error, response) {
                var presenter = new Member(response.channelService, member.states.passive.name, 'member1', 'MyName', member.roles.presenter.name, [], 123);

                response.channelService.getObservableActiveChannel().getValue().getObservableMembers().setValue([presenter]);
            }, function(error, response){
                expect(response.status).to.be.equal(noStreamsPlayingStatus);
                expect(response.mediaStream).to.not.exist;

                done();
            });
        });

        it('Expect joinChannel members subscription event with participant with streams to return no streams playing status', function(done) {
            channelExpress.joinChannel({
                role: member.roles.participant.name,
                alias: mockRoom.alias
            }, function(error, response) {
                var presenter = new Member(response.channelService, member.states.passive.name, 'member1', 'MyName', member.roles.participant.name, [mockStream], 123);

                response.channelService.getObservableActiveChannel().getValue().getObservableMembers().setValue([presenter]);
            }, function(error, response){
                expect(response.status).to.be.equal(noStreamsPlayingStatus);
                expect(response.mediaStream).to.not.exist;

                done();
            });
        });

        it('Expect joinChannel members subscription event with presenter with streams playing to parse pcast uri from streamId', function(done) {
            channelExpress.getPCastExpress().subscribe = sinon.stub(channelExpress.getPCastExpress(), 'subscribe').callsFake(function(options) {
                expect(options.streamId).to.be.equal(mockStreamId);

                done();
            });

            channelExpress.joinChannel({
                role: member.roles.participant.name,
                alias: mockRoom.alias
            }, function(error, response) {
                var presenter = new Member(response.channelService, member.states.passive.name, 'member1', 'MyName', member.roles.presenter.name, [mockStream], 123);

                response.channelService.getObservableActiveChannel().getValue().getObservableMembers().setValue([presenter]);
            }, function(){ });
        });

        it('Expect joinChannel members subscription event with presenter with streams playing to trigger subscribe event', function(done) {
            channelExpress.getPCastExpress().subscribe = sinon.stub(channelExpress.getPCastExpress(), 'subscribe').callsFake(function(options, callback) {
                callback(null, {
                    status: 'ok',
                    mediaStream: mockMediaStream
                });
            });

            channelExpress.joinChannel({
                role: member.roles.participant.name,
                alias: mockRoom.alias
            }, function(error, response) {
                expect(response.channelService).to.be.an('object');

                var presenter = new Member(response.channelService, member.states.passive.name, 'member1', 'MyName', member.roles.presenter.name, [mockStream], 123);

                response.channelService.getObservableActiveChannel().getValue().getObservableMembers().setValue([presenter]);
            }, function(error, response){
                expect(response.mediaStream).to.be.an('object');
                expect(response.originStreamId).to.be.a('string');

                done();
            });
        });
    });
});