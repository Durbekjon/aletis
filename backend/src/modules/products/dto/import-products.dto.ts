import { ApiProperty } from '@nestjs/swagger';

export class ImportRowError {
  @ApiProperty({ example: 2 })
  row: number;

  @ApiProperty({ example: 'Missing required field: name' })
  message: string;
}

export class ImportProductsResponseDto {
  @ApiProperty({ example: 42 })
  imported: number;

  @ApiProperty({ example: 3 })
  skipped: number;

  @ApiProperty({ type: [String], example: ['Brend', 'Rang'] })
  createdFields: string[];

  @ApiProperty({ type: [ImportRowError] })
  errors: ImportRowError[];
}
