import { Test, TestingModule } from '@nestjs/testing';
import { LoadsController } from './loads.controller';
import { LoadsService } from './loads.service';
import { CreateLoadDto } from './dto/create-load.dto';
import { Load } from './entities/load.entity';
import { LoadStatus } from './entities/load.entity';

describe('LoadsController', () => {
  let controller: LoadsController;
  let loadsService: LoadsService;

  const mockLoadsService = {
    create: jest.fn(),
    findAll: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LoadsController],
      providers: [
        {
          provide: LoadsService,
          useValue: mockLoadsService,
        },
      ],
    }).compile();

    controller = module.get<LoadsController>(LoadsController);
    loadsService = module.get<LoadsService>(LoadsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a load successfully', async () => {
      const createLoadDto: CreateLoadDto = {
        origin: 'New York, NY',
        destination: 'Boston, MA',
        cargoType: 'Electronics',
      };

      const mockLoad = {
        id: 'load-uuid',
        origin: 'New York, NY',
        destination: 'Boston, MA',
        cargoType: 'Electronics',
        status: LoadStatus.PENDING,
        createdAt: new Date(),
        assignments: [],
        events: [],
      } as Load;

      mockLoadsService.create.mockResolvedValue(mockLoad);

      const result = await controller.create(createLoadDto);

      expect(loadsService.create).toHaveBeenCalledWith(createLoadDto);
      expect(result).toEqual(mockLoad);
    });

    it('should handle service errors on create', async () => {
      const createLoadDto: CreateLoadDto = {
        origin: 'New York, NY',
        destination: 'Boston, MA',
        cargoType: 'Electronics',
      };

      mockLoadsService.create.mockRejectedValue(new Error('Database error'));

      await expect(controller.create(createLoadDto)).rejects.toThrow('Database error');
      expect(loadsService.create).toHaveBeenCalledWith(createLoadDto);
    });
  });

  describe('findAll', () => {
    it('should return an array of loads', async () => {
      const mockLoads = [
        {
          id: 'load-1',
          origin: 'New York, NY',
          destination: 'Boston, MA',
          cargoType: 'Electronics',
          status: LoadStatus.PENDING,
          createdAt: new Date(),
        },
        {
          id: 'load-2',
          origin: 'Chicago, IL',
          destination: 'Detroit, MI',
          cargoType: 'Furniture',
          status: LoadStatus.ASSIGNED,
          createdAt: new Date(),
        },
      ] as Load[];

      mockLoadsService.findAll.mockResolvedValue(mockLoads);

      const result = await controller.findAll();

      expect(loadsService.findAll).toHaveBeenCalled();
      expect(result).toEqual(mockLoads);
    });

    it('should return empty array when no loads exist', async () => {
      mockLoadsService.findAll.mockResolvedValue([]);

      const result = await controller.findAll();

      expect(loadsService.findAll).toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should handle service errors on findAll', async () => {
      mockLoadsService.findAll.mockRejectedValue(new Error('Database connection error'));

      await expect(controller.findAll()).rejects.toThrow('Database connection error');
      expect(loadsService.findAll).toHaveBeenCalled();
    });
  });
});