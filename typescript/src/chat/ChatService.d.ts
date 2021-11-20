export interface Pcast_ChatService{
     getLogger: () => any; 
     getProtocol: () => any; 
} 
export interface SetPCast_ChatService{
    getLogger: () => any; 
    getProtocol: () => any; 
} 
export interface Event_OnRoomConversationEvent { 
    roomId: string ;
    eventType: string; 
    chatMessages: any[]; 
}
export interface Response_GetMessages { 
    status: string; 
    chatMessages: any[];
}
export interface Response_SubscribeToRoomConversation { 
    status: string; 
    chatMessages: any[];
}
export interface ChatMessage_ConvertTimeFromLongInChatMessage { 
    timestamp: number;
     from: { 
            lastUpdate: number;
            }
}