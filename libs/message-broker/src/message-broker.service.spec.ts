import { MessageBrokerService } from './message-broker.service';
import { MessageBrokerProvider } from './models/message-broker-provider.interface';


describe('MessageBrokerService // partial', () => {

  let service: MessageBrokerService;
  const mockMbProvider: Partial<MessageBrokerProvider> = {
    postMessageToTopic: jest.fn(),
    listenToTopic: jest.fn(),
    listenToQueue: jest.fn(),
    postMessageToQueue: jest.fn(),
  };
  beforeEach(() => {
    service = new MessageBrokerService(mockMbProvider as MessageBrokerProvider);
  });
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('each public method should execute the provider method.', async () => {
    const actualArgs = { queueName: 'someQueueName' };
    service.listenToQueue(actualArgs.queueName);
    expect(mockMbProvider.listenToQueue).toBeCalledTimes(1);
    expect(mockMbProvider.listenToQueue).toBeCalledWith(actualArgs.queueName);
  });
}); 
