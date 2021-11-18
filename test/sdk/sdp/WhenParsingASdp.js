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
    'sdk/sdpUtil',
    './fixtures/opera52',
    './fixtures/firefox60',
    './fixtures/androidChrome63'
], function(sdpUtil, opera52Sdp, firefox60Sdp, androidChrome63) {
    'use strict';

    var defaultH264Value = '42c02a';

    describe('When parsing a SDP', function() {
        describe('When on Opera 52.0', function() {
            var sdp = opera52Sdp;

            it('returns 3 h264 profile levels', function() {
                expect(sdpUtil.getH264ProfileIds(sdp)).to.be.deep.equal(['420032', '4d0032', '640032']);
            });

            it('replaces profile id with new value', function() {
                var sdpWithNewProfileId = sdpUtil.replaceH264ProfileId(sdp, '4d0032', defaultH264Value);

                expect(sdpUtil.getH264ProfileIds(sdpWithNewProfileId)).to.be.deep.equal(['420032', defaultH264Value, '640032']);
            });

            describe('When getting h264 profiles with the same profile and equal to or higher level', function() {
                it('gets the profile id with the same profile but higher level', function() {
                    expect(sdpUtil.getH264ProfileIdWithSameProfileAndEqualToOrHigherLevel(['420032', '4d0032', '640032'], defaultH264Value)).to.be.equal('420032');
                });

                it('returns no profile id when no profile id has the same profile', function() {
                    expect(sdpUtil.getH264ProfileIdWithSameProfileAndEqualToOrHigherLevel(['4d0032', '640032'], defaultH264Value)).to.be.null;
                });
            });

            describe('When getting h264 profiles with equal to or higher profile and equal to or higher level', function() {
                it('gets the profile id with the same profile but higher level', function() {
                    expect(sdpUtil.getH264ProfileIdWithSameOrHigherProfileAndEqualToOrHigherLevel(['420032', '4d0032', '640032'], defaultH264Value)).to.be.equal('420032');
                });

                it('gets the highest profile when no equivalent profile is provided', function() {
                    expect(sdpUtil.getH264ProfileIdWithSameOrHigherProfileAndEqualToOrHigherLevel(['4d0032', '640032'], defaultH264Value)).to.be.equal('640032');
                });
            });
        });

        describe('When on Firefox 60', function() {
            var sdp = firefox60Sdp;

            it('returns 2 h264 profile levels', function() {
                expect(sdpUtil.getH264ProfileIds(sdp)).to.be.deep.equal(['42e01f', '42e01f']);
            });

            it('replaces profile id with new value', function() {
                var sdpWithNewProfileId = sdpUtil.replaceH264ProfileId(sdp, '42e01f', defaultH264Value);

                expect(sdpUtil.getH264ProfileIds(sdpWithNewProfileId)).to.be.deep.equal([defaultH264Value, '42e01f']);
            });

            describe('When getting h264 profiles with the same profile and equal to or higher level', function() {
                it('gets the profile id with the same profile but higher level', function() {
                    expect(sdpUtil.getH264ProfileIdWithSameProfileAndEqualToOrHigherLevel(['42e01f', '42e01f'], '420000')).to.be.equal('42e01f');
                });

                it('returns no profile id when no profile id has the same profile and equal to or higher level', function() {
                    expect(sdpUtil.getH264ProfileIdWithSameProfileAndEqualToOrHigherLevel(['42e01f', '42e01f'], '420032')).to.be.null;
                });
            });
        });

        describe('When on Android Chrome 63', function() {
            var sdp = androidChrome63;

            it('returns 2 h264 profile levels', function() {
                expect(sdpUtil.getH264ProfileIds(sdp)).to.be.deep.equal(['42001f']);
            });

            it('replaces profile id with new value', function() {
                var sdpWithNewProfileId = sdpUtil.replaceH264ProfileId(sdp, '42001f', defaultH264Value);

                expect(sdpUtil.getH264ProfileIds(sdpWithNewProfileId)).to.be.deep.equal([defaultH264Value]);
            });

            describe('When getting h264 profiles with the same profile and equal to or higher level', function() {
                it('gets the profile id with the same profile but higher level', function() {
                    expect(sdpUtil.getH264ProfileIdWithSameProfileAndEqualToOrHigherLevel(['42001f'], '420000')).to.be.equal('42001f');
                });

                it('returns no profile id when no profile id has the same profile and equal to or higher level', function() {
                    expect(sdpUtil.getH264ProfileIdWithSameProfileAndEqualToOrHigherLevel(['42001f'], '420032')).to.be.null;
                });
            });
        });
    });
});