import 'reflect-metadata';
import { DynamicModule, Inject, Module, ModuleMetadata, OnApplicationBootstrap, Type } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { MessageBrokerService } from '../../core/message-broker.service';
import { TopicListener } from '../../models/topic-listener.interface';
import { constants } from './../../constants';

interface ListenerOptions {
  connectionToken: string;
}

type Listener = Type<TopicListener>;

interface ListenerConfig extends ListenerOptions { 
  listenerClass: Listener, 
} 

@Module({
  imports: [],
  providers: [],
})
export class MessageBrokerListenersModule implements OnApplicationBootstrap {

  static forRoot(metadata: ModuleMetadata & { listeners: Array<(ListenerConfig | Listener)> }): DynamicModule {
    return {
      module: MessageBrokerListenersModule,
      imports: metadata.imports,
      providers: [
        ...(metadata.providers || []), 
        ...metadata.listeners.map(l => this.listenerToClassOptions(l).listenerClass),
        {
          provide: constants.LISTERS_TOKEN,
          useValue: metadata.listeners
        }
      ],
    }
  }

  constructor(
    protected readonly moduleRef: ModuleRef,
    @Inject(constants.LISTERS_TOKEN) protected readonly listeners: Array<(ListenerConfig | Listener)>
  ) { }

  async onApplicationBootstrap(): Promise<void> {
    for (let listener of this.listeners) {
      const l = MessageBrokerListenersModule.listenerToClassOptions(listener)
      await this.listen(l.listenerClass, l.connectionToken);
    }
  }

  private async listen(topicListener: Type<TopicListener>, messageBrokerServiceToken: string) {
    const topicListenerService = await this.moduleRef.resolve<TopicListener>(topicListener, undefined, { strict: false });
    if (topicListenerService.shouldListen()) {
      const msgBrokerMatadorService = await this.moduleRef
        .resolve<MessageBrokerService>(messageBrokerServiceToken, undefined, { strict: false });
      msgBrokerMatadorService.listenToTopic(topicListenerService);
    }
  }

  private static listenerToClassOptions(listener: (ListenerConfig | Listener)) {
    if('prototype' in listener) {
      const options = Reflect.getMetadata('topic-listener-options', listener) as { connectionToken: string };
      if(!options || !options.connectionToken) {
        throw new Error('lister provider registered without connectionToke.');
      }
      return {
        connectionToken: options.connectionToken,
        listenerClass: listener
      }
    } else {
      return listener;
    }
  } 
}
