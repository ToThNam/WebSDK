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

define([], function() {
    return 'v=0\n' +
        'o=mozilla...THIS_IS_SDPARTA-60.0 7629723021896606923 0 IN IP4 0.0.0.0\n' +
        's=-\n' +
        't=0 0\n' +
        'a=fingerprint:sha-256 A3:90:F5:CD:12:2F:4A:4C:43:9C:F7:A1:E0:C6:7D:0A:2A:18:CE:CA:A0:FA:01:E9:B9:0B:D1:3D:1C:99:EC:3E\n' +
        'a=group:BUNDLE sdparta_0 sdparta_1\n' +
        'a=ice-options:trickle\n' +
        'a=msid-semantic:WMS *\n' +
        'm=video 9 UDP/TLS/RTP/SAVPF 120 121 126 97\n' +
        'c=IN IP4 0.0.0.0\n' +
        'a=recvonly\n' +
        'a=extmap:1 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time\n' +
        'a=extmap:2 urn:ietf:params:rtp-hdrext:toffset\n' +
        'a=extmap:3 urn:ietf:params:rtp-hdrext:sdes:mid\n' +
        'a=fmtp:126 profile-level-id=42e01f;level-asymmetry-allowed=1;packetization-mode=1\n' +
        'a=fmtp:97 profile-level-id=42e01f;level-asymmetry-allowed=1\n' +
        'a=fmtp:120 max-fs=12288;max-fr=60\n' +
        'a=fmtp:121 max-fs=12288;max-fr=60\n' +
        'a=ice-pwd:0892ce337c1cf75d543873fab9fda4e2\n' +
        'a=ice-ufrag:7e51abe5\n' +
        'a=mid:sdparta_0\n' +
        'a=rtcp-fb:120 nack\n' +
        'a=rtcp-fb:120 nack pli\n' +
        'a=rtcp-fb:120 ccm fir\n' +
        'a=rtcp-fb:120 goog-remb\n' +
        'a=rtcp-fb:121 nack\n' +
        'a=rtcp-fb:121 nack pli\n' +
        'a=rtcp-fb:121 ccm fir\n' +
        'a=rtcp-fb:121 goog-remb\n' +
        'a=rtcp-fb:126 nack\n' +
        'a=rtcp-fb:126 nack pli\n' +
        'a=rtcp-fb:126 ccm fir\n' +
        'a=rtcp-fb:126 goog-remb\n' +
        'a=rtcp-fb:97 nack\n' +
        'a=rtcp-fb:97 nack pli\n' +
        'a=rtcp-fb:97 ccm fir\n' +
        'a=rtcp-fb:97 goog-remb\n' +
        'a=rtcp-mux\n' +
        'a=rtpmap:120 VP8/90000\n' +
        'a=rtpmap:121 VP9/90000\n' +
        'a=rtpmap:126 H264/90000\n' +
        'a=rtpmap:97 H264/90000\n' +
        'a=setup:actpass\n' +
        'a=ssrc:4152366771 cname:{bf4c01ff-93b6-764f-bbe1-f94b14b4115b}\n' +
        'm=audio 9 UDP/TLS/RTP/SAVPF 109 9 0 8 101\n' +
        'c=IN IP4 0.0.0.0\n' +
        'a=recvonly\n' +
        'a=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level\n' +
        'a=extmap:2/recvonly urn:ietf:params:rtp-hdrext:csrc-audio-level\n' +
        'a=extmap:3 urn:ietf:params:rtp-hdrext:sdes:mid\n' +
        'a=fmtp:109 maxplaybackrate=48000;stereo=1;useinbandfec=1\n' +
        'a=fmtp:101 0-15\n' +
        'a=ice-pwd:0892ce337c1cf75d543873fab9fda4e2\n' +
        'a=ice-ufrag:7e51abe5\n' +
        'a=mid:sdparta_1\n' +
        'a=rtcp-mux\n' +
        'a=rtpmap:109 opus/48000/2\n' +
        'a=rtpmap:9 G722/8000/1\n' +
        'a=rtpmap:0 PCMU/8000\n' +
        'a=rtpmap:8 PCMA/8000\n' +
        'a=rtpmap:101 telephone-event/8000/1\n' +
        'a=setup:actpass\n' +
        'a=ssrc:3522382385 cname:{bf4c01ff-93b6-764f-bbe1-f94b14b4115b}\n';
});