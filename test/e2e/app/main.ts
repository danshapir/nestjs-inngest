import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  // Enable CORS for development
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Global prefix for API routes
  app.setGlobalPrefix('api');

  const port = process.env.PORT || 3001;
  
  await app.listen(port);
  
  logger.log(`🚀 Integration Test App is running on: http://localhost:${port}`);
  logger.log(`📊 Inngest Dev Server should be running on: http://localhost:8288`);  
  logger.log(`🔧 Inngest functions available at: http://localhost:${port}/api/inngest`);
  
  // Log available endpoints
  logger.log('\n📋 Available endpoints:');
  logger.log('  POST /api/users - Create a user');
  logger.log('  PUT /api/users/:id - Update a user'); 
  logger.log('  DELETE /api/users/:id - Delete a user');
  logger.log('  GET /api/users/:id - Get user details');
  logger.log('  GET /api/health - System health status');
  logger.log('  POST /api/test/simple - Trigger simple test event');
  logger.log('  POST /api/test/workflow - Trigger workflow test event');
  logger.log('  POST /api/test/error - Trigger error test event');
  logger.log('  GET /api/inngest - View Inngest function registration (GET)');
  logger.log('  POST /api/inngest - Inngest function execution endpoint (POST)');
}

bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});