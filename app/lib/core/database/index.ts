/**
 * Database module exports - TYPES ONLY for client-side usage
 * 
 * IMPORTANT: This file should only export types that are safe for client-side usage.
 * All actual database operations are moved to server-operations.ts
 */

// Database entity types (from the single source of truth)
export type {
  Job,
  Node, 
  User,
  FileRecord,
  JobLog,
  // Create types
  CreateJob,
  CreateNode,
  CreateUser,
  CreateFileRecord,
  CreateJobLog,
  // Persisted types
  PersistedJob,
  PersistedNode,
  PersistedUser,
  PersistedFileRecord,
  PersistedJobLog,
  // Update types
  UpdateJob,
  UpdateNode,
  UpdateUser,
  UpdateFileRecord,
  // Schemas
  JobSchema,
  NodeSchema,
  UserSchema,
  FileRecordSchema,
  JobLogSchema,
  CreateJobSchema,
  CreateNodeSchema,
  CreateUserSchema,
  CreateFileRecordSchema,
  CreateJobLogSchema,
  PersistedJobSchema,
  PersistedNodeSchema,
  PersistedUserSchema,
  PersistedFileRecordSchema,
  PersistedJobLogSchema,
  UpdateJobSchema,
  UpdateNodeSchema,
  UpdateUserSchema,
  UpdateFileRecordSchema
} from '../types/database';

// Extended types 
export type {
  FileWithJobs
} from './file-repository';