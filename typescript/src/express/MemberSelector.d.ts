export interface member_getSimilarMembers{
    getObservableScreenName: () => { 
        (): string;
        new(): string; 
        getValue: { (): string;
        new(): string; }; }; 
    getSessionId: () => string; 
}
export interface member_getMemberKey{
    getSessionId: () => any; 
    getObservableScreenName: () => { (): any; new(): any; getValue: { (): any; new(): any; }; }; 
}
export interface member_getNextMember{
    getSessionId: () => any; 
    getObservableScreenName: () => { (): any; new(): any; getValue: { (): any; new(): any; }; }; 
}
export interface member_getNextMember_forEach{
    getSessionId: () => any; 
    getObservableScreenName: () => { (): any; new(): any; getValue: { (): any; new(): any; }; }; 
}
export interface mostRecentMember_getMostRecentMember{
    getLastUpdate: () => number;  
}
export interface member_getMostRecentMember{
    getLastUpdate: () => number;   
}
export interface member_isPrimary{
    getSessionId?: () => string; 
    getObservableScreenName: any; 
}
export interface member_isAlternate{
    getSessionId?: () => string; 
    getObservableScreenName: any; 
}


