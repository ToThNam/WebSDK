export interface Room_Update{ 
    roomId: string; 
    alias: string; 
    name: string; 
    description: string; 
    type: string; 
    options: any; 
    bridgeId: string; 
    pin: string; 
    members: any[]; 
}
export interface Member_RemoveMembers{ 
    sessionId: string; 
    lastUpdate: number; 
}
export interface ObservableMember_RemoveMembers{ 
     getSessionId: () => string; 
     getObservableLastUpdate: () => { (): any; new(): any; 
     getValue: { (): number; new(): any; }; }; 
}
export interface Member_UpdateMembers{ 
    sessionId: string; 
    lastUpdate: number; 
}
export interface ObservableMember_UpdateMembers{ 
    getSessionId: () => any; 
    getObservableLastUpdate: () => { (): any; new(): any; 
    getValue: { (): number; new(): any; }; };
    _update: (arg0: any) => void;
}
export interface Member_MapMembers{ 
    state: any; 
    sessionId: string; 
    screenName: string; 
    role: string; streams: any[]; 
    lastUpdate: number; }