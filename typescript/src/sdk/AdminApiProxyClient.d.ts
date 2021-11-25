export interface AdminApiProxyClientType {
    getBackendUri: () => string;
    setBackendUri: (uri: string) => void;
    getEndpointPaths: () => any;
    getAuthenticationData: () => any;
    setAuthenticationData: (obj: any) => void;
    getAuthenticationDataLocationInPayload: () => string;
    setAuthenticationDataLocationInPayload: (location: any) => string;
  };
  
export interface endpointPaths_setEndpointPaths{
    createStreamTokenPath: string; 
    createAuthTokenPath: string; 
};

export interface defaultRequestOptions{
    timeout?: number;
    retryOptions?:{
        backoff?: number;
        delay?: number;
        maxAttempts?: number;
        additionalRetryErrorCodes?: any;
    };
};

export interface data {
    sessionId?: string; 
    capabilities?: string[]; 
    originStreamId?: string; 
    alternateOriginStreamIds?: string; 
    constraint?: any; 
  };

