

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

export interface RoomExpressType {
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
}