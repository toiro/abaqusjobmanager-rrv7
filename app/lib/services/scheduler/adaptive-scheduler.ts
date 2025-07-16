/**
 * Adaptive Scheduler
 * Dynamic interval scheduler that adapts based on task results and system state
 */

import { BaseScheduler, type SchedulerConfig } from './base-scheduler';
import { getLogger } from '../../core/logger/logger.server';

export interface AdaptiveSchedulerConfig extends SchedulerConfig {
  /** Normal interval between executions in milliseconds */
  normalIntervalMs: number;
  /** Minimum interval (fastest execution rate) in milliseconds */
  minIntervalMs?: number;
  /** Maximum interval (slowest execution rate) in milliseconds */
  maxIntervalMs?: number;
  /** Execute immediately on start (default: false) */
  executeImmediately?: boolean;
  /** Maximum execution time before considering task stuck */
  maxExecutionTime?: number;
}

export interface AdaptiveTaskResult {
  /** Success/failure of the task */
  success: boolean;
  /** Optional suggested next interval in milliseconds */
  suggestedNextInterval?: number;
  /** Optional metadata about the task execution */
  metadata?: Record<string, unknown>;
  /** Error information if task failed */
  error?: Error;
}

export type AdaptiveTaskFunction = () => Promise<AdaptiveTaskResult>;

/**
 * Adaptive scheduler that changes intervals based on task results
 * Perfect for health checks, monitoring, and dynamic load management
 */
export class AdaptiveScheduler extends BaseScheduler {
  protected config: Required<AdaptiveSchedulerConfig>;
  private timeoutId?: NodeJS.Timeout;
  private currentInterval: number;
  private consecutiveSuccesses: number = 0;
  private consecutiveFailures: number = 0;

  constructor(
    config: AdaptiveSchedulerConfig,
    private taskFunction: AdaptiveTaskFunction
  ) {
    super(config);
    
    this.config = {
      minIntervalMs: config.minIntervalMs ?? Math.floor(config.normalIntervalMs * 0.1),
      maxIntervalMs: config.maxIntervalMs ?? config.normalIntervalMs * 10,
      executeImmediately: config.executeImmediately ?? false,
      maxExecutionTime: config.maxExecutionTime ?? (5 * config.normalIntervalMs),
      enabled: config.enabled ?? true,
      autoStart: config.autoStart ?? true,
      shutdownTimeout: config.shutdownTimeout ?? 30000,
      ...config
    };

    this.currentInterval = this.config.normalIntervalMs;
  }

  protected doStart(): void {
    // Execute immediately if requested
    if (this.config.executeImmediately) {
      this.scheduleExecution(0);
    } else {
      this.scheduleExecution(this.currentInterval);
    }
  }

