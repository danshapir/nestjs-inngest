import { Module } from '@nestjs/common';
import { MiddlewareTestService } from './middleware-test.service';

@Module({
  providers: [MiddlewareTestService],
  exports: [MiddlewareTestService],
})
export class MiddlewareModule {}