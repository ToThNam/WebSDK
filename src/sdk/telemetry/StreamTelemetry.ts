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

import { Record_recordMetricRecord, 
    video,trackedVideo,
    Dimensions_addVideoDisplayDimensionsChangedCallback
} from "../../../typescript/src/sdk/telemetry/StreamTelemetry";

define('',[
    'phenix-web-lodash-light',
    'phenix-web-assert',
    'phenix-web-disposable',
    'phenix-rtc'
], function(_, assert, disposable, phenixRTC) {
    'use strict';

    var start = phenixRTC.global['__phenixPageLoadTime'] || phenixRTC.global['__pageLoadTime'] || _.now();
    var sdkVersion = '%SDKVERSION%' || '?';

    function StreamTelemetry(this: any, sessionId: string, logger: any, metricsTransmitter: any) {
        assert.isStringNotEmpty(sessionId, 'sessionId');

        this._version = sdkVersion;
        this._sessionId = sessionId;
        this._properties = {};
        this._logger = logger;
        this._metricsTransmitter = metricsTransmitter;
        this._start = _.now();
        this._disposables = new disposable.DisposableList();
        this._dimensionsTrackedVideos = [];
        this._rebufferingTrackedVideos = [];
        this._playTrackedVideos = [];
        this._timeOfFirstFrame = null;

        logMetric.call(this, 'Stream initializing');
    }

    StreamTelemetry.prototype.setProperty = function(name: string | number, value: string) {
        assert.isStringNotEmpty(name, 'name');
        assert.isStringNotEmpty(value, 'value');

        this._properties[name] = value;
    };

    StreamTelemetry.prototype.recordMetric = function(metric: string, value: any, previousValue: any, additionalProperties: any) {
        assert.isStringNotEmpty(metric, 'metric');

        var record = _.assign({}, {
            metric: metric,
            elapsed: this.elapsed(),
            value: value,
            previousValue: previousValue
        }, additionalProperties || {});

        recordMetricRecord.call(this, record, since());
    };

    StreamTelemetry.prototype.setStreamId = function(streamId: string) {
        assert.isStringNotEmpty(streamId, 'streamId');

        if (this._streamId) {
            throw new Error('Stream ID can only be set once.');
        }

        this._streamId = streamId;

        var now = _.now();

        recordMetricRecord.call(this, {
            metric: 'Initialized',
            elapsed: this.elapsed() - now + this._start // Adjust for delay to get the stream ID
        }, since() - (now - this._start) / 1000); // Adjust for delay to get the stream ID);
    };

    StreamTelemetry.prototype.setStartOffset = function(startOffset: number) {
        assert.isNumber(startOffset, 'startOffset');

        if (this._startOffset) {
            throw new Error('Start offset can only be set once.');
        }

        this._startOffset = startOffset;

        this.recordMetric('Offset', {uint64: startOffset});
    };

    StreamTelemetry.prototype.getStartOffset = function() {
        return this._startOffset;
    };

    StreamTelemetry.prototype.elapsed = function() {
        var now = _.now();

        return now - this._start;
    };

    StreamTelemetry.prototype.stop = function() {
        this._disposables.dispose();

        this.recordMetric('Stopped');

        logMetric.call(this, 'Stream stopped');
    };

    StreamTelemetry.prototype.recordTimeToFirstFrame = function(video: any) {
        var that = this;
        var startRecordingFirstFrame = _.now();

        // Only record first time to first frame regardless of number of times called
        var listenForFirstFrame = function() {
            if (that._timeOfFirstFrame) {
                return;
            }

            that._timeOfFirstFrame = _.now() - startRecordingFirstFrame;

            that.recordMetric('TimeToFirstFrame', {uint64: that._timeOfFirstFrame});
            logMetric.call(that, 'First frame [%s]', that._timeOfFirstFrame);

            timeToFirstFrameListenerDisposable.dispose();
        };

        _.addEventListener(video, 'loadeddata', listenForFirstFrame);
        _.addEventListener(video, 'loadedmetadata', listenForFirstFrame);

        var timeToFirstFrameListenerDisposable = new disposable.Disposable(function() {
            _.removeEventListener(video, 'loadeddata', listenForFirstFrame);
            _.removeEventListener(video, 'loadedmetadata', listenForFirstFrame);
        });

        // Ensure TTFF is not recorded if stop is called before first frame
        this._disposables.add(timeToFirstFrameListenerDisposable);

        return timeToFirstFrameListenerDisposable;
    };

    // TODO(dy) Add logging for bit rate changes using PC.getStats
    StreamTelemetry.prototype.recordVideoResolutionChanges = function(renderer: { addVideoDisplayDimensionsChangedCallback: (arg0: (renderer: any, dimensions: Dimensions_addVideoDisplayDimensionsChangedCallback) => void) => any; }, video: video) {
        var that = this;
        var lastResolution = {
            width: video.videoWidth,
            height: video.videoHeight
        };
        var hasListenedToVideo = _.find(this._dimensionsTrackedVideos, function(trackedVideo: trackedVideo) {
            return trackedVideo === video;
        });

        if (hasListenedToVideo) {
            return new disposable.Disposable(_.noop);
        }

        this._dimensionsTrackedVideos.push(video);

        var dimensionChangeDisposable = renderer.addVideoDisplayDimensionsChangedCallback(function(renderer: any, dimensions: Dimensions_addVideoDisplayDimensionsChangedCallback) {
            if (lastResolution.width === dimensions.width && lastResolution.height === dimensions.height) {
                return;
            }

            that.recordMetric('ResolutionChanged', {string: dimensions.width + 'x' + dimensions.height}, {string: lastResolution.width + 'x' + lastResolution.height});

            lastResolution = {
                width: dimensions.width,
                height: dimensions.height
            };

            logMetric.call(that, 'Resolution changed: width [%s] height [%s]', dimensions.width, dimensions.height);
        });

        this._disposables.add(dimensionChangeDisposable);

        return dimensionChangeDisposable;
    };

    StreamTelemetry.prototype.recordRebuffering = function(video: { buffered: { length: number; end: (arg0: number) => boolean; }; }) {
        var that = this;
        var videoStalled: number | null;
        var lastProgress: boolean;
        var hasListenedToVideo = _.find(this._rebufferingTrackedVideos, function(trackedVideo: any) {
            return trackedVideo === video;
        });

        if (hasListenedToVideo) {
            return new disposable.Disposable(_.noop);
        }

        this._rebufferingTrackedVideos.push(video);

        var listenForStall = function() {
            if (videoStalled) {
                return;
            }

            that.recordMetric('Stalled');

            videoStalled = _.now();

            logMetric.call(that, '[buffering] Stream has stalled');
        };

        var listenForContinuation = function(event: { type: string; }) {
            var bufferLength = video.buffered.length;
            var hasNotProgressedSinceLastProgressEvent = event.type === 'playing'
                                                        || bufferLength > 0 ? (event.type === 'progress'
                                                        || event.type === 'timeupdate')
                                                        && video.buffered.end(bufferLength - 1) === lastProgress : true;

            if (!videoStalled || (!bufferLength && phenixRTC.browser !== 'Edge') || hasNotProgressedSinceLastProgressEvent) {
                return;
            }

            if (event.type === 'progress') {
                lastProgress = video.buffered.end(bufferLength - 1);
            }

            var timeSinceStop = _.now() - videoStalled;

            that.recordMetric('Buffering', {uint64: timeSinceStop});

            logMetric.call(that, '[buffering] Stream has recovered from stall after [%s] milliseconds', timeSinceStop);

            videoStalled = null;
        };

        _.addEventListener(video, 'stalled', listenForStall);
        _.addEventListener(video, 'pause', listenForStall);
        _.addEventListener(video, 'suspend', listenForStall);
        _.addEventListener(video, 'play', listenForContinuation);
        _.addEventListener(video, 'playing', listenForContinuation);
        _.addEventListener(video, 'progress', listenForContinuation);
        _.addEventListener(video, 'timeupdate', listenForContinuation);

        var rebufferingDisposable = new disposable.Disposable(function() {
            _.removeEventListener(video, 'stalled', listenForStall);
            _.removeEventListener(video, 'pause', listenForStall);
            _.removeEventListener(video, 'suspend', listenForStall);
            _.removeEventListener(video, 'play', listenForContinuation);
            _.removeEventListener(video, 'playing', listenForContinuation);
            _.removeEventListener(video, 'progress', listenForContinuation);
            _.removeEventListener(video, 'timeupdate', listenForContinuation);
        });

        this._disposables.add(rebufferingDisposable);

        return rebufferingDisposable;
    };

    StreamTelemetry.prototype.recordVideoPlayingAndPausing = function(video: video) {
        var that = this;
        var hasListenedToVideo = _.find(this._playTrackedVideos, function(trackedVideo: trackedVideo) {
            return trackedVideo === video;
        });

        if (hasListenedToVideo) {
            return new disposable.Disposable(_.noop);
        }

        this._playTrackedVideos.push(video);

        var listenForPlayChange = function() {
            if (video.paused) {
                that.recordMetric('Playing', {boolean: false});
            } else {
                that.recordMetric('Playing', {boolean: true});
            }
        };

        _.addEventListener(video, 'pause', listenForPlayChange);
        _.addEventListener(video, 'playing', listenForPlayChange);

        var playingDisposable = new disposable.Disposable(function() {
            _.removeEventListener(video, 'pause', listenForPlayChange);
            _.removeEventListener(video, 'playing', listenForPlayChange);
        });

        this._disposables.add(playingDisposable);

        return playingDisposable;
    };

    function logMetric(this: any, arg1?: string, arg2?: any, arg3?:any) {
        var args = Array.prototype.slice.call(arguments);

        if (args.length === 0) {
            throw new Error('Invalid logging arguments.');
        }

        var streamTelemetryPrepend = '[%s] [StreamTelemetry] [%s] ';
        var message = streamTelemetryPrepend + args[0];
        var loggingArguments = args.slice(1);
        var telemetryArguments = [message, this._streamId, _.now() - this._start].concat(loggingArguments);

        this._logger.debug.apply(this._logger, telemetryArguments);
    }

    function since() {
        var now = _.now();

        return (now - start) / 1000;
    }

    function recordMetricRecord(this: any, record: Record_recordMetricRecord, since: any) {
        assert.isStringNotEmpty(record.metric, 'record.metric');

        var annotatedRecord = _.assign({}, this._properties, record);

        this._metricsTransmitter.submitMetric(record.metric, since, this._sessionId, this._streamId, this._version, annotatedRecord);
    }

    return StreamTelemetry;
});