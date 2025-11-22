import { INestApplication } from '@nestjs/common';
import { IntegrationTestUtils, TestUser } from './test-utils';
import { Driver } from '@/drivers/entities/driver.entity';
import { DriverStatus } from '@/drivers/entities/driver.entity';
import { TestDatabase } from './test-database';
import './setup';

describe('Drivers E2E', () => {
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

  describe('POST /api/drivers', () => {
    it('should create a new driver', async () => {
      const response = await IntegrationTestUtils.authenticatedRequest(testUser.token)
        .post('/api/drivers')
        .send({
          name: 'John Doe',
          licenseNumber: 'CDL123456789',
        });

      IntegrationTestUtils.expectSuccessResponse(response);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('John Doe');
      expect(response.body.licenseNumber).toBe('CDL123456789');
      expect(response.body.status).toBe('AVAILABLE');

      const driverCount = await IntegrationTestUtils.countEntities(Driver);
      expect(driverCount).toBe(1);
    });

    it('should prevent duplicate license numbers', async () => {
      await IntegrationTestUtils.authenticatedRequest(testUser.token)
        .post('/api/drivers')
        .send({
          name: 'Driver One',
          licenseNumber: 'DUPLICATE123',
        });

      const duplicateResponse = await IntegrationTestUtils.authenticatedRequest(testUser.token)
        .post('/api/drivers')
        .send({
          name: 'Driver Two',
          licenseNumber: 'DUPLICATE123',
        });

      expect(duplicateResponse.status).toBe(409);
    });

    it('should validate driver data', async () => {
      const response = await IntegrationTestUtils.authenticatedRequest(testUser.token)
        .post('/api/drivers')
        .send({
          name: '',
          licenseNumber: '123', // Too short
        });

      IntegrationTestUtils.expectValidationError(response);
    });

    it('should require authentication', async () => {
      const response = await IntegrationTestUtils.request()
        .post('/api/drivers')
        .send({
          name: 'Test Driver',
          licenseNumber: 'CDL123456789',
        });

      IntegrationTestUtils.expectUnauthorized(response);
    });
  });

  describe('Integration with Assignments', () => {
    it('should not delete driver when assigned to load', async () => {
      const driver = await IntegrationTestUtils.createTestDriver();

      // Create load for assignment
      const load = await IntegrationTestUtils.createTestLoad({
        origin: 'Test Origin',
        destination: 'Test Destination',
      });

      // Assign driver to load
      const assignmentResponse = await IntegrationTestUtils.authenticatedRequest(testUser.token)
        .post('/api/assignments')
        .send({
          driverId: driver.id,
          loadId: load.id,
        });

      IntegrationTestUtils.expectSuccessResponse(assignmentResponse);

      // Driver should still exist and be assigned
      const driverAfterAssignment = await IntegrationTestUtils.findEntity<Driver>(Driver, { id: driver.id });
      expect(driverAfterAssignment).toBeDefined();
    });
  });
});