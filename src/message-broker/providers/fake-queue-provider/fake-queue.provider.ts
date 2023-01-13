import { Inject, Injectable } from '@nestjs/common';
import { 
    InvalidArgumentException, 
    TopicListener,
    ListenToTopicOptions, 
    MessageBrokerProvider, 
    PostMessageOptions, 
    SubscriptionClose,
    MessageBrokerModuleConfigCore
 } from '@app/message-broker';
 import { constants } from '@app/message-broker/constants';


@Injectable()
export class FakeQueueService implements MessageBrokerProvider {

  constructor(
    @Inject(constants.MESSAGE_BROKER_CONFIG) protected readonly config: MessageBrokerModuleConfigCore,
  ) { }

  /**
   *
   * @param listener - a TopicListener object to subscribe with.
   * @param options optional listening option object.
   * @returns {SubscriptionClose}
   */
  listenToTopic(listener: TopicListener, _options: ListenToTopicOptions = {destructiveRead: true}): SubscriptionClose {
    console.info(`[ServiceBusService:listenToTopic] topic: %s, subscription: %s`, { messageParams: [listener.topicName, listener.subscriptionName] });
    this.validateListenToTopicArguments(listener); // internally log & throws if not valid
    this.validateTopicListener(listener); // internally log & throws if not valid

    const subscriptionClose = { close: () => Promise.resolve() };
    console.trace('[ServiceBusService:listenToTopic] autoCompleteMessages : %s ', {
      messageParams: [],
    });

    console.debug(`[ServiceBusService:listenToTopic] subscribe method done.`);
    return subscriptionClose;
  }
  /**
   *
   * @param topicName - the topic name
   * @param payload -the message's payload (body).
   * @param options - the message's metadata.
   */
  async postMessageToTopic(topicName: string, payload: string, options: PostMessageOptions): Promise<void> {
    console.trace('[ServiceBusService:postMessageToTopic] topic: %s, messageId: %s, correlationId: %s.', {
      messageParams: [topicName, options.messageId, options.correlationId],
    });
    console.debug('[ServiceBusService:postMessageToTopic] messageId: %s, payload: %o', { messageParams: [options.messageId, payload] });
    this.validatePostMessageArguments(topicName, payload, options); // internally log & throws if not valid
    this.validatePostMessageOptions(options); // internally log & throws if not valid
    console.debug('[ServiceBusService:postMessageToTopic] all method arguments are valid.');

    try {
        // sendMessages(serviceBusMessage);
      console.trace(`[ServiceBusService:postMessageToTopic] sendMessages done messageId: %s.`, { messageParams: [options.messageId] });
    } catch (error) {
      console.error('[ServiceBusService:postMessageToTopic] Error: %s', { messageParams: [(error as Error).message] });
    } finally {
        console.debug('[ServiceBusService:postMessageToTopic] sender closed.');
    }
  }
  async listenToQueue(queueName: string): Promise<boolean> {
    console.debug('[ServiceBusService:listenToQueue] queueName: %s', { messageParams: [queueName] });
    throw new Error('Method not implemented.');
  }
  async postMessageToQueue(queueName: string, payload: string): Promise<boolean> {
    console.debug('[ServiceBusService:postMessageToQueue] queueName: %s, payload: %o', { messageParams: [queueName, payload] });
    throw new Error('Method not implemented.');
  }

  isTopicListenerConnected(topicListener: TopicListener): boolean {
    console.trace('[ServiceBusService:isTopicListenerConnected] Checking connection to topic: %s, subscription: %s', {
      messageParams: [topicListener.topicName, topicListener.subscriptionName],
    });
    return true;
  }
  
  /**
   * @throws {InvalidArgumentException} if one of the args is invalid, throws InvalidArgumentException error.
   * @returns {true} if all of the args are valid.
   */
  protected validatePostMessageArguments(topicName: string, payload: string, options: PostMessageOptions): boolean {
    if (typeof topicName !== 'string' || topicName.length == 0) {
      console.error('[ServiceBusService.validatePostMessageArguments] invalid argument, topicName: %s', { messageParams: [topicName] });
      throw new InvalidArgumentException(`Method ServiceBusService.postMessageToTopic received invalid argument, topicName ${topicName}`);
    }
    if (typeof payload !== 'string' || payload.length == 0) {
      console.error('[ServiceBusService.validatePostMessageArguments] invalid argument, payload: %s', { messageParams: [payload] });
      throw new InvalidArgumentException(`Method ServiceBusService.postMessageToTopic received invalid argument, payload ${payload}`);
    }
    if (options == null || typeof options !== 'object') {
      console.error('[ServiceBusService.validatePostMessageArguments] invalid argument, options: %o', { messageParams: [options] });
      throw new InvalidArgumentException(`Method ServiceBusService.postMessageToTopic received invalid argument, options ${options}`);
    }
    return true;
  }

