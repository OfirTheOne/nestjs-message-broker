import { Module } from '@nestjs/common';
import { MessageBrokerModule, MessageBrokerModuleConfigCore, MessageBrokerService } from '@app/message-broker';
import { MessageBrokerListenersModule } from '@app/message-broker/consumers/listeners/message-broker-listeners.module';
import { MessageBrokerFakeTopicListener } from './listeners/message-broker-fake-topic-listener';
import { FakeQueueService } from './providers/fake-queue-provider/fake-queue.provider';
import { ConfigService } from '@nestjs/config';

const MESSAGE_BROKER_FAKE_TOPIC_READ = 'MESSAGE_BROKER_FAKE_TOPIC_READ_TOKEN';

@Module({
    imports: [
        MessageBrokerModule.forRoot(
            FakeQueueService,
            {
                providers: [
                    {
                        configFactory: (config: ConfigService): MessageBrokerModuleConfigCore => ({
                            connectionString: config.get('SERVICEBUS_SUB_CONNECTION_FAKE'),
                        }),
                        inject: [ConfigService],
                        token: MESSAGE_BROKER_FAKE_TOPIC_READ,
                    },
                ]
            },
        ),
        MessageBrokerListenersModule.forRoot({
            providers: [ConfigService],
            listeners: [
                {
                    topicListener: MessageBrokerFakeTopicListener,
                    mbServiceToken: MESSAGE_BROKER_FAKE_TOPIC_READ
                }
            ]
        })   
    ],
    // providers: [MessageBrokerService],
    // exports: [MessageBrokerService],
})
export class AppMessageBrokerModule { }
