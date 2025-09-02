import { Injectable, Logger } from '@nestjs/common';
import { 
  InngestService, 
  InngestFunction, 
  UseMiddleware,
  Retries,
  Concurrency
} from '../../../../src';
import { InngestMiddleware } from 'inngest';

// Test middleware for integration testing
const loggingMiddleware = new InngestMiddleware({
  name: "Request Logging",
  init: () => {
    console.log('🔧 Logging middleware initialized');
    return {
      onFunctionRun: ({ fn, ctx }) => {
        return {
          transformInput: ({ ctx, fn, steps }) => {
            console.log(`🚀 [MIDDLEWARE] Starting function: ${fn.id()}`);
            console.log(`📦 [MIDDLEWARE] Event data:`, JSON.stringify(ctx.event, null, 2));
            
            // Add middleware metadata to context - ensure ctx exists
            const enhancedCtx = {
              ...ctx,
              middlewareExecuted: [...((ctx as any).middlewareExecuted || []), 'logging']
            };
            
            console.log(`🔧 [MIDDLEWARE] Enhanced context:`, JSON.stringify(enhancedCtx, null, 2));
            
            return { ctx: enhancedCtx, function: fn, steps };
          }
        };
      }
    };
  }
});

const validationMiddleware = new InngestMiddleware({
  name: "Event Validation", 
  init: () => {
    console.log('🔧 Validation middleware initialized');
    return {
      onFunctionRun: ({ fn, ctx }) => {
        return {
          transformInput: ({ ctx, fn, steps }) => {
            console.log(`🔍 [MIDDLEWARE] Validating event for function: ${fn.id()}`);
            
            // Add validation logic
            if (!ctx.event.data) {
              throw new Error('Event data is required');
            }
            
            // Add middleware metadata to context - ensure ctx exists and is properly spread
            const enhancedCtx = {
              ...ctx,
              middlewareExecuted: [...((ctx as any).middlewareExecuted || []), 'validation'],
              validatedAt: new Date().toISOString()
            };
            
            console.log(`✅ [MIDDLEWARE] Event validated successfully`);
            console.log(`🔧 [MIDDLEWARE] Final enhanced context:`, JSON.stringify(enhancedCtx, null, 2));
            
            return { ctx: enhancedCtx, function: fn, steps };
          }
        };
      }
    };
  }
});

// NEW: Create completely different middleware to test generics
const authMiddleware = new InngestMiddleware({
  name: "Authentication Check",
  init: () => {
    console.log('🔧 Auth middleware initialized');
    return {
      onFunctionRun: ({ fn, ctx }) => {
        return {
          transformInput: ({ ctx, fn, steps }) => {
            console.log(`🔐 [AUTH] Checking authentication for function: ${fn.id()}`);
            
            // Simulate auth check
            const userId = ctx.event.data?.userId || 'anonymous';
            const isAuthenticated = userId !== 'anonymous';
            const authLevel = isAuthenticated ? 'authenticated' : 'guest';
            const permissions = isAuthenticated ? ['read', 'write'] : ['read'];
            
            const enhancedCtx = {
              ...ctx,
              // Completely different property names
              currentUser: userId,
              authenticationStatus: authLevel,
              userPermissions: permissions,
              authenticatedAt: new Date().toISOString(),
              sessionId: `session_${Math.random().toString(36).substr(2, 9)}`,
              authTokenValid: isAuthenticated
            };
            
            console.log(`🔐 [AUTH] Authentication complete: ${authLevel}`);
            console.log(`🔐 [AUTH] Auth enhanced context:`, JSON.stringify(enhancedCtx, null, 2));
            
            return { ctx: enhancedCtx, function: fn, steps };
          }
        };
      }
    };
  }
});

const metricsMiddleware = new InngestMiddleware({
  name: "Performance Metrics",
  init: () => {
    console.log('🔧 Metrics middleware initialized');
    return {
      onFunctionRun: ({ fn, ctx }) => {
        return {
          transformInput: ({ ctx, fn, steps }) => {
            console.log(`📊 [METRICS] Tracking metrics for function: ${fn.id()}`);
            
            // Add performance tracking
            const startTime = Date.now();
            const requestId = `req_${Math.random().toString(36).substr(2, 9)}`;
            const region = 'us-east-1';
            
            const enhancedCtx = {
              ...ctx,
              // More different property names
              performanceStartTime: startTime,
              requestTraceId: requestId,
              executionRegion: region,
              metricsEnabled: true,
              functionCallCount: ((ctx as any).functionCallCount || 0) + 1,
              customMetrics: {
                memory: '128MB',
                timeout: '30s',
                priority: 'normal'
              }
            };
            
            console.log(`📊 [METRICS] Metrics tracking enabled for request: ${requestId}`);
            console.log(`📊 [METRICS] Metrics enhanced context:`, JSON.stringify(enhancedCtx, null, 2));
            
            return { ctx: enhancedCtx, function: fn, steps };
          }
        };
      }
    };
  }
});

@Injectable()
export class MiddlewareTestService {
  private readonly logger = new Logger(MiddlewareTestService.name);

  constructor(private readonly inngestService: InngestService) {}

