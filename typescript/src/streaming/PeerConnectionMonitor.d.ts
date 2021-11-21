export interface options_PeerConnectionMonitor{
  direction: string; 
  monitoringInterval: number; 
  frameRateThreshold: number; 
  videoBitRateThreshold: number; 
  audioBitRateThreshold: number; 
  conditionCountForNotificationThreshold: number; 
  conditionMonitoringInterval: any; 
  monitorFrameRate: any; 
  monitorBitRate: any; 
  monitorState: any;
  setNetworkRTT: (arg0: any) => void;
};

export interface track_PeerConnectionMonitor{ 
  id: string; 
  kind: any;
 };

 export interface peerConnection_MonitorPeerConnection{ 
  connectionState: string; 
  iceConnectionState: string; 
 };

 export interface monitorCallback_MonitorPeerConnection{ 
  type: string; 
  reasons?: string[]; 
  message: string; 
  report?: any; 
  frameRate?: number; 
  videoBitRate?: any; 
  audioBitRate?: any; 
  acknowledgeFailure?: () => void;
 };

 export interface stats_eachStats{ 
  direction: string; 
  mediaType: string; 
  ssrc: number; 
  rtt: any; 
  bitrateMean: any; 
  droppedFrames: any; 
  framerateMean: string | number ; 
  avgEncode: any; 
  cpuLimitedResolution: any; 
  uploadRate: any ; 
  jitter: any; 
  audioInputLevel: any; 
  currentDelay: any; 
  targetDelay: any; 
  downloadRate:any; 
  jitterBuffer: any; 
  audioOutputLevel: any; 
  totalAudioEnergy: any; 
  totalSamplesDuration: any;
 };