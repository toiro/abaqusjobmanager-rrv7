/**
 * Mock Abaqus Job Runner - 開発・テスト用
 * 
 * 実際のPowerShell実行やSSH接続を行わず、
 * AbaqusJobRunnerと同じインターフェースでシミュレートする
 */

import { getLogger } from "../../core/logger/logger.server";
import { jobRepository } from "../../core/database/server-operations";
import type { PersistedJob, PersistedNode } from "../../core/types/database";
import type { JobExecutionResult } from "./abaqus-job-runner.server";
import { promises as fs } from "fs";
import path from "path";

// モック実行設定
interface MockConfig {
  /** ファイル転送のシミュレート時間（ミリ秒） */
  uploadDurationMs?: number;
  /** Abaqus実行のシミュレート時間（ミリ秒） */
  executionDurationMs?: number;
  /** ダウンロードのシミュレート時間（ミリ秒） */
  downloadDurationMs?: number;
  /** エラーを発生させる確率（0-1） */
  errorRate?: number;
  /** 特定の段階でエラーを発生させるか */
  simulateErrors?: {
    upload?: boolean;
    execution?: boolean;
    download?: boolean;
  };
}

// ファイル転送結果型（本来の型と同じ）
interface FileTransferResult {
  success: boolean;
  path: string;
  transferTime: number;
  errorMessage?: string;
}

export class MockAbaqusJobRunner {
  private readonly logger = getLogger();
  private readonly config: MockConfig;
  
  // 🚨 重要: ファイル転送シリアル処理制御（本来と同じ）
  private static fileTransferQueue: Map<string, Promise<void>> = new Map();

  constructor(config: MockConfig = {}) {
    this.config = {
      uploadDurationMs: 2000,
      executionDurationMs: 5000,
      downloadDurationMs: 1500,
      errorRate: 0,
      simulateErrors: {},
      ...config
    };
  }

