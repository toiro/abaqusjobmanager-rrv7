/**
 * Abaqus Job Runner - Martin Fowler Extract Class 適用後
 * 
 * 責任を分離し、コーディネーターとしての役割に特化
 * 各特化クラスを統合してジョブ実行を管理
 */

import { getLogger } from "../../core/logger/logger.server";
import { jobRepository } from "../../core/database/server-operations";
import type { PersistedJob, PersistedNode } from "../../core/types/database";
import { FileTransferManager, type FileTransferResult } from "./file-transfer-manager";
import { AbaqusExecutor } from "./abaqus-executor";
import { JobPathManager } from "./job-path-manager";

// ジョブ実行結果型
export interface JobExecutionResult {
  success: boolean;
  jobId: number;
  executionTime: number;
  outputFiles: string[];
  errorMessage?: string;
  remotePath?: string;
  localResultPath?: string;
}

// 実行コンテキスト型 - Extract Method で導入
interface JobExecutionContext {
  startTime: number;
  executionId: string;
  job: PersistedJob;
  node: PersistedNode;
}

/**
 * AbaqusJobRunner - Martin Fowler Extract Class 適用後
 * コーディネーターとしての役割に特化
 */
export class AbaqusJobRunner {
  private readonly logger = getLogger();
  
  // 特化クラスのインスタンス - Dependency Injectionの基礎
  private readonly fileTransferManager = new FileTransferManager();
  private readonly abaqusExecutor = new AbaqusExecutor();
  private readonly jobPathManager = new JobPathManager();

  /**
   * メインジョブ実行メソッド - Martin Fowler Extract Method適用
   * 責任を明確に分離し、可読性と保守性を向上
   */
  async executeJob(job: PersistedJob, node: PersistedNode): Promise<JobExecutionResult> {
    const context = this.createExecutionContext(job, node);
    
    try {
      this.validateJobForExecution(job);
      
      const uploadResult = await this.executeUploadPhase(job, node);
      await this.executeAbaqusPhase(job, node, uploadResult.path);
      const downloadResult = await this.executeDownloadPhase(job, node);
      
      return this.buildSuccessResult(context, uploadResult, downloadResult);
    } catch (error) {
      return await this.buildErrorResult(context, error);
    }
  }

  /**
   * Extract Method: 実行コンテキストの作成
   */
  private createExecutionContext(job: PersistedJob, node: PersistedNode): JobExecutionContext {
    const startTime = Date.now();
    const executionId = `job-${job.id}-${startTime}`;
    
    this.logger.info(`Starting job execution: ${job.name}`, 'AbaqusJobRunner', {
      jobId: job.id,
      nodeId: node.id,
      executionId
    });
    
    return { startTime, executionId, job, node };
  }

  /**
   * Extract Method: ジョブ実行前バリデーション
   */
  private validateJobForExecution(job: PersistedJob): void {
    if (job.id <= 0) {
      throw new Error('Valid Job ID is required for execution');
    }
  }

  /**
   * Extract Method: ファイルアップロードフェーズ - 特化クラスへ委譲
   */
  private async executeUploadPhase(job: PersistedJob, node: PersistedNode): Promise<FileTransferResult> {
    await this.updateJobStatus(job.id, 'starting', 'Uploading files...');
    
    // リモートパスを作成して管理
    const remotePath = this.jobPathManager.createRemoteJobDirectory(job, node);
    
    // FileTransferManagerへ委譲
    const uploadResult = await this.fileTransferManager.uploadFiles(job, node);
    
    if (!uploadResult.success) {
      throw new Error(`File upload failed: ${uploadResult.errorMessage}`);
    }
    
    // 成功時はパスを上書き（FileTransferManagerが実際のパスを返す）
    uploadResult.path = remotePath;
    
    return uploadResult;
  }

