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

import { Context_Init, Event_OnAudioProcess, Stream_ConnectToStream } from "../../../typescript/src/audio/AudioVolumeMeter";



define('',[
    'phenix-web-lodash-light',
    'phenix-web-assert'
], function(_, assert) {
    'use strict';

    var defaultAlpha = 1 / 16;

    function AudioVolumeMeter(this: any, logger: object) {
        assert.isObject(logger, 'logger');

        this._logger = logger;
    }

    AudioVolumeMeter.prototype.init = function init(context:Context_Init, alpha: any ) {
        assert.isObject(context, 'context');
        assert.isFunction(context.createScriptProcessor, 'context.createScriptProcessor');

        alpha = parseFloat(alpha || defaultAlpha);
        assert.isNumber(alpha, 'alpha');

        this._context = context;
        this._alpha = alpha;
        this._value = 0.;
        this._smoothedValue = 0.;
        this._smoothedPeakValue = 0.;
        this._clipped = 0.;
        this._scriptProcessor = context.createScriptProcessor(4096, 1, 1);

        _.addEventListener(this._scriptProcessor, 'audioprocess', _.bind(onAudioProcess, this));
    };

    AudioVolumeMeter.prototype.onValue = function onValue(callback: any) {
        this._callback = callback;
    };

    AudioVolumeMeter.prototype.getValue = function getValue() {
        return this._value;
    };

    AudioVolumeMeter.prototype.getSmoothedValue = function getSmoothedValue() {
        return this._smoothedValue;
    };

    AudioVolumeMeter.prototype.getSmoothedPeakValue = function getSmoothedPeakValue() {
        return this._smoothedPeakValue;
    };

    AudioVolumeMeter.prototype.setAlpha = function setAlpha(alpha: string) {
        assert.isNumber(alpha, 'alpha');

        this._alpha = parseFloat(alpha);
    };

    AudioVolumeMeter.prototype.connect = function connect(stream: any) {
        var that = this;

        return connectToStream.call(that, stream);
    };

    AudioVolumeMeter.prototype.stop = function stop() {
        return stopConnections.call(this);
    };

    AudioVolumeMeter.prototype.toString = function toString() {
        return 'AudioVolumeMeter';
    };

    function onAudioProcess(this: any, event: Event_OnAudioProcess) {
        var input = event.inputBuffer.getChannelData(0);
        var sum = 0.;
        var clipped = 0;

        for (var i = 0; i < input.length; i++) {
            sum += input[i] * input[i];

            if (Math.abs(input[i]) > 0.99) {
                clipped++;
            }
        }

        this._value = Math.sqrt(sum / input.length);
        this._smoothedValue = this._alpha * this._value + (1. - this._alpha) * this._smoothedValue;
        this._smoothedPeakValue = Math.max(this._value, this._alpha * this._value + (1. - this._alpha) * this._smoothedPeakValue);
        this._clipped = clipped;

        if (this._callback) {
            this._callback.call(this, {
                date: _.now(),
                value: this._value,
                smoothedValue: this._smoothedValue,
                smoothedPeakValue: this._smoothedPeakValue,
                clipped: this._clipped
            });
        }
    }

    function connectToStream(this: any, stream:Stream_ConnectToStream) {
        assert.isObject(stream, 'stream');

        var that = this;

        if (stream.getAudioTracks().length > 0) {
            that._mediaStreamSource = that._context.createMediaStreamSource(stream);
            that._mediaStreamSource.connect(that._scriptProcessor);
            that._scriptProcessor.connect(that._context.destination);
        } else {
            that._logger.info('Stream has no audio tracks');
        }
    }

    function stopConnections(this: any) {
        if (this._mediaStreamSource) {
            this._mediaStreamSource.disconnect();
        }

        this._scriptProcessor.disconnect();
    }

    return AudioVolumeMeter;
});