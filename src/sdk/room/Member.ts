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

import { Member_Update, Stream_CreateNewObservableStream, Stream_forEach } from "../../../typescript/src/sdk/room/Member";

define('',[
    'phenix-web-lodash-light',
    'phenix-web-assert',
    'phenix-web-observable',
    './Stream',
    './member.json'
], function(_, assert, observable, Stream, member) {
    'use strict';
    var memberRoles = member.roles;
    var memberStates = member.states;

    function Member(this: any, roomService: object, state: any, sessionId: string, screenName: string, role: string, streams: any[], lastUpdate: number) {
        this.init(roomService, state, sessionId, screenName, role, streams, lastUpdate);
    }

    Member.prototype.init = function init(roomService: object, state: any, sessionId: string, screenName: string, role: string, streams: any[], lastUpdate: number) {
        assert.isObject(roomService, 'roomService');
        assert.isString(sessionId, 'sessionId');
        assert.isString(screenName, 'screenName');
        assert.isArray(streams, 'streams');
        assert.isNumber(_.utc(lastUpdate), 'lastUpdate');

        this._sessionId = new observable.Observable(sessionId);
        this._screenName = new observable.Observable(screenName);
        this._streams = new observable.ObservableArray([]);

        this._state = new observable.Observable(state, assertIsValidMemberState).extend({rateLimit: 500});
        this._role = new observable.Observable(role, assertIsValidMemberRole);
        this._lastUpdate = new observable.Observable(lastUpdate, _.utc);
        this._roomService = roomService;

        this.setStreams(streams);
    };

    Member.prototype.getObservableState = function getObservableState() {
        return this._state;
    };

    Member.prototype.getSessionId = function getSessionId() {
        return this._sessionId.getValue();
    };

    Member.prototype.getObservableScreenName = function getObservableScreenName() {
        return this._screenName;
    };

    Member.prototype.getObservableRole = function getObservableRole() {
        return this._role;
    };

    Member.prototype.getObservableStreams = function getObservableStreams() {
        return this._streams;
    };

    Member.prototype.getObservableLastUpdate = function getObservableLastUpdate() {
        return this._lastUpdate;
    };

    Member.prototype.getLastUpdate = function getLastUpdate() {
        return this._lastUpdate.getValue();
    };

    Member.prototype.getStreams = function getStreams() {
        return _.map(this._streams.getValue(), function mapToJson(stream: { toJson: () => any; }) {
            return stream.toJson();
        });
    };

    Member.prototype.getRoomService = function getRoomService() {
        return this._roomService;
    };

    Member.prototype.commitChanges = function commitChanges(callback: any) {
        assert.isObject(this._roomService, 'this._roomService');

        this._roomService.updateMember(this, callback);
    };

    Member.prototype.reload = function reload() {
        assert.isObject(this._roomService, 'this._roomService');

        this._roomService.revertMemberChanges(this);
    };

    Member.prototype.setStreams = function setStreams(streams: any[]) {
        var newStreams = _.map(streams, function(stream: any) {
            return createNewObservableStream(stream);
        });

        this._streams.setValue(newStreams);
    };

    Member.prototype.toString = function toString() {
        return this.getObservableRole().getValue() + '[' + this.getObservableScreenName().getValue() + ',' + this.getSessionId() + ']';
    };

    Member.prototype.toJson = function toJson() {
        var member:any = {
            sessionId: this._sessionId.getValue(),
            screenName: this._screenName.getValue(),
            role: this._role.getValue(),
            state: this._state.getValue(),
            streams: [],
            lastUpdate: this._lastUpdate.getValue()
        };

        _.forEach(this._streams.getValue(), function(stream: { toJson: () => any; }) {
            member.streams.push(stream.toJson());
        });

        return member;
    };

    Member.prototype._update = function update(member:Member_Update) {
        if (!_.isObject(member)) {
            return;
        }

        if (Object.prototype.hasOwnProperty.call(member, 'state')) {
            this._state.setValue(member.state);
        }

        if (Object.prototype.hasOwnProperty.call(member, 'screenName')) {
            this._screenName.setValue(member.screenName);
        }

        if (Object.prototype.hasOwnProperty.call(member, 'role')) {
            this._role.setValue(member.role);
        }

        if (Object.prototype.hasOwnProperty.call(member, 'lastUpdate')) {
            this._lastUpdate.setValue(member.lastUpdate);
        }

        if (Object.prototype.hasOwnProperty.call(member, 'streams')) {
            updateStreams.call(this, member.streams);
        }
    };

    function createNewObservableStream(stream: Stream_CreateNewObservableStream) {
        return new Stream(stream.uri, stream.type, stream.audioState, stream.videoState);
    }

    function updateStreams(this: any, streams: any[]) {
        // Iterate through new streams object, update those that have changed, push new ones, remove old ones
        var oldObservableStreams = this._streams.getValue();
        var newObservableStreams: any[] = [];

        _.forEach(streams, function(stream: Stream_forEach) {
            var pcastStreamId = Stream.parsePCastStreamIdFromStreamUri(stream.uri);
            var streamToUpdate = _.find(oldObservableStreams, function(observableStream: { getUri: () => string; isPCastStream: () => any; getPCastStreamId: () => any; getType: () => string; }) {
                var hasSameUri = observableStream.getUri() === stream.uri;
                var hasSamePCastStreamId = observableStream.isPCastStream() && observableStream.getPCastStreamId() === pcastStreamId;
                var hasSameIdentifier = hasSameUri || hasSamePCastStreamId;

                return observableStream.getType() === stream.type && hasSameIdentifier;
            });

            if (streamToUpdate) {
                streamToUpdate._update(stream);
            } else {
                streamToUpdate = createNewObservableStream(stream);
            }

            newObservableStreams.push(streamToUpdate);
        });

        this._streams.setValue(newObservableStreams);
    }

    function assertIsValidMemberRole(role: string) {
        assert.isValidType(role, memberRoles, 'memberRole');

        return _.getEnumName(memberRoles, role);
    }

    function assertIsValidMemberState(state: any) {
        assert.isValidType(state, memberStates, 'memberState');

        return _.getEnumName(memberStates, state);
    }

    return Member;
});