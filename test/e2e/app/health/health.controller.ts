import { Controller, Get, Post, Body, Logger } from '@nestjs/common';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly healthService: HealthService) {}

  /**
   * Get current system health status
   */
  @Get()
  getCurrentHealth() {
    this.logger.log('🏥 Getting current health status');
    return {
      success: true,
      ...this.healthService.getCurrentHealth(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get active system alerts
   */
  @Get('alerts')
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