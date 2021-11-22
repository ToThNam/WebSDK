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

define('',[
    'phenix-web-lodash-light',
    'phenix-web-assert'
], function(_, assert) {
    'use strict';

    var h264ProfileIdRegex = /profile-level-id=[^;\n]*/;
    var vp8Regex = /vp8/i;
    var vp9Regex = /vp9/i;
    var h264Regex = /h264/i;
    var h265Regex = /h265/i;

    function sdpUtil() {

    }

    sdpUtil.prototype.getH264ProfileIds = function getH264ProfileIds(offerSdp: string) {
        assert.isStringNotEmpty(offerSdp, 'offerSdp');

        var h264ProfileIds = [];
        var h264ProfileIdMatch = offerSdp.match(h264ProfileIdRegex);
        var restOfOffer = offerSdp;

        while (h264ProfileIdMatch) {
            var h264ProfileId = _.get(h264ProfileIdMatch, '0', '');

            h264ProfileIds.push(h264ProfileId.split('=')[1]);

            restOfOffer = restOfOffer.substring(h264ProfileIdMatch.index + h264ProfileId.length, offerSdp.length);
            h264ProfileIdMatch = restOfOffer.match(h264ProfileIdRegex);
        }

        return h264ProfileIds;
    };

    sdpUtil.prototype.replaceH264ProfileId = function replaceH264ProfileId(offerSdp: string, profileIdToReplace: string, newProfileId: string) {
        assert.isStringNotEmpty(offerSdp, 'offerSdp');
        assert.isStringNotEmpty(newProfileId, 'newProfileId');

        var profileIds = this.getH264ProfileIds(offerSdp);

        if (!_.includes(profileIds, profileIdToReplace)) {
            return offerSdp;
        }

        return offerSdp.replace('profile-level-id=' + profileIdToReplace, 'profile-level-id=' + newProfileId);
    };

    sdpUtil.prototype.getH264ProfileIdWithSameProfileAndEqualToOrHigherLevel = function(profileIds: any, replaceProfileId: any) {
        if (_.includes(profileIds, replaceProfileId)) {
            return replaceProfileId;
        }

        var nextProfileId = _.reduce(profileIds, function(selectedProfileId: string, profileId: string) {
            var selectedProfile = parseInt(selectedProfileId.substring(0, 2), 16);
            var selectedLevel = parseInt(selectedProfileId.substring(4, 6), 16);
            var profile = parseInt(profileId.substring(0, 2), 16);
            var level = parseInt(profileId.substring(4, 6), 16);

            // We prefer the profile that we are replacing
            if (selectedProfile !== profile) {
                return selectedProfileId;
            }

            return selectedLevel >= level ? selectedProfileId : profileId;
        }, replaceProfileId);

        return nextProfileId === replaceProfileId ? null : nextProfileId;
    };

    sdpUtil.prototype.getH264ProfileIdWithSameOrHigherProfileAndEqualToOrHigherLevel = function(profileIds: any, replaceProfileId: any) {
        var matchingProfile = this.getH264ProfileIdWithSameProfileAndEqualToOrHigherLevel(profileIds, replaceProfileId);

        if (matchingProfile) {
            return matchingProfile;
        }

        var nextProfileId = _.reduce(profileIds, function(selectedProfileId: string, profileId: string) {
            var selectedProfile = parseInt(selectedProfileId.substring(0, 2), 16);
            var selectedLevel = parseInt(selectedProfileId.substring(4, 6), 16);
            var profile = parseInt(profileId.substring(0, 2), 16);
            var level = parseInt(profileId.substring(4, 6), 16);

            // We prefer the profile that we are replacing
            if (selectedProfile < profile) {
                return profileId;
            } else if (profile < selectedProfile) {
                return selectedProfileId;
            }

            return selectedLevel > level ? selectedProfileId : profileId;
        }, replaceProfileId);

        return nextProfileId === replaceProfileId ? null : nextProfileId;
    };

    sdpUtil.prototype.getSupportedCodecs = function getSupportedCodecs(offerSdp: string) {
        assert.isStringNotEmpty(offerSdp, 'offerSdp');

        var codecs = [];

        if (vp8Regex.test(offerSdp)) {
            codecs.push('VP8');
        }

        if (vp9Regex.test(offerSdp)) {
            codecs.push('VP9');
        }

        if (h264Regex.test(offerSdp)) {
            codecs.push('H264');
        }

        if (h265Regex.test(offerSdp)) {
            codecs.push('H265');
        }

        return codecs;
    };

    sdpUtil.prototype.hasMediaSectionsInLocalSdp = function hasMediaSectionsInLocalSdp(peerConnection: any) {
        var indexOfSection = this.findInSdpSections(peerConnection, function(section: any) {
            return _.startsWith(section, 'video') || _.startsWith(section, 'audio');
        });

        return indexOfSection < 0;
    };

    sdpUtil.prototype.hasActiveAudio = function hasActiveAudio(peerConnection: any) {
        var indexOfActiveVideo = this.findInSdpSections(peerConnection, function(section: any, index: number, remoteSections: any) {
            if (_.startsWith(section, 'audio')) {
                return !_.includes(section, 'a=inactive') && !_.includes(remoteSections[index], 'a=inactive');
            }

            return false;
        });

        return indexOfActiveVideo < 0;
    };

    sdpUtil.prototype.hasActiveVideo = function hasActiveVideo(peerConnection: any) {
        var indexOfActiveVideo = this.findInSdpSections(peerConnection, function(section: any, index: number, remoteSections: { [x: string]: any; }) {
            if (_.startsWith(section, 'video')) {
                return !_.includes(section, 'a=inactive') && !_.includes(remoteSections[index], 'a=inactive');
            }

            return false;
        });

        return indexOfActiveVideo < 0;
    };

    sdpUtil.prototype.findInSdpSections = function findInSdpSections(peerConnection: any, callback:  any) {
        var localSections = this.getLocalSdp(peerConnection).split('m=');
        var remoteSections = this.getRemoteSdp(peerConnection).split('m=');

        if (localSections.length !== remoteSections.length) {
            return false;
        }

        return _.findIndex(localSections, function(section: any, index: any) {
            return callback(section, index, remoteSections);
        });
    };

    sdpUtil.prototype.getNumberOfActiveSections = function getNumberOfActiveSections(peerConnection: any) {
        var sdp = this.getLocalSdp(peerConnection) || this.getRemoteSdp(peerConnection);
        var sections = sdp.split('m=');

        return _.filter(sections, function(section: any) {
            return !_.includes(section, 'a=inactive') && (_.startsWith(section, 'audio') || _.startsWith(section, 'video'));
        }).length;
    };

    sdpUtil.prototype.getLocalSdp = function getLocalSdp(peerConnection: any) {
        return _.get(peerConnection, ['localDescription', 'sdp'], '');
    };

    sdpUtil.prototype.getRemoteSdp = function getLocalSdp(peerConnection: any) {
        return _.get(peerConnection, ['remoteDescription', 'sdp'], '');
    };

    sdpUtil.prototype.setGroupLineOrderToMatchMediaSectionOrder = function setGroupLineOrderToMatchMediaSectionOrder(sdp: string) {
        var groupLineSegment = sdp.match(/(?=a=group:BUNDLE).*/);
        var mediaSegmentNamesString = _.get(_.get(groupLineSegment, [0], '').split('a=group:BUNDLE '), [1], '');
        var mediaSegmentNames = mediaSegmentNamesString.split(' ');

        var sortedMediaSegmentNames = mediaSegmentNames.sort(function(nameA: string, nameB: string) {
            return sdp.indexOf('m=' + nameA) - sdp.indexOf('m=' + nameB);
        });

        if (sortedMediaSegmentNames.length > 0) {
            sdp = sdp.replace(mediaSegmentNamesString, sortedMediaSegmentNames.join(' '));
        }

        return sdp;
    };

    return new (sdpUtil as any) ();
});