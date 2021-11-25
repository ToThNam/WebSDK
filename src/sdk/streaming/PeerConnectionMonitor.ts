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

import { monitorCallback_MonitorPeerConnection, 
    options_PeerConnectionMonitor, 
    peerConnection_MonitorPeerConnection, 
    stats_eachStats, 
    track_PeerConnectionMonitor 
} from "../../../typescript/src/sdk/streaming/PeerConnectionMonitor";

define([
    'phenix-web-lodash-light',
    'phenix-web-assert',
    'phenix-web-event',
    'phenix-rtc',
    '../sdpUtil',
    './PeerConnection'
], function(_, assert, event, phenixRTC, sdpUtil, PeerConnection) {
    'use strict';

    var defaultMonitoringInterval = 4000;
    var defaultConditionMonitoringInterval = 1500;
    var defaultFrameRateThreshold = 2;
    var defaultAudioBitRateThreshold = 5000;
    var defaultVideoBitRateThreshold = 1000;
    var defaultConditionCountForNotificationThreshold = 3;
    var minMonitoringInterval = 500;
    var minEdgeMonitoringInterval = 6000;
    var minEdgeConditionCountForNotification = 2;

    function PeerConnectionMonitor(name: string, peerConnection: object, logger: object) {
        assert.isString(name, 'name');
        assert.isObject(peerConnection, 'peerConnection');
        assert.isObject(logger, 'logger');

        this._name = name;
        this._peerConnection = peerConnection;
        this._logger = logger;
        this._lastStats = {};
    }

    PeerConnectionMonitor.prototype.start = function(options: options_PeerConnectionMonitor, activeCallback: any, monitorCallback: any) {
        assert.isObject(options, 'options');
        assert.isFunction(activeCallback, 'activeCallback');
        assert.isFunction(monitorCallback, 'monitorCallback');

        if (options.direction !== 'inbound' && options.direction !== 'outbound') {
            throw new Error('Invalid monitoring direction');
        }

        var monitoringEnabled = Object.prototype.hasOwnProperty.call(options, 'monitoringInterval') ? options.monitoringInterval > 0 : true;

        if (!monitoringEnabled) {
            this._logger.info('[%s] Monitoring is disabled', name);

            return;
        }

        this._frameRateFailureThreshold = options.frameRateThreshold || defaultFrameRateThreshold;
        this._videoBitRateFailureThreshold = options.videoBitRateThreshold || defaultVideoBitRateThreshold;
        this._audioBitRateFailureThreshold = options.audioBitRateThreshold || defaultAudioBitRateThreshold;
        this._conditionCountForNotificationThreshold = options.conditionCountForNotificationThreshold || defaultConditionCountForNotificationThreshold;
        this._monitoringInterval = Math.max(minMonitoringInterval, options.monitoringInterval || defaultMonitoringInterval);
        this._conditionMonitoringInterval = Math.max(minMonitoringInterval, options.conditionMonitoringInterval || defaultConditionMonitoringInterval);
        this._monitorFrameRate = Object.prototype.hasOwnProperty.call(options, 'monitorFrameRate') ? options.monitorFrameRate : true;
        this._monitorBitRate = Object.prototype.hasOwnProperty.call(options, 'monitorBitRate') ? options.monitorBitRate : true;
        this._monitorState = Object.prototype.hasOwnProperty.call(options, 'monitorState') ? options.monitorState : true;
        this._pausedTracks = [];
        this._calculatedMetricsEvent = new event.Event();

        if (phenixRTC.browser === 'Edge') {
            var conditionMaxDuration = this._conditionMonitoringInterval * this._conditionCountForNotificationThreshold;

            this._monitoringInterval = Math.max(this._monitoringInterval, minEdgeMonitoringInterval);
            this._conditionMonitoringInterval = Math.max(this._conditionMonitoringInterval, minEdgeMonitoringInterval);
            this._conditionCountForNotificationThreshold = Math.max(Math.ceil(conditionMaxDuration / this._monitoringInterval), minEdgeConditionCountForNotification);

            this._logger.info('Using modified options for optimal monitoring of PeerConnection on [Edge]. Monitor Interval [%s], Condition Monitor Interval [%s], Condition Count For Notification [%s]',
                this._monitoringInterval, this._conditionMonitoringInterval, this._conditionCountForNotificationThreshold);
        }

        return monitorPeerConnection.call(this, this._name, this._peerConnection, options, activeCallback, monitorCallback);
    };

    PeerConnectionMonitor.prototype.setMonitorTrackState = function(track: track_PeerConnectionMonitor , state: boolean) {
        assert.isObject(track, 'track');
        assert.isBoolean(state, 'state');

        try {
            var peerConnectionTracks = getAllTracks.call(this, this._peerConnection);
            var foundTrack = !!_.find(peerConnectionTracks, function(pcTrack: { id: string; }) {
                return pcTrack.id === track.id;
            });

            if (!foundTrack) {
                return this._logger.warn('[%s] Unable to find track [%s] [%s] in peer connection', this._name, track.kind, track.id);
            }
        } catch (e: any) {
            if (phenixRTC.browser === 'Firefox' && e.message === 'InvalidStateError: Peer connection is closed') {
                this._logger.debug('Failed to verify monitor track due to closed peer connection');
            } else {
                this._logger.warn('Failed to verify monitor track due to [%s]', e.message);
            }
        }

        if (!state) {
            this._logger.info('[%s] Pausing monitoring of track [%s] [%s]', this._name, track.kind, track.id);

            return this._pausedTracks.push(track);
        }

        var pausedTrackLength = this._pausedTracks.length;

        this._pausedTracks = _.filter(this._pausedTracks, function(pausedTrack: { id: string; }) {
            return pausedTrack.id !== track.id;
        });

        if (pausedTrackLength !== this._pausedTracks.length) {
            this._logger.info('[%s] Starting monitoring of track [%s] [%s] after it was paused', this._name, track.kind, track.id);
        }
    };

    PeerConnectionMonitor.prototype.on = function(eventName: string, listener: any) {
        assert.isStringNotEmpty(eventName, 'eventName');
        assert.isFunction(listener, 'listener');

        switch (eventName) {
        case 'calculatedmetrics':
            return this._calculatedMetricsEvent.listen(listener);
        default:
            throw new Error('Unsupported event ' + eventName);
        }
    };

    PeerConnectionMonitor.prototype.toString = function() {
        return 'PeerConnectionMonitor[' + this._name + ']';
    };

    function monitorPeerConnection( name: string, peerConnection: peerConnection_MonitorPeerConnection, 
        options: options_PeerConnectionMonitor, activeCallback: () => any, 
        monitorCallback: (arg0: null, arg1: monitorCallback_MonitorPeerConnection) => any ) {
        var that = this;
        var conditionCount = 0;
        var frameRate: any = undefined;
        var videoBitRate: any = undefined;
        var audioBitRate: any = undefined;

        function nextCheck() {
            var selector = null;

            getStats.call(that, peerConnection, options, selector, activeCallback, function successCallback( report: any) {
                var hasFrameRate = false;
                var hasVideoBitRate = false;
                var hasAudioBitRate = false;

                if (!activeCallback()) {
                    return that._logger.info('[%s] Finished monitoring of peer connection', name);
                }

                function eachStats(stats: stats_eachStats) {
                    if (options.direction === 'outbound' && stats.direction === 'upload') {
                        switch (stats.mediaType) {
                        case 'video':
                            that._logger.debug('[%s] [%s] [%s] [%s] with RTT [%s], bitrate [%s], dropped frames [%s], frame rate [%s] and average encoding time [%s] ms (CPU limited=[%s])',
                                name, options.direction, stats.mediaType, stats.ssrc, stats.rtt, stats.bitrateMean, stats.droppedFrames, stats.framerateMean, stats.avgEncode, stats.cpuLimitedResolution);

                            frameRate = stats.framerateMean;
                            videoBitRate = stats.uploadRate ? stats.uploadRate * 1000 : stats.uploadRate;
                            hasFrameRate = true;
                            hasVideoBitRate = true;

                            if (options.setNetworkRTT) {
                                options.setNetworkRTT(stats.rtt);
                            }

                            if (phenixRTC.browser === 'Edge') {
                                hasFrameRate = false;
                            }

                            break;
                        case 'audio':
                            that._logger.debug('[%s] [%s] [%s] [%s] with RTT [%s], jitter [%s] and audio input level [%s]',
                                name, options.direction, stats.mediaType, stats.ssrc, stats.rtt, stats.jitter, stats.audioInputLevel);
                            hasAudioBitRate = true;
                            audioBitRate = stats.uploadRate ? stats.uploadRate * 1000 : stats.uploadRate;

                            if (options.setNetworkRTT) {
                                options.setNetworkRTT(stats.rtt);
                            }

                            break;
                        default:
                            break;
                        }
                    }

                    if (options.direction === 'inbound' && stats.direction === 'download') {
                        switch (stats.mediaType) {
                        case 'video':
                            that._logger.debug('[%s] [%s] [%s] [%s] with framerate [%s], current delay [%s] ms and target delay [%s] ms',
                                name, options.direction, stats.mediaType, stats.ssrc, stats.framerateMean, stats.currentDelay, stats.targetDelay);

                            // Inbound frame rate may not be calculated correctly
                            hasFrameRate = true;
                            frameRate = stats.framerateMean || 0;
                            hasVideoBitRate = true;
                            videoBitRate = stats.downloadRate ? stats.downloadRate * 1000 : stats.downloadRate;

                            if (phenixRTC.browser === 'Edge') {
                                hasFrameRate = false;
                            }

                            break;
                        case 'audio':
                            that._logger.debug('[%s] [%s] [%s] [%s] with jitter [%s], jitter buffer [%s] ms, audio output level [%s], total audio energy [%s] and total samples duration [%s]',
                                name, options.direction, stats.mediaType, stats.ssrc, stats.jitter, stats.jitterBuffer, stats.audioOutputLevel, stats.totalAudioEnergy, stats.totalSamplesDuration);

                            hasAudioBitRate = true;
                            audioBitRate = stats.downloadRate ? stats.downloadRate * 1000 : stats.downloadRate;

                            break;
                        default:
                            break;
                        }
                    }
                }

                if (!report) {
                    throw new Error('Report must be a valid PeerConnection.getStats Report');
                }

                _.forEach(report, eachStats);

                if (_.isUndefined(audioBitRate) && _.isUndefined(videoBitRate)) {
                    return setTimeout(nextCheck, that._monitoringInterval); // First measurement
                }

                var hasActiveAudio = sdpUtil.hasActiveAudio(peerConnection);
                var hasActiveVideo = sdpUtil.hasActiveVideo(peerConnection);

                if (hasVideoBitRate && videoBitRate === 0 || hasAudioBitRate && audioBitRate === 0 || hasFrameRate && frameRate === 0) {
                    hasVideoBitRate = hasVideoBitRate && hasActiveVideo;
                    hasAudioBitRate = hasAudioBitRate && hasActiveAudio;
                    hasFrameRate = hasFrameRate && hasActiveVideo;
                }

                if (hasAudioBitRate || hasVideoBitRate || hasFrameRate) {
                    that._logger.debug('[%s] [%s] Current bit rate is [%s] bps for audio and [%s] bps for video with [%s] FPS',
                        name, options.direction, Math.ceil(audioBitRate || 0), Math.ceil(videoBitRate || 0), frameRate || '?');

                    if (_.values(that._lastStats).length > 0) {
                        that._calculatedMetricsEvent.fire([{
                            videoBitRate: videoBitRate,
                            audioBitRate: audioBitRate,
                            frameRate: frameRate
                        }]);
                    }
                }

                var reasons = [];

                if (that._monitorState
                    && (peerConnection.connectionState === 'closed'
                        || peerConnection.connectionState === 'disconnected'
                        || peerConnection.connectionState === 'failed'
                        || peerConnection.iceConnectionState === 'disconnected'
                        || peerConnection.iceConnectionState === 'failed')) {
                    var active = hasActiveAudio && hasActiveVideo;
                    var tracks = getAllTracks.call(that, peerConnection);

                    if (!active && sdpUtil.hasMediaSectionsInLocalSdp(peerConnection)) {
                        that._logger.info('[%s] [%s] Finished monitoring of peer connection with [%s] inactive tracks', name, options.direction, tracks.length);

                        return;
                    }

                    reasons.push('connection');
                }

                var peerConnectionTracks = options.direction === 'outbound' ?
                    getLocalTracks.call(this, peerConnection) :
                    getRemoteTracks.call(this, peerConnection);

                if (that._monitorFrameRate && hasFrameRate && frameRate <= that._frameRateFailureThreshold && !areAllTracksOfTypePaused.call(that, 'video', peerConnectionTracks)) {
                    reasons.push('frameRate');
                }

                if (that._monitorBitRate && hasAudioBitRate && audioBitRate <= that._audioBitRateFailureThreshold && !areAllTracksOfTypePaused.call(that, 'audio', peerConnectionTracks)) {
                    reasons.push('audioBitRate');
                }

                if (that._monitorBitRate && hasVideoBitRate && videoBitRate <= that._videoBitRateFailureThreshold && !areAllTracksOfTypePaused.call(that, 'video', peerConnectionTracks)) {
                    reasons.push('videoBitRate');
                }

                if (videoBitRate === 0 && hasActiveVideo && !areAllTracksOfTypePaused.call(that, 'video', peerConnectionTracks)) {
                    reasons.push('noVideoData');
                }

                if (audioBitRate === 0 && hasActiveAudio && !areAllTracksOfTypePaused.call(that, 'audio', peerConnectionTracks)) {
                    reasons.push('noAudioData');
                }

                var acknowledgeFailure = function acknowledgeFailure() {
                    that._logger.info('[%s] [%s] Failure has been acknowledged', name, options.direction);

                    conditionCount = Number.MIN_VALUE;

                    setTimeout(nextCheck, that._monitoringInterval);
                };

                if (reasons.length > 0) {
                    conditionCount++;
                } else {
                    conditionCount = 0;
                }

                if (conditionCount >= that._conditionCountForNotificationThreshold) {
                    var failureMessage = '[' + name + '] [' + options.direction + '] Failure detected with frame rate [' + frameRate + '] FPS,'
                        + ' audio bit rate [' + audioBitRate + '] bps'
                        + ', video bit rate [' + videoBitRate + '] bps'
                        + ', connection state [' + peerConnection.connectionState + '],'
                        + ' and ice connection state [' + peerConnection.iceConnectionState + ']'
                    + ' after [' + conditionCount + '] checks';
                    var monitorEvent = {
                        type: 'condition',
                        reasons: reasons,
                        message: failureMessage,
                        report: report,
                        frameRate: frameRate,
                        videoBitRate: videoBitRate,
                        audioBitRate: audioBitRate,
                        acknowledgeFailure: acknowledgeFailure
                    };

                    if (!monitorCallback(null, monitorEvent)) {
                        that._logger.info(failureMessage + ': [%s]', report);
                    } else {
                        acknowledgeFailure();
                    }
                } else {
                    setTimeout(nextCheck, conditionCount > 0 ? that._conditionMonitoringInterval : that._monitoringInterval);
                }
            }, function errorCallback(error: null) {
                monitorCallback(error, {
                    type: 'error',
                    message: 'Unable to get Connection statistics. Connection may have failed.'
                });
            });
        }

        setTimeout(nextCheck, that._monitoringInterval);
    }

    function getStats(peerConnection: any, options: { direction: string; }, selector: any, activeCallback: () => any, successCallback: (arg0: any) => void, errorCallback: (arg0: any) => void) {
        if (!activeCallback()) {
            return this._logger.info('[%s] Finished monitoring of peer connection', this._name);
        }

        var that = this;

        phenixRTC.getStats(peerConnection, null, function(response: any) {
            var report = PeerConnection.convertPeerConnectionStats(response, that._lastStats);

            report = _.filter(report, function(stats: { direction: string; }) {
                return options.direction === 'inbound' && stats.direction === 'download' || options.direction === 'outbound' && stats.direction === 'upload';
            });

            successCallback(report);
        }, function(error: any) {
            errorCallback(error);
        });
    }

    function getAllTracks(peerConnection: any) {
        var localTracks = getLocalTracks(peerConnection);
        var remoteTracks = getRemoteTracks(peerConnection);

        if (localTracks.length !== 0 && remoteTracks.length !== 0) {
            var result: any = [];

            _.forEach(localTracks, function(track: any) {
                result.push(track);
            });

            _.forEach(remoteTracks, function(track: any) {
                result.push(track);
            });

            return result;
        } else if (localTracks.length !== 0) {
            return localTracks;
        } else if (remoteTracks.length !== 0) {
            return remoteTracks;
        }

        return [];
    }

    function getLocalTracks(peerConnection: any) {
        var tracks = peerConnection.getSenders ? _.map(peerConnection.getSenders(), function(receiver: { track: any; }) {
            return receiver.track;
        }) : [];

        tracks = _.filter(tracks, function(track: any) {
            return !_.isNullOrUndefined(track);
        });

        if (tracks.length === 0) {
            var streams = peerConnection.getLocalStreams ? peerConnection.getLocalStreams() : [];

            return _.reduce(streams, function(tracks:  any, stream: { getTracks: () => any; }) {
                return tracks.concat(stream.getTracks());
            }, []);
        }

        return tracks;
    }

    function getRemoteTracks(peerConnection: any) {
        var tracks = peerConnection.getReceivers ? _.map(peerConnection.getReceivers(), function(sender: { track: any; }) {
            return sender.track;
        }) : [];

        tracks = _.filter(tracks, function(track: any) {
            return !_.isNullOrUndefined(track);
        });

        if (tracks.length === 0) {
            var streams = peerConnection.getRemoteStreams ? peerConnection.getRemoteStreams() : [];

            return _.reduce(streams, function(tracks: any, stream: { getTracks: () => any; }) {
                return tracks.concat(stream.getTracks());
            }, []);
        }

        return tracks;
    }

    function areAllTracksOfTypePaused( kind: string, peerConnectionTracks: any) {
        var pcTracksOfType = _.filter(peerConnectionTracks, function(track: { kind: string; }) {
            return track.kind === kind;
        });
        var pausedTracksOfType = _.filter(this._pausedTracks, function(track: { kind: string; }) {
            return track.kind === kind;
        });

        return _.reduce(pcTracksOfType, function(areAllPaused: boolean, track: { id: string; enabled: any; }) {
            if (!areAllPaused) {
                return areAllPaused;
            }

            var isTrackPaused = !!_.find(pausedTracksOfType, function(pcTrack: { id: string; }) {
                return pcTrack.id === track.id;
            });

            return !track.enabled || isTrackPaused;
        }, true);
    }

    return PeerConnectionMonitor;
});