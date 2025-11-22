import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLoadDto {
  @ApiProperty()
  @IsString()
  @MinLength(3)
  origin: string;

  @ApiProperty()
  @IsString()
  @MinLength(3)
  destination: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  cargoType: string;
}
