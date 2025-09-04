import { SetMetadata } from '@nestjs/common';

export const INNGEST_TRACED_METADATA = Symbol('inngest:traced');

export interface TracedOptions {
  /**
   * Custom span name. If not provided, uses method name.
   */
  spanName?: string;

  /**
   * Additional span attributes
   */
  attributes?: Record<string, string | number | boolean>;

  /**
   * Whether to record function parameters as span attributes
   * @default false (for privacy/security)
   */
  recordParameters?: boolean;

  /**
   * Whether to record function result as span attributes
   * @default false (for privacy/performance)
   */
  recordResult?: boolean;
}

/**
 * Decorator to automatically create OpenTelemetry spans for Inngest functions
 *
 * @example
 * ```typescript
 * @InngestFunction({
 *   id: 'process-payment',
 *   trigger: { event: 'payment.requested' }
 * })
 * @Traced({
 *   spanName: 'payment-processing',
 *   attributes: { service: 'payment' }
 * })
 * async processPayment(event: any, step: any) {
 *   // Function execution will be automatically traced
 *   return await step.run('charge-card', () => this.chargeCard(event.data));
 * }
 * ```
 */
export function Traced(options: TracedOptions = {}): MethodDecorator {
  return (
    target: any,
    propertyKey: string | symbol | undefined,
    descriptor: PropertyDescriptor,
  ) => {
    // Store metadata for the tracing service to use
    SetMetadata(INNGEST_TRACED_METADATA, {
      spanName: options.spanName || String(propertyKey),
      attributes: options.attributes || {},
      recordParameters: options.recordParameters || false,
      recordResult: options.recordResult || false,
    })(target, propertyKey!, descriptor);

    return descriptor;
  };
}
