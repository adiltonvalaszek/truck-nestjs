import { Test, TestingModule } from '@nestjs/testing';
import { MongoDBService } from './mongodb.service';
import { MongoClient, Db, Collection } from 'mongodb';

jest.mock('mongodb', () => ({
  MongoClient: jest.fn(),
}));

describe('MongoDBService', () => {
  let service: MongoDBService;
  let mockClient: jest.Mocked<MongoClient>;
  let mockDb: jest.Mocked<Db>;
  let mockCollection: jest.Mocked<Collection>;

  beforeEach(async () => {
    mockCollection = {
      insertOne: jest.fn(),
    } as any;

    mockDb = {
      collection: jest.fn().mockReturnValue(mockCollection),
    } as any;

    mockClient = {
      connect: jest.fn(),
      close: jest.fn(),
      db: jest.fn().mockReturnValue(mockDb),
    } as any;

    (MongoClient as jest.MockedFunction<any>).mockImplementation(() => mockClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [MongoDBService],
    }).compile();

    service = module.get<MongoDBService>(MongoDBService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should connect to MongoDB with default URL', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await service.onModuleInit();

      expect(MongoClient).toHaveBeenCalledWith('mongodb://localhost:27017/truck-audit');
      expect(mockClient.connect).toHaveBeenCalled();
      expect(mockClient.db).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('✅ Connected to MongoDB');

      consoleSpy.mockRestore();
    });

    it('should use environment variable for MongoDB URL', async () => {
      const originalUrl = process.env.MONGODB_URL;
      process.env.MONGODB_URL = 'mongodb://custom-host:27017/custom-db';

      await service.onModuleInit();

      expect(MongoClient).toHaveBeenCalledWith('mongodb://custom-host:27017/custom-db');

      if (originalUrl) {
        process.env.MONGODB_URL = originalUrl;
      } else {
        delete process.env.MONGODB_URL;
      }
    });

    it('should handle connection errors', async () => {
      const connectionError = new Error('Connection failed');
      mockClient.connect.mockRejectedValue(connectionError);

      await expect(service.onModuleInit()).rejects.toThrow('Connection failed');
    });
  });

  describe('onModuleDestroy', () => {
    it('should close MongoDB connection', async () => {
      await service.onModuleInit();
      await service.onModuleDestroy();

      expect(mockClient.close).toHaveBeenCalled();
    });

    it('should handle close errors gracefully', async () => {
      await service.onModuleInit();
      
      const closeError = new Error('Close failed');
      mockClient.close.mockRejectedValue(closeError);

      await expect(service.onModuleDestroy()).rejects.toThrow('Close failed');
    });
  });

  describe('recordAuditEvent', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should record audit event successfully', async () => {
      const eventData = {
        driverId: 'driver-123',
        loadId: 'load-456',
        type: 'load.assigned',
        payload: { status: 'assigned' },
      };

      const mockResult = { insertedId: 'audit-id-123' };
      mockCollection.insertOne.mockResolvedValue(mockResult as any);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await service.recordAuditEvent(eventData);

      expect(mockDb.collection).toHaveBeenCalledWith('audit_events');
      expect(mockCollection.insertOne).toHaveBeenCalledWith({
        ...eventData,
        timestamp: expect.any(Date),
      });
      expect(result).toEqual(mockResult);
      expect(consoleSpy).toHaveBeenCalledWith('✅ Audit event recorded: audit-id-123');

      consoleSpy.mockRestore();
    });

    it('should include timestamp in audit event', async () => {
      const eventData = {
        driverId: 'driver-123',
        loadId: 'load-456',
        type: 'load.assigned',
        payload: { status: 'assigned' },
      };

      const mockResult = { insertedId: 'audit-id-456' };
      mockCollection.insertOne.mockResolvedValue(mockResult as any);

      const beforeCall = new Date();
      await service.recordAuditEvent(eventData);
      const afterCall = new Date();

      const insertedDocument = mockCollection.insertOne.mock.calls[0][0];
      expect(insertedDocument.timestamp).toBeInstanceOf(Date);
      expect(insertedDocument.timestamp.getTime()).toBeGreaterThanOrEqual(beforeCall.getTime());
      expect(insertedDocument.timestamp.getTime()).toBeLessThanOrEqual(afterCall.getTime());
    });

    it('should handle database insertion errors', async () => {
      const eventData = {
        driverId: 'driver-123',
        loadId: 'load-456',
        type: 'load.assigned',
        payload: { status: 'assigned' },
      };

      const insertError = new Error('Database insertion failed');
      mockCollection.insertOne.mockRejectedValue(insertError);

      await expect(service.recordAuditEvent(eventData)).rejects.toThrow('Database insertion failed');
    });
  });
});