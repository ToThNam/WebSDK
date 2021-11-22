export interface AudioVolumeMeter {
     onValue: (arg0: (value: any) => void) => void
}
export interface Options_StartAudioDetection {
     speakingHysteresisInterval?: number; 
     silenceHysteresisInterval?: number; 
}