  /**
   * メインジョブ実行メソッド（本来と同じインターフェース）
   */
  async executeJob(job: PersistedJob, node: PersistedNode): Promise<JobExecutionResult> {
    const startTime = Date.now();
    const executionId = `mock-job-${job.id}-${startTime}`;
    
    this.logger.info(`[MOCK] Starting job execution: ${job.name}`, 'MockAbaqusJobRunner', {
      jobId: job.id,
      nodeId: node.id,
      executionId
    });

    try {
      // PersistedJob型のため、job.idは必ず存在する
      // ただし、0の場合は不正値として扱う
      if (job.id <= 0) {
        throw new Error('Valid Job ID is required for execution');
      }

      // Phase 1: ファイル転送（アップロード）
      await this.updateJobStatus(job.id, 'starting', '[MOCK] Uploading files...');
      const uploadResult = await this.simulateUpload(job, node);
      
      if (!uploadResult.success) {
        throw new Error(`[MOCK] File upload failed: ${uploadResult.errorMessage}`);
      }

      // Phase 2: Abaqus実行
      await this.updateJobStatus(job.id, 'running', '[MOCK] Executing Abaqus...');
      await this.simulateExecution(job, node);

      // Phase 3: 結果収集
      await this.updateJobStatus(job.id, 'running', '[MOCK] Collecting results...');
      const downloadResult = await this.simulateDownload(job, node);

      if (!downloadResult.success) {
        this.logger.warn(`[MOCK] Result download failed for job ${job.id}`, 'MockAbaqusJobRunner', {
          error: downloadResult.errorMessage
        });
      }

      // 完了処理
      await this.updateJobStatus(job.id, 'completed', '[MOCK] Job completed successfully');
      
      const executionTime = Date.now() - startTime;
      
      this.logger.info(`[MOCK] Job execution completed: ${job.name}`, 'MockAbaqusJobRunner', {
        jobId: job.id,
        executionTime,
        executionId
      });

      return {
        success: true,
        jobId: job.id,
        executionTime,
        outputFiles: downloadResult.success ? [downloadResult.path] : [],
        remotePath: uploadResult.path,
        localResultPath: downloadResult.success ? downloadResult.path : undefined
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown mock error';
      
      this.logger.error(`[MOCK] Job execution failed: ${job.name}`, 'MockAbaqusJobRunner', {
        jobId: job.id,
        error: errorMessage,
        executionId
      });

      await this.updateJobStatus(job.id, 'failed', errorMessage);

      return {
        success: false,
        jobId: job.id,
        executionTime: Date.now() - startTime,
        outputFiles: [],
        errorMessage
      };
    }
  }

  /**
   * アップロードシミュレート（シリアル処理）
   */
  private async simulateUpload(job: PersistedJob, node: PersistedNode): Promise<FileTransferResult> {
    const nodeKey = `${node.hostname}:${node.ssh_port || 22}`;
    
    // 🚨 重要: ノード別シリアル処理制御
    const previousTransfer = MockAbaqusJobRunner.fileTransferQueue.get(nodeKey);
    if (previousTransfer) {
      this.logger.debug(`[MOCK] Waiting for previous file transfer on node ${nodeKey}`, 'MockAbaqusJobRunner');
      await previousTransfer;
    }

    // ファイル転送シミュレーション
    const transferOperation = async (): Promise<FileTransferResult> => {
      return await this.executeUploadSimulation(job, node);
    };
    
    const queuePromise = transferOperation().then(() => {}).catch(() => {});
    MockAbaqusJobRunner.fileTransferQueue.set(nodeKey, queuePromise);

    try {
      const result = await transferOperation();
      return result;
    } finally {
      MockAbaqusJobRunner.fileTransferQueue.delete(nodeKey);
    }
  }

  /**
   * 実際のアップロードシミュレーション
   */
  private async executeUploadSimulation(job: PersistedJob, node: PersistedNode): Promise<FileTransferResult> {
    const startTime = Date.now();
    
    this.logger.debug(`[MOCK] Simulating file upload for job ${job.id}`, 'MockAbaqusJobRunner', {
      nodeHost: node.hostname,
      duration: `${this.config.uploadDurationMs}ms`
    });

    // エラーシミュレーション
    if (this.config.simulateErrors?.upload || Math.random() < (this.config.errorRate || 0)) {
      await this.delay(500); // 短い遅延後にエラー
      return {
        success: false,
        path: '',
        transferTime: Date.now() - startTime,
        errorMessage: '[MOCK] Simulated upload error'
      };
    }

    // 実際の遅延をシミュレート
    await this.delay(this.config.uploadDurationMs || 2000);

    const remotePath = `/tmp/abaqus-jobs/mock-job-${job.id}-${Date.now()}`;
    
    return {
      success: true,
      path: remotePath,
      transferTime: Date.now() - startTime
    };
  }

  /**
   * Abaqus実行シミュレート
   */
  private async simulateExecution(job: PersistedJob, node: PersistedNode): Promise<void> {
    this.logger.info(`[MOCK] Simulating Abaqus execution for job ${job.id}`, 'MockAbaqusJobRunner', {
      cpuCores: job.cpu_cores,
      duration: `${this.config.executionDurationMs}ms`
    });

    // エラーシミュレーション
    if (this.config.simulateErrors?.execution || Math.random() < (this.config.errorRate || 0)) {
      await this.delay(1000);
      throw new Error('[MOCK] Simulated Abaqus execution error');
    }

    // 実行中のステータス更新をシミュレート
    const totalTime = this.config.executionDurationMs || 5000;
    const updateIntervals = [0.2, 0.5, 0.8]; // 20%, 50%, 80%時点で更新

    for (const interval of updateIntervals) {
      await this.delay(totalTime * interval);
      await this.updateJobStatus(job.id, 'running', `[MOCK] Analysis ${Math.floor(interval * 100)}% completed...`);
    }

    // 残り時間を待機
    await this.delay(totalTime * (1 - updateIntervals[updateIntervals.length - 1]));
    
    this.logger.info(`[MOCK] Abaqus execution simulation completed for job ${job.id}`, 'MockAbaqusJobRunner');
  }

  /**
   * ダウンロードシミュレート（シリアル処理）
   */
  private async simulateDownload(job: PersistedJob, node: PersistedNode): Promise<FileTransferResult> {
    const nodeKey = `${node.hostname}:${node.ssh_port || 22}`;
    
    // 🚨 重要: ノード別シリアル処理制御
    const previousTransfer = MockAbaqusJobRunner.fileTransferQueue.get(nodeKey);
    if (previousTransfer) {
      this.logger.debug(`[MOCK] Waiting for previous file transfer on node ${nodeKey}`, 'MockAbaqusJobRunner');
      await previousTransfer;
    }

    const downloadOperation = async (): Promise<FileTransferResult> => {
      return await this.executeDownloadSimulation(job, node);
    };
    
    const queuePromise = downloadOperation().then(() => {}).catch(() => {});
    MockAbaqusJobRunner.fileTransferQueue.set(nodeKey, queuePromise);

    try {
      const result = await downloadOperation();
      return result;
    } finally {
      MockAbaqusJobRunner.fileTransferQueue.delete(nodeKey);
    }
  }

  /**
   * 実際のダウンロードシミュレーション
   */
  private async executeDownloadSimulation(job: PersistedJob, node: PersistedNode): Promise<FileTransferResult> {
    const startTime = Date.now();
    
    this.logger.debug(`[MOCK] Simulating result download for job ${job.id}`, 'MockAbaqusJobRunner', {
      nodeHost: node.hostname,
      duration: `${this.config.downloadDurationMs}ms`
    });

    // エラーシミュレーション
    if (this.config.simulateErrors?.download || Math.random() < (this.config.errorRate || 0)) {
      await this.delay(300);
      return {
        success: false,
        path: '',
        transferTime: Date.now() - startTime,
        errorMessage: '[MOCK] Simulated download error'
      };
    }

    // 実際の遅延をシミュレート
    await this.delay(this.config.downloadDurationMs || 1500);

    // モック結果ディレクトリの作成
    const resultDir = path.join(process.cwd(), 'mock-results', `job-${job.id}-${Date.now()}`);
    await fs.mkdir(resultDir, { recursive: true });
    
    // モック結果ファイルの作成
    const mockResultFile = path.join(resultDir, `job-${job.id}.odb`);
    await fs.writeFile(mockResultFile, `Mock Abaqus result for job ${job.id}\nGenerated at: ${new Date().toISOString()}`);
    
    return {
      success: true,
      path: resultDir,
      transferTime: Date.now() - startTime
    };
  }

  /**
   * ジョブステータス更新（本来と同じ）
   */
  private async updateJobStatus(jobId: number, status: PersistedJob['status'], message?: string): Promise<void> {
    try {
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

        this.logger.debug(`[MOCK] Job status updated: ${jobId} -> ${status}`, 'MockAbaqusJobRunner', {
          message
        });
      } else {
        this.logger.error(`[MOCK] Failed to update job status: ${jobId}`, 'MockAbaqusJobRunner');
      }
    } catch (error) {
      this.logger.error(`[MOCK] Error updating job status: ${jobId}`, 'MockAbaqusJobRunner', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 遅延ヘルパー
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}