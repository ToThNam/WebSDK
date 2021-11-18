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
    'sdk/AdminApiProxyClient',
    '../../../test/mock/HttpStubber'
], function(_, AdminApiProxyClient, HttpStubber) {
    describe('When sending requests to a clients backend', function() {
        var mockBackendUri = 'https://mockUri';
        var mockAuthBodyData = {
            name: 'mockUser',
            password: 'somePassword'
        };
        var mockAuthHeadersData = {
            header1: 'myFirstHeader',
            header2: 'mySecondHeader'
        };
        var streamEndpoint = '/streamstreamstream';
        var authEndpoint = '/authauthauth';
        var defaultHeaders = {
            'Accept': 'application/json',
            'Content-Type': 'application/json;charset=utf-8'
        };
        var defaultEndpointPaths = {
            createStreamTokenPath: '/stream',
            createAuthTokenPath: '/auth'
        };

        var setTimeoutClone = setTimeout;
        var httpStubber;

        beforeEach(function() {
            window.setTimeout = function(callback, timeout) {
                return setTimeoutClone(callback, timeout / 100);
            };

            httpStubber = new HttpStubber();
        });

        afterEach(function() {
            httpStubber.restore();
            window.setTimeout = setTimeoutClone;
        });

        it('successfully sets admin api private variables with public setters', function() {
            var adminApiProxyClient = new AdminApiProxyClient();
            var endpointPaths = {
                createStreamTokenPath: streamEndpoint,
                createAuthTokenPath: authEndpoint
            };

            adminApiProxyClient.setBackendUri(mockBackendUri);
            adminApiProxyClient.setAuthenticationData(mockAuthHeadersData);
            adminApiProxyClient.setAuthenticationDataLocationInPayload('header');
            adminApiProxyClient.setEndpointPaths(endpointPaths);

            expect(adminApiProxyClient.getBackendUri()).to.be.equal(mockBackendUri);
            expect(adminApiProxyClient.getAuthenticationData()).to.be.deep.equal(mockAuthHeadersData);
            expect(adminApiProxyClient.getAuthenticationDataLocationInPayload()).to.be.equal('header');
            expect(adminApiProxyClient.getEndpointPaths()).to.be.deep.equal(endpointPaths);
            expect(adminApiProxyClient.toString()).to.be.a('string');
        });

        it('successfully sets admin api private variables with public setters for request handler', function() {
            var adminApiProxyClient = new AdminApiProxyClient();

            adminApiProxyClient.setRequestHandler(_.noop);

            expect(adminApiProxyClient.getRequestHandler()).to.be.equal(_.noop);
        });

        it('throws an error when setting conflicting options', function() {
            var adminApiProxyClient = new AdminApiProxyClient();

            adminApiProxyClient.setBackendUri(mockBackendUri);

            expect(function() {
                adminApiProxyClient.setRequestHandler(_.noop);
            }).to.throw(Error);
        });

        it('successfully requests an auth token using default options', function(done) {
            var adminApiProxyClient = new AdminApiProxyClient();

            adminApiProxyClient.setBackendUri(mockBackendUri);
            adminApiProxyClient.setAuthenticationData(mockAuthBodyData);

            httpStubber.stubAuthRequest(function(req, body) {
                expect(req.url).to.be.equal(mockBackendUri + defaultEndpointPaths.createAuthTokenPath);
                expect(body).to.be.deep.equal(mockAuthBodyData);
                expect(req.requestHeaders).to.be.deep.equal(defaultHeaders);
                done();
            });

            adminApiProxyClient.createAuthenticationToken(_.noop);
        });

        it('successfully requests a stream token using default options', function(done) {
            var adminApiProxyClient = new AdminApiProxyClient();

            adminApiProxyClient.setBackendUri(mockBackendUri);
            adminApiProxyClient.setAuthenticationData(mockAuthBodyData);

            httpStubber.stubStreamRequest(function(req, body) {
                expect(req.url).to.be.equal(mockBackendUri + defaultEndpointPaths.createStreamTokenPath);
                expect(body).to.be.deep.equal(_.assign({
                    sessionId: 'sessionId',
                    capabilities: []
                }, mockAuthBodyData));
                expect(req.requestHeaders).to.be.deep.equal(defaultHeaders);
                done();
            });

            adminApiProxyClient.createStreamTokenForPublishing('sessionId', [], _.noop);
        });

        it('successfully requests an auth token using default options when custom stream endpoint is passed', function(done) {
            var adminApiProxyClient = new AdminApiProxyClient();

            adminApiProxyClient.setBackendUri(mockBackendUri);
            adminApiProxyClient.setAuthenticationData(mockAuthBodyData);
            adminApiProxyClient.setEndpointPaths({createStreamTokenPath: streamEndpoint});

            httpStubber.stubAuthRequest(function(req, body) {
                expect(req.url).to.be.equal(mockBackendUri + defaultEndpointPaths.createAuthTokenPath);
                expect(body).to.be.deep.equal(mockAuthBodyData);
                expect(req.requestHeaders).to.be.deep.equal(defaultHeaders);
                done();
            });

            adminApiProxyClient.createAuthenticationToken(_.noop);
        });

        it('successfully requests an auth token using custom endpoint and header mode', function(done) {
            var adminApiProxyClient = new AdminApiProxyClient();

            adminApiProxyClient.setBackendUri(mockBackendUri);
            adminApiProxyClient.setAuthenticationData(mockAuthHeadersData);
            adminApiProxyClient.setAuthenticationDataLocationInPayload('header');
            adminApiProxyClient.setEndpointPaths({createAuthTokenPath: authEndpoint});

            httpStubber.stubAuthRequest(function(req, body) {
                expect(req.url).to.be.equal(mockBackendUri + authEndpoint);
                expect(body).to.be.deep.equal({});
                expect(req.requestHeaders).to.be.deep.equal(_.assign({}, mockAuthHeadersData, defaultHeaders));
                done();
            });

            adminApiProxyClient.createAuthenticationToken(_.noop);
        });

        it('successfully requests a stream token using custom endpoint and header mode', function(done) {
            var adminApiProxyClient = new AdminApiProxyClient();

            adminApiProxyClient.setBackendUri(mockBackendUri);
            adminApiProxyClient.setAuthenticationData(mockAuthHeadersData);
            adminApiProxyClient.setAuthenticationDataLocationInPayload('header');
            adminApiProxyClient.setEndpointPaths({createStreamTokenPath: streamEndpoint});

            httpStubber.stubStreamRequest(function(req, body) {
                expect(req.url).to.be.equal(mockBackendUri + streamEndpoint);
                expect(body).to.be.deep.equal({
                    sessionId: 'sessionId',
                    capabilities: []
                });
                expect(req.requestHeaders).to.be.deep.equal(_.assign({}, mockAuthHeadersData, defaultHeaders));
                done();
            });

            adminApiProxyClient.createStreamTokenForPublishing('sessionId', [], _.noop);
        });

        it('successfully calls override method and does not send http request for publisher stream token', function(done) {
            var adminApiProxyClient = new AdminApiProxyClient();
            var streamRequestSpy = sinon.spy();

            adminApiProxyClient.setRequestHandler(function(type, data, callback) {
                expect(type).to.be.equal('stream');
                expect(data).to.be.deep.equal({
                    sessionId: 'sessionId',
                    capabilities: []
                });
                callback(null, 'my-stream-token');
            });

            httpStubber.stubStreamRequest(streamRequestSpy);

            adminApiProxyClient.createStreamTokenForPublishing('sessionId', [], function(error, response) {
                expect(error).to.not.exist;
                expect(response).to.be.an('object');
                expect(response.status).to.be.equal('ok');
                expect(response.streamToken).to.be.equal('my-stream-token');
                sinon.assert.notCalled(streamRequestSpy);
                done();
            });
        });

        it('successfully calls override method and does not send http request for viewer stream token', function(done) {
            var adminApiProxyClient = new AdminApiProxyClient();
            var streamRequestSpy = sinon.spy();

            adminApiProxyClient.setRequestHandler(function(type, data, callback) {
                expect(type).to.be.equal('stream');
                expect(data).to.be.deep.equal({
                    sessionId: 'sessionId',
                    capabilities: [],
                    originStreamId: 'originStreamId'
                });
                callback(null, 'my-stream-token');
            });

            httpStubber.stubStreamRequest(streamRequestSpy);

            adminApiProxyClient.createStreamTokenForSubscribing('sessionId', [], 'originStreamId', null, function(error, response) {
                expect(error).to.not.exist;
                expect(response).to.be.an('object');
                expect(response.status).to.be.equal('ok');
                expect(response.streamToken).to.be.equal('my-stream-token');
                sinon.assert.notCalled(streamRequestSpy);
                done();
            });
        });

        it('successfully calls override method and does not send http request for auth token', function(done) {
            var adminApiProxyClient = new AdminApiProxyClient();
            var authRequestSpy = sinon.spy();

            adminApiProxyClient.setRequestHandler(function(type, data, callback) {
                expect(type).to.be.equal('auth');
                expect(data).to.be.deep.equal({});
                callback(null, 'my-auth-token');
            });

            httpStubber.stubAuthRequest(authRequestSpy);

            adminApiProxyClient.createAuthenticationToken(function(error, response) {
                expect(error).to.not.exist;
                expect(response).to.be.an('object');
                expect(response.status).to.be.equal('ok');
                expect(response.authenticationToken).to.be.equal('my-auth-token');
                sinon.assert.notCalled(authRequestSpy);
                done();
            });
        });

        it('returns error to admin api callback from override method', function(done) {
            var adminApiProxyClient = new AdminApiProxyClient();

            adminApiProxyClient.setRequestHandler(function(type, data, callback) {
                callback(new Error('my-error'));
            });

            adminApiProxyClient.createAuthenticationToken(function(error, response) {
                expect(error).to.exist;
                expect(error.message).to.be.equal('my-error');
                expect(response.status).to.be.equal('failed');
                done();
            });
        });

        it('returns failed status when token is not provided', function(done) {
            var adminApiProxyClient = new AdminApiProxyClient();

            adminApiProxyClient.setRequestHandler(function(type, data, callback) {
                callback(null, '');
            });

            adminApiProxyClient.createAuthenticationToken(function(error, response) {
                expect(error).to.not.exist;
                expect(response.status).to.be.equal('failed');
                done();
            });
        });
    });
});