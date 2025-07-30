/**
 * Abaqus Job Executor
 * Pure execution engine for Abaqus jobs with hook-based integration
 */

import fs from "node:fs";
import path from "node:path";
import { format } from "date-fns";
import { env } from "~/shared/core/env";
import { getLogger } from "~/shared/core/logger/logger.server";
import type {
	PersistedFileRecord,
	PersistedJob,
	PersistedNode,
} from "~/shared/core/types/database";
import { executeAbaqus } from "./abaqus-executor";
import {
	executeTransfer,
	receiveDirectory,
	sendDirectory,
} from "./file-transfer-service";
import type {
	AbaqusExecutionOptions,
	AbaqusExecutionResult,
	JobExecutionHooks,
	JobExecutionResult,
	NodeConnection,
	TransferOptions,
	TransferResult,
} from "./types";

const datePostfixFormat = "yyyymmddHHMMss";

export class AbaqusJobExecutor {
	private readonly logger = getLogger();

	/**
	 * ジョブを実行 (Entity-based Pure Executor)
	 */
	async executeJob(
		job: PersistedJob,
		node: PersistedNode,
		file: PersistedFileRecord,
		hooks?: JobExecutionHooks,
	): Promise<JobExecutionResult> {
		const jobId = job.id;
		this.logger.info("Starting job execution", {
			jobId,
		});

		const startTime = Date.now();
		const result: JobExecutionResult = {
			success: false,
			jobId,
			userId: job.user_id,
			phases: {},
			totalExecutionTimeMs: 0,
		};

		try {
			// Hook: Job開始通知
			hooks?.onStart?.(jobId);

			const datePostfix = format(Date.now(), datePostfixFormat);
			const workingDirName = `${job.user_id}_${job.name}_${datePostfix}`;

			// 1. ファイル送信フェーズ
			const sendResult = await this.executeFileSendPhase(
				workingDirName,
				job,
				node,
				file,
				hooks,
			);

			// 2. Abaqus実行フェーズ
			const abaqusResult = await this.executeAbaqusPhase(
				workingDirName,
				job,
				node,
				file,
				hooks,
			);

			// 3. ファイル受信フェーズ
			const receiveResult = await this.executeFileReceivePhase(
				workingDirName,
				job,
				node,
				file,
				hooks,
			);

			// 4. 完了処理 - 結果をまとめる
			const finalResult = this.createJobExecutionResult(
				job,
				startTime,
				sendResult,
				abaqusResult,
				receiveResult,
			);

			hooks?.onComplete?.(finalResult);

			return finalResult;
		} catch (error) {
			result.totalExecutionTimeMs = Date.now() - startTime;
			result.errorMessage =
				error instanceof Error ? error.message : "Unknown error";

			this.logger.error("Job execution failed", {
				jobId,
				error: result.errorMessage,
				totalExecutionTime: result.totalExecutionTimeMs,
			});

			// 失敗時の処理
			hooks?.onError?.(result.errorMessage || "Unknown error", "execution");

			throw error;
		}
	}

	/**
	 * ファイル送信フェーズ
	 */
	private async executeFileSendPhase(
		workingDirName: string,
		job: PersistedJob,
		node: PersistedNode,
		file: PersistedFileRecord,
		hooks?: JobExecutionHooks,
	): Promise<TransferResult> {
		this.logger.info("Starting file send phase", {
			jobId: job.id,
		});

		const localWorkingDir = path.join(env.TEMP_DIR, workingDirName);
		const sendOptions: TransferOptions = {
			type: "send",
			sourcePath: localWorkingDir,
			destinationPath: `${node.abaqus_execution_dir}/${workingDirName}`,
			nodeConnection: {
				hostname: node.hostname,
				username: node.ssh_username,
				port: node.ssh_port || 22,
			},
		};

		try {
			const destinationFile = path.join(
				localWorkingDir,
				path.basename(file.file_path),
			);
			fs.mkdirSync(localWorkingDir);
			fs.copyFileSync(file.file_path, destinationFile);

			const sendResult = await sendDirectory(sendOptions, {
				onStart: () => {
					hooks?.onFileTransferStart?.("send");
				},
				onComplete: (transferResult) => {
					hooks?.onFileTransferComplete?.("send", transferResult);
				},
				onError: (error) => {
					hooks?.onError?.(error.message, "file_send");
					throw new Error(`File send failed: ${error.message}`);
				},
			});
			return sendResult;
		} finally {
			// TODO 関知しなくともよいはず
			fs.rmdir(localWorkingDir, () => {});
		}
	}

