/**
 * SSE Cleanup Manager
 * Handles cleanup of dead listeners and empty event sets
 */

import { getLogger } from "../../../shared/core/logger/logger.server";
import type { AnyTypedSSEEvent } from "./sse-schemas";

export class SSECleanupManager {
	private readonly logger = getLogger();

	/**
	 * Perform comprehensive cleanup of SSE listeners
	 */
	performFullCleanup(
		listeners: Map<string, Set<(data: AnyTypedSSEEvent) => void>>,
	): {
		emptyEventsRemoved: number;
		totalEventsAfter: number;
		totalListenersAfter: number;
	} {
		const emptyEventsRemoved = this.cleanupEmptyEvents(listeners);
		const totalEventsAfter = listeners.size;
		const totalListenersAfter = this.calculateTotalListeners(listeners);

		this.logger.info("SSECleanupManager: SSE cleanup completed", {
			emptyEventsRemoved,
			totalEventsAfter,
			totalListenersAfter,
		});

		return { emptyEventsRemoved, totalEventsAfter, totalListenersAfter };
	}

	/**
	 * Clean up empty event listener sets
	 */
	cleanupEmptyEvents(
		listeners: Map<string, Set<(data: AnyTypedSSEEvent) => void>>,
	): number {
		let cleanedCount = 0;
		for (const [event, eventListeners] of listeners.entries()) {
			if (eventListeners.size === 0) {
				listeners.delete(event);
				cleanedCount++;
			}
		}
		if (cleanedCount > 0) {
			this.logger.info(
				`SSECleanupManager: Cleaned up ${cleanedCount} empty event listener sets`,
				{
					remainingEvents: listeners.size,
					cleanedCount,
				},
			);
		}
		return cleanedCount;
	}

	/**
	 * Remove dead listeners from an event
	 */
	removeDeadListeners(
		event: string,
		listeners: Set<(data: AnyTypedSSEEvent) => void>,
		deadListeners: Array<(data: AnyTypedSSEEvent) => void>,
	): void {
		deadListeners.forEach((deadListener) => {
			listeners.delete(deadListener);
		});

		if (deadListeners.length > 0) {
			this.logger.info(
				`SSECleanupManager: Removed ${deadListeners.length} dead listeners for event: ${event}`,
				{
					event,
					deadListenersCount: deadListeners.length,
					remainingListeners: listeners.size,
				},
			);
		}
	}

	/**
	 * Check if an error indicates a dead listener
	 */
	isDeadListenerError(error: Error): boolean {
		return (
			error.message.includes("ReadableStreamDefaultController") ||
			error.message.includes("Invalid state")
		);
	}

	/**
	 * Calculate total number of listeners across all events
	 */
	private calculateTotalListeners(
		listeners: Map<string, Set<(data: AnyTypedSSEEvent) => void>>,
	): number {
		let total = 0;
		for (const eventListeners of listeners.values()) {
			total += eventListeners.size;
		}
		return total;
	}
}
