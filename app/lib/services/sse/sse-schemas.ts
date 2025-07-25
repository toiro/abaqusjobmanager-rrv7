/**
 * Simplified SSE (Server-Sent Events) Schema
 * Practical design focused on usability over excessive type safety
 */

/**
 * Basic SSE event structure
 */
export interface SSEEvent<T = unknown> {
  type: string;
  data?: T;
  timestamp: string;
  channel: string;
}

/**
 * Common channel names
 */
export const SSE_CHANNELS = {
  JOBS: 'jobs',
  FILES: 'files', 
  NODES: 'nodes',
  USERS: 'users',
  SYSTEM: 'system'
} as const;

export type SSEChannel = typeof SSE_CHANNELS[keyof typeof SSE_CHANNELS];

/**
 * Common event types for different channels
 */
export const EVENT_TYPES = {
  // Job events
  JOB_CREATED: 'job_created',
  JOB_UPDATED: 'job_updated', 
  JOB_DELETED: 'job_deleted',
  JOB_STATUS_CHANGED: 'job_status_changed',
  
  // File events
  FILE_CREATED: 'file_created',
  FILE_UPDATED: 'file_updated',
  FILE_DELETED: 'file_deleted',
  
  // Node events
  NODE_CREATED: 'node_created',
  NODE_UPDATED: 'node_updated',
  NODE_DELETED: 'node_deleted',
  NODE_STATUS_CHANGED: 'node_status_changed',
  
  // User events
  USER_CREATED: 'user_created',
  USER_UPDATED: 'user_updated',
  USER_DELETED: 'user_deleted',
  USER_STATUS_CHANGED: 'user_status_changed',
  
  // System events
  PING: 'ping',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  ERROR: 'error',
  
  // License events
  LICENSE_USAGE_UPDATED: 'license_usage_updated'
} as const;

/**
 * Practical validation - basic structure check without excessive Zod schemas
 */
export function validateSSEEvent(data: unknown): SSEEvent | null {
  try {
    if (typeof data === 'object' && data && 
        'type' in data && typeof data.type === 'string' &&
        'channel' in data && typeof data.channel === 'string') {
      
      const event = data as SSEEvent;
      
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
 * Create an SSE event with proper structure
 */
export function createSSEEvent<T = unknown>(
  channel: string, 
  type: string, 
  data?: T
): SSEEvent<T> {
  return {
    type,
    data,
    timestamp: new Date().toISOString(),
    channel
  };
}

/**
 * Helper functions for common event creation
 */
export function createJobEvent<T = unknown>(type: string, data?: T): SSEEvent<T> {
  return createSSEEvent(SSE_CHANNELS.JOBS, type, data);
}

export function createFileEvent<T = unknown>(type: string, data?: T): SSEEvent<T> {
  return createSSEEvent(SSE_CHANNELS.FILES, type, data);
}

export function createNodeEvent<T = unknown>(type: string, data?: T): SSEEvent<T> {
  return createSSEEvent(SSE_CHANNELS.NODES, type, data);
}

export function createUserEvent<T = unknown>(type: string, data?: T): SSEEvent<T> {
  return createSSEEvent(SSE_CHANNELS.USERS, type, data);
}

export function createSystemEvent<T = unknown>(type: string, data?: T): SSEEvent<T> {
  return createSSEEvent(SSE_CHANNELS.SYSTEM, type, data);
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
export function createLicenseUsageUpdateEvent(data: LicenseUsageData): SSEEvent<LicenseUsageData> {
  return createSystemEvent(EVENT_TYPES.LICENSE_USAGE_UPDATED, data);
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
  userId?: number;
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
  userId?: number;
  userName?: string;
  maxConcurrentJobs?: number;
  isActive?: boolean;
}

export interface SystemEventData {
  message?: string;
  channel?: string;
  [key: string]: unknown;
}

/**
 * Typed event creation helpers (optional - can use generic createSSEEvent instead)
 */
export function createTypedJobEvent(type: string, data?: JobEventData): SSEEvent<JobEventData> {
  return createJobEvent(type, data);
}

export function createTypedFileEvent(type: string, data?: FileEventData): SSEEvent<FileEventData> {
  return createFileEvent(type, data);
}

export function createTypedNodeEvent(type: string, data?: NodeEventData): SSEEvent<NodeEventData> {
  return createNodeEvent(type, data);
}

export function createTypedUserEvent(type: string, data?: UserEventData): SSEEvent<UserEventData> {
  return createUserEvent(type, data);
}

export function createTypedSystemEvent(type: string, data?: SystemEventData): SSEEvent<SystemEventData> {
  return createSystemEvent(type, data);
}