import { MessageBrokerModule } from '@app/message-broker';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [MessageBrokerModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
