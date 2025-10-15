import { Injectable, Logger, Inject, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { INNGEST_MODULE_OPTIONS } from '../constants';
import { InngestModuleOptions } from '../interfaces';

export interface MetricValue {
  value: number;
  timestamp: number;
  labels?: Record<string, string>;
}

export interface Counter extends MetricValue {
  type: 'counter';
}

export interface Gauge extends MetricValue {
  type: 'gauge';
}

export interface Histogram extends MetricValue {
  type: 'histogram';
  buckets?: number[];
}

export type Metric = Counter | Gauge | Histogram;

export interface MetricsCollector {
  name: string;
  description: string;
  type: 'counter' | 'gauge' | 'histogram';
  labels: string[];
  values: MetricValue[];
}

export interface FunctionMetrics {
  functionId: string;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  minExecutionTime: number;
  maxExecutionTime: number;
  lastExecutionTime: number;
  totalExecutionTime: number;
  lastExecuted: number | null;
  errorRate: number;
  recentExecutionTimes: number[];
}

export interface SystemMetrics {
  memory: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
    arrayBuffers: number;
  };
  process: {
    pid: number;
    uptime: number;
    cpuUsage: NodeJS.CpuUsage;
  };
  eventLoop: {
    delay: number;
    utilization: number;
  };
}

