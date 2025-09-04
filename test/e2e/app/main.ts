// Import tracing setup first before any other imports
import '../tracing';

import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
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

  // Setup Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('NestJS-Inngest E2E Test App')
    .setDescription('API documentation for testing NestJS-Inngest integration')
    .setVersion('1.0')
    .addTag('inngest', 'Inngest function testing endpoints')
    .addTag('health', 'Health check and monitoring endpoints')  
    .addTag('users', 'User management endpoints')
    .addTag('test', 'Test endpoints for function triggers')
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    customSiteTitle: 'NestJS-Inngest API Docs',
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = process.env.PORT || 3001;
  
  await app.listen(port);
  
  logger.log('Integration Test App is running', {
    url: `http://localhost:${port}`,
    port,
    environment: 'e2e-test'
  });
  logger.log('Inngest Dev Server connection info', {
    url: 'http://localhost:8288',
    status: 'expected-running'
  });  
  logger.log('Inngest functions endpoint available', {
    endpoint: `/api/inngest`,
    fullUrl: `http://localhost:${port}/api/inngest`
  });
  logger.log('API Documentation endpoint available', {
    endpoint: '/docs',
    fullUrl: `http://localhost:${port}/docs`
  });
  
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