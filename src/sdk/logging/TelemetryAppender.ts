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

define('',[
    'phenix-web-lodash-light',
    'phenix-web-assert',
    'phenix-rtc',
    'phenix-web-logging',
    'phenix-web-proto',
    '../protocol/telemetryProto.json'
], function(_, assert, rtc, logging, proto, telemetryProto) {
    var loggingUrl = '/logs';

    function TelemetryAppender(this: any, uri: string) {
        assert.isString(uri, 'uri');

        this._domain = typeof location === 'object' ? location.hostname : rtc.browser + '-' + rtc.browserVersion + '-unknown';
        this._minLevel = logging.level.TRACE;
        this._isEnabled = true;
        this._browser = (rtc.browser || 'Browser') + '/' + (rtc.browserVersion || '?');
        this._mostRecentRuntime = 0;
        this._batchHttpProtocol = new proto.BatchHttpProto(uri + loggingUrl, [telemetryProto], 'telemetry.StoreLogRecords', {
            maxAttempts: 3,
            maxBufferedRecords: 1000,
            maxBatchSize: 512
        });

        this._batchHttpProtocol.on('capacity', _.bind(onCapacity, this));
    }

    TelemetryAppender.prototype.setThreshold = function setThreshold(level: any) {
        assert.isNumber(level, 'level');

        this._minLevel = level;
    };

    TelemetryAppender.prototype.getThreshold = function getThreshold() {
        return this._minLevel;
    };

    TelemetryAppender.prototype.isEnabled = function isEnabled() {
        return this._isEnabled;
    };

    TelemetryAppender.prototype.setEnabled = function setEnabled(enabled: any) {
        assert.isBoolean(enabled, 'enabled');

        this._isEnabled = enabled;
    };

    TelemetryAppender.prototype.log = function log(since: any, level: any, category: any, messages: any, sessionId: any, userId: any, environment: any, version: any, context: { level: number; }) {
        if (context.level < this._minLevel || !this._isEnabled) {
            return;
        }

        assert.isArray(messages, 'messages');

        this._mostRecentRuntime = since;
        this._mostRecentSessionId = sessionId;
        this._mostRecentUserId = userId;
        this._mostRecentVersion = version;
        this._mostRecentEnvironment = environment;

        addMessagesToRecords.call(this, level, category, messages);
    };

    function addMessagesToRecords(this: any, level: any, category: any, messages: any[]) {
        this._batchHttpProtocol.addRecord({
            level: level,
            timestamp: _.isoString(),
            category: category,
            message: messages.join(' '),
            source: this._browser,
            fullQualifiedName: this._domain,
            sessionId: this._mostRecentSessionId,
            userId: this._mostRecentUserId,
            environment: this._mostRecentEnvironment,
            version: this._mostRecentVersion,
            runtime: this._mostRecentRuntime
        });
    }

    function onCapacity(this: any, deleteRecords: string) {
        this._batchHttpProtocol.addRecordToBeginning({
            level: 'Warn',
            timestamp: _.isoString(),
            category: 'websdk/telemetryLogger',
            message: 'Deleted ' + deleteRecords + ' records',
            source: this._browser,
            fullQualifiedName: this._domain,
            sessionId: this._mostRecentSessionId,
            userId: this._mostRecentUserId,
            environment: this._mostRecentEnvironment,
            version: this._mostRecentVersion,
            runtime: this._mostRecentRuntime
        });
    }

    return TelemetryAppender;
});