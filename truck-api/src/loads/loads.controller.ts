import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { LoadsService } from './loads.service';
import { CreateLoadDto } from './dto/create-load.dto';

@ApiTags('Loads')
@ApiBearerAuth()
@Controller('loads')
export class LoadsController {
  constructor(private loadsService: LoadsService) {}

  @Post()
  create(@Body() createLoadDto: CreateLoadDto) {
    return this.loadsService.create(createLoadDto);
  }

  @Get()
  findAll() {
    return this.loadsService.findAll();
  }
}
