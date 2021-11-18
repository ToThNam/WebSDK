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
    'sdk/audio/AudioVolumeMeter',
    'phenix-rtc'
], function(logging, AudioContext, AudioVolumeMeter, rtc) {
    describe('When Measuring the Audio Volume Using WebRTC supported Browsers', function() {
        var audioVolumeMeter;

        beforeEach(function() {
            audioVolumeMeter = new AudioVolumeMeter(sinon.createStubInstance(logging.Logger));
        });

        it('Has property onValue that is a function', function() {
            expect(audioVolumeMeter.onValue).to.be.a('function');
        });

        it('Has property connect that is a function', function() {
            expect(audioVolumeMeter.connect).to.be.a('function');
        });

        it('Has property stop that is a function', function() {
            expect(audioVolumeMeter.stop).to.be.a('function');
        });

        describe('When using WebRTC supported browsers', function() {
            before(function() {
                if (!rtc.webrtcSupported) {
                    this.skip();
                }
            });

            var audioContext;

            beforeEach(function() {
                audioContext = (new AudioContext()).getNativeAudioContext();

                audioVolumeMeter.init(audioContext, 123);
            });

            afterEach(function() {
                audioContext.close();
            });

            it('Successfully connects mediaStream object with audio tracks', function() {
                var stream = new MediaStream();
                stream.getAudioTracks = function() {
                    return [{}];
                };

                sinon.stub(audioContext, "createMediaStreamSource").callsFake(function() {
                    return {connect: function() {}};
                });

                audioVolumeMeter.connect(stream);

                audioContext.createMediaStreamSource.called.should.be.true;
                audioContext.createMediaStreamSource.restore();
            });

            it('Does not connect mediaStream object with no audio tracks', function() {
                var stream = new MediaStream();
                stream.getAudioTracks = function() {
                    return [];
                };

                sinon.stub(audioContext, "createMediaStreamSource").callsFake(function() {
                    return {connect: function() {}};
                });

                audioVolumeMeter.connect(stream);

                audioContext.createMediaStreamSource.called.should.be.false;
                audioContext.createMediaStreamSource.restore();
            });

            it('Stop results in scriptProcessor disconnect', function() {
                sinon.spy(audioVolumeMeter._scriptProcessor, "disconnect");

                audioVolumeMeter.stop();

                audioVolumeMeter._scriptProcessor.disconnect.called.should.be.true;
                audioVolumeMeter._scriptProcessor.disconnect.restore();
            });

            it('Properly handles Audio Process event', function() {
                var event = new Event('audioprocess');
                event.inputBuffer = createBrowserAudioBuffer(audioContext);

                audioVolumeMeter.onValue(function(event) {
                    expect(event.date).to.be.a('number');
                    expect(event.value).to.be.a('number');
                    expect(event.smoothedValue).to.be.a('number');
                    expect(event.smoothedPeakValue).to.be.a('number');
                    expect(event.clipped).to.be.a('number');
                });

                audioVolumeMeter._scriptProcessor.dispatchEvent(event);
            });
        });
    });
});

function createBrowserAudioBuffer(audioContext) {
    var channels = 2;

    // Create an empty two second stereo buffer at the
    // sample rate of the AudioContext
    var frameCount = audioContext.sampleRate * 2.0;
    var myArrayBuffer = audioContext.createBuffer(channels, frameCount, audioContext.sampleRate);

    // Fill the buffer with white noise;
    // just random values between -1.0 and 1.0
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