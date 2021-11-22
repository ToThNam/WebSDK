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

import { Event_OnRoomEvent, Member_GetDifferencesBetweenCachedRoom, Room_CreateRoom, Room_GetValidRoomObject, Room_ReplaceSelfInstanceInRoom } from "../../../typescript/src/sdk/room/RoomService";

define('',[
    'phenix-web-lodash-light',
    'phenix-web-assert',
    'phenix-web-observable',
    'phenix-web-disposable',
    '../authentication/AuthenticationService',
    './Room',
    './ImmutableRoom',
    './Member',
    '../chat/RoomChatService',
    './room.json',
    './member.json'
], function(_, assert, observable, disposable, AuthenticationService, Room, ImmutableRoom, Member, RoomChatService, roomEnums, memberEnums:any) {
    'use strict';

    var notInRoomResponse = _.freeze({status: 'not-in-room'});
    var alreadyInRoomResponse = _.freeze({status: 'already-in-room'});
    var inAnotherRoomResponse = _.freeze({status: 'in-another-room'});

    function RoomService(this: any, pcast: object) {
        this._self = new observable.Observable(null);
        this._activeRoom = new observable.Observable(null);
        this._cachedRoom = new observable.Observable(null);
        this._roomChatService = null;

        this._authenticationService = new AuthenticationService(pcast);

        this.setPCast(pcast);
    }

    RoomService.prototype.setPCast = function setPCast(pcast: { getLogger: () => any; getProtocol: () => any; }) {
        assert.isObject(pcast, 'pcast');
        assert.isFunction(pcast.getLogger, 'pcast.getLogger');
        assert.isFunction(pcast.getProtocol, 'pcast.getProtocol');

        if (this._pcast) {
            this._logger.info('Resetting pcast instance for room service');
        }

        this._pcast = pcast;
        this._logger = pcast.getLogger();
        this._protocol = pcast.getProtocol();

        assert.isObject(this._logger, 'this._logger');
        assert.isObject(this._protocol, 'this._protocol');

        this._authenticationService.setPCast(pcast);

        if (this._roomChatService) {
            this._roomChatService.setPCast(pcast);
        }

        if (this._started) {
            this._disposables.dispose();

            setupSubscriptions.call(this);
        }
    };

    RoomService.prototype.start = function start(role: string, screenName: string) {
        if (this._started) {
            this._logger.warn('RoomService already started.');

            return;
        }

        assert.isStringNotEmpty(role, 'role');
        assert.isStringNotEmpty(screenName, 'screenName');

        var myState = memberEnums.states.passive.name;
        var mySessionId = this._authenticationService.getPCastSessionId();
        var myScreenName = screenName;
        var myStreams: any[] = [];
        var myLastUpdate = _.now();
        var roomService = this;

        var self = new Member(roomService, myState, mySessionId, myScreenName, role, myStreams, myLastUpdate);

        this._self = new observable.Observable(self);
        this._disposables = new disposable.DisposableList();

        setupSubscriptions.call(this);

        this._started = true;

        return self;
    };

    RoomService.prototype.getRoomInfo = function getRoomInfo(roomId: string, alias: string, callback: any) {
        if (roomId) {
            assert.isStringNotEmpty(roomId, 'roomId');
        } else {
            assert.isStringNotEmpty(alias, 'alias');
        }

        assert.isFunction(callback, 'callback');

        getRoomInfoRequest.call(this, roomId, alias, callback);
    };

    RoomService.prototype.createRoom = function createRoom(room:Room_CreateRoom, callback: any) {
        assert.isObject(room, 'room');
        assert.isStringNotEmpty(room.name, 'room.name');
        assert.isStringNotEmpty(room.type, 'room.type');
        assert.isString(room.description, 'room.description');
        assert.isFunction(callback, 'callback');

        createRoomRequest.call(this, room, callback);
    };

    RoomService.prototype.enterRoom = function enterRoom(roomId: string, alias: string, callback: any,arg?:any) {
        if (roomId) {
            assert.isStringNotEmpty(roomId, 'roomId');
        } else {
            assert.isStringNotEmpty(alias, 'alias');
        }

        assert.isFunction(callback, 'callback');

        enterRoomRequest.call(this, roomId, alias, callback,arg);
    };

    RoomService.prototype.leaveRoom = function leaveRoom(callback: any, isForceLeaveRoom: boolean) {
        var that = this;

        return leaveRoomRequest.call(that, callback, isForceLeaveRoom);
    };

    RoomService.prototype.getChatService = function getChatService() {
        if (!this._roomChatService && this._activeRoom.getValue()) {
            this._roomChatService = new RoomChatService(this);
        }

        return this._roomChatService;
    };

    RoomService.prototype.getSelf = function getSelf() {
        return this._self.getValue();
    };

    RoomService.prototype.getObservableActiveRoom = function getObservableActiveRoom() {
        return this._activeRoom;
    };

    RoomService.prototype.updateSelf = function updateSelf(callback: any) {
        assert.isFunction(callback, 'callback');

        updateMemberRequest.call(this, this.getSelf(), callback);
    };

    RoomService.prototype.updateMember = function updateMember(member: any, callback: any) {
        assert.isFunction(callback, 'callback');
        assert.isObject(member, 'member');

        updateMemberRequest.call(this, member, callback);
    };

    RoomService.prototype.updateRoom = function updateRoom(callback: any) {
        assert.isFunction(callback, 'callback');

        updateRoomRequest.call(this, callback);
    };

    RoomService.prototype.revertRoomChanges = function revertRoomChanges() {
        var activeRoom = this._activeRoom.getValue();
        var cachedRoom = this._cachedRoom.getValue();

        if (!activeRoom || !cachedRoom) {
            return this._logger.warn('Unable to revert changes to room. Not currently in a room.');
        }

        activeRoom._update(cachedRoom.toJson());
    };

    RoomService.prototype.revertMemberChanges = function revertMemberChanges(member: { getSessionId: () => any; }) {
        assert.isObject(member, 'member');

        var cachedMember = findMemberInObservableRoom(member.getSessionId(), this._cachedRoom);
        var activeMember = findMemberInObservableRoom(member.getSessionId(), this._activeRoom);

        if (!cachedMember || !activeMember) {
            return this._logger.warn('Unable to revert changes to member. Member is currently not in room.');
        }

        activeMember._update(cachedMember.toJson());
    };

    RoomService.prototype.isInRoom = function isInRoom() {
        return !!this._activeRoom.getValue();
    };

    RoomService.prototype.toString = function toString() {
        return 'RoomService';
    };

    RoomService.prototype.stop = function stop(reason: any) {
        var activeRoom = this._activeRoom.getValue();
        var that = this;

        this._logger.info('Stopping room service with reason [%s]', reason);

        if (activeRoom) {
            return this.leaveRoom(function(error: string, response: { status: string; }) {
                if (error) {
                    that._logger.warn('Failure to stop room service. Unable to leave room', error);
                }

                if (response && response.status !== 'ok') {
                    that._logger.warn('Failure to stop room service. Unable to leave room. Status: [%s]', response.status);
                }

                if (response && response.status === 'ok') {
                    resetRoomModels.call(that);

                    that._started = false;
                }
            });
        }

        resetRoomModels.call(this);

        that._started = false;
    };

    function resetRoomModels(this: any) {
        this._self.setValue(null);
        this._activeRoom.setValue(null);
        this._cachedRoom.setValue(null);
        this._roomChatService = null;

        if (this._disposables) {
            this._disposables.dispose();
        }

        this._disposables = null;
    }

    function resetSelf(this: any, sessionId: string) {
        var self = this._self.getValue().toJson();
        var roomService = this;

        this._logger.info('Resetting self after sessionId changed to [%s]', sessionId);

        this._self.setValue(new Member(roomService, self.state, sessionId || '', self.screenName, self.role, self.streams, self.lastUpdate));
    }

    function reenterRoom(this: any) {
        var that = this;

        var activeRoom = that._activeRoom.getValue();

        if (!_.isObject(activeRoom)) {
            return;
        }

        var self = that._self.getValue();

        if (!self) {
            return;
        }

        var selfSessionId = self.getSessionId();

        if (!selfSessionId) {
            return;
        }

        var roomId = activeRoom.getRoomId();
        var alias = activeRoom.getObservableAlias().getValue();

        that._logger.info('[%s] Re-entering room [%s]', roomId, alias);

        if (that._roomChatService) {
            that._logger.info('Performing soft reset on room chat service for room [%s]', roomId);
            that._roomChatService.stop();
        }

        enterRoomRequest.call(that, roomId, alias, function() {
            if (that._roomChatService) {
                that._logger.info('[%s] Refreshing room chat service after re-entering room [%s]', roomId, alias);

                that._roomChatService.start(that._roomChatService.getBatchSize());
            }

            that._logger.info('[%s] Room [%s] completed reset', roomId, alias);
        }, {reenter: true});
    }

    // Handle events
    function onRoomEvent(this: any, event:Event_OnRoomEvent) {
        assert.isObject(event, 'event');
        assert.isString(event.roomId, 'event.roomId');
        assert.isString(event.eventType, 'event.eventType');
        assert.isArray(event.members, 'event.members');

        _.forEach(event.members, function(member: any) {
            assert.isObject(member, 'member');
        });

        var that = this;

        switch (event.eventType) {
        case roomEnums.events.memberJoined.name:
            that._logger.debug('[%s] Member joined [%s]', event.roomId, event.members);

            return onMembersJoinsRoom.call(that, event.roomId, event.members);
        case roomEnums.events.memberLeft.name:
            that._logger.debug('[%s] Member left [%s]', event.roomId, event.members);

            return onMembersLeavesRoom.call(that, event.roomId, event.members);
        case roomEnums.events.memberUpdated.name:
            that._logger.debug('[%s] Member updated [%s]', event.roomId, event.members);

            return onMembersUpdated.call(that, event.roomId, event.members);
        case roomEnums.events.roomUpdated.name:
            that._logger.debug('[%s] Room updated [%s]', event.roomId, event.room);

            return onRoomUpdated.call(that, event.roomId, event.room);
        case roomEnums.events.roomEnded.name:
            that._logger.info('[%s] Room ended', event.roomId);

            break;
        default:
            that._logger.warn('Unsupported room event [%s]', event.eventType);
        }
    }

    function onMembersJoinsRoom(this: any, roomId: string, members: any[]) {
        var room = this._activeRoom.getValue();
        var cachedRoom = this._cachedRoom.getValue();

        if (!room || room.getRoomId() !== roomId) {
            return;
        }

        room._removeMembers(members);
        room._addMembers(members);

        cachedRoom._removeMembers(members);
        cachedRoom._addMembers(members);

        var that = this;

        var memberIsSelf = function(member: { sessionId: string; }) {
            return member.sessionId === that.getSelf().getSessionId();
        };

        var joinedSelf = _.find(members, memberIsSelf);
        var selfInRoom = false;

        if (joinedSelf) {
            selfInRoom = replaceSelfInstanceInRoom.call(that, room);

            room._updateMembers([joinedSelf]);
        }

        this._logger.info('[%s] Room has now [%d] members (Self is present in room [%s])', roomId, room.getObservableMembers().getValue().length, selfInRoom);
    }

    function onMembersLeavesRoom(this: any, roomId: string, members: any[]) {
        var room = this._activeRoom.getValue();
        var cachedRoom = this._cachedRoom.getValue();

        if (!room || room.getRoomId() !== roomId) {
            return;
        }

        var that = this;

        var memberIsSelf = function(member: { sessionId: string; }) {
            return member.sessionId === that.getSelf().getSessionId();
        };

        var leftSelf = _.find(members, memberIsSelf);
        var self = this.getSelf();

        if (self && leftSelf) {
            self.getObservableLastUpdate().setValue(leftSelf.lastUpdate);
        }

        room._removeMembers(members);
        cachedRoom._removeMembers(members);

        this._logger.info('[%s] Room has now [%d] members', roomId, room.getObservableMembers().getValue().length);
    }

    function onMembersUpdated(this: any, roomId: string, members:  any[]) {
        var room = this._activeRoom.getValue();
        var cachedRoom = this._cachedRoom.getValue();

        if (!room || room.getRoomId() !== roomId) {
            return;
        }

        // To help reduce conflicts when different properties are sequentially changing
        var membersWithOnlyPropertiesThatChanged = getDifferencesBetweenCachedRoomMembersAndUpdatedMembers.call(this, members);

        room._updateMembers(membersWithOnlyPropertiesThatChanged);
        cachedRoom._updateMembers(membersWithOnlyPropertiesThatChanged);

        this._logger.info('[%s] Room has [%d] updated members', roomId, members.length);
    }

    function onRoomUpdated(this: any, roomId: string, room: any) {
        var activeRoom = this._activeRoom.getValue();
        var cachedRoom = this._cachedRoom.getValue();

        if (!activeRoom || activeRoom.getRoomId() !== roomId) {
            return;
        }

        cachedRoom._update(room);
        activeRoom._update(room);
    }

    function handlePCastSessionIdChanged(this: any, sessionId: string) {
        if (this.getSelf() && this.getSelf().getSessionId() === (sessionId || '')) {
            this._logger.info('[%s] Skip session ID change since it is the same as in self model', sessionId);

            return;
        }

        resetSelf.call(this, sessionId);
    }

    function handleSelfUpdated(this: any, self: { getSessionId: () => any; }) {
        var that = this;

        if (!self) {
            return;
        }

        if (!self.getSessionId()) {
            return;
        }

        var activeRoom = that._activeRoom.getValue();

        if (!activeRoom) {
            return;
        }

        that._logger.info('[%s] Updating self in room after update', activeRoom.getRoomId());

        updateMemberRequest.call(this, this.getSelf(), function(_error:any, response: any) {
            if (_.get(response, ['status']) === 'ok') {
                that._logger.info('[%s] Updated self in room after update', activeRoom.getRoomId());
            } else {
                that._logger.info('[%s] Self was not updated in room after update', activeRoom.getRoomId());
            }
        });
    }

    function findMemberInObservableRoom(sessionId: string, observableRoom: { getValue: () => any; }) {
        var room = observableRoom.getValue();
        var members = room.getObservableMembers().getValue();

        return findMemberInMembers(sessionId, members);
    }

    function findMemberInMembers(sessionId: string, members: any[]) {
        return _.find(members, function(member: { getSessionId: () => string; }) {
            return sessionId === member.getSessionId();
        });
    }

    function handlePCastStatusChange(this: any, status: string) {
        this._logger.info('PCast status changed from [%s] to [%s]', this._lastPcastStatus, status);

        this._lastPcastStatus = status;

        if (status === 'online') {
            reenterRoom.call(this);
        }
    }

    function setupSubscriptions(this: any) {
        var roomEventSubscription = this._protocol.onEvent('chat.RoomEvent', _.bind(onRoomEvent, this));
        var selfSubscription = this._self.subscribe(_.bind(handleSelfUpdated, this));
        var pcastStatusSubscription = this._authenticationService.getObservableStatus().subscribe(_.bind(handlePCastStatusChange, this));
        var pcastSessionIdSubscription = this._authenticationService.getObservableSessionId().subscribe(_.bind(handlePCastSessionIdChanged, this));

        this._disposables.add(roomEventSubscription);
        this._disposables.add(selfSubscription);
        this._disposables.add(pcastStatusSubscription);
        this._disposables.add(pcastSessionIdSubscription);
    }

    function getDifferencesBetweenCachedRoomMembersAndUpdatedMembers(this: any, members: any[]) {
        var that = this;

        return _.map(members, function(member: Member_GetDifferencesBetweenCachedRoom) {
            var cachedMember = findMemberInObservableRoom(member.sessionId, that._cachedRoom);
            var placeholderMember = new Member(that, member.state, member.sessionId, member.screenName, member.role, member.streams, member.lastUpdate);
            var memberWithOnlyDifferentProperties = buildMemberForRequest(placeholderMember, cachedMember);

            memberWithOnlyDifferentProperties.lastUpdate = member.lastUpdate;

            return memberWithOnlyDifferentProperties;
        });
    }

    // Requests to server
    function buildMemberForRequest(member: { getSessionId: () => any; }, memberToCompare:any) {
        var memberForRequest = findDifferencesInMember(member, memberToCompare);

        memberForRequest.sessionId = member.getSessionId();
        // Last valid update from server. Handles collisions.
        memberForRequest.lastUpdate = memberToCompare ? memberToCompare.getLastUpdate() : _.now();

        return memberForRequest;
    }

    function findDifferencesInMember(member: { getSessionId?: () => any; toJson?: any; }, memberToCompare: { getLastUpdate?: () => any; toJson?: any; }) {
        if (!memberToCompare) {
            return member.toJson();
        }

        var memberForRequest:any = {};
        var newMember = member.toJson();
        var cachedMember = memberToCompare.toJson();
        var differences = _.findDifferences(newMember, cachedMember, true);

        _.forEach(differences, function(key: string | number) {
            memberForRequest[key] = newMember[key];
        });

        return memberForRequest;
    }

    function getRoomInfoRequest(this: any, roomId: string, alias: string, callback: (arg0: null, arg1: { status: string; } | null) => void) {
        this._authenticationService.assertAuthorized();

        var that = this;

        this._protocol.getRoomInfo(roomId, alias,
            function handleCreateRoomResponse(error: null, response: { status: string; room: any; members: any[]; }) {
                if (error) {
                    that._logger.error('Request to get room info failed with error [%s]', error);

                    return callback(error, null);
                }

                var result:any = {status: response.status};

                if (response.status !== 'ok') {
                    that._logger.warn('Request to get room info failed with status [%s]', response.status);

                    return callback(null, result);
                }

                result.room = _.freeze(createImmutableRoomFromResponse.call(that, response));

                callback(null, result);
            }
        );
    }

    function createRoomRequest(this: any, room: any, callback: (arg0: null, arg1: { status: string; } | null) => void) {
        this._authenticationService.assertAuthorized();

        var that = this;

        var validatedRoom = getValidRoomObject.call(that, room);

        this._protocol.createRoom(validatedRoom, function handleCreateRoomResponse(error: null, response: { status: string; room: any; members: any[]; }) {
            if (error) {
                that._logger.error('Creating room failed with error [%s]', error);

                return callback(error, null);
            }

            var result:any = {status: response.status};

            if (response.status !== 'ok' && response.status !== 'already-exists') {
                that._logger.warn('Creating room failed with status [%s]', response.status);

                return callback(null, result);
            }

            result.room = _.freeze(createImmutableRoomFromResponse.call(that, response));

            callback(null, result);
        });
    }

    function getValidRoomObject(this: any, room:Room_GetValidRoomObject) {
        var roomService = this;

        return (new Room(roomService, '', room.alias, room.name, room.description, room.type, [], room.bridgeId, room.pin)).toJson();
    }

    function enterRoomRequest(this: any, roomId: string, alias: string, callback: (arg0: null, arg1: { status: string; } | null) => void, options: any) {
        var reenter = _.get(options, 'reenter') === true;
        var activeRoom = this._activeRoom.getValue();

        if (activeRoom) {
            var isSameRoom = roomId === activeRoom.getRoomId() || alias === activeRoom.getObservableAlias().getValue();

            if (isSameRoom && !reenter) {
                this._logger.info('Unable to join room. Already in [%s]/[%s] room.', activeRoom.getRoomId(), activeRoom.getObservableAlias().getValue());

                return callback(null, _.assign({room: activeRoom}, isSameRoom ? alreadyInRoomResponse : inAnotherRoomResponse));
            }
        }

        this._authenticationService.assertAuthorized();

        var self = this._self.getValue();

        var screenName = self.getObservableScreenName().getValue();
        var role = self.getObservableRole().getValue();
        var selfForRequest = buildMemberForRequest.call(this, self, null);
        var enterRoomOptions = [];
        var timestamp = _.now();

        if (reenter) {
            enterRoomOptions.push('reenter');
        }

        this._logger.info('Enter room [%s]/[%s] with screen name [%s] and role [%s]', roomId, alias, screenName, role);

        var that = this;

        if (that._isEnteringRoom) {
            that._logger.info('[%s] We are already entering the room [%s], skipping', roomId, alias);

            return;
        }

        that._isEnteringRoom = true;

        this._protocol.enterRoom(roomId, alias, selfForRequest, enterRoomOptions, timestamp,
            function handleEnterRoomResponse(error: null, response: { status: string; self: object; room: any; members: any[]; }) {
                that._isEnteringRoom = false;

                if (error) {
                    that._logger.error('Joining of room failed with error [%s]', error);

                    return callback(error, null);
                }

                var result:any = {status: response.status};

                if (response.status !== 'ok') {
                    that._logger.warn('Joining of room failed with status [%s]', response.status);

                    return callback(null, result);
                }

                result.room = initializeRoomAndBuildCache.call(that, response);

                if (response.status === 'ok' && response.self) {
                    that.getSelf()._update(response.self);
                }

                that._logger.info('Successfully entered room [%s]/[%s]', roomId, alias);

                callback(null, result);
            }
        );
    }

    function leaveRoomRequest(this: any, callback: (arg0: null, arg1: { status: string; } | null) => void, isForceLeaveRoom: boolean) {
        var room = this._activeRoom.getValue();

        if (!_.isBoolean(isForceLeaveRoom)) {
            isForceLeaveRoom = true;
        }

        if (!room) {
            this._logger.info('Not currently in a room.');

            return callback(null, notInRoomResponse);
        }

        if (this._authenticationService.getPCastSessionId() === '' || this._authenticationService.getPCastSessionId() === null) {
            this._logger.warn('Unable to leave room. We are currently not connected. Status [%s]', this._lastPcastStatus);

            return;
        }

        if (this._isLeavingRoom) {
            return;
        }

        this._authenticationService.assertAuthorized();

        var roomId = room.getRoomId();
        var timestamp = _.now();

        this._logger.info('Leave room [%s]', roomId);

        var that = this;

        this._isLeavingRoom = true;

        setTimeout(function() {
            that._activeRoom.setValue(null);
            that._cachedRoom.setValue(null);

            if (isForceLeaveRoom) {
                that._isLeavingRoom = false;
                callback(null, {status: 'ok'});
            }
        });

        this._protocol.leaveRoom(roomId, timestamp,
            function handleLeaveRoomResponse(error: null, response: { status: string; }) {
                that._isLeavingRoom = false;

                if (error) {
                    that._logger.error('Leaving room failed with error [%s]', error);

                    if (isForceLeaveRoom) {
                        return;
                    }

                    return callback(error, null);
                }

                if (response.status !== 'ok') {
                    that._logger.warn('Leaving room failed with status [%s]', response.status);
                }

                if (isForceLeaveRoom) {
                    return;
                }

                return callback(null, {status: response.status});
            }
        );
    }

    function updateMemberRequest(this: any, member: { getSessionId: any; getObservableLastUpdate?: any; }, callback: (arg0: null, arg1: { status: string; lastUpdate: number; } | null) => void) {
        if (!this._activeRoom.getValue()) {
            this._logger.warn('Not in a room. Please Enter a room before updating member.');

            return callback(null, notInRoomResponse);
        }

        this._authenticationService.assertAuthorized();

        var activeRoom = this._activeRoom.getValue();
        var roomId = activeRoom.getRoomId();
        var memberIsSelf = member.getSessionId() === this.getSelf().getSessionId();
        var cachedMember = findMemberInObservableRoom(member.getSessionId(), this._cachedRoom);

        var memberForRequest = buildMemberForRequest.call(this, member, cachedMember);
        var timestamp = _.now();
        var wasSelfAudienceMember = memberIsSelf && !cachedMember;
        var isSelfBecomingAudience = memberIsSelf && memberForRequest.role === memberEnums.roles.audience.name;

        if (wasSelfAudienceMember) {
            memberForRequest.lastUpdate = member.getObservableLastUpdate().getValue();
        }

        this._logger.info('Updating member info [%s] for active room [%s]', memberForRequest, roomId);

        var that = this;

        this._protocol.updateMember(roomId, memberForRequest, timestamp,
            function handleUpdateMemberResponse(error: null, response: { status: string; lastUpdate: number; }) {
                if (error) {
                    that._logger.error('Update of member failed with error [%s]', error);

                    return callback(error, null);
                }

                var result = {
                    status: response.status,
                    lastUpdate: response.lastUpdate
                };

                if (response.status !== 'ok') {
                    that._logger.info('Update of member failed with status [%s]', response.status);
                }

                if (response.status === 'ok' && isSelfBecomingAudience && _.isNumber(response.lastUpdate)) {
                    that.getSelf().getObservableLastUpdate().setValue(response.lastUpdate);
                }

                callback(null, result);
            }
        );
    }

    function updateRoomRequest(this: any, callback: (arg0: null, arg1: { status: any; } | null) => void) {
        if (!this._activeRoom.getValue()) {
            this._logger.warn('Not in a room. Please Enter a room before updating member.');

            return callback(null, notInRoomResponse);
        }

        this._authenticationService.assertAuthorized();

        var room = this._activeRoom.getValue();
        var timestamp = _.now();

        var that = this;

        this._protocol.updateRoom(room.toJson(), timestamp,
            function handleUpdateMemberResponse(error: null, response: { status: string; }) {
                if (error) {
                    that._logger.error('Update of room failed with error [%s]', error);

                    return callback(error, null);
                }

                var result = {status: response.status};

                if (response.status !== 'ok') {
                    that._logger.warn('Update of room failed with status [%s]', response.status);
                }

                callback(null, result);
            }
        );
    }

    function createImmutableRoomFromResponse(this: any, response: { room: any; members: any[]; }) {
        var roomInfo = response.room;
        var members = response.members || [];
        var roomService = this;

        return new ImmutableRoom(roomService, roomInfo.roomId, roomInfo.alias, roomInfo.name, roomInfo.description, roomInfo.type, members, roomInfo.bridgeId, roomInfo.pin);
    }

    function createRoomFromResponse(this: any, response: { room: any; members: any[]; }) {
        var roomInfo = response.room;
        var members = response.members;
        var roomService = this;

        return new Room(roomService, roomInfo.roomId, roomInfo.alias, roomInfo.name, roomInfo.description, roomInfo.type, members, roomInfo.bridgeId, roomInfo.pin);
    }

    function initializeRoomAndBuildCache(this: any, response: { room: any; members: any[]; }) {
        var activeRoom = this._activeRoom.getValue();
        var cachedRoom = this._cachedRoom.getValue();
        var room = createRoomFromResponse.call(this, response);
        // The cached room does not contain a reference to the self object so updates to self and room are detected by comparing it against the cached room
        var newCachedRoom = createRoomFromResponse.call(this, response);

        replaceSelfInstanceInRoom.call(this, room);

        if (activeRoom && cachedRoom) {
            this._logger.debug('[%s] Updating existing room model.', activeRoom.getRoomId());
            activeRoom._update(response.room);
            cachedRoom._update(response.room);

            activeRoom.getObservableMembers().setValue(room.getObservableMembers().getValue());
            cachedRoom.getObservableMembers().setValue(newCachedRoom.getObservableMembers().getValue());

            return activeRoom;
        }

        this._activeRoom.setValue(room);
        this._cachedRoom.setValue(newCachedRoom);

        return room;
    }

    function replaceSelfInstanceInRoom(this: any, room:Room_ReplaceSelfInstanceInRoom) {
        var self = this._self.getValue();
        var members = room.getObservableMembers().getValue();

        var selfIndex = _.findIndex(members, function(member: { getSessionId: () => any; }) {
            return self.getSessionId() === member.getSessionId();
        });

        if (selfIndex < 0) {
            this._logger.debug('Self not in server room model.');

            return false;
        }

        self._update(members[selfIndex].toJson());

        members[selfIndex] = self;

        room.getObservableMembers().setValue(members);

        return true;
    }

    return RoomService;
});