/**
 * File Transfer Manager - Martin Fowler Extract Class 適用
 * AbaqusJobRunnerからファイル転送責任を分離
 */

import { createNodeExecutor } from "../remote-pwsh/node-executor";
import type { PersistedJob, PersistedNode } from "../../core/types/database";
import { getLogger } from "../../core/logger/logger.server";
import path from "path";
import { promises as fs } from "fs";

// ファイル転送結果型
export interface FileTransferResult {
  success: boolean;
  path: string;
  transferTime: number;
  errorMessage?: string;
}

/**
 * FileTransferManager - Single Responsibility Principle適用
 * ファイル転送のみに責任を集中
 */
export class FileTransferManager {
  private readonly logger = getLogger();
  
  // 🚨 重要: ファイル転送シリアル処理制御
  private static fileTransferQueue: Map<string, Promise<void>> = new Map();
  
  // PowerShellスクリプトパス
  private readonly sendDirectoryScript = path.join(process.cwd(), "resources", "ps-scripts", "sendDirectory.ps1");
  private readonly receiveDirectoryScript = path.join(process.cwd(), "resources", "ps-scripts", "receiveDirectory.ps1");

  /**
   * ファイルアップロード - シリアル処理制御付き
   */
  async uploadFiles(job: PersistedJob, node: PersistedNode): Promise<FileTransferResult> {
    const nodeKey = `${node.hostname}:${node.ssh_port || 22}`;
    
    // 🚨 重要: ノード別シリアル処理制御
    const previousTransfer = FileTransferManager.fileTransferQueue.get(nodeKey);
    if (previousTransfer) {
      this.logger.debug(`Waiting for previous file transfer on node ${nodeKey}`, 'FileTransferManager');
      await previousTransfer;
    }

    // 新しい転送プロセス開始
    const transferPromise = this.executeUpload(job, node).then(() => {});
    FileTransferManager.fileTransferQueue.set(nodeKey, transferPromise);

    try {
      const result = await this.executeUpload(job, node);
      return result;
    } finally {
      // 完了後にキューから削除
      FileTransferManager.fileTransferQueue.delete(nodeKey);
    }
  }

  /**
   * 結果ファイルダウンロード - シリアル処理制御付き
   */
  async downloadResults(job: PersistedJob, node: PersistedNode, remoteJobPath: string): Promise<FileTransferResult> {
    const nodeKey = `${node.hostname}:${node.ssh_port || 22}`;
    
    // 🚨 重要: ノード別シリアル処理制御
    const previousTransfer = FileTransferManager.fileTransferQueue.get(nodeKey);
    if (previousTransfer) {
      this.logger.debug(`Waiting for previous file transfer on node ${nodeKey}`, 'FileTransferManager');
      await previousTransfer;
    }

    // 新しい転送プロセス開始
    const transferPromise = this.executeDownload(job, node, remoteJobPath).then(() => {});
    FileTransferManager.fileTransferQueue.set(nodeKey, transferPromise);

    try {
      const result = await this.executeDownload(job, node, remoteJobPath);
      return result;
    } finally {
      // 完了後にキューから削除
      FileTransferManager.fileTransferQueue.delete(nodeKey);
    }
  }

  /**
   * ローカルジョブパス取得
   */
  async getLocalJobPath(job: PersistedJob): Promise<string> {
    const { fileRepository } = await import("../../core/database/server-operations");
    
    if (!job.file_id) {
      throw new Error(`Job ${job.id} has no associated file`);
    }

    const fileRecord = fileRepository.findFileById(job.file_id);
    if (!fileRecord) {
      throw new Error(`File not found for job ${job.id} (file_id: ${job.file_id})`);
    }

    // ファイルが存在するかチェック
    const filePath = fileRecord.file_path;
    try {
      await fs.access(filePath);
    } catch (error) {
      throw new Error(`File not accessible: ${filePath}`);
    }

    // ファイルが置かれているディレクトリを返す
    return path.dirname(filePath);
  }

