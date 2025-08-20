/**
 * Job Repository Interface
 *
 * ジョブアグリゲートの永続化を担うリポジトリのインターフェース
 * 実装は Infrastructure 層で行う
 */

import type { 
  Job, 
  PersistedJob, 
  CreateJob, 
  UpdateJob 
} from "../../shared/core/types/database";
import type { JobId, NodeId, UserId } from "../value-objects/entity-ids";

/**
 * Job Repository Interface (Functional DDD)
 *
 * 関数型ジョブの永続化インターフェース
 */
export interface JobRepository {
  // === Basic CRUD Operations ===
  
  /**
   * ジョブを作成
   */
  createJob(data: CreateJob): JobId;

  /**
   * IDでジョブを検索
   */
  findJobById(id: JobId): PersistedJob | null;

  /**
   * すべてのジョブを取得
   */
  findAllJobs(): PersistedJob[];

  /**
   * ジョブを更新
   */
  updateJob(data: UpdateJob): boolean;

  /**
   * ジョブを削除
   */
  deleteJob(id: JobId): boolean;

  // === Query Methods ===

  /**
   * ステータスでジョブを検索
   */
  findJobsByStatus(status: Job["status"]): PersistedJob[];

  /**
   * 複数のステータスでジョブを検索
   */
  findJobsByStatuses(statuses: Job["status"][]): PersistedJob[];

  /**
   * ユーザーでジョブを検索
   */
  findJobsByUser(userId: UserId): PersistedJob[];

  /**
   * ノードでジョブを検索
   */
  findJobsByNode(nodeId: NodeId): PersistedJob[];

  /**
   * アクティブなジョブを検索
   */
  findActiveJobs(): PersistedJob[];

  /**
   * 完了済みジョブを検索
   */
  findCompletedJobs(): PersistedJob[];

  // === Update Methods ===

  /**
   * ジョブステータスを更新
   */
  updateJobStatus(
    id: JobId,
    status: Job["status"],
    errorMessage?: string
  ): boolean;

  /**
   * 開始時刻を更新
   */
  updateStartTime(id: JobId, startTime: string): boolean;

  /**
   * 終了時刻を更新
   */
  updateEndTime(id: JobId, endTime: string): boolean;
}