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
    'phenix-rtc',
    'sdk/userMedia/UserMediaResolver',
    'sdk/PCast',
    '../../../test/mock/UserMediaStubber',
    '../../../test/mock/ChromeRuntimeStubber'
], function(_, rtc, UserMediaResolver, PCast, UserMediaStubber, ChromeRuntimeStubber) {
    describe('When getting user media with a resolver', function() {
        var userMediaStubber = new UserMediaStubber();
        var chromeRuntimeStubber = new ChromeRuntimeStubber();
        var pcast;
        var userMediaResolver;
        var rtcBrowserClone = rtc.browser;
        var rtcBrowserVersionClone = rtc.browserVersion;

        before(function() {
            // Resolve phantomjs browser to chrome
            if (rtc.browser === 'Safari' && rtc.browserVersion === '?') {
                rtc.browser = 'Chrome';
                rtc.browserVersion = 55;
            }

            if (rtc.browser === 'Chrome') {
                chromeRuntimeStubber.stub();
            }
        });

        after(function() {
            pcast.stop();
            chromeRuntimeStubber.restore();
            rtc.browser = rtcBrowserClone;
            rtc.browserVersion = rtcBrowserVersionClone;
        });

        beforeEach(function() {
            pcast = new PCast({uri: 'wss://mockURI'});
            userMediaResolver = new UserMediaResolver(pcast);
        });

        afterEach(function() {
            pcast.stop();
            userMediaStubber.restore();
        });

        it('returns the user media on a successful callback', function(done) {
            var callbackStub = sinon.stub();

            userMediaResolver = new UserMediaResolver(pcast, {
                aspectRatio: '16x9',
                resolution: 720,
                frameRate: 15
            });

            userMediaStubber.stub(callbackStub);

            userMediaResolver.getUserMedia({
                video: true,
                audio: true
            }, function(error, response) {
                expect(error).to.not.exist;
                expect(response).to.be.a('object');
                expect(response.userMedia).to.exist;
                sinon.assert.calledOnce(callbackStub);
                done();
            });
        });

        it('returns an error when it fails to resolve media', function(done) {
            var callbackStub = sinon.stub();

            userMediaResolver = new UserMediaResolver(pcast, {
                aspectRatio: '16x9',
                resolution: 720,
                frameRate: 15
            });

            userMediaStubber.stubCriticalError(callbackStub);

            userMediaResolver.getUserMedia({
                video: true,
                audio: true
            }, function(error, response) {
                expect(error).to.exist;
                expect(response).to.not.exist;
                sinon.assert.calledOnce(callbackStub);
                done();
            });
        });

        it('successfully gets media upon successful recovery of failure to get media', function(done) {
            var failureStub = sinon.stub();
            var callbackStub = sinon.stub();

            userMediaResolver = new UserMediaResolver(pcast, {
                aspectRatio: '16x9',
                resolution: 720,
                frameRate: 15
            });

            userMediaStubber.stubResolutionError(function() {
                failureStub();
                userMediaStubber.restore();
                userMediaStubber.stub(callbackStub);
            });

            userMediaResolver.getUserMedia({
                video: true,
                audio: true
            }, function(error, response) {
                expect(error).to.not.exist;
                expect(response.userMedia).to.exist;
                sinon.assert.calledOnce(failureStub);
                sinon.assert.calledOnce(callbackStub);
                done();
            });
        });

        it('successfully resolves screen to video', function(done) {
            var callbackStub = sinon.stub();

            userMediaResolver = new UserMediaResolver(pcast, {
                aspectRatio: '16x9',
                resolution: 720,
                frameRate: 15
            });

            userMediaStubber.stub(function(constraints) {
                expect(constraints.video).to.exist;
                expect(constraints.screen).to.not.exist;
                callbackStub();
            });

            userMediaResolver.getUserMedia({screen: true}, function(error, response) {
                expect(error).to.not.exist;
                expect(response.userMedia).to.exist;
                sinon.assert.calledOnce(callbackStub);
                done();
            });
        });

        it('returns an error after exhausting all resolution options', function(done) {
            var callbackStub = sinon.stub();

            userMediaResolver = new UserMediaResolver(pcast, {
                aspectRatio: '16x9',
                resolution: 720,
                frameRate: 15
            });

            userMediaStubber.stubResolutionError(callbackStub);

            userMediaResolver.getUserMedia({video: true}, function(error, response) {
                expect(error).to.exist;
                expect(response).to.not.exist;
                sinon.assert.called(callbackStub);
                done();
            });
        });

        describe('When using the default resolution strategy of fallbackToLowerThenHigher', function() {
            it('will first try lower resolution followed by higher resolutions', function(done) {
                var heightToStartAt = 720;
                var isHigherResolutionCalled = false;
                var isLowerResolutionCalled = false;

                userMediaResolver = new UserMediaResolver(pcast, {
                    aspectRatio: '16x9',
                    resolution: heightToStartAt,
                    frameRate: 15
                });

                userMediaStubber.stubResolutionError(function(constraints) {
                    var height = null;

                    if (_.isObject(constraints.video.height)) {
                        height = constraints.video.height.min;
                    } else if (_.isObject(constraints.video.mandatory)) {
                        height = constraints.video.mandatory.minHeight;
                    }

                    if (height !== null && height > heightToStartAt) {
                        isHigherResolutionCalled = true;
                    }

                    if (height !== null && height < heightToStartAt) {
                        isLowerResolutionCalled = true;
                    }
                });

                userMediaResolver.getUserMedia({video: true}, function(error, response) {
                    expect(error).to.exist;
                    expect(response).to.not.exist;
                    expect(isHigherResolutionCalled).to.be.true;
                    expect(isLowerResolutionCalled).to.be.true;
                    done();
                });
            });
        });

        describe('When using fallbackToLower resolution strategy', function() {
            it('will first try lower resolution and not try any higher resolutions', function(done) {
                var heightToStartAt = 720;
                var isHigherResolutionCalled = false;
                var isLowerResolutionCalled = false;

                userMediaResolver = new UserMediaResolver(pcast, {
                    aspectRatio: '16x9',
                    resolution: heightToStartAt,
                    frameRate: 15,
                    resolutionSelectionStrategy: 'fallbackToLower'
                });

                userMediaStubber.stubResolutionError(function(constraints) {
                    var height = null;

                    if (_.isObject(constraints.video.height)) {
                        height = constraints.video.height.min;
                    } else if (_.isObject(constraints.video.mandatory)) {
                        height = constraints.video.mandatory.minHeight;
                    }

                    if (height !== null && height > heightToStartAt) {
                        isHigherResolutionCalled = true;
                    }

                    if (height !== null && height < heightToStartAt) {
                        isLowerResolutionCalled = true;
                    }
                });

                userMediaResolver.getUserMedia({video: true}, function(error, response) {
                    expect(error).to.exist;
                    expect(response).to.not.exist;
                    expect(isHigherResolutionCalled).to.not.be.true;
                    expect(isLowerResolutionCalled).to.be.true;
                    done();
                });
            });
        });

        describe('When using fallbackToHigher resolution strategy', function() {
            it('will first try higher resolution and not try any lower resolutions', function(done) {
                var heightToStartAt = 720;
                var isHigherResolutionCalled = false;
                var isLowerResolutionCalled = false;

                userMediaResolver = new UserMediaResolver(pcast, {
                    aspectRatio: '16x9',
                    resolution: heightToStartAt,
                    frameRate: 15,
                    resolutionSelectionStrategy: 'fallbackToHigher'
                });

                userMediaStubber.stubResolutionError(function(constraints) {
                    var height = null;

                    if (_.isObject(constraints.video.height)) {
                        height = constraints.video.height.min;
                    } else if (_.isObject(constraints.video.mandatory)) {
                        height = constraints.video.mandatory.minHeight;
                    }

                    console.log('height=' + height + ', heightToStartAt=' + heightToStartAt);

                    if (height !== null && height > heightToStartAt) {
                        isHigherResolutionCalled = true;
                    }

                    if (height !== null && height < heightToStartAt) {
                        isLowerResolutionCalled = true;
                    }
                });

                userMediaResolver.getUserMedia({video: true}, function(error, response) {
                    expect(error).to.exist;
                    expect(response).to.not.exist;
                    expect(isHigherResolutionCalled).to.be.true;
                    expect(isLowerResolutionCalled).to.not.be.true;
                    done();
                });
            });
        });

        describe('When using fallbackToHigher resolution strategy starting from the lowest resolution', function() {
            it('will try all higher resolution and not try any lower resolutions', function(done) {
                var heightToStartAt = 1;
                var isHigherResolutionCalled = 0;
                var isLowerResolutionCalled = 0;

                userMediaResolver = new UserMediaResolver(pcast, {
                    aspectRatio: '16x9',
                    resolution: heightToStartAt,
                    frameRate: 15,
                    resolutionSelectionStrategy: 'fallbackToHigher'
                });

                userMediaStubber.stubResolutionError(function(constraints) {
                    var height = null;

                    if (_.isObject(constraints.video.height)) {
                        height = constraints.video.height.min;
                    } else if (_.isObject(constraints.video.mandatory)) {
                        height = constraints.video.mandatory.minHeight;
                    }

                    console.log('height=' + height + ', heightToStartAt=' + heightToStartAt);

                    if (height !== null && height > heightToStartAt) {
                        isHigherResolutionCalled++;
                    }

                    if (height !== null && height < heightToStartAt) {
                        isLowerResolutionCalled++;
                    }
                });

                userMediaResolver.getUserMedia({video: true}, function(error, response) {
                    expect(error).to.exist;
                    expect(response).to.not.exist;
                    expect(isHigherResolutionCalled).to.be.equal(8);
                    expect(isLowerResolutionCalled).to.be.equal(0);
                    done();
                });
            });
        });

        describe('When using exact resolution strategy', function() {
            it('will not try any higher and any lower resolutions', function(done) {
                var heightToStartAt = 720;
                var isHigherResolutionCalled = false;
                var isLowerResolutionCalled = false;

                userMediaResolver = new UserMediaResolver(pcast, {
                    aspectRatio: '16x9',
                    resolution: heightToStartAt,
                    frameRate: 15,
                    resolutionSelectionStrategy: 'exact'
                });

                userMediaStubber.stubResolutionError(function(constraints) {
                    var height = null;

                    if (_.isObject(constraints.video.height)) {
                        height = constraints.video.height.min;
                    } else if (_.isObject(constraints.video.mandatory)) {
                        height = constraints.video.mandatory.minHeight;
                    }

                    console.log('height=' + height + ', heightToStartAt=' + heightToStartAt);

                    if (height !== null && height > heightToStartAt) {
                        isHigherResolutionCalled = true;
                    }

                    if (height !== null && height < heightToStartAt) {
                        isLowerResolutionCalled = true;
                    }
                });

                userMediaResolver.getUserMedia({video: true}, function(error, response) {
                    expect(error).to.exist;
                    expect(response).to.not.exist;
                    expect(isHigherResolutionCalled).to.not.be.true;
                    expect(isLowerResolutionCalled).to.not.be.true;
                    done();
                });
            });
        });
    });
});