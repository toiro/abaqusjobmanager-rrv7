/**
 * Health Check Scheduler
 *
 * ノード死活監視専用スケジューラー
 * IntervalSchedulerベースの具象実装
 */

import { IntervalScheduler } from "./interval-scheduler.server";

export class HealthCheckScheduler extends IntervalScheduler {
	constructor(intervalMs: number = 30000) {
		// デフォルト30秒
		super("health-check", intervalMs);

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
