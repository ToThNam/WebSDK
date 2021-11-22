export interface Channel_CreateChannel{
    name: string;
    type: string; 
    description: string; 
}
export interface Response_WrapResponse{ 
    room: any;
    channel: any; 
}