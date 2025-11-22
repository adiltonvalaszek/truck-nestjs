import { Test, TestingModule } from '@nestjs/testing';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JwtStrategy],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should return user object with userId and email from payload', async () => {
      const payload = {
        sub: 123,
        email: 'test@example.com',
        iat: 1234567890,
        exp: 1234567890,
      };

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        userId: 123,
        email: 'test@example.com',
      });
    });

    it('should handle payload with different sub type', async () => {
      const payload = {
        sub: 'user-uuid-123',
        email: 'user@test.com',
        role: 'admin',
      };

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        userId: 'user-uuid-123',
        email: 'user@test.com',
      });
    });

    it('should return user object even with missing optional fields', async () => {
      const payload = {
        sub: 456,
        email: 'minimal@example.com',
      };

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        userId: 456,
        email: 'minimal@example.com',
      });
    });
  });
});