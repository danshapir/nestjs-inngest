# OpenTelemetry Tracing for NestJS-Inngest

This package provides enhanced OpenTelemetry tracing for Inngest functions in NestJS applications, offering step-level visibility and distributed trace correlation across function boundaries.

## Features

- 🔍 **Enhanced Span Naming** - Descriptive span names instead of generic ones
- 🔗 **TraceId Propagation** - Automatic and manual trace correlation across functions
- 📊 **Step-Level Tracing** - Individual spans for each `step.run()` operation
- 🏷️ **Rich Attributes** - Business context and OpenTelemetry semantic conventions
- 🎯 **Function Context** - Clear identification of which function and trigger caused execution
- 🌐 **HTTP Header Support** - W3C traceparent header parsing for external trace correlation

## Quick Start

### 1. Enable Tracing in Your Module

```typescript
import { InngestModule } from 'nestjs-inngest';

@Module({
  imports: [
    InngestModule.forRoot({
      id: 'my-app',
      eventKey: process.env.INNGEST_EVENT_KEY!,
      tracing: {
        enabled: true,
        includeEventData: false,
        includeStepData: false,
        defaultAttributes: {
          'service.name': 'my-app',
          'service.version': '1.0.0',
          'environment': 'production'
        },
        contextInjection: {
          enabled: true,
          fieldName: 'traceContext'
        }
      }
    })
  ]
})
export class AppModule {}
```

### 2. Functions are Automatically Traced

```typescript
import { Injectable } from '@nestjs/common';
import { InngestFunction } from 'nestjs-inngest';

@Injectable()
export class UserService {
  @InngestFunction({
    id: 'user-onboarding',
    trigger: { event: 'user.created' }
  })
  async handleUserOnboarding(event: any, step: any) {
    // Each step.run() automatically creates a span
    const user = await step.run('validate-user', async () => {
      return this.validateUser(event.data);
    });

    const profile = await step.run('create-profile', async () => {
      return this.createUserProfile(user);
    });

    await step.run('send-welcome-email', async () => {
      return this.emailService.sendWelcome(user.email);
    });

    return { success: true, userId: user.id };
  }
}
```

## Trace Output Examples

### Enhanced Span Names

**Before (Generic):**
```
inngest.execution
├── inngest.step
├── inngest.step
└── inngest.step
```

**After (Descriptive):**
```
user-onboarding.execution
├── user-onboarding.step.validate-user
├── user-onboarding.step.create-profile
└── user-onboarding.step.send-welcome-email
```

### Rich Trace Attributes

Each span includes comprehensive attributes:

```typescript
{
  // OpenTelemetry Semantic Conventions
  'service.name': 'my-app',
  'service.version': '1.0.0',
  
  // Function Context
  'function.id': 'user-onboarding',
  'function.name': 'Handle User Onboarding',
  'parent.function.id': 'user-onboarding',
  
  // Event Context
  'event.name': 'user.created',
  'event.id': 'evt_123abc',
  'run.id': 'run_456def',
  
  // Business Context (from event data)
  'user.id': 'user-789',
  'tenant.id': 'tenant-abc',
  'correlation.id': 'trace-xyz',
  
  // Step Context (for step spans)
  'step.name': 'validate-user',
  'step.parent_function': 'user-onboarding',
  'step.op': 'run'
}
```

## TraceId Propagation

### Automatic Propagation

When functions send events to other functions, trace context is automatically propagated:

