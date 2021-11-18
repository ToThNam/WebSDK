export interface webSdk {
  (rtc: any, 
    logging: any, 
    PCast: boolean | string ,
    RoomService: any, 
    AudioSpeakerDetector: any, 
    BandwidthMonitor: any, 
    UserMediaResolver: any, 
    PCastExpress: any, 
    RoomExpress: any, 
    ChannelExpress: any, 
    AdminApiProxyClient: string | void | Array<Object>),
}