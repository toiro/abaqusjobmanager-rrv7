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

// Create SSE cleanup scheduler
export const sseCleanupScheduler = createCleanupScheduler(
  'sse-cleanup-scheduler',
  performSSECleanup,
  5 // 5 minutes
);