```typescript
@Injectable()
export class OrderService {
  constructor(private inngestService: InngestService) {}

  @InngestFunction({
    id: 'process-order',
    trigger: { event: 'order.created' }
  })
  async processOrder(event: any, step: any) {
    // Validate order
    const order = await step.run('validate-order', async () => {
      return this.validateOrder(event.data);
    });

    // Send event - trace context automatically injected
    await step.sendEvent('payment-required', {
      name: 'payment.requested',
      data: {
        orderId: order.id,
        amount: order.total,
        userId: order.userId
      }
    });

    return { orderId: order.id };
  }
}

@Injectable() 
export class PaymentService {
  @InngestFunction({
    id: 'process-payment',
    trigger: { event: 'payment.requested' }
  })
  async processPayment(event: any, step: any) {
    // This function will share the same trace as process-order
    // because trace context was automatically propagated
    
    const payment = await step.run('charge-card', async () => {
      return this.chargeCard(event.data);
    });

    return { paymentId: payment.id };
  }
}
```

### Manual TraceId Propagation

For explicit control over trace correlation:

```typescript
@Injectable()
export class NotificationService {
  constructor(private inngestService: InngestService) {}

  async sendNotificationWithTrace(userId: string, traceId: string) {
    // Send event with specific trace context
    await this.inngestService.sendWithTraceId(
      {
        name: 'notification.send',
        data: { userId, message: 'Welcome!' }
      },
      traceId // Can be string (W3C format) or TraceContext object
    );
  }

  // Extract trace from HTTP request
  async handleWebhook(req: Request) {
    const traceContext = this.inngestService.extractTraceFromHeaders(req.headers);
    
    if (traceContext) {
      await this.inngestService.sendWithTraceId(
        {
          name: 'webhook.received',
          data: { source: 'external-service', payload: req.body }
        },
        traceContext
      );
    }
  }
}
```

### HTTP Header Integration

Send events with trace context from HTTP requests:

```typescript
@Controller('api/orders')
export class OrderController {
  constructor(private inngestService: InngestService) {}

  @Post()
  async createOrder(@Body() orderData: any, @Headers() headers: any) {
    // Extract trace context from incoming HTTP request
    const traceContext = this.inngestService.extractTraceFromHeaders(headers);
    
    if (traceContext) {
      // Send event with preserved trace context
      await this.inngestService.sendWithTraceId(
        {
          name: 'order.created', 
          data: orderData
        },
        traceContext
      );
    } else {
      // Send normally - new trace will be created
      await this.inngestService.send({
        name: 'order.created',
        data: orderData
      });
    }

    return { success: true };
  }
}
```

## W3C Traceparent Format

The implementation supports standard W3C traceparent headers:

```bash
# HTTP request with trace context
curl -X POST https://api.example.com/orders \
  -H "traceparent: 00-12345678901234567890123456789012-1234567890123456-01" \
  -H "Content-Type: application/json" \
  -d '{"productId": "prod-123", "quantity": 2}'
```

Format: `version-traceId-spanId-flags`
- `version`: Always `00`
- `traceId`: 32 hex characters
- `spanId`: 16 hex characters  
- `flags`: 2 hex characters (01 = sampled)

## Advanced Usage

### Custom Span Attributes

Add business-specific attributes to all spans:

```typescript
@InngestFunction({
  id: 'process-subscription',
  trigger: { event: 'subscription.created' }
})
async processSubscription(event: any, step: any) {
  // Attributes from event data are automatically included
  const subscription = await step.run('validate-subscription', async () => {
    // This span will include:
    // - tenant.id: from event.data.tenantId
    // - user.id: from event.data.userId  
    // - subscription.tier: from event.data.tier
    return this.validateSubscription(event.data);
  });

  return subscription;
}
```

### Error Handling and Tracing

Errors are automatically captured in spans:

```typescript
@InngestFunction({
  id: 'risky-operation',
  trigger: { event: 'risk.check' }
})
async performRiskyOperation(event: any, step: any) {
  try {
    const result = await step.run('external-api-call', async () => {
      // If this throws, the span will be marked as error
      return await this.externalApiService.call(event.data);
    });
    
    return result;
  } catch (error) {
    // Error context preserved in trace
    throw error;
  }
}
```

### Trace Sampling

Configure sampling to manage trace volume:

