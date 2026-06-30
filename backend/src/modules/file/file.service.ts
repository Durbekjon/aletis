import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '@/core/prisma/prisma.service';
import { ImagekitService } from '@/core/imagekit/imagekit.service';
import { FileType, FileStatus } from '@prisma/client';
import { UploadFileResponseDto, FilePaginatedResponseDto } from './dto';
import { PaginationDto, PaginatedResponseDto } from '@/shared/dto';

export interface UploadFileData {
  originalName: string;
  size: number;
  mimeType: string;
  key: string;
  uploaderId?: number;
  organizationId?: number;
  productId?: number;
  type?: FileType;
}

@Injectable()
export class FileService {
  private readonly logger = new Logger(FileService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly imagekit: ImagekitService,
  ) {}

  /**
   * Determines file type based on MIME type
   */
  private getFileType(mimeType: string): FileType {
    if (mimeType.startsWith('image/')) return FileType.IMAGE;
    if (mimeType.startsWith('video/')) return FileType.VIDEO;
    if (mimeType.startsWith('audio/')) return FileType.AUDIO;
    if (
      mimeType.includes('pdf') ||
      mimeType.includes('document') ||
      mimeType.includes('text') ||
      mimeType.includes('spreadsheet') ||
      mimeType.includes('presentation')
    ) {
      return FileType.DOCUMENT;
    }
    return FileType.OTHER;
  }

  /**
   * Sanitises an original filename for use as the ImageKit file name.
   */
  private sanitizeFilename(originalName: string): string {
    return originalName.replace(/\s+/g, '_');
  }

  /**
   * Uploads a single file (in-memory buffer) to ImageKit and saves metadata.
   */
  async uploadFile(
    file: Express.Multer.File,
    uploaderId?: number,
    organizationId?: number,
    productId?: number,
  ): Promise<UploadFileResponseDto> {
    try {
      const uploaded = await this.imagekit.upload(
        file.buffer,
        this.sanitizeFilename(file.originalname),
      );

      const fileType = this.getFileType(file.mimetype);

      const savedFile = await this.prisma.file.create({
        data: {
          key: uploaded.filePath,
          url: uploaded.url,
          imagekitFileId: uploaded.fileId,
          originalName: file.originalname,
          size: file.size,
          mimeType: file.mimetype,
          type: fileType,
          status: FileStatus.READY,
          uploaderId,
          organizationId,
          productId,
        },
      });

      this.logger.log(
        `File uploaded successfully: ${savedFile.id} - ${uploaded.url}`,
      );

      return savedFile;
    } catch (error) {
      this.logger.error(`Failed to upload file: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to upload file');
    }
  }

  /**
   * Saves a downloaded file from URL/buffer to filesystem and database
   */
  async saveDownloadedFile(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    organizationId?: number,
    uploaderId?: number,
  ): Promise<UploadFileResponseDto> {
    this.logger.log(
      `[saveDownloadedFile] Starting: originalName=${originalName}, size=${buffer.length}, mimeType=${mimeType}, organizationId=${organizationId}, uploaderId=${uploaderId}`,
    );
    try {
      // Upload buffer straight to ImageKit
      this.logger.log(`[saveDownloadedFile] Uploading buffer to ImageKit`);
      const uploaded = await this.imagekit.upload(
        buffer,
        this.sanitizeFilename(originalName),
      );

      // Determine file type
      const fileType = this.getFileType(mimeType);
      this.logger.log(`[saveDownloadedFile] File type determined: ${fileType}`);

      // Save metadata to database
      this.logger.log(`[saveDownloadedFile] Creating file record in database`);
      const savedFile = await this.prisma.file.create({
        data: {
          key: uploaded.filePath,
          url: uploaded.url,
          imagekitFileId: uploaded.fileId,
          originalName,
          size: buffer.length,
          mimeType,
          type: fileType,
          status: FileStatus.READY,
          uploaderId,
          organizationId,
        },
      });

      this.logger.log(
        `[saveDownloadedFile] SUCCESS: File saved with id=${savedFile.id}, url=${uploaded.url}, size=${savedFile.size}`,
      );

      return savedFile;
    } catch (error) {
      this.logger.error(
        `[saveDownloadedFile] ERROR: Failed to save downloaded file: ${error.message}`,
        error.stack,
      );
      this.logger.error(
        `[saveDownloadedFile] ERROR DETAILS: originalName=${originalName}, size=${buffer.length}, organizationId=${organizationId}, errorType=${error.constructor.name}`,
      );
      throw new InternalServerErrorException('Failed to save downloaded file');
    }
  }

  /**
   * Uploads multiple files and saves metadata to database
   */
  async uploadManyFiles(
    files: Express.Multer.File[],
    uploaderId?: number,
    organizationId?: number,
    productId?: number,
  ): Promise<UploadFileResponseDto[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    const uploadPromises = files.map((file) =>
      this.uploadFile(file, uploaderId, organizationId, productId),
    );

    try {
      const results = await Promise.all(uploadPromises);
      this.logger.log(`Successfully uploaded ${results.length} files`);
      return results;
    } catch (error) {
      this.logger.error(`Failed to upload multiple files: ${error.message}`);
      throw new InternalServerErrorException('Failed to upload files');
    }
  }

  /**
   * Deletes a file by ID (removes from database and ImageKit)
   */
  async deleteFile(fileId: number): Promise<void> {
    try {
      const file = await this.prisma.file.findUnique({
        where: { id: fileId },
      });

      if (!file) {
        throw new NotFoundException(`File with ID ${fileId} not found`);
      }

      // Delete from database first
      await this.prisma.file.delete({
        where: { id: fileId },
      });

      // Delete from ImageKit (non-fatal if missing)
      if (file.imagekitFileId) {
        await this.imagekit.delete(file.imagekitFileId);
      }
      this.logger.log(`File deleted successfully: ${fileId} - ${file.key}`);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to delete file ${fileId}: ${error.message}`);
      throw new InternalServerErrorException('Failed to delete file');
    }
  }

