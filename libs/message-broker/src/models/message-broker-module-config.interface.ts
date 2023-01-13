import { FactoryProvider, ModuleMetadata } from '@nestjs/common';

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


export interface MessageBrokerCoreModuleSingleConfig extends
    Pick<ModuleMetadata, 'imports'>,
    Pick<MessageBrokerCoreModuleConfigFactory, 'configFactory' | 'inject'> {
}


export interface MessageBrokerModuleMultipleConfig extends Pick<ModuleMetadata, 'imports'> {
    providers: Array<MessageBrokerCoreModuleConfigFactory>
}

