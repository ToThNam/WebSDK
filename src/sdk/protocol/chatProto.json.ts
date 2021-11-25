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
//@ts-ignore
define([
], function() {
    'use strict';

    var chatProto = {
        "package": "chat",
        "options": {"optimize_for": "LITE_RUNTIME"},
        "messages": [
            {
                "name": "Room",
                "fields": [
                    {
                        "rule": "optional",
                        "type": "string",
                        "name": "roomId",
                        "id": 1
                    },
                    {
                        "rule": "optional",
                        "type": "string",
                        "name": "alias",
                        "id": 2
                    },
                    {
                        "rule": "required",
                        "type": "string",
                        "name": "name",
                        "id": 3
                    },
                    {
                        "rule": "required",
                        "type": "string",
                        "name": "description",
                        "id": 4
                    },
                    {
                        "rule": "required",
                        "type": "RoomType",
                        "name": "type",
                        "id": 5
                    },
                    {
                        "rule": "repeated",
                        "type": "string",
                        "name": "options",
                        "id": 6
                    },
                    {
                        "rule": "optional",
                        "type": "string",
                        "name": "bridgeId",
                        "id": 7
                    },
                    {
                        "rule": "optional",
                        "type": "string",
                        "name": "pin",
                        "id": 8
                    }
                ]
            },
            {
                "name": "Stream",
                "fields": [
                    {
                        "rule": "required",
                        "type": "StreamType",
                        "name": "type",
                        "id": 1
                    },
                    {
                        "rule": "required",
                        "type": "string",
                        "name": "uri",
                        "id": 2
                    },
                    {
                        "rule": "required",
                        "type": "TrackState",
                        "name": "audioState",
                        "id": 3
                    },
                    {
                        "rule": "required",
                        "type": "TrackState",
                        "name": "videoState",
                        "id": 4
                    }
                ]
            },
            {
                "name": "Member",
                "fields": [
                    {
                        "rule": "required",
                        "type": "string",
                        "name": "sessionId",
                        "id": 1
                    },
                    {
                        "rule": "required",
                        "type": "string",
                        "name": "screenName",
                        "id": 2
                    },
                    {
                        "rule": "required",
                        "type": "MemberRole",
                        "name": "role",
                        "id": 3
                    },
                    {
                        "rule": "repeated",
                        "type": "Stream",
                        "name": "streams",
                        "id": 4
                    },
                    {
                        "rule": "required",
                        "type": "MemberState",
                        "name": "state",
                        "id": 5
                    },
                    {
                        "rule": "required",
                        "type": "uint64",
                        "name": "lastUpdate",
                        "id": 6
                    }
                ]
            },
            {
                "name": "MemberUpdate",
                "fields": [
                    {
                        "rule": "required",
                        "type": "string",
                        "name": "sessionId",
                        "id": 1
                    },
                    {
                        "rule": "optional",
                        "type": "string",
                        "name": "screenName",
                        "id": 2
                    },
                    {
                        "rule": "optional",
                        "type": "MemberRole",
                        "name": "role",
                        "id": 3
                    },
                    {
                        "rule": "required",
                        "type": "bool",
                        "name": "updateStreams",
                        "id": 7,
                        "options": {"default": false}
                    },
                    {
                        "rule": "repeated",
                        "type": "Stream",
                        "name": "streams",
                        "id": 4
                    },
                    {
                        "rule": "optional",
                        "type": "MemberState",
                        "name": "state",
                        "id": 5
                    },
                    {
                        "rule": "required",
                        "type": "uint64",
                        "name": "lastUpdate",
                        "id": 6
                    }
                ]
            },
            {
                "name": "ChatUser",
                "fields": [
                    {
                        "rule": "optional",
                        "type": "string",
                        "name": "sessionId",
                        "id": 1
                    },
                    {
                        "rule": "required",
                        "type": "string",
                        "name": "screenName",
                        "id": 2
                    },
                    {
                        "rule": "required",
                        "type": "MemberRole",
                        "name": "role",
                        "id": 3
                    },
                    {
                        "rule": "required",
                        "type": "uint64",
                        "name": "lastUpdate",
                        "id": 4
                    }
                ]
            },
            {
                "name": "ChatMessage",
                "fields": [
                    {
                        "rule": "required",
                        "type": "string",
                        "name": "messageId",
                        "id": 1
                    },
                    {
                        "rule": "required",
                        "type": "uint64",
                        "name": "timestamp",
                        "id": 2
                    },
                    {
                        "rule": "required",
                        "type": "ChatUser",
                        "name": "from",
                        "id": 3
                    },
                    {
                        "rule": "required",
                        "type": "string",
                        "name": "message",
                        "id": 4
                    }
                ]
            },
            {
                "name": "CreateRoom",
                "fields": [
                    {
                        "rule": "required",
                        "type": "string",
                        "name": "sessionId",
                        "id": 1
                    },
                    {
                        "rule": "required",
                        "type": "Room",
                        "name": "room",
                        "id": 2
                    }
                ]
            },
            {
                "name": "CreateRoomResponse",
                "fields": [
                    {
                        "rule": "required",
                        "type": "string",
                        "name": "status",
                        "id": 1
                    },
                    {
                        "rule": "optional",
                        "type": "Room",
                        "name": "room",
                        "id": 2
                    }
                ]
            },
            {
                "name": "JoinRoom",
                "fields": [
                    {
                        "rule": "optional",
                        "type": "string",
                        "name": "roomId",
                        "id": 1
                    },
                    {
                        "rule": "optional",
                        "type": "string",
                        "name": "alias",
                        "id": 2
                    },
                    {
                        "rule": "required",
                        "type": "string",
                        "name": "sessionId",
                        "id": 3
                    },
                    {
                        "rule": "required",
                        "type": "Member",
                        "name": "member",
                        "id": 4
                    },
                    {
                        "rule": "repeated",
                        "type": "string",
                        "name": "options",
                        "id": 5
                    },
                    {
                        "rule": "required",
                        "type": "uint64",
                        "name": "timestamp",
                        "id": 6
                    }
                ]
            },
            {
                "name": "JoinRoomResponse",
                "fields": [
                    {
                        "rule": "required",
                        "type": "string",
                        "name": "status",
                        "id": 1
                    },
                    {
                        "rule": "optional",
                        "type": "Room",
                        "name": "room",
                        "id": 2
                    },
                    {
                        "rule": "repeated",
                        "type": "Member",
                        "name": "members",
                        "id": 3
                    },
                    {
                        "rule": "optional",
                        "type": "Member",
                        "name": "self",
                        "id": 5
                    },
                    {
                        "rule": "repeated",
                        "type": "string",
                        "name": "options",
                        "id": 4
                    }
                ]
            },
            {
                "name": "UpdateRoom",
                "fields": [
                    {
                        "rule": "required",
                        "type": "string",
                        "name": "sessionId",
                        "id": 1
                    },
                    {
                        "rule": "required",
                        "type": "Room",
                        "name": "room",
                        "id": 2
                    },
                    {
                        "rule": "required",
                        "type": "uint64",
                        "name": "timestamp",
                        "id": 3
                    }
                ]
            },
            {
                "name": "UpdateRoomResponse",
                "fields": [
                    {
                        "rule": "required",
                        "type": "string",
                        "name": "status",
                        "id": 1
                    }
                ]
            },
            {
                "name": "UpdateMember",
                "fields": [
                    {
                        "rule": "required",
                        "type": "string",
                        "name": "sessionId",
                        "id": 1
                    },
                    {
                        "rule": "optional",
                        "type": "string",
                        "name": "roomId",
                        "id": 5
                    },
                    {
                        "rule": "required",
                        "type": "MemberUpdate",
                        "name": "member",
                        "id": 2
                    },
                    {
                        "rule": "repeated",
                        "type": "string",
                        "name": "options",
                        "id": 3
                    },
                    {
                        "rule": "required",
                        "type": "uint64",
                        "name": "timestamp",
                        "id": 4
                    }
                ]
            },
            {
                "name": "UpdateMemberResponse",
                "fields": [
                    {
                        "rule": "required",
                        "type": "string",
                        "name": "status",
                        "id": 1
                    },
                    {
                        "rule": "optional",
                        "type": "uint64",
                        "name": "lastUpdate",
                        "id": 2
                    }
                ]
            },
            {
                "name": "LeaveRoom",
                "fields": [
                    {
                        "rule": "required",
                        "type": "string",
                        "name": "roomId",
                        "id": 1
                    },
                    {
                        "rule": "required",
                        "type": "string",
                        "name": "sessionId",
                        "id": 2
                    },
                    {
                        "rule": "required",
                        "type": "uint64",
                        "name": "timestamp",
                        "id": 3
                    }
                ]
            },
            {
                "name": "LeaveRoomResponse",
                "fields": [
                    {
                        "rule": "required",
                        "type": "string",
                        "name": "status",
                        "id": 1
                    }
                ]
            },
            {
                "name": "DestroyRoom",
                "fields": [
                    {
                        "rule": "required",
                        "type": "string",
                        "name": "roomId",
                        "id": 1
                    }
                ]
            },
            {
                "name": "DestroyRoomResponse",
                "fields": [
                    {
                        "rule": "required",
                        "type": "string",
                        "name": "status",
                        "id": 1
                    }
                ]
            },
            {
                "name": "GetRoomInfo",
                "fields": [
                    {
                        "rule": "optional",
                        "type": "string",
                        "name": "roomId",
                        "id": 1
                    },
                    {
                        "rule": "optional",
                        "type": "string",
                        "name": "alias",
                        "id": 2
                    },
                    {
                        "rule": "optional",
                        "type": "string",
                        "name": "sessionId",
                        "id": 3
                    },
                    {
                        "rule": "optional",
                        "type": "string",
                        "name": "applicationId",
                        "id": 4
                    },
                    {
                        "rule": "optional",
                        "type": "string",
                        "name": "secret",
                        "id": 5
                    },
                    {
                        "rule": "repeated",
                        "type": "string",
                        "name": "options",
                        "id": 6
                    }
                ]
            },
            {
                "name": "GetRoomInfoResponse",
                "fields": [
                    {
                        "rule": "required",
                        "type": "string",
                        "name": "status",
                        "id": 1
                    },
                    {
                        "rule": "optional",
                        "type": "Room",
                        "name": "room",
                        "id": 2
                    },
                    {
                        "rule": "repeated",
                        "type": "Member",
                        "name": "members",
                        "id": 3
                    },
                    {
                        "rule": "repeated",
                        "type": "string",
                        "name": "options",
                        "id": 4
                    }
                ]
            },
            {
                "name": "RoomEvent",
                "fields": [
                    {
                        "rule": "required",
                        "type": "string",
                        "name": "sessionId",
                        "id": 1
                    },
                    {
                        "rule": "required",
                        "type": "string",
                        "name": "roomId",
                        "id": 2
                    },
                    {
                        "rule": "required",
                        "type": "RoomEventType",
                        "name": "eventType",
                        "id": 3
                    },
                    {
                        "rule": "repeated",
                        "type": "Member",
                        "name": "members",
                        "id": 4
                    },
                    {
                        "rule": "optional",
                        "type": "Room",
                        "name": "room",
                        "id": 5
                    },
                    {
                        "rule": "repeated",
                        "type": "string",
                        "name": "options",
                        "id": 6
                    },
                    {
                        "rule": "required",
                        "type": "uint64",
                        "name": "timestamp",
                        "id": 7
                    }
                ]
            },
            {
                "name": "SendMessageToRoom",
                "fields": [
                    {
                        "rule": "required",
                        "type": "string",
                        "name": "roomId",
                        "id": 1
                    },
                    {
                        "rule": "required",
                        "type": "ChatMessage",
                        "name": "chatMessage",
                        "id": 2
                    }
                ]
            },
            {
                "name": "SendMessageToRoomResponse",
                "fields": [
                    {
                        "rule": "required",
                        "type": "string",
                        "name": "status",
                        "id": 1
                    }
                ]
            },
            {
                "name": "FetchRoomConversation",
                "fields": [
                    {
                        "rule": "required",
                        "type": "string",
                        "name": "sessionId",
                        "id": 1
                    },
                    {
                        "rule": "required",
                        "type": "string",
                        "name": "roomId",
                        "id": 2
                    },
                    {
                        "rule": "optional",
                        "type": "string",
                        "name": "afterMessageId",
                        "id": 3
                    },
                    {
                        "rule": "optional",
                        "type": "string",
                        "name": "beforeMessageId",
                        "id": 4
                    },
                    {
                        "rule": "required",
                        "type": "uint32",
                        "name": "limit",
                        "id": 5
                    },
                    {
                        "rule": "repeated",
                        "type": "RoomConversationOption",
                        "name": "options",
                        "id": 6
                    }
                ]
            },
            {
                "name": "FetchRoomConversationResponse",
                "fields": [
                    {
                        "rule": "required",
                        "type": "string",
                        "name": "status",
                        "id": 1
                    },
                    {
                        "rule": "repeated",
                        "type": "ChatMessage",
                        "name": "chatMessages",
                        "id": 2
                    }
                ]
            },
            {
                "name": "RoomConversationEvent",
                "fields": [
                    {
                        "rule": "required",
                        "type": "string",
                        "name": "sessionId",
                        "id": 1
                    },
                    {
                        "rule": "required",
                        "type": "string",
                        "name": "roomId",
                        "id": 2
                    },
                    {
                        "rule": "required",
                        "type": "RoomConversationEventType",
                        "name": "eventType",
                        "id": 3
                    },
                    {
                        "rule": "repeated",
                        "type": "ChatMessage",
                        "name": "chatMessages",
                        "id": 4
                    }
                ]
            },
            {
                "name": "RoomBridgeIdle",
                "fields": [
                    {
                        "rule": "required",
                        "type": "string",
                        "name": "roomId",
                        "id": 1
                    },
                    {
                        "rule": "required",
                        "type": "string",
                        "name": "bridgeId",
                        "id": 2
                    }
                ]
            }
        ],
        "enums": [
            {
                "name": "RoomType",
                "values": [
                    {
                        "name": "DirectChat",
                        "id": 0
                    },
                    {
                        "name": "MultiPartyChat",
                        "id": 1
                    },
                    {
                        "name": "ModeratedChat",
                        "id": 2
                    },
                    {
                        "name": "TownHall",
                        "id": 3
                    },
                    {
                        "name": "Channel",
                        "id": 4
                    }
                ]
            },
            {
                "name": "MemberRole",
                "values": [
                    {
                        "name": "Participant",
                        "id": 0
                    },
                    {
                        "name": "Moderator",
                        "id": 1
                    },
                    {
                        "name": "Presenter",
                        "id": 2
                    },
                    {
                        "name": "Audience",
                        "id": 3
                    }
                ]
            },
            {
                "name": "MemberState",
                "values": [
                    {
                        "name": "Active",
                        "id": 0
                    },
                    {
                        "name": "Passive",
                        "id": 1
                    },
                    {
                        "name": "HandRaised",
                        "id": 2
                    },
                    {
                        "name": "Inactive",
                        "id": 3
                    },
                    {
                        "name": "Offline",
                        "id": 4
                    }
                ]
            },
            {
                "name": "RoomEventType",
                "values": [
                    {
                        "name": "MemberJoined",
                        "id": 0
                    },
                    {
                        "name": "MemberLeft",
                        "id": 1
                    },
                    {
                        "name": "MemberUpdated",
                        "id": 2
                    },
                    {
                        "name": "RoomUpdated",
                        "id": 3
                    },
                    {
                        "name": "RoomEnded",
                        "id": 4
                    }
                ]
            },
            {
                "name": "TrackState",
                "values": [
                    {
                        "name": "TrackEnabled",
                        "id": 0
                    },
                    {
                        "name": "TrackDisabled",
                        "id": 1
                    },
                    {
                        "name": "TrackEnded",
                        "id": 2
                    }
                ]
            },
            {
                "name": "StreamType",
                "values": [
                    {
                        "name": "User",
                        "id": 0
                    },
                    {
                        "name": "Presentation",
                        "id": 1
                    },
                    {
                        "name": "Audio",
                        "id": 2
                    }
                ]
            },
            {
                "name": "RoomConversationOption",
                "values": [
                    {
                        "name": "Subscribe",
                        "id": 0
                    }
                ]
            },
            {
                "name": "RoomConversationEventType",
                "values": [
                    {
                        "name": "Message",
                        "id": 0
                    }
                ]
            }
        ]
    };

    return chatProto;
});