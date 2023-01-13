import { Module } from '@nestjs/common';
import { MessageBrokerModule, MessageBrokerModuleConfigCore, MessageBrokerService } from '@app/message-broker';
import { MessageBrokerListenersModule } from '@app/message-broker/consumers/listeners/message-broker-listeners.module';
import { MessageBrokerLyftTopicListener } from './listeners/message-broker-lyft-topic-listener';
import { ServiceBusService } from './providers/service-bus-provider/service-bus-provider';

const MESSAGE_BROKER_LYFT_TOPIC_READ = 'MESSAGE_BROKER_LYFT_TOPIC_READ_TOKEN';

@Module({
    imports: [
        MessageBrokerModule.forRoot(
            ServiceBusService,
            {
                providers: [
                    {
                        configFactory: (): MessageBrokerModuleConfigCore => ({
                            connectionString: 'SERVICEBUS_SUB_CONNECTION_LYFT',
                        }),
                        inject: [],
                        token: MESSAGE_BROKER_LYFT_TOPIC_READ,
                    },
                ]
            },
        ),
        MessageBrokerListenersModule.forRoot({
            listeners: [
                {
                    topicListener: MessageBrokerLyftTopicListener,
                    mbServiceToken: MESSAGE_BROKER_LYFT_TOPIC_READ
                }
            ]
        })   
    ],
    exports: [MessageBrokerService],
})
export class AppMessageBrokerModule { }
