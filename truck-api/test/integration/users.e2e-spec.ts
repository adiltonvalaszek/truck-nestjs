import { INestApplication } from '@nestjs/common';
import { IntegrationTestUtils, TestUser } from './test-utils';
import { User } from '@/users/entities/user.entity';
import { TestDatabase } from './test-database';
import './setup';

describe('Users E2E', () => {
  let app: INestApplication;
  let testUser: TestUser;

  beforeAll(async () => {
    await TestDatabase.start();
    process.env.DATABASE_URL = TestDatabase.getConnectionString();
    app = await IntegrationTestUtils.createTestApp();
  }, 60000);

  afterAll(async () => {
    await IntegrationTestUtils.closeApp();
    await TestDatabase.stop();
  }, 30000);

  beforeEach(async () => {
    await TestDatabase.cleanup();
    testUser = await IntegrationTestUtils.createTestUser({
      email: 'admin@trucking.com',
      name: 'Admin User',
    });
  });

  describe('POST /api/users', () => {
    it('should create a new user', async () => {
      const response = await IntegrationTestUtils.authenticatedRequest(testUser.token)
        .post('/api/users')
        .send({
          name: 'New User',
          email: 'newuser@example.com',
          password: 'password123',
        });

      IntegrationTestUtils.expectSuccessResponse(response);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('New User');
      expect(response.body.email).toBe('newuser@example.com');
      expect(response.body).not.toHaveProperty('password');

      const userCount = await IntegrationTestUtils.countEntities(User);
      expect(userCount).toBe(2); // testUser + new user
    });

    it('should prevent duplicate emails', async () => {
      await IntegrationTestUtils.authenticatedRequest(testUser.token)
        .post('/api/users')
        .send({
          name: 'User One',
          email: 'duplicate@example.com',
          password: 'password123',
        });

      const duplicateResponse = await IntegrationTestUtils.authenticatedRequest(testUser.token)
        .post('/api/users')
        .send({
          name: 'User Two',
          email: 'duplicate@example.com',
          password: 'password123',
        });

      expect(duplicateResponse.status).toBe(409);
    });

    it('should validate user data', async () => {
      const response = await IntegrationTestUtils.authenticatedRequest(testUser.token)
        .post('/api/users')
        .send({
          name: '',
          email: 'invalid-email',
          password: '123',
        });

      IntegrationTestUtils.expectValidationError(response);
    });

    it('should require authentication', async () => {
      const response = await IntegrationTestUtils.request()
        .post('/api/users')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123',
        });

      IntegrationTestUtils.expectUnauthorized(response);
    });
  });

});