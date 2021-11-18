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
    '../../../test/mock/HttpStubber',
    '../../../test/mock/WebSocketStubber',
    '../../../test/mock/ChromeRuntimeStubber'
], function(_, PCast, HttpStubber, WebSocketStubber, ChromeRuntimeStubber) {
    describe('When Subscribing to an Audio Only Stream', function() { // eslint-disable-line mocha/no-exclusive-tests
        var httpStubber = new HttpStubber();
        var websocketStubber;
        var chromeRuntimeStubber = new ChromeRuntimeStubber();
        var pcast;

        before(function() {
            httpStubber.stubAuthRequest();
            chromeRuntimeStubber.stub();
        });

        beforeEach(function(done) {
            pcast = new PCast({uri: 'wss://mockURI'});

            websocketStubber = new WebSocketStubber();
            websocketStubber.stubAuthRequest();

            pcast.start('mockAuthToken', function(){}, function(){}, function(){});

            pcast.getObservableStatus().subscribe(function(status) {
                if (status === 'online') {
                    done();
                }
            });
        });

        afterEach(function() {
            websocketStubber.restore();
        });

        after(function() {
            pcast.stop();
            httpStubber.restore();
            chromeRuntimeStubber.restore();
        });

        it('Expect subscribe with receiveVideo of false to have options no-video', function(done) {
            websocketStubber.stubResponse('pcast.SetupStream', {status: 'dont-continue-code-execution'}, function(response, message) {
                expect(_.includes(message.createStream.options, 'no-video')).to.be.true;

                done();
            });

            pcast.subscribe('DIGEST:eyJ0b2tlbiI6IntcImNhcGFiaWxpdGllc1wiOltdfSJ9', function() {}, {receiveVideo: false});
        });
    });
});