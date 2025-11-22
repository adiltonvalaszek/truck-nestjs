import { Test, TestingModule } from '@nestjs/testing';
import { PubSubConsumerService } from './pubsub-consumer.service';
import { MongoDBService } from '../database/mongodb.service';
import { PubSub } from '@google-cloud/pubsub';

jest.mock('@google-cloud/pubsub', () => ({
  PubSub: jest.fn(),
}));

describe('PubSubConsumerService', () => {
  let service: PubSubConsumerService;
  let mongodbService: MongoDBService;
  let mockPubSub: any;
  let mockSubscription: any;

  const mockMongoDBService = {
    recordAuditEvent: jest.fn(),
  };

  beforeEach(async () => {
    mockSubscription = {
      on: jest.fn(),
    };

    mockPubSub = {
      subscription: jest.fn().mockReturnValue(mockSubscription),
    };

    (PubSub as jest.MockedFunction<any>).mockImplementation(() => mockPubSub);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PubSubConsumerService,
        {
          provide: MongoDBService,
          useValue: mockMongoDBService,
        },
      ],
    }).compile();

    service = module.get<PubSubConsumerService>(PubSubConsumerService);
    mongodbService = module.get<MongoDBService>(MongoDBService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should initialize PubSub with default configuration', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      service.onModuleInit();

      expect(PubSub).toHaveBeenCalledWith({
        projectId: 'truck-nestjs',
        apiEndpoint: undefined,
      });
      expect(mockPubSub.subscription).toHaveBeenCalledWith('load.assigned-sub');
      expect(consoleSpy).toHaveBeenCalledWith('✅ Pub/Sub Consumer initialized');

      consoleSpy.mockRestore();
    });

    it('should use environment variables for configuration', () => {
      const originalProjectId = process.env.PUBSUB_PROJECT_ID;
      const originalEmulatorHost = process.env.PUBSUB_EMULATOR_HOST;
      const originalSubscription = process.env.PUBSUB_SUBSCRIPTION;

      process.env.PUBSUB_PROJECT_ID = 'custom-project';
      process.env.PUBSUB_EMULATOR_HOST = 'localhost:8085';
      process.env.PUBSUB_SUBSCRIPTION = 'custom-subscription';

      service.onModuleInit();

      expect(PubSub).toHaveBeenCalledWith({
        projectId: 'custom-project',
        apiEndpoint: 'localhost:8085',
      });
      expect(mockPubSub.subscription).toHaveBeenCalledWith('custom-subscription');

      // Restore environment variables
      if (originalProjectId) process.env.PUBSUB_PROJECT_ID = originalProjectId;
      else delete process.env.PUBSUB_PROJECT_ID;
      
      if (originalEmulatorHost) process.env.PUBSUB_EMULATOR_HOST = originalEmulatorHost;
      else delete process.env.PUBSUB_EMULATOR_HOST;
      
      if (originalSubscription) process.env.PUBSUB_SUBSCRIPTION = originalSubscription;
      else delete process.env.PUBSUB_SUBSCRIPTION;
    });
  });

  describe('start', () => {
    beforeEach(() => {
      service.onModuleInit();
    });

    it('should set up message and error handlers', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await service.start();

      expect(consoleSpy).toHaveBeenCalledWith('🔄 Starting to listen for messages...');
      expect(mockSubscription.on).toHaveBeenCalledWith('message', expect.any(Function));
      expect(mockSubscription.on).toHaveBeenCalledWith('error', expect.any(Function));

      consoleSpy.mockRestore();
    });

    it('should process valid messages successfully', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      mockMongoDBService.recordAuditEvent.mockResolvedValue({ insertedId: 'audit-123' });

      await service.start();

      // Get the message handler function
      const messageHandler = mockSubscription.on.mock.calls.find(
        call => call[0] === 'message'
      )[1];

      const mockMessage = {
        data: Buffer.from(JSON.stringify({
          driverId: 'driver-123',
          loadId: 'load-456',
          assignmentId: 'assignment-789',
          driverName: 'John Doe',
          loadOrigin: 'New York',
          loadDestination: 'Boston',
          cargoType: 'Electronics',
          assignedAt: '2023-01-01T00:00:00Z',
        })),
        ack: jest.fn(),
        nack: jest.fn(),
      };

      await messageHandler(mockMessage);

      expect(mongodbService.recordAuditEvent).toHaveBeenCalledWith({
        driverId: 'driver-123',
        loadId: 'load-456',
        type: 'LOAD_ASSIGNED',
        payload: {
          assignmentId: 'assignment-789',
          driverName: 'John Doe',
          loadOrigin: 'New York',
          loadDestination: 'Boston',
          cargoType: 'Electronics',
          assignedAt: '2023-01-01T00:00:00Z',
        },
      });

      expect(consoleSpy).toHaveBeenCalledWith('📨 Received message:', expect.any(Object));
      expect(consoleSpy).toHaveBeenCalledWith('📧 [SIMULATED] Notification sent to driver John Doe');
      expect(consoleSpy).toHaveBeenCalledWith('   Load: New York → Boston');
      expect(consoleSpy).toHaveBeenCalledWith('✅ Message acknowledged');
      expect(mockMessage.ack).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle invalid JSON messages', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await service.start();

      const messageHandler = mockSubscription.on.mock.calls.find(
        call => call[0] === 'message'
      )[1];

      const mockMessage = {
        data: Buffer.from('invalid json'),
        ack: jest.fn(),
        nack: jest.fn(),
      };

      await messageHandler(mockMessage);

      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Error processing message:', expect.any(Error));
      expect(mockMessage.nack).toHaveBeenCalled();
      expect(mockMessage.ack).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should handle database errors during audit recording', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockMongoDBService.recordAuditEvent.mockRejectedValue(new Error('Database error'));

      await service.start();

      const messageHandler = mockSubscription.on.mock.calls.find(
        call => call[0] === 'message'
      )[1];

      const mockMessage = {
        data: Buffer.from(JSON.stringify({
          driverId: 'driver-123',
          loadId: 'load-456',
        })),
        ack: jest.fn(),
        nack: jest.fn(),
      };

      await messageHandler(mockMessage);

      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Error processing message:', expect.any(Error));
      expect(mockMessage.nack).toHaveBeenCalled();
      expect(mockMessage.ack).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should handle subscription errors', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await service.start();

      // Get the error handler function
      const errorHandler = mockSubscription.on.mock.calls.find(
        call => call[0] === 'error'
      )[1];

      const subscriptionError = new Error('Subscription connection lost');
      errorHandler(subscriptionError);

      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Subscription error:', subscriptionError);

      consoleErrorSpy.mockRestore();
    });
  });
});