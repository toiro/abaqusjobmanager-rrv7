/**
 * Scheduler System Initialization
 * Central initialization and management of all system schedulers
 */

import { getLogger } from '../core/logger/logger.server';
import { SchedulerRegistry, createSchedulerMonitor } from './scheduler';
import { defaultHealthCheckScheduler } from './scheduler/health-check-scheduler';
import { sseCleanupScheduler } from './sse/sse-cleanup-scheduler';

/**
 * Initialize the scheduler system
 * Sets up all default schedulers and monitoring
 */
export function initializeSchedulerSystem(): void {
  // Only run on server-side
  if (typeof window !== 'undefined') {
    return;
  }

  getLogger().info('Initializing scheduler system', 'SchedulerSystem');

  try {
    // 1. Start Node Health Check Scheduler
    defaultHealthCheckScheduler.start();
    getLogger().info('Node health check scheduler started', 'SchedulerSystem');

    // 2. Start SSE Cleanup Scheduler
    sseCleanupScheduler.start();
    getLogger().info('SSE cleanup scheduler started', 'SchedulerSystem');

    // 3. Start scheduler monitoring
    const monitor = createSchedulerMonitor();
    getLogger().info('Scheduler monitor started', 'SchedulerSystem');

    // 4. Log initial status
    const stats = SchedulerRegistry.getOverallStats();
    getLogger().info('Scheduler system initialized', 'SchedulerSystem', {
      totalSchedulers: stats.totalSchedulers,
      runningSchedulers: stats.runningSchedulers,
      healthySchedulers: stats.healthySchedulers
    });

    // 5. Set up graceful shutdown handlers
    setupGracefulShutdown();

  } catch (error) {
    getLogger().error('Failed to initialize scheduler system', 'SchedulerSystem', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Set up graceful shutdown for the scheduler system
 */
function setupGracefulShutdown(): void {
  const shutdownHandler = async (signal: string) => {
    getLogger().info(`Received ${signal}, initiating graceful scheduler shutdown`, 'SchedulerSystem');
    
    try {
      await SchedulerRegistry.stopAll();
      getLogger().info('Scheduler system shutdown completed', 'SchedulerSystem');
    } catch (error) {
      getLogger().error('Error during scheduler shutdown', 'SchedulerSystem', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // Handle graceful shutdown signals
  process.on('SIGTERM', () => shutdownHandler('SIGTERM'));
  process.on('SIGINT', () => shutdownHandler('SIGINT'));
  
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    getLogger().error('Uncaught exception, shutting down schedulers', 'SchedulerSystem', { error });
    SchedulerRegistry.stopAll().finally(() => {
      process.exit(1);
    });
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    getLogger().error('Unhandled promise rejection, shutting down schedulers', 'SchedulerSystem', { 
      reason, 
      promise 
    });
    SchedulerRegistry.stopAll().finally(() => {
      process.exit(1);
    });
  });
}

/**
 * Get scheduler system status
 */
export function getSchedulerSystemStatus() {
  const registryStats = SchedulerRegistry.getOverallStats();
  const schedulers = SchedulerRegistry.getAll();
  
  return {
    system: {
      isInitialized: true,
      timestamp: new Date(),
      ...registryStats
    },
    schedulers: schedulers.map(scheduler => ({
      name: scheduler.getStats().name,
      status: scheduler.getHealth(),
      stats: scheduler.getStats()
    }))
  };
}

/**
 * Create a new job execution scheduler (for future use)
 * This demonstrates how to add new schedulers to the system
 */
export function createJobExecutionScheduler() {
  // This will be implemented when job execution is ready
  getLogger().info('Job execution scheduler creation requested', 'SchedulerSystem');
  
  // Example of how it would be created:
  // const jobScheduler = createAdaptiveScheduler(
  //   'job-execution-scheduler',
  //   30000, // 30 seconds normal interval
  //   async () => {
  //     // Job execution logic here
  //     return { success: true };
  //   }
  // );
  // 
  // return jobScheduler;
}