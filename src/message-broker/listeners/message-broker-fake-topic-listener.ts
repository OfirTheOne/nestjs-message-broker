import { Injectable } from '@nestjs/common';
import { HandleErrorArgs, HandleMessageArgs, TopicListener } from '@app/message-broker';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MessageBrokerFakeTopicListener implements TopicListener {

  topicName: string;
  subscriptionName: string;
  isMsgBrokerListenerDisabled: boolean;

  constructor(private config: ConfigService) {
    this.topicName = this.config.get('FAKE_TOPIC_NAME_01');
    this.subscriptionName = this.config.get('FAKE_SUBSCRIPTION_NAME_01');
    this.isMsgBrokerListenerDisabled = this.config.get('DISABLE_MESSAGE_BROKER_LISTENERS');
    if (this.isMsgBrokerListenerDisabled) {
      console.info('[MessageBrokerLyftTopicListener:constructor] ignoring events for topic %s (DISABLE_MESSAGE_BROKER_LISTENERS is true)',
        { messageParams: [this.topicName] }
      );
    }
  }

  handleError(args: HandleErrorArgs): Promise<void> {
    console.error(`[MessageBrokerLyftTopicListener:handleError] an error was thrown while listening to topic %s with details %o`, { messageParams: [this.topicName, args] });
    return Promise.reject(args);
  }
  
  shouldListen(): boolean {
    return !this.isMsgBrokerListenerDisabled;
  }

  async handleMessage(message: HandleMessageArgs): Promise<void> {
    if (this.isMsgBrokerListenerDisabled) {
      return;
    }
    if (message.name === 'UPLIFT_STATUS') {
      const payload = message?.body;
      console.log(payload);
    }
  }
}
