
export interface options_PCast{
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
};

export interface response_Authenticate{
  status: string; 
  sessionId: string; 
};

export interface endPoint_ResolveUri{
  uri: string; 
  roundTripTime: number; 
};

export interface publisher_forOwn{
  getOptions: () => any; 
  stop: (arg0: string, arg1: boolean) => void;
};

export interface response_SetupStream{
  status: string; 
  createStreamResponse: 
  { streamId: string; 
    offset: number; 
    createOfferDescriptionResponse: 
    { sessionDescription: { sdp: any; };}; 
    rtcConfiguration: any; 
    options: any; 
  
  }; 
};
export interface options_PCast_subscribe{
  negotiate?: any; 
  disableAudioIfNoOutputFound?: boolean; 
  receiveAudio?: boolean; 
  originStreamId?: string; 
};
 export interface response_setupStream{
  status: string; 
  createStreamResponse: { 
    streamId: string; 
    createOfferDescriptionResponse: 
    { sessionDescription: { sdp: any; }; }; 
    rtcConfiguration: any; 
    offset: number;
   }; 
 };
 
 export interface response_authenticate{
  status: string;
 };

 export interface peerConnection_areAllPeerConnectionsOffline{
  iceConnectionState: string;
 };

 export interface event_streamEnded{
  streamId: string; 
  reason: string;
 };

 export interface event_dataQuality{
  streamId: string; 
  status: string; 
  reason: string;
 };

 export interface statesetup_StreamAddedListener{
   failed: boolean;
   stopped: boolean; 
 };

 export interface streamTelemetry_StreamAddedListener{
  setProperty: 
  (arg0: string, 
    arg1: string
  ) => void; 
};

export interface callback_StreamAddedListener{
  call: (
    arg0?: any, 
    arg1?: undefined, 
    arg2?: string 
    ) => void; 
};

export interface peerConnection_setupStateListener{
  iceConnectionState: any; 
  iceGatheringState: any; 
  signalingState: any; 
  connectionState: any; 
};

export interface arg0_callback_createPublisher{
  getStreamId: () => string; 
  getStream: () => null; 
  getStats: () => null; 
  isActive: () => boolean; 
  hasEnded: () => boolean; 
  stop: (reason: any) => void; 
  setPublisherEndedCallback: (callback: any) => void; 
  setDataQualityChangedCallback: (callback: any) => void; 
  getOptions: () => any; 
  monitor: (options: any, callback: any) => void; 
  getMonitor: () => null; 
  // publisherEndedCallback: () => any
};

export interface options_monitor{
  direction: string; 
  setNetworkRTT: (rtt: any) => void;
};

export interface track_forEach{
  readyState: string; 
  kind: string;
};

export interface mediaConstraints{
  mandatory:{
    OfferToReceiveVideo?: boolean;
    OfferToReceiveAudio?: boolean;
    offerToReceiveVideo?: boolean;
    offerToReceiveAudio?: boolean
  }
};

export interface createOptions_createViewerPeerConnection{
  receiveVideo: boolean; 
  receiveAudio: boolean;
};

export interface response_setAnswerDescription{
  status: string; 
  options: any; 
  sessionDescription: { sdp: any; }
};

export interface response_addIceCandidates{
  status: string; 
  options: any;
};

export interface options_createChunkedOrRtmpViewer{
  isDrmProtectedContent: boolean; 
  widevineServiceCertificateUrl: any; 
  playreadyLicenseUrl: any; 
  hlsTargetDuration: string; 
};

export interface peerConnection_closePeerConnection{
  signalingState: string; 
  __closing: boolean; 
  close: () => void; 
};

export interface callback_PCast{
  call: 
  (arg0: any, 
    arg1: any, 
    arg2: string, 
    arg3?: any) => void;
};

export interface createOptions_createPublisherPeerConnection{
  receiveVideo: boolean; 
  receiveAudio: boolean;
};

export interface callback_createPublisherPeerConnection{
  call: 
  (arg0: any, 
    arg1: any, 
    arg2?: any, 
    arg3?: any) => void;
};

export interface callback_subscribe_PCast{
  call: (
    arg0: any, 
    arg1: any, 
    arg2: string, 
    arg3?: null ) => void;
};

export interface arg2_callback_monitor{
  reasons?: string; 
  type?: string; 
  message?: string;
};

export interface callback_createChunkedOrRtmpViewer{
  call: (
    arg0: any, 
    arg1: undefined, 
    arg2: string) => any; 
};