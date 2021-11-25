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
    '../environment',
    './MetricsTransmitter'
], function(_, assert, environment, MetricsTransmitter) {
    function MetricsTransmitterFactory() {
        this._metricsTransmitters = {};
    }

    MetricsTransmitterFactory.prototype.createMetricsTransmitter = function createMetricsTransmitter(pcastBaseUri: string) {
        var env = environment.getEnvironmentFromUrl(pcastBaseUri || '');

        var telemetryServerUrl = environment.getTelemetryServerUri(pcastBaseUri);

        if (!this._metricsTransmitters[env]) {
            this._metricsTransmitters[env] = createNewTransmitter.call(this, telemetryServerUrl, env);
        }

        return this._metricsTransmitters[env];
    };

    function createNewTransmitter(uri: string, env: any) {
        var transmitter = new MetricsTransmitter(uri, env);

        if (!uri) {
            transmitter.setEnabled(false);
        }

        return transmitter;
    }

    return new (MetricsTransmitterFactory as any) ();
});