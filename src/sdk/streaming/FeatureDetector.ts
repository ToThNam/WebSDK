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
    'phenix-rtc',
    'phenix-web-global',
    './PhenixLiveStream',
    './stream.json'
], function(_, assert, rtc, global, PhenixLiveStream, streamEnums) {
    'use strict';

    var defaultFeatures = [
        streamEnums.types.realTime.name,
        streamEnums.types.dash.name,
        streamEnums.types.hls.name
    ];

    function FeatureDetector( features: any) {
        features = features || defaultFeatures;

        assert.isArray(features, 'features');

        _.forEach(features, function(feature: any, index: any) {
            assert.isValidType(feature, streamEnums.types, 'FeatureType[' + index + ']');
        });

        this._features = _.map(features, _.bind(_.getEnumName, _, streamEnums.types));
    }

    FeatureDetector.isFeatureSupported = function(feature: string) {
        if (feature) {
            assert.isStringNotEmpty(feature, 'feature');
        }

        var featureName = _.getEnumName(streamEnums.types, feature);

        switch (featureName) {
        case streamEnums.types.realTime.name:
            return rtc.webrtcSupported;
        case streamEnums.types.dash.name:
        case streamEnums.types.hls.name:
        case streamEnums.types.rtmp.name:
            return PhenixLiveStream.canPlaybackType(feature);
        default:
            return false;
        }
    };

    FeatureDetector.mapFeatureToPCastCapability = function(feature: string) {
        if (feature) {
            assert.isStringNotEmpty(feature, 'feature');
        }

        var featureName = _.getEnumName(streamEnums.types, feature);

        switch (featureName) {
        case streamEnums.types.realTime.name:
            return 'real-time';
        case streamEnums.types.dash.name:
        case streamEnums.types.hls.name:
            return 'streaming';
        case streamEnums.types.rtmp.name:
            return 'rtmp';
        default:
            return '';
        }
    };

    FeatureDetector.mapPCastCapabilitiesToFeatures = function(capabilities: any) {
        assert.isArray(capabilities, 'capabilities');

        return _.reduce(capabilities, function(features: any, capability: any) {
            return features.concat(FeatureDetector.mapPCastCapabilityToFeatures(capability));
        }, []);
    };

    FeatureDetector.mapPCastCapabilityToFeatures = function(capability: string) {
        if (capability) {
            assert.isStringNotEmpty(capability, 'capability');
        }

        if (capability === 'real-time') {
            return [streamEnums.types.realTime.name];
        }

        if (capability === 'streaming') {
            return [streamEnums.types.dash.name, streamEnums.types.dash.name];
        }

        if (capability === 'rtmp') {
            return [streamEnums.types.rtmp.name];
        }

        return [];
    };

    FeatureDetector.prototype.getFeatures = function() {
        return this._features;
    };

    FeatureDetector.prototype.getFeaturePCastCapabilities = function() {
        var capabilities = _.map(this._features, FeatureDetector.mapFeatureToPCastCapability);

        return _.reduce(capabilities, removeDuplicates, []);
    };

    FeatureDetector.prototype.getPreferredFeatureFromPublisherCapabilities = function(capabilities: any, excludeRealTime: any) {
        assert.isArray(capabilities, 'capabilities');

        var preferredFeature = _.reduce(this._features, function(candidateFeature: any, feature: string) {
            var featureCapability = FeatureDetector.mapFeatureToPCastCapability(feature);
            var isFeatureAvailableAndCanPlayBack = FeatureDetector.isFeatureSupported(feature) && (_.includes(capabilities, featureCapability) || (feature === 'real-time' && !excludeRealTime));
            var nextFeature = isFeatureAvailableAndCanPlayBack ? feature : null;

            return candidateFeature || nextFeature;
        }, null);

        if (preferredFeature === streamEnums.types.dash.name && FeatureDetector.shouldUseNativeHls && _.includes(capabilities, FeatureDetector.mapFeatureToPCastCapability(streamEnums.types.hls.name)) && _.includes(this._features, streamEnums.types.hls.name)) {
            preferredFeature = streamEnums.types.hls.name;
        } else if (preferredFeature === streamEnums.types.hls.name && !FeatureDetector.shouldUseNativeHls && _.includes(capabilities, FeatureDetector.mapFeatureToPCastCapability(streamEnums.types.dash.name)) && _.includes(this._features, streamEnums.types.dash.name)) {
            preferredFeature = streamEnums.types.dash.name;
        }

        return preferredFeature;
    };

    FeatureDetector.shouldUseNativeHls = isIOS() || rtc.browser === 'Safari' || isSamsungBrowser();
    FeatureDetector.isIOS = isIOS;
    FeatureDetector.isSamsungBrowser = isSamsungBrowser;
    FeatureDetector.isAndroid = isAndroid;
    FeatureDetector.isMobile = isMobile;
    FeatureDetector.getIOSVersion = getIOSVersion;

    function isIOS() {
        var userAgent = _.get(global, ['navigator', 'userAgent'], '');

        return /iPad|iPhone|iPod/.test(userAgent) && !global.MSStream;
    }

    function isSamsungBrowser() {
        var userAgent = _.get(global, ['navigator', 'userAgent'], '');

        return /SamsungBrowser/.test(userAgent);
    }

    function isAndroid() {
        var userAgent = _.get(global, ['navigator', 'userAgent'], '');

        return /(android)/i.test(userAgent);
    }

    function isMobile() {
        var userAgent = _.get(global, ['navigator', 'userAgent'], '');

        return isIOS() || /Android|webOS|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i.test(userAgent);
    }

    function getIOSVersion() {
        var userAgent = _.get(global, ['navigator', 'userAgent'], '');

        if (/iP(hone|od|ad)/.test(userAgent)) {
            var version = userAgent.match(/.*OS (\d+)_(\d+)_?(\d+)? like Mac OS X/);

            return {
                major: parseInt(_.get(version, [1], 0), 10),
                minor: parseInt(_.get(version, [2], 0), 10),
                patch: parseInt(_.get(version, [3], 0), 10)
            };
        }
    }

    function removeDuplicates(list: any, item: any) {
        if (!_.includes(list, item)) {
            list.push(item);
        }

        return list;
    }

    return FeatureDetector;
});