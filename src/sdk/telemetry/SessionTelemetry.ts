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

import { NewStats_LogNetworkStatsChange, 
    OldStats_LogNetworkStatsChange,
     Record_RecordMetricRecord 
    } from "../../../typescript/src/sdk/telemetry/SessionTelemetry";

define('',[
    'phenix-web-lodash-light',
    'phenix-web-assert',
    'phenix-web-disposable',
    'phenix-web-application-activity-detector',
    './NetworkMonitor',
    'phenix-rtc'
], function(_, assert, disposable, applicationActivityDetector, NetworkMonitor, phenixRTC) {
    'use strict';

    var start = phenixRTC.global['__phenixPageLoadTime'] || phenixRTC.global['__pageLoadTime'] || _.now();
    var sdkVersion = '%SDKVERSION%' || '?';

    function SessionTelemetry(this: any, logger: any, metricsTransmitter: any) {
        this._version = sdkVersion;
        this._sessionId = null;
        this._properties = {
            resource: 'session',
            kind: 'event'
        };
        this._logger = logger;
        this._metricsTransmitter = metricsTransmitter;
        this._networkMonitor = new NetworkMonitor(this._logger);
        this._start = _.now();
        this._disposables = new disposable.DisposableList();
        this._records = [];

        this._disposables.add(applicationActivityDetector.onBackground(_.bind(recordForegroundChange, this, false)));
        this._disposables.add(applicationActivityDetector.onForeground(_.bind(recordForegroundChange, this, true)));

        if (!this._networkMonitor.isSupported()) {
            return;
        }

        this._disposables.add(this._networkMonitor.onNetworkChange(_.bind(logNetworkStatsChange, this)));
        this._disposables.add(this._networkMonitor);

        recordNetworkTypeState.call(this);
        recordNetworkDownlinkThroughputCapacity.call(this);
        recordNetworkRTT.call(this);
    }

    SessionTelemetry.prototype.setSessionId = function(sessionId: string) {
        if (!sessionId && this._sessionId) {
            recordMetricRecord.call(this, {
                metric: 'Stopped',
                elapsed: this.elapsed()
            }, since());
        }

        this._sessionId = sessionId;

        if (sessionId) {
            recordMetricRecord.call(this, {
                metric: 'Initialized',
                elapsed: this.elapsed()
            }, since());
            recordAllMetrics.call(this);
            recordForegroundState.call(this);

            if (this._networkMonitor.isSupported()) {
                recordNetworkTypeState.call(this);
                recordNetworkDownlinkThroughputCapacity.call(this);
                recordNetworkRTT.call(this);
            }
        }
    };

    SessionTelemetry.prototype.setProperty = function(name: string | number, value: string) {
        assert.isStringNotEmpty(name, 'name');
        assert.isStringNotEmpty(value, 'value');

        this._properties[name] = value;
    };

    SessionTelemetry.prototype.recordMetric = function(metric: string, value: any, previousValue: any, additionalProperties: any) {
        assert.isStringNotEmpty(metric, 'metric');

        var record = _.assign({}, {
            metric: metric,
            elapsed: this.elapsed(),
            value: value,
            previousValue: previousValue
        }, additionalProperties || {});

        recordMetricRecord.call(this, record, since());
    };

    SessionTelemetry.prototype.elapsed = function() {
        var now = _.now();

        return now - this._start;
    };

    SessionTelemetry.prototype.dispose = function() {
        this._disposables.dispose();

        this.recordMetric('Stopped');

        logMetric.call(this, 'Session telemetry stopped');
    };

    function recordForegroundState(this: any) {
        var isForeground = applicationActivityDetector.isForeground();
        var timeSinceLastChange = applicationActivityDetector.getTimeSinceLastChange();
        var metric = isForeground ? 'ApplicationForeground' : 'ApplicationBackground';

        this.recordMetric(metric, {uint64: timeSinceLastChange});

        logMetric.call(this, 'Session has started in the [%s] after [%s] ms', isForeground ? 'foreground' : 'background', timeSinceLastChange);
    }

    function recordForegroundChange(this: any, isForeground: boolean, timeSinceLastChange: any) {
        var metric = isForeground ? 'ApplicationForeground' : 'ApplicationBackground';

        this.recordMetric(metric, {uint64: timeSinceLastChange});

        logMetric.call(this, 'Application has gone into the [%s] after [%s] ms', isForeground ? 'foreground' : 'background', timeSinceLastChange);
    }

    function recordNetworkTypeState(this: any) {
        var type = this._networkMonitor.getEffectiveType();

        this.recordMetric('NetworkType', {string: type}, null, {resource: phenixRTC.browser});

        logMetric.call(this, '[%s] has started with Network effective type of [%s]', this._sessionId ? 'Session' : 'Application', type);
    }

    function recordNetworkTypeChange(this: any, newType: any, previousType: any) {
        var newNetworkType = newType || this._networkMonitor.getEffectiveType();
        var previousNetworkType = previousType;

        this.recordMetric('NetworkType', {string: newNetworkType}, {string: previousNetworkType}, {resource: phenixRTC.browser});

        logMetric.call(this, 'Network effective type has changed to [%s] from [%s]', newNetworkType, previousNetworkType || 'New');
    }

    function recordNetworkRTT(this: any, newValue?: any, oldValue?: number) {
        var newRTT = newValue || this._networkMonitor.getRoundTripTime();
        var oldRTT = oldValue || -1;

        this.recordMetric('RoundTripTime', {uint32: newRTT}, {uint32: oldRTT}, {resource: phenixRTC.browser});

        if (_.isNullOrUndefined(oldValue)) {
            return logMetric.call(this, 'Network RTT [%s]', newRTT);
        }

        logMetric.call(this, 'Network RTT changed to [%s] from [%s]', newRTT, oldRTT);
    }

    function recordNetworkDownlinkThroughputCapacity(this: any, newValue?: any, oldValue?: number) {
        var newCapacity = newValue || this._networkMonitor.getDownlinkThroughputCapacity();
        var oldCapacity = oldValue || -1;

        this.recordMetric('DownlinkThroughputCapacity', {float: newCapacity}, {float: oldCapacity}, {resource: phenixRTC.browser});

        if (_.isNullOrUndefined(oldValue)) {
            return logMetric.call(this, 'Network downlink throughput capacity [%s]', newCapacity);
        }

        logMetric.call(this, 'Network downlink throughput capacity changed to [%s] from [%s]', newCapacity, oldCapacity);
    }

    function logNetworkStatsChange(this: any, newStats: NewStats_LogNetworkStatsChange , oldStats: OldStats_LogNetworkStatsChange ) {
        if (oldStats.downlinkThroughputCapacity !== newStats.downlinkThroughputCapacity) {
            recordNetworkDownlinkThroughputCapacity.call(this, newStats.downlinkThroughputCapacity, oldStats.downlinkThroughputCapacity);
        }

        if (oldStats.rtt !== newStats.rtt) {
            recordNetworkRTT.call(this, newStats.rtt, oldStats.rtt);
        }

        if (oldStats.effectiveType !== newStats.effectiveType) {
            recordNetworkTypeChange.call(this, newStats.effectiveType, oldStats.effectiveType);
        }
    }

    function logMetric(this: any, arg1?: string, arg2?: any, arg3?:any) {
        var args = Array.prototype.slice.call(arguments);

        if (args.length === 0) {
            throw new Error('Invalid logging arguments.');
        }

        var sessionTelemetryPrepend = '[%s] [SessionTelemetry] [%s] ';
        var message = sessionTelemetryPrepend + args[0];
        var loggingArguments = args.slice(1);
        var telemetryArguments = [message, this._sessionId, _.now() - this._start].concat(loggingArguments);

        this._logger.info.apply(this._logger, telemetryArguments);
    }

    function since() {
        var now = _.now();

        return (now - start) / 1000;
    }

    function recordMetricRecord(this: any, record: Record_RecordMetricRecord, since: any) {
        assert.isStringNotEmpty(record.metric, 'record.metric');

        if (!this._sessionId) {
            return this._records.push({
                record: record,
                since: since
            });
        }

        var annotatedRecord = _.assign({}, this._properties, record);

        this._metricsTransmitter.submitMetric(record.metric, since, this._sessionId, null, this._version, annotatedRecord);
    }

    function recordAllMetrics(this: any) {
        if (!this._sessionId) {
            return;
        }

        var that = this;
        var numberOfRecordsToPush = this._records.length;

        while (numberOfRecordsToPush > 0) {
            var records = this._records.splice(numberOfRecordsToPush - 1, 1);

            if (records.length === 1) {
                recordMetricRecord.call(that, records[0].record, records[0].since);
            }

            numberOfRecordsToPush--;
        }
    }

    return SessionTelemetry;
});