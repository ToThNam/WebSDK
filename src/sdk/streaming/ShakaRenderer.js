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
    '../DimensionsChangedMonitor',
    './stream.json'
], function(_, assert, event, http, disposable, rtc, DimensionsChangedMonitor, streamEnums) {
    'use strict';

    var widevineServiceCertificate = null;
    var defaultBandwidthEstimateForPlayback = 2000000; // 2Mbps will select 720p by default

    function ShakaRenderer(streamId, uri, streamTelemetry, options, shaka, logger) {
        this._logger = logger;
        this._streamId = streamId;
        this._manifestUri = encodeURI(uri).replace(/[#]/g, '%23');
        this._streamTelemetry = streamTelemetry;
        this._options = options;
        this._renderer = null;
        this._element = null;
        this._dimensionsChangedMonitor = new DimensionsChangedMonitor(logger);
        this._lastProgress = {
            time: 0,
            buffered: null,
            averageLength: 0,
            count: 0
        };
        this._namedEvents = new event.NamedEvents();
        this._disposables = new disposable.DisposableList();
        this._shaka = shaka;

        this._onStalled = _.bind(stalled, this);
        this._onProgress = _.bind(onProgress, this);
        this._onEnded = _.bind(ended, this);
    }

    ShakaRenderer.prototype.on = function(name, callback) {
        return this._namedEvents.listen(name, callback);
    };

    ShakaRenderer.prototype.start = function(elementToAttachTo) {
        var that = this;

        that._player = new this._shaka.Player(elementToAttachTo);

        this._disposables.add(this._streamTelemetry.recordTimeToFirstFrame(elementToAttachTo));
        this._disposables.add(this._streamTelemetry.recordRebuffering(elementToAttachTo));
        this._disposables.add(this._streamTelemetry.recordVideoResolutionChanges(this, elementToAttachTo));

        var playerConfig = {
            abr: {defaultBandwidthEstimate: defaultBandwidthEstimateForPlayback},
            manifest: {retryParameters: {timeout: 10000}},
            streaming: {
                rebufferingGoal: 2,
                bufferingGoal: 10,
                bufferBehind: 30,
                retryParameters: {
                    timeout: 10000,
                    maxAttempts: 10,
                    backoffFactor: 1.1
                }
            }
        };

        if (this._options.isDrmProtectedContent) {
            checkBrowserSupportForWidevineDRM.call(that);
            unwrapLicenseResponse.call(that, that._player);
            addDrmSpecificsToPlayerConfig.call(that, playerConfig, that._options, function(err, updatedPlayerConfig) {
                if (!err) {
                    loadPlayer(updatedPlayerConfig);
                } else {
                    that._logger.error('Failed to add DRM configuration to shaka player', err);

                    throw err;
                }
            });
        } else {
            loadPlayer(playerConfig);
        }

        function loadPlayer(config) {
            that._player.configure(config);

            if (that._options.receiveAudio === false) {
                elementToAttachTo.muted = true;
            }

            _.addEventListener(that._player, 'error', function(e) {
                that._namedEvents.fire(streamEnums.rendererEvents.error.name, ['player', e]);
            });

            _.addEventListener(elementToAttachTo, 'stalled', that._onStalled, false);
            _.addEventListener(elementToAttachTo, 'pause', that._onStalled, false);
            _.addEventListener(elementToAttachTo, 'suspend', that._onStalled, false);
            _.addEventListener(elementToAttachTo, 'progress', that._onProgress, false);
            _.addEventListener(elementToAttachTo, 'ended', that._onEnded, false);

            that._player.load(that._manifestUri).then(function() {
                that._logger.info('[%s] DASH live stream has been loaded', that._streamId);

                if (_.isFunction(elementToAttachTo.play)) {
                    elementToAttachTo.play();
                }
            }).catch(function(e) {
                that._logger.error('[%s] Error while loading DASH live stream [%s]', that._streamId, e.code, e);

                that._namedEvents.fire(streamEnums.rendererEvents.error.name, ['shaka', e]);
            });

            if (!that._options.capabilities.includes('audio-only')) {
                that._dimensionsChangedMonitor.start(this, elementToAttachTo);
            }

            that._element = elementToAttachTo;
        }

        return elementToAttachTo;
    };

    ShakaRenderer.prototype.stop = function(reason, waitForLastChunk) {
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

            var destroyIgnored = that._player.destroy()
                .then(function() {
                    that._logger.info('[%s] Shaka live stream player has been destroyed', that._streamId);
                }).then(function() {
                    finalizeStreamEnded();
                }).catch(function(e) {
                    that._logger.error('[%s] Error while destroying shaka live stream player [%s]', that._streamId, e.code, e);

                    finalizeStreamEnded();

                    that._namedEvents.fire(streamEnums.rendererEvents.error.name, ['shaka', e]);
                });

            that._waitingForFinalization = true;
        }
    };

    ShakaRenderer.prototype.getStats = function() {
        if (!this._player) {
            return {
                width: 0,
                height: 0,
                currentTime: 0,
                lag: 0,
                networkState: streamEnums.networkStates.networkNoSource.id
            };
        }

        var stat = _.assign(this._player.getStats(), {
            currentTime: 0,
            lag: 0
        });
        var currentTime = _.get(this._element, ['currentTime'], 0);
        var trueCurrentTime = (_.now() - this._options.originStartTime) / 1000;
        var lag = Math.max(0.0, trueCurrentTime - currentTime);

        if (this._element) {
            stat.currentTime = currentTime;
            stat.lag = lag;
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

    ShakaRenderer.prototype.setDataQualityChangedCallback = function(callback) {
        assert.isFunction(callback, 'callback');

        this.dataQualityChangedCallback = callback;
    };

    ShakaRenderer.prototype.getPlayer = function() {
        return this._player;
    };

    ShakaRenderer.prototype.addVideoDisplayDimensionsChangedCallback = function(callback, options) {
        return this._dimensionsChangedMonitor.addVideoDisplayDimensionsChangedCallback(callback, options);
    };

    function onProgress() {
        this._lastProgress.time = _.now();

        if (this._element.buffered.length === 0) {
            return this._logger.debug('[%s] Shaka live stream player progress event fired without any buffered content', this._streamId);
        }

        var bufferedEnd = this._element.buffered.end(this._element.buffered.length - 1);

        if (this._lastProgress.buffered === bufferedEnd) {
            return;
        }

        // Start and end times are unreliable for overall length of stream.
        if (this._lastProgress.buffered !== null) {
            var oldTimeElapsed = this._lastProgress.averageLength * this._lastProgress.count;
            var newTimeElapsed = oldTimeElapsed + (bufferedEnd - this._lastProgress.buffered);

            this._lastProgress.count += 1;
            this._lastProgress.averageLength = newTimeElapsed / this._lastProgress.count;
        }

        this._lastProgress.buffered = bufferedEnd;
    }

    function stalled() {
        var that = this;

        that._logger.info('[%s] Loading Shaka live stream player stream stalled.', that._streamId);

        if (that._lastProgress.time === 0) {
            return;
        }

        setTimeout(function() {
            if (_.now() - that._lastProgress.time > getTimeoutOrMinimum.call(that) && that._waitForLastChunk) {
                that.stop('ended');
            }
        }, getTimeoutOrMinimum.call(that));
    }

    function getTimeoutOrMinimum() {
        return this._lastProgress.averageLength * 1.5 < 2000 ? 2000 : this._lastProgress.averageLength * 1.5;
    }

    function ended() {
        this._logger.info('[%s] Shaka live stream player ended.', this._streamId);
    }

    function checkBrowserSupportForWidevineDRM() {
        var error;

        if (!_.isFunction(Uint8Array)) {
            error = 'Uint8Array support required for DRM';
            this._logger.error(error);

            throw new Error(error);
        }

        if (!_.isFunction(rtc.global.atob)) {
            error = 'rtc.global.atob support required for DRM';
            this._logger.error(error);

            throw new Error(error);
        }
    }

    function unwrapLicenseResponse(player) {
        var that = this;

        player.getNetworkingEngine().registerResponseFilter(function(type, response) {
            // Only manipulate license responses:
            if (type.toString() === that._shaka.net.NetworkingEngine.RequestType.LICENSE.toString()) {
                var binaryResponseAsTypedArray = new Uint8Array(response.data);
                var responseAsString = String.fromCharCode.apply(null, binaryResponseAsTypedArray);
                var parsedResponse = JSON.parse(responseAsString);
                var base64License = parsedResponse.license;
                var decodedLicense = rtc.global.atob(base64License);

                response.data = new Uint8Array(decodedLicense.length);

                for (var i = 0; i < decodedLicense.length; ++i) {
                    response.data[i] = decodedLicense.charCodeAt(i);
                }

                if (parsedResponse.trackRestrictions) {
                    player.configure({restrictions: parsedResponse.trackRestrictions});
                }
            }
        });
    }

    function addDrmSpecificsToPlayerConfig(playerConfig, options, callback) {
        if (!playerConfig.drm) {
            playerConfig.drm = {};
        }

        if (!playerConfig.drm.advanced) {
            playerConfig.drm.advanced = {};
        }

        if (!playerConfig.manifest) {
            playerConfig.manifest = {};
        }

        if (!playerConfig.manifest.dash) {
            playerConfig.manifest.dash = {};
        }

        // Add browser specific DRM calls here
        // Currently we support Widevine only
        addWidevineConfigToPlayerConfig.call(this, playerConfig, options, callback);
    }

    // ToDo pull into singleton so widevineServiceCertificate stays per browser session
    function addWidevineConfigToPlayerConfig(playerConfig, options, callback) {
        playerConfig['manifest']['dash']['customScheme'] = function(element) {
            if (element.getAttribute('schemeIdUri') === 'com.phenixrts.widevine' || element.getAttribute('schemeIdUri') === 'com.phenixp2p.widevine') {
                return [{
                    keySystem: 'com.widevine.alpha',
                    licenseServerUri: decodeURIComponent(element.getAttribute('widevineLicenseServerUrl'))
                }];
            }
        };

        function addToPlayerconfig(error, serverCertificateResponse) {
            if (error) {
                callback(error);

                return;
            }

            widevineServiceCertificate = serverCertificateResponse.data; // Cache so that we can reuse

            playerConfig.drm.advanced['com.widevine.alpha'] = {
                'serverCertificate': convertBinaryStringToUint8Array(serverCertificateResponse.data),
                'persistentStateRequired': true,
                'distinctiveIdentifierRequired': false
            };

            callback(null, playerConfig);
        }

        if (widevineServiceCertificate) {
            addToPlayerconfig(null, widevineServiceCertificate);
        } else {
            http.get(options.widevineServiceCertificateUrl, {mimeType: 'text/plain; charset=x-user-defined'}, addToPlayerconfig);
        }
    }

    function convertBinaryStringToUint8Array(bStr) {
        var len = bStr.length;
        var u8Array = new Uint8Array(len); // eslint-disable-line no-undef

        for (var i = 0; i < len; i++) {
            u8Array[i] = bStr.charCodeAt(i);
        }

        return u8Array;
    }

    return ShakaRenderer;
});