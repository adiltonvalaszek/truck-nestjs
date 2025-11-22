import { INestApplication } from '@nestjs/common';
import { IntegrationTestUtils } from './test-utils';
import { TestDatabase } from './test-database';
import './setup';

describe('Simple Integration Test', () => {
  let app: INestApplication;

  beforeAll(async () => {
    try {
      console.log('🚀 Starting simple integration test...');
      await TestDatabase.start();
      process.env.DATABASE_URL = TestDatabase.getConnectionString();
      app = await IntegrationTestUtils.createTestApp();
      console.log('✅ Simple integration test setup complete');
    } catch (error) {
      console.error('❌ Setup failed:', error);
      throw error;
    }
  }, 180000); // 3 minutes

  afterAll(async () => {
    try {
      console.log('🧹 Cleaning up simple integration test...');
      if (app) {
        await IntegrationTestUtils.closeApp();
      }
      await TestDatabase.stop();
      console.log('✅ Simple integration test cleanup complete');
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
    }
  }, 30000);

  beforeEach(async () => {
    await TestDatabase.cleanup();
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await IntegrationTestUtils.request()
        .get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).not.toHaveProperty('service');
    });
  });
});