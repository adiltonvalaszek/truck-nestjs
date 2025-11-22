import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository, DataSource } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';

import { AppModule } from '@/app.module';
import { TestDatabase } from './test-database';
import { User } from '@/users/entities/user.entity';
import { Driver } from '@/drivers/entities/driver.entity';
import { Load } from '@/loads/entities/load.entity';
import { DriverLoadAssignment } from '@/assignments/entities/driver-load-assignment.entity';

export interface TestUser {
  user: User;
  token: string;
}

export class IntegrationTestUtils {
  private static app: INestApplication;
  private static moduleRef: TestingModule;

  static async createTestApp(): Promise<INestApplication> {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
    .overrideProvider(DataSource)
    .useValue(TestDatabase.getDataSource())
    .compile();

    const app = moduleFixture.createNestApplication();
    
    // Apply same configuration as main.ts
    app.setGlobalPrefix('api');
    
    // Global validation pipe
    const { ValidationPipe } = require('@nestjs/common');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    
    await app.init();
    
    this.app = app;
    this.moduleRef = moduleFixture;
    
    return app;
  }

  static getApp(): INestApplication {
    if (!this.app) {
      throw new Error('Test app not created. Call createTestApp() first.');
    }
    return this.app;
  }

  static async closeApp(): Promise<void> {
    if (this.app) {
      await this.app.close();
    }
    if (this.moduleRef) {
      await this.moduleRef.close();
    }
  }

  static async createTestUser(overrides: Partial<User> = {}): Promise<TestUser> {
    const app = this.getApp();
    const userRepository = app.get<Repository<User>>(getRepositoryToken(User));
    const jwtService = app.get<JwtService>(JwtService);

    // Create user in database
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const userData = {
      name: 'Test User',
      email: 'test@example.com',
      password: hashedPassword,
      ...overrides,
    };

    const user = userRepository.create(userData);
    const savedUser = await userRepository.save(user);

    // Generate JWT token
    const payload = { sub: savedUser.id, email: savedUser.email };
    const token = jwtService.sign(payload);

    return {
      user: savedUser,
      token,
    };
  }

  static async createTestDriver(overrides: Partial<Driver> = {}): Promise<Driver> {
    const app = this.getApp();
    const driverRepository = app.get<Repository<Driver>>(getRepositoryToken(Driver));

    const driverData = {
      name: 'Test Driver',
      licenseNumber: 'DL123456789',
      ...overrides,
    };

    const driver = driverRepository.create(driverData);
    return await driverRepository.save(driver);
  }

  static async createTestLoad(overrides: Partial<Load> = {}): Promise<Load> {
    const app = this.getApp();
    const loadRepository = app.get<Repository<Load>>(getRepositoryToken(Load));

    const loadData = {
      origin: 'Test Origin',
      destination: 'Test Destination',
      cargoType: 'Test Cargo',
      ...overrides,
    };

    const load = loadRepository.create(loadData);
    return await loadRepository.save(load);
  }

  static async createTestAssignment(
    driverId: string,
    loadId: string,
    overrides: Partial<DriverLoadAssignment> = {}
  ): Promise<DriverLoadAssignment> {
    const app = this.getApp();
    const assignmentRepository = app.get<Repository<DriverLoadAssignment>>(
      getRepositoryToken(DriverLoadAssignment)
    );

    const assignmentData = {
      driverId,
      loadId,
      ...overrides,
    };

    const assignment = assignmentRepository.create(assignmentData);
    return await assignmentRepository.save(assignment);
  }

  // HTTP request helpers
  static request() {
    return request(this.getApp().getHttpServer());
  }

  static authenticatedRequest(token: string) {
    const requestObj = this.request();
    return new Proxy(requestObj, {
      get: (target, prop) => {
        if (typeof target[prop] === 'function') {
          return (...args: any[]) => {
            const req = target[prop](...args);
            return req.set('Authorization', `Bearer ${token}`);
          };
        }
        return target[prop];
      },
    });
  }

  // Common test assertions
  static expectSuccessResponse(response: any, expectedData?: any) {
    expect(response.status).toBeLessThan(400);
    if (expectedData) {
      expect(response.body).toMatchObject(expectedData);
    }
  }

  static expectErrorResponse(response: any, expectedStatus: number, expectedMessage?: string) {
    expect(response.status).toBe(expectedStatus);
    if (expectedMessage) {
      expect(response.body.message).toContain(expectedMessage);
    }
  }

  static expectValidationError(response: any) {
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('message');
  }

  static expectUnauthorized(response: any) {
    expect(response.status).toBe(401);
  }

  static expectNotFound(response: any) {
    expect(response.status).toBe(404);
  }

  // Database state helpers
  static async countEntities<T>(entityClass: any): Promise<number> {
    const app = this.getApp();
    const repository = app.get<Repository<T>>(getRepositoryToken(entityClass));
    return await repository.count();
  }

  static async findEntity<T>(entityClass: any, criteria: any): Promise<T | null> {
    const app = this.getApp();
    const repository = app.get<Repository<T>>(getRepositoryToken(entityClass));
    return await repository.findOne({ where: criteria }) as T | null;
  }
}