import { Global, Module } from '@nestjs/common';
import { FileDeleteService } from './file-delete.service';
import { PrismaModule } from '@/core/prisma/prisma.module';
import { ImagekitModule } from '@/core/imagekit/imagekit.module';

@Global()
@Module({
  imports: [PrismaModule, ImagekitModule],
  providers: [FileDeleteService],
  exports: [FileDeleteService],
})
export class FileDeleteModule {}
