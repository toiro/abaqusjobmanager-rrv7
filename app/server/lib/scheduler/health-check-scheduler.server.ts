/**
 * Health Check Scheduler
 *
 * ノード死活監視専用スケジューラー
 * IntervalSchedulerベースの具象実装
 */

import { IntervalScheduler } from "./interval-scheduler.server";
import { getLogger } from "~/lib/core/logger/logger.server";

export class HealthCheckScheduler extends IntervalScheduler {
	constructor(intervalMs: number = 30000) {
		// デフォルト30秒
		super("health-check", intervalMs);

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
	 * ヘルスチェックタスクを設定
	 */
	scheduleHealthCheck(healthCheckTask: () => Promise<void>): void {
		this.onTick(healthCheckTask);
	}

	/**
	 * 統計ログを有効化（デフォルト5分間隔）
	 */
	enableStatsLogging(intervalMs: number = 300000): void {
		this.enablePeriodicStatsLogging(intervalMs);
	}
}