  protected async doStop(): Promise<void> {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = undefined;
    }
  }

  protected async doCleanup(): Promise<void> {
    // Reset state
    this.consecutiveSuccesses = 0;
    this.consecutiveFailures = 0;
    this.currentInterval = this.config.normalIntervalMs;
  }

  protected getNextExecutionTime(): Date | undefined {
    if (!this.isActive || !this.timeoutId) return undefined;
    
    const lastExecution = this.stats.lastExecutionTime || new Date();
    return new Date(lastExecution.getTime() + this.currentInterval);
  }

  protected async handleTaskError(error: unknown): Promise<void> {
    // Adaptive schedulers handle errors through task results
    getLogger().error(`Adaptive scheduler task error: ${this.config.name}`, 'AdaptiveScheduler', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  /**
   * Schedule the next execution
   */
  private scheduleExecution(delay: number): void {
    if (!this.isActive) return;

    this.timeoutId = setTimeout(async () => {
      if (!this.isActive) return;

      try {
        // Execute the adaptive task
        await this.executeAdaptiveTask();

        // Schedule next execution with adapted interval
        this.scheduleExecution(this.currentInterval);
        
      } catch (error) {
        getLogger().error(`Adaptive scheduler execution error: ${this.config.name}`, 'AdaptiveScheduler', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        // Treat as failure and continue scheduling
        this.handleTaskResult({ success: false, error: error as Error });
        this.scheduleExecution(this.currentInterval);
      }
    }, delay) as NodeJS.Timeout;
  }

  /**
   * Execute the adaptive task and handle results
   */
  private async executeAdaptiveTask(): Promise<void> {
    await this.executeTask(async () => {
      try {
        const result = await this.taskFunction();
        this.handleTaskResult(result);
      } catch (error) {
        // Convert thrown errors to task results
        this.handleTaskResult({ 
          success: false, 
          error: error instanceof Error ? error : new Error('Unknown error') 
        });
      }
    });
  }

  /**
   * Handle task result and adapt scheduling
   */
  private handleTaskResult(result: AdaptiveTaskResult): void {
    if (result.success) {
      this.consecutiveSuccesses++;
      this.consecutiveFailures = 0;
      
      getLogger().debug(`Adaptive task succeeded: ${this.config.name}`, 'AdaptiveScheduler', {
        consecutiveSuccesses: this.consecutiveSuccesses,
        currentInterval: this.currentInterval
      });
    } else {
      this.consecutiveFailures++;
      this.consecutiveSuccesses = 0;
      
      getLogger().warn(`Adaptive task failed: ${this.config.name}`, 'AdaptiveScheduler', {
        consecutiveFailures: this.consecutiveFailures,
        currentInterval: this.currentInterval,
        error: result.error?.message
      });
    }

    // Adapt interval based on results
    this.adaptInterval(result);
  }

  /**
   * Adapt the interval based on task results
   */
  private adaptInterval(result: AdaptiveTaskResult): void {
    const oldInterval = this.currentInterval;

    // Use suggested interval if provided
    if (result.suggestedNextInterval) {
      this.currentInterval = this.clampInterval(result.suggestedNextInterval);
    } else {
      // Default adaptation logic
      if (result.success) {
        this.adaptForSuccess();
      } else {
        this.adaptForFailure();
      }
    }

    // Log interval changes
    if (this.currentInterval !== oldInterval) {
      getLogger().info(`Adaptive interval changed: ${this.config.name}`, 'AdaptiveScheduler', {
        oldInterval: oldInterval,
        newInterval: this.currentInterval,
        consecutiveSuccesses: this.consecutiveSuccesses,
        consecutiveFailures: this.consecutiveFailures
      });
    }
  }

  /**
   * Adapt interval for successful executions
   */
  private adaptForSuccess(): void {
    // After multiple successes, can reduce interval (check more frequently)
    if (this.consecutiveSuccesses >= 5) {
      this.currentInterval = this.clampInterval(this.currentInterval * 0.8);
    } else if (this.consecutiveSuccesses >= 10) {
      this.currentInterval = this.clampInterval(this.currentInterval * 0.6);
    }
  }

  /**
   * Adapt interval for failed executions
   */
  private adaptForFailure(): void {
    // After failures, increase interval (back off)
    if (this.consecutiveFailures === 1) {
      this.currentInterval = this.clampInterval(this.currentInterval * 1.5);
    } else if (this.consecutiveFailures >= 3) {
      this.currentInterval = this.clampInterval(this.currentInterval * 2);
    } else if (this.consecutiveFailures >= 5) {
      this.currentInterval = this.clampInterval(this.currentInterval * 3);
    }
  }

  /**
   * Clamp interval to configured bounds
   */
  private clampInterval(interval: number): number {
    return Math.max(
      this.config.minIntervalMs,
      Math.min(this.config.maxIntervalMs, interval)
    );
  }

  /**
   * Get scheduler-specific health metrics
   */
  protected getHealthMetrics(): Record<string, unknown> {
    const baseMetrics = super.getHealthMetrics();
    
    return {
      ...baseMetrics,
      normalIntervalMs: this.config.normalIntervalMs,
      currentIntervalMs: this.currentInterval,
      minIntervalMs: this.config.minIntervalMs,
      maxIntervalMs: this.config.maxIntervalMs,
      consecutiveSuccesses: this.consecutiveSuccesses,
      consecutiveFailures: this.consecutiveFailures,
      isScheduled: this.timeoutId !== undefined,
      nextExecutionInMs: this.getNextExecutionTime() ? 
        Math.max(0, this.getNextExecutionTime()!.getTime() - Date.now()) : undefined
    };
  }
}

/**
 * Factory function for creating adaptive schedulers
 */
export function createAdaptiveScheduler(
  name: string,
  normalIntervalMs: number,
  taskFunction: AdaptiveTaskFunction,
  options: Partial<AdaptiveSchedulerConfig> = {}
): AdaptiveScheduler {
  return new AdaptiveScheduler(
    {
      name,
      normalIntervalMs,
      ...options
    },
    taskFunction
  );
}

/**
 * Factory function for creating health check schedulers
 */
export function createHealthCheckScheduler(
  name: string,
  healthCheckFunction: () => Promise<{ success: boolean; details?: any }>,
  normalIntervalMinutes: number = 5
): AdaptiveScheduler {
  return createAdaptiveScheduler(
    name,
    normalIntervalMinutes * 60 * 1000,
    async () => {
      try {
        const result = await healthCheckFunction();
        return {
          success: result.success,
          metadata: result.details
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error : new Error('Health check failed')
        };
      }
    },
    {
      minIntervalMs: 30 * 1000,     // 30 seconds min
      maxIntervalMs: 30 * 60 * 1000, // 30 minutes max
      maxExecutionTime: 60 * 1000   // 1 minute max execution
    }
  );
}