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
    './Channel'
], function(_, assert, Channel) {
    'use strict';

    function ChannelService(roomService) {
        assert.isObject(roomService, 'roomService');

        this._roomService = roomService;
    }

    ChannelService.prototype.start = function start() {
        return this._roomService.start.apply(this._roomService, arguments);
    };

    ChannelService.prototype.getChannelInfo = function getChannelInfo(channelId, alias, callback) {
        if (channelId) {
            assert.isStringNotEmpty(channelId, 'channelId');
        } else {
            assert.isStringNotEmpty(alias, 'alias');
        }

        assert.isFunction(callback, 'callback');

        return this._roomService.getRoomInfo(channelId, alias, _.bind(wrapResponseWithChannelPrefixesAndContinue, null, callback));
    };

    ChannelService.prototype.createChannel = function createChannel(channel, callback) {
        assert.isObject(channel, 'channel');
        assert.isStringNotEmpty(channel.name, 'channel.name');
        assert.isStringNotEmpty(channel.type, 'channel.type');
        assert.isString(channel.description, 'channel.description');
        assert.isFunction(callback, 'callback');

        return this._roomService.createRoom(channel, _.bind(wrapResponseWithChannelPrefixesAndContinue, null, callback));
    };

    ChannelService.prototype.enterChannel = function enterChannel(channelId, alias, callback) {
        if (channelId) {
            assert.isStringNotEmpty(channelId, 'roomId');
        } else {
            assert.isStringNotEmpty(alias, 'alias');
        }

        assert.isFunction(callback, 'callback');

        return this._roomService.enterRoom(channelId, alias, _.bind(wrapResponseWithChannelPrefixesAndContinue, null, callback));
    };

    ChannelService.prototype.leaveChannel = function leaveChannel() {
        return this._roomService.leaveRoom.apply(this._roomService, arguments);
    };

    ChannelService.prototype.getChatService = function getChatService() {
        return this._roomService.getChatService.apply(this._roomService, arguments);
    };

    ChannelService.prototype.getSelf = function getSelf() {
        return this._roomService.getSelf.apply(this._roomService, arguments);
    };

    ChannelService.prototype.getObservableActiveChannel = function getObservableActiveChannel() {
        return this._roomService.getObservableActiveRoom.apply(this._roomService, arguments);
    };

    ChannelService.prototype.updateSelf = function updateSelf() {
        return this._roomService.updateSelf.apply(this._roomService, arguments);
    };

    ChannelService.prototype.updateMember = function updateMember() {
        return this._roomService.updateMember.apply(this._roomService, arguments);
    };

    ChannelService.prototype.updateChannel = function updateChannel() {
        return this._roomService.updateRoom.apply(this._roomService, arguments);
    };

    ChannelService.prototype.revertChannelChanges = function revertChannelChanges() {
        return this._roomService.revertRoomChanges.apply(this._roomService, arguments);
    };

    ChannelService.prototype.revertMemberChanges = function revertMemberChanges() {
        return this._roomService.revertMemberChanges.apply(this._roomService, arguments);
    };

    ChannelService.prototype.isInChannel = function isInChannel() {
        return this._roomService.isInRoom.apply(this._roomService, arguments);
    };

    ChannelService.prototype.toString = function toString() {
        return 'ChannelService';
    };

    ChannelService.prototype.stop = function stop() {
        return this._roomService.stop.apply(this._roomService, arguments);
    };

    function wrapResponseWithChannelPrefixesAndContinue(callback, error, response) {
        if (response && response.room) {
            response.channel = new Channel(response.room);

            delete response.room;
        }

        return callback(error, response);
    }

    return ChannelService;
});