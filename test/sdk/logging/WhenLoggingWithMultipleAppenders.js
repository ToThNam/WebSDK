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
    'sdk/logging/telemetryAppenderFactory',
    'phenix-web-logging'
], function(telemetryAppenderFactory, logging) {
    describe('When Logging With Multiple Appenders', function() {
        var logger;
        var consoleAppender = new logging.ConsoleAppender();
        var telemetryAppender = telemetryAppenderFactory.getAppender();

        beforeEach(function() {
            logger = new logging.Logger();
        });

        it('Has property trace that is a function', function() {
            expect(logger.trace).to.be.a('function');
        });

        it('Has property debug that is a function', function() {
            expect(logger.debug).to.be.a('function');
        });

        it('Has property info that is a function', function() {
            expect(logger.info).to.be.a('function');
        });

        it('Has property warn that is a function', function() {
            expect(logger.warn).to.be.a('function');
        });

        it('Has property error that is a function', function() {
            expect(logger.error).to.be.a('function');
        });

        it('Has property fatal that is a function', function() {
            expect(logger.fatal).to.be.a('function');
        });

        describe('When logger has both telemetry and console appenders', function() {
            var telemetryAppenderStub;
            var consoleAppenderStub;

            beforeEach(function() {
                telemetryAppenderStub = sinon.stub(telemetryAppender, 'log'); // Disable requests to external source
                consoleAppenderStub = sinon.stub(consoleAppender, 'log');
                logger = new logging.Logger();

                logger.addAppender(telemetryAppender);
                logger.addAppender(consoleAppender);
            });

            afterEach(function() {
                telemetryAppenderStub.restore();
                consoleAppenderStub.restore();
            });

            it('Expect Trace to trigger console logger and not telemetry logger', function() {
                logger.trace('Trace Message');

                sinon.assert.calledOnce(telemetryAppenderStub);
                sinon.assert.calledOnce(consoleAppenderStub);
            });

            it('Expect Debug to trigger console logger and not telemetry logger', function() {
                logger.debug('Debug Message');

                sinon.assert.calledOnce(telemetryAppenderStub);
                sinon.assert.calledOnce(consoleAppenderStub);
            });

            it('Expect Info to trigger telemetry and console loggers', function() {
                logger.info('Info Message');

                sinon.assert.calledOnce(telemetryAppenderStub);
                sinon.assert.calledOnce(consoleAppenderStub);
            });

            it('Expect Warn to trigger telemetry and console loggers', function() {
                logger.warn('Warn Message');

                sinon.assert.calledOnce(telemetryAppenderStub);
                sinon.assert.calledOnce(consoleAppenderStub);
            });

            it('Expect Error to trigger telemetry and console loggers', function() {
                logger.error('Error Message');

                sinon.assert.calledOnce(telemetryAppenderStub);
                sinon.assert.calledOnce(consoleAppenderStub);
            });

            it('Expect Fatal to trigger telemetry and console loggers', function() {
                logger.fatal('Fatal Message');

                sinon.assert.calledOnce(telemetryAppenderStub);
                sinon.assert.calledOnce(consoleAppenderStub);
            });
        });
    });
});