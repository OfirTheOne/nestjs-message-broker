import { FactoryProvider, ModuleMetadata, Type } from '@nestjs/common';
import { MessageBrokerProvider } from './message-broker-provider.interface';

export interface MessageBrokerModuleConfigCore {
    connectionString: string;
}

export interface MessageBrokerCoreModuleConfigFactory extends 
Pick<FactoryProvider<MessageBrokerModuleConfigCore>, 'inject' | 'provide' | 'useFactory'>{
    /**
     * to assign the MessageBrokerService a specific inject-token, 
     * with that supporting multi instances of the service.
     */
}


interface MessageBrokerStrategyConfig {
    strategy: Type<MessageBrokerProvider>
}

export interface MessageBrokerCoreModuleSingleConfig extends
    Pick<ModuleMetadata, 'imports'>,
    MessageBrokerStrategyConfig,
    Pick<MessageBrokerCoreModuleConfigFactory, 'useFactory' | 'inject'> { }


export interface MessageBrokerModuleMultipleConfig extends 
    Pick<ModuleMetadata, 'imports'>,
    MessageBrokerStrategyConfig {
        providers: Array<MessageBrokerCoreModuleConfigFactory>;
}

