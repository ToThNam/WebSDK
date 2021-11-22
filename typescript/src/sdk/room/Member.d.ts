export interface Member_Update { 
    state: any; 
    screenName: string; 
    role: string; 
    lastUpdate: number; 
    streams: any[]; 
}
export interface Stream_CreateNewObservableStream{ 
    uri: string; 
    type: string; 
    audioState: string; 
    videoState: string; 
}
export interface Stream_forEach{ 
    uri: string; 
    type: string; 
    audioState: string; 
    videoState: string; 
}