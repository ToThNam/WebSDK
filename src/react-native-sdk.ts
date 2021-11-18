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

'use strict';

define('phenix-web-sdk', [
    './web-sdk'
], function(webSdk) {
    if(!webSdk.RTC.global.atob) {
        var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
        webSdk.RTC.global.atob = function(input: any) {
            var strInput = (String(input)).replace(/[=]+$/, '');

            if ((strInput.length % 4) === 1) {
                throw new Error("'atob' failed: The string to be decoded is not correctly encoded.");
            }

            for (
                // Initialize result and counter
                var bufferCounter: number = 0, bufferSum: number, buffer: number | string , index : number = 0, output: string = '';
                // Get next characterdigits
                // eslint-disable-next-line no-cond-assign
                buffer = strInput.charAt(index++);
                // Character found in table? initialize bit storage and add its ascii value;
                ~buffer && (bufferSum = bufferCounter % 4 ? bufferSum! * 64 + buffer : buffer,
                // If not first of each 4 characters, convert the first 8 bits to one ascii character
                bufferCounter++ % 4) ? output += String.fromCharCode(255 & bufferSum >> (-2 * bufferCounter & 6)) : 0
            ) {
                buffer = chars.indexOf(buffer);
            }

            return output;
        };
    }

    return webSdk;
});