@Injectable()
export class InngestMonitoringService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(InngestMonitoringService.name);
  private readonly functionMetrics = new Map<string, FunctionMetrics>();
  private readonly customMetrics = new Map<string, MetricsCollector>();
  private readonly systemMetrics: SystemMetrics = this.initializeSystemMetrics();

  private metricsInterval: NodeJS.Timeout | null = null;
  private eventLoopUtilization: any; // NodeJS 12.19+ feature
  private lastCpuUsage: NodeJS.CpuUsage;

  constructor(
    @Inject(INNGEST_MODULE_OPTIONS)
    private readonly options: InngestModuleOptions,
  ) {
    this.lastCpuUsage = process.cpuUsage();

    // Initialize event loop utilization if available
    if ('performance' in global && 'eventLoopUtilization' in (performance as any)) {
      this.eventLoopUtilization = (performance as any).eventLoopUtilization();
    }
  }

  async onModuleInit() {
    if (this.options.monitoring?.enabled && this.options.monitoring?.collectMetrics) {
      const interval = this.options.monitoring.metricsInterval || 30000;
      this.startMetricsCollection(interval);
      this.logger.log(`Monitoring service started with ${interval}ms collection interval`);
    }
  }

  onModuleDestroy() {
    this.stopMetricsCollection();
  }

  /**
   * Record function execution metrics
   */
  /**
   * Register a discovered function for monitoring
   */
  registerFunction(functionId: string, name?: string, config?: any): void {
    if (!this.functionMetrics.has(functionId)) {
      this.functionMetrics.set(functionId, {
        functionId,
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        averageExecutionTime: 0,
        minExecutionTime: 0,
        maxExecutionTime: 0,
        lastExecutionTime: 0,
        totalExecutionTime: 0,
        lastExecuted: null,
        errorRate: 0,
        recentExecutionTimes: [],
      });

      this.logger.debug(`Registered function for monitoring: ${functionId} (${name || 'unnamed'})`);
    }
  }

  recordFunctionExecution(
    functionId: string,
    executionTime: number,
    success: boolean,
    _error?: Error,
  ): void {
    if (!this.options.monitoring?.collectMetrics) {
      return;
    }

    let metrics = this.functionMetrics.get(functionId);
    if (!metrics) {
      metrics = this.createEmptyFunctionMetrics(functionId);
      this.functionMetrics.set(functionId, metrics);
    }

    // Update execution counts
    metrics.totalExecutions++;
    if (success) {
      metrics.successfulExecutions++;
    } else {
      metrics.failedExecutions++;
    }

    // Update timing metrics
    metrics.totalExecutionTime += executionTime;
    metrics.lastExecutionTime = executionTime;
    metrics.lastExecuted = Date.now();

    // Update min/max timing
    if (metrics.minExecutionTime === 0 || executionTime < metrics.minExecutionTime) {
      metrics.minExecutionTime = executionTime;
    }
    if (executionTime > metrics.maxExecutionTime) {
      metrics.maxExecutionTime = executionTime;
    }

    // Calculate average and error rate
    metrics.averageExecutionTime = metrics.totalExecutionTime / metrics.totalExecutions;
    metrics.errorRate = (metrics.failedExecutions / metrics.totalExecutions) * 100;

    // Keep recent execution times (last 100 executions for percentile calculation)
    metrics.recentExecutionTimes.push(executionTime);
    if (metrics.recentExecutionTimes.length > 100) {
      metrics.recentExecutionTimes.shift();
    }

    this.logger.debug(
      `Function ${functionId} executed in ${executionTime}ms (success: ${success})`,
    );
  }

  /**
   * Get metrics for a specific function
   */
  getFunctionMetrics(functionId: string): FunctionMetrics | null {
    return this.functionMetrics.get(functionId) || null;
  }

  /**
   * Get metrics for all functions
   */
  getAllFunctionMetrics(): Record<string, FunctionMetrics> {
    const result: Record<string, FunctionMetrics> = {};
    for (const [id, metrics] of this.functionMetrics.entries()) {
      result[id] = { ...metrics };
    }
    return result;
  }

  /**
   * Get current system metrics
   */
  getSystemMetrics(): SystemMetrics {
    this.updateSystemMetrics();
    return { ...this.systemMetrics };
  }

  /**
   * Create a custom counter metric
   */
  createCounter(name: string, description: string, labels: string[] = []): void {
    if (this.customMetrics.has(name)) {
      this.logger.warn(`Counter ${name} already exists`);
      return;
    }

    this.customMetrics.set(name, {
      name,
      description,
      type: 'counter',
      labels,
      values: [],
    });

    this.logger.debug(`Created counter metric: ${name}`);
  }

  /**
   * Increment a counter metric
   */
  incrementCounter(name: string, value: number = 1, labels?: Record<string, string>): void {
    const metric = this.customMetrics.get(name);
    if (!metric || metric.type !== 'counter') {
      this.logger.warn(`Counter ${name} not found or wrong type`);
      return;
    }

    // Find existing value with same labels or create new one
    const existingIndex = metric.values.findIndex(
      (v) => JSON.stringify(v.labels || {}) === JSON.stringify(labels || {}),
    );

    if (existingIndex >= 0) {
      metric.values[existingIndex].value += value;
      metric.values[existingIndex].timestamp = Date.now();
    } else {
      metric.values.push({
        value,
        timestamp: Date.now(),
        labels,
      });
    }
  }

  /**
   * Create a gauge metric
   */
  createGauge(name: string, description: string, labels: string[] = []): void {
    if (this.customMetrics.has(name)) {
      this.logger.warn(`Gauge ${name} already exists`);
      return;
    }

    this.customMetrics.set(name, {
      name,
      description,
      type: 'gauge',
      labels,
      values: [],
    });

    this.logger.debug(`Created gauge metric: ${name}`);
  }

  /**
   * Set a gauge metric value
   */
  setGauge(name: string, value: number, labels?: Record<string, string>): void {
    const metric = this.customMetrics.get(name);
    if (!metric || metric.type !== 'gauge') {
      this.logger.warn(`Gauge ${name} not found or wrong type`);
      return;
    }

    // Update or add gauge value
    const existingIndex = metric.values.findIndex(
      (v) => JSON.stringify(v.labels || {}) === JSON.stringify(labels || {}),
    );

    if (existingIndex >= 0) {
      metric.values[existingIndex].value = value;
      metric.values[existingIndex].timestamp = Date.now();
    } else {
      metric.values.push({
        value,
        timestamp: Date.now(),
        labels,
      });
    }
  }

  /**
   * Create a histogram metric
   */
  createHistogram(
    name: string,
    description: string,
    _buckets: number[] = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    labels: string[] = [],
  ): void {
    if (this.customMetrics.has(name)) {
      this.logger.warn(`Histogram ${name} already exists`);
      return;
    }

    this.customMetrics.set(name, {
      name,
      description,
      type: 'histogram',
      labels,
      values: [],
    });

    this.logger.debug(`Created histogram metric: ${name}`);
  }

  /**
   * Observe a value in a histogram
   */
  observeHistogram(name: string, value: number, labels?: Record<string, string>): void {
    const metric = this.customMetrics.get(name);
    if (!metric || metric.type !== 'histogram') {
      this.logger.warn(`Histogram ${name} not found or wrong type`);
      return;
    }

    metric.values.push({
      value,
      timestamp: Date.now(),
      labels,
    });

    // Keep only recent values to prevent memory issues
    if (metric.values.length > 10000) {
      metric.values.splice(0, metric.values.length - 1000);
    }
  }

  /**
   * Get all custom metrics
   */
  getCustomMetrics(): Record<string, MetricsCollector> {
    const result: Record<string, MetricsCollector> = {};
    for (const [name, metric] of this.customMetrics.entries()) {
      result[name] = { ...metric };
    }
    return result;
  }

  /**
   * Get comprehensive metrics summary
   */
  getMetricsSummary(): {
    functions: Record<string, FunctionMetrics>;
    system: SystemMetrics;
    custom: Record<string, MetricsCollector>;
    summary: {
      totalFunctions: number;
      totalExecutions: number;
      totalSuccessful: number;
      totalFailed: number;
      averageErrorRate: number;
      averageExecutionTime: number;
    };
  } {
    const functions = this.getAllFunctionMetrics();
    const system = this.getSystemMetrics();
    const custom = this.getCustomMetrics();

    const totalExecutions = Object.values(functions).reduce((sum, f) => sum + f.totalExecutions, 0);
    const totalSuccessful = Object.values(functions).reduce(
      (sum, f) => sum + f.successfulExecutions,
      0,
    );
    const totalFailed = Object.values(functions).reduce((sum, f) => sum + f.failedExecutions, 0);
    const totalExecutionTime = Object.values(functions).reduce(
      (sum, f) => sum + f.totalExecutionTime,
      0,
    );

    const summary = {
      totalFunctions: Object.keys(functions).length,
      totalExecutions,
      totalSuccessful,
      totalFailed,
      averageErrorRate: totalExecutions > 0 ? (totalFailed / totalExecutions) * 100 : 0,
      averageExecutionTime: totalExecutions > 0 ? totalExecutionTime / totalExecutions : 0,
    };

    return {
      functions,
      system,
      custom,
      summary,
    };
  }

  /**
   * Get metrics formatted for merging with consuming app's Prometheus endpoint
   * Usage: const inngestMetrics = this.inngestMonitoring.getPrometheusMetrics();
   * Then in your /metrics endpoint: res.send(appMetrics + inngestMetrics);
   */
  getPrometheusMetrics(): string {
    const lines: string[] = [];
    const timestamp = Date.now();

    // Function metrics
    lines.push('# HELP inngest_function_executions_total Total number of function executions');
    lines.push('# TYPE inngest_function_executions_total counter');
    for (const [id, metrics] of this.functionMetrics.entries()) {
      lines.push(
        `inngest_function_executions_total{function_id="${id}",result="success"} ${metrics.successfulExecutions} ${timestamp}`,
      );
      lines.push(
        `inngest_function_executions_total{function_id="${id}",result="failure"} ${metrics.failedExecutions} ${timestamp}`,
      );
    }

    lines.push('# HELP inngest_function_execution_duration_seconds Function execution duration');
    lines.push('# TYPE inngest_function_execution_duration_seconds histogram');
    for (const [id, metrics] of this.functionMetrics.entries()) {
      if (metrics.totalExecutions > 0) {
        lines.push(
          `inngest_function_execution_duration_seconds{function_id="${id}"} ${metrics.averageExecutionTime / 1000} ${timestamp}`,
        );
      }
    }

    // System metrics
    lines.push('# HELP inngest_process_memory_bytes Process memory usage in bytes');
    lines.push('# TYPE inngest_process_memory_bytes gauge');
    lines.push(
      `inngest_process_memory_bytes{type="rss"} ${this.systemMetrics.memory.rss} ${timestamp}`,
    );
    lines.push(
      `inngest_process_memory_bytes{type="heap_used"} ${this.systemMetrics.memory.heapUsed} ${timestamp}`,
    );
    lines.push(
      `inngest_process_memory_bytes{type="heap_total"} ${this.systemMetrics.memory.heapTotal} ${timestamp}`,
    );

    // Custom metrics
    for (const [name, metric] of this.customMetrics.entries()) {
      lines.push(`# HELP ${name} ${metric.description}`);
      lines.push(`# TYPE ${name} ${metric.type}`);

      for (const value of metric.values) {
        const labelsStr = value.labels
          ? Object.entries(value.labels)
              .map(([k, v]) => `${k}="${v}"`)
              .join(',')
          : '';
        const metricLine = labelsStr
          ? `${name}{${labelsStr}} ${value.value} ${value.timestamp}`
          : `${name} ${value.value} ${value.timestamp}`;
        lines.push(metricLine);
      }
    }

    return lines.join('\n') + '\n';
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.functionMetrics.clear();
    this.customMetrics.clear();
    this.logger.log('All metrics cleared');
  }

  /**
   * Get simple metrics summary for integration into consuming app's monitoring
   * Usage: const inngestMetrics = this.inngestMonitoring.getSimpleMetrics();
   */
  getSimpleMetrics(): {
    functions: {
      total: number;
      executions: number;
      failures: number;
      avgExecutionTime: number;
      errorRate: number;
    };
    system: {
      memoryUsage: number; // MB
      uptime: number; // ms
      eventLoopDelay: number; // ms
    };
  } {
    const functions = this.getAllFunctionMetrics();
    const system = this.getSystemMetrics();

    const totalExecutions = Object.values(functions).reduce((sum, f) => sum + f.totalExecutions, 0);
    const totalFailures = Object.values(functions).reduce((sum, f) => sum + f.failedExecutions, 0);
    const totalTime = Object.values(functions).reduce((sum, f) => sum + f.totalExecutionTime, 0);

    return {
      functions: {
        total: Object.keys(functions).length,
        executions: totalExecutions,
        failures: totalFailures,
        avgExecutionTime: totalExecutions > 0 ? totalTime / totalExecutions : 0,
        errorRate: totalExecutions > 0 ? (totalFailures / totalExecutions) * 100 : 0,
      },
      system: {
        memoryUsage: Math.round(system.memory.rss / 1024 / 1024), // Convert to MB
        uptime: system.process.uptime * 1000, // Convert to ms
        eventLoopDelay: system.eventLoop.delay,
      },
    };
  }

  /**
   * Get metrics in a format suitable for JSON API responses
   * Usage: return { ...otherData, inngest: this.inngestMonitoring.getApiMetrics() };
   */
  getApiMetrics(): {
    summary: {
      healthy: boolean;
      totalFunctions: number;
      totalExecutions: number;
      errorRate: number;
    };
    functions: Array<{
      id: string;
      executions: number;
      avgDuration: number;
      errorRate: number;
      lastExecuted: string | null;
    }>;
    system: {
      memoryMB: number;
      uptimeMs: number;
    };
  } {
    const functionMetrics = this.getAllFunctionMetrics();
    const systemMetrics = this.getSystemMetrics();

    const totalExecutions = Object.values(functionMetrics).reduce(
      (sum, f) => sum + f.totalExecutions,
      0,
    );
    const totalFailures = Object.values(functionMetrics).reduce(
      (sum, f) => sum + f.failedExecutions,
      0,
    );
    const overallErrorRate = totalExecutions > 0 ? (totalFailures / totalExecutions) * 100 : 0;

    return {
      summary: {
        healthy: overallErrorRate < 5, // Consider healthy if error rate < 5%
        totalFunctions: Object.keys(functionMetrics).length,
        totalExecutions,
        errorRate: overallErrorRate,
      },
      functions: Object.values(functionMetrics).map((f) => ({
        id: f.functionId,
        executions: f.totalExecutions,
        avgDuration: f.averageExecutionTime,
        errorRate: f.errorRate,
        lastExecuted: f.lastExecuted ? new Date(f.lastExecuted).toISOString() : null,
      })),
      system: {
        memoryMB: Math.round(systemMetrics.memory.rss / 1024 / 1024),
        uptimeMs: systemMetrics.process.uptime * 1000,
      },
    };
  }

  private startMetricsCollection(interval: number): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    this.metricsInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, interval);
  }

  private stopMetricsCollection(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
      this.logger.log('Metrics collection stopped');
    }
  }

  private collectSystemMetrics(): void {
    try {
      this.updateSystemMetrics();
      this.logger.debug('System metrics collected');
    } catch (error) {
      this.logger.error(`Failed to collect system metrics: ${error.message}`);
    }
  }

  private updateSystemMetrics(): void {
    const memoryUsage = process.memoryUsage();
    const currentCpuUsage = process.cpuUsage(this.lastCpuUsage);
    this.lastCpuUsage = process.cpuUsage();

    this.systemMetrics.memory = memoryUsage;
    this.systemMetrics.process.uptime = process.uptime();
    this.systemMetrics.process.cpuUsage = currentCpuUsage;

    // Update event loop metrics if available
    if (this.eventLoopUtilization && 'eventLoopUtilization' in (performance as any)) {
      const elu = (performance as any).eventLoopUtilization(this.eventLoopUtilization);
      this.systemMetrics.eventLoop.utilization = elu.utilization;
      this.eventLoopUtilization = elu;
    }

    // Calculate event loop delay (simplified)
    const start = process.hrtime.bigint();
    setImmediate(() => {
      const delay = Number(process.hrtime.bigint() - start) / 1000000; // Convert to ms
      this.systemMetrics.eventLoop.delay = delay;
    });
  }

  private initializeSystemMetrics(): SystemMetrics {
    return {
      memory: process.memoryUsage(),
      process: {
        pid: process.pid,
        uptime: process.uptime(),
        cpuUsage: process.cpuUsage(),
      },
      eventLoop: {
        delay: 0,
        utilization: 0,
      },
    };
  }

  private createEmptyFunctionMetrics(functionId: string): FunctionMetrics {
    return {
      functionId,
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageExecutionTime: 0,
      minExecutionTime: 0,
      maxExecutionTime: 0,
      lastExecutionTime: 0,
      totalExecutionTime: 0,
      lastExecuted: null,
      errorRate: 0,
      recentExecutionTimes: [],
    };
  }
}
