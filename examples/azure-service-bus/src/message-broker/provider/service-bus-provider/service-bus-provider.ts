import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  MessageHandlers,
  ProcessErrorArgs,
  ServiceBusClient,
  ServiceBusMessage,
  ServiceBusReceivedMessage,
  ServiceBusReceiver,
  ServiceBusReceiverOptions,
  ServiceBusSender,
  SubscribeOptions,
} from '@azure/service-bus';
import { 
  HandleMessageArgs, 
  MessageBrokerModuleConfigCore,
  ListenToTopicOptions, 
  MessageBrokerProvider, 
  PostMessageOptions, 
  SubscriptionClose,
  TopicListener,
  InvalidArgumentException,
  constants
} from '@nestjs-ext/message-broker';
import { pick } from 'lodash';

export type SubscriptionsCacheEntry = {
  args: TopicListener;
  receiver: ServiceBusReceiver;
};

@Injectable()
export class ServiceBusService implements MessageBrokerProvider {
  protected readonly subscriptionsCache: Array<SubscriptionsCacheEntry> = [];
  protected readonly serviceBusClient: ServiceBusClient;

  constructor(
    @Inject(constants.MESSAGE_BROKER_CONFIG) protected readonly config: MessageBrokerModuleConfigCore,
    protected readonly logger: Logger,
  ) {
    this.serviceBusClient = new ServiceBusClient(config.connectionString);
  }

  /**
   *
   * @param listener - a TopicListener object to subscribe with.
   * @param options optional listening option object.
   * @returns {SubscriptionClose}
   */
  listenToTopic(listener: TopicListener, options: ListenToTopicOptions = {destructiveRead: true}): SubscriptionClose {
    this.logger.log(`[ServiceBusService:listenToTopic] topic: %s, subscription: %s`, { messageParams: [listener.topicName, listener.subscriptionName] });
    this.validateListenToTopicArguments(listener); // internally log & throws if not valid
    this.validateTopicListener(listener); // internally log & throws if not valid

    const receiver = this.serviceBusClient.createReceiver(listener.topicName, listener.subscriptionName, this.createReceiverOptionsAdapter(options));
    this.logger.log('[ServiceBusService:listenToTopic] Receiver mode: %s ', {
      messageParams: [receiver.receiveMode],
    });
    const autoComplete = receiver.receiveMode === 'peekLock' ? false : true;
    const subscriptionClose = receiver.subscribe(
      {
        processMessage: this.processMessageAdapter(listener, listener.handleMessage),
        processError: this.processErrorAdapter(listener, listener.handleError),
      },
      { autoCompleteMessages: autoComplete} as SubscribeOptions,
    );
    this.logger.log('[ServiceBusService:listenToTopic] autoCompleteMessages : %s ', {
      messageParams: [autoComplete],
    });
    this.subscriptionsCache.push({ args: listener, receiver });

    this.logger.debug(`[ServiceBusService:listenToTopic] subscribe method done.`);
    return subscriptionClose;
  }
  /**
   *
   * @param topicName - the topic name
   * @param payload -the message's payload (body).
   * @param options - the message's metadata.
   */
  async postMessageToTopic(topicName: string, payload: string, options: PostMessageOptions): Promise<void> {
    this.logger.log('[ServiceBusService:postMessageToTopic] topic: %s, messageId: %s, correlationId: %s.', {
      messageParams: [topicName, options.messageId, options.correlationId],
    });
    this.logger.debug('[ServiceBusService:postMessageToTopic] messageId: %s, payload: %o', { messageParams: [options.messageId, payload] });
    this.validatePostMessageArguments(topicName, payload, options); // internally log & throws if not valid
    this.validatePostMessageOptions(options); // internally log & throws if not valid
    this.logger.debug('[ServiceBusService:postMessageToTopic] all method arguments are valid.');

    let sender: ServiceBusSender | undefined;
    try {
      sender = this.serviceBusClient.createSender(topicName);
      const serviceBusMessage = this.covertPostMessageArgsToServiceBusMessage(payload, options);
      this.logger.log(`[ServiceBusService:postMessageToTopic] converted message object : %o .`, { messageParams: [serviceBusMessage] });
      await sender.sendMessages(serviceBusMessage);
      this.logger.log(`[ServiceBusService:postMessageToTopic] sendMessages done messageId: %s.`, { messageParams: [options.messageId] });
    } catch (error) {
      this.logger.error('[ServiceBusService:postMessageToTopic] Error: %s', { messageParams: [(error as Error).message] });
    } finally {
      if (sender) {
        await sender.close();
        this.logger.debug('[ServiceBusService:postMessageToTopic] sender closed.');
      }
    }
  }
  async listenToQueue(queueName: string): Promise<boolean> {
    this.logger.debug('[ServiceBusService:listenToQueue] queueName: %s', { messageParams: [queueName] });
    throw new Error('Method not implemented.');
  }
  async postMessageToQueue(queueName: string, payload: string): Promise<boolean> {
    this.logger.debug('[ServiceBusService:postMessageToQueue] queueName: %s, payload: %o', { messageParams: [queueName, payload] });
    throw new Error('Method not implemented.');
  }

