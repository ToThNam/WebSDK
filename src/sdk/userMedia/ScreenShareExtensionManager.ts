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

/* global chrome */
import { Ioption, Iresponse } from "../../../typescript/src/userMedia/ScreenShareExtensionManager";
define('',[
    'phenix-web-lodash-light',
    'phenix-web-assert',
    'phenix-web-observable',
    'phenix-rtc'
], function(_, assert, observable, phenixRTC) {
    'use strict';

    var defaultChromePCastScreenSharingExtensionId = 'icngjadgidcmifnehjcielbmiapkhjpn';
    var minimumSupportFirefoxVersionForUnWhiteListedScreenShare = 52;

    function ScreenShareExtensionManager(this: any, options: Ioption, logger: object) {
        options = options || {};

        assert.isObject(options, 'options');
        assert.isObject(logger, 'logger');

        this._logger = logger;
        this._screenSharingExtensionId = options.screenSharingExtensionId || getDefaultExtensionId();
        this._eagerlyCheckScreenSharingCapabilities = options.eagerlyCheckScreenSharingCapabilities || false;
        this._screenSharingAvailable = false;
        this._isInitializedObservable = new observable.Observable(false);

        if (this._eagerlyCheckScreenSharingCapabilities) {
            checkForScreenSharingCapability.call(this, _.bind(handleCheckForScreenSharing, this));
        } else {
            handleCheckForScreenSharing.call(this, false);
        }
    }

    ScreenShareExtensionManager.prototype.checkForScreenSharingCapability = function(callback: (arg0: any) => void) {
        return checkForScreenSharingCapability.call(this, (isEnabled: any) => {
            handleCheckForScreenSharing.call(this, isEnabled);

            callback(isEnabled);
        });
    };

    ScreenShareExtensionManager.prototype.isScreenSharingEnabled = function(callback: (arg0: any) => void) {
        var that = this;

        return waitForInitialized.call(this, function() {
            if (that._eagerlyCheckScreenSharingCapabilities || that._screenSharingAvailable) {
                return callback(that._screenSharingAvailable);
            }

            checkForScreenSharingCapability.call(that, function(isEnabled: any) {
                that._screenSharingAvailable = isEnabled;

                callback(isEnabled);
            });
        });
    };

    ScreenShareExtensionManager.prototype.getScreenSharingConstraints = function(options: any, callback: any) {
        return waitForInitialized.call(this, _.bind(getScreenSharingConstraints, this, options, callback));
    };

    ScreenShareExtensionManager.prototype.toString = function() {
        return 'ScreenShareExtensionManager[' + phenixRTC.browser + ']';
    };

    function handleCheckForScreenSharing(this: any, isEnabled: any) {
        this._isInitializedObservable.setValue(true);

        this._screenSharingAvailable = isEnabled;
    }

    function checkForScreenSharingCapability(this: any, callback: (arg0: boolean) => void) {
        var that = this;

        if (phenixRTC.browser === 'Chrome' && that._screenSharingExtensionId) {
            var runtimeEnvironment = getRuntime.call(this);

            if (!runtimeEnvironment) {
                return callback(false);
            }

            try {
                runtimeEnvironment.sendMessage(that._screenSharingExtensionId, {type: 'version'}, function(response: Iresponse) {
                    if (runtimeEnvironment.lastError || !response || response.status !== 'ok') {
                        that._logger.info('Screen sharing NOT available');
                        callback(false);

                        return;
                    }

                    that._logger.info('Screen sharing enabled using version [%s]', response.version);
                    callback(true);
                });
            } catch (e: any ) {
                if (e.message) {
                    that._logger.warn(e.message, e);
                }

                callback(false);
            }
        } else if (phenixRTC.browser === 'Firefox' && phenixRTC.browserVersion >= minimumSupportFirefoxVersionForUnWhiteListedScreenShare) {
            callback(true);
        } else if (phenixRTC.browser === 'Firefox' && _.isObject(phenixRTC.global.PCastScreenSharing)) {
            callback(true);
        } else {
            callback(false);
        }
    }

    function waitForInitialized(this: any, callback: () => void) {
        if (this._isInitializedObservable.getValue()) {
            return callback();
        }

        var initializedSubscription = this._isInitializedObservable.subscribe(function() {
            initializedSubscription.dispose();

            return callback();
        });
    }

    function getScreenSharingConstraints(this: any, options: any, callback: (arg0: Error |string | null, arg1: { status: string; constraints?: any | { video: {}; }; }) => void) {
        switch (phenixRTC.browser) {
        case 'Chrome':
            return requestMediaSourceIdWithRuntime.call(this, function(error : Error |string | null, response: any) {
                if (error || (response && response.status !== 'ok')) {
                    return callback(error, response);
                }

                // Default to allow the user to request audio if using an older extension or not providing the options
                // If it fails to request the audio the user will receive an error
                if (!response.data && !response.options) {
                    response.options = {canRequestAudioTrack: true};
                }

                callback(null, {
                    status: 'ok',
                    constraints: mapChromeConstraints(options, response.streamId, response.options)
                });
            });
        case 'Firefox':
            callback(null, {
                status: 'ok',
                constraints: mapNewerConstraints(options)
            });

            break;
        default:
            callback(new Error('not-supported'), {status: 'not-supported'});

            break;
        }
    }

    function requestMediaSourceIdWithRuntime(this: any, callback:  any) {
        var that = this;
        var runtimeEnvironment = getRuntime.call(this);

        if (!runtimeEnvironment) {
            return callback(new Error('not-available'));
        }

        try {
            runtimeEnvironment.sendMessage(that._screenSharingExtensionId, {
                type: 'get-desktop-media',
                sources: ['screen', 'window', 'tab', 'audio']
            }, function(response: { status: string; }) {
                var shouldCheckIfScreenShareStillInstalled = runtimeEnvironment.lastError || !response;

                if (shouldCheckIfScreenShareStillInstalled) {
                    return checkForScreenSharingCapability.call(that, function(isEnabled) {
                        handleCheckForScreenSharing.call(that, isEnabled);

                        return callback(new Error('extension-failure'));
                    });
                }

                if (response.status !== 'ok') {
                    callback(new Error(response.status), response);

                    return;
                }

                callback(null, response);
            });
        } catch (e: any) {
            if (e.message) {
                that._logger.warn(e.message);
            }

            callback(e, {status: 'failed'});
        }
    }

    function mapChromeConstraints(options: { screen: boolean; screenAudio: boolean; }, id: string, captureOptions: { canRequestAudioTrack: any; }) {
        var constraints :any = {};

        if (_.isObject(options) && _.isObject(options.screen)) {
            constraints.video = options.screen;
        }

        if (_.isObject(options) && _.isObject(options.screenAudio) && captureOptions.canRequestAudioTrack) {
            constraints.audio = options.screenAudio;
        }

        if (options.screen) {
            _.set(constraints, ['video', 'mandatory'], {
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: id
            });
        }

        if (options.screenAudio && captureOptions.canRequestAudioTrack) {
            _.set(constraints, ['audio', 'mandatory'], {
                chromeMediaSource: 'system',
                chromeMediaSourceId: id
            });
        }

        return constraints;
    }

    function mapNewerConstraints(options: { screen: boolean; }, id?: string) {
        var constraints : any = {video: {}};

        if (_.isObject(options) && _.isObject(options.screen)) {
            constraints.video = options.screen;
        }

        if (id) {
            constraints.video.mediaSourceId = id;
        }

        constraints.video.mediaSource = constraints.video.mediaSource || 'window';

        return constraints;
    }

    function getRuntime(this: any, chrome?: any) {
        var that = this;

        switch (phenixRTC.browser) {
        case 'Chrome':
            if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) {
                that._logger.info('Screen sharing NOT available. Runtime not supported');

                return null;
            }

            return chrome.runtime;
        case 'Firefox':
        default:
            return null;
        }
    }

    function getDefaultExtensionId() {
        switch (phenixRTC.browser) {
        case 'Chrome':
            return defaultChromePCastScreenSharingExtensionId;
        case 'Firefox':
        default:
            return '';
        }
    }

    return ScreenShareExtensionManager;
});

