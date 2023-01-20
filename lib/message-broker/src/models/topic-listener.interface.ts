

export interface HandleMessageArgs {
    /**
     * the payload of the message;
     * in case contentType is 'application/json', body's value will be json parsed. 
     */
    body: unknown;
    messageId?: string;
    /**
     * the contentType of the body value;
     * will effect the body parsing process/ 
     */
    contentType?: string;
    correlationId?: string;
    name?: string;
    status?: string;
}

export interface HandleErrorArgs {
    error: unknown;
    errorSource: string;
}

export interface TopicListener {
    handleMessage(message: HandleMessageArgs): Promise<void>;
    handleError(args: HandleErrorArgs): Promise<void>;
    shouldListen(): boolean;
    isConnected?: () => boolean;
    topicName: string;
    subscriptionName: string;
}
