export interface Context_Init {
    createScriptProcessor: (arg0: number, arg1: number, arg2: number) => any; 
}
export interface Event_OnAudioProcess {
    inputBuffer: { getChannelData: (arg0: number) => any; }; 
}
export interface Stream_ConnectToStream {
     getAudioTracks: () => { (): any; new(): any; length: number; }
}