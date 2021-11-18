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
    'phenix-web-disposable',
    './PCastExpress',
    '../room/RoomService',
    './MemberSelector',
    '../room/Stream',
    '../room/room.json',
    '../room/member.json',
    '../room/stream.json',
    '../room/track.json',
    '../streaming/FeatureDetector'
], function(_, assert, observable, disposable, PCastExpress, RoomService, MemberSelector, Stream, roomEnums, memberEnums, memberStreamEnums, trackEnums, FeatureDetector) {
    'use strict';

    var defaultStreamWildcardTokenRefreshInterval = 300000;
    var streamingTypeCapabilities = ['streaming', 'rtmp'];

    function RoomExpress(options) {
        assert.isObject(options, 'options');

        if (options.pcastExpress) {
            assert.isObject(options.pcastExpress, 'options.pcastExpress');
        }

        this._pcastExpress = options.pcastExpress || new PCastExpress(options);
        this._shouldDisposeOfPCastExpress = !options.pcastExpress;
        this._roomServices = {};
        this._externalPublishers = [];
        this._roomServicePublishers = {};
        this._activeRoomServices = [];
        this._publisherDisposables = {};
        this._logger = this._pcastExpress.getPCast().getLogger();
        this._disposables = new disposable.DisposableList();
        this._disposed = false;
        this._featureDetector = new FeatureDetector(options.features);
        this._isHandlingTrackChange = false;
        this._handleStateChangeTimeOut = null;

        var that = this;

        this._pcastExpress.getPCastObservable().subscribe(function(pcast) {
            if (!pcast) {
                return;
            }

            that._logger.info('Resetting Room Express after change in pcast.');

            that._pcastExpress.waitForOnline(function() {
                var currentPCast = that._pcastExpress.getPCastObservable().getValue();

                if (currentPCast !== pcast) {
                    return;
                }

                _.forOwn(that._roomServices, function(roomService) {
                    roomService.setPCast(pcast);
                });
            });
        });
    }

    RoomExpress.prototype.dispose = function dispose() {
        this._disposed = true;

        disposeOfRoomServices.call(this);

        if (this._shouldDisposeOfPCastExpress) {
            this._pcastExpress.dispose();
        }

        this._disposables.dispose();

        this._logger.info('Disposed Room Express Instance');
    };

    RoomExpress.prototype.getPCastExpress = function getPCastExpress() {
        return this._pcastExpress;
    };

    // Responsible for creating room. Returns immutable room
    RoomExpress.prototype.createRoom = function createRoom(options, callback) {
        assert.isFunction(callback, 'callback');
        assert.isObject(options.room, 'options.room');
        assert.isStringNotEmpty(options.room.name, 'options.room.name');
        assert.isStringNotEmpty(options.room.type, 'options.room.type');

        if (options.room.description) {
            assert.isStringNotEmpty(options.room.description, 'options.room.description');
        }

        var roomDescription = options.room.description || getDefaultRoomDescription(options.room.type);

        createRoomService.call(this, null, null, function(error, roomServiceResponse) {
            if (error) {
                return callback(error);
            }

            if (roomServiceResponse.status !== 'ok') {
                return callback(null, roomServiceResponse);
            }

            var roomService = roomServiceResponse.roomService;
            var roomToCreate = _.assign({}, options.room);

            if (!roomToCreate.description) {
                roomToCreate.description = roomDescription;
            }

            roomService.createRoom(roomToCreate, function(error, roomResponse) {
                if (error) {
                    return callback(error);
                }

                // Don't return room service. Not in room. Room returned is immutable
                roomService.stop('create');

                return callback(null, roomResponse);
            });
        });
    };

    RoomExpress.prototype.joinRoom = function joinRoom(options, joinRoomCallback, membersChangedCallback) {
        assert.isObject(options, 'options');
        assert.isFunction(joinRoomCallback, 'joinRoomCallback');
        assert.isStringNotEmpty(options.role, 'options.role');

        if (membersChangedCallback) {
            assert.isFunction(membersChangedCallback, 'membersChangedCallback');
        }

        if (options.screenName) {
            assert.isStringNotEmpty(options.screenName, 'options.screenName');
        }

        if (options.roomId) {
            assert.isStringNotEmpty(options.roomId, 'options.roomId');
        }

        if (options.alias) {
            assert.isStringNotEmpty(options.alias, 'options.alias');
        }

        if (options.streams) {
            assert.isArray(options.streams, 'options.streams');
        }

        var that = this;
        var joinRoomWithPCast = function(pcast) {
            if (!pcast) {
                return;
            }

            joinRoomWithOptions.call(that, options, function(error, response) {
                var joinRoomResponse = response;

                if (joinRoomResponse && joinRoomResponse.roomService) {
                    var leaveRoom = joinRoomResponse.roomService.leaveRoom;

                    joinRoomResponse.roomService.leaveRoom = function(callback, isForceLeaveRoom) {
                        if (subscription && pcast.getObservableStatus() !== 'offline') {
                            subscription.dispose();
                        }

                        leaveRoom(callback, isForceLeaveRoom);
                    };
                }

                joinRoomCallback(error, response);
            }, membersChangedCallback);
        };

        if (this._pcastExpress.getPCastObservable()) {
            return joinRoomWithPCast(this._pcastExpress.getPCastObservable());
        }

        var subscription = this._pcastExpress.getPCastObservable().subscribe(joinRoomWithPCast);
    };

    RoomExpress.prototype.publishToRoom = function publishToRoom(options, callback) {
        assert.isObject(options, 'options');
        assert.isFunction(callback, 'callback');
        assert.isObject(options.room, 'options.room');

        var adminApi = this._pcastExpress.getAdminAPI();

        if (options.streamUri) {
            assert.isStringNotEmpty(options.streamUri, 'options.streamUri');
        } else if (options.mediaConstraints) {
            assert.isObject(options.mediaConstraints, 'options.mediaConstraints');
        } else {
            assert.isObject(options.userMediaStream, 'options.userMediaStream');
        }

        if (options.videoElement) {
            assert.isObject(options.videoElement, 'options.videoElement');
        }

        if (options.screenName) {
            assert.isStringNotEmpty(options.screenName, 'options.screenName');
        }

        if (options.tags) {
            assert.isArray(options.tags, 'options.tags');
        }

        if (options.streamInfo) {
            assert.isObject(options.streamInfo, 'options.streamInfo');
        }

        if (options.streamToken) {
            assert.isStringNotEmpty(options.streamToken, 'options.streamToken');
            this._logger.warn('`options.streamToken` is deprecated please use `options.publishToken`.');
        }

        if (options.publishToken && options.capabilities) {
            throw new Error('Do not pass `options.capabilities` with `options.publishToken`. `options.publishToken` should include capabilities in the token.');
        }

        if (options.publishToken && options.streamToken) {
            throw new Error('Do not pass `options.streamToken` with `options.publishToken`. Please use `options.publishToken`.');
        }

        if (options.streamToken && options.capabilities) {
            throw new Error('Do not pass `options.capabilities` with `options.streamToken`. `options.streamToken` should include capabilities in the token.');
        }

        if (!options.streamToken && !options.publishToken && !adminApi) {
            throw new Error('Pass `options.publishToken`, or set adminApiProxyClient on initiating room express');
        }

        if (options.viewerStreamSelectionStrategy) {
            assert.isStringNotEmpty(options.viewerStreamSelectionStrategy, 'options.viewerStreamSelectionStrategy');
        }

        if (options.capabilities) {
            assert.isArray(options.capabilities, 'options.capabilities');
        }

        if (_.isUndefined(options.enableWildcardCapability)) {
            options.enableWildcardCapability = !(options.publishToken || options.streamToken);
        }

        assert.isValidType(options.streamType, memberStreamEnums.types, 'options.streamType');
        assert.isValidType(options.memberRole, memberEnums.roles, 'options.memberRole');
        assert.isBoolean(options.enableWildcardCapability, 'options.enableWildcardCapability');

        var that = this;
        var screenName = options.screenName || _.uniqueId();
        var roomId = options.room.roomId;
        var alias = options.room.alias;

        if (options.publishToken || options.streamToken) {
            roomId = this._pcastExpress.parseRoomOrChannelIdFromToken(options.publishToken || options.streamToken);
            alias = this._pcastExpress.parseRoomOrChannelAliasFromToken(options.publishToken || options.streamToken);

            this._logger.info('[%s] [%s] RoomId and Alias read from token [%s]', roomId, alias, options.publishToken || options.streamToken);
        }

        var activeRoomService = findActiveRoom.call(that, roomId, alias);

        var joinAndPublish = function joinAndPublish(room, createRoomResponse) {
            var publishOptions = _.assign({
                monitor: {
                    callback: _.bind(monitorSubsciberOrPublisher, that, callback),
                    options: {conditionCountForNotificationThreshold: 8}
                },
                streamInfo: {}
            }, options);

            if (room.getObservableType().getValue() === roomEnums.types.channel.name) {
                publishOptions.tags = ['channelId:' + room.getRoomId(), 'channelAlias:' + room.getObservableAlias().getValue()].concat(publishOptions.tags || []);
            } else {
                publishOptions.tags = ['roomId:' + room.getRoomId(), 'roomAlias:' + room.getObservableAlias().getValue()].concat(publishOptions.tags || []);
            }

            if (options.streamUri) {
                var remoteOptions = _.assign({connectOptions: []}, publishOptions);
                var hasRoomConnectOptions = _.find(remoteOptions.connectOptions, function(option) {
                    return _.startsWith(option, 'room-id');
                });

                if (!hasRoomConnectOptions) {
                    remoteOptions.connectOptions = remoteOptions.connectOptions.concat([
                        'room-id=' + room.getRoomId(),
                        'member-role=' + options.memberRole,
                        'member-stream-type=' + options.streamType,
                        'screen-name=' + screenName
                    ]);
                }

                if (options.enableWildcardCapability) {
                    remoteOptions.connectOptions.concat([
                        'member-stream-token-type=Wildcard',
                        'member-stream-token-refresh-interval=' + defaultStreamWildcardTokenRefreshInterval
                    ]);
                }

                var callbackWithRoomService = function(error, response) {
                    callback(error, response ? _.assign({roomService: null}, response) : response);
                };

                return that._pcastExpress.publishRemote(remoteOptions, callbackWithRoomService);
            }

            var joinRoomAsAudienceOptions = _.assign({}, options, {
                role: memberEnums.roles.audience.name,
                roomId: room.getRoomId()
            });

            joinRoomWithOptions.call(that, joinRoomAsAudienceOptions, function(error, joinRoomResponse) {
                if (error) {
                    return callback(error);
                }

                if (joinRoomResponse.status !== 'ok' && joinRoomResponse.status !== 'already-in-room') {
                    return callback(null, createRoomResponse);
                }

                var activeRoom = joinRoomResponse.roomService.getObservableActiveRoom().getValue();
                var callbackWithRoomService = function(error, response) {
                    callback(error, response ? _.assign({roomService: joinRoomResponse.roomService}, response) : response);
                };

                publishAndUpdateSelf.call(that, publishOptions, activeRoom, callbackWithRoomService);
            });

            return;
        };

        if (activeRoomService) {
            var activeRoom = activeRoomService.getObservableActiveRoom().getValue();

            joinAndPublish(activeRoom, null);

            return;
        }

        this.createRoom(options, function(error, createRoomResponse) {
            if (error) {
                return callback(error);
            }

            if (createRoomResponse.status !== 'ok' && createRoomResponse.status !== 'already-exists') {
                return callback(null, createRoomResponse);
            }

            var room = createRoomResponse.room;

            joinAndPublish(room, createRoomResponse);
        });
    };

    RoomExpress.prototype.publishScreenToRoom = function publishScreenToRoom(options, callback) {
        var publishScreenOptions = _.assign({mediaConstraints: {screen: true}}, options);

        this.publishToRoom(publishScreenOptions, callback);
    };

    RoomExpress.prototype.subscribeToMemberStream = function(memberStream, options, callback, defaultFeatureIndex) {
        var capabilitiesFromStreamToken;
        var that = this;

        assert.isObject(memberStream, 'memberStream');
        assert.isObject(options, 'options');
        assert.isFunction(callback, 'callback');

        defaultFeatureIndex = _.isNumber(defaultFeatureIndex) ? defaultFeatureIndex : 0;

        if (options.capabilities) {
            throw new Error('subscribeToMemberStream options.capabilities is deprecated. Please use the constructor features option');
        }

        if (options.streamToken) {
            capabilitiesFromStreamToken = getCapabilitiesFromTokenIfAble.call(that, options.streamToken);

            if (!capabilitiesFromStreamToken) {
                that._logger.warn('Failed to parse the `streamToken` [%s]', options.streamToken);

                return callback(new Error('Bad `streamToken`'), {status: 'bad-token'});
            }
        }

        var streamUri = memberStream.getUri();
        var streamId = memberStream.getPCastStreamId();
        var streamInfo = memberStream.getInfo();
        var isScreen = _.get(streamInfo, ['isScreen'], false);
        var streamToken = null;
        var capabilities = streamInfo.capabilities || buildCapabilitiesFromPublisherWildcardTokens(streamUri) || [];
        var publisherCapabilities = capabilitiesFromStreamToken || capabilities;
        var preferredFeature = this._featureDetector.getPreferredFeatureFromPublisherCapabilities(publisherCapabilities);
        var preferredFeatureCapability = FeatureDetector.mapFeatureToPCastCapability(preferredFeature);
        var subscriberCapabilities = preferredFeatureCapability ? [preferredFeatureCapability] : [];
        var featureCapabilities = this._featureDetector.getFeaturePCastCapabilities();
        var isUsingDeprecatedSdk = false;

        if (!streamId) {
            this._logger.error('Invalid Member Stream. Unable to parse streamId from uri');

            throw new Error('Invalid Member Stream. Unable to parse streamId from uri');
        }

        // TODO(dy) Remove backward compatibility when all publisher clients adapt to providing capabilities.
        if (!_.hasIndexOrKey(streamInfo, 'capabilities')) {
            if (!preferredFeature) {
                var capability = _.get(featureCapabilities, [defaultFeatureIndex]);

                if (!capability && defaultFeatureIndex >= featureCapabilities.length) {
                    return callback(null, {status: 'no-supported-features'});
                }

                subscriberCapabilities = capability ? [capability] : [];
                preferredFeature = capability ? _.get(FeatureDetector.mapPCastCapabilityToFeatures(capability), [0]) : null;
            }

            if (!streamInfo.streamTokenForLiveStream && preferredFeatureCapability === 'streaming') {
                this._logger.warn('Streaming is not available for stream [%].', streamId);

                return callback(null, {status: 'streaming-not-available'});
            }

            streamToken = parseStreamTokenFromStreamUri(streamUri, subscriberCapabilities);
            isUsingDeprecatedSdk = true;
        } else {
            if (!preferredFeature) {
                this._logger.warn('Unable to find supported feature. Publisher capabilities [%s]. Requested feature capabilities [%s]', streamInfo.capabilities, featureCapabilities);

                return callback(null, {status: 'unsupported-features'});
            }

            streamToken = getStreamTokenForFeature(streamUri, preferredFeature);
        }

        this._logger.info('Subscribing to member stream with feature [%s] and pre-generated token [%s]', preferredFeature, !!streamToken);

        var subscribeOptions = _.assign({}, {
            streamId: streamId,
            streamToken: streamToken,
            capabilities: subscriberCapabilities
        }, options);
        var disposables = new disposable.DisposableList();

        subscribeToMemberStream.call(this, subscribeOptions, isScreen, function(error, response) {
            disposables.dispose();

            if (response && response.status === 'ok' && response.mediaStream && response.mediaStream.getStream()) {
                disposables.add(memberStream.getObservableAudioState().subscribe(function(state) {
                    var monitor = response.mediaStream.getMonitor();
                    var tracks = response.mediaStream.getStream().getAudioTracks();

                    if (monitor && tracks.length === 1) {
                        monitor.setMonitorTrackState(tracks[0], state === trackEnums.states.trackEnabled.name);
                    }
                }, {initial: 'notify'}));
                disposables.add(memberStream.getObservableVideoState().subscribe(function(state) {
                    var monitor = response.mediaStream.getMonitor();
                    var tracks = response.mediaStream.getStream().getVideoTracks();

                    if (monitor && tracks.length === 1) {
                        monitor.setMonitorTrackState(tracks[0], state === trackEnums.states.trackEnabled.name);
                    }
                }, {initial: 'notify'}));
            }

            if (error && parseInt(error.category) === 6) {
                return callback(error, {status: 'device-insecure'});
            }

            // TODO(dy) Remove backward compatibility when all publisher clients adapt to providing capabilities.
            if (response && (response.status === 'failed' || response.status === 'streaming-not-available') && isUsingDeprecatedSdk && defaultFeatureIndex < featureCapabilities.length) {
                that._logger.info('Attempting to subscribe to member stream with next available feature after failure');

                return that.subscribeToMemberStream(memberStream, options, callback, defaultFeatureIndex + 1);
            }

            var responseWithOriginStreamId = _.assign({originStreamId: streamId}, response);

            callback(error, responseWithOriginStreamId);
        });
    };

    function getCapabilitiesFromTokenIfAble(streamToken) {
        var that = this;

        try {
            var capabilitiesFromStreamToken = that._pcastExpress.parseCapabilitiesFromToken(streamToken);

            return capabilitiesFromStreamToken;
        } catch (e) {
            return;
        }
    }

    function disposeOfRoomServices() {
        _.forOwn(this._roomServicePublishers, function(publishers) {
            _.forEach(publishers, function(publisher) {
                publisher.stop('dispose');
            });
        });
        _.forOwn(this._roomServices, function(roomService) {
            roomService.stop('dispose');
        });

        this._roomServicePublishers = {};
        this._externalPublishers = [];
        this._roomServices = {};
        this._activeRoomServices = [];
    }

    function createRoomService(roomId, alias, callback) {
        var that = this;
        var uniqueId = _.uniqueId();

        this._pcastExpress.waitForOnline(function(error) {
            if (error) {
                return callback(error);
            }

            var activeRoomService = findActiveRoom.call(that, roomId, alias);

            if (activeRoomService) {
                that._logger.info('Reusing room service for room [%s]/[%s]', roomId, alias);

                return callback(null, {
                    status: 'ok',
                    roomService: activeRoomService
                });
            }

            that._roomServices[uniqueId] = new RoomService(that._pcastExpress.getPCast());

            var expressRoomService = createExpressRoomService.call(that, that._roomServices[uniqueId], uniqueId);

            that._logger.info('Creating room service for room [%s]/[%s]', roomId, alias);

            callback(null, {
                status: 'ok',
                roomService: expressRoomService
            });
        });
    }

    function findActiveRoom(roomId, alias) {
        return _.find(this._activeRoomServices, function(roomService) {
            var activeRoom = roomService.getObservableActiveRoom().getValue();

            return activeRoom && (activeRoom.getRoomId() === roomId || activeRoom.getObservableAlias().getValue() === alias);
        });
    }

    function createExpressRoomService(roomService, uniqueId) {
        var that = this;
        var roomServiceStop = roomService.stop;
        var roomServiceLeaveRoom = roomService.leaveRoom;

        roomService.stop = function() {
            roomServiceStop.apply(roomService, arguments);

            delete that._roomServices[uniqueId];
        };

        roomService.leaveRoom = function leaveRoom(callback, isForceLeaveRoom) {
            var room = roomService.getObservableActiveRoom().getValue();

            roomServiceLeaveRoom.call(roomService, function(error, response) {
                if (error) {
                    roomService.stop('leave-room-failure');

                    return callback(error);
                }

                if (response.status !== 'ok' && response.status !== 'not-in-room') {
                    return callback(null, response);
                }

                that._logger.info('Successfully disposed Express Room Service [%s]', room ? room.getRoomId() : 'Uninitialized');

                roomService.stop('leave-room');

                return callback(null, response);
            }, isForceLeaveRoom);
        };

        return roomService;
    }

    function joinRoomWithOptions(options, joinRoomCallback, membersChangedCallback) {
        var that = this;
        var role = options.role;
        var screenName = options.screenName || _.uniqueId();

        createRoomService.call(that, options.roomId, options.alias, function(error, roomServiceResponse) {
            if (error) {
                return joinRoomCallback(error);
            }

            if (roomServiceResponse.status !== 'ok') {
                return joinRoomCallback(null, roomServiceResponse);
            }

            var roomService = roomServiceResponse.roomService;
            var activeRoomObservable = roomService.getObservableActiveRoom();
            var activeRoom = activeRoomObservable.getValue();
            var membersSubscription = null;
            var setupMembersSubscription = function setupMembersSubscription() {
                var room = activeRoomObservable.getValue();

                if (!room) {
                    that._logger.warn('Unable to setup members subscription. Not in room.');

                    return;
                }

                that._logger.info('Setup member subscription for room [%s]', room.getRoomId());

                membersSubscription = room.getObservableMembers().subscribe(membersChangedCallback, {initial: 'notify'});

                that._disposables.add(activeRoomObservable.subscribe(function(newRoom) {
                    if (membersSubscription) {
                        membersChangedCallback([]);
                        membersSubscription.dispose();
                        membersSubscription = null;
                    }

                    if (!newRoom) {
                        return;
                    }

                    membersSubscription = newRoom.getObservableMembers().subscribe(membersChangedCallback, {initial: 'notify'});
                }));
            };

            if (!activeRoom) {
                roomService.start(role, screenName);
            }

            if (options.streams && options.streams.length > 0) {
                var stream = options.streams[0]; // TODO(dy) support multiple streams

                if (options.streamsWildcardTokenCapabilities && !_.includes(options.streams[0].uri, Stream.getPCastPrefix())) {
                    options.streams[0].uri = Stream.getPCastPrefix() + options.streams[0].uri;
                    that._externalPublishers.push(options.streams[0].uri);
                }

                if (options.streamsWildcardTokenCapabilities && activeRoom && !_.includes(stream.uri, 'streamToken')) {
                    return createViewerStreamTokensAndUpdateSelf.call(that, options, stream, activeRoom, function(error, response) {
                        joinRoomCallback(error, _.assign({roomService: roomService}, response));

                        if (membersChangedCallback) {
                            return setupMembersSubscription();
                        }
                    });
                }

                var roleToJoin = options.streamsWildcardTokenCapabilities && !activeRoom && !_.includes(stream.uri, 'streamToken') ? memberEnums.roles.audience.name : options.role;

                updateSelfStreamsAndRole.call(that, options.streams, roleToJoin, roomService, function(error) {
                    if (error) {
                        return joinRoomCallback(error);
                    }
                });
            }

            if (activeRoom) {
                joinRoomCallback(null, {
                    status: 'ok',
                    roomService: roomService
                });

                if (membersChangedCallback) {
                    setupMembersSubscription();
                }

                return;
            }

            roomService.enterRoom(options.roomId, options.alias, function(error, roomResponse) {
                if (error) {
                    roomService.stop('enter-room-failure');

                    return joinRoomCallback(error);
                }

                if (roomResponse.status === 'not-found') {
                    roomService.stop('enter-room-failure');

                    return joinRoomCallback(null, {status: 'room-not-found'});
                }

                if (roomResponse.status !== 'ok' && roomResponse.status !== 'already-in-room') {
                    roomService.stop('enter-room-failure');

                    return joinRoomCallback(null, roomResponse);
                }

                var room = roomResponse.room;
                var stream = _.get(options, ['streams', 0]); // TODO(dy) support multiple streams

                that._activeRoomServices.push(roomService);

                if (options.streamsWildcardTokenCapabilities && stream && !_.includes(stream.uri, 'streamToken')) {
                    return createViewerStreamTokensAndUpdateSelf.call(that, options, stream, room, function(error, response) {
                        joinRoomCallback(error, _.assign({roomService: roomService}, response));

                        if (membersChangedCallback) {
                            return setupMembersSubscription();
                        }
                    });
                }

                joinRoomCallback(null, {
                    status: 'ok',
                    roomService: roomService
                });

                if (membersChangedCallback) {
                    return setupMembersSubscription();
                }
            });
        });
    }

    function subscribeToMemberStream(subscribeOptions, isScreen, callback) {
        var that = this;

        var count = 0;
        var handleSubscribe = function(error, response) {
            if (error) {
                return callback(error);
            }

            if (response.status !== 'ok' && response.status !== 'streaming-not-ready') {
                return callback(null, response);
            }

            count++;

            if (response.status === 'streaming-not-ready' && count < 3) {
                var retryTimeout = count * count * 1000;

                that._logger.info('Waiting for [%s] ms before retrying after [streaming-not-ready] status.', retryTimeout);

                var timeoutId = setTimeout(response.retry, retryTimeout);

                that._disposables.add(new disposable.Disposable(function() {
                    clearTimeout(timeoutId);
                }));

                return;
            } else if (response.status === 'streaming-not-ready' && count >= 3) {
                return callback(null, {status: response.status});
            }

            var subscribeResponse = _.assign({}, response, {status: 'ok'});

            if (count > 1) {
                subscribeResponse.reason = 'stream-failure-recovered';

                return callback(null, subscribeResponse);
            }

            callback(null, subscribeResponse);
        };

        if (isScreen) {
            return that._pcastExpress.subscribeToScreen(subscribeOptions, handleSubscribe);
        }

        return that._pcastExpress.subscribe(subscribeOptions, handleSubscribe);
    }

    function publishAndUpdateSelf(options, room, callback) {
        var that = this;
        var publisher;
        var refreshTokenIntervalId;
        var callbackWithPublisher = function(error, response) {
            callback(error, response ? _.assign({publisher: publisher}, response) : response);
        };

        var handlePublish = function(error, response) {
            if (refreshTokenIntervalId && publisher) {
                clearInterval(refreshTokenIntervalId);
            }

            if (error) {
                return callbackWithPublisher(error);
            }

            if (response.status !== 'ok') {
                return callbackWithPublisher(null, response);
            }

            addPublisher.call(that, response.publisher, room);
            removePublisher.call(that, publisher, room);

            publisher = response.publisher;

            that._publisherDisposables[publisher.getStreamId()] = new disposable.DisposableList();

            var publisherStop = _.bind(publisher.stop, publisher);

            publisher.stop = function() {
                clearInterval(refreshTokenIntervalId);

                removePublisher.call(that, publisher, room);

                var streamsAfterStop = mapNewPublisherStreamToMemberStreams.call(that, null, room);
                var roomService = findActiveRoom.call(that, room.getRoomId());
                var publisherDisposable = that._publisherDisposables[publisher.getStreamId()];

                if (publisherDisposable) {
                    publisherDisposable.dispose();

                    delete that._publisherDisposables[publisher.getStreamId()];
                }

                publisherStop.apply(publisher, arguments);

                if (!roomService) {
                    return;
                }

                updateSelfStreamsAndRoleAndEnterRoomIfNecessary.call(that, streamsAfterStop, streamsAfterStop.length === 0 ? memberEnums.roles.audience.name : options.memberRole, roomService, room, options, function(error) {
                    if (error) {
                        return callbackWithPublisher(error);
                    }
                });
            };

            listenForTrackStateChange.call(that, publisher, room, callbackWithPublisher);

            if (options.enableWildcardCapability) {
                refreshTokenIntervalId = setInterval(function() {
                    that._logger.info('Refresh wildcard viewer stream token for [%s] interval of [%s] has expired. Creating new token.',
                        publisher.getStreamId(), defaultStreamWildcardTokenRefreshInterval);

                    var activeRoomService = findActiveRoom.call(that, room.getRoomId(), room.getObservableAlias().getValue());
                    var activeRoom = activeRoomService ? activeRoomService.getObservableActiveRoom().getValue() : room;

                    createOptionalViewerStreamTokensAndUpdateSelf.call(that, options, publisher, activeRoom, function ignoreSuccess(error, response) {
                        if (error || response.status !== 'ok') {
                            callbackWithPublisher(error, response);
                        }
                    });
                }, defaultStreamWildcardTokenRefreshInterval);

                that._disposables.add(new disposable.Disposable(function() {
                    clearInterval(refreshTokenIntervalId);
                }));
            }

            createOptionalViewerStreamTokensAndUpdateSelf.call(that, options, response.publisher, room, callbackWithPublisher);
        };

        if (_.get(options, ['mediaConstraints', 'screen'], false)) {
            _.set(options, ['streamInfo', 'isScreen'], true);

            return this._pcastExpress.publishScreen(options, handlePublish);
        }

        this._pcastExpress.publish(options, handlePublish);
    }

    function addPublisher(publisher, room) {
        if (!this._roomServicePublishers[room.getRoomId()]) {
            this._roomServicePublishers[room.getRoomId()] = [];
        }

        this._roomServicePublishers[room.getRoomId()].push(publisher);
    }

    function removePublisher(publisher, room) {
        if (!this._roomServicePublishers[room.getRoomId()] || !publisher) {
            return;
        }

        this._roomServicePublishers[room.getRoomId()] = _.filter(this._roomServicePublishers[room.getRoomId()], function(roomPublisher) {
            return roomPublisher.getStreamId() !== publisher.getStreamId();
        });
    }

    function createOptionalViewerStreamTokensAndUpdateSelf(options, publisher, room, callback) {
        var that = this;
        var streamType = options.streamType;
        var streamInfo = options.streamInfo;
        var capabilities = [];

        if (options.streamToken) {
            var capabilitiesFromStreamToken = getCapabilitiesFromTokenIfAble.call(that, options.streamToken);

            if (!capabilitiesFromStreamToken) {
                return callback(new Error('Bad `streamToken`'), {status: 'bad-token'});
            }

            capabilities = capabilitiesFromStreamToken;
        } else {
            capabilities = options.capabilities;
        }

        var publisherStream = mapStreamToMemberStream(publisher, streamType, streamInfo, capabilities);

        if (!options.enableWildcardCapability) {
            var activeRoomService = findActiveRoom.call(this, room.getRoomId(), room.getObservableAlias().getValue());
            var updateSelfOptions = _.assign({}, options, {streams: mapNewPublisherStreamToMemberStreams.call(this, publisherStream, room)});

            return updateSelfStreamsAndRoleAndEnterRoomIfNecessary.call(this, updateSelfOptions.streams, updateSelfOptions.memberRole, activeRoomService, room, updateSelfOptions, callback);
        }

        return createViewerStreamTokensAndUpdateSelf.call(this, options, publisherStream, room, callback);
    }

    function createViewerStreamTokensAndUpdateSelf(options, publisherStream, room, callback) {
        var that = this;
        var composeWithAdditionalStreams = options.viewerStreamSelectionStrategy === 'high-availability' && room.getObservableType().getValue() === roomEnums.types.channel.name;
        var additionalStreamIds = [];
        var handleJoinRoomCallback = callback;
        var publisherStreamId = Stream.parsePCastStreamIdFromStreamUri(_.get(publisherStream, 'uri', ''));
        var protocol = that.getPCastExpress().getPCast().getProtocol();
        var sessionId = protocol ? protocol.getSessionId() : '';
        var disposables = that._publisherDisposables[publisherStreamId];
        var disposable;

        if (!_.includes(publisherStream, 'capabilities')) {
            if (options.streamToken) {
                var capabilitiesFromStreamToken = getCapabilitiesFromTokenIfAble.call(that, options.streamToken);

                if (!capabilitiesFromStreamToken) {
                    return callback(new Error('Bad `streamToken`'), {status: 'bad-token'});
                }

                publisherStream = addStreamInfo(publisherStream, 'capabilities', capabilitiesFromStreamToken.join(','));
            } else {
                publisherStream = addStreamInfo(publisherStream, 'capabilities', options.capabilities.join(','));
            }
        }

        if (composeWithAdditionalStreams) {
            var membersWithSameContent = MemberSelector.getSimilarMembers(options.screenName, sessionId, room.getObservableMembers().getValue());

            additionalStreamIds = getValidStreamIds(membersWithSameContent);

            handleJoinRoomCallback = function(error, response) {
                callback(error, response);

                var roomService = _.get(response, 'roomService', findActiveRoom.call(that, room.getRoomId(), room.getObservableAlias().getValue()));

                if (error || response.status !== 'ok' || disposable || !roomService) {
                    return;
                }

                var activeRoom = roomService.getObservableActiveRoom().getValue();

                disposable = activeRoom.getObservableMembers().subscribe(function(members) {
                    var self = roomService.getSelf();
                    var selfSessionId = self ? self.getSessionId() : '';
                    var newMembersWithSameContent = MemberSelector.getSimilarMembers(options.screenName, selfSessionId, members);
                    var newAdditionalStreamIds = getValidStreamIds(newMembersWithSameContent);
                    var areTheSame = newAdditionalStreamIds.length === additionalStreamIds.length && _.reduce(newAdditionalStreamIds, function(areAllPreviousTheSame, streamId) {
                        return areAllPreviousTheSame ? _.includes(additionalStreamIds, streamId) : areAllPreviousTheSame;
                    }, true);
                    var selfStreams = self ? self.getObservableStreams().getValue() : [];
                    var publishedSelfStream = _.find(selfStreams, function(stream) {
                        return stream.getPCastStreamId() === publisherStreamId;
                    });

                    if (!publishedSelfStream) {
                        disposable.dispose();
                        disposable = null;

                        return;
                    }

                    if (areTheSame) {
                        return;
                    }

                    that._logger.debug('Members with similar content to stream [%s] have changed. Generating new wildcard viewer token', publisherStreamId);

                    disposable.dispose();
                    disposable = null;

                    createViewerStreamTokensAndUpdateSelf.call(that, options, publisherStream, activeRoom, function ignoreSuccess(error, response) {
                        if (error || response.status !== 'ok') {
                            callback(error, response);
                        }
                    });
                });

                if (disposables) {
                    disposables.add(disposable);
                }
            };
        }

        return generateAllStreamTokensAndCreateStream.call(this, options.capabilities, publisherStreamId, additionalStreamIds, publisherStream, function(error, response) {
            if (error) {
                return callback(error);
            }

            if (response.status !== 'ok') {
                return callback(null, response);
            }

            var activeRoomService = findActiveRoom.call(that, room.getRoomId(), room.getObservableAlias().getValue());
            var updateSelfOptions = _.assign({}, options, {streams: mapNewPublisherStreamToMemberStreams.call(that, publisherStream, room)});

            return updateSelfStreamsAndRoleAndEnterRoomIfNecessary.call(that, updateSelfOptions.streams, updateSelfOptions.memberRole, activeRoomService, room, updateSelfOptions, handleJoinRoomCallback);
        });
    }

    function generateAllStreamTokensAndCreateStream(publisherCapabilities, streamId, additionalStreamIds, stream, callback) {
        var generateStreamTokenRequests = [];
        var numberOfCompletedRequests = 0;
        var requestCancelled = false;
        var disposeOfRequests = function() {
            _.forEach(generateStreamTokenRequests, function(disposable) {
                disposable.dispose();
            });
        };

        var completedRequestsCallback = function(error, response) {
            if (requestCancelled) {
                return;
            }

            if (error || response.status !== 'ok') {
                disposeOfRequests();

                requestCancelled = true;

                return callback(error, response);
            }

            numberOfCompletedRequests++;

            if (numberOfCompletedRequests === generateStreamTokenRequests.length) {
                callback(null, {status: 'ok'});
            }
        };

        this._logger.debug('Creating [real-time] and [broadcast] viewer wildcard stream token for published stream [%s] with [%s] additional streams', streamId, additionalStreamIds.length);

        generateStreamTokenRequests.push(generateWildcardStreamTokenAndAppendToStream.call(this, [], streamId, additionalStreamIds, stream, 'streamToken', completedRequestsCallback));
        generateStreamTokenRequests.push(generateWildcardStreamTokenAndAppendToStream.call(this, ['broadcast'], streamId, additionalStreamIds, stream, 'streamTokenForBroadcastStream', completedRequestsCallback));

        var streamingTypePublisherCapabilities = _.filter(publisherCapabilities, _.bind(_.includes, null, streamingTypeCapabilities));

        if (streamingTypePublisherCapabilities.length > 0) {
            this._logger.debug('Creating [%s] viewer wildcard stream token for published stream [%s] with [%s] additional streams', streamingTypePublisherCapabilities, streamId, additionalStreamIds.length);

            generateStreamTokenRequests.push(generateWildcardStreamTokenAndAppendToStream.call(this, streamingTypePublisherCapabilities, streamId, additionalStreamIds, stream, 'streamTokenForLiveStream', completedRequestsCallback));
        }

        if (_.includes(publisherCapabilities, 'drm')) {
            this._logger.debug('Creating [drm-open-access] and [drm-hollywood] viewer wildcard stream token for published stream [%s] with [%s] additional streams', streamId, additionalStreamIds.length);

            generateStreamTokenRequests.push(generateWildcardStreamTokenAndAppendToStream.call(this, ['streaming', 'drm-open-access'], streamId, additionalStreamIds, stream, 'streamTokenForLiveStreamWithDrmOpenAccess', completedRequestsCallback));
            generateStreamTokenRequests.push(generateWildcardStreamTokenAndAppendToStream.call(this, ['streaming', 'drm-hollywood'], streamId, additionalStreamIds, stream, 'streamTokenForLiveStreamWithDrmHollywood', completedRequestsCallback));
        }

        return disposeOfRequests;
    }

    function generateWildcardStreamTokenAndAppendToStream(capabilities, streamId, additionalStreamIds, stream, tokenName, callback) {
        var that = this;
        var adminApi = that._pcastExpress.getAdminAPI();

        if (!adminApi) {
            throw new Error('Set "options.enableWildcardCapability" to "false", or set adminApiProxyClient on initiating room express');
        }

        return that._pcastExpress.getAdminAPI().createStreamTokenForSubscribing('*', capabilities, streamId, additionalStreamIds, function(error, response) {
            if (error) {
                return callback(error);
            }

            if (response.status !== 'ok') {
                return callback(null, response);
            }

            stream = addStreamInfo(stream, tokenName, response.streamToken);

            callback(null, response);
        });
    }

    function addStreamInfo(stream, name, value) {
        var indexOfQueryParam = stream.uri.indexOf('?');
        var prefix = indexOfQueryParam > -1 ? '&' : '?';
        var indexOfHashAfterQueryParam = stream.uri.indexOf('#', indexOfQueryParam === -1 ? stream.uri.length : indexOfQueryParam);
        var uriBeforeHashIfQueryParamPresent = indexOfHashAfterQueryParam === -1 ? stream.uri : stream.uri.substring(0, indexOfHashAfterQueryParam);
        var uriHash = indexOfHashAfterQueryParam === -1 ? '' : stream.uri.substring(indexOfHashAfterQueryParam);

        stream.uri = uriBeforeHashIfQueryParamPresent + prefix + name + '=' + value + uriHash;

        return stream;
    }

    function getValidStreamIds(members) {
        return _.reduce(members, function(streamIds, member) {
            var stream = _.get(member.getObservableStreams().getValue(), '0');
            var streamId = stream ? stream.getPCastStreamId() : '';

            if (streamId) {
                streamIds.push(streamId);
            }

            return streamIds;
        }, []);
    }

    function mapNewPublisherStreamToMemberStreams(publisherStream, room) {
        var that = this;
        var activeRoomService = findActiveRoom.call(this, room.getRoomId(), room.getObservableAlias().getValue());
        var defaultStreams = publisherStream ? [publisherStream] : [];

        if (!activeRoomService) {
            return defaultStreams;
        }

        var self = activeRoomService.getSelf();

        if (!self) {
            return defaultStreams;
        }

        var selfStreams = _.map(self.getObservableStreams().getValue(), function(selfStream) {
            return selfStream.toJson();
        });
        var publishers = this._roomServicePublishers[room.getRoomId()] || [];
        var publisherIds = _.map(publishers, function(publisher) {
            return publisher.getStreamId();
        });

        if (!selfStreams || selfStreams.length === 0) {
            return defaultStreams;
        }

        if (publisherStream) {
            selfStreams = _.filter(selfStreams, function(stream) {
                var hasSameUri = stream.uri === publisherStream.uri;
                var pcastStreamId = Stream.parsePCastStreamIdFromStreamUri(stream.uri);
                var isPCastStream = !!pcastStreamId;
                var hasSamePCastStreamId = isPCastStream && pcastStreamId === Stream.parsePCastStreamIdFromStreamUri(publisherStream.uri);
                var isTheSameWithoutQueryParams = publisherStream.uri.split('?')[0] === stream.uri.split('?')[0];
                var hasSameType = stream.type === publisherStream.type;

                return (!hasSameUri && !hasSamePCastStreamId && !isTheSameWithoutQueryParams) || !hasSameType;
            });

            selfStreams.push(publisherStream);
        }

        return _.filter(selfStreams, function(stream) {
            return !Stream.parsePCastStreamIdFromStreamUri(stream.uri)
                || _.includes(publisherIds, Stream.parsePCastStreamIdFromStreamUri(stream.uri) || stream.uri)
                || _.includes(that._externalPublishers, stream.uri.split('?')[0]);
        });
    }

    function updateSelfStreamsAndRole(streams, role, roomService, callback) {
        var activeRoom = roomService ? roomService.getObservableActiveRoom().getValue() : null;

        if (streams && roomService) {
            roomService.getSelf().setStreams(streams);
        }

        if (role && roomService) {
            roomService.getSelf().getObservableRole().setValue(streams.length === 0 ? memberEnums.roles.audience.name : role);
        }

        if (activeRoom && roomService.getSelf()) {
            return updateSelfWithRetry.call(this, roomService.getSelf(), callback);
        }
    }

    function updateSelfStreamsAndRoleAndEnterRoomIfNecessary(streams, role, roomService, room, options, callback) {
        var activeRoomService = findActiveRoom.call(this, room.getRoomId(), room.getObservableAlias().getValue());
        var activeRoom = roomService ? roomService.getObservableActiveRoom().getValue() : null;
        var shouldJoinRoom = !activeRoom && !activeRoomService;
        var that = this;

        if (that._disposed) {
            return that._logger.warn('Unable to update self after express room service disposal.');
        }

        if (streams && activeRoomService) {
            that._logger.debug('Preparing member streams for update in room [%s].', room.getRoomId());

            activeRoomService.getSelf().setStreams(streams);
        }

        if (role && activeRoomService && activeRoomService.getSelf().getObservableRole().getValue() !== role) {
            that._logger.debug('Preparing member role for update in room [%s].', room.getRoomId());

            activeRoomService.getSelf().getObservableRole().setValue(role);
        }

        if (activeRoom && activeRoomService.getSelf()) {
            return updateSelfWithRetry.call(this, activeRoomService.getSelf(), callback);
        }

        if (shouldJoinRoom) {
            that._logger.info('Joining room with member [%s].', room.getRoomId());

            var joinRoomAsPresenterOptions = _.assign({
                role: role,
                alias: _.get(options, ['room', 'alias']),
                roomId: _.get(options, ['room', 'roomId'])
            }, options);

            joinRoomWithOptions.call(that, joinRoomAsPresenterOptions, function(error, response) {
                if (error) {
                    return callback(error);
                }

                if (response.status !== 'ok' && response.status !== 'already-in-room') {
                    return callback(null, response);
                }

                callback(error, response);
            });
        }
    }

    function updateSelfWithRetry(self, callback) {
        var updateSelfErrors = 0;
        var that = this;
        var maxUpdateSelfRetries = 5;

        try {
            self.commitChanges(function handleUpdateSelf(error, response) {
                if (error || !response) {
                    updateSelfErrors++;
                }

                var roomService = self.getRoomService();
                var room = roomService ? roomService.getObservableActiveRoom().getValue() : null;

                if (response && response.status === 'ok' || (!room && response.status === 'not-found')) {
                    updateSelfErrors = 0;
                    that._isHandlingTrackChange = false;

                    return !callback || callback(null, response);
                }

                if (response && response.status !== 'ok') {
                    updateSelfErrors++;
                }

                if (updateSelfErrors >= maxUpdateSelfRetries) {
                    that._logger.warn('Unable to update self after [%s] attempts.', maxUpdateSelfRetries);

                    if (_.isNumber(response.lastUpdate)) {
                        that._logger.warn('Updating self last update from [%s] to [%s] to prevent permanent failure state. Our awareness of self does not match up with the server anymore.',
                            self.getObservableLastUpdate().getValue(), response.lastUpdate);

                        self.getObservableLastUpdate().setValue(response.lastUpdate);
                    }

                    that._isHandlingTrackChange = false;

                    return callback(new Error('Unable to update self'));
                }

                if (updateSelfErrors > 0 && updateSelfErrors < maxUpdateSelfRetries) {
                    that._logger.info('Unable to update self after [%s] attempts. Retrying.', updateSelfErrors);

                    return self.commitChanges(handleUpdateSelf);
                }
            });
        } catch (error) {
            callback(error);
        }
    }

    function monitorSubsciberOrPublisher(callback, error, response) {
        if (error) {
            return callback(error);
        }

        if (response.retry) {
            return response.retry();
        }

        callback(error, response);
    }

    function getDefaultRoomDescription(type) {
        switch(type) {
        case roomEnums.types.channel.name:
            return 'Room Channel';
        case roomEnums.types.moderatedChat.name:
            return 'Moderated Chat';
        case roomEnums.types.multiPartyChat.name:
            return 'Multi Party Chat';
        case roomEnums.types.townHall.name:
            return 'Town Hall';
        case roomEnums.types.directChat.name:
            return 'Direct Chat';
        default:
            throw new Error('Unsupported Room Type');
        }
    }

    // TODO(dy) Remove backward compatibility when all publisher clients adapt to providing capabilities.
    function buildCapabilitiesFromPublisherWildcardTokens(uri) {
        var streamInfo = Stream.getInfoFromStreamUri(uri);
        var capabilities = [];

        if (streamInfo.streamTokenForLiveStream) {
            capabilities.push('streaming');
        }

        return capabilities;
    }

    function getStreamTokenForFeature(uri, feature) {
        var streamInfo = Stream.getInfoFromStreamUri(uri);

        switch(feature) {
        case 'rtmp':
        case 'hls':
        case 'dash':
            return streamInfo.streamTokenForLiveStream;
        case 'real-time':
            return streamInfo.streamToken;
        default:
            return;
        }
    }

    // TODO(dy) Remove backward compatibility when all publisher clients adapt to providing capabilities.
    function parseStreamTokenFromStreamUri(uri, capabilities) {
        var streamInfo = Stream.getInfoFromStreamUri(uri);
        var isStreaming = streamInfo.streamTokenForLiveStream && _.includes(capabilities, 'streaming');
        var isRtmp = streamInfo.streamTokenForLiveStream && _.includes(capabilities, 'rtmp');

        // Token for both not generated.
        if (_.includes(capabilities, 'drm-open-access') && _.includes(capabilities, 'drm-hollywood')) {
            return;
        }

        if (isStreaming && streamInfo.streamTokenForLiveStreamWithDrmOpenAccess && (_.includes(capabilities, 'drm-open-access') || FeatureDetector.isAndroid())) {
            return streamInfo.streamTokenForLiveStreamWithDrmOpenAccess;
        }

        if (isStreaming && streamInfo.streamTokenForLiveStreamWithDrmHollywood && _.includes(capabilities, 'drm-hollywood')) {
            return streamInfo.streamTokenForLiveStreamWithDrmHollywood;
        }

        if (isStreaming || isRtmp) {
            return streamInfo.streamTokenForLiveStream;
        }

        if (streamInfo.streamTokenForBroadcastStream && _.includes(capabilities, 'broadcast')) {
            return streamInfo.streamTokenForBroadcastStream;
        }

        if (!_.includes(capabilities, 'streaming') && !_.includes(capabilities, 'broadcast') && !_.includes(capabilities, 'rtmp')) {
            return streamInfo.streamToken;
        }
    }

    function mapStreamToMemberStream(publisher, type, streamInfo, capabilities, viewerStreamToken, viewerStreamTokenForBroadcastStream, viewerStreamTokenForLiveStream, drmStreamTokens) {
        var mediaStream = publisher.getStream();
        var audioTracks = mediaStream ? mediaStream.getAudioTracks() : null;
        var videoTracks = mediaStream ? mediaStream.getVideoTracks() : null;
        var audioTrackEnabled = audioTracks.length > 0 && audioTracks[0].enabled;
        var videoTrackEnabled = videoTracks.length > 0 && videoTracks[0].enabled;

        if (capabilities.includes('audio-only')) {
            videoTrackEnabled = false;
        }

        if (capabilities.includes('video-only')) {
            audioTrackEnabled = false;
        }

        var publishedStream = {
            uri: Stream.getPCastPrefix() + publisher.getStreamId(),
            type: type,
            audioState: audioTrackEnabled ? trackEnums.states.trackEnabled.name : trackEnums.states.trackDisabled.name,
            videoState: videoTrackEnabled ? trackEnums.states.trackEnabled.name : trackEnums.states.trackDisabled.name
        };

        var infoToAppend = _.assign({}, streamInfo, {
            streamToken: viewerStreamToken,
            streamTokenForBroadcastStream: viewerStreamTokenForBroadcastStream,
            streamTokenForLiveStream: viewerStreamTokenForLiveStream
        });

        if (!viewerStreamToken) {
            delete infoToAppend.streamToken;
        }

        if (!viewerStreamTokenForBroadcastStream) {
            delete infoToAppend.streamTokenForBroadcastStream;
        }

        if (!viewerStreamTokenForLiveStream) {
            delete infoToAppend.streamTokenForLiveStream;
        }

        if (drmStreamTokens) {
            assert.isArray(drmStreamTokens, 'drmStreamTokens');

            infoToAppend.streamTokenForLiveStreamWithDrmOpenAccess = drmStreamTokens[0];
            infoToAppend.streamTokenForLiveStreamWithDrmHollywood = drmStreamTokens[1];
        }

        var queryParamString = _.reduce(infoToAppend, function(queryParamString, currentValue, currentKey) {
            var currentPrefix = queryParamString ? '&' : '?';

            return queryParamString + currentPrefix + currentKey + '=' + currentValue;
        }, '');

        if (queryParamString.length > 0) {
            publishedStream.uri = publishedStream.uri + queryParamString;
        }

        publishedStream = addStreamInfo(publishedStream, 'capabilities', capabilities.join(','));

        return publishedStream;
    }

    function listenForTrackStateChange(publisher, room, callbackWithPublisher) {
        var that = this;
        var stream = publisher.getStream();

        if (!stream) {
            return;
        }

        var tracks = stream.getTracks();

        _.forEach(tracks, function(track) {
            var handleStateChange = function handleStateChange() {
                that._isHandlingTrackChange = true;

                var state = track.enabled ? trackEnums.states.trackEnabled.name : trackEnums.states.trackDisabled.name;
                var activeRoomService = findActiveRoom.call(that, room.getRoomId());

                if (!activeRoomService || !activeRoomService.getSelf()) {
                    return;
                }

                var selfStreams = activeRoomService.getSelf().getObservableStreams().getValue();
                var memberStream = _.find(selfStreams, function(selfStream) {
                    return selfStream.getPCastStreamId() === publisher.getStreamId();
                });
                var self = getSelfAssociatedWithStream.call(that, memberStream);

                if (!memberStream) {
                    return that._logger.warn('[%s] [%s] Unable to update member state change after track state change [%s]. Member stream no longer exists on member model.', stream.id, track.id, track.enabled);
                }

                that._logger.info('[%s] [%s] Track state changed to [%s], updating room member stream state [%s]', stream.id, track.id, track.enabled, state);

                if (track.kind === 'video') {
                    memberStream.getObservableVideoState().setValue(state);
                } else {
                    memberStream.getObservableAudioState().setValue(state);
                }

                if (self) {
                    updateSelfWithRetry.call(that, self, callbackWithPublisher);
                }
            };

            var handleStateChangeIfPossible = function handleStateChangeIfPossible() {
                if (that._handleStateChangeTimeOut) {
                    clearTimeout(that._handleStateChangeTimeOut);
                    that._handleStateChangeTimeOut = null;
                }

                if (!that._isHandlingTrackChange) {
                    handleStateChange();

                    return;
                }

                that._handleStateChangeTimeOut = setTimeout(function() {
                    handleStateChangeIfPossible();
                });
            };

            track.updateState = function(enabled) {
                this.enabled = enabled;
                handleStateChangeIfPossible();
            };
        });
    }

    function getSelfAssociatedWithStream(memberStream) {
        var roomService = _.find(this._activeRoomServices, function(roomService) {
            var self = roomService.getSelf();
            var selfStreams = self ? self.getObservableStreams().getValue() : [];

            return _.find(selfStreams, function(selfStream) {
                return memberStream === selfStream;
            });
        });

        return roomService ? roomService.getSelf() : null;
    }

    return RoomExpress;
});