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
/* global global, process*/
global.window = undefined;
global.navigator = {userAgent: 'Node/' + process.version + ' (Version/' + process.version + ')'};
global.XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest; // External dependency https://www.npmjs.com/package/xmlhttprequest
global.WebSocket = require('ws'); // External dependency https://www.npmjs.com/package/ws

define('phenix-web-sdk', [
    'phenix-rtc',
    'phenix-web-logging',
    './sdk/PCast',
    './sdk/room/RoomService',
    './sdk/audio/AudioSpeakerDetector',
    './sdk/bandwidth/BandwidthMonitor',
    './sdk/userMedia/UserMediaResolver',
    './sdk/express/PCastExpress',
    './sdk/express/RoomExpress',
    './sdk/express/ChannelExpress',
    './sdk/AdminApiProxyClient'
], function(rtc, logging, PCast, RoomService, AudioSpeakerDetector, BandwidthMonitor, UserMediaResolver, PCastExpress, RoomExpress, ChannelExpress, AdminApiProxyClient) {
    rtc.global.atob = function(parameter) {
        // eslint-disable-next-line no-undef
        return new Buffer.from(parameter, 'base64').toString('binary');
    };

    return {
        express: {
            PCastExpress: PCastExpress,
            RoomExpress: RoomExpress,
            ChannelExpress: ChannelExpress
        },
        lowLevel: {
            PCast: PCast,
            RoomService: RoomService
        },
        media: {
            AudioSpeakerDetector: AudioSpeakerDetector,
            UserMediaResolver: UserMediaResolver
        },
        net: {AdminApiProxyClient: AdminApiProxyClient},
        utils: {
            BandwidthMonitor: BandwidthMonitor,
            logging: logging,
            rtc: rtc
        }
    };
});