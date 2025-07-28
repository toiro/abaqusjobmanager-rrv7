/**
 * Graceful Shutdown テスト
 * 
 * プロセス終了時の安全な停止機能をテストファーストで設計
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { IntervalScheduler } from '../../app/server/lib/scheduler/interval-scheduler.server';

describe('GracefulShutdown', () => {
  let scheduler: IntervalScheduler;
  let originalListeners: any;

  beforeEach(() => {
    // プロセスイベントリスナーのバックアップ
    originalListeners = {
      SIGTERM: process.listeners('SIGTERM'),
      SIGINT: process.listeners('SIGINT')
    };
  });

  afterEach(async () => {
    if (scheduler?.isRunning()) {
      await scheduler.stop();
    }
    
    // プロセスイベントリスナーの復元
    process.removeAllListeners('SIGTERM');
    process.removeAllListeners('SIGINT');
    originalListeners.SIGTERM.forEach((listener: any) => {
      process.on('SIGTERM', listener);
    });
    originalListeners.SIGINT.forEach((listener: any) => {
      process.on('SIGINT', listener);
    });
  });

  test('スケジューラーにShutdownハンドラーを設定できる', () => {
    scheduler = new IntervalScheduler('test', 100);
    
    // Graceful shutdown機能を持つスケジューラーかチェック
    expect(typeof scheduler.enableGracefulShutdown).toBe('function');
  });

  test('Graceful shutdownを有効にするとプロセスシグナルハンドラーが登録される', () => {
    scheduler = new IntervalScheduler('test', 100);
    
    const beforeCount = process.listenerCount('SIGTERM') + process.listenerCount('SIGINT');
    
    scheduler.enableGracefulShutdown();
    
    const afterCount = process.listenerCount('SIGTERM') + process.listenerCount('SIGINT');
    expect(afterCount).toBeGreaterThan(beforeCount);
  });

  test('SIGTERM受信時にスケジューラーが停止される', async () => {
    scheduler = new IntervalScheduler('test', 100);
    scheduler.onTick(async () => {});
    scheduler.enableGracefulShutdown();
    
    scheduler.start();
    expect(scheduler.isRunning()).toBe(true);
    
    // SIGTERMシグナルをエミュレート
    process.emit('SIGTERM', 'SIGTERM');
    
    // 少し待機してシャットダウン処理を確認
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(scheduler.isRunning()).toBe(false);
  });

  test('SIGINT受信時にスケジューラーが停止される', async () => {
    scheduler = new IntervalScheduler('test', 100);
    scheduler.onTick(async () => {});
    scheduler.enableGracefulShutdown();
    
    scheduler.start();
    expect(scheduler.isRunning()).toBe(true);
    
    // SIGINTシグナルをエミュレート
    process.emit('SIGINT', 'SIGINT');
    
    // 少し待機してシャットダウン処理を確認
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(scheduler.isRunning()).toBe(false);
  });

  test('複数のスケジューラーでGraceful shutdownが動作する', async () => {
    const scheduler1 = new IntervalScheduler('test1', 100);
    const scheduler2 = new IntervalScheduler('test2', 100);
    
    scheduler1.onTick(async () => {});
    scheduler2.onTick(async () => {});
    
    scheduler1.enableGracefulShutdown();
    scheduler2.enableGracefulShutdown();
    
    scheduler1.start();
    scheduler2.start();
    
    expect(scheduler1.isRunning()).toBe(true);
    expect(scheduler2.isRunning()).toBe(true);
    
    // SIGTERMで両方停止
    process.emit('SIGTERM', 'SIGTERM');
    
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(scheduler1.isRunning()).toBe(false);
    expect(scheduler2.isRunning()).toBe(false);
  });
});