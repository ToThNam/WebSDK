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

    describe('When resolving the environment', () => {
        describe('Given a invalid uri', () => {
            it('resolves to ""', () => {
                const parsedEnvironment = environment.getEnvironmentFromUrl('');

                expect(parsedEnvironment).to.equal('');
            });
        });

        describe('Given a "https://local.test.com" as pcast uri', () => {
            it('resolves to "https://local.test.com"', () => {
                const parsedEnvironment = environment.getEnvironmentFromUrl('https://local.test.com');

                expect(parsedEnvironment).to.equal('https://local.test.com');
            });
        });

        describe('Given a "https://local.test.com/pcast/uri" as pcast uri', () => {
            it('resolves to "https://local.test.com"', () => {
                const parsedEnvironment = environment.getEnvironmentFromUrl('https://local.test.com/pcast/uri');

                expect(parsedEnvironment).to.equal('https://local.test.com');
            });
        });

        describe('Given a "https://pcast-stg.test.com" as pcast uri', () => {
            it('resolves to "https://pcast-stg.test.com"', () => {
                const parsedEnvironment = environment.getEnvironmentFromUrl('https://pcast-stg.test.com');

                expect(parsedEnvironment).to.equal('https://pcast-stg.test.com');
            });
        });

        describe('Given a "https://stg.test.com" as pcast uri', () => {
            it('resolves to "https://stg.test.com"', () => {
                const parsedEnvironment = environment.getEnvironmentFromUrl('https://stg.test.com');

                expect(parsedEnvironment).to.equal('https://stg.test.com');
            });
        });

        describe('Given a "https://stg-us.test.com" as pcast uri', () => {
            it('resolves to "https://stg-us.test.com"', () => {
                const parsedEnvironment = environment.getEnvironmentFromUrl('https://stg-us.test.com');

                expect(parsedEnvironment).to.equal('https://stg-us.test.com');
            });
        });

        describe('Given a "https://pcast.test.com" as pcast uri', () => {
            it('resolves to "https://pcast.test.com"', () => {
                const parsedEnvironment = environment.getEnvironmentFromUrl('https://pcast.test.com');

                expect(parsedEnvironment).to.equal('https://pcast.test.com');
            });
        });

        describe('Given a "https://xyz.test.com" as pcast uri', () => {
            it('resolves to "https://xyz.test.com"', () => {
                const parsedEnvironment = environment.getEnvironmentFromUrl('https://xyz.test.com');

                expect(parsedEnvironment).to.equal('https://xyz.test.com');
            });
        });

        describe('Given a "https://xyz.test.co.uk" as pcast uri', () => {
            it('resolves to "https://xyz.test.co.uk"', () => {
                const parsedEnvironment = environment.getEnvironmentFromUrl('https://xyz.test.co.uk');

                expect(parsedEnvironment).to.equal('https://xyz.test.co.uk');
            });
        });

        describe('Given a "https://test.co.uk" as pcast uri', () => {
            it('resolves to "https://test.co.uk"', () => {
                const parsedEnvironment = environment.getEnvironmentFromUrl('https://test.co.uk');

                expect(parsedEnvironment).to.equal('https://test.co.uk');
            });
        });

        describe('Given a "https://xyz.xyz.test.com" as pcast uri', () => {
            it('resolves to "https://xyz.xyz.test.com"', () => {
                const parsedEnvironment = environment.getEnvironmentFromUrl('https://xyz.xyz.test.com');

                expect(parsedEnvironment).to.equal('https://xyz.xyz.test.com');
            });
        });

        describe('Given a "https://xyz.xyz-stg.test.com" as pcast uri', () => {
            it('resolves to "https://xyz.xyz-stg.test.com"', () => {
                const parsedEnvironment = environment.getEnvironmentFromUrl('https://xyz.xyz-stg.test.com');

                expect(parsedEnvironment).to.equal('https://xyz.xyz-stg.test.com');
            });
        });

        describe('Given a "https://www.test.com" as pcast uri', () => {
            it('resolves to "https://www.test.com"', () => {
                const parsedEnvironment = environment.getEnvironmentFromUrl('https://www.test.com');

                expect(parsedEnvironment).to.equal('https://www.test.com');
            });
        });

        describe('Given a "https://test.com" as pcast uri', () => {
            it('resolves to "https://test.com"', () => {
                const parsedEnvironment = environment.getEnvironmentFromUrl('https://test.com');

                expect(parsedEnvironment).to.equal('https://test.com');
            });
        });

        describe('Given a "https://local.phenixrts.com:8443" as pcast uri', () => {
            it('resolves to "https://local.phenixrts.com:8443"', () => {
                const parsedEnvironment = environment.getEnvironmentFromUrl('https://local.phenixrts.com:8443');

                expect(parsedEnvironment).to.equal('https://local.phenixrts.com:8443');
            });
        });

        describe('Given a "https://local.rt.test.com:8443" as pcast uri', () => {
            it('resolves to "https://local.rt.test.com:8443"', () => {
                const parsedEnvironment = environment.getEnvironmentFromUrl('https://local.rt.test.com:8443');

                expect(parsedEnvironment).to.equal('https://local.rt.test.com:8443');
            });
        });

        describe('Given a "wss://www.test.com/ws" as pcast uri', () => {
            it('resolves to "wss://www.test.com"', () => {
                const parsedEnvironment = environment.getEnvironmentFromUrl('wss://www.test.com/ws');

                expect(parsedEnvironment).to.equal('wss://www.test.com');
            });
        });

        describe('Given a "ws://www.test.com/ws" as pcast uri', () => {
            it('resolves to "ws://www.test.com/ws"', () => {
                const parsedEnvironment = environment.getEnvironmentFromUrl('ws://www.test.com/ws');

                expect(parsedEnvironment).to.equal('ws://www.test.com');
            });
        });

        describe('Given a "wss://local.rt.test.com:8443" as pcast uri', () => {
            it('resolves to "wss://local.rt.test.com:8443"', () => {
                const parsedEnvironment = environment.getEnvironmentFromUrl('wss://local.rt.test.com:8443');

                expect(parsedEnvironment).to.equal('wss://local.rt.test.com:8443');
            });
        });
    });
});