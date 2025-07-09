/**
 * Scheduler Monitor
 * Monitoring and reporting utilities for scheduler health
 */

import { SchedulerRegistry, type SchedulerHealth } from './base-scheduler';
import { getLogger } from '../../core/logger';
import { createIntervalScheduler } from './interval-scheduler';

export interface SchedulerMonitorConfig {
  /** Monitor name */
  name?: string;
  /** Check interval in minutes (default: 5) */
  checkIntervalMinutes?: number;
  /** Enable detailed logging (default: false) */
  detailedLogging?: boolean;
  /** Alert thresholds */
  alertThresholds?: {
    /** Error rate threshold (0-1) for degraded status */
    errorRateThreshold?: number;
    /** Error rate threshold (0-1) for unhealthy status */
    criticalErrorRateThreshold?: number;
    /** Max execution time in ms before alert */
    maxExecutionTimeMs?: number;
  };
  /** Custom alert handlers */
  alertHandlers?: {
    onDegraded?: (scheduler: SchedulerHealth) => void;
    onUnhealthy?: (scheduler: SchedulerHealth) => void;
    onRecovered?: (scheduler: SchedulerHealth) => void;
  };
}

export interface SchedulerMonitorReport {
  timestamp: Date;
  totalSchedulers: number;
  healthySchedulers: number;
  degradedSchedulers: number;
  unhealthySchedulers: number;
  stoppedSchedulers: number;
  schedulerDetails: SchedulerHealth[];
  alerts: Array<{
    schedulerName: string;
    severity: 'warning' | 'error';
    message: string;
    timestamp: Date;
  }>;
}

/**
 * Monitor scheduler health and generate reports
 */
export class SchedulerMonitor {
  private monitor: ReturnType<typeof createIntervalScheduler>;
  private config: Required<SchedulerMonitorConfig>;
  private lastHealthStates: Map<string, SchedulerHealth['status']> = new Map();

  constructor(config: SchedulerMonitorConfig = {}) {
    this.config = {
      name: config.name ?? 'scheduler-monitor',
      checkIntervalMinutes: config.checkIntervalMinutes ?? 5,
      detailedLogging: config.detailedLogging ?? false,
      alertThresholds: {
        errorRateThreshold: 0.1,
        criticalErrorRateThreshold: 0.5,
        maxExecutionTimeMs: 60000,
        ...config.alertThresholds
      },
      alertHandlers: config.alertHandlers ?? {}
    };

    // Create monitoring scheduler
    this.monitor = createIntervalScheduler(
      this.config.name,
      this.config.checkIntervalMinutes * 60 * 1000,
      async () => {
        await this.performHealthCheck();
      },
      {
        executeImmediately: true,
        maxExecutionTime: 30000 // 30 seconds max for monitoring
      }
    );
  }

  /**
   * Start monitoring
   */
  public start(): void {
    this.monitor.start();
    getLogger().info(`Scheduler monitor started: ${this.config.name}`, 'SchedulerMonitor', {
      checkIntervalMinutes: this.config.checkIntervalMinutes
    });
  }

  /**
   * Stop monitoring
   */
  public async stop(): Promise<void> {
    await this.monitor.stop();
    getLogger().info(`Scheduler monitor stopped: ${this.config.name}`, 'SchedulerMonitor');
  }

  /**
   * Get current monitor status
   */
  public getStatus() {
    return {
      isRunning: this.monitor.isRunning(),
      config: this.config,
      lastReport: this.generateReport()
    };
  }

  /**
   * Generate comprehensive health report
   */
  public generateReport(): SchedulerMonitorReport {
    const schedulers = SchedulerRegistry.getAll();
    const healthStatuses = schedulers.map(s => s.getHealth());
    const overallStats = SchedulerRegistry.getOverallStats();

    const alerts: SchedulerMonitorReport['alerts'] = [];

    // Check for alerts
    healthStatuses.forEach(health => {
      const alerts_for_scheduler = this.checkForAlerts(health);
      alerts.push(...alerts_for_scheduler);
    });

    return {
      timestamp: new Date(),
      totalSchedulers: overallStats.totalSchedulers,
      healthySchedulers: overallStats.healthySchedulers,
      degradedSchedulers: overallStats.degradedSchedulers,
      unhealthySchedulers: overallStats.unhealthySchedulers,
      stoppedSchedulers: overallStats.stoppedSchedulers,
      schedulerDetails: healthStatuses,
      alerts
    };
  }

