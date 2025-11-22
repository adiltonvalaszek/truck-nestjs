import { Module, Global } from '@nestjs/common';
import { PubSubPublisherService } from './pubsub-publisher.service';

@Global()
@Module({
  providers: [PubSubPublisherService],
  exports: [PubSubPublisherService],
})
export class PubSubModule {}
