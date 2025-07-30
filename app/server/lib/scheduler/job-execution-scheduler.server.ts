/**
 * Job Execution Scheduler
 *
 * Abaqusジョブ実行監視専用スケジューラー
 * IntervalSchedulerベースの具象実装
 */

import { IntervalScheduler } from "./interval-scheduler.server";
import { getLogger } from "~/shared/core/logger/logger.server";

export class JobExecutionScheduler extends IntervalScheduler {
	constructor(intervalMs: number = 5000) {
		// デフォルト5秒
		super("job-execution", intervalMs);

		// 既存ログシステムとの統合
		const logger = getLogger();
		this.setLogger({
			info: (message: string, context: string, data?: any) => {
				logger.info(message, context, data);
			},
			warn: (message: string, context: string, data?: any) => {
				logger.warn(message, context, data);
			},
			error: (message: string, context: string, data?: any) => {
				logger.error(message, context, data);
			},
		});

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
