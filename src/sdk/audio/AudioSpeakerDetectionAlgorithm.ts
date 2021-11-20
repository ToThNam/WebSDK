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

import { AudioVolumeMeter, Options_StartAudioDetection } from "../../../typescript/src/audio/AudioSpeakerDetectionAlgorithm";



define('',[
    'phenix-web-lodash-light',
    'phenix-web-assert'
], function(_, assert) {
    'use strict';

    var defaultSpeakingHysteresisInterval = 50;
    var defaultSilenceHysteresisInterval = 1500;

    function AudioSpeakerDetectionAlgorithm(this: any, logger: object) {
        assert.isObject(logger, 'logger');

        this._logger = logger;

        this.init();
    }

    AudioSpeakerDetectionAlgorithm.prototype.init = function init() {

    };

    AudioSpeakerDetectionAlgorithm.prototype.onValue = function onValue(callback: any) {
        this._callback = callback;
    };

    AudioSpeakerDetectionAlgorithm.prototype.startDetection = function startDetection(audioVolumeMeter: any, options: any) {
        var that = this;

        return startAudioDetection.call(that, audioVolumeMeter, options);
    };

    AudioSpeakerDetectionAlgorithm.prototype.toString = function toString() {
        return 'AudioSpeakerDetection';
    };

    function startAudioDetection(this: any, audioVolumeMeter: AudioVolumeMeter, options: Options_StartAudioDetection) {
        assert.isObject(audioVolumeMeter, 'audioVolumeMeter');

        options = options || {};

        var that = this;
        var stopped = false;
        var speakingHysteresisInterval = options.speakingHysteresisInterval || defaultSpeakingHysteresisInterval;
        var silenceHysteresisInterval = options.silenceHysteresisInterval || defaultSilenceHysteresisInterval;

        assert.isNumber(speakingHysteresisInterval, 'options.speakingHysteresisInterval');
        assert.isNumber(silenceHysteresisInterval, 'options.silenceHysteresisInterval');

        var speaking = false;
        var nextSpeakingDeadline = _.now() + speakingHysteresisInterval;
        var nextSilenceDeadline = _.now() + silenceHysteresisInterval;

        audioVolumeMeter.onValue(function(value) {
            if (stopped) {
                return;
            }

            assert.isObject(audioVolumeMeter, 'audioVolumeMeter');
            assert.isNumber(value.date, 'value.date');
            assert.isNumber(value.value, 'value.value');
            assert.isNumber(value.smoothedValue, 'value.smoothedValue');
            assert.isNumber(value.smoothedPeakValue, 'value.smoothedPeakValue');
            assert.isNumber(value.clipped, 'value.clipped');

            var speakingThreshold = value.value > 0.01 && value.value > 2 * value.smoothedValue && value.value > 0.25 * value.smoothedPeakValue;
            var speakingContinuationThreshold = value.value > 0.8 * value.smoothedValue;
            var notSpeakingThreshold = value.value < 0.5 * value.smoothedValue;
            var notSpeakingContinuationThreshold = !speakingThreshold;

            if ((speakingThreshold || (speaking && speakingContinuationThreshold)) && nextSpeakingDeadline < value.date) {
                nextSilenceDeadline = _.utc(value.date) + silenceHysteresisInterval;

                if (!speaking) {
                    speaking = true;

                    that._logger.info('Speaking detected');

                    if (that._callback) {
                        that._callback('speaking');
                    }
                }
            } else if ((notSpeakingThreshold || (!speaking && notSpeakingContinuationThreshold)) && nextSilenceDeadline < value.date) {
                nextSpeakingDeadline = _.utc(value.date) + speakingHysteresisInterval;

                if (speaking) {
                    speaking = false;

                    that._logger.info('Silence detected');

                    if (that._callback) {
                        that._callback('silence');
                    }
                }
            }
        });
    }

    return AudioSpeakerDetectionAlgorithm;
});