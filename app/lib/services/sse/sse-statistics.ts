/**
 * SSE Statistics Manager
 * Handles statistics collection and reporting for SSE events
 */

export interface SSEStats {
  totalEvents: number;
  totalListeners: number;
  eventDetails: Record<string, number>;
}

export class SSEStatisticsManager {
  /**
   * Generate statistics for SSE event listeners
   */
  generateStats(listeners: Map<string, Set<(data: unknown) => void>>): SSEStats {
    const stats: SSEStats = {
      totalEvents: listeners.size,
      totalListeners: 0,
      eventDetails: {}
    };

    for (const [event, eventListeners] of listeners.entries()) {
      const count = eventListeners.size;
      stats.totalListeners += count;
      stats.eventDetails[event] = count;
    }

    return stats;
  }

  /**
   * Get listener count for a specific event
   */
  getListenerCount(listeners: Map<string, Set<(data: unknown) => void>>, event: string): number {
    return listeners.get(event)?.size || 0;
  }

  /**
   * Get all event names
   */
  getAllEvents(listeners: Map<string, Set<(data: unknown) => void>>): string[] {
    return Array.from(listeners.keys());
  }
}