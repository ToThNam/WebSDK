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

    function Channel(this: any, room: object) {
        assert.isObject(room, 'room');

        this._room = room;
    }

    Channel.prototype.getChannelId = function getChannelId() {
        return this._room.getRoomId.apply(this._room, arguments);
    };

    Channel.prototype.getObservableAlias = function getObservableAlias() {
        return this._room.getObservableAlias.apply(this._room, arguments);
    };

    Channel.prototype.getObservableName = function getObservableName() {
        return this._room.getObservableName.apply(this._room, arguments);
    };

    Channel.prototype.getObservableDescription = function getObservableDescription() {
        return this._room.getObservableDescription.apply(this._room, arguments);
    };

    Channel.prototype.getObservableType = function getObservableType() {
        return this._room.getObservableType.apply(this._room, arguments);
    };

    Channel.prototype.getObservableMembers = function getObservableMembers() {
        return this._room.getObservableMembers.apply(this._room, arguments);
    };

    Channel.prototype.getObservableBridgeId = function getObservableBridgeId() {
        return this._room.getObservableBridgeId.apply(this._room, arguments);
    };

    Channel.prototype.getObservablePin = function getObservablePin() {
        return this._room.getObservablePin.apply(this._room, arguments);
    };

    Channel.prototype.toString = function toString() {
        return this._room.toString.apply(this._room, arguments);
    };

    Channel.prototype.toJson = function toJson() {
        return {
            channelId: this._room.getRoomId(),
            alias: this._room.getObservableAlias().getValue(),
            name: this._room.getObservableName().getValue(),
            description: this._room.getObservableDescription().getValue(),
            type: this._room.getObservableType().getValue(),
            pin: this._room.getObservablePin().getValue(),
            bridgeId: this._room.getObservableBridgeId().getValue()
        };
    };

    Channel.prototype.commitChanges = function commitChanges() {
        return this._room.commitChanges.apply(this._room, arguments);
    };

    Channel.prototype.reload = function reload() {
        return this._room.reload.apply(this._room, arguments);
    };

    Channel.prototype._update = function update() {
        return this._room._update.apply(this._room, arguments);
    };

    Channel.prototype._addMembers = function addMembers() {
        return this._room._addMembers.apply(this._room, arguments);
    };

    Channel.prototype._removeMembers = function removeMembers() {
        return this._room._removeMembers.apply(this._room, arguments);
    };

    Channel.prototype._updateMembers = function updateMembers() {
        return this._room._updateMembers.apply(this._room, arguments);
    };

    return Channel;
});