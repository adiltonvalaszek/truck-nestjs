import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PubSub } from '@google-cloud/pubsub';

@Injectable()
export class PubSubPublisherService implements OnModuleInit {
  private readonly logger = new Logger(PubSubPublisherService.name);
  private pubsub: PubSub;
  private topic: any;

  async onModuleInit() {
    this.pubsub = new PubSub({
      projectId: process.env.PUBSUB_PROJECT_ID || 'truck-nestjs',
      apiEndpoint: process.env.PUBSUB_EMULATOR_HOST,
    });

    const topicName = 'load.assigned';
    this.topic = this.pubsub.topic(topicName);
    
    try {
      const [exists] = await this.topic.exists();
      if (!exists) {
        this.logger.log(`Creating topic: ${topicName}`);
        await this.topic.create();
        this.logger.log(`✅ Topic created: ${topicName}`);
      }
    } catch (error) {
      this.logger.warn(`Could not verify/create topic ${topicName}`, error.message);
    }
    
    this.logger.log('✅ Pub/Sub Publisher initialized');
  }

  async publishLoadAssigned(assignment: any) {
    const payload = {
      type: 'LOAD_ASSIGNED',
      timestamp: new Date().toISOString(),
      data: {
        assignmentId: assignment.id,
        driverId: assignment.driverId,
        loadId: assignment.loadId,
        driver: assignment.driver,
        load: assignment.load,
      },
    };

    try {
      const messageId = await this.topic.publishMessage({ 
        json: payload 
      });
      this.logger.log(`📤 Published load.assigned event: ${messageId}`);
      return messageId;
    } catch (error) {
      this.logger.error('Error publishing load assigned message', error.stack);
      // Don't throw - avoid breaking assignment creation if pub/sub fails
    }
  }

  async publishMessage(topicName: string, data: any) {
    try {
      const topic = this.pubsub.topic(topicName);
      
      const [exists] = await topic.exists();
      if (!exists) {
        this.logger.log(`Creating topic: ${topicName}`);
        await topic.create();
      }
      
      const messageId = await topic.publishMessage({ 
        json: data 
      });
      this.logger.log(`📤 Published message to ${topicName}: ${messageId}`);
      return messageId;
    } catch (error) {
      this.logger.error(`Error publishing message to ${topicName}`, error.stack);
      // Don't throw - avoid breaking operations if pub/sub fails
    }
  }
}
