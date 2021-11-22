export interface options_joinChannel{
     videoElement: object; 
     streamSelectionStrategy: string; 
}
export interface response_joinRoomCallback{
    roomService: { leaveRoom?: any; getObservableActiveRoom: any; }; 
}
export interface member_evaluateMembers{
    getObservableRole: () => { (): any; new(): any; 
    getValue: { (): any; new(): any; }; }; 
    getObservableStreams: () => { (): any; new(): any; 
    getValue: { (): { (): any; new(): any; length: number; }; new(): any; }; }; 
}
export interface response_monitorChannelSubscriber{
    reason?: string; 
    retry?: ()=>void; 
    status: string; 
    description?: string; 
}
export interface response_mediaStreamCallback{
    reason: string; 
    mediaStream: any; 
    status: string; 
}
export interface options_publishToChannel{
    publishToken: string; 
    capabilities: any[]; 
    streamToken: string; 
    channel: object; 
}
export interface options_publishScreenToChannel{
    channel: object;
}
export interface callback_wrapResponseWithChannelPrefixes{
     (): void; (arg0: any, arg1: any): void; 
}
export interface response_wrapResponseWithChannelPrefixes{ 
    channelService: object; 
    roomService?: object; 
    channel: object; 
    room?: object; 
}

