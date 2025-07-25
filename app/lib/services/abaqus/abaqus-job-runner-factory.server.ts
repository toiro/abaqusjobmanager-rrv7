/**
 * AbaqusJobRunner Factory
 * 
 * 環境変数に応じて適切なAbaqusJobRunnerインスタンスを提供
 * 開発環境ではMockを、本番環境では実物を使用
 */

import { getLogger } from "../../core/logger/logger.server";
import { AbaqusJobRunner } from "./abaqus-job-runner.server";
import { MockAbaqusJobRunner } from "./mock-abaqus-job-runner.server";
import type { JobExecutionResult } from "./abaqus-job-runner.server";
import type { PersistedJob, PersistedNode } from "../../core/types/database";

// 統一インターフェース
export interface IAbaqusJobRunner {
  executeJob(job: PersistedJob, node: PersistedNode): Promise<JobExecutionResult>;
}

// ファクトリー設定
export interface JobRunnerConfig {
  /** 強制的にMockを使用するか */
  forceMock?: boolean;
  /** Mockの設定 */
  mockConfig?: {
    uploadDurationMs?: number;
    executionDurationMs?: number;
    downloadDurationMs?: number;
    errorRate?: number;
    simulateErrors?: {
      upload?: boolean;
      execution?: boolean;
      download?: boolean;
    };
  };
}

export class AbaqusJobRunnerFactory {
  private static instance: IAbaqusJobRunner | null = null;
  private static readonly logger = getLogger();

  /**
   * 環境に応じた適切なJobRunnerを作成・取得
   */
  static getInstance(config?: JobRunnerConfig): IAbaqusJobRunner {
    if (!this.instance) {
      this.instance = this.createJobRunner(config);
    }
    return this.instance;
  }

  /**
   * インスタンスをリセット（テスト用）
   */
  static resetInstance(): void {
    this.instance = null;
  }

  /**
   * JobRunnerの実装を選択
   */
  private static createJobRunner(config?: JobRunnerConfig): IAbaqusJobRunner {
    const useMock = this.shouldUseMock(config);
    
    if (useMock) {
      this.logger.info('Creating MockAbaqusJobRunner', 'AbaqusJobRunnerFactory', {
        reason: config?.forceMock ? 'Forced by config' : 'Development/Test environment',
        environment: process.env.NODE_ENV,
        mockConfig: config?.mockConfig
      });
      
      return new MockAbaqusJobRunner(config?.mockConfig);
    } else {
      this.logger.info('Creating real AbaqusJobRunner', 'AbaqusJobRunnerFactory', {
        environment: process.env.NODE_ENV
      });
      
      return new AbaqusJobRunner();
    }
  }

  /**
   * Mockを使用するかの判定
   */
  private static shouldUseMock(config?: JobRunnerConfig): boolean {
    // 設定で強制指定されている場合
    if (config?.forceMock === true) {
      return true;
    }
    if (config?.forceMock === false) {
      return false;
    }

    // 環境変数による制御
    if (process.env.USE_MOCK_ABAQUS === 'true') {
      return true;
    }
    if (process.env.USE_MOCK_ABAQUS === 'false') {
      return false;
    }

    // 環境による自動判定
    const environment = process.env.NODE_ENV;
    
    // テスト環境では常にMock
    if (environment === 'test') {
      return true;
    }
    
    // 開発環境ではデフォルトでMock（但し実際のAbaqus環境があれば本物も可能）
    if (environment === 'development') {
      return true;
    }
    
    // 本番環境では本物
    return false;
  }

  /**
   * 現在の設定情報を取得
   */
  static getInfo(): {
    usingMock: boolean;
    environment: string;
    reason: string;
  } {
    const usingMock = this.shouldUseMock();
    const environment = process.env.NODE_ENV || 'unknown';
    
    let reason: string;
    if (process.env.USE_MOCK_ABAQUS === 'true') {
      reason = 'Environment variable USE_MOCK_ABAQUS=true';
    } else if (process.env.USE_MOCK_ABAQUS === 'false') {
      reason = 'Environment variable USE_MOCK_ABAQUS=false';
    } else if (environment === 'test') {
      reason = 'Test environment (auto-mock)';
    } else if (environment === 'development') {
      reason = 'Development environment (auto-mock)';
    } else {
      reason = 'Production environment (real implementation)';
    }
    
    return {
      usingMock,
      environment,
      reason
    };
  }
}