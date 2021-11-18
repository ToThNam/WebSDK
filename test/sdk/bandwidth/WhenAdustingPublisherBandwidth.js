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
    'sdk/bandwidth/PublisherBandwidthAdjuster',
    '../../../test/mock/HttpStubber',
    '../../../test/mock/WebSocketStubber',
    '../../../test/mock/ChromeRuntimeStubber',
    'sdk/room/room.json',
    'sdk/room/member.json'
], function(_, PCast, RoomService, PublisherBandwidthAdjuster, HttpStubber, WebSocketStubber, ChromeRuntimeStubber, roomEnum, memberEnum) {
    describe('When Adjusting Publisher Bandwidth', function() {
        var publisher = {};
        var publisherBandwidthAdjuster;
        var roomService;
        var membersObservable;
        var httpStubber;
        var websocketStubber;
        var chromeRuntimeStubber = new ChromeRuntimeStubber();
        var mockRoom = {
            roomId: 'TestRoom123',
            alias: '',
            name: 'Test123',
            description: 'Test 123',
            bridgeId: '',
            pin: '',
            type: roomEnum.types.multiPartyChat.name
        };
        var pcast;

        before(function() {
            chromeRuntimeStubber.stub();
        });

        beforeEach(function(done) {
            httpStubber = new HttpStubber();
            httpStubber.stub();

            websocketStubber = new WebSocketStubber();
            websocketStubber.stubAuthRequest();

            pcast = new PCast();

            pcast.start('AuthToken', function() {}, function onlineCallback() {
                roomService = new RoomService(pcast);
                publisherBandwidthAdjuster = new PublisherBandwidthAdjuster(publisher);

                var response = {
                    status: 'ok',
                    room: mockRoom,
                    members: []
                };

                websocketStubber.stubResponse('chat.JoinRoom', response);

                roomService.start(memberEnum.roles.participant.name, 'Name');
                roomService.enterRoom('id', '', function() {
                    var room = roomService.getObservableActiveRoom().getValue();

                    membersObservable = room.getObservableMembers();

                    done();
                });
            }, function offlineCallback() {});
        });

        after(function() {
            chromeRuntimeStubber.restore();
        });

        afterEach(function() {
            httpStubber.restore();
            websocketStubber.restore();

            publisherBandwidthAdjuster.close();

            if (roomService) {
                roomService.stop();
            }

            pcast.stop();

            self.sessionId = 'MockSessionId';
        });

        it('Has property connect that is a function', function() {
            expect(publisherBandwidthAdjuster.connect).to.be.a('function');
        });

        it('Has property close that is a function', function() {
            expect(publisherBandwidthAdjuster.close).to.be.a('function');
        });

        it('Room service with no room causes default bandwidth limit', function() {
            membersObservable.setValue(null);

            publisher.limitBandwidth = function(bandwidth) {
                expect(bandwidth).to.be.equal(5000000);
            };

            publisherBandwidthAdjuster.connect(roomService);
        });

        it('Room service with no room causes passed bandwidth limit', function() {
            membersObservable.setValue(null);

            publisher.limitBandwidth = function(bandwidth) {
                expect(bandwidth).to.be.equal(100000);
            };

            publisherBandwidthAdjuster.connect(roomService, {roomBandwidthLimit: 100000});
        });

        it('Room service with a room with 2 members causes default bandwidth limit', function() {
            membersObservable.setValue([{}, {}]);

            publisher.limitBandwidth = function(bandwidth) {
                expect(bandwidth).to.be.equal(5000000);
            };

            publisherBandwidthAdjuster.connect(roomService);
        });

        it('Room service with a room with 3 members causes passed bandwidth/2 bandwidth limit', function() {
            membersObservable.setValue([{}, {}, {}]);

            publisher.limitBandwidth = function(bandwidth) {
                expect(bandwidth).to.be.equal(100000 / 2);
            };

            publisherBandwidthAdjuster.connect(roomService, {roomBandwidthLimit: 100000});
        });
    });
});