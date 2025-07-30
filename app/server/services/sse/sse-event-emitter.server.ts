/**
 * SSE Event Emitter
 * Focused responsibility: Event emission and listener management only
 */

import { getLogger } from "../../../shared/core/logger/logger.server";
import { SSECleanupManager } from "./sse-cleanup-manager";
import { SSEStatisticsManager, type SSEStats } from "./sse-statistics";

// Global event emitter for SSE
class SSEEventEmitter {
	private listeners: Map<string, Set<(data: unknown) => void>> = new Map();
	private cleanupManager = new SSECleanupManager();
	private statsManager = new SSEStatisticsManager();

	on(event: string, callback: (data: unknown) => void) {
		if (!this.listeners.has(event)) {
			this.listeners.set(event, new Set());
		}
		this.listeners.get(event)!.add(callback);
		getLogger().debug(
			`SSEEventEmitter: SSE listener added for event: ${event}`,
		);
	}

	off(event: string, callback: (data: unknown) => void) {
		const success = this.listeners.get(event)?.delete(callback) || false;
		if (success) {
			getLogger().debug(
				`SSEEventEmitter: SSE listener removed for event: ${event}`,
			);
		}
	}

	emit(event: string, data: unknown) {
		const listeners = this.listeners.get(event);
		if (listeners && listeners.size > 0) {
			getLogger().debug(
				`SSEEventEmitter: Emitting SSE event: ${event} to ${listeners.size} listeners`,
			);

			// Keep track of dead listeners to remove them
			const deadListeners: Array<(data: unknown) => void> = [];

			listeners.forEach((callback) => {
				try {
					callback(data);
				} catch (error) {
					// Check if it's a dead listener error
					if (
						error instanceof Error &&
						this.cleanupManager.isDeadListenerError(error)
					) {
						getLogger().debug("SSEEventEmitter: Removing dead SSE listener", {
							event,
						});
						deadListeners.push(callback);
					} else {
						getLogger().error("SSEEventEmitter: Error in SSE event listener", {
							event,
							error: error instanceof Error ? error.message : "Unknown error",
						});
					}
				}
			});

			// Remove dead listeners using cleanup manager
			this.cleanupManager.removeDeadListeners(event, listeners, deadListeners);
		} else {
			getLogger().debug(
				`SSEEventEmitter: No listeners for SSE event: ${event}`,
			);
		}
	}

	getListenerCount(event: string): number {
		return this.statsManager.getListenerCount(this.listeners, event);
	}

	getAllEvents(): string[] {
		return this.statsManager.getAllEvents(this.listeners);
	}

	/**
	 * Clean up empty event listener sets
	 */
	cleanup(): number {
		return this.cleanupManager.cleanupEmptyEvents(this.listeners);
	}

	/**
	 * Perform full cleanup with comprehensive statistics
	 */
	performFullCleanup(): {
		emptyEventsRemoved: number;
		totalEventsAfter: number;
		totalListenersAfter: number;
	} {
		return this.cleanupManager.performFullCleanup(this.listeners);
	}

	/**
	 * Get statistics about the event emitter
	 */
	getStats(): SSEStats {
		return this.statsManager.generateStats(this.listeners);
	}
}

// Lazy singleton pattern to avoid auto-initialization
let _sseEventEmitter: SSEEventEmitter;

export function getSSEEventEmitter(): SSEEventEmitter {
	if (!_sseEventEmitter) {
		_sseEventEmitter = new SSEEventEmitter();
	}
	return _sseEventEmitter;
}
