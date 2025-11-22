import { INestApplication } from '@nestjs/common';
import { IntegrationTestUtils, TestUser } from './test-utils';
import { User } from '@/users/entities/user.entity';
import { Driver } from '@/drivers/entities/driver.entity';
import { Load } from '@/loads/entities/load.entity';
import { DriverLoadAssignment, AssignmentStatus } from '@/assignments/entities/driver-load-assignment.entity';
import { TestDatabase } from './test-database';
import './setup';

describe('Complete Trucking Flow E2E', () => {
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
    // Create authenticated user for each test
    testUser = await IntegrationTestUtils.createTestUser({
      email: 'admin@trucking.com',
      name: 'Admin User',
    });
  });

  describe('Complete Workflow: Driver Creation → Load Creation → Assignment', () => {
    it('should complete full trucking workflow', async () => {
      // Step 1: Create a driver
      console.log('📝 Step 1: Creating driver...');
      const driverResponse = await IntegrationTestUtils.authenticatedRequest(testUser.token)
        .post('/api/drivers')
        .send({
          name: 'John Doe',
          licenseNumber: 'CDL123456789',
        });

      IntegrationTestUtils.expectSuccessResponse(driverResponse);
      expect(driverResponse.body).toHaveProperty('id');
      expect(driverResponse.body.name).toBe('John Doe');
      expect(driverResponse.body.licenseNumber).toBe('CDL123456789');
      expect(driverResponse.body.status).toBe('AVAILABLE');

      const createdDriver = driverResponse.body;

      // Step 2: Create a load
      console.log('📦 Step 2: Creating load...');
      const loadResponse = await IntegrationTestUtils.authenticatedRequest(testUser.token)
        .post('/api/loads')
        .send({
          origin: 'New York, NY',
          destination: 'Los Angeles, CA',
          cargoType: 'Electronics',
        });

      IntegrationTestUtils.expectSuccessResponse(loadResponse);
      expect(loadResponse.body).toHaveProperty('id');
      expect(loadResponse.body.origin).toBe('New York, NY');
      expect(loadResponse.body.destination).toBe('Los Angeles, CA');
      expect(loadResponse.body.cargoType).toBe('Electronics');
      expect(loadResponse.body.status).toBe('PENDING');

      const createdLoad = loadResponse.body;

      // Step 3: Create assignment
      console.log('🚛 Step 3: Assigning driver to load...');
      const assignmentResponse = await IntegrationTestUtils.authenticatedRequest(testUser.token)
        .post('/api/assignments')
        .send({
          driverId: createdDriver.id,
          loadId: createdLoad.id,
        });

      IntegrationTestUtils.expectSuccessResponse(assignmentResponse);
      expect(assignmentResponse.body).toHaveProperty('id');
      expect(assignmentResponse.body.driverId).toBe(createdDriver.id);
      expect(assignmentResponse.body.loadId).toBe(createdLoad.id);
      expect(assignmentResponse.body.status).toBe('ASSIGNED');
      expect(assignmentResponse.body).toHaveProperty('assignedAt');

      const createdAssignment = assignmentResponse.body;

      // Step 4: Verify assignment can be retrieved
      console.log('🔍 Step 4: Retrieving assignment...');
      const getAssignmentResponse = await IntegrationTestUtils.authenticatedRequest(testUser.token)
        .get(`/api/assignments/${createdAssignment.id}`);

      IntegrationTestUtils.expectSuccessResponse(getAssignmentResponse);
      expect(getAssignmentResponse.body.id).toBe(createdAssignment.id);

      // Step 5: Update assignment status
      console.log('📋 Step 5: Updating assignment status...');
      const updateResponse = await IntegrationTestUtils.authenticatedRequest(testUser.token)
        .patch(`/api/assignments/${createdAssignment.id}/status`)
        .send({
          status: 'COMPLETED',
        });

      IntegrationTestUtils.expectSuccessResponse(updateResponse);
      expect(updateResponse.body.status).toBe('COMPLETED');
      expect(updateResponse.body).toHaveProperty('completedAt');

      // Step 6: Verify data integrity
      console.log('✅ Step 6: Verifying data integrity...');
      
      // Check that entities exist in database
      const driverCount = await IntegrationTestUtils.countEntities(Driver);
      const loadCount = await IntegrationTestUtils.countEntities(Load);
      const assignmentCount = await IntegrationTestUtils.countEntities(DriverLoadAssignment);

      expect(driverCount).toBe(1);
      expect(loadCount).toBe(1);
      expect(assignmentCount).toBe(1);

      // Verify final assignment state
      const finalAssignment = await IntegrationTestUtils.findEntity<DriverLoadAssignment>(DriverLoadAssignment, {
        id: createdAssignment.id,
      });

      expect(finalAssignment).toBeDefined();
      expect((finalAssignment as DriverLoadAssignment).status).toBe(AssignmentStatus.COMPLETED);
      expect((finalAssignment as DriverLoadAssignment).completedAt).toBeDefined();

      console.log('🎉 Complete workflow test passed!');
    });
  });

  describe('Driver Management Flow', () => {
    it('should handle complete driver lifecycle', async () => {
      // Create driver
      const driverResponse = await IntegrationTestUtils.authenticatedRequest(testUser.token)
        .post('/api/drivers')
        .send({
          name: 'Jane Smith',
          licenseNumber: 'CDL987654321',
        });

      IntegrationTestUtils.expectSuccessResponse(driverResponse);
      const driver = driverResponse.body;

      // Verify driver exists in database
      const dbDriver = await IntegrationTestUtils.findEntity<Driver>(Driver, { id: driver.id });
      expect(dbDriver).toBeDefined();
      expect((dbDriver as Driver).name).toBe('Jane Smith');
      expect((dbDriver as Driver).licenseNumber).toBe('CDL987654321');
    });

    it('should prevent duplicate license numbers', async () => {
      // Create first driver
      await IntegrationTestUtils.authenticatedRequest(testUser.token)
        .post('/api/drivers')
        .send({
          name: 'Driver One',
          licenseNumber: 'DUPLICATE123',
        });

      // Try to create second driver with same license number
      const duplicateResponse = await IntegrationTestUtils.authenticatedRequest(testUser.token)
        .post('/api/drivers')
        .send({
          name: 'Driver Two',
          licenseNumber: 'DUPLICATE123',
        });

      // Should fail with conflict error
      expect(duplicateResponse.status).toBe(409);
    });
  });

  describe('Load Management Flow', () => {
    it('should handle complete load lifecycle', async () => {
      // Create load
      const loadResponse = await IntegrationTestUtils.authenticatedRequest(testUser.token)
        .post('/api/loads')
        .send({
          origin: 'Chicago, IL',
          destination: 'Miami, FL',
          cargoType: 'Furniture',
        });

      IntegrationTestUtils.expectSuccessResponse(loadResponse);
      const load = loadResponse.body;

      // List all loads
      const listResponse = await IntegrationTestUtils.authenticatedRequest(testUser.token)
        .get('/api/loads');

      IntegrationTestUtils.expectSuccessResponse(listResponse);
      expect(listResponse.body).toBeInstanceOf(Array);
      expect(listResponse.body).toHaveLength(1);
      expect(listResponse.body[0].id).toBe(load.id);

      // Verify load exists in database
      const dbLoad = await IntegrationTestUtils.findEntity<Load>(Load, { id: load.id });
      expect(dbLoad).toBeDefined();
      expect((dbLoad as Load).origin).toBe('Chicago, IL');
      expect((dbLoad as Load).destination).toBe('Miami, FL');
      expect((dbLoad as Load).cargoType).toBe('Furniture');
    });
  });

  describe('Error Handling', () => {
    it('should handle assignment with non-existent driver', async () => {
      // Create valid load
      const load = await IntegrationTestUtils.createTestLoad();

      // Try to assign non-existent driver
      const response = await IntegrationTestUtils.authenticatedRequest(testUser.token)
        .post('/api/assignments')
        .send({
          driverId: '00000000-0000-0000-0000-000000000000',
          loadId: load.id,
        });

      IntegrationTestUtils.expectErrorResponse(response, 404, 'Driver not found');
    });

    it('should handle assignment with non-existent load', async () => {
      // Create valid driver
      const driver = await IntegrationTestUtils.createTestDriver();

      // Try to assign to non-existent load
      const response = await IntegrationTestUtils.authenticatedRequest(testUser.token)
        .post('/api/assignments')
        .send({
          driverId: driver.id,
          loadId: '00000000-0000-0000-0000-000000000000',
        });

      IntegrationTestUtils.expectErrorResponse(response, 404, 'Load not found');
    });

    it('should handle invalid assignment status updates', async () => {
      // Create assignment
      const driver = await IntegrationTestUtils.createTestDriver();
      const load = await IntegrationTestUtils.createTestLoad();
      const assignment = await IntegrationTestUtils.createTestAssignment(driver.id, load.id);

      // Try invalid status
      const response = await IntegrationTestUtils.authenticatedRequest(testUser.token)
        .patch(`/api/assignments/${assignment.id}/status`)
        .send({
          status: 'INVALID_STATUS',
        });

      IntegrationTestUtils.expectValidationError(response);
    });
  });

  describe('Data Validation', () => {
    it('should validate driver creation data', async () => {
      const response = await IntegrationTestUtils.authenticatedRequest(testUser.token)
        .post('/api/drivers')
        .send({
          name: '',
          licenseNumber: '123', // Too short
        });

      IntegrationTestUtils.expectValidationError(response);
    });

    it('should validate load creation data', async () => {
      const response = await IntegrationTestUtils.authenticatedRequest(testUser.token)
        .post('/api/loads')
        .send({
          origin: '',
          destination: '',
          cargoType: 'X', // Too short
        });

      IntegrationTestUtils.expectValidationError(response);
    });

    it('should validate user creation data', async () => {
      const response = await IntegrationTestUtils.authenticatedRequest(testUser.token)
        .post('/api/users')
        .send({
          name: '',
          email: 'invalid-email',
          password: '123', // Too short
        });

      IntegrationTestUtils.expectValidationError(response);
    });
  });
});