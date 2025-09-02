# NestJS Inngest

A modern, type-safe NestJS integration for [Inngest](https://www.inngest.com) - the reliable background job and workflow engine.

[![npm version](https://badge.fury.io/js/nestjs-inngest.svg)](https://badge.fury.io/js/nestjs-inngest)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

✨ **Modern NestJS Integration** - Built with the latest NestJS patterns using `ConfigurableModuleBuilder`  
🎯 **Type Safety** - Full TypeScript support with event schema validation  
🎨 **Decorator-Based** - Intuitive decorators for defining functions and triggers  
⚡ **Step Functions** - Support for durable, resumable step-based workflows  
🔄 **Async Configuration** - Multiple configuration patterns (`forRoot`, `forRootAsync`, `forFeature`)  
🧪 **Testing Utilities** - Comprehensive testing helpers and mocks  
📈 **Production Ready** - Rate limiting, concurrency control, retries, and more  
🛡️ **Error Handling** - Built-in error handling and logging  

## Installation

```bash
npm install nestjs-inngest inngest
# or
yarn add nestjs-inngest inngest
```

## Quick Start

### 1. Module Setup

```typescript
import { Module } from '@nestjs/common';
import { InngestModule } from 'nestjs-inngest';

@Module({
  imports: [
    InngestModule.forRoot({
      id: 'my-nestjs-app',
      eventKey: process.env.INNGEST_EVENT_KEY,
      signingKey: process.env.INNGEST_SIGNING_KEY,
      isGlobal: true,
    }),
  ],
})
export class AppModule {}
```

### 2. Define Event Types (Optional but Recommended)

```typescript
interface MyEvents {
  'user.created': {
    data: {
      userId: string;
      email: string;
      name: string;
    };
  };
  'user.updated': {
    data: {
      userId: string;
      changes: Record<string, any>;
    };
  };
}
```

### 3. Create Your First Function

```typescript
import { Injectable } from '@nestjs/common';
import { InngestFunction } from 'nestjs-inngest';

@Injectable()
export class UserService {
  @InngestFunction({
    id: 'welcome-new-user',
    trigger: { event: 'user.created' },
  })
  async welcomeNewUser({ event, step }: { event: MyEvents['user.created']; step: any }) {
    const { userId, email, name } = event.data;

    // Step 1: Send welcome email
    await step.run('send-welcome-email', async () => {
      console.log(`Sending welcome email to ${email}`);
      // Your email logic here
      return { emailSent: true };
    });

    // Step 2: Create user profile
    const profile = await step.run('create-profile', async () => {
      console.log(`Creating profile for ${userId}`);
      // Your profile creation logic here
      return { profileId: `profile-${userId}` };
    });

    // Step 3: Send follow-up event
    await step.sendEvent('send-follow-up', {
      name: 'user.onboarded',
      data: { userId, profileId: profile.profileId },
    });

    return { success: true, userId };
  }
}
```

### 4. Trigger Your Function

```typescript
import { Injectable } from '@nestjs/common';
import { InngestService } from 'nestjs-inngest';

@Injectable()
export class UserController {
  constructor(private inngestService: InngestService) {}

  async createUser(userData: { email: string; name: string }) {
    const userId = generateUserId();

    // Trigger the Inngest function
    await this.inngestService.send({
      name: 'user.created',
      data: { userId, ...userData },
    });

    return { userId, ...userData };
  }
}
```

## Configuration

### Basic Configuration

```typescript
InngestModule.forRoot({
  id: 'my-app',
  eventKey: 'your-event-key',
  signingKey: 'your-signing-key', // For webhook signature validation
  baseUrl: 'https://api.inngest.com', // Optional, defaults to Inngest Cloud
  isGlobal: true, // Makes the module global
})
```

### Async Configuration

```typescript
// Using useFactory
InngestModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: async (configService: ConfigService) => ({
    id: configService.get('APP_NAME'),
    eventKey: configService.get('INNGEST_EVENT_KEY'),
    signingKey: configService.get('INNGEST_SIGNING_KEY'),
  }),
  inject: [ConfigService],
})

// Using useClass
InngestModule.forRootAsync({
  useClass: InngestConfigService,
})
```

## Decorators

### @InngestFunction

Define an Inngest function with comprehensive configuration:

```typescript
@InngestFunction({
  id: 'process-order',
  name: 'Process Order',
  trigger: { event: 'order.created' },
  concurrency: [{ limit: 10, scope: 'fn' }],
  rateLimit: { limit: 100, period: '1m' },
  retries: 3,
})
async processOrder({ event, step }) {
  // Your function logic
}
```

### @InngestCron

Create scheduled functions:

```typescript
@InngestCron('daily-cleanup', '0 2 * * *')
async dailyCleanup({ event, step }) {
  // Runs daily at 2 AM
}
```

### @InngestEvent

Shorthand for event-triggered functions:

```typescript
@InngestEvent('handle-payment', 'payment.completed')
async handlePayment({ event, step }) {
  // Triggered by payment.completed events
}
```

### Configuration Decorators

Add function-level configuration:

```typescript
@InngestFunction({ id: 'my-function', trigger: { event: 'test' } })
@Concurrency(5)
@RateLimit(100, '1m')
@Throttle(50, '10s')
@Debounce('30s')
@Retries(3)
async myFunction({ event, step }) {
  // Your logic
}
```

## Step Functions

Inngest step functions provide durable, resumable workflows:

```typescript
@InngestFunction({
  id: 'complex-workflow',
  trigger: { event: 'workflow.start' },
})
async complexWorkflow({ event, step }) {
  // Step 1: Process data
  const result = await step.run('process-data', async () => {
    return await processData(event.data);
  });

  // Step 2: Wait for external event
  const approval = await step.waitForEvent('wait-for-approval', {
    event: 'workflow.approved',
    timeout: '24h',
    match: 'data.workflowId',
  });

  if (approval) {
    // Step 3: Complete workflow
    await step.run('complete-workflow', async () => {
      return await completeWorkflow(result);
    });
  }

  // Step 4: Sleep until specific time
  await step.sleepUntil('wait-until-tomorrow', '2024-01-01T09:00:00Z');

  // Step 5: Send notification
  await step.sendEvent('notify-completion', {
    name: 'workflow.completed',
    data: { workflowId: event.data.workflowId },
  });

  return { success: true };
}
```

## Testing

The package provides comprehensive testing utilities:

### Testing Module Setup

```typescript
import { createInngestTestingModule } from 'nestjs-inngest';

const module = await createInngestTestingModule(
  {
    id: 'test-app',
    eventKey: 'test-key',
  },
  [UserService] // Additional providers
);
```

### Mock Service

```typescript
import { MockInngestService } from 'nestjs-inngest';

const mockService = new MockInngestService();

// Track sent events
await mockService.send({ name: 'test.event', data: {} });
console.log(mockService.getEvents()); // Array of sent events

// Mock step tools
const stepTools = mockService.createStepTools();
```

### Testing Function Handlers

```typescript
import { createMockInngestContext } from 'nestjs-inngest';

const mockContext = createMockInngestContext({
  event: {
    name: 'user.created',
    data: { userId: '123', email: 'test@example.com' },
  },
});

// Test your function directly
const result = await userService.welcomeNewUser(mockContext);
expect(result.success).toBe(true);

// Verify step calls
expect(mockContext.step.run).toHaveBeenCalledWith(
  'send-welcome-email',
  expect.any(Function),
);
```

## Advanced Features

### Batch Event Processing

```typescript
@InngestFunction({
  id: 'process-batch',
  trigger: { event: 'batch.process' },
  batchEvents: {
    maxSize: 10,
    timeout: '5m',
  },
})
async processBatch({ events, step }) {
  // Process up to 10 events at once
  for (const event of events) {
    await step.run(`process-${event.id}`, async () => {
      return await processEvent(event);
    });
  }
}
```

### Cancel Conditions

```typescript
@InngestFunction({
  id: 'cancellable-function',
  trigger: { event: 'start.process' },
  cancelOn: [
    {
      event: 'cancel.process',
      match: 'data.processId',
    },
  ],
})
async cancellableFunction({ event, step }) {
  // This function can be cancelled by the cancel.process event
}
```

### Multiple Triggers

```typescript
@InngestFunction({
  id: 'multi-trigger',
  trigger: [
    { event: 'trigger.one' },
    { event: 'trigger.two' },
    { cron: '0 */6 * * *' },
  ],
})
async multiTriggerFunction({ event, step }) {
  // Responds to multiple triggers
}
```

## Environment Variables

```bash
# Required
INNGEST_EVENT_KEY=your-event-key

# Optional
INNGEST_SIGNING_KEY=your-signing-key
INNGEST_BASE_URL=https://api.inngest.com
INNGEST_LOG_LEVEL=info
```

## Development

### Local Development

1. Start the Inngest Dev Server:
```bash
npx inngest-cli@latest dev
```

2. Set your base URL to the dev server:
```typescript
InngestModule.forRoot({
  id: 'my-app',
  baseUrl: 'http://localhost:8288',
  // ... other config
})
```

### Debugging

Enable debug logging:

```typescript
InngestModule.forRoot({
  id: 'my-app',
  logger: { level: 'debug' },
  // ... other config
})
```

## Examples

Check the [examples](./examples) directory for complete working examples:

- [Basic Example](./examples/basic-example) - Simple user onboarding workflow
- [Async Configuration](./examples/async-config) - Advanced configuration patterns
- [Testing Example](./examples/testing-example) - Comprehensive testing setup

## Migration from nest-inngest

If you're migrating from the original `nest-inngest` package:

1. Update imports:
```typescript
// Old
import { NestInngest } from 'nest-inngest';

// New
import { InngestFunction } from 'nestjs-inngest';
```

2. Update decorators:
```typescript
// Old
@NestInngest.Function({ id: 'my-function', trigger: { event: 'test' } })

// New
@InngestFunction({ id: 'my-function', trigger: { event: 'test' } })
```

3. Update module configuration:
```typescript
// Old
NestInngestModule.forRoot({ id: 'app' })

// New
InngestModule.forRoot({ id: 'app' })
```

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- 📖 [Inngest Documentation](https://www.inngest.com/docs)
- 💬 [Inngest Discord](https://www.inngest.com/discord)
- 🐛 [Report Issues](https://github.com/yourusername/nestjs-inngest/issues)

## Acknowledgments

- [Inngest](https://www.inngest.com) for the amazing platform
- [NestJS](https://nestjs.com) for the incredible framework
- Original [nest-inngest](https://github.com/thawankeane/nest-inngest) for inspiration