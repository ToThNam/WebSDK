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
    'lodash',
    'sdk/environment'
], function(_, environment) {
    'use strict';

    describe('When resolving the telemetry URL', () => {
        describe('Given a pcast uri "https://local.test.com"', () => {
            it('resolves to telemetry URL "https://local.test.com/telemetry"', () => {
                const telemetryUrl = environment.getTelemetryServerUri('https://local.test.com');

                expect(telemetryUrl).eql('https://local.test.com/telemetry');
            });
        });

        describe('Given a pcast uri "https://local.test.com:9999"', () => {
            it('resolves to telemetry URL "https://local.test.com:9999/telemetry"', () => {
                const telemetryUrl = environment.getTelemetryServerUri('https://local.test.com:9999');

                expect(telemetryUrl).eql('https://local.test.com:9999/telemetry');
            });
        });

        describe('Given a pcast uri "https://local.test.com:9999/pcast/uri"', () => {
            it('resolves to telemetry URL "https://local.test.com:9999/telemetry"', () => {
                const telemetryUrl = environment.getTelemetryServerUri('https://local.test.com:9999/pcast/uri');

                expect(telemetryUrl).eql('https://local.test.com:9999/telemetry');
            });
        });

        describe('Given a pcast uri "https://pcast-stg.test.com"', () => {
            it('resolves to telemetry URL "https://telemetry-stg.test.com/telemetry"', () => {
                const telemetryUrl = environment.getTelemetryServerUri('https://pcast-stg.test.com');

                expect(telemetryUrl).eql('https://telemetry-stg.test.com/telemetry');
            });
        });

        describe('Given a pcast uri "https://stg.test.com"', () => {
            it('resolves to telemetry URL "https://telemetry-stg.test.com/telemetry"', () => {
                const telemetryUrl = environment.getTelemetryServerUri('https://stg.test.com');

                expect(telemetryUrl).eql('https://telemetry-stg.test.com/telemetry');
            });
        });

        describe('Given a pcast uri "https://stg-us.test.com"', () => {
            it('resolves to telemetry URL "https://telemetry-stg.test.com/telemetry"', () => {
                const telemetryUrl = environment.getTelemetryServerUri('https://stg-us.test.com');

                expect(telemetryUrl).eql('https://telemetry-stg.test.com/telemetry');
            });
        });

        describe('Given a pcast uri "https://pcast.test.com"', () => {
            it('resolves to telemetry URL "https://telemetry.test.com/telemetry"', () => {
                const telemetryUrl = environment.getTelemetryServerUri('https://pcast.test.com');

                expect(telemetryUrl).eql('https://telemetry.test.com/telemetry');
            });
        });

        describe('Given a pcast uri "https://xyz.test.com"', () => {
            it('resolves to telemetry URL "https://telemetry.test.com/telemetry"', () => {
                const telemetryUrl = environment.getTelemetryServerUri('https://xyz.test.com');

                expect(telemetryUrl).eql('https://telemetry.test.com/telemetry');
            });
        });

        describe('Given a pcast uri "https://xyz.test.co.uk"', () => {
            it('resolves to telemetry URL "https://telemetry.test.co.uk/telemetry"', () => {
                const telemetryUrl = environment.getTelemetryServerUri('https://xyz.test.co.uk');

                expect(telemetryUrl).eql('https://telemetry.test.co.uk/telemetry');
            });
        });

        describe('Given a pcast uri "https://test.co.uk"', () => {
            it('resolves to telemetry URL "https://telemetry.test.co.uk/telemetry"', () => {
                const telemetryUrl = environment.getTelemetryServerUri('https://test.co.uk');

                expect(telemetryUrl).eql('https://telemetry.test.co.uk/telemetry');
            });
        });

        describe('Given a pcast uri "https://xyz.xyz.test.com"', () => {
            it('resolves to telemetry URL "https://telemetry.xyz.test.com/telemetry"', () => {
                const telemetryUrl = environment.getTelemetryServerUri('https://xyz.xyz.test.com');

                expect(telemetryUrl).eql('https://telemetry.xyz.test.com/telemetry');
            });
        });

        describe('Given a pcast uri "https://xyz.xyz-stg.test.com"', () => {
            it('resolves to telemetry URL "https://telemetry.xyz-stg.test.com/telemetry"', () => {
                const telemetryUrl = environment.getTelemetryServerUri('https://xyz.xyz-stg.test.com');

                expect(telemetryUrl).eql('https://telemetry.xyz-stg.test.com/telemetry');
            });
        });

        describe('Given a pcast uri "https://www.test.com"', () => {
            it('resolves to telemetry URL "https://telemetry.test.com/telemetry"', () => {
                const telemetryUrl = environment.getTelemetryServerUri('https://www.test.com');

                expect(telemetryUrl).eql('https://telemetry.test.com/telemetry');
            });
        });

        describe('Given a pcast uri "https://test.com"', () => {
            it('resolves to telemetry URL "https://telemetry.test.com/telemetry"', () => {
                const telemetryUrl = environment.getTelemetryServerUri('https://test.com');

                expect(telemetryUrl).eql('https://telemetry.test.com/telemetry');
            });
        });

        describe('Given a pcast uri "https://local.phenixrts.com:8443"', () => {
            it('resolves to telemetry URL "https://local.phenixrts.com:8443/telemetry"', () => {
                const telemetryUrl = environment.getTelemetryServerUri('https://local.phenixrts.com:8443');

                expect(telemetryUrl).eql('https://local.phenixrts.com:8443/telemetry');
            });
        });

        describe('Given a pcast uri "https://local.rt.test.com:8443"', () => {
            it('resolves to telemetry URL "https://local.rt.test.com:8443/telemetry"', () => {
                const telemetryUrl = environment.getTelemetryServerUri('https://local.rt.test.com:8443');

                expect(telemetryUrl).eql('https://local.rt.test.com:8443/telemetry');
            });
        });

        describe('Given a pcast uri "wss://www.test.com"', () => {
            it('resolves to telemetry URL "wss://telemetry.test.com/telemetry"', () => {
                const telemetryUrl = environment.getTelemetryServerUri('wss://www.test.com');

                expect(telemetryUrl).eql('https://telemetry.test.com/telemetry');
            });
        });

        describe('Given a pcast uri "ws://www.test.com/ws"', () => {
            it('resolves to telemetry URL "http://telemetry.test.com/telemetry"', () => {
                const telemetryUrl = environment.getTelemetryServerUri('ws://www.test.com/ws');

                expect(telemetryUrl).eql('http://telemetry.test.com/telemetry');
            });
        });

        describe('Given a pcast uri "wss://local.rt.test.com:8443"', () => {
            it('resolves to telemetry URL "https://local.rt.test.com:8443/telemetry"', () => {
                const telemetryUrl = environment.getTelemetryServerUri('wss://local.rt.test.com:8443');

                expect(telemetryUrl).eql('https://local.rt.test.com:8443/telemetry');
            });
        });
    });
});