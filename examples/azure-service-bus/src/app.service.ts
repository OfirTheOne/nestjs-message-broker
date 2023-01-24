import { MessageBrokerService, MessagePublisherProvider } from '@nestjs-ext/message-broker';
import { Inject, Injectable } from '@nestjs/common';
import { MESSAGE_BROKER_FAKE_02_TOPIC_WRITE } from './constants/constants';

@Injectable()
export class AppService {
  constructor(
    @Inject(MESSAGE_BROKER_FAKE_02_TOPIC_WRITE) private writeMessageService: MessagePublisherProvider
  ) {}
  getHello(): string {
    return 'Hello World!';
  }
}