```typescript
// In your OpenTelemetry setup
import { TraceIdRatioBasedSampler } from '@opentelemetry/sdk-trace-base';

const tracerProvider = new NodeTracerProvider({
  sampler: new TraceIdRatioBasedSampler(0.1), // Sample 10% of traces
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'my-app',
  }),
});
```

## Monitoring and Observability

### Jaeger Integration

Export traces to Jaeger for visualization:

```typescript
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';

const jaegerExporter = new JaegerExporter({
  endpoint: 'http://localhost:14268/api/traces',
});

tracerProvider.addSpanProcessor(
  new BatchSpanProcessor(jaegerExporter)
);
```

### Custom Metrics

Combine with metrics for comprehensive observability:

```typescript
@Injectable()
export class MetricsService {
  private functionDuration = createHistogram('inngest_function_duration', {
    description: 'Duration of Inngest function executions',
    labelNames: ['function_id', 'status']
  });

  recordFunctionExecution(functionId: string, duration: number, success: boolean) {
    this.functionDuration
      .labels(functionId, success ? 'success' : 'error')
      .observe(duration);
  }
}
```

## Troubleshooting

### No Traces Appearing

1. **Check OpenTelemetry Setup**: Ensure tracer provider is properly configured
2. **Verify Sampling**: Check if traces are being sampled out
3. **Check Exporter**: Verify trace exporter configuration and endpoint

### Broken Trace Chains  

1. **Manual Event Sending**: Use `sendWithTraceId()` instead of `send()` 
2. **Async Boundaries**: Ensure trace context is preserved across async operations
3. **HTTP Integration**: Include traceparent headers in external requests

### Performance Impact

1. **Sampling**: Use appropriate sampling rates for production
2. **Attribute Limits**: Be mindful of span attribute count and size
3. **Batching**: Use batch span processors for better performance

## Testing

### Unit Testing with Traces

```typescript
describe('Tracing Integration', () => {
  it('should propagate trace context', async () => {
    const traceId = '12345678901234567890123456789012';
    const headers = {
      traceparent: `00-${traceId}-1234567890123456-01`
    };
    
    const context = inngestService.extractTraceFromHeaders(headers);
    expect(context?.traceId).toBe(traceId);
  });
});
```

### Development Mode

For development, use the enhanced console exporter (automatically enabled in test/dev):

```
🔍 TRACING: OpenTelemetry Spans Export:
================================================================================

📊 Trace: abc123def456ghi789
------------------------------------------------------------
⚡ user-onboarding.execution
   ⏱️  Duration: 150.23ms
   🔗 SpanId: span123abc
   📋 Key Attributes:
      function.id: user-onboarding
      event.name: user.created
      user.id: user-789
   │
   🔧 user-onboarding.step.validate-user
      ⏱️  Duration: 45.12ms
      🔗 SpanId: span456def
      │
   🔧 user-onboarding.step.create-profile  
      ⏱️  Duration: 67.89ms
      🔗 SpanId: span789ghi
      │
   🔧 user-onboarding.step.send-welcome-email
      ⏱️  Duration: 23.45ms
      🔗 SpanId: span012jkl
------------------------------------------------------------
✅ Trace complete (4 spans)

================================================================================
🎯 Export Summary: 4 spans across 1 traces
🎉 End of spans export
```

## Best Practices

1. **Meaningful Step Names**: Use descriptive names for `step.run()` operations
2. **Trace Correlation**: Always propagate trace context for related operations
3. **Attribute Consistency**: Use consistent attribute naming across functions
4. **Error Handling**: Let errors bubble up to preserve trace context
5. **Sampling Strategy**: Use appropriate sampling rates for your traffic volume
6. **Security**: Never include sensitive data in span attributes
7. **Performance**: Monitor trace collection overhead in production

## Configuration Options

### Complete InngestModule Configuration

