export interface options_createRoom{
    room: 
        { 
            name: string; 
            type: string; 
            description: string; 
        }; 
}
export interface options_joinRoom{
    role: string; 
    screenName: string; 
    roomId: string; 
    alias: string; 
    streams: any[]; 
    streamsWildcardTokenCapabilities: any; 
    viewerStreamSelectionStrategy: string; 
    streamToken: string; 
    capabilities: any[];  
}
export interface options_publishToRoom{
    room: { 
        roomId: string|null; 
        alias: string|null; }; 
        streamUri: string; 
        mediaConstraints:object; 
        userMediaStream: object; 
        videoElement: object;
        screenName: string; 
        tags: string; 
        streamInfo: string; 
        streamToken: string; 
        publishToken: string; 
        capabilities: any[]; 
        viewerStreamSelectionStrategy: string; 
        enableWildcardCapability: boolean; 
        streamType: string; 
        memberRole: string; 
}
export interface room_joinAndPublish{
     getObservableType: () => { (): any; 
        new(): any; 
        getValue: { (): any; new(): any; }; };
     getRoomId: () => string; 
     getObservableAlias: () => { (): any;
         new(): any; 
         getValue: { (): string; new(): any; }; }; 
}
export interface createRoomResponse_createRoom{
    status?: string; 
    room?: any; 
}
export interface memberStream_subscribeToMemberStream{
    getUri: () => any; 
    getPCastStreamId: () => any; 
    getInfo: () => any; 
    getObservableAudioState: () => { 
        (): any;
         new(): any; 
         subscribe: { 
             (arg0: (state: any) => void, 
             arg1: { initial: string; }): any;
              new(): any; }; }; 
              getObservableVideoState: () => { 
                  (): any;
                   new(): any; 
                   subscribe: { 
                       (arg0: (state: any) => void, 
                       arg1: { initial: string; }): any; 
                       new(): any; }; 
                    }; 
}
export interface options_subscribeToMemberStream{
    capabilities: any[]; 
    streamToken: string; 
}
export interface roomService_findActiveRoom{
    getObservableActiveRoom: () => { 
        (): any; 
        new(): any; 
        getValue: { 
            (): any; 
            new(): any; 
        }; 
    }; 
}
export interface roomService_createExpressRoomService { 
    stop: { 
        (arg0: string): void; 
        (): void; 
    }; 
    leaveRoom: (callback: any, isForceLeaveRoom: any) => void; 
    getObservableActiveRoom: () => { 
        (): any; 
        new(): any; 
        getValue: { 
            (): any; 
            new(): any; 
        }; 
    }; 
}
export interface options_joinRoomWithOptions { 
    role: string; 
    screenName: string; 
    roomId: string; 
    alias: string; 
    streams: any[]; 
    streamsWildcardTokenCapabilities: any; 
    viewerStreamSelectionStrategy: string; 
    streamToken: string; 
    capabilities: any[];  
}
export interface newRoom_subscribe { 
    getObservableMembers: () => { 
        (): any; 
        new(): any; 
        subscribe: { 
            (arg0: (arg0: never[]) => void, 
            arg1: { initial: string; }): 
            { dispose: () => void; } | null;
             new(): any; }; 
    }; 
}
export interface response_handleSubscribe { 
    status: string; 
    retry: () => void; 
}
export interface options_publishAndUpdateSelf { 
    memberRole: string; 
    enableWildcardCapability: boolean;
    streamType: string; 
    streamInfo: string; 
    streamToken: string; 
    capabilities: any[]; 
    viewerStreamSelectionStrategy: string; 
    screenName: string;  
}
export interface room_publishAndUpdateSelf { 
    getRoomId: () => string; 
    getObservableAlias: () => { 
        (): any; 
        new(): any; 
        getValue: { 
            (): string; 
            new(): any; 
        }; 
    }; 
}
export interface response_publishAndUpdateSelf { 
    status: string;
    arg:any; 
    publisher: { 
        getStreamId: () => any; 
        stop: () => void;
        getStream: () => any; 
    }; 
}
export interface options_createOptionalViewer { 
    streamType: string; 
    streamInfo: string; 
    streamToken: string; 
    capabilities: any[]; 
    enableWildcardCapability: boolean; 
    viewerStreamSelectionStrategy: string; 
    screenName: string; 
    memberRole: string
}
export interface room_createOptionalViewer { 
    getRoomId: () => string; 
    getObservableAlias: () => { 
        (): any; 
        new(): any; 
        getValue: { 
            (): string; 
            new(): any; 
        }; 
    }; 
}
export interface callback_createOptionalViewer { 
    (arg0: Error, arg1: { status: string; }): any; (arg0: any, arg1: { status: string; roomService: any; }): void; (arg0?: any, arg1?: any): void; (arg0?: any, arg1?: { status: string; }): void;
}
export interface options_createViewerStreamTokensAndUpdateSelf { 
    viewerStreamSelectionStrategy: string; 
    streamToken: string; 
    capabilities: any[]; 
    screenName: string;
}
export interface publisherStream_createViewerStreamTokensAndUpdateSelf { 
    uri: string; 
    type: string ; 
    audioState: string; 
    videoState: string; 
}
export interface room_createViewerStreamTokensAndUpdateSelf { 
    getObservableType?: any; 
    getObservableMembers?: any; 
    getRoomId: any; 
    getObservableAlias: any; 
}
export interface stream_generateAllStreamTokens { 
    uri: string; 
    type: string , 
    audioState: string; 
    videoState: string; 
}
export interface stream_addStreamInfo { 
    uri: string; 
    type: string , 
    audioState: string; 
    videoState: string; 
}
export interface member_getValidStreamIds { 
    getObservableStreams: () => { 
        (): any; 
        new(): any; 
        getValue: { 
            (): any; 
            new(): any; 
        }; 
    }; 
}
export interface room_getValidStreamIds { 
    getRoomId: () => string; 
    getObservableAlias: () => { 
        (): any; 
        new(): any; 
        getValue: { 
            (): string; 
            new(): any; 
        }; 
    }; 
}
export interface roomService_updateSelfStreamsAndRole { 
    getObservableActiveRoom: () => { 
        (): any; 
        new(): any; 
        getValue: { 
            (): any; 
            new(): any; 
        }; 
    }; 
    getSelf: () => { 
        (): any; 
        new(): any; 
        setStreams: any; 
        getObservableRole: any; 
    commitChanges: (arg0: { (error: any, response: any): any;
        (error: any, response: any): any; }) => void; 
    getRoomService: () => any; 
    getObservableLastUpdate: () => { 
        (): any; 
        new(): any; 
        getValue: { 
            (): any; 
            new(): any; 
        }; 
        setValue: 
        { (arg0: any): void; 
            new(): any; 
        }; 
    }; 
} 
}
export interface roomService_updateSelfStreamsAndRoleAndEnterRoom { 
    getObservableActiveRoom: () => { 
        (): any; 
        new(): any; 
        getValue: { 
            (): any; 
            new(): any; 
        }; 
    }; 
}
export interface room_updateSelfStreamsAndRoleAndEnterRoom { 
    getRoomId: () => string; 
    getObservableAlias: () => { 
        (): any; 
        new(): any; 
        getValue: { 
            (): string; 
            new(): any; 
        }; 
    };
 }
 export interface callback_updateSelfStreamsAndRoleAndEnterRoom { 
    (arg0: null, arg1: { status?: string ; roomService: any; } ): void; 
        (arg0?: any, arg1?: any): void; 
}
export interface self_updateSelfWithRetry { 
    commitChanges: (arg0: { (error: any, response: any): any; (error: any, response: any): any; }) => void; getRoomService: () => any; getObservableLastUpdate: () => { (): any; new(): any; getValue: { (): any; new(): any; }; setValue: { (arg0: any): void; new(): any; }; }; 
}
export interface publisher_mapStreamToMemberStream { 
    getStream: () => any; 
    getStreamId: () => any; 
}
export interface publisher_listenForTrackStateChange { 
    getStream: () => any; 
    getStreamId: () => any; 
}
export interface room_listenForTrackStateChange { 
    getRoomId: () => string; getObservableAlias: () => { (): any; new(): any; getValue: { (): string; new(): any; }; }; 
}
export interface track_listenForTrackStateChange { 
    enabled: any; 
    id: string; 
    kind: string; 
    updateState: (enabled: any) => void; 
}
 
