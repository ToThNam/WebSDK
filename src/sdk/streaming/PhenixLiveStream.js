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
    './ShakaRenderer',
    './PhenixPlayerRenderer',
    './FlashRenderer',
    './stream.json'
], function(_, assert, event, rtc, ShakaRenderer, PhenixPlayerRenderer, FlashRenderer, streamEnums) {
    'use strict';

    function PhenixLiveStream(type, streamId, uri, streamTelemetry, options, shaka, webPlayer, logger) {
        this._type = type;
        this._streamId = streamId;
        this._uri = uri;
        this._streamTelemetry = streamTelemetry;
        this._options = options;
        this._shaka = shaka;
        this._webPlayer = webPlayer,
        this._logger = logger;
        this._renderers = [];
        this._dimensionsChangedMonitor = null;
        this._namedEvents = new event.NamedEvents();
    }

    PhenixLiveStream.prototype.on = function(name, callback) {
        this._namedEvents.listen(name, callback);
    };

    PhenixLiveStream.prototype.createRenderer = function() {
        var renderer = null;

        switch (this._type) {
        case streamEnums.types.dash.name:
            if (this._webPlayer) {
                renderer = new PhenixPlayerRenderer(this._streamId, this._uri, this._streamTelemetry, this._options, this._webPlayer, this._logger);
            } else if (this._shaka) {
                if (!this._shaka.Player.isBrowserSupported()) {
                    this._logger.warn('[%s] Shaka does not support this browser', this._streamId);

                    throw new Error('Shaka does not support this browser');
                }

                renderer = new ShakaRenderer(this._streamId, this._uri, this._streamTelemetry, this._options, this._shaka, this._logger);
            }

            break;
        case streamEnums.types.hls.name:
            renderer = new PhenixPlayerRenderer(this._streamId, this._uri, this._streamTelemetry, this._options, this._webPlayer, this._logger);

            break;
        case streamEnums.types.rtmp.name:
            renderer = new FlashRenderer(this._streamId, this._uri, this._streamTelemetry, this._options, this._logger);

            break;
        default:
            throw new Error('Unsupported Live stream Type ' + this._type);
        }

        var that = this;

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

    PhenixLiveStream.prototype.select = function select(trackSelectCallback) { // eslint-disable-line no-unused-vars
        this._logger.warn('[%s] selection of tracks not supported for [%s] live streams', this._streamId, this._type);

        return this;
    };

    PhenixLiveStream.prototype.setStreamEndedCallback = function setStreamEndedCallback(callback) {
        assert.isFunction(callback, 'callback');

        this.streamEndedCallback = callback;
    };

    PhenixLiveStream.prototype.setStreamErrorCallback = function setStreamErrorCallback(callback) {
        assert.isFunction(callback, 'callback');

        this.streamErrorCallback = callback;
    };

    PhenixLiveStream.prototype.stop = function stop(reason) {
        if (!this.isActive()) {
            return;
        }

        this._logger.info('[%s] stop [live] media stream with reason [%s]', this._streamId, reason);

        this._namedEvents.fire(streamEnums.streamEvents.stopped.name, [reason]);

        this._isStopped = true;
    };

    PhenixLiveStream.prototype.monitor = function monitor(options, callback) {
        assert.isObject(options, 'options');
        assert.isFunction(callback, 'callback');
    };

    PhenixLiveStream.prototype.getMonitor = function getMonitor() {
        return null;
    };

    PhenixLiveStream.prototype.addBitRateThreshold = function addBitRateThreshold(threshold, callback) {
        assert.isFunction(callback, 'callback');

        return;
    };

    PhenixLiveStream.prototype.getStream = function getStream() {
        this._logger.debug('[%s] [%s] This type of stream has no internal stream object', this._streamId, this._type);

        return null;
    };

    PhenixLiveStream.prototype.isActive = function isActive() {
        return !this._isStopped;
    };

    PhenixLiveStream.prototype.getStreamId = function getStreamId() {
        return this._streamId;
    };

    PhenixLiveStream.prototype.getStats = function getStats() {
        this._logger.debug('[%s] [%s] This type of stream has no stats', this._streamId, this._type);

        return null;
    };

    PhenixLiveStream.prototype.getRenderer = function getRenderer() {
        return _.get(this._renderers, [0], null);
    };

    PhenixLiveStream.canPlaybackType = function canPlaybackType(type) {
        var deviceSupportsDashPlayback = !!rtc.global.MediaSource;
        var deviceSupportsHlsPlayback = deviceSupportsDashPlayback || (typeof document === 'object' && document.createElement('video').canPlayType('application/vnd.apple.mpegURL') === 'maybe');

        switch (type) {
        case streamEnums.types.dash.name:
            return deviceSupportsDashPlayback;
        case streamEnums.types.hls.name:
            return deviceSupportsHlsPlayback;
        case streamEnums.types.rtmp.name:
            return FlashRenderer.isSupported();
        default:
            return false;
        }
    };

    return PhenixLiveStream;
});