  /*
   * adapter methods to adapt the the external `MessageBrokerProvider` interface to service-bus sdk interfaces :
   */

  /**
   * @description on listen to topic,
   * convert from package specific listening options interface to service-bus listening options.
   */
  protected createReceiverOptionsAdapter(options: ListenToTopicOptions): ServiceBusReceiverOptions {
    return {
      receiveMode: options.destructiveRead == undefined ? 
        'receiveAndDelete' : options.destructiveRead ? 'peekLock' : 'receiveAndDelete',
    };
  }

  /**
   * @description on listen to topic,
   * convert from  package specific message-handler signature to service-bus message-handler signature.
   */
  protected processMessageAdapter(ctx: TopicListener, handleMessage: TopicListener['handleMessage']): MessageHandlers['processMessage'] {
    return (messageArgs: ServiceBusReceivedMessage): Promise<void> => {
      const handleMessageArgs = this.covertServiceBusReceivedMessageToHandleMessageArgs(messageArgs);
      try {
        handleMessageArgs.body =
          handleMessageArgs.contentType == 'application/json' && typeof handleMessageArgs.body == 'string' ? JSON.parse(handleMessageArgs.body) : handleMessageArgs.body;
      } catch (error) {
        // intentionally silence the error.
        this.logger.error('[ServiceBusService:processMessageAdapter] Error %s', { messageParams: [(error as Error).message] });
      }
      this.logger.log('[ServiceBusService:processMessageAdapter] messageId: %s .', { messageParams: [messageArgs.messageId] });
      this.logger.debug(`[ServiceBusService:processMessageAdapter] processing message object : %o .`, { messageParams: [handleMessageArgs] });
      return handleMessage
        .call(ctx, handleMessageArgs)
        .then(() => {
          this.logger.log('[ServiceBusService:processMessageAdapter] message completed: %s .', { messageParams: [messageArgs.body] });
          this.subscriptionsCache.find((subEntry) => subEntry.args.topicName === ctx.topicName)?.receiver.completeMessage(messageArgs);
        })
        .catch((error) => {
          this.logger.error('[ServiceBusService:processMessageAdapter] Error %s, message abandon', { messageParams: [(error as Error).message] });
          this.subscriptionsCache.find((subEntry) => subEntry.args.topicName === ctx.topicName)?.receiver.abandonMessage(messageArgs);
        });

    };
  }

  /**
   * @description on listen to topic,
   * convert from  package specific error-handler signature to service-bus error-handler signature.
   */
  protected processErrorAdapter(ctx: TopicListener, handleError: TopicListener['handleError']): MessageHandlers['processError'] {
    return (errorArgs: ProcessErrorArgs): Promise<void> => {
      this.logger.error('[ServiceBusService:processErrorAdapter] Error %s', { messageParams: [errorArgs.error.message] });
      return handleError.call(ctx, pick(errorArgs, ['error', 'errorSource']));
    };
  }

  /**
   * @description on listen to topic,
   * convert from service-bus message interface to package specific message interface.
   * @returns {ServiceBusMessage}
   */
  protected covertPostMessageArgsToServiceBusMessage(payload: string, options: PostMessageOptions): ServiceBusMessage {
    return {
      body: payload,
      correlationId: options.correlationId,
      messageId: options.messageId,
      subject: options.name,
      contentType: options.contentType,
    };
  }

  /**
   * @description on post message,
   * convert from package specific message interface to service-bus message interface
   * @returns {ServiceBusMessage}
   */
  protected covertServiceBusReceivedMessageToHandleMessageArgs(message: ServiceBusReceivedMessage): HandleMessageArgs {
    return {
      body: message.body,
      messageId: message.messageId ? String(message.messageId) : undefined,
      correlationId: message.correlationId ? String(message.correlationId) : undefined,
      name: message.subject,
      contentType: message.contentType,
      status: message.applicationProperties?.status ? String(message.applicationProperties?.status) : undefined,
    };
  }

  /*
   * validate-and-throw methods for `MessageBrokerProvider` public interface :
   */