  /**
   * Deletes a file by key (removes from database and ImageKit)
   */
  async deleteFileByKey(key: string): Promise<void> {
    try {
      const file = await this.prisma.file.findUnique({
        where: { key },
      });

      if (!file) {
        throw new NotFoundException(`File with key ${key} not found`);
      }

      // Delete from database first
      await this.prisma.file.delete({
        where: { key },
      });

      // Delete from ImageKit (non-fatal if missing)
      if (file.imagekitFileId) {
        await this.imagekit.delete(file.imagekitFileId);
      }
      this.logger.log(`File deleted successfully by key: ${key}`);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Failed to delete file by key ${key}: ${error.message}`,
      );
      throw new InternalServerErrorException('Failed to delete file');
    }
  }

  /**
   * Deletes multiple files by IDs in a transaction
   */
  async deleteManyFiles(fileIds: number[]): Promise<void> {
    if (!fileIds || fileIds.length === 0) {
      throw new BadRequestException('No file IDs provided');
    }

    try {
      // Get all files first to check existence and get ImageKit ids
      const files = await this.prisma.file.findMany({
        where: { id: { in: fileIds } },
        select: { id: true, key: true, imagekitFileId: true },
      });

      if (files.length !== fileIds.length) {
        const foundIds = files.map((f) => f.id);
        const missingIds = fileIds.filter((id) => !foundIds.includes(id));
        throw new NotFoundException(
          `Files not found: ${missingIds.join(', ')}`,
        );
      }

      // Delete from database in transaction
      await this.prisma.$transaction(
        fileIds.map((id) =>
          this.prisma.file.delete({
            where: { id },
          }),
        ),
      );

      // Delete from ImageKit (non-fatal if missing)
      const deletePromises = files.map(async (file) => {
        if (file.imagekitFileId) {
          await this.imagekit.delete(file.imagekitFileId);
        }
        this.logger.log(`File deleted successfully: ${file.id} - ${file.key}`);
      });

      await Promise.all(deletePromises);
      this.logger.log(`Successfully deleted ${files.length} files`);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(`Failed to delete multiple files: ${error.message}`);
      throw new InternalServerErrorException('Failed to delete files');
    }
  }

  /**
   * Gets file metadata by ID
   */
  async getFileById(fileId: number): Promise<UploadFileResponseDto> {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      throw new NotFoundException(`File with ID ${fileId} not found`);
    }

    return file;
  }

  /**
   * Gets file metadata by key
   */
  async getFileByKey(key: string): Promise<UploadFileResponseDto> {
    const file = await this.prisma.file.findUnique({
      where: { key },
    });

    if (!file) {
      throw new NotFoundException(`File with key ${key} not found`);
    }

    return file;
  }

  /**
   * Gets files by organization ID
   */
  async getFilesByOrganization(
    organizationId: number,
  ): Promise<UploadFileResponseDto[]> {
    return this.prisma.file.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Gets files by uploader ID
   */
  async getFilesByUploader(
    uploaderId: number,
  ): Promise<UploadFileResponseDto[]> {
    return this.prisma.file.findMany({
      where: { uploaderId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Gets recent files with pagination, search, and ordering
   * Only returns files belonging to the authenticated user's organization
   */
  async getRecentFiles(
    userId: number,
    paginationDto: PaginationDto,
  ): Promise<FilePaginatedResponseDto> {
    try {
      const { page, limit, search, order } = paginationDto;
      const skip = paginationDto.skip;
      const take = paginationDto.take;

      // Build the where clause
      const where: any = {
        uploaderId: userId,
      };

      // Add search filter if provided
      if (search && search.trim()) {
        where.originalName = {
          contains: search.trim(),
          mode: 'insensitive', // Case-insensitive search
        };
      }

      // Build the orderBy clause
      const orderBy = {
        createdAt: order,
      };

      // Execute queries in parallel for better performance
      const [files, total] = await Promise.all([
        this.prisma.file.findMany({
          where,
          orderBy,
          skip,
          take,
        }),
        this.prisma.file.count({
          where,
        }),
      ]);

      this.logger.log(
        `Retrieved ${files.length} files for uploader ${userId} (page ${page}, total: ${total})`,
      );

      return new FilePaginatedResponseDto(files, total, page || 1, limit || 20);
    } catch (error) {
      this.logger.error(
        `Failed to get recent files for uploader ${userId}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to retrieve files');
    }
  }

