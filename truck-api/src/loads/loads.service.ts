import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Load, LoadStatus } from './entities/load.entity';
import { RedisService } from '../cache/redis.service';
import { CreateLoadDto } from './dto/create-load.dto';

const CACHE_KEY = 'loads:all';
const CACHE_TTL = 60; // 60 seconds

@Injectable()
export class LoadsService {
  private readonly logger = new Logger(LoadsService.name);

  constructor(
    @InjectRepository(Load)
    private loadRepository: Repository<Load>,
    private redis: RedisService,
  ) {}

  async create(createLoadDto: CreateLoadDto) {
    const load = this.loadRepository.create({
      origin: createLoadDto.origin,
      destination: createLoadDto.destination,
      cargoType: createLoadDto.cargoType,
      status: LoadStatus.PENDING,
    });

    const savedLoad = await this.loadRepository.save(load);

    await this.invalidateCache();

    return savedLoad;
  }

  async findAll() {
    const cached = await this.redis.get(CACHE_KEY);
    
    if (cached) {
      this.logger.debug('✅ Cache HIT for loads');
      return JSON.parse(cached);
    }

    this.logger.debug('❌ Cache MISS for loads - querying database');
    
    const loads = await this.loadRepository.find({
      order: { createdAt: 'DESC' },
    });

    await this.redis.set(CACHE_KEY, JSON.stringify(loads), CACHE_TTL);

    return loads;
  }

  async findById(id: string) {
    const load = await this.loadRepository.findOne({
      where: { id },
    });

    if (!load) {
      throw new NotFoundException('Load not found');
    }

    return load;
  }

  async update(id: string, updateLoadDto: Partial<Load>) {
    const load = await this.findById(id);
    
    await this.loadRepository.update(id, updateLoadDto);
    
    await this.invalidateCache();

    return this.loadRepository.findOne({ where: { id } });
  }

  async invalidateCache() {
    await this.redis.del(CACHE_KEY);
    this.logger.debug('🗑️  Cache invalidated for loads');
  }
}
