import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateWorkshopDto {
  @ApiProperty({ example: 'North Workshop' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: '123 Main Street, Medellin' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  address: string;
}
