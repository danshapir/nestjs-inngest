import { Injectable, Inject, Logger, OnModuleInit } from '@nestjs/common';
import { Inngest, InngestFunction, EventPayload, GetEvents } from 'inngest';
import { INNGEST_MODULE_OPTIONS } from '../constants';
import { InngestModuleOptions } from '../interfaces';

@Injectable()
export class InngestService implements OnModuleInit {
  private readonly logger = new Logger(InngestService.name);
  private inngestClient: Inngest;
  private functions: InngestFunction<any, any, any>[] = [];

  constructor(
    @Inject(INNGEST_MODULE_OPTIONS)
    private readonly options: InngestModuleOptions,
  ) {
    this.inngestClient = new Inngest({
      id: this.options.id,
      eventKey: this.options.eventKey,
      baseUrl: this.options.baseUrl,
      middleware: this.options.middleware as any,
      logger: this.options.logger,
      ...this.options.clientOptions,
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
      const result = await this.inngestClient.send(payload as any);
      this.logger.debug(`Event sent successfully: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to send event: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Register a function with the Inngest service
   */
  registerFunction(fn: InngestFunction<any, any, any>) {
    this.functions.push(fn);
    this.logger.debug(`Registered function: ${fn.id}`);
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
  createFunction(
    options: any,
    handler: any,
  ): any {
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
  createScheduledFunction(
    options: any & { cron: string },
    handler: any,
  ): any {
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
      waitForEvent: async <T = any>(
        id: string,
        options: any,
      ): Promise<T | null> => {
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