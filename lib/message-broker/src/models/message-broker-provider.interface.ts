import { TopicListener } from './topic-listener.interface';


export interface ListenToTopicOptions {
    destructiveRead?: boolean
}

export interface SubscriptionClose {
    close(): Promise<void>;
}

export interface MessageListenerProvider {
    listenToTopic(listener: TopicListener, options?: ListenToTopicOptions): SubscriptionClose;
    listenToQueue(queueName: string): Promise<boolean>;
    isTopicListenerConnected(topicListener: TopicListener): boolean;
}


export interface PostMessageOptions {
    name: string;
    correlationId: string;
    messageId: string;
    status: string;
    contentType?: string;
    sessionId?: string;
}

export interface MessagePublisherProvider {
    postMessageToTopic(topicName: string, payload: string, options?: PostMessageOptions): Promise<void>;
    postMessageToQueue(queueName: string, payload: string): Promise<boolean>;
}

export interface MessageBrokerProvider extends MessageListenerProvider, MessagePublisherProvider {
}
