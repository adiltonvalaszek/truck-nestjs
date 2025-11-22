import { Test, TestingModule } from '@nestjs/testing';
import { DriversController } from './drivers.controller';
import { DriversService } from './drivers.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { Driver } from './entities/driver.entity';

describe('DriversController', () => {
  let controller: DriversController;
  let driversService: DriversService;

  const mockDriversService = {
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DriversController],
      providers: [
        {
          provide: DriversService,
          useValue: mockDriversService,
        },
      ],
    }).compile();

    controller = module.get<DriversController>(DriversController);
    driversService = module.get<DriversService>(DriversService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a driver successfully', async () => {
      const createDriverDto: CreateDriverDto = {
        name: 'John Doe',
        licenseNumber: 'DL123456',
      };

      const mockDriver = {
        id: 'driver-uuid',
        name: 'John Doe',
        licenseNumber: 'DL123456',
        status: 'AVAILABLE',
        createdAt: new Date(),
        assignments: [],
      } as Driver;

      mockDriversService.create.mockResolvedValue(mockDriver);

      const result = await controller.create(createDriverDto);

      expect(driversService.create).toHaveBeenCalledWith(createDriverDto);
      expect(result).toEqual(mockDriver);
    });

    it('should handle service errors', async () => {
      const createDriverDto: CreateDriverDto = {
        name: 'John Doe',
        licenseNumber: 'DL123456',
      };

      mockDriversService.create.mockRejectedValue(new Error('Database error'));

      await expect(controller.create(createDriverDto)).rejects.toThrow('Database error');
      expect(driversService.create).toHaveBeenCalledWith(createDriverDto);
    });
  });
});