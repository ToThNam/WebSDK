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
    'phenix-rtc'
], function(_, phenixRTC) {
    function UserMediaStubber() {
        phenixRTC.getUserMedia = phenixRTC.getUserMedia || _.noop;
    }

    UserMediaStubber.prototype.stub = function(callback) {
        sinon.stub(phenixRTC, 'getUserMedia').callsFake(function(constraints, success) {
            callback(constraints);
            success(UserMediaStubber.getMockMediaStream());
        });
    };

    UserMediaStubber.prototype.stubResolutionError = function(callback) {
        sinon.stub(phenixRTC, 'getUserMedia').callsFake(function(constraints, success, error) {
            callback(constraints);

            var constraintError = new Error('OverconstrainedError');

            constraintError.name = 'OverconstrainedError';
            constraintError.constraint = 'width';

            error(constraintError);
        });
    };

    UserMediaStubber.prototype.stubFrameRateError = function(callback) {
        sinon.stub(phenixRTC, 'getUserMedia').callsFake(function(constraints, success, error) {
            callback(constraints);

            var constraintError = new Error('OverconstrainedError');

            constraintError.name = 'OverconstrainedError';
            constraintError.constraint = 'frameRate';

            error(constraintError);
        });
    };

    UserMediaStubber.prototype.stubCriticalError = function(callback) {
        sinon.stub(phenixRTC, 'getUserMedia').callsFake(function(constraints, success, error) {
            callback(constraints);

            var constraintError = new Error('Critical');

            constraintError.name = 'Critical';

            error(constraintError);
        });
    };

    UserMediaStubber.prototype.restore = function() {
        phenixRTC.getUserMedia.restore();
    };

    UserMediaStubber.getMockMediaStream = function() {
        return window.MediaStream ? new window.MediaStream() : {
            id: 'MockStreamId',
            getTracks: function() {
                return [];
            },
            getAudioTracks: function() {
                return [];
            },
            getVideoTracks: function() {
                return [];
            }
        };
    };

    return UserMediaStubber;
});