import { eventEmitter } from "~/routes/api.events";
import { logger } from "~/lib/logger/logger";
import { 
  SSEEventUnionSchema,
  FileEventSchema,
  JobEventSchema,
  NodeEventSchema,
  UserEventSchema,
  SystemEventSchema,
  type SSEEvent,
  type SSEChannel,
  type FileEventData,
  type JobEventData,
  type NodeEventData,
  type UserEventData
} from "~/lib/sse-schemas";

/**
 * Emit SSE event to specific channel with validation - 型安全なチャンネル
 */
export function emitSSEEvent<TData = unknown>(
  channel: SSEChannel, 
  event: SSEEvent<TData>
) {
  const eventData = {
    ...event,
    timestamp: new Date().toISOString(),
    channel
  };
  
  // Validate event structure using union schema
  const validatedEvent = SSEEventUnionSchema.safeParse(eventData);
  if (!validatedEvent.success) {
    logger.error("Invalid SSE event structure", `SSE:${channel}`, {
      channel,
      errors: validatedEvent.error.issues,
      eventData
    });
    return;
  }
  
  logger.debug("SSE event emitted", `SSE:${channel}`, validatedEvent.data);
  eventEmitter.emit(channel, validatedEvent.data);
}

/**
 * Emit file-related events with type validation
 */
export function emitFileEvent(type: 'created' | 'deleted' | 'updated', fileData?: FileEventData) {
  const event = {
    type: `file_${type}` as const,
    data: fileData
  };
  
  // Validate file event structure
  const validatedEvent = FileEventSchema.safeParse(event);
  if (!validatedEvent.success) {
    logger.error("Invalid file event structure", "SSE:files", {
      type,
      errors: validatedEvent.error.issues,
      fileData
    });
    return;
  }
  
  emitSSEEvent('files', validatedEvent.data);
}

/**
 * Emit job-related events with type validation
 */
export function emitJobEvent(type: 'created' | 'updated' | 'deleted' | 'status_changed', jobData?: JobEventData) {
  const event = {
    type: `job_${type}` as const,
    data: jobData
  };
  
  // Validate job event structure
  const validatedEvent = JobEventSchema.safeParse(event);
  if (!validatedEvent.success) {
    logger.error("Invalid job event structure", "SSE:jobs", {
      type,
      errors: validatedEvent.error.issues,
      jobData
    });
    return;
  }
  
  emitSSEEvent('jobs', validatedEvent.data);
}

/**
 * Emit node-related events with type validation
 */
export function emitNodeEvent(type: 'created' | 'updated' | 'deleted' | 'status_changed', nodeData?: NodeEventData) {
  const event = {
    type: `node_${type}` as const,
    data: nodeData
  };
  
  // Validate node event structure
  const validatedEvent = NodeEventSchema.safeParse(event);
  if (!validatedEvent.success) {
    logger.error("Invalid node event structure", "SSE:nodes", {
      type,
      errors: validatedEvent.error.issues,
      nodeData
    });
    return;
  }
  
  emitSSEEvent('nodes', validatedEvent.data);
}

/**
 * Emit user-related events with type validation
 */
export function emitUserEvent(type: 'created' | 'updated' | 'deleted' | 'status_changed', userData?: UserEventData) {
  const event = {
    type: `user_${type}` as const,
    data: userData
  };
  
  // Validate user event structure
  const validatedEvent = UserEventSchema.safeParse(event);
  if (!validatedEvent.success) {
    logger.error("Invalid user event structure", "SSE:users", {
      type,
      errors: validatedEvent.error.issues,
      userData
    });
    return;
  }
  
  emitSSEEvent('users', validatedEvent.data);
}

/**
 * Emit system events (ping, connected, etc.)
 */
export function emitSystemEvent(type: 'ping' | 'connected' | 'disconnected' | 'error', data?: { message?: string; channel?: string }) {
  const event = {
    type,
    data
  };
  
  // Validate system event structure
  const validatedEvent = SystemEventSchema.safeParse(event);
  if (!validatedEvent.success) {
    logger.error("Invalid system event structure", "SSE:system", {
      type,
      errors: validatedEvent.error.issues,
      data
    });
    return;
  }
  
  emitSSEEvent('system', validatedEvent.data);
}