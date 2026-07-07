import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CompleteBarcodeEntryDto {
  @ApiProperty({ example: 'Coca-Cola 0.5L' })
  @IsString()
  @IsNotEmpty()
  productName: string;

  @ApiPropertyOptional({ example: 'Ichimliklar / Gazlangan ichimliklar' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'Coca-Cola' })
  @IsOptional()
  @IsString()
  brandName?: string;

  @ApiPropertyOptional({ example: 'Ichimliklar' })
  @IsOptional()
  @IsString()
  categoryName?: string;

  @ApiPropertyOptional({ example: 'dona' })
  @IsOptional()
  @IsString()
  unitName?: string;
}
