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
    'phenix-web-logging',
    '../environment',
    './telemetryAppenderFactory'
], function(_, assert, logging, environment, telemetryAppenderFactory) {
    'use strict';

    function PCastLoggerFactory() {

    }

    PCastLoggerFactory.prototype.createPCastLogger = function createPCastLogger(baseUri, disableConsole, loggingLevel) {
        if (baseUri) {
            assert.isStringNotEmpty(baseUri, 'baseUri');
        }

        var logger = new logging.Logger();
        var env = environment.getEnvironmentFromUrl(baseUri);
        var telemetryAppender = telemetryAppenderFactory.getAppender(baseUri);

        logger.setEnvironment(env);

        if (loggingLevel) {
            telemetryAppender.setThreshold(loggingLevel);
        } else {
            telemetryAppender.setThreshold(logging.level.INFO);
        }

        if (!disableConsole) {
            logger.addAppender(new logging.ConsoleAppender());
        }

        logger.addAppender(telemetryAppender);

        logger.isPCastLogger = true;

        return logger;
    };

    return new PCastLoggerFactory();
});