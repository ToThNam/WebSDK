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

define('video-player', [
    'jquery',
    'phenix-web-lodash-light',
    'phenix-web-sdk',
    'phenix-rtc'
], function($, _, sdk, rtc) {
    var userAgent = window.navigator.userAgent;
    var isIOS = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;
    var isMobile = isIOS || /Android|webOS|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i.test(userAgent);

    var Player = function(elementId, options) {
        this.videoId = elementId;
        this.video = document.getElementById(elementId);
        this.videoControls = null;
        this.onEnd = null;
        this.options = options;

        if (!this.video) {
            throw new Error('Unable to find video.');
        }

        this.shouldVideoBeHidden = this.video.className.indexOf('hidden') > -1;
    };

    Player.prototype.start = function start(stream, renderer) {
        var that = this;
        this.stream = stream.getStream ? stream.getStream() : stream;
        this.videoControls = createVideoControls.call(this);

        this.video.parentNode.insertBefore(this.videoControls, this.video.nextElementSibling);

        // Disable audio for autoplay
        if ((isIOS || isMobile || (rtc.browser === 'Safari' && rtc.browserVersion >= 11)) && !this.stream) {
            this.video.muted = true;
            this.video.autoplay = true;
            this.video.attributes.playsinline = "";
            this.video.attributes['webkit-playsinline'] = "";

            if (!(rtc.browser === 'Safari' && rtc.browserVersion >= 11)) {
                this.video.play();
            }
        }

        setupVideoEvents.call(this);
        displayVideoElementAndControlsWhileStreamIsActive.call(this, this.stream, this.video, this.onEnd);

        if (!renderer && stream.createRenderer) {
            renderer = stream.createRenderer();

            renderer.addVideoDisplayDimensionsChangedCallback(function(renderer, dimensions) {
                changePlayerVideoDimensions.call(that, dimensions);
            });

            renderer.on('autoMuted', _.bind(updateMuteClass, this, this.stream, this.video));

            renderer.start(this.video);
        } else if (!renderer && sdk.utils.rtc.attachMediaStream) {
            sdk.utils.rtc.attachMediaStream(this.video, this.stream);
        }

        if (renderer) {
            this.renderer = renderer;
            this.video.__renderer = this.renderer;
        }
    };

    Player.prototype.stop = function stop() {
        if (this.videoControls && this.videoControls.remove) {
            this.videoControls.remove();
        } else if (this.videoControls) {
            this.videoControls.parentNode.removeChild(this.videoControls);
        }

        this.videoControls = null;

        if (!this.onEnd) {
            onStreamEnd.call(this);
        }

        this.onEnd = null;

        if (this.renderer) {
            this.renderer.stop();

            this.video.__renderer = null;
            this.renderer = null;
        }
    };

    Player.prototype.reevaluteMuteState = function reevaluteMuteState() {
        return updateMuteClass.call(this, this.stream, this.video);
    };

    function setupVideoEvents() {
        var that = this;
        var newVideo = this.video;

        if (!this.stream) {
            return newVideo;
        }

        if (this.stream.setStreamEndedCallback) {
            this.onEnd = _.bind(this.stream.setStreamEndedCallback, this.stream);
        } else if (this.stream.setPublisherEndedCallback) {
            this.onEnd = _.bind(this.stream.setPublisherEndedCallback, this.stream);
        } else if (this.stream.getTracks) {
            this.onEnd = function setOnEnded(callback) {
                that.stream.getTracks()[0].onended = callback;
            };
        }

        return newVideo;
    }

    function createVideoControls() {
        var element = document.createElement('div');

        element.className = 'video-controls';
        element.appendChild(createPlayVideoControl.call(this));
        element.appendChild(createPauseVideoControl.call(this));
        element.appendChild(createMuteAudioControl.call(this));
        element.appendChild(createMuteVideoControl.call(this));
        element.appendChild(createFullscreenControl.call(this));

        _.forEach(createTimingControls.call(this), function(timingControl) {
            element.appendChild(timingControl);
        });

        return element;
    }

    function createPlayVideoControl() {
        var element = document.createElement('span');

        element.className = 'glyphicon glyphicon-play play video-control';

        if (element.dataset) {
            element.dataset.targetVideo = this.videoId;
        }

        element.onclick = handlePlayButtonClick.bind(this);

        return element;
    }

    function createPauseVideoControl() {
        var element = document.createElement('span');

        element.className = 'glyphicon glyphicon-pause video-control pause';

        if (element.dataset) {
            element.dataset.targetVideo = this.videoId;
        }

        element.onclick = handlePauseButtonClick.bind(this);

        return element;
    }

    function createMuteVideoControl() {
        var element = document.createElement('span');

        element.className = 'glyphicon glyphicon-facetime-video toggle-off video-control mute-video';

        if (element.dataset) {
            element.dataset.targetVideo = this.videoId;
        }

        element.onclick = handleMuteVideoButtonClick.bind(this);

        return element;
    }

    function createMuteAudioControl() {
        var element = document.createElement('span');

        element.className = 'glyphicon glyphicon-volume-off video-control mute';

        if (element.dataset) {
            element.dataset.targetVideo = this.videoId;
        }

        element.onclick = handleMuteButtonClick.bind(this);

        return element;
    }

    function createFullscreenControl() {
        var element = document.createElement('span');

        element.className = 'glyphicon glyphicon-fullscreen video-control fullscreen';

        if (element.dataset) {
            element.dataset.targetVideo = this.videoId;
        }

        element.onclick = handleFullscreenButtonClick.bind(this);

        return element;
    }

    function createTimingControls() {
        var timingElements = [{
            className: 'currentTime',
            title: 'Current Time'
        }, {
            className: 'lag',
            title: 'Estimated Lag'
        }, {
            className: 'buffered',
            title: 'Buffered Time'
        }, {
            className: 'bufferSize',
            title: 'Buffered Size'
        }];

        return _.map(timingElements, function(timingElement) {
            var element = document.createElement('span');

            element.className = 'video-control ' + timingElement.className;

            if (element.dataset) {
                element.dataset.targetVideo = this.videoId;
            }

            element.title = timingElement.title;
            element.innerHTML = '0.0';

            return element;
        });
    }

    var setVideoWidthAndHeight = function setVideoWithAndHeight(dimensions, options) {
        if (rtc.browser === 'Edge') {
            return;
        }

        var videoOptions = options || {};
        var minWidth = videoOptions.minWidth || 160;
        var minHeight = videoOptions.minHeight || 120;
        var maxWidth = videoOptions.maxWidth || 640;
        var maxHeight = videoOptions.maxHeight || 480;

        this.video.width = dimensions.width <= minWidth ? minWidth : dimensions.width > maxWidth ? maxWidth : dimensions.width;
        this.video.height = dimensions.height <= minHeight ? minHeight : dimensions.height > maxHeight ? maxHeight : dimensions.height;
    };

    function changePlayerVideoDimensions(dimensions) {
        console.log('Meta data, width=' + dimensions.width + ', height=' + dimensions.height);

        $.notify({
            icon: 'glyphicon glyphicon-film',
            title: '<strong>Video</strong>',
            message: 'The video dimensions are ' + dimensions.width + ' x ' + dimensions.height
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

        setVideoWidthAndHeight.call(this, dimensions, this.options);
    }

    var displayVideoElementAndControlsWhileStreamIsActive = function displayVideoElementAndControlsWhileStreamIsActive(stream, videoElement, onEnd) {
        var video = $(videoElement);
        var videoControlsContainer = $(this.videoControls);
        var videoControls = $(videoControlsContainer).children();

        if (this.shouldVideoBeHidden) {
            video.removeClass('hidden');
        }

        videoControls.removeClass('hidden');

        updateMuteClass.call(this, stream, videoElement);

        this.lastUpdate = 0;
        this.boundOnTimeUpdate = videoElementOnTimeUpdate.bind(this);

        _.addEventListener(videoElement, 'timeupdate', this.boundOnTimeUpdate);

        if (onEnd) {
            onEnd(onStreamEnd.bind(this));
        }
    };

    var updateMuteClass = function updateMuteClass(stream, videoElement) {
        var video = $(videoElement);
        var videoControlsContainer = $(this.videoControls);

        if (stream) {
            var isLocal = video.hasClass('local');
            var isAudioMuted = !isMediaStreamTrackEnabled(stream.getAudioTracks()) || (!isLocal && video[0] && video[0].muted);
            var isVideoMuted = !isMediaStreamTrackEnabled(stream.getVideoTracks());

            setAudioMuteClass(isAudioMuted, $(videoControlsContainer).find('.mute'));
            setVideoMuteClass(isVideoMuted, $(videoControlsContainer).find('.mute-video'));
        } else {
            $(videoControlsContainer).find('.mute-video').addClass('hidden');
        }
    };

    var onStreamEnd = function onStreamEnd() {
        var videoControlsContainer = $(this.videoControls);
        var videoControls = $(videoControlsContainer).children();

        if (this.shouldVideoBeHidden) {
            this.video.className += ' hidden';
        }

        videoControls.addClass('hidden');

        if (this.boundOnTimeUpdate) {
            _.removeEventListener(this.video, 'timeupdate', this.boundOnTimeUpdate);
        }

        this.boundOnTimeUpdate = null;
        this.lastUpdate = 0;
    };

    var videoElementOnTimeUpdate = function videoElementOnTimeUpdate() {
        var videoControlsContainer = $(this.videoControls);
        var stat = processTimeUpdate(this.video);

        $(videoControlsContainer).find('.currentTime').html(stat.currentTime.toFixed(1) + ' s');
        $(videoControlsContainer).find('.lag').html(stat.lag.toFixed(1) + ' s');
        $(videoControlsContainer).find('.buffered').html(stat.buffered.toFixed(1) + ' s');
        $(videoControlsContainer).find('.bufferSize').html(stat.bufferSize.toFixed(1) + ' s');

        if (userAgent.match(/iPad/i) || userAgent.match(/iPhone/i)) {
            // Force the player to buffer less than 10 seconds
            if (stat.bufferSize > 10 && (this.lastUpdate + 30000) < stat.now) {
                this.lastUpdate = stat.now;
                this.video.currentTime = this.video.currentTime + (stat.bufferSize - 4);
            }
        }
    };

    var processTimeUpdate = function processTimeUpdate(video) {
        var now = _.now();
        var currentTime = video.currentTime;
        var buffered = video.buffered;
        var bufferedEnd = 0;
        var lag = -1;
        var stats = {};

        if (buffered && buffered.length > 0) {
            bufferedEnd = buffered.end(buffered.length - 1);
            video.bufferSize = Math.max(bufferedEnd - currentTime, video.bufferSize || 0);
        } else {
            video.bufferSize = Math.max(0, video.bufferSize || 0);
        }

        if (video.__renderer) {
            stats = video.__renderer.getStats();

            lag = stats.lag;
        }

        if (!video.lastBufferReport || (now - video.lastBufferReport) > 30000) {
            console.log('Current time: ' + currentTime + ' Lag: ' + lag + ' Buffered: ' + bufferedEnd + ' |Buffer|: ' + video.bufferSize + ' ' + JSON.stringify(stats));
            video.lastBufferReport = now;
            video.bufferSize = 0;
        }

        return {
            now: now,
            currentTime: currentTime,
            lag: lag,
            buffered: bufferedEnd,
            bufferSize: video.bufferSize
        };
    };

    var handlePlayButtonClick = function handlePlayButtonClick(clickEvent) {
        var element = clickEvent.target;

        if (!_.get(element, ['dataset', 'targetVideo'])) {
            throw new Error('Button Must Have Target');
        }

        console.log('Play ' + _.get(element, ['dataset', 'targetVideo']));

        var video = $('#' + _.get(element, ['dataset', 'targetVideo']))[0];

        video.play();
    };

    var handlePauseButtonClick = function handlePauseButtonClick(clickEvent) {
        var element = clickEvent.target;

        if (!_.get(element, ['dataset', 'targetVideo'])) {
            throw new Error('Button Must Have Target');
        }

        console.log('Pause ' + _.get(element, ['dataset', 'targetVideo']));

        var video = $('#' + _.get(element, ['dataset', 'targetVideo']))[0];

        video.pause();
    };

    var handleFullscreenButtonClick = function handleFullscreenButtonClick(clickEvent) {
        var element = clickEvent.target;

        if (!_.get(element, ['dataset', 'targetVideo'])) {
            throw new Error('Button Must Have Target');
        }

        requestFullscreen(this.video);
    };

    var handleMuteButtonClick = function handleMuteButtonClick(clickEvent) {
        var element = clickEvent.target;
        var video = $('#' + _.get(element, ['dataset', 'targetVideo']));
        var isLocal = video.hasClass('local');
        var isAudioMuted;
        var shallBeMuted;

        if (!_.get(element, ['dataset', 'targetVideo'])) {
            throw new Error('Button Must Have Target');
        }

        if (this.stream) {
            isAudioMuted = !isMediaStreamTrackEnabled(this.stream.getAudioTracks()) || (!isLocal && video[0] && video[0].muted);
            shallBeMuted = setMediaStreamTrackEnabled(this.stream.getAudioTracks(), !isAudioMuted);
        } else {
            isAudioMuted = !isLocal && video[0] && video[0].muted;
            shallBeMuted = !isAudioMuted;
        }

        if (!isLocal && video[0]) {
            video[0].muted = shallBeMuted;
        }

        setAudioMuteClass(shallBeMuted, $(element));
    };

    var handleMuteVideoButtonClick = function handleMuteVideoButtonClick(clickEvent) {
        var element = clickEvent.target;

        if (!_.get(element, ['dataset', 'targetVideo'])) {
            throw new Error('Button Must Have Target');
        }

        if (this.stream) {
            var isVideoMuted = !isMediaStreamTrackEnabled(this.stream.getVideoTracks());
            var isMuted = setMediaStreamTrackEnabled(this.stream.getVideoTracks(), !isVideoMuted);

            setVideoMuteClass(isMuted, $(element));
        }
    };

    var requestFullscreen = function requestFullScreen(element) {
        if (!element) {
            throw new Error('Element required to request full screen');
        }

        if (element.requestFullscreen) {
            element.requestFullscreen();
        } else if (element.mozRequestFullScreen) {
            element.mozRequestFullScreen();
        } else if (element.webkitRequestFullScreen) {
            element.webkitRequestFullScreen();
        } else if (element.msRequestFullscreen) {
            element.msRequestFullscreen();
        }
    };

    var isMediaStreamTrackEnabled = function(tracks) {
        if (!tracks || !tracks.length) {
            return false;
        }

        return tracks[0].enabled;
    };

    var setMediaStreamTrackEnabled = function setMediaStreamTrackEnabled(tracks, enabled) {
        if (!tracks || !tracks.length) {
            return false;
        }

        _.forEach(tracks, function(track) {
            track.enabled = !enabled;
        });

        return enabled;
    };

    var setAudioMuteClass = function setAudioMuteClass(isMuted, element) {
        if (isMuted) {
            element.removeClass('glyphicon-volume-up');
            element.addClass('glyphicon-volume-off');
        } else {
            element.addClass('glyphicon-volume-up');
            element.removeClass('glyphicon-volume-off');
        }
    };

    var setVideoMuteClass = function setVideoMuteClass(isMuted, element) {
        if (isMuted) {
            element.addClass('toggle-off');
        } else {
            element.removeClass('toggle-off');
        }
    };

    return Player;
});