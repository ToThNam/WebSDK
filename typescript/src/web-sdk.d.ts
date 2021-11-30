export interface AdminApiProxyClientType {
  dispose: () => any;
  toString:() => string;
  getBackendUri: () => string;
  setBackendUri: (uri: string) => void;
  getEndpointPaths: () => any;
  setEndpointPaths:(endpointPaths: any) => void;
  getAuthenticationData: () => any;
  setAuthenticationData: (obj: any) => void;
  getAuthenticationDataLocationInPayload: () => string;
  setAuthenticationDataLocationInPayload: (location: any) => string;
  getRequestHandler:() => any;
  setRequestHandler: (callback: any) => void;
  createAuthenticationToken:(callback:(arg: null, arg1: {status: string}) => any) => any;
  createStreamTokenForPublishing: (sessionId: string, capabilities: any, callback:(arg: null, arg1: {status: string}) => any) => any;
  createStreamTokenForPublishingToExternal: (sessionId: string, capabilities: any[], streamId: string, callback: any) => void;
  createStreamTokenForSubscribing: (sessionId: string, capabilities: any[], streamId: string, alternateStreamIds: any, callback:(arg: null, arg1: {status: string}) => any) => any
};

interface ChannelExpressOptions {
  adminApiProxyClient?: AdminApiProxyClientType;
  /**
   * real-time:	Use Web RTC for delivery
   * rtmp:    	Use rtmp (flash player required) for delivery
   * dash:    	Use dash for delivery (requires MSE support)
   * hls:     	Use hls for delivery (requires MSE or Native HLS)
   * */
  features?: string[];
  onError?: (e: any) => void;
  authToken?: string;
  // [object PCastExpress]
  pcastExpress?: any;
  treatBackgroundAsOffline?: boolean;
  reAuthenticateOnForeground?: boolean;
  shakaLoader?: (info: any) => {};
  webPlayerLoader?: (info: any) => {};
};

export interface RoomExpressType {
  dispose: () => any;
  getPCastExpress:() => any;
  createRoom: (options:{room:
    { name: string;
        type: string;
        description: string;
    };}, callback: (arg0?: null, arg1?: any) => any) => any;
  joinRoom: (options:
    {role: string;
    screenName: string;
    roomId: string;
    alias: string;
    streams: any[];
    streamsWildcardTokenCapabilities: any;
    viewerStreamSelectionStrategy: string;
    streamToken: string;
    capabilities: any[];
  }, joinRoomCallback : (arg0: any, arg1: any) => void, membersChangedCallback: (arg0?: any[] ) => void) => void;
  publishToRoom: (
    options:{
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
      memberRole: string;} , 
      callback: (arg0: null, arg1?: any) => void) => void;
  publishScreenToRoom: (options: any, callback: any) => void;
  subscribeToMemberStream: (
    memberStream: {
      getUri: () => string; 
      getPCastStreamId: () => string; 
      getInfo: () => any; 
      getObservableAudioState: () => any
      getObservableVideoState: () => any 
    }, 
    options: {
      capabilities: any[]; 
      streamToken: string; 
    }, 
    callback : (arg0: Error | null, arg1: { status: string; }) => void, 
    defaultFeatureIndex: number) => any
};

export interface PCastType{
  getBaseUri:() => string;
  getStatus:() => string;
  getObservableStatus:() => string;
  getRemoteDescriptionSdp:(streamId: string) => string;
  isStarted:() => any;
  reAuthenticate: (authToken: string) => void;
  start: (authToken: string, authenticationCallback: any, onlineCallback: any, offlineCallback: any) => any;
  stop: (reason: string) => any;
  getUserMedia: (options: any, callback: any, onScreenShare: boolean) => string;
  publish : (streamToken: string, streamToPublish: any, callback: {
    call: 
    (arg0: any, 
      arg1: any, 
      arg2: string, 
      arg3?: any) => void;}, 
    tags: string | string[], 
    options: {
      streamingSourceMapping?: any; 
      disableMultiplePCastInstanceWarning?: boolean; 
      disableGlobalErrorListener?: boolean;
       disableBeforeUnload?: boolean; 
       disableConsoleLogging?: boolean; 
       loggingLevel?: any; 
       treatBackgroundAsOffline?: boolean; 
       reAuthenticateOnForeground?: boolean; 
       shakaLoader?: any; 
       webPlayerLoader?: any; 
       uri?: string; 
       deviceId?: string; 
       logger?: any; 
       metricsTransmitter?: any; 
       rtmp?: any; 
       features?: any; 
       connectUri?: string;
    }) => any;
    subscribe: (streamToken: string, 
      callback: {
        call: (
          arg0: any, 
          arg1: any, 
          arg2: string, 
          arg3?: null ) => void;}, 
      options: {
        negotiate?: any; 
        disableAudioIfNoOutputFound?: boolean; 
        receiveAudio?: boolean; 
        originStreamId?: string; 
      }) => any;
      getProtocol: () => string;
      getLogger: () => string;
      getObservableSessionId: () => string;
      toString: () => string;
      parseCapabilitiesFromToken: (streamToken: string) => any;
      parseRoomOrChannelIdFromToken: (streamToken: string) => any;
      parseRoomOrChannelAliasFromToken: (streamToken: string) => any;
};

export interface UserMediaResolverType {
  getUserMedia: (deviceOptions: object, callback: any) => void;
  getVendorSpecificConstraints: (
    deviceOptions: 
    { audio: boolean; 
      video: boolean; 
      screen: boolean; 
      screenAudio: boolean; 
    }, 
    resolution: number , 
    frameRate: number) => any;
};

