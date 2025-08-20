/**
 * SSE Cleanup Scheduler
 *
 * SSE接続清理専用スケジューラー
 * IntervalSchedulerベースの具象実装
 */

import { IntervalScheduler } from "./interval-scheduler.server";

export class SSECleanupScheduler extends IntervalScheduler {
	constructor(intervalMs: number = 300000) {
		// デフォルト5分
		super("sse-cleanup", intervalMs);

		// Graceful shutdown有効化
		this.enableGracefulShutdown();
	}

	/**
	 * SSE清理タスクを設定
	 */
	scheduleCleanup(cleanupTask: () => Promise<void>): void {
		this.onTick(cleanupTask);
	}

	/**
	 * 統計ログを有効化（デフォルト15分間隔）
	 */
	enableStatsLogging(intervalMs: number = 900000): void {
		this.enablePeriodicStatsLogging(intervalMs);
	}
}
