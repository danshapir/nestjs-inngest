import { Controller, Get, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { InngestMonitoringService } from '../../../../src';

@ApiTags('monitoring')
@Controller('monitoring')
export class MonitoringController {
  constructor(private readonly inngestMonitoring: InngestMonitoringService) {}

  // Removed monitoring/health endpoint - use /api/health for health status instead

  @Get('metrics')
  @ApiOperation({ summary: 'Get all metrics in JSON format' })
  @ApiResponse({ status: 200, description: 'Returns comprehensive metrics' })
  getMetrics() {
    // Demonstrate the one-line integration pattern
    const inngestMetrics = this.inngestMonitoring.getApiMetrics();
    
    return {
      timestamp: new Date().toISOString(),
      service: 'E2E Test App',
      inngest: inngestMetrics,
    };
  }

  @Get('metrics/simple')
  @ApiOperation({ summary: 'Get simple metrics summary' })
  @ApiResponse({ status: 200, description: 'Returns simple metrics for dashboards' })
  getSimpleMetrics() {
    // Demonstrate simple metrics integration
    const inngestMetrics = this.inngestMonitoring.getSimpleMetrics();
    
    return {
      timestamp: new Date().toISOString(),
      inngest: inngestMetrics,
    };
  }

  @Get('prometheus')
  @ApiOperation({ summary: 'Get Prometheus formatted metrics' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns metrics in Prometheus format',
    content: {
      'text/plain': {
        schema: { type: 'string' }
      }
    }
  })
  getPrometheusMetrics(@Res() res: Response) {
    // Demonstrate Prometheus integration pattern
    const appMetrics = '# HELP app_info Application information\napp_info{version="1.0.0"} 1\n';
    const inngestMetrics = this.inngestMonitoring.getPrometheusMetrics();
    
    res.set('Content-Type', 'text/plain');
    res.send(appMetrics + inngestMetrics);
  }

  @Get('functions')
  @ApiOperation({ summary: 'Get function-specific metrics' })
  @ApiResponse({ status: 200, description: 'Returns function execution metrics' })
  getFunctionMetrics() {
    return this.inngestMonitoring.getAllFunctionMetrics();
  }

  @Get('system')
  @ApiOperation({ summary: 'Get system metrics' })
  @ApiResponse({ status: 200, description: 'Returns system resource metrics' })
  getSystemMetrics() {
    return this.inngestMonitoring.getSystemMetrics();
  }
}