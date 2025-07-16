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
  JobSchema,
  NodeSchema,
  UserSchema,
  FileRecordSchema,
  JobLogSchema
} from '../types/database';

// Operation input/output types for type safety
export type {
  CreateJobInput,
  UpdateJobInput
} from './job-operations';

export type {
  CreateNodeInput,
  UpdateNodeInput
} from './node-operations';

export type {
  CreateUserInput,
  UpdateUserInput
} from './user-operations';

export type {
  CreateFileInput,
  UpdateFileInput,
  FileWithJobs
} from './file-operations';

export type {
  CreateJobLogInput
} from './job-log-operations';