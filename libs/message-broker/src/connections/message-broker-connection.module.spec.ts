
jest.mock('./providers/service-bus-provider/service-bus-provider', () => {
  return {
    ServiceBusService: class {
      listenToTopic = jest.fn();
      postMessageToTopic = jest.fn();
      listenToQueue = jest.fn();
      postMessageToQueue = jest.fn();
    }
  };
});

const createMockFakeQueueProvider = () => class MockFakeQueueProvider implements MessageBrokerProvider {
  listenToTopic: (listener: TopicListener, options?: ListenToTopicOptions) => SubscriptionClose = jest.fn();
  listenToQueue: (queueName: string) => Promise<boolean> = jest.fn();
  isTopicListenerConnected: (topicListener: TopicListener) => boolean = jest.fn();
  postMessageToTopic: (topicName: string, payload: string, options?: PostMessageOptions) => Promise<void> = jest.fn();
  postMessageToQueue: (queueName: string, payload: string) => Promise<boolean> = jest.fn();
}

import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
// import { Levels, Logger, LoggerModule } from '@fpsp/logger';
import { MessageBrokerConnectionModule } from './message-broker-connection.module';
import { MessageBrokerService } from '../core/message-broker.service';
import {
  MessageBrokerCoreModuleSingleConfig, 
  MessageBrokerModuleConfigCore, 
  MessageBrokerModuleMultipleConfig } from '../models/message-broker-module-config.interface';
import { ListenToTopicOptions, MessageBrokerProvider, PostMessageOptions, SubscriptionClose } from '../models/message-broker-provider.interface';
import { HandleErrorArgs, HandleMessageArgs, TopicListener } from '../models/topic-listener.interface';


describe('MessageBrokerConnectionModule', () => {
  const loggerMockFactory = (): Partial<Logger> => ({
    // info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  });


  const buildTestingModule: (configFactory: MessageBrokerCoreModuleSingleConfig | MessageBrokerModuleMultipleConfig) =>
    Promise<TestingModule> = (configFactory: MessageBrokerCoreModuleSingleConfig | MessageBrokerModuleMultipleConfig) => {
      return Test.createTestingModule({
        imports: [MessageBrokerConnectionModule.forRoot(configFactory)],
        exports: [MessageBrokerConnectionModule]
      })
        .overrideProvider(Logger)
        .useValue(loggerMockFactory())
        .compile();

    };

  it('MessageBrokerService resolve expectedly.', async () => {
    const moduleRef = await buildTestingModule({
      strategy: createMockFakeQueueProvider(),
      useFactory: () => ({ connectionString: 'sb://connection-string' }),
      // imports: [LoggerModule]
    });
    const messageBrokerService = await moduleRef.resolve<MessageBrokerService>(MessageBrokerService);
    expect(messageBrokerService).toBeDefined();
    expect(messageBrokerService).toBeInstanceOf(MessageBrokerService);
  });

  it('single MessageBrokerService instance resolved using serviceInjectToken as expected.', async () => {
    const serviceToken = 'writeMessageBroker';
    const moduleRef = await buildTestingModule({
      strategy: createMockFakeQueueProvider(),
      providers: [{
        provide: serviceToken,
        useFactory: (): MessageBrokerModuleConfigCore => ({ connectionString: 'sb://connection-string' })
      }],
      // imports: [LoggerModule.forRoot({ useFactory: () => ({ logLevel: Levels.debug }) })]
    });
    const messageBrokerService = await moduleRef.resolve<MessageBrokerService>(serviceToken);
    expect(messageBrokerService).toBeDefined();
    expect(messageBrokerService).toBeInstanceOf(MessageBrokerService);
  });

  it('multiple MessageBrokerService instances resolved using serviceInjectToken as expected.', async () => {
    const writeServiceToken = 'writeMessageBroker';
    const readServiceToken = 'readMessageBroker';
    const moduleRef = await buildTestingModule({
      strategy: createMockFakeQueueProvider(),
      providers: [{
        provide: writeServiceToken,
        useFactory: (): MessageBrokerModuleConfigCore => ({ connectionString: 'sb://write-connection-string' })
      }, {
        provide: readServiceToken,
        useFactory: (): MessageBrokerModuleConfigCore => ({ connectionString: 'sb://read-connection-string' })
      }],
      // imports: [LoggerModule.forRoot({ useFactory: () => ({ logLevel: Levels.debug }) })]
    });
    const writeMessageBrokerService = await moduleRef.resolve<MessageBrokerService>(writeServiceToken); // <-- resolved using token a
    expect(writeMessageBrokerService).toBeDefined();
    expect(writeMessageBrokerService).toBeInstanceOf(MessageBrokerService);
    const readMessageBrokerService = await moduleRef.resolve<MessageBrokerService>(readServiceToken); // <-- resolved using token b
    expect(readMessageBrokerService).toBeDefined();
    expect(readMessageBrokerService).toBeInstanceOf(MessageBrokerService);
    expect(writeMessageBrokerService).not.toBe(readMessageBrokerService); // <-- difference instances
  });
});