  /**
   * Extract Method: Abaqus実行フェーズ - 特化クラスへ委譲
   */
  private async executeAbaqusPhase(job: PersistedJob, node: PersistedNode, remotePath: string): Promise<void> {
    await this.updateJobStatus(job.id, 'running', 'Executing Abaqus...');
    
    // AbaqusExecutorへ委譲、ステータス更新コールバック付き
    await this.abaqusExecutor.runAbaqus(
      job, 
      node, 
      remotePath,
      async (status, message) => {
        await this.updateJobStatus(job.id, status as any, message);
      }
    );
  }

  /**
   * Extract Method: 結果ダウンロードフェーズ - 特化クラスへ委譲
   */
  private async executeDownloadPhase(job: PersistedJob, node: PersistedNode): Promise<FileTransferResult> {
    await this.updateJobStatus(job.id, 'running', 'Collecting results...');
    
    // 保存されたリモートパスを取得
    const remotePath = this.jobPathManager.getRemoteJobDirectory(job, node);
    
    // FileTransferManagerへ委譲
    const downloadResult = await this.fileTransferManager.downloadResults(job, node, remotePath);

    if (!downloadResult.success) {
      this.logger.warn(`Result download failed for job ${job.id}`, 'AbaqusJobRunner', {
        error: downloadResult.errorMessage
      });
    } else {
      // 成功時はパス管理をクリーンアップ
      this.jobPathManager.cleanupRemoteJobDirectory(job, node);
    }
    
    return downloadResult;
  }

  /**
   * Extract Method: 成功時の結果構築
   */
  private async buildSuccessResult(
    context: JobExecutionContext,
    uploadResult: FileTransferResult,
    downloadResult: FileTransferResult
  ): Promise<JobExecutionResult> {
    await this.updateJobStatus(context.job.id, 'completed', 'Job completed successfully');
    
    const executionTime = Date.now() - context.startTime;
    
    this.logger.info(`Job execution completed: ${context.job.name}`, 'AbaqusJobRunner', {
      jobId: context.job.id,
      executionTime,
      executionId: context.executionId
    });

    return {
      success: true,
      jobId: context.job.id,
      executionTime,
      outputFiles: downloadResult.success ? [downloadResult.path] : [],
      remotePath: uploadResult.path,
      localResultPath: downloadResult.success ? downloadResult.path : undefined
    };
  }

  /**
   * Extract Method: エラー時の結果構築
   */
  private async buildErrorResult(
    context: JobExecutionContext,
    error: unknown
  ): Promise<JobExecutionResult> {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    this.logger.error(`Job execution failed: ${context.job.name}`, 'AbaqusJobRunner', {
      jobId: context.job.id,
      error: errorMessage,
      executionId: context.executionId
    });

    await this.updateJobStatus(context.job.id, 'failed', errorMessage);

    return {
      success: false,
      jobId: context.job.id,
      executionTime: Date.now() - context.startTime,
      outputFiles: [],
      errorMessage
    };
  }

  /**
   * ジョブステータス更新とSSEイベント発信
   */
  private async updateJobStatus(jobId: number, status: PersistedJob['status'], message?: string): Promise<void> {
    try {
      // データベース更新
      const success = jobRepository.updateJobStatus(jobId, status, message);
      
      if (success) {
        // SSEイベント発信（簡易版）
        const { emitSSE } = await import("../sse/sse.server");
        const event = {
          type: 'job_status_changed',
          data: {
            jobId,
            status,
            message,
            timestamp: new Date().toISOString()
          },
          timestamp: new Date().toISOString(),
          channel: 'jobs'
        };
        emitSSE('jobs', JSON.stringify(event));

        this.logger.debug(`Job status updated: ${jobId} -> ${status}`, 'AbaqusJobRunner', {
          message
        });
      } else {
        this.logger.error(`Failed to update job status: ${jobId}`, 'AbaqusJobRunner');
      }
    } catch (error) {
      this.logger.error(`Error updating job status: ${jobId}`, 'AbaqusJobRunner', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}