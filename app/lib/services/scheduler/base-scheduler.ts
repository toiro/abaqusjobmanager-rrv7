/**
 * Base Scheduler Foundation
 * Common infrastructure for all scheduled server-side tasks
 */

import { getLogger } from '../../core/logger/logger.server';

// Common interfaces for all schedulers
export interface SchedulerConfig {
  /** Scheduler name for logging and identification */
  name: string;
  /** Enable scheduler (default: true) */
  enabled?: boolean;
  /** Auto-start on creation (default: true) */
  autoStart?: boolean;
  /** Graceful shutdown timeout in ms (default: 30000) */
  shutdownTimeout?: number;
}

export interface SchedulerStats {
  /** Scheduler name */
  name: string;
  /** Is scheduler currently running */
  isRunning: boolean;
  /** Total task executions */
  totalExecutions: number;
  /** Successful executions */
  successfulExecutions: number;
  /** Failed executions */
  failedExecutions: number;
  /** Last execution time */
  lastExecutionTime?: Date;
  /** Next scheduled execution time */
  nextExecutionTime?: Date;
}

export interface SchedulerHealth {
  /** Scheduler name */
  name: string;
  /** Overall health status */
  status: 'healthy' | 'degraded' | 'unhealthy' | 'stopped';
  /** Last health check time */
  lastHealthCheck: Date;
  /** Health check message */
  message?: string;
  /** Additional health metrics */
  metrics?: Record<string, unknown>;
}

/**
 * Abstract base class for all schedulers
 * Provides common functionality and enforces consistent interface
 */
export abstract class BaseScheduler {
  protected config: Required<SchedulerConfig>;
  protected isActive: boolean = false;
  protected stats: SchedulerStats;
  protected shutdownPromise?: Promise<void>;
  protected currentExecutionPromise?: Promise<void>;

  constructor(config: SchedulerConfig) {
    this.config = {
      enabled: config.enabled ?? true,
      autoStart: config.autoStart ?? true,
      shutdownTimeout: config.shutdownTimeout ?? 30000,
      ...config
    };

    this.stats = {
      name: this.config.name,
      isRunning: false,
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0
    };

    getLogger().info(`Scheduler created: ${this.config.name}`, 'BaseScheduler', {
      config: this.config
    });

    // Register with scheduler registry
    SchedulerRegistry.register(this);

    // Auto-start if enabled
    if (this.config.enabled && this.config.autoStart) {
      this.start();
    }
  }

  /**
   * Start the scheduler
   */
  public start(): void {
    if (!this.config.enabled) {
      getLogger().warn(`Scheduler ${this.config.name} is disabled`, 'BaseScheduler');
      return;
    }

    if (this.isActive) {
      getLogger().warn(`Scheduler ${this.config.name} already running`, 'BaseScheduler');
      return;
    }

    this.isActive = true;
    this.stats.isRunning = true;

    getLogger().info(`Scheduler started: ${this.config.name}`, 'BaseScheduler');
    
    // Start the scheduler implementation
    this.doStart();
  }

