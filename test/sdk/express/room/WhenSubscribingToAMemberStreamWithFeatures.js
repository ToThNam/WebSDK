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
    'sdk/express/RoomExpress',
    'sdk/room/RoomService',
    'sdk/streaming/FeatureDetector',
    '../../../../test/mock/HttpStubber',
    '../../../../test/mock/WebSocketStubber',
    'sdk/room/Member',
    'sdk/room/Stream',
    'sdk/room/room.json',
    'sdk/room/member.json',
    'sdk/room/stream.json',
    'sdk/room/track.json'
], function(_, RoomExpress, RoomService, FeatureDetector, HttpStubber, WebSocketStubber, Member, Stream, room, member, memberStream, track) {
    describe('When Subscribing to a Member Stream with features', function() {
        var mockStreamId = 'mystreamId';
        var baseStream = {
            uri: '',
            type: memberStream.types.user.name,
            audioState: track.states.trackEnabled.name,
            videoState: track.states.trackEnabled.name
        };

        var httpStubber;
        var websocketStubber;

        beforeEach(function() {
            httpStubber = new HttpStubber();
            httpStubber.stubAuthRequest();
            httpStubber.stubStreamRequest();

            websocketStubber = new WebSocketStubber();
            websocketStubber.stubAuthRequest();
        });

        afterEach(function() {
            httpStubber.restore();
            websocketStubber.restore();
        });

        it('subscribes with real-time when real-time is only capability on publisher, is supported feature and is requested as a feature', function(done) {
            var stream = _.assign({}, baseStream, {uri: Stream.getPCastPrefix() + mockStreamId + '?capabilities='});
            var roomExpress = new RoomExpress({
                authToken: 'DIGEST:eyJhcHBsaWNhdGlvbklkIjoiZGVtbyIsImRpZ2VzdCI6IjZ3ODQ3S3N2ZFh5WjhRNnlyNWNzMnh0YjMxdFQ0TFR3bHAyeUZyZ0t2K0pDUEJyYkI4Qnd5a3dyT2NIWE52OXQ5eU5qYkFNT2tuQ1N1VnE5eGdBZjdRPT0iLCJ0b2tlbiI6IntcImV4cGlyZXNcIjoxOTI5NjA5NjcwMjI1LFwiY2FwYWJpbGl0aWVzXCI6W1wiYXVkaW8tb25seVwiXSxcInJlcXVpcmVkVGFnXCI6XCJyb29tSWQ6ZXVyb3BlLWNlbnRyYWwjZGVtbyNtdWx0aXBhcnR5Q2hhdERlbW9Sb29tLlpwcWJKNG1Oa2g2dVwifSJ9',
                backendUri: 'asd'
            });

            sinon.stub(FeatureDetector, 'isFeatureSupported').callsFake(function(feature) {
                return feature === 'real-time';
            });

            roomExpress.getPCastExpress().subscribe = sinon.stub(roomExpress.getPCastExpress(), 'subscribe').callsFake(function(options) {
                expect(options.capabilities).to.be.a('array');
                expect(options.capabilities).to.be.deep.equal(['real-time']);

                roomExpress.dispose();
                FeatureDetector.isFeatureSupported.restore();
                done();
            });

            roomExpress.subscribeToMemberStream(new Stream(stream.uri, stream.type, stream.audioState, stream.videoState), {}, _.noop);
        });

        it('fails to subscribe if real-time is only capability on publisher, is supported feature and is not requested as a feature', function(done) {
            var stream = _.assign({}, baseStream, {uri: Stream.getPCastPrefix() + mockStreamId + '?capabilities='});
            var roomExpress = new RoomExpress({
                authToken: 'DIGEST:eyJhcHBsaWNhdGlvbklkIjoiZGVtbyIsImRpZ2VzdCI6IjZ3ODQ3S3N2ZFh5WjhRNnlyNWNzMnh0YjMxdFQ0TFR3bHAyeUZyZ0t2K0pDUEJyYkI4Qnd5a3dyT2NIWE52OXQ5eU5qYkFNT2tuQ1N1VnE5eGdBZjdRPT0iLCJ0b2tlbiI6IntcImV4cGlyZXNcIjoxOTI5NjA5NjcwMjI1LFwiY2FwYWJpbGl0aWVzXCI6W1wiYXVkaW8tb25seVwiXSxcInJlcXVpcmVkVGFnXCI6XCJyb29tSWQ6ZXVyb3BlLWNlbnRyYWwjZGVtbyNtdWx0aXBhcnR5Q2hhdERlbW9Sb29tLlpwcWJKNG1Oa2g2dVwifSJ9',
                features: ['hls', 'dash', 'rtmp']
            });

            sinon.stub(FeatureDetector, 'isFeatureSupported').callsFake(function(feature) {
                return feature === 'real-time';
            });

            roomExpress.subscribeToMemberStream(new Stream(stream.uri, stream.type, stream.audioState, stream.videoState), {}, function(error, response) {
                expect(response.status).to.be.equal('unsupported-features');

                roomExpress.dispose();
                FeatureDetector.isFeatureSupported.restore();
                done();
            });
        });

        it('fails to subscribe if real-time is only capability on publisher, not a supported feature and is requested as a feature', function(done) {
            var stream = _.assign({}, baseStream, {uri: Stream.getPCastPrefix() + mockStreamId + '?capabilities='});
            var roomExpress = new RoomExpress({
                authToken: 'DIGEST:eyJhcHBsaWNhdGlvbklkIjoiZGVtbyIsImRpZ2VzdCI6IjZ3ODQ3S3N2ZFh5WjhRNnlyNWNzMnh0YjMxdFQ0TFR3bHAyeUZyZ0t2K0pDUEJyYkI4Qnd5a3dyT2NIWE52OXQ5eU5qYkFNT2tuQ1N1VnE5eGdBZjdRPT0iLCJ0b2tlbiI6IntcImV4cGlyZXNcIjoxOTI5NjA5NjcwMjI1LFwiY2FwYWJpbGl0aWVzXCI6W1wiYXVkaW8tb25seVwiXSxcInJlcXVpcmVkVGFnXCI6XCJyb29tSWQ6ZXVyb3BlLWNlbnRyYWwjZGVtbyNtdWx0aXBhcnR5Q2hhdERlbW9Sb29tLlpwcWJKNG1Oa2g2dVwifSJ9',
                features: ['hls', 'dash', 'rtmp']
            });

            sinon.stub(FeatureDetector, 'isFeatureSupported').callsFake(function(feature) {
                return feature === 'real-time';
            });

            roomExpress.subscribeToMemberStream(new Stream(stream.uri, stream.type, stream.audioState, stream.videoState), {}, function(error, response) {
                expect(response.status).to.be.equal('unsupported-features');

                roomExpress.dispose();
                FeatureDetector.isFeatureSupported.restore();
                done();
            });
        });

        it('subscribes with first supported feature even if it is not listed first as a feature', function(done) {
            var stream = _.assign({}, baseStream, {uri: Stream.getPCastPrefix() + mockStreamId + '?capabilities=streaming'});
            var roomExpress = new RoomExpress({
                authToken: 'DIGEST:eyJhcHBsaWNhdGlvbklkIjoiZGVtbyIsImRpZ2VzdCI6IjZ3ODQ3S3N2ZFh5WjhRNnlyNWNzMnh0YjMxdFQ0TFR3bHAyeUZyZ0t2K0pDUEJyYkI4Qnd5a3dyT2NIWE52OXQ5eU5qYkFNT2tuQ1N1VnE5eGdBZjdRPT0iLCJ0b2tlbiI6IntcImV4cGlyZXNcIjoxOTI5NjA5NjcwMjI1LFwiY2FwYWJpbGl0aWVzXCI6W1wiYXVkaW8tb25seVwiXSxcInJlcXVpcmVkVGFnXCI6XCJyb29tSWQ6ZXVyb3BlLWNlbnRyYWwjZGVtbyNtdWx0aXBhcnR5Q2hhdERlbW9Sb29tLlpwcWJKNG1Oa2g2dVwifSJ9',
                features: ['real-time', 'dash']
            });

            sinon.stub(FeatureDetector, 'isFeatureSupported').callsFake(function(feature) {
                return feature === 'dash';
            });

            roomExpress.getPCastExpress().subscribe = sinon.stub(roomExpress.getPCastExpress(), 'subscribe').callsFake(function(options) {
                expect(options.capabilities).to.be.a('array');
                expect(options.capabilities).to.be.deep.equal(['streaming']);

                roomExpress.dispose();
                FeatureDetector.isFeatureSupported.restore();
                done();
            });

            roomExpress.subscribeToMemberStream(new Stream(stream.uri, stream.type, stream.audioState, stream.videoState), {}, _.noop);
        });

        it('subscribes with the first supported feature even if multiple are supported', function(done) {
            var stream = _.assign({}, baseStream, {uri: Stream.getPCastPrefix() + mockStreamId + '?capabilities=streaming'});
            var roomExpress = new RoomExpress({
                authToken: 'DIGEST:eyJhcHBsaWNhdGlvbklkIjoiZGVtbyIsImRpZ2VzdCI6IjZ3ODQ3S3N2ZFh5WjhRNnlyNWNzMnh0YjMxdFQ0TFR3bHAyeUZyZ0t2K0pDUEJyYkI4Qnd5a3dyT2NIWE52OXQ5eU5qYkFNT2tuQ1N1VnE5eGdBZjdRPT0iLCJ0b2tlbiI6IntcImV4cGlyZXNcIjoxOTI5NjA5NjcwMjI1LFwiY2FwYWJpbGl0aWVzXCI6W1wiYXVkaW8tb25seVwiXSxcInJlcXVpcmVkVGFnXCI6XCJyb29tSWQ6ZXVyb3BlLWNlbnRyYWwjZGVtbyNtdWx0aXBhcnR5Q2hhdERlbW9Sb29tLlpwcWJKNG1Oa2g2dVwifSJ9',
                features: ['dash', 'real-time']
            });

            sinon.stub(FeatureDetector, 'isFeatureSupported').callsFake(function(feature) {
                return feature === 'dash' || feature === 'real-time';
            });

            roomExpress.getPCastExpress().subscribe = sinon.stub(roomExpress.getPCastExpress(), 'subscribe').callsFake(function(options) {
                expect(options.capabilities).to.be.a('array');
                expect(options.capabilities).to.be.deep.equal(['streaming']);

                roomExpress.dispose();
                FeatureDetector.isFeatureSupported.restore();
                done();
            });

            roomExpress.subscribeToMemberStream(new Stream(stream.uri, stream.type, stream.audioState, stream.videoState), {}, _.noop);
        });
    });
});