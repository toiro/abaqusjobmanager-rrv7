/**
 * Interval Scheduler
 * Simple periodic task scheduler for fixed-interval tasks
 */

import { BaseScheduler, type SchedulerConfig } from './base-scheduler';
import { getLogger } from '../../core/logger/logger.server';

export interface IntervalSchedulerConfig extends SchedulerConfig {
  /** Interval between executions in milliseconds */
  intervalMs: number;
  /** Execute immediately on start (default: false) */
  executeImmediately?: boolean;
  /** Maximum execution time before considering task stuck (default: 5 * intervalMs) */
  maxExecutionTime?: number;
}

/**
 * Simple interval-based scheduler
 * Perfect for cleanup tasks, periodic maintenance, health checks
 */
export class IntervalScheduler extends BaseScheduler {
  protected config: Required<IntervalSchedulerConfig>;
  private intervalId?: NodeJS.Timeout;
  private executionStartTime?: Date;

  constructor(
    config: IntervalSchedulerConfig,
    private taskFunction: () => Promise<void>
  ) {
    super(config);
    
    this.config = {
      executeImmediately: config.executeImmediately ?? false,
      maxExecutionTime: config.maxExecutionTime ?? (5 * config.intervalMs),
      enabled: config.enabled ?? true,
      autoStart: config.autoStart ?? true,
      shutdownTimeout: config.shutdownTimeout ?? 30000,
      ...config
    };
  }

  protected doStart(): void {
    // Execute immediately if requested
    if (this.config.executeImmediately) {
      this.scheduleExecution(0);
    } else {
      this.scheduleExecution(this.config.intervalMs);
    }
  }

  protected async doStop(): Promise<void> {
    if (this.intervalId) {
      clearTimeout(this.intervalId);
      this.intervalId = undefined;
    }
  }

  protected async doCleanup(): Promise<void> {
    // Nothing specific to cleanup for interval scheduler
  }

  protected getNextExecutionTime(): Date | undefined {
    if (!this.isActive || !this.intervalId) return undefined;
    
    const lastExecution = this.stats.lastExecutionTime || new Date();
    return new Date(lastExecution.getTime() + this.config.intervalMs);
  }

  protected async handleTaskError(error: unknown): Promise<void> {
    // Log error and continue with normal scheduling
    getLogger().error(`Interval scheduler task error: ${this.config.name}`, 'IntervalScheduler', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  /**
   * Schedule the next execution
   */
  private scheduleExecution(delay: number): void {
    if (!this.isActive) return;

    this.intervalId = setTimeout(async () => {
      if (!this.isActive) return;

      try {
        // Check for stuck executions
        this.checkForStuckExecution();

        // Execute the task
        await this.executeTask(this.taskFunction);

        // Schedule next execution
        this.scheduleExecution(this.config.intervalMs);
        
      } catch (error) {
        getLogger().error(`Interval scheduler execution error: ${this.config.name}`, 'IntervalScheduler', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        // Continue scheduling even after errors
        this.scheduleExecution(this.config.intervalMs);
      }
    }, delay) as NodeJS.Timeout;
  }

  /**
   * Check for stuck executions and log warnings
   */
  private checkForStuckExecution(): void {
    if (this.stats.lastExecutionTime) {
      const executionTime = Date.now() - this.stats.lastExecutionTime.getTime();
      
      if (executionTime > this.config.maxExecutionTime) {
        getLogger().warn(`Potentially stuck execution detected: ${this.config.name}`, 'IntervalScheduler', {
          executionTimeMs: executionTime,
          maxExecutionTimeMs: this.config.maxExecutionTime
        });
      }
    }
  }

  /**
   * Get scheduler-specific health metrics
   */
  protected getHealthMetrics(): Record<string, unknown> {
    const baseMetrics = super.getHealthMetrics();
    
    return {
      ...baseMetrics,
      intervalMs: this.config.intervalMs,
      executeImmediately: this.config.executeImmediately,
      maxExecutionTimeMs: this.config.maxExecutionTime,
      isScheduled: this.intervalId !== undefined,
      nextExecutionInMs: this.getNextExecutionTime() ? 
        Math.max(0, this.getNextExecutionTime()!.getTime() - Date.now()) : undefined
    };
  }
}

/**
 * Factory function for creating interval schedulers
 */
export function createIntervalScheduler(
  name: string,
  intervalMs: number,
  taskFunction: () => Promise<void>,
  options: Partial<IntervalSchedulerConfig> = {}
): IntervalScheduler {
  return new IntervalScheduler(
    {
      name,
      intervalMs,
      ...options
    },
    taskFunction
  );
}

/**
 * Factory function for creating simple cleanup schedulers
 */
export function createCleanupScheduler(
  name: string,
  cleanupFunction: () => Promise<void>,
  intervalMinutes: number = 5
): IntervalScheduler {
  return createIntervalScheduler(
    name,
    intervalMinutes * 60 * 1000,
    cleanupFunction,
    {
      executeImmediately: false,
      maxExecutionTime: 30000 // 30 seconds max for cleanup
    }
  );
}