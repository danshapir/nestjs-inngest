# NestJS-Inngest Integration Guide

## Service-First Architecture

The NestJS-Inngest package is designed as a **service-first npm package**. This means it provides powerful services that you can easily integrate into your existing NestJS application without creating conflicting HTTP endpoints.

## Quick Start

### 1. Installation & Module Setup

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { InngestModule } from '@torixtv/nestjs-inngest';

@Module({
  imports: [
    InngestModule.forRoot({
      id: 'my-app',
      environment: process.env.NODE_ENV,
      eventKey: process.env.INNGEST_EVENT_KEY, // Required in production
      monitoring: { enabled: true },
      health: { enabled: true },
    }),
  ],
})
export class AppModule {}
```

### 2. Inject Services in Your Controllers

The package exports three main services for integration:

```typescript
import { 
  InngestService,           // Core Inngest functionality
  InngestHealthService,     // Health check integration  
  InngestMonitoringService  // Metrics integration
} from 'nestjs-inngest';
```

## Health Check Integration

### One-Line Health Integration

```typescript
// health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { InngestHealthService } from '@torixtv/nestjs-inngest';

@Controller('health')
export class HealthController {
  constructor(
    private readonly healthService: MyHealthService,
    private readonly inngestHealthService: InngestHealthService,
  ) {}

  @Get()
  async getHealth() {
    const systemHealth = await this.healthService.check();
    const inngestHealth = await this.inngestHealthService.getHealthStatus(); // One line!
    
    return {
      ...systemHealth,
      inngest: inngestHealth,
    };
  }

  @Get('ready')
  async readiness() {
    const isReady = await this.healthService.isReady();
    const inngestReady = await this.inngestHealthService.isHealthy(); // Simple boolean
    
    return {
      ready: isReady && inngestReady,
      services: {
        app: isReady,
        inngest: inngestReady,
      },
    };
  }
}
```

### Response Format

The `getHealthStatus()` method returns:

```json
{
  "status": "healthy",
  "message": "Inngest integration is healthy",
  "functions": {
    "total": 5,
    "registered": 5
  },
  "connectivity": true,
  "uptime": 1234567,
  "timestamp": "2025-09-02T11:30:00.000Z"
}
```

## Prometheus Metrics Integration

### One-Line Prometheus Integration

```typescript
// metrics.controller.ts
import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { InngestMonitoringService } from '@torixtv/nestjs-inngest';

@Controller('metrics')
export class MetricsController {
  constructor(
    private readonly prometheusService: MyPrometheusService,
    private readonly inngestMonitoring: InngestMonitoringService,
  ) {}

  @Get()
  async getMetrics(@Res() res: Response) {
    // Get your app's metrics
    const appMetrics = await this.prometheusService.getMetrics();
    
    // Get Inngest metrics in Prometheus format
    const inngestMetrics = this.inngestMonitoring.getPrometheusMetrics(); // One line!
    
    res.set('Content-Type', 'text/plain');
    res.send(appMetrics + inngestMetrics);
  }
}
```

### JSON API Metrics Integration

For JSON API responses:

```typescript
@Get('api/metrics')
async getApiMetrics() {
  const systemMetrics = await this.metricsService.getSystemMetrics();
  const inngestMetrics = this.inngestMonitoring.getApiMetrics(); // One line!
  
  return {
    timestamp: new Date().toISOString(),
    system: systemMetrics,
    inngest: inngestMetrics,
  };
}
```

### Simple Metrics Summary

For dashboard integration:

```typescript
@Get('dashboard/stats')
async getDashboardStats() {
  const appStats = await this.statsService.getStats();
  const inngestStats = this.inngestMonitoring.getSimpleMetrics(); // One line!
  
  return {
    ...appStats,
    inngest: inngestStats,
  };
}
```

## Available Integration Methods

### Health Service Methods

```typescript
// Simple health status for integration
await inngestHealthService.getHealthStatus(): Promise<InngestHealthStatus>

// Boolean health check
await inngestHealthService.isHealthy(): Promise<boolean>

// Comprehensive health check (advanced)
await inngestHealthService.checkHealth(): Promise<SystemHealth>

// Get health metrics
inngestHealthService.getMetrics(): Record<string, any>
```

### Monitoring Service Methods

```typescript
// Prometheus format for /metrics endpoint
inngestMonitoring.getPrometheusMetrics(): string

// JSON format for API responses  
inngestMonitoring.getApiMetrics(): ApiMetricsResponse

// Simple summary for dashboards
inngestMonitoring.getSimpleMetrics(): SimpleMetricsResponse

// Detailed metrics (advanced)
inngestMonitoring.getMetricsSummary(): ComprehensiveMetrics
```

## Configuration Options

### Basic Configuration

```typescript
InngestModule.forRoot({
  id: 'my-app',
  eventKey: process.env.INNGEST_EVENT_KEY,
  monitoring: {
    enabled: true,
    collectMetrics: true,
    metricsInterval: 30000, // 30 seconds
  },
  health: {
    enabled: true,
  },
})
```

### Production Configuration

```typescript
InngestModule.forRoot({
  id: 'my-app',
  environment: 'production',
  eventKey: process.env.INNGEST_EVENT_KEY,
  signingKey: process.env.INNGEST_SIGNING_KEY,
  monitoring: {
    enabled: true,
    collectMetrics: true,
    metricsInterval: 60000, // 1 minute in production
  },
  health: {
    enabled: true,
    includeSystemMetrics: true,
  },
  security: {
    validateSignatures: true,
    validateEventPayloads: true,
  },
})
```

## Integration Examples

### Kubernetes Health Checks

```typescript
// k8s-health.controller.ts
@Controller('health')
export class K8sHealthController {
  constructor(private readonly inngestHealth: InngestHealthService) {}

