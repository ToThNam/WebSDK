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
    'bootstrap-notify',
    'fingerprintjs2',
    'phenix-web-sdk',
    'video-player',
    'app-setup'
], function($, _, bootstrapNotify, Fingerprint, sdk, Player, app) {
    var init = function init() {
        var primaryPlayer = null;
        var secondaryPlayer = null;

        if (app.getUrlParameter('streamId')) {
            $('#stream').append($('<option></option>').attr('value', app.getUrlParameter('streamId')).attr('selected', 'selected').text(app.getUrlParameter('streamId')));
            $('#originStreamId').val(app.getUrlParameter('streamId'));
        }

        var adminBaseUri;
        var pcast;

        var createPCast = function createPCast() {
            if (pcast) {
                pcast.stop();
            }

            var uri = app.getUri();

            adminBaseUri = app.getBaseUri();

            Fingerprint.get(function(components) {
                var values = components.map(function(component) {
                    return component.value;
                });
                var murmur = Fingerprint.x64hash128(values.join(''), 31);

                pcast = new sdk.lowLevel.PCast({
                    uri: uri,
                    deviceId: murmur,
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
                    }
                });

                if (app.getUrlParameter('debug') === 'true') {
                    app.addDebugAppender(pcast);
                }

                app.setLoggerUserId(pcast);
                app.setLoggerEnvironment(pcast);
                app.setLoggerVersion(pcast);
            });
        };

        var createAuthToken = function createAuthToken() {
            var data = app.getAuthData();

            $.ajax({
                url: adminBaseUri + '/pcast/auth',
                accepts: 'application/json',
                contentType: 'application/json',
                method: 'POST',
                data: JSON.stringify(data)
            }).done(function(result) {
                $('.authToken').val(result.authenticationToken);
                app.activateStep('step-2');
                setTimeout(function() {
                    app.activateStep('step-3');
                }, 1500);
            }).fail(function(jqXHR, textStatus, errorThrown) {
                app.createNotification('danger', {
                    icon: 'glyphicon glyphicon-remove-sign',
                    title: '<strong>Auth</strong>',
                    message: 'Failed to create authentication token (' + (errorThrown || jqXHR.status) + ')'
                });
            });
        };

        var start = function start() {
            pcast.start($('#authToken').val(), function authenticateCallback(pcast, status, sessionId) {
                $('#stop').removeClass('disabled');
                $('.sessionId').val(sessionId);
            }, function onlineCallback() {
                app.createNotification('success', {
                    icon: 'glyphicon glyphicon-log-in',
                    title: '<strong>Online</strong>',
                    message: 'Connected to PCast&trade;'
                });
                app.activateStep('step-4');
                setTimeout(function() {
                    app.activateStep('step-5');
                }, 1500);
            }, function offlineCallback() {
                app.createNotification('warning', {
                    icon: 'glyphicon glyphicon-log-out',
                    title: '<strong>Offline</strong>',
                    message: 'Disconnected from PCast&trade;'
                });
            });
        };

        var stop = function stop() {
            pcast.stop();
            $('.sessionId').val('');
            $('#stop').addClass('disabled');
        };

        var publisher;

        var parseArray = function parseArray(stringWithNewlineSeparator) {
            if (!stringWithNewlineSeparator) {
                return [];
            }

            return stringWithNewlineSeparator.split('\n');
        };

        var publish = function publish() {
            var sourceUri = $('#sourceUriForPublishing').val();
            var sourceOptions = parseArray($('#sourceOptionsForPublishing').val());

            if (!sourceUri) {
                app.createNotification('danger', {
                    icon: 'glyphicon glyphicon-cd',
                    title: '<strong>Source URI</strong>',
                    message: 'Please provide a source URI before publishing'
                });

                return;
            }

            var streamToken = $('#streamTokenForPublishing').val();

            if (!streamToken) {
                app.createNotification('danger', {
                    icon: 'glyphicon glyphicon-facetime-video',
                    title: '<strong>Stream Token</strong>',
                    message: 'Please create a stream token before publishing'
                });

                return;
            }

            var tags = [];

            var publishCallback = function publishCallback(pcast, status, phenixPublisher) {
                if (status !== 'ok') {
                    app.createNotification('danger', {
                        icon: 'glyphicon glyphicon-remove-sign',
                        title: '<strong>Publish</strong>',
                        message: 'Failed to publish stream (' + status + ')'
                    });

                    return;
                }

                stopPublisher();

                publisher = phenixPublisher;
                $('#stopPublisher').removeClass('disabled');

                publisher.setDataQualityChangedCallback(function(publisher, status, reason) {
                    app.createNotification('info', {
                        icon: 'glyphicon glyphicon-film',
                        title: '<strong>Publish</strong>',
                        message: 'Data quality update: sending ' + status + ' with limitation ' + reason
                    });
                });

                publisher.setPublisherEndedCallback(function(publisher, reason) {
                    app.createNotification('info', {
                        icon: 'glyphicon glyphicon-film',
                        title: '<strong>Publish</strong>',
                        message: 'The published stream ended for reason "' + reason + '"'
                    });
                });

                app.createNotification('success', {
                    icon: 'glyphicon glyphicon-film',
                    title: '<strong>Publish</strong>',
                    message: 'Started publishing stream "' + publisher.getStreamId() + '"'
                });

                $('.streamIdForPublishing').val(publisher.getStreamId());
                $('#originStreamId').val(publisher.getStreamId());
                app.activateStep('step-8');
                setTimeout(function() {
                    app.activateStep('step-9');
                }, 1500);
            };

            var options = {connectOptions: sourceOptions};

            pcast.publish(streamToken, sourceUri, publishCallback, tags, options);
        };

        var stopPublisher = function() {
            if (publisher) {
                publisher.stop();
                publisher = null;
                $('#stopPublisher').addClass('disabled');
                $('.streamIdForPublishing').val('');
            }
        };

        var onStreamSelected = function onStreamSelected() {
            var streamId = $('#stream option:selected').text();

            if (streamId) {
                $('#originStreamId').val(streamId);
                app.activateStep('step-6');
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
                url: adminBaseUri + '/pcast/streams',
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

        var createStreamToken = function createStreamToken(targetElementSelector, applicationId, secret, sessionId, originStreamId, capabilities, callback) {
            var data = {
                applicationId: applicationId,
                secret: secret,
                sessionId: sessionId,
                originStreamId: originStreamId,
                capabilities: capabilities
            };

            $.ajax({
                url: adminBaseUri + '/pcast/stream',
                accepts: 'application/json',
                contentType: 'application/json',
                method: 'POST',
                data: JSON.stringify(data)
            }).done(function(result) {
                $(targetElementSelector).val(result.streamToken);
                app.createNotification('success', {
                    icon: 'glyphicon glyphicon-film',
                    title: '<strong>Stream</strong>',
                    message: 'Created token for stream "' + originStreamId + '"'
                });
                callback(result.streamToken);
            }).fail(function(jqXHR, textStatus, errorThrown) {
                app.createNotification('danger', {
                    icon: 'glyphicon glyphicon-remove-sign',
                    title: '<strong>Stream</strong>',
                    message: 'Failed to create stream token (' + (errorThrown || jqXHR.status) + ')'
                });
            });
        };

        var createStreamTokenForPublishing = function createStreamTokenForPublishing() {
            var applicationId = $('#applicationId').val();
            var secret = $('#secret').val();
            var sessionId = $('#sessionIdForPublishing').val();
            var originStreamId = $('#originStreamIdForPublishing').val() || '';
            var capabilities = [];

            $('#publish-capabilities button.clicked').each(function() {
                capabilities.push($(this).val());
            });

            capabilities.push('publish-uri');

            var audioQuality = $('#publish-audio-quality button.clicked').val();

            if (audioQuality) {
                capabilities.push(audioQuality);
            }

            var videoQuality = $('#publish-video-quality button.clicked').val();

            if (videoQuality) {
                capabilities.push(videoQuality);
            }

            return createStreamToken('.streamTokenForPublishing', applicationId, secret, sessionId, originStreamId, capabilities, function() {
                app.activateStep('step-6');
                setTimeout(function() {
                    app.activateStep('step-7');
                }, 1500);
            });
        };

        var createStreamTokenForViewing = function createStreamTokenForViewing() {
            var applicationId = $('#applicationId').val();
            var secret = $('#secret').val();
            var sessionId = $('#sessionIdForViewing').val();
            var originStreamId = $('#originStreamId').val();
            var capabilities = [];

            $('#subscriber-mode button.clicked').each(function() {
                capabilities.push($(this).val());
            });

            $('#subscriber-drm-capabilities button.clicked').each(function() {
                capabilities.push($(this).val());
            });

            return createStreamToken('.streamTokenForViewing', applicationId, secret, sessionId, originStreamId, capabilities, function() {
                app.activateStep('step-10');
                setTimeout(function() {
                    app.activateStep('step-11');
                }, 1500);
            });
        };

        var subscriberMediaStream = null;

        var subscribe = function subscribe() {
            var streamToken = $('#streamTokenForViewing').val();

            pcast.subscribe(streamToken, function subscribeCallback(pcast, status, mediaStream) {
                if (status !== 'ok') {
                    app.createNotification('danger', {
                        icon: 'glyphicon glyphicon-remove-sign',
                        title: '<strong>Subscribe</strong>',
                        message: 'Failed to subscribe to stream (' + status + ')'
                    });

                    return;
                }

                mediaStream.setStreamEndedCallback(function(mediaStream, reason) {
                    $.notify({
                        icon: 'glyphicon glyphicon-film',
                        title: '<strong>Stream</strong>',
                        message: 'The stream ended for reason "' + reason + '"'
                    }, {
                        type: 'info',
                        allow_dismiss: false, // eslint-disable-line camelcase
                        placement: {
                            from: 'bottom',
                            align: 'right'
                        },
                        delay: 5000,
                        animate: {
                            enter: 'animated fadeInUp',
                            exit: 'animated fadeOutDown'
                        }
                    });
                });

                stopSubscriber();

                mediaStream.monitor({}, monitorStream);

                var primaryMediaStream = mediaStream.select(function(track, index) {
                    return (track.kind === 'video' || track.kind === 'audio') && index < 2;
                });

                primaryPlayer = new Player('remoteVideo');

                primaryPlayer.start(primaryMediaStream);

                if (mediaStream.getStream() && mediaStream.getStream().getTracks().length > 2) {
                    var secondaryMediaStream = mediaStream.select(function(track, index) {
                        return track.kind === 'video' && index === 2;
                    });

                    secondaryPlayer = new Player('remoteVideoSecondary');

                    secondaryPlayer.start(secondaryMediaStream);
                }

                app.createNotification('success', {
                    icon: 'glyphicon glyphicon-film',
                    title: '<strong>Stream</strong>',
                    message: 'Starting stream'
                });

                subscriberMediaStream = mediaStream;
                $('#stopSubscriber').removeClass('disabled');
            });
        };

        var stopSubscriber = function(reason) {
            if (subscriberMediaStream) {
                subscriberMediaStream.stop(reason);
                subscriberMediaStream = null;
                $('#stopSubscriber').addClass('disabled');
            }

            if (primaryPlayer) {
                primaryPlayer.stop();
            }

            if (secondaryPlayer) {
                secondaryPlayer.stop();
            }
        };

        var monitorStream = function monitorStream(stream, reason) {
            switch (reason) {
            case 'client-side-failure':
                app.createNotification('danger', {
                    icon: 'glyphicon glyphicon-remove-sign',
                    title: '<strong>Monitor</strong>',
                    message: 'Stream Failure'
                });

                // Handle failure event, redo stream
                break;
            default:
                app.createNotification('success', {
                    icon: 'glyphicon glyphicon-film',
                    title: '<strong>Monitor</strong>',
                    message: 'Stream Healthy'
                });

                // No failure has occurred, handle monitor event
                break;
            }
        };

        app.setOnReset(function() {
            createPCast();
            app.setLoggerEnvironment(pcast);
            listStreams();
        });

        $('#applicationId').change(function() {
            listStreams();
            app.setLoggerUserId(pcast);
        });

        $('#secret').change(listStreams);
        $('#createAuthToken').click(createAuthToken);

        $('#start').click(start);
        $('#stop').click(stop);

        $('#createStreamTokenForPublishing').click(createStreamTokenForPublishing);
        $('#publish').click(publish);
        $('#stopPublisher').click(stopPublisher);
        $('#stream').change(onStreamSelected);
        $('#stream-refresh').click(listStreams);

        $('#createStreamTokenForViewing').click(createStreamTokenForViewing);

        $('#subscribe').click(subscribe);
        $('#stopSubscriber').click(_.bind(stopSubscriber, null, 'stopped-by-user'));

        createPCast();
    };

    $(function() {
        app.init();
        init();
    });
});