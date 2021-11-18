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
    'phenix-web-event',
    'phenix-rtc',
    'phenix-web-disposable',
    'phenix-web-application-activity-detector',
    './PeerConnection',
    './PeerConnectionMonitor',
    './BitRateMonitor',
    './PhenixRealTimeRenderer',
    './FeatureDetector',
    './stream.json'
], function(_, assert, event, rtc, disposable, applicationActivityDetector, PeerConnection, PeerConnectionMonitor, BitRateMonitor, PhenixRealTimeRenderer, FeatureDetector, streamEnums) {
    'use strict';

    var defaultIceConnectionTimeout = 12000;

    function PhenixRealTimeStream(streamId, streamSrc, peerConnection, streamTelemetry, options, logger) {
        this._streamId = streamId;
        this._streamSrc = streamSrc;
        this._peerConnection = peerConnection;
        this._streamTelemetry = streamTelemetry;
        this._options = options;
        this._logger = logger;
        this._renderers = [];
        this._dimensionsChangedMonitor = null;
        this._namedEvents = new event.NamedEvents();
        this._childrenStreams = [];
        this._limit = 0;
        this._backgroundMonitorEventCallback = null;
        this._disposables = new disposable.DisposableList();
        this._connected = 0;
        this._iceConnectionTimeout = _.get(options, ['iceConnectionTimeout'], defaultIceConnectionTimeout);

        this._disposables.add(applicationActivityDetector.onForeground(_.bind(emitPendingBackgroundEvent, this)));

        var bandwidthAttribute = /(b=AS:([0-9]*)[\n\r]*)/gi;
        var bandwithAttribute = bandwidthAttribute.exec(peerConnection.remoteDescription);

        if (bandwithAttribute && bandwithAttribute.length >= 3) {
            this._limit = bandwithAttribute[2] * 1000;
        }

        _.addEventListener(peerConnection, 'iceconnectionstatechange', _.bind(onIceConnectionChange, this));
    }

    PhenixRealTimeStream.prototype.on = function(name, callback) {
        this._namedEvents.listen(name, callback);
    };

    PhenixRealTimeStream.prototype.createRenderer = function() {
        var that = this;
        var sdp = _.get(this._peerConnection, ['remoteDescription', 'sdp']);
        var options = Object.assign({}, this._options);

        if (sdp && !this._options.capabilities.includes('audio-only') || !this._options.capabilities.includes('video-only')) {
            if (!sdp.includes('m=audio')) {
                options.capabilities.push('video-only');
            }

            if (!sdp.includes('m=video')) {
                options.capabilities.push('audio-only');
            }

            var sdpTracks = sdp.split('m=');

            sdpTracks.forEach(function(track) {
                if (track.startsWith('audio') && track.includes('a=inactive')) {
                    options.capabilities.push('video-only');
                }

                if (track.startsWith('video') && track.includes('a=inactive')) {
                    options.capabilities.push('audio-only');
                }
            });
        }

        var renderer = new PhenixRealTimeRenderer(this._streamId, this._streamSrc, this._streamTelemetry, options, this._logger);

        renderer.on(streamEnums.rendererEvents.error.name, function(type, error) {
            that._namedEvents.fire(streamEnums.streamEvents.playerError.name, [type, error]);
        });
        renderer.on(streamEnums.rendererEvents.ended.name, function(reason) {
            that._renderers = _.filter(that._renderers, function(storedRenderer) {
                return storedRenderer !== renderer;
            });

            if (that._renderers.length === 0) {
                that._streamTelemetry.stop();
                that._namedEvents.fire(streamEnums.streamEvents.playerEnded.name, [reason]);
            }
        });

        this._renderers.push(renderer);

        return renderer;
    };

    PhenixRealTimeStream.prototype.select = function select(trackSelectCallback) {
        assert.isFunction(trackSelectCallback, 'trackSelectCallback');
        assert.isFunction(rtc.global.MediaStream, 'rtc.global.MediaStream');

        var tracks = this._streamSrc.getTracks();
        var streamToAttach = new rtc.global.MediaStream();

        for (var i = 0; i < tracks.length; i++) {
            if (trackSelectCallback(tracks[i], i)) {
                streamToAttach.addTrack(tracks[i]);
            }
        }

        if (streamToAttach.getTracks().length === 0) {
            return this._logger.warn('No tracks selected');
        }

        var that = this;
        var newMediaStream = new PhenixRealTimeStream(this._streamId, streamToAttach, this._peerConnection, this._streamTelemetry, this._options, this._logger);

        newMediaStream.on(streamEnums.streamEvents.stopped.name, function(reason) {
            if (isStreamStopped(that._streamSrc)) {
                that._namedEvents.fire(streamEnums.streamEvents.stopped.name, [reason]);
            }
        });

        this._childrenStreams.push(newMediaStream);

        return newMediaStream;
    };

    PhenixRealTimeStream.prototype.setStreamEndedCallback = function setStreamEndedCallback(callback) {
        assert.isFunction(callback, 'callback');

        this._streamEndedCallback = callback;
    };

    PhenixRealTimeStream.prototype.setStreamErrorCallback = function setStreamErrorCallback(callback) {
        assert.isFunction(callback, 'callback');

        this._streamErrorCallback = callback;
    };

    PhenixRealTimeStream.prototype.streamEndedCallback = function streamEndedCallback(stream, status, reason) {
        _.forEach(this._childrenStreams, function(childStream) {
            childStream.streamEndedCallback(status, reason);
        });

        if (_.isFunction(this._streamEndedCallback)) {
            this._streamEndedCallback(this, status, reason);
        }
    };

    PhenixRealTimeStream.prototype.streamErrorCallback = function streamErrorCallback(stream, errorSource, error) {
        _.forEach(this._childrenStreams, function(childStream) {
            childStream.streamErrorCallback(errorSource, error);
        });

        if (_.isFunction(this._streamErrorCallback)) {
            this._streamErrorCallback(stream, errorSource, error);
        }
    };

    PhenixRealTimeStream.prototype.stop = function stop(reason) {
        if (!this.isActive()) {
            return;
        }

        this._disposables.dispose();

        stopWebRTCStream(this._streamSrc);

        this._logger.info('[%s] stop [real-time] media stream with reason [%s]', this._streamId, reason);

        this._namedEvents.fire(streamEnums.streamEvents.stopped.name, [reason]);

        this._isStopped = true;
    };

    PhenixRealTimeStream.prototype.monitor = function monitor(options, callback) {
        assert.isObject(options, 'options');
        assert.isFunction(callback, 'callback');

        var that = this;
        var monitor = new PeerConnectionMonitor(that._streamId, that._peerConnection, that._logger);

        options.direction = 'inbound';

        monitor.start(options, function activeCallback() {
            return that.isActive();
        }, function monitorCallback(error, monitorEvent) {
            if (error) {
                that._logger.warn('[%s] Media stream monitor triggered unrecoverable error [%s]', that._streamId, error);
            }

            if (FeatureDetector.isIOS() && !applicationActivityDetector.isForeground()) {
                that._logger.info('[%s] Media stream monitor triggered event while app is in the background. Waiting until foreground to trigger event.', that._streamId);

                return that._backgroundMonitorEventCallback = monitorCallback.bind(null, error, monitorEvent);
            }

            that._logger.warn('[%s] Media stream triggered monitor condition for [%s] [%s]', that._streamId, monitorEvent.type, monitorEvent.reasons);

            return callback(that, 'client-side-failure', monitorEvent);
        });

        this._monitor = monitor;

        return monitor;
    };

    PhenixRealTimeStream.prototype.getMonitor = function getMonitor() {
        return this._monitor;
    };

    PhenixRealTimeStream.prototype.addBitRateThreshold = function addBitRateThreshold(threshold, callback) {
        var that = this;
        var bitRateMonitor = new BitRateMonitor('Media Stream', this._monitor, function getLimit() {
            return that._limit;
        });

        return bitRateMonitor.addThreshold(threshold, callback);
    };

    PhenixRealTimeStream.prototype.getStream = function getStream() {
        return this._streamSrc;
    };

    PhenixRealTimeStream.prototype.isActive = function isActive() {
        return !this._isStopped;
    };

    PhenixRealTimeStream.prototype.getStreamId = function getStreamId() {
        return this._streamId;
    };

    PhenixRealTimeStream.prototype.getStats = function getStats(callback) {
        assert.isFunction(callback, 'callback');

        if (!this._lastStats) {
            this._lastStats = {};
        }

        var that = this;

        return rtc.getStats(this._peerConnection, null, function(stats) {
            callback(PeerConnection.convertPeerConnectionStats(stats, that._lastStats));
        });
    };

    PhenixRealTimeStream.prototype.getRenderer = function getRenderer() {
        return _.get(this._renderers, [0], null);
    };

    PhenixRealTimeStream.prototype.toString = function toString() {
        return 'PhenixRealTimeStream[' + this._streamId + ']';
    };

    function emitPendingBackgroundEvent() {
        if (!this._backgroundMonitorEventCallback) {
            return;
        }

        var eventCallback = this._backgroundMonitorEventCallback;

        this._backgroundMonitorEventCallback = null;

        eventCallback();
    }

    function isStreamStopped(stream) {
        return _.reduce(stream.getTracks(), function(isStopped, track) {
            return isStopped && isTrackStopped(track);
        }, true);
    }

    function isTrackStopped(track) {
        assert.isObject(track, 'track');

        return track.readyState === 'ended';
    }

    function stopWebRTCStream(stream) {
        if (stream && _.isFunction(stream.stop, 'stream.stop')) {
            stream.stop();
        }

        _.forEach(stream && stream.getTracks ? stream.getTracks() : [], function(track) {
            track.stop();
        });
    }

    function onIceConnectionChange() {
        var that = this;
        var connectionState = this._peerConnection.iceConnectionState;

        switch (connectionState) {
        case 'checking':
        case 'connecting':
            if (this._checkConnectionSuccessTimeoutId) {
                return;
            }

            this._connectionStart = _.now();
            this._checkConnectionSuccessTimeoutId = setTimeout(function() {
                that._logger.warn('[%s] Stream has not connected within [%s] ms', that._streamId, that._iceConnectionTimeout);
                that._namedEvents.fire(streamEnums.streamEvents.playerError.name, ['real-time', new Error('connection-timeout')]);
            }, that._iceConnectionTimeout);

            break;
        case 'failed':
            if (this._checkConnectionSuccessTimeoutId) {
                clearTimeout(this._checkConnectionSuccessTimeoutId);

                this._checkConnectionSuccessTimeoutId = null;
            }

            this._logger.info('[%s] Stream has failed', that._streamId);
            this._namedEvents.fire(streamEnums.streamEvents.playerError.name, ['real-time', new Error('connection-failed')]);

            break;
        case 'closed':
        case 'disconnected':
            if (this._checkConnectionSuccessTimeoutId) {
                that._logger.warn('[%s] Stream closed before it was connected', that._streamId);
            }

            break;
        case 'connected':
            if (this._checkConnectionSuccessTimeoutId) {
                clearTimeout(this._checkConnectionSuccessTimeoutId);

                this._checkConnectionSuccessTimeoutId = null;
            }

            this._connected++;
            this._logger.info('[%s] Ice Connection completed after [%s] ms for [%s] time', this._streamId, _.now() - this._connectionStart, this._connected);
            this._connectionStart = null;

            break;
        default:
            this._logger.info('[%s] Unsupported Ice Connection state [%s]', this._streamId, connectionState);

            break;
        }
    }

    return PhenixRealTimeStream;
});