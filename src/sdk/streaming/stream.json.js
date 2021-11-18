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
], function() {
    'use strict';

    var streamEnums = {
        networkStates: {
            networkEmpty: {
                id: 0,
                name: 'NETWORK_EMPTY'
            },
            networkIdle: {
                id: 1,
                name: 'NETWORK_IDLE'
            },
            networkLoading: {
                id: 2,
                name: 'NETWORK_LOADING'
            },
            networkNoSource: {
                id: 3,
                name: 'NETWORK_NO_SOURCE'
            }
        },
        types: {
            realTime: {
                id: 0,
                name: 'real-time'
            },
            dash: {
                id: 1,
                name: 'dash'
            },
            hls: {
                id: 2,
                name: 'hls'
            },
            rtmp: {
                id: 0,
                name: 'rtmp'
            }
        },
        streamEvents: {
            playerEnded: {
                id: 0,
                name: 'playerended'
            },
            playerError: {
                id: 1,
                name: 'playererror'
            },
            stopped: {
                id: 2,
                name: 'stopped'
            }
        },
        rendererEvents: {
            ended: {
                id: 0,
                name: 'ended'
            },
            error: {
                id: 1,
                name: 'error'
            },
            autoMuted: {
                id: 2,
                name: 'autoMuted'
            },
            failedToPlay: {
                id: 3,
                name: 'failedToPlay'
            }
        }
    };

    return streamEnums;
});