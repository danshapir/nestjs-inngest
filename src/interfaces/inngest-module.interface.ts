import { Inngest, InngestMiddleware, ClientOptions } from 'inngest';
import { ModuleMetadata, Type } from '@nestjs/common';

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
   * Path where Inngest functions will be served (defaults to /api/inngest)
   */
  path?: string;

  /**
   * Signing key for webhook signature validation
   */
  signingKey?: string;

  /**
   * Landing page configuration
   */
  landingPage?: boolean;

  /**
   * Logger instance or configuration
   */
  logger?: any;
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