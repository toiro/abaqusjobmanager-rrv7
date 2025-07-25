/**
 * Job Execution Scheduler
 * 
 * Abaqusジョブの実行をスケジューリングする機能
 * 既存のスケジューラーシステムを活用してシンプルな実装を提供
 */

import { createAdaptiveScheduler, type AdaptiveTaskResult } from "../scheduler/adaptive-scheduler";
import { AbaqusJobRunnerFactory, type IAbaqusJobRunner } from "./abaqus-job-runner-factory.server";
import { getLogger } from "../../core/logger/logger.server";
import { jobRepository, nodeRepository } from "../../core/database/server-operations";
import type { PersistedJob, PersistedNode } from "../../core/types/database";

// Type aliases for cleaner code
type Job = PersistedJob;
type Node = PersistedNode;

export interface JobExecutionSchedulerConfig {
  /** ジョブチェック間隔（秒）デフォルト: 30秒 */
  checkIntervalSeconds?: number;
  /** 最大同時実行ジョブ数 デフォルト: 3 */
  maxConcurrentJobs?: number;
  /** 失敗時のリトライ間隔（秒）デフォルト: 60秒 */
  retryIntervalSeconds?: number;
  /** 最大リトライ回数 デフォルト: 3 */
  maxRetries?: number;
}

export class JobExecutionScheduler {
  private readonly logger = getLogger();
  private readonly jobRunner: IAbaqusJobRunner;
  private readonly config: Required<JobExecutionSchedulerConfig>;
  private readonly runningJobs = new Map<number, Promise<void>>();
  private readonly failedJobs = new Map<number, { count: number; lastFailure: Date }>();

  constructor(config: JobExecutionSchedulerConfig = {}) {
    this.config = {
      checkIntervalSeconds: config.checkIntervalSeconds ?? 30,
      maxConcurrentJobs: config.maxConcurrentJobs ?? 3,
      retryIntervalSeconds: config.retryIntervalSeconds ?? 60,
      maxRetries: config.maxRetries ?? 3
    };
    
    this.jobRunner = AbaqusJobRunnerFactory.getInstance();
    
    const factoryInfo = AbaqusJobRunnerFactory.getInfo();
    this.logger.info('Job execution scheduler initialized', 'JobExecutionScheduler', {
      config: this.config,
      jobRunner: factoryInfo
    });
  }

  /**
   * スケジューラーを開始
   */
  start() {
    const scheduler = createAdaptiveScheduler(
      'job-execution',
      this.executeJobQueue.bind(this),
      {
        normalIntervalSeconds: this.config.checkIntervalSeconds,
        minIntervalSeconds: 10,
        maxIntervalSeconds: 120,
      }
    );

    this.logger.info('Job execution scheduler started', 'JobExecutionScheduler');
    return scheduler;
  }

