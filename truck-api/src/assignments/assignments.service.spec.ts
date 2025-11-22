import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { AssignmentsService } from './assignments.service';
import { DriversService } from '../drivers/drivers.service';
import { LoadsService } from '../loads/loads.service';
import { PubSubPublisherService } from '../pubsub/pubsub-publisher.service';
import { DriverLoadAssignment, AssignmentStatus } from './entities/driver-load-assignment.entity';
import { Driver, DriverStatus } from '../drivers/entities/driver.entity';
import { Load, LoadStatus } from '../loads/entities/load.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';

const mockPubSubPublisher = {
  publishLoadAssigned: jest.fn(),
  publishMessage: jest.fn(),
};

describe('AssignmentsService', () => {
  let service: AssignmentsService;
  let assignmentRepository: Repository<DriverLoadAssignment>;
  let driverRepository: Repository<Driver>;
  let loadRepository: Repository<Load>;
  let driversService: jest.Mocked<DriversService>;
  let loadsService: jest.Mocked<LoadsService>;
  let pubsubService: typeof mockPubSubPublisher;
  let dataSource: DataSource;

  const mockDriversService = {
    findById: jest.fn(),
    create: jest.fn(),
    updateStatus: jest.fn(),
  };

  const mockLoadsService = {
    findAll: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    invalidateCache: jest.fn(),
  };

  const mockAssignmentRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const mockDriverRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const mockLoadRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const mockEntityManager = {
    getRepository: jest.fn((entity) => {
      if (entity === DriverLoadAssignment) return mockAssignmentRepository;
      if (entity === Driver) return mockDriverRepository;
      if (entity === Load) return mockLoadRepository;
      return null;
    }),
  };

  const mockDataSource = {
    transaction: jest.fn((cb) => cb(mockEntityManager)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssignmentsService,
        {
          provide: getRepositoryToken(DriverLoadAssignment),
          useValue: mockAssignmentRepository,
        },
        {
          provide: getRepositoryToken(Driver),
          useValue: mockDriverRepository,
        },
        {
          provide: getRepositoryToken(Load),
          useValue: mockLoadRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: DriversService,
          useValue: mockDriversService,
        },
        {
          provide: LoadsService,
          useValue: mockLoadsService,
        },
        {
          provide: PubSubPublisherService,
          useValue: mockPubSubPublisher,
        },
      ],
    }).compile();

    service = module.get<AssignmentsService>(AssignmentsService);
    assignmentRepository = module.get<Repository<DriverLoadAssignment>>(getRepositoryToken(DriverLoadAssignment));
    driverRepository = module.get<Repository<Driver>>(getRepositoryToken(Driver));
    loadRepository = module.get<Repository<Load>>(getRepositoryToken(Load));
    dataSource = module.get<DataSource>(DataSource);
    driversService = module.get(DriversService);
    loadsService = module.get(LoadsService);
    pubsubService = module.get(PubSubPublisherService);

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const mockDriver = {
      id: 'driver-1',
      name: 'Test Driver',
      licenseNumber: 'DRV-001',
      status: DriverStatus.AVAILABLE,
      createdAt: new Date(),
      assignments: [],
    };

    const mockLoad = {
      id: 'load-1',
      origin: 'São Paulo',
      destination: 'Rio de Janeiro',
      cargoType: 'Electronics',
      status: LoadStatus.PENDING,
      createdAt: new Date(),
      assignments: [],
      events: [],
    };

    const mockAssignment = {
      id: 'assignment-1',
      driverId: 'driver-1',
      loadId: 'load-1',
      assignedAt: new Date(),
      completedAt: null,
      status: AssignmentStatus.ASSIGNED,
      driver: mockDriver,
      load: mockLoad,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should create assignment successfully', async () => {
      // Mock driver exists and is available
      driversService.findById.mockResolvedValue(mockDriver);
      
      // Mock load exists and is pending
      mockLoadRepository.findOne.mockResolvedValue(mockLoad);
      
      // Mock no existing active assignment
      mockAssignmentRepository.findOne.mockResolvedValueOnce(null);
      
      // Mock transaction results
      mockAssignmentRepository.create.mockReturnValue(mockAssignment);
      mockAssignmentRepository.save.mockResolvedValue(mockAssignment);
      mockAssignmentRepository.findOne.mockResolvedValue(mockAssignment); // For full assignment fetch
      mockDriverRepository.update.mockResolvedValue({ affected: 1 });
      mockLoadRepository.update.mockResolvedValue({ affected: 1 });

      // Mock cache invalidation
      loadsService.invalidateCache.mockResolvedValue(undefined);

      const result = await service.create({
        driverId: 'driver-1',
        loadId: 'load-1',
      });

      expect(result).toEqual(mockAssignment);

      // Verify driver was checked
      expect(driversService.findById).toHaveBeenCalledWith('driver-1');

      // Verify load was checked
      expect(mockLoadRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'load-1' },
      });

      // Verify existing assignment was checked
      expect(mockAssignmentRepository.findOne).toHaveBeenCalledWith({
        where: {
          driverId: 'driver-1',
          status: AssignmentStatus.ASSIGNED,
        },
      });

      // Verify transaction steps
      expect(mockAssignmentRepository.create).toHaveBeenCalled();
      expect(mockAssignmentRepository.save).toHaveBeenCalled();
      expect(mockDriverRepository.update).toHaveBeenCalledWith('driver-1', { status: DriverStatus.BUSY });
      expect(mockLoadRepository.update).toHaveBeenCalledWith('load-1', { status: LoadStatus.ASSIGNED });

      // Verify cache was invalidated
      expect(loadsService.invalidateCache).toHaveBeenCalled();

      // Verify Pub/Sub was called
      expect(pubsubService.publishLoadAssigned).toHaveBeenCalledWith(mockAssignment);
    });

    it('should throw NotFoundException when driver does not exist', async () => {
      driversService.findById.mockRejectedValue(new NotFoundException('Driver not found'));

      await expect(
        service.create({
          driverId: 'non-existent-driver',
          loadId: 'load-1',
        }),
      ).rejects.toThrow(NotFoundException);

      expect(driversService.findById).toHaveBeenCalledWith('non-existent-driver');
    });

    it('should throw NotFoundException when load does not exist', async () => {
      driversService.findById.mockResolvedValue(mockDriver);
      mockAssignmentRepository.findOne.mockResolvedValue(null);
      mockLoadRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create({
          driverId: 'driver-1',
          loadId: 'non-existent-load',
        }),
      ).rejects.toThrow(NotFoundException);

      expect(mockLoadRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'non-existent-load' },
      });
    });

    it('should throw BadRequestException when driver is not available', async () => {
      const busyDriver = { ...mockDriver, status: DriverStatus.BUSY };
      driversService.findById.mockResolvedValue(busyDriver);
      mockAssignmentRepository.findOne.mockResolvedValue(null);
      mockLoadRepository.findOne.mockResolvedValue(mockLoad);

      await expect(
        service.create({
          driverId: 'driver-1',
          loadId: 'load-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when load is not pending', async () => {
      const assignedLoad = { ...mockLoad, status: LoadStatus.ASSIGNED };
      driversService.findById.mockResolvedValue(mockDriver);
      mockAssignmentRepository.findOne.mockResolvedValue(null);
      mockLoadRepository.findOne.mockResolvedValue(assignedLoad);

      await expect(
        service.create({
          driverId: 'driver-1',
          loadId: 'load-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when driver already has active assignment', async () => {
      driversService.findById.mockResolvedValue(mockDriver);
      mockLoadRepository.findOne.mockResolvedValue(mockLoad);
      
      // Mock existing active assignment
      mockAssignmentRepository.findOne.mockResolvedValue({
        id: 'existing-assignment',
        driverId: 'driver-1',
        loadId: 'other-load',
        status: AssignmentStatus.ASSIGNED,
        assignedAt: new Date(),
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        service.create({
          driverId: 'driver-1',
          loadId: 'load-1',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockAssignmentRepository.findOne).toHaveBeenCalledWith({
        where: {
          driverId: 'driver-1',
          status: AssignmentStatus.ASSIGNED,
        },
      });
    });
  });

  describe('findById', () => {
    it('should return assignment when it exists', async () => {
      const mockAssignment = {
        id: 'assignment-1',
        driverId: 'driver-1',
        loadId: 'load-1',
        status: AssignmentStatus.ASSIGNED,
        assignedAt: new Date(),
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        driver: {
          id: 'driver-1',
          name: 'Test Driver',
          licenseNumber: 'DRV-001',
          status: DriverStatus.BUSY,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        load: {
          id: 'load-1',
          origin: 'São Paulo',
          destination: 'Rio de Janeiro',
          cargoType: 'Electronics',
          status: LoadStatus.ASSIGNED,
          createdAt: new Date(),
          updatedAt: new Date(),
          price: 1000,
          weight: 100,
        },
      };

      mockAssignmentRepository.findOne.mockResolvedValue(mockAssignment);

      const result = await service.findById('assignment-1');

      expect(result).toEqual(mockAssignment);
      expect(mockAssignmentRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'assignment-1' },
        relations: ['driver', 'load'],
      });
    });

    it('should throw NotFoundException when assignment does not exist', async () => {
      mockAssignmentRepository.findOne.mockResolvedValue(null);

      await expect(service.findById('non-existent-assignment')).rejects.toThrow(
        NotFoundException,
      );

      expect(mockAssignmentRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'non-existent-assignment' },
        relations: ['driver', 'load'],
      });
    });
  });

  describe('updateStatus', () => {
    const mockAssignment = {
      id: 'assignment-1',
      driverId: 'driver-1',
      loadId: 'load-1',
      status: AssignmentStatus.ASSIGNED,
      assignedAt: new Date(),
      completedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      driver: {
        id: 'driver-1',
        status: DriverStatus.BUSY,
      },
      load: {
        id: 'load-1',
        status: LoadStatus.ASSIGNED,
      }
    };

    it('should update assignment status to COMPLETED', async () => {
      mockAssignmentRepository.findOne.mockResolvedValue(mockAssignment);
      
      const updatedAssignment = {
        ...mockAssignment,
        status: AssignmentStatus.COMPLETED,
        completedAt: new Date(),
      };
      
      // Mock transaction results
      mockAssignmentRepository.update.mockResolvedValue({ affected: 1 });
      mockDriverRepository.update.mockResolvedValue({ affected: 1 });
      mockLoadRepository.update.mockResolvedValue({ affected: 1 });
      mockAssignmentRepository.findOne.mockResolvedValue(updatedAssignment); // For return value

      const result = await service.updateStatus('assignment-1', {
        status: AssignmentStatus.COMPLETED,
      });

      expect(result).toEqual(updatedAssignment);
      expect(mockDriverRepository.update).toHaveBeenCalledWith('driver-1', { status: DriverStatus.AVAILABLE });
      expect(mockLoadRepository.update).toHaveBeenCalledWith('load-1', { status: LoadStatus.DELIVERED });
    });

    it('should update assignment status to CANCELLED', async () => {
      mockAssignmentRepository.findOne.mockResolvedValue(mockAssignment);
      
      const updatedAssignment = {
        ...mockAssignment,
        status: AssignmentStatus.CANCELLED,
        completedAt: new Date(),
      };
      
      // Mock transaction results
      mockAssignmentRepository.update.mockResolvedValue({ affected: 1 });
      mockDriverRepository.update.mockResolvedValue({ affected: 1 });
      mockLoadRepository.update.mockResolvedValue({ affected: 1 });
      mockAssignmentRepository.findOne.mockResolvedValue(updatedAssignment); // For return value

      const result = await service.updateStatus('assignment-1', {
        status: AssignmentStatus.CANCELLED,
      });

      expect(result).toEqual(updatedAssignment);
      expect(mockDriverRepository.update).toHaveBeenCalledWith('driver-1', { status: DriverStatus.AVAILABLE });
      expect(mockLoadRepository.update).toHaveBeenCalledWith('load-1', { status: LoadStatus.CANCELLED });
    });

    it('should throw NotFoundException when assignment does not exist', async () => {
      mockAssignmentRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateStatus('non-existent-assignment', {
          status: AssignmentStatus.COMPLETED,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});