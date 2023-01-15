import { FactoryProvider, ModuleMetadata, Type } from '@nestjs/common';
import { MessageBrokerProvider } from './message-broker-provider.interface';

export interface MessageBrokerModuleConfigCore {
    connectionString: string;
}

export interface MessageBrokerCoreModuleConfigFactory {
    /**
     * to assign the MessageBrokerService a specific inject-token, 
     * with that supporting multi instances of the service.
     */
    token: string,
    configFactory: FactoryProvider<MessageBrokerModuleConfigCore>['useFactory'],
    inject?: FactoryProvider<unknown>['inject'],
}


interface MessageBrokerStrategyConfig {
    strategy: Type<MessageBrokerProvider>
}

export interface MessageBrokerCoreModuleSingleConfig extends
    Pick<ModuleMetadata, 'imports'>,
    MessageBrokerStrategyConfig,
    Pick<MessageBrokerCoreModuleConfigFactory, 'configFactory' | 'inject'> { }


export interface MessageBrokerModuleMultipleConfig extends 
    Pick<ModuleMetadata, 'imports'>,
    MessageBrokerStrategyConfig {
        providers: Array<MessageBrokerCoreModuleConfigFactory>;
}

