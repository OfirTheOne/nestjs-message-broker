import { DynamicModule, Module, Provider, Scope, Type } from '@nestjs/common';
import { MessageBrokerService } from '../core/message-broker.service';
import {
  MessageBrokerCoreModuleSingleConfig,
  MessageBrokerModuleMultipleConfig,
  MessageBrokerModuleConfigCore
} from '../models/message-broker-module-config.interface';
import { constants } from '../constants';
/**
 * to change strategy change the value of `Strategy` to other provider class.
 */
import { MessageBrokerProvider } from '../models/message-broker-provider.interface';

const toConfigToken = (token: string): string => `${token}_config`;

function isMessageBrokerModuleMultipleConfig(o: unknown): o is MessageBrokerModuleMultipleConfig {
  return typeof o == 'object' && Object.getOwnPropertyNames(o).includes('providers');
}

@Module({ })
export class MessageBrokerConnectionModule {

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
  static forRoot( 
    config: MessageBrokerCoreModuleSingleConfig | MessageBrokerModuleMultipleConfig
  ): DynamicModule {
    if (isMessageBrokerModuleMultipleConfig(config)) {
      return MessageBrokerConnectionModule.forMultipleConnection(config);
    } else {
      return MessageBrokerConnectionModule.forSingleConnection(config);
    }
  }

  private static forSingleConnection(
    config: MessageBrokerCoreModuleSingleConfig
  ): DynamicModule {
    return {
      imports: config.imports ? [...config.imports] : [],
      providers: [
        MessageBrokerService,
        {
          provide: constants.MESSAGE_BROKER_PROVIDER,
          useClass: config.strategy
        },
        {
          provide: constants.MESSAGE_BROKER_CONFIG,
          useFactory: config.configFactory,
          inject: config.inject,
        }
      ],
      exports: [MessageBrokerService],
      module: MessageBrokerConnectionModule,
    };
  }

  private static forMultipleConnection(
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
      useFactory: (connectionConfig: MessageBrokerModuleConfigCore): MessageBrokerService =>
        new MessageBrokerService(new (config.strategy)(connectionConfig, console)),
      inject: [toConfigToken(provider.token), ...(provider.inject || [])]
    }));

    const exportedTokens = config.providers.map(provider => provider.token);

    return {
      imports: config.imports ? [...config.imports] : [],
      providers: [...providersConfig, ...providersFactory],
      exports: [...exportedTokens],
      module: MessageBrokerConnectionModule
    };
  }
}
