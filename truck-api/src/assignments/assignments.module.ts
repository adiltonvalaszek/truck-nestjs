import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssignmentsService } from './assignments.service';
import { AssignmentsController } from './assignments.controller';
import { DriversModule } from '../drivers/drivers.module';
import { LoadsModule } from '../loads/loads.module';
import { Driver } from '../drivers/entities/driver.entity';
import { Load } from '../loads/entities/load.entity';
import { DriverLoadAssignment } from './entities/driver-load-assignment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Driver, Load, DriverLoadAssignment]),
    DriversModule, 
    LoadsModule
  ],
  controllers: [AssignmentsController],
  providers: [AssignmentsService],
})
export class AssignmentsModule {}
