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
    'sdk/express/PCastExpress',
    'sdk/AdminApiProxyClient',
    '../../../../test/mock/HttpStubber',
    '../../../../test/mock/WebSocketStubber',
    '../../../../test/mock/ChromeRuntimeStubber',
    '../../../../test/mock/PeerConnectionStubber',
    '../../../../test/mock/UserMediaStubber',
    'sdk/streaming/PeerConnectionMonitor'
], function(_, PCastExpress, AdminApiProxyClient, HttpStubber, WebSocketStubber, ChromeRuntimeStubber, PeerConnectionStubber, UserMediaStubber, PeerConnectionMonitor) {
    describe('When reconnecting to the websocket and re-authenticating', function() {
        var mockBackendUri = 'https://mockUri';
        var mockAuthData = {
            name: 'mockUser',
            password: 'somePassword'
        };

        var setTimeoutClone = setTimeout;
        var httpStubber;
        var websocketStubber;
        var chromeRuntimeStubber = new ChromeRuntimeStubber();
        var peerConnectionStubber = new PeerConnectionStubber();
        var startClone = PeerConnectionMonitor.prototype.start;
        var streamTokenRequests = [];
        var pcastExpress;

        before(function() {
            chromeRuntimeStubber.stub();
            peerConnectionStubber.stub();
        });

        beforeEach(function(done) {
            streamTokenRequests = [];
            window.setTimeout = function(callback, timeout) {
                return setTimeoutClone(callback, timeout / 100);
            };

            httpStubber = new HttpStubber();
            httpStubber.stubAuthRequest();
            httpStubber.stubStreamRequest(function(request, body) {
                streamTokenRequests.push(body);
                // Make sure setup passes after token request
                websocketStubber.stubSetupStream();
            }, 'DIGEST:eyJ0b2tlbiI6IntcImNhcGFiaWxpdGllc1wiOltdfSJ9');

            websocketStubber = new WebSocketStubber();
            websocketStubber.stubAuthRequest();
            websocketStubber.stubSetupStream();

            var adminApiProxyClient = new AdminApiProxyClient();

            adminApiProxyClient.setBackendUri(mockBackendUri);
            adminApiProxyClient.setAuthenticationData(mockAuthData);

            pcastExpress = new PCastExpress({
                adminApiProxyClient: adminApiProxyClient,
                uri: 'wss://mockURI',
                onError: _.noop,
                onlineTimeout: 60000
            });

            pcastExpress.waitForOnline(done);
        });

        after(function() {
            chromeRuntimeStubber.restore();
            peerConnectionStubber.restore();
        });

        afterEach(function() {
            httpStubber.restore();
            websocketStubber.restore();
            pcastExpress.dispose();
            window.setTimeout = setTimeoutClone;
        });

        describe('Given subscriber or publisher fails', function() {
            var reauthTokenSpy = null;

            beforeEach(function() {
                reauthTokenSpy = sinon.spy();

                PeerConnectionMonitor.prototype.start = function(options, activeCallback, monitorCallback) {
                    setTimeout(function() {
                        monitorCallback(null, {type: 'client-side-failure'});
                    }, 3);
                };
            });

            afterEach(function() {
                PeerConnectionMonitor.prototype.start = startClone;
            });

            it('successfully recovers from a subscriber stream end', function(done) {
                var subscribeCount = 0;
                var reSubscribeCount = 0;

                pcastExpress.subscribe({
                    capabilities: [],
                    enableWildcardCapability: true,
                    streamId: 'MockStreamId',
                    monitor: {
                        callback: function(error, response) {
                            if (response.retry) {
                                reSubscribeCount++;

                                if (reSubscribeCount === 1) {
                                    websocketStubber.stubResponse('pcast.SetupStream', {status: 'unauthorized'});
                                }

                                response.retry();
                            }
                        }
                    }
                }, function(error, response) {
                    if (response && response.status === 'ok') {
                        subscribeCount++;

                        if (subscribeCount === 1) {
                            websocketStubber.stubAuthRequestFailure('unauthorized');
                            httpStubber.stubAuthRequest(function() {
                                websocketStubber.stubAuthRequest('NewSessionId');
                                reauthTokenSpy();
                            });
                            websocketStubber.triggerReconnected();
                        }

                        if (reSubscribeCount === 1) {
                            var lastStreamTokenRequest = streamTokenRequests[streamTokenRequests.length - 1];

                            sinon.assert.calledOnce(reauthTokenSpy);
                            expect(streamTokenRequests.length).to.be.equal(2);
                            expect(lastStreamTokenRequest).to.be.an('object');
                            expect(lastStreamTokenRequest.sessionId).to.be.equal('NewSessionId');
                            done();
                        }
                    }
                });
            });

            it('successfully recovers from a publisher stream end', function(done) {
                var publishCount = 0;
                var rePublishCount = 0;

                pcastExpress.publish({
                    capabilities: [],
                    enableWildcardCapability: true,
                    userMediaStream: UserMediaStubber.getMockMediaStream(),
                    monitor: {
                        callback: function(error, response) {
                            if (response.retry) {
                                rePublishCount++;

                                if (rePublishCount === 1) {
                                    websocketStubber.stubResponse('pcast.SetupStream', {status: 'unauthorized'});
                                }

                                response.retry();
                            }
                        }
                    }
                }, function(error, response) {
                    if (response && response.status === 'ok') {
                        publishCount++;

                        if (publishCount === 1) {
                            websocketStubber.stubAuthRequestFailure('unauthorized');
                            httpStubber.stubAuthRequest(function() {
                                websocketStubber.stubAuthRequest('NewSessionId');
                                reauthTokenSpy();
                            });
                            websocketStubber.triggerReconnected();
                        }

                        if (rePublishCount === 1) {
                            var lastStreamTokenRequest = streamTokenRequests[streamTokenRequests.length - 1];

                            sinon.assert.calledOnce(reauthTokenSpy);
                            expect(streamTokenRequests.length).to.be.equal(2);
                            expect(lastStreamTokenRequest).to.be.an('object');
                            expect(lastStreamTokenRequest.sessionId).to.be.equal('NewSessionId');
                            done();
                        }
                    }
                });
            });

            it('log `bad-token` warning, when there is a broken token provided for publishing', function(done) {
                httpStubber.stubStreamRequest(null, 'badToken');

                var rePublishCount = 0;

                pcastExpress.publish({
                    capabilities: [],
                    enableWildcardCapability: true,
                    userMediaStream: UserMediaStubber.getMockMediaStream(),
                    monitor: {
                        callback: function(error, response) {
                            if (response.retry) {
                                rePublishCount++;

                                if (rePublishCount === 1) {
                                    websocketStubber.stubResponse('pcast.SetupStream', {status: 'unauthorized'});
                                }

                                response.retry();
                            }
                        }
                    }
                }, function(error, response) {
                    expect(response.status).to.be.equal('bad-token');
                    done();
                });
            });
        });
    });
});