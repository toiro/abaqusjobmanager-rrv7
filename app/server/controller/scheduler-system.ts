/**
 * Scheduler System - 新統一スケジューラー管理システム
 *
 * t-wada TDDで設計された新しいSchedulerシステム
 * 既存の破綻したシステムからの完全置き換え
 */

import { getLogger } from "~/shared/core/logger/logger.server";
import { env } from "~/shared/core/env";
import { HealthCheckScheduler } from "~/server/lib/scheduler/health-check-scheduler.server";
import { SSECleanupScheduler } from "~/server/lib/scheduler/sse-cleanup-scheduler.server";
import { JobExecutionScheduler } from "~/server/lib/scheduler/job-execution-scheduler.server";

export interface SchedulerSystemConfig {
	healthCheck: {
		enabled: boolean;
		intervalMs: number;
	};
	sseCleanup: {
		enabled: boolean;
		intervalMs: number;
	};
	jobExecution: {
		enabled: boolean;
		intervalMs: number;
	};
}

/**
 * 新スケジューラーシステム - t-wada TDD設計
 */
export class SchedulerSystem {
	private readonly logger = getLogger();
	private healthCheckScheduler?: HealthCheckScheduler;
	private sseCleanupScheduler?: SSECleanupScheduler;
	private jobExecutionScheduler?: JobExecutionScheduler;
	private isInitialized = false;

	/**
	 * システム初期化
	 */
	async initialize(config: SchedulerSystemConfig): Promise<void> {
		if (this.isInitialized) {
			this.logger.warn("SchedulerSystem: Scheduler system already initialized");
			return;
		}

		this.logger.info("SchedulerSystem: Initializing new scheduler system...", {
			config,
		});

		try {
			// Health Check Scheduler
			if (config.healthCheck.enabled) {
				this.healthCheckScheduler = new HealthCheckScheduler(
					config.healthCheck.intervalMs,
				);
				this.logger.info("SchedulerSystem: Health Check Scheduler created", {
					intervalMs: config.healthCheck.intervalMs,
				});
			}

			// SSE Cleanup Scheduler
			if (config.sseCleanup.enabled) {
				this.sseCleanupScheduler = new SSECleanupScheduler(
					config.sseCleanup.intervalMs,
				);
				this.logger.info("SchedulerSystem: SSE Cleanup Scheduler created", {
					intervalMs: config.sseCleanup.intervalMs,
				});
			}

			// Job Execution Scheduler
			if (config.jobExecution.enabled) {
				this.jobExecutionScheduler = new JobExecutionScheduler(
					config.jobExecution.intervalMs,
				);
				this.logger.info("SchedulerSystem: Job Execution Scheduler created", {
					intervalMs: config.jobExecution.intervalMs,
				});
			}

			this.isInitialized = true;
			this.logger.info(
				"SchedulerSystem: New scheduler system initialized successfully",
			);
		} catch (error) {
			this.logger.error(
				"SchedulerSystem: Failed to initialize scheduler system",
				{ error },
			);
			throw error;
		}
	}

	/**
	 * 全スケジューラー開始
	 */
	async start(): Promise<void> {
		if (!this.isInitialized) {
			throw new Error("Scheduler system must be initialized before starting");
		}

		this.logger.info("SchedulerSystem: Starting all schedulers...");

		try {
			// Health Check開始
			if (this.healthCheckScheduler) {
				// ヘルスチェックタスクを設定
				this.healthCheckScheduler.scheduleHealthCheck(async () => {
					// TODO: 実際のヘルスチェック処理を実装
					this.logger.info("HealthCheckScheduler: Health check executed");
				});
				this.healthCheckScheduler.start();
				this.logger.info("SchedulerSystem: Health Check Scheduler started");
			}

			// SSE Cleanup開始
			if (this.sseCleanupScheduler) {
				// SSE清理タスクを設定
				this.sseCleanupScheduler.scheduleCleanup(async () => {
					// TODO: 実際のSSE清理処理を実装
					this.logger.info("SSECleanupScheduler: SSE cleanup executed");
				});
				this.sseCleanupScheduler.start();
				this.logger.info("SchedulerSystem: SSE Cleanup Scheduler started");
			}

			// Job Execution開始
			if (this.jobExecutionScheduler) {
				// ジョブ実行監視タスクを設定
				this.jobExecutionScheduler.scheduleJobExecution(async () => {
					// TODO: 実際のジョブ実行監視処理を実装
					this.logger.info("Job execution check executed", {
						context: "JobExecutionScheduler",
					});
				});
				this.jobExecutionScheduler.start();
				this.logger.info("SchedulerSystem: Job Execution Scheduler started");
			}

			this.logger.info("All schedulers started successfully", {
				context: "SchedulerSystem",
			});
		} catch (error) {
			this.logger.error("SchedulerSystem: Failed to start scheduler system", {
				error,
			});
			await this.stop();
			throw error;
		}
	}

