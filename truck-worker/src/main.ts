import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PubSubConsumerService } from './pubsub/pubsub-consumer.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const consumer = app.get(PubSubConsumerService);
  await consumer.start();

  console.log('🔄 Truck Worker started successfully');
  console.log('📡 Listening for Pub/Sub events...');
}

bootstrap();
