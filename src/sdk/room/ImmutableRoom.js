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
    'phenix-web-lodash-light',
    'phenix-web-assert',
    'phenix-web-observable',
    './Room'
], function(_, assert, observable, Room) {
    'use strict';

    function ImmutableRoom(roomService, id, alias, name, description, type, members, bridgeId, pin) {
        this.init(roomService, id, alias, name, description, type, members, bridgeId, pin);
    }

    ImmutableRoom.prototype.init = function init(roomService, id, alias, name, description, type, members, bridgeId, pin) {
        this._room = new Room(roomService, id, alias, name, description, type, members, bridgeId, pin);

        makeArrayOrObjectObservablesImmutable(this._room, [roomService]);
    };

    ImmutableRoom.prototype.getRoomId = function getImmutableRoomId() {
        return this._room.getRoomId();
    };

    ImmutableRoom.prototype.getObservableAlias = function getObservableAlias() {
        return this._room.getObservableAlias();
    };

    ImmutableRoom.prototype.getObservableName = function getObservableName() {
        return this._room.getObservableName();
    };

    ImmutableRoom.prototype.getObservableDescription = function getObservableDescription() {
        return this._room.getObservableDescription();
    };

    ImmutableRoom.prototype.getObservableType = function getObservableType() {
        return this._room.getObservableType();
    };

    ImmutableRoom.prototype.getObservableMembers = function getObservableMembers() {
        return this._room.getObservableMembers();
    };

    ImmutableRoom.prototype.getObservableBridgeId = function getObservableBridgeId() {
        return this._room.getObservableBridgeId();
    };

    ImmutableRoom.prototype.getObservablePin = function getObservablePin() {
        return this._room.getObservablePin();
    };

    ImmutableRoom.prototype.toString = function toString() {
        return this._room.toString();
    };

    ImmutableRoom.prototype.toJson = function toJson() {
        return this._room.toJson();
    };

    ImmutableRoom.prototype.commitChanges = throwImmutableError;
    ImmutableRoom.prototype.reload = throwImmutableError;
    ImmutableRoom.prototype._update = throwImmutableError;
    ImmutableRoom.prototype._addMembers = throwImmutableError;
    ImmutableRoom.prototype._removeMembers = throwImmutableError;
    ImmutableRoom.prototype._updateMembers = throwImmutableError;

    function throwImmutableError() {
        throw new Error('ImmutableRoom is Immutable');
    }

    function throwImmutableSubscribeError() {
        throw new Error('Unable to subscribe to Immutable [ImmutableRoom]');
    }

    function makeArrayOrObjectObservablesImmutable(collection, exclude) {
        if (_.isArray(collection)) {
            _.forEach(collection, function(value) {
                wrapObservableAndAnyObservableProperties(value, exclude);
            });
        } else if (_.isObject(collection)) {
            _.forOwn(collection, function(value) {
                if (_.includes(exclude, value)) {
                    return;
                }

                wrapObservableAndAnyObservableProperties(value, exclude);
            });
        }
    }

    function wrapObservableAndAnyObservableProperties(value, exclude) {
        wrapObservable(value, exclude);
        makeArrayOrObjectObservablesImmutable(value, exclude);
    }

    function wrapObservable(value, exclude) {
        if (value instanceof observable.Observable || value instanceof observable.ObservableArray) {
            value.setValue = throwImmutableError;
            value.subscribe = throwImmutableSubscribeError;

            var observableValue = value.getValue();

            makeArrayOrObjectObservablesImmutable(observableValue, exclude);
        }
    }

    return ImmutableRoom;
});