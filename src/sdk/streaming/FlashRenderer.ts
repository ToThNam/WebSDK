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

import { Options_FlashRenderer,stat } from "../../../typescript/src/sdk/streaming/FlashRenderer";

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

    var timeoutForStallWithoutProgressToRestart = 6000;
    var minTimeBeforeNextReload = 15000;
    var mostRecentSwfFile = 'rtmp-flash-renderer-2019.2.18.swf';
    var defaultSwfFileSrcs: any = {
        local: 'https://local.phenixrts.com/public/rtmp/' + mostRecentSwfFile,
        staging: 'https://stg.phenixrts.com/public/rtmp/' + mostRecentSwfFile,
        production: 'https://phenixrts.com/public/rtmp/' + mostRecentSwfFile
    };

    function FlashRenderer(this: any, streamId: string, streamsInfo: any, streamTelemetry: any, options: Options_FlashRenderer, logger: any) {
        assert.isObject(options, 'options');

        if (options.env) {
            assert.isStringNotEmpty(options.env, 'options.env');
        }

        var defaultSwfFileSrc = defaultSwfFileSrcs[options.env || 'production'];

        this._logger = logger;
        this._streamId = streamId;
        this._streamsInfo = _.map(streamsInfo, function(info: { uri: string; }) {
            info.uri = encodeURI(info.uri).replace(/[#]/g, '%23');

            return info;
        });
        this._streamTelemetry = streamTelemetry;
        this._options = options;
        this._renderer = null;
        this._phenixVideo = null;
        this._playerElement = null;
        this._namedEvents = new event.NamedEvents();
        this._dimensionsChangedMonitor = new DimensionsChangedMonitor(logger);
        this._disposables = new disposable.DisposableList();

        this._onStalled = _.bind(stalled, this);
        this._onEnded = _.bind(ended, this);
        this._onError = _.bind(handleError, this);
        this._swfSrc = options.swfSrc || defaultSwfFileSrc;
    }

    FlashRenderer.isSupported = function() {
        return detectFlashPlugin();
    };

    FlashRenderer.prototype.on = function(name: any, callback: any) {
        return this._namedEvents.listen(name, callback);
    };

    FlashRenderer.prototype.start = function(elementToAttachTo: any) {
        var that = this;
        var options = {
            streamId: this._streamId,
            swfSrc: this._swfSrc
        };

        this._originElement = elementToAttachTo;
        this._phenixVideo = new rtc.PhenixFlashVideo(elementToAttachTo, this._streamsInfo, options);

        this._phenixVideo.hookUpEvents();

        this._playerElement = this._phenixVideo.getElement();

        this._disposables.add(this._streamTelemetry.recordTimeToFirstFrame(this._originElement));
        this._disposables.add(this._streamTelemetry.recordRebuffering(this._originElement));
        this._disposables.add(this._streamTelemetry.recordVideoResolutionChanges(this, this._originElement));
        this._disposables.add(this._streamTelemetry.recordVideoPlayingAndPausing(this._originElement));

        if (this._playerElement) {
            this._playerElement.play();
        }

        _.addEventListener(this._originElement, 'stalled', that._onStalled, false);
        _.addEventListener(this._originElement, 'pause', that._onStalled, false);
        _.addEventListener(this._originElement, 'suspend', that._onStalled, false);
        _.addEventListener(this._originElement, 'ended', that._onEnded, false);
        _.addEventListener(this._originElement, 'error', that._onError, false);

        return elementToAttachTo;
    };

    FlashRenderer.prototype.stop = function(reason: any) {
        var that = this;

        this._disposables.dispose();

        if (this._phenixVideo) {
            var finalizeStreamEnded = function finalizeStreamEnded() {
                if (that._playerElement) {
                    _.removeEventListener(that._originElement, 'stalled', that._onStalled, false);
                    _.removeEventListener(that._originElement, 'pause', that._onStalled, false);
                    _.removeEventListener(that._originElement, 'suspend', that._onStalled, false);
                    _.removeEventListener(that._originElement, 'ended', that._onEnded, false);
                    _.removeEventListener(that._originElement, 'error', that._onError, false);
                }

                that._playerElement = null;
                that._originElement = null;

                that._namedEvents.fire(streamEnums.rendererEvents.ended.name, [reason]);
            };

            try {
                this._phenixVideo.destroy();
                this._phenixVideo = null;

                finalizeStreamEnded();

                this._logger.info('[%s] Flash player has been destroyed', this._streamId);
            } catch (e: any) {
                that._logger.error('[%s] Error while destroying Flash player [%s]', that._streamId, e.code, e);

                finalizeStreamEnded();

                that._namedEvents.fire(streamEnums.rendererEvents.error.name, ['flash-player', e]);
            }
        }
    };

    FlashRenderer.prototype.getStats = function() {
        if (!this._playerElement) {
            return {
                width: 0,
                height: 0,
                currentTime: 0.0,
                lag: 0.0,
                networkState: streamEnums.networkStates.networkNoSource.id
            };
        }

        var stat: any  = {};
        var currentTime = this._playerElement.currentTime;
        var trueCurrentTime = (_.now() - this._options.originStartTime) / 1000;

        stat.lag = Math.max(0.0, trueCurrentTime - currentTime);

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

    FlashRenderer.prototype.setDataQualityChangedCallback = function(callback: any) {
        assert.isFunction(callback, 'callback');

        this.dataQualityChangedCallback = callback;
    };

    FlashRenderer.prototype.getPlayer = function() {
        return this._player;
    };

    FlashRenderer.prototype.addVideoDisplayDimensionsChangedCallback = function(callback: any, options: any) {
        return this._dimensionsChangedMonitor.addVideoDisplayDimensionsChangedCallback(callback, options);
    };

    function handleError(this: any, e: any) {
        this._namedEvents.fire(streamEnums.rendererEvents.error.name, ['flash-player', e]);
    }

    function reload(this: any) {
        this._phenixVideo.destroy();

        this.start(this._originElement);
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

        return this._playerElement && !this._waitForLastChunk && this._player && this._playerElement.buffered.length !== 0 && hasElapsedMinTimeSinceLastReload;
    }

    function stalled(this: any, event: { type: any; }) {
        var that = this;

        that._logger.info('[%s] Loading flash player stalled caused by [%s] event.', that._streamId, event.type);

        var currentVideoTime = that._playerElement.currentTime;

        setTimeout(function() {
            if (that._playerElement && that._playerElement.currentTime === currentVideoTime && !that._playerElement.paused && canReload.call(that)) {
                that._logger.warn('Reloading stream after being stalled for [%s] seconds', timeoutForStallWithoutProgressToRestart / 1000);

                reloadIfAble.call(that);
            }
        }, timeoutForStallWithoutProgressToRestart);
    }

    function ended(this: any) {
        this._logger.info('[%s] Flash player ended.', this._streamId);
    }

    var hasFlashPlugin: boolean | null = null;

    function detectFlashPlugin() {
        var defaultVersion = [10, 0, 0];
        var pluginName = 'Shockwave Flash';
        var mimeType = 'application/x-shockwave-flash';
        var activeX = 'ShockwaveFlash.ShockwaveFlash';
        var version: any[] = [0, 0, 0];

        if (_.isBoolean(hasFlashPlugin)) {
            return hasFlashPlugin;
        }

        // Firefox, Webkit, Opera
        if (_.get(rtc.global.navigator, ['plugins', pluginName])) {
            var description = rtc.global.navigator.plugins[pluginName].description;

            if (description && _.get(rtc.global.navigator, ['mimeTypes', mimeType, 'enabledPlugin'], false)) {
                version = description.replace(pluginName, '').replace(/^\s+/, '').replace(/\sr/gi, '.').split('.');

                for (var i = 0, total = version.length; i < total; i++) {
                    version[i] = parseInt(version[i].match(/\d+/), 10);
                }
            }
            // Internet Explorer / ActiveX
        } else if (rtc.global.ActiveXObject) {
            try {
                var ax = new rtc.global.ActiveXObject(activeX);

                if (ax) {
                    var versionString = ax.GetVariable("$version") || '';
                    var versionInfo = _.get(versionString.split(" "), [1], version).split(",");

                    version = [parseInt(versionInfo[0], 10), parseInt(versionInfo[1], 10), parseInt(versionInfo[2], 10)];
                }
            } catch (e) {
                console.error(e);
            }
        }

        hasFlashPlugin = (version[0] > defaultVersion[0] || (version[0] === defaultVersion[0] && version[1] > 0) || (version[0] === defaultVersion[0] && version[1] === 0 && version[2] >= 0));

        return hasFlashPlugin;
    }

    return FlashRenderer;
});