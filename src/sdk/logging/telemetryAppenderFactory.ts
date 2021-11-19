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
    '../environment',
    './TelemetryAppender'
], function(_, assert, environment, TelemetryAppender) {
    function TelemetryAppenderFactory(this: any) {
        this._telemetryAppenders = {};
    }

    TelemetryAppenderFactory.prototype.getAppender = function getAppender(pcastBaseUri: string) {
        var env = environment.getEnvironmentFromUrl(pcastBaseUri || '');
        var telemetryServerUrl = environment.getTelemetryServerUri(pcastBaseUri);

        if (!this._telemetryAppenders[env]) {
            this._telemetryAppenders[env] = createNewAppender.call(this, telemetryServerUrl);
        }

        return this._telemetryAppenders[env];
    };

    function createNewAppender(uri: string) {
        var appender = new TelemetryAppender(uri);

        if (!uri) {
            appender.setEnabled(false);
        }

        return appender;
    }

    return new (TelemetryAppenderFactory as any)();
});