import { SetMetadata } from '@nestjs/common';
import { INNGEST_MIDDLEWARE_METADATA, INNGEST_FUNCTION_METADATA } from '../constants';

/**
 * Helper function to create decorators that work with both legacy and modern TypeScript decorators
 */
function createMetadataDecorator(decoratorName: string, updateFn: (metadata: any) => void): any {
  return (target: any, propertyKey?: string | symbol, descriptor?: PropertyDescriptor | any) => {
    // Handle both legacy and modern decorator signatures
    if (typeof propertyKey === 'object' && propertyKey && 'kind' in propertyKey) {
      // Modern decorator (stage 3)
      const context = propertyKey as any;
      const propertyName = context.name;
      
      const metadata = Reflect.getMetadata(INNGEST_FUNCTION_METADATA, target, propertyName) || {};
      updateFn(metadata);
      Reflect.defineMetadata(INNGEST_FUNCTION_METADATA, metadata, target, propertyName);
      
      return target;
    } else {
      // Legacy decorator
      if (!propertyKey) {
        throw new Error('PropertyKey is required for legacy decorator');
      }
      
      const metadata = Reflect.getMetadata(INNGEST_FUNCTION_METADATA, target, propertyKey) || {};
      updateFn(metadata);
      Reflect.defineMetadata(INNGEST_FUNCTION_METADATA, metadata, target, propertyKey);
      
      return descriptor;
    }
  };
}

/**
 * Decorator to add middleware to an Inngest function
 */
export function UseMiddleware(
  ...middleware: any[]
) {
  return (target: any, propertyKey: string | symbol, descriptor?: PropertyDescriptor) => {
    const existingMiddleware = Reflect.getMetadata(
      INNGEST_MIDDLEWARE_METADATA,
      target,
      propertyKey,
    ) || [];

    Reflect.defineMetadata(
      INNGEST_MIDDLEWARE_METADATA,
      [...existingMiddleware, ...middleware],
      target,
      propertyKey,
    );

    return descriptor;
  };
}

/**
 * Decorator to set concurrency limits for an Inngest function
 */
export function Concurrency(
  limit: number,
  options?: {
    key?: string;
    scope?: 'fn' | 'env' | 'account';
  },
): any {
  return createMetadataDecorator('Concurrency', (metadata) => {
    metadata.concurrency = options ? [{ limit, ...options }] : limit;
  });
}

/**
 * Decorator to set rate limiting for an Inngest function
 */
export function RateLimit(
  limit: number,
  period: string,
  key?: string,
): any {
  return createMetadataDecorator('RateLimit', (metadata) => {
    metadata.rateLimit = { limit, period, key };
  });
}

/**
 * Decorator to set throttling for an Inngest function
 */
export function Throttle(
  limit: number,
  period: string,
  options?: {
    key?: string;
    burst?: number;
  },
): any {
  return createMetadataDecorator('Throttle', (metadata) => {
    metadata.throttle = { limit, period, ...options };
  });
}

/**
 * Decorator to set debounce configuration for an Inngest function
 */
export function Debounce(
  period: string,
  key?: string,
): any {
  return createMetadataDecorator('Debounce', (metadata) => {
    metadata.debounce = { period, key };
  });
}

/**
 * Decorator to set retry configuration for an Inngest function
 */
export function Retries(count: number): any {
  return createMetadataDecorator('Retries', (metadata) => {
    metadata.retries = count;
  });
}