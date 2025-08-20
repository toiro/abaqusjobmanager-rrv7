/**
 * 具象Scheduler テスト
 * 
 * Health Check, SSE Cleanup, Job Execution の専用スケジューラー
 * LogTape統合後のテスト
 */

import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test';
import { HealthCheckScheduler } from '../../app/server/lib/scheduler/health-check-scheduler.server';
import { SSECleanupScheduler } from '../../app/server/lib/scheduler/sse-cleanup-scheduler.server';
import { JobExecutionScheduler } from '../../app/server/lib/scheduler/job-execution-scheduler.server';

// LogTape統一ログシステムのモック
const mockLogger = {
  info: mock(() => {}),
  warn: mock(() => {}),
  error: mock(() => {}),
  debug: mock(() => {}),
};

const mockGetLogger = mock(() => mockLogger);

// モジュールモック
mock.module('~/shared/core/logger/logger.server', () => ({
  getLogger: mockGetLogger,
}));

describe('ConcreteSchedulers', () => {
  let healthScheduler: HealthCheckScheduler;
  let sseScheduler: SSECleanupScheduler;
  let jobScheduler: JobExecutionScheduler;

  beforeEach(() => {
    // LogTapeモックをリセット
    mockLogger.info.mockClear();
    mockLogger.warn.mockClear();
    mockLogger.error.mockClear();
    mockLogger.debug.mockClear();
    mockGetLogger.mockClear();
  });

  afterEach(async () => {
    if (healthScheduler?.isRunning()) {
      await healthScheduler.stop();
    }
    if (sseScheduler?.isRunning()) {
      await sseScheduler.stop();
    }
    if (jobScheduler?.isRunning()) {
      await jobScheduler.stop();
    }
  });

  describe('HealthCheckScheduler', () => {
    test('デフォルト30秒間隔で作成される', () => {
      healthScheduler = new HealthCheckScheduler();
      
      expect(healthScheduler.name).toBe('health-check');
      expect(healthScheduler.isRunning()).toBe(false);
    });

    test('カスタム間隔で作成できる', () => {
      healthScheduler = new HealthCheckScheduler(10000); // 10秒
      
      expect(healthScheduler.name).toBe('health-check');
    });

    test('ヘルスチェックタスクを設定して実行できる', async () => {
      healthScheduler = new HealthCheckScheduler(50); // 50ms
      
      let executionCount = 0;
      healthScheduler.scheduleHealthCheck(async () => {
        executionCount++;
      });
      
      healthScheduler.start();
      
      // 実行を待機
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(executionCount).toBeGreaterThan(0);
      
      await healthScheduler.stop();
    });

    test('統計ログを有効化できる', () => {
      healthScheduler = new HealthCheckScheduler();
      
      expect(() => healthScheduler.enableStatsLogging(1000)).not.toThrow();
    });
  });

  describe('SSECleanupScheduler', () => {
    test('デフォルト5分間隔で作成される', () => {
      sseScheduler = new SSECleanupScheduler();
      
      expect(sseScheduler.name).toBe('sse-cleanup');
      expect(sseScheduler.isRunning()).toBe(false);
    });

    test('清理タスクを設定して実行できる', async () => {
      sseScheduler = new SSECleanupScheduler(50); // 50ms
      
      let cleanupCount = 0;
      sseScheduler.scheduleCleanup(async () => {
        cleanupCount++;
      });
      
      sseScheduler.start();
      
      // 実行を待機
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(cleanupCount).toBeGreaterThan(0);
      
      await sseScheduler.stop();
    });
  });

  describe('JobExecutionScheduler', () => {
    test('デフォルト5秒間隔で作成される', () => {
      jobScheduler = new JobExecutionScheduler();
      
      expect(jobScheduler.name).toBe('job-execution');
      expect(jobScheduler.isRunning()).toBe(false);
    });

    test('ジョブ実行タスクを設定して実行できる', async () => {
      jobScheduler = new JobExecutionScheduler(50); // 50ms
      
      let executionCount = 0;
      jobScheduler.scheduleJobExecution(async () => {
        executionCount++;
      });
      
      jobScheduler.start();
      
      // 実行を待機
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(executionCount).toBeGreaterThan(0);
      
      await jobScheduler.stop();
    });
  });

  describe('マルチスケジューラー動作', () => {
    test('複数のスケジューラーを同時実行できる', async () => {
      healthScheduler = new HealthCheckScheduler(50);
      sseScheduler = new SSECleanupScheduler(50);
      jobScheduler = new JobExecutionScheduler(50);
      
      let healthCount = 0;
      let sseCount = 0;
      let jobCount = 0;
      
      healthScheduler.scheduleHealthCheck(async () => { healthCount++; });
      sseScheduler.scheduleCleanup(async () => { sseCount++; });
      jobScheduler.scheduleJobExecution(async () => { jobCount++; });
      
      // 全て開始
      healthScheduler.start();
      sseScheduler.start();
      jobScheduler.start();
      
      expect(healthScheduler.isRunning()).toBe(true);
      expect(sseScheduler.isRunning()).toBe(true);
      expect(jobScheduler.isRunning()).toBe(true);
      
      // 実行を待機
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(healthCount).toBeGreaterThan(0);
      expect(sseCount).toBeGreaterThan(0);
      expect(jobCount).toBeGreaterThan(0);
      
      // 全て停止
      await healthScheduler.stop();
      await sseScheduler.stop();
      await jobScheduler.stop();
      
      expect(healthScheduler.isRunning()).toBe(false);
      expect(sseScheduler.isRunning()).toBe(false);
      expect(jobScheduler.isRunning()).toBe(false);
    });
  });
});