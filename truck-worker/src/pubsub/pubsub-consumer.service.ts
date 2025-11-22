import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PubSub } from '@google-cloud/pubsub';
import { MongoDBService } from '../database/mongodb.service';

@Injectable()
export class PubSubConsumerService implements OnModuleInit {
  private readonly logger = new Logger(PubSubConsumerService.name);
  private pubsub: PubSub;
  private subscription: any;

  constructor(private mongodbService: MongoDBService) {}

  onModuleInit() {
    this.pubsub = new PubSub({
      projectId: process.env.PUBSUB_PROJECT_ID || 'truck-nestjs',
      apiEndpoint: process.env.PUBSUB_EMULATOR_HOST,
    });

    this.subscription = this.pubsub.subscription(
      process.env.PUBSUB_SUBSCRIPTION || 'load.assigned-sub',
    );

    this.logger.log('✅ Pub/Sub Consumer initialized');
  }

  async start() {
    this.logger.log('📡 Listening for Pub/Sub events...');

    try {
      // Check if the subscription exists
      const [exists] = await this.subscription.exists();
      if (!exists) {
        this.logger.error('❌ Subscription does not exist, trying to create topic and subscription...');
        
        // Try to create the topic and subscription
        const subscriptionName = process.env.PUBSUB_SUBSCRIPTION || 'load.assigned-sub';
        const topicName = subscriptionName.replace('-sub', '');
        
        try {
          // First, ensure the topic exists
          const topic = this.pubsub.topic(topicName);
          const [topicExists] = await topic.exists();
          
          if (!topicExists) {
            await topic.create();
            this.logger.log(`✅ Topic '${topicName}' created successfully`);
          }
          
          // Now create the subscription
          await topic.createSubscription(subscriptionName);
          this.logger.log(`✅ Subscription '${subscriptionName}' created successfully`);
        } catch (createError) {
          this.logger.error('❌ Failed to create topic/subscription:', createError);
          return;
        }
      }

      this.subscription.on('message', async (message: any) => {
        try {
          const data = JSON.parse(message.data.toString());
          this.logger.log('📨 Received message:', JSON.stringify(data, null, 2));

          await this.mongodbService.recordAuditEvent({
            driverId: data.data?.driverId,
            loadId: data.data?.loadId,
            type: data.type || 'LOAD_ASSIGNED',
            payload: data.data,
          });

          this.logger.log(`📧 [SIMULATED] Notification sent to driver`);
          this.logger.log(`   Assignment ID: ${data.data?.assignmentId}`);

          message.ack();
          this.logger.log('✅ Message acknowledged');
        } catch (error) {
          this.logger.error('❌ Error processing message:', error);
          message.nack();
        }
      });

      this.subscription.on('error', (error: any) => {
        this.logger.error('❌ Subscription error:', error);
      });
    } catch (error) {
      this.logger.error('❌ Error checking subscription existence:', error);
    }
  }
}
