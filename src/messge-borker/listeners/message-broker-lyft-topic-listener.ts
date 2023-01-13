import { Injectable } from '@nestjs/common';
import { HandleErrorArgs, HandleMessageArgs, TopicListener } from '@app/message-broker';

@Injectable()
export class MessageBrokerLyftTopicListener implements TopicListener {

  topicName: string;
  subscriptionName: string;
  trooperAllIncidentsServiceUrl: string;
  isMsgBrokerListenerDisabled: boolean;

  constructor() {
    this.topicName = 'LYFT_TOPIC_NAME';
    this.subscriptionName = 'MATADOR_SUBSCRIPTION_NAME';
    this.trooperAllIncidentsServiceUrl = 'TROOPER_ALL_INCIDENTS_ENDPOINT';
    this.isMsgBrokerListenerDisabled = false;
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
