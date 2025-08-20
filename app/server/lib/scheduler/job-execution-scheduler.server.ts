/**
 * Job Execution Scheduler
 *
 * Abaqusジョブ実行監視専用スケジューラー
 * IntervalSchedulerベースの具象実装
 */

import { IntervalScheduler } from "./interval-scheduler.server";

export class JobExecutionScheduler extends IntervalScheduler {
	constructor(intervalMs: number = 5000) {
		// デフォルト5秒
		super("job-execution", intervalMs);

		// Graceful shutdown有効化
		this.enableGracefulShutdown();
	}

	/**
	 * ジョブ実行監視タスクを設定
	 */
	scheduleJobExecution(executionTask: () => Promise<void>): void {
		this.onTick(executionTask);
	}

	/**
	 * 統計ログを有効化（デフォルト1分間隔）
	 */
	enableStatsLogging(intervalMs: number = 60000): void {
		this.enablePeriodicStatsLogging(intervalMs);
	}
}
