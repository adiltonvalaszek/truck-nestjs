import { Module } from '@nestjs/common';
import { PubSubModule } from './pubsub/pubsub.module';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [PubSubModule, DatabaseModule],
})
export class AppModule {}
