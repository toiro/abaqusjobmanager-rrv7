/**
 * Scheduler Logging テスト
 * 
 * 構造化ログ出力機能をテストファーストで設計
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { IntervalScheduler } from '../../app/server/lib/scheduler/interval-scheduler.server';

describe('SchedulerLogging', () => {
  let scheduler: IntervalScheduler;
  let logOutput: Array<{ level: string, message: string, context: string, data?: any }>;

  beforeEach(() => {
    logOutput = [];
  });

  afterEach(async () => {
    if (scheduler?.isRunning()) {
      await scheduler.stop();
    }
  });

  test('スケジューラーにロガーを設定できる', () => {
    scheduler = new IntervalScheduler('test', 100);
    
    const mockLogger = {
      info: (message: string, context: string, data?: any) => {
        logOutput.push({ level: 'info', message, context, data });
      },
      warn: (message: string, context: string, data?: any) => {
        logOutput.push({ level: 'warn', message, context, data });
      },
      error: (message: string, context: string, data?: any) => {
        logOutput.push({ level: 'error', message, context, data });
      }
    };
    
    expect(typeof scheduler.setLogger).toBe('function');
    scheduler.setLogger(mockLogger);
  });

  test('スケジューラー開始時にログが出力される', () => {
    scheduler = new IntervalScheduler('test-scheduler', 100);
    
    const mockLogger = {
      info: (message: string, context: string, data?: any) => {
        logOutput.push({ level: 'info', message, context, data });
      },
      warn: () => {},
      error: () => {}
    };
    
    scheduler.setLogger(mockLogger);
    scheduler.onTick(async () => {});
    
    scheduler.start();
    
    expect(logOutput).toContainEqual({
      level: 'info',
      message: expect.stringContaining('started'),
      context: 'Scheduler',
      data: expect.objectContaining({
        schedulerName: 'test-scheduler',
        intervalMs: 100
      })
    });
  });

  test('スケジューラー停止時にログが出力される', async () => {
    scheduler = new IntervalScheduler('test-scheduler', 100);
    
    const mockLogger = {
      info: (message: string, context: string, data?: any) => {
        logOutput.push({ level: 'info', message, context, data });
      },
      warn: () => {},
      error: () => {}
    };
    
    scheduler.setLogger(mockLogger);
    scheduler.onTick(async () => {});
    
    scheduler.start();
    await scheduler.stop();
    
    expect(logOutput).toContainEqual({
      level: 'info',
      message: expect.stringContaining('stopped'),
      context: 'Scheduler',
      data: expect.objectContaining({
        schedulerName: 'test-scheduler'
      })
    });
  });

  test('タスク実行エラー時にエラーログが出力される', async () => {
    scheduler = new IntervalScheduler('test-scheduler', 50);
    
    const mockLogger = {
      info: () => {},
      warn: () => {},
      error: (message: string, context: string, data?: any) => {
        logOutput.push({ level: 'error', message, context, data });
      }
    };
    
    scheduler.setLogger(mockLogger);
    scheduler.onTick(async () => {
      throw new Error('Test task error');
    });
    
    scheduler.start();
    
    // エラーが発生するまで待機
    await new Promise(resolve => setTimeout(resolve, 100));
    
    await scheduler.stop();
    
    expect(logOutput).toContainEqual({
      level: 'error',
      message: expect.stringContaining('Task execution failed'),
      context: 'Scheduler',
      data: expect.objectContaining({
        schedulerName: 'test-scheduler',
        error: expect.stringContaining('Test task error')
      })
    });
  });

  test('統計情報が定期的にログ出力される', async () => {
    scheduler = new IntervalScheduler('test-scheduler', 50);
    
    const mockLogger = {
      info: (message: string, context: string, data?: any) => {
        logOutput.push({ level: 'info', message, context, data });
      },
      warn: () => {},
      error: () => {}
    };
    
    scheduler.setLogger(mockLogger);
    scheduler.onTick(async () => {});
    
    // 統計ログ有効化
    scheduler.enablePeriodicStatsLogging(100); // 100ms間隔
    
    scheduler.start();
    
    // 統計ログが出力されるまで待機
    await new Promise(resolve => setTimeout(resolve, 200));
    
    await scheduler.stop();
    
    expect(logOutput.some(log => 
      log.level === 'info' && 
      log.message.includes('Statistics') &&
      log.data?.totalExecutions !== undefined
    )).toBe(true);
  });
});