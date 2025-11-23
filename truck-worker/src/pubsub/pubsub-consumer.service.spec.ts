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
    // Set NODE_ENV to non-test for these specific tests
    process.env.NODE_ENV = 'development';

    mockSubscription = {
      on: jest.fn(),
      exists: jest.fn().mockResolvedValue([true]),
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
    // Reset NODE_ENV to test
    process.env.NODE_ENV = 'test';
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should initialize PubSub with default configuration', () => {
      const loggerSpy = jest.spyOn(service['logger'], 'log').mockImplementation();

      service.onModuleInit();

      expect(PubSub).toHaveBeenCalledWith({
        projectId: 'truck-nestjs',
        apiEndpoint: undefined,
      });
      expect(mockPubSub.subscription).toHaveBeenCalledWith('load.assigned-sub');
      expect(loggerSpy).toHaveBeenCalledWith('✅ Pub/Sub Consumer initialized');

      loggerSpy.mockRestore();
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
      const loggerSpy = jest.spyOn(service['logger'], 'log').mockImplementation();

      await service.start();

      expect(loggerSpy).toHaveBeenCalledWith('📡 Listening for Pub/Sub events...');
      expect(mockSubscription.on).toHaveBeenCalledWith('message', expect.any(Function));
      expect(mockSubscription.on).toHaveBeenCalledWith('error', expect.any(Function));

      loggerSpy.mockRestore();
    });

    it('should process valid messages successfully', async () => {
      const loggerSpy = jest.spyOn(service['logger'], 'log').mockImplementation();
      mockMongoDBService.recordAuditEvent.mockResolvedValue({ insertedId: 'audit-123' });

      await service.start();

      // Get the message handler function
      const messageHandler = mockSubscription.on.mock.calls.find(
        call => call[0] === 'message'
      )?.[1];

      const mockMessage = {
        data: Buffer.from(JSON.stringify({
          type: 'LOAD_ASSIGNED',
          data: {
            driverId: 'driver-123',
            loadId: 'load-456',
            assignmentId: 'assignment-789',
            driverName: 'John Doe',
            loadOrigin: 'New York',
            loadDestination: 'Boston',
            cargoType: 'Electronics',
            assignedAt: '2023-01-01T00:00:00Z',
          }
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
          driverId: 'driver-123',
          loadId: 'load-456',
          assignmentId: 'assignment-789',
          driverName: 'John Doe',
          loadOrigin: 'New York',
          loadDestination: 'Boston',
          cargoType: 'Electronics',
          assignedAt: '2023-01-01T00:00:00Z',
        },
      });

      expect(loggerSpy).toHaveBeenCalledWith('📨 Received message:', expect.any(String));
      expect(loggerSpy).toHaveBeenCalledWith('📧 [SIMULATED] Notification sent to driver');
      expect(loggerSpy).toHaveBeenCalledWith('✅ Message acknowledged');
      expect(mockMessage.ack).toHaveBeenCalled();

      loggerSpy.mockRestore();
    });

    it('should handle invalid JSON messages', async () => {
      const loggerErrorSpy = jest.spyOn(service['logger'], 'error').mockImplementation();

      await service.start();

      const messageHandler = mockSubscription.on.mock.calls.find(
        call => call[0] === 'message'
      )?.[1];

      const mockMessage = {
        data: Buffer.from('invalid json'),
        ack: jest.fn(),
        nack: jest.fn(),
      };

      await messageHandler(mockMessage);

      expect(loggerErrorSpy).toHaveBeenCalledWith('❌ Error processing message:', expect.any(Error));
      expect(mockMessage.nack).toHaveBeenCalled();
      expect(mockMessage.ack).not.toHaveBeenCalled();

      loggerErrorSpy.mockRestore();
    });

    it('should handle database errors during audit recording', async () => {
      const loggerErrorSpy = jest.spyOn(service['logger'], 'error').mockImplementation();
      mockMongoDBService.recordAuditEvent.mockRejectedValue(new Error('Database error'));

      await service.start();

      const messageHandler = mockSubscription.on.mock.calls.find(
        call => call[0] === 'message'
      )?.[1];

      const mockMessage = {
        data: Buffer.from(JSON.stringify({
          type: 'LOAD_ASSIGNED',
          data: {
            driverId: 'driver-123',
            loadId: 'load-456',
          }
        })),
        ack: jest.fn(),
        nack: jest.fn(),
      };

      await messageHandler(mockMessage);

      expect(loggerErrorSpy).toHaveBeenCalledWith('❌ Error processing message:', expect.any(Error));
      expect(mockMessage.nack).toHaveBeenCalled();
      expect(mockMessage.ack).not.toHaveBeenCalled();

      loggerErrorSpy.mockRestore();
    });

    it('should handle subscription errors', async () => {
      const loggerErrorSpy = jest.spyOn(service['logger'], 'error').mockImplementation();

      await service.start();

      // Get the error handler function
      const errorHandler = mockSubscription.on.mock.calls.find(
        call => call[0] === 'error'
      )?.[1];

      const subscriptionError = new Error('Subscription connection lost');
      errorHandler(subscriptionError);

      expect(loggerErrorSpy).toHaveBeenCalledWith('❌ Subscription error:', subscriptionError);

      loggerErrorSpy.mockRestore();
    });
  });
});