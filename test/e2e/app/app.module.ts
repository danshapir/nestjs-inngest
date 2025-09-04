import { Module, Logger, Global } from '@nestjs/common';
import { InngestModule } from '../../../src/index';

// Feature modules
import { UserModule } from './user/user.module';
import { NotificationModule } from './notification/notification.module';
import { HealthModule } from './health/health.module';
import { MiddlewareModule } from './middleware/middleware.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { TestModule } from './test/test.module';

// Test controller
import { TestController } from './test.controller';

@Global()
@Module({
  imports: [
    // Configure Inngest to connect to local dev server
    InngestModule.forRoot({
      id: 'nestjs-integration-test',
      
      // Connect to local Inngest dev server
      baseUrl: 'http://localhost:8288',
      
      // No signing key needed for local development
      signingKey: undefined,
      
      // No event key needed for local development
      eventKey: undefined,
      
      // Make module global so all services can use InngestService
      isGlobal: true,
      
      // Use NestJS logger instead of console
      logger: undefined,
      
      // Additional client options
      clientOptions: {
        // Add any additional Inngest client options here
      },
      
      // Enable tracing for e2e testing
      tracing: {
        enabled: true,
        includeEventData: false,
        includeStepData: false,
        defaultAttributes: {
          'test.environment': 'e2e',
          'test.app': 'nestjs-inngest'
        },
        contextInjection: {
          enabled: true,
          fieldName: 'traceContext'
        }
      },
    }),
    
    // Feature modules
    UserModule,
    NotificationModule,
    HealthModule,
    MiddlewareModule,
    MonitoringModule,
    TestModule,
  ],
  controllers: [TestController],
})
export class AppModule {
  private readonly logger = new Logger(AppModule.name);

  constructor() {
    this.logger.log('NestJS Integration Test App initialized', {
      appType: 'e2e-test',
      port: 3001
    });
    this.logger.log('Inngest module configured for local dev server', {
      devServerUrl: 'localhost:8288',
      clientId: 'nestjs-integration-test'
    });
    this.logger.log('Inngest function discovery enabled', {
      autoDiscovery: true,
      tracingEnabled: true
    });
  }
}