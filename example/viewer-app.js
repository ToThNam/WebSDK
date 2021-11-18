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

var phenixWebSdk = 'phenix-web-sdk';
var params = window.location.search.substring(1).split('&');

for (var i = 0; i < params.length; i++) {
    if (params[i] === 'development') {
        phenixWebSdk = './web-sdk';
    }
}

/* global requirejs */
requirejs.config({
    paths: {
        'phenix-web-sdk': phenixWebSdk,
        'phenix-rtc': 'phenix-rtc/dist/phenix-rtc',
        'jquery': 'jquery/dist/jquery.min',
        'lodash': 'lodash/lodash.min',
        'bootstrap': 'bootstrap/dist/js/bootstrap.min',
        'protobuf': 'protobuf/dist/ProtoBuf.min',
        'bootstrap-notify': 'bootstrap-notify/bootstrap-notify.min',
        'fingerprintjs2': 'fingerprintjs2/dist/fingerprint2.min',
        'webrtc-adapter': 'webrtc-adapter/out/adapter',
        'shaka-player': 'shaka-player/dist/shaka-player.compiled',
        'video-player': 'player',
        'app-setup': 'app-setup',
        'phenix-web-lodash-light': 'phenix-web-lodash-light/dist/phenix-web-lodash-light.min',
        'phenix-web-assert': 'phenix-web-assert/dist/phenix-web-assert.min',
        'phenix-web-http': 'phenix-web-http/dist/phenix-web-http.min',
        'phenix-web-logging': 'phenix-web-logging/dist/phenix-web-logging.min',
        'phenix-web-observable': 'phenix-web-observable/dist/phenix-web-observable.min',
        'phenix-web-reconnecting-websocket': 'phenix-web-reconnecting-websocket/dist/phenix-web-reconnecting-websocket.min',
        'phenix-web-network-connection-monitor': 'phenix-web-network-connection-monitor/dist/phenix-web-network-connection-monitor.min',
        'phenix-web-proto': 'phenix-web-proto/dist/phenix-web-proto.min',
        'phenix-web-event': 'phenix-web-event/dist/phenix-web-event.min',
        'phenix-web-disposable': 'phenix-web-disposable/dist/phenix-web-disposable.min',
        'phenix-web-closest-endpoint-resolver': 'phenix-web-closest-endpoint-resolver/dist/phenix-web-closest-endpoint-resolver.min',
        'phenix-web-player': 'phenix-web-player/dist/phenix-web-player-bundled.min',
        'phenix-web-application-activity-detector': 'phenix-web-application-activity-detector/dist/phenix-web-application-activity-detector.min',
        'phenix-web-global': 'phenix-web-global/dist/phenix-web-global.min',
        'phenix-web-detect-browser': 'phenix-web-detect-browser/dist/phenix-web-detect-browser.min'
    }
});

