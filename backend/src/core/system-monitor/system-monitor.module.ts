import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SystemMonitorService } from './system-monitor.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [SystemMonitorService],
  exports: [SystemMonitorService],
})
export class SystemMonitorModule {}
