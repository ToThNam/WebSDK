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

import { arg1_callback_handleReadyStateChange, response_closestEndPointResolver, xhr_handleReadyStateChange } from "../../typescript/src/sdk/PCastEndPoint";

define([
    'phenix-web-assert',
    'phenix-web-lodash-light',
    'phenix-web-disposable',
    'phenix-web-closest-endpoint-resolver'
], function(assert, _, disposable, ClosestEndPointResolver) {
    'use strict';

    function PCastEndPoint(version: string, baseUri: string, logger: object, sessionTelemetry: any) {
        assert.isStringNotEmpty(version, 'version');
        assert.isStringNotEmpty(baseUri, 'baseUri');
        assert.isObject(logger, 'logger');

        this._version = version;
        this._baseUri = baseUri;
        this._logger = logger;
        this._disposables = new disposable.DisposableList();
        this._sessionTelemetry = sessionTelemetry;
    }

    PCastEndPoint.DefaultPCastUri = 'https://pcast.phenixrts.com';

    PCastEndPoint.prototype.getBaseUri = function() {
        return this._baseUri;
    };

    PCastEndPoint.prototype.resolveUri = function(callback: any /* (error, {uri, roundTripTime}) */) {
        return resolveUri.call(this, this._baseUri, callback);
    };

    PCastEndPoint.prototype.dispose = function() {
        this._disposables.dispose();
    };

    PCastEndPoint.prototype.toString = function() {
        return 'PCastEndPoint[' + this._baseUri + ']';
    };

    function resolveUri(baseUri: string , callback: any /* (error, {uri, roundTripTime}) */) {
        var isWss = baseUri.lastIndexOf('wss:', 0) === 0;
        var isWs = baseUri.lastIndexOf('ws:', 0) === 0;
        var isHttps = baseUri.lastIndexOf('https:', 0) === 0;
        var isHttp = baseUri.lastIndexOf('http:', 0) === 0;

        if (isWss || isWs) {
            // WS - Specific web socket end point
            callback(undefined, {
                uri: baseUri + '/ws',
                roundTripTime: 0
            });
        } else if (isHttps || isHttp) {
            // HTTP - Resolve closest end point
            var that = this;

            getEndpoints.call(that, baseUri, function(err: any, endPoints: any) {
                if (err) {
                    return callback(err);
                }

                var closestEndPointResolver = new ClosestEndPointResolver({
                    logger: that._logger,
                    version: that._version
                }, callback, function(err: { code: number; }, response: response_closestEndPointResolver) {
                    if (err) {
                        if (err.code === 503) {
                            that._logger.debug('The end point [%s] is temporarily disabled', _.get(response, ['endPoint']));
                        } else {
                            that._logger.warn('An error occurred in resolving an endpoint [%s]', _.get(response, ['endPoint']), err);
                        }

                        return;
                    }

                    var isHttpsEndPoint = response.endPoint.lastIndexOf('https:', 0) === 0;

                    that._sessionTelemetry.recordMetric('RoundTripTime', {uint64: response.time}, null, {
                        resource: response.endPoint,
                        kind: isHttpsEndPoint ? 'https' : 'http'
                    });
                });

                closestEndPointResolver.resolveAll(endPoints);

                that._disposables.add(closestEndPointResolver);
            });
        } else {
            // Not supported
            callback(new Error('Uri not supported [' + baseUri + ']'));
        }
    }

    function getEndpoints(baseUri: string, callback: (arg0: any , arg1?: string[] ) => void) {
        var version = '%SDKVERSION%';
        var requestUrl = baseUri + '/pcast/endPoints?version=' + version + '&_=' + _.now();
        var xhr: any = getAndOpenVendorSpecificXmlHttpMethod('GET', requestUrl);

        xhr.addEventListener('readystatechange', _.bind(handleReadyStateChange, this, xhr, function(err: any, response: { data: string; }) {
            if (err) {
                return callback(new Error(err));
            }

            var endPoints = response.data.split(',');

            if (endPoints.length < 1) {
                callback(new Error('Failed to discover end points'));
            }

            callback(undefined, endPoints);
        }));
        xhr.timeout = 15000;
        xhr.send(null);
    }

    function getAndOpenVendorSpecificXmlHttpMethod(requestMethod: string, requestUrl: string) {
        var xhr = new XMLHttpRequest();
        if ('withCredentials' in xhr) {
            // Most browsers.
            xhr.open(requestMethod, requestUrl, true);
        } else if (typeof XDomainRequest !== 'undefined') {
            // IE8 & IE9
            // eslint-disable-next-line no-undef
            xhr = new XDomainRequest ();
            xhr.open(requestMethod, requestUrl);
        } else {
            return;
        }

        return xhr;
    }

    function handleReadyStateChange(xhr: xhr_handleReadyStateChange, callback: (arg0: null, arg1?: arg1_callback_handleReadyStateChange) => void) {
        if (xhr.readyState === 4 /* DONE */) {
            if (xhr.status === 200) {
                var responseHeaders = getXhrResponseHeaders(xhr);
                var response = {
                    data: xhr.response || xhr.responseText,
                    headers: responseHeaders,
                    rawXhr: xhr
                };

                callback(null, response);
            } else {
                var err: any = new Error(xhr.status === 0 ? 'timeout' : 'Status=[' + xhr.status + ']');

                err.code = xhr.status;

                callback(err);
            }
        }
    }

    function getXhrResponseHeaders(xhr: { getAllResponseHeaders: () => any; }) {
        var responseHeadersString = xhr.getAllResponseHeaders();

        return _.reduce(responseHeadersString.trim().split(/[\r\n]+/), function(headers: { [x: string]: any; }, header: string) {
            var parts = header.split(': ');
            var headerName = parts.shift();
            var headerValue = parts.join(': ');

            if (headerName) {
                headers[headerName] = headerValue;
            }

            return headers;
        }, {});
    }

    return PCastEndPoint;
});


