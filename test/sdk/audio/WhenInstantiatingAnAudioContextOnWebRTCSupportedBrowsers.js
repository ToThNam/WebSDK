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
    'sdk/audio/AudioContext',
    'phenix-rtc'
], function(AudioContext, rtc) {
    describe('When Instantiating An Audio Context on WebRTC supported browsers', function() {
        before(function() {
            if (!rtc.webrtcSupported) {
                console.log('SKIPPING Webrtc Unsupported environment');

                return this.skip();
            }

            if (!window.AudioContext && !window.webkitAudioContext) {
                console.log('SKIPPING Environment without global AudioContext');

                return this.skip();
            }
        });

        var audioContext;

        beforeEach(function() {
            if (!window.AudioContext) {
                return this.skip();
            }

            audioContext = new AudioContext();
        });

        it('Has property getNativeAudioContext that is a function', function() {
            expect(audioContext.getNativeAudioContext).to.be.a('function');
        });

        it('Should not throw error on instantiation', function() {
            expect(function() {
                audioContext.init();
            }).to.not.throw();
        });

        it('Should have native AudioContext', function() {
            audioContext.init();

            if (window.AudioContext) {
                expect(audioContext.getNativeAudioContext()).to.be.a('AudioContext');
            } else if (window.webkitAudioContext) {
                expect(audioContext.getNativeAudioContext()).to.be.a('webkitAudioContext');
            }

            audioContext.getNativeAudioContext().close();
        });

        describe('When using native AudioContext (discovery test)', function() {
            var nativeAudioContext;

            beforeEach(function() {
                if (!audioContext) {
                    return;
                }

                audioContext.init();

                nativeAudioContext = audioContext.getNativeAudioContext();
            });

            afterEach(function() {
                if (!nativeAudioContext) {
                    return;
                }

                nativeAudioContext.close();
            });

            it('Should handle audioprocess ScriptProcessor event', function() {
                var event = new Event('audioprocess');
                var scriptProcessor = nativeAudioContext.createScriptProcessor();

                scriptProcessor.addEventListener('audioprocess', function(event) {
                    event.should.exist;
                });

                scriptProcessor.dispatchEvent(event);
            });
        });
    });
});