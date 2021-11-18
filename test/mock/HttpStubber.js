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

define(['phenix-web-lodash-light'], function(_) {
    function HttpStubber() {
        this._requests = [];
        this._handlers = {};
        this._defaultHandler = {
            response: {status: 'ok'},
            type: 'application/json'
        };
    }

    HttpStubber.prototype.stub = function(callback) {
        stubIfNoneExist.call(this);

        this._defaultHandler.callback = callback;
    };

    HttpStubber.prototype.stubAuthRequest = function(callback) {
        stubIfNoneExist.call(this);

        this.stubResponse('auth', 'application/json', {
            status: 'ok',
            authenticationToken: 'DIGEST:eyJ0b2tlbiI6IntcImNhcGFiaWxpdGllc1wiOltdfSJ9'
        }, callback);
    };

    HttpStubber.prototype.stubStreamRequest = function(callback, token = 'DIGEST:eyJ0b2tlbiI6IntcImNhcGFiaWxpdGllc1wiOltdfSJ9') {
        stubIfNoneExist.call(this);

        this.stubResponse('stream', 'application/json', {
            status: 'ok',
            streamToken: token
        }, callback);
    };

    HttpStubber.prototype.stubStreamRequestWithStatus = function(status, callback) {
        stubIfNoneExist.call(this);

        this.stubResponse('stream', 'application/json', {status: status}, callback);
    };

    HttpStubber.prototype.stubResponse = function(url, contentType, response, callback) {
        stubIfNoneExist.call(this);

        this._handlers[url] = {
            response: response,
            type: contentType,
            callback: callback
        };
    };

    HttpStubber.prototype.restore = function() {
        if (this.xhr && this.xhr.restore) {
            this.xhr.restore();
        }

        this.xhr = null;
        this._handlers = {};
        this._requests = [];
    };

    HttpStubber.prototype.getRequests = function() {
        return this._requests;
    };

    function stubIfNoneExist() {
        if (this.xhr) {
            return;
        }

        this.xhr = sinon.useFakeXMLHttpRequest();
        this._requests = [];

        var that = this;

        this.xhr.onCreate = function(req) {
            that._requests.push(req);

            req.onSend = function(sentRequest) {
                var handlerKey = _.find(_.keys(that._handlers), function(key) {
                    return sentRequest.url.toLowerCase().indexOf(key) > -1;
                });

                var handler = handlerKey ? that._handlers[handlerKey] : that._defaultHandler;

                if (sentRequest.url.toLowerCase().indexOf('telemetry') === -1 ) {
                    if (handler.callback) {
                        handler.callback(req, JSON.parse(req.requestBody));
                    }

                    setTimeout(function() {
                        try {
                            req.respond(200, {'Content-Type': handler.type}, JSON.stringify(handler.response));
                        } catch (error) {
                            console.log("Error sending request", error);
                        }
                    }, 1);
                }

                return false;
            };
        };
    }

    return HttpStubber;
});