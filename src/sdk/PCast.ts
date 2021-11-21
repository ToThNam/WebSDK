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

import { 
    arg0_callback_createPublisher, 
    callback_StreamAddedListener, 
    endPoint_ResolveUri, 
    event_dataQuality, 
    event_streamEnded, 
    options_monitor, 
    options_PCast, 
    options_PCast_subscribe, 
    peerConnection_areAllPeerConnectionsOffline, 
    peerConnection_setupStateListener, 
    publisher_forOwn, 
    response_authenticate, 
    response_Authenticate, 
    response_SetupStream, 
    statesetup_StreamAddedListener, 
    streamTelemetry_StreamAddedListener, 
    track_forEach,
    mediaConstraints,
    createOptions_createViewerPeerConnection,
    response_setAnswerDescription,
    options_createChunkedOrRtmpViewer,
    response_addIceCandidates,
    peerConnection_closePeerConnection
} from "../../typescript/src/sdk/Pcast";

define('',[
    'phenix-web-lodash-light',
    'phenix-web-assert',
    'phenix-web-observable',
    'phenix-web-disposable',
    './logging/pcastLoggerFactory',
    'phenix-web-http',
    'phenix-web-application-activity-detector',
    './environment',
    './audio/AudioContext',
    './PCastProtocol',
    './PCastEndPoint',
    './userMedia/ScreenShareExtensionManager',
    './userMedia/UserMediaProvider',
    './streaming/PeerConnectionMonitor',
    './DimensionsChangedMonitor',
    './telemetry/metricsTransmitterFactory',
    './telemetry/StreamTelemetry',
    './telemetry/SessionTelemetry',
    './streaming/PeerConnection',
    './streaming/StreamWrapper',
    './streaming/PhenixLiveStream',
    './streaming/PhenixRealTimeStream',
    './streaming/FeatureDetector',
    './streaming/stream.json',
    './streaming/BitRateMonitor',
    'phenix-rtc',
    './sdpUtil'
], function(_, assert, observable, disposable, pcastLoggerFactory, http, applicationActivityDetector, environment, AudioContext, PCastProtocol, PCastEndPoint, ScreenShareExtensionManager, UserMediaProvider, PeerConnectionMonitor, DimensionsChangedMonitor, metricsTransmitterFactory, StreamTelemetry, SessionTelemetry, PeerConnection, StreamWrapper, PhenixLiveStream, PhenixRealTimeStream, FeatureDetector, streamEnums, BitRateMonitor, phenixRTC, sdpUtil) {
    'use strict';

    var sdkVersion = '%SDKVERSION%';
    var accumulateIceCandidatesDuration = 50;
    var roomOrChannelIdRegex = /^(?:room|channel)Id[:](.*)$/;
    var roomOrChannelAliasRegex = /^(?:room|channel)Alias[:](.*)$/;

    function PCast(this: any, options: options_PCast) {
        options = options || {};

        assert.isObject(options, 'options');

        if (options.streamingSourceMapping) {
            assert.isObject(options.streamingSourceMapping, 'options.streamingSourceMapping');
            assert.isStringNotEmpty(options.streamingSourceMapping.replacement, 'options.streamingSourceMapping.replacement');

            if (!(options.streamingSourceMapping.patternToReplace instanceof RegExp)) {
                assert.isStringNotEmpty(options.streamingSourceMapping.patternToReplace, 'options.streamingSourceMapping.patternToReplace');
            }
        }

        if (!_.isNullOrUndefined(options.disableMultiplePCastInstanceWarning)) {
            assert.isBoolean(options.disableMultiplePCastInstanceWarning, 'options.disableMultiplePCastInstanceWarning');
        }

        if (!_.isNullOrUndefined(options.disableGlobalErrorListener)) {
            assert.isBoolean(options.disableGlobalErrorListener, 'options.disableGlobalErrorListener');
        }

        if (!_.isNullOrUndefined(options.disableBeforeUnload)) {
            assert.isBoolean(options.disableBeforeUnload, 'options.disableBeforeUnload');
        }

        if (!_.isNullOrUndefined(options.disableConsoleLogging)) {
            assert.isBoolean(options.disableConsoleLogging, 'options.disableConsoleLogging');
        }

        if (!_.isNullOrUndefined(options.loggingLevel)) {
            assert.isNumber(options.loggingLevel, 'options.loggingLevel');
        }

        if (!_.isNullOrUndefined(options.treatBackgroundAsOffline)) {
            assert.isBoolean(options.treatBackgroundAsOffline, 'options.treatBackgroundAsOffline');
        }

        if (!_.isNullOrUndefined(options.reAuthenticateOnForeground)) {
            assert.isBoolean(options.reAuthenticateOnForeground, 'options.reAuthenticateOnForeground');
        }

        if (options.treatBackgroundAsOffline === true && options.reAuthenticateOnForeground === false) {
            this._logger.warn('Conflicting options "reAuthenticateOnForeground" can not be false when "treatBackgroundAsOffline" is true. Will reauthenticate upon entering foreground.');
        }

        if (options.shakaLoader) {
            assert.isFunction(options.shakaLoader, 'options.shakaLoader');
        }

        if (options.webPlayerLoader) {
            assert.isFunction(options.webPlayerLoader, 'options.webPlayerLoader');
        }

        this._observableStatus = new observable.Observable('offline');
        this._networkRTT = new observable.Observable(0);
        this._observableSessionId = new observable.Observable(null);
        this._baseUri = options.uri || PCastEndPoint.DefaultPCastUri;
        this._deviceId = options.deviceId || '';
        this._version = sdkVersion;
        this._logger = options.logger || pcastLoggerFactory.createPCastLogger(this._baseUri, options.disableConsoleLogging, options.loggingLevel);
        this._metricsTransmitter = options.metricsTransmitter || metricsTransmitterFactory.createMetricsTransmitter(this._baseUri);
        this._screenShareExtensionManager = new ScreenShareExtensionManager(options, this._logger);
        this._shakaLoader = options.shakaLoader;
        this._webPlayerLoader = options.webPlayerLoader;
        this._rtmpOptions = options.rtmp || {};
        this._streamingSourceMapping = options.streamingSourceMapping;
        this._disposables = new disposable.DisposableList();
        this._disableMultiplePCastInstanceWarning = options.disableMultiplePCastInstanceWarning;
        this._treatBackgroundAsOffline = options.treatBackgroundAsOffline === true;
        this._reAuthenticateOnForeground = options.reAuthenticateOnForeground === true;
        this._authenticateCallId = 0;
        this._reAuthenticateCallId = 0;
        this._canPlaybackAudio = true;
        this._h264ProfileIds = [];
        this._supportedWebrtcCodecs = [];
        this._featureDetector = new FeatureDetector(options.features);
        this._pendingIceCandidates = {};
        this._addIceCandidatesTimeoutScheduled = {};

        var that = this;
        var supportedFeatures = _.filter(this._featureDetector.getFeatures(), FeatureDetector.isFeatureSupported);
        var logGlobalError = function logGlobalError(event: { error: string; }) {
            var errorToLog = event ? event.error : 'Unknown Error';
            that._logger.error('Window Error Event Triggered with pcast in [%s] state [%s]', that._observableStatus.getValue(), /* Once for browsers that don't show stack traces */ errorToLog, errorToLog);
        };

        this._logger.info('Device supports features [%s], user selected [%s]', supportedFeatures, this._featureDetector.getFeatures());

        _.addEventListener(phenixRTC.global, 'unload', function() {
            that._logger.info('Window Unload Event Triggered');

            return that.stop('window-unload');
        });

        if (!options.disableGlobalErrorListener) {
            _.addEventListener(phenixRTC.global, 'error', logGlobalError);

            if (phenixRTC.global.__phenixGlobalErrorListenerDisposable) {
                phenixRTC.global.__phenixGlobalErrorListenerDisposable.dispose();
            }

            phenixRTC.global.__phenixGlobalErrorListenerDisposable = new disposable.Disposable(function() {
                _.removeEventListener(phenixRTC.global, 'unload', logGlobalError);
            });
        }

        if (!options.disableBeforeUnload) {
            _.addEventListener(phenixRTC.global, 'beforeunload', function() {
                that._logger.info('Window Before Unload Event Triggered');

                return that.stop('window-beforeunload');
            });
        }

        if (!phenixRTC.webrtcSupported && phenixRTC.browser === 'ReactNative') {
            phenixRTC.shim();
        }

        // We need to check connection status because FF can create PC only with network status online
        if (phenixRTC.webrtcSupported && this._observableStatus.getValue() === 'online') {
            setEnvironmentCodecDefaults.call(this);
            setAudioState.call(this);
        }
    }

    PCast.prototype.getBaseUri = function() {
        return this._baseUri;
    };

    PCast.prototype.getStatus = function() {
        return this._observableStatus.getValue();
    };

    PCast.prototype.getObservableStatus = function() {
        return this._observableStatus;
    };

    PCast.prototype.getRemoteDescriptionSdp = function(streamId: string) {
        assert.isStringNotEmpty(streamId, 'streamId');

        if (!this._peerConnections) {
            return;
        }

        return _.get(this._peerConnections, [streamId, 'remoteDescription', 'sdp']);
    };

    PCast.prototype.isStarted = function() {
        return this._started;
    };

    PCast.prototype.reAuthenticate = function(authToken: string) {
        assert.isStringNotEmpty(authToken, 'authToken');

        if (this._observableStatus.getValue() === 'online') {
            return this._logger.warn('Already authenticated. Denying request to re-authenticate');
        }

        this._logger.info('Attempting to re-authenticate with new auth token [%s]', authToken);

        this._authToken = authToken;

        reconnected.call(this);
    };

    PCast.prototype.start = function(authToken: string, authenticationCallback: any, onlineCallback: any, offlineCallback: any) {
        assert.isStringNotEmpty(authToken, 'authToken');
        assert.isFunction(authenticationCallback, 'authenticationCallback');
        assert.isFunction(onlineCallback, 'onlineCallback');
        assert.isFunction(offlineCallback, 'offlineCallback');

        if (this._started) {
            throw new Error('"Already started"');
        }

        if (!_.isNumber(phenixRTC.global.__phenixInstantiatedPCastCount)) {
            phenixRTC.global.__phenixInstantiatedPCastCount = 1;
        } else {
            phenixRTC.global.__phenixInstantiatedPCastCount++;
        }

        if (phenixRTC.global.__phenixInstantiatedPCastCount > 1 && !this._disableMultiplePCastInstanceWarning) {
            this._logger.warn('Avoid using multiple instances of PCast as this uses unnecessary resources and will reduce performance. This is your [%s] simultaneous instance. Remember to dispose all resources when done with them by calling .stop() or .dispose()',
                phenixRTC.global.__phenixInstantiatedPCastCount);
        }

        this._stopped = false;
        this._started = true;
        this._authToken = authToken;
        this._authenticationCallback = authenticationCallback;
        this._onlineCallback = onlineCallback;
        this._offlineCallback = offlineCallback;
        this._sessionTelemetry = new SessionTelemetry(this._logger, this._metricsTransmitter);
        this._endPoint = new PCastEndPoint(this._version, this._baseUri, this._logger, this._sessionTelemetry);

        transitionToStatus.call(this, 'connecting');

        this._peerConnections = {};
        this._mediaStreams = {};
        this._iceCandidateCallbacks = {};
        this._publishers = {};
        this._gumStreams = [];

        this._disposables.add(this._endPoint);
        this._disposables.add(this._sessionTelemetry);
        this._disposables.add(applicationActivityDetector.onBackground(_.bind(handleBackground, this)));
        this._disposables.add(applicationActivityDetector.onForeground(_.bind(handleForeground, this)));

        var that = this;

        that._endPoint.resolveUri(function(err: { code: any; }, endPoint: endPoint_ResolveUri) {
            if (err) {
                that._logger.error('Failed to connect to [%s]', that._baseUri, err);

                if (that._authenticationCallback) {
                    switch (err.code) {
                    case 0:
                        that._authenticationCallback.call(that, that, 'network-unavailable', '');

                        break;
                    case 503:
                        that._authenticationCallback.call(that, that, 'capacity', '');

                        break;
                    default:
                        that._authenticationCallback.call(that, that, 'critical-network-issue', '');

                        return;
                    }
                }

                transitionToStatus.call(that, 'offline');

                that._stopped = true;
                that._started = false;

                return;
            }

            that._logger.info('Discovered end point [%s] with RTT [%s]', endPoint.uri, endPoint.roundTripTime);

            that._networkOneWayLatency = endPoint.roundTripTime / 2;
            that._resolvedEndPoint = endPoint.uri;

            if (!that._started) {
                return;
            }

            instantiateProtocol.call(that, endPoint.uri);
        });
    };

    PCast.prototype.stop = function(reason: string) {
        reason = reason || '';

        assert.isString(reason, 'reason');

        if (!this._started) {
            return;
        }

        this._logger.info('Stopping pcast instance with reason [%s]', reason);

        this._stopped = true;
        this._started = false;

        delete this._authenticationCallback;

        try {
            var that = this;

            _.forOwn(this._mediaStreams, function(mediaStream: any, streamId: string) {
                endStream.call(that, streamId, reason);
            });
            _.forOwn(this._publishers, function(publisher: publisher_forOwn, publisherStreamId: string) {
                endStream.call(that, publisherStreamId, reason);

                if (!_.includes(publisher.getOptions(), 'detached')) {
                    publisher.stop(reason, true);
                }
            });
            _.forOwn(this._peerConnections, function(mediaStream: any, peerConnectionStreamId: string) {
                endStream.call(that, peerConnectionStreamId, reason);
            });
            _.forEach(this._gumStreams, function(gumStream: { getTracks: () => any; }) {
                var tracks = gumStream.getTracks();

                _.forEach(tracks, function(track: { stop: () => void; }) {
                    track.stop();
                });
            });
        } catch (e) {
            that._logger.warn('Pcast stop caught an error', e);
        } finally {
            if (this._protocol) {
                try {
                    this._protocol.disconnect();
                } catch (e) {
                    that._logger.warn('Failed to disconnect pcast', e);
                }

                this._protocol = null;
            }

            if (this._logger.setObservableSessionId) {
                this._logger.setObservableSessionId(null);
            }

            if (this._sessionTelemetrySubscription) {
                this._sessionTelemetrySubscription.dispose();
                this._sessionTelemetry.setSessionId(null);
            }

            if (this._sessionIdSubscription) {
                this._sessionIdSubscription.dispose();
                this._observableSessionId.setValue(null);
            }

            phenixRTC.global.__phenixInstantiatedPCastCount--;

            this._disposables.dispose();
        }
    };

    PCast.prototype.getUserMedia = function(options: any, callback: any, onScreenShare: any) {
        if (phenixRTC.browser === 'IE') {
            throw new Error('Publishing not supported on IE');
        }

        assert.isObject(options, 'options');
        assert.isFunction(callback, 'callback');

        if (onScreenShare) {
            assert.isFunction(onScreenShare, 'onScreenShare');
        }

        var userMediaProvider = new UserMediaProvider(this._logger, this._screenShareExtensionManager, onScreenShare);

        return userMediaProvider.getUserMedia(options, callback);
    };

    PCast.prototype.publish = function(streamToken: string, streamToPublish: any, callback: any, tags: string | string[], options: { connectUri?: string; }) {
        if (phenixRTC.browser === 'IE') {
            throw new Error('Publishing not supported on IE');
        }

        if (!this._started) {
            throw new Error('PCast not started. Unable to publish. Please start pcast first.');
        }

        tags = tags || [];
        options = options || {};

        assert.isStringNotEmpty(streamToken, 'streamToken');
        assert.isFunction(callback, 'callback');
        assert.isArray(tags, 'tags');
        assert.isObject(options, 'options');

        if (!_.isObject(streamToPublish) && !_.isString(streamToPublish)) {
            throw new Error('"streamToPublish" must be an object or URI');
        }

        var that = this;
        var streamType = 'upload';
        var setupStreamOptions = _.assign({}, options, {negotiate: true});

        if (_.isString(streamToPublish)) {
            setupStreamOptions.negotiate = false;
            setupStreamOptions.connectUri = streamToPublish;
        } else {
            setupStreamOptions.connectUri = options.connectUri;
        }

        if (tags.length > 0) {
            setupStreamOptions.tags = tags;
        }

        var streamTelemetry = new StreamTelemetry(this.getProtocol().getSessionId(), this._logger, this._metricsTransmitter);

        streamTelemetry.setProperty('resource', streamType);
        this._protocol.setupStream(streamType, streamToken, setupStreamOptions, that._networkOneWayLatency * 2, function(error: any, response: response_SetupStream) {
            if (error) {
                that._logger.error('Failed to create uploader [%s]', error);

                return callback.call(that, that, 'failed');
            } else if (response.status !== 'ok') {
                that._logger.warn('Failed to create uploader, status [%s]', response.status);

                switch (response.status) {
                case 'timeout':
                case 'capacity':
                case 'unauthorized':
                    return callback.call(that, that, response.status);
                default:
                    return callback.call(that, that, 'failed');
                }
            } else {
                var streamId = response.createStreamResponse.streamId;

                streamTelemetry.setStreamId(streamId);
                streamTelemetry.setStartOffset(response.createStreamResponse.offset);
                streamTelemetry.recordMetric('Provisioned');
                streamTelemetry.recordMetric('RoundTripTime', {uint64: that._networkOneWayLatency * 2}, null, {
                    resource: that._resolvedEndPoint,
                    kind: 'https'
                });

                if (setupStreamOptions.negotiate === true) {
                    var offerSdp = response.createStreamResponse.createOfferDescriptionResponse.sessionDescription.sdp;
                    var peerConnectionConfig = applyVendorSpecificLogic(parseProtobufMessage(response.createStreamResponse.rtcConfiguration));

                    if (phenixRTC.browser === 'Opera' && that._h264ProfileIds.length > 0) {
                        // For publishing we need any profile and level that is equal to or greater than the offer's profile and level
                        var profileLevelIdToReplace = _.get(sdpUtil.getH264ProfileIds(offerSdp), [0]);
                        var preferredLevelId = sdpUtil.getH264ProfileIdWithSameProfileAndEqualToOrHigherLevel(that._h264ProfileIds, profileLevelIdToReplace);

                        if (!preferredLevelId) {
                            that._logger.warn('[%s] Unable to find h264 profile level id to replace [%s]. Rejected environment defaults of [%s]',
                                streamId, profileLevelIdToReplace, that._h264ProfileIds);
                        } else if (profileLevelIdToReplace !== preferredLevelId) {
                            that._logger.info('[%s] Replacing publisher h264 profile level id [%s] with new value [%s] in offer sdp',
                                streamId, profileLevelIdToReplace, preferredLevelId);

                            offerSdp = sdpUtil.replaceH264ProfileId(offerSdp, profileLevelIdToReplace, preferredLevelId);
                        }
                    }

                    return createPublisherPeerConnection.call(that, peerConnectionConfig, streamToPublish, streamId, offerSdp, streamTelemetry, function(phenixPublisher: any, error: any) {
                        streamTelemetry.recordMetric('SetupCompleted', {string: error ? 'failed' : 'ok'});

                        if (error) {
                            callback.call(that, that, 'failed', null);
                        } else {
                            callback.call(that, that, 'ok', phenixPublisher);
                        }
                    }, options, response.createStreamResponse.options);
                }

                return createPublisher.call(that, streamId, function(phenixPublisher: any, error: any) {
                    streamTelemetry.recordMetric('SetupCompleted', {string: error ? 'failed' : 'ok'});

                    if (error) {
                        callback.call(that, that, 'failed', null);
                    } else {
                        callback.call(that, that, 'ok', phenixPublisher);
                    }
                }, response.createStreamResponse.options);
            }
        });
    };

    PCast.prototype.subscribe = function(streamToken: string, callback: any, options: options_PCast_subscribe) {
        if (!this._started) {
            throw new Error('PCast not started. Unable to subscribe. Please start pcast first.');
        }

        options = options || {};

        assert.isStringNotEmpty(streamToken, 'streamToken');
        assert.isFunction(callback, 'callback');
        assert.isObject(options, 'options');

        var that = this;

        setAudioState.call(that, function() {
            var streamType = 'download';
            var setupStreamOptions = _.assign({}, options, {negotiate: options.negotiate !== false});
            var streamTelemetry = new StreamTelemetry(that.getProtocol().getSessionId(), that._logger, that._metricsTransmitter);
            var createViewerOptions = _.assign({}, options);

            createViewerOptions.canPlaybackAudio = that._canPlaybackAudio;

            createViewerOptions.capabilities = that.parseCapabilitiesFromToken(streamToken);

            if (!that._canPlaybackAudio && options.disableAudioIfNoOutputFound && options.receiveAudio !== false) {
                setupStreamOptions.receiveAudio = false;
                createViewerOptions.receiveAudio = false;
                createViewerOptions.forcedAudioDisabled = true;
            }

            if (options.originStreamId) {
                setupStreamOptions.originStreamId = options.originStreamId;
            }

            streamTelemetry.setProperty('resource', streamType);

            that._protocol.setupStream(streamType, streamToken, setupStreamOptions, that._networkOneWayLatency * 2, function(error: any, response: response_SetupStream) {
                if (error) {
                    that._logger.error('Failed to create downloader [%s]', error);

                    return callback.call(that, that, 'failed');
                } else if (response.status !== 'ok') {
                    that._logger.warn('Failed to create downloader, status [%s]', response.status);

                    return callback.call(that, that, response.status);
                }

                var streamId = response.createStreamResponse.streamId;
                var offerSdp = response.createStreamResponse.createOfferDescriptionResponse.sessionDescription.sdp;
                var peerConnectionConfig = applyVendorSpecificLogic(parseProtobufMessage(response.createStreamResponse.rtcConfiguration));
                var create = _.bind(createViewerPeerConnection, that, peerConnectionConfig);
                var isNotRealTime = !(offerSdp.match(/m=audio /) || offerSdp.match(/m=video /)) && (offerSdp.match(/a=x-playlist:/) || offerSdp.match(/a=x-rtmp:/));

                if (isNotRealTime) {
                    create = createChunkedOrRtmpViewer;
                }

                streamTelemetry.setStreamId(streamId);
                streamTelemetry.setStartOffset(response.createStreamResponse.offset);
                streamTelemetry.recordMetric('Provisioned');
                streamTelemetry.recordMetric('RoundTripTime', {uint64: that._networkOneWayLatency * 2}, null, {
                    resource: that.getBaseUri(),
                    kind: 'https'
                });

                createViewerOptions.originStartTime = _.now() - response.createStreamResponse.offset + that._networkOneWayLatency;

                if (!isNotRealTime && ((phenixRTC.browser === 'Chrome' && phenixRTC.browserVersion >= 62 && FeatureDetector.isMobile()) || phenixRTC.browser === 'Opera') && that._h264ProfileIds.length > 0) {
                    // For subscribing we need any profile and level that is equal to or greater than the offer's profile and level
                    var profileLevelIdToReplace = _.get(sdpUtil.getH264ProfileIds(offerSdp), [0]);
                    var preferredLevelId = sdpUtil.getH264ProfileIdWithSameOrHigherProfileAndEqualToOrHigherLevel(that._h264ProfileIds, profileLevelIdToReplace);

                    if (!preferredLevelId) {
                        that._logger.warn('[%s] Unable to find new subscriber h264 profile level id to replace [%s]. Rejected environment defaults of [%s]',
                            streamId, profileLevelIdToReplace, that._h264ProfileIds);
                    } else if (profileLevelIdToReplace !== preferredLevelId) {
                        that._logger.info('[%s] Replacing subscriber h264 profile level id [%s] with new value [%s] in offer sdp',
                            streamId, profileLevelIdToReplace, preferredLevelId);

                        offerSdp = sdpUtil.replaceH264ProfileId(offerSdp, profileLevelIdToReplace, preferredLevelId);
                    }
                }

                return create.call(that, streamId, offerSdp, streamTelemetry, function(phenixMediaStream: any, error: any) {
                    streamTelemetry.recordMetric('SetupCompleted', {string: error ? 'failed' : 'ok'});

                    if (error) {
                        callback.call(that, that, 'failed', null);
                    } else {
                        callback.call(that, that, 'ok', phenixMediaStream);
                    }
                }, createViewerOptions);
            });
        });
    };

    PCast.prototype.getProtocol = function() {
        return this._protocol;
    };

    PCast.prototype.getLogger = function() {
        return this._logger;
    };

    PCast.prototype.getObservableSessionId = function() {
        return this._observableSessionId;
    };

    PCast.prototype.toString = function() {
        var protocol = this.getProtocol();
        var sessionId = protocol ? protocol.getSessionId() : '';

        return 'PCast[' + sessionId || 'unauthenticated' + ',' + (protocol ? protocol.toString() : 'uninitialized') + ']';
    };

    PCast.prototype.parseCapabilitiesFromToken = function(streamToken: string) {
        return _.get(parseToken.call(this, streamToken), ['capabilities'], []);
    };

    PCast.prototype.parseRoomOrChannelIdFromToken = function(streamToken: string) {
        var requiredTag = _.get(parseToken.call(this, streamToken), ['requiredTag'], '');
        var idMatch = requiredTag.match(roomOrChannelIdRegex);

        return idMatch ? idMatch[1] : null;
    };

    PCast.prototype.parseRoomOrChannelAliasFromToken = function(streamToken: string) {
        var requiredTag = _.get(parseToken.call(this, streamToken), ['requiredTag'], '');
        var aliasMatch = requiredTag.match(roomOrChannelAliasRegex);

        return aliasMatch ? aliasMatch[1] : null;
    };

    function parseToken(this: any, streamToken: string) {
        if (!_.startsWith(streamToken, 'DIGEST:')) {
            this._logger.warn('Failed to parse the `streamToken` [%s]', streamToken);

            throw new Error('Bad `streamToken`');
        }

        try {
            var base64Token = streamToken.split(':')[1];
            var decodedToken = phenixRTC.global.atob(base64Token);
            var token = JSON.parse(decodedToken).token;
            var tokenOptions = JSON.parse(token);

            return tokenOptions;
        } catch (e: any) {
            var sessionId = this.getProtocol().getSessionId();
            this._logger.warn('[%s] Failed to parse the `streamToken` [%s]', sessionId, streamToken);

            throw new Error(e);
        }
    }

    function instantiateProtocol(this: any, uri: string) {
        this._protocol = new PCastProtocol(uri, this._deviceId, this._version, this._logger);

        this._protocol.onEvent('connected', _.bind(connected, this));
        this._protocol.onEvent('reconnecting', _.bind(reconnecting, this));
        this._protocol.onEvent('reconnected', _.bind(reconnected, this));
        this._protocol.onEvent('disconnected', _.bind(disconnected, this));
        this._protocol.onEvent('pcast.StreamEnded', _.bind(streamEnded, this));
        this._protocol.onEvent('pcast.StreamDataQuality', _.bind(dataQuality, this));

        if (this._logger.setObservableSessionId) {
            this._logger.setObservableSessionId(this._protocol.getObservableSessionId());
        }

        if (this._sessionTelemetrySubscription) {
            this._sessionTelemetrySubscription.dispose();
            this._sessionTelemetry.setSessionId(null);
        }

        if (this._sessionIdSubscription) {
            this._sessionIdSubscription.dispose();
        }

        var handleSessionIdChange = function(this: any, sessionId: string) {
            this._observableSessionId.setValue(sessionId);
        };

        this._sessionIdSubscription = this._protocol.getObservableSessionId().subscribe(_.bind(handleSessionIdChange, this));

        this._sessionTelemetrySubscription = this._protocol.getObservableSessionId().subscribe(_.bind(this._sessionTelemetry.setSessionId, this._sessionTelemetry));
    }

    function connected(this: any) {
        var that = this;

        if (that._stopped) {
            that._logger.warn('[%s] Skip connect due to stopped state', that);

            return;
        }

        if (areAllPeerConnectionsOffline.call(that) && that._observableStatus.getValue() === 'offline') {
            this._logger.warn('[PCast] connected after being offline. Reconnecting.');

            reconnecting.call(that);
        }

        this._connected = true;

        var protocol = that._protocol;
        var authenticateCallId = ++that._authenticateCallId;

        protocol.authenticate(that._authToken, function(error: any, response: response_Authenticate) {
            if (protocol !== that._protocol) {
                that._logger.info('Ignoring authentication response as reset took place');

                return;
            }

            if (authenticateCallId !== that._authenticateCallId) {
                that._logger.info('Ignoring authentication response as a latter request is already underway');

                return;
            }

            if (that._authenticationCallback) {
                if (error) {
                    that._logger.error('Failed to authenticate [%s]', error);
                    transitionToStatus.call(that, 'unauthorized');
                    that._authenticationCallback.call(that, that, 'unauthorized', '');
                } else if (response.status !== 'ok') {
                    that._logger.warn('Failed to authenticate, status [%s]', response.status);
                    transitionToStatus.call(that, 'unauthorized');
                    that._authenticationCallback.call(that, that, 'unauthorized', '');
                } else {
                    transitionToStatus.call(that, 'online');

                    that._authenticationCallback.call(that, that, response.status, response.sessionId);
                }
            }
        });
    }

    function reconnecting(this: any) {
        transitionToStatus.call(this, 'reconnecting');
    }

    function reconnected(this: any, optionalReason?: any) {
        if (optionalReason) {
            assert.isString('reason', optionalReason);
        }

        transitionToStatus.call(this, 'reconnected', optionalReason);

        this._logger.info('Attempting to re-authenticate after reconnected event [%s]', optionalReason);

        reAuthenticate.call(this);
    }

    function reAuthenticate(this: any) {
        var that = this;

        if (that._stopped) {
            that._logger.info('Skip re-authentication due to stopped state');

            return;
        }

        var protocol = that._protocol;
        var reAuthenticateCallId = ++that._reAuthenticateCallId;

        protocol.authenticate(that._authToken, function(error: any, response: response_authenticate) {
            var suppressCallbackIfNeverDisconnected = that._connected === true;

            if (protocol !== that._protocol) {
                that._logger.info('Ignoring re-authentication response as reset took place');

                return;
            }

            if (reAuthenticateCallId !== that._reAuthenticateCallId) {
                that._logger.info('Ignoring re-authentication response as a latter request is already underway');

                return;
            }

            if (error) {
                that._logger.error('Unable to authenticate after reconnect to WebSocket [%s]', error);

                return transitionToStatus.call(that, 'reconnect-failed');
            }

            if (response.status !== 'ok') {
                that._logger.warn('Unable to authenticate after reconnect to WebSocket, status [%s]', response.status);

                var reason = response.status === 'capacity' ? response.status : 'reconnect-failed';

                return transitionToStatus.call(that, reason);
            }

            that._connected = true;

            that._logger.info('Successfully authenticated after reconnect to WebSocket');

            return transitionToStatus.call(that, 'online', null, suppressCallbackIfNeverDisconnected);
        });
    }

    function disconnected(this: any) {
        if (areAllPeerConnectionsOffline.call(this) && this._observableStatus.getValue() === 'reconnecting') {
            this._logger.warn('[PCast] disconnected after attempting to reconnect. Going offline.');

            transitionToStatus.call(this, 'critical-network-issue');

            return this.stop('critical-network-issue');
        }

        this._connected = false;
        transitionToStatus.call(this, 'offline');
    }

    function areAllPeerConnectionsOffline(this: any) {
        return _.reduce(this._peerConnections, function(isOffline: any, peerConnection: peerConnection_areAllPeerConnectionsOffline) {
            if (!isOffline) {
                return isOffline;
            }

            return peerConnection.iceConnectionState === 'closed';
        }, true);
    }

    function streamEnded(this: any, event: event_streamEnded) {
        var streamId = event.streamId;
        var reason = event.reason;

        return endStream.call(this, streamId, reason);
    }

    function dataQuality(this: any, event: event_dataQuality) {
        var streamId = event.streamId;
        var status = event.status;
        var reason = event.reason;

        var internalMediaStream = this._mediaStreams[streamId];

        if (internalMediaStream) {
            internalMediaStream.dataQualityChangedCallback(status, reason);
        }

        var publisher = this._publishers[streamId];

        if (publisher && _.isFunction(publisher.dataQualityChangedCallback)) {
            publisher.dataQualityChangedCallback(publisher, status, reason);
        }
    }

    function endStream(this: any, streamId: string , reason: string) {
        this._logger.info('[%s] Stream ended with reason [%s]', streamId, reason);

        var internalMediaStream = this._mediaStreams[streamId];

        if (internalMediaStream) {
            internalMediaStream.streamEndedCallback(StreamWrapper.getStreamEndedStatus(reason), reason, true);
        }

        delete this._mediaStreams[streamId];

        var publisher = this._publishers[streamId];

        if (publisher && _.isFunction(publisher.publisherEndedCallback)) {
            publisher.publisherEndedCallback(publisher, StreamWrapper.getStreamEndedStatus(reason), reason);
        }

        delete this._publishers[streamId];

        var peerConnection = this._peerConnections[streamId];

        if (peerConnection) {
            closePeerConnection.call(this, streamId, peerConnection, 'ended');
        }

        delete this._peerConnections[streamId];
    }

    function setupStreamAddedListener(this: any, streamId: string , state: statesetup_StreamAddedListener , peerConnection: any, streamTelemetry: streamTelemetry_StreamAddedListener, callback: callback_StreamAddedListener, options: any) {
        var that = this;
        var added = false;
        var setupTimeoutId: NodeJS.Timeout;
        var streamSetupInterval = 3000;
        var onAddStream = function onAddStream(event: { stream: any; }) {
            if (state.failed || added) {
                return;
            }

            var numberOfActiveTracks = sdpUtil.getNumberOfActiveSections(peerConnection);
            var masterStream = event.stream || _.get(event, ['streams', 0]);
            var kind = 'real-time';

            if (!masterStream) {
                state.failed = true;
                that._logger.warn('[%s] No remote stream', streamId);

                return callback.call(that, undefined, 'failed');
            }

            if (setupTimeoutId) {
                clearTimeout(setupTimeoutId);
            }

            if (numberOfActiveTracks !== masterStream.getTracks().length && phenixRTC.browser !== 'ReactNative') {
                setupTimeoutId = setTimeout(function() {
                    state.failed = true;
                    that._logger.warn('[%s] Did not receive all tracks within [%s] ms', streamId, streamSetupInterval);

                    return callback.call(that, undefined, 'failed');
                }, streamSetupInterval);

                return;
            }

            added = true;

            that._logger.info('[%s] Got remote stream', streamId);

            streamTelemetry.setProperty('kind', kind);

            var streamOptions = _.assign({networkLag: that._networkOneWayLatency}, options);
            var realTimeStream = new PhenixRealTimeStream(streamId, masterStream, peerConnection, streamTelemetry, streamOptions, that._logger);
            var realTimeStreamDecorator = new StreamWrapper(kind, realTimeStream, that._logger);

            var onError = function onError(source: any, event: any) {
                that._logger.info('Phenix Real-Time stream error [%s] [%s]', source, event);

                realTimeStreamDecorator.streamErrorCallback(kind, event);
            };

            var onStop = function destroyMasterMediaStream(reason: any) {
                if (state.stopped || !that._protocol) {
                    return;
                }

                that._logger.info('[%s] media stream has stopped with reason [%s]', streamId, reason);

                closePeerConnection.call(that, streamId, peerConnection, 'stop');

                that._protocol.destroyStream(streamId, reason || '', function(error: any, response: { status: string; }) {
                    if (error) {
                        that._logger.error('[%s] failed to destroy stream [%s]', streamId, error);

                        return;
                    } else if (response.status !== 'ok') {
                        that._logger.warn('[%s] failed to destroy stream, status [%s]', streamId, response.status);

                        return;
                    }

                    that._logger.info('[%s] destroyed stream', streamId);
                });

                state.stopped = true;
            };

            realTimeStreamDecorator.on(streamEnums.streamEvents.playerError.name, onError);
            realTimeStreamDecorator.on(streamEnums.streamEvents.stopped.name, onStop);

            that._mediaStreams[streamId] = realTimeStreamDecorator;

            callback.call(that, realTimeStream);
        };

        _.addEventListener(peerConnection, 'addstream', onAddStream);
        _.addEventListener(peerConnection, 'track', onAddStream);
    }

    function setupIceCandidateListener(this: any, streamId: string, peerConnection: any, callback: (arg0: any) => void) {
        var that = this;
        var onIceCandidate = function onIceCandidate(event: { candidate: any; }) {
            var candidate = event.candidate;

            if (candidate) {
                that._logger.info('[%s] ICE candidate: [%s] [%s] [%s]', streamId, candidate.sdpMid, candidate.sdpMLineIndex, candidate.candidate);
            } else {
                that._logger.info('[%s] ICE candidate discovery complete', streamId);
            }

            if (callback) {
                callback(candidate);
            }
        };

        _.addEventListener(peerConnection, 'icecandidate', onIceCandidate);
    }

    function setupStateListener(this: any, streamId: string, peerConnection: peerConnection_setupStateListener) {
        var that = this;
        var onNegotiationNeeded = function onNegotiationNeeded(event: any) { // eslint-disable-line no-unused-vars
            that._logger.info('[%s] Negotiation needed', streamId);
        };

        var onIceConnectionStateChanged = function onIceConnectionStateChanged(event: any) { // eslint-disable-line no-unused-vars
            that._logger.info('[%s] ICE connection state changed [%s]', streamId, peerConnection.iceConnectionState);
        };

        var onIceGatheringStateChanged = function onIceGatheringStateChanged(event: any) { // eslint-disable-line no-unused-vars
            that._logger.info('[%s] ICE gathering state changed [%s]', streamId, peerConnection.iceGatheringState);
        };

        var onSignalingStateChanged = function onSignalingStateChanged(event: any) { // eslint-disable-line no-unused-vars
            that._logger.info('[%s] Signaling state changed [%s]', streamId, peerConnection.signalingState);
        };

        var onConnectionStateChanged = function onConnectionStateChanged(event: any) { // eslint-disable-line no-unused-vars
            that._logger.info('[%s] Connection state changed [%s]', streamId, peerConnection.connectionState);
        };

        _.addEventListener(peerConnection, 'negotiationneeded', onNegotiationNeeded);
        _.addEventListener(peerConnection, 'iceconnectionstatechange', onIceConnectionStateChanged);
        _.addEventListener(peerConnection, 'icegatheringstatechange ', onIceGatheringStateChanged);
        _.addEventListener(peerConnection, 'signalingstatechange', onSignalingStateChanged);
        _.addEventListener(peerConnection, 'connectionstatechange', onConnectionStateChanged);
    }

    function createPublisher(this: any, streamId: string | number, callback: any, streamOptions: any) {
        var that = this;
        var state = {stopped: false};

        var publisher = {
            getStreamId: function getStreamId() {
                return streamId;
            },

            getStream: function getStream() {
                that._logger.debug('[%s] Unable to get stream for remote origin.', streamId);

                return null;
            },

            getStats: function getStats() {
                that._logger.debug('[%s] Unable to get stream stats for remote origin.', streamId);

                return null;
            },

            isActive: function isActive() {
                return !state.stopped;
            },

            hasEnded: function hasEnded() {
                return state.stopped;
            },

            stop: function stop(reason: any) {
                if (state.stopped) {
                    return;
                }

                that._logger.info('[%s] stopping publisher with reason [%s]', streamId, reason);

                that._protocol.destroyStream(streamId, reason || '', function(error: any, response: { status: string; }) {
                    if (error) {
                        that._logger.error('[%s] failed to destroy stream [%s]', streamId, error);

                        return;
                    } else if (response.status !== 'ok') {
                        that._logger.warn('[%s] failed to destroy stream, status [%s]', streamId, response.status);

                        return;
                    }

                    that._logger.info('[%s] destroyed stream', streamId);
                });

                state.stopped = true;
            },

            setPublisherEndedCallback: function setPublisherEndedCallback(callback: any) {
                assert.isFunction(callback, 'callback');

                this.publisherEndedCallback = callback;
            },

            setDataQualityChangedCallback: function setDataQualityChangedCallback(callback: any) {
                assert.isFunction(callback, 'callback');

                this.dataQualityChangedCallback = callback;
            },

            getOptions: function getOptions() {
                return streamOptions;
            },

            monitor: function monitor(options: any, callback: any) {
                assert.isObject(options, 'options');
                assert.isFunction(callback, 'callback');
            },

            getMonitor: function getMonitor() {
                return null;
            }
        };

        that._publishers[streamId] = publisher;

        callback(publisher);
    }

    function setEnvironmentCodecDefaults(this: any) {
        var that = this;
        var peerConnection = new phenixRTC.RTCPeerConnection();

        // TODO(DY) remove when updating to webrtc-adapter version 5.0.5 or greater
        if (phenixRTC.browser === 'Safari' && phenixRTC.browserVersion > 10) {
            peerConnection.addTransceiver('audio');
            peerConnection.addTransceiver('video');
        }

        try {
            var handleOffer = function handleOffer(offer: { sdp: any; }) {
                var h264ProfileIds = sdpUtil.getH264ProfileIds(offer.sdp);

                that._supportedWebrtcCodecs = sdpUtil.getSupportedCodecs(offer.sdp);

                that._logger.info('Supported WebRTC video codecs [%s]', that._supportedWebrtcCodecs);

                if (h264ProfileIds.length === 0) {
                    return that._logger.info('Unable to find local h264 profile level id', offer.sdp);
                }

                that._logger.info('Found local h264 profile level ids [%s]', h264ProfileIds, offer.sdp);

                that._h264ProfileIds = h264ProfileIds;

                if (peerConnection.close) {
                    peerConnection.close();
                }
            };

            var handleFailure = function(e: any) {
                that._logger.error('Unable to create offer to get local h264 profile level id', e);

                if (peerConnection.close) {
                    peerConnection.close();
                }
            };

            var constraints = {
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
            };

            if (typeof phenixRTC.global.Promise === 'function') {
                return peerConnection.createOffer(constraints)
                    .then(handleOffer)
                    .catch(handleFailure);
            }

            peerConnection.createOffer(handleOffer, handleFailure, constraints);
        } catch (e) {
            that._logger.error('Failed to set environment defaults. Creating the Offer failed', e);

            if (peerConnection.close) {
                peerConnection.close();
            }
        }
    }

    function setAudioState(this: any, done?: () => void) {
        var that = this;

        switch (phenixRTC.browser) {
        case 'Edge':
            return phenixRTC.getDestinations(function(destinations: any) {
                var audioDestinations = _.filter(destinations, function(destination: { kind: string; }) {
                    return destination.kind === 'audio';
                });

                if (audioDestinations.length === 0) {
                    if (that._canPlaybackAudio) {
                        that._logger.info('Detected no audio devices attached to machine');
                    }

                    that._canPlaybackAudio = false;
                } else {
                    that._canPlaybackAudio = true;
                }

                if (done) {
                    done();
                }
            });
        default:
            if (done) {
                done();
            }

            break;
        }
    }

    function createPublisherPeerConnection(this: any, peerConnectionConfig: any, mediaStream: { getTracks: () => any; }, streamId: string, offerSdp: string, streamTelemetry: streamTelemetry_StreamAddedListener, callback: any, streamOptions: any,value:any) {
        var that = this;
        var state = {
            failed: false,
            stopped: false
        };
        var hasCrypto = offerSdp.match(/a=crypto:/i);
        var hasDataChannel = offerSdp.match(/m=application /i);
        var peerConnection = new phenixRTC.RTCPeerConnection(peerConnectionConfig, {
            'optional': [
                {DtlsSrtpKeyAgreement: !hasCrypto}, {RtpDataChannels: hasDataChannel}
            ]
        });
        var remoteMediaStream: any = null;
        var publisherMonitor: any = null;

        shimPeerConnectionGetStreams(peerConnection);

        that._peerConnections[streamId] = peerConnection;

        peerConnection.addStream(mediaStream);

        if (phenixRTC.browser === 'Firefox' || phenixRTC.browser === 'Edge') {
            if (offerSdp.match(/(\nm=video)/g) && offerSdp.match(/(\nm=audio)/g)) {
                var firstSection = /(a=candidate)((.|\n)*)(?=m=)/g;

                offerSdp = offerSdp.replace(firstSection, offerSdp.match(firstSection) + 'a=end-of-candidates\n');
            }

            offerSdp += 'a=end-of-candidates';

            offerSdp = offerSdp.replace(/(\na=ice-options:trickle)/g, '');
        }

        var onFailure = function onFailure(status: any) {
            if (state.failed) {
                return;
            }

            if (status instanceof Error) {
                that._logger.info('[%s] Failed to setup peer connection', streamId, status);

                status = 'failed';
            }

            state.failed = true;
            state.stopped = true;

            delete that._peerConnections[streamId];
            delete that._publishers[streamId];
            delete that._iceCandidateCallbacks[streamId];

            closePeerConnection.call(that, streamId, peerConnection, 'failure');

            callback.call(that, undefined, status || 'failed');
        };

        var createPublisher = function createPublisher() {
            var bandwidthAttribute = /(b=AS:([0-9]*)[\n\r]*)/gi;
            var video = /(mid:video)([\n\r]*)/gi;
            var limit = 0;
            var bandwithAttribute: any = bandwidthAttribute.exec(offerSdp);

            if (bandwithAttribute && bandwithAttribute.length >= 3) {
                limit = bandwithAttribute[2] * 1000;
            }

            var publisher = {
                getStreamId: function getStreamId() {
                    return streamId;
                },

                getStream: function getStream() {
                    return mediaStream;
                },

                isActive: function isActive() {
                    return !state.stopped;
                },

                hasEnded: function hasEnded() {
                    switch (peerConnection.iceConnectionState) {
                    case 'new':
                    case 'checking':
                    case 'connected':
                    case 'completed':
                        return false;
                    case 'disconnected':
                    case 'failed':
                    case 'closed':
                        return true;
                    default:
                        return true;
                    }
                },

                stop: function stop(reason: string) {
                    if (state.stopped || !that._protocol) {
                        return;
                    }

                    that._logger.info('[%s] stopping publisher with reason [%s]', streamId, reason || 'client-action');

                    closePeerConnection.call(that, streamId, peerConnection, 'closed');

                    that._protocol.destroyStream(streamId, reason || '', function(error: any, response: { status: string; }) {
                        if (error) {
                            that._logger.error('[%s] failed to destroy stream [%s]', streamId, error);

                            return;
                        } else if (response.status !== 'ok') {
                            that._logger.warn('[%s] failed to destroy stream, status [%s]', streamId, response.status);

                            return;
                        }

                        that._logger.info('[%s] destroyed stream', streamId);
                    });

                    state.stopped = true;
                },

                setPublisherEndedCallback: function setPublisherEndedCallback(callback: any) {
                    assert.isFunction(callback, 'callback');

                    this.publisherEndedCallback = callback;
                },

                setDataQualityChangedCallback: function setDataQualityChangedCallback(callback: any) {
                    assert.isFunction(callback, 'callback');

                    this.dataQualityChangedCallback = callback;
                },

                limitBandwidth: function limitBandwidth(bandwidthLimit: number) {
                    if (phenixRTC.browser === 'Edge') {
                        return that._logger.warn('Limit bandwidth not support on [%s]', phenixRTC.browser);
                    }

                    assert.isNumber(bandwidthLimit, 'bandwidthLimit');

                    var newLimit = limit ? Math.min(bandwidthLimit, limit) : bandwidthLimit;
                    var remoteDescription = peerConnection.remoteDescription;

                    that._logger.info('Changing bandwidth limit to [%s]', newLimit);

                    var updatedSdp = remoteDescription.sdp.replace(bandwidthAttribute, '');

                    // Add new limit in kbps
                    updatedSdp = updatedSdp.replace(video, function(match: any, videoLine: any, lineEnding: any, offset: any, sdp: any) { // eslint-disable-line no-unused-vars
                        return [videoLine, lineEnding, 'b=AS:', Math.ceil(newLimit / 1000), lineEnding].join('');
                    });

                    var updatedRemoteDescription = new phenixRTC.RTCSessionDescription({
                        type: remoteDescription.type,
                        sdp: updatedSdp
                    });

                    peerConnection.setRemoteDescription(updatedRemoteDescription);

                    return {
                        dispose: function() {
                            peerConnection.setRemoteDescription(remoteDescription);
                        }
                    };
                },

                getMonitor: function getMonitor() {
                    return publisherMonitor;
                },

                monitor: function monitor(options: options_monitor, callback:  any) {
                    assert.isObject(options, 'options');
                    assert.isFunction(callback, 'callback');

                    var monitor = new PeerConnectionMonitor(streamId, peerConnection, that._logger);

                    options.direction = 'outbound';
                    options.setNetworkRTT = function(rtt) {
                        that._networkRTT.setValue(rtt);
                    };
                    monitor.start(options, function activeCallback() {
                        return that._publishers[streamId] === publisher && !state.stopped;
                    }, function monitorCallback(error: any, monitorEvent: { reasons: any; }) {
                        if (error) {
                            that._logger.warn('[%s] Publisher monitor triggered unrecoverable error [%s]', error);
                        }

                        that._logger.warn('[%s] Publisher triggered monitor condition for [%s]', streamId, monitorEvent.reasons);

                        return callback(publisher, 'client-side-failure', monitorEvent);
                    });

                    _.forEach(mediaStream.getTracks(), function(track: track_forEach) {
                        _.addEventListener(track, 'readystatechange', function() {
                            if (track.readyState === 'ended') {
                                that._logger.warn('[%s] Publisher track has failed [%s]', streamId, track);

                                return callback(publisher, 'camera-track-failure', {
                                    type: track.kind + '-track-ended',
                                    message: 'Publisher ' + track.kind + ' track has ended in an unrecoverable way. This may require reconfiguring your camera or microphone.'
                                });
                            }
                        });
                    });

                    publisherMonitor = monitor;

                    return monitor;
                },

                addBitRateThreshold: function addBitRateThreshold(threshold: any, callback: any) {
                    var bitRateMonitor = new BitRateMonitor('Publisher', publisherMonitor, function getLimit() {
                        return limit;
                    });

                    return bitRateMonitor.addThreshold(threshold, callback);
                },

                setRemoteMediaStreamCallback: function setRemoteMediaStreamCallback(callback: any) {
                    assert.isFunction(callback, 'callback');

                    this.remoteMediaStreamCallback = callback;

                    if (remoteMediaStream) {
                        callback(publisher, remoteMediaStream);
                    }
                },

                getOptions: function getOptions() {
                    return streamOptions;
                },

                getStats: function getStats(callback: any) {
                    assert.isFunction(callback, 'callback');

                    if (!this._lastStats) {
                        this._lastStats = {};
                    }

                    var that = this;

                    return phenixRTC.getStats(peerConnection, null, function(stats: any) {
                        callback(PeerConnection.convertPeerConnectionStats(stats, that._lastStats));
                    });
                },

                networkRTT: that._networkRTT
            };

            that._publishers[streamId] = publisher;

            callback.call(that, publisher);
        };

        setupStreamAddedListener.call(that, streamId, state, peerConnection, streamTelemetry, function(mediaStream: any) {
            var publisher = that._publishers[streamId];

            remoteMediaStream = mediaStream;

            if (publisher && publisher.remoteMediaStreamCallback) {
                publisher.remoteMediaStreamCallback(publisher, mediaStream);
            }
        }, createOptions);
        setupIceCandidateListener.call(that, streamId, peerConnection, function onIceCandidate(candidate) {
            if (that._iceCandidateCallbacks[streamId]) {
                that._iceCandidateCallbacks[streamId](candidate);
            }
        });
        setupStateListener.call(that, streamId, peerConnection);

        var offerSessionDescription = new phenixRTC.RTCSessionDescription({
            type: 'offer',
            sdp: offerSdp
        });
        var mediaConstraints :mediaConstraints = {mandatory: {}};

        if (phenixRTC.browser === 'Chrome' || phenixRTC.browser === 'ReactNative') {
            mediaConstraints.mandatory.OfferToReceiveVideo = createOptions.receiveVideo === true;
            mediaConstraints.mandatory.OfferToReceiveAudio = createOptions.receiveAudio === true;
        } else {
            mediaConstraints.mandatory.offerToReceiveVideo = createOptions.receiveVideo === true;
            mediaConstraints.mandatory.offerToReceiveAudio = createOptions.receiveAudio === true;
        }

        if (typeof phenixRTC.global.Promise === 'function') {
            return peerConnection.setRemoteDescription(offerSessionDescription)
                .then(_.bind(onSetRemoteDescriptionSuccess, that, peerConnection))
                .then(function() {
                    return peerConnection.createAnswer(mediaConstraints);
                })
                .then(_.bind(onCreateAnswerSuccess, that))
                .then(function(answerSdp: any) {
                    return new phenixRTC.global.Promise(function(resolve: any, reject: any) {
                        setRemoteAnswer.call(that, streamId, answerSdp, resolve, reject);
                    });
                })
                .then(function(sessionDescription: any) {
                    return peerConnection.setLocalDescription(sessionDescription);
                })
                .then(_.bind(onSetLocalDescriptionSuccess, that, peerConnection))
                .then(function() {
                    that._logger.info('[%s] Peer connection setup completed', streamId);
                })
                .then(createPublisher)
                .catch(onFailure);
        }

        that._logger.info('[%s] Using legacy peer connection api to publish', streamId);

        peerConnection.setRemoteDescription(offerSessionDescription, function() {
            onSetRemoteDescriptionSuccess.call(that, peerConnection);

            peerConnection.createAnswer(function(answerSdp: any) {
                onCreateAnswerSuccess.call(that, answerSdp);

                setRemoteAnswer.call(that, streamId, answerSdp, function(sessionDescription: any) {
                    peerConnection.setLocalDescription(sessionDescription, function() {
                        onSetLocalDescriptionSuccess.call(that, peerConnection);

                        that._logger.info('[%s] Peer connection setup completed', streamId);

                        createPublisher();
                    }, onFailure);
                }, onFailure);
            }, onFailure, mediaConstraints);
        }, onFailure);
    }

    function createViewerPeerConnection(this: any, peerConnectionConfig: any, streamId: string, offerSdp: string, streamTelemetry: streamTelemetry_StreamAddedListener, callback: callback_StreamAddedListener, createOptions: createOptions_createViewerPeerConnection) {
        if (phenixRTC.browser === 'IE') {
            throw new Error('Subscribing in real-time not supported on IE');
        }

        var that = this;
        var state = {
            failed: false,
            stopped: false
        };
        var hasCrypto = offerSdp.match(/a=crypto:/i);
        var hasDataChannel = offerSdp.match(/m=application /i);
        var peerConnection = new phenixRTC.RTCPeerConnection(peerConnectionConfig, {
            'optional': [
                {DtlsSrtpKeyAgreement: !hasCrypto}, {RtpDataChannels: hasDataChannel}
            ]
        });

        shimPeerConnectionGetStreams(peerConnection);

        that._peerConnections[streamId] = peerConnection;

        if (phenixRTC.browser === 'Firefox' || phenixRTC.browser === 'Edge') {
            if (offerSdp.match(/(\nm=video)/g) && offerSdp.match(/(\nm=audio)/g)) {
                var firstSection = /(a=candidate)((.|\n)*)(?=m=)/g;

                offerSdp = offerSdp.replace(firstSection, offerSdp.match(firstSection) + 'a=end-of-candidates\n');
            }

            offerSdp += 'a=end-of-candidates';

            offerSdp = offerSdp.replace(/(\na=ice-options:trickle)/g, '');
        }

        if (phenixRTC.browser === 'ReactNative') {
            offerSdp = sdpUtil.setGroupLineOrderToMatchMediaSectionOrder(offerSdp);
        }

        var onFailure = function onFailure(status: any) {
            if (state.failed) {
                return;
            }

            if (status instanceof Error) {
                that._logger.info('[%s] Failed to setup peer connection', streamId, status);

                status = 'failed';
            }

            state.failed = true;
            state.stopped = true;

            delete that._peerConnections[streamId];
            delete that._mediaStreams[streamId];
            delete that._iceCandidateCallbacks[streamId];

            closePeerConnection.call(that, streamId, peerConnection, 'failure');

            callback.call(that, undefined, status || 'failed');
        };

        setupStreamAddedListener.call(that, streamId, state, peerConnection, streamTelemetry, callback, createOptions);
        setupIceCandidateListener.call(that, streamId, peerConnection, function onIceCandidate(candidate) {
            if (that._iceCandidateCallbacks[streamId]) {
                that._iceCandidateCallbacks[streamId](candidate);
            }
        });
        setupStateListener.call(that, streamId, peerConnection);

        var offerSessionDescription = new phenixRTC.RTCSessionDescription({
            type: 'offer',
            sdp: offerSdp
        });
        var mediaConstraints: mediaConstraints = {mandatory: {}};

        if (phenixRTC.browser === 'Chrome' || phenixRTC.browser === 'ReactNative') {
            mediaConstraints.mandatory.OfferToReceiveVideo = createOptions.receiveVideo !== false;
            mediaConstraints.mandatory.OfferToReceiveAudio = createOptions.receiveAudio !== false;
        } else {
            mediaConstraints.mandatory.offerToReceiveVideo = createOptions.receiveVideo !== false;
            mediaConstraints.mandatory.offerToReceiveAudio = createOptions.receiveAudio !== false;
        }

        if (typeof phenixRTC.global.Promise === 'function') {
            return peerConnection.setRemoteDescription(offerSessionDescription)
                .then(_.bind(onSetRemoteDescriptionSuccess, that, peerConnection))
                .then(function() {
                    return peerConnection.createAnswer(mediaConstraints);
                })
                .then(_.bind(onCreateAnswerSuccess, that))
                .then(function(answerSdp: any) {
                    return new phenixRTC.global.Promise(function(resolve: any, reject: any) {
                        setRemoteAnswer.call(that, streamId, answerSdp, resolve, reject);
                    });
                })
                .then(function(sessionDescription: any) {
                    return peerConnection.setLocalDescription(sessionDescription);
                })
                .then(_.bind(onSetLocalDescriptionSuccess, that, peerConnection))
                .then(function() {
                    that._logger.info('[%s] Peer connection setup completed', streamId);
                })
                .catch(onFailure);
        }

        that._logger.info('[%s] Using legacy peer connection api to subscribe', streamId);

        peerConnection.setRemoteDescription(offerSessionDescription, function() {
            onSetRemoteDescriptionSuccess.call(that, peerConnection);

            peerConnection.createAnswer(function(answerSdp: any) {
                onCreateAnswerSuccess.call(that, answerSdp);

                setRemoteAnswer.call(that, streamId, answerSdp, function(sessionDescription: any) {
                    peerConnection.setLocalDescription(sessionDescription, function() {
                        onSetLocalDescriptionSuccess.call(that, peerConnection);

                        that._logger.info('[%s] Peer connection setup completed', streamId);
                    }, onFailure);
                }, onFailure);
            }, onFailure, mediaConstraints);
        }, onFailure);
    }

    function onSetLocalDescriptionSuccess(this: any, peerConnection: any) {
        this._logger.debug('Set local description [%s] [%s]', _.get(peerConnection, ['localDescription', 'type']), _.get(peerConnection, ['localDescription', 'sdp']));
    }

    function onSetRemoteDescriptionSuccess(this: any, peerConnection: any) {
        this._logger.debug('Set remote description [%s] [%s]', _.get(peerConnection, ['localDescription', 'type']), _.get(peerConnection, ['remoteDescription', 'sdp']));
    }

    function onCreateAnswerSuccess(this: any, answerSdp: { sdp: any; }) {
        this._logger.info('Created answer [%s]', answerSdp.sdp);

        return answerSdp;
    }

    function setRemoteAnswer(this: any, streamId: string , answerSdp: { sdp: any; }, setRemoteAnswerCallback: any, onFailure:  any) {
        var that = this;

        that._protocol.setAnswerDescription(streamId, answerSdp.sdp, function(error: any, response: response_setAnswerDescription ) {
            if (error) {
                that._logger.error('Failed to set answer description [%s]', error);

                return onFailure();
            } else if (response.status !== 'ok') {
                that._logger.warn('Failed to set answer description, status [%s]', response.status);

                return onFailure(response.status);
            }

            if (response && _.includes(response.options, 'ice-candidates')) {
                that._iceCandidateCallbacks[streamId] = _.bind(onIceCandidate, that, streamId);
            }

            var localSdp = response.sessionDescription.sdp;

            if (FeatureDetector.isIOS()) {
                var version = _.get(FeatureDetector.getIOSVersion(), ['major']);

                that._logger.info('iOS Version is [%s]', version);

                if (version < 11) {
                    localSdp = localSdp.replace('BUNDLE audio video', 'BUNDLE video audio'); // Without this only video-only streams work on iOS 10
                }
            }

            var sessionDescription = new phenixRTC.RTCSessionDescription({
                type: 'answer',
                sdp: localSdp
            });

            setRemoteAnswerCallback(sessionDescription);
        });
    }

    function onIceCandidate(this: any, streamId: string , candidate: any) {
        var that = this;
        var iceCandidates = this._pendingIceCandidates[streamId];

        if (!iceCandidates) {
            iceCandidates = this._pendingIceCandidates[streamId] = [];
        }

        if (candidate && _.get(candidate, ['candidate'])) {
            iceCandidates.push(candidate);
        } else {
            if (that._addIceCandidatesTimeoutScheduled[streamId]) {
                that._logger.debug('[%s] Dismissing scheduled batch for adding ICE candidates. Sending candidates immediately because there are no more candidates.', streamId);
                clearTimeout(that._addIceCandidatesTimeoutScheduled[streamId]);
            }

            submitIceCandidates.call(that, streamId, ['completed']);

            delete this._pendingIceCandidates[streamId];
            delete this._addIceCandidatesTimeoutScheduled[streamId];
        }

        if (this._addIceCandidatesTimeoutScheduled[streamId]) {
            that._logger.debug('[%s] Using existing batch for adding ICE candidates', streamId);

            return;
        }

        this._addIceCandidatesTimeoutScheduled[streamId] = setTimeout(function() {
            submitIceCandidates.call(that, streamId, []);

            delete that._addIceCandidatesTimeoutScheduled[streamId];
        }, accumulateIceCandidatesDuration);

        this._disposables.add(new disposable.Disposable(function() {
            if (that._addIceCandidatesTimeoutScheduled[streamId]) {
                clearTimeout(that._addIceCandidatesTimeoutScheduled[streamId]);
            }

            delete that._pendingIceCandidates[streamId];
            delete that._addIceCandidatesTimeoutScheduled[streamId];
        }));
    }

    function submitIceCandidates(this: any, streamId: string , options: string | any[]) {
        var iceCandidates = this._pendingIceCandidates[streamId] || [];

        if (iceCandidates.length === 0 && options.length === 0) {
            return;
        }

        var that = this;

        delete that._pendingIceCandidates[streamId];

        this._logger.info('[%s] Adding [%s] ICE Candidates with Options [%s]', streamId, iceCandidates.length, options);

        this._protocol.addIceCandidates(streamId, iceCandidates, options, function(error: any, response: response_addIceCandidates) {
            if (error) {
                return that._logger.error('Failed to add ICE candidate [%s]', error);
            } else if (response.status !== 'ok') {
                return that._logger.warn('Failed to add ICE candidate, status [%s]', response.status);
            }

            if (_.includes(response.options, 'cancel')) {
                delete that._iceCandidateCallbacks[streamId];
            }
        });
    }

    function createChunkedOrRtmpViewer(this: any, streamId: string, offerSdp: any, streamTelemetry: any, callback: any, options: options_createChunkedOrRtmpViewer) {
        var that = this;

        var rtmpQuery = /a=x-rtmp:(rtmp:\/\/[^\n]*)/m;
        var rtmpMatch = offerSdp.match(rtmpQuery);
        var dashMatch = offerSdp.match(/a=x-playlist:([^\n]*[.]mpd\??[^\s]*)/m);
        var hlsMatch = offerSdp.match(/a=x-playlist:([^\n]*[.]m3u8\??[^\s]*)/m);
        var manifestUrl = _.get(dashMatch, [1], '');
        var playlistUrl = _.get(hlsMatch, [1], '');
        var dashManifestOffered = dashMatch && dashMatch.length === 2;
        var hlsPlaylistOffered = hlsMatch && hlsMatch.length === 2;
        var rtmpOffered = !!rtmpMatch;
        var publisherCapabilities = [];

        if (dashManifestOffered || hlsPlaylistOffered) {
            publisherCapabilities.push('streaming');
        }

        if (rtmpOffered) {
            publisherCapabilities.push('rtmp');
        }

        var preferredFeature = this._featureDetector.getPreferredFeatureFromPublisherCapabilities(publisherCapabilities, true);

        if (this._streamingSourceMapping) {
            manifestUrl = manifestUrl.replace(this._streamingSourceMapping.patternToReplace, this._streamingSourceMapping.replacement);
            playlistUrl = playlistUrl.replace(this._streamingSourceMapping.patternToReplace, this._streamingSourceMapping.replacement);
        }

        switch (preferredFeature) {
        case streamEnums.types.rtmp.name:
            var rtmpUris: any = [];
            var env = environment.parseEnvFromPcastBaseUri(this._baseUri);

            this._logger.info('Selecting flash playback for rtmp.');

            while (rtmpMatch) {
                var rtmpUriAndAttributes = _.get(rtmpMatch, [1], '');
                var rtmpUri = _.get(rtmpUriAndAttributes.match(/(rtmp:\/\/[^\n\s]*)/), [0]);
                var bitrate = _.get(rtmpUriAndAttributes.match(/bitrate=([^\n\s;]*)/), [1]);
                var resolution = _.get(rtmpUriAndAttributes.match(/resolution=([^\n\s;]*)/), [1]);

                offerSdp = offerSdp.replace(rtmpUriAndAttributes, '');

                if (rtmpUri) {
                    rtmpUris.push({
                        uri: rtmpUri,
                        bitrate: bitrate,
                        resolution: resolution
                    });
                }

                rtmpMatch = offerSdp.match(rtmpQuery);
            }

            return createLiveViewerOfKind.call(that, streamId, rtmpUris, streamEnums.types.rtmp.name, streamTelemetry, callback, _.assign({env: env}, this._rtmpOptions, options));
        case streamEnums.types.dash.name:
            this._logger.info('Selecting dash playback for live stream.');

            options.isDrmProtectedContent = /[?&]drmToken=([^&]*)/.test(manifestUrl) || /x-widevine-service-certificate/.test(offerSdp);

            if (options.isDrmProtectedContent) {
                options.widevineServiceCertificateUrl = offerSdp.match(/a=x-widevine-service-certificate:([^\n][^\s]*)/m)[1];
                options.playreadyLicenseUrl = offerSdp.match(/a=x-playready-license-url:([^\n][^\s]*)/m)[1];
            }

            return createLiveViewerOfKind.call(that, streamId, manifestUrl, streamEnums.types.dash.name, streamTelemetry, callback, options);
        case streamEnums.types.hls.name:
            this._logger.info('Selecting hls playback for live stream.');

            options.isDrmProtectedContent = /[?&]drmToken=([^&]*)/.test(playlistUrl);

            if (options.hlsTargetDuration) {
                assert.isNumber(options.hlsTargetDuration, 'options.hlsTargetDuration');

                playlistUrl = playlistUrl + (playlistUrl.indexOf('?') > -1 ? '&' : '?') + 'targetDuration=' + options.hlsTargetDuration;
            }

            return createLiveViewerOfKind.call(that, streamId, playlistUrl, streamEnums.types.hls.name, streamTelemetry, callback, _.assign({preferNative: FeatureDetector.shouldUseNativeHls}, options));
        default:
            break;
        }

        that._logger.warn('[%s] Device does not support [%s] playback. Creating live viewer stream failed.', streamId, FeatureDetector.mapPCastCapabilitiesToFeatures(publisherCapabilities));

        return callback.call(that, undefined, 'failed');
    }

    function createLiveViewerOfKind(this: any, streamId: string , uri: string, kind: any, streamTelemetry: any, callback: any, options: any) {
        var that = this;
        var pending = 0;
        var shaka: any = null;
        var webPlayer: any = null;

        if (!this._shakaLoader && !this._webPlayerLoader) {
            that._logger.warn('[%s] No player available for [%s] and uri [%s]. Please provide a loader via options.', streamId, kind, uri);

            that._protocol.destroyStream(streamId, 'unsupported-features', function(error: any, response: { status: string; }) {
                if (error) {
                    that._logger.error('[%s] failed to destroy stream with unsupported features, [%s]', streamId, error);

                    return;
                } else if (response.status !== 'ok') {
                    that._logger.warn('[%s] failed to destroy stream with unsupported features, status [%s]', streamId, response.status);

                    return;
                }
            });

            return callback.call(that, undefined, 'unsupported-features');
        }

        if (this._shakaLoader) {
            pending++;
        }

        if (this._webPlayerLoader) {
            pending++;
        }

        var loaded = function() {
            if (!shaka && !webPlayer) {
                that._logger.warn('[%s] No player available for [%s] and uri [%s]. Please make sure the loader properly provides the player.', streamId, kind, uri);

                return callback.call(that, undefined, 'unsupported-features');
            }

            var liveStream = new PhenixLiveStream(kind, streamId, uri, streamTelemetry, options, shaka, webPlayer, that._logger);
            var liveStreamDecorator = new StreamWrapper(kind, liveStream, that._logger);

            var onPlayerError = function onPlayerError(source: any, event: any) {
                that._logger.warn('Phenix Live Stream Player Error [%s] [%s]', source, event);

                liveStreamDecorator.streamErrorCallback(source, event);
            };

            var onStop = function onStop(reason: any) {
                if (!that._protocol) {
                    return that._logger.warn('Unable to destroy stream [%s]', streamId);
                }

                that._protocol.destroyStream(streamId, reason || '', function(error: any, response: { status: string; }) {
                    if (error) {
                        that._logger.error('[%s] failed to destroy stream, [%s]', streamId, error);

                        return;
                    } else if (response.status !== 'ok') {
                        that._logger.warn('[%s] failed to destroy stream, status [%s]', streamId, response.status);

                        return;
                    }
                });
            };

            streamTelemetry.setProperty('kind', kind);

            liveStreamDecorator.on(streamEnums.streamEvents.playerError.name, onPlayerError);
            liveStreamDecorator.on(streamEnums.streamEvents.stopped.name, onStop);

            that._mediaStreams[streamId] = liveStreamDecorator;

            callback.call(that, liveStreamDecorator.getPhenixMediaStream());
        };

        if (this._shakaLoader) {
            this._shakaLoader(function(s: any) {
                shaka = s;
                pending--;

                if (pending === 0) {
                    return loaded();
                }
            });
        }

        if (this._webPlayerLoader) {
            this._webPlayerLoader(function(w: any) {
                webPlayer = w;
                pending--;

                if (pending === 0) {
                    return loaded();
                }
            });
        }

        if (pending === 0) {
            return loaded();
        }
    }

    function transitionToStatus(this: any, newStatus?: string, reason?: string | null, suppressCallback?: any) {
        var oldStatus = this.getStatus();

        if (oldStatus !== newStatus && !(isOfflineStatus(oldStatus) && newStatus === 'offline')) {
            this._observableStatus.setValue(newStatus);

            var protocol = this.getProtocol();
            var sessionId = protocol ? protocol.getSessionId() : '';
            this._logger.debug('[%s] Transition from [%s] to [%s] with reason [%s]', sessionId, oldStatus, newStatus, reason);

            if (suppressCallback) {
                return;
            }

            switch (newStatus) {
            case 'connecting':
            case 'reconnecting':
            case 'reconnected':
                break;
            case 'critical-network-issue':
            case 'unauthorized':
            case 'reconnect-failed':
            case 'offline':
                return this._offlineCallback.call(this);
            case 'online':
                return this._onlineCallback.call(this);
            default:
                break;
            }
        }
    }

    function isOfflineStatus(status: string) {
        return status === 'critical-network-issue' || status === 'offline';
    }

    function closePeerConnection(this: any, streamId: string, peerConnection: peerConnection_closePeerConnection, reason: any) {
        if (peerConnection.signalingState === 'closed' || peerConnection.__closing) {
            this._logger.debug('[%s] Peer connection is already closed [%s]', streamId, reason);

            return;
        }

        this._logger.debug('[%s] close peer connection [%s]', streamId, reason);

        peerConnection.close();
        peerConnection.__closing = true;
    }

    function handleForeground(this: any) {
        if (this._treatBackgroundAsOffline || this._reAuthenticateOnForeground) {
            reconnected.call(this, 'entered-foreground');
        }
    }

    function handleBackground(this: any) {
        if (this._treatBackgroundAsOffline) {
            transitionToStatus.call(this, 'offline', 'entered-background');
        }
    }

    function parseProtobufMessage(message: any) {
        if (!message) {
            return message;
        }

        var parsedMessage = _.isArray(message) ? [] : {};
        var processIndexOrKey = _.bind(removeNullValuesAndParseEnums, null, parsedMessage);

        if (_.isArray(message)) {
            _.forEach(message, processIndexOrKey);
        } else {
            _.forOwn(message, processIndexOrKey);
        }

        return parsedMessage;
    }

    function removeNullValuesAndParseEnums(parsedMessage: any, value: string | null, key: string) {
        if (value === null) {
            return;
        }

        if (_.isObject(value) || _.isArray(value)) {
            return parsedMessage[key] = parseProtobufMessage(value);
        }

        if (!_.isString(value) || !_.isString(key)) {
            return parsedMessage[key] = value;
        }

        var prefixedByKey = _.startsWith(value.toLowerCase(), key.toLowerCase());
        var valueParsedWithoutKey = prefixedByKey ? value.substring(key.length, value.length).toLowerCase() : value;

        parsedMessage[key] = valueParsedWithoutKey;
    }

    function applyVendorSpecificLogic(config: any) {
        switch (phenixRTC.browser) {
        case 'Firefox':
            // Firefox doesn't support TURN with TCP/TLS https://bugzilla.mozilla.org/show_bug.cgi?id=1056934
            removeTurnsServers(config);

            break;
        case 'Edge':
            // Edge doesn't support TURN with TCP
            forceTurnUdp(config);

            break;
        default:
            break;
        }

        return config;
    }

    function removeTurnsServers(config: { iceServers: any; }) {
        if (!config) {
            return config;
        }

        _.forEach(config.iceServers, function(server: { urls: string[]; }) {
            server.urls = _.filter(server.urls, function(url: string) {
                return !_.startsWith(url, 'turns');
            });
        });

        return config;
    }

    function forceTurnUdp(config: { iceServers: any; }) {
        if (!config) {
            return config;
        }

        _.forEach(config.iceServers, function(server: { urls: string[]; }) {
            server.urls = _.map(server.urls, function(url: string) {
                return url.replace('transport=tcp', 'transport=udp');
            });
        });

        return config;
    }

    // Shim required. Webrtc adapter successfully shims but breaks Edge.
    var shimPeerConnectionGetStreams = function(peerConnection:any) {
        if (!_.isUndefined(peerConnection.onaddstream)) {
            return;
        }

        var remoteStreams: any[] = [];
        var localStreams: any[] = [];

        _.addEventListener(peerConnection, 'track', function(event: { streams: any; }) {
            _.forEach(event.streams, function(stream: any) {
                if (!_.includes(remoteStreams, stream)) {
                    remoteStreams.push(stream);
                }
            });
        });

        peerConnection.getRemoteStreams = function getRemoteStreams() {
            return remoteStreams;
        };

        peerConnection.getLocalStreams = function getLocalStreams() {
            return localStreams;
        };

        peerConnection.addStream = function addStream(stream: { getTracks: () => any; }) {
            if (!_.includes(localStreams, stream)) {
                localStreams.push(stream);
            }

            _.forEach(stream.getTracks(), function(track: any) {
                peerConnection.addTrack(track, stream);
            });
        };
    };

    return PCast;
});

