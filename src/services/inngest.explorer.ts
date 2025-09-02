import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { DiscoveryService, MetadataScanner } from '@nestjs/core';
import { InngestService } from './inngest.service';
import { INNGEST_FUNCTION_METADATA, INNGEST_HANDLER_METADATA, INNGEST_MIDDLEWARE_METADATA } from '../constants';
import { InngestFunctionMetadata } from '../interfaces';

@Injectable()
export class InngestExplorer implements OnModuleInit {
  private readonly logger = new Logger(InngestExplorer.name);

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly metadataScanner: MetadataScanner,
    private readonly inngestService: InngestService,
  ) {}

  async onModuleInit() {
    this.logger.log('🔍 Starting Inngest function discovery...');
    await this.explore();
  }

  async explore() {
    try {
      this.logger.log('📡 Starting function discovery with DiscoveryService...');
      
      const providers = this.discoveryService.getProviders();
      const controllers = this.discoveryService.getControllers();
      const instances = [...providers, ...controllers];

      this.logger.log(`🔎 Found ${instances.length} instances to scan`);

      let functionsFound = 0;
      for (const wrapper of instances) {
        const { instance } = wrapper;
        if (!instance || !Object.getPrototypeOf(instance)) {
          continue;
        }

        const functionCount = await this.lookupFunctions(instance);
        functionsFound += functionCount;
      }
      
      this.logger.log(`✅ Function discovery complete. Found ${functionsFound} decorated functions`);
    } catch (error) {
      this.logger.error('Failed to explore functions:', error.message, error.stack);
    }
  }

  async lookupFunctions(instance: any): Promise<number> {
    const prototype = Object.getPrototypeOf(instance);
    const methodNames = this.metadataScanner.getAllMethodNames(prototype);

    let functionCount = 0;
    for (const methodName of methodNames) {
      const wasRegistered = await this.registerFunction(instance, prototype, methodName);
      if (wasRegistered) {
        functionCount++;
      }
    }
    return functionCount;
  }

  private async registerFunction(
    instance: any,
    prototype: any,
    methodName: string,
  ): Promise<boolean> {
    const functionMetadata: InngestFunctionMetadata = Reflect.getMetadata(
      INNGEST_FUNCTION_METADATA,
      prototype,
      methodName,
    );

    if (!functionMetadata) {
      return false;
    }

    const { config } = functionMetadata;
    const handler = prototype[methodName];

    if (!handler) {
      this.logger.warn(`Handler not found for function: ${methodName}`);
      return false;
    }

    try {
      // Extract @UseMiddleware decorator middleware
      const middlewareFromDecorator = Reflect.getMetadata(
        INNGEST_MIDDLEWARE_METADATA,
        prototype,
        methodName,
      ) || [];

      // The functionMetadata should already contain all the middleware decorator data
      // since they modify the same metadata object

      // Merge all configuration including middleware decorator metadata
      // Extract core metadata properties and spread the rest as middleware properties
      const { target, propertyKey, config: metadataConfig, ...middlewareProperties } = functionMetadata;
      
      const fullConfig = {
        id: config.id || `${instance.constructor.name}.${methodName}`,
        name: config.name || methodName,
        ...config,
        // Apply all middleware decorator properties generically
        ...middlewareProperties,
        // Add function-level middleware from @UseMiddleware decorator
        ...(middlewareFromDecorator.length > 0 && { middleware: middlewareFromDecorator }),
      };

      // Create the Inngest function with proper binding
      const inngestFunction = this.inngestService.createFunction(
        fullConfig,
        async (inngestContext: any) => {
          // Debug: log the complete context we receive from Inngest
          this.logger.log(`🔧 [EXPLORER] Full context keys: [${Object.keys(inngestContext || {}).join(', ')}]`);
          
          // Extract standard parameters - the entire inngestContext IS the context
          const { event, step } = inngestContext;
          
          this.logger.log('🔧 [EXPLORER] Extracted parameters:');
          this.logger.log(`  - eventKeys: [${Object.keys(event || {}).join(', ')}]`);
          this.logger.log(`  - stepKeys: [${Object.keys(step || {}).join(', ')}]`);
          this.logger.log(`  - fullContextKeys: [${Object.keys(inngestContext || {}).join(', ')}]`);
          this.logger.log(`  - hasMiddlewareExecuted: ${JSON.stringify(inngestContext.middlewareExecuted)}`);
          this.logger.log(`  - hasValidatedAt: ${JSON.stringify(inngestContext.validatedAt)}`);
          
          // Bind the handler to the instance to maintain 'this' context
          const boundHandler = handler.bind(instance);
          
          // Check if the handler expects individual parameters or a context object
          const handlerMetadata = Reflect.getMetadata(
            INNGEST_HANDLER_METADATA,
            prototype,
            methodName,
          );

          // Create enhanced context with ALL middleware properties dynamically
          // Extract only middleware-added properties (exclude standard Inngest context keys)
          const standardInngestKeys = ['event', 'step', 'events', 'runId', 'attempt', 'logger'];
          const middlewareProperties = Object.fromEntries(
            Object.entries(inngestContext)
              .filter(([key]) => !standardInngestKeys.includes(key))
          );
          
          // The inngestContext already contains all middleware enhancements
          // We just need to extract the non-standard properties for the ctx parameter
          const enhancedCtx = middlewareProperties;

          this.logger.log(`🔧 [EXPLORER] Enhanced context keys: [${Object.keys(enhancedCtx).join(', ')}]`);

          if (handlerMetadata?.useContext) {
            // Pass as context object with enhanced context
            return await boundHandler({ event, step, ctx: enhancedCtx });
          } else {
            // Pass as individual parameters with enhanced context
            return await boundHandler(event, step, enhancedCtx);
          }
        },
      );

      this.logger.log(
        `✅ Registered Inngest function: ${inngestFunction.id} from ${instance.constructor.name}.${methodName}`,
      );
      this.logger.log(`🔧 Function config: ${JSON.stringify(fullConfig, null, 2)}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to register function ${methodName}: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }
}