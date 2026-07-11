import {
  Injectable,
  Logger,
  InternalServerErrorException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import ImageKit from 'imagekit';

export interface ImagekitUploadResult {
  /** Absolute, CDN-served URL of the uploaded asset */
  url: string;
  /** ImageKit fileId, required to delete the asset later */
  fileId: string;
  /** ImageKit filePath, e.g. "/aletis/abc.png" */
  filePath: string;
  name: string;
}

@Injectable()
export class ImagekitService implements OnModuleInit {
  private readonly logger = new Logger(ImagekitService.name);
  private client: ImageKit | null = null;
  private readonly folder: string;

  constructor(private readonly config: ConfigService) {
    this.folder = this.config.get<string>('IMAGEKIT_FOLDER') || '/aletis';
  }

  onModuleInit(): void {
    const publicKey = this.config.get<string>('IMAGEKIT_PUBLIC_KEY');
    const privateKey = this.config.get<string>('IMAGEKIT_PRIVATE_KEY');
    const urlEndpoint = this.config.get<string>('IMAGEKIT_URL_ENDPOINT');

    if (!publicKey || !privateKey || !urlEndpoint) {
      this.logger.warn(
        'ImageKit credentials are not fully configured (IMAGEKIT_PUBLIC_KEY / IMAGEKIT_PRIVATE_KEY / IMAGEKIT_URL_ENDPOINT). Uploads will fail until set.',
      );
      return;
    }

    this.client = new ImageKit({ publicKey, privateKey, urlEndpoint });
    this.logger.log(`ImageKit initialised (folder: ${this.folder})`);
  }

  private getClient(): ImageKit {
    if (!this.client) {
      throw new InternalServerErrorException(
        'ImageKit is not configured on this server',
      );
    }
    return this.client;
  }

  /**
   * Uploads a file buffer to ImageKit and returns its CDN URL + fileId.
   * @param folder Overrides the default IMAGEKIT_FOLDER — e.g. for storing
   * DB backups in a separate subfolder from product images.
   */
  async upload(
    buffer: Buffer,
    fileName: string,
    folder?: string,
  ): Promise<ImagekitUploadResult> {
    try {
      const result = await this.getClient().upload({
        file: buffer,
        fileName,
        folder: folder ?? this.folder,
        useUniqueFileName: true,
      });

      return {
        url: result.url,
        fileId: result.fileId,
        filePath: result.filePath,
        name: result.name,
      };
    } catch (error) {
      this.logger.error(
        `ImageKit upload failed for ${fileName}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to upload file to ImageKit');
    }
  }

  /**
   * Deletes a file from ImageKit by its fileId. Missing files are ignored.
   */
  async delete(fileId: string): Promise<void> {
    if (!fileId) return;
    try {
      await this.getClient().deleteFile(fileId);
      this.logger.log(`Deleted ImageKit file: ${fileId}`);
    } catch (error) {
      // 404 from ImageKit means already gone — not fatal for a delete.
      const status = error?.httpStatusCode;
      if (status === 404) {
        this.logger.warn(`ImageKit file not found (already deleted): ${fileId}`);
        return;
      }
      this.logger.warn(
        `Failed to delete ImageKit file ${fileId}: ${error.message}`,
      );
    }
  }

  /**
   * Lists files in a folder, newest first — used for backup rotation
   * (keep the N most recent, delete the rest).
   */
  async listFiles(
    folderPath: string,
  ): Promise<{ fileId: string; name: string }[]> {
    try {
      const results = await this.getClient().listFiles({
        path: folderPath,
        sort: 'DESC_CREATED',
        limit: 1000,
      });
      return results
        .filter((f): f is typeof f & { fileId: string } => 'fileId' in f)
        .map((f) => ({ fileId: f.fileId, name: f.name }));
    } catch (error) {
      this.logger.warn(
        `Failed to list ImageKit files in ${folderPath}: ${error.message}`,
      );
      return [];
    }
  }
}
