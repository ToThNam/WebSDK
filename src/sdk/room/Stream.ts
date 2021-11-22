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

import { Stream_Update } from "../../../typescript/src/sdk/room/Steam";

define('',[
    'phenix-web-lodash-light',
    'phenix-web-assert',
    'phenix-web-observable',
    './stream.json',
    './track.json'
], function(_, assert, observable, stream, track) {
    'use strict';

    var streamTypes = stream.types;
    var trackStates = track.states;
    var oldPcastStreamPrefix = 'pcast://phenixp2p.com/';
    var pcastStreamPrefix = 'pcast://phenixrts.com/';

    function Stream(this: any, uri:string, type:string, audioState:string, videoState:string) {
        this.init(uri, type, audioState, videoState);
    }

    Stream.prototype.init = function(uri:string, type:string, audioState:string, videoState:string) {
        assert.isString(uri, 'uri');

        this._uri = new observable.Observable(uri);
        this._type = new observable.Observable(type, assertIsValidStreamType);
        this._audioState = new observable.Observable(audioState || trackStates.trackEnabled.name, assertIsValidTrackState);
        this._videoState = new observable.Observable(videoState || trackStates.trackEnabled.name, assertIsValidTrackState);
        this._streamId = Stream.parsePCastStreamIdFromStreamUri(uri);
    };

    Stream.prototype.getUri = function getUri() {
        return this._uri.getValue();
    };

    Stream.prototype.getType = function getType() {
        return this._type.getValue();
    };

    Stream.prototype.getObservableAudioState = function getObservableAudioState() {
        return this._audioState;
    };

    Stream.prototype.getObservableVideoState = function getObservableVideoState() {
        return this._videoState;
    };

    Stream.prototype.toJson = function toJson() {
        return {
            uri: this._uri.getValue(),
            type: this._type.getValue(),
            audioState: this._audioState.getValue(),
            videoState: this._videoState.getValue()
        };
    };

    Stream.prototype._update = function update(stream:Stream_Update ) {
        if (!_.isObject(stream)) {
            return;
        }

        if (Object.prototype.hasOwnProperty.call(stream, 'uri')) {
            if (stream.uri !== this._uri.getValue() && matchPCastStreams(stream.uri, this._uri.getValue())) {
                this._uri.setValue(stream.uri);

                this._streamId = Stream.parsePCastStreamIdFromStreamUri(stream.uri);
            }
        }

        if (Object.prototype.hasOwnProperty.call(stream, 'audioState')) {
            this._audioState.setValue(stream.audioState);
        }

        if (Object.prototype.hasOwnProperty.call(stream, 'videoState')) {
            this._videoState.setValue(stream.videoState);
        }
    };

    Stream.prototype.isPCastStream = function() {
        return !!this._streamId;
    };

    Stream.prototype.getPCastStreamId = function() {
        return this._streamId;
    };

    Stream.prototype.getInfo = function() {
        return parseStreamInfoFromStreamUri(this._uri.getValue());
    };

    Stream.getPCastPrefix = function() {
        return oldPcastStreamPrefix;
    };

    Stream.parsePCastStreamIdFromStreamUri = function(uri: string) {
        var hasPrefix = _.includes(uri, getPrefixToUse(uri));

        if (!hasPrefix) {
            return null;
        }

        return uri.replace(getPrefixToUse(uri), '').split('?')[0];
    };

    Stream.getInfoFromStreamUri = function(uri: string) {
        return parseStreamInfoFromStreamUri(uri);
    };

    function getPrefixToUse(uri: string) {
        if (_.includes(uri, oldPcastStreamPrefix)) {
            return oldPcastStreamPrefix;
        }

        return pcastStreamPrefix;
    }

    function matchPCastStreams(uriA: string, uriB: string) {
        return Stream.parsePCastStreamIdFromStreamUri(uriA) === Stream.parsePCastStreamIdFromStreamUri(uriB);
    }

    function parseStreamInfoFromStreamUri(uri: string) {
        var parsedUriInfo :any = {};
        var queryParamString = uri.split('?');

        if (queryParamString.length !== 2) {
            return parsedUriInfo;
        }

        var queryParamsString = queryParamString[1];
        var queryParams = queryParamsString.split('&');

        _.forEach(queryParams, function(param: string) {
            var parsedParams  = param.split('=');
            var key = parsedParams[0];
            var value = decodeURIComponent(parsedParams[1]);

            parsedUriInfo[key] = value;

            if (key === 'capabilities') {
                parsedUriInfo[key] = value ? (value.split(',') || []) : [];
            }
        });

        return parsedUriInfo;
    }

    function assertIsValidStreamType(type:string) {
        assert.isValidType(type, streamTypes, 'streamType');

        return _.getEnumName(streamTypes, type);
    }

    function assertIsValidTrackState(state:string) {
        assert.isValidType(state, trackStates, 'trackState');

        return _.getEnumName(trackStates, state);
    }

    return Stream;
});