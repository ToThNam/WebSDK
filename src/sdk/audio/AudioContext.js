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
    'phenix-rtc'
], function(rtc) {
    'use strict';

    function AudioContext() {
        this.init();
    }

    AudioContext.prototype.init = function init() {
        if (!rtc.global.AudioContext && !rtc.global.webkitAudioContext) {
            throw new Error('Browser does not support AudioContext');
        }

        this._audioContext = new (rtc.global.AudioContext || rtc.global.webkitAudioContext)();
    };

    AudioContext.prototype.getNativeAudioContext = function getNativeAudioContext() {
        return this._audioContext;
    };

    AudioContext.prototype.toString = function toString() {
        return 'AudioContext';
    };

    return AudioContext;
});