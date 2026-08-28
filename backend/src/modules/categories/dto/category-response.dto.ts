import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FieldType } from '@prisma/client';

export class ItemSpecDto {
  @ApiProperty({ description: 'ID of the item spec', example: 1 })
  id: number;

  @ApiProperty({ description: 'Name of the item spec', example: 'Size' })
  name: string;

  @ApiProperty({ description: 'Type of the spec field', enum: FieldType })
  type: FieldType;

  @ApiProperty({ description: 'Whether this field is required', example: true })
  required: boolean;

  @ApiPropertyOptional({ description: 'Options for ENUM type', type: [String] })
  options?: string[];
}

export class CategoryResponseDto {
  @ApiProperty({ description: 'Category ID', example: 1 })
  id: number;

  @ApiProperty({ description: 'Uzbek name', example: 'Elektronika' })
  name_uz: string;

  @ApiProperty({ description: 'Russian name', example: 'Электроника' })
  name_ru: string;

  @ApiProperty({ description: 'English name', example: 'Electronics' })
  name_en: string;

  @ApiProperty({ description: 'Whether this is a leaf category', example: true })
  isLeaf: boolean;

  @ApiPropertyOptional({ description: 'Parent category ID', example: null })
  parentId: number | null;

  @ApiProperty({ description: 'Item specs attached to this category', type: [ItemSpecDto] })
  itemSpecs: ItemSpecDto[];
}
