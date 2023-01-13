import { DynamicModule, Module, Provider, Scope, Type } from '@nestjs/common';
import { MessageBrokerService } from './message-broker.service';
import {
  MessageBrokerCoreModuleSingleConfig,
  MessageBrokerModuleMultipleConfig,
  MessageBrokerModuleConfigCore
} from './models/message-broker-module-config.interface';
import { constants } from './constants';
/**
 * to change strategy change the value of `Strategy` to other provider class.
 */
import { MessageBrokerProvider } from './models/message-broker-provider.interface';

const toConfigToken = (token: string): string => `${token}_config`;

function isMessageBrokerModuleMultipleConfig(o: unknown): o is MessageBrokerModuleMultipleConfig {
  return typeof o == 'object' && Object.getOwnPropertyNames(o).includes('providers');
}

@Module({
})
export class MessageBrokerModule {

  /**
   * @description
   * 
   * This method can be used in two ways, one for single connection the other for multiple.
   * when using a single connection, pass a config with type `MessageBrokerCoreModuleSingleConfig`,
   * this will export a single service instance (of type `MessageBrokerService`), it will be injected in the standard way;
   * ```ts
   *  constructor(service: MessageBrokerService) { }
   * ```
   * 
   * when using multiple connections, pass a config with type `MessageBrokerModuleMultipleConfig`,
   * this will export multiple services (of type `MessageBrokerService`), one for each token provided in the`provides` 
   * array, those services will be injected in the following way;
   * ```ts
   *  constructor(@Inject('write-token') writeService: MessageBrokerService) { }
   * ```
   * 
   * @param config for this module. 
   */
  static forRoot(messageBrokerProvider: Type<MessageBrokerProvider>, config: MessageBrokerCoreModuleSingleConfig | MessageBrokerModuleMultipleConfig): DynamicModule {
    if (isMessageBrokerModuleMultipleConfig(config)) {
      return MessageBrokerModule.forMultipleConnection(messageBrokerProvider, config);
    } else {
      return MessageBrokerModule.forSingleConnection(messageBrokerProvider, config);
    }
  }

  private static forSingleConnection(
    messageBrokerProvider: Type<MessageBrokerProvider>, 
    config: MessageBrokerCoreModuleSingleConfig
  ): DynamicModule {
    return {
      imports: config.imports ? [...config.imports] : [],
      providers: [
        MessageBrokerService,
        {
          provide: constants.MESSAGE_BROKER_PROVIDER,
          useClass: messageBrokerProvider
        },
        {
          provide: constants.MESSAGE_BROKER_CONFIG,
          useFactory: config.configFactory,
          inject: config.inject,
        }
      ],
      exports: [MessageBrokerService],
      module: MessageBrokerModule,
    };
  }

  private static forMultipleConnection(
    messageBrokerProvider: Type<MessageBrokerProvider>, 
    config: MessageBrokerModuleMultipleConfig
  ): DynamicModule {
    const providersConfig: Array<Provider> = config.providers.map(provider => ({
      provide: toConfigToken(provider.token),
      useFactory: provider.configFactory,
      inject: provider.inject,
    }));

    const providersFactory = config.providers.map(provider => ({
      provide: provider.token,
      scope: Scope.TRANSIENT,
      useFactory: (config: MessageBrokerModuleConfigCore): MessageBrokerService =>
        new MessageBrokerService(new messageBrokerProvider(config, console)),
      inject: [toConfigToken(provider.token)]
    }));

    const exportedTokens = config.providers.map(provider => provider.token);

    return {
      imports: config.imports ? [...config.imports] : [],
      providers: [...providersConfig, ...providersFactory],
      exports: [...exportedTokens],
      module: MessageBrokerModule
    };
  }
}
