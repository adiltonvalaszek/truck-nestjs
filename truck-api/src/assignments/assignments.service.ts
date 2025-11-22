import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Driver, DriverStatus } from '../drivers/entities/driver.entity';
import { Load, LoadStatus } from '../loads/entities/load.entity';
import { DriverLoadAssignment, AssignmentStatus } from './entities/driver-load-assignment.entity';
import { DriversService } from '../drivers/drivers.service';
import { LoadsService } from '../loads/loads.service';
import { PubSubPublisherService } from '../pubsub/pubsub-publisher.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentStatusDto } from './dto/update-assignment-status.dto';

@Injectable()
export class AssignmentsService {
  private readonly logger = new Logger(AssignmentsService.name);
  constructor(
    @InjectRepository(DriverLoadAssignment)
    private assignmentRepository: Repository<DriverLoadAssignment>,
    @InjectRepository(Driver)
    private driverRepository: Repository<Driver>,
    @InjectRepository(Load)
    private loadRepository: Repository<Load>,
    private dataSource: DataSource,
    private driversService: DriversService,
    private loadsService: LoadsService,
    private pubsubPublisher: PubSubPublisherService,
  ) {}

  async create(createAssignmentDto: CreateAssignmentDto) {
    const driver = await this.driversService.findById(
      createAssignmentDto.driverId,
    );

    if (driver.status !== 'AVAILABLE') {
      throw new BadRequestException('Driver is not available for assignment');
    }

    const activeAssignment = await this.assignmentRepository.findOne({
      where: {
        driverId: createAssignmentDto.driverId,
        status: AssignmentStatus.ASSIGNED,
      },
    });

    if (activeAssignment) {
      throw new BadRequestException(
        'Driver already has an active load assignment',
      );
    }

    const load = await this.loadRepository.findOne({
      where: { id: createAssignmentDto.loadId },
    });

    if (!load) {
      throw new NotFoundException('Load not found');
    }

    if (load.status !== 'PENDING') {
      throw new BadRequestException('Load is not available for assignment');
    }

    const assignment = await this.dataSource.transaction(async (manager) => {
      const assignmentRepo = manager.getRepository(DriverLoadAssignment);
      const driverRepo = manager.getRepository(Driver);
      const loadRepo = manager.getRepository(Load);

      const newAssignment = assignmentRepo.create({
        driverId: createAssignmentDto.driverId,
        loadId: createAssignmentDto.loadId,
        status: AssignmentStatus.ASSIGNED,
      });
      const savedAssignment = await assignmentRepo.save(newAssignment);

      await driverRepo.update(createAssignmentDto.driverId, { 
        status: DriverStatus.BUSY 
      });

      await loadRepo.update(createAssignmentDto.loadId, { 
        status: LoadStatus.ASSIGNED 
      });

      const fullAssignment = await assignmentRepo.findOne({
        where: { id: savedAssignment.id },
        relations: ['driver', 'load'],
      });

      return fullAssignment;
    });

    await this.loadsService.invalidateCache();

    try {
      await this.pubsubPublisher.publishLoadAssigned(assignment);
    } catch (error) {
      this.logger.error('Failed to publish event', error.stack);
      // Don't fail the request if pub/sub fails
    }

    return assignment;
  }

  async findById(id: string) {
    const assignment = await this.assignmentRepository.findOne({
      where: { id },
      relations: ['driver', 'load'],
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    return assignment;
  }

  async updateStatus(id: string, updateDto: UpdateAssignmentStatusDto) {
    const assignment = await this.findById(id);

    // Update assignment
    const updated = await this.dataSource.transaction(async (manager) => {
      const assignmentRepo = manager.getRepository(DriverLoadAssignment);
      const driverRepo = manager.getRepository(Driver);
      const loadRepo = manager.getRepository(Load);

      await assignmentRepo.update(id, {
        status: updateDto.status as AssignmentStatus,
        completedAt:
          updateDto.status === AssignmentStatus.COMPLETED || 
          updateDto.status === AssignmentStatus.CANCELLED
            ? new Date()
            : null,
      });

      if (
        updateDto.status === AssignmentStatus.COMPLETED ||
        updateDto.status === AssignmentStatus.CANCELLED
      ) {
        await driverRepo.update(assignment.driverId, {
          status: DriverStatus.AVAILABLE,
        });

        await loadRepo.update(assignment.loadId, {
          status:
            updateDto.status === AssignmentStatus.COMPLETED
              ? LoadStatus.DELIVERED
              : LoadStatus.CANCELLED,
        });
      }

      return await assignmentRepo.findOne({
        where: { id },
        relations: ['driver', 'load'],
      });
    });

    await this.loadsService.invalidateCache();

    return updated;
  }
}
