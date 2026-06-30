import { ApiProperty } from '@nestjs/swagger';
import { FileType } from '@prisma/client';

export class UploadFileResponseDto {
  @ApiProperty({
    description: 'The unique identifier of the uploaded file',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'The ImageKit filePath of the stored file',
    example: '/aletis/abc123.png',
  })
  key: string;

  @ApiProperty({
    description: 'The absolute CDN URL of the stored file',
    example: 'https://ik.imagekit.io/your_id/aletis/abc123.png',
  })
  url: string;

  @ApiProperty({
    description: 'The original filename of the uploaded file',
    example: 'profile-picture.png',
  })
  originalName: string;

  @ApiProperty({
    description: 'The size of the file in bytes',
    example: 1024000,
  })
  size: number;

  @ApiProperty({
    description: 'The MIME type of the file',
    example: 'image/png',
  })
  mimeType: string;

  @ApiProperty({
    description: 'The type/category of the file',
    enum: FileType,
    example: FileType.IMAGE,
  })
  type: FileType;

  @ApiProperty({
    description: 'The ID of the user who uploaded the file',
    example: 1,
    required: false,
  })
  uploaderId?: number | null;

  @ApiProperty({
    description: 'The ID of the organization the file belongs to',
    example: 1,
    required: false,
  })
  organizationId?: number | null;

  @ApiProperty({
    description: 'The ID of the product the file is associated with',
    example: 1,
    required: false,
  })
  productId?: number | null;

  @ApiProperty({
    description: 'The timestamp when the file was uploaded',
    example: '2027-12-01T10:30:00Z',
  })
  createdAt: Date;
}
