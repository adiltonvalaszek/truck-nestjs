import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { DriversService } from './drivers.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Driver, DriverStatus } from './entities/driver.entity';

describe('DriversService', () => {
  let service: DriversService;
  let driverRepository: jest.Mocked<Repository<Driver>>;

  const mockDriver = {
    id: 'driver-1',
    name: 'Test Driver',
    licenseNumber: 'DRV-001',
    status: DriverStatus.AVAILABLE,
    createdAt: new Date(),
    assignments: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DriversService,
        {
          provide: getRepositoryToken(Driver),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DriversService>(DriversService);
    driverRepository = module.get(getRepositoryToken(Driver));

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDriverDto = {
      name: 'New Driver',
      licenseNumber: 'DRV-002',
    };

    it('should create driver successfully', async () => {
      // Mock no existing driver with same license number
      const createdDriver = {
        id: 'driver-2',
        ...createDriverDto,
        status: DriverStatus.AVAILABLE,
        createdAt: new Date(),
        assignments: [],
      };

      driverRepository.findOne.mockResolvedValue(null);
      driverRepository.create.mockReturnValue(createdDriver);
      driverRepository.save = jest.fn().mockResolvedValue(createdDriver);


      const result = await service.create(createDriverDto);

      expect(result).toEqual(createdDriver);
      expect(driverRepository.findOne).toHaveBeenCalledWith({
        where: { licenseNumber: createDriverDto.licenseNumber },
      });
      expect(driverRepository.create).toHaveBeenCalledWith({
        name: createDriverDto.name,
        licenseNumber: createDriverDto.licenseNumber,
        status: DriverStatus.AVAILABLE,
      });
      expect(driverRepository.save).toHaveBeenCalledWith(createdDriver);
    });

    it('should throw ConflictException when license number already exists', async () => {
      // Mock existing driver with same license number
      driverRepository.findOne.mockResolvedValue(mockDriver);

      await expect(service.create(createDriverDto)).rejects.toThrow(ConflictException);

      expect(driverRepository.findOne).toHaveBeenCalledWith({
        where: { licenseNumber: createDriverDto.licenseNumber },
      });
      expect(driverRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return driver when it exists', async () => {
      driverRepository.findOne.mockResolvedValue(mockDriver);

      const result = await service.findById('driver-1');

      expect(result).toEqual(mockDriver);
      expect(driverRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'driver-1' },
      });
    });

    it('should throw NotFoundException when driver does not exist', async () => {
      driverRepository.findOne.mockResolvedValue(null);

      await expect(service.findById('non-existent-driver')).rejects.toThrow(NotFoundException);

      expect(driverRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'non-existent-driver' },
      });
    });
  });

  describe('updateStatus', () => {
    it('should update driver status successfully', async () => {
      const updatedDriver = {
        ...mockDriver,
        status: DriverStatus.BUSY,
        assignments: [],
      };

      driverRepository.findOne
        .mockResolvedValueOnce(mockDriver) // For findById check
        .mockResolvedValueOnce(updatedDriver); // For return value

      driverRepository.update.mockResolvedValue({ affected: 1 } as any);

      const result = await service.updateStatus('driver-1', DriverStatus.BUSY);

      expect(result).toEqual(updatedDriver);
      expect(driverRepository.update).toHaveBeenCalledWith('driver-1', { status: DriverStatus.BUSY });
    });

    it('should handle different status transitions', async () => {
      const statusTransitions = [
        { from: DriverStatus.AVAILABLE, to: DriverStatus.BUSY },
        { from: DriverStatus.BUSY, to: DriverStatus.AVAILABLE },
        { from: DriverStatus.AVAILABLE, to: DriverStatus.INACTIVE },
        { from: DriverStatus.INACTIVE, to: DriverStatus.AVAILABLE },
      ];

      for (const { from, to } of statusTransitions) {
        const driverBefore = { ...mockDriver, status: from, assignments: [] };
        const driverAfter = { ...mockDriver, status: to, assignments: [] };

        driverRepository.findOne
          .mockResolvedValueOnce(driverBefore) // For findById check
          .mockResolvedValueOnce(driverAfter); // For return value
        
        driverRepository.update.mockResolvedValue({ affected: 1 } as any);

        const result = await service.updateStatus('driver-1', to);

        expect(result).toEqual(driverAfter);
        expect(driverRepository.update).toHaveBeenCalledWith('driver-1', { status: to });
      }
    });
  });
});