  /**
   * Gets recent files by uploader with pagination, search, and ordering
   */
  async getRecentFilesByUploader(
    uploaderId: number,
    paginationDto: PaginationDto,
  ): Promise<FilePaginatedResponseDto> {
    try {
      const { page, limit, search, order } = paginationDto;
      const skip = paginationDto.skip;
      const take = paginationDto.take;

      // Build the where clause
      const where: any = {
        uploaderId: uploaderId,
      };

      // Add search filter if provided
      if (search && search.trim()) {
        where.originalName = {
          contains: search.trim(),
          mode: 'insensitive', // Case-insensitive search
        };
      }

      // Build the orderBy clause
      const orderBy = {
        createdAt: order,
      };

      // Execute queries in parallel for better performance
      const [files, total] = await Promise.all([
        this.prisma.file.findMany({
          where,
          orderBy,
          skip,
          take,
        }),
        this.prisma.file.count({
          where,
        }),
      ]);

      this.logger.log(
        `Retrieved ${files.length} files for uploader ${uploaderId} (page ${page}, total: ${total})`,
      );

      return new FilePaginatedResponseDto(files, total, page || 1, limit || 20);
    } catch (error) {
      this.logger.error(
        `Failed to get recent files for uploader ${uploaderId}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to retrieve files');
    }
  }
}
