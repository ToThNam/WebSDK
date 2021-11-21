export interface Resolution_SetUserMediaOptionsForEdge {
  width: number; 
  height: number;
}

export interface DeviceOptions_SetUserMediaOptionsForEdge{
  audio: any; 
  video: any; 
  screen: any; 
  screenAudio?: boolean;
}

export interface Constraints_SetUserMediaOptionsForEdge{
  video?: boolean | 
  { height?: 
    { min?: number;
       max?: number; 
       exact?: number
    }; 
    width?:
    { min?:number; 
      max?: number; 
      exact?: number;  
    }; 
    deviceId?: string; 
    facingMode?: any; 
    frameRate?: number 
  }; 
  audio? : boolean | 
  { deviceId? :string }; 
  screen?: boolean; 
};

export interface DeviceOptions_SetUserMediaOptionsForNewerBrowser{ 
  audio: any; 
  video: any; 
  screen: any; 
  screenAudio: any; 
};

export interface Resolution_SetUserMediaOptionsForNewerBrowse {
  width: number; 
  height: number;
}

export interface Constraints_SetUserMediaOptionsForNewerBrowse{
  video?: boolean | 
  { height?: 
    { min?: number; 
      max?: number; 
      ideal?: number
    }; 
    width?:
    { min?:number; 
      max?: number; 
      ideal?: number;  
    }; 
    deviceId?: any; 
    facingMode?: any; 
    frameRate?: 
      { max?: number; 
        ideal?: number
      } 
  }; 
  audio? : boolean | 
  { deviceId?: any;
     mediaSource?: string; 
     mediaSourceId?: string 
  }; 
  screen?: boolean | 
  { height?: 
    { min?: number; 
      max?: number; 
      ideal?: number
    }; 
    width?:
    { min?:number; 
      max?: number; 
      ideal?: number;  
    }; 
    mediaSource?: string; 
    frameRate?: 
    { max?: number; 
      ideal?: number
    } 
  };
  screenAudio? : boolean | 
  { deviceId?: any;
     mediaSource?: string; 
     mediaSourceId?: string 
  }; 
};

export interface DeviceOptions_SetUserMediaOptionsForOtherBrowsers{ 
  audio: any; 
  video: any; 
  screen: any; 
  screenAudio: any; 
};

export interface Resolution_SetUserMediaOptionsForOtherBrowsers {
  width: number; 
  height: number;
};

export interface Constraints_SetUserMediaOptionsForOtherBrowsers{
  video?: boolean | 
  { mandatory:
    { minHeight?: number; 
      maxHeight?: number; 
      minWidth?: number;
      maxWidth?: number;
      maxFrameRate?: number;
      sourceId?: string;
      mediaSource?: string;
      mediaSourceId?: string;
    }; 
    facingMode?: any
  }; 
  audio?: boolean |
  { mandatory:
    { sourceId?: string;
      mediaSource?: string;
      mediaSourceId?: string;
    }
  };
  screenAudio?: boolean |
  { mandatory:
    { sourceId?: string;
      mediaSource?: string;
      mediaSourceId?: string;
    }
  };
  screen?: boolean | 
  { mandatory:
    { minHeight?: number; 
      maxHeight?: number; 
      minWidth?: number;
      maxWidth?: number;
      maxFrameRate?: number;
      sourceId?: string;
      mediaSource?: string;
      mediaSourceId?: string;
    }; 
    facingMode?: any
  }; 
};