  /**
   * @throws {InvalidArgumentException} if one of the args is invalid, throws InvalidArgumentException error.
   * @returns {true} if all of the args are valid.
   */
  protected validatePostMessageArguments(topicName: string, payload: string, options: PostMessageOptions): boolean {
    if (typeof topicName !== 'string' || topicName.length == 0) {
      this.logger.error('[ServiceBusService.validatePostMessageArguments] invalid argument, topicName: %s', { messageParams: [topicName] });
      throw new InvalidArgumentException(`Method ServiceBusService.postMessageToTopic received invalid argument, topicName ${topicName}`);
    }
    if (typeof payload !== 'string' || payload.length == 0) {
      this.logger.error('[ServiceBusService.validatePostMessageArguments] invalid argument, payload: %s', { messageParams: [payload] });
      throw new InvalidArgumentException(`Method ServiceBusService.postMessageToTopic received invalid argument, payload ${payload}`);
    }
    if (options == null || typeof options !== 'object') {
      this.logger.error('[ServiceBusService.validatePostMessageArguments] invalid argument, options: %o', { messageParams: [options] });
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
      this.logger.error('[ServiceBusService.validatePostMessageOptions] invalid argument, options: %o', { messageParams: [options] });
      throw new InvalidArgumentException(`Method ServiceBusService.postMessageToTopic received invalid argument, options ${options}`);
    }
    if (typeof options.name !== 'string' || options.name.length == 0) {
      this.logger.error('[ServiceBusService.validatePostMessageOptions] invalid options field, name: %s', { messageParams: [options.name] });
      throw new InvalidArgumentException(`Method ServiceBusService.postMessageToTopic received invalid options field, name ${options.name}`);
    }
    if (typeof options.correlationId !== 'string' || options.correlationId.length == 0) {
      this.logger.error('[ServiceBusService.validatePostMessageOptions] invalid options field, correlationId: %s', { messageParams: [options.correlationId] });
      throw new InvalidArgumentException(`Method ServiceBusService.postMessageToTopic received invalid options field, correlationId ${options.correlationId}`);
    }
    if (typeof options.messageId !== 'string' || options.messageId.length == 0) {
      this.logger.error('[ServiceBusService.validatePostMessageOptions] invalid options field, messageId: %s', { messageParams: [options.messageId] });
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
      this.logger.error('[ServiceBusService.validateListenToTopicArguments] invalid argument, listener: %o', { messageParams: [listener] });
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
      this.logger.error('[ServiceBusService.validateTopicListener] invalid argument, listener: %o', { messageParams: [listener] });
      throw new InvalidArgumentException(`Method ServiceBusService.listenToTopic received invalid argument, listener ${listener}`);
    }
    if (typeof listener.topicName !== 'string' || listener.topicName.length == 0) {
      this.logger.error('[ServiceBusService.validateTopicListener] invalid listener field, topicName: %s', { messageParams: [listener.topicName] });
      throw new InvalidArgumentException(`Method ServiceBusService.listenToTopic received invalid listener field, topicName ${listener.topicName}`);
    }
    if (typeof listener.subscriptionName !== 'string' || listener.subscriptionName.length == 0) {
      this.logger.error('[ServiceBusService.validateTopicListener] invalid listener field, subscriptionName: %s', { messageParams: [listener.topicName] });
      throw new InvalidArgumentException(`Method ServiceBusService.listenToTopic received invalid listener field, subscriptionName ${listener.subscriptionName}`);
    }
    if (typeof listener.handleMessage !== 'function') {
      this.logger.error('[ServiceBusService.validateTopicListener] invalid listener field, handleMessage.');
      throw new InvalidArgumentException(`Method ServiceBusService.listenToTopic received invalid listener field, handleMessage.`);
    }
    if (typeof listener.handleError !== 'function') {
      this.logger.error('[ServiceBusService.validateTopicListener] invalid listener field, handleError.');
      throw new InvalidArgumentException(`Method ServiceBusService.listenToTopic received invalid listener field, handleError.`);
    }
    return true;
  }

  isTopicListenerConnected(topicListener: TopicListener): boolean {
    this.logger.log('[ServiceBusService:isTopicListenerConnected] Checking connection to topic: %s, subscription: %s', {
      messageParams: [topicListener.topicName, topicListener.subscriptionName],
    });
    const subEntry = this.subscriptionsCache.find(
      (subEntry) => subEntry.args.topicName === topicListener.topicName && subEntry.args.subscriptionName === topicListener.subscriptionName,
    );
    const result = subEntry?.receiver.isClosed ?? true;
    return !result;
  }
}
