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
    'phenix-web-lodash-light',
    'phenix-web-assert',
    'phenix-web-proto',
    'phenix-rtc',
    '../protocol/telemetryProto.json'
], function(_, assert, proto, rtc, telemetryProto) {
    var metricsUrl = '/metrics';

    function MetricsTransmitter(uri, environment) {
        assert.isString(uri, 'uri');

        this._domain = typeof location === 'object' ? location.hostname : rtc.browser + '-' + rtc.browserVersion + '-unknown';
        this._isEnabled = true;
        this._browser = (rtc.browser || 'Browser') + '/' + (rtc.browserVersion || '?');
        this._batchHttpProtocol = new proto.BatchHttpProto(uri + metricsUrl, [telemetryProto], 'telemetry.SubmitMetricRecords', {
            maxAttempts: 3,
            maxBufferedRecords: 1000,
            maxBatchSize: 512
        });

        this._mostRecentEnvironment = environment;

        this._batchHttpProtocol.on('capacity', _.bind(onCapacity, this));
    }

    MetricsTransmitter.prototype.isEnabled = function isEnabled() {
        return this._isEnabled;
    };

    MetricsTransmitter.prototype.setEnabled = function setEnabled(enabled) {
        assert.isBoolean(enabled, 'enabled');

        this._isEnabled = enabled;
    };

    MetricsTransmitter.prototype.submitMetric = function submit(metric, since, sessionId, streamId, version, value) {
        if (!this._isEnabled) {
            return;
        }

        assert.isStringNotEmpty(metric, 'metric');
        assert.isObject(value, 'value');

        this._mostRecentRuntime = since;
        this._mostRecentSessionId = sessionId;
        this._mostRecentStreamId = streamId;
        this._mostRecentVersion = version;

        addMetricToRecords.call(this, metric, value);
    };

    function addMetricToRecords(metric, value) {
        var record = _.assign({}, value, {
            metric: metric,
            timestamp: _.isoString(),
            sessionId: this._mostRecentSessionId,
            streamId: this._mostRecentStreamId,
            source: this._browser,
            fullQualifiedName: this._domain,
            environment: this._mostRecentEnvironment,
            version: this._mostRecentVersion,
            runtime: this._mostRecentRuntime
        });

        this._batchHttpProtocol.addRecord(record);
    }

    function onCapacity(deleteRecords) {
        this._batchHttpProtocol.addRecordToBeginning({
            metric: 'MetricDropped',
            value: {uint64: deleteRecords},
            timestamp: _.isoString(),
            sessionId: this._mostRecentSessionId,
            streamId: this._mostRecentStreamId,
            source: this._browser,
            fullQualifiedName: this._domain,
            environment: this._mostRecentEnvironment,
            version: this._mostRecentVersion,
            runtime: this._mostRecentRuntime
        });
    }

    return MetricsTransmitter;
});