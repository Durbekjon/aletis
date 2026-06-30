import { Module } from '@nestjs/common';
import { ModulesModule } from '@modules/modules.module';
import { CoreModule } from '@core/core.module';

// Files are served from ImageKit's CDN — no local static asset serving needed.
@Module({
  imports: [ModulesModule, CoreModule],
})
export class AppModule {}
