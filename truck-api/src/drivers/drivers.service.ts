import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Driver, DriverStatus } from './entities/driver.entity';
import { CreateDriverDto } from './dto/create-driver.dto';

@Injectable()
export class DriversService {
  constructor(
    @InjectRepository(Driver)
    private driverRepository: Repository<Driver>,
  ) {}

  async create(createDriverDto: CreateDriverDto) {
    const existingDriver = await this.driverRepository.findOne({
      where: { licenseNumber: createDriverDto.licenseNumber },
    });

    if (existingDriver) {
      throw new ConflictException('License number already exists');
    }

    const driver = this.driverRepository.create({
      name: createDriverDto.name,
      licenseNumber: createDriverDto.licenseNumber,
      status: DriverStatus.AVAILABLE,
    });

    return this.driverRepository.save(driver);
  }

  async findById(id: string) {
    const driver = await this.driverRepository.findOne({
      where: { id },
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    return driver;
  }

  async updateStatus(id: string, status: DriverStatus) {
    await this.findById(id); // Check if driver exists
    
    await this.driverRepository.update(id, { status });
    
    return this.driverRepository.findOne({ where: { id } });
  }
}
