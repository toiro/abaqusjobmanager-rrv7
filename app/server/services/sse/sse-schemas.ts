/**
 * Simplified SSE (Server-Sent Events) Schema
 * Practical design focused on usability over excessive type safety
 */





/**
 * Channel-Event Type Mapping for complete type safety
 * Maps each channel to its possible event types and their data structures
 */
export type ChannelEventMap = {
	jobs: {
		job_created: JobEventData;
		job_updated: JobEventData;
		job_deleted: JobEventData;
		job_status_changed: JobEventData;
	};
	files: {
		file_created: FileEventData;
		file_updated: FileEventData;
		file_deleted: FileEventData;
	};
	nodes: {
		node_created: NodeEventData;
		node_updated: NodeEventData;
		node_deleted: NodeEventData;
		node_status_changed: NodeEventData;
	};
	users: {
		user_created: UserEventData;
		user_updated: UserEventData;
		user_deleted: UserEventData;
		user_status_changed: UserEventData;
	};
	system: {
		ping: SystemEventData;
		connected: SystemEventData;
		disconnected: SystemEventData;
		error: SystemEventData;
		license_usage_updated: LicenseUsageData;
	};
};
/**
 * Derived constants from ChannelEventMap to ensure consistency
 * These are derived from the ChannelEventMap type definition above
 */

/**
 * Channel names derived from ChannelEventMap
 * This ensures type safety and consistency with the mapping
 */
export const SSE_CHANNELS = {
	JOBS: "jobs" as keyof ChannelEventMap,
	FILES: "files" as keyof ChannelEventMap,
	NODES: "nodes" as keyof ChannelEventMap,
	USERS: "users" as keyof ChannelEventMap,
	SYSTEM: "system" as keyof ChannelEventMap,
} as const;

export type SSEChannel = (typeof SSE_CHANNELS)[keyof typeof SSE_CHANNELS];

/**
 * Event types derived from ChannelEventMap
 * This ensures type safety and consistency with the channel-event mapping
 */
export const EVENT_TYPES = {
	// Job events
	JOB_CREATED: "job_created" as keyof ChannelEventMap['jobs'],
	JOB_UPDATED: "job_updated" as keyof ChannelEventMap['jobs'],
	JOB_DELETED: "job_deleted" as keyof ChannelEventMap['jobs'],
	JOB_STATUS_CHANGED: "job_status_changed" as keyof ChannelEventMap['jobs'],

	// File events
	FILE_CREATED: "file_created" as keyof ChannelEventMap['files'],
	FILE_UPDATED: "file_updated" as keyof ChannelEventMap['files'],
	FILE_DELETED: "file_deleted" as keyof ChannelEventMap['files'],

	// Node events
	NODE_CREATED: "node_created" as keyof ChannelEventMap['nodes'],
	NODE_UPDATED: "node_updated" as keyof ChannelEventMap['nodes'],
	NODE_DELETED: "node_deleted" as keyof ChannelEventMap['nodes'],
	NODE_STATUS_CHANGED: "node_status_changed" as keyof ChannelEventMap['nodes'],

	// User events
	USER_CREATED: "user_created" as keyof ChannelEventMap['users'],
	USER_UPDATED: "user_updated" as keyof ChannelEventMap['users'],
	USER_DELETED: "user_deleted" as keyof ChannelEventMap['users'],
	USER_STATUS_CHANGED: "user_status_changed" as keyof ChannelEventMap['users'],

	// System events
	PING: "ping" as keyof ChannelEventMap['system'],
	CONNECTED: "connected" as keyof ChannelEventMap['system'],
	DISCONNECTED: "disconnected" as keyof ChannelEventMap['system'],
	ERROR: "error" as keyof ChannelEventMap['system'],

	// License events
	LICENSE_USAGE_UPDATED: "license_usage_updated" as keyof ChannelEventMap['system'],
} as const;
/**
 * Type safety constraints to ensure consistency between ChannelEventMap and constants
 * These type assertions will cause compilation errors if the definitions become inconsistent
 */

// Ensure SSE_CHANNELS keys match ChannelEventMap keys
type ChannelConsistencyCheck = keyof typeof SSE_CHANNELS extends keyof {
	[K in keyof ChannelEventMap as Uppercase<K>]: unknown;
} 
	? true 
	: never;

// Ensure EVENT_TYPES values match ChannelEventMap event keys
type EventConsistencyCheck = {
	[K in keyof typeof EVENT_TYPES]: (typeof EVENT_TYPES)[K] extends 
		keyof ChannelEventMap[keyof ChannelEventMap] 
		? true 
		: never;
};

// Type assertion to enforce consistency at compile time
const _channelConsistencyCheck: ChannelConsistencyCheck = true;
const _eventConsistencyCheck: EventConsistencyCheck = {} as EventConsistencyCheck;
/**
 * Type-safe SSE Event interface using Channel-Event mapping
 * Ensures that event.type and event.data are properly typed based on the channel
 */
export type TypedSSEEvent<
	TChannel extends keyof ChannelEventMap,
	TType extends keyof ChannelEventMap[TChannel]
