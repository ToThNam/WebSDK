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
    'phenix-web-event',
    'phenix-web-disposable',
    'phenix-rtc'
], function(_, assert, event, disposable, rtc) {
    function NetworkMonitor(logger) {
        assert.isObject(logger, 'logger');

        this._logger = logger;
        this._namedEvents = new event.NamedEvents();
        this._disposables = new disposable.DisposableList();

        this._disposables.add(this._namedEvents);

        if (!this.isSupported()) {
            return this._logger.info('Network monitor is not supported.');
        }

        this._lastNetworkStats = getStats.call(this);

        detectNetworkTypeChange.call(this);
    }

    NetworkMonitor.prototype.isSupported = function() {
        return rtc.global.navigator && rtc.global.navigator.connection;
    };

    NetworkMonitor.prototype.getDownlinkThroughputCapacity = function() {
        if (!this.isSupported()) {
            return -1;
        }

        return rtc.global.navigator.connection.downlink || rtc.global.navigator.connection.downlinkMax;
    };

    NetworkMonitor.prototype.getEffectiveType = function() {
        if (!this.isSupported()) {
            return 'Unknown';
        }

        return rtc.global.navigator.connection.effectiveType || rtc.global.navigator.connection.type;
    };

    NetworkMonitor.prototype.getRoundTripTime = function() {
        if (!this.isSupported()) {
            return -1;
        }

        return rtc.global.navigator.connection.rtt || rtc.global.navigator.connection.type;
    };

    NetworkMonitor.prototype.onNetworkChange = function(callback) {
        if (!this.isSupported()) {
            return;
        }

        assert.isFunction(callback, 'callback');

        return this._namedEvents.listen('NetworkChange', callback);
    };

    NetworkMonitor.prototype.dispose = function() {
        this._disposables.dispose();
    };

    function getStats() {
        return {
            downlinkThroughputCapacity: this.getDownlinkThroughputCapacity(),
            effectiveType: this.getEffectiveType(),
            rtt: this.getRoundTripTime()
        };
    }

    function detectNetworkTypeChange() {
        var that = this;

        navigator.connection.addEventListener('change', function() {
            that._namedEvents.fireAsync('NetworkChange', [getStats.call(that), that._lastNetworkStats]);

            that._lastNetworkStats = getStats.call(that);
        });
    }

    return NetworkMonitor;
});