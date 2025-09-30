# OpenTelemetry Tracing Integration

The NestJS-Inngest package provides **automatic OpenTelemetry tracing** integration for your Inngest workflows, enabling distributed tracing and observability in production environments without any manual configuration.

## Features

- **Automatic step-level tracing** - Traces actual work (steps) not function re-executions
- **Event-driven trace propagation** - Trace context automatically flows through event chains
- **Zero configuration** - Works automatically when OpenTelemetry packages are present
- **Optional dependency** - Gracefully handles missing OpenTelemetry packages
- **Comprehensive observability** - Step timing, errors, and business context

## Installation

The tracing functionality is built-in but requires OpenTelemetry packages as optional dependencies:

```bash
npm install @opentelemetry/api @opentelemetry/sdk-node
```

## Basic Usage

### 1. Enable Tracing (Automatic)

Tracing is **automatically enabled** when OpenTelemetry packages are detected - no configuration required:

```typescript
import { Module } from '@nestjs/common';
import { InngestModule } from '@torixtv/nestjs-inngest';

@Module({
  imports: [
    InngestModule.forRoot({
      id: 'my-app',
      // Tracing automatically enabled when @opentelemetry packages are present
    }),
  ],
})
export class AppModule {}
```

### 2. Automatic Step Tracing

Every step in your functions is automatically traced - no decorators needed:

```typescript
import { Injectable } from '@nestjs/common';
import { InngestFunction } from '@torixtv/nestjs-inngest';

@Injectable()
export class PaymentService {
  @InngestFunction({
    id: 'process-payment',
    trigger: { event: 'payment.requested' }
  })
  async processPayment(event: any, step: any) {
    // Each step.run() automatically creates a span
    const payment = await step.run('charge-card', () => {
      return this.chargeCard(event.data);
    });

    // Event sending automatically propagates trace context
    await step.sendEvent('payment.completed', {
      data: { orderId: event.data.orderId, payment }
    });

    return payment;
  }

  private async chargeCard(data: any) {
    // Implementation
  }
}
```

### 3. Trace Propagation Across Events

Trace context automatically flows through your event chains:

```typescript
@Injectable()
export class OrderService {
  @InngestFunction({
    id: 'process-order',
    trigger: { event: 'payment.completed' } // Inherits trace from payment.requested
  })
  async processOrder(event: any, step: any) {
    // This function continues the same trace started by payment.requested
    await step.run('fulfill-order', () => {
      return this.fulfillOrder(event.data.orderId);
    });
  }
}
```

## Configuration Options

Customize tracing behavior through module configuration:

```typescript
InngestModule.forRoot({
  id: 'my-app',
  tracing: {
    enabled: true, // Auto-detected by default
    spanNameFormat: 'inngest.step.{type}.{id}',
    includeEventData: false, // Privacy by default
    includeStepData: false, // Performance by default
    defaultAttributes: {
      service: 'payment-service',
      version: '1.0.0'
    },
    contextInjection: {
      enabled: true, // Auto-inject trace context into events
      fieldName: 'traceContext' // Where to inject context
    }
  }
})
```

### Environment Variable Override

```bash
# Disable tracing entirely
TRACING_ENABLED=false

# Or control via config
NODE_ENV=production
```

## Span Attributes

Every traced Inngest function automatically includes the following span attributes:

- `inngest.function.id` - The function ID
- `inngest.function.name` - The function name
- `inngest.event.name` - The triggering event name (if available)
- `inngest.run.id` - The Inngest run ID
- `inngest.function.success` - Whether the function succeeded
- `inngest.function.duration_ms` - Execution time in milliseconds

## Advanced Usage

### Manual Tracing Service

For advanced use cases, you can inject the tracing service directly:

```typescript
import { Injectable } from '@nestjs/common';
import { InngestTracingService } from '@torixtv/nestjs-inngest';

@Injectable()
export class AdvancedService {
  constructor(
    private readonly tracingService: InngestTracingService
  ) {}

  async complexOperation() {
    const span = this.tracingService.startFunctionSpan(
      'complex-operation',
      'Complex Operation',
      {
        attributes: { 
          operation: 'data-processing',
          priority: 'high' 
        }
      }
    );

    try {
      // Your business logic here
      const result = await this.doWork();
      
      this.tracingService.recordFunctionResult(span, {
        success: true,
        duration: Date.now() - startTime,
        metadata: { recordsProcessed: result.count }
      });
      
      return result;
    } catch (error) {
      this.tracingService.recordFunctionResult(span, {
        success: false,
        duration: Date.now() - startTime,
        error
      });
      throw error;
    } finally {
      this.tracingService.endSpan(span);
    }
  }
}
```

### Trace Context Extraction

Access current trace context within your functions:

```typescript
@Injectable()
export class TraceAwareService {
  constructor(
    private readonly tracingService: InngestTracingService
  ) {}

  @InngestFunction({
    id: 'trace-aware-function',
    trigger: { event: 'data.process' }
  })
  @Traced()
  async processWithTracing(event: any, step: any) {
    // Get current trace context
    const traceContext = this.tracingService.getCurrentTraceContext();
    
    if (traceContext) {
      console.log(`Processing in trace: ${traceContext.traceId}`);
      
      // Pass trace context to external services
      await this.callExternalAPI(event.data, {
        'x-trace-id': traceContext.traceId,
        'x-span-id': traceContext.spanId
      });
    }

    return await step.run('process-data', () => {
      return this.processData(event.data);
    });
  }
}
```

## OpenTelemetry SDK Configuration

Configure the OpenTelemetry SDK in your application startup:

```typescript
// tracing.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';

const sdk = new NodeSDK({
  traceExporter: new JaegerExporter({
    endpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();

// main.ts
import './tracing'; // Import before your application
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
}
bootstrap();
```

## Error Handling and Graceful Degradation

The tracing integration is designed to be non-intrusive:

- **Missing OpenTelemetry packages**: Tracing is automatically disabled without errors
- **Tracing failures**: Operations continue normally, with warnings logged
- **No performance impact**: When disabled, tracing adds zero overhead

## Integration with Monitoring

Tracing works seamlessly alongside the monitoring system:

```typescript
@InngestFunction({
  id: 'monitored-and-traced',
  trigger: { event: 'user.signup' }
})
@Traced({
  spanName: 'user-signup-processing',
  attributes: { feature: 'user-management' }
})
async handleUserSignup(event: any, step: any) {
  // Both monitoring metrics AND tracing spans are automatically created
  return await step.run('create-user', () => {
    return this.userService.createUser(event.data);
  });
}
```

## Best Practices

1. **Use meaningful span names**: Choose descriptive names that identify the operation
2. **Add relevant attributes**: Include business context without sensitive data
3. **Avoid recording sensitive parameters**: Keep `recordParameters: false` for security
4. **Instrument external calls**: Propagate trace context to downstream services
5. **Monitor trace sampling**: Configure appropriate sampling rates for production

## Troubleshooting

### Tracing Not Working

1. Check that OpenTelemetry packages are installed
2. Verify SDK initialization happens before app startup
3. Check logs for tracing service initialization messages

### Performance Concerns

1. Configure trace sampling in production
2. Avoid recording large payloads as attributes
3. Monitor trace export performance

### Missing Traces

1. Ensure @Traced() decorator is applied correctly
2. Check that spans are properly ended
3. Verify exporter configuration and connectivity