export interface authenticate_PCastProtocol{
  sessionId?: string, 
  apiVersion: any, 
  clientVersion: any, 
  deviceId:string, 
  platform: any, 
  platformVersion:any, 
  authenticationToken: string 
};

export interface options_PCastProtocol{
  connectUri: string; 
  connectOptions: any; 
  tags: any; 
  originStreamId: string; 
  negotiate: any; 
  receiveAudio: boolean; 
  receiveVideo: boolean; 
};

export interface setupStream_PCastProtocol{
  streamToken:string;
  createStream: {
    sessionId?:string;
    options?: any;
    connectUri?: string;
    connectOptions: any;
    tags?: any;
    userAgent?: any;
    originStreamId?: string;
    createOfferDescription?: {
      streamId:string;
      options: any;
      apiVersion: any;
    
    }
  }
};

export interface candidate_PCastProtocol{
  candidate: string; 
  sdpMLineIndex: any; 
  sdpMid: any; 
};

export interface room_PCastProtocol{
  name: string; 
  type: string; 
  description: string; 
};

export interface fetchRoomConversation_PCastProtocol{
  sessionId: string;
  roomId: string;
  limit: number;
  options: any;
  beforeMessageId?:string;
  afterMessageId?: string;
};

export interface arg1_callback_PCastProtocol{
  sessionId: string;
};