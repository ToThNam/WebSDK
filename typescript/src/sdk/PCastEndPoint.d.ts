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