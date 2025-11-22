import { Global, Module } from '@nestjs/common';
import { TypeOrmService } from './typeorm.service';
import { DataSource } from 'typeorm';

@Global()
@Module({
  providers: [
    {
      provide: TypeOrmService,
      useFactory: (dataSource: DataSource) => new TypeOrmService(dataSource),
      inject: [DataSource],
    },
  ],
  exports: [TypeOrmService],
})
export class TypeOrmModule {}