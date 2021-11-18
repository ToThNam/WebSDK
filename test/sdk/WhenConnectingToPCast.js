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
    'phenix-web-http',
    'lodash',
    'sdk/PCast',
    'sdk/logging/pcastLoggerFactory',
    'phenix-web-logging'
], function(http, _, PCast, pcastLoggerFactory, logging) {
    'use strict';

    var customBackend = 'ci.phenixrts.com';

    describe('When connecting to PCast', function() {
        var pcastLoggerStub;
        var pcast;
        var authToken;

        this.timeout(30000);

        before('Get Auth Token', function(done) {
            if (pcastLoggerFactory.createPCastLogger.restore) {
                pcastLoggerFactory.createPCastLogger.restore();
            }

            pcastLoggerStub = sinon.stub(pcastLoggerFactory, 'createPCastLogger').callsFake(function() {
                return sinon.createStubInstance(logging.Logger);
            }); // Disable requests to external source

            pcast = new PCast();

            var data = {};

            http.postWithRetry('https://' + customBackend + '/pcast/auth', JSON.stringify(data), {retryOptions: {maxAttempts: 1}}, function(error, response) {
                if (error) {
                    console.error(error);

                    return done(error);
                }

                authToken = JSON.parse(response.data).authenticationToken;

                expect(authToken).to.be.a('string');
                done();
            });
        });

        it('returns descriptor from toString before being started', function() {
            expect(pcast.toString()).to.be.a('string');
        });

        it('acquires an authentication token', function() {
            expect(authToken).to.be.a('string');
        });

        describe('When starting PCast', function() {
            var theSessionId;
            var onlineCallbackInvocationCount = 0;
            var offlineCallbackInvocationCount = 0;
            var startCount = 0;

            before(function(done) {
                if (startCount > 0) {
                    return;
                }

                startCount++;

                pcast.start(authToken, function authenticateCallback(pcast, status, sessionId) {
                    theSessionId = sessionId;

                    if (status !== 'ok') {
                        done(new Error('auth-failed'));
                    } else {
                        expect(sessionId).to.be.a('string');
                        done();
                    }
                }, function onlineCallback() {
                    onlineCallbackInvocationCount++;
                }, function offlineCallback() {
                    offlineCallbackInvocationCount++;
                });
            });

            it('returns descriptor from toString after being started', function() {
                expect(pcast.toString()).to.be.a('string');
            });

            it('receives a session ID', function() {
                expect(theSessionId).to.be.a('string');
            });

            it('became "online" once', function() {
                expect(onlineCallbackInvocationCount).to.be.equal(1);
            });

            it('did not become "offline"', function() {
                expect(offlineCallbackInvocationCount).to.be.equal(0);
            });

            describe('When stopping PCast', function() {
                before(function(done) {
                    pcast.stop();

                    var intervalId = setInterval(function() {
                        if (offlineCallbackInvocationCount > 0) {
                            clearInterval(intervalId);

                            expect(offlineCallbackInvocationCount > 0).to.be.true;
                            done();
                        } else {
                            done(new Error('Offline Callback not called'));
                        }
                    }, 200);
                });

                it('became "online" once', function() {
                    expect(onlineCallbackInvocationCount).to.be.equal(1);
                });

                it('became "offline" once', function() {
                    expect(offlineCallbackInvocationCount).to.be.equal(1);
                });
            });

            after(function() {
                pcast.stop();
                pcastLoggerStub.restore();
            });
        });
    });
});