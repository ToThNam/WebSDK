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
    'phenix-rtc'
], function(_, assert, rtc) {
    'use strict';

    var listenForMediaStreamTrackChangesTimeout = 2000;

    function UserMediaProvider(this: any, logger: any, screenShareExtensionManager: any, onScreenShare: any) {
        assert.isObject(logger, 'logger');
        assert.isObject(screenShareExtensionManager, 'screenShareExtensionManager');

        if (onScreenShare) {
            assert.isFunction(onScreenShare, 'onScreenShare');
        }

        this._logger = logger;
        this._screenShareExtensionManager = screenShareExtensionManager;
        this._onScreenShare = onScreenShare;
    }

    UserMediaProvider.prototype.getUserMedia = function(options: any, callback: any) {
        assert.isObject(options, 'options');
        assert.isFunction(callback, 'callback');

        getUserMedia.call(this, options, callback);
    };

    function getUserMedia(this: any, options: { screenAudio: boolean; screen: boolean; video: boolean; audio: boolean; }, callback: any) {
        var that = this;

        var onUserMediaSuccess = function onUserMediaSuccess(status: string, stream: any) {
            if (that._gumStreams) {
                that._gumStreams.push(stream);
            }

            callback(that, status, stream);
        };

        var onUserMediaFailure = function onUserMediaFailure(status: string, stream: any, error: string) {
            if (options.screenAudio) {
                that._logger.warn('Screen capture with audio is only supported on Windows or Chrome OS.');
            }

            callback(that, status, stream, error);
        };

        var hasScreen = options.screen || options.screenAudio;
        var hasVideoOrAudio = options.video || options.audio;

        if (!(hasScreen && hasVideoOrAudio)) {
            return getUserMediaStream.call(that, options, onUserMediaSuccess, onUserMediaFailure);
        }

        return getUserMediaStream.call(that, {screen: options.screen}, function success(status: string, screenStream: { getTracks: () => void; }) {
            return getUserMediaStream.call(that, {
                audio: options.audio,
                video: options.video
            }, function screenSuccess(status: string, stream: any) {
                addTracksToWebRTCStream(stream, screenStream.getTracks());

                onUserMediaSuccess(status, stream);
            }, function failure(status: string, stream: any, error: string) {
                stopWebRTCStream(screenStream);

                onUserMediaFailure(status, stream, error);
            });
        }, onUserMediaFailure);
    }

    function getUserMediaStream(this: any, options:any, successCallback: (arg0: string, arg1: any) => void, failureCallback: any) {
        var that = this;

        var onUserMediaCancelled = function onUserMediaCancelled() {
            failureCallback('cancelled', null);
        };

        var onUserMediaFailure = function onUserMediaFailure(e:any) {
            failureCallback(getUserMediaErrorStatus(e), undefined, e);
        };

        var onUserMediaSuccess = function onUserMediaSuccess(stream: { getTracks: any; id?: any; }) {
            wrapNativeMediaStream.call(that, stream);

            successCallback('ok', stream);
        };

        return getUserMediaConstraints.call(this, options, function(error: any, response: { status: string; constraints: any; }) {
            if (_.get(response, ['status']) !== 'ok') {
                return onUserMediaFailure(error);
            }

            if (response.status === 'cancelled') {
                return onUserMediaCancelled();
            }

            var constraints = response.constraints;

            if (that._onScreenShare && (options.screen || options.screenAudio) && rtc.browser === 'Chrome') {
                constraints = that._onScreenShare(constraints);

                if (!constraints) {
                    throw new Error('onScreenShare must return an object of user media constraints');
                }
            }

            try {
                rtc.getUserMedia(constraints, onUserMediaSuccess, onUserMediaFailure);
            } catch (e) {
                onUserMediaFailure(e);
            }
        });
    }

    function getUserMediaConstraints(this: any, options: { screen: boolean; audio: boolean; video: boolean; }, callback: any) {
        var that = this;

        if (options.screen) {
            return that._screenShareExtensionManager.isScreenSharingEnabled(function(isEnabled: any) {
                if (isEnabled) {
                    return that._screenShareExtensionManager.getScreenSharingConstraints(options, callback);
                }

                return callback(new Error('screen-sharing-not-available'));
            });
        }

        var constraints = {
            audio: options.audio || false,
            video: options.video || false
        };

        callback(null, {
            status: 'ok',
            constraints: constraints
        });
    }

    var getUserMediaErrorStatus = function getUserMediaErrorStatus(e: { code: string; message: string; name: string; }) {
        var status;

        if (e.code === 'unavailable') {
            status = 'conflict';
        } else if (e.message === 'permission-denied') {
            status = 'permission-denied';
        } else if (e.name === 'PermissionDeniedError') { // Chrome
            status = 'permission-denied';
        } else if (e.name === 'InternalError' && e.message === 'Starting video failed') { // FF (old getUserMedia API)
            status = 'conflict';
        } else if (e.name === 'SourceUnavailableError') { // FF
            status = 'conflict';
        } else if (e.name === 'SecurityError' && e.message === 'The operation is insecure.') { // FF
            status = 'permission-denied';
        } else {
            status = 'failed';
        }

        return status;
    };

    function wrapNativeMediaStream(this: any, stream: { getTracks: any; id?: string; }) {
        var lastTrackEnabledStates: any = {};
        var lastTrackReadyStates: any = {};
        var that = this;

        setTimeout(function listenForTrackChanges() {
            if (isStreamStopped(stream)) {
                return;
            }

            _.forEach(stream.getTracks(), function(track: { id: string | number; enabled: any; dispatchEvent: (arg0: any) => void; readyState: any; }) {
                if (rtc.global.Event && _.hasIndexOrKey(lastTrackEnabledStates, track.id) && lastTrackEnabledStates[track.id] !== track.enabled) {
                    var trackEnabledChangeEvent = new rtc.global.Event('trackenabledchange');

                    trackEnabledChangeEvent.data = track;

                    track.dispatchEvent(trackEnabledChangeEvent);

                    that._logger.info('[%s] Detected track [%s] enabled change to [%s]', stream.id, track.id, track.enabled);
                }

                if (rtc.global.Event && _.hasIndexOrKey(lastTrackReadyStates, track.id) && lastTrackReadyStates[track.id] !== track.readyState) {
                    var readyStateChangeEvent = new rtc.global.Event('readystatechange');

                    readyStateChangeEvent.data = track;

                    track.dispatchEvent(readyStateChangeEvent);

                    that._logger.info('[%s] Detected track [%s] Ready State change to [%s]', stream.id, track.id, track.readyState);
                }

                lastTrackEnabledStates[track.id] = track.enabled;
                lastTrackReadyStates[track.id] = track.readyState;
            });

            setTimeout(listenForTrackChanges, listenForMediaStreamTrackChangesTimeout);
        }, listenForMediaStreamTrackChangesTimeout);
    }

    function addTracksToWebRTCStream(stream: { addTrack: (arg0: any) => void; }, tracks: any) {
        if (!stream || !_.isFunction(stream.addTrack)) {
            return;
        }

        _.forEach(tracks, function(track: any) {
            stream.addTrack(track);
        });
    }

    function isStreamStopped(stream: { getTracks: () => void; }) {
        return _.reduce(stream.getTracks(), function(isStopped: any, track: { readyState: string; }) {
            return isStopped && isTrackStopped(track);
        }, true);
    }

    function isTrackStopped(track: { readyState: string; }) {
        assert.isNotUndefined(track, 'track');

        return track.readyState === 'ended';
    }

    function stopWebRTCStream(stream: { getTracks: any; stop?: any; }) {
        if (stream && _.isFunction(stream.stop)) {
            stream.stop();
        }

        if (stream && _.isFunction(stream.getTracks)) {
            var tracks = stream.getTracks();

            for (var i = 0; i < tracks.length; i++) {
                var track = tracks[i];

                track.stop();
            }
        }
    }

    return UserMediaProvider;
});