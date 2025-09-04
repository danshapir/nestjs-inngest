import { Controller, Get, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';
import { InngestHealthService } from '../../../../src';

@ApiTags('health')
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    private readonly healthService: HealthService,
    private readonly inngestHealthService: InngestHealthService,
  ) {}

  /**
   * Get current system health status
   */
  @Get()
  @ApiOperation({ summary: 'Get comprehensive system health status' })
  @ApiResponse({ status: 200, description: 'System health status' })
  async getCurrentHealth() {
    this.logger.log('🏥 Getting current health status');
    
    // Demonstrate one-line integration with package health service
    const [systemHealth, inngestHealth] = await Promise.all([
      Promise.resolve(this.healthService.getCurrentHealth()),
      this.inngestHealthService.getHealthStatus(), // One line integration!
    ]);
    
    return {
      success: true,
      system: systemHealth,
      inngest: inngestHealth, // Package health integrated
      timestamp: new Date().toISOString(),
    };
  }

  @Get('inngest')
  @ApiOperation({ summary: 'Get Inngest-specific health status' })
  @ApiResponse({ status: 200, description: 'Inngest health status' })
  async getInngestHealth() {
    this.logger.log('🔧 Getting Inngest health status');
    
    // Direct package health service usage
    const inngestHealth = await this.inngestHealthService.getHealthStatus();
    
    return {
      success: true,
      ...inngestHealth,
    };
  }

  @Get('inngest/detailed')
  @ApiOperation({ summary: 'Get detailed Inngest health check' })
  @ApiResponse({ status: 200, description: 'Detailed Inngest health information' })
  async getDetailedInngestHealth() {
    this.logger.log('🔍 Getting detailed Inngest health');
    
    // Comprehensive health check from package
    const detailedHealth = await this.inngestHealthService.checkHealth();
    
    return {
      success: true,
      health: detailedHealth,
    };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Kubernetes readiness probe' })
  @ApiResponse({ status: 200, description: 'Service readiness status' })
  async getReadiness() {
    this.logger.log('🚀 Readiness check');
    
    // Use package service for readiness
    const isInngestHealthy = await this.inngestHealthService.isHealthy();
    const isSystemReady = this.healthService.isSystemReady();
    
    const ready = isSystemReady && isInngestHealthy;
    
    return {
      ready,
      checks: {
        system: isSystemReady,
        inngest: isInngestHealthy,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get active system alerts
   */
  @Get('alerts')
  @ApiOperation({ summary: 'Get active system alerts' })
  @ApiResponse({ status: 200, description: 'Active system alerts' })
  getActiveAlerts() {
    this.logger.log('⚠️ Getting active alerts');
    const alerts = this.healthService.getActiveAlerts();
    
    return {
      success: true,
      alerts,
      count: alerts.length,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get health history for the specified number of hours
   */
  @Get('history')
  @ApiOperation({ summary: 'Get system health history' })
  @ApiResponse({ status: 200, description: 'System health history for last 24 hours' })
  getHealthHistory() {
    this.logger.log('📊 Getting health history');
    const history = this.healthService.getHealthHistory(24);
    
    return {
      success: true,
      history,
      count: history.length,
      period: '24 hours',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Generate comprehensive health report
   */
  @Get('report')
  @ApiOperation({ summary: 'Generate comprehensive health report' })
  @ApiResponse({ status: 200, description: 'Comprehensive system health report' })
  getHealthReport() {
    this.logger.log('📋 Generating health report');
    const report = this.healthService.generateHealthReport();
    
    return {
      success: true,
      report,
      generatedAt: new Date().toISOString(),
    };
  }

  // Test endpoints moved to dedicated TestController
}