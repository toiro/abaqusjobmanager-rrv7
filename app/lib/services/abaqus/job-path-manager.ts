/**
 * Job Path Manager - Martin Fowler Extract Class 適用
 * AbaqusJobRunnerからパス管理責任を分離
 */

import type { PersistedJob, PersistedNode } from "../../core/types/database";
import { getLogger } from "../../core/logger/logger.server";

/**
 * JobPathManager - Single Responsibility Principle適用
 * ジョブパス管理のみに責任を集中
 */
export class JobPathManager {
  private readonly logger = getLogger();
  
  // リモートジョブパスの一時保存（アップロード→ダウンロード間）
  private remoteJobPaths: Map<string, string> = new Map();

  /**
   * リモートジョブディレクトリ作成
   */
  createRemoteJobDirectory(job: PersistedJob, node: PersistedNode): string {
    // ユニークなリモートディレクトリパス
    const timestamp = Date.now();
    const remoteJobPath = `/tmp/abaqus-jobs/job-${job.id}-${timestamp}`;
    
    // 作成したパスを一時的にメモリに保存（後でダウンロード時に使用）
    const jobKey = this.createJobKey(job.id, node.id);
    this.remoteJobPaths.set(jobKey, remoteJobPath);
    
    this.logger.debug(`Created remote job directory: ${remoteJobPath}`, 'JobPathManager', {
      jobId: job.id,
      nodeId: node.id,
      jobKey
    });

    return remoteJobPath;
  }

  /**
   * リモートジョブディレクトリパス取得
   */
  getRemoteJobDirectory(job: PersistedJob, node: PersistedNode): string {
    const jobKey = this.createJobKey(job.id, node.id);
    const savedPath = this.remoteJobPaths.get(jobKey);
    
    if (savedPath) {
      this.logger.debug(`Retrieved saved remote path for job ${job.id}: ${savedPath}`, 'JobPathManager');
      return savedPath;
    }
    
    // フォールバック: ワイルドカードを使用
    const fallbackPath = `/tmp/abaqus-jobs/job-${job.id}-*`;
    this.logger.warn(`No saved remote path for job ${job.id}, using wildcard: ${fallbackPath}`, 'JobPathManager');
    return fallbackPath;
  }

  /**
   * リモートジョブディレクトリのクリーンアップ
   */
  cleanupRemoteJobDirectory(job: PersistedJob, node: PersistedNode): void {
    const jobKey = this.createJobKey(job.id, node.id);
    const removed = this.remoteJobPaths.delete(jobKey);
    
    if (removed) {
      this.logger.debug(`Cleaned up remote path mapping for job ${job.id}`, 'JobPathManager', {
        jobKey
      });
    }
  }

  /**
   * 保存されているパス数を取得（デバッグ用）
   */
  getStoredPathCount(): number {
    return this.remoteJobPaths.size;
  }

  /**
   * すべてのパスをクリア（メンテナンス用）
   */
  clearAllPaths(): void {
    const count = this.remoteJobPaths.size;
    this.remoteJobPaths.clear();
    
    this.logger.info(`Cleared all remote path mappings`, 'JobPathManager', {
      clearedCount: count
    });
  }

  // === Private Methods ===

  /**
   * ジョブキーの生成
   */
  private createJobKey(jobId: number, nodeId: number): string {
    return `${jobId}-${nodeId}`;
  }
}