  // Integration test function with middleware
  @InngestFunction({
    id: 'middleware-test-function',
    name: 'Test Function with Middleware',
    trigger: { event: 'test.middleware' },
  })
  @UseMiddleware(loggingMiddleware, validationMiddleware)
  @Retries(2)
  @Concurrency(3)
  async testMiddleware({ event, step, ctx }: { event: any; step: any; ctx: any }) {
    this.logger.log(`🎯 Handler started for middleware test`);
    
    // Debug: log the actual context structure
    this.logger.log(`🔍 Debug - ctx:`, JSON.stringify(ctx, null, 2));
    this.logger.log(`🔍 Debug - event keys:`, Object.keys(event));
    
    // Check if middleware data is available
    const middlewareExecuted = (ctx && ctx.middlewareExecuted) || (event && event.middlewareExecuted) || [];
    const validatedAt = (ctx && ctx.validatedAt) || (event && event.validatedAt) || 'not available';
    
    this.logger.log(`🔗 Middleware executed: ${JSON.stringify(middlewareExecuted)}`);
    this.logger.log(`📅 Validated at: ${validatedAt}`);
    
    // Step 1: Process with middleware context
    const result = await step.run('process-with-middleware', async () => {
      this.logger.log(`🔄 Processing with middleware context available`);
      await this.simulateDelay(100);
      
      return {
        middlewareWorked: true,
        middlewareExecuted: middlewareExecuted,
        validatedAt: validatedAt,
        eventData: event.data,
      };
    });
    
    // Step 2: Send confirmation event
    await step.sendEvent('send-middleware-confirmation', {
      name: 'test.middleware.completed',
      data: {
        originalEventId: event.id,
        middlewareResult: result,
        processingComplete: true,
      },
    });
    
    this.logger.log(`✅ Middleware test function completed successfully`);
    
    return {
      success: true,
      middlewareExecuted: middlewareExecuted,
      validatedAt: validatedAt,
      result,
    };
  }

  // NEW: Generic middleware test with completely different properties
  @InngestFunction({
    id: 'generic-middleware-test',
    name: 'Generic Middleware Test Function', 
    trigger: { event: 'test.generic.middleware' },
  })
  @UseMiddleware(authMiddleware, metricsMiddleware)
  @Retries(1)
  @Concurrency(2)
  async testGenericMiddleware({ event, step, ctx }: { event: any; step: any; ctx: any }) {
    this.logger.log(`🧪 Generic middleware test started`);
    
    // Debug: log the context we receive to prove ALL properties come through
    this.logger.log(`🔍 Complete ctx received:`, JSON.stringify(ctx, null, 2));
    
    // Test accessing auth middleware properties
    this.logger.log(`👤 Current User: ${ctx?.currentUser || 'not available'}`);
    this.logger.log(`🔐 Auth Status: ${ctx?.authenticationStatus || 'not available'}`);
    this.logger.log(`🔑 Permissions: ${JSON.stringify(ctx?.userPermissions || [])}`);
    this.logger.log(`🎫 Session ID: ${ctx?.sessionId || 'not available'}`);
    this.logger.log(`✅ Auth Token Valid: ${ctx?.authTokenValid || false}`);
    
    // Test accessing metrics middleware properties  
    this.logger.log(`📊 Request Trace ID: ${ctx?.requestTraceId || 'not available'}`);
    this.logger.log(`🌍 Execution Region: ${ctx?.executionRegion || 'not available'}`);
    this.logger.log(`⏱️ Start Time: ${ctx?.performanceStartTime || 'not available'}`);
    this.logger.log(`🔢 Function Call Count: ${ctx?.functionCallCount || 0}`);
    this.logger.log(`📈 Metrics Enabled: ${ctx?.metricsEnabled || false}`);
    this.logger.log(`💾 Custom Metrics: ${JSON.stringify(ctx?.customMetrics || {})}`);
    
    // Step that uses middleware context
    const result = await step.run('process-with-generic-middleware', async () => {
      this.logger.log(`🔄 Processing with generic middleware context`);
      await this.simulateDelay(50);
      
      return {
        genericMiddlewareWorked: true,
        authData: {
          user: ctx?.currentUser,
          status: ctx?.authenticationStatus,
          permissions: ctx?.userPermissions,
          sessionId: ctx?.sessionId
        },
        metricsData: {
          traceId: ctx?.requestTraceId,
          region: ctx?.executionRegion,
          startTime: ctx?.performanceStartTime,
          callCount: ctx?.functionCallCount,
          customMetrics: ctx?.customMetrics
        },
        timestamp: new Date().toISOString()
      };
    });
    
    // Send completion event
    await step.sendEvent('send-generic-completion', {
      name: 'test.generic.middleware.completed',
      data: {
        originalEventId: event.id,
        middlewareResult: result,
        allMiddlewareProperties: Object.keys(ctx || {}),
        processingComplete: true,
      },
    });
    
    this.logger.log(`✅ Generic middleware test completed successfully`);
    
    return {
      success: true,
      genericMiddlewareTest: true,
      authMiddlewareData: {
        currentUser: ctx?.currentUser,
        authenticationStatus: ctx?.authenticationStatus,
        userPermissions: ctx?.userPermissions,
        sessionId: ctx?.sessionId,
        authTokenValid: ctx?.authTokenValid
      },
      metricsMiddlewareData: {
        requestTraceId: ctx?.requestTraceId,
        executionRegion: ctx?.executionRegion,
        performanceStartTime: ctx?.performanceStartTime,
        functionCallCount: ctx?.functionCallCount,
        metricsEnabled: ctx?.metricsEnabled,
        customMetrics: ctx?.customMetrics
      },
      allPropertiesReceived: Object.keys(ctx || {}),
      result
    };
  }

  // Helper method to simulate async operations
  private async simulateDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}