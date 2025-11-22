import { INestApplication } from '@nestjs/common';
import { IntegrationTestUtils } from './test-utils';
import { TestDatabase } from './test-database';
import './setup';

describe('Authentication E2E', () => {
  let app: INestApplication;

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
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      // Arrange - Create test user
      const testUser = await IntegrationTestUtils.createTestUser({
        email: 'test@example.com',
        name: 'Test User',
      });

      // Act - Login
      const response = await IntegrationTestUtils.request()
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123', // This should match the mock password
        });

      // Assert
      IntegrationTestUtils.expectSuccessResponse(response);
      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toMatchObject({
        id: testUser.user.id,
        email: testUser.user.email,
        name: testUser.user.name,
      });
      expect(response.body.user).not.toHaveProperty('password'); // Password should be filtered
    });

    it('should reject login with invalid email', async () => {
      const response = await IntegrationTestUtils.request()
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        });

      IntegrationTestUtils.expectErrorResponse(response, 401, 'Invalid credentials');
    });

    it('should reject login with invalid password', async () => {
      // Arrange - Create test user
      await IntegrationTestUtils.createTestUser({
        email: 'test2@example.com',
      });

      // Act
      const response = await IntegrationTestUtils.request()
        .post('/api/auth/login')
        .send({
          email: 'test2@example.com',
          password: 'wrongpassword',
        });

      // Assert
      IntegrationTestUtils.expectErrorResponse(response, 401, 'Invalid credentials');
    });

    it('should validate request body', async () => {
      const response = await IntegrationTestUtils.request()
        .post('/api/auth/login')
        .send({
          email: 'invalid-email',
          password: '',
        });

      IntegrationTestUtils.expectValidationError(response);
    });
  });

  describe('Protected Endpoints', () => {
    it('should protect endpoints without token', async () => {
      const response = await IntegrationTestUtils.request()
        .post('/api/users')
        .send({
          name: 'New User',
          email: 'newuser@example.com',
          password: 'password123',
        });

      IntegrationTestUtils.expectUnauthorized(response);
    });

    it('should allow access with valid token', async () => {
      // Arrange - Create test user and get token
      const { token } = await IntegrationTestUtils.createTestUser();

      // Act
      const response = await IntegrationTestUtils.authenticatedRequest(token)
        .post('/api/users')
        .send({
          name: 'New User',
          email: 'newuser@example.com',
          password: 'password123',
        });

      // Assert - Should be successful (or at least not unauthorized)
      expect(response.status).not.toBe(401);
    });

    it('should reject invalid token', async () => {
      const response = await IntegrationTestUtils.request()
        .post('/api/users')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          name: 'New User',
          email: 'newuser@example.com',
          password: 'password123',
        });

      IntegrationTestUtils.expectUnauthorized(response);
    });
  });

  describe('Public Endpoints', () => {
    it('should allow access to health check without token', async () => {
      const response = await IntegrationTestUtils.request()
        .get('/api/health');

      IntegrationTestUtils.expectSuccessResponse(response);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).not.toHaveProperty('service');
      expect(response.body).not.toHaveProperty('memory');
      expect(response.body).not.toHaveProperty('uptime');
    });
  });
});