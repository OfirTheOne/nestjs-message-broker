import { Inject, Injectable } from '@nestjs/common';
import { constants } from './constants';
import { ListenToTopicOptions, MessageBrokerProvider, PostMessageOptions, SubscriptionClose } from './models/message-broker-provider.interface';
import { TopicListener } from './models/topic-listener.interface';

@Injectable()
export class MessageBrokerService implements MessageBrokerProvider {
  constructor(
    @Inject(constants.MESSAGE_BROKER_PROVIDER) protected readonly provider: MessageBrokerProvider
  ) { }

  listenToTopic(listener: TopicListener, options?: ListenToTopicOptions): SubscriptionClose {
    return this.provider.listenToTopic(listener, options);
  }
  postMessageToTopic(topicName: string, payload: string, options?: PostMessageOptions): Promise<void> {
    return this.provider.postMessageToTopic(topicName, payload, options);
  }
  listenToQueue(queueName: string): Promise<boolean> {
    return this.provider.listenToQueue(queueName);
  }
  postMessageToQueue(queueName: string, payload: string): Promise<boolean> {
    return this.provider.postMessageToQueue(queueName, payload);
  }
  isTopicListenerConnected(topicListener: TopicListener): boolean {
    return this.provider.isTopicListenerConnected(topicListener);
  }
}
