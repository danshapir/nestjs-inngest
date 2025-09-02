import 'reflect-metadata';
import { 
  InngestFunction, 
  InngestCron, 
  InngestEvent,
  UseMiddleware,
  Concurrency,
  RateLimit,
} from '../src/decorators';
import { INNGEST_FUNCTION_METADATA } from '../src/constants';

describe('Decorators', () => {
  describe('@InngestFunction', () => {
    it('should set function metadata', () => {
      class TestService {
        @InngestFunction({
          id: 'test-function',
          trigger: { event: 'test.event' },
        })
        async handleEvent(context: any) {
          return { success: true };
        }
      }

      const metadata = Reflect.getMetadata(
        INNGEST_FUNCTION_METADATA,
        TestService.prototype,
        'handleEvent',
      );

      expect(metadata).toBeDefined();
      expect(metadata.config.id).toBe('test-function');
      expect(metadata.config.trigger).toEqual({ event: 'test.event' });
    });
  });

  describe('@InngestCron', () => {
    it('should create a cron-triggered function', () => {
      class TestService {
        @InngestCron('scheduled-task', '0 0 * * *')
        async scheduledTask(context: any) {
          return { success: true };
        }
      }

      const metadata = Reflect.getMetadata(
        INNGEST_FUNCTION_METADATA,
        TestService.prototype,
        'scheduledTask',
      );

      expect(metadata).toBeDefined();
      expect(metadata.config.id).toBe('scheduled-task');
      expect(metadata.config.trigger).toEqual({ cron: '0 0 * * *' });
    });
  });

  describe('@InngestEvent', () => {
    it('should create an event-triggered function', () => {
      class TestService {
        @InngestEvent('event-handler', 'user.created')
        async handleUserCreated(context: any) {
          return { success: true };
        }
      }

      const metadata = Reflect.getMetadata(
        INNGEST_FUNCTION_METADATA,
        TestService.prototype,
        'handleUserCreated',
      );

      expect(metadata).toBeDefined();
      expect(metadata.config.id).toBe('event-handler');
      expect(metadata.config.trigger).toEqual({ event: 'user.created' });
    });

    it('should handle complex event triggers', () => {
      class TestService {
        @InngestEvent('conditional-handler', {
          event: 'user.created',
          if: 'event.data.verified == true',
        })
        async handleVerifiedUser(context: any) {
          return { success: true };
        }
      }

      const metadata = Reflect.getMetadata(
        INNGEST_FUNCTION_METADATA,
        TestService.prototype,
        'handleVerifiedUser',
      );

      expect(metadata).toBeDefined();
      expect(metadata.config.trigger).toEqual({
        event: 'user.created',
        if: 'event.data.verified == true',
      });
    });
  });

  // Tests for @OnEvent and @Cron removed - these decorators have been deprecated
  // Use @InngestEvent and @InngestCron instead

  describe('Configuration Decorators', () => {
    it('should apply concurrency settings', () => {
      class TestService {
        @InngestFunction({
          id: 'concurrent-function',
          trigger: { event: 'test.event' },
        })
        @Concurrency(5)
        async handleConcurrent(context: any) {
          return { success: true };
        }
      }

      const metadata = Reflect.getMetadata(
        INNGEST_FUNCTION_METADATA,
        TestService.prototype,
        'handleConcurrent',
      );

      expect(metadata.concurrency).toBe(5);
    });

    it('should apply rate limiting', () => {
      class TestService {
        @InngestFunction({
          id: 'rate-limited-function',
          trigger: { event: 'test.event' },
        })
        @RateLimit(10, '1m')
        async handleRateLimited(context: any) {
          return { success: true };
        }
      }

      const metadata = Reflect.getMetadata(
        INNGEST_FUNCTION_METADATA,
        TestService.prototype,
        'handleRateLimited',
      );

      expect(metadata.rateLimit).toEqual({
        limit: 10,
        period: '1m',
      });
    });
  });
});