import { Module } from '@nestjs/common';
import { InngestTracingService } from './tracing.service';

@Module({
  providers: [InngestTracingService],
  exports: [InngestTracingService],
})
export class InngestTracingModule {}
