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
    'sdk/PCast',
    '../../../test/mock/HttpStubber',
    '../../../test/mock/WebSocketStubber',
    '../../../test/mock/ChromeRuntimeStubber',
    '../../../test/mock/PeerConnectionStubber'
], function(PCast, HttpStubber, WebSocketStubber, ChromeRuntimeStubber, PeerConnectionStubber) {
    describe('When Subscribing to a Stream', function() {
        var httpStubber = new HttpStubber();
        var websocketStubber;
        var chromeRuntimeStubber = new ChromeRuntimeStubber();
        var peerConnectionStubber = new PeerConnectionStubber();
        var pcast;

        before(function() {
            httpStubber.stubAuthRequest();
            chromeRuntimeStubber.stub();
            peerConnectionStubber.stub();
        });

        beforeEach(function() {
            websocketStubber = new WebSocketStubber();

            pcast = new PCast({uri: 'wss://mockURI'});
        });

        after(function() {
            httpStubber.restore();
            chromeRuntimeStubber.restore();
            peerConnectionStubber.restore();
        });

        afterEach(function() {
            pcast.stop();
            websocketStubber.restore();
        });

        it('Has method subscribe', function() {
            expect(pcast.subscribe).to.be.a('function');
        });

        it('Expect an error to be thrown if pcast has not been started when subscribing', function() {
            expect(function() {
                pcast.subscribe('DIGEST:eyJ0b2tlbiI6IntcImNhcGFiaWxpdGllc1wiOltdfSJ9', function() {}, {});
            }).to.throw(Error);
        });

        describe('When pcast has been started', function() {
            beforeEach(function(done) {
                websocketStubber.stubAuthRequest();

                pcast.start('mockAuthToken', function(){}, function(){
                    done();
                }, function(){});
            });

            afterEach(function() {
                pcast.stop();
                websocketStubber.restore();
            });

            it('Expect an error to not be thrown when subscribing', function() {
                websocketStubber.stubSetupStream();

                expect(function() {
                    pcast.subscribe('DIGEST:eyJ0b2tlbiI6IntcImNhcGFiaWxpdGllc1wiOltdfSJ9', function() {}, {});
                }).to.not.throw();
            });

            it('Expect connect options to be passed through to websocket send', function(done) {
                websocketStubber.stubResponse('pcast.SetupStream', {status: 'dont-continue-code-execution'}, function(response, message) {
                    expect(message.createStream.connectOptions[0]).to.be.equal('mock-option');

                    done();
                });

                pcast.subscribe('DIGEST:eyJ0b2tlbiI6IntcImNhcGFiaWxpdGllc1wiOltdfSJ9', function() {}, {connectOptions: ['mock-option']});
            });

            it('Expect mediaStream to be returned in subscribe callback', function(done) {
                websocketStubber.stubSetupStream();

                pcast.subscribe('DIGEST:eyJ0b2tlbiI6IntcImNhcGFiaWxpdGllc1wiOltdfSJ9', function(internalPcast, status, mediaStream) {
                    done();
                    expect(mediaStream).to.be.a('object');
                });
            });
        });
    });
});