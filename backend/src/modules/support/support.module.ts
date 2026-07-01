import { Module } from '@nestjs/common';
import { CoreModule } from '@core/core.module';
import { SupportService } from './support.service';
import { SupportController } from './support.controller';

@Module({
  imports: [CoreModule],
  controllers: [SupportController],
  providers: [SupportService],
  exports: [SupportService],
})
export class SupportModule {}
