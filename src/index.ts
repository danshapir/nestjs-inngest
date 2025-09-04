// Module exports
export { InngestModule } from './module/inngest.module';

// Service exports
export { InngestService } from './services/inngest.service';
export { InngestExplorer } from './services/inngest.explorer';
export { InngestController } from './services/inngest.controller';

// Decorator exports
export {
  InngestFunction,
  InngestCron,
  InngestEvent,
} from './decorators/inngest-function.decorator';

// Removed: inngest-trigger.decorator exports - use @InngestCron and @InngestEvent instead
// Removed: inngest-step.decorator exports - use object destructuring { event, step, ctx } instead

export {
  UseMiddleware,
  Concurrency,
  RateLimit,
  Throttle,
  Debounce,
  Retries,
} from './decorators/inngest-middleware.decorator';

// Note: @Traced decorator removed - tracing is now automatic via middleware

// Interface exports
export {
  InngestModuleOptions,
  InngestModuleAsyncOptions,
  InngestOptionsFactory,
  InngestFunctionConfig,
  InngestStepConfig,
  InngestHandlerContext,
  InngestFunctionHandler,
  InngestFunctionMetadata,
  InngestMonitoringConfig,
  InngestHealthConfig,
  InngestTracingConfig,
} from './interfaces';

// Configuration validation exports
export {
  validateConfig,
  mergeWithDefaults,
  createDefaultConfig,
  InngestConfigSchema,
  DevelopmentConfigSchema,
  ProductionConfigSchema,
} from './config/validation';

// Health check exports
export {
  InngestHealthModule,
  InngestHealthService,
  HealthCheckResult,
  SystemHealth,
  InngestHealthStatus,
} from './health';

// Monitoring exports
export {
  InngestMonitoringModule,
  InngestMonitoringService,
  MetricValue,
  Counter,
  Gauge,
  Histogram,
  Metric,
  MetricsCollector,
  FunctionMetrics,
  SystemMetrics,
} from './monitoring';

// Utility exports
export {
  ExtractEvents,
  InngestReturn,
  StepReturn,
  isEventPayload,
  isEventPayloadArray,
  createEvent,
  createBatchEvents,
  createInngestTestingModule,
  MockInngestService,
  createMockInngestContext,
} from './utils';

// Re-export commonly used types from Inngest
export type {
  Inngest,
  InngestFunction as InngestFunctionType,
  EventPayload,
  GetEvents,
  GetFunctionInput,
  Context as InngestContext,
  GetStepTools,
  InngestMiddleware,
} from 'inngest';
