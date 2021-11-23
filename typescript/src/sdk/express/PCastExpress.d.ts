export interface options_PCastExpress{
    authToken: string; 
    adminApiProxyClient: 
    { createAuthenticationToken: any; }; 
    onError: ()=>void; 
    onlineTimeout: number; 
    reconnectOptions: { 
        maxOfflineTime: number; 
        maxReconnectFrequency: number; 
    };
     backendUri: string; 
     authenticationData: object; 
}
export interface options_getUserMedia{
    resolutionSelectionStrategy:any; 
    mediaConstraints: object; 
    resolution: number; 
    frameRate: number; 
    aspectRatio: string; 
    onResolveMedia: ()=>void; 
    onScreenShare: ()=>void; 
}
export interface options_publish{
    streamId:string,
    capabilities: any[]; 
    connectOptions: string[]; 
    mediaConstraints: object; 
    userMediaStream: object; 
    videoElement: object; 
    monitor: { callback: any; options: any; }; 
    publishToken: string; 
    streamToken: string; 
    isContinuation: any; 
}
export interface options_publishRemote{
    streamUri: string; 
    capabilities: any[]; 
    connectOptions: string[]; 
    mediaConstraints: object; 
    videoElement: object; 
    prerollSkipDuration: number; 
    monitor: { callback: any; options: object; };
    frameRate: { exact: number; max: number; };
    publishToken: string; 
    streamToken: string; 
}
export interface options_publishStreamToExternal{
    streamId: string; 
    externalUri: string; 
    capabilities: any[]; 
    connectOptions: string[]; 
    mediaConstraints: object; 
    videoElement: object; 
    monitor: { callback: any; options: object; }; 
    streamToken: string; 
}
export interface options_subscribe{
    streamId: string; 
    videoElement: object; 
    monitor: { callback: any; options: object; }; 
    streamToken: string; 
    capabilities: object; 
    subscriberOptions: object; 
    isContinuation: any; 
}
export interface pcast_subscribeToStatusChange{
    getObservableStatus: () => { (): any; new(): any; subscribe: { (arg0: (status: string) => void, arg1: { initial: string; }): { dispose: () => void; } | null; new(): any; }; }; 
}
export interface options_resolveUserMedia{
    aspectRatio: string; 
    resolution: number; 
    frameRate: number; 
    resolutionSelectionStrategy: any; 
    onScreenShare: (arg0: any) => any; 
    mediaConstraints: any; 
    onResolveMedia: (arg0: any) => void; 
}
export interface screenOptions_resolveUserMedia{
    resolution: number;
    frameRate: number; 
    aspectRatio: string; 
}
export interface options_getStreamingTokenAndPublish{
    publishToken: string; 
    capabilities?: any[]; 
    streamToken: string; 
    streamId?: string; 
    isContinuation: any; 
    tags?: string[]; 
    connectOptions?: any[]; 
    authFailure?: any; 
    monitor?: { callback: any; options: object; }; 
    videoElement?: object; 
}
export interface options_publishUserMediaOrUri{
     tags?: string[]; 
     connectOptions?: any[]; 
     streamToken?: string; 
     publishToken?: string; 
     authFailure?: any; 
     monitor?: { callback?: any; options?: object; }; 
     videoElement?: any; 
     isContinuation?: any; 
}
export interface options_subscribeToStream{
    streamId?: string; 
    skipRetryOnUnauthorized?: any; 
    streamToken?: string; 
    authFailure?: any; 
    videoElement?: object; 
    monitor?: { callback?: any; options?: any; }; 
    subscriberOptions?: object; 
    isContinuation?: any; 
}
export interface options_createExpressPublisher{
    stop?: object; 
    getStreamId: any; 
    getStream: any; 
    enableAudio?: any; 
    disableAudio?: any; 
    enableVideo?: any; 
    disableVideo?: any; 
    setPublisherEndedCallback?: any; 
}
export interface subscriber_createExpressSubscriber{
    stop: (reason: any) => void; 
    enableAudio: () => boolean | undefined; 
    getStream: () => { getStreamId: (() => any) | (() => any); getStream: (() => any) | (() => any); }; 
    disableAudio: () => boolean | undefined;
    enableVideo: () => boolean | undefined; 
    disableVideo: () => boolean | undefined; 
    setStreamEndedCallback: () => void;
}
export interface publisher_setStreamAudioTracksState{
    getStreamId: () => any; 
    getStream: () => any; 
}
export interface publisher_setStreamVideoTracksState{
    getStreamId: () => any; 
    getStream: () => any; 
}

