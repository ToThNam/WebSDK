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

import { Member_MapMembers, Member_RemoveMembers, Member_UpdateMembers, ObservableMember_RemoveMembers, ObservableMember_UpdateMembers, Room_Update } from "../../../typescript/src/sdk/room/Room";

define('',[
    'phenix-web-lodash-light',
    'phenix-web-assert',
    'phenix-web-observable',
    './Member',
    './room.json'
], function(_, assert, observable, Member, room) {
    'use strict';
    var roomTypes = room.types;

    function Room(this: any, roomService: object, id: string, alias: string, name: string, description: string, type: string, members: any[], bridgeId: string, pin: string) {
        this.init(roomService, id, alias, name, description, type, members, bridgeId, pin);
    }

    Room.prototype.init = function init(roomService: object, id: string, alias: string, name: string, description: string, type: string, members: any[], bridgeId: string, pin: string) {
        assert.isObject(roomService, 'roomService');
        assert.isStringNotEmpty(name, 'name');
        assert.isString(description, 'description');
        assert.isArray(members, 'members');

        if (id) {
            assert.isStringNotEmpty(id, 'id');
        }

        if (alias) {
            assert.isStringNotEmpty(alias, 'alias');
        }

        if (bridgeId) {
            assert.isStringNotEmpty(bridgeId, 'bridgeId');
        }

        if (pin) {
            assert.isStringNotEmpty(pin, 'pin');
        }

        this._roomId = new observable.Observable(id);
        this._alias = new observable.Observable(alias);
        this._name = new observable.Observable(name);
        this._description = new observable.Observable(description);
        this._type = new observable.Observable(type, assertIsValidRoomType);
        this._members = new observable.ObservableArray([]).extend({
            method: "notifyWhenChangesStop",
            timeout: 400
        });
        this._options = new observable.ObservableArray();
        this._bridgeId = new observable.Observable(bridgeId);
        this._pin = new observable.Observable(pin);
        this._roomService = roomService;

        setMembers.call(this, members);
    };

    Room.prototype.getRoomId = function getRoomId() {
        return this._roomId.getValue();
    };

    Room.prototype.getObservableAlias = function getObservableAlias() {
        return this._alias;
    };

    Room.prototype.getObservableName = function getObservableName() {
        return this._name;
    };

    Room.prototype.getObservableDescription = function getObservableDescription() {
        return this._description;
    };

    Room.prototype.getObservableType = function getObservableType() {
        return this._type;
    };

    Room.prototype.getObservableMembers = function getObservableMembers() {
        return this._members;
    };

    Room.prototype.getObservableBridgeId = function getObservableBridgeId() {
        return this._bridgeId;
    };

    Room.prototype.getObservablePin = function getObservablePin() {
        return this._pin;
    };

    Room.prototype.toString = function toString() {
        return this._type.getValue() + '[' + this._roomId.getValue() + ']';
    };

    Room.prototype.toJson = function toJson() {
        return {
            roomId: this._roomId.getValue(),
            alias: this._alias.getValue(),
            name: this._name.getValue(),
            description: this._description.getValue(),
            type: this._type.getValue(),
            pin: this._pin.getValue(),
            bridgeId: this._bridgeId.getValue()
        };
    };

    Room.prototype.commitChanges = function commitChanges(callback: any) {
        assert.isObject(this._roomService, 'this._roomService');

        this._roomService.updateRoom(this, callback);
    };

    Room.prototype.reload = function reload() {
        assert.isObject(this._roomService, 'this._roomService');

        this._roomService.revertRoomChanges(this);
    };

    Room.prototype._update = function update(room:Room_Update ) {
        if (!_.isObject(room)) {
            return;
        }

        if (room.roomId) {
            this._roomId.setValue(room.roomId);
        }

        if (room.alias) {
            this._alias.setValue(room.alias);
        }

        if (room.name) {
            this._name.setValue(room.name);
        }

        if (room.description) {
            this._description.setValue(room.description);
        }

        if (room.type) {
            this._type.setValue(room.type);
        }

        if (room.options) {
            this._options.setValue(room.options);
        }

        if (room.bridgeId) {
            this._bridgeId.setValue(room.bridgeId);
        }

        if (room.pin) {
            this._pin.setValue(room.pin);
        }

        if (room.members) {
            // DO NOTHING -- members updated by member events
        }
    };

    Room.prototype._addMembers = function addMembers(members: any[]) {
        var that = this;

        var newMembers = mapMembers(members, this._roomService);

        _.forEach(newMembers, function(member: any) {
            that._members.push(member);
        });
    };

    Room.prototype._removeMembers = function removeMembers(members: any[]) {
        var that = this;

        _.forEach(members, function(member:Member_RemoveMembers ) {
            that._members.remove(function(observableMember: ObservableMember_RemoveMembers) {
                return member.sessionId === observableMember.getSessionId()
                    && member.lastUpdate >= observableMember.getObservableLastUpdate().getValue();
            });
        });
    };

    Room.prototype._updateMembers = function updateMembers(members: any[]) {
        _.forEach(this._members.getValue(), function(observableMember: ObservableMember_UpdateMembers) {
            var memberToUpdate = _.find(members, function(member: Member_UpdateMembers) {
                return observableMember.getSessionId() === member.sessionId && member.lastUpdate > observableMember.getObservableLastUpdate().getValue();
            });

            if (memberToUpdate) {
                observableMember._update(memberToUpdate);
            }
        });
    };

    function setMembers(this: any, members: any[]) {
        var newMembers = mapMembers(members, this._roomService);

        this._members.setValue(newMembers);
    }

    function mapMembers(members: any[], roomService: object) {
        return _.map(members, function(member: Member_MapMembers) {
            return new Member(roomService, member.state, member.sessionId, member.screenName, member.role, member.streams, member.lastUpdate);
        });
    }

    function assertIsValidRoomType(type: string) {
        type = _.getEnumName(roomTypes, type);

        if (!type) {
            throw new Error('"type" must be a valid room type');
        }

        return type;
    }

    return Room;
});