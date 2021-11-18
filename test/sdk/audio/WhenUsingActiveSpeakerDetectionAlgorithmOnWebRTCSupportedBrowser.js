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
    'phenix-web-logging',
    'sdk/audio/AudioContext',
    'sdk/audio/AudioSpeakerDetectionAlgorithm',
    'sdk/audio/AudioVolumeMeter',
    'phenix-rtc',
    '../../../test/mock/HttpStubber'
], function(logging, AudioContext, AudioSpeakerDetectionAlgorithm, AudioVolumeMeter, rtc, HttpStubber) {
    describe('When Using Active Speaker Detection Algorithm on WebRTC Supported Browser', function() {
        var audioSpeakerDetectionAlgorithm;
        var httpStubber;

        beforeEach(function() {
            httpStubber = new HttpStubber();
            httpStubber.stub();
            audioSpeakerDetectionAlgorithm = new AudioSpeakerDetectionAlgorithm(sinon.createStubInstance(logging.Logger));
        });

        afterEach(function() {
            httpStubber.restore();
        });

        it('Has property onValue that is a function', function() {
            expect(audioSpeakerDetectionAlgorithm.onValue).to.be.a('function');
        });

        it('Has property startDetection that is a function', function() {
            expect(audioSpeakerDetectionAlgorithm.startDetection).to.be.a('function');
        });

        describe('When using WebRTC supported browsers', function() {
            before(function() {
                if (!rtc.webrtcSupported) {
                    this.skip();
                }
            });

            var audioVolumeMeter;
            var audioContext;

            beforeEach(function() {
                audioContext = (new AudioContext()).getNativeAudioContext();
                audioVolumeMeter = new AudioVolumeMeter(sinon.createStubInstance(logging.Logger));

                audioVolumeMeter.init(audioContext, 123);

                audioSpeakerDetectionAlgorithm.startDetection(audioVolumeMeter, {
                    silenceHysteresisInterval: 1,
                    speakingHysteresisInterval: 1
                });
            });

            afterEach(function() {
                audioContext.close();
            });

            it('Speaking buffer yields speaking state', function() {
                // ToDo (dcy) create speaking input buffer
                audioSpeakerDetectionAlgorithm.onValue = function(state) {
                    expect(state).to.be.equal('speaking');
                };

                var event = new Event('audioprocess');
                event.inputBuffer = createBrowserAudioBuffer(audioContext, true);

                audioVolumeMeter._scriptProcessor.dispatchEvent(event);
            });

            it('Non-Speaking buffer yields silence state', function() {
                var speakingEvent = new Event('audioprocess');
                speakingEvent.inputBuffer = createBrowserAudioBuffer(audioContext, true);

                audioVolumeMeter._scriptProcessor.dispatchEvent(speakingEvent);

                audioSpeakerDetectionAlgorithm.onValue = function(state) {
                    expect(state).to.be.equal('silence');
                };

                var silenceEvent = new Event('audioprocess');
                silenceEvent.inputBuffer = createBrowserAudioBuffer(audioContext, false);

                audioVolumeMeter._scriptProcessor.dispatchEvent(silenceEvent);
            });
        });
    });
});

function createBrowserAudioBuffer(audioContext, speaking) {
    var channels = 2;

    // Create an empty two second stereo buffer at the
    // sample rate of the AudioContext
    var frameCount = audioContext.sampleRate * 2.0;
    var myArrayBuffer = audioContext.createBuffer(channels, frameCount, audioContext.sampleRate);

    // Fill the buffer with white noise;
    // just random values between -1.0 and 1.0
    if (!speaking) {
        return myArrayBuffer;
    }

    for (var channel = 0; channel < channels; channel++) {
        // This gives us the actual array that contains the data
        var nowBuffering = myArrayBuffer.getChannelData(channel);
        for (var i = 0; i < frameCount; i++) {
            // Math.random() is in [0; 1.0]
            // audio needs to be in [-1.0; 1.0]
            nowBuffering[i] = Math.random() * 2 - 1;
        }
    }

    return myArrayBuffer;
}