  /**
   * Perform health check and generate report
   */
  private async performHealthCheck(): Promise<void> {
    const report = this.generateReport();

    // Log summary
    getLogger().info(`Scheduler health check: ${this.config.name}`, 'SchedulerMonitor', {
      totalSchedulers: report.totalSchedulers,
      healthySchedulers: report.healthySchedulers,
      degradedSchedulers: report.degradedSchedulers,
      unhealthySchedulers: report.unhealthySchedulers,
      stoppedSchedulers: report.stoppedSchedulers,
      alertCount: report.alerts.length
    });

    // Log detailed information if enabled
    if (this.config.detailedLogging) {
      report.schedulerDetails.forEach(health => {
        getLogger().debug(`Scheduler status: ${health.name}`, 'SchedulerMonitor', {
          status: health.status,
          message: health.message,
          metrics: health.metrics
        });
      });
    }

    // Log alerts
    report.alerts.forEach(alert => {
      if (alert.severity === 'error') {
        getLogger().error(`Scheduler alert: ${alert.message}`, 'SchedulerMonitor', {
          schedulerName: alert.schedulerName,
          severity: alert.severity
        });
      } else {
        getLogger().warn(`Scheduler alert: ${alert.message}`, 'SchedulerMonitor', {
          schedulerName: alert.schedulerName,
          severity: alert.severity
        });
      }
    });

    // Handle status changes
    this.handleStatusChanges(report.schedulerDetails);
  }

  /**
   * Check for alert conditions
   */
  private checkForAlerts(health: SchedulerHealth): SchedulerMonitorReport['alerts'] {
    const alerts: SchedulerMonitorReport['alerts'] = [];

    // Check error rate
    if (health.metrics?.errorRate !== undefined) {
      const errorRate = health.metrics.errorRate;
      
      if (typeof errorRate === 'number' && errorRate >= (this.config.alertThresholds.criticalErrorRateThreshold ?? 0.5)) {
        alerts.push({
          schedulerName: health.name,
          severity: 'error',
          message: `Critical error rate: ${(errorRate * 100).toFixed(1)}%`,
          timestamp: new Date()
        });
      } else if (typeof errorRate === 'number' && errorRate >= (this.config.alertThresholds.errorRateThreshold ?? 0.1)) {
        alerts.push({
          schedulerName: health.name,
          severity: 'warning',
          message: `High error rate: ${(errorRate * 100).toFixed(1)}%`,
          timestamp: new Date()
        });
      }
    }

    // Check long-running executions
    if (health.metrics?.isCurrentlyExecuting && health.metrics?.currentExecutionStart) {
      const currentExecutionStart = health.metrics.currentExecutionStart;
      const executionTime = typeof currentExecutionStart === 'string' || typeof currentExecutionStart === 'number' 
        ? Date.now() - new Date(currentExecutionStart).getTime() 
        : 0;
      
      if (executionTime > (this.config.alertThresholds.maxExecutionTimeMs ?? 60000)) {
        alerts.push({
          schedulerName: health.name,
          severity: 'warning',
          message: `Long-running execution: ${Math.round(executionTime / 1000)}s`,
          timestamp: new Date()
        });
      }
    }

    // Check stopped schedulers
    if (health.status === 'stopped') {
      alerts.push({
        schedulerName: health.name,
        severity: 'warning',
        message: 'Scheduler is stopped',
        timestamp: new Date()
      });
    }

    return alerts;
  }

  /**
   * Handle status changes and trigger alerts
   */
  private handleStatusChanges(currentHealths: SchedulerHealth[]): void {
    currentHealths.forEach(health => {
      const previousStatus = this.lastHealthStates.get(health.name);
      const currentStatus = health.status;

      // Update stored state
      this.lastHealthStates.set(health.name, currentStatus);

      // Check for status changes
      if (previousStatus && previousStatus !== currentStatus) {
        getLogger().info(`Scheduler status changed: ${health.name}`, 'SchedulerMonitor', {
          previousStatus,
          currentStatus,
          message: health.message
        });

        // Trigger custom alert handlers
        if (currentStatus === 'degraded' && this.config.alertHandlers.onDegraded) {
          this.config.alertHandlers.onDegraded(health);
        } else if (currentStatus === 'unhealthy' && this.config.alertHandlers.onUnhealthy) {
          this.config.alertHandlers.onUnhealthy(health);
        } else if (currentStatus === 'healthy' && previousStatus !== 'healthy' && this.config.alertHandlers.onRecovered) {
          this.config.alertHandlers.onRecovered(health);
        }
      }
    });
  }
}

/**
 * Factory function for creating scheduler monitors
 */
export function createSchedulerMonitor(config: SchedulerMonitorConfig = {}): SchedulerMonitor {
  return new SchedulerMonitor(config);
}

/**
 * Create and auto-start a basic scheduler monitor
 */
export function createBasicSchedulerMonitor(): SchedulerMonitor {
  const monitor = createSchedulerMonitor({
    name: 'basic-scheduler-monitor',
    checkIntervalMinutes: 5,
    detailedLogging: process.env.NODE_ENV === 'development'
  });
  
  monitor.start();
  return monitor;
}