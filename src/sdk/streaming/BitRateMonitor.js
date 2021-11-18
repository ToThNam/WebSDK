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
    'phenix-web-assert'
], function(_, assert) {
    'use strict';

    var maximumBitRateDefault = 3; // 3 x target bitrate

    function BitRateMonitor(name, monitor, getLimit) {
        assert.isStringNotEmpty(name, 'name');
        assert.isObject(monitor, 'monitor');
        assert.isFunction(getLimit, 'getLimit');

        this._name = name;
        this._monitor = monitor;
        this._getLimit = getLimit || _.noop;
    }

    BitRateMonitor.prototype.addThreshold = function(threshold, callback) {
        var thresholds = getThresholdList(threshold);
        var lastThresholdIndex = null;
        var that = this;

        return that._monitor.on('calculatedmetrics', function(metrics) {
            var limit = that._getLimit();
            var totalBitRate = metrics.videoBitRate + metrics.audioBitRate;
            var currentClosestThresholdIndex = getClosestThresholdIndexToButNotBelow(thresholds, totalBitRate / limit);
            var currentRatioThreshold = _.get(thresholds, [currentClosestThresholdIndex]);
            var currentBitRateThreshold = currentRatioThreshold * limit;
            var lastRatioThreshold = _.get(thresholds, [lastThresholdIndex], 1);
            var lastBitRateThreshold = lastRatioThreshold * limit;

            if (limit === 0) {
                return;
            }

            if (lastThresholdIndex === null) {
                return lastThresholdIndex = currentClosestThresholdIndex;
            }

            if (currentClosestThresholdIndex === lastThresholdIndex) {
                return;
            }

            if (currentClosestThresholdIndex < lastThresholdIndex) {
                callback({
                    isIncreasing: false,
                    bitRate: totalBitRate,
                    currentThreshold: currentBitRateThreshold,
                    targetBitRate: limit,
                    index: currentClosestThresholdIndex,
                    lastIndex: lastThresholdIndex,
                    message: that._name + ' bit rate is below ' + currentRatioThreshold + ' * ' + limit + ' threshold of ' + currentBitRateThreshold + ' with a bit rate of ' + totalBitRate
                });
            } else if (currentClosestThresholdIndex > lastThresholdIndex) {
                callback({
                    isIncreasing: true,
                    bitRate: totalBitRate,
                    currentThreshold: lastBitRateThreshold,
                    targetBitRate: limit,
                    index: currentClosestThresholdIndex,
                    lastIndex: lastThresholdIndex,
                    message: that._name + ' bit rate is above ' + lastRatioThreshold + ' * ' + limit + ' threshold of ' + lastBitRateThreshold + ' with a bit rate of ' + totalBitRate
                });
            }

            lastThresholdIndex = currentClosestThresholdIndex;
        });
    };

    function getClosestThresholdIndexToButNotBelow(thresholds, ratio) {
        return _.reduce(thresholds, function(closestIndex, threshold, index) {
            if (closestIndex === null && threshold >= ratio) {
                return index;
            }

            if (threshold < thresholds[closestIndex] && threshold >= ratio) {
                return index;
            }

            return closestIndex;
        }, null);
    }

    function getThresholdList(threshold) {
        var thresholds = [];

        if (_.isArray(threshold)) {
            _.forEach(threshold, function(value) {
                assert.isNumber(value, 'threshold');
            });

            thresholds = threshold.sort();
        } else if (_.isObject(threshold)) {
            assert.isNumber(threshold.levels, 'threshold.levels');

            for (var i = 0; i < threshold.levels; i++) {
                thresholds.push(i / threshold.levels);
            }
        } else {
            assert.isNumber(threshold, 'threshold');

            thresholds.push(threshold);
        }

        thresholds.push(maximumBitRateDefault); // Upper bound

        return thresholds;
    }

    return BitRateMonitor;
});