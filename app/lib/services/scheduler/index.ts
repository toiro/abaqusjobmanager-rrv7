/**
 * Scheduler Foundation - Main Export
 * Common infrastructure for all scheduled server-side tasks
 */

// Base scheduler and registry
export { 
  BaseScheduler, 
  SchedulerRegistry,
  type SchedulerConfig,
  type SchedulerStats,
  type SchedulerHealth 
} from './base-scheduler';

// Interval scheduler for simple periodic tasks
export { 
  IntervalScheduler,
  createIntervalScheduler,
  createCleanupScheduler,
  type IntervalSchedulerConfig 
} from './interval-scheduler';

// Adaptive scheduler for complex dynamic scheduling
export { 
  AdaptiveScheduler,
  createAdaptiveScheduler,
  createHealthCheckScheduler,
  type AdaptiveSchedulerConfig,
  type AdaptiveTaskResult,
  type AdaptiveTaskFunction 
} from './adaptive-scheduler';

// Utility functions
export { createSchedulerMonitor } from './monitor';

/**
 * Quick start examples:
 * 
 * // Simple cleanup task every 5 minutes
 * const cleanupScheduler = createCleanupScheduler(
 *   'file-cleanup',
 *   async () => { await cleanupTempFiles(); }
 * );
 * 
 * // Adaptive health check
 * const healthScheduler = createHealthCheckScheduler(
 *   'node-health',
 *   async () => { return { success: await checkNodeHealth() }; }
 * );
 * 
 * // Custom interval scheduler
 * const customScheduler = createIntervalScheduler(
 *   'custom-task',
 *   60000, // 1 minute
 *   async () => { await doCustomTask(); }
 * );
 * 
 * // Graceful shutdown
 * process.on('SIGTERM', () => SchedulerRegistry.stopAll());
 */