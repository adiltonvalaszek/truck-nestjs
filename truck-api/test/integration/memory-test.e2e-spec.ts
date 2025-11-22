import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { newDb } from 'pg-mem';
import { User } from '@/users/entities/user.entity';
import { Driver } from '@/drivers/entities/driver.entity';
import { Load } from '@/loads/entities/load.entity';
import { DriverLoadAssignment } from '@/assignments/entities/driver-load-assignment.entity';
import { UsersModule } from '@/users/users.module';
import { AuthModule } from '@/auth/auth.module';
import { HealthModule } from '@/health/health.module';
import request from 'supertest';
import './setup';

describe('Memory Database Test', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const db = newDb();

    // Add required functions
    db.public.registerFunction({
      name: 'uuid_generate_v4',
      returns: 'uuid' as any,
      implementation: () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      },
    });

    db.public.registerFunction({
      name: 'version',
      returns: 'text' as any,
      implementation: () => 'PostgreSQL 15.0 (pg-mem)',
    });

    db.public.registerFunction({
      name: 'current_database',
      returns: 'text' as any,
      implementation: () => 'test_db',
    });

    db.public.registerFunction({
      name: 'current_schema',
      returns: 'text' as any,
      implementation: () => 'public',
    });

    db.public.registerFunction({
      name: 'now',
      returns: 'timestamptz' as any,
      implementation: () => new Date(),
    });

    // Create TypeORM DataSource using pg-mem
    const dataSource = db.adapters.createTypeormDataSource({
      type: 'postgres',
      entities: [User, Driver, Load, DriverLoadAssignment],
      synchronize: true,
      logging: false,
    });

    await dataSource.initialize();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          synchronize: false, // Already synchronized
          logging: false,
          entities: [User, Driver, Load, DriverLoadAssignment],
        }),
        HealthModule,
        AuthModule,
        UsersModule,
      ],
    })
    .overrideProvider(DataSource)
    .useValue(dataSource)
    .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  }, 60000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).not.toHaveProperty('service');
    });
  });
});