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

// Repository-based operations - Martin Fowler Template Method Pattern
// All database operations now go through Repository instances for consistency

// Repository instances
export { nodeRepository } from './node-repository';
export { jobRepository } from './job-repository';
export { fileRepository } from './file-repository';
export { userRepository } from './user-repository';
export { jobLogRepository } from './job-log-repository';

// Convenience functions that use repositories
import { fileRepository } from './file-repository';
import { userRepository } from './user-repository';

export const findAllFilesWithJobs = () => fileRepository.findAllFilesWithJobs();
export const updateUser = (data: any) => userRepository.updateUser(data);
export const deleteUser = (id: number) => userRepository.deleteUser(id);