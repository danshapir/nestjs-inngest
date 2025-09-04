import { Injectable, Inject, Logger, OnModuleInit, Optional } from '@nestjs/common';
import { Inngest, InngestFunction, EventPayload, GetEvents } from 'inngest';
import { INNGEST_MODULE_OPTIONS } from '../constants';
import { InngestModuleOptions } from '../interfaces';
import { InngestTracingService, TraceContext } from '../tracing/tracing.service';
import * as otelApi from '@opentelemetry/api';

@Injectable()
export class InngestService implements OnModuleInit {
  private readonly logger = new Logger(InngestService.name);
  private inngestClient: Inngest;
  private functions: InngestFunction<any, any, any>[] = [];

  constructor(
    @Inject(INNGEST_MODULE_OPTIONS)
    private readonly options: InngestModuleOptions,
    @Optional() private readonly tracingService?: InngestTracingService,
  ) {
    // Prepare middleware array
    const middleware = this.options.middleware ? [...this.options.middleware] : [];

    // Add tracing middleware if available
    if (this.tracingService) {
      const tracingMiddleware = this.tracingService.createTracingMiddleware();
      if (
        tracingMiddleware &&
        typeof tracingMiddleware === 'object' &&
        'name' in tracingMiddleware
      ) {
        middleware.push(tracingMiddleware as any);
        this.logger.debug('Added OpenTelemetry tracing middleware to Inngest client');
      }
    }

    this.inngestClient = new Inngest({
      id: this.options.id,
      eventKey: this.options.eventKey,
      baseUrl: this.options.baseUrl,
      middleware: middleware as any,
      logger: this.options.logger,
      ...this.options.clientOptions,
    });

    this.logger.log('Inngest client created successfully', {
      clientId: this.options.id,
      middlewareCount: middleware.length,
      hasTracing: !!this.tracingService,
    });

    // Test functions will be registered by InngestExplorer after module init
  }

  // Manual function registration commented out - using automatic discovery instead
  /*
  private registerTestFunctionManually() {
    // This method is disabled in favor of automatic function discovery
    // The InngestExplorer will find and register decorated functions automatically
  }
  */

  async onModuleInit() {
    this.logger.log(`Initializing Inngest module with app ID: ${this.options.id}`);

    if (this.functions.length > 0) {
      this.logger.log(`Registered ${this.functions.length} Inngest functions`);
    }

    // Delay auto-registration to allow InngestExplorer to finish discovering functions
    setTimeout(() => {
      this.registerWithDevServer();
    }, 1000);
  }

