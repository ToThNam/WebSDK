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

import { 
    reportToUpdate_forOwn_Edge, 
    reportToUpdate_forOwn_Safari, 
    report_Firefox, 
    report_forEach_Edge, 
    report_forEach_ReactNative, 
    report_forEach_Safari, 
    report_forOwn_Edge, 
    report_ReportToUpdate, 
    StatsReport_ConvertStats 
} from "../../../typescript/src/sdk/streaming/PeerConnection";

define('',[
    'phenix-web-lodash-light',
    'phenix-rtc'
], function(_, rtc) {
    'use strict';

    // TODO(dy) wrap PC in this class
    function PeerConnection() {

    }

    PeerConnection.convertPeerConnectionStats = function(stats: any, lastStats: any) {
        return convertPeerConnectionStats(stats, lastStats);
    };

    function convertPeerConnectionStats(stats: any, lastStats: { [x: string]: any; }) {
        if (!stats) {
            return null;
        }

        var newStats: any  = [];
        var normalizedStats = normalizeStatsReport(stats);

        var iteratorDidRun = false;

        function convertStats(statsReport: StatsReport_ConvertStats ) {
            if (!iteratorDidRun) {
                iteratorDidRun = true;
            }

            if (!_.hasIndexOrKey(statsReport, 'ssrc') || !statsReport.ssrc || _.includes(statsReport.id, 'rtcp')) {
                return;
            }

            var id = statsReport.id || statsReport.ssrc;

            if (!_.hasIndexOrKey(lastStats, id)) {
                lastStats[id] = {timestamp: _.now()};
            }

            var direction = '?';
            var timeDelta = parseFloat(statsReport.timestamp) - lastStats[id].timestamp;
            var up = calculateUploadRate(parseFloat(statsReport.bytesSent), lastStats[id].bytesSent, timeDelta);
            var down = calculateDownloadRate(parseFloat(statsReport.bytesReceived), lastStats[id].bytesReceived, timeDelta);
            var framerateMean = calculateFrameRate(useFirstNumberValue(parseIntOrUndefined(statsReport.framesEncoded), parseIntOrUndefined(statsReport.framesDecoded)), lastStats[id].framesEncoded || lastStats[id].framesDecoded, timeDelta);

            if (isOutbound(statsReport)) {
                direction = 'upload';
            }

            if (isInbound(statsReport)) {
                direction = 'download';
            }

            var stat = {
                uploadRate: up,
                downloadRate: down,
                mediaType: statsReport.mediaType,
                ssrc: statsReport.ssrc,
                direction: direction,
                nativeReport: statsReport,
                rtt: useFirstNumberValue(parseIntOrUndefined(statsReport.rtt), parseIntOrUndefined(statsReport.googRtt), parseIntOrUndefined(statsReport.roundTripTime), parseIntOrUndefined(statsReport.currentRoundTripTime)),
                bitrateMean: parseIntOrUndefined(statsReport.bitrateMean, 10) || (isOutbound(statsReport) ? up : down)! * 1000,
                targetDelay: parseIntOrUndefined(useFirstStringValue(statsReport.targetDelay, statsReport.googTargetDelayMs), 10),
                currentDelay: parseIntOrUndefined(useFirstStringValue(statsReport.currentDelay, statsReport.currentDelayMs, statsReport.googCurrentDelayMs), 10)
            };

            _.assign(lastStats[id], statsReport);

            if (statsReport.mediaType === 'video') {
                stat = _.assign(stat, {
                    droppedFrames: parseIntOrUndefined(statsReport.droppedFrames, 10) || 0,
                    framerateMean: useFirstNumberValue(statsReport.framerateMean, statsReport.framesPerSecond, framerateMean) || 0,
                    cpuLimitedResolution: useFirstStringValue(statsReport.cpuLimitedResolution, statsReport.googCpuLimitedResolution),
                    avgEncode: parseIntOrUndefined(useFirstStringValue(statsReport.avgEncode, statsReport.avgEncodeMs, statsReport.googAvgEncodeMs), 10)
                });
            }

            if (statsReport.mediaType === 'audio') {
                stat = _.assign(stat, {
                    audioInputLevel: useFirstStringValue(statsReport.audioInputLevel, statsReport.googAudioInputLevel),
                    audioOutputLevel: useFirstStringValue(statsReport.audioOutputLevel, statsReport.googAudioOutputLevel),
                    jitter: parseIntOrUndefined(useFirstStringValue(statsReport.jitter, statsReport.jitterReceived, statsReport.googJitterReceived), 10),
                    jitterBuffer: parseIntOrUndefined(useFirstStringValue(statsReport.jitterBuffer, statsReport.jitterBufferMs, statsReport.googJitterBufferMs), 10),
                    totalSamplesDuration: parseFloatOrUndefined(statsReport.totalSamplesDuration),
                    totalAudioEnergy: parseFloatOrUndefined(statsReport.totalAudioEnergy)
                });
            }

            newStats.push(stat);
        }

        _.forOwn(normalizedStats, convertStats);

        if (!iteratorDidRun && newStats.length <= 0 && normalizedStats.forEach) {
            normalizedStats.forEach(convertStats);
        }

        return newStats;
    }

    function useFirstNumberValue(value1?: any , value2?: any , value3?: any , value4?: any , value5?: any) {
        if (_.isNumber(value1)) {
            return value1;
        }

        if (_.isNumber(value2)) {
            return value2;
        }

        if (_.isNumber(value3)) {
            return value3;
        }

        if (_.isNumber(value4)) {
            return value4;
        }

        return value5;
    }

    function useFirstStringValue(value1?: any, value2?: any, value3?: any, value4?: any, value5?: any) {
        if (_.isString(value1)) {
            return value1;
        }

        if (_.isString(value2)) {
            return value2;
        }

        if (_.isString(value3)) {
            return value3;
        }

        if (_.isNumber(value4)) {
            return value4;
        }

        return value5;
    }

    function parseIntOrUndefined(value?: any , radix?: any ) {
        var parsed = parseInt(value, radix);

        if (isNaN(parsed)) {
            return undefined;
        }

        return parsed;
    }

    function parseFloatOrUndefined(value: string) {
        var parsed = parseFloat(value);

        if (isNaN(parsed)) {
            return undefined;
        }

        return parsed;
    }

    function calculateUploadRate(bytesSent: number, prevBytesSent: number, timeDelta: number) {
        if (_.isUndefined(prevBytesSent)) {
            return;
        }

        if (bytesSent) {
            var bytesSentBefore = prevBytesSent || 0;

            return 8 * (bytesSent - bytesSentBefore) / timeDelta;
        }

        return 0;
    }

    function calculateDownloadRate(bytesReceived: number, prevBytesReceived: number, timeDelta: number) {
        if (_.isUndefined(prevBytesReceived)) {
            return;
        }

        if (bytesReceived) {
            var bytesReceivedBefore = prevBytesReceived || 0;

            return 8 * (bytesReceived - bytesReceivedBefore) / timeDelta;
        }

        return 0;
    }

    function calculateFrameRate(currentFramesEncoded: number, lastFramesEncoded: number, timeDelta: number) {
        if (_.isUndefined(lastFramesEncoded)) {
            return;
        }

        return (currentFramesEncoded - lastFramesEncoded)
            / (timeDelta / 1000.0);
    }

    function normalizeStatsReport(stats: any) {
        var normalizedReport: any = {};

        switch (rtc.browser) {
        case 'Firefox':
            _.forOwn(stats, function(report: report_Firefox , key: any) {
                if (_.includes(key, 'rtcp')) {
                    _.forOwn(stats, function(reportToUpdate: report_ReportToUpdate, key: any) {
                        if (_.includes(key, 'rtp') && report.mediaType === reportToUpdate.mediaType) {
                            reportToUpdate.jitter = (report.jitter || reportToUpdate.jitter) * 1000;
                            reportToUpdate.roundTripTime = report.roundTripTime;
                        }
                    });
                }
            });

            return stats;
        case 'IE':
            _.forOwn(stats, function(value: { id: string ; }, key: any) {
                if (!_.startsWith(key, 'ssrc')) {
                    return;
                }

                normalizedReport[value.id] = value;
            });

            return normalizedReport;
        case 'Edge':
            stats.forEach(function(report: report_forEach_Edge) {
                normalizedReport[report.id] = report;

                if (_.hasIndexOrKey(report, 'jitter')) {
                    report.jitter *= 1000;
                }
            });

            _.forOwn(normalizedReport, function(report:report_forOwn_Edge) {
                if (report.type === 'track' && _.hasIndexOrKey(report, 'framesPerSecond')) {
                    _.forOwn(normalizedReport, function(reportToUpdate: reportToUpdate_forOwn_Edge) {
                        if (reportToUpdate.mediaType === 'video') {
                            reportToUpdate.framesPerSecond = parseInt(report.framesPerSecond, 10);
                        }
                    });
                }
            });

            return normalizedReport;
        case 'Safari':
            stats.forEach(function(report: report_forEach_Safari) {
                normalizedReport[report.id] = report;
            });

            _.forOwn(normalizedReport, function(report: any) {
                if (_.hasIndexOrKey(report, 'id') && isInbound(report)) {
                    var candidateSsrc = parseInt(_.get(report.id.split('_'), [1]), 10);

                    report.ssrc = candidateSsrc || report.ssrc; // Ssrc is inaccurate for inbound reports
                }

                if (_.hasIndexOrKey(report, 'jitter')) {
                    report.jitter *= 1000;
                }

                if (report.type === 'candidate-pair') {
                    _.forOwn(normalizedReport, function(reportToUpdate: reportToUpdate_forOwn_Safari) {
                        if (reportToUpdate.mediaType === 'audio' || reportToUpdate.mediaType === 'video') {
                            reportToUpdate.currentRoundTripTime = report.currentRoundTripTime * 1000;
                        }
                    });
                }

                if (report.type === 'track') {
                    _.forOwn(normalizedReport, function(reportToUpdate: any) {
                        if (reportToUpdate.mediaType === 'audio' && isInbound(reportToUpdate)) {
                            reportToUpdate.audioOutputLevel = report.audioLevel * 100000;
                        } else if (reportToUpdate.mediaType === 'audio' && isOutbound(reportToUpdate)) {
                            reportToUpdate.audioInputLevel = report.audioLevel * 100000;
                        }
                    });
                }
            });

            return normalizedReport;
        case 'ReactNative':
            var parsedStats = _.isString(stats) ? JSON.parse(stats) : stats;

            parsedStats.forEach(function(report: report_forEach_ReactNative) {
                var normalizedStatistics : any = {
                    id: report.id,
                    type: report.type
                };

                report.values.forEach(function(value) {
                    _.keys(value).forEach(function(key: string | number) {
                        normalizedStatistics[key] = value[key];
                    });
                });

                normalizedStatistics.timestamp = report.timestamp;

                normalizedReport[normalizedStatistics.id] = normalizedStatistics;
            });

            return normalizedReport;
        case 'Chrome':
        default:
            stats.result().forEach(function(report : any) {
                var normalizedStatistics :any = {
                    id: report.id,
                    type: report.type
                };

                report.names().forEach(function(name: string | number) {
                    normalizedStatistics[name] = report.stat(name);
                });

                normalizedStatistics.timestamp = report.timestamp.getTime();

                normalizedReport[normalizedStatistics.id] = normalizedStatistics;
            });

            return normalizedReport;
        }
    }

    function isOutbound(statsReport: StatsReport_ConvertStats) {
        return _.includes(statsReport.id, 'send') || _.includes(statsReport.id, 'outbound') || statsReport.type === 'outboundrtp' || statsReport.type === 'outbound-rtp' || statsReport.type === 'kOutboundRtp';
    }

    function isInbound(statsReport: StatsReport_ConvertStats) {
        return _.includes(statsReport.id, 'recv') || statsReport.type === 'inboundrtp' || statsReport.type === 'inbound-rtp' || statsReport.type === 'kInboundRtp';
    }

    return PeerConnection;
});