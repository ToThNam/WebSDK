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
    'phenix-web-logging',
    'sdk/logging/pcastLoggerFactory',
    'sdk/logging/TelemetryAppender'
], function(_, logging, pcastLoggerFactory, TelemetryAppender) {
    describe('When Instantiating A PCast Logger', function() {
        var logger;

        beforeEach(function() {
            logger = pcastLoggerFactory.createPCastLogger('stg');
        });

        it('Has property isPCastLogger that is equal to true', function() {
            expect(logger.isPCastLogger).to.be.equal(true);
        });

        it('Expect telemetry appender to have threshold of Info', function() {
            var telemetryAppender = getTelemetryAppender(logger);

            expect(telemetryAppender.getThreshold()).to.be.equal(logging.level.INFO);
        });

        it('Expect console appender to have threshold of Trace', function() {
            var consoleAppender = getConsoleAppender(logger);

            expect(consoleAppender.getThreshold()).to.be.equal(logging.level.TRACE);
        });

        function getTelemetryAppender(logger) {
            return _.find(logger.getAppenders(), function(appender) {
                return appender instanceof TelemetryAppender;
            });
        }

        function getConsoleAppender(logger) {
            return _.find(logger.getAppenders(), function(appender) {
                return appender instanceof logging.ConsoleAppender;
            });
        }
    });
});