# OpenTelemetry Tracing Example

This example demonstrates how to implement distributed tracing with OpenTelemetry in a real-world e-commerce order processing workflow using NestJS-Inngest.

## Features Demonstrated

- **End-to-end tracing** across multiple Inngest functions
- **Trace context propagation** between services
- **Custom span attributes** for business context
- **Error tracking** and span status management
- **Integration with monitoring** for comprehensive observability

## Architecture

The example implements an order processing workflow:

1. **Order Received** → Validates order and initiates processing
2. **Payment Processing** → Handles payment with external service
3. **Inventory Check** → Verifies product availability
4. **Fulfillment** → Ships the order
5. **Notification** → Sends confirmation emails

Each step creates spans with relevant business context, and trace context is propagated throughout the workflow.

## Setup

### 1. Install Dependencies

```bash
npm install
npm install @opentelemetry/api @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node @opentelemetry/exporter-jaeger
```

### 2. Start Jaeger (Optional)

```bash
docker run -d --name jaeger \
  -p 16686:16686 \
  -p 14250:14250 \
  -p 14268:14268 \
  jaegertracing/all-in-one:latest
```

### 3. Configure Environment

```bash
export JAEGER_ENDPOINT=http://localhost:14268/api/traces
export INNGEST_DEV_URL=http://localhost:8288
```

### 4. Run the Application

```bash
npm run start:dev
```

## Viewing Traces

1. Open Jaeger UI: http://localhost:16686
2. Select service: `nestjs-inngest-tracing-example`
3. Search for traces to see the complete order processing workflow

## Key Implementation Details

### Tracing Configuration

The application initializes OpenTelemetry before NestJS startup to ensure all operations are traced:

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
```

### Traced Inngest Functions

Each function in the workflow uses the `@Traced()` decorator with meaningful span names and business context:

```typescript
@InngestFunction({
  id: 'process-payment',
  trigger: { event: 'order.payment.required' }
})
@Traced({
  spanName: 'payment-processing',
  attributes: {
    service: 'payment',
    component: 'order-workflow'
  }
})
async processPayment(event: OrderPaymentEvent, step: any) {
  const { orderId, amount, paymentMethod } = event.data;
  
  return await step.run('charge-payment', async () => {
    // Simulate payment processing with trace context
    const paymentResult = await this.paymentGateway.charge({
      orderId,
      amount,
      method: paymentMethod
    });
    
    if (paymentResult.success) {
      // Continue workflow
      await step.sendEvent('order.inventory.check', {
        data: { orderId, items: event.data.items }
      });
    } else {
      // Handle failure
      await step.sendEvent('order.payment.failed', {
        data: { orderId, reason: paymentResult.error }
      });
    }
    
    return paymentResult;
  });
}
```

### Manual Span Creation

For complex operations, the example shows manual span creation:

```typescript
async chargeCustomer(orderData: any): Promise<PaymentResult> {
  const span = this.tracingService.startFunctionSpan(
    'payment-gateway-charge',
    'Payment Gateway Charge',
    {
      attributes: {
        'payment.amount': orderData.amount,
        'payment.currency': orderData.currency,
        'payment.method': orderData.paymentMethod,
        'customer.id': orderData.customerId
      }
    }
  );

  const startTime = Date.now();
  
  try {
    // Simulate external payment API call
    const result = await this.externalPaymentAPI.charge(orderData);
    
    this.tracingService.recordFunctionResult(span, {
      success: true,
      duration: Date.now() - startTime,
      metadata: {
        transactionId: result.transactionId,
        gatewayResponse: result.status
      }
    });
    
    return result;
  } catch (error) {
    this.tracingService.recordFunctionResult(span, {
      success: false,
      duration: Date.now() - startTime,
      error: error as Error
    });
    throw error;
  } finally {
    this.tracingService.endSpan(span);
  }
}
```

## Sample Trace Output

When you process an order, you'll see traces like this in Jaeger:

```
Trace: order-processing-12345
├── inngest.function.order-received (120ms)
│   ├── validate-order (15ms)
│   └── send-payment-event (5ms)
├── inngest.function.process-payment (2.3s)
│   ├── payment-gateway-charge (2.1s)
│   └── send-inventory-event (10ms)
├── inngest.function.check-inventory (450ms)
│   ├── database-query (200ms)
│   ├── reserve-items (150ms)
│   └── send-fulfillment-event (5ms)
├── inngest.function.fulfill-order (1.8s)
│   ├── generate-shipping-label (300ms)
│   ├── update-order-status (50ms)
│   └── send-notification-event (10ms)
└── inngest.function.send-confirmation (180ms)
    ├── render-email-template (80ms)
    └── send-email (100ms)
```

Each span includes relevant attributes like:
- Order ID and customer information
- Payment amounts and transaction IDs
- Inventory item details
- Shipping information
- Error details (if any)

## Testing the Example

### 1. Trigger an Order

```bash
curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "cust_123",
    "items": [
      { "productId": "prod_456", "quantity": 2, "price": 29.99 }
    ],
    "paymentMethod": "credit_card",
    "shippingAddress": {
      "street": "123 Main St",
      "city": "Anytown",
      "country": "US"
    }
  }'
```

### 2. View Processing Steps

Monitor the logs to see each step of the workflow and the trace IDs:

```
[OrderService] Processing order ord_789 in trace 1a2b3c4d5e6f7890
[PaymentService] Charging payment for order ord_789 in trace 1a2b3c4d5e6f7890
[InventoryService] Checking inventory for order ord_789 in trace 1a2b3c4d5e6f7890
[FulfillmentService] Fulfilling order ord_789 in trace 1a2b3c4d5e6f7890
[NotificationService] Sending confirmation for order ord_789 in trace 1a2b3c4d5e6f7890
```

### 3. Explore in Jaeger

Search for the trace ID in Jaeger to see the complete end-to-end journey with timing, attributes, and any errors.

## Best Practices Demonstrated

1. **Meaningful Span Names**: Each span clearly identifies the operation
2. **Business Context**: Attributes include order IDs, amounts, customer information
3. **Error Handling**: Failed operations are properly recorded with error details
4. **Performance Insights**: Timing data helps identify bottlenecks
5. **Service Boundaries**: Clear separation between different microservice concerns

This example provides a production-ready foundation for implementing distributed tracing in your Inngest-based workflows.