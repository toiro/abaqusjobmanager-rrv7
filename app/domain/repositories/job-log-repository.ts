/**
 * JobLog Repository Interface
 *
 * ジョブログアグリゲートの永続化を担うリポジトリのインターフェース
 * 実装は Infrastructure 層で行う
 */

import type { 
  JobLog,
  PersistedJobLog, 
  CreateJobLog, 
  UpdateJobLogInput 
} from "../../shared/core/types/database";
import type { JobLogId } from "../value-objects/entity-ids";

/**
 * JobLog Repository Interface (Functional DDD)
 *
 * 関数型ジョブログの永続化インターフェース
 */
export interface JobLogRepository {
  // === Basic CRUD Operations ===
  
  /**
   * ジョブログを作成
   */
  createJobLog(data: CreateJobLog): JobLogId;

  /**
   * IDでジョブログを検索
   */
  findJobLogById(id: JobLogId): PersistedJobLog | null;

  /**
   * すべてのジョブログを取得
   */
  findAllJobLogs(): PersistedJobLog[];

  /**
   * ジョブログを更新
   */
  updateJobLog(data: CreateJobLog & { id: number }): boolean;

  /**
   * ジョブログを削除
   */
  deleteJobLog(id: number): boolean;

  // === Query Methods ===

  /**
   * ジョブIDでログを検索
   */
  findJobLogsByJobId(jobId: number): PersistedJobLog[];

  /**
   * ログレベルでログを検索
   */
  findJobLogsByLevel(
    jobId: number,
    level: JobLog["log_level"]
  ): PersistedJobLog[];

  /**
   * 最近のログを検索
   */
  findRecentJobLogs(jobId: number, limit?: number): PersistedJobLog[];

  // === Bulk Operations ===

  /**
   * ジョブの全ログを削除
   */
  deleteJobLogs(jobId: number): boolean;

  /**
   * 古いログを削除
   */
  deleteOldJobLogs(daysOld?: number): number;

  // === Statistics ===

  /**
   * ジョブのログ数を取得
   */
  countJobLogs(jobId: number): number;
}