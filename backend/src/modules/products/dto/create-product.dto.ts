import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsArray,
  IsOptional,
  IsBoolean,
  ValidateNested,
  IsInt,
  Min,
  ArrayMaxSize,
  IsEnum,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Currency, ProductStatus } from '@prisma/client';

export class CreateItemSpecValueDto {
  @ApiProperty({
    description: 'The ID of the item spec',
    example: 1,
  })
  @IsInt()
  @Min(1)
  itemSpecId: number;

  @ApiProperty({
    description: 'The value for the spec (type depends on spec type)',
    oneOf: [
      { type: 'string' },
      { type: 'number' },
      { type: 'boolean' },
      { type: 'string', format: 'date-time' },
      { type: 'object' },
    ],
    example: 'Sample text value',
  })
  @IsOptional()
  @Transform(({ value }) => {
    // Ensure the value is properly transformed
    if (value === null || value === undefined) {
      return value;
    }
    return value;
  })
  value: any; // Use 'any' to allow all types since validation happens in service
}

export class CreateProductDto {
  @ApiProperty({
    description: 'The name of the product',
    example: 'Premium Laptop',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'The barcode of the product',
    example: '9789910701504',
  })
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiProperty({
    description: 'The price of the product',
    example: 1299.99,
  })
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  price: number;

  @ApiProperty({
    description: 'The quantity of the product',
    example: 1,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_000_000_000)
  quantity: number = 0;

  @ApiProperty({
    description: 'The currency of the product',
    example: Currency.UZS,
    default: Currency.UZS,
  })
  @IsString()
  @IsNotEmpty()
  @IsEnum(Currency)
  currency: Currency = Currency.UZS;

  @ApiProperty({
    description: 'The status of the product',
    enum: ProductStatus,
    default: ProductStatus.ACTIVE,
    example: ProductStatus.ACTIVE,
  })
  @IsString()
  @IsNotEmpty()
  @IsEnum(ProductStatus)
  status: ProductStatus = ProductStatus.ACTIVE;

  @ApiPropertyOptional({
    description: 'Array of file IDs for product images',
    type: [Number],
    example: [1, 2, 3],
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @ArrayMaxSize(10)
  images?: number[];

  @ApiProperty({
    description: 'The category ID for the product',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  categoryId?: number;

  @ApiProperty({
    description: 'Array of item spec values for the product',
    type: [CreateItemSpecValueDto],
    example: [
      { itemSpecId: 1, value: 'Intel i7' },
      { itemSpecId: 2, value: 16 },
      { itemSpecId: 3, value: true },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateItemSpecValueDto)
  itemSpecValues: CreateItemSpecValueDto[];

  @ApiPropertyOptional({
    description:
      'Whether to automatically publish this product to the organization\'s connected Telegram channel (only takes effect if a channel is connected and status is ACTIVE)',
    default: true,
    example: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  autoPublish: boolean = true;
}
