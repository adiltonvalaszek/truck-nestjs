import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AssignmentStatus } from '../entities/driver-load-assignment.entity';

export class UpdateAssignmentStatusDto {
  @ApiProperty({ enum: AssignmentStatus })
  @IsEnum(AssignmentStatus)
  status: AssignmentStatus;
}
