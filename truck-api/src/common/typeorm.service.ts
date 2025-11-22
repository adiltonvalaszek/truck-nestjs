import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class TypeOrmService {
  constructor(public readonly dataSource: DataSource) {}
}