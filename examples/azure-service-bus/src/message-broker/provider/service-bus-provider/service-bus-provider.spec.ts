
const closeCb = jest.fn();
const receiver: Partial<ServiceBusReceiver> = { 
  subscribe: jest.fn().mockReturnValue({ close: closeCb.mockImplementation(() => receiver.isClosed = true) }),
  isClosed: false
};
const sender = { sendMessages: jest.fn(), close: jest.fn() };
const createReceiverMock = jest.fn().mockReturnValue(receiver);
const createSenderMock = jest.fn().mockReturnValue(sender);

jest.mock('@azure/service-bus', () => {
  const actualServiceBus = jest.requireActual('@azure/service-bus');
  return {
    ...actualServiceBus,
    ServiceBusClient: class {
      createReceiver = createReceiverMock;
      createSender = createSenderMock;
    }
  };
});

import { PostMessageOptions } from '../../../../../lib/message-broker/src/models/message-broker-provider.interface';
import { Logger } from '@fpsp/logger';
import { ListenToTopicOptions } from '../../../../../lib/message-broker/src/models/message-broker-provider.interface';
import { TopicListener } from '../../../../../lib/message-broker/src/models/topic-listener.interface';
import { MessageBrokerModuleConfigCore } from '../../../../../lib/message-broker/src/models/message-broker-module-config.interface';
import { ServiceBusService } from './service-bus-provider';
import { InvalidArgumentException } from '../../../../../lib/message-broker/src/errors/invalid-arguments-exception';
import { CorrelationService } from '@fpsp/http-plugins';
import { C3Context, DataContextService } from '@fpsp/context';
import { ServiceBusReceiver } from '@azure/service-bus';
import { ApplicationInsightsService } from '@fpsp/application-insights';

describe('ServiceBusService', () => {
  let serviceBusService: ServiceBusService;
  const serviceConfig: MessageBrokerModuleConfigCore = { connectionString: 'sb://connection-string' };
  const loggerMock: Partial<Logger> = {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    trace: jest.fn(),
    warn: jest.fn(),
  };
  const c3Context: Partial<C3Context> = { c3TraceId: '111', fnTraceId: '222' };
  const dataCtxServiceMock: Partial<DataContextService> = {
    generateContext: jest.fn(),
    getContext: jest.fn().mockReturnValue(c3Context),
    updateCorrelationId: jest.fn()
  };
  const correlationServiceMock: Partial<CorrelationService> = {
    generateCorrelationId: jest.fn(),
    setHttpCorrelationHeaders: jest.fn()
  };
  const applicationInsightMock: Partial<ApplicationInsightsService> = {
    trackMetric: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    serviceBusService = new ServiceBusService(
      serviceConfig,
      loggerMock as Logger,
      dataCtxServiceMock as DataContextService,
      correlationServiceMock as CorrelationService,
      applicationInsightMock as ApplicationInsightsService
    );
  });

  it('should call listenToTopic and invoke subscribe as expected.', async () => {
    const listener: TopicListener = {
      topicName: 'topic-2',
      subscriptionName: 'sub-1',
      handleMessage: async (): Promise<void> => { },
      handleError: async (): Promise<void> => { },
    };
    const options: ListenToTopicOptions = {};
    const { close } = serviceBusService.listenToTopic(listener, options);

    expect(createReceiverMock).toHaveBeenCalledTimes(1);
    expect(createReceiverMock).toBeCalledWith(listener.topicName, listener.subscriptionName, {});
    expect(receiver.subscribe).toHaveBeenCalledTimes(1);
    expect(close).toEqual(closeCb);
  });

  it('should raise validation error from listenToTopic.', async () => {
    const listener = {
      topicName: undefined,
      subscriptionName: 'sub-1',
      handleMessage: async (): Promise<void> => { },
      handleError: async (): Promise<void> => { }
    } as unknown as TopicListener;
    const options: ListenToTopicOptions = {};
    await expect(async () => serviceBusService.listenToTopic(listener, options)).rejects.toThrowError(InvalidArgumentException);
  });

  it('should call postMessageToTopic and invoke sendMessages as expected.', async () => {
    const topicName = 'topic-1';
    correlationServiceMock.generateCorrelationId = jest.fn().mockReturnValueOnce('111').mockReturnValueOnce('222');

    const payload = JSON.stringify({ incidentId: 123 });
    const options: PostMessageOptions = {
      correlationId: 'correlation-id-123',
      messageId: 'message-id-123',
      status: '',
      name: 'incident-created',
    };
    await serviceBusService.postMessageToTopic(topicName, payload, options);
    expect(createSenderMock).toHaveBeenCalledTimes(1);
    expect(createSenderMock).toBeCalledWith(topicName);
    expect(sender.sendMessages).toHaveBeenCalledTimes(1);
    expect(sender.sendMessages).toBeCalledWith({
      body: payload,
      correlationId: options.correlationId,
      messageId: options.messageId,
      subject: options.name,
      applicationProperties: { 
        status: options.status, 
        c3TraceId: '111',
        fnTraceId: '222',
      }
    });
    expect(sender.close).toHaveBeenCalledTimes(1);

  });

  it('should raise validation error from postMessageToTopic.', async () => {
    const topicName = 'topic-1';
    const payload = JSON.stringify({ incidentId: 123 });
    const options = {
      correlationId: '',
      messageId: null,
      status: '',
      name: 'incident-created'
    } as unknown as PostMessageOptions;

    await expect(() => serviceBusService.postMessageToTopic(topicName, payload, options)).rejects.toThrowError(InvalidArgumentException);
  });

  it('Test isTopicListenerConnected', async () => {
    const listener2: TopicListener = {
      topicName: 'topic-2',
      subscriptionName: 'sub-1',
      handleMessage: async (): Promise<void> => { },
      handleError: async (): Promise<void> => { },
    };
    const listener1: TopicListener = {
      topicName: 'topic-1',
      subscriptionName: 'sub-1',
      handleMessage: async (): Promise<void> => { },
      handleError: async (): Promise<void> => { },
    };
    const options: ListenToTopicOptions = {};
    serviceBusService.listenToTopic(listener2, options);
    serviceBusService.listenToTopic(listener1, options);
    
    expect(createReceiverMock).toHaveBeenCalledTimes(2);
    expect(serviceBusService.isTopicListenerConnected(listener1),).toBeTruthy();
    expect(serviceBusService.isTopicListenerConnected(listener2),).toBeTruthy();

  });
  it('Test isTopicListenerConnected when topic connection was not exist anymore', async () => {

    const listener3: TopicListener = {
      topicName: 'topic-3',
      subscriptionName: 'sub-3',
      handleMessage: async (): Promise<void> => { },
      handleError: async (): Promise<void> => { },
    };
    expect(serviceBusService.isTopicListenerConnected(listener3),).toBeFalsy();

  });
  it('Test isTopicListenerConnected when topic connection closed', async () => {
    const listener3: TopicListener = {
      topicName: 'topic-3',
      subscriptionName: 'sub-3',
      handleMessage: async (): Promise<void> => { },
      handleError: async (): Promise<void> => { },
    };
    const options: ListenToTopicOptions = {};
    serviceBusService.listenToTopic(listener3, options).close();
    expect(serviceBusService.isTopicListenerConnected(listener3),).toBeFalsy();
  });
});
