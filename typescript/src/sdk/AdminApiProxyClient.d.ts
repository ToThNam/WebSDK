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