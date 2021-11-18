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
    'phenix-web-assert',
    'phenix-web-observable',
    '../AdminApiProxyClient',
    '../userMedia/UserMediaResolver',
    '../PCast',
    'phenix-rtc',
    '../streaming/shaka.json'
], function(_, assert, observable, AdminApiProxyClient, UserMediaResolver, PCast, rtc, shakaEnums) {
    'use strict';

    var instanceCounter = 0;
    var unauthorizedStatus = 'unauthorized';
    var capacityBackoffTimeout = 1000;
    var defaultPrerollSkipDuration = 500;
    var defaultUserActionOnlineTimeout = 20000;
    var defaultReconnectOptions = {
        maxOfflineTime: 3 * 60 * 1000,
        maxReconnectFrequency: 60 * 1000
    };

    function PCastExpress(options) {
        assert.isObject(options, 'options');

        if (options.authToken) {
            assert.isStringNotEmpty(options.authToken, 'options.authToken');
        }

        if (options.authToken && options.adminApiProxyClient) {
            throw new Error('Do not pass "options.adminApiProxyClient" if you are using "options.authToken"');
        }

        if (options.onError) {
            assert.isFunction(options.onError, 'options.onError');
        }

        if (!_.isNullOrUndefined(options.onlineTimeout)) {
            assert.isNumber(options.onlineTimeout, 'options.onlineTimeout');

            if (options.onlineTimeout < 0) {
                throw new Error('"options.onlineTimeout" must be a positive number');
            }
        }

        if (options.reconnectOptions) {
            assert.isObject(options.reconnectOptions, 'options.reconnectOptions');
            assert.isNumber(options.reconnectOptions.maxOfflineTime, 'options.reconnectOptions.maxOfflineTime');
            assert.isNumber(options.reconnectOptions.maxReconnectFrequency, 'options.reconnectOptions.maxReconnectFrequency');
        }

        if (options.adminApiProxyClient) {
            assert.isObject(options.adminApiProxyClient, 'options.adminApiProxyClient');
            assert.isFunction(options.adminApiProxyClient.createAuthenticationToken, 'options.adminApiProxyClient.createAuthenticationToken');
        }

        this._instanceId = ++instanceCounter;
        this._pcastObservable = new observable.Observable(null).extend({rateLimit: 0});
        this._sessionIdObservable = new observable.Observable(null).extend({rateLimit: 0});
        this._publishers = {};
        this._adminApiProxyClient = options.adminApiProxyClient;
        this._isInstantiated = false;
        this._reconnectCount = 0;
        this._reauthCount = 0;
        this._disposed = false;
        this._authToken = options.authToken;
        this._onError = options.onError;
        this._options = options;
        this._onlineTimeout = _.isNumber(options.onlineTimeout) ? options.onlineTimeout : defaultUserActionOnlineTimeout;
        this._reconnectOptions = options.reconnectOptions || defaultReconnectOptions;
        this._logger = null;
        this._ignoredStreamEnds = {};

        instantiatePCast.call(this);

        // After logger is instantiated
        if (!options.adminApiProxyClient) {
            if (options.backendUri || _.isString(options.backendUri)) {
                this._logger.warn('Passing options.backendUri is deprecated. Please create an instance of the sdk.net.AdminApiProxyClient and pass that instead');
            }

            if (options.authenticationData) {
                this._logger.warn('Passing options.authenticationData is deprecated. Please create an instance of the sdk.net.AdminApiProxyClient and pass that instead');
            }
        }
    }

    PCastExpress.prototype.toString = function toString() {
        return 'PCastExpress[' + this._instanceId + ']';
    };

    PCastExpress.prototype.dispose = function dispose() {
        if (this._listedForCriticalNetworkRecoveryDisposable) {
            this._listedForCriticalNetworkRecoveryDisposable.dispose();
            this._listedForCriticalNetworkRecoveryDisposable = null;
        }

        if (this._pcastObservable.getValue()) {
            this._pcastObservable.getValue().stop();
            this._pcastObservable.setValue(null);
        }

        if (this._sessionIdObservable.getValue()) {
            this._sessionIdObservable.setValue(null);
        }

        if (_.isNumber(this._instantiatePCastTimeoutId)) {
            clearTimeout(this._instantiatePCastTimeoutId);
            this._instantiatePCastTimeoutId = null;
        }

        if (this._adminApiProxyClient) {
            this._adminApiProxyClient.dispose();
        }

        if (this.sessionIdSubscription) {
            this.sessionIdSubscription.dispose();
        }

        if (this._sessionIdObservable && this._sessionIdObservable.dispose) {
            this._sessionIdObservable.dispose();
        }

        this._reconnectCount = 0;
        this._reauthCount = 0;
        this._disposed = true;

        this._logger.info('[%s] Disposed PCast Express instance', this);
    };

    PCastExpress.prototype.getPCast = function getPCast() {
        return this._pcastObservable.getValue();
    };

    PCastExpress.prototype.getPCastObservable = function() {
        return this._pcastObservable;
    };

    PCastExpress.prototype.getSessionIdObservable = function() {
        return this._sessionIdObservable;
    };

    PCastExpress.prototype.getAdminAPI = function getAdminAPI() {
        return this._adminApiProxyClient;
    };

    PCastExpress.prototype.getUserMedia = function(options, callback) {
        var that = this;

        assert.isObject(options.mediaConstraints, 'options.mediaConstraints');
        assert.isFunction(callback, 'callback');

        if (options.resolution) {
            assert.isNumber(options.resolution, 'options.resolution');
        }

        if (options.frameRate) {
            assert.isNumber(options.frameRate, 'options.frameRate');
        }

        if (options.aspectRatio) {
            assert.isStringNotEmpty(options.aspectRatio, 'options.aspectRatio');
        }

        if (options.onResolveMedia) {
            assert.isFunction(options.onResolveMedia, 'options.onResolveMedia');
        }

        if (options.onScreenShare) {
            assert.isFunction(options.onScreenShare, 'options.onScreenShare');
        }

        if (that._pcastObservable.getValue()) {
            return resolveUserMedia.call(that, that._pcastObservable.getValue(), options, callback);
        }

        var pcastSubscription = that._pcastObservable.subscribe(function(pcast) {
            if (!pcast) {
                return;
            }

            pcastSubscription.dispose();

            resolveUserMedia.call(that, pcast, options, callback);
        });
    };

    PCastExpress.prototype.publish = function publish(options, callback) {
        assert.isObject(options, 'options');
        assert.isFunction(callback, 'callback');

        if (options.capabilities) {
            assert.isArray(options.capabilities, 'options.capabilities');
        }

        if (options.connectOptions) {
            assert.isArray(options.connectOptions, 'options.connectOptions');
        }

        if (options.mediaConstraints) {
            assert.isObject(options.mediaConstraints, 'options.mediaConstraints');
        } else {
            assert.isObject(options.userMediaStream, 'options.userMediaStream');
        }

        if (options.videoElement) {
            assert.isObject(options.videoElement, 'options.videoElement');
        }

        if (options.monitor) {
            assert.isObject(options.monitor, 'options.monitor');
            assert.isFunction(options.monitor.callback, 'options.monitor.callback');

            if (options.monitor.options) {
                assert.isObject(options.monitor.options, 'options.monitor.options');
            }
        }

        if (options.publishToken) {
            assert.isStringNotEmpty(options.publishToken, 'options.publishToken');
        }

        if (options.streamToken) {
            assert.isStringNotEmpty(options.streamToken, 'options.streamToken');
        }

        if (options.publishToken && options.streamToken) {
            throw new Error('Do not pass streamToken with publishToken. Please use publishToken.');
        }

        var that = this;

        this.waitForOnline(function(error) {
            if (error) {
                return callback(error);
            }

            if (options.userMediaStream) {
                return getStreamingTokenAndPublish.call(that, options.userMediaStream, options, false, callback);
            }

            that.getUserMedia(options, function(error, response) {
                if (error) {
                    return callback(error);
                }

                if (response.status !== 'ok') {
                    return callback(null, response);
                }

                getStreamingTokenAndPublish.call(that, response.userMedia, options, true, callback);
            });
        }, options.isContinuation);
    };

    var connectOptionCapabilities = ['streaming', 'low-latency', 'on-demand', 'uld', 'vvld', 'vld', 'ld', 'sd', 'hd', 'fhd', 'uhd'];

    PCastExpress.prototype.publishRemote = function publishRemote(options, callback) {
        assert.isObject(options, 'options');
        assert.isFunction(callback, 'callback');
        assert.isStringNotEmpty(options.streamUri, 'options.streamUri');

        if (options.capabilities) {
            assert.isArray(options.capabilities, 'options.capabilities');
        }

        if (options.connectOptions) {
            assert.isArray(options.connectOptions, 'options.connectOptions');
        }

        if (options.mediaConstraints) {
            throw new Error('Invalid argument: mediaConstraints, passed on publishRemote. Local media not allowed when publishing remote content.');
        }

        if (options.videoElement) {
            throw new Error('May not preview remote stream. Please subscribe to view.');
        }

        if (options.prerollSkipDuration) {
            assert.isNumber(options.prerollSkipDuration, 'options.prerollSkipDuration');
        }

        if (options.monitor) {
            assert.isObject(options.monitor, 'options.monitor');
            assert.isFunction(options.monitor.callback, 'options.monitor.callback');

            if (options.monitor.options) {
                assert.isObject(options.monitor.options, 'options.monitor.options');
            }
        }

        if (options.frameRate) {
            assert.isObject(options.frameRate, 'options.frameRate');

            if (options.frameRate.exact) {
                assert.isNumber(options.frameRate.exact, 'options.frameRate.exact');
            }

            if (options.frameRate.max) {
                assert.isNumber(options.frameRate.max, 'options.frameRate.max');
            }
        }

        if (options.publishToken) {
            assert.isStringNotEmpty(options.publishToken, 'options.publishToken');
        }

        if (options.streamToken) {
            assert.isStringNotEmpty(options.streamToken, 'options.streamToken');
        }

        if (options.publishToken && options.streamToken) {
            throw new Error('Do not pass streamToken with publishToken. Please use publishToken.');
        }

        var that = this;

        this.waitForOnline(function(error) {
            if (error) {
                return callback(error);
            }

            var remoteOptions = _.assign({
                connectOptions: [],
                capabilities: []
            }, options);

            if (!_.includes(remoteOptions.capabilities, 'publish-uri')) {
                remoteOptions.capabilities.push('publish-uri');
            }

            _.forEach(connectOptionCapabilities, function(capability) {
                if (_.includes(remoteOptions.capabilities, capability)) {
                    remoteOptions.connectOptions.push('publisher-capability=' + capability);
                }
            });

            if (options.frameRate && options.frameRate.exact) {
                remoteOptions.connectOptions.push('source-uri-video-fps=' + options.frameRate.exact);
            }

            if (options.frameRate && options.frameRate.max) {
                remoteOptions.connectOptions.push('source-uri-video-fps-max=' + options.frameRate.max);
            }

            remoteOptions.connectOptions.push('source-uri-preroll-skip-duration=' + (_.isNumber(options.prerollSkipDuration) ? options.prerollSkipDuration : defaultPrerollSkipDuration).toString());

            getStreamingTokenAndPublish.call(that, remoteOptions.streamUri, remoteOptions, false, callback);
        });
    };

    PCastExpress.prototype.publishStreamToExternal = function publishStreamToExternal(options, callback) {
        assert.isObject(options, 'options');
        assert.isFunction(callback, 'callback');
        assert.isStringNotEmpty(options.streamId, 'options.streamId');
        assert.isStringNotEmpty(options.externalUri, 'options.externalUri');

        if (options.capabilities) {
            assert.isArray(options.capabilities, 'options.capabilities');
        }

        if (options.connectOptions) {
            assert.isArray(options.connectOptions, 'options.connectOptions');
        }

        if (options.mediaConstraints) {
            throw new Error('Invalid argument: mediaConstraints, passed on publishStreamToExternal. Local media not allowed when publishing remote content.');
        }

        if (options.videoElement) {
            throw new Error('May not preview external stream. Please subscribe to view.');
        }

        if (options.monitor) {
            assert.isObject(options.monitor, 'options.monitor');
            assert.isFunction(options.monitor.callback, 'options.monitor.callback');

            if (options.monitor.options) {
                assert.isObject(options.monitor.options, 'options.monitor.options');
            }
        }

        if (options.streamToken) {
            assert.isStringNotEmpty(options.streamToken, 'options.streamToken');
        }

        var that = this;

        this.waitForOnline(function(error) {
            if (error) {
                return callback(error);
            }

            var remoteOptions = _.assign({
                connectOptions: [],
                capabilities: []
            }, options);

            if (!_.includes(remoteOptions.capabilities, 'egress')) {
                remoteOptions.capabilities.push('egress');
            }

            if (!_.includes(remoteOptions.capabilities, 'egress-own-stream')) {
                remoteOptions.capabilities.push('egress-own-stream');
            }

            getStreamingTokenAndPublish.call(that, remoteOptions.externalUri, remoteOptions, false, callback);
        });
    };

    PCastExpress.prototype.publishScreen = function publishScreen(options, callback) {
        var publishScreenOptions = _.assign({mediaConstraints: {screen: true}}, options);

        _.set(publishScreenOptions, ['monitor', 'options'], _.assign({}, {
            monitorFrameRate: false,
            videoBitRateThreshold: 100,
            conditionCountForNotificationThreshold: 8
        }, _.get(publishScreenOptions, ['monitor', 'options'], {})));

        return this.publish(publishScreenOptions, callback);
    };

    PCastExpress.prototype.subscribe = function subscribe(options, callback) {
        assert.isObject(options, 'options');
        assert.isFunction(callback, 'callback');
        assert.isStringNotEmpty(options.streamId, 'options.streamId');

        if (options.videoElement) {
            assert.isObject(options.videoElement, 'options.videoElement');
        }

        if (options.monitor) {
            assert.isObject(options.monitor, 'options.monitor');
            assert.isFunction(options.monitor.callback, 'options.monitor.callback');

            if (options.monitor.options) {
                assert.isObject(options.monitor.options, 'options.monitor.options');
            }
        }

        if (options.streamToken) {
            assert.isStringNotEmpty(options.streamToken, 'options.streamToken');
        } else {
            assert.isObject(options.capabilities, 'options.capabilities');
        }

        if (options.subscriberOptions) {
            assert.isObject(options.subscriberOptions, 'options.subscriberOptions');
        }

        var that = this;

        this.waitForOnline(function(error) {
            if (error) {
                that._logger.error('[%s] Failed to subscribe after error waiting for online status', this, error);

                return callback(error);
            }

            if (options.streamToken) {
                return subscribeToStream.call(that, options.streamToken, options, callback);
            }

            if (!options.streamToken && !that._adminApiProxyClient) {
                throw new Error('Use stream token, or set adminApiProxyClient');
            }

            that._logger.info('[%s] [%s] Generating stream token for subscribing to origin [%s]', this, that._pcastObservable.getValue().getProtocol().getSessionId(), options.streamId);

            that._adminApiProxyClient.createStreamTokenForSubscribing(that._pcastObservable.getValue().getProtocol().getSessionId(), options.capabilities, options.streamId, null, function(error, response) {
                if (error) {
                    that._logger.error('[%s] Failed to create stream token for subscribing', this, error);

                    return callback(error);
                }

                if (response.status !== 'ok') {
                    that._logger.warn('[%s] Failed to create stream token for subscribing with status [%s]', this, response.status);

                    return callback(null, response);
                }

                subscribeToStream.call(that, response.streamToken, options, callback);
            });
        }, options.isContinuation);
    };

    PCastExpress.prototype.subscribeToScreen = function subscribeToScreen(options, callback) {
        var subscribeToScreenOptions = _.assign({}, options);

        _.set(subscribeToScreenOptions, ['monitor', 'options'], _.assign({}, {
            monitorFrameRate: false,
            videoBitRateThreshold: 100,
            conditionCountForNotificationThreshold: 8
        }, _.get(subscribeToScreenOptions, ['monitor', 'options'], {})));

        return this.subscribe(subscribeToScreenOptions, callback);
    };

    PCastExpress.prototype.waitForOnline = function waitForOnline(callback, isNotUserAction) {
        assert.isFunction(callback, 'callback');

        if (this._pcastObservable.getValue() && this._pcastObservable.getValue().getStatus() === 'online') {
            return callback();
        }

        var that = this;
        var disposeOfWaitTimeout = isNotUserAction ? _.get(that._reconnectOptions, ['maxOfflineTime']) : this._onlineTimeout;
        var pcastSubscription = null;
        var statusSubscription = null;
        var onlineTimeoutId = setTimeout(function() {
            that._logger.info('[%s] Disposing of online listener after [%s] ms', this, disposeOfWaitTimeout);

            if (pcastSubscription) {
                pcastSubscription.dispose();
            }

            if (statusSubscription) {
                statusSubscription.dispose();
            }

            if (that._disposed) {
                that._logger.info('[%s] Instance was disposed while waiting for online, ignoring callback', this);

                return;
            }

            callback(new Error('timeout'));
        }, disposeOfWaitTimeout);

        this._logger.info('[%s] Waiting for online status before continuing. Timeout set to [%s]', this, disposeOfWaitTimeout);

        var subscribeToStatusChange = function(pcast) {
            if (statusSubscription) {
                statusSubscription.dispose();
            }

            if (!pcast) {
                return;
            }

            statusSubscription = pcast.getObservableStatus().subscribe(function(status) {
                if (that._disposed) {
                    that._logger.info('[%s] Instance was disposed while waiting for online, canceling waiting and skip triggering callback', this);

                    clearTimeout(onlineTimeoutId);
                    statusSubscription.dispose();
                    pcastSubscription.dispose();

                    return;
                }

                if (status !== 'online') {
                    that._logger.info('[%s] Still waiting for online status before continuing. Current status is [%s]', this, status);

                    return;
                }

                clearTimeout(onlineTimeoutId);
                statusSubscription.dispose();
                pcastSubscription.dispose();

                return callback();
            }, {initial: 'notify'});
        };

        pcastSubscription = this._pcastObservable.subscribe(subscribeToStatusChange, {initial: 'notify'});
    };

    PCastExpress.prototype.parseCapabilitiesFromToken = function parseCapabilitiesFromToken(streamToken) {
        var pcast = this._pcastObservable.getValue();

        return pcast.parseCapabilitiesFromToken(streamToken);
    };

    PCastExpress.prototype.parseRoomOrChannelIdFromToken = function parseRoomOrChannelIdFromToken(streamToken) {
        var pcast = this._pcastObservable.getValue();

        return pcast.parseRoomOrChannelIdFromToken(streamToken);
    };

    PCastExpress.prototype.parseRoomOrChannelAliasFromToken = function parseRoomOrChannelAliasFromToken(streamToken) {
        var pcast = this._pcastObservable.getValue();

        return pcast.parseRoomOrChannelAliasFromToken(streamToken);
    };

    function instantiatePCast() {
        var that = this;

        var authenticationCallback = function(_, status) {
            if (status === 'critical-network-issue') {
                return onPCastStatusChange.call(that, status);
            }
        };

        if (!this._pcastObservable.getValue()) {
            var pcastOptions = _.assign({logger: this._logger}, this._options);

            this._pcastObservable.setValue(new PCast(pcastOptions));
        }

        if (!this._logger) {
            this._logger = this._pcastObservable.getValue().getLogger();
        }

        if (!this._pcastStatusSubscription) {
            this._pcastStatusSubscription = this._pcastObservable.getValue().getObservableStatus().subscribe(_.bind(onPCastStatusChange, this));
        }

        if (this.sessionIdSubscription) {
            this.sessionIdSubscription.dispose();
        }

        var handleSessionIdChange = function(sessionId) {
            this._sessionIdObservable.setValue(sessionId);
        };

        this.sessionIdSubscription = this._pcastObservable.getValue().getObservableSessionId().subscribe(_.bind(handleSessionIdChange, this));

        if (this._authToken) {
            return this._pcastObservable.getValue().start(this._authToken, authenticationCallback, _.noop, _.noop);
        }

        if (!this._authToken && !that._adminApiProxyClient) {
            throw new Error('Use auth token, or set adminApiProxyClient');
        }

        this._adminApiProxyClient.createAuthenticationToken(function(error, response) {
            if (error && error.message === 'timeout') {
                return onPCastStatusChange.call(that, error.message);
            }

            if (error) {
                return handleError.call(that, error);
            }

            if (response.status !== 'ok') {
                return onPCastStatusChange.call(that, response.status);
            }

            if (!that._pcastObservable.getValue()) {
                that._logger.warn('[%s] Unable to authenticate. PCast not instantiated.', this);

                return;
            }

            that._pcastObservable.getValue().start(response.authenticationToken, _.noop, _.noop, _.noop);
        });
    }

    function onPCastStatusChange(status) {
        switch (status) {
        case 'timeout':
        case 'critical-network-issue':
            if (this._pcastObservable.getValue()) {
                this._pcastObservable.getValue().stop('recovery');
                this._pcastObservable.setValue(null);
            }

            if (this._sessionIdObservable.getValue()) {
                this._sessionIdObservable.setValue(null);
            }

            if (this._pcastStatusSubscription) {
                this._pcastStatusSubscription.dispose();
                this._pcastStatusSubscription = null;
            }

            this._reconnectCount++;

            return instantiateWithBackoff.call(this);
        case 'reconnect-failed':
        case 'unauthorized':
            delete this._authToken;

            if (!this._adminApiProxyClient) {
                return handleError.call(this, new Error(status));
            }

            this._reauthCount++;

            if (this._reauthCount > 1) {
                return handleError.call(this, new Error(status));
            }

            this._logger.info('[%s] Attempting to create new authToken and re-connect after [%s] response', this, unauthorizedStatus);

            return getAuthTokenAndReAuthenticate.call(this);
        case 'capacity':
        case 'network-unavailable':
            this._reconnectCount++;

            return instantiateWithBackoff.call(this);
        case 'online':
            if (!this._isInstantiated) {
                this._logger.info('[%s] Successfully instantiated', this);
            } else {
                this._logger.info('[%s] Successfully reconnected (reconnectCount=[%s],reauthCount=[%s])', this, this._reconnectCount, this._reauthCount);
            }

            this._reauthCount = 0;
            this._reconnectCount = 0;
            this._isInstantiated = true;

            return;
        case 'reconnecting':
        case 'reconnected':
        case 'connecting':
            break; // Everything ok
        case 'offline':
            return;
        case 'failed':
        default:
            return handleError.call(this, new Error(status));
        }
    }

    function instantiateWithBackoff() {
        var that = this;
        var staticTimeout = Math.min(capacityBackoffTimeout * that._reconnectCount * that._reconnectCount, this._reconnectOptions.maxReconnectFrequency);
        var maxOffsetInSeconds = Math.min(staticTimeout / 10000, 5);
        var randomLinearOffset = Math.random() * maxOffsetInSeconds * 1000;
        var timeoutWithRandomOffset = staticTimeout + randomLinearOffset;

        this._logger.info('[%s] Waiting for [%s] ms before continuing to attempt to reconnect to PCast', this, timeoutWithRandomOffset);

        this._instantiatePCastTimeoutId = setTimeout(function() {
            if (!that._pcastObservable.getValue() || !that._pcastObservable.getValue().isStarted()) {
                return instantiatePCast.call(that);
            }

            return getAuthTokenAndReAuthenticate.call(that);
        }, timeoutWithRandomOffset);
    }

    function getAuthTokenAndReAuthenticate() {
        var that = this;

        this._adminApiProxyClient.createAuthenticationToken(function(error, response) {
            if (error && error.message === 'timeout') {
                return onPCastStatusChange.call(that, error.message);
            }

            if (error) {
                return handleError.call(that, error);
            }

            if (response.status !== 'ok') {
                return onPCastStatusChange.call(that, response.status);
            }

            if (!that._pcastObservable.getValue()) {
                that._logger.warn('[%s] Unable to authenticate. PCast not instantiated.', this);

                return;
            }

            that._pcastObservable.getValue().reAuthenticate(response.authenticationToken);
        });
    }

    function handleError(e) {
        if (!this._onError) {
            throw e;
        }

        this._onError(e);
    }

    function resolveUserMedia(pcast, options, callback) {
        var userMediaResolver = new UserMediaResolver(pcast, {
            aspectRatio: options.aspectRatio,
            resolution: options.resolution,
            frameRate: options.frameRate,
            resolutionSelectionStrategy: options.resolutionSelectionStrategy,
            onScreenShare: function(screenOptions) {
                screenOptions = options.onScreenShare ? options.onScreenShare(screenOptions) : screenOptions;

                if (screenOptions.resolution) {
                    assert.isNumber(screenOptions.resolution, 'clientOptions.resolution');
                }

                if (screenOptions.frameRate) {
                    assert.isNumber(screenOptions.frameRate, 'screenOptions.frameRate');
                }

                if (screenOptions.aspectRatio) {
                    assert.isStringNotEmpty(screenOptions.aspectRatio, 'screenOptions.aspectRatio');
                }

                return _.assign({resolution: screenOptions.resolution}, screenOptions);
            }
        });

        userMediaResolver.getUserMedia(options.mediaConstraints, function(error, response) {
            if (error) {
                return callback(error);
            }

            if (options.onResolveMedia) {
                options.onResolveMedia(response.options);
            }

            callback(null, _.assign({status: 'ok'}, response));
        });
    }

    function getStreamingTokenAndPublish(userMediaOrUri, options, cleanUpUserMediaOnStop, callback) {
        var that = this;

        if (options.publishToken) {
            try {
                var capabilitiesFromPublishToken = that.parseCapabilitiesFromToken(options.publishToken);

                options.capabilities = capabilitiesFromPublishToken;
            } catch (e) {
                return callback(new Error('Bad `publishToken`', e), {status: 'bad-token'});
            }

            return publishUserMediaOrUri.call(that, options.publishToken, userMediaOrUri, options, cleanUpUserMediaOnStop, callback);
        }

        if (options.streamToken) {
            try {
                var capabilitiesFromStreamToken = that.parseCapabilitiesFromToken(options.streamToken);

                options.capabilities = capabilitiesFromStreamToken;
            } catch (e) {
                return callback(new Error('Bad `streamToken`', e), {status: 'bad-token'});
            }

            return publishUserMediaOrUri.call(that, options.streamToken, userMediaOrUri, options, cleanUpUserMediaOnStop, callback);
        }

        if (options.capabilities) {
            assert.isArray(options.capabilities, 'options.capabilities');
        }

        that.waitForOnline(function(error) {
            if (error) {
                that._logger.error('[%s] Failed to create stream token for publishing after waiting for online status', this, error);

                return callback(error);
            }

            var sessionId = that._pcastObservable.getValue().getProtocol().getSessionId();
            var isEgress = _.includes(options.capabilities, 'egress');
            var generateStreamToken = _.bind(that._adminApiProxyClient.createStreamTokenForPublishing, that._adminApiProxyClient, sessionId, options.capabilities);

            if (isEgress) {
                generateStreamToken = _.bind(that._adminApiProxyClient.createStreamTokenForPublishingToExternal, that._adminApiProxyClient, sessionId, options.capabilities, options.streamId);
            }

            that._logger.info('[%s] [%s] Creating stream token for publishing', this, sessionId);

            generateStreamToken(function(error, response) {
                if (error) {
                    that._logger.error('[%s] [%s] Failed to create stream token for publishing', this, sessionId, error);

                    return callback(error);
                }

                if (response.status !== 'ok') {
                    that._logger.warn('[%s] [%s] Failed to create stream token for publishing with status [%s]', this, sessionId, response.status);

                    return callback(null, response);
                }

                publishUserMediaOrUri.call(that, response.streamToken, userMediaOrUri, options, cleanUpUserMediaOnStop, callback);
            });
        }, options.isContinuation);
    }

    function publishUserMediaOrUri(streamToken, userMediaOrUri, options, cleanUpUserMediaOnStop, callback) {
        var that = this;
        var hasAlreadyAttachedMedia = false;
        var cachedPublisher = null;

        if (options.tags) {
            assert.isArray(options.tags, 'options.tags');
        }

        if (options.connectOptions) {
            assert.isArray(options.connectOptions, 'options.connectOptions');
        }

        var publishCallback = function publishCallback(pcast, status, publisher) {
            var retryPublisher = function retryPublisher(reason) {
                var optionsWithToken = _.assign({
                    streamToken: streamToken,
                    isContinuation: true
                }, options);

                that._logger.warn('[%s] Retrying publisher after failure with reason [%s]', this, reason);

                that._ignoredStreamEnds[publisher.getStreamId()] = true;

                if (reason === 'camera-track-failure') {
                    publisher.stop(reason, false);
                    that.publish(options, callback);
                } else {
                    publisher.stop(reason, true);
                    getStreamingTokenAndPublish.call(that, userMediaOrUri, optionsWithToken, cleanUpUserMediaOnStop, callback);
                }
            };

            if ((status === unauthorizedStatus && ((options.streamToken || options.publishToken) || !options.authFailure)) || status === 'timeout') {
                that._logger.info('[%s] Attempting to create new streamToken and re-publish after [%s] response', this, unauthorizedStatus);

                var reAuthOptions = _.assign({
                    isContinuation: true,
                    authFailure: true
                }, options);

                delete reAuthOptions.streamToken;
                delete reAuthOptions.publishToken;

                return getStreamingTokenAndPublish.call(that, userMediaOrUri, reAuthOptions, cleanUpUserMediaOnStop, callback);
            }

            if (status !== 'ok') {
                that._logger.warn('[%s] Failure to publish with status [%s]', this, status);

                if (cachedPublisher) {
                    that._ignoredStreamEnds[cachedPublisher.getStreamId()] = true;
                }

                return callback(null, {status: status});
            }

            delete options.authFailure;

            that._publishers[publisher.getStreamId()] = publisher;

            cachedPublisher = publisher;

            var isPublisher = true;
            var noopCallback = function() {};

            var publisherEndedCallback = _.bind(onPublisherOrStreamEnd, that, noopCallback, retryPublisher, isPublisher);

            if (options.monitor) {
                var monitorCallback = _.bind(onMonitorCallback, that, options.monitor.callback, retryPublisher);

                publisher.monitor(options.monitor.options || {}, monitorCallback);

                publisherEndedCallback = _.bind(onPublisherOrStreamEnd, that, options.monitor.callback, retryPublisher, isPublisher);
            }

            publisher.setPublisherEndedCallback(publisherEndedCallback);

            var expressPublisher = createExpressPublisher.call(that, publisher, options.videoElement, cleanUpUserMediaOnStop);

            if (options.videoElement && !hasAlreadyAttachedMedia) {
                rtc.attachMediaStream(options.videoElement, userMediaOrUri, function(e) {
                    if (e) {
                        that._logger.warn('[%s] [%s] Failed to attach publish media stream to video element.', this, publisher.getStreamId(), e);

                        return;
                    }
                });

                hasAlreadyAttachedMedia = true;
            }

            callback(null, {
                status: 'ok',
                publisher: expressPublisher
            });
        };

        that.waitForOnline(function(error) {
            if (error) {
                return callback(error);
            }

            that._pcastObservable.getValue().publish(streamToken, userMediaOrUri, publishCallback, options.tags, {connectOptions: options.connectOptions});
        }, options.isContinuation);
    }

    function subscribeToStream(streamToken, options, callback) {
        var that = this;
        var cachedSubsciber = null;

        var handleSubscribe = function(pcast, status, subscriber) {
            var retrySubscriber = function retrySubscriber(reason) {
                var retryOptions = _.assign({isContinuation: true}, options);

                that._ignoredStreamEnds[subscriber.getStreamId()] = true;

                subscriber.stop(reason);

                that._logger.warn('[%s] [%s] Stream failure occurred with reason [%s]. Attempting to recover from failure.', this, options.streamId, reason);

                subscribeToStream.call(that, streamToken, retryOptions, callback);
            };

            if (((!options.skipRetryOnUnauthorized && status === unauthorizedStatus && (options.streamToken || !options.authFailure)) || status === 'timeout') && that._adminApiProxyClient) {
                that._logger.info('[%s] [%s] Attempting to create new streamToken and re-subscribe after [%s] response', this, options.streamId, unauthorizedStatus);

                var reAuthOptions = _.assign({
                    isContinuation: true,
                    authFailure: true
                }, options);

                delete reAuthOptions.streamToken;

                return that.subscribe(reAuthOptions, callback);
            }

            if (status === 'streaming-not-ready') {
                that._logger.warn('[%s] Failure to subscribe with status [%s]. Try again in a few seconds.', this, status);

                return callback(null, {
                    status: status,
                    retry: _.bind(retrySubscriber, that, status)
                });
            }

            if (status !== 'ok') {
                that._logger.warn('[%s] Failure to subscribe with status [%s]', this, status);

                if (cachedSubsciber) {
                    that._ignoredStreamEnds[cachedSubsciber.getStreamId()] = true;
                }

                return callback(null, {status: status});
            }

            delete options.authFailure;

            var renderer;

            cachedSubsciber = subscriber;

            if (options.videoElement) {
                renderer = subscriber.createRenderer();

                renderer.start(options.videoElement);
            }

            var isPublisher = false;
            var noopCallback = _.noop;
            var subscriberEndedCallback = _.bind(onPublisherOrStreamEnd, that, noopCallback, retrySubscriber, isPublisher);

            if (options.monitor) {
                var monitorCallback = _.bind(onMonitorCallback, that, options.monitor.callback, retrySubscriber);

                subscriber.monitor(options.monitor.options || {}, monitorCallback);

                subscriberEndedCallback = _.bind(onPublisherOrStreamEnd, that, options.monitor.callback, retrySubscriber, isPublisher);
            }

            subscriber.setStreamEndedCallback(subscriberEndedCallback);

            var expressSubscriber = createExpressSubscriber.call(that, subscriber, renderer);
            var subscribeResponse = {
                status: 'ok',
                mediaStream: expressSubscriber
            };

            subscriber.setStreamErrorCallback(function(playerRenderer, errorType, error) {
                if (errorType === 'real-time' && error.message === 'connection-timeout') {
                    return retrySubscriber.call(that, error.message);
                }

                if (errorType === 'shaka' && error.severity !== shakaEnums.errorSeverity.critical.id) {
                    return; // Ignore error
                }

                var RECOVERABLE = 1;

                if (errorType === 'phenix-player' && error.severity === RECOVERABLE) {
                    that._logger.warn('[%s] [%s] Recoverable error occurred while playing stream with Express API. Attempting to subscribe again.', this, expressSubscriber.getStreamId(), error);

                    var reAuthOptions = _.assign({isContinuation: true}, options);

                    delete reAuthOptions.streamToken;

                    return that.subscribe(reAuthOptions, callback);
                }

                that._logger.warn('[%s] [%s] Error occurred while playing stream with Express API. Stopping stream.', this, expressSubscriber.getStreamId(), error);

                expressSubscriber.stop();

                return callback(error);
            });

            if (renderer) {
                subscribeResponse.renderer = renderer;
            }

            callback(null, subscribeResponse);
        };

        that.waitForOnline(function(error) {
            if (error) {
                return callback(error);
            }

            var subscriberOptions = _.clone(options.subscriberOptions || {});

            if (options.streamId) {
                subscriberOptions.originStreamId = options.streamId;
            }

            that._pcastObservable.getValue().subscribe(streamToken, handleSubscribe, subscriberOptions);
        }, options.isContinuation);
    }

    function createExpressPublisher(publisher, videoElement, cleanUpUserMediaOnStop) {
        var that = this;
        var publisherStop = _.bind(publisher.stop, publisher);

        publisher.stop = function(reason, isInternal) {
            that._logger.info('[%s] [%s] Stopping publisher with reason [%s]', that, publisher.getStreamId(), reason);

            publisherStop(reason);

            if (videoElement) {
                videoElement.src = '';
                videoElement.srcObject = null;
            }

            if (cleanUpUserMediaOnStop && publisher.getStream() && !isInternal) {
                var nativeMediaStream = publisher.getStream();

                if (nativeMediaStream) {
                    nativeMediaStream.getTracks().forEach(function(track) {
                        track.stop();
                    });
                }
            }
        };

        publisher.enableAudio = function() {
            return setStreamAudioTracksState.call(that, publisher, true);
        };

        publisher.disableAudio = function() {
            return setStreamAudioTracksState.call(that, publisher, false);
        };

        publisher.enableVideo = function() {
            return setStreamVideoTracksState.call(that, publisher, true);
        };

        publisher.disableVideo = function() {
            return setStreamVideoTracksState.call(that, publisher, false);
        };

        // Publisher Ended Callback handled with normal callback route for express
        publisher.setPublisherEndedCallback = function() {};

        return publisher;
    }

    function createExpressSubscriber(subscriber, renderer) {
        var that = this;
        var subscriberStop = _.bind(subscriber.stop, subscriber);

        subscriber.stop = function(reason) {
            that._logger.info('[%s] [%s] Stopping subscriber with reason [%s]', that, subscriber, reason);

            if (renderer) {
                renderer.stop(reason);
            }

            subscriberStop(reason);
        };

        subscriber.enableAudio = function() {
            return setStreamAudioTracksState(subscriber.getStream(), true);
        };

        subscriber.disableAudio = function() {
            return setStreamAudioTracksState(subscriber.getStream(), false);
        };

        subscriber.enableVideo = function() {
            return setStreamVideoTracksState(subscriber.getStream(), true);
        };

        subscriber.disableVideo = function() {
            return setStreamVideoTracksState(subscriber.getStream(), false);
        };

        // Stream Ended Callback handled with normal callback route for express
        subscriber.setStreamEndedCallback = function() {};

        return subscriber;
    }

    function setStreamAudioTracksState(publisher, newState) {
        var pcast = this.getPCast();

        if (!pcast) {
            return;
        }

        var streamId = publisher.getStreamId();
        var peerConnectionDescription = pcast.getRemoteDescriptionSdp(streamId);

        if (!peerConnectionDescription) {
            return;
        }

        var stream = publisher.getStream();
        var audioIndex = peerConnectionDescription.lastIndexOf('m=audio');

        if (audioIndex < 0) {
            return;
        }

        var endIndex = peerConnectionDescription.lastIndexOf('m=video');

        if (endIndex < audioIndex) {
            endIndex = peerConnectionDescription.length;
        }

        var trackConfiguration = peerConnectionDescription.substring(
            audioIndex,
            endIndex
        );

        if (trackConfiguration.includes('a=inactive')) {
            return;
        }

        if (!stream) {
            return;
        }

        setTracksEnabled(stream.getAudioTracks(), newState);

        return newState;
    }

    function setStreamVideoTracksState(publisher, newState) {
        var pcast = this.getPCast();

        if (!pcast) {
            return;
        }

        var streamId = publisher.getStreamId();
        var peerConnectionDescription = pcast.getRemoteDescriptionSdp(streamId);

        if (!peerConnectionDescription) {
            return;
        }

        var stream = publisher.getStream();
        var videoIndex = peerConnectionDescription.lastIndexOf('m=video');

        if (videoIndex < 0) {
            return;
        }

        var endIndex = peerConnectionDescription.lastIndexOf('m=audio');

        if (endIndex < videoIndex) {
            endIndex = peerConnectionDescription.length;
        }

        var trackConfiguration = peerConnectionDescription.substring(
            videoIndex,
            endIndex
        );

        if (trackConfiguration.includes('a=inactive')) {
            return;
        }

        if (!stream) {
            return;
        }

        setTracksEnabled(stream.getVideoTracks(), newState);

        return newState;
    }

    function setTracksEnabled(tracks, enabled) {
        assert.isArray(tracks, 'tracks');

        _.forEach(tracks, function(track) {
            track.updateState(enabled);
        });
    }

    function onMonitorCallback(callback, retry, stream, reason, monitorEvent) { // eslint-disable-line no-unused-vars
        switch (reason) {
        case 'camera-track-failure':
        case 'client-side-failure':
            callback(null, _.assign({
                status: reason,
                retry: _.bind(retry, null, reason)
            }, monitorEvent));

            // Handle failure event, redo stream
            break;
        default:
            // No failure has occurred, handle monitor event
            break;
        }
    }

    function onPublisherOrStreamEnd(monitorCallback, retry, isPublisher, publisherOrStream, reason, description) {
        var response = {
            status: 'stream-ended',
            reason: reason,
            description: description
        };

        if (this._ignoredStreamEnds[publisherOrStream.getStreamId()]) {
            this._logger.info('[%s] Ignoring stream end due to recovery in progress [%s]', this, publisherOrStream.getStreamId());

            return;
        }

        switch (reason) {
        case 'egress-setup-failed': // Bad input params
        case 'ended': // Normal operation
        case 'censored': // Forced to stop
            var endedResponse = {
                status: reason,
                reason: reason,
                description: description
            };

            if (isPublisher) {
                endedResponse.publisher = publisherOrStream;
            } else {
                endedResponse.mediaStream = publisherOrStream;
            }

            return monitorCallback(null, endedResponse);
        case 'custom':
            // Client ended publisher, do nothing
            return monitorCallback(null, response);
        case 'egress-failed':
        case 'capacity':
            // Don't inform the client, attempt to re-publish automatically after backoff
            setTimeout(function() {
                if (this._disposed) {
                    return;
                }

                return retry(reason);
            }, capacityBackoffTimeout);

            return;
        case 'failed':
        case 'maintenance':
        case 'overload':
            // Don't inform the client, attempt to re-publish automatically
            return retry(reason);
        case 'app-background':
        default:
            // Give client option to re-publish
            response.retry = retry;

            return monitorCallback(null, response);
        }
    }

    return PCastExpress;
});