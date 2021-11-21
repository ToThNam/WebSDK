export interface Ioption { 
  screenSharingExtensionId?: string; 
  eagerlyCheckScreenSharingCapabilities?: boolean; 
};
export interface Iresponse { 
  status: string;
  version: any; 
};

export interface options_mapChromeConstraints { 
  screen: boolean; 
  screenAudio: boolean; 
};
