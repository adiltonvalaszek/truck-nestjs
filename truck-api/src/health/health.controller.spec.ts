import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let controller: HealthController;
  let healthService: HealthService;

  const mockHealthService = {
    getHealthStatus: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: mockHealthService,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthService = module.get<HealthService>(HealthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('check', () => {
    it('should return minimal health check response', async () => {
      const mockHealthResponse = {
        status: 'ok',
        timestamp: new Date().toISOString(),
      };

      mockHealthService.getHealthStatus.mockReturnValue(mockHealthResponse);

      const result = await controller.check();

      expect(healthService.getHealthStatus).toHaveBeenCalled();
      expect(result).toEqual(mockHealthResponse);
      expect(result).toHaveProperty('status', 'ok');
      expect(result).toHaveProperty('timestamp');
      expect(result).not.toHaveProperty('service');
      expect(result).not.toHaveProperty('memory');
    });
  });
});