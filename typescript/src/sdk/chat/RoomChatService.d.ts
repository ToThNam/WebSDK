export interface RoomService_RoomChatService{
     _pcast: object; 
}
export interface Pcast_SetPCast{
     getLogger: () => any;
}
export interface Room_OnRoomChange{
    getRoomId: () => any; 
}
export interface Response_OnReceiveMessages{
    status: string;
    chatMessages: any[] 
}
export interface Message_AddMessage{
     messageId: string; 
     timestamp: number; 
}