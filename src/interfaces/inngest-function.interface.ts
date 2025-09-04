import {
  EventPayload,
  InngestFunction,
  Context,
  Handler,
  GetEvents,
  GetFunctionInput,
  GetStepTools,
  InngestMiddleware,
} from 'inngest';

export interface InngestFunctionConfig<
  TEvents extends Record<string, EventPayload> = GetEvents<any>,
  TTrigger extends any = any,
> {
  /**
   * Optional function ID override (defaults to class method name)
   */
  id?: string;

  /**
   * Function name for display
   */
  name?: string;

  /**
   * Trigger configuration
   */
  trigger: TTrigger;

  /**
   * Concurrency configuration
   */
  concurrency?:
    | number
    | Array<{
        limit: number;
        key?: string;
        scope?: 'fn' | 'env' | 'account';
      }>;

  /**
   * Rate limiting configuration
   */
  rateLimit?: {
    limit: number;
    period: string;
    key?: string;
  };

  /**
   * Throttling configuration
   */
  throttle?: {
    limit: number;
    period: string;
    key?: string;
    burst?: number;
  };

  /**
   * Debounce configuration
   */
  debounce?: {
    period: string;
    key?: string;
  };

  /**
   * Priority configuration
   */
  priority?: {
    run?: string;
  };

  /**
   * Retry configuration
   */
  retries?: number;

  /**
   * Batch events configuration
   */
  batchEvents?: {
    maxSize: number;
    timeout: string;
  };

  /**
   * Cancel on configuration
   */
  cancelOn?: Array<{
    event: string;
    match?: string;
    if?: string;
    timeout?: string;
  }>;

  /**
   * Middleware stack
   */
  middleware?: InngestMiddleware.Stack;
}

export interface InngestStepConfig {
  /**
   * Step ID
   */
  id: string;

  /**
   * Step name for display
   */
  name?: string;

  /**
   * Retry configuration for this step
   */
  retries?: number;
}

export interface InngestHandlerContext<
  TEvents extends Record<string, EventPayload> = GetEvents<any>,
  TTrigger extends any = any,
> {
  event: any; // Simplified for compatibility
  step: GetStepTools<any>;
  ctx: Context;
}

export interface InngestFunctionHandler<
  TEvents extends Record<string, EventPayload> = GetEvents<any>,
  TTrigger extends any = any,
  TOutput = any,
> {
  (context: InngestHandlerContext<TEvents, TTrigger>): Promise<TOutput> | TOutput;
}

export interface InngestFunctionMetadata {
  target: any;
  propertyKey: string | symbol;
  config: InngestFunctionConfig;
  // Additional properties set by middleware decorators
  retries?: number;
  concurrency?: number | Array<{ limit: number; key?: string; scope?: 'fn' | 'env' | 'account' }>;
  rateLimit?: { limit: number; period: string; key?: string };
  throttle?: { limit: number; period: string; key?: string; burst?: number };
  debounce?: { period: string; key?: string };
}
