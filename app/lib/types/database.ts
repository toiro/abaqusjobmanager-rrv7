/**
 * Enhanced type-safe database operations with Generics
 */

import { z } from 'zod';

// Base entity interface with Generics
export interface BaseEntity {
  id?: number;
  created_at?: string;
  updated_at?: string;
}

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
  is_active: z.union([z.boolean(), z.number()]).transform(val => Boolean(val)).default(true),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const UserSchema = z.object({
  id: z.number().optional(),
  display_name: z.string().min(2),
  max_concurrent_jobs: z.number().min(1).default(1),
  is_active: z.union([z.boolean(), z.number()]).transform(val => Boolean(val)).default(true),
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

// Generic repository interface
export interface TypedRepository<TEntity extends BaseEntity, TCreateInput, TUpdateInput> {
  findAll(): TEntity[];
  findById(id: number): TEntity | null;
  findBy<K extends keyof TEntity>(field: K, value: TEntity[K]): TEntity[];
  create(data: TCreateInput): number;
  update(id: number, data: TUpdateInput): boolean;
  delete(id: number): boolean;
  validate(data: unknown): TEntity | null;
}

// Specialized job operations with type constraints
export interface TypedJobOperations extends TypedRepository<
  Job, 
  Omit<Job, 'id' | 'created_at' | 'updated_at'>, 
  Partial<Omit<Job, 'id' | 'created_at' | 'updated_at'>>
> {
  findByStatus(status: Job['status']): Job[];
  findByUser(userId: number): Job[];
  findByNode(nodeId: number): Job[];
  updateStatus(id: number, status: Job['status']): boolean;
}

// Result type for safe operations
export type DatabaseResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
  details?: unknown;
};

// Generic query builder
export interface TypedQueryBuilder<TEntity> {
  where<K extends keyof TEntity>(field: K, operator: '=' | '!=' | '>' | '<' | 'LIKE', value: TEntity[K]): TypedQueryBuilder<TEntity>;
  orderBy<K extends keyof TEntity>(field: K, direction?: 'ASC' | 'DESC'): TypedQueryBuilder<TEntity>;
  limit(count: number): TypedQueryBuilder<TEntity>;
  offset(count: number): TypedQueryBuilder<TEntity>;
  execute(): TEntity[];
  first(): TEntity | null;
  count(): number;
}