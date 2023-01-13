import { DynamicModule, Inject, Module, ModuleMetadata, OnApplicationBootstrap, Type } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { MessageBrokerService } from '../../message-broker.service';
import { TopicListener } from '@app/message-broker/models/topic-listener.interface';

const LISTERS_TOKEN = 'LISTERS_TOKEN';

type Listeners = { topicListener: Type, mbServiceToken: string }[];

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
        ...(metadata.providers || []),
        {
          provide: LISTERS_TOKEN,
          useValue: metadata.listeners
        }
      ],

    }
  }

  constructor(
    protected readonly moduleRef: ModuleRef,
    @Inject(LISTERS_TOKEN) protected readonly listeners: Listeners
  ) {
  }

  async onApplicationBootstrap(): Promise<void> {
    for (let listener of this.listeners) {
      await this.listen(listener.topicListener, listener.mbServiceToken);
    }
  }

  private async listen(topicListener: Type, messageBrokerServiceToken: string) {
    const topicListenerService = await this.moduleRef.resolve<TopicListener>(topicListener, undefined, { strict: false });
    if (topicListenerService.shouldListen()) {
      const msgBrokerMatadorService = await this.moduleRef.resolve<MessageBrokerService>(messageBrokerServiceToken, undefined, { strict: false });
      msgBrokerMatadorService.listenToTopic(topicListenerService);
    }
  }
}