  /**
   * ローカル結果ディレクトリ作成
   */
  async createLocalResultDirectory(job: PersistedJob): Promise<string> {
    const resultDir = path.join(process.cwd(), 'results', `job-${job.id}-${Date.now()}`);
    await fs.mkdir(resultDir, { recursive: true });
    return resultDir;
  }

  /**
   * 入力ファイル名取得
   */
  async getInputFileName(job: PersistedJob): Promise<string> {
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

  // === Private Methods ===

  /**
   * 実際のファイルアップロード処理
   */
  private async executeUpload(job: PersistedJob, node: PersistedNode): Promise<FileTransferResult> {
    const startTime = Date.now();
    
    try {
      // ローカルジョブディレクトリの取得
      const localJobPath = await this.getLocalJobPath(job);
      
      // リモートジョブディレクトリの作成
      const remoteJobPath = this.createRemoteJobDirectory(job, node);

      // PowerShellスクリプトでファイル転送
      const executor = createNodeExecutor(node, this.sendDirectoryScript);

      this.logger.debug(`Uploading files for job ${job.id}`, 'FileTransferManager', {
        localPath: localJobPath,
        remotePath: remoteJobPath,
        nodeHost: node.hostname,
        scriptArgs: [localJobPath, remoteJobPath] // TODO: remote-pwshライブラリで引数対応
      });

      const result = await executor.invokeAsync();

      if (result.returnCode === 0) {
        const transferTime = Date.now() - startTime;
        
        this.logger.info(`File upload successful for job ${job.id}`, 'FileTransferManager', {
          transferTime,
          remotePath: remoteJobPath
        });

        return {
          success: true,
          path: remoteJobPath,
          transferTime
        };
      } else {
        throw new Error(`PowerShell execution failed: ${result.stderr}`);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown upload error';
      
      this.logger.error(`File upload failed for job ${job.id}`, 'FileTransferManager', {
        error: errorMessage
      });

      return {
        success: false,
        path: '',
        transferTime: Date.now() - startTime,
        errorMessage
      };
    }
  }

  /**
   * 実際の結果ダウンロード処理
   */
  private async executeDownload(job: PersistedJob, node: PersistedNode, remoteJobPath: string): Promise<FileTransferResult> {
    const startTime = Date.now();
    
    try {
      // ローカル結果ディレクトリの作成
      const localResultPath = await this.createLocalResultDirectory(job);

      // PowerShellスクリプトで結果ダウンロード
      const executor = createNodeExecutor(node, this.receiveDirectoryScript);

      this.logger.debug(`Downloading results for job ${job.id}`, 'FileTransferManager', {
        remotePath: remoteJobPath,
        localPath: localResultPath,
        scriptArgs: [remoteJobPath, localResultPath] // TODO: remote-pwshライブラリで引数対応
      });

      const result = await executor.invokeAsync();

      if (result.returnCode === 0) {
        const transferTime = Date.now() - startTime;
        
        this.logger.info(`Result download successful for job ${job.id}`, 'FileTransferManager', {
          transferTime,
          localPath: localResultPath
        });

        return {
          success: true,
          path: localResultPath,
          transferTime
        };
      } else {
        throw new Error(`PowerShell execution failed: ${result.stderr}`);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown download error';
      
      this.logger.error(`Result download failed for job ${job.id}`, 'FileTransferManager', {
        error: errorMessage
      });

      return {
        success: false,
        path: '',
        transferTime: Date.now() - startTime,
        errorMessage
      };
    }
  }

  /**
   * リモートジョブディレクトリ作成
   */
  private createRemoteJobDirectory(job: PersistedJob, node: PersistedNode): string {
    const timestamp = Date.now();
    const remoteJobPath = `/tmp/abaqus-jobs/job-${job.id}-${timestamp}`;
    
    this.logger.debug(`Created remote job directory: ${remoteJobPath}`, 'FileTransferManager', {
      jobId: job.id,
      nodeId: node.id
    });

    return remoteJobPath;
  }
}