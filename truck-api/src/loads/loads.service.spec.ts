import { Test, TestingModule } from '@nestjs/testing';
import { LoadsService } from './loads.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Load, LoadStatus } from './entities/load.entity';
import { Repository } from 'typeorm';
import { RedisService } from '../cache/redis.service';
import { NotFoundException } from '@nestjs/common';

describe('LoadsService', () => {
  let service: LoadsService;
  let loadRepository: Repository<Load>;
  let redisService: RedisService;

  const mockLoad: Load = {
    id: '1',
    origin: 'New York',
    destination: 'Los Angeles',
    cargoType: 'ELECTRONICS',
    status: LoadStatus.PENDING,
    createdAt: new Date(),
    assignments: [],
  };

  const mockLoadRepository = {
    create: jest.fn().mockReturnValue(mockLoad),
    save: jest.fn().mockResolvedValue(mockLoad),
    find: jest.fn().mockResolvedValue([mockLoad]),
    findOne: jest.fn().mockResolvedValue(mockLoad),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoadsService,
        {
          provide: getRepositoryToken(Load),
          useValue: mockLoadRepository,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<LoadsService>(LoadsService);
    loadRepository = module.get<Repository<Load>>(getRepositoryToken(Load));
    redisService = module.get<RedisService>(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new load', async () => {
      const createLoadDto = {
        origin: 'New York',
        destination: 'Los Angeles',
        cargoType: 'ELECTRONICS',
      };

      const result = await service.create(createLoadDto);

      expect(result).toEqual(mockLoad);
      expect(loadRepository.create).toHaveBeenCalledWith({
        ...createLoadDto,
        status: LoadStatus.PENDING,
      });
      expect(loadRepository.save).toHaveBeenCalled();
      expect(redisService.del).toHaveBeenCalledWith('loads:all');
    });
  });

  describe('findAll', () => {
    it('should return cached loads if available', async () => {
      const cachedLoad = { ...mockLoad, createdAt: mockLoad.createdAt.toISOString() };
      mockRedisService.get.mockResolvedValue(JSON.stringify([cachedLoad]));

      const result = await service.findAll();

      expect(result).toEqual([cachedLoad]);
      expect(redisService.get).toHaveBeenCalledWith('loads:all');
      expect(loadRepository.find).not.toHaveBeenCalled();
    });

    it('should return loads from database if cache miss', async () => {
      mockRedisService.get.mockResolvedValue(null);

      const result = await service.findAll();

      expect(result).toEqual([mockLoad]);
      expect(loadRepository.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
      });
      expect(redisService.set).toHaveBeenCalledWith(
        'loads:all',
        JSON.stringify([mockLoad]),
        60,
      );
    });
  });

  describe('findById', () => {
    it('should return a load by id', async () => {
      const result = await service.findById('1');

      expect(result).toEqual(mockLoad);
      expect(loadRepository.findOne).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('should throw NotFoundException if load not found', async () => {
      mockLoadRepository.findOne.mockResolvedValue(null);

      await expect(service.findById('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a load', async () => {
      const updateDto = { status: LoadStatus.IN_TRANSIT };
      mockLoadRepository.findOne.mockResolvedValue({ ...mockLoad, ...updateDto });

      const result = await service.update('1', updateDto);

      expect(result.status).toBe(LoadStatus.IN_TRANSIT);
      expect(loadRepository.update).toHaveBeenCalledWith('1', updateDto);
      expect(redisService.del).toHaveBeenCalledWith('loads:all');
    });
  });
});