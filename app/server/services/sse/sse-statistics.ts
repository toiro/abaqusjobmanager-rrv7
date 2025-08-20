/**
 * SSE Statistics Manager
 * Handles statistics collection and reporting for SSE events
 */

import type { AnyTypedSSEEvent } from "./sse-schemas";

export interface SSEStats {
	totalEvents: number;
	totalListeners: number;
	eventDetails: Record<string, number>;
}

export class SSEStatisticsManager {
	/**
	 * Generate statistics for SSE event listeners
	 */
	generateStats(
		listeners: Map<string, Set<(data: AnyTypedSSEEvent) => void>>,
	): SSEStats {
		const stats: SSEStats = {
			totalEvents: listeners.size,
			totalListeners: 0,
			eventDetails: {},
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
	getListenerCount(
		listeners: Map<string, Set<(data: AnyTypedSSEEvent) => void>>,
		event: string,
	): number {
		return listeners.get(event)?.size || 0;
	}

	/**
	 * Get all event names
	 */
	getAllEvents(
		listeners: Map<string, Set<(data: AnyTypedSSEEvent) => void>>,
	): string[] {
		return Array.from(listeners.keys());
	}
}
