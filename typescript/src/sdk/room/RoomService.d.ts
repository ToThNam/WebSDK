export interface Room_CreateRoom {
    name: string;
    type: string; 
    description: string; 
}
export interface Event_OnRoomEvent { 
    roomId: string; 
    eventType: string; 
    members: any[]; 
    room: any; 
}
export interface Member_GetDifferencesBetweenCachedRoom { 
    sessionId: string; 
    state: any; 
    screenName: string; 
    role: string; 
    streams: any[]; 
    lastUpdate: number; 
}
export interface Room_GetValidRoomObject { 
    alias: string; 
    name: string; 
    description: string; 
    type: string; 
    bridgeId: string; 
    pin: string;  
}
export interface Room_ReplaceSelfInstanceInRoom { 
    getObservableMembers: () => { (): any; new(): any; 
    getValue: { (): any; new(): any; }; 
    setValue: { (arg0: any): void; new(): any; }; }; 
}
