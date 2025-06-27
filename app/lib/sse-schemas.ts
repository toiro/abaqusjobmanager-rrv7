import { z } from 'zod';

// Channel types - 型安全なチャンネル定義
export const SSEChannelSchema = z.enum(['files', 'jobs', 'nodes', 'users', 'system']);
export type SSEChannel = z.infer<typeof SSEChannelSchema>;

// Base SSE event schema
export const SSEEventSchema = z.object({
  type: z.string(),
  data: z.unknown().optional(),
  timestamp: z.string().optional(),
  channel: SSEChannelSchema.optional()
});

// File event data schemas - aligned with database schema
export const FileEventDataSchema = z.object({
  fileId: z.number().optional(), // maps to id
  fileName: z.string().optional(), // maps to original_name
  fileSize: z.number().optional(), // maps to file_size
  mimeType: z.string().optional(), // maps to mime_type
  uploadedBy: z.string().optional() // maps to uploaded_by
});

export const FileEventSchema = SSEEventSchema.extend({
  type: z.enum(['file_created', 'file_updated', 'file_deleted']),
  data: FileEventDataSchema.optional()
});

// Job event data schemas - aligned with database schema
export const JobEventDataSchema = z.object({
  jobId: z.number().optional(), // maps to id
  jobName: z.string().optional(), // maps to name
  status: z.enum(['waiting', 'starting', 'running', 'completed', 'failed', 'missing']).optional(), // matches database status enum
  nodeId: z.number().optional(), // maps to node_id
  userId: z.number().optional(), // maps to user_id
  cpuCores: z.number().optional(), // maps to cpu_cores
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional() // matches database priority enum
});

export const JobEventSchema = SSEEventSchema.extend({
  type: z.enum(['job_created', 'job_updated', 'job_deleted', 'job_status_changed']),
  data: JobEventDataSchema.optional()
});

// Node event data schemas - aligned with database schema
export const NodeEventDataSchema = z.object({
  nodeId: z.number().optional(), // maps to id
  nodeName: z.string().optional(), // maps to name
  hostname: z.string().optional(), // maps to hostname
  sshPort: z.number().optional(), // maps to ssh_port
  maxCpuCores: z.number().optional(), // maps to max_cpu_cores
  isActive: z.boolean().optional() // maps to is_active
});

export const NodeEventSchema = SSEEventSchema.extend({
  type: z.enum(['node_created', 'node_updated', 'node_deleted', 'node_status_changed']),
  data: NodeEventDataSchema.optional()
});

// User event data schemas - aligned with database schema
export const UserEventDataSchema = z.object({
  userId: z.number().optional(), // maps to id
  userName: z.string().optional(), // maps to display_name
  maxConcurrentJobs: z.number().optional(), // maps to max_concurrent_jobs
  isActive: z.boolean().optional() // maps to is_active
});

export const UserEventSchema = SSEEventSchema.extend({
  type: z.enum(['user_created', 'user_updated', 'user_deleted', 'user_status_changed']),
  data: UserEventDataSchema.optional()
});

// System event schemas
export const SystemEventSchema = SSEEventSchema.extend({
  type: z.enum(['ping', 'connected', 'disconnected', 'error']),
  data: z.object({
    message: z.string().optional(),
    channel: z.string().optional()
  }).optional()
});

// Discriminated union of all possible SSE events
export const SSEEventUnionSchema = z.discriminatedUnion('type', [
  FileEventSchema,
  JobEventSchema,
  NodeEventSchema,
  UserEventSchema,
  SystemEventSchema
]);

// Generic SSE event type with payload - 型安全なチャンネル
export type SSEEvent<TData = unknown> = {
  type: string;
  data?: TData;
  timestamp?: string;
  channel?: SSEChannel;
};

// Specific event types with proper data typing
export type FileEvent = z.infer<typeof FileEventSchema>;
export type FileEventData = z.infer<typeof FileEventDataSchema>;
export type JobEvent = z.infer<typeof JobEventSchema>;
export type JobEventData = z.infer<typeof JobEventDataSchema>;
export type NodeEvent = z.infer<typeof NodeEventSchema>;
export type NodeEventData = z.infer<typeof NodeEventDataSchema>;
export type UserEvent = z.infer<typeof UserEventSchema>;
export type UserEventData = z.infer<typeof UserEventDataSchema>;
export type SystemEvent = z.infer<typeof SystemEventSchema>;

// Union type for all possible events
export type SSEEventUnion = z.infer<typeof SSEEventUnionSchema>;

// Type guards for event discrimination
export const isFileEvent = (event: SSEEventUnion): event is FileEvent => 
  event.type.startsWith('file_');

export const isJobEvent = (event: SSEEventUnion): event is JobEvent => 
  event.type.startsWith('job_');

export const isNodeEvent = (event: SSEEventUnion): event is NodeEvent => 
  event.type.startsWith('node_');