```typescript
InngestModule.forRoot({
  // Core Inngest Configuration (Required)
  id: 'my-app',
  eventKey: process.env.INNGEST_EVENT_KEY,
  baseUrl: process.env.INNGEST_BASE_URL, // Optional: defaults to Inngest Cloud
  
  // Module Configuration
  isGlobal: true, // Make service available globally
  path: 'inngest', // Custom endpoint path (defaults to 'inngest')
  signingKey: process.env.INNGEST_SIGNING_KEY, // For webhook validation
  
  // Additional Inngest Client Options
  middleware: [], // Custom Inngest middleware
  clientOptions: {}, // Additional Inngest client configuration
  logger: console, // Custom logger instance
  
  // Environment
  environment: 'production', // Used in health checks and monitoring
  
  // Tracing Configuration ✅ FULLY IMPLEMENTED
  tracing: {
    enabled: true,
    includeEventData: false, // Include event data in spans (privacy consideration)
    includeStepData: false, // Include step data in spans (performance consideration) 
    defaultAttributes: {
      'service.name': 'my-app',
      'service.version': '1.0.0'
    },
    contextInjection: {
      enabled: true, // Auto-inject trace context into sendEvent calls
      fieldName: 'traceContext' // Field name for trace context in event data
    }
  },
  
  // Health Checks ✅ PARTIALLY IMPLEMENTED
  health: {
    enabled: true,
    path: '/health',
    includeDetails: true,
    enableMetrics: true,
    enableLiveness: true,
    enableReadiness: true,
    checkInterval: 30000
  },
  
  // Monitoring ✅ PARTIALLY IMPLEMENTED  
  monitoring: {
    enabled: true,
    collectMetrics: true,
    metricsInterval: 30000,
    healthCheckInterval: 10000,
    enableTracing: true
  },
  
  // Performance ✅ MINIMAL IMPLEMENTATION
  performance: {
    memoryLimit: 512 // Used in health checks only
  }
})
```

### Tracing Configuration Reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | `boolean` | `true` | Enable/disable tracing |
| `includeEventData` | `boolean` | `false` | Include event data in span attributes |
| `includeStepData` | `boolean` | `false` | Include step data in span attributes |
| `defaultAttributes` | `Record<string, string\|number\|boolean>` | `{}` | Default attributes added to all spans |
| `contextInjection.enabled` | `boolean` | `true` | Auto-inject trace context into events |
| `contextInjection.fieldName` | `string` | `'traceContext'` | Field name for injected trace context |

## API Reference

### InngestService Methods

```typescript
interface InngestService {
  // Send event with automatic trace propagation
  send<T>(payload: T): Promise<any>;
  
  // Send event with explicit trace context
  sendWithTraceId<T>(payload: T, traceContext: TraceContext | string): Promise<any>;
  
  // Extract trace context from HTTP headers
  extractTraceFromHeaders(headers: Record<string, any>): TraceContext | null;
  
  // Get current active trace context
  getCurrentTraceContext(): TraceContext | null;
}

interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  traceFlags: number;
}
```

## Implementation Status

### ✅ Fully Implemented
- **Core Inngest Options**: `id`, `eventKey`, `baseUrl`, `path`, `signingKey`, etc.
- **Tracing**: Complete OpenTelemetry integration with step-level tracing
- **Module Configuration**: `isGlobal`, `middleware`, `clientOptions`

### ✅ Partially Implemented  
- **Health Checks**: Basic health endpoint and memory monitoring
- **Monitoring**: Metrics collection and basic monitoring
- **Performance**: Only `memoryLimit` for health checks

### ❌ Not Implemented
- **Retry Policies**: No automatic retry logic
- **Circuit Breakers**: No circuit breaker patterns
- **Rate Limiting**: No request rate limiting
- **Advanced Security**: Only basic signing key validation
- **Advanced Logging**: Uses standard NestJS logger

This enhanced tracing implementation provides comprehensive observability for your NestJS-Inngest applications, making it easy to debug, monitor, and optimize your event-driven workflows.