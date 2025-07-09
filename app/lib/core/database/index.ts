/**
 * Database module exports - centralized database operations
 * All database-related functionality is accessible through this index
 */

// Core database functionality
export {
  getDatabase,
  closeDatabase,
  resetDatabase
} from './connection';

export {
  validateData,
  selectQuery,
  executeQuery,
  buildUpdateSQL,
  handleDbError,
  logDbSuccess
} from './db-utils';

// Job operations
export {
  createJob,
  findJobById,
  findAllJobs,
  findJobsByStatus,
  findJobsByUser,
  findJobsByNode,
  updateJobStatus,
  updateJob,
  deleteJob,
  assignJobToNode,
  countUserRunningJobs
} from './job-operations';
export type {
  CreateJobInput,
  UpdateJobInput
} from './job-operations';

// Node operations
export {
  createNode,
  findNodeById,
  findAllNodes,
  findActiveNodes,
  findAvailableNodes,
  updateNodeStatus,
  updateNode,
  deleteNode,
  activateNode,
  deactivateNode,
  findNodeByHostname
} from './node-operations';
export type {
  CreateNodeInput,
  UpdateNodeInput
} from './node-operations';

// User operations
export {
  createUser,
  findUserById,
  findUserByDisplayName,
  findAllUsers,
  findActiveUsers,
  updateUser,
  deleteUser,
  activateUser,
  deactivateUser,
  getCurrentJobCount,
  canCreateJob
} from './user-operations';
export type {
  CreateUserInput,
  UpdateUserInput
} from './user-operations';

// File operations
export {
  createFileRecord,
  findFileById,
  findAllFiles,
  findFilesByUploader,
  findFileByStoredName,
  updateFileRecord,
  deleteFileRecord,
  getTotalFileSize,
  getFileCount
} from './file-operations';
export type {
  CreateFileInput,
  UpdateFileInput
} from './file-operations';

// Job log operations
export {
  createJobLog,
  findJobLogById,
  findJobLogsByJobId,
  findJobLogsByLevel,
  findRecentJobLogs,
  deleteJobLogs,
  deleteOldJobLogs,
  countJobLogs
} from './job-log-operations';
export type {
  CreateJobLogInput
} from './job-log-operations';

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