  private async registerWithDevServer() {
    if (!this.options.baseUrl || this.options.baseUrl.includes('inngest.com')) {
      // Skip registration for production Inngest or if no baseUrl
      return;
    }

    try {
      const port = process.env.PORT || 3001;
      const appUrl = `http://localhost:${port}/api/inngest`;
      const devServerUrl = this.options.baseUrl;

      this.logger.log('Attempting auto-registration with Inngest dev server', {
        devServerUrl,
        appUrl,
        port,
        source: 'auto-nestjs-inngest',
      });

      const response = await fetch(`${devServerUrl}/fn/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: appUrl,
          source: 'auto-nestjs-inngest',
        }),
      });

      if (response.ok) {
        this.logger.log('Successfully auto-registered with Inngest dev server', {
          devServerUrl,
          appUrl,
          status: response.status,
        });
      } else {
        this.logger.warn('Auto-registration failed', {
          devServerUrl,
          appUrl,
          status: response.status,
          statusText: response.statusText,
        });
      }
    } catch (error) {
      this.logger.warn('Auto-registration failed', {
        devServerUrl: this.options.baseUrl,
        error: error.message,
        stack: error.stack,
      });
    }
  }

  /**
   * Get the Inngest client instance
   */
  getClient(): Inngest {
    return this.inngestClient;
  }

  /**
   * Send an event to Inngest
   */
  async send<TEvents extends Record<string, EventPayload> = GetEvents<Inngest>>(
    payload: keyof TEvents extends never
      ? EventPayload | EventPayload[]
      : TEvents[keyof TEvents] | TEvents[keyof TEvents][],
  ) {
    try {
      // Automatically inject trace context if tracing is enabled
      const enhancedPayload = this.injectTraceContext(payload);
      const result = await this.inngestClient.send(enhancedPayload as any);
      this.logger.debug('Event sent successfully with trace context', {
        eventCount: Array.isArray(enhancedPayload) ? enhancedPayload.length : 1,
        hasTraceContext: this.hasTraceContext(enhancedPayload),
      });
      return result;
    } catch (error) {
      this.logger.error(`Failed to send event: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Send an event with explicit trace context
   */
  async sendWithTraceId<TEvents extends Record<string, EventPayload> = GetEvents<Inngest>>(
    payload: keyof TEvents extends never
      ? EventPayload | EventPayload[]
      : TEvents[keyof TEvents] | TEvents[keyof TEvents][],
    traceContext: TraceContext | string,
  ) {
    try {
      // Parse traceId if provided as string (W3C traceparent format)
      let parsedTraceContext: TraceContext;
      if (typeof traceContext === 'string') {
        parsedTraceContext = this.parseTraceparent(traceContext);
      } else {
        parsedTraceContext = traceContext;
      }

      // Inject the provided trace context
      const enhancedPayload = this.injectExplicitTraceContext(payload, parsedTraceContext);
      const result = await this.inngestClient.send(enhancedPayload as any);

      this.logger.debug('Event sent with explicit trace context', {
        traceId: parsedTraceContext.traceId,
        eventCount: Array.isArray(enhancedPayload) ? enhancedPayload.length : 1,
      });
      return result;
    } catch (error) {
      this.logger.error(`Failed to send event with trace context: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Extract trace context from HTTP request headers
   */
  extractTraceFromHeaders(
    headers: Record<string, string | string[] | undefined>,
  ): TraceContext | null {
    try {
      const traceparent = headers['traceparent'] || headers['x-trace-id'];
      if (typeof traceparent === 'string') {
        return this.parseTraceparent(traceparent);
      }
      return null;
    } catch (error) {
      this.logger.warn('Failed to extract trace context from headers', {
        error: error.message,
        headers: Object.keys(headers),
      });
      return null;
    }
  }

  /**
   * Get current active trace context from OpenTelemetry
   */
  getCurrentTraceContext(): TraceContext | null {
    if (!this.tracingService) {
      return null;
    }
    return this.tracingService.getCurrentTraceContext();
  }

  /**
   * Parse W3C traceparent header format: 00-{traceId}-{spanId}-{flags}
   */
  private parseTraceparent(traceparent: string): TraceContext {
    const parts = traceparent.split('-');
    if (parts.length !== 4) {
      throw new Error(`Invalid traceparent format: ${traceparent}`);
    }

    const [version, traceId, spanId, flags] = parts;
    return {
      traceId,
      spanId,
      parentSpanId: spanId,
      traceFlags: parseInt(flags, 16),
    };
  }

  /**
   * Inject current trace context into event payload
   */
  private injectTraceContext(payload: any): any {
    if (!this.tracingService) {
      return payload;
    }

    return this.tracingService.injectTraceContext(payload);
  }

  /**
   * Inject explicit trace context into event payload
   */
  private injectExplicitTraceContext(payload: any, traceContext: TraceContext): any {
    const payloadArray = Array.isArray(payload) ? payload : [payload];

    const enhancedPayloads = payloadArray.map((event) => ({
      ...event,
      data: {
        ...event.data,
        traceContext: {
          traceId: traceContext.traceId,
          spanId: traceContext.spanId,
          parentSpanId: traceContext.parentSpanId,
          traceFlags: traceContext.traceFlags,
        },
      },
    }));

    return Array.isArray(payload) ? enhancedPayloads : enhancedPayloads[0];
  }

  /**
   * Check if payload contains trace context
   */
  private hasTraceContext(payload: any): boolean {
    if (Array.isArray(payload)) {
      return payload.some((event) => event.data?.traceContext || event.traceContext);
    }
    return !!(payload?.data?.traceContext || payload?.traceContext);
  }

  /**
   * Register a function with the Inngest service
   */
  registerFunction(fn: InngestFunction<any, any, any>) {
    this.functions.push(fn);
    const functionId = typeof fn?.id === 'function' ? fn.id() : fn?.id || 'unknown';
    this.logger.debug(`Registered function: ${functionId}`);
  }

  /**
   * Get all registered functions
   */
  getFunctions(): InngestFunction<any, any, any>[] {
    return this.functions;
  }

  /**
   * Create a function using the Inngest client
   */
  createFunction(options: any, handler: any): any {
    // Extract trigger from options for Inngest v3 API: createFunction(options, trigger, handler)
    const { trigger, triggers, ...fnOptions } = options;

    // Determine the trigger - could be from 'trigger' or 'triggers' or infer from event name
    let triggerConfig = trigger;
    if (!triggerConfig && triggers) {
      triggerConfig = triggers[0] || triggers;
    }
    if (!triggerConfig && options.event) {
      triggerConfig = { event: options.event };
    }

    try {
      const fn = this.inngestClient.createFunction(fnOptions, triggerConfig, handler);
      this.registerFunction(fn);
      return fn;
    } catch (error) {
      this.logger.error(`Failed to create function: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Create a scheduled function
   */
  createScheduledFunction(options: any & { cron: string }, handler: any): any {
    const { cron, ...fnOptions } = options;
    return this.createFunction(
      {
        ...fnOptions,
        trigger: { cron },
      },
      handler,
    );
  }

  /**
   * Get module options
   */
  getOptions(): InngestModuleOptions {
    return this.options;
  }

  /**
   * Create step tools for testing
   */
  createStepTools() {
    // This is useful for testing Inngest functions
    return {
      run: async <T>(id: string, fn: () => Promise<T> | T): Promise<T> => {
        this.logger.debug(`Step run: ${id}`);
        return await fn();
      },
      sleep: async (id: string, duration: string | number | Date): Promise<void> => {
        this.logger.debug(`Step sleep: ${id} for ${duration}`);
      },
      sleepUntil: async (id: string, until: string | number | Date): Promise<void> => {
        this.logger.debug(`Step sleepUntil: ${id} until ${until}`);
      },
      waitForEvent: async <T = any>(id: string, options: any): Promise<T | null> => {
        this.logger.debug(`Step waitForEvent: ${id}`);
        return null;
      },
      sendEvent: async (id: string, events: any | any[]): Promise<void> => {
        this.logger.debug(`Step sendEvent: ${id}`);
        await this.send(events);
      },
    };
  }
}
