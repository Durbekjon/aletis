import { Module } from '@nestjs/common';
import { CoreModule } from '@core/core.module';
import { InstagramService } from './instagram.service';

@Module({
  imports: [CoreModule],
  providers: [InstagramService],
  exports: [InstagramService],
})
export class InstagramModule {}
