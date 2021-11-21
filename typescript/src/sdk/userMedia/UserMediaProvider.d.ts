export interface E_getUserMediaErrorStatus {
   code: string; 
   message: string; 
   name: string; 
}
export interface Option_sGetUserMediaConstraints{
  screen: boolean; 
  audio: boolean; 
  video: boolean;
};

export interface Option_UserMediaProvider{
  screenAudio: boolean; 
  screen: boolean; 
  video: boolean; 
  audio: boolean; 
};

export interface Option_getUserMedia{
  screenAudio: boolean;
  screen: boolean; 
  audio: boolean; 
  video: boolean;
};

export interface stream_onUserMediaSuccess{
  getTracks: any; 
  id?: string;
};

export interface response_getUserMediaConstraints{
  status: string; 
  constraints: any; 
};

export interface e_getUserMediaErrorStatus{
  code: string; 
  message: string; 
  name: string;
};