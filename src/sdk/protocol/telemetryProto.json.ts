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
//@ts-ignore
define([
], function() {
    'use strict';

    var telemetryProto = {
        "package": "telemetry",
        "messages": [
            {
                "name": "LogData",
                "fields": [
                    {
                        "rule": "required",
                        "type": "LogLevel",
                        "name": "level",
                        "id": 1
                    },
                    {
                        "rule": "required",
                        "type": "string",
                        "name": "timestamp",
                        "id": 2
                    },
                    {
                        "rule": "required",
                        "type": "string",
                        "name": "category",
                        "id": 3
                    },
                    {
                        "rule": "required",
                        "type": "string",
                        "name": "message",
                        "id": 4
                    },
                    {
                        "rule": "optional",
                        "type": "string",
                        "name": "source",
                        "id": 5
                    },
                    {
                        "rule": "optional",
                        "type": "string",
                        "name": "fullQualifiedName",
                        "id": 11
                    },
                    {
                        "rule": "optional",
                        "type": "string",
                        "name": "sessionId",
                        "id": 6
                    },
                    {
                        "rule": "optional",
                        "type": "string",
                        "name": "userId",
                        "id": 7
                    },
                    {
                        "rule": "optional",
                        "type": "string",
                        "name": "environment",
                        "id": 8
                    },
                    {
                        "rule": "optional",
                        "type": "string",
                        "name": "version",
                        "id": 9
                    },
                    {
                        "rule": "optional",
                        "type": "float",
                        "name": "runtime",
                        "id": 10
                    }
                ]
            },
            {
                "name": "StoreLogRecords",
                "fields": [
                    {
                        "rule": "repeated",
                        "type": "LogData",
                        "name": "records",
                        "id": 1
                    }
                ]
            },
            {
                "name": "StoreLogRecordsResponse",
                "fields": [
                    {
                        "rule": "required",
                        "type": "string",
                        "name": "status",
                        "id": 1
                    },
                    {
                        "rule": "required",
                        "type": "uint64",
                        "name": "storedRecords",
                        "id": 2
                    }
                ]
            },
            {
                "name": "MetricValue",
                "fields": [
                    {
                        "rule": "optional",
                        "type": "string",
                        "name": "string",
                        "id": 1
                    },
                    {
                        "rule": "optional",
                        "type": "float",
                        "name": "float",
                        "id": 2
                    },
                    {
                        "rule": "optional",
                        "type": "uint64",
                        "name": "uint64",
                        "id": 3
                    },
                    {
                        "rule": "optional",
                        "type": "int64",
                        "name": "int64",
                        "id": 4
                    },
                    {
                        "rule": "optional",
                        "type": "bool",
                        "name": "boolean",
                        "id": 5
                    },
                    {
                        "rule": "optional",
                        "type": "string",
                        "name": "timestamp",
                        "id": 6
                    }
                ]
            },
            {
                "name": "MetricData",
                "fields": [
                    {
                        "rule": "required",
                        "type": "string",
                        "name": "timestamp",
                        "id": 1
                    },
                    {
                        "rule": "optional",
                        "type": "string",
                        "name": "sessionId",
                        "id": 2
                    },
                    {
                        "rule": "optional",
                        "type": "string",
                        "name": "streamId",
                        "id": 3
                    },
                    {
                        "rule": "optional",
                        "type": "string",
                        "name": "source",
                        "id": 4
                    },
                    {
                        "rule": "optional",
                        "type": "string",
                        "name": "resource",
                        "id": 5
                    },
                    {
                        "rule": "optional",
                        "type": "string",
                        "name": "kind",
                        "id": 6
                    },
                    {
                        "rule": "required",
                        "type": "Metric",
                        "name": "metric",
                        "id": 7
                    },
                    {
                        "rule": "optional",
                        "type": "MetricValue",
                        "name": "value",
                        "id": 8
                    },
                    {
                        "rule": "optional",
                        "type": "MetricValue",
                        "name": "previousValue",
                        "id": 9
                    },
                    {
                        "rule": "optional",
                        "type": "uint64",
                        "name": "elapsed",
                        "id": 10
                    },
                    {
                        "rule": "optional",
                        "type": "string",
                        "name": "fullQualifiedName",
                        "id": 11
                    },
                    {
                        "rule": "optional",
                        "type": "string",
                        "name": "environment",
                        "id": 12
                    },
                    {
                        "rule": "optional",
                        "type": "string",
                        "name": "version",
                        "id": 13
                    },
                    {
                        "rule": "optional",
                        "type": "string",
                        "name": "tool",
                        "id": 14
                    },
                    {
                        "rule": "optional",
                        "type": "string",
                        "name": "toolVersion",
                        "id": 15
                    },
                    {
                        "rule": "required",
                        "type": "float",
                        "name": "runtime",
                        "id": 16
                    }
                ]
            },
            {
                "name": "SubmitMetricRecords",
                "fields": [
                    {
                        "rule": "repeated",
                        "type": "MetricData",
                        "name": "records",
                        "id": 1
                    }
                ]
            },
            {
                "name": "SubmitMetricRecordsResponse",
                "fields": [
                    {
                        "rule": "required",
                        "type": "string",
                        "name": "status",
                        "id": 1
                    },
                    {
                        "rule": "required",
                        "type": "uint64",
                        "name": "storedRecords",
                        "id": 2
                    }
                ]
            }
        ],
        "enums": [
            {
                "name": "LogLevel",
                "values": [
                    {
                        "name": "Trace",
                        "id": 0
                    },
                    {
                        "name": "Debug",
                        "id": 1
                    },
                    {
                        "name": "Info",
                        "id": 2
                    },
                    {
                        "name": "Warn",
                        "id": 3
                    },
                    {
                        "name": "Error",
                        "id": 4
                    },
                    {
                        "name": "Fatal",
                        "id": 5
                    }
                ]
            },
            {
                "name": "Metric",
                "values": [
                    {
                        "name": "RoundTripTime",
                        "id": 0
                    },
                    {
                        "name": "DownlinkThroughputCapacity",
                        "id": 26
                    },
                    {
                        "name": "Initialized",
                        "id": 1
                    },
                    {
                        "name": "Provisioned",
                        "id": 2
                    },
                    {
                        "name": "SetupCompleted",
                        "id": 3
                    },
                    {
                        "name": "Offset",
                        "id": 4
                    },
                    {
                        "name": "TimeToFirstFrame",
                        "id": 5
                    },
                    {
                        "name": "Playing",
                        "id": 6
                    },
                    {
                        "name": "Stalled",
                        "id": 7
                    },
                    {
                        "name": "Buffering",
                        "id": 8
                    },
                    {
                        "name": "Seeking",
                        "id": 22
                    },
                    {
                        "name": "Stopped",
                        "id": 9
                    },
                    {
                        "name": "BitRateAdaptation",
                        "id": 10
                    },
                    {
                        "name": "ResolutionChanged",
                        "id": 11
                    },
                    {
                        "name": "DisplayResolutionChanged",
                        "id": 23
                    },
                    {
                        "name": "VideoBitRate",
                        "id": 28
                    },
                    {
                        "name": "AudioBitRate",
                        "id": 29
                    },
                    {
                        "name": "FrameRateChanged",
                        "id": 12
                    },
                    {
                        "name": "FramesDropped",
                        "id": 13
                    },
                    {
                        "name": "PacketsLost",
                        "id": 14
                    },
                    {
                        "name": "PictureLost",
                        "id": 15
                    },
                    {
                        "name": "PlayoutDelayChanged",
                        "id": 16
                    },
                    {
                        "name": "CodecChanged",
                        "id": 17
                    },
                    {
                        "name": "PlayerEvent",
                        "id": 21
                    },
                    {
                        "name": "MetricDropped",
                        "id": 18
                    },
                    {
                        "name": "NetworkOffline",
                        "id": 19
                    },
                    {
                        "name": "NetworkOnline",
                        "id": 20
                    },
                    {
                        "name": "NetworkType",
                        "id": 27
                    },
                    {
                        "name": "ApplicationForeground",
                        "id": 24
                    },
                    {
                        "name": "ApplicationBackground",
                        "id": 25
                    }
                ]
            }
        ]
    };

    return telemetryProto;
});