import { Module } from '@nestjs/common';
import { CoreModule } from '@core/core.module';
import { EmbadingModule } from '@modules/embading/embading.module';
import { HealthController } from './health.controller';

/**
 * Wires the health probe. Previously the controller existed but was registered
 * nowhere, so /health 404'd — this module makes it reachable.
 */
@Module({
  imports: [CoreModule, EmbadingModule],
  controllers: [HealthController],
})
export class HealthModule {}
