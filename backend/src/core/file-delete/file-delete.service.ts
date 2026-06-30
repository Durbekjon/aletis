import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/core/prisma/prisma.service';
import { ImagekitService } from '@/core/imagekit/imagekit.service';

@Injectable()
export class FileDeleteService {
  private readonly logger = new Logger(FileDeleteService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly imagekit: ImagekitService,
  ) {}

  /**
   * Deletes the stored asset for a File, identified by its key (ImageKit
   * filePath). The DB row itself is left untouched — callers manage relations.
   */
  async deleteFileByKey(key: string): Promise<void> {
    try {
      const file = await this.prisma.file.findUnique({
        where: { key },
        select: { imagekitFileId: true },
      });

      if (!file?.imagekitFileId) {
        this.logger.warn(`No ImageKit asset found for key: ${key}`);
        return;
      }

      await this.imagekit.delete(file.imagekitFileId);
    } catch (error) {
      this.logger.warn(`Failed to delete asset for key ${key}: ${error.message}`);
    }
  }

  /**
   * Deletes multiple assets concurrently.
   */
  async deleteFilesByKeys(keys: string[]): Promise<void> {
    if (!keys?.length) return;
    await Promise.all(keys.map((key) => this.deleteFileByKey(key)));
  }
}
