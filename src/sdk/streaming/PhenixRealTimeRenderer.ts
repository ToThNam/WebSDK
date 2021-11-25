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
    'phenix-web-http',
    'phenix-web-disposable',
    'phenix-rtc',
    'phenix-web-application-activity-detector',
    'phenix-web-detect-browser',
    'phenix-web-global',
    '../DimensionsChangedMonitor',
    './stream.json',
    './FeatureDetector'
], function(_, assert, event, http, disposable, rtc, applicationActivityDetector, DetectBrowser, global, DimensionsChangedMonitor, streamEnums, FeatureDetector) {
    'use strict';

    var listenForPauseChangeAfterForegroundInterval = 1000;
    // Restarts less than 100ms after foregrounding cause subsequent "pause" events on the video
    var restartRendererDelay = 200;

    function PhenixRealTimeRenderer(streamId: string, streamSrc: string, streamTelemetry: any, options: any, logger: any) {
        this._logger = logger;
        this._streamId = streamId;
        this._streamSrc = streamSrc;
        this._streamTelemetry = streamTelemetry;
        this._options = options;
        this._renderer = null;
        this._element = null;
        this._dimensionsChangedMonitor = new DimensionsChangedMonitor(logger);
        this._namedEvents = new event.NamedEvents();
        this._disposables = new disposable.DisposableList();
        this._browser = (new DetectBrowser(_.get(global, ['navigator', 'userAgent'], ''))).detect();
        this._wasPlaying = false;
        this._lastBackgroundingTimestamp = 0;
        this._lastStalledTimestamp = 0;

        this._disposables.add(applicationActivityDetector.onBackground(_.bind(checkIfWasPlayingWhenGoingToBackground, this)));
        this._disposables.add(applicationActivityDetector.onForeground(_.bind(resumeWhenEnteringForgeround, this)));

        this._onStalling = _.bind(stalling, this);
        this._onEnded = _.bind(ended, this);
    }

    PhenixRealTimeRenderer.prototype.on = function(name: string, callback: any) {
        // TODO(sbi) Remove after users have upgraded to new API
        if (name === 'userActionRequired') {
            throw new Error('"userActionRequired is no longer supported. See https://phenixrts.com/docs/web/#view-a-channel and https://phenixrts.com/docs/web/#channel-viewer');
        }

        return this._namedEvents.listen(name, callback);
    };

    PhenixRealTimeRenderer.prototype.start = function(elementToAttachTo: { muted: boolean; }) {
        var that = this;
        var hasAudioTrack = !!_.find(this._streamSrc.getTracks(), function(track: { kind: string; }) {
            return track.kind === 'audio';
        });

        if (!this._options.canPlaybackAudio) {
            if (this._options.disableAudioIfNoOutputFound && this._options.forcedAudioDisabled) {
                this._logger.warn('[%s] Missing audio playback device. Audio has been disabled on stream. Try setting up an audio device and re-subscribe in order to receive audio.', this._streamId);
            } else if (!this._options.disableAudioIfNoOutputFound && hasAudioTrack) {
                this._logger.warn('[%s] Missing audio playback device. May experience audio and/or video failure. Try setting up an audio device OR pass the [disableAudioIfNoOutputFound] option when subscribing to disable audio playback when no devices are attached.', this._streamId);
            }
        }

        this._element = rtc.attachMediaStream(elementToAttachTo, this._streamSrc, function(e: any) {
            if (!e) {
                that._logger.debug('[%s] Successfully started playing stream.', that._streamId);

                return;
            }

            if (elementToAttachTo.muted || !hasAudioTrack) {
                that._logger.warn('[%s] Failed to play muted stream.', that._streamId, e);

                return that._namedEvents.fire(streamEnums.rendererEvents.failedToPlay.name, ['failed-to-play']);
            }

            if (that._options.disableAutoMuting) {
                that._logger.warn('[%s] Failed to play unmuted stream.', that._streamId, e);

                return that._namedEvents.fire(streamEnums.rendererEvents.failedToPlay.name, ['failed-to-play-unmuted']);
            }

            that._logger.debug('[%s] Failed to start playing stream. Auto muting the playback and trying again.', that._streamId);
            elementToAttachTo.muted = true;

            that._element = rtc.attachMediaStream(elementToAttachTo, that._streamSrc, function(e: any) {
                if (e) {
                    that._logger.warn('[%s] Failed to play even after auto muting.', that._streamId, e);

                    // Restore muted state
                    elementToAttachTo.muted = false;

                    return that._namedEvents.fire(streamEnums.rendererEvents.failedToPlay.name, ['failed-to-play']);
                }

                that._logger.info('[%s] Successfully started playing stream after auto muting. User may manually unmute with user triggered action.', that._streamId);

                that._namedEvents.fire(streamEnums.rendererEvents.autoMuted.name, ['retry-play-muted']);
            });
        });

        this._disposables.add(this._streamTelemetry.recordTimeToFirstFrame(elementToAttachTo));
        this._disposables.add(this._streamTelemetry.recordRebuffering(elementToAttachTo));
        this._disposables.add(this._streamTelemetry.recordVideoResolutionChanges(this, elementToAttachTo));
        this._disposables.add(this._streamTelemetry.recordVideoPlayingAndPausing(elementToAttachTo));

        if (this._options.receiveAudio === false) {
            elementToAttachTo.muted = true;
        }

        _.addEventListener(elementToAttachTo, 'stalled', this._onStalling, false);
        _.addEventListener(elementToAttachTo, 'pause', this._onStalling, false);
        _.addEventListener(elementToAttachTo, 'suspend', this._onStalling, false);
        _.addEventListener(elementToAttachTo, 'ended', this._onEnded, false);

        if (!this._options.capabilities.includes('audio-only')) {
            this._dimensionsChangedMonitor.start(this, elementToAttachTo);
        }

        return elementToAttachTo;
    };

    PhenixRealTimeRenderer.prototype.stop = function(reason: any) {
        this._dimensionsChangedMonitor.stop();

        this._disposables.dispose();

        if (this._element) {
            _.removeEventListener(this._element, 'stalled', this._onStalling, false);
            _.removeEventListener(this._element, 'pause', this._onStalling, false);
            _.removeEventListener(this._element, 'suspend', this._onStalling, false);
            _.removeEventListener(this._element, 'ended', this._onEnded, false);

            if (_.isFunction(this._element.pause)) {
                this._element.pause();
            }

            if (this._browser.browser === 'Edge') {
                this._element.src = '';
            }

            if (this._element.src) {
                if (this._browser.browser === 'IE') {
                    this._element.src = null;
                } else {
                    this._element.src = '';
                }
            }

            if (this._element.srcObject) {
                this._element.srcObject = null;
            }

            this._element = null;
        }

        this._logger.info('[%s] Phenix real-time renderer has been destroyed', this._streamId);

        this._namedEvents.fire(streamEnums.rendererEvents.ended.name, [reason]);
    };

    PhenixRealTimeRenderer.prototype.getStats = function() {
        if (!this._element) {
            return {
                width: 0,
                height: 0,
                currentTime: 0.0,
                lag: 0.0,
                networkState: streamEnums.networkStates.networkNoSource.id
            };
        }

        var trueCurrentTime = (_.now() - this._options.originStartTime) / 1000;
        var lag = this._options.networkLag / 1000; // Check RTC stats instead

        return {
            width: this._element.videoWidth || this._element.width,
            height: this._element.videoHeight || this._element.height,
            currentTime: trueCurrentTime,
            lag: lag,
            networkState: this._element.networkState
        };
    };

    PhenixRealTimeRenderer.prototype.setDataQualityChangedCallback = function(callback: any) {
        assert.isFunction(callback, 'callback');

        this.dataQualityChangedCallback = callback;
    };

    PhenixRealTimeRenderer.prototype.addVideoDisplayDimensionsChangedCallback = function(callback: any, options: any) {
        return this._dimensionsChangedMonitor.addVideoDisplayDimensionsChangedCallback(callback, options);
    };

    function stalling(event: { type: string; }) {
        var isLastBackgroundingRecent = (_.now() - this._lastBackgroundingTimestamp) < listenForPauseChangeAfterForegroundInterval;

        if (event.type === 'pause' && isLastBackgroundingRecent) {
            this._wasPlaying = true;
        }

        this._lastStalledTimestamp = _.now();

        this._logger.info('[%s] Loading Phenix Real-Time stream player stalling caused by [%s] event.', this._streamId, event.type);
    }

    function ended() {
        this._logger.info('[%s] Phenix Real-Time stream ended.', this._streamId);
    }

    function checkIfWasPlayingWhenGoingToBackground() {
        if (!this._element) {
            return;
        }

        var playing = false;
        var isLastStallingRecent = _.now() - this._lastStalledTimestamp < listenForPauseChangeAfterForegroundInterval;

        if (_.isBoolean(this._element.playing)) {
            playing = this._element.playing;
        } else if (_.isBoolean(this._element.paused)) {
            playing = !this._element.paused;
        }

        if (!playing && isLastStallingRecent) {
            playing = true;
        }

        this._wasPlaying = playing;
        this._lastBackgroundingTimestamp = _.now();
    }

    function resumeWhenEnteringForgeround() {
        if (!this._element) {
            return;
        }

        var that = this;

        this._lastBackgroundingTimestamp = 0;
        this._lastStalledTimestamp = 0;

        if (!this._wasPlaying) {
            this._logger.info('[%s] Entering foreground with paused renderer [%s]', this._streamId, this._browser.browser);

            return;
        }

        this._logger.info('[%s] Resume playing after entering foreground [%s]', this._streamId, this._browser.browser);

        if (this._browser.browser === 'Safari' && FeatureDetector.isIOS()) {
            // 2020-08-19 Observed on iOS Safari/13
            var pausing = function pausing() {
                that._logger.info('Renderer was paused after entering foreground');
                that._namedEvents.fire(streamEnums.rendererEvents.failedToPlay.name, ['paused-by-background']);
            };

            _.addEventListener(that._element, 'pause', pausing);

            var timeoutId = setTimeout(function() {
                _.removeEventListener(that._element, 'pause', pausing);
            }, listenForPauseChangeAfterForegroundInterval);

            this._disposables.add(new disposable.Disposable(function() {
                clearTimeout(timeoutId);
            }));

            // Dispatch to avoid: "NotAllowedError: The request is not allowed by the user agent or the platform in the current context"
            setTimeout(function() {
                // The first video.play() typically fails with a context error.
                // Try once so the start logic can properly handle auto muting.
                that._element.play().catch(function(e: any) {
                    that._logger.info('[%s] Unable to resume playback after entering foreground', that._streamId, e);
                    that._element.src = '';

                    that._logger.info('[%s] (Re)starting renderer', that._streamId);
                    that.start(that._element);
                });
            }, restartRendererDelay);
        }
    }

    return PhenixRealTimeRenderer;
});