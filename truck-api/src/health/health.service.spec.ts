import { Test, TestingModule } from '@nestjs/testing';
import { HealthService } from './health.service';

describe('HealthService', () => {
  let service: HealthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HealthService],
    }).compile();

    service = module.get<HealthService>(HealthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getHealthStatus', () => {
    it('should return minimal health status', () => {
      const result = service.getHealthStatus();

      expect(result).toHaveProperty('status', 'ok');
      expect(result).toHaveProperty('timestamp');
      
      expect(result).not.toHaveProperty('service');
      expect(result).not.toHaveProperty('version');
      expect(result).not.toHaveProperty('uptime');
      expect(result).not.toHaveProperty('memory');
      expect(result).not.toHaveProperty('environment');
      expect(result).not.toHaveProperty('nodeVersion');
    });

    it('should have valid timestamp format', () => {
      const result = service.getHealthStatus();
      
      expect(result.timestamp).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
      
      const timestamp = new Date(result.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).not.toBeNaN();
    });
  });
});