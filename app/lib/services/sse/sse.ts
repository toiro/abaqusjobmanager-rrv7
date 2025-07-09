/**
 * Simplified SSE (Server-Sent Events) Implementation
 * Practical approach focused on usability and maintainability
 */

import { getLogger } from '../../core/logger';
import { getSSEEventEmitter } from './sse-event-emitter';
import { 
  type SSEEvent,
  type JobEventData,
  type FileEventData,
  type NodeEventData,
  type UserEventData,
  type SystemEventData,
  EVENT_TYPES,
  SSE_CHANNELS
} from './sse-schemas';

/**
 * Generic SSE event emission
 */
export function emitSSE<T = unknown>(channel: string, type: string, data?: T): void {
  try {
    const event: SSEEvent<T> = {
      type,
      data,
      timestamp: new Date().toISOString(),
      channel
    };
    
    getSSEEventEmitter().emit(channel, event);
    
    getLogger().debug('SSE event emitted', `SSE:${channel}`, { 
      type,
      listenerCount: getSSEEventEmitter().getListenerCount(channel)
    });
  } catch (error) {
    getLogger().error('Failed to emit SSE event', `SSE:${channel}`, { 
      type, 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Job Events
 */
export function emitJobEvent(type: string, data?: JobEventData): void {
  emitSSE(SSE_CHANNELS.JOBS, type, data);
}

export function emitJobCreated(data: JobEventData): void {
  emitJobEvent(EVENT_TYPES.JOB_CREATED, data);
}

export function emitJobUpdated(data: JobEventData): void {
  emitJobEvent(EVENT_TYPES.JOB_UPDATED, data);
}

export function emitJobDeleted(data: JobEventData): void {
  emitJobEvent(EVENT_TYPES.JOB_DELETED, data);
}

export function emitJobStatusChanged(data: JobEventData): void {
  emitJobEvent(EVENT_TYPES.JOB_STATUS_CHANGED, data);
}

/**
 * File Events  
 */
export function emitFileEvent(type: string, data?: FileEventData): void {
  emitSSE(SSE_CHANNELS.FILES, type, data);
}

export function emitFileCreated(data: FileEventData): void {
  emitFileEvent(EVENT_TYPES.FILE_CREATED, data);
}

export function emitFileUpdated(data: FileEventData): void {
  emitFileEvent(EVENT_TYPES.FILE_UPDATED, data);
}

export function emitFileDeleted(data: FileEventData): void {
  emitFileEvent(EVENT_TYPES.FILE_DELETED, data);
}

/**
 * Node Events
 */
export function emitNodeEvent(type: string, data?: NodeEventData): void {
  emitSSE(SSE_CHANNELS.NODES, type, data);
}

export function emitNodeCreated(data: NodeEventData): void {
  emitNodeEvent(EVENT_TYPES.NODE_CREATED, data);
}

export function emitNodeUpdated(data: NodeEventData): void {
  emitNodeEvent(EVENT_TYPES.NODE_UPDATED, data);
}

export function emitNodeDeleted(data: NodeEventData): void {
  emitNodeEvent(EVENT_TYPES.NODE_DELETED, data);
}

export function emitNodeStatusChanged(data: NodeEventData): void {
  emitNodeEvent(EVENT_TYPES.NODE_STATUS_CHANGED, data);
}

/**
 * User Events
 */
export function emitUserEvent(type: string, data?: UserEventData): void {
  emitSSE(SSE_CHANNELS.USERS, type, data);
}

export function emitUserCreated(data: UserEventData): void {
  emitUserEvent(EVENT_TYPES.USER_CREATED, data);
}

export function emitUserUpdated(data: UserEventData): void {
  emitUserEvent(EVENT_TYPES.USER_UPDATED, data);
}

export function emitUserDeleted(data: UserEventData): void {
  emitUserEvent(EVENT_TYPES.USER_DELETED, data);
}

export function emitUserStatusChanged(data: UserEventData): void {
  emitUserEvent(EVENT_TYPES.USER_STATUS_CHANGED, data);
}

/**
 * System Events
 */
export function emitSystemEvent(type: string, data?: SystemEventData): void {
  emitSSE(SSE_CHANNELS.SYSTEM, type, data);
}

export function emitPing(data?: SystemEventData): void {
  emitSystemEvent(EVENT_TYPES.PING, data);
}

export function emitConnected(data?: SystemEventData): void {
  emitSystemEvent(EVENT_TYPES.CONNECTED, data);
}

export function emitDisconnected(data?: SystemEventData): void {
  emitSystemEvent(EVENT_TYPES.DISCONNECTED, data);
}

export function emitError(data?: SystemEventData): void {
  emitSystemEvent(EVENT_TYPES.ERROR, data);
}


