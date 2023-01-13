
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

import { Test, TestingModule } from '@nestjs/testing';
import { Levels, Logger, LoggerModule } from '@fpsp/logger';
import { MessageBrokerModule } from './message-broker.module';
import { MessageBrokerService } from './message-broker.service';
import {
  MessageBrokerCoreModuleSingleConfig, 
  MessageBrokerModuleConfigCore, 
  MessageBrokerModuleMultipleConfig } from './models/message-broker-module-config.interface';


describe('MessageBrokerModule', () => {
  const loggerMockFactory = (): Partial<Logger> => ({
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  });


  const buildTestingModule: (configFactory: MessageBrokerCoreModuleSingleConfig | MessageBrokerModuleMultipleConfig) =>
    Promise<TestingModule> = (configFactory: MessageBrokerCoreModuleSingleConfig | MessageBrokerModuleMultipleConfig) => {
      return Test.createTestingModule({
        imports: [MessageBrokerModule.forRoot(configFactory)],
        exports: [MessageBrokerModule]
      })
        .overrideProvider(Logger)
        .useValue(loggerMockFactory())
        .compile();

    };

  it('MessageBrokerService resolve expectedly.', async () => {
    const moduleRef = await buildTestingModule({
      configFactory: () => ({ connectionString: 'sb://connection-string' }),
      imports: [LoggerModule.forRoot({ useFactory: () => ({ logLevel: Levels.debug }) })]
    });
    const messageBrokerService = await moduleRef.resolve<MessageBrokerService>(MessageBrokerService);
    expect(messageBrokerService).toBeDefined();
    expect(messageBrokerService).toBeInstanceOf(MessageBrokerService);
  });

  it('single MessageBrokerService instance resolved using serviceInjectToken as expected.', async () => {
    const serviceToken = 'writeMessageBroker';
    const moduleRef = await buildTestingModule({
      providers: [{
        token: serviceToken,
        configFactory: (): MessageBrokerModuleConfigCore => ({ connectionString: 'sb://connection-string' })
      }],
      imports: [LoggerModule.forRoot({ useFactory: () => ({ logLevel: Levels.debug }) })]
    });
    const messageBrokerService = await moduleRef.resolve<MessageBrokerService>(serviceToken);
    expect(messageBrokerService).toBeDefined();
    expect(messageBrokerService).toBeInstanceOf(MessageBrokerService);
  });

  it('multiple MessageBrokerService instances resolved using serviceInjectToken as expected.', async () => {
    const writeServiceToken = 'writeMessageBroker';
    const readServiceToken = 'readMessageBroker';
    const moduleRef = await buildTestingModule({
      providers: [{
        token: writeServiceToken,
        configFactory: (): MessageBrokerModuleConfigCore => ({ connectionString: 'sb://write-connection-string' })
      }, {
        token: readServiceToken,
        configFactory: (): MessageBrokerModuleConfigCore => ({ connectionString: 'sb://read-connection-string' })
      }],
      imports: [LoggerModule.forRoot({ useFactory: () => ({ logLevel: Levels.debug }) })]
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
