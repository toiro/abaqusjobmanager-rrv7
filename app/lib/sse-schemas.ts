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

// File event data schemas
export const FileEventDataSchema = z.object({
  fileId: z.number().optional(),
  fileName: z.string().optional(),
  fileSize: z.number().optional(),
  mimeType: z.string().optional(),
  uploadedBy: z.string().optional()
});

export const FileEventSchema = SSEEventSchema.extend({
  type: z.enum(['file_created', 'file_updated', 'file_deleted']),
  data: FileEventDataSchema.optional()
});

// Job event data schemas
export const JobEventDataSchema = z.object({
  jobId: z.number().optional(),
  jobName: z.string().optional(),
  status: z.enum(['waiting', 'running', 'completed', 'failed', 'cancelled']).optional(),
  nodeId: z.number().optional(),
  userId: z.number().optional(),
  cpuCores: z.number().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional()
});

export const JobEventSchema = SSEEventSchema.extend({
  type: z.enum(['job_created', 'job_updated', 'job_deleted', 'job_status_changed']),
  data: JobEventDataSchema.optional()
});

// Node event data schemas
export const NodeEventDataSchema = z.object({
  nodeId: z.number().optional(),
  nodeName: z.string().optional(),
  hostname: z.string().optional(),
  ipAddress: z.string().optional(),
  status: z.enum(['active', 'inactive', 'maintenance']).optional(),
  cpuCores: z.number().optional(),
  memoryGb: z.number().optional()
});

export const NodeEventSchema = SSEEventSchema.extend({
  type: z.enum(['node_created', 'node_updated', 'node_deleted', 'node_status_changed']),
  data: NodeEventDataSchema.optional()
});

// User event data schemas
export const UserEventDataSchema = z.object({
  userId: z.number().optional(),
  userName: z.string().optional(),
  email: z.string().optional(),
  role: z.enum(['admin', 'user']).optional(),
  status: z.enum(['active', 'inactive']).optional()
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

// Channel-specific validators - 型安全なチャンネル
export function validateEventForChannel<T extends SSEEventUnion>(
  event: unknown,
  channel: SSEChannel
): T | null {
  const validatedEvent = validateSSEEventUnion(event);
  if (!validatedEvent) return null;

  switch (channel) {
    case 'files':
      return isFileEvent(validatedEvent) ? (validatedEvent as T) : null;
    case 'jobs':
      return isJobEvent(validatedEvent) ? (validatedEvent as T) : null;
    case 'nodes':
      return isNodeEvent(validatedEvent) ? (validatedEvent as T) : null;
    case 'users':
      return isUserEvent(validatedEvent) ? (validatedEvent as T) : null;
    case 'system':
      return isSystemEvent(validatedEvent) ? (validatedEvent as T) : null;
    default:
      // この分岐は到達不能（exhaustive check）
      return ((value: never): null => null)(channel);
  }
}

// チャンネル名の検証ヘルパー
export function isValidChannel(channel: string): channel is SSEChannel {
  return SSEChannelSchema.safeParse(channel).success;
}