export const isUserEvent = (event: SSEEventUnion): event is UserEvent => 
  event.type.startsWith('user_');

export const isSystemEvent = (event: SSEEventUnion): event is SystemEvent => 
  ['ping', 'connected', 'disconnected', 'error'].includes(event.type);

// Generic validation helper
export function validateSSEEvent<T = unknown>(
  event: unknown, 
  schema: z.ZodSchema<T>
): T | null {
  try {
    return schema.parse(event);
  } catch {
    return null;
  }
}

// Specific validation functions
export function validateFileEvent(event: unknown): FileEvent | null {
  return validateSSEEvent(event, FileEventSchema);
}

export function validateJobEvent(event: unknown): JobEvent | null {
  return validateSSEEvent(event, JobEventSchema);
}

export function validateNodeEvent(event: unknown): NodeEvent | null {
  return validateSSEEvent(event, NodeEventSchema);
}

export function validateUserEvent(event: unknown): UserEvent | null {
  return validateSSEEvent(event, UserEventSchema);
}

export function validateSystemEvent(event: unknown): SystemEvent | null {
  return validateSSEEvent(event, SystemEventSchema);
}

export function validateSSEEventUnion(event: unknown): SSEEventUnion | null {
  return validateSSEEvent(event, SSEEventUnionSchema);
}

// Enhanced channel-specific event validation with type mapping
type ChannelEventMap = {
  'jobs': JobEvent;
  'files': FileEvent;
  'nodes': NodeEvent;
  'users': UserEvent;
  'system': SystemEvent;
};

// Type-safe channel validation
export function validateEventForChannel<TChannel extends SSEChannel>(
  data: unknown,
  channel: TChannel
): ChannelEventMap[TChannel] | null {
  if (!isValidChannel(channel)) {
    return null;
  }

  const unionEvent = validateSSEEventUnion(data);
  if (!unionEvent) {
    return null;
  }

  // Channel-specific validation with proper type mapping
  switch (channel) {
    case 'jobs':
      return isJobEvent(unionEvent) ? (unionEvent as ChannelEventMap[TChannel]) : null;
    case 'files':
      return isFileEvent(unionEvent) ? (unionEvent as ChannelEventMap[TChannel]) : null;
    case 'nodes':
      return isNodeEvent(unionEvent) ? (unionEvent as ChannelEventMap[TChannel]) : null;
    case 'users':
      return isUserEvent(unionEvent) ? (unionEvent as ChannelEventMap[TChannel]) : null;
    case 'system':
      return isSystemEvent(unionEvent) ? (unionEvent as ChannelEventMap[TChannel]) : null;
    default:
      // Exhaustive check - TypeScript will catch unhandled cases
      const _exhaustiveCheck: never = channel;
      return null;
  }
}

// Type-safe event channel mapping
export function getChannelForEvent(event: SSEEventUnion): SSEChannel {
  if (isJobEvent(event)) return 'jobs';
  if (isFileEvent(event)) return 'files';
  if (isNodeEvent(event)) return 'nodes';
  if (isUserEvent(event)) return 'users';
  if (isSystemEvent(event)) return 'system';
  
  // Exhaustive check - should never reach here
  const _exhaustiveCheck: never = event;
  throw new Error(`Unhandled event type: ${(_exhaustiveCheck as any).type}`);
}

// Type-safe event validation with result type
export type EventValidationResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
};

export function validateSSEEventSafe<T extends SSEEventUnion = SSEEventUnion>(
  data: unknown
): EventValidationResult<T> {
  try {
    const result = validateSSEEventUnion(data);
    if (result) {
      return { success: true, data: result as T };
    } else {
      return { success: false, error: 'Event validation failed' };
    }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown validation error' 
    };
  }
}

// チャンネル名の検証ヘルパー
export function isValidChannel(channel: string): channel is SSEChannel {
  return SSEChannelSchema.safeParse(channel).success;
}

// Type-safe SSE event creation helpers
export function createJobEvent(
  type: JobEvent['type'],
  data?: JobEventData
): JobEvent {
  return {
    type,
    data,
    timestamp: new Date().toISOString(),
    channel: 'jobs'
  };
}

export function createFileEvent(
  type: FileEvent['type'],
  data?: FileEventData
): FileEvent {
  return {
    type,
    data,
    timestamp: new Date().toISOString(),
    channel: 'files'
  };
}

export function createNodeEvent(
  type: NodeEvent['type'],
  data?: NodeEventData
): NodeEvent {
  return {
    type,
    data,
    timestamp: new Date().toISOString(),
    channel: 'nodes'
  };
}

export function createSystemEvent(
  type: SystemEvent['type'],
  data?: SystemEvent['data']
): SystemEvent {
  return {
    type,
    data,
    timestamp: new Date().toISOString(),
    channel: 'system'
  };
}