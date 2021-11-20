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

import { Adjuster_ClosePublisherAdjusters, Options_BandwidthMonitor } from "../../../typescript/src/bandwidth/BandwidthMonitor";

define('',[
    'phenix-web-lodash-light',
    'phenix-web-assert',
    '../logging/pcastLoggerFactory',
    '../PCastEndPoint',
    './PublisherBandwidthAdjuster'
], function(_, assert, pcastLoggerFactory, PCastEndPoint, PublisherBandwidthAdjuster) {
    'use strict';

    function BandwidthMonitor(this: any, publishers: any[], options: Options_BandwidthMonitor) {
        assert.isArray(publishers, 'userMediaStreams');

        options = options || {};

        this._baseUri = options.uri || PCastEndPoint.DefaultPCastUri;
        this._logger = options.logger || pcastLoggerFactory.createPCastLogger(this._baseUri);
        this._publisherAdjusters = [];
        this._publishers = publishers;
    }

    BandwidthMonitor.prototype.start = function start(roomService: void, options: {}) {
        options = options || {};

        _.forEach(this._publishers, _.bind(setupPublisherAdjusters, this, roomService, options));
    };

    BandwidthMonitor.prototype.stop = function stop() {
        _.forEach(this._publisherAdjusters, function closePublisherAdjusters(adjuster: Adjuster_ClosePublisherAdjusters) {
            adjuster.close();
        });

        this._publisherAdjusters = [];
    };

    BandwidthMonitor.prototype.toString = function toString() {
        return 'BandwidthMonitor';
    };

    function setupPublisherAdjusters(this: any, roomService: object, options: any, publisher: any[]) {
        var publisherAdjuster = new PublisherBandwidthAdjuster(publisher);

        publisherAdjuster.connect(roomService, options);

        this._publisherAdjusters.push(publisherAdjuster);
    }

    return BandwidthMonitor;
});