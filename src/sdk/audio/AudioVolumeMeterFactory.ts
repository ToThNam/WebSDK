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

import { Meter_StopAudioVolumeMeters, Stream_GetAudioVolumeMeter } from "../../../typescript/src/sdk/audio/AudioVolumeMeterFactory";


define('',[
    'phenix-web-lodash-light',
    'phenix-web-assert',
    './AudioVolumeMeter'
], function(_, assert, AudioVolumeMeter) {
    'use strict';

    function AudioVolumeMeterFactory(this: any, logger:object ) {
        assert.isObject(logger, 'logger');

        this._logger = logger;
        this._audioVolumeMeters = {};
    }

    AudioVolumeMeterFactory.prototype.stopAllMeters = function stopAllMeters() {
        _.forOwn(this._audioVolumeMeters, function stopAudioVolumeMeters(meter: Meter_StopAudioVolumeMeters) {
            meter.stop();
        });
    };

    AudioVolumeMeterFactory.prototype.getAudioVolumeMeter = function getAudioVolumeMeter(stream: Stream_GetAudioVolumeMeter) {
        assert.isObject(stream, 'stream');
        assert.isStringNotEmpty(stream.id, 'streamId');

        if (!this._audioVolumeMeters[stream.id]) {
            this._audioVolumeMeters[stream.id] = new AudioVolumeMeter(this._logger);
        }

        return this._audioVolumeMeters[stream.id];
    };

    AudioVolumeMeterFactory.prototype.getAudioVolumeMeters = function getAudioVolumeMeters() {
        return _.values(this._audioVolumeMeters);
    };

    AudioVolumeMeterFactory.prototype.toString = function toString() {
        return 'AudioVolumeMeterFactory';
    };

    return AudioVolumeMeterFactory;
});