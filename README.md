# NestJS Inngest

[![npm version](https://badge.fury.io/js/nestjs-inngest.svg)](https://badge.fury.io/js/nestjs-inngest)
[![npm downloads](https://img.shields.io/npm/dm/nestjs-inngest.svg)](https://npmjs.org/package/nestjs-inngest)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://badges.frapsoft.com/typescript/code/typescript.svg?v=101)](https://github.com/ellerbrock/typescript-badges/)

Modern NestJS integration for [Inngest](https://inngest.com) - the durable function platform. Build type-safe, decorator-based event-driven functions with step functions, automatic retries, and comprehensive observability.

## Table of Contents

- [What is Inngest?](#what-is-inngest)
- [Key Features](#key-features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
- [Advanced Features](#advanced-features)
- [Real-World Examples](#real-world-examples)
- [API Reference](#api-reference)
- [Testing](#testing)
- [Deployment & Production](#deployment--production)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

## What is Inngest?

[Inngest](https://inngest.com) is a developer platform for building reliable workflows, background jobs, and scheduled functions. It provides:

- **Durable execution** - Functions survive server restarts and failures
- **Automatic retries** - Built-in retry logic with exponential backoff
- **Step functions** - Break complex workflows into reliable, resumable steps  
- **Event-driven architecture** - Trigger functions with type-safe events
- **Observability** - Built-in logging, metrics, and tracing
- **Local development** - Full local development server with UI

This NestJS integration brings Inngest's powerful capabilities to your NestJS applications with familiar decorators and dependency injection.

## Key Features

✨ **Type-Safe Decorators** - `@InngestFunction`, `@InngestEvent`, `@InngestCron`  
🔧 **Step Functions** - Reliable multi-step workflows with `step.run()`, `step.waitForEvent()`  
⚡ **Flow Control** - `@Throttle`, `@Debounce`, `@RateLimit`, `@Concurrency`, `@Retries`  
📊 **Observability** - OpenTelemetry tracing, health checks, metrics collection  
🧪 **Testing Support** - Comprehensive testing utilities and mocks  
🔌 **Middleware** - Custom middleware with `@UseMiddleware`  
📦 **Modular Architecture** - Optional health and monitoring modules  
🚀 **Production Ready** - Built for enterprise with monitoring and error handling

## Installation

```bash
# npm
npm install nestjs-inngest inngest

# yarn  
yarn add nestjs-inngest inngest

# pnpm
pnpm add nestjs-inngest inngest
```

### Peer Dependencies

```bash
npm install @nestjs/common @nestjs/core reflect-metadata rxjs zod
```

### Optional Dependencies (for advanced features)

```bash
# For OpenTelemetry tracing
npm install @opentelemetry/api @opentelemetry/sdk-node

# For health checks and monitoring
npm install @nestjs/terminus @nestjs/platform-express
```

## Quick Start

### 1. Set up the Module

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { InngestModule } from 'nestjs-inngest';
import { UserService } from './user.service';

@Module({
  imports: [
    InngestModule.forRoot({
      id: 'my-nestjs-app',
      // For development - connects to local Inngest dev server
      baseUrl: 'http://localhost:8288',
      // Configure custom port and host (for auto-registration)
      servePort: 3002,
      serveHost: 'localhost',
      // For production - remove baseUrl to use Inngest Cloud
      signingKey: process.env.INNGEST_SIGNING_KEY,
      environment: process.env.NODE_ENV as 'development' | 'production',
    }),
  ],
  providers: [UserService],
})
export class AppModule {}
```

### 2. Create Your First Function

```typescript
// user.service.ts
import { Injectable } from '@nestjs/common';
import { InngestEvent, InngestService } from 'nestjs-inngest';

@Injectable()
export class UserService {
  constructor(private readonly inngestService: InngestService) {}

  // Event-triggered function
  @InngestEvent('welcome-new-user', 'user.created')
  async welcomeNewUser({ event, step }: { event: any; step: any }) {
    const { userId, email } = event.data;

    // Step 1: Send welcome email
    await step.run('send-welcome-email', async () => {
      console.log(`Sending welcome email to ${email}`);
      // Your email logic here
      return { emailSent: true };
    });

    // Step 2: Create user profile
    await step.run('create-user-profile', async () => {
      console.log(`Creating profile for user ${userId}`);
      // Your profile creation logic here
      return { profileCreated: true };
    });

    // Step 3: Send follow-up event
    await step.sendEvent('schedule-follow-up', {
      name: 'user.follow-up',
      data: { userId, email },
    });

    return { success: true, userId };
  }

  // Method to trigger the function
  async createUser(email: string) {
    const userId = `user-${Date.now()}`;
    
    // Send event to trigger the function
    await this.inngestService.send({
      name: 'user.created',
      data: { userId, email },
    });

    return { userId, email };
  }
}
```

### 3. Start the Inngest Dev Server

```bash
# Install Inngest CLI
npm install -g inngest-cli

# Start the dev server
inngest dev
```

### 4. Run Your NestJS App

```bash
npm run start:dev
```

Your functions will be automatically registered and visible in the Inngest dev UI at `http://localhost:8288`.

## Core Concepts

### Event-Driven Functions

#### @InngestFunction - Full Configuration

```typescript
import { Injectable } from '@nestjs/common';
import { InngestFunction } from 'nestjs-inngest';

@Injectable()
export class OrderService {
  @InngestFunction({
    id: 'process-order',
    trigger: { event: 'order.created' },
    concurrency: 10,
    retries: 3,
    batchEvents: {
      maxSize: 10,
      timeout: '5m'
    }
  })
  async processOrder({ event, step }: { event: any; step: any }) {
    // Your function logic here
  }
}
```

#### @InngestEvent - Event-Triggered Functions

```typescript
// Simple event trigger
@InngestEvent('handle-payment', 'payment.completed')
async handlePayment({ event, step }) {
  // Triggered when 'payment.completed' event is sent
}

// Event with conditions
@InngestEvent('handle-large-payment', {
  event: 'payment.completed',
  if: 'event.data.amount > 1000'
})
async handleLargePayment({ event, step }) {
  // Only triggered for payments over $1000
}

// Multiple event triggers
@InngestEvent('handle-user-activity', ['user.login', 'user.purchase', 'user.updated'])
async handleUserActivity({ event, step }) {
  // Triggered by any of the specified events
}
```

#### @InngestCron - Scheduled Functions

```typescript
// Run daily at 9 AM UTC
@InngestCron('daily-report', '0 9 * * *')
async generateDailyReport({ step }) {
  const report = await step.run('generate-report', async () => {
    // Generate your report
    return { reportId: 'daily-123', generatedAt: new Date() };
  });

  await step.run('send-report-email', async () => {
    // Send the report via email
  });
}

// Run every 5 minutes
@InngestCron('health-check', '*/5 * * * *')
async performHealthCheck({ step }) {
  // Your health check logic
}
```

### Step Functions & Workflows

Step functions provide durability and reliability by breaking your workflow into discrete, resumable steps.

#### step.run() - Basic Steps

```typescript
@InngestEvent('process-order', 'order.created')
async processOrder({ event, step }) {
  const { orderId, customerId } = event.data;

  // Step 1: Validate the order
  const validation = await step.run('validate-order', async () => {
    // This step will be retried independently if it fails
    const isValid = await this.validateOrder(orderId);
    return { valid: isValid, validatedAt: new Date() };
  });

  if (!validation.valid) {
    throw new Error('Invalid order');
  }

  // Step 2: Process payment
  const payment = await step.run('process-payment', async () => {
    // If this step fails, validation won't be re-run
    const result = await this.processPayment(orderId);
    return { transactionId: result.id, amount: result.amount };
  });

  // Step 3: Update inventory
  await step.run('update-inventory', async () => {
    await this.updateInventory(orderId);
    return { inventoryUpdated: true };
  });

  return { success: true, orderId, transactionId: payment.transactionId };
}
```

#### step.waitForEvent() - Waiting for Events

```typescript
@InngestEvent('user-onboarding', 'user.registered')
async userOnboarding({ event, step }) {
  const { userId, email } = event.data;

  // Step 1: Send welcome email
  await step.run('send-welcome-email', async () => {
    await this.emailService.sendWelcome(email);
    return { emailSent: true };
  });

  // Step 2: Wait for email verification (with 24-hour timeout)
  const verification = await step.waitForEvent('wait-for-verification', {
    event: 'user.email-verified',
    timeout: '24h',
    if: `async.data.userId == "${userId}"`,
  });

  if (!verification) {
    // Timeout occurred - send reminder
    await step.run('send-reminder-email', async () => {
      await this.emailService.sendVerificationReminder(email);
      return { reminderSent: true };
    });
    return { status: 'verification-timeout' };
  }

  // Step 3: Complete onboarding
  await step.run('complete-onboarding', async () => {
    await this.userService.markAsVerified(userId);
    return { onboardingCompleted: true };
  });

  return { status: 'completed', userId };
}
```

#### step.sendEvent() - Sending Events

```typescript
@InngestEvent('order-workflow', 'order.submitted')
async orderWorkflow({ event, step }) {
  const { orderId } = event.data;

  // Process the order
  await step.run('process-order', async () => {
    return await this.processOrder(orderId);
  });

  // Send downstream events
  await step.sendEvent('notify-fulfillment', {
    name: 'fulfillment.order-ready',
    data: { orderId, status: 'ready-for-fulfillment' },
  });

  await step.sendEvent('send-confirmation', {
    name: 'email.send-order-confirmation',
    data: { orderId, template: 'order-confirmation' },
  });

  // Send multiple events at once
  await step.sendEvent('batch-notifications', [
    {
      name: 'analytics.order-processed',
      data: { orderId, timestamp: new Date() },
    },
    {
      name: 'webhook.order-status-change',
      data: { orderId, status: 'processed' },
    },
  ]);
}
```

#### step.sleep() and step.sleepUntil()

```typescript
@InngestEvent('delayed-follow-up', 'user.trial-started')
async delayedFollowUp({ event, step }) {
  const { userId } = event.data;

  // Wait 7 days before following up
  await step.sleep('wait-7-days', '7d');

  await step.run('send-follow-up', async () => {
    await this.emailService.sendTrialFollowUp(userId);
    return { followUpSent: true };
  });

  // Wait until specific date/time
  const reminderDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days
  await step.sleepUntil('wait-until-reminder', reminderDate);

  await step.run('send-trial-ending-reminder', async () => {
    await this.emailService.sendTrialEndingReminder(userId);
    return { reminderSent: true };
  });
}
```

### Middleware & Flow Control

#### @UseMiddleware - Custom Middleware

```typescript
// Custom logging middleware
const loggingMiddleware = {
  init: () => ({
    onFunctionRun: ({ fn }) => {
      console.log(`Function ${fn.id} starting...`);
      return {
        transformOutput: (result) => {
          console.log(`Function ${fn.id} completed:`, result);
          return result;
        },
      };
    },
  }),
};

@Injectable()
export class PaymentService {
  @InngestEvent('process-payment', 'payment.requested')
  @UseMiddleware(loggingMiddleware)
  async processPayment({ event, step }) {
    // Your payment logic with automatic logging
  }
}
```

#### @Concurrency - Limiting Concurrent Executions

```typescript
// Limit to 5 concurrent executions globally
@InngestEvent('heavy-processing', 'data.process-request')
@Concurrency(5)
async heavyProcessing({ event, step }) {
  // Expensive operation
}

// Limit concurrency per user
@InngestEvent('user-specific-task', 'user.task-requested')
@Concurrency(1, { key: 'event.data.userId' })
async userSpecificTask({ event, step }) {
  // Only one task per user at a time
}
```

#### @RateLimit - Rate Limiting

```typescript
// Allow 100 executions per hour
@InngestEvent('api-call', 'external.api-request')
@RateLimit(100, '1h')
async makeApiCall({ event, step }) {
  // API call logic
}

// Rate limit per customer
@InngestEvent('customer-export', 'export.requested')
@RateLimit(10, '1h', 'event.data.customerId')
async customerExport({ event, step }) {
  // Export logic limited per customer
}
```

#### @Throttle - Throttling with Burst Support

```typescript
// Allow burst of 20, then 100 per minute
@InngestEvent('notification-send', 'notification.requested')
@Throttle(100, '1m', { burst: 20 })
async sendNotification({ event, step }) {
  // Notification logic with burst capability
}
```

#### @Debounce - Preventing Rapid Executions

```typescript
// Debounce file save operations
@InngestEvent('save-document', 'document.changed')
@Debounce('5s', 'event.data.documentId')
async saveDocument({ event, step }) {
  // Only save if no changes for 5 seconds
}
```

#### @Retries - Custom Retry Configuration

```typescript
// Retry up to 5 times instead of the default 3
@InngestEvent('unreliable-task', 'task.execute')
@Retries(5)
async unreliableTask({ event, step }) {
  // Task that might fail and need more retries
}
```

## Advanced Features

### OpenTelemetry Tracing

Enable distributed tracing to track your functions across your entire system:

#### Configuration

```typescript
import { InngestModule } from 'nestjs-inngest';

@Module({
  imports: [
    InngestModule.forRoot({
      id: 'my-app',
      tracing: {
        enabled: true,
        serviceName: 'my-nestjs-service',
        includeEventData: false, // For privacy
        includeStepData: true,   // For debugging
        defaultAttributes: {
          'service.version': '1.0.0',
          'deployment.environment': process.env.NODE_ENV,
        },
        contextInjection: {
          enabled: true,
          fieldName: 'traceContext', // Where to inject trace context in events
        },
      },
    }),
  ],
})
export class AppModule {}
```

#### Automatic Trace Propagation

```typescript
@Injectable()
export class OrderService {
  @InngestEvent('process-order', 'order.created')
  async processOrder({ event, step }) {
    // Tracing is automatic - each step becomes a span
    
    const validation = await step.run('validate-order', async () => {
      // This step is automatically traced
      return await this.validateOrder(event.data.orderId);
    });

    // Trace context is automatically propagated to sent events
    await step.sendEvent('payment-requested', {
      name: 'payment.process',
      data: {
        orderId: event.data.orderId,
        amount: validation.amount,
        // traceContext automatically injected here
      },
    });
  }

  @InngestEvent('process-payment', 'payment.process')
  async processPayment({ event, step }) {
    // This function will be part of the same distributed trace
    // if called from the traced order processing above
  }
}
```

#### Custom Trace Attributes

```typescript
import { trace } from '@opentelemetry/api';

@InngestEvent('custom-traced-function', 'custom.event')
async customTracedFunction({ event, step }) {
  // Get the current span to add custom attributes
  const span = trace.getActiveSpan();
  
  await step.run('custom-step', async () => {
    span?.setAttributes({
      'custom.user_id': event.data.userId,
      'custom.operation_type': 'data_processing',
    });
    
    // Your logic here
    return { processed: true };
  });
}
```

### Health Checks & Monitoring

#### Enable Health Checks

```typescript
import { Module } from '@nestjs/common';
import { InngestModule, InngestHealthModule } from 'nestjs-inngest';

@Module({
  imports: [
    InngestModule.forRoot({
      id: 'my-app',
      health: {
        enabled: true,
        path: '/health/inngest',
        includeDetails: true,
        enableMetrics: true,
        checkInterval: 30000, // 30 seconds
      },
    }),
    // Add the health module
    InngestHealthModule,
  ],
})
export class AppModule {}
```

#### Monitoring with Metrics

```typescript
import { InngestMonitoringModule } from 'nestjs-inngest';

@Module({
  imports: [
    InngestModule.forRoot({
      id: 'my-app',
      monitoring: {
        enabled: true,
        collectMetrics: true,
        metricsInterval: 15000, // Collect every 15 seconds
        enableTracing: true,
      },
    }),
    InngestMonitoringModule,
  ],
})
export class AppModule {}
```

#### Health Check API

```bash
# Basic health check
GET /health/inngest

# Response
{
  "status": "ok",
  "info": {
    "inngest": {
      "status": "up",
      "functions": 5,
      "lastSync": "2024-01-15T10:30:00Z"
    }
  }
}

# Detailed health check
GET /health/inngest?details=true

# Response with metrics
{
  "status": "ok",
  "info": {
    "inngest": {
      "status": "up",
      "functions": 5,
      "lastSync": "2024-01-15T10:30:00Z"
    }
  },
  "details": {
    "memory": {
      "used": "45 MB",
      "limit": "512 MB",
      "percentage": 8.8
    },
    "functions": [
      {
        "id": "process-order",
        "status": "healthy",
        "lastExecution": "2024-01-15T10:29:45Z"
      }
    ]
  }
}
```

### Configuration

#### Environment-Based Configuration

```typescript
// config/inngest.config.ts
import { InngestModuleOptions } from 'nestjs-inngest';

export const getInngestConfig = (): InngestModuleOptions => {
  const baseConfig: InngestModuleOptions = {
    id: process.env.INNGEST_APP_ID || 'my-app',
    eventKey: process.env.INNGEST_EVENT_KEY,
    environment: (process.env.NODE_ENV as any) || 'development',
  };

  if (process.env.NODE_ENV === 'production') {
    return {
      ...baseConfig,
      signingKey: process.env.INNGEST_SIGNING_KEY,
      baseUrl: undefined, // Use Inngest Cloud
      middleware: [], // Add production middleware
      monitoring: {
        enabled: true,
        collectMetrics: true,
        metricsInterval: 30000,
        enableTracing: true,
      },
      health: {
        enabled: true,
        path: '/health/inngest',
        includeDetails: false,
        enableMetrics: true,
        checkInterval: 60000,
      },
    };
  }

  return {
    ...baseConfig,
    baseUrl: 'http://localhost:8288', // Local dev server
    logger: console, // Enable debug logging
  };
};

// app.module.ts
@Module({
  imports: [
    InngestModule.forRoot(getInngestConfig()),
  ],
})
export class AppModule {}
```

#### Async Configuration with ConfigService

```typescript
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot(),
    InngestModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        id: configService.get<string>('INNGEST_APP_ID'),
        eventKey: configService.get<string>('INNGEST_EVENT_KEY'),
        signingKey: configService.get<string>('INNGEST_SIGNING_KEY'),
        baseUrl: configService.get<string>('INNGEST_BASE_URL'),
        environment: configService.get<string>('NODE_ENV') as any,
        tracing: {
          enabled: configService.get<boolean>('ENABLE_TRACING', false),
          serviceName: configService.get<string>('SERVICE_NAME'),
        },
        monitoring: {
          enabled: configService.get<boolean>('ENABLE_MONITORING', true),
          collectMetrics: true,
          metricsInterval: configService.get<number>('METRICS_INTERVAL', 30000),
        },
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

#### Custom Port & Host Configuration

When your NestJS application runs on a custom port or needs a specific host configuration for auto-registration with the Inngest dev server:

```typescript
InngestModule.forRoot({
  id: 'my-app',
  baseUrl: 'http://localhost:8288', // Inngest dev server
  
  // Option 1: Hostname + Port (for local development)
  servePort: 3002,
  serveHost: 'localhost',
  
  // Option 2: Full URL (for production/custom setups)
  serveHost: 'https://myapp.herokuapp.com',
  // servePort is ignored when serveHost is a full URL
  
  // Option 3: Environment variables
  servePort: parseInt(process.env.PORT || '3000'),
  serveHost: process.env.HOST || 'localhost',
})
```

**When to use these options:**
- Your app runs on a non-standard port (not 3000)
- You need custom host configuration for Docker/containers
- Multiple NestJS apps with Inngest on different ports
- Load balancers or reverse proxies require specific host settings

## Real-World Examples

### 1. User Onboarding Workflow

A comprehensive user onboarding flow with email verification and follow-ups:

```typescript
import { Injectable } from '@nestjs/common';
import { InngestEvent, InngestService } from 'nestjs-inngest';

interface UserEvents {
  'user.registered': {
    data: { userId: string; email: string; name: string };
  };
  'user.email-verified': {
    data: { userId: string; verifiedAt: string };
  };
}

@Injectable()
export class UserOnboardingService {
  constructor(private readonly inngestService: InngestService) {}

  @InngestEvent('user-onboarding-flow', 'user.registered')
  async userOnboardingFlow({ event, step }: { event: UserEvents['user.registered']; step: any }) {
    const { userId, email, name } = event.data;

    // Step 1: Send welcome email with verification link
    await step.run('send-welcome-email', async () => {
      const verificationToken = await this.generateVerificationToken(userId);
      await this.emailService.sendWelcomeEmail({
        email,
        name,
        verificationLink: `https://app.example.com/verify?token=${verificationToken}`,
      });
      return { emailSent: true, token: verificationToken };
    });

    // Step 2: Wait for email verification (48-hour timeout)
    const verificationEvent = await step.waitForEvent('wait-for-email-verification', {
      event: 'user.email-verified',
      timeout: '48h',
      if: `async.data.userId == "${userId}"`,
    });

    if (!verificationEvent) {
      // Email not verified in time - send reminder and mark as unverified
      await step.run('send-verification-reminder', async () => {
        await this.emailService.sendVerificationReminder(email, name);
        await this.userService.markAsUnverified(userId);
        return { reminderSent: true };
      });
      
      return { status: 'verification-timeout', userId };
    }

    // Step 3: Email verified - set up user profile
    await step.run('setup-user-profile', async () => {
      await this.userService.markAsVerified(userId);
      await this.userService.createDefaultProfile(userId);
      return { profileCreated: true };
    });

    // Step 4: Send onboarding completion email
    await step.run('send-completion-email', async () => {
      await this.emailService.sendOnboardingComplete(email, name);
      return { completionEmailSent: true };
    });

    // Step 5: Schedule follow-up sequences
    await step.sendEvent('schedule-follow-ups', [
      {
        name: 'user.schedule-tips-series',
        data: { userId, email, startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
      },
      {
        name: 'user.schedule-feedback-request',
        data: { userId, email, requestDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
      },
    ]);

    return { 
      status: 'completed', 
      userId, 
      verifiedAt: verificationEvent.data.verifiedAt 
    };
  }

  // Follow-up tip series
  @InngestEvent('send-tip-series', 'user.schedule-tips-series')
  async sendTipSeries({ event, step }: { event: any; step: any }) {
    const { userId, email } = event.data;
    const tips = await this.getTipsForUser(userId);

    for (let i = 0; i < tips.length; i++) {
      await step.sleep(`wait-between-tips-${i}`, '3d'); // Wait 3 days between tips
      
      await step.run(`send-tip-${i + 1}`, async () => {
        await this.emailService.sendTip(email, tips[i]);
        return { tipSent: true, tipIndex: i + 1 };
      });
    }

    return { tipsSent: tips.length, userId };
  }

  private async generateVerificationToken(userId: string): Promise<string> {
    // Generate and store verification token
    return `verify_${userId}_${Date.now()}`;
  }

  private async getTipsForUser(userId: string): Promise<string[]> {
    // Return personalized tips based on user profile
    return ['tip1', 'tip2', 'tip3'];
  }
}
```

### 2. E-commerce Order Processing

A robust order processing workflow with payment, inventory, and fulfillment:

```typescript
import { Injectable } from '@nestjs/common';
import { InngestEvent, Concurrency, Retries } from 'nestjs-inngest';

@Injectable()
export class OrderProcessingService {
  @InngestEvent('process-order', 'order.submitted')
  @Concurrency(10) // Process up to 10 orders concurrently
  @Retries(3) // Retry failed orders up to 3 times
  async processOrder({ event, step }: { event: any; step: any }) {
    const { orderId, customerId, items, paymentMethod } = event.data;

    try {
      // Step 1: Validate order and check inventory
      const validation = await step.run('validate-order', async () => {
        const order = await this.orderService.getOrder(orderId);
        const inventoryCheck = await this.inventoryService.checkAvailability(items);
        
        if (!inventoryCheck.available) {
          throw new Error(`Insufficient inventory: ${inventoryCheck.unavailableItems.join(', ')}`);
        }

        return { 
          order, 
          totalAmount: order.totalAmount,
          inventoryReserved: inventoryCheck.reservationId 
        };
      });

      // Step 2: Process payment
      const payment = await step.run('process-payment', async () => {
        const paymentResult = await this.paymentService.processPayment({
          amount: validation.totalAmount,
          customerId,
          paymentMethod,
          orderId,
        });

        if (!paymentResult.success) {
          throw new Error(`Payment failed: ${paymentResult.error}`);
        }

        return {
          transactionId: paymentResult.transactionId,
          paidAmount: paymentResult.amount,
          paidAt: new Date(),
        };
      });

      // Step 3: Reserve inventory
      await step.run('reserve-inventory', async () => {
        await this.inventoryService.reserveItems(orderId, items);
        return { inventoryReserved: true };
      });

      // Step 4: Create fulfillment order
      const fulfillment = await step.run('create-fulfillment-order', async () => {
        const fulfillmentOrder = await this.fulfillmentService.createOrder({
          orderId,
          customerId,
          items,
          shippingAddress: validation.order.shippingAddress,
        });

        return {
          fulfillmentOrderId: fulfillmentOrder.id,
          estimatedShipping: fulfillmentOrder.estimatedShipping,
        };
      });

      // Step 5: Send confirmation email
      await step.run('send-order-confirmation', async () => {
        await this.emailService.sendOrderConfirmation({
          email: validation.order.customerEmail,
          orderId,
          transactionId: payment.transactionId,
          estimatedShipping: fulfillment.estimatedShipping,
        });
        return { confirmationEmailSent: true };
      });

      // Step 6: Send downstream events
      await step.sendEvent('order-processed-events', [
        {
          name: 'analytics.order-completed',
          data: { 
            orderId, 
            customerId, 
            amount: payment.paidAmount,
            timestamp: new Date() 
          },
        },
        {
          name: 'fulfillment.order-ready',
          data: {
            orderId,
            fulfillmentOrderId: fulfillment.fulfillmentOrderId,
            priority: validation.order.priority || 'standard',
          },
        },
        {
          name: 'customer.purchase-completed',
          data: {
            customerId,
            orderId,
            amount: payment.paidAmount,
            items: items.length,
          },
        },
      ]);

      return {
        success: true,
        orderId,
        transactionId: payment.transactionId,
        fulfillmentOrderId: fulfillment.fulfillmentOrderId,
      };

    } catch (error) {
      // Handle failures - release any reserved inventory
      await step.run('handle-order-failure', async () => {
        await this.inventoryService.releaseReservation(orderId);
        await this.orderService.markAsFailed(orderId, error.message);
        
        // Send failure notification
        await this.emailService.sendOrderFailureNotification({
          email: validation?.order?.customerEmail,
          orderId,
          reason: error.message,
        });

        return { failureHandled: true, reason: error.message };
      });

      throw error; // Re-throw to trigger Inngest's retry mechanism
    }
  }

  // Handle order cancellations
  @InngestEvent('cancel-order', 'order.cancelled')
  async cancelOrder({ event, step }: { event: any; step: any }) {
    const { orderId, reason } = event.data;

    // Step 1: Get order details
    const order = await step.run('get-order-details', async () => {
      return await this.orderService.getOrder(orderId);
    });

    // Step 2: Process refund if payment was processed
    if (order.paymentStatus === 'completed') {
      await step.run('process-refund', async () => {
        const refund = await this.paymentService.processRefund({
          transactionId: order.transactionId,
          amount: order.totalAmount,
          reason,
        });
        return { refundId: refund.id, refundAmount: refund.amount };
      });
    }

    // Step 3: Release inventory
    await step.run('release-inventory', async () => {
      await this.inventoryService.releaseReservation(orderId);
      return { inventoryReleased: true };
    });

    // Step 4: Cancel fulfillment if exists
    if (order.fulfillmentOrderId) {
      await step.run('cancel-fulfillment', async () => {
        await this.fulfillmentService.cancelOrder(order.fulfillmentOrderId);
        return { fulfillmentCancelled: true };
      });
    }

    // Step 5: Send cancellation confirmation
    await step.run('send-cancellation-email', async () => {
      await this.emailService.sendCancellationConfirmation({
        email: order.customerEmail,
        orderId,
        refundAmount: order.paymentStatus === 'completed' ? order.totalAmount : 0,
        reason,
      });
      return { cancellationEmailSent: true };
    });

    return { success: true, orderId, cancelled: true };
  }
}
```

### 3. Scheduled Data Cleanup Job

A comprehensive data cleanup job that runs daily:

```typescript
import { Injectable } from '@nestjs/common';
import { InngestCron } from 'nestjs-inngest';

@Injectable()
export class DataCleanupService {
  // Run daily at 2 AM UTC
  @InngestCron('daily-data-cleanup', '0 2 * * *')
  async dailyDataCleanup({ step }: { step: any }) {
    const startTime = new Date();

    // Step 1: Clean up expired sessions
    const sessionCleanup = await step.run('cleanup-expired-sessions', async () => {
      const expiredSessions = await this.sessionService.getExpiredSessions();
      const deletedCount = await this.sessionService.deleteExpiredSessions();
      
      return { 
        expiredSessionsFound: expiredSessions.length,
        deletedSessions: deletedCount,
      };
    });

    // Step 2: Clean up temporary files
    const fileCleanup = await step.run('cleanup-temporary-files', async () => {
      const tempFiles = await this.fileService.getTemporaryFiles();
      const deletedFiles = [];
      
      for (const file of tempFiles) {
        try {
          await this.fileService.deleteFile(file.id);
          deletedFiles.push(file.id);
        } catch (error) {
          console.warn(`Failed to delete file ${file.id}:`, error);
        }
      }

      return {
        temporaryFilesFound: tempFiles.length,
        deletedFiles: deletedFiles.length,
      };
    });

    // Step 3: Archive old audit logs
    const logArchiving = await step.run('archive-old-audit-logs', async () => {
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - 6); // Archive logs older than 6 months

      const oldLogs = await this.auditService.getLogsOlderThan(cutoffDate);
      const archivedCount = await this.auditService.archiveLogs(oldLogs.map(log => log.id));

      return {
        oldLogsFound: oldLogs.length,
        archivedLogs: archivedCount,
      };
    });

    // Step 4: Clean up orphaned database records
    const dbCleanup = await step.run('cleanup-orphaned-records', async () => {
      const orphanedRecords = await this.databaseService.findOrphanedRecords();
      const cleanedTables = [];

      for (const [tableName, records] of Object.entries(orphanedRecords)) {
        if (records.length > 0) {
          const deletedCount = await this.databaseService.cleanupOrphanedRecords(tableName);
          cleanedTables.push({ tableName, deletedCount });
        }
      }

      return { cleanedTables };
    });

    // Step 5: Update database statistics
    await step.run('update-database-stats', async () => {
      await this.databaseService.updateTableStatistics();
      return { statisticsUpdated: true };
    });

    // Step 6: Generate cleanup report
    const report = await step.run('generate-cleanup-report', async () => {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      return {
        date: startTime.toISOString().split('T')[0],
        duration: `${Math.round(duration / 1000)}s`,
        sessionsCleanup: sessionCleanup,
        filesCleanup: fileCleanup,
        logsArchiving: logArchiving,
        databaseCleanup: dbCleanup,
      };
    });

    // Step 7: Send report to administrators
    await step.run('send-cleanup-report', async () => {
      await this.emailService.sendCleanupReport({
        recipients: ['admin@example.com', 'devops@example.com'],
        report,
      });
      return { reportSent: true };
    });

    return report;
  }

  // Weekly comprehensive cleanup (Sundays at 3 AM UTC)
  @InngestCron('weekly-deep-cleanup', '0 3 * * 0')
  async weeklyDeepCleanup({ step }: { step: any }) {
    // Step 1: Optimize database indexes
    await step.run('optimize-database-indexes', async () => {
      await this.databaseService.optimizeIndexes();
      return { indexesOptimized: true };
    });

    // Step 2: Clean up old backups
    await step.run('cleanup-old-backups', async () => {
      const oldBackups = await this.backupService.getOldBackups(30); // Older than 30 days
      const deletedCount = await this.backupService.deleteBackups(oldBackups);
      
      return {
        oldBackupsFound: oldBackups.length,
        deletedBackups: deletedCount,
      };
    });

    // Step 3: Vacuum database
    await step.run('vacuum-database', async () => {
      await this.databaseService.vacuum();
      return { databaseVacuumed: true };
    });

    return { success: true, cleanupType: 'weekly-deep-cleanup' };
  }
}
```

### 4. Event-Driven Microservice Communication

Cross-service communication using events for a distributed e-commerce system:

```typescript
// Order Service
@Injectable()
export class OrderService {
  @InngestEvent('handle-payment-completed', 'payment.completed')
  async handlePaymentCompleted({ event, step }: { event: any; step: any }) {
    const { orderId, paymentId, amount } = event.data;

    await step.run('update-order-payment-status', async () => {
      await this.updateOrderPaymentStatus(orderId, 'completed', paymentId);
      return { orderUpdated: true };
    });

    // Trigger inventory reservation
    await step.sendEvent('request-inventory-reservation', {
      name: 'inventory.reserve-requested',
      data: { orderId, items: event.data.items },
    });

    return { success: true, orderId };
  }

  @InngestEvent('handle-inventory-reserved', 'inventory.reserved')
  async handleInventoryReserved({ event, step }: { event: any; step: any }) {
    const { orderId, reservationId } = event.data;

    await step.run('update-order-inventory-status', async () => {
      await this.updateOrderInventoryStatus(orderId, 'reserved', reservationId);
      return { orderUpdated: true };
    });

    // Trigger fulfillment
    await step.sendEvent('request-fulfillment', {
      name: 'fulfillment.order-ready',
      data: { orderId, reservationId },
    });
  }

  @InngestEvent('handle-fulfillment-shipped', 'fulfillment.shipped')
  async handleFulfillmentShipped({ event, step }: { event: any; step: any }) {
    const { orderId, trackingNumber, shippedAt } = event.data;

    await step.run('update-order-shipping-status', async () => {
      await this.updateOrderShippingStatus(orderId, 'shipped', trackingNumber, shippedAt);
      return { orderUpdated: true };
    });

    // Send customer notification
    await step.sendEvent('send-shipping-notification', {
      name: 'notification.shipping-confirmation',
      data: { orderId, trackingNumber, shippedAt },
    });
  }
}

// Inventory Service  
@Injectable()
export class InventoryService {
  @InngestEvent('reserve-inventory', 'inventory.reserve-requested')
  async reserveInventory({ event, step }: { event: any; step: any }) {
    const { orderId, items } = event.data;

    const reservation = await step.run('check-and-reserve', async () => {
      const availability = await this.checkAvailability(items);
      
      if (!availability.available) {
        throw new Error(`Items not available: ${availability.unavailableItems.join(', ')}`);
      }

      const reservationId = await this.reserveItems(orderId, items);
      return { reservationId, items };
    });

    // Confirm reservation to order service
    await step.sendEvent('confirm-reservation', {
      name: 'inventory.reserved',
      data: {
        orderId,
        reservationId: reservation.reservationId,
        items: reservation.items,
      },
    });

    return { success: true, reservationId: reservation.reservationId };
  }

  @InngestEvent('release-inventory', 'inventory.release-requested')
  async releaseInventory({ event, step }: { event: any; step: any }) {
    const { orderId, reservationId } = event.data;

    await step.run('release-reservation', async () => {
      await this.releaseReservation(reservationId);
      return { released: true };
    });

    // Confirm release
    await step.sendEvent('confirm-release', {
      name: 'inventory.released',
      data: { orderId, reservationId },
    });
  }
}

// Fulfillment Service
@Injectable()
export class FulfillmentService {
  @InngestEvent('create-fulfillment-order', 'fulfillment.order-ready')
  async createFulfillmentOrder({ event, step }: { event: any; step: any }) {
    const { orderId, reservationId } = event.data;

    const fulfillmentOrder = await step.run('create-fulfillment', async () => {
      const orderDetails = await this.getOrderDetails(orderId);
      const fulfillmentId = await this.createFulfillmentOrder(orderDetails);
      
      return { fulfillmentId, orderDetails };
    });

    // Wait for warehouse to pick and pack
    await step.waitForEvent('wait-for-packed', {
      event: 'warehouse.packed',
      timeout: '24h',
      if: `async.data.fulfillmentId == "${fulfillmentOrder.fulfillmentId}"`,
    });

    // Ship the order
    const shipping = await step.run('ship-order', async () => {
      const trackingInfo = await this.shipOrder(fulfillmentOrder.fulfillmentId);
      return {
        trackingNumber: trackingInfo.trackingNumber,
        carrier: trackingInfo.carrier,
        shippedAt: new Date(),
      };
    });

    // Notify order service
    await step.sendEvent('notify-shipped', {
      name: 'fulfillment.shipped',
      data: {
        orderId,
        fulfillmentId: fulfillmentOrder.fulfillmentId,
        trackingNumber: shipping.trackingNumber,
        carrier: shipping.carrier,
        shippedAt: shipping.shippedAt,
      },
    });

    return { success: true, trackingNumber: shipping.trackingNumber };
  }
}

// Notification Service
@Injectable()
export class NotificationService {
  @InngestEvent('send-shipping-confirmation', 'notification.shipping-confirmation')
  @Throttle(100, '1h') // Prevent spam
  async sendShippingConfirmation({ event, step }: { event: any; step: any }) {
    const { orderId, trackingNumber, shippedAt } = event.data;

    const orderDetails = await step.run('get-order-details', async () => {
      return await this.getOrderDetails(orderId);
    });

    await step.run('send-email', async () => {
      await this.emailService.sendShippingConfirmation({
        email: orderDetails.customerEmail,
        customerName: orderDetails.customerName,
        orderId,
        trackingNumber,
        shippedAt,
        items: orderDetails.items,
      });
      return { emailSent: true };
    });

    await step.run('send-sms', async () => {
      if (orderDetails.smsNotifications && orderDetails.phoneNumber) {
        await this.smsService.sendShippingNotification({
          phoneNumber: orderDetails.phoneNumber,
          orderId,
          trackingNumber,
        });
        return { smsSent: true };
      }
      return { smsSent: false, reason: 'sms-not-enabled' };
    });

    return { success: true, orderId, notificationsSent: true };
  }
}
```

## API Reference

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | `string` | **Required** | Your Inngest app ID |
| `eventKey` | `string` | `undefined` | Event key for sending events |
| `baseUrl` | `string` | `undefined` | Inngest server URL (omit for cloud) |
| `signingKey` | `string` | `undefined` | Webhook signing key for production |
| `isGlobal` | `boolean` | `false` | Make module available globally |
| `path` | `string` | `'inngest'` | API endpoint path |
| `servePort` | `number` | `process.env.PORT \|\| 3000` | Port where your app runs (for auto-registration) |
| `serveHost` | `string` | `'localhost'` | Host/URL where your app runs. Can be hostname (`'localhost'`) or full URL (`'https://myapp.com'`) |
| `environment` | `string` | `'development'` | Environment name |
| `middleware` | `InngestMiddleware[]` | `[]` | Global middleware |
| `logger` | `any` | `undefined` | Custom logger |
| `tracing` | `InngestTracingConfig` | `{}` | Tracing configuration |
| `monitoring` | `InngestMonitoringConfig` | `{}` | Monitoring configuration |
| `health` | `InngestHealthConfig` | `{}` | Health check configuration |

### Decorators

#### @InngestFunction(config)

```typescript
interface InngestFunctionConfig {
  id: string;                    // Unique function ID
  trigger: TriggerConfig;        // Event trigger or cron schedule
  concurrency?: number | ConcurrencyConfig;
  retries?: number;
  batchEvents?: BatchConfig;
  cancelOn?: CancelConfig[];
  rateLimit?: RateLimit;
  throttle?: ThrottleConfig;
  debounce?: DebounceConfig;
}
```

#### @InngestEvent(id, event, options?)

Shorthand for event-triggered functions.

```typescript
// Simple event
@InngestEvent('function-id', 'event.name')

// Event with conditions  
@InngestEvent('function-id', { 
  event: 'event.name', 
  if: 'event.data.amount > 100' 
})

// Multiple events
@InngestEvent('function-id', ['event.one', 'event.two'])
```

#### @InngestCron(id, cron, options?)

Shorthand for scheduled functions.

```typescript
@InngestCron('daily-job', '0 9 * * *')        // Daily at 9 AM
@InngestCron('hourly-job', '0 * * * *')       // Every hour
@InngestCron('weekly-job', '0 9 * * 1')       // Mondays at 9 AM
```

#### Middleware Decorators

```typescript
@UseMiddleware(...middleware)         // Custom middleware
@Concurrency(limit, options?)         // Concurrency control
@RateLimit(limit, period, key?)       // Rate limiting
@Throttle(limit, period, options?)    // Throttling with burst
@Debounce(period, key?)               // Debouncing
@Retries(count)                       // Retry configuration
```

### InngestService Methods

```typescript
class InngestService {
  // Send single event
  send(event: EventPayload): Promise<void>
  
  // Send multiple events
  send(events: EventPayload[]): Promise<void>
  
  // Get Inngest client instance
  getClient(): Inngest
}
```

### Step Functions API

```typescript
interface StepTools {
  // Run a step
  run<T>(id: string, fn: () => Promise<T>): Promise<T>
  
  // Wait for an event
  waitForEvent(id: string, config: {
    event: string;
    timeout: string;
    if?: string;
    match?: string;
  }): Promise<EventPayload | null>
  
  // Send event(s)
  sendEvent(id: string, event: EventPayload): Promise<void>
  sendEvent(id: string, events: EventPayload[]): Promise<void>
  
  // Sleep for a duration
  sleep(id: string, duration: string): Promise<void>
  
  // Sleep until a specific time
  sleepUntil(id: string, date: Date): Promise<void>
}
```

### Testing Utilities

```typescript
// Create testing module
createInngestTestingModule(
  config: InngestModuleOptions,
  providers: Provider[]
): Promise<TestingModule>

// Mock service
class MockInngestService {
  send(event: EventPayload | EventPayload[]): Promise<void>
  getEvents(): EventPayload[]
  clearEvents(): void
  getClient(): Inngest
}

// Create mock context
createMockInngestContext(overrides?: Partial<Context>): MockContext
```

## Testing

### Unit Testing with Mocks

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { MockInngestService, createMockInngestContext } from 'nestjs-inngest';

describe('UserService', () => {
  let service: UserService;
  let mockInngestService: MockInngestService;

  beforeEach(async () => {
    mockInngestService = new MockInngestService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: InngestService,
          useValue: mockInngestService,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('should send user.created event', async () => {
    await service.createUser('test@example.com');

    const events = mockInngestService.getEvents();
    expect(events).toHaveLength(1);
    expect(events[0].name).toBe('user.created');
  });

  it('should test function handler directly', async () => {
    const mockContext = createMockInngestContext({
      event: {
        name: 'user.created',
        data: { userId: 'test-123', email: 'test@example.com' },
      },
    });

    const result = await service.welcomeNewUser(mockContext);

    expect(result.success).toBe(true);
    expect(mockContext.step.run).toHaveBeenCalledWith(
      'send-welcome-email',
      expect.any(Function)
    );
  });
});
```

### Integration Testing

```typescript
import { createInngestTestingModule } from 'nestjs-inngest';

describe('UserService Integration', () => {
  let module: TestingModule;
  let service: UserService;
  let inngestService: InngestService;

  beforeEach(async () => {
    module = await createInngestTestingModule(
      {
        id: 'test-app',
        eventKey: 'test-key',
      },
      [UserService]
    );

    service = module.get<UserService>(UserService);
    inngestService = module.get<InngestService>(InngestService);
  });

  it('should register functions with Inngest', async () => {
    const client = inngestService.getClient();
    // Test with real Inngest client
  });
});
```

### Testing Step Functions

```typescript
it('should test individual steps', async () => {
  const mockContext = createMockInngestContext({
    event: {
      name: 'user.created',
      data: { userId: 'test-123', email: 'test@example.com' },
    },
  });

  // Mock specific step behavior
  let emailResult: any;
  mockContext.step.run.mockImplementation(async (id: string, fn: () => any) => {
    if (id === 'send-welcome-email') {
      emailResult = await fn();
      return emailResult;
    }
    return await fn();
  });

  await service.welcomeNewUser(mockContext);

  expect(emailResult).toEqual({
    emailSent: true,
    to: 'test@example.com',
  });
});

it('should handle step failures', async () => {
  const mockContext = createMockInngestContext();

  // Make the first step fail
  mockContext.step.run.mockImplementation(async (id: string, fn: () => any) => {
    if (id === 'send-welcome-email') {
      throw new Error('Email service unavailable');
    }
    return await fn();
  });

  await expect(service.welcomeNewUser(mockContext)).rejects.toThrow(
    'Email service unavailable'
  );

  // Ensure subsequent steps weren't called
  expect(mockContext.step.run).toHaveBeenCalledTimes(1);
});
```

### E2E Testing

```typescript
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';

describe('Inngest Integration (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/inngest (POST) should handle function execution', () => {
    return request(app.getHttpServer())
      .post('/inngest')
      .send({
        // Inngest execution payload
      })
      .expect(200);
  });

  it('/inngest (PUT) should handle function registration', () => {
    return request(app.getHttpServer())
      .put('/inngest')
      .send({
        // Inngest registration payload
      })
      .expect(200);
  });
});
```

## Deployment & Production

### Environment Variables

Create a `.env` file with the following variables:

```bash
# Required
INNGEST_APP_ID=my-production-app
INNGEST_SIGNING_KEY=signkey-prod-xxx...

# Optional
INNGEST_EVENT_KEY=your-event-key
INNGEST_BASE_URL=https://api.inngest.com  # Omit for Inngest Cloud
NODE_ENV=production

# Tracing (optional)
ENABLE_TRACING=true
SERVICE_NAME=my-nestjs-service
OTEL_EXPORTER_OTLP_ENDPOINT=https://api.honeycomb.io

# Monitoring (optional)
ENABLE_MONITORING=true
METRICS_INTERVAL=30000
```

### Production Configuration

```typescript
// config/production.ts
export const productionConfig: InngestModuleOptions = {
  id: process.env.INNGEST_APP_ID!,
  eventKey: process.env.INNGEST_EVENT_KEY,
  signingKey: process.env.INNGEST_SIGNING_KEY!,
  environment: 'production',
  
  // Remove baseUrl to use Inngest Cloud
  baseUrl: undefined,
  
  // Production middleware
  middleware: [
    // Add your production middleware here
  ],
  
  // Enable monitoring and health checks
  monitoring: {
    enabled: true,
    collectMetrics: true,
    metricsInterval: 30000,
    enableTracing: process.env.ENABLE_TRACING === 'true',
  },
  
  health: {
    enabled: true,
    path: '/health/inngest',
    includeDetails: false, // Don't expose internal details
    enableMetrics: true,
    checkInterval: 60000,
  },
  
  tracing: {
    enabled: process.env.ENABLE_TRACING === 'true',
    serviceName: process.env.SERVICE_NAME,
    includeEventData: false, // Privacy in production
    includeStepData: false,  // Performance in production
  },
};
```

### Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health/inngest || exit 1

EXPOSE 3000

CMD ["node", "dist/main"]
```

### Docker Compose with Inngest Dev Server

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - '3000:3000'
    environment:
      - INNGEST_APP_ID=my-app
      - INNGEST_BASE_URL=http://inngest:8288
      - NODE_ENV=development
    depends_on:
      - inngest
      - postgres

  inngest:
    image: inngest/inngest:latest
    ports:
      - '8288:8288'
    volumes:
      - inngest_data:/data
    environment:
      - INNGEST_DEV=1

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=myapp
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  inngest_data:
  postgres_data:
```

### Kubernetes Deployment

```yaml
# k8s-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nestjs-inngest-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nestjs-inngest-app
  template:
    metadata:
      labels:
        app: nestjs-inngest-app
    spec:
      containers:
      - name: app
        image: my-registry/nestjs-inngest-app:latest
        ports:
        - containerPort: 3000
        env:
        - name: INNGEST_APP_ID
          valueFrom:
            configMapKeyRef:
              name: inngest-config
              key: app-id
        - name: INNGEST_SIGNING_KEY
          valueFrom:
            secretKeyRef:
              name: inngest-secrets
              key: signing-key
        livenessProbe:
          httpGet:
            path: /health/inngest
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/inngest
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: nestjs-inngest-service
spec:
  selector:
    app: nestjs-inngest-app
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
```

### Error Handling Best Practices

```typescript
@Injectable()
export class RobustOrderService {
  @InngestEvent('process-order', 'order.created')
  @Retries(3)
  async processOrder({ event, step }: { event: any; step: any }) {
    try {
      // Your main logic
      const result = await step.run('process-payment', async () => {
        return await this.processPayment(event.data);
      });
      
      return result;
      
    } catch (error) {
      // Log the error with context
      this.logger.error('Order processing failed', {
        orderId: event.data.orderId,
        error: error.message,
        stack: error.stack,
        event: event.name,
      });

      // Handle different types of errors
      if (error.code === 'PAYMENT_DECLINED') {
        // Don't retry payment declined errors
        await step.run('handle-payment-declined', async () => {
          await this.notifyCustomerPaymentDeclined(event.data.orderId);
          return { handled: true };
        });
        
        return { success: false, reason: 'payment_declined' };
      }

      if (error.code === 'TEMPORARY_SERVICE_ERROR') {
        // Let Inngest retry these errors
        throw error;
      }

      // For unknown errors, throw to trigger retry
      throw error;
    }
  }
}
```

### Monitoring and Alerting

```typescript
// monitoring.service.ts
@Injectable()
export class MonitoringService {
  @InngestCron('collect-metrics', '*/5 * * * *') // Every 5 minutes
  async collectMetrics({ step }: { step: any }) {
    const metrics = await step.run('gather-function-metrics', async () => {
      const functionMetrics = await this.inngestMonitoring.getFunctionMetrics();
      const systemMetrics = await this.inngestMonitoring.getSystemMetrics();
      
      // Send to your monitoring system (Prometheus, DataDog, etc.)
      await this.metricsService.recordFunctionMetrics(functionMetrics);
      await this.metricsService.recordSystemMetrics(systemMetrics);
      
      return { 
        functionsCount: functionMetrics.length,
        systemMemoryUsage: systemMetrics.memory.percentage 
      };
    });

    // Alert on high error rates
    if (metrics.systemMemoryUsage > 90) {
      await step.run('send-high-memory-alert', async () => {
        await this.alertService.sendAlert({
          level: 'critical',
          message: `High memory usage: ${metrics.systemMemoryUsage}%`,
          service: 'nestjs-inngest',
        });
        return { alertSent: true };
      });
    }

    return metrics;
  }
}
```

## Troubleshooting

### Common Issues

#### Functions not appearing in Inngest Dev UI

**Problem:** Your functions aren't showing up in the Inngest dev server UI.

**Solutions:**
1. Check that your NestJS app is running and accessible
2. Verify the `baseUrl` in your configuration points to the dev server
3. Ensure functions are properly decorated and in providers array
4. Check the console for registration errors

```bash
# Check if registration endpoint is accessible
curl -X PUT http://localhost:3000/inngest
```

#### Events not triggering functions

**Problem:** Events are sent but functions aren't executing.

**Solutions:**
1. Verify event names match exactly (case-sensitive)
2. Check event structure matches your function expectations
3. Ensure the Inngest dev server is running
4. Check the Events tab in the Inngest UI for sent events

```typescript
// Debug event sending
@Injectable()
export class DebugService {
  async debugEventSending() {
    try {
      await this.inngestService.send({
        name: 'debug.test',
        data: { timestamp: new Date().toISOString() },
      });
      console.log('Event sent successfully');
    } catch (error) {
      console.error('Failed to send event:', error);
    }
  }
}
```

#### Step functions failing silently

**Problem:** Steps appear to run but don't produce expected results.

**Solutions:**
1. Add comprehensive logging within step functions
2. Use try-catch blocks around step logic
3. Return meaningful data from step functions for debugging
4. Check the function logs in Inngest UI

```typescript
@InngestEvent('debug-steps', 'debug.test')
async debugSteps({ event, step }) {
  console.log('Function started with event:', event);
  
  try {
    const result = await step.run('debug-step-1', async () => {
      console.log('Step 1 starting...');
      const data = { processed: true, timestamp: new Date() };
      console.log('Step 1 result:', data);
      return data;
    });
    
    console.log('Step 1 completed:', result);
    return { success: true, result };
    
  } catch (error) {
    console.error('Step failed:', error);
    throw error;
  }
}
```

#### TypeScript type errors

**Problem:** TypeScript errors with event types or step functions.

**Solutions:**
1. Define proper event interfaces
2. Use type assertions carefully
3. Enable strict type checking gradually

```typescript
// Define event types
interface MyEvents {
  'user.created': {
    data: { userId: string; email: string; name: string };
  };
  'order.completed': {
    data: { orderId: string; amount: number; items: string[] };
  };
}

// Use typed context
@InngestEvent('typed-function', 'user.created')
async typedFunction({ 
  event, 
  step 
}: { 
  event: MyEvents['user.created']; 
  step: any; 
}) {
  // event.data is now fully typed
  const { userId, email, name } = event.data;
}
```

### Performance Optimization

#### Optimizing step functions

```typescript
// Bad: Too many small steps
@InngestEvent('inefficient', 'data.process')
async inefficientFunction({ event, step }) {
  const step1 = await step.run('step1', async () => process1());
  const step2 = await step.run('step2', async () => process2());
  const step3 = await step.run('step3', async () => process3());
  // ... many small steps
}

// Good: Group related operations
@InngestEvent('efficient', 'data.process')
async efficientFunction({ event, step }) {
  const preprocessing = await step.run('preprocessing', async () => {
    const result1 = await process1();
    const result2 = await process2();
    return { result1, result2 };
  });
  
  const mainProcessing = await step.run('main-processing', async () => {
    return await processMain(preprocessing);
  });
  
  return mainProcessing;
}
```

#### Managing memory usage

```typescript
@InngestEvent('memory-efficient', 'data.large-processing')
async memoryEfficientFunction({ event, step }) {
  // Process data in chunks to avoid memory issues
  const chunks = await step.run('chunk-data', async () => {
    return this.chunkLargeData(event.data.items, 100);
  });

  const results = [];
  
  for (let i = 0; i < chunks.length; i++) {
    const chunkResult = await step.run(`process-chunk-${i}`, async () => {
      const processed = await this.processChunk(chunks[i]);
      // Clear chunk from memory
      chunks[i] = null;
      return processed;
    });
    
    results.push(chunkResult);
  }

  return { processedChunks: results.length };
}
```

### Debugging Tips

#### Enable debug logging

```typescript
// Enable detailed logging in development
InngestModule.forRoot({
  id: 'my-app',
  logger: process.env.NODE_ENV === 'development' ? console : undefined,
  // ... other config
})
```

#### Use the Inngest Dev Server UI

1. Open `http://localhost:8288` in your browser
2. Check the **Functions** tab to see registered functions
3. Use the **Events** tab to see sent events
4. View function execution logs and step details
5. Test functions manually with the **Send Event** feature

#### Add custom logging

```typescript
import { Logger } from '@nestjs/common';

@Injectable()
export class MyService {
  private readonly logger = new Logger(MyService.name);

  @InngestEvent('logged-function', 'my.event')
  async loggedFunction({ event, step }) {
    this.logger.log(`Processing event: ${event.name}`, { 
      eventId: event.id,
      data: event.data 
    });

    const result = await step.run('logged-step', async () => {
      this.logger.debug('Step starting with data:', event.data);
      const processed = await this.processData(event.data);
      this.logger.debug('Step completed:', processed);
      return processed;
    });

    this.logger.log('Function completed', { result });
    return result;
  }
}
```

### FAQ

**Q: Can I use dependency injection in step functions?**  
A: Yes! Step functions run within your NestJS service context, so all injected dependencies are available.

**Q: How do I handle database transactions in step functions?**  
A: Each step should be idempotent. If you need transactions, complete them within a single step.

**Q: Can I call other NestJS services from step functions?**  
A: Absolutely! You have full access to your service's dependencies and methods.

**Q: How do I test functions that use `step.waitForEvent()`?**  
A: Mock the step context to simulate event arrival or timeout scenarios.

**Q: What happens if my NestJS app crashes during function execution?**  
A: Inngest will retry the function from the last completed step. Steps are durable across crashes.

**Q: Can I use decorators on the same function?**  
A: Yes, you can combine multiple decorators like `@InngestEvent` with `@Throttle`, `@Retries`, etc.

## Contributing

We welcome contributions to nestjs-inngest! Here's how you can help:

### Development Setup

```bash
# Clone the repository
git clone https://github.com/nestjs-community/nestjs-inngest.git
cd nestjs-inngest

# Install dependencies
npm install

# Start Inngest dev server
npx inngest dev

# Run tests
npm test

# Run E2E tests
npm run test:e2e

# Build the package
npm run build
```

### Running Examples

```bash
# Basic example
npm run start:example:basic

# Async configuration example
npm run start:example:async-config

# Tracing example
npm run start:example:tracing
```

### Contribution Guidelines

1. **Fork the repository** and create your feature branch
2. **Write tests** for new features and bug fixes  
3. **Follow the existing code style** and conventions
4. **Update documentation** for new features
5. **Run the test suite** to ensure nothing breaks
6. **Submit a pull request** with a clear description

### Reporting Issues

When reporting bugs, please include:
- NestJS version
- Node.js version  
- nestjs-inngest version
- Minimal reproduction case
- Error messages and stack traces

### Feature Requests

For new features, please:
- Open an issue first to discuss the feature
- Explain the use case and expected behavior
- Consider implementation complexity and backwards compatibility

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- 📖 [Inngest Documentation](https://inngest.com/docs)
- 💬 [Inngest Discord Community](https://discord.gg/inngest)  
- 🐛 [Issues](https://github.com/nestjs-community/nestjs-inngest/issues)
- 🚀 [Feature Requests](https://github.com/nestjs-community/nestjs-inngest/issues/new?template=feature_request.md)

---

Built with ❤️ for the NestJS and Inngest communities.