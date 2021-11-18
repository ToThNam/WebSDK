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

var version = '1.0.0'; // ToDo: use until sample app separated from repo

define('app-setup', [
    'jquery',
    'lodash',
    'bootstrap-notify',
    'fingerprintjs2',
    'phenix-web-sdk'
], function($, _, bootstrapNotify, Fingerprint, sdk) {
    var enabledSteps = ['step-1'];
    var onStepsReset;
    var defaultPublisherQuality = 'hd';

    var init = function init() {
        $('#phenixRTCVersion').text(sdk.utils.rtc.phenixVersion);
        $('#browserName').text(sdk.utils.rtc.browser);
        $('#browserVersion').text(sdk.utils.rtc.browserVersion);

        if (sdk.utils.rtc.webrtcSupported) {
            $('#webrtc').addClass('success');
            $('#webrtc .support').removeClass('glyphicon-remove');
            $('#webrtc .support').addClass('glyphicon-ok');
        } else {
            $('#webrtc').addClass('danger');
            $('#webrtc .support').removeClass('glyphicon-ok');
            $('#webrtc .support').addClass('glyphicon-remove');
        }

        if (document.getElementById('environment')) {
            _.forOwn(getPCastEndpoints(), function(name, endpoint) {
                $('#environment').append($('<option></option>').attr('value', endpoint).text(name));
            });
        }

        if (getUrlParameter('url')) {
            $('#environment').append($('<option></option>').attr('value', getUrlParameter('url')).attr('selected', 'selected').text(getUrlParameter('url')));
        }

        if (getUrlParameter('applicationId')) {
            $('#applicationId').val(getUrlParameter('applicationId'));
        }

        if (getUrlParameter('secret')) {
            $('#secret').val(getUrlParameter('secret'));
        }

        if (getUrlParameter('streamId')) {
            $('#stream').append($('<option></option>').attr('value', getUrlParameter('streamId')).attr('selected', 'selected').text(getUrlParameter('streamId')));
            $('#originStreamId').val(getUrlParameter('streamId'));
        }

        if (getUrlParameter('channelAlias')) {
            $('#channelAlias').val(getUrlParameter('channelAlias'));
        }

        if (getUrlParameter('alias')) {
            $('#alias').val(getUrlParameter('alias'));
        }

        if (document.getElementById('publish-capabilities')) {
            _.forOwn(getPublisherCapabilities(), function(title, capability) {
                addButton('#publish-capabilities', title, capability);
            });
        }

        var rawPublisherCapabilities = getUrlParameter('publisher-capabilities') || getUrlParameter('pc');

        if (rawPublisherCapabilities) {
            var publisherCapabilities = _.trim(rawPublisherCapabilities, ',').split(',');

            _.forOwn(_.difference(publisherCapabilities, _.keys(getPublisherCapabilities())), function(capability) {
                addButton('#publish-capabilities', '[Custom] ' + capability, capability);
            });

            addClassByValues('#publish-capabilities', publisherCapabilities, 'clicked');
        }

        if (document.getElementById('subscriber-mode')) {
            _.forOwn(getSubscriberCapabilities(), function(title, capability) {
                addButton('#subscriber-mode', title, capability);
            });
        }

        if (document.getElementById('publish-audio-quality')) {
            _.forOwn(getPublisherAudioQualities(), function(title, quality) {
                var isSelected = false;

                addButton('#publish-audio-quality', title, quality, isSelected);
            });
        }

        if (document.getElementById('publish-video-quality')) {
            _.forOwn(getPublisherVideoQualities(), function(title, quality) {
                var isSelected = quality === defaultPublisherQuality;

                addButton('#publish-video-quality', title, quality, isSelected);
            });
        }

        if (document.getElementById('subscriber-drm-capabilities')) {
            _.forOwn(getDrmModifiers(), function(title, capability) {
                addButton('#subscriber-drm-capabilities', title, capability);
            });
        }

        var rawSubscriberCapabilities = getUrlParameter('subscriber-capabilities') || getUrlParameter('sc');

        if (rawSubscriberCapabilities) {
            var subscriberCapabilities = _.trim(rawSubscriberCapabilities, ',').split(',');
            var defaultSubscriberCapabilities = _.merge(getSubscriberCapabilities(), getDrmModifiers());

            _.forOwn(_.difference(subscriberCapabilities, _.keys(defaultSubscriberCapabilities)), function(capability) {
                addButton('#subscriber-mode', '[Custom] ' + capability, capability);
            });

            addClassByValues('#subscriber-mode', subscriberCapabilities, 'clicked');
            addClassByValues('#subscriber-drm-capabilities', subscriberCapabilities, 'clicked');
        }

        var updateOptions = function updateOptions() {
            $('input[name="option"]').each(function() {
                var option = $(this).val();

                $('.' + option).addClass('option-disabled');
            });

            var option = $('input[name="option"]:checked').val();

            $('.' + option).removeClass('option-disabled');
        };

        $('.form-multi-button-control button').click(function(){
            $(this).toggleClass('clicked');
        });

        $('.form-single-button-control button').click(function(){
            $(this).siblings().removeClass('clicked');
            $(this).toggleClass('clicked');
        });

        $('#environment').change(function() {
            if (onStepsReset) {
                onStepsReset();
            }
        });

        $('input[type="radio"]').on('change', function() {
            updateOptions();
        });

        updateOptions();
        enableSteps();
    };

    var getUri = function getUri() {
        return $('#environment option:selected').val();
    };

    var getBaseUri = function parseBaseUri() {
        var uri = getUri();
        var parser = document.createElement('a');
        parser.href = uri;

        var adminBaseUri = 'https://' + parser.hostname;

        if (parseInt(parser.port, 10)) {
            adminBaseUri += ':' + parser.port;
        }

        return getUrlParameter('adminUrl', adminBaseUri);
    };

    var getUrlParameter = function getUrlParameter(parameterName, defaultValue) {
        var queryParameters = window.location.search.substring(1).split('&');
        var queryParameter = _.find(queryParameters, function(queryParameter) {
            var equalsIndex = queryParameter.indexOf('=');
            var parameter = queryParameter.substring(0, equalsIndex);

            return parameter === parameterName || queryParameter === parameterName;
        }) || '';

        if (!queryParameter) {
            return defaultValue || '';
        }

        if (queryParameter.indexOf('=') === -1) {
            return 'true';
        }

        return queryParameter.substring(queryParameter.indexOf('=') + 1, queryParameter.length);
    };

    var getAuthData = function getAuthData() {
        return {
            applicationId: $('#applicationId').val(),
            secret: $('#secret').val()
        };
    };

    var setLoggerUserId = function setLoggerUserId(pcast) {
        if (!pcast) {
            return;
        }

        var logger = pcast.getLogger();

        logger.setUserId($('#applicationId').val());
    };

    var setLoggerEnvironment = function setLoggerEnvironment(pcast) {
        if (!pcast) {
            return;
        }

        var env = $('#environment').val().toLowerCase();
        var logger = pcast.getLogger();

        if(env.indexOf('local') > -1) {
            logger.setEnvironment('local');
        } else if (env.indexOf('stg')) {
            logger.setEnvironment('staging');
        } else {
            logger.setEnvironment('production');
        }
    };

    var setLoggerVersion = function setLoggerVersion(pcast) {
        pcast.getLogger().setApplicationVersion(version);
    };

    var enableSteps = function enableSteps() {
        $('.step').addClass('step-disabled');
        $('.step .server').removeClass('step-active');
        $('.step .client').removeClass('step-active');

        enabledSteps.forEach(function(step) {
            $('.' + step).removeClass('step-disabled');
        });

        $('.' + enabledSteps[enabledSteps.length - 1] + ' .server').addClass('step-active');
        $('.' + enabledSteps[enabledSteps.length - 1] + ' .client').addClass('step-active');

        if (!$('.' + enabledSteps[enabledSteps.length - 1]).length) {
            return;
        }

        if (getUrlParameter('auto-scroll') !== 'false') {
            $('html, body').animate({scrollTop: $('.' + enabledSteps[enabledSteps.length - 1]).offset().top - ($(window).height() / 3)}, 'slow');
        }
    };

    var activateStep = function activateStep(step) {
        enabledSteps.push(step);
        enableSteps();
    };

    function createNotification(type, message) {
        $.notify(message, {
            type: type,
            allow_dismiss: false, // eslint-disable-line camelcase
            placement: {
                from: 'bottom',
                align: 'right'
            },
            delay: 3000,
            animate: {
                enter: 'animated fadeInUp',
                exit: 'animated fadeOutDown'
            }
        });
    }

    var getModeFromAbbreviation = function getModeFromAbbreviation(mode) {
        switch (mode) {
        case 'r':
            return 'real-time';
        case 's':
            return 'streaming';
        case 'b':
            return 'broadcast';
        case 'l':
            return 'low-latency';
        default:
            return mode;
        }
    };

    var isMobile = function() {
        var userAgent = window.navigator.userAgent;
        var isIOS = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;

        return isIOS || /Android|webOS|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i.test(userAgent);
    };

    var getDefaultReplaceUrl = function() {
        if (getBaseUri().indexOf('stg') > -1) {
            return 'https://stg.phenixrts.com/video';
        }

        if (getBaseUri().indexOf('local') > -1) {
            return 'https://local.phenixrts.com:8443/video';
        }

        return 'https://phenixrts.com/video';
    };

    var getPCastEndpoints = function() {
        return {
            'https://pcast.phenixrts.com': 'Anycast (Closest Data Center)',
            'https://pcast-primary.phenixrts.com': 'Anycast (Closest Data Center - Primary)',
            'https://pcast-secondary.phenixrts.com': 'Anycast (Closest Data Center - Secondary)',
            'https://pcast-alternate.phenixrts.com': 'Anycast (Alternate Network)',
            'wss://pcast-asia-southeast.phenixrts.com': 'APAC South East',
            'wss://pcast-asia-east.phenixrts.com': 'APAC East',
            'wss://pcast-asia-east2.phenixrts.com': 'APAC East 2',
            'wss://pcast-asia-northeast.phenixrts.com': 'APAC North East',
            'wss://pcast-asia-south.phenixrts.com': 'APAC South',
            'wss://pcast-australia-southeast.phenixrts.com': 'Australia South East',
            'wss://pcast-us-west.phenixrts.com': 'US West',
            'wss://pcast-us-southwest.phenixrts.com': 'US South West',
            'wss://pcast-us-central.phenixrts.com': 'US Central',
            'wss://pcast-us-east.phenixrts.com': 'US East',
            'wss://pcast-us-northeast.phenixrts.com': 'US North East',
            'wss://pcast-northamerica-northeast.phenixrts.com': 'North America North East',
            'wss://pcast-southamerica-east.phenixrts.com': 'South America East',
            'wss://pcast-uk-southeast.phenixrts.com': 'UK South East',
            'wss://pcast-europe-west.phenixrts.com': 'EU West',
            'wss://pcast-europe-west2.phenixrts.com': 'EU West 2',
            'wss://pcast-europe-central.phenixrts.com': 'EU Central',
            'wss://pcast-europe-central2.phenixrts.com': 'EU Central 2',
            'wss://pcast-europe-north.phenixrts.com': 'EU North',
            'https://pcast-stg.phenixrts.com': 'Anycast - Staging',
            'wss://pcast-stg-us-central.phenixrts.com': 'US Central - Staging',
            'wss://pcast-stg-us-east.phenixrts.com': 'US East - Staging',
            'wss://pcast-stg-europe-west.phenixrts.com': 'EU West - Staging',
            'https://local.phenixrts.com:8443': 'Anycast - Local',
            'wss://local.phenixrts.com:8443': 'Local'
        };
    };

    var getPublisherCapabilities = function() {
        return {
            'prefer-vp8': 'VP8',
            'prefer-h264': 'H264',
            'archive': 'Archive',
            'archive-audio-only': 'Archive Audio Only',
            'streaming': 'Live',
            'on-demand': 'VOD',
            'streaming-lite': 'Lite for Live',
            'on-demand-lite': 'Lite for VOD',
            'time-shift-manifest': 'Time Shift',
            'low-latency': 'Low Latency for DASH+HLS',
            'mpegts-streaming': 'MP2T for DASH+HLS',
            'webm-streaming': 'WebM for DASH+HLS',
            'token-auth': 'Token Auth',
            'drm': 'DRM',
            'rtmp': 'RTMP',
            'mpegts-rtmp': 'MP2T for RTMP',
            'webm-rtmp': 'WebM for RTMP',
            'multi-bitrate': 'Multi Bitrate (MBR)',
            'multi-bitrate-codec=vp8': 'VP8 MBR Codec',
            'multi-bitrate-codec=h264': 'H264 MBR Codec',
            'multi-bitrate-encoding=offload': 'Offload MBR Encoding',
            'multi-bitrate-encoding=inline': 'Inline MBR Encoding',
            'constant-gop-size': 'Constant GOP',
            'dynamic-gop-size': 'Dynamic GOP',
            'uniform-gop-size': 'Uniform GOP',
            'constant-resolution': 'Constant Resolution',
            'aspect-ratio=16x9': '16x9',
            'aspect-ratio=4x3': '4x3',
            'aspect-ratio=9x16': '9x16',
            'aspect-ratio=3x4': '3x4',
            'aspect-ratio=1x1': '1x1',
            'resolution-limit=480': '480p',
            'resolution-limit=720': '720p',
            'bitrate-limit=150000': '150kbps',
            'bitrate-limit=280000': '280kbps',
            'bitrate-limit=500000': '500kbps',
            'bitrate-limit=650000': '650kbps',
            'bitrate-limit=1100000': '1.1Mbps',
            'resample=2/1': '2/1',
            'resample=3/2': '3/2',
            'encoding-profile=phenix-2019': 'Legacy Ladder',
            'encoding-profile=phenix-2020': 'New Ladder',
            'encoding-profile=phenix-2020-60fps': '60fps Ladder',
            'encoding-jitter-buffer=PT0.1S': '0.1s',
            'encoding-jitter-buffer=PT0.5S': '0.5s',
            'encoding-jitter-buffer=PT1.0S': '1.0s',
            'encoding-jitter-buffer=PT2.0S': '2.0s',
            'encoding-jitter-buffer=PT20S': '20s',
            'playout-buffer=PT0.1S': 'PB 0.1s',
            'playout-buffer=PT0.3S': 'PB 0.3s',
            'playout-buffer=PT0.5S': 'PB 0.5s',
            'playout-buffer=PT0.8S': 'PB 0.8s',
            'playout-buffer=PT1.0S': 'PB 1.0s',
            'playout-buffer=PT2.0S': 'PB 2.0s',
            'origin-shield': 'Origin Shield',
            'scale-wide': 'Scale Wide',
            'scale-elastic': 'Scale Elastic',
            'prefer-edge=origin': 'Edge Origin',
            'prefer-edge=origin-disallow': 'Disallow Edge Origin',
            'prefer-edge': 'Prefer Edge',
            'prefer-edge=avoid': 'Avoid Edge',
            'prefer-edge=disallow': 'Disallow Edge',
            'disable-nack': 'No NACKs',
            'disable-pli': 'No PLIs',
            'disable-fec': 'No FEC',
            'on-demand-archive=PT1M': 'VOD Archive (1 minute)',
            'on-demand-archive=PT1H': 'VOD Archive (1 hour)',
            'on-demand-archive=PT1D': 'VOD Archive (1 day)',
            'transcoding={"selectedQualities":["hd"]}': 'HD DASH+HLS only',
            'transcoding={"selectedQualities":["sd"]}': 'SD DASH+HLS only',
            'transcoding={"maxPlaylistPlaybackTime":"PT4M"}': '4m DASH+HLS playlists',
            'transcoding={"playlistStartOffset":"-PT10M"}': '10m playlist offset',
            'monitor-tracks': 'Monitor Tracks',
            'kill-session-on-stream-failure': 'Kill Session on Failure',
            'setup-deadline=PT5S': 'Setup in 5s or fail',
            'abandon-deadline=PT15S': 'Data in 15s or fail'
        };
    };

    var getSubscriberCapabilities = function() {
        return {
            'audio-only': 'Audio Only',
            'video-only': 'Video Only',
            'real-time': 'Real-time',
            'prefer-vp8': 'Real-time VP8 (Prefer)',
            'prefer-vp8=force': 'Real-time VP8 (Force)',
            'prefer-h264': 'Real-time H264 (Prefer)',
            'prefer-h264=force': 'Real-time H264 (Force)',
            'single-bitrate': 'Real-time SBR',
            'disable-nack': 'No NACKs',
            'disable-pli': 'No PLIs',
            'disable-fec': 'No FEC',
            'broadcast': 'Broadcast',
            'streaming': 'Live',
            'on-demand': 'On Demand',
            'rtmp': 'Rtmp',
            'time-shift': 'DVR',
            'any-stream': 'Any Stream'
        };
    };

    var getPublisherAudioQualities = function() {
        return {
            'video-only': 'Video Only',
            'default-fidelity': 'Default Fidelity',
            'high-fidelity': 'High Fidelity'
        };
    };

    var getPublisherVideoQualities = function() {
        return {
            'audio-only': 'Audio Only',
            'uld': 'ULD',
            'vvld': 'VVLD',
            'vld': 'VLD',
            'ld': 'LD',
            'sd': 'SD',
            'hd': 'HD',
            'fhd': 'FHD',
            'xhd': 'XHD',
            'uhd': 'UHD'
        };
    };

    var getDrmModifiers = function() {
        return {
            'drm-open-access': 'DRM - Open Access',
            'drm-hollywood': 'DRM - Hollywood'
        };
    };

    var addButton = function(containerSelector, caption, value, isSelected) {
        var button = $('<button>' + caption + '</button>').attr('value', value);

        if (isSelected) {
            button.addClass('clicked');
        }

        $(containerSelector).append(button);
    };

    var addClassByValues = function(containerSelector, values, clazz) {
        _.forEach(values, function(value) {
            var elements = $(containerSelector + ' [value=' + value + ']');

            elements.addClass(clazz);
        });
    };

    var getSwfFilePath = function() {
        return './flash/rtmp-flash-renderer-2019.2.18.swf';
    };

    var addDebugAppender = function(pcast) {
        pcast.getLogger().addAppender({
            log: function() {
                $.ajax({
                    url: '/log',
                    accepts: 'application/json',
                    contentType: 'application/json',
                    method: 'POST',
                    data: JSON.stringify({messages: arguments})
                });
            }
        });
    };

    return {
        init: init,
        getUri: getUri,
        getBaseUri: getBaseUri,
        getAuthData: getAuthData,
        getUrlParameter: getUrlParameter,
        enableSteps: enableSteps,
        activateStep: activateStep,
        createNotification: createNotification,
        setOnReset: function(callback) {
            onStepsReset = callback;
        },
        setLoggerUserId: setLoggerUserId,
        setLoggerEnvironment: setLoggerEnvironment,
        setLoggerVersion: setLoggerVersion,
        getModeFromAbbreviation: getModeFromAbbreviation,
        isMobile: isMobile,
        getDefaultReplaceUrl: getDefaultReplaceUrl,
        getSwfFilePath: getSwfFilePath,
        addDebugAppender: addDebugAppender
    };
});