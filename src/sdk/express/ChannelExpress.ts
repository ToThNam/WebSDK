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

import { callback_wrapResponseWithChannelPrefixes, member_evaluateMembers, options_joinChannel, options_publishScreenToChannel, options_publishToChannel, response_joinRoomCallback, response_mediaStreamCallback, response_monitorChannelSubscriber, response_wrapResponseWithChannelPrefixes } from "../../../typescript/src/express/ChannelExpress";

define('',[
    'phenix-web-lodash-light',
    'phenix-web-assert',
    'phenix-web-observable',
    'phenix-web-disposable',
    './RoomExpress',
    '../room/ChannelService',
    '../room/Channel',
    './MemberSelector',
    '../room/Stream',
    '../room/room.json',
    '../room/member.json',
    '../room/stream.json'
], function(_, assert, observable, disposable, RoomExpress, ChannelService, Channel, MemberSelector, Stream, roomEnums, memberEnums, streamEnums) {
    'use strict';

    var defaultOptions = {
        reconnectOptions: {
            maxOfflineTime: 24 * 60 * 60 * 1000, // 1 day
            maxReconnectFrequency: 60 * 1000 // 60 seconds
        }
    };
    var backoffIntervalOnCapacity = 5000;
    var backoffIntervalOnRetry = 100;

    function ChannelExpress(this: any, options: { roomExpress: object; }) {
        assert.isObject(options, 'options');

        if (options.roomExpress) {
            assert.isObject(options.roomExpress, 'options.roomExpress');
        }

        this._channelExpressOptions = _.assign(_.clone(defaultOptions), options);

        this._roomExpress = options.roomExpress || new RoomExpress(this._channelExpressOptions);
        this._shouldDisposeOfRoomExpress = !options.roomExpress;
        this._logger = this._roomExpress.getPCastExpress().getPCast().getLogger();
    }

    ChannelExpress.prototype.dispose = function dispose() {
        if (this._pcastStatusSubscription) {
            this._pcastStatusSubscription.dispose();
            this._pcastStatusSubscription = null;
        }

        if (this._shouldDisposeOfRoomExpress) {
            this._roomExpress.dispose();
        }

        this._logger.info('Disposed channel express instance');
    };

    ChannelExpress.prototype.getRoomExpress = function getRoomExpress() {
        return this._roomExpress;
    };

    ChannelExpress.prototype.getPCastExpress = function getPCastExpress() {
        return this._roomExpress.getPCastExpress();
    };

    ChannelExpress.prototype.createChannel = function createChannel(options: { channel: object; }, callback: any) {
        assert.isObject(options, 'options');
        assert.isObject(options.channel, 'options.channel');

        var createRoomOptions = _.assign({room: options.channel}, options);

        createRoomOptions.room.type = roomEnums.types.channel.name;

        delete createRoomOptions.channel;

        this._roomExpress.createRoom(createRoomOptions, _.bind(wrapResponseWithChannelPrefixesAndContinue, null, callback));
    };

    ChannelExpress.prototype.joinChannel = function joinChannel(options: options_joinChannel, joinChannelCallback:()=>void, subscriberCallback: (arg0: null, arg1: { status: string; }) => void) {
        assert.isObject(options, 'options');
        assert.isFunction(joinChannelCallback, 'joinChannelCallback');
        assert.isFunction(subscriberCallback, 'subscriberCallback');

        if (options.videoElement) {
            assert.isObject(options.videoElement, 'options.videoElement');
        }

        if (options.streamSelectionStrategy) {
            assert.isStringNotEmpty(options.streamSelectionStrategy, 'options.streamSelectionStrategy');
        }

        var channelOptions = _.assign({
            type: roomEnums.types.channel.name,
            role: memberEnums.roles.audience.name
        }, options);
        var failureCountForBanningAMember = _.get(options, ['failureCountForBanningAMember']);
        var banMemberOnCapacityFailureCount = _.get(options, ['banMemberOnCapacityFailureCount']);
        var memberSelector = new MemberSelector(options.streamSelectionStrategy, this._logger, {
            failureCountForBanningAMember: failureCountForBanningAMember,
            banMemberOnCapacityFailureCount: banMemberOnCapacityFailureCount
        });
        var lastMediaStream: { stop: (arg0: string) => void; isActive: () => any; } | null;
        var lastStreamId: null;
        var memberSubscriptions: any[] = [];
        var channelRoomService: { getObservableActiveRoom: () => { (): any; new(): any; getValue: { (): any; new(): any; }; }; };
        var channelId = '';
        var that = this;
        var memberSelectionBackoffTimeoutId: NodeJS.Timeout | null = null;

        if (channelOptions.channelId) {
            channelOptions.roomId = channelOptions.channelId;
        }

        delete channelOptions.channelId;

        var resetListeners = function() {
            if (memberSelectionBackoffTimeoutId !== null) {
                that._logger.info('[%s] Clearing member selection backoff interval', channelId);

                clearTimeout(memberSelectionBackoffTimeoutId);
                memberSelectionBackoffTimeoutId = null;
            }

            for (var i = 0; i < memberSubscriptions.length; i++) {
                memberSubscriptions[i].dispose();
            }

            memberSubscriptions = [];
        };

        var joinRoomCallback = function(error: any, response: response_joinRoomCallback) {
            var channelResponse = !response || _.assign({}, response);

            if (that._pcastStatusSubscription) {
                that._pcastStatusSubscription.dispose();
                that._pcastStatusSubscription = null;
            }

            if (response && response.roomService) {
                var leaveRoom = response.roomService.leaveRoom;
                var room = response.roomService.getObservableActiveRoom().getValue();

                channelRoomService = response.roomService;
                channelId = room ? room.getRoomId() : '';

                that._logger.info('Joined channel [%s] with [%s] selection strategy', channelId, memberSelector.getStrategy());

                channelResponse.roomService.leaveRoom = function(callback: any) {
                    if (lastMediaStream) {
                        lastMediaStream.stop('leave-channel');
                    }

                    resetListeners();

                    leaveRoom(callback);
                };
            }

            wrapResponseWithChannelPrefixesAndContinue(joinChannelCallback, error, channelResponse);
        };

        that._roomExpress.joinRoom(channelOptions, joinRoomCallback, function membersChangedCallback(members: any[], streamErrorStatus: any) {
            resetListeners();

            that._logger.info('[%s] Members changed with status [%s]. Channel has [%s] active members.', channelId, streamErrorStatus, members.length);

            var evaluateMembers = function(this: any) {
                var presenters = _.filter(members, function(member: member_evaluateMembers) {
                    return member.getObservableRole().getValue() === memberEnums.roles.presenter.name && member.getObservableStreams().getValue().length > 0;
                });
                var selectedPresenter = memberSelector.getNext(presenters);
                var presenterStream = selectedPresenter ? selectedPresenter.getObservableStreams().getValue()[0] : null;
                var streamId = presenterStream ? presenterStream.getPCastStreamId() : '';

                if (!presenterStream) {
                    if (presenters.length === 0) {
                        memberSelector.reset();
                        lastMediaStream = null;
                        lastStreamId = null;

                        return subscriberCallback(null, {status: 'no-stream-playing'});
                    }

                    if (streamErrorStatus) {
                        that._logger.info('Unable to find a new presenter to replace stream [%s] that ended in channel [%s] with status [%s] and [%s] black-listed members',
                            lastStreamId, channelId, streamErrorStatus, memberSelector.getNumberOfMembersWithFailures());

                        if (lastStreamId && lastMediaStream && lastMediaStream.isActive()) {
                            lastMediaStream.stop('presenter-failure');
                        }

                        return subscriberCallback(null, {status: streamErrorStatus || 'unable-to-recover'});
                    }

                    return subscriberCallback(null, {status: 'no-stream-playing'});
                }

                if (!streamId) {
                    that._logger.info('Channel [%s] presenter has no stream', channelId);

                    return subscriberCallback(null, {status: 'no-stream-playing'});
                }

                if (lastStreamId && lastMediaStream) {
                    if (streamId === lastStreamId) {
                        if (!streamErrorStatus) {
                            // New member detected but staying on previous stream
                            return;
                        }

                        that._logger.info('[%s] Stream [%s] ended with status [%s], retrying',
                            channelId, lastStreamId, streamErrorStatus);
                        lastMediaStream.stop('same-presenter-failure');
                    } else {
                        that._logger.info('[%s] Stream [%s] ended with status [%s], failing over to stream [%s]',
                            channelId, lastStreamId, streamErrorStatus, streamId);
                        lastMediaStream.stop('change-presenter');
                    }
                }

                var tryNextMember = function(streamStatus: string) {
                    if (memberSelectionBackoffTimeoutId !== null) {
                        that._logger.warn('[%s] Clearing backoff interval after triggering of another unexpected failure [%s]', channelId, streamStatus);

                        clearTimeout(memberSelectionBackoffTimeoutId);
                        memberSelectionBackoffTimeoutId = null;
                    }

                    return memberSelectionBackoffTimeoutId = setTimeout(function() {
                        memberSelectionBackoffTimeoutId = null;

                        var room = channelRoomService ? channelRoomService.getObservableActiveRoom().getValue() : null;

                        if (!room) {
                            return; // No longer in room.
                        }

                        var members = room.getObservableMembers().getValue();

                        return membersChangedCallback(members, streamStatus);
                    }, streamStatus === 'capacity' ? backoffIntervalOnCapacity : backoffIntervalOnRetry);
                };

                function monitorChannelSubscriber(mediaStreamId: string, error: null, response:response_monitorChannelSubscriber) {
                    if (lastStreamId !== mediaStreamId) {
                        that._logger.info('[%s] Ignore old channel subscriber monitor stream [%s]. Active stream is [%s]', channelId, mediaStreamId, lastStreamId);

                        return;
                    }

                    if (error) {
                        return tryNextMember('unable-to-subscribe');
                    }

                    // Don't continue - Tell client
                    if (response.reason === 'app-background') {
                        return subscriberCallback(error, response);
                    }

                    if (response.retry && memberSelector.getStrategy() !== 'high-availability') {
                        that._logger.info('Retrying to subscribe to channel [%s] after stream [%s] failed with reason [%s]',
                            channelId, mediaStreamId, response.status);

                        return response.retry();
                    }

                    var responseStatus = _.get(response, ['status'], '');

                    if (responseStatus !== 'ok') {
                        if (response.reason === 'custom' && response.description !== 'client-side-failure') {
                            return subscriberCallback(error, response);
                        }

                        switch (responseStatus) {
                        case 'ended':
                        case 'origin-ended':
                        case 'origin-stream-ended':
                            memberSelector.markDead();

                            break;
                        default:
                            memberSelector.markFailed({failedDueToCapacity: responseStatus === 'capacity'});

                            break;
                        }

                        that._logger.info('[%s] Monitor subscriber reported status [%s]. Trying next member', mediaStreamId, responseStatus);

                        return tryNextMember(responseStatus);
                    }
                }

                var subscribeOptions = _.assign({}, {
                    monitor: {
                        callback: _.bind(monitorChannelSubscriber, this, streamId),
                        options: {conditionCountForNotificationThreshold: 8}
                    }
                }, options);
                var hadPreviousStreamReason = streamErrorStatus ? 'recovered-from-failure' : 'stream-override';
                var successReason = lastStreamId ? hadPreviousStreamReason : 'stream-started';

                lastStreamId = streamId;

                var mediaStreamCallback = function mediaStreamCallback(mediaStreamId: string, error: null, response:response_mediaStreamCallback ) {
                    if (lastStreamId !== mediaStreamId) {
                        that._logger.info('[%s] Ignore old media stream callback for stream [%s]. Active stream is [%s]', channelId, mediaStreamId, lastStreamId);

                        return;
                    }

                    var responseStatus = _.get(response, ['status'], '');

                    if (responseStatus === 'ok') {
                        response.reason = successReason;
                    }

                    if (error || (responseStatus !== 'ok')) {
                        that._logger.info('[%s] Issue with stream [%s]. Trying next member', mediaStreamId, responseStatus, error);

                        switch (responseStatus) {
                        case 'unauthorized':
                        case 'not-found':
                        case 'ended':
                        case 'origin-not-found':
                        case 'origin-ended':
                        case 'origin-stream-ended':
                        case 'unsupported-features':
                            memberSelector.markDead();

                            break;
                        default:
                            memberSelector.markFailed({failedDueToCapacity: responseStatus === 'capacity'});

                            break;
                        }

                        return tryNextMember(responseStatus);
                    }

                    if (response && response.mediaStream) {
                        lastMediaStream = response.mediaStream;
                    } else {
                        lastStreamId = null;
                        lastMediaStream = null;
                    }

                    subscriberCallback(error, response);
                };

                that._roomExpress.subscribeToMemberStream(presenterStream, subscribeOptions, _.bind(mediaStreamCallback, this, streamId));
            };

            for (var i = 0; i < members.length; i++) {
                memberSubscriptions.push(members[i].getObservableScreenName().subscribe(evaluateMembers));
                memberSubscriptions.push(members[i].getObservableRole().subscribe(evaluateMembers));
                memberSubscriptions.push(members[i].getObservableStreams().subscribe(evaluateMembers));
            }

            evaluateMembers();
        });
    };

    ChannelExpress.prototype.publishToChannel = function publishToChannel(options:options_publishToChannel , callback: (arg0: Error, arg1: { status: string; }) => void) {
        assert.isObject(options, 'options');
        assert.isFunction(callback, 'callback');

        if (options.publishToken && options.capabilities) {
            this._logger.warn('[%s] Trying to publish with both `publishToken` and `capabilities` set. Only use one of the two options');

            callback(new Error('Publishing with both `publishToken` and `capabilities` defined'), {status: 'conflicting-options'});

            return;
        }

        if (options.streamToken && options.capabilities) {
            this._logger.warn('[%s] Trying to publish with both `streamToken` and `capabilities` set. Only use one of the two options');

            callback(new Error('Publishing with both `streamToken` and `capabilities` defined'), {status: 'conflicting-options'});

            return;
        }

        var channelOptions = _.assign({
            memberRole: memberEnums.roles.presenter.name,
            streamType: streamEnums.types.presentation.name,
            room: options.channel
        }, options);

        channelOptions.room.type = roomEnums.types.channel.name;

        delete channelOptions.channel;

        this._roomExpress.publishToRoom(channelOptions, _.bind(wrapResponseWithChannelPrefixesAndContinue, null, callback));
    };

    ChannelExpress.prototype.publishScreenToChannel = function publishScreenToChannel(options:options_publishScreenToChannel, callback: any) {
        assert.isObject(options, 'options');
        assert.isFunction(callback, 'callback');

        var channelOptions = _.assign({
            memberRole: memberEnums.roles.presenter.name,
            streamType: streamEnums.types.presentation.name,
            room: options.channel
        }, options);

        channelOptions.room.type = roomEnums.types.channel.name;

        delete channelOptions.channel;

        this._roomExpress.publishScreenToRoom(channelOptions, _.bind(wrapResponseWithChannelPrefixesAndContinue, null, callback));
    };

    function wrapResponseWithChannelPrefixesAndContinue(callback:callback_wrapResponseWithChannelPrefixes , error: string, response: response_wrapResponseWithChannelPrefixes) {
        if (response && _.hasIndexOrKey(response, 'roomService')) {
            response.channelService = response.roomService ? new ChannelService(response.roomService) : null;

            delete response.roomService;
        }

        if (response && _.hasIndexOrKey(response, 'room')) {
            response.channel = response.room ? new Channel(response.room) : null;

            delete response.room;
        }

        callback(error, response);
    }

    return ChannelExpress;
});