requirejs([
    'jquery',
    'lodash',
    'phenix-web-sdk',
    'video-player',
    'app-setup'
], function($, _, sdk, Player, app) {
    var pcastExpress;
    var subscriberMediaStream = null;
    var subscriberPlayer = null;

    var init = function init() {
        var createPCastExpress = function createPCastExpress() {
            var adminApiProxyClient = new sdk.net.AdminApiProxyClient();

            adminApiProxyClient.setBackendUri(app.getBaseUri() + '/pcast');
            adminApiProxyClient.setAuthenticationData(app.getAuthData());

            var pcastOptions = {
                adminApiProxyClient: adminApiProxyClient,
                uri: app.getUri(),
                shakaLoader: function(callback) {
                    if (!app.getUrlParameter('shaka')) {
                        return callback(null);
                    }

                    requirejs(['shaka-player'], function(shaka) {
                        callback(shaka);
                    });
                },
                webPlayerLoader: function(callback) {
                    if (app.getUrlParameter('shaka')) {
                        return callback(null);
                    }

                    requirejs(['phenix-web-player'], function(webPlayer) {
                        callback(webPlayer);
                    });
                },
                authToken: 'dud',
                rtmp: {swfSrc: app.getSwfFilePath()},
                eagerlyCheckScreenSharingCapabilities: app.getUrlParameter('screenSharing') ? true : false
            };

            if (app.getUrlParameter('ssmr')) {
                pcastOptions.streamingSourceMapping = {
                    patternToReplace: app.getUrlParameter('ssmp') || app.getDefaultReplaceUrl(),
                    replacement: app.getUrlParameter('ssmr')
                };
            }

            if (app.getUrlParameter('features')) {
                pcastOptions.features = app.getUrlParameter('features').split(',');
            }

            pcastExpress = new sdk.express.PCastExpress(pcastOptions);

            if (app.getUrlParameter('debug') === 'true') {
                app.addDebugAppender(pcastExpress.getPCast());
            }
        };

        var listStreams = function listStreams() {
            var applicationId = $('#applicationId').val();
            var secret = $('#secret').val();

            if (applicationId === '' || secret === '') {
                return;
            }

            var data = {
                applicationId: applicationId,
                secret: secret,
                length: 256,
                options: ['global']
            };

            $.ajax({
                url: app.getBaseUri() + '/pcast/streams',
                accepts: 'application/json',
                contentType: 'application/json',
                method: 'PUT',
                data: JSON.stringify(data)
            }).done(function(result) {
                $('#stream').find('option').remove().end();

                if (result.streams.length > 0) {
                    $('#stream').append($('<option></option>').attr('value', '').text('Please select a stream'));

                    _.forEach(result.streams, function(stream) {
                        $('#stream').append($('<option></option>').attr('value', stream.streamId).text(stream.streamId));
                    });
                } else {
                    $('#stream').append($('<option></option>').attr('value', '').text('No stream available - Please publish a stream'));
                }
            }).fail(function(jqXHR, textStatus, errorThrown) {
                app.createNotification('danger', {
                    icon: 'glyphicon glyphicon-remove-sign',
                    title: '<strong>Streams</strong>',
                    message: 'Failed to list streams (' + (errorThrown || jqXHR.status) + ')'
                });
            });
        };

        var onStreamSelected = function onStreamSelected() {
            var streamId = $('#stream option:selected').text();

            if (streamId) {
                $('#originStreamId').val(streamId);
                app.activateStep('step-2');
            }
        };

        var subscribe = function subscribe() {
            var streamId = $('#originStreamId').val();
            var remoteVideoEl = $('#remoteVideo')[0];
            var capabilities = [];
            var subscriberOptions = {disableAudioIfNoOutputFound: true};

            $('#subscriber-mode button.clicked').each(function() {
                capabilities.push($(this).val());
            });

            $('#subscriber-drm-capabilities button.clicked').each(function() {
                capabilities.push($(this).val());
            });

            if (app.getUrlParameter('preferNative')) {
                subscriberOptions.preferNative = app.getUrlParameter('preferNative') === 'true';
            }

            if (app.getUrlParameter('targetLatency')) {
                subscriberOptions.targetLatency = parseFloat(app.getUrlParameter('targetLatency'));
            }

            pcastExpress.subscribe({
                streamId: streamId,
                capabilities: capabilities,
                videoElement: remoteVideoEl,
                monitor: {callback: onMonitorEvent},
                streamToken: 'dud',
                subscriberOptions: subscriberOptions
            }, function subscribeCallback(error, response) {
                if (error) {
                    return app.createNotification('danger', {
                        icon: 'glyphicon glyphicon-remove-sign',
                        title: '<strong>Subscribe</strong>',
                        message: 'Failed to subscribe to stream (' + error.message + ')'
                    });
                }

                if (response.status === 'offline') {
                    return app.createNotification('danger', {
                        icon: 'glyphicon glyphicon-remove-sign',
                        title: '<strong>Offline</strong>',
                        message: 'Disconnected from PCast'
                    });
                }

                if (response.status !== 'ok') {
                    return app.createNotification('danger', {
                        icon: 'glyphicon glyphicon-remove-sign',
                        title: '<strong>Subscribe</strong>',
                        message: 'Failed to subscribe to stream (' + response.status + ')'
                    });
                }

                if (subscriberPlayer) {
                    subscriberPlayer.stop();
                }

                app.createNotification('success', {
                    icon: 'glyphicon glyphicon-film',
                    title: '<strong>Stream</strong>',
                    message: 'Starting stream'
                });

                subscriberMediaStream = response.mediaStream;
                subscriberPlayer = new Player('remoteVideo');

                subscriberPlayer.start(subscriberMediaStream, response.renderer);

                $('#stopSubscriber').removeClass('disabled');
            });
        };

        function onMonitorEvent(error, response) {
            if (error) {
                return app.createNotification('danger', {
                    icon: 'glyphicon glyphicon-remove-sign',
                    title: '<strong>Monitor Event</strong>',
                    message: 'Monitor Event triggered for (' + error.message + ')'
                });
            }

            if (response.status !== 'ok') {
                app.createNotification('danger', {
                    icon: 'glyphicon glyphicon-remove-sign',
                    title: '<strong>Monitor Event</strong>',
                    message: 'Monitor Event triggered (' + response.status + ')'
                });
            }

            if (response.retry) {
                response.retry();
            }
        }

        app.setOnReset(function() {
            createPCastExpress();
            listStreams();
        });

        $('#subscribe').click(subscribe);
        $('#stopSubscriber').click(_.bind(stopSubscriber, null, 'stopped-by-user'));
        $('#stream-refresh').click(listStreams);
        $('#stream').change(onStreamSelected);

        createPCastExpress();
        listStreams();
    };

    var stopSubscriber = function(reason) {
        if (subscriberMediaStream) {
            subscriberMediaStream.stop(reason);
            subscriberMediaStream = null;
            $('#stopSubscriber').addClass('disabled');
        }

        if (subscriberPlayer) {
            subscriberPlayer.stop();
        }
    };

    $('#applicationId').change(function() {
        stopSubscriber();
        init();
    });

    $('#secret').change(function() {
        stopSubscriber();
        init();
    });

    $(function() {
        app.init();
        init();
    });
});