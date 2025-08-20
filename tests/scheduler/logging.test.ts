/**
 * Scheduler Logging テスト
 * 
 * LogTape統合後の構造化ログ出力機能をテスト
 */

import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test';
import { IntervalScheduler } from '../../app/server/lib/scheduler/interval-scheduler.server';

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

describe('SchedulerLogging', () => {
  let scheduler: IntervalScheduler;

  beforeEach(() => {
    // モックをリセット
    mockLogger.info.mockClear();
    mockLogger.warn.mockClear();
    mockLogger.error.mockClear();
    mockLogger.debug.mockClear();
    mockGetLogger.mockClear();
  });

  afterEach(async () => {
    if (scheduler?.isRunning()) {
      await scheduler.stop();
    }
  });

  test('スケジューラー作成時にLogTapeロガーが初期化される', () => {
    scheduler = new IntervalScheduler('test', 100);
    
    // getLogger()が呼び出されることを確認
    expect(mockGetLogger).toHaveBeenCalled();
  });

  test('スケジューラー開始時にログが出力される', () => {
    scheduler = new IntervalScheduler('test-scheduler', 100);
    scheduler.onTick(async () => {});
    
    scheduler.start();
    
    // LogTape標準形式でのログ呼び出しを確認
    expect(mockLogger.info).toHaveBeenCalledWith(
      "Scheduler started",
      expect.objectContaining({
        context: "IntervalScheduler",
        schedulerName: 'test-scheduler',
        intervalMs: 100
      })
    );
  });

  test('スケジューラー停止時にログが出力される', async () => {
    scheduler = new IntervalScheduler('test-scheduler', 100);
    scheduler.onTick(async () => {});
    
    scheduler.start();
    await scheduler.stop();
    
    // 停止ログの確認
    expect(mockLogger.info).toHaveBeenCalledWith(
      "Scheduler stopped",
      expect.objectContaining({
        context: "IntervalScheduler",
        schedulerName: 'test-scheduler',
        stats: expect.any(Object)
      })
    );
  });

  test('タスク実行エラー時にエラーログが出力される', async () => {
    scheduler = new IntervalScheduler('test-scheduler', 50);
    
    scheduler.onTick(async () => {
      throw new Error('Test task error');
    });
    
    scheduler.start();
    
    // エラーが発生するまで待機
    await new Promise(resolve => setTimeout(resolve, 100));
    
    await scheduler.stop();
    
    // エラーログの確認
    expect(mockLogger.error).toHaveBeenCalledWith(
      "Task execution failed",
      expect.objectContaining({
        context: "IntervalScheduler",
        schedulerName: 'test-scheduler',
        error: expect.stringContaining('Test task error'),
        stats: expect.any(Object)
      })
    );
  });

  test('統計情報が定期的にログ出力される', async () => {
    scheduler = new IntervalScheduler('test-scheduler', 50);
    scheduler.onTick(async () => {});
    
    // 統計ログ有効化
    scheduler.enablePeriodicStatsLogging(100); // 100ms間隔
    
    scheduler.start();
    
    // 統計ログが出力されるまで待機
    await new Promise(resolve => setTimeout(resolve, 200));
    
    await scheduler.stop();
    
    // 統計ログの確認
    expect(mockLogger.info).toHaveBeenCalledWith(
      "Scheduler statistics",
      expect.objectContaining({
        context: "IntervalScheduler",
        schedulerName: 'test-scheduler',
        totalExecutions: expect.any(Number),
        successfulExecutions: expect.any(Number),
        failedExecutions: expect.any(Number)
      })
    );
  });
});