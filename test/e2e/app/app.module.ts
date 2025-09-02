import { Module, Logger, Global } from '@nestjs/common';
import { InngestModule } from '../../../src/index';

// Feature modules
import { UserModule } from './user/user.module';
import { NotificationModule } from './notification/notification.module';
import { HealthModule } from './health/health.module';
import { MiddlewareModule } from './middleware/middleware.module';

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
      
      // Enable landing page for development
      landingPage: true,
      
      // Custom logger for debugging
      logger: console,
      
      // Additional client options
      clientOptions: {
        // Add any additional Inngest client options here
      },
    }),
    
    // Feature modules
    UserModule,
    NotificationModule,
    HealthModule,
    MiddlewareModule,
  ],
  controllers: [TestController],
})
export class AppModule {
  private readonly logger = new Logger(AppModule.name);

  constructor() {
    this.logger.log('🎯 NestJS Integration Test App initialized');
    this.logger.log('📡 Inngest module configured for local dev server (localhost:8288)');
    this.logger.log('🔄 All Inngest functions will be automatically discovered and registered');
  }
}