	/**
	 * Abaqus実行フェーズ
	 */
	private async executeAbaqusPhase(
		workingDirName: string,
		job: PersistedJob,
		node: PersistedNode,
		file: PersistedFileRecord,
		hooks?: JobExecutionHooks,
	): Promise<AbaqusExecutionResult> {
		this.logger.info("Starting Abaqus execution phase", {
			jobId: job.id,
		});

		const abaqusOptions = this.createAbaqusConfig(
			workingDirName,
			job,
			node,
			file,
		);
		const nodeConnection = {
			hostname: node.hostname,
			username: node.ssh_username,
			port: node.ssh_port || 22,
		};

		const executionResult = await executeAbaqus(abaqusOptions, nodeConnection, {
			onStart: (context) => {
				hooks?.onAbaqusStart?.(context);
			},
			onProgress: (progress) => {
				hooks?.onAbaqusProgress?.(progress);
			},
			onFinish: (execResult) => {
				hooks?.onAbaqusFinished?.(execResult);
			},
			onError: (error) => {
				hooks?.onError?.(error.message, "abaqus_execution");
				throw new Error(`Abaqus execution failed: ${error.message}`);
			},
		});

		if (!executionResult.success) {
			console.log(executionResult);
			throw new Error(
				`Abaqus execution failed with exit code: ${executionResult.exitCode}`,
			);
		}

		return executionResult;
	}

	/**
	 * ファイル受信フェーズ
	 */
	private async executeFileReceivePhase(
		workingDirName: string,
		job: PersistedJob,
		node: PersistedNode,
		file: PersistedFileRecord,
		hooks?: JobExecutionHooks,
	): Promise<TransferResult> {
		this.logger.info("Starting file receive phase", { jobId: job.id });

		const receiveOptions: TransferOptions = {
			type: "receive",
			sourcePath: `${node.abaqus_execution_dir}/${workingDirName}`,
			destinationPath: `/app/results/jobs/${job.id}`,
			nodeConnection: {
				hostname: node.hostname,
				username: node.ssh_username,
				port: node.ssh_port || 22,
			},
		};

		const receiveResult = await receiveDirectory(receiveOptions, {
			onStart: () => {
				hooks?.onFileTransferStart?.("receive");
			},
			onComplete: (transferResult) => {
				hooks?.onFileTransferComplete?.("receive", transferResult);
			},
			onError: (error) => {
				hooks?.onError?.(error.message, "file_receive");
				throw new Error(`File receive failed: ${error.message}`);
			},
		});

		return receiveResult;
	}

	/**
	 * エンティティから Abaqus 実行設定を生成
	 */
	private createAbaqusConfig(
		workingDirName: string,
		job: PersistedJob,
		node: PersistedNode,
		file: PersistedFileRecord,
	): AbaqusExecutionOptions {
		return {
			workingDirectory: `${node.abaqus_execution_dir}/${workingDirName}`,
			inputFileName: file.original_name,
			jobName: job.name,
			cpuCores: job.cpu_cores,
		};
	}

	/**
	 * 3つのフェーズの結果をまとめてJobExecutionResultを作成
	 */
	private createJobExecutionResult(
		job: PersistedJob,
		startTime: number,
		sendResult: TransferResult,
		abaqusResult: AbaqusExecutionResult,
		receiveResult: TransferResult,
	): JobExecutionResult {
		const totalExecutionTime = Date.now() - startTime;

		this.logger.info("Job execution completed successfully", {
			jobId: job.id,
			totalExecutionTime,
			sendSuccess: sendResult?.success,
			abaqusSuccess: abaqusResult?.success,
			receiveSuccess: receiveResult?.success,
		});

		return {
			success: true,
			jobId: job.id,
			userId: job.user_id,
			phases: {
				fileTransferSend: sendResult,
				abaqusExecution: abaqusResult,
				fileTransferReceive: receiveResult,
			},
			totalExecutionTimeMs: totalExecutionTime,
		};
	}
}
