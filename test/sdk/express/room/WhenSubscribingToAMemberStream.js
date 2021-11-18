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
    '../../../../test/mock/PeerConnectionStubber',
    'sdk/room/Stream',
    'sdk/room/stream.json',
    'sdk/room/track.json'
], function(_, RoomExpress, RoomService, FeatureDetector, HttpStubber, WebSocketStubber, PeerConnectionStubber, Stream, memberStream, track) {
    describe('When Subscribing to a Member Stream', function() {
        var mockStreamId = 'mystreamId';
        var baseStream = {
            uri: '',
            type: memberStream.types.user.name,
            audioState: track.states.trackEnabled.name,
            videoState: track.states.trackEnabled.name
        };

        var httpStubber;
        var websocketStubber;
        var peerConnectionStubber = new PeerConnectionStubber();

        beforeEach(function() {
            peerConnectionStubber.stub();

            httpStubber = new HttpStubber();
            httpStubber.stubAuthRequest();
            httpStubber.stubStreamRequest();

            websocketStubber = new WebSocketStubber();
            websocketStubber.stubAuthRequest();
            websocketStubber.stubSetupStream();
        });

        afterEach(function() {
            peerConnectionStubber.restore();
            httpStubber.restore();
            websocketStubber.restore();
        });

        it('subscribes to a member stream and returns mediaStream and originStreamId', function(done) {
            var stream = _.assign({}, baseStream, {uri: Stream.getPCastPrefix() + mockStreamId + '?capabilities=streaming'});
            var token = 'DIGEST:eyJhcHBsaWNhdGlvbklkIjoiZGVtbyIsImRpZ2VzdCI6IjZ3ODQ3S3N2ZFh5WjhRNnlyNWNzMnh0YjMxdFQ0TFR3bHAyeUZyZ0t2K0pDUEJyYkI4Qnd5a3dyT2NIWE52OXQ5eU5qYkFNT2tuQ1N1VnE5eGdBZjdRPT0iLCJ0b2tlbiI6IntcImV4cGlyZXNcIjoxOTI5NjA5NjcwMjI1LFwiY2FwYWJpbGl0aWVzXCI6W1wiYXVkaW8tb25seVwiXSxcInJlcXVpcmVkVGFnXCI6XCJyb29tSWQ6ZXVyb3BlLWNlbnRyYWwjZGVtbyNtdWx0aXBhcnR5Q2hhdERlbW9Sb29tLlpwcWJKNG1Oa2g2dVwifSJ9';
            var roomExpress = new RoomExpress({
                authToken: token,
                features: ['real-time', 'dash']
            });

            sinon.stub(FeatureDetector, 'isFeatureSupported').callsFake(function(feature) {
                return feature === 'dash' || feature === 'real-time';
            });

            roomExpress.subscribeToMemberStream(new Stream(stream.uri, stream.type, stream.audioState, stream.videoState), {streamToken: token}, function(error, response) {
                expect(error).to.not.exist;
                expect(response).to.be.an('object');
                expect(response.status).to.be.equal('ok');
                expect(response.mediaStream).to.be.an('object');
                expect(response.originStreamId).to.be.an('string');
                FeatureDetector.isFeatureSupported.restore();
                done();
            });
        });
    });
});