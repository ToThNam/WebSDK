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
    'phenix-web-assert'
], function(_, assert) {
    'use strict';

    var defaultRoomBandwidthLimit = 5000000;

    function PublisherBandwidthAdjuster(publisher) {
        this.init(publisher);
    }

    PublisherBandwidthAdjuster.prototype.init = function init(publisher) {
        assert.isObject(publisher, 'publisher');

        this._publisher = publisher;
        this._roomMemberCount = 0;
        this._roomSubscription = null;
        this._membersSubscription = null;
    };

    PublisherBandwidthAdjuster.prototype.connect = function connect(roomService, options) {
        assert.isObject(roomService, 'roomService');

        options = options || {};

        var roomObservable = roomService.getObservableActiveRoom();
        var roomBandwidthLimit = options.roomBandwidthLimit || defaultRoomBandwidthLimit;

        this._roomSubscription = roomObservable.subscribe(_.bind(onRoomChange, this, roomBandwidthLimit), {initial: 'notify'});
    };

    PublisherBandwidthAdjuster.prototype.close = function close() {
        if (this._roomSubscription) {
            this._roomSubscription.dispose();
        }

        if (this._membersSubscription) {
            this._membersSubscription.dispose();
        }

        this._roomSubscription = null;
        this._membersSubscription = null;
    };

    PublisherBandwidthAdjuster.prototype.toString = function toString() {
        return 'PublisherBandwidthAdjuster';
    };

    function onRoomChange(roomBandwidthLimit, room) {
        if (this._membersSubscription) {
            this._membersSubscription.dispose();
        }

        if (!room) {
            return this._publisher.limitBandwidth(roomBandwidthLimit);
        }

        var membersObservable = room.getObservableMembers();

        this._membersSubscription = membersObservable.subscribe(_.bind(onRoomMembersChanged, this, roomBandwidthLimit), {initial: 'notify'});
    }

    function onRoomMembersChanged(roomBandwidthLimit, members) {
        if (members.length === this._roomMemberCount) {
            return;
        }

        this._roomMemberCount = members.length;

        var targetBitRate = roomBandwidthLimit / Math.max(1, this._roomMemberCount - 1);

        this._publisher.limitBandwidth(targetBitRate);
    }

    return PublisherBandwidthAdjuster;
});