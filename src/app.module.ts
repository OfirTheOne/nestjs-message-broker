import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppMessageBrokerModule } from './message-broker/message-broker.module';

import * as path from 'path';

const envFilePath = path.join('./config', `${process.env.ENV || 'default'}.cfg`);

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: envFilePath
    }),
    AppMessageBrokerModule
  ],
  exports: [
    ConfigModule,
    AppMessageBrokerModule,
  ]
})
export class SharedModule {}


@Module({
  imports: [SharedModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
