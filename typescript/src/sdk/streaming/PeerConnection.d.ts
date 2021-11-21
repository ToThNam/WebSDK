export interface NewStats_ConvertPeerConnectionStats {
   uploadRate: number ; 
   downloadRate: number ; 
   mediaType: any; 
   ssrc: any; 
   direction: string; 
   nativeReport: any; 
   rtt: any; 
   bitrateMean: number; 
   targetDelay: number ; 
   currentDelay: number ;
};

export interface report_Firefox{ 
  mediaType: string; 
  jitter: number; 
  roundTripTime: number; 
};

export interface report_ReportToUpdate{ 
  mediaType: string; 
  jitter: number; 
  roundTripTime: number;
};

export interface report_forEach_Edge{ 
  id: string | number; 
  jitter: number;
};

export interface reportToUpdate_forOwn_Edge{ 
  mediaType: string; 
  framesPerSecond: number;
};

export interface report_forOwn_Edge{ 
  type: string; 
  framesPerSecond: string;
};

export interface report_forEach_Safari{ 
  id: string | number;  
};

export interface reportToUpdate_forOwn_Safari{ 
  mediaType: string; 
  currentRoundTripTime: number;
};

export interface report_forEach_ReactNative{ 
  id: any; 
  type: any; 
  values: any[]; 
  timestamp: any;  
};

export interface StatsReport_ConvertStats{ 
  ssrc: number; 
  id: string; 
  timestamp: string; 
  bytesSent: string; 
  bytesReceived: string; 
  framesEncoded: number; 
  framesDecoded: number; 
  mediaType: string; 
  rtt: any; 
  googRtt: any; 
  roundTripTime: number; 
  currentRoundTripTime: any; 
  bitrateMean: any; 
  targetDelay: any; 
  googTargetDelayMs: any; 
  currentDelay: any; 
  currentDelayMs: any; 
  googCurrentDelayMs: any; 
  droppedFrames: any; 
  framerateMean: any; 
  framesPerSecond: any; 
  cpuLimitedResolution: any; 
  googCpuLimitedResolution: any; 
  avgEncode: any; 
  avgEncodeMs: any; 
  googAvgEncodeMs: any; 
  audioInputLevel: any; 
  googAudioInputLevel: any; 
  audioOutputLevel: any; 
  googAudioOutputLevel: any; 
  jitter: any; 
  jitterReceived: any; 
  googJitterReceived: any; 
  jitterBuffer: any; 
  jitterBufferMs: any; 
  googJitterBufferMs: any; 
  totalSamplesDuration: any; 
  totalAudioEnergy: any;
  type: string 
};