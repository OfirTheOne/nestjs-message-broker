import "reflect-metadata";
import { Injectable, InjectableOptions } from "@nestjs/common"
import { constants_metadata } from "../constants";


export function TopicListenerInjectable(
    listenerOptions: { connectionToken: string },
    options?: InjectableOptions) : ClassDecorator {
    return function(constructor: Function) {
        Reflect.defineMetadata(
            constants_metadata.TOPIC_LISTENER_OPTIONS_METADATA_KEY, 
            listenerOptions, constructor);
        Injectable(options)(constructor);
    };
}
