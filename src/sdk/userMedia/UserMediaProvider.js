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
    'phenix-rtc'
], function(_, assert, rtc) {
    'use strict';

    var listenForMediaStreamTrackChangesTimeout = 2000;

    function UserMediaProvider(logger, screenShareExtensionManager, onScreenShare) {
        assert.isObject(logger, 'logger');
        assert.isObject(screenShareExtensionManager, 'screenShareExtensionManager');

        if (onScreenShare) {
            assert.isFunction(onScreenShare, 'onScreenShare');
        }

        this._logger = logger;
        this._screenShareExtensionManager = screenShareExtensionManager;
        this._onScreenShare = onScreenShare;
    }

    UserMediaProvider.prototype.getUserMedia = function(options, callback) {
        assert.isObject(options, 'options');
        assert.isFunction(callback, 'callback');

        getUserMedia.call(this, options, callback);
    };

    function getUserMedia(options, callback) {
        var that = this;

        var onUserMediaSuccess = function onUserMediaSuccess(status, stream) {
            if (that._gumStreams) {
                that._gumStreams.push(stream);
            }

            callback(that, status, stream);
        };

        var onUserMediaFailure = function onUserMediaFailure(status, stream, error) {
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

        return getUserMediaStream.call(that, {screen: options.screen}, function success(status, screenStream) {
            return getUserMediaStream.call(that, {
                audio: options.audio,
                video: options.video
            }, function screenSuccess(status, stream) {
                addTracksToWebRTCStream(stream, screenStream.getTracks());

                onUserMediaSuccess(status, stream);
            }, function failure(status, stream, error) {
                stopWebRTCStream(screenStream);

                onUserMediaFailure(status, stream, error);
            });
        }, onUserMediaFailure);
    }

    function getUserMediaStream(options, successCallback, failureCallback) {
        var that = this;

        var onUserMediaCancelled = function onUserMediaCancelled() {
            failureCallback('cancelled', null);
        };

        var onUserMediaFailure = function onUserMediaFailure(e) {
            failureCallback(getUserMediaErrorStatus(e), undefined, e);
        };

        var onUserMediaSuccess = function onUserMediaSuccess(stream) {
            wrapNativeMediaStream.call(that, stream);

            successCallback('ok', stream);
        };

        return getUserMediaConstraints.call(this, options, function(error, response) {
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

    function getUserMediaConstraints(options, callback) {
        var that = this;

        if (options.screen) {
            return that._screenShareExtensionManager.isScreenSharingEnabled(function(isEnabled) {
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

    var getUserMediaErrorStatus = function getUserMediaErrorStatus(e) {
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

    function wrapNativeMediaStream(stream) {
        var lastTrackEnabledStates = {};
        var lastTrackReadyStates = {};
        var that = this;

        setTimeout(function listenForTrackChanges() {
            if (isStreamStopped(stream)) {
                return;
            }

            _.forEach(stream.getTracks(), function(track) {
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

    function addTracksToWebRTCStream(stream, tracks) {
        if (!stream || !_.isFunction(stream.addTrack)) {
            return;
        }

        _.forEach(tracks, function(track) {
            stream.addTrack(track);
        });
    }

    function isStreamStopped(stream) {
        return _.reduce(stream.getTracks(), function(isStopped, track) {
            return isStopped && isTrackStopped(track);
        }, true);
    }

    function isTrackStopped(track) {
        assert.isNotUndefined(track, 'track');

        return track.readyState === 'ended';
    }

    function stopWebRTCStream(stream) {
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