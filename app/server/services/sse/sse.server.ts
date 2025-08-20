/**
 * Simplified SSE (Server-Sent Events) Implementation
 * Practical approach focused on usability and maintainability
 */

import { getLogger } from "../../../shared/core/logger/logger.server";
import { getSSEEventEmitter } from "./sse-event-emitter.server";
import type { AnyTypedSSEEvent, ChannelEventMap, TypedSSEEvent } from "./sse-schemas";

/**
 * Type-safe SSE event emission using Channel-Event mapping
 * Ensures compile-time type safety for channel, event type, and data consistency
 */
export function emitTypedEvent<
	TChannel extends keyof ChannelEventMap,
	TType extends keyof ChannelEventMap[TChannel],
>(
	channel: TChannel,
	type: TType,
	data?: ChannelEventMap[TChannel][TType],
): void {
	try {
		const event: TypedSSEEvent<TChannel, TType> = {
			channel,
			type,
			data,
			timestamp: new Date().toISOString(),
		};

		getSSEEventEmitter().emit(channel as string, event as AnyTypedSSEEvent);

		getLogger().debug("Typed SSE event emitted", {
			channel,
			type,
			listenerCount: getSSEEventEmitter().getListenerCount(channel as string),
		});
	} catch (error) {
		getLogger().error("Failed to emit typed SSE event", {
			channel,
			type,
			error: error instanceof Error ? error.message : "Unknown error",
		});
	}
}

/**
 * Job Events
 */
export function emitJobEvent<T extends keyof ChannelEventMap["jobs"]>(
	type: T,
	data?: ChannelEventMap["jobs"][T],
): void {
	emitTypedEvent("jobs", type, data);
}

export function emitJobCreated(
	data?: ChannelEventMap["jobs"]["job_created"],
): void {
	emitTypedEvent("jobs", "job_created", data);
}

export function emitJobUpdated(
	data?: ChannelEventMap["jobs"]["job_updated"],
): void {
	emitTypedEvent("jobs", "job_updated", data);
}

export function emitJobDeleted(
	data?: ChannelEventMap["jobs"]["job_deleted"],
): void {
	emitTypedEvent("jobs", "job_deleted", data);
}

export function emitJobStatusChanged(
	data?: ChannelEventMap["jobs"]["job_status_changed"],
): void {
	emitTypedEvent("jobs", "job_status_changed", data);
}

/**
 * File Events
 */
export function emitFileEvent<T extends keyof ChannelEventMap["files"]>(
	type: T,
	data?: ChannelEventMap["files"][T],
): void {
	emitTypedEvent("files", type, data);
}

export function emitFileCreated(
	data?: ChannelEventMap["files"]["file_created"],
): void {
	emitTypedEvent("files", "file_created", data);
}

export function emitFileUpdated(
	data?: ChannelEventMap["files"]["file_updated"],
): void {
	emitTypedEvent("files", "file_updated", data);
}

export function emitFileDeleted(
	data?: ChannelEventMap["files"]["file_deleted"],
): void {
	emitTypedEvent("files", "file_deleted", data);
}

/**
 * Node Events
 */
export function emitNodeEvent<T extends keyof ChannelEventMap["nodes"]>(
	type: T,
	data?: ChannelEventMap["nodes"][T],
): void {
	emitTypedEvent("nodes", type, data);
}

export function emitNodeCreated(
	data?: ChannelEventMap["nodes"]["node_created"],
): void {
	emitTypedEvent("nodes", "node_created", data);
}

export function emitNodeUpdated(
	data?: ChannelEventMap["nodes"]["node_updated"],
): void {
	emitTypedEvent("nodes", "node_updated", data);
}

export function emitNodeDeleted(
	data?: ChannelEventMap["nodes"]["node_deleted"],
): void {
	emitTypedEvent("nodes", "node_deleted", data);
}

export function emitNodeStatusChanged(
	data?: ChannelEventMap["nodes"]["node_status_changed"],
): void {
	emitTypedEvent("nodes", "node_status_changed", data);
}

/**
 * User Events
 */
export function emitUserEvent<T extends keyof ChannelEventMap["users"]>(
	type: T,
	data?: ChannelEventMap["users"][T],
): void {
	emitTypedEvent("users", type, data);
}

export function emitUserCreated(
	data?: ChannelEventMap["users"]["user_created"],
): void {
	emitTypedEvent("users", "user_created", data);
}

export function emitUserUpdated(
	data?: ChannelEventMap["users"]["user_updated"],
): void {
	emitTypedEvent("users", "user_updated", data);
}

export function emitUserDeleted(
	data?: ChannelEventMap["users"]["user_deleted"],
): void {
	emitTypedEvent("users", "user_deleted", data);
}

export function emitUserStatusChanged(
	data?: ChannelEventMap["users"]["user_status_changed"],
): void {
	emitTypedEvent("users", "user_status_changed", data);
}

/**
 * System Events
 */
export function emitSystemEvent<T extends keyof ChannelEventMap["system"]>(
	type: T,
	data?: ChannelEventMap["system"][T],
): void {
	emitTypedEvent("system", type, data);
}

export function emitPing(data?: ChannelEventMap["system"]["ping"]): void {
	emitTypedEvent("system", "ping", data);
}

export function emitConnected(
	data?: ChannelEventMap["system"]["connected"],
): void {
	emitTypedEvent("system", "connected", data);
}

export function emitDisconnected(
	data?: ChannelEventMap["system"]["disconnected"],
): void {
	emitTypedEvent("system", "disconnected", data);
}

export function emitError(data?: ChannelEventMap["system"]["error"]): void {
	emitTypedEvent("system", "error", data);
}
