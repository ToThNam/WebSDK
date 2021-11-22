export interface response_closestEndPointResolver {
  endPoint: string | string[]; 
  time: any;
};

export interface xhr_handleReadyStateChange {
  readyState: number; 
  status: number; 
  response: any; 
  responseText: any; 
  getAllResponseHeaders: () => any;
};

export interface arg1_callback_handleReadyStateChange{
  data: any; 
  headers: any; 
  rawXhr: xhr_handleReadyStateChange; 
}