	/**
	 * 全スケジューラー停止
	 */
	async stop(): Promise<void> {
		this.logger.info("SchedulerSystem: Stopping all schedulers...");

		const stopPromises: Promise<void>[] = [];

		if (this.healthCheckScheduler?.isRunning()) {
			stopPromises.push(this.healthCheckScheduler.stop());
		}

		if (this.sseCleanupScheduler?.isRunning()) {
			stopPromises.push(this.sseCleanupScheduler.stop());
		}

		if (this.jobExecutionScheduler?.isRunning()) {
			stopPromises.push(this.jobExecutionScheduler.stop());
		}

		await Promise.all(stopPromises);
		this.logger.info("SchedulerSystem: All schedulers stopped");
	}

	/**
	 * 特定スケジューラー取得
	 */
	getHealthCheckScheduler(): HealthCheckScheduler | undefined {
		return this.healthCheckScheduler;
	}

	getSSECleanupScheduler(): SSECleanupScheduler | undefined {
		return this.sseCleanupScheduler;
	}

	getJobExecutionScheduler(): JobExecutionScheduler | undefined {
		return this.jobExecutionScheduler;
	}

	/**
	 * システム状態取得
	 */
	getStatus() {
		return {
			initialized: this.isInitialized,
			schedulers: {
				healthCheck: {
					enabled: !!this.healthCheckScheduler,
					running: this.healthCheckScheduler?.isRunning() || false,
					stats: this.healthCheckScheduler?.getStats(),
				},
				sseCleanup: {
					enabled: !!this.sseCleanupScheduler,
					running: this.sseCleanupScheduler?.isRunning() || false,
					stats: this.sseCleanupScheduler?.getStats(),
				},
				jobExecution: {
					enabled: !!this.jobExecutionScheduler,
					running: this.jobExecutionScheduler?.isRunning() || false,
					stats: this.jobExecutionScheduler?.getStats(),
				},
			},
		};
	}
}

// Singleton instance
let schedulerSystemInstance: SchedulerSystem | null = null;

/**
 * グローバルスケジューラーシステムインスタンス取得
 */
export function getSchedulerSystem(): SchedulerSystem {
	if (!schedulerSystemInstance) {
		schedulerSystemInstance = new SchedulerSystem();
	}
	return schedulerSystemInstance;
}

/**
 * デフォルト設定
 */
export function getDefaultSchedulerConfig(): SchedulerSystemConfig {
	return {
		healthCheck: {
			enabled: env.ENABLE_NODE_HEALTH_CHECK === "true",
			intervalMs: env.HEALTH_CHECK_INTERVAL_MS,
		},
		sseCleanup: {
			enabled: true, // SSE清理は常に有効
			intervalMs: env.SSE_CLEANUP_INTERVAL_MS,
		},
		jobExecution: {
			enabled: env.ENABLE_JOB_EXECUTION === "true",
			intervalMs: env.JOB_EXECUTION_INTERVAL_MS,
		},
	};
}

/**
 * 環境変数から設定を読み込んでシステム初期化と開始
 */
export async function initializeAndStartSchedulersFromEnvironment(): Promise<SchedulerSystem> {
	const config = getDefaultSchedulerConfig();

	const system = getSchedulerSystem();
	await system.initialize(config);

	// 有効なスケジューラーがある場合のみ開始
	const hasEnabledSchedulers = Object.values(config).some((c) => c.enabled);
	if (hasEnabledSchedulers) {
		await system.start();
	} else {
		getLogger().info(
			"SchedulerSystem: No schedulers enabled, system initialized but not started",
			{
				config,
			},
		);
	}

	return system;
}
