/**
 * IntervalScheduler - t-wada TDD最小実装
 *
 * Red → Green の最初の実装
 * 必要最小限の機能のみ提供
 */

import { getLogger } from "~/shared/core/logger/logger.server";
import type { Logger } from "@logtape/logtape";

interface SchedulerStats {
	totalExecutions: number;
	successfulExecutions: number;
	failedExecutions: number;
	lastExecutionTime?: Date;
}

export class IntervalScheduler {
	public readonly name: string;
	private callback?: () => Promise<void>;
	private intervalId?: Timer;
	private running = false;
	private stats: SchedulerStats;
	private shutdownHandlersInstalled = false;
	private logger: Logger;
	private statsLoggingInterval?: Timer;

	constructor(
		name: string,
		private intervalMs: number,
	) {
		// 入力検証
		if (!name || name.trim() === "") {
			throw new Error("Name cannot be empty");
		}

		if (intervalMs <= 0) {
			throw new Error("Interval must be positive");
		}

		this.name = name;
		this.stats = {
			totalExecutions: 0,
			successfulExecutions: 0,
			failedExecutions: 0,
		};

		// LogTape統一ログシステム初期化
		this.logger = getLogger();
	}

	onTick(callback: () => Promise<void>): void {
		this.callback = callback;
	}

	start(): void {
		if (this.running) {
			return; // 既に動作中の場合は何もしない
		}

		if (!this.callback) {
			throw new Error("Callback must be set before starting");
		}

		this.running = true;
		this.intervalId = setInterval(async () => {
			await this.executeCallback();
		}, this.intervalMs);

		// 開始ログ
		this.logger.info("Scheduler started", {
			context: "IntervalScheduler",
			schedulerName: this.name,
			intervalMs: this.intervalMs,
		});
	}

	async stop(): Promise<void> {
		if (!this.running) {
			return; // 既に停止中の場合は何もしない
		}

		this.running = false;
		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = undefined;
		}

		// 統計ログ停止
		if (this.statsLoggingInterval) {
			clearInterval(this.statsLoggingInterval);
			this.statsLoggingInterval = undefined;
		}

		// 停止ログ
		this.logger.info("Scheduler stopped", {
			context: "IntervalScheduler",
			schedulerName: this.name,
			stats: this.stats,
		});
	}

	isRunning(): boolean {
		return this.running;
	}

	getStats(): SchedulerStats {
		return { ...this.stats };
	}

	enableGracefulShutdown(): void {
		if (this.shutdownHandlersInstalled) {
			return; // 既にインストール済み
		}

		const gracefulShutdown = async (signal: string) => {
			await this.stop();
		};

		process.on("SIGTERM", gracefulShutdown);
		process.on("SIGINT", gracefulShutdown);

		this.shutdownHandlersInstalled = true;
	}

	enablePeriodicStatsLogging(intervalMs: number): void {
		if (this.statsLoggingInterval) {
			clearInterval(this.statsLoggingInterval);
		}

		this.statsLoggingInterval = setInterval(() => {
			this.logger.info("Scheduler statistics", {
				context: "IntervalScheduler",
				schedulerName: this.name,
				...this.stats,
			});
		}, intervalMs);
	}

	private async executeCallback(): Promise<void> {
		if (!this.callback) {
			return;
		}

		this.stats.totalExecutions++;
		this.stats.lastExecutionTime = new Date();

		try {
			await this.callback();
			this.stats.successfulExecutions++;
		} catch (error) {
			this.stats.failedExecutions++;

			// エラーログ出力
			this.logger.error("Task execution failed", {
				context: "IntervalScheduler",
				schedulerName: this.name,
				error: error instanceof Error ? error.message : String(error),
				stats: this.stats,
			});
		}
	}
}
