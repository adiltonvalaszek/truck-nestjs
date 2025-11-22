import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DriversModule } from './drivers/drivers.module';
import { LoadsModule } from './loads/loads.module';
import { AssignmentsModule } from './assignments/assignments.module';
import { CacheModule } from './cache/cache.module';
import { PubSubModule } from './pubsub/pubsub.module';
import { HealthModule } from './health/health.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { User } from './users/entities/user.entity';
import { Driver } from './drivers/entities/driver.entity';
import { Load } from './loads/entities/load.entity';
import { DriverLoadAssignment } from './assignments/entities/driver-load-assignment.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres',
        url: process.env.DATABASE_URL,
        entities: [User, Driver, Load, DriverLoadAssignment],
        synchronize: false,
        migrationsRun: false,
        logging: process.env.NODE_ENV === 'development',
      }),
    }),
    AuthModule,
    UsersModule,
    DriversModule,
    LoadsModule,
    AssignmentsModule,
    CacheModule,
    PubSubModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
