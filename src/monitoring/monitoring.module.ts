import { Module } from '@nestjs/common';
import { InngestMonitoringService } from './metrics.service';

@Module({
  providers: [InngestMonitoringService],
  exports: [InngestMonitoringService],
})
export class InngestMonitoringModule {}
