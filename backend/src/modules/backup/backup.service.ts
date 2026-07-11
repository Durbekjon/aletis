import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { spawn } from 'child_process';
import { ImagekitService } from '@core/imagekit/imagekit.service';

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private readonly retentionCount: number;
  private readonly backupFolder: string;

  constructor(
    private readonly config: ConfigService,
    private readonly imagekit: ImagekitService,
  ) {
    this.retentionCount = Number(
      this.config.get<string>('DB_BACKUP_RETENTION_COUNT') ?? '7',
    );
    const baseFolder = this.config.get<string>('IMAGEKIT_FOLDER') || '/aletis';
    this.backupFolder = `${baseFolder}/backups`;
  }

  async runBackup(): Promise<void> {
    const dump = await this.dumpDatabase();
    const fileName = `db-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.dump`;

    await this.imagekit.upload(dump, fileName, this.backupFolder);
    this.logger.log(
      `Uploaded backup ${fileName} (${(dump.length / 1024 / 1024).toFixed(2)} MB) to ${this.backupFolder}`,
    );

    await this.rotateOldBackups();
  }

  // pg_dump's custom format (-Fc) is already compressed — no separate gzip step needed.
  private dumpDatabase(): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const databaseUrl = this.config.get<string>('DATABASE_URL');
      if (!databaseUrl) {
        reject(new Error('DATABASE_URL is not configured'));
        return;
      }

      const proc = spawn('pg_dump', [
        '--format=custom',
        '--no-owner',
        '--no-privileges',
        databaseUrl,
      ]);

      const chunks: Buffer[] = [];
      let stderr = '';

      proc.stdout.on('data', (chunk: Buffer) => chunks.push(chunk));
      proc.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
      });
      proc.on('error', reject);
      proc.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`pg_dump exited with code ${code}: ${stderr}`));
          return;
        }
        resolve(Buffer.concat(chunks));
      });
    });
  }

  private async rotateOldBackups(): Promise<void> {
    const files = await this.imagekit.listFiles(this.backupFolder);
    // listFiles is sorted newest-first — keep the first `retentionCount`, drop the rest.
    const toDelete = files.slice(this.retentionCount);
    for (const file of toDelete) {
      await this.imagekit.delete(file.fileId);
      this.logger.log(`Rotated old backup: ${file.name}`);
    }
  }
}
