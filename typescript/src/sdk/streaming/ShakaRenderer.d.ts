export interface elementToAttachTo_ShakaRenderer{
  muted: boolean; 
  play: () => void;
};

export interface updatedPlayerConfig_ShakaRenderer{
  abr: { 
    defaultBandwidthEstimate: number; }; 
  manifest: { 
    retryParameters: { timeout: number; }; }; 
  streaming: { 
    rebufferingGoal: number; 
    bufferingGoal: number; 
    bufferBehind: number; 
    retryParameters: { 
      timeout: number; 
      maxAttempts: number; 
      backoffFactor: number; }; 
    }; 
};

export interface config_loadPlayer{
  abr: { 
    defaultBandwidthEstimate: number; 
  }; manifest: 
  { retryParameters: 
    { timeout: number; 
    }; }; 
    streaming: { 
      rebufferingGoal: number; 
      bufferingGoal: number; 
      bufferBehind: number; 
      retryParameters: { 
        timeout: number; 
        maxAttempts: number; 
        backoffFactor: number;
       }; }
}