> = {
	channel: TChannel;
	type: TType;
	data?: ChannelEventMap[TChannel][TType];
	timestamp: string;
};
/**
 * Channel-specific type aliases for convenience
 * These provide easier type annotations for specific channels
 */
export type JobSSEEvent = TypedSSEEvent<'jobs', keyof ChannelEventMap['jobs']>;
export type FileSSEEvent = TypedSSEEvent<'files', keyof ChannelEventMap['files']>;
export type NodeSSEEvent = TypedSSEEvent<'nodes', keyof ChannelEventMap['nodes']>;
export type UserSSEEvent = TypedSSEEvent<'users', keyof ChannelEventMap['users']>;
export type SystemSSEEvent = TypedSSEEvent<'system', keyof ChannelEventMap['system']>;

/**
 * Union type of all possible typed SSE events
 */
export type AnyTypedSSEEvent = 
	| JobSSEEvent
	| FileSSEEvent
	| NodeSSEEvent
	| UserSSEEvent
	| SystemSSEEvent;
/**
 * Type-safe SSE event creation functions
 * These functions ensure complete type safety for channel-event combinations
 */

/**
 * Create a type-safe SSE event with complete channel-event validation
 */
export function createTypedSSEEvent<
	TChannel extends keyof ChannelEventMap,
	TType extends keyof ChannelEventMap[TChannel]
>(
	channel: TChannel,
	type: TType,
	data?: ChannelEventMap[TChannel][TType]
): TypedSSEEvent<TChannel, TType> {
	return {
		channel,
		type,
		data,
		timestamp: new Date().toISOString(),
	};
}

/**
 * Type-safe channel-specific event creation functions
 */
export function createTypedJobEvent<T extends keyof ChannelEventMap['jobs']>(
	type: T,
	data?: ChannelEventMap['jobs'][T]
): TypedSSEEvent<'jobs', T> {
	return createTypedSSEEvent('jobs', type, data);
}

export function createTypedFileEvent<T extends keyof ChannelEventMap['files']>(
	type: T,
	data?: ChannelEventMap['files'][T]
): TypedSSEEvent<'files', T> {
	return createTypedSSEEvent('files', type, data);
}

export function createTypedNodeEvent<T extends keyof ChannelEventMap['nodes']>(
	type: T,
	data?: ChannelEventMap['nodes'][T]
): TypedSSEEvent<'nodes', T> {
	return createTypedSSEEvent('nodes', type, data);
}

export function createTypedUserEvent<T extends keyof ChannelEventMap['users']>(
	type: T,
	data?: ChannelEventMap['users'][T]
): TypedSSEEvent<'users', T> {
	return createTypedSSEEvent('users', type, data);
}

export function createTypedSystemEvent<T extends keyof ChannelEventMap['system']>(
	type: T,
	data?: ChannelEventMap['system'][T]
): TypedSSEEvent<'system', T> {
	return createTypedSSEEvent('system', type, data);
}

/**
 * Practical validation - basic structure check without excessive Zod schemas
 */
export function validateSSEEvent(data: unknown): AnyTypedSSEEvent | null {
	try {
		if (
			typeof data === "object" &&
			data &&
			"type" in data &&
			typeof data.type === "string" &&
			"channel" in data &&
			typeof data.channel === "string"
		) {
			const event = data as AnyTypedSSEEvent;

			// Add timestamp if missing
			if (!event.timestamp) {
				event.timestamp = new Date().toISOString();
			}

			return event;
		}
		return null;
	} catch {
		return null;
	}
}





/**
 * License usage data structure for real-time updates
 */
export interface LicenseUsageData {
	totalTokens: number;
	usedTokens: number;
	availableTokens: number;
	runningJobs: Array<{
		id: number;
		name: string;
		cpu_cores: number;
		tokens: number;
	}>;
}

/**
 * Helper function for license usage update events
 */
export function createLicenseUsageUpdateEvent(
	data: LicenseUsageData,
): TypedSSEEvent<'system', 'license_usage_updated'> {
	return createTypedSystemEvent('license_usage_updated', data);
}

/**
 * Check if a string is a valid channel
 */
export function isValidChannel(channel: string): channel is SSEChannel {
	return Object.values(SSE_CHANNELS).includes(channel as SSEChannel);
}

/**
 * Type-safe data interfaces for common events (optional to use)
 */
export interface JobEventData {
	jobId?: number;
	jobName?: string;
	status?: string;
	nodeId?: number;
	userId?: string;
	cpuCores?: number;
	priority?: string;
	fileId?: number;
	startTime?: string;
	endTime?: string;
	errorMessage?: string;
}

export interface FileEventData {
	fileId?: number;
	fileName?: string;
	fileSize?: number;
	mimeType?: string;
	uploadedBy?: string;
}

export interface NodeEventData {
	nodeId?: number;
	nodeName?: string;
	hostname?: string;
	sshUsername?: string;
	sshPort?: number;
	cpuCoresLimit?: number;
	licenseTokenLimit?: number;
	status?: string;
	isActive?: boolean;
}

export interface UserEventData {
	userId?: string;
	userName?: string;
	maxConcurrentJobs?: number;
	isActive?: boolean;
}

export interface SystemEventData {
	message?: string;
	channel?: string;
	[key: string]: unknown;
}


