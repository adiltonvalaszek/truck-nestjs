import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { MongoClient, Db } from 'mongodb';

@Injectable()
export class MongoDBService implements OnModuleInit, OnModuleDestroy {
  private client: MongoClient;
  private db: Db;

  async onModuleInit() {
    const url = process.env.MONGODB_URL || 'mongodb://localhost:27017/truck-audit';
    
    this.client = new MongoClient(url);
    await this.client.connect();
    
    this.db = this.client.db();
    console.log('✅ Connected to MongoDB');
  }

  async onModuleDestroy() {
    await this.client.close();
  }

  async recordAuditEvent(event: {
    driverId: string;
    loadId: string;
    type: string;
    payload: any;
  }) {
    const collection = this.db.collection('audit_events');
    
    const document = {
      ...event,
      timestamp: new Date(),
    };

    const result = await collection.insertOne(document);
    console.log(`✅ Audit event recorded: ${result.insertedId}`);
    
    return result;
  }
}
