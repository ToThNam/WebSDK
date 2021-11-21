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
    Constraints_SetUserMediaOptionsForEdge, 
    Constraints_SetUserMediaOptionsForNewerBrowse, 
    Constraints_SetUserMediaOptionsForOtherBrowsers, 
    DeviceOptions_SetUserMediaOptionsForEdge, 
    DeviceOptions_SetUserMediaOptionsForNewerBrowser, 
    DeviceOptions_SetUserMediaOptionsForOtherBrowsers, 
    Resolution_SetUserMediaOptionsForEdge, 
    Resolution_SetUserMediaOptionsForNewerBrowse,
    Resolution_SetUserMediaOptionsForOtherBrowsers
} from "../../../typescript/src/userMedia/UserMediaResolver";

define('',[
    'phenix-web-lodash-light',
    'phenix-web-assert',
    'phenix-rtc',
    './ResolutionProvider'
], function(_, assert, RTC, ResolutionProvider) {
    'use strict';

    function UserMediaResolver(this: any, pcast: { getLogger: () => any; }, options: { screenShare?: any; }) {
        assert.isObject(pcast, 'pcast');

        if (options) {
            assert.isObject(options, 'options');
        }

        if (options && options.screenShare) {
            assert.isFunction(options.screenShare, 'options.screenShare');
        }

        this._pcast = pcast;
        this._logger = pcast.getLogger();
        this._options = options || {};
        this._onScreenShare = _.get(options, ['onScreenShare']);
    }

    UserMediaResolver.prototype.getUserMedia = function getUserMedia(deviceOptions: object, callback: any) {
        assert.isObject(deviceOptions, 'deviceOptions');

        var resolutionProvider = new ResolutionProvider(this._options);
        var resolution = resolutionProvider.getDefaultResolution();
        var frameRate = resolutionProvider.getDefaultFrameRate();

        getUserMediaWithOptions.call(this, deviceOptions, resolution, frameRate, resolutionProvider, callback);
    };

    UserMediaResolver.prototype.getVendorSpecificConstraints = function getVendorSpecificConstraints(deviceOptions: { audio: any; video: any; screen: any; screenAudio: any; }, resolution: any , frameRate: number) {
        resolution = resolution || {};

        if (!deviceOptions || (!deviceOptions.audio && !deviceOptions.video && !deviceOptions.screen && !deviceOptions.screenAudio)) {
            throw new Error('Invalid device options. Must pass in at least one device option.');
        }

        if ((RTC.browser === 'Firefox' && RTC.browserVersion > 38)
            || (RTC.browser === 'Chrome' && RTC.browserVersion > 52 && !deviceOptions.screen && !deviceOptions.screenAudio)
            || (RTC.browser === 'Safari' && RTC.browserVersion > 10)
            || (RTC.browser === 'Opera' && RTC.browserVersion > 40)) {
            return setUserMediaOptionsForNewerBrowser(deviceOptions, resolution, frameRate);
        }

        if (RTC.browser === 'Edge') {
            return setUserMediaOptionsForEdge(deviceOptions, resolution, frameRate);
        }

        return setUserMediaOptionsForOtherBrowsers(deviceOptions, resolution, frameRate);
    };

    function setUserMediaOptionsForEdge(deviceOptions: DeviceOptions_SetUserMediaOptionsForEdge, resolution: Resolution_SetUserMediaOptionsForEdge, frameRate: number) {
        var video = deviceOptions.video;
        var audio = deviceOptions.audio;
        var screen = deviceOptions.screen;
        var width = resolution.width;
        var height = resolution.height;
        var constraints: Constraints_SetUserMediaOptionsForEdge = {};
        // var constraints: any={} 
        if (video) {
            constraints.video = {
                height: {
                    min: height,
                    max: height,
                    exact: height
                },
                width: {
                    min: width,
                    max: width,
                    exact: width
                },
                frameRate: frameRate
            };

            if (video.deviceId) {
                constraints.video.deviceId = video.deviceId;
            }

            if (video.facingMode) {
                constraints.video.facingMode = video.facingMode;
            }

            if (!width) {
                delete constraints.video.width;
            }

            if (!height) {
                delete constraints.video.height;
            }

            if (!frameRate) {
                delete constraints.video.frameRate;
            }

            if (!width && !height && !frameRate && !video.deviceId && !video.facingMode) {
                constraints.video = true;
            }
        }

        if (audio) {
            constraints.audio = true;

            if (audio.deviceId) {
                constraints.audio = {deviceId: audio.deviceId};
            }
        }

        if (screen) {
            constraints.screen = true;
        }

        return constraints;
    }

    function setUserMediaOptionsForNewerBrowser(deviceOptions: DeviceOptions_SetUserMediaOptionsForNewerBrowser, resolution: Resolution_SetUserMediaOptionsForNewerBrowse, frameRate: number) {
        var video = deviceOptions.video;
        var audio = deviceOptions.audio;
        var screen = deviceOptions.screen;
        var screenAudio = deviceOptions.screenAudio;
        var width = resolution.width;
        var height = resolution.height;
        // var constraints: any = {};
        var constraints: Constraints_SetUserMediaOptionsForNewerBrowse = {};


        if (video) {
            constraints.video = {
                height: {
                    min: height,
                    ideal: height,
                    max: height
                },
                width: {
                    min: width,
                    ideal: width,
                    max: width
                },
                frameRate: {
                    ideal: frameRate,
                    max: frameRate
                }
            };

            if (video.deviceId) {
                constraints.video.deviceId = {exact: video.deviceId};
            }

            if (video.facingMode) {
                constraints.video.facingMode = video.facingMode;
            }

            if (!width) {
                delete constraints.video.width;
            }

            if (!height) {
                delete constraints.video.height;
            }

            if (!frameRate) {
                delete constraints.video.frameRate;
            }

            if (!width && !height && !frameRate && !video.deviceId && !video.facingMode) {
                constraints.video = true;
            }
        }

        if (audio) {
            constraints.audio = {};

            if (audio.deviceId) {
                constraints.audio.deviceId = {exact: audio.deviceId};
            }

            if (audio.mediaSource) {
                constraints.audio.mediaSource = audio.mediaSource;
            }

            if (audio.mediaSourceId) {
                constraints.audio.mediaSourceId = audio.mediaSourceId;
            }

            if (!audio.deviceId && !audio.mediaSource && !audio.mediaSourceId) {
                constraints.audio = true;
            }
        }

        if (screenAudio) {
            constraints.screenAudio = {};

            if (screenAudio.deviceId) {
                constraints.screenAudio.deviceId = {exact: screenAudio.deviceId};
            }

            if (screenAudio.mediaSource) {
                constraints.screenAudio.mediaSource = screenAudio.mediaSource;
            }

            if (screenAudio.mediaSourceId) {
                constraints.screenAudio.mediaSourceId = screenAudio.mediaSourceId;
            }

            if (!screenAudio.deviceId && !screenAudio.mediaSource && !screenAudio.mediaSourceId) {
                constraints.screenAudio = true;
            }
        }

        if (screen) {
            constraints.screen = {
                height: {
                    min: height,
                    ideal: height,
                    max: height
                },
                width: {
                    min: width,
                    ideal: width,
                    max: width
                },
                frameRate: {
                    ideal: frameRate,
                    max: frameRate
                }
            };

            if (!width) {
                delete constraints.screen.width;
            }

            if (!height) {
                delete constraints.screen.height;
            }

            if (!frameRate) {
                delete constraints.screen.frameRate;
            }

            if (screen.mediaSource) {
                constraints.screen.mediaSource = screen.mediaSource;
            }

            if (!width && !height && !frameRate && !screen.mediaSource) {
                constraints.screen = true;
            }
        }

        if (screen && video) {
            constraints.screen = true;
        }

        return constraints;
    }

    function setUserMediaOptionsForOtherBrowsers(deviceOptions: DeviceOptions_SetUserMediaOptionsForOtherBrowsers, resolution: Resolution_SetUserMediaOptionsForOtherBrowsers, frameRate: number) {
        var video = deviceOptions.video;
        var audio = deviceOptions.audio;
        var screen = deviceOptions.screen;
        var screenAudio = deviceOptions.screenAudio;
        var width = resolution.width;
        var height = resolution.height;
        var constraints : Constraints_SetUserMediaOptionsForOtherBrowsers = {};

        if (video) {
            constraints.video = {
                mandatory: {
                    minHeight: height,
                    maxHeight: height,
                    minWidth: width,
                    maxWidth: width,
                    maxFrameRate: frameRate
                }
            };

            if (video.deviceId) {
                constraints.video.mandatory.sourceId = video.deviceId;
            }

            if (video.facingMode) {
                constraints.video.facingMode = video.facingMode;
            }

            if (video.mediaSource) {
                constraints.video.mandatory.mediaSource = video.mediaSource;
            }

            if (video.mediaSourceId) {
                constraints.video.mandatory.mediaSourceId = video.mediaSourceId;
            }

            if (!width) {
                delete constraints.video.mandatory.minWidth;
                delete constraints.video.mandatory.maxWidth;
            }

            if (!height) {
                delete constraints.video.mandatory.minHeight;
                delete constraints.video.mandatory.maxHeight;
            }

            if (!frameRate) {
                delete constraints.video.mandatory.maxFrameRate;
            }

            if (!width && !height && !frameRate && !video.deviceId && !video.facingMode && !video.mediaSource && !video.mediaSourceId) {
                constraints.video = true;
            }
        }

        if (audio) {
            constraints.audio = {mandatory: {}};

            if (audio.deviceId) {
                constraints.audio.mandatory.sourceId = audio.deviceId;
            }

            if (audio.mediaSource) {
                constraints.audio.mandatory.mediaSource = audio.mediaSource;
            }

            if (audio.mediaSourceId) {
                constraints.audio.mandatory.mediaSourceId = audio.mediaSourceId;
            }

            if (!audio.deviceId && !audio.mediaSource && !audio.mediaSourceId) {
                constraints.audio = true;
            }
        }

        if (screenAudio) {
            constraints.screenAudio = {mandatory: {}};

            if (screenAudio.deviceId) {
                constraints.screenAudio.mandatory.sourceId = screenAudio.deviceId;
            }

            if (screenAudio.mediaSource) {
                constraints.screenAudio.mandatory.mediaSource = screenAudio.mediaSource;
            }

            if (screenAudio.mediaSourceId) {
                constraints.screenAudio.mandatory.mediaSourceId = screenAudio.mediaSourceId;
            }

            if (!screenAudio.deviceId && !screenAudio.mediaSource && !screenAudio.mediaSourceId) {
                constraints.screenAudio = true;
            }
        }

        if (screen) {
            constraints.screen = {
                mandatory: {
                    minHeight: height,
                    maxHeight: height,
                    minWidth: width,
                    maxWidth: width,
                    maxFrameRate: frameRate
                }
            };

            if (!width) {
                delete constraints.screen.mandatory.minWidth;
                delete constraints.screen.mandatory.maxWidth;
            }

            if (!height) {
                delete constraints.screen.mandatory.minHeight;
                delete constraints.screen.mandatory.maxHeight;
            }

            if (!frameRate) {
                delete constraints.screen.mandatory.maxFrameRate;
            }

            if (screen.mediaSource) {
                constraints.screen.mandatory.mediaSource = screen.mediaSource;
            }

            if (screen.mediaSourceId) {
                constraints.screen.mandatory.mediaSourceId = screen.mediaSourceId;
            }

            if (!width && !height && !frameRate && !screen.mediaSource) {
                constraints.screen = true;
            }
        }

        if (screen && video) {
            constraints.screen = true;
        }

        return constraints;
    }

    function getUserMediaWithOptions(this: any, deviceOptions: any, resolution: { height: number; aspectRatio: string;width: number }, frameRate: number | null, resolutionProvider: { canResolveNextResolution: () => any; getNextResolution: (arg0: number, arg1: string) => any; calculateLongerDimensionByAspectRatio: (arg0: any, arg1: any) => any; }, callback: any) {
        var constraints = this.getVendorSpecificConstraints(deviceOptions, resolution || {}, frameRate);
        var hasVideo = !!constraints.video;
        var that = this;

        this._pcast.getUserMedia(constraints, function(pcast: any, status: string, userMedia: any, error: { name?: string; constructor?: any; code?: any; constraintName?: string; constraint?: any; } | null) {
            if (status === 'ok') {
                that._logger.info('Acquired user media with constraints [%s]', constraints);

                return callback(null, {
                    userMedia: userMedia,
                    options: {
                        frameRate: hasVideo ? frameRate : null,
                        resolution: hasVideo ? _.get(resolution, ['resolution'], null) : null,
                        aspectRatio: hasVideo ? _.get(resolution, ['aspectRatio'], null) : null
                    }
                });
            }

            that._logger.info('Failed to acquire user media with constraints [%s]', constraints);

            var nextResolution = resolution;
            var nextFrameRate = frameRate;
            var constraintName = getConstraintNameFromError(error);

            if (error && (
                error.name === 'ConstraintNotSatisfiedError'
                || error.name === 'OverconstrainedError'
                || error.constructor.name === 'OverconstrainedError'
                || (error.code === 'unavailable' && RTC.browser === 'Edge'))
            ) {
                switch (constraintName.toLowerCase()) {
                case 'width':
                case 'height':
                    if (!resolution || !resolutionProvider.canResolveNextResolution()) {
                        break;
                    }

                    that._logger.warn('Unable to get user media with constraint [%s] with height [%s] and width [%s]. Retrying with next closest resolution.',
                        constraintName, nextResolution.height, nextResolution.width);
                    nextResolution = resolutionProvider.getNextResolution(resolution.height, resolution.aspectRatio);

                    return getUserMediaWithOptions.call(that, deviceOptions, nextResolution, nextFrameRate, resolutionProvider, callback);
                case 'framerate':
                default:
                    // Always try without frame rate if constraint name is not defined
                    if (frameRate) {
                        that._logger.warn('Unable to get user media with constraint [%s] and frame rate [%s]. Retrying without frame rate constraint.', constraintName, frameRate);
                        nextFrameRate = null;

                        return getUserMediaWithOptions.call(that, deviceOptions, nextResolution, nextFrameRate, resolutionProvider, callback);
                    }

                    // Then try to reduce resolution
                    if (!resolution || !resolutionProvider.canResolveNextResolution()) {
                        break;
                    }

                    that._logger.warn('Unable to get user media with constraint [%s] with height [%s] and width [%s]. Retrying with next closest resolution.',
                        constraintName, nextResolution.height, nextResolution.width);
                    nextResolution = resolutionProvider.getNextResolution(resolution.height, resolution.aspectRatio);

                    return getUserMediaWithOptions.call(that, deviceOptions, nextResolution, nextFrameRate, resolutionProvider, callback);
                }
            }

            that._logger.error('Unable to get user media with status [%s]', status, error);

            return callback(error);
        }, function(this : any, constraints: any) {
            var clientConstraints = constraints;

            if (that._onScreenShare && RTC.browser === 'Chrome') {
                var normalizedConstraints = normalizeChromeScreenShareConstraints(constraints);

                clientConstraints = that._onScreenShare(normalizedConstraints);

                var resolution;

                if (clientConstraints.resolution && clientConstraints.aspectRatio) {
                    switch (this._defaultAspectRatio) {
                    // Portrait
                    case '9x16':
                    case '3x4':
                        resolution = {
                            width: clientConstraints.resolution,
                            height: resolutionProvider.calculateLongerDimensionByAspectRatio(clientConstraints.resolution, clientConstraints.aspectRatio)
                        };

                        break;
                    // Landscape
                    case '16x9':
                    case '4x3':
                    default:
                        resolution = {
                            width: resolutionProvider.calculateLongerDimensionByAspectRatio(clientConstraints.resolution, clientConstraints.aspectRatio),
                            height: clientConstraints.resolution
                        };

                        break;
                    }
                }

                clientConstraints = getChromeScreenShareConstraints.call(that, normalizedConstraints, resolution, clientConstraints.frameRate);
            }

            return clientConstraints;
        });
    }

    function normalizeChromeScreenShareConstraints(constraints: any) {
        var chromeVideoSource = _.get(constraints, ['video', 'mandatory', 'chromeMediaSource']);
        var chromeAudioSource = _.get(constraints, ['audio', 'mandatory', 'chromeMediaSource']);
        var chromeVideoSourceId = _.get(constraints, ['video', 'mandatory', 'chromeMediaSourceId']);
        var chromeAudioSourceId = _.get(constraints, ['audio', 'mandatory', 'chromeMediaSourceId']);
        var normalizedConstraints = {};

        if (chromeVideoSource || chromeAudioSourceId) {
            _.set(normalizedConstraints, ['screen', 'mediaSource'], chromeVideoSource);
            _.set(normalizedConstraints, ['screen', 'mediaSourceId'], chromeVideoSourceId);
        }

        if (chromeAudioSource || chromeAudioSourceId) {
            _.set(normalizedConstraints, ['screenAudio', 'mediaSource'], chromeAudioSource);
            _.set(normalizedConstraints, ['screenAudio', 'mediaSourceId'], chromeAudioSourceId);
        }

        return normalizedConstraints;
    }

    function getChromeScreenShareConstraints(this: any, constraints: any, resolution: any, frameRate: any) {
        var screenShareConstraints = this.getVendorSpecificConstraints(constraints, resolution, frameRate);

        if (screenShareConstraints.screen) {
            screenShareConstraints.video = screenShareConstraints.screen;
            delete screenShareConstraints.screen;
        }

        if (screenShareConstraints.screenAudio) {
            screenShareConstraints.audio = screenShareConstraints.screenAudio;
            delete screenShareConstraints.screenAudio;
        }

        var chromeVideoSource = _.get(screenShareConstraints, ['video', 'mandatory', 'mediaSource']);
        var chromeAudioSource = _.get(screenShareConstraints, ['audio', 'mandatory', 'mediaSource']);
        var chromeVideoSourceId = _.get(screenShareConstraints, ['video', 'mandatory', 'mediaSourceId']);
        var chromeAudioSourceId = _.get(screenShareConstraints, ['audio', 'mandatory', 'mediaSourceId']);

        if (chromeVideoSource || chromeVideoSourceId) {
            _.set(screenShareConstraints, ['video', 'mandatory', 'chromeMediaSource'], chromeVideoSource);
            _.set(screenShareConstraints, ['video', 'mandatory', 'chromeMediaSourceId'], chromeVideoSourceId);
            delete screenShareConstraints.video.mandatory.mediaSource;
            delete screenShareConstraints.video.mandatory.mediaSourceId;
        }

        if (chromeAudioSource || chromeAudioSourceId) {
            _.set(screenShareConstraints, ['audio', 'mandatory', 'chromeMediaSource'], chromeAudioSource);
            _.set(screenShareConstraints, ['audio', 'mandatory', 'chromeMediaSourceId'], chromeAudioSourceId);
            delete screenShareConstraints.audio.mandatory.mediaSource;
            delete screenShareConstraints.audio.mandatory.mediaSourceId;
        }

        return screenShareConstraints;
    }

    function getConstraintNameFromError(error: any) {
        if (error.constraintName) {
            return error.constraintName;
        }

        if (error.constraint) {
            return error.constraint;
        }

        return '';
    }

    return UserMediaResolver;
});