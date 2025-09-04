import { Controller, Post, Body, Logger, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { InngestService } from '../../../src/index';
import { NotificationService } from './notification/notification.service';
import { createUserEvent } from '../../../src/utils/types';

@ApiTags('test')
@Controller('test')
export class TestController {
  private readonly logger = new Logger(TestController.name);

  constructor(
    private readonly inngestService: InngestService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Trigger simple test events
   */
  @Post('simple')
  @ApiOperation({ summary: 'Trigger simple test event' })
  @ApiResponse({ status: 201, description: 'Simple test event triggered successfully' })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Optional custom message' }
      }
    }
  })
  async triggerSimpleEvent(@Body() body: { message?: string }) {
    this.logger.log('🧪 Triggering simple test event');
    
    try {
      await this.inngestService.send({
        name: 'test.simple',
        data: {
          message: body.message || 'Hello from test endpoint!',
          timestamp: new Date().toISOString(),
        },
      });

      return {
        success: true,
        message: 'Simple test event triggered successfully',
        eventData: body,
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      this.logger.error(`❌ Failed to trigger simple test event: ${error.message}`);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Trigger workflow test events
   */
  @Post('workflow')
  @ApiOperation({ summary: 'Trigger workflow test event' })
  @ApiResponse({ status: 201, description: 'Workflow test event triggered successfully' })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        steps: { type: 'array', items: { type: 'string' }, description: 'Workflow steps' },
        metadata: { type: 'object', description: 'Additional metadata' }
      }
    }
  })
  async triggerWorkflowEvent(@Body() body: { 
    steps?: string[];
    metadata?: any;
  }) {
    this.logger.log('🧪 Triggering workflow test event');
    
    try {
      await this.inngestService.send({
        name: 'test.workflow',
        data: {
          workflowId: `test_${Date.now()}`,
          steps: body.steps || ['step1', 'step2', 'step3'],
          metadata: body.metadata || { source: 'test-controller' },
        },
      });

      return {
        success: true,
        message: 'Workflow test event triggered successfully',
        eventData: body,
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      this.logger.error(`❌ Failed to trigger workflow test event: ${error.message}`);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Trigger error test events
   */
  @Post('error')
  @ApiOperation({ summary: 'Trigger error test event' })
  @ApiResponse({ status: 201, description: 'Error test event triggered successfully' })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        shouldFail: { type: 'boolean', description: 'Whether the event should fail' },
        errorType: { type: 'string', enum: ['validation', 'network', 'timeout', 'unknown'] },
        message: { type: 'string', description: 'Error message' }
      }
    }
  })
  async triggerErrorEvent(@Body() body: {
    shouldFail?: boolean;
    errorType?: 'validation' | 'network' | 'timeout' | 'unknown';
    message?: string;
  }) {
    this.logger.log('🧪 Triggering error test event');
    
    try {
      await this.inngestService.send({
        name: 'test.error',
        data: {
          shouldFail: body.shouldFail !== false,
          errorType: body.errorType || 'validation',
          message: body.message || 'Test error event',
        },
      });

      return {
        success: true,
        message: 'Error test event triggered successfully',
        eventData: body,
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      this.logger.error(`❌ Failed to trigger error test event: ${error.message}`);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Trigger notification batch test
   */
  @Post('batch-notifications')
  @ApiOperation({ summary: 'Trigger batch notification test' })
  @ApiResponse({ status: 201, description: 'Batch notifications triggered successfully' })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        count: { type: 'number', description: 'Number of notifications (max 20)' },
        priority: { type: 'string', enum: ['high', 'normal', 'low'] }
      }
    }
  })
  async triggerBatchNotifications(@Body() body: {
    count?: number;
    priority?: 'high' | 'normal' | 'low';
  }) {
    this.logger.log(`🧪 Triggering batch notification test (${body.count || 5} notifications)`);
    
    try {
      const notifications = [];
      const count = Math.min(body.count || 5, 20); // Max 20 for testing
      
      for (let i = 1; i <= count; i++) {
        notifications.push({
          type: 'email',
          recipient: `test${i}@example.com`,
          data: {
            subject: `Test Email ${i}`,
            template: 'generic',
            templateData: {
              message: `This is test email number ${i}`,
              testNumber: i,
            },
            priority: body.priority || 'normal',
          },
        });
      }
      
      await this.notificationService.sendBatchNotifications(notifications);

      return {
        success: true,
        message: `Batch notification test triggered with ${count} notifications`,
        notifications: count,
        priority: body.priority || 'normal',
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      this.logger.error(`❌ Failed to trigger batch notification test: ${error.message}`);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Trigger single email notification
   */
  @Post('email')
  @ApiOperation({ summary: 'Trigger single email test' })
  @ApiResponse({ status: 201, description: 'Email test triggered successfully' })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Email recipient' },
        template: { type: 'string', description: 'Email template name' },
        priority: { type: 'string', enum: ['high', 'normal', 'low'] },
        data: { type: 'object', description: 'Template data' }
      }
    }
  })
  async triggerEmailTest(@Body() body: {
    to?: string;
    template?: string;
    priority?: 'high' | 'normal' | 'low';
    data?: any;
  }) {
    this.logger.log(`🧪 Triggering email test to: ${body.to || 'test@example.com'}`);
    
    try {
      await this.inngestService.send({
        name: 'notification.email.send',
        data: {
          to: body.to || 'test@example.com',
          subject: 'Test Email',
          template: body.template || 'generic',
          templateData: {
            message: 'This is a test email from the integration test app',
            timestamp: new Date().toISOString(),
            ...body.data,
          },
          priority: body.priority || 'normal',
        },
      });

      return {
        success: true,
        message: 'Email test triggered successfully',
        recipient: body.to || 'test@example.com',
        template: body.template || 'generic',
        priority: body.priority || 'normal',
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      this.logger.error(`❌ Failed to trigger email test: ${error.message}`);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get notification statistics
   */
  @Get('email-stats')
  @ApiOperation({ summary: 'Get email statistics' })
  @ApiResponse({ status: 200, description: 'Email statistics retrieved successfully' })
  getEmailStats() {
    this.logger.log('📊 Getting email statistics');
    
    const stats = this.notificationService.getEmailStats();
    const sentEmails = this.notificationService.getSentEmails();
    
    return {
      success: true,
      stats,
      recentEmails: sentEmails.slice(-10), // Last 10 emails
      totalEmails: sentEmails.length,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Test email notification function
   */
  @Post('email-notification')
  @ApiOperation({ summary: 'Test email notification function' })
  @ApiResponse({ status: 201, description: 'Email notification event sent successfully' })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', description: 'Email address' },
        subject: { type: 'string', description: 'Email subject' },
        message: { type: 'string', description: 'Email message' }
      }
    }
  })
  async testEmailNotification(@Body() body: { 
    email?: string; 
    subject?: string; 
    message?: string;
  }) {
    this.logger.log('📧 Testing email notification function');
    
    try {
      const email = body.email || 'test@example.com';
      const userId = email.split('@')[0]; // Extract username from email
      
      const event = createUserEvent(
        'notification.email.send',
        {
          to: email,
          subject: body.subject || 'Test Email Notification',
          template: 'generic',
          templateData: {
            message: body.message || 'Hello from the email notification test!',
          },
          priority: 'normal',
          timestamp: new Date().toISOString(),
        },
        {
          userId,
          email,
          name: `Test User (${userId})`,
          role: 'user',
        },
      );
      
      await this.inngestService.send(event);

      return {
        success: true,
        message: 'Email notification event sent successfully',
        eventData: body,
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      this.logger.error(`❌ Failed to send email notification event: ${error.message}`);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Test user onboarding workflow function
   */
  @Post('user-onboarding')
  @ApiOperation({ summary: 'Test user onboarding workflow' })
  @ApiResponse({ status: 201, description: 'User onboarding workflow triggered successfully' })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: 'User ID' },
        email: { type: 'string', description: 'User email' },
        name: { type: 'string', description: 'User name' }
      }
    }
  })
  async testUserOnboarding(@Body() body: { 
    userId?: string; 
    email?: string; 
    name?: string;
  }) {
    this.logger.log('👤 Testing user onboarding workflow function');
    
    try {
      const userId = body.userId || `user_${Date.now()}`;
      const email = body.email || 'newuser@example.com';
      const name = body.name || 'Test User';
      
      const event = createUserEvent(
        'user.created',
        {
          timestamp: new Date().toISOString(),
        },
        {
          userId,
          email,
          name,
          role: 'user',
        },
      );
      
      await this.inngestService.send(event);

      return {
        success: true,
        message: 'User onboarding workflow event sent successfully',
        eventData: body,
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      this.logger.error(`❌ Failed to send user onboarding event: ${error.message}`);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Test Inngest connectivity
   */
  @Post('connectivity')
  @ApiOperation({ summary: 'Test Inngest connectivity' })
  @ApiResponse({ status: 201, description: 'Connectivity test completed successfully' })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Test message' }
      }
    }
  })
  async testConnectivity(@Body() body: { message?: string }) {
    this.logger.log('🧪 Testing Inngest connectivity');
    
    try {
      await this.inngestService.send({
        name: 'test/connectivity',
        data: {
          message: body.message || 'Testing connectivity from controller!',
          timestamp: new Date().toISOString(),
        },
      });

      return {
        success: true,
        message: 'Connectivity test event sent successfully',
        eventData: body,
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      this.logger.error(`❌ Failed to send connectivity test event: ${error.message}`);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Test middleware functionality
   */
  @Post('middleware')
  @ApiOperation({ summary: 'Test middleware functionality' })
  @ApiResponse({ status: 201, description: 'Middleware test completed successfully' })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        testId: { type: 'string', description: 'Test ID' },
        message: { type: 'string', description: 'Test message' },
        userId: { type: 'string', description: 'User ID' }
      }
    }
  })
  async testMiddleware(@Body() body: { 
    testId?: string; 
    message?: string;
    userId?: string;
  }) {
    this.logger.log('🧪 Testing middleware functionality');
    
    try {
      const userId = body.userId || 'test-user-123';
      const event = createUserEvent(
        'test.middleware',
        {
          testId: body.testId || `middleware-test-${Date.now()}`,
          message: body.message || 'Testing @UseMiddleware decorator',
          timestamp: new Date().toISOString(),
        },
        {
          userId,
          email: `${userId}@example.com`,
          name: `Test User ${userId.split('-').pop()}`,
          role: 'tester',
        },
      );
      
      await this.inngestService.send(event);

      return {
        success: true,
        message: 'Middleware test event sent successfully',
        eventData: body,
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      this.logger.error(`❌ Failed to send middleware test event: ${error.message}`);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Trigger complex multi-step test with for loops
   */
  @Post('complex')
  @ApiOperation({ summary: 'Trigger complex multi-step test event' })
  @ApiResponse({ status: 201, description: 'Complex test event triggered successfully' })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        iterations: { type: 'number', description: 'Number of iterations for loops (default: 3)' },
        delay: { type: 'number', description: 'Processing delay in ms (default: 10)' },
        testId: { type: 'string', description: 'Test identifier' }
      }
    }
  })
  async triggerComplexTest(@Body() body: {
    iterations?: number;
    delay?: number;
    testId?: string;
  }) {
    this.logger.log('Triggering complex multi-step test', {
      iterations: body.iterations || 3,
      delay: body.delay || 100,
      testType: 'complex-test'
    });
    
    try {
      await this.inngestService.send({
        name: 'test.complex',
        data: {
          iterations: body.iterations || 3,
          delay: body.delay || 10,
          testId: body.testId || `complex-test-${Date.now()}`,
          triggeredAt: new Date().toISOString(),
        },
      });

      return {
        success: true,
        message: 'Complex test event triggered successfully',
        config: {
          iterations: body.iterations || 3,
          delay: body.delay || 10,
          testId: body.testId || `complex-test-${Date.now()}`
        },
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      this.logger.error(`❌ Failed to trigger complex test event: ${error.message}`);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Test generic middleware functionality with completely different properties
   */
  @Post('generic-middleware')
  @ApiOperation({ summary: 'Test generic middleware (auth + metrics)' })
  @ApiResponse({ status: 201, description: 'Generic middleware test completed successfully' })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        testId: { type: 'string', description: 'Test ID' },
        message: { type: 'string', description: 'Test message' },
        userId: { type: 'string', description: 'User ID' },
        sessionData: { type: 'object', description: 'Session data' }
      }
    }
  })
  async testGenericMiddleware(@Body() body: { 
    testId?: string; 
    message?: string;
    userId?: string;
    sessionData?: any;
  }) {
    this.logger.log('🧪 Testing generic middleware functionality with auth + metrics');
    
    try {
      const userId = body.userId || 'test-user-456';
      const sessionData = body.sessionData || { role: 'admin', preferences: { theme: 'dark' } };
      
      const event = createUserEvent(
        'test.generic.middleware',
        {
          testId: body.testId || `generic-middleware-${Date.now()}`,
          message: body.message || 'Testing generic middleware with auth and metrics',
          sessionData,
          timestamp: new Date().toISOString(),
        },
        {
          userId,
          email: `${userId}@example.com`,
          name: `Generic Test User ${userId.split('-').pop()}`,
          role: sessionData.role || 'admin',
        },
      );
      
      await this.inngestService.send(event);

      return {
        success: true,
        message: 'Generic middleware test event sent successfully',
        eventData: body,
        middleware: 'auth + metrics middleware applied',
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      this.logger.error(`❌ Failed to send generic middleware test event: ${error.message}`);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Health check endpoint for testing
   */
  @Get('health')
  @ApiOperation({ summary: 'Get test controller health and available endpoints' })
  @ApiResponse({ status: 200, description: 'Test controller health status' })
  getTestHealth() {
    return {
      success: true,
      service: 'TestController',
      status: 'healthy',
      availableEndpoints: [
        'POST /api/test/simple - Trigger simple test event',
        'POST /api/test/workflow - Trigger workflow test event',
        'POST /api/test/error - Trigger error test event',
        'POST /api/test/batch-notifications - Trigger batch notification test',
        'POST /api/test/email - Trigger single email test',
        'POST /api/test/connectivity - Test Inngest connectivity',
        'POST /api/test/email-notification - Test email notification function',
        'POST /api/test/user-onboarding - Test user onboarding workflow',
        'POST /api/test/middleware - Test @UseMiddleware decorator functionality',
        'POST /api/test/generic-middleware - Test generic middleware (auth + metrics)',
        'GET /api/test/email-stats - Get email statistics',
        'POST /api/test/trace-propagation - Test trace ID propagation',
        'POST /api/test/complex-workflow-trace - Test complex workflow with tracing',
        'POST /api/test/error-trace - Test error scenarios with trace preservation',
        'GET /api/test/health - This endpoint',
      ],
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Test trace ID propagation across function calls
   */
  @Post('trace-propagation')
  @ApiOperation({ summary: 'Test trace ID propagation across function calls' })
  @ApiResponse({ status: 201, description: 'Trace propagation test triggered successfully' })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        testId: { type: 'string', description: 'Unique test identifier' },
        userId: { type: 'string', description: 'User ID for business context' },
        chainDepth: { type: 'number', description: 'How many levels deep to chain events', default: 2 }
      }
    }
  })
  async triggerTracePropagationTest(@Body() body: any) {
    const testId = body.testId || `trace-test-${Date.now()}`;
    const userId = body.userId || 'trace-test-user';
    const chainDepth = body.chainDepth || 2;

    this.logger.log('🔗 Triggering trace propagation test', {
      testId,
      userId,
      chainDepth
    });

    try {
      await this.inngestService.send({
        name: 'test.trace.propagation',
        data: {
          testId,
          userId,
          chainDepth,
          startedAt: new Date().toISOString()
        }
      });

      return {
        success: true,
        message: 'Trace propagation test triggered successfully',
        testId,
        chainDepth,
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      this.logger.error(`❌ Failed to trigger trace propagation test: ${error.message}`);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Test complex workflow with trace context propagation
   */
  @Post('complex-workflow-trace')
  @ApiOperation({ summary: 'Test complex workflow with multiple trace propagation paths' })
  @ApiResponse({ status: 201, description: 'Complex workflow trace test triggered successfully' })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        workflowId: { type: 'string', description: 'Unique workflow identifier' },
        userId: { type: 'string', description: 'User ID for business context' },
        branches: { type: 'number', description: 'Number of parallel branches to create', default: 3 }
      }
    }
  })
  async triggerComplexWorkflowTrace(@Body() body: any) {
    const workflowId = body.workflowId || `workflow-${Date.now()}`;
    const userId = body.userId || 'workflow-test-user';
    const branches = body.branches || 3;

    this.logger.log('🌊 Triggering complex workflow trace test', {
      workflowId,
      userId,
      branches
    });

    try {
      await this.inngestService.send({
        name: 'test.complex.workflow',
        data: {
          workflowId,
          userId,
          branches,
          startedAt: new Date().toISOString()
        }
      });

      return {
        success: true,
        message: 'Complex workflow trace test triggered successfully',
        workflowId,
        branches,
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      this.logger.error(`❌ Failed to trigger complex workflow trace test: ${error.message}`);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Test error scenarios with trace context preservation
   */
  @Post('error-trace')
  @ApiOperation({ summary: 'Test error scenarios while preserving trace context' })
  @ApiResponse({ status: 201, description: 'Error trace test triggered successfully' })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        testId: { type: 'string', description: 'Unique test identifier' },
        userId: { type: 'string', description: 'User ID for business context' },
        shouldRecover: { type: 'boolean', description: 'Whether to test error recovery', default: false }
      }
    }
  })
  async triggerErrorTrace(@Body() body: any) {
    const testId = body.testId || `error-trace-${Date.now()}`;
    const userId = body.userId || 'error-trace-user';
    const shouldRecover = body.shouldRecover || false;

    this.logger.log('💥 Triggering error trace test', {
      testId,
      userId,
      shouldRecover
    });

    try {
      await this.inngestService.send({
        name: 'test.error.trace',
        data: {
          testId,
          userId,
          shouldRecover,
          startedAt: new Date().toISOString()
        }
      });

      return {
        success: true,
        message: 'Error trace test triggered successfully',
        testId,
        shouldRecover,
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      this.logger.error(`❌ Failed to trigger error trace test: ${error.message}`);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}