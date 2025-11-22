import { Module } from '@nestjs/common';
import { PubSubConsumerService } from './pubsub-consumer.service';

@Module({
  providers: [PubSubConsumerService],
  exports: [PubSubConsumerService],
})
export class PubSubModule {}
