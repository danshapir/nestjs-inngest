import { InngestMiddleware, ClientOptions } from 'inngest';
import { ModuleMetadata, Type } from '@nestjs/common';

export interface InngestMonitoringConfig {
  enabled: boolean;
  collectMetrics: boolean;
  metricsInterval: number;
  healthCheckInterval: number;
  enableTracing: boolean;
  tracingConfig?: {
    serviceName?: string;
    spanProcessor: 'simple' | 'batch';
    exporterType: 'console' | 'jaeger' | 'zipkin' | 'otlp';
    exporterConfig?: Record<string, any>;
  };
}

export interface InngestHealthConfig {
  enabled: boolean;
  path: string;
  includeDetails: boolean;
  enableMetrics: boolean;
  enableLiveness: boolean;
  enableReadiness: boolean;
  checkInterval: number;
}

export interface InngestTracingConfig {
  /**
   * Enable tracing (automatically detected if OpenTelemetry is available)
   */
  enabled?: boolean;

  /**
   * Service name to use in traces (defaults to module ID if not specified)
   */
  serviceName?: string;

  /**
   * Format for span names (default: 'inngest.step.{type}.{id}')
   */
  spanNameFormat?: string;

  /**
   * Include event data in trace context (default: false for privacy)
   */
  includeEventData?: boolean;

  /**
   * Include step data in trace attributes (default: false for performance)
   */
  includeStepData?: boolean;

  /**
   * Custom attributes to add to all spans
   */
  defaultAttributes?: Record<string, string | number | boolean>;

  /**
   * Trace context injection settings
   */
  contextInjection?: {
    /**
     * Automatically inject trace context into sendEvent calls (default: true)
     */
    enabled?: boolean;

    /**
     * Location in event data to inject trace context (default: 'traceContext')
     */
    fieldName?: string;
  };
}

export interface InngestModuleOptions {
  /**
   * Inngest app ID
   */
  id: string;

  /**
   * Event key for the Inngest app
   */
  eventKey?: string;

  /**
   * Base URL for the Inngest server (defaults to Inngest Cloud)
   */
  baseUrl?: string;

  /**
   * Whether this module should be global
   */
  isGlobal?: boolean;

  /**
   * Middleware to apply to all functions
   */
  middleware?: InngestMiddleware<any>[];

  /**
   * Additional client options
   */
  clientOptions?: Partial<ClientOptions>;

  /**
   * Path where Inngest functions will be served (defaults to inngest)
   */
  path?: string;

  /**
   * The port where this application is running (for auto-registration)
   * Defaults to process.env.PORT or 3000
   */
  servePort?: number;

  /**
   * The host URL where this application is accessible (for auto-registration)
   * Defaults to 'localhost' in development
   */
  serveHost?: string;

  /**
   * Disable automatic registration with Inngest dev server on module initialization
   * When true, you must call inngestService.registerWithDevServer() manually
   * Useful for dynamic port allocation or complex startup sequences
   * @default false
   */
  disableAutoRegistration?: boolean;

  /**
   * Signing key for webhook signature validation
   */
  signingKey?: string;

  /**
   * Logger instance or configuration
   */
  logger?: any;

  /**
   * Environment configuration
   */
  environment?: 'development' | 'staging' | 'production' | 'test';

  /**
   * Monitoring configuration
   */
  monitoring?: InngestMonitoringConfig;

  /**
   * Health check configuration
   */
  health?: InngestHealthConfig;

  /**
   * Performance configuration (only memoryLimit is implemented)
   */
  performance?: {
    /**
     * Memory limit in MB for health checks
     */
    memoryLimit?: number;
  };

  /**
   * Tracing configuration
   */
  tracing?: InngestTracingConfig;
}

export interface InngestModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  name?: string;
  useExisting?: Type<InngestOptionsFactory>;
  useClass?: Type<InngestOptionsFactory>;
  useFactory?: (...args: any[]) => Promise<InngestModuleOptions> | InngestModuleOptions;
  inject?: any[];
  isGlobal?: boolean;
}

export interface InngestOptionsFactory {
  createInngestOptions(): Promise<InngestModuleOptions> | InngestModuleOptions;
}
