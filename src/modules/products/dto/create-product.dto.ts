import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'Arroz' })
  @IsString()
  name: string;

  @ApiProperty({ example: '4000' })
  @IsNumber()
  price: number;
}
