import { Module } from '@nestjs/common';
import { InngestHealthService } from './health.service';

@Module({
  providers: [InngestHealthService],
  exports: [InngestHealthService],
})
export class InngestHealthModule {}
