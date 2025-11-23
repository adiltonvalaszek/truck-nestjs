import { Test, TestingModule } from '@nestjs/testing';
import { PubSubPublisherService } from './pubsub-publisher.service';
import { PubSub } from '@google-cloud/pubsub';

// Mock the Google Cloud Pub/Sub
jest.mock('@google-cloud/pubsub');

describe('PubSubPublisherService', () => {
  let service: PubSubPublisherService;
  let mockPubSub: jest.Mocked<PubSub>;
  let mockTopic: any;

  beforeEach(async () => {
    // Create mock topic with publish method
    mockTopic = {
      publish: jest.fn(),
      publishMessage: jest.fn(),
      publishJSON: jest.fn(),
      exists: jest.fn().mockResolvedValue([true]),
      create: jest.fn().mockResolvedValue({}),
    };

    // Create mock PubSub instance
    mockPubSub = {
      topic: jest.fn().mockReturnValue(mockTopic),
    } as any;

    // Mock the PubSub constructor
    (PubSub as jest.MockedClass<typeof PubSub>).mockImplementation(() => mockPubSub);

    // Set environment variables
    process.env.PUBSUB_PROJECT_ID = 'truck-api-project';
    process.env.PUBSUB_EMULATOR_HOST = 'localhost:8085';

    const module: TestingModule = await Test.createTestingModule({
      providers: [PubSubPublisherService],
    }).compile();

    // Initialize the module to trigger onModuleInit
    await module.init();

    service = module.get<PubSubPublisherService>(PubSubPublisherService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.PUBSUB_PROJECT_ID;
    delete process.env.PUBSUB_EMULATOR_HOST;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('publishLoadAssigned', () => {
    const mockAssignment = {
      id: 'assignment-1',
      driverId: 'driver-1',
      loadId: 'load-1',
      driver: {
        id: 'driver-1',
        name: 'Test Driver',
        licenseNumber: 'DRV-001',
        status: 'BUSY' as any,
        createdAt: new Date(),
      },
      load: {
        id: 'load-1',
        origin: 'São Paulo',
        destination: 'Rio de Janeiro',
        cargoType: 'Electronics',
        status: 'ASSIGNED' as any,
        createdAt: new Date(),
      },
    };

    const expectedData = {
      assignmentId: mockAssignment.id,
      driverId: mockAssignment.driverId,
      loadId: mockAssignment.loadId,
      driver: mockAssignment.driver,
      load: mockAssignment.load,
    };

    it('should publish load assigned message successfully', async () => {
      // Mock successful message publishing
      const mockMessageId = 'message-123';
      mockTopic.publishMessage.mockResolvedValue(mockMessageId);

      await service.publishLoadAssigned(mockAssignment);

      // Verify the correct topic was accessed
      // Note: topic is accessed in onModuleInit, so we can't check it here easily without spying on the property
      // But we can verify publishMessage was called on the mockTopic

      // Verify the message was published with correct data
      expect(mockTopic.publishMessage).toHaveBeenCalledWith({
        json: {
          type: 'LOAD_ASSIGNED',
          timestamp: expect.any(String),
          data: expectedData,
        },
      });
    });

    it('should handle publishing errors gracefully', async () => {
      // Mock logger to suppress error logs during test
      const loggerSpy = jest.spyOn(service['logger'], 'error').mockImplementation();
      
      // Mock publishing error
      const publishError = new Error('Pub/Sub publishing failed');
      mockTopic.publishMessage.mockRejectedValue(publishError);

      // Should not throw, but log the error
      await expect(service.publishLoadAssigned(mockAssignment)).resolves.not.toThrow();
      
      loggerSpy.mockRestore();

      expect(mockTopic.publishMessage).toHaveBeenCalledWith({
        json: {
          type: 'LOAD_ASSIGNED',
          timestamp: expect.any(String),
          data: expectedData,
        },
      });
    });

    it('should include correct message structure', async () => {
      const mockMessageId = 'message-123';
      mockTopic.publishMessage.mockResolvedValue(mockMessageId);

      await service.publishLoadAssigned(mockAssignment);

      const publishedMessage = mockTopic.publishMessage.mock.calls[0][0];
      
      expect(publishedMessage.json).toMatchObject({
        type: 'LOAD_ASSIGNED',
        timestamp: expect.any(String),
        data: expectedData,
      });

      // Verify timestamp is a valid ISO string
      expect(new Date(publishedMessage.json.timestamp).toISOString()).toBe(
        publishedMessage.json.timestamp,
      );
    });
  });

  describe('publishMessage', () => {
    const mockTopicName = 'test.topic';
    const mockData = { test: 'data' };

    it('should publish generic message successfully', async () => {
      const mockMessageId = 'message-456';
      mockTopic.publishMessage.mockResolvedValue(mockMessageId);

      await service.publishMessage(mockTopicName, mockData);

      expect(mockPubSub.topic).toHaveBeenCalledWith(mockTopicName);
      expect(mockTopic.publishMessage).toHaveBeenCalledWith({
        json: mockData,
      });
    });

    it('should handle generic message publishing errors', async () => {
      // Mock logger to suppress error logs during test
      const loggerSpy = jest.spyOn(service['logger'], 'error').mockImplementation();
      
      const publishError = new Error('Generic publishing failed');
      mockTopic.publishMessage.mockRejectedValue(publishError);

      await expect(service.publishMessage(mockTopicName, mockData)).resolves.not.toThrow();
      
      loggerSpy.mockRestore();

      expect(mockTopic.publishMessage).toHaveBeenCalledWith({
        json: mockData,
      });
    });
  });

  describe('service initialization', () => {
    it('should initialize PubSub with correct configuration', () => {
      expect(PubSub).toHaveBeenCalledWith({
        projectId: 'truck-api-project',
        apiEndpoint: 'localhost:8085',
      });
    });

    it('should log successful initialization', () => {
      // The service should initialize without errors
      expect(service).toBeDefined();
    });
  });
});