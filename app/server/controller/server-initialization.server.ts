/**
 * Server Initialization Service
 *
 * サーバー起動時の初期化処理を管理
 * スケジューラー、バックグラウンドタスクの起動
 */

import { getLogger } from "~/shared/core/logger/logger.server";
import {
	getSchedulerSystem,
	initializeAndStartSchedulersFromEnvironment,
	type SchedulerSystemConfig,
} from "~/server/controller/scheduler-system";

export interface ServerInitializationConfig {
	/** スケジューラーシステム設定 */
	schedulerConfig?: Partial<SchedulerSystemConfig>;
	/** レガシー互換性のための個別設定 */
	enableJobExecution?: boolean;
	enableNodeHealthCheck?: boolean;
	jobExecutionConfig?: {
		checkIntervalSeconds?: number;
		maxConcurrentJobs?: number;
	};
	nodeHealthCheckConfig?: {
		checkIntervalSeconds?: number;
		failureThreshold?: number;
		batchSize?: number;
	};
}

export class ServerInitializationService {
	private readonly logger = getLogger();
	private readonly config: ServerInitializationConfig;
	private isInitialized = false;
	private schedulerSystem = getSchedulerSystem();

	constructor(config: ServerInitializationConfig = {}) {
		this.config = {
			enableJobExecution: config.enableJobExecution ?? true,
			enableNodeHealthCheck: config.enableNodeHealthCheck ?? true,
			...config,
		};
	}

	/**
	 * サーバー初期化処理を実行
	 */
	async initialize(): Promise<void> {
		if (this.isInitialized) {
			this.logger.warn("ServerInitialization: Server already initialized");
			return;
		}

		this.logger.info(
			"Starting server initialization with environment-based scheduler system",
			{ context: "ServerInitialization" },
		);

		try {
			// Initialize scheduler system from environment variables
			this.schedulerSystem =
				await initializeAndStartSchedulersFromEnvironment();

			this.isInitialized = true;

			this.logger.info("Server initialization completed", {
				context: "ServerInitialization",
				schedulerStatus: this.schedulerSystem.getStatus(),
			});
		} catch (error) {
			this.logger.error("Server initialization failed", {
				context: "ServerInitialization",
				error: error instanceof Error ? error.message : "Unknown error",
			});
			throw error;
		}
	}

	/**
	 * グレースフルシャットダウン処理
	 */
	async shutdown(): Promise<void> {
		if (!this.isInitialized) {
			return;
		}

		this.logger.info("ServerInitialization: Starting graceful shutdown");

		try {
			// 統一スケジューラーシステムの停止
			await this.schedulerSystem.stop();

			this.logger.info("ServerInitialization: Graceful shutdown completed");
		} catch (error) {
			this.logger.error("Error during graceful shutdown", {
				context: "ServerInitialization",
				error: error instanceof Error ? error.message : "Unknown error",
			});
		} finally {
			this.isInitialized = false;
		}
	}

	/**
	 * 初期化状態の取得
	 */
	getStatus() {
		return {
			initialized: this.isInitialized,
			config: this.config,
			schedulerSystem: this.schedulerSystem.getStatus(),
		};
	}
}

// シングルトンインスタンス
let serverInitialization: ServerInitializationService | null = null;

/**
 * サーバー初期化サービスのシングルトンインスタンスを取得
 */
export function getServerInitialization(
	config?: ServerInitializationConfig,
): ServerInitializationService {
	if (!serverInitialization) {
		serverInitialization = new ServerInitializationService(config);
	}
	return serverInitialization;
}

/**
 * サーバー初期化を実行（環境変数ベース）
 */
export async function initializeServer(
	config?: ServerInitializationConfig,
): Promise<void> {
	const service = getServerInitialization(config);
	await service.initialize();

	// プロセス終了時のクリーンアップ (Note: SchedulerSystem also handles this)
	const gracefulShutdown = async (signal: string) => {
		getLogger().info("Received shutdown signal, cleaning up...", {
			context: "ServerInitialization",
			signal,
		});
		await service.shutdown();
	};

	process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
	process.on("SIGINT", () => gracefulShutdown("SIGINT"));
}
