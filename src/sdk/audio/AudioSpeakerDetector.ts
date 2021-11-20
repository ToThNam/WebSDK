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

import { Meter_GetAudioVolumeMeters, Options_AudioSpeakerDetector, Options_SetupAudioVolumeMeter, Options_SetupSpeakingDetection } from "../../../typescript/src/audio/AudioSpeakerDetector";



define('',[
    'phenix-web-lodash-light',
    'phenix-web-assert',
    '../logging/pcastLoggerFactory',
    '../PCastEndPoint',
    './AudioContext',
    './AudioVolumeMeterFactory',
    './AudioSpeakerDetectionAlgorithm'
], function(_, assert, pcastLoggerFactory, PCastEndPoint, AudioContext, AudioVolumeMeterFactory, AudioSpeakerDetectionAlgorithm) {
    'use strict';

    function AudioSpeakerDetector(this: any, userMediaStreams: any[], options: Options_AudioSpeakerDetector) {
        assert.isArray(userMediaStreams, 'userMediaStreams');

        options = options || {};

        this._baseUri = options.uri || PCastEndPoint.DefaultPCastUri;
        this._logger = options.logger || pcastLoggerFactory.createPCastLogger(this._baseUri);
        this._audioContext = options.audioContext || new AudioContext();
        this._nativeAudioContext = this._audioContext.getNativeAudioContext();
        this._onSpeakingChanged = null;
        this._userMediaStreams = userMediaStreams;
        this._disposeOfAudioContext = !_.isObject(options.audioContext);
        this._audioVolumeMeterFactory = new AudioVolumeMeterFactory(this._logger);

        _.forEach(this._userMediaStreams, _.bind(setupAudioVolumeMeter, this, options));
    }

    AudioSpeakerDetector.prototype.start = function start(options: {}, callback: void) {
        assert.isFunction(callback, 'callback');

        this._onSpeakingChanged = callback;

        options = options || {};

        _.forEach(this._userMediaStreams, _.bind(setupSpeakingDetection, this, options));
    };

    AudioSpeakerDetector.prototype.stop = function stop() {
        _.forEach(this.getAudioVolumeMeters(), function(meter: Meter_GetAudioVolumeMeters) {
            meter.onValue(function() {});
        });

        this._onSpeakingChanged = null;
    };

    AudioSpeakerDetector.prototype.getAudioVolumeMeter = function getAudioVolumeMeter(stream: object) {
        assert.isObject(stream, 'stream');

        return this._audioVolumeMeterFactory.getAudioVolumeMeter(stream);
    };

    AudioSpeakerDetector.prototype.getAudioVolumeMeters = function getAudioVolumeMeters() {
        return this._audioVolumeMeterFactory.getAudioVolumeMeters();
    };

    AudioSpeakerDetector.prototype.dispose = function dispose() {
        if (this._disposeOfAudioContext) {
            this._nativeAudioContext.close();
        }

        this._audioVolumeMeterFactory.stopAllMeters();

        this._userMediaStreams = null;
    };

    AudioSpeakerDetector.prototype.toString = function toString() {
        return 'AudioSpeakerDetector';
    };

    function setupAudioVolumeMeter(this: any, options: Options_SetupAudioVolumeMeter, stream: object) {
        assert.isObject(stream, 'stream');
        assert.isObject(options, 'options');

        var audioVolumeMeter = this._audioVolumeMeterFactory.getAudioVolumeMeter(stream);

        audioVolumeMeter.init(this._nativeAudioContext, options.alpha);
        audioVolumeMeter.connect(stream);
    }

    function setupSpeakingDetection(this: any, options: Options_SetupSpeakingDetection, stream: object) {
        assert.isObject(stream, 'stream');
        assert.isObject(options, 'options');

        var audioVolumeMeter = this._audioVolumeMeterFactory.getAudioVolumeMeter(stream);
        var audioSpeakerDetectionAlgorithm = new AudioSpeakerDetectionAlgorithm(this._logger);

        if (options.alpha) {
            audioVolumeMeter.setAlpha(options.alpha);
        }

        audioSpeakerDetectionAlgorithm.onValue(this._onSpeakingChanged);
        audioSpeakerDetectionAlgorithm.startDetection(audioVolumeMeter, options);
    }

    return AudioSpeakerDetector;
});