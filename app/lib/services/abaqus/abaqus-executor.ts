/**
 * Abaqus Executor - Martin Fowler Extract Class 適用
 * AbaqusJobRunnerからAbaqus実行責任を分離
 */

import { createNodeExecutor } from "../remote-pwsh/node-executor";
import type { PersistedJob, PersistedNode } from "../../core/types/database";
import { getLogger } from "../../core/logger/logger.server";
import path from "path";

/**
 * AbaqusExecutor - Single Responsibility Principle適用
 * Abaqus実行のみに責任を集中
 */
export class AbaqusExecutor {
  private readonly logger = getLogger();
  
  // PowerShellスクリプトパス
  private readonly executeAbaqusScript = path.join(process.cwd(), "resources", "ps-scripts", "executeAbaqus.ps1");

  /**
   * Abaqus実行 - 並列処理可能
   * @param onStatusUpdate ステータス更新コールバック
   */
  async runAbaqus(
    job: PersistedJob, 
    node: PersistedNode, 
    remotePath: string,
    onStatusUpdate?: (status: string, message: string) => Promise<void>
  ): Promise<void> {
    this.logger.info(`Starting Abaqus execution for job ${job.id}`, 'AbaqusExecutor', {
      remotePath,
      cpuCores: job.cpu_cores
    });

    const executor = createNodeExecutor(node, this.executeAbaqusScript);

    // executeAbaqus.ps1の引数: jobName, workingDir, inputFile, cpu=X
    const jobName = `job-${job.id}`;
    const inputFile = await this.getInputFileName(job);
    const scriptArgs = [
      jobName,
      remotePath,
      inputFile,
      `cpu=${job.cpu_cores}`
    ];

    this.logger.debug(`Executing Abaqus script for job ${job.id}`, 'AbaqusExecutor', {
      scriptArgs
    });

    // リアルタイム監視の実装
    executor.on('stdout', (line: string) => {
      this.logger.debug(`Abaqus output for job ${job.id}: ${line}`, 'AbaqusExecutor');
      
      // ステータス解析とコールバック実行
      this.analyzeAbaqusOutput(line, job.id, onStatusUpdate);
    });

    executor.on('stderr', (line: string) => {
      this.logger.warn(`Abaqus error for job ${job.id}: ${line}`, 'AbaqusExecutor');
    });

    const result = await executor.invokeAsync();

    if (result.returnCode !== 0) {
      throw new Error(`Abaqus execution failed: ${result.stderr}`);
    }

    this.logger.info(`Abaqus execution completed for job ${job.id}`, 'AbaqusExecutor');
  }

  /**
   * 入力ファイル名取得
   */
  private async getInputFileName(job: PersistedJob): Promise<string> {
    const { fileRepository } = await import("../../core/database/server-operations");
    
    if (!job.file_id) {
      throw new Error(`Job ${job.id} has no associated file`);
    }

    const fileRecord = fileRepository.findFileById(job.file_id);
    if (!fileRecord) {
      throw new Error(`File not found for job ${job.id} (file_id: ${job.file_id})`);
    }

    return fileRecord.stored_name || fileRecord.original_name;
  }

  /**
   * Abaqus出力解析とステータス更新
   */
  private analyzeAbaqusOutput(
    line: string, 
    jobId: number, 
    onStatusUpdate?: (status: string, message: string) => Promise<void>
  ): void {
    // Abaqus固有の出力パターンを解析
    if (line.includes('THE ANALYSIS HAS COMPLETED')) {
      onStatusUpdate?.('running', 'Analysis completed, generating results...');
    } else if (line.includes('Abaqus/Standard completed successfully')) {
      onStatusUpdate?.('running', 'Abaqus execution completed successfully');
    } else if (line.includes('ERROR') || line.includes('FATAL')) {
      this.logger.error(`Abaqus execution error detected for job ${jobId}`, 'AbaqusExecutor', {
        errorLine: line
      });
    } else if (line.includes('INCREMENT')) {
      // 進捗情報の場合は詳細ログのみ
      this.logger.debug(`Abaqus progress for job ${jobId}: ${line}`, 'AbaqusExecutor');
    }
  }
}