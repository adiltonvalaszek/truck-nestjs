import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from './redis.service';
import { createClient } from 'redis';

jest.mock('redis', () => ({
  createClient: jest.fn(),
}));

describe('RedisService', () => {
  let service: RedisService;
  let mockRedisClient: any;

  beforeEach(async () => {
    mockRedisClient = {
      connect: jest.fn(),
      quit: jest.fn(),
      disconnect: jest.fn(),
      on: jest.fn(),
      get: jest.fn(),
      set: jest.fn(),
      setEx: jest.fn(),
      del: jest.fn(),
      flushAll: jest.fn(),
      ttl: jest.fn(),
      isOpen: false,
    };

    (createClient as jest.Mock).mockReturnValue(mockRedisClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [RedisService],
    }).compile();

    service = module.get<RedisService>(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should create client and connect to Redis', async () => {
      const loggerSpy = jest.spyOn(service['logger'], 'log').mockImplementation();

      await service.onModuleInit();

      expect(createClient).toHaveBeenCalledWith({
        socket: {
          host: 'localhost',
          port: 6379,
        },
      });
      expect(mockRedisClient.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockRedisClient.connect).toHaveBeenCalled();
      expect(loggerSpy).toHaveBeenCalledWith('✅ Connected to Redis');

      loggerSpy.mockRestore();
    });

    it('should use environment variables for Redis configuration', async () => {
      process.env.REDIS_HOST = 'redis-server';
      process.env.REDIS_PORT = '6380';

      await service.onModuleInit();

      expect(createClient).toHaveBeenCalledWith({
        socket: {
          host: 'redis-server',
          port: 6380,
        },
      });

      delete process.env.REDIS_HOST;
      delete process.env.REDIS_PORT;
    });
  });

  describe('onModuleDestroy', () => {
    it('should quit the Redis client', async () => {
      await service.onModuleInit();
      mockRedisClient.isOpen = true; // Set client as open
      await service.onModuleDestroy();

      expect(mockRedisClient.quit).toHaveBeenCalled();
    });
  });

  describe('get', () => {
    it('should get value from Redis', async () => {
      await service.onModuleInit();
      mockRedisClient.get.mockResolvedValue('test-value');

      const result = await service.get('test-key');

      expect(mockRedisClient.get).toHaveBeenCalledWith('test-key');
      expect(result).toBe('test-value');
    });

    it('should return null when key does not exist', async () => {
      await service.onModuleInit();
      mockRedisClient.get.mockResolvedValue(null);

      const result = await service.get('non-existent-key');

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should set value without TTL', async () => {
      await service.set('test-key', 'test-value');

      expect(mockRedisClient.set).toHaveBeenCalledWith('test-key', 'test-value');
    });

    it('should set value with TTL', async () => {
      await service.set('test-key', 'test-value', 300);

      expect(mockRedisClient.setEx).toHaveBeenCalledWith('test-key', 300, 'test-value');
      expect(mockRedisClient.set).not.toHaveBeenCalled();
    });
  });

  describe('del', () => {
    it('should delete key from Redis', async () => {
      await service.onModuleInit();

      await service.del('test-key');

      expect(mockRedisClient.del).toHaveBeenCalledWith('test-key');
    });
  });

  describe('flushall', () => {
    it('should flush all keys from Redis', async () => {
      await service.onModuleInit();

      await service.flushall();

      expect(mockRedisClient.flushAll).toHaveBeenCalled();
    });
  });

  describe('ttl', () => {
    it('should get TTL for a key', async () => {
      await service.onModuleInit();
      mockRedisClient.ttl.mockResolvedValue(120);

      const result = await service.ttl('test-key');

      expect(mockRedisClient.ttl).toHaveBeenCalledWith('test-key');
      expect(result).toBe(120);
    });
  });

  describe('disconnect', () => {
    it('should disconnect from Redis', async () => {
      await service.onModuleInit();

      await service.disconnect();

      expect(mockRedisClient.disconnect).toHaveBeenCalled();
    });
  });

  describe('connect', () => {
    it('should connect when client is not open', async () => {
      await service.onModuleInit();
      mockRedisClient.isOpen = false;

      await service.connect();

      expect(mockRedisClient.connect).toHaveBeenCalledTimes(2); // once in onModuleInit, once here
    });

    it('should not connect when client is already open', async () => {
      await service.onModuleInit();
      mockRedisClient.isOpen = true;

      await service.connect();

      expect(mockRedisClient.connect).toHaveBeenCalledTimes(1); // only once in onModuleInit
    });
  });
});