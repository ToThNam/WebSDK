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
    'sdk/room/Stream',
    'sdk/room/stream.json',
    'sdk/room/track.json'
], function(Stream, stream, track) {
    describe('When instantiating a Stream', function() {
        var testStream;

        beforeEach(function() {
            testStream = new Stream('asd', stream.types.user.name);
        });

        it('Has property toJson that is a function', function() {
            expect(testStream.toJson).to.be.a('function');
        });

        it('InValid audio state results in error', function() {
            expect(function() {
                testStream.getObservableAudioState().setValue('off');
            }).to.throw(Error);
        });

        it('InValid video state results in error', function() {
            expect(function() {
                testStream.getObservableVideoState().setValue('off');
            }).to.throw(Error);
        });

        it('InValid stream type results in error', function() {
            expect(function() {
                new Stream('asd', 'off');
            }).to.throw(Error);
        });

        it('Valid audio state results in change of state', function() {
            testStream.getObservableAudioState().subscribe(function(state) {
                expect(state).to.be.equal(track.states.trackDisabled.name);
            });

            testStream.getObservableAudioState().setValue(track.states.trackDisabled.name);
        });

        it('Valid video state results in change of state', function() {
            testStream.getObservableVideoState().subscribe(function(state) {
                expect(state).to.be.equal(track.states.trackDisabled.name);
            });

            testStream.getObservableVideoState().setValue(track.states.trackDisabled.name);
        });

        it('Valid type enum results in change of state', function() {
            testStream = new Stream('asd', 1);

            expect(testStream.getType()).to.be.equal(stream.types.presentation.name);
        });

        it('InValid type enum results in error', function() {
            expect(function() {
                new Stream('asd', 8);
            }).to.throw(Error);
        });

        it('Valid audio state enum results in change of state', function() {
            testStream.getObservableAudioState().subscribe(function(state) {
                expect(state).to.be.equal(track.states.trackEnded.name);
            });

            testStream.getObservableAudioState().setValue(2);
        });

        it('InValid audio state enum results in error', function() {
            expect(function() {
                testStream.getObservableAudioState().setValue(8);
            }).to.throw(Error);
        });
    });
});