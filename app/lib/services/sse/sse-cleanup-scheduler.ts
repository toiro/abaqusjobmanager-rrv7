/**
 * SSE Event Emitter Cleanup Scheduler
 * Periodically cleans up dead listeners and empty event sets
 */

import { getSSEEventEmitter } from './sse-event-emitter.server';
import { getLogger } from '../../core/logger/logger.server';
import { createCleanupScheduler } from '../scheduler';

/**
 * SSE cleanup task function
 */
async function performSSECleanup(): Promise<void> {
  const statsBefore = getSSEEventEmitter().getStats();
  const cleanupResult = getSSEEventEmitter().performFullCleanup();
  const statsAfter = getSSEEventEmitter().getStats();

  getLogger().info('SSE cleanup completed', 'SSECleanupScheduler', {
    cleanupResult,
    beforeStats: statsBefore,
    afterStats: statsAfter
  });
}

/**
 * Create SSE cleanup scheduler factory function
 * @param intervalMs Cleanup interval in milliseconds (default: 5 minutes)
 */
export function createSSECleanupScheduler(intervalMs: number = 5 * 60 * 1000) {
  return createCleanupScheduler(
    'sse-cleanup-scheduler',
    performSSECleanup,
    Math.round(intervalMs / (60 * 1000)) // Convert to minutes for createCleanupScheduler
  );
}