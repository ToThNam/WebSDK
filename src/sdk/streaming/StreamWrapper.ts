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
    'phenix-web-assert',
    './stream.json'
], function(_, assert, streamEnums) {
    'use strict';

    function StreamWrapper(this: any, type: string, stream: object, logger: object) {
        assert.isStringNotEmpty(type, 'type');
        assert.isObject(stream, 'stream');
        assert.isObject(logger, 'logger');

        this._type = type;
        this._stream = stream;
        this._logger = logger;
        this._onPlayerEnd = null;

        var that = this;

        this._stream.on(streamEnums.streamEvents.playerEnded.name, function(reason: any) {
            that._logger.info('[%s] [%s] player ended.', that._stream.getStreamId(), that._type);

            that._playerEnded = true;

            if (that._onPlayerEnd) {
                return that._onPlayerEnd();
            }

            that.streamEndedCallback(StreamWrapper.getStreamEndedStatus(reason), reason);
        });
    }

    StreamWrapper.prototype.toString = function() {
        return 'Stream[' + (this._stream ? this._stream.getStreamId() : '') + ']';
    };

    StreamWrapper.prototype.on = function(name: any, callback: any) {
        return this._stream.on(name, callback);
    };

    // TODO(DY) Remove once 'on' is implemented on all Phenix Stream objects
    StreamWrapper.prototype.streamErrorCallback = function(errorSource: any, error: any) {
        if (!_.isFunction(this._stream.streamErrorCallback)) {
            this._logger.error('[%s] [%s] stream error event [%s]', this._stream.getStreamId(), this._type, error);
        } else {
            this._logger.debug('[%s] [%s] stream error event [%s]', this._stream.getStreamId(), this._type, error);
            this._stream.streamErrorCallback(this._stream, errorSource, error);
        }
    };

    StreamWrapper.prototype.streamEndedCallback = function(status: string, reason: string, waitForPlayerEnd: any) {
        var renderer = this._stream.getRenderer();

        if (this._isStreamEnded) {
            return;
        }

        if (waitForPlayerEnd && !this._onPlayerEnd && this._stream.isActive() && renderer && !this._playerEnded) {
            this._onPlayerEnd = _.bind(this.streamEndedCallback, this, status, reason);

            this._logger.info('[%s] [%s] stream ended. Waiting for end of player.', this._stream.getStreamId(), this._type);

            if (renderer) {
                renderer.stop(reason, waitForPlayerEnd);
            }

            return;
        }

        this._isStreamEnded = true;

        if (_.isFunction(this._stream.streamEndedCallback)) {
            this._stream.streamEndedCallback(this._stream, status, reason);
        }

        this._stream.stop(reason);

        if (renderer) {
            renderer.stop(reason, waitForPlayerEnd);
        }
    };

    StreamWrapper.prototype.dataQualityChangedCallback = function(status: string, reason: string) {
        var renderer = this._stream.getRenderer();

        if (!renderer) {
            return;
        }

        if (_.isFunction(renderer.dataQualityChangedCallback)) {
            renderer.dataQualityChangedCallback(renderer, status, reason);
        }
    };

    StreamWrapper.prototype.getPhenixMediaStream = function() {
        return this._stream;
    };

    StreamWrapper.getStreamEndedStatus = function getStreamEndedStatus(value: any) {
        switch (value) {
        case '':
        case 'none':
        case 'ended':
            return 'ended';
        case 'server-error':
        case 'session-error':
        case 'not-ready':
        case 'error':
        case 'died':
            return 'failed';
        case 'censored':
            return 'censored';
        case 'maintenance':
            return 'maintenance';
        case 'capacity':
            return 'capacity';
        case 'app-background':
            return 'app-background';
        case 'egress-failed':
            return 'egress-failed';
        case 'egress-setup-failed':
            return 'egress-setup-failed';
        case 'overload':
            return 'overload';
        default:
            return 'custom';
        }
    };

    return StreamWrapper;
});