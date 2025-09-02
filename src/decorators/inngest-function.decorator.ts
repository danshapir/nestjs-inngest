import { SetMetadata } from '@nestjs/common';
import { 
  INNGEST_FUNCTION_METADATA, 
  INNGEST_HANDLER_METADATA 
} from '../constants';
import { InngestFunctionConfig, InngestFunctionMetadata } from '../interfaces';

/**
 * Decorator to mark a method as an Inngest function
 * @param config - Configuration for the Inngest function
 */
export function InngestFunction(
  config: InngestFunctionConfig,
): any {
  return (target: any, propertyKey?: string | symbol, descriptor?: PropertyDescriptor | any) => {
    // Handle both legacy and modern decorator signatures
    if (typeof propertyKey === 'object' && propertyKey && 'kind' in propertyKey) {
      // Modern decorator (stage 3)
      const context = propertyKey as any;
      const propertyName = context.name;
      
      const metadata: InngestFunctionMetadata = {
        target,
        propertyKey: propertyName,
        config,
      };

      Reflect.defineMetadata(INNGEST_FUNCTION_METADATA, metadata, target, propertyName);
      Reflect.defineMetadata(
        INNGEST_HANDLER_METADATA, 
        { useContext: true }, 
        target, 
        propertyName,
      );
      
      return target;
    } else {
      // Legacy decorator
      if (!propertyKey) {
        throw new Error('PropertyKey is required for legacy decorator');
      }
      
      // Check if there's existing metadata from middleware decorators
      const existingMetadata = Reflect.getMetadata(INNGEST_FUNCTION_METADATA, target, propertyKey) || {};
      
      const metadata: InngestFunctionMetadata = {
        target,
        propertyKey,
        config,
        // Preserve existing middleware metadata
        ...existingMetadata,
      };

      Reflect.defineMetadata(INNGEST_FUNCTION_METADATA, metadata, target, propertyKey);
      
      // Mark as using context object by default
      Reflect.defineMetadata(
        INNGEST_HANDLER_METADATA, 
        { useContext: true }, 
        target, 
        propertyKey,
      );

      return descriptor;
    }
  };
}

/**
 * Decorator to mark a method as an Inngest scheduled function
 * @param id - Function ID
 * @param cron - Cron expression for scheduling
 * @param options - Additional function options
 */
export function InngestCron(
  id: string,
  cron: string,
  options?: Omit<InngestFunctionConfig, 'id' | 'trigger'>,
): any {
  return InngestFunction({
    id,
    trigger: { cron },
    ...options,
  });
}

/**
 * Decorator to mark a method as an Inngest event-triggered function
 * @param id - Function ID
 * @param event - Event name or event configuration
 * @param options - Additional function options
 */
export function InngestEvent(
  id: string,
  event: string | { event: string; if?: string; match?: string },
  options?: Omit<InngestFunctionConfig, 'id' | 'trigger'>,
): any {
  const trigger = typeof event === 'string' ? { event } : event;
  
  return InngestFunction({
    id,
    trigger,
    ...options,
  });
}