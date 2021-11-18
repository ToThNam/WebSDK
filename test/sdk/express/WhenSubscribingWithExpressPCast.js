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
    'sdk/express/PCastExpress',
    '../../../test/mock/HttpStubber',
    '../../../test/mock/WebSocketStubber',
    '../../../test/mock/ChromeRuntimeStubber',
    '../../../test/mock/PeerConnectionStubber',
    'sdk/streaming/PeerConnectionMonitor'
], function(PCastExpress, HttpStubber, WebSocketStubber, ChromeRuntimeStubber, PeerConnectionStubber, PeerConnectionMonitor) {
    describe('When Subscribing with Express PCast', function() {
        var httpStubber;
        var websocketStubber;
        var chromeRuntimeStubber = new ChromeRuntimeStubber();
        var peerConnectionStubber = new PeerConnectionStubber();
        var pcastExpress;

        var clientFailureReason = 'client-side-failure';

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

            pcastExpress = new PCastExpress({
                authToken: 'DIGEST:eyJhcHBsaWNhdGlvbklkIjoiZGVtbyIsImRpZ2VzdCI6IjZ3ODQ3S3N2ZFh5WjhRNnlyNWNzMnh0YjMxdFQ0TFR3bHAyeUZyZ0t2K0pDUEJyYkI4Qnd5a3dyT2NIWE52OXQ5eU5qYkFNT2tuQ1N1VnE5eGdBZjdRPT0iLCJ0b2tlbiI6IntcImV4cGlyZXNcIjoxOTI5NjA5NjcwMjI1LFwiY2FwYWJpbGl0aWVzXCI6W1wiYXVkaW8tb25seVwiXSxcInJlcXVpcmVkVGFnXCI6XCJyb29tSWQ6ZXVyb3BlLWNlbnRyYWwjZGVtbyNtdWx0aXBhcnR5Q2hhdERlbW9Sb29tLlpwcWJKNG1Oa2g2dVwifSJ9',
                uri: 'wss://mockURI'
            });

            websocketStubber.stubSetupStream();
        });

        after(function() {
            chromeRuntimeStubber.restore();
            peerConnectionStubber.restore();
        });

        afterEach(function() {
            httpStubber.restore();
            websocketStubber.restore();
            pcastExpress.dispose();
        });

        it('Has method subscribe', function() {
            expect(pcastExpress.subscribe).to.be.a('function');
        });

        it('Expect mediaStream to be returned in subscribe callback', function(done) {
            pcastExpress.subscribe({
                streamToken: 'DIGEST:eyJhcHBsaWNhdGlvbklkIjoiZGVtbyIsImRpZ2VzdCI6IjZ3ODQ3S3N2ZFh5WjhRNnlyNWNzMnh0YjMxdFQ0TFR3bHAyeUZyZ0t2K0pDUEJyYkI4Qnd5a3dyT2NIWE52OXQ5eU5qYkFNT2tuQ1N1VnE5eGdBZjdRPT0iLCJ0b2tlbiI6IntcImV4cGlyZXNcIjoxOTI5NjA5NjcwMjI1LFwiY2FwYWJpbGl0aWVzXCI6W1wiYXVkaW8tb25seVwiXSxcInJlcXVpcmVkVGFnXCI6XCJyb29tSWQ6ZXVyb3BlLWNlbnRyYWwjZGVtbyNtdWx0aXBhcnR5Q2hhdERlbW9Sb29tLlpwcWJKNG1Oa2g2dVwifSJ9',
                streamId: 'MockStreamId'
            }, function(error, response) {
                expect(response.mediaStream).to.be.a('object');
                done();
            });
        });

        it('Expect monitor to return a response with retry', function(done) {
            var startClone = PeerConnectionMonitor.prototype.start;

            PeerConnectionMonitor.prototype.start = function(options, activeCallback, monitorCallback) {
                monitorCallback(null, {type: clientFailureReason});
            };

            pcastExpress.subscribe({
                streamToken: 'DIGEST:eyJhcHBsaWNhdGlvbklkIjoiZGVtbyIsImRpZ2VzdCI6IjZ3ODQ3S3N2ZFh5WjhRNnlyNWNzMnh0YjMxdFQ0TFR3bHAyeUZyZ0t2K0pDUEJyYkI4Qnd5a3dyT2NIWE52OXQ5eU5qYkFNT2tuQ1N1VnE5eGdBZjdRPT0iLCJ0b2tlbiI6IntcImV4cGlyZXNcIjoxOTI5NjA5NjcwMjI1LFwiY2FwYWJpbGl0aWVzXCI6W1wiYXVkaW8tb25seVwiXSxcInJlcXVpcmVkVGFnXCI6XCJyb29tSWQ6ZXVyb3BlLWNlbnRyYWwjZGVtbyNtdWx0aXBhcnR5Q2hhdERlbW9Sb29tLlpwcWJKNG1Oa2g2dVwifSJ9',
                streamId: 'MockStreamId',
                monitor: {
                    conditionCountForNotificationThreshold: 0,
                    callback: function(error, response) {
                        if (response.status !== clientFailureReason) {
                            return;
                        }

                        expect(response.retry).to.be.a('function');

                        PeerConnectionMonitor.prototype.start = startClone;
                        done();
                    }
                }
            }, function() {});
        });

        it('Expect monitor retry to setup a new subscription', function(done) {
            var startClone = PeerConnectionMonitor.prototype.start;
            var subscribeCount = 0;

            PeerConnectionMonitor.prototype.start = function(options, activeCallback, monitorCallback) {
                setTimeout(function() {
                    if (subscribeCount < 2) {
                        monitorCallback(null, {type: clientFailureReason});
                    }
                }, 10);
            };

            pcastExpress.subscribe({
                streamToken: 'DIGEST:eyJhcHBsaWNhdGlvbklkIjoiZGVtbyIsImRpZ2VzdCI6IjZ3ODQ3S3N2ZFh5WjhRNnlyNWNzMnh0YjMxdFQ0TFR3bHAyeUZyZ0t2K0pDUEJyYkI4Qnd5a3dyT2NIWE52OXQ5eU5qYkFNT2tuQ1N1VnE5eGdBZjdRPT0iLCJ0b2tlbiI6IntcImV4cGlyZXNcIjoxOTI5NjA5NjcwMjI1LFwiY2FwYWJpbGl0aWVzXCI6W1wiYXVkaW8tb25seVwiXSxcInJlcXVpcmVkVGFnXCI6XCJyb29tSWQ6ZXVyb3BlLWNlbnRyYWwjZGVtbyNtdWx0aXBhcnR5Q2hhdERlbW9Sb29tLlpwcWJKNG1Oa2g2dVwifSJ9',
                streamId: 'MockStreamId',
                monitor: {
                    conditionCountForNotificationThreshold: 0,
                    callback: function(error, response) {
                        if (response.status !== clientFailureReason) {
                            return;
                        }

                        response.retry();

                        PeerConnectionMonitor.prototype.start = startClone;
                    }
                }
            }, function() {
                subscribeCount++;

                if (subscribeCount > 1) {
                    expect(subscribeCount).to.be.equal(2);
                    done();
                }
            });
        });

        it('Expect monitor retry with unauthorized status for setupStream to trigger request one time to get new streamToken', function(done) {
            var startClone = PeerConnectionMonitor.prototype.start;
            var subscribeCount = 0;
            var reSubscribeCount = 0;

            PeerConnectionMonitor.prototype.start = function(options, activeCallback, monitorCallback) {
                setTimeout(function() {
                    websocketStubber.stubResponse('pcast.SetupStream', {status: 'unauthorized'});

                    monitorCallback(null, {type: clientFailureReason});
                }, 10);
            };

            pcastExpress.subscribe({
                streamToken: 'DIGEST:eyJhcHBsaWNhdGlvbklkIjoiZGVtbyIsImRpZ2VzdCI6IjZ3ODQ3S3N2ZFh5WjhRNnlyNWNzMnh0YjMxdFQ0TFR3bHAyeUZyZ0t2K0pDUEJyYkI4Qnd5a3dyT2NIWE52OXQ5eU5qYkFNT2tuQ1N1VnE5eGdBZjdRPT0iLCJ0b2tlbiI6IntcImV4cGlyZXNcIjoxOTI5NjA5NjcwMjI1LFwiY2FwYWJpbGl0aWVzXCI6W1wiYXVkaW8tb25seVwiXSxcInJlcXVpcmVkVGFnXCI6XCJyb29tSWQ6ZXVyb3BlLWNlbnRyYWwjZGVtbyNtdWx0aXBhcnR5Q2hhdERlbW9Sb29tLlpwcWJKNG1Oa2g2dVwifSJ9',
                streamId: 'MockStreamId',
                monitor: {
                    conditionCountForNotificationThreshold: 0,
                    callback: function(error, response) {
                        if (response.status !== clientFailureReason) {
                            return;
                        }

                        reSubscribeCount++;
                        response.retry();

                        PeerConnectionMonitor.prototype.start = startClone;
                    }
                }
            }, function(error, response) {
                if (response && response.status === 'ok') {
                    return subscribeCount++;
                }

                expect(reSubscribeCount).to.be.equal(1);
                expect(response.status).to.be.equal('unauthorized');
                done();
            });
        });
    });
});