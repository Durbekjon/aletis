import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  FulfillmentMode,
  DeliveryMethod,
  DeliveryFeeType,
} from '@prisma/client';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class UpsertFulfillmentSettingsDto {
  @ApiProperty({ enum: FulfillmentMode, example: FulfillmentMode.DELIVERY })
  @IsEnum(FulfillmentMode)
  fulfillmentMode: FulfillmentMode;

  @ApiPropertyOptional({
    enum: DeliveryMethod,
    example: DeliveryMethod.MERCHANT,
    nullable: true,
  })
  @IsEnum(DeliveryMethod)
  @IsOptional()
  deliveryMethod?: DeliveryMethod | null;

  @ApiPropertyOptional({
    enum: DeliveryFeeType,
    example: DeliveryFeeType.FIXED,
    nullable: true,
  })
  @IsEnum(DeliveryFeeType)
  @IsOptional()
  deliveryFeeType?: DeliveryFeeType | null;

  @ApiPropertyOptional({
    example: 20000,
    nullable: true,
    description: 'Required when deliveryFeeType is FIXED',
  })
  @IsNumber()
  @Min(0.01, { message: 'Delivery fee must be greater than 0' })
  @IsOptional()
  @ValidateIf((o) => o.deliveryFeeType === DeliveryFeeType.FIXED)
  deliveryFee?: number | null;

  @ApiPropertyOptional({
    example: '123 Main Street, Tashkent',
    nullable: true,
    maxLength: 500,
  })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  pickupAddress?: string | null;

  @ApiPropertyOptional({
    example: 'Come to the 3rd floor, ring the bell',
    nullable: true,
    maxLength: 1000,
  })
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  pickupInstructions?: string | null;
}

export class FulfillmentSettingsResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  organizationId: number;

  @ApiProperty({ enum: FulfillmentMode })
  fulfillmentMode: FulfillmentMode;

  @ApiPropertyOptional({ enum: DeliveryMethod, nullable: true })
  deliveryMethod: DeliveryMethod | null;

  @ApiPropertyOptional({ enum: DeliveryFeeType, nullable: true })
  deliveryFeeType: DeliveryFeeType | null;

  @ApiPropertyOptional({ nullable: true })
  deliveryFee: number | null;

  @ApiPropertyOptional({ nullable: true })
  pickupAddress: string | null;

  @ApiPropertyOptional({ nullable: true })
  pickupInstructions: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
