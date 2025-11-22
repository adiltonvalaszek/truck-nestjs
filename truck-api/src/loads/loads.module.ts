import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoadsService } from './loads.service';
import { LoadsController } from './loads.controller';
import { Load } from './entities/load.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Load])],
  controllers: [LoadsController],
  providers: [LoadsService],
  exports: [LoadsService],
})
export class LoadsModule {}