  /**
   * ジョブキューの処理（スケジューラーから定期実行される）
   */
  private async executeJobQueue(): Promise<AdaptiveTaskResult> {
    try {
      // 実行可能ジョブの選択
      const jobs = this.selectExecutableJobs();
      
      if (jobs.length === 0) {
        return { success: true, nextInterval: this.config.checkIntervalSeconds };
      }

      this.logger.debug(`Found ${jobs.length} executable jobs`, 'JobExecutionScheduler');

      // 同時実行数制限チェック
      const availableSlots = this.config.maxConcurrentJobs - this.runningJobs.size;
      const jobsToExecute = jobs.slice(0, availableSlots);

      // ジョブ実行開始
      for (const job of jobsToExecute) {
        const node = this.selectOptimalNode(job);
        if (node) {
          this.startJobExecution(job, node);
        }
      }

      // 実行中ジョブがある場合は短い間隔でチェック
      const nextInterval = this.runningJobs.size > 0 ? 10 : this.config.checkIntervalSeconds;

      return { 
        success: true, 
        nextInterval,
        data: {
          queuedJobs: jobs.length,
          runningJobs: this.runningJobs.size,
          executedJobs: jobsToExecute.length
        }
      };

    } catch (error) {
      this.logger.error('Job queue execution failed', 'JobExecutionScheduler', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return { 
        success: false, 
        nextInterval: this.config.retryIntervalSeconds,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 実行可能ジョブの選択
   */
  private selectExecutableJobs(): Job[] {
    try {
      const allJobs = jobRepository.findAllJobs();
      
      return allJobs.filter(job => {
        // waitingステータスのジョブのみ
        if (job.status !== 'waiting') {
          return false;
        }

        // 実行中でないこと
        if (this.runningJobs.has(job.id!)) {
          return false;
        }

        // リトライ制限チェック
        const failureInfo = this.failedJobs.get(job.id!);
        if (failureInfo) {
          // 最大リトライ回数に達している
          if (failureInfo.count >= this.config.maxRetries) {
            return false;
          }

          // リトライ間隔が経過していない
          const timeSinceFailure = Date.now() - failureInfo.lastFailure.getTime();
          if (timeSinceFailure < this.config.retryIntervalSeconds * 1000) {
            return false;
          }
        }

        return true;
      });

    } catch (error) {
      this.logger.error('Failed to select executable jobs', 'JobExecutionScheduler', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return [];
    }
  }

  /**
   * 最適ノードの選択
   */
  private selectOptimalNode(job: Job): Node | null {
    try {
      const allNodes = nodeRepository.findAllNodes();
      
      // 利用可能ノードのフィルタリング
      const availableNodes = allNodes.filter(node => {
        return node.status === 'available' && 
               node.is_active === true &&
               node.cpu_cores_limit >= job.cpu_cores;
      });

      if (availableNodes.length === 0) {
        this.logger.warn(`No available nodes for job ${job.id}`, 'JobExecutionScheduler', {
          requiredCores: job.cpu_cores
        });
        return null;
      }

      // ユーザー指定ノードがある場合はそれを優先
      if (job.node_id) {
        const specifiedNode = availableNodes.find(node => node.id === job.node_id);
        if (specifiedNode) {
          return specifiedNode;
        }
      }

      // シンプルな選択: 最初の利用可能ノード
      // TODO: より高度な負荷分散アルゴリズム
      return availableNodes[0];

    } catch (error) {
      this.logger.error(`Failed to select node for job ${job.id}`, 'JobExecutionScheduler', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  /**
   * ジョブ実行開始
   */
  private startJobExecution(job: Job, node: Node): void {
    if (!job.id) {
      this.logger.error('Job ID is missing', 'JobExecutionScheduler');
      return;
    }

    this.logger.info(`Starting job execution: ${job.name}`, 'JobExecutionScheduler', {
      jobId: job.id,
      nodeId: node.id,
      nodeName: node.name
    });

    // 実行プロミスを作成
    const executionPromise = this.executeJobWithErrorHandling(job, node);
    
    // 実行中ジョブとして登録
    this.runningJobs.set(job.id, executionPromise);

    // 完了時のクリーンアップ
    executionPromise.finally(() => {
      this.runningJobs.delete(job.id!);
    });
  }

  /**
   * エラーハンドリング付きジョブ実行
   */
  private async executeJobWithErrorHandling(job: Job, node: Node): Promise<void> {
    try {
      const result = await this.jobRunner.executeJob(job, node);
      
      if (result.success) {
        this.logger.info(`Job execution completed successfully: ${job.name}`, 'JobExecutionScheduler', {
          jobId: job.id,
          executionTime: result.executionTime
        });

        // 成功時は失敗カウンターをリセット
        this.failedJobs.delete(job.id!);
      } else {
        throw new Error(result.errorMessage || 'Job execution failed');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.logger.error(`Job execution failed: ${job.name}`, 'JobExecutionScheduler', {
        jobId: job.id,
        error: errorMessage
      });

      // 失敗カウンターを更新
      const failureInfo = this.failedJobs.get(job.id!) || { count: 0, lastFailure: new Date() };
      failureInfo.count++;
      failureInfo.lastFailure = new Date();
      this.failedJobs.set(job.id!, failureInfo);

      // 最大リトライ回数に達した場合は失敗状態に更新
      if (failureInfo.count >= this.config.maxRetries) {
        this.logger.warn(`Job ${job.id} exceeded max retries`, 'JobExecutionScheduler', {
          maxRetries: this.config.maxRetries
        });
        // TODO: ジョブを'failed'状態に更新
      }
    }
  }

  /**
   * 現在の実行状況を取得
   */
  getExecutionStatus() {
    return {
      runningJobs: this.runningJobs.size,
      failedJobs: this.failedJobs.size,
      maxConcurrentJobs: this.config.maxConcurrentJobs
    };
  }
}

/**
 * ジョブ実行スケジューラーを作成（未開始状態）
 * SchedulerSystemとの統一のため、開始はSchedulerSystemが行う
 */
export function createJobExecutionScheduler(intervalMs: number = 30000): any {
  const config: JobExecutionSchedulerConfig = {
    checkIntervalSeconds: Math.round(intervalMs / 1000)
  };
  const scheduler = new JobExecutionScheduler(config);
  return scheduler; // 未開始の scheduler を返す
}