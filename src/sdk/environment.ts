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
    'phenix-web-lodash-light'
], function(_) {
    'use strict';

    var environment:any = {};

    environment.getEnvironmentFromUrl = function(uri: string | URL) {
        try {
            var baseURL = new URL(uri);

            return baseURL.origin;
        } catch (e) {
            return '';
        }
    };

    environment.parseEnvFromPcastBaseUri = function(uri: string) {
        uri = uri.toLowerCase();

        if (_.includes(uri, 'local')) {
            return 'local';
        } else if (_.includes(uri, 'stg')) {
            return 'staging';
        }

        return 'production';
    };

    environment.getTelemetryServerUri = function(baseUri: string | URL) {
        if (!baseUri) {
            return '';
        }

        try {
            var baseURL = new URL(baseUri);
            var segments = baseURL.hostname.split('.');

            if (segments.length === 2 ||
                (segments.length === 3 && segments[segments.length - 2].length <= 2 && segments[segments.length - 1].length <= 3)
            ) {
                segments.unshift('telemetry');
            } else if (_.startsWith(segments[0], 'stg-') || _.endsWith(segments[0], '-stg') || _.includes(segments[0], '-stg-') || segments[0] === 'stg') {
                segments[0] = 'telemetry-stg';
            } else if (_.startsWith(segments[0], 'local') || _.endsWith(segments[0], 'local')) {
                // Leave URL unchanged
            } else {
                segments[0] = 'telemetry';
            }

            baseURL.hostname = segments.join('.');

            switch (baseURL.protocol) {
            case 'ws:':
                baseURL.protocol = 'http:';

                break;
            case 'wss:':
                baseURL.protocol = 'https:';

                break;

            default:
                break;
            }

            return baseURL.origin + '/telemetry';
        } catch (e) {
            return baseUri;
        }
    };

    return environment;
});