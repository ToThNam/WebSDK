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

define('',[
    'phenix-web-lodash-light',
    'phenix-web-assert',
    'phenix-web-logging',
    'phenix-web-event',
    'phenix-web-http',
    'phenix-web-disposable',
    'phenix-rtc',
    '../DimensionsChangedMonitor',
    './stream.json'
], function(_, assert, logging, event, http, disposable, rtc, DimensionsChangedMonitor, streamEnums) {
    'use strict';

    var bandwidthAt720 = 3000000;
    var timeoutForStallWithoutProgressToRestart = 6000;
    var minTimeBeforeNextReload = 15000;
    var originStreamReadyDuration = 6000;

    function PhenixPlayerRenderer(this: any, streamId: string, uri: string, streamTelemetry: any, options: any, webPlayer: any, logger: any) {
        this._logger = logger;
        this._streamId = streamId;
        this._manifestUri = encodeURI(uri).replace(/[#]/g, '%23');
        this._streamTelemetry = streamTelemetry;
        this._options = options;
        this._webPlayer = webPlayer;
        this._renderer = null;
        this._element = null;
        this._dimensionsChangedMonitor = new DimensionsChangedMonitor(logger);
        this._lastProgress = {
            time: 0,
            buffered: null,
            averageLength: 0,
            count: 0,
            lastCurrentTime: 0,
            lastCurrentTimeOccurenceTimestamp: 0
        };
        this._namedEvents = new event.NamedEvents();
        this._disposables = new disposable.DisposableList();

        this._onStalled = _.bind(stalled, this);
        this._onProgress = _.bind(onProgress, this);
        this._onEnded = _.bind(ended, this);
    }

    PhenixPlayerRenderer.prototype.isSupported = function() {
        return this._webPlayer && this._webPlayer.isSupported;
    };

    PhenixPlayerRenderer.prototype.on = function(name: string, callback: any) {
        return this._namedEvents.listen(name, callback);
    };

    PhenixPlayerRenderer.prototype.start = function(elementToAttachTo: { muted: boolean; }) {
        var that = this;
        var loggerAtInfoThreshold = createInfoThresholdLogger(this._logger);

        this._throttledLogger = loggerAtInfoThreshold;
        this._element = elementToAttachTo;

        this._disposables.add(this._streamTelemetry.recordTimeToFirstFrame(elementToAttachTo));
        this._disposables.add(this._streamTelemetry.recordRebuffering(elementToAttachTo));
        this._disposables.add(this._streamTelemetry.recordVideoResolutionChanges(this, elementToAttachTo));
        this._disposables.add(this._streamTelemetry.recordVideoPlayingAndPausing(elementToAttachTo));

        setupPlayer.call(that);

        if (that._options.receiveAudio === false) {
            elementToAttachTo.muted = true;
        }

        _.addEventListener(elementToAttachTo, 'stalled', that._onStalled, false);
        _.addEventListener(elementToAttachTo, 'pause', that._onStalled, false);
        _.addEventListener(elementToAttachTo, 'suspend', that._onStalled, false);
        _.addEventListener(elementToAttachTo, 'progress', that._onProgress, false);
        _.addEventListener(elementToAttachTo, 'ended', that._onEnded, false);

        if (!this._options.capabilities.includes('audio-only')) {
            this._dimensionsChangedMonitor.start(this, elementToAttachTo);
        }

        return elementToAttachTo;
    };

    PhenixPlayerRenderer.prototype.stop = function(reason: string, waitForLastChunk: boolean) {
        var that = this;

        if (that._waitingForFinalization) {
            return;
        }

        if (waitForLastChunk) {
            return that._waitForLastChunk = true;
        }

        this._dimensionsChangedMonitor.stop();

        this._disposables.dispose();

        if (this._player) {
            var finalizeStreamEnded = function finalizeStreamEnded() {
                var reason = '';

                if (that._element) {
                    _.removeEventListener(that._element, 'stalled', that._onStalled, false);
                    _.removeEventListener(that._element, 'pause', that._onStalled, false);
                    _.removeEventListener(that._element, 'suspend', that._onStalled, false);
                    _.removeEventListener(that._element, 'progress', that._onProgress, false);
                    _.removeEventListener(that._element, 'ended', that._onEnded, false);

                    if (rtc.browser === 'Edge') {
                        that._element.src = '';
                    }
                }

                that._namedEvents.fire(streamEnums.rendererEvents.ended.name, [reason]);

                that._player = null;
                that._element = null;
            };

            that._waitingForFinalization = true;

            try {
                that._player.dispose();

                that._logger.info('[%s] Phenix stream has been destroyed', that._streamId);

                finalizeStreamEnded();
            } catch (e: any) {
                that._logger.error('[%s] Error while destroying Phenix stream player [%s]', that._streamId, e.code, e);

                finalizeStreamEnded();

                that._namedEvents.fire(streamEnums.rendererEvents.error.name, ['phenix-player', e]);
            }
        }
    };

    PhenixPlayerRenderer.prototype.getStats = function() {
        if (!this._player) {
            return {
                width: 0,
                height: 0,
                currentTime: 0.0,
                lag: 0.0,
                networkState: streamEnums.networkStates.networkNoSource.id
            };
        }

        var stat = this._player.getStats();
        var currentTime = stat.currentTime || this._element.currentTime;
        var trueCurrentTime = (_.now() - this._options.originStartTime) / 1000;

        if (stat.isNative && stat.deliveryType === 'Hls') {
            stat.currentTime = trueCurrentTime - stat.lag;
        }

        if (!stat.isNative) {
            stat.lag = Math.max(0.0, trueCurrentTime - currentTime);
        }

        if (stat.estimatedBandwidth > 0) {
            stat.networkState = streamEnums.networkStates.networkLoading.id;
        } else if (stat.playTime > 0) {
            stat.networkState = streamEnums.networkStates.networkIdle.id;
        } else if (stat.video) {
            stat.networkState = streamEnums.networkStates.networkEmpty.id;
        } else {
            stat.networkState = streamEnums.networkStates.networkNoSource.id;
        }

        return stat;
    };

    PhenixPlayerRenderer.prototype.setDataQualityChangedCallback = function(callback: ()=> void) {
        assert.isFunction(callback, 'callback');

        this.dataQualityChangedCallback = callback;
    };

    PhenixPlayerRenderer.prototype.getPlayer = function() {
        return this._player;
    };

    PhenixPlayerRenderer.prototype.addVideoDisplayDimensionsChangedCallback = function(callback: any, options: any) {
        return this._dimensionsChangedMonitor.addVideoDisplayDimensionsChangedCallback(callback, options);
    };

    function setupPlayer(this: any) {
        var that = this;
        var playerOptions = _.assign({bandwidthToStartAt: bandwidthAt720}, that._options);

        if (_.includes(this._manifestUri, '.mpd')) {
            if (that._options.isDrmProtectedContent) {
                playerOptions.drm = {
                    'com.widevine.alpha': {
                        serverCertificateUrl: that._options.widevineServiceCertificateUrl,
                        mediaKeySystemConfiguration: {persistentState: 'required'}
                    },
                    'com.microsoft.playready': {licenseServerUrl: that._options.playreadyLicenseUrl}
                };
            }
        }

        var webPlayer = new this._webPlayer.WebPlayer(this._throttledLogger, this._element, playerOptions);
        var timeSinceOriginStreamStart = _.now() - this._options.originStartTime;

        if (timeSinceOriginStreamStart < originStreamReadyDuration && this._options.isDrmProtectedContent && _.includes(this._manifestUri, '.m3u8')) {
            setTimeout(_.bind(webPlayer.start, webPlayer, that._manifestUri), originStreamReadyDuration);
        } else {
            webPlayer.start(that._manifestUri);
        }

        that._player = webPlayer;

        _.addEventListener(that._player, 'error', _.bind(handleError, that));
    }

    function handleError(this: any, e: any) {
        if (canReload.call(this) && e && (e.code === 3 || e.severity === this._webPlayer.errors.severity.RECOVERABLE)) {
            this._logger.warn('Reloading unhealthy stream after error event [%s]', e);

            return reloadIfAble.call(this);
        }

        this._namedEvents.fire(streamEnums.rendererEvents.error.name, ['phenix-player', e]);
    }

    function reload(this: any) {
        this._player.dispose();

        this._player = null;

        this.start(this._element);
    }

    function reloadIfAble(this: any) {
        if (!canReload.call(this)) {
            return;
        }

        this._logger.warn('Reloading unhealthy stream that was active for at least [%s] seconds', minTimeBeforeNextReload / 1000);

        this._lastReloadTime = _.now();

        reload.call(this);
    }

    function canReload(this: any) {
        var hasElapsedMinTimeSinceLastReload = !this._lastReloadTime || _.now() - this._lastReloadTime > minTimeBeforeNextReload;

        return this._element && !this._waitForLastChunk && this._player && this._element.buffered.length !== 0 && hasElapsedMinTimeSinceLastReload;
    }

    function onProgress(this: any) {
        this._lastProgress.time = _.now();

        if (this._element.buffered.length === 0) {
            return this._logger.debug('[%s] Phenix stream player progress event fired without any buffered content', this._streamId);
        }

        var bufferedEnd = this._element.buffered.end(this._element.buffered.length - 1);

        if (this._lastProgress.buffered === bufferedEnd) {
            return;
        }

        // Start and end times are unreliable for overall length of stream.
        if (this._lastProgress.buffered !== null) {
            var oldTimeElapsed = this._lastProgress.averageLength * this._lastProgress.count;
            var newTimeElapsed = oldTimeElapsed + (bufferedEnd - this._lastProgress.buffered);
            var isStalled = this._lastProgress.lastCurrentTime === this._element.currentTime;

            this._lastProgress.count += 1;
            this._lastProgress.averageLength = newTimeElapsed / this._lastProgress.count;

            if (!isStalled) {
                this._lastProgress.lastCurrentTimeOccurenceTimestamp = _.now();
            }

            var hasExceededStallTimeout = this._lastProgress.lastCurrentTimeOccurenceTimestamp && _.now() - this._lastProgress.lastCurrentTimeOccurenceTimestamp > timeoutForStallWithoutProgressToRestart;

            if (isStalled && hasExceededStallTimeout && this._element && !this._element.paused && canReload.call(this)) {
                this._logger.warn('Reloading stream after current time has not changed for [%s] seconds due to unregistered stall.', timeoutForStallWithoutProgressToRestart / 1000);

                reloadIfAble.call(this);
            }
        }

        this._lastProgress.buffered = bufferedEnd;
        this._lastProgress.lastCurrentTime = this._element.currentTime;
    }

    function stalled(this: any, event: { type: any; }) {
        var that = this;

        that._logger.info('[%s] Loading Phenix Live stream player stalled caused by [%s] event.', that._streamId, event.type);

        if (that._lastProgress.time === 0 || that._element.paused) {
            return;
        }

        var currentVideoTime = that._element.currentTime;

        setTimeout(function() {
            if (_.now() - that._lastProgress.time > getTimeoutOrMinimum.call(that) && that._waitForLastChunk) {
                that.stop('ended');
            }
        }, getTimeoutOrMinimum.call(that));

        setTimeout(function() {
            if (that._element && that._element.currentTime === currentVideoTime && !that._element.paused && canReload.call(that)) {
                that._logger.warn('Reloading stream after being stalled for [%s] seconds', timeoutForStallWithoutProgressToRestart / 1000);

                reloadIfAble.call(that);
            }
        }, timeoutForStallWithoutProgressToRestart);
    }

    function getTimeoutOrMinimum(this: any) {
        return this._lastProgress.averageLength * 1.5 < 2000 ? 2000 : this._lastProgress.averageLength * 1.5;
    }

    function ended(this: any) {
        this._logger.info('[%s] Phenix stream player ended.', this._streamId);
    }

    function createInfoThresholdLogger(logger: { getAppenders: () => void; getUserId: () => void; getEnvironment: () => void; getApplicationVersion: () => void; getObservableSessionId: () => void; }) {
        var appenders = logger.getAppenders();
        var throttledLogger = new logging.Logger();

        _.forEach(appenders, function(appender: { setThreshold: (arg0: any) => void; }) {
            if (appender instanceof logging.ConsoleAppender) {
                appender = new logging.ConsoleAppender();

                appender.setThreshold(logging.level.INFO);
            }

            throttledLogger.addAppender(appender);
        });

        throttledLogger.setUserId(logger.getUserId());
        throttledLogger.setEnvironment(logger.getEnvironment());
        throttledLogger.setApplicationVersion(logger.getApplicationVersion());
        throttledLogger.setObservableSessionId(logger.getObservableSessionId());

        return throttledLogger;
    }

    return PhenixPlayerRenderer;
});