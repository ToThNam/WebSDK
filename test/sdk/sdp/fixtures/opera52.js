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
        'o=- 470923933328290592 2 IN IP4 127.0.0.1\n' +
        's=-\n' +
        't=0 0\n' +
        'a=group:BUNDLE audio video\n' +
        'a=msid-semantic: WMS\n' +
        'm=audio 9 UDP/TLS/RTP/SAVPF 111 103 104 9 0 8 106 105 13 110 112 113 126\n' +
        'c=IN IP4 0.0.0.0\n' +
        'a=rtcp:9 IN IP4 0.0.0.0\n' +
        'a=ice-ufrag:uMsZ\n' +
        'a=ice-pwd:SyspPu6RpQu/dm7MTR0xx4A9\n' +
        'a=ice-options:trickle\n' +
        'a=fingerprint:sha-256 E9:F2:85:0D:57:B6:C6:F8:32:7E:B0:49:D9:5D:BB:7E:CA:11:98:03:AB:83:38:80:E7:F3:93:74:A1:80:38:8F\n' +
        'a=setup:actpass\n' +
        'a=mid:audio\n' +
        'a=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level\n' +
        'a=recvonly\n' +
        'a=rtcp-mux\n' +
        'a=rtpmap:111 opus/48000/2\n' +
        'a=rtcp-fb:111 transport-cc\n' +
        'a=fmtp:111 minptime=10;useinbandfec=1\n' +
        'a=rtpmap:103 ISAC/16000\n' +
        'a=rtpmap:104 ISAC/32000\n' +
        'a=rtpmap:9 G722/8000\n' +
        'a=rtpmap:0 PCMU/8000\n' +
        'a=rtpmap:8 PCMA/8000\n' +
        'a=rtpmap:106 CN/32000\n' +
        'a=rtpmap:105 CN/16000\n' +
        'a=rtpmap:13 CN/8000\n' +
        'a=rtpmap:110 telephone-event/48000\n' +
        'a=rtpmap:112 telephone-event/32000\n' +
        'a=rtpmap:113 telephone-event/16000\n' +
        'a=rtpmap:126 telephone-event/8000\n' +
        'm=video 9 UDP/TLS/RTP/SAVPF 96 97 98 99 100 101 102 124 127 123 125 107 108\n' +
        'c=IN IP4 0.0.0.0\n' +
        'a=rtcp:9 IN IP4 0.0.0.0\n' +
        'a=ice-ufrag:uMsZ\n' +
        'a=ice-pwd:SyspPu6RpQu/dm7MTR0xx4A9\n' +
        'a=ice-options:trickle\n' +
        'a=fingerprint:sha-256 E9:F2:85:0D:57:B6:C6:F8:32:7E:B0:49:D9:5D:BB:7E:CA:11:98:03:AB:83:38:80:E7:F3:93:74:A1:80:38:8F\n' +
        'a=setup:actpass\n' +
        'a=mid:video\n' +
        'a=extmap:2 urn:ietf:params:rtp-hdrext:toffset\n' +
        'a=extmap:3 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time\n' +
        'a=extmap:4 urn:3gpp:video-orientation\n' +
        'a=extmap:5 http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01\n' +
        'a=extmap:6 http://www.webrtc.org/experiments/rtp-hdrext/playout-delay\n' +
        'a=extmap:7 http://www.webrtc.org/experiments/rtp-hdrext/video-content-type\n' +
        'a=extmap:8 http://www.webrtc.org/experiments/rtp-hdrext/video-timing\n' +
        'a=recvonly\n' +
        'a=rtcp-mux\n' +
        'a=rtcp-rsize\n' +
        'a=rtpmap:96 VP8/90000\n' +
        'a=rtcp-fb:96 goog-remb\n' +
        'a=rtcp-fb:96 transport-cc\n' +
        'a=rtcp-fb:96 ccm fir\n' +
        'a=rtcp-fb:96 nack\n' +
        'a=rtcp-fb:96 nack pli\n' +
        'a=rtpmap:97 rtx/90000\n' +
        'a=fmtp:97 apt=96\n' +
        'a=rtpmap:98 VP9/90000\n' +
        'a=rtcp-fb:98 goog-remb\n' +
        'a=rtcp-fb:98 transport-cc\n' +
        'a=rtcp-fb:98 ccm fir\n' +
        'a=rtcp-fb:98 nack\n' +
        'a=rtcp-fb:98 nack pli\n' +
        'a=rtpmap:99 rtx/90000\n' +
        'a=fmtp:99 apt=98\n' +
        'a=rtpmap:100 H264/90000\n' +
        'a=rtcp-fb:100 goog-remb\n' +
        'a=rtcp-fb:100 transport-cc\n' +
        'a=rtcp-fb:100 ccm fir\n' +
        'a=rtcp-fb:100 nack\n' +
        'a=rtcp-fb:100 nack pli\n' +
        'a=fmtp:100 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=420032\n' +
        'a=rtpmap:101 rtx/90000\n' +
        'a=fmtp:101 apt=100\n' +
        'a=rtpmap:102 H264/90000\n' +
        'a=rtcp-fb:102 goog-remb\n' +
        'a=rtcp-fb:102 transport-cc\n' +
        'a=rtcp-fb:102 ccm fir\n' +
        'a=rtcp-fb:102 nack\n' +
        'a=rtcp-fb:102 nack pli\n' +
        'a=fmtp:102 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=4d0032\n' +
        'a=rtpmap:124 rtx/90000\n' +
        'a=fmtp:124 apt=102\n' +
        'a=rtpmap:127 H264/90000\n' +
        'a=rtcp-fb:127 goog-remb\n' +
        'a=rtcp-fb:127 transport-cc\n' +
        'a=rtcp-fb:127 ccm fir\n' +
        'a=rtcp-fb:127 nack\n' +
        'a=rtcp-fb:127 nack pli\n' +
        'a=fmtp:127 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=640032\n' +
        'a=rtpmap:123 rtx/90000\n' +
        'a=fmtp:123 apt=127\n' +
        'a=rtpmap:125 red/90000\n' +
        'a=rtpmap:107 rtx/90000\n' +
        'a=fmtp:107 apt=125\n' +
        'a=rtpmap:108 ulpfec/90000';
});