  /**
   * Stop the scheduler
   */
  public async stop(): Promise<void> {
    if (!this.isActive) {
      return;
    }

    getLogger().info(`Stopping scheduler: ${this.config.name}`, 'BaseScheduler');

    this.isActive = false;
    this.stats.isRunning = false;

    // Create shutdown promise
    this.shutdownPromise = this.performShutdown();

    // Wait for shutdown with timeout
    try {
      await Promise.race([
        this.shutdownPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Shutdown timeout')), this.config.shutdownTimeout)
        )
      ]);
      
      getLogger().info(`Scheduler stopped: ${this.config.name}`, 'BaseScheduler');
    } catch (error) {
      getLogger().error(`Scheduler shutdown timeout: ${this.config.name}`, 'BaseScheduler', { error });
    }
  }

  /**
   * Check if scheduler is running
   */
  public isRunning(): boolean {
    return this.isActive;
  }

  /**
   * Get scheduler statistics
   */
  public getStats(): SchedulerStats {
    return {
      ...this.stats,
      nextExecutionTime: this.getNextExecutionTime()
    };
  }

  /**
   * Get scheduler health status
   */
  public getHealth(): SchedulerHealth {
    const health: SchedulerHealth = {
      name: this.config.name,
      lastHealthCheck: new Date(),
      status: this.determineHealthStatus(),
      metrics: this.getHealthMetrics()
    };

    // Add health message based on status
    switch (health.status) {
      case 'healthy':
        health.message = 'Scheduler operating normally';
        break;
      case 'degraded':
        health.message = 'Scheduler experiencing issues but functional';
        break;
      case 'unhealthy':
        health.message = 'Scheduler has serious issues';
        break;
      case 'stopped':
        health.message = 'Scheduler is not running';
        break;
    }

    return health;
  }

  /**
   * Execute a task with proper error handling and statistics
   */
  protected async executeTask(taskFunction: () => Promise<void>): Promise<void> {
    const startTime = Date.now();
    this.stats.totalExecutions++;

    try {
      getLogger().debug(`Executing task: ${this.config.name}`, 'BaseScheduler');
      
      // Store current execution promise for graceful shutdown
      this.currentExecutionPromise = taskFunction();
      await this.currentExecutionPromise;
      
      this.stats.successfulExecutions++;
      this.stats.lastExecutionTime = new Date();
      
      const duration = Date.now() - startTime;
      
      getLogger().debug(`Task completed: ${this.config.name}`, 'BaseScheduler', {
        duration: `${duration}ms`
      });
      
    } catch (error) {
      this.stats.failedExecutions++;
      
      getLogger().error(`Task failed: ${this.config.name}`, 'BaseScheduler', {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${Date.now() - startTime}ms`
      });
      
      // Allow implementations to handle errors
      await this.handleTaskError(error);
    } finally {
      this.currentExecutionPromise = undefined;
    }
  }


  /**
   * Determine health status based on statistics
   */
  private determineHealthStatus(): SchedulerHealth['status'] {
    if (!this.isActive) return 'stopped';
    
    if (this.stats.totalExecutions === 0) return 'healthy';
    
    const errorRate = this.stats.failedExecutions / this.stats.totalExecutions;
    const recentFailures = this.stats.failedExecutions > 0 && 
      this.stats.lastExecutionTime && 
      (Date.now() - this.stats.lastExecutionTime.getTime()) < 300000; // 5 minutes
    
    if (errorRate > 0.5) return 'unhealthy';
    if (errorRate > 0.1 || recentFailures) return 'degraded';
    return 'healthy';
  }

  /**
   * Get additional health metrics
   */
  protected getHealthMetrics(): Record<string, unknown> {
    return {
      errorRate: this.stats.totalExecutions > 0 ? 
        (this.stats.failedExecutions / this.stats.totalExecutions) : 0,
      uptimeMs: this.stats.lastExecutionTime ? 
        Date.now() - this.stats.lastExecutionTime.getTime() : 0,
      isCurrentlyExecuting: this.currentExecutionPromise !== undefined
    };
  }

  /**
   * Perform graceful shutdown
   */
  private async performShutdown(): Promise<void> {
    // Stop scheduling new tasks
    await this.doStop();
    
    // Wait for current task to complete
    if (this.currentExecutionPromise) {
      getLogger().debug(`Waiting for current task to complete: ${this.config.name}`, 'BaseScheduler');
      await this.currentExecutionPromise;
    }
    
    // Perform cleanup
    await this.doCleanup();
  }

  // Abstract methods that implementations must provide
  protected abstract doStart(): void;
  protected abstract doStop(): Promise<void>;
  protected abstract doCleanup(): Promise<void>;
  protected abstract getNextExecutionTime(): Date | undefined;
  protected abstract handleTaskError(error: unknown): Promise<void>;
}

/**
 * Global scheduler registry for lifecycle management
 */
export class SchedulerRegistry {
  private static schedulers: Set<BaseScheduler> = new Set();
  private static isShuttingDown = false;

  /**
   * Register a scheduler
   */
  public static register(scheduler: BaseScheduler): void {
    this.schedulers.add(scheduler);
    getLogger().debug(`Scheduler registered: ${scheduler.getStats().name}`, 'SchedulerRegistry');
  }

  /**
   * Unregister a scheduler
   */
  public static unregister(scheduler: BaseScheduler): void {
    this.schedulers.delete(scheduler);
    getLogger().debug(`Scheduler unregistered: ${scheduler.getStats().name}`, 'SchedulerRegistry');
  }

  /**
   * Get all registered schedulers
   */
  public static getAll(): BaseScheduler[] {
    return Array.from(this.schedulers);
  }

  /**
   * Get scheduler by name
   */
  public static getByName(name: string): BaseScheduler | undefined {
    return Array.from(this.schedulers).find(s => s.getStats().name === name);
  }

  /**
   * Get overall statistics
   */
  public static getOverallStats(): {
    totalSchedulers: number;
    runningSchedulers: number;
    stoppedSchedulers: number;
    healthySchedulers: number;
    degradedSchedulers: number;
    unhealthySchedulers: number;
  } {
    const schedulers = Array.from(this.schedulers);
    const healths = schedulers.map(s => s.getHealth());
    
    return {
      totalSchedulers: schedulers.length,
      runningSchedulers: schedulers.filter(s => s.isRunning()).length,
      stoppedSchedulers: schedulers.filter(s => !s.isRunning()).length,
      healthySchedulers: healths.filter(h => h.status === 'healthy').length,
      degradedSchedulers: healths.filter(h => h.status === 'degraded').length,
      unhealthySchedulers: healths.filter(h => h.status === 'unhealthy').length
    };
  }

  /**
   * Stop all schedulers gracefully
   */
  public static async stopAll(): Promise<void> {
    if (this.isShuttingDown) {
      getLogger().warn('Scheduler registry already shutting down', 'SchedulerRegistry');
      return;
    }

    this.isShuttingDown = true;
    getLogger().info('Stopping all schedulers', 'SchedulerRegistry');

    const stopPromises = Array.from(this.schedulers).map(scheduler => 
      scheduler.stop().catch(error => 
        getLogger().error(`Failed to stop scheduler: ${scheduler.getStats().name}`, 'SchedulerRegistry', { error })
      )
    );

    await Promise.allSettled(stopPromises);
    getLogger().info('All schedulers stopped', 'SchedulerRegistry');
  }
}

// Auto-register process shutdown handlers (server-only execution)
// Graceful shutdown on SIGTERM
process.on('SIGTERM', async () => {
  getLogger().info('Received SIGTERM, shutting down schedulers', 'SchedulerRegistry');
  await SchedulerRegistry.stopAll();
  process.exit(0);
});

// Graceful shutdown on SIGINT
process.on('SIGINT', async () => {
  getLogger().info('Received SIGINT, shutting down schedulers', 'SchedulerRegistry');
  await SchedulerRegistry.stopAll();
  process.exit(0);
});