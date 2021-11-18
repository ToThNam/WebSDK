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

define(['phenix-web-lodash-light'], function(_) {
    function ChromeRuntimeStubber() {

    }

    ChromeRuntimeStubber.prototype.stub = function(callback) {
        this._chromeRuntimeSendMessage = _.get(window, ['chrome', 'runtime', 'sendMessage']);

        _.set(window, ['chrome', 'runtime', 'sendMessage'], function(screenSharingExtensionId, options, sendMessageCallback) {
            sendMessageCallback({
                status: 'ok',
                streamId: 'MockScreenStreamId',
                version: 'TEST'
            });

            if (callback) {
                callback(screenSharingExtensionId, options, sendMessageCallback);
            }
        });
    };

    ChromeRuntimeStubber.prototype.restore = function() {
        if (this._chromeRuntimeSendMessage) {
            window.chrome.runtime.sendMessage = this._chromeRuntimeSendMessage;
        }
    };

    return ChromeRuntimeStubber;
});