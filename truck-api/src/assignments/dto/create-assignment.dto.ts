import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAssignmentDto {
  @ApiProperty()
  @IsUUID()
  driverId: string;

  @ApiProperty()
  @IsUUID()
  loadId: string;
}
