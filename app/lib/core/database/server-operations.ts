/**
 * サーバー専用データベース操作
 * このファイルはクライアントサイドでインポートされません
 */

// すべてのデータベース操作をここにエクスポート
export {
  getDatabase,
  closeDatabase,
  resetDatabase
} from './connection.server';

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
  calculateNodeUtilization,
  countNodeRunningJobs
} from './node-operations';

// User operations
export {
  createUser,
  findUserById,
  findAllUsers,
  findActiveUsers,
  updateUser,
  deleteUser,
  userExists,
  findUserByName
} from './user-operations';

// File operations
export {
  createFileRecord,
  findFileById,
  findAllFiles,
  findFilesByUploader,
  updateFileRecord,
  deleteFile,
  findFilesByJob,
  calculateStorageUsage
} from './file-operations';

// Job log operations
export {
  createJobLog,
  findJobLogById,
  findJobLogsByJob,
  findRecentJobLogs,
  deleteJobLog,
  deleteJobLogsByJob
} from './job-log-operations';