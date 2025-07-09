/**
 * Database Type Definitions
 * Core entity schemas and types for the application
 */

import { z } from 'zod';


// Schemas for runtime validation
export const JobSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1),
  status: z.enum(['waiting', 'starting', 'running', 'completed', 'failed', 'missing']),
  node_id: z.number().nullable().optional(),
  file_id: z.number(),
  user_id: z.number(),
  cpu_cores: z.number().min(1),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  start_time: z.string().nullable().optional(),
  end_time: z.string().nullable().optional(),
  error_message: z.string().nullable().optional(),
  output_file_path: z.string().nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const NodeSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1),
  hostname: z.string().min(1),
  ssh_port: z.number().min(1).max(65535).default(22),
  max_cpu_cores: z.number().min(1),
  status: z.enum(['available', 'busy', 'unavailable']).default('unavailable').optional(),
  is_active: z.union([z.boolean(), z.number().int()]).transform(val => {
    if (typeof val === 'number') {
      return val === 1;
    }
    return Boolean(val);
  }).default(true),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const UserSchema = z.object({
  id: z.number().optional(),
  display_name: z.string().min(2),
  max_concurrent_jobs: z.number().min(1).default(1),
  is_active: z.union([z.boolean(), z.number().int()]).transform(val => {
    if (typeof val === 'number') {
      return val === 1;
    }
    return Boolean(val);
  }).default(true),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const FileRecordSchema = z.object({
  id: z.number().optional(),
  original_name: z.string().min(1),
  stored_name: z.string().min(1),
  file_path: z.string().min(1),
  mime_type: z.string().nullable().optional(),
  file_size: z.number().min(0),
  checksum: z.string().nullable().optional(),
  uploaded_by: z.string().nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const JobLogSchema = z.object({
  id: z.number().optional(),
  job_id: z.number(),
  log_level: z.enum(['info', 'warning', 'error', 'debug']),
  message: z.string().min(1),
  details: z.string().nullable().optional(),
  created_at: z.string().optional(),
});

// Inferred types
export type Job = z.infer<typeof JobSchema>;
export type Node = z.infer<typeof NodeSchema>;
export type User = z.infer<typeof UserSchema>;
export type FileRecord = z.infer<typeof FileRecordSchema>;
export type JobLog = z.infer<typeof JobLogSchema>;

