export interface Record_recordMetricRecord{
  metric: string;
};

export interface video{
  paused: boolean;
  videoWidth: number; 
  videoHeight: number;
};

export interface trackedVideo{
  paused: boolean;
  videoWidth: number; 
  videoHeight: number;
};

export interface Dimensions_addVideoDisplayDimensionsChangedCallback{
  width:  number; 
  height: number; 
};