  @Get('live')
  async liveness() {
    // Simple liveness check
    const isAlive = await this.inngestHealth.isHealthy();
    return { alive: isAlive };
  }

  @Get('ready')
  async readiness() {
    // More comprehensive readiness check
    const status = await this.inngestHealth.getHealthStatus();
    return {
      ready: status.status === 'healthy',
      details: status,
    };
  }
}
```

### Monitoring Dashboard Integration

```typescript
// dashboard.controller.ts
@Controller('api/dashboard')
export class DashboardController {
  constructor(
    private readonly inngestMonitoring: InngestMonitoringService,
    private readonly inngestHealth: InngestHealthService,
  ) {}

  @Get('status')
  async getStatus() {
    const [health, metrics] = await Promise.all([
      this.inngestHealth.getHealthStatus(),
      this.inngestMonitoring.getSimpleMetrics(),
    ]);

    return {
      inngest: {
        status: health.status,
        functions: health.functions,
        performance: {
          executions: metrics.functions.executions,
          errorRate: metrics.functions.errorRate,
          avgDuration: metrics.functions.avgExecutionTime,
        },
        system: {
          memory: metrics.system.memoryUsage,
          uptime: metrics.system.uptime,
        },
      },
    };
  }
}
```

### Custom Metrics Integration

```typescript
// custom-metrics.service.ts
@Injectable()
export class CustomMetricsService {
  constructor(private readonly inngestMonitoring: InngestMonitoringService) {}

  async getApplicationMetrics() {
    // Get Inngest function metrics
    const functionMetrics = this.inngestMonitoring.getAllFunctionMetrics();
    
    // Process for your custom format
    return Object.entries(functionMetrics).map(([id, metrics]) => ({
      functionId: id,
      health: metrics.errorRate < 5 ? 'healthy' : 'unhealthy',
      performance: {
        executions: metrics.totalExecutions,
        avgDuration: Math.round(metrics.averageExecutionTime),
        successRate: ((metrics.totalExecutions - metrics.failedExecutions) / metrics.totalExecutions) * 100,
      },
    }));
  }
}
```

## Advanced Integration Patterns

### Async Module Configuration

```typescript
// async-config.module.ts
InngestModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (configService: ConfigService) => ({
    id: configService.get('APP_NAME'),
    eventKey: configService.get('INNGEST_EVENT_KEY'),
    monitoring: {
      enabled: configService.get('MONITORING_ENABLED', true),
      metricsInterval: configService.get('METRICS_INTERVAL', 30000),
    },
  }),
  inject: [ConfigService],
})
```

### Service Composition

```typescript
// monitoring.service.ts
@Injectable()
export class AppMonitoringService {
  constructor(private readonly inngestMonitoring: InngestMonitoringService) {}

  async getComprehensiveMetrics() {
    const inngestMetrics = this.inngestMonitoring.getApiMetrics();
    const customMetrics = await this.getCustomMetrics();
    
    return {
      ...customMetrics,
      backgroundJobs: inngestMetrics,
    };
  }
}
```

## Best Practices

### 1. **Health Check Strategy**
- Use `isHealthy()` for simple boolean checks
- Use `getHealthStatus()` for detailed health information
- Implement both liveness and readiness probes in Kubernetes

### 2. **Metrics Integration**
- Use `getPrometheusMetrics()` for standard Prometheus endpoints
- Use `getApiMetrics()` for JSON APIs and dashboards
- Use `getSimpleMetrics()` for lightweight monitoring

### 3. **Performance Considerations**
- Configure appropriate `metricsInterval` based on your needs
- Use caching for frequently accessed metrics
- Monitor the monitoring system's overhead

### 4. **Error Handling**
- Always handle service injection failures gracefully
- Implement fallback responses when services are unavailable
- Log integration errors for debugging

## Troubleshooting

### Common Issues

1. **Services not injectable**: Ensure `InngestModule` is properly imported
2. **Health checks failing**: Verify Inngest connectivity and configuration
3. **Missing metrics**: Check that monitoring is enabled in configuration
4. **Performance impact**: Adjust `metricsInterval` for your use case

### Debugging

```typescript
// Enable debug logging
InngestModule.forRoot({
  // ... your config
  logging: {
    level: 'debug',
    enableStructuredLogging: true,
  },
})
```

## Summary

The service-first architecture provides:

- ✅ **Zero routing conflicts** - No HTTP endpoints created by the package
- ✅ **One-line integration** - Simple methods for common use cases  
- ✅ **Flexible integration** - Multiple integration patterns available
- ✅ **Production-ready** - Comprehensive monitoring and health checks
- ✅ **Enterprise-friendly** - Works with existing infrastructure

Choose the integration method that best fits your application architecture and monitoring requirements.