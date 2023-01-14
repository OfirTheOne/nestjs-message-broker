import { DynamicModule, Inject, Module, ModuleMetadata, OnApplicationBootstrap, Type } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { MessageBrokerService } from '../../core/message-broker.service';
import { TopicListener } from '../../models/topic-listener.interface';
import { constants } from './../../constants';

type Listeners = { topicListener: Type<TopicListener>, mbServiceToken: string }[];

@Module({
  imports: [],
  providers: [],
})
export class MessageBrokerListenersModule implements OnApplicationBootstrap {

  static forRoot(metadata: ModuleMetadata & { listeners: { topicListener: Type, mbServiceToken: string }[] }): DynamicModule {
    return {
      module: MessageBrokerListenersModule,
      imports: metadata.imports,
      providers: [
        ...(metadata.providers || []), ...metadata.listeners.map(l => l.topicListener),
        {
          provide: constants.LISTERS_TOKEN,
          useValue: metadata.listeners
        }
      ],
    }
  }

  constructor(
    protected readonly moduleRef: ModuleRef,
    @Inject(constants.LISTERS_TOKEN) protected readonly listeners: Listeners
  ) { }

  async onApplicationBootstrap(): Promise<void> {
    for (let listener of this.listeners) {
      await this.listen(listener.topicListener, listener.mbServiceToken);
    }
  }

  private async listen(topicListener: Type<TopicListener>, messageBrokerServiceToken: string) {
    const topicListenerService = await this.moduleRef.resolve<TopicListener>(topicListener, undefined, { strict: false });
    if (topicListenerService.shouldListen()) {
      const msgBrokerMatadorService = await this.moduleRef.resolve<MessageBrokerService>(messageBrokerServiceToken, undefined, { strict: false });
      msgBrokerMatadorService.listenToTopic(topicListenerService);
    }
  }
}
