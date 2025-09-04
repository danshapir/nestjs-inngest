import { z } from 'zod';
import { InngestModuleOptions, InngestModuleAsyncOptions } from '../interfaces';

/**
 * Base configuration validation schema
 */
export const InngestConfigSchema = z.object({
  id: z.string().min(1, 'App ID is required'),
  eventKey: z.string().optional(),
  baseUrl: z.string().url().optional(),
  isGlobal: z.boolean().default(false),
  middleware: z.array(z.any()).optional(),
  clientOptions: z.object({}).passthrough().optional(),
  path: z.string().default('/api/inngest'),
  servePort: z.number().min(1).max(65535).optional(),
  serveHost: z.string().optional(),
  signingKey: z.string().optional(),
  logger: z.any().optional(),

  // Environment configuration
  environment: z.enum(['development', 'staging', 'production', 'test']).default('development'),

  // Monitoring configuration
  monitoring: z
    .object({
      enabled: z.boolean(),
      collectMetrics: z.boolean(),
      metricsInterval: z.number().min(1000),
      healthCheckInterval: z.number().min(1000),
      enableTracing: z.boolean(),
      tracingConfig: z
        .object({
          serviceName: z.string().optional(),
          spanProcessor: z.enum(['simple', 'batch']),
          exporterType: z.enum(['console', 'jaeger', 'zipkin', 'otlp']),
          exporterConfig: z.object({}).passthrough().optional(),
        })
        .optional(),
    })
    .optional(),

  // Performance configuration (minimal - only memoryLimit implemented)
  performance: z
    .object({
      memoryLimit: z.number().min(128).optional(),
    })
    .optional(),

  // Health check configuration
  health: z
    .object({
      enabled: z.boolean(),
      path: z.string(),
      includeDetails: z.boolean(),
      enableMetrics: z.boolean(),
      enableLiveness: z.boolean(),
      enableReadiness: z.boolean(),
      checkInterval: z.number().min(1000),
    })
    .optional(),

  // Tracing configuration
  tracing: z
    .object({
      enabled: z.boolean().optional(),
      includeEventData: z.boolean().optional(),
      includeStepData: z.boolean().optional(),
      defaultAttributes: z
        .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
        .optional(),
      contextInjection: z
        .object({
          enabled: z.boolean().optional(),
          fieldName: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
});

/**
 * Environment-specific configuration validation
 */
export const DevelopmentConfigSchema = InngestConfigSchema.extend({
  environment: z.enum(['development', 'test']),
  baseUrl: z.string().url().default('http://localhost:8288'),
  monitoring: z
    .object({
      enabled: z.boolean().default(true),
      collectMetrics: z.boolean().default(true),
      metricsInterval: z.number().default(10000), // More frequent in dev
      healthCheckInterval: z.number().default(5000),
      enableTracing: z.boolean().default(true),
    })
    .optional(),
});

export const ProductionConfigSchema = InngestConfigSchema.extend({
  environment: z.literal('production'),
  eventKey: z.string().min(1, 'Event key is required in production'),
  signingKey: z.string().min(1, 'Signing key is required in production'),
  monitoring: z
    .object({
      enabled: z.literal(true),
      collectMetrics: z.literal(true),
      enableTracing: z.boolean().default(true),
    })
    .required(),
});

/**
 * Validate configuration based on environment
 */
export function validateConfig(config: any): InngestModuleOptions {
  try {
    // Determine which schema to use based on environment
    const env = config.environment || process.env.NODE_ENV || 'development';

    let schema: z.ZodSchema<any>;
    switch (env) {
      case 'production':
        schema = ProductionConfigSchema;
        break;
      case 'development':
      case 'test':
        schema = DevelopmentConfigSchema;
        break;
      default:
        schema = InngestConfigSchema;
    }

    const validated = schema.parse(config);

    // Additional business logic validation
    if (validated.performance?.memoryLimit && validated.performance.memoryLimit < 128) {
      throw new Error('Memory limit must be at least 128MB');
    }

    return validated;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new Error(`Invalid Inngest configuration: ${errorMessages}`);
    }
    throw error;
  }
}

/**
 * Create environment-specific default configurations
 */
export const createDefaultConfig = (
  environment: 'development' | 'staging' | 'production' | 'test' = 'development',
): Partial<InngestModuleOptions> => {
  const baseConfig = {
    environment,
    isGlobal: true,
    path: '/api/inngest',
  };

  switch (environment) {
    case 'development':
    case 'test':
      return {
        ...baseConfig,
        baseUrl: 'http://localhost:8288',
        monitoring: {
          enabled: true,
          collectMetrics: true,
          metricsInterval: 10000,
          healthCheckInterval: 5000,
          enableTracing: true,
        },
      };

    case 'production':
      return {
        ...baseConfig,
        monitoring: {
          enabled: true,
          collectMetrics: true,
          metricsInterval: 30000,
          healthCheckInterval: 10000,
          enableTracing: true,
        },
      };

    default:
      return baseConfig;
  }
};

/**
 * Merge user configuration with environment defaults
 */
export function mergeWithDefaults(userConfig: any, environment?: string): any {
  const env = environment || userConfig.environment || process.env.NODE_ENV || 'development';
  const defaults = createDefaultConfig(env as any);

  return {
    ...defaults,
    ...userConfig,
    environment: env,
  };
}
