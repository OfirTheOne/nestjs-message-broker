import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MessageBrokerModule, MessageBrokerModuleConfigCore, MessageBrokerService } from '@app/message-broker';
import { MessageBrokerListenersModule } from '@app/message-broker/consumers/listeners/message-broker-listeners.module';
import { MessageBrokerFakeTopicListener } from './listeners/message-broker-fake-topic-listener';
import { FakeQueueService } from './providers/fake-queue-provider/fake-queue.provider';
import { 
    MESSAGE_BROKER_FAKE_01_TOPIC_READ, 
    MESSAGE_BROKER_FAKE_02_TOPIC_WRITE 
} from '../constants/constants';


@Module({
    imports: [
        MessageBrokerModule.forRoot(
            FakeQueueService,
            {
                providers: [
                    {
                        configFactory: (config: ConfigService): MessageBrokerModuleConfigCore => ({
                            connectionString: config.get('SERVICEBUS_SUB_CONNECTION_FAKE_01'),
                        }),
                        inject: [ConfigService],
                        token: MESSAGE_BROKER_FAKE_01_TOPIC_READ,
                    },
                    {
                        configFactory: (config: ConfigService): MessageBrokerModuleConfigCore => ({
                            connectionString: config.get('SERVICEBUS_PUB_CONNECTION_FAKE_02'),
                        }),
                        inject: [ConfigService],
                        token: MESSAGE_BROKER_FAKE_02_TOPIC_WRITE,
                    },
                ]
            },
        ),
        MessageBrokerListenersModule.forRoot({
            providers: [ConfigService],
            listeners: [
                {
                    topicListener: MessageBrokerFakeTopicListener,
                    mbServiceToken: MESSAGE_BROKER_FAKE_01_TOPIC_READ
                }
            ]
        })   
    ],
    exports: [MessageBrokerModule],
})
export class AppMessageBrokerModule { }