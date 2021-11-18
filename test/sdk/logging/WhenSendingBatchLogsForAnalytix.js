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
    'sdk/logging/TelemetryAppender',
    'phenix-web-logging'
], function(TelemetryAppender, logging) {
    describe('When Sending Batch Logs For Telemetry', function() {
        var requests;
        var telemetryAppender;

        var sessionId = 'mockSessionId';

        beforeEach(function() {
            this.xhr = sinon.useFakeXMLHttpRequest();

            requests = [];

            this.xhr.onCreate = function(req) {
                requests.push(req);
            };

            telemetryAppender = new TelemetryAppender('https://telemetry.phenixrts.com');
        });

        afterEach(function() {
            this.xhr.restore();

            telemetryAppender.setEnabled(false);
        });

        it('has property log that is a function', function() {
            expect(telemetryAppender.log).to.be.a('function');
        });

        it('has property setThreshold that is a function', function() {
            expect(telemetryAppender.setThreshold).to.be.a('function');
        });

        it('has property getThreshold that is a function', function() {
            expect(telemetryAppender.getThreshold).to.be.a('function');
        });

        it('expects logging without enabled does not trigger http request', function() {
            telemetryAppender.setEnabled(false);
            telemetryAppender.log(0, 'Trace', '', ['Message'], sessionId, '', '', '', {level: logging.level.TRACE});

            expect(requests[0]).to.not.be.ok;
        });

        it('expects logging does trigger http request', function() {
            telemetryAppender.log(0, 'Trace', '', ['Message'], sessionId, '', '', '', {level: logging.level.TRACE});

            expect(requests[0]).to.be.ok;
        });

        it('expects threshold to be set when setThreshold is passed a log level', function() {
            telemetryAppender.setThreshold(logging.level.WARN);

            expect(telemetryAppender.getThreshold()).to.be.equal(logging.level.WARN);
        });

        it('expects log of warn to be logged when threshold is warn', function() {
            telemetryAppender.setThreshold(logging.level.WARN);
            telemetryAppender._records = [];

            telemetryAppender.log(0, 'Trace', '', ['Message'], sessionId, '', '', '', {level: logging.level.TRACE});
            telemetryAppender.log(0, 'Debug', '', ['Message'], sessionId, '', '', '', {level: logging.level.DEBUG});
            telemetryAppender.log(0, 'Info', '', ['Message'], sessionId, '', '', '', {level: logging.level.INFO});
            expect(requests.length).to.be.equal(0);

            telemetryAppender.log(0, 'Warn', '', ['Message'], sessionId, '', '', '', {level: logging.level.WARN});
            expect(requests.length).to.be.equal(1);
        });

        it('expects log of error to be logged when threshold is warn', function() {
            telemetryAppender.setThreshold(logging.level.WARN);
            telemetryAppender._records = [];

            telemetryAppender.log(0, 'Trace', '', ['Message'], sessionId, '', '', '', {level: logging.level.TRACE});
            telemetryAppender.log(0, 'Debug', '', ['Message'], sessionId, '', '', '', {level: logging.level.DEBUG});
            telemetryAppender.log(0, 'Info', '', ['Message'], sessionId, '', '', '', {level: logging.level.INFO});
            expect(requests.length).to.be.equal(0);

            telemetryAppender.log(0, 'Error', '', ['Message'], sessionId, '', '', '', {level: logging.level.ERROR});
            expect(requests.length).to.be.equal(1);
        });

        it('expects log of fatal to be logged when threshold is warn', function() {
            telemetryAppender.setThreshold(logging.level.WARN);
            telemetryAppender._records = [];

            telemetryAppender.log(0, 'Trace', '', ['Message'], sessionId, '', '', '', {level: logging.level.TRACE});
            telemetryAppender.log(0, 'Debug', '', ['Message'], sessionId, '', '', '', {level: logging.level.DEBUG});
            telemetryAppender.log(0, 'Info', '', ['Message'], sessionId, '', '', '', {level: logging.level.INFO});
            expect(requests.length).to.be.equal(0);

            telemetryAppender.log(0, 'Fatal', '', ['Message'], sessionId, '', '', '', {level: logging.level.FATAL});
            expect(requests.length).to.be.equal(1);
        });
    });
});