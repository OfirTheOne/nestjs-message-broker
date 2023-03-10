import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MessageBrokerConnectionModule, MessageBrokerModuleConfigCore } from '@nestjs-ext/message-broker';
import { MessageBrokerListenersModule } from '@nestjs-ext/message-broker';
import { MessageBrokerFakeTopicListener } from './listeners/message-broker-fake-topic-listener';
import {
    MESSAGE_BROKER_FAKE_01_TOPIC_READ,
    MESSAGE_BROKER_FAKE_02_TOPIC_WRITE
} from '../constants/constants';
import { ServiceBusService } from './provider/service-bus-provider/service-bus-provider';

@Module({
    imports: [
        MessageBrokerConnectionModule.forRoot({
            strategy: ServiceBusService,
            providers: [
                {
                    useFactory: (config: ConfigService): MessageBrokerModuleConfigCore => ({
                        connectionString: config.get('SERVICEBUS_SUB_CONNECTION_FAKE_01'),
                    }),
                    inject: [ConfigService],
                    provide: MESSAGE_BROKER_FAKE_01_TOPIC_READ,
                },
                {
                    useFactory: (config: ConfigService): MessageBrokerModuleConfigCore => ({
                        connectionString: config.get('SERVICEBUS_PUB_CONNECTION_FAKE_02'),
                    }),
                    inject: [ConfigService],
                    provide: MESSAGE_BROKER_FAKE_02_TOPIC_WRITE,
                },
            ]
        }),
        MessageBrokerListenersModule.forRoot({
            providers: [ConfigService],
            listeners: [
                MessageBrokerFakeTopicListener,
                // more listeners here ... 
            ]
        })
    ],
    exports: [MessageBrokerConnectionModule],
})
export class AppMessageBrokerModule { }
