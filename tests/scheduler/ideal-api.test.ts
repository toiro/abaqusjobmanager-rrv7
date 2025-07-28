/**
 * t-wada TDD: 理想的なScheduler API設計
 * 
 * テストファーストでSchedulerの理想的なAPIを定義
 * Red → Green → Refactor の最初のステップ
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { IntervalScheduler } from '../../app/server/lib/scheduler/interval-scheduler.server';

describe('IdealSchedulerAPI', () => {
  let scheduler: IntervalScheduler;
  let mockCallback: () => Promise<void>;
  let callCount = 0;

  beforeEach(() => {
    callCount = 0;
    mockCallback = async () => {
      callCount++;
    };
  });

  afterEach(async () => {
    if (scheduler?.isRunning()) {
      await scheduler.stop();
    }
  });

  describe('基本的な作成と設定', () => {
    test('スケジューラーを名前と間隔で作成できる', () => {
      scheduler = new IntervalScheduler('test-scheduler', 1000);
      
      expect(scheduler.name).toBe('test-scheduler');
      expect(scheduler.isRunning()).toBe(false);
    });

    test('コールバック関数を設定できる', () => {
      scheduler = new IntervalScheduler('test-scheduler', 1000);
      
      expect(() => scheduler.onTick(mockCallback)).not.toThrow();
    });
  });

  describe('スケジューラーのライフサイクル', () => {
    beforeEach(() => {
      scheduler = new IntervalScheduler('test-scheduler', 100);
      scheduler.onTick(mockCallback);
    });

    test('スケジューラーを開始できる', () => {
      scheduler.start();
      
      expect(scheduler.isRunning()).toBe(true);
    });

    test('スケジューラーを停止できる', async () => {
      scheduler.start();
      expect(scheduler.isRunning()).toBe(true);
      
      await scheduler.stop();
      expect(scheduler.isRunning()).toBe(false);
    });

    test('既に開始されているスケジューラーを再度開始しても例外にならない', () => {
      scheduler.start();
      expect(scheduler.isRunning()).toBe(true);
      
      expect(() => scheduler.start()).not.toThrow();
      expect(scheduler.isRunning()).toBe(true);
    });

    test('停止しているスケジューラーを停止しても例外にならない', async () => {
      expect(scheduler.isRunning()).toBe(false);
      
      // 例外が投げられないことを確認
      await scheduler.stop();
      expect(scheduler.isRunning()).toBe(false);
    });
  });

  describe('定期実行', () => {
    beforeEach(() => {
      scheduler = new IntervalScheduler('test-scheduler', 100);
      scheduler.onTick(mockCallback);
    });

    test('指定した間隔でコールバックが実行される', async () => {
      scheduler.start();
      
      // 最初の実行
      expect(callCount).toBe(0);
      
      // 100ms待機
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(callCount).toBeGreaterThan(0);
      
      const firstCount = callCount;
      
      // さらに100ms待機
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(callCount).toBeGreaterThan(firstCount);
      
      await scheduler.stop();
    });

    test('コールバックエラー時も継続実行される', async () => {
      let errorCount = 0;
      const errorCallback = async () => {
        errorCount++;
        throw new Error('Test error');
      };
      scheduler.onTick(errorCallback);
      
      scheduler.start();
      
      // エラーが発生しても継続
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(errorCount).toBeGreaterThan(0);
      
      const firstErrorCount = errorCount;
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(errorCount).toBeGreaterThan(firstErrorCount);
      
      await scheduler.stop();
    });
  });

  describe('統計情報', () => {
    beforeEach(() => {
      scheduler = new IntervalScheduler('test-scheduler', 50); // より短い間隔
    });

    test('実行統計を正確に記録する', async () => {
      scheduler.onTick(mockCallback);
      
      scheduler.start();
      
      // 少し待機
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const stats = scheduler.getStats();
      expect(stats.totalExecutions).toBeGreaterThan(0);
      expect(stats.successfulExecutions).toBeGreaterThan(0);
      expect(stats.failedExecutions).toBe(0);
      expect(stats.lastExecutionTime).toBeInstanceOf(Date);
      
      await scheduler.stop();
    });

    test('エラー統計を正確に記録する', async () => {
      const errorCallback = async () => {
        throw new Error('Test error');
      };
      scheduler.onTick(errorCallback);
      
      scheduler.start();
      
      // 少し待機
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const stats = scheduler.getStats();
      expect(stats.totalExecutions).toBeGreaterThan(0);
      expect(stats.successfulExecutions).toBe(0);
      expect(stats.failedExecutions).toBeGreaterThan(0);
      
      await scheduler.stop();
    });
  });

  describe('エラーハンドリング', () => {
    test('コールバック未設定時の開始でエラーになる', () => {
      scheduler = new IntervalScheduler('test-scheduler', 100);
      
      expect(() => scheduler.start()).toThrow('Callback must be set before starting');
    });

    test('不正な間隔での作成でエラーになる', () => {
      expect(() => new IntervalScheduler('test', 0)).toThrow('Interval must be positive');
      expect(() => new IntervalScheduler('test', -100)).toThrow('Interval must be positive');
    });

    test('空の名前での作成でエラーになる', () => {
      expect(() => new IntervalScheduler('', 100)).toThrow('Name cannot be empty');
    });
  });
});