  /**
   * @throws {InvalidArgumentException} if one of options fields is invalid, throws InvalidArgumentException error.
   * @returns {true} if all of options fields are valid.
   */
  protected validatePostMessageOptions(options: PostMessageOptions): boolean {
    if (options == null || typeof options !== 'object') {
      console.error('[ServiceBusService.validatePostMessageOptions] invalid argument, options: %o', { messageParams: [options] });
      throw new InvalidArgumentException(`Method ServiceBusService.postMessageToTopic received invalid argument, options ${options}`);
    }
    if (typeof options.name !== 'string' || options.name.length == 0) {
      console.error('[ServiceBusService.validatePostMessageOptions] invalid options field, name: %s', { messageParams: [options.name] });
      throw new InvalidArgumentException(`Method ServiceBusService.postMessageToTopic received invalid options field, name ${options.name}`);
    }
    if (typeof options.correlationId !== 'string' || options.correlationId.length == 0) {
      console.error('[ServiceBusService.validatePostMessageOptions] invalid options field, correlationId: %s', { messageParams: [options.correlationId] });
      throw new InvalidArgumentException(`Method ServiceBusService.postMessageToTopic received invalid options field, correlationId ${options.correlationId}`);
    }
    if (typeof options.messageId !== 'string' || options.messageId.length == 0) {
      console.error('[ServiceBusService.validatePostMessageOptions] invalid options field, messageId: %s', { messageParams: [options.messageId] });
      throw new InvalidArgumentException(`Method ServiceBusService.postMessageToTopic received invalid options field, messageId ${options.messageId}`);
    }
    return true;
  }

  /**
   * @throws {InvalidArgumentException} if one of the args is invalid, throws InvalidArgumentException error.
   * @returns {true} if all of the args are valid.
   */
  protected validateListenToTopicArguments(listener: TopicListener): boolean {
    if (listener == null || typeof listener !== 'object') {
      console.error('[ServiceBusService.validateListenToTopicArguments] invalid argument, listener: %o', { messageParams: [listener] });
      throw new InvalidArgumentException(`Method ServiceBusService.listenToTopic received invalid argument, listener ${listener}`);
    }
    return true;
  }

  /**
   * @throws {InvalidArgumentException} if one of listener fields is invalid, throws InvalidArgumentException error.
   * @returns {true} if all listener fields are valid.
   */
  protected validateTopicListener(listener: TopicListener): boolean {
    if (listener == null || typeof listener !== 'object') {
      console.error('[ServiceBusService.validateTopicListener] invalid argument, listener: %o', { messageParams: [listener] });
      throw new InvalidArgumentException(`Method ServiceBusService.listenToTopic received invalid argument, listener ${listener}`);
    }
    if (typeof listener.topicName !== 'string' || listener.topicName.length == 0) {
      console.error('[ServiceBusService.validateTopicListener] invalid listener field, topicName: %s', { messageParams: [listener.topicName] });
      throw new InvalidArgumentException(`Method ServiceBusService.listenToTopic received invalid listener field, topicName ${listener.topicName}`);
    }
    if (typeof listener.subscriptionName !== 'string' || listener.subscriptionName.length == 0) {
      console.error('[ServiceBusService.validateTopicListener] invalid listener field, subscriptionName: %s', { messageParams: [listener.topicName] });
      throw new InvalidArgumentException(`Method ServiceBusService.listenToTopic received invalid listener field, subscriptionName ${listener.subscriptionName}`);
    }
    if (typeof listener.handleMessage !== 'function') {
      console.error('[ServiceBusService.validateTopicListener] invalid listener field, handleMessage.');
      throw new InvalidArgumentException(`Method ServiceBusService.listenToTopic received invalid listener field, handleMessage.`);
    }
    if (typeof listener.handleError !== 'function') {
      console.error('[ServiceBusService.validateTopicListener] invalid listener field, handleError.');
      throw new InvalidArgumentException(`Method ServiceBusService.listenToTopic received invalid listener field, handleError.`);
    }
    return true;
  }


}
