import "reflect-metadata";
import { Injectable, InjectableOptions } from "@nestjs/common"


export function TopicListenerInjectable(
    listenerOptions: { connectionToken: string },
    options?: InjectableOptions) : ClassDecorator {
    return function(constructor: Function) {
        Reflect.defineMetadata('topic-listener-options', listenerOptions, constructor);
        Injectable(options)(constructor);
    };
}
